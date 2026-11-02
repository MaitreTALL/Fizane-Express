"""Voix off Tondraaga avec Chatterbox Multilingual (Resemble AI, licence MIT, usage commercial permis), lancé par le
workflow GitHub « Tondraaga voix off » (le modèle se télécharge depuis Hugging Face, le travail est réparti sur
plusieurs machines).

Chatterbox lit le texte en français avec le timbre et l'accent d'un court extrait de référence (10 s) :
voix/references/*.wav, extraits du corpus « African Accented French » (OpenSLR 57, Apache 2.0).

Chaque phrase est lue plusieurs fois (graines différentes) ; une reconnaissance vocale (faster-whisper) vérifie que le
texte est bien dit, et parmi les prises justes on garde la plus vivante (amplitude de l'intonation, énergie).

Configuration : voix/chatterbox.json
  "etape": "echantillons"  lit voix/echantillon.json avec chaque variante de "variantes" ;
  "etape": "complet"       lit toutes les phrases de voix/texte-long.json et voix/texte-court.json avec la variante
                           "choix".
Usage : python tondraaga-video/tools/chatterbox_voix.py <dossier de sortie> [part] [parts]
"""
import json
import re
import sys
import time
import unicodedata
from pathlib import Path

import numpy as np
import torch
import torchaudio

RACINE = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
PART, PARTS = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (0, 1)
CONF = json.loads((RACINE / "voix" / "chatterbox.json").read_text())
PRISES = CONF.get("prises", 3)
torch.set_num_threads(4)

import perth  # noqa: E402

# le filigrane audio de Chatterbox (perth) ne se charge pas toujours sur le runner : il n'est pas nécessaire ici
if getattr(perth, "PerthImplicitWatermarker", None) is None:
    class SansFiligrane:
        def apply_watermark(self, wav, sample_rate=None, **_):
            return wav
    perth.PerthImplicitWatermarker = SansFiligrane

import librosa  # noqa: E402
from chatterbox.mtl_tts import ChatterboxMultilingualTTS  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402

# ---------------------------------------------------------------- liste des phrases à dire, répartie entre les machines
taches = []
if CONF["etape"] == "echantillons":
    lignes = json.loads((RACINE / "voix" / "echantillon.json").read_text())["lignes"]
    for v in CONF["variantes"]:
        for k, l in enumerate(lignes):
            taches.append((f"echantillons/{v['id']}-{k}", l, v))
else:
    v = next(x for x in CONF["variantes"] if x["id"] == CONF["choix"])
    for version in ("long", "court"):
        for k, l in enumerate(json.loads((RACINE / "voix" / f"texte-{version}.json").read_text())["lignes"]):
            taches.append((f"{version}/l{k:02d}", l, v))
taches = taches[PART::PARTS]
print(f"machine {PART + 1}/{PARTS} : {len(taches)} phrases × {PRISES} prises")

t0 = time.time()
modele = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
asr = WhisperModel(CONF.get("asr", "small"), device="cpu", compute_type="int8", cpu_threads=4)
print(f"modèles chargés en {time.time() - t0:.0f} s")
VOCAB = "Tondraaga, Faso Dan Fani, Koko Dunda, kinkéliba, soumbala, karité, bissap, fonio, Bobo-Dioulasso, Ouagadougou, Burkina, Mobile Money."


def mots(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-z0-9]+", s)


def wer(ref, hyp):
    r, h = mots(ref), mots(hyp)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (r[i - 1] != h[j - 1]))
    return d[len(h)] / max(1, len(r))


def vivacite(wav, sr):
    """Amplitude de l'intonation (écart type en demi-tons) et contraste d'énergie (dB)."""
    f0 = librosa.yin(wav, fmin=60, fmax=400, sr=sr, frame_length=1024, hop_length=240)
    rms = librosa.feature.rms(y=wav, frame_length=1024, hop_length=240)[0][: len(f0)]
    voise = rms > rms.max() * .12
    f = f0[: len(voise)][voise]
    st = np.std(12 * np.log2(f / np.median(f))) if len(f) > 10 else 0
    db = 20 * np.log10(rms[voise] + 1e-6) if voise.any() else np.zeros(1)
    return float(st), float(np.percentile(db, 90) - np.percentile(db, 20))


refs = {}
for nom, l, v in taches:
    texte = l.get("tts", l["texte"])
    reg = {"exaggeration": .65, "cfg_weight": .35, "temperature": .8, **CONF.get("reglages", {}), **v.get("reglages", {})}
    chemin = str(RACINE / "voix" / "references" / f"{v['ref']}.wav")
    prises = []
    for p in range(PRISES):
        torch.manual_seed(1000 * p + 7 + len(nom))
        t = time.time()
        try:
            wav = modele.generate(texte, language_id="fr", audio_prompt_path=chemin, **reg).squeeze(0).numpy()
        except Exception as e:
            print(f"  {nom} prise {p} : échec {e}"); continue
        seg, _ = asr.transcribe(librosa.resample(wav, orig_sr=modele.sr, target_sr=16000), language="fr", beam_size=5,
                                initial_prompt=VOCAB, vad_filter=False)
        dit = " ".join(s.text for s in seg).strip()
        w = wer(l["texte"], dit)
        st, dyn = vivacite(wav, modele.sr)
        duree = len(wav) / modele.sr
        prevue = max(1.2, len(texte) / 13.5)
        score = w * 6 - st * .35 - dyn * .02 + max(0, duree / prevue - 1.5) * 2
        prises.append({"prise": p, "wav": wav, "dit": dit, "wer": round(w, 3), "intonation": round(st, 2), "contraste": round(dyn, 1),
                       "duree": round(duree, 2), "score": round(score, 3)})
        print(f"  {nom} prise {p} : {duree:.1f} s en {time.time() - t:.0f} s, erreurs {w:.0%}, intonation {st:.1f} dt  « {dit} »")
    if not prises:
        continue
    meilleure = min(prises, key=lambda x: x["score"])
    sortie = OUT / f"{nom}.wav"; sortie.parent.mkdir(parents=True, exist_ok=True)
    torchaudio.save(str(sortie), torch.from_numpy(meilleure["wav"]).unsqueeze(0), modele.sr)
    (OUT / f"{nom}.json").write_text(json.dumps({"texte": l["texte"], "variante": v["id"], "retenue": meilleure["prise"],
                                                 "prises": [{k: x[k] for k in x if k != "wav"} for x in prises]}, ensure_ascii=False, indent=1))
    print(f"→ {nom} : prise {meilleure['prise']} retenue")
