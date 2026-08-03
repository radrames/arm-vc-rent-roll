'use strict';

(function () {

  var dashWs     = [];
  var sourceCols = [];

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

  window.addEventListener('load', function () {
    tableau.extensions.initializeDialogAsync().then(function () {
      dashWs = tableau.extensions.dashboardContent.dashboard.worksheets;

      populateWorksheetDropdowns();
      initTabs();

      var saved = loadSettings();
      applySavedSettings(saved);

      document.getElementById('btn-save').addEventListener('click', saveAndClose);
    });
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

    tableau.extensions.settings.saveAsync()
      .then(function ()  { tableau.extensions.ui.closeDialog('saved'); })
      .catch(function () { tableau.extensions.ui.closeDialog('saved'); });
  }

  function cssEscape(v) { return String(v).replace(/"/g, '\\"'); }
  function setVal(id, val)  { var el = document.getElementById(id); if (el && val) el.value = val; }
  function setCheck(id, v)  { var el = document.getElementById(id); if (el) el.checked = !!v; }
  function getVal(id)       { var el = document.getElementById(id); return el ? el.value : ''; }
  function getCheck(id)     { var el = document.getElementById(id); return el ? el.checked : false; }

  window.cancelConfig = function () { tableau.extensions.ui.closeDialog('cancelled'); };

})();
