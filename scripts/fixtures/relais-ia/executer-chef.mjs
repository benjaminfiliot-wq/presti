// scripts/fixtures/relais-ia/executer-chef.mjs — le second enfant du juge scripts/relais-ia-qa.mjs : le relais du CHEF
// (scripts/usine/relais-chef.mjs et scripts/usine/chef-modele.mjs), sur DOUBLURES seulement (un faux « codex », de faux serveurs HTTP sur
// 127.0.0.1, des dossiers jetables, une clé et des « coordonnées » inventées). Lancé comme executer.mjs : cwd = la racine jugée.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
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

// Les chemins cités dans une consigne sont ceux de l'usine (Linux) : sur le poste, les dossiers jetables s'écrivent avec des barres obliques.
const sl = (x) => String(x).split(path.sep).join('/')
const ENTREE_PUBLIQUE = '<donnees_etat>{"agents":[{"nom":"chef"}]}</donnees_etat> contact : noreply@prestiapp.fr'
const ENTREE_PROSPECT = `<donnees_etat>{"resume":"le prospect ${ADRESSE} a répondu"}</donnees_etat>`

// ── le relais, avec un `executer` doublé : chaque moteur a son comportement ──────────────────────────────────────────────
function mondeChef(sc = {}) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'relais-chef-qa-'))
  const lances = []
  let t = T0
  const sorties = {
    ok: { code: 0, sortie: 'plan écrit' },
    '401': { code: 1, sortie: 'ERROR: unexpected status 401 Unauthorized: Missing bearer' },
    quota: { code: 1, sortie: "ERROR: You've hit your usage limit. try again at Oct 9th, 2026 9:15 PM." },
    '429': { code: 1, sortie: 'ERROR: unexpected status 429 Too Many Requests' },
    cloud429: { code: 1, sortie: 'ERROR: You reached the Free usage limit.' },
    panne: { code: 1, sortie: 'ERROR: error sending request' },
    silencieux: { code: 0, sortie: 'réponse non JSON' },
  }
  let dernierMode = null
  const executer = async (m, budget) => {
    lances.push({ id: m.id, modele: m.modele, budget })
    const prevu = sc[m.id] ?? 'panne'
    const mode = Array.isArray(prevu) ? (prevu.length > 1 ? prevu.shift() : prevu[0]) : prevu // une liste : un comportement par appel
    dernierMode = mode
    return { ...(sorties[mode] ?? sorties.panne), delai: mode === 'delai' }
  }
  const attentes = []
  const base = { texteEntree: ENTREE_PUBLIQUE, delaiMs: 900_000, executer, etat: C.magasinFichier(dossier), journal: C.journalFichier(dossier, () => t), maintenant: () => t, attendre: async (ms) => { attentes.push(ms); t += ms }, cle: CLE_SENTINELLE, drapeau: false, verifier: () => dernierMode !== 'silencieux', ...(sc.opts ?? {}) }
  return { base, lances, dossier, attentes, avancer: (ms) => { t += ms }, ids: () => lances.map((l) => l.id).join('>') }
}

