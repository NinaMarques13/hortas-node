// =====================================================
// 🛒 Rotas de Produtos (Catálogo)
// Converte: listar_produtos.php
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');

// =====================================================
// GET /api/produtos — Listar catálogo de produtos
// =====================================================
router.get('/', async (_req, res) => {
    try {
        const [produtos] = await pool.execute(
            'SELECT id_produto, nm_produto, descricao, unidade_medida_padrao FROM produtos ORDER BY nm_produto ASC'
        );

        res.json(produtos);
    } catch (err) {
        console.error('Erro ao buscar produtos:', err.message);
        res.status(500).json({
            status: 'erro',
            mensagem: 'Ocorreu um erro ao buscar os produtos.',
        });
    }
});

module.exports = router;
