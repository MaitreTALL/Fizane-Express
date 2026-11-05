# Modifications appliquées au thème et à Tondraaga Core (boutique)

Chaque fichier JSON liste des remplacements exacts (`file` relatif à `wp-content/`, `old`, `new`, `count`).
Ils ont été appliqués sur le serveur le 31 octobre 2026, après vérification du nombre d'occurrences ;
les fichiers d'origine sont sauvegardés dans `wp-content/tdg-sauvegardes/formules-monde-20261031/`.

1. `formules-monde-categories.json` : deux formules vendeur dans le contrat, livraison dans le monde entier,
   pays et prix au kilo des colis par zone, sous-catégories dans la boutique de l'application.
2. `colis-drapeaux-categories.json` : texte des tarifs colis, trajets au départ du Burkina, drapeaux des
   nouveaux pays, nom « Textiles & mode africaine », version du thème (cache des navigateurs).

La page « Devenir vendeur » complète est dans `../theme/page-devenir-vendeur.php`.
3. `expeditions-depuis-burkina.json` : colis uniquement du Burkina vers les autres pays (trajets retour fermés,
   y compris dans les réglages enregistrés), textes « du Burkina vers le monde entier ».
4. `derniers-textes-monde.json` : dernières mentions « France et États-Unis » (courses, fiche produit, à propos).
5. `pays-de-commande.json` : « Je commande depuis » ouvert à tous les pays (liste et taux injectés par
   l'extension tdg-ameliorations), équivalent dans la monnaie du pays, aucun pour les pays du franc CFA.
6. `electromenager.json` (5 novembre 2026) : rayon « Électroménager & électronique » (`#/electromenager`) — lien dans
   l'en-tête, le méga-menu, le tiroir mobile, le pied de page et la page Catégories ; section sur l'accueil ; fiches
   des appareils sans mention « Made in Burkina » ; boutique Made in Burkina sans les appareils (sauf recherche) et
   sans plafond caché à 40 000 FCFA ; catalogue porté à 1 500 produits. Le module lui-même est dans
   `../theme/assets/js/electro.js`, `../theme/assets/css/electro.css` et `../theme/assets/img/electro/`
   (illustrations produites par `../../tools/electro_illustrations.py`). Sauvegardes :
   `wp-content/tdg-sauvegardes/electromenager-20261105/`.
