if (!Session.mount('fares')) throw new Error('sin sesión');

const products = ['normal', 'comfort', 'premium', 'taxi'];
const confirmation = ['test', 'confirmed'];
const ruleFields = [
  ['countryCode', 'País', 'text', 'CO'],
  ['scope', 'Ámbito', ['municipality', 'pair', 'department', 'country'], 'municipality'],
  ['product', 'Producto', products, 'normal'],
  ['department', 'Departamento', 'text', '', 'department municipality pair'],
  ['municipalityCode', 'Código DIVIPOLA', 'text', '', 'municipality'],
  ['municipalityName', 'Municipio', 'text', '', 'municipality'],
  ['originMunicipalityCode', 'DIVIPOLA de origen', 'text', '', 'pair'],
  ['destinationMunicipalityCode', 'DIVIPOLA de destino', 'text', '', 'pair'],
  ['coverage', 'Con cobertura', 'checkbox', true],
  ['baseFare', 'Arranque', 'integer', 0],
  ['perKm', 'Precio por km', 'integer', 0],
  ['perMin', 'Precio por minuto', 'integer', 0],
  ['minimumFare', 'Mínimo', 'integer', 0],
  ['multiplier', 'Multiplicador', 'positive', 1],
  ['formula', 'Fórmula', ['components', 'multiplier', 'minimum_after_calculation'], 'components'],
  ['taxiMechanism', 'Mecanismo taxi', ['minimum_after_calculation', 'official'], 'minimum_after_calculation', 'taxi'],
  ['negotiatedEnabled', 'Oferta negociada', 'checkbox', false, 'normal'],
  ['minOfferPct', 'Oferta mínima (%)', 'integer', 80],
  ['maxOfferPct', 'Oferta máxima (%)', 'integer', 150],
  ['currency', 'Moneda', 'text', 'COP'],
  ['validFrom', 'Vigente desde', 'date', ''],
  ['validTo', 'Vigente hasta', 'date', ''],
  ['version', 'Versión', 'integer', 1],
  ['confirmationStatus', 'Confirmación', confirmation, 'test'],
  ['isActive', 'Activa', 'checkbox', false],
];
const tollFields = [
  ['countryCode', 'País', 'text', 'CO'],
  ['name', 'Nombre', 'text', ''],
  ['lat', 'Latitud', 'latitude', ''],
  ['lng', 'Longitud', 'longitude', ''],
  ['radiusKm', 'Radio (km)', 'positive', 0.35],
  ['currency', 'Moneda', 'text', 'COP'],
  ['direction', 'Sentido', 'text', 'both'],
  ['authoritative', 'Catálogo con cobertura verificada', 'checkbox', false],
  ['confirmationStatus', 'Confirmación', confirmation, 'test'],
  ['isActive', 'Activo', 'checkbox', false],
];
const categories = [...products, 'any'];

function field([name, label, type]) {
  const constraints = {
    integer: 'type="number" min="0" step="1"',
    positive: 'type="number" min="0" step="any"',
    latitude: 'type="number" min="-90" max="90" step="any"',
    longitude: 'type="number" min="-180" max="180" step="any"',
  };
  if (type === 'checkbox') {
    return `<label class="check"><input name="${name}" type="checkbox"> <span>${label}</span></label>`;
  }
  const control = Array.isArray(type)
    ? `<select name="${name}">${type.map((item) => `<option>${item}</option>`).join('')}</select>`
    : `<input name="${name}" ${constraints[type] || `type="${type}"`} ${name === 'validTo' ? '' : 'required'}>`;
  return `<label class="field">${label} ${control}</label>`;
}

function priceRows(container, prices) {
  container.replaceChildren();
  for (const category of categories) {
    const price = prices.find((item) => item.category === category);
    const row = document.createElement('div');
    row.className = 'filters';
    row.dataset.category = category;
    row.innerHTML = field(['amount', `Precio · ${category}`, 'integer'])
      + field(['confirmed', 'Precio verificado', 'checkbox']);
    const amount = row.querySelector('[name="amount"]');
    amount.required = false;
    amount.value = price?.amount ?? '';
    row.querySelector('[name="confirmed"]').checked = price?.confirmed === true;
    container.append(row);
  }
}

