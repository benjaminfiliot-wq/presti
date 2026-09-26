// scripts/fixtures/026-livraison-tresor/b/doublures.mjs — les doublures des juges du lot B (fiche 026-023), écrites par
// Claude Code. Elles reprennent celles du lot A (../a/doublures.mjs, réexportées telles quelles : même état partagé
// globalThis.__doublesLt026) et ajoutent, sous E.b :
//   ?m=supabaseAdmin   le faux client du lot A, plus auth.admin (createUser, generateLink, deleteUser, listUsers : appels
//                      consignés dans E.b.authAdmin.appels ; E.b.authAdmin.dejaInscrit = true → createUser répond
//                      « adresse déjà inscrite »), auth.getUser, un journal ordonné des lectures (E.b.journal :
//                      « from:<table> », « auth.admin.<méthode> », « authArtisan », « rattacherCommandesParEmail ») et
//                      des tables en panne (E.b.panneTables : toute requête sur ces tables rend une erreur)
//   ?m=stripe          le client figé du lot A, plus webhooks (le VRAI module du paquet stripe : constructEvent et
//                      generateTestHeaderString sont du HMAC pur, sans réseau) et checkout.sessions.create/expire/retrieve
//                      (consignés dans E.b.checkouts, une session cs_sim_… rendue)
//   ?m=connexion       lib/connexion : clientPublic().auth.verifyOtp (E.b.otp.mode : ok | refus ; appels consignés),
//                      sessionIdDuJeton, marquerSessionVerifiee (E.b.sessionsMarquees), sessionVerifiee
//   ?m=authArtisan     lib/authArtisan : authArtisan (E.b.auth.mode : ok | refus401 | code_requis), estEchec
//   ?m=siteLivraison   lib/siteLivraison : envoyerCourrielsDus (E.b.courriels.mode : ok | leve ; appels consignés)
//   ?m=siteAchatPublic lib/siteAchatPublic : rattacherCommandesParEmail consigné (E.b.rattachements), les autres stubs
// Les réponses de auth.admin et de verifyOtp viennent de auth-admin.json (même dossier).
// Aucun réseau, aucun fichier écrit hors lecture du jeu, aucune variable d'environnement lue.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'
import * as A from '../a/doublures.mjs'
export * from '../a/doublures.mjs'

const E = A.etat
const JEU = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'auth-admin.json'), 'utf8'))
const clone = (x) => (x === undefined ? undefined : structuredClone(x))
const etatB = (conf = {}) => ({
  journal: [],
  authAdmin: { appels: [], dejaInscrit: !!conf.dejaInscrit },
  otp: { mode: conf.otp ?? 'ok', appels: [] },
  sessionsMarquees: [],
  auth: { mode: conf.auth ?? 'ok', uid: conf.uid ?? JEU.artisan.uid, email: conf.email ?? JEU.artisan.email, appels: 0 },
  checkouts: [],
  courriels: { mode: conf.courriels ?? 'ok', appels: [] },
  rattachements: [],
  panneTables: [...(conf.panneTables ?? [])],
})
E.b ??= etatB()
export const etat = E

/** Remise à zéro entre deux scénarios : celle du lot A, puis l'état du lot B (conf.b : dejaInscrit, otp, auth, uid, email, courriels, panneTables). */
export function reinitialiser(conf = {}) {
  A.reinitialiser(conf)
  E.b = etatB(conf.b ?? {})
}

