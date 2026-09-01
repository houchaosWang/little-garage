import { sfx, sayNow } from './audio.js';
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

export const SHAPE_COLORS = {
  circle: '#E8493F', square: '#3E8EE0', triangle: '#66BB4C', star: '#F5B324',
  ellipse: '#8B6FE8', diamond: '#3FBFA8', trapezoid: '#E8763A',
};

// 共享形状渲染：以(0,0)为中心画出各形状，size 为特征半径；extra 可附加 stroke/style 等属性
export function shapeSvg(id, size, fill, extra = '') {
  const a = `fill="${fill}" class="shape-body" ${extra}`;
  switch (id) {
    case 'circle':
      return `<circle cx="0" cy="0" r="${size}" ${a}/>`;
    case 'square':
      return `<rect x="${(-size).toFixed(1)}" y="${(-size).toFixed(1)}" width="${(size * 2).toFixed(1)}" height="${(size * 2).toFixed(1)}" rx="${(size * 0.16).toFixed(1)}" ${a}/>`;
    case 'triangle': {
      const pts = [0, 1, 2].map(i => {
        const ang = -Math.PI / 2 + i * (2 * Math.PI / 3);
        return `${(size * Math.cos(ang)).toFixed(1)},${(size * Math.sin(ang)).toFixed(1)}`;
      }).join(' ');
      return `<polygon points="${pts}" ${a}/>`;
    }
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? size : size * 0.42;
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(`${(rr * Math.cos(ang)).toFixed(1)},${(rr * Math.sin(ang)).toFixed(1)}`);
      }
      return `<polygon points="${pts.join(' ')}" ${a}/>`;
    }
    case 'ellipse':
      return `<ellipse cx="0" cy="0" rx="${(size * 1.25).toFixed(1)}" ry="${(size * 0.78).toFixed(1)}" ${a}/>`;
    case 'diamond': {
      const s = size * 1.12;
      return `<polygon points="0,${(-s).toFixed(1)} ${s.toFixed(1)},0 0,${s.toFixed(1)} ${(-s).toFixed(1)},0" ${a}/>`;
    }
    case 'trapezoid': {
      const top = size * 0.55, bot = size * 0.95, h = size * 0.62;
      return `<polygon points="${(-top).toFixed(1)},${(-h).toFixed(1)} ${top.toFixed(1)},${(-h).toFixed(1)} ${bot.toFixed(1)},${h.toFixed(1)} ${(-bot).toFixed(1)},${h.toFixed(1)}" ${a}/>`;
    }
    default:
      return `<circle cx="0" cy="0" r="${size}" ${a}/>`;
  }
}

export function runShapesGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    let placed = 0;
    let errors = 0;
    let helps = 0;

    const panelX = 150, panelY = 270, panelW = 410, panelH = 200;
    const holeY = panelY + panelH / 2;
    const k = task.shapes.length;
    const gap = panelW / k;
    const holeR = Math.min(38, gap * 0.42);
    const partR = holeR * 0.82;
    const hitR = Math.min(72, gap * 0.85);
    const trayY = 720;

    layer.appendChild(el('rect', {
      x: panelX, y: panelY, width: panelW, height: panelH, rx: 20,
      fill: '#FFF8EA', stroke: '#D9CBAD', 'stroke-width': 8,
    }));

    const holes = [];
    task.shapes.forEach((shape, i) => {
      const cx = panelX + gap * (i + 0.5);
      const g = el('g', { transform: `translate(${cx} ${holeY})` },
        shapeSvg(shape, holeR, '#3A3A38', 'stroke="#C89B4A" stroke-width="5" stroke-dasharray="8 6" style="animation: pulse-ring 1.4s infinite"'));
      g.dataset.shape = shape;
      g.dataset.filled = '';
      g.dataset.cx = cx;
      layer.appendChild(g);
      holes.push(g);
    });

    const parts = [];
    task.tray.forEach((shape, i) => {
      const cx = panelX + gap * (i + 0.5);
      const g = el('g', { class: 'shape-part', transform: `translate(${cx} ${trayY})` },
        `<g class="part-inner">${shapeSvg(shape, partR, SHAPE_COLORS[shape])}</g>`);
      g.dataset.shape = shape;
      g.dataset.home = `${cx},${trayY}`;
      const inner = g.querySelector('.part-inner');
      inner.style.transformBox = 'fill-box';
      inner.style.transformOrigin = 'center';
      layer.appendChild(g);
      parts.push(g);
    });

    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel')) return;
      helps += 1;
      sayNow('idle-shapes');
      const freePart = parts.find(p => !p.dataset.placed);
      const matchHole = freePart && holes.find(h => h.dataset.shape === freePart.dataset.shape);
      if (freePart && matchHole) window.__guideHand?.(freePart, matchHole);
      if (fires >= 2) { pulse(freePart); pulse(matchHole); }
    });

    let drag = null;
    function onDown(e) {
      if (drag) return;
      const g = e.target.closest('.shape-part');
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
      let near = null, nearD = Infinity;
      for (const h of holes) {
        if (h.dataset.filled) continue;
        const d = Math.hypot(p.x - h.dataset.cx, p.y - holeY);
        if (d < hitR && d < nearD) { near = h; nearD = d; }
      }
      if (near && near.dataset.shape === g.dataset.shape) {
        near.dataset.filled = '1';
        g.dataset.placed = '1';
        g.setAttribute('transform', `translate(${near.dataset.cx} ${holeY})`);
        g.querySelector('.part-inner').style.animation = 'pop 0.35s ease-out';
        const body = near.querySelector('.shape-body');
        body.setAttribute('fill', SHAPE_COLORS[g.dataset.shape]);
        body.style.animation = 'none';
        body.setAttribute('stroke-dasharray', 'none');
        placed += 1;
        sfx.snap();
        if (placed === k) finish();
      } else {
        if (near) { errors += 1; sayNow('shapes-wrong'); }
        const [hx, hy] = g.dataset.home.split(',').map(Number);
        g.style.transition = 'transform 0.3s';
        g.setAttribute('transform', `translate(${hx} ${hy})`);
        setTimeout(() => { g.style.transition = ''; }, 320);
      }
      drag = null;
      idle.reset();
    }

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    function finish() {
      stage.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      idle.dispose();
      sfx.cheer();
      setTimeout(() => {
        layer.innerHTML = '';
        resolve({ errors, helps });
      }, 700);
    }
  });
}
