# SOS Médecins Burkina Faso — Ensemble contre la dengue !

Vidéo de sensibilisation 3D, format vertical 9:16 (1080 × 1920, 25 i/s), pour Facebook Reels, Instagram, TikTok et WhatsApp.

## Livrables (`dist/`)

| Fichier | Contenu |
| --- | --- |
| `sos-medecins-bf-dengue.mp4` | Vidéo finale : H.264 + AAC, sous-titres français incrustés, voix, musique |
| `sos-medecins-bf-dengue.srt` | Sous-titres seuls (pour un import sur Facebook ou YouTube) |

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
- **Images** : scène Three.js (`src/`) rendue image par image dans Chromium (`tools/render.cjs`), puis encodée avec ffmpeg.

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
node tools/render.cjs segment out/seg.mp4 0 2357
```

Pour modifier un texte de la narration, éditer `narration.json` (le champ `tts` sert à corriger la prononciation, par exemple « Aédèsse » pour Aedes), puis relancer les étapes 1 à 3.
