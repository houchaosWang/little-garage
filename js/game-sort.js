import { sfx, say, sayNow } from './audio.js';
import { pulse } from './guide.js';
import { shapeSvg } from './game-shapes.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};

// 零件分拣（依据见 taskgen.js 的 SORT_LEVELS 注释：指南"分类" + DCCS 规则切换）。
// 零件一件一件出现（DCCS 就是一张一张卡地分），拖进筐里。筐上的目标卡按经典 DCCS 同时画出颜色和形状，
// 换规则时目标卡不变、只换"说法"——难就难在这里。
// 布局：出料台在左上，筐在地面（车身最低到 y≈622，筐在它下面），不挡车。
const COLORS = { red: '#E8493F', blue: '#3E8EE0', yellow: '#F5B324', green: '#66BB4C' };
const SIZE = { big: 32, mid: 26, small: 17 };
const START = { x: 220, y: 335 };
const BIN_TOP = 640;
const BIN_H = 140;
const RULE_VOICE = { color: 'sort-wrong-color', shape: 'sort-wrong-shape' };

function partSvg(p) {
  const ring = p.border ? `<circle cx="0" cy="0" r="${SIZE.big + 13}" fill="none" stroke="#F5B324" stroke-width="7" stroke-dasharray="5 5"/>` : '';
  return ring + shapeSvg(p.shape, SIZE[p.size || 'mid'], COLORS[p.color]);
}

