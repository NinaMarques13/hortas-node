// =====================================================
// 🛒 Rotas de Pedidos — Marketplace Hortas
// Fluxo: Cliente faz pedido → Entregador aceita
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hortas_secret_key';

// ── Helper: middleware JWT para cliente ──
function autenticarCliente(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'erro', mensagem: 'Token obrigatório.' });
    }
    try {
        const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
        // Aceita token de cliente OU de produtor (produtor pode visualizar)
        req.clienteId = decoded.id_cliente || null;
        req.produtorId = decoded.id_produtor || null;
        req.tipoToken = decoded.tipo || 'produtor';
        next();
    } catch {
        return res.status(401).json({ status: 'erro', mensagem: 'Token inválido ou expirado.' });
    }
}

// =====================================================
// POST /api/pedidos/cliente/register — Cadastro de cliente
// =====================================================
router.post('/cliente/register', async (req, res) => {
    const { nome, email, senha, telefone, endereco_entrega } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ status: 'erro', mensagem: 'Nome, e-mail e senha são obrigatórios.' });
    }

    try {
        const [existing] = await pool.execute(
            'SELECT id_cliente FROM clientes WHERE email = ?', [email]
        );
        if (existing.length > 0) {
            return res.status(400).json({ status: 'erro', mensagem: 'E-mail já cadastrado.' });
        }

        const hash = await bcrypt.hash(senha, 10);
        await pool.execute(
            'INSERT INTO clientes (nome, email, hash_senha, telefone, endereco_entrega) VALUES (?, ?, ?, ?, ?)',
            [nome, email, hash, telefone || null, endereco_entrega || null]
        );

        res.json({ status: 'sucesso', mensagem: 'Cliente cadastrado com sucesso.' });
    } catch (err) {
        console.error('Erro ao cadastrar cliente:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro interno.' });
    }
});

// =====================================================
// POST /api/pedidos/cliente/login — Login de cliente
// =====================================================
router.post('/cliente/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        return res.status(400).json({ status: 'erro', mensagem: 'E-mail e senha obrigatórios.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id_cliente, nome, hash_senha FROM clientes WHERE email = ?', [email]
        );
        if (!rows.length) {
            return res.status(401).json({ status: 'erro', mensagem: 'E-mail ou senha incorretos.' });
        }

        const cliente = rows[0];
        const senhaOk = await bcrypt.compare(senha, cliente.hash_senha);
        if (!senhaOk) {
            return res.status(401).json({ status: 'erro', mensagem: 'E-mail ou senha incorretos.' });
        }

        const token = jwt.sign(
            { id_cliente: cliente.id_cliente, tipo: 'cliente' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ status: 'sucesso', token, nome: cliente.nome, id: cliente.id_cliente });
    } catch (err) {
        console.error('Erro no login do cliente:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro interno.' });
    }
});

