import { STICKERS, WHEEL_STYLES, rollDrop, applyDrop } from './rewards-data.js';
import { PALETTE, wheel } from './vehicles.js';
import { say, sfx } from './audio.js';

export { STICKERS, WHEEL_STYLES, rollDrop, applyDrop };

const SVG = 'http://www.w3.org/2000/svg';
const COLOR_NAMES = { red: '红色', blue: '蓝色', green: '绿色', yellow: '黄色', purple: '紫色', teal: '青色' };

function itemMarkup(drop) {
  if (drop.kind === 'sticker') return { svg: STICKERS[drop.id].svg, name: STICKERS[drop.id].name, scale: 2.2 };
  if (drop.kind === 'paint') {
    const c = PALETTE[drop.id];
    const svg = `
      <ellipse cx="0" cy="-8" rx="26" ry="8" fill="${c}" stroke="#8A5A1F" stroke-width="3"/>
      <path d="M-26 -8 L-18 30 a8 8 0 0 0 8 8 h20 a8 8 0 0 0 8 -8 L26 -8 Z" fill="${c}" stroke="#8A5A1F" stroke-width="3"/>
      <rect x="-14" y="-34" width="28" height="8" rx="3" fill="#8A5A1F"/>
      <rect x="-7" y="-30" width="14" height="22" rx="4" fill="#B9B6AD"/>`;
    return { svg, name: `${COLOR_NAMES[drop.id] || drop.id}喷漆`, scale: 1.5 };
  }
  return { svg: wheel(0, 0, 30, drop.id), name: WHEEL_STYLES[drop.id].name, scale: 1.4 };
}

export function showDrop(stage, drop, rng) {
  return new Promise(resolve => {
    const g = document.createElementNS(SVG, 'g');
    g.setAttribute('class', 'drop-overlay');
    g.innerHTML = `
      <rect x="0" y="0" width="1200" height="800" fill="#2B3A5C" opacity="0" style="transition: opacity 0.4s"/>
      <g transform="translate(600 420)">
        <g class="gift-closed">
          <path d="M-72 -10 L72 -10 L64 46 a10 10 0 0 1 -10 10 h-72 a10 10 0 0 1 -10 -10 Z" fill="#E8493F"/>
          <rect x="-72" y="-10" width="144" height="18" fill="#F5B324"/>
          <rect x="-9" y="-10" width="18" height="66" fill="#F5B324"/>
          <path d="M-14 -10 C-44 -46 -68 -20 -32 -10 Z" fill="#F5B324"/>
          <path d="M14 -10 C44 -46 68 -20 32 -10 Z" fill="#F5B324"/>
        </g>
        <g class="gift-open"></g>
      </g>`;
    stage.appendChild(g);
    const dim = g.querySelector('rect');
    requestAnimationFrame(() => { dim.style.opacity = '0.55'; });

    sfx.cheer();
    const voiceName = drop.kind === 'sticker'
      ? (rng.next() < 0.5 ? 'sticker-get-1' : 'sticker-get-2')
      : drop.kind === 'paint' ? 'paint-get' : 'wheel-get';
    say(voiceName);

    setTimeout(() => {
      g.querySelector('.gift-closed').remove();
      const open = g.querySelector('.gift-open');
      const item = itemMarkup(drop);
      open.innerHTML = `
        <g style="animation: pop 0.5s ease-out; transform-origin: 0px 0px;" transform="scale(${item.scale})">
          ${item.svg}
        </g>
        <text x="0" y="90" text-anchor="middle" font-size="30" fill="#FFFFFF">${item.name}</text>
        <g class="drop-accept" style="cursor:pointer" transform="translate(0 156)">
          <rect x="-96" y="-34" width="192" height="68" rx="34" fill="#F5B324"/>
          <text x="0" y="11" text-anchor="middle" font-size="32" fill="#6B4A12">收下！</text>
        </g>`;
      sfx.pop();
      open.querySelector('.drop-accept').addEventListener('pointerdown', () => {
        g.remove();
        resolve();
      }, { once: true });
    }, 600);
  });
}
