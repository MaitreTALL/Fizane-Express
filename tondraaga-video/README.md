# Tondraaga — vidéos motion design (9:16)

Vidéos promotionnelles de la boutique **boutique.visionaryentreprises.com**, 1080 × 1920, 30 images/s, toutes deux produites par
le même moteur (`src/long.html`, `src/long.js`, `src/intro.js`) :

- **version longue** (≈ 85 s) sur le balafon sénoufo : `src/long.html` ;
- **version courte** (≈ 44 s), plus rythmée, sur la flûte fournie par Tondraaga : `src/long.html?plan=court`.

## Fichiers livrés

- `dist/tondraaga-boutique-long.mp4` (+ `-whatsapp.mp4`, 720 × 1280) : version longue.
- `dist/tondraaga-boutique-court.mp4` (+ `-whatsapp.mp4`) : version courte, sur la flûte jouée par l'auteur de Tondraaga
  (`audio/flute.wav`).

H.264, AAC 48 kHz, volume calé à −14 LUFS (TikTok, Reels, Shorts, statut WhatsApp).

## Version courte (≈ 44 s, flûte)

La flûte (jeu libre) est posée sur un groove de percussions d'Afrique de l'Ouest synthétisé à 104 battements par minute
(djembé, dundun, cloche, shaker) : chaque scène dure une mesure (≈ 2,3 s), d'où le rythme rapide.

| Temps | Scène |
| --- | --- |
| 0 – 6,5 s | Entrée du logo : la femme au panier devient le « g » |
| 6,5 – 8,8 s | Courses pour mes proches |
| 8,8 – 11,1 s | « D'où passez-vous commande ? » (27 pays) |
| 11,1 – 13,4 s | La boutique des artisans (carrousel 3D) |
| 13,4 – 27,2 s | Terroir : Faso Dan Fani · Koko Dunda · Miel · Céréales · Thé & kinkeliba · Produits locaux |
| 27,2 – 30,7 s | Colis : carte du monde, prix au kilo |
| 30,7 – 35,3 s | Paiement en 3D : Orange Money, Moov Money, Wave, Visa ; Google Play |
| 35,3 – 38,8 s | Vendeurs : les deux formules |
| 38,8 – 44 s | Fin : logo, adresse, Google Play, WhatsApp |

## Chapitre terroir (les deux versions)

| Scène | Animation | Images |
| --- | --- | --- |
| 01 Faso Dan Fani | sept bandes tissées fil à fil, navette, puis la vraie bande de Faso Dan Fani | photo CC0 |
| 02 Koko Dunda | taches de teinture qui s'épanouissent avec leurs réserves blanches ; photos Pli, Teinture, Pagne | 3 photos CC0 prises au Burkina |
| 03 Miel | alvéoles hexagonales qui se dessinent, coulures de miel, pot de miel dans un hexagone | photo CC0 |
| 04 Céréales | pluie de grains ; médaillons Maïs, Fonio, Sorgho, Mil | photos CC0 |
| 05 Thé & kinkeliba | illustration : la théière verse de haut dans le verre, la mousse se forme, feuilles de kinkeliba qui tombent | illustration + texture CC0 |
| 06 Produits locaux | mosaïque : beurre de karité, bissap, pain de singe, gingembre, sésame, soumbala (néré) | photos CC0 / domaine public |

Sources et licences : `src/assets/terroir/SOURCES.md`. Intitulés tirés des catégories du site (Textiles & mode africaine,
Pagnes & tissus, Miel & produits de la ruche, Céréales & farines, Tisanes & infusions, Épices & condiments, Fruits séchés).

## Paiement en 3D

Orange Money, Moov Money et Wave sont des jetons épais (tranche à la couleur de chaque marque, reflet qui suit la rotation),
Visa une vraie carte bancaire (bleu Visa, puce, sans contact, numéro masqué, logo blanc). Ils tournent en orbite autour du
téléphone, sur deux anneaux dorés centrés sur lui : le téléphone et l'orbite partagent le même espace 3D (`#espace7`), si bien
que les jetons et l'arrière des anneaux passent réellement derrière le téléphone. Ombres au sol, noms sur pastilles sombres
lisibles par-dessus l'écran. Mastercard est retiré.

## Envoi d'un colis (version longue)

Le colis tombe sur la balance de l'agence : le plateau s'enfonce, l'écran compte le poids jusqu'à 2,40 kg ; à l'étape 2 la
fiche d'envoi Tondraaga (OUAGA → PARIS, code-barres, code de suivi) se colle sur le carton, tamponné « Made in Burkina Faso ».

## Voix off

VOIX_PLACEHOLDER

## Entrée du logo (les deux vidéos)