// =====================================================
// POST /api/pedidos — Criar pedido (cliente autenticado)
// Body: { horta_id, endereco_entrega, observacao, itens: [{estoque_id, quantidade, preco_unitario}] }
// =====================================================
router.post('/', autenticarCliente, async (req, res) => {
    const { horta_id, endereco_entrega, observacao, itens } = req.body;

    // Aceita cliente ou produtor criando pedido
    const clienteId = req.clienteId || req.produtorId;
    if (!clienteId) {
        return res.status(401).json({ status: 'erro', mensagem: 'Autenticação inválida.' });
    }

    if (!horta_id || !endereco_entrega || !itens || !itens.length) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'horta_id, endereco_entrega e itens são obrigatórios.',
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Calcula valor total
        const valorTotal = itens.reduce(
            (sum, i) => sum + parseFloat(i.quantidade) * parseFloat(i.preco_unitario),
            0
        );

        // Insere pedido
        const [resPedido] = await conn.execute(
            `INSERT INTO pedidos (cliente_id, horta_id, endereco_entrega, observacao, valor_total)
             VALUES (?, ?, ?, ?, ?)`,
            [clienteId, horta_id, endereco_entrega, observacao || null, valorTotal.toFixed(2)]
        );
        const pedidoId = resPedido.insertId;

        // Insere itens
        for (const item of itens) {
            await conn.execute(
                'INSERT INTO itens_pedido (pedido_id, estoque_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
                [pedidoId, item.estoque_id, item.quantidade, item.preco_unitario]
            );
            // Deduz do estoque
            await conn.execute(
                'UPDATE estoques SET ds_quantidade = ds_quantidade - ? WHERE id_estoques = ?',
                [item.quantidade, item.estoque_id]
            );
            // Registra saída
            await conn.execute(
                'INSERT INTO saidas_estoque (estoques_id_estoques, produtor_id_produtor, quantidade, motivo) VALUES (?, NULL, ?, ?)',
                [item.estoque_id, item.quantidade, 'venda_marketplace']
            );
        }

        await conn.commit();
        res.json({ status: 'sucesso', mensagem: 'Pedido criado com sucesso!', id_pedido: pedidoId });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Erro ao criar pedido:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro ao criar pedido: ' + err.message });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// GET /api/pedidos/meus — Pedidos do cliente autenticado
// =====================================================
router.get('/meus', autenticarCliente, async (req, res) => {
    const clienteId = req.clienteId || req.produtorId;
    if (!clienteId) {
        return res.status(401).json({ status: 'erro', mensagem: 'Autenticação inválida.' });
    }

    try {
        const [pedidos] = await pool.execute(
            `SELECT p.id_pedido, p.status, p.endereco_entrega, p.observacao, p.valor_total,
                    p.dt_pedido, h.nome AS nome_horta,
                    e.nome AS nome_entregador, e.telefone AS telefone_entregador
             FROM pedidos p
             JOIN hortas h ON h.id_hortas = p.horta_id
             LEFT JOIN entregadores e ON e.id_entregador = p.entregador_id
             WHERE p.cliente_id = ?
             ORDER BY p.dt_pedido DESC`,
            [clienteId]
        );

        // Busca itens de cada pedido
        for (const pedido of pedidos) {
            const [itens] = await pool.execute(
                `SELECT ip.quantidade, ip.preco_unitario, pr.nm_produto, pr.unidade_medida_padrao
                 FROM itens_pedido ip
                 JOIN estoques es ON es.id_estoques = ip.estoque_id
                 JOIN produtos pr ON pr.id_produto = es.produto_id_produto
                 WHERE ip.pedido_id = ?`,
                [pedido.id_pedido]
            );
            pedido.itens = itens;
        }

        res.json({ status: 'sucesso', dados: pedidos });
    } catch (err) {
        console.error('Erro ao buscar pedidos:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro ao buscar pedidos.' });
    }
});

// =====================================================
// GET /api/pedidos — Todos os pedidos (produtor/admin)
// =====================================================
router.get('/', autenticarCliente, async (req, res) => {
    try {
        const [pedidos] = await pool.execute(
            `SELECT p.id_pedido, p.status, p.endereco_entrega, p.valor_total, p.dt_pedido,
                    c.nome AS nome_cliente, c.telefone AS telefone_cliente,
                    h.nome AS nome_horta,
                    e.nome AS nome_entregador
             FROM pedidos p
             JOIN clientes c ON c.id_cliente = p.cliente_id
             JOIN hortas h ON h.id_hortas = p.horta_id
             LEFT JOIN entregadores e ON e.id_entregador = p.entregador_id
             ORDER BY p.dt_pedido DESC
             LIMIT 100`
        );
        res.json({ status: 'sucesso', dados: pedidos });
    } catch (err) {
        console.error('Erro ao listar pedidos:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro ao listar pedidos.' });
    }
});

// =====================================================
// GET /api/pedidos/:id — Detalhes de um pedido
// =====================================================
router.get('/:id', autenticarCliente, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const [[pedido]] = await pool.execute(
            `SELECT p.*, c.nome AS nome_cliente, c.telefone AS telefone_cliente,
                    h.nome AS nome_horta, e.nome AS nome_entregador
             FROM pedidos p
             JOIN clientes c ON c.id_cliente = p.cliente_id
             JOIN hortas h ON h.id_hortas = p.horta_id
             LEFT JOIN entregadores e ON e.id_entregador = p.entregador_id
             WHERE p.id_pedido = ?`,
            [id]
        );
        if (!pedido) return res.status(404).json({ status: 'erro', mensagem: 'Pedido não encontrado.' });

        const [itens] = await pool.execute(
            `SELECT ip.quantidade, ip.preco_unitario, pr.nm_produto, pr.unidade_medida_padrao
             FROM itens_pedido ip
             JOIN estoques es ON es.id_estoques = ip.estoque_id
             JOIN produtos pr ON pr.id_produto = es.produto_id_produto
             WHERE ip.pedido_id = ?`,
            [id]
        );
        pedido.itens = itens;

        res.json({ status: 'sucesso', dados: pedido });
    } catch (err) {
        console.error('Erro ao buscar pedido:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro ao buscar pedido.' });
    }
});

// =====================================================
// PATCH /api/pedidos/:id/cancelar — Cancelar pedido
// =====================================================
router.patch('/:id/cancelar', autenticarCliente, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const [[pedido]] = await pool.execute(
            'SELECT status, cliente_id FROM pedidos WHERE id_pedido = ?', [id]
        );
        if (!pedido) return res.status(404).json({ status: 'erro', mensagem: 'Pedido não encontrado.' });
        if (!['pendente', 'aceito'].includes(pedido.status)) {
            return res.status(400).json({ status: 'erro', mensagem: 'Pedido não pode ser cancelado neste status.' });
        }

        await pool.execute("UPDATE pedidos SET status = 'cancelado' WHERE id_pedido = ?", [id]);
        res.json({ status: 'sucesso', mensagem: 'Pedido cancelado.' });
    } catch (err) {
        console.error('Erro ao cancelar pedido:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro ao cancelar pedido.' });
    }
});

module.exports = router;
