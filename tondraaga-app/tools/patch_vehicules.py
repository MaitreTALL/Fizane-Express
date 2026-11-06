"""Deuxième série de remplacements (après electromenager.json) : rayon « Véhicules & engins », produits d'usine
sur devis (« Prix sur demande » et bouton WhatsApp), note « sur commande », vignettes de la galerie des fiches,
menus mis à jour à l'arrivée du catalogue. Écrit web/patchs/vehicules.json."""
import json

APP = 'themes/tondraaga/assets/js/app.js'
P = []


def r(fichier, old, new, count=1):
    P.append({'file': fichier, 'old': old, 'new': new, 'count': count})


r(APP, "  const categorie = (id) => D.categories.find((c) => c.id === id) || (D.electro && D.electro.id === id ? D.electro : { id, nom: 'Boutique' });\n"
  "  // rayon Électroménager & électronique (js/electro.js) : appareils des vendeurs, sans la mention « Made in Burkina »\n"
  "  const estElectro = (p) => !!p && !!D.electro && p.cat === D.electro.id;\n"
  "  const nomCat = (p) => (estElectro(p) ? p.sousNom || D.electro.court : categorie(p.cat).nom);\n"
  "  const lienCat = (p) => (estElectro(p) ? '#/electromenager' + (p.sous ? '?sous=' + p.sous : '') : '#/boutique?cat=' + p.cat);\n",
  "  // rayons de produits d'usine (js/electro.js) : électroménager et véhicules, sans la mention « Made in Burkina »\n"
  "  const rayonImporte = (id) => (D.rayonsImportes || []).find((x) => x.id === id);\n"
  "  const categorie = (id) => D.categories.find((c) => c.id === id) || rayonImporte(id) || { id, nom: 'Boutique' };\n"
  "  const estElectro = (p) => !!p && !!rayonImporte(p.cat);\n"
  "  const surDevis = (p) => estElectro(p) && !p.prix; // véhicules : prix sur demande\n"
  "  const nomCat = (p) => (estElectro(p) ? p.sousNom || rayonImporte(p.cat).court : categorie(p.cat).nom);\n"
  "  const lienCat = (p) => (estElectro(p) ? '#/' + p.cat + (p.sous ? '?sous=' + p.sous : '') : '#/boutique?cat=' + p.cat);\n"
  "  const rayonRecherche = (qn) => { const l = D.produits.filter((p) => sansAccents(p.nom).includes(qn)), c = [...new Set(l.map((p) => p.cat))]; return l.length && c.length === 1 && rayonImporte(c[0]) ? '#/' + c[0] : ''; };\n"
  "  const devisWa = (p) => lienWhatsapp('Bonjour Tondraaga, je voudrais un devis pour : ' + p.nom + (p.lien ? ' (' + p.lien + ')' : ''));\n")

r(APP, '        <li><a href="#/electromenager" data-match="electromenager">Électroménager</a></li>\n',
  '        <li><a href="#/electromenager" data-match="electromenager">Électroménager</a></li>\n'
  '        <li><a href="#/vehicules" data-match="vehicules">Véhicules</a></li>\n')
r(APP, "${window.TDGElectro ? `<p class=\"surtitre\" style=\"margin-top:16px\">Électroménager & électronique</p><div class=\"mega-grille\">${window.TDGElectro.menu(80)}</div>` : ''}",
  "${window.TDGElectro ? window.TDGElectro.mega() : ''}")
r(APP, "        ${window.TDGElectro ? `<p class=\"tiroir-titre\">Électroménager & électronique</p>\n"
  "        <div class=\"tiroir-grille\">${window.TDGElectro.menu(96)}<a href=\"#/electromenager\"><span class=\"tiroir-icone\">${I.grille}</span><span>Tout le rayon</span></a></div>` : ''}\n",
  "        ${window.TDGElectro ? window.TDGElectro.tiroir() : ''}\n")
r(APP, '<li><a href="#/electromenager">Électroménager & électronique</a></li>',
  '<li><a href="#/electromenager">Électroménager & électronique</a></li><li><a href="#/vehicules">Véhicules & engins</a></li>')

# carte produit
r(APP, '<span class="livraison-carte">${p.stock > 0 ? (p.stock <= 5 ?',
  "<span class=\"livraison-carte\">${estElectro(p) ? (surDevis(p) ? 'Sur devis · importé de l’usine' : 'Sur commande · livré à Ouagadougou') : p.stock > 0 ? (p.stock <= 5 ?")
