import { unlock, sfx, say, sayNow, preload, setPaused } from './audio.js';
import { makeRng } from './rng.js';
import { createStore, localDate } from './store.js';
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
import { attachIdleHelp, guideHand } from './guide.js';
import { initParentPanel } from './parent.js';
import { PALETTE, addWheels } from './vehicles.js';
import { showHub } from './hub.js';
import { rollDrop, applyDrop, showDrop } from './rewards.js';
import { openMyCar } from './mycar.js';
import { showBadge, openAlbum } from './album.js';

const GAME_DEFS = {
  tires: {
    skill: 'counting', max: MAX_TIRE_LEVEL,
    gen: (rng, lvl) => genTireTask(rng, lvl),
    run: runTireGame,
    bubble: t => `帮我装上 ${t.count} 个轮胎吧！`,
    voice: t => ['task-tires-prefix', `num-${t.count}`, 'task-tires-suffix'],
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
};

const SKILL_GAME = { counting: 'tires', numerals: 'fuel', colors: 'lights', math: 'math', literacy: 'hanzi', tracing: 'trace' };

function genUnique(def, key, lvl, customer, skill) {
  let task = def.gen(rng, lvl, customer);
  if (!skill || !taskSignature(key, task)) return task;
  for (let i = 0; i < 5 && skill.recent.includes(taskSignature(key, task)); i++) {
    task = def.gen(rng, lvl, customer);
  }
  skill.recent.push(taskSignature(key, task));
  if (skill.recent.length > 6) skill.recent.shift();
  return task;
}

const boot = document.getElementById('boot');
const bell = document.getElementById('bell');
const stage = document.getElementById('stage');
const rotateTip = document.getElementById('rotate-tip');

window.__guideHand = (a, b) => guideHand(stage, a, b);

const rng = makeRng();
const store = createStore(window.localStorage);
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
});

window.addEventListener('unhandledrejection', e => console.error('unhandled', e.reason));
function handleLoopError(err) {
  console.error('job loop failed', err);
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
const CORE_CLIPS = ['welcome', 'intro-race', 'intro-dump',
  'task-tires-prefix', 'task-tires-suffix', 'task-fuel-prefix', 'task-fuel-suffix',
  'task-lights', 'task-wash', 'math-jia', 'math-jian', 'math-dengyu-ji',
  'task-hanzi-prefix', 'task-hanzi-suffix', 'task-trace-prefix', 'task-trace-suffix',
  'num-1', 'num-2', 'num-3', 'num-4', 'num-5'];
const REST_CLIPS = [
  ...Array.from({ length: 15 }, (_, i) => `num-${i + 6}`),
  ...Array.from({ length: 40 }, (_, i) => `char-${i + 1}`),
  'praise-1', 'praise-2', 'goodbye-1', 'closing-1', 'closing-2', 'sleeping-1',
  'idle-tires', 'demo-hint', 'fuel-over', 'fuel-more', 'idle-fuel',
  'lights-wrong', 'idle-lights', 'idle-wash',
  'task-math', 'math-dengyu', 'math-yiqi', 'math-wrong', 'math-duila', 'math-zailai', 'math-nazou', 'idle-math',
  'hanzi-wrong', 'idle-hanzi', 'trace-hint', 'trace-good', 'idle-trace',
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
  const garage = createGarage(stage, rng);
  const friends = data.collection.friends;
  const friend = friends.length >= 2 && rng.next() < 0.3 ? rng.pick(friends) : null;
  const customer = garage.newCustomer(friend);
  await garage.driveIn(customer.vehicle);

  const today = localDate();
  if (data.reviewsToday.date !== today) data.reviewsToday = { date: today, count: 0 };
  let review = null;
  if (data.reviewsToday.count < 2) {
    review = dueReviews(data.skills, today)[0] || null;
  }

  const pool = ['tires', 'fuel', 'lights', 'math', 'hanzi', 'trace'];
  let games;
  if (review) {
    const rGame = SKILL_GAME[review.skill];
    games = [rng.pick(pool.filter(g => g !== rGame)), rGame];
  } else {
    const first = rng.pick(pool);
    games = [first, rng.pick(pool.filter(g => g !== first))];
  }
  if (rng.next() < 0.25) games.push('wash');

  for (let i = 0; i < games.length; i++) {
    const key = games[i];
    const def = GAME_DEFS[key];
    const isReview = !!review && i === 1;
    const skill = def.skill ? data.skills[def.skill] : null;
    const lvl = isReview ? review.level : (skill ? effectiveLevel(skill, def.max) : 1);
    const task = genUnique(def, key, lvl, customer, skill);
    const voices = def.voice(task).slice();
    if (i === 0) voices.unshift(customer.isFriend ? (rng.next() < 0.5 ? 'friend-back-1' : 'friend-back-2') : customer.vehicle.meta.intro);
    garage.showBubble(def.bubble(task), voices);
    window.__firstTirePlay = key === 'tires' && !data.stats.byGame.tires;
    const outcome = await def.run(garage, customer, task, attachIdleHelp);
    if (!outcome.aborted) {
      if (skill) {
        if (isReview) {
          const result = outcome.errors > 0 ? 'fail' : (outcome.helps > 0 ? 'soft' : 'pass');
          onReviewResult(skill, review.level, result, today);
          data.reviewsToday.count += 1;
        } else {
          const before = effectiveLevel(skill, def.max);
          const after = recordOutcome(skill, outcome, def.max);
          skill.level = after.level;
          skill.streak = after.streak;
          if (Math.floor(after.level) > before) onPromoted(skill, before, today);
        }
      }
      store.recordGame(data, key, outcome);
    }
  }
  addWheels(customer.vehicle);
  sfx.snap();
  store.recordJob(data);

  const f = friends.find(x => x.type === customer.type && x.name === customer.name);
  if (f) { f.count += 1; f.color = customer.color; } else { friends.push({ type: customer.type, color: customer.color, name: customer.name, count: 1 }); }
  data.stats.byVehicle[customer.type] = (data.stats.byVehicle[customer.type] || 0) + 1;
  let newBadge = null;
  if (data.stats.byVehicle[customer.type] === 3 && !data.collection.badges.includes(customer.type)) {
    data.collection.badges.push(customer.type);
    newBadge = customer.type;
  }

  garage.clearBubble();
  sayNow(rng.pick(['praise-1', 'praise-2']));
  await garage.celebrate();
  say('goodbye-1');
  await garage.driveOut(customer.vehicle);

  const drop = rollDrop(rng, data.collection);
  await showDrop(stage, drop, rng);
  applyDrop(data.collection, drop);
  store.save(data);
  if (newBadge) { await showBadge(stage, newBadge); }

  if (store.jobsToday(data) >= data.settings.dailyJobs) {
    await showClosing();
  } else {
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

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
