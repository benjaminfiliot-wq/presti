// scripts/demo-usage-qa-test.mjs — le juge de la tâche 018-02. Il fait tourner le juge d'usage écrit par l'exécutant
// (scripts/demo-usage-qa.mjs) sur la démo EN LIGNE telle qu'au commit efda4a7, avant la vague 2 : ses défauts sont connus,
// mesurés le 14/09/2026 par le critique d'exhaustivité en utilisant le site comme un client :
//   - sur téléphone, le menu ouvert ne se referme pas (la croix est sous le panneau) ;
//   - « Demander un devis » ne mène à aucun formulaire (ancre #contact puis lien tel:) ;
//   - les éléments .mono sortent en police système (Consolas) à chaque visite ;
//   - le texte n'a aucune voix à la première personne (0 « je »).
// Un juge d'usage qui ne voit pas ces quatre défauts ne sert à rien ; un juge qui voit des défauts partout non plus : les
// liens internes de l'accueil répondent tous. Chaque contrôle doit porter une preuve écrite, et les contrôles du menu et du
// devis au moins une capture non vide.
//
// Usage : node scripts/demo-usage-qa-test.mjs      (valable tant que la démo en ligne est celle d'efda4a7)
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const URL_DEMO = 'https://prestiapp.fr/sites-demo/lestraque/index.html'
const SORTIE = path.join(R, '.orchestre', 'preuves', '018-02', 'prod')
const RAPPORT = path.join(SORTIE, 'rapport.json')
const echecs = []

fs.mkdirSync(SORTIE, { recursive: true })
try { fs.unlinkSync(RAPPORT) } catch { /* pas de rapport précédent */ }

const outil = path.join(R, 'scripts', 'demo-usage-qa.mjs')
if (!fs.existsSync(outil)) {
  console.log('✗ juge d\'usage : FAIL — scripts/demo-usage-qa.mjs absent')
  process.exit(1)
}
const r = spawnSync(process.execPath, [outil, `--url=${URL_DEMO}`, `--sortie=${SORTIE}`], { cwd: R, encoding: 'utf8', timeout: 8 * 60 * 1000 })
process.stdout.write((r.stdout || '').slice(-3000))
if (r.error) echecs.push(`lancement : ${r.error.message}`)
if (r.status !== 1) echecs.push(`code de sortie ${r.status} : attendu 1 (la démo en ligne a des défauts connus)`)

let rapport = null
if (!fs.existsSync(RAPPORT)) echecs.push('rapport absent : --sortie=<dossier> doit écrire <dossier>/rapport.json')
else {
  try { rapport = JSON.parse(fs.readFileSync(RAPPORT, 'utf8')) } catch (e) { echecs.push(`rapport.json illisible : ${e.message}`) }
}

// true / false : verdict attendu sur la version en ligne ; null : le contrôle doit exister, verdict libre
const ATTENDUS = {
  'menu-mobile-ferme': false,
  'devis-mene-formulaire': false,
  'polices-premier-passage': false,
  'voix-premiere-personne': false,
  'liens-internes-ok': true,
  'page-commune': null,
  'console-sans-erreur': null,
}
const AVEC_CAPTURE = ['menu-mobile-ferme', 'devis-mene-formulaire']

if (rapport) {
  if (rapport.url !== URL_DEMO) echecs.push(`rapport.url = ${rapport.url} : attendu ${URL_DEMO}`)
  if (!rapport.date || Number.isNaN(Date.parse(rapport.date))) echecs.push('rapport.date : date ISO attendue')
  const controles = Array.isArray(rapport.controles) ? rapport.controles : []
  if (!controles.length) echecs.push('rapport.controles : tableau vide ou absent')
  for (const [id, attendu] of Object.entries(ATTENDUS)) {
    const c = controles.find((x) => x && x.id === id)
    if (!c) { echecs.push(`contrôle « ${id} » absent`); continue }
    if (typeof c.ok !== 'boolean') { echecs.push(`${id} : ok doit être un booléen`); continue }
    if (typeof c.preuve !== 'string' || c.preuve.trim().length < 20) echecs.push(`${id} : preuve écrite absente ou trop courte (≥ 20 caractères)`)
    if (attendu !== null && c.ok !== attendu) echecs.push(`${id} : ok=${c.ok}, attendu ${attendu} sur la version en ligne — preuve : ${String(c.preuve || '').slice(0, 160)}`)
    if (AVEC_CAPTURE.includes(id)) {
      const caps = (Array.isArray(c.captures) ? c.captures : []).map((f) => path.isAbsolute(f) ? f : path.join(SORTIE, f))
      const bonnes = caps.filter((f) => f.startsWith(SORTIE) && fs.existsSync(f) && fs.statSync(f).size > 0)
      if (!bonnes.length) echecs.push(`${id} : au moins une capture non vide sous ${path.relative(R, SORTIE)} attendue (champ captures)`)
    }
  }
}

console.log(echecs.length ? `\n✗ juge d'usage : FAIL — ${echecs.join(' ; ')}` : '\n✓ juge d\'usage : PASS — les quatre défauts connus de la version en ligne sont vus, les liens internes passent, chaque contrôle a sa preuve')
process.exitCode = echecs.length ? 1 : 0
