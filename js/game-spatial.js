import { sfx, say, sayNow } from './audio.js';
import { pulse } from './guide.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};

// 方位（依据见 taskgen.js 的 SPATIAL_LEVELS 注释：指南目标3 + 空间语言训练研究）。
// 听一句"把 小扳手 放到 车的 上面"，把东西拖过去。车在升降机上，所以"下面"看得见；
// 车头朝左、有车灯——车灯那边是"前面"。左右用对称的工具箱做参照，免得"左边"和"前面"打架。
// 布局：场景在左侧（车身从 x≈480、y≈465 开始），物品托盘在地面，都不挡车。
const CAR_SCENE = `
  <rect x="206" y="372" width="188" height="12" rx="4" fill="#8F8C84"/>
  <rect x="210" y="384" width="14" height="88" fill="#8F8C84"/><rect x="376" y="384" width="14" height="88" fill="#8F8C84"/>
  <rect x="190" y="470" width="220" height="10" rx="4" fill="#6D6A63"/>
  <rect x="200" y="300" width="200" height="52" rx="14" fill="#3E8EE0"/>
  <path d="M212 300 L230 262 L292 262 L300 300 Z" fill="#3E8EE0"/>
  <path d="M232 296 L244 270 L286 270 L292 296 Z" fill="#DDF1FF"/>
  <circle class="headlight" cx="205" cy="322" r="10" fill="#FFE066" stroke="#C89B4A" stroke-width="2"/>
  <rect x="391" y="312" width="9" height="18" rx="3" fill="#E8493F"/>
  <circle cx="245" cy="354" r="20" fill="#3A3A38"/><circle cx="355" cy="354" r="20" fill="#3A3A38"/>
  <circle cx="245" cy="354" r="8" fill="#B9B6AD"/><circle cx="355" cy="354" r="8" fill="#B9B6AD"/>`;
const BOX_SCENE = `
  <path d="M214 352 L228 318 L352 318 L366 352 Z" fill="#8F4A24"/>
  <rect x="210" y="350" width="160" height="80" rx="8" fill="#E8763A" stroke="#A3521B" stroke-width="5"/>
  <rect x="270" y="364" width="40" height="10" rx="4" fill="#A3521B"/>`;
const ZONES = {
  car: {
    up: [205, 195, 395, 258], down: [228, 388, 372, 466], front: [95, 262, 195, 392], back: [405, 262, 520, 392],
  },
  box: {
    in: [214, 300, 366, 428], left: [95, 300, 205, 440], right: [375, 300, 485, 440],
  },
};
const PLAY = [60, 190, 560, 480];
const inRect = (p, r) => p.x >= r[0] && p.x <= r[2] && p.y >= r[1] && p.y <= r[3];
const center = r => ({ x: (r[0] + r[2]) / 2, y: (r[1] + r[3]) / 2 });
const ICON = {
  wrench: `<g transform="rotate(-35)"><rect x="-6" y="-22" width="12" height="44" rx="5" fill="#8F8C84"/><path d="M-15 -26 A15 15 0 1 1 15 -26 L7 -26 L7 -36 L-7 -36 L-7 -26 Z" fill="#8F8C84"/></g>`,
  tire: `<circle cx="0" cy="0" r="22" fill="#3A3A38"/><circle cx="0" cy="0" r="9" fill="#B9B6AD"/>`,
  can: `<rect x="-16" y="-20" width="32" height="40" rx="6" fill="#E8493F"/><rect x="-6" y="-28" width="12" height="9" rx="3" fill="#A32D2D"/><rect x="-16" y="-6" width="32" height="8" fill="#F5B324"/>`,
  flag: `<rect x="-2" y="-28" width="4" height="52" fill="#6B4A12"/><path d="M2 -28 L30 -18 L2 -8 Z" fill="#3E8EE0"/>`,
};
const TRAY = [{ x: 150, y: 705 }, { x: 290, y: 705 }];
const HINT = { front: 'sp-front-hint', left: 'sp-left-hint', right: 'sp-right-hint' };

