// lib/packPub.ts — le pack pubs locales (fiche 026-108 §« Contrat du pack », fiche 026-112) : ce qu'un pack EST et ce
// qu'il faut pour le payer, sans serveur.
//
// Importable côté client (les écrans du pack) comme côté serveur (route, webhook) : aucun secret, aucun accès à la
// base, aucun réseau — seule dépendance : lib/facturation.ts (mention de franchise, elle aussi pure). Le prix
// n'existe qu'ici — 149 €, une fois — comme lib/siteCommande.ts pour le site à la demande. Le contrat exact (prix,
// états, accroches, matière) vient de scripts/fixtures/026-pubs-contenu/contrat-pack.json (fiche 026-108) : toute
// fiche qui change le contrat change ce fichier ET son juge, dans le même geste — jamais l'un sans l'autre.
import type Stripe from 'stripe'
import { mentionFranchise } from '@/lib/facturation'

export const PRIX_PACK_PUB_CENTS = 14900
export const PRIX_PACK_PUB_TEXTE = '149 €'

export const ETATS_PACK = ['brouillon', 'payee', 'fabriquee', 'livree'] as const
export type EtatPack = (typeof ETATS_PACK)[number]
/** livree → payee : la retouche unique promise par les CGU 3 ter (route du Poste : refaits = 0, avant lien_expire_le). */
export const TRANSITIONS_PACK: Record<EtatPack, EtatPack[]> = {
  brouillon: ['payee'],
  payee: ['fabriquee'],
  fabriquee: ['livree', 'payee'],
  livree: ['payee'],
}
export const transitionPackValide = (de: EtatPack, vers: EtatPack): boolean => TRANSITIONS_PACK[de]?.includes(vers) ?? false
export const LIBELLE_ETAT_PACK: Record<EtatPack, string> = {
  brouillon: 'Dossier en cours',
  payee: 'Payé — en fabrication',
  fabriquee: 'Prêt — en livraison',
  livree: 'Livré',
}

/** Liste fermée (contrat) : aucun chiffre, aucun label, aucun superlatif, aucun délai — le texte affiché se bâtit
 *  à partir de ces clés (avec {metier} et {ville}) sur les écrans, jamais ici. */
export const ACCROCHES_PACK = [
  'artisan_de_confiance',
  'avant_apres',
  'proximite_locale',
  'reactivite',
  'garantie_decennale',
  'avis_clients',
  'savoir_faire',
  'intervention_rapide',
] as const
export type AccrochePack = (typeof ACCROCHES_PACK)[number]

export const ROLES_PHOTO_PACK = ['avant', 'apres', 'chantier', 'detail', 'equipe'] as const
export type RolePhotoPack = (typeof ROLES_PHOTO_PACK)[number]
export const PHOTOS_PACK_MIN = 6
export const PHOTOS_PACK_MAX = 12

export const CTA_PACK = ['devis', 'appel', 'message'] as const
export type CtaPack = (typeof CTA_PACK)[number]

export const VOIX_PACK = ['aucune', 'synthese'] as const
export type VoixPack = (typeof VOIX_PACK)[number]
export const TEXTE_VOIX_MIN = 20
export const TEXTE_VOIX_MAX = 220

export type PhotoPack = {
  url: string
  role: RolePhotoPack
  personnes?: boolean
  accord_personnes?: boolean
  paire?: string
}
export type FaitsPack = {
  metier: string
  ville: string
  communes: string[]
  duree_travaux?: string | null
  materiaux?: string | null
  decennale: boolean
  cta: CtaPack
  telephone?: string | null
}
export type MatierePack = {
  photos: PhotoPack[]
  logo_url?: string | null
  faits: FaitsPack
  accroche: string
  voix: VoixPack
  texte_voix?: string | null
  consentement_droits: boolean
}

/** Ce qui manque pour payer — chaque phrase se termine par « (champ …) » : le nom exact attendu par les écrans et
 *  par le juge. Jamais de rejet plus tôt : c'est cette fonction, seule, qui bloque le paiement. */
export function erreursAvantPaiementPack(d: Partial<MatierePack> | null | undefined): string[] {
  const e: string[] = []
  const dossier = d ?? {}
  const photos = Array.isArray(dossier.photos) ? dossier.photos : []

  if (photos.length < PHOTOS_PACK_MIN || photos.length > PHOTOS_PACK_MAX) {
    e.push(`Il faut de ${PHOTOS_PACK_MIN} à ${PHOTOS_PACK_MAX} photos (${photos.length} reçue(s)) (champ photos).`)
  }
  photos.forEach((p, i) => {
    const n = i + 1
    const photo = (p ?? {}) as Partial<PhotoPack>
    const role = photo.role
    if (!role || !(ROLES_PHOTO_PACK as readonly string[]).includes(role)) {
      e.push(`Photo ${n} : le rôle est invalide ou absent — avant, apres, chantier, detail ou equipe attendu (champ role).`)
    } else if (role === 'equipe' && photo.personnes !== true) {
      e.push(`Photo ${n} : le rôle « equipe » suppose des personnes visibles, personnes doit valoir true (champ role).`)
    }
    if (photo.personnes === true && photo.accord_personnes !== true) {
      e.push(`Photo ${n} : des personnes apparaissent, l'accord doit être donné (champ accord_personnes).`)
    }
  })

  const f = (dossier.faits ?? {}) as Partial<FaitsPack>
  const cta = f.cta
  if (!f.metier) e.push('Le métier manque (champ metier).')
  if (!f.ville) e.push('La ville manque (champ ville).')
  if (!Array.isArray(f.communes) || f.communes.length < 1) e.push('Indiquez au moins une commune réellement servie (champ communes).')
  if (typeof f.decennale !== 'boolean') e.push('La décennale doit être déclarée, vrai ou faux (champ decennale).')
  if (!cta || !(CTA_PACK as readonly string[]).includes(cta)) e.push('Le CTA doit être devis, appel ou message (champ cta).')
  if (cta === 'appel' && !f.telephone) e.push('Le CTA « appel » demande un numéro de téléphone (champ telephone).')

  const accroche = dossier.accroche
  if (!accroche || !(ACCROCHES_PACK as readonly string[]).includes(accroche)) {
    e.push('L’accroche doit venir de la liste fermée du pack (champ accroche).')
  }

  const voix = dossier.voix
  if (!voix || !(VOIX_PACK as readonly string[]).includes(voix)) {
    e.push('La voix doit être « aucune » ou « synthese » (champ voix).')
  } else if (voix === 'synthese') {
    const t = dossier.texte_voix
    if (!t || t.length < TEXTE_VOIX_MIN || t.length > TEXTE_VOIX_MAX) {
      e.push(`Le texte de la voix doit compter de ${TEXTE_VOIX_MIN} à ${TEXTE_VOIX_MAX} signes (champ texte_voix).`)
    } else if (/\d/.test(t)) {
      e.push('Le texte de la voix ne doit porter aucun chiffre (champ texte_voix).')
    }
  }

  if (dossier.consentement_droits !== true) {
    e.push('Le consentement sur les droits des photos doit être donné (champ consentement_droits).')
  }

  return e
}

