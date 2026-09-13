// lib/siteCommandeServeur.ts — le site à la demande, côté serveur SEULEMENT (service_role).
//
// Trois responsabilités, et pas une de plus : lire et écrire le dossier d'un artisan (les écrans), poser
// l'identifiant de session Stripe avant le paiement, et ENCAISSER au webhook — c'est-à-dire passer le
// brouillon à 'payee'. Le webhook ne crée jamais de ligne : s'il ne trouve pas de brouillon à passer,
// c'est qu'il l'a déjà fait (rejeu Stripe) ou qu'il y a une anomalie, et les deux se distinguent.
import type Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { mentionFranchise } from '@/lib/facturation'
import { notifierEntreprise } from '@/lib/email'
import { PRIX_SITE_CENTS, type Brouillon, type Commande } from '@/lib/siteCommande'

const COLONNES = 'id, artisan_id, email, etat, domaine_mode, domaine, metier, metiers_secondaires, communes, matiere, prix_cents, stripe_session_id, paye_le, genere_le, valide_le, en_ligne_le, consigne, cree_le, modifie_le'

/** Le brouillon courant de l'artisan (il n'y en a qu'un à la fois : un dossier, puis un paiement). */
export async function brouillonDe(uid: string): Promise<Commande | null> {
  const { data, error } = await supabaseAdmin.from('sites_commandes').select(COLONNES).eq('artisan_id', uid).eq('etat', 'brouillon').order('modifie_le', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(`lecture du brouillon impossible : ${error.message}`)
  return (data as Commande | null) ?? null
}

/** Toutes les commandes de l'artisan, la plus récente d'abord — pour l'écran d'état. */
export async function commandesDe(uid: string): Promise<Commande[]> {
  const { data, error } = await supabaseAdmin.from('sites_commandes').select(COLONNES).eq('artisan_id', uid).order('cree_le', { ascending: false }).limit(20)
  if (error) throw new Error(`lecture des commandes impossible : ${error.message}`)
  return (data as Commande[]) ?? []
}

/** Écrit le brouillon nettoyé (lib/siteCommande.ts). Un brouillon existant est mis à jour, sinon créé. */
export async function enregistrerBrouillon(uid: string, email: string, b: Brouillon): Promise<Commande> {
  const courant = await brouillonDe(uid)
  const champs = { ...b, email, modifie_le: new Date().toISOString() }
  const req = courant
    ? supabaseAdmin.from('sites_commandes').update(champs).eq('id', courant.id).eq('etat', 'brouillon').select(COLONNES).single()
    : supabaseAdmin.from('sites_commandes').insert({ ...champs, artisan_id: uid, prix_cents: PRIX_SITE_CENTS }).select(COLONNES).single()
  const { data, error } = await req
  if (error || !data) throw new Error(`écriture du brouillon impossible : ${error?.message ?? 'aucune ligne'}`)
  return data as Commande
}

/** Juste avant de rediriger vers Stripe : la session est rattachée au brouillon, pour que le webhook
 *  retrouve le dossier même si les métadonnées de Stripe manquaient. */
export async function poserSessionStripe(id: string, uid: string, sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('sites_commandes').update({ stripe_session_id: sessionId, modifie_le: new Date().toISOString() }).eq('id', id).eq('artisan_id', uid).eq('etat', 'brouillon')
  if (error) throw new Error(`rattachement de la session Stripe impossible : ${error.message}`)
}

export type Encaissement = 'encaissee' | 'deja_encaissee' | 'introuvable'

/** Au webhook (checkout.session.completed, mode 'payment', metadata.type = 'commande_site'). */
export async function encaisserCommandeSite(s: Stripe.Checkout.Session): Promise<Encaissement> {
  const commandeId = String(s.metadata?.commande_id || '')
  const uid = String(s.metadata?.uid || s.client_reference_id || '')
  const { data: avant, error: eLecture } = await supabaseAdmin.from('sites_commandes').select('id, artisan_id, etat, prix_cents, email, stripe_session_id').eq('id', commandeId).maybeSingle()
  if (eLecture) throw new Error(`lecture de la commande ${commandeId} impossible : ${eLecture.message}`)
  if (!avant) {
    // Un paiement sans dossier : ça ne doit pas exister. On prévient et on laisse Stripe rejouer (500
    // en amont) — un humain doit voir ça, et rembourser si le dossier n'apparaît pas.
    await notifierEntreprise('⚠ Paiement de site sans dossier', `Session ${s.id} payée (${s.amount_total} ${s.currency}) pour une commande introuvable : ${commandeId || '(vide)'}, artisan ${uid || '(vide)'}.`)
    return 'introuvable'
  }
  if (avant.etat !== 'brouillon') {
    // Rejeu Stripe : même session, déjà passée. Autre session sur un dossier déjà payé : anomalie, on prévient.
    if (avant.stripe_session_id !== s.id) await notifierEntreprise('⚠ Second paiement sur une commande de site', `Commande ${commandeId} (${avant.etat}) déjà rattachée à ${avant.stripe_session_id ?? '—'} ; nouvelle session ${s.id} (${s.amount_total} ${s.currency}). À rembourser si double paiement.`)
    return 'deja_encaissee'
  }
  const montantAttendu = avant.prix_cents ?? PRIX_SITE_CENTS
  if (typeof s.amount_total === 'number' && s.amount_total !== montantAttendu) {
    console.warn('[site commande] montant inattendu', s.id, s.amount_total, 'attendu', montantAttendu)
  }
  const maj = {
    etat: 'payee',
    stripe_session_id: s.id,
    stripe_payment_intent_id: typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null,
    paye_le: new Date().toISOString(),
    email: s.customer_details?.email || avant.email,
    modifie_le: new Date().toISOString(),
  }
  // La condition `etat = 'brouillon'` fait l'idempotence avec l'index unique : deux webhooks en même
  // temps ne passent pas deux fois — le second ne trouve plus de brouillon et on le traite comme un rejeu.
  const { data: passe, error: eMaj } = await supabaseAdmin.from('sites_commandes').update(maj).eq('id', commandeId).eq('etat', 'brouillon').select('id')
  if (eMaj) throw new Error(`encaissement de la commande ${commandeId} impossible : ${eMaj.message}`)
  if (!passe || passe.length === 0) return 'deja_encaissee'

  // Le pied de facture Stripe : la franchise en base, tant que l'entreprise n'est pas assujettie.
  const clientId = typeof s.customer === 'string' ? s.customer : s.customer?.id
  if (clientId && stripe && process.env.STRIPE_TAXE_AUTO !== '1') {
    await stripe.customers.update(clientId, { invoice_settings: { footer: mentionFranchise('auto') } }).catch((e) => console.error('[site commande] pied de facture', e))
  }
  const { data: a } = await supabaseAdmin.from('artisans').select('nom, email, metier').eq('id', avant.artisan_id ?? uid).maybeSingle()
  await notifierEntreprise(
    `Commande de site — ${a?.nom || avant.email}`,
    `Un site à la demande vient d'être payé.\n\nArtisan : ${a?.nom || '—'} (${a?.metier || '—'})\nEmail : ${a?.email || avant.email}\nCommande : ${commandeId}\nMontant encaissé : ${typeof s.amount_total === 'number' ? (s.amount_total / 100).toFixed(2) + ' ' + (s.currency || 'eur').toUpperCase() : '—'}\n\nÉtat : payee — la génération peut démarrer (délai annoncé : 48 h ouvrées).`,
  )
  console.log('[site commande] encaissée', commandeId)
  return 'encaissee'
}
