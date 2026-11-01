"""Ajout de la voix off dans un mixage : la musique (et les effets) s'effacent sous la voix (« ducking »)."""
import os
import wave

import numpy as np


def voix_et_ducking(N, SR, profondeur_db=9.0):
    """Lit la voix off (variable d'environnement VOIX) ; renvoie (voix stéréo, gain à appliquer au reste) ou (None, None)."""
    chemin = os.environ.get("VOIX")
    if not chemin:
        return None, None
    w = wave.open(chemin)
    assert w.getframerate() == SR
    v = np.frombuffer(w.readframes(w.getnframes()), "<i2").reshape(-1, w.getnchannels()).astype(np.float64) / 32768
    if v.shape[1] == 1:
        v = np.repeat(v, 2, axis=1)
    voix = np.zeros((N, 2)); voix[: min(N, len(v))] = v[:N]
    rms = np.sqrt(np.convolve(voix.mean(1) ** 2, np.ones(int(.05 * SR)) / int(.05 * SR), "same"))
    actif = (rms > .02).astype(float)
    # attaque 60 ms, relâchement 450 ms
    g = np.zeros(N); a, r = 1 / (.06 * SR), 1 / (.45 * SR); x = 0.0
    for i in range(0, N, 64):
        cible = actif[i]
        x = min(cible, x + a * 64) if cible > x else max(cible, x - r * 64)
        g[i:i + 64] = x
    gain = 1 - (1 - 10 ** (-profondeur_db / 20)) * g
    return voix, gain
