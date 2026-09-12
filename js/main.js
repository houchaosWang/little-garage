import { unlock, sfx, say, sayNow, preload, setPaused } from './audio.js';
import { makeRng } from './rng.js';
import { createStore, localDate } from './store.js';
import { createSync, shouldSync } from './sync.js';
import { createGarage } from './garage.js';
import { effectiveLevel, recordOutcome } from './difficulty.js';
import { onPromoted, dueReviews, onReviewResult, seedMissingMastery } from './mastery.js';
import {
  genTireTask, MAX_TIRE_LEVEL,
  genFuelTask, MAX_FUEL_LEVEL,
  genLightsTask, MAX_LIGHTS_LEVEL,
  genMathTask, MAX_MATH_LEVEL,
  genHanziTask, MAX_HANZI_LEVEL,
  genTraceTask, MAX_TRACE_LEVEL,
  genShapesTask, MAX_SHAPES_LEVEL,
  genCompareTask, MAX_COMPARE_LEVEL,
  genSubitizeTask, MAX_SUBITIZE_LEVEL,
  genPatternTask, MAX_PATTERN_LEVEL,
  genNumlineTask, MAX_NUMLINE_LEVEL,
  genStoryTask, MAX_STORY_LEVEL,
  genSortTask, MAX_SORT_LEVEL,
  genSpatialTask, MAX_SPATIAL_LEVEL,
  genSyllableTask, MAX_SYLLABLE_LEVEL, SYL_WORDS,
  CHARSET,
  taskSignature,
} from './taskgen.js';
import { runTireGame } from './game-tires.js';
import { runFuelGame } from './game-fuel.js';
import { runLightsGame } from './game-lights.js';
import { runMathGame } from './game-math.js';
import { runWashGame } from './game-wash.js';
import { runHanziGame } from './game-hanzi.js';
import { runTraceGame } from './game-trace.js';
import { runShapesGame } from './game-shapes.js';
import { runCompareGame } from './game-compare.js';
import { runSubitizeGame } from './game-subitize.js';
import { runPatternGame } from './game-pattern.js';
import { runNumlineGame } from './game-numline.js';
import { runStoryGame } from './game-story.js';
import { runSortGame } from './game-sort.js';
import { runSpatialGame } from './game-spatial.js';
import { runSyllableGame, SYL_PROMPTS } from './game-syllable.js';
import { attachIdleHelp, guideHand } from './guide.js';
import { initParentPanel } from './parent.js';
import { PALETTE, addWheels } from './vehicles.js';
import { showHub } from './hub.js';
import { rollDrop, applyDrop, showDrop } from './rewards.js';
import { openMyCar } from './mycar.js';
import { showBadge, openAlbum } from './album.js';
import { addHelmet, showVipOffer } from './vip.js';

