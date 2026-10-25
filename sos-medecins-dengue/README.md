# SOS Médecins Burkina Faso — Ensemble contre la dengue !

Vidéo de sensibilisation 3D, format vertical 9:16 (1080 × 1920, 25 i/s), pour Facebook Reels, Instagram, TikTok et WhatsApp.

## Livrables (`dist/`)

Trois versions, avec la même voix, la même musique et le même minutage :

| Fichier | Contenu |
| --- | --- |
| `sos-medecins-bf-dengue-motion.mp4` | **Version motion design 2D (recommandée)** : une médecin de SOS Médecins présente face caméra, bouche synchronisée sur la voix ; chaque pictogramme, mot-clé ou illustration apparaît sur le mot qui le nomme |
| `sos-medecins-bf-dengue-3d.mp4` | **Version 3D animée** : la mascotte parle (bec synchronisé), fait des gestes et joue dans des décors 3D |
| `sos-medecins-bf-dengue-planche.mp4` | **Version « planche animée »** : les vignettes de la planche de référence, agrandies par IA, avec caméra 2,5D en relief et zooms synchronisés sur la voix |
| `*-whatsapp.mp4` | Les mêmes vidéos en 720 × 1280, plus légères pour WhatsApp |
| `sos-medecins-bf-dengue.srt` | Sous-titres seuls (pour un import sur Facebook ou YouTube) |
| `kit-video-ia.md` | Consignes plan par plan pour animer les personnages de la planche avec un outil vidéo IA |

## Déroulé

| Scène | Contenu | Textes à l'écran |
| --- | --- | --- |
| 1 | Quartier sous la pluie, récipients d'eau stagnante, moustiques ; la mascotte parle face caméra | DENGUE : RESTONS VIGILANTS ! |
| 2 | Le moustique Aedes en grand, la piqûre en médaillon | Moustique Aedes · La dengue se transmet par la piqûre d'un moustique infecté. |
| 3 | Cinq cartes de symptômes, puis les signes de danger | LES SYMPTÔMES DE LA DENGUE · SIGNES DE DANGER · IL FAUT CONSULTER EN URGENCE ! |
| 4 | Concession familiale : les cinq bons gestes, cartes numérotées | LES BONS RÉFLEXES… · MOINS D'EAU STAGNANTE, MOINS DE MOUSTIQUES ! |
| 5 | Devant le centre de santé | DES SYMPTÔMES ? CONSULTEZ RAPIDEMENT. · URGENCE : RENDEZ-VOUS IMMÉDIATEMENT DANS UN CENTRE DE SANTÉ. · Pas d'automédication |
| 6 | La famille et la mascotte, puis la carte finale avec le logo | ENSEMBLE CONTRE LA DENGUE ! · Protégeons notre santé, protégeons notre communauté. · Agir vite, sauver des vies. |

La narration reprend mot pour mot le texte fourni. Aucune statistique, date ou recommandation n'a été ajoutée.
Le logo officiel (`src/logo-sos-medecins-bf.jpg`) est affiché tel quel : jamais redessiné ni déformé, et ses couleurs ne sont pas modifiées.
Le centre de santé porte une croix verte générique : l'emblème de la croix rouge est protégé.

## Fabrication

Tout est généré par programme :

- **Voix** : synthèse vocale française hors ligne [Piper](https://github.com/rhasspy/piper), voix `fr-siwis-medium` (`tools/synth_voice.py`).
- **Minutage** : `tools/build_timeline.py` place les phrases, calcule les sous-titres, le minutage des mots et l'ouverture du bec (synchronisation labiale) → `src/timeline.json`.
- **Musique et bruitages** : `tools/make_music.py` (balafon, nappes, percussions légères, pluie, moustiques, transitions). La musique est atténuée sous la voix. Mixage → `audio/mix.wav`.
- **Motion design 2D** : `src/motion.html` (présentatrice vectorielle animée dans `src/motion/doctor.js`, illustrations dans `src/motion/art.js`, mise en scène dans `src/motion/scenes.js`). La bouche suit les sons du français : `tools/build_visemes.py` phonétise chaque mot (espeak) et produit une forme de bouche par image → `src/visemes.json`.
- **Images 3D** : scène Three.js (`src/index.html`) rendue image par image dans Chromium (`tools/render.cjs`), puis encodée avec ffmpeg.
- **Planche animée** : `tools/planche_prep.py` découpe les vignettes de `src/planche-reference.png`, utilise leur agrandissement Real-ESRGAN (`realesr-animevideov3`, ×4), retire les étiquettes et les logos approximatifs, passe la croix du centre de santé en vert, puis calcule une carte de profondeur (MiDaS small). `src/planche.html` anime le tout (`PAGE=planche.html node tools/render.cjs …`).

```bash
npm install
# 1. voix (binaire piper + modèle fr-siwis-medium)
python3 tools/synth_voice.py <piper> <fr-siwis-medium.onnx> 0.88
python3 tools/build_timeline.py
# 2. bruitages synchronisés sur les apparitions de texte, puis mixage
node tools/render.cjs cues src/cues.json
python3 tools/make_music.py
# 3. images (exemple : vues fixes, puis un segment d'images)
node tools/render.cjs stills out/ 2.5,26,90
node tools/render.cjs segment out/seg_a.mp4 0 2357
tools/assemble.sh out/ dist/ sos-medecins-bf-dengue-3d
# motion design 2D (30 i/s)
python3 tools/build_visemes.py 30
PAGE=motion.html node tools/render.cjs cues src/cues_motion.json
python3 tools/make_music.py src/cues_motion.json audio/mix_motion.wav
PAGE=motion.html node tools/render.cjs segment out-motion/seg_a.mp4 0 2829
tools/assemble.sh out-motion/ dist/ sos-medecins-bf-dengue-motion audio/mix_motion.wav
# planche animée
PAGE=planche.html node tools/render.cjs cues src/cues_planche.json
python3 tools/make_music.py src/cues_planche.json audio/mix_planche.wav
PAGE=planche.html node tools/render.cjs segment out-planche/seg_a.mp4 0 2357
tools/assemble.sh out-planche/ dist/ sos-medecins-bf-dengue-planche audio/mix_planche.wav
```

Pour modifier un texte de la narration, éditer `narration.json` (le champ `tts` sert à corriger la prononciation, par exemple « Aédèsse » pour Aedes), puis relancer les étapes 1 à 3.
