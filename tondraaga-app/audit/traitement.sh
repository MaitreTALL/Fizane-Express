#!/usr/bin/env bash
# Traitement ponctuel lancé par le runner d'audit (s'il existe) : extraction de voix de femmes chaudes et nettes
# du corpus « African Accented French » (OpenSLR 57, licence Apache 2.0) pour la voix off des vidéos Tondraaga.
# Les locuteurs ont été choisis d'après out/voix/locuteurs.json (hauteur médiane 170-195 Hz, rapport signal/bruit élevé).
set -euo pipefail
OUT=tondraaga-app/audit/out/voix
CHOIX="ctell1-15 ctell3-45 ctell4-53 ctell2-22 ctell1-07 ctell5-81 niger_sys2_5"
mkdir -p "$OUT" "$RUNNER_TEMP/aaf"
sudo apt-get -qq update >/dev/null && sudo apt-get -qq install -y ffmpeg >/dev/null
cd "$RUNNER_TEMP/aaf"
curl -fsSL -o aaf.tar.gz https://us.openslr.org/resources/57/African_Accented_French.tar.gz || curl -fsSL -o aaf.tar.gz https://www.openslr.org/resources/57/African_Accented_French.tar.gz
tar -xzf aaf.tar.gz
cd "$GITHUB_WORKSPACE"
for loc in $CHOIX; do
  dir=$(find "$RUNNER_TEMP/aaf" -type d -name "$loc" | head -1)
  [ -n "$dir" ] || continue
  lst="$RUNNER_TEMP/liste.txt"; : > "$lst"; dur=0
  for f in $(ls "$dir"/*.wav | sort); do
    echo "file '$f'" >> "$lst"
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f"); dur=$(python3 -c "print($dur+$d)")
    python3 -c "import sys; sys.exit(0 if $dur > 420 else 1)" && break
  done
  ffmpeg -v error -y -f concat -safe 0 -i "$lst" -af 'silenceremove=stop_periods=-1:stop_duration=0.35:stop_threshold=-42dB,highpass=f=60' \
    -ac 1 -ar 16000 -c:a libvorbis -q:a 5 "$OUT/voix-f-$loc.ogg"
done
ls -la "$OUT"
