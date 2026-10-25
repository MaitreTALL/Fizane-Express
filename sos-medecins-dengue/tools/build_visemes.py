"""Mouth shapes for the 2D presenter: one viseme per video frame, from the French
phonemes of each word (espeak) spread over the word's duration, plus the voice
loudness to scale the opening.

Usage: python3 tools/build_visemes.py [fps]
Reads src/timeline.json + audio/voice.wav, writes src/visemes.json.
"""
import json
import re
import sys
import wave
from pathlib import Path

import espeakng_loader
import numpy as np
from phonemizer.backend import EspeakBackend
from phonemizer.backend.espeak.wrapper import EspeakWrapper

ROOT = Path(__file__).resolve().parent.parent
FPS = int(sys.argv[1]) if len(sys.argv) > 1 else 30

EspeakWrapper.set_library(espeakng_loader.get_library_path())
EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
backend = EspeakBackend("fr-fr")

CLASSES = {
    "A": "aɑ", "E": "eɛi", "O": "oɔøœə", "U": "uywɥ",
    "M": "mbp", "F": "fv",
}


def classify(ph):
    base = ph[0]
    for k, chars in CLASSES.items():
        if base in chars:
            return k
    return "L"


def phonemes(ipa):
    out = []
    for ch in ipa.replace(" ", ""):
        if ch in "̃ːˈˌ-" and out:
            out[-1] += ch
        elif ch.strip():
            out.append(ch)
    return out


tl = json.loads((ROOT / "src" / "timeline.json").read_text())
n = int(tl["duration"] * FPS) + 1
vis = ["X"] * n

for line in tl["lines"]:
    words = line["words"]
    clean = [re.sub(r"[^\w'\-àâäéèêëîïôöùûüçœ ]", "", w.get("say", w["w"]).lower()) or "a" for w in words]
    ipas = backend.phonemize(clean, strip=True)
    for i, w in enumerate(words):
        t0 = w["t"]
        t1 = words[i + 1]["t"] if i + 1 < len(words) else line["end"]
        t1 = min(t1, t0 + 0.9)
        phs = phonemes(ipas[i]) or ["a"]
        weights = np.array([1.0 if classify(p) in "AEOU" else 0.6 for p in phs])
        edges = t0 + np.concatenate([[0], np.cumsum(weights)]) / weights.sum() * (t1 - t0)
        for p, a, b in zip(phs, edges, edges[1:]):
            for f in range(int(a * FPS), int(b * FPS) + 1):
                if 0 <= f < n:
                    vis[f] = classify(p)

# loudness per frame
with wave.open(str(ROOT / "audio" / "voice.wav")) as wv:
    sr = wv.getframerate()
    voice = np.frombuffer(wv.readframes(wv.getnframes()), np.int16).astype(np.float32) / 32768
hop = sr // FPS
rms = np.array([np.sqrt(np.mean(voice[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(n)])
amp = np.clip((rms - 0.006) / 0.08, 0, 1) ** 0.65
amp = np.convolve(amp, [0.2, 0.6, 0.2], mode="same")
for f in range(n):
    if amp[f] < 0.05 and vis[f] != "M":
        vis[f] = "X"

(ROOT / "src" / "visemes.json").write_text(json.dumps({"fps": FPS, "vis": "".join(vis), "amp": [round(float(a), 3) for a in amp]}))
counts = {k: vis.count(k) for k in "XAEOUMFL"}
print(f"{n} frames at {FPS} fps, visemes {counts}")
