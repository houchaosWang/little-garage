import { say } from './audio.js';

const SVG = 'http://www.w3.org/2000/svg';
const GOLD = '#F5B324', GOLD_STROKE = '#B4701E';

// 每种车型的金头盔挂载点（相对车辆自身局部坐标系，即 buildVehicle() 内部坐标）。
// 目标是让头盔"戴"在驾驶舱/车顶附近——数值由预览逐车型核对后调出。
const HELMET_POS = {
  race: [131, -68], dump: [216, -98], police: [136, -66], ambulance: [47, -44],
  fire: [62, -72], digger: [104, -78], mixer: [53, -66], loader: [195, -84],
};

// 头盔内部标记：金色圆顶 + 帽檐 + 白色小星星，尺寸以 (0,0) 为中心。
function helmetInner() {
  return `
    <path d="M-24 6 A24 24 0 0 1 24 6 Z" fill="${GOLD}" stroke="${GOLD_STROKE}" stroke-width="3.5"/>
    <ellipse cx="0" cy="6" rx="30" ry="7.5" fill="${GOLD}" stroke="${GOLD_STROKE}" stroke-width="3.5"/>
    <polygon points="0,-15 2.6,-8 10,-8 4.1,-3.3 6.4,4 0,-0.4 -6.4,4 -4.1,-3.3 -10,-8 -2.6,-8" fill="#FFFFFF"/>`;
}

// 给顾客的座驾贴上金头盔——挂在车辆自身的 <g class="vehicle"> 内，随车一起入场/出场。
export function addHelmet(customer) {
  const [x, y] = HELMET_POS[customer.type] || [150, -80];
  const g = document.createElementNS(SVG, 'g');
  g.setAttribute('class', 'vip-helmet');
  g.setAttribute('transform', `translate(${x} ${y})`);
  g.innerHTML = helmetInner();
  customer.vehicle.el.appendChild(g);
}

// 金头盔挑战邀请：压暗舞台 + 头盔图标 + 文案，两个大按钮各点一次即收起。
// 没有超时——由孩子自己决定接不接受。
export function showVipOffer(stage) {
  return new Promise(resolve => {
    const g = document.createElementNS(SVG, 'g');
    g.setAttribute('class', 'vip-offer');
    g.innerHTML = `
      <rect x="0" y="0" width="1200" height="800" fill="#2B3A5C" opacity="0" style="transition: opacity 0.4s"/>
      <g transform="translate(600 300)">
        <g style="animation: pop 0.6s ease-out; transform-origin: 0px 0px;" transform="scale(2.4)">
          ${helmetInner()}
        </g>
        <text x="0" y="96" text-anchor="middle" font-size="52" fill="#F5E6A8">金头盔挑战！</text>
      </g>
      <g class="vip-accept" style="cursor:pointer" transform="translate(430 520)">
        <rect x="-140" y="-40" width="280" height="80" rx="40" fill="${GOLD}" stroke="${GOLD_STROKE}" stroke-width="4"/>
        <text x="0" y="13" text-anchor="middle" font-size="34" fill="#6B4A12">接受挑战</text>
      </g>
      <g class="vip-decline" style="cursor:pointer" transform="translate(770 520)">
        <rect x="-140" y="-40" width="280" height="80" rx="40" fill="#FFF3DD" stroke="#D9CBAD" stroke-width="4"/>
        <text x="0" y="13" text-anchor="middle" font-size="34" fill="#6B4A12">下次再说</text>
      </g>`;
    stage.appendChild(g);
    const dim = g.querySelector('rect');
    requestAnimationFrame(() => { dim.style.opacity = '0.6'; });

    say('vip-ask');

    const finish = result => {
      g.remove();
      resolve(result);
    };
    g.querySelector('.vip-accept').addEventListener('pointerdown', () => finish(true), { once: true });
    g.querySelector('.vip-decline').addEventListener('pointerdown', () => finish(false), { once: true });
  });
}
