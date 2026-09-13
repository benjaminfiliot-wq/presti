import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ── Relances automatiques : la cadence, et QUAND on l'arme ────────────────────────────────────
//
// La grille (`lib/plans.ts`, ligne « Relances automatiques ») vend cette ligne dès l'Essentiel.
// Jusqu'au 10/09 elle était fausse pour lui : les trois relances n'étaient posées qu'à UN endroit,
// la branche de /api/leads qui suit une réponse écrite par l'assistant tout seul. Or l'assistant
// autonome se vend à partir de Studio (`plateforme.ia.auto`), et le mode par défaut est « assistée » :
// un artisan à 29 € qui répond de sa main — le parcours NORMAL de sa formule — n'avait aucune
// relance, et un Studio en mode assisté non plus.
//
// La règle, désormais : une relance s'arme dès qu'une réponse part au nom de l'artisan, que ce soit
// l'assistant qui l'ait écrite seul ou l'artisan qui l'ait envoyée (ou validée) à la main.
//
// Le pendant côté statut vit dans les routes qui appellent ceci : le cron ne relance que les leads
// en `repondu` (« on a parlé en dernier, la balle est chez le prospect »). `en_discussion` veut dire
// l'inverse — le prospect a parlé en dernier — et c'est bien une condition d'ARRÊT.

/** J+2 / J+5 / J+10 — la cadence vendue. Un seul endroit l'écrit. */
export const CADENCE_RELANCES = [2, 5, 10] as const

const JOUR_MS = 86400000

/**
 * Arme les relances d'un lead, une seule fois tant que les précédentes n'ont pas été consommées.
 *
 * La garde porte sur les relances EN ATTENTE (`envoyee = false`), pas sur toutes : deux réponses
 * d'affilée ne doublent rien, mais un lead dont le cycle est passé ou a été annulé (le prospect a
 * répondu, puis s'est tu) se réarme à la réponse suivante de l'artisan. Une garde sur « la moindre
 * relance jamais posée » ferait marcher la fonctionnalité une seule fois dans la vie du lead.
 *
 * Ne lève jamais : une relance qui n'a pas pu être posée ne doit pas faire échouer l'envoi du
 * message auquel le prospect, lui, tient vraiment.
 */
export async function planifierRelances(leadId: string): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('relances')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', leadId)
      .eq('envoyee', false)
    if ((count ?? 0) > 0) return 0

    const now = Date.now()
    const { error } = await supabaseAdmin.from('relances').insert(
      CADENCE_RELANCES.map((j, i) => ({
        lead_id: leadId,
        planifiee_le: new Date(now + j * JOUR_MS).toISOString(),
        rang: i + 1,
        envoyee: false,
      })),
    )
    if (error) { console.warn('[relances] planification impossible pour', leadId, error.message); return 0 }
    return CADENCE_RELANCES.length
  } catch (e) {
    console.warn('[relances] planification impossible pour', leadId, e instanceof Error ? e.message : e)
    return 0
  }
}
