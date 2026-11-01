// Tondraaga — vidéo longue (≈ 63 s), montée sur les mesures du balafon (window.BATTEMENTS).
(function () {
  const W = 1080, H = 1920, FPS = 30, DUREE = 65;
  window.__fps = FPS; window.__duration = DUREE;
  const $ = (id) => document.getElementById(id);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    out3: (k) => 1 - Math.pow(1 - k, 3),
    in3: (k) => k * k * k,
    inout3: (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    outExpo: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inExpo: (k) => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
    outBack: (k) => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  };
  function set(el, o) {
    if (typeof el === 'string') el = $(el);
    const tr = [];
    if (o.x || o.y || o.z) tr.push(`translate3d(${o.x || 0}px,${o.y || 0}px,${o.z || 0}px)`);
    if (o.rx) tr.push(`rotateX(${o.rx}deg)`);
    if (o.ry) tr.push(`rotateY(${o.ry}deg)`);
    if (o.rz) tr.push(`rotateZ(${o.rz}deg)`);
    if (o.s !== undefined) tr.push(`scale(${o.s})`);
    el.style.transform = tr.join(' ');
    if (o.o !== undefined) el.style.opacity = o.o;
    el.style.filter = o.blur ? `blur(${o.blur}px)` : (o.f || '');
    el.style.visibility = o.o === 0 ? 'hidden' : 'visible';
  }
  function mots(id, texte) {
    $(id).innerHTML = texte.split(' ').map((m) => `<span class="m">${m}</span>`).join('');
    return Array.from($(id).children);
  }
  function apparitionMots(ms, t, debut, pas, duree) {
    ms.forEach((m, i) => { const k = E.out3(p(t, debut + i * pas, debut + i * pas + duree)); set(m, { y: lerp(60, 0, k), o: k, blur: lerp(12, 0, k) }); });
  }
  const pop = (t, d, dur = .4) => E.outBack(p(t, d, d + dur));

  // ---------------------------------------------------------------- calage sur la musique
  const BT = window.BATTEMENTS;
  const M = BT.filter((_, i) => i % 4 === 1);           // débuts de mesure
  const bt = (t, n = 0) => { let i = BT.findIndex((b) => b >= t - .03); if (i < 0) i = BT.length - 1; return BT[Math.min(i + n, BT.length - 1)]; };
  const SC = {
    s1: [0, M[3]], s2: [M[3], M[5]], s3: [M[5], M[7]], s4a: [M[7], M[9]], s4b: [M[9], M[11]], s4c: [M[11], M[13]], s4d: [M[13], M[15]],
    s5a: [M[15], M[17]], s5b: [M[17], M[19]], s6a: [M[19], M[22]], s6b: [M[22], M[24]], s7: [M[24], M[27]], s8: [M[27], M[30]], s9: [M[30], DUREE],
  };
  const TRANS = { s1: ['', 'zoom'], s2: ['zoom', 'droite'], s3: ['droite', 'haut'], s4a: ['haut', 'zoom'], s4b: ['zoom', 'droite'], s4c: ['droite', 'haut'], s4d: ['haut', 'zoom'],
    s5a: ['zoom', 'droite'], s5b: ['droite', 'zoom'], s6a: ['zoom', 'haut'], s6b: ['haut', 'droite'], s7: ['droite', 'zoom'], s8: ['zoom', 'cercle'], s9: ['cercle', ''] };
  // transitions d'entrée / de sortie communes
  function scene(id, t) {
    const [a, b] = SC[id], el = $(id), [te, ts] = TRANS[id];
    if (t < a - .12 || t > b + .06) { el.style.display = 'none'; return false; }
    el.style.display = 'block';
    const ki = te ? E.out3(p(t, a - .12, a + .3)) : 1, ko = ts ? E.in3(p(t, b - .3, b + .06)) : 0;
    const o = { o: 1, s: 1, x: 0, y: 0, rx: 0, ry: 0 };
    if (te === 'zoom') { o.s *= lerp(1.18, 1, ki); o.o *= ki; o.blur = lerp(14, 0, ki); }
    if (te === 'haut') { o.y += lerp(1100, 0, ki); o.rx += lerp(-12, 0, ki); }
    if (te === 'droite') { o.x += lerp(1080, 0, ki); o.ry += lerp(-16, 0, ki); }
    if (te === 'cercle') el.style.clipPath = `circle(${(ki * 120).toFixed(2)}% at 50% 62%)`; else el.style.clipPath = '';
    if (ts === 'zoom') { o.s *= lerp(1, 1.5, ko); o.o *= 1 - ko; }
    if (ts === 'haut') { o.y += lerp(0, -1200, ko); o.rx += lerp(0, 12, ko); }
    if (ts === 'droite') { o.x += lerp(0, -1080, ko); o.ry += lerp(0, 16, ko); }
    if (ts === 'cercle') { o.s *= lerp(1, .92, ko); }
    set(el, { ...o, o: clamp(o.o) });
    if (o.blur > .2) el.style.filter = `blur(${o.blur.toFixed(1)}px)`;
    return true;
  }

  // ---------------------------------------------------------------- textes mot à mot
  const T2 = mots('t2', 'Depuis Paris, Lyon, New York ou Atlanta');
  const T3 = mots('t3', 'Trois services sur une seule plateforme');
  const T4a = mots('t4a', 'Nourrissez la famille, où que vous soyez dans le monde');
  const T4b = mots('t4b', 'D’où passez-vous commande ?');
  const T4c = mots('t4c', 'Faire des courses pour mes proches');
  const T4d = mots('t4d', 'Suivi en temps réel');
  const T5a = mots('t5a', 'La boutique des artisans');
  const T5b = mots('t5b', 'Catégories');
  const T6a = mots('t6a', 'Du Burkina vers le monde entier');
  const T6b = mots('t6b', 'Expédiez vos colis du Burkina vers le monde entier');
  const T7 = mots('t7', 'Payez par carte bancaire ou Mobile Money');
  const T8 = mots('t8', 'Vendez vos créations dans le monde entier');

  // ---------------------------------------------------------------- éléments générés
  const PAYS = [['fr', 'France'], ['be', 'Belgique'], ['ch', 'Suisse'], ['de', 'Allemagne'], ['it', 'Italie'], ['es', 'Espagne'], ['pt', 'Portugal'], ['nl', 'Pays-Bas'], ['lu', 'Luxembourg'], ['gb', 'Royaume-Uni'],
    ['us', 'États-Unis'], ['ca', 'Canada'], ['ci', 'Côte d’Ivoire'], ['sn', 'Sénégal'], ['ml', 'Mali'], ['ne', 'Niger'], ['tg', 'Togo'], ['bj', 'Bénin'], ['gn', 'Guinée'], ['gh', 'Ghana'],
    ['ng', 'Nigeria'], ['cm', 'Cameroun'], ['ga', 'Gabon'], ['ma', 'Maroc'], ['ae', 'Émirats arabes unis'], ['cn', 'Chine'], ['bf', 'Burkina Faso']];
  const drapeaux = PAYS.map(([c, n]) => {
    const d = document.createElement('div'); d.className = 'pays' + (c === 'bf' ? ' bf' : '');
    d.innerHTML = `<img src="assets/drapeaux/${c}.svg" alt=""><span>${n}</span>`;
    $('grille4b').appendChild(d); return d;
  });
  drapeaux[24].querySelector('span').style.fontSize = '19px';

  const ETAPES = [['Pays', 'D’où passez-vous commande ?'], ['Courses', 'Paniers prêts à commander, modifiables avant validation.'], ['Bénéficiaire', 'Chez un proche au Burkina Faso'], ['Livraison', 'Livrés en 24 à 48 h à Ouagadougou'], ['Paiement', 'Mobile Money ou carte bancaire']];
  const etapes = ETAPES.map(([h, d], i) => {
    const e = document.createElement('div'); e.className = 'etape'; e.style.top = `${i * 230}px`;
    e.innerHTML = `<div class="num">${i + 1}</div><div><h4>${h}</h4><p>${d}</p></div>`;
    $('etapes4c').appendChild(e); return e;
  });

  const PRODUITS = [['tissus', 'Pagne Faso Dan Fani'], ['karite', 'Beurre de karité'], ['bijoux', 'Collier en perles du Sahel'], ['statuette', 'Statuette en bois peint'], ['panier', 'Panier tressé en paille']];
  const cartes = PRODUITS.map(([img, nom]) => {
    const c = document.createElement('div'); c.className = 'carte-p';
    c.innerHTML = `<div class="img" style="background-image:url(assets/photos/${img}.jpg)"></div><div class="nom">${nom}</div><div class="ombre"></div>`;
    $('carrousel').appendChild(c); return c;
  });

  const CATS = [['tissus', 'Textiles & mode africaine', 'Faso Dan Fani · Pagnes & tissus · Vêtements'], ['karite', 'Karité & cosmétiques', 'Beurre de karité · Savons & soins naturels'],
    ['marche', 'Produits locaux', 'Épices & condiments · Fruits séchés · Tisanes'], ['panier', 'Artisanat & décoration', 'Bois sculpté · Bronze & métal · Vannerie'],
    ['bijoux', 'Bijoux & accessoires', 'Colliers & bracelets · Perles & accessoires'], ['statuette', 'Objets traditionnels', 'Masques & statuettes · Instruments de musique']];
  const cats = CATS.map(([img, h, d], i) => {
    const c = document.createElement('div'); c.className = 'cat';
    c.style.left = `${(i % 2) * 505}px`; c.style.top = `${Math.floor(i / 2) * 370}px`;
    c.innerHTML = `<div class="img" style="background-image:url(assets/photos/${img}.jpg)"></div><div class="txt"><h4>${h}</h4><p>${d}</p></div>`;
    $('grille5b').appendChild(c); return c;
  });

  // ---------------------------------------------------------------- poussière dorée
  let graine = 7;
  const rnd = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
  const grains = Array.from({ length: 170 }, () => ({ x: rnd() * W, y: rnd() * H, z: .25 + rnd() * .75, r: 1.5 + rnd() * 4.5, v: 10 + rnd() * 35, ph: rnd() * 6.28 }));
  const ctxP = $('poussiere').getContext('2d');
  function poussiere(t, force) {
    ctxP.clearRect(0, 0, W, H);
    if (force <= 0) return;
    for (const g of grains) {
      const y = (g.y - t * g.v * g.z * 2 + H * 8) % H, x = g.x + Math.sin(t * .6 + g.ph) * 30 * g.z;
      const a = force * (.25 + .55 * g.z) * (.6 + .4 * Math.sin(t * 2 + g.ph)), r = g.r * (g.z + .2);
      const grad = ctxP.createRadialGradient(x, y, 0, x, y, r * 3);
      grad.addColorStop(0, `rgba(255,214,120,${a})`); grad.addColorStop(1, 'rgba(255,214,120,0)');
      ctxP.fillStyle = grad; ctxP.beginPath(); ctxP.arc(x, y, r * 3, 0, 6.283); ctxP.fill();
    }
  }

  // ---------------------------------------------------------------- carte du monde (Natural Earth)
  const RAD = Math.PI / 180;
  const miller = (lat) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * RAD)) / RAD;
  const anneaux = window.MONDE.pays.map((f) => {
    let x0 = 999, x1 = -999, y0 = 999, y1 = -999; const m = new Float64Array(f.length / 2);
    for (let i = 0; i < f.length; i += 2) { x0 = Math.min(x0, f[i]); x1 = Math.max(x1, f[i]); y0 = Math.min(y0, f[i + 1]); y1 = Math.max(y1, f[i + 1]); m[i / 2] = miller(f[i + 1]); }
    return { f, m, x0, x1, y0, y1 };
  });
  const bfAnneaux = window.MONDE.bf.map((f) => { const m = new Float64Array(f.length / 2); for (let i = 0; i < f.length; i += 2) m[i / 2] = miller(f[i + 1]); return { f, m }; });
  const BF = { lon: -1.75, lat: 12.25, nord: 15.08, sud: 9.4 };
  const V = { oua: [-1.52, 12.37], paris: [2.35, 48.86], lyon: [4.84, 45.76], ny: [-74.0, 40.71], atlanta: [-84.39, 33.75], jnb: [28.05, -26.2], montreal: [-73.57, 45.5], londres: [-0.13, 51.5], bruxelles: [4.35, 50.85], dakar: [-17.44, 14.69], abidjan: [-4.0, 5.36], nairobi: [36.82, -1.29], caire: [31.24, 30.04] };
  function Carte(canvas) {
    const ctx = canvas.getContext('2d');
    const cam = { lon: 0, mlat: 0, k: 1, cy: 1010 };
    const X = (lon) => 540 + (lon - cam.lon) * cam.k;
    const Ym = (m) => cam.cy - (m - cam.mlat) * cam.k;
    const Y = (lat) => Ym(miller(lat));
    const P = (v) => [X(v[0]), Y(v[1])];
    function chemin(a) { const { f, m } = a; ctx.moveTo(X(f[0]), Ym(m[0])); for (let i = 2; i < f.length; i += 2) ctx.lineTo(X(f[i]), Ym(m[i / 2])); ctx.closePath(); }
    function etoile(cx, cy, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .382 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
    function arc(o, d, k, largeur, alpha, tete, flux, t) {
      const [ox, oy] = o, [dx, dy] = d, L = Math.hypot(dx - ox, dy - oy) || 1;
      let nx = -(dy - oy) / L, ny = (dx - ox) / L; if (ny > 0) { nx = -nx; ny = -ny; }
      const cx = (ox + dx) / 2 + nx * L * .3, cy = (oy + dy) / 2 + ny * L * .3;
      const pt = (u) => [(1 - u) * (1 - u) * ox + 2 * (1 - u) * u * cx + u * u * dx, (1 - u) * (1 - u) * oy + 2 * (1 - u) * u * cy + u * u * dy];
      ctx.beginPath(); ctx.moveTo(ox, oy);
      for (let s = 1; s <= 48 * k; s++) { const q = pt(s / 48); ctx.lineTo(q[0], q[1]); }
      const fin = pt(k); ctx.lineTo(fin[0], fin[1]);
      ctx.lineWidth = largeur; ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(245,184,61,${alpha})`; ctx.shadowColor = 'rgba(255,200,90,.9)'; ctx.shadowBlur = largeur * 3; ctx.stroke(); ctx.shadowBlur = 0;
      if (tete && k < 1) { ctx.fillStyle = '#FFF4D6'; ctx.beginPath(); ctx.arc(fin[0], fin[1], largeur * 1.5, 0, 6.283); ctx.fill(); }
      if (flux && k >= 1) for (let j = 0; j < 3; j++) { const u = ((t * .7 + j / 3) % 1); const q = pt(u); ctx.fillStyle = `rgba(255,244,214,${Math.sin(u * Math.PI)})`; ctx.beginPath(); ctx.arc(q[0], q[1], largeur * 1.1, 0, 6.283); ctx.fill(); }
      return fin;
    }
    function etiquette(x, y, nom, k, taille = 40) {
      if (k <= 0) return;
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
      ctx.font = `700 ${taille}px P`; const w = ctx.measureText(nom).width + taille * 1.1, h = taille * 1.6;
      ctx.fillStyle = '#FBF8F4'; ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#22150F'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(nom, 0, 2); ctx.restore();
    }
    function point(x, y, r, t) {
      const pu = (t * 1.4) % 1;
      ctx.strokeStyle = `rgba(255,231,168,${(1 - pu) * .9})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + pu * 26, 0, 6.283); ctx.stroke();
      ctx.fillStyle = '#FFE7A8'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    }
    // o : { vis, lon, lat, k, bfK (agrandissement), bfPop, nomK, nomTaille, routes: [[de, vers, k, nom, kNom, largeur, alpha]], flux, t }
    function dessiner(o) {
      ctx.clearRect(0, 0, W, H);
      if (o.vis <= 0) return;
      cam.k = o.k; cam.lon = o.lon; cam.mlat = miller(o.lat);
      ctx.globalAlpha = o.vis;
      ctx.strokeStyle = 'rgba(247,235,219,.06)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let lo = -180; lo <= 180; lo += 15) { const x = X(lo); if (x > -10 && x < W + 10) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } }
      for (let la = -75; la <= 75; la += 15) { const y = Y(la); if (y > -10 && y < H + 10) { ctx.moveTo(0, y); ctx.lineTo(W, y); } }
      ctx.stroke();
      const lonMin = cam.lon - 560 / cam.k, lonMax = cam.lon + 560 / cam.k;
      ctx.beginPath();
      for (const a of anneaux) { if (a.x1 < lonMin || a.x0 > lonMax) continue; if (Y(a.y0) < -20 || Y(a.y1) > H + 20) continue; chemin(a); }
      ctx.fillStyle = 'rgba(247,235,219,.16)'; ctx.fill();
      ctx.strokeStyle = 'rgba(247,235,219,.32)'; ctx.lineWidth = clamp(cam.k / 30, 1, 2.4); ctx.lineJoin = 'round'; ctx.stroke();
      // routes (sous le Burkina)
      for (const [de, vers, k, nom, kNom, larg, alpha] of o.routes) {
        if (k <= 0) continue;
        const fin = arc(P(de), P(vers), k, larg, alpha, true, o.flux, o.t);
        if (k >= 1 && nom !== null) point(fin[0], fin[1], larg > 4 ? 10 : 6, o.t);
        if (nom) etiquette(fin[0], fin[1] - 50, nom, kNom);
      }
      // Burkina Faso aux couleurs du drapeau
      const kb = o.bfPop * o.bfK, cxB = X(BF.lon), cyB = Y(BF.lat);
      if (kb > 0) {
        if (o.bfK > 1.05) { ctx.beginPath(); for (const a of bfAnneaux) chemin(a); ctx.fillStyle = `rgba(252,209,22,${.5 * clamp(o.bfK - 1)})`; ctx.fill(); }
        ctx.save(); ctx.translate(cxB, cyB); ctx.scale(kb, kb); ctx.translate(-cxB, -cyB);
        ctx.globalAlpha = o.vis * clamp(o.bfPop * 1.5);
        ctx.beginPath(); for (const a of bfAnneaux) chemin(a);
        const relief = clamp(o.bfK - 1);
        ctx.shadowColor = relief > .5 ? 'rgba(0,0,0,.6)' : 'rgba(252,209,22,.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10 * relief / kb; ctx.fillStyle = '#EF2B2D'; ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.save(); ctx.clip();
        const yN = Y(BF.nord), yS = Y(BF.sud), yM = (yN + yS) / 2;
        ctx.fillStyle = '#EF2B2D'; ctx.fillRect(X(-6), yN - 5, X(3) - X(-6), yM - yN + 5);
        ctx.fillStyle = '#009E49'; ctx.fillRect(X(-6), yM, X(3) - X(-6), yS - yM + 5);
        ctx.fillStyle = '#FCD116'; etoile(X(-1.2), yM, (yS - yN) * .17);
        ctx.restore();
        ctx.beginPath(); for (const a of bfAnneaux) chemin(a);
        ctx.strokeStyle = '#FFF8EB'; ctx.lineWidth = clamp(cam.k / 14, 2, 6) / Math.max(1, kb); ctx.stroke();
        ctx.restore(); ctx.globalAlpha = o.vis;
        if (o.nomK > 0) {
          ctx.font = `800 ${o.nomTaille.toFixed(1)}px P`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillStyle = `rgba(251,248,244,${o.nomK * o.vis})`; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 10;
          ctx.fillText('Burkina Faso', cxB, cyB + (Y(BF.sud) - cyB) * Math.max(1, kb) + 16 + (1 - o.nomK) * 20); ctx.shadowBlur = 0;
        }
      }
      ctx.globalAlpha = 1;
    }
    return { dessiner, ctx };
  }
  const carte2 = Carte($('carte2')), carte6 = Carte($('carte6'));
  const INTRO = { impact: M[0], marche: [M[0], 2.25], xDepart: 1385, accroupi: [2.25, 2.75], morph: [2.75, 3.05], zoom: [3.0, 4.15],
    lettres: 3.12, lettresPas: .07, bandes: 3.25, slogan: 3.95, sloganPas: .026, eclat: bt(4.5), tampon: M[2] };
  const intro = window.IntroLogo($('s1'), INTRO);

  // ---------------------------------------------------------------- plan de quartier (suivi du livreur)
  const ctxV = $('ville').getContext('2d');
  const fondVille = document.createElement('canvas'); fondVille.width = 1360; fondVille.height = 1220;
  const PAS = 136, ORIG = [20, 30];
  const noeud = (i, j) => [ORIG[0] + i * PAS, ORIG[1] + j * PAS];
  const route = [[2, 7], [2, 5], [4, 5], [4, 3], [6, 3], [6, 2], [8, 2]].map(([i, j]) => noeud(i, j));
  (function dessinerVille() {
    const c = fondVille.getContext('2d');
    let g = 21; const r = () => ((g = (g * 16807) % 2147483647) / 2147483647);
    c.fillStyle = '#E6D8C2'; c.fillRect(0, 0, 1360, 1220);
    for (let i = -1; i < 11; i++) for (let j = -1; j < 10; j++) {
      const [x, y] = noeud(i, j), m = 16;
      const parc = r() < .08, eau = (i === 9 && j > 4) || (i === 8 && j === 8);
      c.fillStyle = eau ? '#A9C8D6' : parc ? '#B9CC98' : '#F4ECDF';
      c.beginPath(); c.roundRect(x + m, y + m, PAS - 2 * m, PAS - 2 * m, 10); c.fill();
      if (!parc && !eau) { c.fillStyle = 'rgba(200,170,130,.35)'; for (let q = 0; q < 4; q++) { const bx = x + m + 8 + r() * (PAS - 2 * m - 40), by = y + m + 8 + r() * (PAS - 2 * m - 40); c.fillRect(bx, by, 18 + r() * 14, 18 + r() * 14); } }
    }
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 22; c.lineCap = 'round';
    c.beginPath(); for (let i = 0; i < 11; i++) { c.moveTo(noeud(i, -1)[0], 0); c.lineTo(noeud(i, -1)[0], 1220); } for (let j = 0; j < 10; j++) { c.moveTo(0, noeud(-1, j)[1]); c.lineTo(1360, noeud(-1, j)[1]); } c.stroke();
    c.strokeStyle = '#F7D58C'; c.lineWidth = 34; c.beginPath(); c.moveTo(0, noeud(0, 5)[1]); c.lineTo(1360, noeud(0, 5)[1]); c.moveTo(noeud(4, 0)[0], 0); c.lineTo(noeud(4, 0)[0], 1220); c.stroke();
  })();
  function longueur(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  const LR = longueur(route);
  function surRoute(k) {
    let d = k * LR;
    for (let i = 1; i < route.length; i++) {
      const [ax, ay] = route[i - 1], [bx, by] = route[i], s = Math.hypot(bx - ax, by - ay);
      if (d <= s) return { x: ax + (bx - ax) * d / s, y: ay + (by - ay) * d / s, i, ang: Math.atan2(by - ay, bx - ax) };
      d -= s;
    }
    const n = route.length - 1; return { x: route[n][0], y: route[n][1], i: n + 1, ang: 0 };
  }
  function epingle(c, x, y, coul, k) {
    if (k <= 0) return;
    c.save(); c.translate(x, y); c.scale(k, k);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 4, 20, 8, 0, 0, 6.283); c.fill();
    c.fillStyle = coul; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-26, -34, -34, -56, -34, -70); c.arc(0, -70, 34, Math.PI, 0); c.bezierCurveTo(34, -56, 26, -34, 0, 0); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -70, 15, 0, 6.283); c.fill(); c.restore();
  }
  function ville(t, a, b) {
    ctxV.drawImage(fondVille, 0, 0);
    const k = E.inout3(p(t, a + .7, b - .55)), pos = surRoute(k);
    const pts = [...route.slice(0, pos.i), [pos.x, pos.y]];
    ctxV.lineCap = 'round'; ctxV.lineJoin = 'round';
    ctxV.strokeStyle = 'rgba(200,120,23,.25)'; ctxV.lineWidth = 16; ctxV.beginPath(); route.forEach(([x, y], i) => (i ? ctxV.lineTo(x, y) : ctxV.moveTo(x, y))); ctxV.stroke();
    ctxV.strokeStyle = '#C87817'; ctxV.lineWidth = 14; ctxV.shadowColor = 'rgba(200,120,23,.7)'; ctxV.shadowBlur = 16;
    ctxV.beginPath(); pts.forEach(([x, y], i) => (i ? ctxV.lineTo(x, y) : ctxV.moveTo(x, y))); ctxV.stroke(); ctxV.shadowBlur = 0;
    epingle(ctxV, route[0][0], route[0][1], '#4D3529', pop(t, a + .35));
    const arrivee = p(t, b - .6, b - .3), fin = route[route.length - 1];
    epingle(ctxV, fin[0], fin[1], '#009E49', pop(t, a + .5) * (1 + .15 * Math.sin(arrivee * Math.PI)));
    if (arrivee > 0) { ctxV.strokeStyle = `rgba(0,158,73,${1 - arrivee})`; ctxV.lineWidth = 6; ctxV.beginPath(); ctxV.arc(fin[0], fin[1], 30 + arrivee * 70, 0, 6.283); ctxV.stroke(); }
    // le livreur
    const kp = pop(t, a + .55);
    if (kp > 0) {
      ctxV.save(); ctxV.translate(pos.x, pos.y); ctxV.scale(kp, kp);
      ctxV.fillStyle = 'rgba(200,120,23,.25)'; ctxV.beginPath(); ctxV.arc(0, 0, 46 + 8 * Math.sin(t * 8), 0, 6.283); ctxV.fill();
      ctxV.fillStyle = '#fff'; ctxV.shadowColor = 'rgba(0,0,0,.35)'; ctxV.shadowBlur = 14; ctxV.beginPath(); ctxV.arc(0, 0, 34, 0, 6.283); ctxV.fill(); ctxV.shadowBlur = 0;
      ctxV.strokeStyle = '#C87817'; ctxV.lineWidth = 5; ctxV.stroke();
      ctxV.strokeStyle = '#4D3529'; ctxV.lineWidth = 3.4; ctxV.lineCap = 'round'; ctxV.lineJoin = 'round';
      ctxV.beginPath(); ctxV.arc(-12, 8, 7, 0, 6.283); ctxV.moveTo(19, 8); ctxV.arc(12, 8, 7, 0, 6.283); ctxV.moveTo(-5, 8); ctxV.lineTo(6, 8); ctxV.lineTo(12, -4); ctxV.lineTo(4, -4); ctxV.moveTo(9, -4); ctxV.lineTo(7, -12); ctxV.lineTo(12, -12); ctxV.moveTo(-12, 1); ctxV.lineTo(-6, -6); ctxV.lineTo(2, -6); ctxV.stroke();
      ctxV.restore();
    }
  }

  // ---------------------------------------------------------------- sons synchronisés
  const cues = [{ t: 0, type: 'montee', duree: M[0] }, { t: M[0], type: 'impact' }, { t: INTRO.accroupi[0], type: 'souffle', duree: .45 },
    { t: INTRO.morph[0] + .1, type: 'eclat' }, { t: M[1], type: 'tampon' }, { t: INTRO.lettres, type: 'cascade', duree: .6 }, { t: INTRO.bandes, type: 'souffle' },
    { t: INTRO.eclat, type: 'eclat' }, { t: INTRO.tampon, type: 'tampon' }];
  { const n = Math.max(2, Math.round((INTRO.xDepart - 1121) / (2 * 85 * Math.sin(Math.PI / 6) * .626))); for (let k = 1; k <= n; k++) cues.push({ t: INTRO.marche[0] + k / n * (INTRO.marche[1] - INTRO.marche[0]), type: 'pas' }); }
  Object.entries(SC).forEach(([id, [a]], i) => { if (i > 0) cues.push({ t: a - .16, type: ['s2', 's4a', 's5a', 's6a', 's7', 's9'].includes(id) ? 'impact-doux' : 'souffle' }); });
  const C = (t, type, extra = {}) => cues.push({ t, type, ...extra });

  window.renderAt = function (t) {
    // ---------- S1 entrée du logo ----------
    if (scene('s1', t)) intro(t);

    // ---------- S2 diaspora ----------
    {
      const [a, b] = SC.s2, vis = scene('s2', t);
      if (vis) {
        apparitionMots(T2, t, a + .1, .06, .35);
        const villes = [['paris', 'Paris', 1], ['lyon', 'Lyon', 2], ['ny', 'New York', 3], ['atlanta', 'Atlanta', 4]];
        const routes = villes.map(([v, nom, n]) => { const d = bt(a, n); return [V[v], V.oua, E.inout3(p(t, d, d + .6)), null, 0, 4, .85]; });
        carte2.dessiner({ vis: 1, lon: -38, lat: 31, k: 5.4 + .5 * p(t, a, b), bfK: 2.9, bfPop: pop(t, a + .2, .45), nomK: 0, nomTaille: 30, routes, flux: true, t });
        // étiquettes des villes (dessinées par-dessus)
        const c = carte2.ctx;
        villes.forEach(([v, nom, n]) => {
          const d = bt(a, n), k = pop(t, d, .35);
          const cam = { k: 5.4 + .5 * p(t, a, b) };
          const x = 540 + (V[v][0] + 38) * cam.k, y = 1010 - (miller(V[v][1]) - miller(31)) * cam.k;
          if (k > 0) {
            c.fillStyle = '#FFE7A8'; c.beginPath(); c.arc(x, y, 9 * k, 0, 6.283); c.fill();
            const dx = v === 'lyon' ? 70 : v === 'paris' ? -40 : v === 'atlanta' ? -20 : 0, dy = v === 'lyon' || v === 'atlanta' ? 46 : -46;
            c.save(); c.translate(x + dx, y + dy); c.scale(k, k);
            c.font = '700 34px P'; const w = c.measureText(nom).width + 36;
            c.fillStyle = '#FBF8F4'; c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 14; c.beginPath(); c.roundRect(-w / 2, -27, w, 54, 27); c.fill(); c.shadowBlur = 0;
            c.fillStyle = '#22150F'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nom, 0, 2); c.restore();
          }
        });
        const kt = E.out3(p(t, bt(a, 4), bt(a, 4) + .45)); set('txt2', { y: lerp(50, 0, kt), o: kt });
      } else carte2.dessiner({ vis: 0 });
    }

    // ---------- S3 trois services ----------
    {
      const [a] = SC.s3;
      if (scene('s3', t)) {
        apparitionMots(T3, t, a + .08, .06, .35);
        ['sv1', 'sv2', 'sv3'].forEach((id, i) => { const d = bt(a, 1 + 2 * i), k = E.out3(p(t, d, d + .45)); set(id, { rx: lerp(-85, 0, E.outBack(p(t, d, d + .5))), y: lerp(-40, 0, k), o: k }); });
        set('bande3', { x: -((t - a) * 80) % 100, o: 1 });
      }
    }

    // ---------- S4a courses ----------
    {
      const [a, b] = SC.s4a;
      if (scene('s4a', t)) {
        set('ph4a', { s: lerp(1.28, 1.06, E.out3(p(t, a, b))), x: lerp(30, -30, p(t, a, b)) });
        const ks = pop(t, a + .15, .3); set('sur4a', { s: ks, o: clamp(ks) });
        apparitionMots(T4a, t, a + .25, .05, .35);
        [['d4a1', bt(a, 3)], ['d4a2', bt(a, 5)]].forEach(([id, d]) => { const k = E.out3(p(t, d, d + .35)); set(id, { x: lerp(-40, 0, k), o: k }); });
      }
    }

    // ---------- S4b pays de commande ----------
    {
      const [a, b] = SC.s4b;
      if (scene('s4b', t)) {
        apparitionMots(T4b, t, a + .1, .07, .35);
        const ks = E.out3(p(t, a + .45, a + .8)); set('sous4b', { y: lerp(20, 0, ks), o: ks });
        drapeaux.forEach((d, i) => { const r = Math.floor(i / 5), c = i % 5, k = pop(t, a + .6 + (r + c) * .09, .35); set(d, { s: k, o: clamp(k), y: lerp(30, 0, clamp(k)) }); });
        set(drapeaux[26], { s: pop(t, a + .6 + 6 * .09 + .2, .45) * (1 + .05 * Math.sin((t - a) * 7)), o: clamp(pop(t, a + 1.34, .4)) });
        const kb = E.out3(p(t, bt(b - 1.6), bt(b - 1.6) + .4)); set('bas4b', { y: lerp(30, 0, kb), o: kb });
      }
    }

    // ---------- S4c comment ça marche ----------
    {
      const [a, b] = SC.s4c;
      if (scene('s4c', t)) {
        set('ph4c', { s: lerp(1.15, 1.05, p(t, a, b)) });
        const ks = pop(t, a + .1, .3); set('sur4c', { s: ks, o: clamp(ks) });
        apparitionMots(T4c, t, a + .2, .05, .35);
        let haut = 0;
        etapes.forEach((e, i) => { const d = bt(a, 2 + i), k = E.out3(p(t, d, d + .35)); set(e, { x: lerp(120, 0, k), o: k }); e.classList.toggle('active', t >= d); if (i > 0) haut += 230 * k; });
        $('ligne4c').style.height = `${haut.toFixed(1)}px`;
      }
    }

    // ---------- S4d suivi du livreur ----------
    {
      const [a, b] = SC.s4d;
      if (scene('s4d', t)) {
        ville(t, a, b);
        set('plan', { rx: lerp(52, 40, E.out3(p(t, a, b))), rz: lerp(-8, 4, p(t, a, b)), s: lerp(1.08, .98, E.out3(p(t, a, b))), y: lerp(60, 0, E.out3(p(t, a, a + .8))) });
        const ks = pop(t, a + .1, .3); set('sur4d', { s: ks, o: clamp(ks) });
        apparitionMots(T4d, t, a + .2, .07, .35);
        const kp = E.out3(p(t, a + .7, a + 1.05)); set('p4d', { y: lerp(30, 0, kp), o: kp });
        const kc = E.out3(p(t, bt(a, 4), bt(a, 4) + .4)); set('carte4d', { y: lerp(200, 0, kc), o: kc });
      }
    }

    // ---------- S5a boutique des artisans ----------
    {
      const [a, b] = SC.s5a;
      if (scene('s5a', t)) {
        set('fond5a', { s: 1.1 + .1 * p(t, a, b) });
        const ks = pop(t, a + .15, .3); set('sur5a', { s: ks, o: clamp(ks) });
        apparitionMots(T5a, t, a + .25, .06, .35);
        const tour = lerp(20, -220, E.inout3(p(t, a + .1, b - .15)));
        cartes.forEach((c, i) => { const ang = i * 72 + tour, face = Math.cos(ang * RAD); set(c, { o: 1 }); c.style.transform = `rotateY(${ang}deg) translateZ(420px)`; c.querySelector('.ombre').style.opacity = (.75 - .75 * clamp(face)).toFixed(3); });
        set('carrousel', { s: lerp(.6, 1, E.out3(p(t, a, a + .6))), rx: -6, o: 1 });
        const kp = E.out3(p(t, bt(a, 3), bt(a, 3) + .4)); set('bas5a', { y: lerp(60, 0, kp), o: kp });
      }
    }

    // ---------- S5b catégories ----------
    {
      const [a] = SC.s5b;
      if (scene('s5b', t)) {
        const ks = pop(t, a + .1, .3); set('sur5b', { s: ks, o: clamp(ks) });
        apparitionMots(T5b, t, a + .2, .06, .35);
        cats.forEach((c, i) => { const d = bt(a, 1 + i * .5 | 0) + (i % 2) * .12, k = E.out3(p(t, d, d + .45)); set(c, { ry: lerp(i % 2 ? 90 : -90, 0, E.outBack(p(t, d, d + .5))), o: k }); });
        const kb = E.out3(p(t, bt(a, 4), bt(a, 4) + .4)); set('bas5b', { y: lerp(40, 0, kb), o: kb });
      }
    }

    // ---------- S6a carte : du Burkina vers le monde ----------
    {
      const [a, b] = SC.s6a, vis = scene('s6a', t);
      if (vis) {
        const ks = pop(t, a + .1, .3); set('sur6a', { s: ks, o: clamp(ks) });
        apparitionMots(T6a, t, a + .18, .06, .34);
        const z = E.inout3(p(t, a + .85, a + 1.75)), k0 = 92, k1 = 6.2;
        const k = Math.exp(lerp(Math.log(k0), Math.log(k1), z)), u = (1 / k - 1 / k0) / (1 / k1 - 1 / k0);
        const derive = 1 + .14 * (1 - E.out3(p(t, a, a + .4))) + .05 * p(t, a + 1.75, b);
        const routes = [];
        [['montreal', 1.6], ['londres', 1.64], ['bruxelles', 1.7], ['dakar', 1.62], ['abidjan', 1.72], ['nairobi', 1.8], ['caire', 1.75]].forEach(([v, d]) => routes.push([V.oua, V[v], E.inout3(p(t, a + d, a + d + .45)), '', 0, 2.5, .55]));
        [['ny', 'Amérique', 1.55], ['paris', 'Europe', 1.67], ['jnb', 'Afrique', 1.79]].forEach(([v, nom, d]) => routes.push([V.oua, V[v], E.inout3(p(t, a + d, a + d + .5)), nom, pop(t, a + d + .42, .32), 6, .95]));
        carte6.dessiner({ vis: 1, k: k * derive, lon: lerp(BF.lon, -24, u), lat: lerp(BF.lat, 23, u), bfK: lerp(1, 2.7, z), bfPop: pop(t, a + .08, .45), nomK: E.out3(p(t, a + .3, a + .6)), nomTaille: lerp(56, 30, z), routes, flux: false, t });
        [['prixA', a + 2.3], ['prixB', a + 2.5]].forEach(([id, d]) => { const kk = E.out3(p(t, d, d + .3)); set(id, { y: lerp(50, 0, kk), o: kk }); });
      } else carte6.dessiner({ vis: 0 });
    }

    // ---------- S6b étapes colis ----------
    {
      const [a] = SC.s6b;
      if (scene('s6b', t)) {
        apparitionMots(T6b, t, a + .08, .05, .34);
        const kd = p(t, a + .15, a + .6), rebond = kd < 1 ? lerp(-500, 0, E.in3(kd)) : -Math.abs(Math.sin((t - a - .6) * 9)) * 30 * Math.exp(-(t - a - .6) * 5);
        set('boite', { y: rebond, rx: -18, ry: (t - a) * 55 + 30 });
        set('ombre-boite', { s: lerp(.4, 1, clamp(kd)), o: clamp(kd) });
        ['pas1', 'pas2', 'pas3'].forEach((id, i) => { const d = bt(a, 1 + i), k = E.out3(p(t, d, d + .4)); set(id, { x: lerp(i % 2 ? -1000 : 1000, 0, k), o: k }); });
        const kc = pop(t, bt(a, 5), .4); set('suivi6b', { s: kc, o: clamp(kc) });
      }
    }

    // ---------- S7 paiement + application ----------
    {
      const [a, b] = SC.s7;
      if (scene('s7', t)) {
        const in7 = p(t, a, a + .9);
        set('cone', { o: .4 + .6 * E.out3(p(t, a, a + .9)) });
        const orb = lerp(-9, 8, E.inout3(p(t, a + .9, b - .3)));
        set('tel', { y: lerp(1500, 0, E.out3(in7)), z: lerp(-200, 0, E.out3(in7)), ry: lerp(40, orb, E.out3(in7)), rx: lerp(16, 3, E.out3(in7)), rz: lerp(-6, 0, E.out3(in7)), o: 1 });
        const p2 = bt(a, 4), p3 = bt(a, 8), k2 = E.inout3(p(t, p2, p2 + .35)), k3 = E.inout3(p(t, p3, p3 + .35));
        $('ec1').style.transform = `translateX(${(-k2 * 172).toFixed(1)}px)`;
        $('ec2').style.transform = `translateX(${((1 - k2) * 580 - k3 * 172).toFixed(1)}px)`;
        $('ec3').style.transform = `translateX(${((1 - k3) * 580).toFixed(1)}px)`;
        $('ec1').style.filter = `brightness(${(1 - .35 * k2).toFixed(3)})`; $('ec2').style.filter = `brightness(${(1 - .35 * k3).toFixed(3)})`;
        set('glint7', { x: lerp(0, 1900, E.inout3(t < p3 - .2 ? p(t, a + .95, a + 1.6) : p(t, p3 + .2, p3 + .85))) });
        apparitionMots(T7, t, a + .8, .06, .34);
        [['t-om', 2, -1], ['t-wave', 3, 1], ['t-moov', 4, -1], ['t-mc', 5, 1], ['t-visa', 6, -1]].forEach(([id, n, c], i) => {
          const k = pop(t, bt(a, n), .36); set(id, { s: k, o: clamp(k), x: c * (1 - clamp(k)) * 80, y: Math.sin(t * 2.2 + i * 1.3) * 9, rz: c * -3 });
        });
        const kr = E.out3(p(t, bt(a, 6), bt(a, 6) + .35)) * (1 - p(t, p3 - .25, p3)); set('recu7', { y: lerp(40, 0, kr), o: kr });
        const kg = E.outBack(p(t, p3, p3 + .4)); set('dispo7', { s: lerp(.8, 1, kg), o: clamp(E.out3(p(t, p3, p3 + .3))) });
      }
    }

    // ---------- S8 vendeurs ----------
    {
      const [a, b] = SC.s8;
      if (scene('s8', t)) {
        set('photo8', { s: lerp(1.15, 1.03, E.out3(p(t, a, b))), y: lerp(20, -20, p(t, a, b)) });
        const ks = pop(t, a + .15, .3); set('sur8', { s: ks, o: clamp(ks) });
        apparitionMots(T8, t, a + .25, .06, .34);
        [['f1', bt(a, 3), -1, 'c1', 15], ['f2', bt(a, 4), 1, 'c2', 8]].forEach(([id, d, c, cid, val]) => {
          const k = E.out3(p(t, d, d + .45)); set(id, { ry: lerp(c * 70, 0, E.outBack(p(t, d, d + .5))), y: lerp(80, 0, k), o: k });
          $(cid).textContent = `${Math.round(val * E.out3(p(t, d + .2, d + .8)))} %`;
        });
        const kb = E.out3(p(t, bt(a, 7), bt(a, 7) + .4)); set('bas8', { y: lerp(30, 0, kb), o: kb });
        const kc = pop(t, bt(a, 8), .4), pul = t > bt(a, 9) ? 1 + .035 * Math.sin((t - bt(a, 9)) * 8) : 1; set('cta8', { s: kc * pul, o: clamp(kc) });
      }
    }

    // ---------- S9 fin ----------
    {
      const [a] = SC.s9;
      if (scene('s9', t)) {
        const kl = E.outBack(p(t, a + .1, a + .75));
        set('logo9', { s: lerp(.5, 1, kl), o: clamp(E.out3(p(t, a + .1, a + .45))), blur: lerp(14, 0, E.out3(p(t, a + .1, a + .6))) });
        const kbd = E.out3(p(t, a + .5, a + .85)); set('badge9', { y: lerp(-30, 0, kbd), o: kbd });
        const kd = E.out3(p(t, a + .65, a + 1)); set('dispo9', { y: lerp(30, 0, kd), o: kd });
        const ku = E.inout3(p(t, a + .75, a + 1.2)); set('url9', { o: t > a + .75 ? 1 : 0 });
        document.querySelector('#url9 span').style.clipPath = `inset(0 ${(100 - ku * 100).toFixed(2)}% 0 0 round 999px)`;
        const kg = E.outBack(p(t, a + 1.1, a + 1.5)), pul = t > a + 1.8 ? 1 + .03 * Math.sin((t - a - 1.8) * 8) : 1; set('gp9', { s: kg * pul, o: clamp(kg) });
        const kw = E.out3(p(t, a + 1.4, a + 1.8)); set('wa9', { y: lerp(40, 0, kw), o: kw });
        set('credit9', { o: E.out3(p(t, a + 1.7, a + 2.2)) });
        set('bande9a', { x: -((t - a) * 60) % 100, o: 1 }); set('bande9b', { x: ((t - a) * 60) % 100 - 100, o: 1 });
      }
    }

    // ---------- couches globales ----------
    const clair = (t >= M[0] + .3 && t < SC.s1[1]) || (t >= SC.s4b[0] && t < SC.s4b[1]) || t >= SC.s9[0];
    poussiere(t, t < 3 ? E.out3(p(t, 0, .8)) : clair ? .25 : .35);
    $('poussiere').style.mixBlendMode = clair ? 'multiply' : 'screen';
    set('flare', { x: lerp(-300, 2400, E.inout3(p(t, .15, .95))), o: t < 1 ? .9 : 0, rz: 18 });
    const flashs = [[M[0], .18], ...['s2', 's4a', 's5a', 's6a', 's7', 's9'].map((id) => [SC[id][0], .2])];
    let fl = 0; for (const [ft, d] of flashs) { if (t >= ft - .06 && t <= ft + d) fl = Math.max(fl, t < ft ? p(t, ft - .06, ft) : 1 - p(t, ft, ft + d)); }
    $('flash').style.opacity = (fl * .8).toFixed(3);
    $('fondu').style.opacity = E.in3(p(t, DUREE - .6, DUREE)).toFixed(3);
  };

  // effets ponctuels (en plus des transitions)
  {
    const [a2] = SC.s2; C(a2 + .2, 'tampon'); [1, 2, 3, 4].forEach((n) => C(bt(a2, n), 'pop'));
    const [a3] = SC.s3; [1, 3, 5].forEach((n) => C(bt(a3, n), 'pop'));
    const [a4a] = SC.s4a; C(bt(a4a, 3), 'pop'); C(bt(a4a, 5), 'pop');
    const [a4b] = SC.s4b; C(a4b + .6, 'cascade', { duree: 1.0 }); C(a4b + 1.34, 'eclat');
    const [a4c] = SC.s4c; [2, 3, 4, 5, 6].forEach((n) => C(bt(a4c, n), 'pop'));
    const [a4d] = SC.s4d; C(SC.s4d[1] - .55, 'eclat'); C(bt(a4d, 4), 'glisse');
    const [a5a] = SC.s5a; C(bt(a5a, 3), 'glisse');
    const [a5b] = SC.s5b; [0, 1, 2, 3, 4, 5].forEach((i) => C(bt(a5b, 1 + i * .5 | 0) + (i % 2) * .12, 'pop'));
    const [a6a] = SC.s6a; C(a6a + .1, 'tampon'); C(a6a + .85, 'souffle', { duree: .9 }); [1.97, 2.09, 2.21].forEach((d) => C(a6a + d, 'pop'));
    const [a6b] = SC.s6b; C(a6b + .6, 'tampon'); [1, 2, 3].forEach((n) => C(bt(a6b, n), 'glisse')); C(bt(a6b, 5), 'pop');
    const [a7] = SC.s7; [2, 3, 4, 5, 6].forEach((n) => C(bt(a7, n), 'pop')); C(bt(a7, 4), 'glisse'); C(bt(a7, 8), 'glisse'); C(bt(a7, 8) + .05, 'eclat');
    const [a8] = SC.s8; C(bt(a8, 3), 'pop'); C(bt(a8, 4), 'pop'); C(bt(a8, 8), 'eclat');
    const [a9] = SC.s9; C(a9 + .75, 'glisse'); C(a9 + 1.1, 'pop'); C(DUREE - .6, 'fin');
  }
  window.__cues = cues.sort((x, y) => x.t - y.t).map((c) => ({ ...c, t: Math.round(c.t * 1000) / 1000 }));
  window.__scenes = SC;

  const images = ['courses', 'tissus', 'karite', 'bijoux', 'statuette', 'panier', 'marche', 'marche2', 'artisan'].map((n) => `assets/photos/${n}.jpg`);
  Promise.all([document.fonts.ready, ...Array.from(document.images).map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; })))])
    .then(() => Promise.all(images.map((u) => new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = u; }))))
    .then(() => Promise.all(['500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 40px P`))))
    .then(() => { window.renderAt(0); window.__ready = true; });
})();
