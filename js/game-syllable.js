import { sfx, say, sayNow } from './audio.js';
import { pulse } from './guide.js';
import { sylWord } from './taskgen.js';
import { buildVehicle, PALETTE } from './vehicles.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};
const wait = ms => new Promise(r => setTimeout(r, ms));

// 车名拍拍（依据见 taskgen.js 的 SYL_WORDS 注释与 docs/phase6-design-rationale.md 第七节）。
// 1拍车名 → 2找牌子（一字一音）→ 3指着念 → 4去头去尾 → 5去中间 → 6是不是车（车字在后/在前）。
// 题目和选项全部念出来，零阅读；牌子上"一字一格"，格子本身就是要看的东西。
// 布局：左侧工作台 x70-470、y200-460（车身从 x≈480、y≈465 开始，气泡在 y70-170）；选项/筐在地面 y≥628。
export const SYL_PROMPTS = ['sy-this', 'sy-clap-go', 'sy-xia', 'sy-together', 'sy-yourturn', 'sy-rule', 'sy-count', 'sy-find',
  'sy-which', 'sy-bushuo', 'sy-shengsha', 'sy-shengxia', 'sy-listen', 'sy-idle-clap', 'sy-point-again', 'sy-see',
  'sy-head-car', 'sy-head-part', 'sy-head-rule', 'sy-good', 'sy-clap-good', 'sy-wrong', 'sy-done'];

const PANEL = { x: 70, y: 200, w: 400, h: 260 };
const EAR = { x: 434, y: 238 };
const INK = '#5B3A16';
const CELL = '#FFF3DD';
const HI = '#FFE066';
const OK = '#DFF3C8';
const BEAD_Y = 420;
const beadX = i => PANEL.x + 50 + i * 58;
const OPT_X = [360, 600, 840];
const OPT_Y = 705;
const OPT_COLORS = ['#E8493F', '#3E8EE0', '#F5B324'];
const BINS = { car: { x0: 180, x1: 480 }, part: { x0: 730, x1: 1010 } };
const BIN_Y0 = 628;
const BIN_Y1 = 790;
const HEAD_START = { x: 270, y: 340 };

const wordClip = w => `vn-${sylWord(w).v}`;
const sylClips = w => sylWord(w).s.map(k => `syl-${k}`);

