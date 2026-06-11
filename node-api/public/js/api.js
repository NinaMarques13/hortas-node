// ============================================================
// 🌐 API Client — fetch wrapper with JWT
// ============================================================

const API_BASE = window.location.origin + '/api';

const Api = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };

    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(url, { ...options, headers });

      if (res.status === 401) {
        Auth.logout();
        return null;
      }

      const data = await res.json();
      data._status = res.status;
      data._ok = res.ok;
      return data;
    } catch (err) {
      return { _ok: false, _status: 0, mensagem: 'Erro de conexão: ' + err.message };
    }
  },

  get(endpoint)          { return this.request(endpoint); },
  post(endpoint, body)   { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
  put(endpoint, body)    { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); },
  delete(endpoint)       { return this.request(endpoint, { method: 'DELETE' }); },
};
