// HTML overlay: logo, subtitles, banners, cards (with live 3D insets), icons,
// transitions and the end card. Everything is recomputed from t every frame.
import { clamp, smooth, easeOut, backOut, easeInOut, lerp } from './core.js';

// numeric animation states: { tx, ty, s, rot, op } for in-progress ki / out-progress ko
const ANIMS = {
  pop: (ki, ko) => ({ s: lerp(0.5, 1, backOut(ki)) * lerp(0.92, 1, ko), op: Math.min(smooth(ki * 2.2), smooth(ko)) }),
  up: (ki, ko) => ({ ty: lerp(80, 0, easeOut(ki)) + lerp(-30, 0, ko), op: Math.min(smooth(ki * 1.4), smooth(ko)) }),
  down: (ki, ko) => ({ ty: lerp(-80, 0, easeOut(ki)) + lerp(30, 0, ko), op: Math.min(smooth(ki * 1.4), smooth(ko)) }),
  left: (ki, ko) => ({ tx: lerp(-700, 0, easeOut(ki)) + lerp(-80, 0, smooth(ko)), op: Math.min(smooth(ki * 3), smooth(ko)) }),
  right: (ki, ko) => ({ tx: lerp(700, 0, easeOut(ki)) + lerp(80, 0, smooth(ko)), op: Math.min(smooth(ki * 3), smooth(ko)) }),
  fade: (ki, ko) => ({ op: Math.min(smooth(ki), smooth(ko)) }),
  stamp: (ki, ko) => ({ s: lerp(1.8, 1, easeOut(ki)) * lerp(0.9, 1, ko), rot: lerp(-8, 0, easeOut(ki)), op: Math.min(smooth(ki * 3), smooth(ko)) }),
  drop: (ki, ko) => ({ ty: lerp(-140, 0, backOut(ki)), op: Math.min(smooth(ki * 2.5), smooth(ko)) }),
};

export class Overlay {
  constructor(root, tl, logo) {
    this.root = root;
    this.tl = tl;
    this.items = [];
    this.wipes = [];
    this.cues = [];
    this.states = new Map();
    this.endCard = null;

    this.logo = this.el('logo-card', `<img alt="SOS Médecins Burkina Faso" src="${logo.src}">`);
    this.logo.style.opacity = 1;
    this.logo.style.visibility = 'visible';
    this.subEl = this.el('sub', '<span></span>');
    this.subSpan = this.subEl.firstChild;
    this.lastSub = null;

    this.wipeEl = this.el('wipe', '');
    let x = 0;
    for (const [c, w] of [['#0da255', 260], ['#ffffff', 140], ['#e81e27', 2600], ['#ffffff', 140], ['#0da255', 260]]) {
      const d = document.createElement('div');
      Object.assign(d.style, { left: `${x}px`, width: `${w + 2}px`, background: c });
      this.wipeEl.appendChild(d);
      x += w;
    }
  }

  el(cls, html = '', style = {}) {
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = html;
    Object.assign(d.style, style);
    d.style.opacity = 0;
    d.style.visibility = 'hidden';
    this.root.appendChild(d);
    return d;
  }

  // ---------- building blocks ----------
  banner(text, { color = 'red', y, size = 86, tilt = -3, cls = '' } = {}) {
    const e = this.el(`banner ${color} ${cls}`, `<span style="font-size:${size}px">${text}</span>`, { top: `${y}px` });
    e.dataset.tilt = tilt;
    return e;
  }

  box(cls, html, { x, y, w, h, tilt = 0, style = {} } = {}) {
    const st = { left: `${x}px`, top: `${y}px`, ...style };
    if (w) st.width = `${w}px`;
    if (h) st.height = `${h}px`;
    const e = this.el(cls, html, st);
    e.dataset.tilt = tilt;
    return e;
  }

