// Flat illustrations for the motion-design version. Each builder draws into an
// SVG group (local coordinates) and may return an update(t, ...) for its motion.
import { el, g, place } from './svg.js';
import { clamp, lerp, smooth, noise1, rand } from '../core.js';

export const P = {
  green: '#0da255', greenDark: '#087a3f', greenLight: '#bfe8d0', red: '#e81e27', redDark: '#b3141b', ink: '#1f2a2e',
  sand: '#f3e3c8', banco: '#c98f5c', bancoDark: '#a8703f', tin: '#9fb0ba', tinDark: '#7f9099', water: '#5f8f86', waterLight: '#8fbdb2',
  skin: '#7a4a30', skinShade: '#653b25', white: '#ffffff', yellow: '#ffc83d', blue: '#2f7fd8', leaf: '#3f9b4a', leafDark: '#2e7a39', trunk: '#7b5234',
};

const shadow = (p, cx, cy, rx, ry = rx * 0.22, op = 0.16) => el('ellipse', { cx, cy, rx, ry, fill: '#0b1d18', opacity: op }, p);

// ---------- neighbourhood ----------
export function house(p, x, y, w, h, { roof = 'tin', door = P.blue, tone = P.banco } = {}) {
  const hg = g(p, { transform: `translate(${x} ${y})` });
  el('rect', { x: 0, y: -h, width: w, height: h, fill: tone }, hg);
  el('rect', { x: w * 0.7, y: -h, width: w * 0.3, height: h, fill: '#000', opacity: 0.08 }, hg);
  if (roof === 'tin') {
    el('path', { d: `M${-w * 0.08},${-h} L${w * 1.08},${-h} L${w},${-h - h * 0.28} L0,${-h - h * 0.28} Z`, fill: P.tin }, hg);
    for (let i = 1; i < 9; i++) el('line', { x1: (w / 9) * i, y1: -h - h * 0.28, x2: -w * 0.08 + ((w * 1.16) / 9) * i, y2: -h, stroke: P.tinDark, 'stroke-width': 3 }, hg);
  } else {
    el('rect', { x: -6, y: -h - 14, width: w + 12, height: 16, fill: P.bancoDark }, hg);
  }
  el('rect', { x: w * 0.18, y: -h * 0.62, width: w * 0.24, height: h * 0.62, rx: 4, fill: door }, hg);
  el('rect', { x: w * 0.56, y: -h * 0.7, width: w * 0.24, height: h * 0.24, rx: 3, fill: '#4a3a30' }, hg);
  el('rect', { x: w * 0.56, y: -h * 0.7, width: w * 0.24, height: h * 0.24, rx: 3, fill: 'none', stroke: door, 'stroke-width': 5 }, hg);
  return hg;
}

export function tree(p, x, y, s = 1, tone = P.leaf) {
  const t = g(p, { transform: `translate(${x} ${y}) scale(${s})` });
  el('rect', { x: -9, y: -120, width: 18, height: 120, rx: 6, fill: P.trunk }, t);
  for (const [cx, cy, r, c] of [[-40, -140, 52, tone], [36, -150, 56, tone], [0, -190, 62, P.leafDark], [-6, -150, 50, tone]]) el('circle', { cx, cy, r, fill: c }, t);
  return t;
}

export function neighbourhood(p) {
  const n = g(p);
  el('rect', { x: -40, y: 820, width: 1160, height: 140, fill: '#b9774a' }, n);
  tree(n, 120, 820, 1.0); tree(n, 980, 820, 1.1, '#4aa556');
  house(n, 40, 820, 250, 170, { roof: 'tin', door: P.blue });
  house(n, 300, 820, 220, 210, { roof: 'flat', door: P.green, tone: '#c48550' });
  house(n, 560, 820, 260, 180, { roof: 'tin', door: P.red, tone: '#d29a66' });
  house(n, 840, 820, 200, 160, { roof: 'flat', door: '#2a8f9c' });
  return n;
}

