// Choreography of the motion-design version: the doctor speaks, and every
// element appears on the word that names it (word timings from the narration).
import { el, g, place, linear } from './svg.js';
import * as A from './art.js';
import { ICO } from './icons2.js';
import { ICONS } from '../icons.js';
import { clamp, lerp, smooth, easeOut, easeInOut, backOut, prog, noise1 } from '../core.js';

const FLAG = `<svg width="84" height="56" viewBox="0 0 120 80" style="border-radius:6px"><rect width="120" height="40" fill="#ef2b2d"/><rect y="40" width="120" height="40" fill="#009e49"/><polygon points="${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7 : 17; return `${(60 + Math.cos(a) * r).toFixed(1)},${(40 + Math.sin(a) * r).toFixed(1)}`; }).join(' ')}" fill="#fcd116"/></svg>`;

// ---------- animation helpers ----------
export function anim(node, t, t0, t1, { x = 0, y = 0, s = 1, r = 0, from = 'pop', fi = 0.45, fo = 0.3 } = {}) {
  if (t < t0 || t > t1) { node.style.display = 'none'; return 0; }
  const ki = clamp((t - t0) / fi), ko = clamp((t1 - t) / fo);
  let dx = 0, dy = 0, sc = 1;
  const op = Math.min(smooth(ki * 1.6), smooth(ko));
  if (from === 'pop') sc = lerp(0.3, 1, backOut(ki)) * lerp(0.85, 1, smooth(ko));
  if (from === 'up') dy = lerp(90, 0, easeOut(ki));
  if (from === 'down') dy = lerp(-90, 0, easeOut(ki));
  if (from === 'left') dx = lerp(-360, 0, easeOut(ki));
  if (from === 'right') dx = lerp(360, 0, easeOut(ki));
  place(node, { x: x + dx, y: y + dy, s: s * sc, r, op });
  return op;
}

const ARM = {
  rest: { up: 0 },
  pointL: { up: 1, pose: 'point', x: 300, y: 1560, r: 10 },
  pointR: { up: 1, pose: 'point', x: 780, y: 1560, r: -10 },
  openL: { up: 1, pose: 'open', x: 290, y: 1650, r: 22 },
  openR: { up: 1, pose: 'open', x: 790, y: 1650, r: -22 },
  thumbR: { up: 1, pose: 'thumb', x: 770, y: 1610, r: -8 },
  thumbL: { up: 1, pose: 'thumb', x: 310, y: 1610, r: 8 },
  stopR: { up: 1, pose: 'open', x: 720, y: 1540, r: -4 },
  waveR: { up: 1, pose: 'open', x: 800, y: 1520, r: -12, wave: 1 },
};
const G = {
  rest: [ARM.rest, ARM.rest], pointL: [ARM.pointL, ARM.rest], pointR: [ARM.rest, ARM.pointR], open: [ARM.openL, ARM.openR],
  openL: [ARM.openL, ARM.rest], openR: [ARM.rest, ARM.openR], thumb: [ARM.rest, ARM.thumbR], thumbs: [ARM.thumbL, ARM.thumbR],
  stop: [ARM.rest, ARM.stopR], wave: [ARM.rest, ARM.waveR], pointLopenR: [ARM.pointL, ARM.openR],
};

function blendArm(a, b, k) {
  const out = {};
  for (const key of ['up', 'x', 'y', 'r']) {
    const va = a[key] ?? (key === 'up' ? 0 : b[key]), vb = b[key] ?? (key === 'up' ? 0 : a[key]);
    out[key] = va === undefined ? vb : lerp(va, vb, k);
  }
  // when the hand changes shape it dips a little and switches at the bottom of the dip
  const change = (a.pose || 'open') !== (b.pose || 'open') && a.up > 0 && b.up > 0;
  if (change) out.up = out.up - Math.sin(k * Math.PI) * 0.35;
  out.pose = k < 0.5 ? a.pose : b.pose;
  out.wave = k < 0.5 ? a.wave : b.wave;
  return out;
}

function gestureAt(t, track, dur = 0.45) {
  let i = 0;
  while (i + 1 < track.length && t >= track[i + 1][0]) i++;
  const cur = G[track[i][1]];
  if (i === 0) return cur;
  const prev = G[track[i - 1][1]];
  const k = easeInOut((t - track[i][0]) / dur);
  return [blendArm(prev[0], cur[0], k), blendArm(prev[1], cur[1], k)];
}

function exprAt(t, track, dur = 0.4) {
  const f = ['smile', 'brow', 'worry', 'serious', 'nod', 'tilt', 'turn'];
  let i = 0;
  while (i + 1 < track.length && t >= track[i + 1][0]) i++;
  const cur = track[i][1], prev = i ? track[i - 1][1] : cur;
  const k = i ? smooth((t - track[i][0]) / dur) : 1;
  const o = {};
  for (const n of f) o[n] = lerp(prev[n] ?? (n === 'smile' ? 0.5 : 0), cur[n] ?? (n === 'smile' ? 0.5 : 0), k);
  const la = prev.look || [0, 0], lb = cur.look || [0, 0];
  o.look = [lerp(la[0], lb[0], k), lerp(la[1], lb[1], k)];
  return o;
}

