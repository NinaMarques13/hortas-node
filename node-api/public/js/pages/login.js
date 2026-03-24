// ============================================================
// 📄 Login Page
// ============================================================

function renderLogin() {
  const container = document.getElementById('app');
  container.innerHTML = `
    <div class="auth-layout">
      <div class="auth-container">
        <div class="auth-logo">
          <h1>🌱 Hortas</h1>
          <p>Marketplace de hortas urbanas</p>
        </div>
        <div class="card">
          <form id="loginForm">
            <div class="form-section-title">Entrar na sua conta</div>
            <div class="form-group">
              <label for="login-email">E-mail <span class="required">*</span></label>
              <input type="email" id="login-email" class="form-control" placeholder="seu@email.com" required />
            </div>
            <div class="form-group">
              <label for="login-senha">Senha <span class="required">*</span></label>
              <input type="password" id="login-senha" class="form-control" placeholder="••••••••" required />
            </div>
            <button type="submit" class="btn btn-primary btn-block btn-lg" id="loginBtn">
              Entrar
            </button>
            <div id="loginToast" style="margin-top:14px;"></div>
          </form>
        </div>
        <div class="auth-footer">
          <a href="#/forgot-password">Esqueci minha senha</a> &nbsp;·&nbsp; 
          <a href="#/register">Criar conta</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const toast = document.getElementById('loginToast');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Entrando...';

    const data = await Api.post('/auth/login', {
      email: document.getElementById('login-email').value.trim(),
      senha: document.getElementById('login-senha').value,
    });

    if (data && data._ok) {
      Auth.setToken(data.token);
      Auth.setUser({ id: data.id, nome: data.nome || '' });
      // Fetch user profile
      const me = await Api.get('/auth/me');
      if (me && me._ok) Auth.setUser(me.produtor);
      window.location.hash = '#/dashboard';
    } else {
      toast.innerHTML = `<div class="toast toast-error">${data?.mensagem || 'Erro ao fazer login'}</div>`;
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}
