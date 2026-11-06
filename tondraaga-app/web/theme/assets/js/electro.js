/* Tondraaga — rayon « Électroménager & électronique » (#/electromenager).
   Produits WooCommerce de la catégorie « electromenager » (et de ses sous-catégories), vendus par les vendeurs de la
   place de marché : ils ne portent pas la mention « Made in Burkina » et ont leur propre page, sans plafond de prix.
   Chargé avant app.js : les vues sont dessinées à la demande avec les outils de l'application (window.TDGApp). */
(function () {
  'use strict';
  const D = window.TDG, IMG = window.TDG_IMG || (window.TDG_IMG = {});
  const ID = 'electromenager', PAS = 24;
  const script = document.currentScript;
  const BASE = script && script.src ? script.src.replace(/\/js\/electro\.js.*$/, '/img/electro/') : '';
  const VER = ((script && /[?&]ver=([^&]+)/.exec(script.src)) || [])[1] || '';
  // photos libres de droits (Wikimedia Commons), recadrées et enregistrées dans le thème
  const img = (n) => BASE + n + '.jpg' + (VER ? '?ver=' + VER : '');

  // univers du rayon : identifiants = sous-catégories WooCommerce (Produits › Catégories)
  D.electro = {
    id: ID, nom: 'Électroménager & électronique', court: 'Électroménager',
    sous: [
      { id: 'electro-mobilite', nom: 'Vélos & motos électriques', court: 'Vélos & motos électriques' },
      { id: 'electro-cuisine', nom: 'Mixeurs & blenders', court: 'Mixeurs & blenders' },
      { id: 'electro-moulins', nom: 'Broyeurs & moulins', court: 'Broyeurs & moulins' },
      { id: 'electro-snack', nom: 'Popcorn & machines à snacks', court: 'Popcorn & snacks' },
      { id: 'electro-froid', nom: 'Froid & ventilation', court: 'Froid & ventilation' },
      { id: 'electro-maison', nom: 'Petit électroménager', court: 'Petit électroménager' },
      { id: 'electro-image-son', nom: 'TV, son & téléphonie', court: 'TV, son & téléphones' },
      { id: 'electro-energie', nom: 'Énergie & solaire', court: 'Énergie & solaire' }
    ],
    // auteurs et licences des photos (obligatoire pour les licences CC BY et CC BY-SA)
    credits: [
      ['Bannière', 'أسكيمو (Askemo)', 'CC BY-SA 4.0', 'Askemo_home_appliances.jpg'],
      ['Vélos & motos', 'Cosmic Console', 'CC0', '2022_EMMO_Hornet_X_electric_moped_2.jpg'],
      ['Mixeurs', 'Shixart1985', 'CC BY 2.0', 'Fresh_fruits_and_a_blender_are_arranged_on_a_kitchen_counter_for_smoothie_preparation.jpg'],
      ['Moulins', 'Emmanuel Ssekaggo', 'CC BY-SA 4.0', 'A_man_operating_the_maize_mill_to_produce_maize_flour.jpg'],
      ['Popcorn', 'Edwardx', 'CC BY-SA 4.0', 'Cinema_Museum,_London_object_58.JPG'],
      ['Froid', 'Infrogmation of New Orleans', 'CC BY-SA 4.0', 'US_Domestic_Refrigerator_-_Frigidaire.jpg'],
      ['Petit électroménager', 'Smoth 007', 'CC BY-SA 2.0', 'Breville.jpg'],
      ['TV & téléphonie', 'Dennis Cortés', 'CC0', 'Black_smartphone_in_hand_(Unsplash).jpg'],
      ['Énergie', 'Deo photographer', 'CC BY-SA 4.0', 'Cleaning_solar_panel.jpg']
    ]
  };
  IMG.electro = { heros: img('heros') };
  D.electro.sous.forEach((s) => { IMG.electro[s.id] = img(s.id); });

  const A = () => window.TDGApp;
  const sansAccents = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const remise = (p) => (p.ancien ? Math.round((1 - p.prix / p.ancien) * 100) : 0);
  const pluriel = (n, mot) => n + ' ' + mot + (n > 1 ? 's' : '');
  function wa(texte) {
    const e = D.entreprise || {};
    return `https://wa.me/${e.indicatif || ''}${e.whatsapp || ''}?text=${encodeURIComponent(texte)}`;
  }

  // univers : ceux du site, renommés ou complétés par l'administration (sous-catégories qui ont des produits)
  function univers() {
    const serveur = (D.sousCategories && D.sousCategories[ID]) || [];
    const l = D.electro.sous.map((s) => {
      const x = serveur.find((y) => y.id === s.id);
      return x ? Object.assign({}, s, { nom: x.nom, court: x.nom }) : s;
    });
    serveur.forEach((x) => { if (!l.some((s) => s.id === x.id)) l.push({ id: x.id, nom: x.nom, court: x.nom }); });
    return l;
  }
  const nomUnivers = (id) => { const s = univers().find((x) => x.id === id); return s ? s.nom : ''; };
  const produits = () => (D.catalogueReel ? D.produits.filter((p) => p.cat === ID) : []);
  const imageUnivers = (s) => IMG.electro[s.id] || IMG.electro.heros;

  /* ---------- Filtres de la page ---------- */
  const TRIS = [['pop', 'Les plus vendus'], ['nouveau', 'Nouveautés'], ['asc', 'Prix croissant'], ['desc', 'Prix décroissant'], ['promo', 'Promotions']];
  const PRIX = [['', 'Tous les prix'], ['0-25000', 'Moins de 25 000 F'], ['25000-100000', '25 000 à 100 000 F'], ['100000-300000', '100 000 à 300 000 F'], ['300000-', 'Plus de 300 000 F']];
  const S = { sous: '', tri: 'pop', prix: '', q: '', n: PAS };

  function liste() {
    const q = sansAccents(S.q).trim();
    const [min, max] = S.prix ? S.prix.split('-').map((x, i) => (x === '' ? (i ? Infinity : 0) : +x)) : [0, Infinity];
    const l = produits().filter((p) => (!S.sous || p.sous === S.sous) && p.prix >= min && p.prix <= max
      && (!q || sansAccents([p.nom, p.sousNom, p.motsCles, p.description].join(' ')).includes(q)));
    const tris = {
      pop: (a, b) => (b.pop || 0) - (a.pop || 0) || (b.vedette ? 1 : 0) - (a.vedette ? 1 : 0) || (b.wcid || 0) - (a.wcid || 0),
      nouveau: (a, b) => (b.nouveau ? 1 : 0) - (a.nouveau ? 1 : 0) || (b.wcid || 0) - (a.wcid || 0),
      asc: (a, b) => a.prix - b.prix, desc: (a, b) => b.prix - a.prix,
      promo: (a, b) => remise(b) - remise(a) || (b.pop || 0) - (a.pop || 0)
    };
    return l.sort(tris[S.tri] || tris.pop);
  }

  function tuile(s, n, lien) {
    const T = A();
    return `<a href="#/electromenager${s.id ? '?sous=' + s.id : ''}" class="el-tuile ${!lien && S.sous === s.id ? 'actif' : ''}" ${lien ? '' : `data-electro-sous="${s.id}"`}>
      <span class="el-tuile-img">${s.id ? `<img src="${imageUnivers(s)}" alt="" width="88" height="88" loading="lazy" decoding="async">` : T.I.grille}</span>
      <span class="el-tuile-nom">${T.esc(s.court || s.nom)}</span><small>${n ? pluriel(n, 'article') : 'Bientôt'}</small></a>`;
  }

  function videRayon() {
    const T = A();
    return `<div class="el-vide"><img src="${IMG.electro.heros}" alt="Cuisine équipée : réfrigérateur, four, micro-ondes, mixeurs" width="480" height="320" loading="lazy">
      <div><h3>Le rayon ouvre : les premiers appareils arrivent</h3>
        <p>Nos vendeurs ajoutent leurs articles. Vous cherchez un appareil précis (vélo électrique, moulin, mixeur, machine à popcorn…) ? Écrivez-nous : nous vous disons s’il est disponible et à quel prix.</p>
        <div class="el-boutons"><a class="btn btn-ocre" href="${wa('Bonjour Tondraaga, je cherche cet appareil : ')}" target="_blank" rel="noopener">${T.I.wa} Demander un appareil</a>
        <a class="btn btn-contour" href="${(T.WP && T.WP.inscriptionVendeur) || '#/vendeurs'}">Vendre mes appareils</a></div></div></div>`;
  }

  function resultats() {
    const T = A(), tout = produits();
    if (!tout.length) return videRayon();
    const l = liste(), vus = l.slice(0, S.n);
    return `<div class="el-barre"><p class="el-nb"><b>${pluriel(l.length, 'article')}</b>${S.sous ? ' · ' + T.esc(nomUnivers(S.sous)) : ''}${S.q ? ` pour « ${T.esc(S.q)} »` : ''}</p>
        <label class="el-tri">Trier par <select class="champ-select" data-electro-tri>${TRIS.map(([k, t]) => `<option value="${k}" ${S.tri === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      ${l.length ? `<div class="grille-produits el-grille">${vus.map(T.carteProduit).join('')}</div>`
        : `<div class="vide">Aucun article ne correspond à votre recherche.<br><button type="button" class="btn-lien" data-electro-reset>Voir tout le rayon</button></div>`}
      ${l.length > S.n ? `<div class="el-plus"><button type="button" class="btn btn-contour" data-electro-plus>Afficher plus d’articles <small>(${l.length - S.n} de plus)</small></button></div>` : ''}`;
  }

  /* ---------- Page du rayon ---------- */
  function vue(seg, qs) {
    const T = A();
    S.sous = qs.get('sous') || ''; S.tri = qs.get('tri') || 'pop'; S.prix = qs.get('prix') || ''; S.q = qs.get('q') || ''; S.n = PAS;
    const tout = produits(), u = univers();
    const nb = (id) => (id ? tout.filter((p) => p.sous === id).length : tout.length);
    const e = D.entreprise || {};
    return `
    <section class="cadre el-haut">
      <div class="fil el-fil"><a href="#/">Accueil</a> › <span>Électroménager & électronique</span></div>
      <div class="el-heros" style="--fond:url('${IMG.electro.heros}')">
        <div class="el-heros-texte">
          <p class="el-surtitre">${T.I.eclair}Nouveau rayon</p>
          <h1>Électroménager <span>& électronique</span></h1>
          <p>Vélos et motos électriques, mixeurs, broyeurs et moulins, machines à popcorn, réfrigérateurs, ventilateurs, télévisions, solaire… L’équipement de la maison et du commerce, livré à Ouagadougou.</p>
          <div class="el-boutons"><button type="button" class="btn btn-ocre" data-electro-voir>Voir les articles ${T.I.fleche}</button>
            <a class="btn btn-transparent" href="${wa('Bonjour Tondraaga, je cherche cet appareil : ')}" target="_blank" rel="noopener">${T.I.wa} Demander un appareil</a></div>
        </div>
      </div>
      <ul class="el-atouts">
        <li>${T.I.moto}<span><b>Livraison à domicile</b>à Ouagadougou</span></li>
        <li>${T.I.bouclier}<span><b>Vendeurs vérifiés</b>par Tondraaga</span></li>
        <li>${T.I.etiquette}<span><b>Orange Money ou Wave</b>reçu par e-mail</span></li>
        <li>${T.I.wa}<span><b>Conseil avant l’achat</b>${e.telAffiche ? T.esc(e.telAffiche) : 'sur WhatsApp'}</span></li>
      </ul>
    </section>
    <section class="cadre el-section">
      <div class="v6-entete"><div><p class="v6-surtitre">Nos univers</p><h2>Que cherchez-vous&nbsp;?</h2></div></div>
      <div class="el-tuiles">${[{ id: '', court: 'Tout le rayon' }].concat(u).map((s) => tuile(s, nb(s.id))).join('')}</div>
    </section>
    <section class="cadre el-section" id="el-catalogue">
      <div class="el-filtres">
        <label class="el-recherche">${T.I.recherche}<input type="search" placeholder="Rechercher : mixeur, moulin, vélo électrique…" value="${T.esc(S.q)}" data-electro-q aria-label="Rechercher dans le rayon électroménager"></label>
        <div class="el-prix" role="group" aria-label="Prix">${PRIX.map(([v, t]) => `<button type="button" class="el-chip ${S.prix === v ? 'actif' : ''}" data-electro-prix="${v}" aria-pressed="${S.prix === v}">${t}</button>`).join('')}</div>
      </div>
      <div id="el-resultats">${resultats()}</div>
    </section>
    <section class="cadre el-section"><div class="el-vendre">
      <div><p class="el-surtitre">Vendeurs</p><h2>Vous vendez de l’électroménager ou de l’électronique&nbsp;?</h2>
        <p>Ouvrez votre boutique sur Tondraaga : vos appareils sont vus par les clients de Ouagadougou et de la diaspora, qui paient par Orange Money ou Wave.</p></div>
      <div class="el-boutons"><a class="btn btn-ocre" href="${(T.WP && T.WP.inscriptionVendeur) || '#/vendeurs'}">Devenir vendeur</a>
        <a class="btn btn-transparent" href="${wa('Bonjour Tondraaga, je voudrais vendre mes appareils électroménagers sur Tondraaga.')}" target="_blank" rel="noopener">${T.I.wa} Nous écrire</a></div>
    </div>
    <p class="el-credits">Photos d’illustration recadrées, Wikimedia Commons : ${D.electro.credits.map(([q, a, l, f]) => `${T.esc(q)} — <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}" target="_blank" rel="noopener">${T.esc(a)}</a> (${l})`).join(' · ')}.</p></section>`;
  }

  /* ---------- Section de la page d'accueil ---------- */
  function accueil() {
    const T = A(); if (!T) return '';
    const tout = produits(), u = univers();
    const top = tout.slice().sort((a, b) => (b.vedette ? 1 : 0) - (a.vedette ? 1 : 0) || (b.pop || 0) - (a.pop || 0) || (b.wcid || 0) - (a.wcid || 0)).slice(0, 4);
    return `<section class="cadre a-panneau el-accueil">
      <div class="el-accueil-haut">
        <a class="el-accueil-banniere" href="#/electromenager" style="--fond:url('${IMG.electro.heros}')">
          <span class="el-accueil-texte"><span class="el-surtitre">${T.I.eclair}Nouveau rayon</span><b class="el-accueil-titre">Électroménager & électronique</b>
            <span>Vélos électriques, mixeurs, moulins, popcorn, froid, TV, solaire…</span><span class="btn btn-ocre btn-petit">Découvrir le rayon ${T.I.fleche}</span></span></a>
        <div class="el-tuiles el-tuiles-accueil">${u.map((s) => tuile(s, tout.filter((p) => p.sous === s.id).length, true)).join('')}</div>
      </div>
      ${top.length ? `<div class="v6-entete el-accueil-entete"><div><h2>Les appareils du moment</h2></div><a class="v6-tout" href="#/electromenager">Tout le rayon ${T.I.fleche}</a></div>
      <div class="grille-produits v6-produits">${top.map(T.carteProduit).join('')}</div>` : ''}
    </section>`;
  }

  /* ---------- Menus (en-tête, tiroir mobile, page Catégories) ---------- */
  const lienUnivers = (s) => '#/electromenager?sous=' + s.id;
  function menu(taille) {
    const T = A();
    return univers().map((s) => `<a href="${lienUnivers(s)}">${T.photo(imageUnivers(s), taille, taille, '')}<span>${T.esc(taille > 80 ? (s.court || s.nom).split(' & ')[0] : s.nom)}</span></a>`).join('');
  }
  function categories() {
    const T = A(), tout = produits();
    return `<h2 style="font-size:1.3rem">${T.esc(D.electro.nom)}</h2>
      <div class="grille-paniers" style="margin-bottom:34px">${univers().map((s) => `<a class="carte-panier" style="text-decoration:none" href="${lienUnivers(s)}"><h3>${T.esc(s.nom)}</h3><span class="muet petit">${pluriel(tout.filter((p) => p.sous === s.id).length, 'produit')}</span></a>`).join('')}</div>`;
  }

  /* ---------- Interactions (sans recharger la page) ---------- */
  function maj(remonter) {
    const z = document.getElementById('el-resultats'); if (!z) return;
    z.innerHTML = resultats();
    document.querySelectorAll('[data-electro-sous]').forEach((a) => a.classList.toggle('actif', a.dataset.electroSous === S.sous));
    document.querySelectorAll('[data-electro-prix]').forEach((b) => { const on = b.dataset.electroPrix === S.prix; b.classList.toggle('actif', on); b.setAttribute('aria-pressed', on); });
    const qs = new URLSearchParams();
    if (S.sous) qs.set('sous', S.sous);
    if (S.tri !== 'pop') qs.set('tri', S.tri);
    if (S.prix) qs.set('prix', S.prix);
    if (S.q) qs.set('q', S.q);
    try { history.replaceState(null, '', '#/electromenager' + (qs.toString() ? '?' + qs : '')); } catch (e) { /* navigation privée */ }
    if (remonter) { const c = document.getElementById('el-catalogue'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  document.addEventListener('click', (e) => {
    if (!document.getElementById('el-resultats')) return;
    const t = e.target.closest('[data-electro-sous], [data-electro-prix], [data-electro-plus], [data-electro-reset], [data-electro-voir]');
    if (!t) return;
    e.preventDefault();
    if (t.hasAttribute('data-electro-voir')) { maj(true); return; }
    if (t.hasAttribute('data-electro-plus')) { S.n += PAS; maj(false); return; }
    if (t.hasAttribute('data-electro-reset')) { S.sous = ''; S.prix = ''; S.q = ''; S.n = PAS; const i = document.querySelector('[data-electro-q]'); if (i) i.value = ''; maj(true); return; }
    if (t.hasAttribute('data-electro-sous')) { S.sous = t.dataset.electroSous; S.n = PAS; maj(true); return; }
    S.prix = t.dataset.electroPrix; S.n = PAS; maj(false);
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches && e.target.matches('[data-electro-tri]')) { S.tri = e.target.value; S.n = PAS; maj(false); }
  });
  let minuterie = null;
  document.addEventListener('input', (e) => {
    if (!e.target.matches || !e.target.matches('[data-electro-q]')) return;
    clearTimeout(minuterie);
    const v = e.target.value;
    minuterie = setTimeout(() => { S.q = v; S.n = PAS; maj(false); }, 220);
  });

  window.TDGElectro = { vue, accueil, menu, categories, univers, produits, estElectro: (p) => !!p && p.cat === ID, lienUnivers };
})();
