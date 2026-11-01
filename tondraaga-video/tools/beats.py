"""Détection des temps forts (battements) d'un enregistrement, pour caler le montage sur la musique.

Enveloppe d'attaques (flux spectral), tempo local par autocorrélation sur des fenêtres de 8 s
(le balafon accélère d'environ 112 à 128 battements par minute), puis suivi des battements par
programmation dynamique (méthode d'Ellis, 2007).

Usage : python3 tools/beats.py <musique.wav (48 kHz)> <sortie.js>
"""
import json
import sys
import wave

import numpy as np
from scipy.signal import stft

src, out = sys.argv[1], sys.argv[2]
w = wave.open(src)
x = np.frombuffer(w.readframes(w.getnframes()), "<i2").reshape(-1, w.getnchannels()).astype(np.float32) / 32768
sr = w.getframerate()
m = x.mean(1)

HOP = 480
f, t, Z = stft(m, sr, nperseg=2048, noverlap=2048 - HOP)
S = np.abs(Z)
fps = sr / HOP
on = np.maximum(0, np.diff(np.log1p(S * 100), axis=1)).sum(0)
on = np.convolve(on, np.hanning(5) / np.hanning(5).sum(), "same")
on = (on - on.mean()) / on.std()
N = len(on)

# tempo local
centres, tempos = [], []
W = int(8 * fps)
for a in range(0, N - W, int(2 * fps)):
    seg = on[a:a + W] - on[a:a + W].mean()
    ac = np.correlate(seg, seg, "full")[W - 1:]
    bpm = 60 / (np.arange(1, len(ac)) / fps)
    sel = (bpm > 100) & (bpm < 140)
    centres.append((a + W / 2) / fps)
    tempos.append(bpm[sel][np.argmax(ac[1:][sel])])
lisse = np.convolve(np.pad(tempos, 2, mode="edge"), np.ones(5) / 5, "valid")
periode = 60 / np.interp(np.arange(N) / fps, centres, lisse) * fps

# suivi des battements
alpha = 400
score = on.copy()
prec = -np.ones(N, int)
for i in range(N):
    p = periode[i]
    lo, hi = max(int(i - 2 * p), 0), int(i - p / 2)
    if hi <= lo:
        continue
    taus = np.arange(lo, hi)
    c = score[taus] - alpha * np.log((i - taus) / p) ** 2
    j = np.argmax(c)
    score[i] = on[i] + c[j]
    prec[i] = taus[j]
fin = int(N - periode[-1])
i = fin + np.argmax(score[fin:])
bat = []
while i >= 0:
    bat.append(i)
    i = prec[i]
bat = (np.array(bat[::-1]) / fps).round(3).tolist()

with open(out, "w") as fh:
    fh.write("// Temps forts (battements) de la musique, détectés par tools/beats.py\n")
    fh.write("window.BATTEMENTS = " + json.dumps(bat) + ";\n")
print(f"{len(bat)} battements, de {bat[0]} à {bat[-1]} s ; tempo {lisse[0]:.0f} → {lisse[-1]:.0f} bpm")
