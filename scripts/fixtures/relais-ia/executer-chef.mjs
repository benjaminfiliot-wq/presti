// scripts/fixtures/relais-ia/executer-chef.mjs — le second enfant du juge scripts/relais-ia-qa.mjs : le relais du CHEF
// (scripts/usine/relais-chef.mjs et scripts/usine/chef-modele.mjs), sur DOUBLURES seulement (un faux lanceur, un faux binaire de Codex, des
// dossiers jetables, une clé et des « coordonnées » inventées). Lancé comme executer.mjs : cwd = la racine jugée (le dépôt ou une copie sabotée).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const racine = path.resolve(process.argv[2])
const C = await import(pathToFileURL(path.join(racine, 'scripts', 'usine', 'relais-chef.mjs')).href)
const R = await import(pathToFileURL(path.join(racine, 'lib', 'agents', 'relais.ts')).href)

const T0 = Date.parse('2026-10-05T10:00:00Z')
const CLE_SENTINELLE = 'cle-sentinelle-FL-1234567890abcdefghijklmnop'
const TEXTE_SENTINELLE = 'SENTINELLE-TEXTE-UNIQUE-77'
const ADRESSE = 'jean.dupont@exemple.fr'
const resultats = []
async function cas(id, f) {
  try { const echecs = await f(); resultats.push({ id, ok: !echecs.length, detail: echecs.length ? echecs.join(' ; ') : 'ok' }) }
  catch (e) { resultats.push({ id, ok: false, detail: `exception : ${e?.stack || e}` }) }
}
const journalDe = (dossier) => fs.readdirSync(dossier).filter((f) => f.startsWith('relais-')).flatMap((f) => fs.readFileSync(path.join(dossier, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)))

const ARGV_CHEF = ['exec', '-C', '/srv/presti-agents', '-s', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=false', '--skip-git-repo-check', '--color', 'never', '-o', '/x/sortie-1-dernier-message.md', '-m', 'gpt-6-sol', 'Lis docs/agents/chef.md puis /x/entree-2-entree.md et ecris le plan']
const ENTREE_PUBLIQUE = '<donnees_etat>{"agents":[{"nom":"chef"}]}</donnees_etat> contact : noreply@prestiapp.fr'
const ENTREE_PROSPECT = `<donnees_etat>{"resume":"le prospect ${ADRESSE} a répondu"}</donnees_etat>`

// Un monde du chef : chaque moteur a son comportement ; `lancer` consigne l'argv et la clé reçue.
function mondeChef(sc = {}) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'relais-chef-qa-'))
  const lances = []
  let t = T0
  const moteurDe = (argv) => {
    const m = argv.indexOf('-m')
    const mod = m >= 0 ? argv[m + 1] : ''
    if (argv.includes('model_provider=fl')) return mod === 'ministral-14b' ? 'freellmapi_mistral' : mod === 'gemini-3-flash-preview' ? 'freellmapi_gemini' : 'freellmapi'
    if (argv.some((a) => /^model_provider=ollama/.test(a))) return /cloud/.test(mod) ? 'ollama_cloud' : /8b/.test(mod) ? 'ollama_8b' : 'ollama_4b'
    return 'codex'
  }
  const sorties = {
    ok: { code: 0, sortie: 'plan écrit' },
    '401': { code: 1, sortie: 'ERROR: unexpected status 401 Unauthorized: Missing bearer' },
    quota: { code: 1, sortie: "ERROR: You've hit your usage limit. try again at Oct 9th, 2026 9:15 PM." },
    '429': { code: 1, sortie: 'ERROR: exceeded retry limit, last status: 429 Too Many Requests' },
    cloud429: { code: 1, sortie: 'ERROR: You reached the Free usage limit.' },
    panne: { code: 1, sortie: 'ERROR: error sending request' },
    silencieux: { code: 0, sortie: "Désolé, je n'ai pas accès aux fichiers." },
  }
  let dernierMode = null
  const lancer = async (argv, budget, extraEnv) => {
    const id = moteurDe(argv)
    lances.push({ id, argv, budget, cle: extraEnv?.FL_KEY ?? null })
    const mode = sc[id] ?? 'panne'
    dernierMode = mode
    return { ...(sorties[mode] ?? sorties.panne), delai: mode === 'delai' }
  }
  const base = { argv: ARGV_CHEF, texteEntree: ENTREE_PUBLIQUE, delaiMs: 900_000, lancer, etat: C.magasinFichier(dossier), journal: C.journalFichier(dossier, () => t), maintenant: () => t, cle: CLE_SENTINELLE, drapeau: false, verifier: () => dernierMode !== 'silencieux', ...(sc.opts ?? {}) }
  return { base, lances, dossier, avancer: (ms) => { t += ms }, ids: () => lances.map((l) => l.id).join('>') }
}

