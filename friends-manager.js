// =================================================================
//  ARKADASLIK YONETICISI
// =================================================================

// ── ARKADAŞLIK SİSTEMİ ──

function friendAvatarHTML(username, avatar) {
  const name = username || 'U';
  if (avatar && /\p{Emoji}/u.test(avatar)) {
    return `<div class="friend-avatar" style="font-size:22px;background:var(--surface2);color:inherit;">${avatar}</div>`;
  }
  const colors = [
    ['#dbeafe','#3b82f6'], ['#d0e8fd','#2980b9'], ['#d0fde8','#27ae60'],
    ['#fdd0e8','#c0392b'], ['#e8d0fd','#8e44ad'], ['#fdfdd0','#b7950b'],
  ];
  const idx = name.charCodeAt(0) % colors.length;
  const [bg, fg] = colors[idx];
  const initials = name.slice(0,2).toUpperCase();
  return `<div class="friend-avatar" style="background:${bg};color:${fg};font-size:13px;">${initials}</div>`;
}

// Kullanıcı ara
async function searchUser(query) {
  if (!query || query.length < 2) return [];
  const { data, error } = await sb
    .from('profiles')
    .select('id, username, avatar')
    .ilike('username', `%${query}%`)
    .neq('id', currentUser.id)
    .limit(10);
  if (error) return [];
  return data;
}

// Arkadaşlık isteği gönder
async function sendFriendRequest(receiverId) {
  const { error } = await sb
    .from('friendships')
    .insert({ requester_id: currentUser.id, receiver_id: receiverId });
  
  if (error) {
    if (error.code === '23505') {
      showToast('⚠️ Zaten istek gönderilmiş!');
    } else {
      showToast('❌ Bir hata oluştu.');
    }
    return false;
  }
  showToast('✅ Arkadaşlık isteği gönderildi!');
  return true;
}

// Gelen istekleri getir
async function getFriendRequests() {
  const { data, error } = await sb
    .from('friendships')
    .select('id, requester_id')
    .eq('receiver_id', currentUser.id)
    .eq('status', 'pending');
  if (error) { console.log('istek hatası:', error); return []; }

  if (!data || data.length === 0) return [];

  // Profilleri ayrı çek
  const ids = data.map(r => r.requester_id);
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, username, avatar')
    .in('id', ids);

  return data.map(r => ({
    ...r,
    profiles: profiles?.find(p => p.id === r.requester_id)
  }));
}

// İsteği kabul et
async function acceptFriendRequest(friendshipId) {
  const { error } = await sb
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);
  if (error) { showToast('❌ Hata oluştu.'); return; }
  showToast('✅ Arkadaş eklendi!');
  renderFriendsScreen();
}

// İsteği reddet
async function rejectFriendRequest(friendshipId) {
  const { error } = await sb
    .from('friendships')
    .delete()
    .eq('id', friendshipId);
  if (error) { showToast('❌ Hata oluştu.'); return; }
  showToast('❌ İstek reddedildi.');
  renderFriendsScreen();
}

