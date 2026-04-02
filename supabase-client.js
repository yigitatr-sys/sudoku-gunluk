// =================================================================
//  SUPABASE ISTEMCISI - Auth, Profil, Skor
// =================================================================

// ═══════════════════════════════════════════════
//  SUPABASE BAĞLANTISI
// ═══════════════════════════════════════════════
const SUPABASE_URL  = 'https://ywcreaairumuxkydbxnt.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3Y3JlYWFpcnVtdXhreWRieG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDc2MTAsImV4cCI6MjA4ODU4MzYxMH0.UqTjURHwDH8RC_lsudEp7yIwWPJZUhs0_sFXAgkBNlc';

// Offline stub: tüm metodları boş promise ile döndürür, rpc dahil
const _sbOfflineStub = {
  from: () => {
    const chain = { select: () => chain, eq: () => chain, in: () => chain, gte: () => chain, lte: () => chain, order: () => chain, limit: () => chain, single: () => Promise.resolve({}), insert: () => Promise.resolve({}), update: () => Promise.resolve({}), upsert: () => Promise.resolve({}) };
    return chain;
  },
  rpc: () => Promise.resolve({ data: null, error: { message: 'Çevrimdışı' } }),
  auth: {
    getSession:        () => Promise.resolve({ data: { session: null } }),
    onAuthStateChange: () => {},
    signInWithOAuth:   () => Promise.resolve({}),
    signOut:           () => Promise.resolve({}),
    refreshSession:    () => Promise.resolve({ data: { session: null } }),
    signInWithPassword:() => Promise.resolve({ data: null, error: { message: 'Çevrimdışı' } }),
    signUp:            () => Promise.resolve({ data: null, error: { message: 'Çevrimdışı' } }),
  }
};

const sb = window._supabaseOffline
  ? _sbOfflineStub
  : supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function getToken() {
  try {
    // Hafızadaki (cache) değil, o anki aktif Supabase oturumunu zorla getirir
    const { data: { session }, error } = await sb.auth.getSession();
    if (error || !session) return null;
    return session.access_token;
  } catch(e) { 
    return null; 
  }
}

// Oturum açık mı?
let currentUser = null;

let _authHandled = false;

async function handleUserSession(user) {
  currentUser = user;
  const { data: profile } = await sb.from('profiles').select('username').eq('id', user.id).single();
  if (!profile) {
    document.getElementById('registerStepGoogle').style.display = 'none';
    document.getElementById('registerStepUsername').style.display = 'block';
    showModal('registerModal');
  } else {
    // Tam profil yükle (tüm senkronize veriler dahil)
    await loadProfile();
    updateHomeScreen();
    updateProfilePanel();
    // Lokal veriyi cloud'a da gönder (birleştirme)
    syncProfileToCloud();
    showToast(`✅ Hoş geldin, ${profile.username}!`);
  }
}

async function initSupabase() {
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session && !_authHandled) {
      _authHandled = true;
      await handleUserSession(session.user);
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      appState.username = '';
      appState.supabaseId = null;
      _authHandled = false;
      saveState();
      updateHomeScreen();
      updateProfilePanel();
    }
  });

  let { data: { session } } = await sb.auth.getSession();
if (session) {
  const { data: refreshed } = await sb.auth.refreshSession();
  if (refreshed?.session) session = refreshed.session;
}
  if (session) {
    _authHandled = true;
    currentUser = session.user;
    await loadProfile();
    updateHomeScreen();
    updateProfilePanel();
    // Mevcut veriyi cloud'a yükle (ilk sync)
    syncProfileToCloud();
  }
  // Her durumda sıralamayı yükle
  renderLbPreview(); renderDuelPreview();
}

// Google ile giriş
async function signInWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href.split('#')[0] }
  });
  if (error) showToast('❌ Giriş hatası: ' + error.message);
}

// Çıkış
async function signOut() {
  await sb.auth.signOut();
  showToast('👋 Çıkış yapıldı');
}

