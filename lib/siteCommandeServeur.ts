// lib/siteCommandeServeur.ts — le site à la demande, côté serveur SEULEMENT (service_role).
//
// Quatre responsabilités, et pas une de plus : lire et écrire le dossier d'un artisan (les écrans), bâtir LE
// Checkout du site (un seul constructeur, avec ou sans compte), poser l'identifiant de session Stripe avant le
// paiement, et ENCAISSER au webhook — c'est-à-dire passer le brouillon à 'payee'. Le webhook ne crée jamais de
// ligne : s'il ne trouve pas de brouillon à passer, c'est qu'il l'a déjà fait (rejeu Stripe) ou qu'il y a une
// anomalie, et les deux se distinguent.
import type Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { mentionFranchise } from '@/lib/facturation'
import { notifierEntreprise } from '@/lib/email'
import { PRIX_SITE_CENTS, DELAI_TEXTE, type Brouillon, type Commande } from '@/lib/siteCommande'

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

/** La même chose pour un achat SANS compte (fiche 026-025) : aucune session d'artisan à comparer, donc la ligne doit
 *  être une commande publique, sans compte, encore en brouillon — jamais celle d'un artisan. */
export async function poserSessionStripePublique(id: string, sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('sites_commandes').update({ stripe_session_id: sessionId, modifie_le: new Date().toISOString() }).eq('id', id).is('artisan_id', null).eq('achat_public', true).eq('etat', 'brouillon')
  if (error) throw new Error(`rattachement de la session Stripe impossible : ${error.message}`)
}

export type EntreeCheckoutSite = {
  commandeId: string
  /** L'adresse de l'acheteur : le client Stripe d'un artisan la remplace ; sans compte, c'est elle qui est facturée. */
  email: string | null
  /** Le client Stripe de l'artisan (abonnement passé) ; ignoré pour un achat sans compte. */
  clientStripe: string | null
  /** L'artisan connecté ; null pour un achat sans compte. */
  uid: string | null
  origin: string
  public: boolean
  /** La preuve du renoncement exprès au délai de rétractation (L221-28 1°, 000-retractation) : l'horodatage que la route
   *  pose APRÈS avoir refusé tout corps sans accord. Il part dans les deux jeux de métadonnées, avec ou sans compte. */
  metadata: { retractation_accord: string }
}

/**
 * Le seul constructeur du Checkout du site à la demande (fiche 026-025) : la route avec compte et la route publique
 * l'appellent, aucune ne bâtit son paiement elle-même. Stripe Checkout en mode 'payment' (un paiement, pas un abonnement),
 * 300 € nets — franchise en base, art. 293 B : l'interrupteur STRIPE_TAXE_AUTO gouverne ici comme dans /api/subscribe,
 * sinon le site dirait une chose et la facture une autre. Le prix vient de STRIPE_PRIX_SITE (le produit créé par Benj
 * dans Stripe, H1) quand la variable existe ; sinon d'un prix en ligne, ce qui suffit en mode test.
 * Les deux variantes ne diffèrent que par le client (customer ou customer_email), l'artisan (uid, client_reference_id),
 * la marque de l'achat public (metadata.achat) et les adresses de retour.
 */