await cas('RC-1', async () => {
  const e = []
  const m = mondeChef({ codex: '401', freellmapi_gemini: 'ok' })
  const r = await C.relayer(m.base)
  if (r.code !== 0 || r.moteur !== 'freellmapi_gemini') e.push(`servi par ${r.moteur} code ${r.code} (attendu freellmapi_gemini, 0)`)
  if (m.ids() !== 'codex>freellmapi_gemini') e.push(`ordre ${m.ids()}`)
  if (m.lances[1]?.modele !== 'gemini-3-flash-preview') e.push('le premier secours n\'est pas gemini-3-flash-preview')
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
  const court = { delaiMs: 200_000 }
  const m = mondeChef({ codex: '401', freellmapi: '429', freellmapi_gemini: '429', freellmapi_mistral: '429', ollama_cloud: 'cloud429', ollama_8b: 'ok', opts: court })
  const r = await C.relayer(m.base)
  if (m.ids() !== 'codex>freellmapi_gemini>freellmapi_mistral>freellmapi>ollama_cloud>ollama_8b') e.push(`ordre ${m.ids()}`)
  if (r.moteur !== 'ollama_8b') e.push(`servi par ${r.moteur}`)
  const j = journalDe(m.dossier)
  if (j.find((x) => x.moteur === 'freellmapi')?.raison !== 'quota' || j.find((x) => x.moteur === 'ollama_cloud')?.raison !== 'quota') e.push('429 et « Free usage limit » non tracés en quota')
  const m2 = mondeChef({ codex: '401', freellmapi: 'panne', freellmapi_gemini: 'panne', freellmapi_mistral: 'panne', ollama_cloud: 'panne', ollama_8b: 'panne', ollama_4b: 'ok' })
  if ((await C.relayer(m2.base)).moteur !== 'ollama_4b') e.push('le 8B en panne : le 4B ne prend pas')
  const m3 = mondeChef({ codex: '401', freellmapi: '429', freellmapi_gemini: '429', freellmapi_mistral: '429', ollama_cloud: 'cloud429', ollama_8b: 'panne', ollama_4b: 'panne', opts: court })
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
  if (m2.lances.some((l) => l.id.startsWith('freellmapi') || l.id === 'ollama_cloud')) e.push('une entrée de prospect va au gratuit ou au cloud')
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
  if (C.classerSortie('ERROR: unexpected status 429 Too Many Requests', T0).raison !== 'quota') e.push('429 non classé quota')
  if (C.classerSortie('error sending request', T0).raison !== 'indisponible') e.push('panne non classée')
  return e
})

await cas('RC-8', async () => {
  const e = []
  // un moteur libre qui sort en code 0 sans faire le travail (prose) n'est pas un succès : le suivant prend la demande, sans mise de côté
  const m = mondeChef({ codex: '401', freellmapi_gemini: 'silencieux', freellmapi_mistral: 'ok' })
  const r = await C.relayer(m.base)
  if (r.moteur !== 'freellmapi_mistral' || m.ids() !== 'codex>freellmapi_gemini>freellmapi_mistral') e.push(`moteur silencieux : ${m.ids()} servi par ${r.moteur}`)
  const etat = JSON.parse(fs.readFileSync(path.join(m.dossier, 'etat-chef.json'), 'utf8')).moteurs
  if (etat.freellmapi_gemini) e.push('un moteur silencieux est mis de côté (il peut répondre juste la fois suivante)')
  if (journalDe(m.dossier).find((x) => x.moteur === 'freellmapi_gemini')?.raison !== 'sortie_invalide') e.push('sortie sans plan non tracée en sortie_invalide')
  // « auto » a deux essais : un silence puis un plan écrit sur le même moteur
  const m3 = mondeChef({ codex: '401', freellmapi_gemini: 'panne', freellmapi_mistral: 'panne', freellmapi: ['silencieux', 'ok'] })
  const r3 = await C.relayer(m3.base)
  if (r3.moteur !== 'freellmapi' || m3.lances.filter((l) => l.id === 'freellmapi').length !== 2) e.push(`« auto » : servi par ${r3.moteur}, ${m3.lances.filter((l) => l.id === 'freellmapi').length} essai(s) (2 attendus)`)
  const m2 = mondeChef({ codex: 'silencieux', freellmapi: 'silencieux', freellmapi_gemini: 'silencieux', freellmapi_mistral: 'silencieux', ollama_cloud: 'silencieux', ollama_8b: 'silencieux', ollama_4b: 'silencieux' })
  if ((await C.relayer(m2.base)).code === 0) e.push('tous silencieux : code 0')
  return e
})

