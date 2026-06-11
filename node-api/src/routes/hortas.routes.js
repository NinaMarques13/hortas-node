// =====================================================
// 🌱 Rotas de Hortas
// Converte: cadastro_horta.php, get_horta.php,
//           editar_horta.php, excluir_horta.php,
//           hortas_por_bairro.php
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// =====================================================
// GET /api/hortas — Listar todas as hortas visíveis
// =====================================================
router.get('/', async (_req, res) => {
    try {
        const [hortas] = await pool.execute(
            `SELECT h.id_hortas, h.nome, h.descricao, h.nr_cnpj, h.visibilidade,
              h.receitas_geradas, h.produtor_id_produtor,
              e.nm_rua, e.nm_bairro, e.nm_cidade, e.nm_estado,
              p.nome_produtor
       FROM hortas h
       LEFT JOIN endereco_hortas e ON e.id_endereco_hortas = h.endereco_hortas_id_endereco_hortas
       LEFT JOIN produtor p ON p.id_produtor = h.produtor_id_produtor
       WHERE h.visibilidade = 1
       ORDER BY h.nome ASC`
        );
        res.json({ status: 'sucesso', hortas });
    } catch (err) {
        console.error('Erro ao listar hortas:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro ao listar hortas.' });
    }
});

// =====================================================
// GET /api/hortas/:id — Detalhes de uma horta
// =====================================================
router.get('/:id', async (req, res) => {
    const idHorta = parseInt(req.params.id, 10);
    try {
        const [rows] = await pool.execute(
            `SELECT h.id_hortas, h.nome, h.descricao, h.nr_cnpj, h.visibilidade,
              h.receitas_geradas, h.produtor_id_produtor,
              e.id_endereco_hortas, e.nm_rua, e.nr_cep, e.nm_bairro,
              e.nm_estado, e.nm_cidade, e.nm_pais,
              p.nome_produtor, p.telefone_produtor, p.chave_pix, p.endereco_produtor,
              p.exibir_telefone, p.exibir_endereco, p.exibir_pix
       FROM hortas h
       LEFT JOIN endereco_hortas e ON e.id_endereco_hortas = h.endereco_hortas_id_endereco_hortas
       LEFT JOIN produtor p ON p.id_produtor = h.produtor_id_produtor
       WHERE h.id_hortas = ?
       LIMIT 1`,
            [idHorta]
        );

        if (rows.length === 0) {
            return res.status(404).json({ status: 'erro', mensagem: 'Horta não encontrada.' });
        }

        const horta = rows[0];

        // Buscar estoques
        const [estoques] = await pool.execute(
            `SELECT es.id_estoques, es.ds_quantidade, es.dt_validade, es.dt_colheita, es.dt_plantio,
              pr.id_produto, pr.nm_produto, pr.descricao AS descricao_produto, pr.unidade_medida_padrao
       FROM estoques es
       LEFT JOIN produtos pr ON pr.id_produto = es.produto_id_produto
       WHERE es.hortas_id_hortas = ?`,
            [idHorta]
        );

        res.json({ status: 'sucesso', horta, estoques });
    } catch (err) {
        console.error('Erro ao buscar horta:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro ao buscar horta.' });
    }
});

