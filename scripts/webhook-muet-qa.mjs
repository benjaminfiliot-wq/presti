// scripts/webhook-muet-qa.mjs — le juge de la fiche 025-07 (« plus aucun paiement muet »), écrit par Claude Code (fiche 025-01,
// point 9). Il juge app/api/stripe/webhook/route.ts et lib/stripeAiguillage.ts ; il n'écrit que sous .orchestre/travail/.
//
//   WM-1  lib/stripeAiguillage.ts exporte aiguiller(session) → 'commande_site' | 'abonnement' | 'orphelin'. Importé par
//         scripts/ts-loader.mjs (processus à part, cwd = racine) et appelé sur 17 sessions aux identifiants tirés au hasard à
//         chaque passage : paiement avec metadata.type = commande_site → commande_site ; uid ou client_reference_id avec plan →
//         abonnement ; aucune métadonnée (vide, null, absente) → orphelin ; metadata.type = 'inconnu' → orphelin (amendé le
//         28/09, fiche 026-108 point 5 : la branche pack_pub de la fiche 026-112 rendrait sinon ce cas 'pack_pub' à tort) ;
//         plus les cas limites des conditions de route.ts:35-44 à 1620723 (voir les choix). Chaque réponse : la chaîne exacte,
//         rendue tout de suite (pas une promesse), la même au second appel, sur une session gelée (Object.freeze en profondeur :
//         l'aiguillage ne la modifie pas). Pure : aucun fetch pendant l'import et les appels (fetch remplacé par un piège), et
//         aucune dépendance réseau ou base dans son graphe d'importations à l'exécution (lecture statique : @supabase/*,
//         resend, nodemailer, @anthropic-ai/*, openai, next/*, http(s), net, tls, dns, child_process, undici, axios,
//         node-fetch, web-push ; ni fetch(, new Stripe(, XMLHttpRequest ou WebSocket dans ses fichiers locaux).
//   WM-2  Lecture statique de la route (commentaires ôtés) : aiguiller importé de lib/stripeAiguillage et appelé. Puis la route
//         est exécutée pour de vrai (POST importé par ts-loader, processus à part, sans réseau ni secret) avec des doublures de
//         lib/supabaseAdmin, lib/stripe (constructEvent rend l'événement envoyé), lib/email, lib/alertes (envoyerAlertes
//         enregistre), lib/siteCommandeServeur et next/server, et aiguiller enveloppé (appels comptés). Trois événements
//         checkout.session.completed : sans métadonnée ; metadata.type = pack_pub ; une vraie commande de site dont
//         l'aiguillage est forcé à « orphelin » par l'enveloppe (preuve que la route suit aiguiller, pas ses propres
//         conditions). Chacun → réponse 200, aiguiller appelé, exactement une alerte { motif: 'paiement', a: 'entreprise' }
//         dont la clé contient l'identifiant de l'événement, sujet et corps non vides qui portent le montant, la devise,
//         l'identifiant de session et le client (fiche 025-07 §3), aucun encaissement, aucune écriture dans artisans.
//   WM-3  Même exécution : une commande de site dont encaisserCommandeSite rend 'introuvable' → réponse non 2xx (Stripe rejoue)
//         et l'entreprise prévenue, sans alerte d'orphelin ; payée → 200, un encaissement ; un abonnement (uid + plan) → 200,
//         update de artisans avec plan et stripe_subscription_id sur son id. Et lib/stripe.ts et lib/abonnementSync.ts
//         inchangés : empreinte Git (git hash-object --path, fins de ligne normalisées) égale au blob de HEAD (du commit de
//         l'arbre pour un arbre extrait) et au blob de 1620723 ; sur un dépôt, git diff --quiet HEAD en plus.
//   WM-4  npm run typecheck (cwd = racine) en code 0, lancé avec --listFiles et un --tsBuildInfoFile sous .orchestre/travail/
//         (rien n'est écrit dans la racine) : chaque .ts et .tsx de app/ et lib/ de la racine, route.ts et
//         lib/stripeAiguillage.ts compris, doit figurer parmi les fichiers vérifiés (un script typecheck qui ne vérifie rien,
//         ou un projet vide, ne passe pas) ; ni @ts-nocheck, ni plus de @ts-ignore / @ts-expect-error qu'à 1620723 dans ces deux
//         fichiers, et tsconfig.json et le script typecheck ceux de 1620723 (commun.mjs defautsTypecheck ; relecture du 24/09).
//   WM-5  (fiche 025-22, défaut D04 de la relecture du 25/09) payé d'abord : une session n'est encaissée (commande de site) ou
//         servie (abonnement) que si payment_status le dit, et les paiements différés sont écoutés. Ajouté le 25/09 par Claude
//         Code (WM-3 existait déjà : la fiche disait « WM-3 », c'est WM-5).
//         a) Aiguillage (même sonde que WM-1) : commande de site 'unpaid' (prélèvement en cours), 'no_payment_required' ou
//            sans payment_status → ni 'commande_site' ni 'abonnement' ; abonnement 'unpaid' (par metadata.uid ou par
//            client_reference_id) → ni l'un ni l'autre ; abonnement 'no_payment_required' (0 € : /api/subscribe/route.ts:67
//            accepte les codes promo, un code à 100 % donne ce statut) → 'abonnement' ; payés → 'commande_site', 'abonnement'.
//            Toujours une chaîne, tout de suite, la même au second appel, session gelée.
//         b) Route (même sonde que WM-2 et WM-3, mêmes doublures) : checkout.session.completed 'unpaid' (commande de site ;
//            abonnement) → 2xx, aiguiller appelé, aucun encaissement, aucune écriture dans artisans, aucune alerte
//            d'orphelin (clé « orphelin:… » : un humain « servirait ou rembourserait » un paiement encore en cours) ;
//            completed d'un abonnement 'no_payment_required' → servi (update de artisans : plan, stripe_subscription_id) ;
//            checkout.session.async_payment_succeeded payé → le traitement de completed : commande encaissée une fois,
//            commande introuvable → hors 2xx et quelqu'un prévenu, abonnement servi, session sans métadonnée → l'alerte
//            d'orphelin de WM-2 (montant, devise, session, client) ; checkout.session.async_payment_failed (commande de site ;
//            abonnement) → 2xx, aucun encaissement, aucune écriture dans artisans, et l'entreprise prévenue (envoyerAlertes
//            à 'entreprise', ou notifierEntreprise) avec l'identifiant de la session.
//         c) Sondes du détecteur, à chaque passage : la route et l'aiguillage témoins (scripts/fixtures/025/temoins/
//            webhook-muet-qa/) sont posés dans une copie du projet (.orchestre/travail/webhook-muet-qa/sondes-wm5/) ; le
//            témoin propre doit passer a) et b) ; chaque mutation — commande de site encaissée sans être payée, abonnement
//            servi sans être payé, abonnement à 0 € refusé, async_payment_succeeded non écouté, async_payment_failed muet —
//            doit être vue. Une sonde qui ne s'applique plus au témoin est un échec (« sonde cassée »).
//
// --temoin : l'état « après » simulé. Le juge copie app/, lib/, package.json, tsconfig.json (et middleware.ts, next-env.d.ts
// s'ils existent) de la racine (le dépôt par défaut, ou --racine=) dans .orchestre/travail/webhook-muet-qa/temoin/, y pose les
// deux fichiers de scripts/fixtures/025/temoins/webhook-muet-qa/ sans leur suffixe .temoin (lib/stripeAiguillage.ts et
// app/api/stripe/webhook/route.ts conformes : ceux de HEAD 83ce3dd plus le correctif de 025-22), puis juge WM-1 à WM-5 sur
// cette copie. Il doit passer sur l'état actuel du dépôt. Le suffixe .temoin tient ces deux fichiers hors de `npm run typecheck` du dépôt (tsconfig.json inclut **/*.ts, donc
// scripts/fixtures/ : la route témoin importe un module qui n'existe pas encore dans lib/).
//
// Sur l'arbre de référence (1620723, avant 025-07) : WM-1 échoue (lib/stripeAiguillage.ts absent), WM-2 aussi (la route
// n'importe pas aiguiller, et un paiement orphelin ne déclenche aucune alerte) ; WM-3 et WM-4 passent. Sur HEAD 83ce3dd
// (avant 025-22) : WM-1 à WM-4 passent, WM-5 échoue (payment_status jamais lu, événements async non écoutés).
//
// Choix du juge (la fiche ne tranche pas) :
//   - WM-1, cas au-delà des quatre de la fiche, tirés des conditions de route.ts:35-44 à 1620723, que 025-07 §2 interdit de
//     changer : la commande de site exige mode = payment (en mode subscription → orphelin) et passe avant l'abonnement (uid +
//     plan + type commande_site → commande_site) ; uid = metadata.uid, sinon client_reference_id (uid vide mais
//     client_reference_id rempli → abonnement) ; un plan non vide suffit, quel que soit le mode (paiement avec uid + plan →
//     abonnement, comme aujourd'hui) ; uid sans plan, plan sans uid, chaînes vides, objet vide → orphelin. Les plans essayés
//     sont de vrais identifiants (essentiel, studio, signature), pour ne pas condamner un aiguillage qui les validerait.
//   - WM-1, « pure » : réponse synchrone et session non modifiée ; le paquet stripe lui-même reste permis (import de classe ou
//     de type), seul lib/stripe.ts, qui fabrique un client avec la clé secrète, est exclu (par new Stripe().
//   - WM-2, le montant se reconnaît en centimes (« 12345 ») ou en euros avec point ou virgule (« 123.45 », « 123,45 ») ; la
//     devise en « eur » comme mot entier, casse libre (« erreur » ne compte pas), ou « € » ; le client par l'identifiant cus_…,
//     l'e-mail ou le nom de customer_details (tous tirés au hasard). Les montants tirés vont de 100,01 € à 999,99 € (cinq
//     chiffres, sans chiffre collé autour : aucune année ni heure ne passe pour eux), dernier chiffre non nul (pas de
//     séparateur de milliers, pas de « 123,4 » ni « 123 € ») et absents des identifiants tirés. Une alerte envoyée par
//     after() de next/server est comptée (la doublure l'exécute tout de suite et le juge l'attend).
//   - WM-3, « inchangés » : comparés à HEAD comme le dit la consigne, ET à 1620723, le commit de référence de la série : un
//     changement de lib/stripe.ts déjà commité avant le lancement du juge serait invisible contre HEAD seul. Si une fiche
//     postérieure change ces fichiers à bon droit, ce critère est à revoir avec elle.
//   - WM-3, « lève une erreur (Stripe rejoue) » : toute réponse hors 2xx ; aujourd'hui 500 par le catch de la route.
//   - WM-4, le fichier .tsbuildinfo va dans .orchestre/travail/webhook-muet-qa/tsbuildinfo/<empreinte de la racine>, pour ne
//     rien écrire dans la racine (l'arbre de référence doit rester identique à son commit).
//   - Les processus de sonde tournent sans aucune variable d'environnement qui ressemble à un secret (STRIPE, SUPABASE,
//     RESEND, ANTHROPIC, OPENAI, VERCEL, SECRET, KEY, TOKEN, PASSWORD…), avec un faux STRIPE_WEBHOOK_SECRET, et fetch piégé :
//     rien ne peut partir vers Stripe, Supabase ou Resend. Aucun --reel.
//
// Usage : node scripts/webhook-muet-qa.mjs [--racine=<dossier>] [--temoin] [--critere=WM-1,WM-5]
//   --critere : ne juge que ces critères (WM-4, le typecheck, est le seul lourd).
//   Sortie : une ligne PASS/FAIL par critère (WM-1 à WM-5), puis « webhook-muet-qa : PASS » ou « … : FAIL — ids » ; code 0
//   seulement si tout est vert, 2 si les options sont invalides. Sondes et résultats bruts : .orchestre/travail/webhook-muet-qa/.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  R, FIXTURES, TRAVAIL, REFERENCE_COMMIT, lireOptionsOuQuitter, creerSortie, preparerTemoin, dossierTravail, exigerSousTravail,
  lancer, git, estRacineGit, revParse, lsTree, commitDeReference, listerFichiers, lireOuNull, fichierNonVide, defautsTypecheck,
} from './fixtures/025/commun.mjs'

