// The six scenes of "SOS Médecins Burkina Faso — Ensemble contre la dengue !",
// choreographed on the narration timeline (src/timeline.json).
import * as THREE from 'three';
import { createMascot, POSES, blendPose } from './mascot.js';
import { PPOSE } from './people.js';
import { createMosquito } from './mosquito.js';
import * as SETS from './sets.js';
import { ICONS, SWOOSH_TOP, SWOOSH_BOTTOM } from './icons.js';
import { clamp, lerp, smooth, easeInOut, keys, noise1, prog } from './core.js';

const P = POSES;

// [[time, pose], ...] -> blended pose (0.35 s blends into each new key)
function poseTrack(t, track, blend = 0.35) {
  let i = 0;
  while (i + 1 < track.length && t >= track[i + 1][0]) i++;
  const cur = typeof track[i][1] === 'string' ? P[track[i][1]] : track[i][1];
  if (i === 0) return cur;
  const prev = typeof track[i - 1][1] === 'string' ? P[track[i - 1][1]] : track[i - 1][1];
  return blendPose(prev, cur, smooth((t - track[i][0]) / blend));
}

// [[time, {expr}], ...] -> blended numeric expression fields
function exprTrack(t, track, blend = 0.4) {
  const fields = ['happy', 'worry', 'serious', 'brow', 'flush', 'sweat', 'smileOpen'];
  let i = 0;
  while (i + 1 < track.length && t >= track[i + 1][0]) i++;
  const cur = track[i][1], prev = i ? track[i - 1][1] : cur;
  const k = i ? smooth((t - track[i][0]) / blend) : 1;
  const out = {};
  for (const f of fields) out[f] = lerp(prev[f] || 0, cur[f] || 0, k);
  return out;
}

