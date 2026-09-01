// 纯数据 + 纯函数：不导入 audio.js（其顶层有 document.addEventListener，Node 下会炸），
// 因此本文件对 Node 测试环境是安全的，可被 tests/rewards.test.mjs 直接 import。
import { PALETTE } from './vehicles.js';

const star = (fill, stroke) => `<polygon points="0,-18 5.4,-5.7 18,-5.7 7.8,3 11.1,15 0,7.8 -11.1,15 -7.8,3 -18,-5.7 -5.4,-5.7" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="2.5"` : ''}/>`;
const heart = fill => `<path d="M0 14 C-16 2 -18 -10 -9 -14 C-3 -16 0 -11 0 -8 C0 -11 3 -16 9 -14 C18 -10 16 2 0 14 Z" fill="${fill}"/>`;
const bolt = (fill, stroke) => `<polygon points="2,-18 -10,2 -1,2 -3,18 12,-4 2,-4" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="2"` : ''}/>`;
const flower = (petal, center) => `
  <ellipse cx="0" cy="-11" rx="7" ry="10" fill="${petal}"/>
  <ellipse cx="0" cy="11" rx="7" ry="10" fill="${petal}"/>
  <ellipse cx="-11" cy="0" rx="10" ry="7" fill="${petal}"/>
  <ellipse cx="11" cy="0" rx="10" ry="7" fill="${petal}"/>
  <circle cx="0" cy="0" r="7" fill="${center}"/>`;
const flame = () => `
  <path d="M0 17 C-11 13 -13 2 -6 -7 C-6 -3 -3 -2 -2 -4 C-1 -11 3 -15 1 -18 C11 -12 13 -1 8 5 C12 3 12 -1 12 -1 C15 7 10 15 0 17 Z" fill="#E8763A"/>
  <path d="M0 11 C-4 9 -5 3 -2 -1 C0 3 3 3 1 -3 C5 0 6 5 3 9 C3 9 1 11 0 11 Z" fill="#F5B324"/>`;
const moon = () => `<path d="M11 -16 A18 18 0 1 0 11 16 A13.5 13.5 0 1 1 11 -16 Z" fill="#F5E6A8"/>`;
const cloud = () => `
  <circle cx="-9" cy="3" r="9" fill="#FFFFFF" stroke="#D9CBAD" stroke-width="1.5"/>
  <circle cx="4" cy="-4" r="11" fill="#FFFFFF" stroke="#D9CBAD" stroke-width="1.5"/>
  <circle cx="13" cy="4" r="8" fill="#FFFFFF" stroke="#D9CBAD" stroke-width="1.5"/>
  <rect x="-15" y="3" width="35" height="10" rx="5" fill="#FFFFFF" stroke="#D9CBAD" stroke-width="1.5"/>`;