// =====================================================
// POST /api/hortas — Cadastrar horta
// =====================================================
router.post('/', async (req, res) => {
    const dados = req.body;

    const camposObrigatorios = ['nome_horta', 'rua', 'bairro', 'cep', 'cidade', 'estado', 'pais'];

    for (const campo of camposObrigatorios) {
        if (!dados[campo]) {
            return res.status(400).json({
                status: 'erro',
                mensagem: `O campo '${campo}' é obrigatório.`,
            });
        }
    }

    const idProdutor = dados.id_produtor || null;
    const descricao = (dados.descricao || '').substring(0, 255);
    const cnpj = (dados.cnpj || '').trim() || null;
    const visibilidade = dados.visibilidade ?? 1;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Inserir endereço
        const [endResult] = await conn.execute(
            `INSERT INTO endereco_hortas (nm_rua, nr_cep, nm_bairro, nm_estado, nm_cidade, nm_pais)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [dados.rua, dados.cep, dados.bairro, dados.estado, dados.cidade, dados.pais]
        );
        const idEndereco = endResult.insertId;

        // 2. Inserir horta
        const [hortaResult] = await conn.execute(
            `INSERT INTO hortas (endereco_hortas_id_endereco_hortas, produtor_id_produtor, nr_cnpj, nome, descricao, visibilidade, receitas_geradas)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [idEndereco, idProdutor, cnpj, dados.nome_horta, descricao, visibilidade]
        );
        const idHorta = hortaResult.insertId;

        await conn.commit();

        res.status(201).json({
            status: 'sucesso',
            mensagem: 'Horta cadastrada com sucesso!',
            id_horta: idHorta,
            id_endereco: idEndereco,
            id_produtor: idProdutor,
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Erro ao cadastrar horta:', err.message);
        res.status(500).json({
            status: 'erro',
            mensagem: 'Erro no banco de dados: ' + err.message,
        });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// POST /api/hortas/busca — Buscar hortas por bairro
// (DEVE ficar ANTES de /:id para não conflitar)
// =====================================================
router.post('/busca', async (req, res) => {
    const bairro = (req.body.bairro || '').trim();

    if (!bairro) {
        return res.status(400).json({
            status: 'erro',
            mensagem: 'Campo obrigatório: bairro.',
        });
    }

    try {
        const [hortas] = await pool.execute(
            `SELECT h.id_hortas AS id_horta, h.nome, h.descricao,
              h.produtor_id_produtor AS id_produtor, h.visibilidade,
              e.nm_rua AS endereco, e.nm_bairro AS bairro
       FROM hortas h
       INNER JOIN endereco_hortas e ON h.endereco_hortas_id_endereco_hortas = e.id_endereco_hortas
       WHERE e.nm_bairro = ? AND h.visibilidade = 1
       ORDER BY h.nome ASC`,
            [bairro]
        );

        res.json({
            status: 'sucesso',
            mensagem: 'Busca realizada com sucesso.',
            bairro,
            quantidade: hortas.length,
            hortas,
        });
    } catch (err) {
        console.error('Erro ao buscar hortas:', err.message);
        res.status(500).json({
            status: 'erro',
            mensagem: 'Erro ao buscar hortas: ' + err.message,
        });
    }
});

// =====================================================
// GET /api/hortas/produtor/:id — Buscar horta do produtor
// =====================================================
router.get('/produtor/:id', async (req, res) => {
    const idProdutor = parseInt(req.params.id, 10);

    if (!idProdutor) {
        return res.status(400).json({
            status: 'erro',
            mensagem: "O campo 'id_produtor' é obrigatório.",
        });
    }

    try {
        // Buscar horta
        const [hortaRows] = await pool.execute(
            `SELECT h.id_hortas, h.nome AS nome_horta, h.descricao, h.nr_cnpj,
              h.visibilidade, h.receitas_geradas,
              e.id_endereco_hortas, e.nm_rua, e.nr_cep, e.nm_bairro,
              e.nm_estado, e.nm_cidade, e.nm_pais
       FROM hortas h
       LEFT JOIN endereco_hortas e ON e.id_endereco_hortas = h.endereco_hortas_id_endereco_hortas
       WHERE h.produtor_id_produtor = ?
       LIMIT 1`,
            [idProdutor]
        );

        if (hortaRows.length === 0) {
            return res.status(404).json({
                status: 'erro',
                mensagem: 'Nenhuma horta encontrada para este produtor.',
            });
        }

        const horta = hortaRows[0];

        // Buscar estoques
        const [estoques] = await pool.execute(
            `SELECT es.id_estoques, es.ds_quantidade, es.dt_validade, es.dt_colheita, es.dt_plantio,
              p.id_produto, p.nm_produto, p.descricao AS descricao_produto, p.unidade_medida_padrao
       FROM estoques es
       LEFT JOIN produtos p ON p.id_produto = es.produto_id_produto
       WHERE es.hortas_id_hortas = ?`,
            [horta.id_hortas]
        );

        res.json({
            status: 'sucesso',
            mensagem: 'Horta encontrada com sucesso.',
            horta: {
                id_hortas: horta.id_hortas,
                nome: horta.nome_horta,
                descricao: horta.descricao,
                cnpj: horta.nr_cnpj,
                visibilidade: horta.visibilidade,
                receitas_geradas: horta.receitas_geradas,
                endereco: {
                    rua: horta.nm_rua,
                    bairro: horta.nm_bairro,
                    cep: horta.nr_cep,
                    cidade: horta.nm_cidade,
                    estado: horta.nm_estado,
                    pais: horta.nm_pais,
                },
                estoques,
            },
        });
    } catch (err) {
        console.error('Erro ao buscar horta:', err.message);
        res.status(500).json({
            status: 'erro',
            mensagem: 'Erro no banco de dados: ' + err.message,
        });
    }
});

// =====================================================
// PUT /api/hortas/:id — Editar horta (somente dono)
// =====================================================
router.put('/:id', validarTokenJwt, async (req, res) => {
    const idHorta = parseInt(req.params.id, 10);
    const idProdutor = req.usuario?.id || req.usuario?.id_produtor;
    const dados = req.body;

    const camposObrigatorios = ['nome_horta', 'rua', 'bairro', 'cep', 'cidade', 'estado', 'pais'];

    for (const campo of camposObrigatorios) {
        if (!dados[campo]) {
            return res.status(400).json({
                status: 'erro',
                mensagem: `O campo '${campo}' é obrigatório para a edição.`,
            });
        }
    }

    const descricao = (dados.descricao || '').substring(0, 255);
    const cnpj = (dados.cnpj || '').trim() || null;
    const visibilidade = dados.visibilidade ?? 1;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Buscar horta e verificar propriedade
        const [hortaRows] = await conn.execute(
            'SELECT endereco_hortas_id_endereco_hortas, produtor_id_produtor FROM hortas WHERE id_hortas = ?',
            [idHorta]
        );

        if (hortaRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                status: 'erro',
                mensagem: `Horta com ID ${idHorta} não encontrada.`,
            });
        }

        if (hortaRows[0].produtor_id_produtor !== idProdutor) {
            await conn.rollback();
            return res.status(403).json({
                status: 'erro',
                mensagem: 'Você não tem permissão para editar esta horta.',
            });
        }

        const idEndereco = hortaRows[0].endereco_hortas_id_endereco_hortas;

        // 1. Atualizar endereço
        await conn.execute(
            `UPDATE endereco_hortas SET nm_rua = ?, nr_cep = ?, nm_bairro = ?, nm_estado = ?, nm_cidade = ?, nm_pais = ?
       WHERE id_endereco_hortas = ?`,
            [dados.rua, dados.cep, dados.bairro, dados.estado, dados.cidade, dados.pais, idEndereco]
        );

        // 2. Atualizar horta
        await conn.execute(
            `UPDATE hortas SET nr_cnpj = ?, nome = ?, descricao = ?, visibilidade = ?
       WHERE id_hortas = ?`,
            [cnpj, dados.nome_horta, descricao, visibilidade, idHorta]
        );

        await conn.commit();

        res.json({
            status: 'sucesso',
            mensagem: 'Horta atualizada com sucesso!',
            id_horta: idHorta,
            id_endereco: idEndereco,
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Erro ao editar horta:', err.message);
        res.status(500).json({
            status: 'erro',
            mensagem: 'Erro no banco de dados durante a atualização: ' + err.message,
        });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// DELETE /api/hortas/:id — Excluir horta (somente dono)
// =====================================================
router.delete('/:id', validarTokenJwt, async (req, res) => {
    const idHorta = parseInt(req.params.id, 10);
    const idProdutor = req.usuario?.id || req.usuario?.id_produtor;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Buscar horta e verificar propriedade
        const [hortaRows] = await conn.execute(
            'SELECT endereco_hortas_id_endereco_hortas, produtor_id_produtor FROM hortas WHERE id_hortas = ?',
            [idHorta]
        );

        if (hortaRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                status: 'erro',
                mensagem: `Horta com ID ${idHorta} não encontrada.`,
            });
        }

        if (hortaRows[0].produtor_id_produtor !== idProdutor) {
            await conn.rollback();
            return res.status(403).json({
                status: 'erro',
                mensagem: 'Você não tem permissão para excluir esta horta.',
            });
        }

        const idEndereco = hortaRows[0].endereco_hortas_id_endereco_hortas;

        // Deletar horta (cascata cuida dos estoques)
        const [delResult] = await conn.execute('DELETE FROM hortas WHERE id_hortas = ?', [idHorta]);

        // Deletar endereço
        await conn.execute('DELETE FROM endereco_hortas WHERE id_endereco_hortas = ?', [idEndereco]);

        await conn.commit();

        if (delResult.affectedRows > 0) {
            res.json({
                status: 'sucesso',
                mensagem: 'Horta e endereço excluídos com sucesso.',
                id_horta_excluida: idHorta,
                id_endereco_excluido: idEndereco,
            });
        } else {
            res.json({
                status: 'aviso',
                mensagem: `Nenhuma horta foi excluída. ID ${idHorta} não encontrado.`,
            });
        }
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Erro ao excluir horta:', err.message);
        res.status(500).json({
            status: 'erro',
            mensagem: 'Erro no banco de dados durante a exclusão: ' + err.message,
        });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
