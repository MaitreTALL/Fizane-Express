# Tondraaga — vidéos motion design (9:16)

Vidéos promotionnelles de la boutique **boutique.visionaryentreprises.com**, 1080 × 1920, 30 images/s : une version courte de 15 secondes (`src/index.html`) et une version longue d'environ 1 minute (`src/long.html`).

## Fichiers livrés

- `dist/tondraaga-boutique.mp4` : version principale (H.264, AAC 48 kHz, volume calé à −14 LUFS pour les réseaux sociaux : TikTok, Reels, Shorts, statut WhatsApp).
- `dist/tondraaga-boutique-whatsapp.mp4` : version légère 720 × 1280 pour l'envoi par WhatsApp.
- `dist/tondraaga-boutique-long.mp4` et `dist/tondraaga-boutique-long-whatsapp.mp4` : version longue (≈ 65 s) avec le balafon.

## Déroulé

| Temps | Partie | À l'écran | Son |
| --- | --- | --- | --- |
| 0 – 3 s | Introduction | Entrée du logo (voir ci-dessous) | Montée, impact à 0,6 s, chute du panier, scintillement, tampon |
| 3 – 8 s | Développement | Courses pour mes proches → carrousel 3D des produits d'artisans et catégories → carte du monde : gros plan sur le Burkina Faso aux couleurs du drapeau, zoom arrière, routes vers l'Afrique, l'Europe et l'Amérique, prix du kilo | Drop à 3 s, souffles aux transitions, coup sourd quand le Burkina se pose, pops sur les étiquettes |
| 8 – 12 s | Mise en valeur | Téléphone Android en 3D avec les vraies pages du site (accueil, boutique, colis) qui défilent, logos Orange Money, Moov Money, Wave, Visa et Mastercard, « Disponible sur le site et en application » + badge Google Play | Impact à 8,1 s, pops, glissements de page, scintillement |
| 12 – 15 s | Conclusion | Logo, « Made in Burkina », « Disponible sur le site et en application », adresse du site, badge Google Play, WhatsApp | Impact à 12,2 s, accord final et fondu |

Tous les textes, prix, logos et captures viennent du site Tondraaga ou des informations données par Tondraaga ; rien n'a été inventé. Couleurs : celles de la marque (brun, ocre, crème, touches de jaune), le drapeau du Burkina Faso et le ruban « pagne aux hirondelles » de l'en-tête du site.

## Textes (pour CapCut, si besoin de les refaire)

Les textes sont rendus nets dans la vidéo. Pour les modifier ou les traduire dans CapCut, les voici avec leurs temps d'apparition :

| De | À | Texte |
| --- | --- | --- |
| 1,55 s | 3,0 s | Made in Burkina |
| 3,1 s | 4,2 s | Courses pour mes proches |
| 3,2 s | 4,2 s | Nourrissez la famille, où que vous soyez dans le monde |
| 3,6 s | 4,2 s | Livrés en 24 à 48 h à Ouagadougou |
| 4,4 s | 5,9 s | Boutique · Made in Burkina — La boutique des artisans |
| 5,0 s | 5,9 s | Textiles & mode africaine · Karité & cosmétiques · Artisanat & décoration · Bijoux & accessoires |
| 6,0 s | 8,0 s | Colis — Du Burkina vers le monde entier |
| 6,1 s | 8,0 s | Burkina Faso (sur la carte) ; Amérique, Europe, Afrique (7,2 s) |
| 7,3 s | 8,0 s | Afrique · 5 000 FCFA le kilo — Europe et Amérique · 10 000 FCFA le kilo |
| 8,9 s | 12,0 s | Payez par carte bancaire ou Mobile Money |
| 9,1 s | 12,0 s | Orange Money · Wave · Moov Money · Mastercard · Visa |
| 10,3 s | 12,0 s | Disponible sur le site et en application (+ badge Google Play) |
| 12,75 s | 15 s | Disponible sur le site et en application |
| 12,85 s | 15 s | boutique.visionaryentreprises.com |
| 13,2 s | 15 s | Badge « Disponible sur Google Play » |
| 13,5 s | 15 s | WhatsApp +226 75 55 26 61 |

