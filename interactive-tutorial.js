// =================================================================
//  İnteraktif sudoku öğretici — 4×4 ve 6×6 demo (ana menü "Nasıl oynanır")
// =================================================================

(function () {
  var _size = 4;
  var _grid = [];
  var _given = [];
  var _step = 0;
  var _selected = -1;
  var _flow = [];

  var FLOW_4 = [
    {
      kind: 'msg',
      title: '4×4 ile başlayalım',
      text: 'Küçük bir sudoku: her satırda, her sütunda ve her kalın 2×2 kutuda 1–4 rakamları yalnızca bir kez bulunur. Gerçek oyunda tahta 9×9’dur; mantık aynıdır.',
      btn: 'Devam',
    },
    {
      kind: 'msg',
      title: 'Sabit rakamlar',
      text: 'Gri kutular oyunda verilen sabit sayılardır — dokunulmaz. Sen yalnızca boş kutuları doldurursun.',
      btn: 'Anladım',
    },
    {
      kind: 'fill',
      title: 'İlk hamle',
      text: 'Üst satırdaki boş kutuya dokun, sonra alttan doğru rakamı seç.',
      cells: [1],
      want: 2,
    },
    {
      kind: 'msg',
      title: 'Satır kuralı',
      text: 'Bu satırda 1, 3 ve 4 vardı; eksik olan 2’ydi. Her satırda 1–4’ün hepsi tam bir kez olmalı.',
      btn: 'Devam',
    },
    {
      kind: 'fill',
      title: 'Son boşluk (4×4)',
      text: 'Ortadaki satırdaki boş kutuya doğru rakamı yaz.',
      cells: [6],
      want: 1,
    },
    {
      kind: 'msg',
      title: '4×4 tamam',
      text: 'Harika! Şimdi aynı kurallarla biraz daha büyük bir tahta göreceksin: 6×6.',
      btn: '6×6’ya geç',
    },
  ];

  var FLOW_6 = [
    {
      kind: 'msg',
      title: '6×6 tahta',
      text: 'Burada rakamlar 1–6. Kalın çizgiler 2 satır × 3 sütunluk blokları ayırır (9×9’daki 3×3 kutuların karşılığı).',
      btn: 'Devam',
    },
    {
      kind: 'msg',
      title: 'Sütun ve blok',
      text: 'Bir rakam hem kendi satırında hem sütununda hem de içinde olduğu kalın kutuda tek olmalı.',
      btn: 'Tamam',
    },
    {
      kind: 'fill',
      title: 'Son eksik',
      text: 'Tek boş kutu kaldı. Dokun ve doğru rakamı seç — satır, sütun ve blok ipucu olarak yardımcı olur.',
      cells: [14],
      want: 3,
    },
    {
      kind: 'msg',
      title: 'Öğretici bitti',
      text: 'Artık ana oyundaki günlük veya seviye seçerek 9×9 bulmacalara geçebilirsin. İyi oyunlar!',
      btn: 'Kapat',
    },
  ];

  var INITIAL_4 = [1, 0, 3, 4, 3, 4, 0, 2, 4, 1, 2, 3, 2, 3, 4, 1];
  var INITIAL_6 = [5, 3, 1, 6, 4, 2, 6, 4, 2, 5, 3, 1, 1, 2, 0, 4, 5, 6, 4, 5, 6, 1, 2, 3, 2, 6, 4, 3, 1, 5, 3, 1, 5, 2, 6, 4];

  function el(id) {
    return document.getElementById(id);
  }

  function thickBorderClass(r, c, n, br, bc) {
    var cls = 'it-cell';
    if (c % bc === 0) cls += ' it-bL';
    if (r % br === 0) cls += ' it-bT';
    if (c === n - 1) cls += ' it-bR';
    if (r === n - 1) cls += ' it-bB';
    return cls;
  }

  function renderGrid() {
    var wrap = el('itGrid');
    var n = _size;
    var br = n === 4 ? 2 : 2;
    var bc = n === 4 ? 2 : 3;
    wrap.className = 'it-grid it-grid--' + n;
    wrap.innerHTML = '';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var i = r * n + c;
        var v = _grid[i];
        var isGiven = _given[i];
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.className = thickBorderClass(r, c, n, br, bc);
        cell.dataset.idx = String(i);
        if (isGiven) cell.classList.add('it-cell--given');
        if (v > 0) cell.textContent = String(v);
        else cell.innerHTML = '<span class="it-cell-placeholder"></span>';
        cell.addEventListener('click', onCellClick);
        wrap.appendChild(cell);
      }
    }
    updateGridInteractable();
  }

  function getStep() {
    return _flow[_step];
  }

  function allowedCells() {
    var s = getStep();
    if (!s || s.kind !== 'fill') return null;
    return s.cells;
  }

  function updateGridInteractable() {
    var allow = allowedCells();
    var ac = getStep();
    var fillMode = ac && ac.kind === 'fill';
    el('itGrid').querySelectorAll('.it-cell').forEach(function (cell) {
      var i = parseInt(cell.dataset.idx, 10);
      cell.classList.remove('it-cell--hot', 'it-cell--selected', 'it-cell--muted');
      if (!fillMode) {
        cell.classList.add('it-cell--muted');
        cell.disabled = true;
        return;
      }
      var isHot = allow && allow.indexOf(i) >= 0;
      cell.disabled = !isHot;
      if (isHot) cell.classList.add('it-cell--hot');
      else cell.classList.add('it-cell--muted');
      if (i === _selected) cell.classList.add('it-cell--selected');
    });
  }

  function onCellClick(ev) {
    var cell = ev.currentTarget;
    var i = parseInt(cell.dataset.idx, 10);
    var s = getStep();
    if (!s || s.kind !== 'fill') return;
    if (s.cells.indexOf(i) < 0) return;
    if (_given[i]) return;
    _selected = i;
    updateGridInteractable();
  }

  function renderNumpad() {
    var pad = el('itNumpad');
    pad.innerHTML = '';
    var max = _size;
    var s = getStep();
    var show = s && s.kind === 'fill';
    pad.style.display = show ? 'flex' : 'none';
    if (!show) return;
    for (var d = 1; d <= max; d++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'it-num';
      b.textContent = String(d);
      b.addEventListener('click', function (n) {
        return function () {
          onNumpad(n);
        };
      }(d));
      pad.appendChild(b);
    }
  }

  function onNumpad(n) {
    var s = getStep();
    if (!s || s.kind !== 'fill' || _selected < 0) {
      if (typeof showToast === 'function') showToast('Önce vurgulu kutuya dokun.');
      return;
    }
    if (s.cells.indexOf(_selected) < 0) return;
    if (n === s.want) {
      _grid[_selected] = n;
      _given[_selected] = true;
      _selected = -1;
      renderGrid();
      renderNumpad();
      advanceStep();
    } else {
      if (typeof showToast === 'function') showToast('Bu rakam buraya uymaz — satır, sütun veya kutuda çakışır. Tekrar dene.');
      var cell = el('itGrid').querySelector('[data-idx="' + _selected + '"]');
      if (cell) {
        cell.classList.add('it-shake');
        setTimeout(function () {
          cell.classList.remove('it-shake');
        }, 400);
      }
    }
  }

  function showCoach() {
    var s = getStep();
    var title = el('itCoachTitle');
    var text = el('itCoachText');
    var btn = el('itCoachBtn');
    if (!s) return;
    title.textContent = s.title;
    text.textContent = s.text;
    if (s.kind === 'msg') {
      btn.style.display = 'block';
      btn.textContent = s.btn;
      btn.onclick = function () {
        if (_size === 4 && _step === FLOW_4.length - 1) {
          startPhase6();
        } else if (_size === 6 && _step === FLOW_6.length - 1) {
          closeInteractiveTutorial();
        } else advanceStep();
      };
    } else {
      btn.style.display = 'none';
      btn.onclick = null;
    }
  }

  function advanceStep() {
    _step++;
    if (_size === 4 && _step >= FLOW_4.length) return;
    if (_size === 6 && _step >= FLOW_6.length) return;
    _selected = -1;
    applyStep();
  }

  function applyStep() {
    el('itPhaseLabel').textContent = _size === 4 ? 'Demo 4×4' : 'Demo 6×6';
    showCoach();
    renderGrid();
    renderNumpad();
  }

  function startPhase4() {
    _size = 4;
    _flow = FLOW_4;
    _step = 0;
    _grid = INITIAL_4.slice();
    _given = _grid.map(function (v) {
      return v > 0;
    });
    _selected = -1;
    el('interactiveTutorialModal').style.display = 'flex';
    applyStep();
  }

  function startPhase6() {
    _size = 6;
    _flow = FLOW_6;
    _step = 0;
    _grid = INITIAL_6.slice();
    _given = _grid.map(function (v) {
      return v > 0;
    });
    _selected = -1;
    applyStep();
  }

  function openSudokuTutorial() {
    startPhase4();
  }

  function closeInteractiveTutorial() {
    el('interactiveTutorialModal').style.display = 'none';
    _selected = -1;
  }

  window.openSudokuTutorial = openSudokuTutorial;
  window.closeSudokuTutorial = closeInteractiveTutorial;
  window.closeInteractiveTutorial = closeInteractiveTutorial;
})();
