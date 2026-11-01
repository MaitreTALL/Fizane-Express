#!/usr/bin/env bash
# Assemble les segments vidéo rendus, ajoute la bande son et encode les fichiers à livrer.
#   tools/assemble.sh <dossier-segments> <dossier-sortie> [nom] [mix.wav]
set -euo pipefail
SEG="$1"; OUT="$2"; NAME="${3:-tondraaga-boutique}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIX="${4:-$ROOT/audio/mix.wav}"
mkdir -p "$OUT"
for f in "$SEG"/seg_*.mp4; do realpath "$f"; done | sort | sed "s/^/file '/; s/$/'/" > "$SEG/list.txt"

# version principale : 1080x1920, 30 i/s, H.264 High, AAC 48 kHz, volume calé pour les réseaux sociaux
ffmpeg -y -loglevel error -f concat -safe 0 -i "$SEG/list.txt" -i "$MIX" \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 18 -profile:v high -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 -af "loudnorm=I=-14:TP=-1.5:LRA=11" -shortest -movflags +faststart \
  -metadata title="Boutique Tondraaga — boutique.visionaryentreprises.com" \
  "$OUT/$NAME.mp4"

# version légère pour WhatsApp : 720x1280
ffmpeg -y -loglevel error -i "$OUT/$NAME.mp4" \
  -vf "scale=720:1280:flags=lanczos" -c:v libx264 -preset slow -crf 24 -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart "$OUT/$NAME-whatsapp.mp4"

ls -la "$OUT"
