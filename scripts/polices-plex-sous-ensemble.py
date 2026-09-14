# scripts/polices-plex-sous-ensemble.py — IBM Plex Sans pour la démo Lestraque, en deux graisses statiques (400 et 600),
# réduites au latin de base, au latin-1, au latin étendu A et à la ponctuation française. Pourquoi : la variable 100-700
# complète (45,7 Ko, font-display optional, sans préchargement) ratait la fenêtre de 100 ms au premier passage en ligne — le
# texte sortait en Segoe UI (mesure CDP getPlatformFontsForNode, critique d'exhaustivité du 14/09). Deux fichiers
# préchargés par generer.mjs arrivent à temps. On instancie depuis la police téléchargée par scripts/polices-demo.mjs :
# rien n'est dessiné ni inventé ici, seulement réduit et réuni (licence OFL inchangée, copiée à côté par le générateur).
#
# Latin étendu A (14/09, juge) : le « š » et le « ć » de « Milošević », l'auteur du héros, sortaient en Segoe UI dans les
# crédits — le fichier « latin » de Google Fonts s'arrête à U+00FF. Leurs contours viennent du fichier « latin-ext » de la même
# police et de la même version (IBM Plex Sans 3.201, variable wght 100-700, servi par Google Fonts), conservé à côté sous
# ibm-plex-sans-latin-ext.woff2 ; à défaut, il est repris du cache de next/font (.next/static/media), sans téléchargement.
# Les glyphes sont copiés décomposés dans l'instance latine de même graisse (sans crénage propre, sans rien redessiner).
#
# Il écrit aussi couverture.json : les points de code que les deux graisses rendent. generer.mjs refuse une page dont le
# texte visible sort de cette couverture (un caractère qui tomberait sur la police du système).
#
# Usage : python scripts/polices-plex-sous-ensemble.py      (écrit _polices/ibm-plex-sans/ibm-plex-sans-400.woff2, -600.woff2, couverture.json)
import glob
import io
import json
import os
import shutil
import sys
sys.stdout.reconfigure(encoding="utf-8")
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOSSIER = os.path.join(RACINE, 'public', 'sites-demo', '_polices', 'ibm-plex-sans')
SOURCE = os.path.join(DOSSIER, 'ibm-plex-sans.woff2')
SOURCE_EXT = os.path.join(DOSSIER, 'ibm-plex-sans-latin-ext.woff2')
# latin de base, latin-1 (é, à, ç, « », ·, espace insécable, ²), latin étendu A (š, ć, ł, œ…), Ÿ, tirets, apostrophes et
# guillemets typographiques, puce, points de suspension, euro, flèche, moins
UNICODES = 'U+0020-007E,U+00A0-00FF,U+0100-017F,U+0178,U+2013-2014,U+2018-201A,U+201C-201E,U+2022,U+2026,U+2039-203A,U+20AC,U+2192,U+2212'
EXT = range(0x0100, 0x0180)


def est_plex_ext(chemin):
    try:
        t = TTFont(chemin, lazy=True)
        c = t.getBestCmap() or {}
        axes = [a.axisTag for a in t['fvar'].axes] if 'fvar' in t else []
        return t['name'].getDebugName(1) == 'IBM Plex Sans' and 0x0161 in c and 0x0107 in c and axes == ['wght'] and t['name'].getDebugName(5) == TTFont(SOURCE, lazy=True)['name'].getDebugName(5)
    except Exception:
        return False


if not os.path.exists(SOURCE) or os.path.getsize(SOURCE) < 8000:
    sys.exit(f'police source absente ou tronquée : {SOURCE} (node scripts/polices-demo.mjs)')
if not os.path.exists(SOURCE_EXT):
    candidats = [f for f in glob.glob(os.path.join(RACINE, '.next', 'static', 'media', '*.woff2')) if est_plex_ext(f)]
    if not candidats:
        sys.exit(f'latin étendu absent : {SOURCE_EXT} (fichier « latin-ext » d’IBM Plex Sans 3.201 de Google Fonts ; next/font le met en cache dans .next/static/media)')
    shutil.copyfile(candidats[0], SOURCE_EXT)
    print(f'  ✓ latin étendu repris de {os.path.relpath(candidats[0], RACINE)}')
if not est_plex_ext(SOURCE_EXT):
    sys.exit(f'{SOURCE_EXT} : pas IBM Plex Sans de la même version, ou sans š / ć')


def reunir(latine, etendue):
    """Copie dans `latine` les glyphes du latin étendu A que `etendue` possède et qu'elle n'a pas (contours décomposés)."""
    cmap_l, cmap_e = latine.getBestCmap(), etendue.getBestCmap()
    jeu = etendue.getGlyphSet()
    glyf, hmtx = latine['glyf'], latine['hmtx']
    ordre = latine.getGlyphOrder()
    ajouts = {}
    for cp in EXT:
        if cp in cmap_l or cp not in cmap_e:
            continue
        nom_src, nom = cmap_e[cp], f'uni{cp:04X}'
        enreg = DecomposingRecordingPen(jeu)
        jeu[nom_src].draw(enreg)
        pen = TTGlyphPen(None)
        enreg.replay(pen)
        g = pen.glyph()
        ordre.append(nom)
        ajouts[cp] = nom
        glyf.glyphs[nom] = g
        g.recalcBounds(glyf)
        hmtx.metrics[nom] = (etendue['hmtx'][nom_src][0], getattr(g, 'xMin', 0))
    latine.setGlyphOrder(ordre)
    glyf.glyphOrder = ordre
    for table in latine['cmap'].tables:
        if table.isUnicode():
            table.cmap.update(ajouts)
    return len(ajouts)


couvertures = []
for graisse in (400, 600):
    police = instancer.instantiateVariableFont(TTFont(SOURCE), {'wght': graisse})
    etendue = instancer.instantiateVariableFont(TTFont(SOURCE_EXT), {'wght': graisse})
    n = reunir(police, etendue)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk']
    options.name_IDs = ['*']
    options.hinting = False
    options.notdef_outline = True
    sous = subset.Subsetter(options)
    sous.populate(unicodes=subset.parse_unicodes(UNICODES))
    sous.subset(police)
    police.flavor = 'woff2'
    tampon = io.BytesIO()
    police.save(tampon)
    octets = tampon.getvalue()
    if len(octets) < 8000:
        sys.exit(f'sous-ensemble {graisse} suspect : {len(octets)} octets')
    relue = TTFont(io.BytesIO(octets))
    cmap = relue.getBestCmap()
    for cp in (0x0161, 0x0107, 0x2019, 0x00E9):
        if cp not in cmap:
            sys.exit(f'sous-ensemble {graisse} : U+{cp:04X} manque')
    couvertures.append(set(cmap))
    cible = os.path.join(DOSSIER, f'ibm-plex-sans-{graisse}.woff2')
    with open(cible, 'wb') as f:
        f.write(octets)
    print(f'  ✓ {os.path.relpath(cible, RACINE)} : {len(octets)} octets ({n} glyphes du latin étendu A ajoutés)')

commune = sorted(set.intersection(*couvertures))
with open(os.path.join(DOSSIER, 'couverture.json'), 'w', encoding='utf-8') as f:
    json.dump({'_': 'Points de code rendus par ibm-plex-sans-400.woff2 ET -600.woff2 (scripts/polices-plex-sous-ensemble.py) ; lu par generer.mjs', 'points': commune}, f)
print(f'  ✓ couverture.json : {len(commune)} points de code')