// ── lib/supabaseAdmin ────────────────────────────────────────────────────────────────────────────────────────────────────
const PANNE = { message: 'base en panne (doublure du lot B)', code: 'DOUBLURE_PANNE' }
function enPanne(constructeur) {
  const p = new Proxy(constructeur, {
    get(cible, cle) {
      if (cle === 'then') return (ok, ko) => Promise.resolve({ data: null, error: { ...PANNE }, count: null }).then(ok, ko)
      const v = cible[cle]
      return typeof v === 'function' ? (...args) => { const r = v.apply(cible, args); return r === cible ? p : r } : v
    },
  })
  return p
}
const auth = {
  admin: {
    async createUser(o = {}) {
      E.b.journal.push('auth.admin.createUser'); E.b.authAdmin.appels.push({ methode: 'createUser', params: clone(o) })
      if (E.b.authAdmin.dejaInscrit) return { data: { user: null }, error: { ...JEU.deja_inscrit, name: 'AuthApiError' } }
      return { data: { user: { id: JEU.acheteur.uid, email: o.email, email_confirmed_at: o.email_confirm ? '2026-09-26T10:00:00Z' : null } }, error: null }
    },
    async generateLink(o = {}) {
      E.b.journal.push('auth.admin.generateLink'); E.b.authAdmin.appels.push({ methode: 'generateLink', params: clone(o) })
      return { data: { properties: { ...JEU.generateLink, verification_type: o.type ?? null, redirect_to: o.options?.redirectTo ?? null }, user: { id: JEU.acheteur.uid, email: o.email } }, error: null }
    },
    async deleteUser(id) { E.b.journal.push('auth.admin.deleteUser'); E.b.authAdmin.appels.push({ methode: 'deleteUser', params: { id } }); return { data: { user: null }, error: null } },
    async listUsers(o = {}) { E.b.journal.push('auth.admin.listUsers'); E.b.authAdmin.appels.push({ methode: 'listUsers', params: clone(o) }); return { data: { users: [], aud: 'authenticated' }, error: null } },
    async getUserById(id) { E.b.journal.push('auth.admin.getUserById'); E.b.authAdmin.appels.push({ methode: 'getUserById', params: { id } }); return { data: { user: { id, email: JEU.acheteur.email } }, error: null } },
    async updateUserById(id, o = {}) { E.b.journal.push('auth.admin.updateUserById'); E.b.authAdmin.appels.push({ methode: 'updateUserById', params: { id, ...clone(o) } }); return { data: { user: { id } }, error: null } },
  },
  async getUser(jeton) {
    E.b.journal.push('auth.getUser')
    if (E.b.auth.mode === 'refus401' || !jeton) return { data: { user: null }, error: { message: 'invalid JWT (doublure du lot B)' } }
    return { data: { user: { id: E.b.auth.uid, email: E.b.auth.email } }, error: null }
  },
}
export const supabaseAdmin = {
  ...A.supabaseAdmin,
  from: (t) => { E.b.journal.push(`from:${t}`); const b = A.supabaseAdmin.from(t); return E.b.panneTables.includes(t) || E.b.panneTables.includes('*') ? enPanne(b) : b },
  schema: () => supabaseAdmin,
  auth,
}

// ── lib/stripe ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const stripeReel = new Stripe(['sk', 'test', 'doublure026b' + '0'.repeat(20)].join('_'), { maxNetworkRetries: 0, timeout: 1 })
const checkout = {
  sessions: {
    async create(params, options) {
      const n = E.b.checkouts.length + 1
      const id = `cs_sim_026b_${String(n).padStart(3, '0')}`
      E.b.checkouts.push({ id, params: clone(params), options: clone(options ?? null) })
      return { id, object: 'checkout.session', url: `https://checkout.stripe.com/c/pay/${id}`, mode: params?.mode ?? 'payment', status: 'open', metadata: clone(params?.metadata ?? {}) }
    },
    async retrieve(id) { const c = E.b.checkouts.find((x) => x.id === id); return c ? { id, object: 'checkout.session', status: 'open', metadata: clone(c.params?.metadata ?? {}) } : null },
    async expire(id) { E.b.journal.push(`checkout.expire:${id}`); return { id, object: 'checkout.session', status: 'expired' } },
  },
}
export const stripe = new Proxy(A.stripe, {
  get: (cible, cle) => (cle === 'webhooks' ? stripeReel.webhooks : cle === 'checkout' ? checkout : cible[cle]),
})