await cas('RC-9', async () => {
  const e = []
  // les moteurs libres sont limités par minute : tous à bout par un quota, le relais ATTEND la reprise du premier (5 min) et refait un tour
  const m = mondeChef({ codex: '401', freellmapi_gemini: ['429', 'ok'], freellmapi_mistral: '429', freellmapi: '429', ollama_cloud: 'cloud429', ollama_8b: 'ok' })
  const r = await C.relayer(m.base)
  if (m.ids() !== 'codex>freellmapi_gemini>freellmapi_mistral>freellmapi>ollama_cloud>freellmapi_gemini' || r.moteur !== 'freellmapi_gemini') e.push(`après l'attente : ${m.ids()} servi par ${r.moteur}`)
  if (m.attentes.length !== 1 || !(m.attentes[0] > 290_000 && m.attentes[0] <= 330_000)) e.push(`attentes ${JSON.stringify(m.attentes)} (une seule, d'environ 5 min)`)
  if (!journalDe(m.dossier).some((x) => x.raison === 'attente_reprise')) e.push('l\'attente n\'est pas tracée')
  const m2 = mondeChef({ codex: '401', freellmapi_gemini: '429', freellmapi_mistral: '429', freellmapi: '429', ollama_cloud: 'cloud429', ollama_8b: 'ok', opts: { delaiMs: 400_000 } })
  const r2 = await C.relayer(m2.base)
  if (m2.attentes.length || r2.moteur !== 'ollama_8b') e.push(`délai court : ${m2.attentes.length} attente(s), servi par ${r2.moteur}`)
  const m3 = mondeChef({ codex: '401', freellmapi_gemini: '429', freellmapi_mistral: '429', freellmapi: '429', ollama_cloud: 'cloud429', ollama_8b: 'ok', opts: { delaiMs: 1_800_000 } })
  await C.relayer(m3.base)
  if (m3.attentes.length > 2 || m3.attentes.some((x) => x > 330_000)) e.push(`attentes ${JSON.stringify(m3.attentes)} : trop longues ou trop nombreuses`)
  return e
})

