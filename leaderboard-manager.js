// =================================================================
//  SKOR TABLOSU YONETICISI
// =================================================================

const FAKE_USERS = [
  {name:'AhmetY',   ini:'AY', times:[142,198,312,520,890,1240]},
  {name:'ZeynepK',  ini:'ZK', times:[167,221,289,501,920,1180]},
  {name:'MehmetA',  ini:'MA', times:[203,244,401,612,1020,1560]},
  {name:'AyşeD',    ini:'AD', times:[231,267,388,645,1100,1800]},
  {name:'EmreS',    ini:'ES', times:[245,301,350,711,1250,2100]},
  {name:'SelinÇ',   ini:'SÇ', times:[289,334,421,804,1420,2400]},
  {name:'OğuzB',    ini:'OB', times:[301,356,512,901,1600,2800]},
];

// ═══════════════════════════════════════════════
//  STORAGE

async function calcRank(time) {
  const today = todayStr();
  const entries = await getRealLbEntries(today);
  const sorted = entries.map(e => e.time).sort((a, b) => a - b);
  if (appState.username) {
    const myEntry = entries.find(e => e.isMe);
    if (!myEntry) sorted.push(time);
  }
  sorted.sort((a, b) => a - b);
  return sorted.indexOf(time) + 1;
}

// ═══════════════════════════════════════════════
//  LEADERBOARD
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
//  PUAN SİSTEMİ (arka planda, kullanıcıya gösterilmez)
// ═══════════════════════════════════════════════

// Günlük sıralamaya göre puan hesapla: 1. = 100p, sonrakiler azalır
function calcDailyPoints(rank, total) {
  if (rank <= 0 || total <= 0) return 0;
  // 1. kişi 100p, her sıra düştükçe orantılı azalır, minimum 10p
  const pts = Math.round(100 * (1 - (rank - 1) / Math.max(total, 1)));
  return Math.max(pts, 10);
}

// Supabase'den gerçek sıralama verisi getir
async function getRealLbEntries(d) {
  if (!sb) return [];
  try {
    // Önce RPC dene
    const { data: rpcData, error: rpcErr } = await sb.rpc('get_daily_leaderboard', { target_date: d });
    if (!rpcErr && rpcData && rpcData.length > 0) {
      // Profil fotoğraflarını çek
      const ids = rpcData.map(r => r.user_id);
      const { data: profiles } = await sb.from('profiles').select('id, avatar_url').in('id', ids);
      const photoMap = {};
      (profiles || []).forEach(p => { photoMap[p.id] = p.avatar_url || null; });
      return rpcData.map(row => ({
        name: row.username || 'Anonim',
        ini: (row.username || 'AN').slice(0,2).toUpperCase(),
        time: row.time_seconds,
        isMe: row.user_id === currentUser?.id,
        userId: row.user_id,
        avatarUrl: photoMap[row.user_id] || null,
      }));
    }

    // RPC yoksa veya hata verdiyse direkt tablo sorgula (fallback)
    if (rpcErr) console.warn('RPC bulunamadı, tablo sorgusuna geçiliyor:', rpcErr.message);
    const { data, error } = await sb
      .from('daily_scores')
      .select('time_seconds, user_id, profiles(username, avatar_url)')
      .eq('date', d)
      .order('time_seconds', { ascending: true })
      .limit(50);
    if (error) { console.error('Sıralama sorgusu hatası:', error); return []; }
    if (!data || data.length === 0) return [];
    return data.map(row => ({
      name: row.profiles?.username || 'Anonim',
      ini: (row.profiles?.username || 'AN').slice(0,2).toUpperCase(),
      time: row.time_seconds,
      isMe: row.user_id === currentUser?.id,
      userId: row.user_id,
      avatarUrl: row.profiles?.avatar_url || null,
    }));
  } catch(e) {
    console.error('getRealLbEntries hatası:', e);
    return [];
  }
}

// Supabase'den haftalık/tüm zamanlar toplam puan
async function buildRealTotalPoints(days) {
  if (!sb) return [];
  const fromDate = dateStr(days - 1);
  const { data, error } = await sb
    .from('daily_scores')
    .select('time_seconds, user_id, date, profiles(username)')
    .gte('date', fromDate)
    .order('date', { ascending: false });
  if (error || !data) return [];

  const totals = {};
  // Günlere göre grupla
  const byDate = {};
  data.forEach(row => {
    if (!byDate[row.date]) byDate[row.date] = [];
    byDate[row.date].push(row);
  });
  // Her gün için sırala ve puan ver
  Object.values(byDate).forEach(rows => {
    rows.sort((a, b) => a.time_seconds - b.time_seconds);
    const total = rows.length;
    rows.forEach((row, idx) => {
      const name = row.profiles?.username || 'Anonim';
      const isMe = row.user_id === currentUser?.id;
      const pts = calcDailyPoints(idx + 1, total);
      if (!totals[name]) totals[name] = { name, ini: name.slice(0,2).toUpperCase(), points: 0, isMe };
      totals[name].points += pts;
    });
  });
  return Object.values(totals).sort((a, b) => b.points - a.points);
}