await cas('RC-1', async () => {
  const e = []
  const m = mondeChef({ codex: '401', freellmapi_gemini: 'ok' })
  const r = await C.relayer(m.base)
  if (r.code !== 0 || r.moteur !== 'freellmapi_gemini') e.push(`servi par ${r.moteur} code ${r.code} (attendu freellmapi_gemini, 0)`)
  if (m.ids() !== 'codex>freellmapi_gemini') e.push(`ordre ${m.ids()}`)
  const a = m.lances[1]?.argv ?? []
  if (a[0] !== 'exec' || !a.includes(C.CONFIG_FL) || !a.includes('model_provider=fl')) e.push('l\'argv de secours ne désigne pas freellmapi')
  const i = a.indexOf('-m')
  if (a[i + 1] !== 'gemini-3-flash-preview' || a.filter((x) => x === '-m').length !== 1) e.push('le modèle de secours n\'est pas gemini-3-flash-preview, seul')
  if (a.includes('gpt-6-sol')) e.push('gpt-6-sol reste dans l\'argv de secours')
  for (const garde of ['workspace-write', 'sandbox_workspace_write.network_access=false', '--skip-git-repo-check', '/x/sortie-1-dernier-message.md']) if (!a.includes(garde)) e.push(`l'argv de secours a perdu « ${garde} »`)
  if (!String(a.at(-1)).startsWith('Lis docs/agents/chef.md')) e.push('l\'instruction n\'est plus en dernier')
  if (m.lances[1]?.cle !== CLE_SENTINELLE) e.push('FL_KEY n\'est pas passée à Codex par l\'environnement')
  if (a.some((x) => String(x).includes(CLE_SENTINELLE))) e.push('la clé est dans l\'argv')
  if (m.lances[0].cle !== null) e.push('FL_KEY part vers Codex (abonnement)')
  const j = journalDe(m.dossier)
  if (!j.some((x) => x.moteur === 'codex' && x.issue === 'bascule' && x.raison === 'non_autorise')) e.push('401 de Codex non tracé en non_autorise')
  if (!j.some((x) => x.moteur === 'freellmapi_gemini' && x.issue === 'ok')) e.push('freellmapi ok non tracé')
  return e
})

await cas('RC-2', async () => {
  const e = []
  const m = mondeChef({ codex: 'quota', freellmapi_gemini: 'ok' })
  await C.relayer(m.base)
  const etat = JSON.parse(fs.readFileSync(path.join(m.dossier, 'etat-chef.json'), 'utf8')).moteurs
  if (etat.codex?.raison !== 'quota') e.push('Codex à bout (usage limit) non mémorisé')
  if (etat.codex && etat.codex.jusqua > T0 + 6 * 3600_000) e.push('Codex mis de côté plus de 6 h : il ne reviendrait pas tout seul')
  m.lances.length = 0
  await C.relayer(m.base)
  if (m.lances.some((l) => l.id === 'codex')) e.push('Codex relancé alors qu\'il est mis de côté')
  // Codex revient : 6 h plus tard, il est de nouveau le premier
  m.avancer(6 * 3600_000 + 60_000)
  const retour = mondeChef({ codex: 'ok' })
  const r = await C.relayer({ ...retour.base, etat: m.base.etat, maintenant: m.base.maintenant, journal: m.base.journal })
  if (r.moteur !== 'codex' || retour.ids() !== 'codex') e.push(`après 6 h : ${retour.ids()} (attendu Codex repris tout seul)`)
  return e
})

