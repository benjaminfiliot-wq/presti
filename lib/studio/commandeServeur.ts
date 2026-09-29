// lib/studio/commandeServeur.ts — le pack Studio côté serveur SEULEMENT (service_role), fiche 026-166.
//
// Même charpente que lib/packPubServeur.ts : le brouillon d'une marque, la session Stripe posée avant le paiement, et
// l'encaissement idempotent au webhook. La ligne packs_pubs est de type 'studio' : pas d'artisan (artisan_id nul), la
// clé de la marque, et le prix lu dans lib/studio/offre.ts — jamais écrit ici.
//
// L'adresse du brouillon est un repère « à confirmer » : Stripe recueille la vraie adresse au paiement et le webhook
// l'écrit (customer_details.email). Le dossier de la marque (produit, accord) vit dans la séance de Claude Code sur le
// poste, pas sur Vercel : la matière porte le nombre de vidéos et le prospect, la séance complète le reste.
import type Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { mentionFranchise } from '@/lib/facturation'
import { notifierEntreprise } from '@/lib/email'
import { decisionEncaissement } from '@/lib/packPub'
import { PRIX_PACK_STUDIO_CENTS, PRIX_PACK_STUDIO_TEXTE, VIDEOS_PACK_STUDIO } from '@/lib/studio/offre'

const COLONNES = 'id, email, etat, matiere, prix_cents, marque_cle, stripe_session_id'
export type LigneStudio = { id: string; email: string; etat: string; matiere: unknown; prix_cents: number; marque_cle: string; stripe_session_id: string | null }

/** La ligne de la marque à l'état brouillon, ou une nouvelle. Un brouillon existant garde son prix d'origine : seule une nouvelle ligne lit le prix courant. */
export async function brouillonStudio(marque_cle: string, prospect_id: string): Promise<LigneStudio> {
  const { data: courant, error: eLecture } = await supabaseAdmin.from('packs_pubs').select(COLONNES).eq('type', 'studio').eq('marque_cle', marque_cle).eq('etat', 'brouillon').order('modifie_le', { ascending: false }).limit(1).maybeSingle()
  if (eLecture) throw new Error(`lecture du brouillon Studio impossible : ${eLecture.message}`)
  if (courant) return courant as LigneStudio
  const nouvelle = {
    artisan_id: null,
    type: 'studio',
    marque_cle,
    etat: 'brouillon',
    prix_cents: PRIX_PACK_STUDIO_CENTS,
    email: `a-confirmer+${marque_cle}@prestiapp.invalid`,
    matiere: { videos: VIDEOS_PACK_STUDIO, produit: null, accord_ref: null, prospect_id },
  }
  const { data, error } = await supabaseAdmin.from('packs_pubs').insert(nouvelle).select(COLONNES).single()
  if (error || !data) throw new Error(`écriture du brouillon Studio impossible : ${error?.message ?? 'aucune ligne'}`)
  return data as LigneStudio
}

/** Juste avant de rediriger vers Stripe : la session est rattachée au brouillon (le webhook retrouve la ligne même sans métadonnées). */
export async function poserSessionStudio(id: string, sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('packs_pubs').update({ stripe_session_id: sessionId, modifie_le: new Date().toISOString() }).eq('id', id).eq('type', 'studio').eq('etat', 'brouillon')
  if (error) throw new Error(`rattachement de la session Stripe (Studio) impossible : ${error.message}`)
}

/** Au webhook (mode 'payment', type 'pack_studio') : passe le brouillon à 'payee', une seule fois. Ne crée JAMAIS de ligne. */
export async function encaisserPackStudio(s: Stripe.Checkout.Session): Promise<'encaisser' | 'deja' | 'second_paiement' | 'introuvable'> {
  const packId = String(s.metadata?.pack_id || '')
  const { data: avant, error: eLecture } = await supabaseAdmin.from('packs_pubs').select('id, etat, email, marque_cle, stripe_session_id').eq('id', packId).eq('type', 'studio').maybeSingle()
  if (eLecture) throw new Error(`lecture du pack Studio ${packId} impossible : ${eLecture.message}`)

  const decision = decisionEncaissement(avant ? { etat: avant.etat, stripe_session_id: avant.stripe_session_id } : null, { id: s.id })
  if (decision === 'introuvable') {
    await notifierEntreprise('⚠ Paiement du pack Studio sans dossier', `Session ${s.id} payée (${s.amount_total} ${s.currency}) pour un pack Studio introuvable : ${packId || '(vide)'}.`)
    return 'introuvable'
  }
  if (decision === 'second_paiement') {
    await notifierEntreprise('⚠ Second paiement sur un pack Studio', `Pack ${packId} (${avant!.etat}) déjà rattaché à ${avant!.stripe_session_id ?? '—'} ; nouvelle session ${s.id} (${s.amount_total} ${s.currency}).`)
    return 'second_paiement'
  }
  if (decision === 'deja') return 'deja'

  const maj = {
    etat: 'payee',
    stripe_session_id: s.id,
    stripe_payment_intent_id: typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null,
    paye_le: new Date().toISOString(),
    email: s.customer_details?.email || avant!.email,
    modifie_le: new Date().toISOString(),
  }
  // `etat = 'brouillon'` fait l'idempotence : le second de deux webhooks simultanés ne trouve plus de brouillon (rejeu).
  const { data: passe, error: eMaj } = await supabaseAdmin.from('packs_pubs').update(maj).eq('id', packId).eq('etat', 'brouillon').select('id')
  if (eMaj) throw new Error(`encaissement du pack Studio ${packId} impossible : ${eMaj.message}`)
  if (!passe || passe.length === 0) return 'deja'

  const clientId = typeof s.customer === 'string' ? s.customer : s.customer?.id
  if (clientId && stripe && process.env.STRIPE_TAXE_AUTO !== '1') {
    await stripe.customers.update(clientId, { invoice_settings: { footer: mentionFranchise('auto') } }).catch((e) => console.error('[pack Studio] pied de facture', e))
  }
  await notifierEntreprise(
    `Pack Studio payé — ${avant!.marque_cle}`,
    `Un pack Studio (${VIDEOS_PACK_STUDIO} vidéos, ${PRIX_PACK_STUDIO_TEXTE}) vient d'être payé.\n\nMarque : ${avant!.marque_cle}\nEmail : ${maj.email}\nPack : ${packId}\nMontant encaissé : ${typeof s.amount_total === 'number' ? (s.amount_total / 100).toFixed(2) + ' ' + (s.currency || 'eur').toUpperCase() : '—'}\n\nLa fabrication suit la méthode de la séance (026-155, 026-158).`,
  )
  console.log('[pack Studio] encaissé', packId)
  return 'encaisser'
}
