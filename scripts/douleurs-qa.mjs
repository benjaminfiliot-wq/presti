// scripts/douleurs-qa.mjs — juge hors ligne par défaut en réseau réel de DL, la bibliothèque des douleurs (fiche
// 026-073), écrit par Claude Code AVANT le module qu'il juge (lib/agents/acquisition/douleurs.ts). L'exécutant qui le
// lance n'y touche jamais (CLAUDE.md:23). Cahier DL de 026-073, écrit ici en 026-071.
//
//   node --import ./scripts/ts-loader.mjs scripts/douleurs-qa.mjs [--racine=<dossier>] [--auto-controle] [--hors-ligne]
//
// Par défaut (ni --auto-controle ni --hors-ligne), DL-4 relit CHAQUE source_url du module jugé SUR LE RÉSEAU : le
// robots.txt de son hôte est lu et respecté (PrestiRecenseur, sinon *), une requête par seconde et par hôte, 8 s de
// délai par page, 1 Mo au plus, avec la même normalisation que J1 (NFKC, entités, apostrophes droites, espaces
// fusionnés — texteVisibleJuge/normaliser de commun.mjs). --hors-ligne (que --auto-controle impose) ne relit que le
// serveur local du juge, qui sert scripts/fixtures/026-acquisition/douleurs/pages/ : jamais le vrai réseau (piège
// réseau posé après le démarrage du serveur local, donc seul 127.0.0.1 reste autorisé).
//
//   --racine=<d>     importe <d>/lib/agents/acquisition/douleurs.ts (défaut : le dépôt).
//   --auto-controle  AC-1 la couverture par métier (comptage de DL-1) juge juste un scénario à 8 métiers/40 entrées
//                    conforme et un scénario où un métier retombe sous 3 entrées ; AC-2 chaque entrée fautive de
//                    entrees.mjs (forme, donnée personnelle, terme interdit) est refusée par le bon critère, avec sa
//                    raison, et chaque entrée conforme passe sans reproche ; AC-3 deux identifiants identiques sont
//                    détectés, deux identifiants distincts ne le sont pas ; AC-4 le serveur local sert les pages
//                    d'essai, les deux citations conformes s'y retrouvent mot pour mot, la citation retouchée ne s'y
//                    retrouve pas, et la page interdite par robots.txt n'est jamais demandée.
//
// Sortie : une ligne par critère, puis « douleurs-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1 sinon ;
// 2 si l'appel est invalide. Module absent : DL-1 en échec, les suivants « non jugés ». Écrit seulement sous
// .orchestre/travail/ s'il y a lieu (aujourd'hui : rien) ; ne lit ni .env.local ni presti-secrets.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, importerContrat, sous, normaliser, texteVisibleJuge, piegerReseau,
  court, premiereLigne,
} from './fixtures/026-acquisition/commun.mjs'
import { ENTREES_ESSAI, couvertureEssai } from './fixtures/026-acquisition/douleurs/entrees.mjs'

