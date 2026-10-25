// Aedes mosquito: black body with white bands, white lyre on the thorax,
// banded legs, transparent wings. Model length ~1 unit (scale it down to fly around).
import * as THREE from 'three';
import { aedesBands } from './textures.js';

function lyreTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#121212'; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#f2f2f2'; g.lineWidth = 10; g.lineCap = 'round';
  // lyre: two outer curves + two inner lines, centred on u = 0.25 (front-up)
  g.beginPath(); g.moveTo(100, 60); g.bezierCurveTo(70, 120, 90, 190, 125, 210); g.stroke();
  g.beginPath(); g.moveTo(156, 60); g.bezierCurveTo(186, 120, 166, 190, 131, 210); g.stroke();
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(118, 80); g.lineTo(120, 190); g.stroke();
  g.beginPath(); g.moveTo(138, 80); g.lineTo(136, 190); g.stroke();
  g.fillStyle = '#f2f2f2';
  for (const [x, y] of [[40, 130], [216, 130], [300, 100], [460, 100]]) { g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const shared = {};
function materials() {
  if (shared.body) return shared;
  shared.body = new THREE.MeshPhysicalMaterial({ color: '#1a1a1a', roughness: 0.45, clearcoat: 0.4 });
  shared.thorax = new THREE.MeshPhysicalMaterial({ map: lyreTexture(), roughness: 0.5, clearcoat: 0.3 });
  const bands = aedesBands(7);
  shared.abdomen = new THREE.MeshPhysicalMaterial({ map: bands, roughness: 0.45, clearcoat: 0.3 });
  const legBands = aedesBands(5).clone(); legBands.repeat.set(1, 1); legBands.needsUpdate = true;
  shared.leg = new THREE.MeshStandardMaterial({ map: legBands, roughness: 0.5 });
  shared.wing = new THREE.MeshPhysicalMaterial({ color: '#cfe3f2', roughness: 0.15, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false, iridescence: 0.8 });
  shared.eye = new THREE.MeshPhysicalMaterial({ color: '#2b2016', roughness: 0.2, clearcoat: 1 });
  return shared;
}

export function createMosquito() {
  const m = materials();
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const add = (geo, mat, parent, pos, rot = [0, 0, 0], sc = [1, 1, 1]) => {
    const o = new THREE.Mesh(geo, mat); o.position.set(...pos); o.rotation.set(...rot); o.scale.set(...sc);
    o.castShadow = true; parent.add(o); return o;
  };
  // body axis along +Z (head forward)
  const thorax = add(new THREE.SphereGeometry(0.12, 24, 18), m.thorax, body, [0, 0.0, 0.05], [0, 0, 0], [0.9, 0.95, 1.2]);
  void thorax;
  const abdMat = m.abdomen.clone();
  const abdomen = add(new THREE.SphereGeometry(0.1, 24, 18), abdMat, body, [0, 0.03, -0.28], [Math.PI / 2 + 0.25, 0, 0], [0.75, 2.5, 0.7]);
  add(new THREE.SphereGeometry(0.075, 18, 14), m.body, body, [0, -0.02, 0.22]);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.05, 16, 12), m.eye, body, [s * 0.045, 0.0, 0.25]);
  add(new THREE.CylinderGeometry(0.006, 0.012, 0.34, 8), m.body, body, [0, -0.1, 0.37], [-1.1, 0, 0]);   // proboscis
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.004, 0.007, 0.26, 6), m.leg, body, [s * 0.04, 0.06, 0.34], [-0.4, 0, s * 0.35]);  // antennae
    add(new THREE.CylinderGeometry(0.007, 0.008, 0.12, 6), m.body, body, [s * 0.02, -0.06, 0.3], [-1.0, 0, s * 0.1]);  // palps
  }
  // legs: 3 pairs, front/mid splay forward, hind legs curl up (Aedes posture)
  // yaw: 0 = forward, PI = backward; bends: [femur, knee, ankle] (negative = downward)
  const legDefs = [[0.11, 0.55, [0.35, -1.25, -0.35], 0.9], [0.05, 1.55, [0.4, -1.35, -0.3], 1.0], [-0.02, 2.55, [0.65, 0.35, 0.9], 1.1]];
  for (const [z, yaw, [b0, b1, b2], len] of legDefs) {
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * 0.06, -0.06, z); body.add(hip);
      hip.rotation.y = Math.atan2(-Math.cos(yaw), s * Math.sin(yaw));
      const femur = new THREE.Group(); femur.rotation.z = b0; hip.add(femur);
      add(new THREE.CylinderGeometry(0.009, 0.011, 0.38 * len, 6), m.leg, femur, [0.19 * len, 0, 0], [0, 0, Math.PI / 2]);
      const knee = new THREE.Group(); knee.position.x = 0.38 * len; knee.rotation.z = b1; femur.add(knee);
      add(new THREE.CylinderGeometry(0.007, 0.009, 0.45 * len, 6), m.leg, knee, [0.225 * len, 0, 0], [0, 0, Math.PI / 2]);
      const ankle = new THREE.Group(); ankle.position.x = 0.45 * len; ankle.rotation.z = b2; knee.add(ankle);
      add(new THREE.CylinderGeometry(0.005, 0.007, 0.4 * len, 6), m.leg, ankle, [0.2 * len, 0, 0], [0, 0, Math.PI / 2]);
    }
  }
  // wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.bezierCurveTo(0.08, 0.05, 0.5, 0.07, 0.62, 0.0); wingShape.bezierCurveTo(0.5, -0.06, 0.1, -0.04, 0, 0);
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * 0.05, 0.1, 0.04); body.add(w);
    const wm = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), m.wing);
    wm.rotation.set(-Math.PI / 2, 0, 0);
    wm.scale.x = s;
    w.add(wm);
    wings.push({ w, s });
  }

  function update(t, { flap = 1, fed = 0, rest = 0 } = {}) {
    const a = Math.sin(t * 2 * Math.PI * 18) * 0.9 * flap;
    for (const { w, s } of wings) {
      // folded back along the abdomen at rest, beating when flying
      w.rotation.set(0, s * (rest ? -2.75 : -2.2 + Math.cos(t * 2 * Math.PI * 18) * 0.25 * flap), s * (rest ? 0.12 : a * 0.6));
    }
    abdomen.scale.set(0.75 + fed * 0.35, 2.5 + fed * 0.4, 0.7 + fed * 0.35);
    abdMat.color.setRGB(1, 1 - fed * 0.65, 1 - fed * 0.7);
    body.rotation.z = Math.sin(t * 5) * 0.04 * flap;
  }
  update(0);
  return { root, update };
}
