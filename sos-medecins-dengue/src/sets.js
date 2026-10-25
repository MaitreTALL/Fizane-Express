// The sets: a neighbourhood street, a family concession, the health centre,
// plus small "inset" sets rendered inside overlay cards.
import * as THREE from 'three';
import * as W from './world.js';
import * as T from './textures.js';
import { createPerson } from './people.js';
import { createMosquito } from './mosquito.js';
import { rand } from './core.js';

export const SKY = {
  rain: [[0, '#56636f'], [0.55, '#8796a1'], [1, '#c4c9c8']],
  sunny: [[0, '#4d9fe0'], [0.5, '#9fd0f0'], [1, '#f1e4c8']],
  golden: [[0, '#5ea6e3'], [0.55, '#f2d7a8'], [1, '#f7c17f']],
  soft: [[0, '#cfe9f7'], [1, '#f3f7ee']],
};

export function newScene(ctx, stops, fog) {
  const s = new THREE.Scene();
  W.setupSky(s, { stops, fog, fogNear: 18, fogFar: 75 });
  s.environment = ctx.envMap;
  s.environmentIntensity = 0.45;
  return s;
}

export const camera = (fov = 30) => new THREE.PerspectiveCamera(fov, 1080 / 1920, 0.05, 160);

export function bush(parent, pos, s = 1, seed = 1, cols = ['#3f8a2e', '#4e9c35', '#2f7a28', '#6aa83f']) {
  const g = W.group(parent, pos, [0, 0, 0], s);
  const r = rand(seed);
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.4;
    W.add(g, new THREE.IcosahedronGeometry(0.35 + r() * 0.25, 1), W.mat(cols[i % cols.length], 0.85), [Math.cos(a) * d, 0.3 + r() * 0.25, Math.sin(a) * d], [r(), r(), r()], [1, 0.8, 1]);
  }
  return g;
}

export function pottedPlant(parent, pos, s = 1, seed = 2) {
  const g = W.group(parent, pos, [0, 0, 0], s);
  W.add(g, new THREE.CylinderGeometry(0.22, 0.16, 0.36, 20), W.mat('#b4552e', 0.85), [0, 0.18, 0]);
  const r = rand(seed);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    W.add(g, new THREE.SphereGeometry(0.09, 10, 8), W.mat(i % 2 ? '#3d8b33' : '#57a83e', 0.8), [Math.cos(a) * 0.12, 0.55 + r() * 0.15, Math.sin(a) * 0.12], [0.6 * Math.cos(a), 0, 0.6 * Math.sin(a)], [0.6, 2.6, 0.35]);
  }
  return g;
}

// ring of distant houses and trees for depth
function backdrop(parent, seed = 5, radius = 30) {
  const r = rand(seed);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + r() * 0.1;
    const d = radius + r() * 10;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (r() > 0.45) W.tree(parent, { pos: [x, 0, z], h: 5 + r() * 3, r: 2.4 + r(), seed: i + 50 });
    else W.house(parent, { pos: [x, 0, z], rotY: -a + Math.PI / 2, w: 5 + r() * 3, d: 4, h: 2.8 + r() * 0.5, roof: r() > 0.5 ? 'tin' : 'flat', tone: ['#c48e5e', '#b98457', '#cf9d6b'][i % 3], door: ['#1f5fa8', '#0b7d42', '#2a8f9c', '#b3342e'][i % 4], seed: i });
  }
}