Police : Poppins (gras / extra-gras), libre et disponible dans CapCut.

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

Version longue : de 0 à 7,3 s (trois mesures du balafon). Version courte : la même entrée en accéléré, de 0 à 3,1 s.

## Version longue (≈ 65 s) — `src/long.html`

Présentation détaillée de Tondraaga, montée sur une vraie musique d'Afrique de l'Ouest :
**« Le son de balafon sénoufo »**, enregistrée par **KONE IF** au festival Porlahla 2026 (Kouto, pays sénoufo),
publiée sur Wikimedia Commons sous licence **CC BY 4.0** (utilisation commerciale autorisée en citant l'auteur).
Le crédit figure en bas de l'écran final ; à recopier aussi dans la description des publications :

> Musique : « Le son de balafon sénoufo », KONE IF (festival Porlahla 2026), CC BY 4.0, via Wikimedia Commons.

Les changements de scène tombent sur les mesures du balafon (temps forts détectés par `tools/beats.py`, le jeu accélère d'environ 112 à 128 battements par minute).

| Temps | Scène | Contenu (textes du site) |
| --- | --- | --- |
| 0 – 7 s | Ouverture | Entrée du logo avec la femme au panier (voir ci-dessus) |
| 7 – 12 s | Diaspora | Carte : Paris, Lyon, New York, Atlanta reliées au Burkina ; « La place de marché qui relie la diaspora burkinabè à ses familles, à ses artisans et à son pays. » |
| 12 – 16 s | Trois services | La boutique Made in Burkina · Les courses pour vos proches · L'expédition de colis |
| 16 – 20 s | Courses | « Nourrissez la famille… », paniers dès 37 750 FCFA, livrés en 24 à 48 h |
| 20 – 24 s | Pays de commande | « D'où passez-vous commande ? », 27 pays avec leur drapeau, prix en FCFA et équivalent dans votre devise |
| 24 – 28 s | Comment ça marche | 1 Pays · 2 Courses · 3 Bénéficiaire · 4 Livraison · 5 Paiement |
| 28 – 31 s | Livraison suivie | Plan animé, le livreur à moto jusqu'au bénéficiaire, « Suivi en temps réel » |
| 31 – 35 s | Boutique | Carrousel 3D des produits, « Chaque vendeur est vérifié… » |
| 35 – 39 s | Catégories | 6 catégories réelles de la boutique et leurs sous-catégories, « Fierté locale » |
| 39 – 45 s | Colis | Carte du monde : le Burkina aux couleurs du drapeau, routes vers l'Afrique, l'Europe et l'Amérique, prix au kilo |
| 45 – 49 s | Envoi d'un colis | 3 étapes (déclaration en ligne, dépôt en agence, code de suivi TDG-…) |
| 49 – 55 s | Paiement et application | Téléphone Android avec le site ; Orange Money, Moov Money, Wave, Visa, Mastercard ; reçu par e-mail ; Google Play |
| 55 – 60 s | Vendeurs | « Vendez vos créations dans le monde entier », formules sans abonnement (15 %) et abonnement annuel (15 000 FCFA, 8 %) |
| 60 – 65 s | Fin | Logo, adresse du site, Google Play, WhatsApp, crédit musique |

```bash
python3 tools/beats.py musique.wav src/assets/temps.js                     # temps forts de la musique
PAGE=long.html node tools/render.cjs cues out/cues-long.json
python3 tools/make_audio_long.py out/cues-long.json audio/mix-long.wav 65
PAGE=long.html node tools/render.cjs segment out/seg-long/seg_0000.mp4 0 650   # puis 650-1300 et 1300-1950
tools/assemble.sh out/seg-long dist tondraaga-boutique-long audio/mix-long.wav
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
