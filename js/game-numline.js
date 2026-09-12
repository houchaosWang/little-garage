import { sfx, say, sayNow } from './audio.js';
import { pulse } from './guide.js';
import { PALETTE } from './vehicles.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};
const wait = ms => new Promise(r => setTimeout(r, ms));

// 数字赛道（依据见 taskgen.js 的 NUMLINE_LEVELS 注释：Siegler & Ramani 的直线数字棋盘、Siegler & Booth 的数轴估计）。
// 关键：车每走一格就报出那一格上的数（"七、八"），不是"一、二"——这是棋盘游戏起作用的地方。
// 布局：赛道在车的上方（车身从 y≈465 开始），转盘在左下、选项在地面，都不挡车。
const TRACK = { x0: 100, x1: 1100, y: 360 };
const ME = '#E8763A';
const ME_Y = TRACK.y - 58;
const RV_Y = TRACK.y + 58;
export const carSvg = color => `
  <rect x="-26" y="-14" width="52" height="22" rx="8" fill="${color}"/>
  <rect x="-12" y="-26" width="26" height="14" rx="5" fill="${color}"/>
  <rect x="-8" y="-23" width="18" height="9" rx="3" fill="#DDF1FF"/>
  <circle cx="-15" cy="10" r="7" fill="#3A3A38"/><circle cx="15" cy="10" r="7" fill="#3A3A38"/>`;
const PIP = { 1: [[0, 0]], 2: [[-15, -15], [15, 15]], 3: [[-17, -17], [0, 0], [17, 17]], 4: [[-16, -16], [16, -16], [-16, 16], [16, 16]] };
const EST = { x0: 150, x1: 1050, y: 360 };

