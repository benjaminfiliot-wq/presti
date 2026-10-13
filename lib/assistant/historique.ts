// L'assistant de gestion de la console — l'HISTORIQUE d'une conversation, tel que l'écran le renvoie (audit d'attaque
// du 12/10, B3). Serveur seulement (node:crypto) : jamais importé par app/assistant/page.tsx.
//
// Le défaut : l'écran renvoyait l'historique en clair et la route le croyait. Un compte pouvait donc fabriquer une
// réponse « de l'assistant » : y glisser des nombres (qui devenaient des SOURCES pour le garde-fou des chiffres), ou une
// fausse proposition (« Voulez-vous que je prépare un devis ? ») pour qu'un simple « oui » ouvre les brouillons.
//
// Ce jalon : chaque réponse de l'assistant part avec une SIGNATURE (HMAC-SHA256, clé dérivée côté serveur comme
// lib/apports.ts), liée au compte et à la conversation. Au tour suivant, une réponse de l'assistant sans signature valide
// est ÉCARTÉE de l'historique (ni source de chiffres, ni proposition). Les messages de l'artisan restent tels quels : ce
// sont ses propres mots, il pourrait les retaper.
//
// Pourquoi pas l'historique stocké en base dès maintenant : il faudrait une table des messages (texte des échanges, donc
// des noms et des extraits de messages de clients), sa RLS, sa durée de conservation, sa purge et son export RGPD — un
// chantier à part (proposé dans le rapport). La signature ferme la falsification sans rien conserver de plus.
import crypto from 'node:crypto'
import { HISTORIQUE_CARACTERES_MAX, HISTORIQUE_MESSAGES_MAX } from './cadrage'
import type { EchangePasse } from './boucle'

const VERSION = 'v1'
export const TEXTE_ECHANGE_MAX = 4000

/** La clé : dérivée d'un secret serveur, jamais transmise. Absente (pas de secret) : null, et rien n'est signé ni cru. */
export function cleHistorique(secret: string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY): Buffer | null {
  if (!secret) return null
  return crypto.createHmac('sha256', secret).update('presti:assistant-historique:v1').digest()
}

const empreinte = (texte: string) => crypto.createHash('sha256').update(texte, 'utf8').digest('base64url')

/** La signature d'une réponse de l'assistant, liée au compte et à la conversation. */
export function signerReponse(cle: Buffer | null, p: { uid: string; conversationId: string; texte: string }): string | null {
  if (!cle) return null
  const mac = crypto.createHmac('sha256', cle).update(`${VERSION}|${p.uid}|${p.conversationId}|${empreinte(p.texte)}`).digest('base64url')
  return `${VERSION}.${mac}`
}

export function signatureValide(cle: Buffer | null, p: { uid: string; conversationId: string; texte: string; signature: unknown }): boolean {
  if (!cle || typeof p.signature !== 'string' || p.signature.length > 200) return false
  const attendue = signerReponse(cle, p)
  if (!attendue) return false
  const a = Buffer.from(p.signature), b = Buffer.from(attendue)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * L'historique renvoyé par l'écran : forme stricte, réponses de l'assistant SIGNÉES seulement, derniers échanges,
 * borné en taille. Rend aussi le nombre de réponses écartées (signature absente ou fausse).
 */
export function lireHistorique(brut: unknown, verif: { cle: Buffer | null; uid: string; conversationId: string | null }): { historique: EchangePasse[]; ecartees: number } {
  if (!Array.isArray(brut)) return { historique: [], ecartees: 0 }
  let ecartees = 0
  const propres: EchangePasse[] = []
  for (const e of brut.slice(-4 * HISTORIQUE_MESSAGES_MAX)) {
    if (!e || typeof e !== 'object') continue
    const { role, texte, signature } = e as { role?: unknown; texte?: unknown; signature?: unknown }
    if (typeof texte !== 'string' || (role !== 'artisan' && role !== 'assistant')) continue
    if (role === 'assistant') {
      // Une nouvelle conversation n'a pas d'historique d'assistant légitime.
      if (!verif.conversationId || !signatureValide(verif.cle, { uid: verif.uid, conversationId: verif.conversationId, texte, signature })) { ecartees++; continue }
    }
    const t = texte.trim().slice(0, TEXTE_ECHANGE_MAX)
    if (t) propres.push({ role, texte: t })
  }
  const gardes: EchangePasse[] = []
  let reste = HISTORIQUE_CARACTERES_MAX
  for (const e of propres.slice(-HISTORIQUE_MESSAGES_MAX).reverse()) {
    if (e.texte.length > reste) break
    reste -= e.texte.length
    gardes.unshift(e)
  }
  return { historique: gardes, ecartees }
}
