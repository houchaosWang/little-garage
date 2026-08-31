import { sfx, sayNow } from './audio.js';
import { makeRng } from './rng.js';

const SVG = 'http://www.w3.org/2000/svg';

export function runWashGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    const rng = makeRng();
    let helps = 0;
    let finished = false;
    const active = new Set();
    let cleared = 0;

    const pt = stage.createSVGPoint();
    const toStage = (x, y) => { pt.x = x; pt.y = y; return pt.matrixTransform(stage.getScreenCTM().inverse()); };

    const spots = [];
    for (let i = 0; i < 10; i++) {
      const s = document.createElementNS(SVG, 'ellipse');
      s.setAttribute('cx', 510 + rng.int(0, 230));
      s.setAttribute('cy', 520 + rng.int(0, 100));
      s.setAttribute('rx', 16 + rng.int(0, 14));
      s.setAttribute('ry', 12 + rng.int(0, 10));
      s.setAttribute('fill', '#8A6A4A');
      s.setAttribute('opacity', '0.9');
      s.dataset.alive = '1';
      layer.appendChild(s);
      spots.push(s);
    }

    const idle = attachIdleHelp(stage, () => {
      if (document.getElementById('parent-panel')) return;
      helps += 1;
      sayNow('idle-wash');
      const live = spots.filter(s => s.dataset.alive);
      if (live.length >= 1) window.__guideHand?.(live[0], live[live.length - 1]);
    });

    function tryWipe(e) {
      const p = toStage(e.clientX, e.clientY);
      for (const s of spots) {
        if (!s.dataset.alive) continue;
        const dx = p.x - Number(s.getAttribute('cx'));
        const dy = p.y - Number(s.getAttribute('cy'));
        if (Math.hypot(dx, dy) < 48) {
          s.dataset.alive = '';
          s.style.transition = 'opacity 0.25s';
          s.style.opacity = '0';
          sfx.pop();
          cleared += 1;
          setTimeout(() => s.remove(), 260);
          if (cleared === spots.length) sparkleFinish();
        }
      }
    }

    function sparkleFinish() {
      finished = true;
      sfx.cheer();
      for (let i = 0; i < 6; i++) {
        const star = document.createElementNS(SVG, 'polygon');
        star.setAttribute('points', '0,-14 4,-4 14,-4 6,2 9,12 0,6 -9,12 -6,2 -14,-4 -4,-4');
        star.setAttribute('fill', '#F5B324');
        star.setAttribute('transform', `translate(${520 + rng.int(0, 220)} ${500 + rng.int(0, 120)})`);
        star.style.animation = 'pop 0.5s ease-out';
        layer.appendChild(star);
      }
      cleanup();
      setTimeout(() => {
        layer.innerHTML = '';
        resolve({ errors: 0, helps });
      }, 900);
    }

    function onDown(e) {
      if (finished) return;
      active.add(e.pointerId);
      tryWipe(e);
      idle.reset();
    }
    function onMove(e) {
      if (!active.has(e.pointerId) || finished) return;
      tryWipe(e);
      idle.reset();
    }
    function onUp(e) { active.delete(e.pointerId); }

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
  });
}
