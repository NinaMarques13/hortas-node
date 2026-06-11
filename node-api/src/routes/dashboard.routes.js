// =====================================================
// 📊 Rotas do Dashboard Admin
// Inclui: /resumo e /estoque-baixo (ausentes nas outras branches)
// além dos endpoints já existentes.
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// =====================================================
// GET /api/dashboard/resumo
// Totais gerais do sistema (cards do dashboard.html)
// =====================================================
router.get('/resumo', validarTokenJwt, async (_req, res) => {
  try {
    const [[{ total_hortas }]] = await pool.execute(
      'SELECT COUNT(*) AS total_hortas FROM hortas WHERE visibilidade = 1'
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
// GET /api/dashboard/estoque-baixo?limite=5&threshold=10
// Lotes com quantidade abaixo do limiar (padrão 10 unidades)
// =====================================================
router.get('/estoque-baixo', validarTokenJwt, async (req, res) => {
  const limite = parseInt(req.query.limite, 10) || 5;
  const threshold = parseFloat(req.query.threshold) || 10;

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
       WHERE e.ds_quantidade > 0 AND e.ds_quantidade <= ?
       ORDER BY e.ds_quantidade ASC
       LIMIT ?`,
      [threshold, limite]
    );

    res.json({ status: 'sucesso', dados: rows });
  } catch (err) {
    console.error('Erro ao buscar estoque baixo:', err.message);
    res.status(500).json({ status: 'erro', mensagem: 'Erro no servidor.' });
  }
});

// =====================================================
// GET /api/dashboard/proximos-vencer?dias=7
// =====================================================
router.get('/proximos-vencer', validarTokenJwt, async (req, res) => {
  const dias = parseInt(req.query.dias, 10) || 7;

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
// =====================================================
router.get('/movimentacoes-recentes', validarTokenJwt, async (req, res) => {
  const limite = parseInt(req.query.limite, 10) || 10;

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
// =====================================================
router.get('/top-produtos', validarTokenJwt, async (req, res) => {
  const limite = parseInt(req.query.limite, 10) || 5;

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
// =====================================================
router.get('/hortas-ativas', validarTokenJwt, async (_req, res) => {
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

module.exports = router;
