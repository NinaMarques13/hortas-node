// ============================================================
// 🛤️ Router — hash-based SPA navigation
// ============================================================

const Router = {
  routes: [],
  container: null,

  init(containerId) {
    this.container = document.getElementById(containerId);
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  },

  add(path, handler, { auth = false } = {}) {
    this.routes.push({ path, handler, auth });
    return this;
  },

  navigate(path) {
    window.location.hash = '#' + path;
  },

  resolve() {
    const hash = window.location.hash.slice(1) || '/login';
    let matchedRoute = null;
    let params = {};

    for (const route of this.routes) {
      // Convert /path/:id to regex
      const pattern = route.path.replace(/:\w+/g, '([^/]+)');
      const regex = new RegExp(`^${pattern}$`);
      const match = hash.match(regex);

      if (match) {
        matchedRoute = route;
        // Extract param names
        const paramNames = (route.path.match(/:(\w+)/g) || []).map(p => p.slice(1));
        paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
        break;
      }
    }

    if (!matchedRoute) {
      // Fallback: redirect to login or dashboard
      window.location.hash = Auth.isAuthenticated() ? '#/dashboard' : '#/login';
      return;
    }

    // Auth guard
    if (matchedRoute.auth && !Auth.isAuthenticated()) {
      window.location.hash = '#/login';
      return;
    }

    // Public routes redirect to dashboard if already logged in
    if (!matchedRoute.auth && Auth.isAuthenticated() && ['login', 'register', 'forgot-password'].some(p => hash.includes(p))) {
      window.location.hash = '#/dashboard';
      return;
    }

    // Render
    if (this.container) {
      this.container.innerHTML = '<div class="spinner-center"><div class="spinner"></div></div>';
      matchedRoute.handler(params);
    }
  },
};