// camera keyframes [[t, [pos], [target], fov?], ...] with a little handheld drift
function camTrack(cam, t, track, drift = 0.015) {
  let i = 0;
  while (i + 1 < track.length && t >= track[i + 1][0]) i++;
  const a = track[i], b = track[Math.min(i + 1, track.length - 1)];
  const k = b === a ? 0 : easeInOut((t - a[0]) / (b[0] - a[0]));
  const cut = b[4] === 'cut';
  const kk = cut ? 0 : k;
  const pos = a[1].map((v, j) => lerp(v, b[1][j], kk));
  const tgt = a[2].map((v, j) => lerp(v, b[2][j], kk));
  cam.position.set(pos[0] + noise1(t * 0.5, 1) * drift, pos[1] + noise1(t * 0.6, 2) * drift, pos[2]);
  cam.lookAt(tgt[0], tgt[1], tgt[2]);
  const fov = a[3] ? lerp(a[3], b[3] || a[3], kk) : cam.fov;
  if (fov !== cam.fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
}

const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

function updateSky(scene, stopsA, stopsB, k) {
  const tex = scene.background;
  const c = tex.image, g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  stopsA.forEach(([o, col], j) => grad.addColorStop(o, '#' + new THREE.Color(col).lerp(new THREE.Color(stopsB[j][1]), k).getHexString()));
  g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
  tex.needsUpdate = true;
}

export function buildScenes(ctx) {
  const { tl, ui, pipe } = ctx;
  const L = (id) => tl.L(id), Wd = (id, w, n) => tl.W(id, w, n);
  const sc = (n) => tl.scene(n);
  const mouth = (t) => tl.mouth(t);
  const mascot = createMascot(ctx.logo);
  const out = [];

  const street = SETS.buildStreet(ctx);
  const yard = SETS.buildConcession(ctx);
  const health = SETS.buildHealth(ctx);
  const skin = SETS.buildSkin(ctx);
  const symp = SETS.buildSymptoms(ctx);

  for (const s of ctx.tl.scenes.slice(1)) ui.wipe(s.start);

  // =====================================================================
  // SCENE 1 — hook: rain, stagnant water, mosquitoes; the doctor speaks
  // =====================================================================
  {
    const S = sc(1), cam = SETS.camera(30);
    const tB = L('s1b').start + 0.25, tC = L('s1c').start;
    const mPos = new THREE.Vector3(0.3, 0, 2.3);
    ui.show(ui.banner('Dengue :', { color: 'red', y: 1120, size: 112, tilt: -3 }), 0.25, S.end - 0.15, { anim: 'stamp', fi: 0.4 });
    ui.show(ui.banner('Restons vigilants !', { color: 'green', y: 1268, size: 80, tilt: -3 }), 0.55, S.end - 0.15, { anim: 'left', fi: 0.5 });
    const ring = ui.ring({ x: 610, y: 610, d: 420 });
    ui.show(ring, Wd('s1b', 'stagnantes') - 0.1, S.end - 0.15, { anim: 'pop' });
    pipe.addInset({ el: ring, shape: 'circle', size: [420, 420], scene: skin.scene, camera: skin.cam, update: (t) => skinShot(t, 'rest') });
    out.push({
      start: S.start, end: S.end, scene: street.scene, camera: cam, dof: { focus: 4, aperture: 16 },
      enter() { street.scene.add(mascot.root); },
      update(t) {
        const clear = smooth(prog(t, 6.5, 10.5));
        street.rain.update(t, 1 - smooth(prog(t, 5.5, 9.5)));
        street.lights.sun.intensity = lerp(0.5, 2.7, clear);
        street.lights.hemi.intensity = lerp(1.6, 1.15, clear);
        street.lights.sun.color.set('#ffe2bd');
        updateSky(street.scene, SETS.SKY.rain, SETS.SKY.sunny, clear);
        street.groundMat.roughness = lerp(0.45, 0.75, clear);
        street.rips.forEach((r, i) => r.update(t + i * 0.3, 1 - clear * 0.8));
        flyMosquitoes(street.mqs, t, [[-1.6, 0.4, 1.4], [0.4, 0.6, 1.7], [1.6, 0.4, 0.9], [-0.6, 0.4, 0.2], [-2.4, 0.4, 0.6], [0.8, 0.3, 3.2], [-0.2, 0.7, 1.0]]);
        camTrack(cam, t, [
          [0, [1.4, 1.85, 11.6], [0.8, 1.1, 2.3], 30],
          [tB - 0.01, [1.3, 1.8, 10.4], [0.8, 1.1, 2.3], 30],
          [tB, [-2.6, 2.6, 6.0], [-1.3, 0.05, 0.9], 34, 'cut'],
          [tC - 0.01, [0.6, 2.5, 6.2], [0.1, 0.05, 1.0], 34],
          [tC, [1.3, 1.8, 10.0], [0.8, 1.1, 2.3], 30, 'cut'],
          [S.end, [1.2, 1.75, 9.2], [0.8, 1.1, 2.3], 30],
        ]);
        const inB = t >= tB && t < tC;
        this.dof = inB ? { focus: 5.6, aperture: 14 } : { focus: cam.position.distanceTo(mPos), aperture: 16 };
        mascot.root.position.copy(mPos);
        mascot.update({
          t, mouth: mouth(t), scale: inB ? 0 : 1, turn: yawTo(mPos, cam.position) * 0.85,
          ...exprTrack(t, [[0, { serious: 0.6 }], [L('s1a').start + 1.5, { serious: 0.3, brow: 0.2 }], [tC, { happy: 1, brow: 0.3 }]]),
          right: poseTrack(t, [[0, 'rest'], [1.3, 'explain'], [3.3, 'rest'], [tC, 'point'], [Wd('s1c', 'agir'), 'thumb']]),
          left: poseTrack(t, [[0, 'rest'], [2.0, 'present'], [3.6, 'rest'], [Wd('s1c', 'agir'), 'thumb']]),
        });
      },
    });
  }

  // inset: mosquito on skin. mode 'rest' (scene 1) or 'bite' (scene 2, bite at tBite)
  let tBite = 0;
  function skinShot(t, mode) {
    const c = skin.cam;
    c.position.set(1.05, 1.75, 2.1); c.lookAt(0.15, 0.6, -0.15);
    const land = mode === 'bite' ? smooth(prog(t, tBite - 1.0, tBite)) : 1;
    const fed = mode === 'bite' ? smooth(prog(t, tBite + 0.2, tBite + 2.2)) : 0;
    skin.mq.root.position.set(lerp(1.4, 0.2, land), lerp(1.7, 0.78, land) + (1 - land) * Math.sin(t * 6) * 0.08, lerp(0.7, -0.25, land));
    skin.mq.root.rotation.set(0.3 * land, -0.6, 0);
    skin.mq.update(t, { flap: 1 - land, rest: land > 0.98 ? 1 : 0, fed });
    skin.bite.material.opacity = mode === 'bite' ? 0.55 * fed : 0;
    skin.virus.visible = mode === 'bite' && fed > 0.05;
    skin.virus.children.forEach((v, i) => {
      const a = i * 1.26 + t * 0.6;
      v.position.set(0.0 + Math.cos(a) * (0.22 + fed * 0.22), 0.6 + Math.sin(t * 2 + i) * 0.05, 0.12 + Math.sin(a) * (0.22 + fed * 0.18));
      v.scale.setScalar(fed * (0.8 + 0.2 * Math.sin(t * 5 + i)));
      v.rotation.set(t + i, t * 0.7, 0);
    });
  }

  function flyMosquitoes(list, t, anchors) {
    list.forEach((m, i) => {
      const [x, y, z] = anchors[i % anchors.length];
      const p = t * 0.9 + i * 2.1;
      m.root.position.set(x + noise1(p, i) * 0.45, y + 0.25 + noise1(p * 1.3, i + 9) * 0.22, z + noise1(p * 0.8, i + 17) * 0.4);
      m.root.rotation.set(0.15, p * 0.8 + i, noise1(p, i + 3) * 0.3);
      m.update(t + i * 0.013, { flap: 1 });
    });
  }

  // =====================================================================
  // SCENE 2 — understanding dengue: the Aedes mosquito and the bite
  // =====================================================================
  {
    const S = sc(2), cam = SETS.camera(24);
    const mPos = new THREE.Vector3(-0.9, 0, 5.4);
    tBite = Wd('s2a', 'piqûre') + 0.6;
    const bigMq = createMosquito(); // shown big in the yard
    ui.show(ui.box('label', 'Moustique Aedes', { x: 60, y: 262, tilt: -4, style: { fontSize: '54px' } }), Wd('s2a', 'genre') - 0.2, S.end - 0.15, { anim: 'pop' });
    ui.show(ui.box('callout', 'Pattes rayées de blanc', { x: 590, y: 268, tilt: 3, style: { fontSize: '38px' } }), Wd('s2a', 'genre') + 0.5, S.end - 0.15, { anim: 'pop' });
    ui.show(ui.box('tag yellow', `<span style="display:inline-flex;align-items:center;gap:12px"><span style="width:58px;height:58px;display:inline-block">${ICONS.sun}</span>Il pique aussi le jour</span>`, { x: 60, y: 380, tilt: -2 }), L('s2b').start, S.end - 0.15, { anim: 'left' });
    const ring = ui.ring({ x: 590, y: 760, d: 430 });
    ui.show(ring, Wd('s2a', 'piqûre') - 0.2, S.end - 0.15, { anim: 'pop' });
    ui.show(ui.box('', `<svg width="150" height="120" viewBox="0 0 150 120"><path d="M10 20 L95 75 L84 40 L140 104 L72 84 L102 74 Z" fill="#e81e27" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></svg>`, { x: 570, y: 760, style: { zIndex: 26 } }), tBite - 0.6, S.end - 0.15, { anim: 'pop' });
    pipe.addInset({ el: ring, shape: 'circle', size: [430, 430], scene: skin.scene, camera: skin.cam, update: (t) => skinShot(t, 'bite') });
    ui.show(ui.banner('La dengue se transmet<br>par la piqûre d’un moustique infecté.', { color: 'green', y: 1290, size: 52, tilt: -2, cls: 'lower' }), Wd('s2a', 'transmise'), S.end - 0.15, { anim: 'up' });
    out.push({
      start: S.start, end: S.end, scene: yard.scene, camera: cam, dof: { focus: 11, aperture: 22 },
      enter() { yard.scene.add(mascot.root); yard.scene.add(bigMq.root); },
      update(t) {
        resetYard(t, 'messy');
        yard.lights.sun.color.set('#ffe0b5');
        camTrack(cam, t, [[S.start, [-0.3, 2.0, 16.6], [-0.31, 1.75, 5.4], 24], [S.end, [-0.3, 2.0, 15.6], [-0.31, 1.75, 5.4], 24]], 0.02);
        this.dof = { focus: cam.position.distanceTo(mPos), aperture: 22 };
        bigMq.root.visible = true;
        bigMq.root.position.set(-0.05 + Math.sin(t * 0.8) * 0.06, 2.95 + Math.sin(t * 1.7) * 0.05, 5.4);
        bigMq.root.scale.setScalar(1.25);
        bigMq.root.rotation.set(0.35, -0.9 + Math.sin(t * 0.5) * 0.35, 0.1);
        bigMq.update(t, { flap: 0.35 });
        mascot.root.position.copy(mPos);
        mascot.update({
          t, mouth: mouth(t), turn: yawTo(mPos, cam.position) * 0.7 + 0.15, stick: true, look: [0.15, 0.25], headTurn: 0.12,
          ...exprTrack(t, [[S.start, { brow: 0.3 }], [L('s2b').start, { happy: 0.6, brow: 0.3 }]]),
          left: poseTrack(t, [[S.start, 'rest'], [S.start + 0.4, 'pointUp']]),
          right: poseTrack(t, [[S.start, 'rest'], [Wd('s2a', 'piqûre'), 'explain'], [L('s2b').start, 'present']]),
        });
      },
      exit() { bigMq.root.visible = false; },
    });
  }

  // =====================================================================
  // SCENE 3 — symptoms (cards with live vignettes) and danger signs
  // =====================================================================
  {
    const S = sc(3), cam = SETS.camera(30);
    const t3b = L('s3b').start - 0.1, t3c = L('s3c').start;
    const mPos = new THREE.Vector3(0.4, 0, 1.8);
    ui.show(ui.banner('Les symptômes<br>de la dengue', { color: 'red', y: 238, size: 66, tilt: -2 }), L('s3a').start - 0.1, t3b, { anim: 'stamp' });
    const cards = [
      ['Forte fièvre', 50, 440, Wd('s3a', 'forte') - 0.15, 'fever'],
      ['Maux de tête et douleurs derrière les yeux', 555, 440, Wd('s3a', 'maux') - 0.15, 'head'],
      ['Douleurs musculaires et articulaires', 50, 790, Wd('s3a', 'douleurs', 1) - 0.15, 'joint'],
      ['Nausées ou vomissements', 555, 790, Wd('s3a', 'nausées') - 0.15, 'nausea'],
      ['Parfois, éruptions cutanées', 50, 1140, Wd('s3a', 'parfois') - 0.15, 'rash'],
    ];
    cards.forEach(([cap, x, y, t0, key], i) => {
      const el = ui.card({ x, y, w: 475, h: 330, caption: cap, capColor: 'red', capSize: 31 });
      ui.show(el, t0, t3b + i * 0.05, { anim: i % 2 ? 'right' : 'left', fi: 0.5, fo: 0.35 });
      const c = SETS.camera(30);
      const v = symp.set[key];
      pipe.addInset({ el, size: [480, 332], scene: symp.scene, camera: c, update: (t) => { c.position.set(...v.cam); c.lookAt(...v.look); symptomPoses(t); } });
    });
    ui.show(ui.el('vignette'), t3b, S.end - 0.1, { anim: 'fade', fi: 0.6, cue: false });
    ui.show(ui.banner('Signes de danger', { color: 'yellow', y: 300, size: 80, tilt: -2 }), t3b, S.end - 0.15, { anim: 'stamp', kind: 'alert' });
    const dangers = [['abdo', 'Douleurs abdominales intenses', 'abdominales'], ['vomit', 'Vomissements persistants', 'vomissements'], ['bleed', 'Saignements', 'saignements'], ['weak', 'Grande faiblesse', 'faiblesse'], ['breath', 'Difficultés respiratoires', 'difficultés']];
    dangers.forEach(([ic, txt, w], i) => {
      ui.show(ui.box('row', `<div class="ic">${ICONS[ic]}</div><div class="tx">${txt}</div>`, { x: 60, y: 470 + i * 146, w: 760, h: 124 }), Wd('s3b', w) - 0.25, S.end - 0.15, { anim: 'left', kind: 'alert' });
    });
    ui.show(ui.banner('Il faut consulter en urgence !', { color: 'red', y: 1236, size: 62, tilt: -3 }), t3c, S.end - 0.15, { anim: 'stamp', kind: 'alert' });
    out.push({
      start: S.start, end: S.end, scene: street.scene, camera: cam, dof: { focus: 11, aperture: 20 },
      enter() { street.scene.add(mascot.root); },
      update(t) {
        street.rain.update(t, 0);
        street.lights.sun.intensity = 2.7; street.lights.hemi.intensity = 1.15;
        updateSky(street.scene, SETS.SKY.rain, SETS.SKY.sunny, 1);
        street.groundMat.roughness = 0.8;
        street.rips.forEach((r) => r.update(t, 0));
        flyMosquitoes(street.mqs, t, [[-1.6, -9, 1.4]]);
        const danger = smooth(prog(t, t3b, t3b + 0.6));
        street.lights.sun.color.set(new THREE.Color('#ffe2bd').lerp(new THREE.Color('#ff9a8a'), danger * 0.5));
        camTrack(cam, t, [[S.start, [-0.45, 1.9, 12.6], [-0.45, 2.95, 1.8], 30], [S.end, [-0.4, 1.9, 12.0], [-0.4, 2.95, 1.8], 30]], 0.01);
        this.dof = { focus: cam.position.distanceTo(mPos), aperture: 20 };
        mascot.root.position.copy(mPos);
        const ws = ['forte', 'maux', 'musculaires', 'nausées', 'éruptions'].map((w) => Wd('s3a', w));
        mascot.update({
          t, mouth: mouth(t), turn: yawTo(mPos, cam.position) - 0.25, headTurn: -0.2, look: t < t3b ? [-0.5, 0.3] : [0, 0],
          ...exprTrack(t, [[S.start, { worry: 0.3 }], [ws[0], { worry: 0.7, flush: 1, sweat: 1 }], [ws[1], { worry: 0.9 }], [ws[3], { worry: 0.6, serious: 0.2 }], [t3b, { worry: 0.9, serious: 0.3 }], [t3c, { serious: 1 }]]),
          right: poseTrack(t, [[S.start, 'rest'], [ws[0] - 0.2, 'point'], [ws[1], 'head'], [ws[2], 'chest'], [ws[3], 'belly'], [ws[4], 'point'], [t3b, 'stop'], [t3c, 'point']]),
          left: poseTrack(t, [[S.start, 'rest'], [ws[1], 'head'], [ws[2], 'rest'], [t3b, 'rest']]),
        });
      },
    });
  }

  function symptomPoses(t) {
    const s = symp.set;
    s.fever.person.update({ t, lids: 0.7, mouth: 'frown', pain: 0.5, left: PPOSE.lying, right: 'forehead' });
    s.head.person.update({ t, lids: 0.85, mouth: 'frown', pain: 1, painFx: 1, left: 'temple', right: 'temple', nod: 0.08 + Math.sin(t * 3) * 0.03 });
    s.joint.person.update({ t, lids: 0.5, mouth: 'frown', pain: 0.9, right: 'oppShoulder', left: PPOSE.rest, tilt: 0.18, headTurn: 0.3 });
    s.nausea.person.update({ t, lids: 0.55, mouth: 'frown', pain: 0.6, right: 'mouth', left: 'belly', lean: 0.1 });
  }

  // =====================================================================
  // SCENE 4 — prevention in the family concession, 5 steps
  // =====================================================================
  const T4 = {};
  {
    const S = sc(4), cam = SETS.camera(30);
    const st = ['s4b', 's4c', 's4d', 's4e', 's4f'].map((id) => L(id).start - 0.1);
    T4.st = st;
    const mPos = new THREE.Vector3(1.0, 0, -0.2);
    ui.show(ui.banner('Les bons réflexes<br>pour prévenir la dengue', { color: 'green', y: 236, size: 60, tilt: -2 }), L('s4a').start - 0.1, st[4], { anim: 'stamp' });
    const steps = [
      ['Vider régulièrement les récipients où l’eau stagne.', 40, 905, [2.9, 1.15, 2.9], [1.75, 0.35, 1.05]],
      ['Couvrir hermétiquement les réserves d’eau.', 550, 905, [5.6, 2.0, 2.6], [4.3, 0.75, -0.2]],
      ['Nettoyer les récipients et éliminer les objets inutiles pouvant retenir l’eau.', 40, 1220, [1.6, 1.9, 5.6], [-0.4, 0.7, 2.8]],
      ['Utiliser des moustiquaires, des vêtements couvrants et des répulsifs adaptés.', 550, 1220, [-2.4, 2.1, 2.8], [-5.2, 1.0, -1.2]],
    ];
    steps.forEach(([cap, x, y, cp, cl], i) => {
      const el = ui.card({ x, y, w: 490, h: 300, caption: cap, num: i + 1, capSize: 29 });
      ui.show(el, st[i], st[4], { anim: 'pop', fo: 0.3 });
      const c = SETS.camera(34);
      pipe.addInset({ el, size: [490, 300], scene: yard.scene, camera: c, update: (t) => { c.position.set(...cp); c.lookAt(...cl); } });
      ui.show(ui.box('', ICONS.check, { x: x + 400, y: y - 22, w: 84, h: 84, style: { zIndex: 24 } }), st[i] + 1.6, st[4], { anim: 'pop' });
    });
    ui.show(ui.box('step5', `<div class="card3d" style="position:relative;left:0;top:0;width:960px;opacity:1;visibility:visible"><div class="frame" style="background:#fff"></div>
      <div class="num" style="left:-14px;top:-14px">5</div>
      <div style="position:relative;padding:22px 28px 24px 92px;font:600 38px/1.15 Oswald;color:#232021">Entretenir les abords de la maison et supprimer les gîtes de reproduction des moustiques.</div></div>`, { x: 60, y: 262, w: 960, style: { zIndex: 22 } }), st[4] + 0.1, S.end - 0.15, { anim: 'up' });
    ui.show(ui.banner('Moins d’eau stagnante,', { color: 'red', y: 1130, size: 76, tilt: -3 }), Wd('s4f', 'supprimer') - 0.2, S.end - 0.15, { anim: 'stamp' });
    ui.show(ui.banner('moins de moustiques !', { color: 'green', y: 1262, size: 76, tilt: -3 }), Wd('s4f', 'supprimer') + 0.25, S.end - 0.15, { anim: 'left' });
    const sweepPos = new THREE.Vector3(2.6, 0, 3.6);
    out.push({
      start: S.start, end: S.end, scene: yard.scene, camera: cam, dof: { focus: 14, aperture: 14 },
      enter() { yard.scene.add(mascot.root); },
      update(t) {
        resetYard(t, 'steps');
        const sweeping = t >= st[4];
        camTrack(cam, t, sweeping
          ? [[st[4], [4.4, 2.3, 16.0], [2.6, 0.75, 3.6], 30], [S.end, [4.2, 2.25, 15.0], [2.6, 0.75, 3.6], 30]]
          : [[S.start, [1.0, 2.6, 15.2], [1.0, 0.45, -0.2], 30], [st[4], [1.0, 2.5, 14.2], [1.0, 0.45, -0.2], 30]], 0.012);
        const p = sweeping ? sweepPos : mPos;
        this.dof = { focus: cam.position.distanceTo(p), aperture: sweeping ? 18 : 12 };
        mascot.root.position.copy(p);
        const sweep = Math.sin(t * 5.5);
        mascot.update({
          t, mouth: mouth(t), turn: sweeping ? -0.5 + sweep * 0.08 : yawTo(p, cam.position), broom: sweeping, look: sweeping ? [-0.2, -0.3] : [0, -0.25],
          lean: sweeping ? 0.12 : 0, nod: sweeping ? 0.2 : 0.08,
          ...exprTrack(t, [[S.start, { happy: 0.8, brow: 0.3 }], [st[4], { happy: 1, smileOpen: 0.4 }]]),
          left: sweeping ? { ...P.hold, sx: -0.25 + sweep * 0.3, sz: 0.3, el: 0.3, hx: 0 } : poseTrack(t, [[S.start, 'present'], [st[0], 'point'], [st[1], 'present'], [st[2], 'point'], [st[3], 'explain']]),
          right: sweeping ? { ...P.hold, sx: -0.55 + sweep * 0.2, sz: -0.2, el: 0.95 } : poseTrack(t, [[S.start, 'explain'], [st[0], 'rest'], [st[1], 'point'], [st[2], 'rest'], [st[3], 'thumb']]),
        });
      },
    });
  }

  // concession state: 'messy' (scene 2), 'steps' (scene 4 actions over time), 'tidy' (scene 6)
  const water = [];
  for (let i = 0; i < 14; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: '#6fa3c8', roughness: 0.1, transparent: true, opacity: 0.85 }));
    d.visible = false; yard.scene.add(d); water.push(d);
  }
  function resetYard(t, mode) {
    const pr = yard.props;
    const st = T4.st || [1e9, 1e9, 1e9, 1e9, 1e9];
    const k = (i, d = 1.4) => (mode === 'tidy' ? 1 : mode === 'messy' ? 0 : smooth(prog(t, st[i] + 0.2, st[i] + 0.2 + d)));
    // 1. bucket tipped over and emptied
    const k1 = k(0, 1.2);
    pr.bucket.g.rotation.z = -k1 * 1.95;
    pr.bucket.g.position.set(1.6 + k1 * 0.25, k1 * 0.24, 1.0);
    if (pr.bucket.water) pr.bucket.water.visible = k1 < 0.35;
    pr.bucketPuddle.visible = mode === 'steps' && k1 > 0.3 && t < st[0] + 3.4;
    pr.bucketPuddle.scale.setScalar(Math.max(0.01, smooth(prog(t, st[0] + 0.5, st[0] + 1.3)) * (1 - smooth(prog(t, st[0] + 2.2, st[0] + 3.4)))));
    water.forEach((d, i) => {
      const f = prog(t, st[0] + 0.45 + i * 0.05, st[0] + 0.95 + i * 0.05);
      d.visible = mode === 'steps' && f > 0 && f < 1;
      d.position.set(1.95 + f * 0.6 + (i % 3) * 0.04, 0.42 - f * f * 0.42, 1.0 + ((i % 5) - 2) * 0.05);
    });
    // 2. lids close on the barrel and the canari
    const k2 = k(1, 1.0);
    pr.barrel.lid.visible = true;
    pr.barrel.lid.position.y = 1.03 + (1 - k2) * 0.9;
    pr.barrel.lid.rotation.z = (1 - k2) * 0.5;
    if (pr.canari.lid) { pr.canari.lid.position.y = 0.64 + (1 - k(1, 1.3)) * 0.7; pr.canari.lid.rotation.x = (1 - k(1, 1.3)) * 0.6; }
    pr.barrel.water.visible = k2 < 0.9;
    // 3. tires and cans jump into the bin
    const objs = [...pr.tires.map((x) => x.g), ...pr.cans];
    const binTop = new THREE.Vector3(-1.4, 1.1, 2.2);
    objs.forEach((o, i) => {
      if (!o.userData.home) o.userData.home = o.position.clone();
      const f = mode === 'tidy' ? 1 : mode === 'messy' ? 0 : smooth(prog(t, st[2] + 0.3 + i * 0.35, st[2] + 1.0 + i * 0.35));
      const h = o.userData.home;
      o.position.set(lerp(h.x, binTop.x, f), lerp(h.y, binTop.y - 0.5, f) + Math.sin(f * Math.PI) * 1.4, lerp(h.z, binTop.z, f));
      o.visible = f < 0.97;
    });
    pr.bin.lid.rotation.x = mode === 'tidy' ? 0 : -1.6 * (1 - (mode === 'steps' ? smooth(prog(t, st[2] + 2.6, st[2] + 3.2)) : 0));
    // 4. the net comes down over the bed
    const k4 = k(3, 1.3);
    pr.net.net.scale.set(1 - (1 - k4) * 0.7, 0.25 + k4 * 0.75, 1.25 - (1 - k4) * 0.85);
    pr.net.net.position.y = 2.4 - (0.25 + k4 * 0.75) * 1.2;
    // 5. weeds cut and puddle gone
    const k5 = mode === 'tidy' ? 1 : mode === 'messy' ? 0 : smooth(prog(t, st[4] + 0.8, st[4] + 3.0));
    pr.weeds.forEach((w, i) => { w.scale.setScalar(Math.max(0.001, 1.2 * (1 - smooth(prog(k5, i * 0.18, i * 0.18 + 0.4))))); });
    pr.puddle.scale.setScalar(Math.max(0.001, 1 - k5));
    for (const p of Object.values(yard.family)) p.root.visible = mode === 'tidy';
  }

  // =====================================================================
  // SCENE 5 — what to do: go to the health centre
  // =====================================================================
  {
    const S = sc(5), cam = SETS.camera(30);
    const mPos = new THREE.Vector3(-0.9, 0, 3.0);
    ui.show(ui.box('ribbon', `<small>En cas de signe de danger :</small>Urgence : rendez-vous immédiatement dans un centre de santé.`, { x: 0, y: 1168 }), Wd('s5a', 'rendez') + 0.1, L('s5b').start + 0.3, { anim: 'left', kind: 'alert' });
    ui.show(ui.banner('Des symptômes ?<br>Consultez rapidement.', { color: 'green', y: 1000, size: 54, tilt: -2 }), L('s5a').start - 0.1, S.end - 0.15, { anim: 'stamp' });
    ui.show(ui.box('tag', 'Pas d’automédication', { x: 300, y: 1166, tilt: -2, style: { fontSize: '40px' } }), L('s5b').start + 0.35, S.end - 0.15, { anim: 'pop' });
    const icons = [['aspirin', 'Évitez l’aspirine', Wd('s5b', 'l\'aspirine')], ['ibuprofen', 'Évitez l’ibuprofène', Wd('s5b', 'l\'ibuprofène')], ['water', 'Buvez régulièrement de l’eau', Wd('s5c', 'buvez')], ['staff', 'Suivez les conseils du personnel de santé', Wd('s5c', 'suivez')]];
    icons.forEach(([ic, lb, t0], i) => {
      ui.show(ui.box('icon', `<div class="disc">${ICONS[ic]}</div><div class="lb">${lb}</div>`, { x: 30 + i * 258, y: 1240, w: 246 }), t0 - 0.2, S.end - 0.15, { anim: 'drop' });
    });
    ui.show(ui.el('shade'), S.start, S.end, { anim: 'fade', cue: false });
    out.push({
      start: S.start, end: S.end, scene: health.scene, camera: cam, dof: { focus: 10, aperture: 12 },
      enter() { health.scene.add(mascot.root); },
      update(t) {
        camTrack(cam, t, [[S.start, [0.1, 2.25, 12.2], [0.0, 1.45, 3.0], 34], [S.end, [0.05, 2.2, 11.6], [0.0, 1.45, 3.0], 34]], 0.012);
        this.dof = { focus: cam.position.distanceTo(mPos), aperture: 10 };
        // a mother and her child walk to the entrance; a man waits by the door
        const w = prog(t, S.start, S.end);
        const pm = new THREE.Vector3(lerp(2.2, 0.6, w), 0, lerp(4.6, -4.2, w));
        health.people.mom.root.position.copy(pm);
        health.people.mom.root.rotation.y = Math.PI + 0.35;
        health.people.mom.update({ t, walk: t * 1.6, walking: 1, mouth: 'smile', right: PPOSE.hold });
        health.people.kid.root.position.set(pm.x + 0.65, 0, pm.z + 0.2);
        health.people.kid.root.rotation.y = Math.PI + 0.3;
        health.people.kid.update({ t, walk: t * 2.0 + 0.5, walking: 1, mouth: 'smile', left: { ...PPOSE.hold, sz: 0.5 } });
        health.people.man.root.position.set(3.4, 0.35, -6.0);
        health.people.man.root.rotation.y = -0.4;
        health.people.man.update({ t, mouth: 'smile' });
        mascot.root.position.copy(mPos);
        const tb = L('s5b').start, tc = L('s5c').start;
        mascot.update({
          t, mouth: mouth(t), turn: yawTo(mPos, cam.position) + (t < tb ? 0.35 : 0), headTurn: t < tb ? -0.2 : 0,
          ...exprTrack(t, [[S.start, { happy: 0.6, brow: 0.2 }], [tb, { serious: 0.8 }], [tc, { happy: 0.8 }]]),
          left: poseTrack(t, [[S.start, 'rest'], [S.start + 0.4, 'present'], [tb, 'stop'], [tc, 'explain']]),
          right: poseTrack(t, [[S.start, 'rest'], [tc + 1.5, 'chest']]),
        });
      },
    });
  }

  // =====================================================================
  // SCENE 6 — together: family, then the end card
  // =====================================================================
  {
    const S = sc(6), cam = SETS.camera(30);
    const mPos = new THREE.Vector3(-0.5, 0, 2.9);
    const tEnd = L('s6c').start - 0.15;
    ui.endCard = tEnd;
    ui.logoTarget = { dx: -226, dy: 250, s: 2.8 };
    ui.show(ui.banner('Ensemble contre la dengue !', { color: 'green', y: 1090, size: 66, tilt: -2 }), L('s6b').start - 0.05, tEnd + 0.3, { anim: 'stamp' });
    ui.show(ui.banner('Protégeons notre santé, protégeons notre communauté.', { color: 'red', y: 1222, size: 36, tilt: -2, cls: 'lower' }), L('s6b').start + 0.5, tEnd + 0.3, { anim: 'left' });
    const card = ui.box('endcard', SWOOSH_TOP + SWOOSH_BOTTOM, { x: 0, y: 0, w: 1080, h: 1920 });
    ui.show(card, tEnd, S.end + 1, { anim: 'fade', fi: 0.5, cue: false });
    const z = { zIndex: 50 };
    ui.show(ui.banner('Ensemble contre la dengue !', { color: 'green', y: 900, size: 64, tilt: -2 }), tEnd + 0.9, S.end + 1, { anim: 'stamp' }).style.zIndex = 50;
    ui.show(ui.banner('Protégeons notre santé, protégeons notre communauté.', { color: 'red', y: 1030, size: 36, tilt: -2, cls: 'lower' }), tEnd + 1.3, S.end + 1, { anim: 'left' }).style.zIndex = 50;
    ui.show(ui.banner('Agir vite, sauver des vies.', { color: 'white', y: 1140, size: 74, tilt: -2, cls: 'lower' }), Wd('s6c', 'agir') - 0.1, S.end + 1, { anim: 'stamp' }).style.zIndex = 50;
    void z;
    out.push({
      start: S.start, end: S.end + 10, scene: yard.scene, camera: cam, dof: { focus: 8, aperture: 14 },
      enter() { yard.scene.add(mascot.root); },
      update(t) {
        resetYard(t, 'tidy');
        yard.lights.sun.color.set('#ffd29a');
        camTrack(cam, t, [[S.start, [0.0, 2.1, 14.2], [0.0, 1.05, 1.6], 30], [tEnd, [0.0, 2.0, 12.8], [0.0, 1.05, 1.6], 30]], 0.012);
        this.dof = { focus: cam.position.distanceTo(mPos), aperture: 14 };
        const f = yard.family;
        const cheer = L('s6b').start;
        f.dad.root.position.set(1.3, 0, 1.0); f.dad.root.rotation.y = -0.15;
        f.dad.update({ t, mouth: 'grin', right: t > cheer ? PPOSE.thumb : PPOSE.rest, left: PPOSE.rest });
        f.mom.root.position.set(-1.6, 0, 0.9); f.mom.root.rotation.y = 0.2;
        f.mom.update({ t, mouth: 'grin', left: t > cheer + 0.3 ? { ...PPOSE.wave, wave: 1 } : PPOSE.rest });
        f.boy.root.position.set(0.75, 0, 1.9); f.boy.root.rotation.y = -0.1;
        f.boy.update({ t, mouth: 'grin', right: PPOSE.thumb, left: t > cheer ? PPOSE.thumb : PPOSE.rest, bob: Math.abs(Math.sin(t * 4)) * 0.03 });
        f.girl.root.position.set(-1.0, 0, 2.0); f.girl.root.rotation.y = 0.15;
        f.girl.update({ t, mouth: 'smile', left: PPOSE.thumb, right: t > cheer ? PPOSE.thumb : PPOSE.rest });
        mascot.root.position.copy(mPos);
        mascot.update({
          t, mouth: mouth(t), turn: yawTo(mPos, cam.position),
          ...exprTrack(t, [[S.start, { happy: 0.7, brow: 0.2 }], [cheer, { happy: 1, smileOpen: 0.5, brow: 0.4 }]]),
          left: poseTrack(t, [[S.start, 'rest'], [S.start + 0.5, 'present'], [cheer, 'thumb']]),
          right: poseTrack(t, [[S.start, 'rest'], [L('s6a').start + 2.5, 'explain'], [cheer, 'thumb']]),
        });
      },
    });
  }

  return out;
}
