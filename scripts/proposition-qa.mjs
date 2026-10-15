// scripts/proposition-qa.mjs — le juge de la fiche 025-18 (« Presti prépare VRAIMENT la réponse dès le premier message »),
// écrit par Claude Code AVANT la production (relecture du 25/09, défaut D08). Les verdicts sont à lui : un exécutant ne le
// modifie pas. Il n'écrit que sous .orchestre/travail/proposition-qa/.
//
// Ce qu'il juge : app/api/leads/route.ts, par son COMPORTEMENT. La route est transpilée par TypeScript et lancée dans ce
// processus contre un faux Supabase en mémoire (artisans, leads, messages, relances, plateforme_config) et des doublures qui
// enregistrent tout : une fausse IA (lib/ai : texte, panne ou texte vide selon le scénario), un faux porte-monnaie de crédits
// (lib/credits : solde par artisan, coût = CREDIT_COST de lib/plans.ts de la racine), les e-mails (lib/email), les
// notifications à l'artisan (lib/notifications), l'alerte de panne (lib/alerteService), la sécurité et les plafonds. Les
// modules sans entrée-sortie sont les VRAIS, lus dans la racine : lib/plateformeConfig.ts (decisionReponse, getPlateformeConfig
// qui lit la table plateforme_config du faux Supabase), lib/plans.ts, lib/models.ts (resolveModel), lib/flags.ts,
// lib/slugRedirect.ts, lib/purgeComptes.ts… fetch est piégé : rien ne sort. Un after() de next/server est exécuté et attendu.
//
//   PQ-1  (D08, le cœur) mode assisté, crédit disponible : la demande est enregistrée (200, ok, leadId), le message du prospect
//         est gardé ('in'), et UNE proposition est écrite pour CETTE demande : { lead_id, sens:'out', type:'reponse_auto',
//         etat:'proposition', contenu = le texte rendu par l'IA }. L'IA est appelée une fois, avec le message du prospect.
//         Le crédit est débité UNE fois, au tarif du modèle servi (resolveModel(cfg.modele || 'standard', plan) : 1 crédit en
//         Standard, 3 en Expert, et ce modèle-là est passé à l'IA), jamais rendu. Rien ne part vers le client : réponse JSON
//         sans le texte (reply nul), aucun message sortant réel (etat nul), aucun e-mail au prospect qui porte la proposition
//         (l'accusé « Bien reçu » d'aujourd'hui part, une fois), statut de la demande pas « repondu », aucune relance
//         planifiée. L'artisan reçoit UNE notification qui dit « Réponse proposée » et « à valider » (pas « à vous de
//         répondre »). Quatre scénarios : Essentiel sans ligne de configuration (le défaut), Essentiel qui a choisi « auto »
//         (verrou d'offre : servi en assisté), Signature en assisté avec le modèle Expert, et le premier message de la page
//         /p/<slug> (PlatChat.tsx:306 : variant 'B', deferContact, sans contact) : la proposition est écrite de même, et,
//         comme aujourd'hui, ni notification ni e-mail ne part avant la capture des coordonnées (/api/leads/contact).
//   PQ-2  génération qui échoue (l'IA lève une erreur ; l'IA rend un texte vide ; panne en Expert) : la génération a été
//         tentée (IA appelée une fois), le crédit débité est RENDU (consumeCredit puis rendreCredit, même artisan, même
//         palier : solde final = solde initial), aucune proposition ni message sortant, la demande et le message du prospect
//         sont gardés (200), l'artisan est prévenu « à vous de répondre » (pas « Réponse proposée »), l'accusé part ; sur une
//         erreur levée, l'entreprise est prévenue (signalerPanneIA).
//   PQ-3  sans crédit (solde 0 ; solde 2 pour un modèle Expert à 3) : 200, demande et message gardés, aucune proposition,
//         l'IA n'est pas appelée, aucun crédit perdu ni solde négatif, la notification d'aujourd'hui « à vous de répondre »,
//         l'accusé part. (Non-régression : vert sur l'arbre d'aujourd'hui ; les sondes de mutation prouvent le détecteur.)
//   PQ-4  les autres modes ne changent pas. Auto (Studio) : la réponse est rendue au prospect (reply = le texte), écrite en
//         message sortant réel (etat nul), envoyée par e-mail, statut « repondu », trois relances planifiées, un crédit débité,
//         aucune proposition. Manuel : ni IA, ni crédit, ni proposition, « à vous de répondre ». Pause : 200 paused, ni IA, ni
//         crédit, ni proposition. Mot d'escalade en auto : ni IA, ni proposition, « à vous de répondre ». (Non-régression.)
//   PQ-5  la même demande rejouée : deux envois identiques → deux demandes, chacune avec sa proposition (jamais deux sur la
//         même), deux crédits, deux appels à l'IA ; avec un seul crédit, la première a sa proposition, la seconde aucune et
//         l'artisan est prévenu « à vous de répondre » pour elle ; solde jamais négatif. Aucune demande, dans aucun scénario
//         du juge, n'a plus d'une proposition.
//   PQ-6  npm run typecheck (cwd = racine) en code 0, avec --listFiles et un --tsBuildInfoFile sous .orchestre/travail/ (rien
//         n'est écrit dans la racine) : chaque .ts/.tsx de app/ et lib/ est vérifié, route comprise ; ni @ts-nocheck ni
//         @ts-ignore ajouté dans la route, tsconfig.json et le script typecheck ceux de 1620723 (commun.mjs defautsTypecheck).
//         LOURD : sur le PC de Benj, passer par l'usine (node scripts/usine.mjs executer -- node scripts/proposition-qa.mjs).
//
// Sondes du détecteur (à chaque passage de PQ-1 à PQ-5) : le témoin scripts/fixtures/025/temoins/proposition-qa/…/route.ts.temoin
// est rejoué avec une mutation par critère — proposition écrite en message réel, rien de préparé en coordonnées différées
// (PQ-1), crédit jamais rendu (PQ-2), génération
// sans crédit (PQ-3), le mode auto traité comme l'assisté (PQ-4), la proposition écrite deux fois (PQ-5) — et chaque critère
// doit la voir. Une sonde qui ne s'applique plus ou qui passe inaperçue fait échouer son critère (« détecteur aveugle »).
//
// Choix du juge (la fiche ne tranche pas) :
//   - La proposition peut venir de generateLeadReply ou de generateConversationReply (fonctions existantes de lib/ai) ; elle
//     peut être rédigée dans la requête ou dans un after() de next/server (le juge attend les after()).
//   - « Réponse proposée » et « à valider » se cherchent dans le sujet ET le corps de la notification, sans la casse ;
//     « à vous de répondre » aussi. Une notification par demande : deux messages pour une demande sont du bruit.
//   - Le modèle servi n'est vérifié que pour l'Expert (le Standard est aussi le modèle par défaut de lib/ai : ne pas le
//     passer n'est pas une faute).
//   - PQ-5 « rejouée » : /api/leads n'a pas de clé d'idempotence (chaque envoi est une nouvelle demande, comme aujourd'hui) ;
//     le juge exige qu'un rejeu ne double ni la proposition d'une demande, ni le débit, ni ne passe sous zéro.
//   - Les demandes relevées dans la boîte e-mail (lib/releveCanal.ts:77-98) n'empruntent pas /api/leads : elles sont hors
//     de ce juge (reste ouvert de la fiche).
//
// Usage : node scripts/proposition-qa.mjs [--racine=<dossier>] [--temoin] [--critere=PQ-1,PQ-2,…]
//   --temoin : copie app/, lib/, package.json, tsconfig.json (et middleware.ts, next-env.d.ts) de la racine dans
//              .orchestre/travail/proposition-qa/temoin/, y pose le témoin sans son suffixe, et juge cette copie.
//   --critere : ne juge que ces critères (PQ-6 est le seul lourd : --critere=PQ-1,PQ-2,PQ-3,PQ-4,PQ-5 tient sur le PC).
//   Sortie : une ligne PASS/FAIL par critère, puis « proposition-qa : PASS » ou « … : FAIL — ids » ; code 0 seulement si tout
//   est vert, 1 sinon, 2 si l'appel est invalide. Aucun --reel.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire, builtinModules } from 'node:module'
import { fileURLToPath } from 'node:url'
import {
  R, FIXTURES, TRAVAIL, REFERENCE_COMMIT, lireOptionsOuQuitter, creerSortie, preparerTemoin, exigerSousTravail, lancer,
  listerFichiers, fichierNonVide, defautsTypecheck,
} from './fixtures/025/commun.mjs'

