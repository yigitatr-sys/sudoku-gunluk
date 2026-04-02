// ═══════════════════════════════════════════════
//  DÜELLO YÖNETİCİSİ
// ═══════════════════════════════════════════════

let duelState = {
  duelId: null,
  code: null,
  opponentId: null,
  opponentName: null,
  myProgress: 0,
  opponentProgress: 0, isBot: false,
  botSpeed: null,
  botSimInterval: null,
  opponentElo: 0,
  timerSec: 0,
  timerInterval: null,
  realtimeChannel: null,
  puzzle: null,
  solution: null,
  userGrid: Array(81).fill(0),
  given: Array(81).fill(false),
  errors: 0,
  maxErrors: 3,
  selectedCell: -1,
  completed: false,
  myElo: 0,
  wins: 0,
  losses: 0,
};

async function renderDuelPreview() {
  const el = document.getElementById('homeDuelPreview');
  if (!el) return;
  if (!sb) { el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Bağlanıyor...</div>'; return; }
  el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Yükleniyor...</div>';
  try {
    const { data } = await sb.from('league_stats')
      .select('user_id, elo, wins, losses')
      .order('elo', { ascending: false })
      .limit(3);
    if (!data || data.length === 0) {
      el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Henüz kimse oynamadı</div>';
      return;
    }
    const ids = data.map(d => d.user_id);
    const { data: profiles } = await sb.from('profiles').select('id, username, avatar').in('id', ids);
    const profileMap = {};
    (profiles || []).forEach(p => profileMap[p.id] = p);
    const medals = ['🥇','🥈','🥉'];
    const colors = ['#c8a84b','#9ba5b0','#c07848'];
    el.innerHTML = data.map((row, i) => {
      const p = profileMap[row.user_id] || {};
      const isMe = currentUser && row.user_id === currentUser.id;
      const ini = (p.username || '?')[0].toUpperCase();
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;${i < 2 ? 'border-bottom:1px solid var(--border);' : ''}${isMe ? 'background:var(--accent-light);' : ''}">
          <div style="font-size:18px;width:22px;text-align:center;">${medals[i]}</div>
          <div style="width:32px;height:32px;border-radius:50%;background:${isMe ? 'var(--accent)' : 'var(--surface2)'};border:2px solid ${isMe ? 'var(--accent)' : 'var(--border)'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${isMe ? '#fff' : 'var(--text)'};flex-shrink:0;">${ini}</div>
          <div style="flex:1;font-size:13px;font-weight:${isMe ? '700' : '500'};color:${isMe ? 'var(--accent-dark)' : 'var(--text)'};">${p.username || 'Anonim'}${isMe ? ' 👈' : ''}</div>
          <div style="font-family:'DM Serif Display',serif;font-size:15px;color:${colors[i]};font-weight:600;">${row.elo} ELO</div>
        </div>`;
    }).join('');
  } catch(e) {
    console.error('renderDuelPreview hatası:', e);
    el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Bağlantı hatası</div>';
  }
}

// ═══════════════════════════════════════════════
//  DÜELLO EKRANI
// ═══════════════════════════════════════════════

function openDuelLeaderboard() {
  const screen = document.getElementById('duelLeaderboardScreen');
  screen.style.display = 'flex';
  screen.style.animation = 'slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)';
  loadDuelLeaderboard(undefined);
}

function closeDuelLeaderboard() {
  const screen = document.getElementById('duelLeaderboardScreen');
  screen.style.animation = 'slideOutRight 0.24s cubic-bezier(0.4,0,0.2,1)';
  setTimeout(() => { screen.style.display = 'none'; }, 220);
}

const LB_LEAGUES = [
  { name:'Bronz',    color:'#cd7f32', bg:'rgba(205,127,50,0.15)',   min:0,    max:299   },
  { name:'Gümüş',   color:'#9ba5b0', bg:'rgba(155,165,176,0.15)',  min:300,  max:749   },
  { name:'Altın',    color:'#fbbf24', bg:'rgba(251,191,36,0.15)',   min:750,  max:1349  },
  { name:'Elmas',    color:'#22d3ee', bg:'rgba(34,211,238,0.15)',   min:1350, max:2099  },
  { name:'Usta',     color:'#a78bfa', bg:'rgba(167,139,250,0.15)',  min:2100, max:2999  },
  { name:'Üstat',    color:'#fb923c', bg:'rgba(251,146,60,0.15)',   min:3000, max:4199  },
  { name:'Şampiyon', color:'#e879f9', bg:'rgba(232,121,249,0.15)',  min:4200, max:5199  },
  { name:'Efsane',   color:'#00eaff', bg:'rgba(0,234,255,0.1)',     min:5200, max:99999 },
];
let lbActiveLeague = 0;

async function loadDuelLeaderboard(leagueIdx) {
  if (leagueIdx === undefined) {
    // Kendi ligini varsayılan yap
    const myElo = duelState.myElo || 0;
    leagueIdx = LB_LEAGUES.findIndex(l => myElo >= l.min && myElo <= l.max);
    if (leagueIdx < 0) leagueIdx = 0;
  }
  lbActiveLeague = leagueIdx;
  const lg = LB_LEAGUES[leagueIdx];

  // Sekmeleri çiz
  document.getElementById('lbLeagueTabs').innerHTML = LB_LEAGUES.map((l,i) =>
    `<div onclick="loadDuelLeaderboard(${i})" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 10px;border-radius:10px;cursor:pointer;border:1px solid ${i===leagueIdx ? l.color+'44' : 'transparent'};background:${i===leagueIdx ? l.bg : 'rgba(255,255,255,0.03)'};">
      <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;">${getLeagueSvg(l.name+' 1', 24)}</div>
      <div style="font-size:8px;color:${i===leagueIdx ? '#fff' : 'rgba(255,255,255,0.35)'};letter-spacing:0.5px;white-space:nowrap;">${l.name}</div>
    </div>`
  ).join('');

  const list = document.getElementById('duelLbList');
  const podium = document.getElementById('duelLbPodium');
  list.innerHTML = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,0.2);font-size:12px;">Yükleniyor...</div>';
  podium.innerHTML = '';

  if (!sb) return;
  try {
  const token = await getToken();
  // Token null ise sadece apikey ile anonim erişim yap
  const authHeaders = { 'apikey': SUPABASE_KEY };
  if (token) authHeaders['Authorization'] = 'Bearer ' + token;

  const res = await fetch(
    SUPABASE_URL + '/rest/v1/league_stats?elo=gte.' + lg.min + '&elo=lte.' + lg.max +
    '&order=elo.desc&limit=50&select=user_id,elo,wins,losses',
    { headers: authHeaders }
  );
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();

  if (!data || !data.length) {
    podium.innerHTML = '';
    list.innerHTML = '<div style="text-align:center;padding:32px;color:rgba(255,255,255,0.2);font-size:13px;">Bu ligde henüz kimse yok</div>';
    return;
  }

  const ids = data.map(d => d.user_id);
  const pRes = await fetch(
    SUPABASE_URL + '/rest/v1/profiles?id=in.(' + ids.join(',') + ')&select=id,username,avatar',
    { headers: authHeaders }
  );
  if (!pRes.ok) throw new Error('Profil HTTP ' + pRes.status);
  const profiles = await pRes.json();
  const pm = {};
  (profiles || []).forEach(p => pm[p.id] = p);

  // Podium — ilk 3
  const top3 = data.slice(0, 3);
  const podOrder = [1,0,2];
  const podMedals = ['🥇','🥈','🥉'];
  const podHeights = ['56px','72px','44px'];
  const podBaseH = ['40px','56px','32px'];
  podium.innerHTML = podOrder.map(pi => {
    const r = top3[pi];
    if (!r) return '';
    const p = pm[r.user_id] || {};
    const name = p.username || 'Oyuncu';
    const ini = name[0].toUpperCase();
    const wr = r.wins+r.losses > 0 ? Math.round(r.wins/(r.wins+r.losses)*100) : 0;
    const isMe = currentUser && r.user_id === currentUser.id;
    const avSize = pi===0 ? '56px' : pi===1 ? '72px' : '44px';
    const baseH = pi===0 ? '40px' : pi===1 ? '56px' : '32px';
    const baseW = pi===0 ? '56px' : pi===1 ? '72px' : '44px';
    const medals = ['🥇','🥈','🥉'];
    const rankNum = pi===1 ? '1' : pi===0 ? '2' : '3';
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
      <div style="font-size:16px;">${medals[pi]}</div>
      <div style="width:${avSize};height:${avSize};border-radius:50%;background:${lg.bg};border:2px solid ${lg.color};box-shadow:0 0 10px ${lg.color}44;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;">${isMe ? '✦' : ini}</div>
      <div style="font-size:9px;color:${pi===0?lg.color:'rgba(255,255,255,0.7)'};max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">${isMe ? 'Sen' : name}</div>
      <div style="font-size:8px;color:${lg.color};font-weight:700;">${r.elo}p</div>
      <div style="width:${baseW};height:${baseH};background:${lg.bg};border-radius:6px 6px 0 0;display:flex;align-items:center;justify-content:center;font-family:'DM Serif Display',serif;font-size:13px;color:${lg.color};">${rankNum}</div>
    </div>`;
  }).join('');

  // Liste — 4+
  const rest = data.slice(3);
  // Kendi satırım top3'te değilse ekle
  const myInTop3 = top3.some(r => currentUser && r.user_id === currentUser.id);
  const myRow = !myInTop3 ? data.find(r => currentUser && r.user_id === currentUser.id) : null;

  list.innerHTML = rest.map((r, i) => {
    const p = pm[r.user_id] || {};
    const name = p.username || 'Oyuncu';
    const ini = name[0].toUpperCase();
    const wr = r.wins+r.losses > 0 ? Math.round(r.wins/(r.wins+r.losses)*100) : 0;
    const isMe = currentUser && r.user_id === currentUser.id;
    return `<div onclick="showDuelProfile('${r.user_id}')" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:${isMe ? lg.bg : 'rgba(255,255,255,0.03)'};border:1px solid ${isMe ? lg.color+'44' : 'transparent'};cursor:pointer;touch-action:manipulation;margin-bottom:2px;">
      <div style="font-size:11px;font-weight:700;color:${isMe ? lg.color : 'rgba(255,255,255,0.3)'};width:20px;text-align:center;">${i+4}</div>
      <div style="width:30px;height:30px;border-radius:50%;background:${isMe ? lg.bg : 'rgba(255,255,255,0.07)'};border:1.5px solid ${isMe ? lg.color : 'transparent'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${isMe ? lg.color : 'rgba(255,255,255,0.6)'};flex-shrink:0;">${isMe ? '✦' : ini}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:${isMe?700:400};color:${isMe?'#fff':'rgba(255,255,255,0.8)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${isMe ? 'Sen' : name}</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.3);margin-top:1px;">${wr}% galibiyet · ${r.wins}G ${r.losses}M</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'DM Serif Display',serif;font-size:15px;color:${isMe ? lg.color : '#fff'};">${r.elo}</div>
        <div style="font-size:8px;color:rgba(255,255,255,0.3);">puan</div>
      </div>
    </div>`;
  }).join('');
  } catch(e) {
    console.error('Düello liderboard yükleme hatası:', e);
    podium.innerHTML = '';
    list.innerHTML = '<div style="text-align:center;padding:32px;color:rgba(255,255,255,0.35);font-size:13px;">Bağlantı hatası — tekrar dene</div>';
  }
}

async function showDuelProfile(userId) {
  if (!sb) return;
  // Artık kullanıcının serisini (streak) ve rozetlerini (earned_badges) de çekiyoruz
  const { data: p } = await sb.from('profiles').select('username, avatar, streak, earned_badges').eq('id', userId).single();
  const { data: s } = await sb.from('league_stats').select('*').eq('user_id', userId).single();
  if (!p || !s) return;
  
  const league = getLeague(s.elo || 0);
  const total = (s.wins || 0) + (s.losses || 0);
  const wr = total > 0 ? Math.round((s.wins / total) * 100) : 0;
  
  const badgeCount = p.earned_badges ? p.earned_badges.length : 0;
  const streak = p.streak || 0;

  const avatar = p.avatar && p.avatar.startsWith('http')
    ? `<img src="${p.avatar}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid var(--accent);">`
    : `<div style="width:72px;height:72px;border-radius:50%;background:var(--surface2);border:3px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:40px;">${p.avatar || '🧩'}</div>`;
    
  showModal('genericModal');
  document.getElementById('genericModalContent').innerHTML = `

    <!-- Avatar + İsim -->
    <div style="display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:1px solid var(--border);margin-bottom:16px;">
      <div style="width:56px;height:56px;border-radius:50%;border:2px solid var(--border);overflow:hidden;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">
        ${p.avatar && p.avatar.startsWith('http')
          ? `<img src="${p.avatar}" style="width:100%;height:100%;object-fit:cover;">`
          : (p.avatar || '🧩')}
      </div>
      <div>
        <div style="font-family:'DM Serif Display',serif;font-size:20px;color:var(--text);">${p.username}</div>
        <div style="display:flex;align-items:center;gap:5px;margin-top:3px;">
          ${getLeagueSvg(league.name, 14)}
          <span style="font-size:12px;color:var(--text-muted);">${league.name} · ${s.elo} ELO</span>
        </div>
      </div>
    </div>

    <!-- İstatistikler -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
      <div style="text-align:center;padding:12px 0;background:var(--surface2);border-radius:12px;">
        <div style="font-family:'DM Serif Display',serif;font-size:22px;color:#22c55e;">${s.wins||0}</div>
        <div style="font-size:9px;color:var(--text-muted);font-weight:600;letter-spacing:0.5px;margin-top:2px;">GALİBİYET</div>
      </div>
      <div style="text-align:center;padding:12px 0;background:var(--surface2);border-radius:12px;">
        <div style="font-family:'DM Serif Display',serif;font-size:22px;color:#ef4444;">${s.losses||0}</div>
        <div style="font-size:9px;color:var(--text-muted);font-weight:600;letter-spacing:0.5px;margin-top:2px;">MAĞLUBİYET</div>
      </div>
      <div style="text-align:center;padding:12px 0;background:var(--surface2);border-radius:12px;">
        <div style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--text);">${wr}%</div>
        <div style="font-size:9px;color:var(--text-muted);font-weight:600;letter-spacing:0.5px;margin-top:2px;">KAZANMA</div>
      </div>
    </div>

    <!-- Seri + Rozet -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div style="background:var(--surface2);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:20px;">🔥</span>
        <div>
          <div style="font-family:'DM Serif Display',serif;font-size:18px;color:var(--accent);">${streak}</div>
          <div style="font-size:9px;color:var(--text-muted);font-weight:600;letter-spacing:0.5px;">GÜNLÜK SERİ</div>
        </div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:20px;">🎖️</span>
        <div>
          <div style="font-family:'DM Serif Display',serif;font-size:18px;color:var(--text);">${badgeCount}</div>
          <div style="font-size:9px;color:var(--text-muted);font-weight:600;letter-spacing:0.5px;">ROZET</div>
        </div>
      </div>
    </div>
  `;
}

function showDuelIntro(force = false) {
  const seen = localStorage.getItem('duelIntroSeen');
  if (seen && !force) return;
  // Lig ikonlarını oluştur
  const introLeagues = document.getElementById('duelIntroLeagues');
  if (introLeagues) {
    const bases = ['Bronz','Gümüş','Altın','Elmas','Usta','Üstat','Şampiyon','Efsane'];
    introLeagues.innerHTML = bases.map(b => {
      const style = LEAGUE_STYLES[b] || LEAGUE_STYLES['Bronz'];
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="width:44px;height:44px;border-radius:12px;background:${style.bg};border:1px solid ${style.border};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px ${style.glow};">${getLeagueSvg(b+' 1', 28)}</div>
        <div style="font-size:9px;color:var(--text-muted);">${b}</div>
      </div>`;
    }).join('');
  }
  const screen = document.getElementById('duelIntroScreen');
  screen.style.display = 'flex';
  screen.style.animation = 'fadeIn 0.3s ease';
}

function closeDuelIntro() {
  localStorage.setItem('duelIntroSeen', '1');
  document.getElementById('duelIntroScreen').style.display = 'none';
}

function openDuelSelfProfile() {
  if (typeof currentUser === 'undefined' || !currentUser) { showToast('Önce giriş yap'); return; }
  if (typeof showDuelProfile !== 'function') return;
  showDuelProfile(currentUser.id);
}

/** ELO → seviye UI (100 ELO = 1 seviye; görüntü için; backend aynı kalır) */
function duelEloToLevelUI(elo) {
  const XP_PER_LEVEL = 100;
  const e = Math.max(0, Number(elo) || 0);
  const level = Math.floor(e / XP_PER_LEVEL);
  const xpIn = e % XP_PER_LEVEL;
  const nextAt = (level + 1) * XP_PER_LEVEL;
  const xpRemain = Math.max(0, nextAt - e);
  const pct = Math.min(100, Math.round((xpIn / XP_PER_LEVEL) * 100));
  return { level, xpRemain, pct, xpIn, xpPerLevel: XP_PER_LEVEL };
}

const DUEL_HEX_SEG_COUNT = 12;

function duelHexVerts(cx, cy, R) {
  const v = [];
  for (let i = 0; i < 6; i++) {
    const th = (-Math.PI / 2) + (i * Math.PI) / 3;
    v.push([cx + R * Math.cos(th), cy + R * Math.sin(th)]);
  }
  return v;
}

function duelEnsureHexSegments(groupEl) {
  if (!groupEl || groupEl.querySelector('path')) return;
  const verts = duelHexVerts(100, 100, 86);
  for (let e = 0; e < 6; e++) {
    const a = verts[e];
    const b = verts[(e + 1) % 6];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const mk = (x, y) => x.toFixed(2) + ' ' + y.toFixed(2);
    const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p1.setAttribute('d', 'M ' + mk(a[0], a[1]) + ' L ' + mk(mx, my));
    p1.setAttribute('class', 'duel-hex__edge');
    groupEl.appendChild(p1);
    const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p2.setAttribute('d', 'M ' + mk(mx, my) + ' L ' + mk(b[0], b[1]));
    p2.setAttribute('class', 'duel-hex__edge');
    groupEl.appendChild(p2);
  }
}

function duelSetHexSegments(groupEl, pct) {
  duelEnsureHexSegments(groupEl);
  if (!groupEl) return;
  const filled = Math.min(DUEL_HEX_SEG_COUNT, Math.max(0, Math.floor(Number(pct) / (100 / DUEL_HEX_SEG_COUNT))));
  const paths = groupEl.querySelectorAll('.duel-hex__edge');
  paths.forEach((p, i) => {
    p.classList.toggle('duel-hex__edge--on', i < filled);
  });
}

function duelRenderHeaderAvatar() {
  const el = document.getElementById('duelHeaderAvatar');
  if (!el) return;
  const av = (typeof appState !== 'undefined' && appState && appState.avatar) ? appState.avatar : '🧩';
  if (typeof av === 'string' && av.startsWith('http')) {
    el.innerHTML = '<img src="' + av.replace(/"/g, '') + '" alt="" class="duel-light__avatar-img">';
  } else {
    el.textContent = av || '🧩';
  }
}

async function openDuelScreen() {
  if (!currentUser) { showToast('Düello için giriş yapman gerekiyor!'); return; }
  const screen = document.getElementById('duelScreen');
  screen.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('swipeDots').style.display = 'none';
  screen.style.animation = 'slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)';
  await loadLeagueStats();
  updateDuelScreenUI();
  // İlk kez açıyorsa tanıtım göster
  setTimeout(() => showDuelIntro(false), 400);
}

function closeDuelScreen() {
  const screen = document.getElementById('duelScreen');
  screen.style.animation = 'slideOutRight 0.24s cubic-bezier(0.4,0,0.2,1)';
  setTimeout(() => { 
  screen.style.display = 'none'; 
  document.getElementById('swipeDots').style.display = 'flex';
  document.body.style.overflow = '';
}, 220);
}

async function loadLeagueStats() {
  if (!currentUser || !sb) return;
  const { data } = await sb.from('league_stats').select('*').eq('user_id', currentUser.id).single();
  if (data) {
    duelState.myElo = data.elo || 0;
    duelState.wins = data.wins || 0;
    duelState.losses = data.losses || 0;
  } else {
    // İlk kez — kayıt oluştur
    await sb.from('league_stats').insert({ user_id: currentUser.id, elo: 0, wins: 0, losses: 0 });
    duelState.myElo = 0; duelState.wins = 0; duelState.losses = 0;
  }
}

function updateDuelScreenUI() {
  const elo = duelState.myElo;
  const { level, xpRemain, pct, xpIn, xpPerLevel } = duelEloToLevelUI(elo);

  duelRenderHeaderAvatar();
  const lvlBadge = document.getElementById('duelHeaderLevelBadge');
  if (lvlBadge) lvlBadge.textContent = 'Lvl. ' + level;

  const emblemLvl = document.getElementById('duelEmblemLevelText');
  if (emblemLvl) emblemLvl.textContent = 'Lvl. ' + level;

  const frac = document.getElementById('duelXpFraction');
  if (frac) frac.textContent = xpIn + ' / ' + xpPerLevel + ' XP';

  duelSetHexSegments(document.getElementById('duelHexSegmentGroup'), pct);

  const hint = document.getElementById('duelLevelXpHint');
  if (hint) hint.textContent = 'Sıradaki seviyeye ' + xpRemain + ' XP kaldı';

  let energy = 5;
  try {
    const s = localStorage.getItem('duel_energy');
    if (s !== null && s !== '') energy = Math.max(0, parseInt(s, 10) || 0);
  } catch (e) {}
  const enEl = document.getElementById('duelEnergyValue');
  if (enEl) enEl.textContent = String(energy);

  const badge = document.getElementById('playerLeagueBadge');
  if (badge) badge.textContent = 'SVY ' + level;
  updateProfilePanel();
}

async function loadRecentDuels() {
  const el = document.getElementById('duelRecentList');
  if (!el || !currentUser) return;
  el.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.2);text-align:center;padding:8px;">Yükleniyor...</div>';

  try {
    const { data: duels, error } = await sb.from('duels')
      .select('id,winner_id,player1_id,player2_id,finished_at')
      .eq('status', 'finished')
      .or('player1_id.eq.' + currentUser.id + ',player2_id.eq.' + currentUser.id)
      .order('finished_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    if (!duels || !duels.length) {
      el.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.2);text-align:center;padding:8px;">Henüz düello oynamadın</div>';
      return;
    }

    const duelIds = duels.map(d => d.id);
    const oppIds = [...new Set(duels.map(d => d.player1_id === currentUser.id ? d.player2_id : d.player1_id).filter(Boolean))];

    const { data: profiles } = await sb.from('profiles')
      .select('id,username,avatar')
      .in('id', oppIds);
    const profileMap = {};
    (profiles || []).forEach(p => profileMap[p.id] = p);

    const { data: dpRows } = await sb.from('duel_players')
      .select('duel_id,elo_change')
      .in('duel_id', duelIds)
      .eq('user_id', currentUser.id);
    const eloMap = {};
    (dpRows || []).forEach(r => eloMap[r.duel_id] = r.elo_change);

    el.innerHTML = duels.map(d => {
      const won = d.winner_id === currentUser.id;
      const oppId = d.player1_id === currentUser.id ? d.player2_id : d.player1_id;
      const opp = profileMap[oppId] || {};
      const oppName = opp.username || 'Bilinmeyen';
      const oppAvatar = opp.avatar || '🎮';
      const date = d.finished_at ? new Date(d.finished_at).toLocaleDateString('tr-TR', { day:'numeric', month:'short' }) : '';
      const eloChange = eloMap[d.id];
      const eloText = eloChange != null ? (eloChange > 0 ? '+' + eloChange : eloChange) + ' ELO' : '';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.03);">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.07);border:1.5px solid ${won ? 'rgba(34,197,94,0.4)' : 'rgba(248,113,113,0.4)'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${oppAvatar}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${oppName}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:1px;">${date}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;font-weight:700;color:${won ? '#22c55e' : '#f87171'};">${won ? 'GALİP' : 'MAĞLUBİYET'}</div>
            ${eloText ? `<div style="font-size:10px;color:${won ? '#4ade80' : '#f87171'};margin-top:1px;">${eloText}</div>` : ''}
          </div>
        </div>`;
    }).join('');

  } catch(e) {
    console.error('loadRecentDuels hatası:', e);
    el.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.2);text-align:center;padding:8px;">Yüklenemedi</div>';
  }
}


