// 每次发布内容更新必须改VERSION（如garage-v8），否则iPad拿不到新资源
const VERSION = 'garage-v8';
const HANZI = ['一', '二', '三', '人', '大', '小', '上', '下', '口', '中',
  '山', '水', '火', '土', '木', '日', '月', '手', '车', '门',
  '天', '地', '你', '我', '他', '白', '云', '雨', '风', '花',
  '草', '虫', '鸟', '牛', '羊', '马', '鱼', '米', '田', '电'];
const AUDIO_NAMES = [
  'welcome', 'intro-race', 'intro-dump', 'task-tires-prefix', 'task-tires-suffix',
  'praise-1', 'praise-2', 'goodbye-1', 'closing-1', 'closing-2', 'sleeping-1',
  'demo-hint', 'idle-tires',
  'task-fuel-prefix', 'task-fuel-suffix', 'fuel-over', 'fuel-more', 'idle-fuel',
  'task-lights', 'lights-wrong', 'idle-lights', 'task-wash', 'idle-wash',
  'task-math', 'math-jia', 'math-jian', 'math-dengyu', 'math-dengyu-ji',
  'math-yiqi', 'math-wrong', 'math-duila', 'math-zailai', 'math-nazou', 'idle-math',
  'task-hanzi-prefix', 'task-hanzi-suffix', 'hanzi-wrong', 'idle-hanzi',
  'task-trace-prefix', 'task-trace-suffix', 'trace-hint', 'trace-good', 'idle-trace',
  ...Array.from({ length: 20 }, (_, i) => `num-${i + 1}`),
  ...Array.from({ length: 40 }, (_, i) => `char-${i + 1}`),
];
const ASSETS = [
  '.', 'index.html', 'styles.css', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-512.png',
  'js/main.js', 'js/garage.js', 'js/game-tires.js', 'js/game-fuel.js', 'js/game-lights.js',
  'js/game-wash.js', 'js/game-math.js', 'js/game-hanzi.js', 'js/game-trace.js',
  'js/vehicles.js', 'js/guide.js', 'js/audio.js', 'js/store.js', 'js/difficulty.js',
  'js/taskgen.js', 'js/rng.js', 'js/parent.js', 'js/mastery.js',
  'vendor/hanzi-writer.min.js',
  ...HANZI.map(c => `vendor/hanzi-data/${c}.json`),
  'audio/silence.wav',
  ...AUDIO_NAMES.map(n => `audio/${n}.mp3`),
];

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
