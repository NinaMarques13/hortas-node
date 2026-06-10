// =====================================================
// 📈 Página CEP — Controle Estatístico de Processos
// =====================================================

let cepChartInstance = null;
let cepCartaInstance = null;

async function renderCep() {
  const container = getPageContainer();

  container.innerHTML = `
    <div class="page-header">
      <h2>📈 Controle Estatístico de Processos</h2>
      <p class="page-subtitle">Análise estatística das movimentações de estoque por horta e produto</p>
    </div>

    <div class="card" style="margin-bottom:1.5rem;">
      <h3 style="margin-bottom:1rem;">Filtros</h3>
      <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end;">
        <div style="flex:1;min-width:180px;">
          <label class="form-label">Horta</label>
          <select id="cepHortaSelect" class="form-input">
            <option value="">Carregando...</option>
          </select>
        </div>
        <div style="flex:1;min-width:180px;">
          <label class="form-label">Produto (opcional)</label>
          <select id="cepProdutoSelect" class="form-input" disabled>
            <option value="">Todos os produtos</option>
          </select>
        </div>
        <div style="min-width:150px;">
          <label class="form-label">Período (dias)</label>
          <select id="cepPeriodoSelect" class="form-input">
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
  `;

  await carregarHortasCep();

  document.getElementById('cepHortaSelect').addEventListener('change', onHortaChange);
  document.getElementById('cepBtnAnalisar').addEventListener('click', executarAnalise);
}

async function carregarHortasCep() {
  try {
    const data = await Api.get('/api/hortas');
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
    const data = await Api.get(`/api/estoques/horta/${idHorta}`);
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
    let url = `/api/cep/horta/${idHorta}?periodo=${periodo}`;
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
          <tr style="background:var(--bg-hover);">
            <th style="${thStyle()}">Classe</th>
            <th style="${thStyle()}">Intervalo</th>
            <th style="${thStyle()}">Contagem (f)</th>
            <th style="${thStyle()}">Fr. Relativa (fr)</th>
            <th style="${thStyle()}">Fr. % </th>
          </tr>
        </thead>
        <tbody>
          ${d.tabela_frequencias.map(row => `
            <tr style="border-bottom:1px solid var(--border-color);">
              <td style="${tdStyle()}">${row.intervalo_classe}</td>
              <td style="${tdStyle()}">${row.intervalo}</td>
              <td style="${tdStyle()}">${row.contagem}</td>
              <td style="${tdStyle()}">${row.frequencia_relativa.toFixed(4)}</td>
              <td style="${tdStyle()}">${(row.frequencia_relativa * 100).toFixed(2)}%</td>
            </tr>
          `).join('')}
          <tr style="background:var(--bg-hover);font-weight:bold;">
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
