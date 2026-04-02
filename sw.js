const CACHE_NAME = 'sudoku-v13'; // Bottom nav + cache-first strateji
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './network-manager.js',
  './utils.js',
  './supabase-client.js',
  './sudoku-engine.js',
  './ads-manager.js',
  './friends-manager.js',
  './leaderboard-manager.js',
  './profile-manager.js',
  './tournament-manager.js',
  './game-manager.js',
  './journey-manager.js',
  './duel-manager.js',
  './ui-manager.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Beklemeden hemen yeni SW'ye geç
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        // Eski bozuk cache'leri acımadan sil
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // Kontrolü anında ele al
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Sadece HTTP/HTTPS
  if (!url.protocol.startsWith('http')) return;

  // 2. Sadece GET (Supabase POST/OPTIONS direkt geçer)
  if (request.method !== 'GET') return;

  // 3. Cross-origin istekler (Supabase, CDN, Fonts) doğrudan ağa gider
  if (url.origin !== location.origin) return;

  // 4. Statik dosyalar (JS, CSS, HTML, resim, manifest) → Cache First
  const isStatic = /\.(js|css|html|png|jpg|svg|webp|json|woff2?)(\?.*)?$/.test(url.pathname)
    || url.pathname === '/' || url.pathname === '/index.html';

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          // Arka planda güncelle (Stale-While-Revalidate)
          fetch(request).then(res => {
            if (res && res.ok) {
              caches.open(CACHE_NAME).then(c => c.put(request, res));
            }
          }).catch(() => {});
          return cached;
        }
        // Cache'de yok → ağdan çek ve kaydet
        return fetch(request).then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        }).catch(() => caches.match(request));
      })
    );
  } else {
    // Dinamik / diğer same-origin istekler → Network First
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
  }
});