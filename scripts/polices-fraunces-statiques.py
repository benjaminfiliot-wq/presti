# scripts/polices-fraunces-statiques.py — Fraunces (police de titre de la démo Lestraque) en graisses statiques : 300, 400, 600.
# Pourquoi (15/09, priorité 9 et performance sous charge) : la police variable unique (36,6 Ko) servait quatre graisses au
# chargement du téléphone (300, 400, 600, 700), et chaque graisse d'une variable est une instance à construire au premier
# rendu. Traces mobiles CPU ×4, 7 passes, médianes : TBT 338 ms avec la variable ; 213 ms avec des statiques 300 et 400
# préchargées (et la marque de la nav en 400) ; précharger le 300 seul ne gagne rien (348 ms), le 400 arrivait après le
# premier rendu et refaisait la mise en page. D'où : 300 et 400 préchargées, 600 (les questions) sans préchargement.
# On instancie depuis la police téléchargée par scripts/polices-demo.mjs (_polices/fraunces/fraunces.woff2) : rien n'est
# dessiné ni inventé, les glyphes sont ceux de la variable, figés à une graisse (licence OFL inchangée, copiée par generer.mjs).
#
# Usage : python scripts/polices-fraunces-statiques.py      (écrit _polices/fraunces/fraunces-300.woff2, -400, -600)
import os
import sys
sys.stdout.reconfigure(encoding="utf-8")
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ICI = os.path.dirname(os.path.abspath(__file__))
DOSSIER = os.path.join(ICI, '..', 'public', 'sites-demo', '_polices', 'fraunces')
SOURCE = os.path.join(DOSSIER, 'fraunces.woff2')
GRAISSES = (300, 400, 600)

if not os.path.exists(SOURCE):
    sys.exit(f'source absente : {SOURCE} (node scripts/polices-demo.mjs)')
for graisse in GRAISSES:
    police = instancer.instantiateVariableFont(TTFont(SOURCE), {'wght': graisse}, updateFontNames=False)
    police.flavor = 'woff2'
    cible = os.path.join(DOSSIER, f'fraunces-{graisse}.woff2')
    police.save(cible)
    # relecture : le fichier écrit s'ouvre, n'a plus d'axe, et garde tous les glyphes de la source
    relue = TTFont(cible)
    if 'fvar' in relue or relue['maxp'].numGlyphs != TTFont(SOURCE)['maxp'].numGlyphs:
        sys.exit(f'instance {graisse} invalide')
    print(f'  ✓ fraunces-{graisse}.woff2 : {os.path.getsize(cible)} octets, {relue["maxp"].numGlyphs} glyphes')
