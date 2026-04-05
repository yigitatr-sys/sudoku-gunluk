// =================================================================
//  UI YONETICISI - Navigasyon, Ana Ekran, Ayarlar, Onboarding
// =================================================================


function showStreakPopup() {
  document.getElementById('popupCurrentStreak').textContent = appState.streak || 0;
  document.getElementById('popupBestStreak').textContent = appState.bestStreak || 0;
  const modal = document.getElementById('streakPopupModal');
  modal.style.display = 'flex';
}

function hideStreakPopup() {
  document.getElementById('streakPopupModal').style.display = 'none';
}


// ═══════════════════════════════════════════════
//  SCREENS
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
//  NAVİGASYON — Alt Menü (Bottom Nav)
// ═══════════════════════════════════════════════

const BOTTOM_TAB_CFG = {
  home:        { panel: 'homePanel',        btnId: 'navHome'        },
  duel:        { panel: 'duelPanel',        btnId: 'navDuel'        },
  tournament:  { panel: 'tournamentPanel',  btnId: 'navTournament'  },
  leaderboard: { panel: 'lbPanel',          btnId: 'navLb'          },
  profile:     { panel: 'profilePanel',     btnId: 'navProfile'     },
};

let _activeBottomTab = 'home';

function switchBottomNav(tabKey) {
  if (tabKey !== 'home') closeHomeStreakPanel();
  // Tüm nav butonlarını pasif yap
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  const cfg = BOTTOM_TAB_CFG[tabKey];
  if (cfg) document.getElementById(cfg.btnId)?.classList.add('active');

  if (!cfg || !cfg.panel) return;

  document.getElementById('settingsPanel')?.classList.remove('active');
  document.getElementById('friendsPanel')?.classList.remove('active');

  // Aktif ana paneli bul (friends/settings overlay panelleri hariç — lbPanel artık normal tab)
  const overlayIds = ['friendsPanel', 'settingsPanel'];
  const prev = [...document.querySelectorAll('.tab-panel.active')]
    .find(p => !overlayIds.includes(p.id));
  const next = document.getElementById(cfg.panel);
  if (!next || prev === next) {
    _onTabActivated(tabKey);
    return;
  }
  if (prev) prev.classList.remove('active');
  next.classList.add('active');
  _activeBottomTab = tabKey;
  _onTabActivated(tabKey);
}

function _onTabActivated(tabKey) {
  if (tabKey === 'home')        updateHomeScreen();
  if (tabKey === 'duel') {
    if (typeof loadLeagueStats === 'function' && typeof updateDuelScreenUI === 'function') {
      loadLeagueStats().then(() => updateDuelScreenUI());
    }
  }
  if (tabKey === 'tournament') {
    if (typeof loadTournament === 'function') {
      loadTournament().then(() => {
        if (typeof switchTrnTab === 'function') switchTrnTab('daily');
      }).catch(() => {
        if (typeof switchTrnTab === 'function') switchTrnTab('daily');
      });
    }
  }
  if (tabKey === 'leaderboard') { if (typeof renderLeaderboard === 'function') renderLeaderboard(); }
  if (tabKey === 'profile')     { renderStats(); updateBadgeSummary(); }
}

// showPanel — HTML onclick'lerden çağrılır, panel ID'sini tab key'e çevirir
function showPanel(panelId) {
  const panelMap = {
    'homePanel':       'home',
    'duelPanel':       'duel',
    'tournamentPanel': 'tournament',
    'lbPanel':         'leaderboard',
    'profilePanel':    'profile',
  };
  const key = panelMap[panelId];
  if (key) switchBottomNav(key);
}

// Sıralama — normal tab olarak aç (geriye uyumluluk)
function openLbScreen() {
  switchBottomNav('leaderboard');
}

function closeLbScreen() {
  switchBottomNav('home');
}

// Geriye uyumluluk — eski switchTab(panelId, btn) çağrıları için
function switchTab(panelId, btn) {
  if (panelId === 'lbPanel')           { openLbScreen(); return; }
  if (panelId === 'homePanel')         { switchBottomNav('home'); return; }
  if (panelId === 'profilePanel')      { switchBottomNav('profile'); return; }
  if (panelId === 'tournamentScreen' || panelId === 'tournamentPanel') { switchBottomNav('tournament'); return; }
  // Genel durum: direkt göster
  const prev = document.querySelector('.tab-panel.active');
  const next = document.getElementById(panelId);
  if (!next || prev === next) return;
  if (prev) prev.classList.remove('active');
  next.classList.add('active');
}