// Arkadaş listesini getir
async function getFriends() {
  const { data, error } = await sb
    .from('friendships')
    .select('id, requester_id, receiver_id')
    .or(`requester_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
    .eq('status', 'accepted');
  if (error) { console.log('arkadaş hatası:', error); return []; }
  if (!data || data.length === 0) return [];

  const friendIds = data.map(f =>
    f.requester_id === currentUser.id ? f.receiver_id : f.requester_id
  );

  const { data: profiles } = await sb
    .from('profiles')
    .select('id, username, avatar')
    .in('id', friendIds);

  return data.map(f => {
    const friendId = f.requester_id === currentUser.id ? f.receiver_id : f.requester_id;
    const profile = profiles?.find(p => p.id === friendId);
    return { friendshipId: f.id, ...profile };
  });
}

// Arkadaşlar ekranını aç
function showFriendsScreen() {
  const panel = document.getElementById('friendsPanel');
  panel.classList.add('active');
  panel.style.position = 'fixed';
  panel.style.inset = '0';
  panel.style.zIndex = '60';
  panel.style.background = 'var(--bg)';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.height = '100dvh';
  panel.style.overflowY = 'hidden';
  panel.style.animation = 'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1) forwards';
  renderFriendsScreen();
}

// Arkadaşlar ekranını kapat
function hideFriendsScreen() {
  const panel = document.getElementById('friendsPanel');
  panel.style.animation = 'slideOutRight 0.3s cubic-bezier(0.4,0,0.2,1) forwards';
  setTimeout(() => {
    panel.classList.remove('active');
    panel.style.display = 'none';
    panel.style.position = '';
    panel.style.inset = '';
    panel.style.zIndex = '';
  }, 280);
}


// ── ARKADAŞLAR EKRANI RENDER ──

async function renderFriendsScreen() {
  if (!currentUser) return;

  // Gelen istekler
  const requests = await getFriendRequests();
  const reqSection = document.getElementById('friendRequestsSection');
  const reqList = document.getElementById('friendRequestsList');

  if (requests.length > 0) {
    reqSection.style.display = 'block';
    reqList.innerHTML = requests.map(r => {
      const username = r.profiles?.username || 'Kullanıcı';
      return `
         <div class="request-card">
          ${friendAvatarHTML(username, r.profiles?.avatar)}
          <div class="friend-info">
            <div class="friend-name">${username}</div>
            <div class="friend-sub">Arkadaşlık isteği gönderdi</div>
          </div>
          <div class="request-btns">
            <button class="btn-accept" onclick="acceptFriendRequest('${r.id}')">Kabul</button>
            <button class="btn-reject" onclick="rejectFriendRequest('${r.id}')">Reddet</button>
          </div>
        </div>`;
    }).join('');
  } else {
    reqSection.style.display = 'none';
  }

  // Arkadaş listesi
  const friends = await getFriends();
  const friendsList = document.getElementById('friendsList');

  if (friends.length === 0) {
    friendsList.innerHTML = `
      <div class="friends-empty">
        <div class="friends-empty-icon">👥</div>
        <div class="friends-empty-text">Henüz arkadaşın yok.<br>+ Ekle butonuyla başla!</div>
      </div>`;
    return;
  }

  // Arkadaşların bugünkü skorlarını çek
  const today = new Date().toISOString().slice(0,10);
  const friendIds = friends.map(f => f.id);

  const { data: scores } = await sb
    .from('daily_scores')
    .select('user_id, time_seconds, difficulty')
    .in('user_id', friendIds)
    .eq('date', today);

  friendsList.innerHTML = friends.map(f => {
    const score = scores?.find(s => s.user_id === f.id);
    const timeText = score
      ? `${formatTime(score.time_seconds)}`
      : '—';
    const subText = score
      ? `Bugün: ${score.difficulty}`
      : 'Bugün henüz oynamadı';

    return `
      <div class="friend-card" onclick="showFriendProfile('${f.friendshipId}', '${f.id}', '${f.username}', '${f.avatar || ''}')">
        ${friendAvatarHTML(f.username, f.avatar)}
        <div class="friend-info">
          <div class="friend-name">${f.username || 'Kullanıcı'}</div>
          <div class="friend-sub">${subText}</div>
        </div>
        <div class="friend-time">${timeText}</div>
      </div>`;
  }).join('');
}

// Arama sheet'i aç
function showAddFriendSheet() {
  document.getElementById('friendSearchInput').value = '';
  document.getElementById('friendSearchResults').innerHTML = '';
  showModal('addFriendModal');
}

// Arama input handler
let searchTimeout;
async function onFriendSearch(query) {
  clearTimeout(searchTimeout);
  const resultsDiv = document.getElementById('friendSearchResults');

  if (query.length < 2) {
    resultsDiv.innerHTML = '';
    return;
  }

  resultsDiv.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px;">Aranıyor...</div>';

  searchTimeout = setTimeout(async () => {
    const results = await searchUser(query);

    if (results.length === 0) {
      resultsDiv.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px;">Kullanıcı bulunamadı</div>';
      return;
    }

    resultsDiv.innerHTML = results.map(u => {
      return `
        <div class="friend-search-result">
          ${friendAvatarHTML(u.username, u.avatar)}
          <div class="friend-info">
            <div class="friend-name">${u.username}</div>
          </div>
          <button class="send-req-btn" id="reqBtn_${u.id}" onclick="handleSendRequest('${u.id}', '${u.username}')">
            İstek Gönder
          </button>
        </div>`;
    }).join('');
  }, 400);
}

async function handleSendRequest(userId, username) {
  const btn = document.getElementById(`reqBtn_${userId}`);
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  const success = await sendFriendRequest(userId);

  if (btn) {
    if (success) {
      btn.textContent = '✓ Gönderildi';
      btn.classList.add('sent');
    } else {
      btn.disabled = false;
      btn.textContent = 'İstek Gönder';
    }
  }
}

// Arkadaş profil modalını aç
let activeFriendshipId = null;

async function showFriendProfile(friendshipId, userId, username, avatar) {
  activeFriendshipId = friendshipId;

  const avatarEl = document.getElementById('fpAvatar');
  const hasEmoji = avatar && /\p{Emoji}/u.test(avatar);
  avatarEl.textContent = hasEmoji ? avatar : (username || 'U').slice(0,2).toUpperCase();
  avatarEl.style.fontSize = hasEmoji ? '38px' : '22px';
  document.getElementById('fpName').textContent = username || 'Kullanıcı';

  document.getElementById('fpElo').textContent = '…';
  document.getElementById('fpTotal').textContent = '…';
  document.getElementById('fpBest').textContent = '…';
  document.getElementById('fpLeague').textContent = '…';
  showModal('friendProfileModal');

  // ELO + liga
  const { data: league } = await sb
    .from('league_stats')
    .select('elo')
    .eq('user_id', userId)
    .single();

  const elo = league?.elo ?? 0;
  document.getElementById('fpElo').textContent = elo;
  document.getElementById('fpLeague').textContent = getLeagueIcon(elo);

  // İstatistikler — daily_scores tablosu
  const { data: scores } = await sb
    .from('daily_scores')
    .select('time_seconds')
    .eq('user_id', userId);

  const total = scores?.length ?? 0;
  const best = scores?.length
    ? Math.min(...scores.map(s => s.time_seconds))
    : null;

  document.getElementById('fpTotal').textContent = total;
  document.getElementById('fpBest').textContent = best ? formatTime(best) : '—';
}

function getLeagueIcon(elo) {
  if (elo >= 2000) return '👑';
  if (elo >= 1500) return '💎';
  if (elo >= 1000) return '🥇';
  if (elo >= 600)  return '🥈';
  return '🥉';
}

async function confirmRemoveFriend() {
  if (!activeFriendshipId) return;
  const sure = confirm('Bu kişiyi arkadaş listenizden çıkarmak istiyor musunuz?');
  if (!sure) return;

  const { error } = await sb
    .from('friendships')
    .delete()
    .eq('id', activeFriendshipId);

  if (error) { showToast('❌ Hata oluştu.'); return; }
  hideModal('friendProfileModal');
  showToast('✅ Arkadaşlıktan çıkarıldı.');
  activeFriendshipId = null;
  renderFriendsScreen();
}