const JUGE = 'douleurs-qa'
const o = lireOptions(process.argv.slice(2), { drapeauxConnus: ['hors-ligne'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const HORS_LIGNE = o.autoControle || o.drapeaux.has('hors-ligne')
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE}${o.autoControle ? ' --auto-controle' : o.drapeaux.has('hors-ligne') ? ' --hors-ligne' : ''}`
const PAGES = path.join(R, 'scripts', 'fixtures', '026-acquisition', 'douleurs', 'pages')
const K = await importerContrat()
const METIERS_IDS = K.METIERS.map((m) => m.id)
const DOMAINES_EXCLUS = K.DOMAINES_EXCLUS
const UA = K.UA_RECENSEUR
const LISTE_NOIRE = ['garanti', 'premier sur google', 'référencement', 'sans engagement', 'satisfait ou remboursé', '12 mois', 'presti']

// ── Contrôles purs (026-073, cahier DL-2/DL-3/DL-5) ──────────────────────────────────────────────────────────────────────
const RE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/
/** DL-2 : la forme d'une entrée seule (hors unicité des identifiants, qui se juge sur l'ensemble). */
function controlerForme(e, { metiersConnus }) {
  const err = []
  if (!RE_ID.test(e.id ?? '')) err.push(`id ${JSON.stringify(e.id)} mal formé (minuscules et tirets)`)
  if (e.metier !== 'tous' && !metiersConnus.includes(e.metier)) err.push(`metier ${JSON.stringify(e.metier)} inconnu`)
  if (String(e.citation ?? '').length > 200) err.push(`citation de ${e.citation.length} signes (200 au plus)`)
  const q = String(e.question ?? '')
  if (!q.trim().endsWith('?')) err.push(`question ${JSON.stringify(court(q, 60))} ne finit pas par « ? »`)
  if (q.length > 160) err.push(`question de ${q.length} signes (160 au plus)`)
  if (/\d/.test(q)) err.push('question avec un chiffre')
  if (String(e.accroche_objet ?? '').length > 60) err.push(`accroche_objet de ${e.accroche_objet.length} signes (60 au plus)`)
  if (!RE_DATE.test(e.relevee_le ?? '')) err.push(`relevee_le ${JSON.stringify(e.relevee_le)} mal formé (AAAA-MM-JJ)`)
  else if (e.relevee_le > new Date().toISOString().slice(0, 10)) err.push(`relevee_le ${e.relevee_le} dans le futur`)
  if (e.approuve !== false) err.push(`approuve vaut ${JSON.stringify(e.approuve)}, false attendu tant que Benj n'a pas approuvé`)
  return err
}
/** DL-2 (complément, sur l'ensemble) : aucun identifiant en double. → [{ id, n }] */
function identifiantsEnDouble(entrees) {
  const vus = new Map()
  for (const e of entrees) vus.set(e.id, (vus.get(e.id) ?? 0) + 1)
  return [...vus.entries()].filter(([, n]) => n > 1)
}
/** DL-1 (complément) : couverture par métier — 8 métiers au moins, 3 entrées au moins chacun, 10 « tous » au plus. */
function controlerCouverture(entrees, metiersConnus) {
  const err = []
  if (!Array.isArray(entrees) || entrees.length < 40) err.push(`${Array.isArray(entrees) ? entrees.length : 0} entrée(s), 40 au moins attendues`)
  const parMetier = new Map()
  for (const e of entrees ?? []) parMetier.set(e.metier, (parMetier.get(e.metier) ?? 0) + 1)
  const couverts = [...parMetier.keys()].filter((m) => m !== 'tous' && metiersConnus.includes(m))
  if (couverts.length < 8) err.push(`${couverts.length} métier(s) couvert(s), 8 au moins attendus`)
  for (const m of couverts) if (parMetier.get(m) < 3) err.push(`métier ${m} : ${parMetier.get(m)} entrée(s), 3 au moins`)
  if ((parMetier.get('tous') ?? 0) > 10) err.push(`« tous » : ${parMetier.get('tous')} entrée(s), 10 au plus`)
  return err
}
const RE_EMAIL_LOCAL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const RE_PSEUDO_SLASH = /\bu\/[\w-]{2,}/i
const RE_ARROBASE = /(^|[\s(«"'.,;:!?])@[A-Za-z][\w.-]{1,}/
const RE_TEL = /(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}\b/
const RE_PROFIL = /\/(?:user|u|profil|membre)\//i
/** DL-3 : aucune donnée personnelle dans aucun champ ; source_url hors DOMAINES_EXCLUS et hors page de profil. */
function controlerPersonnel(e, { domainesExclus }) {
  const err = []
  const champs = { citation: e.citation, question: e.question, accroche_objet: e.accroche_objet, mots_cles: (e.mots_cles ?? []).join(' '), id: e.id }
  for (const [nom, val] of Object.entries(champs)) {
    const t = String(val ?? '')
    if (RE_EMAIL_LOCAL.test(t)) err.push(`${nom} : adresse e-mail`)
    if (RE_TEL.test(t)) err.push(`${nom} : numéro de téléphone`)
    if (RE_PSEUDO_SLASH.test(t)) err.push(`${nom} : pseudo u/…`)
    if (RE_ARROBASE.test(t)) err.push(`${nom} : pseudo @…`)
  }
  const url = String(e.source_url ?? '')
  if (RE_PROFIL.test(url)) err.push('source_url : page de profil')
  let hote = ''
  try { hote = new URL(url, 'https://x.invalid').hostname.replace(/^www\./, '').toLowerCase() } catch { /* url absolue attendue */ }
  if (hote && domainesExclus.some((d) => hote === d || hote.endsWith(`.${d}`))) err.push(`source_url : domaine exclu (${hote})`)
  return err
}
/** DL-5 : aucun terme de la liste noire de J3, ni « Presti », dans la question. */
function controlerBlacklist(e) {
  const q = normaliser(e.question ?? '').toLowerCase()
  return LISTE_NOIRE.filter((mot) => q.includes(mot)).map((mot) => `question : terme interdit « ${mot} »`)
}

// ── Le serveur local du juge (pages de scripts/fixtures/026-acquisition/douleurs/pages/, + robots.txt) ─────────────────────
const ROBOTS_LOCAL = 'User-agent: *\nDisallow: /interdit/\n'
function demarrerServeurLocal() {
  const journal = []
  const srv = http.createServer((req, res) => {
    let u; try { u = new URL(req.url, 'http://127.0.0.1') } catch { res.writeHead(400); res.end(); return }
    journal.push({ chemin: u.pathname, ua: req.headers['user-agent'] ?? null, t: Date.now() })
    if (u.pathname === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }); res.end(ROBOTS_LOCAL); return }
    if (u.pathname.startsWith('/interdit/')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end('<html><body>Page témoin interdite par robots.txt — jamais demandée par un robot poli.</body></html>'); return }
    const cible = path.join(PAGES, u.pathname.replace(/^\/+/, ''))
    if (u.pathname.includes('..') || !sous(PAGES, cible) || !fs.existsSync(cible)) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('introuvable'); return }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(fs.readFileSync(cible))
  })
  return new Promise((resolve, reject) => {
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => resolve({ srv, base: `http://127.0.0.1:${srv.address().port}`, journal, fermer: () => new Promise((r) => srv.close(r)) }))
  })
}

