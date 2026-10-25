// Set dressing for Burkina Faso: banco houses, concession walls, trees,
// water containers, health centre, rain... Built from primitives + canvas textures.
import * as THREE from 'three';
import * as T from './textures.js';
import { rand } from './core.js';

export const mat = (color, rough = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

export function add(parent, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale);
  m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function group(parent, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1) {
  const g = new THREE.Group();
  g.position.set(...pos); g.rotation.set(...rot); g.scale.setScalar(scale);
  if (parent) parent.add(g);
  return g;
}

// ---------- lighting / sky ----------
export function setupSky(scene, { stops, fog, fogNear = 25, fogFar = 90 }) {
  scene.background = T.skyGradient(stops);
  if (fog) scene.fog = new THREE.Fog(fog, fogNear, fogFar);
}

export function setupLights(scene, { sky = '#d9efff', groundCol = '#b8683f', hemi = 1.25, sunCol = '#fff0d6', sun = 2.6, sunPos = [6, 10, 7], target = [0, 0, 0], shadow = 8, mapSize = 2048 } = {}) {
  const h = new THREE.HemisphereLight(sky, groundCol, hemi);
  scene.add(h);
  const d = new THREE.DirectionalLight(sunCol, sun);
  d.position.set(...sunPos);
  d.target.position.set(...target);
  scene.add(d.target);
  d.castShadow = true;
  d.shadow.mapSize.set(mapSize, mapSize);
  d.shadow.bias = -0.0004;
  d.shadow.normalBias = 0.02;
  Object.assign(d.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, near: 0.5, far: 60 });
  scene.add(d);
  return { hemi: h, sun: d };
}

export function ground(parent, size = 80, repeat = 10) {
  const g = add(parent, new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: T.laterite([repeat, repeat]), roughness: 0.96 }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  return g;
}

// ---------- architecture ----------
const DOOR_COLORS = ['#1f5fa8', '#0b7d42', '#2a8f9c', '#b3342e', '#5a3d8a'];

export function door(parent, pos, color, w = 0.95, h = 2.15) {
  const g = group(parent, pos);
  add(g, new THREE.BoxGeometry(w + 0.14, h + 0.08, 0.06), mat('#3a3a3a', 0.6, { metalness: 0.4 }), [0, h / 2, -0.01]);
  const m = mat(color, 0.45, { metalness: 0.35 });
  add(g, new THREE.BoxGeometry(w, h, 0.06), m, [0, h / 2, 0.02]);
  for (const y of [0.45, 1.05, 1.65]) add(g, new THREE.BoxGeometry(w * 0.82, 0.05, 0.03), mat(color, 0.35, { metalness: 0.4 }), [0, y, 0.06]);
  add(g, new THREE.SphereGeometry(0.04, 10, 8), mat('#d8d8d8', 0.3, { metalness: 0.8 }), [w * 0.36, 1.05, 0.08]);
  return g;
}

export function windowShutter(parent, pos, color, w = 0.8, h = 0.8) {
  const g = group(parent, pos);
  add(g, new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.05), mat('#3a3a3a', 0.6), [0, 0, -0.01]);
  add(g, new THREE.BoxGeometry(w / 2 - 0.02, h, 0.05), mat(color, 0.45, { metalness: 0.3 }), [-w / 4, 0, 0.02]);
  add(g, new THREE.BoxGeometry(w / 2 - 0.02, h, 0.05), mat(color, 0.45, { metalness: 0.3 }), [w / 4, 0, 0.02]);
  return g;
}

