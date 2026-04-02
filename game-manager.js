// =================================================================
//  OYUN YONETICISI - Tahta, Input, Timer, Kazanma
// =================================================================


let generatingGame = false;

function startGame(mode) {
  document.getElementById('swipeDots').style.display = 'none';
  const nav = document.querySelector('.bottom-nav');
  if (nav) nav.style.display = 'none';
closeLevelsSheet();
  if (generatingGame) return;
  if (DIFFICULTIES[mode] && !isUnlocked(mode)) {
    const prog = unlockProgress(mode);
    const req = DIFFICULTIES[mode].unlockRequires;
    const prevLabel = DIFFICULTIES[req.diff].label;
    showToast(`🔒 ${prog.done}/${prog.needed} ${prevLabel} bulmacası çöz`);
    return;
  }

  // Günlük bulmaca — tek hak kontrolü
  if (mode === 'daily') {
    const today = todayStr();
    // Bugün zaten tamamladıysa engelle
    const alreadySolved = appState.scores.some(s => s.date === today && s.mode === 'daily');
    if (alreadySolved) {
      showToast('✅ Bugünün bulmacasını zaten çözdün! Yarın yeni bulmaca gelecek.');
      return;
    }
    // Kayıtlı oyun varsa direkt devam — yeniden başlatma seçeneği yok
    const saved = appState.savedGames && appState.savedGames['daily'];
    if (saved && saved.savedDate === today) {
      _resumeGame(saved);
      return;
    }
    // Eski tarihli kayıt varsa sil
    if (saved) { delete appState.savedGames['daily']; saveState(); }
    // Yeni başlat
    generatingGame = true;
    showToast('⏳ Bulmaca oluşturuluyor...');
    setTimeout(async () => { await _doStartGame(mode); generatingGame = false; }, 60);
    return;
  }

  // Kayıtlı oyun var mı? (günlük dışı)
  const saved = appState.savedGames && appState.savedGames[mode];
  if (saved) {
    _showContinueModal(mode, saved);
    return;
  }

  generatingGame = true;
  showToast('⏳ Bulmaca oluşturuluyor...');
  setTimeout(async () => { await _doStartGame(mode); generatingGame = false; }, 60);
}

async function _doStartGame(mode) {
  stopTimer();
  window.saveGameSession && window.saveGameSession(mode);
  const cfg = DIFFICULTIES[mode];
  let puzzle, solution, techniquesUsed;

  if (mode === 'daily' && sb) {
    const today = todayStr();
    const { data: existing, error } = await sb.from('daily_puzzles').select('puzzle,solution').eq('date', today).maybeSingle();
    if (error || !existing) {
  showToast('⏳ Günlük bulmaca hazırlanıyor...');
  try {
    await sb.functions.invoke('generate-daily-puzzle');
    const retry = await sb
      .from('daily_puzzles')
      .select('puzzle,solution')
      .eq('date', today)
      .maybeSingle();
    if (retry.data) {
      puzzle = retry.data.puzzle;
      solution = retry.data.solution;
      techniquesUsed = new Set();
    } else {
      showToast('❌ Bugünün bulmacası yüklenemedi, lütfen tekrar dene.');
      return;
    }
  } catch(e) {
    showToast('❌ Bugünün bulmacası yüklenemedi, lütfen tekrar dene.');
    return;
  }
} else {
  puzzle = existing.puzzle;
  solution = existing.solution;
  techniquesUsed = new Set();
}
    puzzle = existing.puzzle;
    solution = existing.solution;
    techniquesUsed = new Set();
  } else {
    const seed = Math.random() * 1e9 | 0;
    const result = generatePuzzle(mode, seed);
    puzzle = result.puzzle;
    solution = result.solution;
    techniquesUsed = result.techniquesUsed;
  }

  G = {
    mode,
    solution:       [...solution],
    userGrid:       [...puzzle],
    given:          puzzle.map(v => v !== 0),
    pencilGrid:     Array.from({length: 81}, () => new Array(9).fill(false)),
    selectedCell:   -1,
    pencilMode:     false,
    errors:         0,
    hintsLeft:      cfg.hints,
    timerSec:       0,
    timerInterval:  null,
    history:        [],
    completed:      false,
    paused:         false,
    gameLost:       false,
    techniquesUsed: techniquesUsed || new Set(),
    extraErrorUsed: false,
    extraHintUsed:  false,
  };

  // Header UI
  document.getElementById('gameTitle').textContent = mode === 'daily' ? 'Günün Bulmacası' : cfg.label;
  const badge = document.getElementById('diffBadge');
  badge.className = `diff-badge ${cfg.badge}`;
  badge.textContent = cfg.label.toUpperCase();

  renderGrid();
  updateStats();
  resetPauseUi();
  // Oyun ekranını overlay olarak aç, nav gizle
  document.getElementById('gameScreen').classList.add('active');
  startTimer();
}