// ═══════════════════════════════════════════════
//  LEADERBOARD RENDER
// ═══════════════════════════════════════════════

let currentLbTab = 'today';

const LB_TAB_MAP = {
  today:   { panel: 'lbPanelToday',   btn: 'tabToday'   },
  week:    { panel: 'lbPanelWeek',    btn: 'tabWeek'    },
  alltime: { panel: 'lbPanelAllTime', btn: 'tabAllTime' },
};

function switchLbTab(tab) {
  currentLbTab = tab;
  Object.entries(LB_TAB_MAP).forEach(([key, ids]) => {
    document.getElementById(ids.panel).style.display = key === tab ? 'flex' : 'none';
    document.getElementById(ids.btn).classList.toggle('active', key === tab);
  });
  if (tab === 'week')    renderLbWeek();
  if (tab === 'alltime') renderLbAllTime();
}

function renderLeaderboard() {
  const tabs = document.getElementById('dateTabs');
  const today = todayStr();
  tabs.innerHTML = '';
  const dayNames = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
  for (let i = 0; i < 7; i++) {
    const d = dateStr(i);
    const dateObj = new Date(d + 'T00:00:00');
    const tab = document.createElement('div');
    tab.className = 'date-tab' + (i === 0 ? ' active' : '');
    if (i === 0) tab.textContent = 'Bugün';
    else if (i === 1) tab.textContent = 'Dün';
    else tab.textContent = dayNames[dateObj.getDay()] + ' ' + dateObj.getDate();
    tab.onclick = () => {
      document.querySelectorAll('.date-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderLbForDate(d);
    };
    tabs.appendChild(tab);
  }
  renderLbForDate(today);
  switchLbTab('today');
}

async function renderLbForDate(d) {
  const podiumEl = document.getElementById('lbPodium');
  const listEl   = document.getElementById('lbList');
  if (!podiumEl || !listEl) return;
  podiumEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)">Yükleniyor...</div>';
  listEl.innerHTML = '';
  try {
  const entries = await getRealLbEntries(d);
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const order = [1, 0, 2], classes = ['second','first','third'], crowns = ['🥈','🥇','🥉'];

  if (entries.length === 0) {
    podiumEl.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted)">Henüz kimse çözmedi</div>';
    listEl.innerHTML = '';
    return;
  }

  podiumEl.innerHTML = order.map((oi, vi) => {
    const e = top3[oi]; if (!e) return '';
    return `<div class="podium-item ${classes[vi]}">
      <div class="podium-crown">${crowns[vi]}</div>
      <div class="podium-avatar" onclick="showDuelProfile('${e.userId}')" style="cursor:pointer;${e.avatarUrl ? `background-image:url(${e.avatarUrl});background-size:cover;background-position:center;` : ''}">${e.avatarUrl ? '' : e.ini}</div>
      <div class="podium-name">${e.name}</div>
      <div class="podium-time">${formatTime(e.time)}</div>
      <div class="podium-bar"></div>
    </div>`;
  }).join('');

  document.getElementById('lbList').innerHTML = rest.length === 0
    ? '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Daha fazla oyuncu yok</div>'
    : rest.map((e, i) => `
      <div class="lb-list-row${e.isMe ? ' me' : ''}" onclick="showDuelProfile('${e.userId}')" style="cursor:pointer;">
        <span class="lb-list-rank">${i+4}</span>
        <div class="lb-list-avatar" style="${e.avatarUrl ? `background-image:url(${e.avatarUrl});background-size:cover;` : ''}">${e.avatarUrl ? '' : e.ini}</div>
        <div class="lb-list-name">${e.name}${e.isMe ? '<small>Sen</small>' : ''}</div>
        <div class="lb-list-time">${formatTime(e.time)}</div>
      </div>`).join('');
  } catch(e) {
    console.error('renderLbForDate hatası:', e);
    podiumEl.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted)">Bağlantı hatası — tekrar dene</div>';
    listEl.innerHTML = '';
  }
}

async function renderLbWeek() {
  document.getElementById('lbListWeek').innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)">Yükleniyor...</div>';
  const ranked = await buildRealTotalPoints(7);
  document.getElementById('lbListWeek').innerHTML = renderRankedList(ranked);
}