// ── RC-10 : l'appel direct ───────────────────────────────────────────────────────────────────────────────────────────
function monde10() {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'relais-chef-prompt-'))
  const d = path.join(dossier, 'echange', 'demande-1')
  const work = path.join(dossier, 'agents')
  fs.mkdirSync(path.join(work, 'docs', 'agents'), { recursive: true })
  fs.mkdirSync(d, { recursive: true })
  fs.writeFileSync(path.join(work, 'docs', 'agents', 'chef.md'), '# Chef\nTu écris un plan JSON.')
  fs.writeFileSync(path.join(work, 'docs', 'agents', 'chef-plan.schema.json'), '{"type":"object"}')
  fs.writeFileSync(path.join(d, 'entree-2-entree.md'), ENTREE_PUBLIQUE)
  fs.writeFileSync(path.join(dossier, 'secret.txt'), 'NE-DOIT-PAS-ETRE-LU')
  const plan = path.join(d, 'sortie-3-plan.json'), dm = path.join(d, 'sortie-1-dernier-message.md')
  const instruction = `Lis docs/agents/chef.md puis ${sl(d)}/entree-2-entree.md et ecris le plan du cycle leger dans ${sl(plan)} : un seul fichier JSON conforme a docs/agents/chef-plan.schema.json, rien d autre. Ignore ${sl(dossier)}/secret.txt.`
  const argv = ['exec', '-C', work, '-s', 'workspace-write', '--skip-git-repo-check', '-o', dm, '-m', 'gpt-6-luna', instruction]
  const sorties = [{ copie: dm }, { copie: plan }]
  const lireFichier = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
  return { dossier, d, work, plan, dm, argv, sorties, lireFichier, dossiersPermis: [d, path.dirname(d)] }
}
function reponseFetch(statut, corps, delai) {
  return async (url, init) => {
    reponseFetch.vu = { url, init, corps: init?.body ? JSON.parse(init.body) : null }
    if (delai) return new Promise((_, rej) => init.signal.addEventListener('abort', () => { const x = new Error('aborted'); x.name = 'AbortError'; rej(x) }))
    if (corps === 'refus') throw new TypeError('fetch failed')
    return { ok: statut >= 200 && statut < 300, status: statut, text: async () => JSON.stringify(corps), json: async () => corps }
  }
}
await cas('RC-10', async () => {
  const e = []
  const w = monde10()
  const p = C.preparerPromptDirect({ argv: w.argv, sorties: w.sorties, lireFichier: w.lireFichier, dossiersPermis: w.dossiersPermis })
  if (!p) return ['preparerPromptDirect rend null pour une demande « lis puis écris »']
  if (p.destination !== w.plan) e.push(`destination ${p.destination} (attendu le plan, pas le dernier message)`)
  for (const attendu of ['Tu écris un plan JSON', ENTREE_PUBLIQUE, '"type":"object"']) if (!p.utilisateur.includes(attendu)) e.push(`le message ne porte pas « ${attendu.slice(0, 30)} »`)
  if (p.utilisateur.includes('NE-DOIT-PAS-ETRE-LU')) e.push('un fichier hors des dossiers permis est lu')
  if (C.preparerPromptDirect({ argv: w.argv, sorties: [...w.sorties, { copie: path.join(w.d, 'sortie-4-autre.json') }], lireFichier: w.lireFichier, dossiersPermis: w.dossiersPermis }) !== null) e.push('deux sorties : un secours est tenté')
  // freellmapi : /v1/chat/completions, la clé en Bearer ; le JSON (même sous clôture) est écrit à la place du plan
  const moteurFl = C.CHAINE_SECOURS.find((m) => m.id === 'freellmapi_gemini')
  const jOk = (x) => ({ choices: [{ message: { content: x } }] })
  let r = await C.appelDirect({ moteur: moteurFl, prompt: p, cle: CLE_SENTINELLE, delaiMs: 5000, fetchFn: reponseFetch(200, jOk('```json\n{"cycle":"leger"}\n```')) })
  if (r.code !== 0 || !fs.existsSync(w.plan) || JSON.parse(fs.readFileSync(w.plan, 'utf8')).cycle !== 'leger') e.push('le JSON du moteur n\'est pas écrit dans le plan')
  const v = reponseFetch.vu
  if (!/\/v1\/chat\/completions$/.test(v.url) || v.init.headers.authorization !== `Bearer ${CLE_SENTINELLE}`) e.push('freellmapi : adresse ou clé Bearer incorrecte')
  if (v.corps.model !== 'gemini-3-flash-preview') e.push('freellmapi : modèle demandé incorrect')
  if (JSON.stringify(r).includes(CLE_SENTINELLE)) e.push('la clé est dans la sortie')
  // Ollama : /api/chat, sans clé, contexte large, sans réflexion, JSON forcé
  const w2 = monde10()
  const p2 = C.preparerPromptDirect({ argv: w2.argv, sorties: w2.sorties, lireFichier: w2.lireFichier, dossiersPermis: w2.dossiersPermis })
  r = await C.appelDirect({ moteur: C.CHAINE_SECOURS.find((m) => m.id === 'ollama_8b'), prompt: p2, cle: CLE_SENTINELLE, delaiMs: 5000, fetchFn: reponseFetch(200, { message: { content: '{"cycle":"leger"}' } }) })
  const v2 = reponseFetch.vu
  if (r.code !== 0 || !/\/api\/chat$/.test(v2.url) || v2.init.headers.authorization) e.push('Ollama : adresse incorrecte, ou une clé part vers Ollama')
  if (v2.corps.think !== false || v2.corps.format !== 'json' || !(v2.corps.options?.num_ctx >= 16384)) e.push('Ollama : réflexion, JSON forcé ou contexte non réglés')
  // les échecs : texte classable, rien d'écrit
  const w3 = monde10()
  const p3 = C.preparerPromptDirect({ argv: w3.argv, sorties: w3.sorties, lireFichier: w3.lireFichier, dossiersPermis: w3.dossiersPermis })
  const essai = async (statut, corps, delai) => C.appelDirect({ moteur: moteurFl, prompt: p3, cle: CLE_SENTINELLE, delaiMs: delai ? 30 : 5000, fetchFn: reponseFetch(statut, corps, delai) })
  const q = await essai(429, { error: { message: 'rate limited' } })
  if (q.code === 0 || C.classerSortie(q.sortie, T0).raison !== 'quota') e.push('429 non rendu comme quota')
  const n = await essai(401, { error: 'Invalid API key' })
  if (n.code === 0 || C.classerSortie(n.sortie, T0).raison !== 'non_autorise') e.push('401 non rendu comme refus d\'accès')
  const pr = await essai(200, jOk('Voici le plan : je ne peux pas.'))
  if (pr.code !== 0 || fs.existsSync(w3.plan)) e.push('une réponse en prose est écrite comme plan')
  const dl = await essai(200, null, true)
  if (dl.code === 0 || dl.delai !== true) e.push('délai non rendu')
  const rf = await essai(200, 'refus')
  if (rf.code === 0 || C.classerSortie(rf.sortie, T0).raison !== 'indisponible') e.push('connexion refusée non rendue comme panne')
  // le validateur du chef : un premier jet refusé, le modèle reçoit les écarts (sans valeur) et renvoie un JSON corrigé ; trois refus : rien d'écrit
  const w4 = monde10()
  const p4 = C.preparerPromptDirect({ argv: w4.argv, sorties: w4.sorties, lireFichier: w4.lireFichier, dossiersPermis: w4.dossiersPermis, dateDuJour: '2026-10-05' })
  if (!p4.utilisateur.includes('Date du jour (heure de Paris) : 2026-10-05')) e.push('la date du jour n\'est pas donnée au modèle')
  const suite = (reponses) => { const vus = []; return { vus, fetchFn: async (url, init) => { vus.push(JSON.parse(init.body)); const c = reponses.length > 1 ? reponses.shift() : reponses[0]; return { ok: true, status: 200, text: async () => '', json: async () => c } } } }
  const refus = (o) => (/<date>/.test(String(o.cle)) ? ['cle : chef:<date>:<mot-clé>'] : [])
  const s1 = suite([jOk('{"cle":"chef:<date>:x"}'), jOk('{"cle":"chef:2026-10-05:x"}')])
  const rc = await C.appelDirect({ moteur: moteurFl, prompt: p4, cle: CLE_SENTINELLE, delaiMs: 5000, fetchFn: s1.fetchFn, valider: refus })
  if (rc.code !== 0 || s1.vus.length !== 2 || JSON.parse(fs.readFileSync(w4.plan, 'utf8')).cle !== 'chef:2026-10-05:x') e.push(`correction : code ${rc.code}, ${s1.vus.length} appel(s), plan ${fs.existsSync(w4.plan) ? 'écrit' : 'absent'} (2 appels et le plan corrigé attendus)`)
  else if (!JSON.stringify(s1.vus[1].messages).includes('refusé par le validateur') || !JSON.stringify(s1.vus[1].messages).includes('chef:<date>:<mot-clé>')) e.push('la correction ne rend pas les écarts au modèle')
  const w5 = monde10()
  const p5 = C.preparerPromptDirect({ argv: w5.argv, sorties: w5.sorties, lireFichier: w5.lireFichier, dossiersPermis: w5.dossiersPermis })
  const s2 = suite([jOk('{"cle":"chef:<date>:x"}')])
  const r5 = await C.appelDirect({ moteur: moteurFl, prompt: p5, cle: CLE_SENTINELLE, delaiMs: 5000, fetchFn: s2.fetchFn, valider: refus })
  if (r5.code !== 0 || fs.existsSync(w5.plan) || s2.vus.length !== 3) e.push(`trois refus : code ${r5.code}, ${s2.vus.length} appel(s), plan ${fs.existsSync(w5.plan) ? 'écrit' : 'absent'} (3 appels, rien d'écrit attendus)`)
  // les adresses de fournisseurs de banc d'essai : seulement 127.0.0.1
  const bases = C.chaineAvecBases({ freellmapi: 'http://127.0.0.1:9/v1', ollama: 'https://exemple.com' })
  if (!bases.find((m) => m.id === 'freellmapi').base.startsWith('http://127.0.0.1:9') || bases.find((m) => m.id === 'ollama_8b').base.includes('exemple.com')) e.push('une adresse non locale est acceptée pour un fournisseur')
  return e
})