const smiley = () => `
  <circle cx="0" cy="0" r="17" fill="#F5E14A" stroke="#E0B93A" stroke-width="1.5"/>
  <circle cx="-6" cy="-4" r="2.4" fill="#6B4A12"/>
  <circle cx="6" cy="-4" r="2.4" fill="#6B4A12"/>
  <path d="M-8 5 Q0 13 8 5" stroke="#6B4A12" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
const trophy = (fill, stroke) => `
  <g${stroke ? ` stroke="${stroke}" stroke-width="1.5"` : ''}>
    <path d="M-10 -14 h20 v8 a10 10 0 0 1 -20 0 Z" fill="${fill}"/>
    <path d="M-10 -12 h-6 a2 2 0 0 0 -2 2 c0 5 4 8 8 8" fill="none" stroke="${stroke || fill}" stroke-width="2.5"/>
    <path d="M10 -12 h6 a2 2 0 0 1 2 2 c0 5 -4 8 -8 8" fill="none" stroke="${stroke || fill}" stroke-width="2.5"/>
    <rect x="-3" y="0" width="6" height="8" fill="${fill}"/>
    <rect x="-9" y="8" width="18" height="6" rx="2" fill="${fill}"/>
  </g>`;
const crown = (fill, jewel, stroke) => `
  <g${stroke ? ` stroke="${stroke}" stroke-width="1.5"` : ''}>
    <path d="M-14 6 L-14 -6 L-6 2 L0 -12 L6 2 L14 -6 L14 6 Z" fill="${fill}"/>
    <rect x="-14" y="6" width="28" height="6" rx="1.5" fill="${fill}"/>
    <circle cx="0" cy="-4" r="2.4" fill="${jewel}" stroke="none"/>
  </g>`;
const gem = () => `
  <polygon points="0,-16 12,-4 6,14 -6,14 -12,-4" fill="#8B6FE8" stroke="#6B4FC0" stroke-width="1.5"/>
  <polygon points="0,-16 12,-4 0,-4" fill="#A98CF5"/>
  <polygon points="-12,-4 0,-4 0,14" fill="#6B4FC0" opacity="0.5"/>`;
const rocket = () => `
  <path d="M0 -18 C8 -10 8 4 4 12 L-4 12 C-8 4 -8 -10 0 -18 Z" fill="#E8493F"/>
  <circle cx="0" cy="-4" r="4" fill="#9CC6EF"/>
  <polygon points="-4,6 -12,14 -4,12" fill="#3E8EE0"/>
  <polygon points="4,6 12,14 4,12" fill="#3E8EE0"/>
  <polygon points="-3,12 0,18 3,12" fill="#F5B324"/>`;
const soccer = () => `
  <circle cx="0" cy="0" r="17" fill="#FDF3F1" stroke="#2C2C2A" stroke-width="1.5"/>
  <polygon points="0,-7 6,-2 4,6 -4,6 -6,-2" fill="#2C2C2A"/>
  <line x1="0" y1="-7" x2="0" y2="-15" stroke="#2C2C2A" stroke-width="1.5"/>
  <line x1="6" y1="-2" x2="14" y2="-6" stroke="#2C2C2A" stroke-width="1.5"/>
  <line x1="4" y1="6" x2="8" y2="14" stroke="#2C2C2A" stroke-width="1.5"/>
  <line x1="-4" y1="6" x2="-8" y2="14" stroke="#2C2C2A" stroke-width="1.5"/>
  <line x1="-6" y1="-2" x2="-14" y2="-6" stroke="#2C2C2A" stroke-width="1.5"/>`;
const note = () => `
  <ellipse cx="-7" cy="12" rx="7" ry="5.5" fill="#8B6FE8" transform="rotate(-12 -7 12)"/>
  <rect x="5" y="-16" width="3" height="26" fill="#8B6FE8"/>
  <path d="M8 -16 C16 -14 17 -5 8 -3 Z" fill="#8B6FE8"/>`;
const leaf = () => `
  <path d="M-14 12 C-14 -8 6 -18 14 -16 C14 4 -4 16 -14 12 Z" fill="#66BB4C"/>
  <path d="M-12 10 C-6 0 2 -8 12 -14" stroke="#4E9438" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
const paw = () => `
  <ellipse cx="0" cy="7" rx="11" ry="9" fill="#8A6D5A"/>
  <circle cx="-10" cy="-7" r="4.6" fill="#8A6D5A"/>
  <circle cx="-3" cy="-13" r="4.6" fill="#8A6D5A"/>
  <circle cx="5" cy="-13" r="4.6" fill="#8A6D5A"/>
  <circle cx="11" cy="-6" r="4.6" fill="#8A6D5A"/>`;
const sparkle = (x, y) => `<path d="M${x} ${y - 5} L${x + 1.4} ${y - 1.4} L${x + 5} ${y} L${x + 1.4} ${y + 1.4} L${x} ${y + 5} L${x - 1.4} ${y + 1.4} L${x - 5} ${y} L${x - 1.4} ${y - 1.4} Z" fill="#FFFFFF"/>`;

