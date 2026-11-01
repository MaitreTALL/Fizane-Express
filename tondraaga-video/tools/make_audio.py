"""Musique et effets sonores de la vidéo Tondraaga (15 s), synthétisés.

Groove afro-pop moderne : log drum (basse percussive), kick, clap, shaker,
balafon pentatonique, nappes chaudes. La grille rythmique est calée sur les
moments forts de l'image : le « drop » à 3,0 s, les impacts à 8,08 s et 12,2 s.
Les effets (montée, impact, éclat, souffle, pop, glisse, fin) suivent les
repères exportés par la page (window.__cues).

Usage : python3 tools/make_audio.py [cues.json] [mix.wav]
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
DUR = 15.0
N = int(DUR * SR)
rng = np.random.default_rng(11)

cues = json.loads(Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "out" / "cues.json").read_text())
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else ROOT / "audio" / "mix.wav")


def lp(x, f, o=2):
    return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def add(buf, t, sig, gain=1.0, pan=0.0):
    """Ajoute un signal mono (ou stéréo) dans le tampon stéréo, avec panoramique."""
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


# ---------------------------------------------------------------- grille
# intro (0 → 3 s) : temps de 0,5 s ; section A (3 → 8,08) : 10 temps ;
# section B (8,08 → 12,2) : 8 temps ; fin (12,2 → 15) au même tempo que B.
def grille(debut, fin, n=None, duree=None):
    if n is not None:
        duree = (fin - debut) / n
    out, t = [], debut
    while t < fin - 1e-6:
        out.append(t)
        t += duree
    return out, duree


INTRO, D0 = grille(0.0, 3.0, n=6)
SECA, DA = grille(3.0, 8.08, n=10)
SECB, DB = grille(8.08, 12.2, n=8)
SECC, DC = grille(12.2, 14.55, duree=DB)


# ---------------------------------------------------------------- instruments
def kick(g=1.0):
    t = tt(0.45)
    f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.5)
    s += hp(rng.standard_normal(len(t)) * np.exp(-t * 300), 2000) * 0.25
    return np.tanh(s * 1.6) * g


def clap():
    t = tt(0.35)
    n = rng.standard_normal(len(t))
    env = np.zeros_like(t)
    for k, d in enumerate((0.0, 0.011, 0.022)):
        env += np.where(t >= d, np.exp(-(t - d) * (160 if k < 2 else 22)), 0)
    return bp(n * env, 900, 5200) * 0.9


def shaker(acc=1.0):
    t = tt(0.09)
    n = rng.standard_normal(len(t))
    env = (1 - np.exp(-t * 400)) * np.exp(-t * 55)
    return hp(n * env, 6500, 4) * 0.35 * acc


def logdrum(note, dur=0.42):
    """Log drum façon amapiano : sinus à attaque glissée, légèrement saturé."""
    t = tt(dur)
    f0 = midi(note)
    f = f0 * (1 + 0.6 * np.exp(-t * 45))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
    env = np.exp(-t * 6.5) * np.clip(t / 0.003, 0, 1)
    return lp(np.tanh(s * env * 2.2) * 0.7, 1800)


def balafon(note, dur=0.7, bright=1.0):
    t = tt(dur)
    f = midi(note)
    env = np.exp(-t * 8)
    s = np.sin(2 * np.pi * f * t) * env
    s += 0.32 * bright * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 24)
    s += 0.14 * bright * np.sin(2 * np.pi * f * 9.1 * t) * np.exp(-t * 50)
    s += lp(np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t * 16) * 0.05 * bright, 2600)
    s += hp(rng.standard_normal(len(t)) * np.exp(-t * 500) * 0.2, 1800)
    return s


def nappe(notes, dur, cut=2200):
    t = tt(dur)
    s = np.zeros((len(t), 2))
    for n in notes:
        f = midi(n)
        for c, det in enumerate((-0.0018, 0.0021)):
            ph = rng.uniform(0, 2 * np.pi)
            saw = 2 * ((f * (1 + det) * t + ph / 6.283) % 1) - 1
            s[:, c] += saw
    a = min(0.25, dur / 3)
    env = np.clip(t / a, 0, 1) * np.clip((dur - t) / 0.12, 0, 1)
    for c in range(2):
        s[:, c] = lp(s[:, c], cut, 2) * env
    return s * 0.06


# ---------------------------------------------------------------- effets
def montee(dur):
    t = tt(dur)
    k = t / dur
    n = rng.standard_normal(len(t))
    out = np.zeros_like(t)
    seg = 8
    for i in range(seg):  # bruit filtré dont la bande monte
        a, b = i * len(t) // seg, (i + 1) * len(t) // seg
        lo = 300 + 4000 * (i / seg) ** 1.6
        out[a:b] = bp(n, lo, lo * 2.2)[a:b]
    f = 180 + 900 * k ** 2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    return (out * 0.6 + tone) * k ** 1.8


def impact(g=1.0):
    t = tt(1.6)
    f = 38 + 70 * np.exp(-t * 12)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    crash = rng.standard_normal(len(t)) * np.exp(-t * 4.5)
    crash = hp(crash, 2500) * 0.35 + lp(rng.standard_normal(len(t)) * np.exp(-t * 18), 900) * 0.6
    return np.tanh((sub * 1.3 + crash) * 1.2) * g


def eclat():
    """Scintillement : petites clochettes aiguës qui montent."""
    out = np.zeros(int(0.9 * SR))
    for i, n in enumerate([84, 88, 91, 96, 100, 103]):
        t = tt(0.6)
        f = midi(n)
        s = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 9)
        a = int(i * 0.05 * SR)
        out[a:a + len(s)] += s[: len(out) - a] * (0.5 - i * 0.04)
    return out * 0.45


def souffle(dur=0.55):
    t = tt(dur)
    n = rng.standard_normal(len(t))
    out = np.zeros_like(t)
    seg = 10
    for i in range(seg):
        a, b = i * len(t) // seg, (i + 1) * len(t) // seg
        c = 400 * (8 ** (i / (seg - 1)))
        out[a:b] = bp(n, c * 0.6, min(c * 1.8, 20000))[a:b]
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return out * env * 1.1


def pop():
    t = tt(0.12)
    f = 1100 * np.exp(-t * 28) + 380
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40)
    return s * 0.7 + hp(rng.standard_normal(len(t)) * np.exp(-t * 900), 3000) * 0.15


def glisse():
    t = tt(0.32)
    n = rng.standard_normal(len(t))
    env = np.sin(np.pi * t / 0.32) ** 3
    return hp(bp(n, 1500, 7000), 1200) * env * 0.5


def fin():
    t = tt(1.4)
    out = np.zeros(len(t))
    for n in (69, 76, 81, 88):
        out += np.sin(2 * np.pi * midi(n) * t) * np.exp(-t * 2.6) * 0.18
    sub = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 3) * 0.5
    return out + sub


def reverb(x, duree=1.6, mix=0.22):
    t = tt(duree)
    ir = np.zeros((len(t), 2))
    for c in range(2):
        ir[:, c] = lp(rng.standard_normal(len(t)), 6000) * np.exp(-t * 4.2)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    wet = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x + wet * mix * 6


# ---------------------------------------------------------------- arrangement
musique = np.zeros((N, 2))
bat = np.zeros((N, 2))
fx = np.zeros((N, 2))

# accords (la mineur pentatonique) : Lam — Fa — Do — Sol
ACC = {"Am": [57, 60, 64, 69], "F": [53, 57, 60, 65], "C": [55, 60, 64, 67], "G": [55, 59, 62, 67]}
BASSE = {"Am": 45, "F": 41, "C": 48, "G": 43}
PENTA = [69, 72, 74, 76, 79, 81, 84]

# intro : nappe qui s'ouvre + arpège de balafon, sans batterie
add(musique, 0.62, nappe(ACC["Am"], 1.25, 1400), 0.7)
add(musique, 1.75, nappe(ACC["F"], 1.3, 1800), 0.7)
motif_intro = [81, 76, 79, 76, 81, 84, 79, 76]
for i, t0 in enumerate(np.arange(0.62, 2.9, D0 / 2)):
    add(musique, t0, balafon(motif_intro[i % len(motif_intro)], 0.6, 0.8), 0.27, pan=(-0.4 if i % 2 else 0.4))
for t0 in np.arange(1.5, 3.0, D0 / 4):  # shaker qui monte vers le drop
    add(bat, t0, shaker(0.4 + 0.6 * (t0 - 1.5) / 1.5), 0.8, pan=0.25)
for k, t0 in enumerate(np.arange(2.5, 3.0, D0 / 4)):  # petit roulement de clap
    add(bat, t0, clap(), 0.18 + 0.12 * k)


def section(beats, d, accords, intensite=1.0, melodie=True):
    """Groove sur une suite de temps ; un accord tous les deux temps."""
    pas = d / 4
    kick_pas = {0, 6, 8, 11}
    clap_pas = {4, 12}
    log_pas = [0, 3, 7, 10, 14]
    motif = [0, 2, 4, 3, 2, 4, 5, 4, 2, 1, 2, 4, 3, 2, 0, 1]
    for b, tb in enumerate(beats):
        acc = accords[(b // 2) % len(accords)]
        if b % 2 == 0:
            add(musique, tb, nappe(ACC[acc], 2 * d + 0.05, 2600), 0.85 * intensite)
        for s in range(4):
            g = (b % 4) * 4 + s
            t0 = tb + s * pas + (0.012 if s % 2 else 0)  # léger swing
            if g in kick_pas:
                add(bat, t0, kick(), 0.95)
            if g in clap_pas:
                add(bat, t0, clap(), 0.55, pan=0.05)
            add(bat, t0, shaker(1.0 if s == 2 else 0.55), 0.7, pan=(0.3 if s % 2 else -0.15))
            if g in log_pas:
                add(musique, t0, logdrum(BASSE[acc] + (12 if g == 10 else 0)), 0.55)
            if melodie and s % 2 == 0:
                n = PENTA[motif[(b * 2 + s // 2) % len(motif)]]
                add(musique, t0, balafon(n, 0.55), 0.24 * intensite, pan=(0.35 if (b + s) % 4 else -0.35))


section(SECA, DA, ["Am", "F", "C", "G"], 1.0)
section(SECB, DB, ["F", "G", "Am", "C"], 1.08)
section(SECC, DC, ["Am", "F", "C", "G"], 0.95)
# accord final, tenu jusqu'au fondu
add(musique, 14.55, nappe(ACC["Am"] + [76], 0.45, 1500), 0.9)

# ---------------------------------------------------------------- effets synchronisés
for c in cues:
    t0, ty = c["t"], c["type"]
    if ty == "montee":
        add(fx, t0, montee(c.get("duree", 0.6)), 0.55)
    elif ty == "impact":
        add(fx, t0, impact(), 0.75)
    elif ty == "eclat":
        add(fx, t0, eclat(), 0.6, pan=0.2)
    elif ty == "souffle":
        add(fx, t0 - 0.05, souffle(), 0.32)
    elif ty == "pop":
        add(fx, t0, pop(), 0.38, pan=rng.uniform(-0.4, 0.4))
    elif ty == "glisse":
        add(fx, t0, glisse(), 0.42, pan=-0.2)
    elif ty == "fin":
        add(fx, t0, fin(), 0.6)

# légère compression « pompe » de la musique sur le kick (sidechain)
env = np.ones(N)
for tb in SECA + SECB + SECC:
    i = int(tb * SR)
    k = np.arange(int(0.22 * SR))
    j = slice(i, min(N, i + len(k)))
    env[j] = np.minimum(env[j], 1 - 0.35 * np.exp(-k[: j.stop - j.start] / SR * 14))
musique *= env[:, None]

mix = reverb(musique * 0.9, 1.8, 0.18) + bat * 0.8 + reverb(fx, 1.4, 0.12)
# égalisation finale : moins de sub, plus de présence (écoute sur haut-parleur de téléphone)
for c in range(2):
    m = hp(mix[:, c], 28)
    mix[:, c] = m - 0.3 * lp(m, 90) + 0.7 * hp(m, 1600)
# fondu de sortie (14,55 → 15 s), comme l'image
t = np.arange(N) / SR
mix *= np.clip((15.0 - t) / 0.45, 0, 1)[:, None] ** 1.5
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.25) * 0.89

OUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"{OUT} : {DUR} s, {len(cues)} effets, temps A={DA:.3f}s B={DB:.3f}s")