// ── lib/connexion ────────────────────────────────────────────────────────────────────────────────────────────────────────
export const COOKIE_APPAREIL = 'appareil_confiance'
export const JOURS_APPAREIL = 30
export const MINUTES_CODE = 10
export const ESSAIS_CODE = 5
export const ERREUR_IDENTIFIANTS = 'Email ou mot de passe incorrect.'
export function clientPublic() {
  return {
    auth: {
      async verifyOtp(o = {}) {
        E.b.journal.push('verifyOtp'); E.b.otp.appels.push(clone(o))
        if (E.b.otp.mode === 'refus') return { data: { session: null, user: null }, error: { message: 'Token has expired or is invalid (doublure du lot B)', status: 403, name: 'AuthApiError' } }
        const S = JEU.session
        const user = { id: JEU.acheteur.uid, email: JEU.acheteur.email, aud: 'authenticated', role: 'authenticated' }
        return { data: { session: { access_token: S.access_token, refresh_token: S.refresh_token, token_type: 'bearer', expires_in: 3600, user }, user }, error: null }
      },
      async signInWithPassword() { E.inconnues.push('signInWithPassword appelé (interdit dans le lien de connexion)'); return { data: { session: null, user: null }, error: { message: 'refusé par la doublure' } } },
    },
  }
}
export const hacherCode = (userId, code) => `hache:${userId}:${code}`
export const genererCode = () => '123456'
export const formaterCode = (code) => `${code.slice(0, 3)} ${code.slice(3)}`
export function gabaritCode(code) { return { subject: 'Votre code', text: `Code ${code}` } }
export function sessionIdDuJeton(jeton) { return jeton === JEU.session.access_token ? JEU.session.sid : null }
export async function marquerSessionVerifiee(sessionId, userId, moyen) { E.b.journal.push(`marquerSessionVerifiee:${moyen}`); E.b.sessionsMarquees.push({ sid: sessionId, uid: userId, moyen }); return true }
export async function sessionVerifiee(sessionId) { return E.b.sessionsMarquees.some((s) => s.sid === sessionId) }
export const empreinteAppareil = (ua, secret) => `empreinte:${ua}:${secret}`
export function lireCookieAppareil() { return null }
export const enteteCookieAppareil = (valeur, maxAgeSec) => `${COOKIE_APPAREIL}=${valeur}; Max-Age=${maxAgeSec}`
export const enteteCookieAppareilVide = () => enteteCookieAppareil('', 0)
export async function appareilReconnu() { return null }
export async function creerAppareil() { return null }
export async function revoquerAppareils() { return 0 }
export async function listerAppareils() { return [] }

// ── lib/authArtisan ──────────────────────────────────────────────────────────────────────────────────────────────────────
export const ERREUR_MFA = 'Double authentification requise.'
export const ERREUR_SUSPENDU = 'Votre compte est suspendu (doublure).'
export const ERREUR_CODE = 'Connexion à vérifier : reconnectez-vous, un code vous sera envoyé par email.'
export async function authArtisan() {
  E.b.journal.push('authArtisan'); E.b.auth.appels++
  if (E.b.auth.mode === 'refus401') return { error: 'Non authentifié', status: 401 }
  if (E.b.auth.mode === 'code_requis') return { error: ERREUR_CODE, status: 401, code: 'code_requis' }
  return { uid: E.b.auth.uid, iat: 0, email: E.b.auth.email }
}
export const estEchec = (r) => !!r && typeof r === 'object' && 'error' in r
export async function revoquerSessions() { return true }
export async function getUserRevocable() { return { user: null, error: 'doublure' } }

// ── lib/siteLivraison ────────────────────────────────────────────────────────────────────────────────────────────────────
export async function envoyerCourrielsDus(commandeId) {
  E.b.journal.push(`envoyerCourrielsDus:${commandeId}`); E.b.courriels.appels.push(commandeId)
  if (E.b.courriels.mode === 'leve') throw new Error('courriels de livraison en panne (doublure du lot B)')
  return { envoyes: 0 }
}
export async function tourLivraison() { E.b.journal.push('tourLivraison'); return { courriels: 0, retards: 0, erreurs: [] } }
export function heuresOuvreesEntre() { return 0 }

// ── lib/siteAchatPublic (pour le juge du complément de dossier seulement) ────────────────────────────────────────────────
export async function rattacherCommandesParEmail(uid, email) { E.b.journal.push('rattacherCommandesParEmail'); E.b.rattachements.push({ uid, email }); return [] }
export async function ouvrirCompteAcheteur() { E.inconnues.push('ouvrirCompteAcheteur appelé sur la doublure'); return null }
export async function purgerBrouillonsPublics() { return 0 }
