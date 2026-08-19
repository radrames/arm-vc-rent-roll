'use strict';

(function () {

  var dashWs        = [];
  var sourceCols    = [];
  var filterConfigs = []; // [{ field, label, searchable }]

  var BROWSER_STORE_KEY = 'arm_vc_rr_settings';

  // Column names that match mockFieldMappings() in index.html
  var MOCK_COLS = [
    'Tenant Name', 'Tenant Code', 'Tenant Category', 'Property Name', 'Unit Code', 'GLA %',
    'Lease Start', 'Lease End', 'Unit Area', 'MAT Rent', 'Rent Per Sqm', 'RTM Sales',
    'Prior Sales', 'YoY %', 'OCR %', 'Sustainability', 'Expiring Flag', 'DQ No End Date',
    'Sales Index', 'Tenant Status',
  ];

  function injectBrowserStub() {
    var pending = {};

    window.tableau = {
      extensions: {
        initializeDialogAsync: function () { return Promise.resolve(); },
        dashboardContent: {
          dashboard: {
            worksheets: [{
              name: 'Mock Worksheet',
              getSummaryDataAsync: function () {
                return Promise.resolve({
                  columns: MOCK_COLS.map(function (n) { return { fieldName: n }; }),
                  data: [],
                });
              },
            }],
          },
        },
        settings: {
          getAll: function () {
            try { return JSON.parse(localStorage.getItem(BROWSER_STORE_KEY) || '{}'); } catch (e) { return {}; }
          },
          set: function (key, val) { pending[key] = val; },
          saveAsync: function () {
            try {
              var stored;
              try { stored = JSON.parse(localStorage.getItem(BROWSER_STORE_KEY) || '{}'); } catch (e2) { stored = {}; }
              var keys = Object.keys(pending);
              for (var i = 0; i < keys.length; i++) { stored[keys[i]] = pending[keys[i]]; }
              localStorage.setItem(BROWSER_STORE_KEY, JSON.stringify(stored));
              pending = {};
            } catch (e) {}
            return Promise.resolve();
          },
        },
        ui: {
          closeDialog: function () {
            var base = window.location.href.replace(/\/[^\/]*$/, '/index.html').replace(/\?.*$/, '');
            window.location.href = base;
          },
        },
      },
    };

    // Pre-seed mock field mappings so required-field validation passes on first open
    try {
      var existing = JSON.parse(localStorage.getItem(BROWSER_STORE_KEY) || '{}');
      if (!existing.sourceWorksheet) {
        existing.sourceWorksheet = 'Mock Worksheet';
        existing.fieldMappings = JSON.stringify({
          tenantNameField: 'Tenant Name', tenantCodeField: 'Tenant Code', tenantCategoryField: 'Tenant Category',
          propertyNameField: 'Property Name', unitCodeField: 'Unit Code', glaPercentField: 'GLA %',
          leaseStartField: 'Lease Start', leaseEndField: 'Lease End', unitAreaField: 'Unit Area',
          matRentField: 'MAT Rent', rentPerSqmField: 'Rent Per Sqm', rtmSalesField: 'RTM Sales',
          priorPeriodSalesField: 'Prior Sales', yoyField: 'YoY %', ocrField: 'OCR %',
          sustainabilityField: 'Sustainability', expiringFlagField: 'Expiring Flag',
          dataQualityNoEndDateField: 'DQ No End Date', salesIndexField: 'Sales Index',
          tenantStatusField: 'Tenant Status',
        });
        localStorage.setItem(BROWSER_STORE_KEY, JSON.stringify(existing));
      }
    } catch (e) {}

    var bar = document.createElement('div');
    bar.style.cssText = 'padding:5px 20px;background:#E8F5E9;border-bottom:1px solid #A5D6A7;font-size:11px;font-weight:500;color:#2E7D32;flex-shrink:0;';
    bar.textContent = 'Browser preview — settings saved locally. "Save & Apply" returns you to the main view.';
    var panel = document.getElementById('config-panel');
    panel.parentNode.insertBefore(bar, panel);
  }

  var FIELD_MAPPING_KEYS = [
    { id: 'fld-tenant-name',               key: 'tenantNameField' },
    { id: 'fld-tenant-code',                key: 'tenantCodeField' },
    { id: 'fld-tenant-category',            key: 'tenantCategoryField' },
    { id: 'fld-property-name',              key: 'propertyNameField' },
    { id: 'fld-unit-code',                  key: 'unitCodeField' },
    { id: 'fld-gla-percent',                key: 'glaPercentField' },
    { id: 'fld-lease-start',                key: 'leaseStartField' },
    { id: 'fld-lease-end',                  key: 'leaseEndField' },
    { id: 'fld-unit-area',                  key: 'unitAreaField' },
    { id: 'fld-mat-rent',                   key: 'matRentField' },
    { id: 'fld-rent-per-sqm',               key: 'rentPerSqmField' },
    { id: 'fld-rtm-sales',                  key: 'rtmSalesField' },
    { id: 'fld-sales-prior-period',         key: 'priorPeriodSalesField' },
    { id: 'fld-yoy',                        key: 'yoyField' },
    { id: 'fld-ocr',                        key: 'ocrField' },
    { id: 'fld-sustainability',             key: 'sustainabilityField' },
    { id: 'fld-expiring-flag',              key: 'expiringFlagField' },
    { id: 'fld-data-quality-no-end-date',   key: 'dataQualityNoEndDateField' },
    { id: 'fld-sales-index',                key: 'salesIndexField' },
    { id: 'fld-tenant-status',              key: 'tenantStatusField' },
  ];

  var REQUIRED_FIELD_IDS = [
    'fld-tenant-name', 'fld-tenant-code', 'fld-tenant-category',
    'fld-property-name', 'fld-unit-area', 'fld-mat-rent', 'fld-rtm-sales',
  ];

  var COLUMN_LABEL_KEYS = [
    { id: 'lbl-lease',           key: 'leaseLabel',          def: 'LEASE',          visId: 'vis-lease',           visKey: 'leaseVisible' },
    { id: 'lbl-location',        key: 'locationLabel',       def: 'LOCATION',       visId: 'vis-location',        visKey: 'locationVisible' },
    { id: 'lbl-area-sqm',        key: 'areaSqmLabel',        def: 'AREA SQM',       visId: 'vis-area-sqm',        visKey: 'areaSqmVisible' },
    { id: 'lbl-term',            key: 'termLabel',           def: 'TERM',           visId: 'vis-term',            visKey: 'termVisible' },
    { id: 'lbl-mat-rent',        key: 'matRentLabel',        def: 'MAT RENT',       visId: 'vis-mat-rent',        visKey: 'matRentVisible' },
    { id: 'lbl-rent-per-sqm',    key: 'rentPerSqmLabel',     def: 'RENT / SQM',     visId: 'vis-rent-per-sqm',    visKey: 'rentPerSqmVisible' },
    { id: 'lbl-rtm-sales',       key: 'rtmSalesLabel',       def: 'RTM SALES',      visId: 'vis-rtm-sales',       visKey: 'rtmSalesVisible' },
    { id: 'lbl-vs-py',           key: 'vsPyLabel',           def: 'VS PY',          visId: 'vis-vs-py',           visKey: 'vsPyVisible' },
    { id: 'lbl-ocr-rtm',         key: 'ocrRtmLabel',         def: 'OCR (RTM)',      visId: 'vis-ocr-rtm',         visKey: 'ocrRtmVisible' },
    { id: 'lbl-sustainability',  key: 'sustainabilityLabel', def: 'SUSTAINABILITY', visId: 'vis-sustainability',  visKey: 'sustainabilityVisible' },
  ];

  var KPI_TOOLTIP_KEYS = [
    { id: 'tip-annual-rent',  key: 'annualRent' },
    { id: 'tip-leased-gla',   key: 'leasedGla' },
    { id: 'tip-rtm-sales',    key: 'rtmSales' },
    { id: 'tip-blended-ocr',  key: 'blendedOcr' },
    { id: 'tip-expiring',     key: 'expiring' },
    { id: 'tip-data-quality', key: 'dataQuality' },
  ];

  window.addEventListener('load', function () {
    function init() {
      dashWs = tableau.extensions.dashboardContent.dashboard.worksheets;

      populateWorksheetDropdowns();
      initTabs();

      var saved = loadSettings();
      applySavedSettings(saved);

      document.getElementById('btn-save').addEventListener('click', saveAndClose);
      document.getElementById('btn-add-filter').addEventListener('click', addFilter);

      var $mockToggle = document.getElementById('toggle-mock-mode');
      var $mockRow    = document.getElementById('mock-mode-row');
      $mockToggle.addEventListener('change', function () {
        $mockRow.classList.toggle('active', $mockToggle.checked);
      });
    }

    var initPromise;
    try { initPromise = tableau.extensions.initializeDialogAsync(); }
    catch (e) { initPromise = Promise.reject(e); }
    initPromise.catch(function () { injectBrowserStub(); }).then(init);
  });

  function loadSettings() {
    var raw = {};
    try {
      var all = tableau.extensions.settings.getAll();
      Object.keys(all).forEach(function (k) {
        try { raw[k] = JSON.parse(all[k]); } catch (e) { raw[k] = all[k]; }
      });
    } catch (e) {}
    return raw;
  }

  function initTabs() {
    document.querySelectorAll('.ctab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.ctab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-pane').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });
  }

  function populateWorksheetDropdowns() {
    var $ws = document.getElementById('ws-source');
    dashWs.forEach(function (w) {
      var o = document.createElement('option'); o.value = o.textContent = w.name; $ws.appendChild(o);
    });
    $ws.addEventListener('change', function () { loadCols(this.value); });
  }

  function loadCols(wsName) {
    if (!wsName) return;
    var ws = dashWs.find(function (w) { return w.name === wsName; });
    if (!ws) return;
    ws.getSummaryDataAsync({ maxRows: 1 }).then(function (dt) {
      sourceCols = dt.columns.map(function (c) { return c.fieldName; });
      fillFieldSelects('fld-', sourceCols);
      renderFilterList();
    });
  }

  function fillFieldSelects(prefix, cols) {
    document.querySelectorAll('[id^="' + prefix + '"]').forEach(function ($sel) {
      var prev = $sel.value;
      var firstOpt = $sel.options[0];
      $sel.innerHTML = '';
      $sel.appendChild(firstOpt);
      cols.forEach(function (col) {
        var o = document.createElement('option'); o.value = o.textContent = col; $sel.appendChild(o);
      });
      if (prev && cols.indexOf(prev) >= 0) $sel.value = prev;
    });
  }

  function applySavedSettings(s) {
    if (s.sourceWorksheet) {
      setVal('ws-source', s.sourceWorksheet);
      loadCols(s.sourceWorksheet);
    }

    var fm = s.fieldMappings || {};
    FIELD_MAPPING_KEYS.forEach(function (item) {
      var val = fm[item.key];
      if (!val) return;
      var $sel = document.getElementById(item.id);
      if ($sel && !$sel.querySelector('option[value="' + cssEscape(val) + '"]')) {
        var o = document.createElement('option'); o.value = o.textContent = val; $sel.appendChild(o);
      }
      setVal(item.id, val);
    });

    var cl = s.columnLabels || {};
    var cv = s.columnVisibility || {};
    COLUMN_LABEL_KEYS.forEach(function (item) {
      setVal(item.id, cl[item.key] || item.def);
      setCheck(item.visId, cv[item.visKey] !== false);
    });

    var kt = s.kpiTooltips || {};
    KPI_TOOLTIP_KEYS.forEach(function (item) { setVal(item.id, kt[item.key] || ''); });

    filterConfigs = (Array.isArray(s.filterConfigs) ? s.filterConfigs : []);
    renderFilterList();

    var mockOn = s.mockMode === true || s.mockMode === 'true';
    setCheck('toggle-mock-mode', mockOn);
    document.getElementById('mock-mode-row').classList.toggle('active', mockOn);
  }

  function saveAndClose() {
    var ws = getVal('ws-source');
    if (!ws) { alert('Select a source worksheet before saving.'); return; }

    var missing = REQUIRED_FIELD_IDS.filter(function (id) { return !getVal(id); });
    if (missing.length) { alert('Please map all required fields (marked *) before saving.'); return; }

    var $btn = document.getElementById('btn-save');
    $btn.textContent = 'Saving…'; $btn.disabled = true;

    tableau.extensions.settings.set('sourceWorksheet', ws);

    var fm = {};
    FIELD_MAPPING_KEYS.forEach(function (item) { fm[item.key] = getVal(item.id); });
    tableau.extensions.settings.set('fieldMappings', JSON.stringify(fm));

    var cl = {}, cv = {};
    COLUMN_LABEL_KEYS.forEach(function (item) {
      cl[item.key] = getVal(item.id).trim() || item.def;
      cv[item.visKey] = getCheck(item.visId);
    });
    tableau.extensions.settings.set('columnLabels', JSON.stringify(cl));
    tableau.extensions.settings.set('columnVisibility', JSON.stringify(cv));

    var kt = {};
    KPI_TOOLTIP_KEYS.forEach(function (item) { kt[item.key] = getVal(item.id).trim(); });
    tableau.extensions.settings.set('kpiTooltips', JSON.stringify(kt));

    tableau.extensions.settings.set('filterConfigs', JSON.stringify(filterConfigs));
    tableau.extensions.settings.set('mockMode', getCheck('toggle-mock-mode') ? 'true' : 'false');

    tableau.extensions.settings.saveAsync()
      .then(function ()  { tableau.extensions.ui.closeDialog('saved'); })
      .catch(function () { tableau.extensions.ui.closeDialog('saved'); });
  }

  function renderFilterList() {
    var $list = document.getElementById('filter-list');
    if (!$list) return;
    $list.innerHTML = '';

    filterConfigs.forEach(function (cfg, i) {
      var row = document.createElement('div');
      row.className = 'filter-item';

      // Column select
      var $sel = document.createElement('select');
      $sel.className = 'fi-field';
      var blankOpt = document.createElement('option');
      blankOpt.value = ''; blankOpt.textContent = '— select column —';
      $sel.appendChild(blankOpt);
      sourceCols.forEach(function (col) {
        var o = document.createElement('option'); o.value = o.textContent = col; $sel.appendChild(o);
      });
      if (cfg.field && sourceCols.indexOf(cfg.field) === -1 && cfg.field !== '') {
        var o = document.createElement('option'); o.value = o.textContent = cfg.field; $sel.appendChild(o);
      }
      $sel.value = cfg.field || '';
      $sel.addEventListener('change', function () {
        var prevField = filterConfigs[i].field;
        filterConfigs[i].field = $sel.value;
        if (!filterConfigs[i].label || filterConfigs[i].label === prevField) {
          filterConfigs[i].label = $sel.value;
          $inp.value = $sel.value;
        }
      });

      // Label input
      var $inp = document.createElement('input');
      $inp.type = 'text';
      $inp.className = 'fi-label';
      $inp.placeholder = 'Label';
      $inp.value = cfg.label || '';
      $inp.addEventListener('input', function () { filterConfigs[i].label = $inp.value; });

      // Searchable checkbox
      var $wrap = document.createElement('label');
      $wrap.className = 'fi-searchable-wrap';
      var $chk = document.createElement('input');
      $chk.type = 'checkbox';
      $chk.className = 'fi-searchable';
      $chk.checked = !!cfg.searchable;
      $chk.addEventListener('change', function () { filterConfigs[i].searchable = $chk.checked; });
      $wrap.appendChild($chk);
      $wrap.appendChild(document.createTextNode(' Searchable'));

      // Delete button
      var $del = document.createElement('button');
      $del.type = 'button';
      $del.className = 'del-btn';
      $del.textContent = '✕';
      $del.title = 'Remove filter';
      $del.addEventListener('click', function () {
        filterConfigs.splice(i, 1);
        renderFilterList();
      });

      row.appendChild($sel);
      row.appendChild($inp);
      row.appendChild($wrap);
      row.appendChild($del);
      $list.appendChild(row);
    });

    if (!filterConfigs.length) {
      var empty = document.createElement('p');
      empty.style.cssText = 'font-size:12px;color:var(--text-muted);padding:8px 0;';
      empty.textContent = 'No filters configured. Click "+ Add Filter" to add one.';
      $list.appendChild(empty);
    }
  }

  function addFilter() {
    if (!sourceCols.length) {
      alert('Select a source worksheet on the Data tab first, then add filters.');
      return;
    }
    filterConfigs.push({ field: sourceCols[0], label: sourceCols[0], searchable: false });
    renderFilterList();
  }

  function cssEscape(v) { return String(v).replace(/"/g, '\\"'); }
  function setVal(id, val)  { var el = document.getElementById(id); if (el && val) el.value = val; }
  function setCheck(id, v)  { var el = document.getElementById(id); if (el) el.checked = !!v; }
  function getVal(id)       { var el = document.getElementById(id); return el ? el.value : ''; }
  function getCheck(id)     { var el = document.getElementById(id); return el ? el.checked : false; }

  window.cancelConfig = function () { tableau.extensions.ui.closeDialog('cancelled'); };

})();
