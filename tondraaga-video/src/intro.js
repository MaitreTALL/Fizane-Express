// Entrée du logo Tondraaga, commune aux deux vidéos.
// Une femme burkinabè du village, panier du logo sur la tête, entre en marchant, s'accroupit sous son panier
// et devient le « g » de Tondraaga ; la caméra recule et les autres lettres se lèvent autour d'elle.
// Le logo est reconstruit à partir de ses pièces d'origine (assets/logo-pieces, voir tools/decouper_logo.py).
//   const intro = IntroLogo(element, T);  intro(t) à chaque image.
//   T = { impact, marche: [t0, t1], xDepart, accroupi: [t0, t1], morph: [t0, t1], zoom: [t0, t1],
//         lettres, lettresPas, bandes, slogan, sloganPas, eclat, tampon }
window.IntroLogo = function (racine, T) {
  const P = window.LOGO_PIECES;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const out3 = (k) => 1 - Math.pow(1 - k, 3), inout = (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const back = (k, c = 1.7) => 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
  const RAD = Math.PI / 180;
  const S = .7, ECX = 540, ECY = 920;                 // échelle du logo à l'écran, centre de l'écran
  const LOGO_C = [698, 185], FEMME_C = [1150, 196];    // centres de caméra (unités du logo)
  const ZF = 3.2;                                      // grossissement pendant la scène de la femme
  const OX = ECX - LOGO_C[0] * S, OY = ECY - LOGO_C[1] * S, LW = 1396 * S;
  const PANIER = ['anse', 'bord', 'tressage', 'produit1', 'produit2', 'produit3', 'produit4'];
  const LETTRES = ['T', 'o', 'n', 'd', 'r', 'a1', 'a2', 'a3'];

  const css = `
  .i-c { position: absolute; }
  #i-sombre { inset: 0; background: radial-gradient(circle at 50% 50%, #3A2418 0%, #1A0F0A 55%, #0E0806 100%); }
  #i-creme { inset: 0; background: radial-gradient(circle at 50% 48%, #FFFFFF 0%, #FBF8F4 38%, #F1E3CF 100%); }
  #i-rayons { left: -660px; top: -280px; width: 2400px; height: 2400px; border-radius: 50%;
    background: repeating-conic-gradient(rgba(200,120,23,.085) 0deg 5deg, rgba(200,120,23,0) 5deg 15deg);
    -webkit-mask-image: radial-gradient(circle, #000 0%, rgba(0,0,0,.6) 25%, transparent 55%); mask-image: radial-gradient(circle, #000 0%, rgba(0,0,0,.6) 25%, transparent 55%); }
  #i-ouvert { inset: 0; overflow: hidden; }
  #i-anneau { left: ${ECX}px; top: ${ECY}px; width: 0; height: 0; }
  #i-anneau i { position: absolute; border-radius: 50%; border: 7px solid #C87817; box-sizing: border-box; }
  #i-anneau b { position: absolute; border-radius: 50%; border: 3px solid #F5B83D; box-sizing: border-box; }
  #i-logo { left: 0; top: 0; width: 1396px; height: 370px; transform-origin: 0 0; perspective: 900px; }
  #i-logo img { position: absolute; display: block; will-change: transform, opacity, filter; }
  #i-femme { position: absolute; left: 0; top: 0; width: 1396px; height: 370px; overflow: visible; }
  #i-brillance { left: ${OX}px; top: ${OY}px; width: ${LW}px; height: ${370 * S}px; pointer-events: none;
    -webkit-mask-image: url(assets/logo-crop.png); mask-image: url(assets/logo-crop.png); -webkit-mask-size: 100% 100%; mask-size: 100% 100%; mix-blend-mode: screen; }
  #i-brillance i { position: absolute; top: 0; left: 0; width: 260px; height: 100%; background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,246,220,.7) 50%, rgba(255,255,255,0) 100%); }
  .i-etincelle { position: absolute; width: 70px; height: 70px; margin: -35px 0 0 -35px; }
  #i-tampon { left: 395px; top: 1105px; width: 290px; height: 290px; }
  #i-tampon svg { width: 290px; height: 290px; overflow: visible; filter: drop-shadow(0 12px 22px rgba(77,53,41,.28)); }
  #i-tampon text { font-family: P, sans-serif; font-weight: 700; font-size: 9.6px; fill: #4D3529; letter-spacing: .4px; }
  .i-bande { position: absolute; left: -10%; width: 120%; height: 60px; background: url(assets/pagne.svg) 0 0 / 100px 100px repeat-x, #1B1B1B; border-bottom: 5px solid #C87817; box-shadow: 0 10px 30px rgba(0,0,0,.25); }
  #i-part { left: 0; top: 0; }`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // ------------------------------------------------------------ la femme (unités « nominales », hanche à l'origine, regard vers la gauche)
  const PEAU = '#5C3A24', PEAU2 = '#46291A';
  const femmeSVG = `
  <svg id="i-femme" viewBox="0 0 1396 370" overflow="visible">
    <defs>
      <pattern id="f-rayures" width="26" height="12" patternUnits="userSpaceOnUse">
        <rect width="26" height="12" fill="#C87817"/><rect x="0" width="6" height="12" fill="#4D3529"/><rect x="9" width="3" height="12" fill="#F3E6D6"/>
        <rect x="15" width="2" height="12" fill="#B4231C"/><rect x="19" width="3" height="12" fill="#F3E6D6"/></pattern>
      <pattern id="f-foulard" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <rect width="14" height="14" fill="#DA251D"/><path d="M0 7h14" stroke="#B11B15" stroke-width="2"/><circle cx="7" cy="3" r="1.4" fill="#F5B83D"/></pattern>
      <filter id="f-ocre" x="-20%" y="-20%" width="140%" height="140%"><feFlood flood-color="#C87817"/><feComposite in2="SourceAlpha" operator="in"/></filter>
    </defs>
    <ellipse id="f-ombre" rx="70" ry="9" fill="rgba(77,53,41,.22)"/>
    <g id="f-corps">
      <g id="f-bras-loin"><path class="f-bras" fill="none" stroke="${PEAU2}" stroke-linecap="round" stroke-linejoin="round"/><circle class="f-main" r="7.5" fill="${PEAU2}"/></g>
      <g id="f-jambe-loin"><path class="f-jambe" fill="none" stroke="${PEAU2}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/><path class="f-pied" fill="${PEAU2}"/></g>
      <g id="f-jambe-pres"><path class="f-jambe" fill="none" stroke="${PEAU}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><path class="f-pied" fill="${PEAU}"/></g>
      <path id="f-jupe" fill="url(#f-rayures)" stroke="#4D3529" stroke-width="2.2" stroke-linejoin="round"/>
      <path id="f-pagne-haut" fill="#4D3529"/>
      <g id="f-buste">
        <path d="M-6 -120 L8 -120 L9 -100 L-7 -100 Z" fill="${PEAU}"/>
        <path d="M20 -15 C25 -45 27 -84 16 -104 C8 -109 -4 -109 -12 -105 C-23 -96 -27 -76 -22 -62 C-17 -50 -22 -30 -20 -15 Z" fill="#B4231C"/>
        <path d="M-12 -105 C-4 -98 6 -98 16 -104" fill="none" stroke="#F5B83D" stroke-width="3"/>
        <path d="M-21 -40 C-8 -36 8 -36 22 -40" fill="none" stroke="#7E1712" stroke-width="2" opacity=".6"/>
        <path d="M14 -150 C18 -138 17 -125 7 -118 L-5 -118 C-11 -119 -14 -122 -13 -125 L-15 -128 L-14 -130 L-16 -131 L-15 -134 L-19.5 -138.5 L-15 -141.5 C-15 -150 -10 -158 0 -158 C8 -158 13 -155 14 -150 Z" fill="${PEAU}"/>
        <ellipse cx="-8" cy="-143" rx="2.1" ry="1.6" fill="#1B1B1B"/><path d="M-12 -147.5 Q-8 -149.5 -4 -147.5" fill="none" stroke="#1B1B1B" stroke-width="1.3"/>
        <circle cx="6" cy="-128" r="3.4" fill="none" stroke="#F5B83D" stroke-width="2"/>
        <path d="M-16 -148 C-17 -161 -8 -171 4 -171 L17 -171 C27 -169 31 -159 27 -149 C32 -147 34 -140 30 -135 C24 -136 19 -141 15 -146 C7 -151 -6 -151 -16 -148 Z" fill="url(#f-foulard)" stroke="#8E1611" stroke-width="1.6"/>
        <path d="M-10 -160 C0 -165 12 -165 22 -160" fill="none" stroke="#8E1611" stroke-width="1.4" opacity=".7"/>
        <g id="f-bras-pres"><path class="f-bras" fill="none" stroke="${PEAU}" stroke-linecap="round" stroke-linejoin="round"/><path class="f-manche" fill="none" stroke="#B4231C" stroke-width="20" stroke-linecap="round"/><circle class="f-main" r="7.5" fill="${PEAU}"/></g>
      </g>
    </g>
    <use id="f-silhouette" href="#f-corps" filter="url(#f-ocre)" opacity="0"/>
  </svg>`;

  const etoile = '<svg viewBox="-10 -10 20 20"><path d="M0-10C1 -2 2-1 10 0 2 1 1 2 0 10-1 2-2 1-10 0-2-1-1-2 0-10Z" fill="#FFF3D1"/><circle r="2.2" fill="#fff"/></svg>';
  const etoileOcre = '<svg viewBox="-10 -10 20 20"><path d="M0-10C1 -2 2-1 10 0 2 1 1 2 0 10-1 2-2 1-10 0-2-1-1-2 0-10Z" fill="#F5B83D"/></svg>';
  const texte = 'MADE IN BURKINA ◆ NOTRE MARCHÉ, NOTRE FIERTÉ ◆';
  const img = (n, B = P) => { const [x, y, w, h] = B[n]; return `<img id="i-${n}" src="assets/logo-pieces/${n}.png" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px" alt="">`; };
  const X = window.LOGO_EXTRA, imgX = (n) => img(n, X);   // tressage complété : panier entier quand elle le porte seul
  racine.innerHTML = `
    <div class="i-c" id="i-sombre"></div>
    <canvas class="i-c" id="i-part" width="1080" height="1920"></canvas>
    <div class="i-c" id="i-ouvert">
      <div class="i-c" id="i-creme"><div class="i-c" id="i-rayons"></div></div>
      <div class="i-bande" id="i-bande-a" style="top:440px"></div>
      <div class="i-bande" id="i-bande-b" style="top:1470px"></div>
      <div class="i-c" id="i-logo">${Object.keys(P).filter((n) => !PANIER.includes(n)).map((n) => img(n)).join('')}${femmeSVG}${PANIER.map((n) => img(n)).join('')}${imgX('tressage-complet')}</div>
      <div class="i-c" id="i-brillance"><i></i></div>
      ${[0, 1, 2].map((i) => `<div class="i-etincelle" id="i-et${i}">${etoile}</div>`).join('')}
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<div class="i-etincelle" id="i-eg${i}">${etoileOcre}</div>`).join('')}
      <div class="i-c" id="i-tampon"><svg viewBox="0 0 120 120"><defs><path id="i-cercle" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0"/><clipPath id="i-rond"><circle cx="60" cy="60" r="30"/></clipPath></defs>
        <circle cx="60" cy="60" r="58" fill="#FBF8F4" stroke="#C87817" stroke-width="2.4"/><circle cx="60" cy="60" r="53.5" fill="none" stroke="#C87817" stroke-width=".8" stroke-dasharray="2 2.2"/>
        <g id="i-texte-tampon"><text><textPath href="#i-cercle" textLength="286" lengthAdjust="spacing">${texte}</textPath></text></g>
        <g clip-path="url(#i-rond)"><rect x="30" y="30" width="60" height="30" fill="#EF2B2D"/><rect x="30" y="60" width="60" height="30" fill="#009E49"/></g>
        <path fill="#FCD116" d="M60 49 62.47 56.6H70.46L63.99 61.3 66.47 68.9 60 64.2 53.53 68.9 56.01 61.3 49.54 56.6H57.53Z"/><circle cx="60" cy="60" r="30" fill="none" stroke="#F5B83D" stroke-width="2.2"/></svg></div>
      <div class="i-c" id="i-anneau"><i></i><b></b></div>
    </div>`;
  const $ = (id) => document.getElementById(id);
  const el = Object.fromEntries(Object.keys(P).map((n) => [n, $(`i-${n}`)]));
  const pose = (e, o) => {
    const tr = [];
    if (o.x || o.y) tr.push(`translate(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px)`);
    if (o.rx) tr.push(`rotateX(${o.rx.toFixed(2)}deg)`);
    if (o.r) tr.push(`rotate(${o.r.toFixed(2)}deg)`);
    if (o.s !== undefined) tr.push(`scale(${o.s.toFixed(4)})`);
    e.style.transform = tr.join(' ');
    e.style.opacity = clamp(o.o ?? 1).toFixed(3);
    e.style.filter = o.blur > .2 ? `blur(${o.blur.toFixed(1)}px)` : '';
  };
  LETTRES.concat(['g']).forEach((n) => { el[n].style.transformOrigin = '50% 100%'; });
  PANIER.forEach((n) => { el[n].style.transformOrigin = `${1150 - P[n][0]}px ${200 - P[n][1]}px`; });
  const complet = $('i-tressage-complet'); complet.style.transformOrigin = `${1150 - X['tressage-complet'][0]}px ${200 - X['tressage-complet'][1]}px`;

  // ------------------------------------------------------------ squelette de la femme
  const F = .626;                  // taille : accroupie, elle tient dans le « g » sous le panier
  const SOL = 350;                 // ligne des pieds (bas du « g »)
  const CUISSE = 85, TIBIA = 80, CHEVILLE = 6, TETE_HAUT = -171;
  const MARCHE_FIN_X = 1121;
  function jambe(th, ka) {         // angles en degrés : cuisse vers l'avant, flexion du genou
    const g = [-Math.sin(th * RAD) * CUISSE, Math.cos(th * RAD) * CUISSE];
    const a = [g[0] - Math.sin((th - ka) * RAD) * TIBIA, g[1] + Math.cos((th - ka) * RAD) * TIBIA];
    return { g, a };
  }
  const q = (sel, g) => g.querySelector(sel);
  function membreJambe(gid, j, piedAngle) {
    const g = $(gid);
    q('.f-jambe', g).setAttribute('d', `M0 0 L${j.g[0].toFixed(1)} ${j.g[1].toFixed(1)} L${j.a[0].toFixed(1)} ${j.a[1].toFixed(1)}`);
    const c = Math.cos(piedAngle * RAD), s = Math.sin(piedAngle * RAD);
    const pts = [[7, -2], [7, 6], [-27, 8], [-31, 4], [-27, -1], [-6, -6]].map(([x, y]) => [j.a[0] + x * c - y * s, j.a[1] + CHEVILLE + x * s + y * c - 4]);
    q('.f-pied', g).setAttribute('d', 'M' + pts.map((pt) => pt.map((v) => v.toFixed(1)).join(' ')).join(' L') + ' Z');
  }
  function membreBras(gid, epaule, a1, a2, l1, l2, larg, manche) {
    const g = $(gid);
    const c = [epaule[0] - Math.sin(a1 * RAD) * l1, epaule[1] + Math.cos(a1 * RAD) * l1];
    const m = [c[0] - Math.sin((a1 + a2) * RAD) * l2, c[1] + Math.cos((a1 + a2) * RAD) * l2];
    const br = q('.f-bras', g); br.setAttribute('d', `M${epaule[0]} ${epaule[1]} L${c[0].toFixed(1)} ${c[1].toFixed(1)} L${m[0].toFixed(1)} ${m[1].toFixed(1)}`); br.setAttribute('stroke-width', larg);
    const mn = q('.f-main', g); mn.setAttribute('cx', m[0].toFixed(1)); mn.setAttribute('cy', m[1].toFixed(1));
    if (manche) { const ms = q('.f-manche', g); ms.setAttribute('d', `M${epaule[0]} ${epaule[1]} L${(epaule[0] + (c[0] - epaule[0]) * .42).toFixed(1)} ${(epaule[1] + (c[1] - epaule[1]) * .42).toFixed(1)}`); }
  }
  function spline(pts) {          // courbe fermée de Catmull-Rom → Bézier
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d + ' Z';
  }
  // pas de marche réglés sur la distance (pas de glissement des pieds)
  const AMPL = 30, FOULEE = 2 * CUISSE * Math.sin(AMPL * RAD) * F;
  const nbPas = Math.max(2, Math.round((T.xDepart - MARCHE_FIN_X) / FOULEE));
  function femme(t) {
    const [m0, m1] = T.marche, [c0, c1] = T.accroupi;
    let hx, hy, thP, kaP, thL, kaL, penche = 0, brasP = [8, 18], piedP = 0, piedL = 0;
    if (t < c0) {                                  // marche
      const k = p(t, m0, m1), ph = k * nbPas * Math.PI, freine = clamp((m1 - t) / .18);
      hx = lerp(T.xDepart, MARCHE_FIN_X, k);
      thP = AMPL * Math.sin(ph) * freine; thL = -thP;
      kaP = 42 * Math.pow(Math.max(0, Math.sin(ph + 1.2)), 2) * freine; kaL = 42 * Math.pow(Math.max(0, Math.sin(ph + 1.2 + Math.PI)), 2) * freine;
      const jp = jambe(thP, kaP), jl = jambe(thL, kaL);
      hy = SOL - (Math.max(jp.a[1], jl.a[1]) + CHEVILLE) * F;
      brasP = [-22 * Math.sin(ph) * freine, 16];
      piedP = -kaP * .35; piedL = -kaL * .35;
    } else {                                        // accroupissement, pieds à plat, dos droit sous le panier
      const k = inout(p(t, c0, c1));
      thP = 88 * k; kaP = 118 * k; thL = 80 * k; kaL = 112 * k;
      const jp = jambe(thP, kaP);
      hx = MARCHE_FIN_X + (-jp.a[0]) * F; hy = SOL - (jp.a[1] + CHEVILLE) * F;
      penche = 5 * k; brasP = [lerp(8, 5, k), lerp(18, 40, k)];
    }
    const jp = jambe(thP, kaP), jl = jambe(thL, kaL);
    membreJambe('f-jambe-pres', jp, piedP); membreJambe('f-jambe-loin', jl, piedL);
    // pagne : passe devant les genoux et retombe jusqu'aux chevilles
    const gx = Math.min(jp.g[0], jl.g[0]), gy = jp.g[1];
    const ax0 = Math.min(jp.a[0], jl.a[0]), ax1 = Math.max(jp.a[0], jl.a[0]), ourlet = Math.max(jp.a[1], jl.a[1]) - 14;
    const pts = [[21, -15], [-21, -15], [gx - 9, gy - 14], [gx - 13, gy + 8], [ax0 - 14, ourlet], [Math.min(ax1 + 10, 30), ourlet], [Math.min(24, ax1 + 16), Math.min(44, ourlet - 34)], [25, 8]];
    $('f-jupe').setAttribute('d', spline(pts));
    $('f-pagne-haut').setAttribute('d', 'M-21 -18 L21 -18 L22 -9 L-21 -9 Z');
    $('f-buste').setAttribute('transform', `rotate(${penche})`);
    membreBras('f-bras-pres', [0, -100], brasP[0], brasP[1], 46, 44, 15, true);
    membreBras('f-bras-loin', [8, -101], 222, -78, 44, 42, 14, false);  // bras levé qui tient le panier
    $('f-corps').setAttribute('transform', `translate(${hx.toFixed(2)} ${hy.toFixed(2)}) scale(${F})`);
    const ombre = $('f-ombre'); ombre.setAttribute('cx', (hx + (ax0 + ax1) / 2 * F).toFixed(1)); ombre.setAttribute('cy', SOL + 2); ombre.setAttribute('rx', (40 + (ax1 - ax0) * F * .6).toFixed(1));
    // sommet du foulard (le panier y repose)
    const r = penche * RAD, sx = hx + (4 * Math.cos(r) - TETE_HAUT * Math.sin(r)) * F, sy = hy + (4 * Math.sin(r) + TETE_HAUT * Math.cos(r)) * F;
    return { sx, sy, rebond: t < c0 ? Math.abs(Math.sin(p(t, m0, m1) * nbPas * Math.PI)) : 0 };
  }

  // ------------------------------------------------------------ particules : convergence dorée, puis éclats aux couleurs du drapeau
  const ctx = $('i-part').getContext('2d');
  let graine = 11;
  const rnd = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
  const conv = Array.from({ length: 140 }, () => ({ a: rnd() * 6.283, r: 650 + rnd() * 700, s: 1.5 + rnd() * 3.5, v: .6 + rnd() * .8, d: rnd() * .25 }));
  const COUL = ['#EF2B2D', '#009E49', '#FCD116', '#C87817', '#4D3529'];
  const eclats = Array.from({ length: 90 }, () => { const a = rnd() * 6.283, v = 700 + rnd() * 1500; return { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 500, w: 8 + rnd() * 14, h: 5 + rnd() * 8, c: COUL[Math.floor(rnd() * 5)], rot: rnd() * 6.28, vr: (rnd() - .5) * 18 }; });
  const etincellesG = Array.from({ length: 8 }, (_, i) => ({ a: i / 8 * 6.283 + rnd() * .4, d: 70 + rnd() * 50 }));

  return function (t) {
    const i = T.impact;
    // --- avant l'impact : fond sombre, particules qui convergent, point de lumière
    ctx.clearRect(0, 0, 1080, 1920);
    if (t < i + .05) {
      const k = p(t, 0, i);
      for (const c of conv) {
        const kk = clamp((k - c.d) / (1 - c.d)); if (kk <= 0) continue;
        const rr = c.r * Math.pow(1 - kk, 1.6), a = c.a + kk * 2.2 * c.v;
        const x = ECX + Math.cos(a) * rr, y = ECY + Math.sin(a) * rr * .9, x2 = ECX + Math.cos(a - .12) * rr * 1.08, y2 = ECY + Math.sin(a - .12) * rr * .97;
        ctx.strokeStyle = `rgba(255,214,120,${.25 + .6 * kk})`; ctx.lineWidth = c.s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke();
      }
      const g = ctx.createRadialGradient(ECX, ECY, 0, ECX, ECY, 40 + 160 * k * k);
      g.addColorStop(0, `rgba(255,248,230,${.4 + .6 * k})`); g.addColorStop(.3, `rgba(255,214,120,${.5 * k})`); g.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ECX, ECY, 40 + 160 * k * k, 0, 6.283); ctx.fill();
    }
    // --- ouverture sur le fond crème, onde de choc
    const kc = out3(p(t, i - .02, i + .42));
    $('i-ouvert').style.clipPath = `circle(${(kc * 115).toFixed(2)}% at 50% 48%)`;
    $('i-rayons').style.transform = `rotate(${(t * 6).toFixed(2)}deg) scale(${lerp(.6, 1, out3(p(t, i, i + 1.2))).toFixed(3)})`;
    $('i-rayons').style.opacity = clamp(p(t, i, i + .6)).toFixed(3);
    [[$('i-anneau').firstElementChild, p(t, i, i + .7), 1900], [$('i-anneau').lastElementChild, p(t, i + .08, i + .85), 1500]].forEach(([e, k, D]) => {
      const d = lerp(60, D, out3(k)); e.style.width = e.style.height = `${d.toFixed(1)}px`; e.style.left = e.style.top = `${(-d / 2).toFixed(1)}px`;
      e.style.opacity = (k > 0 && k < 1 ? (1 - k) * .9 : 0).toFixed(3);
    });
    // --- caméra : sur la femme, puis recul jusqu'au logo entier
    const kz = inout(p(t, T.zoom[0], T.zoom[1])), Z = Math.exp(lerp(Math.log(ZF), 0, kz));
    const u = (1 / Z - 1 / ZF) / (1 - 1 / ZF);
    const cx = lerp(FEMME_C[0], LOGO_C[0], u), cy = lerp(FEMME_C[1], LOGO_C[1], u);
    $('i-logo').style.transform = `translate(${(ECX - cx * S * Z).toFixed(2)}px, ${(ECY - cy * S * Z).toFixed(2)}px) scale(${(S * Z).toFixed(4)})`;
    // --- la femme et son panier
    const f = femme(t);
    const [mo0, mo1] = T.morph, km = p(t, mo0, mo1);
    const kp = p(t, T.accroupi[1] - .15, mo0 + .05);
    const dx = lerp(f.sx - 1150, 0, kp), dy = lerp(f.sy - 196, 0, kp);   // le panier rejoint sa place dans le logo
    const tangue = t < T.accroupi[0] ? 2.2 * Math.sin(p(t, T.marche[0], T.marche[1]) * nbPas * Math.PI) : 0;
    // panier à taille réelle pendant la marche ; il grandit jusqu'à sa taille de logo quand elle s'accroupit
    const sb = lerp(.55, 1, out3(p(t, T.accroupi[0] + .1, mo0 + .1)));
    // le creux du tressage (qui épouse le « g » dans le logo) n'apparaît qu'avec la lettre
    const kgp = out3(p(t, mo0 + (mo1 - mo0) * .35, mo1 + .12));
    PANIER.forEach((n) => pose(el[n], { x: dx, y: dy - f.rebond * 1.5, r: tangue, s: sb, o: t >= i ? (n === 'tressage' ? kgp : 1) : 0 }));
    pose(complet, { x: dx, y: dy - f.rebond * 1.5, r: tangue, s: sb, o: t >= i ? 1 - kgp : 0 });
    ['produit1', 'produit2', 'produit3', 'produit4'].forEach((n, j) => { const k = p(t, mo0 + .05 + j * .05, mo0 + .35 + j * .05); if (k > 0) pose(el[n], { x: dx, y: dy - Math.sin(k * Math.PI) * 22, s: sb, o: 1 }); });
    // la femme devient le « g » : silhouette ocre, puis la lettre
    $('f-silhouette').setAttribute('opacity', clamp(km * 2.2).toFixed(3));
    $('i-femme').style.opacity = (1 - clamp((km - .45) / .4)).toFixed(3);
    $('i-femme').style.filter = km > .45 ? `blur(${(lerp(0, 6, clamp((km - .45) / .4))).toFixed(1)}px)` : '';
    const kg = p(t, mo0 + (mo1 - mo0) * .35, mo1 + .12);
    pose(el.g, { s: kg > 0 ? lerp(1.12, 1, back(kg, 2)) : 1, o: out3(kg) });
    etincellesG.forEach((e, j) => {
      const k = p(t, mo0 + (mo1 - mo0) * .4, mo1 + .35), s = Math.sin(k * Math.PI), d = e.d * out3(k);
      const ex = $(`i-eg${j}`);
      const gx = (1146 - cx) * S * Z + ECX + Math.cos(e.a) * d, gy = (265 - cy) * S * Z + ECY + Math.sin(e.a) * d;
      ex.style.left = `${gx.toFixed(1)}px`; ex.style.top = `${gy.toFixed(1)}px`; ex.style.transform = `scale(${(s * .9).toFixed(3)}) rotate(${(k * 120).toFixed(1)}deg)`; ex.style.opacity = s.toFixed(3);
    });
    // --- éclats aux couleurs du drapeau (impact)
    const ke = t - i;
    if (ke > 0 && ke < 2.2) {
      for (const c of eclats) {
        const x = ECX + c.vx * ke * .55, y = ECY + c.vy * ke * .55 + 900 * ke * ke * .55, al = clamp(1.6 - ke);
        if (al <= 0) continue;
        ctx.save(); ctx.translate(x, y); ctx.rotate(c.rot + c.vr * ke); ctx.globalAlpha = al; ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * Math.abs(Math.cos(c.vr * ke))); ctx.restore();
      }
    }
    // --- rubans de pagne
    const kb = out3(p(t, T.bandes, T.bandes + .65));
    pose($('i-bande-a'), { x: lerp(-1300, 0, kb) - (t - T.bandes) * 45, o: kb > 0 ? 1 : 0 });
    pose($('i-bande-b'), { x: lerp(1300, 0, kb) + (t - T.bandes) * 45, o: kb > 0 ? 1 : 0 });
    // --- les autres lettres se lèvent autour d'elle
    LETTRES.forEach((n, j) => {
      const ordre = n === 'a3' ? 0 : 7 - j;                 // de la femme vers le début du mot
      const d = T.lettres + ordre * T.lettresPas, k = p(t, d, d + .5);
      pose(el[n], { y: lerp(150, 0, back(k, 1.3)), rx: lerp(85, 0, out3(k)), o: out3(clamp(k * 1.6)), blur: lerp(14, 0, out3(k)) });
    });
    // --- le slogan s'écrit
    Object.keys(P).filter((n) => /^s\d\d$/.test(n)).forEach((n, j) => {
      const d = T.slogan + j * T.sloganPas, k = out3(p(t, d, d + .35));
      pose(el[n], { y: lerp(26, 0, k), o: k, blur: lerp(6, 0, k) });
    });
    // --- reflet et étincelles
    const kr = p(t, T.eclat, T.eclat + .7);
    $('i-brillance').firstElementChild.style.transform = `translateX(${lerp(-300, LW + 60, kr).toFixed(1)}px) skewX(-18deg)`;
    $('i-brillance').style.opacity = kr > 0 && kr < 1 ? 1 : 0;
    [[P.T[0] + 30, P.T[1] + 10, 0], [P.anse[0] + P.anse[2] / 2, P.anse[1] + 4, .25], [P.a3[0] + P.a3[2] - 10, P.a3[1] + 30, .45]].forEach(([x, y, d], j) => {
      const k = p(t, T.eclat + d, T.eclat + d + .45), s = Math.sin(k * Math.PI);
      const e = $(`i-et${j}`); e.style.left = `${OX + x * S}px`; e.style.top = `${OY + y * S}px`;
      e.style.transform = `scale(${(s * 1.3).toFixed(3)}) rotate(${(k * 90).toFixed(1)}deg)`; e.style.opacity = s.toFixed(3);
    });
    // --- le tampon « Made in Burkina » se pose
    const kt = p(t, T.tampon, T.tampon + .5);
    pose($('i-tampon'), { s: kt > 0 ? lerp(1.8, 1, out3(kt)) : 0, r: lerp(-40, 0, out3(kt)), o: out3(clamp(kt * 2)) });
    $('i-texte-tampon').setAttribute('transform', `rotate(${((t - T.tampon) * 22).toFixed(2)} 60 60)`);
  };
};