// ── Le lecteur poli (production comme autocontrôle : même fonction, même politesse) ─────────────────────────────────────────
const DERNIER_APPEL = new Map()
async function attendreTour(hote, minEcartMs) {
  const dernier = DERNIER_APPEL.get(hote) ?? 0
  const attente = dernier + minEcartMs - Date.now()
  if (attente > 0) await new Promise((r) => setTimeout(r, attente))
  DERNIER_APPEL.set(hote, Date.now())
}
/** Un sous-ensemble simple de la RFC 9309 : le juge est un client poli, pas l'arbitre (LS-3, 026-020, en juge le complet). */
function robotsAutorisePoli(robotsTxt, chemin) {
  if (!robotsTxt) return true
  const blocs = String(robotsTxt).split(/\n(?=user-agent\s*:)/i)
  const regles = (bloc) => [...bloc.matchAll(/^disallow\s*:\s*(\S*)/gim)].map((m) => m[1])
  let pourNous = null, pourEtoile = null
  for (const b of blocs) {
    const ua = /^user-agent\s*:\s*(.+)$/im.exec(b)?.[1]?.trim().toLowerCase()
    if (ua === 'prestirecenseur') pourNous = regles(b)
    else if (ua === '*') pourEtoile = regles(b)
  }
  const dis = pourNous ?? pourEtoile ?? []
  return !dis.some((d) => d && chemin.startsWith(d))
}
/** Relit une page : robots.txt d'abord, puis la page (1 requête/s/hôte, délai et poids bornés). → { ok, code, texte|raison } */
async function relirePage(url, { minEcartMs = 1000, delaiMs = 8000, maxOctets = 1_000_000 } = {}) {
  let u; try { u = new URL(url) } catch { return { ok: false, code: null, raison: 'URL invalide' } }
  await attendreTour(u.host, minEcartMs)
  let robots = ''
  try { const rr = await fetch(`${u.origin}/robots.txt`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(delaiMs) }); if (rr.ok) robots = await rr.text() } catch { /* pas de robots.txt : autorisé par défaut */ }
  if (!robotsAutorisePoli(robots, u.pathname)) return { ok: false, code: null, raison: 'robots.txt' }
  await attendreTour(u.host, minEcartMs)
  let r
  try { r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(delaiMs) }) } catch (e) { return { ok: false, code: null, raison: `injoignable : ${premiereLigne(e.cause ?? e)}` } }
  const texte = await r.text().catch(() => '')
  if (Buffer.byteLength(texte, 'utf8') > maxOctets) return { ok: false, code: r.status, raison: 'page trop lourde (1 Mo au plus)' }
  if (!r.ok) return { ok: false, code: r.status, raison: `code ${r.status}` }
  return { ok: true, code: r.status, texte }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ids = o.autoControle ? ['AC-1', 'AC-2', 'AC-3', 'AC-4'] : ['DL-1', 'DL-2', 'DL-3', 'DL-4', 'DL-5']
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — ${METIERS_IDS.length} métiers du contrat, ${DOMAINES_EXCLUS.length} domaines exclus`)

if (o.autoControle) {
  // AC-1 : la couverture par métier (comptage de DL-1)
  {
    const conf = controlerCouverture(couvertureEssai(true), METIERS_IDS)
    const faut = controlerCouverture(couvertureEssai(false), METIERS_IDS)
    const e = [...conf.map((m) => `scénario conforme refusé : ${m}`), ...(faut.length ? [] : ['scénario fautif (un métier à 2 entrées) accepté à tort'])]
    s.juger('AC-1', e, `scénario à 8 métiers/5 entrées (40) accepté ; scénario à un métier retombé à 2 entrées refusé (${faut[0] ?? ''})`)
  }
  // AC-2 : forme, donnée personnelle, terme interdit — chaque échantillon de entrees.mjs (hors DL-4 et identifiant en double)
  {
    const e = []
    let conformes = 0, fautifs = 0
    for (const item of ENTREES_ESSAI) {
      if (item.attendu?.id === 'DL-4' || item.id === 'faute-id-double') continue
      const obs = [
        ...controlerForme(item.entree, { metiersConnus: METIERS_IDS }).map((m) => ({ id: 'DL-2', m })),
        ...controlerPersonnel(item.entree, { domainesExclus: DOMAINES_EXCLUS }).map((m) => ({ id: 'DL-3', m })),
        ...controlerBlacklist(item.entree).map((m) => ({ id: 'DL-5', m })),
      ]
      if (item.conforme) {
        if (obs.length) e.push(`${item.id} (conforme) refusé à tort : ${obs.map((o2) => `${o2.id} ${o2.m}`).join(' ; ')}`)
        else conformes++
      } else {
        const trouve = obs.find((o2) => o2.id === item.attendu.id && o2.m.toLowerCase().includes(String(item.attendu.motif).toLowerCase()))
        if (!trouve) e.push(`${item.id} (${item.cas}) : ${item.attendu.id} ${JSON.stringify(item.attendu.motif)} attendu, obtenu ${JSON.stringify(obs)}`)
        else fautifs++
      }
    }
    s.juger('AC-2', e, `${conformes} entrée(s) conforme(s) acceptée(s), ${fautifs} entrée(s) fautive(s) refusée(s) chacune par son critère et sa raison`)
  }
  // AC-3 : identifiant en double détecté ; identifiants distincts non signalés
  {
    const e = []
    const premiere = ENTREES_ESSAI.find((x) => x.id === 'plombier-devis-soir')
    const double = ENTREES_ESSAI.find((x) => x.id === 'faute-id-double')
    const avecDoublon = identifiantsEnDouble([premiere.entree, double.entree])
    if (!avecDoublon.length || avecDoublon[0][0] !== premiere.entree.id) e.push(`doublon non détecté entre ${premiere.entree.id} et faute-id-double (obtenu ${JSON.stringify(avecDoublon)})`)
    const sansDoublon = identifiantsEnDouble(ENTREES_ESSAI.filter((x) => x.id !== 'faute-id-double').map((x) => x.entree))
    if (sansDoublon.length) e.push(`doublon signalé à tort sur les entrées sans collision : ${JSON.stringify(sansDoublon)}`)
    s.juger('AC-3', e, `deux identifiants identiques détectés (${JSON.stringify(avecDoublon)}) ; ${ENTREES_ESSAI.length - 1} identifiants distincts non signalés`)
  }
  // AC-4 : substance — le serveur local, les citations conformes retrouvées, la retouchée absente, l'interdite jamais lue
  {
    const e = []
    let serveur = null
    try {
      serveur = await demarrerServeurLocal()
      const piege = piegerReseau()
      let conformes = 0
      for (const item of ENTREES_ESSAI) {
        if (!item.entree.chemin) continue
        const url = `${serveur.base}${item.entree.chemin}`
        const r = await relirePage(url, { minEcartMs: 5, delaiMs: 4000 })
        const trouve = r.ok && texteVisibleJuge(r.texte).includes(normaliser(item.entree.citation))
        if (item.conforme) { if (!trouve) e.push(`${item.id} : citation non retrouvée sur ${item.entree.chemin} (${r.ok ? 'page lue' : r.raison})`); else conformes++ }
        else if (item.attendu?.id === 'DL-4' && item.attendu.motif === 'robots') { if (r.ok || r.raison !== 'robots.txt') e.push(`${item.id} : robots.txt non respecté (${JSON.stringify(r)})`) }
        else if (item.attendu?.id === 'DL-4') { if (trouve) e.push(`${item.id} : citation retrouvée alors qu'elle est retouchée`) }
      }
      piege.retirer()
      // Le piège consigne CHAQUE appel, locaux compris (ceux du serveur d'essai du juge) : seul un hôte hors 127.0.0.1
      // (bloqué par le piège lui-même) est un vrai accès au réseau tenté pendant l'autocontrôle.
      const horsLocal = piege.tentatives.filter((t) => !/127\.0\.0\.1|localhost|\[::1\]/i.test(t))
      if (horsLocal.length) e.push(`accès au réseau tenté pendant le juge : ${court(horsLocal.join(' ; '), 200)}`)
      if (serveur.journal.some((j) => j.chemin.startsWith('/interdit/') && !j.chemin.endsWith('/robots.txt'))) e.push('la page interdite par robots.txt a été demandée au serveur')
      s.juger('AC-4', e, `serveur local démarré (${serveur.base}) ; ${conformes} citation(s) conforme(s) retrouvée(s) mot pour mot ; citation retouchée absente ; page interdite jamais demandée`)
    } catch (err) { s.echoue('AC-4', `interrompu : ${premiereLigne(err)}`) } finally { if (serveur) await serveur.fermer() }
  }
} else {
  const f = path.join(RAC, 'lib', 'agents', 'acquisition', 'douleurs.ts')
  const fMethode = path.join(RAC, 'docs', 'agents', 'douleurs-methode.md')
  let mod = null
  const e1 = []
  if (!fs.existsSync(f)) e1.push(`module absent : ${rel(f)}`)
  else {
    try { mod = await importerDepuis(RAC, 'lib/agents/acquisition/douleurs.ts') } catch (e) { e1.push(`douleurs.ts ne s'importe pas : ${premiereLigne(e)}`) }
    if (mod && !Array.isArray(mod.DOULEURS)) e1.push('DOULEURS non exporté (ou pas un tableau)')
    if (mod && Array.isArray(mod.DOULEURS) && !Object.isFrozen(mod.DOULEURS)) e1.push('DOULEURS non gelé')
    if (!fs.existsSync(fMethode)) e1.push(`${rel(fMethode)} absent`)
  }
  const entrees = mod?.DOULEURS ?? []
  s.juger('DL-1', [...e1, ...(mod && Array.isArray(mod.DOULEURS) ? controlerCouverture(entrees, METIERS_IDS) : [])], `DOULEURS importé depuis ${rel(RAC)} : gelé, couverture par métier vérifiée, ${rel(fMethode)} présent`)
  if (e1.length) { s.nonJuges(['DL-2', 'DL-3', 'DL-4', 'DL-5'], 'DL-1 en échec') } else {
    const eForme = entrees.flatMap((e) => controlerForme(e, { metiersConnus: METIERS_IDS }).map((m) => `${e.id} : ${m}`))
    eForme.push(...identifiantsEnDouble(entrees).map(([id, n]) => `identifiant en double : ${id} (${n} fois)`))
    s.juger('DL-2', eForme, `${entrees.length} entrée(s) : forme, unicité des identifiants`)
    const ePersonnel = entrees.flatMap((e) => controlerPersonnel(e, { domainesExclus: DOMAINES_EXCLUS }).map((m) => `${e.id} : ${m}`))
    s.juger('DL-3', ePersonnel, `${entrees.length} entrée(s) : aucune donnée personnelle, aucun domaine exclu, aucune page de profil`)
    const eBlacklist = entrees.flatMap((e) => controlerBlacklist(e).map((m) => `${e.id} : ${m}`))
    s.juger('DL-5', eBlacklist, `${entrees.length} entrée(s) : aucun terme interdit, jamais « Presti »`)
    const eSubstance = []
    let retrouvees = 0
    const source = HORS_LIGNE ? await demarrerServeurLocal() : null
    try {
      for (const e of entrees) {
        const url = e.source_url
        const r = HORS_LIGNE && source && sous(PAGES, path.join(PAGES, new URL(url).pathname.replace(/^\/+/, ''))) ? await relirePage(`${source.base}${new URL(url).pathname}`, { minEcartMs: 5 }) : await relirePage(url)
        const trouve = r.ok && texteVisibleJuge(r.texte).includes(normaliser(e.citation))
        eSubstance.push(`${e.id} : ${r.ok ? `code ${r.code}, ${trouve ? 'retrouvée' : 'absente'}` : `illisible (${r.raison})`}`)
        if (!trouve) eSubstance[eSubstance.length - 1] = `en échec — ${eSubstance[eSubstance.length - 1]}`
        else retrouvees++
      }
    } finally { if (source) await source.fermer() }
    s.juger('DL-4', eSubstance.filter((l) => l.startsWith('en échec')), `${retrouvees}/${entrees.length} citation(s) relue(s) et retrouvée(s) mot pour mot sur leur page source (${HORS_LIGNE ? 'hors ligne' : 'réseau réel'}) — détail : ${court(eSubstance.join(' | '), 600)}`)
  }
}
// process.exitCode (jamais process.exit()) : Node 24 plante sous Windows quand des descripteurs (serveur, fetch) sont
// encore en train de se fermer — laisser la boucle d'événements se vider normalement.
process.exitCode = s.finir()