function showScreen(id) {
  if (id === 'lbScreen')    { openLbScreen(); return; }
  if (id === 'homeScreen')  { switchBottomNav('home'); return; }
  if (id === 'statsScreen') { switchBottomNav('profile'); return; }
  if (id === 'gameScreen')  { document.getElementById('gameScreen').classList.add('active'); }
}

function exitGame() {
  if (typeof resetPauseUi === 'function') resetPauseUi();
  const gos = document.getElementById('gameOverScreen');
  if (gos) gos.style.display = 'none';
  const ws = document.getElementById('winScreen');
  if (ws) ws.style.display = 'none';
  document.getElementById('swipeDots').style.display = 'flex';
  const nav = document.querySelector('.bottom-nav');
  if (nav) nav.style.display = 'flex';
  // Tamamlanmamış oyunu kaydet
  if (!G.completed && !G.gameLost && G.solution.length > 0) {
    appState.savedGames = appState.savedGames || {};
    syncProfileToCloud();
    appState.savedGames[G.mode] = {
      mode:        G.mode,
      solution:    G.solution,
      userGrid:    G.userGrid,
      given:       G.given,
      pencilGrid:  G.pencilGrid.map(a => [...a]),
      errors:      G.errors,
      hintsLeft:   G.hintsLeft,
      timerSec:    G.timerSec,
      savedDate:   todayStr(),
      extraErrorUsed: G.extraErrorUsed,
      extraHintUsed:  G.extraHintUsed,
    };
    appState.lastSavedGameMode = G.mode;
    saveState();
  }
  document.getElementById('gameScreen').classList.remove('active');
  stopTimer();
  updateHomeScreen();
}

// ═══════════════════════════════════════════════
//  UNLOCK SİSTEMİ
// ═══════════════════════════════════════════════

function solveCountForDiff(diff) {
  return appState.scores.filter(s => s.mode === diff).length;
}

function isUnlocked(diff) {
  const req = DIFFICULTIES[diff]?.unlockRequires;
  if (!req) return true;
  return solveCountForDiff(req.diff) >= req.count;
}

function unlockProgress(diff) {
  const req = DIFFICULTIES[diff]?.unlockRequires;
  if (!req) return null;
  const done = solveCountForDiff(req.diff);
  return { done, needed: req.count, pct: Math.min(100, Math.round(done / req.count * 100)) };
}

function showUnlockCelebration(diff) {
  const cfg = DIFFICULTIES[diff];
  const overlay = document.getElementById('unlockOverlay');
  document.getElementById('unlockIcon').textContent = cfg.icon;
  document.getElementById('unlockName').textContent = cfg.label;
  overlay.classList.add('show');
  setTimeout(() => overlay.classList.remove('show'), 3200);
}

// ═══════════════════════════════════════════════
//  HOME SCREEN
// ═══════════════════════════════════════════════



function openLevelsSheet() {
  const sheet = document.getElementById('levelsSheet');
  const inner = document.getElementById('levelsSheetInner');
  sheet.style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      inner.style.transform = 'translateY(0)';
    });
  });
  updateHomeScreen(); // kilit durumlarını güncelle
}

function closeLevelsSheet(e) {
  if (e && e.target !== document.getElementById('levelsSheet')) return;
  const sheet = document.getElementById('levelsSheet');
  const inner = document.getElementById('levelsSheetInner');
  inner.style.transform = 'translateY(100%)';
  setTimeout(() => { sheet.style.display = 'none'; }, 300);
}

function updateHomeStreakPanelNumbers() {
  const cur = document.getElementById('homeStreakPopCurrent');
  const best = document.getElementById('homeStreakPopBest');
  const n = appState.streak ?? 0;
  if (cur) cur.textContent = n;
  if (best) best.textContent = appState.bestStreak ?? 0;
  const badge = document.getElementById('homeStreakCount');
  if (badge) badge.textContent = String(n);
}

function toggleHomeStreakPanel(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('homeStreakPanel');
  const back = document.getElementById('homeStreakBackdrop');
  const btn = document.getElementById('homeStreakBtn');
  if (!panel || !back || !btn) return;
  const isOpen = !panel.hasAttribute('hidden');
  if (isOpen) {
    closeHomeStreakPanel();
    return;
  }
  updateHomeStreakPanelNumbers();
  panel.removeAttribute('hidden');
  back.removeAttribute('hidden');
  btn.setAttribute('aria-expanded', 'true');
  panel.setAttribute('aria-hidden', 'false');
  back.setAttribute('aria-hidden', 'false');
}

