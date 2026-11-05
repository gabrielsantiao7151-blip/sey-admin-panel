window.Session = (function () {
  const ACCESS = 'seu_access';
  const REFRESH = 'seu_refresh';
  const NAME = 'seu_name';
  const ROLE = 'seu_role';

  const NAV = [
    { id: 'index', href: 'index.html', label: 'Inicio' },
    { id: 'drivers', href: 'drivers.html', label: 'Conductores' },
    { id: 'vehicles', href: 'vehicles.html', label: 'Vehículos' },
    { id: 'trips', href: 'trips.html', label: 'Viajes y mapa' },
    { id: 'clients', href: 'clients.html', label: 'Clientes' },
    { id: 'fares', href: 'fares.html', label: 'Tarifas' },
    { id: 'billing', href: 'billing.html', label: 'Facturación' },
    { id: 'alerts', href: 'alerts.html', label: 'Alertas' },
    { id: 'chats', href: 'chats.html', label: 'Chats' },
  ];

  function token() {
    return localStorage.getItem(ACCESS) || '';
  }

  function refreshToken() {
    return localStorage.getItem(REFRESH) || '';
  }

  function name() {
    return localStorage.getItem(NAME) || 'Superadmin';
  }

  function save(value) {
    if (!value) return;
    if (value.accessToken) localStorage.setItem(ACCESS, value.accessToken);
    if (value.refreshToken) localStorage.setItem(REFRESH, value.refreshToken);
    if (value.user) {
      localStorage.setItem(NAME, value.user.fullName || '');
      localStorage.setItem(ROLE, value.user.role || '');
    }
  }

  function clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(NAME);
    localStorage.removeItem(ROLE);
  }

  function requireAuth() {
    if (!token()) {
      location.replace('login.html');
      return false;
    }
    return true;
  }

  function toast(message, kind) {
    const host = document.getElementById('toasts');
    if (!host) return;
    const node = document.createElement('div');
    node.className = `toast ${kind || 'error'}`;
    node.textContent = message;
    host.appendChild(node);
    setTimeout(() => node.remove(), 5200);
  }

  function fail(err) {
    toast(Fmt.explain(err), 'error');
  }

  async function lock(button, work) {
    if (!button || button.disabled) return;
    const label = button.textContent;
    button.disabled = true;
    try {
      return await work();
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  function query() {
    return new URLSearchParams(location.search);
  }

  function replaceQuery(params) {
    const url = new URL(location.href);
    url.search = '';
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
    history.replaceState(null, '', url);
  }

  function renderPager(node, state, onPage) {
    if (!node) return;
    const limit = state.limit || 20;
    const total = state.total || 0;
    const page = state.page || 1;
    const pages = Math.max(1, Math.ceil(total / limit));
    if (!total) {
      node.hidden = true;
      node.innerHTML = '';
      return;
    }
    node.hidden = false;
    node.innerHTML = `
      <button type="button" data-dir="-1"${page <= 1 ? ' disabled' : ''}>Anterior</button>
      <span>Página ${page} de ${pages} · ${Fmt.num(total)}</span>
      <button type="button" data-dir="1"${page >= pages ? ' disabled' : ''}>Siguiente</button>
    `;
    node.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => onPage(page + Number(button.dataset.dir)));
    });
  }

  function stateRow(colspan, message) {
    return `<tr class="state-row"><td colspan="${colspan}">${message}</td></tr>`;
  }

  function mount(active) {
    if (!requireAuth()) return false;
    const page = document.getElementById('page');
    const app = document.createElement('div');
    app.className = 'app';
    const links = NAV.map((item) => {
      const current = item.id === active ? ' aria-current="page"' : '';
      const dot = item.id === 'alerts' ? '<span class="dot" data-alert-dot hidden></span>' : '';
      return `<a href="${item.href}"${current}>${item.label}${dot}</a>`;
    }).join('');
    app.innerHTML = `
      <aside class="side">
        <a class="brand" href="index.html">
          <span class="brand-mark"><img src="assets/logo.png" alt=""></span>
          <span class="brand-copy"><strong>SEU</strong><small>Siempre estarás ubicado</small></span>
        </a>
        <nav>${links}</nav>
        <div class="side-foot">
          <p class="who"></p>
          <details class="base-box">
            <summary>Servidor</summary>
            <label>URL de la API
              <input id="base-url" type="url" spellcheck="false" autocomplete="off">
            </label>
          </details>
          <button type="button" id="logout" class="btn ghost">Salir</button>
        </div>
      </aside>
    `;
    const main = document.createElement('div');
    main.className = 'main';
    const toasts = document.createElement('div');
    toasts.id = 'toasts';
    toasts.className = 'toasts';
    main.appendChild(toasts);
    if (page) {
      page.hidden = false;
      main.appendChild(page);
    }
    app.appendChild(main);
    document.body.appendChild(app);
    app.querySelector('.who').textContent = name();
    document.getElementById('logout').addEventListener('click', () => {
      if (window.Api) Api.logout();
    });
    const baseInput = document.getElementById('base-url');
    baseInput.value = window.Api ? Api.base() : (localStorage.getItem('seu_base') || 'http://localhost:3000');
    baseInput.addEventListener('change', () => {
      if (!window.Api) return;
      Api.setBase(baseInput.value);
      toast('Servidor actualizado', 'ok');
    });
    document.addEventListener('click', (event) => {
      const row = event.target.closest('tr[data-href]');
      if (!row || event.target.closest('a, button, input, select, textarea, label')) return;
      location.href = row.dataset.href;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const row = event.target.closest('tr[data-href]');
      if (row) location.href = row.dataset.href;
    });
    if (window.Api) {
      Api.get('/api/admin/alerts', { query: { status: 'open', limit: 1 } })
        .then((result) => {
          const dot = document.querySelector('[data-alert-dot]');
          if (dot) dot.hidden = !(result && result.total > 0);
        })
        .catch(() => {});
    }
    return true;
  }

  return {
    PAGE: 20,
    token,
    refreshToken,
    name,
    save,
    clear,
    requireAuth,
    toast,
    fail,
    lock,
    query,
    replaceQuery,
    renderPager,
    stateRow,
    mount,
  };
}());