// ═══════════════════════════════════════════════
//  GRID RENDERING
// ═══════════════════════════════════════════════

function renderGrid() {
  const container = document.getElementById('sudokuGrid');
  container.innerHTML = '';

  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;

    const val = G.userGrid[i];
    const isGiven = G.given[i];
    const isEmpty = val === 0;

    if (isGiven) {
      // Original clue — never changes
      cell.classList.add('given');
      const span = document.createElement('span');
      span.className = 'cell-num';
      span.textContent = val;
      cell.appendChild(span);

    } else if (!isEmpty) {
      // User typed a number
      if (val !== G.solution[i]) {
        cell.classList.add('has-error');
      } else {
        cell.classList.add('user-input');
      }
      const span = document.createElement('span');
      span.className = 'cell-num';
      span.textContent = val;
      cell.appendChild(span);

    } else {
      // Truly empty — only show pencil notes, NO number
      const notes = G.pencilGrid[i];
      if (notes.some(Boolean)) {
        const pg = document.createElement('div');
        pg.className = 'pencil-grid';
        for (let n = 1; n <= 9; n++) {
          const pn = document.createElement('div');
          pn.className = 'pencil-num';
          pn.textContent = notes[n-1] ? String(n) : '';
          pg.appendChild(pn);
        }
        cell.appendChild(pg);
      }
    }

    cell.addEventListener('click', () => selectCell(i));
    container.appendChild(cell);
  }

  applyHighlights();
  buildNumpad();
}

function applyHighlights() {
  const cells = document.querySelectorAll('.cell');
  const sel = G.selectedCell;

  cells.forEach((cell, i) => {
    cell.classList.remove('selected', 'highlight', 'same-num');
    if (sel === -1) return;

    const selRow = Math.floor(sel / 9);
    const selCol = sel % 9;
    const selBox = Math.floor(selRow / 3) * 3 + Math.floor(selCol / 3);
    const row = Math.floor(i / 9);
    const col = i % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

    if (i === sel) {
      cell.classList.add('selected');
    } else if (row === selRow || col === selCol || box === selBox) {
      cell.classList.add('highlight');
    }

    // Sadece satır/sütun/kutu highlight - same-num yok (kafa karıştırıyor)

  });
}

function selectCell(idx) {
  if (G.completed || G.paused) return;
  G.selectedCell = idx;
  applyHighlights();
  // Verilen hücre değilse floating numpad aç
  // floating numpad kaldırıldı
  highlightSameNumbers();
}

function openNumpad() {
  const el = document.getElementById('floatingNumpad');
  if (el) { el.style.display = 'flex'; buildFloatingNumpad(); }
}

function closeNumpad() {
  const el = document.getElementById('floatingNumpad');
  if (el) el.style.display = 'none';
}

function buildFloatingNumpad() {
  const btns = document.querySelectorAll('#floatingNumpad .num-btn');
  btns.forEach((btn, i) => {
    const n = i + 1;
    let count = 0;
    for (let j = 0; j < 81; j++) {
      if (G.userGrid[j] === n && (G.given[j] || G.userGrid[j] === G.solution[j])) count++;
    }
    btn.classList.toggle('completed', count >= 9);
  });
}

function inputNum(n) { inputNumber(n); }

// ═══════════════════════════════════════════════
//  NUMPAD
// ═══════════════════════════════════════════════

function buildNumpad() {
  const np = document.getElementById('numpad');
  np.innerHTML = '';
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.textContent = n;
    let count = 0;
    for (let i = 0; i < 81; i++) {
      if (G.userGrid[i] === n && (G.given[i] || G.userGrid[i] === G.solution[i])) count++;
    }
    if (count >= 9) {
      btn.classList.add('completed');
      btn.disabled = true;
    }
    btn.addEventListener('touchend', (e) => { e.preventDefault(); inputNumber(n); });
    btn.addEventListener('click', (e) => { if (!e.isTrusted || e.pointerType === 'touch') return; inputNumber(n); });
    np.appendChild(btn);
  }
}

