import { sfx, sayNow } from './audio.js';
import { pulse } from './guide.js';

const SVG = 'http://www.w3.org/2000/svg';

export function runFuelGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = `
      <g id="fuel-pump">
        <rect x="960" y="170" width="170" height="300" rx="18" fill="#D9CBAD"/>
        <rect x="985" y="200" width="120" height="90" rx="10" fill="#FFF8EA" stroke="#C89B4A" stroke-width="4"/>
        <text id="fuel-num" x="1045" y="268" text-anchor="middle" font-size="58" fill="#6B4A12">0</text>
        <path d="M960 320 C 860 340, 840 430, 790 480" stroke="#8F8C84" stroke-width="14" fill="none" stroke-linecap="round"/>
      </g>
      <g id="fuel-target">
        <circle cx="1045" cy="120" r="34" fill="#FFEDC2" stroke="#F5B324" stroke-width="5"/>
        <text x="1045" y="134" text-anchor="middle" font-size="38" fill="#8A5A1F">${task.target}</text>
      </g>
      <g id="fuel-bar-wrap">
        <rect x="880" y="180" width="36" height="280" rx="12" fill="#FFF8EA" stroke="#C89B4A" stroke-width="4"/>
        <rect id="fuel-bar" x="886" y="454" width="24" height="0" rx="8" fill="#F5B324"/>
      </g>
      <g id="fuel-btn" style="cursor:pointer">
        <circle cx="1045" cy="560" r="62" fill="#E8493F"/>
        <circle cx="1045" cy="560" r="62" fill="none" stroke="#A32D2D" stroke-width="6"/>
        <text x="1045" y="548" text-anchor="middle" font-size="24" fill="#FFF3DD">按住</text>
        <text x="1045" y="580" text-anchor="middle" font-size="24" fill="#FFF3DD">加油</text>
      </g>`;
    const numEl = layer.querySelector('#fuel-num');
    const barEl = layer.querySelector('#fuel-bar');
    const btn = layer.querySelector('#fuel-btn');

    let level = 0;
    let holding = null;
    let errors = 0;
    let helps = 0;
    let finished = false;
    let raf = null;
    let last = 0;

    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel')) return;
      helps += 1;
      sayNow('idle-fuel');
      window.__guideHand?.(btn, btn);
      if (fires >= 2) pulse(btn);
    });

    function render() {
      const shown = Math.floor(level);
      if (numEl.textContent !== String(shown)) {
        numEl.textContent = shown;
        if (shown > 0) sfx.pop();
      }
      const h = Math.min(268, (level / task.max) * 268);
      barEl.setAttribute('y', 454 - h);
      barEl.setAttribute('height', h);
    }

    function drain() {
      if (holding !== null || finished) return;
      level = Math.max(0, level - 0.5);
      render();
      if (level > 0) requestAnimationFrame(drain);
    }

    function tick(ts) {
      if (holding === null || finished) return;
      const dt = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      level += dt * 1.2;
      if (Math.floor(level) > task.target) {
        holding = null;
        errors += 1;
        sayNow('fuel-over');
        requestAnimationFrame(drain);
        idle.reset();
        return;
      }
      render();
      raf = requestAnimationFrame(tick);
    }

    function onDown(e) {
      if (finished) return;
      if (holding !== null) return;
      if (!e.target.closest('#fuel-btn')) return;
      holding = e.pointerId;
      last = performance.now();
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
      idle.reset();
    }

    function onUp(e) {
      if (holding === null || e.pointerId !== holding) return;
      holding = null;
      if (raf) cancelAnimationFrame(raf);
      idle.reset();
      if (Math.floor(level) === task.target && level >= task.target) {
        finish();
      } else if (level > 0) {
        sayNow('fuel-more');
      }
    }

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    function finish() {
      finished = true;
      sayNow(`num-${task.target}`);
      sfx.cheer();
      stage.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      idle.dispose();
      setTimeout(() => {
        layer.innerHTML = '';
        resolve({ errors, helps });
      }, 700);
    }
  });
}
