// scripts/fixtures/relais-ia/executer.mjs — l'enfant du juge scripts/relais-ia-qa.mjs : les scénarios du relais d'IA, sur DOUBLURES seulement.
//
// Lancé par le juge : `node --experimental-strip-types --import <dépôt>/scripts/ts-loader.mjs <ce fichier> <racine jugée>`, cwd = la racine
// jugée (le dépôt, ou une copie sabotée). Il importe lib/agents/relais.ts DE CETTE RACINE et lui passe des doublures : un faux lanceur
// de Codex (aucun processus de modèle), un faux `fetch` (aucun réseau), une horloge, un dossier de mémoire jetable. Aucune clé réelle,
// aucune donnée réelle : les « coordonnées » et la « clé » sont des sentinelles inventées. Sortie : une ligne JSON { resultats }.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { pathToFileURL } from 'node:url'

const racine = path.resolve(process.argv[2])
const R = await import(pathToFileURL(path.join(racine, 'lib', 'agents', 'relais.ts')).href)

const T0 = Date.parse('2026-10-05T10:00:00Z')
const CLE_SENTINELLE = 'cle-sentinelle-FL-1234567890abcdefghijklmnop'
const TEXTE_SENTINELLE = 'SENTINELLE-TEXTE-UNIQUE-77'
const ADRESSE = 'jean.dupont@exemple.fr'
const resultats = []

async function cas(id, f) {
  try {
    const echecs = await f()
    resultats.push({ id, ok: !echecs.length, detail: echecs.length ? echecs.join(' ; ') : 'ok' })
  } catch (e) { resultats.push({ id, ok: false, detail: `exception : ${e?.stack || e}` }) }
}

// ── le monde doublé ──────────────────────────────────────────────────────────────────────────────────────────────────
function monde(sc = {}) {
  const lancements = []
  const requetes = []
  const couts = []
  let t = T0
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'relais-qa-'))
  const lancer = (chemin, argv, opts) => {
    lancements.push({ chemin, argv, env: opts?.env })
    const e = new EventEmitter()
    e.stdin = { write() {}, end() {} }
    e.stdout = new EventEmitter()
    e.stderr = new EventEmitter()
    e.kill = () => {}
    setImmediate(() => {
      const s = sc.codex ?? 'absent'
      const i = argv.indexOf('--output-last-message')
      if (s === 'ok') { fs.writeFileSync(argv[i + 1], '{"ok":true,"via":"codex"}'); e.emit('close', 0) }
      else if (s === 'quota') { e.stdout.emit('data', Buffer.from("ERROR: You've hit your usage limit. Upgrade to Pro, or try again at 2026-10-09 21:15.\n")); e.emit('close', 1) }
      else if (s === 'quota_stderr') { e.stderr.emit('data', Buffer.from("ERROR: You've hit your usage limit. try again at 2026-10-09 21:15\n")); e.emit('close', 1) }
      else if (s === '401') { e.stdout.emit('data', Buffer.from('ERROR: unexpected status 401 Unauthorized: Missing bearer or basic authentication in header\n')); e.emit('close', 1) }
      else if (s === 'nonjson') { fs.writeFileSync(argv[i + 1], 'bonjour, voici ma réponse'); e.emit('close', 0) }
      else e.emit('close', 1)
    })
    return e
  }
  const reponses = {
    ok: (via) => ({ status: 200, json: { choices: [{ message: { content: JSON.stringify({ ok: true, via }) } }] } }),
    '429': () => ({ status: 429, text: '{"error":{"message":"You reached the Free usage limit.","type":"api_error"}}' }),
    '429fl': () => ({ status: 429, text: JSON.stringify({ error: { message: 'All models exhausted', code: 'rate_limit_exceeded', retryAtMs: T0 + 90_000 } }) }),
    '401': () => ({ status: 401, text: '{"error":{"message":"Invalid API key"}}' }),
    '403': () => ({ status: 403, text: '{"error":{"message":"forbidden"}}' }),
    '500': () => ({ status: 500, text: 'oups' }),
    nonjson: () => ({ status: 200, json: { choices: [{ message: { content: 'voici une prose' } }] } }),
    fence: () => ({ status: 200, json: { choices: [{ message: { content: '```json\n{"ok":true,"via":"fence"}\n```' } }] } }),
    groq: () => ({ status: 200, json: { choices: [{ message: { content: '{"ok":true,"via":"groq"}' } }], fournisseur_reel: 'groq-llama' } }),
  }
  const cibleDe = (url, modele) => (/:3001\b/.test(url) ? 'free' : /-cloud$|:cloud$/.test(String(modele)) ? 'cloud' : /8b/.test(String(modele)) ? 'm8' : 'm4')
  const fetchFn = async (url, init) => {
    const corps = JSON.parse(init.body)
    const cible = cibleDe(url, corps.model)
    requetes.push({ cible, url, modele: corps.model, autorisation: init.headers?.authorization ?? null, brut: init.body, corps })
    const mode = sc[cible] ?? 'refused'
    if (mode === 'refused') throw new TypeError('fetch failed')
    if (mode === 'hang') return new Promise((_, rej) => init.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e) }))
    const r = reponses[mode](cible)
    return { ok: r.status >= 200 && r.status < 300, status: r.status, headers: { get: () => null }, json: async () => r.json, text: async () => r.text ?? JSON.stringify(r.json) }
  }
  const env = { CODEX_LANCEUR: process.execPath, OLLAMA_URL: 'http://127.0.0.1:11434', FREELLMAPI_URL: 'http://127.0.0.1:3001', FL_KEY: CLE_SENTINELLE, ...(sc.env ?? {}) }
  if (sc.sansCodex) delete env.CODEX_LANCEUR
  const deps = {
    env, lancer, fetch: fetchFn, dossier, reglages: {}, lecons: [],
    maintenant: () => t,
    enregistrerCout: async (agent, montant, detail) => { couts.push({ agent, montant, detail }); return { ok: true } },
    verifierPlafond: async () => true,
    ...(sc.deps ?? {}),
  }
  return { deps, lancements, requetes, couts, dossier, avancer: (ms) => { t += ms }, horloge: () => t }
}
const journalDe = (dossier) => fs.readdirSync(dossier).filter((f) => f.startsWith('relais-')).flatMap((f) => fs.readFileSync(path.join(dossier, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)))
const cibles = (m) => m.requetes.map((r) => r.cible)
const DONNEES = { texte: `${TEXTE_SENTINELLE} ; écrire à ${ADRESSE} pour le devis cuisine` }
const DATE_OUI = '2026-09-01'

