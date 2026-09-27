// scripts/fixtures/026-pilotage/s/faux-codex.mjs — le faux modèle de station-reunion-qa (fiche 026-067), écrit par Claude
// Code. Il se lance comme `codex exec` (un chemin .mjs se lance par node) :
//   node faux-codex.mjs exec -m <modèle> -s read-only -C <travail> --skip-git-repo-check -o <travail>/reunion.json -
// et écrit dans le fichier de `-o` (ou `--output-last-message`) le plan du scénario choisi par la variable
// FAUX_CODEX_SCENARIO :
//   conforme       2 lignes, un objectif, 2 idées au format du plan du Chef (026-102) ;
//   six-lignes     6 lignes ;  ligne-141   une ligne de 141 signes ;  arobase   une ligne qui porte un @ ;
//   quatre-idees   4 idées ;   cle-hors-format   une clé qui n'est pas chef:<date>:idee-… ;
//   options-autres une idée aux options « oui » et « non » ;  vide   rien (fichier vide) ;
//   delai          ne rend jamais la main : il lance un petit-enfant qui dort aussi (l'arbre doit être tué entier).
// Il consigne, sans jamais rien envoyer, dans <dossier de -o>/faux-codex-appel.json : ses arguments, la longueur de
// l'entrée lue sur stdin (et si elle porte le jeton), les noms (jamais les valeurs) des variables d'environnement qui portent
// le jeton factice (que le juge lui passe à l'envers dans FAUX_CODEX_JETON_INVERSE, pour vérifier qu'il ne l'a pas reçu), et
// ses PID (celui du petit-enfant compris) dans faux-codex-pids.json.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const SCENARIOS = ['conforme', 'six-lignes', 'ligne-141', 'arobase', 'quatre-idees', 'cle-hors-format', 'options-autres', 'vide', 'delai']
const JOUR = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })

/** Le plan que le scénario annonce (null pour vide et delai). */
export function planDe(scenario, maintenant = new Date()) {
  const jour = JOUR.format(maintenant)
  const echeance = new Date(maintenant.getTime() + 24 * 3_600_000).toISOString()
  const idee = (suffixe, x = {}) => ({
    cle_idempotence: `chef:${jour}:idee-${suffixe}`, question: `Essayer ${suffixe.replace(/-/g, ' ')} ?`, contexte: 'Chiffres de la réunion du jour.',
    options: [{ cle: 'lancer', libelle: 'Lancer', recommandee: true }, { cle: 'reporter', libelle: 'Reporter', recommandee: false }],
    option_defaut: 'reporter', portee: 'aucune', montant_cents: 0, echeance, ...x,
  })
  const base = { lignes: ['12 formulaires soumis hier, 2 réponses', 'La maquette du plombier est prête'], objectif: { libelle: 'Dix formulaires par jour', mesure: 'contacts_froids', cible: 100 }, idees: [idee('relance-couvreurs'), idee('variante-courte')] }
  switch (scenario) {
    case 'conforme': return base
    case 'six-lignes': return { ...base, lignes: ['Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six'].map((x) => `Ligne ${x}`) }
    case 'ligne-141': return { ...base, lignes: ['x'.repeat(141)] }
    case 'arobase': return { ...base, lignes: ['Écrire à quelqu’un@exemple.invalid'] }
    case 'quatre-idees': return { ...base, idees: [idee('une'), idee('deux'), idee('trois'), idee('quatre')] }
    case 'cle-hors-format': return { ...base, idees: [idee('bonne'), { ...idee('mauvaise'), cle_idempotence: 'chef:idee-sans-date' }] }
    case 'options-autres': return { ...base, idees: [idee('autre', { options: [{ cle: 'oui', libelle: 'Oui', recommandee: true }, { cle: 'non', libelle: 'Non', recommandee: false }], option_defaut: 'non' })] }
    default: return null
  }
}

const principal = !!process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()
if (principal) {
  const args = process.argv.slice(2)
  const scenario = process.env.FAUX_CODEX_SCENARIO ?? 'conforme'
  const i = args.findIndex((a) => a === '-o' || a === '--output-last-message')
  const sortie = i >= 0 ? args[i + 1] : null
  const dossier = sortie ? path.dirname(sortie) : process.cwd()
  let entree = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (d) => { entree += d })
  // Le juge passe le jeton factice à l'envers : un script qui retirerait de l'environnement du modèle toute valeur égale au
  // jeton ne peut pas effacer cette trace-là, et le faux modèle retrouve ainsi ce qu'il ne doit jamais recevoir.
  const jeton = [...(process.env.FAUX_CODEX_JETON_INVERSE ?? '')].reverse().join('')
  const fuite = Object.entries(process.env).filter(([k, v]) => k !== 'FAUX_CODEX_JETON_INVERSE' && jeton && String(v).includes(jeton)).map(([k]) => k)
  const consigner = (x) => fs.writeFileSync(path.join(dossier, 'faux-codex-appel.json'), JSON.stringify({ scenario, args, entree_signes: entree.length, entree_a_le_jeton: !!jeton && entree.includes(jeton), variables_avec_le_jeton: fuite, ...x }, null, 1))
  const finir = () => {
    if (scenario === 'delai') {
      // Chacun bat toutes les 200 ms dans son fichier : le juge prouve l'arbre tué par des battements qui s'arrêtent, pas par
      // un PID (Windows réutilise vite les PID : un PID « vivant » peut être celui d'un autre processus).
      const fModele = path.join(dossier, 'faux-codex-battement-modele.txt'), fPetit = path.join(dossier, 'faux-codex-battement-petit.txt')
      // Détaché sous Windows : sans cela, libuv range le petit-enfant dans l'objet de travail du faux modèle, qui le tue avec
      // lui ; un script qui ne tuerait que le modèle (taskkill sans /T, ChildProcess.kill) passerait alors pour avoir tué
      // l'arbre. Détaché, il ne meurt que si l'arbre est tué entier. Sous Linux, il reste dans le groupe du modèle : le
      // process.kill(-pid) du script l'atteint, un kill du seul modèle le laisse battre.
      const petit = spawn(process.execPath, ['-e', `const fs = require('node:fs'); setInterval(() => { try { fs.writeFileSync(${JSON.stringify(fPetit)}, String(Date.now())) } catch {} }, 200)`], { stdio: 'ignore', detached: process.platform === 'win32', windowsHide: true })
      fs.writeFileSync(path.join(dossier, 'faux-codex-pids.json'), JSON.stringify({ modele: process.pid, petit_enfant: petit.pid }))
      consigner({ ecrit: false })
      setInterval(() => { try { fs.writeFileSync(fModele, String(Date.now())) } catch { /* dossier retiré */ } }, 200)
      return
    }
    fs.writeFileSync(path.join(dossier, 'faux-codex-pids.json'), JSON.stringify({ modele: process.pid }))
    const plan = planDe(scenario)
    if (sortie) fs.writeFileSync(sortie, plan ? JSON.stringify(plan, null, 1) : '')
    consigner({ ecrit: !!plan })
    process.exit(0)
  }
  process.stdin.on('end', finir)
  process.stdin.on('error', finir)
}