export const JUGE = 'proposition-qa'
export const IDS = ['PQ-1', 'PQ-2', 'PQ-3', 'PQ-4', 'PQ-5', 'PQ-6']
const ROUTE = 'app/api/leads/route.ts'
const TEMOIN_SOURCES = path.join(FIXTURES, 'temoins', JUGE)
const TEMOIN_ROUTE = path.join(TEMOIN_SOURCES, `${ROUTE}.temoin`)
const requireNode = createRequire(import.meta.url)

const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const posix = (p) => p.split(path.sep).join('/')
const rel = (p) => posix(path.relative(R, p)) || '.'
const hasard = (n = 8) => crypto.randomBytes(n).toString('hex').slice(0, n)
const cleChemin = (p) => { const x = posix(path.resolve(p)); return process.platform === 'win32' ? x.toLowerCase() : x }
const copie = (x) => { try { return JSON.parse(JSON.stringify(x ?? null)) } catch { return String(x) } }

// ── Faux Supabase (en mémoire ; colonnes projetées comme PostgREST, ressources jointes simples) ─────────────────────────────
const likeRe = (motif, casse) => new RegExp(`^${String(motif).split('').map((c) => (c === '%' ? '.*' : c === '_' ? '.' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('')}$`, casse ? 'i' : '')
function decouper(liste) {
  const out = []
  let prof = 0, cur = ''
  for (const c of String(liste)) {
    if (c === '(') prof++
    if (c === ')') prof--
    if (c === ',' && prof === 0) { out.push(cur.trim()); cur = '' } else cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}
/** Une ligne réduite aux colonnes demandées ; une ressource jointe « alias:table!indice(colonnes) » suit la clé étrangère. → { ligne, garder } */
function projeter(base, table, ligne, colonnes) {
  if (!colonnes || String(colonnes).trim() === '*') return { ligne: { ...ligne }, garder: true }
  const out = {}
  let garder = true
  for (const item of decouper(colonnes)) {
    if (item === '*') { Object.assign(out, ligne); continue }
    const emb = /^(?:([\w$]+)\s*:\s*)?([\w$]+)(?:\s*!\s*([\w$]+))?\s*\(([\s\S]*)\)$/.exec(item)
    if (emb) {
      const [, alias, cible, indice, sous] = emb
      const cle = alias || cible
      const lignesCible = base[cible] || []
      const candidats = Object.keys(ligne).filter((k) => k.endsWith('_id') && (indice && indice !== 'inner' && indice !== 'left' ? indice.includes(k) : k === `${cible.replace(/s$/, '')}_id`))
      const fk = candidats.sort((a, b) => b.length - a.length)[0]
      if (fk) {
        const r = lignesCible.find((x) => x.id === ligne[fk])
        out[cle] = r ? projeter(base, cible, r, sous).ligne : null
        if (indice === 'inner' && !r) garder = false
      } else {
        const fk2 = `${table.replace(/s$/, '')}_id`
        out[cle] = lignesCible.filter((x) => x[fk2] === ligne.id).map((x) => projeter(base, cible, x, sous).ligne)
      }
      continue
    }
    const col = /^(?:([\w$]+)\s*:\s*)?([\w$]+)(?:::[\w$]+)?$/.exec(item)
    if (col) { out[col[1] || col[2]] = ligne[col[2]] === undefined ? null : ligne[col[2]]; continue }
    return { ligne: { ...ligne }, garder: true } // expression non simulée : la ligne entière
  }
  return { ligne: out, garder }
}
export function fauxSupabase(base) {
  const journal = []
  const filtre = (op, col, val) => {
    const v = (r) => r[col]
    switch (op) {
      case 'eq': return (r) => v(r) === val
      case 'neq': return (r) => v(r) !== val
      case 'gt': return (r) => v(r) > val
      case 'gte': return (r) => v(r) >= val
      case 'lt': return (r) => v(r) < val
      case 'lte': return (r) => v(r) <= val
      case 'like': return (r) => typeof v(r) === 'string' && likeRe(val, false).test(v(r))
      case 'ilike': return (r) => typeof v(r) === 'string' && likeRe(val, true).test(v(r))
      case 'is': return (r) => (v(r) ?? null) === (val === 'null' ? null : val)
      case 'in': { const l = Array.isArray(val) ? val : String(val).replace(/^\(|\)$/g, '').split(',').map((x) => x.trim().replace(/^"|"$/g, '')); return (r) => l.includes(v(r)) }
      case 'cs': case 'contains': { const l = Array.isArray(val) ? val : String(val).replace(/^\{|\}$/g, '').split(',').map((x) => x.trim()); return (r) => Array.isArray(v(r)) && l.every((x) => v(r).includes(x)) }
      default: throw new Error(`faux Supabase : opérateur « ${op} » non simulé`)
    }
  }
  const lireOr = (expr) => String(expr).split(',').map((p) => { const [c, op, ...reste] = p.split('.'); const neg = op === 'not'; const vraiOp = neg ? reste.shift() : op; const f = filtre(vraiOp, c, reste.join('.')); return neg ? (r) => !f(r) : f })
  class Requete {
    constructor(table) { this.table = table; this.filtres = []; this.op = 'select'; this.valeur = null; this.unique = null; this.lim = null; this.colonnes = null; this.options = {} }
    select(c, o) { this.colonnes = c ?? '*'; this.options = o || {}; return this }
    insert(v) { this.op = 'insert'; this.valeur = v; return this }
    upsert(v) { this.op = 'insert'; this.valeur = v; return this }
    update(v) { this.op = 'update'; this.valeur = v; return this }
    delete() { this.op = 'delete'; return this }
    eq(c, v) { this.filtres.push(filtre('eq', c, v)); return this }
    neq(c, v) { this.filtres.push(filtre('neq', c, v)); return this }
    gt(c, v) { this.filtres.push(filtre('gt', c, v)); return this }
    gte(c, v) { this.filtres.push(filtre('gte', c, v)); return this }
    lt(c, v) { this.filtres.push(filtre('lt', c, v)); return this }
    lte(c, v) { this.filtres.push(filtre('lte', c, v)); return this }
    like(c, v) { this.filtres.push(filtre('like', c, v)); return this }
    ilike(c, v) { this.filtres.push(filtre('ilike', c, v)); return this }
    is(c, v) { this.filtres.push(filtre('is', c, v)); return this }
    in(c, v) { this.filtres.push(filtre('in', c, v)); return this }
    contains(c, v) { this.filtres.push(filtre('cs', c, v)); return this }
    not(c, op, v) { const f = filtre(op, c, v); this.filtres.push((r) => !f(r)); return this }
    filter(c, op, v) { this.filtres.push(filtre(op, c, v)); return this }
    match(o) { for (const [c, v] of Object.entries(o)) this.eq(c, v); return this }
    or(expr) { const fs2 = lireOr(expr); this.filtres.push((r) => fs2.some((f) => f(r))); return this }
    order() { return this }
    range() { return this }
    limit(n) { this.lim = n; return this }
    maybeSingle() { this.unique = 'maybe'; return this }
    single() { this.unique = 'single'; return this }
    then(ok, ko) { return Promise.resolve().then(() => this.executer()).then(ok, ko) }
    executer() {
      const t = base[this.table] || (base[this.table] = [])
      journal.push({ table: this.table, op: this.op, valeur: copie(this.valeur) })
      let lignes
      if (this.op === 'insert') {
        lignes = (Array.isArray(this.valeur) ? this.valeur : [this.valeur]).map((v) => ({ id: crypto.randomUUID(), token: crypto.randomUUID(), created_at: new Date().toISOString(), ...copie(v) }))
        t.push(...lignes)
      } else {
        lignes = t.filter((r) => this.filtres.every((f) => f(r)))
        if (this.op === 'update') for (const r of lignes) Object.assign(r, copie(this.valeur))
        if (this.op === 'delete') base[this.table] = t.filter((r) => !lignes.includes(r))
      }
      if (this.op !== 'select' && this.colonnes === null) return { data: null, error: null, count: null }
      let sortie = []
      for (const l of lignes) { const p = projeter(base, this.table, l, this.colonnes); if (p.garder) sortie.push(p.ligne) }
      if (this.lim !== null) sortie = sortie.slice(0, this.lim)
      const data = JSON.parse(JSON.stringify(sortie))
      if (this.options.head) return { data: null, error: null, count: data.length }
      if (this.unique === 'single') return data.length === 1 ? { data: data[0], error: null } : { data: null, error: { message: `${data.length} ligne(s), une attendue` } }
      if (this.unique === 'maybe') return data.length > 1 ? { data: null, error: { message: 'plusieurs lignes' } } : { data: data[0] ?? null, error: null }
      return { data, error: null, count: this.options.count ? data.length : null }
    }
  }
  return {
    journal,
    from: (t) => new Requete(t),
    rpc: async (nom, args = {}) => {
      journal.push({ table: `rpc:${nom}`, op: 'rpc', valeur: copie(args) })
      if (nom === 'artisan_par_ancien_slug') { const r = (base.artisans || []).find((a) => (a.slugs_anciens || []).includes(args.p_slug)); return { data: r ? [{ slug: r.slug, domaine: r.domaine ?? null, domaine_verifie: r.domaine_verifie ?? null }] : [], error: null } }
      return { data: null, error: { message: `faux Supabase : rpc « ${nom} » non simulée` } }
    },
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'https://stockage.invalid/x' } }) }) },
    auth: { admin: {}, getUser: async () => ({ data: { user: null }, error: null }) },
  }
}