const GAME_DEFS = {
  tires: {
    skill: 'counting', max: MAX_TIRE_LEVEL,
    gen: (rng, lvl) => genTireTask(rng, lvl),
    run: runTireGame,
    bubble: t => `帮我装上 ${t.count} 个轮胎吧！`,
    voice: t => ['task-tires-prefix', `num-${t.count}`, 'task-tires-suffix', ...(t.mode === 'count' ? ['tires-done-hint'] : [])],
  },
  fuel: {
    skill: 'numerals', max: MAX_FUEL_LEVEL,
    gen: (rng, lvl) => genFuelTask(rng, lvl),
    run: runFuelGame,
    bubble: t => `加油加到数字 ${t.target} 就停哦！`,
    voice: t => ['task-fuel-prefix', `num-${t.target}`, 'task-fuel-suffix'],
  },
  lights: {
    skill: 'colors', max: MAX_LIGHTS_LEVEL,
    gen: (rng, lvl, cust) => genLightsTask(rng, lvl, cust.color, Object.keys(PALETTE)),
    run: runLightsGame,
    bubble: () => '帮我换上一样颜色的车灯吧！',
    voice: () => ['task-lights'],
  },
  math: {
    skill: 'math', max: MAX_MATH_LEVEL,
    gen: (rng, lvl) => genMathTask(rng, lvl),
    run: runMathGame,
    bubble: t => `${t.a} ${t.op} ${t.b} = ?`,
    voice: t => [`num-${t.a}`, t.op === '+' ? 'math-jia' : 'math-jian', `num-${t.b}`, 'math-dengyu-ji'],
  },
  wash: {
    skill: null, max: 0,
    gen: () => null,
    run: runWashGame,
    bubble: () => '帮我洗个澡，擦得亮晶晶！',
    voice: () => ['task-wash'],
  },
  hanzi: {
    skill: 'literacy', max: MAX_HANZI_LEVEL,
    gen: (rng, lvl) => genHanziTask(rng, lvl),
    run: runHanziGame,
    bubble: t => `找到「${CHARSET[t.answerIndex]}」`,
    voice: t => ['task-hanzi-prefix', `char-${t.answerIndex + 1}`, 'task-hanzi-suffix'],
  },
  trace: {
    skill: 'tracing', max: MAX_TRACE_LEVEL,
    gen: (rng, lvl) => genTraceTask(rng, lvl),
    run: runTraceGame,
    bubble: t => `写一写「${CHARSET[t.charIndex]}」`,
    voice: t => ['task-trace-prefix', `char-${t.charIndex + 1}`, 'task-trace-suffix'],
  },
  shapes: {
    skill: 'shapes', max: MAX_SHAPES_LEVEL,
    gen: (rng, lvl) => genShapesTask(rng, lvl),
    run: runShapesGame,
    bubble: () => '把零件装进一样形状的孔里！',
    voice: () => ['task-shapes'],
  },
  compare: {
    skill: 'compare', max: MAX_COMPARE_LEVEL,
    gen: (rng, lvl) => genCompareTask(rng, lvl),
    run: runCompareGame,
    bubble: t => ({ big: '帮我换上最大的那个！', small: '帮我选最小的那个！', long: '帮我接上最长的管子！', short: '帮我拿最短的管子！' })[t.kind],
    voice: t => [`task-compare-${t.kind}`],
  },
  // ── 阶段6新游戏（设计依据见 docs/phase6-design-rationale.md 与 taskgen.js 各节注释） ──
  subitize: {
    skill: 'subitize', max: MAX_SUBITIZE_LEVEL,
    gen: (rng, lvl) => genSubitizeTask(rng, lvl),
    run: runSubitizeGame,
    bubble: t => ({ sum: '两边一共亮几盏灯？', complement: '还差几盏，就亮满十盏？' })[t.ask] || '仪表盘亮了几盏灯？',
    voice: t => [({ sum: 'task-sub-sum', complement: 'task-sub-ten' })[t.ask] || 'task-sub-count'],
  },
  pattern: {
    skill: 'pattern', max: MAX_PATTERN_LEVEL,
    gen: (rng, lvl) => genPatternTask(rng, lvl),
    run: runPatternGame,
    bubble: t => ({ extend: '下一个该放什么？', complete: '中间空的该放什么？', abstract: '哪一排规律一样？', unit: '哪一小段在重复？' })[t.kind],
    voice: t => [({ extend: 'task-pat-next', complete: 'task-pat-mid', abstract: 'task-pat-same', unit: 'task-pat-unit' })[t.kind]],
  },
  numline: {
    skill: 'numline', max: MAX_NUMLINE_LEVEL,
    gen: (rng, lvl) => genNumlineTask(rng, lvl),
    run: runNumlineGame,
    bubble: t => ({ race: '我们来赛车！', estimate: '赛车停在哪里？', left: '还差几格到终点？' })[t.kind],
    voice: t => [t.kind === 'race' ? (t.predict ? 'task-nl-predict' : 'task-nl-race') : (t.kind === 'estimate' ? 'task-nl-est' : 'task-nl-left')],
  },
  story: {
    skill: 'story', max: MAX_STORY_LEVEL,
    gen: (rng, lvl) => genStoryTask(rng, lvl),
    run: runStoryGame,
    bubble: () => '听故事，想一想！', // 不写算式：选加还是减本身就是要想的
    voice: () => ['task-story'],
  },
  sort: {
    skill: 'sort', max: MAX_SORT_LEVEL,
    gen: (rng, lvl) => genSortTask(rng, lvl),
    run: runSortGame,
    bubble: t => ({ one: t.rule === 'color' ? '按颜色分！' : '按形状分！', switch: '先按颜色分！', border: '看金边分！', guess: '猜猜是怎么分的？', cross: '颜色形状都要对！' })[t.kind],
    voice: t => [({ one: t.rule === 'color' ? 'task-sort-color' : 'task-sort-shape', switch: 'task-sort-switch', border: 'task-sort-border', guess: 'task-sort-guess', cross: 'task-sort-both' })[t.kind]],
  },
  spatial: {
    skill: 'spatial', max: MAX_SPATIAL_LEVEL,
    gen: (rng, lvl) => genSpatialTask(rng, lvl),
    run: runSpatialGame,
    bubble: t => (t.map ? '照着小图摆一摆！' : '放到对的地方！'),
    voice: t => [t.map ? 'task-sp-map' : 'task-sp'],
  },
  // 阶段7：车名拍拍（依据见 docs/phase6-design-rationale.md 第七节与 taskgen.js 的 SYL_WORDS 注释）
  syllable: {
    skill: 'syllable', max: MAX_SYLLABLE_LEVEL,
    gen: (rng, lvl) => genSyllableTask(rng, lvl),
    run: runSyllableGame,
    bubble: t => ({ clap: '跟我拍车名！', sign: '听车名，找牌子！', point: '指着念一念！', del: '不说一个字，还剩什么？', head: '是车，还是车上的东西？' })[t.kind],
    voice: t => [({ clap: 'task-syl-clap', sign: 'task-syl-sign', point: 'task-syl-point', del: 'task-syl-del', head: 'task-syl-head' })[t.kind]],
  },
};