async function renderLbAllTime() {
  document.getElementById('lbListAllTime').innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)">Yükleniyor...</div>';
  const ranked = await buildRealTotalPoints(365);
  document.getElementById('lbListAllTime').innerHTML = renderRankedList(ranked);
}

function renderRankedList(ranked) {
  if (!ranked.length) return '<div style="padding:24px;text-align:center;color:var(--text-muted);">Henüz veri yok</div>';
  const medalIcons = ['🥇','🥈','🥉'];
  return ranked.map((e, i) => {
    const rank = i + 1;
    const medal = rank <= 3 ? `<span style="font-size:18px;">${medalIcons[rank-1]}</span>` : `<span class="lb-list-rank">${rank}</span>`;
    return `<div class="lb-list-row${e.isMe ? ' me' : ''}">
      <div style="width:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${medal}</div>
      <div class="lb-list-avatar">${e.ini}</div>
      <div class="lb-list-name">${e.name}${e.isMe ? '<small>Sen</small>' : ''}</div>
      <div class="lb-list-score">${e.points} puan</div>
    </div>`;
  }).join('');
}

async function renderLbPreview() {
  const el = document.getElementById('homeLbPreview');
  if (!el) return;
  if (!sb) { el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Bağlanıyor...</div>'; return; }
  el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Yükleniyor...</div>';
  try {
    const entries = await getRealLbEntries(todayStr());
    const medals = ['🥇','🥈','🥉'];
    const colors = ['#c8a84b','#9ba5b0','#c07848'];

    // "Sen" satırı için veri hazırla
    const myEntryInList = entries.find(e => e.isMe);
    const myRank        = myEntryInList ? entries.indexOf(myEntryInList) + 1 : null;
    const localPlay     = appState.dailyTimes?.[todayStr()];
    const myTimeStr     = myEntryInList
      ? formatTime(myEntryInList.time)
      : (localPlay?.time ? formatTime(localPlay.time) : '—');
    const myRankStr     = myRank ? `#${myRank}` : '—';
    const myIni         = (appState.username || (currentUser?.email?.slice(0,2)) || 'SE').toUpperCase().slice(0,2);
    const senRowHtml    = `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-top:1.5px dashed var(--border);background:rgba(59,130,246,0.05);">
        <div style="font-size:12px;font-weight:700;color:var(--accent);width:22px;text-align:center;font-family:'DM Serif Display',serif;">${myRankStr}</div>
        <div style="width:32px;height:32px;border-radius:50%;background:var(--accent);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;">${myIni}</div>
        <div style="flex:1;font-size:13px;font-weight:700;color:var(--accent-dark);">Sen</div>
        <div style="font-family:'DM Serif Display',serif;font-size:15px;color:var(--accent);font-weight:600;">${myTimeStr}</div>
      </div>`;

    if (entries.length === 0) {
      el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Henüz kimse çözmedi</div>' + senRowHtml;
      return;
    }

    el.innerHTML = entries.slice(0, 3).map((e, i) => `
      <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;${i < 2 ? 'border-bottom:1px solid var(--border);' : ''}${e.isMe ? 'background:var(--accent-light);' : ''}">
        <div style="font-size:18px;width:22px;text-align:center;">${medals[i]}</div>
        <div style="width:32px;height:32px;border-radius:50%;background:${e.isMe ? 'var(--accent)' : 'var(--surface2)'};border:2px solid ${e.isMe ? 'var(--accent)' : 'var(--border)'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${e.isMe ? '#fff' : 'var(--text)'};flex-shrink:0;">${e.ini}</div>
        <div style="flex:1;font-size:13px;font-weight:${e.isMe ? '700' : '500'};color:${e.isMe ? 'var(--accent-dark)' : 'var(--text)'};">${e.name}${e.isMe ? ' 👈' : ''}</div>
        <div style="font-family:'DM Serif Display',serif;font-size:15px;color:${colors[i]};font-weight:600;">${formatTime(e.time)}</div>
      </div>`).join('') + senRowHtml;

  } catch(e) {
    console.error('renderLbPreview hatası:', e);
    el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Yüklenemedi</div>';
  }
}

function onMiniLbScroll() {
  const slider = document.getElementById('miniLbSlider');
  const index = Math.round(slider.scrollLeft / slider.offsetWidth);
  document.getElementById('miniDot0').style.width = index === 0 ? '18px' : '6px';
  document.getElementById('miniDot0').style.background = index === 0 ? 'var(--accent)' : 'var(--border)';
  document.getElementById('miniDot1').style.width = index === 1 ? '18px' : '6px';
  document.getElementById('miniDot1').style.background = index === 1 ? 'var(--accent)' : 'var(--border)';
}


document.addEventListener('DOMContentLoaded', () => {
  renderLeaderboard();
});