// ============================================================
// 📄 Register Page
// ============================================================

function renderRegister() {
  const container = document.getElementById('app');
  container.innerHTML = `
    <div class="auth-layout">
      <div class="auth-container" style="max-width:520px;">
        <div class="auth-logo">
          <h1>🌱 Hortas</h1>
          <p>Crie sua conta de produtor</p>
        </div>
        <div class="card">
          <form id="registerForm">
            <div class="form-section-title">Dados do Produtor</div>
            <div class="form-group">
              <label for="reg-nome">Nome completo <span class="required">*</span></label>
              <input type="text" id="reg-nome" class="form-control" placeholder="Seu nome" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="reg-cpf">CPF <span class="required">*</span></label>
                <input type="text" id="reg-cpf" class="form-control" placeholder="00000000000" maxlength="11" required />
              </div>
              <div class="form-group">
                <label for="reg-telefone">Telefone</label>
                <input type="text" id="reg-telefone" class="form-control" placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div class="form-group">
              <label for="reg-email">E-mail <span class="required">*</span></label>
              <input type="email" id="reg-email" class="form-control" placeholder="seu@email.com" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="reg-senha">Senha <span class="required">*</span></label>
                <input type="password" id="reg-senha" class="form-control" placeholder="••••••••" required />
              </div>
              <div class="form-group">
                <label for="reg-senha2">Confirmar Senha <span class="required">*</span></label>
                <input type="password" id="reg-senha2" class="form-control" placeholder="••••••••" required />
              </div>
            </div>
            <div class="form-divider"></div>
            <div class="form-section-title">Perguntas de Segurança</div>
            <div class="form-group">
              <label for="reg-p1">Pergunta 1 <span class="required">*</span></label>
              <input type="text" id="reg-p1" class="form-control" placeholder="Ex: Qual o nome do seu primeiro pet?" required />
            </div>
            <div class="form-group">
              <label for="reg-r1">Resposta 1 <span class="required">*</span></label>
              <input type="text" id="reg-r1" class="form-control" placeholder="Sua resposta" required />
            </div>
            <div class="form-group">
              <label for="reg-p2">Pergunta 2 <span class="required">*</span></label>
              <input type="text" id="reg-p2" class="form-control" placeholder="Ex: Qual a sua cidade natal?" required />
            </div>
            <div class="form-group">
              <label for="reg-r2">Resposta 2 <span class="required">*</span></label>
              <input type="text" id="reg-r2" class="form-control" placeholder="Sua resposta" required />
            </div>
            <div class="form-divider"></div>
            <button type="submit" class="btn btn-primary btn-block btn-lg" id="regBtn">
              Criar Conta
            </button>
            <div id="regToast" style="margin-top:14px;"></div>
          </form>
        </div>
        <div class="auth-footer">
          Já tem conta? <a href="#/login">Entrar</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('regBtn');
    const toast = document.getElementById('regToast');

    const senha = document.getElementById('reg-senha').value;
    const senha2 = document.getElementById('reg-senha2').value;

    if (senha !== senha2) {
      toast.innerHTML = '<div class="toast toast-error">As senhas não coincidem.</div>';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Criando...';

    const data = await Api.post('/auth/register', {
      nome_produtor: document.getElementById('reg-nome').value.trim(),
      nr_cpf: document.getElementById('reg-cpf').value.trim(),
      email_produtor: document.getElementById('reg-email').value.trim(),
      telefone_produtor: document.getElementById('reg-telefone').value.trim(),
      senha,
      pergunta_1: document.getElementById('reg-p1').value.trim(),
      resposta_1: document.getElementById('reg-r1').value.trim(),
      pergunta_2: document.getElementById('reg-p2').value.trim(),
      resposta_2: document.getElementById('reg-r2').value.trim(),
    });

    if (data && data._ok) {
      toast.innerHTML = '<div class="toast toast-success">✅ Conta criada com sucesso! Redirecionando...</div>';
      setTimeout(() => { window.location.hash = '#/login'; }, 1500);
    } else {
      toast.innerHTML = `<div class="toast toast-error">${data?.mensagem || 'Erro ao cadastrar'}</div>`;
      btn.disabled = false;
      btn.textContent = 'Criar Conta';
    }
  });
}
