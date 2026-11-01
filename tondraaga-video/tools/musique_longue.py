"""Prolonge le balafon pour la vidéo longue : reprise de 10 mesures (mesures 16 à 25), raccord sur un temps fort.

Le jeu est régulier dans cette partie (≈ 124-125 battements par minute) : on enchaîne la fin de la mesure 25
sur le début de la mesure 16 avec un fondu enchaîné très court (40 ms), puis l'enregistrement continue jusqu'au bout.
Écrit le WAV monté et la liste des battements correspondante (src/assets/temps-long.js).

Usage : python3 tools/musique_longue.py <musique.ogg> <sortie.wav> <temps.js d'origine> <temps-long.js>
"""
import json
import re
import subprocess
import sys
import wave

import numpy as np

src, out, temps_src, temps_out = sys.argv[1:5]
SR = 48000
brut = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "2", "-ar", str(SR), "-f", "s16le", "-"], check=True, capture_output=True).stdout
x = np.frombuffer(brut, "<i2").reshape(-1, 2).astype(np.float64)

bat = json.loads(re.search(r"\[.*\]", open(temps_src).read()).group(0))
mesures = bat[1::4]
A, B = mesures[16], mesures[26]          # reprise des mesures 16 à 25
DUREE_REPRISE = B - A
ia, ib = int(A * SR), int(B * SR)
X = int(0.04 * SR)                        # fondu enchaîné
f = np.linspace(0, 1, X)[:, None]
debut = x[:ib].copy()
suite = x[ia:].copy()
debut[-X:] = debut[-X:] * (1 - f) + suite[:X] * f
y = np.vstack([debut, suite[X:]])
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(np.clip(y, -32768, 32767).astype("<i2").tobytes())

nouv = [b for b in bat if b < B - .02] + [round(b + DUREE_REPRISE, 3) for b in bat if b >= A - .02]
with open(temps_out, "w") as fh:
    fh.write("// Temps forts du balafon prolongé (tools/musique_longue.py) : reprise des mesures 16 à 25\n")
    fh.write("window.BATTEMENTS = " + json.dumps(nouv) + ";\n")
print(f"{out} : {len(y) / SR:.2f} s (reprise de {DUREE_REPRISE:.2f} s à {B:.2f} s) ; {len(nouv)} battements")
