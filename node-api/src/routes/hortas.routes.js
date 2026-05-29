// =====================================================
// 🌿 Rotas de Hortas
// CRUD de hortas do produtor
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// =====================================================
// GET /api/hortas — Lista todas as hortas visíveis
// =====================================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
                h.id_hortas,
                h.nome,
                h.descricao,
                h.visibilidade,
                pr.nome_produtor,
                pr.email_produtor,
                pr.telefone_produtor
             FROM hortas h
             LEFT JOIN produtor pr ON pr.id_produtor = h.produtor_id_produtor
             WHERE h.visibilidade = 1
             ORDER BY h.nome ASC`
        );

        res.json({ status: 'sucesso', dados: rows });
    } catch (err) {
        console.error('Erro ao listar hortas:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/hortas/:id — Detalhes de uma horta
// =====================================================
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [[horta]] = await pool.execute(
            `SELECT
                h.id_hortas,
                h.nome,
                h.descricao,
                h.visibilidade,
                pr.nome_produtor,
                pr.email_produtor,
                pr.telefone_produtor
             FROM hortas h
             LEFT JOIN produtor pr ON pr.id_produtor = h.produtor_id_produtor
             WHERE h.id_hortas = ?`,
            [id]
        );

        if (!horta) {
            return res.status(404).json({ status: 'erro', mensagem: 'Horta não encontrada.' });
        }

        res.json({ status: 'sucesso', dados: horta });
    } catch (err) {
        console.error('Erro ao buscar horta:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// POST /api/hortas — Criar nova horta
// Body: { nome, descricao, visibilidade }
// =====================================================
router.post('/', validarTokenJwt, async (req, res) => {
    const idProdutor = req.usuario?.id;
    const { nome, descricao, visibilidade } = req.body;

    if (!nome) {
        return res.status(400).json({ status: 'erro', mensagem: 'Nome da horta é obrigatório.' });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO hortas (nome, descricao, visibilidade, produtor_id_produtor)
             VALUES (?, ?, ?, ?)`,
            [nome, descricao || null, visibilidade !== undefined ? visibilidade : 1, idProdutor]
        );

        res.status(201).json({
            status: 'sucesso',
            mensagem: 'Horta criada com sucesso!',
            id_hortas: result.insertId,
        });
    } catch (err) {
        console.error('Erro ao criar horta:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// PUT /api/hortas/:id — Atualizar horta
// Body: { nome, descricao, visibilidade }
// =====================================================
router.put('/:id', validarTokenJwt, async (req, res) => {
    const idProdutor = req.usuario?.id;
    const { id } = req.params;
    const { nome, descricao, visibilidade } = req.body;

    try {
        const [[horta]] = await pool.execute(
            'SELECT id_hortas, produtor_id_produtor FROM hortas WHERE id_hortas = ? LIMIT 1',
            [id]
        );

        if (!horta) {
            return res.status(404).json({ status: 'erro', mensagem: 'Horta não encontrada.' });
        }

        if (horta.produtor_id_produtor !== idProdutor) {
            return res.status(403).json({ status: 'erro', mensagem: 'Acesso negado.' });
        }

        await pool.execute(
            `UPDATE hortas SET
                nome = COALESCE(?, nome),
                descricao = COALESCE(?, descricao),
                visibilidade = COALESCE(?, visibilidade)
             WHERE id_hortas = ?`,
            [nome || null, descricao || null, visibilidade !== undefined ? visibilidade : null, id]
        );

        res.json({ status: 'sucesso', mensagem: 'Horta atualizada com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar horta:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// DELETE /api/hortas/:id — Remover horta
// =====================================================
router.delete('/:id', validarTokenJwt, async (req, res) => {
    const idProdutor = req.usuario?.id;
    const { id } = req.params;

    try {
        const [[horta]] = await pool.execute(
            'SELECT id_hortas, produtor_id_produtor FROM hortas WHERE id_hortas = ? LIMIT 1',
            [id]
        );

        if (!horta) {
            return res.status(404).json({ status: 'erro', mensagem: 'Horta não encontrada.' });
        }

        if (horta.produtor_id_produtor !== idProdutor) {
            return res.status(403).json({ status: 'erro', mensagem: 'Acesso negado.' });
        }

        await pool.execute('DELETE FROM hortas WHERE id_hortas = ?', [id]);

        res.json({ status: 'sucesso', mensagem: 'Horta removida com sucesso.' });
    } catch (err) {
        console.error('Erro ao remover horta:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

module.exports = router;
