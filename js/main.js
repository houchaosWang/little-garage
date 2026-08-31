import { unlock, sfx, say, sayNow, preload } from './audio.js';
import { makeRng } from './rng.js';
import { createStore } from './store.js';
import { createGarage } from './garage.js';
import { effectiveLevel, recordOutcome } from './difficulty.js';
import { genTireTask, MAX_TIRE_LEVEL } from './taskgen.js';
import { runTireGame } from './game-tires.js';
import { attachIdleHelp, guideHand } from './guide.js';

const boot = document.getElementById('boot');
const bell = document.getElementById('bell');
const stage = document.getElementById('stage');
const rotateTip = document.getElementById('rotate-tip');

window.__guideHand = (a, b) => guideHand(stage, a, b);

const rng = makeRng();
const store = createStore(window.localStorage);
let data = store.load();

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
  'demo-hint'],
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

  const level = effectiveLevel(data.skills.counting, MAX_TIRE_LEVEL);
  const task = genTireTask(rng, level);
  garage.showBubble(
    `帮我装上 ${task.count} 个轮胎吧！`,
    [customer.vehicle.meta.intro, 'task-tires-prefix', `num-${task.count}`, 'task-tires-suffix'],
  );

  window.__firstTirePlay = !data.stats.byGame.tires;
  const outcome = await runTireGame(garage, customer, task, attachIdleHelp);

  data.skills.counting = recordOutcome(data.skills.counting, outcome, MAX_TIRE_LEVEL);
  store.recordGame(data, 'tires', outcome);
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