export function rain(p, n = 120) {
  const r = rand(11);
  const drops = Array.from({ length: n }, () => [r() * 1200 - 60, r(), 0.7 + r() * 0.6]);
  const lines = drops.map(() => el('line', { stroke: '#dbe9f2', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.6 }, p));
  return (t, k) => {
    lines.forEach((ln, i) => {
      const [x0, y0, sp] = drops[i];
      const y = ((y0 * 1050 + t * 1300 * sp) % 1050) - 100;
      const x = x0 - y * 0.15;
      ln.setAttribute('x1', x); ln.setAttribute('y1', y); ln.setAttribute('x2', x - 8); ln.setAttribute('y2', y + 44);
      ln.setAttribute('opacity', (0.6 * k).toFixed(3));
    });
  };
}

export function cloud(p, x, y, s = 1, fill = '#ffffff') {
  const c = g(p, { transform: `translate(${x} ${y}) scale(${s})` });
  el('path', { d: 'M-120,30 C-150,30 -160,-10 -130,-22 C-130,-60 -80,-74 -54,-50 C-40,-96 30,-100 48,-56 C80,-80 130,-60 122,-18 C156,-14 156,30 120,30 Z', fill }, c);
  return c;
}

export function sun(p, x, y, r = 70) {
  const s = g(p, { transform: `translate(${x} ${y})` });
  const rays = g(s);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    el('line', { x1: Math.cos(a) * (r + 18), y1: Math.sin(a) * (r + 18), x2: Math.cos(a) * (r + 46), y2: Math.sin(a) * (r + 46), stroke: P.yellow, 'stroke-width': 14, 'stroke-linecap': 'round' }, rays);
  }
  el('circle', { r, fill: P.yellow }, s);
  el('circle', { r: r * 0.72, fill: '#ffd76b' }, s);
  return { g: s, update: (t) => rays.setAttribute('transform', `rotate(${(t * 12) % 360})`) };
}

// ---------- containers holding stagnant water ----------
function ripples(p, cx, cy, rx) {
  const rings = [0, 1, 2].map(() => el('ellipse', { cx, cy, fill: 'none', stroke: '#d9efe9', 'stroke-width': 3 }, p));
  return (t) => rings.forEach((r, i) => {
    const k = (t * 0.6 + i / 3) % 1;
    r.setAttribute('rx', (rx * 0.15 + rx * 0.75 * k).toFixed(1));
    r.setAttribute('ry', ((rx * 0.15 + rx * 0.75 * k) * 0.3).toFixed(1));
    r.setAttribute('opacity', ((1 - k) * 0.8).toFixed(3));
  });
}

export function tire(p, x, y, s = 1) {
  const t = g(p, { transform: `translate(${x} ${y}) scale(${s})` });
  shadow(t, 0, 34, 120, 22);
  el('ellipse', { cx: 0, cy: 0, rx: 112, ry: 46, fill: '#2b2b2b' }, t);
  el('ellipse', { cx: 0, cy: 10, rx: 112, ry: 46, fill: '#1c1c1c' }, t);
  el('ellipse', { cx: 0, cy: -4, rx: 70, ry: 24, fill: P.water }, t);
  el('path', { d: 'M-104,-6 C-90,-36 90,-36 104,-6', fill: 'none', stroke: '#444', 'stroke-width': 6 }, t);
  return { g: t, update: ripples(t, 0, -4, 70) };
}

export function bucket(p, x, y, s = 1, color = P.blue, water = true) {
  const b = g(p, { transform: `translate(${x} ${y}) scale(${s})` });
  shadow(b, 0, 4, 90, 16);
  el('path', { d: 'M-80,-150 L80,-150 L62,0 L-62,0 Z', fill: color }, b);
  el('path', { d: 'M20,-150 L80,-150 L62,0 L34,0 Z', fill: '#000', opacity: 0.12 }, b);
  el('ellipse', { cx: 0, cy: -150, rx: 80, ry: 20, fill: '#1d5ea8' }, b);
  const w = water ? el('ellipse', { cx: 0, cy: -146, rx: 70, ry: 15, fill: P.water }, b) : null;
  el('path', { d: 'M-78,-150 C-70,-230 70,-230 78,-150', fill: 'none', stroke: '#8a98a2', 'stroke-width': 6 }, b);
  return { g: b, water: w, update: water ? ripples(b, 0, -146, 70) : () => {} };
}

