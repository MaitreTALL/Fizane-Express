// Stylised Burkinabè characters (family, patients, passers-by).
// Same approach as the mascot: primitives + a pose/expression state.
import * as THREE from 'three';
import { irisTexture, taperTube } from './mascot.js';
import { lerp, clamp, noise1 } from './core.js';

let iris = null;
const _q = new THREE.Quaternion(), _t = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
let hairBump = null;

function hairTexture() {
  if (hairBump) return hairBump;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#777'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3500; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    g.fillStyle = Math.random() > 0.5 ? '#aaa' : '#444';
    g.beginPath(); g.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2); g.fill();
  }
  hairBump = new THREE.CanvasTexture(c); hairBump.wrapS = hairBump.wrapT = THREE.RepeatWrapping; hairBump.repeat.set(4, 2);
  return hairBump;
}

function mesh(geo, mat, parent, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

export const PPOSE = {
  rest:   { sx: 0.05, sz: 0.12, el: 0.2, hx: 0, hz: 0, curl: 0.4 },
  wave:   { sx: -0.3, sz: 2.4, el: 0.6, hx: 0, hz: 0, curl: 0 },
  thumb:  { sx: -1.0, sz: 0.4, el: 1.6, hx: -1.4, hz: 0, curl: 1 },
  head:   { sx: -2.3, sz: 0.55, el: 2.0, hx: 0.3, hz: 0.4, curl: 0.2 },
  temple: { sx: -2.3, sz: 0.45, el: 2.05, hx: 0.2, hz: 0.5, curl: 0.3 },
  shoulder: { sx: -1.25, sz: -0.75, el: 1.9, hx: 0, hz: 0.5, curl: 0.3 },
  mouth:  { sx: -1.6, sz: -0.35, el: 1.55, hx: 0.3, hz: 0.6, curl: 0.4 },
  belly:  { sx: -0.75, sz: 0.1, el: 1.5, hx: 0, hz: 0.9, curl: 0.3 },
  hug:    { sx: -0.5, sz: 0.9, el: 0.9, hx: 0, hz: 0, curl: 0.3 },
  hold:   { sx: -0.55, sz: 0.2, el: 1.1, hx: 0.3, hz: 0.2, curl: 0.8 },
  side:   { sx: 0.0, sz: 0.5, el: 0.5, hx: 0, hz: 0, curl: 0.4 },
  lying:  { sx: -0.2, sz: 0.25, el: 0.4, hx: 0, hz: 0, curl: 0.4 },
};

const SKINS = ['#6b3e26', '#5a3220', '#7a4a2e', '#4e2b1b'];

/**
 * opts: { kind: 'man'|'woman'|'boy'|'girl', skin, top: Material, bottom: Material, wrap: Material,
 *         sleeves: bool }
 */
export function createPerson(opts = {}) {
  const kind = opts.kind || 'man';
  const kid = kind === 'boy' || kind === 'girl';
  const S = kid ? 0.66 : 1;            // body scale
  const headR = kid ? 0.25 : 0.23;
  const skinCol = opts.skin || SKINS[0];
  const skin = new THREE.MeshPhysicalMaterial({ color: skinCol, roughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#c98b62'), sheenRoughness: 0.6 });
  const top = opts.top || new THREE.MeshStandardMaterial({ color: '#2b6cb0', roughness: 0.85 });
  const bottom = opts.bottom || new THREE.MeshStandardMaterial({ color: '#2f3640', roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1b120c', roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: '#15100c', roughness: 0.95, bumpMap: hairTexture(), bumpScale: 1.5 });
  if (!iris) iris = irisTexture();
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: iris, roughness: 0.12, clearcoat: 1 });
  const spark = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const legLen = 0.82 * S;

  // legs + sandals
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.12 * S, legLen, 0); body.add(hip);
    mesh(new THREE.CapsuleGeometry(0.085 * S, legLen * 0.75, 4, 10), kind === 'woman' ? skin : bottom, hip, [0, -legLen * 0.45, 0]);
    mesh(new THREE.CapsuleGeometry(0.065 * S, 0.14 * S, 4, 8), dark, hip, [0, -legLen + 0.04, 0.06 * S], [Math.PI / 2, 0, 0]);
    legs.push(hip);
  }
  if (kind === 'boy') for (const s of [-1, 1]) mesh(new THREE.CapsuleGeometry(0.075 * S, 0.25 * S, 4, 8), skin, legs[(s + 1) / 2], [0, -legLen * 0.62, 0]);

  // torso
  const torso = new THREE.Group(); torso.position.y = legLen; body.add(torso);
  const torsoH = 0.62 * S;
  mesh(new THREE.CapsuleGeometry(0.25 * S, torsoH * 0.6, 6, 16), top, torso, [0, torsoH * 0.55, 0], [0, 0, 0], [1, 1, 0.72]);
  if (kind === 'woman') {
    const prof = [[0.0, 0], [0.38, 0], [0.33, 0.35], [0.27, 0.7], [0.24, 0.9]].map(([x, y]) => new THREE.Vector2(x, y * legLen));
    mesh(new THREE.LatheGeometry(prof, 32), opts.bottom || top, body, [0, 0.06, 0], [0, 0, 0], [1, 1, 0.8]);
  } else if (kind === 'girl') {
    const prof = [[0.0, 0], [0.32 * S, 0], [0.27 * S, 0.4], [0.22 * S, 0.62]].map(([x, y]) => new THREE.Vector2(x, y));
    mesh(new THREE.LatheGeometry(prof, 32), top, body, [0, legLen - 0.4, 0], [0, 0, 0], [1, 1, 0.8]);
  } else {
    mesh(new THREE.CapsuleGeometry(0.235 * S, 0.12 * S, 6, 16), bottom, torso, [0, 0.02, 0], [0, 0, 0], [1, 1, 0.72]);
  }
  mesh(new THREE.CylinderGeometry(0.07 * S, 0.08 * S, 0.14 * S, 12), skin, torso, [0, torsoH + 0.13 * S, 0]);

  // head
  const head = new THREE.Group(); head.position.set(0, torsoH + 0.2 * S + headR * 0.9, 0); torso.add(head);
  mesh(new THREE.SphereGeometry(headR, 48, 36), skin, head, [0, 0, 0], [0, 0, 0], [0.94, 1.04, 0.96]);
  mesh(new THREE.SphereGeometry(headR * 0.6, 24, 16), skin, head, [0, -headR * 0.42, headR * 0.28], [0, 0, 0], [1.05, 0.8, 0.9]);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(headR * 0.2, 14, 10), skin, head, [s * headR * 0.93, 0, 0], [0, 0, 0], [0.5, 1, 0.8]);
  mesh(new THREE.SphereGeometry(headR * 0.17, 16, 12), skin, head, [0, -headR * 0.15, headR * 0.95], [0, 0, 0], [1.25, 0.9, 0.9]);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * headR * 0.36, headR * 0.12, headR * 0.82); e.rotation.y = s * 0.25; head.add(e);
    const ball = mesh(new THREE.SphereGeometry(headR * 0.2, 24, 18), eyeMat, e); ball.castShadow = false;
    mesh(new THREE.SphereGeometry(headR * 0.045, 8, 6), spark, e, [headR * 0.05, headR * 0.06, headR * 0.18], [0, 0, 0], [1, 1, 0.4]).castShadow = false;
    const lid = new THREE.Group(); e.add(lid);
    mesh(new THREE.SphereGeometry(headR * 0.21, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin, lid);
    mesh(new THREE.TorusGeometry(headR * 0.205, headR * 0.018, 6, 28), dark, lid, [0, 0, 0], [Math.PI / 2, 0, 0]);
    const brow = mesh(new THREE.CapsuleGeometry(headR * 0.04, headR * 0.22, 4, 8), dark, head, [s * headR * 0.36, headR * 0.42, headR * 0.86], [0, 0, Math.PI / 2]);
    eyes.push({ e, ball, lid, brow, s });
  }
  // mouths (one visible at a time)
  const mouthG = new THREE.Group(); mouthG.position.set(0, -headR * 0.46, headR * 0.86); head.add(mouthG);
  const lipMat = new THREE.MeshStandardMaterial({ color: '#3b1a12', roughness: 0.6 });
  const mouths = {
    smile: mesh(new THREE.TorusGeometry(headR * 0.22, headR * 0.035, 8, 20, Math.PI * 0.8), lipMat, mouthG, [0, headR * 0.12, 0], [0, 0, Math.PI * 1.1]),
    frown: mesh(new THREE.TorusGeometry(headR * 0.16, headR * 0.03, 8, 20, Math.PI * 0.7), lipMat, mouthG, [0, -headR * 0.13, 0], [0, 0, Math.PI * 0.15]),
    open: mesh(new THREE.SphereGeometry(headR * 0.15, 16, 12), new THREE.MeshStandardMaterial({ color: '#4a1410', roughness: 0.7 }), mouthG, [0, 0, 0], [0, 0, 0], [1.2, 0.6, 0.4]),
    grin: new THREE.Group(),
  };
  mouthG.add(mouths.grin);
  {
    const sh = new THREE.Shape();
    sh.absarc(0, 0, headR * 0.24, Math.PI, Math.PI * 2, false); sh.lineTo(-headR * 0.24, 0);
    mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: '#4a1410', roughness: 0.7 }), mouths.grin, [0, headR * 0.05, 0.005]);
    mesh(new THREE.PlaneGeometry(headR * 0.4, headR * 0.07), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), mouths.grin, [0, headR * 0.02, 0.01]);
  }
  // hair / head wrap
  if (opts.wrap) {
    mesh(new THREE.SphereGeometry(headR * 1.12, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), opts.wrap, head, [0, headR * 0.12, -headR * 0.05], [-0.25, 0, 0], [1, 1.15, 1.05]);
    mesh(new THREE.TorusGeometry(headR * 0.35, headR * 0.17, 12, 20), opts.wrap, head, [0, headR * 1.15, -headR * 0.1], [0.5, 0, 0]);
    mesh(new THREE.SphereGeometry(headR * 0.4, 16, 12), opts.wrap, head, [headR * 0.25, headR * 1.25, 0.0], [0, 0, 0.4], [1, 0.7, 0.8]);
  } else if (kind === 'girl') {
    mesh(new THREE.SphereGeometry(headR * 1.04, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat, head, [0, headR * 0.06, -headR * 0.03], [-0.3, 0, 0]);
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(headR * 0.36, 18, 14), hairMat, head, [s * headR * 0.62, headR * 0.85, -headR * 0.15]);
  } else {
    mesh(new THREE.SphereGeometry(headR * 1.03, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat, head, [0, headR * 0.08, -headR * 0.04], [-0.35, 0, 0]);
  }

  // arms
  const arms = [];
  const sleeveMat = opts.sleeves === false ? skin : top;
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.29 * S, torsoH * 0.95, 0); torso.add(sh);
    mesh(new THREE.CapsuleGeometry(0.075 * S, 0.26 * S, 4, 10), sleeveMat, sh, [0, -0.17 * S, 0]);
    const el = new THREE.Group(); el.position.set(0, -0.36 * S, 0); sh.add(el);
    mesh(new THREE.CapsuleGeometry(0.062 * S, 0.24 * S, 4, 10), skin, el, [0, -0.15 * S, 0]);
    const hand = new THREE.Group(); hand.position.set(0, -0.32 * S, 0); el.add(hand);
    const palm = mesh(new THREE.SphereGeometry(0.07 * S, 14, 10), skin, hand, [0, -0.04 * S, 0], [0, 0, 0], [0.8, 1.1, 0.55]);
    const thumb = new THREE.Group(); thumb.position.set(-s * 0.045 * S, -0.02 * S, 0.03 * S); hand.add(thumb);
    mesh(new THREE.CapsuleGeometry(0.024 * S, 0.05 * S, 4, 8), skin, thumb, [0, -0.035 * S, 0]);
    arms.push({ sh, el, hand, palm, thumb, s });
  }

  const pain = new THREE.Group(); head.add(pain);
  const painMat = new THREE.MeshBasicMaterial({ color: '#ff3b30' });
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    mesh(new THREE.ConeGeometry(headR * 0.06, headR * 0.35, 6), painMat, pain, [Math.sin(a) * headR * 1.45, headR * 0.45 + Math.cos(a) * headR * 0.9, 0], [0, 0, -a]).castShadow = false;
  }
  pain.visible = false;

  // two-bone reach by coordinate descent, solved once per named target and cached
  const headY = legLen + head.position.y;
  const TARGETS = {
    temple: (sd) => [sd * headR * 0.95, headY + headR * 0.12, headR * 0.3],
    mouth: (sd) => [sd * headR * 0.08, headY - headR * 0.48, headR * 1.1],
    belly: (sd) => [sd * 0.04 * S, legLen + torsoH * 0.32, 0.26 * S],
    oppShoulder: (sd) => [-sd * 0.2 * S, legLen + torsoH * 0.86, 0.16 * S],
    forehead: (sd) => [sd * headR * 0.15, headY + headR * 0.55, headR * 0.85],
  };
  const ikCache = {};
  const _p = new THREE.Vector3();
  function ik(name, i) {
    const key = name + i;
    if (ikCache[key]) return ikCache[key];
    const a = arms[i];
    const tgt = new THREE.Vector3(...TARGETS[name](a.s));
    const apply = (q) => { a.sh.rotation.set(q.sx, 0, a.s * q.sz); a.el.rotation.set(-q.el, 0, 0); };
    const err = (q) => { apply(q); root.updateMatrixWorld(true); a.palm.getWorldPosition(_p); root.worldToLocal(_p); return _p.distanceTo(tgt); };
    let q = { sx: -1.2, sz: 0.2, el: 1.5, hx: 0, hz: 0.4, curl: 0.3 };
    let best = err(q), step = 0.5;
    for (let it = 0; it < 120 && step > 0.004; it++) {
      let improved = false;
      for (const k of ['sx', 'sz', 'el']) {
        for (const d of [step, -step]) {
          const c = { ...q, [k]: q[k] + d };
          if (k === 'el' && (c.el < 0 || c.el > 2.6)) continue;
          const e = err(c);
          if (e < best) { best = e; q = c; improved = true; }
        }
      }
      if (!improved) step *= 0.6;
    }
    return (ikCache[key] = q);
  }

  function update(st) {
    const t = st.t || 0;
    const breathe = Math.sin(t * 2.4 + (opts.phase || 0)) * 0.01;
    body.position.y = (st.bob || 0) + breathe;
    root.rotation.y = st.turn || 0;
    body.rotation.x = st.lean || 0;
    head.rotation.set((st.nod || 0) + noise1(t * 0.8, opts.phase || 1) * 0.03, (st.headTurn || 0) + noise1(t * 0.6, 4) * 0.05, st.tilt || 0);
    const which = st.mouth || 'smile';
    for (const [k, m] of Object.entries(mouths)) m.visible = k === which;
    if (which === 'open') mouths.open.scale.set(1.2, 0.35 + (st.talk || 0) * 0.5, 0.4);
    const blink = ((t + (opts.phase || 0)) % 3.7) < 0.14 ? 1 : 0;
    for (const e of eyes) {
      e.lid.rotation.x = -1.05 + clamp(Math.max(blink, st.lids || 0)) * 1.6;
      e.brow.rotation.z = Math.PI / 2 - e.s * (st.pain || 0) * 0.45;
      e.brow.position.y = headR * (0.42 + (st.brow || 0) * 0.08);
      const lk = st.look || [0, 0];
      e.ball.rotation.set(-lk[1] * 0.4, lk[0] * 0.5, 0);
    }
    pain.visible = (st.painFx || 0) > 0;
    if (pain.visible) pain.scale.setScalar(0.85 + 0.15 * Math.sin(t * 12));
    const ps = [st.right || PPOSE.rest, st.left || PPOSE.rest].map((p, i) => (typeof p === 'string' ? ik(p, i) : p));
    arms.forEach((a, i) => {
      const p = ps[i];
      a.sh.rotation.set(p.sx + Math.sin(t * 2 + i) * 0.02, 0, a.s * p.sz);
      a.el.rotation.set(-p.el, 0, p.wave ? a.s * Math.sin(t * 8 + i) * 0.35 : 0);
      a.hand.rotation.set(p.hx || 0, 0, a.s * (p.hz || 0));
      a.thumbsUp = (p.curl || 0) > 0.9;
      a.thumb.rotation.set(0, 0, a.s * 0.5);
      a.thumb.position.set(-a.s * 0.045 * S, -0.02 * S, 0.03 * S);
    });
    if (arms.some((a) => a.thumbsUp)) {
      root.updateMatrixWorld(true);
      for (const a of arms) {
        if (!a.thumbsUp) continue;
        a.hand.getWorldQuaternion(_q).invert();
        a.thumb.quaternion.copy(_q.multiply(_t.setFromEuler(_e.set(Math.PI, 0, -a.s * 0.2))));
        a.hand.getWorldPosition(_w).add(_v.set(0, 0.04 * S, 0.04 * S));
        a.thumb.position.copy(a.hand.worldToLocal(_w));
      }
    }
    const w = st.walk || 0;
    legs[0].rotation.x = Math.sin(w * Math.PI) * 0.45 * (st.walking || 0);
    legs[1].rotation.x = -Math.sin(w * Math.PI) * 0.45 * (st.walking || 0);
  }
  return { root, update, head, height: legLen + torsoH + 0.2 * S + headR * 2 };
}
