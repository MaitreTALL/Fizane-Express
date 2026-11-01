"""Bande son de la vidéo longue : vrai balafon sénoufo + effets discrets calés sur l'image.

Musique : « Le son de balafon sénoufo », KONE IF (festival Porlahla 2026, Kouto), licence CC BY 4.0,
Wikimedia Commons (src/assets/musique/). Elle est seulement nettoyée (filtrage, égalisation douce,
limiteur) et mise en fondu ; le montage de l'image est calé sur ses mesures (tools/beats.py).

Usage : python3 tools/make_audio_long.py <cues.json> <mix.wav> [durée] [musique]
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
cues = json.loads(Path(sys.argv[1]).read_text())
OUT = Path(sys.argv[2])
DUR = float(sys.argv[3]) if len(sys.argv) > 3 else 63.0
N = int(DUR * SR)
rng = np.random.default_rng(5)
MUSIQUE = Path(sys.argv[4]) if len(sys.argv) > 4 else ROOT / "src" / "assets" / "musique" / "balafon-senoufo-KONE-IF-CC-BY-4.0.ogg"


def lp(x, f, o=2):
    return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)


def tt(d):
    return np.arange(int(d * SR)) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def add(buf, t, sig, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], axis=1)
    if i < 0:
        sig, i = sig[-i:], 0
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i:i + len(sig)] += sig * gain


# ---------------------------------------------------------------- musique
brut = subprocess.run(["ffmpeg", "-v", "error", "-i", str(MUSIQUE), "-ac", "2", "-ar", str(SR), "-f", "s16le", "-"],
                      check=True, capture_output=True).stdout
mus = np.frombuffer(brut, "<i2").reshape(-1, 2).astype(np.float64) / 32768
mus = mus[:N]
if len(mus) < N:
    mus = np.vstack([mus, np.zeros((N - len(mus), 2))])
for c in range(2):
    x = hp(mus[:, c], 45, 2)
    x = x + 0.35 * lp(x, 160)          # un peu de chaleur dans le grave des calebasses
    x = x - 0.15 * bp(x, 2500, 4500)    # adoucit la dureté de l'enregistrement de terrain
    mus[:, c] = x
mus /= np.max(np.abs(mus))
t = np.arange(N) / SR
mus *= np.clip(t / 0.5, 0, 1)[:, None]                     # entrée en fondu
mus *= np.clip((DUR - t) / 1.4, 0, 1)[:, None] ** 1.3      # sortie en fondu


# ---------------------------------------------------------------- effets
def montee(d):
    x = tt(d); k = x / d
    n = rng.standard_normal(len(x)); out = np.zeros_like(x)
    for i in range(8):
        a, b = i * len(x) // 8, (i + 1) * len(x) // 8
        lo = 300 + 4000 * (i / 8) ** 1.6
        out[a:b] = bp(n, lo, lo * 2.2)[a:b]
    return (out * .6 + np.sin(2 * np.pi * np.cumsum(180 + 900 * k ** 2) / SR) * .25) * k ** 1.8


def impact(g=1.0, dur=1.6):
    x = tt(dur)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 70 * np.exp(-x * 12)) / SR) * np.exp(-x * 3.2)
    crash = hp(rng.standard_normal(len(x)) * np.exp(-x * 4.5), 2500) * .35 + lp(rng.standard_normal(len(x)) * np.exp(-x * 18), 900) * .6
    return np.tanh((sub * 1.3 + crash) * 1.2) * g


def eclat():
    out = np.zeros(int(.9 * SR))
    for i, n in enumerate([84, 88, 91, 96, 100, 103]):
        x = tt(.6); f = midi(n)
        s = (np.sin(2 * np.pi * f * x) + .3 * np.sin(2 * np.pi * f * 2.76 * x)) * np.exp(-x * 9)
        a = int(i * .05 * SR); out[a:a + len(s)] += s[: len(out) - a] * (.5 - i * .04)
    return out * .45


def souffle(d=.55):
    x = tt(d); n = rng.standard_normal(len(x)); out = np.zeros_like(x)
    for i in range(10):
        a, b = i * len(x) // 10, (i + 1) * len(x) // 10
        c = 400 * 8 ** (i / 9)
        out[a:b] = bp(n, c * .6, min(c * 1.8, 20000))[a:b]
    return out * np.sin(np.pi * np.clip(x / d, 0, 1)) ** 2 * 1.1


def pop():
    x = tt(.12)
    s = np.sin(2 * np.pi * np.cumsum(1100 * np.exp(-x * 28) + 380) / SR) * np.exp(-x * 40)
    return s * .7 + hp(rng.standard_normal(len(x)) * np.exp(-x * 900), 3000) * .15


def tic(f=2200):
    x = tt(.05)
    return np.sin(2 * np.pi * f * x) * np.exp(-x * 120) * .6


def pas():
    x = tt(.16)
    return lp(rng.standard_normal(len(x)) * np.exp(-x * 45), 900) * .9 + np.sin(2 * np.pi * 85 * x) * np.exp(-x * 30) * .5


def glisse():
    x = tt(.32)
    return hp(bp(rng.standard_normal(len(x)), 1500, 7000), 1200) * np.sin(np.pi * x / .32) ** 3 * .5


def tampon():
    x = tt(.5)
    s = np.sin(2 * np.pi * np.cumsum(60 + 120 * np.exp(-x * 30)) / SR) * np.exp(-x * 9)
    s += bp(rng.standard_normal(len(x)), 1200, 6000) * np.exp(-x * 60) * .5
    return np.tanh(s * 1.4)


def fin():
    x = tt(1.4); out = np.zeros(len(x))
    for n in (69, 76, 81, 88):
        out += np.sin(2 * np.pi * midi(n) * x) * np.exp(-x * 2.6) * .18
    return out + np.sin(2 * np.pi * 55 * x) * np.exp(-x * 3) * .5


fx = np.zeros((N, 2))
ducks = []
for c in cues:
    t0, ty = c["t"], c["type"]
    if ty == "montee":
        add(fx, t0, montee(max(.3, c.get("duree", .6))), .5)
    elif ty == "impact":
        add(fx, t0, impact(), .7); ducks.append(t0)
    elif ty == "impact-doux":
        add(fx, t0 + .16, impact(.55, 1.2), .45); ducks.append(t0 + .16)
    elif ty == "eclat":
        add(fx, t0, eclat(), .45, pan=.2)
    elif ty == "souffle":
        add(fx, t0 - .05, souffle(c.get("duree", .55)), .26)
    elif ty == "pop":
        add(fx, t0, pop(), .22, pan=rng.uniform(-.4, .4))
    elif ty == "cascade":
        for i in range(14):
            add(fx, t0 + i * c.get("duree", 1.0) / 14, tic(1800 + 90 * i), .12, pan=rng.uniform(-.6, .6))
    elif ty == "pas":
        add(fx, t0, pas(), .35, pan=.15)
    elif ty == "glisse":
        add(fx, t0, glisse(), .32, pan=-.2)
    elif ty == "tampon":
        add(fx, t0, tampon(), .45)
    elif ty == "fin":
        add(fx, t0, fin(), .45)


def reverb(x, d=1.4, mix=.12):
    xx = tt(d); ir = np.zeros((len(xx), 2))
    for c in range(2):
        ir[:, c] = lp(rng.standard_normal(len(xx)), 6000) * np.exp(-xx * 4.2)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    return x + np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1) * mix * 6


# la musique s'efface un peu sous les impacts
env = np.ones(N)
for d in ducks:
    i = int(d * SR); k = np.arange(int(.6 * SR))
    j = slice(i, min(N, i + len(k)))
    env[j] = np.minimum(env[j], 1 - .3 * np.exp(-k[: j.stop - j.start] / SR * 5))
mix = mus * .8 * env[:, None] + reverb(fx) * .9
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.15) * .89
OUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"{OUT} : {DUR} s, {len(cues)} effets sur le balafon")