export function runNumlineGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    const N = task.end;
    const rivalColor = PALETTE[customer.color] || '#3E8EE0';
    let errors = 0;
    let helps = 0;
    let finished = false;
    let phase = 'intro';

    function svgPoint(e) {
      const pt = stage.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(stage.getScreenCTM().inverse());
    }
    function place(g, x, y, ms = 0) {
      g.style.transition = ms ? `transform ${ms}ms ease-out` : '';
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${y})`);
      if (ms) setTimeout(() => { g.style.transition = ''; }, ms + 30);
    }
    function done() {
      if (finished) return;
      finished = true;
      cleanup();
      setTimeout(() => { layer.innerHTML = ''; resolve({ errors, helps }); }, 700);
    }

    // ── 一排编号格子（比赛、还差几格共用） ──
    const cw = (TRACK.x1 - TRACK.x0) / N;
    const sqX = i => TRACK.x0 + cw * (i - 0.5);
    const squares = [];
    const baseFill = i => (i === N ? '#FFE1A6' : '#FFF8EA');
    function drawSquares() {
      for (let i = 1; i <= N; i++) {
        const g = el('g', { class: 'nl-sq', transform: `translate(${sqX(i).toFixed(1)} ${TRACK.y})`, style: 'cursor:pointer' }, `
          <rect x="${(-cw / 2 + 2).toFixed(1)}" y="-30" width="${(cw - 4).toFixed(1)}" height="60" rx="8" fill="${baseFill(i)}" stroke="#C89B4A" stroke-width="3"/>
          <text x="0" y="11" text-anchor="middle" font-size="${N > 10 ? 24 : 32}" fill="#6B4A12">${i}</text>`);
        g.dataset.i = i;
        layer.appendChild(g);
        squares.push(g);
      }
      layer.appendChild(el('g', { transform: `translate(${(sqX(N) + cw / 2 - 8).toFixed(1)} ${TRACK.y - 30})` }, `
        <rect x="0" y="-50" width="4" height="50" fill="#6B4A12"/><path d="M4 -50 L32 -41 L4 -32 Z" fill="#E8493F"/>`));
    }
    const light = (i, on) => { const r = squares[i - 1] && squares[i - 1].querySelector('rect'); if (r) r.setAttribute('fill', on ? '#DFF3C8' : baseFill(i)); };

    // ═════ 比赛（1-3级） ═════
    let pos = 1;
    let rpos = 1;
    let turn = 0;
    let landing = 0;
    let movesLeft = 0;
    let me = null;
    let rival = null;
    let spinner = null;
    let arrow = null;
    let face = null;
    function setupRace() {
      drawSquares();
      rival = el('g', {}, carSvg(rivalColor));
      layer.appendChild(rival);
      place(rival, sqX(1), RV_Y);
      me = el('g', { class: 'nl-me', style: 'cursor:pointer' }, carSvg(ME));
      layer.appendChild(me);
      place(me, sqX(1), ME_Y);
      spinner = el('g', { class: 'nl-spin', transform: 'translate(150 560)', style: 'cursor:pointer' }, `
        <circle cx="0" cy="0" r="60" fill="#FFF8EA" stroke="#C89B4A" stroke-width="5"/>
        <g class="spin-face"></g>
        <g class="spin-arrow"><path d="M0 -52 L11 -28 L-11 -28 Z" fill="#E8493F"/></g>`);
      layer.appendChild(spinner);
      arrow = spinner.querySelector('.spin-arrow');
      face = spinner.querySelector('.spin-face');
      phase = 'spin';
      pulse(spinner);
    }
    // 转针用 SVG 属性一步步转（绕转盘中心）；CSS 旋转在 SVG 子元素上会绕舞台原点转飞
    async function spinArrow(finalDeg) {
      const steps = 28;
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        arrow.setAttribute('transform', `rotate(${(finalDeg * (1 - (1 - t) * (1 - t))).toFixed(1)})`);
        await wait(26);
      }
    }
    async function doSpin() {
      if (phase !== 'spin') return;
      phase = 'spinning';
      const s = task.spins[turn];
      sfx.pop();
      await spinArrow(720 + s * 90);
      face.innerHTML = PIP[s].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="#6B4A12"/>`).join('');
      landing = Math.min(N, pos + s);
      if (!task.predict) {
        movesLeft = landing - pos;
        phase = 'move';
        sayNow(`num-${s}`, 'nl-tapcar');
        pulse(me);
      } else {
        phase = 'guess';
        sayNow(`num-${s}`, 'nl-guess');
      }
      idle.reset();
    }
    async function stepMe() {
      if (phase !== 'move' || movesLeft <= 0) return;
      phase = 'moving';
      pos += 1;
      movesLeft -= 1;
      place(me, sqX(pos), ME_Y, 240);
      sfx.pop();
      sayNow(`num-${pos}`); // 报出格子上的数
      await wait(300);
      if (movesLeft > 0) { phase = 'move'; return; }
      await afterMyMove();
    }
    async function guessSquare(i) {
      if (phase !== 'guess') return;
      phase = 'moving';
      const right = i === landing;
      if (right) { light(i, true); sayNow('nl-right'); } else { errors += 1; sayNow('nl-walk'); }
      await wait(right ? 700 : 1100);
      // 不管猜没猜对，都一格一格走过去、每格报数（猜错时这就是示范"接着往后数"）
      for (let k = pos + 1; k <= landing; k++) {
        place(me, sqX(k), ME_Y, 240);
        sfx.pop();
        await say(`num-${k}`);
      }
      if (!right) { light(landing, true); await wait(700); }
      light(i, false);
      light(landing, false);
      pos = landing;
      await afterMyMove();
    }
    async function afterMyMove() {
      if (pos >= N) {
        sfx.cheer();
        await say('nl-win');
        done();
        return;
      }
      // 对手每回合只走一格（也报数），所以他一定先到终点
      phase = 'rival';
      if (turn === 0) await say('nl-myturn');
      rpos = Math.min(N - 1, rpos + 1);
      place(rival, sqX(rpos), RV_Y, 240);
      sfx.pop();
      await say(`num-${rpos}`);
      turn += 1;
      face.innerHTML = '';
      phase = 'spin';
      pulse(spinner);
      idle.reset();
    }

    // ═════ 估位置（4-5级） ═════
    const valToX = v => EST.x0 + (v / N) * (EST.x1 - EST.x0);
    let round = 0;
    let missed = 0;
    let car = null;
    let badge = null;
    let marks = [];
    function setupEstimate() {
      layer.appendChild(el('rect', { x: EST.x0 - 12, y: EST.y - 22, width: EST.x1 - EST.x0 + 24, height: 44, rx: 22, fill: '#8F8C84' }));
      layer.appendChild(el('line', { x1: EST.x0, y1: EST.y, x2: EST.x1, y2: EST.y, stroke: '#FFFFFF', 'stroke-width': 4, 'stroke-dasharray': '18 14' }));
      for (const [v, x] of [[0, EST.x0], [N, EST.x1]]) {
        layer.appendChild(el('line', { x1: x, y1: EST.y - 36, x2: x, y2: EST.y + 36, stroke: '#6B4A12', 'stroke-width': 6 }));
        layer.appendChild(el('text', { x, y: EST.y + 76, 'text-anchor': 'middle', 'font-size': 40, fill: '#6B4A12' }, String(v)));
      }
      car = el('g', {}, carSvg(ME));
      layer.appendChild(car);
      badge = el('g', {});
      layer.appendChild(badge);
      startRound();
    }
    function startRound() {
      const t = task.targets[round];
      place(car, EST.x0 - 70, EST.y - 58);
      badge.setAttribute('transform', `translate(${EST.x0 - 70} ${EST.y - 128})`);
      badge.innerHTML = `<circle cx="0" cy="0" r="34" fill="#FFEDC2" stroke="#F5B324" stroke-width="5"/><text x="0" y="14" text-anchor="middle" font-size="40" fill="#8A5A1F">${t}</text>`;
      // 第一轮排在客人开场白后面说（不打断）；之后每轮立即说
      (round === 0 ? say : sayNow)('nl-where-pre', `num-${t}`, 'nl-where-post');
      phase = 'est';
      idle.reset();
    }
    async function estimateTap(p) {
      if (phase !== 'est') return;
      phase = 'reveal';
      const t = task.targets[round];
      const g = Math.max(0, Math.min(N, ((p.x - EST.x0) / (EST.x1 - EST.x0)) * N));
      const pin = el('g', { transform: `translate(${valToX(g).toFixed(1)} ${EST.y})` }, `
        <line x1="0" y1="0" x2="0" y2="-44" stroke="#E8493F" stroke-width="5"/><circle cx="0" cy="-50" r="10" fill="#E8493F"/>`);
      layer.appendChild(pin);
      // 揭晓：每个整数标出来，车开到正确的位置——他猜的红针和真正的位置放在一起看
      const ticks = el('g', {});
      for (let v = 0; v <= N; v++) {
        ticks.innerHTML += `<line x1="${valToX(v).toFixed(1)}" y1="${EST.y - 14}" x2="${valToX(v).toFixed(1)}" y2="${EST.y + 14}" stroke="#FFF3DD" stroke-width="3"/>`
          + `<text x="${valToX(v).toFixed(1)}" y="${EST.y + 42}" text-anchor="middle" font-size="${N > 10 ? 18 : 24}" fill="#6B4A12">${v}</text>`;
      }
      layer.appendChild(ticks);
      marks = [pin, ticks];
      place(car, valToX(t), EST.y - 58, 900);
      await wait(950);
      if (Math.abs(g - t) <= task.tol) {
        sfx.cheer();
        await say('nl-close');
      } else {
        errors += 1;
        missed += 1;
        if (missed === 1) await say(`num-${N / 2}`, 'nl-zhongjian'); // 中点是估位置最好用的"锚"
        await say(`num-${t}`);
      }
      await wait(900);
      marks.forEach(m => m.remove());
      marks = [];
      round += 1;
      if (round >= task.targets.length) { done(); return; }
      startRound();
    }

    // ═════ 还差几格（6级） ═════
    let lround = 0;
    let lwrong = 0;
    let plates = [];
    function setupLeft() {
      drawSquares();
      rival = el('g', {}, carSvg(rivalColor));
      layer.appendChild(rival);
      startLeft();
    }
    function startLeft() {
      const p = task.positions[lround];
      squares.forEach((_, i) => light(i + 1, false));
      place(rival, sqX(p), ME_Y);
      light(p, true);
      plates.forEach(pl => pl.remove());
      plates = task.options[lround].map((v, i) => {
        const pl = el('g', { class: 'plate', transform: `translate(${430 + i * 170} 690)`, style: 'cursor:pointer' }, `
          <rect x="-62" y="-52" width="124" height="104" rx="18" fill="#FFF8EA" stroke="#C89B4A" stroke-width="5"/>
          <text x="0" y="22" text-anchor="middle" font-size="60" fill="#6B4A12">${v}</text>`);
        pl.dataset.val = v;
        layer.appendChild(pl);
        return pl;
      });
      lwrong = 0;
      phase = 'left';
      if (lround > 0) sayNow('task-nl-left');
      idle.reset();
    }
    async function driveToEnd(p) {
      // 按"走了几格"报数：1、2、3……（差就是要走的格数）
      for (let k = 1; p + k <= N; k++) {
        place(rival, sqX(p + k), ME_Y, 220);
        sfx.pop();
        await say(`num-${k}`);
      }
    }
    async function leftAnswer(pl, v) {
      if (phase !== 'left') return;
      const p = task.positions[lround];
      if (v === N - p) {
        phase = 'moving';
        pl.querySelector('rect').setAttribute('fill', '#DFF3C8');
        sfx.cheer();
        await driveToEnd(p);
        lround += 1;
        if (lround >= task.positions.length) { done(); return; }
        await wait(500);
        startLeft();
        return;
      }
      errors += 1;
      lwrong += 1;
      shake(pl);
      if (lwrong === 1) {
        sayNow('nl-idle-left');
        for (let i = p + 1; i <= N; i++) pulse(squares[i - 1]);
      } else {
        phase = 'moving';
        sayNow('nl-walk');
        await wait(900);
        await driveToEnd(p);
        await wait(600);
        place(rival, sqX(p), ME_Y);
        phase = 'left';
        idle.reset();
      }
    }
    function shake(p) {
      const base = p.getAttribute('transform');
      let k = 0;
      const stepFn = () => {
        k += 1;
        p.setAttribute('transform', `${base} translate(${k % 2 ? 12 : -12} 0)`);
        if (k < 5) setTimeout(stepFn, 80);
        else p.setAttribute('transform', base);
      };
      stepFn();
    }

    // ── 发呆提示（先提醒方法，不算求助；再给台阶；最后才指出来） ──
    function pointAt(x, y) {
      const dot = el('circle', { cx: x, cy: y, r: 6, fill: 'none' });
      layer.appendChild(dot);
      window.__guideHand?.(dot, dot);
      setTimeout(() => dot.remove(), 3000);
    }
    const idle = attachIdleHelp(stage, (fires) => {
      if (document.getElementById('parent-panel') || finished) return;
      if (task.kind === 'race') {
        if (phase === 'spin') { sayNow('nl-spin'); pulse(spinner); if (fires >= 2) window.__guideHand?.(spinner, spinner); }
        else if (phase === 'move') { sayNow('nl-tapcar'); pulse(me); if (fires >= 2) window.__guideHand?.(me, me); }
        else if (phase === 'guess') {
          if (fires === 1) { sayNow('nl-guess'); return; }
          helps += 1;
          window.__guideHand?.(me, squares[landing - 1]);
        }
        return;
      }
      if (task.kind === 'estimate' && phase === 'est') {
        if (fires === 1) { sayNow('nl-idle-est'); return; }
        helps += 1;
        if (fires === 2) { sayNow(`num-${N / 2}`, 'nl-zhongjian'); pointAt(valToX(N / 2), EST.y); return; }
        pointAt(valToX(task.targets[round]), EST.y);
        return;
      }
      if (task.kind === 'left' && phase === 'left') {
        if (fires === 1) { sayNow('nl-idle-left'); return; }
        helps += 1;
        const right = plates.find(pl => Number(pl.dataset.val) === N - task.positions[lround]);
        if (right) { window.__guideHand?.(right, right); pulse(right); }
      }
    }, 18000);

    function onDown(e) {
      if (finished) return;
      if (task.kind === 'race') {
        if (e.target.closest('.nl-spin')) { doSpin(); return; }
        const sq = e.target.closest('.nl-sq');
        if (phase === 'guess' && sq) { guessSquare(Number(sq.dataset.i)); return; }
        if (phase === 'move' && (sq || e.target.closest('.nl-me'))) stepMe(); // 点车或点赛道都往前走一格
        return;
      }
      if (task.kind === 'estimate') {
        const p = svgPoint(e);
        if (p.y > 280 && p.y < 450 && p.x > EST.x0 - 40 && p.x < EST.x1 + 40) estimateTap(p);
        return;
      }
      const pl = e.target.closest('.plate');
      if (pl) leftAnswer(pl, Number(pl.dataset.val));
    }
    stage.addEventListener('pointerdown', onDown);
    function cleanup() {
      stage.removeEventListener('pointerdown', onDown);
      idle.dispose();
    }

    if (task.kind === 'race') setupRace();
    else if (task.kind === 'estimate') setupEstimate();
    else setupLeft();
  });
}
