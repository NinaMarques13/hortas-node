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

module.exports = {
  calcularMedia,
  calcularAmplitude,
  calcularDesvioPadrao,
  calcularCV,
  gerarTabelaFrequencias,
  interpretarHistograma,
};
