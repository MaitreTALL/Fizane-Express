/* Tondraaga — rayons de produits d'usine : « Électroménager & électronique » (#/electromenager) et
   « Véhicules & engins » (#/vehicules). Produits WooCommerce importés des usines (fiches et photos des fabricants),
   vendus sur commande : ils ne portent pas la mention « Made in Burkina » et ont leurs propres pages, sans plafond de
   prix. Les véhicules sont sur devis (sans prix) ; les pièces détachées ont un prix.
   Chargé avant app.js : les vues sont dessinées à la demande avec les outils de l'application (window.TDGApp). */
(function () {
  'use strict';
  const D = window.TDG, IMG = window.TDG_IMG || (window.TDG_IMG = {});
  const PAS = 24;

  const RAYONS = [
    {
      id: 'electromenager', nom: 'Électroménager & électronique', court: 'Électroménager', titre: ['Électroménager', '& électronique'],
      texte: 'Vélos et motos électriques, mixeurs, moulins, machines à popcorn, réfrigérateurs, ventilateurs, télévisions, téléphones, solaire… Des produits d’usine, commandés pour vous et livrés à Ouagadougou.',
      recherche: 'Rechercher : mixeur, moulin, vélo électrique…', demande: 'Bonjour Tondraaga, je cherche cet appareil : ',
      vendre: 'Vous vendez de l’électroménager ou de l’électronique ?',
      delai: 'environ 3 à 8 semaines selon le transport (avion ou bateau)',
      sous: [
        { id: 'electro-mobilite', nom: 'Vélos & motos électriques', court: 'Vélos & trottinettes' },
        { id: 'electro-cuisine', nom: 'Mixeurs & blenders', court: 'Mixeurs & blenders' },
        { id: 'electro-moulins', nom: 'Broyeurs & moulins', court: 'Broyeurs & moulins' },
        { id: 'electro-snack', nom: 'Popcorn & machines à snacks', court: 'Popcorn & snacks' },
        { id: 'electro-froid', nom: 'Froid & ventilation', court: 'Froid & ventilation' },
        { id: 'electro-maison', nom: 'Petit électroménager', court: 'Petit électroménager' },
        { id: 'electro-image-son', nom: 'TV, son & téléphonie', court: 'TV, son & téléphones' },
        { id: 'electro-energie', nom: 'Énergie & solaire', court: 'Énergie & solaire' }
      ]
    },
    {
      id: 'vehicules', nom: 'Véhicules & engins', court: 'Véhicules', titre: ['Véhicules', '& engins'], devis: true,
      texte: 'Tricycles et motos électriques, voiturettes, mini-pelles, dumpers, tracteurs et pièces détachées, commandés directement à l’usine. Demandez votre devis : prix rendu Ouagadougou et délai.',
      recherche: 'Rechercher : tricycle, tracteur, casque…', demande: 'Bonjour Tondraaga, je voudrais un devis pour ce véhicule : ',
      vendre: 'Vous vendez des véhicules, des engins ou des pièces ?',
      delai: 'environ 6 à 10 semaines (transport maritime et dédouanement)',
      sous: [
        { id: 'vehicules-motos', nom: 'Motos & scooters électriques', court: 'Motos électriques' },
        { id: 'vehicules-tricycles', nom: 'Tricycles', court: 'Tricycles' },
        { id: 'vehicules-voitures', nom: 'Voiturettes & voitures électriques', court: 'Voiturettes' },
        { id: 'vehicules-utilitaires', nom: 'Utilitaires & dumpers', court: 'Utilitaires & dumpers' },
        { id: 'vehicules-engins', nom: 'Engins & tracteurs', court: 'Engins & tracteurs' },
        { id: 'vehicules-pieces', nom: 'Pièces & équipements', court: 'Pièces & casques' }
      ]
    }
  ];
  D.rayonsImportes = RAYONS;
  D.electro = RAYONS[0];
  IMG.electro = IMG.electro || {};

  const A = () => window.TDGApp;
  const rayon = (id) => RAYONS.find((r) => r.id === id) || RAYONS[0];
  const sansAccents = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const remise = (p) => (p.ancien ? Math.round((1 - p.prix / p.ancien) * 100) : 0);
  const pluriel = (n, mot) => n + ' ' + mot + (n > 1 ? 's' : '');
  function wa(texte) {
    const e = D.entreprise || {};
    return `https://wa.me/${e.indicatif || ''}${e.whatsapp || ''}?text=${encodeURIComponent(texte)}`;
  }

  // univers : ceux du site, renommés ou complétés par l'administration (sous-catégories qui ont des produits)
  function univers(r) {
    const serveur = (D.sousCategories && D.sousCategories[r.id]) || [];
    const l = r.sous.map((s) => {
      const x = serveur.find((y) => y.id === s.id);
      return x ? Object.assign({}, s, { nom: x.nom }) : s;
    });
    serveur.forEach((x) => { if (!l.some((s) => s.id === x.id)) l.push({ id: x.id, nom: x.nom, court: x.nom }); });
    return l;
  }
  const nomUnivers = (r, id) => { const s = univers(r).find((x) => x.id === id); return s ? s.nom : ''; };
  const produits = (r) => (D.catalogueReel ? D.produits.filter((p) => p.cat === r.id) : []);
  const vitrine = (l) => l.slice().sort((a, b) => (b.vedette ? 1 : 0) - (a.vedette ? 1 : 0) || (b.pop || 0) - (a.pop || 0) || (b.wcid || 0) - (a.wcid || 0));
  // photo d'un univers : celle de son produit le plus en vue
  function imageUnivers(r, s) {
    const p = vitrine(produits(r).filter((x) => x.sous === s.id && x.image))[0];
    return p ? p.image : '';
  }
  function photos(r, n) {
    return vitrine(produits(r).filter((p) => p.image)).slice(0, n).map((p) => p.image);
  }

  /* ---------- Filtres de la page ---------- */
  const TRIS = [['pop', 'Les plus vendus'], ['nouveau', 'Nouveautés'], ['asc', 'Prix croissant'], ['desc', 'Prix décroissant'], ['promo', 'Promotions']];
  const PRIX = [['', 'Tous les prix'], ['0-25000', 'Moins de 25 000 F'], ['25000-100000', '25 000 à 100 000 F'], ['100000-300000', '100 000 à 300 000 F'], ['300000-', 'Plus de 300 000 F']];
  const S = { r: RAYONS[0], sous: '', tri: 'pop', prix: '', q: '', n: PAS };

  function liste() {
    const q = sansAccents(S.q).trim();
    const [min, max] = S.prix ? S.prix.split('-').map((x, i) => (x === '' ? (i ? Infinity : 0) : +x)) : [0, Infinity];
    const l = produits(S.r).filter((p) => (!S.sous || p.sous === S.sous) && (!S.prix || (p.prix && p.prix >= min && p.prix <= max))
      && (!q || sansAccents([p.nom, p.sousNom, p.motsCles, p.description].join(' ')).includes(q)));
    const tris = {
      pop: (a, b) => (b.pop || 0) - (a.pop || 0) || (b.vedette ? 1 : 0) - (a.vedette ? 1 : 0) || (b.wcid || 0) - (a.wcid || 0),
      nouveau: (a, b) => (b.nouveau ? 1 : 0) - (a.nouveau ? 1 : 0) || (b.wcid || 0) - (a.wcid || 0),
      asc: (a, b) => (a.prix || Infinity) - (b.prix || Infinity), desc: (a, b) => (b.prix || 0) - (a.prix || 0),
      promo: (a, b) => remise(b) - remise(a) || (b.pop || 0) - (a.pop || 0)
    };
    return l.sort(tris[S.tri] || tris.pop);
  }

  function tuile(r, s, n, lien) {
    const T = A(), img = s.id ? imageUnivers(r, s) : '';
    return `<a href="#/${r.id}${s.id ? '?sous=' + s.id : ''}" class="el-tuile ${!lien && S.sous === s.id ? 'actif' : ''}" ${lien ? '' : `data-electro-sous="${s.id}"`}>
      <span class="el-tuile-img">${img ? `<img src="${img}" alt="" width="88" height="88" loading="lazy" decoding="async">` : T.I.grille}</span>
      <span class="el-tuile-nom">${T.esc(s.court || s.nom)}</span><small>${n ? pluriel(n, r.devis ? 'modèle' : 'article') : 'Bientôt'}</small></a>`;
  }

  function videRayon(r) {
    const T = A();
    return `<div class="vide el-vide-texte"><h3>Les premiers ${r.devis ? 'modèles' : 'appareils'} arrivent</h3>
      <p>Vous cherchez un produit précis ? Écrivez-nous : nous le trouvons chez le fabricant et vous envoyons le prix.</p>
      <div class="el-boutons" style="justify-content:center"><a class="btn btn-ocre" href="${wa(r.demande)}" target="_blank" rel="noopener">${T.I.wa} Nous écrire</a></div></div>`;
  }

  function resultats() {
    const T = A(), r = S.r, tout = produits(r);
    if (!tout.length) return videRayon(r);
    const l = liste(), vus = l.slice(0, S.n);
    const tris = r.devis ? TRIS.filter(([k]) => k === 'pop' || k === 'nouveau') : TRIS;
    return `<div class="el-barre"><p class="el-nb"><b>${pluriel(l.length, r.devis ? 'modèle' : 'article')}</b>${S.sous ? ' · ' + T.esc(nomUnivers(r, S.sous)) : ''}${S.q ? ` pour « ${T.esc(S.q)} »` : ''}</p>
        <label class="el-tri">Trier par <select class="champ-select" data-electro-tri>${tris.map(([k, t]) => `<option value="${k}" ${S.tri === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      ${l.length ? `<div class="grille-produits el-grille">${vus.map(T.carteProduit).join('')}</div>`
        : `<div class="vide">Aucun ${r.devis ? 'modèle' : 'article'} ne correspond à votre recherche.<br><button type="button" class="btn-lien" data-electro-reset>Voir tout le rayon</button></div>`}
      ${l.length > S.n ? `<div class="el-plus"><button type="button" class="btn btn-contour" data-electro-plus>Afficher plus <small>(${l.length - S.n} de plus)</small></button></div>` : ''}`;
  }

  // bannière : texte sur fond brun, photos d'usine des produits en vitrine à droite
  function collage(r, n) {
    const l = photos(r, n);
    return l.length >= 3 ? `<div class="el-collage el-collage-${l.length >= 4 ? 4 : 3}">${l.slice(0, 4).map((u) => `<span><img src="${u}" alt="" loading="eager" decoding="async"></span>`).join('')}</div>` : '';
  }

  /* ---------- Page d'un rayon ---------- */
  function vue(seg, qs) {
    const T = A(), r = rayon(seg[0]);
    S.r = r; S.sous = qs.get('sous') || ''; S.tri = qs.get('tri') || 'pop'; S.prix = qs.get('prix') || ''; S.q = qs.get('q') || ''; S.n = PAS;
    const tout = produits(r), u = univers(r);
    const nb = (id) => (id ? tout.filter((p) => p.sous === id).length : tout.length);
    const e = D.entreprise || {};
    const atouts = r.devis
      ? [[T.I.wa, 'Devis gratuit', 'prix rendu Ouagadougou'], [T.I.medaille, 'Directement de l’usine', 'sans intermédiaire'], [T.I.camion, 'Transport et dédouanement', 'jusqu’à Ouagadougou'], [T.I.etiquette, 'Orange Money ou Wave', 'acompte et solde']]
      : [[T.I.moto, 'Livraison à domicile', 'à Ouagadougou'], [T.I.medaille, 'Produits d’usine', 'prix direct fabricant'], [T.I.etiquette, 'Orange Money ou Wave', 'reçu par e-mail'], [T.I.wa, 'Conseil avant l’achat', e.telAffiche ? T.esc(e.telAffiche) : 'sur WhatsApp']];
    const etapes = r.devis
      ? [['Demandez un devis', 'sur WhatsApp, avec le modèle choisi'], ['Validez et versez l’acompte', 'par Orange Money ou Wave'], ['Nous commandons à l’usine', 'et organisons le transport'], ['Réception à Ouagadougou', r.delai]]
      : [['Commandez et payez', 'en ligne, par Orange Money ou Wave'], ['Nous commandons à l’usine', 'dès la confirmation du paiement'], ['Transport Chine → Burkina', r.delai], ['Livraison à Ouagadougou', 'ou retrait à notre agence']];
    return `
    <section class="cadre el-haut">
      <div class="fil el-fil"><a href="#/">Accueil</a> › <span>${T.esc(r.nom)}</span></div>
      <div class="el-heros ${collage(r, 4) ? 'avec-collage' : ''}">
        <div class="el-heros-texte">
          <p class="el-surtitre">${T.I.eclair}Directement de l’usine</p>
          <h1>${T.esc(r.titre[0])} <span>${T.esc(r.titre[1])}</span></h1>
          <p>${T.esc(r.texte)}</p>
          <div class="el-boutons"><button type="button" class="btn btn-ocre" data-electro-voir>${r.devis ? 'Voir les modèles' : 'Voir les articles'} ${T.I.fleche}</button>
            <a class="btn btn-transparent" href="${wa(r.demande)}" target="_blank" rel="noopener">${T.I.wa} ${r.devis ? 'Demander un devis' : 'Demander un produit'}</a></div>
        </div>
        ${collage(r, 4)}
      </div>
      <ul class="el-atouts">${atouts.map(([i, b, t]) => `<li>${i}<span><b>${b}</b>${t}</span></li>`).join('')}</ul>
    </section>
    <section class="cadre el-section">
      <div class="v6-entete"><div><p class="v6-surtitre">Nos univers</p><h2>Que cherchez-vous&nbsp;?</h2></div></div>
      <div class="el-tuiles" style="--n:${u.length + 1}">${[{ id: '', court: 'Tout le rayon' }].concat(u).map((s) => tuile(r, s, nb(s.id))).join('')}</div>
    </section>
    <section class="cadre el-section" id="el-catalogue">
      <div class="el-filtres">
        <label class="el-recherche">${T.I.recherche}<input type="search" placeholder="${T.esc(r.recherche)}" value="${T.esc(S.q)}" data-electro-q aria-label="Rechercher dans le rayon ${T.esc(r.nom)}"></label>
        ${r.devis ? '' : `<div class="el-prix" role="group" aria-label="Prix">${PRIX.map(([v, t]) => `<button type="button" class="el-chip ${S.prix === v ? 'actif' : ''}" data-electro-prix="${v}" aria-pressed="${S.prix === v}">${t}</button>`).join('')}</div>`}
      </div>
      <div id="el-resultats">${resultats()}</div>
    </section>
    <section class="cadre el-section"><div class="el-etapes"><h2>Comment ça marche&nbsp;?</h2>
      <ol>${etapes.map(([b, t], i) => `<li><span>${i + 1}</span><b>${b}</b><small>${t}</small></li>`).join('')}</ol></div></section>
    <section class="cadre el-section"><div class="el-vendre">
      <div><p class="el-surtitre">Vendeurs</p><h2>${T.esc(r.vendre)}</h2>
        <p>Ouvrez votre boutique sur Tondraaga : vos produits sont vus par les clients de Ouagadougou et de la diaspora, qui paient par Orange Money ou Wave.</p></div>
      <div class="el-boutons"><a class="btn btn-ocre" href="${(T.WP && T.WP.inscriptionVendeur) || '#/vendeurs'}">Devenir vendeur</a>
        <a class="btn btn-transparent" href="${wa('Bonjour Tondraaga, je voudrais vendre sur Tondraaga (' + r.nom + ').')}" target="_blank" rel="noopener">${T.I.wa} Nous écrire</a></div>
    </div></section>`;
  }

  /* ---------- Sections de la page d'accueil ---------- */
  function accueil() {
    const T = A(); if (!T) return '';
    return RAYONS.map((r) => {
      const tout = produits(r);
      if (!tout.length) return '';
      const top = vitrine(tout).slice(0, 4), u = univers(r);
      return `<section class="cadre a-panneau el-accueil">
        <div class="el-accueil-haut">
          <a class="el-accueil-banniere" href="#/${r.id}">
            <span class="el-accueil-texte"><span class="el-surtitre">${T.I.eclair}Directement de l’usine</span><b class="el-accueil-titre">${T.esc(r.nom)}</b>
              <span>${T.esc(u.map((s) => s.court || s.nom).slice(0, 5).join(', '))}…</span><span class="btn btn-ocre btn-petit">${r.devis ? 'Voir les modèles' : 'Découvrir le rayon'} ${T.I.fleche}</span></span>
            ${collage(r, 3)}</a>
          <div class="el-tuiles el-tuiles-accueil">${u.slice(0, 8).map((s) => tuile(r, s, tout.filter((p) => p.sous === s.id).length, true)).join('')}</div>
        </div>
        <div class="v6-entete el-accueil-entete"><div><h2>${r.devis ? 'Les modèles du moment' : 'Les appareils du moment'}</h2></div><a class="v6-tout" href="#/${r.id}">Tout le rayon ${T.I.fleche}</a></div>
        <div class="grille-produits v6-produits">${top.map(T.carteProduit).join('')}</div>
      </section>`;
    }).join('');
  }

  /* ---------- Menus (en-tête, tiroir mobile, page Catégories) ---------- */
  const lienUnivers = (r, s) => `#/${r.id}?sous=${s.id}`;
  function grilleMenu(r, taille) {
    const T = A();
    return univers(r).map((s) => {
      const img = imageUnivers(r, s);
      return `<a href="${lienUnivers(r, s)}">${img ? T.photo(img, taille, taille, '') : `<span class="tiroir-icone">${T.I.grille}</span>`}<span>${T.esc(taille > 80 ? (s.court || s.nom).split(' & ')[0] : s.nom)}</span></a>`;
    }).join('');
  }
  const megaContenu = () => RAYONS.map((r) => `<p class="surtitre" style="margin-top:16px">${A().esc(r.nom)}</p><div class="mega-grille">${grilleMenu(r, 80)}</div>`).join('');
  const tiroirContenu = () => RAYONS.map((r) => `<p class="tiroir-titre">${A().esc(r.nom)}</p>
        <div class="tiroir-grille">${grilleMenu(r, 96)}<a href="#/${r.id}"><span class="tiroir-icone">${A().I.grille}</span><span>Tout le rayon</span></a></div>`).join('');
  const mega = () => `<div id="el-mega">${megaContenu()}</div>`;
  const tiroir = () => `<div id="el-tiroir">${tiroirContenu()}</div>`;
  // le catalogue arrive après l'en-tête : les menus prennent alors les photos des produits
  function majMenus() {
    const m = document.getElementById('el-mega'), t = document.getElementById('el-tiroir');
    if (m) m.innerHTML = megaContenu();
    if (t) t.innerHTML = tiroirContenu();
  }
  const liensMenu = () => RAYONS.map((r) => [`#/${r.id}`, photos(r, 1)[0] || '', r.nom]);
  function categories() {
    const T = A();
    return RAYONS.map((r) => `<h2 style="font-size:1.3rem">${T.esc(r.nom)}</h2>
      <div class="grille-paniers" style="margin-bottom:34px">${univers(r).map((s) => `<a class="carte-panier" style="text-decoration:none" href="${lienUnivers(r, s)}"><h3>${T.esc(s.nom)}</h3><span class="muet petit">${pluriel(produits(r).filter((p) => p.sous === s.id).length, 'produit')}</span></a>`).join('')}</div>`).join('');
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
    try { history.replaceState(null, '', '#/' + S.r.id + (qs.toString() ? '?' + qs : '')); } catch (e) { /* navigation privée */ }
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
  // fiche produit : les vignettes de la galerie changent la grande photo
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-vignette]'); if (!b) return;
    const g = b.closest('.galerie'), img = g && g.querySelector('[data-zoom] img');
    if (!img) return;
    img.src = b.dataset.vignette; img.srcset = b.dataset.vignette;
    g.querySelectorAll('[data-vignette]').forEach((x) => x.setAttribute('aria-pressed', x === b));
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

  window.TDGElectro = { vue, accueil, mega, tiroir, majMenus, liensMenu, categories, rayons: RAYONS, produits, univers };
})();
