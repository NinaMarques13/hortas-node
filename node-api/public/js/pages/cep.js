// =====================================================
// 📈 Página CEP — Controle Estatístico de Processos
// =====================================================

let cepChartInstance = null;
let cepCartaInstance = null;
// Instâncias de gráfico da aba Operação
let cepEntregaInstance = null;
let cepAceiteInstance = null;
let cepXbarInstance = null;
let cepRInstance = null;
let cepPInstance = null;
let cepCInstance = null;

async function renderCep() {
  const container = getPageContainer();

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>📈 Controle Estatístico de Processos</h2>
        <p>Análise estatística de estoque e da operação da plataforma</p>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:1.5rem;border-bottom:1px solid var(--border);padding-bottom:0;">
        <button id="cepTabEstoque" class="btn btn-primary" onclick="cepTrocarAba('estoque')">📦 Estoque</button>
        <button id="cepTabOperacao" class="btn btn-ghost" onclick="cepTrocarAba('operacao')">🚚 Operação</button>
      </div>

      <!-- ABA ESTOQUE -->
      <div id="cepPaneEstoque">
        <div class="card" style="margin-bottom:1.5rem;">
          <div class="form-section-title">Filtros</div>
          <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;">
            <div class="form-group" style="flex:1;min-width:180px;margin-bottom:0;">
              <label>Horta</label>
              <select id="cepHortaSelect" class="form-control">
                <option value="">Carregando...</option>
              </select>
            </div>
            <div class="form-group" style="flex:1;min-width:180px;margin-bottom:0;">
              <label>Produto <span style="color:var(--text-muted);font-weight:400;">(opcional)</span></label>
              <select id="cepProdutoSelect" class="form-control" disabled>
                <option value="">Todos os produtos</option>
              </select>
            </div>
            <div class="form-group" style="min-width:150px;margin-bottom:0;">
              <label>Período</label>
              <select id="cepPeriodoSelect" class="form-control">
                <option value="30">30 dias</option>
                <option value="60">60 dias</option>
                <option value="90" selected>90 dias</option>
                <option value="180">180 dias</option>
              </select>
            </div>
            <button id="cepBtnAnalisar" class="btn btn-primary" disabled>Analisar</button>
          </div>
        </div>
        <div id="cepResultado"></div>
      </div>

      <!-- ABA OPERAÇÃO -->
      <div id="cepPaneOperacao" style="display:none;">
        <div class="card" style="margin-bottom:1.5rem;">
          <div class="form-section-title">Filtros</div>
          <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;">
            <div class="form-group" style="min-width:150px;margin-bottom:0;">
              <label>Período</label>
              <select id="cepOpPeriodoSelect" class="form-control">
                <option value="90">90 dias</option>
                <option value="180" selected>180 dias</option>
              </select>
            </div>
            <button id="cepOpBtnAnalisar" class="btn btn-primary">Analisar</button>
          </div>
        </div>
        <div id="cepOperacaoResultado"></div>
      </div>
    </div>
  `;

  await carregarHortasCep();

  document.getElementById('cepHortaSelect').addEventListener('change', onHortaChange);
  document.getElementById('cepBtnAnalisar').addEventListener('click', executarAnalise);
  document.getElementById('cepOpBtnAnalisar').addEventListener('click', executarAnaliseOperacao);
}

function cepTrocarAba(aba) {
  const isEstoque = aba === 'estoque';
  document.getElementById('cepPaneEstoque').style.display = isEstoque ? 'block' : 'none';
  document.getElementById('cepPaneOperacao').style.display = isEstoque ? 'none' : 'block';
  document.getElementById('cepTabEstoque').className = isEstoque ? 'btn btn-primary' : 'btn btn-ghost';
  document.getElementById('cepTabOperacao').className = isEstoque ? 'btn btn-ghost' : 'btn btn-primary';
}

async function carregarHortasCep() {
  try {
    const data = await Api.get('/hortas');
    const hortas = data.hortas || [];
    const sel = document.getElementById('cepHortaSelect');

    if (!hortas.length) {
      sel.innerHTML = '<option value="">Nenhuma horta cadastrada</option>';
      return;
    }

    sel.innerHTML = '<option value="">Selecione uma horta</option>' +
      hortas.map(h => `<option value="${h.id_hortas}">${h.nome}</option>`).join('');
  } catch (e) {
    document.getElementById('cepHortaSelect').innerHTML = '<option value="">Erro ao carregar hortas</option>';
  }
}

async function onHortaChange() {
  const idHorta = document.getElementById('cepHortaSelect').value;
  const selProduto = document.getElementById('cepProdutoSelect');
  const btnAnalisar = document.getElementById('cepBtnAnalisar');

  selProduto.innerHTML = '<option value="">Todos os produtos</option>';
  selProduto.disabled = true;
  btnAnalisar.disabled = !idHorta;

  if (!idHorta) return;

  try {
    const data = await Api.get(`/estoques/horta/${idHorta}`);
    const estoques = data.estoques || [];

    if (estoques.length) {
      selProduto.innerHTML = '<option value="">Todos os produtos</option>' +
        estoques.map(e => `<option value="${e.produto_id || e.id_produto}">${e.nm_produto}</option>`).join('');
      selProduto.disabled = false;
    }
  } catch (_) { /* mantém "Todos os produtos" */ }
}

async function executarAnalise() {
  const idHorta = document.getElementById('cepHortaSelect').value;
  const idProduto = document.getElementById('cepProdutoSelect').value;
  const periodo = document.getElementById('cepPeriodoSelect').value;
  const resultado = document.getElementById('cepResultado');

  if (!idHorta) return;

  resultado.innerHTML = '<div class="spinner-center"><div class="spinner"></div></div>';

  try {
    let url = `/cep/horta/${idHorta}?periodo=${periodo}`;
    if (idProduto) url += `&produto_id=${idProduto}`;

    const dados = await Api.get(url);

    if (dados.n === 0) {
      resultado.innerHTML = `<div class="card"><p style="color:var(--text-muted);">
        Nenhuma movimentação encontrada para o período selecionado.
        Execute <code>npm run seed:cep</code> para popular o histórico.
      </p></div>`;
      return;
    }

    renderResultadoCep(dados);
  } catch (e) {
    resultado.innerHTML = `<div class="card"><p style="color:var(--danger);">Erro ao carregar dados: ${e.message}</p></div>`;
  }
}

function renderResultadoCep(d) {
  const resultado = document.getElementById('cepResultado');

  // Cards de estatísticas
  const statsHtml = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem;margin-bottom:1.5rem;">
      ${statCard('n (amostras)', d.n, '')}
      ${statCard('Média (x̄)', d.media, '')}
      ${statCard('Amplitude (R)', d.amplitude, '')}
      ${statCard('Desvio-Padrão (S)', d.desvio_padrao, '')}
      ${statCard('Coef. Variação (CV)', d.coeficiente_variacao, '%')}
      ${statCard('Mínimo', d.xmin, '')}
      ${statCard('Máximo', d.xmax, '')}
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem;margin-bottom:1.5rem;">
      ${statCard('LSC (x̄ + 3S)', d.lsc, '')}
      ${statCard('LC (x̄)', d.lc, '')}
      ${statCard('LIC (x̄ − 3S)', d.lic, '')}
      ${statCard('Pontos fora de controle', d.pontos_fora_controle, '', d.pontos_fora_controle > 0 ? 'var(--danger)' : 'var(--primary)')}
    </div>
  `;

  // Tabela de frequências
  const tabelaHtml = d.tabela_frequencias.length ? `
    <div class="card" style="margin-bottom:1.5rem;overflow-x:auto;">
      <h3 style="margin-bottom:1rem;">Tabela de Frequências</h3>
      <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
        <thead>
          <tr style="background:var(--surface-hover);">
            <th style="${thStyle()}">Classe</th>
            <th style="${thStyle()}">Intervalo</th>
            <th style="${thStyle()}">Contagem (f)</th>
            <th style="${thStyle()}">Fr. Relativa (fr)</th>
            <th style="${thStyle()}">Fr. % </th>
          </tr>
        </thead>
        <tbody>
          ${d.tabela_frequencias.map(row => `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="${tdStyle()}">${row.intervalo_classe}</td>
              <td style="${tdStyle()}">${row.intervalo}</td>
              <td style="${tdStyle()}">${row.contagem}</td>
              <td style="${tdStyle()}">${row.frequencia_relativa.toFixed(4)}</td>
              <td style="${tdStyle()}">${(row.frequencia_relativa * 100).toFixed(2)}%</td>
            </tr>
          `).join('')}
          <tr style="background:var(--surface-hover);font-weight:bold;">
            <td style="${tdStyle()}" colspan="2">TOTAL</td>
            <td style="${tdStyle()}">${d.n}</td>
            <td style="${tdStyle()}">1.0000</td>
            <td style="${tdStyle()}">100.00%</td>
          </tr>
        </tbody>
      </table>
    </div>
  ` : '';

  // Carta de controle
  const statusControle = d.pontos_fora_controle > 0
    ? `<span style="color:var(--danger);font-weight:bold;">${d.pontos_fora_controle} ponto(s) fora de controle — investigar causa especial</span>`
    : `<span style="color:var(--primary);font-weight:bold;">processo sob controle estatístico</span>`;

  const cartaHtml = `
    <div class="card" style="margin-bottom:1.5rem;">
      <h3 style="margin-bottom:0.5rem;">Carta de Controle (valores individuais)</h3>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">
        LSC = x̄ + 3S · LC = x̄ · LIC = x̄ − 3S — ${statusControle}
      </p>
      <canvas id="cepCarta" style="max-height:340px;"></canvas>
    </div>
  `;

  // Histograma
  const histogramaHtml = `
    <div class="card" style="margin-bottom:1.5rem;">
      <h3 style="margin-bottom:0.5rem;">Histograma</h3>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">
        Interpretação: <strong>${d.interpretacao}</strong>
      </p>
      <canvas id="cepHistograma" style="max-height:320px;"></canvas>
    </div>
  `;

  resultado.innerHTML = statsHtml + cartaHtml + tabelaHtml + histogramaHtml;
  renderCartaControle(d);
  renderHistograma(d.tabela_frequencias);
}

