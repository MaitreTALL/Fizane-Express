// Render pipeline: main scene -> HDR target -> depth-of-field pass -> screen,
// then 3D "insets" (live views shown inside overlay cards/circles) drawn on top.
import * as THREE from 'three';

const W = 1080, H = 1920;

const dofShader = {
  uniforms: {
    tColor: { value: null }, tDepth: { value: null },
    focus: { value: 5 }, aperture: { value: 0 }, maxBlur: { value: 14 },
    cameraNear: { value: 0.1 }, cameraFar: { value: 200 }, texel: { value: new THREE.Vector2(1 / W, 1 / H) },
    exposure: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    #include <packing>
    uniform sampler2D tColor; uniform sampler2D tDepth;
    uniform float focus, aperture, maxBlur, cameraNear, cameraFar; uniform vec2 texel;
    varying vec2 vUv;
    float viewDist(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
    float coc(float d){ return clamp(abs(d - focus) / d * aperture, 0.0, maxBlur); }
    void main(){
      vec3 base = texture2D(tColor, vUv).rgb;
      float centerDepth = viewDist(vUv);
      float centerCoc = coc(centerDepth);
      vec3 col = base; float tot = 1.0;
      if (aperture > 0.0 && centerCoc > 0.6) {
        float r = 0.5;
        float ang = 0.0;
        for (int i = 0; i < 48; i++) {
          if (r > centerCoc) break;
          ang += 2.39996323;
          vec2 tc = vUv + vec2(cos(ang), sin(ang)) * texel * r;
          vec3 s = texture2D(tColor, tc).rgb;
          float sd = viewDist(tc);
          float sc = coc(sd);
          if (sd > centerDepth) sc = clamp(sc, 0.0, centerCoc * 2.0); // background must not bleed over the foreground
          float m = smoothstep(r - 0.5, r + 0.5, sc);
          col += mix(col / tot, s, m);
          tot += 1.0;
          r += 2.0 / r + 0.5;
        }
      }
      gl_FragColor = vec4(col / tot, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

export class Pipeline {
  constructor(renderer, opts = {}) {
    this.renderer = renderer;
    this.opts = opts;
    this.samples = opts.msaa !== undefined ? Number(opts.msaa) : 4;
    const k = Number(opts.scale || 0.8);
    const rt = new THREE.WebGLRenderTarget(Math.round(W * k), Math.round(H * k), { type: THREE.HalfFloatType, samples: this.samples });
    rt.depthTexture = new THREE.DepthTexture(Math.round(W * k), Math.round(H * k), THREE.UnsignedIntType);
    this.rt = rt;
    this.dofMat = new THREE.ShaderMaterial({ ...dofShader, uniforms: THREE.UniformsUtils.clone(dofShader.uniforms), depthTest: false, depthWrite: false });
    this.dofMat.toneMapped = true;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.dofMat));
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // HUD: pixel-space orthographic scene for the insets
    this.hud = new THREE.Scene();
    this.hudCam = new THREE.OrthographicCamera(0, W, 0, -H, -10, 10);
    this.insets = [];
  }

  // shape: 'circle' or 'rect' (rounded); rect in page pixels {x, y, w, h, r}
  addInset({ el, shape = 'rect', size = [512, 384], scene, camera, update }) {
    const rect = el.rect;
    const rt = new THREE.WebGLRenderTarget(size[0], size[1], { type: THREE.HalfFloatType, samples: this.samples });
    let geo;
    if (shape === 'circle') geo = new THREE.CircleGeometry(rect.w / 2, 64);
    else {
      const s = new THREE.Shape(), { w, h } = rect, r = rect.r ?? 18;
      s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2);
      s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      geo = new THREE.ShapeGeometry(s, 8);
      // planar UVs
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
    }
    if (shape === 'circle') {
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / rect.w + 0.5, p.getY(i) / rect.h + 0.5);
    }
    const mat = new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    this.hud.add(mesh);
    camera.aspect = rect.w / rect.h;
    camera.updateProjectionMatrix();
    const inset = { el, rect, rt, mesh, scene, camera, update, state: null };
    this.insets.push(inset);
    return inset;
  }

  // shadow maps are refreshed once per scene per frame, not on every inset render
  draw(scene, camera) {
    const r = this.renderer;
    r.shadowMap.needsUpdate = !this.shadowed.has(scene);
    this.shadowed.add(scene);
    r.render(scene, camera);
    this.mark(scene.name || 'scene');
  }

  mark(label) {
    if (!window.__prof) return;
    const gl = this.renderer.getContext(); const px = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const now = performance.now();
    window.__prof.push(`${label}:${(now - (this._last || now)).toFixed(0)}`);
    this._last = now;
  }

  render(scene, camera, dof, t) {
    const r = this.renderer;
    r.shadowMap.autoUpdate = false;
    this.shadowed = new Set();
    this._last = performance.now();
    // live insets first (they use their own targets)
    for (const ins of this.insets) {
      const st = ins.state;
      ins.mesh.visible = !!st && st.op > 0.002 && this.opts.insets !== '0';
      if (!ins.mesh.visible) continue;
      ins.update?.(t);
      r.setRenderTarget(ins.rt);
      r.clear();
      this.draw(ins.scene, ins.camera);
      const { x, y, w, h } = ins.rect;
      ins.mesh.position.set(x + w / 2 + st.tx, -(y + h / 2 + st.ty), 0);
      ins.mesh.scale.setScalar(st.s);
      ins.mesh.rotation.z = -st.rot * Math.PI / 180;
      ins.mesh.material.opacity = st.op;
    }
    if (dof && dof.aperture > 0 && this.opts.dof !== '0') {
      r.setRenderTarget(this.rt);
      r.clear();
      this.draw(scene, camera);
      const u = this.dofMat.uniforms;
      u.tColor.value = this.rt.texture; u.tDepth.value = this.rt.depthTexture;
      u.focus.value = dof.focus; u.aperture.value = dof.aperture; u.maxBlur.value = dof.maxBlur ?? 14;
      u.cameraNear.value = camera.near; u.cameraFar.value = camera.far;
      r.setRenderTarget(null);
      r.render(this.quadScene, this.quadCam);
      this.mark('dof');
    } else {
      r.setRenderTarget(null);
      this.draw(scene, camera);
    }
    const ac = r.autoClear;
    r.autoClear = false;
    r.render(this.hud, this.hudCam);
    r.autoClear = ac;
    this.mark('hud');
  }
}
