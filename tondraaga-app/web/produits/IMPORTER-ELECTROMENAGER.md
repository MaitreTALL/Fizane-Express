# Ajouter des centaines d'appareils au rayon « Électroménager & électronique »

Le rayon s'affiche sur la boutique à l'adresse `https://boutique.visionaryentreprises.com/#/electromenager`.
Un produit y apparaît dès qu'il est publié dans la catégorie **Électroménager & électronique** ou dans une de ses
sous-catégories :

| Sous-catégorie (nom dans WordPress) | Identifiant |
| --- | --- |
| Vélos & motos électriques | `electro-mobilite` |
| Mixeurs & blenders | `electro-cuisine` |
| Broyeurs & moulins | `electro-moulins` |
| Popcorn & machines à snacks | `electro-snack` |
| Froid & ventilation | `electro-froid` |
| Petit électroménager | `electro-maison` |
| TV, son & téléphonie | `electro-image-son` |
| Énergie & solaire | `electro-energie` |

Les noms peuvent être modifiés dans **Produits › Catégories** ; ne changez pas les identifiants (slugs), car les
illustrations du site y sont liées. Une nouvelle sous-catégorie ajoutée sous « Électroménager & électronique »
apparaît aussi sur la page, dès qu'elle contient un produit.

## Un par un

**Produits › Ajouter** (ou, pour un vendeur, son espace vendeur › Produits) : nom, prix, photo, description courte,
stock, puis cocher la sous-catégorie. Le prix barré se fait avec « Tarif promo ».

## Par centaines (fichier tableur)

1. Ouvrez `modele-electromenager.csv` dans Excel, LibreOffice ou Google Sheets.
2. Supprimez les trois lignes « EXEMPLE » et ajoutez une ligne par appareil :
   - `Name` : nom de l'appareil ; `Regular price` : prix normal en FCFA (sans espace) ; `Sale price` : prix promo (facultatif) ;
   - `Categories` : `Électroménager & électronique > Mixeurs & blenders` (le nom de la sous-catégorie après `>`) ;
   - `Images` : adresse(s) web des photos, séparées par des virgules ;
   - `Published` : `1` pour publier tout de suite, `0` pour garder en brouillon ;
   - `Is featured?` : `1` pour mettre l'appareil en avant sur l'accueil ;
   - `Stock` : quantité disponible (laisser vide si le stock n'est pas suivi).
3. Enregistrez au format **CSV UTF-8**.
4. Dans WordPress : **Produits › Importer**, choisissez le fichier, cliquez sur « Continuer » ; les colonnes sont
   reconnues automatiquement. Lancez l'importation.

Les produits importés par l'administrateur sont vendus par Tondraaga. Les appareils d'un vendeur doivent être
ajoutés depuis son espace vendeur (ou réattribués à ce vendeur dans la fiche produit).
