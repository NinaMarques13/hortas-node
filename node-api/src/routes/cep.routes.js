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
  calcularLimitesControle,
  avaliarPontosControle,
  calcularCartaXR,
  calcularCartaP,
  calcularCartaC,
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

  // Carta de controle (valores individuais): LC = x̄, LSC/LIC = x̄ ± 3S
  const limites = calcularLimitesControle(media, desvioPadrao);
  const pontosControle = avaliarPontosControle(quantidades, limites);
  const pontosForaControle = pontosControle.filter(p => p.fora_controle).length;

  return {
    n,
    media: parseFloat(media.toFixed(4)),
    amplitude: parseFloat(amplitude.toFixed(4)),
    desvio_padrao: parseFloat(desvioPadrao.toFixed(4)),
    coeficiente_variacao: parseFloat(cv.toFixed(2)),
    xmin: n ? Math.min(...quantidades) : 0,
    xmax: n ? Math.max(...quantidades) : 0,
    lc: parseFloat(limites.lc.toFixed(4)),
    lsc: parseFloat(limites.lsc.toFixed(4)),
    lic: parseFloat(limites.lic.toFixed(4)),
    pontos_fora_controle: pontosForaControle,
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

// Monta uma carta de valores individuais (I-chart) a partir de uma série
function montarIChart(valores) {
  const n = valores.length;
  const media = calcularMedia(valores);
  const s = calcularDesvioPadrao(valores);
  const limites = calcularLimitesControle(media, s);
  const pontos = avaliarPontosControle(valores, limites);
  return {
    n,
    media: parseFloat(media.toFixed(4)),
    desvio_padrao: parseFloat(s.toFixed(4)),
    lc: parseFloat(limites.lc.toFixed(4)),
    lsc: parseFloat(limites.lsc.toFixed(4)),
    lic: parseFloat(limites.lic.toFixed(4)),
    pontos,
    pontos_fora_controle: pontos.filter(p => p.fora_controle).length,
  };
}

// =====================================================
// GET /api/cep/operacao?periodo=180
// Métricas operacionais agregadas da plataforma (seções 4.3–5.4 do artigo)
// =====================================================
router.get('/operacao', async (req, res) => {
  const periodo = parseInt(req.query.periodo, 10) || 180;
  const janela = `dt_pedido >= DATE_SUB(NOW(), INTERVAL ? DAY)`;

  try {
    // 1. KPIs
    const [[kpiRow]] = await pool.execute(
      `SELECT
         COUNT(*) AS total_pedidos,
         SUM(convertido) AS convertidos,
         SUM(nps_nota >= 9) AS promotores,
         SUM(nps_nota BETWEEN 0 AND 6) AS detratores,
         SUM(nps_nota IS NOT NULL) AS total_avaliacoes,
         AVG(tempo_resposta_suporte) AS tmr
       FROM pedidos_operacionais WHERE ${janela}`,
      [periodo]
    );

    const totalPedidos = Number(kpiRow.total_pedidos) || 0;

    if (totalPedidos === 0) {
      return res.json({
        status: 'sucesso',
        periodo_dias: periodo,
        n: 0,
        mensagem: 'Sem pedidos no período. Execute "npm run seed:operacao".',
      });
    }

    const totalAval = Number(kpiRow.total_avaliacoes) || 0;
    const kpis = {
      total_pedidos: totalPedidos,
      taxa_conversao: parseFloat(((Number(kpiRow.convertidos) / totalPedidos) * 100).toFixed(2)),
      nps: totalAval
        ? parseFloat((((Number(kpiRow.promotores) - Number(kpiRow.detratores)) / totalAval) * 100).toFixed(1))
        : 0,
      tmr: kpiRow.tmr != null ? Math.round(Number(kpiRow.tmr)) : 0,
    };

    // 2. I-charts: tempo de entrega e aceite (pedidos finalizados)
    const [tempos] = await pool.execute(
      `SELECT tempo_entrega, tempo_aceite
       FROM pedidos_operacionais
       WHERE ${janela} AND status = 'finalizado' AND tempo_entrega IS NOT NULL
       ORDER BY dt_pedido ASC`,
      [periodo]
    );
    const entrega = montarIChart(tempos.map(t => Number(t.tempo_entrega)));
    const aceite = montarIChart(tempos.map(t => Number(t.tempo_aceite)));

    // 3. Carta X-R: tempo de preparo, subgrupos por semana
    const [preparoRows] = await pool.execute(
      `SELECT semana_ano, tempo_preparo
       FROM pedidos_operacionais
       WHERE ${janela} AND status = 'finalizado' AND tempo_preparo IS NOT NULL
       ORDER BY semana_ano ASC`,
      [periodo]
    );
    const mapaPreparo = new Map();
    for (const row of preparoRows) {
      if (!mapaPreparo.has(row.semana_ano)) mapaPreparo.set(row.semana_ano, []);
      mapaPreparo.get(row.semana_ano).push(Number(row.tempo_preparo));
    }
    const subgruposPreparo = [...mapaPreparo.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([semana, valores]) => ({ rotulo: `S${semana}`, valores }));
    const preparo = calcularCartaXR(subgruposPreparo);

    // 4. Carta P: taxa de avariados por semana
    const [avariasRows] = await pool.execute(
      `SELECT semana_ano,
              SUM(qtd_itens) AS inspecionados,
              SUM(qtd_avariados) AS defeituosos
       FROM pedidos_operacionais
       WHERE ${janela} AND status = 'finalizado' AND qtd_itens IS NOT NULL
       GROUP BY semana_ano ORDER BY semana_ano ASC`,
      [periodo]
    );
    const avarias = calcularCartaP(
      avariasRows.map(r => ({
        rotulo: `S${r.semana_ano}`,
        inspecionados: Number(r.inspecionados),
        defeituosos: Number(r.defeituosos),
      }))
    );

    // 5. Carta C: rupturas de estoque por semana (preencher semanas com zero)
    const [semanasRows] = await pool.execute(
      `SELECT DISTINCT semana_ano FROM pedidos_operacionais WHERE ${janela} ORDER BY semana_ano ASC`,
      [periodo]
    );
    const [rupturaRows] = await pool.execute(
      `SELECT semana_ano, COUNT(*) AS contagem
       FROM pedidos_operacionais
       WHERE ${janela} AND ruptura_estoque = 1
       GROUP BY semana_ano`,
      [periodo]
    );
    const mapaRuptura = new Map(rupturaRows.map(r => [r.semana_ano, Number(r.contagem)]));
    const contagensRuptura = semanasRows.map(r => ({
      rotulo: `S${r.semana_ano}`,
      contagem: mapaRuptura.get(r.semana_ano) || 0,
    }));
    const ruptura = calcularCartaC(contagensRuptura);

    res.json({
      status: 'sucesso',
      periodo_dias: periodo,
      kpis,
      entrega,
      aceite,
      preparo,
      avarias,
      ruptura,
    });
  } catch (err) {
    console.error('Erro CEP operação:', err.message);
    res.status(500).json({ status: 'erro', mensagem: 'Erro ao calcular métricas operacionais.' });
  }
});

module.exports = router;
