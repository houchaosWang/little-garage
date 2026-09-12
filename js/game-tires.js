import { sfx, say, sayNow } from './audio.js';
import { pulse } from './guide.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};

function svgPoint(stage, clientX, clientY) {
  const pt = stage.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  return pt.matrixTransform(stage.getScreenCTM().inverse());
}

const tireHTML = `
  <g class="tire-inner">
    <circle cx="0" cy="0" r="34" fill="#3A3A38"/>
    <circle cx="0" cy="0" r="14" fill="#B9B6AD"/>
  </g>`;

// 5级起的"数出N个"：地面上一个大框（车身最低到 y≈622，框在它下面，不挡车）。
// 放进框的轮胎按 9列×2行 依次排好——整齐，也方便他回头再数一遍。容量 = taskgen 的 TIRE_RACK_MAX.count。
const BOX = { x: 150, y: 630, w: 684, h: 165, cols: 9, cellW: 76, row0: 672, rowGap: 80 };
const BOX_CAP = BOX.cols * 2;
const cellPos = i => ({
  x: BOX.x + BOX.cellW / 2 + (i % BOX.cols) * BOX.cellW,
  y: BOX.row0 + Math.floor(i / BOX.cols) * BOX.rowGap,
});
const inBoxArea = p => p.x >= BOX.x - 24 && p.x <= BOX.x + BOX.w + 24 && p.y >= BOX.y - 36 && p.y <= 800;

