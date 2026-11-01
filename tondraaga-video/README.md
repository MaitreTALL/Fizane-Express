# Tondraaga — vidéo motion design (9:16)

Vidéo promotionnelle de la boutique **boutique.visionaryentreprises.com**, 15 secondes, 1080 × 1920, 30 images/s.

## Fichiers livrés

- `dist/tondraaga-boutique.mp4` : version principale (H.264, AAC 48 kHz, volume calé à −14 LUFS pour les réseaux sociaux : TikTok, Reels, Shorts, statut WhatsApp).
- `dist/tondraaga-boutique-whatsapp.mp4` : version légère 720 × 1280 pour l'envoi par WhatsApp.

## Déroulé

| Temps | Partie | À l'écran | Son |
| --- | --- | --- | --- |
| 0 – 3 s | Introduction | Halo doré, bandes tissées, carte du logo Tondraaga qui bascule en 3D, reflet, « Made in Burkina » | Montée, impact à 0,6 s, scintillement |
| 3 – 8 s | Développement | Courses pour mes proches → carrousel 3D des produits d'artisans et catégories → carte du monde : gros plan sur le Burkina Faso aux couleurs du drapeau, zoom arrière, routes vers l'Afrique, l'Europe et l'Amérique, prix du kilo | Drop à 3 s, souffles aux transitions, coup sourd quand le Burkina se pose, pops sur les étiquettes |
| 8 – 12 s | Mise en valeur | Téléphone Android en 3D avec les vraies pages du site (accueil, boutique, colis) qui défilent, logos Orange Money, Moov Money, Wave, Visa et Mastercard, « Disponible sur le site et en application » + badge Google Play | Impact à 8,1 s, pops, glissements de page, scintillement |
| 12 – 15 s | Conclusion | Logo, « Made in Burkina », « Disponible sur le site et en application », adresse du site, badge Google Play, WhatsApp | Impact à 12,2 s, accord final et fondu |

Tous les textes, prix, logos et captures viennent du site Tondraaga ou des informations données par Tondraaga ; rien n'a été inventé. Couleurs : celles de la marque (brun, ocre, crème, touches de jaune) et le drapeau du Burkina Faso.

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
