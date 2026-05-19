// =====================================================
// 📊 Rotas de Dashboard
// Métricas gerais e por produtor para o painel admin
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// =====================================================
// GET /api/dashboard/resumo
// Resumo geral do sistema (cards do topo do dashboard)
// Requer autenticação
// =====================================================
router.get('/resumo', validarTokenJwt, async (req, res) => {
    try {
        const [[{ total_hortas }]] = await pool.execute(
            'SELECT COUNT(*) AS total_hortas FROM hortas'
        );

        const [[{ total_produtores }]] = await pool.execute(
            'SELECT COUNT(*) AS total_produtores FROM produtor'
        );

        const [[{ total_produtos_catalogo }]] = await pool.execute(
            'SELECT COUNT(*) AS total_produtos_catalogo FROM produtos'
        );

        const [[{ itens_em_estoque }]] = await pool.execute(
            'SELECT COUNT(*) AS itens_em_estoque FROM estoques WHERE ds_quantidade > 0'
        );

        const [[{ total_entradas }]] = await pool.execute(
            'SELECT COUNT(*) AS total_entradas FROM entradas_estoque'
        );

        const [[{ total_saidas }]] = await pool.execute(
            'SELECT COUNT(*) AS total_saidas FROM saidas_estoque'
        );

        res.json({
            status: 'sucesso',
            dados: {
                total_hortas,
                total_produtores,
                total_produtos_catalogo,
                itens_em_estoque,
                total_entradas,
                total_saidas,
            },
        });
    } catch (err) {
        console.error('Erro no resumo do dashboard:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/dashboard/estoque-baixo?limite=5
// Produtos com estoque abaixo de um limite (padrão: 5)
// Útil para alertas no dashboard
// =====================================================
router.get('/estoque-baixo', validarTokenJwt, async (req, res) => {
    const limite = parseFloat(req.query.limite) || 5;

    try {
        const [rows] = await pool.execute(
            `SELECT
                e.id_estoques,
                e.ds_quantidade,
                e.dt_validade,
                p.nm_produto,
                p.unidade_medida_padrao,
                h.nome AS nome_horta
             FROM estoques e
             JOIN produtos p ON p.id_produto = e.produto_id_produto
             JOIN hortas h ON h.id_hortas = e.hortas_id_hortas
             WHERE e.ds_quantidade <= ?
             ORDER BY e.ds_quantidade ASC`,
            [limite]
        );

        res.json({ status: 'sucesso', dados: rows });
    } catch (err) {
        console.error('Erro ao buscar estoque baixo:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/dashboard/proximos-vencer?dias=7
// Produtos com validade próxima (padrão: 7 dias)
// =====================================================
router.get('/proximos-vencer', validarTokenJwt, async (req, res) => {
    const dias = parseInt(req.query.dias) || 7;

    try {
        const [rows] = await pool.execute(
            `SELECT
                e.id_estoques,
                e.ds_quantidade,
                e.dt_validade,
                p.nm_produto,
                p.unidade_medida_padrao,
                h.nome AS nome_horta,
                DATEDIFF(e.dt_validade, CURDATE()) AS dias_restantes
             FROM estoques e
             JOIN produtos p ON p.id_produto = e.produto_id_produto
             JOIN hortas h ON h.id_hortas = e.hortas_id_hortas
             WHERE e.dt_validade IS NOT NULL
               AND e.dt_validade BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
             ORDER BY e.dt_validade ASC`,
            [dias]
        );

        res.json({ status: 'sucesso', dados: rows });
    } catch (err) {
        console.error('Erro ao buscar próximos a vencer:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/dashboard/movimentacoes-recentes?limite=10
// Últimas entradas e saídas de estoque unificadas
// =====================================================
router.get('/movimentacoes-recentes', validarTokenJwt, async (req, res) => {
    const limite = parseInt(req.query.limite) || 10;

    try {
        const [rows] = await pool.execute(
            `(
                SELECT
                    'entrada' AS tipo,
                    ee.dt_entrada AS data_movimentacao,
                    ee.quantidade,
                    ee.motivo,
                    p.nm_produto,
                    pr.nome_produtor,
                    h.nome AS nome_horta
                FROM entradas_estoque ee
                JOIN estoques e ON e.id_estoques = ee.estoques_id_estoques
                JOIN produtos p ON p.id_produto = e.produto_id_produto
                JOIN hortas h ON h.id_hortas = e.hortas_id_hortas
                LEFT JOIN produtor pr ON pr.id_produtor = ee.produtor_id_produtor
            )
            UNION ALL
            (
                SELECT
                    'saida' AS tipo,
                    se.dt_saida AS data_movimentacao,
                    se.quantidade,
                    se.motivo,
                    p.nm_produto,
                    pr.nome_produtor,
                    h.nome AS nome_horta
                FROM saidas_estoque se
                JOIN estoques e ON e.id_estoques = se.estoques_id_estoques
                JOIN produtos p ON p.id_produto = e.produto_id_produto
                JOIN hortas h ON h.id_hortas = e.hortas_id_hortas
                LEFT JOIN produtor pr ON pr.id_produtor = se.produtor_id_produtor
            )
            ORDER BY data_movimentacao DESC
            LIMIT ?`,
            [limite]
        );

        res.json({ status: 'sucesso', dados: rows });
    } catch (err) {
        console.error('Erro ao buscar movimentações recentes:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/dashboard/top-produtos?limite=5
// Produtos mais movimentados (por saídas = mais vendidos)
// =====================================================
router.get('/top-produtos', validarTokenJwt, async (req, res) => {
    const limite = parseInt(req.query.limite) || 5;

    try {
        const [rows] = await pool.execute(
            `SELECT
                p.nm_produto,
                p.unidade_medida_padrao,
                SUM(se.quantidade) AS total_saido,
                COUNT(se.id_saida) AS qtd_movimentacoes
             FROM saidas_estoque se
             JOIN estoques e ON e.id_estoques = se.estoques_id_estoques
             JOIN produtos p ON p.id_produto = e.produto_id_produto
             GROUP BY p.id_produto, p.nm_produto, p.unidade_medida_padrao
             ORDER BY total_saido DESC
             LIMIT ?`,
            [limite]
        );

        res.json({ status: 'sucesso', dados: rows });
    } catch (err) {
        console.error('Erro ao buscar top produtos:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/dashboard/hortas-ativas
// Lista hortas com seus totais de estoque
// =====================================================
router.get('/hortas-ativas', validarTokenJwt, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
                h.id_hortas,
                h.nome,
                h.descricao,
                COUNT(DISTINCT e.id_estoques) AS qtd_itens_estoque,
                SUM(e.ds_quantidade) AS quantidade_total_estoque,
                pr.nome_produtor,
                pr.email_produtor
             FROM hortas h
             LEFT JOIN estoques e ON e.hortas_id_hortas = h.id_hortas
             LEFT JOIN produtor pr ON pr.id_produtor = h.produtor_id_produtor
             WHERE h.visibilidade = 1
             GROUP BY h.id_hortas, h.nome, h.descricao, pr.nome_produtor, pr.email_produtor
             ORDER BY quantidade_total_estoque DESC`
        );

        res.json({ status: 'sucesso', dados: rows });
    } catch (err) {
        console.error('Erro ao buscar hortas ativas:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

// =====================================================
// GET /api/dashboard/meu-resumo
// Resumo do produtor logado (dashboard pessoal)
// =====================================================
router.get('/meu-resumo', validarTokenJwt, async (req, res) => {
    const idProdutor = req.usuario?.id || req.usuario?.id_produtor;

    try {
        // Busca horta do produtor
        const [[horta]] = await pool.execute(
            'SELECT id_hortas, nome FROM hortas WHERE produtor_id_produtor = ? LIMIT 1',
            [idProdutor]
        );

        if (!horta) {
            return res.json({
                status: 'sucesso',
                dados: { mensagem: 'Produtor sem horta cadastrada.' },
            });
        }

        const idHorta = horta.id_hortas;

        const [[{ itens_em_estoque }]] = await pool.execute(
            'SELECT COUNT(*) AS itens_em_estoque FROM estoques WHERE hortas_id_hortas = ? AND ds_quantidade > 0',
            [idHorta]
        );

        const [[{ total_entradas }]] = await pool.execute(
            `SELECT COUNT(*) AS total_entradas
             FROM entradas_estoque ee
             JOIN estoques e ON e.id_estoques = ee.estoques_id_estoques
             WHERE e.hortas_id_hortas = ?`,
            [idHorta]
        );

        const [[{ total_saidas }]] = await pool.execute(
            `SELECT COUNT(*) AS total_saidas
             FROM saidas_estoque se
             JOIN estoques e ON e.id_estoques = se.estoques_id_estoques
             WHERE e.hortas_id_hortas = ?`,
            [idHorta]
        );

        const [[{ proximos_vencer }]] = await pool.execute(
            `SELECT COUNT(*) AS proximos_vencer
             FROM estoques
             WHERE hortas_id_hortas = ?
               AND dt_validade IS NOT NULL
               AND dt_validade BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)`,
            [idHorta]
        );

        res.json({
            status: 'sucesso',
            dados: {
                horta: horta.nome,
                itens_em_estoque,
                total_entradas,
                total_saidas,
                proximos_vencer,
            },
        });
    } catch (err) {
        console.error('Erro no resumo pessoal:', err.message);
        res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
    }
});

module.exports = router;