// ---------- the neighbourhood street (scenes 1 and 3) ----------
export function buildStreet(ctx) {
  const scene = newScene(ctx, SKY.rain, '#9aa3a6');
  const lights = W.setupLights(scene, { sky: '#c9d6df', groundCol: '#8a5a3c', hemi: 1.5, sunCol: '#ffe2bd', sun: 0.6, sunPos: [-6, 10, 8], shadow: 10 });
  const groundMat = new THREE.MeshStandardMaterial({ map: T.laterite([12, 12]), roughness: 0.6, metalness: 0.0 });
  const ground = W.add(scene, new THREE.PlaneGeometry(120, 120), groundMat, [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // houses lining the street
  W.house(scene, { pos: [-6.5, 0, -7], w: 6, d: 4.5, roof: 'tin', door: '#1f5fa8', seed: 1 });
  W.house(scene, { pos: [1.5, 0, -9], w: 7, d: 4.5, h: 3.1, roof: 'flat', tone: '#bf8656', door: '#0b7d42', doorX: 1.2, seed: 2 });
  W.house(scene, { pos: [9.5, 0, -7.5], rotY: -0.3, w: 5.5, d: 4.5, roof: 'tin', tone: '#cf9d6b', door: '#b3342e', seed: 3 });
  W.wall(scene, { pos: [-3, 0, -4.2], len: 5, h: 1.8 });
  W.gate(scene, [0.4, 0, -4.2], 0, '#1f5fa8');
  W.wall(scene, { pos: [5.5, 0, -4.2], len: 8, h: 1.8, tone: '#c08a5b' });
  W.tree(scene, { pos: [-8.5, 0, -2.5], h: 5.5, r: 2.6, seed: 7 });
  W.tree(scene, { pos: [6.5, 0, -2.8], h: 4.8, r: 2.2, seed: 9 });
  W.tree(scene, { pos: [14, 0, -4], h: 6, r: 3, seed: 13 });
  backdrop(scene, 3, 34);
  for (const [x, z, s, sd] of [[-4.6, -3.4, 1.1, 1], [3.2, -3.5, 0.9, 2], [-10, -4, 1.4, 3], [9.8, -3.5, 1.2, 4], [-1.8, -3.3, 0.7, 5]]) bush(scene, [x, 0, z], s, sd);
  // stagnant water everywhere after the rain
  const waters = [];
  const tireA = W.tire(scene, [-1.6, 0, 1.4]); waters.push(tireA.water);
  const tireB = W.tire(scene, [-2.4, 0, 0.6], { s: 0.9, rot: [0, 0.4, 0] }); waters.push(tireB.water);
  const buck = W.bucket(scene, [0.4, 0, 1.7], { color: '#2f7fd8' }); waters.push(buck.water);
  const bas = W.basin(scene, [1.6, 0, 0.9], { color: '#d6336c' }); waters.push(bas.water);
  const can = W.canari(scene, [-0.6, 0, 0.2], { broken: true }); waters.push(can.water);
  W.barrel(scene, [2.9, 0, -0.4], { color: '#1f5fa8' });
  W.jerrycan(scene, [3.6, 0, 0.6], { rotY: 0.5 });
  for (const [x, z, sd] of [[0.8, 3.2, 1], [-3.8, 2.6, 2], [3.4, 2.4, 3], [-0.5, -1.6, 4], [5.5, 0.5, 5]]) W.puddle(scene, [x, 0, z], { w: 1.6 + sd * 0.15, d: 1.0, seed: sd });
  const rips = [[-1.6, 0.11, 1.4], [0.4, 0.34, 1.7], [1.6, 0.16, 0.9], [0.8, 0.02, 3.2], [-3.8, 0.02, 2.6]].map((p) => W.ripples(scene, p, 0.28));
  const rain = W.rain(scene, { count: 1800, area: [18, 12, 18], center: [0, 0, 2] });
  // mosquitoes hovering over the water
  const mqs = [];
  for (let i = 0; i < 7; i++) { const m = createMosquito(); m.root.scale.setScalar(0.12); scene.add(m.root); mqs.push(m); }
  // clouds
  const clouds = [W.cloud(scene, [-12, 16, -40], 3.2, '#dfe5ea'), W.cloud(scene, [10, 18, -45], 3.6, '#e8edf0'), W.cloud(scene, [0, 20, -55], 4.2, '#f1f4f6')];
  return { scene, lights, ground, groundMat, rain, rips, mqs, clouds, waters };
}

// ---------- the family concession (scenes 4 and 6) ----------
export function buildConcession(ctx) {
  const scene = newScene(ctx, SKY.sunny, '#e8dcc4');
  const lights = W.setupLights(scene, { sky: '#e2f1ff', groundCol: '#b8683f', hemi: 1.2, sunCol: '#ffe0b5', sun: 2.9, sunPos: [7, 11, 6], shadow: 9 });
  W.ground(scene, 120, 14);
  // enclosure: houses on three sides, wall with gate behind
  W.house(scene, { pos: [-5.5, 0, -6], w: 6, d: 4.2, roof: 'flat', door: '#0b7d42', seed: 4 });
  W.house(scene, { pos: [3.2, 0, -7.2], w: 6.5, d: 4.2, h: 3.0, roof: 'tin', tone: '#cf9d6b', door: '#1f5fa8', doorX: 0.8, seed: 5 });
  W.house(scene, { pos: [9.5, 0, -2.5], rotY: -Math.PI / 2, w: 6, d: 4, roof: 'tin', tone: '#bf8656', door: '#b3342e', seed: 6 });
  W.wall(scene, { pos: [-9, 0, -1], rotY: Math.PI / 2, len: 10, h: 2.0 });
  W.tree(scene, { pos: [-2.2, 0, -4.4], h: 5.6, r: 2.8, seed: 21 });
  W.tree(scene, { pos: [7.5, 0, -6.5], h: 5.0, r: 2.4, seed: 22 });
  backdrop(scene, 8, 30);
  for (const [x, z, s, sd] of [[-7.6, -3.5, 1.2, 7], [-0.2, -4.6, 0.9, 8], [6.2, -4.2, 1.1, 9], [8.2, 1.2, 1.0, 10], [-8, 2.5, 1.0, 11]]) bush(scene, [x, 0, z], s, sd);
  for (const [x, z, sd] of [[-3.6, -3.7, 1], [-4.4, -3.6, 2], [5.0, -4.8, 3]]) pottedPlant(scene, [x, 0, z], 1, sd);
  // veranda (hangar) with the bed and mosquito net
  const hangar = W.group(scene, [-5.2, 0, -1.2]);
  for (const [x, z] of [[-1.6, -1.3], [1.6, -1.3], [-1.6, 1.3], [1.6, 1.3]]) W.add(hangar, new THREE.CylinderGeometry(0.07, 0.08, 2.6, 8), W.mat('#6b4a32', 0.9), [x, 1.3, z]);
  W.add(hangar, new THREE.BoxGeometry(3.8, 0.12, 3.2), new THREE.MeshStandardMaterial({ map: T.wood([3, 2], '#a6884f'), roughness: 0.95 }), [0, 2.62, 0]);
  W.add(hangar, new THREE.BoxGeometry(4.0, 0.08, 3.4), W.mat('#c9b27a', 1), [0, 2.72, 0]);
  W.bed(hangar, [0, 0, 0], Math.PI / 2);
  const net = W.mosquitoNet(hangar, [0, 0, 0]);
  // the props used by the 5 prevention steps
  const props = {};
  props.bucket = W.bucket(scene, [1.6, 0, 1.0], { color: '#2f7fd8' });
  props.bucketPuddle = W.puddle(scene, [2.1, 0, 1.2], { w: 1.2, d: 0.8, seed: 4 });
  props.barrel = W.barrel(scene, [4.0, 0, -0.6], { color: '#1f5fa8', lid: true });
  props.canari = W.canari(scene, [4.9, 0, 0.4], { lid: true });
  props.bin = W.trashBin(scene, [-1.4, 0, 2.2]);
  props.tires = [W.tire(scene, [0.2, 0, 3.0], { water: true }), W.tire(scene, [-0.6, 0, 3.6], { water: true, s: 0.9 })];
  props.cans = [W.can(scene, [0.9, 0, 3.4], [Math.PI / 2, 0, 0.3]), W.can(scene, [1.3, 0, 3.0], [Math.PI / 2, 0, 1.2], '#0b7d42'), W.can(scene, [-0.1, 0, 2.4], [Math.PI / 2, 0, 2.1], '#e8b21c')];
  props.weeds = [[3.0, 2.6], [3.6, 3.1], [2.6, 3.4], [4.2, 2.4]].map(([x, z], i) => W.grassTuft(scene, [x, 0, z], 1.2, i + 3));
  props.puddle = W.puddle(scene, [3.4, 0, 2.9], { w: 1.5, d: 0.9, seed: 9 });
  props.net = net;
  props.hangar = hangar;
  W.jerrycan(scene, [5.3, 0, -0.8], { rotY: -0.4 });
  W.jerrycan(scene, [5.7, 0, -0.5], { rotY: 0.2, color: '#e8d21a' });
  // the family
  const fdf = (cols, seed) => new THREE.MeshStandardMaterial({ map: T.fasoDanFani(cols, [1.5, 1.5], seed), roughness: 0.85 });
  const waxM = (a, b, c) => new THREE.MeshStandardMaterial({ map: T.wax(a, b, c, [3, 3]), roughness: 0.85 });
  const family = {
    dad: createPerson({ kind: 'man', skin: '#5e3522', top: fdf(['#1d3f8f', '#ffffff', '#e81e27', '#f2c230', '#0b7d42'], 3), bottom: W.mat('#3a3f47', 0.85), phase: 0.3 }),
    mom: createPerson({ kind: 'woman', skin: '#6b3e26', top: waxM('#e8a33a', '#0b7d42', '#b3342e'), wrap: waxM('#e8a33a', '#0b7d42', '#b3342e'), phase: 1.1 }),
    boy: createPerson({ kind: 'boy', skin: '#7a4a2e', top: W.mat('#e81e27', 0.85), bottom: W.mat('#2b4c7e', 0.85), phase: 2.1 }),
    girl: createPerson({ kind: 'girl', skin: '#6b3e26', top: waxM('#7a3fa0', '#f2c230', '#ffffff'), phase: 2.7 }),
  };
  for (const p of Object.values(family)) { scene.add(p.root); p.root.visible = false; }
  return { scene, lights, props, family };
}

// ---------- the health centre (scene 5) ----------
export function buildHealth(ctx) {
  const scene = newScene(ctx, SKY.sunny, '#e8dcc4');
  const lights = W.setupLights(scene, { sky: '#e2f1ff', groundCol: '#b8683f', hemi: 1.2, sunCol: '#ffe6c4', sun: 2.8, sunPos: [6, 12, 9], shadow: 12 });
  W.ground(scene, 120, 14);
  const hc = W.healthCentre(scene, [0, 0, -9.3]);
  W.tree(scene, { pos: [-9.5, 0, -6], h: 6, r: 3, seed: 31 });
  W.tree(scene, { pos: [9.5, 0, -5.5], h: 5.5, r: 2.8, seed: 32 });
  backdrop(scene, 11, 34);
  for (const [x, z, s, sd] of [[-7.2, -4.6, 1.1, 12], [7.4, -4.8, 1.0, 13], [-5.0, -4.8, 0.8, 14], [5.0, -4.7, 0.8, 15], [-3.2, 1.5, 0.7, 16], [3.6, 1.2, 0.7, 17]]) bush(scene, [x, 0, z], s, sd);
  // path to the entrance
  W.add(scene, new THREE.PlaneGeometry(2.6, 14), W.mat('#c9a27c', 0.95), [0, 0.01, -0.5], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const waxM = (a, b, c) => new THREE.MeshStandardMaterial({ map: T.wax(a, b, c, [3, 3]), roughness: 0.85 });
  const people = {
    mom: createPerson({ kind: 'woman', skin: '#5a3220', top: waxM('#1f7a8c', '#f2c230', '#e81e27'), wrap: waxM('#e81e27', '#f2c230', '#1f7a8c'), phase: 0.4 }),
    kid: createPerson({ kind: 'girl', skin: '#6b3e26', top: W.mat('#f29ab8', 0.85), phase: 1.3 }),
    man: createPerson({ kind: 'man', skin: '#4e2b1b', top: W.mat('#f4f4f4', 0.85), bottom: W.mat('#2f3640', 0.85), phase: 2.2 }),
  };
  for (const p of Object.values(people)) scene.add(p.root);
  return { scene, lights, people, hc };
}

// ---------- inset: mosquito on skin, big close-up ----------
export function buildSkin(ctx) {
  const scene = newScene(ctx, [[0, '#9cc9a0'], [1, '#e9d8b8']]);
  W.setupLights(scene, { sky: '#ffffff', groundCol: '#d9b38c', hemi: 1.4, sunCol: '#fff1dc', sun: 2.6, sunPos: [3, 6, 4], shadow: 3, mapSize: 1024 });
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#7a4a2e'; g.fillRect(0, 0, 512, 512);
  const r = rand(4);
  for (let i = 0; i < 4000; i++) { g.fillStyle = r() > 0.5 ? 'rgba(60,30,15,0.25)' : 'rgba(150,95,60,0.2)'; g.beginPath(); g.arc(r() * 512, r() * 512, 1 + r() * 2.5, 0, Math.PI * 2); g.fill(); }
  const skinTex = new THREE.CanvasTexture(c); skinTex.colorSpace = THREE.SRGBColorSpace; skinTex.wrapS = skinTex.wrapT = THREE.RepeatWrapping; skinTex.repeat.set(3, 2);
  const skin = new THREE.MeshPhysicalMaterial({ map: skinTex, roughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#d39a72'), bumpMap: skinTex, bumpScale: 0.4 });
  const arm = W.add(scene, new THREE.CylinderGeometry(1.4, 1.5, 9, 48), skin, [0, -1.0, 0], [0, 0, Math.PI / 2]);
  const bite = W.add(scene, new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ color: '#e3443a', transparent: true, opacity: 0, depthWrite: false }), [0.25, 0.41, 0.15], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const mq = createMosquito();
  mq.root.scale.setScalar(0.85);
  scene.add(mq.root);
  // virus particles (spiky spheres) appearing at the bite
  const virus = new THREE.Group(); scene.add(virus);
  const vm = new THREE.MeshStandardMaterial({ color: '#e81e27', roughness: 0.4, emissive: '#5a0000' });
  for (let i = 0; i < 5; i++) {
    const v = new THREE.Group();
    W.add(v, new THREE.IcosahedronGeometry(0.09, 1), vm);
    for (let k = 0; k < 10; k++) { const a = k * 2.4, b = k * 0.9; W.add(v, new THREE.ConeGeometry(0.02, 0.07, 5), vm, [Math.cos(a) * Math.sin(b) * 0.1, Math.cos(b) * 0.1, Math.sin(a) * Math.sin(b) * 0.1], [a, b, 0]); }
    virus.add(v);
  }
  const cam = camera(32);
  return { scene, cam, mq, arm, bite, virus };
}

// ---------- inset: the 5 symptom vignettes ----------
export function buildSymptoms(ctx) {
  const scene = newScene(ctx, [[0, '#f4ead8'], [1, '#e7d3b6']]);
  W.setupLights(scene, { sky: '#fff7ec', groundCol: '#c9a27c', hemi: 1.35, sunCol: '#ffe9cc', sun: 2.2, sunPos: [4, 9, 8], shadow: 14, mapSize: 2048 });
  W.add(scene, new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ map: T.tiles([20, 10]), roughness: 0.6 }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const wallMat = new THREE.MeshStandardMaterial({ map: T.plaster([10, 1]), color: '#f1e6cf', roughness: 0.9 });
  W.add(scene, new THREE.PlaneGeometry(80, 6), wallMat, [0, 3, -2.2], [0, 0, 0], [1, 1, 1], false);
  W.add(scene, new THREE.PlaneGeometry(80, 1.4), new THREE.MeshStandardMaterial({ map: T.plaster([10, 1]), color: '#7fc79a', roughness: 0.85 }), [0, 0.7, -2.19], [0, 0, 0], [1, 1, 1], false);
  const set = {};
  // 1. fever: child in bed with a thermometer
  W.bed(scene, [0, 0, -0.6], 0);
  const feverKid = createPerson({ kind: 'boy', skin: '#7a4a2e', top: W.mat('#f2c230', 0.85), bottom: W.mat('#2b4c7e', 0.85), phase: 0.2 });
  feverKid.root.position.set(0, 0.9, 0.1); feverKid.root.rotation.x = -Math.PI / 2 + 0.12;
  scene.add(feverKid.root);
  const therm = W.group(feverKid.head, [0.0, -0.115, 0.2], [-0.35, 0.6, 0]);
  W.add(therm, new THREE.CylinderGeometry(0.014, 0.014, 0.24, 10), W.mat('#ffffff', 0.2), [0, 0, 0.12], [Math.PI / 2, 0, 0]);
  W.add(therm, new THREE.BoxGeometry(0.05, 0.022, 0.09), W.mat('#e81e27', 0.4), [0, 0, 0.26]);
  W.add(therm, new THREE.BoxGeometry(0.036, 0.024, 0.05), W.mat('#cfe8d8', 0.2), [0, 0.003, 0.27]);
  W.add(scene, new THREE.BoxGeometry(1.5, 0.08, 1.2), new THREE.MeshStandardMaterial({ map: T.wax('#4a7fc1', '#ffffff', '#f2c230', [2, 2]), roughness: 0.9 }), [0, 0.98, 0.05]);
  set.fever = { person: feverKid, cam: [0.75, 1.95, 0.05], look: [0, 0.9, -1.0] };
  // 2. headache
  const head = createPerson({ kind: 'man', skin: '#5e3522', top: W.mat('#2f7fd8', 0.85), phase: 0.8 });
  head.root.position.set(4, 0, -0.5); scene.add(head.root);
  set.head = { person: head, cam: [4.25, 2.0, 1.5], look: [4, 1.6, -0.5] };
  // 3. muscle and joint pain
  const joint = createPerson({ kind: 'man', skin: '#4e2b1b', top: W.mat('#7a7f86', 0.85), phase: 1.6 });
  joint.root.position.set(8, 0, -0.5); scene.add(joint.root);
  set.joint = { person: joint, cam: [8.5, 1.8, 1.9], look: [7.95, 1.35, -0.5] };
  // 4. nausea / vomiting
  const nausea = createPerson({ kind: 'boy', skin: '#6b3e26', top: W.mat('#0da255', 0.85), bottom: W.mat('#2f3640', 0.85), phase: 2.4 });
  nausea.root.position.set(12, 0, -0.5); scene.add(nausea.root);
  set.nausea = { person: nausea, cam: [12.3, 1.35, 1.3], look: [12, 0.98, -0.5] };
  // 5. skin rash: forearm close-up
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#7a4a2e'; g.fillRect(0, 0, 512, 512);
  const r = rand(8);
  for (let i = 0; i < 520; i++) { g.fillStyle = `rgba(${215 + r() * 40},${35 + r() * 25},${35 + r() * 20},${0.55 + r() * 0.35})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 7, 3 + r() * 6, r() * 3, 0, Math.PI * 2); g.fill(); }
  const rash = new THREE.CanvasTexture(c); rash.colorSpace = THREE.SRGBColorSpace; rash.wrapS = rash.wrapT = THREE.RepeatWrapping; rash.repeat.set(4, 1);
  W.add(scene, new THREE.CapsuleGeometry(0.28, 2.4, 8, 32), new THREE.MeshPhysicalMaterial({ map: rash, roughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color('#d39a72') }), [16, 0.9, -0.3], [0, 0, Math.PI / 2 - 0.15]);
  W.add(scene, new THREE.BoxGeometry(2.6, 0.5, 1.2), new THREE.MeshStandardMaterial({ map: T.wax('#ffffff', '#0da255', '#e81e27', [2, 1]), roughness: 0.9 }), [16, 0.35, -0.3]);
  W.add(scene, new THREE.SphereGeometry(0.3, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#7a4a2e', roughness: 0.5 }), [17.3, 1.1, -0.3], [0, 0, 0], [1.1, 0.8, 0.9]);
  set.rash = { cam: [16.0, 2.7, 2.6], look: [16.2, 0.7, -0.3] };
  return { scene, set };
}
