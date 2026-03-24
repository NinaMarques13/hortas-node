// ============================================================
// 📄 Profile Page — Visualizar e editar perfil com privacidade
// ============================================================

async function renderProfile() {
  const container = getPageContainer();

  container.innerHTML = `
    <div class="page-container" style="max-width:640px;">
      <div class="page-header">
        <h2>👤 Meu Perfil</h2>
        <p>Visualize e edite seus dados. Controle quais informações são públicas.</p>
      </div>
      <div class="card" id="profileCard">
        <div class="spinner-center"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  const res = await Api.get('/auth/me');

  if (!res || !res._ok) {
    document.getElementById('profileCard').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Erro ao carregar perfil</h3>
        <p>${res?.mensagem || 'Erro de conexão'}</p>
      </div>
    `;
    return;
  }

  const p = res.produtor;
  Auth.setUser(p);

  document.getElementById('profileCard').innerHTML = `
    <form id="profileForm">
      <div class="form-section-title">Informações Pessoais</div>

      <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
        <div class="sidebar-avatar" style="width:56px;height:56px;font-size:1.2rem;">
          ${(p.nome_produtor || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style="font-size:1.1rem; font-weight:700;">${p.nome_produtor}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">ID: #${p.id_produtor}</div>
        </div>
      </div>

      <div class="form-group">
        <label>Nome <span class="required">*</span></label>
        <input type="text" class="form-control" id="pf-nome" value="${p.nome_produtor || ''}" required />
      </div>
      <div class="form-group">
        <label>E-mail <span class="required">*</span></label>
        <input type="email" class="form-control" id="pf-email" value="${p.email_produtor || ''}" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Telefone</label>
          <input type="text" class="form-control" id="pf-tel" value="${p.telefone_produtor || ''}" />
        </div>
        <div class="form-group">
          <label>CPF</label>
          <input type="text" class="form-control" value="${p.nr_cpf || ''}" disabled style="opacity:0.5;" />
        </div>
      </div>

      <div class="form-divider"></div>
      <div class="form-section-title">💰 Pagamento & Contato</div>

      <div class="form-group">
        <label>Chave PIX</label>
        <input type="text" class="form-control" id="pf-pix" value="${p.chave_pix || ''}" placeholder="CPF, e-mail, telefone ou chave aleatória" />
      </div>
      <div class="form-group">
        <label>Endereço de Contato</label>
        <input type="text" class="form-control" id="pf-endereco" value="${p.endereco_produtor || ''}" placeholder="Rua, número, bairro, cidade..." />
      </div>

      <div class="form-divider"></div>
      <div class="form-section-title">🔒 Privacidade — Informações Públicas</div>
      <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:14px;">
        Escolha quais informações outros produtores podem ver ao visitar suas hortas.
      </p>

      <div class="privacy-toggles">
        <label class="toggle-row">
          <input type="checkbox" id="pf-exibir-tel" ${p.exibir_telefone ? 'checked' : ''} />
          <span class="toggle-label">📞 Exibir telefone publicamente</span>
        </label>
        <label class="toggle-row">
          <input type="checkbox" id="pf-exibir-end" ${p.exibir_endereco ? 'checked' : ''} />
          <span class="toggle-label">📍 Exibir endereço publicamente</span>
        </label>
        <label class="toggle-row">
          <input type="checkbox" id="pf-exibir-pix" ${p.exibir_pix ? 'checked' : ''} />
          <span class="toggle-label">💰 Exibir chave PIX publicamente</span>
        </label>
      </div>

      <div class="form-divider"></div>
      <button type="submit" class="btn btn-primary btn-block" id="pfBtn">Salvar Alterações</button>
      <div id="pfToast" style="margin-top:12px;"></div>
    </form>
  `;

  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('pfBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Salvando...';

    const data = await Api.put('/auth/profile', {
      nome_produtor: document.getElementById('pf-nome').value.trim(),
      email_produtor: document.getElementById('pf-email').value.trim(),
      telefone_produtor: document.getElementById('pf-tel').value.trim(),
      chave_pix: document.getElementById('pf-pix').value.trim(),
      endereco_produtor: document.getElementById('pf-endereco').value.trim(),
      exibir_telefone: document.getElementById('pf-exibir-tel').checked ? 1 : 0,
      exibir_endereco: document.getElementById('pf-exibir-end').checked ? 1 : 0,
      exibir_pix: document.getElementById('pf-exibir-pix').checked ? 1 : 0,
    });

    if (data && data._ok) {
      showToast('Perfil atualizado!', 'success');
      const me = await Api.get('/auth/me');
      if (me && me._ok) Auth.setUser(me.produtor);
      updateSidebarUser();
    } else {
      showToast(data?.mensagem || 'Erro ao salvar', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Salvar Alterações';
  });
}