r(APP, "        <div class=\"pied-carte\"><span class=\"prix\">${fcfa(p.prix)}${p.ancien ? `<s>${fcfa(p.ancien)}</s>` : ''}<small>${equiv(p.prix)}</small></span>\n          ${p.stock > 0 ? (p.variantes ? ",
  "        <div class=\"pied-carte\">${surDevis(p) ? `<span class=\"prix prix-demande\">Prix sur demande<small>devis gratuit</small></span><a class=\"rond-panier devis\" href=\"${devisWa(p)}\" target=\"_blank\" rel=\"noopener\" aria-label=\"Demander un devis pour ${esc(p.nom)}\">${I.wa}</a>` : `<span class=\"prix\">${fcfa(p.prix)}${p.ancien ? `<s>${fcfa(p.ancien)}</s>` : ''}<small>${equiv(p.prix)}</small></span>`}\n          ${surDevis(p) ? '' : p.stock > 0 ? (p.variantes ? ")

# accueil : menu des rayons et cercles des catégories
r(APP, "      D.electro && IMG.electro && ['#/electromenager', IMG.electro['electro-mobilite'], D.electro.nom],\n",
  "      ...(window.TDGElectro ? window.TDGElectro.liensMenu() : []),\n")
r(APP, "...(D.electro && IMG.electro ? [['#/electromenager', IMG.electro['electro-cuisine'], D.electro.court]] : []), ",
  "...(window.TDGElectro ? window.TDGElectro.liensMenu() : []), ")

# fiche produit
r(APP, "    const ensemble = D.produits.filter((x) => x.id !== p.id && x.stock > 0 && (x.cat === p.cat || x.vendeur === p.vendeur)).slice(0, 2);",
  "    const ensemble = surDevis(p) ? [] : D.produits.filter((x) => x.id !== p.id && x.stock > 0 && x.prix > 0 && (x.cat === p.cat || x.vendeur === p.vendeur)).slice(0, 2);")
r(APP, "'Article prêt à être préparé par le vendeur.',",
  "(estElectro(p) ? 'Produit commandé à l’usine pour vous, puis transporté jusqu’à Ouagadougou.' : 'Article prêt à être préparé par le vendeur.'),")
r(APP, "<a href=\"${estElectro(p) ? '#/electromenager' : '#/boutique'}\">${estElectro(p) ? 'Électroménager' : 'Boutique'}</a>",
  "<a href=\"${estElectro(p) ? '#/' + p.cat : '#/boutique'}\">${estElectro(p) ? esc(rayonImporte(p.cat).court) : 'Boutique'}</a>")
r(APP, "${photo(imgDe(p), 900, 900, p.nom, 'loading=\"eager\"')}</div>${estElectro(p) ? '' : madeInBF('sur-photo')}",
  "${photo(imgDe(p), 900, 900, p.nom, 'loading=\"eager\"')}</div>${estElectro(p) ? '' : madeInBF('sur-photo')}"
  "${p.galerie && p.galerie.length ? `<div class=\"el-vignettes\">${[imgDe(p)].concat(p.galerie).filter(Boolean).slice(0, 7).map((u, i) => `<button type=\"button\" data-vignette=\"${esc(u)}\" aria-label=\"Photo ${i + 1}\" aria-pressed=\"${i ? 'false' : 'true'}\"><img src=\"${esc(u)}\" alt=\"\" loading=\"lazy\"></button>`).join('')}</div>` : ''}")
r(APP, "`<tr><th>Rayon</th><td>${esc(D.electro.nom)}</td></tr>`", "`<tr><th>Rayon</th><td>${esc(rayonImporte(p.cat).nom)}</td></tr>`")
r(APP, "<div class=\"prix-amz\">${r ? `<span class=\"remise-amz\">-${r} %</span>` : ''}<span class=\"montant\">${fcfa(p.prix)}</span></div>",
  "${surDevis(p) ? '<div class=\"prix-amz\"><span class=\"montant prix-demande\">Prix sur demande</span></div>' : `<div class=\"prix-amz\">${r ? `<span class=\"remise-amz\">-${r} %</span>` : ''}<span class=\"montant\">${fcfa(p.prix)}</span></div>`}")
r(APP, "<div class=\"prix-amz petit-format\"><span class=\"montant\">${fcfa(p.prix)}</span></div><p class=\"petit muet\" style=\"margin:0 0 10px\">${equiv(p.prix)}</p>",
  "${surDevis(p) ? '<div class=\"prix-amz petit-format\"><span class=\"montant prix-demande\">Prix sur demande</span></div>' : `<div class=\"prix-amz petit-format\"><span class=\"montant\">${fcfa(p.prix)}</span></div><p class=\"petit muet\" style=\"margin:0 0 10px\">${equiv(p.prix)}</p>`}")
