// Bump this version every time index.html changes (optional now, but keeps old caches tidy).
const CACHE = 'hayaren2-v4';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Only clean up this app's own old caches — never touch the original Hayeren deck's.
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('hayaren2-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts etc. go straight to the network

  // Network first: always try GitHub for the latest version, and save it for offline use.
  // Only fall back to the saved copy when there's no connection.
  e.respondWith(
    fetch(req.mode === 'navigate' ? url.href : req, { cache: 'no-store' })
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? './index.html' : req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
