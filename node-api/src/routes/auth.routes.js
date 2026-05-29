// =====================================================
// 🔐 Rotas de Autenticação (Produtor)
// Cadastro e login de produtores
// =====================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// =====================================================
// POST /api/auth/register — Cadastro de produtor
// Body: { nome_produtor, email_produtor, senha, telefone_produtor }
// =====================================================
router.post('/register', async (req, res) => {
    const { nome_produtor, email_produtor, senha, telefone_produtor } = req.body;

    if (!nome_produtor || !email_produtor || !senha) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Nome, email e senha são obrigatórios.',
        });
    }

    try {
        const hashSenha = await bcrypt.hash(senha, 10);

        const [result] = await pool.execute(
            `INSERT INTO produtor (nome_produtor, email_produtor, hash_senha, telefone_produtor)
             VALUES (?, ?, ?, ?)`,
            [nome_produtor, email_produtor, hashSenha, telefone_produtor || null]
        );

        res.status(201).json({
            status: 'sucesso',
            mensagem: 'Produtor cadastrado com sucesso!',
            id_produtor: result.insertId,
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                status: 'erro',
                mensagem: 'E-mail já cadastrado.',
            });
        }
        console.error('Erro no cadastro do produtor:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// POST /api/auth/login — Login de produtor
// Body: { email_produtor, senha }
// =====================================================
router.post('/login', async (req, res) => {
    const { email_produtor, senha } = req.body;

    if (!email_produtor || !senha) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Email e senha são obrigatórios.',
        });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id_produtor, nome_produtor, hash_senha FROM produtor WHERE email_produtor = ? LIMIT 1',
            [email_produtor]
        );

        if (rows.length === 0) {
            return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas.' });
        }

        const produtor = rows[0];
        const senhaOk = await bcrypt.compare(senha, produtor.hash_senha);

        if (!senhaOk) {
            return res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas.' });
        }

        const secret = process.env.JWT_SECRET_KEY;
        const token = jwt.sign(
            { data: { id: produtor.id_produtor, nome: produtor.nome_produtor, role: 'produtor' } },
            secret,
            { algorithm: 'HS256', expiresIn: '8h' }
        );

        res.json({
            status: 'sucesso',
            mensagem: 'Login bem-sucedido.',
            id: produtor.id_produtor,
            nome: produtor.nome_produtor,
            token,
        });
    } catch (err) {
        console.error('Erro no login do produtor:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/auth/me — Dados do produtor logado
// =====================================================
router.get('/me', validarTokenJwt, async (req, res) => {
    const idProdutor = req.usuario?.id;

    try {
        const [[produtor]] = await pool.execute(
            'SELECT id_produtor, nome_produtor, email_produtor, telefone_produtor FROM produtor WHERE id_produtor = ? LIMIT 1',
            [idProdutor]
        );

        if (!produtor) {
            return res.status(404).json({ status: 'erro', mensagem: 'Produtor não encontrado.' });
        }

        res.json({ status: 'sucesso', dados: produtor });
    } catch (err) {
        console.error('Erro ao buscar produtor:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

module.exports = router;
