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
