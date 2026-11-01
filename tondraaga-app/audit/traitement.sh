#!/usr/bin/env bash
# Traitement ponctuel lancé par le runner d'audit (s'il existe) : extraction de voix d'hommes graves et nettes
# du corpus « African Accented French » (OpenSLR 57, licence Apache 2.0) pour la voix off des vidéos Tondraaga.
set -euo pipefail
OUT=tondraaga-app/audit/out/voix
mkdir -p "$OUT" "$RUNNER_TEMP/aaf"
sudo apt-get -qq update >/dev/null && sudo apt-get -qq install -y ffmpeg >/dev/null
pip install -q numpy
cd "$RUNNER_TEMP/aaf"
curl -fsSL -o aaf.tar.gz https://us.openslr.org/resources/57/African_Accented_French.tar.gz || curl -fsSL -o aaf.tar.gz https://www.openslr.org/resources/57/African_Accented_French.tar.gz
tar -xzf aaf.tar.gz
find . -maxdepth 4 -type d | head -40 > "$GITHUB_WORKSPACE/$OUT/arborescence.txt"
cd "$GITHUB_WORKSPACE"
python3 - "$RUNNER_TEMP/aaf" "$OUT" <<'PY'
import sys, os, glob, json, wave, subprocess
import numpy as np
racine, out = sys.argv[1], sys.argv[2]
fichiers = glob.glob(os.path.join(racine, '**', '*.wav'), recursive=True)
par_loc = {}
for f in fichiers:
    loc = os.path.basename(os.path.dirname(f))
    par_loc.setdefault(loc, []).append(f)
def lire(f):
    try:
        w = wave.open(f); sr = w.getframerate(); n = w.getnframes(); ch = w.getnchannels(); sw = w.getsampwidth()
        if sw != 2: return None, None
        x = np.frombuffer(w.readframes(n), '<i2').astype(np.float32) / 32768
        if ch > 1: x = x.reshape(-1, ch).mean(1)
        return x, sr
    except Exception:
        return None, None
def f0(x, sr):
    hop, win = int(sr * .01), int(sr * .04); vals = []
    for i in range(0, len(x) - win, hop * 3):
        fr = x[i:i + win] * np.hanning(win)
        if np.sqrt((fr ** 2).mean()) < .01: continue
        ac = np.correlate(fr, fr, 'full')[win - 1:]; lo, hi = int(sr / 300), int(sr / 70)
        if hi >= len(ac): continue
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] > .45 * ac[0]: vals.append(sr / k)
    return vals
stats = []
for loc, fs in par_loc.items():
    fs = sorted(fs)[:40]
    tot, pitches, snrs = 0, [], []
    for f in fs:
        x, sr = lire(f)
        if x is None: continue
        tot += len(x) / sr
        if len(pitches) < 4000: pitches += f0(x, sr)
        hop = int(sr * .02); e = np.array([np.sqrt((x[i:i + hop] ** 2).mean()) + 1e-6 for i in range(0, len(x) - hop, hop)])
        if len(e) > 20: snrs.append(20 * np.log10(np.percentile(e, 95) / np.percentile(e, 10)))
    if pitches and tot > 60:
        stats.append({'locuteur': loc, 'fichiers': len(par_loc[loc]), 'duree_40': round(tot, 1), 'f0': round(float(np.median(pitches)), 1), 'snr': round(float(np.median(snrs)), 1) if snrs else 0, 'chemin': os.path.relpath(os.path.dirname(par_loc[loc][0]), racine)})
stats.sort(key=lambda s: s['f0'])
json.dump(stats, open(os.path.join(out, 'locuteurs.json'), 'w'), indent=1)
hommes = [s for s in stats if 75 <= s['f0'] <= 135 and s['snr'] >= 28][:8]
for s in hommes:
    fs = sorted(par_loc[s['locuteur']])
    lst = os.path.join(out, 'liste.txt'); dur = 0
    with open(lst, 'w') as fh:
        for f in fs:
            w = wave.open(f); dur += w.getnframes() / w.getframerate(); fh.write(f"file '{os.path.abspath(f)}'\n")
            if dur > 420: break
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-af', 'silenceremove=stop_periods=-1:stop_duration=0.35:stop_threshold=-42dB,highpass=f=60',
                    '-ac', '1', '-ar', '16000', '-c:a', 'libvorbis', '-q:a', '5', os.path.join(out, f"voix-{s['locuteur']}.ogg")], check=True)
    os.remove(lst)
print(json.dumps(hommes, indent=1))
PY
ls -la "$OUT"
