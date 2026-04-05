// =================================================================
//  TURNUVA YONETICISI
// =================================================================

let errors = 0;
let hintsUsed = 0;
let elapsedSeconds = 0;
let gameActive = false;
let currentDifficulty = '';

// ── TURNUVA SİSTEMİ ──

let trnState = {
  tournament: null,
  entry: null,
  currentPuzzleIndex: 0,
  timerInterval: null,
  countdownInterval: null,
  secondsLeft: 3600
}

async function openTournamentScreen() {
  if (typeof showPanel === 'function') showPanel('tournamentPanel');
  else if (typeof switchBottomNav === 'function') switchBottomNav('tournament');
  await loadTournament();
}

async function loadTournament() {
  const today = new Date().toISOString().slice(0, 10)

  const { data: trn } = await sb
    .from('tournaments')
    .select('id, date, starts_at, ends_at, status')
    .eq('date', today)
    .maybeSingle()

  if (!trn) {
    const pEl = document.getElementById('trnParticipants');
    const rEl = document.getElementById('trnMyRank');
    if (pEl) pEl.textContent = '0';
    if (rEl) rEl.textContent = '—';
    renderTournamentUpcoming();
    return;
  }

  trnState.tournament = trn

  // Kullanıcının entry'si var mı
  if (currentUser) {
    const { data: entry } = await sb
      .from('tournament_entries')
      .select('*')
      .eq('tournament_id', trn.id)
      .eq('user_id', currentUser.id)
      .maybeSingle()
    trnState.entry = entry
  }

  // Katılımcı sayısı
  const { count } = await sb
    .from('tournament_entries')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', trn.id)
  document.getElementById('trnParticipants').textContent = count || 0

  // Sıralama
  const rankEl = document.getElementById('trnMyRank');
  if (trnState.entry) {
    const { data: rank } = await sb
      .from('tournament_entries')
      .select('user_id')
      .eq('tournament_id', trn.id)
      .gt('total_score', trnState.entry.total_score);
    if (rankEl) rankEl.textContent = '#' + ((rank?.length || 0) + 1);
  } else if (rankEl) {
    rankEl.textContent = '—';
  }

  const now = new Date()
  const startsAt = new Date(trn.starts_at)
  const endsAt = new Date(trn.ends_at)

  if (trn.status === 'upcoming') {
    renderTournamentUpcoming(startsAt)
    startCountdown(startsAt)
  } else if (trn.status === 'active') {
    trnState.secondsLeft = Math.max(0, Math.floor((endsAt - now) / 1000))
    console.log('secondsLeft:', trnState.secondsLeft)
    renderTournamentActive()
    startTournamentTimer()
    loadTrnLeaderboard()
  } else if (trn.status === 'finished') {
    renderTournamentFinished()
    loadTrnLeaderboard()
  }
}

function renderTournamentUpcoming(startsAt) {
  document.getElementById('trnStatusBadge').textContent = 'YAKINDA'
  document.getElementById('trnStatusBadge').style.background = 'rgba(255,255,255,0.15)'
  document.getElementById('trnDateLabel').textContent = 'Her gün 20:00 - 21:00'
  document.getElementById('trnCountdownLabel').textContent = 'Başlamasına'
  document.getElementById('trnJoinBtn').textContent = '🔔 Başlayınca Bildir'
  document.getElementById('trnJoinBtn').style.background = 'linear-gradient(135deg,#6c3fc5,#4a2880)'
  document.getElementById('trnJoinBtn').onclick = tournamentNotify
}

function renderTournamentActive() {
  document.getElementById('trnStatusBadge').textContent = '🔴 CANLI'
  document.getElementById('trnStatusBadge').style.background = 'rgba(239,68,68,0.3)'
  document.getElementById('trnDateLabel').textContent = 'Turnuva devam ediyor!'
  document.getElementById('trnCountdownLabel').textContent = 'Bitimine'

  if (trnState.entry) {
    document.getElementById('trnJoinBtn').textContent = '▶️ Devam Et — Bulmaca #' + (trnState.entry.puzzles_solved + 1)
    document.getElementById('trnJoinBtn').style.background = 'linear-gradient(135deg,#16a34a,#15803d)'
  } else {
    document.getElementById('trnJoinBtn').textContent = '⚔️ Turnuvaya Katıl'
    document.getElementById('trnJoinBtn').style.background = 'linear-gradient(135deg,#6c3fc5,#4a2880)'
  }
  document.getElementById('trnJoinBtn').onclick = joinTournament
}

