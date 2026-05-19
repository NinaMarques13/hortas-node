// =====================================================
// 🛒 Rotas de Pedidos
// Cliente cria pedido, acompanha status
// =====================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// =====================================================
// POST /api/pedidos/cliente/register — Cadastro de cliente
// =====================================================
router.post('/cliente/register', async (req, res) => {
    const { nome, email, senha, telefone, endereco_entrega } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Nome, email e senha são obrigatórios.',
        });
    }

    try {
        const hashSenha = await bcrypt.hash(senha, 10);

        const [result] = await pool.execute(
            `INSERT INTO clientes (nome, email, hash_senha, telefone, endereco_entrega)
             VALUES (?, ?, ?, ?, ?)`,
            [nome, email, hashSenha, telefone || null, endereco_entrega || null]
        );

        res.status(201).json({
            status: 'sucesso',
            mensagem: 'Cliente cadastrado com sucesso!',
            id_cliente: result.insertId,
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'erro', mensagem: 'E-mail já cadastrado.' });
        }
        console.error('Erro no cadastro do cliente:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// POST /api/pedidos/cliente/login — Login do cliente
// =====================================================
router.post('/cliente/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ status: 'erro', mensagem: 'Email e senha são obrigatórios.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id_cliente, nome, hash_senha FROM clientes WHERE email = ? LIMIT 1',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas.' });
        }

        const cliente = rows[0];
        const senhaOk = await bcrypt.compare(senha, cliente.hash_senha);

        if (!senhaOk) {
            return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas.' });
        }

        const secret = process.env.JWT_SECRET_KEY;
        const token = jwt.sign(
            { data: { id: cliente.id_cliente, nome: cliente.nome, role: 'cliente' } },
            secret,
            { algorithm: 'HS256', expiresIn: '8h' }
        );

        res.json({
            status: 'sucesso',
            mensagem: 'Login bem-sucedido.',
            id: cliente.id_cliente,
            nome: cliente.nome,
            token,
        });
    } catch (err) {
        console.error('Erro no login do cliente:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// POST /api/pedidos — Criar novo pedido
// Body: { horta_id, endereco_entrega, observacao, itens: [{ estoque_id, quantidade, preco_unitario }] }
// =====================================================
router.post('/', validarTokenJwt, async (req, res) => {
    const idCliente = req.usuario?.id;
    const { horta_id, endereco_entrega, observacao, itens } = req.body;

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
        const valorTotal = itens.reduce((acc, item) => {
            return acc + (parseFloat(item.quantidade) * parseFloat(item.preco_unitario));
        }, 0);

        // Cria o pedido
        const [resultPedido] = await conn.execute(
            `INSERT INTO pedidos (cliente_id, horta_id, endereco_entrega, observacao, valor_total)
             VALUES (?, ?, ?, ?, ?)`,
            [idCliente, horta_id, endereco_entrega, observacao || null, valorTotal.toFixed(2)]
        );

        const idPedido = resultPedido.insertId;

        // Insere os itens
        for (const item of itens) {
            await conn.execute(
                `INSERT INTO itens_pedido (pedido_id, estoque_id, quantidade, preco_unitario)
                 VALUES (?, ?, ?, ?)`,
                [idPedido, item.estoque_id, item.quantidade, item.preco_unitario]
            );
        }

        await conn.commit();

        res.status(201).json({
            status: 'sucesso',
            mensagem: 'Pedido criado com sucesso!',
            id_pedido: idPedido,
            valor_total: valorTotal.toFixed(2),
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Erro ao criar pedido:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// GET /api/pedidos/meus — Pedidos do cliente logado
// =====================================================
router.get('/meus', validarTokenJwt, async (req, res) => {
    const idCliente = req.usuario?.id;

    try {
        const [rows] = await pool.execute(
            `SELECT
                p.id_pedido,
                p.status,
                p.valor_total,
                p.endereco_entrega,
                p.observacao,
                p.dt_pedido,
                p.dt_atualizacao,
                h.nome AS nome_horta,
                e.nome AS nome_entregador,
                e.telefone AS telefone_entregador
             FROM pedidos p
             JOIN hortas h ON h.id_hortas = p.horta_id
             LEFT JOIN entregadores e ON e.id_entregador = p.entregador_id
             WHERE p.cliente_id = ?
             ORDER BY p.dt_pedido DESC`,
            [idCliente]
        );

        res.json({ status: 'sucesso', dados: rows });
    } catch (err) {
        console.error('Erro ao listar pedidos:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/pedidos/:id — Detalhes de um pedido
// =====================================================
router.get('/:id', validarTokenJwt, async (req, res) => {
    const { id } = req.params;

    try {
        const [[pedido]] = await pool.execute(
            `SELECT
                p.id_pedido,
                p.status,
                p.valor_total,
                p.endereco_entrega,
                p.observacao,
                p.dt_pedido,
                p.dt_atualizacao,
                c.nome AS nome_cliente,
                c.telefone AS telefone_cliente,
                h.nome AS nome_horta,
                e.nome AS nome_entregador,
                e.telefone AS telefone_entregador
             FROM pedidos p
             JOIN clientes c ON c.id_cliente = p.cliente_id
             JOIN hortas h ON h.id_hortas = p.horta_id
             LEFT JOIN entregadores e ON e.id_entregador = p.entregador_id
             WHERE p.id_pedido = ?`,
            [id]
        );

        if (!pedido) {
            return res.status(404).json({ status: 'erro', mensagem: 'Pedido não encontrado.' });
        }

        const [itens] = await pool.execute(
            `SELECT
                ip.quantidade,
                ip.preco_unitario,
                (ip.quantidade * ip.preco_unitario) AS subtotal,
                p.nm_produto,
                p.unidade_medida_padrao
             FROM itens_pedido ip
             JOIN estoques e ON e.id_estoques = ip.estoque_id
             JOIN produtos p ON p.id_produto = e.produto_id_produto
             WHERE ip.pedido_id = ?`,
            [id]
        );

        res.json({ status: 'sucesso', dados: { ...pedido, itens } });
    } catch (err) {
        console.error('Erro ao buscar pedido:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

module.exports = router;