await cas('RC-3', async () => {
  const e = []
  const m = mondeChef({ codex: '401', freellmapi: '429', freellmapi_gemini: '429', freellmapi_mistral: '429', ollama_cloud: 'cloud429', ollama_8b: 'ok' })
  const r = await C.relayer(m.base)
  if (m.ids() !== 'codex>freellmapi_gemini>freellmapi_mistral>freellmapi>ollama_cloud>ollama_8b') e.push(`ordre ${m.ids()}`)
  if (r.moteur !== 'ollama_8b') e.push(`servi par ${r.moteur}`)
  const j = journalDe(m.dossier)
  if (j.find((x) => x.moteur === 'freellmapi')?.raison !== 'quota' || j.find((x) => x.moteur === 'ollama_cloud')?.raison !== 'quota') e.push('429 et « Free usage limit » non tracés en quota')
  const l8 = m.lances.find((l) => l.id === 'ollama_8b')
  if (!l8.argv.includes('model_provider=ollama-usine') || l8.argv.includes(C.CONFIG_FL)) e.push('argv du local : fournisseur ollama-usine attendu, sans freellmapi')
  if (l8.cle !== null) e.push('FL_KEY part vers Ollama')
  const m2 = mondeChef({ codex: '401', freellmapi: 'panne', freellmapi_gemini: 'panne', freellmapi_mistral: 'panne', ollama_cloud: 'panne', ollama_8b: 'panne', ollama_4b: 'ok' })
  if ((await C.relayer(m2.base)).moteur !== 'ollama_4b') e.push('le 8B en panne : le 4B ne prend pas')
  const m3 = mondeChef({ codex: '401', freellmapi: '429', freellmapi_gemini: '429', freellmapi_mistral: '429', ollama_cloud: 'cloud429', ollama_8b: 'panne', ollama_4b: 'panne' })
  if ((await C.relayer(m3.base)).code === 0) e.push('tout à bout : code 0')
  return e
})

await cas('RC-4', async () => {
  const e = []
  const tous = { freellmapi: 'ok', freellmapi_gemini: 'ok', freellmapi_mistral: 'ok', ollama_cloud: 'ok', ollama_8b: 'ok', ollama_4b: 'ok' }
  const m = mondeChef({ codex: '401', ...tous, opts: { texteEntree: ENTREE_PROSPECT } })
  const r = await C.relayer(m.base)
  if (m.ids() !== 'codex') e.push(`une entrée de prospect, drapeau éteint : ${m.ids()} (Codex seul attendu)`)
  if (r.code === 0) e.push('servi sans Codex ni « oui » daté')
  const m2 = mondeChef({ codex: '401', ...tous, opts: { texteEntree: ENTREE_PROSPECT, drapeau: true } })
  const r2 = await C.relayer(m2.base)
  if (m2.ids() !== 'codex>ollama_8b' || r2.moteur !== 'ollama_8b') e.push(`drapeau levé : ${m2.ids()} (codex>ollama_8b attendu)`)
  if (m2.lances.some((l) => l.id.startsWith('freellmapi') || l.id === 'ollama_cloud' || l.cle)) e.push('une entrée de prospect va au gratuit ou au cloud, ou reçoit la clé')
  const nat = (t) => C.natureDeTexte(t)
  if (nat(ENTREE_PUBLIQUE) !== 'publique') e.push('une adresse de Presti rend l\'entrée « prospect »')
  for (const t of [`écrire à ${ADRESSE}`, 'appeler le 06 12 34 56 78', 'SIREN 123 456 789']) if (nat(t) !== 'prospect') e.push(`« ${t} » n'est pas reconnu comme donnée de prospect`)
  for (const t of ['aucune donnée', 'a@b.invalid']) if (nat(t) !== 'publique') e.push(`« ${t} » pris pour une donnée de prospect`)
  if (C.drapeauLeve('oui', T0) || C.drapeauLeve('2099-01-01', T0) || !C.drapeauLeve('2026-09-01', T0)) e.push('drapeauLeve : valeurs mal jugées')
  return e
})

