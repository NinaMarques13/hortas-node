// =====================================================
// 🚴 Rotas do Entregador
// Cadastro, login e gestão de entregas
// =====================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// =====================================================
// POST /api/entregador/register — Cadastro de entregador
// =====================================================
router.post('/register', async (req, res) => {
    const { nome, email, senha, telefone, nr_cpf } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Nome, email e senha são obrigatórios.',
        });
    }

    try {
        const hashSenha = await bcrypt.hash(senha, 10);

        const [result] = await pool.execute(
            `INSERT INTO entregadores (nome, email, hash_senha, telefone, nr_cpf)
             VALUES (?, ?, ?, ?, ?)`,
            [nome, email, hashSenha, telefone || null, nr_cpf || null]
        );

        res.status(201).json({
            status: 'sucesso',
            mensagem: 'Entregador cadastrado com sucesso!',
            id_entregador: result.insertId,
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                status: 'erro',
                mensagem: 'E-mail ou CPF já cadastrado.',
            });
        }
        console.error('Erro no cadastro do entregador:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// POST /api/entregador/login — Login do entregador
// =====================================================
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Email e senha são obrigatórios.',
        });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id_entregador, nome, hash_senha, ativo FROM entregadores WHERE email = ? LIMIT 1',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas.' });
        }

        const entregador = rows[0];

        if (!entregador.ativo) {
            return res.status(403).json({ status: 'erro', mensagem: 'Conta desativada.' });
        }

        const senhaOk = await bcrypt.compare(senha, entregador.hash_senha);
        if (!senhaOk) {
            return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas.' });
        }

        const secret = process.env.JWT_SECRET_KEY;
        const token = jwt.sign(
            { data: { id: entregador.id_entregador, nome: entregador.nome, role: 'entregador' } },
            secret,
            { algorithm: 'HS256', expiresIn: '8h' }
        );

        res.json({
            status: 'sucesso',
            mensagem: 'Login bem-sucedido.',
            id: entregador.id_entregador,
            nome: entregador.nome,
            token,
        });
    } catch (err) {
        console.error('Erro no login do entregador:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/entregador/proxima-entrega
// Retorna o próximo pedido pendente disponível (sem entregador)
// =====================================================
router.get('/proxima-entrega', validarTokenJwt, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
                p.id_pedido,
                p.status,
                p.endereco_entrega,
                p.observacao,
                p.valor_total,
                p.dt_pedido,
                c.nome AS nome_cliente,
                c.telefone AS telefone_cliente,
                h.nome AS nome_horta,
                eh.nm_rua,
                eh.nm_bairro,
                eh.nm_cidade
             FROM pedidos p
             JOIN clientes c ON c.id_cliente = p.cliente_id
             JOIN hortas h ON h.id_hortas = p.horta_id
             LEFT JOIN endereco_hortas eh ON eh.id_endereco_hortas = h.endereco_hortas_id_endereco_hortas
             WHERE p.status = 'pendente' AND p.entregador_id IS NULL
             ORDER BY p.dt_pedido ASC
             LIMIT 1`
        );

        if (rows.length === 0) {
            return res.json({
                status: 'sucesso',
                mensagem: 'Nenhuma entrega pendente no momento.',
                dados: null,
            });
        }

        // Busca os itens do pedido
        const pedido = rows[0];
        const [itens] = await pool.execute(
            `SELECT
                ip.quantidade,
                ip.preco_unitario,
                p.nm_produto,
                p.unidade_medida_padrao
             FROM itens_pedido ip
             JOIN estoques e ON e.id_estoques = ip.estoque_id
             JOIN produtos p ON p.id_produto = e.produto_id_produto
             WHERE ip.pedido_id = ?`,
            [pedido.id_pedido]
        );

        res.json({
            status: 'sucesso',
            dados: { ...pedido, itens },
        });
    } catch (err) {
        console.error('Erro ao buscar próxima entrega:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// POST /api/entregador/aceitar/:id_pedido
// Entregador aceita o pedido (reserva pra ele)
// =====================================================
router.post('/aceitar/:id_pedido', validarTokenJwt, async (req, res) => {
    const idEntregador = req.usuario?.id;
    const { id_pedido } = req.params;

    try {
        // Verifica se o pedido ainda está disponível
        const [[pedido]] = await pool.execute(
            'SELECT id_pedido, status, entregador_id FROM pedidos WHERE id_pedido = ? LIMIT 1',
            [id_pedido]
        );

        if (!pedido) {
            return res.status(404).json({ status: 'erro', mensagem: 'Pedido não encontrado.' });
        }

        if (pedido.status !== 'pendente' || pedido.entregador_id !== null) {
            return res.status(409).json({
                status: 'erro',
                mensagem: 'Este pedido já foi aceito por outro entregador.',
            });
        }

        await pool.execute(
            `UPDATE pedidos SET entregador_id = ?, status = 'aceito' WHERE id_pedido = ?`,
            [idEntregador, id_pedido]
        );

        res.json({
            status: 'sucesso',
            mensagem: 'Pedido aceito! Vá até a horta buscar os itens.',
        });
    } catch (err) {
        console.error('Erro ao aceitar pedido:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// PATCH /api/entregador/status/:id_pedido
// Atualiza o status da entrega em andamento
// Body: { status: 'a_caminho' | 'entregue' | 'cancelado' }
// =====================================================
router.patch('/status/:id_pedido', validarTokenJwt, async (req, res) => {
    const idEntregador = req.usuario?.id;
    const { id_pedido } = req.params;
    const { status } = req.body;

    const statusPermitidos = ['a_caminho', 'entregue', 'cancelado'];
    if (!statusPermitidos.includes(status)) {
        return res.status(400).json({
            status: 'erro',
            mensagem: `Status inválido. Use: ${statusPermitidos.join(', ')}`,
        });
    }

    try {
        const [[pedido]] = await pool.execute(
            'SELECT id_pedido, status, entregador_id FROM pedidos WHERE id_pedido = ? LIMIT 1',
            [id_pedido]
        );

        if (!pedido) {
            return res.status(404).json({ status: 'erro', mensagem: 'Pedido não encontrado.' });
        }

        if (pedido.entregador_id !== idEntregador) {
            return res.status(403).json({
                status: 'erro',
                mensagem: 'Este pedido não está atribuído a você.',
            });
        }

        if (pedido.status === 'entregue' || pedido.status === 'cancelado') {
            return res.status(409).json({
                status: 'erro',
                mensagem: 'Este pedido já foi finalizado.',
            });
        }

        await pool.execute(
            'UPDATE pedidos SET status = ? WHERE id_pedido = ?',
            [status, id_pedido]
        );

        const mensagens = {
            a_caminho: 'Ótimo! Cliente notificado que você está a caminho.',
            entregue: 'Entrega concluída! 🎉',
            cancelado: 'Pedido cancelado.',
        };

        res.json({ status: 'sucesso', mensagem: mensagens[status] });
    } catch (err) {
        console.error('Erro ao atualizar status:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/entregador/minha-entrega-atual
// Retorna o pedido ativo do entregador logado (se tiver)
// =====================================================
router.get('/minha-entrega-atual', validarTokenJwt, async (req, res) => {
    const idEntregador = req.usuario?.id;

    try {
        const [rows] = await pool.execute(
            `SELECT
                p.id_pedido,
                p.status,
                p.endereco_entrega,
                p.observacao,
                p.valor_total,
                p.dt_pedido,
                c.nome AS nome_cliente,
                c.telefone AS telefone_cliente,
                h.nome AS nome_horta
             FROM pedidos p
             JOIN clientes c ON c.id_cliente = p.cliente_id
             JOIN hortas h ON h.id_hortas = p.horta_id
             WHERE p.entregador_id = ?
               AND p.status IN ('aceito', 'a_caminho')
             ORDER BY p.dt_pedido DESC
             LIMIT 1`,
            [idEntregador]
        );

        if (rows.length === 0) {
            return res.json({
                status: 'sucesso',
                mensagem: 'Nenhuma entrega em andamento.',
                dados: null,
            });
        }

        const pedido = rows[0];
        const [itens] = await pool.execute(
            `SELECT ip.quantidade, ip.preco_unitario, p.nm_produto
             FROM itens_pedido ip
             JOIN estoques e ON e.id_estoques = ip.estoque_id
             JOIN produtos p ON p.id_produto = e.produto_id_produto
             WHERE ip.pedido_id = ?`,
            [pedido.id_pedido]
        );

        res.json({ status: 'sucesso', dados: { ...pedido, itens } });
    } catch (err) {
        console.error('Erro ao buscar entrega atual:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

module.exports = router;