function statCard(label, valor, sufixo, cor = 'var(--primary)') {
  const fmt = typeof valor === 'number' ? valor.toFixed(2) : valor;
  return `
    <div class="card" style="text-align:center;padding:1rem;">
      <div style="font-size:1.4rem;font-weight:bold;color:${cor};">${fmt}${sufixo}</div>
      <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.25rem;">${label}</div>
    </div>
  `;
}

function thStyle() {
  return 'padding:0.6rem 1rem;text-align:center;font-size:0.82rem;white-space:nowrap;';
}

function tdStyle() {
  return 'padding:0.5rem 1rem;text-align:center;';
}

function renderCartaControle(d) {
  const dados = d.dados_brutos || [];
  if (!dados.length) return;

  if (cepCartaInstance) {
    cepCartaInstance.destroy();
    cepCartaInstance = null;
  }

  const valores = dados.map(m => parseFloat(m.quantidade));
  const labels = dados.map((m, i) => {
    const dt = m.data ? new Date(m.data) : null;
    return dt ? dt.toLocaleDateString('pt-BR') : String(i + 1);
  });

  // Pontos fora dos limites destacados em vermelho
  const coresPontos = valores.map(v =>
    (v > d.lsc || v < d.lic) ? 'rgba(220, 53, 69, 1)' : 'rgba(46, 160, 67, 1)'
  );
  const raioPontos = valores.map(v =>
    (v > d.lsc || v < d.lic) ? 5 : 2.5
  );

  const linhaConstante = (valor, cor, dash, label) => ({
    label,
    data: valores.map(() => valor),
    borderColor: cor,
    borderWidth: 1.5,
    borderDash: dash,
    pointRadius: 0,
    fill: false,
  });

  const ctx = document.getElementById('cepCarta').getContext('2d');
  cepCartaInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Quantidade',
          data: valores,
          borderColor: 'rgba(120, 140, 160, 0.9)',
          backgroundColor: 'rgba(120, 140, 160, 0.1)',
          borderWidth: 1.5,
          pointBackgroundColor: coresPontos,
          pointBorderColor: coresPontos,
          pointRadius: raioPontos,
          tension: 0.1,
          fill: false,
        },
        linhaConstante(d.lsc, 'rgba(220, 53, 69, 0.9)', [6, 4], 'LSC'),
        linhaConstante(d.lc, 'rgba(46, 160, 67, 0.9)', [], 'LC (média)'),
        linhaConstante(d.lic, 'rgba(220, 53, 69, 0.9)', [6, 4], 'LIC'),
      ],
    },
    options: {
      responsive: true,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              const v = valores[items[0].dataIndex];
              if (v > d.lsc || v < d.lic) return '⚠️ Fora de controle';
              return '';
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Movimentação (ordem temporal)' },
          ticks: { maxTicksLimit: 12, font: { size: 10 } },
        },
        y: {
          title: { display: true, text: 'Quantidade' },
        },
      },
    },
  });
}

