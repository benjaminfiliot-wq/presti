// scripts/fixtures/026-transverse/parties/routes.mjs — la partie « routes » de pont-telegram-qa (fiche 026-194, Claude Code), critères PT-2 à PT-7.
// Écrite AVANT le code qu'elle juge (026-195 : lib/agents/telegram.ts et les deux routes /api/agents/telegram/{sortie,entree}).
//
// Comment elle juge. Un processus enfant (routes-enfant.mjs : node --experimental-strip-types --import scripts/ts-loader.mjs, cwd = la racine
// jugée) charge le VRAI code de la racine avec des doublures de next/server, lib/flags, lib/agents/garde et lib/agents/pause (routes-crochet.mjs,
// routes-doublures.mjs), le vrai client Supabase et le vrai lib/agents/bus.ts contre un faux PostgREST (scripts/lib/faux-postgrest.mjs) qui
// consigne chaque appel, sert la fausse table `alertes` piégée (alertes.json) et de faux événements (evenements-chef.json). Ce juge envoie ses
// requêtes à l'enfant, une par une, et lit tout lui-même : statut, corps, appels à la base, appels aux doublures, colonnes demandées. Les
// attendus (MOTIFS_POUSSES, chargeFondateur, masquer) sont ceux de la RACINE JUGÉE, calculés par l'enfant : le juge ne les recopie pas.
//
// Ce que le juge ne fait pas : lire la vérité dans le module jugé. Les jetons des agents (ceux de la garde doublée) sont tirés au hasard à
// chaque passage. Aucun réseau hors 127.0.0.1 ; aucune écriture hors de `travail` (.orchestre/travail/pont-telegram-qa/).
//
// Chaque critère porte des cas favorables ET défavorables (le cas favorable prouve que la route fait son travail, le défavorable que la
// garde tient) ; un critère jamais évalué est un échec (creerRapport), et si l'import d'un module jugé échoue, chaque critère qui en dépend
// échoue avec la raison.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { FIXTURES, lireSi, jsonFixture, tirerJeton, court } from '../commun.mjs'

const IDS = ['PT-2', 'PT-3', 'PT-4', 'PT-5', 'PT-6', 'PT-7']
const ROUTE_SORTIE = 'app/api/agents/telegram/sortie/route.ts'
const ROUTE_ENTREE = 'app/api/agents/telegram/entree/route.ts'
const LIB_TELEGRAM = 'lib/agents/telegram.ts'
const URL_SORTIE = 'http://127.0.0.1/api/agents/telegram/sortie'
const URL_ENTREE = 'http://127.0.0.1/api/agents/telegram/entree'
const MAX_MESSAGES = 20
const COLONNES_ALERTES = ['id', 'motif', 'cree_le']

// ── Petites aides ────────────────────────────────────────────────────────────────────────────────────────────────────────
const esc = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const norm = (t) => String(t ?? '').replace(/[\s  ]+/g, ' ').trim()
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const memeEnsemble = (a, b) => a.length === b.length && a.every((x) => b.includes(x))
const cles = (o) => Object.keys(o ?? {}).sort()

/** Le source sans ses commentaires (// et /* *​/), en respectant les chaînes, les gabarits et les littéraux d'expression régulière. */
export function sansCommentaires(src) {
  let out = '', i = 0, chaine = null, dernier = ''
  while (i < src.length) {
    const c = src[i], d = src[i + 1]
    if (chaine) {
      if (c === '\\') { out += c + (d ?? ''); i += 2; continue }
      if (c === chaine) chaine = null
      out += c; i++; continue
    }
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue }
    if (c === "'" || c === '"' || c === '`') { chaine = c; out += c; i++; dernier = c; continue }
    if (c === '/' && (dernier === '' || '(,=:[!&|?{};+-*%<>~^'.includes(dernier) || /(?:return|typeof|case)$/.test(out.trimEnd()))) {
      // littéral d'expression régulière : jusqu'au « / » non échappé, hors classe [...]
      let j = i + 1, classe = false
      while (j < src.length && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === '[') classe = true
        else if (src[j] === ']') classe = false
        else if (src[j] === '/' && !classe) break
        j++
      }
      out += src.slice(i, j + 1); i = j + 1; dernier = '/'; continue
    }
    out += c; i++
    if (!/\s/.test(c)) dernier = c
  }
  return out
}

/** Le collecteur : plusieurs vérifications par critère, résumées à la fin (une ligne PASS, ou une raison par vérification en échec). */
function collecteur(s) {
  const v = new Map(IDS.map((id) => [id, []]))
  const finis = new Set()
  return {
    fini(id) { finis.add(id) },
    inacheves() { return IDS.filter((id) => !finis.has(id)) },
    ok(id, condition, dOk, dKo) { v.get(id).push({ ok: !!condition, d: condition ? dOk : (dKo ?? dOk) }) },
    ko(id, raison) { v.get(id).push({ ok: false, d: raison }) },
    clore() {
      for (const [id, l] of v) {
        const ko = l.filter((x) => !x.ok)
        if (ko.length) for (const x of ko) s.echoue(id, x.d)
        else if (l.length) s.passe(id, `${l.length} vérifications : ${l.slice(0, 5).map((x) => x.d).join(' ; ')}${l.length > 5 ? ' ; …' : ''}`)
      }
    },
  }
}

// ── L'enfant ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function lancerEnfant(racine, R) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/(KEY|TOKEN|SECRET|PASSWORD|SUPABASE|ANTHROPIC|RESEND|STRIPE|DATABASE|DIRECT_URL|CRON|TELEGRAM)/i.test(k)))
  env.TZ = 'UTC'
  const p = spawn(process.execPath, [
    '--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(path.join(R, 'scripts', 'ts-loader.mjs')).href,
    path.join(FIXTURES, 'routes-enfant.mjs'), `--racine=${racine}`, `--depot=${R}`,
  ], { cwd: racine, env, stdio: ['pipe', 'pipe', 'pipe'] })
  const attente = new Map()
  let n = 0, tampon = '', bruit = '', fini = false
  const finir = (raison) => { fini = true; for (const [, { ko }] of attente) ko(new Error(raison)); attente.clear() }
  p.stdout.setEncoding('utf8')
  p.stdout.on('data', (d) => {
    tampon += d
    let i
    while ((i = tampon.indexOf('\n')) >= 0) {
      const l = tampon.slice(0, i); tampon = tampon.slice(i + 1)
      if (!l.startsWith('@@')) { bruit = (bruit + l + '\n').slice(-1500); continue }
      let m; try { m = JSON.parse(l.slice(2)) } catch { continue }
      const a = attente.get(m.id)
      if (a) { attente.delete(m.id); m.ok ? a.ok(m.r) : a.ko(new Error(m.erreur)) }
    }
  })
  p.stderr.setEncoding('utf8')
  p.stderr.on('data', (d) => { bruit = (bruit + d).slice(-1500) })
  p.on('exit', (code) => finir(`l'enfant s'est arrêté (code ${code}) : ${court(bruit, 400)}`))
  p.on('error', (e) => finir(`l'enfant n'a pas démarré : ${e.message}`))
  return {
    envoyer(msg, delai = 60_000) {
      if (fini) return Promise.reject(new Error('enfant arrêté'))
      const id = ++n
      return new Promise((ok, ko) => {
        const t = setTimeout(() => { attente.delete(id); ko(new Error(`délai de ${delai / 1000} s dépassé : ${court(bruit, 300)}`)) }, delai)
        attente.set(id, { ok: (r) => { clearTimeout(t); ok(r) }, ko: (e) => { clearTimeout(t); ko(e) } })
        p.stdin.write(JSON.stringify({ id, ...msg }) + '\n')
      })
    },
    arreter() { try { p.stdin.end() } catch { /* déjà fermé */ } setTimeout(() => p.kill('SIGKILL'), 2000).unref() },
  }
}