  // card whose picture is a live 3D inset (the frame is transparent inside)
  card({ x, y, w, h, caption, num, capColor = 'green', capSize }) {
    const html = `<div class="frame"></div>${caption ? `<div class="cap ${capColor}" ${capSize ? `style="font-size:${capSize}px"` : ''}>${caption}</div>` : ''}${num ? `<div class="num">${num}</div>` : ''}`;
    const e = this.box('card3d', html, { x, y, w, h });
    e.rect = { x: x + 7, y: y + 7, w: w - 14, h: h - 14, r: 15 };
    return e;
  }

  ring({ x, y, d }) {
    const e = this.box('ring', '', { x, y, w: d, h: d });
    e.rect = { x: x + 10, y: y + 10, w: d - 20, h: d - 20 };
    return e;
  }

  // show element between t0 and t1 with an entrance animation
  show(el, t0, t1, { anim = 'pop', fi = 0.45, fo = 0.3, cue = true, kind, fn } = {}) {
    this.items.push({ el, t0, t1, anim, fi, fo, fn });
    if (cue) this.cues.push({ t: +t0.toFixed(3), kind: kind || 'pop' });
    return el;
  }

  wipe(t) { this.wipes.push(t); }

  stateOf(el) { return this.states.get(el) || null; }

  update(t) {
    const state = new Map();
    for (const it of this.items) {
      if (t < it.t0 || t > it.t1) { if (!state.has(it.el)) state.set(it.el, null); continue; }
      const ki = clamp((t - it.t0) / it.fi), ko = clamp((it.t1 - t) / it.fo);
      const a = ANIMS[it.anim](ki, ko);
      const s = { tx: a.tx || 0, ty: a.ty || 0, s: a.s ?? 1, rot: (a.rot || 0) + Number(it.el.dataset.tilt || 0), op: a.op, it, ki, ko };
      const prev = state.get(it.el);
      if (!prev || s.op > prev.op) state.set(it.el, s);
    }
    this.states = state;
    for (const [el, s] of state) {
      if (!s || s.op <= 0.001) { el.style.opacity = 0; el.style.visibility = 'hidden'; continue; }
      el.style.visibility = 'visible';
      el.style.opacity = s.op.toFixed(3);
      el.style.transform = `translate(${s.tx.toFixed(1)}px, ${s.ty.toFixed(1)}px) rotate(${s.rot.toFixed(2)}deg) scale(${s.s.toFixed(4)})`;
      if (s.it.fn) s.it.fn(el, t, s.ki, s.ko);
    }

    // subtitles
    const sub = this.tl.data.subs.find((x) => t >= x.start && t < x.end);
    if (sub !== this.lastSub) { this.subSpan.textContent = sub ? sub.text.replace(/ ([:!?;])/g, '\u00a0$1') : ''; this.lastSub = sub; }
    if (sub) {
      const k = Math.min(clamp((t - sub.start) / 0.08), clamp((sub.end - t) / 0.06));
      this.subEl.style.opacity = k.toFixed(3);
      this.subEl.style.visibility = 'visible';
      this.subEl.style.transform = `translateY(${((1 - k) * 8).toFixed(1)}px)`;
    } else { this.subEl.style.opacity = 0; }

    // logo: always visible; at the end it grows into the end card
    let lk = 0;
    if (this.endCard !== null) lk = easeInOut(clamp((t - this.endCard - 0.2) / 0.9));
    const L = this.logoTarget || { dx: -260, dy: 230, s: 2.8 };
    this.logo.style.transform = `translate(${lerp(0, L.dx, lk)}px, ${lerp(0, L.dy, lk)}px) scale(${lerp(1, L.s, lk)})`;
    this.logo.style.boxShadow = `0 10px 30px rgba(0,0,0,${(0.3 * (1 - lk)).toFixed(3)})`;

    // wipe transitions
    let on = false;
    for (const tw of this.wipes) {
      const p = (t - tw) / 0.45;
      if (p < -1 || p > 1) continue;
      on = true;
      const x = lerp(-3700, 1400, easeInOut((p + 1) / 2));
      this.wipeEl.style.transform = `translateX(${x.toFixed(1)}px) skewX(-12deg)`;
    }
    this.wipeEl.style.opacity = on ? 1 : 0;
    this.wipeEl.style.visibility = on ? 'visible' : 'hidden';
  }
}
