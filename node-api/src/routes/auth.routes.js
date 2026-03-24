// =====================================================
// 🔐 Rotas de Autenticação
// Converte: cadastro_produtor.php, login_horta.php,
//           forgot_pass.php, auth.php
// =====================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// =====================================================
// POST /api/auth/register — Cadastro de produtor
// =====================================================
router.post('/register', async (req, res) => {
    const dados = req.body;

    // Campos obrigatórios
    const camposObrigatorios = [
        'nome_produtor', 'nr_cpf', 'email_produtor', 'senha',
        'pergunta_1', 'resposta_1', 'pergunta_2', 'resposta_2',
    ];

    for (const campo of camposObrigatorios) {
        if (!dados[campo]) {
            return res.status(400).json({
                status: 'erro',
                mensagem: `O campo '${campo}' é obrigatório.`,
            });
        }
    }

    const telefone = dados.telefone_produtor || '';
    const chavePix = dados.chave_pix || null;
    const endereco = dados.endereco_produtor || null;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Inserir produtor
        const hashSenha = await bcrypt.hash(dados.senha, 10);

        const [resultProdutor] = await conn.execute(
            `INSERT INTO produtor (nome_produtor, nr_cpf, email_produtor, hash_senha, telefone_produtor, chave_pix, endereco_produtor)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [dados.nome_produtor, dados.nr_cpf, dados.email_produtor, hashSenha, telefone, chavePix, endereco]
        );

        const idProdutor = resultProdutor.insertId;

        // 2. Inserir perguntas de segurança
        const r1Hash = await bcrypt.hash(dados.resposta_1.toLowerCase(), 10);
        const r2Hash = await bcrypt.hash(dados.resposta_2.toLowerCase(), 10);

        await conn.execute(
            `INSERT INTO seguranca_produtor (produtor_id_produtor, pergunta_1, resposta_1_hash, pergunta_2, resposta_2_hash)
       VALUES (?, ?, ?, ?, ?)`,
            [idProdutor, dados.pergunta_1, r1Hash, dados.pergunta_2, r2Hash]
        );

        await conn.commit();

        res.status(201).json({
            status: 'sucesso',
            mensagem: 'Produtor cadastrado com sucesso!',
            id_produtor: idProdutor,
        });
    } catch (err) {
        if (conn) await conn.rollback();

        // Duplicidade de email/CPF
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                status: 'erro',
                mensagem: 'E-mail ou CPF já cadastrado.',
            });
        }

        console.error('Erro no registro:', err.message);
        res.status(500).json({
            status: 'erro',
            mensagem: 'Erro no banco de dados durante o cadastro.',
        });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// POST /api/auth/login — Login com JWT
// =====================================================
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Email e senha são obrigatórios.',
        });
    }

    const secret = process.env.JWT_SECRET_KEY;
    if (!secret) {
        return res.status(500).json({
            status: 'erro',
            mensagem: 'Erro de configuração do servidor.',
        });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id_produtor, nome_produtor, hash_senha FROM produtor WHERE email_produtor = ? LIMIT 1',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                status: 'erro',
                mensagem: 'Credenciais inválidas.',
            });
        }

        const produtor = rows[0];
        const senhaOk = await bcrypt.compare(senha, produtor.hash_senha);

        if (!senhaOk) {
            return res.status(401).json({
                status: 'erro',
                mensagem: 'Credenciais inválidas.',
            });
        }

        // Gerar JWT
        const token = jwt.sign(
            {
                data: {
                    id: produtor.id_produtor,
                    nome: produtor.nome_produtor,
                },
            },
            secret,
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        // Registrar sessão no banco
        const expiraEm = new Date(Date.now() + 3600 * 1000);

        await pool.execute(
            'INSERT INTO session (jwt_token, data_criacao, data_expiracao, produtor_id_produtor) VALUES (?, NOW(), ?, ?)',
            [token, expiraEm, produtor.id_produtor]
        );

        res.json({
            status: 'sucesso',
            mensagem: 'Login bem-sucedido.',
            id: produtor.id_produtor,
            token,
            expira_em: expiraEm.toISOString(),
        });
    } catch (err) {
        console.error('Erro no login:', err.message);
        res.status(500).json({
            status: 'erro',
            mensagem: 'Erro no servidor.',
        });
    }
});

// =====================================================
// POST /api/auth/forgot-password — Recuperar senha
// =====================================================
router.post('/forgot-password', async (req, res) => {
    const campos = ['email', 'novaSenha', 'confirmarSenha', 'pergunta1', 'pergunta2', 'resposta1', 'resposta2'];

    for (const campo of campos) {
        if (!req.body[campo] && req.body[campo] !== '0') {
            return res.status(400).json({
                success: false,
                message: `O campo '${campo}' é obrigatório.`,
            });
        }
    }

    const { email, novaSenha, confirmarSenha, pergunta1, pergunta2, resposta1, resposta2 } = req.body;

    if (novaSenha !== confirmarSenha) {
        return res.status(400).json({ success: false, message: 'As senhas não coincidem.' });
    }

    try {
        // Buscar produtor
        const [prodRows] = await pool.execute(
            'SELECT id_produtor FROM produtor WHERE email_produtor = ? LIMIT 1',
            [email.trim()]
        );

        if (prodRows.length === 0) {
            return res.json({ success: false, message: 'Produtor com esse e-mail não encontrado.' });
        }

        const idProdutor = prodRows[0].id_produtor;

        // Buscar segurança
        const [segRows] = await pool.execute(
            'SELECT pergunta_1, resposta_1_hash, pergunta_2, resposta_2_hash FROM seguranca_produtor WHERE produtor_id_produtor = ? LIMIT 1',
            [idProdutor]
        );

        if (segRows.length === 0) {
            return res.json({ success: false, message: 'Perguntas de segurança não encontradas.' });
        }

        const seg = segRows[0];

        // Normalizar perguntas
        const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');

        if (normalize(pergunta1) !== normalize(seg.pergunta_1) ||
            normalize(pergunta2) !== normalize(seg.pergunta_2)) {
            return res.json({ success: false, message: 'As perguntas não correspondem às cadastradas.' });
        }

        // Verificar respostas
        const r1ok = await bcrypt.compare(resposta1, seg.resposta_1_hash);
        const r2ok = await bcrypt.compare(resposta2, seg.resposta_2_hash);

        if (!r1ok || !r2ok) {
            return res.json({ success: false, message: 'Respostas incorretas para as perguntas de segurança.' });
        }

        // Atualizar senha
        const novoHash = await bcrypt.hash(novaSenha, 10);

        const [result] = await pool.execute(
            'UPDATE produtor SET hash_senha = ? WHERE id_produtor = ?',
            [novoHash, idProdutor]
        );

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Senha alterada com sucesso!' });
        } else {
            res.json({ success: false, message: 'Nenhuma alteração realizada.' });
        }
    } catch (err) {
        console.error('Erro forgot-password:', err.message);
        res.status(500).json({ success: false, message: 'Erro interno: ' + err.message });
    }
});

// =====================================================
// POST /api/auth/check — Verificar sessão/token
// =====================================================
router.post('/check', async (req, res) => {
    const { token, data_atual } = req.body;
    const dataAtual = data_atual || new Date().toISOString().slice(0, 19).replace('T', ' ');

    let idProdutor = null;
    let dataExpiracao = null;

    if (token) {
        try {
            const [rows] = await pool.execute(
                'SELECT data_expiracao, produtor_id_produtor FROM session WHERE jwt_token = ? LIMIT 1',
                [token]
            );

            if (rows.length > 0) {
                dataExpiracao = rows[0].data_expiracao;
                idProdutor = rows[0].produtor_id_produtor;

                // Se expirado, deleta sessão
                if (new Date(dataAtual) > new Date(dataExpiracao)) {
                    await pool.execute('DELETE FROM session WHERE jwt_token = ?', [token]);
                    idProdutor = null;
                }
            }
        } catch (err) {
            idProdutor = null;
        }
    }

    res.json({
        status: 'sucesso',
        mensagem: 'Requisição processada.',
        id_produtor: idProdutor,
        expira_em: dataExpiracao,
    });
});

// =====================================================
// GET /api/auth/me — Dados do produtor logado
// =====================================================
router.get('/me', validarTokenJwt, async (req, res) => {
    const idProdutor = req.usuario?.id || req.usuario?.id_produtor;

    try {
        const [rows] = await pool.execute(
            `SELECT id_produtor, nome_produtor, email_produtor, telefone_produtor, nr_cpf,
                    chave_pix, endereco_produtor, exibir_telefone, exibir_endereco, exibir_pix
             FROM produtor WHERE id_produtor = ? LIMIT 1`,
            [idProdutor]
        );

        if (rows.length === 0) {
            return res.status(404).json({ status: 'erro', mensagem: 'Produtor não encontrado.' });
        }

        res.json({ status: 'sucesso', produtor: rows[0] });
    } catch (err) {
        console.error('Erro ao buscar perfil:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// PUT /api/auth/profile — Atualizar perfil do produtor
// =====================================================
router.put('/profile', validarTokenJwt, async (req, res) => {
    const idProdutor = req.usuario?.id || req.usuario?.id_produtor;
    const body = req.body;

    try {
        const sets = [];
        const vals = [];

        const fields = [
            ['nome_produtor', 'nome_produtor'],
            ['telefone_produtor', 'telefone_produtor'],
            ['email_produtor', 'email_produtor'],
            ['chave_pix', 'chave_pix'],
            ['endereco_produtor', 'endereco_produtor'],
        ];

        for (const [bodyKey, dbKey] of fields) {
            if (body[bodyKey] !== undefined) {
                sets.push(`${dbKey} = ?`);
                vals.push(body[bodyKey] || null);
            }
        }

        // Privacy toggles (0 or 1)
        const toggles = ['exibir_telefone', 'exibir_endereco', 'exibir_pix'];
        for (const t of toggles) {
            if (body[t] !== undefined) {
                sets.push(`${t} = ?`);
                vals.push(body[t] ? 1 : 0);
            }
        }

        if (sets.length === 0) {
            return res.status(400).json({ status: 'erro', mensagem: 'Nenhum dado para atualizar.' });
        }

        vals.push(idProdutor);
        await pool.execute(`UPDATE produtor SET ${sets.join(', ')} WHERE id_produtor = ?`, vals);

        res.json({ status: 'sucesso', mensagem: 'Perfil atualizado com sucesso!' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'erro', mensagem: 'E-mail já em uso.' });
        }
        console.error('Erro ao atualizar perfil:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

module.exports = router;
