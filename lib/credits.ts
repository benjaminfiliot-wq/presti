import { supabaseAdmin } from './supabaseAdmin'
import { planConf, CREDIT_COST } from './plans'
import type { Tier } from './models'

type ConsumeResult = { ok: boolean; remaining?: number; error?: string }

/**
 * Décompte atomique d'un crédit pour une génération IA (avec reset mensuel paresseux).
 * Les fondateurs ne consomment jamais. Renvoie ok:false si crédits insuffisants.
 */
export async function consumeCredit(uid: string, tier: Tier, isFounder: boolean, coutForce?: number): Promise<ConsumeResult> {
  if (isFounder) return { ok: true }
  const { data: a } = await supabaseAdmin.from('artisans').select('plan').eq('id', uid).maybeSingle()
  const conf = planConf(a?.plan)
  // `coutForce` : certaines fonctions ne valent pas le tarif d'une génération (la recherche chez
  // les fournisseurs coûte dix fois plus cher à produire). Sans argument, rien ne change.
  const cost = typeof coutForce === 'number' && coutForce >= 0 ? Math.round(coutForce) : (CREDIT_COST[tier] ?? 1)
  const { data, error } = await supabaseAdmin.rpc('consume_credit', { p_uid: uid, p_cost: cost, p_credits_mois: conf.creditsMois })
  if (error) { console.error('[credits] rpc:', error.message); return { ok: true } } // fail-open : ne pas bloquer un client si le comptage bug
  const n = Number(data)
  if (n === -2) return { ok: false, error: 'Profil introuvable' }
  if (n === -1) return { ok: false, error: 'Crédits épuisés — renouvellement mensuel ou formule supérieure.' }
  return { ok: true, remaining: n }
}

/**
 * Rend un crédit débité pour une génération qui a ÉCHOUÉ (panne du modèle, solde Anthropic à
 * zéro, réseau). Avant, le crédit était débité avant l'appel et jamais rendu : l'artisan payait
 * une réponse qu'il n'avait pas eue (audit final, auditeur E, M5). Jamais pour un fondateur
 * (rien n'a été débité). On rend ce qui a été pris — un crédit offert par la direction n'est pas
 * repris au passage.
 */
export async function rendreCredit(uid: string, tier: Tier, isFounder: boolean, coutForce?: number): Promise<void> {
  if (isFounder) return
  // On rend EXACTEMENT ce qui a été débité, sans plafonner au forfait de l'offre.
  //
  // Le plafond détruisait les crédits offerts par la direction (revue du 07/09) : un artisan de
  // l'ancienne offre Essentiel (80 crédits) à qui on en avait offert 200 tombait à 80 dès le premier appel IA
  // qui échouait. Le débit ayant déjà été borné par `consume_credit`, la restitution n'a rien à
  // borner — elle rend ce qui a été pris, ni plus, ni moins.
  const cost = typeof coutForce === 'number' && coutForce >= 0 ? Math.round(coutForce) : (CREDIT_COST[tier] ?? 1)
  try {
    await restituerCredits(supabaseAdmin as unknown as BaseCredits, uid, cost)
  } catch (e) { console.error('[credits] rendre :', e instanceof Error ? e.message : e) }
}

/** Le strict nécessaire du client Supabase pour rendre des crédits (injecté : scripts/assistant-qa.mjs le simule). */
export type BaseCredits = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>
  from: (table: string) => {
    select: (cols: string) => { eq: (c: string, v: string) => { maybeSingle: () => PromiseLike<{ data: { credits?: unknown } | null; error: unknown }> } }
    update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => PromiseLike<{ error: unknown }> }
  }
}

/** Codes d'une fonction SQL absente (PostgREST : PGRST202 ; Postgres : 42883). Seul cas où l'on retombe sur l'ancien chemin. */
const FONCTION_ABSENTE = new Set(['PGRST202', '42883'])

/**
 * Rend `n` crédits. D'abord par la fonction SQL `rendre_credit` (migration 0155) : `credits = credits + n` en UNE
 * instruction — deux restitutions simultanées, ou une restitution pendant un débit, ne s'écrasent plus (l'ancien chemin
 * lisait puis écrivait : audit d'attaque du 12/10). Tant que 0155 n'est pas appliquée, la fonction est absente : on garde
 * l'ancien chemin (lecture puis écriture), pour que le déploiement passe avant l'application. Toute AUTRE erreur de la
 * fonction ne retombe pas sur l'ancien chemin (elle a pu s'exécuter : on ne rendrait pas deux fois).
 * Rend le chemin pris : 'atomique', 'repli', 'introuvable' (aucun compte) ou 'erreur'.
 */
export async function restituerCredits(db: BaseCredits, uid: string, n: number): Promise<'atomique' | 'repli' | 'introuvable' | 'erreur'> {
  if (!(n > 0)) return 'atomique'
  const { data, error } = await db.rpc('rendre_credit', { p_artisan: uid, p_n: n })
  if (!error) return Number(data) === -2 ? 'introuvable' : 'atomique'
  if (!FONCTION_ABSENTE.has(String(error.code ?? ''))) { console.error('[credits] rendre_credit :', error.message); return 'erreur' }
  const { data: a } = await db.from('artisans').select('credits').eq('id', uid).maybeSingle()
  if (!a) return 'introuvable'
  const { error: e } = await db.from('artisans').update({ credits: (Number(a.credits) || 0) + n }).eq('id', uid)
  if (e) { console.error('[credits] rendre (repli) :', e instanceof Error ? e.message : JSON.stringify(e)); return 'erreur' }
  return 'repli'
}