`src/intro.js` : une femme burkinabè du village, en 2D, porte le panier du logo sur la tête ; elle s'accroupit sous son panier
et devient le « g » de Tondraaga. Le logo est reconstruit à partir de ses pièces d'origine, découpées au pixel près par
`tools/decouper_logo.py` (9 lettres, panier en 7 parties, 23 lettres du slogan ; aucune lettre n'est redessinée).

1. Sur fond sombre, des traînées de particules dorées tourbillonnent et convergent vers un point de lumière (montée sonore).
2. Impact sur le premier temps fort : un disque crème s'ouvre, double onde de choc, confettis aux couleurs du drapeau et du logo.
3. Gros plan : la femme (foulard rouge, haut rouge, pagne rayé façon Faso Dan Fani, boucle d'oreille dorée) entre en marchant,
   une main levée sur le panier ; ses pas tombent en rythme, le panier tangue légèrement.
4. Elle s'arrête et s'accroupit, dos droit, pieds à plat ; le panier grandit jusqu'à sa taille dans le logo.
5. Sa silhouette devient ocre et se change en « g », dans une gerbe d'étincelles ; les produits sautillent dans le panier.
6. La caméra recule : les autres lettres se lèvent une à une autour d'elle, le ruban du site (pagne « aux hirondelles ») glisse
   en haut et en bas, le slogan « Notre marché, notre fierté » s'écrit lettre par lettre.
7. Un reflet balaie le logo, puis le tampon rond « Made in Burkina » du site se pose et tourne.

Version longue : de 0 à 7,3 s (trois mesures du balafon). Version courte : de 0 à 6,5 s. Le panier porté est à taille réelle (34 % de sa taille dans le logo) et ne grandit qu'au moment où elle s'accroupit.

## Version longue (≈ 85 s, balafon)

Musique : **« Le son de balafon sénoufo »**, **KONE IF** (festival Porlahla 2026, Kouto), Wikimedia Commons, licence **CC BY 4.0**.
Pour dépasser la minute, `tools/musique_longue.py` reprend dix mesures (16 à 25) avec un raccord sur un temps fort.
Crédit en bas de l'écran final, à recopier dans la description des publications :

> Musique : « Le son de balafon sénoufo », KONE IF (festival Porlahla 2026), CC BY 4.0, via Wikimedia Commons.

| Temps | Scène |
| --- | --- |
| 0 – 7,3 s | Entrée du logo avec la femme au panier |
| 7,3 – 11,5 s | Diaspora : Paris, Lyon, New York, Atlanta reliées au Burkina |
| 11,5 – 15,8 s | Trois services sur une seule plateforme |
| 15,8 – 19,8 s | Courses pour mes proches |
| 19,8 – 23,7 s | « D'où passez-vous commande ? » (27 pays) |
| 23,7 – 27,6 s | Comment ça marche (5 étapes) |
| 27,6 – 31,5 s | Livraison suivie (livreur à moto sur le plan) |
| 31,5 – 35,4 s | La boutique des artisans |
| 35,4 – 58,5 s | Terroir : Faso Dan Fani · Koko Dunda · Miel · Céréales · Thé & kinkeliba · Produits locaux |
| 58,5 – 64,2 s | Colis : carte du monde avec le Burkina aux couleurs du drapeau, prix au kilo |
| 64,2 – 68,0 s | Envoi d'un colis en 3 étapes |
| 68,0 – 73,8 s | Paiement en 3D et application Google Play |
| 73,8 – 79,5 s | Vendeurs : les deux formules |
| 79,5 – 84,6 s | Fin |

```bash
python3 tools/musique_longue.py src/assets/musique/balafon-senoufo-KONE-IF-CC-BY-4.0.ogg audio/balafon-long.wav src/assets/temps.js src/assets/temps-long.js
PAGE=long.html node tools/render.cjs cues out/cues-long.json
python3 tools/make_audio_long.py out/cues-long.json audio/mix-long.wav 84.6 audio/balafon-long.wav
PAGE=long.html node tools/render.cjs segment out/seg-L/seg_0000.mp4 0 846         # puis 846-1692 et 1692-2538
tools/assemble.sh out/seg-L dist tondraaga-boutique-long audio/mix-long.wav

# version courte (flûte : audio/flute.wav)
PAGE='long.html?plan=court' node tools/render.cjs cues out/cues-court.json
python3 tools/make_audio_court.py out/cues-court.json audio/flute.wav audio/mix-court.wav 44
PAGE='long.html?plan=court' node tools/render.cjs segment out/seg-C/seg_0000.mp4 0 440   # puis 440-880 et 880-1320
tools/assemble.sh out/seg-C dist tondraaga-boutique-court audio/mix-court.wav
```

## Fabrication

L'animation est une page HTML/CSS 3D (`src/index.html`) pilotée image par image par `window.renderAt(t)`.

```bash
node tools/render.cjs cues out/cues.json                  # repères des effets sonores
python3 tools/make_audio.py out/cues.json audio/mix.wav   # musique + effets synthétisés
node tools/render.cjs segment out/seg/seg_000.mp4 0 150   # rendu (Chromium sans écran → ffmpeg)
node tools/render.cjs segment out/seg/seg_150.mp4 150 300
node tools/render.cjs segment out/seg/seg_300.mp4 300 450
tools/assemble.sh out/seg dist                            # montage et encodage
```

La musique et les effets sont synthétisés par `tools/make_audio.py` (aucun son extrait d'une œuvre protégée) : groove afro-pop (log drum, balafon, shaker), calé sur les moments forts de l'image.

Sources des images : voir `src/assets/SOURCES.md` (photos, logos, carte du monde). Les écrans du téléphone sont des captures du site prises au format exact de l'écran (360 × 719 points, × 3).
