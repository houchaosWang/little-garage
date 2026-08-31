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

const wheel = (cx, cy, r = 30) => `
  <g class="v-wheel">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#3A3A38"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.4}" fill="#B9B6AD"/>
  </g>`;

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
};

for (const t of Object.values(TYPES)) {
  t.slots.forEach(Object.freeze);
  Object.freeze(t.slots);
  Object.freeze(t);
}

export const VEHICLE_TYPES = Object.keys(TYPES);

export function buildVehicle(type, colorName, { missingWheels = false } = {}) {
  const t = TYPES[type];
  const c = PALETTE[colorName];
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'vehicle');
  const wheels = missingWheels ? '' : t.slots.map(s => wheel(s.x, s.y)).join('');
  g.innerHTML = t.body(c) + wheels;
  return { el: g, meta: t, slots: t.slots.map(s => ({ ...s })) };
}