/** L'état lu en base juste avant le webhook (lib/packPubServeur.ts) : rien de plus que ce que decisionEncaissement
 *  a besoin de comparer. `null` = aucune ligne trouvée pour ce pack_id. */
export type LignePackAvantEncaissement = { etat: EtatPack | string; stripe_session_id: string | null } | null

/**
 * Ce qu'il faut faire d'un paiement Stripe reçu au webhook, en comparant l'état AVANT écriture à la session payée :
 *   · aucune ligne                                  → 'introuvable' (paiement sans dossier, une anomalie)
 *   · ligne encore 'brouillon'                       → 'encaisser'
 *   · ligne déjà passée, MÊME session Stripe          → 'deja' (rejeu Stripe du même événement, idempotent)
 *   · ligne déjà passée, AUTRE session Stripe          → 'second_paiement' (anomalie, remboursement probable)
 * Fonction pure : ni base ni Stripe ici, `lib/packPubServeur.ts` fait l'écriture et me passe ce qu'elle a lu.
 */
export function decisionEncaissement(
  avant: LignePackAvantEncaissement,
  session: { id: string },
): 'encaisser' | 'deja' | 'second_paiement' | 'introuvable' {
  if (!avant) return 'introuvable'
  if (avant.etat === 'brouillon') return 'encaisser'
  return avant.stripe_session_id === session.id ? 'deja' : 'second_paiement'
}

export type EntreeCheckoutPack = {
  uid: string
  packId: string
  email?: string | null
  clientStripe?: string | null
  /** Le prix Stripe du produit créé par Benj (variable STRIPE_PRIX_PACK_PUB) ; sinon un prix en ligne (mode test). */
  prixStripe?: string
  /** Par défaut lu sur STRIPE_TAXE_AUTO, comme parametresCheckoutSite : un seul interrupteur pour tout Presti. */
  taxeAuto?: boolean
  origin: string
}

/**
 * Le seul constructeur du Checkout du pack pubs (calqué sur parametresCheckoutSite, lib/siteCommandeServeur.ts:114) :
 * un paiement (mode 'payment'), 149 € nets — franchise en base, art. 293 B — sauf si taxeAuto. La route qui vend le
 * pack (fiche 026-118) l'appelle ; elle ne bâtit jamais son paiement elle-même.
 */
export function parametresCheckoutPack(p: EntreeCheckoutPack): Stripe.Checkout.SessionCreateParams {
  const taxeAuto = p.taxeAuto ?? process.env.STRIPE_TAXE_AUTO === '1'
  const prixStripe = p.prixStripe ?? process.env.STRIPE_PRIX_PACK_PUB
  const metadata: Record<string, string> = { uid: p.uid, type: 'pack_pub', pack_id: p.packId }
  const client = p.clientStripe ? { customer: p.clientStripe } : p.email ? { customer_email: p.email } : {}
  return {
    mode: 'payment',
    line_items: [prixStripe
      ? { price: prixStripe, quantity: 1 }
      : {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Presti — pack pubs locales',
            description: `${PRIX_PACK_PUB_TEXTE}, une fois. Publicités locales prêtes à diffuser, faites de vos photos.`,
          },
          unit_amount: PRIX_PACK_PUB_CENTS,
          ...(taxeAuto ? { tax_behavior: 'exclusive' as const } : {}),
        },
        quantity: 1,
      }],
    // La facture Stripe est la facture de Presti à l'artisan (art. 242 nonies A, ann. II CGI).
    billing_address_collection: 'required' as const,
    tax_id_collection: { enabled: true },
    invoice_creation: { enabled: true, invoice_data: { description: 'Pack pubs locales — Presti', ...(taxeAuto ? {} : { footer: mentionFranchise('auto') }) } },
    ...(p.clientStripe ? { customer_update: { address: 'auto' as const, name: 'auto' as const } } : {}),
    ...(taxeAuto ? { automatic_tax: { enabled: true } } : {}),
    ...client,
    client_reference_id: p.uid,
    metadata,
    payment_intent_data: { metadata: { ...metadata } },
    success_url: `${p.origin}/pubs/commander?paiement=ok&pack=${p.packId}`,
    cancel_url: `${p.origin}/pubs/commander?paiement=annule`,
  }
}
