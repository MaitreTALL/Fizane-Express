// Small deterministic animation helpers shared by every scene.
// Everything is a pure function of time so any frame can be rendered alone.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const backOut = (t) => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
export const elastic = (t) => { t = clamp(t); return t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1; };

// progress of t inside [a, b]
export const prog = (t, a, b) => clamp((t - a) / (b - a));
// 0 -> 1 -> 0 envelope: fades in over [a, a+fi], out over [b-fo, b]
export const window01 = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth((t - a) / fi), smooth((b - t) / fo));

// Interpolate keyframes [[time, value(s)], ...] with easing between keys.
export function keys(t, frames, ease = easeInOut) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 0; i < frames.length - 1; i++) {
    const [t0, v0] = frames[i], [t1, v1] = frames[i + 1];
    if (t <= t1) {
      const k = ease((t - t0) / (t1 - t0));
      return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return frames[frames.length - 1][1];
}

// deterministic pseudo random
export function rand(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

// smooth 1D value noise, deterministic
export function noise1(x, seed = 0) {
  const h = (n) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

// Timeline access: line start/end, word times, scene bounds.
export class Timeline {
  constructor(data) {
    this.data = data;
    this.lines = Object.fromEntries(data.lines.map((l) => [l.id, l]));
    this.scenes = data.scenes;
  }
  L(id) { return this.lines[id]; }
  // time of the first word matching `word` (prefix, case-insensitive) in line `id`
  W(id, word, nth = 0) {
    const l = this.lines[id];
    const w = word.toLowerCase();
    const hits = l.words.filter((x) => x.w.toLowerCase().replace(/[^\p{L}'-]/gu, '').startsWith(w));
    if (!hits.length) throw new Error(`word ${word} not in ${id}`);
    return hits[Math.min(nth, hits.length - 1)].t;
  }
  scene(id) { return this.scenes.find((s) => s.id === id); }
  mouth(t) {
    const m = this.data.mouth, f = t * this.data.fps, i = Math.floor(f);
    if (i < 0 || i >= m.length - 1) return 0;
    return lerp(m[i], m[i + 1], f - i);
  }
}
