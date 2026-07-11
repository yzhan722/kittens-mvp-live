// Service Worker v0.39.4
// 策略：HTML/JS/CSS Network First（确保F5刷新时强制获取最新版本），数据文件 Cache First

const CACHE_VERSION = 'kittens-v0.39.4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

// 需要预缓存的静态资源
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './main.js',
  './app.js',
  './assets/donate_qr.jpg',
];

// 数据文件（pokemon data）单独缓存，版本更新时一并清除
const DATA_URLS = [
  './data/pokemon_zh.js',
  './data/pokemon_tier.js',
  './data/pokemon_catch_rate.js',
  './data/pokemon_evo.js',
  './data/pokemon_evo_req.js',
  './data/pokemon_types.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {})),
      caches.open(DATA_CACHE).then((cache) => cache.addAll(DATA_URLS).catch(() => {})),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 非同源请求直接走网络
  if (url.origin !== self.location.origin) return;

  // API 请求：Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ ok: false, error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // pokemon data 文件：Cache First（数据量大，版本号变化时自动miss）
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((res) => {
            if (res.ok && request.method === 'GET') cache.put(request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // HTML / JS / CSS：Network First，网络失败时回退缓存
  // 这样普通 F5 刷新时总是尝试获取最新版本，只有离线时才用缓存
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && request.method === 'GET') {
          const resClone = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, resClone));
        }
        return res;
      })
      .catch(() =>
        caches.open(STATIC_CACHE).then((cache) =>
          cache.match(request).then((cached) => cached || new Response('Offline', { status: 503 }))
        )
      )
  );
});