async function loadDuelTopList() {
  const el = document.getElementById('duelTopList');
  if (!el) return;
  try {
    const elo = duelState.myElo;
    const league = getLeague(elo);
    const token = await getToken();
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/league_stats?elo=gte.' + league.min + '&elo=lte.' + league.max +
      '&order=elo.desc&limit=3&select=elo,wins,losses,user_id',
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token } }
    );
    const rows = await res.json();
    if (!rows || !rows.length) { el.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.2);text-align:center;padding:8px;">Henüz kimse yok</div>'; return; }

    // Kullanıcı adlarını çek
    const ids = rows.map(r => r.user_id);
    const pRes = await fetch(
      SUPABASE_URL + '/rest/v1/profiles?id=in.(' + ids.join(',') + ')&select=id,username',
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token } }
    );
    const profiles = await pRes.json();
    const nameMap = {};
    (profiles || []).forEach(p => nameMap[p.id] = p.username);

    const medals = ['🥇','🥈','🥉'];
    el.innerHTML = rows.map((r, i) => {
      const isMe = currentUser && r.user_id === currentUser.id;
      const name = nameMap[r.user_id] || 'Oyuncu';
      const ini = name[0].toUpperCase();
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:${isMe ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)'};border:1px solid ${isMe ? 'rgba(59,130,246,0.2)' : 'transparent'};">
        <div style="font-size:13px;width:18px;text-align:center;">${medals[i] || (i+1)}</div>
        <div style="width:24px;height:24px;border-radius:50%;background:${isMe ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.07)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${isMe ? '#3b82f6' : 'rgba(255,255,255,0.5)'};">${ini}</div>
        <div style="flex:1;font-size:11px;color:${isMe ? '#fff' : 'rgba(255,255,255,0.8)'};font-weight:${isMe ? '700' : '400'};">${isMe ? 'Sen' : name}</div>
        <div style="font-size:10px;color:${isMe ? '#3b82f6' : 'rgba(255,255,255,0.35)'};">${r.elo}p</div>
      </div>`;
    }).join('');
    // Mevcut kullanıcı top 3'te değilse kendi satırını ekle
const myInList = rows.some(r => r.user_id === currentUser.id);
if (!myInList) {
  // Kendi sıramı bul
  const rankRes = await fetch(
    SUPABASE_URL + '/rest/v1/league_stats?elo=gte.' + league.min + '&elo=lte.' + league.max +
    '&order=elo.desc&select=user_id',
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token } }
  );
  const allRows = await rankRes.json();
  const myRank = allRows.findIndex(r => r.user_id === currentUser.id) + 1;
  if (myRank > 0) {
    const myElo = duelState.myElo;
    const myName = appState.username || 'Sen';
    el.innerHTML += `<div style="margin-top:4px;border-top:1px solid rgba(255,255,255,0.06);padding-top:4px;">
      <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);">
        <div style="font-size:10px;color:#3b82f6;width:18px;text-align:center;font-weight:700;">${myRank}</div>
        <div style="width:24px;height:24px;border-radius:50%;background:rgba(59,130,246,0.2);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#3b82f6;">${myName[0].toUpperCase()}</div>
        <div style="flex:1;font-size:11px;color:#fff;font-weight:700;">Sen</div>
        <div style="font-size:10px;color:#3b82f6;">${myElo}p</div>
      </div>
    </div>`;
  }
}
  } catch(e) {
    el.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.2);text-align:center;padding:8px;">Yüklenemedi</div>';
  }
}

function generateDuelCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getDuelGivens(elo) {
  if (elo < 300)  return 34; 
  if (elo < 750)  return 28; 
  if (elo < 1350) return 24; 
  if (elo < 2100) return 22; 
  if (elo < 3000) return 20; 
  if (elo < 4200) return 18; 
  if (elo < 5200) return 17; 
  return 17;                 
}

function generateSudokuPuzzle(givens) {
  let mode = 'medium';
  if (givens >= 50) mode = 'beginner';
  else if (givens >= 42) mode = 'easy';
  else if (givens >= 34) mode = 'medium';
  else if (givens >= 28) mode = 'hard';
  else if (givens >= 24) mode = 'expert';
  else if (givens >= 22) mode = 'master';
  else if (givens >= 20) mode = 'grandmaster';
  else mode = 'legend';

  const seed = Math.random() * 1e9 | 0;
  return generatePuzzle(mode, seed);
}

async function createDuel() {
  try {
    if (!currentUser) { showToast('⚠️ Düello için giriş yapman gerekiyor!'); return; }
    
    showToast('⏳ Oda oluşturuluyor, lütfen bekle...');
    await new Promise(resolve => setTimeout(resolve, 50)); 

    console.log("1. Sudoku üretiliyor...");
    const code = generateDuelCode();
    const givens = getDuelGivens(duelState.myElo);
    const puzzle = generateSudokuPuzzle(givens);
    console.log("2. Sudoku üretildi, veritabanına kaydediliyor...");
    console.log("Puzzle tipi:", Array.isArray(puzzle.puzzle), typeof puzzle.puzzle);
    console.log("Puzzle içerik:", JSON.stringify(puzzle.puzzle));
    

    const res = await fetch(SUPABASE_URL + '/rest/v1/duels', {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + (await getToken()),
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    code,
    puzzle: Array.from(puzzle.puzzle),
    solution: Array.from(puzzle.solution),
    player1_id: currentUser.id,
    status: 'waiting'
  })
});
const data = await res.json();
const error = res.ok ? null : data;
console.log("INSERT sonucu:", { data, error, status: res.status });

    if (error) { 
      showToast('❌ Veritabanı Hatası: ' + error.message); 
      console.error('Supabase error:', error); 
      return; 
    }

    console.log("3. Veritabanı kaydı başarılı!");
    duelState.duelId = data[0].id;
    duelState.code = code;
    duelState.puzzle = data[0].puzzle;
    duelState.solution = data[0].solution;

    document.getElementById('duelWaitCode').textContent = code;
    document.getElementById('duelWaitTitle').textContent = 'Rakip Bekleniyor';
    document.getElementById('duelWaitMsg').textContent = 'Bu kodu arkadaşına gönder';
    showModal('duelWaitModal');

    listenForDuelStart(data[0].id);
  } catch (err) {
    showToast('❌ Beklenmeyen Hata: ' + err.message);
    console.error("Create Duel Hatası:", err);
  }
}

async function joinDuelByCode() {
  try {
    const inputEl = document.getElementById('duelCodeInput');
    if (!inputEl) return;
    const code = inputEl.value.trim().toUpperCase();
    if (code.length !== 6) { showToast('6 haneli kod gir!'); return; }
    const token = await getToken();
const joinRes = await fetch(SUPABASE_URL + '/rest/v1/duels?code=eq.' + code + '&status=eq.waiting&limit=1', {
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token }
});
const joinData = await joinRes.json();
const data = joinData[0] || null;
if (!data) { showToast('❌ Geçersiz kod veya oda dolu!'); return; }
if (data.player1_id === currentUser.id) { showToast('Kendi odana katamazsın!'); return; }
await fetch(SUPABASE_URL + '/rest/v1/duels?id=eq.' + data.id, {
  method: 'PATCH',
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ player2_id: currentUser.id, status: 'active', started_at: new Date().toISOString() })
});
    duelState.duelId = data.id;
    duelState.puzzle = data.puzzle;
    duelState.solution = data.solution;
    duelState.opponentId = data.player1_id;

    const { data: p } = await sb.from('profiles').select('username').eq('id', data.player1_id).single();
    duelState.opponentName = p?.username || 'Rakip';

    startDuelGame();
  } catch (err) {
    showToast('❌ Katılma Hatası: ' + err.message);
    console.error(err);
  }
}

let matchmakingInterval = null;
let botFallbackTimer = null;

function showMatchFound(opponentName, opponentElo) {
  // Durum yazısı
  document.getElementById('matchOverlayStatus').textContent = 'EŞLEŞİLDİ!';
  document.getElementById('matchOverlayStatus').style.color = '#4ade80';
  document.getElementById('matchOverlayStatus').style.letterSpacing = '4px';

  // Noktaları gizle
  document.getElementById('matchOverlayDots').style.display = 'none';

  // Rakip halkasını doldur
  document.getElementById('matchOpponentRing').style.border = '2px solid #ef4444';
  document.getElementById('matchOpponentRing').style.borderTop = '2px solid transparent';
  document.getElementById('matchOpponentRing').style.animation = 'matchSpin 1s linear infinite';

  // Rakip avatar
  const oppAvatar = document.getElementById('matchOverlayOpponentAvatar');
  oppAvatar.textContent = (opponentName || 'R')[0].toUpperCase();
  oppAvatar.style.background = 'linear-gradient(135deg,#7f1d1d,#c53f3f)';
  oppAvatar.style.border = '3px solid #ef4444';
  oppAvatar.style.color = '#fff';
  oppAvatar.style.fontSize = '28px';
  oppAvatar.style.boxShadow = '0 0 24px rgba(239,68,68,0.5)';
  oppAvatar.style.animation = 'matchFoundPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards';

  // Rakip bilgileri
  document.getElementById('matchOverlayOpponentName').textContent = opponentName || 'Rakip';
  document.getElementById('matchOverlayOpponentName').style.color = '#fff';
  document.getElementById('matchOverlayOpponentName').style.animation = 'matchFadeIn 0.4s ease forwards';
  document.getElementById('matchOverlayOpponentElo').textContent = (opponentElo || 0) + ' ELO';
  document.getElementById('matchOverlayOpponentElo').style.color = 'rgba(255,255,255,0.5)';

  // VS parlasın
  const vs = document.getElementById('matchOverlayVS');
  vs.style.color = '#fff';
  vs.style.textShadow = '0 0 30px rgba(255,255,255,0.8),0 0 60px rgba(100,180,255,0.5)';
  vs.style.transform = 'scale(1.2)';
  vs.style.animation = 'matchFoundShake 0.4s ease';

  // Parçacık patlaması
  spawnMatchParticles();

  // 2 saniye sonra kapat
  setTimeout(() => {
    const ov = document.getElementById('matchmakingOverlay');
    ov.style.opacity = '0';
    ov.style.transition = 'opacity 0.4s ease';
    setTimeout(() => {
      ov.style.display = 'none';
      ov.style.opacity = '1';
      const savedDuelId   = duelState.duelId;
      const savedIsBot    = duelState.isBot;
      const savedBotSpeed = duelState.botSpeed;

      duelState.duelId = null; // cancelMatchmaking aktif düelloyu silmesin
      cancelMatchmaking();

      duelState.duelId = savedDuelId;
      if (savedIsBot) {
      duelState.isBot    = true;
      duelState.botSpeed = savedBotSpeed;
}
      if (duelState.botSimInterval) { clearInterval(duelState.botSimInterval); duelState.botSimInterval = null; }
      if (botFallbackTimer) { clearTimeout(botFallbackTimer); botFallbackTimer = null; }
      startDuelGame();
    }, 400);
  }, 2000);
}

function spawnMatchParticles() {
  const container = document.getElementById('matchParticles');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#3b82f6','#60a5fa','#ef4444','#f87171','#fff','#4ade80','#fbbf24'];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 8 + 4;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = Math.random() * 0.8 + 0.6;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `position:absolute;left:${x}%;top:${y}%;width:${size}px;height:${size}px;border-radius:50%;background:${color};animation:matchParticle ${duration}s ease ${delay}s forwards;`;
    container.appendChild(p);
  }
}

// ─── BOT PROFİLLERİ ─────────────────────────────────────────────────────────
const BOT_PROFILES = [
  { name:'SudokuBot-🥉',   elo: 50,   speed:{ min:180000, max:360000 } }, // Bronz 1  — 3-6 dk
  { name:'GridGhost-🥉',   elo: 150,  speed:{ min:195000, max:385000 } }, // Bronz 2
  { name:'BronzMind-🥉',   elo: 250,  speed:{ min:210000, max:400000 } }, // Bronz 3
  { name:'SilverPawn-🥈',  elo: 375,  speed:{ min:210000, max:420000 } }, // Gümüş 1  — 3.5-7 dk
  { name:'GridMind-🥈',    elo: 525,  speed:{ min:225000, max:435000 } }, // Gümüş 2
  { name:'SilverBot-🥈',   elo: 675,  speed:{ min:240000, max:450000 } }, // Gümüş 3
  { name:'GoldBot-🥇',     elo: 850,  speed:{ min:240000, max:480000 } }, // Altın 1  — 4-8 dk
  { name:'GridKing-🥇',    elo: 1050, speed:{ min:255000, max:495000 } }, // Altın 2
  { name:'GoldMind-🥇',    elo: 1250, speed:{ min:270000, max:510000 } }, // Altın 3
  { name:'DiamondBot-💎',  elo: 1475, speed:{ min:270000, max:540000 } }, // Elmas 1  — 4.5-9 dk
  { name:'CrystalAce-💎',  elo: 1725, speed:{ min:285000, max:555000 } }, // Elmas 2
  { name:'DiamondMind-💎', elo: 1975, speed:{ min:300000, max:570000 } }, // Elmas 3
  { name:'MasterBot-🔮',   elo: 2250, speed:{ min:300000, max:600000 } }, // Usta 1   — 5-10 dk
  { name:'GridMaster-🔮',  elo: 2550, speed:{ min:330000, max:630000 } }, // Usta 2
  { name:'MasterMind-🔮',  elo: 2850, speed:{ min:360000, max:660000 } }, // Usta 3
  { name:'EliteBot-🌟',    elo: 3200, speed:{ min:360000, max:720000 } }, // Üstat 1  — 6-12 dk
  { name:'ProSolver-🌟',   elo: 3600, speed:{ min:390000, max:750000 } }, // Üstat 2
  { name:'EliteMind-🌟',   elo: 4000, speed:{ min:420000, max:780000 } }, // Üstat 3
  { name:'ChampBot-⚡',    elo: 4450, speed:{ min:420000, max:840000 } }, // Şampiyon 1 — 7-14 dk
  { name:'GridChamp-⚡',   elo: 4950, speed:{ min:450000, max:870000 } }, // Şampiyon 2
  { name:'LegendBot-👑',   elo: 5500, speed:{ min:480000, max:960000 } }, // Efsane   — 8-16 dk
];

function getBotForElo(myElo) {
  // Aynı ligden ±300 ELO aralığındaki botları al, yoksa en yakını
  let candidates = BOT_PROFILES.filter(b => Math.abs(b.elo - myElo) <= 300);
  if (!candidates.length) {
    candidates = [BOT_PROFILES.reduce((a, b) =>
      Math.abs(a.elo - myElo) < Math.abs(b.elo - myElo) ? a : b)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Bot eşleştirme: 4 saniye içinde rakip bulunamazsa bot hazır
function startBotFallback(duelId) {
  if (botFallbackTimer) clearTimeout(botFallbackTimer);
  botFallbackTimer = setTimeout(async () => {
    // Hâlâ aynı duel bekleniyor ve tamamlanmadıysa
    if (duelState.duelId !== duelId || duelState.completed) return;

    const bot = getBotForElo(duelState.myElo || 0);
    clearInterval(duelState.pollInterval);
    clearInterval(matchmakingInterval);

    // Bekleme odasını sil (gerçek oyuncu girmesin artık)
    try {
      const token = await getToken();
      await fetch(SUPABASE_URL + '/rest/v1/duels?id=eq.' + duelId, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token }
      });
    } catch(e) {}

    duelState.duelId = null; // bot maçında gerçek duel ID yok
    duelState.isBot = true;
    duelState.opponentName = bot.name;
    duelState.opponentElo  = bot.elo;
    duelState.botSpeed     = bot.speed;

    showMatchFound(bot.name, bot.elo);
  }, 15000); // 15 sn — hızlı, "her zaman bot var" hissi
}

function cancelMatchmaking() {
  try {
    if (duelState.duelId) sb.from('duels').delete().eq('id', duelState.duelId).then(() => {}).catch(() => {});
    if (duelState.realtimeChannel) try { sb.removeChannel(duelState.realtimeChannel); } catch(e) {}
    if (matchmakingInterval) clearInterval(matchmakingInterval);
    if (duelState.pollInterval) clearInterval(duelState.pollInterval);
  } catch(e) {}

  duelState.duelId = null;
  duelState.realtimeChannel = null;
  matchmakingInterval = null;
  if (botFallbackTimer) { clearTimeout(botFallbackTimer); botFallbackTimer = null; }
  duelState.isBot = false;
  if (duelState.botSimInterval) { clearInterval(duelState.botSimInterval); duelState.botSimInterval = null; }

  const ov = document.getElementById('matchmakingOverlay');
  if (ov) { ov.style.opacity = '0'; setTimeout(() => { ov.style.display = 'none'; ov.style.opacity = '1'; }, 300); }

  try { hideModal('duelWaitModal'); } catch(e) {}

  const btn = document.getElementById('matchmakeBtn');
  if (btn) {
    btn.disabled = false;
    btn.classList.remove('duel-light__match-btn--busy');
    btn.style.opacity = '';
    btn.style.pointerEvents = '';
    btn.style.cursor = '';
  }

  const btnTitle = document.getElementById('matchmakeBtnTitle');
  if (btnTitle) btnTitle.textContent = 'RAKİP BUL';

  const cancelBtn = document.getElementById('cancelMatchmakeBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

async function startMatchmaking() {
  try {
    if (!currentUser) { showToast('⚠️ Düello için giriş yapman gerekiyor!'); return; }
    
    const btn = document.getElementById('matchmakeBtn');
    btn.disabled = true;
    btn.classList.add('duel-light__match-btn--busy');
    btn.style.opacity = '0.92';
    btn.style.pointerEvents = 'none';
    const t = document.getElementById('matchmakeBtnTitle');
    if (t) t.textContent = 'Rakip aranıyor…';
    document.getElementById('cancelMatchmakeBtn').style.display = 'block';
    // Overlay aç ve kendi bilgilerini doldur
const overlay = document.getElementById('matchmakingOverlay');
overlay.style.opacity = '0';
overlay.style.display = 'flex';
overlay.style.transition = 'opacity 0.4s ease';
setTimeout(() => { overlay.style.opacity = '1'; }, 10);
document.getElementById('matchOverlayMyAvatar').textContent = appState.avatar || '🧩';
document.getElementById('matchOverlayMyName').textContent = appState.username || 'Sen';
document.getElementById('matchOverlayMyElo').textContent = (duelState.myElo || 0) + ' ELO';
document.getElementById('matchOverlayStatus').textContent = 'RAKİP ARANIYYOR';
document.getElementById('matchOverlayOpponentAvatar').textContent = '?';
document.getElementById('matchOverlayOpponentAvatar').style.border = '3px dashed rgba(255,255,255,0.2)';
document.getElementById('matchOverlayOpponentAvatar').style.background = 'rgba(255,255,255,0.06)';
document.getElementById('matchOverlayOpponentName').textContent = 'Aranıyor...';
document.getElementById('matchOverlayOpponentName').style.color = 'rgba(255,255,255,0.3)';
document.getElementById('matchOverlayOpponentElo').textContent = '— ELO';
document.getElementById('matchOverlayVS').style.color = 'rgba(255,255,255,0.15)';
    
    const anims = ['⚔️','🔍','⏳','🎯'];
    let ai = 0;
    if (matchmakingInterval) clearInterval(matchmakingInterval);
    matchmakingInterval = setInterval(() => { ai++; }, 600);

    console.log("1. Bekleyen oda aranıyor...");
    const token = await getToken();
const fiveMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
const fetchRes = await fetch(SUPABASE_URL + '/rest/v1/duels?status=eq.waiting&player1_id=neq.' + currentUser.id + '&created_at=gte.' + fiveMinAgo + '&limit=1', {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + token
  }
});
const fetchData = await fetchRes.json();
const existing = fetchData[0] || null;
const fetchErr = null;
    
    if (existing) {
      console.log("2. Oda bulundu, katılınıyor...");
      const token2 = await getToken();
const updateRes = await fetch(SUPABASE_URL + '/rest/v1/duels?id=eq.' + existing.id, {
  method: 'PATCH',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + token2,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ player2_id: currentUser.id, status: 'active', started_at: new Date().toISOString() })
});
const updateErr = updateRes.ok ? null : await updateRes.json();
      if (updateErr) { showToast('❌ Odaya katılamadın: ' + updateErr.message); cancelMatchmaking(); return; }

      duelState.duelId = existing.id;
      duelState.puzzle = existing.puzzle;
      duelState.solution = existing.solution;
      duelState.opponentId = existing.player1_id;
      const pRes = await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + existing.player1_id + '&select=username&limit=1', {
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token }
});
const pData = await pRes.json();
const p = pData[0] || null;
      duelState.opponentName = p?.username || 'Rakip';
clearInterval(matchmakingInterval);
showMatchFound(duelState.opponentName, existing.elo || 0);
      return;
    }

    console.log("3. Bekleyen oda yok, yeni sudoku üretiliyor...");
    await new Promise(resolve => setTimeout(resolve, 50));

    const code = generateDuelCode();
    const givens = getDuelGivens(duelState.myElo);
    const puzzle = generateSudokuPuzzle(givens);
    
    console.log("4. Sudoku üretildi, veritabanına yeni oda açılıyor...");
    const res = await fetch(SUPABASE_URL + '/rest/v1/duels', {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + (await getToken()),
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    code,
    puzzle: Array.from(puzzle.puzzle),
    solution: Array.from(puzzle.solution),
    player1_id: currentUser.id,
    status: 'waiting'
  })
});
const data = await res.json();
const error = res.ok ? null : data;
console.log("INSERT sonucu:", { data, error, status: res.status });
    
    if (error) { 
      showToast('❌ Oda kurulamadı: ' + error.message); 
      console.error('Supabase insert error:', error);
      cancelMatchmaking(); 
      return; 
    }

    console.log("5. Oda başarıyla kuruldu, rakip bekleniyor...");
    duelState.duelId = data[0].id; 
    duelState.code = code; 
    duelState.puzzle = data[0].puzzle; 
    duelState.solution = data[0].solution;

    listenForDuelStart(data[0].id);
    startBotFallback(data[0].id); // ← bot fallback başlat
  } catch (err) {
    showToast('❌ Eşleştirme Hatası: ' + err.message);
    console.error("Matchmaking Hatası:", err);
    cancelMatchmaking();
  }
}

function listenForDuelStart(duelId) {
  if (duelState.pollInterval) clearInterval(duelState.pollInterval);
  duelState.pollInterval = setInterval(async () => {
    try {
      const token = await getToken();
      const res = await fetch(SUPABASE_URL + '/rest/v1/duels?id=eq.' + duelId + '&select=*', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      const duel = data[0];
      if (duel && duel.status === 'active') {
        clearInterval(duelState.pollInterval);
        duelState.duelId = duel.id;
        duelState.puzzle = duel.puzzle;
        duelState.solution = duel.solution;
        duelState.opponentId = duel.player2_id;
// Rakip adını çek
try {
  const pRes2 = await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + duel.player2_id + '&select=username&limit=1', {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + (await getToken()) }
  });
  const pData2 = await pRes2.json();
  duelState.opponentName = pData2[0]?.username || 'Rakip';
} catch(e) { duelState.opponentName = 'Rakip'; }
hideModal('duelWaitModal');
showMatchFound(duelState.opponentName, 0);
      }
    } catch(e) { console.error('Poll hatası:', e); }
  }, 2000);
}

function startDuelGame() {
  // Oyun state'i sıfırla
  duelState.userGrid = Array(81).fill(0);
  duelState.given = Array(81).fill(false);
  duelState.errors = 0;
  duelState.selectedCell = -1;
  duelState.completed = false;
  duelState.myProgress = 0;
  duelState.opponentProgress = 0;
  duelState.timerSec = 0;

  // Given hücreleri işaretle
  for (let i = 0; i < 81; i++) {
    if (duelState.puzzle[i] !== 0) {
      duelState.userGrid[i] = duelState.puzzle[i];
      duelState.given[i] = true;
    }
  }

  // Ekranı göster
  hideModal('duelWaitModal');
  closeDuelScreen();
  const screen = document.getElementById('duelGameScreen');
  screen.style.display = 'flex';

  // Rakip bilgisi
  const ini = (duelState.opponentName || 'R').slice(0,2).toUpperCase();
  document.getElementById('duelOpponentAvatar').textContent = ini;
  document.getElementById('duelOpponentName').textContent = duelState.opponentName || 'Rakip';

  // Grid ve numpad oluştur
  buildDuelGrid();
  buildDuelNumpad();
  updateDuelErrorDots();

  // Rakip ilerleme dinle
  if (duelState.isBot) {
    // Bot: Supabase dinleme yok, simülasyon başlat
    startBotSimulation();
  } else {
    listenDuelProgress();
  }

  // Geri sayım başlat
  startDuelCountdown();
}

function buildDuelGrid() {
  const grid = document.getElementById('duelSudokuGrid');
  grid.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell' + (duelState.given[i] ? ' given' : '');
    if (duelState.given[i]) cell.textContent = duelState.puzzle[i];
    cell.addEventListener('click', () => selectDuelCell(i));
    grid.appendChild(cell);
  }
}

function buildDuelNumpad() {
  const np = document.getElementById('duelNumpad');
  np.innerHTML = '';
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.textContent = n;
    btn.addEventListener('touchend', (e) => { e.preventDefault(); inputDuelNumber(n); });
    btn.addEventListener('click', (e) => { if (!e.isTrusted || e.pointerType === 'touch') return; inputDuelNumber(n); });
    np.appendChild(btn);
  }
}

function selectDuelCell(idx) {
  if (duelState.completed || duelState.given[idx]) return;
  duelState.selectedCell = idx;
  const cells = document.getElementById('duelSudokuGrid').children;
  for (let i = 0; i < 81; i++) {
    cells[i].classList.remove('selected', 'highlight');
    const r = Math.floor(i/9), c = i%9, b = Math.floor(r/3)*3 + Math.floor(c/3);
    const sr = Math.floor(idx/9), sc = idx%9, sb2 = Math.floor(sr/3)*3 + Math.floor(sc/3);
    if (r===sr || c===sc || b===sb2) cells[i].classList.add('highlight');
  }
  cells[idx].classList.add('selected');
}

function inputDuelNumber(n) {
  const idx = duelState.selectedCell;
  if (idx === -1 || duelState.given[idx] || duelState.completed) return;
  const cells = document.getElementById('duelSudokuGrid').children;

  // Zaten doğru girildiyse tekrar işlem yapma
  if (duelState.userGrid[idx] === duelState.solution[idx]) return;

  if (duelState.solution[idx] === n) {
    duelState.userGrid[idx] = n;
    cells[idx].innerHTML = `<span class="cell-num">${n}</span>`;
    cells[idx].classList.remove('has-error');
    cells[idx].classList.add('hint-reveal');
    // İlerleme güncelle
    const filled = duelState.userGrid.filter((v,i) => !duelState.given[i] && v !== 0).length;
    const total = duelState.given.filter(v => !v).length;
    duelState.myProgress = Math.round((filled / total) * 100);
    updateDuelBars();
    pushDuelProgress();
    if (duelState.userGrid.every((v,i) => v === duelState.solution[i])) {
      finishDuel(true);
    }
  } else {
    duelState.userGrid[idx] = -1; // hatalı işaretle ama kilitleme
    cells[idx].innerHTML = `<span class="cell-num" style="color:var(--danger);">${n}</span>`;
    cells[idx].classList.add('has-error');
    duelState.errors++;
    updateDuelErrorDots();
    if (duelState.errors >= duelState.maxErrors) finishDuel(false, 'error');
  }
}

function clearDuelCell() {
  const idx = duelState.selectedCell;
  if (idx === -1 || duelState.given[idx] || duelState.completed) return;
  // Zaten doğru girildiyse silme
  if (duelState.userGrid[idx] === duelState.solution[idx]) return;
  const cells = document.getElementById('duelSudokuGrid').children;
  duelState.userGrid[idx] = 0;
  cells[idx].innerHTML = '';
  cells[idx].classList.remove('has-error');
}

function updateDuelErrorDots() {
  const el = document.getElementById('duelErrorDots');
  const max = duelState.maxErrors;
  const err = duelState.errors;
  el.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${i < err ? '#ef4444' : 'rgba(255,255,255,0.12)'};transition:background 0.3s;`;
    el.appendChild(dot);
  }

  // Vignette (kırmızı kenar)
  const vig = document.getElementById('duelVignette');
  if (vig) {
    vig.style.opacity = '1';
    vig.style.border = '5px solid rgba(239,68,68,0.65)';
    setTimeout(() => { vig.style.opacity = '0'; vig.style.border = '0px solid rgba(239,68,68,0)'; }, 600);
  }

  // Toast
  const toast = document.getElementById('duelErrToast');
  if (toast) {
    const kalan = max - err;
    const msgs = {
      0: 'Son hata — oyun bitti!',
      1: 'Son 1 hakkın kaldı!',
      2: 'Yanlış! 2 hak kaldı'
    };
    toast.textContent = msgs[kalan] ?? `❌ Yanlış! ${kalan} hak kaldı`;
    toast.style.display = 'block';
    toast.style.animation = 'none';
    void toast.offsetWidth;
    toast.style.animation = 'errToastIn 0.2s ease';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.display = 'none'; }, 2000);
  }
}

