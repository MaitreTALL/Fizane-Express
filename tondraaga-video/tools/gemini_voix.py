"""Voix off Tondraaga avec les voix de synthèse de Google AI Studio (API Gemini, modèles « TTS »).

Le ton se règle par une consigne en langage naturel (animateur radio de Ouagadougou, voix chaude et puissante,
très vivante…). Chaque version est lue d'une traite (meilleure continuité, peu d'appels : l'offre gratuite d'AI Studio
limite le nombre de requêtes par jour), avec une pause entre les phrases, puis découpée phrase par phrase sur les silences.

Configuration : voix/gemini.json
  "etape": "echantillons"  lit voix/echantillon.json avec chaque voix de "voix" (un fichier par voix) ;
  "etape": "complet"       lit voix/texte-long.json et voix/texte-court.json avec la voix "choix", puis découpe
                           en l00.wav, l01.wav… (placés ensuite par voix_place.py).
Usage : python3 tondraaga-video/tools/gemini_voix.py <dossier de sortie>
La clé (GEMINI_API_KEY) n'est jamais écrite dans les journaux ni dans les fichiers.
"""
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

CLE = os.environ.get("GEMINI_API_KEY", "").strip()
RACINE = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1])
CONF = json.loads((RACINE / "voix" / "gemini.json").read_text())
API = "https://generativelanguage.googleapis.com/v1beta"
SR = 24000


def appel(chemin, corps=None, essais=3):
    req = urllib.request.Request(API + chemin, method="POST" if corps else "GET",
                                 headers={"x-goog-api-key": CLE, "Content-Type": "application/json"})
    if corps:
        req.data = json.dumps(corps).encode()
    for essai in range(essais):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")
            if e.code in (429, 500, 503) and essai < essais - 1:
                attente = 30 * (essai + 1)
                m = re.search(r'"retryDelay":\s*"(\d+)s"', msg)
                if m: attente = int(m.group(1)) + 2
                if attente > 90:   # quota du jour épuisé : inutile d'attendre, on passe au modèle suivant
                    raise SystemExit(f"Gemini {chemin.split('?')[0]} : HTTP {e.code} quota épuisé (réessai dans {attente // 3600} h)")
                print(f"  HTTP {e.code}, nouvel essai dans {attente} s")
                time.sleep(attente); continue
            raise SystemExit(f"Gemini {chemin.split('?')[0]} : HTTP {e.code} {msg[:500]}")


def choisir_modele():
    modeles = []
    page = ""
    while True:
        d = appel(f"/models?pageSize=200{page}")
        modeles += [m["name"].split("/")[-1] for m in d.get("models", []) if "tts" in m["name"].lower()
                    and "generateContent" in m.get("supportedGenerationMethods", [])]
        if not d.get("nextPageToken"):
            break
        page = f"&pageToken={d['nextPageToken']}"
    print("modèles de voix disponibles :", ", ".join(modeles) or "aucun")
    if not modeles:
        raise SystemExit("aucun modèle TTS disponible pour cette clé")
    # d'abord ceux demandés, puis les « pro », puis les autres (les plus récents d'abord)
    ordre = [m for m in CONF.get("modeles", []) if m in modeles]
    ordre += [m for m in sorted(modeles, reverse=True) if "pro" in m and m not in ordre]
    ordre += [m for m in sorted(modeles, reverse=True) if m not in ordre]
    return ordre


def dire(modeles, voix, consigne, lignes):
    """Essaie les modèles dans l'ordre : un modèle hors quota (offre gratuite) passe la main au suivant."""
    while modeles:
        try:
            return dire1(modeles[0], voix, consigne, lignes)
        except SystemExit as e:
            if "HTTP 429" in str(e) or "HTTP 403" in str(e) or "HTTP 404" in str(e):
                print(f"  {modeles[0]} indisponible ({str(e)[:160]}), modèle suivant")
                modeles.pop(0); continue
            raise
    raise SystemExit("aucun modèle n'a accepté la demande")


def invite(v, lignes, pauses):
    """Invite structurée (profil, scène, notes du réalisateur, transcription) : seule la transcription est lue."""
    return CONF["gabarit"].format(profil=v["profil"], pauses=pauses, texte="\n".join(lignes))


