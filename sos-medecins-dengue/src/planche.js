// "Planche animée": the reference storyboard brought to life.
// Each illustrated panel is shown full screen with a 2.5D depth-parallax camera,
// zooms synchronised with the narration, live FX and the official overlays
// (logo, subtitles, banners, end card) shared with the 3D version.
import * as THREE from 'three';
import { Timeline, clamp, lerp, smooth, easeInOut, prog, noise1, rand } from './core.js';
import { Overlay } from './overlay.js';
import { ICONS, SWOOSH_TOP, SWOOSH_BOTTOM } from './icons.js';
import { createMosquito } from './mosquito.js';

const fonts = ['700 20px Oswald', '600 20px Oswald', '900 20px Montserrat', '800 20px Montserrat', '900 20px Nunito', '800 20px Nunito', '700 20px Nunito'];
await Promise.all(fonts.map((f) => document.fonts.load(f, 'ÉéèàçÀ')));

const tl = new Timeline(await (await fetch('/src/timeline.json')).json());
const meta = await (await fetch('/src/planche/panels.json')).json();
const loader = new THREE.TextureLoader();
const load = (u, srgb) => new Promise((res) => loader.load(u, (t) => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8; res(t); }));
const panels = {};
for (const k of Object.keys(meta)) {
  panels[k] = { ...meta[k], tex: await load(`/src/planche/panel${k}.jpg`, true), depth: await load(`/src/planche/depth${k}.png`, false) };
}
const logoImg = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = '/src/logo-sos-medecins-bf.jpg'; });

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1080, 1920, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;

