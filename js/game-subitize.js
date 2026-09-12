import { sfx, say, sayNow } from './audio.js';
import { pulse } from './guide.js';
import { SCATTER_BOX } from './taskgen.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};
const wait = ms => new Promise(r => setTimeout(r, ms));

// 闪灯看数（速视）。灯只亮一下，来不及一个个数，只能"一眼看出来"。
// 依据：Clements & Sarama 速视学习路径——感知性速视（≤4，随意摆）→ 概念性速视（骰子点、十格阵，
// 看出"5和几"）→ 用速视做加法（两组合起来）→ 十格阵看"还差几个满十"（凑十的基础）。
// 数数时直线最容易，速视时有结构的图案最容易——所以这里除1级外都用结构化的摆法。
// 仪表盘在左边（车身从 x≈480、y≈465 开始，面板不挡车）。
const PANEL = { x: 110, y: 230, w: 440, h: 230 };
const R = 24;
const ON = '#FFC83D';
const OFF = '#4E4B45';
const tenCell = i => ({ x: PANEL.x + 80 + (i % 5) * 70, y: PANEL.y + 80 + Math.floor(i / 5) * 72 });
// 骰子点要一眼认得出：点距44（斜对角两灯间留14px），骰子框152
const DIE = { size: 152, pip: 44 };
function pips(k, cx, cy) {
  const d = DIE.pip;
  const P = { c: [0, 0], tl: [-d, -d], tr: [d, -d], bl: [-d, d], br: [d, d], ml: [-d, 0], mr: [d, 0] };
  const sets = { 1: ['c'], 2: ['tl', 'br'], 3: ['tl', 'c', 'br'], 4: ['tl', 'tr', 'bl', 'br'], 5: ['tl', 'tr', 'c', 'bl', 'br'], 6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'] };
  return sets[k].map(key => ({ x: cx + P[key][0], y: cy + P[key][1] }));
}
const EYE = { x: 660, y: 330 };
const eyeSvg = `
  <circle cx="0" cy="0" r="50" fill="#FFF8EA" stroke="#C89B4A" stroke-width="5"/>
  <path d="M-32 0 Q0 -28 32 0 Q0 28 -32 0 Z" fill="#FFFFFF" stroke="#6B4A12" stroke-width="4"/>
  <circle cx="0" cy="0" r="11" fill="#6B4A12"/>`;

export function runSubitizeGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    const tenLike = task.layout === 'ten' || task.layout === 'five';
    let errors = 0;
    let helps = 0;
    let wrongs = 0;
    let looks = 0;
    let finished = false;
    let busy = false;
    let answered = false; // 是否已经看过至少一眼（看过才出选项）
    let explained = false;

    // ── 仪表盘 ──
    layer.appendChild(el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 26, fill: '#2F3B4A', stroke: '#8A9BB0', 'stroke-width': 8 }));
    const lights = []; // 这一题会亮的灯
    const sockets = []; // 十格阵的空位（亮不亮都看得见，结构本身就是要学的东西）
    let dieBoxes = [];
    if (tenLike) {
      layer.appendChild(el('rect', { x: PANEL.x + 42, y: PANEL.y + 42, width: 356, height: 148, rx: 12, fill: 'none', stroke: '#8A9BB0', 'stroke-width': 3 }));
      for (let i = 0; i < 10; i++) {
        const p = tenCell(i);
        const c = el('circle', { cx: p.x, cy: p.y, r: R, fill: OFF, stroke: '#6D7A8C', 'stroke-width': 3 });
        layer.appendChild(c);
        if (i < task.n) lights.push(c); else sockets.push(c);
      }
    } else {
      let spots;
      if (task.layout === 'scatter') {
        spots = task.spots.map(([sx, sy]) => ({
          x: PANEL.x + (PANEL.w - SCATTER_BOX.w) / 2 + sx * SCATTER_BOX.w,
          y: PANEL.y + (PANEL.h - SCATTER_BOX.h) / 2 + sy * SCATTER_BOX.h,
        }));
      } else if (task.layout === 'dice') {
        dieBoxes = [{ cx: 330, cy: 345 }];
        spots = pips(task.n, 330, 345);
      } else {
        dieBoxes = [{ cx: 225, cy: 345 }, { cx: 435, cy: 345 }];
        spots = [...pips(task.parts[0], 225, 345), ...pips(task.parts[1], 435, 345)];
      }
      dieBoxes = dieBoxes.map(d => {
        const s = DIE.size;
        const box = el('rect', { x: d.cx - s / 2, y: d.cy - s / 2, width: s, height: s, rx: 18, fill: 'none', stroke: '#8A9BB0', 'stroke-width': 3 });
        layer.appendChild(box);
        return box;
      });
      for (const p of spots) {
        const c = el('circle', { cx: p.x, cy: p.y, r: R, fill: ON });
        c.style.opacity = '0';
        layer.appendChild(c);
        lights.push(c);
      }
    }
    function show(on) {
      for (const c of lights) {
        if (tenLike) c.setAttribute('fill', on ? ON : OFF);
        else c.style.opacity = on ? '1' : '0';
      }
    }

    const eye = el('g', { class: 'sub-eye', transform: `translate(${EYE.x} ${EYE.y})`, style: 'cursor:pointer' }, eyeSvg);
    layer.appendChild(eye);

    // 选项：看过一眼之后才出现
    const plates = [];
    task.options.forEach((val, i) => {
      const p = el('g', { class: 'plate', style: 'cursor:pointer' }, `
        <rect x="-62" y="-52" width="124" height="104" rx="18" fill="#FFF8EA" stroke="#C89B4A" stroke-width="5"/>
        <text x="0" y="22" text-anchor="middle" font-size="60" fill="#6B4A12">${val}</text>`);
      p.setAttribute('transform', `translate(${430 + i * 170} 690)`);
      p.dataset.val = val;
      p.style.visibility = 'hidden';
      layer.appendChild(p);
      plates.push(p);
    });

    async function flash({ free = false, hint = false } = {}) {
      if (busy || finished) return;
      busy = true;
      looks += 1;
      if (looks > 1 && !free) helps += 1; // 第一眼不算；自己要求多看一眼算一次求助
      sfx.pop();
      show(true);
      await wait(task.ms);
      if (!explained) show(false);
      busy = false;
      if (!answered) { answered = true; plates.forEach(p => { p.style.visibility = 'visible'; }); }
      if (hint) idle.rearm(); else idle.reset(); // 提示触发的重播不清零，下一级才会讲结构
    }

    // "说出结构"：五和二是七 / 三和四一共是七 / 七和三凑成十
    function structure() {
      const n = task.n;
      if (task.ask === 'sum') return [`num-${task.parts[0]}`, 'sub-he', `num-${task.parts[1]}`, 'math-yigong', `num-${n}`];
      if (task.ask === 'complement') return [`num-${n}`, 'sub-he', `num-${10 - n}`, 'sub-couten'];
      if (tenLike && n > 5) return ['num-5', 'sub-he', `num-${n - 5}`, 'sub-shi', `num-${n}`];
      return [`num-${n}`];
    }
    async function explain() {
      explained = true;
      busy = true;
      show(true);
      if (task.ask === 'complement') sockets.forEach(c => pulse(c));
      else if (task.ask === 'sum') dieBoxes.forEach(b => pulse(b));
      else if (tenLike && task.n > 5) lights.slice(0, 5).forEach(c => pulse(c));
      await say(...structure());
      busy = false;
      idle.reset();
    }

    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel') || busy || finished) return;
      if (!answered) {
        // 还没点过眼睛：只是提醒怎么玩，不算求助
        sayNow('sub-eye');
        pulse(eye);
        if (fires >= 2) window.__guideHand?.(eye, eye);
        return;
      }
      if (fires === 1 && !explained) { sayNow('sub-idle'); return; } // 鼓励回想，不算求助
      helps += 1;
      if (!explained && fires === 2) { sayNow('sub-again'); setTimeout(() => flash({ free: true, hint: true }), 900); return; }
      if (!explained) { explain(); return; }
      const right = plates.find(p => Number(p.dataset.val) === task.answer);
      if (right) { window.__guideHand?.(right, right); pulse(right); }
    }, 18000);

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

    async function onDown(e) {
      if (finished || busy) return;
      if (e.target.closest('.sub-eye')) { flash(); return; }
      const p = e.target.closest('.plate');
      if (!p || !answered) return;
      if (Number(p.dataset.val) === task.answer) {
        finished = true;
        sfx.cheer();
        p.querySelector('rect').setAttribute('fill', '#DFF3C8');
        show(true);
        sayNow('math-duila');
        await say(...structure());
        cleanup();
        setTimeout(() => { layer.innerHTML = ''; resolve({ errors, helps }); }, 500);
        return;
      }
      errors += 1;
      wrongs += 1;
      sfx.pop();
      shake(p);
      if (wrongs === 1 && !explained) { sayNow('sub-again'); setTimeout(() => flash({ free: true }), 900); } // 第一次错：再看一次
      else if (!explained) explain(); // 再错：亮着讲清楚结构
      else sayNow('math-again');
    }

    stage.addEventListener('pointerdown', onDown);
    function cleanup() {
      stage.removeEventListener('pointerdown', onDown);
      idle.dispose();
    }
    // 开场提醒点眼睛（任务语音之后排队）
    say('sub-eye');
    pulse(eye);
  });
}
