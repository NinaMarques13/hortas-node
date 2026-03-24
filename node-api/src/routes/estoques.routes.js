// =====================================================
// 📦 Rotas de Estoques
// Converte: cadastro_estoque.php, edit_estoque.php,
//           delete_prod.php
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// =====================================================
// GET /api/estoques/horta/:id — Listar estoques de uma horta
// =====================================================
router.get('/horta/:id', async (req, res) => {
    const idHorta = parseInt(req.params.id, 10);
    try {
        const [estoques] = await pool.execute(
            `SELECT es.id_estoques, es.ds_quantidade, es.dt_validade, es.dt_colheita, es.dt_plantio,
              pr.id_produto, pr.nm_produto, pr.descricao AS descricao_produto, pr.unidade_medida_padrao
       FROM estoques es
       LEFT JOIN produtos pr ON pr.id_produto = es.produto_id_produto
       WHERE es.hortas_id_hortas = ?
       ORDER BY pr.nm_produto ASC`,
            [idHorta]
        );
        res.json({ status: 'sucesso', estoques });
    } catch (err) {
        console.error('Erro ao listar estoques:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro ao listar estoques.' });
    }
});

// =====================================================
// POST /api/estoques — Cadastrar lote no estoque
// =====================================================
router.post('/', validarTokenJwt, async (req, res) => {
    const dados = req.body;

    if (!dados.hortas_id_hortas || !dados.produto_id_produto || dados.ds_quantidade === undefined) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Campos obrigatórios: id da horta, id do produto e quantidade.',
        });
    }

    const idProdutor = req.usuario?.id || req.usuario?.id_produtor;
    if (!idProdutor) {
        return res.status(401).json({
            status: 'erro',
            mensagem: 'Token inválido ou não contém o ID do produtor.',
        });
    }

    // Verificar se o produtor é dono da horta
    try {
        const [hortaRows] = await pool.execute(
            'SELECT produtor_id_produtor FROM hortas WHERE id_hortas = ? LIMIT 1',
            [parseInt(dados.hortas_id_hortas, 10)]
        );

        if (hortaRows.length === 0) {
            return res.status(404).json({ status: 'erro', mensagem: 'Horta não encontrada.' });
        }

        if (hortaRows[0].produtor_id_produtor !== idProdutor) {
            return res.status(403).json({
                status: 'erro',
                mensagem: 'Você não tem permissão para adicionar estoque nesta horta.',
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO estoques (hortas_id_hortas, produto_id_produto, ds_quantidade, dt_validade, dt_colheita, dt_plantio)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [
                parseInt(dados.hortas_id_hortas, 10),
                parseInt(dados.produto_id_produto, 10),
                dados.ds_quantidade,
                dados.dt_validade || null,
                dados.dt_colheita || null,
                dados.dt_plantio || null,
            ]
        );

        res.status(201).json({
            status: 'sucesso',
            mensagem: 'Lote de produto cadastrado no estoque com sucesso!',
            id_estoque: result.insertId,
        });
    } catch (err) {
        console.error('Erro ao cadastrar estoque:', err.message);
        res.status(500).json({
            status: 'erro',
            mensagem: 'Erro no banco de dados: ' + err.message,
        });
    }
});

// =====================================================
// PUT /api/estoques/:id — Editar produto e estoque
// =====================================================
router.put('/:id', validarTokenJwt, async (req, res) => {
    const idProduto = parseInt(req.params.id, 10);
    const dados = req.body;
    const idProdutor = req.usuario?.id || req.usuario?.id_produtor;

    if (!idProdutor || !idProduto) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Token ou id_produto inválido.',
        });
    }

    try {
        // Buscar horta do produtor
        const [hortaRows] = await pool.execute(
            'SELECT id_hortas FROM hortas WHERE produtor_id_produtor = ? LIMIT 1',
            [idProdutor]
        );

        if (hortaRows.length === 0) {
            return res.status(404).json({
                status: 'erro',
                mensagem: 'Produtor sem horta.',
            });
        }

        const idHorta = hortaRows[0].id_hortas;

        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            // Atualizar produto
            if (dados.nome_produto || dados.descricao_produto || dados.unidade) {
                await conn.execute(
                    `UPDATE produtos SET
             nm_produto = COALESCE(?, nm_produto),
             descricao = COALESCE(?, descricao),
             unidade_medida_padrao = COALESCE(?, unidade_medida_padrao)
           WHERE id_produto = ?`,
                    [
                        dados.nome_produto || null,
                        dados.descricao_produto || null,
                        dados.unidade || null,
                        idProduto,
                    ]
                );
            }

            // Atualizar estoque
            const quantidade = dados.quantidade !== undefined ? parseFloat(dados.quantidade) : null;
            const dtPlantio = dados.dt_plantio || null;
            const dtColheita = dados.dt_colheita || null;

            if (quantidade !== null || dtPlantio || dtColheita) {
                await conn.execute(
                    `UPDATE estoques SET
             ds_quantidade = COALESCE(?, ds_quantidade),
             dt_plantio = COALESCE(?, dt_plantio),
             dt_colheita = COALESCE(?, dt_colheita)
           WHERE hortas_id_hortas = ? AND produto_id_produto = ?`,
                    [quantidade, dtPlantio, dtColheita, idHorta, idProduto]
                );
            }

            await conn.commit();

            res.json({
                status: 'sucesso',
                mensagem: 'Produto atualizado com sucesso.',
                id_produto: idProduto,
            });
        } catch (err) {
            if (conn) await conn.rollback();
            throw err;
        } finally {
            if (conn) conn.release();
        }
    } catch (err) {
        console.error('Erro ao editar estoque:', err.message);
        res.status(500).json({
            status: 'erro',
            mensagem: 'Erro ao atualizar produto: ' + err.message,
        });
    }
});

// =====================================================
// DELETE /api/estoques/:id — Deletar lote do estoque
// =====================================================
router.delete('/:id', validarTokenJwt, async (req, res) => {
    const idProduto = parseInt(req.params.id, 10);
    const idProdutor = req.usuario?.id || req.usuario?.id_produtor;

    if (!idProdutor || !idProduto) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Token e id_produto são obrigatórios.',
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verificar se o produto existe na horta do produtor
        const [rows] = await conn.execute(
            `SELECT e.id_estoques
       FROM estoques e
       JOIN hortas h ON e.hortas_id_hortas = h.id_hortas
       WHERE e.produto_id_produto = ? AND h.produtor_id_produtor = ?
       LIMIT 1`,
            [idProduto, idProdutor]
        );

        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                status: 'erro',
                mensagem: 'Produto não encontrado na horta do produtor.',
            });
        }

        const idEstoque = rows[0].id_estoques;

        // Deletar movimentações
        await conn.execute('DELETE FROM entradas_estoque WHERE estoques_id_estoques = ?', [idEstoque]);
        await conn.execute('DELETE FROM saidas_estoque WHERE estoques_id_estoques = ?', [idEstoque]);

        // Deletar estoque
        await conn.execute('DELETE FROM estoques WHERE id_estoques = ?', [idEstoque]);

        await conn.commit();

        res.json({
            status: 'sucesso',
            mensagem: 'Produto deletado com sucesso.',
            id_produto: idProduto,
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Erro ao deletar estoque:', err.message);
        res.status(500).json({
            status: 'erro',
            mensagem: 'Erro ao deletar produto: ' + err.message,
        });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
