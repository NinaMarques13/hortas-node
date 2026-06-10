// =====================================================
// 📐 Utilitários de Estatística — CEP
// Fórmulas conforme slides da disciplina (OPET)
// =====================================================

/**
 * Média aritmética: x̄ = Σxi / n
 */
function calcularMedia(valores) {
  if (!valores.length) return 0;
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

/**
 * Amplitude: R = Xmax − Xmin
 */
function calcularAmplitude(valores) {
  if (!valores.length) return 0;
  return Math.max(...valores) - Math.min(...valores);
}

/**
 * Desvio-padrão amostral: S = √[ Σ(xi − x̄)² / (n − 1) ]
 */
function calcularDesvioPadrao(valores) {
  const n = valores.length;
  if (n < 2) return 0;
  const media = calcularMedia(valores);
  const somaDiferencasQuadradas = valores.reduce((soma, v) => soma + Math.pow(v - media, 2), 0);
  return Math.sqrt(somaDiferencasQuadradas / (n - 1));
}

/**
 * Coeficiente de variação: CV = (S / x̄) × 100%
 */
function calcularCV(desvioPadrao, media) {
  if (!media) return 0;
  return (desvioPadrao / media) * 100;
}

/**
 * Tabela de frequências com intervalos de classe.
 * Número de classes K = 1 + 3,3 × log₁₀(N)  (regra de Sturges, slide 8)
 * Amplitude de classe h = Amplitude_total / K
 */
function gerarTabelaFrequencias(valores) {
  const n = valores.length;
  if (n < 2) return [];

  const xMin = Math.min(...valores);
  const xMax = Math.max(...valores);
  const amplitudeTotal = xMax - xMin;

  if (amplitudeTotal === 0) {
    return [{
      intervalo: `${xMin.toFixed(2)} – ${xMax.toFixed(2)}`,
      li: xMin,
      ls: xMax,
      contagem: n,
      frequencia_relativa: 1,
    }];
  }

  const K = Math.ceil(1 + 3.3 * Math.log10(n));
  const h = amplitudeTotal / K;

  const classes = Array.from({ length: K }, (_, i) => {
    const li = xMin + i * h;
    const ls = li + h;
    return { li, ls, contagem: 0 };
  });

  for (const v of valores) {
    // Último intervalo é fechado em ambos os lados
    const idx = Math.min(Math.floor((v - xMin) / h), K - 1);
    classes[idx].contagem++;
  }

  return classes.map((c, i) => ({
    intervalo_classe: i + 1,
    intervalo: `${c.li.toFixed(2)} – ${c.ls.toFixed(2)}`,
    li: parseFloat(c.li.toFixed(4)),
    ls: parseFloat(c.ls.toFixed(4)),
    contagem: c.contagem,
    frequencia_relativa: parseFloat((c.contagem / n).toFixed(4)),
  }));
}

/**
 * Interpretação do histograma baseada nos padrões do slide 10.
 * Retorna uma string descritiva para exibir no frontend.
 */
function interpretarHistograma(tabela) {
  if (!tabela.length) return 'dados insuficientes';

  const contagens = tabela.map(t => t.contagem);
  const max = Math.max(...contagens);
  const idxMax = contagens.indexOf(max);
  const n = contagens.length;

  // Verifica pico isolado (uma barra isolada muito acima das vizinhas)
  const picos = contagens.filter(c => c > max * 0.6).length;
  if (picos >= 2 && idxMax > 0 && idxMax < n - 1) {
    const secondMax = [...contagens].sort((a, b) => b - a)[1];
    if (secondMax > max * 0.6) return 'picos duplos — possível mistura de duas distribuições';
  }

  // Plato: frequências aproximadamente iguais
  const min = Math.min(...contagens.filter(c => c > 0));
  if (max > 0 && min / max > 0.7) return 'platô — possível mistura de distribuições com diferentes médias';

  // Simétrico: pico central
  const centro = Math.floor(n / 2);
  if (Math.abs(idxMax - centro) <= 1) return 'simétrico — processo sob controle estatístico';

  // Forte declive
  if (idxMax === 0) return 'forte declive — possível retirada de dados fora dos limites';

  // Assimétrico
  if (idxMax < centro) return 'assimétrico à direita — processo controlado por limite superior';
  return 'assimétrico à esquerda — processo controlado por limite inferior';
}

/**
 * Limites de controle para carta de valores individuais (I-chart).
 * LC  = x̄  (linha central)
 * LSC = x̄ + 3S  (limite superior de controle)
 * LIC = x̄ − 3S  (limite inferior de controle)
 */
function calcularLimitesControle(media, desvioPadrao) {
  return {
    lc: media,
    lsc: media + 3 * desvioPadrao,
    lic: media - 3 * desvioPadrao,
  };
}

/**
 * Avalia cada ponto da série em relação aos limites de controle,
 * marcando os que caem fora (causas especiais de variação).
 */
function avaliarPontosControle(valores, limites) {
  return valores.map((v, i) => ({
    indice: i + 1,
    valor: v,
    fora_controle: v > limites.lsc || v < limites.lic,
  }));
}

// =====================================================
// Cartas de controle por subgrupo (X-R, P, C)
// =====================================================

/**
 * Fatores para cartas X-R por tamanho de subgrupo n (n = 2..10).
 * Tabela padrão de Controle Estatístico de Processos.
 */
const CONSTANTES_XR = {
  2:  { A2: 1.880, D3: 0,     D4: 3.267 },
  3:  { A2: 1.023, D3: 0,     D4: 2.574 },
  4:  { A2: 0.729, D3: 0,     D4: 2.282 },
  5:  { A2: 0.577, D3: 0,     D4: 2.114 },
  6:  { A2: 0.483, D3: 0,     D4: 2.004 },
  7:  { A2: 0.419, D3: 0.076, D4: 1.924 },
  8:  { A2: 0.373, D3: 0.136, D4: 1.864 },
  9:  { A2: 0.337, D3: 0.184, D4: 1.816 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777 },
};

/**
 * Carta X-R (médias e amplitudes por subgrupo).
 * Entrada: subgrupos = [{ rotulo, valores: number[] }]
 * X-bar: LC = X̿, LSC = X̿ + A2·R̄, LIC = X̿ − A2·R̄
 * R:     LC = R̄, LSC = D4·R̄,     LIC = D3·R̄
 */
function calcularCartaXR(subgrupos) {
  const validos = (subgrupos || []).filter(s => s.valores && s.valores.length >= 2);
  if (validos.length < 1) return null;

  const medias = validos.map(s => calcularMedia(s.valores));
  const amplitudes = validos.map(s => calcularAmplitude(s.valores));

  const xBarBar = calcularMedia(medias);
  const rBar = calcularMedia(amplitudes);

  // n representativo = média dos tamanhos, clampado a [2, 10] para lookup
  const tamMedio = calcularMedia(validos.map(s => s.valores.length));
  const n = Math.min(10, Math.max(2, Math.round(tamMedio)));
  const { A2, D3, D4 } = CONSTANTES_XR[n];

  const xbar = {
    lc: xBarBar,
    lsc: xBarBar + A2 * rBar,
    lic: xBarBar - A2 * rBar,
    pontos: validos.map((s, i) => ({
      indice: i + 1,
      rotulo: s.rotulo,
      valor: medias[i],
      fora_controle: medias[i] > xBarBar + A2 * rBar || medias[i] < xBarBar - A2 * rBar,
    })),
  };

  const r = {
    lc: rBar,
    lsc: D4 * rBar,
    lic: D3 * rBar,
    pontos: validos.map((s, i) => ({
      indice: i + 1,
      rotulo: s.rotulo,
      valor: amplitudes[i],
      fora_controle: amplitudes[i] > D4 * rBar || amplitudes[i] < D3 * rBar,
    })),
  };

  return { n, xBarBar, rBar, xbar, r };
}

/**
 * Carta P (fração defeituosa por subgrupo, limites variáveis com n_i).
 * Entrada: subgrupos = [{ rotulo, inspecionados, defeituosos }]
 * p̄ = Σd / Σn ; LSC_i = p̄ + 3√(p̄(1−p̄)/n_i) ; LIC_i = max(0, …)
 */
function calcularCartaP(subgrupos) {
  const validos = (subgrupos || []).filter(s => s.inspecionados > 0);
  if (!validos.length) return null;

  const totalInsp = validos.reduce((soma, s) => soma + s.inspecionados, 0);
  const totalDef = validos.reduce((soma, s) => soma + s.defeituosos, 0);
  const pBar = totalInsp ? totalDef / totalInsp : 0;

  const pontos = validos.map((s, i) => {
    const p_i = s.defeituosos / s.inspecionados;
    const sigma = Math.sqrt((pBar * (1 - pBar)) / s.inspecionados);
    const lsc = pBar + 3 * sigma;
    const lic = Math.max(0, pBar - 3 * sigma);
    return {
      indice: i + 1,
      rotulo: s.rotulo,
      valor: p_i,
      n: s.inspecionados,
      lc: pBar,
      lsc,
      lic,
      fora_controle: p_i > lsc || p_i < lic,
    };
  });

  return { pBar, pontos };
}

/**
 * Carta C (contagem de ocorrências por período).
 * Entrada: contagens = [{ rotulo, contagem }]
 * c̄ = média ; LSC = c̄ + 3√c̄ ; LIC = max(0, c̄ − 3√c̄)
 */
function calcularCartaC(contagens) {
  const dados = contagens || [];
  if (!dados.length) return null;

  const valores = dados.map(c => c.contagem);
  const cBar = calcularMedia(valores);
  const lsc = cBar + 3 * Math.sqrt(cBar);
  const lic = Math.max(0, cBar - 3 * Math.sqrt(cBar));

  const pontos = dados.map((c, i) => ({
    indice: i + 1,
    rotulo: c.rotulo,
    valor: c.contagem,
    fora_controle: c.contagem > lsc || c.contagem < lic,
  }));

  return { cBar, lc: cBar, lsc, lic, pontos };
}

module.exports = {
  calcularMedia,
  calcularAmplitude,
  calcularDesvioPadrao,
  calcularCV,
  gerarTabelaFrequencias,
  interpretarHistograma,
  calcularLimitesControle,
  avaliarPontosControle,
  CONSTANTES_XR,
  calcularCartaXR,
  calcularCartaP,
  calcularCartaC,
};