// =====================================================
// ABA OPERAÇÃO — KPIs e cartas X-R / P / C (seções 4.3–5.4)
// =====================================================

async function executarAnaliseOperacao() {
  const periodo = document.getElementById('cepOpPeriodoSelect').value;
  const resultado = document.getElementById('cepOperacaoResultado');
  resultado.innerHTML = '<div class="spinner-center"><div class="spinner"></div></div>';

  try {
    const d = await Api.get(`/cep/operacao?periodo=${periodo}`);

    if (!d || d.status !== 'sucesso') {
      resultado.innerHTML = `<div class="card"><p style="color:var(--danger);">Erro ao carregar dados operacionais.</p></div>`;
      return;
    }
    if (d.n === 0) {
      resultado.innerHTML = `<div class="card"><p style="color:var(--text-muted);">${d.mensagem}</p></div>`;
      return;
    }
    renderResultadoOperacao(d);
  } catch (e) {
    resultado.innerHTML = `<div class="card"><p style="color:var(--danger);">Erro: ${e.message}</p></div>`;
  }
}

function statusLinha(pontos) {
  const fora = (pontos || []).filter(p => p.fora_controle).length;
  return fora > 0
    ? `<span style="color:var(--danger);font-weight:bold;">${fora} ponto(s) fora de controle</span>`
    : `<span style="color:var(--primary);font-weight:bold;">processo sob controle</span>`;
}

