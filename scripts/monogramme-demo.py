# scripts/monogramme-demo.py — le monogramme d'une démo (la marque de la nav et le favicon), tiré de la VRAIE police de titre
# du site : l'initiale du nom, vectorisée depuis _polices/<police>/<police>.woff2 à la graisse voulue. Pourquoi : la marque
# de Lestraque était un rond d'accent suivi du nom, le même sur les neuf démos, et l'onglet affichait l'icône de Presti
# (pas de <link rel=icon> : le navigateur prenait prestiapp.fr/favicon.ico — critique d'exhaustivité du 14/09).
# fontkit (non déclaré dans package.json) échoue sur ce woff2 variable ; fontTools, lui, instancie proprement.
#
# Usage : python scripts/monogramme-demo.py lestraque L fraunces 600
#   → public/sites-demo/_kit/monogrammes/lestraque.json  { lettre, police, graisse, viewBox, d }
import json
import os
import sys
sys.stdout.reconfigure(encoding="utf-8")
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

if len(sys.argv) < 5:
    sys.exit('usage : python scripts/monogramme-demo.py <site> <lettre> <police> <graisse>')
site, lettre, police, graisse = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
source = os.path.join(RACINE, 'public', 'sites-demo', '_polices', police, f'{police}.woff2')
if not os.path.exists(source):
    sys.exit(f'police absente : {source}')
f = TTFont(source)
if 'fvar' in f:
    axes = {a.axisTag: a for a in f['fvar'].axes}
    if 'wght' in axes:
        f = instancer.instantiateVariableFont(f, {'wght': max(axes['wght'].minValue, min(axes['wght'].maxValue, graisse))})
nom = f.getBestCmap().get(ord(lettre))
if not nom:
    sys.exit(f'« {lettre} » absent de {police}')
glyphes = f.getGlyphSet()
bornes = BoundsPen(glyphes)
glyphes[nom].draw(bornes)
x0, y0, x1, y1 = bornes.bounds
stylo = SVGPathPen(glyphes, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
# repère SVG : y vers le bas, origine au coin haut-gauche de la boîte du glyphe
glyphes[nom].draw(TransformPen(stylo, (1, 0, 0, -1, -x0, y1)))
sortie = os.path.join(RACINE, 'public', 'sites-demo', '_kit', 'monogrammes')
os.makedirs(sortie, exist_ok=True)
cible = os.path.join(sortie, f'{site}.json')
with open(cible, 'w', encoding='utf-8') as g:
    json.dump({'lettre': lettre, 'police': police, 'graisse': graisse, 'largeur': round(x1 - x0, 1), 'hauteur': round(y1 - y0, 1), 'd': stylo.getCommands()}, g, ensure_ascii=False)
    g.write('\n')
print(f'  ✓ {os.path.relpath(cible, RACINE)} : « {lettre} » {police} {graisse}, {round(x1 - x0)}×{round(y1 - y0)} unités, {len(stylo.getCommands())} signes')