function closeHomeStreakPanel() {
  const panel = document.getElementById('homeStreakPanel');
  const back = document.getElementById('homeStreakBackdrop');
  const btn = document.getElementById('homeStreakBtn');
  if (panel) {
    panel.setAttribute('hidden', '');
    panel.setAttribute('aria-hidden', 'true');
  }
  if (back) {
    back.setAttribute('hidden', '');
    back.setAttribute('aria-hidden', 'true');
  }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

async function refreshHomeDailyRankMessage(dateStr) {
  const el = document.getElementById('dailyStatus');
  if (!el) return;
  const stillDone = appState.scores.some(s => s.date === dateStr && s.mode === 'daily');
  if (!stillDone) return;
  if (typeof getRealLbEntries !== 'function' || typeof sb === 'undefined' || !sb) {
    el.textContent = 'Tebrikler! Bugünkü sudokunu tamamladın.';
    return;
  }
  try {
    const entries = await getRealLbEntries(dateStr);
    const idx = entries.findIndex(e => e.isMe);
    if (idx >= 0) el.textContent = `${idx + 1}. oldun, tebrikler`;
    else el.textContent = 'Tebrikler! Bugünkü sudokunu tamamladın.';
  } catch (err) {
    el.textContent = 'Tebrikler! Bugünkü sudokunu tamamladın.';
  }
}

function updateHomeScreen() {
  const today = todayStr();
  const topDate = document.getElementById('homeTopDate');
  if (topDate) {
    topDate.textContent = formatDate(today);
    topDate.setAttribute('datetime', today);
  }
  updateHomeStreakPanelNumbers();

  // Daily status
  const ds = appState.scores.find(s => s.date === today && s.mode === 'daily');
  const dailySaved = appState.savedGames && appState.savedGames['daily'];
  const dailyInProgress = dailySaved && dailySaved.savedDate === today;
  const dailyCard = document.querySelector('.daily-card');
  const dailyBtn = document.getElementById('dailyChallengeBtn');
  const ctaText = dailyBtn && dailyBtn.querySelector('.home-challenge-card__cta-text');
  if (dailyCard) {
    dailyCard.classList.toggle('home-challenge-card--plain', !!dailyInProgress);
    dailyCard.classList.toggle('home-challenge-card--done', !!ds);
  }

  if (ds) {
    document.getElementById('dailyStatus').textContent = 'Sıralama yükleniyor…';
    refreshHomeDailyRankMessage(today);
    if (dailyCard) { dailyCard.style.opacity = '0.88'; dailyCard.style.cursor = 'default'; }
    if (dailyBtn) dailyBtn.disabled = true;
  } else if (dailyInProgress) {
    document.getElementById('dailyStatus').textContent = 'Devam et ve sıralamaya gir';
    if (dailyCard) { dailyCard.style.opacity = '1'; dailyCard.style.cursor = 'pointer'; }
    if (dailyBtn) dailyBtn.disabled = false;
    if (ctaText) ctaText.textContent = 'Devam et';
  } else {
    document.getElementById('dailyStatus').textContent = 'Hemen çöz ve sıralamaya gir';
    if (dailyCard) { dailyCard.style.opacity = '1'; dailyCard.style.cursor = 'pointer'; }
    if (dailyBtn) dailyBtn.disabled = false;
    if (ctaText) ctaText.textContent = 'Oyna';
  }

  document.getElementById('registerPrompt').style.display = appState.supabaseId ? 'none' : 'block';

  // Profil register butonu
  const prBtn = document.getElementById('profileRegisterBtn');
  if (prBtn) prBtn.style.display = appState.username ? 'none' : 'block';

  // Diff butonlarını kilitle/aç
  ['beginner','easy','medium','hard','expert','master','grandmaster','legend','tanri'].forEach(diff => {
    const btn = document.querySelector(`[data-diff="${diff}"]`);
    if (!btn) return;
    const unlocked = isUnlocked(diff);
    const prog = unlockProgress(diff);
    btn.classList.toggle('locked', !unlocked);

    // ilerleme göstergesi
    let progEl = btn.querySelector('.diff-progress');
    if (!unlocked && prog) {
      if (!progEl) {
        progEl = document.createElement('div');
        progEl.className = 'diff-progress';
        btn.appendChild(progEl);
      }
      const req = DIFFICULTIES[diff].unlockRequires;
      const prevLabel = DIFFICULTIES[req.diff].label;
      progEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
          <div style="flex:1;background:rgba(59,130,246,0.12);border-radius:99px;height:4px;overflow:hidden;">
            <div style="height:100%;border-radius:99px;background:var(--accent);width:${prog.pct}%;transition:width 0.4s;"></div>
          </div>
          <span style="font-size:10px;font-weight:700;color:#a08060;white-space:nowrap;flex-shrink:0;">${prog.done}/${prog.needed} ${prevLabel}</span>
        </div>`;
    } else if (progEl) {
      progEl.remove();
    }
    // diff-sub temizle
    const subEl = btn.querySelector('.diff-sub');
    if (subEl) subEl.remove();
  });

  const resumeBtn = document.getElementById('homeResumeBtn');
  if (resumeBtn) {
    const ok = typeof getResumableSavedMode === 'function' && getResumableSavedMode();
    resumeBtn.disabled = !ok;
    resumeBtn.setAttribute('aria-disabled', ok ? 'false' : 'true');
  }

  renderLbPreview(); renderDuelPreview();
}

// ═══════════════════════════════════════════════
//  START GAME
// ═══════════════════════════════════════════════


function shareResult() {
  const cfg = DIFFICULTIES[G.mode];
  const text = `🧩 Sudoku Günlük\n${formatDate(todayStr())}\n\n${cfg.icon} ${cfg.label} — ${formatTime(G.timerSec)}\n❌ ${G.errors} hata · 🔥 ${appState.streak} seri\n\n#SudokuGünlük`;
  if (navigator.share) navigator.share({ title: 'Sudoku Günlük', text }).catch(() => {});
  else navigator.clipboard.writeText(text).then(() => showToast('📋 Panoya kopyalandı!'));
}


// ═══════════════════════════════════════════════
//  KEYBOARD
// ═══════════════════════════════════════════════

// Sayfa öne gelince sıralamayı yenile
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && sb) renderLbPreview();renderDuelPreview();
});

document.addEventListener('keydown', e => {
  if (!document.getElementById('gameScreen').classList.contains('active')) return;
  if (e.key >= '1' && e.key <= '9') { inputNumber(parseInt(e.key)); return; }
  if (e.key === 'Backspace' || e.key === 'Delete') { eraseCell(); return; }
  if (e.key.toLowerCase() === 'p') { togglePencil(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoMove(); return; }
  if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const idx = G.selectedCell === -1 ? 40 : G.selectedCell;
    const r = Math.floor(idx / 9), c = idx % 9;
    if (e.key === 'ArrowUp'    && r > 0) selectCell(idx - 9);
    if (e.key === 'ArrowDown'  && r < 8) selectCell(idx + 9);
    if (e.key === 'ArrowLeft'  && c > 0) selectCell(idx - 1);
    if (e.key === 'ArrowRight' && c < 8) selectCell(idx + 1);
  }
});

// ═══════════════════════════════════════════════
//  BROWSER BACK BUTTON — oyundan çıkmasın
// ═══════════════════════════════════════════════
history.pushState(null, '', window.location.href);
window.addEventListener('popstate', () => {
  history.pushState(null, '', window.location.href);
  if (document.getElementById('gameScreen').classList.contains('active')) {
    confirmBack();
  }
});

// ═══════════════════════════════════════════════
//  ONBOARDING
// ═══════════════════════════════════════════════

let obStep = 0;
const OB_TOTAL = 4;

function obShowStep(step) {
  for (let i = 0; i < OB_TOTAL; i++) {
    const el = document.getElementById('ob' + i);
    if (!el) continue;
    el.classList.remove('active', 'exit');
    if (i === step) el.classList.add('active');
    else if (i < step) el.classList.add('exit');
  }
  for (let i = 0; i < OB_TOTAL; i++) {
    const dot = document.getElementById('obDot' + i);
    if (dot) dot.classList.toggle('active', i === step);
  }
  const btn  = document.getElementById('obNextBtn');
  const skip = document.getElementById('obSkipBtn');
  if (step === 0)              { btn.textContent = 'Başlayalım →'; skip.style.display = 'none'; }
  else if (step === 1)         { btn.textContent = 'Devam →';      skip.style.display = 'none'; }
  else if (step === 2)         { btn.textContent = 'Anladım →';    skip.style.display = 'none'; }
  else                         { btn.textContent = 'Oyuna Başla';  skip.style.display = 'block'; }
}

function obNext() {
  if (obStep < OB_TOTAL - 1) {
    obStep++;
    obShowStep(obStep);
  } else {
    obFinish();
  }
}

function obSkip() {
  obFinish();
}

function obGoogleSignIn() {
  // Önce onboarding'i kapat, sonra Google ile giriş yap
  appState.onboardingDone = true;
  saveState();
  document.getElementById('onboarding').classList.add('hidden');
  updateHomeScreen();
  signInWithGoogle();
}

function obFinish() {
  const input = document.getElementById('obUsernameInput');
  const val = input ? input.value.trim() : '';
  if (val.length >= 3 && /^[a-zA-Z0-9_çşğüöıÇŞĞÜÖİ]+$/.test(val)) {
    appState.username = val;
  }
  appState.onboardingDone = true;
  saveState();
  document.getElementById('onboarding').classList.add('hidden');
  updateHomeScreen();
}

function checkOnboarding() {
  if (!appState.onboardingDone) {
    obStep = 0;
    obShowStep(0);
    document.getElementById('onboarding').classList.remove('hidden');
  }
}

// ═══════════════════════════════════════════════
//  SPLASH SCREEN
// ═══════════════════════════════════════════════

async function showSplash() {
  const splash = document.getElementById('splashScreen');
  splash.classList.remove('fade-out');

  // Splash'i her koşulda 1.8 saniye sonra kapat
  setTimeout(() => {
    splash.classList.add('fade-out');
    setTimeout(() => { splash.style.display = 'none'; }, 400);
  }, 2800);

  // Bugün oynandı: daily_scores + game_sessions
  try {
    const today = todayStr();
    const { count: c1 } = await sb
      .from('daily_scores')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);
    const { count: c2 } = await sb
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);
    const todayEl = document.getElementById('splashTodayGames');
    if (todayEl) todayEl.textContent = ((c1 ?? 0) + (c2 ?? 0)).toLocaleString('tr-TR');
  } catch(e) {}

  // Şu an oynuyor: son 5 dakika içinde aktif olan
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: c1 } = await sb
      .from('daily_scores')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', fiveMinAgo);
    const { count: c2 } = await sb
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fiveMinAgo);
    const activeEl = document.getElementById('splashActiveNow');
    if (activeEl) activeEl.textContent = ((c1 ?? 0) + (c2 ?? 0)).toLocaleString('tr-TR');
  } catch(e) {}
}

