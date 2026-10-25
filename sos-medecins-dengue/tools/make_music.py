"""Procedural background music + sound effects, then the final mix.

Warm, discreet groove: soft pads, balafon-like mallet melody (pentatonic),
light shaker and a soft low drum. The arrangement follows the scenes in
src/timeline.json: rain + mosquito buzz in the hook, a darker bar for the
danger signs, an uplifting lift for the conclusion. Music is ducked under
the voice.

Writes audio/music.wav and audio/mix.wav (44.1 kHz stereo).
"""
import json
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 44100
rng = np.random.default_rng(7)

tl = json.loads((ROOT / "src" / "timeline.json").read_text())
DUR = tl["duration"]
N = int(DUR * SR)
scene = {s["id"]: s for s in tl["scenes"]}
line = {l["id"]: l for l in tl["lines"]}

BPM = 92
BEAT = 60 / BPM


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def add(buf, t, sig, gain=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(sig) <= 0:
        return
    sig = sig[: len(buf) - i]
    buf[i:i + len(sig)] += sig * gain


def mallet(freq, dur=0.9, bright=1.0):
    """Balafon-ish note: wooden strike, inharmonic partials, gourd buzz."""
    t = np.arange(int(dur * SR)) / SR
    env = np.exp(-t * 7.5)
    s = np.sin(2 * np.pi * freq * t) * env
    s += 0.35 * bright * np.sin(2 * np.pi * freq * 3.93 * t) * np.exp(-t * 22)
    s += 0.18 * bright * np.sin(2 * np.pi * freq * 9.1 * t) * np.exp(-t * 45)
    buzz = np.sign(np.sin(2 * np.pi * freq * t)) * np.exp(-t * 14) * 0.05 * bright
    s += lp(buzz, 2500)
    click = rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.25
    return s + hp(click, 1500)


def pad(freqs, dur):
    t = np.arange(int(dur * SR)) / SR
    s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ph = rng.uniform(0, 2 * np.pi)
            s += np.sin(2 * np.pi * f * (1 + det / 100) * t + ph)
            s += 0.25 * np.sin(2 * np.pi * 2 * f * (1 + det / 100) * t + ph)
    a = min(0.6, dur / 3)
    env = np.clip(t / a, 0, 1) * np.clip((dur - t) / a, 0, 1)
    return lp(s * env, 1400) / (len(freqs) * 3)


def kick(dur=0.45):
    t = np.arange(int(dur * SR)) / SR
    f = 52 + 70 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def shaker(dur=0.09):
    t = np.arange(int(dur * SR)) / SR
    return bp(rng.standard_normal(len(t)), 5000, 11000) * np.exp(-t * 60)


def djembe_slap(dur=0.25):
    t = np.arange(int(dur * SR)) / SR
    tone = np.sin(2 * np.pi * 320 * t) * np.exp(-t * 28)
    noise = bp(rng.standard_normal(len(t)), 900, 4000) * np.exp(-t * 45) * 0.6
    return tone + noise


# --- harmony: F major, I - V - vi - IV  (darker ii - vi for the danger signs)
PROG = [[53, 57, 60, 65], [48, 55, 60, 64], [50, 57, 62, 65], [46, 53, 58, 65]]
DARK = [[50, 53, 57, 62], [45, 52, 57, 60]]
PENTA = [65, 67, 69, 72, 74, 77, 79, 81]

danger_start = line["s3b"]["start"] - 0.4
danger_end = line["s3c"]["end"] + 0.3
end_card = line["s6c"]["start"] - 0.2

music = np.zeros((N, 2))
L, R = np.zeros(N), np.zeros(N)
bar = 4 * BEAT
nbars = int(DUR / bar) + 1
for b in range(nbars):
    t0 = b * bar
    dark = danger_start <= t0 + bar / 2 <= danger_end
    chords = DARK if dark else PROG
    chord = chords[b % len(chords)]
    p = pad([midi(n) for n in chord], bar + 0.6)
    lvl = 0.55 if dark else 0.45
    add(L, t0, p, lvl)
    add(R, t0, p, lvl)
    # bass on beat 1 and the "and" of 3
    for off, n in ((0, chord[0] - 12), (2.5 * BEAT, chord[0] - 12)):
        tt = np.arange(int(0.7 * SR)) / SR
        bass = np.sin(2 * np.pi * midi(n) * tt) * np.exp(-tt * 3.5)
        add(L, t0 + off, bass, 0.32)
        add(R, t0 + off, bass, 0.32)

    if t0 < 1.0 or t0 > DUR - 1.5:
        continue
    intro = t0 < scene[1]["first"] + 3
    # percussion
    for k in range(8):
        tt = t0 + k * BEAT / 2
        if not intro:
            sh = shaker()
            add(L, tt, sh, 0.10 if k % 2 else 0.06)
            add(R, tt + 0.004, sh, 0.08 if k % 2 else 0.05)
    if not intro:
        for off in (0, 2.5 * BEAT) if not dark else (0, 2 * BEAT):
            add(L, t0 + off, kick(), 0.34)
            add(R, t0 + off, kick(), 0.34)
        if not dark:
            for off in (1.5 * BEAT, 3 * BEAT, 3.5 * BEAT):
                ds = djembe_slap()
                add(L, t0 + off, ds, 0.09)
                add(R, t0 + off, ds, 0.12)
    # balafon melody: 8th-note pattern drawn from the pentatonic scale
    if not dark:
        pattern = rng.choice(len(PENTA), 8)
        rhythm = [1, 0, 1, 1, 0, 1, 1, 0] if b % 2 == 0 else [1, 1, 0, 1, 0, 1, 0, 1]
        for k in range(8):
            if rhythm[k]:
                n = PENTA[pattern[k]]
                note = mallet(midi(n), 0.8)
                pan = 0.5 + 0.35 * np.sin(k)
                g = 0.16 if t0 < scene[6]["start"] else 0.2
                add(L, t0 + k * BEAT / 2, note, g * (1 - pan) * 2)
                add(R, t0 + k * BEAT / 2, note, g * pan * 2)

music[:, 0], music[:, 1] = L, R

# --- music bed fade in/out, end-card lift
t = np.arange(N) / SR
bed = np.clip(t / 1.2, 0, 1) * np.clip((DUR - t) / 2.5, 0, 1)
music *= bed[:, None]

# --- duck under the voice
with wave.open(str(ROOT / "audio" / "voice.wav")) as w:
    voice = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
env = lp(np.abs(voice), 6, 1)
env = np.clip(env / 0.03, 0, 1)
duck = 1 - 0.55 * env
music *= duck[:, None]

# --- sound effects
sfx = np.zeros((N, 2))
# rain at the start, fading as the "after the rain" shots arrive
rain_len = int(scene[1]["end"] * SR)
rain = hp(rng.standard_normal(rain_len), 1800) * 0.05
rain += lp(rng.standard_normal(rain_len), 600) * 0.03
tr = np.arange(rain_len) / SR
rain *= np.clip(tr / 0.4, 0, 1) * np.clip((6.5 - tr) / 2.5, 0.05, 1)
for i in range(400):
    dt = rng.uniform(0, 6.5)
    drop = hp(rng.standard_normal(int(0.03 * SR)), 2500) * np.exp(-np.arange(int(0.03 * SR)) / SR * 150)
    add(sfx[:, 0] if i % 2 else sfx[:, 1], dt, drop, rng.uniform(0.02, 0.07))
sfx[:rain_len, 0] += rain
sfx[:rain_len, 1] += np.roll(rain, 333)


def buzz(dur, f0=580):
    tt = np.arange(int(dur * SR)) / SR
    f = f0 + 40 * np.sin(2 * np.pi * 3.1 * tt) + 15 * np.sin(2 * np.pi * 11 * tt)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(np.sin(k * ph) / k for k in range(1, 8))
    s = bp(s, 400, 4000)
    env = np.clip(tt / 0.3, 0, 1) * np.clip((dur - tt) / 0.4, 0, 1)
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * tt)
    return s * env * am