const SKILL_GAME = {
  counting: 'tires', numerals: 'fuel', colors: 'lights', math: 'math', literacy: 'hanzi', tracing: 'trace', shapes: 'shapes', compare: 'compare',
  subitize: 'subitize', pattern: 'pattern', numline: 'numline', story: 'story', sort: 'sort', spatial: 'spatial',
  syllable: 'syllable',
};

// 每级一共有多少种不同的题：防重复只能记住比这少一个，否则会"想避也避不开"
const SIG_SPACE = {
  tires: { 1: 3, 2: 4, 3: 6, 4: 5, 5: 6, 6: 8 },
  fuel: { 1: 5, 2: 6, 3: 6, 4: 8 },
  shapes: { 1: 3, 2: 4, 3: 5, 4: 35, 5: 126, 6: 126 },
  compare: { 1: 4, 2: 6, 3: 6, 4: 16, 5: 20, 6: 16 },
  subitize: { 1: 3, 2: 4, 3: 4, 4: 5, 5: 22, 6: 5 },
};
function recentCap(key, lvl) {
  const s = SIG_SPACE[key] && SIG_SPACE[key][lvl];
  return s ? Math.min(6, Math.max(1, s - 1)) : 6;
}

function genUnique(def, key, lvl, customer, skill) {
  let task = def.gen(rng, lvl, customer);
  if (!skill || !taskSignature(key, task)) return task;
  const cap = recentCap(key, lvl);
  for (let i = 0; i < 5 && skill.recent.slice(-cap).includes(taskSignature(key, task)); i++) {
    task = def.gen(rng, lvl, customer);
  }
  skill.recent.push(taskSignature(key, task));
  while (skill.recent.length > 6) skill.recent.shift();
  return task;
}

const boot = document.getElementById('boot');
const bell = document.getElementById('bell');
const stage = document.getElementById('stage');
const rotateTip = document.getElementById('rotate-tip');

window.__guideHand = (a, b) => guideHand(stage, a, b);

