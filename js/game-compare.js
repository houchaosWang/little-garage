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
const WING_UNIT_W = 46 * 2.3;

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
    // 6级错位：offsets 以"一个单位尺寸"计——管子横向错开起点，尾翼纵向抬高底座
    const off = i => (Array.isArray(task.offsets) ? task.offsets[i] : 0);

    if (isWing) {
      const gap = Math.min(230, 940 / n);
      const x0 = 600 - ((n - 1) * gap) / 2;
      // 整体缩放到放得下：最大的两个尾翼就算挨着，中间也至少留24px
      const [s1, s2] = [...task.sizes].sort((a, b) => b - a);
      const f = Math.min(1, (gap - 24) / ((WING_UNIT_W * (s1 + s2)) / 2));
      const unit = 46 * f;
      const slack = gap - (WING_UNIT_W * f * (s1 + s2)) / 2;
      const mx = Math.max(4, Math.min(15, slack / 2 - 1)); // 命中框贴着内容，且和邻居不重叠
      const reach = Math.max(...task.sizes.map((s, i) => (s + off(i)) * unit));
      const baseY = Math.max(690, 622 + reach + 4); // 最高的翼尖也不越过地面线（不挡车）
      task.sizes.forEach((s, i) => {
        const cx = x0 + i * gap;
        const H = s * unit, W = H * 2.3;
        const by = baseY - off(i) * unit;
        const g = el('g', { class: 'cmp-item', transform: `translate(${cx.toFixed(1)} ${by.toFixed(1)})`, style: 'cursor:pointer' }, `
          <rect class="hit" x="${(-W / 2 - mx).toFixed(1)}" y="${(-H - 20).toFixed(1)}" width="${(W + 2 * mx).toFixed(1)}" height="${(H + 40).toFixed(1)}" fill="transparent"/>
          <rect x="-16" y="-6" width="32" height="10" rx="3" fill="#D9CBAD"/>
          ${wingSvg(s * f, '#3E8EE0')}`);
        g.dataset.idx = i;
        g.dataset.home = g.getAttribute('transform');
        layer.appendChild(g);
        items.push(g);
      });
    } else {
      // 5根时行距收紧，最后一根也不出画面；错位时整体左移，伸得最远的也碰不到车（车身从 x≈480 开始）
      const rowGap = n >= 5 ? 48 : 60;
      const rowY0 = n >= 5 ? 552 : 560;
      const hitH = Math.min(50, rowGap - 4);
      const x0 = Array.isArray(task.offsets) ? 110 : 250;
      task.sizes.forEach((s, i) => {
        const cy = rowY0 + i * rowGap;
        const len = 90 * s;
        const sx = x0 + off(i) * 90;
        const g = el('g', { class: 'cmp-item', transform: `translate(${sx.toFixed(1)} ${cy})`, style: 'cursor:pointer' }, `
          <rect class="hit" x="-10" y="${(-hitH / 2).toFixed(1)}" width="${(len + 60).toFixed(1)}" height="${hitH}" fill="transparent"/>
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