export function jar(p, x, y, s = 1, lid = false) {
  const j = g(p, { transform: `translate(${x} ${y}) scale(${s})` });
  shadow(j, 0, 4, 100, 18);
  el('path', { d: 'M-50,-200 C-120,-180 -130,-60 -70,-10 C-40,8 40,8 70,-10 C130,-60 120,-180 50,-200 Z', fill: '#b5562f' }, j);
  el('path', { d: 'M20,-196 C90,-170 110,-70 64,-14 C40,2 20,4 10,4 C60,-40 70,-140 20,-196 Z', fill: '#000', opacity: 0.14 }, j);
  el('path', { d: 'M-92,-110 C-40,-96 40,-96 92,-110', fill: 'none', stroke: '#8f3e1f', 'stroke-width': 6 }, j);
  el('ellipse', { cx: 0, cy: -204, rx: 58, ry: 16, fill: '#8f3e1f' }, j);
  const water = el('ellipse', { cx: 0, cy: -202, rx: 48, ry: 11, fill: P.water }, j);
  const lidG = g(j);
  el('ellipse', { cx: 0, cy: -212, rx: 70, ry: 18, fill: '#d8b98a' }, lidG);
  el('circle', { cx: 0, cy: -228, r: 14, fill: '#b9955f' }, lidG);
  lidG.style.display = lid ? '' : 'none';
  return { g: j, lid: lidG, water };
}

export function barrel(p, x, y, s = 1) {
  const b = g(p, { transform: `translate(${x} ${y}) scale(${s})` });
  shadow(b, 0, 6, 110, 20);
  el('rect', { x: -95, y: -260, width: 190, height: 260, rx: 18, fill: P.blue }, b);
  el('rect', { x: 30, y: -260, width: 65, height: 260, rx: 18, fill: '#000', opacity: 0.12 }, b);
  for (const yy of [-190, -80]) el('rect', { x: -98, y: yy, width: 196, height: 14, rx: 7, fill: '#1d5ea8' }, b);
  el('ellipse', { cx: 0, cy: -260, rx: 95, ry: 24, fill: '#1d5ea8' }, b);
  const water = el('ellipse', { cx: 0, cy: -256, rx: 84, ry: 18, fill: P.water }, b);
  const lid = g(b);
  el('ellipse', { cx: 0, cy: -266, rx: 104, ry: 27, fill: '#1a4f8f' }, lid);
  el('ellipse', { cx: 0, cy: -272, rx: 104, ry: 27, fill: '#2a6fc0' }, lid);
  el('rect', { x: -24, y: -292, width: 48, height: 16, rx: 8, fill: '#1a4f8f' }, lid);
  return { g: b, lid, water };
}

export function can(p, x, y, r = 0, color = P.red) {
  const c = g(p, { transform: `translate(${x} ${y}) rotate(${r})` });
  el('rect', { x: -26, y: -70, width: 52, height: 70, rx: 8, fill: '#c3c9cd' }, c);
  el('rect', { x: -26, y: -54, width: 52, height: 36, fill: color }, c);
  return c;
}

export function bin(p, x, y) {
  const b = g(p, { transform: `translate(${x} ${y})` });
  shadow(b, 0, 6, 110, 20);
  el('path', { d: 'M-90,-220 L90,-220 L74,0 L-74,0 Z', fill: P.greenDark }, b);
  for (const xx of [-40, 0, 40]) el('line', { x1: xx, y1: -190, x2: xx * 0.9, y2: -24, stroke: '#06612f', 'stroke-width': 8, 'stroke-linecap': 'round' }, b);
  const lid = g(b);
  el('rect', { x: -100, y: -244, width: 200, height: 26, rx: 12, fill: P.green }, lid);
  el('rect', { x: -26, y: -262, width: 52, height: 20, rx: 8, fill: P.green }, lid);
  return { g: b, lid };
}

