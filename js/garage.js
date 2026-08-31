import { buildVehicle, VEHICLE_TYPES, PALETTE, NAMES } from './vehicles.js';
import { say, sfx } from './audio.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};

export function createGarage(stage, rng) {
  stage.innerHTML = `
    <rect x="0" y="0" width="1200" height="620" fill="#FFF3DD"/>
    <rect x="0" y="620" width="1200" height="180" fill="#EFE6D2"/>
    <line x1="0" y1="620" x2="1200" y2="620" stroke="#D9CBAD" stroke-width="4"/>
    <rect x="40" y="60" width="360" height="300" rx="14" fill="none" stroke="#D9CBAD" stroke-width="8"/>
    <line x1="40" y1="130" x2="400" y2="130" stroke="#D9CBAD" stroke-width="5"/>
    <line x1="40" y1="200" x2="400" y2="200" stroke="#D9CBAD" stroke-width="5"/>
    <line x1="40" y1="270" x2="400" y2="270" stroke="#D9CBAD" stroke-width="5"/>
    <g id="layer-vehicle"></g>
    <g id="layer-game"></g>
    <g id="layer-bubble"></g>
    <g id="layer-fx"></g>`;
  const layers = {
    vehicle: stage.querySelector('#layer-vehicle'),
    game: stage.querySelector('#layer-game'),
    bubble: stage.querySelector('#layer-bubble'),
    fx: stage.querySelector('#layer-fx'),
  };

  function showBubble(text, voiceNames) {
    layers.bubble.innerHTML = '';
    const w = Math.max(360, text.length * 34 + 140);
    const g = el('g', { transform: `translate(${600 - w / 2} 70)` });
    g.innerHTML = `
      <rect x="0" y="0" width="${w}" height="86" rx="43" fill="#FFFFFF" stroke="#E8C97F" stroke-width="4"/>
      <path d="M${w / 2 - 18} 86 L${w / 2} 120 L${w / 2 + 18} 86 Z" fill="#FFFFFF" stroke="#E8C97F" stroke-width="4"/>
      <g class="replay" style="cursor:pointer">
        <circle cx="52" cy="43" r="26" fill="#FFEDC2"/>
        <polygon points="42,33 50,33 60,24 60,62 50,53 42,53" fill="#8A5A1F"/>
        <path d="M66 34 Q73 43 66 52" stroke="#8A5A1F" stroke-width="4" fill="none" stroke-linecap="round"/>
      </g>
      <text x="${52 + 40 + (w - 92) / 2}" y="55" text-anchor="middle" font-size="34" fill="#6B4A12">${text}</text>`;
    g.querySelector('.replay').addEventListener('pointerdown', e => {
      e.stopPropagation();
      say(...voiceNames);
    });
    layers.bubble.appendChild(g);
    say(...voiceNames);
  }

  function clearBubble() { layers.bubble.innerHTML = ''; }

  function driveIn(vehicle) {
    vehicle.el.style.transition = 'none';
    vehicle.el.setAttribute('transform', 'translate(1400 560)');
    layers.vehicle.appendChild(vehicle.el);
    requestAnimationFrame(() => {
      vehicle.el.style.transition = 'transform 1.6s cubic-bezier(.25,.9,.35,1)';
      vehicle.el.setAttribute('transform', 'translate(480 560)');
    });
    sfx.horn();
    return new Promise(res => setTimeout(res, 1700));
  }

  function driveOut(vehicle) {
    vehicle.el.style.transition = 'transform 1.4s cubic-bezier(.55,0,.9,.4)';
    vehicle.el.setAttribute('transform', 'translate(-500 560)');
    sfx.horn();
    return new Promise(res => setTimeout(res, 1500));
  }

  function celebrate() {
    sfx.cheer();
    const fx = layers.fx;
    for (let i = 0; i < 24; i++) {
      const c = el('circle', {
        cx: 400 + rng.int(0, 400), cy: 760, r: rng.int(6, 12),
        fill: Object.values(PALETTE)[i % 6],
      });
      c.style.transition = `transform ${1 + rng.int(0, 8) / 10}s ease-out, opacity 1.4s`;
      fx.appendChild(c);
      requestAnimationFrame(() => {
        c.style.transform = `translate(${rng.int(-160, 160)}px, ${-rng.int(380, 640)}px)`;
        c.style.opacity = '0';
      });
    }
    setTimeout(() => { fx.innerHTML = ''; }, 1600);
    return new Promise(res => setTimeout(res, 1400));
  }

  function newCustomer() {
    const type = rng.pick(VEHICLE_TYPES);
    const color = rng.pick(Object.keys(PALETTE));
    const name = rng.pick(NAMES);
    const vehicle = buildVehicle(type, color, { missingWheels: true });
    return { type, color, name, vehicle };
  }

  return { layers, showBubble, clearBubble, driveIn, driveOut, celebrate, newCustomer };
}