function renderTournamentFinished() {
  document.getElementById('trnStatusBadge').textContent = 'BİTTİ'
  document.getElementById('trnStatusBadge').style.background = 'rgba(100,100,100,0.4)'
  document.getElementById('trnDateLabel').textContent = 'Turnuva sona erdi'
  document.getElementById('trnCountdownLabel').textContent = 'Sonraki turnuvaya'
  document.getElementById('trnCountdown').textContent = '20:00'
  document.getElementById('trnJoinBtn').textContent = '📊 Sonuçları Gör'
  document.getElementById('trnJoinBtn').style.background = 'rgba(255,255,255,0.15)'
  document.getElementById('trnJoinBtn').onclick = () => loadTrnLeaderboard()
}

function startCountdown(targetDate) {
  clearInterval(trnState.countdownInterval)
  trnState.countdownInterval = setInterval(() => {
    const diff = Math.max(0, Math.floor((targetDate - new Date()) / 1000))
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    document.getElementById('trnCountdown').textContent =
      String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0')
    if (diff === 0) {
      clearInterval(trnState.countdownInterval)
      loadTournament()
    }
  }, 1000)
}

function startTournamentTimer() {
  clearInterval(trnState.timerInterval)
  trnState.timerInterval = setInterval(() => {
    trnState.secondsLeft = Math.max(0, trnState.secondsLeft - 1)
    const h = Math.floor(trnState.secondsLeft / 3600)
    const m = Math.floor((trnState.secondsLeft % 3600) / 60)
    const s = trnState.secondsLeft % 60
    document.getElementById('trnCountdown').textContent =
      String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0')
    if (trnState.secondsLeft === 0) {
      clearInterval(trnState.timerInterval)
      renderTournamentFinished()
    }
  }, 1000)
}

async function joinTournament() {
  if (!currentUser) { showToast('⚠️ Önce giriş yapman lazım!'); return }
  if (!trnState.tournament) return

  if (!trnState.entry) {
    const { error } = await sb.from('tournament_entries').insert({
      tournament_id: trnState.tournament.id,
      user_id: currentUser.id,
      total_score: 0,
      puzzles_solved: 0
    })
    if (error) { showToast('❌ Katılım hatası!'); return }

    const { data: entry } = await sb
      .from('tournament_entries')
      .select('*')
      .eq('tournament_id', trnState.tournament.id)
      .eq('user_id', currentUser.id)
      .maybeSingle()
    trnState.entry = entry
  }

  startTournamentGame()
}

async function loadTrnLeaderboard() {
  const lb = document.getElementById('trnLiveLeaderboard')
  if (!lb || !trnState.tournament) return

  const { data: entries } = await sb
    .from('tournament_entries')
    .select('user_id, total_score, puzzles_solved')
    .eq('tournament_id', trnState.tournament.id)
    .order('total_score', { ascending: false })
    .limit(10)

  if (!entries || entries.length === 0) {
    lb.innerHTML = '<div style="text-align:center;padding:20px;font-size:13px;color:var(--text-muted);">Henüz katılımcı yok</div>'
    return
  }

  const ids = entries.map(e => e.user_id)
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, username, avatar')
    .in('id', ids)

  const medals = ['🥇', '🥈', '🥉']

  lb.innerHTML = entries.map((e, i) => {
    const profile = profiles?.find(p => p.id === e.user_id)
    const isMe = e.user_id === currentUser?.id
    const initials = (profile?.username || 'U').slice(0, 2).toUpperCase()
    return `
      <div style="display:flex;align-items:center;padding:10px 14px;${i < entries.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}gap:10px;${isMe ? 'background:var(--accent-light);' : ''}">
        <div style="width:24px;text-align:center;font-size:${i < 3 ? 16 : 13}px;">${i < 3 ? medals[i] : (i + 1) + '.'}</div>
        <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6c3fc5,#4a2880);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;color:var(--text);">${profile?.username || 'Kullanıcı'}${isMe ? ' (Sen)' : ''}</div>
          <div style="font-size:11px;color:var(--text-muted);">${e.puzzles_solved} bulmaca çözüldü</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:14px;font-weight:700;color:#a78bfa;">${(e.total_score || 0).toLocaleString('tr')}</div>
          <div style="font-size:10px;color:var(--text-muted);">puan</div>
        </div>
      </div>`
  }).join('')
}

