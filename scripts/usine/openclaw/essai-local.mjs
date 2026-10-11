// scripts/usine/openclaw/essai-local.mjs — fiche 026-221, étape 5 : l'essai local d'OpenClaw avec une TÂCHE FICTIVE.
//
//   node scripts/usine/openclaw/essai-local.mjs        code 0 : tous les scénarios tiennent ; 1 sinon
//
// Ce que c'est : un essai SIMULÉ. Aucun docker, aucun réseau, aucun fichier lu hors du dépôt : docker et connecter sont des
// doublures qui comptent leurs appels. Il ne vaut ni installation ni réponse réelle d'un modèle : l'installation réelle se lit par
// `lanceur.mjs --controler` (docker inspect de l'usine), et la réponse réelle d'un modèle par tache.sh (état « non mesuré » tant
// qu'aucune tâche réelle n'est confiée, voir docs/agents/openclaw.md). La tâche est fictive (id essai-oc-01), l'adresse
// @presti-test.invalid, la donnée « prospect » est une étiquette, jamais une vraie personne.
//
// Les scénarios de la fiche : réponse par Ollama LOCAL ; quota freellmapi simulé puis bascule admissible ; et trois échecs FERMÉS :
// le chemin de l'abonnement Claude, l'échappement de dossier, un hôte réseau inconnu. Chaque refus doit arriver AVANT tout appel à
// docker ou au réseau (les compteurs le prouvent) et nommer son critère.
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const lanceur = await import(pathToFileURL(path.join(ICI, 'lanceur.mjs')).href)

