import { unlock, sfx, say, preload } from './audio.js';
import { makeRng } from './rng.js';
import { createStore } from './store.js';
import { createGarage } from './garage.js';
import { effectiveLevel, recordOutcome } from './difficulty.js';
import { genTireTask, MAX_TIRE_LEVEL } from './taskgen.js';
import { runTireGame } from './game-tires.js';
import { attachIdleHelp } from './guide.js';

const boot = document.getElementById('boot');
const bell = document.getElementById('bell');
const stage = document.getElementById('stage');
const rotateTip = document.getElementById('rotate-tip');

const rng = makeRng();
const store = createStore(window.localStorage);
let data = store.load();

function checkOrientation() {
  rotateTip.hidden = !(window.innerHeight > window.innerWidth);
}
window.addEventListener('resize', checkOrientation);
checkOrientation();

preload(['welcome', 'intro-race', 'intro-dump', 'task-tires-prefix', 'task-tires-suffix',
  'num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'praise-1', 'praise-2', 'goodbye-1',
  'closing-1', 'closing-2', 'sleeping-1', 'idle-tires']);

bell.addEventListener('pointerdown', async () => {
  unlock();
  sfx.ding();
  boot.hidden = true;
  stage.hidden = false;
  if (store.jobsToday(data) >= data.settings.dailyJobs) {
    showSleeping();
  } else {
    await say('welcome');
    nextJob();
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

  const outcome = await runTireGame(garage, customer, task, attachIdleHelp);

  data.skills.counting = recordOutcome(data.skills.counting, outcome, MAX_TIRE_LEVEL);
  store.recordGame(data, 'tires', outcome);
  store.recordJob(data);

  garage.clearBubble();
  await garage.celebrate();
  await say(rng.pick(['praise-1', 'praise-2']));
  await garage.driveOut(customer.vehicle);
  await say('goodbye-1');

  if (store.jobsToday(data) >= data.settings.dailyJobs) {
    await showClosing();
  } else {
    nextJob();
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
}