const rng = makeRng();
// 当前装的是哪一版：一起报给电脑，好知道 iPad 更新到了没有
let appVersion = '';
if (window.caches) {
  caches.keys().then(ks => {
    const vs = ks.filter(k => /^garage-v\d+$/.test(k)).sort((a, b) => Number(b.slice(8)) - Number(a.slice(8)));
    appVersion = vs[0] || '';
  }).catch(() => {});
}
const sync = createSync({
  enabled: shouldSync(location),
  storage: window.localStorage,
  app: () => appVersion,
  post: body => fetch('api/progress', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: body.length < 60000, // keepalive 有 64KB 上限，超了就退回普通请求
  }).then(r => r.ok),
});
document.addEventListener('visibilitychange', () => { if (document.hidden) sync.flush(); });
window.addEventListener('pagehide', () => { sync.flush(); });
const store = createStore(window.localStorage, localDate, { onSave: d => sync.schedule(d) });
let data = store.load();
seedMissingMastery(data.skills, localDate());
store.save(data);
initParentPanel(store, () => data, {
  counting: { name: '数数·装轮胎', max: MAX_TIRE_LEVEL },
  numerals: { name: '认数字·加油', max: MAX_FUEL_LEVEL },
  colors: { name: '颜色·车灯', max: MAX_LIGHTS_LEVEL },
  math: { name: '算数·石头题', max: MAX_MATH_LEVEL },
  literacy: { name: '认字·搬箱', max: MAX_HANZI_LEVEL },
  tracing: { name: '写字·描红', max: MAX_TRACE_LEVEL },
  shapes: { name: '图形·对孔', max: MAX_SHAPES_LEVEL },
  compare: { name: '比较·大小', max: MAX_COMPARE_LEVEL },
  subitize: { name: '数感·闪灯', max: MAX_SUBITIZE_LEVEL },
  pattern: { name: '规律·彩灯', max: MAX_PATTERN_LEVEL },
  numline: { name: '数轴·赛道', max: MAX_NUMLINE_LEVEL },
  story: { name: '应用·停车场', max: MAX_STORY_LEVEL },
  sort: { name: '分类·分拣', max: MAX_SORT_LEVEL },
  spatial: { name: '方位·摆放', max: MAX_SPATIAL_LEVEL },
  syllable: { name: '音节·车名', max: MAX_SYLLABLE_LEVEL },
}, { sync });

window.addEventListener('unhandledrejection', e => console.error('unhandled', e.reason));
let jobRunning = false;
function handleLoopError(err) {
  console.error('job loop failed', err);
  jobRunning = false;
  try {
    const last = Number(sessionStorage.getItem('crash-ts') || 0);
    if (Date.now() - last > 60000) {
      sessionStorage.setItem('crash-ts', String(Date.now()));
      location.reload();
    }
  } catch { location.reload(); }
}

function checkOrientation() {
  const portrait = window.innerHeight > window.innerWidth;
  rotateTip.hidden = !portrait;
  setPaused(portrait);
}
window.addEventListener('resize', checkOrientation);
checkOrientation();

const bootHint = document.getElementById('boot-hint');
const CORE_CLIPS = ['welcome',
  'intro-race', 'intro-dump', 'intro-police', 'intro-ambulance', 'intro-fire', 'intro-digger', 'intro-mixer', 'intro-loader',
  'buddy-hello-1', 'buddy-hello-2',
  'hub-next', 'hub-mycar', 'hub-album',
  'task-tires-prefix', 'task-tires-suffix', 'tires-done-hint', 'task-fuel-prefix', 'task-fuel-suffix',
  'task-lights', 'task-wash', 'task-shapes',
  'task-compare-big', 'task-compare-small', 'task-compare-long', 'task-compare-short',
  'task-hanzi-prefix', 'task-hanzi-suffix', 'task-trace-prefix', 'task-trace-suffix',
  'math-jia', 'math-jian', 'math-dengyu-ji',
  'num-1', 'num-2', 'num-3', 'num-4', 'num-5',
  'friend-back-1', 'friend-back-2',
  'vip-ask',
  // 新游戏的开场任务语音（第一单就可能用到）
  'task-sub-count', 'task-sub-sum', 'task-sub-ten',
  'task-pat-next', 'task-pat-mid', 'task-pat-same', 'task-pat-unit',
  'task-nl-race', 'task-nl-predict', 'task-nl-est', 'task-nl-left',
  'task-story', 'task-sort-color', 'task-sort-shape', 'task-sort-switch', 'task-sort-border', 'task-sort-guess', 'task-sort-both',
  'task-sp', 'task-sp-map',
  'task-syl-clap', 'task-syl-sign', 'task-syl-point', 'task-syl-del', 'task-syl-head'];
