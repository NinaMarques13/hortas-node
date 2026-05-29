// =====================================================
// 📦 Rotas de Estoques
// Gerenciamento do estoque por horta
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// =====================================================
// GET /api/estoques — Lista estoques (filtro opcional por horta)
// Query: ?horta_id=1
// =====================================================
router.get('/', validarTokenJwt, async (req, res) => {
    const { horta_id } = req.query;

    try {
        let query = `
            SELECT
                e.id_estoques,
                e.ds_quantidade,
                e.dt_validade,
                e.preco_unitario,
                p.nm_produto,
                p.unidade_medida_padrao,
                h.nome AS nome_horta,
                h.id_hortas
             FROM estoques e
             JOIN produtos p ON p.id_produto = e.produto_id_produto
             JOIN hortas h ON h.id_hortas = e.hortas_id_hortas`;

        const params = [];
        if (horta_id) {
            query += ' WHERE e.hortas_id_hortas = ?';
            params.push(horta_id);
        }

        query += ' ORDER BY p.nm_produto ASC';

        const [rows] = await pool.execute(query, params);
        res.json({ status: 'sucesso', dados: rows });
    } catch (err) {
        console.error('Erro ao listar estoques:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/estoques/:id — Detalhes de um item de estoque
// =====================================================
router.get('/:id', validarTokenJwt, async (req, res) => {
    const { id } = req.params;

    try {
        const [[estoque]] = await pool.execute(
            `SELECT
                e.id_estoques,
                e.ds_quantidade,
                e.dt_validade,
                e.preco_unitario,
                p.nm_produto,
                p.descricao,
                p.unidade_medida_padrao,
                h.nome AS nome_horta
             FROM estoques e
             JOIN produtos p ON p.id_produto = e.produto_id_produto
             JOIN hortas h ON h.id_hortas = e.hortas_id_hortas
             WHERE e.id_estoques = ?`,
            [id]
        );

        if (!estoque) {
            return res.status(404).json({ status: 'erro', mensagem: 'Item de estoque não encontrado.' });
        }

        res.json({ status: 'sucesso', dados: estoque });
    } catch (err) {
        console.error('Erro ao buscar estoque:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// POST /api/estoques — Adicionar item ao estoque
// Body: { produto_id_produto, hortas_id_hortas, ds_quantidade, dt_validade, preco_unitario }
// =====================================================
router.post('/', validarTokenJwt, async (req, res) => {
    const { produto_id_produto, hortas_id_hortas, ds_quantidade, dt_validade, preco_unitario } = req.body;

    if (!produto_id_produto || !hortas_id_hortas || ds_quantidade === undefined) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'produto_id_produto, hortas_id_hortas e ds_quantidade são obrigatórios.',
        });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO estoques (produto_id_produto, hortas_id_hortas, ds_quantidade, dt_validade, preco_unitario)
             VALUES (?, ?, ?, ?, ?)`,
            [produto_id_produto, hortas_id_hortas, ds_quantidade, dt_validade || null, preco_unitario || null]
        );

        res.status(201).json({
            status: 'sucesso',
            mensagem: 'Item adicionado ao estoque!',
            id_estoques: result.insertId,
        });
    } catch (err) {
        console.error('Erro ao adicionar ao estoque:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// PUT /api/estoques/:id — Atualizar item de estoque
// Body: { ds_quantidade, dt_validade, preco_unitario }
// =====================================================
router.put('/:id', validarTokenJwt, async (req, res) => {
    const { id } = req.params;
    const { ds_quantidade, dt_validade, preco_unitario } = req.body;

    try {
        const [[estoque]] = await pool.execute(
            'SELECT id_estoques FROM estoques WHERE id_estoques = ? LIMIT 1',
            [id]
        );

        if (!estoque) {
            return res.status(404).json({ status: 'erro', mensagem: 'Item de estoque não encontrado.' });
        }

        await pool.execute(
            `UPDATE estoques SET
                ds_quantidade = COALESCE(?, ds_quantidade),
                dt_validade = COALESCE(?, dt_validade),
                preco_unitario = COALESCE(?, preco_unitario)
             WHERE id_estoques = ?`,
            [ds_quantidade !== undefined ? ds_quantidade : null, dt_validade || null, preco_unitario || null, id]
        );

        res.json({ status: 'sucesso', mensagem: 'Estoque atualizado com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar estoque:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// DELETE /api/estoques/:id — Remover item do estoque
// =====================================================
router.delete('/:id', validarTokenJwt, async (req, res) => {
    const { id } = req.params;

    try {
        const [[estoque]] = await pool.execute(
            'SELECT id_estoques FROM estoques WHERE id_estoques = ? LIMIT 1',
            [id]
        );

        if (!estoque) {
            return res.status(404).json({ status: 'erro', mensagem: 'Item de estoque não encontrado.' });
        }

        await pool.execute('DELETE FROM estoques WHERE id_estoques = ?', [id]);

        res.json({ status: 'sucesso', mensagem: 'Item removido do estoque.' });
    } catch (err) {
        console.error('Erro ao remover do estoque:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

module.exports = router;