function updateDuelBars() {
  const myPct = duelState.myProgress || 0;
  const oppPct = duelState.opponentProgress || 0;
  const total = myPct + oppPct;

  let greenWidth = 50;
  if (total > 0) {
    greenWidth = Math.round((myPct / total) * 100);
    greenWidth = Math.max(10, Math.min(90, greenWidth));
  }

  const myBar = document.getElementById('duelMyBar');
  if (myBar) myBar.style.width = greenWidth + '%';

  const line = document.getElementById('duelTugLine');
  if (line) line.style.left = greenWidth + '%';

  const myEl = document.getElementById('duelMyPct');
  const oppEl = document.getElementById('duelOpponentPct');
  if (myEl) myEl.textContent = myPct + '%';
  if (oppEl) oppEl.textContent = oppPct + '%';

  const progEl = document.getElementById('duelOpponentProgress');
  if (progEl) progEl.textContent = Math.round(oppPct * 0.81) + '/81 hücre';

  const n2 = document.getElementById('duelOpponentName2');
  if (n2) n2.textContent = duelState.opponentName || 'Rakip';
}

async function pushDuelProgress() {
  if (!sb || !duelState.duelId) return;
  await sb.from('duel_players').upsert({
    duel_id: duelState.duelId,
    user_id: currentUser.id,
    progress: duelState.myProgress,
    completed: duelState.completed,
    won: duelState.won || false,
    finish_time: duelState.completed ? duelState.timerSec : null,
    errors: duelState.errors,
  }, { onConflict: 'duel_id,user_id' });
}