// ── RI-1 : tables de chaînes (pures) ─────────────────────────────────────────────────────────────────────────────────
await cas('RI-1', async () => {
  const e = []
  const chaine = (a, n) => R.construireChaine(R.politiqueDe(a), n ?? R.politiqueDe(a).nature).join('>')
  const attendu = {
    studio: 'codex>freellmapi>ollama_cloud>ollama_8b>ollama_4b',
    douleurs: 'freellmapi>codex>ollama_cloud>ollama_4b>ollama_8b',
    standardiste: 'codex>ollama_4b>ollama_8b',
    redacteur_site: 'codex>ollama_8b>ollama_4b',
    veille_pubs: 'codex>ollama_4b>ollama_8b',
    facteur: 'codex',
  }
  for (const [a, c] of Object.entries(attendu)) if (chaine(a) !== c) e.push(`chaîne de ${a} = ${chaine(a)} (attendu ${c})`)
  for (const a of ['standardiste', 'facteur', 'redacteur_site', 'veille_pubs']) {
    const c = chaine(a, 'prospect')
    if (/freellmapi|cloud/.test(c)) e.push(`la chaîne prospect de ${a} cite freellmapi ou le cloud : ${c}`)
  }
  if (R.politiqueDe('chef') !== null) e.push('le chef (affichage) a un lecteur')
  if (R.politiqueDe('inconnu') !== null) e.push('un agent inconnu a une politique')
  if (R.natureEffective('prospect', 'publique') !== 'prospect') e.push('la nature a été baissée')
  if (R.natureEffective('publique', 'prospect') !== 'prospect') e.push('la nature ne se relève pas')
  if (R.moteurPermis('freellmapi', 'prospect') || R.moteurPermis('ollama_cloud', 'prospect')) e.push('moteurPermis laisse un prospect aller au gratuit ou au cloud')
  if (!R.moteurPermis('codex', 'prospect') || !R.moteurPermis('ollama_4b', 'prospect')) e.push('moteurPermis refuse Codex ou le local à un prospect')
  return e
})