// ---------- the Aedes mosquito (flat) ----------
export function mosquito(p, s = 1) {
  const m = g(p);
  const body = g(m, { transform: `scale(${s})` });
  const legs = g(body);
  const legPaths = [
    'M-10,10 L-70,70 L-120,170', 'M0,14 L-20,90 L-40,200', 'M12,12 L70,80 L110,190',
    'M-20,6 L-110,-10 L-190,40', 'M22,6 L120,-6 L200,60', 'M30,0 L150,-70 L240,-40',
  ];
  for (const d of legPaths) {
    el('path', { d, fill: 'none', stroke: '#1b1b1b', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, legs);
    el('path', { d, fill: 'none', stroke: '#ffffff', 'stroke-width': 7, 'stroke-dasharray': '6 22', 'stroke-linecap': 'butt' }, legs);
  }
  const wings = [-1, 1].map((sd) => {
    const w = g(body, { transform: `translate(${sd * 4} -10)` });
    el('path', { d: `M0,0 C${sd * 40},-90 ${sd * 150},-130 ${sd * 190},-110 C${sd * 200},-90 ${sd * 120},-30 0,0 Z`, fill: '#cfe6f3', opacity: 0.7, stroke: '#9fc3d6', 'stroke-width': 3 }, w);
    return w;
  });
  // abdomen with white bands
  const abd = g(body, { transform: 'translate(-30 10) rotate(18)' });
  el('ellipse', { cx: -90, cy: 0, rx: 110, ry: 30, fill: '#1b1b1b' }, abd);
  for (let i = 0; i < 6; i++) el('rect', { x: -180 + i * 32, y: -28, width: 9, height: 56, rx: 4, fill: '#f2f2f2' }, abd);
  // thorax with the white lyre
  el('ellipse', { cx: 10, cy: -4, rx: 46, ry: 38, fill: '#1b1b1b' }, body);
  el('path', { d: 'M-8,-30 C-24,-8 -18,14 0,24 M26,-30 C40,-8 34,14 18,24', fill: 'none', stroke: '#ffffff', 'stroke-width': 5, 'stroke-linecap': 'round' }, body);
  // head, eye, proboscis, antennae
  el('circle', { cx: 62, cy: -4, r: 24, fill: '#1b1b1b' }, body);
  el('circle', { cx: 70, cy: -10, r: 9, fill: '#3a3a3a' }, body);
  el('path', { d: 'M80,6 L170,60', stroke: '#1b1b1b', 'stroke-width': 6, 'stroke-linecap': 'round' }, body);
  el('path', { d: 'M76,-18 C100,-50 120,-56 140,-50 M80,-12 C110,-30 130,-30 150,-20', fill: 'none', stroke: '#1b1b1b', 'stroke-width': 4, 'stroke-linecap': 'round' }, body);
  return {
    g: m,
    update(t, flap = 1) {
      const a = Math.sin(t * 2 * Math.PI * 14) * 0.5 + 0.5;
      wings.forEach((w, i) => w.setAttribute('transform', `translate(${i ? 4 : -4} -10) scale(1 ${(1 - a * 0.6 * flap).toFixed(3)})`));
    },
  };
}

export function virus(p, r = 50, color = P.red) {
  const v = g(p);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    el('line', { x1: Math.cos(a) * r * 0.8, y1: Math.sin(a) * r * 0.8, x2: Math.cos(a) * r * 1.3, y2: Math.sin(a) * r * 1.3, stroke: color, 'stroke-width': r * 0.14, 'stroke-linecap': 'round' }, v);
    el('circle', { cx: Math.cos(a) * r * 1.34, cy: Math.sin(a) * r * 1.34, r: r * 0.14, fill: color }, v);
  }
  el('circle', { r, fill: color }, v);
  el('circle', { r: r * 0.7, fill: '#ff5a5f' }, v);
  for (const [x, y] of [[-14, -10], [12, 8], [-4, 18]]) el('circle', { cx: x * r / 50, cy: y * r / 50, r: r * 0.12, fill: color }, v);
  return v;
}

