// scripts/fixtures/026-livraison-tresor/d/doublures.mjs — les doublures des juges du lot D (fiche 026-026), écrites par Claude
// Code le 27/09. Le crochet de résolution (CROCHET de ../commun.mjs, enregistré par preparerEnfantD de commun-d.mjs) sert CE
// fichier, avec une requête différente, à la place des modules doublés. Il reprend tout le socle de ../a/doublures.mjs (base
// en mémoire, sendEmail consigné, limites, garde, alertes, drapeaux, Stripe figé) et y ajoute :
//   supabaseAdmin.from    la base en mémoire du socle, enveloppée : chaque requête est consignée avec ses filtres (X.requetes :
//                         { table, genre, filtres: [[méthode, colonne, valeur]], valeurs }) ; une table de X.pannes répond
//                         une erreur à tout ; X.apresEcriture(requete, reponse) est appelé après chaque écriture (un scénario
//                         y change une ligne « entre-temps », pour éprouver une mise à jour conditionnelle)
//   supabaseAdmin.rpc     POST vers le faux PostgREST (scripts/lib/faux-postgrest.mjs) démarré par le juge (X.rpc.url), par
//                         node:http sur 127.0.0.1 : le contrat contrat-ops.json juge les noms et les types ; X.rpc.leve : lève
//   supabaseAdmin.storage des seaux en mémoire (X.seaux : Map chemin → { octets, type }) : list (dossiers id null, search en
//                         préfixe, limit, offset), download (Blob), upload (upsert), remove ; tout est consigné (X.stockage) ;
//                         X.surUpload(seau, chemin) est appelé après chaque dépôt
//   lib/vercelDomains     addDomain (statut) / removeDomain (booléen) consignés (X.domaines) ; X.modeDomaine : ok | refuse | leve
//   lib/direction/reconfirmation  exigerReconfirmation : null si l'en-tête x-presti-reconfirmation vaut X.jetonReco, sinon
//                         403 { code: 'reconfirmation_requise' } ; chaque appel consigné avec sa portée
//   supabaseAdmin.auth.admin  deleteUser / updateUserById consignés (X.auth) ; X.authPanne : erreur ; le reste refusé
//   espions (X.espions : { module, nom, args, rang })  lib/siteDossier, lib/siteRetrait, lib/siteLivraisonBus,
//                         lib/siteGenerationDistante, lib/siteLivraisonUsine, lib/siteAchatPublic, lib/siteLivraison
//                         (tourLivraison), app/controle/client (apiDirection) ; un espion lève si son nom est dans X.leve,
//                         rend X.rendus[nom] s'il y est. Le rang (X.rang) est commun aux espions et aux requêtes : il
//                         ordonne « relevé avant l'effacement ».
// Chaque instance exporte l'union des noms. L'état est partagé par globalThis.__doublesLt026 (socle) et
// globalThis.__doublesLt026d (lot D). Aucun réseau hors 127.0.0.1, aucun fichier écrit, aucune variable d'environnement lue.
import http from 'node:http'
import * as A from '../a/doublures.mjs'

export * from '../a/doublures.mjs'
const E = A.etat
const X = (globalThis.__doublesLt026d ??= {
  seaux: {}, stockage: [], stockagePanne: false, requetes: [], pannes: new Set(), apresEcriture: null, surUpload: null,
  rpc: { url: null, leve: false, appels: [] }, domaines: [], modeDomaine: 'ok', reconfirmations: [], jetonReco: 'reconfirmation-temoin-026d',
  espions: [], retraitsDus: [], retraitsDusLeve: false, api: null, jetons: 0,
  rang: 0, auth: [], authPanne: false, leve: new Set(), rendus: {},
})
export const etatD = X

