window.Fmt = (function () {
  const TRIP = {
    draft: ['Borrador', 'muted'],
    payment_pending: ['Pago pendiente', 'warn'],
    searching: ['Solicitado', 'warn'],
    offered: ['Solicitado', 'warn'],
    assigned: ['Asignado', 'info'],
    driver_arriving: ['En camino', 'info'],
    driver_arrived: ['Conductor en origen', 'info'],
    in_progress: ['En viaje', 'trip'],
    completed: ['Finalizado', 'ok'],
    cancelled: ['Cancelado', 'danger'],
    expired: ['Cancelado', 'danger'],
  };

  const DRIVER = {
    pending: ['Pendiente', 'warn'],
    approved: ['Aprobado', 'ok'],
    rejected: ['Rechazado', 'danger'],
    suspended: ['Suspendido', 'danger'],
    inactive: ['Inactivo', 'muted'],
  };

  const OPERATIONAL = {
    offline: ['Desconectado', 'muted'],
    available: ['Disponible', 'ok'],
    on_trip: ['En viaje', 'trip'],
  };

  const VEHICLE = {
    available: ['Disponible', 'ok'],
    assigned: ['Asignado', 'info'],
    out_of_service: ['Fuera de servicio', 'warn'],
    blocked: ['Bloqueado', 'danger'],
    in_trip: ['En viaje', 'trip'],
  };

  const MAP_STATE = {
    available: ['Disponible', 'ok'],
    assigned: ['Asignado', 'info'],
    arriving: ['En camino', 'info'],
    in_trip: ['En viaje', 'trip'],
  };

  const CATEGORY = {
    economy: 'Económico',
    standard: 'Estándar',
    premium: 'Premium',
  };

  const PAYMENT_METHOD = {
    cash: 'Efectivo',
    gateway: 'Pago en línea',
  };

  const PAYMENT_STATUS = {
    pending: ['Pendiente', 'warn'],
    approved: ['Aprobado', 'ok'],
    rejected: ['Rechazado', 'danger'],
    cancelled: ['Cancelado', 'danger'],
    refund_pending: ['Reembolso pendiente', 'warn'],
  };

  const ALERT = {
    pending_driver: 'Conductor pendiente',
    driver_inactive: 'Conductor inactivo',
    vehicle_out_of_service: 'Vehículo fuera de servicio',
    emergency: 'Emergencia',
    gateway_failed: 'Cobro rechazado',
  };

  const ACCOUNT = {
    active: ['Activa', 'ok'],
    inactive: ['Inactiva', 'muted'],
  };

  const CHAT = {
    open: ['Abierto', 'ok'],
    closed: ['Cerrado', 'muted'],
  };

  const SIDE = {
    passenger: 'Pasajero',
    driver: 'Conductor',
    superadmin: 'Administración',
  };

  const ERRORS = {
    UNAUTHORIZED: 'La sesión venció',
    FORBIDDEN: 'No tienes permiso',
    CONFLICT: 'Ese dato ya existe',
    NOT_FOUND: 'No se encontró el registro',
    INVALID_STATE: 'La acción ya no aplica. Vuelve a cargar la ficha',
    DB_UNAVAILABLE: 'No hay conexión con la base',
  };

  const CURRENCY = { CO: 'COP', CL: 'CLP', PE: 'PEN', MX: 'MXN', AR: 'ARS' };

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function text(value) {
    if (value === null || value === undefined || value === '') return '—';
    return esc(value);
  }

  function currencyFor(countryCode) {
    return CURRENCY[String(countryCode || '').toUpperCase()] || 'COP';
  }

  function money(amount, currency) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '—';
    const code = currency || 'COP';
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 0,
      }).format(value);
    } catch (err) {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(value);
    }
  }

  function num(value) {
    return new Intl.NumberFormat('es-CO').format(Number(value) || 0);
  }

  function when(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function dayKey(value) {
    if (!value) return '—';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      const [year, month, day] = String(value).split('-');
      return `${day}/${month}/${year}`;
    }
    return when(value);
  }

  function km(value) {
    if (value === null || value === undefined || value === '') return '—';
    return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(Number(value))} km`;
  }

  function minutes(value) {
    if (value === null || value === undefined || value === '') return '—';
    return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(Number(value))} min`;
  }

  function rating(avg, count) {
    const value = Number(avg) || 0;
    return `${value.toFixed(1)} (${num(count || 0)})`;
  }

  function labelOf(map, value) {
    if (!value) return '—';
    const item = map[value];
    if (!item) return String(value);
    return Array.isArray(item) ? item[0] : item;
  }

  function toneOf(map, value) {
    const item = map[value];
    if (!item || !Array.isArray(item)) return 'muted';
    return item[1] || 'muted';
  }

  function badge(map, value) {
    return `<span class="badge ${toneOf(map, value)}">${esc(labelOf(map, value))}</span>`;
  }

  function income(rows) {
    if (!rows || !rows.length) return '<p class="zero">$ 0</p>';
    return rows.map((row) => (
      `<p class="income-line"><strong>${esc(money(row.amount, row.currency))}</strong>`
      + `<span>${num(row.count)} viajes</span></p>`
    )).join('');
  }

  function explain(err) {
    if (!err) return 'No se pudo completar la acción';
    if (err.errorCode === 'VALIDATION') return err.message || 'Revisa los datos';
    if (err.errorCode && ERRORS[err.errorCode]) return ERRORS[err.errorCode];
    return err.message || 'No se pudo completar la acción';
  }

  function todayUtc() {
    return new Date().toISOString().slice(0, 10);
  }

  function rangeQuery(from, to) {
    const query = {};
    if (from) query.from = from;
    if (to) query.to = String(to).length === 10 ? `${to}T23:59:59.999Z` : to;
    return query;
  }

  function selectOptions(map, selected, emptyLabel) {
    const keys = Object.keys(map);
    const head = emptyLabel === undefined ? '' : `<option value="">${esc(emptyLabel)}</option>`;
    return head + keys.map((key) => (
      `<option value="${esc(key)}"${key === selected ? ' selected' : ''}>${esc(labelOf(map, key))}</option>`
    )).join('');
  }

  return {
    esc,
    text,
    currencyFor,
    money,
    num,
    when,
    dayKey,
    km,
    minutes,
    rating,
    badge,
    income,
    explain,
    todayUtc,
    rangeQuery,
    selectOptions,
    trip: (value) => badge(TRIP, value),
    tripLabel: (value) => labelOf(TRIP, value),
    driver: (value) => badge(DRIVER, value),
    operational: (value) => badge(OPERATIONAL, value),
    vehicle: (value) => badge(VEHICLE, value),
    mapState: (value) => badge(MAP_STATE, value),
    category: (value) => labelOf(CATEGORY, value),
    payMethod: (value) => labelOf(PAYMENT_METHOD, value),
    payStatus: (value) => badge(PAYMENT_STATUS, value),
    alert: (value) => labelOf(ALERT, value),
    account: (value) => badge(ACCOUNT, value),
    chat: (value) => badge(CHAT, value),
    side: (value) => labelOf(SIDE, value),
    TRIP,
    DRIVER,
    VEHICLE,
    CATEGORY,
    PAYMENT_METHOD,
    PAYMENT_STATUS,
    ALERT,
    ACCOUNT,
    CHAT,
    MAP_STATE,
  };
}());
