"""Isolate the voice from a music-backed recording with the UVR MDX-Net Voc_FT model (ONNX).

Usage: python3 -I tools/separate_vocals.py <in.wav (44.1 kHz stereo)> <model.onnx> <vocals.wav>
"""
import sys
import wave

import numpy as np
import onnxruntime as ort

N_FFT, HOP, DIM_F, DIM_T, COMP = 7680, 1024, 3072, 256, 1.021
WIN = 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(N_FFT) / N_FFT)  # periodic Hann


def stft(x):  # x: [ch, n] -> [ch, bins, frames]
    pad = N_FFT // 2
    x = np.pad(x, ((0, 0), (pad, pad)), mode="reflect")
    n = 1 + (x.shape[1] - N_FFT) // HOP
    idx = np.arange(N_FFT)[None, :] + HOP * np.arange(n)[:, None]
    return np.stack([np.fft.rfft(c[idx] * WIN, axis=1).T for c in x])


def istft(s, length):  # s: [ch, bins, frames]
    n = s.shape[2]
    out = np.zeros((s.shape[0], N_FFT + HOP * (n - 1)))
    norm = np.zeros(N_FFT + HOP * (n - 1))
    frames = np.fft.irfft(s.transpose(0, 2, 1), n=N_FFT, axis=2) * WIN
    for i in range(n):
        out[:, i * HOP:i * HOP + N_FFT] += frames[:, i]
        norm[i * HOP:i * HOP + N_FFT] += WIN ** 2
    out /= np.maximum(norm, 1e-8)
    pad = N_FFT // 2
    return out[:, pad:pad + length]


def main(src, model, dst):
    with wave.open(src) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        mix = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32).reshape(-1, ch).T / 32768
    if ch == 1:
        mix = np.vstack([mix, mix])
    sess = ort.InferenceSession(model)
    name = sess.get_inputs()[0].name
    chunk = HOP * (DIM_T - 1)
    trim = N_FFT // 2
    gen = chunk - 2 * trim
    n = mix.shape[1]
    pad = gen - n % gen
    mp = np.concatenate([np.zeros((2, trim)), mix, np.zeros((2, pad)), np.zeros((2, trim))], axis=1)
    outs = []
    for i in range(0, n + pad, gen):
        wav = mp[:, i:i + chunk]
        spec = stft(wav)[:, :, :DIM_T]                       # [2, bins, T]
        x = np.stack([spec.real, spec.imag], axis=1)          # [2, 2, bins, T]
        x = x.reshape(1, 4, -1, DIM_T)[:, :, :DIM_F].astype(np.float32)
        y = sess.run(None, {name: x})[0]                       # [1, 4, F, T]
        full = np.zeros((1, 4, N_FFT // 2 + 1, DIM_T), np.float32)
        full[:, :, :DIM_F] = y
        full = full.reshape(2, 2, N_FFT // 2 + 1, DIM_T)
        cs = full[:, 0] + 1j * full[:, 1]
        outs.append(istft(cs, chunk)[:, trim:-trim])
    voc = np.concatenate(outs, axis=1)[:, :n] * COMP
    with wave.open(dst, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(voc.T, -1, 1) * 32767).astype(np.int16).tobytes())
    print(f"{n / sr:.1f}s separated -> {dst}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