export function arm(p) {
  const a = g(p);
  el('path', { d: 'M-600,40 C-300,10 80,-20 260,-10 C330,-6 370,30 360,70 C350,110 300,120 240,116 C60,110 -300,130 -600,150 Z', fill: P.skin }, a);
  el('path', { d: 'M-600,120 C-300,104 60,96 240,104 C300,108 340,96 352,82 C346,108 300,120 240,116 C60,110 -300,130 -600,150 Z', fill: P.skinShade }, a);
  return a;
}

// ---------- people (flat, simplified) ----------
export function person(p, { x = 0, y = 0, s = 1, skin = P.skin, top = P.green, bottom = '#2f3a44', hair = 'short', wrap = null, dress = false } = {}) {
  const pg = g(p, { transform: `translate(${x} ${y}) scale(${s})` });
  const body = g(pg);
  shadow(body, 0, 0, 90, 16, 0.14);
  if (dress) el('path', { d: 'M-70,-260 L70,-260 L100,0 L-100,0 Z', fill: top }, body);
  else {
    el('rect', { x: -56, y: -150, width: 46, height: 150, rx: 18, fill: bottom }, body);
    el('rect', { x: 10, y: -150, width: 46, height: 150, rx: 18, fill: bottom }, body);
  }
  el('path', { d: 'M-80,-150 L-80,-250 C-80,-300 -40,-320 0,-320 C40,-320 80,-300 80,-250 L80,-150 Z', fill: top }, body);
  const armL = g(body, { transform: 'translate(-74 -300)' });
  el('rect', { x: -18, y: 0, width: 36, height: 150, rx: 18, fill: top }, armL);
  el('circle', { cx: 0, cy: 150, r: 20, fill: skin }, armL);
  const armR = g(body, { transform: 'translate(74 -300)' });
  el('rect', { x: -18, y: 0, width: 36, height: 150, rx: 18, fill: top }, armR);
  el('circle', { cx: 0, cy: 150, r: 20, fill: skin }, armR);
  el('rect', { x: -18, y: -350, width: 36, height: 40, fill: skin }, body);
  const head = g(body, { transform: 'translate(0 -400)' });
  el('ellipse', { cx: 0, cy: 0, rx: 62, ry: 70, fill: skin }, head);
  if (hair === 'short') el('path', { d: 'M-62,-6 C-66,-70 66,-70 62,-6 C50,-40 -50,-40 -62,-6 Z', fill: '#1b1310' }, head);
  if (hair === 'puffs') { el('path', { d: 'M-62,-6 C-66,-70 66,-70 62,-6 C50,-40 -50,-40 -62,-6 Z', fill: '#1b1310' }, head); for (const sx of [-1, 1]) el('circle', { cx: sx * 56, cy: -54, r: 30, fill: '#1b1310' }, head); }
  if (wrap) { el('path', { d: 'M-70,-10 C-80,-90 80,-90 70,-10 C50,-36 -50,-36 -70,-10 Z', fill: wrap }, head); el('circle', { cx: 30, cy: -70, r: 28, fill: wrap }, head); }
  for (const sx of [-1, 1]) el('ellipse', { cx: sx * 22, cy: 4, rx: 7, ry: 9, fill: '#1b1310' }, head);
  el('path', { d: 'M-24,30 C-10,46 10,46 24,30', fill: 'none', stroke: '#3a1a14', 'stroke-width': 6, 'stroke-linecap': 'round' }, head);
  for (const sx of [-1, 1]) el('ellipse', { cx: sx * 38, cy: 26, rx: 12, ry: 7, fill: '#b5574a', opacity: 0.25 }, head);
  return {
    g: pg,
    update(t, { wave = 0, bob = 0, phase = 0 } = {}) {
      place(body, { y: -Math.abs(Math.sin(t * 3 + phase)) * 8 * bob });
      armR.setAttribute('transform', `translate(74 -300) rotate(${-wave * (150 + Math.sin(t * 8 + phase) * 18)})`);
    },
  };
}

