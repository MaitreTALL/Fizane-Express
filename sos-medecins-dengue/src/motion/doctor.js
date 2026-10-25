// The presenter: a Burkinabè woman doctor of SOS Médecins, flat 2D, fully rigged
// (lip sync from visemes, blinks, brows, head motion, two gesturing arms).
import { el, g, place, id, linear } from './svg.js';
import { lerp, clamp, noise1, smooth } from '../core.js';

const C = {
  skin: '#7a4a30', skinShade: '#653b25', skinLight: '#8c5838', lip: '#8a4541', lipLow: '#a0574f',
  mouthIn: '#3a1413', teeth: '#fbf8f2', tongue: '#c25a5c', hair: '#1b1310', hairLine: '#33251f',
  coat: '#ffffff', coatShade: '#e3e9ed', coatLine: '#cdd6dc', scrub: '#0da255', scrubShade: '#0a8746',
  steth: '#2c3035', metal: '#c8d1d7', eye: '#fbfaf6', iris: '#4b2a17', pupil: '#160d09', brow: '#1d1411', gold: '#e9b949',
};

// mouth targets per viseme: inner width, opening height, roundness
const VIS = {
  X: [62, 0, 0], M: [58, 0, 0], A: [74, 44, 0.2], E: [88, 20, 0], O: [44, 34, 1], U: [36, 24, 1], F: [70, 7, 0], L: [66, 18, 0.2],
};

// hand drawings at the wrist (0,0), pointing up (-y)
function hand(parent, pose) {
  const h = g(parent);
  const sk = { fill: C.skin }, ln = { fill: 'none', stroke: C.skinShade, 'stroke-width': 4, 'stroke-linecap': 'round' };
  if (pose === 'open') {
    el('path', { d: 'M-46,-10 C-50,-60 -46,-96 -6,-100 C34,-102 50,-70 48,-10 Z', ...sk }, h);
    for (const [x, len] of [[-36, 70], [-12, 86], [12, 82], [34, 64]]) el('rect', { x: x - 11, y: -96 - len + 40, width: 22, height: len, rx: 11, ...sk }, h);
    el('path', { d: 'M-44,-40 C-70,-60 -82,-86 -70,-96 C-60,-104 -46,-86 -36,-66 Z', ...sk }, h);
    el('path', { d: 'M-24,-92 L-24,-74 M0,-98 L0,-78 M24,-94 L24,-76', ...ln }, h);
  } else if (pose === 'point') {
    el('path', { d: 'M-44,-6 C-50,-56 -40,-86 -2,-88 C36,-90 50,-60 46,-6 Z', ...sk }, h);
    el('rect', { x: -26, y: -176, width: 24, height: 104, rx: 12, ...sk }, h);
    for (const x of [6, 26]) el('ellipse', { cx: x, cy: -82, rx: 13, ry: 16, ...sk }, h);
    el('path', { d: 'M-44,-36 C-66,-50 -70,-70 -56,-76 C-44,-80 -36,-66 -28,-56 Z', ...sk }, h);
    el('path', { d: 'M-2,-80 L-2,-62 M16,-74 L16,-60 M34,-70 L32,-58', ...ln }, h);
  } else if (pose === 'thumb') {
    el('path', { d: 'M-44,-6 C-50,-50 -40,-80 -2,-82 C36,-84 50,-56 46,-6 Z', ...sk }, h);
    for (const [y] of [[-70], [-48], [-26]]) el('rect', { x: -6, y: y - 12, width: 56, height: 24, rx: 12, ...sk }, h);
    el('rect', { x: -40, y: -170, width: 28, height: 100, rx: 14, ...sk }, h);
    el('path', { d: 'M12,-58 L44,-58 M12,-36 L44,-36 M12,-14 L40,-14', ...ln }, h);
  } else {
    el('path', { d: 'M-44,-6 C-50,-50 -40,-80 -2,-82 C36,-84 50,-56 46,-6 Z', ...sk }, h);
  }
  return h;
}