await cas('RC-5', async () => {
  const e = []
  const m = mondeChef({ codex: '401', freellmapi: 'ok', ollama_cloud: 'ok', opts: { cle: null } })
  const r = await C.relayer(m.base)
  if (r.moteur !== 'ollama_cloud' || m.ids() !== 'codex>ollama_cloud') e.push(`sans clé : ${m.ids()} (freellmapi doit être sauté)`)
  const m2 = mondeChef({ codex: 'delai', freellmapi_gemini: 'ok' })
  if ((await C.relayer(m2.base)).moteur !== 'freellmapi_gemini') e.push('un délai de Codex ne bascule pas')
  if (journalDe(m2.dossier).find((x) => x.moteur === 'codex')?.raison !== 'delai') e.push('délai non tracé')
  const m3 = mondeChef({ codex: '401', freellmapi_gemini: 'ok', opts: { delaiMs: 10_000 } })
  const r3 = await C.relayer(m3.base)
  if (r3.moteur !== null || m3.lances.length) e.push('plus de temps : un moteur est quand même lancé')
  const m4 = mondeChef({ codex: '401', freellmapi_gemini: 'ok', opts: { texteEntree: `${ENTREE_PUBLIQUE} ${TEXTE_SENTINELLE}` } })
  await C.relayer(m4.base)
  const lu = fs.readdirSync(m4.dossier).map((f) => fs.readFileSync(path.join(m4.dossier, f), 'utf8')).join('\n')
  if (lu.includes(CLE_SENTINELLE) || lu.includes(TEXTE_SENTINELLE)) e.push('la clé ou le texte de l\'entrée est dans la trace')
  return e
})

await cas('RC-8', async () => {
  const e = []
  // un routeur libre qui sort en code 0 sans faire le travail n'est pas un succès : le suivant prend la demande, sans mise de côté
  const m = mondeChef({ codex: '401', freellmapi_gemini: 'silencieux', freellmapi_mistral: 'ok' })
  const r = await C.relayer(m.base)
  if (r.moteur !== 'freellmapi_mistral' || m.ids() !== 'codex>freellmapi_gemini>freellmapi_mistral') e.push(`routeur silencieux : ${m.ids()} servi par ${r.moteur}`)
  const etat = JSON.parse(fs.readFileSync(path.join(m.dossier, 'etat-chef.json'), 'utf8')).moteurs
  if (etat.freellmapi_gemini) e.push('un routeur silencieux est mis de côté (il peut répondre juste la fois suivante)')
  if (journalDe(m.dossier).find((x) => x.moteur === 'freellmapi_gemini')?.raison !== 'sortie_invalide') e.push('sortie sans plan non tracée en sortie_invalide')
  // « auto » a trois essais : deux silences puis un plan écrit sur le même moteur
  const m3 = mondeChef({ codex: '401', freellmapi_gemini: 'panne', freellmapi_mistral: 'panne', freellmapi: 'silencieux' })
  const compte = { n: 0 }
  const lancerOrig = m3.base.lancer
  m3.base.lancer = async (a, b, x) => { const id = a.includes('model_provider=fl') && a[a.indexOf('-m') + 1] === 'auto' ? 'auto' : null; if (id) { compte.n++; if (compte.n === 3) { m3.base.verifier = () => true; return { code: 0, sortie: 'plan écrit' } } } return lancerOrig(a, b, x) }
  const r3 = await C.relayer(m3.base)
  if (r3.moteur !== 'freellmapi' || compte.n !== 3) e.push(`« auto » : ${compte.n} essai(s), servi par ${r3.moteur} (3 essais puis le plan attendus)`)
  const m2 = mondeChef({ codex: 'silencieux', freellmapi: 'silencieux', freellmapi_gemini: 'silencieux', freellmapi_mistral: 'silencieux', ollama_cloud: 'silencieux', ollama_8b: 'silencieux', ollama_4b: 'silencieux' })
  if ((await C.relayer(m2.base)).code === 0) e.push('tous silencieux : code 0')
  return e
})

