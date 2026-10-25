// Tiny SVG helpers for the 2D motion-design version.
export const NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  }
  if (parent) parent.appendChild(e);
  return e;
}

export const g = (parent, attrs = {}) => el('g', attrs, parent);

// set a group's transform from a compact state
export function place(node, { x = 0, y = 0, s = 1, sx, sy, r = 0, ox = 0, oy = 0, op } = {}) {
  const scx = sx ?? s, scy = sy ?? s;
  node.setAttribute('transform', `translate(${(x + ox).toFixed(2)} ${(y + oy).toFixed(2)}) rotate(${r.toFixed(3)}) scale(${scx.toFixed(4)} ${scy.toFixed(4)}) translate(${(-ox).toFixed(2)} ${(-oy).toFixed(2)})`);
  if (op !== undefined) {
    node.setAttribute('opacity', Math.max(0, Math.min(1, op)).toFixed(3));
    node.style.display = op <= 0.001 ? 'none' : '';
  }
}

let uid = 0;
export const id = (p = 'i') => `${p}${++uid}`;

export function linear(defs, stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1, units } = {}) {
  const gid = id('lg');
  const lg = el('linearGradient', { id: gid, x1, y1, x2, y2, gradientUnits: units }, defs);
  for (const [o, c, a] of stops) el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a ?? 1 }, lg);
  return `url(#${gid})`;
}

export function radial(defs, stops, { cx = 0.5, cy = 0.5, r = 0.5 } = {}) {
  const gid = id('rg');
  const rg = el('radialGradient', { id: gid, cx, cy, r }, defs);
  for (const [o, c, a] of stops) el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a ?? 1 }, rg);
  return `url(#${gid})`;
}