// Profil yükle
async function loadProfile() {
  if (!currentUser) return;
  const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  if (data) {
    appState.username   = data.username;
    appState.avatar     = data.avatar || '🧩';
    appState.avatarUrl  = data.avatar_url || null;  // ← BU SATIRI EKLE
    appState.supabaseId = currentUser.id;

    // Supabase'deki streak cihazdan büyükse güncelle
    if ((data.streak || 0) > (appState.streak || 0)) {
      appState.streak = data.streak;
    }
    if (data.last_played) appState.lastPlayedDate = data.last_played;

    // Açılan seviyeleri birleştir
    if (data.unlocked_diffs && data.unlocked_diffs.length > 0) {
      const local = appState.unlockedDiffs || [];
      appState.unlockedDiffs = [...new Set([...local, ...data.unlocked_diffs])];
    }

    // Rozetleri birleştir
    if (data.earned_badges && data.earned_badges.length > 0) {
      const local = appState.earnedBadges || [];
      appState.earnedBadges = [...new Set([...local, ...data.earned_badges])];
    }

    // Yarıda bırakılan oyunlar — Supabase öncelikli
    if (data.saved_games && Object.keys(data.saved_games).length > 0) {
      appState.savedGames = { ...appState.savedGames, ...data.saved_games };
    }

    saveState();
  }
}

async function syncProfileToCloud() {
  if (!currentUser || !sb) return;
  const { error } = await sb.from('profiles').update({
    streak:         appState.streak || 0,
    last_played:    appState.lastPlayedDate || null,
    unlocked_diffs: appState.unlockedDiffs || [],
    earned_badges:  appState.earnedBadges || [],
    saved_games:    appState.savedGames || {},
  }).eq('id', currentUser.id);
  if (error) console.error('Profil sync hatası:', error);
}

// Profil oluştur (ilk kayıt)
async function createProfile(username) {
  if (!currentUser) return false;
  const { error } = await sb.from('profiles').insert({
    id:       currentUser.id,
    username: username,
    avatar:   appState.avatar || '🧩',
  });
  if (error) {
    if (error.code === '23505') { showToast('❌ Bu kullanıcı adı alınmış!'); return false; }
    showToast('❌ Hata: ' + error.message); return false;
  }
  appState.username   = username;
  appState.supabaseId = currentUser.id;
  saveState();
  return true;
}

// Günlük skoru kaydet
async function saveDailyScore(timeSec, errors, hintsUsed) {
  if (!currentUser) { console.warn('Skor kaydedilmedi: kullanıcı yok'); return; }
  const score = Math.round((10000 / timeSec) * (errors === 0 ? 1.2 : 1) * (hintsUsed === 0 ? 1.1 : 1));
  const today = todayStr();
  console.log('Skor kaydediliyor:', { user_id: currentUser.id, date: today, time_seconds: timeSec, score });
  const { error } = await sb.from('daily_scores').upsert({
    user_id:      currentUser.id,
    date:         today,
    time_seconds: timeSec,
    errors:       errors,
    hints_used:   hintsUsed,
    score:        score,
  }, { onConflict: 'user_id,date' });
  if (error) {
    console.error('Skor kaydedilemedi:', error);
    showToast('❌ Skor kaydedilemedi: ' + error.message);
  } else {
    console.log('Skor kaydedildi!');
  }
}

window.saveGameSession = async function(mode) {
  if (!currentUser) return;
  try {
    await sb.from('game_sessions').insert({
      user_id: currentUser.id,
      mode: mode,
      date: todayStr(),
    });
  } catch(e) {}
}

// Günlük sıralamayı çek
async function fetchDailyLeaderboard(date) {
  const { data, error } = await sb
    .from('daily_scores')
    .select('score, time_seconds, errors, profiles(username, avatar)')
    .eq('date', date)
    .order('score', { ascending: false })
    .limit(50);
  if (error) { console.error(error); return []; }
  return data;
}
