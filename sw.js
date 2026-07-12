// Service Worker v0.40.1
// 绛栫暐锛欻TML/JS/CSS Network First锛堢‘淇滷5鍒锋柊鏃跺己鍒惰幏鍙栨渶鏂扮増鏈級锛屾暟鎹枃浠?Cache First

const CACHE_VERSION = 'kittens-v0.40.1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

// 闇€瑕侀缂撳瓨鐨勯潤鎬佽祫婧?const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './main.js',
  './app.js',
  './assets/donate_qr.jpg',
];

// 鏁版嵁鏂囦欢锛坧okemon data锛夊崟鐙紦瀛橈紝鐗堟湰鏇存柊鏃朵竴骞舵竻闄?const DATA_URLS = [
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

  // 闈炲悓婧愯姹傜洿鎺ヨ蛋缃戠粶
  if (url.origin !== self.location.origin) return;

  // API 璇锋眰锛歂etwork First
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

  // pokemon data 鏂囦欢锛欳ache First锛堟暟鎹噺澶э紝鐗堟湰鍙峰彉鍖栨椂鑷姩miss锛?  if (url.pathname.startsWith('/data/')) {
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

  // HTML / JS / CSS锛歂etwork First锛岀綉缁滃け璐ユ椂鍥為€€缂撳瓨
  // 杩欐牱鏅€?F5 鍒锋柊鏃舵€绘槸灏濊瘯鑾峰彇鏈€鏂扮増鏈紝鍙湁绂荤嚎鏃舵墠鐢ㄧ紦瀛?  event.respondWith(
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