// ---------- the panel quad with depth parallax ----------
const VW = 1080, VH = 1600, VCX = 540, VCY = 800;   // visible image area (the band covers the rest)
const mat = new THREE.ShaderMaterial({
  uniforms: {
    tex: { value: null }, depth: { value: null }, size: { value: new THREE.Vector2(1, 1) },
    cam: { value: new THREE.Vector3(0, 0, 1) }, par: { value: new THREE.Vector2(0, 0) }, focus: { value: 0.5 },
    fade: { value: 1 }, tint: { value: new THREE.Vector3(1, 1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tex; uniform sampler2D depth; uniform vec2 size; uniform vec3 cam; uniform vec2 par; uniform float focus, fade; uniform vec3 tint;
    varying vec2 vUv;
    void main(){
      vec2 sp = vec2(vUv.x * 1080.0, (1.0 - vUv.y) * 1920.0);           // screen px, y down
      vec2 pp = cam.xy + (sp - vec2(${VCX}.0, ${VCY}.0)) / cam.z;          // panel px
      vec2 uv = vec2(pp.x / size.x, 1.0 - pp.y / size.y);
      // parallax: shift by depth, refined twice
      vec2 off = vec2(0.0);
      for (int i = 0; i < 3; i++) {
        float d = texture2D(depth, uv - off).r;
        off = (d - focus) * par;
      }
      vec2 q = clamp(uv - off, vec2(0.001), vec2(0.999));
      vec3 c = texture2D(tex, q).rgb * tint;
      gl_FragColor = vec4(c * fade, 1.0);
      #include <colorspace_fragment>
    }`,
  depthTest: false, depthWrite: false,
});
const quadScene = new THREE.Scene();
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// ---------- live mosquitoes flying in front of the picture ----------
const mqScene = new THREE.Scene();
mqScene.add(new THREE.HemisphereLight('#ffffff', '#886655', 2.2));
const dl = new THREE.DirectionalLight('#fff3e0', 2.2); dl.position.set(2, 4, 5); mqScene.add(dl);
const mqCam = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 50); mqCam.position.set(0, 0, 10); mqCam.lookAt(0, 0, 0);
const mqs = Array.from({ length: 4 }, () => { const m = createMosquito(); m.root.scale.setScalar(0.22); mqScene.add(m.root); return m; });

// ---------- FX canvas (rain) ----------
const fx = document.getElementById('fx').getContext('2d');
const rainDrops = (() => { const r = rand(5); return Array.from({ length: 260 }, () => [r() * 1200 - 60, r(), 0.7 + r() * 0.6, 26 + r() * 40]); })();
function drawRain(t, k) {
  fx.clearRect(0, 0, 1080, 1920);
  if (k <= 0.01) return;
  fx.strokeStyle = `rgba(225,235,245,${0.45 * k})`;
  fx.lineWidth = 2;
  fx.beginPath();
  for (const [x0, y0, sp, len] of rainDrops) {
    const y = ((y0 * 1700 + t * 1900 * sp) % 1700) - 60;
    const x = x0 - y * 0.12;
    fx.moveTo(x, y); fx.lineTo(x - len * 0.12, y + len);
  }
  fx.stroke();
}

// ---------- overlays ----------
const ui = new Overlay(document.getElementById('ui'), tl, logoImg);
ui.el('band', '').style.cssText += 'opacity:1;visibility:visible';
const L = (id) => tl.L(id), Wd = (id, w, n) => tl.W(id, w, n);
const sc = (n) => tl.scene(n);
const tEnd = L('s6c').start - 0.15;
const t45 = L('s4f').start - 0.1;

// shots: panel, time span, camera keys [t, cx, cy, z], parallax amplitude, bottom limit (top of the baked text block)
const shots = [
  { p: 1, a: 0, b: sc(1).end, bottom: 470, par: [0.012, 0.004], keys: [
    [0, 187, 233, 3.36], [L('s1b').start - 0.2, 180, 228, 3.5], [L('s1b').start + 0.6, 262, 228, 5.4], [L('s1c').start - 0.4, 255, 225, 5.55], [L('s1c').start + 0.4, 150, 222, 3.6], [sc(1).end, 145, 220, 3.75]] },
  { p: 2, a: sc(2).start, b: sc(2).end, bottom: 500, par: [0.012, 0.005], keys: [
    [sc(2).start, 160, 250, 3.4], [Wd('s2a', 'piqûre') - 0.6, 175, 205, 3.75], [Wd('s2a', 'piqûre') + 0.1, 250, 262, 5.2], [L('s2b').start - 0.2, 248, 260, 5.3], [L('s2b').start + 0.5, 160, 262, 3.45], [sc(2).end, 160, 262, 3.55]] },
  { p: 3, a: sc(3).start, b: sc(3).end, bottom: 490, par: [0.008, 0.004], keys: [
    [sc(3).start, 161, 245, 3.36], [Wd('s3a', 'forte') - 0.5, 161, 240, 3.45],
    [Wd('s3a', 'forte'), 82, 165, 5.0], [Wd('s3a', 'maux') - 0.05, 82, 165, 5.05],
    [Wd('s3a', 'maux') + 0.4, 240, 165, 5.0], [Wd('s3a', 'douleurs', 1) - 0.05, 240, 165, 5.05],
    [Wd('s3a', 'douleurs', 1) + 0.4, 82, 270, 5.0], [Wd('s3a', 'nausées') - 0.05, 82, 270, 5.05],
    [Wd('s3a', 'nausées') + 0.4, 240, 270, 5.0], [Wd('s3a', 'parfois') - 0.05, 240, 270, 5.05],
    [Wd('s3a', 'parfois') + 0.4, 95, 360, 5.0], [L('s3b').start - 0.3, 100, 360, 5.1],
    [L('s3b').start + 0.4, 161, 258, 3.4], [sc(3).end, 161, 258, 3.5]] },
  { p: 4, a: sc(4).start, b: t45, bottom: 542, par: [0.008, 0.004], keys: [
    [sc(4).start, 205, 272, 2.9], [L('s4b').start - 0.5, 205, 270, 3.0],
    [L('s4b').start, 105, 310, 4.6], [L('s4c').start - 0.05, 110, 310, 4.65],
    [L('s4c').start + 0.4, 300, 310, 4.6], [L('s4d').start - 0.05, 300, 312, 4.65],
    [L('s4d').start + 0.4, 105, 460, 4.6], [L('s4e').start - 0.05, 108, 460, 4.65],
    [L('s4e').start + 0.4, 300, 460, 4.6], [t45, 300, 460, 4.7]] },
  { p: 5, a: t45, b: sc(5).start, bottom: 542, par: [0.012, 0.004], keys: [
    [t45, 141, 215, 3.9], [Wd('s4f', 'supprimer') - 0.4, 141, 230, 4.0], [Wd('s4f', 'supprimer') + 0.3, 141, 340, 3.85], [sc(5).start, 141, 343, 3.9]] },
  { p: 6, a: sc(5).start, b: sc(6).start, bottom: 440, par: [0.01, 0.004], keys: [
    [sc(5).start, 162, 150, 3.7], [L('s5b').start - 0.4, 164, 160, 3.8], [L('s5b').start + 0.3, 162, 262, 3.75], [sc(6).start, 162, 262, 3.85]] },
  { p: 7, a: sc(6).start, b: tEnd + 1.2, bottom: 275, par: [0.012, 0.003], keys: [
    [sc(6).start, 100, 137, 5.7], [L('s6a').start + 1.5, 110, 137, 5.75], [L('s6b').start - 0.5, 380, 137, 5.75], [tEnd + 1.2, 395, 137, 5.85]] },
];
for (const s of shots.slice(1)) ui.wipe(s.a);

function cameraAt(shot, t) {
  const ks = shot.keys;
  let i = 0;
  while (i + 1 < ks.length && t >= ks[i + 1][0]) i++;
  const a = ks[i], b = ks[Math.min(i + 1, ks.length - 1)];
  const k = b === a ? 0 : easeInOut((t - a[0]) / (b[0] - a[0]));
  const P = panels[shot.p], oy = P.oy || 0;
  let [cx, cy, z] = [lerp(a[1], b[1], k), lerp(a[2], b[2], k) + oy, lerp(a[3], b[3], k)];
  const bottom = shot.bottom + oy;
  z = Math.max(z, VW / P.w, VH / bottom);
  cx = clamp(cx, VW / 2 / z, P.w - VW / 2 / z);
  cy = clamp(cy, VH / 2 / z, bottom - VH / 2 / z);
  return { cx, cy, z };
}

// overlay elements whose position follows a panel rectangle
const tracked = [];
function track(el, shot, rect, pad = 6) { tracked.push({ el, shot, rect, pad }); return el; }
function hl(shotIdx, rect, t0, t1) {
  const e = ui.box('hl', '', { x: 0, y: 0, w: 10, h: 10 });
  ui.show(e, t0, t1, { anim: 'fade', fi: 0.25, fo: 0.25, cue: false, fn: (el, t) => { el.style.opacity = (Number(el.style.opacity) * (0.75 + 0.25 * Math.sin(t * 9))).toFixed(3); } });
  return track(e, shots[shotIdx], rect);
}

// --- scene 1/2: tags not baked in the board
ui.show(ui.box('tag yellow', `<span style="display:inline-flex;align-items:center;gap:12px"><span style="width:58px;height:58px;display:inline-block">${ICONS.sun}</span>Il pique aussi le jour</span>`, { x: 60, y: 300, tilt: -2 }), L('s2b').start + 0.2, sc(2).end - 0.15, { anim: 'left' });

// --- scene 3: highlight each symptom card as it is named, then the danger signs
const tiles = [[8, 110, 155, 216, 'forte'], [160, 110, 316, 216, 'maux'], [8, 222, 155, 318, 'douleurs'], [160, 222, 316, 318, 'nausées'], [8, 322, 155, 405, 'parfois']];
tiles.forEach(([x0, y0, x1, y1, w], i) => {
  const t0 = Wd('s3a', w, w === 'douleurs' ? 1 : 0);
  const t1 = i < 4 ? Wd('s3a', tiles[i + 1][4], tiles[i + 1][4] === 'douleurs' ? 1 : 0) : L('s3b').start - 0.2;
  hl(2, [x0, y0, x1, y1], t0, t1);
});
const t3b = L('s3b').start - 0.1;
ui.show(ui.el('vignette'), t3b, sc(3).end - 0.1, { anim: 'fade', fi: 0.6, cue: false });
ui.show(ui.box('scrim', '', { x: 0, y: 380, h: 800 }), t3b, sc(3).end - 0.1, { anim: 'fade', fi: 0.5, cue: false });
const dangers = [['abdo', 'Douleurs abdominales intenses', 'abdominales'], ['vomit', 'Vomissements persistants', 'vomissements'], ['bleed', 'Saignements', 'saignements'], ['weak', 'Grande faiblesse', 'faiblesse'], ['breath', 'Difficultés respiratoires', 'difficultés']];
dangers.forEach(([ic, txt, w], i) => {
  ui.show(ui.box('row', `<div class="ic">${ICONS[ic]}</div><div class="tx">${txt}</div>`, { x: 60, y: 420 + i * 146, w: 800, h: 124 }), Wd('s3b', w) - 0.25, sc(3).end - 0.15, { anim: 'left', kind: 'alert' });
});
ui.show(ui.banner('Il faut consulter en urgence !', { color: 'red', y: 1170, size: 62, tilt: -3 }), L('s3c').start, sc(3).end - 0.15, { anim: 'stamp', kind: 'alert' });

// --- scene 4: highlight the step being described and tick it
const steps = [[5, 240, 202, 382, 's4b'], [205, 240, 404, 382, 's4c'], [5, 386, 202, 542, 's4d'], [205, 386, 404, 542, 's4e']];
steps.forEach(([x0, y0, x1, y1, id], i) => {
  hl(3, [x0, y0, x1, y1], L(id).start, i < 3 ? L(steps[i + 1][4]).start : t45);
  const chk = ui.box('', ICONS.check, { x: 0, y: 0, w: 110, h: 110, style: { zIndex: 24 } });
  ui.show(chk, L(id).start + 1.4, t45, { anim: 'pop' });
  track(chk, shots[3], [x1 - 40, y0 - 14, x1 + 4, y0 + 30], 0);
});
hl(4, [12, 410, 272, 530], Wd('s4f', 'supprimer') + 0.2, sc(5).start - 0.1);

// --- scene 5: urgency, no self-medication, the fourth advice
ui.show(ui.box('ribbon', `<small>En cas de signe de danger :</small>Urgence : rendez-vous immédiatement dans un centre de santé.`, { x: 0, y: 880 }), Wd('s5a', 'rendez') + 0.1, L('s5b').start + 0.2, { anim: 'left', kind: 'alert' });
ui.show(ui.box('tag', 'Pas d’automédication', { x: 290, y: 690, tilt: -2, style: { fontSize: '46px' } }), L('s5b').start + 0.3, sc(6).start - 0.15, { anim: 'pop' });
hl(5, [8, 328, 108, 412], Wd('s5b', 'l\'aspirine') - 0.1, Wd('s5b', 'qui'));
hl(5, [112, 328, 214, 412], Wd('s5b', 'l\'ibuprofène') - 0.1, Wd('s5b', 'qui') + 1.2);
hl(5, [218, 328, 318, 440], Wd('s5c', 'buvez') - 0.1, Wd('s5c', 'suivez'));
ui.show(ui.box('icon', `<div class="disc">${ICONS.staff}</div><div class="lb" style="font-size:36px">Suivez les conseils<br>du personnel de santé</div>`, { x: 640, y: 380, w: 400 }), Wd('s5c', 'suivez') - 0.2, sc(6).start - 0.15, { anim: 'drop' });

// --- scene 6 + end card (same as the 3D version)
ui.show(ui.banner('Ensemble contre la dengue !', { color: 'green', y: 1150, size: 66, tilt: -2 }), L('s6b').start - 0.05, tEnd + 0.3, { anim: 'stamp' });
ui.show(ui.banner('Protégeons notre santé, protégeons notre communauté.', { color: 'red', y: 1282, size: 36, tilt: -2, cls: 'lower' }), L('s6b').start + 0.5, tEnd + 0.3, { anim: 'left' });
ui.endCard = tEnd;
ui.logoTarget = { dx: -56, dy: 278, s: 2.2 };
ui.show(ui.box('endcard', SWOOSH_TOP + SWOOSH_BOTTOM, { x: 0, y: 0, w: 1080, h: 1920 }), tEnd, 1e9, { anim: 'fade', fi: 0.5, cue: false }).style.zIndex = 59;
ui.show(ui.banner('Ensemble contre la dengue !', { color: 'green', y: 900, size: 64, tilt: -2 }), tEnd + 0.9, 1e9, { anim: 'stamp' }).style.zIndex = 62;
ui.show(ui.banner('Protégeons notre santé, protégeons notre communauté.', { color: 'red', y: 1030, size: 36, tilt: -2, cls: 'lower' }), tEnd + 1.3, 1e9, { anim: 'left' }).style.zIndex = 62;
ui.show(ui.banner('Agir vite, sauver des vies.', { color: 'white', y: 1140, size: 74, tilt: -2, cls: 'lower' }), Wd('s6c', 'agir') - 0.1, 1e9, { anim: 'stamp' }).style.zIndex = 62;
window.__cues = ui.cues;

// ---------- frame ----------
window.renderAt = (t) => {
  const shot = shots.find((s) => t >= s.a && t < s.b) || shots[shots.length - 1];
  const P = panels[shot.p];
  const c = cameraAt(shot, t);
  const u = mat.uniforms;
  u.tex.value = P.tex; u.depth.value = P.depth;
  u.size.value.set(P.w, P.h);
  u.cam.value.set(c.cx, c.cy, c.z);
  const ph = (t - shot.a) / Math.max(1, shot.b - shot.a);
  u.par.value.set(shot.par[0] * Math.sin(ph * Math.PI * 1.2 - 0.6) + noise1(t * 0.3, shot.p) * 0.002, shot.par[1] * Math.cos(ph * Math.PI));
  const danger = shot.p === 3 ? smooth(prog(t, t3b, t3b + 0.6)) : 0;
  u.tint.value.set(1, 1 - danger * 0.12, 1 - danger * 0.15);
  renderer.setRenderTarget(null);
  renderer.clear();
  renderer.render(quadScene, quadCam);

  // mosquitoes over the stagnant water (scene 1) and around the bite (scene 2)
  const showMq = (shot.p === 1 && t > L('s1b').start + 0.3 && t < L('s1c').start) || (shot.p === 2 && t < Wd('s2a', 'piqûre') - 0.6);
  mqs.forEach((m, i) => {
    m.root.visible = showMq;
    if (!showMq) return;
    const p = t * 0.8 + i * 1.7;
    m.root.position.set(-1.2 + i * 0.8 + noise1(p, i) * 0.6, -0.8 + noise1(p * 1.2, i + 7) * 0.5 + (shot.p === 2 ? 1.2 : 0), 1 + i * 0.4);
    m.root.rotation.set(0.3, p * 0.9 + i, noise1(p, i + 3) * 0.3);
    m.update(t + i * 0.011, { flap: 1 });
  });
  if (showMq) { renderer.clearDepth(); renderer.render(mqScene, mqCam); }

  drawRain(t, shot.p === 1 ? 1 - smooth(prog(t, 6.5, 9.5)) : 0);

  ui.update(t);
  // move tracked overlays with the camera
  for (const tr of tracked) {
    const cc = cameraAt(tr.shot, t);
    const oy = panels[tr.shot.p].oy || 0;
    const [x0, y0, x1, y1] = [tr.rect[0], tr.rect[1] + oy, tr.rect[2], tr.rect[3] + oy];
    const sx = VCX + (x0 - cc.cx) * cc.z - tr.pad, sy = VCY + (y0 - cc.cy) * cc.z - tr.pad;
    Object.assign(tr.el.style, { left: `${sx.toFixed(1)}px`, top: `${sy.toFixed(1)}px`, width: `${((x1 - x0) * cc.z + tr.pad * 2).toFixed(1)}px`, height: `${((y1 - y0) * cc.z + tr.pad * 2).toFixed(1)}px` });
    if (!(t >= tr.shot.a && t < tr.shot.b)) tr.el.style.visibility = 'hidden';
  }
};
window.__fps = tl.data.fps;
window.__duration = tl.data.duration;
window.renderAt(0);
window.__ready = true;
