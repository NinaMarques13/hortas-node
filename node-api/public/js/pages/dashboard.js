// ============================================================
// 📄 Dashboard Page — Cards de Hortas & Produtos (com permissões)
// ============================================================

async function renderDashboard() {
  const container = getPageContainer();
  const user = Auth.getUser();

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>👋 Olá, ${user?.nome_produtor || 'Produtor'}!</h2>
        <p>Veja suas hortas e explore o marketplace.</p>
      </div>

      <div class="stats-grid" id="statsGrid">
        <div class="stat-card">
          <div class="stat-label">Minhas Hortas</div>
          <div class="stat-value green" id="statHortas">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Produtos no Catálogo</div>
          <div class="stat-value blue" id="statProdutos">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Hortas no Marketplace</div>
          <div class="stat-value green" id="statTotal">—</div>
        </div>
      </div>

      <div class="table-toolbar">
        <h3 style="font-size:1.1rem; font-weight:600;">🌱 Hortas Disponíveis</h3>
        <div class="table-search">
          <input type="text" id="dashSearch" placeholder="Buscar por nome ou bairro..." />
        </div>
      </div>

      <div class="cards-grid" id="hortasGrid">
        <div class="spinner-center"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  // Load data
  const [hortasRes, produtosRes] = await Promise.all([
    Api.get('/hortas'),
    Api.get('/produtos'),
  ]);

  const hortas = hortasRes?.hortas || [];
  const produtos = produtosRes || [];

  // Stats
  const minhas = hortas.filter(h => h.produtor_id_produtor === user?.id_produtor);
  document.getElementById('statHortas').textContent = minhas.length;
  document.getElementById('statProdutos').textContent = Array.isArray(produtos) ? produtos.length : 0;
  document.getElementById('statTotal').textContent = hortas.length;

  renderHortasCards(hortas, user);

  // Search
  document.getElementById('dashSearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = hortas.filter(h =>
      (h.nome || '').toLowerCase().includes(q) ||
      (h.nm_bairro || '').toLowerCase().includes(q) ||
      (h.nm_cidade || '').toLowerCase().includes(q)
    );
    renderHortasCards(filtered, user);
  });
}

function renderHortasCards(hortas, user) {
  const grid = document.getElementById('hortasGrid');

  if (!hortas.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-icon">🌿</div>
        <h3>Nenhuma horta encontrada</h3>
        <p>Cadastre uma horta para começar ou ajuste a busca.</p>
        <a href="#/hortas" class="btn btn-primary btn-sm" style="display:inline-flex;">+ Nova Horta</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = hortas.map(h => {
    const isMine = user && h.produtor_id_produtor === user.id_produtor;
    return `
    <div class="horta-card" onclick="window.location.hash='#/hortas/estoque/${h.id_hortas}'">
      <div class="horta-card-title">
        <span>🌱</span>
        <span>${h.nome || 'Sem nome'}</span>
        ${isMine ? '<span class="badge badge-green" style="margin-left:auto; font-size:0.6rem;">Sua</span>' : ''}
      </div>
      <div class="horta-card-desc">${h.descricao || 'Sem descrição disponível.'}</div>
      <div class="horta-card-meta">
        ${h.nm_bairro ? `<span class="meta-tag">📍 ${h.nm_bairro}${h.nm_cidade ? ', ' + h.nm_cidade : ''}</span>` : ''}
        ${h.nome_produtor ? `<span class="meta-tag ${isMine ? 'green' : ''}">👤 ${h.nome_produtor}</span>` : ''}
        ${!isMine ? '<span class="meta-tag">👁️ Visualizar</span>' : '<span class="meta-tag green">✏️ Gerenciar</span>'}
      </div>
    </div>
  `;
  }).join('');
}
