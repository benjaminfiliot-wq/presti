// lib/packPubServeur.ts — le pack pubs locales, côté serveur SEULEMENT (service_role).
//
// Même charpente que lib/siteCommandeServeur.ts (le site à la demande) : lire/écrire le brouillon de l'artisan, poser
// l'identifiant de session Stripe avant le paiement, et ENCAISSER au webhook — passer le brouillon à 'payee'. Le
// webhook ne crée JAMAIS de ligne : sans brouillon à passer, decisionEncaissement (lib/packPub.ts) dit si c'est un
// rejeu (déjà payée), une anomalie (introuvable) ou un second paiement sur une ligne déjà payée.
//
// Table `packs_pubs` (contrat : scripts/fixtures/026-pubs-contenu/contrat-pack.json, fiche 026-114 pour la migration).
import type Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { mentionFranchise } from '@/lib/facturation'
import { notifierEntreprise } from '@/lib/email'
import { PRIX_PACK_PUB_CENTS, decisionEncaissement, type EtatPack, type MatierePack } from '@/lib/packPub'

const COLONNES = 'id, artisan_id, email, etat, matiere, prix_cents, stripe_session_id, stripe_payment_intent_id, paye_le, fabrique_le, livre_le, cree_le, modifie_le'

export type LignePack = {
  id: string
  artisan_id: string
  email: string
  etat: EtatPack
  matiere: MatierePack
  prix_cents: number
  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
  paye_le: string | null
  fabrique_le: string | null
  livre_le: string | null
  cree_le: string
  modifie_le: string
}

/** Le brouillon courant de l'artisan (un seul à la fois, comme le site à la demande). */
export async function brouillonPackDe(uid: string): Promise<LignePack | null> {
  const { data, error } = await supabaseAdmin.from('packs_pubs').select(COLONNES).eq('artisan_id', uid).eq('etat', 'brouillon').order('modifie_le', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(`lecture du brouillon de pack impossible : ${error.message}`)
  return (data as LignePack | null) ?? null
}

/** Écrit la matière nettoyée par les écrans (fiche 026-118). Un brouillon existant est mis à jour, sinon créé. */
export async function enregistrerBrouillonPack(uid: string, email: string, dossier: MatierePack): Promise<LignePack> {
  const courant = await brouillonPackDe(uid)
  const champs = { matiere: dossier, email, modifie_le: new Date().toISOString() }
  const req = courant
    ? supabaseAdmin.from('packs_pubs').update(champs).eq('id', courant.id).eq('artisan_id', uid).eq('etat', 'brouillon').select(COLONNES).single()
    : supabaseAdmin.from('packs_pubs').insert({ ...champs, artisan_id: uid, type: 'locale', etat: 'brouillon', prix_cents: PRIX_PACK_PUB_CENTS }).select(COLONNES).single()
  const { data, error } = await req
  if (error || !data) throw new Error(`écriture du brouillon de pack impossible : ${error?.message ?? 'aucune ligne'}`)
  return data as LignePack
}

/** Juste avant de rediriger vers Stripe : la session est rattachée au brouillon, pour que le webhook retrouve le
 *  dossier même si les métadonnées de Stripe manquaient. */
export async function poserSessionStripePack(id: string, uid: string, sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('packs_pubs').update({ stripe_session_id: sessionId, modifie_le: new Date().toISOString() }).eq('id', id).eq('artisan_id', uid).eq('etat', 'brouillon')
  if (error) throw new Error(`rattachement de la session Stripe (pack) impossible : ${error.message}`)
}

/**
 * Au webhook (checkout.session.completed, mode 'payment', metadata.type = 'pack_pub'). Lit la ligne, applique
 * decisionEncaissement, prévient l'entreprise sur 'introuvable' et 'second_paiement', et ne fait JAMAIS d'insertion :
 * si le brouillon n'existe pas, c'est une anomalie — pas une ligne à créer ici.
 */
export async function encaisserPackPub(s: Stripe.Checkout.Session): Promise<'encaisser' | 'deja' | 'second_paiement' | 'introuvable'> {
  const packId = String(s.metadata?.pack_id || '')
  const { data: avant, error: eLecture } = await supabaseAdmin.from('packs_pubs').select('id, artisan_id, etat, prix_cents, email, stripe_session_id').eq('id', packId).maybeSingle()
  if (eLecture) throw new Error(`lecture du pack ${packId} impossible : ${eLecture.message}`)

  const decision = decisionEncaissement(avant ? { etat: avant.etat, stripe_session_id: avant.stripe_session_id } : null, { id: s.id })

  if (decision === 'introuvable') {
    // Un paiement sans dossier : ça ne doit pas exister. On prévient et on laisse Stripe rejouer (500 en amont) —
    // un humain doit voir ça, et rembourser si le dossier n'apparaît pas.
    await notifierEntreprise('⚠ Paiement de pack pubs sans dossier', `Session ${s.id} payée (${s.amount_total} ${s.currency}) pour un pack introuvable : ${packId || '(vide)'}.`)
    return 'introuvable'
  }
  if (decision === 'second_paiement') {
    // Autre session sur un pack déjà payé : anomalie, on prévient pour un remboursement éventuel.
    await notifierEntreprise('⚠ Second paiement sur un pack pubs', `Pack ${packId} (${avant!.etat}) déjà rattaché à ${avant!.stripe_session_id ?? '—'} ; nouvelle session ${s.id} (${s.amount_total} ${s.currency}). À rembourser si double paiement.`)
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
  // La condition `etat = 'brouillon'` fait l'idempotence : deux webhooks en même temps ne passent pas deux fois — le
  // second ne trouve plus de brouillon et est traité comme un rejeu (même logique que siteCommandeServeur.ts).
  const { data: passe, error: eMaj } = await supabaseAdmin.from('packs_pubs').update(maj).eq('id', packId).eq('etat', 'brouillon').select('id')
  if (eMaj) throw new Error(`encaissement du pack ${packId} impossible : ${eMaj.message}`)
  if (!passe || passe.length === 0) return 'deja'

  // Le pied de facture Stripe : la franchise en base, tant que l'entreprise n'est pas assujettie.
  const clientId = typeof s.customer === 'string' ? s.customer : s.customer?.id
  if (clientId && stripe && process.env.STRIPE_TAXE_AUTO !== '1') {
    await stripe.customers.update(clientId, { invoice_settings: { footer: mentionFranchise('auto') } }).catch((e) => console.error('[pack pubs] pied de facture', e))
  }

  const { data: a } = await supabaseAdmin.from('artisans').select('nom, email, metier').eq('id', avant!.artisan_id).maybeSingle()
  await notifierEntreprise(
    `Pack pubs payé — ${a?.nom || avant!.email}`,
    `Un pack pubs locales vient d'être payé.\n\nArtisan : ${a?.nom || '—'} (${a?.metier || '—'})\nEmail : ${a?.email || maj.email}\nPack : ${packId}\nMontant encaissé : ${typeof s.amount_total === 'number' ? (s.amount_total / 100).toFixed(2) + ' ' + (s.currency || 'eur').toUpperCase() : '—'}\n\nÀ fabriquer sur le poste : node scripts/pack-pub/fabriquer.mjs`,
  )
  console.log('[pack pubs] encaissé', packId)
  return 'encaisser'
}