// parité avec lib/agents/relais.ts : mêmes règles de mise de côté (une vérité, deux copies)
await cas('RC-6', async () => {
  const e = []
  const paires = [['codex', 'codex'], ['freellmapi', 'freellmapi'], ['freellmapi_gemini', 'freellmapi'], ['freellmapi_mistral', 'freellmapi'], ['ollama_cloud', 'ollama_cloud'], ['ollama_8b', 'ollama_8b'], ['ollama_4b', 'ollama_4b']]
  for (const [idChef, idTs] of paires) for (const raison of ['quota', 'non_autorise', 'indisponible', 'delai']) for (const j of [undefined, T0 + 3600_000, T0 + 99 * 3600_000]) {
    const a = C.echeanceDeMiseDeCote(idChef, raison, T0, j)
    const b = R.echeanceDeMiseDeCote(idTs, raison, T0, j)
    if (a !== b) e.push(`${idChef}/${raison}/${j ?? '-'} : chef ${a} ≠ relais ${b}`)
  }
  const q = C.classerSortie("You've hit your usage limit. try again at Oct 9th, 2026 9:15 PM.", T0)
  if (q.raison !== 'quota') e.push('usage limit non classé quota')
  if (q.jusquaMs !== Date.parse('Oct 9 2026 9:15 PM')) e.push('l\'échéance annoncée par Codex n\'est pas lue')
  if (C.classerSortie('ERROR: unexpected status 401 Unauthorized', T0).raison !== 'non_autorise') e.push('401 non classé')
  if (C.classerSortie('exceeded retry limit, last status: 429', T0).raison !== 'quota') e.push('429 non classé quota')
  if (C.classerSortie('error sending request', T0).raison !== 'indisponible') e.push('panne non classée')
  return e
})

