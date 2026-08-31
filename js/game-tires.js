import { sfx, say, sayNow } from './audio.js';

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

export function runTireGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    let placed = 0;
    let helps = 0;

    const slotY = 700;
    const slotGap = Math.min(100, 760 / task.count);
    const slotX0 = 180;
    const slots = [];
    for (let i = 0; i < task.count; i++) {
      const cx = slotX0 + i * slotGap;
      const ring = el('g', {}, `
        <circle cx="${cx}" cy="${slotY}" r="38" fill="none" stroke="#C89B4A" stroke-width="5" stroke-dasharray="10 8" style="animation: pulse-ring 1.4s infinite"/>
        <text x="${cx}" y="${slotY + 10}" text-anchor="middle" font-size="30" fill="#C89B4A">${i + 1}</text>`);
      ring.dataset.filled = '';
      ring.dataset.cx = cx;
      layer.appendChild(ring);
      slots.push(ring);
    }

    const rackX = 1000, rackY0 = 200;
    const tires = [];
    for (let i = 0; i < task.rackCount; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const t = el('g', { class: 'tire', transform: `translate(${rackX + col * 90} ${rackY0 + row * 84})` }, tireHTML);
      t.dataset.home = `${rackX + col * 90},${rackY0 + row * 84}`;
      layer.appendChild(t);
      tires.push(t);
    }
    layer.insertBefore(
      el('rect', { x: rackX - 60, y: rackY0 - 60, width: 210, height: Math.ceil(task.rackCount / 2) * 84 + 90, rx: 14, fill: 'none', stroke: '#D9CBAD', 'stroke-width': 8 }),
      layer.firstChild,
    );

    const idle = attachIdleHelp(stage, () => {
      helps += 1;
      sayNow('idle-tires');
      const freeTire = tires.find(t => !t.dataset.placed);
      const freeSlot = slots.find(s => !s.dataset.filled);
      if (freeTire && freeSlot) window.__guideHand?.(freeTire, freeSlot);
    });

    let drag = null;
    function onDown(e) {
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
      const near = slots.find(s => !s.dataset.filled && Math.hypot(p.x - s.dataset.cx, p.y - slotY) < 70);
      if (near) {
        near.dataset.filled = '1';
        drag.g.dataset.placed = '1';
        drag.g.setAttribute('transform', `translate(${near.dataset.cx} ${slotY})`);
        drag.g.querySelector('.tire-inner').style.animation = 'pop 0.35s ease-out';
        placed += 1;
        sfx.snap();
        sayNow(`num-${placed}`);
        near.querySelector('circle').style.animation = 'none';
        near.querySelector('circle').setAttribute('stroke-dasharray', 'none');
        if (placed === task.count) finish();
      } else {
        const [hx, hy] = drag.g.dataset.home.split(',').map(Number);
        const g = drag.g;
        g.style.transition = 'transform 0.3s';
        g.setAttribute('transform', `translate(${hx} ${hy})`);
        setTimeout(() => { g.style.transition = ''; }, 320);
      }
      drag = null;
      idle.reset();
    }

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);

    if (window.__firstTirePlay) {
      setTimeout(() => {
        say('demo-hint');
        window.__guideHand?.(tires[0], slots[0]);
      }, 800);
    }

    function finish() {
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      idle.dispose();
      setTimeout(() => {
        layer.innerHTML = '';
        resolve({ errors: 0, helps });
      }, 700);
    }
  });
}