// ── La partie ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function jouer({ racine, s, R, travail }) {
  const c = collecteur(s)
  const echanges = []
  const enfant = lancerEnfant(racine, R)
  try {
    await jugerTout({ racine, s, R, travail, c, enfant, echanges })
  } catch (e) {
    for (const id of c.inacheves()) c.ko(id, `le juge n'a pas pu aller au bout : ${court(e?.message ?? e, 300)}`)
  } finally {
    enfant.arreter()
  }
  c.clore()
  for (const id of IDS) if (!s.evalue(id)) s.echoue(id, 'critère jamais évalué par le juge')
  try { fs.mkdirSync(travail, { recursive: true }); fs.writeFileSync(path.join(travail, 'echanges-routes.json'), JSON.stringify(echanges, null, 1)) } catch { /* consigne facultative */ }
}

async function jugerTout({ racine, s, R, travail, c, enfant, echanges }) {
  const alertes = jsonFixture('alertes.json'), chef = jsonFixture('evenements-chef.json')
  const src = (rel) => lireSi(path.join(racine, rel)) ?? ''
  const codeSortie = sansCommentaires(src(ROUTE_SORTIE)), codeEntree = sansCommentaires(src(ROUTE_ENTREE)), codeLib = sansCommentaires(src(LIB_TELEGRAM))

  // — les jetons d'agent des doublures : tirés au hasard à chaque passage —
  const CAP = ['notifier', 'pause', 'consigne']
  const J = { pont: tirerJeton('pa_pont_telegram'), autre: tirerJeton('pa_facteur'), voisin: tirerJeton('pa_pont'), suffixe: tirerJeton('pa_pont_telegram_bis'), inconnu: tirerJeton('pa_inconnu') }
  const JETONS = {
    [J.pont]: { nom: 'pont_telegram', capacites: CAP }, [J.autre]: { nom: 'facteur', capacites: CAP },
    [J.voisin]: { nom: 'pont', capacites: CAP }, [J.suffixe]: { nom: 'pont_telegram_bis', capacites: CAP },
  }
  const config = (x = {}) => ({ drapeaux: { busAgents: true }, jetons: JETONS, pause: { active: false, source: 'base' }, ...x })

  // — l'exécution d'un cas —
  async function jouerCas(nom, cas) {
    const r = await enfant.envoyer({ cmd: 'executer', cas })
    let json = null
    if (typeof r.texte === 'string') { try { json = JSON.parse(r.texte) } catch { /* pas du JSON */ } }
    const rpcs = (r.appelsBase ?? []).filter((a) => a.fonction).map((a) => a.fonction)
    echanges.push({ nom, route: cas.route, status: r.status ?? null, corps: court(r.texte ?? "", 160), manque: r.manque ?? null, exception: r.exception ?? null, rpcs, tables: (r.appelsBase ?? []).filter((a) => a.table).map((a) => `${a.methode} ${a.table} ${JSON.stringify(a.requete)}`), doublures: (r.appelsDoublures ?? []).map((a) => `${a.f}${a.drapeau ? `(${a.drapeau})` : ''}`) })
    return { ...r, json, rpcs, nom }
  }
  const sortie = (nom, { jeton = J.pont, query = '', cfg = {} } = {}) => jouerCas(nom, { route: 'sortie', methode: 'GET', url: URL_SORTIE + query, entetes: jeton ? { authorization: `Bearer ${jeton}` } : {}, config: config(cfg) })
  const entree = (nom, corps, { jeton = J.pont, brut = false, cfg = {} } = {}) => jouerCas(nom, {
    route: 'entree', methode: 'POST', url: URL_ENTREE, entetes: { 'content-type': 'application/json', ...(jeton ? { authorization: `Bearer ${jeton}` } : {}) },
    corps: brut ? corps : JSON.stringify(corps), config: config(cfg),
  })
  const sansBase = (r) => (r.appelsBase ?? []).length === 0
  const rpcsPropres = (r) => (r.appelsBase ?? []).filter((a) => a.fonction)
  const uneErreur = (r) => r.exception ?? r.manque ?? null

  // — le chargement des trois modules jugés —
  let info
  try { info = await enfant.envoyer({ cmd: 'charger' }) } catch (e) { throw new Error(`l'enfant n'a pas chargé les modules : ${e.message}`) }
  const DEP = { 'PT-2': ['sortie', 'entree'], 'PT-3': ['sortie'], 'PT-4': ['entree'], 'PT-5': ['entree'], 'PT-6': ['entree'], 'PT-7': ['telegram', 'entree'] }
  const FICHIER = { telegram: LIB_TELEGRAM, sortie: ROUTE_SORTIE, entree: ROUTE_ENTREE }
  const jouables = new Set()
  for (const id of IDS) {
    const manque = DEP[id].filter((k) => !info[k]?.ok)
    if (manque.length) { manque.forEach((k) => c.ko(id, `import de ${FICHIER[k]} en échec : ${info[k]?.erreur ?? 'inconnu'}`)); c.fini(id) }
    else jouables.add(id)
  }

  // — les attendus de la racine jugée (MOTIFS_POUSSES, chargeFondateur, masquer) —
  const evenements = chef.evenements
  const eligibleE = (e) => e.agent === chef.eligibles.agent && chef.eligibles.types.includes(e.type)
  const att = await enfant.envoyer({ cmd: 'attendus', textes: evenements.map((e) => e.resume ?? '') })
  const masque = (e) => att.masques[evenements.indexOf(e)]
  const motifsPousses = new Set(att.motifs)

  // ══ PT-2 — les gardes ═════════════════════════════════════════════════════════════════════════════════════════════════
  if (jouables.has('PT-2')) {
    for (const [route, rel, code, methode, exportRuntime] of [['sortie', ROUTE_SORTIE, codeSortie, 'GET'], ['entree', ROUTE_ENTREE, codeEntree, 'POST']]) {
      const appeler = (nom, o = {}) => (route === 'sortie' ? sortie(nom, o) : entree(nom, { commande: 'pause', motif: 'essai des gardes' }, o))
      c.ok('PT-2', info[route].exports.includes(methode), `${route} exporte ${methode}`, `${rel} n'exporte pas ${methode}`)
      c.ok('PT-2', info[route].runtime === 'nodejs' && info[route].dynamic === 'force-dynamic', `${route} : runtime nodejs, dynamic force-dynamic`, `${rel} : runtime « ${info[route].runtime} » et dynamic « ${info[route].dynamic} » (nodejs et force-dynamic attendus)`)
      c.ok('PT-2', /\bactif\(\s*['"`]busAgents['"`]\s*\)/.test(code), `${rel} lit actif('busAgents')`, `${rel} ne lit pas actif('busAgents') (source, commentaires ôtés)`)

      const sansJeton = await appeler(`${route} sans jeton`, { jeton: null })
      c.ok('PT-2', sansJeton.status === 401 && sansBase(sansJeton), `${route} : sans jeton → 401, sans appel à la base`, `${route} sans jeton : ${uneErreur(sansJeton) ?? `statut ${sansJeton.status}, ${(sansJeton.appelsBase ?? []).length} appel(s) à la base`}, 401 sans appel attendu`)
      const inconnu = await appeler(`${route} jeton inconnu`, { jeton: J.inconnu })
      c.ok('PT-2', inconnu.status === 401 && sansBase(inconnu), `${route} : jeton inconnu → 401`, `${route} jeton inconnu : ${uneErreur(inconnu) ?? `statut ${inconnu.status}`}, 401 attendu`)
      for (const [qui, jeton] of [['un autre agent (facteur, mêmes capacités)', J.autre], ['l\'agent « pont »', J.voisin], ['l\'agent « pont_telegram_bis »', J.suffixe]]) {
        const r = await appeler(`${route} ${qui}`, { jeton })
        c.ok('PT-2', r.status === 403 && sansBase(r), `${route} : ${qui} → 403, sans appel à la base`, `${route} avec ${qui} : ${uneErreur(r) ?? `statut ${r.status}, ${(r.appelsBase ?? []).length} appel(s) à la base`}, 403 sans appel attendu`)
      }
      const bon = await appeler(`${route} bon jeton`)
      c.ok('PT-2', bon.status === 200, `${route} : le jeton de pont_telegram passe (200)`, `${route} avec le jeton de pont_telegram : ${uneErreur(bon) ?? `statut ${bon.status}`}, 200 attendu`)
      const journal = (bon.appelsDoublures ?? []).map((a) => a.f === 'actif' ? `actif:${a.drapeau}` : a.f)
      const ia = journal.indexOf('authAgent'), ib = journal.indexOf('actif:busAgents')
      c.ok('PT-2', ib >= 0 && ia > ib, `${route} : actif('busAgents') est lu AVANT authAgent`, `${route} : ordre des appels aux doublures « ${journal.join(', ')} » : actif('busAgents') puis authAgent attendus`)
      for (const [qui, jeton] of [['jeton valable', J.pont], ['sans jeton', null], ['jeton d\'un autre agent', J.autre]]) {
        const r = await appeler(`${route} busAgents baissé, ${qui}`, { jeton, cfg: { drapeaux: { busAgents: false } } })
        const j = (r.appelsDoublures ?? []).map((a) => a.f === 'actif' ? `actif:${a.drapeau}` : a.f)
        c.ok('PT-2', r.status === 404 && !j.includes('authAgent') && j.includes('actif:busAgents') && sansBase(r),
          `${route} : busAgents baissé (${qui}) → 404 avant toute identité, sans appel à la base`,
          `${route} busAgents baissé (${qui}) : ${uneErreur(r) ?? `statut ${r.status}`}, appels aux doublures « ${j.join(', ')} », ${(r.appelsBase ?? []).length} appel(s) à la base : 404, actif('busAgents') sans authAgent ni base attendus`)
      }
    }
    // la ligne busAgents de la carte de fermeture-e2e
    const f = lireSi(path.join(racine, 'scripts', 'fermeture-e2e.mjs'))
    if (f === null) c.ko('PT-2', 'scripts/fermeture-e2e.mjs absent de la racine')
    else {
      const ligne = f.split('\n').find((l) => /^\s*'busAgents'\s*:\s*\[/.test(l))
      if (!ligne) c.ko('PT-2', "aucune ligne « 'busAgents': [...] » dans la carte de scripts/fermeture-e2e.mjs")
      else {
        const chaines = [...ligne.matchAll(/'([^']*)'/g)].map((m) => m[1])
        for (const rel of [ROUTE_SORTIE, ROUTE_ENTREE]) c.ok('PT-2', chaines.includes(rel), `la ligne busAgents de fermeture-e2e liste ${rel}`, `la ligne busAgents de scripts/fermeture-e2e.mjs ne liste pas ${rel}`)
      }
    }
    c.fini('PT-2')
  }

  // ══ PT-3 — GET sortie ═════════════════════════════════════════════════════════════════════════════════════════════════
  if (jouables.has('PT-3')) {
    const eligA = alertes.alertes.filter((a) => motifsPousses.has(a.motif))
    const eligE = evenements.filter(eligibleE)
    c.ok('PT-3', att.motifs.length >= 9 && eligA.length > 0 && eligA.length + eligE.length > MAX_MESSAGES && alertes.alertes.length > eligA.length, `jeu d'essai : ${att.motifs.length} motifs poussés, ${eligA.length} alertes et ${eligE.length} événements à sortir (plus que ${MAX_MESSAGES}), ${alertes.alertes.length - eligA.length} alertes d'autres motifs`, `jeu d'essai insuffisant pour éprouver le plafond de ${MAX_MESSAGES}`)
    c.ok('PT-3', att.motifs.every((m) => att.charges[m]) && Object.values(att.horsListe).every((x) => x === null), 'chargeFondateur rend une charge pour chaque motif poussé et null pour les autres', 'chargeFondateur de la racine ne se comporte pas comme attendu (jeu d\'essai du juge périmé ?)')
    const masques = eligE.map(masque)
    c.ok('PT-3', masques.every((m) => m) && new Set(masques).size === masques.length && masques.every((m, i) => masques.every((n, j) => i === j || !n.includes(m))), 'les résumés masqués du jeu d\'essai sont distincts (reconnaissables sans ambiguïté)', 'résumés masqués du jeu d\'essai ambigus : jeu périmé')

    // les textes attendus
    const reAlerte = {}
    for (const m of att.motifs) { const ch = att.charges[m]; reAlerte[m] = new RegExp(`^${esc(norm(ch.titre))}[\\s:.\\-–—·|/]{1,6}${esc(norm(ch.ligne))}$`) }
    const attendusA = {}; for (const m of att.motifs) attendusA[m] = eligA.filter((a) => a.motif === m).length
    const classer = (texte) => {
      const t = norm(texte)
      for (const m of att.motifs) if (reAlerte[m].test(t)) return { k: 'alerte', m }
      for (const e of eligE) if (t.includes(norm(masque(e)))) return { k: 'evenement', id: e.id }
      return null
    }
    // les chaînes qui ne doivent JAMAIS sortir (et le jeton de l'agent)
    const pieges = [...alertes.pieges, ...alertes.alertes.flatMap((a) => [a.sujet, a.corps]), ...chef.pieges_masques, ...chef.pieges_ineligibles].filter(Boolean)
    const fuites = (texte) => [...pieges.filter((p) => texte.includes(p)), ...(texte.includes(J.pont) ? ['le jeton de l\'agent'] : [])]

    const formeReponse = (nom, r) => {
      const j = r.json
      if (uneErreur(r) || r.status !== 200 || !j || typeof j !== 'object' || Array.isArray(j)) { c.ko('PT-3', `${nom} : ${uneErreur(r) ?? `statut ${r.status}`}, 200 avec un objet JSON attendu`); return null }
      c.ok('PT-3', egal(cles(j), ['apres_alerte', 'apres_evenement', 'messages']), `${nom} : la réponse ne porte que messages, apres_alerte, apres_evenement`, `${nom} : clés ${cles(j).join(', ')}, messages + apres_alerte + apres_evenement attendus`)
      if (!Array.isArray(j.messages)) { c.ko('PT-3', `${nom} : messages n'est pas un tableau`); return null }
      c.ok('PT-3', j.messages.length <= MAX_MESSAGES, `${nom} : ${j.messages.length} messages (≤ ${MAX_MESSAGES})`, `${nom} : ${j.messages.length} messages, ${MAX_MESSAGES} au plus attendus`)
      const mal = j.messages.filter((m) => !m || typeof m !== 'object' || !egal(cles(m), ['id', 'texte']) || !['string', 'number'].includes(typeof m.id) || m.id === '' || typeof m.texte !== 'string' || !m.texte.trim())
      c.ok('PT-3', mal.length === 0, `${nom} : chaque message est { id, texte }`, `${nom} : ${mal.length} message(s) qui ne sont pas exactement { id, texte } non vides`)
      const f = fuites(r.texte)
      c.ok('PT-3', f.length === 0, `${nom} : aucune chaîne piégée dans la réponse`, `${nom} : chaîne piégée dans la réponse : « ${court(f[0], 60)} »`)
      return j
    }

    // 1. la chaîne des curseurs sur le jeu d'essai complet (25 messages à sortir, 20 au plus par réponse)
    const cfgPlein = { alertes: alertes.alertes, evenements: evenements }
    const compte = { alerte: Object.fromEntries(att.motifs.map((m) => [m, 0])), evenement: Object.fromEntries(eligE.map((e) => [e.id, 0])) }
    const ids = new Map(); const inattendus = []
    let apresA = null, apresE = null, pages = 0, total = 0
    const requeteCurseurs = () => { const p = new URLSearchParams(); if (apresA !== null && apresA !== undefined) p.set('apres_alerte', String(apresA)); if (apresE !== null && apresE !== undefined) p.set('apres_evenement', String(apresE)); const t = p.toString(); return t ? `?${t}` : '' }
    for (let i = 0; i < 8; i++) {
      const r = await sortie(`sortie, page ${i + 1}`, { query: requeteCurseurs(), cfg: cfgPlein })
      const j = formeReponse(`sortie page ${i + 1}`, r)
      if (!j || !Array.isArray(j.messages)) break
      if (i === 0) c.ok('PT-3', j.messages.length > 0, 'sortie : la première page n\'est pas vide', 'sortie : la première page est vide alors que 25 messages sont à sortir')
      if (j.messages.length === 0) break
      pages++; total += j.messages.length
      for (const m of j.messages) {
        ids.set(m.id, (ids.get(m.id) ?? 0) + 1)
        const k = classer(m.texte)
        if (!k) inattendus.push(m.texte); else if (k.k === 'alerte') compte.alerte[k.m]++; else compte.evenement[k.id]++
      }
      if (j.apres_alerte !== null && j.apres_alerte !== undefined) apresA = j.apres_alerte
      if (j.apres_evenement !== null && j.apres_evenement !== undefined) apresE = j.apres_evenement
    }
    c.ok('PT-3', inattendus.length === 0, 'sortie : chaque message est le texte d\'un motif poussé ou un résumé masqué du Chef', `sortie : ${inattendus.length} message(s) hors liste (autre motif d'alerte, autre agent ou autre type d'événement, texte différent de chargeFondateur) : « ${court(inattendus[0], 110)} »`)
    const doubles = [...ids].filter(([, n]) => n > 1)
    c.ok('PT-3', doubles.length === 0, 'sortie : aucun message renvoyé deux fois en suivant les curseurs', `sortie : ${doubles.length} message(s) renvoyé(s) deux fois en suivant les curseurs (le curseur n'avance pas) : ${doubles[0]?.[0]}`)
    const manquantsA = att.motifs.filter((m) => compte.alerte[m] < attendusA[m]).map((m) => `${m} ${compte.alerte[m]}/${attendusA[m]}`)
    const dupA = att.motifs.filter((m) => compte.alerte[m] > attendusA[m]).map((m) => `${m} ${compte.alerte[m]}/${attendusA[m]}`)
    c.ok('PT-3', manquantsA.length === 0 && dupA.length === 0, `sortie : les ${eligA.length} alertes des motifs poussés sortent, une fois chacune, en ${pages} réponses`, `sortie : alertes des motifs poussés sorties en trop ou en moins (${[...manquantsA, ...dupA].join(', ')})`)
    const manquantsE = eligE.filter((e) => compte.evenement[e.id] !== 1).map((e) => `${e.type}#${e.id}×${compte.evenement[e.id]}`)
    c.ok('PT-3', manquantsE.length === 0, `sortie : les ${eligE.length} comptes rendus du Chef sortent une fois chacun, passés par masquer`, `sortie : événements du Chef à sortir une fois chacun : ${manquantsE.join(', ')}`)
    c.ok('PT-3', total === eligA.length + eligE.length, `sortie : ${total} messages au total`, `sortie : ${total} messages au total, ${eligA.length + eligE.length} attendus`)

    // 2. curseurs à jour : plus rien
    const fin = await sortie('sortie, curseurs à jour', { query: requeteCurseurs(), cfg: cfgPlein })
    const jf = formeReponse('sortie curseurs à jour', fin)
    if (jf) c.ok('PT-3', jf.messages.length === 0, 'sortie : avec les curseurs rendus, rien de plus', `sortie : ${jf.messages.length} message(s) alors que les curseurs sont à jour (apres_alerte/apres_evenement ignorés)`)

    // 3. un curseur d'événement choisi : rien d'avant lui
    if (eligE.length >= 4 && apresA !== null) {
      const coupe = eligE[2].id
      const r = await sortie(`sortie, apres_evenement=${coupe}`, { query: `?apres_alerte=${encodeURIComponent(String(apresA))}&apres_evenement=${coupe}`, cfg: cfgPlein })
      const j = formeReponse(`sortie après l'événement ${coupe}`, r)
      if (j) {
        const attendu = eligE.filter((e) => e.id > coupe)
        const vus = j.messages.map((m) => classer(m.texte))
        const bon = vus.length === attendu.length && vus.every((k) => k && k.k === 'evenement' && attendu.some((e) => e.id === k.id)) && new Set(vus.map((k) => k?.id)).size === attendu.length
        c.ok('PT-3', bon, `sortie : apres_evenement=${coupe} → seulement les ${attendu.length} événements suivants, aucune alerte`, `sortie : apres_evenement=${coupe} doit rendre les ${attendu.length} événements d'id supérieur (et aucune alerte : le curseur d'alerte est à jour), reçu ${j.messages.length} message(s) : ${court(j.messages.map((m) => m.texte).join(' | '), 200)}`)
      }
    } else c.ko('PT-3', 'les curseurs de la chaîne n\'ont pas permis de choisir un curseur d\'événement')

    // 4. un seul type de source à la fois
    const soloA = await sortie('sortie, alertes seules', { cfg: { alertes: alertes.alertes, evenements: [] } })
    const ja = formeReponse('sortie sans événements', soloA)
    if (ja) c.ok('PT-3', ja.messages.length === eligA.length && ja.messages.every((m) => classer(m.texte)?.k === 'alerte'), `sortie : sans événements, les ${eligA.length} alertes sortent seules`, `sortie sans événements : ${ja.messages.length} message(s), ${eligA.length} alertes attendues`)
    const soloE = await sortie('sortie, événements seuls', { cfg: { alertes: [], evenements } })
    const je = formeReponse('sortie sans alertes', soloE)
    if (je) c.ok('PT-3', je.messages.length === eligE.length && je.messages.every((m) => classer(m.texte)?.k === 'evenement'), `sortie : sans alertes, les ${eligE.length} comptes rendus du Chef sortent seuls`, `sortie sans alertes : ${je.messages.length} message(s), ${eligE.length} comptes rendus attendus`)
    const vide = await sortie('sortie, rien', { cfg: { alertes: [], evenements: [] } })
    const jv = formeReponse('sortie vide', vide)
    if (jv) c.ok('PT-3', jv.messages.length === 0, 'sortie : rien à dire → messages vide', `sortie vide : ${jv.messages.length} message(s)`)

    // 5. ce que la route lit dans `alertes` : id, motif, cree_le, rien d'autre
    const lues = echanges.filter((e) => e.route === 'sortie' && e.tables.length).flatMap((e) => e.tables)
    const brutes = []
    // (relit les appels consignés par le faux PostgREST : les entrées d'échange ont « METHODE table {requete} »)
    for (const l of lues) { const m = /^(\w+) (\w+) (\{.*\})$/.exec(l); if (m) brutes.push({ methode: m[1], table: m[2], requete: JSON.parse(m[3]) }) }
    const autresTables = brutes.filter((b) => b.table !== 'alertes' || b.methode !== 'GET')
    c.ok('PT-3', brutes.length > 0 && autresTables.length === 0, `sortie : ne lit que la table alertes (${brutes.length} lectures)`, brutes.length ? `sortie : lecture ou écriture hors « GET alertes » : ${autresTables[0]?.methode} ${autresTables[0]?.table}` : 'sortie : aucune lecture de la table alertes consignée')
    const demandees = new Set(); let etoile = false
    for (const b of brutes.filter((x) => x.table === 'alertes')) {
      const sel = String(b.requete.select ?? '*').trim()
      if (sel === '*' || sel === '') etoile = true; else sel.split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => demandees.add(x.replace(/\(.*$/, '').replace(/:.*$/, '')))
      for (const [k, v] of Object.entries(b.requete)) {
        if (k === 'select' || k === 'limit' || k === 'offset') continue
        if (k === 'order') v.split(',').forEach((o) => demandees.add(o.split('.')[0]))
        else if (k === 'or' || k === 'and') [...String(v).matchAll(/(?:^|[(,])([a-z_]+)\.(?:eq|neq|gt|gte|lt|lte|in|is|like|ilike|not)\b/g)].forEach((m) => demandees.add(m[1]))
        else demandees.add(k)
      }
    }
    const horsListe = [...demandees].filter((x) => !COLONNES_ALERTES.includes(x))
    c.ok('PT-3', !etoile && horsListe.length === 0 && demandees.size > 0, `sortie : ne demande d'alertes que ${[...demandees].sort().join(', ')} (select, filtres et ordre compris)`, etoile ? 'sortie : select(*) sur alertes (toutes les colonnes, sujet et corps compris)' : `sortie : colonnes d'alertes hors de id, motif, cree_le : ${horsListe.join(', ') || '(aucune demandée)'}`)
    // 6. le source : ni sujet ni corps
    c.ok('PT-3', !/\b(?:sujet|corps)\b/.test(codeSortie), 'sortie : ni « sujet » ni « corps » dans le source', `${ROUTE_SORTIE} nomme « sujet » ou « corps » (source, commentaires ôtés)`)
    c.fini('PT-3')
  }

  // ══ PT-4 — POST entree, commande pause ════════════════════════════════════════════════════════════════════════════════
  const masquerTexte = async (t) => (await enfant.envoyer({ cmd: 'attendus', textes: [t] })).masques[0]
  if (jouables.has('PT-4')) {
    const motifPiege = 'Fuite chez M. Jacques Morel, rappeler le 06 39 98 22 33 ou jacques.morel@presti-test.invalid (https://exemple.presti-test.invalid/f/9)'
    const motifLong = `Mme Lucie Brun au 06 39 98 44 55 ${'x'.repeat(380)} jacques.morel@presti-test.invalid`
    const nb = (r, f) => rpcsPropres(r).filter((a) => a.fonction === f).length
    const verifPause = async (nom, corps, motif, extra = {}) => {
      const r = await entree(nom, corps)
      const p = rpcsPropres(r)
      c.ok('PT-4', !uneErreur(r) && r.status === 200 && (r.appelsBase ?? []).length === 1 && nb(r, 'station_pause_par_agent') === 1, `${nom} : 200, un seul appel à la base, station_pause_par_agent`, `${nom} : ${uneErreur(r) ?? `statut ${r.status}`}, appels à la base : ${(r.appelsBase ?? []).map((a) => a.fonction ?? a.table).join(', ') || 'aucun'} — 200 et un seul appel station_pause_par_agent attendus`)
      const a = p.find((x) => x.fonction === 'station_pause_par_agent')
      if (!a) return
      c.ok('PT-4', egal(cles(a.params), ['p_agent', 'p_motif']) && a.params.p_agent === 'pont_telegram', `${nom} : p_agent = pont_telegram`, `${nom} : paramètres ${JSON.stringify(cles(a.params))}, p_agent « ${a.params.p_agent} » (pont_telegram attendu)`)
      const m = String(a.params.p_motif ?? '')
      const attendu = `telegram : ${await masquerTexte(motif)}`.slice(0, 150)
      c.ok('PT-4', m.startsWith('telegram : '), `${nom} : motif préfixé « telegram : »`, `${nom} : motif « ${court(m, 60)} » sans le préfixe « telegram : »`)
      c.ok('PT-4', m.length <= 150, `${nom} : motif de ${m.length} signes (≤ 150)`, `${nom} : motif de ${m.length} signes, 150 au plus`)
      c.ok('PT-4', m === attendu, `${nom} : motif = « telegram : » + masquer(motif), coupé à 150`, `${nom} : motif « ${court(m, 90)} », attendu « ${court(attendu, 90)} » (préfixe + masquer, 150 au plus)`)
      const brut = ['jacques.morel@presti-test.invalid', '06 39 98 22 33', '06 39 98 44 55', 'Jacques Morel', 'Lucie Brun', 'exemple.presti-test.invalid'].filter((x) => m.includes(x) || (r.texte ?? '').includes(x))
      c.ok('PT-4', brut.length === 0, `${nom} : aucune donnée de la demande en clair dans le motif ni la réponse`, `${nom} : « ${brut[0]} » en clair dans le motif ou la réponse (masquer non appliqué)`)
    }
    await verifPause('pause, motif piégé', { commande: 'pause', motif: motifPiege }, motifPiege)
    await verifPause('pause, motif de 400 signes', { commande: 'pause', motif: motifLong }, motifLong)
    await verifPause('pause, avec des champs de reprise en plus', { commande: 'pause', motif: 'coupure d\'essai', actif: false, reprise: true, p_actif: false, p_pause: false, levee: true }, 'coupure d\'essai')
    const deja = await entree('pause déjà active', { commande: 'pause', motif: 'déjà posée' }, { cfg: { pauseDejaActive: true } })
    c.ok('PT-4', deja.status === 200 && nb(deja, 'station_pause_par_agent') === 1 && (deja.appelsBase ?? []).length === 1, 'pause déjà active (la base rend false) → 200, toujours un seul appel', `pause déjà active : ${uneErreur(deja) ?? `statut ${deja.status}`}, ${(deja.appelsBase ?? []).length} appel(s) : 200 et un seul appel attendus`)
    // les erreurs de la base : 503 avec le code ops:…, jamais 500
    for (const [nom, erreurs, motifOps] of [['ops:agent', { station_pause_par_agent: { ops: 'agent' } }, 'ops:agent'], ['ops:motif', { station_pause_par_agent: { ops: 'motif' } }, 'ops:motif'], ['erreur Postgres sans code ops', { station_pause_par_agent: { pg: { message: 'panne d\'essai', code: 'XX000', status: 500 } } }, null]]) {
      const r = await entree(`pause, la base répond ${nom}`, { commande: 'pause', motif: 'essai d\'une panne' }, { cfg: { erreurs } })
      c.ok('PT-4', r.status === 503 && (motifOps === null || (r.texte ?? '').includes(motifOps)), `pause, base en erreur (${nom}) → 503${motifOps ? ` avec ${motifOps}` : ''}`, `pause, base en erreur (${nom}) : ${uneErreur(r) ?? `statut ${r.status}`}${motifOps && r.status === 503 ? `, « ${motifOps} » absent du corps « ${court(r.texte, 80)} »` : ''} — 503${motifOps ? ` avec ${motifOps}` : ''} attendu, jamais 500`)
    }
    // le source : jamais la levée de la pause
    const code = `${codeEntree}\n${codeLib}`
    c.ok('PT-4', /station_pause_par_agent/.test(codeEntree), `${ROUTE_ENTREE} appelle station_pause_par_agent`, `${ROUTE_ENTREE} n'appelle pas station_pause_par_agent (source, commentaires ôtés)`)
    c.ok('PT-4', !/ops_interrupteur_poser/.test(code) && !/ops_interrupteur_poser/.test(codeSortie), 'source : aucun appel à ops_interrupteur_poser', `le source du pont (route ou lib/agents/telegram.ts) nomme ops_interrupteur_poser (commentaires ôtés)`)
    const faux = [/\b\w*pause\w*\s*\([^()]*\bfalse\b/i, /\bp_(?:pause|actif)\s*:\s*false\b/, /\bops_agent_pause\b/, /['"`](?:reprise|reprendre|reprend|lever|leve|levee|resume|reactiver)['"`]/i].map((re) => re.exec(code)).filter(Boolean)
    c.ok('PT-4', faux.length === 0, 'source : aucun false passé à une fonction de pause, aucune commande de reprise', `source du pont : « ${court(faux[0]?.[0], 70)} » (levée ou reprise de la pause ; commentaires ôtés)`)
    c.fini('PT-4')
  }

  // ══ PT-5 — POST entree, commande consigne ═════════════════════════════════════════════════════════════════════════════
  if (jouables.has('PT-5')) {
    const texte200 = 'Regarde les paiements en attente puis rends-moi compte. '.repeat(4).slice(0, 200).trim().padEnd(200, 'z')
    for (const [nom, texte] of [['texte courant', 'Relance les paiements bloqués, puis dis-moi.'], ['texte de 3 signes', 'ok!'], ['texte de 200 signes', texte200]]) {
      const r = await entree(`consigne, ${nom}`, { commande: 'consigne', texte })
      const a = rpcsPropres(r)[0]
      c.ok('PT-5', !uneErreur(r) && r.status === 200 && (r.appelsBase ?? []).length === 1 && a?.fonction === 'station_consigne_par_agent', `consigne, ${nom} (${texte.length} signes) : 200, un seul appel station_consigne_par_agent`, `consigne, ${nom} (${texte.length} signes) : ${uneErreur(r) ?? `statut ${r.status}`}, appels : ${(r.appelsBase ?? []).map((x) => x.fonction ?? x.table).join(', ') || 'aucun'} — 200 et un seul appel attendus`)
      if (a) c.ok('PT-5', a.params.p_agent === 'pont_telegram' && a.params.p_agent_cible === 'chef' && a.params.p_texte === texte && egal(cles(a.params), ['p_agent', 'p_agent_cible', 'p_texte']), `consigne, ${nom} : p_agent pont_telegram, cible chef, texte tel quel`, `consigne, ${nom} : paramètres ${JSON.stringify(a.params).slice(0, 160)} (p_agent pont_telegram, p_agent_cible chef, p_texte inchangé attendus)`)
    }
    const fauxTextes = [['texte de 2 signes', { commande: 'consigne', texte: 'ok' }], ['texte de 201 signes', { commande: 'consigne', texte: `${texte200}y` }], ['texte de 5000 signes', { commande: 'consigne', texte: 'a'.repeat(5000) }], ['texte vide', { commande: 'consigne', texte: '' }], ['texte absent', { commande: 'consigne' }], ['motif au lieu de texte', { commande: 'consigne', motif: 'Relance les paiements' }], ['texte numérique', { commande: 'consigne', texte: 123456 }], ['texte en tableau', { commande: 'consigne', texte: ['Relance les paiements'] }], ['texte nul', { commande: 'consigne', texte: null }]]
    for (const [nom, corps] of fauxTextes) {
      const r = await entree(`consigne refusée, ${nom}`, corps)
      c.ok('PT-5', r.status === 400 && sansBase(r), `consigne, ${nom} → 400 sans appel à la base`, `consigne, ${nom} : ${uneErreur(r) ?? `statut ${r.status}`}, ${(r.appelsBase ?? []).length} appel(s) à la base : 400 sans appel attendu`)
    }
    for (const [nom, erreurs, motifOps] of [['ops:quota', { station_consigne_par_agent: { ops: 'quota' } }, 'ops:quota'], ['ops:texte', { station_consigne_par_agent: { ops: 'texte' } }, 'ops:texte'], ['ops:agent', { station_consigne_par_agent: { ops: 'agent' } }, 'ops:agent'], ['erreur Postgres sans code ops', { station_consigne_par_agent: { pg: { message: 'panne d\'essai', code: 'XX000', status: 500 } } }, null]]) {
      const r = await entree(`consigne, la base répond ${nom}`, { commande: 'consigne', texte: 'Regarde les relances de la semaine' }, { cfg: { erreurs } })
      c.ok('PT-5', r.status === 503 && (motifOps === null || (r.texte ?? '').includes(motifOps)), `consigne, base en erreur (${nom}) → 503${motifOps ? ` avec ${motifOps}` : ''}`, `consigne, base en erreur (${nom}) : ${uneErreur(r) ?? `statut ${r.status}`}${motifOps && r.status === 503 ? `, « ${motifOps} » absent du corps « ${court(r.texte, 80)} »` : ''} — 503${motifOps ? ` avec ${motifOps}` : ''} attendu, jamais 500`)
    }
    c.ok('PT-5', /station_consigne_par_agent/.test(codeEntree), `${ROUTE_ENTREE} appelle station_consigne_par_agent`, `${ROUTE_ENTREE} n'appelle pas station_consigne_par_agent (source, commentaires ôtés)`)
    c.fini('PT-5')
  }

  // ══ PT-6 — POST entree, commande etat ═════════════════════════════════════════════════════════════════════════════════
  if (jouables.has('PT-6')) {
    const il = (m) => new Date(Date.now() - m * 60_000).toISOString()
    const riche = {
      attention: [{ cle: 'pause_generale', nombre: 1, plus_ancien: il(30) }, { cle: 'decision_argent', nombre: 2, plus_ancien: il(90) }, { cle: 'disjoncteur', nombre: 1, plus_ancien: il(50) }, { cle: 'taches_bloquees', nombre: 3, plus_ancien: il(200) }, { cle: 'escalade_chef', nombre: 1, plus_ancien: il(20) }, { cle: 'appel', nombre: 3, plus_ancien: il(45) }],
      etat: { taches: { a_faire: 4, echec: 2 }, agents: [{ nom: 'facteur', battement_le: il(60 * 9), periode_minutes: 60, en_pause: false, disjoncteur_ouvert: false }, { nom: 'chef', battement_le: il(5), periode_minutes: 30, en_pause: false, disjoncteur_ouvert: false }], decisions_ouvertes: [], interrupteurs: {}, couts_mois: {}, notifications_jour: 1 },
    }
    const verifEtat = (nom, r, { pause, zero = false, positif = false }) => {
      const j = r.json
      if (uneErreur(r) || r.status !== 200 || !j || typeof j !== 'object' || Array.isArray(j)) { c.ko('PT-6', `${nom} : ${uneErreur(r) ?? `statut ${r.status}`}, 200 avec un objet JSON attendu`); return }
      c.ok('PT-6', egal(cles(j), ['appels', 'en_panne', 'orange', 'pause', 'rouge']), `${nom} : exactement pause, rouge, orange, appels, en_panne`, `${nom} : clés ${cles(j).join(', ')}, exactement pause, rouge, orange, appels, en_panne attendues`)
      c.ok('PT-6', typeof j.pause === 'boolean' && ['rouge', 'orange', 'appels', 'en_panne'].every((k) => Number.isInteger(j[k]) && j[k] >= 0), `${nom} : pause booléen, les quatre autres entiers ≥ 0`, `${nom} : types ${JSON.stringify(j).slice(0, 120)} (un booléen et quatre entiers ≥ 0 attendus)`)
      if (pause !== undefined) c.ok('PT-6', j.pause === pause, `${nom} : pause = ${pause} (pauseGenerale().active)`, `${nom} : pause ${j.pause}, ${pause} attendu (lu par pauseGenerale)`)
      if (zero) c.ok('PT-6', ['rouge', 'orange', 'appels', 'en_panne'].every((k) => j[k] === 0), `${nom} : rien à signaler → quatre zéros`, `${nom} : ${JSON.stringify(j)} alors que la base ne signale rien (quatre zéros attendus)`)
      if (positif) c.ok('PT-6', ['rouge', 'orange', 'appels', 'en_panne'].some((k) => j[k] > 0), `${nom} : la réponse suit les données de la base (compteurs non nuls)`, `${nom} : ${JSON.stringify(j)} alors que la base signale une pause, des décisions d'argent et un agent muet depuis 9 h (au moins un compteur > 0 attendu)`)
      const f = (r.texte ?? '').includes(J.pont)
      c.ok('PT-6', !f, `${nom} : pas de jeton dans la réponse`, `${nom} : le jeton de l'agent est dans la réponse`)
    }
    const lecturesEtat = (nom, r) => {
      const noms = rpcsPropres(r).map((a) => a.fonction)
      const journal = (r.appelsDoublures ?? []).map((a) => a.f)
      c.ok('PT-6', noms.includes('pilotage_attention_sources') && noms.includes('ops_etat') && noms.every((n) => ['pilotage_attention_sources', 'ops_etat'].includes(n)) && (r.appelsBase ?? []).every((a) => a.fonction), `${nom} : lit pilotage_attention_sources et ops_etat, rien d'autre dans la base`, `${nom} : appels à la base « ${(r.appelsBase ?? []).map((a) => a.fonction ?? `table ${a.table}`).join(', ') || 'aucun'} » : pilotage_attention_sources et ops_etat seuls attendus`)
      c.ok('PT-6', journal.includes('pauseGenerale'), `${nom} : lit pauseGenerale()`, `${nom} : pauseGenerale() n'est pas appelée (doublures : ${journal.join(', ')})`)
    }
    const r0 = await entree('etat, base au calme', { commande: 'etat' })
    verifEtat('etat, base au calme', r0, { pause: false, zero: true }); lecturesEtat('etat, base au calme', r0)
    const r1 = await entree('etat, pause active', { commande: 'etat' }, { cfg: { pause: { active: true, source: 'base', motif: 'essai' } } })
    verifEtat('etat, pause active', r1, { pause: true })
    const r2 = await entree('etat, pause illisible', { commande: 'etat' }, { cfg: { pause: { active: true, source: 'panne' } } })
    verifEtat('etat, pause illisible (active par prudence)', r2, { pause: true })
    const r3 = await entree('etat, base chargée', { commande: 'etat' }, { cfg: riche })
    verifEtat('etat, base chargée', r3, { positif: true }); lecturesEtat('etat, base chargée', r3)
    const r4 = await entree('etat, avec des champs en plus', { commande: 'etat', motif: 'x', texte: 'y', extra: 1 }, { cfg: riche })
    verifEtat('etat, corps avec champs en plus', r4, { positif: true })
    for (const [nom, erreurs] of [['pilotage_attention_sources en erreur ops', { pilotage_attention_sources: { ops: 'agent_inconnu' } }], ['ops_etat en erreur Postgres', { ops_etat: { pg: { message: 'panne d\'essai', code: 'XX000', status: 500 } } }], ['ops_etat en erreur ops', { ops_etat: { ops: 'quota' } }]]) {
      const r = await entree(`etat, ${nom}`, { commande: 'etat' }, { cfg: { ...riche, erreurs } })
      c.ok('PT-6', r.status === 503, `etat, ${nom} → 503`, `etat, ${nom} : ${uneErreur(r) ?? `statut ${r.status}`}, 503 attendu (jamais 500 ni 200)`)
    }
    // rien d'autre que ces lectures sur tous les cas de l'état
    const sortants = echanges.filter((e) => e.route === 'entree' && /^etat/.test(e.nom)).flatMap((e) => e.rpcs)
    c.ok('PT-6', sortants.every((n) => ['pilotage_attention_sources', 'ops_etat'].includes(n)), 'etat : jamais d\'autre fonction de la base que pilotage_attention_sources et ops_etat', `etat : fonction de la base inattendue : ${sortants.find((n) => !['pilotage_attention_sources', 'ops_etat'].includes(n))}`)
    c.fini('PT-6')
  }

  // ══ PT-7 — la liste fermée des commandes ══════════════════════════════════════════════════════════════════════════════
  if (jouables.has('PT-7')) {
    const cm = await enfant.envoyer({ cmd: 'commandes' })
    c.ok('PT-7', cm.present && cm.tableau, 'lib/agents/telegram.ts exporte COMMANDES (un tableau)', `${LIB_TELEGRAM} n'exporte pas COMMANDES sous forme de tableau`)
    c.ok('PT-7', egal(cm.contenu, ['pause', 'etat', 'consigne']), 'COMMANDES = [pause, etat, consigne], ni plus ni moins', `COMMANDES = ${JSON.stringify(cm.contenu)} : ["pause","etat","consigne"] attendu (aucune reprise, aucune levée)`)
    c.ok('PT-7', cm.gele === true, 'COMMANDES est gelée (Object.isFrozen)', 'COMMANDES n\'est pas gelée (Object.freeze attendu)')
    const refus = ['reprise', 'reprendre', 'lever', 'levee', 'resume', 'reprendre_pause', 'reactiver', 'PAUSE', 'Pause', 'pause ', ' etat', 'Etat', 'CONSIGNE', 'pause;etat', 'pause,etat', 'pause\n', '', 'constructor', '__proto__', 'toString', 'hasOwnProperty', 'length', '0', 'statut', 'stop', 'start', 'aide']
    let faute = null
    for (const commande of refus) {
      const r = await entree(`commande hors liste « ${commande.replace(/\n/g, '\\n')} »`, { commande, motif: 'essai d\'une commande hors liste', texte: 'essai d\'une commande hors liste' })
      if (!(r.status === 400 && sansBase(r))) { faute = { commande, r }; break }
    }
    c.ok('PT-7', faute === null, `${refus.length} commandes hors liste (dont reprise, reprendre, lever) → 400 sans appel à la base`, faute && `commande « ${faute.commande} » : ${uneErreur(faute.r) ?? `statut ${faute.r.status}`}, ${(faute.r.appelsBase ?? []).length} appel(s) à la base : 400 sans appel attendu`)
    const autres = [['commande numérique', { commande: 123 }], ['commande nulle', { commande: null }], ['commande en tableau', { commande: ['pause'] }], ['commande en objet', { commande: { pause: true } }], ['commande booléenne', { commande: true }], ['sans commande', { motif: 'x', texte: 'yyy' }], ['corps vide', {}], ['corps tableau', ['pause']], ['corps nul', null]]
    let f2 = null
    for (const [nom, corps] of autres) { const r = await entree(nom, corps); if (!(r.status === 400 && sansBase(r))) { f2 = { nom, r }; break } }
    if (!f2) for (const [nom, brut] of [['corps qui n\'est pas du JSON', 'pas du json'], ['corps vide (aucun octet)', '']]) { const r = await entree(nom, brut, { brut: true }); if (!(r.status === 400 && sansBase(r))) { f2 = { nom, r }; break } }
    c.ok('PT-7', f2 === null, `${autres.length + 2} corps mal formés ou sans commande valable → 400 sans appel à la base`, f2 && `${f2.nom} : ${uneErreur(f2.r) ?? `statut ${f2.r.status}`}, ${(f2.r.appelsBase ?? []).length} appel(s) à la base : 400 sans appel attendu`)
    for (const commande of ['pause', 'etat', 'consigne']) {
      const r = await entree(`commande ${commande} de la liste`, { commande, motif: 'essai de la liste fermée', texte: 'essai de la liste fermée' })
      c.ok('PT-7', r.status === 200 && (r.appelsBase ?? []).length >= 1, `« ${commande} » de la liste passe (200, la base est appelée)`, `« ${commande} » : ${uneErreur(r) ?? `statut ${r.status}`}, ${(r.appelsBase ?? []).length} appel(s) à la base : 200 attendu`)
    }
    const dangereuses = echanges.filter((e) => e.route === 'entree').flatMap((e) => e.rpcs).filter((n) => /^ops_(interrupteur|agent_pause)/.test(n))
    c.ok('PT-7', dangereuses.length === 0, 'aucun appel à ops_interrupteur* ou ops_agent_pause sur tous les cas de la route entree', `appel à ${dangereuses[0]} : la route ne peut ni lever ni poser autrement la pause`)
    c.fini('PT-7')
  }
}
