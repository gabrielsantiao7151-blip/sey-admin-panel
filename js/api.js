window.Api = (function () {
  const BASE_KEY = 'seu_base';
  const DEFAULT_BASE = 'https://seu-backend.vercel.app';
  let refreshTask = null;

  function base() {
    const saved = (localStorage.getItem(BASE_KEY) || '').replace(/\/$/, '');
    if (!saved || saved === 'http://localhost:3000') {
      localStorage.setItem(BASE_KEY, DEFAULT_BASE);
      return DEFAULT_BASE;
    }
    return saved;
  }

  function setBase(url) {
    const next = String(url || '').trim().replace(/\/$/, '');
    if (!next) {
      localStorage.removeItem(BASE_KEY);
      return;
    }
    localStorage.setItem(BASE_KEY, next);
  }

  function fileUrl(imageUrl) {
    if (!imageUrl) return '';
    const token = Session.token();
    const glue = imageUrl.includes('?') ? '&' : '?';
    return `${base()}${imageUrl}${glue}access_token=${encodeURIComponent(token)}`;
  }

  async function readBody(response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      return null;
    }
  }

  function fail(data, status) {
    const error = new Error((data && data.msg) || 'No se pudo completar la acción');
    error.errorCode = data && data.errorCode ? data.errorCode : null;
    error.status = status;
    return error;
  }

  async function refreshTokens() {
    const refreshToken = Session.refreshToken();
    if (!refreshToken) throw fail({ msg: 'La sesión venció', errorCode: 'UNAUTHORIZED' }, 401);
    let response;
    try {
      response = await fetch(`${base()}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (err) {
      throw fail({ msg: 'No hay conexión con el servidor' }, 0);
    }
    const data = await readBody(response);
    if (!response.ok || !data || data.status === false || !data.value || !data.value.accessToken) {
      throw fail(data || { msg: 'La sesión venció', errorCode: 'UNAUTHORIZED' }, response.status);
    }
    Session.save(data.value);
    return data.value.accessToken;
  }

  function refreshOnce() {
    if (!refreshTask) {
      refreshTask = refreshTokens().finally(() => {
        refreshTask = null;
      });
    }
    return refreshTask;
  }

  function redirectLogin() {
    Session.clear();
    if (!location.pathname.endsWith('login.html')) location.replace('login.html');
  }

  async function request(path, options) {
    const opts = options || {};
    const method = opts.method || 'GET';
    const url = new URL(base() + path);
    Object.entries(opts.query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
    const headers = {};
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.auth !== false && Session.token()) headers.Authorization = `Bearer ${Session.token()}`;
    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch (err) {
      throw fail({ msg: 'No hay conexión con el servidor' }, 0);
    }
    if (response.status === 401 && opts.auth !== false && opts.retry !== false) {
      try {
        await refreshOnce();
      } catch (err) {
        redirectLogin();
        throw fail({ msg: 'La sesión venció', errorCode: 'UNAUTHORIZED' }, 401);
      }
      return request(path, Object.assign({}, opts, { retry: false }));
    }
    const data = await readBody(response);
    if (!data || data.status === false || !response.ok) {
      throw fail(data, response.status);
    }
    return data.value;
  }

  function get(path, options) {
    return request(path, options);
  }

  function post(path, body, options) {
    return request(path, Object.assign({}, options, { method: 'POST', body }));
  }

  function patch(path, body, options) {
    return request(path, Object.assign({}, options, { method: 'PATCH', body }));
  }

  function put(path, body, options) {
    return request(path, Object.assign({}, options, { method: 'PUT', body }));
  }

  function remove(path) {
    return request(path, { method: 'DELETE' });
  }

  async function logout() {
    const refreshToken = Session.refreshToken();
    try {
      if (refreshToken) await post('/api/auth/logout', { refreshToken });
    } catch (err) {
      /* La sesión local se cierra igual. */
    }
    Session.clear();
    location.replace('login.html');
  }

  return { base, setBase, fileUrl, request, get, post, patch, put, remove, logout };
}());