// ─── BOT SİMÜLASYON ─────────────────────────────────────────────────────────
function startBotSimulation() {
  if (duelState.botSimInterval) clearInterval(duelState.botSimInterval);

  const { min, max } = duelState.botSpeed || { min: 8000, max: 15000 };
  // Toplam çözme süresi (ms) — biraz rastgele, insan gibi
  const totalTime = min + Math.random() * (max - min);
  const avgMs = totalTime / 81; // hücre başı ortalama

  let filled = 0;

  function scheduleNext() {
    if (duelState.completed || !duelState.isBot) return;
    if (filled >= 81) {
      // Bot tamamladı → oyuncu kaybetti
      setTimeout(() => {
        if (!duelState.completed) finishDuel(false, 'opponent_won');
      }, 600);
      return;
    }

    // İnsan benzeri değişken hız: ara sıra "düşünüyor"
    const thinking = Math.random() < 0.08; // %8 ihtimalle duraklama
    const delay = thinking
      ? avgMs * (2.5 + Math.random() * 2)   // uzun duraklama
      : avgMs * (0.25 + Math.random() * 1.5); // normal ritim

    duelState.botSimInterval = setTimeout(() => {
      if (duelState.completed || !duelState.isBot) return;
      filled++;
      const pct = Math.round((filled / 81) * 100);
      duelState.opponentProgress = pct;
      // Bar güncelle
      const cEl = document.getElementById('duelOpponentProgress');
      if (cEl) cEl.textContent = filled + '/81 hücre';
      updateDuelBars();
      scheduleNext();
    }, delay);
  }

  // Geri sayım (3 sn) bittikten sonra başlasın
  setTimeout(() => scheduleNext(), 3300);
}

