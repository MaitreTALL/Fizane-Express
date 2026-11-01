"""Voix off ElevenLabs pour les vidéos Tondraaga (lancé par le runner GitHub, qui lit la clé ELEVENLABS_API_KEY).

Configuration : tondraaga-video/voix/elevenlabs.json
  {"etape": "echantillons"}                 cherche des voix françaises à accent africain dans la Voice Library,
                                            les ajoute au compte et lit le même texte avec 3 voix d'homme et 3 de femme ;
  {"etape": "complet", "voix": "<id>", …}   lit chaque phrase de voix/texte-long.json et voix/texte-court.json
                                            avec la voix choisie (une phrase = un fichier, placé ensuite par voix_place.py).

Usage : python3 tondraaga-video/tools/elevenlabs.py <dossier de sortie>
La clé n'est jamais écrite dans les journaux ni dans les fichiers.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

CLE = os.environ.get("ELEVENLABS_API_KEY", "").strip()
RACINE = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1])
CONF = json.loads((RACINE / "voix" / "elevenlabs.json").read_text())
API = "https://api.elevenlabs.io"
MODELE = CONF.get("modele", "eleven_multilingual_v2")
FORMAT = "mp3_44100_128"
AFRIQUE = ["afri", "ivoir", "ivory", "senegal", "sénégal", "camer", "congo", "burkin", "mali", "benin", "bénin", "togo",
           "guin", "niger", "gabon", "tchad", "chad", "abidjan", "dakar", "douala", "yaound", "kinshasa", "ouaga",
           "fr-ci", "fr-sn", "fr-cm", "fr-cd", "fr-bf", "fr-ml", "fr-bj", "fr-tg", "fr-ga", "fr-gn", "fr-ne"]
GRAVE = ["deep", "grave", "warm", "chaud", "rich", "riche", "powerful", "puissant", "confident", "bold", "strong",
         "resonant", "smooth", "velvet", "narrat", "advert", "commercial", "pub", "dynamic", "dynamique", "energetic"]


def appel(chemin, methode="GET", corps=None, brut=False):
    req = urllib.request.Request(API + chemin, method=methode, headers={"xi-api-key": CLE, "Content-Type": "application/json",
                                                                        "Accept": "audio/mpeg" if brut else "application/json"})
    if corps is not None:
        req.data = json.dumps(corps).encode()
    for essai in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = r.read()
                return d if brut else json.loads(d or b"{}")
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:400]
            if e.code in (429, 500, 502, 503) and essai < 3:
                time.sleep(4 * (essai + 1)); continue
            raise SystemExit(f"ElevenLabs {methode} {chemin.split('?')[0]} : HTTP {e.code} {msg}")


def texte_voix(v):
    champs = [v.get(k) or "" for k in ("name", "accent", "description", "descriptive", "locale", "use_case", "language")]
    for vl in v.get("verified_languages") or []:
        champs += [vl.get("accent") or "", vl.get("locale") or "", vl.get("language") or ""]
    return " ".join(champs).lower()


def chercher():
    vues = {}
    requetes = [{"language": "fr", "gender": g} for g in ("male", "female")]
    requetes += [{"search": s} for s in ("african french", "africain", "afrique", "ivoirien", "sénégalais", "camerounais", "burkinabè", "congolais")]
    for q in requetes:
        for page in range(4):
            params = dict(q, page_size=100, page=page)
            d = appel("/v1/shared-voices?" + urllib.parse.urlencode(params))
            for v in d.get("voices", []):
                vues.setdefault(v["voice_id"], v)
            if not d.get("has_more"):
                break
    retenues = []
    for v in vues.values():
        t = texte_voix(v)
        francais = (v.get("language") or "").startswith("fr") or any((vl.get("language") or "").startswith("fr") for vl in v.get("verified_languages") or [])
        if not francais or not any(a in t for a in AFRIQUE):
            continue
        score = sum(2 for g in GRAVE if g in t) + min(10, (v.get("cloned_by_count") or 0) / 200) + min(10, (v.get("usage_character_count_1y") or 0) / 2e6)
        if v.get("featured"): score += 3
        if v.get("use_case") in ("narrative_story", "advertisement", "characters_animation", "social_media"): score += 2
        retenues.append({"score": round(score, 2), "voice_id": v["voice_id"], "public_owner_id": v.get("public_owner_id"), "nom": v.get("name"),
                         "genre": v.get("gender"), "age": v.get("age"), "accent": v.get("accent"), "locale": v.get("locale"),
                         "description": (v.get("description") or "")[:300], "descriptif": v.get("descriptive"), "usage": v.get("use_case"),
                         "clones": v.get("cloned_by_count"), "apercu": v.get("preview_url")})
    retenues.sort(key=lambda r: -r["score"])
    return retenues


def dire(voice_id, texte, avant="", apres="", reglages=None):
    corps = {"text": texte, "model_id": MODELE, "voice_settings": reglages or CONF.get("reglages") or
             {"stability": 0.38, "similarity_boost": 0.82, "style": 0.42, "use_speaker_boost": True, "speed": 1.0}}
    if avant: corps["previous_text"] = avant
    if apres: corps["next_text"] = apres
    return appel(f"/v1/text-to-speech/{voice_id}?output_format={FORMAT}", "POST", corps, brut=True)


def ajouter(v):
    # une voix de la Voice Library doit être ajoutée au compte avant d'être utilisée
    mes = {x["voice_id"] for x in appel("/v1/voices").get("voices", [])}
    if v["voice_id"] in mes:
        return v["voice_id"]
    r = appel(f"/v1/voices/add/{v['public_owner_id']}/{v['voice_id']}", "POST", {"new_name": f"Tondraaga {v['nom']}"[:60]})
    return r.get("voice_id", v["voice_id"])


if not CLE:
    print("ELEVENLABS_API_KEY absente : rien à faire.")
    sys.exit(0)
OUT.mkdir(parents=True, exist_ok=True)

if CONF["etape"] == "echantillons":
    cands = chercher()
    (OUT / "candidats.json").write_text(json.dumps(cands, ensure_ascii=False, indent=1))
    print(f"{len(cands)} voix françaises à accent africain trouvées")
    exclues = set(CONF.get("exclure", []))
    choix = [c for c in cands if c["genre"] == "male" and c["voice_id"] not in exclues][:3] + \
            [c for c in cands if c["genre"] == "female" and c["voice_id"] not in exclues][:3]
    lignes = [l["texte"] if "tts" not in l else l["tts"] for l in json.loads((RACINE / "voix" / "echantillon.json").read_text())["lignes"]]
    resume = []
    for n, c in enumerate(choix, 1):
        vid = ajouter(c)
        for k, l in enumerate(lignes):
            (OUT / f"voix{n}-{k}.mp3").write_bytes(dire(vid, l, " ".join(lignes[:k])[-300:], " ".join(lignes[k + 1:])[:300]))
        resume.append({"numero": n, "voice_id": vid, **{k: c[k] for k in ("nom", "genre", "age", "accent", "locale", "descriptif", "description", "clones")}})
        print(f"voix {n} : {c['nom']} ({c['genre']}, {c['accent']})")
    (OUT / "echantillons.json").write_text(json.dumps(resume, ensure_ascii=False, indent=1))

elif CONF["etape"] == "complet":
    for version in ("long", "court"):
        lignes = json.loads((RACINE / "voix" / f"texte-{version}.json").read_text())["lignes"]
        d = OUT / version; d.mkdir(exist_ok=True)
        textes = [l.get("tts", l["texte"]) for l in lignes]
        for k, t in enumerate(textes):
            (d / f"l{k:02d}.mp3").write_bytes(dire(CONF["voix"], t, " ".join(textes[:k])[-300:], " ".join(textes[k + 1:])[:300]))
            print(f"{version} {k:02d} {lignes[k]['texte']}")