async function startTournamentGame() {
  if (!trnState.tournament || !trnState.entry) return

  // Turnuva bulmacalarını çek
  const { data: trn } = await sb
    .from('tournaments')
    .select('puzzles')
    .eq('id', trnState.tournament.id)
    .single()

  if (!trn?.puzzles) { showToast('❌ Bulmaca yüklenemedi!'); return }

  const puzzleIndex = trnState.currentPuzzleIndex || trnState.entry.puzzles_solved || 0
  if (puzzleIndex >= trn.puzzles.length) {
    showToast('🏆 Tüm bulmacaları çözdün!')
    return
  }

  const puzzleData = trn.puzzles[puzzleIndex]
  trnState.currentPuzzleIndex = puzzleIndex

  // Mevcut oyun sistemini kullanarak turnuva bulmacasını başlat
  G.mode = 'tournament'
  currentDifficulty = puzzleData.difficulty
  const cfg = DIFFICULTIES[puzzleData.difficulty] || DIFFICULTIES['medium']
  G.puzzle = [...puzzleData.puzzle]
  G.solution = [...puzzleData.solution]
  G.userGrid = [...puzzleData.puzzle]
  G.given = [...puzzleData.puzzle].map(v => v !== 0)
  G.pencilGrid = Array.from({length: 81}, () => Array(9).fill(false))
  G.errors = 0
  G.hintsLeft = cfg.hints
  G.completed = false
  G.timerSec = 0
  errors = 0
  hintsUsed = 0
  elapsedSeconds = 0
  gameActive = true

  maxErrors = cfg.maxErrors
  maxHints = cfg.hints

  document.getElementById('gameTitle').textContent =
    '⚔️ Turnuva — Bulmaca #' + (puzzleIndex + 1)
  document.getElementById('diffBadge').className = 'diff-badge ' + puzzleData.difficulty
  document.getElementById('diffBadge').textContent = cfg.label.toUpperCase()

  renderGrid()
  startTimer()

  document.getElementById('gameScreen').classList.add('active')
  document.getElementById('errorsDisplay').textContent = '0/' + maxErrors
  document.getElementById('hintsDisplay').textContent = maxHints
}

async function finishTournamentPuzzle(timeSec) {
  if (!trnState.entry || !trnState.tournament) return

  const cfg = DIFFICULTIES[G.mode || 'medium']
  const multiplier = cfg?.scoreMultiplier || 4

  // Puan hesapla — hız bonusu var
  let score = Math.round((10000 / timeSec) * multiplier)
  if (errors === 0) score = Math.round(score * 1.2)   // hatasız bonus
  if (hintsUsed === 0) score = Math.round(score * 1.1) // ipucusuz bonus

  const newTotal = (trnState.entry.total_score || 0) + score
  const newSolved = (trnState.entry.puzzles_solved || 0) + 1
  trnState.currentPuzzleIndex = newSolved
  const newBest = Math.min(trnState.entry.best_time || 9999, timeSec)

  await sb.from('tournament_entries').update({
    total_score: newTotal,
    puzzles_solved: newSolved,
    best_time: newBest
  }).eq('id', trnState.entry.id)

  trnState.entry.total_score = newTotal
  trnState.entry.puzzles_solved = newSolved
  trnState.entry.best_time = newBest

  showToast(`+${score.toLocaleString('tr')} puan! 🎉`)

  // Sıralamayı güncelle
  loadTrnLeaderboard()

  // Kısa bekleyip sonraki bulmacaya geç
  setTimeout(() => {
    startTournamentGame()
  }, 1500)
}



function closeTournamentScreen() {
  if (typeof showPanel === 'function') showPanel('homePanel');
  else switchTab('homePanel', null);
}

function showLbInfo() {
  const modal = document.getElementById('lbInfoModal');
  const inner = document.getElementById('lbInfoInner');
  modal.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    inner.style.transform = 'translateY(0)';
  }));
}