// ── RC-7 : chef-modele.mjs servir, de bout en bout : faux « codex » (401), vrais serveurs HTTP de doublure ──────────────
function serveur(fn) {
  return new Promise((ok) => {
    const requetes = []
    const s = http.createServer((req, res) => {
      let corps = ''
      req.on('data', (c) => { corps += c })
      req.on('end', () => {
        let j = null
        try { j = JSON.parse(corps) } catch { j = null }
        requetes.push({ url: req.url, auth: req.headers.authorization ?? null, modele: j?.model ?? null, brut: corps })
        const r = fn(req.url, j)
        res.writeHead(r.statut, { 'content-type': 'application/json' })
        res.end(JSON.stringify(r.corps))
      })
    })
    s.listen(0, '127.0.0.1', () => ok({ s, requetes, port: s.address().port, fermer: () => new Promise((f) => s.close(f)) }))
  })
}
const lancer = (args, env) => new Promise((ok) => { const p = spawn(process.execPath, args, { cwd: racine, env, stdio: 'ignore' }); p.on('close', ok); p.on('error', ok) })

await cas('RC-7', async () => {
  const e = []
  const faux = path.join(racine, 'scripts', 'fixtures', 'relais-ia', 'faux-codex-chef.mjs')
  const PLAN = { cycle: 'leger', brief: ['a', 'b', 'c'], compte_rendu: ['a', 'b', 'c'], consignes_lues: [], taches: [], decisions: [] } // valide pour validerPlan (scripts/chef/commun.mjs)
  const lancerServir = async (nomEchange, srvFl, srvOl, extraArgs = []) => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'relais-chef-srv-'))
    const echange = path.join(base, nomEchange)
    const d = path.join(echange, 'demande-1')
    const work = path.join(base, 'agents')
    fs.mkdirSync(path.join(work, 'docs', 'agents'), { recursive: true })
    fs.mkdirSync(d, { recursive: true })
    fs.writeFileSync(path.join(work, 'docs', 'agents', 'chef.md'), '# Chef')
    fs.writeFileSync(path.join(work, 'docs', 'agents', 'chef-plan.schema.json'), '{"type":"object"}')
    const home = path.join(base, 'home')
    fs.mkdirSync(path.join(home, '.config', 'presti'), { recursive: true })
    fs.writeFileSync(path.join(home, '.config', 'presti', 'freellmapi.key'), `${CLE_SENTINELLE}\n`)
    fs.writeFileSync(path.join(d, 'entree-2-entree.md'), ENTREE_PUBLIQUE)
    const plan = path.join(d, 'sortie-3-plan.json'), dm = path.join(d, 'sortie-1-dernier-message.md')
    const instruction = `Lis docs/agents/chef.md puis ${sl(d)}/entree-2-entree.md et ecris le plan du cycle leger dans ${sl(plan)} : un seul fichier JSON conforme a docs/agents/chef-plan.schema.json, rien d autre.`
    const argv = ['exec', '-C', work, '-s', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=false', '--skip-git-repo-check', '--color', 'never', '-o', dm, '-m', 'gpt-6-luna', instruction]
    fs.writeFileSync(path.join(d, 'demande.json'), JSON.stringify({ argv, entrees: [{ origine: '/o/entree.md', copie: path.join(d, 'entree-2-entree.md') }], sorties: [{ origine: '/o/dm.md', copie: dm }, { origine: '/o/plan.json', copie: plan }], stdin: false, delai_s: 120 }))
    fs.writeFileSync(path.join(d, 'demande.pret'), '')
    const journal = path.join(base, 'appels.jsonl')
    fs.writeFileSync(path.join(d, 'faux-config.json'), JSON.stringify({ reussitAvec: [], echec: '401', journal }))
    const bases = srvFl ? [`--freellmapi=http://127.0.0.1:${srvFl.port}/v1`, `--ollama=http://127.0.0.1:${srvOl.port}`] : []
    await lancer([path.join(racine, 'scripts', 'usine', 'chef-modele.mjs'), 'servir', `--echange=${echange}`, `--codex=${faux}`, ...bases, ...extraArgs], { PATH: process.env.PATH, HOME: home })
    const reponse = (() => { try { return JSON.parse(fs.readFileSync(path.join(d, 'reponse.json'), 'utf8')) } catch { return null } })()
    const appels = fs.existsSync(journal) ? fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean).length : 0
    const planEcrit = fs.existsSync(plan) ? (() => { try { return JSON.parse(fs.readFileSync(plan, 'utf8')) } catch { return null } })() : null
    let trace = ''
    try { trace = fs.readdirSync(path.join(home, '.relais')).map((f) => fs.readFileSync(path.join(home, '.relais', f), 'utf8')).join('\n') } catch { trace = '' }
    return { reponse, appels, planEcrit, trace }
  }
  const ok = (x) => ({ statut: 200, corps: x })
  // a) la file du chef : Codex 401 → gemini (freellmapi) écrit le plan
  const fl = await serveur((url, j) => ok({ choices: [{ message: { content: JSON.stringify(PLAN) } }] }))
  const ol = await serveur(() => ok({ message: { content: JSON.stringify(PLAN) } }))
  const a = await lancerServir('echange-chef', fl, ol, ['--relais=oui'])
  if (a.reponse?.code !== 0 || a.reponse?.moteur !== 'freellmapi_gemini') e.push(`file du chef : réponse ${JSON.stringify({ code: a.reponse?.code, moteur: a.reponse?.moteur })} (code 0, freellmapi_gemini attendus)`)
  if (a.appels !== 1) e.push(`file du chef : Codex appelé ${a.appels} fois (1 attendu)`)
  if (JSON.stringify(a.planEcrit) !== JSON.stringify(PLAN)) e.push('file du chef : le plan du moteur n\'est pas écrit à la place du fichier de sortie')
  if (fl.requetes[0]?.auth !== `Bearer ${CLE_SENTINELLE}` || fl.requetes[0]?.modele !== 'gemini-3-flash-preview') e.push('file du chef : freellmapi sans clé ou sans le bon modèle')
  if (ol.requetes.length) e.push('file du chef : une requête part vers Ollama alors que freellmapi a répondu')
  if (JSON.stringify(a.reponse).includes(CLE_SENTINELLE) || a.trace.includes(CLE_SENTINELLE) || !/"issue":"ok"/.test(a.trace)) e.push('reponse.json ou le journal du relais porte la clé, ou le journal manque')
  // b) freellmapi répond en prose partout : Ollama Cloud écrit le plan
  const flProse = await serveur(() => ok({ choices: [{ message: { content: 'Désolé, je ne peux pas.' } }] }))
  const b = await lancerServir('echange-chef', flProse, ol, ['--relais=oui'])
  if (b.reponse?.code !== 0 || b.reponse?.moteur !== 'ollama_cloud' || JSON.stringify(b.planEcrit) !== JSON.stringify(PLAN)) e.push(`freellmapi en prose : réponse ${JSON.stringify({ code: b.reponse?.code, moteur: b.reponse?.moteur })} (ollama_cloud attendu)`)
  if (flProse.requetes.length !== 4 || ol.requetes[ol.requetes.length - 1]?.url !== '/api/chat') e.push(`freellmapi en prose : ${flProse.requetes.length} requête(s) (gemini, mistral, auto ×2 = 4 attendues)`)
  // c) sans --relais et avec un faux binaire : l'ancien comportement (aucun secours)
  const nF = fl.requetes.length
  const c = await lancerServir('echange-chef', fl, ol)
  if (c.appels !== 1 || c.reponse?.code === 0 || fl.requetes.length !== nF) e.push('banc d\'essai sans --relais : un secours est tenté')
  // d) la FILE IA (les prospects) : jamais un secours, même avec --relais=oui
  const nF2 = fl.requetes.length, nO2 = ol.requetes.length
  const dd = await lancerServir('echange-ia', fl, ol, ['--relais=oui'])
  if (dd.appels !== 1 || dd.reponse?.code === 0 || dd.reponse?.moteur || fl.requetes.length !== nF2 || ol.requetes.length !== nO2) e.push(`file IA : ${dd.appels} appel(s) à Codex, ${fl.requetes.length - nF2 + ol.requetes.length - nO2} requête(s) aux secours — un secours a servi une donnée de prospect`)
  // e) un plan que le validateur du chef refuse (clé d'idempotence en gabarit) n'est JAMAIS écrit : trois jets par moteur, puis le moteur suivant
  const PLAN_MAUVAIS = { ...PLAN, taches: [{ type: 'veille', capacite: 'veille', cle_idempotence: 'chef:<date>:x', charge: { titre: 't', pourquoi: 'p' }, sortante: false }] }
  const flMauvais = await serveur(() => ok({ choices: [{ message: { content: JSON.stringify(PLAN_MAUVAIS) } }] }))
  const olMauvais = await serveur(() => ok({ message: { content: JSON.stringify(PLAN_MAUVAIS) } }))
  const ee = await lancerServir('echange-chef', flMauvais, olMauvais, ['--relais=oui'])
  if (ee.planEcrit || ee.reponse?.code === 0) e.push('un plan refusé par le validateur du chef est écrit comme plan du cycle')
  if (flMauvais.requetes.length < 6 || !flMauvais.requetes[1]) e.push(`plan refusé : ${flMauvais.requetes.length} requête(s) aux moteurs libres (des corrections attendues)`)
  await flMauvais.fermer(); await olMauvais.fermer()
  await fl.fermer(); await ol.fermer(); await flProse.fermer()
  return e
})

process.stdout.write(`\n@@RESULTATS@@${JSON.stringify({ resultats })}\n`)
