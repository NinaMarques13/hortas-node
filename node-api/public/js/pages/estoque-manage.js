// ============================================================
// 📄 Estoque Management — CRUD por Horta (com permissões)
// ============================================================

let currentHortaId = null;
let currentHortaOwner = null;
let allEstoques = [];
let allProdutos = [];

function isHortaOwner() {
  const user = Auth.getUser();
  return user && currentHortaOwner && user.id_produtor === currentHortaOwner;
}

async function renderEstoqueManage(params) {
  currentHortaId = params.id;
  currentHortaOwner = null;
  const container = getPageContainer();

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:4px;">
          <a href="#/dashboard" class="btn btn-ghost btn-sm">← Voltar</a>
          <h2 id="estoqueTitle">📦 Estoque</h2>
        </div>
        <p id="estoqueSubtitle">Carregando...</p>
      </div>

      <div id="ownerBadge" style="margin-bottom:16px;"></div>

      <div class="stats-grid" id="estoqueStats">
        <div class="stat-card">
          <div class="stat-label">Itens no Estoque</div>
          <div class="stat-value green" id="statItens">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Quantidade Total</div>
          <div class="stat-value blue" id="statQtd">—</div>
        </div>
      </div>

      <div class="table-toolbar">
        <div class="table-search">
          <input type="text" id="estoqueSearch" placeholder="Buscar produto..." />
        </div>
        <div id="estoqueAddBtn"></div>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Unidade</th>
              <th>Validade</th>
              <th>Colheita</th>
              <th>Plantio</th>
              <th id="thAcoes" style="display:none;">Ações</th>
            </tr>
          </thead>
          <tbody id="estoqueTableBody">
            <tr><td colspan="8" style="text-align:center;padding:24px;">Carregando...</td></tr>
          </tbody>
        </table>
      </div>

      <div id="estoqueModalContainer"></div>
    </div>
  `;

  // Get horta info + determine ownership
  const hortaRes = await Api.get(`/hortas/${currentHortaId}`);
  if (hortaRes && hortaRes._ok && hortaRes.horta) {
    currentHortaOwner = hortaRes.horta.produtor_id_produtor;
    document.getElementById('estoqueTitle').textContent = `📦 Estoque — ${hortaRes.horta.nome}`;

    const ownerName = hortaRes.horta.nome_produtor || 'Desconhecido';
    const location = [hortaRes.horta.nm_bairro, hortaRes.horta.nm_cidade].filter(Boolean).join(', ');

    if (isHortaOwner()) {
      document.getElementById('estoqueSubtitle').textContent = `${location} · Gerencie os produtos da sua horta.`;
      document.getElementById('ownerBadge').innerHTML = '<span class="badge badge-green">🔓 Sua horta — acesso total</span>';
      document.getElementById('estoqueAddBtn').innerHTML = '<button class="btn btn-primary btn-sm" onclick="openEstoqueModal()">+ Novo Lote</button>';
      document.getElementById('thAcoes').style.display = '';
    } else {
      document.getElementById('estoqueSubtitle').textContent = `${location} · Produtor: ${ownerName} · Visualização somente leitura.`;
      document.getElementById('ownerBadge').innerHTML = '<span class="badge badge-yellow">🔒 Horta de outro produtor — somente visualização</span>';

      // Show contact info (respecting privacy)
      const h = hortaRes.horta;
      const contactItems = [];

      if (h.exibir_telefone && h.telefone_produtor) {
        contactItems.push(`<div class="contact-item"><span class="contact-icon">📞</span><span class="contact-value">${h.telefone_produtor}</span></div>`);
      }
      if (h.exibir_endereco && h.endereco_produtor) {
        contactItems.push(`<div class="contact-item"><span class="contact-icon">📍</span><span class="contact-value">${h.endereco_produtor}</span></div>`);
      }
      if (h.exibir_pix && h.chave_pix) {
        contactItems.push(`<div class="contact-item"><span class="contact-icon">💰</span><span>PIX:</span> <span class="contact-value">${h.chave_pix}</span></div>`);
      }

      if (contactItems.length > 0) {
        document.getElementById('ownerBadge').innerHTML += `
          <div class="contact-card" style="margin-top:14px;">
            <div class="contact-card-title">📋 Informações de contato do produtor</div>
            <div class="contact-items">
              ${contactItems.join('')}
            </div>
          </div>
        `;
      }
    }
  }

  // Load products catalog for select
  const prodRes = await Api.get('/produtos');
  allProdutos = Array.isArray(prodRes) ? prodRes : [];

  await loadEstoques();
}

async function loadEstoques() {
  const res = await Api.get(`/estoques/horta/${currentHortaId}`);
  allEstoques = res?.estoques || [];

  // Stats
  document.getElementById('statItens').textContent = allEstoques.length;
  const totalQtd = allEstoques.reduce((sum, e) => sum + parseFloat(e.ds_quantidade || 0), 0);
  document.getElementById('statQtd').textContent = totalQtd.toLocaleString('pt-BR');

  renderEstoqueTable(allEstoques);

  // Search
  const searchEl = document.getElementById('estoqueSearch');
  if (searchEl) {
    searchEl.oninput = (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = allEstoques.filter(es =>
        (es.nm_produto || '').toLowerCase().includes(q)
      );
      renderEstoqueTable(filtered);
    };
  }
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function renderEstoqueTable(estoques) {
  const tbody = document.getElementById('estoqueTableBody');
  const owner = isHortaOwner();
  const cols = owner ? 8 : 7;

  if (!estoques.length) {
    tbody.innerHTML = `<tr><td colspan="${cols}">
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>Estoque vazio</h3>
        <p>${owner ? 'Adicione lotes de produtos ao estoque desta horta.' : 'Nenhum produto cadastrado nesta horta.'}</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = estoques.map(es => `
    <tr>
      <td><strong>#${es.id_estoques}</strong></td>
      <td>${es.nm_produto || `Produto #${es.id_produto}`}</td>
      <td><span class="badge badge-green">${parseFloat(es.ds_quantidade || 0).toLocaleString('pt-BR')}</span></td>
      <td>${es.unidade_medida_padrao || '—'}</td>
      <td>${formatDate(es.dt_validade)}</td>
      <td>${formatDate(es.dt_colheita)}</td>
      <td>${formatDate(es.dt_plantio)}</td>
      ${owner ? `<td>
        <div class="table-actions">
          <button class="btn btn-danger btn-sm" onclick="deleteEstoque(${es.id_estoques}, ${es.id_produto})">🗑️</button>
        </div>
      </td>` : ''}
    </tr>
  `).join('');
}

async function openEstoqueModal() {
  if (!isHortaOwner()) {
    showToast('Você não tem permissão para adicionar estoque nesta horta.', 'error');
    return;
  }

  const mc = document.getElementById('estoqueModalContainer');

  const prodOptions = allProdutos.map(p =>
    `<option value="${p.id_produto}">${p.nm_produto} (${p.unidade_medida_padrao})</option>`
  ).join('');

  mc.innerHTML = `
    <div class="modal-overlay" id="estoqueOverlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>📦 Novo Lote no Estoque</h3>
          <button class="modal-close" onclick="closeEstoqueModal()">✕</button>
        </div>
        <form id="estoqueForm">
          <div class="modal-body">
            <div class="form-group">
              <label>Produto <span class="required">*</span></label>
              <select class="form-control" id="ef-produto" required>
                <option value="">Selecione um produto...</option>
                ${prodOptions}
              </select>
            </div>
            <div class="form-group">
              <label>Quantidade <span class="required">*</span></label>
              <input type="number" step="0.01" class="form-control" id="ef-qtd" placeholder="Ex: 100" required />
            </div>
            <div class="form-divider"></div>
            <div class="form-section-title">Datas (opcionais)</div>
            <div class="form-group">
              <label>Validade</label>
              <input type="date" class="form-control" id="ef-val" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Colheita</label>
                <input type="date" class="form-control" id="ef-col" />
              </div>
              <div class="form-group">
                <label>Plantio</label>
                <input type="date" class="form-control" id="ef-pla" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeEstoqueModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="efBtn">Cadastrar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('estoqueOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeEstoqueModal();
  });

  document.getElementById('estoqueForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('efBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    const data = await Api.post('/estoques', {
      hortas_id_hortas: currentHortaId,
      produto_id_produto: document.getElementById('ef-produto').value,
      ds_quantidade: document.getElementById('ef-qtd').value,
      dt_validade: document.getElementById('ef-val').value || null,
      dt_colheita: document.getElementById('ef-col').value || null,
      dt_plantio: document.getElementById('ef-pla').value || null,
    });

    if (data && data._ok) {
      showToast('Lote cadastrado com sucesso!', 'success');
      closeEstoqueModal();
      await loadEstoques();
    } else {
      showToast(data?.mensagem || 'Erro ao cadastrar lote', 'error');
      btn.disabled = false;
      btn.textContent = 'Cadastrar';
    }
  });
}

function closeEstoqueModal() {
  const mc = document.getElementById('estoqueModalContainer');
  if (mc) mc.innerHTML = '';
}

async function deleteEstoque(idEstoque, idProduto) {
  if (!isHortaOwner()) {
    showToast('Você não tem permissão para excluir estoque desta horta.', 'error');
    return;
  }

  if (!confirm('Tem certeza que deseja excluir este lote do estoque?')) return;

  const data = await Api.delete(`/estoques/${idProduto}`);
  if (data && data._ok) {
    showToast('Lote excluído com sucesso!', 'success');
    await loadEstoques();
  } else {
    showToast(data?.mensagem || 'Erro ao excluir', 'error');
  }
}
