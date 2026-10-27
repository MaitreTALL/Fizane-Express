"""Give the narration the timbre of a reference voice with kNN-VC (WavLM + HiFi-GAN).

The conversion is frame-synchronous, so every sentence keeps its exact timing:
subtitles, lip sync and on-screen elements stay valid without re-rendering images.

Usage: python3 tools/convert_voice.py <knn-vc repo> <reference.wav> <narration.wav> <out.wav>
"""
import json
import sys
from pathlib import Path

import numpy as np
import torch
import torchaudio

ROOT = Path(__file__).resolve().parent.parent
repo, ref_path, src_path, out_path = sys.argv[1:5]
sys.path.insert(0, repo)
from hubconf import knn_vc  # noqa: E402

torch.set_num_threads(4)
vc = knn_vc(pretrained=True, progress=False, prematched=True, device="cpu")

ref, sr = torchaudio.load(ref_path)
ref = torchaudio.functional.resample(ref.mean(0, keepdim=True), sr, 16000)
# the reference is split into its spoken parts (silences add nothing to the matching set)
env = torch.nn.functional.avg_pool1d(ref.abs().unsqueeze(0), 800, 160).squeeze()
keep = (env > env.max() * 0.03).repeat_interleave(160)[: ref.shape[1]]
ref = ref[:, : keep.shape[0]][:, keep]
with torch.inference_mode():
    matching_set = vc.get_features(ref)
print(f"matching set: {matching_set.shape[0]} frames ({matching_set.shape[0] * 0.02:.1f}s of speech)")

src, sr_src = torchaudio.load(src_path)
src = src.mean(0, keepdim=True)
src16 = torchaudio.functional.resample(src, sr_src, 16000)
out = torch.zeros_like(src16)

tl = json.loads((ROOT / "src" / "timeline.json").read_text())
for line in tl["lines"]:
    a = max(0, int((line["start"] - 0.12) * 16000))
    b = min(src16.shape[1], int((line["end"] + 0.15) * 16000))
    with torch.inference_mode():
        q = vc.get_features(src16[:, a:b])
        y = vc.match(q, matching_set, topk=4)
    y = y.flatten()[: b - a]
    fade = torch.ones(b - a)
    n = min(400, (b - a) // 4)
    fade[:n] = torch.linspace(0, 1, n); fade[-n:] = torch.linspace(1, 0, n)
    out[0, a:a + y.shape[0]] += y * fade[: y.shape[0]]
    print(f"{line['id']}: {line['start']:.2f}-{line['end']:.2f}s converted")

out = torchaudio.functional.resample(out, 16000, sr_src)
out = out / out.abs().max().clamp(min=1e-6) * 0.95
torchaudio.save(out_path, out, sr_src)
print("->", out_path)