// ═══════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════

function inputNumber(n) {
  const idx = G.selectedCell;
  if (idx === -1 || G.given[idx] || G.completed || G.paused || G.gameLost) return;

  if (G.pencilMode) {
    // Save undo snapshot
    G.history.push({
      idx,
      prevVal: G.userGrid[idx],
      prevPencil: [...G.pencilGrid[idx]],
    });
    // Toggle pencil note (only if cell is empty)
    if (G.userGrid[idx] === 0) {
      G.pencilGrid[idx][n - 1] = !G.pencilGrid[idx][n - 1];
    }
  } else {
    // Save undo snapshot
    G.history.push({
      idx,
      prevVal: G.userGrid[idx],
      prevPencil: [...G.pencilGrid[idx]],
    });

    // Place the number
    const prevVal = G.userGrid[idx];
    G.userGrid[idx] = n;
    G.pencilGrid[idx] = new Array(9).fill(false);

    if (n !== G.solution[idx]) {
      // Aynı yanlış sayıyı tekrar girince sayma, farklı yanlış sayı girince say
      const sameWrongAgain = (prevVal === n);
      if (!sameWrongAgain) G.errors++;
      const cellEl = document.querySelector(`.cell[data-index="${idx}"]`);
      if (cellEl) { cellEl.classList.add('shake'); setTimeout(() => cellEl.classList.remove('shake'), 300); }
      if (!sameWrongAgain) {
        const errEl = document.getElementById('errorsDisplay');
        if (errEl) {
          errEl.classList.remove('error-bump');
          void errEl.offsetWidth;
          errEl.classList.add('error-bump');
          setTimeout(() => errEl.classList.remove('error-bump'), 500);
        }
      }
      // Hata sınırı kontrolü
      const maxErr = DIFFICULTIES[G.mode]?.maxErrors ?? 3;
      if (G.errors >= maxErr) {
        G.gameLost = true;
        G.completed = true;
        renderGrid(); updateStats();
        setTimeout(() => showGameOverModal(), 400);
        return;
      }
    } else {
      // Correct — clear pencil notes for this number in peers
      removePencilNote(idx, n);
      const cellEl = document.querySelector(`.cell[data-index="${idx}"]`);
      if (cellEl) { cellEl.classList.add('pop'); setTimeout(() => cellEl.classList.remove('pop'), 220); }
    }
  }

  renderGrid();
  updateStats();
  checkLineCompletion(idx);
  checkWin();
  if (!G.completed) autoCompleteSingle();
  buildNumpad();
}

// Remove pencil note `n` from all cells in same row, col, box as `idx`
function removePencilNote(idx, n) {
  const row = Math.floor(idx / 9);
  const col = idx % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    const inSameRow = r === row;
    const inSameCol = c === col;
    const inSameBox = Math.floor(r / 3) * 3 === boxRow && Math.floor(c / 3) * 3 === boxCol;
    if (inSameRow || inSameCol || inSameBox) {
      G.pencilGrid[i][n - 1] = false;
    }
  }
}

function checkLineCompletion(idx) {
  const row = Math.floor(idx / 9);
  const col = idx % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  // Satır tamamlandı mı?
  const rowComplete = Array.from({length: 9}, (_, c) => row * 9 + c)
    .every(i => G.userGrid[i] !== 0 && G.userGrid[i] === G.solution[i]);

  // Sütun tamamlandı mı?
  const colComplete = Array.from({length: 9}, (_, r) => r * 9 + col)
    .every(i => G.userGrid[i] !== 0 && G.userGrid[i] === G.solution[i]);

  // 3×3 kutu tamamlandı mı?
  const boxIndices = [];
  for (let r = boxRow; r < boxRow + 3; r++)
    for (let c = boxCol; c < boxCol + 3; c++)
      boxIndices.push(r * 9 + c);
  const boxComplete = boxIndices.every(i => G.userGrid[i] !== 0 && G.userGrid[i] === G.solution[i]);

  const flashIndices = new Set();
  if (rowComplete) Array.from({length: 9}, (_, c) => row * 9 + c).forEach(i => flashIndices.add(i));
  if (colComplete) Array.from({length: 9}, (_, r) => r * 9 + col).forEach(i => flashIndices.add(i));
  if (boxComplete) boxIndices.forEach(i => flashIndices.add(i));

  if (flashIndices.size === 0) return;

  // Kısa gecikmeyle parlat (renderGrid'den sonra)
  setTimeout(() => {
    const els = [];
    flashIndices.forEach(i => {
      const el = document.querySelector(`.cell[data-index="${i}"]`);
      if (el) {
        el.classList.remove('flash-complete');
        els.push(el);
      }
    });
    // Hepsini tek seferde reflow'dan geçir, sonra hepsine aynı anda class ekle
    void document.getElementById('sudokuGrid').offsetWidth;
    els.forEach(el => el.classList.add('flash-complete'));
    setTimeout(() => els.forEach(el => el.classList.remove('flash-complete')), 1000);
  }, 50);
}