export function runTireGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    const counting = task.mode === 'count';
    let placed = 0;
    let helps = 0;
    let errors = 0;
    let finished = false;
    let locked = false;

    // ── 放轮胎的地方 ──
    // 1-4级：带编号的虚线圈，填满即完成；5级起：一个大框 + 左边的目标数字牌 + 右下角绿勾
    const slotY = 700;
    const slots = [];
    let hitR = 0;
    const inBox = [];
    let boxRect = null;
    let doneBtn = null;
    if (!counting) {
      const slotGap = Math.min(100, 760 / task.count);
      const ringR = Math.min(38, Math.max(24, slotGap * 0.42));
      hitR = Math.min(70, slotGap * 0.9);
      const slotX0 = 180;
      for (let i = 0; i < task.count; i++) {
        const cx = slotX0 + i * slotGap;
        const ring = el('g', {}, `
          <circle cx="${cx}" cy="${slotY}" r="${ringR}" fill="none" stroke="#C89B4A" stroke-width="5" stroke-dasharray="10 8" style="animation: pulse-ring 1.4s infinite"/>
          <text x="${cx}" y="${slotY + 10}" text-anchor="middle" font-size="${ringR >= 34 ? 30 : 24}" fill="#C89B4A">${i + 1}</text>`);
        ring.dataset.filled = '';
        ring.dataset.cx = cx;
        layer.appendChild(ring);
        slots.push(ring);
      }
    } else {
      boxRect = el('rect', {
        x: BOX.x, y: BOX.y, width: BOX.w, height: BOX.h, rx: 18,
        fill: '#FFF8EA', stroke: '#C89B4A', 'stroke-width': 6, 'stroke-dasharray': '14 10',
      });
      layer.appendChild(boxRect);
      layer.appendChild(el('g', {}, `
        <circle cx="85" cy="712" r="46" fill="#FFEDC2" stroke="#F5B324" stroke-width="5"/>
        <text x="85" y="730" text-anchor="middle" font-size="50" fill="#8A5A1F">${task.count}</text>`));
      doneBtn = el('g', { id: 'tire-done', style: 'cursor:pointer' }, `
        <circle cx="1045" cy="735" r="64" fill="none" stroke="#66BB4C" stroke-width="5" style="animation: pulse-ring 1.4s infinite"/>
        <circle cx="1045" cy="735" r="54" fill="#66BB4C" stroke="#3B6D11" stroke-width="5"/>
        <path d="M1018 736 L1038 757 L1074 714" stroke="#FFFFFF" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
      layer.appendChild(doneBtn);
    }

    // ── 轮胎架（数数模式最多18个，排3列才放得下） ──
    const cols = counting ? 3 : 2;
    const rackX = counting ? 950 : 1000, rackY0 = 170;
    const tires = [];
    for (let i = 0; i < task.rackCount; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const hx = rackX + col * 90, hy = rackY0 + row * 78;
      const t = el('g', { class: 'tire', transform: `translate(${hx} ${hy})` }, tireHTML);
      t.dataset.home = `${hx},${hy}`;
      layer.appendChild(t);
      tires.push(t);
    }
    layer.insertBefore(
      el('rect', {
        x: rackX - 60, y: rackY0 - 60, width: (cols - 1) * 90 + 120, height: Math.ceil(task.rackCount / cols) * 78 + 90,
        rx: 14, fill: 'none', stroke: '#D9CBAD', 'stroke-width': 8,
      }),
      layer.firstChild,
    );

    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel')) return;
      helps += 1;
      const freeTire = tires.find(t => !t.dataset.placed);
      if (counting) {
        sayNow('idle-tires-count');
        const more = placed < task.count;
        if (more && freeTire) window.__guideHand?.(freeTire, boxRect);
        else window.__guideHand?.(doneBtn, doneBtn);
        if (fires >= 2) pulse(more ? freeTire : doneBtn);
        return;
      }
      sayNow('idle-tires');
      const freeSlot = slots.find(s => !s.dataset.filled);
      if (freeTire && freeSlot) window.__guideHand?.(freeTire, freeSlot);
      if (fires >= 2) { const ft = tires.find(t => !t.dataset.placed); const fs = slots.find(s => !s.dataset.filled); pulse(ft); pulse(fs); }
    });

    function flyHome(g) {
      const [hx, hy] = g.dataset.home.split(',').map(Number);
      g.style.transition = 'transform 0.3s';
      g.setAttribute('transform', `translate(${hx} ${hy})`);
      setTimeout(() => { g.style.transition = ''; }, 320);
    }

    function popIn(g) {
      const inner = g.querySelector('.tire-inner');
      inner.style.animation = 'none';
      inner.getBoundingClientRect(); // 强制重排：同一个轮胎再次放入时也能重新弹一下
      inner.style.animation = 'pop 0.35s ease-out';
    }

    let drag = null;
    function onDown(e) {
      if (finished || locked) return;
      if (counting && e.target.closest('#tire-done')) { idle.reset(); check(); return; }
      if (drag) return;
      const g = e.target.closest('.tire');
      if (!g || g.dataset.placed) return;
      const p = svgPoint(stage, e.clientX, e.clientY);
      const m = /translate\(([-\d.]+)[ ,]([-\d.]+)\)/.exec(g.getAttribute('transform'));
      const cur = m ? [Number(m[1]), Number(m[2])] : g.dataset.home.split(',').map(Number);
      g.style.transition = '';
      drag = { g, dx: p.x - cur[0], dy: p.y - cur[1], id: e.pointerId };
      g.parentNode.appendChild(g);
      sfx.pop();
      idle.reset();
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const p = svgPoint(stage, e.clientX, e.clientY);
      drag.g.setAttribute('transform', `translate(${p.x - drag.dx} ${p.y - drag.dy})`);
      idle.reset();
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const p = svgPoint(stage, e.clientX, e.clientY);
      const g = drag.g;
      drag = null;
      idle.reset();
      if (locked || finished) { flyHome(g); return; }
      if (counting) {
        if (inBoxArea(p) && inBox.length < BOX_CAP) {
          const c = cellPos(inBox.length);
          inBox.push(g);
          g.dataset.placed = '1';
          g.style.transition = '';
          g.setAttribute('transform', `translate(${c.x} ${c.y})`);
          popIn(g);
          placed = inBox.length;
          sfx.snap();
          if (task.aloud) sayNow(`num-${placed}`); // 6级不报数，全靠他自己数
        } else {
          flyHome(g);
        }
        return;
      }
      const near = slots.find(s => !s.dataset.filled && Math.hypot(p.x - s.dataset.cx, p.y - slotY) < hitR);
      if (near) {
        near.dataset.filled = '1';
        g.dataset.placed = '1';
        g.setAttribute('transform', `translate(${near.dataset.cx} ${slotY})`);
        popIn(g);
        placed += 1;
        sfx.snap();
        sayNow(`num-${placed}`);
        near.querySelector('circle').style.animation = 'none';
        near.querySelector('circle').setAttribute('stroke-dasharray', 'none');
        if (placed === task.count) finish(700);
      } else {
        flyHome(g);
      }
    }

    // 按绿勾：对了就完工；少了告诉他还差几个；多了让多出来的飞回去——每题最后都以成功收尾
    function check() {
      if (placed === 0) {
        sayNow('task-tires-prefix', `num-${task.count}`, 'task-tires-suffix', 'tires-done-hint');
        return;
      }
      if (placed === task.count) {
        sayNow(`num-${task.count}`, 'math-duila');
        sfx.cheer();
        finish(1300);
        return;
      }
      errors += 1;
      if (placed < task.count) {
        sayNow('math-zailai', `num-${task.count - placed}`, 'task-tires-suffix');
        return;
      }
      locked = true;
      const extra = placed - task.count;
      sayNow('math-nazou', `num-${extra}`, 'task-tires-suffix');
      const back = inBox.splice(task.count);
      back.forEach((g, i) => setTimeout(() => { delete g.dataset.placed; flyHome(g); }, 350 + i * 200));
      placed = task.count;
      setTimeout(() => {
        sayNow(`num-${task.count}`, 'math-duila');
        sfx.cheer();
        finish(1300);
      }, 1900 + extra * 200);
    }

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    if (window.__firstTirePlay && !counting) {
      setTimeout(() => {
        say('demo-hint');
        window.__guideHand?.(tires[0], slots[0]);
      }, 800);
    }

    function finish(delay) {
      if (finished) return;
      finished = true;
      stage.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      idle.dispose();
      setTimeout(() => {
        layer.innerHTML = '';
        resolve({ errors, helps });
      }, delay);
    }
  });
}
