import { sfx, say, sayNow } from './audio.js';
import { pulse } from './guide.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const nextFrame = fn => requestAnimationFrame(() => requestAnimationFrame(fn));

// 灰 = 第一个数，棕 = 加上来的（两堆一眼分得开）；黄 = 数过的
const FILL = { base: '#8F8C84', added: '#A68A6A', lit: '#F5B324' };
const rockSvg = (r, fill) => `<circle class="rock-body" cx="0" cy="0" r="${r}" fill="${fill}"/><circle cx="${(-r * 0.32).toFixed(1)}" cy="${(-r * 0.32).toFixed(1)}" r="${(r * 0.32).toFixed(1)}" fill="#FFFFFF" opacity="0.35"/>`;
// 桶：牌子上的数就是桶里石头的个数——看不见里面，只能从这个数接着往后数
const bucketSvg = n => `
  <path d="M-58 -70 L58 -70 L46 30 L-46 30 Z" fill="#6F8FB0" stroke="#4A6680" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="0" cy="-70" rx="58" ry="12" fill="#4A6680"/>
  <circle cx="0" cy="-22" r="29" fill="#FFF8EA" stroke="#C89B4A" stroke-width="4"/>
  <text x="0" y="-9" text-anchor="middle" font-size="38" fill="#6B4A12">${n}</text>`;
const BUCKET = { x: 210, y: 410 };
// 十格框：上排5个、下排5个（一年级教材的"十格阵"）
const cellPos = c => ({ x: 115 + (c % 5) * 54, y: 350 + Math.floor(c / 5) * 56 });