function editor(sectionId, endpoint, fields, title) {
  const section = document.getElementById(sectionId);
  const form = section.querySelector('form');
  const list = section.querySelector('ul');
  const status = section.querySelector('[role="status"]');
  const prices = section.querySelector('.prices');
  const submit = form.querySelector('[type="submit"]');
  form.querySelector('.filters').innerHTML = fields.map(field).join('');
  let current = null;

  function sync() {
    const applicable = [form.elements.scope?.value, form.elements.product?.value];
    for (const [name, , , , appliesTo] of fields) {
      if (!appliesTo) continue;
      const input = form.elements[name];
      input.disabled = !appliesTo.split(' ').some((value) => applicable.includes(value));
      input.closest('label').hidden = input.disabled;
    }
  }

  function fill(row) {
    current = row;
    form.querySelector('h3').textContent = row ? 'Editar registro' : 'Nuevo registro';
    for (const [name, , type, initial] of fields) {
      const value = row?.[name] ?? initial;
      const input = form.elements[name];
      if (type === 'checkbox') input.checked = value === true;
      else input.value = type === 'date' ? String(value).slice(0, 10) : value;
    }
    if (prices) priceRows(prices, row?.vehiclePrices || []);
    sync();
  }

  async function load() {
    status.textContent = 'Cargando…';
    list.replaceChildren();
    try {
      const rows = await Api.get(endpoint);
      for (const row of rows) {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn ghost small';
        button.textContent = 'Editar';
        button.addEventListener('click', () => {
          fill(row);
          form.querySelector('h3').scrollIntoView({ block: 'nearest' });
          form.elements[fields[0][0]].focus();
        });
        item.append(`${title(row)} · ${row.confirmationStatus === 'confirmed' ? 'Confirmado' : 'Por confirmar'} · ${row.isActive ? 'Activo' : 'Inactivo'} `, button);
        list.append(item);
      }
      status.textContent = rows.length ? '' : 'No hay registros.';
    } catch (err) {
      status.textContent = 'No se pudo cargar el catálogo completo.';
      Session.fail(err);
    }
  }

  form.addEventListener('change', sync);
  form.querySelector('[data-new]').addEventListener('click', () => fill(null));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const body = {};
    for (const [name, label, type] of fields) {
      const input = form.elements[name];
      if (input.disabled) continue;
      if (type === 'checkbox') body[name] = input.checked;
      else if (input.type === 'number') {
        body[name] = input.valueAsNumber;
        if (type === 'positive' && body[name] <= 0) return Session.toast(`${label} debe ser mayor que cero.`);
      } else {
        body[name] = input.value.trim();
        if (input.required && !body[name]) return Session.toast(`Completa el campo ${label}.`);
      }
    }
    if (!prices) {
      body.negotiatedEnabled = body.negotiatedEnabled === true;
      for (const name of ['municipalityCode', 'municipalityName', 'department', 'originMunicipalityCode', 'destinationMunicipalityCode']) {
        body[name] ??= '';
      }
      body.validTo ||= null;
      if (body.minOfferPct > body.maxOfferPct) return Session.toast('Revisa el intervalo de oferta.');
      if (body.validTo && body.validFrom > body.validTo) return Session.toast('Revisa el intervalo de vigencia.');
      for (const name of ['validFrom', 'validTo']) {
        if (current?.[name] && body[name] === String(current[name]).slice(0, 10)) body[name] = current[name];
      }
      if (!current && !window.confirm('Guardar por clave puede reemplazar una regla existente. ¿Continuar?')) return;
    } else {
      body.vehiclePrices = [];
      for (const row of prices.children) {
        const amount = row.querySelector('[name="amount"]');
        const confirmed = row.querySelector('[name="confirmed"]').checked;
        if (amount.value === '') {
          if (confirmed) return Session.toast('Escribe el precio antes de verificarlo.');
          continue;
        }
        body.vehiclePrices.push({ category: row.dataset.category, amount: amount.valueAsNumber, confirmed });
      }
    }
    const promotes = body.confirmationStatus === 'confirmed' || body.authoritative
      || body.vehiclePrices?.some((price) => price.confirmed);
    if (promotes && !window.confirm('¿Validaste los valores y la cobertura que estás confirmando?')) return;
    Session.lock(submit, async () => {
      try {
        if (current) await Api.put(`${endpoint}/${encodeURIComponent(current.id)}`, body);
        else await Api.post(endpoint, body);
        Session.toast('Registro guardado', 'ok');
        fill(null);
        await load();
      } catch (err) {
        Session.fail(err);
      }
    });
  });

  fill(null);
  load();
}

editor('rules', '/api/admin/fare-rules', ruleFields, (row) => {
  const zone = row.scope === 'pair'
    ? `${row.originMunicipalityCode} → ${row.destinationMunicipalityCode}`
    : [row.municipalityName, row.municipalityCode, row.department].filter(Boolean).join(' · ') || row.countryCode;
  return `${zone} · ${row.product} · ${row.formula} · versión ${row.version} · ${row.coverage ? 'Con cobertura' : 'Fuera de cobertura'}`;
});
editor('tolls', '/api/admin/tolls', tollFields, (row) => `${row.name} · ${row.direction} · ${row.authoritative ? 'Cobertura verificada' : 'Cobertura por verificar'}`);