// ── RI-2 : donnée publique, Codex sert quand il répond ───────────────────────────────────────────────────────────────
await cas('RI-2', async () => {
  const m = monde({ codex: 'ok', free: 'ok' })
  const l = R.creerLecteurRelais('studio', {}, m.deps)
  const v = await l('écris', DONNEES)
  const e = []
  if (v?.via !== 'codex') e.push(`servi par ${JSON.stringify(v)} (attendu codex)`)
  if (m.requetes.length) e.push('une requête HTTP part alors que Codex répond')
  if (l.dernier !== 'codex:gpt-6-sol') e.push(`dernier = ${l.dernier}`)
  return e
})

// ── RI-3 : Codex à bout (« usage limit » sur la sortie du lanceur) → freellmapi ; la bascule est tracée et mémorisée ────
await cas('RI-3', async () => {
  const m = monde({ codex: 'quota', free: 'ok' })
  const l = R.creerLecteurRelais('studio', {}, m.deps)
  const v = await l('écris', DONNEES)
  const e = []
  if (v?.via !== 'free') e.push(`servi par ${JSON.stringify(v)} (attendu freellmapi)`)
  const j = journalDe(m.dossier)
  const b = j.find((x) => x.moteur === 'codex' && x.issue === 'bascule')
  if (!b) e.push('aucune ligne de bascule de Codex dans le journal')
  else {
    if (b.raison !== 'quota') e.push(`raison de la bascule = ${b.raison} (attendu quota)`)
    if (!b.jusqua || Date.parse(b.jusqua) > T0 + 6 * 3600_000 + 1000) e.push(`Codex mis de côté jusqu'à ${b.jusqua} : plus de 6 h, il ne reviendrait pas tout seul à temps`)
  }
  if (!j.some((x) => x.moteur === 'freellmapi' && x.issue === 'ok')) e.push('aucune ligne « freellmapi ok »')
  // un NOUVEAU lecteur (un nouveau processus) ne relance pas Codex tant qu'il est à bout
  const m2 = { ...m, lancements: [] }
  const d2 = { ...m.deps, lancer: (...a) => { m2.lancements.push(a); return m.deps.lancer(...a) } }
  const l2 = R.creerLecteurRelais('studio', {}, d2)
  const v2 = await l2('écris', DONNEES)
  if (m2.lancements.length) e.push('Codex est relancé par le lecteur suivant alors qu\'il est mis de côté')
  if (v2?.via !== 'free') e.push('le lecteur suivant ne passe pas directement à freellmapi')
  return e
})

// ── RI-4 : quota sur la sortie d'ERREUR du lanceur, et 401 : détectés, bascule ──────────────────────────────────────
await cas('RI-4', async () => {
  const e = []
  for (const [sc, raison] of [['quota_stderr', 'quota'], ['401', 'non_autorise']]) {
    const m = monde({ codex: sc, free: 'ok' })
    const v = await R.creerLecteurRelais('studio', {}, m.deps)('écris', DONNEES)
    const b = journalDe(m.dossier).find((x) => x.moteur === 'codex' && x.issue === 'bascule')
    if (v?.via !== 'free') e.push(`${sc} : non servi par freellmapi`)
    if (b?.raison !== raison) e.push(`${sc} : raison ${b?.raison} (attendu ${raison})`)
  }
  return e
})

// ── RI-5 : toute la chaîne publique : freellmapi 429 → Ollama Cloud 429 → local ; l'ordre et les modèles ────────────────
await cas('RI-5', async () => {
  const m = monde({ codex: 'quota', free: '429fl', cloud: '429', m8: 'ok', m4: 'ok' })
  const v = await R.creerLecteurRelais('studio', {}, m.deps)('écris', DONNEES) // studio : tâche difficile → 8B d'abord
  const e = []
  if (v?.via !== 'm8') e.push(`servi par ${JSON.stringify(v)} (attendu le 8B local)`)
  const ordre = m.requetes.map((r) => `${r.cible}:${r.modele}`).join(' > ')
  if (ordre !== 'free:auto > cloud:gpt-oss:120b-cloud > m8:qwen3:8b-q4_K_M') e.push(`ordre des essais : ${ordre}`)
  const r8 = m.requetes.find((r) => r.cible === 'm8')
  if (r8?.corps?.reasoning_effort !== 'none') e.push('le 8B réfléchit (reasoning_effort absent) : il épuiserait ses jetons')
  const fl = m.requetes.find((r) => r.cible === 'free')
  if (fl?.autorisation !== `Bearer ${CLE_SENTINELLE}`) e.push('freellmapi ne reçoit pas sa clé')
  if (m.requetes.filter((r) => r.cible !== 'free').some((r) => r.autorisation)) e.push('la clé de freellmapi part vers Ollama')
  const j = journalDe(m.dossier)
  if (j.find((x) => x.moteur === 'freellmapi')?.raison !== 'quota' || j.find((x) => x.moteur === 'ollama_cloud')?.raison !== 'quota') e.push('les deux quotas ne sont pas tracés')
  // le 8B tombe : le 4B prend
  const m2 = monde({ codex: 'quota', free: '500', cloud: '429', m8: 'refused', m4: 'ok' })
  const v2 = await R.creerLecteurRelais('studio', {}, m2.deps)('écris', DONNEES)
  if (v2?.via !== 'm4') e.push('le 8B injoignable : le 4B ne prend pas')
  return e
})

