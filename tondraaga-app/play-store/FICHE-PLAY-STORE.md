# Fiche Google Play — Tondraaga

Textes et réponses à copier dans la Play Console (play.google.com/console).

## Fichiers à envoyer

| Élément | Fichier | Format demandé par Google |
| --- | --- | --- |
| Application | `../dist/Tondraaga-1.2.aab` | App Bundle signé avec la clé d'importation |
| Icône | `icone-512x512.png` | 512 × 512 px, PNG |
| Image de présentation | `banniere-1024x500.png` | 1024 × 500 px |
| Captures d'écran (téléphone) | `captures/*.png` | 2 à 8 images, 1080 × 1920 px environ |

## Fiche principale

**Nom de l'application** (30 caractères max)
Tondraaga – Marché du Faso

**Description courte** (80 caractères max)
Courses, artisanat du Burkina et colis livrés dans le monde entier.

**Description complète**

Tondraaga, c'est le marché du Burkina Faso dans votre poche. Notre marché, notre fierté.

🛒 COURSES POUR VOS PROCHES
Où que vous soyez, faites les courses de votre famille à Ouagadougou : riz, huile, produits frais, hygiène, paniers prêts. Nous achetons, préparons et livrons en 24 à 48 h. Votre proche est prévenu, vous suivez la livraison.

🎨 ARTISANAT ET PRODUITS MADE IN BURKINA
Faso Dan Fani, beurre de karité, soumbala, mangue séchée, kinkeliba, bronze, vannerie, bijoux… Des produits authentiques d'artisans, de coopératives et de producteurs burkinabè, expédiés en Afrique, en Europe et en Amérique.

📦 ENVOI DE COLIS
Expédiez vos colis du Burkina vers l'Afrique, l'Europe et l'Amérique. Prix au kilo affiché à l'avance (5 000 FCFA vers l'Afrique, 10 000 FCFA vers l'Europe et l'Amérique), code de suivi envoyé par e-mail.

💳 PAIEMENT SIMPLE
Payez par Orange Money ou Wave. Notre équipe vérifie chaque paiement et vous envoie un reçu par e-mail.

🏪 VENDEZ VOS CRÉATIONS
Artisans et producteurs : ouvrez votre boutique gratuitement. Deux formules : sans abonnement (15 % de commission par vente) ou abonnement annuel de 15 000 FCFA (8 % de commission pendant un an).

📞 UN VRAI SERVICE CLIENT
Une question ? Écrivez-nous sur WhatsApp au +226 75 55 26 61.

Tondraaga SARL — RCCM BF-OUA-01-2025-B13-15473 — Ouagadougou, Burkina Faso.

**Catégorie** : Shopping
**Adresse e-mail** : tondraaga@gmail.com
**Téléphone** : +226 75 55 26 61
**Site web** : https://boutique.visionaryentreprises.com/
**Règles de confidentialité** : https://boutique.visionaryentreprises.com/politique-de-confidentialite/

> ⚠️ Vérifiez que la page « Politique de confidentialité » décrit bien les données utilisées par l'application
> (voir la section « Sécurité des données » ci-dessous) : Google la lit pendant l'examen.

## Contenu de l'application (questionnaires)

**Accès à l'application** : toutes les fonctionnalités sont accessibles sans identifiants particuliers
(l'espace vendeur demande un compte, que chacun peut créer).

**Annonces** : non, l'application ne contient pas d'annonces.

**Classification du contenu** : catégorie « Achats / Shopping » ; pas de violence, de contenu sexuel, de langage
grossier, de drogue ni de jeux d'argent. L'application permet des achats de biens réels et l'échange de messages
avec l'équipe (WhatsApp, e-mail).

**Public cible** : 18 ans et plus.

**Application d'actualités** : non. **Application gouvernementale** : non. **Fonctionnalités financières** : non
(les paiements Orange Money / Wave se font dans les applications de ces opérateurs).

**Santé** : non.

## Sécurité des données

Réponses à donner (à confirmer avec votre politique de confidentialité) :

- Les données sont **chiffrées en transit** : oui (HTTPS uniquement).
- Les utilisateurs peuvent **demander la suppression** de leurs données : oui, par e-mail ou WhatsApp.
- **Données collectées** (toutes « nécessaires au fonctionnement de l'application », pour « gestion du compte »
  et « fonctionnalités de l'application », non partagées à des fins publicitaires) :
  - Informations personnelles : nom, adresse e-mail, numéro de téléphone, adresse (livraison).
  - Informations financières : historique d'achats ; captures des preuves de paiement (pas de numéro de carte).
  - Position : position approximative et précise, **facultative**, pour calculer le prix de la livraison sur la carte.
  - Photos et fichiers : la preuve de paiement choisie par l'utilisateur.
  - Messages : messages envoyés au service client.
- **Données partagées** : avec les vendeurs de la place de marché (nom, téléphone et adresse de livraison du client,
  pour préparer la commande) et avec le livreur.

## Remarques

- **Compte développeur** : 25 $ US, une seule fois. Un compte « organisation » (Tondraaga SARL, numéro D-U-N-S
  gratuit à demander) évite l'obligation des comptes personnels récents : un test fermé avec au moins
  12 testeurs pendant 14 jours avant la publication.
- **Signature** : la clé `tondraaga-release.p12` sert de « clé d'importation ». Google signe ensuite l'application
  avec sa propre clé (« signature d'application par Google Play »). Les personnes qui ont installé le fichier APK
  partagé par WhatsApp devront le désinstaller avant d'installer la version du Play Store.
- **Applications « site web »** : Google refuse parfois les applications qui ne font qu'afficher un site. Tondraaga
  apporte des fonctions d'application (écran de démarrage animé, page hors connexion, envoi de fichiers, position,
  liens WhatsApp et téléphone), mais un refus pour « fonctionnalités minimales » reste possible ; il faudrait alors
  ajouter des fonctions propres à l'application (notifications de suivi de commande, par exemple).
