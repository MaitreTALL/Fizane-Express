"""Prepare the storyboard panels for the "planche animée" version.

For each of the 7 illustrated panels of the reference board:
  - crop it from the board, take its x4 Real-ESRGAN upscale if present (else Lanczos);
  - remove the storyboard label ("1/8 0-10 s") and the approximate logo drawn by the
    image generator (the official logo is overlaid by the video itself);
  - recolour the red cross of the health centre sign to green (protected emblem);
  - estimate a depth map (MiDaS small, ONNX) for the 2.5D parallax.

Usage: python3 -I tools/planche_prep.py <board.png> <upscaled-dir> <midas.onnx> <out-dir>
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

board_path, up_dir, midas_path, out_dir = map(Path, sys.argv[1:5])
out_dir.mkdir(parents=True, exist_ok=True)

BOXES = {1: (0, 0, 375, 592), 2: (378, 0, 698, 592), 3: (702, 0, 1024, 592), 4: (0, 594, 409, 1141),
         5: (412, 594, 695, 1141), 6: (699, 594, 1024, 1141), 7: (0, 1143, 490, 1536)}
# regions to remove, in panel pixels (x0, y0, x1, y1): storyboard label + generated logo
CLEAN = {
    1: [(0, 0, 84, 60), (226, 0, 370, 86)],
    2: [(0, 0, 82, 60), (165, 0, 320, 92)],
    3: [(0, 0, 82, 60), (186, 0, 322, 61)],
    4: [(0, 0, 86, 60), (264, 0, 409, 67)],
    5: [(0, 0, 88, 61), (160, 0, 283, 78)],
    6: [(0, 0, 80, 57), (220, 0, 325, 62)],
    7: [(0, 0, 86, 60), (338, 0, 490, 74)],
}
CROSS = {6: (95, 25, 185, 100)}  # red cross on the "CENTRE DE SANTÉ" sign
PAD_TOP = {6: 70}
# white gutter lines left on the panel edges by the board layout: (top, bottom, left, right)
TRIM = {1: (0, 2, 0, 2), 2: (0, 2, 0, 0), 3: (0, 2, 0, 0), 4: (2, 3, 0, 2), 5: (2, 3, 0, 0), 6: (2, 2, 0, 0), 7: (2, 0, 0, 0)}  # extend the sky so the sign can sit below the logo

board = Image.open(board_path).convert("RGB")
sess = ort.InferenceSession(str(midas_path))
meta = {}

for k, box in BOXES.items():
    small = np.array(board.crop(box))
    h, w = small.shape[:2]
    up_path = up_dir / f"p{k}_x4.png"
    big = np.array(Image.open(up_path).convert("RGB")) if up_path.exists() else np.array(Image.fromarray(small).resize((w * 4, h * 4), Image.LANCZOS))
    S = big.shape[1] / w
    t_, b_, l_, r_ = TRIM.get(k, (0, 0, 0, 0))
    small = small[t_:h - b_, l_:w - r_]
    big = big[int(t_ * S):int((h - b_) * S), int(l_ * S):int((w - r_) * S)]
    h, w = small.shape[:2]

    # inpaint at panel resolution (backgrounds there are soft), then blend the upsampled fill
    mask = np.zeros((h, w), np.uint8)
    for x0, y0, x1, y1 in CLEAN[k]:
        mask[y0:y1, x0:x1] = 255
    # smooth harmonic fill: repeatedly blur, keeping the known pixels fixed
    filled = small.astype(np.float32).copy()
    known = mask == 0
    filled[~known] = small[known].mean(axis=0)
    for _ in range(500):
        filled = cv2.blur(filled, (9, 9))
        filled[known] = small[known]
    filled = filled.astype(np.uint8)
    fill_big = cv2.resize(filled, (big.shape[1], big.shape[0]), interpolation=cv2.INTER_CUBIC)
    m_big = cv2.resize(mask, (big.shape[1], big.shape[0]), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255
    m_big = cv2.GaussianBlur(m_big, (0, 0), 3 * S)[..., None]
    m_big = np.clip(m_big * 1.6, 0, 1)
    rng = np.random.default_rng(k)
    grain = rng.normal(0, 2.0, big.shape).astype(np.float32)
    out = big.astype(np.float32) * (1 - m_big) + (fill_big.astype(np.float32) + grain) * m_big

    if k in CROSS:
        x0, y0, x1, y1 = [int(v * S) for v in CROSS[k]]
        roi = out[y0:y1, x0:x1].clip(0, 255).astype(np.uint8)
        hsv = cv2.cvtColor(roi, cv2.COLOR_RGB2HSV)
        red = ((hsv[..., 0] < 10) | (hsv[..., 0] > 170)) & (hsv[..., 1] > 90) & (hsv[..., 2] > 70)
        hsv[..., 0][red] = 73
        out[y0:y1, x0:x1] = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)

    out = out.clip(0, 255).astype(np.uint8)
    pad = PAD_TOP.get(k, 0)
    if pad:
        pb = int(pad * S)
        top = out[: int(6 * S)].astype(np.float32).mean(axis=0)
        ext = np.repeat(top[None], pb, axis=0)
        ext = cv2.GaussianBlur(ext, (0, 0), sigmaX=12 * S, sigmaY=1)
        g = np.linspace(0, 1, pb)[:, None, None]
        ext = ext * (0.9 + 0.1 * g) + np.array([235, 244, 252], np.float32) * 0.1 * (1 - g)
        ext += np.random.default_rng(k + 50).normal(0, 1.5, ext.shape)
        out = np.vstack([ext.clip(0, 255).astype(np.uint8), out])
    Image.fromarray(out).save(out_dir / f"panel{k}.jpg", quality=93)

    # depth (MiDaS outputs inverse depth: larger = closer)
    inp = cv2.resize(small, (256, 256), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255
    inp = (inp - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    d = sess.run(None, {sess.get_inputs()[0].name: inp.transpose(2, 0, 1)[None].astype(np.float32)})[0][0]
    d = cv2.resize(d, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
    d = (d - np.percentile(d, 2)) / (np.percentile(d, 98) - np.percentile(d, 2) + 1e-6)
    d = cv2.GaussianBlur(np.clip(d, 0, 1), (0, 0), 3)
    if pad:
        d = np.vstack([np.repeat(d[:1], pad * 2, axis=0), d])
    Image.fromarray((d * 255).astype(np.uint8)).save(out_dir / f"depth{k}.png")
    meta[k] = {"w": w, "h": h + pad, "oy": pad, "img": [out.shape[1], out.shape[0]]}
    print(f"panel {k}: {w}x{h} -> {out.shape[1]}x{out.shape[0]} ({'esrgan' if up_path.exists() else 'lanczos'})")

(out_dir / "panels.json").write_text(json.dumps(meta, indent=1))
