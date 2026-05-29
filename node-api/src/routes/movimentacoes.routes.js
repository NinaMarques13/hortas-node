// =====================================================
// 📊 Rotas de Movimentações de Estoque
// Entradas e saídas de estoque
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// =====================================================
// GET /api/movimentacoes/entradas — Lista entradas de estoque
// Query: ?estoque_id=1&limite=20
// =====================================================
router.get('/entradas', validarTokenJwt, async (req, res) => {
    const { estoque_id, limite } = req.query;
    const maxRegistros = parseInt(limite) || 50;

    try {
        let query = `
            SELECT
                ee.id_entrada,
                ee.quantidade,
                ee.motivo,
                ee.dt_entrada,
                p.nm_produto,
                p.unidade_medida_padrao,
                h.nome AS nome_horta,
                pr.nome_produtor
             FROM entradas_estoque ee
             JOIN estoques e ON e.id_estoques = ee.estoques_id_estoques
             JOIN produtos p ON p.id_produto = e.produto_id_produto
             JOIN hortas h ON h.id_hortas = e.hortas_id_hortas
             LEFT JOIN produtor pr ON pr.id_produtor = ee.produtor_id_produtor`;

        const params = [];
        if (estoque_id) {
            query += ' WHERE ee.estoques_id_estoques = ?';
            params.push(estoque_id);
        }

        query += ' ORDER BY ee.dt_entrada DESC LIMIT ?';
        params.push(maxRegistros);

        const [rows] = await pool.execute(query, params);
        res.json({ status: 'sucesso', dados: rows });
    } catch (err) {
        console.error('Erro ao listar entradas:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// POST /api/movimentacoes/entradas — Registrar entrada de estoque
// Body: { estoques_id_estoques, quantidade, motivo }
// =====================================================
router.post('/entradas', validarTokenJwt, async (req, res) => {
    const idProdutor = req.usuario?.id;
    const { estoques_id_estoques, quantidade, motivo } = req.body;

    if (!estoques_id_estoques || !quantidade) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'estoques_id_estoques e quantidade são obrigatórios.',
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Registra a entrada
        const [result] = await conn.execute(
            `INSERT INTO entradas_estoque (estoques_id_estoques, quantidade, motivo, produtor_id_produtor)
             VALUES (?, ?, ?, ?)`,
            [estoques_id_estoques, quantidade, motivo || null, idProdutor]
        );

        // Atualiza a quantidade no estoque
        await conn.execute(
            'UPDATE estoques SET ds_quantidade = ds_quantidade + ? WHERE id_estoques = ?',
            [quantidade, estoques_id_estoques]
        );

        await conn.commit();

        res.status(201).json({
            status: 'sucesso',
            mensagem: 'Entrada registrada com sucesso!',
            id_entrada: result.insertId,
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Erro ao registrar entrada:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// GET /api/movimentacoes/saidas — Lista saídas de estoque
// Query: ?estoque_id=1&limite=20
// =====================================================
router.get('/saidas', validarTokenJwt, async (req, res) => {
    const { estoque_id, limite } = req.query;
    const maxRegistros = parseInt(limite) || 50;

    try {
        let query = `
            SELECT
                se.id_saida,
                se.quantidade,
                se.motivo,
                se.dt_saida,
                p.nm_produto,
                p.unidade_medida_padrao,
                h.nome AS nome_horta,
                pr.nome_produtor
             FROM saidas_estoque se
             JOIN estoques e ON e.id_estoques = se.estoques_id_estoques
             JOIN produtos p ON p.id_produto = e.produto_id_produto
             JOIN hortas h ON h.id_hortas = e.hortas_id_hortas
             LEFT JOIN produtor pr ON pr.id_produtor = se.produtor_id_produtor`;

        const params = [];
        if (estoque_id) {
            query += ' WHERE se.estoques_id_estoques = ?';
            params.push(estoque_id);
        }

        query += ' ORDER BY se.dt_saida DESC LIMIT ?';
        params.push(maxRegistros);

        const [rows] = await pool.execute(query, params);
        res.json({ status: 'sucesso', dados: rows });
    } catch (err) {
        console.error('Erro ao listar saídas:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// POST /api/movimentacoes/saidas — Registrar saída de estoque
// Body: { estoques_id_estoques, quantidade, motivo }
// =====================================================
router.post('/saidas', validarTokenJwt, async (req, res) => {
    const idProdutor = req.usuario?.id;
    const { estoques_id_estoques, quantidade, motivo } = req.body;

    if (!estoques_id_estoques || !quantidade) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'estoques_id_estoques e quantidade são obrigatórios.',
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verifica se há quantidade suficiente
        const [[estoque]] = await conn.execute(
            'SELECT ds_quantidade FROM estoques WHERE id_estoques = ? FOR UPDATE',
            [estoques_id_estoques]
        );

        if (!estoque) {
            await conn.rollback();
            return res.status(404).json({ status: 'erro', mensagem: 'Item de estoque não encontrado.' });
        }

        if (parseFloat(estoque.ds_quantidade) < parseFloat(quantidade)) {
            await conn.rollback();
            return res.status(400).json({
                status: 'erro',
                mensagem: `Quantidade insuficiente em estoque. Disponível: ${estoque.ds_quantidade}`,
            });
        }

        // Registra a saída
        const [result] = await conn.execute(
            `INSERT INTO saidas_estoque (estoques_id_estoques, quantidade, motivo, produtor_id_produtor)
             VALUES (?, ?, ?, ?)`,
            [estoques_id_estoques, quantidade, motivo || null, idProdutor]
        );

        // Atualiza a quantidade no estoque
        await conn.execute(
            'UPDATE estoques SET ds_quantidade = ds_quantidade - ? WHERE id_estoques = ?',
            [quantidade, estoques_id_estoques]
        );

        await conn.commit();

        res.status(201).json({
            status: 'sucesso',
            mensagem: 'Saída registrada com sucesso!',
            id_saida: result.insertId,
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Erro ao registrar saída:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
