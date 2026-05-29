(function () {
  var API_BASE = window.CEA_API_BASE || "http://localhost:8081";
  var activeModuleId = null;
  var activePaneByModule = {};
  var listRefreshers = {};
  var modulesRef = [];
  var paneTabsRef = null;
  var resourceCache = {};
  var paneHomeById = {};
  var crudModal = null;
  var crudModalTitle = null;
  var crudModalBody = null;
  var activeCrudPane = null;
  var deleteConfirmModal = null;
  var deleteConfirmMessage = null;
  var deleteConfirmAccept = null;
  var pendingDeleteHandler = "";
  var crudFormMap = {
    instructor: { edit: "idInstructorActualizar", del: "cedulaInstructorEliminar" },
    "clase-practica": { edit: "idClaseActualizar", del: "idClaseEliminar" },
    claseteorica: { edit: "idClaseTActualizar", del: "idClaseTEliminar" },
    vehiculo: { edit: "id", del: "idVehiculoEliminar" },
    categoria: { edit: "idCategoriaActualizar", del: "idCategoriaEliminar" },
    "examen-practico": { edit: "idExamenPrcticoActualizar", del: "idExamenEliminar" },
    "examen-teorico": { edit: "idExamenTericoActualizar", del: "idExamenTEliminar" },
    matriculados: { edit: "idMatriculadoActualizar", del: "idMatriculadoEliminar" },
    cliente: { edit: "idClienteActualizar", del: "idClienteEliminar" }
  };
  var editFieldMap = {
    instructor: [
      { inputIds: ["nombreInstructorActualizar"], keys: ["nombre"] },
      { inputIds: ["apellidoInstructorActualizar"], keys: ["apellido"] },
      { inputIds: ["correoInstructorActualizar"], keys: ["correo"] },
      { inputIds: ["telefonoInstructorActualizar"], keys: ["telefono"] },
      { inputIds: ["cedulaInstructorActualizar"], keys: ["cedula"] },
      { inputIds: ["tipoInstructorActualizar"], keys: ["tipo_instructor"] },
      { inputIds: ["disponibilidadInstructorActualizar"], keys: ["disponibilidad"] }
    ],
    "clase-practica": [
      { inputIds: ["instructorActualizar"], keys: ["ID_instructor", "id_instructor"] },
      { inputIds: ["vehiculoActualizar"], keys: ["ID_vehiculo", "id_vehiculo"] },
      { inputIds: ["matriculadoActualizar"], keys: ["ID_matriculado", "id_matriculado"] },
      { inputIds: ["descripcionActualizar"], keys: ["Descripcion", "descripcion"] }
    ],
    claseteorica: [
      { inputIds: ["instructorTActualizar"], keys: ["instructor", "ID_instructor", "id_instructor"] },
      { inputIds: ["matriculadoTActualizar"], keys: ["matriculado", "ID_matriculado", "id_matriculado"] },
      { inputIds: ["descripcionTActualizar"], keys: ["descripcion", "Descripcion"] }
    ],
    vehiculo: [
      { inputIds: ["placaActualizar"], keys: ["placa"] },
      { inputIds: ["modeloActualizar"], keys: ["modelo"] },
      { inputIds: ["tipoVehiculoActualizar"], keys: ["tipo_vehiculo"] },
      { inputIds: ["marcaActualizar"], keys: ["marca"] },
      { inputIds: ["nivelVehiculoActualizar"], keys: ["nivel_vehiculo"] },
      { inputIds: ["disponibilidadActualizar"], keys: ["disponibilidad"] }
    ],
    categoria: [
      { inputIds: ["nombreCategoriaActualizar"], keys: ["nombre_categoria"] },
      { inputIds: ["precioActualizar"], keys: ["precio"] },
      { inputIds: ["horasTeoricasActualizar"], keys: ["horas_teoricas"] },
      { inputIds: ["horasPracticasActualizar"], keys: ["horas_practicas"] }
    ],
    "examen-practico": [
      { inputIds: ["matriculadoActualizarP"], keys: ["matriculado", "ID_matriculado", "id_matriculado"] },
      { inputIds: ["instructorActualizarP"], keys: ["instructor", "ID_instructor", "id_instructor"] },
      { inputIds: ["vehiculoActualizarP"], keys: ["vehiculo", "ID_vehiculo", "id_vehiculo"] },
      { inputIds: ["resultadoActualizarP"], keys: ["resultado"] }
    ],
    "examen-teorico": [
      { inputIds: ["matriculadoTActualizarT"], keys: ["matriculado", "ID_matriculado", "id_matriculado"] },
      { inputIds: ["resultadoTActualizar"], keys: ["resultado"] }
    ],
    matriculados: [
      { inputIds: ["clienteActualizar"], keys: ["id_cliente", "cliente"] },
      { inputIds: ["categoriaActualizar"], keys: ["id_categoria", "categoria"] },
      { inputIds: ["fechaInicioActualizar"], keys: ["fecha_inicio"] },
      { inputIds: ["fechaFinActualizar"], keys: ["fecha_fin"] }
    ],
    cliente: [
      { inputIds: ["nombreActualizar"], keys: ["nombre"] },
      { inputIds: ["apellidoActualizar"], keys: ["apellido"] },
      { inputIds: ["telefonoActualizar"], keys: ["telefono"] },
      { inputIds: ["correoActualizar"], keys: ["correo"] },
      { inputIds: ["cedulaActualizar"], keys: ["cedula"] }
    ]
  };
  var calendarRoot = null;
  var calendarInstance = null;
  var fullCalendarReadyPromise = null;
  var calendarEntityRows = [];
  var reportStudentRows = [];
  var reportsModuleBound = false;

  document.addEventListener("DOMContentLoaded", function () {
    if (!enforceAdminSession()) return;
    normalizeBrokenText(document.body);
    removeLegacyBlocks();
    buildCrudDashboard();
    bindAutoRefreshAfterCrud();
    ensureCrudModal();
    ensureDeleteConfirmModal();
    injectAdminFooter();
  });

  function enforceAdminSession() {
    try {
      var raw = localStorage.getItem("cea_auth");
      if (!raw) {
        window.location.href = "login.html";
        return false;
      }
      var auth = JSON.parse(raw);
      if (!auth || auth.ok !== true) {
        window.location.href = "login.html";
        return false;
      }
      var maxAgeMs = 12 * 60 * 60 * 1000;
      var at = Number(auth.at || 0);
      if (!at || Date.now() - at > maxAgeMs) {
        localStorage.removeItem("cea_auth");
        localStorage.removeItem("cea_admin_user");
        window.location.href = "login.html";
        return false;
      }
      return true;
    } catch (_error) {
      window.location.href = "login.html";
      return false;
    }
  }

  function normalizeBrokenText(root) {
    var replacements = {
      "\u00C3\u00A1": "á", "\u00C3\u00A9": "é", "\u00C3\u00AD": "í", "\u00C3\u00B3": "ó", "\u00C3\u00BA": "ú", "\u00C3\u00B1": "ñ",
      "\u00C3\u0081": "Á", "\u00C3\u0089": "É", "\u00C3\u008D": "Í", "\u00C3\u0093": "Ó", "\u00C3\u009A": "Ú", "\u00C3\u0091": "Ñ",
      "\u00EF\u00BF\u00BD": "",
      "Sesi?n": "Sesión", "Descripci?n": "Descripción", "Aqu?": "Aquí", "Gesti?n": "Gestión",
      "Pr?ctica": "Práctica", "Pr?ctico": "Práctico", "Pr?cticas": "Prácticas",
      "Te?rica": "Teórica", "Te?rico": "Teórico", "Te?ricas": "Teóricas",
      "Veh?culo": "Vehículo", "Veh?culos": "Vehículos",
      "Categor?a": "Categoría", "Matr?cula": "Matrícula", "Tel?fono": "Teléfono", "C?dula": "Cédula"
    };

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var value = node.nodeValue;
      var updated = value;
      Object.keys(replacements).forEach(function (key) {
        updated = updated.split(key).join(replacements[key]);
      });
      if (updated !== value) node.nodeValue = updated;
    }
  }

  function removeLegacyBlocks() {
    ["selectConsulta", "tipo-datos", "tabla-container"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var container = el.closest(".container");
      if (container) container.remove();
    });
  }

  function buildCrudDashboard() {
    var managementTitle = Array.from(document.querySelectorAll("h1")).find(function (node) {
      var t = node.textContent.toLowerCase();
      return t.indexOf("gestión") >= 0 || t.indexOf("gestion") >= 0;
    });
    if (!managementTitle) return;

    managementTitle.textContent = "Panel de Operaciones";

    var managementContainer = managementTitle.closest(".container");
    if (!managementContainer) return;

    var cardBody = managementContainer.querySelector(".card .card-body");
    var host = cardBody || managementContainer;

    var moduleButtons = Array.from(managementContainer.querySelectorAll("button[data-target^='#formularios']"));
    if (!moduleButtons.length) return;

    var modules = [];

    moduleButtons.forEach(function (btn, index) {
      var target = btn.getAttribute("data-target");
      var collapse = managementContainer.querySelector(target);
      if (!collapse) return;

      var moduleLabel = cleanText(btn.textContent.trim());
      var moduleId = "module-" + index;
      var endpoint = moduleEndpoint(moduleLabel);

      btn.style.display = "none";
      collapse.classList.remove("collapse", "show");
      collapse.classList.add("crud-module-window", "window-hidden");
      collapse.id = moduleId;

      var heading = document.createElement("div");
      heading.className = "section-heading";
      heading.innerHTML = "<h3><i class='fa fa-cube'></i> " + moduleLabel + "</h3>";
      collapse.insertBefore(heading, collapse.firstChild);

      var row = collapse.querySelector(".row");
      var panes = [];
      if (row) {
        row.classList.add("module-forms");
        var cols = Array.from(row.children).filter(function (child) {
          return child.classList.contains("col-md-4");
        });

        cols.forEach(function (col, idx) {
          col.classList.add("crud-pane", "window-hidden");
          col.classList.remove("col-md-4");
          col.classList.add("col-12");

          var paneLabel = cleanText((col.querySelector("h5") || { textContent: "Ventana " + (idx + 1) }).textContent.trim());
          var paneId = moduleId + "-pane-" + idx;
          col.id = paneId;
          paneHomeById[paneId] = row;

          if (paneLabel.toLowerCase().indexOf("eliminar") >= 0) {
            setupDeletePane(col);
          }

          panes.push({ id: paneId, label: paneLabel });
        });
      }

      var listPanel = document.createElement("div");
      listPanel.className = "module-list-panel";
      listPanel.innerHTML =
        '<div class="module-list-header">' +
        "<h4>Listado en tiempo real</h4>" +
        '<div class="module-list-actions"><button type="button" class="btn btn-sm btn-primary open-create">Agregar</button></div>' +
        "</div>" +
        '<div class="module-list-body"><table class="table table-striped table-sm" id="table-' + moduleId + '"></table></div>';
      var workspace = document.createElement("div");
      workspace.className = "module-workspace";

      var listColumn = document.createElement("div");
      listColumn.className = "module-list-column";
      listColumn.appendChild(listPanel);

      var formsColumn = document.createElement("div");
      formsColumn.className = "module-forms-column";
      if (row) formsColumn.appendChild(row);

      workspace.appendChild(listColumn);
      workspace.appendChild(formsColumn);
      collapse.appendChild(workspace);

      var refresh = function () { fetchResourceList(endpoint, "table-" + moduleId); };
      listRefreshers[moduleId] = refresh;
      listPanel.querySelector(".open-create").addEventListener("click", function () {
        openCrudSubmenu(moduleId, endpoint, "create", "");
      });

      modules.push({ id: moduleId, label: moduleLabel, endpoint: endpoint, panes: panes, element: collapse, icon: moduleIcon(moduleLabel) });
    });

    var calendarModule = buildCalendarModule();
    if (calendarModule) {
      host.appendChild(calendarModule.element);
      modules.push(calendarModule);
    }

    var reportsModule = buildReportsModule();
    if (reportsModule) {
      host.appendChild(reportsModule.element);
      modules.push(reportsModule);
    }

    if (!modules.length) return;
    modulesRef = modules;

    renderSidebarLayout(managementContainer, host, modules);
    showModule(modules, modules[0].id);
  }

  function renderSidebarLayout(managementContainer, cardBody, modules) {
    managementContainer.classList.remove("container", "mt-5");
    managementContainer.classList.add("admin-content-host");

    var shell = document.createElement("div");
    shell.className = "admin-shell";
    var profile = getAdminProfile();

    var sidebar = document.createElement("aside");
    sidebar.className = "admin-sidebar";
    sidebar.innerHTML =
      '<div class="sidebar-header">' +
      '  <div class="sidebar-brand">' +
      '    <button type="button" class="brand-logo" id="profileToggle" aria-label="Perfil">CEA</button>' +
      '    <span class="brand-text">Administración</span>' +
      "  </div>" +
      '  <button class="sidebar-toggle" id="sidebarToggle" type="button" aria-label="Colapsar menú"><i class="fa fa-bars"></i></button>' +
      "</div>" +
      '<div class="sidebar-account-panel" id="sidebarAccountPanel">' +
      '  <div class="sidebar-profile-name">' + profile.username + "</div>" +
      '  <div class="sidebar-profile-role">' + profile.role + "</div>" +
      '  <button class="sidebar-logout-top" id="sidebarLogoutTop" type="button"><i class="fa fa-sign-out-alt"></i><span>Cerrar sesión</span></button>' +
      "</div>" +
      '<div class="sidebar-search">' +
      '  <i class="fa fa-search"></i>' +
      '  <input id="sidebarSearch" type="text" placeholder="Buscar módulo...">' +
      "</div>" +
      '<ul class="sidebar-menu" id="moduleMenu"></ul>';

    var main = document.createElement("main");
    main.className = "admin-main";

    var header = document.createElement("div");
    header.className = "admin-main-header";
    header.innerHTML =
      '<button class="main-toggle" id="mobileMenuToggle" type="button" aria-label="Abrir menú"><i class="fa fa-bars"></i></button>' +
      '<div class="main-heading"><h2>Dashboard Administrativo</h2><p>Navega por módulos y subventanas de trabajo</p></div>';

    var paneTabs = document.createElement("div");
    paneTabs.className = "subwindow-nav";
    paneTabs.id = "paneTabs";
    paneTabsRef = paneTabs;

    cardBody.prepend(paneTabs);

    main.appendChild(header);
    main.appendChild(managementContainer);

    shell.appendChild(sidebar);
    shell.appendChild(main);

    var nav = document.querySelector(".navbar");
    if (nav) {
      document.body.classList.add("admin-no-topbar");
      nav.remove();
    }
    document.body.prepend(shell);

    var menu = sidebar.querySelector("#moduleMenu");
    modules.forEach(function (module) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sidebar-item";
      btn.dataset.module = module.id;
      btn.innerHTML = "<i class='" + module.icon + "'></i><span>" + module.label + "</span>";
      btn.addEventListener("click", function () {
        showModule(modulesRef, module.id);
        if (window.innerWidth <= 991) shell.classList.remove("sidebar-open");
      });
      li.appendChild(btn);
      menu.appendChild(li);
    });

    var sidebarToggle = sidebar.querySelector("#sidebarToggle");
    var profileToggle = sidebar.querySelector("#profileToggle");
    var accountPanel = sidebar.querySelector("#sidebarAccountPanel");
    var sidebarLogoutTop = sidebar.querySelector("#sidebarLogoutTop");
    var mobileMenuToggle = main.querySelector("#mobileMenuToggle");
    sidebarToggle.addEventListener("click", function () {
      if (window.innerWidth <= 991) {
        shell.classList.toggle("sidebar-open");
      } else {
        shell.classList.toggle("sidebar-collapsed");
      }
    });
    mobileMenuToggle.addEventListener("click", function () {
      shell.classList.toggle("sidebar-open");
    });
    profileToggle.addEventListener("click", function () {
      accountPanel.classList.toggle("open");
    });
    sidebarLogoutTop.addEventListener("click", function () {
      localStorage.removeItem("cea_auth");
      localStorage.removeItem("cea_admin_user");
      window.location.href = "index.html";
    });
    document.addEventListener("click", function (event) {
      if (!accountPanel || !accountPanel.classList.contains("open")) return;
      var insidePanel = event.target.closest("#sidebarAccountPanel");
      var insideToggle = event.target.closest("#profileToggle");
      if (!insidePanel && !insideToggle) accountPanel.classList.remove("open");
    });

    var search = sidebar.querySelector("#sidebarSearch");
    search.addEventListener("input", function () {
      var term = search.value.toLowerCase().trim();
      menu.querySelectorAll(".sidebar-item").forEach(function (item) {
        var show = item.textContent.toLowerCase().indexOf(term) >= 0;
        item.parentElement.style.display = show ? "block" : "none";
      });
    });
  }

  function showModule(modules, moduleId) {
    activeModuleId = moduleId;

    modules.forEach(function (m) {
      var active = m.id === moduleId;
      m.element.classList.toggle("window-active", active);
      m.element.classList.toggle("window-hidden", !active);
    });

    document.querySelectorAll(".sidebar-item, .top-module-item").forEach(function (item) {
      item.classList.toggle("active", item.dataset.module === moduleId);
    });

    var module = modules.find(function (m) { return m.id === moduleId; });
    if (!module) return;

    renderPaneTabs(module);
    var initialPane = module.panes[0] ? module.panes[0].id : "";
    activePaneByModule[moduleId] = initialPane;
    if (moduleId === "module-calendar" || moduleId === "module-reportes") {
      showPane(moduleId, initialPane);
    } else {
      showPane(moduleId, "");
    }

    if (listRefreshers[moduleId]) listRefreshers[moduleId]();
    if (moduleId === "module-calendar") refreshCalendarModule();
    if (moduleId === "module-reportes") {
      bindReportsModule();
      hydrateReportStudentSearch();
    }
  }

  function renderPaneTabs(module) {
    if (!paneTabsRef) return;
    paneTabsRef.innerHTML = "";
    paneTabsRef.style.display = "none";
  }

  function showPane(moduleId, paneId) {
    var module = document.getElementById(moduleId);
    if (!module) return;

    module.querySelectorAll(".crud-pane").forEach(function (pane) {
      var active = pane.id === paneId;
      pane.classList.toggle("window-active", active);
      pane.classList.toggle("window-hidden", !active);
    });

    if (paneTabsRef) {
      paneTabsRef.querySelectorAll(".subwindow-tab").forEach(function (tab) {
        tab.classList.toggle("active", tab.dataset.pane === paneId);
      });
    }
  }

  function fetchResourceList(endpoint, tableId) {
    if (!endpoint) return;
    var table = document.getElementById(tableId);
    if (!table) return;
    var moduleId = tableId.replace("table-", "");
    table.innerHTML = '<tbody><tr><td class="loading-cell">Cargando datos...</td></tr></tbody>';

    fetch(API_BASE + "/" + endpoint)
      .then(function (response) { return response.json(); })
      .then(function (data) { return enrichRowsForDisplay(endpoint, data); })
      .then(function (data) { renderTable(table, data, moduleId, endpoint); })
      .catch(function () { table.innerHTML = "<tbody><tr><td>Error cargando datos</td></tr></tbody>"; });
  }

  function getResource(resource) {
    if (resourceCache[resource]) return Promise.resolve(resourceCache[resource]);
    return fetch(API_BASE + "/" + resource)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        resourceCache[resource] = Array.isArray(rows) ? rows : [];
        return resourceCache[resource];
      });
  }

  function getResourceItemById(resource, id) {
    return getResource(resource).then(function (rows) {
      var target = String(id);
      return (rows || []).find(function (row) {
        return String(row.id) === target;
      }) || null;
    });
  }

  function getFirstValue(row, keys) {
    if (!row) return "";
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return "";
  }

  function setFieldValueByIds(inputIds, value) {
    var raw = value == null ? "" : value;
    for (var i = 0; i < inputIds.length; i += 1) {
      var input = document.getElementById(inputIds[i]);
      if (!input) continue;
      if (input.type === "date") {
        var text = String(raw);
        input.value = text ? text.slice(0, 10) : "";
      } else {
        input.value = String(raw);
        if (window.smartSetSelectValue) {
          window.smartSetSelectValue(input.id, raw);
        }
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
  }

  function fillEditForm(endpoint, row) {
    var mappings = editFieldMap[endpoint] || [];
    mappings.forEach(function (mapItem) {
      var value = getFirstValue(row, mapItem.keys || []);
      setFieldValueByIds(mapItem.inputIds || [], value);
    });
  }

  function buildCalendarModule() {
    var moduleId = "module-calendar";
    var paneId = moduleId + "-pane-0";
    var wrapper = document.createElement("div");
    wrapper.className = "crud-module-window window-hidden";
    wrapper.id = moduleId;
    wrapper.innerHTML =
      '<div class="section-heading"><h3><i class="fa fa-calendar-alt"></i> Calendario</h3></div>' +
      '<div id="' + paneId + '" class="crud-pane window-active">' +
      '  <div class="card"><div class="card-body">' +
      '    <div class="row g-2">' +
      '      <div class="col-md-3"><label>Vista</label><select id="calView" class="form-control"><option value="instructor">Instructor</option><option value="matriculado">Matriculado</option></select></div>' +
      '      <div class="col-md-5">' +
      '        <label>Persona</label>' +
      '        <input id="calEntitySearch" type="text" class="form-control" placeholder="Buscar persona...">' +
      '        <input id="calEntity" type="hidden" value="">' +
      '        <div id="calEntityResults" class="calendar-entity-results"></div>' +
      "      </div>" +
      '      <div class="col-md-2"><label>Fecha inicio</label><input id="calFrom" type="date" class="form-control"></div>' +
      '      <div class="col-md-2"><label>Fecha fin</label><input id="calTo" type="date" class="form-control"></div>' +
      "    </div>" +
      '    <div style="margin-top:10px;"><button id="calRefresh" type="button" class="btn btn-primary btn-sm">Ver agenda</button></div>' +
      "  </div></div>" +
      '  <div class="module-list-panel">' +
      '    <div class="module-list-header"><h4>Agenda programada</h4></div>' +
      '    <div id="calendarView" style="min-height:680px;"></div>' +
      '    <div id="calendarStatus" class="calendar-status"></div>' +
      "  </div>" +
      "</div>";

    return {
      id: moduleId,
      label: "Calendario",
      endpoint: "",
      panes: [{ id: paneId, label: "Agenda" }],
      element: wrapper,
      icon: "fa fa-calendar-alt"
    };
  }

  function buildReportsModule() {
    var moduleId = "module-reportes";
    var paneId = moduleId + "-pane-0";
    var wrapper = document.createElement("div");
    wrapper.className = "crud-module-window window-hidden";
    wrapper.id = moduleId;
    wrapper.innerHTML =
      '<div class="section-heading"><h3><i class="fa fa-file-alt"></i> Reportes</h3></div>' +
      '<div id="' + paneId + '" class="crud-pane window-active">' +
      '  <div class="card"><div class="card-body">' +
      '    <div class="report-grid">' +
      '      <div class="report-card">' +
      "        <h4>Informe Gerencial</h4>" +
      "        <p>Resumen ejecutivo con KPIs, calidad académica e ingresos estimados.</p>" +
      '        <div class="report-actions">' +
      '          <button id="btnReportMgmtPdf" type="button" class="btn btn-sm btn-primary">Abrir PDF</button>' +
      "        </div>" +
      "      </div>" +
      '      <div class="report-card">' +
      "        <h4>Calendario por Estudiante</h4>" +
      "        <p>Genera PDF con las clases y exámenes programados del matriculado.</p>" +
      '        <div class="report-field">' +
      '          <label for="reportStudentSearch">Estudiante</label>' +
      '          <input id="reportStudentSearch" type="text" class="form-control" placeholder="Buscar por nombre, cédula o categoría...">' +
      '          <input id="reportStudentId" type="hidden" value="">' +
      '          <div id="reportStudentResults" class="calendar-entity-results"></div>' +
      "        </div>" +
      '        <div class="report-actions">' +
      '          <button id="btnReportStudentPdf" type="button" class="btn btn-sm btn-primary">Abrir PDF estudiante</button>' +
      "        </div>" +
      "      </div>" +
      "    </div>" +
      "  </div></div>" +
      "</div>";

    return {
      id: moduleId,
      label: "Reportes",
      endpoint: "",
      panes: [{ id: paneId, label: "Reportes" }],
      element: wrapper,
      icon: "fa fa-file-alt"
    };
  }

  function bindReportsModule() {
    if (reportsModuleBound) return;
    var btnPdf = document.getElementById("btnReportMgmtPdf");
    var btnStudentPdf = document.getElementById("btnReportStudentPdf");
    var studentSearch = document.getElementById("reportStudentSearch");
    var studentId = document.getElementById("reportStudentId");
    var studentResults = document.getElementById("reportStudentResults");
    if (!btnPdf || !btnStudentPdf || !studentSearch || !studentId || !studentResults) return;

    hydrateReportStudentSearch();

    studentSearch.addEventListener("input", function () {
      renderReportStudentResults(studentSearch.value || "");
    });
    studentSearch.addEventListener("focus", function () {
      renderReportStudentResults(studentSearch.value || "");
    });
    document.addEventListener("click", function (event) {
      var inside = event.target.closest("#reportStudentSearch") || event.target.closest("#reportStudentResults");
      if (!inside) studentResults.classList.remove("open");
    });

    btnPdf.addEventListener("click", function () {
      window.open(API_BASE + "/reportes/gerencia/pdf", "_blank");
    });
    btnStudentPdf.addEventListener("click", function () {
      var id = String(studentId.value || "").trim();
      if (!id) {
        if (window.showNotification) window.showNotification("Selecciona un estudiante del buscador", "warning");
        return;
      }
      window.open(API_BASE + "/reportes/calendario/matriculado/" + encodeURIComponent(id) + "/pdf", "_blank");
    });

    reportsModuleBound = true;
  }

  function hydrateReportStudentSearch() {
    reportStudentRows = [];
    return Promise.all([getResource("matriculados"), getResource("cliente"), getResource("categoria")]).then(function (resources) {
      var mats = resources[0] || [];
      var cliById = buildIndex(resources[1] || []);
      var catById = buildIndex(resources[2] || []);
      reportStudentRows = mats.map(function (m) {
        var cli = cliById[String(m.id_cliente || "")] || {};
        var cat = catById[String(m.id_categoria || "")] || {};
        var fullName = ((cli.nombre || "") + " " + (cli.apellido || "")).trim() || ("Matriculado #" + m.id);
        var category = cat.nombre_categoria || "Sin categoría";
        return {
          value: String(m.id),
          label: fullName + " · " + category,
          search: [m.id, cli.nombre, cli.apellido, cli.cedula, category].join(" ")
        };
      });
    });
  }

  function renderReportStudentResults(term) {
    var search = document.getElementById("reportStudentSearch");
    var hidden = document.getElementById("reportStudentId");
    var results = document.getElementById("reportStudentResults");
    if (!search || !hidden || !results) return;

    hidden.value = "";
    var normalized = normalizeFilterText(term || "");
    var rows = reportStudentRows.filter(function (row) {
      if (!normalized) return true;
      return normalizeFilterText(row.search || row.label || "").indexOf(normalized) >= 0;
    }).slice(0, 30);

    results.innerHTML = "";
    if (!rows.length) {
      results.classList.remove("open");
      return;
    }

    rows.forEach(function (row) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calendar-entity-item";
      btn.textContent = row.label;
      btn.addEventListener("click", function () {
        hidden.value = row.value;
        search.value = row.label;
        results.classList.remove("open");
      });
      results.appendChild(btn);
    });
    results.classList.add("open");
  }

  function parseDateSafe(value) {
    var s = String(value || "");
    if (!s) return null;
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDateTime(value) {
    var d = parseDateSafe(value);
    if (!d) return String(value || "");
    return d.toLocaleString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function refreshCalendarModule() {
    ensureFullCalendar().then(function () {
      if (calendarRoot == null) {
        calendarRoot = document.getElementById("module-calendar");
        if (!calendarRoot) return;
        bindCalendarEvents();
      }
      hydrateCalendarEntitySelect().then(renderCalendarTable);
    }).catch(function () {
      var status = document.getElementById("calendarStatus");
      if (status) status.textContent = "No se pudo cargar la librería del calendario.";
      if (window.showNotification) window.showNotification("No se pudo cargar la agenda visual", "error");
    });
  }

  function ensureFullCalendar() {
    if (window.FullCalendar) return Promise.resolve();
    if (fullCalendarReadyPromise) return fullCalendarReadyPromise;

    fullCalendarReadyPromise = new Promise(function (resolve, reject) {
      var cssId = "fc-css";
      if (!document.getElementById(cssId)) {
        var link = document.createElement("link");
        link.id = cssId;
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.css";
        document.head.appendChild(link);
      }

      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js";
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("No se pudo cargar FullCalendar")); };
      document.body.appendChild(script);
    });

    return fullCalendarReadyPromise;
  }

  function renderFullCalendar(events) {
    var host = document.getElementById("calendarView");
    if (!host) return;

    if (!calendarInstance) {
      var mobile = window.innerWidth <= 767;
      calendarInstance = new FullCalendar.Calendar(host, {
        locale: "es",
        initialView: mobile ? "dayGridMonth" : "timeGridWeek",
        headerToolbar: {
          left: "prev,next today",
          center: "title",
          right: mobile ? "timeGridWeek,dayGridMonth" : "timeGridDay,timeGridWeek,dayGridMonth,listWeek"
        },
        dayMaxEvents: true,
        dayMaxEventRows: 3,
        displayEventTime: false,
        slotMinTime: "06:00:00",
        slotMaxTime: "21:00:00",
        allDaySlot: false,
        eventTimeFormat: { hour: "2-digit", minute: "2-digit", meridiem: false },
        nowIndicator: true,
        firstDay: 1,
        slotDuration: "00:30:00",
        expandRows: true,
        stickyHeaderDates: true,
        eventClick: function (info) {
          var meta = info.event.extendedProps || {};
          var parts = [
            info.event.title,
            "Instructor: " + (meta.instructor || "-"),
            "Vehículo: " + (meta.vehiculo || "-"),
            "Categoría: " + (meta.categoria || "-")
          ];
          if (meta.detalle && meta.detalle !== "-") parts.push("Detalle: " + meta.detalle);
          if (window.showNotification) window.showNotification(parts.join(" | "), "info", 5000);
        },
        eventContent: function (arg) {
          var meta = arg.event.extendedProps || {};
          var start = arg.event.start;
          var hh = start ? String(start.getHours()).padStart(2, "0") : "";
          var mm = start ? String(start.getMinutes()).padStart(2, "0") : "";
          var hora = hh && mm ? (hh + ":" + mm) : "";
          var tipo = String(meta.tipo_corto || arg.event.title || "").trim();
          var texto = hora ? (hora + " · " + tipo) : tipo;
          return { html: '<span class="fc-event-compact">' + texto + "</span>" };
        },
        height: 680
      });
      calendarInstance.render();
      window.addEventListener("resize", function () {
        if (!calendarInstance) return;
        var isMobile = window.innerWidth <= 767;
        calendarInstance.setOption("headerToolbar", {
          left: "prev,next today",
          center: "title",
          right: isMobile ? "timeGridWeek,dayGridMonth" : "timeGridDay,timeGridWeek,dayGridMonth,listWeek"
        });
      });
    }

    calendarInstance.removeAllEventSources();
    calendarInstance.addEventSource(events || []);
    if (events && events.length) {
      calendarInstance.gotoDate(events[0].start);
    }
  }

  function colorByType(tipo) {
    if (tipo === "Clase práctica") return "#d81324";
    if (tipo === "Clase teórica") return "#0b2a67";
    if (tipo === "Examen práctico") return "#0f8f55";
    if (tipo === "Examen teórico") return "#9359c9";
    return "#3b5f8f";
  }

  function bindCalendarEvents() {
    var view = document.getElementById("calView");
    var entity = document.getElementById("calEntity");
    var entitySearch = document.getElementById("calEntitySearch");
    var entityResults = document.getElementById("calEntityResults");
    var btn = document.getElementById("calRefresh");
    var from = document.getElementById("calFrom");
    var to = document.getElementById("calTo");
    if (!view || !entity || !entitySearch || !entityResults || !btn || !from || !to) return;

    view.addEventListener("change", function () {
      hydrateCalendarEntitySelect().then(renderCalendarTable);
    });
    entitySearch.addEventListener("input", function () {
      renderCalendarEntityResults(entitySearch.value || "");
    });
    entitySearch.addEventListener("focus", function () {
      renderCalendarEntityResults(entitySearch.value || "");
    });
    entity.addEventListener("change", renderCalendarTable);
    from.addEventListener("change", renderCalendarTable);
    to.addEventListener("change", renderCalendarTable);
    btn.addEventListener("click", renderCalendarTable);
    document.addEventListener("click", function (event) {
      var inside = event.target.closest("#calEntitySearch") || event.target.closest("#calEntityResults");
      if (!inside) entityResults.classList.remove("open");
    });
  }

  function hydrateCalendarEntitySelect() {
    var view = document.getElementById("calView");
    var entity = document.getElementById("calEntity");
    var entitySearch = document.getElementById("calEntitySearch");
    var entityResults = document.getElementById("calEntityResults");
    if (!view || !entity || !entitySearch || !entityResults) return Promise.resolve();

    entity.value = "";
    entitySearch.value = "";
    calendarEntityRows = [];
    entityResults.innerHTML = "";
    entityResults.classList.remove("open");

    if (view.value === "instructor") {
      return getResource("instructor").then(function (rows) {
        calendarEntityRows = [];
        rows.forEach(function (r) {
          var name = ((r.nombre || "") + " " + (r.apellido || "")).trim() || ("Instructor #" + r.id);
          calendarEntityRows.push({
            value: String(r.id),
            label: name,
            search: [r.id, r.nombre, r.apellido, r.cedula].join(" ")
          });
        });
      });
    }

    return Promise.all([getResource("matriculados"), getResource("cliente"), getResource("categoria")]).then(function (resources) {
      calendarEntityRows = [];
      var mats = resources[0] || [];
      var cliById = buildIndex(resources[1] || []);
      var catById = buildIndex(resources[2] || []);
      mats.forEach(function (m) {
        var cli = cliById[String(m.id_cliente || "")] || {};
        var cat = catById[String(m.id_categoria || "")] || {};
        var name = ((cli.nombre || "") + " " + (cli.apellido || "")).trim() || ("Matriculado #" + m.id);
        var catName = cat.nombre_categoria ? (" · " + cat.nombre_categoria) : "";
        calendarEntityRows.push({
          value: String(m.id),
          label: name + catName,
          search: [m.id, cli.nombre, cli.apellido, cli.cedula, cat.nombre_categoria].join(" ")
        });
      });
    });
  }

  function renderCalendarEntityResults(term) {
    var container = document.getElementById("calEntityResults");
    var entity = document.getElementById("calEntity");
    var normalized = normalizeFilterText(term || "");
    if (!container || !entity) return;

    var rows = calendarEntityRows
      .filter(function (row) {
        if (!normalized) return true;
        return normalizeFilterText(row.search || row.label || "").indexOf(normalized) >= 0;
      })
      .slice(0, 30);

    container.innerHTML = "";
    if (!rows.length) {
      container.classList.remove("open");
      return;
    }

    rows.forEach(function (row) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calendar-entity-item";
      btn.textContent = row.label;
      btn.dataset.value = row.value;
      btn.addEventListener("click", function () {
        entity.value = row.value;
        entity.dispatchEvent(new Event("change", { bubbles: true }));
        var search = document.getElementById("calEntitySearch");
        if (search) search.value = row.label;
        container.classList.remove("open");
      });
      container.appendChild(btn);
    });
    container.classList.add("open");
  }

  function renderCalendarTable() {
    var view = document.getElementById("calView");
    var entity = document.getElementById("calEntity");
    var from = document.getElementById("calFrom");
    var to = document.getElementById("calTo");
    if (!view || !entity) return;
    var status = document.getElementById("calendarStatus");

    if (!entity.value) {
      renderFullCalendar([]);
      if (status) status.textContent = "Selecciona una persona para cargar la agenda.";
      return;
    }
    if (status) status.textContent = "Cargando agenda...";

    Promise.all([
      getResource("clase-practica"),
      getResource("claseteorica"),
      getResource("examen-practico"),
      getResource("examen-teorico"),
      getResource("instructor"),
      getResource("vehiculo"),
      getResource("matriculados"),
      getResource("cliente"),
      getResource("categoria")
    ]).then(function (resources) {
      var cp = resources[0] || [];
      var ct = resources[1] || [];
      var ep = resources[2] || [];
      var et = resources[3] || [];
      var insById = buildIndex(resources[4] || []);
      var vehById = buildIndex(resources[5] || []);
      var matById = buildIndex(resources[6] || []);
      var cliById = buildIndex(resources[7] || []);
      var catById = buildIndex(resources[8] || []);

      var events = [];
      function pushEvent(kind, row) {
        var matId = String(row.ID_matriculado || row.id_matriculado || "");
        var insId = String(row.ID_instructor || row.id_instructor || "");
        var dt = row.fecha_clase || row.fecha_hora || "";
        var mat = matById[matId] || {};
        var cli = cliById[String(mat.id_cliente || "")] || {};
        var cat = catById[String(mat.id_categoria || "")] || {};
        var ins = insById[insId] || {};
        var veh = vehById[String(row.ID_vehiculo || row.id_vehiculo || "")] || {};

        events.push({
          tipo: kind,
          fecha_hora: dt,
          instructor_id: insId,
          matriculado_id: matId,
          instructor: ((ins.nombre || "") + " " + (ins.apellido || "")).trim() || "-",
          matriculado: ((cli.nombre || "") + " " + (cli.apellido || "")).trim() || ("#" + (matId || "-")),
          categoria: cat.nombre_categoria || "-",
          vehiculo: [veh.placa, veh.marca].filter(Boolean).join(" · ") || "-",
          detalle: row.Descripcion || row.descripcion || row.resultado || "-"
        });
      }

      cp.forEach(function (r) { pushEvent("Clase práctica", r); });
      ct.forEach(function (r) { pushEvent("Clase teórica", r); });
      ep.forEach(function (r) { pushEvent("Examen práctico", r); });
      et.forEach(function (r) { pushEvent("Examen teórico", r); });

      var fromDate = parseDateSafe(from ? from.value : "");
      var toDate = parseDateSafe(to ? to.value : "");
      if (toDate) toDate.setHours(23, 59, 59, 999);

      var filtered = events.filter(function (e) {
        if (!e.fecha_hora) return false;
        var d = parseDateSafe(e.fecha_hora);
        if (!d) return false;
        if (view.value === "instructor" && entity.value && e.instructor_id !== entity.value) return false;
        if (view.value === "matriculado" && entity.value && e.matriculado_id !== entity.value) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      }).sort(function (a, b) {
        return (parseDateSafe(a.fecha_hora) || 0) - (parseDateSafe(b.fecha_hora) || 0);
      }).map(function (e) {
        var start = parseDateSafe(e.fecha_hora);
        if (!start) return null;
        var end = new Date(start.getTime() + 60 * 60 * 1000);
        return {
          title: e.tipo,
          start: start,
          end: end,
          backgroundColor: colorByType(e.tipo),
          borderColor: colorByType(e.tipo),
          extendedProps: {
            tipo_corto: e.tipo === "Clase práctica" ? "CP" :
              e.tipo === "Clase teórica" ? "CT" :
              e.tipo === "Examen práctico" ? "EP" :
              e.tipo === "Examen teórico" ? "ET" : e.tipo,
            matriculado: e.matriculado,
            instructor: e.instructor,
            vehiculo: e.vehiculo,
            categoria: e.categoria,
            detalle: e.detalle
          }
        };
      }).filter(Boolean);

      var limited = filtered;
      var maxEvents = 600;
      if (filtered.length > maxEvents) {
        limited = filtered.slice(0, maxEvents);
      }

      renderFullCalendar(limited);
      if (status) {
        status.textContent = filtered.length
          ? ("Mostrando " + limited.length + " de " + filtered.length + " evento(s).")
          : "No hay eventos para el filtro actual.";
      }
    }).catch(function () {
      var status = document.getElementById("calendarStatus");
      if (status) status.textContent = "Error cargando agenda.";
      if (window.showNotification) window.showNotification("Error cargando agenda del calendario", "error");
    });
  }

  function buildIndex(rows) {
    var map = {};
    (rows || []).forEach(function (row) {
      map[String(row.id)] = row;
    });
    return map;
  }

  function formatDateTime(value) {
    var raw = String(value || "");
    if (!raw) return "";
    var d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function enrichRowsForDisplay(endpoint, data) {
    if (!Array.isArray(data)) return Promise.resolve([]);

    if (endpoint === "clase-practica") {
      return Promise.all([getResource("instructor"), getResource("vehiculo"), getResource("matriculados"), getResource("cliente"), getResource("categoria")])
        .then(function (resources) {
          var insById = buildIndex(resources[0]);
          var vehById = buildIndex(resources[1]);
          var matById = buildIndex(resources[2]);
          var cliById = buildIndex(resources[3]);
          var catById = buildIndex(resources[4]);

          return data.map(function (row) {
            var instructor = insById[String(row.ID_instructor || row.id_instructor || "")] || {};
            var vehiculo = vehById[String(row.ID_vehiculo || row.id_vehiculo || "")] || {};
            var matriculado = matById[String(row.ID_matriculado || row.id_matriculado || "")] || {};
            var cliente = cliById[String(matriculado.id_cliente || "")] || {};
            var categoria = catById[String(matriculado.id_categoria || "")] || {};

            var instructorName = ((instructor.nombre || "") + " " + (instructor.apellido || "")).trim();
            var clienteName = ((cliente.nombre || "") + " " + (cliente.apellido || "")).trim();
            var vehiculoLabel = [vehiculo.placa, vehiculo.marca].filter(Boolean).join(" · ");
            var categoriaLabel = categoria.nombre_categoria || "";

            return {
              id: row.id,
              instructor: instructorName || ("#" + (row.ID_instructor || row.id_instructor || "-")),
              cliente: clienteName || ("#" + (matriculado.id_cliente || "-")),
              categoria: categoriaLabel || ("#" + (matriculado.id_categoria || "-")),
              vehiculo: vehiculoLabel || ("#" + (row.ID_vehiculo || row.id_vehiculo || "-")),
              descripcion: row.Descripcion || row.descripcion || "",
              fecha_hora: formatDateTime(row.fecha_clase || row.fecha_hora || "")
            };
          });
        });
    }

    if (endpoint === "claseteorica") {
      return Promise.all([getResource("instructor"), getResource("matriculados"), getResource("cliente"), getResource("categoria")])
        .then(function (resources) {
          var insById = buildIndex(resources[0]);
          var matById = buildIndex(resources[1]);
          var cliById = buildIndex(resources[2]);
          var catById = buildIndex(resources[3]);

          return data.map(function (row) {
            var instructor = insById[String(row.ID_instructor || row.id_instructor || row.instructor || "")] || {};
            var matriculado = matById[String(row.ID_matriculado || row.id_matriculado || row.matriculado || "")] || {};
            var cliente = cliById[String(matriculado.id_cliente || "")] || {};
            var categoria = catById[String(matriculado.id_categoria || "")] || {};

            var instructorName = ((instructor.nombre || "") + " " + (instructor.apellido || "")).trim();
            var clienteName = ((cliente.nombre || "") + " " + (cliente.apellido || "")).trim();

            return {
              id: row.id,
              instructor: instructorName || ("#" + (row.ID_instructor || row.id_instructor || "-")),
              matriculado: clienteName || ("#" + (row.ID_matriculado || row.id_matriculado || "-")),
              categoria: categoria.nombre_categoria || "-",
              descripcion: row.Descripcion || row.descripcion || "",
              fecha_hora: formatDateTime(row.fecha_clase || row.fecha_hora || "")
            };
          });
        });
    }

    if (endpoint === "examen-practico") {
      return Promise.all([getResource("instructor"), getResource("vehiculo"), getResource("matriculados"), getResource("cliente"), getResource("categoria")])
        .then(function (resources) {
          var insById = buildIndex(resources[0]);
          var vehById = buildIndex(resources[1]);
          var matById = buildIndex(resources[2]);
          var cliById = buildIndex(resources[3]);
          var catById = buildIndex(resources[4]);

          return data.map(function (row) {
            var instructor = insById[String(row.ID_instructor || row.id_instructor || row.instructor || "")] || {};
            var vehiculo = vehById[String(row.ID_vehiculo || row.id_vehiculo || row.vehiculo || "")] || {};
            var matriculado = matById[String(row.ID_matriculado || row.id_matriculado || row.matriculado || "")] || {};
            var cliente = cliById[String(matriculado.id_cliente || "")] || {};
            var categoria = catById[String(matriculado.id_categoria || "")] || {};

            var instructorName = ((instructor.nombre || "") + " " + (instructor.apellido || "")).trim();
            var clienteName = ((cliente.nombre || "") + " " + (cliente.apellido || "")).trim();
            var vehiculoLabel = [vehiculo.placa, vehiculo.marca].filter(Boolean).join(" · ");

            return {
              id: row.id,
              instructor: instructorName || ("#" + (row.ID_instructor || row.id_instructor || "-")),
              matriculado: clienteName || ("#" + (row.ID_matriculado || row.id_matriculado || "-")),
              categoria: categoria.nombre_categoria || "-",
              vehiculo: vehiculoLabel || ("#" + (row.ID_vehiculo || row.id_vehiculo || "-")),
              resultado: row.resultado || "-",
              fecha_hora: formatDateTime(row.fecha_clase || row.fecha_hora || "")
            };
          });
        });
    }

    if (endpoint === "examen-teorico") {
      return Promise.all([getResource("matriculados"), getResource("cliente"), getResource("categoria")])
        .then(function (resources) {
          var matById = buildIndex(resources[0]);
          var cliById = buildIndex(resources[1]);
          var catById = buildIndex(resources[2]);

          return data.map(function (row) {
            var matriculado = matById[String(row.ID_matriculado || row.id_matriculado || row.matriculado || "")] || {};
            var cliente = cliById[String(matriculado.id_cliente || "")] || {};
            var categoria = catById[String(matriculado.id_categoria || "")] || {};
            var clienteName = ((cliente.nombre || "") + " " + (cliente.apellido || "")).trim();

            return {
              id: row.id,
              matriculado: clienteName || ("#" + (row.ID_matriculado || row.id_matriculado || "-")),
              categoria: categoria.nombre_categoria || "-",
              resultado: row.resultado || "-",
              fecha_hora: formatDateTime(row.fecha_clase || row.fecha_hora || "")
            };
          });
        });
    }

    if (endpoint === "matriculados") {
      return Promise.all([getResource("cliente"), getResource("categoria")])
        .then(function (resources) {
          var cliById = buildIndex(resources[0]);
          var catById = buildIndex(resources[1]);

          return data.map(function (row) {
            var cliente = cliById[String(row.id_cliente || row.cliente || "")] || {};
            var categoria = catById[String(row.id_categoria || row.categoria || "")] || {};
            var clienteNombre = ((cliente.nombre || "") + " " + (cliente.apellido || "")).trim();

            return {
              id: row.id,
              cliente: clienteNombre || ("#" + (row.id_cliente || "-")),
              cedula: cliente.cedula || "-",
              categoria: categoria.nombre_categoria || ("#" + (row.id_categoria || "-")),
              fecha_inicio: row.fecha_inicio || "",
              fecha_fin: row.fecha_fin || ""
            };
          });
        });
    }

    return Promise.resolve(data);
  }

  function renderTable(table, data, moduleId, endpoint) {
    table.__rows = Array.isArray(data) ? data : [];
    table.dataset.moduleId = moduleId || "";
    table.dataset.endpoint = endpoint || "";

    table.innerHTML = "";
    if (!Array.isArray(data) || data.length === 0) {
      table.innerHTML = "<tbody><tr><td>Sin datos</td></tr></tbody>";
      ensureTableFilters(table, [], []);
      return;
    }

    var keys = Object.keys(data[0]);
    var state = ensureTableFilters(table, keys, data);

    var q = normalizeFilterText(state.query || "");
    var selectedField = state.field || "__all__";
    var filteredData = data.filter(function (row) {
      if (!q) return true;
      if (selectedField === "__all__") {
        return keys.some(function (key) {
          return normalizeFilterText(row[key]).indexOf(q) >= 0;
        });
      }
      return normalizeFilterText(row[selectedField]).indexOf(q) >= 0;
    });

    state.count.textContent = filteredData.length + " / " + data.length;

    var thead = document.createElement("thead");
    var trh = document.createElement("tr");
    keys.forEach(function (key) {
      var th = document.createElement("th");
      th.textContent = key;
      trh.appendChild(th);
    });
    var thActions = document.createElement("th");
    thActions.textContent = "Acciones";
    trh.appendChild(thActions);
    thead.appendChild(trh);

    var tbody = document.createElement("tbody");
    filteredData.forEach(function (row) {
      var tr = document.createElement("tr");
      keys.forEach(function (key) {
        var td = document.createElement("td");
        td.textContent = row[key];
        td.setAttribute("data-label", key);
        tr.appendChild(td);
      });
      var rowId = extractRowId(row);
      var actionsTd = document.createElement("td");
      actionsTd.className = "table-actions";
      actionsTd.setAttribute("data-label", "acciones");
      actionsTd.innerHTML =
        '<button type="button" class="btn btn-sm btn-outline-primary table-action-edit" data-row-id="' + String(rowId || "") + '">Editar</button>' +
        '<button type="button" class="btn btn-sm btn-outline-danger table-action-delete" data-row-id="' + String(rowId || "") + '">Eliminar</button>';
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    table.onclick = function (event) {
      var editBtn = event.target.closest(".table-action-edit");
      var deleteBtn = event.target.closest(".table-action-delete");
      if (!editBtn && !deleteBtn) return;
      var rowId = (editBtn || deleteBtn).dataset.rowId || "";
      if (!rowId) {
        if (window.showNotification) window.showNotification("No se encontró el ID del registro", "warning");
        return;
      }
      if (editBtn) {
        openCrudSubmenu(moduleId, endpoint, "edit", rowId);
      } else if (deleteBtn) {
        openCrudSubmenu(moduleId, endpoint, "del", rowId);
      }
    };
  }

  function normalizeFilterText(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function ensureTableFilters(table, keys, rows) {
    var container = table.parentElement;
    if (!container) return { query: "", field: "__all__", count: { textContent: "" } };

    var bar = container.querySelector(".table-filter-bar");
    var queryInput;
    var fieldSelect;
    var countEl;
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "table-filter-bar";
      bar.innerHTML =
        '<input type="text" class="form-control form-control-sm table-filter-input" placeholder="Filtrar resultados...">' +
        '<select class="form-control form-control-sm table-filter-field"></select>' +
        '<button type="button" class="btn btn-sm btn-outline-secondary table-filter-clear">Limpiar</button>' +
        '<span class="table-filter-count"></span>';
      container.insertBefore(bar, table);
    }

    queryInput = bar.querySelector(".table-filter-input");
    fieldSelect = bar.querySelector(".table-filter-field");
    countEl = bar.querySelector(".table-filter-count");

    var prevField = fieldSelect.value || "__all__";
    fieldSelect.innerHTML = '<option value="__all__">Todos los campos</option>';
    (keys || []).forEach(function (key) {
      var opt = document.createElement("option");
      opt.value = key;
      opt.textContent = key;
      fieldSelect.appendChild(opt);
    });
    fieldSelect.value = (keys || []).indexOf(prevField) >= 0 ? prevField : "__all__";

    if (!queryInput.dataset.bound) {
      queryInput.dataset.bound = "1";
      queryInput.addEventListener("input", function () {
        table.dataset.filterQuery = queryInput.value || "";
        renderTable(table, table.__rows || [], table.dataset.moduleId || "", table.dataset.endpoint || "");
      });
      fieldSelect.addEventListener("change", function () {
        table.dataset.filterField = fieldSelect.value || "__all__";
        renderTable(table, table.__rows || [], table.dataset.moduleId || "", table.dataset.endpoint || "");
      });
      bar.querySelector(".table-filter-clear").addEventListener("click", function () {
        queryInput.value = "";
        fieldSelect.value = "__all__";
        table.dataset.filterQuery = "";
        table.dataset.filterField = "__all__";
        renderTable(table, table.__rows || [], table.dataset.moduleId || "", table.dataset.endpoint || "");
      });
    }

    return {
      query: table.dataset.filterQuery || "",
      field: table.dataset.filterField || "__all__",
      count: countEl
    };
  }

  function extractRowId(row) {
    if (!row || typeof row !== "object") return "";
    if (row.id !== undefined && row.id !== null) return row.id;
    var keys = Object.keys(row);
    for (var i = 0; i < keys.length; i += 1) {
      if (String(keys[i]).toLowerCase() === "id") return row[keys[i]];
    }
    return "";
  }

  function openCrudSubmenu(moduleId, endpoint, mode, rowId) {
    if (!moduleId || !endpoint || !mode) return;
    if (mode === "create") {
      openCrudModal(moduleId + "-pane-0", "Agregar registro");
      return;
    }

    if (mode === "edit") {
      var editPaneId = moduleId + "-pane-1";
      activePaneByModule[moduleId] = editPaneId;
      openCrudModal(editPaneId, "Editar registro");
      getResourceItemById(endpoint, rowId).then(function (row) {
        if (row) fillEditForm(endpoint, row);
      });
    }

    if (mode === "del") {
      openDeleteConfirm(moduleId, endpoint, rowId);
    }

    var targetMap = crudFormMap[endpoint] || {};
    var inputId = mode === "edit" ? targetMap.edit : targetMap.del;
    if (!inputId) return;
    var input = document.getElementById(inputId);
    if (!input) return;
    input.value = String(rowId);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setupDeletePane(pane) {
    var btn = pane.querySelector("button[onclick*='eliminar']");
    if (!btn) return;
    var handler = btn.getAttribute("onclick") || "";
    if (!handler) return;

    btn.removeAttribute("onclick");
    btn.setAttribute("data-delete-handler", handler);
  }

  function runInlineHandler(code) {
    var fnName = String(code).split("(")[0].trim();
    if (!fnName) return;
    var fn = window[fnName];
    if (typeof fn !== "function") return;
    try {
      fn({
        preventDefault: function () {},
        stopPropagation: function () {}
      });
      setTimeout(function () {
        resourceCache = {};
        if (activeModuleId && listRefreshers[activeModuleId]) listRefreshers[activeModuleId]();
      }, 700);
    } catch (error) {
      if (window.showNotification) window.showNotification("No se pudo ejecutar la eliminación", "error");
    }
  }

  function ensureCrudModal() {
    if (crudModal) return;
    var wrapper = document.createElement("div");
    wrapper.className = "crud-modal-overlay";
    wrapper.innerHTML =
      '<div class="crud-modal-card">' +
      '  <div class="crud-modal-header">' +
      '    <h4 id="crudModalTitle">Formulario</h4>' +
      '    <button type="button" class="crud-modal-close" aria-label="Cerrar">&times;</button>' +
      "  </div>" +
      '  <div id="crudModalBody" class="crud-modal-body"></div>' +
      "</div>";
    document.body.appendChild(wrapper);
    crudModal = wrapper;
    crudModalTitle = wrapper.querySelector("#crudModalTitle");
    crudModalBody = wrapper.querySelector("#crudModalBody");
    wrapper.addEventListener("click", function (event) {
      if (event.target === wrapper) closeCrudModal();
    });
    wrapper.querySelector(".crud-modal-close").addEventListener("click", closeCrudModal);
  }

  function openCrudModal(paneId, title) {
    ensureCrudModal();
    closeCrudModal();
    var pane = document.getElementById(paneId);
    if (!pane || !crudModalBody) return;
    activeCrudPane = pane;
    crudModalTitle.textContent = title || "Formulario";
    pane.classList.remove("window-hidden");
    pane.classList.add("window-active");
    crudModalBody.appendChild(pane);
    crudModal.classList.add("open");
    var firstInput = pane.querySelector("input, select, textarea");
    if (firstInput) firstInput.focus();
  }

  function closeCrudModal() {
    if (!crudModal || !activeCrudPane) {
      if (crudModal) crudModal.classList.remove("open");
      return;
    }
    var pane = activeCrudPane;
    var home = paneHomeById[pane.id];
    if (home) home.appendChild(pane);
    pane.classList.remove("window-active");
    pane.classList.add("window-hidden");
    activeCrudPane = null;
    crudModal.classList.remove("open");
  }

  function ensureDeleteConfirmModal() {
    if (deleteConfirmModal) return;
    var wrapper = document.createElement("div");
    wrapper.className = "confirm-modal-overlay";
    wrapper.innerHTML =
      '<div class="confirm-modal-card">' +
      "  <h4>Confirmar eliminación</h4>" +
      '  <p id="deleteConfirmMessage">¿Seguro que deseas eliminar este registro?</p>' +
      '  <div class="confirm-modal-actions">' +
      '    <button type="button" class="btn btn-sm btn-danger" id="deleteConfirmYes">Sí, eliminar</button>' +
      '    <button type="button" class="btn btn-sm btn-outline-secondary" id="deleteConfirmNo">No</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(wrapper);
    deleteConfirmModal = wrapper;
    deleteConfirmMessage = wrapper.querySelector("#deleteConfirmMessage");
    deleteConfirmAccept = wrapper.querySelector("#deleteConfirmYes");
    wrapper.querySelector("#deleteConfirmNo").addEventListener("click", closeDeleteConfirm);
    wrapper.addEventListener("click", function (event) {
      if (event.target === wrapper) closeDeleteConfirm();
    });
    deleteConfirmAccept.addEventListener("click", function () {
      if (!pendingDeleteHandler) return;
      closeDeleteConfirm();
      runInlineHandler(pendingDeleteHandler);
    });
  }

  function openDeleteConfirm(moduleId, endpoint, rowId) {
    ensureDeleteConfirmModal();
    var pane = document.getElementById(moduleId + "-pane-2");
    if (!pane) return;
    var trigger = pane.querySelector("button[data-delete-handler]");
    if (!trigger) return;
    pendingDeleteHandler = trigger.getAttribute("data-delete-handler") || "";
    if (!pendingDeleteHandler) return;
    if (deleteConfirmMessage) {
      deleteConfirmMessage.textContent = "¿Seguro que deseas eliminar el registro #" + rowId + "?";
    }
    deleteConfirmModal.classList.add("open");
  }

  function closeDeleteConfirm() {
    pendingDeleteHandler = "";
    if (deleteConfirmModal) deleteConfirmModal.classList.remove("open");
  }

  function bindAutoRefreshAfterCrud() {
    document.addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      var handler = btn.getAttribute("onclick") || "";
      if (handler.indexOf("crear") === -1 && handler.indexOf("actualizar") === -1 && handler.indexOf("eliminar") === -1) {
        return;
      }
      if (handler.indexOf("crear") >= 0 || handler.indexOf("actualizar") >= 0) {
        setTimeout(closeCrudModal, 250);
      }
      setTimeout(function () {
        resourceCache = {};
        if (activeModuleId && listRefreshers[activeModuleId]) listRefreshers[activeModuleId]();
      }, 700);
    });
  }

  function moduleEndpoint(label) {
    var n = cleanText(label).toLowerCase();
    if (n.indexOf("instructor") >= 0) return "instructor";
    if (n.indexOf("clase práctica") >= 0) return "clase-practica";
    if (n.indexOf("clase teórica") >= 0) return "claseteorica";
    if (n.indexOf("vehículo") >= 0) return "vehiculo";
    if (n.indexOf("categoría") >= 0) return "categoria";
    if (n.indexOf("examen práctico") >= 0) return "examen-practico";
    if (n.indexOf("examen teórico") >= 0) return "examen-teorico";
    if (n.indexOf("matriculado") >= 0) return "matriculados";
    if (n.indexOf("cliente") >= 0) return "cliente";
    return "";
  }

  function moduleIcon(label) {
    var n = cleanText(label).toLowerCase();
    if (n.indexOf("instructor") >= 0) return "fa fa-user-tie";
    if (n.indexOf("clase") >= 0) return "fa fa-chalkboard-teacher";
    if (n.indexOf("vehículo") >= 0) return "fa fa-car";
    if (n.indexOf("categoría") >= 0) return "fa fa-id-card";
    if (n.indexOf("examen") >= 0) return "fa fa-clipboard-check";
    if (n.indexOf("matriculado") >= 0) return "fa fa-address-book";
    if (n.indexOf("cliente") >= 0) return "fa fa-users";
    return "fa fa-cube";
  }

  function cleanText(value) {
    return (value || "")
      .replace(/\s+/g, " ")
      .replace("Prï¿½ctica", "Práctica")
      .replace("Prï¿½ctico", "Práctico")
      .trim();
  }

  function getAdminProfile() {
    try {
      var raw = localStorage.getItem("cea_admin_user");
      if (!raw) return { username: "Administrador", role: "Rol: admin" };
      var data = JSON.parse(raw);
      var username = String(data.username || "Administrador");
      var role = String(data.role || "admin");
      return { username: username, role: "Rol: " + role };
    } catch (_error) {
      return { username: "Administrador", role: "Rol: admin" };
    }
  }

  function injectAdminFooter() {
    if (document.querySelector(".app-footer")) return;

    var footer = document.createElement("footer");
    footer.className = "app-footer";
    footer.innerHTML =
      '<div class="footer-inner">' +
      "<div><strong>CEA Instituto de Movilidad</strong></div>" +
      "<div>Panel administrativo profesional · CRUD en secciones</div>" +
      "</div>";

    document.body.appendChild(footer);
  }
})();