function listenDuelProgress() {
  if (!duelState.duelId) return;
  if (duelState.pollInterval) clearInterval(duelState.pollInterval);
  
  duelState.pollInterval = setInterval(async () => {
    if (duelState.completed || !duelState.duelId) return;
    try {
      const token = await getToken();
      const res = await fetch(
        SUPABASE_URL + '/rest/v1/duel_players?duel_id=eq.' + duelState.duelId + '&select=progress,completed,won,user_id',
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token } }
      );
      const data = await res.json();
      const opp = data.find(r => r.user_id !== currentUser.id);
      if (!opp) return;
      
      duelState.opponentProgress = opp.progress || 0;
      updateDuelBars();
      
      if (opp.completed) {
        clearInterval(duelState.pollInterval);
        if (opp.won) {
          if (!duelState.completed) finishDuel(false, 'opponent_won');
        } else {
          if (!duelState.completed) finishDuel(true, 'opponent_lost');
        }
      }
    } catch(e) { console.error('Poll hatası:', e); }
  }, 2000);
}

function startDuelCountdown() {
  const cd = document.getElementById('duelCountdown');
  const num = document.getElementById('duelCountdownNum');
  cd.style.display = 'flex';
  let count = 3;
  num.textContent = count;
  const interval = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(interval);
      cd.style.display = 'none';
      startDuelTimer();
    } else {
      num.textContent = count;
    }
  }, 1000);
}

