// assembler.mjs <variante> — écrit bloc.css (le bloc exact de la variante retenue) et mesures.json (relevés des trois formats,
// films, vérification temps réel), à partir des fichiers de travail.
import fs from 'node:fs'
import { DIR, TRAVAIL, bloc } from './outils.mjs'
const [nom] = process.argv.slice(2)
const v = JSON.parse(fs.readFileSync(TRAVAIL + `var-${nom}.json`, 'utf8'))
fs.writeFileSync(DIR + 'bloc.css', bloc(v.params))
const lire = (f) => (fs.existsSync(TRAVAIL + f) ? JSON.parse(fs.readFileSync(TRAVAIL + f, 'utf8')) : null)
const formats = ['1088x800', '1280x800', '1440x900']
const m = {
  candidat: 'L2 — lumière rasante (cahier-des-charges.md §3.5)',
  variante: nom,
  params: v.params,
  bloc: 'bloc.css',
  conditions: {
    page: 'https://prestiapp.fr/sites-demo/lestraque/index.html (commit c62c866 en ligne), classe da--signature ajoutée et bloc injecté dans le navigateur de test seulement',
    navigateur: 'Chromium de Playwright, chromium.launch() sans aucun drapeau (sans carte graphique)',
    temps: 'toutes les animations de DocumentTimeline en pause, currentTime = t ms (voir outils.mjs, positionner) ; captures PNG ; réduction grise 160 px (fonctions gris/ecart de cahier/cdc-c2-variantes.mjs)',
  },
  resume: {},
  formats: {},
  films: {},
  verifTempsReel: lire('verif-temps-reel.json'),
}
for (const f of formats) {
  const x = lire(`mesures-${f}.json`); if (!x) continue
  const c = x.candidat, t = x.temoinEnLigne
  const sansDiffs = (o) => { const { diffsParPaire, ...r } = o; return { ...r, diffsParPaire: diffsParPaire.map((d) => +d.toFixed(4)) } }
  m.formats[f] = { candidat: { ...c, C2b: sansDiffs(c.C2b) }, temoinEnLigne: { ...t, C2b: sansDiffs(t.C2b) } }
  m.resume[f] = {
    relief: c.relief,
    'C2-a part>8 (2,5→5 ; 5→8)': [c.C2a.paire_2500_5000.part8, c.C2a.paire_5000_8000.part8], 'C2-a tenu (≥ 0,56)': c.C2a.tenu,
    'C2-a témoin en ligne': [t.C2a.paire_2500_5000.part8, t.C2a.paire_5000_8000.part8],
    'C2-b écart moyen / plage figée (s)': [c.C2b.ecartMoyenParImage, c.C2b.plusLongFige_s], 'C2-b tenu': c.C2b.tenu,
    'C2-b témoin en ligne': [t.C2b.ecartMoyenParImage, t.C2b.plusLongFige_s],
    'C2-c écart max entre images / paires > 0,085': [c.C2c.ecartMaxPaire, c.C2c.pairesAuDessus0085], 'C2-c tenu': c.C2c.tenu,
    'C6-a écart |a−b| moyen zone marches t25→t80': c.C6a.ecartMoyenPixel, 'C6-a témoin en ligne': t.C6a.ecartMoyenPixel,
    'C6-a |Δ moyenne gris| candidat / témoin': [c.C6a.ecartDesMoyennesGris, t.C6a.ecartDesMoyennesGris],
    'R-12 contraste p90 min / max (80 instants)': [c.R12.min, c.R12.max], 'R-12 tenu (≥ 3,0)': c.R12.tenu,
    'masqué sous le titre : pixels modifiés (max sur 20 instants)': c.masqueSousTitre.pixelsModifiesPlusDe2Niveaux_max,
    'propriétés animées du calque': c.etat_t5000.animsCalque, 'animations de la photo': c.etat_t5000.animsPhoto,
  }
}
for (const f of ['1088x800', '1440x900']) m.films[f] = lire(`film-${f}.json`)
m.R4 = 'Non mesuré : L2 ne comporte aucune rotation (le cahier ne demande R-4 que pour un candidat avec rotation). Le calque ne modifie ni la photo ni sa boîte ; sa propre boîte déborde de 20 % à gauche et à droite et ses bords haut et bas sont transparents par construction (dégradé à 0 d’opacité aux deux bouts).'
fs.writeFileSync(DIR + 'mesures.json', JSON.stringify(m, null, 1))
console.log(JSON.stringify(m.resume, null, 1))
