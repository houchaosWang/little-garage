const KEY = 'garage-save-v1';

export function localDate(now = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function defaultSave() {
  const skill = () => ({ level: 1, streak: 0, mastery: {}, recent: [] });
  return {
    version: 1,
    skills: {
      counting: skill(), numerals: skill(), colors: skill(),
      math: skill(), literacy: skill(), tracing: skill(),
    },
    stats: { daily: {}, byGame: {} },
    settings: { dailyJobs: 4 },
    collection: {
      stickers: [],
      paints: ['red'],
      wheels: ['w1'],
      friends: [],
      badges: [],
      carConfig: { paint: 'purple', wheel: 'w1', placed: [] },
    },
    vipMeter: 0,
    reviewsToday: { date: '', count: 0 },
  };
}

function mergeDefaults(base, data) {
  if (typeof data !== 'object' || data === null) return base;
  for (const k of Object.keys(base)) {
    if (!(k in data)) data[k] = base[k];
    else if (typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k])) {
      data[k] = mergeDefaults(base[k], data[k]);
    }
  }
  return data;
}

export function createStore(storage, todayFn = localDate) {
  function load() {
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return defaultSave();
      const d = JSON.parse(raw);
      if (!d || d.version !== 1) return defaultSave();
      return mergeDefaults(defaultSave(), d);
    } catch {
      return defaultSave();
    }
  }
  function save(data) {
    try { storage.setItem(KEY, JSON.stringify(data)); } catch { /* 存储满/隐私模式：静默 */ }
  }
  function jobsToday(data) {
    return (data.stats.daily[todayFn()] || { jobs: 0 }).jobs;
  }
  function recordJob(data) {
    const t = todayFn();
    const day = data.stats.daily[t] || { jobs: 0 };
    day.jobs += 1;
    data.stats.daily[t] = day;
    save(data);
  }
  function recordGame(data, game, outcome) {
    const g = data.stats.byGame[game] || { plays: 0, helps: 0, errors: 0 };
    g.plays += 1;
    g.helps += outcome.helps;
    g.errors += outcome.errors;
    data.stats.byGame[game] = g;
    save(data);
  }
  function reopenToday(data) {
    delete data.stats.daily[todayFn()];
    save(data);
  }
  function wipe() {
    try { storage.removeItem(KEY); } catch {}
  }
  return { load, save, jobsToday, recordJob, recordGame, reopenToday, wipe };
}
