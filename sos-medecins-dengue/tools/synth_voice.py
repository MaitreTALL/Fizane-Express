"""Synthesise the narration line by line with Piper and report durations.

Usage: python3 tools/synth_voice.py <piper-binary> <voice.onnx> [length_scale]
Writes audio/lines/<id>.wav (22.05 kHz mono) and audio/lines.json.
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
piper, model = sys.argv[1], sys.argv[2]
length_scale = sys.argv[3] if len(sys.argv) > 3 else "1.0"

narration = json.loads((ROOT / "narration.json").read_text())
out_dir = ROOT / "audio" / "lines"
out_dir.mkdir(parents=True, exist_ok=True)

report = []
for line in narration["lines"]:
    wav_path = out_dir / f"{line['id']}.wav"
    subprocess.run(
        [piper, "-m", model, "-f", str(wav_path),
         "--length_scale", length_scale, "--noise_scale", "0.6", "--noise_w", "0.7"],
        input=line.get("tts", line["text"]).encode(), check=True,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    with wave.open(str(wav_path)) as w:
        dur = w.getnframes() / w.getframerate()
    report.append({"id": line["id"], "scene": line["scene"], "duration": round(dur, 3)})
    print(f"{line['id']}: {dur:5.2f}s")

total = sum(r["duration"] for r in report) + sum(l["pause"] for l in narration["lines"])
print(f"total voice + pauses: {total:.2f}s")
(ROOT / "audio" / "lines.json").write_text(json.dumps(report, indent=2))
