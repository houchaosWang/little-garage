// 每次发布内容更新必须改VERSION（如garage-v3），否则iPad拿不到新资源
const VERSION = 'garage-v4';
const ASSETS = [
  '.', 'index.html', 'styles.css', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-512.png',
  'audio/silence.wav',
  'js/main.js', 'js/parent.js', 'js/garage.js', 'js/game-tires.js', 'js/vehicles.js', 'js/guide.js',
  'js/audio.js', 'js/store.js', 'js/difficulty.js', 'js/taskgen.js', 'js/rng.js',
].concat([
  'welcome', 'intro-race', 'intro-dump', 'task-tires-prefix', 'task-tires-suffix',
  'praise-1', 'praise-2', 'goodbye-1', 'closing-1', 'closing-2', 'sleeping-1',
  'demo-hint', 'idle-tires',
  ...Array.from({ length: 10 }, (_, i) => `num-${i + 1}`),
].map(n => `audio/${n}.mp3`));

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && !res.redirected && new URL(e.request.url).origin === self.location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => (e.request.mode === 'navigate' ? caches.match('.') : Promise.reject(new Error('offline'))))),
  );
});
