import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Timeline } from './core.js';
import { Overlay } from './overlay.js';
import { buildScenes } from './scenes.js';
import { Pipeline } from './pipeline.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const fonts = ['700 20px Oswald', '600 20px Oswald', '900 20px Montserrat', '800 20px Montserrat', '700 20px Montserrat', '900 20px Nunito', '800 20px Nunito', '700 20px Nunito'];
await Promise.all(fonts.map((f) => document.fonts.load(f, 'ÉéèàçÀ')));

const tl = new Timeline(await (await fetch('/src/timeline.json')).json());
const logo = await loadImage('/src/logo-sos-medecins-bf.jpg');

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1080, 1920, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const ui = new Overlay(document.getElementById('ui'), tl, logo);
const Q = Object.fromEntries(new URLSearchParams(location.search));
window.__Q = Q;
const pipe = new Pipeline(renderer, Q);
const scenes = buildScenes({ renderer, tl, logo, ui, envMap, pipe });
window.__cues = ui.cues;
if (Q.shadow === '0') renderer.shadowMap.enabled = false;
if (Q.shadow === 'pcf') renderer.shadowMap.type = THREE.PCFShadowMap;
if (Q.phys === '0') {
  const seen = new Set();
  for (const s of scenes) s.scene.traverse((o) => { if (o.material && !seen.has(o.material)) { seen.add(o.material); if (o.material.isMeshPhysicalMaterial) { o.material.sheen = 0; o.material.clearcoat = 0; } } });
}

let current = null;
renderer.info.autoReset = false;
window.renderAt = (t) => {
  renderer.info.reset();
  const s = scenes.find((x) => t >= x.start && t < x.end) || scenes[scenes.length - 1];
  if (s !== current) { current?.exit?.(); s.enter?.(); current = s; }
  s.update(t);
  ui.update(t);
  for (const ins of pipe.insets) ins.state = ui.stateOf(ins.el);
  pipe.render(s.scene, s.camera, s.dof, t);
};
window.__bench = (t, n) => {
  const gl = renderer.getContext(); const px = new Uint8Array(4);
  window.renderAt(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const t0 = performance.now();
  for (let i = 0; i < n; i++) { window.renderAt(t + i / 30); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
  return (performance.now() - t0) / n;
};
window.__renderer = renderer;
window.__fps = tl.data.fps;
window.__duration = tl.data.duration;
window.renderAt(0);
window.__ready = true;