// ── Chargement de la route (TypeScript transpilé, modules à entrées-sorties remplacés) ─────────────────────────────────────
const muet = () => new Proxy(function () {}, { get: (_, k) => (k === 'then' ? undefined : muet()), apply: () => Promise.resolve(undefined) })
let TS = null
const cacheJs = new Map()
async function transpileur() {
  if (!TS) TS = (await import('typescript')).default
  return (fichier, source) => {
    const cle = `${fichier}\0${crypto.createHash('sha1').update(source).digest('hex')}`
    if (!cacheJs.has(cle)) cacheJs.set(cle, TS.transpileModule(source, { fileName: fichier, compilerOptions: { module: TS.ModuleKind.CommonJS, target: TS.ScriptTarget.ES2022, esModuleInterop: true, jsx: TS.JsxEmit.ReactJSX } }).outputText)
    return cacheJs.get(cle)
  }
}
/** Charge <racine>/<fichier> (ou `source` à sa place) ; `doublures` : { 'lib/x.ts': exports } par chemin relatif, et { 'next/server': … } par nom. */
async function charger({ racine, fichier, source = null, doublures = {}, consoleJuge = console }) {
  const transpiler = await transpileur()
  const parChemin = new Map(Object.entries(doublures).filter(([k]) => /\.(ts|tsx|mjs|js)$/.test(k)).map(([k, v]) => [cleChemin(path.join(racine, k)), v]))
  const parNom = Object.fromEntries(Object.entries(doublures).filter(([k]) => !/\.(ts|tsx|mjs|js)$/.test(k)))
  const caches = new Map()
  const resoudre = (spec, depuis) => {
    let base
    if (spec.startsWith('@/')) base = path.join(racine, spec.slice(2))
    else if (spec.startsWith('.')) base = path.resolve(path.dirname(depuis), spec)
    else return null
    for (const e of ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx']) { const c = base + e; try { if (fs.statSync(c).isFile()) return c } catch { /* suivant */ } }
    return undefined
  }
  const executer = (f, src) => {
    const k = cleChemin(f)
    if (parChemin.has(k)) return parChemin.get(k)
    if (caches.has(k)) return caches.get(k).exports
    const js = transpiler(f, src ?? fs.readFileSync(f, 'utf8'))
    const module = { exports: {} }
    caches.set(k, module)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(parNom, spec)) return parNom[spec]
      if (spec.startsWith('node:') || builtinModules.includes(spec)) return requireNode(spec)
      const cible = resoudre(spec, f)
      if (cible) return executer(cible)
      if (cible === undefined) throw new Error(`${posix(path.relative(racine, f))} importe « ${spec} », introuvable`)
      return muet() // paquet npm : doublure muette (rien ne sort)
    }
    new Function('exports', 'require', 'module', '__filename', '__dirname', 'console', 'process', js)(module.exports, req, module, f, path.dirname(f), consoleJuge, { env: {} })
    return module.exports
  }
  return executer(path.join(racine, fichier), source)
}

