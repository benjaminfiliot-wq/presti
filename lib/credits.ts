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
 * (rien n'a été débité), jamais au-delà du plafond mensuel de son offre.
 */
export async function rendreCredit(uid: string, tier: Tier, isFounder: boolean, coutForce?: number): Promise<void> {
  if (isFounder) return
  try {
    const { data: a } = await supabaseAdmin.from('artisans').select('credits, plan').eq('id', uid).maybeSingle()
    if (!a) return
    const cost = typeof coutForce === 'number' && coutForce >= 0 ? Math.round(coutForce) : (CREDIT_COST[tier] ?? 1)
    const plafond = planConf(a.plan).creditsMois
    await supabaseAdmin.from('artisans').update({ credits: Math.min(plafond, (Number(a.credits) || 0) + cost) }).eq('id', uid)
  } catch (e) { console.error('[credits] rendre :', e instanceof Error ? e.message : e) }
}
