// ============================================================
// CEA Admin JS — Panel de administración
// ============================================================

// ─── Modal de confirmación personalizado ──────────────────────
var _modalCb = null;
function CEAConfirm(msg, onOk, opts) {
  opts = opts || {};
  var overlay = document.getElementById('cea-modal-overlay');
  document.getElementById('cea-modal-title').textContent = opts.title || '¿Eliminar registro?';
  document.getElementById('cea-modal-msg').textContent   = msg;
  var okBtn = document.getElementById('cea-modal-ok');
  okBtn.textContent = opts.okLabel || 'Eliminar';
  okBtn.className   = 'md-btn ' + (opts.okClass || 'md-btn-error');
  overlay.classList.add('show');
  _modalCb = onOk;
}
function _modalClose() {
  document.getElementById('cea-modal-overlay').classList.remove('show');
  _modalCb = null;
}

// ─── Formato de fechas en español ─────────────────────────────
var _MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function formatFecha(v) {
  if (!v || v === '-') return '-';
  try {
    var d = new Date(String(v).replace(' ', 'T'));
    if (isNaN(d.getTime())) return v;
    var dia = String(d.getDate()).padStart(2,'0');
    var mes = _MESES[d.getMonth()];
    var anio = d.getFullYear();
    var h = String(d.getHours()).padStart(2,'0');
    var m = String(d.getMinutes()).padStart(2,'0');
    return dia + '/' + mes + '/' + anio + ' ' + h + ':' + m;
  } catch(e) { return v; }
}
function formatFechaSolo(v) {
  if (!v || v === '-') return '-';
  try {
    var d = new Date(String(v).replace(' ', 'T'));
    if (isNaN(d.getTime())) return v;
    return String(d.getDate()).padStart(2,'0') + '/' +
      _MESES[d.getMonth()] + '/' + d.getFullYear();
  } catch(e) { return v; }
}

// ─── Badges de estado ──────────────────────────────────────────
function fmtDisp(v) {
  if (!v || v === '-') return '-';
  return v === 'disponible'
    ? '<span class="status-badge status-ok"><span class="material-symbols-rounded">check_circle</span>Disponible</span>'
    : '<span class="status-badge status-off"><span class="material-symbols-rounded">cancel</span>No disponible</span>';
}
function fmtResultado(v) {
  if (!v || v === '-') return '-';
  var lv = String(v).toLowerCase();
  var ok = lv.includes('aprob') && !lv.includes('no');
  return ok
    ? '<span class="status-badge status-ok"><span class="material-symbols-rounded">check_circle</span>' + v + '</span>'
    : '<span class="status-badge status-off"><span class="material-symbols-rounded">cancel</span>' + v + '</span>';
}
function fmtTipo(v) {
  if (!v) return '-';
  var map = { carro: 'Carro', moto: 'Moto' };
  return map[v] || v;
}

// ─── Loading skeleton ──────────────────────────────────────────
function showLoading(tbodyId, cols) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  var rows = '';
  for (var i = 0; i < 4; i++) {
    var cells = '';
    for (var j = 0; j < cols; j++) {
      var w = 40 + (i * 13 + j * 7) % 45;
      cells += '<td><div class="skeleton-cell" style="width:' + w + '%"></div></td>';
    }
    rows += '<tr>' + cells + '</tr>';
  }
  tbody.innerHTML = rows;
}

