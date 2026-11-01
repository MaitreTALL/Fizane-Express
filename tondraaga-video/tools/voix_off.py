"""Voix off africaine : synthèse du texte (Piper), conversion de timbre vers des voix d'hommes du corpus
« African Accented French » (OpenSLR 57, Apache 2.0) avec kNN-VC, traitement de voix et placement à la seconde près.

kNN-VC remplace chaque trame de la voix de synthèse par les trames les plus proches des voix de référence :
on obtient leur timbre et leur couleur d'accent, en gardant le texte et le rythme. Les références mêlent plusieurs
locuteurs, de sorte que la voix obtenue n'imite aucune personne précise.

Usage : python3 tools/voix_off.py <texte.json> <sortie.wav> <durée> <piper> <voix.onnx> <knn-vc> <réf1.ogg> [réf2.ogg …]
Écrit aussi <sortie>.json (début et fin réels de chaque phrase).
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import torch
import torchaudio
from scipy.signal import butter, sosfilt

texte, sortie, duree, piper, modele, depot = sys.argv[1], Path(sys.argv[2]), float(sys.argv[3]), sys.argv[4], sys.argv[5], sys.argv[6]
refs = sys.argv[7:]
SR = 48000
sys.path.insert(0, depot)
from hubconf import knn_vc  # noqa: E402

torch.set_num_threads(4)
vc = knn_vc(pretrained=True, progress=False, prematched=True, device="cpu")


def charger(chemin, sr):
    x, s = torchaudio.load(chemin)
    return torchaudio.functional.resample(x.mean(0, keepdim=True), s, sr)


# ---------------------------------------------------------------- ensemble de correspondance (voix de référence)
morceaux = []
for r in refs:
    x = charger(r, 16000)
    env = torch.nn.functional.avg_pool1d(x.abs().unsqueeze(0), 800, 160).squeeze()
    garde = (env > env.max() * .04).repeat_interleave(160)[: x.shape[1]]
    morceaux.append(x[:, : garde.shape[0]][:, garde])
ref = torch.cat(morceaux, dim=1)
with torch.inference_mode():
    jeu = vc.get_features(ref)
print(f"références : {len(refs)} voix, {ref.shape[1] / 16000:.0f} s de parole")

# ---------------------------------------------------------------- synthèse et conversion, phrase par phrase
lignes = json.loads(Path(texte).read_text())["lignes"]
piste = np.zeros(int(duree * SR))
rapport = []
tmp = Path(tempfile.mkdtemp())
for i, l in enumerate(lignes):
    wav = tmp / f"l{i}.wav"
    subprocess.run([piper, "-m", modele, "-f", str(wav), "--length_scale", str(l.get("lent", 1.04)), "--noise_scale", "0.55", "--noise_w", "0.7", "--sentence_silence", "0.12"],
                   input=l.get("tts", l["texte"]).encode(), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    src = charger(str(wav), 16000)
    with torch.inference_mode():
        y = vc.match(vc.get_features(src), jeu, topk=4).flatten()
    y = torchaudio.functional.resample(y.unsqueeze(0), 16000, SR).squeeze(0).numpy()
    # retire les silences de début et de fin
    e = np.convolve(np.abs(y), np.ones(480) / 480, "same"); v = np.where(e > e.max() * .02)[0]
    y = y[max(0, v[0] - 1200): v[-1] + 2400]
    # tient dans le créneau (jusqu'à la phrase suivante), en accélérant légèrement si besoin
    fin_max = (lignes[i + 1]["t"] if i + 1 < len(lignes) else duree) - .15
    place = fin_max - l["t"]
    if len(y) / SR > place:
        f = min(1.18, len(y) / SR / place)
        a = tmp / f"a{i}.wav"; b = tmp / f"b{i}.wav"
        torchaudio.save(str(a), torch.tensor(y, dtype=torch.float32).unsqueeze(0), SR)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(a), "-filter:a", f"atempo={f:.4f}", str(b)], check=True)
        y = charger(str(b), SR).squeeze(0).numpy()
    n0 = int(l["t"] * SR)
    y = y[: max(0, len(piste) - n0)]
    f = np.ones(len(y)); m = min(240, len(y) // 4); f[:m] = np.linspace(0, 1, m); f[-m:] = np.linspace(1, 0, m)
    piste[n0:n0 + len(y)] += y * f
    rapport.append({"t": l["t"], "fin": round(l["t"] + len(y) / SR, 2), "texte": l["texte"]})
    print(f"{l['t']:6.2f} → {l['t'] + len(y) / SR:6.2f} s  {l['texte']}")


# ---------------------------------------------------------------- traitement de la voix
def filtre(x, f, t, o=2): return sosfilt(butter(o, f, t, fs=SR, output="sos"), x)


v = filtre(piste, 75, "high", 3)
v = v + .4 * filtre(v, 180, "low")                         # chaleur, poitrine
v = v + .25 * sosfilt(butter(2, [2500, 4500], "band", fs=SR, output="sos"), v)   # présence, articulation
s = sosfilt(butter(2, [5500, 9000], "band", fs=SR, output="sos"), v)           # dé-essage léger
v = v - .5 * s * np.clip(np.abs(s) / (np.abs(s).max() + 1e-9) * 3, 0, 1)
# compresseur doux (enveloppe RMS lissée)
env = np.sqrt(np.convolve(v ** 2, np.ones(960) / 960, "same")) + 1e-6
seuil = np.percentile(env[env > env.max() * .05], 60)
gain = np.where(env > seuil, (seuil / env) ** .45, 1.0)
gain = np.convolve(gain, np.ones(480) / 480, "same")
v = v * gain
v = v / (np.abs(v).max() + 1e-9) * .89
stereo = np.stack([v, v], axis=1)
import wave  # noqa: E402
with wave.open(str(sortie), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
Path(str(sortie) + ".json").write_text(json.dumps(rapport, ensure_ascii=False, indent=1))
print(f"→ {sortie}")
