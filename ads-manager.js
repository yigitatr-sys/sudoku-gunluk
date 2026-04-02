let _rewardTarget = null; // 'error' veya 'hint'

function showRewardedAdModal(target) {
  _rewardTarget = target;
  const title = document.getElementById('rewardAdTitle');
  const sub   = document.getElementById('rewardAdSub');
  if (target === 'error') {
    title.textContent = '+1 Hata Hakkı Kazan';
    sub.textContent   = 'Kısa bir video izleyerek oyuna devam edebilirsin.';
  } else {
    title.textContent = '+1 İpucu Hakkı Kazan';
    sub.textContent   = 'Kısa bir video izleyerek ekstra ipucu kazanabilirsin.';
  }
  // Reset ad UI
  document.getElementById('adSimContainer').style.display = 'none';
  document.getElementById('watchAdBtn').style.display     = 'flex';
  document.getElementById('adProgressBar').style.width   = '0%';
  showModal('rewardedAdModal');
}

function startWatchingAd() {
  document.getElementById('watchAdBtn').style.display   = 'none';
  document.getElementById('adSimContainer').style.display = 'block';
  const bar      = document.getElementById('adProgressBar');
  const countdown = document.getElementById('adCountdown');
  const duration = 5; // saniye (gerçekte 15-30 olur)
  let elapsed = 0;
  const interval = setInterval(() => {
    elapsed += 0.1;
    const pct = Math.min((elapsed / duration) * 100, 100);
    bar.style.width = pct + '%';
    const remaining = Math.ceil(duration - elapsed);
    countdown.textContent = remaining > 0 ? remaining + ' saniye' : 'Tamamlandı!';
    if (elapsed >= duration) {
      clearInterval(interval);
      setTimeout(() => grantReward(), 300);
    }
  }, 100);
}

function grantReward() {
  hideModal('rewardedAdModal');
  if (_rewardTarget === 'error') {
    G.extraErrorUsed = true;
    G.errors = 2;
    G.completed = false;
    G.gameLost = false;
    hideModal('gameOverModal');
    if (G.timerInterval === null) startTimer();
    renderGrid();
    updateStats();
    showToast('✅ +1 hak kazandın! Devam et!');
  } else if (_rewardTarget === 'hint') {
    G.extraHintUsed = true;
    G.hintsLeft++;
    updateStats();
    showToast('💡 +1 ipucu kazandın!');
    // Otomatik ipucu kullan
    useHint();
  }
}
