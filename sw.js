const CACHE_NAME = 'sudoku-v10'; // Versiyonu 10 yaptık ki herkesinki güncellensin
const STATIC_ASSETS = [
  './',
  './index.html',
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

  // 1. Sadece HTTP/HTTPS'e izin ver
  if (!url.protocol.startsWith('http')) return;

  // 2. Sadece GET isteklerini tut (Supabase'in POST/OPTIONS istekleri direkt geçer)
  if (request.method !== 'GET') return;

  // 3. Sadece senin domaini cache'le (Supabase url'si otomatik olarak dışlanır)
  if (url.origin !== location.origin) return;

  // 4. Strateji: Network First (Önce İnternet, yoksa Cache)
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        return await caches.match(request);
      })
  );
});