// ── Le monde d'un scénario ────────────────────────────────────────────────────────────────────────────────────────────────
const ART = '00000000-0000-4000-8000-0000000018a1'
const MESSAGE = (marque) => `Bonjour, je souhaite remplacer mon chauffe-eau de 200 litres dans une maison à Rennes. Repère ${marque}.`
function doublures(W) {
  const texteIA = () => `Bonjour, merci pour votre message : je peux passer voir votre chauffe-eau cette semaine. Proposition ${W.marque}-${W.ia.appels.length}.`
  const generer = (nom) => async (...args) => {
    const appel = { nom, args: copie(args.filter((a) => typeof a !== 'function')), rendu: null }
    W.ia.appels.push(appel)
    if (W.ia.mode === 'leve') throw new Error('panne simulée de l’IA (proposition-qa)')
    if (W.ia.mode === 'vide') { appel.rendu = ''; return '' }
    const t = texteIA()
    appel.rendu = t
    const flux = args.find((a) => typeof a === 'function')
    if (flux) flux(t)
    return t
  }
  const ia = {
    qualifyLead: () => ({ urgence: 'normal', type_chantier: null }),
    analyzeLead: () => ({}),
    generateLeadReply: generer('generateLeadReply'),
    generateConversationReply: generer('generateConversationReply'),
    generateRelanceReply: generer('generateRelanceReply'),
    relanceTemplate: () => 'relance',
  }
  const cout = (tier, force) => (typeof force === 'number' && force >= 0 ? Math.round(force) : (W.cout[tier] ?? 1))
  return {
    'next/server': {
      NextResponse: { json: (corps, init = {}) => ({ __reponse: true, status: init.status ?? 200, corps: copie(corps) }) },
      after: (tache) => { try { const p = typeof tache === 'function' ? tache() : tache; W.enAttente.push(Promise.resolve(p)) } catch (e) { W.enAttente.push(Promise.reject(e)) } },
    },
    'lib/supabaseAdmin.ts': { supabaseAdmin: W.sb },
    'lib/suspension.ts': { suspensionEnCours: async () => null, MESSAGE_PUBLIC_INDISPONIBLE: 'Ce lien de contact n’est plus actif pour le moment.' },
    'lib/ai.ts': new Proxy(ia, { get: (o, k) => (k in o ? o[k] : typeof k === 'string' && /^generate/.test(k) ? generer(k) : undefined) }),
    'lib/email.ts': {
      sendEmail: async (o) => { W.emails.push(copie(o)); return { ok: true, id: 'factice' } },
      notifierEntreprise: async (sujet, corps) => { W.entreprise.push({ sujet: String(sujet), corps: String(corps) }); return { ok: true, id: 'factice' } },
      EMAIL_ENTREPRISE: 'entreprise@exemple.invalid',
    },
    'lib/notifications.ts': { notifierArtisan: async (id, type, email, contenu) => { W.notifs.push(copie({ id, type, email, contenu })); return { envoye: true } } },
    'lib/credits.ts': {
      consumeCredit: async (uid, tier, fondateur, force) => {
        const c = cout(tier, force)
        const avant = W.credits.solde.get(uid) ?? 0
        const e = { uid, tier, cout: c, fondateur: !!fondateur, ok: false }
        if (fondateur) e.ok = true
        else if (avant >= c) { W.credits.solde.set(uid, avant - c); e.ok = true }
        W.credits.consommes.push(e)
        return e.ok ? { ok: true, remaining: W.credits.solde.get(uid) } : { ok: false, error: 'Crédits épuisés — renouvellement mensuel ou formule supérieure.' }
      },
      rendreCredit: async (uid, tier, fondateur, force) => {
        const c = cout(tier, force)
        W.credits.rendus.push({ uid, tier, cout: c, fondateur: !!fondateur })
        if (!fondateur) W.credits.solde.set(uid, (W.credits.solde.get(uid) ?? 0) + c)
      },
    },
    'lib/alerteService.ts': { signalerPanneIA: async (ou, e) => { W.pannes.push({ ou: String(ou), erreur: premiereLigne(e) }); return 'inconnu' }, motifDe: () => 'inconnu', estPanneDeCompte: () => false },
    'lib/security.ts': { getIp: () => '203.0.113.18', isBanned: async () => false, recordAbuse: async (ip, raison) => { W.abus.push(String(raison)); return false }, ipPseudonyme: () => 'ip-essai' },
    'lib/limites.ts': { consommerLimite: async () => true, limiteAtteinte: async () => false, cleEmail: (p, e) => `${p}:${e}` },
    'lib/quotaMedia.ts': { porteMonnaieConversation: async () => ({ accepte: () => false, octets: () => 0 }) },
    'lib/stripe.ts': { stripe: muet() },
  }
}
function monde(sc, cout) {
  const artisan = { id: ART, slug: 'essai-pq-025-18', slugs_anciens: [], nom: 'Atelier Essai PQ', metier: 'plombier', ton_style: null, email: 'atelier-pq@exemple.invalid', is_founder: false, leads_pause: false, services: [], zone_intervention: 'Rennes', bio: null, tva_regime: null, assurance_nom: null, plan: 'studio', credits: sc.solde, suppression_demandee_le: null, notifications: null, domaine: null, domaine_verifie: false, ...(sc.artisan || {}) }
  const base = { artisans: [artisan], leads: [], messages: [], relances: [], plateforme_config: sc.config ? [{ artisan_id: ART, ...sc.config }] : [] }
  const W = {
    marque: `PQ${hasard(6)}`, base, sb: fauxSupabase(base), cout,
    ia: { mode: sc.ia || 'texte', appels: [] },
    credits: { solde: new Map([[ART, sc.solde]]), consommes: [], rendus: [] },
    notifs: [], emails: [], entreprise: [], pannes: [], abus: [], enAttente: [], traces: [], reseau: [],
  }
  return W
}
const delai = (ms) => new Promise((_, ko) => setTimeout(() => ko(new Error(`POST sans réponse après ${ms} ms`)), ms))
/** Joue un scénario : charge la route (ou `source`) dans un monde neuf, envoie `envois` fois la même demande. */
async function jouer({ racine, source, sc, cout }) {
  const W = monde(sc, cout)
  const consoleJuge = { log: () => {}, info: () => {}, debug: () => {}, warn: (...a) => W.traces.push(`warn ${a.map(String).join(' ')}`), error: (...a) => W.traces.push(`error ${a.map((x) => (x instanceof Error ? x.message : String(x))).join(' ')}`) }
  const fetchAvant = globalThis.fetch
  globalThis.fetch = async (u) => { W.reseau.push(String(u && u.url ? u.url : u)); throw new Error('réseau coupé par proposition-qa') }
  const reponses = []
  try {
    const mod = await charger({ racine, fichier: ROUTE, source, doublures: doublures(W), consoleJuge })
    if (typeof mod.POST !== 'function') throw new Error('la route n’exporte pas POST')
    W.message = MESSAGE(W.marque)
    W.contact = sc.differe ? null : sc.contact === 'telephone' ? '02 61 91 00 18' : `prospect-${W.marque.toLowerCase()}@exemple.invalid`
    // Coordonnées différées : le corps exact du premier envoi de PlatChat.tsx:306 (sans contact ni nom).
    const corps = sc.differe
      ? { slug: 'essai-pq-025-18', message: sc.message ? sc.message(W.marque) : W.message, photos: [], website: '', variant: 'B', deferContact: true }
      : { slug: 'essai-pq-025-18', contact: W.contact, nom_prospect: 'Camille Essai', message: sc.message ? sc.message(W.marque) : W.message, website: '' }
    W.message = corps.message
    for (let i = 0; i < (sc.envois || 1); i++) {
      const req = new Request('http://127.0.0.1/api/leads', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.18' }, body: JSON.stringify(corps) })
      const r = { statut: null, corps: null, erreur: null }
      try {
        const rep = await Promise.race([mod.POST(req), delai(20_000)])
        if (rep instanceof Response) { r.statut = rep.status; r.corps = await rep.json().catch(() => null) } else { r.statut = rep?.status ?? null; r.corps = rep?.corps ?? null }
      } catch (e) { r.erreur = premiereLigne(e) }
      const attente = W.enAttente.splice(0)
      for (const x of await Promise.allSettled(attente)) if (x.status === 'rejected') W.traces.push(`after() rejeté : ${premiereLigne(x.reason)}`)
      reponses.push(r)
    }
  } finally { globalThis.fetch = fetchAvant }
  return { W, reponses }
}

// ── Les scénarios ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// attendu : proposition | echec | sans_credit | auto | silence | pause ; tier/modele : ce que resolveModel sert (PQ-1, PQ-2).
export const SCENARIOS = [
  // 15/10 (Benj) : la plateforme commence avec Studio — les comptes de ces scénarios sont en Studio par défaut (il n'y a plus d'Essentiel avec la plateforme,
  // donc plus de scénario « Essentiel qui a choisi auto » : le refus d'un compte sans plateforme est jugé par scripts/plateforme-formulaire-qa.mjs).
  { id: 'PQ-1', nom: 'Studio, réglage par défaut (assistée, sans ligne de configuration)', solde: 10, attendu: 'proposition', tier: 'standard' },
  { id: 'PQ-1', nom: 'Signature en assistée, modèle Expert', solde: 10, artisan: { plan: 'signature' }, config: { mode_reponse: 'assistee', modele: 'expert' }, attendu: 'proposition', tier: 'expert', modele: 'expert' },
  { id: 'PQ-1', nom: 'premier message de la page /p (PlatChat : variante B, coordonnées différées)', solde: 10, differe: true, attendu: 'proposition', tier: 'standard' },
  { id: 'PQ-2', nom: 'l’IA lève une erreur', solde: 10, ia: 'leve', attendu: 'echec', tier: 'standard', panne: true },
  { id: 'PQ-2', nom: 'l’IA rend un texte vide', solde: 10, ia: 'vide', attendu: 'echec', tier: 'standard' },
  { id: 'PQ-2', nom: 'panne en Expert (Signature)', solde: 10, ia: 'leve', artisan: { plan: 'signature' }, config: { mode_reponse: 'assistee', modele: 'expert' }, attendu: 'echec', tier: 'expert', panne: true },
  { id: 'PQ-3', nom: 'solde 0 (Studio, assistée)', solde: 0, attendu: 'sans_credit' },
  { id: 'PQ-3', nom: 'solde 2 pour un modèle Expert à 3 (Signature)', solde: 2, artisan: { plan: 'signature' }, config: { mode_reponse: 'assistee', modele: 'expert' }, attendu: 'sans_credit' },
  { id: 'PQ-4', nom: 'auto (Studio)', solde: 10, artisan: { plan: 'studio' }, config: { mode_reponse: 'auto' }, attendu: 'auto' },
  { id: 'PQ-4', nom: 'manuel', solde: 10, config: { mode_reponse: 'manuelle' }, attendu: 'silence' },
  { id: 'PQ-4', nom: 'pause', solde: 10, artisan: { leads_pause: true }, attendu: 'pause' },
  { id: 'PQ-4', nom: 'mot d’escalade en auto (Studio)', solde: 10, artisan: { plan: 'studio' }, config: { mode_reponse: 'auto' }, message: (m) => `Bonjour, j'ai une fuite sous l'évier depuis ce matin. Repère ${m}.`, attendu: 'silence' },
  { id: 'PQ-5', nom: 'la même demande envoyée deux fois, dix crédits', solde: 10, envois: 2, attendu: 'rejeu', tier: 'standard' },
  { id: 'PQ-5', nom: 'la même demande envoyée deux fois, un seul crédit', solde: 1, envois: 2, attendu: 'rejeu_un_credit', tier: 'standard' },
]

// ── Constats ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const RE_PROPOSEE = /r[ée]ponse\s+propos[ée]e/i
const RE_A_VALIDER = /[àa]\s+valider/i
const RE_A_VOUS = /[àa]\s+vous\s+de\s+r[ée]pondre/i
const texteNotif = (n) => `${n?.contenu?.subject ?? ''}\n${n?.contenu?.text ?? ''}`
const estSortantReel = (m) => m.sens === 'out' && (m.etat === null || m.etat === undefined)
function constats(W, reponses) {
  const leads = W.base.leads
  const msgs = W.base.messages
  const deLead = (id) => msgs.filter((m) => m.lead_id === id)
  const propositions = msgs.filter((m) => m.etat === 'proposition')
  const notifsDe = (lead, i) => { const n = W.notifs.filter((x) => x.contenu && x.contenu.leadId === lead.id); return n.length || W.notifs.some((x) => x.contenu && x.contenu.leadId) ? n : (W.notifs[i] ? [W.notifs[i]] : []) }
  const solde = W.credits.solde.get(ART)
  return { leads, msgs, deLead, propositions, notifsDe, solde }
}
/** Défauts communs à tout envoi : réponse 200 ok avec l'identifiant de la demande enregistrée. */
function defautsReponse(r, lead) {
  const d = []
  if (r.erreur) d.push(`POST lève « ${r.erreur} »`)
  else if (r.statut !== 200) d.push(`réponse ${r.statut} (${court(JSON.stringify(r.corps), 90)}), 200 attendu`)
  else if (!r.corps || r.corps.ok !== true) d.push(`réponse sans ok: true (${court(JSON.stringify(r.corps), 90)})`)
  if (lead && r.corps && r.corps.leadId !== undefined && r.corps.leadId !== lead.id) d.push(`leadId ${r.corps.leadId}, ${lead.id} enregistré`)
  return d
}
function defautsDemandeGardee(c, W, lead) {
  const d = []
  if (!lead) return ['aucune demande enregistrée']
  if (lead.artisan_id !== ART) d.push(`demande enregistrée pour ${lead.artisan_id}`)
  if (!c.deLead(lead.id).some((m) => m.sens === 'in' && m.contenu === W.message)) d.push('le message du prospect n’est pas gardé (aucun message « in » à son texte)')
  return d
}
function defautsAccuse(W, rien) {
  if (!String(W.contact).includes('@')) return W.emails.length ? [`${W.emails.length} e-mail(s) envoyé(s) alors que le prospect n’a qu’un téléphone`] : []
  const auProspect = W.emails.filter((e) => e && e.to === W.contact)
  const d = []
  if (auProspect.length !== 1) d.push(`${auProspect.length} e-mail(s) au prospect, l’accusé de réception seul attendu (1)`)
  for (const t of rien) if (t && auProspect.some((e) => `${e.subject}\n${e.text}\n${e.html ?? ''}`.includes(t))) d.push('un e-mail au prospect porte le texte préparé : la proposition est partie chez le client')
  return d
}
/** PQ-1 : une demande, sa proposition. */
function defautsProposition({ W, reponses }, sc, attendu) {
  const c = constats(W, reponses)
  const d = []
  const lead = c.leads[0]
  d.push(...defautsReponse(reponses[0], lead))
  if (c.leads.length !== 1) d.push(`${c.leads.length} demande(s) enregistrée(s), une attendue`)
  d.push(...defautsDemandeGardee(c, W, lead))
  if (!lead) return d
  const props = c.propositions.filter((m) => m.lead_id === lead.id)
  const rendus = W.ia.appels.map((a) => a.rendu).filter(Boolean)
  if (W.ia.appels.length !== 1) d.push(`IA appelée ${W.ia.appels.length} fois, une attendue`)
  else if (!JSON.stringify(W.ia.appels[0].args).includes(W.marque)) d.push(`l’IA (${W.ia.appels[0].nom}) n’a pas reçu le message du prospect`)
  if (props.length !== 1) d.push(`${props.length} proposition(s) (etat 'proposition') pour la demande, une attendue${c.propositions.length !== props.length ? ` (${c.propositions.length - props.length} sur une autre demande)` : ''}`)
  else {
    const p = props[0]
    if (p.sens !== 'out') d.push(`proposition de sens « ${p.sens} », « out » attendu`)
    if (p.type !== 'reponse_auto') d.push(`proposition de type « ${p.type} », « reponse_auto » attendu`)
    if (!p.contenu || !rendus.includes(String(p.contenu).trim())) d.push(`contenu de la proposition « ${court(p.contenu, 60)} » : pas le texte rendu par l’IA`)
  }
  const reels = c.msgs.filter(estSortantReel)
  if (reels.length) d.push(`${reels.length} message(s) sortant(s) réel(s) (etat nul) : la réponse est partie chez le client`)
  const rep = reponses[0]?.corps
  if (rep && rep.reply) d.push(`la réponse JSON rend au client un texte (reply « ${court(rep.reply, 50)} ») : la proposition ne doit pas lui être montrée`)
  if (rep && rendus.some((t) => JSON.stringify(rep).includes(t))) d.push('la réponse JSON contient le texte préparé')
  // crédits
  const cons = W.credits.consommes.filter((e) => e.uid === ART)
  const ok = cons.filter((e) => e.ok)
  if (ok.length !== 1) d.push(`${ok.length} débit(s) de crédit réussi(s), un attendu (${cons.length} tentative(s))`)
  else if (ok[0].tier !== attendu.tier) d.push(`crédit débité au palier « ${ok[0].tier} », « ${attendu.tier} » attendu (resolveModel(cfg.modele || 'standard', plan))`)
  if (W.credits.rendus.length) d.push(`${W.credits.rendus.length} crédit(s) rendu(s) alors que la proposition est écrite`)
  if (c.solde !== sc.solde - (W.cout[attendu.tier] ?? 1)) d.push(`solde final ${c.solde}, ${sc.solde - (W.cout[attendu.tier] ?? 1)} attendu (${sc.solde} − ${W.cout[attendu.tier]})`)
  if (attendu.modeleServi && W.ia.appels.length && !W.ia.appels[0].args.some((a) => a === attendu.modeleServi)) d.push(`modèle ${attendu.modeleServi} (${attendu.tier}, débité ${W.cout[attendu.tier]} crédits) non passé à l’IA : l’artisan paierait l’Expert pour un autre modèle`)
  // notification (coordonnées différées : aucune avant /api/leads/contact, comme aujourd'hui)
  const n = c.notifsDe(lead, 0)
  if (sc.differe) { if (W.notifs.length) d.push(`${W.notifs.length} notification(s) avant la capture des coordonnées : aujourd’hui l’artisan est prévenu par /api/leads/contact`) }
  else if (n.length !== 1) d.push(`${n.length} notification(s) à l’artisan pour la demande, une attendue`)
  else {
    const t = texteNotif(n[0])
    if (!RE_PROPOSEE.test(t) || !RE_A_VALIDER.test(t)) d.push(`notification sans « Réponse proposée … à valider » (« ${court(t, 90)} »)`)
    if (RE_A_VOUS.test(t)) d.push('la notification dit « à vous de répondre » alors qu’une réponse est prête')
  }
  d.push(...defautsAccuse(W, rendus))
  if (lead.statut === 'repondu') d.push('demande passée en « repondu » alors que rien n’est parti')
  if (W.base.relances.length) d.push(`${W.base.relances.length} relance(s) planifiée(s) avant toute réponse envoyée`)
  return d
}
/** PQ-2 : la génération tentée, le crédit rendu, rien de perdu. */
function defautsEchec({ W, reponses }, sc, attendu) {
  const c = constats(W, reponses)
  const d = []
  const lead = c.leads[0]
  d.push(...defautsReponse(reponses[0], lead))
  d.push(...defautsDemandeGardee(c, W, lead))
  if (!lead) return d
  if (W.ia.appels.length !== 1) d.push(W.ia.appels.length ? `IA appelée ${W.ia.appels.length} fois, une attendue` : 'la génération n’a pas été tentée (IA jamais appelée) : aucune réponse n’est préparée en mode assisté')
  if (c.propositions.length) d.push(`${c.propositions.length} proposition(s) écrite(s) malgré l’échec (${court(c.propositions[0].contenu, 40)})`)
  if (c.msgs.some(estSortantReel)) d.push('un message sortant réel malgré l’échec')
  const ok = W.credits.consommes.filter((e) => e.uid === ART && e.ok)
  if (ok.length !== 1) d.push(`${ok.length} débit(s) de crédit réussi(s), un attendu (débiter, puis rendre)`)
  else if (ok[0].tier !== attendu.tier) d.push(`débit au palier « ${ok[0].tier} », « ${attendu.tier} » attendu`)
  if (W.credits.rendus.length !== ok.length) d.push(`${W.credits.rendus.length} crédit(s) rendu(s) pour ${ok.length} débit(s)`)
  else if (ok[0] && W.credits.rendus[0] && (W.credits.rendus[0].uid !== ART || W.credits.rendus[0].tier !== ok[0].tier)) d.push(`crédit rendu au palier « ${W.credits.rendus[0].tier} » pour un débit « ${ok[0].tier} »`)
  if (c.solde !== sc.solde) d.push(`solde final ${c.solde}, ${sc.solde} attendu : l’artisan paie une réponse qu’il n’a pas eue`)
  const n = c.notifsDe(lead, 0)
  if (n.length !== 1) d.push(`${n.length} notification(s) à l’artisan, une attendue`)
  else {
    const t = texteNotif(n[0])
    if (!RE_A_VOUS.test(t)) d.push(`notification sans « à vous de répondre » (« ${court(t, 80)} »)`)
    if (RE_PROPOSEE.test(t)) d.push('la notification annonce une « réponse proposée » qui n’existe pas')
  }
  if (attendu.panne && !W.pannes.length) d.push('l’entreprise n’est pas prévenue de la panne (signalerPanneIA jamais appelé)')
  d.push(...defautsAccuse(W, []))
  if (lead.statut === 'repondu') d.push('demande passée en « repondu »')
  return d
}
/** PQ-3 : sans crédit, rien de rédigé, rien de perdu. */
function defautsSansCredit({ W, reponses }, sc) {
  const c = constats(W, reponses)
  const d = []
  const lead = c.leads[0]
  d.push(...defautsReponse(reponses[0], lead))
  d.push(...defautsDemandeGardee(c, W, lead))
  if (!lead) return d
  if (W.ia.appels.length) d.push(`IA appelée ${W.ia.appels.length} fois sans crédit`)
  if (c.propositions.length) d.push(`${c.propositions.length} proposition(s) écrite(s) sans crédit`)
  if (c.msgs.some(estSortantReel)) d.push('un message sortant réel sans crédit')
  if (c.solde !== sc.solde) d.push(`solde final ${c.solde}, ${sc.solde} attendu`)
  if (c.solde < 0) d.push('solde négatif')
  const n = c.notifsDe(lead, 0)
  if (n.length !== 1) d.push(`${n.length} notification(s) à l’artisan, une attendue`)
  else {
    const t = texteNotif(n[0])
    if (!RE_A_VOUS.test(t)) d.push(`notification sans « à vous de répondre » (« ${court(t, 80)} »)`)
    if (RE_PROPOSEE.test(t)) d.push('la notification annonce une « réponse proposée » qui n’existe pas')
  }
  d.push(...defautsAccuse(W, []))
  return d
}
/** PQ-4 : auto, manuel, pause, escalade — comme aujourd'hui. */
function defautsAutresModes({ W, reponses }, sc) {
  const c = constats(W, reponses)
  const d = []
  const lead = c.leads[0]
  d.push(...defautsReponse(reponses[0], lead))
  if (!lead) return [...d, 'aucune demande enregistrée']
  if (c.propositions.length) d.push(`${c.propositions.length} proposition(s) écrite(s) en mode ${sc.attendu}`)
  if (sc.attendu === 'auto') {
    const rendus = W.ia.appels.map((a) => a.rendu).filter(Boolean)
    if (W.ia.appels.length !== 1) d.push(`IA appelée ${W.ia.appels.length} fois, une attendue`)
    const texte = rendus[0]
    const reels = c.deLead(lead.id).filter(estSortantReel)
    if (!texte) d.push('aucun texte rendu par l’IA')
    else {
      if (reponses[0]?.corps?.reply !== texte) d.push(`reply « ${court(reponses[0]?.corps?.reply, 50)} » : la réponse n’est plus rendue au prospect`)
      if (!(reels.length === 1 && reels[0].type === 'reponse_auto' && reels[0].contenu === texte)) d.push(`${reels.length} message(s) sortant(s) réel(s), un « reponse_auto » au texte de l’IA attendu`)
      if (!W.emails.some((e) => e && e.to === W.contact && String(e.text ?? '').includes(texte))) d.push('la réponse n’est plus envoyée par e-mail au prospect')
    }
    if (lead.statut !== 'repondu') d.push(`statut « ${lead.statut} », « repondu » attendu`)
    if (W.base.relances.filter((r) => r.lead_id === lead.id).length !== 3) d.push(`${W.base.relances.length} relance(s) planifiée(s), trois attendues`)
    const ok = W.credits.consommes.filter((e) => e.ok)
    if (ok.length !== 1) d.push(`${ok.length} débit(s) de crédit, un attendu`)
    if (W.credits.rendus.length) d.push('crédit rendu alors que la réponse est partie')
    const n = c.notifsDe(lead, 0)
    if (n.length !== 1) d.push(`${n.length} notification(s) à l’artisan, une attendue`)
    else if (RE_PROPOSEE.test(texteNotif(n[0]))) d.push('la notification parle d’une « réponse proposée » en mode auto')
  } else {
    if (W.ia.appels.length) d.push(`IA appelée ${W.ia.appels.length} fois en mode ${sc.attendu}`)
    if (W.credits.consommes.some((e) => e.ok)) d.push(`crédit débité en mode ${sc.attendu}`)
    if (c.msgs.some(estSortantReel)) d.push(`message sortant réel en mode ${sc.attendu}`)
    if (c.solde !== sc.solde) d.push(`solde final ${c.solde}, ${sc.solde} attendu`)
    if (sc.attendu === 'pause') { if (reponses[0]?.corps?.paused !== true) d.push('réponse sans paused: true') }
    else {
      const n = c.notifsDe(lead, 0)
      if (n.length !== 1) d.push(`${n.length} notification(s) à l’artisan, une attendue`)
      else if (!RE_A_VOUS.test(texteNotif(n[0])) || RE_PROPOSEE.test(texteNotif(n[0]))) d.push(`notification « ${court(texteNotif(n[0]), 80)} », « à vous de répondre » attendu`)
    }
  }
  return d
}
/** PQ-5 : deux envois identiques. */
function defautsRejeu({ W, reponses }, sc) {
  const c = constats(W, reponses)
  const d = []
  if (c.leads.length !== 2) return [`${c.leads.length} demande(s) enregistrée(s) pour deux envois, deux attendues`]
  reponses.forEach((r, i) => { for (const x of defautsReponse(r, c.leads[i])) d.push(`envoi ${i + 1} : ${x}`) })
  const parLead = c.leads.map((l) => c.propositions.filter((m) => m.lead_id === l.id).length)
  if (c.propositions.some((m) => !c.leads.some((l) => l.id === m.lead_id))) d.push('une proposition rattachée à aucune des deux demandes')
  if (parLead.some((n) => n > 1)) d.push(`une demande porte ${Math.max(...parLead)} propositions`)
  const ok = W.credits.consommes.filter((e) => e.ok)
  if (c.solde < 0) d.push('solde négatif')
  if (sc.attendu === 'rejeu') {
    if (parLead.join(',') !== '1,1') d.push(`propositions par demande : ${parLead.join(' et ')}, une chacune attendue`)
    if (W.ia.appels.length !== 2) d.push(`IA appelée ${W.ia.appels.length} fois, deux attendues`)
    if (ok.length !== 2) d.push(`${ok.length} débit(s), deux attendus`)
    if (c.solde !== sc.solde - 2 * (W.cout.standard ?? 1)) d.push(`solde final ${c.solde}, ${sc.solde - 2 * (W.cout.standard ?? 1)} attendu`)
    c.leads.forEach((l, i) => { const n = c.notifsDe(l, i); if (n.length !== 1 || !RE_PROPOSEE.test(texteNotif(n[0]))) d.push(`demande ${i + 1} : ${n.length} notification(s), une « Réponse proposée » attendue`) })
  } else {
    if (parLead.join(',') !== '1,0') d.push(`propositions par demande : ${parLead.join(' et ')}, « 1 puis 0 » attendu (un seul crédit)`)
    if (ok.length !== 1) d.push(`${ok.length} débit(s) réussi(s), un attendu`)
    if (c.solde !== 0) d.push(`solde final ${c.solde}, 0 attendu`)
    const n2 = c.notifsDe(c.leads[1], 1)
    if (n2.length !== 1 || !RE_A_VOUS.test(texteNotif(n2[0])) || RE_PROPOSEE.test(texteNotif(n2[0]))) d.push(`seconde demande (sans crédit) : ${n2.length} notification(s), « à vous de répondre » attendu`)
    for (const [i, l] of c.leads.entries()) if (!c.deLead(l.id).some((m) => m.sens === 'in')) d.push(`demande ${i + 1} : message du prospect non gardé`)
  }
  return d
}
const JUGES = { proposition: defautsProposition, echec: defautsEchec, sans_credit: defautsSansCredit, auto: defautsAutresModes, silence: defautsAutresModes, pause: defautsAutresModes, rejeu: defautsRejeu, rejeu_un_credit: defautsRejeu }

// ── Juger PQ-1 à PQ-5 ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** Ce que le juge attend de resolveModel (vrai lib/models.ts de la racine) et de CREDIT_COST (vrai lib/plans.ts). */
async function referentiel(racine) {
  const plans = await charger({ racine, fichier: 'lib/plans.ts' })
  const models = await charger({ racine, fichier: 'lib/models.ts' })
  if (!plans.CREDIT_COST || typeof models.resolveModel !== 'function') throw new Error('lib/plans.ts (CREDIT_COST) ou lib/models.ts (resolveModel) illisible')
  return { cout: { ...plans.CREDIT_COST }, resolveModel: models.resolveModel }
}
/** Joue les scénarios des critères `ids` → Map id → { echecs[], faits[] } */
export async function jugerComportement({ racine, source = null, ids = ['PQ-1', 'PQ-2', 'PQ-3', 'PQ-4', 'PQ-5'] }) {
  const ref = await referentiel(racine)
  const res = new Map(ids.map((id) => [id, { echecs: [], faits: [] }]))
  let propositionsMax = 0
  for (const sc of SCENARIOS.filter((s) => ids.includes(s.id))) {
    const cible = res.get(sc.id)
    const attendu = { ...sc }
    if (sc.modele) attendu.modeleServi = ref.resolveModel(sc.modele, sc.artisan?.plan || 'studio').model
    if (sc.tier && sc.modele) { const r = ref.resolveModel(sc.modele, sc.artisan?.plan || 'studio'); if (r.tier !== sc.tier) throw new Error(`référentiel : resolveModel(${sc.modele}, ${sc.artisan?.plan}) rend ${r.tier}, le scénario attend ${sc.tier}`) }
    let x
    try { x = await jouer({ racine, source, sc, cout: ref.cout }) } catch (e) { cible.echecs.push(`« ${sc.nom} » : route non chargée (${premiereLigne(e)})`); continue }
    const d = JUGES[sc.attendu](x, sc, attendu)
    if (x.W.reseau.length) d.push(`${x.W.reseau.length} appel(s) réseau hors doublures (${x.W.reseau.slice(0, 2).join(', ')})`)
    const parLead = new Map()
    for (const m of x.W.base.messages.filter((y) => y.etat === 'proposition')) parLead.set(m.lead_id, (parLead.get(m.lead_id) || 0) + 1)
    propositionsMax = Math.max(propositionsMax, ...parLead.values(), 0)
    if (d.length) cible.echecs.push(`« ${sc.nom} » : ${d.join(' ; ')}${x.W.traces.length ? ` [journal de la route : ${court(x.W.traces.join(' | '), 140)}]` : ''}`)
    else cible.faits.push(sc.nom)
  }
  if (res.has('PQ-5') && propositionsMax > 1) res.get('PQ-5').echecs.push(`une demande a reçu ${propositionsMax} propositions dans un des scénarios du juge`)
  return res
}

// ── Sondes du détecteur : le témoin, muté une fois par critère, doit être vu ────────────────────────────────────────────────
export const MUTATIONS = [
  { id: 'PQ-1', nom: 'proposition écrite en message réel (etat nul)', de: "etat: 'proposition', modele: tier", vers: 'etat: null, modele: tier' },
  { id: 'PQ-1', nom: 'rien de préparé quand les coordonnées sont différées (page /p)', de: 'const credit = message ? await consumeCredit(', vers: 'const credit = message && !deferContact ? await consumeCredit(' },
  { id: 'PQ-2', nom: 'crédit jamais rendu', de: 'if (!proposee) await rendreCredit(artisan.id, tier, !!artisan.is_founder)', vers: '' },
  { id: 'PQ-3', nom: 'génération sans crédit', de: 'if (credit.ok) {', vers: 'if (true) {' },
  { id: 'PQ-4', nom: 'le mode auto traité comme l’assisté', de: "if (!decision.ok && decision.comportement === 'preparer') {", vers: "if ((!decision.ok && decision.comportement === 'preparer') || decision.ok) {" },
  { id: 'PQ-5', nom: 'proposition écrite deux fois', de: 'proposee = !eProp', vers: "proposee = !eProp\n          await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'out', type: 'reponse_auto', contenu: proposition.trim(), etat: 'proposition', modele: tier })" },
]
export async function sondes({ racine, ids }) {
  const out = new Map(ids.map((id) => [id, { echecs: [], faits: [] }]))
  const brut = fs.existsSync(TEMOIN_ROUTE) ? fs.readFileSync(TEMOIN_ROUTE, 'utf8').replace(/\r\n/g, '\n') : null
  for (const id of ids) {
    const o = out.get(id)
    if (!brut) { o.echecs.push(`sonde impossible : ${rel(TEMOIN_ROUTE)} absent`); continue }
    const propre = await jugerComportement({ racine, source: brut, ids: [id] })
    if (propre.get(id).echecs.length) o.echecs.push(`détecteur trop strict : le témoin échoue (${court(propre.get(id).echecs[0], 160)})`)
    for (const m of MUTATIONS.filter((x) => x.id === id)) {
      if (!brut.includes(m.de)) { o.echecs.push(`sonde « ${m.nom} » cassée : le témoin ne contient plus « ${court(m.de, 50)} »`); continue }
      const mute = await jugerComportement({ racine, source: brut.replace(m.de, () => m.vers), ids: [id] })
      if (!mute.get(id).echecs.length) o.echecs.push(`détecteur aveugle : la mutation « ${m.nom} » passe`)
      else o.faits.push(`mutation « ${m.nom} » → vue`)
    }
  }
  return out
}

// ── PQ-6 : typecheck ──────────────────────────────────────────────────────────────────────────────────────────────────────
export function jugerTypecheck(racine) {
  const echecs = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, resume })
  if (!fichierNonVide(path.join(racine, 'package.json')) || !fichierNonVide(path.join(racine, 'tsconfig.json'))) { echecs.push('package.json ou tsconfig.json absent de la racine'); return fin('') }
  const dossierInfo = path.join(TRAVAIL, JUGE, 'tsbuildinfo')
  fs.mkdirSync(exigerSousTravail(dossierInfo), { recursive: true })
  const info = path.join(dossierInfo, `${crypto.createHash('sha1').update(cleChemin(racine)).digest('hex').slice(0, 10)}.tsbuildinfo`)
  if (/[\s"&|<>^%]/.test(info)) throw new Error(`chemin du tsbuildinfo inutilisable dans une ligne de commande : ${info}`)
  const t0 = Date.now()
  const r = lancer(`npm run typecheck -- --tsBuildInfoFile ${posix(info)} --listFiles`, [], { cwd: racine, shell: true, timeout: 400_000, env: { NO_UPDATE_NOTIFIER: '1' } })
  const duree = ((Date.now() - t0) / 1000).toFixed(0)
  const lignes = r.sortie.split(/\r?\n/)
  const vus = new Set(lignes.map((l) => l.trim()).filter((l) => /^([A-Za-z]:[\\/]|\/)/.test(l)).map((l) => cleChemin(l)))
  if (r.code !== 0) {
    const erreurs = lignes.filter((l) => /error TS\d+/.test(l))
    echecs.push(`npm run typecheck en code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} en ${duree} s : ${erreurs.length ? `${erreurs.length} erreur(s), ${erreurs.slice(0, 3).map((l) => court(l, 140)).join(' | ')}` : court(lignes.filter((l) => l.trim()).slice(-3).join(' | '), 240)}`)
  }
  const attendus = []
  for (const d of ['app', 'lib']) for (const f of listerFichiers(path.join(racine, d))) if (/\.tsx?$/.test(f) && !f.split('/').some((x) => x.startsWith('.'))) attendus.push(`${d}/${f}`)
  if (!attendus.includes(ROUTE)) echecs.push(`${ROUTE} absent : rien à vérifier`)
  const manquants = attendus.filter((f) => !vus.has(cleChemin(path.join(racine, f))))
  if (manquants.length) echecs.push(`${manquants.length} fichier(s) de app/ et lib/ hors de la vérification (${manquants.slice(0, 3).join(', ')})${vus.size ? '' : ' : aucune liste de fichiers, tsc a-t-il tourné ?'}`)
  for (const x of defautsTypecheck(racine, [ROUTE])) echecs.push(x)
  return fin(`npm run typecheck en code 0 (${duree} s) ; ${attendus.length} fichiers .ts/.tsx de app/ et lib/ vérifiés, route comprise ; ni @ts-nocheck ni @ts-ignore ajouté dans la route ; tsconfig.json et script typecheck de ${REFERENCE_COMMIT}`)
}

// ── Témoin ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function construireTemoin(base = R) {
  if (!fichierNonVide(TEMOIN_ROUTE)) throw new Error(`témoin absent ou vide : ${rel(TEMOIN_ROUTE)}`)
  const copier = ['app', 'lib', 'package.json', 'tsconfig.json', ...['middleware.ts', 'next-env.d.ts'].filter((f) => fs.existsSync(path.join(base, f)))]
  const dest = preparerTemoin(JUGE, { base, copier, superposer: null })
  fs.copyFileSync(TEMOIN_ROUTE, path.join(dest, ROUTE))
  return { dest, copies: copier }
}