function startDuelTimer() {
  duelState.timerSec = 0;
  duelState.timerInterval = setInterval(() => {
    duelState.timerSec++;
    document.getElementById('duelTimer').textContent = formatTime(duelState.timerSec);
  }, 1000);
}

async function finishDuel(won, reason) {
  if (duelState.completed) return;
  duelState.completed = true;
duelState.won = won;
clearInterval(duelState.timerInterval);
await pushDuelProgress();
// Rakibin alması için 1 saniye bekle, sonra kanalı kapat
setTimeout(() => {
  if (duelState.realtimeChannel) {
    try { sb.removeChannel(duelState.realtimeChannel); } catch(e) {}
    duelState.realtimeChannel = null;
  }
}, 1000);

 // ELO güncelle — dinamik puan sistemi
  let eloChange;
  if (won) {
    // Kazanma: süreye göre 18-25 arası
    // 0-120sn → 25, 120-300sn → 25'ten 18'e iner, 300sn+ → 18
    const t = duelState.timerSec || 0;
    if (t <= 120) {
      eloChange = 25;
    } else if (t >= 300) {
      eloChange = 18;
    } else {
      // 120-300 arası smooth düşüş
      eloChange = Math.round(25 - ((t - 120) / 180) * 7);
    }
  } else {
    // Kaybetme: hata sayısına göre 8-15 arası
    // 0 hata → -8, 3 hata → -15
    const maxErr = duelState.maxErrors || 3;
    const errRatio = Math.min(duelState.errors / maxErr, 1);
    eloChange = -Math.round(8 + errRatio * 7);
  }
  const newElo = Math.max(0, duelState.myElo + eloChange);

  await sb.from('league_stats').upsert({
    user_id: currentUser.id,
    elo: newElo,
    wins: duelState.wins + (won ? 1 : 0),
    losses: duelState.losses + (won ? 0 : 1),
  }, { onConflict: 'user_id' });

  duelState.myElo = newElo;
  if (won) duelState.wins++; else duelState.losses++;

  // Düello bitişini kaydet
  await sb.from('duels').update({ status: 'finished', winner_id: won ? currentUser.id : duelState.opponentId, finished_at: new Date().toISOString() }).eq('id', duelState.duelId);

  // ELO değişimini duel_players'a kaydet
  await sb.from('duel_players').upsert({
    duel_id: duelState.duelId,
    user_id: currentUser.id,
    elo_change: eloChange,
  }, { onConflict: 'duel_id,user_id' });

  // Sonuç modalı
  setTimeout(() => showDuelResult(won, eloChange, newElo), 500);
}

