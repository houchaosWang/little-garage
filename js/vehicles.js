export const PALETTE = {
  red: '#E8493F', blue: '#3E8EE0', green: '#66BB4C',
  yellow: '#F5B324', purple: '#8B6FE8', teal: '#3FBFA8',
};
export const NAMES = ['小红', '小蓝', '大力', '闪闪', '嘟嘟', '轰轰', '小快', '皮皮'];

const eyes = (x1, x2, y) => `
  <g class="v-eyes">
    <circle cx="${x1}" cy="${y}" r="13" fill="#fff"/>
    <circle cx="${x2}" cy="${y}" r="13" fill="#fff"/>
    <circle class="v-pupil" cx="${x1 + 3}" cy="${y + 2}" r="6" fill="#2C2C2A"/>
    <circle class="v-pupil" cx="${x2 + 3}" cy="${y + 2}" r="6" fill="#2C2C2A"/>
  </g>
  <path class="v-mouth" d="M${x1 + 14} ${y + 26} Q${(x1 + x2) / 2 + 3} ${y + 34} ${x2 - 8} ${y + 26}" stroke="#2C2C2A" stroke-width="4" fill="none" stroke-linecap="round"/>`;

const goldStar = (cx, cy, r) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="#F5B324"/>`;
};

export function wheel(cx, cy, r = 30, style = 'w1') {
  let hub;
  if (style === 'w2') {
    hub = goldStar(cx, cy, r * 0.46);
  } else if (style === 'w3') {
    const s = r * 0.3;
    hub = `
    <circle cx="${cx}" cy="${cy}" r="${r * 0.4}" fill="#E8493F"/>
    <line x1="${cx - s}" y1="${cy}" x2="${cx + s}" y2="${cy}" stroke="#FFFFFF" stroke-width="3"/>
    <line x1="${cx}" y1="${cy - s}" x2="${cx}" y2="${cy + s}" stroke="#FFFFFF" stroke-width="3"/>
    <line x1="${cx - s * 0.7}" y1="${cy - s * 0.7}" x2="${cx + s * 0.7}" y2="${cy + s * 0.7}" stroke="#FFFFFF" stroke-width="3"/>
    <line x1="${cx - s * 0.7}" y1="${cy + s * 0.7}" x2="${cx + s * 0.7}" y2="${cy - s * 0.7}" stroke="#FFFFFF" stroke-width="3"/>`;
  } else {
    hub = `<circle cx="${cx}" cy="${cy}" r="${r * 0.4}" fill="#B9B6AD"/>`;
  }
  return `
  <g class="v-wheel">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#3A3A38"/>
    ${hub}
  </g>`;
}

// 每种车型：body(color)返回SVG内串；slots为需要装轮胎的锚点（舞台内相对本车原点）
const TYPES = {
  race: {
    label: '赛车',
    intro: 'intro-race',
    width: 340,
    body: c => `
      <rect x="150" y="-62" width="46" height="16" rx="6" fill="#3A3A38" transform="rotate(-8 150 -62)"/>
      <rect x="70" y="-58" width="120" height="60" rx="26" fill="${c}"/>
      <rect x="0" y="-16" width="300" height="62" rx="26" fill="${c}"/>
      <rect x="86" y="-46" width="88" height="36" rx="12" fill="#FDF3F1"/>
      ${eyes(112, 150, -30)}`,
    slots: [{ x: 66, y: 46 }, { x: 234, y: 46 }],
    fixedWheels: [],
  },
  dump: {
    label: '翻斗车',
    intro: 'intro-dump',
    width: 360,
    body: c => `
      <polygon points="0,-70 150,-84 150,-6 10,-6" fill="#B9B6AD" stroke="#8F8C84" stroke-width="5"/>
      <circle cx="42" cy="-74" r="12" fill="#6E6B64"/><circle cx="76" cy="-79" r="12" fill="#6E6B64"/><circle cx="110" cy="-83" r="12" fill="#6E6B64"/>
      <rect x="156" y="-64" width="120" height="110" rx="16" fill="${c}"/>
      <rect x="172" y="-48" width="88" height="40" rx="10" fill="#FDF3F1"/>
      ${eyes(196, 236, -30)}`,
    slots: [{ x: 60, y: 46 }, { x: 130, y: 46 }, { x: 226, y: 46 }],
    fixedWheels: [],
  },
  police: {
    label: '警车', intro: 'intro-police', width: 340, color: '#3E8EE0', lockColor: 'blue',
    body: c => `
      <rect x="118" y="-64" width="34" height="12" rx="4" fill="#E8493F"/>
      <rect x="158" y="-64" width="34" height="12" rx="4" fill="#9CC6EF"/>
      <rect x="60" y="-52" width="190" height="46" rx="14" fill="${c}"/>
      <rect x="0" y="-16" width="300" height="62" rx="20" fill="${c}"/>
      <rect x="20" y="6" width="260" height="16" rx="8" fill="#FDF3F1"/>
      <rect x="76" y="-44" width="120" height="32" rx="10" fill="#FDF3F1"/>
      ${eyes(108, 150, -28)}`,
    slots: [{ x: 66, y: 46 }, { x: 234, y: 46 }],
    fixedWheels: [],
  },
  ambulance: {
    label: '救护车', intro: 'intro-ambulance', width: 350, color: '#F4F1E8', lockColor: 'skip',
    body: c => `
      <rect x="90" y="-70" width="196" height="116" rx="14" fill="${c}" stroke="#D9CBAD" stroke-width="5"/>
      <rect x="168" y="-50" width="20" height="60" fill="#E8493F"/>
      <rect x="148" y="-30" width="60" height="20" fill="#E8493F"/>
      <rect x="0" y="-30" width="104" height="76" rx="16" fill="#F09595"/>
      <rect x="34" y="-46" width="30" height="12" rx="4" fill="#E8493F"/>
      <rect x="12" y="-20" width="74" height="30" rx="8" fill="#FDF3F1"/>
      ${eyes(30, 64, -6)}`,
    slots: [{ x: 56, y: 46 }, { x: 240, y: 46 }],
    fixedWheels: [],
  },
  fire: {
    label: '消防车', intro: 'intro-fire', width: 360, color: '#E8493F', lockColor: 'red',
    body: c => `
      <rect x="128" y="-52" width="26" height="34" rx="6" fill="#8F8C84"/>
      <line x1="140" y1="-44" x2="310" y2="-44" stroke="#B9B6AD" stroke-width="7"/>
      <line x1="140" y1="-30" x2="310" y2="-30" stroke="#B9B6AD" stroke-width="7"/>
      <line x1="170" y1="-44" x2="170" y2="-30" stroke="#B9B6AD" stroke-width="5"/>
      <line x1="205" y1="-44" x2="205" y2="-30" stroke="#B9B6AD" stroke-width="5"/>
      <line x1="240" y1="-44" x2="240" y2="-30" stroke="#B9B6AD" stroke-width="5"/>
      <line x1="275" y1="-44" x2="275" y2="-30" stroke="#B9B6AD" stroke-width="5"/>
      <rect x="0" y="-20" width="316" height="66" rx="14" fill="${c}"/>
      <rect x="8" y="-58" width="112" height="52" rx="12" fill="${c}"/>
      <rect x="20" y="-50" width="84" height="32" rx="10" fill="#FDF3F1"/>
      ${eyes(44, 82, -34)}`,
    slots: [{ x: 64, y: 46 }, { x: 180, y: 46 }, { x: 254, y: 46 }],
    fixedWheels: [],
  },
  digger: {
    label: '挖掘机', intro: 'intro-digger', width: 360,
    body: c => `
      <path d="M180 -20 L268 -64" stroke="#8F8C84" stroke-width="18" stroke-linecap="round"/>
      <path d="M268 -64 L318 -6" stroke="#8F8C84" stroke-width="14" stroke-linecap="round"/>
      <path d="M306 -14 L352 -8 L340 40 L300 30 Z" fill="#6E6B64"/>
      <rect x="60" y="-64" width="120" height="84" rx="14" fill="${c}"/>
      <rect x="74" y="-50" width="60" height="44" rx="8" fill="#FDF3F1"/>
      ${eyes(92, 118, -30)}
      <rect x="40" y="16" width="220" height="46" rx="23" fill="#3A3A38"/>
      <circle cx="80" cy="39" r="12" fill="#B9B6AD"/><circle cx="130" cy="39" r="12" fill="#B9B6AD"/><circle cx="180" cy="39" r="12" fill="#B9B6AD"/><circle cx="228" cy="39" r="12" fill="#B9B6AD"/>`,
    slots: [],
    fixedWheels: [],
  },
  mixer: {
    label: '搅拌车', intro: 'intro-mixer', width: 360,
    body: c => `
      <ellipse cx="205" cy="-28" rx="82" ry="54" fill="#D8D3C8" stroke="${c}" stroke-width="6"/>
      <line x1="158" y1="8" x2="196" y2="-70" stroke="${c}" stroke-width="7"/>
      <line x1="203" y1="14" x2="241" y2="-66" stroke="${c}" stroke-width="7"/>
      <line x1="246" y1="4" x2="276" y2="-52" stroke="${c}" stroke-width="7"/>
      <rect x="110" y="8" width="180" height="38" rx="10" fill="${c}"/>
      <rect x="8" y="-52" width="92" height="98" rx="14" fill="${c}"/>
      <rect x="22" y="-40" width="62" height="38" rx="8" fill="#FDF3F1"/>
      ${eyes(42, 68, -22)}`,
    slots: [{ x: 40, y: 46 }, { x: 140, y: 46 }, { x: 262, y: 46 }],
    fixedWheels: [],
  },
  loader: {
    label: '铲车', intro: 'intro-loader', width: 360,
    body: c => `
      <path d="M120 0 L60 20" stroke="#8F8C84" stroke-width="16" stroke-linecap="round"/>
      <path d="M8 4 L64 4 L64 50 L20 50 Z" fill="#6E6B64"/>
      <rect x="120" y="-24" width="170" height="70" rx="14" fill="${c}"/>
      <rect x="150" y="-70" width="90" height="52" rx="10" fill="#FDF3F1" stroke="${c}" stroke-width="10"/>
      ${eyes(180, 212, -46)}`,
    slots: [{ x: 152, y: 46 }, { x: 258, y: 46 }],
    fixedWheels: [],
  },
};

for (const t of Object.values(TYPES)) {
  t.slots.forEach(Object.freeze);
  Object.freeze(t.slots);
  Object.freeze(t);
}

export const VEHICLE_TYPES = Object.keys(TYPES);

export function vehicleLockColor(type) {
  return TYPES[type].lockColor || null;
}

export function buildVehicle(type, colorName, { missingWheels = false, wheelStyle = 'w1' } = {}) {
  const t = TYPES[type];
  const c = t.color || PALETTE[colorName];
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'vehicle');
  const wheels = missingWheels ? '' : t.slots.map(s => wheel(s.x, s.y, 30, wheelStyle)).join('');
  g.innerHTML = t.body(c) + wheels;
  return { el: g, meta: t, slots: t.slots.map(s => ({ ...s })) };
}

export function addWheels(vehicle, style = 'w1') {
  if (vehicle.el.querySelector('.v-wheel')) return;
  vehicle.el.innerHTML += vehicle.slots.map(s => wheel(s.x, s.y, 30, style)).join('');
}
