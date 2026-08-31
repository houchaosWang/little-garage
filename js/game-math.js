import { sfx, say, sayNow } from './audio.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};

const ROCK = '<circle cx="0" cy="0" r="22" fill="#8F8C84"/><circle cx="-7" cy="-7" r="7" fill="#B9B6AD" opacity="0.8"/>';

export function runMathGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    let errors = 0;
    let helps = 0;
    let finished = false;
    let busy = true;

    layer.appendChild(el('g', {}, `
      <rect x="120" y="440" width="480" height="28" rx="10" fill="#A97B4F"/>
      <rect x="130" y="300" width="18" height="150" rx="6" fill="#A97B4F"/>
      <rect x="572" y="300" width="18" height="150" rx="6" fill="#A97B4F"/>`));

    const rocks = [];
    const rockPos = i => ({ x: 175 + (i % 5) * 92, y: i < 5 ? 402 : 340 });
    function addRock(i, fromRight) {
      const p = rockPos(i);
      const r = el('g', { class: 'rock' }, ROCK);
      r.setAttribute('transform', fromRight ? 'translate(1300 250)' : `translate(${p.x} ${p.y})`);
      layer.appendChild(r);
      rocks.push(r);
      if (fromRight) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          r.style.transition = 'transform 0.7s cubic-bezier(.3,.8,.4,1)';
          r.setAttribute('transform', `translate(${p.x} ${p.y})`);
        }));
      }
    }
    function removeRock(r) {
      r.dataset.gone = '1';
      r.style.transition = 'transform 0.7s cubic-bezier(.6,.1,.8,.4), opacity 0.7s';
      r.setAttribute('transform', 'translate(1300 250)');
      r.style.opacity = '0.15';
    }

    const plates = [];
    const gap = 170;
    const x0 = 600 - gap;
    task.options.forEach((val, i) => {
      const p = el('g', { class: 'plate', style: 'cursor:pointer' }, `
        <rect x="-62" y="-52" width="124" height="104" rx="18" fill="#FFF8EA" stroke="#C89B4A" stroke-width="5"/>
        <text x="0" y="22" text-anchor="middle" font-size="60" fill="#6B4A12">${val}</text>`);
      p.setAttribute('transform', `translate(${x0 + i * gap} 690)`);
      p.dataset.val = val;
      layer.appendChild(p);
      plates.push(p);
    });

    const idle = attachIdleHelp(stage, () => {
      if (document.getElementById('parent-panel')) return;
      if (busy) return;
      helps += 1;
      sayNow('idle-math');
      const right = plates.find(pl => Number(pl.dataset.val) === task.answer);
      if (right) window.__guideHand?.(right, right);
    });

    async function pulseCount(seq) {
      for (let i = 0; i < seq.length; i++) {
        const r = seq[i];
        const done = say(`num-${i + 1}`);
        r.querySelector('circle').setAttribute('fill', '#F5B324');
        const m = /translate\(([-\d.]+)[ ,]([-\d.]+)\)/.exec(r.getAttribute('transform'));
        r.setAttribute('transform', `translate(${m[1]} ${Number(m[2]) - 14})`);
        sfx.pop();
        await done;
        r.setAttribute('transform', `translate(${m[1]} ${m[2]})`);
        r.querySelector('circle').setAttribute('fill', '#8F8C84');
      }
    }

    function recite() {
      return say(`num-${task.a}`, task.op === '+' ? 'math-jia' : 'math-jian',
        `num-${task.b}`, 'math-dengyu', `num-${task.answer}`);
    }

    async function explainFull() {
      busy = true;
      say('math-yiqi');
      const kept = rocks.filter(r => !r.dataset.gone);
      await pulseCount(kept);
      await recite();
      busy = false;
      idle.reset();
    }

    async function intro() {
      for (let i = 0; i < task.a; i++) addRock(i, false);
      await new Promise(r => setTimeout(r, 700));
      if (task.op === '+') {
        say('math-zailai', `num-${task.b}`);
        for (let i = 0; i < task.b; i++) {
          addRock(task.a + i, true);
          await new Promise(r => setTimeout(r, 380));
        }
      } else {
        say('math-nazou', `num-${task.b}`);
        for (let i = 0; i < task.b; i++) {
          removeRock(rocks[rocks.length - 1 - i]);
          await new Promise(r => setTimeout(r, 380));
        }
      }
      await new Promise(r => setTimeout(r, 800));
      busy = false;
      idle.reset();
    }
    intro().catch(() => { busy = false; });

    function onDown(e) {
      if (finished || busy) return;
      const p = e.target.closest('.plate');
      if (!p) return;
      idle.reset();
      if (Number(p.dataset.val) === task.answer) {
        finished = true;
        sfx.cheer();
        p.querySelector('rect').setAttribute('fill', '#DFF3C8');
        sayNow('math-duila');
        finishWithRecite();
      } else {
        errors += 1;
        sfx.pop();
        const base = p.getAttribute('transform');
        let k = 0;
        const shake = () => {
          k += 1;
          p.setAttribute('transform', `${base} translate(${k % 2 ? 12 : -12} 0)`);
          if (k < 5) setTimeout(shake, 80);
          else p.setAttribute('transform', base);
        };
        shake();
        sayNow('math-wrong');
        explainFull();
      }
    }

    async function finishWithRecite() {
      await recite();
      cleanup();
      setTimeout(() => {
        layer.innerHTML = '';
        resolve({ errors, helps });
      }, 500);
    }

    stage.addEventListener('pointerdown', onDown);
    function cleanup() {
      stage.removeEventListener('pointerdown', onDown);
      idle.dispose();
    }
  });
}