function closeLbInfo(e) {
  if (e && e.target !== document.getElementById('lbInfoModal')) return;
  const modal = document.getElementById('lbInfoModal');
  const inner = document.getElementById('lbInfoInner');
  inner.style.transform = 'translateY(100%)';
  setTimeout(() => { modal.style.display = 'none'; }, 280);
}


function switchTrnTab(tab) {
  ['daily','weekly','alltime'].forEach(t => {
    const btn = document.getElementById('trnTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.toggle('trn-hub__tab--on', t === tab);
  });
  renderTrnLeaderboard(tab);
}

function renderTrnLeaderboard(tab) {
  const lb = document.getElementById('trnLeaderboard');
  if (!lb) return;

  // Fake turnuva verileri — backend gelince gerçekle değişir
  const data = {
    daily: [
      { name:'ZeynepK', avatar:'ZK', wins:12, podium:18, badges:['🥇','🥇','🥇'], score:3840 },
      { name:'AhmetY',  avatar:'AY', wins:9,  podium:15, badges:['🥇','🥇'],     score:2960 },
      { name:'MehmetA', avatar:'MA', wins:7,  podium:12, badges:['🥇'],           score:2210 },
      { name:'AyşeD',   avatar:'AD', wins:4,  podium:9,  badges:[],               score:1480 },
      { name:'EmreS',   avatar:'ES', wins:2,  podium:6,  badges:[],               score:980  },
    ],
    weekly: [
      { name:'AhmetY',  avatar:'AY', wins:3,  podium:5,  badges:['👑','👑'],     score:1920 },
      { name:'ZeynepK', avatar:'ZK', wins:2,  podium:4,  badges:['👑'],           score:1440 },
      { name:'SelinÇ',  avatar:'SÇ', wins:1,  podium:3,  badges:[],               score:880  },
      { name:'MehmetA', avatar:'MA', wins:1,  podium:2,  badges:[],               score:720  },
      { name:'OğuzB',   avatar:'OB', wins:0,  podium:1,  badges:[],               score:340  },
    ],
    alltime: [
      { name:'ZeynepK', avatar:'ZK', wins:28, podium:41, badges:['🥇','👑','💎'], score:9640 },
      { name:'AhmetY',  avatar:'AY', wins:21, podium:33, badges:['🥇','👑'],      score:7280 },
      { name:'MehmetA', avatar:'MA', wins:14, podium:22, badges:['🥇'],            score:4920 },
      { name:'AyşeD',   avatar:'AD', wins:9,  podium:15, badges:[],                score:3100 },
      { name:'EmreS',   avatar:'ES', wins:5,  podium:10, badges:[],                score:1740 },
    ],
  };

  const rows = data[tab];
  const medals = ['🥇','🥈','🥉'];
  const tabLabel = { daily:'Günlük Galibiyet', weekly:'Haftalık Galibiyet', alltime:'Toplam Galibiyet' };

  lb.innerHTML = rows.map((r, i) => `
    <div style="display:flex;align-items:center;padding:12px 14px;${i < rows.length-1 ? 'border-bottom:1px solid var(--border);' : ''}gap:12px;">
      <div style="width:26px;text-align:center;font-size:${i < 3 ? 18 : 14}px;color:${i < 3 ? '' : 'var(--text-muted)'};">${i < 3 ? medals[i] : (i+1)+'.'}</div>
      <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#6c3fc5,#4a2880);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;">${r.avatar}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;color:var(--text);">${r.name} ${r.badges.slice(0,3).join('')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:1px;">${r.wins} galibiyet · ${r.podium} podyum</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:13px;font-weight:700;color:#a78bfa;">${r.score.toLocaleString('tr')}</div>
        <div style="font-size:10px;color:var(--text-muted);">puan</div>
      </div>
    </div>
  `).join('');
}

function tournamentNotify() {
  const btn = document.getElementById('trnJoinBtn');
  if (!btn || btn.dataset.subscribed) return;
  btn.dataset.subscribed = '1';
  btn.textContent = '✅ Haberdar edileceksin!';
  btn.style.background = 'var(--success)';
  showToast('🔔 Turnuva başladığında bildirim alacaksın!');
}