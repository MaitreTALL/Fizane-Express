"""Assemble the narration track and the timeline that drives the animation.

Reads narration.json + audio/lines/*.wav (from synth_voice.py) and writes:
  audio/voice.wav      44.1 kHz mono narration, placed on the timeline
  src/timeline.json    scenes, lines, word timings, subtitle chunks, mouth curve
"""
import json
import re
import wave
from pathlib import Path

import numpy as np
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parent.parent
SR = 44100
FPS = 25
START = 1.0          # visuals of the hook play alone before the first line
BASE_GAP = 0.08      # added to every per-line pause
END_HOLD = 3.2       # end card hold after the last line
SUB_MAX = 64         # max characters per subtitle chunk (shown on <= 2 lines)


def load_line(path):
    with wave.open(str(path)) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        sr = w.getframerate()
    a = resample_poly(a, SR, sr).astype(np.float32)
    idx = np.where(np.abs(a) > 0.02)[0]
    lo = max(0, idx[0] - int(0.03 * SR))
    hi = min(len(a), idx[-1] + int(0.07 * SR))
    a = a[lo:hi]
    fade = int(0.01 * SR)
    a[:fade] *= np.linspace(0, 1, fade)
    a[-fade:] *= np.linspace(1, 0, fade)
    return a


def silence_gaps(a):
    """Centres (s) of pauses >= 70 ms inside a line, used to anchor phrase starts."""
    hop = int(0.01 * SR)
    env = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a) - hop, hop)])
    quiet = env < 0.012
    gaps, run = [], 0
    for i, q in enumerate(quiet):
        if q:
            run += 1
        else:
            if run >= 7 and i - run > 5:
                gaps.append((i - run / 2) * 0.01)
            run = 0
    return gaps


def syllables(word):
    return max(1, len(re.findall(r"[aeiouyàâäéèêëîïôöùûüœ]+", word.lower())))


def word_timings(text, a, say=None):
    """Estimate each word's start: phrase starts snap to pauses, words inside a
    phrase are spread by syllable count (of the spoken form when it differs)."""
    dur = len(a) / SR
    words = text.split()
    say = say or {}
    weights = np.array([syllables(say[w]) + 0.6 * (len(say[w].split()) - 1) if w in say else syllables(w) for w in words], dtype=float)
    cum = np.concatenate([[0], np.cumsum(weights)]) / weights.sum()
    est = cum[:-1] * dur
    gaps = silence_gaps(a)
    anchors = [(0, 0.0)]
    for i in range(1, len(words)):
        if re.search(r"[,:;.!?]$", words[i - 1]) and gaps:
            g = min(gaps, key=lambda g: abs(g - est[i]))
            if abs(g - est[i]) < 0.7 and g > anchors[-1][1]:
                anchors.append((i, g))
    anchors.append((len(words), dur))
    times = np.zeros(len(words))
    for (i0, t0), (i1, t1) in zip(anchors, anchors[1:]):
        w = weights[i0:i1]
        c = np.concatenate([[0], np.cumsum(w)])[:-1] / w.sum()
        times[i0:i1] = t0 + c * (t1 - t0)
    return [{"w": w, "t": round(float(t), 3)} for w, t in zip(words, times)]


