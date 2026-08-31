import { sfx, sayNow } from './audio.js';
import { CHARSET } from './taskgen.js';
import { pulse } from './guide.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};

export function runHanziGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    let errors = 0;
    let helps = 0;
    let finished = false;

    const n = task.optionIndexes.length;
    const gap = 200;
    const x0 = 600 - ((n - 1) * gap) / 2;
    const crates = [];
    task.optionIndexes.forEach((ci, i) => {
      const c = el('g', { class: 'crate', style: 'cursor:pointer' }, `
        <rect x="-75" y="-75" width="150" height="150" rx="14" fill="#C89B6A" stroke="#A97B4F" stroke-width="6"/>
        <line x1="-75" y1="-45" x2="75" y2="-45" stroke="#A97B4F" stroke-width="4"/>
        <text x="0" y="42" text-anchor="middle" font-size="84" fill="#5B3A16">${CHARSET[ci]}</text>`);
      c.setAttribute('transform', `translate(${x0 + i * gap} 430)`);
      c.dataset.ci = ci;
      layer.appendChild(c);
      crates.push(c);
    });

    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel')) return;
      helps += 1;
      sayNow('idle-hanzi', `char-${task.answerIndex + 1}`);
      const right = crates.find(c => Number(c.dataset.ci) === task.answerIndex);
      if (right) window.__guideHand?.(right, right);
      if (fires >= 2) pulse(crates.find(c => Number(c.dataset.ci) === task.answerIndex));
    });

    function onDown(e) {
      if (finished) return;
      const c = e.target.closest('.crate');
      if (!c) return;
      idle.reset();
      if (Number(c.dataset.ci) === task.answerIndex) {
        finished = true;
        sfx.snap();
        sayNow(`char-${task.answerIndex + 1}`, 'praise-1');
        c.style.transition = 'transform 0.7s cubic-bezier(.4,.8,.5,1)';
        c.setAttribute('transform', 'translate(480 560) scale(0.45)');
        setTimeout(() => { sfx.cheer(); finish(); }, 750);
      } else {
        errors += 1;
        sfx.pop();
        sayNow('hanzi-wrong');
        const base = c.getAttribute('transform');
        let k = 0;
        const shake = () => {
          k += 1;
          c.setAttribute('transform', `${base} translate(${k % 2 ? 14 : -14} 0)`);
          if (k < 5) setTimeout(shake, 90);
          else c.setAttribute('transform', base);
        };
        shake();
      }
    }
    stage.addEventListener('pointerdown', onDown);

    function finish() {
      stage.removeEventListener('pointerdown', onDown);
      idle.dispose();
      setTimeout(() => {
        layer.innerHTML = '';
        resolve({ errors, helps });
      }, 600);
    }
  });
}