// 家长反馈："他是一个一个数的""提示给得太快，刚想一会儿答案就蹦出来"。所以：
//   1) 表征随级别走：全摆出来 → 五个一排 → 第一个数装进桶（只能接着往后数）→ 十格框（凑十）
//   2) 讲解示范"接着往后数/从大的数开始/凑十"，不再从1数到底
//   3) 提示分档、18秒一档：先"慢慢想"（不算求助）→ 给思路 → 一起做一遍；做过一遍还发呆才指答案
//   4) 第一次答错只给思路不给答案，再错才一起做
//   5) 石头可以点：点一下报一个数、变黄做记号——这是他自己动脑的工具，一点就重置提示计时
export function runMathGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    const plus = task.op === '+';
    // 减法一律用桶（新级别里不会有"全摆出来的减法"，这里只是保底）
    const mode = !plus ? 'bucket' : (task.mode || 'visible');
    let errors = 0;
    let helps = 0;
    let wrongs = 0;
    let finished = false;
    let busy = true; // 开场动画、讲解期间不接受点击
    let walked = false; // 已经一起做过一遍

    const tableX = mode === 'tenframe' ? 60 : 120;
    layer.appendChild(el('g', {}, `
      <rect x="${tableX}" y="440" width="${600 - tableX}" height="28" rx="10" fill="#A97B4F"/>
      <rect x="${tableX + 10}" y="300" width="18" height="150" rx="6" fill="#A97B4F"/>
      <rect x="572" y="300" width="18" height="150" rx="6" fill="#A97B4F"/>`));

    const baseRocks = [];
    const addedRocks = [];
    const emptyCells = [];
    let bucket = null;
    let revealed = null;

    function makeRock(x, y, r, kind) {
      const g = el('g', { class: 'rock', transform: `translate(${x} ${y})`, style: 'cursor:pointer' }, rockSvg(r, FILL[kind]));
      g.dataset.kind = kind;
      g.dataset.x = x;
      g.dataset.y = y;
      layer.appendChild(g);
      return g;
    }
    function moveTo(g, x, y, ms = 450) {
      g.dataset.x = x;
      g.dataset.y = y;
      g.style.transition = `transform ${ms}ms cubic-bezier(.3,.8,.4,1)`;
      g.setAttribute('transform', `translate(${x} ${y})`);
      setTimeout(() => { g.style.transition = ''; }, ms + 30);
    }
    function light(g, on = true) {
      g.querySelector('.rock-body').setAttribute('fill', on ? FILL.lit : FILL[g.dataset.kind]);
    }
    function hop(g) {
      const { x, y } = g.dataset;
      g.setAttribute('transform', `translate(${x} ${Number(y) - 14})`);
      setTimeout(() => g.setAttribute('transform', `translate(${x} ${y})`), 260);
    }

    // ── 摆场景 ──
    const addedR = mode === 'visible' ? 22 : mode === 'bucket' ? 20 : 19;
    const fivePos = i => ({ x: 175 + (i % 5) * 92, y: 402 - Math.floor(i / 5) * 62 });
    const addedPos = k => {
      if (mode === 'visible') return fivePos(task.a + k); // 接着第一个数往后排：同一套五个一排
      if (mode === 'bucket') return { x: 320 + (k % 5) * 54, y: 404 - Math.floor(k / 5) * 54 };
      return { x: 410 + (k % 3) * 52, y: 404 - Math.floor(k / 3) * 52 };
    };
    if (mode === 'visible') {
      for (let i = 0; i < task.a; i++) { const p = fivePos(i); baseRocks.push(makeRock(p.x, p.y, 22, 'base')); }
    } else if (mode === 'bucket') {
      bucket = el('g', { class: 'bucket', transform: `translate(${BUCKET.x} ${BUCKET.y})`, style: 'cursor:pointer' }, bucketSvg(task.a));
      layer.appendChild(bucket);
    } else {
      layer.appendChild(el('rect', { x: 88, y: 322, width: 274, height: 112, rx: 10, fill: '#FFF8EA', stroke: '#C89B4A', 'stroke-width': 4 }));
      for (let c = 0; c < 10; c++) {
        const p = cellPos(c);
        if (c < task.a) {
          baseRocks.push(makeRock(p.x, p.y, 20, 'base'));
        } else {
          const hole = el('circle', { cx: p.x, cy: p.y, r: 20, fill: 'none', stroke: '#C89B4A', 'stroke-width': 3, 'stroke-dasharray': '6 5' });
          layer.appendChild(hole);
          emptyCells.push(hole);
        }
      }
    }

    const plates = [];
    const gap = 170;
    const x0 = 600 - gap;
    task.options.forEach((val, i) => {
      const p = el('g', { class: 'plate', style: 'cursor:pointer' }, `
        <rect x="-62" y="-52" width="124" height="104" rx="18" fill="#FFF8EA" stroke="#C89B4A" stroke-width="5"/>
        <text x="0" y="22" text-anchor="middle" font-size="60" fill="#6B4A12">${val}</text>`);
      p.setAttribute('transform', `translate(${x0 + i * gap} 690)`);
      p.dataset.val = val;
      layer.appendChild(p);
      plates.push(p);
    });

    // ── 点石头数数（他自己的工具） ──
    // 可见：按点的顺序 1、2、3……；桶里加法：加上来的接着桶上的数往后报（这就是"接着往后数"的示范）；
    // 桶里减法：数拿出去几个；十格框：框里的从1数，框外的接着框里的数往后报
    const tapped = new Map();
    let runCount = 0;
    let baseCount = 0;
    let addedCount = 0;
    function tapRock(g) {
      if (tapped.has(g)) { sayNow(`num-${tapped.get(g)}`); hop(g); return; }
      let n;
      if (mode === 'visible') n = ++runCount;
      else if (g.dataset.kind === 'added') n = (plus ? task.a : 0) + (++addedCount);
      else n = ++baseCount;
      n = Math.min(n, 20);
      tapped.set(g, n);
      light(g);
      hop(g);
      sfx.pop();
      sayNow(`num-${n}`);
    }

    // ── 提示与讲解 ──
    function strategyHint(lead) {
      const pre = lead ? [lead] : [];
      if (mode === 'visible') {
        baseRocks.forEach(g => pulse(g));
        sayNow(...pre, 'math-xianyou', `num-${task.a}`, 'math-ge-jiezhe');
      } else if (mode === 'bucket' && plus && task.a >= task.b) {
        pulse(bucket);
        sayNow(...pre, 'math-bucket-pre', `num-${task.a}`, 'math-ge-jiezhe');
      } else if (mode === 'bucket' && plus) {
        addedRocks.forEach(g => pulse(g));
        sayNow(...pre, 'math-bigfirst');
      } else if (mode === 'bucket') {
        pulse(bucket);
        addedRocks.forEach(g => pulse(g));
        sayNow(...pre, `num-${task.a}`, 'math-jian', `num-${task.b}`, 'math-dengyu-ji');
      } else {
        emptyCells.forEach(c => pulse(c));
        sayNow(...pre, 'math-couten');
      }
    }

    function revealBucket(n) {
      if (revealed) return revealed;
      bucket.style.opacity = '0.3';
      revealed = [];
      for (let i = 0; i < n; i++) {
        // 五个一排亮出来：看得出"5和几"，不用一个个数
        const g = makeRock(122 + (i % 5) * 44, 395 - Math.floor(i / 5) * 44, 18, 'base');
        g.style.pointerEvents = 'none';
        g.style.opacity = '0';
        nextFrame(() => { g.style.transition = 'opacity 0.35s'; g.style.opacity = '1'; });
        revealed.push(g);
      }
      return revealed;
    }

    async function countUp(list, from) {
      for (let k = 0; k < list.length; k++) {
        light(list[k]);
        hop(list[k]);
        sfx.pop();
        await say(`num-${Math.min(from + k + 1, 20)}`);
      }
    }

    async function walkCountOn() {
      if (mode === 'visible') {
        baseRocks.forEach(g => light(g));
        await say('math-xianyou', `num-${task.a}`, 'math-ge-jiezhe');
        await countUp(addedRocks, task.a);
      } else if (task.a >= task.b) {
        pulse(bucket);
        await say('math-bucket-pre', `num-${task.a}`, 'math-ge-jiezhe');
        await countUp(addedRocks, task.a);
      } else {
        // 桶里的是小数：先看桶外大的那堆，再把桶里的接着往后数
        await say('math-bigfirst');
        addedRocks.forEach(g => light(g));
        await say('math-xianyou', `num-${task.b}`, 'math-ge-jiezhe');
        const inside = revealBucket(task.a);
        await wait(450);
        await countUp(inside, task.b);
      }
      await say('math-yigong', `num-${task.answer}`);
    }

    async function walkTakeAway() {
      await say('math-open');
      revealBucket(task.answer);
      await wait(600);
      await say('math-haisheng', `num-${task.answer}`);
    }

    async function walkMakeTen() {
      const need = 10 - task.a;
      await say('math-couten');
      for (let k = 0; k < need && k < addedRocks.length; k++) {
        const c = cellPos(task.a + k);
        moveTo(addedRocks[k], c.x, c.y);
        if (emptyCells[k]) emptyCells[k].setAttribute('opacity', '0');
        sfx.snap();
        await wait(420);
      }
      [...baseRocks, ...addedRocks.slice(0, need)].forEach(g => light(g));
      await say('num-10');
      await countUp(addedRocks.slice(need), 10);
      await say('math-yigong', `num-${task.answer}`);
    }

    function recite() {
      return say(`num-${task.a}`, plus ? 'math-jia' : 'math-jian', `num-${task.b}`, 'math-dengyu', `num-${task.answer}`);
    }

    async function walkthrough() {
      busy = true;
      walked = true;
      try {
        if (mode === 'tenframe') await walkMakeTen();
        else if (!plus) await walkTakeAway();
        else await walkCountOn();
        await recite();
      } finally {
        busy = false;
        idle.reset();
      }
    }

    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel') || busy || finished) return;
      if (walked) {
        // 一起做过一遍还没点：这时才指一下答案
        helps += 1;
        sayNow('idle-math');
        const right = plates.find(pl => Number(pl.dataset.val) === task.answer);
        if (right) { window.__guideHand?.(right, right); pulse(right); }
        return;
      }
      if (fires === 1) {
        // 只是鼓励他慢慢想，不算求助
        sayNow('math-think');
        pulse(bucket || baseRocks[0] || addedRocks[0]);
        return;
      }
      helps += 1;
      if (fires === 2) strategyHint();
      else { sayNow('math-yiqi'); walkthrough(); }
    }, 18000);

    async function intro() {
      if (mode === 'bucket') {
        // 石头一个个掉进桶里：牌子上的数就是桶里的个数
        for (let i = 0; i < task.a; i++) {
          const g = makeRock(150 + (i % 5) * 30, 250 - Math.floor(i / 5) * 30, 16, 'base');
          g.style.pointerEvents = 'none';
          nextFrame(() => {
            g.style.transition = 'transform 0.45s ease-in, opacity 0.45s';
            g.setAttribute('transform', `translate(${BUCKET.x} ${BUCKET.y - 60}) scale(0.4)`);
            g.style.opacity = '0';
          });
          setTimeout(() => g.remove(), 520);
          sfx.pop();
          await wait(160);
        }
        await wait(500);
      } else {
        await wait(700);
      }
      say(plus ? 'math-zailai' : 'math-nazou', `num-${task.b}`);
      for (let k = 0; k < task.b; k++) {
        const p = addedPos(k);
        const g = makeRock(p.x, p.y, addedR, 'added');
        // 加法从右边飞来；减法从桶里蹦出去
        g.setAttribute('transform', plus ? 'translate(1300 250)' : `translate(${BUCKET.x} ${BUCKET.y - 80})`);
        nextFrame(() => {
          g.style.transition = 'transform 0.7s cubic-bezier(.3,.8,.4,1)';
          g.setAttribute('transform', `translate(${p.x} ${p.y})`);
        });
        setTimeout(() => { g.style.transition = ''; }, 750);
        addedRocks.push(g);
        await wait(380);
      }
      await wait(800);
      busy = false;
      idle.reset();
    }
    intro().catch(() => { busy = false; });

    function shake(p) {
      const base = p.getAttribute('transform');
      let k = 0;
      const step = () => {
        k += 1;
        p.setAttribute('transform', `${base} translate(${k % 2 ? 12 : -12} 0)`);
        if (k < 5) setTimeout(step, 80);
        else p.setAttribute('transform', base);
      };
      step();
    }

    function answer(p) {
      if (Number(p.dataset.val) === task.answer) {
        finished = true;
        sfx.cheer();
        p.querySelector('rect').setAttribute('fill', '#DFF3C8');
        sayNow('math-duila');
        finishWithRecite();
        return;
      }
      errors += 1;
      wrongs += 1;
      sfx.pop();
      shake(p);
      if (wrongs === 1) strategyHint('math-again'); // 第一次错：只给思路，不给答案
      else { sayNow('math-wrong'); walkthrough(); } // 再错：一起做一遍
    }

    function onDown(e) {
      if (finished || busy) return;
      const plate = e.target.closest('.plate');
      if (plate) { answer(plate); return; }
      const r = e.target.closest('.rock');
      if (r) { tapRock(r); return; }
      if (bucket && e.target.closest('.bucket')) { sayNow(`num-${task.a}`); pulse(bucket); }
    }

    async function finishWithRecite() {
      await recite();
      cleanup();
      setTimeout(() => {
        layer.innerHTML = '';
        resolve({ errors, helps });
      }, 500);
    }

    stage.addEventListener('pointerdown', onDown);
    function cleanup() {
      stage.removeEventListener('pointerdown', onDown);
      idle.dispose();
    }
  });
}
