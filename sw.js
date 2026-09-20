const SHELL_CACHE = 'inv-v2';
const RUNTIME_CACHE = 'inv-runtime-v2';

const SHELL_ASSETS = ['./', './index.html', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const CDN_PRECACHE = [
  'https://cdn.jsdelivr.net/npm/vue@3/dist/vue.esm-browser.js',
  'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL_CACHE);
    await Promise.all(SHELL_ASSETS.map(u => fetch(u, { cache: 'reload' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    await Promise.all(CDN_PRECACHE.map(u => fetch(u, { mode: 'cors', cache: 'reload' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(SHELL_CACHE);
        c.put('./index.html', fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        const c = await caches.open(SHELL_CACHE);
        return (await c.match('./index.html')) || (await c.match('./')) || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(SHELL_CACHE);
      const cached = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()).catch(() => {}); return r; }).catch(() => null);
      return cached || (await net) || Response.error();
    })());
    return;
  }

  e.respondWith((async () => {
    const c = await caches.open(RUNTIME_CACHE);
    const cached = await c.match(req);
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()).catch(() => {}); return r; }).catch(() => null);
    if (cached) { e.waitUntil(net); return cached; }
    return (await net) || new Response('', { status: 504 });
  })());
});
