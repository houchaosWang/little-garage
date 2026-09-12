import { sfx, say, sayNow } from './audio.js';
import { pulse } from './guide.js';
import { PALETTE } from './vehicles.js';
import { carSvg } from './game-numline.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};
const wait = ms => new Promise(r => setTimeout(r, ms));

// 停车场故事题（依据见 taskgen.js 的 STORY_LEVELS 注释：CGI 四类情境 + 指南 + 人教版一下）。
// 讲故事时画面同步演：车开进来、开出去、藏在车库里、帘子遮住又拉开、两排一辆对一辆。
// 气泡里不写算式——选"加还是减"本身就是要他想的；做完才亮出算式并念一遍。
// 布局：停车场在车的上方偏左（车身从 x≈480、y≈465 开始），入口在右边，选项在地面。
const LOT = { x0: 250, y0: 290, cols: 5, cw: 80, rh: 74 };
const spot = i => ({ x: LOT.x0 + 40 + (i % LOT.cols) * LOT.cw, y: LOT.y0 + 40 + Math.floor(i / LOT.cols) * LOT.rh });
const ROW = { x0: 270, step: 46, red: 330, blue: 404 };
const GATE = { x: 760, y: 367 };
const SHED = { x: 70, y: 262, w: 160, h: 186 };
const inShed = i => ({ x: SHED.x + 45 + (i % 2) * 70, y: SHED.y + 60 + Math.floor(i / 2) * 26 });