// ── Le juge ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['critere'] })
  if (o.reel) { console.error('✗ proposition-qa n’a pas de --reel : tout se juge en local, contre un faux Supabase'); process.exit(2) }
  if (o.positionnels.length) { console.error(`✗ argument(s) inattendu(s) : ${o.positionnels.join(' ')}`); process.exit(2) }
  const ids = o.valeur('critere') === undefined ? IDS : o.liste('critere')
  if (o.drapeau('critere') || !ids.length || ids.some((x) => !IDS.includes(x)) || new Set(ids).size !== ids.length) { console.error(`✗ --critere attend des critères de ${IDS.join(', ')} (ex. --critere=PQ-1,PQ-2)`); process.exit(2) }
  const racineAffichee = o.temoin ? path.join(TRAVAIL, JUGE, 'temoin') : o.racine
  const s = creerSortie(JUGE, ids, { racine: racineAffichee, temoin: o.temoin })
  if (ids !== IDS) s.note(`--critere : seulement ${ids.join(', ')} (les autres critères ne sont pas jugés)`)
  await s.executer(async () => {
    let racine = o.racine
    if (o.temoin) {
      const t = construireTemoin(o.racine)
      racine = t.dest
      s.note(`témoin : ${t.copies.join(', ')} copiés depuis ${o.racine} ; ${ROUTE} remplacé par ${rel(TEMOIN_ROUTE)}`)
    }
    s.note(`${ROUTE} de ${racine} contre un faux Supabase ; vrais lib/plateformeConfig, lib/plans, lib/models de la racine ; IA, crédits, e-mails et notifications en doublures ; fetch piégé`)
    const comportement = ids.filter((x) => x !== 'PQ-6')
    if (comportement.length) {
      const r = await jugerComportement({ racine, ids: comportement })
      const z = await sondes({ racine, ids: comportement })
      for (const id of comportement) {
        const a = r.get(id), b = z.get(id)
        const echecs = [...a.echecs, ...b.echecs]
        if (echecs.length) for (const e of echecs) s.echoue(id, e)
        else s.passe(id, `${a.faits.length} scénario(s) : ${a.faits.join(' ; ')} ; ${b.faits.join(' ; ')}`)
      }
    }
    if (ids.includes('PQ-6')) s.resultat('PQ-6', jugerTypecheck(racine))
  })
}
const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) await principal()
