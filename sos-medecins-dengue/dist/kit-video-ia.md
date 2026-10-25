# Kit pour outil de vidéo IA (image → vidéo)

But : animer les personnages de votre planche (la mascotte qui parle et fait des gestes, les moustiques qui volent, la famille qui sourit) avec un outil comme Kling, Runway, Veo ou Hailuo.
Je remonte ensuite les plans générés sur la voix, la musique, les sous-titres, le vrai logo et la carte finale, qui sont déjà prêts.

## Réglages communs

- Image de départ : `src/planche/panelN.jpg` (vignettes nettoyées : sans étiquette « 1/8 » ni logo approximatif).
- Format 9:16, 24 ou 25 images par seconde, durée de 5 ou 10 s selon l'outil.
- Mouvement « léger » ou « subtil » : un mouvement trop fort déforme les textes et les visages.
- Consigne négative, à coller telle quelle : `text changes, new text, letters morphing, logo, watermark, extra fingers, deformed face, flicker, camera shake`
- Gardez les bandeaux de texte immobiles. S'ils se déforment, je les recouvre au montage avec les bandeaux animés de la vidéo.

## Plans

| Plan | Minutage final | Image | Durée | Consigne (en anglais, mieux comprise par les outils) |
| --- | --- | --- | --- | --- |
| 1 | 0 – 12,9 s | `panel1.jpg` | 10 s | Cute 3D cartoon bird doctor in a white lab coat talks to the camera with a reassuring smile, gives a thumbs up, beak moving as if speaking. Light rain falls on a Burkina Faso neighbourhood, ripples on stagnant water in tyres and buckets, a mosquito moves slightly in the round inset. Slow push-in. |
| 2 | 12,9 – 22,3 s | `panel2.jpg` | 10 s | The striped Aedes mosquito hovers, wings beating fast; the bird doctor points at it with a stick and talks; in the round inset the mosquito bites the skin. Gentle camera drift. |
| 3 | 22,3 – 43,4 s | `panel3.jpg` | 10 s ×2 | Subtle motion only: the people in the symptom pictures breathe and wince, the bird doctor points at the pictures and talks. Static text. |
| 4 | 43,4 – 59,3 s | `panel4.jpg` | 10 s | The bird doctor presents the four pictures with open wings and talks; water pours out of the blue bucket; the barrel lid closes. Static text. |
| 5 | 59,3 – 63,8 s | `panel5.jpg` | 5 s | The bird doctor sweeps the yard with a traditional broom, dust rises softly, leaves move in the breeze. |
| 6 | 63,8 – 78,4 s | `panel6.jpg` | 10 s | In front of the health centre, the bird doctor waves towards the entrance and talks; a mother and child walk towards the door. Static sign and text. |
| 7 | 78,4 – 88 s | `panel7.jpg` | 10 s | The bird doctor and a smiling Burkinabè family give thumbs up; the parents smile, the children laugh. Slow pan from the bird to the family. |
| 8 | 88 – 94,3 s | — | — | Carte finale déjà fabriquée : le vrai logo et les bandeaux « Ensemble contre la dengue ! » et « Agir vite, sauver des vies. ». |

## Ensuite

Déposez les clips générés dans la conversation, nommés `plan1.mp4`, `plan2.mp4`, etc. Je les cale sur la voix, je les recadre et je les monte avec les sous-titres, la musique, le logo officiel et la carte finale.