export function runSpatialGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    const zones = ZONES[task.scene];
    const ref = task.scene === 'car' ? 'ref-car' : 'ref-box';
    let errors = 0;
    let helps = 0;
    let finished = false;
    let round = 0;
    let items = [];
    let placedGroup = null;

    const svgPoint = e => {
      const pt = stage.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(stage.getScreenCTM().inverse());
    };
    layer.appendChild(el('g', {}, task.scene === 'car' ? CAR_SCENE : BOX_SCENE));
    const headlight = layer.querySelector('.headlight');

    function zoneOf(p) {
      for (const [w, r] of Object.entries(zones)) if (inRect(p, r)) return w;
      if (task.scene === 'box' && inRect(p, PLAY)) return 'out';
      return null;
    }
    const fits = (word, z) => word === z || (word === 'side' && (z === 'left' || z === 'right'))
      || (word === 'out' && (z === 'out' || z === 'left' || z === 'right'));
    // "外面"放哪里都行（不在箱子里就算）；"旁边"要挨着。提示时圈出一个最典型的位置
    const zoneRectFor = word => zones[word] || (word === 'side' || word === 'out' ? zones.left : null);

    const instr = step => ['sp-ba', `obj-${step.obj}`, 'sp-fangdao', ref, `pos-${step.word}`];
    function speakRound() {
      const steps = task.rounds[round];
      // 第一轮排在客人开场白后面说（不打断）；之后每轮立即说
      const speak = round === 0 ? say : sayNow;
      if (task.map) { if (round > 0) sayNow('task-sp-map'); return; } // 第一轮的"照着小图摆"已在任务语音里
      if (steps.length === 1) speak(...instr(steps[0]));
      else speak('sp-first', ...instr(steps[0]), 'sp-then', ...instr(steps[1]));
    }

    let mapCard = null;
    function drawMap() {
      if (mapCard) mapCard.remove();
      // 小示意图：同一个场景缩小，东西画在要放的位置上（5-6岁"根据简单示意图取放物品"）
      const icons = task.rounds[round].map(s => { const c = center(zones[s.word]); return `<g transform="translate(${c.x} ${c.y})">${ICON[s.obj]}</g>`; }).join('');
      mapCard = el('g', {}, `
        <rect x="560" y="206" width="210" height="128" rx="14" fill="#FFF8EA" stroke="#C89B4A" stroke-width="4"/>
        <g transform="translate(560 206) scale(0.4) translate(-60 -170)">${task.scene === 'car' ? CAR_SCENE : BOX_SCENE}${icons}</g>`);
      layer.appendChild(mapCard);
    }

    function startRound() {
      if (placedGroup) placedGroup.remove();
      placedGroup = el('g', {});
      layer.appendChild(placedGroup);
      items = task.rounds[round].map((s, i) => {
        const g = el('g', { class: 'sp-item', transform: `translate(${TRAY[i].x} ${TRAY[i].y})`, style: 'cursor:grab' }, `
          <circle cx="0" cy="0" r="40" fill="#FFF8EA" stroke="#C89B4A" stroke-width="4"/>${ICON[s.obj]}`);
        g.dataset.i = i;
        g.dataset.home = `${TRAY[i].x},${TRAY[i].y}`;
        layer.appendChild(g);
        return { g, step: s, done: false, tries: 0 };
      });
      if (task.map) drawMap();
      speakRound();
      idle.reset();
    }

    function flyBack(it) {
      const [hx, hy] = it.g.dataset.home.split(',').map(Number);
      it.g.style.transition = 'transform 0.3s';
      it.g.setAttribute('transform', `translate(${hx} ${hy})`);
      setTimeout(() => { it.g.style.transition = ''; }, 320);
    }
    function showZone(word) {
      const r = zoneRectFor(word);
      if (!r) return;
      const z = el('rect', { x: r[0], y: r[1], width: r[2] - r[0], height: r[3] - r[1], rx: 12, fill: 'rgba(245,179,36,0.18)', stroke: '#F5B324', 'stroke-width': 4, 'stroke-dasharray': '10 8' });
      layer.appendChild(z);
      pulse(z);
      setTimeout(() => z.remove(), 2600);
    }

    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel') || finished) return;
      const it = items.find(x => !x.done);
      if (!it) return;
      if (fires === 1) { sayNow('sp-idle', ...(task.map ? [] : instr(it.step))); return; } // 再说一遍，不算求助
      helps += 1;
      if (fires === 2) { showZone(it.step.word); return; }
      const r = zoneRectFor(it.step.word);
      const dot = el('circle', { cx: center(r).x, cy: center(r).y, r: 6, fill: 'none' });
      layer.appendChild(dot);
      window.__guideHand?.(it.g, dot);
      setTimeout(() => dot.remove(), 3000);
    }, 18000);

    let drag = null;
    function onDown(e) {
      if (finished || drag) return;
      const g = e.target.closest('.sp-item');
      if (!g) return;
      const it = items[Number(g.dataset.i)];
      if (!it || it.done) return;
      const p = svgPoint(e);
      const m = /translate\(([-\d.]+)[ ,]([-\d.]+)\)/.exec(g.getAttribute('transform'));
      g.style.transition = '';
      drag = { it, dx: p.x - Number(m[1]), dy: p.y - Number(m[2]), id: e.pointerId };
      g.parentNode.appendChild(g);
      sfx.pop();
      idle.reset();
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const p = svgPoint(e);
      drag.it.g.setAttribute('transform', `translate(${p.x - drag.dx} ${p.y - drag.dy})`);
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const p = svgPoint(e);
      const { it } = drag;
      drag = null;
      idle.reset();
      if (finished) return;
      const z = zoneOf(p);
      if (!z) { flyBack(it); return; } // 放到场景外：不算错，回托盘
      if (fits(it.step.word, z)) {
        it.done = true;
        const c = zones[z] ? center(zones[z]) : p;
        it.g.style.transition = 'transform 0.2s';
        it.g.setAttribute('transform', `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`);
        setTimeout(() => { it.g.style.transition = ''; }, 220);
        it.g.querySelector('circle').setAttribute('stroke', '#66BB4C');
        placedGroup.appendChild(it.g);
        sfx.snap();
        if (items.every(x => x.done)) {
          sayNow('sp-good');
          round += 1;
          if (round >= task.rounds.length) {
            finished = true;
            cleanup();
            sfx.cheer();
            setTimeout(() => { layer.innerHTML = ''; resolve({ errors, helps }); }, 1200);
          } else {
            setTimeout(startRound, 1300);
          }
        }
        return;
      }
      errors += 1;
      it.tries += 1;
      flyBack(it);
      sfx.pop();
      if (it.tries >= 2) {
        // 第二次放错：圈出该放的地方，前后左右再加一句提示
        showZone(it.step.word);
        if (HINT[it.step.word]) {
          sayNow(HINT[it.step.word], ...instr(it.step));
          if (it.step.word === 'front' && headlight) pulse(headlight);
          return;
        }
      }
      sayNow('sp-wrong', ...(task.map ? [] : instr(it.step)));
    }
    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    function cleanup() {
      stage.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      idle.dispose();
    }

    startRound();
  });
}
