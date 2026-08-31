export const BOX_DAYS = [1, 3, 7, 21, 45];

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  const p = x => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

export function onPromoted(skill, fromLevel, today) {
  const key = String(fromLevel);
  const cur = skill.mastery[key];
  if (cur && cur.state === 'relearning') {
    cur.state = 'provisional';
    cur.box = 0;
    cur.due = addDays(today, BOX_DAYS[0]);
  } else if (!cur) {
    skill.mastery[key] = { state: 'provisional', box: 0, due: addDays(today, BOX_DAYS[0]), passes7: 0, lapses: 0 };
  }
}

export function dueReviews(skills, today) {
  const out = [];
  for (const [key, s] of Object.entries(skills)) {
    for (const [lvlStr, m] of Object.entries(s.mastery || {})) {
      if (m.state === 'relearning') continue;
      if (m.due <= today && Math.floor(s.level) > Number(lvlStr)) {
        out.push({ skill: key, level: Number(lvlStr), due: m.due });
      }
    }
  }
  return out.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
}

export function onReviewResult(skill, level, clean, today) {
  const m = skill.mastery[String(level)];
  if (!m) return { lapsed: false, solid: false };
  if (clean) {
    const interval = BOX_DAYS[Math.min(m.box, BOX_DAYS.length - 1)];
    if (interval >= 7) m.passes7 = (m.passes7 || 0) + 1;
    if (m.passes7 >= 2) m.state = 'solid';
    m.box = Math.min(m.box + 1, BOX_DAYS.length - 1);
    m.due = addDays(today, BOX_DAYS[m.box]);
    return { lapsed: false, solid: m.state === 'solid' };
  }
  m.lapses = (m.lapses || 0) + 1;
  m.state = 'relearning';
  m.box = 0;
  m.passes7 = 0;
  m.due = addDays(today, BOX_DAYS[0]);
  skill.level = Math.min(skill.level, level);
  skill.streak = 0;
  return { lapsed: true, solid: false };
}
