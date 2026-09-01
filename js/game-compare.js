import { sfx, sayNow } from './audio.js';
import { pulse } from './guide.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};

// 尾翼（支架+翼片），以基线(0,0)为锚点向上生长，scale=1 时约46px高
function wingSvg(scale, color) {
  const H = 46 * scale;
  const W = H * 2.3;
  const plateH = Math.max(6, H * 0.36);
  const strutH = H * 0.64;
  const strutW = Math.max(4, H * 0.16);
  return `
    <rect x="${(-strutW * 1.6).toFixed(1)}" y="${(-strutH).toFixed(1)}" width="${strutW.toFixed(1)}" height="${strutH.toFixed(1)}" fill="#8F8C84"/>
    <rect x="${(strutW * 0.6).toFixed(1)}" y="${(-strutH).toFixed(1)}" width="${strutW.toFixed(1)}" height="${strutH.toFixed(1)}" fill="#8F8C84"/>
    <rect x="${(-W / 2).toFixed(1)}" y="${(-H).toFixed(1)}" width="${W.toFixed(1)}" height="${plateH.toFixed(1)}" rx="${(plateH * 0.3).toFixed(1)}" fill="${color}"/>`;
}

export function runCompareGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    let errors = 0;
    let helps = 0;
    let finished = false;

    const isWing = task.kind === 'big' || task.kind === 'small';
    const items = [];
    const n = task.n;

    if (isWing) {
      const gap = Math.min(230, 940 / n);
      const x0 = 600 - ((n - 1) * gap) / 2;
      const baseY = Math.max(690, 622 + 46 * Math.max(...task.sizes));
      task.sizes.forEach((s, i) => {
        const cx = x0 + i * gap;
        const H = 46 * s, W = H * 2.3;
        const g = el('g', { class: 'cmp-item', transform: `translate(${cx} ${baseY})`, style: 'cursor:pointer' }, `
          <rect class="hit" x="${(-W / 2 - 15).toFixed(1)}" y="${(-H - 20).toFixed(1)}" width="${(W + 30).toFixed(1)}" height="${(H + 40).toFixed(1)}" fill="transparent"/>
          <rect x="-16" y="-6" width="32" height="10" rx="3" fill="#D9CBAD"/>
          ${wingSvg(s, '#3E8EE0')}`);
        g.dataset.idx = i;
        g.dataset.home = g.getAttribute('transform');
        layer.appendChild(g);
        items.push(g);
      });
    } else {
      const rowGap = 60;
      const rowY0 = 560;
      task.sizes.forEach((s, i) => {
        const cy = rowY0 + i * rowGap;
        const len = 90 * s;
        const g = el('g', { class: 'cmp-item', transform: `translate(250 ${cy})`, style: 'cursor:pointer' }, `
          <rect class="hit" x="-10" y="-25" width="${(90 * s + 60).toFixed(1)}" height="50" fill="transparent"/>
          <rect x="0" y="-13" width="${len.toFixed(1)}" height="26" rx="13" fill="#66BB4C"/>`);
        g.dataset.idx = i;
        g.dataset.home = g.getAttribute('transform');
        layer.appendChild(g);
        items.push(g);
      });
    }

    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel')) return;
      helps += 1;
      sayNow('idle-compare');
      const correct = items[task.answerIdx];
      if (correct) window.__guideHand?.(correct, correct);
      if (fires >= 2) pulse(correct);
    });

    function onDown(e) {
      if (finished) return;
      const item = e.target.closest('.cmp-item');
      if (!item) return;
      idle.reset();
      const idx = Number(item.dataset.idx);
      if (idx === task.answerIdx) {
        finished = true;
        sfx.cheer();
        item.style.transition = 'transform 0.7s cubic-bezier(.4,.8,.5,1)';
        item.setAttribute('transform', 'translate(480 560) scale(0.5)');
        setTimeout(finish, 750);
      } else {
        errors += 1;
        sayNow('compare-wrong');
        sfx.pop();
        const base = item.dataset.home;
        let step = 0;
        const shake = () => {
          step += 1;
          item.setAttribute('transform', `${base} translate(${step % 2 ? 12 : -12} 0)`);
          if (step < 5) setTimeout(shake, 80);
          else item.setAttribute('transform', base);
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
      }, 500);
    }
  });
}
