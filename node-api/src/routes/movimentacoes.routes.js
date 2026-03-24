// =====================================================
// 📊 Rotas de Movimentações de Estoque
// Converte: movimentacao.php, movimentacao_estoque.php
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');

// =====================================================
// POST /api/movimentacoes — Registrar entrada ou saída
// =====================================================
router.post('/', async (req, res) => {
    const { id_estoque, id_produtor, quantidade, tipo_movimentacao, motivo } = req.body;

    // Validação
    if (!id_estoque || !id_produtor || quantidade === undefined || !tipo_movimentacao || !motivo) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Campos obrigatórios: id_estoque, id_produtor, quantidade, tipo_movimentacao e motivo.',
        });
    }

    const qtd = Math.abs(parseFloat(quantidade));
    if (qtd <= 0) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'A quantidade deve ser maior que zero.',
        });
    }

    const tipo = tipo_movimentacao.toLowerCase();
    if (tipo !== 'entrada' && tipo !== 'saida') {
        return res.status(400).json({
            status: 'erro',
            mensagem: "Tipo de movimentação inválido. Use 'entrada' ou 'saida'.",
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        if (tipo === 'entrada') {
            // Registrar entrada
            await conn.execute(
                'INSERT INTO entradas_estoque (estoques_id_estoques, produtor_id_produtor, quantidade, motivo) VALUES (?, ?, ?, ?)',
                [id_estoque, id_produtor, qtd, motivo]
            );

            // Atualizar estoque
            await conn.execute(
                'UPDATE estoques SET ds_quantidade = ds_quantidade + ? WHERE id_estoques = ?',
                [qtd, id_estoque]
            );
        } else {
            // Registrar saída
            await conn.execute(
                'INSERT INTO saidas_estoque (estoques_id_estoques, produtor_id_produtor, quantidade, motivo) VALUES (?, ?, ?, ?)',
                [id_estoque, id_produtor, qtd, motivo]
            );

            // Atualizar estoque
            await conn.execute(
                'UPDATE estoques SET ds_quantidade = ds_quantidade - ? WHERE id_estoques = ?',
                [qtd, id_estoque]
            );
        }

        await conn.commit();

        res.json({
            status: 'sucesso',
            mensagem: tipo === 'entrada'
                ? 'Entrada de estoque registrada com sucesso.'
                : 'Saída de estoque registrada com sucesso.',
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Erro na movimentação:', err.message);
        res.status(500).json({
            status: 'erro',
            mensagem: 'Erro no servidor: ' + err.message,
        });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