r(APP, "Préparation par le vendeur : 2 à 4 jours.</span></p>",
  "Préparation par le vendeur : 2 à 4 jours.</span></p>"
  "${estElectro(p) ? `<p class=\"note-commande\">${I.info}<span>${surDevis(p) ? 'Importé sur devis : prix rendu Ouagadougou, acompte à la commande et solde à la livraison' : 'Produit d’usine commandé pour vous'}. Délai : ${esc(rayonImporte(p.cat).delai || '')}.</span></p>` : ''}")
r(APP, "${demo ? 'Bientôt disponible' : p.stock > 0 ? (p.stock <= 5 ? `Plus que ${p.stock} en stock` : 'En stock') : 'Rupture de stock'}</p>",
  "${demo ? 'Bientôt disponible' : estElectro(p) ? (surDevis(p) ? 'Sur devis' : 'Sur commande') : p.stock > 0 ? (p.stock <= 5 ? `Plus que ${p.stock} en stock` : 'En stock') : 'Rupture de stock'}</p>")
r(APP, "          <button class=\"btn btn-ocre btn-bloc\" data-action=\"ajouter-fiche\" data-id=\"${p.id}\" ${p.stock > 0 && !demo ? '' : 'disabled'}>${I.ajout} Ajouter au panier</button>\n"
  "          <button class=\"btn btn-brun btn-bloc\" data-action=\"acheter-fiche\" data-id=\"${p.id}\" ${p.stock > 0 && !demo ? '' : 'disabled'}>Commander maintenant</button>",
  "          ${surDevis(p) ? `<a class=\"btn btn-ocre btn-bloc\" href=\"${devisWa(p)}\" target=\"_blank\" rel=\"noopener\">${I.wa} Demander un devis</a>` : `<button class=\"btn btn-ocre btn-bloc\" data-action=\"ajouter-fiche\" data-id=\"${p.id}\" ${p.stock > 0 && !demo ? '' : 'disabled'}>${I.ajout} Ajouter au panier</button>\n"
  "          <button class=\"btn btn-brun btn-bloc\" data-action=\"acheter-fiche\" data-id=\"${p.id}\" ${p.stock > 0 && !demo ? '' : 'disabled'}>Commander maintenant</button>`}")
r(APP, "p.stock > 0 ? `<span class=\"prix\">${fcfa(p.prix)}<small>${equiv(p.prix)}</small></span><button class=\"btn btn-ocre\" data-action=\"ajouter-fiche\"",
  "surDevis(p) ? `<span class=\"prix prix-demande\">Prix sur demande</span><a class=\"btn btn-ocre\" href=\"${devisWa(p)}\" target=\"_blank\" rel=\"noopener\">${I.wa} Demander un devis</a>` : p.stock > 0 ? `<span class=\"prix\">${fcfa(p.prix)}<small>${equiv(p.prix)}</small></span><button class=\"btn btn-ocre\" data-action=\"ajouter-fiche\"")

# routes, recherche, catalogue
r(APP, "      electromenager: () => (window.TDGElectro ? window.TDGElectro.vue(seg, qs) : vIntrouvable()),\n",
  "      electromenager: () => (window.TDGElectro ? window.TDGElectro.vue(seg, qs) : vIntrouvable()),\n"
  "      vehicules: () => (window.TDGElectro ? window.TDGElectro.vue(seg, qs) : vIntrouvable()),\n")
r(APP, "enBoutique && D.produits.every((p) => !sansAccents(p.nom).includes(qn) || estElectro(p)) ? '#/electromenager' : '#/boutique'",
  "enBoutique && rayonRecherche(qn) ? rayonRecherche(qn) : '#/boutique'")
r(APP, "        if (c.sousCategories) D.sousCategories = c.sousCategories;\n",
  "        if (c.sousCategories) D.sousCategories = c.sousCategories;\n"
  "        if (window.TDGElectro && window.TDGElectro.majMenus) window.TDGElectro.majMenus();\n")

FN = 'themes/tondraaga/functions.php'
r(FN, "define( 'TDG_THEME_VERSION', '1.9.9' );", "define( 'TDG_THEME_VERSION', '2.0.0' );")
r('mu-plugins/tdg-ameliorations.php', "'cadeaux', 'culture', 'electromenager' );", "'cadeaux', 'culture', 'electromenager', 'vehicules' );")

json.dump(P, open('web/patchs/vehicules.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(P), 'remplacements')
