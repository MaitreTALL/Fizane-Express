"""Voix off Tondraaga avec Chatterbox Multilingual (Resemble AI, licence MIT, usage commercial permis), lancé par le
runner GitHub (le modèle se télécharge depuis Hugging Face).

Chatterbox lit le texte en français avec le timbre et l'accent d'un court extrait de référence (10 s) :
voix/references/*.wav, extraits du corpus « African Accented French » (OpenSLR 57, Apache 2.0).
Réglages expressifs (exagération haute, guidage bas) pour une lecture plus vivante, façon publicité.

Configuration : voix/chatterbox.json
  {"etape": "echantillons"}                      lit voix/echantillon.json avec chacune des voix de "voix" ;
  {"etape": "complet", "choix": "h1", …}         lit toutes les phrases des deux vidéos avec la voix choisie.
Usage : python tondraaga-video/tools/chatterbox_voix.py <dossier de sortie>
"""
import json
import sys
import time
from pathlib import Path

import torch
import torchaudio

RACINE = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
CONF = json.loads((RACINE / "voix" / "chatterbox.json").read_text())
REG = {"exaggeration": .65, "cfg_weight": .35, "temperature": .8, **CONF.get("reglages", {})}
torch.set_num_threads(4)

import perth  # noqa: E402

# le filigrane audio de Chatterbox (perth) ne se charge pas toujours sur le runner : il n'est pas nécessaire ici
if getattr(perth, "PerthImplicitWatermarker", None) is None:
    class SansFiligrane:
        def apply_watermark(self, wav, sample_rate=None, **_):
            return wav
    perth.PerthImplicitWatermarker = SansFiligrane

from chatterbox.mtl_tts import ChatterboxMultilingualTTS  # noqa: E402

t0 = time.time()
modele = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
print(f"modèle chargé en {time.time() - t0:.0f} s")


def lire(texte, ref, graine, sortie, reg=None):
    torch.manual_seed(graine)
    t = time.time()
    wav = modele.generate(texte, language_id="fr", audio_prompt_path=str(RACINE / "voix" / "references" / f"{ref}.wav"), **(reg or REG))
    torchaudio.save(str(sortie), wav, modele.sr)
    print(f"  {sortie.name} : {wav.shape[1] / modele.sr:.1f} s en {time.time() - t:.0f} s  {texte}")


if CONF["etape"] == "echantillons":
    lignes = [l.get("tts", l["texte"]) for l in json.loads((RACINE / "voix" / "echantillon.json").read_text())["lignes"]]
    resume = []
    for n, v in enumerate(CONF["voix"], 1):
        print(f"voix {n} : {v['ref']} ({v['genre']})")
        reg = {**REG, **v.get("reglages", {})}
        for k, l in enumerate(lignes):
            try:
                lire(l, v["ref"], 1000 + k, OUT / f"voix{n}-{k}.wav", reg)
            except Exception as e:  # une phrase ratée ne doit pas tout arrêter
                print(f"  échec voix {n} phrase {k} : {e}")
        resume.append({"numero": n, **v})
    (OUT / "echantillons.json").write_text(json.dumps(resume, ensure_ascii=False, indent=1))

elif CONF["etape"] == "complet":
    v = next(x for x in CONF["voix"] if x["ref"] == CONF["choix"])
    reg = {**REG, **v.get("reglages", {})}
    for version in ("long", "court"):
        d = OUT / version; d.mkdir(exist_ok=True)
        for k, l in enumerate(json.loads((RACINE / "voix" / f"texte-{version}.json").read_text())["lignes"]):
            for essai in range(CONF.get("prises", 1)):
                lire(l.get("tts", l["texte"]), v["ref"], 2000 + k + 100 * essai, d / (f"l{k:02d}.wav" if essai == 0 else f"l{k:02d}-p{essai}.wav"), reg)