function eraseCell() {
  const idx = G.selectedCell;
  if (idx === -1 || G.given[idx] || G.completed || G.paused) return;
  G.history.push({ idx, prevVal: G.userGrid[idx], prevPencil: [...G.pencilGrid[idx]] });
  G.userGrid[idx] = 0;
  G.pencilGrid[idx] = new Array(9).fill(false);
  renderGrid();
  updateStats();
  highlightSameNumbers();
}

function undoMove() {
  if (G.history.length === 0) { showToast('Geri alınacak hamle yok'); return; }
  const snap = G.history.pop();
  G.userGrid[snap.idx] = snap.prevVal;
  G.pencilGrid[snap.idx] = [...snap.prevPencil];
  renderGrid();
  updateStats();
}

function togglePencil() {
  G.pencilMode = !G.pencilMode;
  document.getElementById('pencilBtn').classList.toggle('active', G.pencilMode);
  updateNumpadPencilState();
}

function useHint() {
  if (G.selectedCell === -1) { showToast('Önce bir hücre seç'); return; }
  const idx = G.selectedCell;
  if (G.given[idx]) { showToast('Bu hücre zaten verili ✅'); return; }
  if (G.userGrid[idx] === G.solution[idx]) { showToast('Bu hücre zaten doğru ✅'); return; }

  if (G.hintsLeft <= 0) {
    if (!G.extraHintUsed) {
      showRewardedAdModal('hint');
    } else {
      showToast('İpucu hakkın kalmadı!');
    }
    return;
  }

  G.history.push({ idx, prevVal: G.userGrid[idx], prevPencil: [...G.pencilGrid[idx]] });
  G.userGrid[idx] = G.solution[idx];
  G.pencilGrid[idx] = new Array(9).fill(false);
  removePencilNote(idx, G.solution[idx]);
  G.hintsLeft--;

  renderGrid();
  updateStats();

  const cellEl = document.querySelector(`.cell[data-index="${idx}"]`);
  if (cellEl) { cellEl.classList.add('hint-reveal', 'pop'); setTimeout(() => cellEl.classList.remove('pop'), 300); }

  showToast('💡 İpucu kullanıldı!');
  checkWin();
}

function resetPauseUi() {
  const overlay = document.getElementById('pauseOverlay');
  const grid = document.querySelector('.sudoku-grid');
  const spPause = document.getElementById('pauseSvgPause');
  const spPlay = document.getElementById('pauseSvgPlay');
  const btn = document.getElementById('pauseBtn');
  if (overlay) overlay.style.display = 'none';
  if (grid) grid.style.visibility = 'visible';
  if (spPause) spPause.style.display = 'flex';
  if (spPlay) spPlay.style.display = 'none';
  if (btn) btn.setAttribute('aria-label', 'Duraklat');
}

function pauseGame() {
  const overlay = document.getElementById("pauseOverlay");
  const btn = document.getElementById("pauseBtn");
  const spPause = document.getElementById("pauseSvgPause");
  const spPlay = document.getElementById("pauseSvgPlay");
  const grid = document.querySelector(".sudoku-grid");
  if (!G.paused) {
    G.paused = true;
    stopTimer();
    overlay.style.display = "flex";
    if (grid) grid.style.visibility = "hidden"; // Tahtayı gizle
    if (spPause) spPause.style.display = "none";
    if (spPlay) spPlay.style.display = "flex";
    if (btn) btn.setAttribute("aria-label", "Devam");
  } else {
    G.paused = false;
    startTimer();
    overlay.style.display = "none";
    if (grid) grid.style.visibility = "visible"; // Tahtayı göster
    if (spPause) spPause.style.display = "flex";
    if (spPlay) spPlay.style.display = "none";
    if (btn) btn.setAttribute("aria-label", "Duraklat");
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && !G.paused && !G.completed) {
    pauseGame();
  }
});