export function buildScenes({ tl, ui, svg, defs, doctor }) {
  const L = (id) => tl.L(id), W = (id, w, n) => tl.W(id, w, n);
  const S = (n) => tl.scene(n);
  const bgLayer = g(svg), artLayer = g(svg);
  svg.appendChild(doctor.root);
  const scenes = [];
  const cue = (t, kind = 'pop') => ui.cues.push({ t: +t.toFixed(3), kind });
  const chip = (n, txt, sc) => ui.show(ui.box('chip', `<b>${n}</b>${txt}`, { x: 40, y: 56 }), sc.start + 0.3, sc.end - 0.1, { anim: 'left', cue: false });
  const bgRect = (parent, stops) => el('rect', { x: 0, y: 0, width: 1080, height: 1920, fill: linear(defs, stops) }, parent);
  const blob = (parent, cx, cy, r, fill, op = 1) => el('circle', { cx, cy, r, fill, opacity: op }, parent);
  for (const s of tl.scenes.slice(1)) ui.wipe(s.start);

  // ===================================================================== 1
  {
    const sc = S(1), bg = g(bgLayer), art = g(artLayer);
    chip(1, 'Restons vigilants', sc);
    const rainy = bgRect(bg, [[0, '#35505f'], [0.55, '#6f8e9b'], [1, '#a9c0c6']]);
    const sunny = bgRect(bg, [[0, '#6fc0ea'], [0.55, '#bfe6f3'], [1, '#eef8f2']]);
    const sunW = g(art); const sunA = A.sun(sunW, 0, 0, 64);
    const clouds = [[180, 300, 1.2], [620, 250, 1.5], [940, 340, 1.0]].map(([x, y, s]) => { const w = g(art); A.cloud(w, 0, 0, s, '#d9e1e6'); return { w, x, y }; });
    const ground = el('rect', { x: 0, y: 900, width: 1080, height: 1020, fill: linear(defs, [[0, '#b9774a'], [0.25, '#c8895a'], [1, '#e2b88f']]) }, art);
    const town = g(art, { transform: 'translate(-80 -95) scale(1.15)' }); A.neighbourhood(town);
    const rainG = g(art); const rainU = A.rain(rainG, 140);
    const items = [
      { w: g(art), make: (p) => A.tire(p, 0, 0, 1.1), x: 190, y: 850, t: W('s1b', 'eaux') },
      { w: g(art), make: (p) => A.bucket(p, 0, 0, 1.0), x: 530, y: 880, t: W('s1b', 'eaux') + 0.2 },
      { w: g(art), make: (p) => A.jar(p, 0, 0, 1.0), x: 870, y: 880, t: W('s1b', 'eaux') + 0.4 },
    ].map((it) => ({ ...it, a: it.make(it.w) }));
    const mqs = [0, 1, 2, 3].map(() => { const w = g(art); return { w, m: A.mosquito(w, 0.26) }; });
    const tP = W('s1b', 'prolifération');
    for (let i = 0; i < 4; i++) cue(tP + i * 0.25);
    ui.show(ui.box('h1 center', '<em>Dengue</em>', { x: 60, y: 270, w: 960, style: { fontSize: '170px' } }), 0.15, L('s1b').start + 0.2, { anim: 'stamp' });
    ui.show(ui.box('kw', 'Restons vigilants !', { x: 205, y: 470 }), 0.5, L('s1b').start + 0.2, { anim: 'up' });
    ui.show(ui.box('kw white', `<span style="display:inline-flex;align-items:center;gap:16px">${FLAG}Burkina Faso</span>`, { x: 300, y: 610 }), W('s1a', 'burkina') - 0.1, L('s1b').start + 0.2, { anim: 'pop' });
    ui.show(ui.box('kw red', 'À prendre au sérieux', { x: 230, y: 730 }), W('s1a', 'sérieux') - 0.2, L('s1b').start + 0.2, { anim: 'pop' });
    ui.show(ui.box('kw dark', `<span style="display:inline-flex;align-items:center;gap:14px"><span style="width:64px;height:64px">${ICO.rain}</span>Saison des pluies</span>`, { x: 60, y: 280 }), W('s1b', 'saison') - 0.1, L('s1c').start, { anim: 'left' });
    ui.show(ui.box('kw', 'Eaux stagnantes', { x: 360, y: 400 }), W('s1b', 'eaux') - 0.1, L('s1c').start, { anim: 'right' });
    ui.show(ui.box('kw red', 'Moustiques', { x: 210, y: 520 }), tP - 0.1, L('s1c').start, { anim: 'pop' });
    ui.show(ui.box('h1 center', '<em>Dengue :</em><br>restons vigilants !', { x: 60, y: 270, w: 960, style: { fontSize: '96px' } }), L('s1c').start, sc.end - 0.1, { anim: 'stamp' });
    scenes.push({
      ...sc, bg, art,
      update(t) {
        const clear = smooth(prog(t, 9.6, 11.2));
        rainy.setAttribute('opacity', 1 - clear);
        sunny.setAttribute('opacity', clear);
        place(sunW, { x: 900, y: lerp(720, 600, clear), op: clear, s: 0.7 + 0.3 * clear });
        sunA.update(t);
        clouds.forEach((c, i) => place(c.w, { x: c.x + Math.sin(t * 0.2 + i) * 30 + clear * (i - 1) * 120, y: c.y - clear * 60, op: 1 - clear * 0.7 }));
        rainU(t, 1 - smooth(prog(t, 8.8, 10.6)));
        items.forEach((it) => { anim(it.w, t, it.t, sc.end + 1, { x: it.x, y: it.y, from: 'up' }); it.a.update?.(t); });
        mqs.forEach((m, i) => {
          const t0 = tP + i * 0.25;
          const p = t * 0.9 + i * 1.9;
          const op = anim(m.w, t, t0, sc.end + 1, { x: 200 + i * 230 + noise1(p, i) * 90, y: 640 + noise1(p * 1.3, i + 5) * 60, from: 'fade', fi: 0.3 });
          if (op) m.m.update(t + i * 0.01);
        });
        const st = exprAt(t, [[0, { serious: 0.5, smile: 0.2 }], [L('s1b').start, { smile: 0.4, look: [-0.3, -0.8] }], [W('s1b', 'moustiques'), { worry: 0.6, smile: 0.1 }], [L('s1c').start, { smile: 1, brow: 0.6 }]]);
        const arms = gestureAt(t, [[0, 'rest'], [1.3, 'open'], [3.7, 'rest'], [W('s1b', 'saison') - 0.2, 'pointL'], [W('s1b', 'eaux') - 0.2, 'pointR'], [tP - 0.2, 'open'], [L('s1c').start, 'rest'], [W('s1c', 'agir') - 0.3, 'thumb']]);
        const enter = easeOut(prog(t, 0.4, 1.1));
        return { ...st, armL: arms[0], armR: arms[1], y: 50 + (1 - enter) * 700 };
      },
    });
  }

  // ===================================================================== 2
  {
    const sc = S(2), bg = g(bgLayer), art = g(artLayer);
    chip(2, 'Comprendre', sc);
    bgRect(bg, [[0, '#d4efe2'], [1, '#f4fbf7']]);
    blob(bg, 540, 1360, 420, '#c3e9d5', 0.7);
    blob(bg, 900, 420, 260, '#e6f7ee', 1);
    const armW = g(art); A.arm(armW);
    const mqW = g(art); const mq = A.mosquito(mqW, 1);
    const vW = g(art); A.virus(vW, 44);
    const biteW = g(art);
    const rings = [0, 1, 2].map(() => el('circle', { r: 20, fill: 'none', stroke: A.P.red, 'stroke-width': 6 }, biteW));
    el('circle', { r: 16, fill: A.P.red }, biteW);
    const sunW = g(art); const sunA = A.sun(sunW, 0, 0, 56);
    const tV = W('s2a', 'virale'), tB = W('s2a', 'piqûre'), tA = W('s2a', 'genre'), tJ = L('s2b').start;
    ui.show(ui.box('kw red', 'Virus', { x: 770, y: 440 }), tV, tB - 0.1, { anim: 'pop' });
    ui.show(ui.box('card', `<div class="ic">${ICONS.bleed}</div><div class="tx">La dengue se transmet par la piqûre d’un moustique infecté.</div>`, { x: 50, y: 270, w: 980 }), tB + 0.2, sc.end - 0.1, { anim: 'down' });
    ui.show(ui.box('kw dark', 'Moustique Aedes', { x: 280, y: 430 }), tA - 0.1, tJ, { anim: 'pop' });
    ui.show(ui.box('lbl', '<span style="background:#fff;padding:8px 18px;border-radius:12px;box-shadow:0 8px 18px rgba(0,0,0,.1)">Pattes rayées de blanc</span>', { x: 330, y: 540 }), tA + 0.5, tJ, { anim: 'fade' });
    ui.show(ui.box('kw yellow', 'Il pique aussi le jour', { x: 110, y: 450 }), tJ + 0.1, sc.end - 0.1, { anim: 'left' });
    cue(tB + 0.5, 'pop');
    scenes.push({
      ...sc, bg, art,
      update(t) {
        // mosquito: flies in, hovers, then lands on the arm for the bite
        const fly = easeOut(prog(t, sc.start + 0.1, sc.start + 1.2));
        const land = easeInOut(prog(t, tB - 0.4, tB + 0.5));
        const hx = lerp(1300, 520, fly) + Math.sin(t * 1.6) * 30, hy = 560 + Math.sin(t * 2.3) * 24;
        const lx = 560, ly = 690;
        const s = lerp(1.1, 0.85, land);
        place(mqW, { x: lerp(hx, lx, land), y: lerp(hy, ly, land), s, r: lerp(-8, 10, land) });
        mq.update(t, 1 - land * 0.9);
        anim(armW, t, tB - 0.8, sc.end + 1, { x: 420, y: 790, s: 1.15, from: 'left', fi: 0.6 });
        anim(vW, t, tV, tB - 0.1, { x: 690, y: 470, from: 'pop' });
        const bite = anim(biteW, t, tB + 0.5, sc.end + 1, { x: 700, y: 790, from: 'pop' });
        if (bite) rings.forEach((r, i) => { const k = (t * 0.9 + i / 3) % 1; r.setAttribute('r', 20 + k * 60); r.setAttribute('opacity', (1 - k).toFixed(3)); });
        anim(sunW, t, tJ, sc.end + 1, { x: 880, y: 640, s: 1.2, from: 'up' });
        sunA.update(t);
        const st = exprAt(t, [[sc.start, { smile: 0.5, brow: 0.3, look: [-0.2, -0.8] }], [tB, { smile: 0.2, worry: 0.3, look: [0, -0.6] }], [tJ, { smile: 0.6, brow: 0.5, look: [0.5, -0.5] }]]);
        const arms = gestureAt(t, [[sc.start, 'rest'], [sc.start + 0.6, 'pointL'], [tB, 'open'], [tA, 'pointR'], [tJ + 0.2, 'pointR'], [tJ + 1.4, 'rest']]);
        return { ...st, armL: arms[0], armR: arms[1] };
      },
    });
  }

  // ===================================================================== 3
  {
    const sc = S(3), bg = g(bgLayer), art = g(artLayer);
    chip(3, 'Les symptômes', sc);
    const calm = bgRect(bg, [[0, '#fbf1df'], [1, '#fffaf2']]);
    const alarm = bgRect(bg, [[0, '#7c0e15'], [0.6, '#b3141b'], [1, '#d6333a']]);
    const glow = blob(bg, 540, 1360, 430, '#ffe6c2', 0.8);
    const tD = L('s3b').start - 0.1, tU = L('s3c').start;
    ui.show(ui.box('h1 center', 'Les signes<br><em>à surveiller</em>', { x: 60, y: 250, w: 960, style: { fontSize: '74px' } }), L('s3a').start - 0.1, tD, { anim: 'stamp' });
    const tiles = [
      ['fever', 'Forte fièvre', 'forte', 0, 30, 430], ['head', 'Maux de tête et douleurs derrière les yeux', 'maux', 0, 377, 430],
      ['joint', 'Douleurs musculaires et articulaires', 'douleurs', 1, 724, 430], ['nausea', 'Nausées ou vomissements', 'nausées', 0, 203, 676],
      ['rash', 'Parfois, éruptions cutanées', 'parfois', 0, 550, 676],
    ];
    tiles.forEach(([ic, txt, w, n, x, y]) => {
      ui.show(ui.box('card', `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100%"><div class="ic" style="width:120px;height:120px;flex-basis:auto"><span style="width:100px;height:100px;display:block">${ICO[ic]}</span></div><div class="tx" style="font-size:31px;text-align:center">${txt}</div></div>`,
        { x, y, w: 326, style: { padding: '14px 12px', height: '228px' } }), W('s3a', w, n) - 0.15, tD, { anim: 'pop' });
    });
    ui.show(ui.box('h1 center white', `<span style="display:inline-flex;align-items:center;gap:20px"><span style="width:96px;height:96px;display:inline-block">${ICONS.alert}</span>Signes de danger</span>`, { x: 60, y: 250, w: 960, style: { fontSize: '72px' } }), tD, sc.end - 0.1, { anim: 'stamp', kind: 'alert' });
    const dangers = [['abdo', 'Douleurs abdominales intenses', 'abdominales'], ['vomit', 'Vomissements persistants', 'vomissements'], ['bleed', 'Saignements', 'saignements'], ['weak', 'Grande faiblesse', 'faiblesse'], ['breath', 'Difficultés respiratoires', 'difficultés']];
    dangers.forEach(([ic, txt, w], i) => {
      ui.show(ui.box('card red', `<div class="ic">${ICONS[ic]}</div><div class="tx">${txt}</div>`, { x: 90, y: 390 + i * 100, w: 900, style: { padding: '6px 22px 6px 8px' } }), W('s3b', w) - 0.2, sc.end - 0.1, { anim: i % 2 ? 'right' : 'left', kind: 'alert' });
    });
    ui.show(ui.box('kw white', `<span style="color:#e81e27">Il faut consulter<br>en urgence !</span>`, { x: 90, y: 520, w: 900, style: { fontSize: '68px', lineHeight: '1.08', textAlign: 'center', whiteSpace: 'normal', boxSizing: 'border-box', boxShadow: '0 20px 40px rgba(0,0,0,.35)', zIndex: 40 } }), tU, sc.end - 0.1, { anim: 'stamp', kind: 'alert' });
    const dim = el('rect', { x: 0, y: 370, width: 1080, height: 540, fill: '#5a0a0f', opacity: 0 }, art);
    scenes.push({
      ...sc, bg, art,
      update(t) {
        const d = smooth(prog(t, tD, tD + 0.6));
        calm.setAttribute('opacity', 1 - d); alarm.setAttribute('opacity', d);
        glow.setAttribute('fill', d > 0.5 ? '#e0464c' : '#ffe6c2');
        glow.setAttribute('opacity', (0.8 * (d > 0.5 ? 0.35 + 0.15 * Math.sin(t * 5) : 1)).toFixed(3));
        dim.setAttribute('opacity', (smooth(prog(t, tU, tU + 0.3)) * 0.55).toFixed(3));
        const ws = ['forte', 'maux', 'douleurs', 'nausées', 'parfois'].map((w, i) => W('s3a', w, i === 2 ? 1 : 0));
        const st = exprAt(t, [[sc.start, { worry: 0.3, look: [0, -0.8] }], [ws[0], { worry: 0.6, look: [-0.6, -0.8] }], [ws[1], { worry: 0.7, look: [0, -0.8] }], [ws[2], { worry: 0.6, look: [0.6, -0.8] }], [ws[3], { worry: 0.5, look: [-0.3, -0.6] }], [ws[4], { worry: 0.5, look: [0.3, -0.6] }], [tD, { serious: 0.9, smile: 0, look: [0, -0.4] }], [tU, { serious: 1, smile: 0, brow: 0.3, look: [0, 0] }]]);
        const arms = gestureAt(t, [[sc.start, 'rest'], [ws[0] - 0.2, 'pointL'], [ws[1] - 0.2, 'pointR'], [ws[2] - 0.2, 'pointR'], [ws[3] - 0.2, 'pointL'], [ws[4] - 0.2, 'pointR'], [tD, 'open'], [tD + 2.5, 'rest'], [tU - 0.2, 'stop']]);
        return { ...st, armL: arms[0], armR: arms[1] };
      },
    });
  }

  // ===================================================================== 4
  {
    const sc = S(4), bg = g(bgLayer), art = g(artLayer);
    chip(4, 'Prévention', sc);
    bgRect(bg, [[0, '#d8f2e3'], [1, '#f5fcf8']]);
    blob(bg, 540, 1360, 420, '#c3e9d5', 0.7);
    const st5 = ['s4b', 's4c', 's4d', 's4e', 's4f'].map((id) => L(id).start - 0.1);
    const tSlogan = W('s4f', 'supprimer') - 0.2;
    ui.show(ui.box('h1 center', 'Les bons <i>réflexes</i>', { x: 60, y: 250, w: 960, style: { fontSize: '78px' } }), L('s4a').start - 0.1, tSlogan, { anim: 'stamp' });
    // progress dots
    const dots = [0, 1, 2, 3, 4].map((i) => ui.box('', `<div style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font:900 32px Montserrat;background:#fff;color:#0da255;box-shadow:0 6px 14px rgba(0,0,0,.12)">${i + 1}</div>`, { x: 330 + i * 86, y: 360, style: { zIndex: 30 } }));
    dots.forEach((d, i) => ui.show(d, L('s4a').start + 0.5 + i * 0.12, tSlogan, { anim: 'pop', cue: i === 0, fn: (e, t) => {
      const done = t >= st5[i] + 1.6, active = t >= st5[i] && !done;
      const c = e.firstChild;
      c.style.background = done ? '#0da255' : active ? '#e81e27' : '#fff';
      c.style.color = done || active ? '#fff' : '#0da255';
      c.textContent = done ? '✓' : String(i + 1);
      c.style.transform = active ? `scale(${1.15 + 0.05 * Math.sin(t * 8)})` : '';
    } }));
    const texts = ['Vider régulièrement les récipients où l’eau stagne.', 'Couvrir hermétiquement les réserves d’eau.', 'Nettoyer les récipients et éliminer les objets inutiles pouvant retenir l’eau.', 'Utiliser des moustiquaires, des vêtements couvrants et des répulsifs adaptés.', 'Entretenir les abords de la maison et supprimer les gîtes de reproduction des moustiques.'];
    texts.forEach((tx, i) => ui.show(ui.box('step', `<b style="color:#e81e27">${i + 1}.</b> ${tx}`, { x: 70, y: 782, w: 940, style: { fontSize: '36px' } }), st5[i] + 0.1, i < 4 ? st5[i + 1] - 0.05 : tSlogan, { anim: 'up', cue: false }));
    // step illustrations
    const s1 = g(art); const buck = A.bucket(s1, 0, 0, 1);
    const drops = [0, 1, 2, 3, 4, 5, 6, 7].map(() => el('ellipse', { rx: 10, ry: 14, fill: '#5f9fd0' }, art));
    const s2 = g(art); const bar = A.barrel(s2, 0, 0, 0.95);
    const s2j = g(art); const jar2 = A.jar(s2j, 0, 0, 0.75, true);
    const s3 = g(art); const binA = A.bin(s3, 0, 0);
    const junk = [(p) => A.tire(p, 0, 0, 0.55), (p) => A.can(p, 0, 0, 80, A.P.red), (p) => A.can(p, 0, 0, -70, A.P.green)].map((mk, i) => { const w = g(art); const a = mk(w); return { w, a, i }; });
    const s4 = ['net', 'shirt', 'spray'].map((k) => ui.box('', `<div style="width:290px;height:260px;border-radius:40px;background:#fff;display:grid;place-items:center;box-shadow:0 14px 30px rgba(20,40,30,.12)"><span style="width:200px;height:200px;display:block">${ICO[k]}</span></div>`, { style: { zIndex: 26 } }));
    ['moustiquaires', 'vêtements', 'répulsifs'].forEach((w, i) => ui.show(Object.assign(s4[i], {}), W('s4e', w) - 0.15, st5[4] - 0.05, { anim: 'pop' }));
    s4.forEach((e, i) => Object.assign(e.style, { left: `${75 + i * 320}px`, top: '470px', transformOrigin: '50% 50%' }));
    const s5 = g(art);
    const puddle = el('ellipse', { cx: 0, cy: 0, rx: 230, ry: 46, fill: A.P.water }, s5);
    const grass = [-200, -120, 150, 220].map((x) => { const gg = g(s5, { transform: `translate(${x} -10)` }); for (let k = -2; k <= 2; k++) el('path', { d: `M${k * 10},0 L${k * 14 + 4},-70 L${k * 10 + 8},0 Z`, fill: k % 2 ? A.P.leaf : A.P.leafDark }, gg); return gg; });
    const broomW = g(art);
    el('rect', { x: -8, y: -300, width: 16, height: 260, rx: 8, fill: '#a37b3e' }, broomW);
    el('path', { d: 'M-60,0 L60,0 L22,-60 L-22,-60 Z', fill: '#d6b25f' }, broomW);
    el('rect', { x: -24, y: -66, width: 48, height: 12, rx: 6, fill: A.P.red }, broomW);
    ui.show(ui.box('h1 center', 'Moins d’eau stagnante,<br><em>moins de moustiques !</em>', { x: 40, y: 430, w: 1000, style: { fontSize: '70px', background: '#fff', borderRadius: '36px', padding: '40px 20px', boxShadow: '0 24px 50px rgba(20,40,30,.16)', boxSizing: 'border-box' } }), tSlogan, sc.end - 0.1, { anim: 'stamp' });
    for (const t of st5) cue(t + 1.6, 'pop');
    scenes.push({
      ...sc, bg, art,
      update(t) {
        // 1. empty the bucket
        const k1 = easeInOut(prog(t, st5[0] + 0.5, st5[0] + 1.3));
        anim(s1, t, st5[0], st5[1] - 0.05, { x: 560 - k1 * 60, y: 690 - k1 * 40, s: 1.25, r: -k1 * 115, from: 'pop' });
        if (buck.water) buck.water.style.display = k1 > 0.3 ? 'none' : '';
        drops.forEach((d, i) => {
          const f = prog(t, st5[0] + 0.8 + i * 0.07, st5[0] + 1.5 + i * 0.07);
          d.style.display = f > 0 && f < 1 && t < st5[1] ? '' : 'none';
          d.setAttribute('cx', 360 - f * 70 + (i % 3) * 16); d.setAttribute('cy', 560 + f * f * 180);
        });
        // 2. lids close
        const k2 = backOut(prog(t, st5[1] + 0.6, st5[1] + 1.3));
        anim(s2, t, st5[1], st5[2] - 0.05, { x: 390, y: 745, s: 1.0, from: 'pop' });
        anim(s2j, t, st5[1] + 0.15, st5[2] - 0.05, { x: 740, y: 735, s: 1.05, from: 'pop' });
        place(bar.lid, { y: (1 - k2) * -260, r: (1 - k2) * 14 });
        jar2.lid.style.display = '';
        place(jar2.lid, { y: (1 - backOut(prog(t, st5[1] + 0.9, st5[1] + 1.5))) * -240 });
        // 3. junk into the bin
        anim(s3, t, st5[2], st5[3] - 0.05, { x: 780, y: 740, s: 1.2, from: 'pop' });
        junk.forEach((j) => {
          const t0 = st5[2] + 0.7 + j.i * 0.5;
          const f = easeInOut(prog(t, t0, t0 + 0.6));
          const hx = 200 + j.i * 150, hy = 740;
          const op = anim(j.w, t, st5[2] + 0.1, st5[3] - 0.05, { x: lerp(hx, 780, f), y: lerp(hy, 480, f) - Math.sin(f * Math.PI) * 220, s: 1.3 - f * 0.6, r: f * 200, from: 'pop' });
          if (f >= 1) j.w.style.display = 'none';
          j.a.update?.(t);
          void op;
        });
        place(binA.lid, { r: -smooth(prog(t, st5[2] + 0.3, st5[2] + 0.6)) * 40 * (1 - smooth(prog(t, st5[2] + 2.3, st5[2] + 2.6))), x: 0, y: 0 });
        // 5. sweep and dry
        const k5 = smooth(prog(t, st5[4] + 0.5, st5[4] + 2.2));
        anim(s5, t, st5[4], tSlogan, { x: 540, y: 700, s: 1.25, from: 'pop' });
        puddle.setAttribute('rx', 230 * (1 - k5)); puddle.setAttribute('ry', 46 * (1 - k5));
        grass.forEach((gg, i) => gg.setAttribute('opacity', (1 - smooth(prog(k5, i * 0.18, i * 0.18 + 0.35))).toFixed(3)));
        anim(broomW, t, st5[4] + 0.2, tSlogan, { x: 540 + Math.sin(t * 6) * 140, y: 712, s: 1.25, r: Math.sin(t * 6) * 16, from: 'fade' });
        const st = exprAt(t, [[sc.start, { smile: 0.8, brow: 0.4, look: [0, -0.8] }], [st5[0], { smile: 0.7, look: [-0.2, -0.8] }], [tSlogan, { smile: 1, brow: 0.6, look: [0, 0] }]]);
        const arms = gestureAt(t, [[sc.start, 'rest'], [sc.start + 0.5, 'open'], [st5[0] - 0.1, 'pointL'], [st5[0] + 1.6, 'thumb'], [st5[1] - 0.1, 'pointR'], [st5[1] + 1.6, 'thumb'], [st5[2] - 0.1, 'pointL'], [st5[2] + 2.6, 'thumb'], [st5[3] - 0.1, 'open'], [st5[4] - 0.1, 'pointR'], [tSlogan, 'thumbs']]);
        return { ...st, armL: arms[0], armR: arms[1] };
      },
    });
  }

  // ===================================================================== 5
  {
    const sc = S(5), bg = g(bgLayer), art = g(artLayer);
    chip(5, 'Que faire ?', sc);
    bgRect(bg, [[0, '#d9eef8'], [1, '#f5fbfe']]);
    blob(bg, 540, 1360, 420, '#cfe7f3', 0.8);
    const hcW = g(art); A.healthCentre(hcW);
    const path = el('path', { d: 'M120,880 C260,880 420,860 540,840', fill: 'none', stroke: A.P.green, 'stroke-width': 12, 'stroke-linecap': 'round', 'stroke-dasharray': '4 26' }, art);
    const tR = W('s5a', 'rendez'), tB = L('s5b').start, tC = L('s5c').start;
    ui.show(ui.box('h1 center', 'Des symptômes ?<br><i>Consultez rapidement.</i>', { x: 40, y: 250, w: 1000, style: { fontSize: '70px' } }), L('s5a').start - 0.1, tR + 0.3, { anim: 'stamp' });
    ui.show(ui.box('', `<div style="background:#e81e27;color:#fff;border-radius:26px;padding:22px 30px 24px;text-align:center;box-shadow:0 18px 40px rgba(120,10,15,.3)"><div style="font:800 30px Nunito;color:#ffd5d5;margin-bottom:6px">En cas de signe de danger :</div><div style="font:900 44px/1.12 Montserrat;text-transform:uppercase">Urgence : rendez-vous immédiatement dans un centre de santé.</div></div>`, { x: 50, y: 250, w: 980, style: { zIndex: 34 } }), tR + 0.3, tB + 0.1, { anim: 'down', kind: 'alert' });
    const grid = [['pills', 'Pas d’automédication', W('s5b', 'automédiquez'), 30, 300], [null, 'Évitez l’aspirine', W('s5b', "l'aspirine"), 377, 300], [null, 'Évitez l’ibuprofène', W('s5b', "l'ibuprofène"), 724, 300], ['drop', 'Risque de saignement', W('s5b', 'saignement'), 377, 590]];
    grid.forEach(([ic, txt, t0, x, y]) => {
      const icon = ic ? ICO[ic] : txt.includes('aspirine') ? ICONS.aspirin : ICONS.ibuprofen;
      const tint = ic === 'drop' ? '#fde8e8' : '#fff1f1';
      ui.show(ui.box('card', `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;width:100%"><div class="ic" style="width:130px;height:130px;background:${tint}"><span style="width:108px;height:108px;display:block">${icon}</span></div><div class="tx" style="font-size:32px;text-align:center">${txt}</div></div>`, { x, y, w: 326, style: { padding: '16px 12px', height: '260px' } }), t0 - 0.15, tC, { anim: 'pop' });
    });
    const glass = g(art);
    el('path', { d: 'M-80,-200 L80,-200 L64,0 L-64,0 Z', fill: '#eef8ff', stroke: '#8fbfe0', 'stroke-width': 6 }, glass);
    const fillClip = `gc${Math.floor(Math.random() * 1e6)}`;
    const cp = el('clipPath', { id: fillClip }, defs); el('path', { d: 'M-77,-196 L77,-196 L61,-3 L-61,-3 Z' }, cp);
    const fillR = el('rect', { x: -90, y: -200, width: 180, height: 200, fill: '#4aa8ee', 'clip-path': `url(#${fillClip})` }, glass);
    ui.show(ui.box('kw', 'Buvez régulièrement de l’eau', { x: 90, y: 280, w: 900, style: { fontSize: '50px', textAlign: 'center', boxSizing: 'border-box', whiteSpace: 'normal' } }), W('s5c', 'buvez') - 0.1, sc.end - 0.1, { anim: 'down' });
    ui.show(ui.box('card', `<div class="ic" style="width:130px;height:130px;flex-basis:130px"><span style="width:110px;height:110px;display:block">${ICONS.staff}</span></div><div class="tx" style="font-size:40px">Suivez les conseils du personnel de santé</div>`, { x: 470, y: 520, w: 570 }), W('s5c', 'suivez') - 0.15, sc.end - 0.1, { anim: 'right' });
    scenes.push({
      ...sc, bg, art,
      update(t) {
        const show = anim(hcW, t, sc.start, tB + 0.2, { x: 540, y: 880, s: 1.05, from: 'up', fi: 0.6 });
        void show;
        const pk = smooth(prog(t, tR, tR + 1.0));
        path.style.display = t > tR && t < tB ? '' : 'none';
        path.setAttribute('stroke-dashoffset', (-t * 60).toFixed(1));
        path.setAttribute('opacity', pk.toFixed(3));
        const fillK = smooth(prog(t, W('s5c', 'buvez') + 0.2, W('s5c', 'buvez') + 1.8));
        anim(glass, t, W('s5c', 'buvez') - 0.1, sc.end + 1, { x: 250, y: 860, s: 1.7, from: 'pop' });
        fillR.setAttribute('y', (-200 * fillK * 0.85).toFixed(1));
        fillR.setAttribute('height', (200 * fillK * 0.85 + 1).toFixed(1));
        const st = exprAt(t, [[sc.start, { smile: 0.6, brow: 0.3, look: [0.4, -0.6] }], [tB, { serious: 0.8, smile: 0.1, look: [0, 0] }], [tC, { smile: 0.8, brow: 0.3, look: [-0.3, -0.5] }]]);
        const arms = gestureAt(t, [[sc.start, 'rest'], [sc.start + 0.4, 'pointR'], [tR, 'openR'], [tB, 'stop'], [W('s5b', "l'aspirine") - 0.2, 'pointL'], [W('s5b', "l'ibuprofène") - 0.2, 'pointR'], [W('s5b', 'saignement') - 0.2, 'stop'], [tC, 'pointL'], [W('s5c', 'suivez') - 0.2, 'pointR'], [W('s5c', 'suivez') + 1.6, 'thumb']]);
        return { ...st, armL: arms[0], armR: arms[1] };
      },
    });
  }

  // ===================================================================== 6
  {
    const sc = S(6), bg = g(bgLayer), art = g(artLayer);
    chip(6, 'Ensemble', { ...sc, end: L('s6c').start - 0.05 });
    bgRect(bg, [[0, '#ffd9a8'], [0.5, '#ffe9cc'], [1, '#fff7ec']]);
    blob(bg, 540, 1360, 420, '#ffe2bd', 0.9);
    const sunW = g(art); const sunA = A.sun(sunW, 0, 0, 80);
    const fam = [
      A.person(g(art), { skin: '#5e3522', top: '#1d3f8f', bottom: '#2f3640' }),
      A.person(g(art), { skin: '#6b3e26', top: '#e8a33a', dress: true, wrap: '#0b7d42' }),
      A.person(g(art), { skin: '#7a4a2e', top: '#e81e27', bottom: '#2b4c7e', s: 0.7 }),
      A.person(g(art), { skin: '#6b3e26', top: '#7a3fa0', dress: true, hair: 'puffs', s: 0.68 }),
    ];
    const famW = fam.map((f) => f.g.parentNode);
    const famPos = [[330, 890, 0.86], [580, 890, 0.82], [810, 890, 0.62], [140, 890, 0.6]];
    const tE = W('s6a', 'gestes'), tP = W('s6a', 'prise'), tS = L('s6b').start, tEnd = L('s6c').start - 0.15;
    ui.show(ui.box('kw', '✓ Bons gestes', { x: 60, y: 270 }), tE - 0.15, tS - 0.1, { anim: 'left' });
    ui.show(ui.box('kw red', '✓ Prise en charge rapide', { x: 360, y: 380 }), tP - 0.15, tS - 0.1, { anim: 'right' });
    ui.show(ui.box('h1 center', 'Ensemble contre<br><em>la dengue !</em>', { x: 40, y: 250, w: 1000, style: { fontSize: '86px' } }), tS - 0.05, tEnd + 0.2, { anim: 'stamp' });
    ui.show(ui.box('lbl', '<span style="background:#0da255;color:#fff;padding:10px 22px;border-radius:14px;display:inline-block">Protégeons notre santé, protégeons notre communauté.</span>', { x: 40, y: 448, w: 1000, style: { fontSize: '36px' } }), tS + 0.6, tEnd + 0.2, { anim: 'up' });
    // end card
    ui.endCard = tEnd;
    ui.logoTarget = { dx: -246, dy: 486, s: 2.74 };
    const card = ui.box('', '', { x: 0, y: 0, w: 1080, h: 1920, style: { background: 'linear-gradient(#ffffff, #f2faf5)', zIndex: 45 } });
    ui.show(card, tEnd, 1e9, { anim: 'fade', fi: 0.5, cue: false });
    const ecgBox = ui.box('', '<svg width="820" height="200" viewBox="-30 -100 820 200"><g id="ecgline"></g></svg>', { x: 130, y: 1100, style: { zIndex: 50 } });
    ui.show(ecgBox, tEnd + 0.6, 1e9, { anim: 'fade', cue: false });
    const drawEcg = A.ecg(ecgBox.querySelector('#ecgline'), 760);
    ui.show(ui.box('h1 center', '<i>Agir vite,</i><br><em>sauver des vies.</em>', { x: 40, y: 1290, w: 1000, style: { fontSize: '92px', zIndex: 50 } }), W('s6c', 'agir') - 0.1, 1e9, { anim: 'up' });
    scenes.push({
      ...sc, end: sc.end + 10, bg, art,
      update(t) {
        anim(sunW, t, sc.start, 1e9, { x: 860, y: 700, from: 'up', fi: 0.8 });
        sunA.update(t);
        fam.forEach((f, i) => {
          const [x, y, s] = famPos[i];
          anim(famW[i], t, sc.start + 0.3 + i * 0.2, 1e9, { x, y, s, from: 'up' });
          f.update(t, { wave: t > tS + i * 0.15 ? 1 : 0, bob: 1, phase: i });
        });
        drawEcg(prog(t, tEnd + 0.7, tEnd + 2.0));
        const st = exprAt(t, [[sc.start, { smile: 0.8, brow: 0.3 }], [tS, { smile: 1, brow: 0.6 }]]);
        const arms = gestureAt(t, [[sc.start, 'rest'], [sc.start + 0.6, 'open'], [tE - 0.2, 'pointL'], [tP - 0.2, 'pointR'], [tS, 'thumbs']]);
        return { ...st, armL: arms[0], armR: arms[1] };
      },
      endT: tEnd,
    });
  }
  return scenes;
}
