const SVG = 'http://www.w3.org/2000/svg';

export function attachIdleHelp(stage, onIdle, ms = 12000) {
  let timer = null;
  let disposed = false;
  let fires = 0;
  const arm = () => {
    if (disposed) return;
    clearTimeout(timer);
    timer = setTimeout(() => { fires += 1; onIdle(fires); arm(); }, ms);
  };
  const reset = () => { fires = 0; arm(); };
  const onAny = () => reset();
  stage.addEventListener('pointerdown', onAny);
  reset();
  return {
    reset,
    dispose() {
      disposed = true;
      clearTimeout(timer);
      stage.removeEventListener('pointerdown', onAny);
    },
  };
}

export function pulse(el) {
  if (!el) return;
  el.style.transformBox = 'fill-box';
  el.style.transformOrigin = 'center';
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
    { duration: 450, iterations: 3, easing: 'ease-in-out' },
  );
}

// stage 的 viewBox 与实际渲染像素通常不是 1:1（preserveAspectRatio 会缩放+留白），
// getCTM() 对 stage 的子元素返回的是"已经换算到渲染像素"的矩阵；若直接把这个值当作
// hand（同为 stage 直接子节点）的 CSS transform px 使用，会被 viewBox 变换重复应用一次，
// 导致小手位置偏移。改为借用 game-tires.js 的 svgPoint() 同款手法：经屏幕坐标中转，
// 用 stage.getScreenCTM().inverse() 换回 stage 自己的舞台坐标系，两端保持同一坐标系。
function stageCenter(stage, el) {
  const r = el.getBoundingClientRect();
  const pt = stage.createSVGPoint();
  pt.x = r.left + r.width / 2;
  pt.y = r.top + r.height / 2;
  return pt.matrixTransform(stage.getScreenCTM().inverse());
}

// 发光小手从 fromEl 移到 toEl（各取其舞台坐标中心），演示一遍后消失
export function guideHand(stage, fromEl, toEl) {
  const old = stage.querySelector('.guide-hand');
  if (old) old.remove();
  const from = stageCenter(stage, fromEl);
  const to = stageCenter(stage, toEl);

  const hand = document.createElementNS(SVG, 'g');
  hand.setAttribute('class', 'guide-hand');
  hand.setAttribute('pointer-events', 'none');
  hand.innerHTML = `
    <circle cx="0" cy="0" r="34" fill="#F5B324" opacity="0.35"/>
    <circle cx="0" cy="0" r="16" fill="#F5B324" opacity="0.85"/>
    <circle cx="0" cy="0" r="6" fill="#FFF3DD"/>`;
  stage.appendChild(hand);
  const anim = hand.animate(
    [
      { transform: `translate(${from.x}px, ${from.y}px) scale(0.6)`, opacity: 0 },
      { transform: `translate(${from.x}px, ${from.y}px) scale(1)`, opacity: 1, offset: 0.2 },
      { transform: `translate(${to.x}px, ${to.y}px) scale(1)`, opacity: 1, offset: 0.85 },
      { transform: `translate(${to.x}px, ${to.y}px) scale(1.4)`, opacity: 0 },
    ],
    { duration: 2600, easing: 'ease-in-out' },
  );
  anim.onfinish = () => hand.remove();
}