function _showContinueModal(mode, saved) {
  const cfg = DIFFICULTIES[mode] || { label: 'Günlük' };
  document.getElementById('continueModalTitle').textContent = cfg.label + ' bulmacası';
  document.getElementById('continueModalTime').textContent = formatTime(saved.timerSec);
  document.getElementById('continueModalErrors').textContent = saved.errors;
  document.getElementById('continueModalDate').textContent =
    saved.savedDate === todayStr() ? 'Bugün bıraktın' : saved.savedDate;
  document.getElementById('continueModal').dataset.mode = mode;
  showModal('continueModal');
}

function _resumeGame(saved) {
  const mode = saved.mode || G.mode;
  stopTimer();
  G = {
    mode,
    solution:       [...saved.solution],
    userGrid:       [...saved.userGrid],
    given:          [...saved.given],
    pencilGrid:     saved.pencilGrid.map(a => [...a]),
    selectedCell:   -1,
    pencilMode:     false,
    errors:         saved.errors,
    hintsLeft:      saved.hintsLeft,
    timerSec:       saved.timerSec,
    timerInterval:  null,
    history:        [],
    completed:      false,
    paused:         false,
    gameLost:       false,
    techniquesUsed: new Set(),
    extraErrorUsed: saved.extraErrorUsed || false,
    extraHintUsed:  saved.extraHintUsed  || false,
  };
  const cfg = DIFFICULTIES[mode] || {};
  document.getElementById('gameTitle').textContent = mode === 'daily' ? 'Günün Bulmacası' : cfg.label;
  const badge = document.getElementById('diffBadge');
  badge.className = `diff-badge ${cfg.badge || ''}`;
  badge.textContent = (cfg.label || 'Günlük').toUpperCase();
  renderGrid();
  updateStats();
  resetPauseUi();
  document.getElementById('gameScreen').classList.add('active');
  startTimer();
  showToast('▶️ Kaldığın yerden devam ediyorsun!');
}

function resumeGame() {
  const mode = document.getElementById('continueModal').dataset.mode;
  const saved = appState.savedGames[mode];
  hideModal('continueModal');
  if (!saved) { startGame(mode); return; }

  stopTimer();
  G = {
    mode,
    solution:       [...saved.solution],
    userGrid:       [...saved.userGrid],
    given:          [...saved.given],
    pencilGrid:     saved.pencilGrid.map(a => [...a]),
    selectedCell:   -1,
    pencilMode:     false,
    errors:         saved.errors,
    hintsLeft:      saved.hintsLeft,
    timerSec:       saved.timerSec,
    timerInterval:  null,
    history:        [],
    completed:      false,
    paused:         false,
    gameLost:       false,
    techniquesUsed: new Set(),
    extraErrorUsed: saved.extraErrorUsed || false,
    extraHintUsed:  saved.extraHintUsed  || false,
  };

  const cfg = DIFFICULTIES[mode] || {};
  document.getElementById('gameTitle').textContent = mode === 'daily' ? 'Günün Bulmacası' : cfg.label;
  const badge = document.getElementById('diffBadge');
  badge.className = `diff-badge ${cfg.badge || ''}`;
  badge.textContent = (cfg.label || 'Günlük').toUpperCase();

  renderGrid();
  updateStats();
  resetPauseUi();
  document.getElementById('gameScreen').classList.add('active');
  startTimer();
  showToast('▶️ Kaldığın yerden devam ediyorsun!');
}

function startFreshGame() {
  const mode = document.getElementById('continueModal').dataset.mode;
  delete appState.savedGames[mode];
  saveState();
  hideModal('continueModal');
  generatingGame = true;
  showToast('⏳ Bulmaca oluşturuluyor...');
  setTimeout(async () => { await _doStartGame(mode); generatingGame = false; }, 60);
}


function confirmBack() {
  stopTimer();
  exitGame();
}
// ═══════════════════════════════════════════════

function startTimer() {
  stopTimer();
  G.timerInterval = setInterval(() => {
    G.timerSec++;
    document.getElementById('timerDisplay').textContent = formatTime(G.timerSec);
  }, 1000);
}

function stopTimer() {
  if (G.timerInterval) { clearInterval(G.timerInterval); G.timerInterval = null; }
}

// ═══════════════════════════════════════════════
//  STATS
// ═══════════════════════════════════════════════