const GOLD = '#F5B324', GOLD_STROKE = '#B4701E';

export const STICKERS = {
  s1: { name: '黄星星', svg: star('#F5B324') },
  s2: { name: '红星星', svg: star('#E8493F') },
  s3: { name: '蓝星星', svg: star('#3E8EE0') },
  s4: { name: '粉爱心', svg: heart('#F09595') },
  s5: { name: '红爱心', svg: heart('#E8493F') },
  s6: { name: '闪电', svg: bolt('#F5B324') },
  s7: { name: '粉花朵', svg: flower('#F09595', '#F5E14A') },
  s8: { name: '紫花朵', svg: flower('#8B6FE8', '#F5E14A') },
  s9: { name: '小火苗', svg: flame() },
  s10: { name: '月亮', svg: moon() },
  s11: { name: '白云', svg: cloud() },
  s12: { name: '笑脸', svg: smiley() },
  s13: { name: '奖杯', svg: trophy('#F5B324') },
  s14: { name: '皇冠', svg: crown('#F5B324', '#E8493F') },
  s15: { name: '宝石', svg: gem() },
  s16: { name: '小火箭', svg: rocket() },
  s17: { name: '足球', svg: soccer() },
  s18: { name: '音符', svg: note() },
  s19: { name: '绿叶', svg: leaf() },
  s20: { name: '小爪印', svg: paw() },
  v1: { name: '金星星', svg: star(GOLD, GOLD_STROKE) + sparkle(12, -13) },
  v2: { name: '金皇冠', svg: crown(GOLD, '#FDF3F1', GOLD_STROKE) + sparkle(-11, -9) },
  v3: { name: '金奖杯', svg: trophy(GOLD, GOLD_STROKE) + sparkle(11, -14) },
  v4: { name: '金闪电', svg: bolt(GOLD, GOLD_STROKE) + sparkle(-9, 9) },
};

export const WHEEL_STYLES = { w1: { name: '经典' }, w2: { name: '星星金轮' }, w3: { name: '烈焰红轮' } };

export const BADGE_CHAR = {
  race: '赛', dump: '翻', police: '警', ambulance: '救',
  fire: '消', digger: '挖', mixer: '搅', loader: '铲',
};

const REGULAR_IDS = Array.from({ length: 20 }, (_, i) => `s${i + 1}`);

export function rollDrop(rng, collection) {
  const unownedPaints = Object.keys(PALETTE).filter(c => c !== collection.carConfig.paint && !collection.paints.includes(c));
  const unownedWheels = ['w2', 'w3'].filter(w => !collection.wheels.includes(w));
  const unownedStickers = REGULAR_IDS.filter(id => !collection.stickers.includes(id));

  if ((unownedPaints.length || unownedWheels.length) && rng.next() < 0.3) {
    const kinds = [];
    if (unownedPaints.length) kinds.push('paint');
    if (unownedWheels.length) kinds.push('wheel');
    const kind = kinds.length === 2 ? (rng.next() < 0.5 ? 'wheel' : 'paint') : kinds[0];
    const id = kind === 'paint' ? rng.pick(unownedPaints) : rng.pick(unownedWheels);
    return { kind, id };
  }
  const id = unownedStickers.length ? rng.pick(unownedStickers) : rng.pick(REGULAR_IDS);
  return { kind: 'sticker', id };
}

export function applyDrop(collection, drop) {
  if (drop.kind === 'sticker') {
    if (!collection.stickers.includes(drop.id)) collection.stickers.push(drop.id);
  } else if (drop.kind === 'paint') {
    if (!collection.paints.includes(drop.id)) collection.paints.push(drop.id);
  } else if (drop.kind === 'wheel') {
    if (!collection.wheels.includes(drop.id)) collection.wheels.push(drop.id);
  }
  return collection;
}