// chef-modele.mjs servir, de bout en bout, avec un faux binaire de Codex
await cas('RC-7', async () => {
  const e = []
  const faux = path.join(racine, 'scripts', 'fixtures', 'relais-ia', 'faux-codex-chef.mjs')
  const lancerServir = (nomEchange, reussitAvec, extraArgs = [], silencieuxAvec = []) => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'relais-chef-srv-'))
    const echange = path.join(base, nomEchange)
    const d = path.join(echange, 'demande-1')
    fs.mkdirSync(d, { recursive: true })
    const home = path.join(base, 'home')
    fs.mkdirSync(path.join(home, '.config', 'presti'), { recursive: true })
    fs.writeFileSync(path.join(home, '.config', 'presti', 'freellmapi.key'), `${CLE_SENTINELLE}\n`)
    fs.writeFileSync(path.join(d, 'entree-1-entree.md'), ENTREE_PUBLIQUE)
    fs.writeFileSync(path.join(d, 'demande.json'), JSON.stringify({ argv: ARGV_CHEF.map((x) => x.replace('/x/', `${d}/`)), entrees: [{ origine: '/o/entree.md', copie: path.join(d, 'entree-1-entree.md') }], sorties: [{ origine: '/o/plan.json', copie: path.join(d, 'sortie-3-plan.json') }], stdin: false, delai_s: 120 }))
    fs.writeFileSync(path.join(d, 'demande.pret'), '')
    const journal = path.join(base, 'appels.jsonl')
    fs.writeFileSync(path.join(d, 'faux-config.json'), JSON.stringify({ reussitAvec, silencieuxAvec, ecrire: [path.join(d, 'sortie-3-plan.json')], echec: '401', journal }))
    spawnSync(process.execPath, [path.join(racine, 'scripts', 'usine', 'chef-modele.mjs'), 'servir', `--echange=${echange}`, `--codex=${faux}`, ...extraArgs], { cwd: racine, encoding: 'utf8', timeout: 60_000, env: { PATH: process.env.PATH, HOME: home } })
    const reponse = (() => { try { return JSON.parse(fs.readFileSync(path.join(d, 'reponse.json'), 'utf8')) } catch { return null } })()
    const appels = fs.existsSync(journal) ? fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
    return { reponse, appels, home }
  }
  // la file du chef : Codex 401 → freellmapi réussit (--relais=oui : un banc qui désigne son faux binaire garde l'ancien comportement)
  const a = lancerServir('echange-chef', 'fl', ['--relais=oui'])
  if (a.reponse?.code !== 0 || a.reponse?.moteur !== 'freellmapi_gemini') e.push(`file du chef : réponse ${JSON.stringify({ code: a.reponse?.code, moteur: a.reponse?.moteur })} (code 0, freellmapi_gemini attendus)`)
  if (a.appels.map((x) => x.fournisseur).join('>') !== 'openai>fl') e.push(`file du chef : fournisseurs ${a.appels.map((x) => x.fournisseur).join('>')}`)
  if (!a.appels[1]?.cle) e.push('file du chef : FL_KEY absente de l\'environnement de Codex')
  if (JSON.stringify(a.reponse).includes(CLE_SENTINELLE)) e.push('la clé est dans reponse.json')
  let trace = ''
  try { trace = fs.readdirSync(path.join(a.home, '.relais')).map((f) => fs.readFileSync(path.join(a.home, '.relais', f), 'utf8')).join('\n') } catch { trace = '' }
  if (trace.includes(CLE_SENTINELLE) || !/"issue":"ok"/.test(trace)) e.push('journal du relais du chef absent ou porteur de la clé')
  // un routeur libre (fl) qui sort en code 0 sans écrire le plan : les trois modèles de freellmapi sont écartés, Ollama Cloud écrit le plan
  const s = lancerServir('echange-chef', ['ollama-usine'], ['--relais=oui'], ['fl'])
  if (s.reponse?.code !== 0 || s.reponse?.moteur !== 'ollama_cloud') e.push(`routeur silencieux : réponse ${JSON.stringify({ code: s.reponse?.code, moteur: s.reponse?.moteur })} (code 0, ollama_cloud attendus)`)
  if (s.appels.map((x) => x.fournisseur).join('>') !== 'openai>fl>fl>fl>fl>fl>ollama-usine') e.push(`routeur silencieux : fournisseurs ${s.appels.map((x) => x.fournisseur).join('>')}`)
  // sans --relais et avec un faux binaire : l'ancien comportement (aucun secours)
  const b = lancerServir('echange-chef', 'fl')
  if (b.appels.length !== 1 || b.reponse?.code === 0) e.push('banc d\'essai sans --relais : un secours est tenté')
  // la FILE IA (les prospects) : jamais un secours, même avec --relais=oui
  const c = lancerServir('echange-ia', 'fl', ['--relais=oui'])
  if (c.appels.length !== 1 || c.reponse?.code === 0 || c.reponse?.moteur) e.push(`file IA : ${c.appels.length} appel(s), code ${JSON.stringify(c.reponse?.code)} — un secours a servi une donnée de prospect`)
  return e
})

process.stdout.write(`\n@@RESULTATS@@${JSON.stringify({ resultats })}\n`)