const REST_CLIPS = [
  ...Array.from({ length: 15 }, (_, i) => `num-${i + 6}`),
  ...Array.from({ length: 40 }, (_, i) => `char-${i + 1}`),
  'praise-1', 'praise-2', 'goodbye-1', 'closing-1', 'closing-2', 'sleeping-1',
  'idle-tires', 'idle-tires-count', 'demo-hint', 'fuel-over', 'fuel-more', 'idle-fuel',
  'math-think', 'math-again', 'math-bucket-pre', 'math-xianyou', 'math-ge-jiezhe',
  'math-yigong', 'math-bigfirst', 'math-open', 'math-haisheng', 'math-couten',
  'lights-wrong', 'idle-lights', 'idle-wash',
  'task-math', 'math-dengyu', 'math-yiqi', 'math-wrong', 'math-duila', 'math-zailai', 'math-nazou', 'idle-math',
  'hanzi-wrong', 'idle-hanzi', 'trace-hint', 'trace-good', 'idle-trace',
  'idle-shapes', 'shapes-wrong', 'idle-compare', 'compare-wrong',
  'paint-fun', 'wheel-cool', 'sticker-stick', 'garage-mine',
  'sticker-get-1', 'sticker-get-2', 'paint-get', 'wheel-get',
  'badge-get', 'album-open',
  'vip-accept-cheer', 'vip-decline-ok', 'vip-done', 'vip-drop',
  'sub-eye', 'sub-idle', 'sub-again', 'sub-he', 'sub-shi', 'sub-couten',
  'pat-wrong', 'pat-idle', 'pat-good', 'col-red', 'col-blue', 'col-yellow', 'col-green',
  'shp-circle', 'shp-square', 'shp-triangle', 'shp-star',
  'nl-where-pre', 'nl-where-post', 'nl-spin', 'nl-tapcar', 'nl-guess', 'nl-right', 'nl-walk', 'nl-myturn', 'nl-win',
  'nl-zhongjian', 'nl-close', 'nl-idle-est', 'nl-idle-left',
  'st-have-pre', 'st-cars', 'st-liang', 'st-comein', 'st-q-total', 'st-leave', 'st-q-left', 'st-total-pre', 'st-outside',
  'st-q-hidden', 'st-some', 'st-now', 'st-q-came', 'st-red', 'st-blue', 'st-q-more', 'st-bluemore', 'st-blueless',
  'st-q-blue', 'st-idle', 'st-again', 'st-pair', 'st-open',
  'sort-switch', 'sort-by-shape', 'sort-by-color', 'sort-wrong-color', 'sort-wrong-shape', 'sort-wrong-guess',
  'sort-wrong-both', 'sort-idle', 'sort-good',
  'sp-ba', 'sp-fangdao', 'sp-first', 'sp-then', 'obj-wrench', 'obj-tire', 'obj-can', 'obj-flag', 'ref-car', 'ref-box',
  'pos-up', 'pos-down', 'pos-in', 'pos-out', 'pos-side', 'pos-front', 'pos-back', 'pos-left', 'pos-right',
  'sp-wrong', 'sp-good', 'sp-idle', 'sp-front-hint', 'sp-left-hint', 'sp-right-hint',
  ...SYL_PROMPTS,
  ...new Set(SYL_WORDS.flatMap(x => x.s.map(k => `syl-${k}`))),
  ...SYL_WORDS.map(x => `vn-${x.v}`),
];
preload(CORE_CLIPS, (done, total) => {
  bootHint.textContent = `正在准备声音 ${done}/${total}`;
}).then(failed => {
  bell.removeAttribute('disabled');
  bootHint.textContent = failed
    ? '有几条声音没准备好，也可以先玩（建议检查网络后重进）'
    : '准备好啦！按一下门铃，车库开张！';
  preload(REST_CLIPS);
});

bell.addEventListener('pointerdown', async () => {
  unlock();
  sfx.ding();
  boot.hidden = true;
  stage.removeAttribute('hidden');
  if (store.jobsToday(data) >= data.settings.dailyJobs) {
    showSleeping();
  } else {
    await say('welcome');
    goHub();
  }
}, { once: true });

function goHub() {
  if (jobRunning) return;
  if (store.jobsToday(data) >= data.settings.dailyJobs) {
    showSleeping();
    return;
  }
  showHub(stage, data, {
    onNext: () => { nextJob().catch(handleLoopError); },
    onGarage: () => openMyCar(data, store, () => goHub()),
    onAlbum: () => openAlbum(data, () => goHub()),
  });
}