function updateStats() {
  document.getElementById('errorsDisplay').textContent = G.errors + '/' + (DIFFICULTIES[G.mode]?.maxErrors ?? 3);
  document.getElementById('hintsDisplay').textContent = G.hintsLeft;
  document.getElementById('streakDisplay').textContent = appState.streak + '🔥';
}

function autoCompleteSingle() {
  if (G.completed || G.gameLost || G.paused) return;

  // Sadece TÜM boş hücrelerin tek adayı varsa otomatik tamamla
  // (yani artık hiçbir hücrede "seçim" kalmadıysa)
  for (let idx = 0; idx < 81; idx++) {
    if (G.userGrid[idx] !== 0) continue;

    const row = Math.floor(idx / 9);
    const col = idx % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    const used = new Set();
    for (let c = 0; c < 9; c++) used.add(G.userGrid[row * 9 + c]);
    for (let r = 0; r < 9; r++) used.add(G.userGrid[r * 9 + col]);
    for (let r = boxRow; r < boxRow + 3; r++)
      for (let c = boxCol; c < boxCol + 3; c++)
        used.add(G.userGrid[r * 9 + c]);

    let candidateCount = 0;
    for (let n = 1; n <= 9; n++) {
      if (!used.has(n)) candidateCount++;
    }

    // Herhangi bir hücrede 2+ aday varsa → kullanıcı hâlâ seçim yapabilir, dur
    if (candidateCount > 1) return;
  }

  // Buraya geldiyse: tüm boş hücrelerde tek aday var → hepsini doldur
  let filled = false;
  for (let idx = 0; idx < 81; idx++) {
    if (G.userGrid[idx] !== 0) continue;

    const row = Math.floor(idx / 9);
    const col = idx % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    const used = new Set();
    for (let c = 0; c < 9; c++) used.add(G.userGrid[row * 9 + c]);
    for (let r = 0; r < 9; r++) used.add(G.userGrid[r * 9 + col]);
    for (let r = boxRow; r < boxRow + 3; r++)
      for (let c = boxCol; c < boxCol + 3; c++)
        used.add(G.userGrid[r * 9 + c]);

    for (let n = 1; n <= 9; n++) {
      if (!used.has(n) && n === G.solution[idx]) {
        G.history.push({ idx, prevVal: 0, prevPencil: [...G.pencilGrid[idx]] });
        G.userGrid[idx] = n;
        G.pencilGrid[idx] = new Array(9).fill(false);
        removePencilNote(idx, n);
        filled = true;
        break;
      }
    }
  }

  if (filled) {
    renderGrid();
    updateStats();
    checkWin();
  }
}


// ═══════════════════════════════════════════════
//  WIN CHECK
// ═══════════════════════════════════════════════

