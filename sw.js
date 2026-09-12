// 每次发布内容更新必须改VERSION（如garage-v10），否则iPad拿不到新资源
const VERSION = 'garage-v14';
const HANZI = ['一', '二', '三', '人', '大', '小', '上', '下', '口', '中',
  '山', '水', '火', '土', '木', '日', '月', '手', '车', '门',
  '天', '地', '你', '我', '他', '白', '云', '雨', '风', '花',
  '草', '虫', '鸟', '牛', '羊', '马', '鱼', '米', '田', '电'];
// 车名拍拍：单音节 syl-拼音声调、整词 vn-*，与 js/taskgen.js 的 SYL_WORDS 一一对应（tests/syllable.test.mjs 会查）
const SYL_KEYS = ['jing3', 'che1', 'sai4', 'chan3', 'huo3', 'diao4', 'qi4', 'jiu4', 'hu4', 'xiao1', 'fang2', 'fan1', 'dou3',
  'wa1', 'jue2', 'ji1', 'jiao3', 'ban4', 'sa3', 'shui3', 'la1', 'gong1', 'jiao1', 'chu1', 'zu1', 'mo2', 'tuo1', 'gong4',
  'dian4', 'dong4', 'bing1', 'qi2', 'lin2', 'shuang1', 'ceng2', 'ba1', 'shi4', 'deng1', 'lun2', 'men2', 'chuang1', 'ding3', 'pai2'];
const VN_KEYS = ['jingche', 'saiche', 'chanche', 'huoche', 'diaoche', 'qiche', 'jiuhuche', 'xiaofangche', 'fandouche',
  'wajueji', 'jiaobanche', 'sashuiche', 'lajiche', 'gongjiaoche', 'chuzuche', 'motuoche', 'gonggongqiche',
  'diandongqiche', 'bingqilinche', 'shuangcengbashi', 'chedeng', 'chelun', 'chemen', 'chechuang', 'cheding', 'chepai'];
const AUDIO_NAMES = [
  'welcome', 'intro-race', 'intro-dump', 'task-tires-prefix', 'task-tires-suffix',
  'praise-1', 'praise-2', 'goodbye-1', 'closing-1', 'closing-2', 'sleeping-1',
  'demo-hint', 'idle-tires', 'tires-done-hint', 'idle-tires-count',
  'intro-police', 'intro-ambulance', 'intro-fire', 'intro-digger', 'intro-mixer', 'intro-loader',
  'hub-next', 'hub-mycar', 'hub-album', 'buddy-hello-1', 'buddy-hello-2',
  'garage-mine', 'paint-fun', 'wheel-cool', 'sticker-stick',
  'sticker-get-1', 'sticker-get-2', 'paint-get', 'wheel-get',
  'album-open', 'badge-get', 'friend-back-1', 'friend-back-2',
  'vip-ask', 'vip-accept-cheer', 'vip-decline-ok', 'vip-done', 'vip-drop',
  'task-shapes', 'idle-shapes', 'shapes-wrong',
  'task-compare-big', 'task-compare-small', 'task-compare-long', 'task-compare-short',
  'idle-compare', 'compare-wrong',
  'task-fuel-prefix', 'task-fuel-suffix', 'fuel-over', 'fuel-more', 'idle-fuel',
  'task-lights', 'lights-wrong', 'idle-lights', 'task-wash', 'idle-wash',
  'task-math', 'math-jia', 'math-jian', 'math-dengyu', 'math-dengyu-ji',
  'math-yiqi', 'math-wrong', 'math-duila', 'math-zailai', 'math-nazou', 'idle-math',
  'math-think', 'math-again', 'math-bucket-pre', 'math-xianyou', 'math-ge-jiezhe',
  'math-yigong', 'math-bigfirst', 'math-open', 'math-haisheng', 'math-couten',
  'task-hanzi-prefix', 'task-hanzi-suffix', 'hanzi-wrong', 'idle-hanzi',
  'task-trace-prefix', 'task-trace-suffix', 'trace-hint', 'trace-good', 'idle-trace',
  'task-sub-count', 'task-sub-sum', 'task-sub-ten', 'sub-eye', 'sub-idle', 'sub-again', 'sub-he', 'sub-shi', 'sub-couten',
  'task-pat-next', 'task-pat-mid', 'task-pat-same', 'task-pat-unit', 'pat-wrong', 'pat-idle', 'pat-good',
  'col-red', 'col-blue', 'col-yellow', 'col-green', 'shp-circle', 'shp-square', 'shp-triangle', 'shp-star',
  'task-nl-race', 'task-nl-predict', 'task-nl-est', 'task-nl-left', 'nl-where-pre', 'nl-where-post',
  'nl-spin', 'nl-tapcar', 'nl-guess', 'nl-right', 'nl-walk', 'nl-myturn', 'nl-win', 'nl-zhongjian',
  'nl-close', 'nl-idle-est', 'nl-idle-left',
  'task-story', 'st-have-pre', 'st-cars', 'st-liang', 'st-comein', 'st-q-total', 'st-leave', 'st-q-left',
  'st-total-pre', 'st-outside', 'st-q-hidden', 'st-some', 'st-now', 'st-q-came', 'st-red', 'st-blue',
  'st-q-more', 'st-bluemore', 'st-blueless', 'st-q-blue', 'st-idle', 'st-again', 'st-pair', 'st-open',
  'task-sort-color', 'task-sort-shape', 'task-sort-switch', 'sort-switch', 'task-sort-border', 'sort-by-shape',
  'sort-by-color', 'task-sort-guess', 'task-sort-both', 'sort-wrong-color', 'sort-wrong-shape', 'sort-wrong-guess',
  'sort-wrong-both', 'sort-idle', 'sort-good',
  'task-sp', 'task-sp-map', 'sp-ba', 'sp-fangdao', 'sp-first', 'sp-then', 'obj-wrench', 'obj-tire', 'obj-can',
  'obj-flag', 'ref-car', 'ref-box', 'pos-up', 'pos-down', 'pos-in', 'pos-out', 'pos-side', 'pos-front', 'pos-back',
  'pos-left', 'pos-right', 'sp-wrong', 'sp-good', 'sp-idle', 'sp-front-hint', 'sp-left-hint', 'sp-right-hint',
  'task-syl-clap', 'task-syl-sign', 'task-syl-point', 'task-syl-del', 'task-syl-head',
  'sy-this', 'sy-clap-go', 'sy-xia', 'sy-together', 'sy-yourturn', 'sy-rule', 'sy-count', 'sy-find', 'sy-which',
  'sy-bushuo', 'sy-shengsha', 'sy-shengxia', 'sy-listen', 'sy-idle-clap', 'sy-point-again', 'sy-see',
  'sy-head-car', 'sy-head-part', 'sy-head-rule', 'sy-good', 'sy-clap-good', 'sy-wrong', 'sy-done',
  ...SYL_KEYS.map(k => `syl-${k}`),
  ...VN_KEYS.map(k => `vn-${k}`),
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
  'js/hub.js', 'js/mycar.js', 'js/album.js', 'js/vip.js',
  'js/rewards.js', 'js/rewards-data.js', 'js/game-shapes.js', 'js/game-compare.js',
  'js/sync.js', 'js/game-subitize.js', 'js/game-pattern.js', 'js/game-numline.js', 'js/game-story.js',
  'js/game-sort.js', 'js/game-spatial.js', 'js/game-syllable.js',
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
