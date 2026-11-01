// Tondraaga — moteur des vidéos (version longue sur le balafon, version courte « ?plan=court » sur la flûte).
(function () {
  const MODE = new URLSearchParams(location.search).get('plan') === 'court' ? 'court' : 'long';
  const W = 1080, H = 1920, FPS = 30, DUREE = MODE === 'court' ? 44 : 84.6;
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
  // version longue : battements détectés dans le balafon ; version courte : grille de percussions à 104 bpm sous la flûte
  const BT = MODE === 'court' ? Array.from({ length: 96 }, (_, i) => +(0.70 + (i - 1) * 60 / 104).toFixed(4)) : window.BATTEMENTS;
  const M = BT.filter((_, i) => i % 4 === 1);           // débuts de mesure
  const Mf = (k) => { const i = Math.floor(k), f = k - i; return f ? M[i] + f * (M[i + 1] - M[i]) : M[i]; };
  const bt = (t, n = 0) => { let i = BT.findIndex((b) => b >= t - .03); if (i < 0) i = BT.length - 1; return BT[Math.min(i + n, BT.length - 1)]; };
  const bq = (a, b, f) => { const x = a + f * (b - a); let m = BT[0]; for (const v of BT) if (Math.abs(v - x) < Math.abs(m - x)) m = v; return m; };
  const PLANS = {
    long: [['s1', 0, 3, '', 'zoom'], ['s2', 3, 5, 'zoom', 'droite'], ['s3', 5, 7, 'droite', 'haut'], ['s4a', 7, 9, 'haut', 'zoom'], ['s4b', 9, 11, 'zoom', 'droite'],
      ['s4c', 11, 13, 'droite', 'haut'], ['s4d', 13, 15, 'haut', 'zoom'], ['s5a', 15, 17, 'zoom', 'droite'],
      ['tr1', 17, 19, 'droite', 'haut'], ['tr2', 19, 21, 'haut', 'droite'], ['tr3', 21, 23, 'droite', 'zoom'], ['tr4', 23, 25, 'zoom', 'haut'], ['tr5', 25, 27, 'haut', 'droite'], ['tr6', 27, 29, 'droite', 'zoom'],
      ['s6a', 29, 32, 'zoom', 'haut'], ['s6b', 32, 34, 'haut', 'droite'], ['s7', 34, 37, 'droite', 'zoom'], ['s8', 37, 40, 'zoom', 'cercle'], ['s9', 40, null, 'cercle', '']],
    court: [['s1', 0, 2.5, '', 'zoom'], ['s4a', 2.5, 3.5, 'zoom', 'droite'], ['s4b', 3.5, 4.5, 'droite', 'haut'], ['s5a', 4.5, 5.5, 'haut', 'zoom'],
      ['tr1', 5.5, 6.5, 'zoom', 'droite'], ['tr2', 6.5, 7.5, 'droite', 'haut'], ['tr3', 7.5, 8.5, 'haut', 'droite'], ['tr4', 8.5, 9.5, 'droite', 'zoom'], ['tr5', 9.5, 10.5, 'zoom', 'haut'], ['tr6', 10.5, 11.5, 'haut', 'zoom'],
      ['s6a', 11.5, 13, 'zoom', 'droite'], ['s7', 13, 15, 'droite', 'zoom'], ['s8', 15, 16.5, 'zoom', 'cercle'], ['s9', 16.5, null, 'cercle', '']],
  };
  const PLAN = PLANS[MODE];
  const SC = Object.fromEntries(PLAN.map(([id, d, f]) => [id, [Mf(d), f === null ? DUREE : Mf(f)]]));
  const TRANS = Object.fromEntries(PLAN.map(([id, , , te, ts]) => [id, [te, ts]]));
  ['s1', 's2', 's3', 's4a', 's4b', 's4c', 's4d', 's5a', 's5b', 'tr1', 'tr2', 'tr3', 'tr4', 'tr5', 'tr6', 's6a', 's6b', 's7', 's8', 's9'].forEach((id) => { if (!SC[id]) $(id).style.display = 'none'; });
  // transitions d'entrée / de sortie communes
  function scene(id, t) {
    if (!SC[id]) return false;
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
  const T7 = mots('t7', 'Payez par Mobile Money ou carte bancaire');
  const TT = [['tt1', 'Faso Dan Fani'], ['tt2', 'Koko Dunda'], ['tt3', 'Miel'], ['tt4', 'Céréales'], ['tt5', 'Thé & kinkeliba'], ['tt6', 'Produits locaux']].map(([id, x]) => mots(id, x));
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
  if (MODE === 'court') $('credit9').style.display = 'none';   // la flûte est jouée par l'auteur de Tondraaga : pas de crédit
  const INTRO = MODE === 'court'
    ? { impact: M[0], marche: [M[0], 2.1], xDepart: 1330, accroupi: [2.1, 2.58], morph: [2.62, 2.95], zoom: [2.9, 3.85],
      lettres: 2.98, lettresPas: .05, bandes: 3.05, slogan: 3.55, sloganPas: .018, eclat: 4.0, tampon: M[2] }
    : { impact: M[0], marche: [M[0], 2.25], xDepart: 1385, accroupi: [2.25, 2.75], morph: [2.75, 3.05], zoom: [3.0, 4.15],
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

  // ---------------------------------------------------------------- grain de film
  const ctxGr = $('grain').getContext('2d');
  const grainsTuiles = Array.from({ length: 6 }, () => { const c = document.createElement('canvas'); c.width = 540; c.height = 960; const g = c.getContext('2d'); const im = g.createImageData(540, 960); for (let i = 0; i < im.data.length; i += 4) { const v = rnd() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); return c; });
  function grain(t) { ctxGr.drawImage(grainsTuiles[Math.floor(t * FPS) % grainsTuiles.length], 0, 0); }

  // ---------------------------------------------------------------- chapitre terroir
  function texteTerroir(n, t, a, b) {
    const ks = pop(t, a + .12, .3); set(`ts${n}`, { s: ks, o: clamp(ks) });
    apparitionMots(TT[n - 1], t, a + .2, .07, .32);
    if ($(`tp${n}`)) { const k = E.out3(p(t, a + .45, a + .8)); set(`tp${n}`, { y: lerp(30, 0, k), o: k }); }
    const num = $(`tr${n}`).querySelector('.t-num'), kn = E.out3(p(t, a, a + .6));
    num.style.transform = `translateY(${lerp(90, 0, kn).toFixed(1)}px)`; num.style.opacity = kn.toFixed(3);
  }
  // T1 : tissage du Faso Dan Fani (bandes tissées fil à fil, navette)
  const ctxF = $('c-fdf').getContext('2d');
  const CHAINES = [['#F4EEE6', '#B4231C', '#F4EEE6', '#F4EEE6', '#B4231C'], ['#F2C230', '#F7E7A1', '#F2C230', '#E3A21A'], ['#F4EEE6', '#2B3A8C', '#F4EEE6', '#2B3A8C', '#2B3A8C', '#F4EEE6'],
    ['#2B3A8C', '#7FA3D9', '#2B3A8C', '#1B2560'], ['#B4231C', '#1B1B1B', '#B4231C', '#F5B83D'], ['#C87817', '#4D3529', '#C87817', '#F3E6D6'], ['#1E7A44', '#F4EEE6', '#1E7A44', '#0F4D2A']];
  const TRAMES = ['#F4EEE6', '#F7E7A1', '#F4EEE6', '#BBC9EA', '#F5B83D', '#F3E6D6', '#E9F2EA'];
  function tissage(t, a, b) {
    ctxF.fillStyle = '#1E120C'; ctxF.fillRect(0, 0, W, H);
    const nb = 7, l = 138, g = 10, x0 = (W - (nb * l + (nb - 1) * g)) / 2, rang = 9, d = b - a;
    for (let i = 0; i < nb; i++) {
      const x = x0 + i * (l + g), prog = clamp((t - a - i * .05 * d) / (d * .6)), rows = Math.floor(prog * (H / rang));
      const fils = CHAINES[i], n = fils.length * 3, fw = l / n;
      ctxF.globalAlpha = .28; for (let j = 0; j < n; j++) { ctxF.fillStyle = fils[j % fils.length]; ctxF.fillRect(x + j * fw, 0, fw - 1.2, H); }
      ctxF.globalAlpha = 1;
      for (let r = 0; r < rows; r++) for (let j = 0; j < n; j++) { ctxF.fillStyle = (r + j) % 2 ? TRAMES[i] : fils[j % fils.length]; ctxF.fillRect(x + j * fw, r * rang, fw + .3, rang); }
      const ombre = ctxF.createLinearGradient(x, 0, x + l, 0); ombre.addColorStop(0, 'rgba(0,0,0,.28)'); ombre.addColorStop(.12, 'rgba(0,0,0,0)'); ombre.addColorStop(.88, 'rgba(0,0,0,0)'); ombre.addColorStop(1, 'rgba(0,0,0,.28)');
      ctxF.fillStyle = ombre; ctxF.fillRect(x, 0, l, rows * rang);
      if (prog < 1 && prog > 0) {
        const y = rows * rang, nx = x + (Math.sin((t - a) * 13 + i * 1.7) * .5 + .5) * l;
        ctxF.fillStyle = '#F5B83D'; ctxF.fillRect(x, y, l, 2);
        ctxF.fillStyle = '#7A4A22'; ctxF.beginPath(); ctxF.ellipse(nx, y + 4, 30, 8, 0, 0, 6.283); ctxF.fill();
        ctxF.fillStyle = '#B07A45'; ctxF.beginPath(); ctxF.ellipse(nx, y + 2, 20, 3.5, 0, 0, 6.283); ctxF.fill();
      }
    }
  }
  // T2 : teinture koko dunda (taches de teinture qui s'épanouissent, réserves blanches)
  const ctxK = $('c-koko').getContext('2d');
  const TACHES = Array.from({ length: 30 }, () => ({ x: rnd() * W, y: rnd() * 1500, r: 90 + rnd() * 230, c: ['181,23,43', '217,84,30', '227,155,43', '59,63,143', '122,30,58'][Math.floor(rnd() * 5)], d: rnd() }));
  function teinture(t, a, b) {
    const d = b - a;
    ctxK.fillStyle = '#F1E4D0'; ctxK.fillRect(0, 0, W, H);
    for (const q of TACHES) {
      const k = E.out3(p(t, a + q.d * d * .45, a + (q.d * .45 + .45) * d)); if (k <= 0) continue;
      const r = q.r * k, g = ctxK.createRadialGradient(q.x, q.y, r * .1, q.x, q.y, r);
      g.addColorStop(0, `rgba(${q.c},.9)`); g.addColorStop(.7, `rgba(${q.c},.75)`); g.addColorStop(1, `rgba(${q.c},0)`);
      ctxK.fillStyle = g; ctxK.beginPath(); ctxK.arc(q.x, q.y, r, 0, 6.283); ctxK.fill();
      ctxK.strokeStyle = `rgba(255,250,240,${.75 * k})`; ctxK.lineWidth = 5; ctxK.setLineDash([3, 9]);
      [.3, .55, .78].forEach((f) => { ctxK.beginPath(); ctxK.arc(q.x, q.y, r * f, 0, 6.283); ctxK.stroke(); });
      ctxK.setLineDash([]);
    }
    ctxK.fillStyle = 'rgba(30,18,12,.35)'; ctxK.fillRect(0, 0, W, H);
  }
  // T3 : miel (rayons hexagonaux, coulures)
  const ctxM = $('c-miel').getContext('2d');
  const COULURES = Array.from({ length: 7 }, (_, i) => ({ x: 70 + i * 155 + rnd() * 40, w: 26 + rnd() * 26, L: 260 + rnd() * 700, d: rnd() * .3 }));
  function miel(t, a, b) {
    const d = b - a;
    const fond = ctxM.createRadialGradient(540, 700, 50, 540, 700, 1300); fond.addColorStop(0, '#5A2E06'); fond.addColorStop(1, '#170B03');
    ctxM.fillStyle = fond; ctxM.fillRect(0, 0, W, H);
    const R = 52, hx = R * Math.sqrt(3);
    for (let row = -1; row < 24; row++) for (let col = -1; col < 9; col++) {
      const cx = col * hx + (row % 2 ? hx / 2 : 0), cy = row * R * 1.5, dist = Math.hypot(cx - 540, cy - 700);
      const k = E.out3(p(t, a + dist / 1500 * d * .5, a + dist / 1500 * d * .5 + .5)); if (k <= 0) continue;
      ctxM.beginPath(); for (let i = 0; i < 6; i++) { const an = Math.PI / 6 + i * Math.PI / 3; ctxM.lineTo(cx + Math.cos(an) * R * .94 * k, cy + Math.sin(an) * R * .94 * k); } ctxM.closePath();
      ctxM.fillStyle = `rgba(245,170,40,${.1 + .12 * ((row * 7 + col * 3) % 5 === 0)})`; ctxM.fill();
      ctxM.strokeStyle = `rgba(250,200,90,${.45 * k})`; ctxM.lineWidth = 3; ctxM.stroke();
    }
    const nappe = ctxM.createLinearGradient(0, 0, 0, 90); nappe.addColorStop(0, '#F9C24A'); nappe.addColorStop(1, '#D5860F');
    for (const c of COULURES) {
      const L = c.L * E.inout3(p(t, a + c.d * d, b)); if (L <= 2) continue;
      const g = ctxM.createLinearGradient(c.x - c.w, 0, c.x + c.w, 0); g.addColorStop(0, '#C9780C'); g.addColorStop(.45, '#FBC34A'); g.addColorStop(1, '#B9690A');
      ctxM.fillStyle = g; ctxM.beginPath(); ctxM.moveTo(c.x - c.w / 2, 0); ctxM.lineTo(c.x - c.w * .35, L); ctxM.arc(c.x, L, c.w * .62, Math.PI, 0, true); ctxM.lineTo(c.x + c.w / 2, 0); ctxM.closePath(); ctxM.fill();
      ctxM.strokeStyle = 'rgba(255,240,200,.65)'; ctxM.lineWidth = 3; ctxM.beginPath(); ctxM.moveTo(c.x - c.w * .12, 10); ctxM.lineTo(c.x - c.w * .1, L - 4); ctxM.stroke();
    }
    ctxM.fillStyle = nappe; ctxM.beginPath(); ctxM.moveTo(0, 0); ctxM.lineTo(W, 0); for (let x = W; x >= 0; x -= 20) ctxM.lineTo(x, 46 + Math.sin(x / 60 + t * 2) * 8); ctxM.closePath(); ctxM.fill();
  }
  // T4 : céréales (pluie de grains)
  const ctxC = $('c-cer').getContext('2d');
  const GRAINS = Array.from({ length: 260 }, () => ({ x: rnd() * W, y: rnd() * H, v: 500 + rnd() * 900, r: 3 + rnd() * 4, a: rnd() * 6.28, c: ['#F3C94A', '#E8B33A', '#F6DD8A', '#C98E2A', '#EDE0B8'][Math.floor(rnd() * 5)] }));
  function cereales(t, a) {
    ctxC.clearRect(0, 0, W, H);
    for (const g of GRAINS) {
      const y = (g.y + (t - a) * g.v) % (H + 40) - 20;
      ctxC.save(); ctxC.translate(g.x + Math.sin(t * 3 + g.a) * 6, y); ctxC.rotate(g.a + t * 2); ctxC.fillStyle = g.c; ctxC.beginPath(); ctxC.ellipse(0, 0, g.r, g.r * .66, 0, 0, 6.283); ctxC.fill(); ctxC.restore();
    }
  }
  // T5 : thé et kinkeliba (illustration : plateau, deux verres, la théière verse de haut, mousse, vapeur, feuilles)
  const svgT = $('the-svg');
  svgT.innerHTML = `<defs>
      <radialGradient id="th-lueur" cx="50%" cy="55%" r="50%"><stop offset="0" stop-color="rgba(245,170,70,.55)"/><stop offset="1" stop-color="rgba(245,170,70,0)"/></radialGradient>
      <linearGradient id="th-metal" x1="0" x2="1"><stop offset="0" stop-color="#6f6f75"/><stop offset=".3" stop-color="#f4f4f6"/><stop offset=".55" stop-color="#b9b9bf"/><stop offset=".8" stop-color="#e3e3e7"/><stop offset="1" stop-color="#55555b"/></linearGradient>
      <linearGradient id="th-metal2" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e9e9ed"/><stop offset="1" stop-color="#8a8a90"/></linearGradient>
      <linearGradient id="th-plateau" x1="0" x2="1"><stop offset="0" stop-color="#8d6a2e"/><stop offset=".35" stop-color="#f1d58e"/><stop offset=".6" stop-color="#c49a45"/><stop offset="1" stop-color="#7b5a24"/></linearGradient>
      <linearGradient id="th-the" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="rgba(233,164,58,.92)"/><stop offset="1" stop-color="rgba(120,58,14,.96)"/></linearGradient>
      <linearGradient id="th-jet" x1="0" x2="1"><stop offset="0" stop-color="#B8691C"/><stop offset=".5" stop-color="#F0B04E"/><stop offset="1" stop-color="#A65A16"/></linearGradient>
      <linearGradient id="th-verre" x1="0" x2="1"><stop offset="0" stop-color="rgba(255,255,255,.42)"/><stop offset=".22" stop-color="rgba(255,255,255,.06)"/><stop offset=".78" stop-color="rgba(255,255,255,.04)"/><stop offset="1" stop-color="rgba(255,255,255,.34)"/></linearGradient>
      <clipPath id="th-clip1"><path d="M-95 -150 L95 -150 L76 150 L-76 150 Z"/></clipPath>
      <clipPath id="th-clip2"><path d="M-80 -126 L80 -126 L64 126 L-64 126 Z"/></clipPath>
      <filter id="th-flou"><feGaussianBlur stdDeviation="5"/></filter>
      <g id="th-feuille"><path d="M0 -40 C24 -26 24 22 0 42 C-24 22 -24 -26 0 -40 Z"/><path d="M0 -38 L0 40 M0 -12 L13 -22 M0 4 L-13 -6 M0 20 L12 11 M0 -24 L-10 -31" stroke="rgba(220,240,200,.55)" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
    </defs>
    <ellipse cx="540" cy="900" rx="560" ry="520" fill="url(#th-lueur)"/>
    <g id="th-feuilles-fond"></g>
    <g id="th-plateau-g">
      <ellipse cx="560" cy="1170" rx="400" ry="86" fill="rgba(0,0,0,.45)" transform="translate(0 18)"/>
      <ellipse cx="560" cy="1165" rx="400" ry="86" fill="url(#th-plateau)"/>
      <ellipse cx="560" cy="1158" rx="360" ry="70" fill="none" stroke="rgba(110,80,30,.55)" stroke-width="3"/>
      <ellipse cx="560" cy="1158" rx="300" ry="56" fill="none" stroke="rgba(255,240,200,.35)" stroke-width="2" stroke-dasharray="6 8"/>
    </g>
    <g id="th-verre2" transform="translate(760 1030)">
      <g clip-path="url(#th-clip2)"><rect x="-90" y="-80" width="180" height="210" fill="url(#th-the)"/><rect x="-90" y="-92" width="180" height="16" fill="#F5E2B8"/></g>
      <path d="M-80 -126 L80 -126 L64 126 L-64 126 Z" fill="url(#th-verre)" stroke="rgba(255,255,255,.7)" stroke-width="3"/>
      <path d="M-66 -104 L-54 104" stroke="rgba(255,255,255,.5)" stroke-width="6" stroke-linecap="round"/>
    </g>
    <g id="th-verre-g" transform="translate(470 1010)">
      <g clip-path="url(#th-clip1)"><rect id="th-niveau" x="-100" y="150" width="200" height="0" fill="url(#th-the)"/><rect id="th-mousse" x="-100" y="150" width="200" height="22" fill="#F7E4BB"/><g id="th-bulles"></g></g>
      <path d="M-95 -150 L95 -150 L76 150 L-76 150 Z" fill="url(#th-verre)" stroke="rgba(255,255,255,.78)" stroke-width="3.4"/>
      <path d="M-80 -128 L-66 128" stroke="rgba(255,255,255,.55)" stroke-width="7" stroke-linecap="round"/>
    </g>
    <path id="th-jet-ombre" fill="none" stroke="rgba(120,60,10,.6)" stroke-width="20" stroke-linecap="round" opacity="0"/><path id="th-jet" fill="none" stroke="#DE9534" stroke-width="16" stroke-linecap="round" opacity="0"/>
    <path id="th-jet-reflet" fill="none" stroke="rgba(255,240,205,.75)" stroke-width="3" stroke-linecap="round" opacity="0"/>
    <g id="th-gouttes"></g>
    <g id="th-vapeur" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="7" stroke-linecap="round"><path id="th-v1"/><path id="th-v2"/><path id="th-v3"/></g>
    <g id="th-pot">
      <ellipse cx="0" cy="138" rx="150" ry="22" fill="rgba(0,0,0,.25)"/>
      <path d="M-160 -10 C-160 -130 160 -130 160 -10 C160 95 100 140 0 140 C-100 140 -160 95 -160 -10 Z" fill="url(#th-metal)" stroke="#4b4b50" stroke-width="3"/>
      <path d="M-150 30 C-80 60 80 60 150 30" fill="none" stroke="rgba(80,80,86,.55)" stroke-width="3"/>
      <path d="M-155 0 C-80 28 80 28 155 0" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
      <g fill="none" stroke="rgba(70,70,76,.45)" stroke-width="2.4">${[-110, -66, -22, 22, 66, 110].map((x) => `<path d="M${x} 40 q12 18 0 36 q-12 18 0 36"/>`).join('')}</g>
      <path d="M-128 -92 C-90 -165 90 -165 128 -92 Z" fill="url(#th-metal2)" stroke="#4b4b50" stroke-width="3"/>
      <path d="M-26 -150 C-26 -200 26 -200 26 -150 Z" fill="url(#th-metal2)" stroke="#4b4b50" stroke-width="3"/>
      <circle cx="0" cy="-206" r="14" fill="url(#th-metal)" stroke="#4b4b50" stroke-width="3"/>
      <path d="M-150 10 C-240 0 -275 -85 -350 -160 L-330 -176 C-262 -110 -225 -66 -152 -44 Z" fill="url(#th-metal)" stroke="#4b4b50" stroke-width="3"/>
      <path d="M150 -70 C250 -82 252 92 140 82" fill="none" stroke="#2f2f33" stroke-width="24" stroke-linecap="round"/>
      <path d="M-118 -40 C-90 -86 -40 -98 -10 -100" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="8" stroke-linecap="round"/>
    </g>
    <g id="th-feuilles"></g>`;
  const VERTS = ['#3E7D2E', '#2F6B24', '#5C9A3A', '#4C8C30', '#6E8F2E', '#8A6A2E'];
  const FEUILLES = Array.from({ length: 18 }, (_, i) => ({ x: rnd() * W, y0: -120 - rnd() * 700, v: 240 + rnd() * 260, r: rnd() * 360, vr: (rnd() - .5) * 160, s: .7 + rnd() * .9 + (i < 3 ? .9 : 0), a: rnd() * 6.28, c: VERTS[i % VERTS.length], flou: i < 3, fond: i >= 3 && i < 8 }));
  $('th-feuilles').innerHTML = FEUILLES.map((f, i) => (f.fond ? '' : `<use href="#th-feuille" id="th-f${i}" fill="${f.c}" ${f.flou ? 'filter="url(#th-flou)" opacity=".9"' : ''}/>`)).join('');
  $('th-feuilles-fond').innerHTML = FEUILLES.map((f, i) => (f.fond ? `<use href="#th-feuille" id="th-f${i}" fill="${f.c}" opacity=".55" filter="url(#th-flou)"/>` : '')).join('');
  $('th-bulles').innerHTML = Array.from({ length: 16 }, (_, i) => `<circle id="th-b${i}" r="${(3 + rnd() * 6).toFixed(1)}" fill="rgba(255,248,230,.85)"/>`).join('');
  $('th-gouttes').innerHTML = Array.from({ length: 10 }, (_, i) => `<circle id="th-g${i}" r="${(3 + rnd() * 4).toFixed(1)}" fill="#E7A445"/>`).join('');
  const BULLES = Array.from({ length: 16 }, () => ({ x: -80 + rnd() * 160, d: rnd() })), GOUTTES = Array.from({ length: 10 }, () => ({ vx: (rnd() - .5) * 260, vy: -120 - rnd() * 220, d: rnd() }));
  function the(t, a, b) {
    const d = b - a, ke = E.outBack(p(t, a + .04 * d, a + .28 * d)), verse = E.inout3(p(t, a + .2 * d, a + .36 * d));
    const px = lerp(1320, 780, ke), py = lerp(-240, 470, ke), ang = lerp(0, -30, verse);
    $('th-pot').setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${ang.toFixed(2)}) scale(1.08)`);
    const ra = ang * RAD, bx = -350 * 1.08, by = -168 * 1.08, sx = px + bx * Math.cos(ra) - by * Math.sin(ra), sy = py + bx * Math.sin(ra) + by * Math.cos(ra);
    const flux = p(t, a + .3 * d, a + .34 * d) * (1 - p(t, b - .25, b - .05));
    const cible = [470, 1010 - 150 + 6], ctl = [sx - 70, sy + 50];
    const chemin = `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${ctl[0].toFixed(1)} ${ctl[1].toFixed(1)} ${cible[0]} ${cible[1]}`;
    $('th-jet').setAttribute('d', chemin); $('th-jet').setAttribute('opacity', flux.toFixed(2)); $('th-jet').setAttribute('stroke-width', (8 + 16 * flux).toFixed(1));
    $('th-jet-ombre').setAttribute('d', chemin); $('th-jet-ombre').setAttribute('opacity', (flux * .7).toFixed(2)); $('th-jet-ombre').setAttribute('stroke-width', (12 + 20 * flux).toFixed(1));
    $('th-jet-reflet').setAttribute('d', `M${(sx - 3).toFixed(1)} ${(sy + 4).toFixed(1)} Q${(ctl[0] - 4).toFixed(1)} ${ctl[1].toFixed(1)} ${cible[0] - 3} ${cible[1]}`); $('th-jet-reflet').setAttribute('opacity', (flux * .8).toFixed(2));
    const niveau = 205 * E.out3(p(t, a + .34 * d, b));
    $('th-niveau').setAttribute('y', (150 - niveau).toFixed(1)); $('th-niveau').setAttribute('height', (niveau + 4).toFixed(1));
    const ym = 150 - niveau - 14; $('th-mousse').setAttribute('y', ym.toFixed(1)); $('th-mousse').setAttribute('opacity', clamp(niveau / 50).toFixed(2));
    BULLES.forEach((q, i) => { const e = $(`th-b${i}`); e.setAttribute('cx', (q.x + Math.sin(t * 3 + q.d * 6) * 4).toFixed(1)); e.setAttribute('cy', (ym + 6 + q.d * 10).toFixed(1)); e.setAttribute('opacity', clamp(niveau / 60).toFixed(2)); });
    GOUTTES.forEach((g, i) => {
      const e = $(`th-g${i}`), c = ((t - a) * 1.6 + g.d) % 1, k = flux * (niveau > 10 ? 1 : 0);
      e.setAttribute('cx', (cible[0] + g.vx * c * .5).toFixed(1)); e.setAttribute('cy', (cible[1] + (g.vy * c + 600 * c * c) * .5).toFixed(1)); e.setAttribute('opacity', (k * (1 - c)).toFixed(2));
    });
    const kv = clamp(niveau / 140);
    ['th-v1', 'th-v2', 'th-v3'].forEach((id, i) => { const o = (t * .7 + i / 3) % 1, x = [450, 500, 760][i], base = i < 2 ? 860 : 900, y = base - o * 240; $(id).setAttribute('d', `M${x} ${y + 120} C${x - 34} ${y + 80} ${x + 34} ${y + 40} ${x} ${y}`); $(id).setAttribute('opacity', ((i < 2 ? kv : .8) * Math.sin(o * Math.PI)).toFixed(2)); });
    FEUILLES.forEach((f, i) => {
      const y = f.y0 + (t - a) * f.v * (f.fond ? .6 : 1), x = f.x + Math.sin((t - a) * 1.6 + f.a) * 60;
      $(`th-f${i}`).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(f.r + (t - a) * f.vr).toFixed(1)}) scale(${(f.s * (f.fond ? .7 : 1)).toFixed(2)})`);
    });
  }
  // T6 : produits locaux
  const LOCAUX = [['karite2', 'Beurre de karité'], ['bissap', 'Bissap'], ['baobab', 'Pain de singe'], ['gingembre', 'Gingembre'], ['sesame', 'Sésame'], ['nere', 'Soumbala (néré)']];
  const locaux = LOCAUX.map(([img, nom], i) => {
    const c = document.createElement('div'); c.className = 'loc';
    c.style.left = `${(i % 2) * 510}px`; c.style.top = `${Math.floor(i / 2) * 330}px`;
    c.innerHTML = `<div class="img" style="background-image:url(assets/terroir/${img}.jpg)"></div><div class="nom">${nom}</div>`;
    $('grille-loc').appendChild(c); return c;
  });

  // ---------------------------------------------------------------- paiement : jetons en 3D (Orange Money, Moov Money, Wave) et carte Visa
  const melange = (hex, f) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`; };
  const JETONS = [['om', 'Orange Money', 'assets/orange-money.svg', '#FFFFFF', '#FF7900'], ['moov', 'Moov Money', 'assets/moov-money.png', '#FFFFFF', '#1F6FC2'],
    ['wave', 'Wave', 'assets/wave.png', '#1DC3FF', '#0E8FD0'], ['visa', 'Visa', 'assets/visa.svg', '', '#2A3486']];
  const R_ORB = 420, INCL = 16, Z_TEL = -120;                // orbite centrée sur le téléphone, inclinée vers l'avant
  ['', 'fin'].forEach((c, i) => {
    const r = R_ORB + (i ? 38 : 0), an = document.createElement('div'); an.className = 'anneau ' + c;
    an.style.cssText = `width:${2 * r}px;height:${2 * r}px;left:${-r}px;top:${-r}px`;
    $('orbite').appendChild(an);
  });
  const anneaux3d = Array.from(document.querySelectorAll('#orbite .anneau'));
  const jetons = JETONS.map(([id, nom, img, fond, bord]) => {
    const j = document.createElement('div'); j.className = 'jeton' + (id === 'visa' ? ' visa' : '');
    const N = id === 'visa' ? 4 : 14, pas = id === 'visa' ? 1.1 : 1.7;
    let h = '';
    for (let k = 1; k <= N; k++) h += `<div class="couche" style="transform:translateZ(${(-k * pas).toFixed(1)}px);background:linear-gradient(90deg, ${melange(bord, .55)}, ${melange(bord, 1)} 45%, ${melange(bord, .7)})"></div>`;
    const dos = `transform:translateZ(${(-(N + 1) * pas).toFixed(1)}px) rotateY(180deg)`;
    const sansContact = '<svg class="sans-contact" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2" stroke-linecap="round"><path d="M8 6.5a8 8 0 0 1 0 11M12 4a12 12 0 0 1 0 16M4.5 9a4 4 0 0 1 0 6"/></svg>';
    if (id === 'visa') h += `<div class="j-face"><div class="puce"></div>${sansContact}<div class="numero">•••• •••• •••• ••••</div><img class="logo-visa" src="${img}" alt=""><div class="reflet"></div></div><div class="j-dos" style="${dos}"></div>`;
    else h += `<div class="j-face" style="background:${fond}"><img src="${img}" alt="" style="${id === 'wave' ? 'border-radius:28px' : ''}"><div class="lumiere"></div><div class="reflet"></div></div><div class="j-dos" style="background:${fond};${dos}"><img src="${img}" alt=""></div>`;
    h += `<div class="nom">${nom}</div>`;
    j.innerHTML = h; $('orbite').appendChild(j);
    const o = document.createElement('div'); o.className = 'ombre-sol'; $('ombres7').appendChild(o);
    return { j, o, reflet: j.querySelector('.reflet') };
  });
  function orbite(t, a, b) {
    const ka = E.out3(p(t, a + .35, a + 1.1)), si = Math.sin(INCL * RAD), co = Math.cos(INCL * RAD);
    anneaux3d.forEach((an, i) => {
      an.style.transform = `translateZ(${Z_TEL}px) rotateX(${90 - INCL}deg) rotateZ(${((t - a) * 25 * (i ? -1 : 1)).toFixed(1)}deg) scale(${lerp(.35, 1, ka).toFixed(3)})`;
      an.style.opacity = (ka * (i ? .6 : 1)).toFixed(3);
    });
    jetons.forEach(({ j, o, reflet }, i) => {
      const d0 = a + .5 + i * .12, k = E.outBack(p(t, d0, d0 + .8)), R = R_ORB * clamp(k, 0, 1.12);
      const th = (t - a) * (2 * Math.PI / 6.5) + i * Math.PI / 2 + .35;
      const X = Math.cos(th) * R, Y = Math.sin(th) * R * si + Math.sin(t * 2.1 + i) * 6, Z = Z_TEL + Math.sin(th) * R * co;
      const sway = 16 * Math.sin(t * 1.3 + i * 1.7) - Math.cos(th) * 14, flip = lerp(360, 0, E.out3(p(t, d0, d0 + 1.0)));
      j.style.transform = `translate3d(${X.toFixed(1)}px,${Y.toFixed(1)}px,${Z.toFixed(1)}px) rotateY(${(sway + flip).toFixed(1)}deg) rotateX(-5deg) scale(${lerp(.2, 1, clamp(k)).toFixed(3)})`;
      j.style.opacity = clamp(k * 3).toFixed(3);
      reflet.style.transform = `translateX(${(Math.sin((sway + flip) * RAD) * 40).toFixed(1)}%)`;
      const f = 1800 / (1800 - Z), sx = 540 + X * f, sy = 1650 + (Z - Z_TEL) * .1;
      o.style.left = `${sx.toFixed(1)}px`; o.style.top = `${sy.toFixed(1)}px`; o.style.transform = `scale(${(f * (i === 3 ? 1.35 : 1)).toFixed(3)})`; o.style.opacity = (clamp(k) * .85).toFixed(3);
    });
  }

  // ---------------------------------------------------------------- sons synchronisés
  const cues = [{ t: 0, type: 'montee', duree: M[0] }, { t: M[0], type: 'impact' }, { t: INTRO.accroupi[0], type: 'souffle', duree: .45 },
    { t: INTRO.morph[0] + .1, type: 'eclat' }, { t: M[1], type: 'tampon' }, { t: INTRO.lettres, type: 'cascade', duree: .6 }, { t: INTRO.bandes, type: 'souffle' },
    { t: INTRO.eclat, type: 'eclat' }, { t: INTRO.tampon, type: 'tampon' }];
  { const n = Math.max(2, Math.round((INTRO.xDepart - 1121) / (2 * 85 * Math.sin(Math.PI / 6) * .626))); for (let k = 1; k <= n; k++) cues.push({ t: INTRO.marche[0] + k / n * (INTRO.marche[1] - INTRO.marche[0]), type: 'pas' }); }
  PLAN.forEach(([id], i) => { if (i > 0) cues.push({ t: SC[id][0] - .16, type: ['s2', 's4a', 's5a', 'tr1', 's6a', 's7', 's9'].includes(id) ? 'impact-doux' : 'souffle' }); });
  const C = (t, type, extra = {}) => cues.push({ t, type, ...extra });

  window.renderAt = function (t) {
    // ---------- S1 entrée du logo ----------
    if (scene('s1', t)) intro(t);

    // ---------- S2 diaspora ----------
    {
      const [a, b] = SC.s2 || [0, 0], vis = scene('s2', t);
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
      const [a] = SC.s3 || [0, 0];
      if (scene('s3', t)) {
        apparitionMots(T3, t, a + .08, .06, .35);
        ['sv1', 'sv2', 'sv3'].forEach((id, i) => { const d = bt(a, 1 + 2 * i), k = E.out3(p(t, d, d + .45)); set(id, { rx: lerp(-85, 0, E.outBack(p(t, d, d + .5))), y: lerp(-40, 0, k), o: k }); });
        set('bande3', { x: -((t - a) * 80) % 100, o: 1 });
      }
    }

    // ---------- S4a courses ----------
    {
      const [a, b] = SC.s4a || [0, 0];
      if (scene('s4a', t)) {
        set('ph4a', { s: lerp(1.28, 1.06, E.out3(p(t, a, b))), x: lerp(30, -30, p(t, a, b)) });
        const ks = pop(t, a + .15, .3); set('sur4a', { s: ks, o: clamp(ks) });
        apparitionMots(T4a, t, a + .25, .05, .35);
        [['d4a1', bq(a, b, .42)], ['d4a2', bq(a, b, .6)]].forEach(([id, d]) => { const k = E.out3(p(t, d, d + .35)); set(id, { x: lerp(-40, 0, k), o: k }); });
      }
    }

    // ---------- S4b pays de commande ----------
    {
      const [a, b] = SC.s4b || [0, 0];
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
      const [a, b] = SC.s4c || [0, 0];
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
      const [a, b] = SC.s4d || [0, 0];
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
      const [a, b] = SC.s5a || [0, 0];
      if (scene('s5a', t)) {
        set('fond5a', { s: 1.1 + .1 * p(t, a, b) });
        const ks = pop(t, a + .15, .3); set('sur5a', { s: ks, o: clamp(ks) });
        apparitionMots(T5a, t, a + .25, .06, .35);
        const tour = lerp(20, -220, E.inout3(p(t, a + .1, b - .15)));
        cartes.forEach((c, i) => { const ang = i * 72 + tour, face = Math.cos(ang * RAD); set(c, { o: 1 }); c.style.transform = `rotateY(${ang}deg) translateZ(420px)`; c.querySelector('.ombre').style.opacity = (.75 - .75 * clamp(face)).toFixed(3); });
        set('carrousel', { s: lerp(.6, 1, E.out3(p(t, a, a + .6))), rx: -6, o: 1 });
        const kp = E.out3(p(t, bq(a, b, .45), bq(a, b, .45) + .4)); set('bas5a', { y: lerp(60, 0, kp), o: kp });
      }
    }

    // ---------- S5b catégories ----------
    {
      const [a] = SC.s5b || [0, 0];
      if (scene('s5b', t)) {
        const ks = pop(t, a + .1, .3); set('sur5b', { s: ks, o: clamp(ks) });
        apparitionMots(T5b, t, a + .2, .06, .35);
        cats.forEach((c, i) => { const d = bt(a, 1 + i * .5 | 0) + (i % 2) * .12, k = E.out3(p(t, d, d + .45)); set(c, { ry: lerp(i % 2 ? 90 : -90, 0, E.outBack(p(t, d, d + .5))), o: k }); });
        const kb = E.out3(p(t, bt(a, 4), bt(a, 4) + .4)); set('bas5b', { y: lerp(40, 0, kb), o: kb });
      }
    }


    // ---------- chapitre terroir ----------
    if (scene('tr1', t)) {
      const [a, b] = SC.tr1 || [0, 0], d = b - a; tissage(t, a, b); texteTerroir(1, t, a, b);
      const k = E.out3(p(t, a + .42 * d, a + .42 * d + .5));
      set('fdf-photo', { y: lerp(420, 0, k), rz: lerp(-9, -2.5, k), s: lerp(.85, 1, k) * (1 + .04 * p(t, a, b)), o: clamp(k * 1.5) });
    }
    if (scene('tr2', t)) {
      const [a, b] = SC.tr2 || [0, 0], d = b - a; teinture(t, a, b); texteTerroir(2, t, a, b);
      [['k1', -9, .12], ['k2', 1, .24], ['k3', 9, .36]].forEach(([id, r, f], i) => {
        const k = E.out3(p(t, a + f * d, a + f * d + .45)), kb = E.outBack(p(t, a + f * d, a + f * d + .5));
        set(id, { y: lerp(700, 0, k) + Math.sin(t * 1.6 + i) * 6, rz: lerp(r * 3, r, kb), ry: lerp(i === 1 ? 0 : (i ? -40 : 40), 0, k), o: clamp(k * 1.6) });
      });
    }
    if (scene('tr3', t)) {
      const [a, b] = SC.tr3 || [0, 0], d = b - a; miel(t, a, b); texteTerroir(3, t, a, b);
      const k = E.outBack(p(t, a + .18 * d, a + .18 * d + .55));
      set('miel-photo', { s: lerp(.4, 1, k) * (1 + .05 * p(t, a, b)), rz: lerp(-30, 0, E.out3(p(t, a + .18 * d, a + .18 * d + .55))), o: clamp(k * 2) });
    }
    if (scene('tr4', t)) {
      const [a, b] = SC.tr4 || [0, 0], d = b - a; cereales(t, a); texteTerroir(4, t, a, b);
      set('cer-fond', { s: lerp(1.15, 1.03, p(t, a, b)) });
      ['r1', 'r2', 'r3', 'r4'].forEach((id, i) => { const k = E.outBack(p(t, a + (.08 + i * .1) * d, a + (.08 + i * .1) * d + .45)); set(id, { s: k, o: clamp(k * 2), rz: lerp(-25, 0, clamp(k)) }); });
    }
    if (scene('tr5', t)) { const [a, b] = SC.tr5 || [0, 0]; the(t, a, b); texteTerroir(5, t, a, b); set('the-fond', { s: lerp(1.12, 1.02, p(t, a, b)) }); }
    if (scene('tr6', t)) {
      const [a, b] = SC.tr6 || [0, 0], d = b - a; texteTerroir(6, t, a, b);
      locaux.forEach((c, i) => { const dd = a + (.05 + i * .065) * d, k = E.out3(p(t, dd, dd + .45)); set(c, { ry: lerp(i % 2 ? 80 : -80, 0, E.outBack(p(t, dd, dd + .5))), o: k }); c.firstElementChild.style.transform = `scale(${(1.12 - .1 * p(t, a, b)).toFixed(3)})`; });
    }

    // ---------- S6a carte : du Burkina vers le monde ----------
    {
      const [a, b] = SC.s6a || [0, 0], vis = scene('s6a', t);
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
      const [a] = SC.s6b || [0, 0];
      if (scene('s6b', t)) {
        apparitionMots(T6b, t, a + .08, .05, .34);
        const kd = p(t, a + .15, a + .6), rebond = kd < 1 ? lerp(-500, 0, E.in3(kd)) : -Math.abs(Math.sin((t - a - .6) * 9)) * 30 * Math.exp(-(t - a - .6) * 5);
        set('boite', { y: rebond, rx: -18, ry: (t - a) * 55 + 30 });
        set('ombre-boite', { s: lerp(.4, 1, clamp(kd)), o: clamp(kd) });
        // la balance de l'agence : elle apparaît, le plateau s'enfonce à l'arrivée du colis et l'écran compte le poids
        const kb = E.out3(p(t, a + .05, a + .4)), choc = t > a + .6 ? Math.sin((t - a - .6) * 22) * 7 * Math.exp(-(t - a - .6) * 7) : 0;
        set('balance', { y: lerp(260, 0, kb), o: kb });
        set('plateau', { y: (t > a + .6 ? 4 : 0) + choc });
        const pese = E.out3(p(t, a + .65, a + 1.35));
        $('kg').textContent = (2.4 * pese).toFixed(2).replace('.', ',');
        $('voyant').classList.toggle('on', pese >= 1);
        // la fiche d'envoi se colle sur le colis à l'étape 2
        { const d = bt(a, 2), kf = p(t, d, d + .3); ['fiche1', 'fiche2'].forEach((id) => set(id, { s: lerp(1.9, 1, E.out3(kf)), rz: lerp(-14, -3, E.out3(kf)), o: clamp(kf * 2.5) })); }
        ['pas1', 'pas2', 'pas3'].forEach((id, i) => { const d = bt(a, 1 + i), k = E.out3(p(t, d, d + .4)); set(id, { x: lerp(i % 2 ? -1000 : 1000, 0, k), o: k }); });
        const kc = pop(t, bt(a, 5), .4); set('suivi6b', { s: kc, o: clamp(kc) });
      }
    }

    // ---------- S7 paiement en 3D + application ----------
    {
      if (scene('s7', t)) {
        const [a, b] = SC.s7 || [0, 0], in7 = p(t, a, a + .9);
        set('cone', { o: .4 + .6 * E.out3(p(t, a, a + .9)) });
        const orb = lerp(-8, 8, E.inout3(p(t, a + .9, b - .3)));
        set('tel', { y: lerp(1500, 0, E.out3(in7)), z: lerp(-260, Z_TEL, E.out3(in7)), ry: lerp(40, orb * .6, E.out3(in7)), rx: lerp(16, 2, E.out3(in7)), rz: lerp(-6, 0, E.out3(in7)), s: .82, o: 1 });
        const p2 = bq(a, b, .38), p3 = bq(a, b, .72), k2 = E.inout3(p(t, p2, p2 + .35)), k3 = E.inout3(p(t, p3, p3 + .35));
        $('ec1').style.transform = `translateX(${(-k2 * 172).toFixed(1)}px)`;
        $('ec2').style.transform = `translateX(${((1 - k2) * 580 - k3 * 172).toFixed(1)}px)`;
        $('ec3').style.transform = `translateX(${((1 - k3) * 580).toFixed(1)}px)`;
        $('ec1').style.filter = `brightness(${(1 - .35 * k2).toFixed(3)})`; $('ec2').style.filter = `brightness(${(1 - .35 * k3).toFixed(3)})`;
        set('glint7', { x: lerp(0, 1900, E.inout3(p(t, a + .95, a + 1.6))) });
        apparitionMots(T7, t, a + .7, .06, .34);
        orbite(t, a, b);
        const kr = E.out3(p(t, bq(a, b, .5), bq(a, b, .5) + .35)) * (1 - p(t, bq(a, b, .76) - .25, bq(a, b, .76))); set('recu7', { y: lerp(40, 0, kr), o: kr });
        const pd = bq(a, b, .76), kg = E.outBack(p(t, pd, pd + .4)); set('dispo7', { s: lerp(.8, 1, kg), o: clamp(E.out3(p(t, pd, pd + .3))) });
      }
    }

    // ---------- S8 vendeurs ----------
    {
      const [a, b] = SC.s8 || [0, 0];
      if (scene('s8', t)) {
        set('photo8', { s: lerp(1.15, 1.03, E.out3(p(t, a, b))), y: lerp(20, -20, p(t, a, b)) });
        const ks = pop(t, a + .15, .3); set('sur8', { s: ks, o: clamp(ks) });
        apparitionMots(T8, t, a + .25, .06, .34);
        [['f1', bq(a, b, .24), -1, 'c1', 15], ['f2', bq(a, b, .33), 1, 'c2', 8]].forEach(([id, d, c, cid, val]) => {
          const k = E.out3(p(t, d, d + .45)); set(id, { ry: lerp(c * 70, 0, E.outBack(p(t, d, d + .5))), y: lerp(80, 0, k), o: k });
          $(cid).textContent = `${Math.round(val * E.out3(p(t, d + .2, d + .8)))} %`;
        });
        const kb = E.out3(p(t, bq(a, b, .58), bq(a, b, .58) + .4)); set('bas8', { y: lerp(30, 0, kb), o: kb });
        const kc = pop(t, bq(a, b, .68), .4), pul = t > bq(a, b, .78) ? 1 + .035 * Math.sin((t - bq(a, b, .78)) * 8) : 1; set('cta8', { s: kc * pul, o: clamp(kc) });
      }
    }

    // ---------- S9 fin ----------
    {
      const [a] = SC.s9 || [0, 0];
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
    grain(t);
    poussiere(t, t < 3 ? E.out3(p(t, 0, .8)) : clair ? .25 : .35);
    $('poussiere').style.mixBlendMode = clair ? 'multiply' : 'screen';
    set('flare', { x: lerp(-300, 2400, E.inout3(p(t, .15, .95))), o: t < 1 ? .9 : 0, rz: 18 });
    const flashs = [[M[0], .18], ...['s2', 's4a', 's5a', 'tr1', 's6a', 's7', 's9'].filter((id) => SC[id]).map((id) => [SC[id][0], .2])];
    let fl = 0; for (const [ft, d] of flashs) { if (t >= ft - .06 && t <= ft + d) fl = Math.max(fl, t < ft ? p(t, ft - .06, ft) : 1 - p(t, ft, ft + d)); }
    $('flash').style.opacity = (fl * .8).toFixed(3);
    $('fondu').style.opacity = E.in3(p(t, DUREE - .6, DUREE)).toFixed(3);
  };

  // effets ponctuels (en plus des transitions)
  {
    const S = (id) => SC[id] || null;
    if (S('s2')) { const [a] = SC.s2; C(a + .2, 'tampon'); [1, 2, 3, 4].forEach((n) => C(bt(a, n), 'pop')); }
    if (S('s3')) { const [a] = SC.s3; [1, 3, 5].forEach((n) => C(bt(a, n), 'pop')); }
    if (S('s4a')) { const [a, b] = SC.s4a; C(bq(a, b, .42), 'pop'); C(bq(a, b, .6), 'pop'); }
    if (S('s4b')) { const [a] = SC.s4b; C(a + .6, 'cascade', { duree: 1.0 }); C(a + 1.34, 'eclat'); }
    if (S('s4c')) { const [a] = SC.s4c; [2, 3, 4, 5, 6].forEach((n) => C(bt(a, n), 'pop')); }
    if (S('s4d')) { const [a, b] = SC.s4d; C(b - .55, 'eclat'); C(bt(a, 4), 'glisse'); }
    if (S('s5a')) { const [a, b] = SC.s5a; C(bq(a, b, .45), 'glisse'); }
    if (S('tr1')) { const [a, b] = SC.tr1, d = b - a; C(a + .05, 'cascade', { duree: .6 * d }); C(a + .42 * d, 'glisse'); }
    if (S('tr2')) { const [a, b] = SC.tr2, d = b - a; [.12, .24, .36].forEach((f) => C(a + f * d, 'pop')); }
    if (S('tr3')) { const [a, b] = SC.tr3, d = b - a; C(a + .18 * d, 'eclat'); C(a + .1 * d, 'souffle', { duree: .5 }); }
    if (S('tr4')) { const [a, b] = SC.tr4, d = b - a; [0, 1, 2, 3].forEach((i) => C(a + (.08 + i * .1) * d, 'pop')); }
    if (S('tr5')) { const [a, b] = SC.tr5, d = b - a; C(a + .08 * d, 'glisse'); C(a + .33 * d, 'souffle', { duree: Math.min(1.4, .6 * d) }); }
    if (S('tr6')) { const [a, b] = SC.tr6, d = b - a; [0, 1, 2, 3, 4, 5].forEach((i) => C(a + (.05 + i * .065) * d, 'pop')); }
    if (S('s6a')) { const [a] = SC.s6a; C(a + .1, 'tampon'); C(a + .85, 'souffle', { duree: .9 }); [1.97, 2.09, 2.21].forEach((d) => C(a + d, 'pop')); }
    if (S('s6b')) { const [a] = SC.s6b; C(a + .6, 'tampon'); C(a + 1.35, 'pop'); [1, 2, 3].forEach((n) => C(bt(a, n), 'glisse')); C(bt(a, 5), 'pop'); }
    if (S('s7')) { const [a, b] = SC.s7; C(a + .5, 'impact-doux'); [0, 1, 2, 3].forEach((i) => C(a + .55 + i * .1, 'pop')); C(bq(a, b, .38), 'glisse'); C(bq(a, b, .72), 'glisse'); C(bq(a, b, .76) + .05, 'eclat'); }
    if (S('s8')) { const [a, b] = SC.s8; C(bq(a, b, .24), 'pop'); C(bq(a, b, .33), 'pop'); C(bq(a, b, .68), 'eclat'); }
    const [a9] = SC.s9; C(a9 + .75, 'glisse'); C(a9 + 1.1, 'pop'); C(DUREE - .6, 'fin');
  }
  window.__cues = cues.sort((x, y) => x.t - y.t).map((c) => ({ ...c, t: Math.round(c.t * 1000) / 1000 }));
  window.__scenes = SC;

  const images = ['courses', 'tissus', 'karite', 'bijoux', 'statuette', 'panier', 'marche', 'marche2', 'artisan'].map((n) => `assets/photos/${n}.jpg`)
    .concat(['fdf', 'koko1', 'koko2', 'koko3', 'miel2', 'mil', 'mais', 'fonio', 'sorgho', 'couscous', 'karite2', 'bissap', 'baobab', 'gingembre', 'sesame', 'nere', 'the2'].map((n) => `assets/terroir/${n}.jpg`));
  Promise.all([document.fonts.ready, ...Array.from(document.images).map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; })))])
    .then(() => Promise.all(images.map((u) => new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = u; }))))
    .then(() => Promise.all(['500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 40px P`))))
    .then(() => { window.renderAt(0); window.__ready = true; });
})();
