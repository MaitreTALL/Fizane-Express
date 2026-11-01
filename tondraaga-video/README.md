# Tondraaga — vidéo motion design (9:16)

Vidéo promotionnelle de la boutique **boutique.visionaryentreprises.com**, 15 secondes, 1080 × 1920, 30 images/s.

## Fichiers livrés

- `dist/tondraaga-boutique.mp4` : version principale (H.264, AAC 48 kHz, volume calé à −14 LUFS pour les réseaux sociaux : TikTok, Reels, Shorts, statut WhatsApp).
- `dist/tondraaga-boutique-whatsapp.mp4` : version légère 720 × 1280 pour l'envoi par WhatsApp.

## Déroulé

| Temps | Partie | À l'écran | Son |
| --- | --- | --- | --- |
| 0 – 3 s | Introduction | Halo doré, bandes tissées, carte du logo Tondraaga qui bascule en 3D, reflet, « Made in Burkina » | Montée, impact à 0,6 s, scintillement |
| 3 – 8 s | Développement | Courses pour mes proches (photo, titre mot à mot) → carrousel 3D des produits d'artisans et catégories → globe : routes du Burkina vers l'Afrique, l'Europe et l'Amérique, prix du kilo | Drop à 3 s, souffles aux transitions, pops sur les étiquettes |
| 8 – 12 s | Mise en valeur | Téléphone 3D avec les vraies pages du site (accueil, courses, colis), logos Orange Money et Wave, « Expédition dans le monde entier » | Impact à 8,1 s, pops, glissements de page |
| 12 – 15 s | Conclusion | Logo, « Made in Burkina », adresse du site, « Découvrir la boutique », WhatsApp | Impact à 12,2 s, accord final et fondu |

Tous les textes, prix, logos et captures viennent du site Tondraaga ; rien n'a été inventé. Couleurs : celles de la marque (brun, ocre, crème, touches de jaune).

## Textes (pour CapCut, si besoin de les refaire)

Les textes sont rendus nets dans la vidéo. Pour les modifier ou les traduire dans CapCut, les voici avec leurs temps d'apparition :

| De | À | Texte |
| --- | --- | --- |
| 1,55 s | 3,0 s | Made in Burkina |
| 3,2 s | 4,6 s | Courses pour mes proches |
| 3,3 s | 4,6 s | Nourrissez la famille, où que vous soyez dans le monde |
| 3,85 s | 4,6 s | Livrés en 24 à 48 h à Ouagadougou |
| 4,85 s | 6,5 s | Boutique · Made in Burkina — La boutique des artisans |
| 5,55 s | 6,5 s | Textiles & mode africaine · Karité & cosmétiques · Artisanat & décoration · Bijoux & accessoires |
| 6,6 s | 8,0 s | Colis — Du Burkina vers le monde entier |
| 7,3 s | 8,0 s | Afrique · 5 000 FCFA le kilo — Europe et Amérique · 10 000 FCFA le kilo |
| 9,0 s | 12,0 s | Payez par Orange Money ou Wave |
| 9,7 s | 12,0 s | Expédition dans le monde entier |
| 12,8 s | 15 s | boutique.visionaryentreprises.com |
| 13,15 s | 15 s | Découvrir la boutique |
| 13,45 s | 15 s | WhatsApp +226 75 55 26 61 |

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

Photos : Unsplash (voir `src/assets/photos/SOURCES.md`) ; captures du site : fiche Google Play de l'application (`tondraaga-app/play-store/captures/`).