export function runSortGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    let errors = 0;
    let helps = 0;
    let finished = false;
    let idx = 0;
    let tries = 0;
    let cur = null;

    const svgPoint = e => {
      const pt = stage.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(stage.getScreenCTM().inverse());
    };

    // ── 出料台 ──
    layer.appendChild(el('g', {}, `
      <rect x="110" y="372" width="220" height="22" rx="10" fill="#8F8C84"/>
      <circle cx="130" cy="394" r="12" fill="#6D6A63"/><circle cx="220" cy="394" r="12" fill="#6D6A63"/><circle cx="310" cy="394" r="12" fill="#6D6A63"/>`));

    // ── 筐 ──
    const nb = task.bins.length;
    const binW = nb === 4 ? 190 : 210;
    const binCX = i => (nb === 4 ? 180 + i * 240 : 330 + i * 300);
    const counts = task.bins.map(b => (b.examples ? b.examples.length : 0));
    const slot = (i, k) => ({ x: binCX(i) - 55 + (k % 3) * 55, y: BIN_TOP + 34 + Math.floor(k / 3) * 44 });
    const bins = task.bins.map((b, i) => {
      const cx = binCX(i);
      const g = el('g', { class: 'sort-bin' }, `
        <path d="M${cx - binW / 2} ${BIN_TOP} L${cx + binW / 2} ${BIN_TOP} L${cx + binW / 2 - 18} ${BIN_TOP + BIN_H} L${cx - binW / 2 + 18} ${BIN_TOP + BIN_H} Z" fill="#D9A441" stroke="#A97B4F" stroke-width="5"/>
        <line x1="${cx - binW / 2 + 8}" y1="${BIN_TOP + 46}" x2="${cx + binW / 2 - 8}" y2="${BIN_TOP + 46}" stroke="#A97B4F" stroke-width="3"/>
        <line x1="${cx - binW / 2 + 14}" y1="${BIN_TOP + 92}" x2="${cx + binW / 2 - 14}" y2="${BIN_TOP + 92}" stroke="#A97B4F" stroke-width="3"/>`);
      layer.appendChild(g);
      // 目标卡（猜规则那一级没有卡，只有筐里的示例）
      if (!b.examples) {
        const card = el('g', { transform: `translate(${cx} ${BIN_TOP + BIN_H - 40})` }, `
          <rect x="-44" y="-30" width="88" height="60" rx="12" fill="#FFF8EA" stroke="#A97B4F" stroke-width="3"/>
          ${b.shape ? shapeSvg(b.shape, 18, b.color ? COLORS[b.color] : '#8F8C84') : `<circle cx="0" cy="0" r="18" fill="${COLORS[b.color]}"/>`}`);
        layer.appendChild(card);
      } else {
        b.examples.forEach((p, k) => {
          const s = slot(i, k);
          layer.appendChild(el('g', { transform: `translate(${s.x} ${s.y})` }, `<g transform="scale(0.7)">${partSvg(p)}</g>`));
        });
      }
      return g;
    });
    const binAt = p => bins.findIndex((_, i) => {
      const cx = binCX(i);
      return p.x > cx - binW / 2 - 20 && p.x < cx + binW / 2 + 20 && p.y > BIN_TOP - 50 && p.y < BIN_TOP + BIN_H + 20;
    });

    function ruleVoice(it) {
      if (task.kind === 'one') return task.rule === 'color' ? 'task-sort-color' : 'task-sort-shape';
      if (task.kind === 'switch') return idx >= task.switchAt ? 'sort-switch' : 'task-sort-switch';
      if (task.kind === 'border') return it.rule === 'shape' ? 'sort-by-shape' : 'sort-by-color';
      if (task.kind === 'guess') return 'task-sort-guess';
      return 'task-sort-both';
    }
    function wrongVoice(it) {
      if (task.kind === 'guess') return 'sort-wrong-guess';
      if (task.kind === 'cross') return 'sort-wrong-both';
      return RULE_VOICE[it.rule || task.rule];
    }

    function showItem() {
      const it = task.items[idx];
      tries = 0;
      cur = el('g', { class: 'sort-part', transform: `translate(${START.x} ${START.y})`, style: 'cursor:grab' }, `<g class="part-in">${partSvg(it)}</g>`);
      cur.style.opacity = '0';
      layer.appendChild(cur);
      requestAnimationFrame(() => requestAnimationFrame(() => { cur.style.transition = 'opacity 0.3s'; cur.style.opacity = '1'; }));
      // 每件都提醒按什么分（线索+口头标签）；第一件排在客人开场白后面说，不打断
      if (task.kind === 'border') (idx === 0 ? say : sayNow)(ruleVoice(it));
      if (task.kind === 'switch' && idx === task.switchAt) { sayNow('sort-switch'); bins.forEach(b => pulse(b)); }
      idle.reset();
    }
    function flyBack(g) {
      g.style.transition = 'transform 0.3s';
      g.setAttribute('transform', `translate(${START.x} ${START.y})`);
      setTimeout(() => { g.style.transition = ''; }, 320);
    }
    function placeIn(g, b) {
      const s = slot(b, counts[b]);
      counts[b] += 1;
      g.classList.remove('sort-part');
      g.style.transition = 'transform 0.25s';
      g.setAttribute('transform', `translate(${s.x} ${s.y})`);
      setTimeout(() => { g.style.transition = ''; }, 270);
      g.querySelector('.part-in').setAttribute('transform', 'scale(0.7)');
      sfx.snap();
    }
    function next() {
      idx += 1;
      cur = null;
      if (idx >= task.items.length) {
        finished = true;
        cleanup();
        sfx.cheer();
        sayNow('sort-good');
        setTimeout(() => { layer.innerHTML = ''; resolve({ errors, helps }); }, 1300);
        return;
      }
      setTimeout(showItem, 350);
    }

    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel') || finished || !cur) return;
      const it = task.items[idx];
      if (fires === 1) { sayNow('sort-idle'); pulse(cur); return; } // 提醒怎么玩，不算求助
      helps += 1;
      if (fires === 2) { sayNow(ruleVoice(it)); return; }
      window.__guideHand?.(cur, bins[it.bin]);
    }, 18000);

    let drag = null;
    function onDown(e) {
      if (finished || drag) return;
      const g = e.target.closest('.sort-part');
      if (!g || g !== cur) return;
      const p = svgPoint(e);
      const m = /translate\(([-\d.]+)[ ,]([-\d.]+)\)/.exec(g.getAttribute('transform'));
      g.style.transition = '';
      drag = { g, dx: p.x - Number(m[1]), dy: p.y - Number(m[2]), id: e.pointerId };
      g.parentNode.appendChild(g);
      sfx.pop();
      idle.reset();
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const p = svgPoint(e);
      drag.g.setAttribute('transform', `translate(${p.x - drag.dx} ${p.y - drag.dy})`);
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const p = svgPoint(e);
      const g = drag.g;
      drag = null;
      idle.reset();
      if (finished) return;
      const b = binAt(p);
      if (b < 0) { flyBack(g); return; } // 没放进任何筐：不算错，回到出料台
      const it = task.items[idx];
      if (b === it.bin) { placeIn(g, b); next(); return; }
      errors += 1;
      tries += 1;
      flyBack(g);
      sfx.pop();
      sayNow(wrongVoice(it));
      if (tries >= 2) {
        helps += 1;
        pulse(bins[it.bin]);
        window.__guideHand?.(g, bins[it.bin]);
      }
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

    showItem();
  });
}
