"""Plan de la vidéo tutoriel, calculé à partir de la voix off : chaque scène dure le temps de sa phrase (arrondi à la
demi-mesure de la flûte, 104 bpm), et chaque phrase commence peu après le début de sa scène.

Écrit src/assets/plan-tuto.js (scènes en mesures, étapes des scènes « téléphone ») et met à jour les instants « t »
de voix/texte-tuto.json (utilisés ensuite par voix_place.py).
Usage : python3 tools/plan_tuto.py
"""
import json
import math
import wave
from pathlib import Path

import numpy as np

RACINE = Path(__file__).resolve().parent.parent
TEXTE = RACINE / "voix" / "texte-tuto.json"
PHRASES = RACINE / "voix" / "sortie-gemini" / "tuto"
MESURE = 4 * 60 / 104
M0 = 0.70                               # premier temps fort de la grille
DEMI = MESURE / 2
AVANT, APRES = .35, .55                 # la phrase commence 0,35 s après le début de la scène, et respire 0,55 s à la fin


def parole(k):
    w = wave.open(str(PHRASES / f"l{k:02d}.wav"))
    x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32768
    e = np.convolve(np.abs(x), np.ones(240) / 240, "same"); v = np.where(e > e.max() * .03)[0]
    return (v[-1] - v[0]) / w.getframerate()


d = json.loads(TEXTE.read_text())
lignes = d["lignes"]
# scènes dans l'ordre, avec leurs phrases (tu1-1, tu1-2… forment une seule scène « téléphone » en plusieurs étapes)
ordre, groupes = [], {}
for k, l in enumerate(lignes):
    sc = l["scene"].split("-")[0]
    if sc not in groupes:
        groupes[sc] = []; ordre.append(sc)
    groupes[sc].append(k)

TRANS = {"s1": ("", "zoom"), "s3": ("zoom", "droite"), "tu1": ("droite", "haut"), "s4d": ("haut", "zoom"), "s5a": ("zoom", "droite"),
         "s6b": ("droite", "haut"), "tu2": ("haut", "zoom"), "eco": ("zoom", "droite"), "s7": ("droite", "zoom"), "s9": ("cercle", "")}
scenes, etapes, mesure = [], {}, 0.0
for sc in ordre:
    debut = mesure
    t_scene = M0 + debut * MESURE
    if sc == "s1":
        fin = 2.5                                    # l'ouverture du logo garde sa durée ; la phrase arrive avec le nom
        lignes[groupes[sc][0]]["t"] = 3.1
    else:
        t = t_scene + AVANT
        bornes = []
        for k in groupes[sc]:
            lignes[k]["t"] = round(t, 2)
            dur = parole(k)
            # chaque étape dure un nombre entier de demi-mesures
            n = math.ceil((AVANT + dur + APRES) / DEMI)
            bornes.append(round(t - AVANT - t_scene, 2))
            t = t - AVANT + n * DEMI + AVANT
        fin = debut + (t - AVANT - t_scene) / MESURE
        if len(groupes[sc]) > 1:
            etapes[sc] = bornes
    if sc == "s9":
        fin = None
    scenes.append([sc, round(debut, 3), None if fin is None else round(fin, 3), *TRANS[sc]])
    mesure = fin if fin is not None else mesure
duree = round(lignes[-1]["t"] + parole(len(lignes) - 1) + 2.2, 2)
TEXTE.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
(RACINE / "src" / "assets" / "plan-tuto.js").write_text(
    "// Plan de la vidéo tutoriel, calculé par tools/plan_tuto.py à partir de la voix off (mesures de 4 temps à 104 bpm).\n"
    f"window.PLAN_TUTO = {json.dumps({'duree': duree, 'scenes': scenes, 'etapes': etapes}, ensure_ascii=False)};\n")
for s in scenes:
    print(f"{s[0]:4s} mesures {s[1]:6.2f} → {s[2] if s[2] is not None else 'fin':>6}   {M0 + s[1] * MESURE:6.2f} s")
print("étapes :", etapes)
print("durée :", duree, "s")
