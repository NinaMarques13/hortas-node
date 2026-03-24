// ============================================================
// 📄 Hortas Management — CRUD completo
// ============================================================

async function renderHortasManage() {
  const container = getPageContainer();
  const user = Auth.getUser();

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>🌱 Gerenciar Hortas</h2>
        <p>Cadastre, edite e exclua suas hortas.</p>
      </div>

      <div class="table-toolbar">
        <div class="table-search">
          <input type="text" id="hortaSearch" placeholder="Buscar hortas..." />
        </div>
        <button class="btn btn-primary btn-sm" onclick="openHortaModal()">+ Nova Horta</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Bairro</th>
              <th>Cidade</th>
              <th>CNPJ</th>
              <th>Visível</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="hortasTableBody">
            <tr><td colspan="7" style="text-align:center;padding:24px;">Carregando...</td></tr>
          </tbody>
        </table>
      </div>

      <div id="hortaModalContainer"></div>
    </div>
  `;

  await loadHortas();
}

let allHortas = [];

async function loadHortas() {
  const user = Auth.getUser();
  const res = await Api.get(`/hortas/produtor/${user?.id_produtor}`);
  const tbody = document.getElementById('hortasTableBody');

  // Also load all visible hortas for the producer
  const allRes = await Api.get('/hortas');
  const userHortas = (allRes?.hortas || []).filter(h => h.produtor_id_produtor === user?.id_produtor);

  // Merge data
  if (res && res._ok && res.horta) {
    allHortas = [res.horta];
    // Try to use all hortas from the general list for this producer
    if (userHortas.length > 0) {
      allHortas = userHortas;
    }
  } else {
    allHortas = userHortas;
  }

  renderHortasTable(allHortas);

  // Search
  const searchEl = document.getElementById('hortaSearch');
  if (searchEl) {
    searchEl.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = allHortas.filter(h =>
        (h.nome || '').toLowerCase().includes(q) ||
        (h.nm_bairro || '').toLowerCase().includes(q)
      );
      renderHortasTable(filtered);
    });
  }
}

function renderHortasTable(hortas) {
  const tbody = document.getElementById('hortasTableBody');

  if (!hortas.length) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <div class="empty-icon">🌿</div>
        <h3>Nenhuma horta cadastrada</h3>
        <p>Clique em "+ Nova Horta" para começar.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = hortas.map(h => `
    <tr>
      <td><strong>#${h.id_hortas}</strong></td>
      <td>${h.nome || '—'}</td>
      <td>${h.nm_bairro || '—'}</td>
      <td>${h.nm_cidade || '—'}</td>
      <td>${h.nr_cnpj || '—'}</td>
      <td>${h.visibilidade ? '<span class="badge badge-green">Sim</span>' : '<span class="badge badge-red">Não</span>'}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm" onclick="openHortaModal(${h.id_hortas})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteHorta(${h.id_hortas})">🗑️</button>
          <a href="#/hortas/estoque/${h.id_hortas}" class="btn btn-secondary btn-sm">📦</a>
        </div>
      </td>
    </tr>
  `).join('');
}

async function openHortaModal(id) {
  let horta = null;
  if (id) {
    const res = await Api.get(`/hortas/${id}`);
    if (res && res._ok) horta = res.horta;
  }

  const isEdit = !!horta;
  const mc = document.getElementById('hortaModalContainer');
  const user = Auth.getUser();

  mc.innerHTML = `
    <div class="modal-overlay" id="hortaOverlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${isEdit ? '✏️ Editar Horta' : '🌱 Nova Horta'}</h3>
          <button class="modal-close" onclick="closeHortaModal()">✕</button>
        </div>
        <form id="hortaForm">
          <div class="modal-body">
            <div class="form-group">
              <label>Nome da Horta <span class="required">*</span></label>
              <input type="text" class="form-control" id="hf-nome" value="${horta?.nome || ''}" required />
            </div>
            <div class="form-group">
              <label>Descrição</label>
              <input type="text" class="form-control" id="hf-desc" value="${horta?.descricao || ''}" maxlength="255" />
            </div>
            <div class="form-group">
              <label>CNPJ</label>
              <input type="text" class="form-control" id="hf-cnpj" value="${horta?.nr_cnpj || ''}" maxlength="14" />
            </div>
            <div class="form-divider"></div>
            <div class="form-section-title">Endereço</div>
            <div class="form-group">
              <label>Rua <span class="required">*</span></label>
              <input type="text" class="form-control" id="hf-rua" value="${horta?.nm_rua || ''}" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Bairro <span class="required">*</span></label>
                <input type="text" class="form-control" id="hf-bairro" value="${horta?.nm_bairro || ''}" required />
              </div>
              <div class="form-group">
                <label>CEP <span class="required">*</span></label>
                <input type="text" class="form-control" id="hf-cep" value="${horta?.nr_cep || ''}" maxlength="8" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Cidade <span class="required">*</span></label>
                <input type="text" class="form-control" id="hf-cidade" value="${horta?.nm_cidade || ''}" required />
              </div>
              <div class="form-group">
                <label>Estado <span class="required">*</span></label>
                <input type="text" class="form-control" id="hf-estado" value="${horta?.nm_estado || ''}" maxlength="2" required />
              </div>
            </div>
            <div class="form-group">
              <label>País</label>
              <input type="text" class="form-control" id="hf-pais" value="${horta?.nm_pais || 'Brasil'}" />
            </div>
            <div class="form-group">
              <label>Visibilidade</label>
              <select class="form-control" id="hf-vis">
                <option value="1" ${!horta || horta.visibilidade ? 'selected' : ''}>Visível</option>
                <option value="0" ${horta && !horta.visibilidade ? 'selected' : ''}>Oculta</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeHortaModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="hfBtn">${isEdit ? 'Salvar' : 'Cadastrar'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('hortaOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeHortaModal();
  });

  document.getElementById('hortaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('hfBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    const body = {
      nome_horta: document.getElementById('hf-nome').value.trim(),
      descricao: document.getElementById('hf-desc').value.trim(),
      cnpj: document.getElementById('hf-cnpj').value.trim(),
      rua: document.getElementById('hf-rua').value.trim(),
      bairro: document.getElementById('hf-bairro').value.trim(),
      cep: document.getElementById('hf-cep').value.trim(),
      cidade: document.getElementById('hf-cidade').value.trim(),
      estado: document.getElementById('hf-estado').value.trim(),
      pais: document.getElementById('hf-pais').value.trim() || 'Brasil',
      visibilidade: parseInt(document.getElementById('hf-vis').value),
      id_produtor: user?.id_produtor,
    };

    let data;
    if (isEdit) {
      data = await Api.put(`/hortas/${id}`, body);
    } else {
      data = await Api.post('/hortas', body);
    }

    if (data && data._ok) {
      showToast(data.mensagem || 'Operação realizada!', 'success');
      closeHortaModal();
      await loadHortas();
    } else {
      showToast(data?.mensagem || 'Erro na operação', 'error');
      btn.disabled = false;
      btn.textContent = isEdit ? 'Salvar' : 'Cadastrar';
    }
  });
}

function closeHortaModal() {
  const mc = document.getElementById('hortaModalContainer');
  if (mc) mc.innerHTML = '';
}

async function deleteHorta(id) {
  if (!confirm('Tem certeza que deseja excluir esta horta? Todos os estoques serão removidos.')) return;

  const data = await Api.delete(`/hortas/${id}`);
  if (data && data._ok) {
    showToast('Horta excluída com sucesso!', 'success');
    await loadHortas();
  } else {
    showToast(data?.mensagem || 'Erro ao excluir', 'error');
  }
}
