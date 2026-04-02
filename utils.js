// =================================================================
//  YARDIMCI FONKSIYONLAR
// =================================================================


function saveState() {
  try { localStorage.setItem('sudoku_v3', JSON.stringify(appState)); } catch(e) {}
}

function loadState() {
  try {
    const s = localStorage.getItem('sudoku_v3');
    if (s) appState = { ...appState, ...JSON.parse(s) };
  } catch(e) {}
}

// ═══════════════════════════════════════════════
//  MODAL & TOAST
// ═══════════════════════════════════════════════

function showModal(id) { document.getElementById(id).classList.add('show'); }
function hideModal(id) { document.getElementById(id).classList.remove('show'); }
function showRegisterModal() {
  document.getElementById('usernameInput').value = '';
  document.getElementById('usernameError').style.display = 'none';
  showModal('registerModal');
}

let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ═══════════════════════════════════════════════
//  DATE / TIME UTILS
// ═══════════════════════════════════════════════

function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function dateStr(daysAgo) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString().split('T')[0]; }
function formatDate(s) { return new Date(s + 'T00:00:00').toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' }); }
function formatDateShort(s) { return new Date(s + 'T00:00:00').toLocaleDateString('tr-TR', { day:'numeric', month:'short' }); }
function formatTime(sec) { return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`; }
function hashCode(s) { let h = 0; for (const c of s) h = ((h << 5) - h + c.charCodeAt(0)) | 0; return h; }
function dailySeed() { return Math.abs(hashCode(todayStr())); }

  // Sayfa her açıldığında sürüm kontrolü yap ve eski önbelleği temizle
(function() {
    const currentAppVersion = "1.2"; // Güncelleme yaptıkça bu sayıyı artırabilirsin
    const savedVersion = localStorage.getItem('sudoku_app_version');
    
    if (savedVersion !== currentAppVersion) {
        // Eski sürüm varsa veya hiç yoksa her şeyi temizle
        localStorage.clear(); 
        localStorage.setItem('sudoku_app_version', currentAppVersion);
        // Tarayıcıyı taze kodu çekmesi için zorla yenile
        window.location.reload(true);
    }
})();