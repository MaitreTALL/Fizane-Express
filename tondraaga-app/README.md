# Tondraaga — application Android

Application Android de la boutique **https://boutique.visionaryentreprises.com/**, à partager directement (WhatsApp, Bluetooth, lien) sans passer par le Play Store.

## Fichier à partager

`dist/Tondraaga-1.0.apk` — Android 7.0 ou plus récent, environ 0,5 Mo.

Installation sur le téléphone :

1. Ouvrir le fichier `Tondraaga-1.0.apk` reçu (WhatsApp, Téléchargements…).
2. Si Android le demande, autoriser l'application qui ouvre le fichier (WhatsApp, Fichiers, Chrome…) à « installer des applications inconnues ».
3. Appuyer sur **Installer**, puis **Ouvrir**. L'icône Tondraaga apparaît avec les autres applications.

Play Protect peut afficher « application inconnue » : c'est normal pour une application installée hors du Play Store. Choisir « Installer quand même ».

## Ce que fait l'application

- Elle ouvre la boutique en plein écran, aux couleurs Tondraaga (barre d'état brune, écran de démarrage avec le logo).
- Les pages du site restent dans l'application. Les liens WhatsApp, téléphone, e-mail et les sites externes s'ouvrent dans l'application correspondante.
- L'envoi de fichiers fonctionne : on peut joindre la preuve de paiement Orange Money ou Wave.
- Si le site demande la position du client pour calculer la livraison, l'application demande l'autorisation de localisation.
- Sans connexion, une page « Pas de connexion internet » propose de réessayer ou d'écrire sur WhatsApp.
- Le bouton retour revient à la page précédente ; sur la page d'accueil, deux appuis ferment l'application.
- Le compte client et le panier restent enregistrés d'une ouverture à l'autre.

Le contenu vient du site : toute modification de la boutique (produits, prix, pages) apparaît dans l'application sans la réinstaller.

## Fabrication

L'application est une enveloppe WebView écrite en Java (`src/com/tondraaga/app/MainActivity.java`), compilée sans Gradle avec les outils du SDK Android :

- `build.sh <build-tools> <android.jar> <dossier de sortie> [versionCode] [versionName]` : aapt2, javac, d8, zipalign → APK non signé.
- `.github/workflows/tondraaga-apk.yml` lance `build.sh` sur GitHub Actions à chaque modification de l'application et enregistre `build/tondraaga-unsigned.apk` dans la branche.
- `tools/SignApk.java` signe l'APK (schéma de signature APK v2) avec la bibliothèque `apksig` de Google, puis vérifie la signature :

```bash
javac -cp apksig-2.3.0.jar -d cls tools/SignApk.java
java --add-exports java.base/sun.security.x509=ALL-UNNAMED \
     --add-exports java.base/sun.security.pkcs=ALL-UNNAMED \
     --add-exports java.base/sun.security.util=ALL-UNNAMED \
     -cp apksig-2.3.0.jar:cls SignApk build/tondraaga-unsigned.apk dist/Tondraaga-1.0.apk \
     tondraaga-release.p12 keystore-password.txt tondraaga
```

## Clé de signature

La clé (`tondraaga-release.p12`) et son mot de passe ne sont **pas** dans ce dépôt, qui est public. Ils sont conservés par le propriétaire de l'application.
Toute mise à jour doit être signée avec cette même clé : sinon Android refuse de l'installer par-dessus l'ancienne version, et il faut désinstaller puis réinstaller (le client perd sa session).

Empreinte SHA-256 du certificat :
`E9:8C:22:81:EF:70:4E:FB:12:6F:3E:22:FD:9F:1A:A5:DA:D1:A6:57:FC:E1:18:F9:15:15:73:4D:A9:36:50:E6`

## Nouvelle version

1. Augmenter `VERSION_CODE` (2, 3…) et modifier `VERSION_NAME` (1.1…).
2. Pousser : GitHub Actions reconstruit `build/tondraaga-unsigned.apk`.
3. Signer avec la même clé, puis partager le nouvel APK : il s'installe par-dessus l'ancien.

Pour publier sur le Play Store, il faudra un compte Google Play Console et un format AAB ; l'application elle-même peut rester la même.
