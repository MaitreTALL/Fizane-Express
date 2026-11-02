#!/usr/bin/env bash
cd "$(dirname "$0")/.."
rm -f out/seg-T/seg_*.mp4
A=0; B=644; C=1288
for r in "$A $B" "$B $C" "$C 1930"; do set -- $r; PAGE='long.html?plan=tuto' node tools/render.cjs segment out/seg-T/seg_$(printf %04d $1).mp4 $1 $2 > out/seg-T/log_$1.txt 2>&1 & done
wait
echo RENDU-TUTO-OK