// ── RI-6 : un prospect, drapeau ÉTEINT : Codex à bout → rien ne part, la tâche reste (le lecteur lève) ───────────────────
await cas('RI-6', async () => {
  const m = monde({ codex: 'quota', free: 'ok', cloud: 'ok', m8: 'ok', m4: 'ok' })
  const l = R.creerLecteurRelais('standardiste', {}, m.deps)
  let leve = null
  try { await l('classe', DONNEES) } catch (x) { leve = x }
  const e = []
  if (!leve) e.push('un prospect a été servi sans Codex ni « oui » daté')
  if (m.requetes.length) e.push(`des requêtes partent (${cibles(m).join(',')}) alors que Codex est à bout et le drapeau éteint`)
  return e
})

// ── RI-7 : un prospect, drapeau LEVÉ : le local seulement, jamais freellmapi ni le cloud ; coordonnées masquées ──────────
await cas('RI-7', async () => {
  const m = monde({ codex: 'quota', free: 'ok', cloud: 'ok', m8: 'ok', m4: 'ok', env: { IA_LOCALE_PROSPECTS_OUI: DATE_OUI } })
  const v = await R.creerLecteurRelais('standardiste', {}, m.deps)('classe', DONNEES)
  const e = []
  if (v?.via !== 'm4') e.push(`servi par ${JSON.stringify(v)} (attendu le 4B local, tâche simple)`)
  const mauvais = m.requetes.filter((r) => r.cible === 'free' || r.cible === 'cloud')
  if (mauvais.length) e.push(`une donnée de prospect est allée vers ${mauvais.map((r) => r.cible).join(',')}`)
  if (m.requetes.some((r) => r.brut.includes(ADRESSE))) e.push('l\'adresse du prospect part en clair vers le local')
  // la nature relevée par appel : un agent public qui reçoit du prospect ne va ni au gratuit ni au cloud
  const m2 = monde({ codex: 'quota', free: 'ok', cloud: 'ok', m8: 'ok', m4: 'ok', env: { IA_LOCALE_PROSPECTS_OUI: DATE_OUI } })
  const l2 = R.creerLecteurRelais('studio', {}, m2.deps)
  await l2('écris', DONNEES, { nature: 'prospect' })
  if (m2.requetes.some((r) => r.cible === 'free' || r.cible === 'cloud')) e.push('studio + nature:prospect envoie vers freellmapi ou le cloud')
  // la nature ne se baisse pas
  const m3 = monde({ codex: 'quota', free: 'ok', cloud: 'ok', m8: 'ok', m4: 'ok' })
  const l3 = R.creerLecteurRelais('standardiste', { nature: 'publique' }, m3.deps)
  try { await l3('classe', DONNEES, { nature: 'publique' }) } catch { /* attendu : drapeau éteint */ }
  if (m3.requetes.length) e.push('un agent de prospects baissé en « publique » par option atteint le gratuit')
  // un drapeau mal formé reste éteint
  for (const mauvaise of ['oui', '1', '2099-01-01', 'true']) {
    const m4 = monde({ codex: 'quota', m4: 'ok', m8: 'ok', env: { IA_LOCALE_PROSPECTS_OUI: mauvaise } })
    try { await R.creerLecteurRelais('standardiste', {}, m4.deps)('classe', DONNEES) } catch { /* attendu */ }
    if (m4.requetes.length) e.push(`le drapeau « ${mauvaise} » laisse passer un prospect vers le local`)
  }
  return e
})

