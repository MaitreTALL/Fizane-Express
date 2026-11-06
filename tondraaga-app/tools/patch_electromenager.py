"""Remplacements exacts du rayon « Électroménager & électronique » (thème Tondraaga, Tondraaga Core, tdg-ameliorations).
Écrit web/patchs/electromenager.json ; chaque remplacement est appliqué seulement si « old » apparaît exactement « count » fois."""
import json

APP = 'themes/tondraaga/assets/js/app.js'
P = []


def r(fichier, old, new, count=1):
    P.append({'file': fichier, 'old': old, 'new': new, 'count': count})


# 1. catégorie inconnue sans erreur ; outils du rayon
r(APP, "  const categorie = (id) => D.categories.find((c) => c.id === id);\n",
  "  const categorie = (id) => D.categories.find((c) => c.id === id) || (D.electro && D.electro.id === id ? D.electro : { id, nom: 'Boutique' });\n"
  "  // rayon Électroménager & électronique (js/electro.js) : appareils des vendeurs, sans la mention « Made in Burkina »\n"
  "  const estElectro = (p) => !!p && !!D.electro && p.cat === D.electro.id;\n"
  "  const nomCat = (p) => (estElectro(p) ? p.sousNom || D.electro.court : categorie(p.cat).nom);\n"
  "  const lienCat = (p) => (estElectro(p) ? '#/electromenager' + (p.sous ? '?sous=' + p.sous : '') : '#/boutique?cat=' + p.cat);\n")

# 2. en-tête : lien du rayon, méga-menu et tiroir mobile
r(APP, '        <li><a href="#/boutique" data-match="boutique|produit|categories">Boutique</a></li>\n',
  '        <li><a href="#/boutique" data-match="boutique|produit|categories">Boutique</a></li>\n'
  '        <li><a href="#/electromenager" data-match="electromenager">Électroménager</a></li>\n')
r(APP, "<span>${esc(c.nom)}</span></a>`).join('')}</div></div>\n",
  "<span>${esc(c.nom)}</span></a>`).join('')}</div>"
  "${window.TDGElectro ? `<p class=\"surtitre\" style=\"margin-top:16px\">Électroménager & électronique</p><div class=\"mega-grille\">${window.TDGElectro.menu(80)}</div>` : ''}</div>\n")
r(APP, '        <p class="tiroir-titre">Courses pour mes proches</p>\n',
  "        ${window.TDGElectro ? `<p class=\"tiroir-titre\">Électroménager & électronique</p>\n"
  "        <div class=\"tiroir-grille\">${window.TDGElectro.menu(96)}<a href=\"#/electromenager\"><span class=\"tiroir-icone\">${I.grille}</span><span>Tout le rayon</span></a></div>` : ''}\n"
  '        <p class="tiroir-titre">Courses pour mes proches</p>\n')

# 3. pied de page
r(APP, '<li><a href="#/boutique">Boutique Made in Burkina</a></li>',
  '<li><a href="#/boutique">Boutique Made in Burkina</a></li><li><a href="#/electromenager">Électroménager & électronique</a></li>')

# 4. carte produit : pas de « Made in Burkina » sur les appareils, univers au lieu de la catégorie
r(APP, "        ${madeInBF('sur-photo')}\n      </div>\n      <div class=\"corps\">\n        <span class=\"categorie\">${esc(categorie(p.cat).nom)}</span>",
  "        ${estElectro(p) ? '' : madeInBF('sur-photo')}\n      </div>\n      <div class=\"corps\">\n        <span class=\"categorie\">${esc(nomCat(p))}</span>")

# 5. accueil : menu des rayons, cercles des catégories, sélection des artisans, section du rayon
r(APP, "      c('bijoux') && [`#/boutique?cat=bijoux`, IMG.categories.bijoux, c('bijoux').nom],\n",
  "      c('bijoux') && [`#/boutique?cat=bijoux`, IMG.categories.bijoux, c('bijoux').nom],\n"
  "      D.electro && IMG.electro && ['#/electromenager', IMG.electro['electro-mobilite'], D.electro.nom],\n")
r(APP, "    const tuiles = ouverte ? [...D.categories.map((x) => [`#/boutique?cat=${x.id}`, IMG.categories[x.id], x.nom]), ",
  "    const tuiles = ouverte ? [...D.categories.map((x) => [`#/boutique?cat=${x.id}`, IMG.categories[x.id], x.nom]), ...(D.electro && IMG.electro ? [['#/electromenager', IMG.electro['electro-cuisine'], D.electro.court]] : []), ")
r(APP, "    const selection = [...D.produits.filter((p) => p.vedette), ...D.produits.filter((p) => !p.vedette)].slice(0, 8);\n",
  "    const faitMain = D.produits.filter((p) => !estElectro(p)); // la sélection reste celle des artisans\n"
  "    const selection = [...faitMain.filter((p) => p.vedette), ...faitMain.filter((p) => !p.vedette)].slice(0, 8);\n")
r(APP, '\n\n    <section class="v6-bande-claire">',
  "\n\n    ${ouverte && window.TDGElectro ? window.TDGElectro.accueil() : ''}\n\n    <section class=\"v6-bande-claire\">")