// ---------- health centre ----------
export function healthCentre(p) {
  const h = g(p);
  shadow(h, 0, 6, 460, 30, 0.12);
  el('rect', { x: -420, y: -300, width: 840, height: 300, fill: '#f7eedc' }, h);
  el('rect', { x: -420, y: -90, width: 840, height: 90, fill: P.green }, h);
  el('rect', { x: -420, y: -98, width: 840, height: 10, fill: P.red }, h);
  el('rect', { x: -450, y: -330, width: 900, height: 40, rx: 8, fill: '#ffffff' }, h);
  el('rect', { x: -450, y: -296, width: 900, height: 10, fill: '#e3d7c0' }, h);
  for (const xx of [-380, -200, 180, 340]) {
    el('rect', { x: xx - 50, y: -230, width: 100, height: 90, rx: 6, fill: '#3e5866' }, h);
    for (let k = -2; k <= 2; k++) el('line', { x1: xx + k * 18, y1: -230, x2: xx + k * 18, y2: -140, stroke: '#cfd8dc', 'stroke-width': 4 }, h);
  }
  el('rect', { x: -70, y: -210, width: 140, height: 210, rx: 8, fill: P.blue }, h);
  el('line', { x1: 0, y1: -210, x2: 0, y2: 0, stroke: '#1d5ea8', 'stroke-width': 6 }, h);
  // sign
  const sign = g(h, { transform: 'translate(0 -400)' });
  el('rect', { x: -300, y: -56, width: 600, height: 112, rx: 14, fill: '#ffffff', stroke: P.green, 'stroke-width': 8 }, sign);
  el('rect', { x: -268, y: -16, width: 72, height: 32, fill: P.green }, sign);
  el('rect', { x: -248, y: -36, width: 32, height: 72, fill: P.green }, sign);
  el('text', { x: 30, y: 18, 'text-anchor': 'middle', 'font-family': 'Montserrat', 'font-weight': 900, 'font-size': 50, fill: P.ink, text: 'CENTRE DE SANTÉ' }, sign);
  for (const xx of [-240, 240]) el('rect', { x: xx - 8, y: 56, width: 16, height: 54, fill: '#8a98a2' }, sign);
  return h;
}

// ---------- end card ECG line ----------
export function ecg(p, w = 760) {
  const d = `M0,0 L${w * 0.32},0 L${w * 0.38},-26 L${w * 0.44},40 L${w * 0.5},-90 L${w * 0.56},70 L${w * 0.62},-20 L${w * 0.66},0 L${w},0`;
  const path = el('path', { d, fill: 'none', stroke: P.green, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, p);
  const len = w * 1.9;
  path.setAttribute('stroke-dasharray', len);
  return (k) => path.setAttribute('stroke-dashoffset', (len * (1 - clamp(k))).toFixed(1));
}

// Burkina Faso flag (red over green, yellow star)
export function flag(p, w = 120) {
  const f = g(p);
  const h = w * 2 / 3;
  el('rect', { x: 0, y: 0, width: w, height: h / 2, fill: '#ef2b2d' }, f);
  el('rect', { x: 0, y: h / 2, width: w, height: h / 2, fill: '#009e49' }, f);
  const r = h * 0.22, cx = w / 2, cy = h / 2;
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.4 : r; return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`; });
  el('polygon', { points: pts.join(' '), fill: '#fcd116' }, f);
  return f;
}