function renderResultadoOperacao(d) {
  const resultado = document.getElementById('cepOperacaoResultado');

  // Destruir instâncias anteriores
  [cepEntregaInstance, cepAceiteInstance, cepXbarInstance, cepRInstance, cepPInstance, cepCInstance]
    .forEach(inst => { if (inst) inst.destroy(); });
  cepEntregaInstance = cepAceiteInstance = cepXbarInstance = cepRInstance = cepPInstance = cepCInstance = null;

  const kpisHtml = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:1rem;margin-bottom:1.5rem;">
      ${statCard('Taxa de Conversão', d.kpis.taxa_conversao, '%')}
      ${statCard('NPS', d.kpis.nps, '', d.kpis.nps >= 50 ? 'var(--primary)' : 'var(--danger)')}
      ${statCard('TMR (suporte)', d.kpis.tmr, ' min')}
      ${statCard('Total de pedidos', d.kpis.total_pedidos, '')}
    </div>
  `;

  const cardChart = (titulo, formula, status, canvasId, canvasId2) => `
    <div class="card" style="margin-bottom:1.5rem;">
      <h3 style="margin-bottom:0.5rem;">${titulo}</h3>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">${formula}${status ? ' — ' + status : ''}</p>
      <canvas id="${canvasId}" style="max-height:320px;"></canvas>
      ${canvasId2 ? `<canvas id="${canvasId2}" style="max-height:300px;margin-top:1rem;"></canvas>` : ''}
    </div>
  `;

  let html = kpisHtml;

  // 5.1 — Entrega e Aceite (I-charts)
  html += cardChart(
    '5.1 Tempo de Entrega e Aceite — Carta de Valores Individuais',
    'LSC = x̄ + 3S · LC = x̄ · LIC = x̄ − 3S (entrega: ' + statusLinha(d.entrega.pontos) + ' · aceite: ' + statusLinha(d.aceite.pontos) + ')',
    '', 'cepEntrega', 'cepAceite'
  );

  // 5.2 — Preparo (X-R)
  if (d.preparo) {
    html += cardChart(
      '5.2 Tempo de Preparo e Embalagem — Carta X-R',
      `n=${d.preparo.n} · X̿=${d.preparo.xBarBar.toFixed(2)} · R̄=${d.preparo.rBar.toFixed(2)} (X̄: ${statusLinha(d.preparo.xbar.pontos)} · R: ${statusLinha(d.preparo.r.pontos)})`,
      '', 'cepXbar', 'cepR'
    );
  }

  // 5.3 — Avarias (P)
  if (d.avarias) {
    html += cardChart(
      '5.3 Taxa de Produtos Avariados — Carta P',
      `LSC = p̄ + 3√[p̄(1−p̄)/n] · p̄=${(d.avarias.pBar * 100).toFixed(2)}% — ${statusLinha(d.avarias.pontos)}`,
      '', 'cepP'
    );
  }

  // 5.4 — Ruptura (C)
  if (d.ruptura) {
    html += cardChart(
      '5.4 Índice de Ruptura de Estoque — Carta C',
      `LSC = c̄ + 3√c̄ · c̄=${d.ruptura.cBar.toFixed(2)} — ${statusLinha(d.ruptura.pontos)}`,
      '', 'cepC'
    );
  }

  resultado.innerHTML = html;

  // Construir gráficos
  cepEntregaInstance = construirIChart('cepEntrega', d.entrega, { serieLabel: 'Tempo de entrega (min)', xLabel: 'Pedido (ordem temporal)', yLabel: 'Minutos' });
  cepAceiteInstance = construirIChart('cepAceite', d.aceite, { serieLabel: 'Tempo de aceite (min)', xLabel: 'Pedido (ordem temporal)', yLabel: 'Minutos' });
  if (d.preparo) {
    cepXbarInstance = construirIChart('cepXbar', d.preparo.xbar, { serieLabel: 'Média do subgrupo (X̄)', xLabel: 'Semana', yLabel: 'Minutos' });
    cepRInstance = construirIChart('cepR', d.preparo.r, { serieLabel: 'Amplitude do subgrupo (R)', xLabel: 'Semana', yLabel: 'Minutos' });
  }
  if (d.avarias) cepPInstance = construirPChart('cepP', d.avarias);
  if (d.ruptura) cepCInstance = construirIChart('cepC', d.ruptura, { serieLabel: 'Rupturas na semana', xLabel: 'Semana', yLabel: 'Ocorrências', yInteger: true });
}

// Builder genérico de carta com limites constantes (I, X̄, R, C)
function construirIChart(canvasId, serie, opts) {
  const valores = serie.pontos.map(p => p.valor);
  const labels = serie.pontos.map((p, i) => p.rotulo || String(i + 1));
  const cores = serie.pontos.map(p => (p.fora_controle ? 'rgba(220,53,69,1)' : 'rgba(46,160,67,1)'));
  const raios = serie.pontos.map(p => (p.fora_controle ? 5 : 2.5));

  const linhaConstante = (valor, cor, dash, label) => ({
    label, data: valores.map(() => valor), borderColor: cor,
    borderWidth: 1.5, borderDash: dash, pointRadius: 0, fill: false,
  });

  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: opts.serieLabel,
          data: valores,
          borderColor: 'rgba(120,140,160,0.9)',
          borderWidth: 1.5,
          pointBackgroundColor: cores,
          pointBorderColor: cores,
          pointRadius: raios,
          tension: 0.1,
          fill: false,
        },
        linhaConstante(serie.lsc, 'rgba(220,53,69,0.9)', [6, 4], 'LSC'),
        linhaConstante(serie.lc, 'rgba(46,160,67,0.9)', [], 'LC'),
        linhaConstante(serie.lic, 'rgba(220,53,69,0.9)', [6, 4], 'LIC'),
      ],
    },
    options: {
      responsive: true,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        x: { title: { display: true, text: opts.xLabel }, ticks: { maxTicksLimit: 12, font: { size: 10 } } },
        y: { title: { display: true, text: opts.yLabel }, ...(opts.yInteger ? { ticks: { stepSize: 1 }, beginAtZero: true } : {}) },
      },
    },
  });
}

// Builder da carta P (limites variáveis por ponto, eixo em %)
function construirPChart(canvasId, avarias) {
  const pts = avarias.pontos;
  const labels = pts.map(p => p.rotulo);
  const cores = pts.map(p => (p.fora_controle ? 'rgba(220,53,69,1)' : 'rgba(46,160,67,1)'));
  const raios = pts.map(p => (p.fora_controle ? 5 : 3));

  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Fração defeituosa (p)',
          data: pts.map(p => p.valor),
          borderColor: 'rgba(120,140,160,0.9)',
          borderWidth: 1.5,
          pointBackgroundColor: cores,
          pointBorderColor: cores,
          pointRadius: raios,
          tension: 0.1,
          fill: false,
        },
        { label: 'LSC', data: pts.map(p => p.lsc), borderColor: 'rgba(220,53,69,0.9)', borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, stepped: true, fill: false },
        { label: 'LC (p̄)', data: pts.map(p => p.lc), borderColor: 'rgba(46,160,67,0.9)', borderWidth: 1.5, pointRadius: 0, fill: false },
        { label: 'LIC', data: pts.map(p => p.lic), borderColor: 'rgba(220,53,69,0.9)', borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, stepped: true, fill: false },
      ],
    },
    options: {
      responsive: true,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${(ctx.parsed.y * 100).toFixed(2)}%` } },
      },
      scales: {
        x: { title: { display: true, text: 'Semana' } },
        y: { title: { display: true, text: 'Fração defeituosa' }, beginAtZero: true, ticks: { callback: v => (v * 100).toFixed(0) + '%' } },
      },
    },
  });
}

function renderHistograma(tabela) {
  if (!tabela.length) return;

  if (cepChartInstance) {
    cepChartInstance.destroy();
    cepChartInstance = null;
  }

  const ctx = document.getElementById('cepHistograma').getContext('2d');
  cepChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: tabela.map(t => t.intervalo),
      datasets: [{
        label: 'Frequência (f)',
        data: tabela.map(t => t.contagem),
        backgroundColor: 'rgba(46, 160, 67, 0.7)',
        borderColor: 'rgba(46, 160, 67, 1)',
        borderWidth: 1,
        borderRadius: 2,
        categoryPercentage: 1.0,
        barPercentage: 0.97,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` f = ${ctx.parsed.y}`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Intervalo de classe' },
          ticks: { maxRotation: 35, font: { size: 11 } },
        },
        y: {
          title: { display: true, text: 'Frequência' },
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
      },
    },
  });
}
