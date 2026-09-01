import { buildVehicle, PALETTE, wheel } from './vehicles.js';
import { STICKERS, WHEEL_STYLES } from './rewards-data.js';
import { say, sfx } from './audio.js';
import { makeRng } from './rng.js';

const SVG = 'http://www.w3.org/2000/svg';

// 车身贴纸的坐标约定：placed[i] = {id, x, y} 中的 x/y 是"车身局部坐标"——
// 也就是 buildVehicle() 返回的 <g class="vehicle"> 自身的坐标系（跟 body() 里画轮廓用的是同一套数字，
// 与这只车最终被 translate/scale 到舞台哪里无关）。这样贴纸标记既能画在我的车库里 1.25 倍大的车上，
// 也能原样画在车库大厅里 0.85 倍小的伙伴车上，不需要在两处分别做坐标换算。
export function renderPlaced(el, placed, scale = 0.9) {
  el.querySelectorAll(':scope > .placed-sticker').forEach(n => n.remove());
  placed.forEach((p, i) => {
    const item = STICKERS[p.id];
    if (!item) return;
    const g = document.createElementNS(SVG, 'g');
    g.setAttribute('class', 'placed-sticker');
    g.setAttribute('data-i', String(i));
    g.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${scale})`);
    g.innerHTML = item.svg;
    el.appendChild(g);
  });
}

const CAR_TX = 210, CAR_TY = 190, CAR_SCALE = 1.25;
const TRAY_Y = 345; // mycar-svg 坐标里，低于这条线视为"放回/挪出车身"的托盘区

export function openMyCar(data, store, onClose) {
  const cc = data.collection.carConfig;
  const rng = makeRng();

  const wrap = document.createElement('div');
  wrap.className = 'page-overlay';
  wrap.innerHTML = `
    <div class="page-card page-wide">
      <p class="page-title">我的车库</p>
      <svg id="mycar-svg" viewBox="0 0 760 420" width="760" height="420"></svg>
      <button type="button" class="pp-wide" id="mycar-back">返回</button>
    </div>`;
  document.body.appendChild(wrap);
  const svg = wrap.querySelector('#mycar-svg');

  function toSvgPoint(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function toCarLocal(p) {
    return { x: (p.x - CAR_TX) / CAR_SCALE, y: (p.y - CAR_TY) / CAR_SCALE };
  }

  let buddy = null;
  let reacting = false;
  let drag = null;

  function renderCar() {
    svg.innerHTML = `
      <rect x="0" y="0" width="760" height="420" rx="20" fill="#FFF3DD"/>
      <rect x="0" y="${TRAY_Y}" width="760" height="${420 - TRAY_Y}" fill="#EFE6D2"/>
      <line x1="0" y1="${TRAY_Y}" x2="760" y2="${TRAY_Y}" stroke="#D9CBAD" stroke-width="4"/>
      <text x="380" y="${TRAY_Y - 12}" text-anchor="middle" font-size="16" fill="#A0763A">拖贴纸到车上；把车上的贴纸拖回这里可以摘掉</text>
      <g id="paint-col"></g>
      <g id="wheel-col"></g>
      <g id="car-slot"></g>
      <g id="tray"></g>`;

    buddy = buildVehicle('race', cc.paint, { wheelStyle: cc.wheel });
    buddy.el.setAttribute('transform', `translate(${CAR_TX} ${CAR_TY}) scale(${CAR_SCALE})`);
    buddy.el.style.transformOrigin = '150px 7px';
    svg.querySelector('#car-slot').appendChild(buddy.el);
    renderPlaced(buddy.el, cc.placed, 0.9);

    renderPaints();
    renderWheels();
    renderTray();
  }

  function renderPaints() {
    const col = svg.querySelector('#paint-col');
    const owned = [...new Set([cc.paint, ...data.collection.paints])];
    owned.forEach((name, i) => {
      const cy = 55 + i * 54;
      const selected = name === cc.paint;
      const g = document.createElementNS(SVG, 'g');
      g.setAttribute('transform', `translate(48 ${cy})`);
      g.style.cursor = 'pointer';
      g.innerHTML = `
        <circle r="24" fill="${PALETTE[name]}" stroke="${selected ? '#8A5A1F' : '#D9CBAD'}" stroke-width="${selected ? 5 : 3}"/>
        ${selected ? '<circle r="24" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>' : ''}`;
      g.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (cc.paint === name) return;
        cc.paint = name;
        store.save(data);
        sfx.pop();
        say('paint-fun');
        renderCar();
      });
      col.appendChild(g);
    });
  }

  function renderWheels() {
    const col = svg.querySelector('#wheel-col');
    const owned = [...new Set(['w1', ...data.collection.wheels])];
    owned.forEach((style, i) => {
      const cx = 700, cy = 70 + i * 105;
      const selected = style === cc.wheel;
      const g = document.createElementNS(SVG, 'g');
      g.style.cursor = 'pointer';
      g.innerHTML = `
        <circle cx="${cx}" cy="${cy}" r="36" fill="#FFF3DD" stroke="${selected ? '#8A5A1F' : '#D9CBAD'}" stroke-width="${selected ? 5 : 3}"/>
        ${wheel(cx, cy, 26, style)}
        <text x="${cx}" y="${cy + 50}" text-anchor="middle" font-size="15" fill="#8A5A1F">${WHEEL_STYLES[style].name}</text>`;
      g.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (cc.wheel === style) return;
        cc.wheel = style;
        store.save(data);
        sfx.pop();
        say('wheel-cool');
        renderCar();
      });
      col.appendChild(g);
    });
  }

  function renderTray() {
    const col = svg.querySelector('#tray');
    const owned = [...new Set(data.collection.stickers)];
    owned.forEach((id, i) => {
      const item = STICKERS[id];
      if (!item) return;
      const cx = 60 + i * 46, cy = 382;
      const g = document.createElementNS(SVG, 'g');
      g.setAttribute('class', 'tray-sticker');
      g.setAttribute('data-id', id);
      g.setAttribute('transform', `translate(${cx} ${cy}) scale(0.8)`);
      g.style.cursor = 'grab';
      g.innerHTML = item.svg;
      col.appendChild(g);
    });
  }

  // --- 车身反应（点一下车身本体，不是贴纸）---
  const BASE_TRANSFORM = `translate(${CAR_TX}px, ${CAR_TY}px) scale(${CAR_SCALE})`;
  // 重要：buddy.el 本身用 SVG transform 属性做定位（translate+scale）。
  // 如果直接用 WAAPI 去 animate 它的 CSS transform，CSS transform 会整体覆盖掉这条属性（不是叠加!），
  // 车会瞬间"传送"回局部坐标原点再做动画 —— 也就是任务里提醒的"teleporting"坑。
  // 解法：每一帧 keyframe 都把 BASE_TRANSFORM 显式写进去，animate 结束后（fill 默认是 none）
  // CSS transform 的影响消失，车自然掉回由属性 transform 决定的原位，不会有残留。
  function reactionBounce() {
    sfx.pop();
    buddy.el.animate([
      { transform: `${BASE_TRANSFORM} translateY(0px)` },
      { transform: `${BASE_TRANSFORM} translateY(-22px)` },
      { transform: `${BASE_TRANSFORM} translateY(0px)` },
    ], { duration: 480, easing: 'ease-in-out' });
  }
  function reactionSpin() {
    sfx.ding();
    buddy.el.animate([
      { transform: `${BASE_TRANSFORM} rotate(0deg)` },
      { transform: `${BASE_TRANSFORM} rotate(360deg)` },
    ], { duration: 650, easing: 'ease-in-out' });
  }
  function reactionHorn() {
    sfx.horn();
    const eyes = buddy.el.querySelectorAll('.v-pupil');
    eyes.forEach(p => { p.style.transition = 'opacity 0.1s'; });
    const blink = (opacity, delay) => setTimeout(() => eyes.forEach(p => { p.style.opacity = String(opacity); }), delay);
    blink(0, 0); blink(1, 140); blink(0, 280); blink(1, 420);
  }
  function carReaction() {
    if (reacting || !buddy) return;
    reacting = true;
    rng.pick([reactionBounce, reactionSpin, reactionHorn])();
    setTimeout(() => { reacting = false; }, 700);
  }

  // --- 拖拽：贴纸从托盘拖上车身 / 从车身拖回托盘区摘除 ---
  function makeGhost(svgFragment, p) {
    const ghost = document.createElementNS(SVG, 'g');
    ghost.setAttribute('class', 'drag-ghost');
    ghost.style.pointerEvents = 'none';
    ghost.innerHTML = svgFragment;
    ghost.setAttribute('transform', `translate(${p.x} ${p.y}) scale(0.9)`);
    svg.appendChild(ghost);
    return ghost;
  }

  function onSvgDown(e) {
    if (drag) return;
    const trayHit = e.target.closest('.tray-sticker');
    if (trayHit) {
      e.stopPropagation();
      const id = trayHit.dataset.id;
      const p = toSvgPoint(e.clientX, e.clientY);
      drag = { kind: 'new', id, pointerId: e.pointerId, ghost: makeGhost(STICKERS[id].svg, p) };
      sfx.pop();
      return;
    }
    const placedHit = e.target.closest('.placed-sticker');
    if (placedHit) {
      e.stopPropagation();
      const index = Number(placedHit.dataset.i);
      const id = cc.placed[index].id;
      placedHit.style.opacity = '0.3';
      const p = toSvgPoint(e.clientX, e.clientY);
      drag = { kind: 'move', index, pointerId: e.pointerId, ghost: makeGhost(STICKERS[id].svg, p) };
      return;
    }
    if (buddy && buddy.el.contains(e.target)) { carReaction(); }
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    drag.ghost.setAttribute('transform', `translate(${p.x} ${p.y}) scale(0.9)`);
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    drag.ghost.remove();
    if (drag.kind === 'new') {
      if (p.y < TRAY_Y) {
        const local = toCarLocal(p);
        cc.placed.push({ id: drag.id, x: Math.round(local.x), y: Math.round(local.y) });
        store.save(data);
        sfx.snap();
        say('sticker-stick');
        renderCar();
      }
    } else if (drag.kind === 'move') {
      if (p.y >= TRAY_Y) {
        cc.placed.splice(drag.index, 1);
        store.save(data);
        sfx.pop();
      } else {
        const local = toCarLocal(p);
        cc.placed[drag.index].x = Math.round(local.x);
        cc.placed[drag.index].y = Math.round(local.y);
        store.save(data);
      }
      renderCar();
    }
    drag = null;
  }

  function onCancel(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.ghost.remove();
    drag = null;
    renderCar();
  }

  svg.addEventListener('pointerdown', onSvgDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);

  function cleanup() {
    svg.removeEventListener('pointerdown', onSvgDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  }

  wrap.querySelector('#mycar-back').addEventListener('pointerdown', () => {
    cleanup();
    wrap.remove();
    onClose();
  }, { once: true });

  renderCar();
  say('garage-mine');
}