export function house(parent, { pos = [0, 0, 0], rotY = 0, w = 5, d = 4, h = 2.9, roof = 'tin', tone = '#c48e5e', door: dc = DOOR_COLORS[0], doorX = -0.8, win = true, seed = 1 } = {}) {
  const g = group(parent, pos, [0, rotY, 0]);
  const wallMat = new THREE.MeshStandardMaterial({ map: T.banco([w / 3, h / 3], tone), roughness: 0.95 });
  add(g, new THREE.BoxGeometry(w, h, d), wallMat, [0, h / 2, 0]);
  add(g, new THREE.BoxGeometry(w + 0.06, 0.3, d + 0.06), mat('#8d6b55', 0.95), [0, 0.15, 0]);
  door(g, [doorX, 0, d / 2 + 0.01], dc);
  if (win) windowShutter(g, [doorX + 1.7 > w / 2 - 0.6 ? doorX - 1.6 : doorX + 1.7, 1.55, d / 2 + 0.01], dc);
  const r = rand(seed);
  if (roof === 'tin') {
    const tinMat = new THREE.MeshStandardMaterial({ map: T.tin([w / 1.2, 1]), roughness: 0.45, metalness: 0.6 });
    add(g, new THREE.BoxGeometry(w + 0.5, 0.05, d + 0.7), tinMat, [0, h + 0.18, 0.1], [0.09, 0, 0]);
    for (let i = 0; i < 5; i++) add(g, new THREE.DodecahedronGeometry(0.13 + r() * 0.08, 0), mat('#7a6a5c', 0.9), [(r() - 0.5) * w * 0.8, h + 0.32, (r() - 0.5) * d * 0.6]);
  } else {
    const capMat = new THREE.MeshStandardMaterial({ map: T.banco([w / 3, 0.3], tone), roughness: 0.95 });
    for (const [x, z, sx, sz] of [[0, d / 2, w, 0.22], [0, -d / 2, w, 0.22], [w / 2, 0, 0.22, d], [-w / 2, 0, 0.22, d]]) add(g, new THREE.BoxGeometry(sx, 0.32, sz), capMat, [x, h + 0.16, z]);
    for (const x of [-w / 3, w / 3]) add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), mat('#8a8a8a', 0.5, { metalness: 0.5 }), [x, h - 0.05, d / 2 + 0.3], [Math.PI / 2 - 0.2, 0, 0]);
  }
  return g;
}

export function wall(parent, { pos = [0, 0, 0], rotY = 0, len = 8, h = 2.0, tone = '#c9925f' } = {}) {
  const g = group(parent, pos, [0, rotY, 0]);
  add(g, new THREE.BoxGeometry(len, h, 0.26), new THREE.MeshStandardMaterial({ map: T.banco([len / 3, h / 3], tone), roughness: 0.95 }), [0, h / 2, 0]);
  add(g, new THREE.BoxGeometry(len, 0.1, 0.34), mat('#a8774f', 0.9), [0, h + 0.05, 0]);
  return g;
}

export function gate(parent, pos, rotY = 0, color = '#1f5fa8') {
  const g = group(parent, pos, [0, rotY, 0]);
  for (const s of [-1, 1]) {
    add(g, new THREE.BoxGeometry(1.2, 2.0, 0.06), mat(color, 0.45, { metalness: 0.4 }), [s * 0.61, 1.0, 0]);
    for (const y of [0.4, 1.0, 1.6]) add(g, new THREE.BoxGeometry(1.0, 0.05, 0.03), mat(color, 0.35, { metalness: 0.4 }), [s * 0.61, y, 0.04]);
  }
  return g;
}

// ---------- vegetation ----------
export function tree(parent, { pos = [0, 0, 0], h = 4.5, r = 2.2, seed = 3, leaf = ['#3f8a2e', '#4f9b37', '#2f7425', '#5aa63d'] } = {}) {
  const g = group(parent, pos);
  const rr = rand(seed);
  const bark = mat('#6b4a32', 0.95);
  add(g, new THREE.CylinderGeometry(0.16, 0.26, h * 0.6, 10), bark, [0, h * 0.3, 0]);
  for (let i = 0; i < 3; i++) {
    const a = rr() * Math.PI * 2;
    add(g, new THREE.CylinderGeometry(0.06, 0.11, h * 0.35, 8), bark, [Math.cos(a) * 0.35, h * 0.62, Math.sin(a) * 0.35], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]);
  }
  const leafMats = leaf.map((c) => mat(c, 0.85));
  for (let i = 0; i < 11; i++) {
    const a = rr() * Math.PI * 2, d = rr() * r * 0.7;
    const s = r * (0.45 + rr() * 0.35);
    add(g, new THREE.IcosahedronGeometry(s, 2), leafMats[i % leafMats.length], [Math.cos(a) * d, h * 0.72 + rr() * h * 0.28, Math.sin(a) * d], [rr(), rr(), rr()], [1, 0.75, 1]);
  }
  return g;
}