function showDuelResult(won, eloChange, newElo) {
  document.getElementById('duelResultIcon').textContent = won ? '🏆' : '😔';
  document.getElementById('duelResultTitle').textContent = won ? 'Kazandın!' : 'Kaybettin';
  document.getElementById('duelResultMsg').textContent = won ? 'Tebrikler! Rakibini geçtin.' : 'Bir dahaki sefere!';
  document.getElementById('duelResultEloChange').textContent = (eloChange > 0 ? '+' : '') + eloChange;
  document.getElementById('duelResultEloChange').style.color = eloChange > 0 ? '#22c55e' : '#ef4444';
  document.getElementById('duelResultNewElo').textContent = newElo;
  document.getElementById('duelResultTime').textContent = formatTime(duelState.timerSec || 0);
  showModal('duelResultModal');
}

function closeDuelResult() {
  hideModal('duelResultModal');
  const screen = document.getElementById('duelGameScreen');
  if (screen) screen.style.display = 'none';
  
  // State'i tamamen temizle
  duelState.completed = false;
  duelState.won = false;
  duelState.puzzle = null;
  duelState.solution = null;
  duelState.duelId = null;
  duelState.opponentId = null;
  duelState.opponentName = null;
  duelState.opponentProgress = 0;
  duelState.myProgress = 0;
  duelState.errors = 0;
  duelState.timerSec = 0;
  duelState.isBot = false;
  duelState.botSpeed = null;
  if (duelState.timerInterval) { clearInterval(duelState.timerInterval); duelState.timerInterval = null; }
  if (duelState.botSimInterval) { clearInterval(duelState.botSimInterval); duelState.botSimInterval = null; }
  if (duelState.realtimeChannel) { try { sb.removeChannel(duelState.realtimeChannel); } catch(e) {} duelState.realtimeChannel = null; }
  if (botFallbackTimer) { clearTimeout(botFallbackTimer); botFallbackTimer = null; }

  openDuelScreen();
}

function cancelDuel() {
  if (duelState.duelId) sb.from('duels').delete().eq('id', duelState.duelId);
  if (duelState.realtimeChannel) sb.removeChannel(duelState.realtimeChannel);
  hideModal('duelWaitModal');
  duelState.duelId = null;
}

function copyDuelCode() {
  navigator.clipboard?.writeText(duelState.code).then(() => showToast('✅ Kod kopyalandı!'));
}
