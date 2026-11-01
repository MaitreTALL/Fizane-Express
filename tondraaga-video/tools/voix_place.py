"""Place les phrases de la voix off (un fichier audio par phrase, par exemple produites par elevenlabs.py) à leur
instant dans la vidéo, en les accélérant légèrement si une phrase déborde sur la suivante, puis applique un traitement
de voix léger (coupe-bas, chaleur, présence, compression douce).

Usage : python3 tools/voix_place.py <texte.json> <dossier des phrases (l00.mp3…)> <sortie.wav> <durée>
Écrit aussi <sortie>.json (début et fin réels de chaque phrase).
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

texte, dossier, sortie, duree = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3]), float(sys.argv[4])
SR = 48000
ACCEL_MAX = 1.12


def charger(chemin, filtre=None):
    cmd = ["ffmpeg", "-v", "error", "-i", str(chemin)] + (["-af", filtre] if filtre else []) + ["-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, check=True, capture_output=True).stdout, np.float32).astype(np.float64)


lignes = json.loads(Path(texte).read_text())["lignes"]
fichiers = sorted(dossier.glob("l*.mp3"))
assert len(fichiers) == len(lignes), f"{len(fichiers)} fichiers pour {len(lignes)} phrases"
piste = np.zeros(int(duree * SR))
rapport = []
for i, (l, f) in enumerate(zip(lignes, fichiers)):
    y = charger(f)
    e = np.convolve(np.abs(y), np.ones(480) / 480, "same"); v = np.where(e > e.max() * .02)[0]
    y = y[max(0, v[0] - 960): v[-1] + 2400]
    place = (lignes[i + 1]["t"] if i + 1 < len(lignes) else duree) - .12 - l["t"]
    if len(y) / SR > place:
        k = min(ACCEL_MAX, len(y) / SR / place)
        y = charger(f, f"atempo={k:.4f}")
        e = np.convolve(np.abs(y), np.ones(480) / 480, "same"); v = np.where(e > e.max() * .02)[0]
        y = y[max(0, v[0] - 960): v[-1] + 2400]
        if len(y) / SR > place + .05:
            print(f"  ! {l['t']:.2f} : la phrase dépasse de {len(y) / SR - place:.2f} s (fondu en sortie)")
    n0 = int(l["t"] * SR)
    y = y[: max(0, min(len(piste) - n0, int((place + .1) * SR)))]
    m = min(480, len(y) // 4); fen = np.ones(len(y)); fen[:m] = np.linspace(0, 1, m); fen[-m:] = np.linspace(1, 0, m)
    piste[n0:n0 + len(y)] += y * fen
    rapport.append({"t": l["t"], "fin": round(l["t"] + len(y) / SR, 2), "texte": l["texte"]})
    print(f"{l['t']:6.2f} → {l['t'] + len(y) / SR:6.2f} s  {l['texte']}")


def filtre(x, f, t, o=2): return sosfilt(butter(o, f, t, fs=SR, output="sos"), x)


v = filtre(piste, 70, "high", 3)
v = v + .18 * filtre(v, 160, "low")                                                 # un peu de poitrine
v = v + .12 * sosfilt(butter(2, [2800, 5000], "band", fs=SR, output="sos"), v)      # présence
env = np.sqrt(np.convolve(v ** 2, np.ones(960) / 960, "same")) + 1e-6
seuil = np.percentile(env[env > env.max() * .05], 70)
gain = np.convolve(np.where(env > seuil, (seuil / env) ** .35, 1.0), np.ones(480) / 480, "same")
v = v * gain
v = v / (np.abs(v).max() + 1e-9) * .89
with wave.open(str(sortie), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.stack([v, v], axis=1) * 32767).astype("<i2").tobytes())
Path(str(sortie) + ".json").write_text(json.dumps(rapport, ensure_ascii=False, indent=1))
print(f"→ {sortie}")