export function createDoctor(parent, defs, logoHref) {
  const root = g(parent);
  const body = g(root);
  const coatGrad = linear(defs, [[0, '#ffffff'], [1, '#eef2f4']]);

  // ---------- torso ----------
  el('path', { d: 'M120,1920 L150,1720 C160,1648 220,1606 300,1590 L468,1560 L540,1650 L612,1560 L780,1590 C860,1606 920,1648 930,1720 L960,1920 Z', fill: coatGrad }, body);
  el('path', { d: 'M150,1720 C160,1648 220,1606 300,1590 L330,1586 C260,1640 236,1720 232,1920 L120,1920 Z', fill: C.coatShade }, body);
  el('path', { d: 'M470,1562 L610,1562 L566,1780 L514,1780 Z', fill: C.scrub }, body);
  el('path', { d: 'M494,1558 L586,1558 L540,1646 Z', fill: C.skin }, body);
  el('path', { d: 'M512,1600 L540,1646 L568,1600 Z', fill: C.skinShade, opacity: 0.5 }, body);
  // lapels
  el('path', { d: 'M468,1562 L520,1782 L470,1716 L404,1614 Z', fill: '#f6f8f9', stroke: C.coatLine, 'stroke-width': 4, 'stroke-linejoin': 'round' }, body);
  el('path', { d: 'M612,1562 L560,1782 L610,1716 L676,1614 Z', fill: '#f6f8f9', stroke: C.coatLine, 'stroke-width': 4, 'stroke-linejoin': 'round' }, body);
  el('path', { d: 'M520,1782 L520,1920 M560,1782 L560,1920', stroke: C.coatLine, 'stroke-width': 4 }, body);
  // pocket and pens
  el('rect', { x: 326, y: 1716, width: 118, height: 74, rx: 8, fill: '#f6f8f9', stroke: C.coatLine, 'stroke-width': 4 }, body);
  el('rect', { x: 348, y: 1678, width: 12, height: 52, rx: 5, fill: '#e81e27' }, body);
  el('rect', { x: 368, y: 1686, width: 12, height: 44, rx: 5, fill: '#232021' }, body);
  // badge with the official logo (image used as is)
  el('rect', { x: 668, y: 1688, width: 112, height: 136, rx: 12, fill: '#ffffff', stroke: C.scrub, 'stroke-width': 4 }, body);
  el('image', { href: logoHref, x: 674, y: 1694, width: 100, height: 100 }, body);
  el('rect', { x: 680, y: 1798, width: 88, height: 16, rx: 6, fill: '#e81e27' }, body);
  // stethoscope
  el('path', { d: 'M486,1580 C438,1616 426,1700 468,1776 M594,1580 C646,1612 660,1700 640,1784', fill: 'none', stroke: C.steth, 'stroke-width': 13, 'stroke-linecap': 'round' }, body);
  el('circle', { cx: 640, cy: 1806, r: 28, fill: C.metal, stroke: '#9aa6ae', 'stroke-width': 4 }, body);
  el('circle', { cx: 640, cy: 1806, r: 15, fill: '#5d666d' }, body);
  el('path', { d: 'M468,1776 L452,1812 M468,1776 L486,1812', stroke: C.metal, 'stroke-width': 8, 'stroke-linecap': 'round' }, body);
  for (const x of [452, 486]) el('circle', { cx: x, cy: 1814, r: 8, fill: C.steth }, body);

  // ---------- neck + head ----------
  const neck = g(body);
  el('path', { d: 'M494,1480 L494,1600 Q540,1626 586,1600 L586,1480 Z', fill: C.skin }, neck);
  el('path', { d: 'M494,1490 Q540,1560 586,1490 L586,1540 Q540,1590 494,1540 Z', fill: C.skinShade }, neck);

  const head = g(body);
  // bun and back hair
  el('circle', { cx: 540, cy: 1066, r: 82, fill: C.hair }, head);
  el('path', { d: 'M486,1040 C510,1020 570,1020 594,1044 M478,1076 C512,1056 572,1058 602,1080', fill: 'none', stroke: C.hairLine, 'stroke-width': 5, 'stroke-linecap': 'round' }, head);
  el('ellipse', { cx: 540, cy: 1136, rx: 56, ry: 15, fill: C.scrub }, head);
  el('path', { d: 'M376,1330 C360,1196 430,1102 540,1098 C650,1102 720,1196 704,1330 Z', fill: C.hair }, head);
  // ears + earrings
  for (const x of [384, 696]) {
    el('ellipse', { cx: x, cy: 1340, rx: 25, ry: 40, fill: C.skin }, head);
    el('ellipse', { cx: x, cy: 1340, rx: 12, ry: 22, fill: C.skinShade }, head);
    el('circle', { cx: x, cy: 1382, r: 8, fill: C.gold }, head);
  }
  // face
  el('path', { d: 'M540,1150 C634,1150 694,1212 696,1316 C698,1404 664,1470 610,1508 C586,1524 562,1532 540,1532 C518,1532 494,1524 470,1508 C416,1470 382,1404 384,1316 C386,1212 446,1150 540,1150 Z', fill: C.skin }, head);
  el('path', { d: 'M650,1190 C688,1230 700,1290 696,1340 C692,1420 660,1476 610,1508 C640,1460 660,1400 662,1330 C664,1270 660,1226 650,1190 Z', fill: C.skinShade, opacity: 0.55 }, head);
  // hairline (pulled back, side part)
  el('path', { d: 'M380,1300 C372,1200 436,1112 540,1108 C644,1112 708,1200 700,1300 C694,1262 684,1236 668,1218 C640,1188 602,1176 556,1184 C520,1176 470,1186 430,1214 C404,1236 388,1264 380,1300 Z', fill: C.hair }, head);
  el('path', { d: 'M600,1180 C630,1150 664,1150 686,1186 M560,1182 C520,1140 460,1142 424,1188', fill: 'none', stroke: C.hairLine, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.8 }, head);

  const face = g(head);    // features shift a little when the head turns
  // cheeks
  for (const x of [450, 630]) el('ellipse', { cx: x, cy: 1412, rx: 36, ry: 20, fill: '#b5574a', opacity: 0.16 }, face);
  // eyes
  const eyes = [];
  for (const [cx, s] of [[478, -1], [602, 1]]) {
    const eg = g(face);
    const clip = id('ec');
    const cp = el('clipPath', { id: clip }, defs);
    const shape = 'M-44,2 C-28,-28 26,-30 46,-4 C28,20 -26,22 -44,2 Z';
    el('path', { d: shape, transform: `translate(${cx} 1330) scale(${s} 1)` }, cp);
    const inner = g(eg, { 'clip-path': `url(#${clip})` });
    el('rect', { x: cx - 50, y: 1296, width: 100, height: 66, fill: C.eye }, inner);
    const iris = g(inner);
    el('circle', { cx, cy: 1330, r: 21, fill: C.iris }, iris);
    el('circle', { cx, cy: 1330, r: 10, fill: C.pupil }, iris);
    el('circle', { cx: cx - 7, cy: 1322, r: 6, fill: '#ffffff' }, iris);
    el('circle', { cx: cx + 6, cy: 1336, r: 2.5, fill: '#ffffff', opacity: 0.8 }, iris);
    const lid = el('path', { d: 'M-46,3 C-28,-30 26,-32 48,-4 L58,-14', fill: 'none', stroke: '#1a100c', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: `translate(${cx} 1330) scale(${s} 1)` }, eg);
    el('path', { d: 'M-34,-26 C-14,-40 18,-40 38,-24', fill: 'none', stroke: C.skinShade, 'stroke-width': 4, 'stroke-linecap': 'round', transform: `translate(${cx} 1330) scale(${s} 1)` }, eg);
    // closed-eye line
    const shut = el('path', { d: 'M-44,4 C-22,18 22,18 46,0 L56,-8', fill: 'none', stroke: '#1a100c', 'stroke-width': 7, 'stroke-linecap': 'round', transform: `translate(${cx} 1330) scale(${s} 1)` }, face);
    shut.style.display = 'none';
    const brow = el('path', { d: 'M-42,6 C-22,-10 22,-14 50,6', fill: 'none', stroke: C.brow, 'stroke-width': 11, 'stroke-linecap': 'round' }, face);
    eyes.push({ eg, iris, lid, shut, brow, cx, s });
  }
  // nose
  el('path', { d: 'M530,1356 C526,1384 516,1398 522,1408 C530,1418 550,1418 558,1408 C564,1398 554,1384 550,1356', fill: C.skinShade, opacity: 0.55 }, face);
  for (const x of [526, 554]) el('ellipse', { cx: x, cy: 1406, rx: 7, ry: 4, fill: '#46271a' }, face);
  // mouth (parametric)
  const mouth = g(face);
  const mClip = id('mc');
  const mcp = el('clipPath', { id: mClip }, defs);
  const mClipPath = el('path', { d: '' }, mcp);
  const mIn = el('path', { d: '', fill: C.mouthIn }, mouth);
  const mInner = g(mouth, { 'clip-path': `url(#${mClip})` });
  const teeth = el('rect', { x: 490, y: 1420, width: 100, height: 16, rx: 5, fill: C.teeth }, mInner);
  const tongue = el('ellipse', { cx: 540, cy: 1480, rx: 30, ry: 16, fill: C.tongue }, mInner);
  const upperLip = el('path', { d: '', fill: 'none', stroke: C.lip, 'stroke-width': 11, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, mouth);
  const lowerLip = el('path', { d: '', fill: 'none', stroke: C.lipLow, 'stroke-width': 14, 'stroke-linecap': 'round' }, mouth);

  // ---------- arms (in front, rising from below the frame) ----------
  const arms = [];
  function makeArm(side) {
    const pivot = g(root);
    const fore = g(pivot);
    // sleeve from the elbow (0,0) up to the wrist (0,-400)
    el('path', { d: 'M-54,20 C-56,0 56,0 54,20 L70,720 L-70,720 Z', fill: coatGrad, stroke: C.coatLine, 'stroke-width': 3 }, fore);
    el('rect', { x: -56, y: -6, width: 112, height: 34, rx: 14, fill: C.scrub }, fore);
    const wrist = g(fore);
    const poses = {};
    for (const p of ['open', 'point', 'thumb', 'fist']) { poses[p] = hand(wrist, p); poses[p].style.display = 'none'; }
    const a = { pivot, fore, wrist, poses, side };
    arms.push(a);
    return a;
  }
  makeArm(-1); makeArm(1);

  // ---------- state -> pose ----------
  const MX = 540, MY = 1452;
  function setMouth(w, h, round, smile) {
    const c = -smile * 9 - (h < 1 ? smile * 3 : 0);
    const hw = w / 2;
    const top = -h * 0.42 - 1, bot = h * 0.9 + 2;
    const rx = round * hw * 0.25;
    const d = `M${MX - hw},${MY + c} C${MX - hw * 0.55 + rx},${MY + top} ${MX + hw * 0.55 - rx},${MY + top} ${MX + hw},${MY + c} C${MX + hw * 0.55 - rx},${MY + bot} ${MX - hw * 0.55 + rx},${MY + bot} ${MX - hw},${MY + c} Z`;
    mIn.setAttribute('d', d);
    mClipPath.setAttribute('d', d);
    mIn.style.display = h < 1 ? 'none' : '';
    upperLip.setAttribute('d', `M${MX - hw},${MY + c} C${MX - hw * 0.55 + rx},${MY + top - 4} ${MX - 10},${MY + top - 8} ${MX},${MY + top - 3} C${MX + 10},${MY + top - 8} ${MX + hw * 0.55 - rx},${MY + top - 4} ${MX + hw},${MY + c}`);
    lowerLip.setAttribute('d', `M${MX - hw * 0.86},${MY + c * 0.6 + 3} C${MX - hw * 0.5 + rx},${MY + bot + 5} ${MX + hw * 0.5 - rx},${MY + bot + 5} ${MX + hw * 0.86},${MY + c * 0.6 + 3}`);
    teeth.setAttribute('y', MY + top - 2);
    teeth.style.display = h > 6 ? '' : 'none';
    tongue.setAttribute('cy', MY + bot + 4);
  }

  const VORDER = 'XMAEOUFL';
  let visData = null;
  function mouthTarget(t) {
    if (!visData) return VIS.X;
    const f = Math.round(t * visData.fps);
    const ch = visData.vis[f] || 'X';
    const amp = visData.amp[f] || 0;
    const [w, h, r] = VIS[ch];
    return [w, h * (0.45 + 0.8 * amp), r];
  }

  function update(st) {
    const t = st.t;
    place(root, { x: st.x || 0, y: st.y ?? 50 });
    // lip sync with a little smoothing over the previous frames
    const dt = visData ? 1 / visData.fps : 1 / 30;
    const a = mouthTarget(t), b = mouthTarget(t - dt), c = mouthTarget(t - 2 * dt);
    const m = [0, 1, 2].map((i) => a[i] * 0.55 + b[i] * 0.3 + c[i] * 0.15);
    const talking = st.talk ?? 1;
    setMouth(lerp(VIS.X[0] + (st.smile || 0) * 10, m[0], talking), m[1] * talking, m[2] * talking, st.smile ?? 0.5);

    // head motion
    const sway = noise1(t * 0.6, 1) * 1.2 + (st.tilt || 0);
    const nod = noise1(t * 1.1, 2) * 3 + (st.nod || 0);
    const turn = clamp((st.turn || 0) + noise1(t * 0.4, 3) * 0.15, -1, 1);
    place(head, { x: turn * 6, y: nod, r: sway, ox: 540, oy: 1520 });
    place(face, { x: turn * 14 });
    const breathe = Math.sin(t * 2.0) * 0.006;
    place(body, { sy: 1 + breathe, sx: 1 - breathe * 0.4, ox: 540, oy: 1920, y: st.bodyY || 0 });

    // eyes: blink every ~3.6 s, look direction, brows
    const ph = (t + 1.3) % 3.6;
    const blink = Math.max(ph < 0.14 ? 1 : 0, st.blink || 0);
    const look = st.look || [0, 0];
    for (const e of eyes) {
      e.eg.style.display = blink ? 'none' : '';
      e.shut.style.display = blink ? '' : 'none';
      place(e.iris, { x: look[0] * 12, y: look[1] * 7 });
      const raise = (st.brow || 0) * -12 + (st.serious || 0) * 6;
      const worry = (st.worry || 0) * 10 - (st.serious || 0) * 8;
      e.brow.setAttribute('transform', `translate(${e.cx} ${1266 + raise}) scale(${e.s} 1) rotate(${worry})`);
    }

    // arms: pose name, height (0 hidden .. 1 up), angle (deg from vertical, + outward)
    // arms: wrist target (x, y) blended with a hidden rest position by 'up'; r tilts the forearm
    arms.forEach((arm, i) => {
      const s = (i === 0 ? st.armL : st.armR) || { up: 0 };
      const up = smooth(clamp(s.up ?? 0));
      const rx = 540 + arm.side * 330, ry = 2280;
      const x = lerp(rx, s.x ?? (540 + arm.side * 250), up), y = lerp(ry, s.y ?? 1640, up);
      const r = (s.r ?? -arm.side * 14) + (s.wave ? Math.sin(t * 9) * 7 : 0);
      place(arm.pivot, { x, y: y + Math.sin(t * 1.7 + i) * 4, r });
      for (const [k, node] of Object.entries(arm.poses)) node.style.display = k === (s.pose || 'open') ? '' : 'none';
      place(arm.wrist, { r: (s.wrist || 0) * arm.side, sx: arm.side, sy: 1 });
    });
  }

  return { root, update, setVisemes(v) { visData = v; }, head };
}