// ─── Barra de búsqueda + filtros ───────────────────────────────
function injectToolbar(tbodyId, opts) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  var tableResp = tbody.closest('.table-responsive');
  if (!tableResp) return;

  var old = document.getElementById('toolbar-' + tbodyId);
  if (old) old.remove();

  var searchId = 'srch-' + tbodyId;
  var countId  = 'cnt-'  + tbodyId;

  var html = '<div class="search-wrap"><span class="material-symbols-rounded">search</span>' +
    '<input type="text" id="' + searchId + '" placeholder="' +
    (opts.placeholder || 'Buscar...') + '" class="search-input" autocomplete="off"></div>';

  (opts.filters || []).forEach(function(f) {
    var fid = 'flt-' + f.key + '-' + tbodyId;
    html += '<select class="filter-chip" id="' + fid + '"><option value="">' + f.label + '</option>';
    f.options.forEach(function(o) {
      html += '<option value="' + o.v + '">' + o.t + '</option>';
    });
    html += '</select>';
  });

  html += '<span class="table-count" id="' + countId + '"></span>';

  var wrap = document.createElement('div');
  wrap.className = 'table-toolbar';
  wrap.id = 'toolbar-' + tbodyId;
  wrap.innerHTML = html;
  tableResp.parentNode.insertBefore(wrap, tableResp);

  function applyFilter() {
    var q = (document.getElementById(searchId) || {value:''}).value.toLowerCase().trim();
    var filterVals = (opts.filters || []).map(function(f) {
      return (document.getElementById('flt-' + f.key + '-' + tbodyId) || {value:''}).value.toLowerCase();
    });
    var rows = tbody.querySelectorAll('tr[data-row]');
    var visible = 0;
    rows.forEach(function(row) {
      var text = (row.dataset.text || '').toLowerCase();
      var show = (!q || text.includes(q)) &&
        filterVals.every(function(fv, i) { return !fv || text.includes(fv); });
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    var noRes = document.getElementById('no-res-' + tbodyId);
    if (visible === 0 && rows.length > 0) {
      if (!noRes) {
        var tr = document.createElement('tr');
        tr.id = 'no-res-' + tbodyId;
        tr.innerHTML = '<td colspan="20" class="text-center text-muted py-3">' +
          '<span class="material-symbols-rounded" style="font-size:32px;display:block;margin-bottom:8px;color:var(--md-outline)">search_off</span>' +
          'Sin resultados para "<strong>' + q + '</strong>"</td>';
        tbody.appendChild(tr);
      }
    } else if (noRes) noRes.remove();
    var countEl = document.getElementById(countId);
    if (countEl) countEl.textContent = rows.length ? visible + ' / ' + rows.length + ' registros' : '';
  }

  var inp = document.getElementById(searchId);
  if (inp) inp.addEventListener('input', applyFilter);
  (opts.filters || []).forEach(function(f) {
    var sel = document.getElementById('flt-' + f.key + '-' + tbodyId);
    if (sel) sel.addEventListener('change', applyFilter);
  });
  setTimeout(applyFilter, 0);
}

// ─── Render de tabla genérico ──────────────────────────────────
function notify(msg, type) {
  if (window.CEANotify) { window.CEANotify(msg, type); return; }
  if (type === 'error') console.error(msg); else console.log(msg);
}
function fv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
function fel(id) { return document.getElementById(id); }
function clearForm(formId) {
  var form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('input,select,textarea').forEach(function(el) {
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
}

function openSection(id) {
  document.querySelectorAll('.cea-section').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.sidebar-link').forEach(function(l) { l.classList.remove('active'); });
  var sec = document.getElementById('sec-' + id);
  if (sec) sec.classList.add('active');
  var link = document.querySelector('[data-section="' + id + '"]');
  if (link) link.classList.add('active');
  if (id === 'dashboard') loadDashboard();
}

function renderTable(tbodyId, rows, cols, actions, fmts) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="' + (cols.length + 1) + '" class="text-center text-muted py-3">' +
      '<span class="material-symbols-rounded" style="font-size:32px;display:block;margin-bottom:8px;color:var(--md-outline)">inbox</span>' +
      'Sin registros aún</td></tr>';
    return;
  }
  fmts = fmts || {};
  tbody.innerHTML = rows.map(function(row) {
    var rawText = cols.map(function(c) { return String(row[c] != null ? row[c] : ''); }).join(' ');
    var cells = cols.map(function(c) {
      var val = row[c] != null ? row[c] : '-';
      if (fmts[c]) val = fmts[c](val);
      return '<td>' + val + '</td>';
    }).join('');
    var btns = (actions || []).map(function(a) {
      return '<button class="btn btn-sm ' + a.cls + ' me-1" onclick="' + a.fn + '(\'' + row.id + '\')">' + a.label + '</button>';
    }).join('');
    return '<tr data-row data-text="' + rawText.toLowerCase().replace(/"/g, ' ') + '">' + cells + '<td>' + btns + '</td></tr>';
  }).join('');
}

// ─── DASHBOARD ─────────────────────────────────────────────────
function loadDashboard() {
  var KPI_ITEMS = [
    { key:'clientes',           label:'Clientes',          icon:'group',          color:'#1565C0' },
    { key:'instructores',       label:'Instructores',      icon:'school',         color:'#00897B' },
    { key:'vehiculos',          label:'Vehículos',         icon:'directions_car', color:'#F57C00' },
    { key:'matriculados',       label:'Matriculados',      icon:'assignment_ind', color:'#6A1B9A' },
    { key:'clases_practicas',   label:'Clases Prácticas',  icon:'route',          color:'#C0002E' },
    { key:'clases_teoricas',    label:'Clases Teóricas',   icon:'menu_book',      color:'#1A237E' },
    { key:'examenes_practicos', label:'Exámenes Prácticos',icon:'flag',           color:'#2E7D32' },
    { key:'examenes_teoricos',  label:'Exámenes Teóricos', icon:'quiz',           color:'#558B2F' },
  ];

  Promise.all([
    API.get('/reportes/gerencia'),
    API.get('/matriculados'),
    API.get('/categoria'),
    API.get('/clase-practica'),
    API.get('/claseteorica'),
    API.get('/examen-practico'),
    API.get('/examen-teorico'),
  ]).then(function(results) {
    var gerencia   = results[0];
    var matriculas = results[1];
    var categorias = results[2];
    var claseP     = results[3];
    var claseT     = results[4];
    var examP      = results[5];
    var examT      = results[6];
    var kpis = gerencia.kpis || {};
    var cal  = gerencia.calidad_academica || {};
    var fin  = gerencia.finanzas || {};

    // ── KPI Cards ──────────────────────────────────
    var kpiBox = document.getElementById('dashboard-kpis');
    if (kpiBox) {
      kpiBox.innerHTML = KPI_ITEMS.map(function(k) {
        var val = kpis[k.key] || 0;
        return '<div class="kpi-card"><div class="kpi-icon" style="background:' + k.color + '">' +
          '<span class="material-symbols-rounded" style="font-size:26px">' + k.icon + '</span>' +
          '</div><div class="kpi-info"><span class="kpi-val">' + val + '</span>' +
          '<span class="kpi-label">' + k.label + '</span></div></div>';
      }).join('');
    }

    // ── Aprobación con barras ──────────────────────
    var apbox = document.getElementById('dashboard-aprobacion');
    if (apbox) {
      function aprobBar(label, pct) {
        var color = pct >= 80 ? '#2E7D32' : pct >= 60 ? 'var(--md-primary)' : '#C0002E';
        return '<div style="margin-bottom:14px">' +
          '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">' +
          '<span style="color:var(--md-on-surface)">' + label + '</span>' +
          '<strong style="color:' + color + '">' + pct + '%</strong></div>' +
          '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
          '</div>';
      }
      apbox.innerHTML =
        aprobBar('Examen práctico', cal.aprobacion_examen_practico_pct || 0) +
        aprobBar('Examen teórico',  cal.aprobacion_examen_teorico_pct  || 0);
    }

    // ── Finanzas ───────────────────────────────────
    var finbox = document.getElementById('dashboard-finanzas');
    if (finbox) {
      var ingresos = fin.ingresos_estimados_matriculas || 0;
      finbox.innerHTML =
        '<div style="text-align:center;padding:8px 0">' +
        '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--md-on-surface-variant);margin-bottom:8px">Ingresos estimados</div>' +
        '<div style="font-size:36px;font-weight:300;color:#2E7D32;line-height:1">$' + Number(ingresos).toLocaleString('es-CO') + '</div>' +
        '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:6px">por ' + (kpis.matriculados||0) + ' matrículas activas</div>' +
        '</div>';
    }

    // ── Distribución por categoría ─────────────────
    var catbox = document.getElementById('dashboard-categorias');
    if (catbox) {
      var catMap = {};
      categorias.forEach(function(c) { catMap[c.id] = c.nombre_categoria || c.id; });
      var catCount = {};
      matriculas.forEach(function(m) {
        var nombre = catMap[m.id_categoria] || 'Sin categoría';
        catCount[nombre] = (catCount[nombre] || 0) + 1;
      });
      var sortedCats = Object.keys(catCount).sort(function(a, b) { return catCount[b] - catCount[a]; });
      var maxCount = sortedCats.length ? catCount[sortedCats[0]] : 1;
      if (!sortedCats.length) {
        catbox.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:13px">Sin matriculados aún.</p>';
      } else {
        catbox.innerHTML = sortedCats.map(function(nombre) {
          var n   = catCount[nombre];
          var pct = Math.round((n / maxCount) * 100);
          return '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' +
            '<div style="min-width:48px;text-align:right;font-size:13px;font-weight:500;color:var(--md-on-surface)">' + nombre + '</div>' +
            '<div style="flex:1"><div class="progress-track" style="height:10px">' +
            '<div class="progress-fill" style="width:' + pct + '%;background:var(--md-primary)"></div></div></div>' +
            '<div style="min-width:72px;font-size:12px;color:var(--md-on-surface-variant)">' + n + ' estudiante' + (n>1?'s':'') + '</div>' +
            '</div>';
        }).join('');
      }
    }

    // ── Actividad reciente ─────────────────────────
    var actbox = document.getElementById('dashboard-actividad');
    if (actbox) {
      var TIPO_MAP = {
        'clase-practica': { icon:'route',     label:'Clase práctica',   color:'#C0002E' },
        'claseteorica':   { icon:'menu_book', label:'Clase teórica',    color:'#1A237E' },
        'examen-practico':{ icon:'flag',      label:'Examen práctico',  color:'#2E7D32' },
        'examen-teorico': { icon:'quiz',      label:'Examen teórico',   color:'#558B2F' },
      };
      var all = [];
      [[claseP,'clase-practica'],[claseT,'claseteorica'],[examP,'examen-practico'],[examT,'examen-teorico']]
        .forEach(function(pair) {
          pair[0].forEach(function(r) { all.push({ tipo: pair[1], r: r, ts: r.created_at || r.fecha_clase || '' }); });
        });
      all.sort(function(a,b) { return b.ts > a.ts ? 1 : -1; });
      var recent = all.slice(0, 8);

      if (!recent.length) {
        actbox.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:13px">Sin actividad registrada aún.</p>';
      } else {
        actbox.innerHTML = '<div class="dash-feed">' + recent.map(function(item) {
          var t = TIPO_MAP[item.tipo] || { icon:'event', label: item.tipo, color:'#444' };
          var r = item.r;
          var desc = r.Descripcion || r.descripcion || r.resultado || '';
          var fecha = formatFecha(r.created_at || r.fecha_clase || '');
          var resultBadge = r.resultado
            ? ' &nbsp;' + fmtResultado(r.resultado)
            : '';
          return '<div class="feed-item">' +
            '<div class="feed-icon" style="background:' + t.color + '20;color:' + t.color + '">' +
            '<span class="material-symbols-rounded" style="font-size:18px">' + t.icon + '</span></div>' +
            '<div class="feed-body">' +
            '<div class="feed-title">' + t.label + (desc ? ' · <span style="color:var(--md-on-surface-variant)">' + desc + '</span>' : '') + resultBadge + '</div>' +
            '<div class="feed-time">' + (fecha !== '-' ? fecha : 'Sin fecha') + '</div>' +
            '</div></div>';
        }).join('') + '</div>';
      }
    }

  }).catch(function(e) { console.error('Dashboard error', e); });
}

// ─── INSTRUCTOR ────────────────────────────────────────────────
function loadInstructores() {
  showLoading('tbl-instructor-body', 8);
  API.get('/instructor').then(function(rows) {
    renderTable('tbl-instructor-body', rows,
      ['nombre','apellido','cedula','correo','telefono','tipo_instructor','disponibilidad'],
      [{ cls:'btn-outline-primary', label:'Editar',   fn:'editInstructor' },
       { cls:'btn-outline-danger',  label:'Eliminar', fn:'eliminarInstructor' }],
      { tipo_instructor: fmtTipo, disponibilidad: fmtDisp }
    );
    injectToolbar('tbl-instructor-body', {
      placeholder: 'Buscar por nombre, cédula...',
      filters: [
        { key:'tipo', label:'Tipo de instructor', options:[{v:'carro',t:'Carro'},{v:'moto',t:'Moto'}] },
        { key:'disp', label:'Disponibilidad', options:[{v:'disponible',t:'Disponible'},{v:'nodisponible',t:'No disponible'}] }
      ]
    });
  }).catch(function(e) { notify('Error cargando instructores: ' + e.message, 'error'); });
}
function crearInstructor(e) {
  e.preventDefault();
  var btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.post('/instructor', { nombre:fv('iNombre'), apellido:fv('iApellido'), correo:fv('iCorreo'),
    telefono:fv('iTelefono'), cedula:fv('iCedula'), tipo_instructor:fv('iTipo'), disponibilidad:fv('iDisp') })
    .then(function() { notify('Instructor creado correctamente', 'success'); clearForm('form-instructor'); loadInstructores(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function editInstructor(id) {
  API.get('/instructor/' + id).then(function(r) {
    fel('iEditId').value = r.id; fel('iEditNombre').value = r.nombre || '';
    fel('iEditApellido').value = r.apellido || ''; fel('iEditCorreo').value = r.correo || '';
    fel('iEditTelefono').value = r.telefono || ''; fel('iEditCedula').value = r.cedula || '';
    fel('iEditTipo').value = r.tipo_instructor || 'carro'; fel('iEditDisp').value = r.disponibilidad || 'disponible';
    document.getElementById('card-instructor-edit').style.display = 'block';
    document.getElementById('card-instructor-edit').scrollIntoView({ behavior:'smooth', block:'nearest' });
  }).catch(function(e) { notify('Error al cargar instructor: ' + e.message, 'error'); });
}
function actualizarInstructor(e) {
  e.preventDefault();
  var id = fv('iEditId'), btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.put('/instructor/' + id, { nombre:fv('iEditNombre'), apellido:fv('iEditApellido'), correo:fv('iEditCorreo'),
    telefono:fv('iEditTelefono'), cedula:fv('iEditCedula'), tipo_instructor:fv('iEditTipo'), disponibilidad:fv('iEditDisp') })
    .then(function() { notify('Instructor actualizado', 'success'); document.getElementById('card-instructor-edit').style.display='none'; loadInstructores(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function eliminarInstructor(id) {
  console.log('[CEA] eliminarInstructor — id:', id);
  CEAConfirm('¿Deseas eliminar este instructor? Esta acción no se puede deshacer.', function() {
    console.log('[CEA] DELETE /instructor/' + id);
    notify('Eliminando instructor...', 'info');
    API.del('/instructor/' + id)
      .then(function() { console.log('[CEA] Instructor eliminado OK'); notify('Instructor eliminado', 'success'); loadInstructores(); })
      .catch(function(e) { console.error('[CEA] Error al eliminar instructor:', e); notify(e.message, 'error'); });
  });
}

// ─── CLIENTE ───────────────────────────────────────────────────
function loadClientes() {
  showLoading('tbl-cliente-body', 6);
  API.get('/cliente').then(function(rows) {
    renderTable('tbl-cliente-body', rows, ['nombre','apellido','cedula','correo','telefono'],
      [{ cls:'btn-outline-primary', label:'Editar',   fn:'editCliente' },
       { cls:'btn-outline-danger',  label:'Eliminar', fn:'eliminarCliente' }]);
    injectToolbar('tbl-cliente-body', { placeholder: 'Buscar por nombre, cédula, correo...' });
  }).catch(function(e) { notify('Error cargando clientes: ' + e.message, 'error'); });
}
function crearCliente(e) {
  e.preventDefault();
  var btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.post('/cliente', { nombre:fv('cNombre'), apellido:fv('cApellido'), telefono:fv('cTelefono'), correo:fv('cCorreo'), cedula:fv('cCedula') })
    .then(function() { notify('Cliente registrado correctamente', 'success'); clearForm('form-cliente'); loadClientes(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function editCliente(id) {
  API.get('/cliente/' + id).then(function(r) {
    fel('cEditId').value = r.id; fel('cEditNombre').value = r.nombre || '';
    fel('cEditApellido').value = r.apellido || ''; fel('cEditTelefono').value = r.telefono || '';
    fel('cEditCorreo').value = r.correo || ''; fel('cEditCedula').value = r.cedula || '';
    document.getElementById('card-cliente-edit').style.display = 'block';
    document.getElementById('card-cliente-edit').scrollIntoView({ behavior:'smooth', block:'nearest' });
  }).catch(function(e) { notify('Error al cargar cliente: ' + e.message, 'error'); });
}
function actualizarCliente(e) {
  e.preventDefault();
  var id = fv('cEditId'), btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.put('/cliente/' + id, { nombre:fv('cEditNombre'), apellido:fv('cEditApellido'), telefono:fv('cEditTelefono'), correo:fv('cEditCorreo'), cedula:fv('cEditCedula') })
    .then(function() { notify('Cliente actualizado', 'success'); document.getElementById('card-cliente-edit').style.display='none'; loadClientes(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function eliminarCliente(id) {
  console.log('[CEA] eliminarCliente — id:', id);
  CEAConfirm('¿Deseas eliminar este cliente? Se perderán todos sus datos registrados.', function() {
    console.log('[CEA] DELETE /cliente/' + id);
    notify('Eliminando cliente...', 'info');
    API.del('/cliente/' + id)
      .then(function() { console.log('[CEA] Cliente eliminado OK'); notify('Cliente eliminado', 'success'); loadClientes(); })
      .catch(function(e) { console.error('[CEA] Error al eliminar cliente:', e); notify(e.message, 'error'); });
  });
}

// ─── VEHICULO ──────────────────────────────────────────────────
function loadVehiculos() {
  showLoading('tbl-vehiculo-body', 7);
  API.get('/vehiculo').then(function(rows) {
    renderTable('tbl-vehiculo-body', rows, ['placa','marca','modelo','tipoVehiculo','nivelVehiculo','disponibilidad'],
      [{ cls:'btn-outline-primary', label:'Editar',   fn:'editVehiculo' },
       { cls:'btn-outline-danger',  label:'Eliminar', fn:'eliminarVehiculo' }],
      { tipoVehiculo: fmtTipo, disponibilidad: fmtDisp });
    injectToolbar('tbl-vehiculo-body', {
      placeholder: 'Buscar por placa, marca...',
      filters: [
        { key:'tipo', label:'Tipo', options:[{v:'carro',t:'Carro'},{v:'moto',t:'Moto'}] },
        { key:'disp', label:'Disponibilidad', options:[{v:'disponible',t:'Disponible'},{v:'nodisponible',t:'No disponible'}] }
      ]
    });
  }).catch(function(e) { notify('Error cargando vehículos: ' + e.message, 'error'); });
}
function crearVehiculo(e) {
  e.preventDefault();
  var btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.post('/vehiculo', { placa:fv('vPlaca'), modelo:fv('vModelo'), tipoVehiculo:fv('vTipo'), marca:fv('vMarca'), nivelVehiculo:fv('vNivel'), disponibilidad:fv('vDisp') })
    .then(function() { notify('Vehículo registrado', 'success'); clearForm('form-vehiculo'); loadVehiculos(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function editVehiculo(id) {
  API.get('/vehiculo/' + id).then(function(r) {
    fel('vEditId').value = r.id; fel('vEditPlaca').value = r.placa || ''; fel('vEditModelo').value = r.modelo || '';
    fel('vEditTipo').value = r.tipoVehiculo || 'carro'; fel('vEditMarca').value = r.marca || '';
    fel('vEditNivel').value = r.nivelVehiculo || ''; fel('vEditDisp').value = r.disponibilidad || 'disponible';
    document.getElementById('card-vehiculo-edit').style.display = 'block';
    document.getElementById('card-vehiculo-edit').scrollIntoView({ behavior:'smooth', block:'nearest' });
  }).catch(function(e) { notify('Error al cargar vehículo: ' + e.message, 'error'); });
}
function actualizarVehiculo(e) {
  e.preventDefault();
  var id = fv('vEditId'), btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.put('/vehiculo/' + id, { placa:fv('vEditPlaca'), modelo:fv('vEditModelo'), tipoVehiculo:fv('vEditTipo'), marca:fv('vEditMarca'), nivelVehiculo:fv('vEditNivel'), disponibilidad:fv('vEditDisp') })
    .then(function() { notify('Vehículo actualizado', 'success'); document.getElementById('card-vehiculo-edit').style.display='none'; loadVehiculos(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function eliminarVehiculo(id) {
  console.log('[CEA] eliminarVehiculo — id:', id);
  CEAConfirm('¿Deseas eliminar este vehículo del registro?', function() {
    console.log('[CEA] DELETE /vehiculo/' + id);
    notify('Eliminando vehículo...', 'info');
    API.del('/vehiculo/' + id)
      .then(function() { console.log('[CEA] Vehículo eliminado OK'); notify('Vehículo eliminado', 'success'); loadVehiculos(); })
      .catch(function(e) { console.error('[CEA] Error al eliminar vehículo:', e); notify(e.message, 'error'); });
  });
}

// ─── CATEGORIA ─────────────────────────────────────────────────
function loadCategorias() {
  showLoading('tbl-categoria-body', 5);
  API.get('/categoria').then(function(rows) {
    renderTable('tbl-categoria-body', rows, ['nombre_categoria','precio','horas_teoricas','horas_practicas'],
      [{ cls:'btn-outline-primary', label:'Editar',   fn:'editCategoria' },
       { cls:'btn-outline-danger',  label:'Eliminar', fn:'eliminarCategoria' }],
      { precio: function(v) { return v ? '$' + Number(v).toLocaleString('es-CO') : '$0'; } });
    injectToolbar('tbl-categoria-body', { placeholder: 'Buscar categoría...' });
  }).catch(function(e) { notify('Error cargando categorías: ' + e.message, 'error'); });
}
function crearCategoria(e) {
  e.preventDefault();
  var btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.post('/categoria', { nombre_categoria:fv('catNombre'), precio:parseFloat(fv('catPrecio'))||0, horas_teoricas:fv('catHT'), horas_practicas:fv('catHP') })
    .then(function() { notify('Categoría creada', 'success'); clearForm('form-categoria'); loadCategorias(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function editCategoria(id) {
  API.get('/categoria/' + id).then(function(r) {
    fel('catEditId').value = r.id; fel('catEditNombre').value = r.nombre_categoria || '';
    fel('catEditPrecio').value = r.precio || ''; fel('catEditHT').value = r.horas_teoricas || ''; fel('catEditHP').value = r.horas_practicas || '';
    document.getElementById('card-categoria-edit').style.display = 'block';
    document.getElementById('card-categoria-edit').scrollIntoView({ behavior:'smooth', block:'nearest' });
  }).catch(function(e) { notify('Error al cargar categoría: ' + e.message, 'error'); });
}
function actualizarCategoria(e) {
  e.preventDefault();
  var id = fv('catEditId'), btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.put('/categoria/' + id, { nombre_categoria:fv('catEditNombre'), precio:parseFloat(fv('catEditPrecio'))||0, horas_teoricas:fv('catEditHT'), horas_practicas:fv('catEditHP') })
    .then(function() { notify('Categoría actualizada', 'success'); document.getElementById('card-categoria-edit').style.display='none'; loadCategorias(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function eliminarCategoria(id) {
  console.log('[CEA] eliminarCategoria — id:', id);
  CEAConfirm('¿Deseas eliminar esta categoría? Los matriculados asociados quedarán sin categoría.', function() {
    console.log('[CEA] DELETE /categoria/' + id);
    notify('Eliminando categoría...', 'info');
    API.del('/categoria/' + id)
      .then(function() { console.log('[CEA] Categoría eliminada OK'); notify('Categoría eliminada', 'success'); loadCategorias(); })
      .catch(function(e) { console.error('[CEA] Error al eliminar categoría:', e); notify(e.message, 'error'); });
  }, { title: '¿Eliminar categoría?' });
}

// ─── MATRICULADOS ──────────────────────────────────────────────
var _cliMap = {}, _catMap = {};
function loadMatriculados() {
  showLoading('tbl-matriculado-body', 5);
  Promise.all([API.get('/matriculados'), API.get('/cliente'), API.get('/categoria')]).then(function(res) {
    var mats = res[0], clis = res[1], cats = res[2];
    clis.forEach(function(c) { _cliMap[c.id] = (c.nombre||'') + ' ' + (c.apellido||''); });
    cats.forEach(function(c) { _catMap[c.id] = c.nombre_categoria || c.id; });
    var tbody = document.getElementById('tbl-matriculado-body');
    if (!tbody) return;
    if (!mats.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3"><span class="material-symbols-rounded" style="font-size:32px;display:block;margin-bottom:8px;color:var(--md-outline)">inbox</span>Sin registros aún</td></tr>';
      return;
    }
    tbody.innerHTML = mats.map(function(m) {
      var cli = _cliMap[m.id_cliente] || m.id_cliente || '-';
      var cat = _catMap[m.id_categoria] || m.id_categoria || '-';
      return '<tr data-row data-text="' + (cli + ' ' + cat).toLowerCase() + '">' +
        '<td>' + cli + '</td><td>' + cat + '</td>' +
        '<td>' + formatFechaSolo(m.fecha_inicio) + '</td>' +
        '<td>' + formatFechaSolo(m.fecha_fin) + '</td>' +
        '<td><button class="btn btn-sm btn-outline-primary me-1" onclick="editMatriculado(\'' + m.id + '\')">Editar</button>' +
        '<button class="btn btn-sm btn-outline-danger" onclick="eliminarMatriculado(\'' + m.id + '\')">Eliminar</button></td></tr>';
    }).join('');
    fillClienteSelect('mClienteCrear'); fillCategoriaSelect('mCatCrear');
    injectToolbar('tbl-matriculado-body', { placeholder: 'Buscar por nombre de estudiante o categoría...' });
  }).catch(function(e) { notify('Error cargando matriculados: ' + e.message, 'error'); });
}
function fillClienteSelect(selectId) {
  var sel = document.getElementById(selectId); if (!sel) return;
  sel.innerHTML = '<option value="">-- Selecciona cliente --</option>';
  Object.keys(_cliMap).forEach(function(id) { sel.innerHTML += '<option value="' + id + '">' + _cliMap[id] + '</option>'; });
}
function fillCategoriaSelect(selectId) {
  var sel = document.getElementById(selectId); if (!sel) return;
  sel.innerHTML = '<option value="">-- Selecciona categoría --</option>';
  Object.keys(_catMap).forEach(function(id) { sel.innerHTML += '<option value="' + id + '">' + _catMap[id] + '</option>'; });
}
function crearMatriculado(e) {
  e.preventDefault();
  var btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.post('/matriculados', { id_cliente:fv('mClienteCrear'), id_categoria:fv('mCatCrear'), fecha_inicio:fv('mFechaInicio'), fecha_fin:fv('mFechaFin') })
    .then(function() { notify('Matrícula registrada correctamente', 'success'); clearForm('form-matriculado'); loadMatriculados(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function editMatriculado(id) {
  API.get('/matriculados/' + id).then(function(r) {
    fel('mEditId').value = r.id;
    fel('mEditFechaInicio').value = r.fecha_inicio || '';
    fel('mEditFechaFin').value = r.fecha_fin || '';
    fillClienteSelect('mEditCliente');
    fillCategoriaSelect('mEditCat');
    fel('mEditCliente').value = r.id_cliente;
    fel('mEditCat').value = r.id_categoria;
    document.getElementById('card-matriculado-edit').style.display = 'block';
    document.getElementById('card-matriculado-edit').scrollIntoView({ behavior:'smooth', block:'nearest' });
  }).catch(function(e) { notify('Error al cargar matrícula: ' + e.message, 'error'); });
}
function actualizarMatriculado(e) {
  e.preventDefault();
  var id = fv('mEditId'), btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.put('/matriculados/' + id, { id_cliente:fv('mEditCliente'), id_categoria:fv('mEditCat'), fecha_inicio:fv('mEditFechaInicio'), fecha_fin:fv('mEditFechaFin') })
    .then(function() { notify('Matrícula actualizada', 'success'); document.getElementById('card-matriculado-edit').style.display='none'; loadMatriculados(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function eliminarMatriculado(id) {
  console.log('[CEA] eliminarMatriculado — id:', id);
  CEAConfirm('¿Deseas eliminar esta matrícula? El historial de clases no se eliminará.', function() {
    console.log('[CEA] DELETE /matriculados/' + id);
    notify('Eliminando matrícula...', 'info');
    API.del('/matriculados/' + id)
      .then(function() { console.log('[CEA] Matrícula eliminada OK'); notify('Matrícula eliminada', 'success'); loadMatriculados(); })
      .catch(function(e) { console.error('[CEA] Error al eliminar matrícula:', e); notify(e.message, 'error'); });
  }, { title: '¿Eliminar matrícula?' });
}

// ─── Catálogos para asignaciones ──────────────────────────────
var _insMap = {}, _vehMap = {}, _matMap = {};
async function loadAssignmentCatalogs() {
  const [instructores, vehiculos, matriculados, clientes, categorias] =
    await Promise.all([API.get('/instructor'), API.get('/vehiculo'), API.get('/matriculados'), API.get('/cliente'), API.get('/categoria')]);
  const cliMap = {}, catMap = {};
  instructores.forEach(function(i) { _insMap[i.id] = (i.nombre||'') + ' ' + (i.apellido||'') + (i.cedula ? ' · ' + i.cedula : ''); });
  vehiculos.forEach(function(v)    { _vehMap[v.id] = (v.placa||'') + ' · ' + (v.marca||'') + ' ' + (v.modelo||''); });
  clientes.forEach(function(c)     { cliMap[c.id]  = (c.nombre||'') + ' ' + (c.apellido||''); });
  categorias.forEach(function(c)   { catMap[c.id]  = c.nombre_categoria || ''; });
  matriculados.forEach(function(m) { _matMap[m.id] = (cliMap[m.id_cliente] || m.id_cliente) + ' · ' + (catMap[m.id_categoria] || ''); });
}
function fillSelect(selectId, map, placeholder) {
  var sel = document.getElementById(selectId); if (!sel) return;
  sel.innerHTML = '<option value="">' + (placeholder||'-- Selecciona --') + '</option>';
  Object.keys(map).forEach(function(id) { sel.innerHTML += '<option value="' + id + '">' + map[id] + '</option>'; });
}
function fillAssignmentSelects(prefix) {
  fillSelect(prefix+'Ins', _insMap, '-- Instructor --');
  fillSelect(prefix+'Mat', _matMap, '-- Matriculado --');
  if (document.getElementById(prefix+'Veh')) fillSelect(prefix+'Veh', _vehMap, '-- Vehículo --');
}

// ─── CLASE PRACTICA ────────────────────────────────────────────
function loadClasePractica() {
  showLoading('tbl-cpractica-body', 6);
  loadAssignmentCatalogs().then(function() {
    fillAssignmentSelects('cp');
    API.get('/clase-practica').then(function(rows) {
      var tbody = document.getElementById('tbl-cpractica-body');
      if (!tbody) return;
      if (!rows.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3"><span class="material-symbols-rounded" style="font-size:32px;display:block;margin-bottom:8px;color:var(--md-outline)">inbox</span>Sin registros aún</td></tr>'; return; }
      tbody.innerHTML = rows.map(function(r) {
        var ins = _insMap[r.ID_instructor||r.id_instructor] || '-';
        var mat = _matMap[r.ID_matriculado||r.id_matriculado] || '-';
        var veh = _vehMap[r.ID_vehiculo||r.id_vehiculo] || '-';
        var raw = (ins+' '+mat+' '+(r.Descripcion||r.descripcion||'')).toLowerCase();
        return '<tr data-row data-text="' + raw + '">' +
          '<td>' + ins + '</td><td>' + mat + '</td><td>' + veh + '</td>' +
          '<td>' + (r.Descripcion||r.descripcion||'-') + '</td>' +
          '<td>' + formatFecha(r.fecha_clase) + '</td>' +
          '<td><button class="btn btn-sm btn-outline-danger" onclick="eliminarClasePractica(\'' + r.id + '\')">Eliminar</button></td></tr>';
      }).join('');
      injectToolbar('tbl-cpractica-body', {
        placeholder: 'Buscar por instructor o matriculado...',
        filters: [{ key:'desc', label:'Tipo de clase', options:[{v:'carretera',t:'Carretera'},{v:'ciudad',t:'Ciudad'},{v:'parqueo',t:'Parqueo'},{v:'maniobras',t:'Maniobras'}] }]
      });
    }).catch(function(e) { notify('Error cargando clases prácticas: ' + e.message, 'error'); });
  }).catch(function(e) { notify('Error cargando catálogos: ' + e.message, 'error'); });
}
function crearClasePractica(e) {
  e.preventDefault();
  var fecha = fv('cpFecha'), hora = fv('cpHora');
  if (!fecha||!hora) { notify('Selecciona fecha y hora', 'error'); return; }
  var btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.post('/clase-practica/agregar', { ID_instructor:fv('cpIns'), ID_vehiculo:fv('cpVeh'), ID_matriculado:fv('cpMat'), Descripcion:fv('cpDesc'), fecha_clase:fecha+'T'+hora+':00' })
    .then(function() { notify('Clase práctica registrada', 'success'); clearForm('form-cpractica'); loadClasePractica(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function eliminarClasePractica(id) {
  console.log('[CEA] eliminarClasePractica — id:', id);
  CEAConfirm('¿Deseas eliminar esta clase práctica del registro?', function() {
    console.log('[CEA] DELETE /clase-practica/' + id);
    notify('Eliminando clase práctica...', 'info');
    API.del('/clase-practica/' + id)
      .then(function() { console.log('[CEA] Clase práctica eliminada OK'); notify('Clase práctica eliminada', 'success'); loadClasePractica(); })
      .catch(function(e) { console.error('[CEA] Error al eliminar clase práctica:', e); notify(e.message, 'error'); });
  });
}

// ─── CLASE TEORICA ─────────────────────────────────────────────
function loadClaseTeorica() {
  showLoading('tbl-cteorica-body', 5);
  loadAssignmentCatalogs().then(function() {
    fillAssignmentSelects('ct');
    API.get('/claseteorica').then(function(rows) {
      var tbody = document.getElementById('tbl-cteorica-body');
      if (!tbody) return;
      if (!rows.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3"><span class="material-symbols-rounded" style="font-size:32px;display:block;margin-bottom:8px;color:var(--md-outline)">inbox</span>Sin registros aún</td></tr>'; return; }
      tbody.innerHTML = rows.map(function(r) {
        var ins = _insMap[r.ID_instructor||r.id_instructor] || '-';
        var mat = _matMap[r.ID_matriculado||r.id_matriculado] || '-';
        var raw = (ins+' '+mat+' '+(r.Descripcion||r.descripcion||'')).toLowerCase();
        return '<tr data-row data-text="' + raw + '">' +
          '<td>' + ins + '</td><td>' + mat + '</td>' +
          '<td>' + (r.Descripcion||r.descripcion||'-') + '</td>' +
          '<td>' + formatFecha(r.fecha_clase) + '</td>' +
          '<td><button class="btn btn-sm btn-outline-danger" onclick="eliminarClaseTeorica(\'' + r.id + '\')">Eliminar</button></td></tr>';
      }).join('');
      injectToolbar('tbl-cteorica-body', {
        placeholder: 'Buscar por instructor o matriculado...',
        filters: [{ key:'tema', label:'Tema', options:[{v:'normatividad',t:'Normatividad'},{v:'senalizacion',t:'Señalización'},{v:'mecanica',t:'Mecánica'}] }]
      });
    }).catch(function(e) { notify('Error cargando clases teóricas: ' + e.message, 'error'); });
  }).catch(function(e) { notify('Error cargando catálogos: ' + e.message, 'error'); });
}
function crearClaseTeorica(e) {
  e.preventDefault();
  var fecha = fv('ctFecha'), hora = fv('ctHora');
  if (!fecha||!hora) { notify('Selecciona fecha y hora', 'error'); return; }
  var btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.post('/claseteorica/Agregar', { ID_instructor:fv('ctIns'), ID_matriculado:fv('ctMat'), Descripcion:fv('ctDesc'), fecha_clase:fecha+'T'+hora+':00' })
    .then(function() { notify('Clase teórica registrada', 'success'); clearForm('form-cteorica'); loadClaseTeorica(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function eliminarClaseTeorica(id) {
  console.log('[CEA] eliminarClaseTeorica — id:', id);
  CEAConfirm('¿Deseas eliminar esta clase teórica del registro?', function() {
    console.log('[CEA] DELETE /claseteorica/' + id);
    notify('Eliminando clase teórica...', 'info');
    API.del('/claseteorica/' + id)
      .then(function() { console.log('[CEA] Clase teórica eliminada OK'); notify('Clase teórica eliminada', 'success'); loadClaseTeorica(); })
      .catch(function(e) { console.error('[CEA] Error al eliminar clase teórica:', e); notify(e.message, 'error'); });
  });
}

// ─── EXAMEN PRACTICO ───────────────────────────────────────────
function loadExamenPractico() {
  showLoading('tbl-epractico-body', 6);
  loadAssignmentCatalogs().then(function() {
    fillAssignmentSelects('ep');
    API.get('/examen-practico').then(function(rows) {
      var tbody = document.getElementById('tbl-epractico-body');
      if (!tbody) return;
      if (!rows.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3"><span class="material-symbols-rounded" style="font-size:32px;display:block;margin-bottom:8px;color:var(--md-outline)">inbox</span>Sin registros aún</td></tr>'; return; }
      tbody.innerHTML = rows.map(function(r) {
        var mat = _matMap[r.ID_matriculado||r.id_matriculado] || '-';
        var ins = _insMap[r.ID_instructor||r.id_instructor] || '-';
        var veh = _vehMap[r.ID_vehiculo||r.id_vehiculo] || '-';
        var res = r.resultado || '-';
        var raw = (mat+' '+ins+' '+res).toLowerCase();
        return '<tr data-row data-text="' + raw + '">' +
          '<td>' + mat + '</td><td>' + ins + '</td><td>' + veh + '</td>' +
          '<td>' + fmtResultado(res) + '</td>' +
          '<td>' + formatFecha(r.fecha_clase) + '</td>' +
          '<td><button class="btn btn-sm btn-outline-danger" onclick="eliminarExamenPractico(\'' + r.id + '\')">Eliminar</button></td></tr>';
      }).join('');
      injectToolbar('tbl-epractico-body', {
        placeholder: 'Buscar por matriculado o instructor...',
        filters: [{ key:'res', label:'Resultado', options:[{v:'aprobado',t:'Aprobado'},{v:'no aprobado',t:'No aprobado'}] }]
      });
    }).catch(function(e) { notify('Error cargando exámenes prácticos: ' + e.message, 'error'); });
  }).catch(function(e) { notify('Error cargando catálogos: ' + e.message, 'error'); });
}
function crearExamenPractico(e) {
  e.preventDefault();
  var fecha = fv('epFecha'), hora = fv('epHora');
  if (!fecha||!hora) { notify('Selecciona fecha y hora', 'error'); return; }
  var btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.post('/examen-practico/agregar', { ID_matriculado:fv('epMat'), ID_instructor:fv('epIns'), ID_vehiculo:fv('epVeh'), resultado:fv('epResultado'), fecha_clase:fecha+'T'+hora+':00' })
    .then(function() { notify('Examen práctico registrado', 'success'); clearForm('form-epractico'); loadExamenPractico(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function eliminarExamenPractico(id) {
  console.log('[CEA] eliminarExamenPractico — id:', id);
  CEAConfirm('¿Deseas eliminar este examen práctico del registro?', function() {
    console.log('[CEA] DELETE /examen-practico/' + id);
    notify('Eliminando examen práctico...', 'info');
    API.del('/examen-practico/' + id)
      .then(function() { console.log('[CEA] Examen práctico eliminado OK'); notify('Examen práctico eliminado', 'success'); loadExamenPractico(); })
      .catch(function(e) { console.error('[CEA] Error al eliminar examen práctico:', e); notify(e.message, 'error'); });
  });
}

// ─── EXAMEN TEORICO ────────────────────────────────────────────
function loadExamenTeorico() {
  showLoading('tbl-eteorico-body', 4);
  loadAssignmentCatalogs().then(function() {
    fillSelect('etMat', _matMap, '-- Matriculado --');
    API.get('/examen-teorico').then(function(rows) {
      var tbody = document.getElementById('tbl-eteorico-body');
      if (!tbody) return;
      if (!rows.length) { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3"><span class="material-symbols-rounded" style="font-size:32px;display:block;margin-bottom:8px;color:var(--md-outline)">inbox</span>Sin registros aún</td></tr>'; return; }
      tbody.innerHTML = rows.map(function(r) {
        var mat = _matMap[r.ID_matriculado||r.id_matriculado] || '-';
        var res = r.resultado || '-';
        return '<tr data-row data-text="' + (mat+' '+res).toLowerCase() + '">' +
          '<td>' + mat + '</td>' +
          '<td>' + fmtResultado(res) + '</td>' +
          '<td>' + formatFecha(r.fecha_clase) + '</td>' +
          '<td><button class="btn btn-sm btn-outline-danger" onclick="eliminarExamenTeorico(\'' + r.id + '\')">Eliminar</button></td></tr>';
      }).join('');
      injectToolbar('tbl-eteorico-body', {
        placeholder: 'Buscar por matriculado...',
        filters: [{ key:'res', label:'Resultado', options:[{v:'aprobado',t:'Aprobado'},{v:'no aprobado',t:'No aprobado'}] }]
      });
    }).catch(function(e) { notify('Error cargando exámenes teóricos: ' + e.message, 'error'); });
  }).catch(function(e) { notify('Error cargando catálogos: ' + e.message, 'error'); });
}
function crearExamenTeorico(e) {
  e.preventDefault();
  var fecha = fv('etFecha'), hora = fv('etHora');
  if (!fecha||!hora) { notify('Selecciona fecha y hora', 'error'); return; }
  var btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  API.post('/examen-teorico/agregar', { ID_matriculado:fv('etMat'), resultado:fv('etResultado'), fecha_clase:fecha+'T'+hora+':00' })
    .then(function() { notify('Examen teórico registrado', 'success'); clearForm('form-eteorico'); loadExamenTeorico(); })
    .catch(function(e) { notify(e.message, 'error'); })
    .finally(function() { btn.disabled = false; });
}
function eliminarExamenTeorico(id) {
  console.log('[CEA] eliminarExamenTeorico — id:', id);
  CEAConfirm('¿Deseas eliminar este examen teórico del registro?', function() {
    console.log('[CEA] DELETE /examen-teorico/' + id);
    notify('Eliminando examen teórico...', 'info');
    API.del('/examen-teorico/' + id)
      .then(function() { console.log('[CEA] Examen teórico eliminado OK'); notify('Examen teórico eliminado', 'success'); loadExamenTeorico(); })
      .catch(function(e) { console.error('[CEA] Error al eliminar examen teórico:', e); notify(e.message, 'error'); });
  });
}

// ─── REPORTES ──────────────────────────────────────────────────
function verReporteGerencia() {
  notify('Generando informe gerencial...', 'info');
  API.pdf('/reportes/gerencia/pdf', 'informe_gerencial_cea.pdf')
    .then(function() { notify('PDF listo — revisa la nueva pestaña', 'success'); })
    .catch(function(e) { notify('Error al generar PDF: ' + e.message, 'error'); });
}
function verCalendarioMatriculado() {
  var id = fv('reporteMatriculadoId');
  if (!id) { notify('Selecciona un estudiante primero', 'error'); return; }
  notify('Generando agenda del estudiante...', 'info');
  API.pdf('/reportes/calendario/matriculado/' + id + '/pdf', 'agenda_estudiante_cea.pdf')
    .then(function() { notify('PDF listo — revisa la nueva pestaña', 'success'); })
    .catch(function(e) { notify('Error al generar PDF: ' + e.message, 'error'); });
}
function loadReporteMatriculadoSelect() {
  loadAssignmentCatalogs().then(function() { fillSelect('reporteMatriculadoId', _matMap, '-- Selecciona estudiante --'); })
    .catch(function(e) { notify('Error cargando estudiantes: ' + e.message, 'error'); });
}

// ─── CONSULTAS ─────────────────────────────────────────────────
function loadAprobados() {
  showLoading('tbl-aprobados-body', 5);
  loadAssignmentCatalogs().then(function() {
    API.get('/examen-practico-aprobado').then(function(rows) {
      var tbody = document.getElementById('tbl-aprobados-body');
      if (!tbody) return;
      if (!rows.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Sin registros aprobados</td></tr>'; return; }
      tbody.innerHTML = rows.map(function(r) {
        var matId = r.iD_matriculados || r.ID_matriculado || r.id_matriculado || '';
        var mat = _matMap[matId] || matId || '-';
        var ins = _insMap[r.ID_instructor] || r.ID_instructor || '-';
        var veh = _vehMap[r.ID_vehiculo]   || r.ID_vehiculo   || '-';
        return '<tr data-row data-text="' + (mat+' '+ins).toLowerCase() + '">' +
          '<td>' + mat + '</td><td>' + ins + '</td><td>' + veh + '</td>' +
          '<td>' + fmtResultado(r.resultado) + '</td>' +
          '<td>' + formatFecha(r.fecha_clase) + '</td></tr>';
      }).join('');
      injectToolbar('tbl-aprobados-body', { placeholder: 'Buscar estudiante...' });
    }).catch(function(e) { notify('Error: ' + e.message, 'error'); });
  });
}
function loadReprobados() {
  showLoading('tbl-reprobados-body', 5);
  loadAssignmentCatalogs().then(function() {
    API.get('/examen-practico-reprobado').then(function(rows) {
      var tbody = document.getElementById('tbl-reprobados-body');
      if (!tbody) return;
      if (!rows.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Sin registros reprobados</td></tr>'; return; }
      tbody.innerHTML = rows.map(function(r) {
        var matId = r.iD_matriculados || r.ID_matriculado || r.id_matriculado || '';
        var mat = _matMap[matId] || matId || '-';
        var ins = _insMap[r.ID_instructor] || r.ID_instructor || '-';
        var veh = _vehMap[r.ID_vehiculo]   || r.ID_vehiculo   || '-';
        return '<tr data-row data-text="' + (mat+' '+ins).toLowerCase() + '">' +
          '<td>' + mat + '</td><td>' + ins + '</td><td>' + veh + '</td>' +
          '<td>' + fmtResultado(r.resultado) + '</td>' +
          '<td>' + formatFecha(r.fecha_clase) + '</td></tr>';
      }).join('');
      injectToolbar('tbl-reprobados-body', { placeholder: 'Buscar estudiante...' });
    }).catch(function(e) { notify('Error: ' + e.message, 'error'); });
  });
}

// ─── LOGOUT ────────────────────────────────────────────────────
function cerrarSesion() {
  CEAConfirm('¿Deseas cerrar la sesión actual?', function() {
    localStorage.removeItem('cea_auth');
    localStorage.removeItem('cea_admin_user');
    window.location.href = 'login.html';
  }, { title: 'Cerrar sesión', okLabel: 'Cerrar sesión', okClass: 'md-btn-filled' });
}

// ─── PROGRESO DEL ESTUDIANTE ───────────────────────────────────
function loadProgreso() {
  loadAssignmentCatalogs().then(function() {
    fillSelect('progresoSelect', _matMap, '-- Selecciona un estudiante --');
    document.getElementById('progreso-resultado').style.display = 'none';
  }).catch(function(e) { notify('Error cargando estudiantes: ' + e.message, 'error'); });
}

function verProgreso() {
  var id = fv('progresoSelect');
  if (!id) { notify('Selecciona un estudiante primero', 'error'); return; }

  var res = document.getElementById('progreso-resultado');
  res.style.display = 'block';
  res.innerHTML = '<div style="padding:32px;text-align:center"><div class="skeleton-cell" style="width:60%;margin:0 auto 12px"></div><div class="skeleton-cell" style="width:40%;margin:0 auto"></div></div>';

  API.get('/matriculados/' + id + '/progreso').then(function(d) {
    var cat   = d.categoria || {};
    var cli   = d.cliente   || {};
    var ht    = cat.horas_teoricas  || 0;
    var hp    = cat.horas_practicas || 0;
    var ct    = d.clases_teoricas_completadas  || 0;
    var cp    = d.clases_practicas_completadas || 0;
    var etOk  = d.examen_teorico_aprobado;
    var epOk  = d.examen_practico_aprobado;
    var pct   = d.porcentaje_completado || 0;
    var listo = d.listo_para_licencia;

    var pctT = ht > 0 ? Math.min(100, Math.round((ct / ht) * 100)) : (ct > 0 ? 100 : 0);
    var pctP = hp > 0 ? Math.min(100, Math.round((cp / hp) * 100)) : (cp > 0 ? 100 : 0);

    function bar(pct2, label) {
      var cls = pct2 >= 100 ? 'complete' : pct2 >= 50 ? '' : 'warning';
      return '<div class="progress-track"><div class="progress-fill ' + cls + '" style="width:' + pct2 + '%"></div></div>' +
        '<div class="progress-label">' + label + '</div>';
    }

    function examRow(nombre, ok, historial) {
      var hist = historial || [];
      var ultima = hist.length ? (' · Último: ' + formatFecha(hist[hist.length-1].fecha)) : '';
      return '<div class="exam-row">' +
        '<div><div class="exam-name">' + nombre + '</div>' +
        '<div class="exam-hist">' + hist.length + ' intento(s)' + ultima + '</div></div>' +
        (ok
          ? '<span class="status-badge status-ok"><span class="material-symbols-rounded">check_circle</span>Aprobado</span>'
          : (hist.length
              ? '<span class="status-badge status-off"><span class="material-symbols-rounded">cancel</span>No aprobado</span>'
              : '<span class="status-badge status-neutral"><span class="material-symbols-rounded">schedule</span>Pendiente</span>')) +
        '</div>';
    }

    // Resumen de pendientes
    var pendientes = [];
    if (ct < ht) pendientes.push((ht - ct) + ' clase' + (ht-ct>1?'s':'') + ' teórica' + (ht-ct>1?'s':'') + ' por tomar');
    if (cp < hp) pendientes.push((hp - cp) + ' clase' + (hp-cp>1?'s':'') + ' práctica' + (hp-cp>1?'s':'') + ' por tomar');
    if (!etOk)   pendientes.push('aprobar examen teórico');
    if (!epOk)   pendientes.push('aprobar examen práctico');

    // Círculo SVG de progreso
    var r = 42, circ = 2 * Math.PI * r;
    var offset = circ - (pct / 100) * circ;
    var circColor = listo ? '#2E7D32' : pct >= 70 ? 'var(--md-primary)' : '#F57C00';

    res.innerHTML =
      // Header
      '<div class="progreso-header">' +
        '<div class="progreso-avatar"><span class="material-symbols-rounded" style="font-size:30px">person</span></div>' +
        '<div>' +
          '<div class="progreso-nombre">' + (cli.nombre||'') + ' ' + (cli.apellido||'') + '</div>' +
          '<div class="progreso-cat">Categoría ' + (cat.nombre||'-') + ' &nbsp;·&nbsp; C.C. ' + (cli.cedula||'-') + '</div>' +
          (d.fecha_inicio ? '<div class="progreso-cat">Matrícula: ' + formatFechaSolo(d.fecha_inicio) + (d.fecha_fin ? ' → ' + formatFechaSolo(d.fecha_fin) : '') + '</div>' : '') +
        '</div>' +
      '</div>' +

      // Progreso general
      '<div class="progreso-general">' +
        '<div class="circle-wrap">' +
          '<svg width="100" height="100" viewBox="0 0 100 100">' +
            '<circle class="circle-bg" cx="50" cy="50" r="' + r + '"/>' +
            '<circle class="circle-fill" cx="50" cy="50" r="' + r + '" stroke="' + circColor + '" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '"/>' +
          '</svg>' +
          '<div class="circle-text">' + pct + '%</div>' +
        '</div>' +
        '<div class="progreso-general-info">' +
          '<h3>' + (listo ? '¡Listo para la licencia!' : 'En progreso') + '</h3>' +
          '<p>' + (listo
            ? 'El estudiante ha completado todos los requisitos del programa.'
            : 'Pendiente: ' + (pendientes.length ? pendientes.join(', ') + '.' : 'en revisión.')) + '</p>' +
        '</div>' +
      '</div>' +

      // Grid de clases
      '<div class="progreso-grid">' +
        '<div class="progreso-card">' +
          '<div class="progreso-card-title"><span class="material-symbols-rounded">menu_book</span>Clases Teóricas</div>' +
          '<div class="progreso-nums"><span class="progreso-num-big">' + ct + '</span><span class="progreso-num-of">de</span><span class="progreso-num-big" style="color:var(--md-on-surface-variant);font-size:22px">' + ht + '</span><span class="progreso-num-unit">clases</span></div>' +
          bar(pctT, ct >= ht ? '✓ Completadas' : (ht - ct) + ' clase(s) restante(s)') +
        '</div>' +
        '<div class="progreso-card">' +
          '<div class="progreso-card-title"><span class="material-symbols-rounded">route</span>Clases Prácticas</div>' +
          '<div class="progreso-nums"><span class="progreso-num-big">' + cp + '</span><span class="progreso-num-of">de</span><span class="progreso-num-big" style="color:var(--md-on-surface-variant);font-size:22px">' + hp + '</span><span class="progreso-num-unit">clases</span></div>' +
          bar(pctP, cp >= hp ? '✓ Completadas' : (hp - cp) + ' clase(s) restante(s)') +
        '</div>' +
      '</div>' +

      // Exámenes
      '<div class="cea-card" style="margin-bottom:20px">' +
        '<div class="cea-card-title"><span class="material-symbols-rounded" style="font-size:16px">fact_check</span>Estado de Exámenes</div>' +
        examRow('Examen Teórico',  etOk, d.historial_examenes_teoricos)  +
        examRow('Examen Práctico', epOk, d.historial_examenes_practicos) +
      '</div>' +

      // Banner final
      (listo
        ? '<div class="listo-banner"><span class="material-symbols-rounded">workspace_premium</span>El estudiante cumple todos los requisitos para tramitar su licencia de conducción.</div>'
        : '<div class="pendiente-banner"><span class="material-symbols-rounded">info</span><div>Para obtener la licencia, el estudiante debe completar <strong>' + pendientes.join('</strong>, <strong>') + '</strong>.</div></div>');

  }).catch(function(e) {
    res.innerHTML = '<div class="pendiente-banner"><span class="material-symbols-rounded">error</span>Error al cargar el progreso: ' + e.message + '</div>';
  });
}

// ─── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Modal confirm
  document.getElementById('cea-modal-ok').addEventListener('click', function() {
    var cb = _modalCb;          // guardar ANTES de _modalClose (que lo pone a null)
    console.log('[CEA] Modal OK — callback guardado:', typeof cb);
    _modalClose();
    if (cb) {
      console.log('[CEA] Ejecutando callback de confirmación...');
      cb();
    } else {
      console.warn('[CEA] No había callback registrado');
    }
  });
  document.getElementById('cea-modal-cancel').addEventListener('click', _modalClose);
  document.getElementById('cea-modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) _modalClose();
  });

  openSection('dashboard');
  document.querySelectorAll('.sidebar-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      var sec = link.getAttribute('data-section');
      openSection(sec);
      var loaders = {
        dashboard:    loadDashboard,
        instructores: loadInstructores,
        clientes:     loadClientes,
        vehiculos:    loadVehiculos,
        categorias:   loadCategorias,
        matriculados: loadMatriculados,
        cpractica:    loadClasePractica,
        cteorica:     loadClaseTeorica,
        epractico:    loadExamenPractico,
        eteorico:     loadExamenTeorico,
        progreso:     loadProgreso,
        reportes:     loadReporteMatriculadoSelect,
        consultas:    function() { loadAprobados(); loadReprobados(); }
      };
      if (loaders[sec]) loaders[sec]();
    });
  });
});
