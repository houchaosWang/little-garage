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

// 找规律。依据：学前"重复规律"能力能预测到小学四到六年级的数学成绩，且独立于空间能力
// （Rittle-Johnson 等）；发展顺序：延伸 → 补空 → 抽象（换一种材料摆出同样的规律）→ 找出重复的那一小段。
// 《3-6岁儿童学习与发展指南》5-6岁："能发现事物简单的排列规律"。
// 教法：答错时"从头念一念"（红、蓝、红、蓝……念到空位停），再错就在每一段下面画括号——把"单元"说出来、画出来。
const COLORS = { red: '#E8493F', blue: '#3E8EE0', yellow: '#F5B324', green: '#66BB4C' };
const SHAPE_FILL = '#8B6FE8';
const WORD = {
  red: 'col-red', blue: 'col-blue', yellow: 'col-yellow', green: 'col-green',
  circle: 'shp-circle', square: 'shp-square', triangle: 'shp-triangle', star: 'shp-star',
};
function token(v, size) {
  if (COLORS[v]) {
    return `<circle class="tok-body" cx="0" cy="0" r="${size}" fill="${COLORS[v]}"/><circle cx="${(-size * 0.35).toFixed(1)}" cy="${(-size * 0.35).toFixed(1)}" r="${(size * 0.3).toFixed(1)}" fill="#FFFFFF" opacity="0.45"/>`;
  }
  return shapeSvg(v, size * 0.92, SHAPE_FILL);
}
const BLANK = `<circle cx="0" cy="0" r="26" fill="none" stroke="#C89B4A" stroke-width="4" stroke-dasharray="7 6" style="animation: pulse-ring 1.4s infinite"/><text x="0" y="12" text-anchor="middle" font-size="34" fill="#C89B4A">?</text>`;
// 题目那一排在车的上方（车身从 y≈465 开始），选项在地面或左侧，都不挡车
const ROW_Y = 300;