/** Remise à zéro du socle (conf : tables, dns, modeEmail…) et du lot D (seaux : { nom: { chemin: { octets, type } } }). */
export function reinitialiserD(conf = {}) {
  A.reinitialiser(conf)
  X.seaux = {}
  for (const [nom, fichiers] of Object.entries(conf.seaux ?? {})) {
    const m = new Map()
    for (const [k, v] of Object.entries(fichiers)) m.set(k, { octets: Buffer.from(v.octets), type: v.type ?? 'application/octet-stream' })
    X.seaux[nom] = m
  }
  X.stockage.length = 0; X.stockagePanne = false; X.requetes.length = 0; X.pannes = new Set(conf.pannes ?? []); X.apresEcriture = null; X.surUpload = null
  X.rpc.leve = false; X.rpc.appels.length = 0; X.domaines.length = 0; X.modeDomaine = conf.modeDomaine ?? 'ok'; X.reconfirmations.length = 0
  X.espions.length = 0; X.retraitsDus = conf.retraitsDus ?? []; X.retraitsDusLeve = false; X.api = null; X.jetons = 0
  X.rang = 0; X.auth.length = 0; X.authPanne = false; X.leve = new Set(conf.leve ?? []); X.rendus = structuredClone(conf.rendus ?? {})
}

// ── lib/supabaseAdmin ────────────────────────────────────────────────────────────────────────────────────────────────────
const ECRITURES = ['insert', 'upsert', 'update', 'delete']
const FILTRES = ['eq', 'neq', 'is', 'in', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'not', 'filter', 'match']
const copie = (v) => { try { return structuredClone(v) } catch { return String(v) } }
function envelopper(table, inner) {
  const q = { table, genre: 'select', filtres: [], valeurs: null }
  const p = new Proxy(inner, {
    get(cible, prop) {
      if (prop === 'then') {
        return (ok, ko) => cible.then((rep) => {
          const trace = { ...copie(q), erreur: rep?.error?.message ?? null, lignes: Array.isArray(rep?.data) ? rep.data.length : rep?.data ? 1 : 0, rang: ++X.rang }
          X.requetes.push(trace)
          if (q.genre !== 'select') { try { X.apresEcriture?.(trace, rep) } catch { /* scénario */ } }
          return rep
        }).then(ok, ko)
      }
      const v = cible[prop]
      if (typeof v !== 'function') return v
      return (...args) => {
        if (ECRITURES.includes(prop)) { q.genre = prop; q.valeurs = args[0] === undefined ? null : copie(args[0]) }
        if (FILTRES.includes(prop)) q.filtres.push([prop, ...args.map(copie)])
        const r = v.apply(cible, args)
        return r === cible ? p : r
      }
    },
  })
  return p
}
function enPanne(table) {
  const q = { table, genre: 'select', filtres: [], valeurs: null, panne: true }
  const rep = { data: null, error: { message: `table ${table} indisponible (panne de la doublure du lot D)`, code: 'PANNE' }, count: null }
  const p = new Proxy(function () {}, {
    get(_c, prop) {
      if (prop === 'then') return (ok, ko) => { X.requetes.push({ ...copie(q), erreur: rep.error.message, lignes: 0 }); return Promise.resolve(rep).then(ok, ko) }
      return (...args) => { if (ECRITURES.includes(prop)) { q.genre = prop; q.valeurs = copie(args[0]) } if (FILTRES.includes(prop)) q.filtres.push([prop, ...args.map(copie)]); return p }
    },
  })
  return p
}
function posterJson(url, corps) {
  return new Promise((ok, ko) => {
    const u = new URL(url)
    const texte = JSON.stringify(corps ?? {})
    const req = http.request({ agent: false, hostname: '127.0.0.1', port: u.port, path: u.pathname, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(texte) } }, (res) => {
      let t = ''
      res.setEncoding('utf8')
      res.on('data', (d) => { t += d })
      res.on('end', () => { let body = null; try { body = t ? JSON.parse(t) : null } catch { body = t } ok({ status: res.statusCode, body }) })
    })
    req.on('error', ko)
    req.end(texte)
  })
}
async function rpc(nom, params = {}) {
  X.rpc.appels.push({ nom, params: copie(params) })
  if (X.rpc.leve) throw new Error(`rpc ${nom} : connexion coupée (doublure du lot D)`)
  if (!X.rpc.url) { E.inconnues.push(`rpc(${nom}) sans faux PostgREST démarré`); return { data: null, error: { message: `rpc ${nom} : aucun faux PostgREST`, code: 'DOUBLURE' } } }
  const r = await posterJson(`${X.rpc.url}/rest/v1/rpc/${nom}`, params ?? {})
  if (r.status >= 400) return { data: null, error: r.body && typeof r.body === 'object' ? r.body : { message: `HTTP ${r.status}` }, status: r.status }
  return { data: r.body, error: null, status: r.status }
}

