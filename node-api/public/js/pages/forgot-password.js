// ============================================================
// 📄 Forgot Password Page
// ============================================================

function renderForgotPassword() {
  const container = document.getElementById('app');
  container.innerHTML = `
    <div class="auth-layout">
      <div class="auth-container" style="max-width:480px;">
        <div class="auth-logo">
          <h1>🌱 Hortas</h1>
          <p>Recuperar sua senha</p>
        </div>
        <div class="card">
          <form id="forgotForm">
            <div class="form-section-title">Seus Dados</div>
            <div class="form-group">
              <label for="fp-email">E-mail cadastrado <span class="required">*</span></label>
              <input type="email" id="fp-email" class="form-control" placeholder="seu@email.com" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="fp-nova">Nova Senha <span class="required">*</span></label>
                <input type="password" id="fp-nova" class="form-control" placeholder="••••••••" required />
              </div>
              <div class="form-group">
                <label for="fp-conf">Confirmar <span class="required">*</span></label>
                <input type="password" id="fp-conf" class="form-control" placeholder="••••••••" required />
              </div>
            </div>
            <div class="form-divider"></div>
            <div class="form-section-title">Perguntas de Segurança</div>
            <div class="form-group">
              <label for="fp-p1">Pergunta 1 <span class="required">*</span></label>
              <input type="text" id="fp-p1" class="form-control" placeholder="A mesma pergunta cadastrada" required />
            </div>
            <div class="form-group">
              <label for="fp-r1">Resposta 1 <span class="required">*</span></label>
              <input type="text" id="fp-r1" class="form-control" placeholder="Sua resposta" required />
            </div>
            <div class="form-group">
              <label for="fp-p2">Pergunta 2 <span class="required">*</span></label>
              <input type="text" id="fp-p2" class="form-control" placeholder="A mesma pergunta cadastrada" required />
            </div>
            <div class="form-group">
              <label for="fp-r2">Resposta 2 <span class="required">*</span></label>
              <input type="text" id="fp-r2" class="form-control" placeholder="Sua resposta" required />
            </div>
            <div class="form-divider"></div>
            <button type="submit" class="btn btn-primary btn-block btn-lg" id="fpBtn">
              Redefinir Senha
            </button>
            <div id="fpToast" style="margin-top:14px;"></div>
          </form>
        </div>
        <div class="auth-footer">
          <a href="#/login">← Voltar ao login</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('forgotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('fpBtn');
    const toast = document.getElementById('fpToast');

    const novaSenha = document.getElementById('fp-nova').value;
    const confirmarSenha = document.getElementById('fp-conf').value;
    if (novaSenha !== confirmarSenha) {
      toast.innerHTML = '<div class="toast toast-error">As senhas não coincidem.</div>';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Processando...';

    const data = await Api.post('/auth/forgot-password', {
      email: document.getElementById('fp-email').value.trim(),
      novaSenha,
      confirmarSenha,
      pergunta1: document.getElementById('fp-p1').value.trim(),
      pergunta2: document.getElementById('fp-p2').value.trim(),
      resposta1: document.getElementById('fp-r1').value.trim(),
      resposta2: document.getElementById('fp-r2').value.trim(),
    });

    if (data && data.success) {
      toast.innerHTML = '<div class="toast toast-success">✅ Senha redefinida! Redirecionando...</div>';
      setTimeout(() => { window.location.hash = '#/login'; }, 1500);
    } else {
      toast.innerHTML = `<div class="toast toast-error">${data?.message || data?.mensagem || 'Erro ao redefinir'}</div>`;
      btn.disabled = false;
      btn.textContent = 'Redefinir Senha';
    }
  });
}
