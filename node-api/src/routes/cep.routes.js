// =====================================================
// 📈 Rotas de CEP — Controle Estatístico de Processos
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const {
  calcularMedia,
  calcularAmplitude,
  calcularDesvioPadrao,
  calcularCV,
  gerarTabelaFrequencias,
  interpretarHistograma,
} = require('../utils/estatistica');

// Monta o objeto de resposta CEP a partir de um array de quantidades + dados brutos
function montarResposta(quantidades, dadosBrutos) {
  const n = quantidades.length;
  const media = calcularMedia(quantidades);
  const amplitude = calcularAmplitude(quantidades);
  const desvioPadrao = calcularDesvioPadrao(quantidades);
  const cv = calcularCV(desvioPadrao, media);
  const tabelaFrequencias = gerarTabelaFrequencias(quantidades);
  const interpretacao = interpretarHistograma(tabelaFrequencias);

  return {
    n,
    media: parseFloat(media.toFixed(4)),
    amplitude: parseFloat(amplitude.toFixed(4)),
    desvio_padrao: parseFloat(desvioPadrao.toFixed(4)),
    coeficiente_variacao: parseFloat(cv.toFixed(2)),
    xmin: n ? Math.min(...quantidades) : 0,
    xmax: n ? Math.max(...quantidades) : 0,
    tabela_frequencias: tabelaFrequencias,
    interpretacao,
    dados_brutos: dadosBrutos,
  };
}

// =====================================================
// GET /api/cep/estoque/:id?periodo=90
// CEP para as movimentações de um lote de estoque
// =====================================================
router.get('/estoque/:id', async (req, res) => {
  const idEstoque = parseInt(req.params.id, 10);
  const periodo = parseInt(req.query.periodo, 10) || 90;

  if (!idEstoque) {
    return res.status(400).json({ status: 'erro', mensagem: 'id_estoque inválido.' });
  }

  try {
    const [entradas] = await pool.execute(
      `SELECT quantidade, dt_entrada AS data, 'entrada' AS tipo
       FROM entradas_estoque
       WHERE estoques_id_estoques = ?
         AND dt_entrada >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [idEstoque, periodo]
    );

    const [saidas] = await pool.execute(
      `SELECT quantidade, dt_saida AS data, 'saida' AS tipo
       FROM saidas_estoque
       WHERE estoques_id_estoques = ?
         AND dt_saida >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [idEstoque, periodo]
    );

    const movimentacoes = [...entradas, ...saidas].sort(
      (a, b) => new Date(a.data) - new Date(b.data)
    );

    const quantidades = movimentacoes.map(m => parseFloat(m.quantidade));

    const resposta = montarResposta(quantidades, movimentacoes);
    res.json({ status: 'sucesso', periodo_dias: periodo, id_estoque: idEstoque, ...resposta });
  } catch (err) {
    console.error('Erro CEP estoque:', err.message);
    res.status(500).json({ status: 'erro', mensagem: 'Erro ao calcular CEP.' });
  }
});

// =====================================================
// GET /api/cep/horta/:id?produto_id=&periodo=90
// CEP agregado para todos os estoques de uma horta
// (filtro opcional por produto)
// =====================================================
router.get('/horta/:id', async (req, res) => {
  const idHorta = parseInt(req.params.id, 10);
  const periodo = parseInt(req.query.periodo, 10) || 90;
  const idProduto = req.query.produto_id ? parseInt(req.query.produto_id, 10) : null;

  if (!idHorta) {
    return res.status(400).json({ status: 'erro', mensagem: 'id_horta inválido.' });
  }

  try {
    // Buscar ids dos estoques da horta (com filtro opcional de produto)
    const filtroExtra = idProduto ? 'AND es.produto_id_produto = ?' : '';
    const params = idProduto ? [idHorta, idProduto] : [idHorta];

    const [estoques] = await pool.execute(
      `SELECT es.id_estoques, pr.nm_produto, pr.unidade_medida_padrao
       FROM estoques es
       JOIN produtos pr ON pr.id_produto = es.produto_id_produto
       WHERE es.hortas_id_hortas = ? ${filtroExtra}`,
      params
    );

    if (!estoques.length) {
      return res.json({ status: 'sucesso', periodo_dias: periodo, n: 0, mensagem: 'Nenhum estoque encontrado.' });
    }

    const ids = estoques.map(e => e.id_estoques);
    const placeholders = ids.map(() => '?').join(',');

    const [entradas] = await pool.execute(
      `SELECT quantidade, dt_entrada AS data, 'entrada' AS tipo, estoques_id_estoques AS id_estoque
       FROM entradas_estoque
       WHERE estoques_id_estoques IN (${placeholders})
         AND dt_entrada >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [...ids, periodo]
    );

    const [saidas] = await pool.execute(
      `SELECT quantidade, dt_saida AS data, 'saida' AS tipo, estoques_id_estoques AS id_estoque
       FROM saidas_estoque
       WHERE estoques_id_estoques IN (${placeholders})
         AND dt_saida >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [...ids, periodo]
    );

    const movimentacoes = [...entradas, ...saidas].sort(
      (a, b) => new Date(a.data) - new Date(b.data)
    );

    const quantidades = movimentacoes.map(m => parseFloat(m.quantidade));

    const resposta = montarResposta(quantidades, movimentacoes);
    res.json({
      status: 'sucesso',
      periodo_dias: periodo,
      id_horta: idHorta,
      produto_filtrado: idProduto,
      estoques_analisados: estoques.length,
      ...resposta,
    });
  } catch (err) {
    console.error('Erro CEP horta:', err.message);
    res.status(500).json({ status: 'erro', mensagem: 'Erro ao calcular CEP.' });
  }
});

module.exports = router;