// ── RI-8 : le Facteur ne se replie pas (étalonné sur Codex seul) ─────────────────────────────────────────────────────
await cas('RI-8', async () => {
  const m = monde({ codex: 'quota', free: 'ok', cloud: 'ok', m8: 'ok', m4: 'ok', env: { IA_LOCALE_PROSPECTS_OUI: DATE_OUI } })
  const l = R.creerLecteurRelais('facteur', {}, m.deps)
  const e = []
  if (l.identite !== 'codex:gpt-6-luna') e.push(`identité du Facteur = ${l.identite} (le second juge n'étalonne que codex:gpt-6-luna)`)
  let leve = null
  try { await l('juge', DONNEES) } catch (x) { leve = x }
  if (!leve) e.push('le Facteur est servi sans Codex')
  if (m.requetes.length) e.push('le Facteur se replie sur un autre moteur')
  return e
})

// ── RI-9 : Codex revient tout seul : l'échéance passée, il est de nouveau le premier ; la sonde réussie efface l'état ────
await cas('RI-9', async () => {
  const quota = monde({ codex: 'quota', free: 'ok' })
  await R.creerLecteurRelais('studio', {}, quota.deps)('écris', DONNEES)
  const e = []
  const etat = JSON.parse(fs.readFileSync(path.join(quota.dossier, 'etat-moteurs.json'), 'utf8')).moteurs
  if (!etat.codex) e.push('Codex à bout n\'est pas mémorisé')
  // Codex « revient » : on change son comportement, on avance l'horloge de 6 h 01
  const retour = monde({ codex: 'ok', free: 'ok', deps: { dossier: quota.dossier } })
  retour.avancer(0)
  // même dossier, horloge reprise de la première période + 6 h 01 : on rejoue avec une horloge propre
  const dep2 = { ...retour.deps, maintenant: () => T0 + 6 * 3600_000 + 60_000 }
  const l = R.creerLecteurRelais('studio', {}, dep2)
  const v = await l('écris', DONNEES)
  if (v?.via !== 'codex') e.push(`après 6 h, servi par ${JSON.stringify(v)} (attendu : Codex repris tout seul)`)
  const etat2 = JSON.parse(fs.readFileSync(path.join(quota.dossier, 'etat-moteurs.json'), 'utf8')).moteurs
  if (etat2.codex) e.push('Codex a répondu mais reste marqué à bout')
  // avant l'échéance, pas de relance
  const tot = monde({ codex: 'ok', free: 'ok', deps: { dossier: quota.dossier } })
  const dep3 = { ...tot.deps, maintenant: () => T0 + 60_000 }
  // (l'état a été effacé par le passage précédent : on le remet pour ce cas)
  fs.writeFileSync(path.join(quota.dossier, 'etat-moteurs.json'), JSON.stringify({ moteurs: { codex: { jusqua: T0 + 3600_000, raison: 'quota', vu: 'x' } } }))
  const v3 = await R.creerLecteurRelais('studio', {}, dep3)('écris', DONNEES)
  if (tot.lancements.length || v3?.via !== 'free') e.push('Codex relancé avant la fin de sa mise de côté')
  return e
})

// ── RI-10 : classification des échecs (pures) ────────────────────────────────────────────────────────────────────────
await cas('RI-10', async () => {
  const e = []
  const c = (s, corps, ra) => R.classerReponseHttp(s, corps, ra ?? null, T0)
  if (c(429, '').raison !== 'quota') e.push('429 non reconnu comme quota')
  if (c(429, 'You reached the Free usage limit').raison !== 'quota') e.push('429 « Free usage limit » non reconnu')
  if (c(403, 'You have hit your usage limit').raison !== 'quota') e.push('« usage limit » en 403 non reconnu comme quota')
  for (const s of [401, 402, 403]) if (c(s, 'x').raison !== 'non_autorise') e.push(`${s} non reconnu comme refus d'accès`)
  for (const s of [500, 502, 503, 404]) if (c(s, 'x').raison !== 'indisponible') e.push(`${s} non reconnu comme panne`)
  if (c(429, 'x', 30).jusquaMs !== T0 + 30_000) e.push('Retry-After ignoré')
  if (c(429, '{"retryAtMs":' + (T0 + 90_000) + '}').jusquaMs !== T0 + 90_000) e.push('retryAtMs de freellmapi ignoré')
  const ech = (m, r, j) => R.echeanceDeMiseDeCote(m, r, T0, j)
  if (ech('codex', 'quota', T0 + 99 * 3600_000) !== T0 + 6 * 3600_000) e.push('Codex à bout jusqu\'à plus de 6 h : le retour ne serait pas sondé')
  if (ech('codex', 'quota', T0 + 3600_000) !== T0 + 3600_000) e.push('l\'échéance annoncée par Codex (1 h) n\'est pas suivie')
  if (ech('ollama_cloud', 'quota') <= T0 + 3600_000) e.push('Ollama Cloud à bout est resollicité trop vite')
  if (ech('codex', 'sortie_invalide') !== 0 || ech('freellmapi', 'refuse') !== 0) e.push('une sortie invalide met un moteur de côté')
  if (ech('ollama_4b', 'indisponible') <= T0) e.push('un moteur local en panne n\'est pas mis de côté')
  return e
})

