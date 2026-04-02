if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.update(); // Her açılışta zorla güncelle
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }).catch(err => console.warn('[PWA] SW hatası:', err));
}

window.addEventListener('offline', () => {
  if (typeof showToast === 'function') showToast('📵 İnternet yok — çevrimdışı moddasın');
});
window.addEventListener('online', () => {
  if (typeof showToast === 'function') showToast('✅ İnternet bağlandı');
});
