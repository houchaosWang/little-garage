import { sfx, sayNow } from './audio.js';
import { PALETTE } from './vehicles.js';
import { pulse } from './guide.js';

const SVG = 'http://www.w3.org/2000/svg';

export function runLightsGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = `
      <circle id="light-socket" cx="465" cy="600" r="26" fill="#3A3A38" stroke="#C89B4A" stroke-width="5" stroke-dasharray="9 7" style="animation: pulse-ring 1.4s infinite"/>`;

    let errors = 0;
    let helps = 0;
    let finished = false;
    const bulbs = [];
    const n = task.options.length;
    const gap = 130;
    const x0 = 600 - ((n - 1) * gap) / 2;

    task.options.forEach((color, i) => {
      const b = document.createElementNS(SVG, 'g');
      b.setAttribute('class', 'bulb');
      b.setAttribute('transform', `translate(${x0 + i * gap} 725)`);
      b.dataset.color = color;
      b.innerHTML = `
        <circle cx="0" cy="0" r="40" fill="${PALETTE[color]}"/>
        <circle cx="-12" cy="-12" r="10" fill="#FFFFFF" opacity="0.55"/>
        <rect x="-14" y="34" width="28" height="16" rx="5" fill="#8F8C84"/>`;
      layer.appendChild(b);
      bulbs.push(b);
    });

    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel')) return;
      helps += 1;
      sayNow('idle-lights');
      const right = bulbs.find(x => x.dataset.color === task.answer);
      const socket = layer.querySelector('#light-socket');
      if (right && socket) window.__guideHand?.(right, socket);
      if (fires >= 2) pulse(bulbs.find(x => x.dataset.color === task.answer));
    });

    function onDown(e) {
      if (finished) return;
      const b = e.target.closest('.bulb');
      if (!b) return;
      idle.reset();
      if (b.dataset.color === task.answer) {
        finished = true;
        sfx.snap();
        b.style.transition = 'transform 0.6s ease-in';
        b.setAttribute('transform', 'translate(465 600) scale(0.62)');
        setTimeout(() => {
          const socket = layer.querySelector('#light-socket');
          socket.setAttribute('fill', PALETTE[task.answer]);
          socket.setAttribute('stroke-dasharray', 'none');
          socket.style.animation = 'none';
          const glow = document.createElementNS(SVG, 'circle');
          glow.setAttribute('cx', 465);
          glow.setAttribute('cy', 600);
          glow.setAttribute('r', 34);
          glow.setAttribute('fill', '#FFF8C4');
          glow.setAttribute('opacity', '0.7');
          layer.appendChild(glow);
          b.remove();
          sfx.cheer();
          finish();
        }, 650);
      } else {
        errors += 1;
        sayNow('lights-wrong');
        sfx.pop();
        const base = b.getAttribute('transform');
        let k = 0;
        const shake = () => {
          k += 1;
          b.setAttribute('transform', `${base} translate(${k % 2 ? 14 : -14} 0)`);
          if (k < 5) setTimeout(shake, 90);
          else b.setAttribute('transform', base);
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
      }, 700);
    }
  });
}
