#!/usr/bin/env bash
# Join the rendered video segments, add the audio mix and encode the deliverables.
#   tools/assemble.sh <segments-dir> <out-dir> [name] [mix.wav]
set -euo pipefail
SEG="$1"; OUT="$2"; NAME="${3:-sos-medecins-bf-dengue}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIX="${4:-$ROOT/audio/mix.wav}"
mkdir -p "$OUT"
ls "$SEG"/seg_*.mp4 | sort | sed "s/^/file '/; s/$/'/" > "$SEG/list.txt"

# main version: 1080x1920, H.264 High, AAC 48 kHz, loudness for social networks
ffmpeg -y -loglevel error -f concat -safe 0 -i "$SEG/list.txt" -i "$MIX" \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 19 -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -af "loudnorm=I=-14:TP=-1.5:LRA=11" -shortest -movflags +faststart \
  -metadata title="SOS Médecins Burkina Faso — Ensemble contre la dengue !" \
  "$OUT/$NAME.mp4"

# light version for WhatsApp sharing: 720x1280
ffmpeg -y -loglevel error -i "$OUT/$NAME.mp4" \
  -vf "scale=720:1280:flags=lanczos" -c:v libx264 -preset slow -crf 25 -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart "$OUT/$NAME-whatsapp.mp4"

ls -la "$OUT"