// ═══════════════════════════════════════════════
//  KOYU MOD
// ═══════════════════════════════════════════════

function toggleDarkMode(enabled) {
  appState.darkMode = enabled;
  document.body.classList.toggle('dark', enabled);
  saveState();
}

function initDarkMode() {
  if (appState.darkMode) {
    document.body.classList.add('dark');
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = true;
  }
}

// ═══════════════════════════════════════════════
//  AYARLAR
// ═══════════════════════════════════════════════

function saveSetting(key, value) {
  appState[key] = value;
  saveState();
}

function toggleHideTimer(enabled) {
  appState.hideTimer = enabled;
  document.getElementById('gameScreen').classList.toggle('timer-hidden', enabled);
  saveState();
}

function initSettings() {
  const dm = document.getElementById('darkModeToggle');
  const snd = document.getElementById('soundToggle');
  const vib = document.getElementById('vibrationToggle');
  const notif = document.getElementById('notifToggle');
  const ht = document.getElementById('hideTimerToggle');
  if (dm) dm.checked = !!appState.darkMode;
  if (snd) snd.checked = appState.sound !== false;
  if (vib) vib.checked = appState.vibration !== false;
  if (notif) notif.checked = !!appState.notifications;
  if (ht) ht.checked = !!appState.hideTimer;
  if (appState.hideTimer) document.getElementById('gameScreen').classList.add('timer-hidden');
}

function showResetConfirm() {
  if (confirm('Tüm veriler silinecek. Emin misin?')) {
    localStorage.removeItem('sudoku_v3');
    location.reload();
  }
}


// ═══════════════════════════════════════════════
//  ANDROID GERİ TUŞU
// ═══════════════════════════════════════════════

document.addEventListener('backbutton', function(e) {
  e.preventDefault();
  const gameActive = document.getElementById('gameScreen').classList.contains('active');
  if (gameActive) {
    showModal('backConfirmModal');
  } else {
    showModal('backConfirmModal');
  }
}, false);

// Tarayıcıda test için popstate
window.addEventListener('popstate', function() {
  history.pushState(null, '', window.location.href);
});
history.pushState(null, '', window.location.href);