const speakerSvg = c => `
  <path d="M-16 -9 h9 l12 -11 v40 l-12 -11 h-9 z" fill="${c}"/>
  <path d="M11 -9 q8 9 0 18" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
  <path d="M17 -15 q14 15 0 30" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
const drumSvg = `
  <rect x="-58" y="-14" width="116" height="58" fill="#E8493F"/>
  <path d="M-58 4 L-29 40 L0 4 L29 40 L58 4" fill="none" stroke="#F5B324" stroke-width="5"/>
  <ellipse cx="0" cy="44" rx="58" ry="14" fill="#A3321B"/>
  <ellipse cx="0" cy="-14" rx="58" ry="18" fill="#FFF3DD" stroke="#A3321B" stroke-width="5"/>`;
// 停车位（是车）与零件箱（车上的东西）：画的是图，不写字
const CAR_BIN = `
  <rect x="180" y="640" width="300" height="140" rx="14" fill="#6D7A8C"/>
  <rect x="192" y="652" width="276" height="116" rx="10" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-dasharray="18 12"/>
  <g transform="translate(330 744)" opacity="0.35">
    <rect x="-50" y="-26" width="100" height="30" rx="10" fill="#FFFFFF"/><rect x="-28" y="-44" width="56" height="22" rx="8" fill="#FFFFFF"/>
    <circle cx="-28" cy="6" r="11" fill="#FFFFFF"/><circle cx="28" cy="6" r="11" fill="#FFFFFF"/></g>`;
const PART_BIN = `
  <path d="M730 650 L1010 650 L995 780 L745 780 Z" fill="#D9A441" stroke="#A97B4F" stroke-width="5"/>
  <rect x="820" y="630" width="100" height="26" rx="10" fill="none" stroke="#A97B4F" stroke-width="7"/>
  <g transform="translate(870 744)" opacity="0.4">
    <circle cx="-40" cy="0" r="22" fill="#3A3A38"/><circle cx="-40" cy="0" r="9" fill="#FFFFFF"/>
    <circle cx="30" cy="-6" r="16" fill="#FFE066"/><rect x="18" y="8" width="24" height="12" fill="#8F8C84"/></g>`;

// 一块牌子，一字一格；原点在牌子中心
function makeSign(word, size, cls) {
  const chars = [...word];
  const pad = Math.round(size * 0.2);
  const gap = Math.round(size * 0.12);
  const w = chars.length * size + (chars.length - 1) * gap + pad * 2;
  const h = size + pad * 2;
  const g = el('g', { class: cls });
  g.appendChild(el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 16, fill: '#C89B6A', stroke: '#A97B4F', 'stroke-width': 5 }));
  const left = i => -w / 2 + pad + i * (size + gap);
  const cells = chars.map((c, i) => {
    const cell = el('g', { class: 'sy-cell', transform: `translate(${left(i)} ${-h / 2 + pad})` }, `
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.14)}" fill="${CELL}" stroke="#D9B98A" stroke-width="3"/>
      <text x="${size / 2}" y="${Math.round(size * 0.8)}" text-anchor="middle" font-size="${Math.round(size * 0.76)}" fill="${INK}">${c}</text>`);
    cell.dataset.i = i;
    g.appendChild(cell);
    return cell;
  });
  g.dataset.word = word;
  return { g, cells, w, h, size, centerX: i => left(i) + size / 2, top: -h / 2 + pad };
}
const cellFill = (cell, color) => cell.querySelector('rect').setAttribute('fill', color);
const place = (g, x, y) => g.setAttribute('transform', `translate(${x} ${y})`);

function vehiclePic(type) {
  const names = Object.keys(PALETTE);
  const color = names.includes('orange') ? 'orange' : names[0];
  const g = el('g', { transform: 'translate(92 300) scale(0.4)' });
  g.appendChild(buildVehicle(type, color).el);
  return g;
}

function shake(g) {
  const base = g.getAttribute('transform') || '';
  let k = 0;
  const step = () => {
    k += 1;
    g.setAttribute('transform', `${base} translate(${k % 2 ? 12 : -12} 0)`);
    if (k < 5) setTimeout(step, 80);
    else g.setAttribute('transform', base);
  };
  step();
}

export function runSyllableGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    let errors = 0;
    let helps = 0;
    let finished = false;
    let busy = false; // 示范/指读/回放进行中：点击先不收（都只有几秒）
    // 每段语音流程一个令牌；孩子一动手就换令牌，旧流程在下一个 await 之后自己退出
    let seq = 0;
    const live = my => my === seq && !finished;
    let onIdle = () => {};
    let onTap = () => {};
    let replay = () => {};

    const svgPoint = e => {
      const pt = stage.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(stage.getScreenCTM().inverse());
    };
    layer.appendChild(el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 24, fill: '#FFF8EA', stroke: '#C89B4A', 'stroke-width': 5 }));
    const ear = el('g', { class: 'sy-ear', transform: `translate(${EAR.x} ${EAR.y})`, style: 'cursor:pointer' },
      `<circle r="30" fill="#FFF3DD" stroke="#C89B4A" stroke-width="4"/>${speakerSvg('#6B4A12')}`);
    const panelG = el('g'); // 每轮会换的：车的图、牌子
    const floorG = el('g'); // 地面：牌子、选项、筐
    const slotsG = el('g');
    const beadsG = el('g');
    layer.append(ear, panelG, floorG, slotsG, beadsG);

    const idle = attachIdleHelp(stage, fires => {
      if (document.getElementById('parent-panel') || finished || busy) return;
      onIdle(fires);
    }, 18000);

    function onDown(e) {
      if (finished) return;
      if (e.target.closest('.sy-ear')) { // 小喇叭：再听一遍（自己要听，不算求助）
        if (!busy) { seq += 1; replay(seq); }
        return;
      }
      if (busy) return;
      onTap(e);
    }
    stage.addEventListener('pointerdown', onDown);
    const winListeners = [];
    const onWin = (type, fn) => { window.addEventListener(type, fn); winListeners.push([type, fn]); };
    function cleanup() {
      stage.removeEventListener('pointerdown', onDown);
      winListeners.forEach(([t, f]) => window.removeEventListener(t, f));
      idle.dispose();
    }
    function finish() {
      if (finished) return;
      finished = true;
      seq += 1;
      cleanup();
      sfx.cheer();
      sayNow('sy-done');
      setTimeout(() => { layer.innerHTML = ''; resolve({ errors, helps }); }, 1400);
    }
    const hand = (a, b) => window.__guideHand?.(a, b || a);

    // ── 珠子：拍一下亮一颗；示范时念一个字亮一颗 ──
    let beads = [];
    function clearBeads() { beadsG.innerHTML = ''; beads = []; }
    function addBead(color) {
      if (beads.length >= 7) return null;
      const c = el('circle', { cx: beadX(beads.length), cy: BEAD_Y, r: 20, fill: color });
      beadsG.appendChild(c);
      beads.push(c);
      return c;
    }
    async function clapModel(my, word, lead) {
      busy = true;
      clearBeads();
      await sayNow(...lead);
      for (const c of sylClips(word)) {
        if (!live(my)) break;
        sfx.pop();
        const b = addBead('#66BB4C');
        if (b) pulse(b);
        await say(c);
      }
      if (live(my)) await wait(500);
      clearBeads();
      busy = false;
    }

    // ── 1 拍车名：说一个字，拍一下鼓（停下来1.8秒才算拍完） ──
    function runClap() {
      const rounds = task.rounds;
      let r = 0;
      let tries = 0;
      let taps = 0;
      let slots = false;
      let evalTimer = null;
      const drum = el('g', { class: 'sy-drum', transform: 'translate(330 330)', style: 'cursor:pointer' }, drumSvg);
      layer.insertBefore(drum, slotsG);
      const word = () => rounds[r].word;
      const n = () => sylWord(word()).s.length;
      const ask = first => (first ? say : sayNow)('sy-this', wordClip(word()), 'sy-clap-go');
      function showSlots() { // 两次没拍对 / 发呆太久：画出该拍几下的虚线圈，照着拍满就行
        slots = true;
        slotsG.innerHTML = '';
        for (let i = 0; i < n(); i++) slotsG.appendChild(el('circle', { class: 'sy-slot', cx: beadX(i), cy: BEAD_Y, r: 23, fill: 'none', stroke: '#C89B4A', 'stroke-width': 4, 'stroke-dasharray': '6 5' }));
      }
      function startRound() {
        if (evalTimer) { clearTimeout(evalTimer); evalTimer = null; }
        tries = 0; taps = 0; slots = false;
        slotsG.innerHTML = '';
        clearBeads();
        panelG.innerHTML = '';
        panelG.appendChild(vehiclePic(sylWord(word()).pic));
        seq += 1;
        ask(r === 0);
        idle.reset();
      }
      async function judge() {
        evalTimer = null;
        const my = ++seq;
        if (taps === n()) {
          busy = true;
          beads.forEach(b => b.setAttribute('fill', '#66BB4C'));
          sfx.snap();
          await sayNow('sy-clap-good');
          const clips = sylClips(word()); // 回放：一个字一颗珠子
          for (let i = 0; i < clips.length; i++) {
            if (!live(my)) break;
            if (beads[i]) pulse(beads[i]);
            await say(clips[i]);
          }
          if (live(my)) await say(`num-${n()}`, 'sy-xia');
          busy = false;
          if (!live(my)) return;
          r += 1;
          if (r >= rounds.length) finish();
          else startRound();
          return;
        }
        errors += 1;
        tries += 1;
        sfx.pop();
        taps = 0;
        await clapModel(my, word(), ['sy-together']); // 拍给他看
        if (!live(my)) return;
        if (tries >= 2) showSlots();
        sayNow('sy-yourturn');
        idle.reset();
      }
      onTap = e => {
        if (!e.target.closest('.sy-drum')) return;
        if (evalTimer) clearTimeout(evalTimer);
        if (taps === 0) sayNow(); // 孩子开拍，正在说的话就停
        seq += 1;
        taps += 1;
        sfx.pop();
        pulse(drum);
        addBead('#F5B324');
        if (slots && taps >= n()) { judge(); return; }
        evalTimer = setTimeout(judge, 1800);
      };
      replay = () => ask(false);
      onIdle = fires => {
        if (taps > 0) return; // 正拍到一半，等他拍完
        if (fires === 1) { sayNow('sy-idle-clap', wordClip(word())); return; } // 再说一遍怎么玩，不算求助
        helps += 1;
        if (fires === 2) { clapModel(++seq, word(), ['sy-together']).then(() => { if (!finished) { sayNow('sy-yourturn'); idle.rearm(); } }); return; }
        showSlots();
        pulse(drum);
        hand(drum);
      };
      startRound();
    }

    // ── 2 找牌子：三块牌子2/3/4个字，几个音就是几个字 ──
    function runSign() {
      const rounds = task.rounds;
      let r = 0;
      let tries = 0;
      let erred = false;
      let signs = [];
      const word = () => rounds[r].word;
      const ask = first => (first ? say : sayNow)('sy-find', wordClip(word()));
      const right = () => signs.find(s => s.g.dataset.word === word());
      function startRound() {
        tries = 0; erred = false;
        clearBeads();
        panelG.innerHTML = '';
        floorG.innerHTML = '';
        const info = sylWord(word());
        if (info.pic) panelG.appendChild(vehiclePic(info.pic));
        const built = rounds[r].signs.map(w => makeSign(w, 56, 'sy-sign'));
        const gap = 44;
        const total = built.reduce((a, b) => a + b.w, 0) + gap * (built.length - 1);
        let x = 600 - total / 2;
        signs = built.map(b => {
          b.x = x + b.w / 2;
          place(b.g, b.x, OPT_Y);
          b.g.style.cursor = 'pointer';
          floorG.appendChild(b.g);
          x += b.w + gap;
          return b;
        });
        seq += 1;
        ask(r === 0);
        idle.reset();
      }
      async function pointRead(my, s) {
        const clips = sylClips(s.g.dataset.word);
        for (let i = 0; i < s.cells.length; i++) {
          if (!live(my)) return;
          cellFill(s.cells[i], HI);
          await say(clips[i]);
          cellFill(s.cells[i], OK);
        }
      }
      onTap = async e => {
        const g = e.target.closest('.sy-sign');
        if (!g) return;
        const s = signs.find(x => x.g === g);
        if (!s) return;
        const my = ++seq;
        if (g.dataset.word === word()) {
          busy = true;
          sfx.snap();
          sayNow();
          place(g, s.x, OPT_Y - 16);
          await pointRead(my, s); // 指着念：一个格子一个音
          if (live(my) && (r === 0 || erred)) await say('sy-rule');
          if (live(my)) await wait(400);
          busy = false;
          if (!live(my)) return;
          r += 1;
          if (r >= rounds.length) finish();
          else startRound();
          return;
        }
        errors += 1;
        tries += 1;
        erred = true;
        sfx.pop();
        shake(g);
        if (tries === 1) {
          await clapModel(my, word(), ['sy-wrong', 'sy-count']); // 数一数它有几个音
          if (live(my)) ask(false);
          idle.reset();
          return;
        }
        helps += 1;
        ask(false);
        const rs = right();
        if (rs) { pulse(rs.g); hand(rs.g); }
      };
      replay = () => ask(false);
      onIdle = fires => {
        if (fires === 1) { ask(false); return; }
        helps += 1;
        if (fires === 2) {
          const my = ++seq;
          clapModel(my, word(), ['sy-count']).then(() => { if (live(my)) { ask(false); idle.rearm(); } });
          return;
        }
        const rs = right();
        if (rs) { pulse(rs.g); hand(rs.g); }
      };
      startRound();
    }

    // ── 3 指着念：念一遍，再问"'防'是哪个字"（从不问已经认得的字） ──
    function runPoint() {
      const rounds = task.rounds;
      let r = 0;
      let tries = 0;
      let sign = null;
      const finger = el('path', { d: 'M0 0 L-14 -24 L14 -24 Z', fill: '#E8493F', opacity: 0, transform: 'translate(270 280)' });
      const word = () => rounds[r].word;
      const askIdx = () => rounds[r].ask;
      const ask = () => sayNow('sy-which', sylClips(word())[askIdx()]);
      function moveFinger(i) {
        finger.setAttribute('transform', `translate(${270 + sign.centerX(i)} ${340 + sign.top - 8})`);
        finger.setAttribute('opacity', 1);
      }
      async function pointRead(my, upTo) { // upTo：念到那个字就停在那儿
        busy = true;
        const clips = sylClips(word());
        const last = upTo ?? clips.length - 1;
        for (let i = 0; i <= last; i++) {
          if (!live(my)) break;
          sign.cells.forEach(c => cellFill(c, CELL));
          cellFill(sign.cells[i], HI);
          moveFinger(i);
          await say(clips[i]);
          if (live(my)) await wait(120);
        }
        if (upTo === undefined) sign.cells.forEach(c => cellFill(c, CELL));
        finger.setAttribute('opacity', 0);
        busy = false;
      }
      async function startRound() {
        tries = 0;
        panelG.innerHTML = '';
        sign = makeSign(word(), [...word()].length === 4 ? 64 : 76, 'sy-big');
        place(sign.g, 270, 340);
        panelG.append(sign.g, finger);
        const my = ++seq;
        idle.reset();
        busy = true;
        if (r === 0) await say(); // 第一轮排在任务语音后面再念
        busy = false;
        if (!live(my)) return;
        await pointRead(my);
        if (!live(my)) return;
        ask();
        idle.reset();
      }
      onTap = async e => {
        const cell = e.target.closest('.sy-cell');
        if (!cell || !sign || !sign.g.contains(cell)) return;
        const i = Number(cell.dataset.i);
        const my = ++seq;
        if (i === askIdx()) {
          busy = true;
          cellFill(cell, OK);
          sfx.snap();
          await sayNow(sylClips(word())[i], 'sy-good');
          if (live(my)) await wait(500);
          busy = false;
          if (!live(my)) return;
          r += 1;
          if (r >= rounds.length) finish();
          else startRound();
          return;
        }
        errors += 1;
        tries += 1;
        sfx.pop();
        shake(cell);
        if (tries === 1) {
          await sayNow('sy-point-again');
          if (!live(my)) return;
          await pointRead(my);
          if (live(my)) ask();
        } else {
          helps += 1;
          await pointRead(my, askIdx());
          if (live(my)) { ask(); hand(sign.cells[askIdx()]); }
        }
        idle.reset();
      };
      replay = my => { pointRead(my).then(() => { if (live(my)) ask(); }); };
      onIdle = fires => {
        if (fires === 1) { ask(); return; }
        helps += 1;
        const my = ++seq;
        if (fires === 2) { pointRead(my).then(() => { if (live(my)) { ask(); idle.rearm(); } }); return; }
        pointRead(my, askIdx()).then(() => { if (live(my)) { ask(); hand(sign.cells[askIdx()]); } });
      };
      startRound();
    }

    // ── 4/5 去掉一个字：听三个选项选一个；错了就"写出来看看"，把那个字拿走再念剩下的 ──
    function runDel() {
      const rounds = task.rounds;
      let r = 0;
      let tries = 0;
      let btns = [];
      const cur = () => rounds[r];
      const word = () => cur().word;
      const optClips = i => cur().options[i].map(k => sylClips(word())[k]);
      async function ask(my, first) {
        await (first ? say : sayNow)(wordClip(word()), 'sy-bushuo', sylClips(word())[cur().drop], 'sy-shengsha');
        if (!live(my)) return;
        await say('sy-listen');
        for (let i = 0; i < btns.length; i++) {
          if (!live(my)) return;
          pulse(btns[i]);
          await say(...optClips(i));
          if (live(my)) await wait(350);
        }
      }
      function showCut(fadeOnly) { // 牌子上把去掉的字拿走
        panelG.innerHTML = '';
        const s = makeSign(word(), 60, 'sy-scaf');
        place(s.g, 270, 330);
        panelG.appendChild(s.g);
        const d = s.cells[cur().drop];
        d.style.transition = 'opacity 0.5s';
        d.style.opacity = '0.15';
        const x0 = s.centerX(cur().drop) - s.size / 2;
        s.g.appendChild(el('line', { x1: x0 + 6, y1: s.top + 6, x2: x0 + s.size - 6, y2: s.top + s.size - 6, stroke: '#E8493F', 'stroke-width': 7, 'stroke-linecap': 'round' }));
        if (!fadeOnly) return s;
        cur().options[cur().answer].forEach(k => cellFill(s.cells[k], OK));
        return s;
      }
      async function scaffold(my) {
        busy = true;
        await sayNow('sy-see');
        const s = showCut(false);
        if (live(my)) await wait(700);
        if (live(my)) await say('sy-shengxia');
        const clips = sylClips(word());
        for (const k of cur().options[cur().answer]) {
          if (!live(my)) break;
          cellFill(s.cells[k], HI);
          await say(clips[k]);
        }
        busy = false;
      }
      function startRound() {
        tries = 0;
        panelG.innerHTML = '';
        floorG.innerHTML = '';
        const info = sylWord(word());
        if (info.pic) panelG.appendChild(vehiclePic(info.pic));
        btns = cur().options.map((_, i) => {
          const b = el('g', { class: 'sy-opt', transform: `translate(${OPT_X[i]} ${OPT_Y})`, style: 'cursor:pointer' },
            `<circle r="58" fill="${OPT_COLORS[i]}" stroke="#FFF8EA" stroke-width="6"/>${speakerSvg('#FFFFFF')}`);
          b.dataset.i = i;
          floorG.appendChild(b);
          return b;
        });
        const my = ++seq;
        ask(my, r === 0);
        idle.reset();
      }
      onTap = async e => {
        const b = e.target.closest('.sy-opt');
        if (!b) return;
        const i = Number(b.dataset.i);
        const my = ++seq;
        const heard = sayNow(...optClips(i)); // 先念一下他选的
        if (i === cur().answer) {
          busy = true;
          b.querySelector('circle').setAttribute('fill', '#66BB4C');
          sfx.snap();
          showCut(true);
          await heard;
          if (live(my)) await say('sy-good');
          if (live(my)) await wait(500);
          busy = false;
          if (!live(my)) return;
          r += 1;
          if (r >= rounds.length) finish();
          else startRound();
          return;
        }
        errors += 1;
        tries += 1;
        sfx.pop();
        shake(b);
        await heard;
        if (!live(my)) return;
        if (tries === 1) {
          await scaffold(my);
          if (live(my)) ask(my, false);
          idle.reset();
          return;
        }
        helps += 1;
        const rb = btns[cur().answer];
        pulse(rb);
        hand(rb);
        idle.reset();
      };
      replay = my => ask(my, false);
      onIdle = fires => {
        const my = ++seq;
        if (fires === 1) { ask(my, false); return; } // 再问一遍、再放一遍选项，不算求助
        helps += 1;
        if (fires === 2) { scaffold(my).then(() => { if (live(my)) { ask(my, false); idle.rearm(); } }); return; }
        const rb = btns[cur().answer];
        pulse(rb);
        hand(rb);
      };
      startRound();
    }

    // ── 6 是不是车：车字在后面是车（开进停车位），车字在前面是车上的东西（放进零件箱） ──
    function runHead() {
      const items = task.items;
      let idx = 0;
      let tries = 0;
      let erred = false;
      let cur = null;
      const seen = { car: false, part: false };
      const counts = { car: 0, part: 0 };
      const carBin = el('g', { class: 'sy-bin' }, CAR_BIN);
      const partBin = el('g', { class: 'sy-bin' }, PART_BIN);
      floorG.append(carBin, partBin);
      const binEl = k => (k === 'car' ? carBin : partBin);
      const want = it => (it.car ? 'car' : 'part');
      const binOf = p => {
        if (p.y < BIN_Y0 - 40 || p.y > BIN_Y1 + 10) return null;
        for (const [k, b] of Object.entries(BINS)) if (p.x >= b.x0 - 20 && p.x <= b.x1 + 20) return k;
        return null;
      };
      const explain = it => [wordClip(it.word), it.car ? 'sy-head-car' : 'sy-head-part'];
      const cheCell = () => cur.cells[[...cur.item.word].indexOf('车')];
      function showItem() {
        tries = 0;
        erred = false;
        const it = items[idx];
        const s = makeSign(it.word, 64, 'sy-item');
        place(s.g, HEAD_START.x, HEAD_START.y);
        s.g.style.cursor = 'grab';
        panelG.appendChild(s.g);
        cur = { ...s, item: it };
        seq += 1;
        (idx === 0 ? say : sayNow)(wordClip(it.word));
        idle.reset();
      }
      function flyBack() {
        cur.g.style.transition = 'transform 0.3s';
        place(cur.g, HEAD_START.x, HEAD_START.y);
        const g = cur.g;
        setTimeout(() => { g.style.transition = ''; }, 320);
      }
      let drag = null;
      onTap = e => {
        const g = e.target.closest('.sy-item');
        if (!g || !cur || g !== cur.g || drag) return;
        sayNow(); // 孩子动手，说话停
        const p = svgPoint(e);
        const m = /translate\(([-\d.]+)[ ,]([-\d.]+)\)/.exec(g.getAttribute('transform'));
        g.style.transition = '';
        drag = { dx: p.x - Number(m[1]), dy: p.y - Number(m[2]), id: e.pointerId };
        layer.appendChild(g); // 拖着的时候在最上层
      };
      onWin('pointermove', e => {
        if (!drag || e.pointerId !== drag.id || !cur) return;
        const p = svgPoint(e);
        place(cur.g, p.x - drag.dx, p.y - drag.dy);
      });
      const onUp = e => {
        if (!drag || e.pointerId !== drag.id) return;
        const p = svgPoint(e);
        drag = null;
        idle.reset();
        if (finished || !cur) return;
        const k = binOf(p);
        if (!k) { flyBack(); return; } // 没放进筐：不算错
        const it = cur.item;
        if (k === want(it)) {
          const slot = counts[k]++;
          const b = BINS[k];
          cur.g.setAttribute('transform', `translate(${b.x0 + 80 + (slot % 2) * 140} ${690 + Math.floor(slot / 2) * 58}) scale(0.5)`);
          cur.g.setAttribute('class', 'sy-placed');
          floorG.appendChild(cur.g);
          sfx.snap();
          const first = !seen[k];
          seen[k] = true;
          if (first || erred) sayNow(...explain(it)); // 每种第一次、或者刚错过，把道理说一遍
          else sayNow(wordClip(it.word), 'sy-good');
          const delay = first || erred ? 2600 : 1300;
          cur = null;
          idx += 1;
          busy = true;
          setTimeout(() => {
            busy = false;
            if (finished) return;
            if (idx >= items.length) finish();
            else showItem();
          }, delay);
          return;
        }
        errors += 1;
        tries += 1;
        erred = true;
        sfx.pop();
        flyBack();
        sayNow(...explain(it));
        pulse(cheCell());
        if (tries >= 2) { helps += 1; hand(cur.g, binEl(want(it))); }
      };
      onWin('pointerup', onUp);
      onWin('pointercancel', onUp);
      replay = () => { if (cur) sayNow(wordClip(cur.item.word)); };
      onIdle = fires => {
        if (!cur || drag) return;
        if (fires === 1) { sayNow(wordClip(cur.item.word)); return; }
        helps += 1;
        if (fires === 2) { sayNow('sy-head-rule'); pulse(cheCell()); return; }
        hand(cur.g, binEl(want(cur.item)));
      };
      showItem();
    }

    ({ clap: runClap, sign: runSign, point: runPoint, del: runDel, head: runHead })[task.kind]();
  });
}