function checkWin() {
  // Must have all 81 cells filled correctly
  for (let i = 0; i < 81; i++) {
    if (G.userGrid[i] !== G.solution[i]) return;
  }

  G.completed = true;
  stopTimer();
  // Journey level tamamlandıysa ilerle
  if (window._activeJourneyLevel) {
    const jl = window._activeJourneyLevel;
    const cur = getJourneyProgress();
    if (jl === cur + 1) {
      localStorage.setItem('journey_progress', jl);
      setTimeout(() => showToast('🗺️ Bölüm ' + jl + ' tamamlandı! ' + (jl % 20 === 0 ? '🎉 Yeni chapter açıldı!' : '')), 2000);
      updateJourneyHomeBtn();
      // Hatasız / ipucusuz journey sayaçları
      if (G.errors === 0) {
        appState.journeyPerfect = (appState.journeyPerfect || 0) + 1;
      }
      const hintsUsed = DIFFICULTIES[G.mode].hints - G.hintsLeft;
      if (hintsUsed === 0) {
        appState.journeyNoHint = (appState.journeyNoHint || 0) + 1;
      }
      // Yeni journey rozeti kazanıldı mı?
      const newJrnBadges = getEarnedBadges().filter(b => b.id.startsWith('jrn_') && (!appState.earnedBadges || !appState.earnedBadges.includes(b.id)));
      if (!appState.earnedBadges) appState.earnedBadges = [];
      newJrnBadges.forEach(b => {
        appState.earnedBadges.push(b.id);
        setTimeout(() => showToast('🎖️ Yeni rozet: ' + b.name + ' ' + b.icon), 2500);
      });
      saveState();
    }
    window._activeJourneyLevel = null;
  }

  // Journey modunda skor/badge/unlock sistemi çalışmasın
  if (window._activeJourneyLevel) {
    const jl = window._activeJourneyLevel;
    const cur = getJourneyProgress();
    if (jl === cur + 1) {
      localStorage.setItem('journey_progress', jl);
      setTimeout(() => showToast('🗺️ Bölüm ' + jl + ' tamamlandı!' + (jl % 20 === 0 ? ' 🎉 Yeni chapter açıldı!' : '')), 2000);
      updateJourneyHomeBtn();
    }
    window._activeJourneyLevel = null;
    // Normal akışa devam etme
    setTimeout(() => {
      const cfg = DIFFICULTIES[G.mode];
      document.getElementById('winEmoji').textContent = '🗺️';
      document.getElementById('winTitle').textContent = 'Bölüm Tamamlandı!';
      document.getElementById('winSub').textContent = jl + '. bölümü ' + formatTime(G.timerSec) + '\'de çözdün!';
      document.getElementById('winTime').textContent = formatTime(G.timerSec);
      document.getElementById('winErrors').textContent = G.errors;
      document.getElementById('winHints').textContent = (cfg.hints || 3) - G.hintsLeft;
      document.getElementById('winRank').textContent = '';
      const recordBadge = document.getElementById('winRecordBadge');
      if (recordBadge) recordBadge.style.display = 'none';
      showModal('winModal');
      launchConfetti();
      if (appState.savedGames && appState.savedGames[G.mode]) {
        delete appState.savedGames[G.mode];
        saveState();
      }
    }, 500);
    return; // ← skor/badge/unlock kısmına hiç girme
  }
  const today = todayStr();
  const hintsUsed = (DIFFICULTIES[G.mode]?.hints || 3) - G.hintsLeft;
  appState.scores.push({ date: today, time: G.timerSec, errors: G.errors, mode: G.mode, hints_used: hintsUsed, hour: new Date().getHours() });
  if (G.mode === 'daily') {
    const yesterday = dateStr(1);
    if (appState.lastPlayedDate === yesterday) appState.streak++;
    else if (appState.lastPlayedDate !== today) appState.streak = 1;
    if (appState.streak > (appState.bestStreak || 0)) {
  appState.bestStreak = appState.streak;
}
    appState.lastPlayedDate = today;
    // Supabase'e kaydet
    saveDailyScore(G.timerSec, G.errors, hintsUsed);
    saveGameSession(G.mode);
  }
  if (G.mode === 'tournament') {
    finishTournamentPuzzle(G.timerSec);
    return;
  }
    // Check for new badges
    const newBadges = getEarnedBadges().filter(b => !appState.earnedBadges || !appState.earnedBadges.includes(b.id));
    if (!appState.earnedBadges) appState.earnedBadges = [];
    newBadges.forEach(b => {
      if (!appState.earnedBadges.includes(b.id)) {
        appState.earnedBadges.push(b.id);
        setTimeout(() => showToast('🎖️ Yeni rozet: ' + b.name + ' ' + b.icon), 1500);
      }
    });
    saveState();

    // Yeni seviye açıldı mı kontrol et
    const DIFF_ORDER = ['beginner','easy','medium','hard','expert','master'];
    DIFF_ORDER.forEach(diff => {
      if (isUnlocked(diff) && !appState.unlockedDiffs?.includes(diff)) {
        if (!appState.unlockedDiffs) appState.unlockedDiffs = ['beginner'];
        if (!appState.unlockedDiffs.includes(diff)) {
          appState.unlockedDiffs.push(diff);
          saveState();
          setTimeout(() => showUnlockCelebration(diff), 2000);
        }
      }
    });

  setTimeout(() => {
    const cfg = DIFFICULTIES[G.mode];
    const emojis = { beginner:'🌱', easy:'🌿', medium:'🌊', hard:'⛰️', expert:'🌋', master:'🌌', daily:'📅' };
    document.getElementById('winEmoji').textContent = emojis[G.mode] || '🎉';
    document.getElementById('winTitle').textContent = G.errors === 0 ? 'Mükemmel! 🏆' : 'Tebrikler!';
    document.getElementById('winSub').textContent = `${cfg.label} bulmacayı ${formatTime(G.timerSec)}'de çözdün!`;
    document.getElementById('winTime').textContent = formatTime(G.timerSec);
    // Hata sayısını yaz
document.getElementById('winErrors').textContent = G.errors;

// Hata noktalarını çiz
const dots = document.getElementById('winErrorDots');
if (dots) {
  dots.innerHTML = '';
  const maxErr = DIFFICULTIES[G.mode]?.maxErrors ?? 3;
  for (let i = 0; i < maxErr; i++) {
    const d = document.createElement('div');
    d.style.cssText = `width:8px;height:8px;border-radius:50%;background:${i < G.errors ? 'var(--danger)' : 'var(--border)'};`;
    dots.appendChild(d);
  }
}
    document.getElementById('winHints').textContent = (cfg.hints || 3) - G.hintsLeft;
    document.getElementById('winRank').textContent = '#' + calcRank(G.timerSec);

    // Kişisel rekor kontrolü
    const prevBest = appState.scores
      .filter(s => s.mode === G.mode && s.time < G.timerSec)
      .length === 0 && appState.scores.filter(s => s.mode === G.mode).length > 0;
    const scores = appState.scores.filter(s => s.mode === G.mode);
    const isRecord = scores.length > 1 && G.timerSec === Math.min(...scores.map(s => s.time));
    const recordBadge = document.getElementById('winRecordBadge');
    if (recordBadge) recordBadge.style.display = isRecord ? 'block' : 'none';

    showModal('winModal');
    launchConfetti();

    // Kayıtlı oyunu temizle
    if (appState.savedGames && appState.savedGames[G.mode]) {
      delete appState.savedGames[G.mode];
      saveState();
    }
    // Cloud'a sync et
    syncProfileToCloud();
  }, 500);
}


