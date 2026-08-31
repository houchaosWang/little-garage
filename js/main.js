import { unlock, sfx, say, sayNow, preload } from './audio.js';
import { makeRng } from './rng.js';
import { createStore } from './store.js';
import { createGarage } from './garage.js';
import { effectiveLevel, recordOutcome } from './difficulty.js';
import {
  genTireTask, MAX_TIRE_LEVEL,
  genFuelTask, MAX_FUEL_LEVEL,
  genLightsTask, MAX_LIGHTS_LEVEL,
} from './taskgen.js';
import { runTireGame } from './game-tires.js';
import { runFuelGame } from './game-fuel.js';
import { runLightsGame } from './game-lights.js';
import { runWashGame } from './game-wash.js';
import { attachIdleHelp, guideHand } from './guide.js';
import { initParentPanel } from './parent.js';
import { PALETTE } from './vehicles.js';

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
  wash: {
    skill: null, max: 0,
    gen: () => null,
    run: runWashGame,
    bubble: () => '帮我洗个澡，擦得亮晶晶！',
    voice: () => ['task-wash'],
  },
};

function pickGames(rng) {
  const pool = ['tires', 'fuel', 'lights'];
  const first = rng.pick(pool);
  const second = rng.pick(pool.filter(g => g !== first));
  const list = [first, second];
  if (rng.next() < 0.25) list.push('wash');
  return list;
}

const boot = document.getElementById('boot');
const bell = document.getElementById('bell');
const stage = document.getElementById('stage');
const rotateTip = document.getElementById('rotate-tip');

window.__guideHand = (a, b) => guideHand(stage, a, b);

const rng = makeRng();
const store = createStore(window.localStorage);
let data = store.load();
initParentPanel(store, () => data);

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
  rotateTip.hidden = !(window.innerHeight > window.innerWidth);
}
window.addEventListener('resize', checkOrientation);
checkOrientation();

const bootHint = document.getElementById('boot-hint');
preload(['welcome', 'intro-race', 'intro-dump', 'task-tires-prefix', 'task-tires-suffix',
  'num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'num-6', 'num-7', 'num-8', 'num-9', 'num-10',
  'praise-1', 'praise-2', 'goodbye-1', 'closing-1', 'closing-2', 'sleeping-1', 'idle-tires',
  'demo-hint',
  'task-fuel-prefix', 'task-fuel-suffix', 'fuel-over', 'fuel-more', 'idle-fuel',
  'task-lights', 'lights-wrong', 'idle-lights', 'task-wash', 'idle-wash'],
(done, total) => {
  bootHint.textContent = `正在准备声音 ${done}/${total}`;
}).then(failed => {
  bell.removeAttribute('disabled');
  bootHint.textContent = failed
    ? '有几条声音没准备好，也可以先玩（建议检查网络后重进）'
    : '准备好啦！按一下门铃，车库开张！';
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
    nextJob().catch(handleLoopError);
  }
}, { once: true });

async function nextJob() {
  const garage = createGarage(stage, rng);
  const customer = garage.newCustomer();
  await garage.driveIn(customer.vehicle);

  const games = pickGames(rng);
  for (let i = 0; i < games.length; i++) {
    const key = games[i];
    const def = GAME_DEFS[key];
    const skill = def.skill ? data.skills[def.skill] : null;
    const lvl = skill ? effectiveLevel(skill, def.max) : 1;
    const task = def.gen(rng, lvl, customer);
    const voices = def.voice(task).slice();
    if (i === 0) voices.unshift(customer.vehicle.meta.intro);
    garage.showBubble(def.bubble(task), voices);
    window.__firstTirePlay = key === 'tires' && !data.stats.byGame.tires;
    const outcome = await def.run(garage, customer, task, attachIdleHelp);
    if (skill) data.skills[def.skill] = recordOutcome(skill, outcome, def.max);
    store.recordGame(data, key, outcome);
  }
  store.recordJob(data);

  garage.clearBubble();
  sayNow(rng.pick(['praise-1', 'praise-2']));
  await garage.celebrate();
  say('goodbye-1');
  await garage.driveOut(customer.vehicle);

  if (store.jobsToday(data) >= data.settings.dailyJobs) {
    await showClosing();
  } else {
    nextJob().catch(handleLoopError);
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