// ── RI-11 : délai et connexion refusée → bascule ; sortie non JSON → bascule sans mise de côté ; clôture ```json tolérée ──
await cas('RI-11', async () => {
  const e = []
  const mh = monde({ codex: 'absent', free: 'hang', cloud: 'ok' })
  const vh = await R.creerLecteurRelais('studio', { delaiMs: 40 }, mh.deps)('écris', DONNEES)
  if (vh?.via !== 'cloud') e.push('un délai dépassé ne bascule pas')
  const bh = journalDe(mh.dossier).find((x) => x.moteur === 'freellmapi')
  if (bh?.raison !== 'delai') e.push(`raison du délai = ${bh?.raison}`)
  const mr = monde({ codex: 'absent', free: 'refused', cloud: 'refused', m8: 'ok' })
  const vr = await R.creerLecteurRelais('studio', {}, mr.deps)('écris', DONNEES)
  if (vr?.via !== 'm8') e.push('connexion refusée : pas de bascule jusqu\'au local')
  const mj = monde({ codex: 'nonjson', free: 'nonjson', cloud: 'fence' })
  const vj = await R.creerLecteurRelais('studio', {}, mj.deps)('écris', DONNEES)
  if (vj?.via !== 'fence') e.push('sortie non JSON : pas de bascule, ou clôture ```json refusée')
  const etat = (() => { try { return JSON.parse(fs.readFileSync(path.join(mj.dossier, 'etat-moteurs.json'), 'utf8')).moteurs } catch { return {} } })()
  if (etat.codex || etat.freellmapi) e.push('une sortie non JSON met un moteur de côté')
  const mg = monde({ codex: 'absent', free: 'groq', cloud: 'ok' })
  const vg = await R.creerLecteurRelais('studio', {}, mg.deps)('écris', DONNEES)
  if (vg?.via !== 'cloud') e.push('une réponse routée vers Groq (exclu) est acceptée')
  return e
})

// ── RI-12 : coût et plafond : chaque tentative inscrite à 0 €, coût inconnu refusé, plafond refusé AVANT l'appel ─────────
await cas('RI-12', async () => {
  const e = []
  const m = monde({ codex: 'quota', free: 'ok' })
  await R.creerLecteurRelais('studio', {}, m.deps)('écris', DONNEES)
  if (m.couts.length !== 2) e.push(`${m.couts.length} coûts inscrits (attendu 2 : Codex échoué puis freellmapi)`)
  if (m.couts.some((c) => c.montant !== 0)) e.push('un coût non nul')
  if (!m.couts.every((c) => c.detail?.moteur && c.detail?.modele && c.detail?.issue)) e.push('un coût sans moteur, modèle ou issue')
  const inconnu = monde({ codex: 'ok', deps: { coutDeVoie: () => undefined } })
  let r1 = null; try { await R.creerLecteurRelais('studio', {}, inconnu.deps)('écris', DONNEES) } catch (x) { r1 = x }
  if (!r1 || inconnu.lancements.length) e.push('un coût inconnu n\'est pas refusé avant l\'appel')
  const plafond = monde({ codex: 'ok', deps: { verifierPlafond: async () => false } })
  let r2 = null; try { await R.creerLecteurRelais('studio', {}, plafond.deps)('écris', DONNEES) } catch (x) { r2 = x }
  if (!r2 || plafond.lancements.length) e.push('un plafond refusé n\'arrête pas l\'appel')
  const coupe = monde({ codex: 'ok', deps: { enregistrerCout: async () => ({ coupe: true }) } })
  const lc = R.creerLecteurRelais('studio', {}, coupe.deps)
  try { await lc('écris', DONNEES) } catch { /* coupé */ }
  let r3 = null; try { await lc('écris', DONNEES) } catch (x) { r3 = x }
  if (!r3 || coupe.lancements.length > 1) e.push('la coupure de coût n\'arrête pas les appels suivants')
  const p = monde({ codex: 'ok' })
  const lp = R.creerLecteurRelais('studio', { appelsMax: 2 }, p.deps)
  await lp('a', DONNEES); await lp('b', DONNEES)
  let r4 = null; try { await lp('c', DONNEES) } catch (x) { r4 = x }
  if (!r4) e.push('le plafond d\'appels n\'est pas tenu')
  return e
})