for t0, d, g in ((line["s1b"]["start"] + 1.2, 4.0, 0.035),
                 (scene[2]["start"] + 0.3, 3.2, 0.03),
                 (line["s2a"]["start"] + 3.6, 2.4, 0.03)):
    bz = buzz(d)
    add(sfx[:, 0], t0, bz, g)
    add(sfx[:, 1], t0 + 0.01, bz, g * 0.8)


def whoosh(dur=0.55):
    tt = np.arange(int(dur * SR)) / SR
    n = rng.standard_normal(len(tt))
    env = np.sin(np.pi * tt / dur) ** 2
    lo = bp(n, 300, 2500) * env
    return lo * 0.5


for s in tl["scenes"][1:]:
    w = whoosh()
    add(sfx[:, 0], s["start"] - 0.3, w, 0.22)
    add(sfx[:, 1], s["start"] - 0.28, w, 0.22)

# soft "pop" for every pictogram / card is added in the renderer cue list
cues = json.loads((ROOT / "src" / "cues.json").read_text()) if (ROOT / "src" / "cues.json").exists() else []
for c in cues:
    tt = np.arange(int(0.12 * SR)) / SR
    f = 900 if c.get("kind") != "alert" else 420
    pop = np.sin(2 * np.pi * f * tt * (1 + 0.6 * np.exp(-tt * 40))) * np.exp(-tt * 38)
    g = 0.07 if c.get("kind") != "alert" else 0.10
    add(sfx[:, 0], c["t"], pop, g)
    add(sfx[:, 1], c["t"], pop, g)

# end-card chime (balafon arpeggio)
for k, n in enumerate([65, 69, 72, 77]):
    note = mallet(midi(n), 1.4, 0.8)
    add(sfx[:, 0], end_card + 0.15 + k * 0.12, note, 0.13)
    add(sfx[:, 1], end_card + 0.15 + k * 0.12, note, 0.13)


def write(path, data):
    data = np.clip(data, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((data * 32767).astype(np.int16).tobytes())


music_norm = music / (np.max(np.abs(music)) + 1e-9)
music_bed = music_norm * 0.16          # roughly -16 dB under a full-scale voice
mix = music_bed + sfx + np.stack([voice, voice], axis=1) * 0.9
mix /= max(1.0, np.max(np.abs(mix)) / 0.97)
write(ROOT / "audio" / "music.wav", music_bed + sfx)
write(ROOT / "audio" / "mix.wav", mix)
print("mix peak", float(np.max(np.abs(mix))), "duration", DUR)
