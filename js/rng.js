export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed = Date.now()) {
  const next = mulberry32(seed);
  return {
    next,
    int(min, max) { return Math.floor(next() * (max - min + 1)) + min; },
    pick(arr) { return arr[this.int(0, arr.length - 1)]; },
    // 按权重抽一个；权重全为0（或非法）时退回均匀抽
    pickWeighted(arr, weights) {
      const w = arr.map((_, i) => Math.max(0, Number(weights[i]) || 0));
      const total = w.reduce((a, b) => a + b, 0);
      if (!(total > 0)) return this.pick(arr);
      let r = next() * total;
      for (let i = 0; i < arr.length; i++) {
        r -= w[i];
        if (r < 0) return arr[i];
      }
      return arr[arr.length - 1];
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = this.int(0, i);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}
