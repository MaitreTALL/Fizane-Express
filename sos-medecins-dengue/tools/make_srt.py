"""Write the French subtitles of the video as an .srt file (for Facebook / YouTube upload).

Usage: python3 tools/make_srt.py dist/sos-medecins-dengue.srt
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def ts(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


subs = json.loads((ROOT / "src" / "timeline.json").read_text())["subs"]
out = Path(sys.argv[1])
out.parent.mkdir(parents=True, exist_ok=True)
with out.open("w", encoding="utf-8") as f:
    for i, s in enumerate(subs, 1):
        text = s["text"].replace(" :", " :").replace(" !", " !").replace(" ?", " ?")
        f.write(f"{i}\n{ts(s['start'])} --> {ts(s['end'])}\n{text}\n\n")
print(f"{len(subs)} subtitles -> {out}")