const echecs = []
const ligne = (ok, nom, detail = '') => {
  if (!ok) echecs.push(nom)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${nom}${detail ? ` — ${detail}` : ''}`)
}
const doublures = () => {
  const c = { docker: 0, connecter: 0, journal: [], argv: null }
  return { c, deps: { docker: async (argv) => { c.docker++; c.argv = argv }, connecter: async () => { c.connecter++ }, journal: (l) => c.journal.push(l) } }
}
const base = () => lanceur.configuration()
// Un faux secret tiré au hasard : il ne doit apparaître ni dans l'argv, ni dans le journal, ni dans le diagnostic.
const FAUX = `ESSAI-${crypto.randomBytes(8).toString('hex')}`

console.log('# essai local SIMULÉ — tâche fictive essai-oc-01 (aucun docker, aucun réseau, aucun modèle réel appelé)')

// 1 ── réponse par Ollama LOCAL : la donnée d'un prospect (fictif) ne va qu'à l'Ollama local ───────────────────────────────────────
{
  const m = lanceur.choisirModele({ donnees: 'prospect', disponibles: { 'ollama-local': true, 'ollama-cloud': true, freellmapi: true } })
  ligne(m.voie === 'ollama-local' && m.fournisseur === 'ollama' && !/cloud/i.test(m.modele), '1 · donnée de prospect → Ollama local', `${m.voie}/${m.modele}`)
  const { c, deps } = doublures()
  const r = await lanceur.lancer({ config: base(), env: { TZ: FAUX }, deps })
  ligne(r.ok === true && c.docker === 1 && c.connecter === 0, '1 · lancement : un seul docker (doublure), aucune connexion', `docker ${c.docker}, connexion ${c.connecter}`)
  const vu = JSON.stringify([c.argv, c.journal])
  ligne(!vu.includes(FAUX) && c.argv?.includes('-e') && c.argv.includes('TZ'), '1 · le nom de la variable passe, jamais sa valeur (argv et journal)')
}

// 2 ── quota freellmapi simulé, puis bascule admissible ─────────────────────────────────────────────────────────────────────────
{
  const publique = (disponibles) => lanceur.choisirModele({ donnees: 'publique', disponibles })
  const a = publique({ 'ollama-local': false, 'ollama-cloud': false, freellmapi: true })
  ligne(a.voie === 'freellmapi', '2 · voies locale et cloud absentes → freellmapi (donnée publique)', `${a.voie}/${a.modele}`)
  const b = publique({ 'ollama-local': false, 'ollama-cloud': true, freellmapi: false }) // quota freellmapi simulé épuisé
  ligne(b.voie === 'ollama-cloud' && b.fournisseur === 'ollama', '2 · quota freellmapi épuisé (simulé) → bascule vers Ollama Cloud', `${b.voie}/${b.modele}`)
  const c = publique({ 'ollama-local': true, 'ollama-cloud': false, freellmapi: false })
  ligne(c.voie === 'ollama-local', '2 · puis bascule vers l\'Ollama local', `${c.voie}/${c.modele}`)
  const d = publique({ 'ollama-local': false, 'ollama-cloud': false, freellmapi: false })
  ligne(d.refus === 'aucun_modele_gratuit', '2 · plus aucune voie gratuite → refus, l\'outil reste arrêté', d.refus || 'rien refusé')
  const e = lanceur.choisirModele({ donnees: 'prospect', disponibles: { 'ollama-local': false, 'ollama-cloud': true, freellmapi: true } })
  ligne(e.refus === 'donnees_prospect', '2 · prospect et Ollama local en panne → refus (jamais Ollama Cloud ni freellmapi)', e.refus || `${e.voie}/${e.modele}`)
  const f = lanceur.choisirModele({ donnees: undefined, disponibles: { 'ollama-local': false, 'ollama-cloud': true, freellmapi: true } })
  ligne(f.refus === 'donnees_prospect', '2 · classe de donnée absente = traitée comme un prospect', f.refus || `${f.voie}/${f.modele}`)
}

// 3 ── échec fermé : le chemin de l'abonnement Claude ───────────────────────────────────────────────────────────────────────────
{
  const cas = [
    ['modèle Claude déclaré', (x) => { x.modeles.push({ fournisseur: 'anthropic', modele: 'claude-sonnet-4-5', voie: 'ollama-cloud' }) }, 'abonnement_claude'],
    ['variable ANTHROPIC_API_KEY transmise', (x) => { x.env.push('ANTHROPIC_API_KEY') }, 'jeton_claude'],
    ['variable CLAUDE_CODE_OAUTH_TOKEN transmise', (x) => { x.env.push('CLAUDE_CODE_OAUTH_TOKEN') }, 'jeton_claude'],
  ]
  for (const [nom, mut, code] of cas) {
    const { c, deps } = doublures(); const x = base(); mut(x)
    const r = await lanceur.lancer({ config: x, env: {}, deps })
    ligne(r.refus === code && c.docker === 0 && c.connecter === 0, `3 · abonnement Claude fermé — ${nom}`, `${r.refus || 'accepté'} ; docker ${c.docker}, connexion ${c.connecter}`)
  }
  { // une valeur « sk-ant- » dans une variable permise
    const { c, deps } = doublures()
    const r = await lanceur.lancer({ config: base(), env: { TZ: ('sk-' + 'ant-' + 'api03-ESSAI-fictif') }, deps })
    ligne(r.refus === 'jeton_claude' && c.docker === 0, '3 · abonnement Claude fermé — valeur « sk-ant- » dans une variable permise', `${r.refus || 'accepté'}`)
  }
  const p = lanceur.choisirModele({ donnees: 'publique', disponibles: { freellmapi: true }, prefere: { fournisseur: 'anthropic', modele: 'claude-opus-4' } })
  ligne(p.refus === 'abonnement_claude', '3 · abonnement Claude fermé — modèle Claude demandé comme préféré', p.refus || 'accepté')
  ligne(!lanceur.sortieAutorisee('https://api.anthropic.com/v1/messages') && !lanceur.sortieAutorisee('https://claude.ai/'), '3 · anthropic.com et claude.ai hors de la liste de sorties')
}

// 4 ── échec fermé : l'échappement de dossier ───────────────────────────────────────────────────────────────────────────────────
{
  const chemins = ['/home/usine', '/srv/openclaw/secrets', '/var/run/docker.sock', '../../etc', 'C:/Users/benja/Documents/presti-secrets', '~/.ssh', '/', '.']
  for (const source of chemins) {
    const { c, deps } = doublures(); const x = base(); x.volumes = [...x.volumes, { source, cible: '/hote' }]
    const r = await lanceur.lancer({ config: x, env: {}, deps })
    ligne(r.refus === 'montage_interdit' && c.docker === 0 && c.connecter === 0, `4 · échappement de dossier fermé — montage de « ${source} »`, `${r.refus || 'accepté'} ; docker ${c.docker}`)
  }
  { const { c, deps } = doublures(); const x = base(); x.lecture_seule = false
    const r = await lanceur.lancer({ config: x, env: {}, deps })
    ligne(r.refus === 'fs_ecriture' && c.docker === 0, '4 · système de fichiers en écriture refusé', r.refus || 'accepté') }
  { const { c, deps } = doublures(); const x = base(); x.utilisateur = 'root'
    const r = await lanceur.lancer({ config: x, env: {}, deps })
    ligne(r.refus === 'utilisateur_privilegie' && c.docker === 0, '4 · utilisateur root refusé', r.refus || 'accepté') }
  { const { c, deps } = doublures(); const x = base(); x.privilegie = true
    const r = await lanceur.lancer({ config: x, env: {}, deps })
    ligne(r.refus === 'mode_privilegie' && c.docker === 0, '4 · mode privilégié refusé', r.refus || 'accepté') }
  { const { c, deps } = doublures(); const x = base(); x.ports = [{ hote: '0.0.0.0', port: 18800, conteneur: 18789 }]
    const r = await lanceur.lancer({ config: x, env: {}, deps })
    ligne(r.refus === 'port_expose' && c.docker === 0, '4 · port d\'administration hors 127.0.0.1 refusé', r.refus || 'accepté') }
}

// 5 ── échec fermé : un hôte réseau inconnu ─────────────────────────────────────────────────────────────────────────────────────
{
  const inconnus = ['http://evil.example.invalid/', 'https://registry.npmjs.org/', 'http://169.254.169.254/latest/meta-data/', 'http://127.0.0.1:22/', 'http://host.docker.internal:22/',
    'http://user:pass@127.0.0.1:11434/', 'https://ollama.com.attaquant.invalid/', 'ftp://127.0.0.1:11434/']
  for (const u of inconnus) ligne(lanceur.sortieAutorisee(u) === false, `5 · sortie refusée — ${u.replace(/\/\/[^@/]*@/, '//***@')}`)
  for (const u of ['http://127.0.0.1:11434/api/tags', 'https://ollama.com/api/chat', 'http://127.0.0.1:3001/v1/chat/completions']) ligne(lanceur.sortieAutorisee(u) === true, `5 · sortie déclarée admise — ${u}`)
  const { c, deps } = doublures(); const x = base(); x.sorties = [...x.sorties, { role: 'freellmapi', url: 'http://evil.example.invalid:3001' }]
  const r = await lanceur.lancer({ config: x, env: {}, deps })
  ligne(r.refus === 'sortie_hors_liste' && c.docker === 0 && c.connecter === 0, '5 · hôte inconnu déclaré comme sortie → refus avant docker et connexion', `${r.refus || 'accepté'} ; docker ${c.docker}, connexion ${c.connecter}`)
}

// 6 ── relance reproductible et diagnostic sans valeur ──────────────────────────────────────────────────────────────────────────
{
  const a = lanceur.preparerLancement({ config: base(), env: { TZ: FAUX } })
  const b = lanceur.preparerLancement({ config: base(), env: { TZ: FAUX } })
  ligne(JSON.stringify(a.argv) === JSON.stringify(b.argv), '6 · deux lancements du même profil donnent le même argv (reproductible)')
  const interdits = ['--privileged', '--cap-add', '--device', '--env-file', '--pid=host', '--ipc=host', '--userns=host', '--mount', 'docker.sock', 'presti-secrets', 'type=bind']
  ligne(!a.argv.some((t) => interdits.some((i) => t.includes(i))), '6 · l\'argv ne contient aucune option qui élargirait l\'isolement')
  ligne(!JSON.stringify(a.diagnostic).includes(FAUX) && !JSON.stringify(a.argv).includes(FAUX), '6 · diagnostic et argv sans la valeur d\'une variable')
  ligne(a.env.TZ === FAUX, '6 · la valeur voyage seulement dans le paramètre env (jamais process.env entier)')
}

console.log(`\nverdict : ${echecs.length ? 'FAIL' : 'PASS'} — essai SIMULÉ ${echecs.length ? echecs.length + ' scénario(s) en échec' : 'tous les scénarios tiennent'}`)
process.exitCode = echecs.length ? 1 : 0