export function grassTuft(parent, pos, s = 1, seed = 5) {
  const g = group(parent, pos, [0, 0, 0], s);
  const r = rand(seed);
  const m = [mat('#6f9a35', 0.9), mat('#8aac44', 0.9), mat('#5b8a2c', 0.9)];
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    add(g, new THREE.ConeGeometry(0.035, 0.5 + r() * 0.4, 4), m[i % 3], [Math.cos(a) * 0.12, 0.3, Math.sin(a) * 0.12], [(r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6], [1, 1, 1], false);
  }
  return g;
}

// ---------- containers that hold water ----------
export const waterMat = () => new THREE.MeshStandardMaterial({ color: '#557a69', roughness: 0.05, metalness: 0.2, envMapIntensity: 1.6 });

export function canari(parent, pos, { s = 1, lid = false, broken = false } = {}) {
  const g = group(parent, pos, [0, 0, 0], s);
  const prof = [[0.0, 0], [0.12, 0.01], [0.28, 0.12], [0.33, 0.27], [0.3, 0.42], [0.2, 0.53], [0.17, 0.58], [0.21, 0.62], [0.19, 0.63]].map(([x, y]) => new THREE.Vector2(x, y));
  const clay = mat('#b4552e', 0.85);
  add(g, new THREE.LatheGeometry(prof, 32, 0, broken ? Math.PI * 1.25 : Math.PI * 2), new THREE.MeshStandardMaterial({ color: '#b4552e', roughness: 0.85, side: THREE.DoubleSide }));
  add(g, new THREE.TorusGeometry(0.29, 0.012, 6, 32), mat('#8a3c1f', 0.9), [0, 0.35, 0], [Math.PI / 2, 0, 0]);
  const water = add(g, new THREE.CircleGeometry(broken ? 0.27 : 0.18, 28), waterMat(), [0, broken ? 0.2 : 0.55, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  let lidMesh = null;
  if (lid !== false) {
    lidMesh = group(g, [0, 0.64, 0]);
    add(lidMesh, new THREE.CylinderGeometry(0.25, 0.25, 0.04, 28), mat('#c9a77a', 0.7));
    add(lidMesh, new THREE.SphereGeometry(0.05, 12, 8), mat('#a8875a', 0.7), [0, 0.04, 0]);
  }
  void clay;
  return { g, water, lid: lidMesh };
}

export function barrel(parent, pos, { color = '#1f5fa8', lid = false, s = 1 } = {}) {
  const g = group(parent, pos, [0, 0, 0], s);
  const m = mat(color, 0.35);
  add(g, new THREE.CylinderGeometry(0.38, 0.36, 1.0, 32, 1, true), new THREE.MeshStandardMaterial({ color, roughness: 0.35, side: THREE.DoubleSide }), [0, 0.5, 0]);
  add(g, new THREE.CircleGeometry(0.36, 32), m, [0, 0.02, 0], [-Math.PI / 2, 0, 0]);
  for (const y of [0.3, 0.7, 0.99]) add(g, new THREE.TorusGeometry(0.385, 0.022, 8, 32), m, [0, y, 0], [Math.PI / 2, 0, 0]);
  const water = add(g, new THREE.CircleGeometry(0.37, 32), waterMat(), [0, 0.88, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const lidG = group(g, [0, 1.03, 0]);
  add(lidG, new THREE.CylinderGeometry(0.42, 0.42, 0.06, 32), mat(color, 0.4));
  add(lidG, new THREE.CylinderGeometry(0.4, 0.4, 0.08, 32, 1, true), mat(color, 0.4), [0, -0.05, 0]);
  lidG.visible = lid;
  return { g, water, lid: lidG };
}

export function bucket(parent, pos, { color = '#e8b21c', s = 1, water = true } = {}) {
  const g = group(parent, pos, [0, 0, 0], s);
  add(g, new THREE.CylinderGeometry(0.24, 0.18, 0.4, 28, 1, true), new THREE.MeshStandardMaterial({ color, roughness: 0.4, side: THREE.DoubleSide }), [0, 0.2, 0]);
  add(g, new THREE.CircleGeometry(0.18, 28), mat(color, 0.4), [0, 0.01, 0], [-Math.PI / 2, 0, 0]);
  add(g, new THREE.TorusGeometry(0.24, 0.015, 6, 28), mat(color, 0.4), [0, 0.4, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.TorusGeometry(0.24, 0.008, 6, 20, Math.PI), mat('#777', 0.4, { metalness: 0.7 }), [0, 0.4, 0], [0, 0, 0]);
  const w = water ? add(g, new THREE.CircleGeometry(0.225, 28), waterMat(), [0, 0.33, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false) : null;
  return { g, water: w };
}

export function basin(parent, pos, { color = '#d6336c', s = 1, water = true } = {}) {
  const g = group(parent, pos, [0, 0, 0], s);
  add(g, new THREE.CylinderGeometry(0.45, 0.3, 0.2, 32, 1, true), new THREE.MeshStandardMaterial({ color, roughness: 0.4, side: THREE.DoubleSide }), [0, 0.1, 0]);
  add(g, new THREE.CircleGeometry(0.3, 28), mat(color, 0.4), [0, 0.005, 0], [-Math.PI / 2, 0, 0]);
  add(g, new THREE.TorusGeometry(0.45, 0.02, 6, 32), mat(color, 0.4), [0, 0.2, 0], [Math.PI / 2, 0, 0]);
  const w = water ? add(g, new THREE.CircleGeometry(0.41, 32), waterMat(), [0, 0.15, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false) : null;
  return { g, water: w };
}

export function tire(parent, pos, { s = 1, water = true, rot = [0, 0, 0] } = {}) {
  const g = group(parent, pos, rot, s);
  add(g, new THREE.TorusGeometry(0.34, 0.14, 14, 32), mat('#1c1c1c', 0.75), [0, 0.14, 0], [Math.PI / 2, 0, 0]);
  const w = water ? add(g, new THREE.CircleGeometry(0.3, 28), waterMat(), [0, 0.1, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false) : null;
  return { g, water: w };
}

export function jerrycan(parent, pos, { color = '#f0c419', rotY = 0, s = 1 } = {}) {
  const g = group(parent, pos, [0, rotY, 0], s);
  add(g, new THREE.BoxGeometry(0.34, 0.48, 0.2), mat(color, 0.4), [0, 0.24, 0]);
  add(g, new THREE.TorusGeometry(0.07, 0.025, 6, 12, Math.PI), mat(color, 0.4), [0.04, 0.48, 0]);
  add(g, new THREE.CylinderGeometry(0.04, 0.04, 0.07, 10), mat('#d94b2b', 0.5), [-0.11, 0.51, 0]);
  return g;
}

export function can(parent, pos, rot = [0, 0, 0], color = '#c0392b') {
  const g = group(parent, pos, rot);
  add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.18, 14), mat('#b9b9b9', 0.3, { metalness: 0.8 }), [0, 0.09, 0]);
  add(g, new THREE.CylinderGeometry(0.072, 0.072, 0.1, 14), mat(color, 0.5), [0, 0.09, 0]);
  return g;
}

export function puddle(parent, pos, { w = 1.4, d = 0.9, seed = 2 } = {}) {
  const r = rand(seed);
  const shape = new THREE.Shape();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, k = 0.75 + r() * 0.3;
    const x = Math.cos(a) * w * 0.5 * k, y = Math.sin(a) * d * 0.5 * k;
    i ? shape.lineTo(x, y) : shape.moveTo(x, y);
  }
  const m = add(parent, new THREE.ShapeGeometry(shape), waterMat(), [pos[0], 0.012, pos[2]], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  return m;
}

// expanding ripple rings on a water surface
export function ripples(parent, pos, r = 0.25, n = 3) {
  const g = group(parent, pos);
  const rings = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32), new THREE.MeshBasicMaterial({ color: '#dff3ff', transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    g.add(m); rings.push(m);
  }
  return {
    g,
    update(t, on = 1) {
      rings.forEach((m, i) => {
        const p = ((t * 0.7 + i / n) % 1);
        m.scale.setScalar(0.02 + p * r);
        m.material.opacity = (1 - p) * 0.55 * on;
      });
    },
  };
}

// ---------- rain + clouds ----------
export function rain(parent, { count = 1600, area = [16, 12, 14], center = [0, 0, 0] } = {}) {
  const r = rand(77);
  const pos = new Float32Array(count * 6);
  const seeds = [];
  for (let i = 0; i < count; i++) seeds.push([r() * area[0] - area[0] / 2, r(), r() * area[2] - area[2] / 2, 0.8 + r() * 0.4]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#d8e8f5', transparent: true, opacity: 0.55 }));
  m.position.set(...center);
  m.frustumCulled = false;
  parent.add(m);
  return {
    m,
    update(t, intensity = 1) {
      const H = area[1];
      const shown = Math.floor(count * intensity);
      for (let i = 0; i < count; i++) {
        const [x, y0, z, sp] = seeds[i];
        const y = H - ((y0 * H + t * 9 * sp) % H);
        const o = i * 6;
        const visible = i < shown;
        pos[o] = x; pos[o + 1] = visible ? y : -50; pos[o + 2] = z;
        pos[o + 3] = x + 0.02; pos[o + 4] = visible ? y - 0.38 : -50; pos[o + 5] = z;
      }
      geo.attributes.position.needsUpdate = true;
      m.material.opacity = 0.55 * Math.min(1, intensity * 2);
    },
  };
}

export function cloud(parent, pos, s = 1, color = '#f4f6f8') {
  const g = group(parent, pos, [0, 0, 0], s);
  const m = mat(color, 1);
  for (const [x, y, z, r] of [[0, 0, 0, 1.6], [1.6, -0.3, 0.2, 1.2], [-1.6, -0.35, 0, 1.1], [0.7, 0.7, -0.3, 1.1], [-0.8, 0.5, 0.2, 1.0]]) add(g, new THREE.SphereGeometry(r, 18, 12), m, [x, y, z], [0, 0, 0], [1, 0.8, 0.9], false);
  return g;
}

// ---------- props for the prevention scene ----------
export function trashBin(parent, pos, color = '#0b7d42') {
  const g = group(parent, pos);
  add(g, new THREE.CylinderGeometry(0.42, 0.36, 1.0, 24, 1, true), new THREE.MeshStandardMaterial({ color, roughness: 0.5, side: THREE.DoubleSide }), [0, 0.5, 0]);
  add(g, new THREE.CircleGeometry(0.36, 24), mat(color, 0.5), [0, 0.02, 0], [-Math.PI / 2, 0, 0]);
  add(g, new THREE.TorusGeometry(0.42, 0.03, 8, 24), mat(color, 0.5), [0, 1.0, 0], [Math.PI / 2, 0, 0]);
  const lid = group(g, [0, 1.02, -0.42]);
  add(lid, new THREE.CylinderGeometry(0.45, 0.45, 0.05, 24), mat(color, 0.5), [0, 0, 0.42]);
  lid.rotation.x = -1.6;
  return { g, lid };
}

export function bed(parent, pos, rotY = 0) {
  const g = group(parent, pos, [0, rotY, 0]);
  const wood = new THREE.MeshStandardMaterial({ map: T.wood([1, 1], '#7a4d2b'), roughness: 0.8 });
  add(g, new THREE.BoxGeometry(1.6, 0.35, 2.1), wood, [0, 0.35, 0]);
  for (const [x, z] of [[-0.75, -1.0], [0.75, -1.0], [-0.75, 1.0], [0.75, 1.0]]) add(g, new THREE.BoxGeometry(0.1, 0.4, 0.1), wood, [x, 0.12, z]);
  add(g, new THREE.BoxGeometry(1.5, 0.2, 2.0), mat('#f2f2f2', 0.9), [0, 0.62, 0]);
  add(g, new THREE.BoxGeometry(1.52, 0.12, 1.3), new THREE.MeshStandardMaterial({ map: T.wax('#e9a23b', '#0b7d42', '#b3342e', [2, 2]), roughness: 0.9 }), [0, 0.74, 0.32]);
  add(g, new THREE.BoxGeometry(0.6, 0.14, 0.35), mat('#ffffff', 0.9), [-0.35, 0.78, -0.75]);
  add(g, new THREE.BoxGeometry(0.6, 0.14, 0.35), mat('#ffffff', 0.9), [0.35, 0.78, -0.75]);
  return g;
}

let netTex = null;
export function mosquitoNet(parent, pos) {
  if (!netTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2;
    for (let i = 0; i <= 64; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); }
    netTex = new THREE.CanvasTexture(c); netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping; netTex.repeat.set(30, 14);
  }
  const g = group(parent, pos);
  const m = new THREE.MeshStandardMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1, color: '#ffffff' });
  const net = add(g, new THREE.CylinderGeometry(0.25, 1.45, 2.4, 40, 1, true), m, [0, 1.2, 0], [0, 0, 0], [1, 1, 1.25], false);
  add(g, new THREE.TorusGeometry(0.25, 0.02, 6, 20), mat('#dddddd', 0.6), [0, 2.4, 0], [Math.PI / 2, 0, 0], [1, 1.25, 1], false);
  return { g, net };
}

// ---------- health centre (CSPS-style building) ----------
export function healthCentre(parent, pos, rotY = 0) {
  const g = group(parent, pos, [0, rotY, 0]);
  const W = 13, D = 5.5, H = 3.4;
  const wallMat = new THREE.MeshStandardMaterial({ map: T.plaster([4, 1]), color: '#f6edd8', roughness: 0.9 });
  add(g, new THREE.BoxGeometry(W, 0.35, D + 3.2), mat('#b9b3a6', 0.9), [0, 0.175, 1.2]);
  add(g, new THREE.BoxGeometry(W, H, D), wallMat, [0, 0.35 + H / 2, -0.4]);
  add(g, new THREE.BoxGeometry(W + 0.02, 1.0, D + 0.02), mat('#0da255', 0.7), [0, 0.35 + 0.5, -0.4]);
  add(g, new THREE.BoxGeometry(W + 0.02, 0.1, D + 0.02), mat('#e81e27', 0.6), [0, 0.35 + 1.05, -0.4]);
  // veranda roof on pillars
  add(g, new THREE.BoxGeometry(W + 0.6, 0.28, 3.4), mat('#f2f2f2', 0.85), [0, 0.35 + H + 0.14, 2.6 - 0.4]);
  add(g, new THREE.BoxGeometry(W + 0.6, 0.1, 3.42), mat('#0da255', 0.7), [0, 0.35 + H - 0.0, 2.6 - 0.4]);
  for (let i = 0; i < 6; i++) {
    const x = -W / 2 + 0.5 + i * ((W - 1) / 5);
    add(g, new THREE.BoxGeometry(0.32, H, 0.32), mat('#ffffff', 0.85), [x, 0.35 + H / 2, 3.8]);
    add(g, new THREE.BoxGeometry(0.34, 0.9, 0.34), mat('#0da255', 0.7), [x, 0.35 + 0.45, 3.8]);
  }
  // sign board above the veranda
  const sign = group(g, [0, 0.35 + H + 0.62, 3.98]);
  add(sign, new THREE.BoxGeometry(5.2, 1.42, 0.12), mat('#2b2b2b', 0.6), [0, 0, -0.07]);
  add(sign, new THREE.PlaneGeometry(5.0, 1.25), new THREE.MeshStandardMaterial({ map: T.healthSign(), roughness: 0.6 }), [0, 0, 0.0], [0, 0, 0], [1, 1, 1], false);
  // doors + windows with grilles
  const front = D / 2 - 0.4 + 0.01;
  door(g, [-0.55, 0.35, front], '#1f5fa8', 1.0, 2.3);
  door(g, [0.55, 0.35, front], '#1f5fa8', 1.0, 2.3);
  for (const x of [-4.6, -2.6, 2.6, 4.6]) {
    const wg = group(g, [x, 0.35 + 1.9, front]);
    add(wg, new THREE.BoxGeometry(1.3, 1.1, 0.05), mat('#3a4b57', 0.3, { metalness: 0.3 }));
    for (let k = -2; k <= 2; k++) add(wg, new THREE.BoxGeometry(0.03, 1.1, 0.04), mat('#d8d8d8', 0.4, { metalness: 0.6 }), [k * 0.25, 0, 0.04]);
    add(wg, new THREE.BoxGeometry(1.42, 0.08, 0.12), mat('#ffffff', 0.8), [0, -0.6, 0.04]);
  }
  // bench + covered drinking-water jar on the veranda
  const bench = group(g, [-3.6, 0.35, 2.2]);
  const wood = new THREE.MeshStandardMaterial({ map: T.wood([2, 1]), roughness: 0.8 });
  add(bench, new THREE.BoxGeometry(2.4, 0.08, 0.45), wood, [0, 0.48, 0]);
  for (const x of [-1.05, 1.05]) add(bench, new THREE.BoxGeometry(0.08, 0.48, 0.4), wood, [x, 0.24, 0]);
  canari(g, [3.4, 0.35, 2.6], { s: 1.05, lid: true });
  return { g, H };
}
