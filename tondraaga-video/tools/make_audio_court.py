"""Bande son de la version courte (≈ 44 s) : la flûte fournie par Tondraaga, posée sur un groove de percussions.

La flûte (jeu libre, sans tempo fixe) est nettoyée (souffle grave coupé, présence, réverbération douce).
Dessous, un groove de percussions d'Afrique de l'Ouest synthétisé à 104 battements par minute (djembé basse/ton/claqué,
dundun, cloche, shaker, grosse caisse) : la grille donne au montage ses temps forts (premier temps à 0,70 s).
Les percussions ne sont pas accordées, elles ne heurtent pas la justesse naturelle de la flûte.

Usage : python3 tools/make_audio_court.py <cues.json> <flute.wav> <mix.wav> [durée]
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
cues = json.loads(Path(sys.argv[1]).read_text())
FLUTE, OUT = sys.argv[2], Path(sys.argv[3])
DUR = float(sys.argv[4]) if len(sys.argv) > 4 else 44.0
N = int(DUR * SR)
rng = np.random.default_rng(9)
BPM, T0 = 104, 0.70
BEAT = 60 / BPM
PAS16 = BEAT / 4


def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)
def tt(d): return np.arange(int(d * SR)) / SR
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)


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


def reverb(x, d=1.8, mix=.2):
    xx = tt(d); ir = np.zeros((len(xx), 2))
    for c in range(2):
        ir[:, c] = lp(rng.standard_normal(len(xx)), 7000) * np.exp(-xx * 3.2)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    return x + np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1) * mix * 6


# ---------------------------------------------------------------- flûte
brut = subprocess.run(["ffmpeg", "-v", "error", "-i", FLUTE, "-ac", "2", "-ar", str(SR), "-f", "s16le", "-"], check=True, capture_output=True).stdout
fl = np.frombuffer(brut, "<i2").reshape(-1, 2).astype(np.float64) / 32768
fl = fl[: int(44.3 * SR)]
for c in range(2):
    x = hp(fl[:, c], 140, 3)
    x = x + .25 * bp(x, 2200, 5000)          # présence du souffle
    fl[:, c] = x
fl /= np.max(np.abs(fl))
fl *= np.clip((44.3 - np.arange(len(fl)) / SR) / 1.2, 0, 1)[:, None]   # la dernière note s'éteint doucement
flute = np.zeros((N, 2)); flute[: min(N, len(fl))] = fl[:N]
flute = reverb(flute, 2.2, .16)

# ---------------------------------------------------------------- percussions
def djembe_basse():
    x = tt(.32); f = 75 + 40 * np.exp(-x * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 11) + lp(rng.standard_normal(len(x)) * np.exp(-x * 80), 600) * .4
def djembe_ton():
    x = tt(.22); f = 330 * (1 + .08 * np.exp(-x * 60))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 22) + .4 * np.sin(2 * np.pi * np.cumsum(f * 1.59) / SR) * np.exp(-x * 30)
    return s + bp(rng.standard_normal(len(x)) * np.exp(-x * 120), 800, 3000) * .35
def djembe_claque():
    x = tt(.16)
    return bp(rng.standard_normal(len(x)) * np.exp(-x * 55), 900, 6500) * 1.1 + np.sin(2 * np.pi * 520 * x) * np.exp(-x * 60) * .4
def dundun():
    x = tt(.5); f = 58 + 30 * np.exp(-x * 18)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 6) * 1.4)
def cloche():
    x = tt(.25)
    return (np.sin(2 * np.pi * 1180 * x) + .5 * np.sin(2 * np.pi * 2950 * x)) * np.exp(-x * 26) * .5
def shaker(acc):
    x = tt(.08)
    return hp(rng.standard_normal(len(x)) * (1 - np.exp(-x * 400)) * np.exp(-x * 60), 6000, 4) * .3 * acc
def kick():
    x = tt(.4); f = 45 + 95 * np.exp(-x * 30)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 8) * 1.6)


perc = np.zeros((N, 2))
mesure = 4 * BEAT
nb_mesures = int((DUR - T0) / mesure) + 1
# intensité par mesure : entrée légère pendant l'ouverture, groove complet ensuite, respiration sur la carte
def intensite(m):
    t = T0 + m * mesure
    if t < 6.4: return .35 + .3 * (t / 6.4)
    if 27.0 <= t < 29.5: return .6
    return 1.0
for m in range(-1, nb_mesures):
    base = T0 + m * mesure
    I = intensite(max(m, 0)) if m >= 0 else .25
    for s in range(16):
        t = base + s * PAS16 + (.012 if s % 2 else 0)
        if t < 0 or t >= DUR: continue
        add(perc, t, shaker(1.0 if s % 4 == 2 else .55), .55 * min(1, I + .3), pan=.3)
        if s in (0, 3, 6, 8, 11, 14):
            add(perc, t, cloche(), .16 * I, pan=-.35)
        if I >= .55:
            if s in (0, 8): add(perc, t, djembe_basse(), .7 * I, pan=-.1)
            if s in (4, 5, 12, 13): add(perc, t, djembe_ton(), .35 * I, pan=-.15)
            if s in (2, 6, 10, 14): add(perc, t, djembe_claque(), .32 * I, pan=.12)
            if s in (0, 3, 6, 10): add(perc, t, dundun(), .5 * I, pan=.05)
        if I >= .9 and s in (0, 8):
            add(perc, t, kick(), .55)
# roulement de djembé avant le groove complet (fin de l'ouverture)
for k in range(8):
    add(perc, 6.47 - 8 * PAS16 + k * PAS16, djembe_claque(), .15 + .05 * k, pan=(-.3 if k % 2 else .3))
perc *= np.clip((DUR - np.arange(N) / SR) / 1.6, 0, 1)[:, None]

# ---------------------------------------------------------------- effets (mêmes repères que l'image)
def montee(d):
    x = tt(d); k = x / d; n = rng.standard_normal(len(x)); out = np.zeros_like(x)
    for i in range(8):
        a, b = i * len(x) // 8, (i + 1) * len(x) // 8; lo = 300 + 4000 * (i / 8) ** 1.6; out[a:b] = bp(n, lo, lo * 2.2)[a:b]
    return out * .6 * k ** 1.8
def impact(g=1.0, d=1.4):
    x = tt(d); sub = np.sin(2 * np.pi * np.cumsum(38 + 70 * np.exp(-x * 12)) / SR) * np.exp(-x * 3.2)
    crash = hp(rng.standard_normal(len(x)) * np.exp(-x * 4.5), 2500) * .3 + lp(rng.standard_normal(len(x)) * np.exp(-x * 18), 900) * .5
    return np.tanh((sub * 1.3 + crash) * 1.2) * g
def eclat():
    out = np.zeros(int(.9 * SR))
    for i, n in enumerate([84, 88, 91, 96, 100, 103]):
        x = tt(.6); f = midi(n); s = (np.sin(2 * np.pi * f * x) + .3 * np.sin(2 * np.pi * f * 2.76 * x)) * np.exp(-x * 9)
        a = int(i * .05 * SR); out[a:a + len(s)] += s[: len(out) - a] * (.5 - i * .04)
    return out * .4
def souffle(d=.5):
    x = tt(d); n = rng.standard_normal(len(x)); out = np.zeros_like(x)
    for i in range(10):
        a, b = i * len(x) // 10, (i + 1) * len(x) // 10; c = 400 * 8 ** (i / 9); out[a:b] = bp(n, c * .6, min(c * 1.8, 20000))[a:b]
    return out * np.sin(np.pi * np.clip(x / d, 0, 1)) ** 2
def pop():
    x = tt(.12); return np.sin(2 * np.pi * np.cumsum(1100 * np.exp(-x * 28) + 380) / SR) * np.exp(-x * 40) * .7
def glisse():
    x = tt(.3); return hp(bp(rng.standard_normal(len(x)), 1500, 7000), 1200) * np.sin(np.pi * x / .3) ** 3 * .5
def tampon():
    x = tt(.45); s = np.sin(2 * np.pi * np.cumsum(60 + 120 * np.exp(-x * 30)) / SR) * np.exp(-x * 9)
    return np.tanh((s + bp(rng.standard_normal(len(x)), 1200, 6000) * np.exp(-x * 60) * .5) * 1.4)
def pas():
    x = tt(.16); return lp(rng.standard_normal(len(x)) * np.exp(-x * 45), 900) * .9 + np.sin(2 * np.pi * 85 * x) * np.exp(-x * 30) * .5
def tic(f):
    x = tt(.05); return np.sin(2 * np.pi * f * x) * np.exp(-x * 120) * .6
def fin():
    x = tt(1.3); return sum(np.sin(2 * np.pi * midi(n) * x) * np.exp(-x * 2.6) * .16 for n in (65, 72, 77, 84))

fx = np.zeros((N, 2))
for c in cues:
    t0, ty = c["t"], c["type"]
    if ty == "montee": add(fx, t0, montee(max(.3, c.get("duree", .6))), .4)
    elif ty == "impact": add(fx, t0, impact(), .55)
    elif ty == "impact-doux": add(fx, t0 + .16, impact(.5, 1.1), .32)
    elif ty == "eclat": add(fx, t0, eclat(), .35, pan=.2)
    elif ty == "souffle": add(fx, t0 - .05, souffle(c.get("duree", .5)), .18)
    elif ty == "pop": add(fx, t0, pop(), .16, pan=rng.uniform(-.4, .4))
    elif ty == "cascade":
        for i in range(12): add(fx, t0 + i * c.get("duree", 1.0) / 12, tic(1800 + 90 * i), .08, pan=rng.uniform(-.6, .6))
    elif ty == "glisse": add(fx, t0, glisse(), .22, pan=-.2)
    elif ty == "tampon": add(fx, t0, tampon(), .32)
    elif ty == "pas": add(fx, t0, pas(), .25, pan=.15)
    elif ty == "fin": add(fx, t0, fin(), .35)

mix = flute * 1.0 + reverb(perc, 1.0, .08) * .42 + reverb(fx, 1.2, .1) * .7
sys.path.insert(0, str(Path(__file__).resolve().parent))
from voix_mix import voix_et_ducking  # noqa: E402
voix, duck = voix_et_ducking(N, SR, 8.0)
if voix is not None:
    mix = mix / np.max(np.abs(mix)) * .66 * duck[:, None] + voix * .9
mix *= np.clip((DUR - np.arange(N) / SR) / .6, 0, 1)[:, None]
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.1) * .89
OUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"{OUT} : {DUR} s, flûte + percussions à {BPM} bpm, {len(cues)} effets")