def chunk_words(words):
    """Split a line into balanced subtitle chunks, preferring breaks after punctuation."""
    n = len(words)
    span = lambda i, j: len(" ".join(words[i:j]))
    total = span(0, n)
    if total <= SUB_MAX:
        return [list(range(n))]
    best = None
    for k in range(-(-total // SUB_MAX), -(-total // SUB_MAX) + 2):
        target = total / k
        # dp[j][c] = (cost, split points) for words[:j] in c chunks
        dp = {(0, 0): (0.0, [])}
        for c in range(1, k + 1):
            for j in range(1, n + 1):
                for i in range(j):
                    if (i, c - 1) not in dp or span(i, j) > SUB_MAX + 6:
                        continue
                    cost = (span(i, j) - target) ** 2 / target
                    if j < n and re.search(r"[,:;.!?]$", words[j - 1]):
                        cost -= 12
                    cand = (dp[(i, c - 1)][0] + cost, dp[(i, c - 1)][1] + [j])
                    if (j, c) not in dp or cand[0] < dp[(j, c)][0]:
                        dp[(j, c)] = cand
        if (n, k) in dp and (best is None or dp[(n, k)][0] + 25 * k < best[0]):
            best = (dp[(n, k)][0] + 25 * k, dp[(n, k)][1])
    cuts = [0] + best[1]
    return [list(range(a, b)) for a, b in zip(cuts, cuts[1:])]


def main():
    narration = json.loads((ROOT / "narration.json").read_text())
    clips, lines = [], []
    t = START
    for line in narration["lines"]:
        a = load_line(ROOT / "audio" / "lines" / f"{line['id']}.wav")
        dur = len(a) / SR
        words = word_timings(line["text"], a, line.get("say"))
        lines.append({"id": line["id"], "scene": line["scene"], "text": line["text"],
                      "start": round(t, 3), "end": round(t + dur, 3),
                      "words": [dict({"w": w["w"], "t": round(t + w["t"], 3)}, **({"say": line["say"][w["w"]]} if w["w"] in line.get("say", {}) else {})) for w in words]})
        clips.append((t, a))
        t += dur + line["pause"] + BASE_GAP

    total = lines[-1]["end"] + END_HOLD
    voice = np.zeros(int(total * SR) + SR, np.float32)
    for start, a in clips:
        i = int(start * SR)
        voice[i:i + len(a)] += a
    voice = voice[:int(total * SR)]

    # scenes: boundaries sit in the middle of the gap between scenes
    scenes = []
    for s in sorted({l["scene"] for l in lines}):
        ls = [l for l in lines if l["scene"] == s]
        scenes.append({"id": s, "first": ls[0]["start"], "last": ls[-1]["end"]})
    for i, s in enumerate(scenes):
        s["start"] = 0.0 if i == 0 else round((scenes[i - 1]["last"] + s["first"]) / 2, 3)
    for i, s in enumerate(scenes):
        s["end"] = round(scenes[i + 1]["start"], 3) if i + 1 < len(scenes) else round(total, 3)

    subs = []
    for l in lines:
        ws = [w["w"] for w in l["words"]]
        for c in chunk_words(ws):
            start = l["words"][c[0]]["t"]
            nxt = c[-1] + 1
            end = l["words"][nxt]["t"] if nxt < len(ws) else l["end"]
            subs.append({"text": " ".join(ws[j] for j in c), "start": round(start - 0.05, 3),
                         "end": round(end + (0.25 if nxt >= len(ws) else 0.0), 3)})
    for a, b in zip(subs, subs[1:]):
        a["end"] = min(a["end"], b["start"])

    # mouth opening per video frame, from the narration loudness
    hop = SR // FPS
    n = int(total * FPS)
    rms = np.array([np.sqrt(np.mean(voice[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(n)])
    mouth = np.clip((rms - 0.006) / 0.09, 0, 1) ** 0.7
    mouth = np.convolve(mouth, [0.25, 0.5, 0.25], mode="same")

    with wave.open(str(ROOT / "audio" / "voice.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(voice, -1, 1) * 32767).astype(np.int16).tobytes())

    timeline = {"fps": FPS, "duration": round(total, 3), "scenes": scenes, "lines": lines,
                "subs": subs, "mouth": [round(float(m), 3) for m in mouth]}
    (ROOT / "src" / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False))
    print(f"duration {total:.2f}s, {len(subs)} subtitle chunks")
    for s in scenes:
        print(f"scene {s['id']}: {s['start']:6.2f} -> {s['end']:6.2f}")


if __name__ == "__main__":
    main()
