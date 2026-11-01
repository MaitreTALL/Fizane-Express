"""Découpe le logo Tondraaga en calques (lettres, panier, anse, produits, slogan) pour l'animation d'entrée.

Les pixels viennent tels quels de src/assets/logo-crop.png : aucune lettre n'est redessinée,
seules les pièces sont séparées pour être animées une à une.

Usage : python3 tools/decouper_logo.py
Écrit src/assets/logo-pieces/*.png et src/assets/logo-pieces.js (positions dans le logo d'origine).
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
src = Image.open(ROOT / "src/assets/logo-crop.png").convert("RGBA")
a = np.array(src)
alpha = a[:, :, 3]
H, W = alpha.shape
masque = alpha > 0
COUPE = 268  # ligne qui sépare le nom du slogan

# composantes du nom (au-dessus de la coupe), avec un seuil bas pour garder l'anticrénelage
lab, n = ndimage.label(masque[:COUPE], structure=np.ones((3, 3)))
objs = ndimage.find_objects(lab)
comps = []
for i, sl in enumerate(objs):
    comps.append({"id": i + 1, "x0": sl[1].start, "x1": sl[1].stop, "y0": sl[0].start, "y1": sl[0].stop, "aire": int((lab[sl] == i + 1).sum())})

pieces = {}


def ajoute(nom, ids, extra=None):
    m = np.zeros_like(masque)
    m[:COUPE] = np.isin(lab, ids)
    if extra is not None:
        m |= extra
    pieces[nom] = m


lettres = [c for c in comps if c["aire"] > 8000 and not (c["y0"] >= 175 and 1050 < c["x0"] < 1240)]
lettres.sort(key=lambda c: c["x0"])
noms = ["T", "o", "n", "d", "r", "a1", "a2", "a3"]
for nom, c in zip(noms, lettres):
    ajoute(nom, [c["id"]])

# le « g » : corps sous le panier + jambage qui descend sous la coupe (à droite du slogan)
g = next(c for c in comps if c["y0"] >= 175 and 1050 < c["x0"] < 1240 and c["aire"] > 5000)
bas_g = np.zeros_like(masque)
bas_g[COUPE:, 1050:] = masque[COUPE:, 1050:]
ajoute("g", [g["id"]], bas_g)

# le panier : anse, produits, bord, tressage
panier = [c for c in comps if c["x0"] >= 1055 and c["x1"] <= 1245 and c["id"] != g["id"] and c not in lettres]
anse = max((c for c in panier if c["y0"] < 30), key=lambda c: c["aire"])
bord = max((c for c in panier if 110 <= c["y0"] <= 125 and c["x1"] - c["x0"] > 150), key=lambda c: c["aire"])
produits = sorted([c for c in panier if c["y1"] <= 116 and c["y0"] >= 40 and c is not anse], key=lambda c: c["x0"])
tressage = [c for c in panier if c is not anse and c is not bord and c not in produits]
ajoute("anse", [anse["id"]])
ajoute("bord", [bord["id"]])
ajoute("tressage", [c["id"] for c in tressage])
for i, c in enumerate(produits):
    ajoute(f"produit{i + 1}", [c["id"]])

# slogan, lettre par lettre (sous la coupe, à gauche du « g »)
lab2, n2 = ndimage.label(masque[COUPE:, :1050], structure=np.ones((3, 3)))
objs2 = sorted(((sl[1].start, i + 1) for i, sl in enumerate(ndimage.find_objects(lab2))))
# regroupe les accents avec leur lettre (composantes qui se chevauchent en x)
groupes = []
for x0, i in objs2:
    sl = ndimage.find_objects(lab2)[i - 1]
    if groupes and sl[1].start < groupes[-1]["x1"] - 2:
        groupes[-1]["ids"].append(i); groupes[-1]["x1"] = max(groupes[-1]["x1"], sl[1].stop)
    else:
        groupes.append({"ids": [i], "x1": sl[1].stop})
for k, gr in enumerate(groupes):
    m = np.zeros_like(masque)
    m[COUPE:, :1050] = np.isin(lab2, gr["ids"])
    pieces[f"s{k:02d}"] = m

# export : chaque pièce recadrée, avec une marge pour l'anticrénelage
out = ROOT / "src/assets/logo-pieces"
out.mkdir(exist_ok=True)
for f in out.glob("*.png"):
    f.unlink()
infos = {}
pris = np.zeros_like(masque)
for nom, m in pieces.items():
    m = ndimage.binary_dilation(m, iterations=1) & masque & ~pris
    pris |= m
    ys, xs = np.where(m)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    calque = a.copy()
    calque[~m] = 0
    Image.fromarray(calque[y0:y1, x0:x1]).save(out / f"{nom}.png", optimize=True)
    infos[nom] = [int(x0), int(y0), int(x1 - x0), int(y1 - y0)]
reste = masque & ~pris
print(f"{len(infos)} pièces ; pixels non attribués : {int(reste.sum())}")
(ROOT / "src/assets/logo-pieces.js").write_text(
    "// Pièces du logo Tondraaga (découpées par tools/decouper_logo.py) : [x, y, largeur, hauteur] dans logo-crop.png (1396 × 370)\n"
    "window.LOGO_PIECES = " + json.dumps(infos) + ";\n")
print(", ".join(infos))