export function runPatternGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    let errors = 0;
    let helps = 0;
    let wrongs = 0;
    let finished = false;
    let busy = false;
    let bracketsShown = false;
    const U = task.unit.length;
    const row = [...(task.kind === 'abstract' ? task.model : task.items)]; // 空位是 null
    const L = row.length;
    const blankIdx = row.indexOf(null);
    const step = Math.min(66, 620 / L);
    const x0 = 90 + (620 - L * step) / 2 + step / 2;
    const cellX = i => x0 + i * step;

    layer.appendChild(el('rect', { x: 70, y: 250, width: 660, height: 100, rx: 20, fill: '#FFF8EA', stroke: '#D9CBAD', 'stroke-width': 6 }));
    const rowNodes = row.map((v, i) => {
      const g = el('g', { transform: `translate(${cellX(i).toFixed(1)} ${ROW_Y})` }, v === null ? BLANK : token(v, 24));
      layer.appendChild(g);
      return g;
    });

    function showBrackets() {
      if (bracketsShown || task.kind === 'abstract') return;
      bracketsShown = true;
      for (let k = 0; k < Math.floor(L / U); k++) {
        const a = cellX(k * U) - step * 0.42;
        const b = cellX(k * U + U - 1) + step * 0.42;
        layer.appendChild(el('path', { d: `M${a.toFixed(1)} 336 L${a.toFixed(1)} 342 L${b.toFixed(1)} 342 L${b.toFixed(1)} 336`, fill: 'none', stroke: '#E8763A', 'stroke-width': 4, 'stroke-linecap': 'round' }));
      }
    }

    // ── 选项 ──
    const opts = [];
    const optRows = []; // 抽象题：每个选项里的小图块，读的时候跳一跳
    const tokenRow = (seq, size, gap) => seq.map((v, j) => `<g transform="translate(${((j - (seq.length - 1) / 2) * gap).toFixed(1)} 0)">${token(v, size)}</g>`).join('');
    if (task.kind === 'extend' || task.kind === 'complete') {
      task.options.forEach((v, i) => {
        const x = 600 + (i - (task.options.length - 1) / 2) * 170;
        const g = el('g', { class: 'pat-opt', transform: `translate(${x} 690)`, style: 'cursor:pointer' }, `
          <rect x="-62" y="-52" width="124" height="104" rx="18" fill="#FFF8EA" stroke="#C89B4A" stroke-width="5"/>${token(v, 30)}`);
        g.dataset.i = i;
        layer.appendChild(g);
        opts.push(g);
      });
    } else if (task.kind === 'abstract') {
      // 换材料：上面是彩灯，下面三排是形状——找"规律一样"的那排（左侧排列，右边留给车）
      task.options.forEach((seq, i) => {
        const g = el('g', { class: 'pat-opt', transform: `translate(265 ${470 + i * 92})`, style: 'cursor:pointer' },
          `<rect x="-205" y="-36" width="410" height="72" rx="16" fill="#FFF8EA" stroke="#C89B4A" stroke-width="4"/>${tokenRow(seq, 18, 46)}`);
        g.dataset.i = i;
        layer.appendChild(g);
        opts.push(g);
        optRows.push([...g.querySelectorAll(':scope > g')]);
      });
    } else {
      task.options.forEach((seq, i) => {
        const w = seq.length * 46 + 40;
        const g = el('g', { class: 'pat-opt', transform: `translate(${310 + i * 290} 690)`, style: 'cursor:pointer' },
          `<rect x="${-w / 2}" y="-40" width="${w}" height="80" rx="16" fill="#FFF8EA" stroke="#C89B4A" stroke-width="4"/>${tokenRow(seq, 18, 46)}`);
        g.dataset.i = i;
        layer.appendChild(g);
        opts.push(g);
      });
    }

    function hop(g) {
      const m = /translate\(([-\d.]+)[ ,]([-\d.]+)\)/.exec(g.getAttribute('transform'));
      if (!m) return;
      g.setAttribute('transform', `translate(${m[1]} ${Number(m[2]) - 12})`);
      setTimeout(() => g.setAttribute('transform', `translate(${m[1]} ${m[2]})`), 240);
    }
    // 从头念一念，念到空位就停（留给他自己接）。念的时候他一点选项就打断——孩子的动作永远优先
    let readToken = 0;
    async function readRow(fromHint = false) {
      const my = ++readToken;
      for (let i = 0; i < L; i++) {
        if (my !== readToken) return;
        if (row[i] === null) break;
        hop(rowNodes[i]);
        await say(WORD[row[i]]);
      }
      // 提示触发的重念只重新计时、不清零，下一级才会指出答案
      if (my === readToken) { if (fromHint) idle.rearm(); else idle.reset(); }
    }
    async function readOption(i) {
      const seq = task.options[i];
      const nodes = optRows[i] || [];
      for (let j = 0; j < seq.length; j++) {
        if (nodes[j]) hop(nodes[j]);
        await say(WORD[seq[j]]);
      }
    }

    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel') || busy || finished) return;
      if (fires === 1) { sayNow('pat-idle'); return; } // 只是提醒方法，不算求助
      helps += 1;
      if (fires === 2) { readRow(true); return; }
      const right = opts[task.answerIdx];
      if (right) { window.__guideHand?.(right, right); pulse(right); }
    }, 18000);

    function shake(g) {
      const base = g.getAttribute('transform');
      let k = 0;
      const stepFn = () => {
        k += 1;
        g.setAttribute('transform', `${base} translate(${k % 2 ? 12 : -12} 0)`);
        if (k < 5) setTimeout(stepFn, 80);
        else g.setAttribute('transform', base);
      };
      stepFn();
    }

    async function correct(g) {
      finished = true;
      sfx.cheer();
      g.querySelector('rect').setAttribute('fill', '#DFF3C8');
      if (blankIdx >= 0) {
        row[blankIdx] = task.options[task.answerIdx];
        rowNodes[blankIdx].innerHTML = token(row[blankIdx], 24);
      }
      showBrackets();
      sayNow('pat-good');
      await readRow(); // 念一遍：一段一段在重复
      if (task.kind === 'abstract') await readOption(task.answerIdx); // 再念选中的那排：念起来节奏一样
      cleanup();
      setTimeout(() => { layer.innerHTML = ''; resolve({ errors, helps }); }, 500);
    }

    async function wrong(g) {
      errors += 1;
      wrongs += 1;
      sfx.pop();
      shake(g);
      sayNow('pat-wrong');
      if (wrongs >= 2) showBrackets();
      await readRow();
      if (wrongs >= 2) {
        const right = opts[task.answerIdx];
        if (right) { window.__guideHand?.(right, right); pulse(right); }
      }
    }

    function onDown(e) {
      if (finished || busy) return;
      const g = e.target.closest('.pat-opt');
      if (!g) return;
      idle.reset();
      if (Number(g.dataset.i) === task.answerIdx) correct(g);
      else wrong(g);
    }
    stage.addEventListener('pointerdown', onDown);
    function cleanup() {
      stage.removeEventListener('pointerdown', onDown);
      idle.dispose();
    }
  });
}
