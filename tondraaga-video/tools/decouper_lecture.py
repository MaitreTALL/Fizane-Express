"""Découpe une lecture d'une traite (toutes les phrases à la suite) en un fichier par phrase.

Les coupes se font dans des silences, choisis par programmation dynamique : chaque morceau doit avoir à peu près la
durée attendue d'après la longueur de sa phrase (en lettres), et on préfère les silences longs. Ainsi une pause
au milieu d'une phrase (après « Tondraaga ! ») n'est pas prise pour une fin de phrase.

Usage : python3 tools/decouper_lecture.py <texte.json> <lecture.wav> <dossier de sortie>
"""
import json
import math
import re
import sys
import wave
from pathlib import Path

import numpy as np

texte, lecture, sortie = sys.argv[1], sys.argv[2], Path(sys.argv[3])
lignes = [l["texte"] for l in json.loads(Path(texte).read_text())["lignes"]]
w = wave.open(lecture); SR = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float64) / 32768
pas = SR // 100
env = np.array([np.sqrt((x[i:i + pas] ** 2).mean()) for i in range(0, len(x) - pas, pas)]) + 1e-9
db = 20 * np.log10(env / env.max())
parle = db > -38
i0, i1 = np.argmax(parle), len(parle) - np.argmax(parle[::-1])

# silences candidats (au moins 0,1 s) entre le début et la fin de la parole
sil, d = [], None
for i in range(i0, i1 + 1):
    s = i < i1 and not parle[i]
    if s and d is None: d = i
    if not s and d is not None:
        if i - d >= 10: sil.append(((d + i) // 2, (i - d) / 100))
        d = None
n = len(lignes)
poids = [len(re.findall(r"\w", l)) + 4 + 5 * len(re.findall(r"[,:;]", l)) for l in lignes]   # les virgules sont des pauses
total = (i1 - i0) / 100
attendu = [total * p / sum(poids) for p in poids]
pos = [i0] + [s[0] for s in sil] + [i1]
lon = [0] + [s[1] for s in sil] + [0]
m = len(pos)
INF = float("inf")
# cout[k][j] : meilleur coût en ayant terminé la phrase k au point j
cout = [[INF] * m for _ in range(n + 1)]; prec = [[-1] * m for _ in range(n + 1)]
cout[0][0] = 0
for k in range(1, n + 1):
    for j in range(1, m):
        if k == n and j != m - 1: continue
        if k < n and j == m - 1: continue
        for a in range(j):
            if cout[k - 1][a] == INF: continue
            dur = (pos[j] - pos[a]) / 100 - (lon[a] / 2 if a else 0) - (lon[j] / 2 if j < m - 1 else 0)
            if dur <= .2: continue
            c = cout[k - 1][a] + 4 * math.log(dur / attendu[k - 1]) ** 2 - (.8 * math.log(lon[j] / .1) if j < m - 1 else 0)
            if c < cout[k][j]: cout[k][j], prec[k][j] = c, a
coupes, j = [], m - 1
for k in range(n, 0, -1):
    coupes.append(j); j = prec[k][j]
coupes = [0] + coupes[::-1]
sortie.mkdir(parents=True, exist_ok=True)
for k in range(n):
    a = pos[coupes[k]] if k else max(0, i0 - 5)
    b = pos[coupes[k + 1]] if k < n - 1 else min(len(env), i1 + 25)
    morceau = x[a * pas: b * pas]
    with wave.open(str(sortie / f"l{k:02d}.wav"), "wb") as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes((morceau * 32767).astype("<i2").tobytes())
    print(f"{k:02d} {a / 100:6.2f}–{b / 100:6.2f} s  ({(b - a) / 100:4.1f} s, attendu {attendu[k]:4.1f})  {lignes[k]}")