// ── RI-13 : rien de sensible dans la trace : ni donnée, ni clé, ni réponse ───────────────────────────────────────────
await cas('RI-13', async () => {
  const e = []
  const m = monde({ codex: 'quota', free: 'ok' })
  await R.creerLecteurRelais('studio', {}, m.deps)('écris', DONNEES)
  const lu = fs.readdirSync(m.dossier).map((f) => fs.readFileSync(path.join(m.dossier, f), 'utf8')).join('\n')
  const coutsTxt = JSON.stringify(m.couts)
  for (const [nom, texte] of [['journal et mémoire', lu], ['coûts', coutsTxt]]) {
    if (texte.includes(CLE_SENTINELLE)) e.push(`${nom} : la clé de freellmapi est écrite`)
    if (texte.includes(TEXTE_SENTINELLE) || texte.includes(ADRESSE)) e.push(`${nom} : la donnée est écrite`)
    if (/"via"/.test(texte)) e.push(`${nom} : la réponse est écrite`)
  }
  if (m.lancements.some((l) => JSON.stringify(l.env ?? {}).includes(CLE_SENTINELLE))) e.push('la clé de freellmapi part dans l\'environnement de Codex')
  // sans clé ni adresse posée : freellmapi n'est pas tenté
  const sans = monde({ codex: 'absent', free: 'ok', cloud: 'ok', env: { FREELLMAPI_URL: undefined, FL_KEY: undefined, PRESTI_HOTE: 'usine' }, deps: { lireCle: () => null } })
  delete sans.deps.env.FREELLMAPI_URL; delete sans.deps.env.FL_KEY
  await R.creerLecteurRelais('studio', {}, sans.deps)('écris', DONNEES)
  if (sans.requetes.some((r) => r.cible === 'free')) e.push('freellmapi est tenté sans clé')
  return e
})

// ── RI-14 : tout est à bout : le lecteur lève (la tâche n'est pas perdue : l'appelant la garde) ; rien configuré : null ───
await cas('RI-14', async () => {
  const e = []
  const m = monde({ codex: 'quota', free: '429fl', cloud: '429', m8: 'refused', m4: 'refused' })
  let leve = null
  try { await R.creerLecteurRelais('studio', {}, m.deps)('écris', DONNEES) } catch (x) { leve = x }
  if (!leve) e.push('tout à bout et le lecteur ne lève pas')
  if (!R.creerLecteurRelais('chef', {}, m.deps)) { /* null attendu */ } else e.push('le chef a un lecteur')
  // identité : la chaîne des moteurs disponibles
  const l = R.creerLecteurRelais('standardiste', {}, monde({ codex: 'ok', env: { IA_LOCALE_PROSPECTS_OUI: DATE_OUI } }).deps)
  if (!/^codex:gpt-6-luna>ollama:/.test(l.identite)) e.push(`identité du Standard = ${l.identite}`)
  return e
})

// ── RI-15 : l'état seul (station) : moteurs configurés, moteurs à bout ───────────────────────────────────────────────
await cas('RI-15', async () => {
  const e = []
  const m = monde({ codex: 'quota', free: 'ok' })
  await R.creerLecteurRelais('studio', {}, m.deps)('écris', DONNEES)
  const s = R.lireEtatRelais(m.deps)
  if (!s.a_bout.some((x) => x.moteur === 'codex' && x.raison === 'quota')) e.push('lireEtatRelais ne voit pas Codex à bout')
  if (!s.configures.freellmapi || !s.configures.ollama_4b) e.push('lireEtatRelais ne voit pas les moteurs configurés')
  return e
})

process.stdout.write(`\n@@RESULTATS@@${JSON.stringify({ resultats })}\n`)