async function nextJob() {
  jobRunning = true;
  const garage = createGarage(stage, rng);
  const friends = data.collection.friends;
  const friend = friends.length >= 2 && rng.next() < 0.3 ? rng.pick(friends) : null;
  if (!data.vipTarget) data.vipTarget = rng.int(6, 10);
  const isVip = !friend && data.vipMeter >= data.vipTarget;
  const customer = garage.newCustomer(friend);
  if (isVip) addHelmet(customer);
  await garage.driveIn(customer.vehicle);

  const today = localDate();
  if (data.reviewsToday.date !== today) data.reviewsToday = { date: today, count: 0 };

  let vipActive = false;
  if (isVip) {
    data.vipMeter = 0;
    data.vipTarget = rng.int(6, 10);
    vipActive = await showVipOffer(stage);
    if (vipActive) sayNow('vip-accept-cheer');
    else { sayNow('vip-decline-ok'); data.vipMeter = Math.max(0, data.vipTarget - 2); }
    store.save(data);
  }

  let review = null;
  if (!vipActive && data.reviewsToday.count < 2) {
    review = dueReviews(data.skills, today)[0] || null;
  }

  let pool = ['tires', 'fuel', 'lights', 'math', 'hanzi', 'trace', 'shapes', 'compare',
    'subitize', 'pattern', 'numline', 'story', 'sort', 'spatial', 'syllable'];
  if (customer.vehicle.meta.lockColor === 'skip') pool = pool.filter(g => g !== 'lights');
  if (review && !pool.includes(SKILL_GAME[review.skill])) review = null;
  // 按"落后程度"加权抽：玩得越少越容易轮到。纯随机时实测"换车灯"26单只轮到1次，
  // 那个技能就一直停在1级、难度引擎也无从调节。落后再多也最多+5——新游戏上线时不会把老游戏挤没。
  const played = g => (data.stats.byGame[g] || { plays: 0 }).plays;
  const pickBalanced = cand => {
    const most = Math.max(...cand.map(played));
    return rng.pickWeighted(cand, cand.map(g => 1 + Math.min(5, most - played(g))));
  };
  let games;
  if (review) {
    const rGame = SKILL_GAME[review.skill];
    games = [pickBalanced(pool.filter(g => g !== rGame)), rGame];
  } else {
    const first = pickBalanced(pool);
    games = [first, pickBalanced(pool.filter(g => g !== first))];
  }
  if (rng.next() < 0.25) games.push('wash');

  for (let i = 0; i < games.length; i++) {
    const key = games[i];
    const def = GAME_DEFS[key];
    const isReview = !!review && i === 1;
    const skill = def.skill ? data.skills[def.skill] : null;
    const lvl = isReview ? review.level : (skill ? Math.min(effectiveLevel(skill, def.max) + (vipActive ? 1 : 0), def.max) : 1);
    const task = genUnique(def, key, lvl, customer, skill);
    const voices = def.voice(task).slice();
    if (i === 0) voices.unshift(customer.isFriend ? (rng.next() < 0.5 ? 'friend-back-1' : 'friend-back-2') : customer.vehicle.meta.intro);
    garage.showBubble(def.bubble(task), voices);
    window.__firstTirePlay = key === 'tires' && !data.stats.byGame.tires;
    const t0 = performance.now(); // 出题到做完（含语音时长，只用来比相对快慢）
    const outcome = await def.run(garage, customer, task, attachIdleHelp);
    const ms = performance.now() - t0;
    if (!outcome.aborted) {
      if (skill) {
        if (isReview) {
          const result = outcome.errors > 0 ? 'fail' : (outcome.helps > 0 ? 'soft' : 'pass');
          onReviewResult(skill, review.level, result, today);
          data.reviewsToday.count += 1;
        } else {
          const before = effectiveLevel(skill, def.max);
          const after = recordOutcome(skill, outcome, def.max, { allowDemote: !vipActive });
          skill.level = after.level;
          skill.streak = after.streak;
          if (Math.floor(after.level) > before) onPromoted(skill, before, today);
        }
      }
      store.recordGame(data, key, outcome, {
        level: skill ? lvl : 0, ms, review: isReview, vip: vipActive,
        sig: skill ? taskSignature(key, task) : '',
      });
    }
  }
  addWheels(customer.vehicle);
  sfx.snap();
  store.recordJob(data);
  data.vipMeter += 1;
  store.save(data);

  const f = friends.find(x => x.type === customer.type && x.name === customer.name);
  if (f) { f.count += 1; f.color = customer.color; } else { friends.push({ type: customer.type, color: customer.color, name: customer.name, count: 1 }); }
  data.stats.byVehicle[customer.type] = (data.stats.byVehicle[customer.type] || 0) + 1;
  let newBadge = null;
  if (data.stats.byVehicle[customer.type] === 3 && !data.collection.badges.includes(customer.type)) {
    data.collection.badges.push(customer.type);
    newBadge = customer.type;
  }
  store.save(data);

  garage.clearBubble();
  if (vipActive) await say('vip-done');
  sayNow(rng.pick(['praise-1', 'praise-2']));
  await garage.celebrate();
  if (vipActive) await garage.celebrate();
  say('goodbye-1');
  await garage.driveOut(customer.vehicle);

  const drop = vipActive
    ? { kind: 'sticker', id: (['v1', 'v2', 'v3', 'v4'].find(v => !data.collection.stickers.includes(v)) || rng.pick(['v1', 'v2', 'v3', 'v4'])) }
    : rollDrop(rng, data.collection);
  applyDrop(data.collection, drop);
  store.save(data);
  await showDrop(stage, drop, rng, vipActive ? 'vip-drop' : undefined);
  if (newBadge) { await showBadge(stage, newBadge); }

  if (store.jobsToday(data) >= data.settings.dailyJobs) {
    jobRunning = false;
    await showClosing();
  } else {
    jobRunning = false;
    goHub();
  }
}