// ── Le stockage ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const norm = (p) => String(p ?? '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
async function octetsDe(corps) {
  if (corps == null) return Buffer.alloc(0)
  if (Buffer.isBuffer(corps)) return Buffer.from(corps)
  if (corps instanceof Uint8Array) return Buffer.from(corps)
  if (corps instanceof ArrayBuffer) return Buffer.from(corps)
  if (typeof corps === 'string') return Buffer.from(corps, 'utf8')
  if (typeof corps.arrayBuffer === 'function') return Buffer.from(await corps.arrayBuffer())
  throw new Error(`corps de dépôt illisible par la doublure (${Object.prototype.toString.call(corps)})`)
}
function seau(nom) {
  const m = () => (X.seaux[nom] ??= new Map())
  const panne = () => ({ data: null, error: { message: `stockage ${nom} indisponible (panne de la doublure)`, statusCode: '503' } })
  return {
    async list(prefixe = '', o = {}) {
      X.stockage.push({ seau: nom, op: 'list', chemin: norm(prefixe), options: copie(o) })
      if (X.stockagePanne) return panne()
      const pre = norm(prefixe), base = pre ? `${pre}/` : ''
      const enfants = new Map()
      for (const [k, v] of m()) {
        if (!k.startsWith(base)) continue
        const reste = k.slice(base.length), i = reste.indexOf('/')
        if (i < 0) enfants.set(reste, { name: reste, id: `objet:${nom}/${k}`, updated_at: '2026-10-01T00:00:00Z', created_at: '2026-10-01T00:00:00Z', metadata: { size: v.octets.length, mimetype: v.type } })
        else if (!enfants.has(reste.slice(0, i))) enfants.set(reste.slice(0, i), { name: reste.slice(0, i), id: null, updated_at: null, created_at: null, metadata: null })
      }
      let l = [...enfants.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      if (o.search) l = l.filter((x) => x.name.toLowerCase().startsWith(String(o.search).toLowerCase()))
      const debut = Number(o.offset) || 0, n = o.limit == null ? 100 : Number(o.limit)
      return { data: l.slice(debut, debut + n), error: null }
    },
    async download(chemin) {
      X.stockage.push({ seau: nom, op: 'download', chemin: norm(chemin) })
      if (X.stockagePanne) return panne()
      const v = m().get(norm(chemin))
      if (!v) return { data: null, error: { message: 'Object not found', statusCode: '404' } }
      return { data: new Blob([v.octets], { type: v.type }), error: null }
    },
    async upload(chemin, corps, o = {}) {
      const k = norm(chemin)
      const octets = await octetsDe(corps)
      X.stockage.push({ seau: nom, op: 'upload', chemin: k, type: o.contentType ?? null, taille: octets.length, upsert: !!o.upsert })
      if (X.stockagePanne) return panne()
      if (m().has(k) && !o.upsert) return { data: null, error: { message: 'The resource already exists', statusCode: '409' } }
      m().set(k, { octets, type: o.contentType ?? 'text/plain;charset=UTF-8' })
      try { X.surUpload?.(nom, k) } catch { /* scénario */ }
      return { data: { path: k, id: `objet:${nom}/${k}`, fullPath: `${nom}/${k}` }, error: null }
    },
    async remove(chemins) {
      const liste = (Array.isArray(chemins) ? chemins : [chemins]).map(norm)
      X.stockage.push({ seau: nom, op: 'remove', chemins: liste })
      if (X.stockagePanne) return panne()
      const partis = []
      for (const k of liste) if (m().delete(k)) partis.push({ name: k })
      return { data: partis, error: null }
    },
    async createSignedUrl(chemin, secondes) { X.stockage.push({ seau: nom, op: 'createSignedUrl', chemin: norm(chemin), secondes }); return { data: { signedUrl: `http://127.0.0.1:9/signe/${nom}/${norm(chemin)}` }, error: null } },
    async move(de, vers) { X.stockage.push({ seau: nom, op: 'move', chemin: norm(de), vers: norm(vers) }); const v = m().get(norm(de)); if (!v) return { data: null, error: { message: 'Object not found' } }; m().delete(norm(de)); m().set(norm(vers), v); return { data: { message: 'ok' }, error: null } },
    async copy(de, vers) { X.stockage.push({ seau: nom, op: 'copy', chemin: norm(de), vers: norm(vers) }); const v = m().get(norm(de)); if (!v) return { data: null, error: { message: 'Object not found' } }; m().set(norm(vers), { ...v }); return { data: { path: norm(vers) }, error: null } },
  }
}
export const stockageFactice = { from: (nom) => seau(nom) }

export const supabaseAdmin = {
  from: (t) => (X.pannes.has(t) ? enPanne(t) : envelopper(t, A.supabaseAdmin.from(t))),
  rpc,
  schema: () => supabaseAdmin,
  storage: stockageFactice,
  auth: {
    // auth.admin : deleteUser et updateUserById consignés (X.auth, avec leur rang) ; X.authPanne : erreur ; le reste est refusé.
    admin: new Proxy({
      deleteUser: async (id) => { X.auth.push({ op: 'deleteUser', id, rang: ++X.rang }); return X.authPanne ? { data: null, error: { message: 'auth en panne (doublure du lot D)' } } : { data: {}, error: null } },
      updateUserById: async (id) => { X.auth.push({ op: 'updateUserById', id, rang: ++X.rang }); return X.authPanne ? { data: null, error: { message: 'auth en panne (doublure du lot D)' } } : { data: {}, error: null } },
    }, { get: (c, p) => c[p] ?? (async () => { E.inconnues.push(`auth.admin.${String(p)} non pris en charge par la doublure`); return { data: null, error: { message: 'non pris en charge' } } }) }),
  },
}

// ── lib/vercelDomains ────────────────────────────────────────────────────────────────────────────────────────────────────
async function domaine(op, d) {
  X.domaines.push({ op, domaine: d })
  if (X.modeDomaine === 'leve') throw new Error(`Vercel injoignable (doublure du lot D) : ${op} ${d}`)
  if (X.modeDomaine === 'refuse') return { ok: false, verified: false, served: false, records: [], error: `${op} refusé (doublure du lot D)` }
  return { ok: true, verified: false, served: false, records: copie(E.dns[d] ?? []) }
}
export const addDomain = (d) => domaine('add', d)
/** removeDomain rend un booléen (lib/vercelDomains.ts:66) : true détaché, false refusé. */
export const removeDomain = async (d) => (await domaine('remove', d)).ok === true

// ── lib/direction/reconfirmation ─────────────────────────────────────────────────────────────────────────────────────────
export const PORTEES = ['securite', 'argent', 'artisan', 'reglages']
export const DUREE_S = 300
export const EN_TETE = 'x-presti-reconfirmation'
export async function exigerReconfirmation(req, uid, portee) {
  const jeton = (req?.headers?.get?.(EN_TETE) || '').trim()
  X.reconfirmations.push({ uid, portee, jeton: jeton ? 'présent' : 'absent' })
  if (jeton && jeton === X.jetonReco) return null
  return Response.json({ error: 'Confirmez cette action avec votre mot de passe.', code: jeton ? 'rejoue' : 'reconfirmation_requise', portee }, { status: 403 })
}
export async function emettre() { return { jeton: X.jetonReco, expire_le: '2099-01-01T00:00:00Z' } }
export async function consommer(_uid, jeton) { return jeton === X.jetonReco ? 'ok' : 'absent' }

// ── Espions ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Un espion consigne ses arguments et son rang ; il lève si son nom est dans X.leve ; X.rendus[nom] remplace sa réponse.
const espion = (module, nom, rendu) => async (...args) => {
  X.espions.push({ module, nom, args: copie(args), rang: ++X.rang })
  if (X.leve.has(nom)) throw new Error(`${nom} en panne (doublure du lot D)`)
  if (nom in X.rendus) return copie(X.rendus[nom])
  return typeof rendu === 'function' ? rendu(...args) : rendu
}
export const espionsDe = (nom) => X.espions.filter((e) => e.nom === nom)
// lib/siteDossier (026-028)
export const creerJetonDossier = espion('siteDossier', 'creerJetonDossier', () => `jeton-temoin-${++X.jetons}`)
export const verifierJetonDossier = espion('siteDossier', 'verifierJetonDossier', false)
export const listerSite = espion('siteDossier', 'listerSite', [])
export const archiveDuSite = espion('siteDossier', 'archiveDuSite', null)
export const purgerFichiersExpires = espion('siteDossier', 'purgerFichiersExpires', { purges: 0 })
export const servirDossier = espion('siteDossier', 'servirDossier', () => new Response('Introuvable.', { status: 404 }))
// lib/siteRetrait (026-031)
export const ETAT_RETIRE = 'retiree'
export const LIBELLE_RETIRE = 'Retiré — dossier envoyé'
export const commandesEnLigneDe = espion('siteRetrait', 'commandesEnLigneDe', [])
export const marquerSuppression = espion('siteRetrait', 'marquerSuppression', 0)
export const retraitsDus = async (...args) => { X.espions.push({ module: 'siteRetrait', nom: 'retraitsDus', args: copie(args) }); if (X.retraitsDusLeve) throw new Error('retraitsDus en panne (doublure du lot D)'); return copie(X.retraitsDus) }
export const retirer = espion('siteRetrait', 'retirer', { ok: true })
export function dateRetrait(d) { const x = new Date(d); x.setUTCFullYear(x.getUTCFullYear() + 1); return x }
// lib/siteLivraisonBus (026-141), pour les juges qui ne le jugent pas (RT-7) : jamais en pause, tâche absente
export const busEnPause = espion('siteLivraisonBus', 'busEnPause', false)
export const cloreTacheLivraison = espion('siteLivraisonBus', 'cloreTacheLivraison', 'absente')
export const battementLivreur = espion('siteLivraisonBus', 'battementLivreur', undefined)
// lib/siteAchatPublic (026-025), appelé par tourLivraison depuis le 27/09 : hors du jugement des lots D
export const purgerBrouillonsPublics = espion('siteAchatPublic', 'purgerBrouillonsPublics', { effaces: 0 })
// lib/siteGenerationDistante (026-106)
export const demanderGeneration = espion('siteGenerationDistante', 'demanderGeneration', { ok: true })
// lib/siteLivraisonUsine (026-141)
export const consommerSortiesUsine = espion('siteLivraisonUsine', 'consommerSortiesUsine', { consommees: 0 })
// lib/siteLivraison (le tic de 026-141 : BL-4)
export const tourLivraison = espion('siteLivraison', 'tourLivraison', { courriels: 0, retards: 0, erreurs: 0 })
// app/controle/client (Sites.tsx : PS-7)
export async function apiDirection(chemin, init = {}, avecReconfirmation = false) {
  let corps = null
  try { corps = init?.body ? JSON.parse(init.body) : null } catch { corps = init?.body ?? null }
  X.espions.push({ module: 'client', nom: 'apiDirection', args: [chemin, { method: init?.method ?? 'GET', corps }, avecReconfirmation] })
  const r = X.api ? await X.api(chemin, { method: init?.method ?? 'GET', corps }) : { ok: false, status: 503, data: { error: 'aucune réponse prévue (doublure)' } }
  return r
}
export const reconfirmationValide = () => true
export const garderReconfirmation = () => {}
export const oublierReconfirmation = () => {}
