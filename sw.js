// Bump this whenever any file changes, so phones swap to the new version in one go.
const CACHE = 'penny-v2';
const SHELL = [
  './', './index.html', './style.css', './core.js', './app.js', './manifest.webmanifest',
  './font-fraunces.woff2', './font-instrument-sans.woff2',
  './icon-180.png', './icon-192.png', './icon-512.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's HTTP cache, so a new version never mixes with old files.
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('penny-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// App files come straight from the cache (instant, works offline). Updates arrive through a new CACHE version.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      return (await cache.match('./')) || (await cache.match('./index.html')) || fetch(req);
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (err) {
      return Response.error();
    }
  })());
});