async function showClosing() {
  const night = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  night.setAttribute('x', 0); night.setAttribute('y', 0);
  night.setAttribute('width', 1200); night.setAttribute('height', 800);
  night.setAttribute('fill', '#2B3A5C');
  night.style.opacity = '0';
  night.style.transition = 'opacity 2.5s';
  stage.appendChild(night);
  requestAnimationFrame(() => { night.style.opacity = '0.85'; });
  sfx.night();
  await say('closing-1', 'closing-2');
  showSleeping();
}

function showSleeping() {
  stage.innerHTML = `
    <rect x="0" y="0" width="1200" height="800" fill="#2B3A5C"/>
    <circle cx="1000" cy="140" r="70" fill="#F5E6A8"/>
    <circle cx="970" cy="120" r="62" fill="#2B3A5C"/>
    <rect x="380" y="330" width="440" height="290" rx="16" fill="#3D4E76"/>
    <rect x="420" y="380" width="360" height="240" rx="10" fill="#55679A"/>
    <line x1="420" y1="440" x2="780" y2="440" stroke="#3D4E76" stroke-width="8"/>
    <line x1="420" y1="500" x2="780" y2="500" stroke="#3D4E76" stroke-width="8"/>
    <line x1="420" y1="560" x2="780" y2="560" stroke="#3D4E76" stroke-width="8"/>
    <text x="600" y="290" text-anchor="middle" font-size="44" fill="#F5E6A8">车库睡觉啦，明天见！</text>
    <text x="840" y="360" font-size="40" fill="#F5E6A8">Z</text>
    <text x="880" y="320" font-size="52" fill="#F5E6A8">Z</text>`;
  say('sleeping-1');
  const recheck = () => {
    if (store.jobsToday(store.load()) < data.settings.dailyJobs) location.reload();
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) recheck(); });
  window.addEventListener('pageshow', recheck);
}

// 本地 http 默认不注册 SW（免得缓存干扰调试）。
// ?sw=1 在电脑上自检离线安装是否完整；?sw=0 撤销（别把缓存留在 localhost:8080 上妨碍别的项目）。
if ('serviceWorker' in navigator) {
  const flag = new URLSearchParams(location.search).get('sw');
  if (flag === '0') {
    navigator.serviceWorker.getRegistrations()
      .then(rs => Promise.all(rs.map(r => r.unregister())))
      .then(() => caches.keys())
      .then(ks => Promise.all(ks.map(k => caches.delete(k))))
      .catch(() => {});
  } else if (location.protocol === 'https:' || flag !== null) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