export function runStoryGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    const k = task.kind;
    const comparing = k === 'compare' || k === 'compareq';
    const color = PALETTE[customer.color] || '#3E8EE0';
    const RED = PALETTE.red || '#E8493F';
    const BLUE = PALETTE.blue || '#3E8EE0';
    let errors = 0;
    let helps = 0;
    let wrongs = 0;
    let finished = false;
    let busy = true; // 第一遍故事讲完之前不出选项
    let walked = false;
    let tellToken = 0;

    // ── 场景 ──
    if (!comparing) {
      layer.appendChild(el('rect', { x: LOT.x0, y: LOT.y0, width: LOT.cols * LOT.cw, height: 2 * LOT.rh + 6, rx: 12, fill: '#9A9A96' }));
      let lines = '';
      for (let c = 0; c <= LOT.cols; c++) lines += `<line x1="${LOT.x0 + c * LOT.cw}" y1="${LOT.y0 + 6}" x2="${LOT.x0 + c * LOT.cw}" y2="${LOT.y0 + 2 * LOT.rh}" stroke="#F4F1E8" stroke-width="3"/>`;
      lines += `<line x1="${LOT.x0}" y1="${LOT.y0 + LOT.rh + 3}" x2="${LOT.x0 + LOT.cols * LOT.cw}" y2="${LOT.y0 + LOT.rh + 3}" stroke="#F4F1E8" stroke-width="3"/>`;
      layer.appendChild(el('g', {}, lines));
      layer.appendChild(el('rect', { x: LOT.x0 + LOT.cols * LOT.cw, y: GATE.y - 22, width: GATE.x - (LOT.x0 + LOT.cols * LOT.cw) + 40, height: 44, fill: '#9A9A96' }));
    }
    let door = null;
    if (k === 'hidden') {
      layer.appendChild(el('g', {}, `
        <path d="M${SHED.x - 10} ${SHED.y + 10} L${SHED.x + SHED.w / 2} ${SHED.y - 40} L${SHED.x + SHED.w + 10} ${SHED.y + 10} Z" fill="#C9674A"/>
        <rect x="${SHED.x}" y="${SHED.y + 10}" width="${SHED.w}" height="${SHED.h - 10}" fill="#E8D9B8" stroke="#A97B4F" stroke-width="5"/>
        <rect x="${SHED.x + 14}" y="${SHED.y + 32}" width="${SHED.w - 28}" height="${SHED.h - 40}" fill="#6B5A48"/>`));
    }
    const carsLayer = el('g', {});
    layer.appendChild(carsLayer);
    if (k === 'hidden') {
      door = el('rect', { x: SHED.x + 14, y: SHED.y + 32, width: SHED.w - 28, height: SHED.h - 40, fill: '#D9A441', stroke: '#A97B4F', 'stroke-width': 4 });
      layer.appendChild(door);
      for (let s = 1; s < 6; s++) layer.appendChild(el('line', { x1: SHED.x + 16, y1: SHED.y + 32 + s * 24, x2: SHED.x + SHED.w - 16, y2: SHED.y + 32 + s * 24, stroke: '#A97B4F', 'stroke-width': 2, class: 'door-line' }));
    }

    function makeCar(c, x, y, scale = 1) {
      const g = el('g', { transform: `translate(${x} ${y})` }, `<g transform="scale(${scale})">${carSvg(c)}</g>`);
      carsLayer.appendChild(g);
      return g;
    }
    function moveCar(g, x, y, ms) {
      g.style.transition = `transform ${ms}ms cubic-bezier(.3,.8,.4,1), opacity ${ms}ms`;
      g.setAttribute('transform', `translate(${x} ${y})`);
      setTimeout(() => { g.style.transition = ''; }, ms + 30);
    }
    const lightCar = (g, on = true) => g.querySelectorAll('rect').forEach((r, i) => { if (i < 2) r.setAttribute('stroke', on ? '#F5B324' : 'none'); r.setAttribute('stroke-width', on ? 6 : 0); });
    function badge(x, y, text) {
      const g = el('g', { transform: `translate(${x} ${y})` }, `<rect x="-46" y="-30" width="92" height="60" rx="16" fill="#FFEDC2" stroke="#F5B324" stroke-width="4"/><text x="0" y="14" text-anchor="middle" font-size="38" fill="#8A5A1F">${text}</text>`);
      layer.appendChild(g);
      return g;
    }

    // 每一类故事：分几步讲，每步一句话 + 画面动作（第一次讲）/ 高亮（重讲）
    const groupA = [];
    const groupB = [];
    let hiddenCars = [];
    let tarp = null;
    const n = v => `num-${v}`;
    async function parkNow(from, count, list, c = color) {
      for (let i = 0; i < count; i++) { const p = spot(from + i); list.push(makeCar(c, p.x, p.y)); }
    }
    async function driveIn(from, count, list, c = color) {
      for (let i = 0; i < count; i++) {
        const p = spot(from + i);
        const g = makeCar(c, GATE.x, GATE.y);
        list.push(g);
        requestAnimationFrame(() => requestAnimationFrame(() => moveCar(g, p.x, p.y, 700)));
        sfx.pop();
        await wait(360);
      }
      await wait(500);
    }
    async function driveOut(list) {
      for (const g of list) {
        moveCar(g, GATE.x, GATE.y, 700);
        g.style.opacity = '0';
        sfx.pop();
        await wait(360);
      }
      await wait(500);
    }
    function row(count, y, c) {
      const list = [];
      for (let i = 0; i < count; i++) list.push(makeCar(c, ROW.x0 + i * ROW.step, y, 0.7));
      return list;
    }
    function steps() {
      switch (k) {
        case 'join': return [
          { voice: ['st-have-pre', n(task.x), 'st-cars'], act: () => parkNow(0, task.x, groupA), hi: () => groupA.forEach(pulse) },
          { voice: ['st-comein', n(task.y), 'st-liang'], act: () => driveIn(task.x, task.y, groupB), hi: () => groupB.forEach(pulse) },
          { voice: ['st-q-total'] },
        ];
        case 'separate': return [
          { voice: ['st-have-pre', n(task.x), 'st-cars'], act: () => parkNow(0, task.x, groupA), hi: () => groupA.forEach(pulse) },
          {
            voice: ['st-leave', n(task.y), 'st-liang'],
            act: () => { const leaving = groupA.splice(task.x - task.y); groupB.push(...leaving); return driveOut(leaving); },
          },
          { voice: ['st-q-left'] },
        ];
        case 'hidden': return [
          { voice: ['st-total-pre', n(task.x), 'st-cars'], act: () => { badge(160, 214, `共${task.x}`); }, hi: () => pulse(door) },
          { voice: ['st-outside', n(task.y), 'st-liang'], act: () => driveIn(0, task.y, groupA), hi: () => groupA.forEach(pulse) },
          { voice: ['st-q-hidden'], hi: () => pulse(door) },
        ];
        case 'change': return [
          { voice: ['st-have-pre', n(task.x), 'st-cars'], act: () => parkNow(0, task.x, groupA), hi: () => groupA.forEach(pulse) },
          {
            voice: ['st-some'],
            act: async () => {
              // 帘子落下来遮住停车场，开进来的是一样颜色的车——看不出"哪几辆是新的"，得自己推
              const curtain = el('rect', { x: LOT.x0 - 6, y: LOT.y0 - 6, width: LOT.cols * LOT.cw + 12, height: 2 * LOT.rh + 18, rx: 14, fill: '#C9674A', opacity: '0' });
              layer.appendChild(curtain);
              curtain.style.transition = 'opacity 0.4s';
              requestAnimationFrame(() => requestAnimationFrame(() => { curtain.style.opacity = '1'; }));
              await wait(500);
              await parkNow(task.x, task.y, groupB);
              await wait(600);
              curtain.style.opacity = '0';
              await wait(450);
              curtain.remove();
            },
          },
          { voice: ['st-now', n(task.z), 'st-liang'], act: () => { badge(LOT.x0 + LOT.cols * LOT.cw / 2, LOT.y0 - 40, `${task.z}`); }, hi: () => [...groupA, ...groupB].forEach(pulse) },
          { voice: ['st-q-came'] },
        ];
        case 'compare': return [
          { voice: ['st-red', n(task.x), 'st-liang'], act: () => { groupA.push(...row(task.x, ROW.red, RED)); }, hi: () => groupA.forEach(pulse) },
          { voice: ['st-blue', n(task.y), 'st-liang'], act: () => { groupB.push(...row(task.y, ROW.blue, BLUE)); }, hi: () => groupB.forEach(pulse) },
          { voice: ['st-q-more'] },
        ];
        default: return [
          { voice: ['st-red', n(task.x), 'st-liang'], act: () => { groupA.push(...row(task.x, ROW.red, RED)); }, hi: () => groupA.forEach(pulse) },
          {
            voice: [task.more ? 'st-bluemore' : 'st-blueless', n(task.y), 'st-liang'],
            act: () => {
              groupB.push(...row(task.z, ROW.blue, BLUE));
              tarp = el('g', {}, `<rect x="${ROW.x0 - 34}" y="${ROW.blue - 30}" width="${10 * ROW.step + 24}" height="62" rx="14" fill="#8A9BB0"/>
                <text x="${ROW.x0 + 4.5 * ROW.step}" y="${ROW.blue + 14}" text-anchor="middle" font-size="40" fill="#FFFFFF">${task.more ? '+' : '−'}${task.y}</text>`);
              layer.appendChild(tarp);
            },
            hi: () => tarp && pulse(tarp),
          },
          { voice: ['st-q-blue'] },
        ];
      }
    }
    async function tell(first, fromHint = false) {
      const my = ++tellToken;
      for (const s of steps()) {
        if (my !== tellToken || finished) return;
        if (first && s.act) await s.act();
        else if (!first && s.hi) s.hi();
        await say(...s.voice);
      }
      if (first) { showPlates(); busy = false; }
      // 提示触发的重讲只重新计时、不清零——清零的话永远到不了"一起摆一摆"
      if (my === tellToken) { if (fromHint) idle.rearm(); else idle.reset(); }
    }

    // ── 算式与讲解（示范：接着数 / 打开车库 / 一辆对一辆） ──
    let eqShown = false;
    function showEquation() {
      if (eqShown) return;
      eqShown = true;
      layer.appendChild(el('text', { x: 270, y: 560, 'text-anchor': 'middle', 'font-size': 58, fill: '#6B4A12' },
        `${task.x} ${task.op === '+' ? '+' : '−'} ${task.y} = ${task.z}`));
    }
    const recite = () => say(n(task.x), task.op === '+' ? 'math-jia' : 'math-jian', n(task.y), 'math-dengyu', n(task.z));
    async function countOn(list, from) {
      for (let i = 0; i < list.length; i++) {
        lightCar(list[i]);
        pulse(list[i]);
        await say(n(Math.min(from + i + 1, 20)));
      }
    }
    async function walkthrough() {
      busy = true;
      walked = true;
      ++tellToken;
      try {
        if (k === 'join') {
          groupA.forEach(g => lightCar(g));
          await say('math-xianyou', n(task.x), 'math-ge-jiezhe');
          await countOn(groupB, task.x);
        } else if (k === 'separate') {
          await countOn(groupA, 0);
          await say('math-haisheng', n(task.z));
        } else if (k === 'hidden') {
          await say('st-open');
          door.style.transition = 'opacity 0.5s';
          door.style.opacity = '0';
          layer.querySelectorAll('.door-line').forEach(l => { l.style.opacity = '0'; });
          hiddenCars = Array.from({ length: task.z }, (_, i) => { const p = inShed(i); return makeCar(color, p.x, p.y, 0.55); });
          await wait(600);
          await countOn(hiddenCars, 0);
        } else if (k === 'change') {
          await countOn(groupB, 0);
        } else if (k === 'compare') {
          await say('st-pair');
          for (let i = 0; i < task.y; i++) {
            layer.appendChild(el('line', { x1: ROW.x0 + i * ROW.step, y1: ROW.red + 16, x2: ROW.x0 + i * ROW.step, y2: ROW.blue - 18, stroke: '#6B4A12', 'stroke-width': 3 }));
          }
          await wait(500);
          await countOn(groupA.slice(task.y), 0);
        } else {
          tarp.style.transition = 'opacity 0.5s';
          tarp.style.opacity = '0';
          await wait(600);
          if (task.more) {
            groupB.slice(0, task.x).forEach(g => lightCar(g));
            await say('math-xianyou', n(task.x), 'math-ge-jiezhe');
            await countOn(groupB.slice(task.x), task.x);
          } else {
            await countOn(groupB, 0);
          }
        }
        showEquation();
        await recite();
      } finally {
        busy = false;
        idle.reset();
      }
    }

    // ── 选项 ──
    let plates = [];
    function showPlates() {
      plates = task.options.map((v, i) => {
        const pl = el('g', { class: 'plate', transform: `translate(${430 + i * 170} 690)`, style: 'cursor:pointer' }, `
          <rect x="-62" y="-52" width="124" height="104" rx="18" fill="#FFF8EA" stroke="#C89B4A" stroke-width="5"/>
          <text x="0" y="22" text-anchor="middle" font-size="60" fill="#6B4A12">${v}</text>`);
        pl.dataset.val = v;
        layer.appendChild(pl);
        return pl;
      });
    }
    function shake(p) {
      const base = p.getAttribute('transform');
      let i = 0;
      const stepFn = () => {
        i += 1;
        p.setAttribute('transform', `${base} translate(${i % 2 ? 12 : -12} 0)`);
        if (i < 5) setTimeout(stepFn, 80);
        else p.setAttribute('transform', base);
      };
      stepFn();
    }
    async function answer(pl) {
      ++tellToken; // 正在重讲故事就打断：孩子的动作优先
      if (Number(pl.dataset.val) === task.answer) {
        finished = true;
        sfx.cheer();
        pl.querySelector('rect').setAttribute('fill', '#DFF3C8');
        showEquation();
        sayNow('math-duila');
        await recite();
        cleanup();
        setTimeout(() => { layer.innerHTML = ''; resolve({ errors, helps }); }, 600);
        return;
      }
      errors += 1;
      wrongs += 1;
      sfx.pop();
      shake(pl);
      if (wrongs === 1 && !walked) { sayNow('st-again'); await wait(1300); tell(false); } // 第一次错：再听一遍故事
      else if (!walked) { sayNow('math-wrong'); walkthrough(); } // 再错：一起摆一摆、数一数
      else sayNow('math-again');
    }

    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel') || busy || finished) return;
      if (walked) {
        helps += 1;
        const right = plates.find(p => Number(p.dataset.val) === task.answer);
        if (right) { window.__guideHand?.(right, right); pulse(right); }
        return;
      }
      if (fires === 1) { sayNow('st-idle'); return; } // 只是提醒回想，不算求助
      helps += 1;
      if (fires === 2) { sayNow('st-again'); setTimeout(() => tell(false, true), 1300); return; }
      sayNow('math-yiqi');
      walkthrough();
    }, 18000);

    function onDown(e) {
      if (finished || busy) return;
      const pl = e.target.closest('.plate');
      if (pl) answer(pl);
    }
    stage.addEventListener('pointerdown', onDown);
    function cleanup() {
      stage.removeEventListener('pointerdown', onDown);
      idle.dispose();
    }

    tell(true).catch(() => { busy = false; showPlates(); });
  });
}