export function parametresCheckoutSite(p: EntreeCheckoutSite): Stripe.Checkout.SessionCreateParams {
  const taxeAuto = process.env.STRIPE_TAXE_AUTO === '1'
  const prixStripe = process.env.STRIPE_PRIX_SITE
  const accord = typeof p.metadata?.retractation_accord === 'string' ? p.metadata.retractation_accord : null
  const metadata: Record<string, string> = {
    ...(p.public ? { achat: 'public' } : { uid: p.uid ?? '' }),
    type: 'commande_site',
    commande_id: p.commandeId,
    ...(accord ? { retractation_accord: accord } : {}),
  }
  // Sans compte : jamais de client Stripe réutilisé (on ne sait pas à qui il appartient), la facture part à l'adresse saisie.
  const client = p.public
    ? (p.email ? { customer_email: p.email } : {})
    : p.clientStripe ? { customer: p.clientStripe } : p.email ? { customer_email: p.email } : {}
  return {
    mode: 'payment',
    line_items: [prixStripe
      ? { price: prixStripe, quantity: 1 }
      : {
        price_data: {
          currency: 'eur',
          product_data: { name: 'Presti — votre site, à la demande', description: `Site professionnel avec référencement local. ${DELAI_TEXTE} Une fois, sans abonnement.` },
          unit_amount: PRIX_SITE_CENTS,
          ...(taxeAuto ? { tax_behavior: 'exclusive' as const } : {}),
        },
        quantity: 1,
      }],
    // La facture Stripe est la facture de Presti à l'artisan (art. 242 nonies A, ann. II CGI) : identité
    // complète du client professionnel, et une vraie facture même pour un paiement unique.
    billing_address_collection: 'required' as const,
    tax_id_collection: { enabled: true },
    invoice_creation: { enabled: true, invoice_data: { description: 'Site à la demande — Presti', ...(taxeAuto ? {} : { footer: mentionFranchise('auto') }) } },
    // customer_update n'existe qu'avec customer (Stripe le refuse sans client).
    ...(!p.public && p.clientStripe ? { customer_update: { address: 'auto' as const, name: 'auto' as const } } : {}),
    ...(taxeAuto ? { automatic_tax: { enabled: true } } : {}),
    ...client,
    ...(!p.public && p.uid ? { client_reference_id: p.uid } : {}),
    metadata,
    payment_intent_data: { metadata: { ...metadata } },
    success_url: p.public ? `${p.origin}/site/commander/merci?commande=${p.commandeId}` : `${p.origin}/site/commander?paiement=ok&commande=${p.commandeId}`,
    cancel_url: p.public ? `${p.origin}/site/acheter?annule=1` : `${p.origin}/site/commander?paiement=annule`,
  }
}

export type Encaissement = 'encaissee' | 'deja_encaissee' | 'introuvable'

/** Au webhook (checkout.session.completed, mode 'payment', metadata.type = 'commande_site'). */
export async function encaisserCommandeSite(s: Stripe.Checkout.Session): Promise<Encaissement> {
  const commandeId = String(s.metadata?.commande_id || '')
  const uid = String(s.metadata?.uid || s.client_reference_id || '')
  const { data: avant, error: eLecture } = await supabaseAdmin.from('sites_commandes').select('id, artisan_id, etat, prix_cents, email, stripe_session_id, achat_public, entreprise').eq('id', commandeId).maybeSingle()
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
  // Un achat sans compte (fiche 026-025) n'a pas d'artisan : on n'en cherche aucun (l'uid vide ne doit rien lire).
  const idArtisan = avant.artisan_id ?? (avant.achat_public ? null : uid || null)
  const { data: a } = idArtisan ? await supabaseAdmin.from('artisans').select('nom, email, metier').eq('id', idArtisan).maybeSingle() : { data: null }
  await notifierEntreprise(
    `Commande de site — ${a?.nom || avant.entreprise || avant.email}`,
    `Un site à la demande vient d'être payé.\n\n${avant.achat_public && !avant.artisan_id ? `Achat sans compte : ${avant.entreprise || '—'} — le compte se crée maintenant, le lien de connexion part à l'acheteur.\n` : `Artisan : ${a?.nom || '—'} (${a?.metier || '—'})\n`}Email : ${a?.email || maj.email}\nCommande : ${commandeId}\nMontant encaissé : ${typeof s.amount_total === 'number' ? (s.amount_total / 100).toFixed(2) + ' ' + (s.currency || 'eur').toUpperCase() : '—'}\n\nÉtat : payee — la génération peut démarrer (délai annoncé : 48 h ouvrées).`,
  )
  console.log('[site commande] encaissée', commandeId)
  return 'encaissee'
}
