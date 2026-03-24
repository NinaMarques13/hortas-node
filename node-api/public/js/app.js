// ============================================================
// 🚀 App — Bootstrapper & Layout
// ============================================================

// ── Toast system ──
function showToast(message, type = 'info') {
  let tc = document.getElementById('toastContainer');
  if (!tc) {
    tc = document.createElement('div');
    tc.id = 'toastContainer';
    tc.className = 'toast-container';
    document.body.appendChild(tc);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = (type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : 'ℹ️ ') + message;
  tc.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Get render target ──
function getPageContainer() {
  return document.getElementById('pageContent') || document.getElementById('app');
}

// ── Sidebar ──
function renderAppShell() {
  const app = document.getElementById('app');
  const user = Auth.getUser();

  app.innerHTML = `
    <button class="mobile-toggle" id="mobileToggle" onclick="toggleSidebar()">☰</button>
    <div class="app-layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <h1>🌱 Hortas</h1>
          <small>Marketplace</small>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-section-title">Principal</div>
          <a href="#/dashboard" class="nav-item" data-route="/dashboard">
            <span class="icon">📊</span> Dashboard
          </a>
          <div class="nav-section-title">Gestão</div>
          <a href="#/hortas" class="nav-item" data-route="/hortas">
            <span class="icon">🌱</span> Minhas Hortas
          </a>
          <div class="nav-section-title">Conta</div>
          <a href="#/profile" class="nav-item" data-route="/profile">
            <span class="icon">👤</span> Meu Perfil
          </a>
        </nav>
        <div class="sidebar-footer">
          <div class="sidebar-user" onclick="window.location.hash='#/profile'">
            <div class="sidebar-avatar" id="sidebarAvatar">
              ${(user?.nome_produtor || '?').charAt(0).toUpperCase()}
            </div>
            <div class="sidebar-user-info">
              <div class="sidebar-user-name" id="sidebarName">${user?.nome_produtor || 'Produtor'}</div>
              <div class="sidebar-user-email" id="sidebarEmail">${user?.email_produtor || ''}</div>
            </div>
          </div>
          <button class="btn-logout" onclick="Auth.logout()" style="margin-top:10px;">
            🚪 Sair
          </button>
        </div>
      </aside>
      <main class="main-content">
        <div id="pageContent">
          <div class="spinner-center"><div class="spinner"></div></div>
        </div>
      </main>
    </div>
  `;
}

function updateSidebarUser() {
  const user = Auth.getUser();
  const avatar = document.getElementById('sidebarAvatar');
  const name = document.getElementById('sidebarName');
  const email = document.getElementById('sidebarEmail');
  if (avatar) avatar.textContent = (user?.nome_produtor || '?').charAt(0).toUpperCase();
  if (name) name.textContent = user?.nome_produtor || 'Produtor';
  if (email) email.textContent = user?.email_produtor || '';
}

function updateActiveNav() {
  const hash = window.location.hash.slice(1) || '/dashboard';
  document.querySelectorAll('.nav-item').forEach(item => {
    const route = item.dataset.route;
    if (route && hash.startsWith(route)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

// ── Ensure app shell exists for authenticated pages ──
function ensureAppShell() {
  if (!document.getElementById('pageContent')) {
    renderAppShell();
  }
  updateActiveNav();
}

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => {
  Router
    .add('/login', () => renderLogin())
    .add('/register', () => renderRegister())
    .add('/forgot-password', () => renderForgotPassword())
    .add('/dashboard', () => { ensureAppShell(); renderDashboard(); }, { auth: true })
    .add('/hortas', () => { ensureAppShell(); renderHortasManage(); }, { auth: true })
    .add('/hortas/estoque/:id', (params) => { ensureAppShell(); renderEstoqueManage(params); }, { auth: true })
    .add('/profile', () => { ensureAppShell(); renderProfile(); }, { auth: true });

  Router.init('app');

  // Close sidebar on navigation (mobile)
  window.addEventListener('hashchange', () => {
    document.getElementById('sidebar')?.classList.remove('open');
    updateActiveNav();
  });
});