def dire1(modele, voix, texte, lignes, essais=3):
    d = appel(f"/models/{modele}:generateContent", essais=essais, corps={
        "contents": [{"parts": [{"text": texte}]}],
        "generationConfig": {"responseModalities": ["AUDIO"], "temperature": CONF.get("temperature", 1.0),
                             "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voix}}}}})
    try:
        b64 = d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
    except (KeyError, IndexError):
        raise SystemExit(f"réponse sans audio : {json.dumps(d)[:400]}")
    return base64.b64decode(b64)


def ecrire(chemin, pcm):
    chemin.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(chemin), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)


def decouper(pcm, n):
    """Coupe la lecture en n phrases sur les n-1 plus longs silences."""
    import array
    a = array.array("h"); a.frombytes(pcm)
    pas = SR // 100
    env = [max(abs(x) for x in a[i:i + pas]) if a[i:i + pas] else 0 for i in range(0, len(a), pas)]
    seuil = max(env) * .04
    silences, debut = [], None
    for i, e in enumerate(env + [seuil + 1]):
        if e < seuil and debut is None: debut = i
        elif e >= seuil and debut is not None:
            if debut > 0 and i < len(env): silences.append((i - debut, debut, i))
            debut = None
    coupes = sorted(sorted(silences, reverse=True)[: n - 1], key=lambda s: s[1])
    if len(coupes) < n - 1:
        raise SystemExit(f"seulement {len(coupes) + 1} phrases trouvées pour {n}")
    bornes = [0] + [(s[1] + s[2]) // 2 for s in coupes] + [len(env)]
    return [a[bornes[k] * pas: bornes[k + 1] * pas].tobytes() for k in range(n)]


if not CLE:
    print("GEMINI_API_KEY absente : rien à faire (ajouter le secret de dépôt GEMINI_API_KEY).")
    sys.exit(0)
print("clé présente")
modele = choisir_modele()
print("ordre des modèles :", ", ".join(modele))

if CONF["etape"] == "echantillons":
    lignes = [l["texte"] for l in json.loads((RACINE / "voix" / "echantillon.json").read_text())["lignes"]]
    resume = []
    seules = {int(x) for x in os.environ.get("SEULES", "").split(",") if x}
    for n, v in enumerate(CONF["voix"], 1):
        if seules and n not in seules:
            continue
        try:
            pcm = dire(modele, v["nom"], invite(v, lignes, CONF["pauses_echantillon"]), lignes)
        except SystemExit as e:
            print(f"voix {n} {v['nom']} : {e}"); continue
        ecrire(OUT / "echantillons" / f"voix{n}.wav", pcm)
        resume.append({"numero": n, "modele": modele[0], **v})
        print(f"voix {n} : {v['nom']} ({len(pcm) / 2 / SR:.1f} s)")
        time.sleep(CONF.get("pause_entre_appels", 22))
    (OUT / "echantillons" / "echantillons.json").write_text(json.dumps(resume, ensure_ascii=False, indent=1))

elif CONF.get("par_ligne"):
    # une demande par phrase : chaque phrase tombe exactement à sa place ; même modèle du début à la fin
    import array
    v = next(x for x in CONF["voix"] if x["nom"] == CONF["choix"])
    for version in [x for x in ("court", "long") if x in os.environ.get("VERSIONS", "court,long")]:
        lignes = [l["texte"] for l in json.loads((RACINE / "voix" / f"texte-{version}.json").read_text())["lignes"]]
        for k, ligne in enumerate(lignes):
            sortie = OUT / version / f"l{k:02d}.wav"
            if sortie.exists() and os.environ.get("REFAIRE") is None:
                continue
            pcm = dire1(modele[0], v["nom"], invite(v, [ligne], CONF["pauses_echantillon"]), [ligne], essais=8)
            ecrire(sortie, pcm)
            print(f"{version} {k:02d} : {len(pcm) / 2 / SR:.1f} s  {ligne}", flush=True)
            time.sleep(CONF.get("pause_par_ligne", 7))

else:
    v = next(x for x in CONF["voix"] if x["nom"] == CONF["choix"])
    for version in [x for x in ("long", "court") if x in os.environ.get("VERSIONS", "court,long")]:
        lignes = [l.get("tts", l["texte"]) for l in json.loads((RACINE / "voix" / f"texte-{version}.json").read_text())["lignes"]]
        pcm = dire(modele, v["nom"], invite(v, lignes, CONF["pauses_complet"]), lignes)
        ecrire(OUT / "lecture-unique" / version / "complet.wav", pcm)
        print(f"{version} : {len(pcm) / 2 / SR:.1f} s, {len(lignes)} phrases (découpage : tools/decouper_lecture.py)")
        time.sleep(CONF.get("pause_entre_appels", 22))
