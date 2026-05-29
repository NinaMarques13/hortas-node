// =====================================================
// 🥦 Rotas de Produtos
// Catálogo de produtos disponíveis nas hortas
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// =====================================================
// GET /api/produtos — Lista todos os produtos do catálogo
// =====================================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
                id_produto,
                nm_produto,
                descricao,
                unidade_medida_padrao,
                preco_sugerido
             FROM produtos
             ORDER BY nm_produto ASC`
        );

        res.json({ status: 'sucesso', dados: rows });
    } catch (err) {
        console.error('Erro ao listar produtos:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/produtos/:id — Detalhes de um produto
// =====================================================
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [[produto]] = await pool.execute(
            'SELECT * FROM produtos WHERE id_produto = ?',
            [id]
        );

        if (!produto) {
            return res.status(404).json({ status: 'erro', mensagem: 'Produto não encontrado.' });
        }

        res.json({ status: 'sucesso', dados: produto });
    } catch (err) {
        console.error('Erro ao buscar produto:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// POST /api/produtos — Criar produto no catálogo
// Body: { nm_produto, descricao, unidade_medida_padrao, preco_sugerido }
// =====================================================
router.post('/', validarTokenJwt, async (req, res) => {
    const { nm_produto, descricao, unidade_medida_padrao, preco_sugerido } = req.body;

    if (!nm_produto || !unidade_medida_padrao) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Nome do produto e unidade de medida são obrigatórios.',
        });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO produtos (nm_produto, descricao, unidade_medida_padrao, preco_sugerido)
             VALUES (?, ?, ?, ?)`,
            [nm_produto, descricao || null, unidade_medida_padrao, preco_sugerido || null]
        );

        res.status(201).json({
            status: 'sucesso',
            mensagem: 'Produto criado com sucesso!',
            id_produto: result.insertId,
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'erro', mensagem: 'Produto já existe no catálogo.' });
        }
        console.error('Erro ao criar produto:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// PUT /api/produtos/:id — Atualizar produto
// Body: { nm_produto, descricao, unidade_medida_padrao, preco_sugerido }
// =====================================================
router.put('/:id', validarTokenJwt, async (req, res) => {
    const { id } = req.params;
    const { nm_produto, descricao, unidade_medida_padrao, preco_sugerido } = req.body;

    try {
        const [[produto]] = await pool.execute(
            'SELECT id_produto FROM produtos WHERE id_produto = ? LIMIT 1',
            [id]
        );

        if (!produto) {
            return res.status(404).json({ status: 'erro', mensagem: 'Produto não encontrado.' });
        }

        await pool.execute(
            `UPDATE produtos SET
                nm_produto = COALESCE(?, nm_produto),
                descricao = COALESCE(?, descricao),
                unidade_medida_padrao = COALESCE(?, unidade_medida_padrao),
                preco_sugerido = COALESCE(?, preco_sugerido)
             WHERE id_produto = ?`,
            [nm_produto || null, descricao || null, unidade_medida_padrao || null, preco_sugerido || null, id]
        );

        res.json({ status: 'sucesso', mensagem: 'Produto atualizado com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar produto:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// DELETE /api/produtos/:id — Remover produto
// =====================================================
router.delete('/:id', validarTokenJwt, async (req, res) => {
    const { id } = req.params;

    try {
        const [[produto]] = await pool.execute(
            'SELECT id_produto FROM produtos WHERE id_produto = ? LIMIT 1',
            [id]
        );

        if (!produto) {
            return res.status(404).json({ status: 'erro', mensagem: 'Produto não encontrado.' });
        }

        await pool.execute('DELETE FROM produtos WHERE id_produto = ?', [id]);

        res.json({ status: 'sucesso', mensagem: 'Produto removido com sucesso.' });
    } catch (err) {
        console.error('Erro ao remover produto:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

module.exports = router;