// ═══════════════════════════════════════════════
//  GAME OVER & REWARDED AD
// ═══════════════════════════════════════════════

function showRulesModal() {
  if (G.paused === false && G.timerInterval) pauseGame();
  showModal('rulesModal');
}

function showGameOverModal() {
  stopTimer();
  G.gameLost = true;
  G.completed = true;
  document.getElementById('goTime').textContent = formatTime(G.timerSec);
  document.getElementById('goHints').textContent = G.hintsLeft;
  const watchBtn = document.getElementById('gameOverWatchBtn');
  if (watchBtn) watchBtn.style.display = G.extraErrorUsed ? 'none' : 'flex';
  showModal('gameOverModal');
  if (appState.savedGames && appState.savedGames[G.mode]) {
    delete appState.savedGames[G.mode];
    saveState();
  }
}


// ═══════════════════════════════════════════════
//  KONFETİ
// ═══════════════════════════════════════════════

function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#3b82f6','#f5c842','#e74c3c','#27ae60','#60a5fa','#9b59b6','#93c5fd'];
  const shapes = ['●', '■', '▲', '◆'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.textContent = shapes[Math.floor(Math.random() * shapes.length)];
    piece.style.cssText = `
      left:${Math.random()*100}%;
      color:${colors[Math.floor(Math.random()*colors.length)]};
      font-size:${8+Math.random()*10}px;
      animation-duration:${1.5+Math.random()*2}s;
      animation-delay:${Math.random()*0.8}s;
    `;
    container.appendChild(piece);
  }
  setTimeout(() => { container.innerHTML = ''; }, 4000);
}


// ═══════════════════════════════════════════════
//  KALEM MODU NUMPAD RENK
// ═══════════════════════════════════════════════

function updateNumpadPencilState() {
  const np = document.getElementById('numpad');
  if (!np) return;
  np.classList.toggle('pencil-active', G.pencilMode);
}

function highlightSameNumbers() {
    // 1. Önce tahtadaki eski parlamaları temizle
    document.querySelectorAll('.cell.highlight-same').forEach(c => c.classList.remove('highlight-same'));

    // 2. Senin oyununda "seçili" olan hücreyi bul (Oyunun buna 'selected' class'ı verdiğini varsayıyoruz)
    const selectedCell = document.querySelector('.cell.selected') || document.querySelector('.cell.active');
    if (!selectedCell) return;

    // 3. İçindeki rakamı al (Kutu boşsa hiçbir şey yapma)
    const val = selectedCell.innerText.trim();
    if (val === '' || val === '0') return;

    // 4. Tahtadaki tüm kutuları gez, aynı rakamı taşıyanları parlat!
    document.querySelectorAll('.cell').forEach(cell => {
        if (cell.innerText.trim() === val) {
            cell.classList.add('highlight-same');
        }
    });
}