export const JUGE = 'webhook-muet-qa'
export const IDS = ['WM-1', 'WM-2', 'WM-3', 'WM-4', 'WM-5']
const ROUTE = 'app/api/stripe/webhook/route.ts'
const AIGUILLAGE = 'lib/stripeAiguillage.ts'
const INCHANGES = ['lib/stripe.ts', 'lib/abonnementSync.ts']
const TEMOIN_SOURCES = path.join(FIXTURES, 'temoins', JUGE)
const TEMOIN_ATTENDUS = [`${AIGUILLAGE}.temoin`, `${ROUTE}.temoin`]
const CHARGEUR = path.join(R, 'scripts', 'ts-loader.mjs')
const VOIES = ['commande_site', 'abonnement', 'orphelin']
const PLANS_REELS = ['essentiel', 'studio', 'signature']

const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const empreinte = (x) => crypto.createHash('sha1').update(String(x)).digest('hex').slice(0, 10)
const hasard = (n = 12) => crypto.randomBytes(n).toString('hex').slice(0, n)
const posix = (p) => p.split(path.sep).join('/')
const cleChemin = (p) => { const x = path.resolve(p).split(path.sep).join('/'); return process.platform === 'win32' ? x.toLowerCase() : x }

// ── Lecture statique ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** Le source sans ses commentaires (// et /* *\/), chaînes et gabarits gardés ; les retours à la ligne sont conservés. */
export function sansCommentaires(src) {
  let out = '', i = 0
  const n = src.length
  while (i < n) {
    const c = src[i], d = src[i + 1]
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') { const j = src.indexOf('*/', i + 2); const fin = j < 0 ? n : j + 2; out += src.slice(i, fin).replace(/[^\n]/g, ' '); i = fin; continue }
    if (c === '"' || c === '\'') {
      let j = i + 1
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++ }
      out += src.slice(i, j + 1); i = j + 1; continue
    }
    if (c === '`') {
      let j = i + 1, prof = 0
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue }
        if (prof === 0 && src[j] === '`') break
        if (src[j] === '$' && src[j + 1] === '{') { prof++; j += 2; continue }
        if (prof > 0 && src[j] === '{') prof++
        else if (prof > 0 && src[j] === '}') prof--
        j++
      }
      out += src.slice(i, j + 1); i = j + 1; continue
    }
    out += c; i++
  }
  return out
}
/** Les importations d'un source sans commentaires : [{ spec, clause, typeSeul, dynamique }]. */
export function importsDe(code) {
  const out = []
  const statique = /\b(import|export)\s+(type\s+)?(\*\s*(?:as\s+[\w$]+)?|[\w$]+(?:\s*,\s*(?:\{[^}]*\}|\*\s*as\s+[\w$]+))?|\{[^}]*\})\s*from\s*(['"])([^'"\n]+)\4/g
  for (const m of code.matchAll(statique)) {
    const clause = m[3]
    const accolades = /^\{([^}]*)\}$/.exec(clause.trim())
    const noms = accolades ? accolades[1].split(',').map((x) => x.trim()).filter(Boolean) : null
    const typeSeul = !!m[2] || (noms !== null && noms.length > 0 && noms.every((x) => /^type\s/.test(x)))
    out.push({ spec: m[5], clause, typeSeul, dynamique: false })
  }
  for (const m of code.matchAll(/\bimport\s*(['"])([^'"\n]+)\1/g)) out.push({ spec: m[2], clause: '', typeSeul: false, dynamique: false })
  for (const m of code.matchAll(/\b(?:import|require)\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g)) out.push({ spec: m[2], clause: '', typeSeul: false, dynamique: true })
  return out
}
const EXTERNES_INTERDITS = [/^@supabase\//, /^resend$/, /^nodemailer$/, /^@anthropic-ai\//, /^openai$/, /^next(\/|$)/, /^(node:)?(http|https|http2|net|tls|dns|dgram|child_process)$/, /^undici$/, /^axios$/, /^node-fetch$/, /^web-push$/]
const CODE_INTERDIT = [[/\bfetch\s*\(/, 'fetch('], [/\bnew\s+Stripe\s*\(/, 'new Stripe('], [/\bXMLHttpRequest\b/, 'XMLHttpRequest'], [/\bWebSocket\b/, 'WebSocket']]
function resoudreLocal(racine, depuis, spec) {
  let base
  if (spec.startsWith('@/')) base = path.join(racine, spec.slice(2))
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(depuis), spec)
  else return null
  for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) { try { if (fs.statSync(c).isFile()) return c } catch { /* suivant */ } }
  return undefined
}
/** Graphe des importations à l'exécution depuis `fichier` (locaux suivis, paquets relevés) → { locaux[], externes[], defauts[] } */
export function grapheExecution(racine, fichier) {
  const vus = new Set(), externes = new Set(), defauts = []
  const pile = [path.resolve(fichier)]
  while (pile.length) {
    const f = pile.pop()
    if (vus.has(f)) continue
    vus.add(f)
    const code = sansCommentaires(fs.readFileSync(f, 'utf8'))
    const rel = posix(path.relative(racine, f))
    for (const [re, nom] of CODE_INTERDIT) if (re.test(code)) defauts.push(`${rel} contient ${nom}`)
    for (const imp of importsDe(code)) {
      if (imp.typeSeul) continue
      const local = resoudreLocal(racine, f, imp.spec)
      if (local === null) { externes.add(imp.spec); if (EXTERNES_INTERDITS.some((re) => re.test(imp.spec))) defauts.push(`${rel} importe « ${imp.spec} » à l'exécution`) }
      else if (local === undefined) defauts.push(`${rel} importe « ${imp.spec} », introuvable`)
      else pile.push(local)
    }
  }
  return { locaux: [...vus].map((f) => posix(path.relative(racine, f))), externes: [...externes], defauts }
}

// ── Sondes (processus à part, sans secret, fetch piégé) ─────────────────────────────────────────────────────────────────────
function envSansSecret(extra = {}) {
  const env = {}
  for (const [k, v] of Object.entries(process.env)) if (!/(SECRET|KEY|TOKEN|PASSWORD|PASSWD|STRIPE|SUPABASE|RESEND|ANTHROPIC|OPENAI|VERCEL|DATABASE|DIRECT_URL|PRESTI_ALERTES|EMAIL_ENTREPRISE|CRON|WEBHOOK)/i.test(k)) env[k] = v
  return { ...env, ...extra }
}
/** Écrit puis lance une sonde : node --experimental-strip-types --import ts-loader [--import crochets] sonde config.json, cwd = racine. */
function lancerSonde(racine, script, source, config, { crochets } = {}) {
  fs.writeFileSync(exigerSousTravail(script), source)
  const fichierConfig = exigerSousTravail(`${script}.config.json`)
  const sortie = exigerSousTravail(`${script}.sortie.json`)
  fs.rmSync(sortie, { force: true })
  const nonce = hasard(16)
  fs.writeFileSync(fichierConfig, JSON.stringify({ ...config, sortie, nonce }))
  const args = ['--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(CHARGEUR).href]
  if (crochets) args.push('--import', pathToFileURL(crochets).href)
  args.push(script, fichierConfig)
  // spawnSync direct : `lancer` pose env PAR-DESSUS process.env ; ici l'environnement est remplacé entier (aucun secret hérité).
  // faux secret tiré au hasard à chaque passage : une route ne peut pas reconnaître le juge à sa valeur
  const p = spawnSync(process.execPath, args, { cwd: racine, timeout: 120_000, env: envSansSecret({ STRIPE_WEBHOOK_SECRET: `whsec_${hasard(32)}` }), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true })
  const r = { code: p.status, erreur: p.error ? premiereLigne(p.error) : null, sortie: `${p.stdout || ''}${p.stderr || ''}`.trim() }
  let res = null
  const brut = lireOuNull(sortie)
  if (brut && brut.length) { try { res = JSON.parse(brut.toString('utf8')) } catch { res = null } }
  if (!res || res.nonce !== nonce) return { ok: false, erreur: `sonde ${path.basename(script)} sans résultat (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) : ${court(r.sortie.split('\n').filter((l) => l.trim()).slice(-3).join(' | '), 300)}`, journal: r.sortie }
  return { ok: true, res, journal: r.sortie }
}

const SONDE_AIGUILLAGE = `// Sonde de webhook-muet-qa (WM-1), écrite par le juge. Importe lib/stripeAiguillage.ts et l'appelle sur les cas du juge.
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const reseau = []
globalThis.fetch = async (u) => { reseau.push(String(u && u.url ? u.url : u)); throw new Error('réseau coupé par webhook-muet-qa') }
const msg = (e) => String((e && e.message) || e).split('\\n')[0].slice(0, 200)
const geler = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) geler(v) } return o }
const out = { nonce: config.nonce, erreurImport: null, typeAiguiller: null, exports: [], cas: [], reseau }
try {
  const mod = await import(pathToFileURL(config.module).href)
  out.exports = Object.keys(mod)
  out.typeAiguiller = typeof mod.aiguiller
  if (typeof mod.aiguiller === 'function') {
    for (const c of config.cas) {
      const r = { nom: c.nom, sortie: null, type: null, promesse: false, erreur: null, seconde: null }
      try {
        let v = mod.aiguiller(geler(structuredClone(c.session)))
        if (v && typeof v.then === 'function') { r.promesse = true; v = await v }
        r.sortie = typeof v === 'string' ? v : null; r.type = typeof v
        let v2 = mod.aiguiller(geler(structuredClone(c.session)))
        if (v2 && typeof v2.then === 'function') v2 = await v2
        r.seconde = typeof v2 === 'string' ? v2 : String(typeof v2)
      } catch (e) { r.erreur = msg(e) }
      out.cas.push(r)
    }
  }
} catch (e) { out.erreurImport = msg(e) }
fs.writeFileSync(config.sortie, JSON.stringify(out, null, 1))
process.exit(0)
`

const SONDE_ROUTE = `// Sonde de webhook-muet-qa (WM-2, WM-3), écrite par le juge. Importe la route avec ses doublures et lui envoie les événements.
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const reseau = []
globalThis.fetch = async (u) => { reseau.push(String(u && u.url ? u.url : u)); throw new Error('réseau coupé par webhook-muet-qa') }
const msg = (e) => String((e && e.message) || e).split('\\n')[0].slice(0, 200)
const W = globalThis.__wm = { base: [], alertes: [], encaisser: [], notifs: [], emails: [], stripe: [], aiguiller: [], enAttente: [], forcer: null, reponseEncaisser: 'payee', artisan: null }
const out = { nonce: config.nonce, erreurImport: null, exports: [], scenarios: [], reseau }
const delai = (ms) => new Promise((_, ko) => setTimeout(() => ko(new Error('POST sans réponse après ' + ms + ' ms')), ms))
try {
  const mod = await import(pathToFileURL(config.route).href)
  out.exports = Object.keys(mod)
  if (typeof mod.POST !== 'function') out.erreurImport = 'la route n’exporte pas POST'
  else for (const sc of config.scenarios) {
    Object.assign(W, { base: [], alertes: [], encaisser: [], notifs: [], emails: [], stripe: [], aiguiller: [], enAttente: [], forcer: sc.forcer || null, reponseEncaisser: sc.encaisser || 'payee', artisan: sc.artisan || null })
    const debut = reseau.length
    const r = { nom: sc.nom, statut: null, corps: null, erreur: null }
    try {
      const req = new Request('http://127.0.0.1/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=' + Math.floor(Date.now() / 1000) + ',v1=' + config.nonce }, body: JSON.stringify(sc.evenement) })
      const res = await Promise.race([mod.POST(req), delai(20000)])
      r.statut = res && typeof res.status === 'number' ? res.status : null
      r.corps = res && typeof res.text === 'function' ? (await res.text()).slice(0, 300) : null
    } catch (e) { r.erreur = msg(e) }
    await Promise.allSettled(W.enAttente)
    await new Promise((ok) => setTimeout(ok, 50))
    Object.assign(r, { base: W.base, alertes: W.alertes, encaisser: W.encaisser, notifs: W.notifs, emails: W.emails, stripe: W.stripe, aiguiller: W.aiguiller, reseau: reseau.slice(debut) })
    out.scenarios.push(JSON.parse(JSON.stringify(r)))
  }
} catch (e) { out.erreurImport = msg(e) }
fs.writeFileSync(config.sortie, JSON.stringify(out, null, 1))
process.exit(0)
`

/** Écrit les doublures et le crochet de résolution de la sonde de route, pour la racine donnée. → chemin du fichier d'enregistrement */
function ecrireDoublures(dossier, racine) {
  const D = path.join(dossier, 'doublures')
  fs.mkdirSync(D, { recursive: true })
  const url = (rel) => pathToFileURL(path.join(racine, rel)).href
  const reel = (rel) => JSON.stringify(`${url(rel)}?reel`)
  const commun = `const E = () => globalThis.__wm\nconst copie = (x) => { try { return JSON.parse(JSON.stringify(x ?? null)) } catch { return String(x) } }\n`
  const fichiers = {
    'next-server.mjs': `${commun}export class NextResponse extends Response {
  static json(corps, init = {}) { const h = new Headers(init.headers); if (!h.has('content-type')) h.set('content-type', 'application/json'); return new NextResponse(JSON.stringify(corps), { ...init, headers: h }) }
  static redirect(u, init) { const status = typeof init === 'number' ? init : (init && init.status) || 307; return new NextResponse(null, { status, headers: { location: String(u) } }) }
  static next(init) { return new NextResponse(null, init) }
}
export class NextRequest extends Request {}
export function after(tache) { try { const p = typeof tache === 'function' ? tache() : tache; if (p && typeof p.then === 'function') E().enAttente.push(p) } catch (e) { E().enAttente.push(Promise.reject(e)) } }
export function userAgent() { return {} }
`,
    'supabaseAdmin.mjs': `export * from ${reel('lib/supabaseAdmin.ts')}
${commun}function reponse(op) {
  if (op.action === 'select' && op.table === 'artisans' && E().artisan) return { data: op.unique ? E().artisan : [E().artisan], error: null, count: 1 }
  return { data: op.unique ? null : [], error: null, count: 0 }
}
function requete(table) {
  const op = { table, action: 'select', colonnes: null, payload: null, filtres: [], unique: false }
  E().base.push(op)
  const p = new Proxy(function () {}, {
    get(_, cle) {
      if (typeof cle === 'symbol') return undefined
      if (cle === 'then') return (ok, ko) => Promise.resolve(reponse(op)).then(ok, ko)
      if (cle === 'maybeSingle' || cle === 'single') return () => { op.unique = true; return Promise.resolve(reponse(op)) }
      if (cle === 'update' || cle === 'insert' || cle === 'upsert') return (payload) => { op.action = cle; op.payload = copie(payload); return p }
      if (cle === 'delete') return () => { op.action = 'delete'; return p }
      if (cle === 'select') return (c) => { if (op.action === 'select') op.colonnes = c || '*'; return p }
      return (...args) => { op.filtres.push([cle, ...args.map(copie)]); return p }
    },
  })
  return p
}
const neutre = () => new Proxy(function () {}, {
  get(_, cle) { if (cle === 'then' || typeof cle === 'symbol') return undefined; return neutre() },
  apply() { return Promise.resolve({ data: null, error: null }) },
})
export const supabaseAdmin = new Proxy({}, {
  get(_, cle) {
    if (cle === 'from') return (t) => requete(t)
    if (cle === 'rpc') return (nom, args) => { const p = requete('rpc:' + nom); E().base[E().base.length - 1].action = 'rpc'; E().base[E().base.length - 1].payload = copie(args); return p }
    if (cle === 'then' || typeof cle === 'symbol') return undefined
    return neutre()
  },
})
`,
    'stripe.mjs': `export * from ${reel('lib/stripe.ts')}
${commun}const generique = (chemin) => new Proxy(function () {}, {
  get(_, cle) { if (cle === 'then' || typeof cle === 'symbol') return undefined; return generique([...chemin, cle]) },
  apply(_, __, args) { E().stripe.push([chemin.join('.'), ...args.map(copie)]); return Promise.resolve({ id: 'factice_' + chemin.join('_'), object: chemin[0], data: [], email: null }) },
})
function constructEvent(brut, sig, secret) {
  if (!sig || !secret || secret !== process.env.STRIPE_WEBHOOK_SECRET) throw new Error('signature refusée par la doublure de Stripe')
  return JSON.parse(typeof brut === 'string' ? brut : Buffer.from(brut).toString('utf8'))
}
export const stripe = new Proxy({}, {
  get(_, cle) {
    if (cle === 'webhooks') return { constructEvent, constructEventAsync: async (...a) => constructEvent(...a) }
    if (cle === 'then' || typeof cle === 'symbol') return undefined
    return generique([cle])
  },
})
`,
    'email.mjs': `export * from ${reel('lib/email.ts')}
${commun}export async function sendEmail(o) { E().emails.push(copie(o)); return { ok: true, id: 'factice' } }
export async function notifierEntreprise(sujet, corps) { E().notifs.push({ sujet: String(sujet), corps: String(corps) }); return { ok: true, id: 'factice' } }
`,
    'alertes.mjs': `export * from ${reel('lib/alertes.ts')}
${commun}export async function envoyerAlertes(alertes) { E().alertes.push(copie(alertes)); return Array.isArray(alertes) ? alertes.length : 0 }
`,
    'siteCommandeServeur.mjs': `export * from ${reel('lib/siteCommandeServeur.ts')}
${commun}export async function encaisserCommandeSite(s) { E().encaisser.push({ id: s && s.id ? s.id : null, commande: s && s.metadata ? s.metadata.commande_id || null : null }); return E().reponseEncaisser }
`,
    'stripeAiguillage.mjs': `import * as reel from ${reel(AIGUILLAGE)}
export * from ${reel(AIGUILLAGE)}
${commun}export function aiguiller(...args) {
  const w = E()
  const force = w.forcer
  const sortie = force || reel.aiguiller(...args)
  w.aiguiller.push({ session: args[0] && args[0].id ? args[0].id : null, sortie, force: !!force })
  return sortie
}
`,
  }
  for (const [nom, contenu] of Object.entries(fichiers)) fs.writeFileSync(path.join(D, nom), contenu)
  const mocks = {}
  const cible = (rel) => cleChemin(path.join(racine, rel))
  mocks[cible('lib/supabaseAdmin.ts')] = pathToFileURL(path.join(D, 'supabaseAdmin.mjs')).href
  mocks[cible('lib/stripe.ts')] = pathToFileURL(path.join(D, 'stripe.mjs')).href
  mocks[cible('lib/email.ts')] = pathToFileURL(path.join(D, 'email.mjs')).href
  mocks[cible('lib/alertes.ts')] = pathToFileURL(path.join(D, 'alertes.mjs')).href
  mocks[cible('lib/siteCommandeServeur.ts')] = pathToFileURL(path.join(D, 'siteCommandeServeur.mjs')).href
  mocks[cible(AIGUILLAGE)] = pathToFileURL(path.join(D, 'stripeAiguillage.mjs')).href
  const crochets = path.join(dossier, 'crochets.mjs')
  fs.writeFileSync(crochets, `// Crochet de résolution de la sonde de route (webhook-muet-qa) : les modules à entrées-sorties sont remplacés par leurs doublures.
import { fileURLToPath } from 'node:url'
let DOUBLURES = {}, NEXT_SERVER = null
export async function initialize(data) { DOUBLURES = data.doublures; NEXT_SERVER = data.nextServer }
const cle = (u) => { try { const p = fileURLToPath(u).split('\\\\').join('/'); return process.platform === 'win32' ? p.toLowerCase() : p } catch { return null } }
export async function resolve(spec, ctx, next) {
  if (spec === 'next/server' || spec === 'next/server.js') return { url: NEXT_SERVER, shortCircuit: true }
  const r = await next(spec, ctx)
  if (r.url.startsWith('file:') && !r.url.includes('?reel')) { const d = DOUBLURES[cle(r.url.split('?')[0])]; if (d) return { url: d, shortCircuit: true } }
  return r
}
`)
  const enregistrer = path.join(dossier, 'enregistrer.mjs')
  fs.writeFileSync(enregistrer, `import { register } from 'node:module'
register(${JSON.stringify(pathToFileURL(crochets).href)}, { data: ${JSON.stringify({ doublures: mocks, nextServer: pathToFileURL(path.join(D, 'next-server.mjs')).href })} })
`)
  return enregistrer
}

// ── Les cas ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Les sessions de WM-1, identifiants tirés au hasard à chaque passage. → [{ nom, session, attendu }] */
export function casAiguillage() {
  const uid = crypto.randomUUID(), commande = crypto.randomUUID()
  const plan = () => PLANS_REELS[crypto.randomInt(PLANS_REELS.length)]
  const base = (x) => ({ id: `cs_test_${hasard(24)}`, object: 'checkout.session', amount_total: 1000 + crypto.randomInt(98_000), currency: 'eur', customer: null, client_reference_id: null, payment_status: 'paid', status: 'complete', ...x })
  return [
    { nom: 'commande de site (paiement, metadata.type = commande_site, uid, commande_id)', attendu: 'commande_site', session: base({ mode: 'payment', metadata: { uid, type: 'commande_site', commande_id: commande } }) },
    { nom: 'commande de site sans uid', attendu: 'commande_site', session: base({ mode: 'payment', metadata: { type: 'commande_site', commande_id: commande } }) },
    { nom: 'commande de site avec uid et plan (la commande passe avant, route.ts:40)', attendu: 'commande_site', session: base({ mode: 'payment', metadata: { uid, plan: plan(), type: 'commande_site', commande_id: commande } }) },
    { nom: 'abonnement par metadata.uid + plan', attendu: 'abonnement', session: base({ mode: 'subscription', metadata: { uid, plan: plan(), credits: '80' }, subscription: `sub_${hasard(14)}` }) },
    { nom: 'abonnement par client_reference_id + plan', attendu: 'abonnement', session: base({ mode: 'subscription', client_reference_id: uid, metadata: { plan: plan() } }) },
    { nom: 'abonnement : metadata.uid vide, client_reference_id rempli', attendu: 'abonnement', session: base({ mode: 'subscription', client_reference_id: uid, metadata: { uid: '', plan: plan() } }) },
    { nom: 'abonnement en mode paiement (uid + plan : route.ts:44 ne regarde pas le mode)', attendu: 'abonnement', session: base({ mode: 'payment', metadata: { uid, plan: plan() } }) },
    { nom: 'aucune métadonnée (objet vide)', attendu: 'orphelin', session: base({ mode: 'payment', metadata: {} }) },
    { nom: 'metadata null', attendu: 'orphelin', session: base({ mode: 'payment', metadata: null }) },
    { nom: 'metadata absente', attendu: 'orphelin', session: (() => { const s = base({ mode: 'payment' }); delete s.metadata; return s })() },
    { nom: "metadata.type = 'inconnu' (aucune branche connue)", attendu: 'orphelin', session: base({ mode: 'payment', metadata: { type: 'inconnu' } }) },
    { nom: 'metadata.type = pack_pub avec uid, sans plan', attendu: 'orphelin', session: base({ mode: 'payment', metadata: { type: 'pack_pub', uid } }) },
    { nom: 'commande_site en mode subscription (route.ts:40 exige payment)', attendu: 'orphelin', session: base({ mode: 'subscription', metadata: { type: 'commande_site', commande_id: commande } }) },
    { nom: 'uid sans plan', attendu: 'orphelin', session: base({ mode: 'subscription', metadata: { uid } }) },
    { nom: 'plan sans uid ni client_reference_id', attendu: 'orphelin', session: base({ mode: 'subscription', metadata: { plan: plan() } }) },
    { nom: 'uid et plan vides, client_reference_id vide', attendu: 'orphelin', session: base({ mode: 'subscription', client_reference_id: '', metadata: { uid: '', plan: '' } }) },
    { nom: 'session réduite à {}', attendu: 'orphelin', session: {} },
  ]
}
const evenement = (session, type = 'checkout.session.completed') => ({ id: `evt_juge_${hasard(20)}`, object: 'event', type, livemode: false, created: Math.floor(Date.now() / 1000), data: { object: session } })
/** Les scénarios de la sonde de route (WM-2 : orphelin, pack_pub, force ; WM-3 : introuvable, payee, abonnement). */
/** Le montant (centimes) est-il écrit dans `t` : « 12345 », « 123.45 » ou « 123,45 », sans chiffre collé avant ni après ? */
export function montantPresent(t, centimes) {
  const echap = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const euros = (centimes / 100).toFixed(2)
  return [String(centimes), euros, euros.replace('.', ',')].some((f) => new RegExp(`(?<![0-9])${echap(f)}(?![0-9])`).test(t))
}
export function scenariosRoute() {
  const uid = crypto.randomUUID(), commande = crypto.randomUUID()
  // Une session et son événement. Montant de 100,01 € à 999,99 € (cinq chiffres : aucune année ni heure ne l'imite), dernier
  // chiffre non nul (123,45 s'écrit pareil en toFixed, String ou Intl), et absent de tous les identifiants tirés (session,
  // client, métadonnées, événement) : sa présence dans l'alerte ne peut venir que du montant.
  const scenario = (x, type) => {
    const s = { id: `cs_test_${hasard(24)}`, object: 'checkout.session', amount_total: 0, currency: 'eur', customer: `cus_${hasard(14)}`, customer_details: { email: `client-${hasard(6)}@exemple.invalid`, name: `Client ${hasard(6)}` }, client_reference_id: null, payment_status: 'paid', status: 'complete', subscription: null, ...x }
    const ev = evenement(s, type)
    const autres = [s.id, s.customer, s.customer_details.email, s.customer_details.name, JSON.stringify(s.metadata ?? null), String(s.subscription), ev.id, String(ev.created)]
    do s.amount_total = 10_001 + crypto.randomInt(89_999)
    while (s.amount_total % 10 === 0 || autres.some((a) => montantPresent(a, s.amount_total)))
    return ev
  }
  const artisan = { id: uid, nom: 'Artisan témoin', email: 'artisan-temoin@exemple.invalid', metier: 'menuisier', credits: 0, stripe_subscription_id: null }
  const abo = `sub_${hasard(14)}`
  return [
    { nom: 'orphelin', critere: 'WM-2', evenement: scenario({ mode: 'payment', metadata: {} }) },
    { nom: 'pack_pub', critere: 'WM-2', evenement: scenario({ mode: 'payment', metadata: { type: 'pack_pub', uid } }) },
    { nom: 'forcé orphelin', critere: 'WM-2', forcer: 'orphelin', encaisser: 'payee', evenement: scenario({ mode: 'payment', metadata: { uid, type: 'commande_site', commande_id: commande } }) },
    { nom: 'commande introuvable', critere: 'WM-3', encaisser: 'introuvable', evenement: scenario({ mode: 'payment', metadata: { uid, type: 'commande_site', commande_id: commande } }) },
    { nom: 'commande payée', critere: 'WM-3', encaisser: 'payee', evenement: scenario({ mode: 'payment', metadata: { uid, type: 'commande_site', commande_id: commande } }) },
    { nom: 'abonnement', critere: 'WM-3', artisan, evenement: scenario({ mode: 'subscription', metadata: { uid, plan: 'studio', credits: '80' }, subscription: abo }) },
    // WM-5 (025-22, D04) : payé d'abord, paiements différés écoutés. `paiement` dit ce qui est attendu (defautsPaiement).
    ...scenariosPaiement(scenario, { uid, commande, artisan }),
  ]
}
const SUCCES_DIFFERE = 'checkout.session.async_payment_succeeded'
const ECHEC_DIFFERE = 'checkout.session.async_payment_failed'
/** Les scénarios de route de WM-5 : { nom, critere: 'WM-5', paiement: rien | abonnement | encaisse | introuvable | orphelin | echec, … } */
function scenariosPaiement(scenario, { uid, commande, artisan }) {
  const site = (ps, type) => scenario({ mode: 'payment', payment_status: ps, metadata: { uid, type: 'commande_site', commande_id: commande } }, type)
  const abonnement = (ps, type) => scenario({ mode: 'subscription', payment_status: ps, metadata: { uid, plan: 'studio', credits: '80' }, subscription: `sub_${hasard(14)}` }, type)
  return [
    { nom: 'completed, commande de site en attente de paiement (unpaid)', critere: 'WM-5', paiement: 'rien', encaisser: 'payee', evenement: site('unpaid') },
    { nom: 'completed, abonnement en attente de paiement (unpaid)', critere: 'WM-5', paiement: 'rien', artisan, evenement: abonnement('unpaid') },
    { nom: 'completed, abonnement à 0 € (code promo à 100 %, no_payment_required)', critere: 'WM-5', paiement: 'abonnement', artisan, evenement: abonnement('no_payment_required') },
    { nom: 'async_payment_succeeded, commande de site payée', critere: 'WM-5', paiement: 'encaisse', encaisser: 'payee', evenement: site('paid', SUCCES_DIFFERE) },
    { nom: 'async_payment_succeeded, commande introuvable', critere: 'WM-5', paiement: 'introuvable', encaisser: 'introuvable', evenement: site('paid', SUCCES_DIFFERE) },
    { nom: 'async_payment_succeeded, abonnement payé', critere: 'WM-5', paiement: 'abonnement', artisan, evenement: abonnement('paid', SUCCES_DIFFERE) },
    { nom: 'async_payment_succeeded sans métadonnée', critere: 'WM-5', paiement: 'orphelin', evenement: scenario({ mode: 'payment', metadata: {} }, SUCCES_DIFFERE) },
    { nom: 'async_payment_failed, commande de site', critere: 'WM-5', paiement: 'echec', encaisser: 'payee', evenement: site('unpaid', ECHEC_DIFFERE) },
    { nom: 'async_payment_failed, abonnement', critere: 'WM-5', paiement: 'echec', artisan, evenement: abonnement('unpaid', ECHEC_DIFFERE) },
  ]
}
/** Les sessions de WM-5 a) (aiguillage) : { nom, session, attendu } ou { nom, session, interdit[] }. */
export function casPaiement() {
  const uid = crypto.randomUUID(), commande = crypto.randomUUID()
  const plan = () => PLANS_REELS[crypto.randomInt(PLANS_REELS.length)]
  const base = (x) => ({ id: `cs_test_${hasard(24)}`, object: 'checkout.session', amount_total: 1000 + crypto.randomInt(98_000), currency: 'eur', customer: null, client_reference_id: null, status: 'complete', ...x })
  const site = (ps) => base({ mode: 'payment', payment_status: ps, metadata: { uid, type: 'commande_site', commande_id: commande } })
  const abo = (ps) => base({ mode: 'subscription', payment_status: ps, metadata: { uid, plan: plan(), credits: '80' }, subscription: `sub_${hasard(14)}` })
  const PAS_SERVI = ['commande_site', 'abonnement']
  return [
    { nom: 'commande de site, prélèvement en cours (unpaid)', interdit: PAS_SERVI, session: site('unpaid') },
    { nom: 'commande de site, no_payment_required', interdit: PAS_SERVI, session: site('no_payment_required') },
    { nom: 'commande de site sans payment_status', interdit: PAS_SERVI, session: (() => { const s = site('paid'); delete s.payment_status; return s })() },
    { nom: 'abonnement par metadata.uid, prélèvement en cours (unpaid)', interdit: PAS_SERVI, session: abo('unpaid') },
    { nom: 'abonnement par client_reference_id, unpaid', interdit: PAS_SERVI, session: base({ mode: 'subscription', payment_status: 'unpaid', client_reference_id: uid, metadata: { plan: plan() } }) },
    { nom: 'abonnement à 0 € (no_payment_required)', attendu: 'abonnement', session: abo('no_payment_required') },
    { nom: 'commande de site payée', attendu: 'commande_site', session: site('paid') },
    { nom: 'abonnement payé', attendu: 'abonnement', session: abo('paid') },
  ]
}

// ── WM-1 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function jugerAiguillage(racine, dossier) {
  const echecs = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, resume })
  const f = path.join(racine, AIGUILLAGE)
  if (!fs.existsSync(f)) { echecs.push(`${AIGUILLAGE} absent`); return fin('') }
  if (!fs.readFileSync(f, 'utf8').trim()) { echecs.push(`${AIGUILLAGE} vide`); return fin('') }
  const g = grapheExecution(racine, f)
  for (const d of g.defauts) echecs.push(`impur : ${d}`)
  const cas = casAiguillage()
  const s = lancerSonde(racine, path.join(dossier, 'sonde-aiguillage.mjs'), SONDE_AIGUILLAGE, { module: f, cas: cas.map(({ nom, session }) => ({ nom, session })) })
  if (!s.ok) { echecs.push(s.erreur); return fin('') }
  const r = s.res
  if (r.erreurImport) { echecs.push(`import de ${AIGUILLAGE} en erreur : ${r.erreurImport}`); return fin('') }
  if (r.typeAiguiller !== 'function') { echecs.push(`${AIGUILLAGE} n'exporte pas aiguiller (exports : ${r.exports.join(', ') || 'aucun'})`); return fin('') }
  if (r.reseau.length) echecs.push(`impur : ${r.reseau.length} appel(s) fetch (${r.reseau.slice(0, 2).join(', ')})`)
  if (r.cas.length !== cas.length) echecs.push(`${r.cas.length} réponse(s) pour ${cas.length} cas`)
  const compte = Object.fromEntries(VOIES.map((v) => [v, 0]))
  cas.forEach((c, i) => {
    const x = r.cas[i]
    if (!x) return
    if (x.erreur) { echecs.push(`« ${c.nom} » : aiguiller lève « ${x.erreur} »`); return }
    if (x.promesse) echecs.push(`« ${c.nom} » : aiguiller rend une promesse, une chaîne attendue tout de suite`)
    if (x.sortie !== c.attendu) { echecs.push(`« ${c.nom} » : ${x.sortie === null ? `${x.type}` : `« ${x.sortie} »`}, « ${c.attendu} » attendu`); return }
    if (x.seconde !== x.sortie) { echecs.push(`« ${c.nom} » : second appel « ${x.seconde} », le premier « ${x.sortie} »`); return }
    compte[c.attendu]++
  })
  return fin(`aiguiller exporté ; ${cas.length} sessions aux identifiants tirés au hasard (${VOIES.map((v) => `${v} ${compte[v]}`).join(', ')}) ; réponse synchrone, stable, session gelée intacte ; aucun fetch ; graphe d'exécution : ${g.locaux.length} fichier(s) local(aux), paquets ${g.externes.length ? g.externes.join(', ') : 'aucun'}`)
}

// ── WM-2 et WM-3 (route) ──────────────────────────────────────────────────────────────────────────────────────────────────
/** Lecture statique : aiguiller importé de lib/stripeAiguillage et appelé. → défauts[] */
export function lectureStatiqueRoute(code) {
  const d = []
  const imp = importsDe(code).find((i) => !i.typeSeul && /(^|\/)lib\/stripeAiguillage(\.ts)?$/.test(i.spec))
  if (!imp) { d.push('la route n\'importe pas lib/stripeAiguillage'); return d }
  let appel = null
  const nomme = /\baiguiller(?:\s+as\s+([\w$]+))?\b/.exec(imp.clause)
  const espace = /\*\s*as\s+([\w$]+)/.exec(imp.clause)
  if (nomme && /\{/.test(imp.clause)) appel = new RegExp(`(?<![\\w$.])${(nomme[1] || 'aiguiller').replace(/\$/g, '\\$')}\\s*\\(`)
  else if (espace) appel = new RegExp(`\\b${espace[1].replace(/\$/g, '\\$')}\\s*\\.\\s*aiguiller\\s*\\(`)
  if (!appel) { d.push(`la route importe ${imp.spec} sans aiguiller (${court(imp.clause, 60)})`); return d }
  if (!appel.test(code)) d.push('la route importe aiguiller sans l\'appeler')
  return d
}
const TEXTE = (a) => `${a && a.sujet}\n${a && a.corps}`
/** Défauts d'un scénario orphelin (WM-2). */
function defautsOrphelin(sc, attendu) {
  const d = []
  const ev = attendu.evenement, s = ev.data.object
  if (ev.id && JSON.stringify(s).includes(ev.id)) throw new Error('scénario mal formé : l\'identifiant de l\'événement est dans la session')
  if (sc.erreur) d.push(`POST lève « ${sc.erreur} »`)
  else if (sc.statut !== 200) d.push(`réponse ${sc.statut}, 200 attendu`)
  if (!sc.aiguiller.length) d.push('aiguiller jamais appelé')
  const toutes = sc.alertes.flatMap((x) => (Array.isArray(x) ? x : [x]))
  const siennes = toutes.filter((a) => a && typeof a.cle === 'string' && a.cle.includes(ev.id))
  const bonnes = siennes.filter((a) => a.motif === 'paiement' && a.a === 'entreprise')
  if (!sc.alertes.length) d.push('envoyerAlertes jamais appelé')
  else if (!bonnes.length) d.push(`aucune alerte { motif: 'paiement', a: 'entreprise' } à clé contenant ${ev.id} (reçu : ${court(JSON.stringify(toutes.map((a) => ({ motif: a && a.motif, a: a && a.a, cle: a && a.cle }))), 140)})`)
  else if (bonnes.length > 1) d.push(`${bonnes.length} alertes pour un seul événement`)
  const a = bonnes[0]
  if (a) {
    if (typeof a.sujet !== 'string' || a.sujet.trim().length < 3) d.push('sujet de l\'alerte vide')
    if (typeof a.corps !== 'string' || a.corps.trim().length < 3) d.push('corps de l\'alerte vide')
    const t = TEXTE(a)
    if (!montantPresent(t, s.amount_total)) d.push(`montant absent de l'alerte (${s.amount_total} centimes)`)
    // « eur » en mot entier (« erreur », « valeur » ne comptent pas) ou le symbole
    if (!/(^|[^\p{L}\p{N}_])eur($|[^\p{L}\p{N}_])|€/iu.test(t)) d.push('devise absente de l\'alerte')
    if (!t.includes(s.id)) d.push('identifiant de session absent de l\'alerte')
    if (!(t.includes(s.customer) || t.includes(s.customer_details.email) || t.includes(s.customer_details.name))) d.push('client absent de l\'alerte')
  }
  if (sc.encaisser.length) d.push(`encaisserCommandeSite appelé ${sc.encaisser.length} fois`)
  const ecritures = sc.base.filter((o) => o.table === 'artisans' && o.action !== 'select')
  if (ecritures.length) d.push(`${ecritures.length} écriture(s) dans artisans (${ecritures.map((o) => o.action).join(', ')})`)
  return d
}
const alerteOrphelinDe = (sc, ev) => sc.alertes.flatMap((x) => (Array.isArray(x) ? x : [x])).some((a) => a && typeof a.cle === 'string' && a.cle.includes(ev.id) && a.motif === 'paiement' && a.a === 'entreprise')
/** Défauts d'un scénario de non-régression (WM-3). */
function defautsNonRegression(sc, attendu) {
  const d = []
  const ev = attendu.evenement, s = ev.data.object
  if (alerteOrphelinDe(sc, ev)) d.push('traité en orphelin (alerte de paiement à la clé de l\'événement)')
  if (attendu.nom === 'commande introuvable') {
    if (sc.erreur) d.push(`POST lève « ${sc.erreur} » au lieu de répondre`)
    else if (sc.statut === null || (sc.statut >= 200 && sc.statut < 300)) d.push(`réponse ${sc.statut} : Stripe ne rejouera pas (une erreur est attendue)`)
    if (sc.encaisser.length !== 1 || sc.encaisser[0].id !== s.id) d.push(`encaisserCommandeSite appelé ${sc.encaisser.length} fois pour cette session`)
    if (!sc.notifs.length && !sc.alertes.length) d.push('personne n\'est prévenu (ni notifierEntreprise, ni envoyerAlertes)')
  } else if (attendu.nom === 'commande payée') {
    if (sc.erreur) d.push(`POST lève « ${sc.erreur} »`)
    else if (sc.statut !== 200) d.push(`réponse ${sc.statut}, 200 attendu`)
    if (sc.encaisser.length !== 1 || sc.encaisser[0].id !== s.id) d.push(`encaisserCommandeSite appelé ${sc.encaisser.length} fois pour cette session`)
  } else if (attendu.nom === 'abonnement') {
    if (sc.erreur) d.push(`POST lève « ${sc.erreur} »`)
    else if (sc.statut !== 200) d.push(`réponse ${sc.statut}, 200 attendu`)
    if (sc.encaisser.length) d.push('encaisserCommandeSite appelé pour un abonnement')
    const uid = s.metadata.uid
    const maj = sc.base.filter((o) => o.table === 'artisans' && o.action === 'update' && o.filtres.some((f) => f[0] === 'eq' && f[1] === 'id' && f[2] === uid))
    if (!maj.length) d.push('aucun update de artisans sur l\'id de l\'abonné')
    else if (!maj.some((o) => o.payload && o.payload.plan === s.metadata.plan && o.payload.stripe_subscription_id === s.subscription)) d.push(`update de artisans sans plan « ${s.metadata.plan} » ni stripe_subscription_id (${court(JSON.stringify(maj[0].payload), 100)})`)
  }
  return d
}
/** Défauts d'un scénario de WM-5 (payé d'abord, paiements différés). */
function defautsPaiement(x, sc) {
  const ev = sc.evenement, s = ev.data.object
  if (sc.paiement === 'orphelin') return defautsOrphelin(x, sc)
  if (sc.paiement === 'abonnement') return defautsNonRegression(x, { ...sc, nom: 'abonnement' })
  if (sc.paiement === 'encaisse') return defautsNonRegression(x, { ...sc, nom: 'commande payée' })
  if (sc.paiement === 'introuvable') return defautsNonRegression(x, { ...sc, nom: 'commande introuvable' })
  const d = []
  const reponse = x.erreur ? `POST lève « ${x.erreur} »` : `réponse ${x.statut}`
  const ok2xx = !x.erreur && typeof x.statut === 'number' && x.statut >= 200 && x.statut < 300
  const alertes = x.alertes.flatMap((a) => (Array.isArray(a) ? a : [a])).filter(Boolean)
  const ecritures = x.base.filter((o) => o.table === 'artisans' && o.action !== 'select')
  if (x.encaisser.length) d.push(`encaisserCommandeSite appelé ${x.encaisser.length} fois : la commande passe à « payee » sans que l'argent soit là`)
  if (ecritures.length) d.push(`${ecritures.length} écriture(s) dans artisans (${ecritures.map((o) => `${o.action} ${court(JSON.stringify(o.payload), 60)}`).join(', ')}) : l'abonnement est servi sans paiement`)
  if (sc.paiement === 'rien') {
    if (!ok2xx) d.push(`${reponse}, 2xx attendu (un paiement en cours n'est pas une erreur : Stripe rejouerait trois jours)`)
    if (!x.aiguiller.length) d.push('aiguiller jamais appelé')
    if (alertes.some((a) => typeof a.cle === 'string' && a.cle.startsWith('orphelin:'))) d.push('traité en orphelin (alerte « orphelin:… » : un humain servirait ou rembourserait un paiement encore en cours)')
  } else if (sc.paiement === 'echec') {
    if (!ok2xx) d.push(`${reponse}, 2xx attendu (un prélèvement refusé ne se rejoue pas)`)
    const textes = [...alertes.filter((a) => a.a === 'entreprise').map(TEXTE), ...x.notifs.map((n) => `${n.sujet}\n${n.corps}`)]
    if (!textes.length) d.push(`personne n'est prévenu du prélèvement refusé (ni envoyerAlertes à 'entreprise', ni notifierEntreprise)${alertes.length ? ` (alertes reçues : ${court(JSON.stringify(alertes.map((a) => ({ a: a.a, cle: a.cle }))), 100)})` : ''}`)
    else if (!textes.some((t) => t.includes(s.id))) d.push(`l'entreprise est prévenue sans l'identifiant de la session (${s.id})`)
  } else throw new Error(`scénario mal formé : paiement « ${sc.paiement} »`)
  return d
}
/** Exécute la route sur les scénarios → { wm2, wm3, wm5 } : { ok, echecs, resume } chacun */
export function jugerRoute(racine, dossier) {
  const wm2 = { echecs: [] }, wm3 = { echecs: [] }, wm5 = { echecs: [] }
  const f = path.join(racine, ROUTE)
  if (!fs.existsSync(f) || !fs.readFileSync(f, 'utf8').trim()) {
    for (const w of [wm2, wm3, wm5]) w.echecs.push(`${ROUTE} absent ou vide`)
    return { wm2: { ok: false, ...wm2 }, wm3: { ok: false, ...wm3 }, wm5: { ok: false, ...wm5 } }
  }
  const code = sansCommentaires(fs.readFileSync(f, 'utf8'))
  for (const x of lectureStatiqueRoute(code)) wm2.echecs.push(`lecture : ${x}`)
  const scenarios = scenariosRoute()
  const enregistrer = ecrireDoublures(dossier, racine)
  const s = lancerSonde(racine, path.join(dossier, 'sonde-route.mjs'), SONDE_ROUTE, { route: f, scenarios: scenarios.map(({ nom, evenement: e, forcer, encaisser, artisan }) => ({ nom, evenement: e, forcer, encaisser, artisan })) }, { crochets: enregistrer })
  if (!s.ok || s.res.erreurImport) {
    const m = s.ok ? `import de la route en erreur : ${s.res.erreurImport}` : s.erreur
    for (const w of [wm2, wm3, wm5]) w.echecs.push(m)
    return { wm2: { ok: false, ...wm2 }, wm3: { ok: false, ...wm3 }, wm5: { ok: false, ...wm5 } }
  }
  const r = s.res
  if (r.reseau.length) { const m = `la route a tenté ${r.reseau.length} appel(s) réseau hors doublures (${r.reseau.slice(0, 2).join(', ')})`; for (const w of [wm2, wm3, wm5]) w.echecs.push(m) }
  const faits = { 'WM-2': [], 'WM-3': [], 'WM-5': [] }
  const cibles = { 'WM-2': wm2, 'WM-3': wm3, 'WM-5': wm5 }
  const juger = { 'WM-2': defautsOrphelin, 'WM-3': defautsNonRegression, 'WM-5': defautsPaiement }
  scenarios.forEach((sc, i) => {
    const x = r.scenarios[i]
    const cible = cibles[sc.critere]
    if (!x || x.nom !== sc.nom) { cible.echecs.push(`« ${sc.nom} » : aucun résultat`); return }
    const d = juger[sc.critere](x, sc)
    for (const y of d) cible.echecs.push(`« ${sc.nom} » : ${y}`)
    if (!d.length) faits[sc.critere].push(`${sc.nom} → ${x.statut}`)
  })
  return {
    wm2: { ok: wm2.echecs.length === 0, echecs: wm2.echecs, resume: `aiguiller importé et appelé ; route exécutée avec doublures : ${faits['WM-2'].join(', ')}, une alerte { motif: 'paiement', a: 'entreprise', cle: …<id de l'événement>… } chacun, avec montant, devise, session et client, sans encaissement ni écriture dans artisans` },
    wm3: { ok: wm3.echecs.length === 0, echecs: wm3.echecs, resume: `${faits['WM-3'].join(', ')} (commande introuvable : erreur, entreprise prévenue ; abonnement : plan et abonnement écrits)` },
    wm5: { ok: wm5.echecs.length === 0, echecs: wm5.echecs, resume: `route : ${faits['WM-5'].join(', ')}` },
  }
}
/** WM-5 a) : l'aiguillage sur les sessions de casPaiement() (même sonde que WM-1). → { ok, echecs, resume } */
export function jugerAiguillagePaiement(racine, dossier) {
  const echecs = []
  const f = path.join(racine, AIGUILLAGE)
  if (!fichierNonVide(f)) return { ok: false, echecs: [`${AIGUILLAGE} absent ou vide`], resume: '' }
  const cas = casPaiement()
  const s = lancerSonde(racine, path.join(dossier, 'sonde-aiguillage-paiement.mjs'), SONDE_AIGUILLAGE, { module: f, cas: cas.map(({ nom, session }) => ({ nom, session })) })
  if (!s.ok) return { ok: false, echecs: [s.erreur], resume: '' }
  const r = s.res
  if (r.erreurImport) return { ok: false, echecs: [`import de ${AIGUILLAGE} en erreur : ${r.erreurImport}`], resume: '' }
  if (r.typeAiguiller !== 'function') return { ok: false, echecs: [`${AIGUILLAGE} n'exporte pas aiguiller`], resume: '' }
  if (r.reseau.length) echecs.push(`impur : ${r.reseau.length} appel(s) fetch`)
  const vus = []
  cas.forEach((c, i) => {
    const x = r.cas[i]
    if (!x) { echecs.push(`« ${c.nom} » : aucune réponse`); return }
    if (x.erreur) { echecs.push(`« ${c.nom} » : aiguiller lève « ${x.erreur} »`); return }
    if (x.promesse) echecs.push(`« ${c.nom} » : aiguiller rend une promesse`)
    if (typeof x.sortie !== 'string' || !x.sortie) { echecs.push(`« ${c.nom} » : ${x.type}, une chaîne attendue`); return }
    if (x.seconde !== x.sortie) { echecs.push(`« ${c.nom} » : second appel « ${x.seconde} », le premier « ${x.sortie} »`); return }
    if (c.attendu && x.sortie !== c.attendu) { echecs.push(`« ${c.nom} » : « ${x.sortie} », « ${c.attendu} » attendu`); return }
    if (c.interdit && c.interdit.includes(x.sortie)) { echecs.push(`« ${c.nom} » : « ${x.sortie} » — servi sans être payé`); return }
    vus.push(`${c.nom} → ${x.sortie}`)
  })
  return { ok: echecs.length === 0, echecs, resume: `aiguillage : ${vus.join(', ')}` }
}

// ── WM-5 c) : sondes du détecteur (le témoin, muté une fois par défaut, doit être vu) ─────────────────────────────────────
export const MUTATIONS_PAIEMENT = [
  { nom: 'commande de site encaissée sans être payée', fichier: AIGUILLAGE, de: "  if (voie === 'commande_site' && s.payment_status !== 'paid') return differe ? 'en_attente' : 'orphelin'\n", vers: '' },
  { nom: 'abonnement servi sans être payé', fichier: AIGUILLAGE, de: "  if (voie === 'abonnement' && s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') return differe ? 'en_attente' : 'orphelin'\n", vers: '' },
  { nom: 'abonnement à 0 € refusé', fichier: AIGUILLAGE, de: " && s.payment_status !== 'no_payment_required') return", vers: ') return' },
  { nom: 'async_payment_succeeded non écouté', fichier: ROUTE, de: "event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded'", vers: "event.type === 'checkout.session.completed'" },
  { nom: 'async_payment_failed muet', fichier: ROUTE, de: "      await envoyerAlertes([{\n        motif: 'paiement', a: 'entreprise', cle: `differe-refuse:${event.id}`,", vers: "      void ([{\n        motif: 'paiement', a: 'entreprise', cle: `differe-refuse:${event.id}`," },
]
/** WM-5 sur une racine : a) aiguillage + b) route. → { ok, echecs, resume } */
export function jugerPaiement(racine, dossier) {
  const a = jugerAiguillagePaiement(racine, dossier)
  const b = jugerRoute(racine, dossier).wm5
  return { ok: a.ok && b.ok, echecs: [...a.echecs, ...b.echecs], resume: `${a.resume} ; ${b.resume}` }
}
/** WM-5 c) : copie du projet de `base` + témoins, propre puis muté. → { echecs[], faits[] } */
export function sondesPaiement(base = R) {
  const echecs = [], faits = []
  const lireTemoin = (rel) => { const f = path.join(TEMOIN_SOURCES, `${rel}.temoin`); return fichierNonVide(f) ? fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') : null }
  const propres = { [AIGUILLAGE]: lireTemoin(AIGUILLAGE), [ROUTE]: lireTemoin(ROUTE) }
  if (!propres[AIGUILLAGE] || !propres[ROUTE]) return { echecs: [`sondes impossibles : témoin absent ou vide dans ${posix(path.relative(R, TEMOIN_SOURCES))}`], faits }
  const copie = dossierTravail(JUGE, 'sondes-wm5', 'projet')
  for (const rel of ['app', 'lib', 'package.json', 'tsconfig.json', 'middleware.ts', 'next-env.d.ts']) if (fs.existsSync(path.join(base, rel))) fs.cpSync(path.join(base, rel), path.join(copie, rel), { recursive: true })
  const poser = (fichiers) => { for (const [rel, src] of Object.entries(fichiers)) fs.writeFileSync(path.join(copie, rel), src) }
  const essai = (n) => jugerPaiement(copie, dossierTravail(JUGE, 'sondes-wm5', `sonde-${n}`))
  poser(propres)
  const propre = essai(0)
  if (!propre.ok) echecs.push(`détecteur trop strict : le témoin échoue (${court(propre.echecs[0], 200)})`)
  MUTATIONS_PAIEMENT.forEach((m, i) => {
    if (!propres[m.fichier].includes(m.de)) { echecs.push(`sonde « ${m.nom} » cassée : le témoin ne contient plus « ${court(m.de, 60)} »`); return }
    poser({ ...propres, [m.fichier]: propres[m.fichier].replace(m.de, () => m.vers) })
    const r = essai(i + 1)
    if (r.ok) echecs.push(`détecteur aveugle : la mutation « ${m.nom} » passe`)
    else faits.push(`mutation « ${m.nom} » → vue`)
  })
  return { echecs, faits }
}
/** WM-3, fichiers : lib/stripe.ts et lib/abonnementSync.ts identiques à HEAD (ou au commit de l'arbre) et à 1620723. */
export function jugerInchanges(racine) {
  const echecs = [], faits = []
  const depot = estRacineGit(racine)
  const depotGit = depot ? racine : R
  const revs = new Map()
  const tete = depot ? 'HEAD' : (commitDeReference(racine) || 'HEAD')
  const sha = revParse(tete, { cwd: depotGit })
  revs.set(sha, `${depot ? 'HEAD' : commitDeReference(racine) ? 'le commit de l\'arbre' : 'HEAD du dépôt'} (${sha.slice(0, 7)})`)
  const ref = revParse(REFERENCE_COMMIT)
  if (!revs.has(ref)) revs.set(ref, REFERENCE_COMMIT)
  for (const rel of INCHANGES) {
    const f = path.join(racine, rel)
    if (!fichierNonVide(f)) { echecs.push(`${rel} absent ou vide`); continue }
    const h = git(['hash-object', `--path=${rel}`, '--', f], { cwd: depotGit })
    const blob = h.stdout.trim()
    if (h.code !== 0 || !/^[0-9a-f]{40}$/.test(blob)) { echecs.push(`${rel} : git hash-object en erreur (${court(h.stderr || h.erreur)})`); continue }
    for (const [rev, nom] of revs) {
      const t = lsTree(depotGit, rev, rel).get(rel)
      if (!t) echecs.push(`${rel} absent de ${nom}`)
      else if (t.sha !== blob) echecs.push(`${rel} diffère de ${nom}`)
    }
    if (depot) {
      const d = git(['diff', '--quiet', 'HEAD', '--', rel], { cwd: racine })
      if (d.code !== 0) echecs.push(`${rel} : git diff HEAD ${d.code === 1 ? 'non vide' : `en erreur (${court(d.stderr)})`}`)
    }
    faits.push(`${rel} ${blob.slice(0, 7)}`)
  }
  return { ok: echecs.length === 0, echecs, resume: `${faits.join(', ')} = ${[...revs.values()].join(' = ')}` }
}

// ── WM-4 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function jugerTypecheck(racine) {
  const echecs = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, resume })
  if (!fichierNonVide(path.join(racine, 'package.json')) || !fichierNonVide(path.join(racine, 'tsconfig.json'))) { echecs.push('package.json ou tsconfig.json absent de la racine'); return fin('') }
  const dossierInfo = path.join(TRAVAIL, JUGE, 'tsbuildinfo')
  fs.mkdirSync(exigerSousTravail(dossierInfo), { recursive: true })
  const info = path.join(dossierInfo, `${empreinte(cleChemin(racine))}.tsbuildinfo`)
  if (/[\s"&|<>^%]/.test(info)) throw new Error(`chemin du tsbuildinfo inutilisable dans une ligne de commande : ${info}`)
  const t0 = Date.now()
  // Une seule chaîne de commande (sans tableau d'arguments) : Node 24 déconseille args + shell (DEP0190) ; le chemin est vérifié ci-dessus.
  const r = lancer(`npm run typecheck -- --tsBuildInfoFile ${posix(info)} --listFiles`, [], { cwd: racine, shell: true, timeout: 400_000, env: { NO_UPDATE_NOTIFIER: '1' } })
  const duree = ((Date.now() - t0) / 1000).toFixed(0)
  const lignes = r.sortie.split(/\r?\n/)
  const vus = new Set(lignes.map((l) => l.trim()).filter((l) => /^([A-Za-z]:[\\/]|\/)/.test(l)).map((l) => cleChemin(l)))
  if (r.code !== 0) {
    const erreurs = lignes.filter((l) => /error TS\d+/.test(l))
    echecs.push(`npm run typecheck en code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} en ${duree} s : ${erreurs.length ? `${erreurs.length} erreur(s), ${erreurs.slice(0, 3).map((l) => court(l, 140)).join(' | ')}` : court(lignes.filter((l) => l.trim()).slice(-3).join(' | '), 240)}`)
  }
  const attendus = []
  // Comme le motif **/*.ts de tsconfig.json : les dossiers dont le nom commence par un point ne sont pas parcourus.
  for (const d of ['app', 'lib']) for (const rel of listerFichiers(path.join(racine, d))) if (/\.tsx?$/.test(rel) && !rel.split('/').some((x) => x.startsWith('.'))) attendus.push(`${d}/${rel}`)
  for (const rel of [ROUTE, AIGUILLAGE]) if (fs.existsSync(path.join(racine, rel)) && !attendus.includes(rel)) attendus.push(rel)
  if (!attendus.includes(ROUTE)) echecs.push(`${ROUTE} absent : rien à vérifier`)
  const manquants = attendus.filter((rel) => !vus.has(cleChemin(path.join(racine, rel))))
  if (manquants.length) echecs.push(`${manquants.length} fichier(s) de app/ et lib/ hors de la vérification (${manquants.slice(0, 3).join(', ')})${vus.size ? '' : ' : aucune liste de fichiers, tsc a-t-il tourné ?'}`)
  const nomme = [ROUTE, AIGUILLAGE].filter((rel) => attendus.includes(rel) && !manquants.includes(rel)).map((rel) => path.basename(rel))
  // un typecheck vert ne prouve rien si la route ou l'aiguillage s'en exemptent (@ts-nocheck, @ts-ignore ajoutés) ou si la
  // configuration a été assouplie (relecture du 24/09 : une route en @ts-nocheck avec une erreur de type passait)
  for (const x of defautsTypecheck(racine, [ROUTE, AIGUILLAGE])) echecs.push(x)
  return fin(`npm run typecheck en code 0 (${duree} s) ; ${attendus.length} fichiers .ts/.tsx de app/ et lib/ vérifiés, dont ${nomme.join(' et ')} (${vus.size} fichiers au total avec les déclarations) ; ni @ts-nocheck ni @ts-ignore ajouté dans ${path.basename(ROUTE)} et ${path.basename(AIGUILLAGE)}, tsconfig.json et script typecheck de ${REFERENCE_COMMIT}`)
}

// ── Témoin ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Copie du projet (app, lib, package.json, tsconfig.json…) sous .orchestre/travail/webhook-muet-qa/temoin/ + fichiers .temoin. */
export function construireTemoin(base = R) {
  const presents = listerFichiers(TEMOIN_SOURCES)
  const manquants = TEMOIN_ATTENDUS.filter((f) => !presents.has(f) || !fichierNonVide(path.join(TEMOIN_SOURCES, f)))
  if (manquants.length) throw new Error(`témoin incomplet dans ${posix(path.relative(R, TEMOIN_SOURCES))} : ${manquants.join(', ')} absent(s) ou vide(s)`)
  const copier = ['app', 'lib', 'package.json', 'tsconfig.json', ...['middleware.ts', 'next-env.d.ts'].filter((f) => fs.existsSync(path.join(base, f)))]
  const dest = preparerTemoin(JUGE, { base, copier, superposer: null })
  for (const f of TEMOIN_ATTENDUS) {
    const cible = path.join(dest, f.slice(0, -'.temoin'.length))
    fs.mkdirSync(path.dirname(cible), { recursive: true })
    fs.copyFileSync(path.join(TEMOIN_SOURCES, f), cible)
  }
  return { dest, copies: copier, superposes: TEMOIN_ATTENDUS.map((f) => f.slice(0, -'.temoin'.length)) }
}

// ── Le juge ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['critere'] })
  if (o.reel) { console.error('✗ webhook-muet-qa n\'a pas de --reel : tout se juge en local, avec des doublures'); process.exit(2) }
  if (o.positionnels.length) { console.error(`✗ argument(s) inattendu(s) : ${o.positionnels.join(' ')}`); process.exit(2) }
  const ids = o.valeur('critere') === undefined ? IDS : o.liste('critere')
  if (o.drapeau('critere') || !ids.length || ids.some((x) => !IDS.includes(x)) || new Set(ids).size !== ids.length) { console.error(`✗ --critere attend des critères de ${IDS.join(', ')} (ex. --critere=WM-1,WM-5)`); process.exit(2) }
  const veut = (id) => ids.includes(id)
  const racineAffichee = o.temoin ? path.join(TRAVAIL, JUGE, 'temoin') : o.racine
  const s = creerSortie(JUGE, ids, { racine: racineAffichee, temoin: o.temoin })
  if (ids !== IDS) s.note(`--critere : seulement ${ids.join(', ')} (les autres critères ne sont pas jugés)`)
  await s.executer(async () => {
    let racine = o.racine
    if (o.temoin) {
      const t = construireTemoin(o.racine)
      racine = t.dest
      s.note(`témoin : ${t.copies.join(', ')} copiés depuis ${o.racine} ; superposés depuis ${posix(path.relative(R, TEMOIN_SOURCES))} : ${t.superposes.join(', ')}`)
    }
    const dossier = dossierTravail(JUGE, `sonde-${empreinte(cleChemin(racine))}`)
    if (veut('WM-1')) s.resultat('WM-1', jugerAiguillage(racine, dossier))
    const route = veut('WM-2') || veut('WM-3') || veut('WM-5') ? jugerRoute(racine, dossier) : null
    if (veut('WM-2')) s.resultat('WM-2', route.wm2)
    if (veut('WM-3')) {
      const fichiers = jugerInchanges(racine)
      if (route.wm3.ok && fichiers.ok) s.passe('WM-3', `${route.wm3.resume} ; ${fichiers.resume}`)
      else for (const e of [...(route.wm3.ok ? [] : route.wm3.echecs), ...(fichiers.ok ? [] : fichiers.echecs)]) s.echoue('WM-3', e)
    }
    if (veut('WM-5')) {
      const a = jugerAiguillagePaiement(racine, dossier)
      const z = sondesPaiement(o.racine)
      const echecs = [...a.echecs, ...route.wm5.echecs, ...z.echecs]
      if (echecs.length) for (const e of echecs) s.echoue('WM-5', e)
      else s.passe('WM-5', `${a.resume} ; ${route.wm5.resume} ; ${z.faits.join(' ; ')}`)
    }
    if (veut('WM-4')) s.resultat('WM-4', jugerTypecheck(racine))
  })
}
const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) await principal()
