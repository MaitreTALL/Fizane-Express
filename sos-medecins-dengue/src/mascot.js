// "Docteur Colombe": the bird-doctor mascot, inspired by the dove of the logo
// and styled after the reference board (white head, green crest and wings,
// big brown eyes, orange beak, white coat over a green tunic).
// Built from primitives; every pose is a pure function of a state object.
import * as THREE from 'three';
import { badge } from './textures.js';
import { lerp, clamp, noise1, smooth } from './core.js';

const WHITE = new THREE.Color('#f6f3ec');
const _q = new THREE.Quaternion(), _t = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
const GREEN = new THREE.Color('#0a9a4f');

function featherBump() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 9) {
    for (let x = (y / 9) % 2 ? 0 : 6; x < 512; x += 12) {
      const grad = g.createRadialGradient(x, y + 2, 1, x, y, 9);
      grad.addColorStop(0, '#a0a0a0'); grad.addColorStop(1, '#6a6a6a');
      g.fillStyle = grad; g.beginPath(); g.arc(x, y, 7, 0, Math.PI); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function irisTexture() {
  // equirectangular map: iris centred on +Z (u = 0.25, v = 0.5)
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#fbfbfb'; g.fillRect(0, 0, 1024, 512);
  const cx = 256, cy = 256, R = 118;
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R);
  grad.addColorStop(0, '#2a1407'); grad.addColorStop(0.42, '#5b2f12'); grad.addColorStop(0.75, '#8a4d1f'); grad.addColorStop(0.93, '#5a2f12'); grad.addColorStop(1, '#2a160a');
  g.fillStyle = grad; g.beginPath(); g.ellipse(cx, cy, R, R, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,200,140,0.18)'; g.lineWidth = 3;
  for (let a = 0; a < Math.PI * 2; a += 0.18) { g.beginPath(); g.moveTo(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52); g.lineTo(cx + Math.cos(a) * 100, cy + Math.sin(a) * 100); g.stroke(); }
  g.fillStyle = '#080605'; g.beginPath(); g.arc(cx, cy, 50, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// tube with a radius that tapers from r0 to r1 along the curve
export function taperTube(points, r0, r1, segs = 24, radial = 10) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, p = curve.getPointAt(u);
    const r = lerp(r0, r1, u) * (i === segs ? 0.05 : 1);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function mesh(geo, mat, parent, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Poses for one wing: shoulder (sx: swing forward(-)/back, sz: raise sideways), elbow bend,
// hand twist (hx, hz) and finger curl (curl: 0 open .. 1 fist with thumb up)
export const POSES = {
  rest:    { sx: 0.05, sz: 0.2, el: 0.3, hz: 0.0, hx: 0, curl: 0.2 },
  explain: { sx: -0.75, sz: 0.4, el: 1.0, hz: 0.2, hx: 0.3, curl: 0.1 },
  present: { sx: -0.55, sz: 1.05, el: 0.4, hz: -0.4, hx: 0.6, curl: 0 },
  point:   { sx: -1.25, sz: 0.75, el: 0.15, hz: 0.0, hx: 0, curl: 0.5 },
  pointUp: { sx: -2.3, sz: 0.5, el: 0.25, hz: 0.0, hx: 0, curl: 0.5 },
  wave:    { sx: -0.35, sz: 2.3, el: 0.75, hz: 0.0, hx: 0, curl: 0 },
  stop:    { sx: -1.4, sz: 0.3, el: 1.15, hz: 0.0, hx: 1.4, curl: 0 },
  head:    { sx: -1.75, sz: 1.0, el: 2.2, hz: 0.3, hx: 0.2, curl: 0.2 },
  chest:   { sx: -0.9, sz: 0.05, el: 1.95, hz: 0.6, hx: 0, curl: 0.3 },
  thumb:   { sx: -1.05, sz: 0.5, el: 1.75, hz: 0.0, hx: -1.45, curl: 1 },
  cheer:   { sx: -2.6, sz: 0.6, el: 0.35, hz: 0.0, hx: 0, curl: 1 },
  belly:   { sx: -0.65, sz: 0.15, el: 1.6, hz: 0.9, hx: 0, curl: 0.2 },
  hold:    { sx: -0.85, sz: 0.35, el: 1.2, hz: 0.0, hx: 0.3, curl: 0.85 },
};

export function blendPose(a, b, k) {
  const out = {};
  for (const key of Object.keys(a)) out[key] = lerp(a[key], b[key] ?? a[key], k);
  return out;
}

export function createMascot(logoImg) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const bump = featherBump();

  const feather = (color, rep = [6, 3], sheenColor = '#ffffff', sheen = 0.9) => {
    const b = bump.clone(); b.repeat.set(...rep); b.needsUpdate = true;
    return new THREE.MeshPhysicalMaterial({ color, roughness: 0.68, sheen, sheenColor: new THREE.Color(sheenColor), sheenRoughness: 0.45, bumpMap: b, bumpScale: 0.6 });
  };
  const whiteF = feather('#f6f3ec');
  const greenF = feather('#0c9a50', [6, 3], '#7fe0a8', 0.5);
  const greenDark = feather('#07773d', [6, 3], '#5cc78a', 0.4);
  const coat = new THREE.MeshPhysicalMaterial({ color: '#fbfbfa', roughness: 0.78, sheen: 0.5, sheenColor: new THREE.Color('#ffffff') });
  const coatShade = new THREE.MeshPhysicalMaterial({ color: '#eef1f2', roughness: 0.8 });
  const tunic = new THREE.MeshStandardMaterial({ color: '#0f9a52', roughness: 0.75 });
  const beakMat = new THREE.MeshPhysicalMaterial({ color: '#f59a16', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const beakLow = new THREE.MeshPhysicalMaterial({ color: '#e5820c', roughness: 0.4, clearcoat: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.35 });
  const metal = new THREE.MeshStandardMaterial({ color: '#d4dade', roughness: 0.2, metalness: 1 });
  const lash = new THREE.MeshStandardMaterial({ color: '#24160d', roughness: 0.5 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: '#6e1d18', roughness: 0.7 });
  const tongueMat = new THREE.MeshStandardMaterial({ color: '#e0646a', roughness: 0.55 });

  // ---- legs + feet
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.17, 0.33, 0); body.add(leg);
    mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.3, 10), beakMat, leg, [0, -0.15, 0]);
    const foot = new THREE.Group(); foot.position.set(0, -0.31, 0.03); leg.add(foot);
    for (const a of [-0.5, 0, 0.5]) mesh(new THREE.CapsuleGeometry(0.034, 0.13, 4, 8), beakMat, foot, [Math.sin(a) * 0.08, 0, Math.cos(a) * 0.08], [Math.PI / 2, 0, -a]);
    legs.push(leg);
  }

  // ---- torso: green tunic + white coat (lathe)
  const torso = new THREE.Group(); torso.position.y = 0.28; body.add(torso);
  mesh(new THREE.SphereGeometry(0.44, 32, 24), tunic, torso, [0, 0.6, 0], [0, 0, 0], [1, 1.12, 0.88]);
  const prof = [[0.0, 0.0], [0.52, 0.0], [0.55, 0.04], [0.53, 0.2], [0.5, 0.45], [0.47, 0.65], [0.44, 0.8], [0.36, 0.92], [0.22, 0.99], [0.0, 1.0]].map(([x, y]) => new THREE.Vector2(x, y));
  // coat open at the front (phi gap around +Z) to show the tunic
  const coatGeo = new THREE.LatheGeometry(prof, 56, 0.17, Math.PI * 2 - 0.34);
  mesh(coatGeo, new THREE.MeshPhysicalMaterial({ color: '#fbfbfa', roughness: 0.78, sheen: 0.5, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide }), torso, [0, 0.04, 0], [0, 0, 0], [1, 1, 0.84]);
  // lapels
  for (const s of [-1, 1]) {
    const lap = new THREE.Shape();
    lap.moveTo(0, 0); lap.lineTo(s * 0.17, 0.02); lap.lineTo(s * 0.12, -0.12); lap.lineTo(s * 0.06, -0.5); lap.lineTo(-s * 0.01, -0.36); lap.closePath();
    mesh(new THREE.ExtrudeGeometry(lap, { depth: 0.02, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }), coatShade, torso, [s * 0.07, 1.0, 0.31], [-0.35, s * 0.25, 0]);
  }
  // coat pockets, pens, badge, buttons
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.2, 0.15, 0.02), coatShade, torso, [s * 0.3, 0.3, 0.37], [-0.05, s * 0.55, 0]);
  mesh(new THREE.BoxGeometry(0.16, 0.12, 0.02), coatShade, torso, [-0.27, 0.72, 0.31], [-0.12, -0.55, 0]);
  mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.13, 8), new THREE.MeshStandardMaterial({ color: '#e81e27', roughness: 0.4 }), torso, [-0.3, 0.8, 0.31], [0, 0, 0.06]);
  mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.13, 8), black, torso, [-0.25, 0.8, 0.325], [0, 0, -0.08]);
  mesh(new THREE.PlaneGeometry(0.17, 0.2125), new THREE.MeshStandardMaterial({ map: badge(logoImg), roughness: 0.45 }), torso, [0.27, 0.7, 0.325], [-0.12, 0.55, 0]);
  for (let i = 0; i < 2; i++) mesh(new THREE.SphereGeometry(0.022, 12, 8), coatShade, torso, [0.12, 0.42 - i * 0.18, 0.42], [0, 0, 0], [1, 1, 0.5]);

  // tail feathers
  for (const a of [-0.35, 0, 0.35]) mesh(new THREE.SphereGeometry(0.12, 16, 10), greenF, torso, [Math.sin(a) * 0.2, 0.16, -0.44], [0.9, a, 0], [0.7, 1.9, 0.35]);

  // ---- stethoscope draped around the neck
  const steth = [[-0.13, 0.62, 0.42], [-0.2, 0.85, 0.36], [-0.27, 1.02, 0.2], [-0.18, 1.08, -0.12], [0.0, 1.1, -0.26], [0.18, 1.08, -0.12], [0.27, 1.02, 0.2], [0.2, 0.8, 0.38], [0.15, 0.55, 0.44]];
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(steth.map((p) => new THREE.Vector3(...p))), 64, 0.019, 8, false), new THREE.MeshStandardMaterial({ color: '#2a2d31', roughness: 0.3 }), torso);
  const cp = new THREE.Group(); cp.position.set(0.15, 0.52, 0.45); cp.rotation.set(0.2, 0, 0); torso.add(cp);
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.028, 28), metal, cp, [0, 0, 0], [Math.PI / 2, 0, 0]);
  mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.032, 28), new THREE.MeshStandardMaterial({ color: '#30343a', roughness: 0.25 }), cp, [0, 0, 0.004], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.13, 8), metal, torso, [-0.13 + s * 0.03, 0.57, 0.43], [0, 0, s * 0.35]);
    mesh(new THREE.SphereGeometry(0.018, 10, 8), black, torso, [-0.13 + s * 0.055, 0.51, 0.43]);
  }

  // ---- head (white with a green cap at the crown and back, via vertex colours)
  const head = new THREE.Group(); head.position.set(0, 1.66, 0.03); body.add(head);
  const headGeo = new THREE.SphereGeometry(0.5, 72, 54);
  const col = [];
  const p = headGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i).normalize();
    const k = smooth((v.y * 0.85 - v.z * 0.75 + 0.05 - 0.12) / 0.16);
    const c = WHITE.clone().lerp(GREEN, k);
    col.push(c.r, c.g, c.b);
  }
  headGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const headMat = feather('#ffffff', [10, 5], '#eafff2', 0.55); headMat.vertexColors = true;
  mesh(headGeo, headMat, head, [0, 0, 0], [0, 0, 0], [1, 0.95, 0.93]);
  // cheek fluff
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.2, 24, 16), whiteF, head, [s * 0.3, -0.2, 0.18], [0, 0, s * 0.4], [1, 0.8, 0.9]);
  // crest: three plump feathers swept back and to the side, like a flame
  const crest = new THREE.Group(); crest.position.set(0, 0.36, 0.02); crest.rotation.set(-0.45, 0, -0.25); crest.scale.set(1, 1, 0.7); head.add(crest);
  for (const [x, len, lean, r] of [[0.0, 1.0, 0.12, 0.12], [-0.1, 0.75, -0.05, 0.095], [0.11, 0.7, 0.3, 0.09]]) {
    const L = len * 0.36;
    const pts = [[x, -0.02, 0.02], [x + lean * 0.3, L * 0.5, 0.03], [x + lean * 0.8 + 0.03, L * 0.9, -0.05], [x + lean * 1.2 + 0.1, L * 1.05, -0.16], [x + lean * 1.4 + 0.18, L * 0.92, -0.24]];
    mesh(taperTube(pts, r, r * 0.3, 24, 14), greenF, crest);
  }
  // blush
  const blushMat = new THREE.MeshStandardMaterial({ color: '#f39a9a', roughness: 0.8, transparent: true, opacity: 0.45, depthWrite: false });
  const blush = [];
  for (const s of [-1, 1]) { const b = mesh(new THREE.SphereGeometry(0.08, 16, 10), blushMat, head, [s * 0.32, -0.12, 0.33], [0, s * 0.75, 0], [1, 0.6, 0.25]); b.castShadow = false; blush.push(b); }

  // ---- eyes: big glossy eyeballs, lids with a dark lash line, green feather brows
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: irisTexture(), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
  const spark = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(s * 0.18, 0.05, 0.37); eye.rotation.y = s * 0.22; head.add(eye);
    const ball = mesh(new THREE.SphereGeometry(0.15, 40, 30), eyeMat, eye);
    ball.castShadow = false;
    // fixed sparkles (do not rotate with the gaze)
    mesh(new THREE.SphereGeometry(0.03, 12, 8), spark, eye, [0.04, 0.05, 0.135], [0, 0, 0], [1, 1, 0.4]).castShadow = false;
    mesh(new THREE.SphereGeometry(0.014, 10, 6), spark, eye, [-0.035, -0.04, 0.14], [0, 0, 0], [1, 1, 0.4]).castShadow = false;
    const lidUp = new THREE.Group(); eye.add(lidUp);
    mesh(new THREE.SphereGeometry(0.158, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), whiteF, lidUp);
    mesh(new THREE.TorusGeometry(0.157, 0.016, 8, 40), lash, lidUp, [0, 0, 0], [Math.PI / 2, 0, 0]);
    for (const a of [0.55, 0.85]) mesh(new THREE.ConeGeometry(0.012, 0.07, 6), lash, lidUp, [s * Math.sin(a) * 0.16, 0.01, Math.cos(a) * 0.16], [0.3, 0, -s * (0.9 + a)]);
    const lidLow = new THREE.Group(); eye.add(lidLow);
    mesh(new THREE.SphereGeometry(0.156, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), whiteF, lidLow, [0, 0, 0], [Math.PI, 0, 0]);
    const brow = mesh(taperTube([[-0.11, 0, 0], [-0.03, 0.035, 0.01], [0.06, 0.03, 0], [0.12, -0.01, -0.02]], 0.03, 0.018, 16, 8), greenF, head, [s * 0.18, 0.25, 0.4], [0, 0, 0], [s, 1, 1]);
    eyes.push({ eye, ball, lidUp, lidLow, brow, s });
  }

  // ---- beak: hooked upper mandible + hinged lower mandible, mouth and tongue
  const beak = new THREE.Group(); beak.position.set(0, -0.12, 0.43); head.add(beak);
  const upper = new THREE.Group(); beak.add(upper);
  mesh(new THREE.ConeGeometry(0.135, 0.36, 32), beakMat, upper, [0, 0.0, 0.13], [Math.PI / 2 + 0.12, 0, 0], [1, 1, 0.6]);
  mesh(new THREE.SphereGeometry(0.125, 24, 16), beakMat, upper, [0, 0.02, -0.03], [0, 0, 0], [1, 0.62, 0.6]);
  const lower = new THREE.Group(); lower.position.set(0, -0.03, -0.02); beak.add(lower);
  mesh(new THREE.ConeGeometry(0.1, 0.21, 28), beakLow, lower, [0, -0.02, 0.09], [Math.PI / 2 - 0.15, 0, 0], [1, 1, 0.42]);
  mesh(new THREE.SphereGeometry(0.1, 20, 14), beakLow, lower, [0, -0.02, 0.0], [0, 0, 0], [1, 0.42, 0.6]);
  mesh(new THREE.SphereGeometry(0.085, 20, 14), mouthMat, beak, [0, -0.025, 0.04], [0, 0, 0], [1, 0.55, 0.9]);
  mesh(new THREE.SphereGeometry(0.05, 16, 10), tongueMat, lower, [0, 0.0, 0.07], [0, 0, 0], [1, 0.45, 1.1]);

  // ---- wings as arms in coat sleeves; green feathered "hands" with a thumb
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(s * 0.42, 1.12, 0.0); body.add(shoulder);
    mesh(new THREE.SphereGeometry(0.13, 18, 12), coat, shoulder);
    mesh(new THREE.CylinderGeometry(0.115, 0.1, 0.34, 18), coat, shoulder, [0, -0.17, 0]);
    const elbow = new THREE.Group(); elbow.position.set(0, -0.32, 0); shoulder.add(elbow);
    mesh(new THREE.SphereGeometry(0.1, 14, 10), coat, elbow);
    mesh(new THREE.CylinderGeometry(0.1, 0.115, 0.26, 18), coat, elbow, [0, -0.13, 0]);
    mesh(new THREE.TorusGeometry(0.108, 0.025, 8, 20), coatShade, elbow, [0, -0.26, 0], [Math.PI / 2, 0, 0]);
    const hand = new THREE.Group(); hand.position.set(0, -0.28, 0); elbow.add(hand);
    mesh(new THREE.SphereGeometry(0.11, 18, 12), greenF, hand, [0, -0.07, 0], [0, 0, 0], [0.9, 1.05, 0.62]);
    const fingers = [];
    for (const [i, x] of [[0, -0.055], [1, 0.0], [2, 0.055]]) {
      const f = new THREE.Group(); f.position.set(x, -0.14, 0.0); hand.add(f);
      mesh(new THREE.CapsuleGeometry(0.036, 0.1, 4, 10), i === 1 ? greenF : greenDark, f, [0, -0.06, 0], [0, 0, (i - 1) * 0.12]);
      fingers.push(f);
    }
    const thumb = new THREE.Group(); thumb.position.set(-s * 0.075, -0.06, 0.04); hand.add(thumb);
    mesh(new THREE.CapsuleGeometry(0.036, 0.09, 4, 10), greenF, thumb, [0, -0.05, 0]);
    arms.push({ shoulder, elbow, hand, fingers, thumb, s });
  }

  // pointer stick (scene 2), hidden by default
  const stick = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.012, 0.018, 1.1, 10), new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.6 }), stick, [0, -0.55, 0]);
  mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: '#e81e27', roughness: 0.4 }), stick, [0, -1.1, 0]);
  stick.visible = false;
  arms[0].hand.add(stick);
  stick.position.set(0, -0.12, 0.04);

  // broom (scene 4, step 5), hidden by default
  const broomG = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 10), new THREE.MeshStandardMaterial({ color: '#a37b3e', roughness: 0.8 }), broomG, [0, -0.3, 0]);
  mesh(new THREE.ConeGeometry(0.2, 0.75, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#d1b066', roughness: 0.95, side: THREE.DoubleSide }), broomG, [0, -1.15, 0], [Math.PI, 0, 0], [1, 1, 0.45]);
  mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 14), new THREE.MeshStandardMaterial({ color: '#b3342e', roughness: 0.6 }), broomG, [0, -0.85, 0], [Math.PI / 2, 0, 0]);
  broomG.visible = false;
  arms[0].hand.add(broomG);
  broomG.position.set(0, -0.1, 0.05);

  // contact shadow
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.006;
  root.add(shadow);

  const sweat = mesh(new THREE.SphereGeometry(0.05, 14, 10), new THREE.MeshPhysicalMaterial({ color: '#9fdcff', roughness: 0.05, transparent: true, opacity: 0.9 }), head, [0.42, 0.2, 0.2], [0, 0, 0], [0.8, 1.3, 0.8]);
  sweat.visible = false;

  /**
   * state: { t, mouth, lean, turn, bob, blink, brow, worry, serious, happy, look:[x,y],
   *          nod, headTurn, tilt, left, right, walk, walking, flush, sweat, scale, stick, broom }
   * "left"/"right" are the mascot's own wings (left wing = screen right when facing camera).
   */
  function update(st) {
    const t = st.t;
    const breathe = Math.sin(t * 2.2) * 0.012;
    const talk = clamp(st.mouth || 0);
    body.position.y = (st.bob || 0) + breathe + (st.walking ? Math.abs(Math.sin((st.walk || 0) * Math.PI)) * 0.05 * st.walking : 0);
    body.rotation.x = st.lean || 0;
    body.rotation.z = (st.sway || 0) + Math.sin(t * 1.3) * 0.012;
    root.rotation.y = st.turn || 0;
    const sc = st.scale ?? 1;
    root.scale.setScalar(Math.max(sc, 0.0001));
    root.visible = sc > 0.001;
    torso.scale.set(1 + breathe * 0.6, 1 - breathe * 0.4, 1 + breathe * 0.6);

    head.rotation.x = (st.nod || 0) - talk * 0.04 + noise1(t * 1.6, 3) * 0.03;
    head.rotation.y = (st.headTurn || 0) + noise1(t * 0.9, 7) * 0.06;
    head.rotation.z = (st.tilt || 0) + noise1(t * 0.7, 11) * 0.04;

    lower.rotation.x = talk * 0.42 + (st.smileOpen || 0) * 0.15;
    upper.rotation.x = -talk * 0.06;

    const ph = (t + 0.7) % 3.4;
    const autoBlink = ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : 0;
    const blink = Math.max(autoBlink, st.blink || 0);
    const happy = st.happy || 0, worry = st.worry || 0, brow = st.brow || 0, serious = st.serious || 0;
    for (const e of eyes) {
      e.lidUp.rotation.x = -1.0 + blink * 1.55 + worry * 0.12 + serious * 0.15 - brow * 0.1;
      e.lidLow.rotation.x = 1.15 - happy * 0.45 - blink * 0.15;
      const lk = st.look || [0, 0];
      e.ball.rotation.y = lk[0] * 0.5;
      e.ball.rotation.x = -lk[1] * 0.4;
      e.brow.position.y = 0.25 + brow * 0.05 + happy * 0.02 - serious * 0.02;
      e.brow.rotation.z = -e.s * (worry * 0.4 - serious * 0.25);
    }
    for (const b of blush) b.material.opacity = 0.3 + happy * 0.3 + (st.flush || 0) * 0.55;
    sweat.visible = (st.sweat || 0) > 0.01;
    if (sweat.visible) {
      sweat.position.y = 0.25 - ((t * 0.35) % 0.3);
      sweat.scale.set(0.8 * st.sweat, 1.3 * st.sweat, 0.8 * st.sweat);
    }
    stick.visible = !!st.stick;
    broomG.visible = !!st.broom;

    const poses = [st.right || POSES.rest, st.left || POSES.rest];
    arms.forEach((a, i) => {
      const pz = poses[i];
      const wob = Math.sin(t * 2 + i) * 0.03;
      a.shoulder.rotation.set(pz.sx + wob, 0, a.s * (pz.sz + 0.02 * Math.sin(t * 1.7 + i)));
      a.elbow.rotation.set(-pz.el, 0, pz.waveAmt ? a.s * Math.sin(t * 9) * pz.waveAmt : 0);
      a.hand.rotation.set(pz.hx || 0, 0, a.s * (pz.hz || 0));
      const curl = pz.curl || 0;
      a.fingers.forEach((f, j) => { f.rotation.x = -curl * (1.9 + j * 0.1); });
      a.thumb.rotation.set(curl * 0.2, 0, a.s * lerp(0.5, -0.15, curl));
      a.thumb.position.set(-a.s * 0.075, lerp(-0.06, -0.02, curl), 0.04);
      a.thumbsUp = curl > 0.8;
    });

    const w = st.walk || 0;
    legs[0].rotation.x = Math.sin(w * Math.PI) * 0.5 * (st.walking || 0);
    legs[1].rotation.x = -Math.sin(w * Math.PI) * 0.5 * (st.walking || 0);

    // thumbs up: fold the feather fingers into a fist and point the thumb at the sky
    if (arms.some((a) => a.thumbsUp)) root.updateMatrixWorld(true);
    for (const a of arms) {
      a.fingers.forEach((f) => f.scale.setScalar(a.thumbsUp ? 0.55 : 1));
      if (!a.thumbsUp) continue;
      a.hand.getWorldQuaternion(_q).invert();
      _t.setFromEuler(_e.set(Math.PI, 0, -a.s * 0.25));
      a.thumb.quaternion.copy(_q.multiply(_t));
      _v.set(-a.s * 0.03, 0.05, 0.05);
      a.hand.getWorldPosition(_w).add(_v);
      a.thumb.position.copy(a.hand.worldToLocal(_w));
      a.thumb.scale.setScalar(1.25);
    }
    for (const a of arms) if (!a.thumbsUp) a.thumb.scale.setScalar(1);
  }

  return { root, update, head, hands: arms.map((a) => a.hand) };
}