# 6. boutique Made in Burkina : appareils seulement en recherche ; plus de plafond caché à 40 000 FCFA
r(APP, "      && p.prix <= F.prixMax && p.prix >= F.prixMin && (!F.dispo || p.stock > 0)",
  "      && (F.prixMax >= 40000 || p.prix <= F.prixMax) && p.prix >= F.prixMin && (!F.dispo || p.stock > 0) && (F.q || F.vendeurs.size || !estElectro(p))")
r(APP, "' ' + categorie(p.cat).nom + ' ' + (p.sousNom || '')", "' ' + nomCat(p) + ' ' + (p.sousNom || '')")

# 7. fiche produit d'un appareil
r(APP, '<a href="#/boutique">Boutique</a> › <a href="#/boutique?cat=${p.cat}">${esc(categorie(p.cat).nom)}</a> › <span>${esc(p.nom)}</span>',
  "<a href=\"${estElectro(p) ? '#/electromenager' : '#/boutique'}\">${estElectro(p) ? 'Électroménager' : 'Boutique'}</a> › <a href=\"${lienCat(p)}\">${esc(nomCat(p))}</a> › <span>${esc(p.nom)}</span>")
r(APP, "${photo(imgDe(p), 900, 900, p.nom, 'loading=\"eager\"')}</div>${madeInBF('sur-photo')}",
  "${photo(imgDe(p), 900, 900, p.nom, 'loading=\"eager\"')}</div>${estElectro(p) ? '' : madeInBF('sur-photo')}")
r(APP, "      `Fabriqué au Burkina Faso par ${v.nom} (${v.ville}), vendeur vérifié par Tondraaga.`,",
  "      estElectro(p) ? `Vendu par ${v.nom} (${v.ville}), vendeur vérifié par Tondraaga.` : `Fabriqué au Burkina Faso par ${v.nom} (${v.ville}), vendeur vérifié par Tondraaga.`,")
r(APP, "<table class=\"table-attributs\"><tr><th>Origine</th><td>${drapeau('BF')} ${esc(v.ville)}, Burkina Faso</td></tr><tr><th>Catégorie</th><td>${esc(categorie(p.cat).nom)}</td></tr>",
  "<table class=\"table-attributs\">${estElectro(p) ? `<tr><th>Rayon</th><td>${esc(D.electro.nom)}</td></tr>` : `<tr><th>Origine</th><td>${drapeau('BF')} ${esc(v.ville)}, Burkina Faso</td></tr>`}<tr><th>Catégorie</th><td>${esc(nomCat(p))}</td></tr>")

# 8. page Catégories, page du rayon, recherche de l'en-tête, outils partagés
r(APP, '      <h2 style="font-size:1.3rem">Courses pour mes proches</h2>\n',
  "      ${window.TDGElectro ? window.TDGElectro.categories() : ''}\n      <h2 style=\"font-size:1.3rem\">Courses pour mes proches</h2>\n")
r(APP, "      colis: () => window.TDGColis.vue(seg, qs),\n",
  "      colis: () => window.TDGColis.vue(seg, qs),\n"
  "      electromenager: () => (window.TDGElectro ? window.TDGElectro.vue(seg, qs) : vIntrouvable()),\n")
r(APP, "        : ((enCourses && !enBoutique) || !boutiqueOuverte() ? '#/courses' : '#/boutique') + (q ? '?q=' + encodeURIComponent(q) : '');",
  "        : ((enCourses && !enBoutique) || !boutiqueOuverte() ? '#/courses' : enBoutique && D.produits.every((p) => !sansAccents(p.nom).includes(qn) || estElectro(p)) ? '#/electromenager' : '#/boutique') + (q ? '?q=' + encodeURIComponent(q) : '');")
r(APP, "madeInBF, rendre: () => rendre(), etoiles, WOO, WP, API };",
  "madeInBF, rendre: () => rendre(), etoiles, WOO, WP, API, carteProduit, categorie };")

# 9. thème : feuille de style et script du rayon, version (cache des navigateurs)
FN = 'themes/tondraaga/functions.php'
r(FN, "define( 'TDG_THEME_VERSION', '1.9.7' );", "define( 'TDG_THEME_VERSION', '1.9.9' );")
r(FN, "'v6', 'v7', 'v8', 'v9' ) as $f ) {", "'v6', 'v7', 'v8', 'v9', 'electro' ) as $f ) {")
r(FN, "\twp_enqueue_script( 'tdg-app', \"$base/js/app.js\", array( 'tdg-colis' ), $v, true );",
  "\twp_enqueue_script( 'tdg-electro', \"$base/js/electro.js\", array( 'tdg-colis' ), $v, true );\n"
  "\twp_enqueue_script( 'tdg-app', \"$base/js/app.js\", array( 'tdg-electro' ), $v, true );")

# 10. catalogue : place pour des centaines d'appareils
r('plugins/tondraaga-core/inc/catalogue.php', "\t\t'limit'   => 500,", "\t\t'limit'   => 1500,")

# 11. tdg-ameliorations : sous-catégories et catégorie principale des appareils dans le catalogue
r('mu-plugins/tdg-ameliorations.php', "\treturn array( 'artisanat', 'mode', 'local', 'karite', 'bijoux', 'cadeaux', 'culture' );",
  "\treturn array( 'artisanat', 'mode', 'local', 'karite', 'bijoux', 'cadeaux', 'culture', 'electromenager' );")

json.dump(P, open('web/patchs/electromenager.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(P), 'remplacements')
