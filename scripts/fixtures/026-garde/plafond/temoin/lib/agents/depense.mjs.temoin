// lib/agents/depense.mjs — le point de contrôle UNIQUE de la dépense des agents (plafond de 0 € par agent). JavaScript pur, importable
// par un script comme par du TypeScript : ni réseau, ni base, ni secret lu ailleurs que dans l'environnement qu'on lui passe.
//
// Règle : un agent ne dépense rien. Une voie dont la gratuité tient à sa nature (abonnement de Benj, machine locale) est dans la liste
// fermée GRATUITS et passe à 0 €. Tout le reste — une voie payante, une voie inconnue, un coût > 0 — exige un JETON DE DÉPENSE émis par
// Benj : { emis_par: 'benj', fournisseur, montant_max_eur > 0, expire_le (futur), signature (hex, 64) }, dont la signature est vérifiée
// (HMAC-SHA256 avec PRESTI_SECRET_DEPENSE, que Benj seul détient). Un coût inconnu ou non numérique est refusé, jamais compté 0.
// Sans vérificateur de signature et sans secret, un jeton est REFUSÉ : fail-closed.
import crypto from 'node:crypto'

/** La liste fermée : ces voies sont gratuites par nature (abonnement ChatGPT de Benj, IA locale de l'usine). */
export const GRATUITS = Object.freeze(['codex', 'freellmapi', 'ollama_local', 'laya'])

/** Le coût déclaré d'un fournisseur : 0 pour la liste fermée, sinon INCONNU (undefined). */
export function coutDeclare(fournisseur) { return GRATUITS.includes(fournisseur) ? 0 : undefined }

/** L'estimation de coût (en euros) que Benj pose dans PRESTI_COUT_ESTIME_EUR avec son jeton ; absente ou illisible : undefined. */
export function coutEstimeDeLEnv(env = process.env) {
  const v = env?.PRESTI_COUT_ESTIME_EUR
  if (typeof v !== 'string' || !/^\d+(?:\.\d+)?$/.test(v.trim())) return undefined
  return Number(v)
}

/** Le jeton de dépense de Benj, lu dans PRESTI_JETON_DEPENSE (JSON) ; null s'il est absent ou illisible. */
export function jetonDepenseDeLEnv(env = process.env) {
  try { const j = JSON.parse(env?.PRESTI_JETON_DEPENSE ?? ''); return j && typeof j === 'object' && !Array.isArray(j) ? j : null } catch { return null }
}

/** La vérification par défaut : HMAC-SHA256(secret, fournisseur|montant|expiration) ; pas de secret de 32 signes au moins : faux. */
export function verifierSignatureParDefaut(jeton, env = process.env) {
  const secret = env?.PRESTI_SECRET_DEPENSE
  if (typeof secret !== 'string' || secret.length < 32) return false
  const attendue = crypto.createHmac('sha256', secret).update(`${jeton.fournisseur}|${jeton.montant_max_eur}|${jeton.expire_le}`).digest()
  const recue = Buffer.from(String(jeton.signature), 'hex')
  return recue.length === attendue.length && crypto.timingSafeEqual(recue, attendue)
}

/** → { ok, motif }. Ne lève jamais : un refus se rend. deps : { maintenant?: () => number, verifierSignature?: (jeton) => boolean, env? }. */
export function autoriserDepense(demande, deps = {}) {
  const refus = (motif) => ({ ok: false, motif })
  try {
    if (!demande || typeof demande !== 'object' || Array.isArray(demande)) return refus('demande_invalide')
    const { agent, fournisseur, cout_eur: cout, jeton_depense: jeton } = demande
    if (typeof agent !== 'string' || !agent || typeof fournisseur !== 'string' || !fournisseur) return refus('demande_invalide')
    if (typeof cout !== 'number' || !Number.isFinite(cout) || cout < 0) return refus('cout_inconnu')
    if (GRATUITS.includes(fournisseur) && cout === 0) return { ok: true, motif: 'gratuit' }
    if (!jeton || typeof jeton !== 'object' || Array.isArray(jeton)) return refus('jeton_absent')
    const maintenant = (deps.maintenant ?? Date.now)()
    const expire = Date.parse(jeton.expire_le)
    const borne = typeof jeton.montant_max_eur === 'number' && Number.isFinite(jeton.montant_max_eur) && jeton.montant_max_eur > 0
    if (jeton.emis_par !== 'benj' || jeton.fournisseur !== fournisseur || !borne || !Number.isFinite(expire) || expire <= maintenant || !/^[0-9a-f]{64}$/i.test(String(jeton.signature))) return refus('jeton_invalide')
    if (cout > jeton.montant_max_eur) return refus('jeton_insuffisant')
    const verifier = deps.verifierSignature ?? ((j) => verifierSignatureParDefaut(j, deps.env ?? process.env))
    if (verifier(jeton) !== true) return refus('signature_refusee')
    return { ok: true, motif: 'jeton_de_benj' }
  } catch { return refus('erreur') }
}
