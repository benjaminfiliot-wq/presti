import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { MEDIA_BUCKET } from '@/lib/media'
import { PLANS, planConf, enOctets, PLAFOND_IMAGES_MO, PLAFOND_PHOTOS_CLIENTS_MO, type PlanId } from '@/lib/plans'

// Quota de stockage par compte (audit final, auditeur F, majeur 4.3 et 4.4).
//
// Le défaut : le bucket `artisan-media` n'avait AUCUN plafond par compte. La politique de
// 0024 vérifiait seulement que le dossier portait le nom de l'artisan ; la taille était
// bornée par fichier (15 Mo) et pas du tout par compte. Un compte d'essai — gratuit, sans
// carte, ouvert à l'inscription — pouvait donc téléverser en boucle depuis le navigateur :
// ~70 envois et l'offre Supabase entière (1 Go) est pleine. Le dépassement ne punit pas le
// fautif, il coupe le projet : TOUS les artisans perdent leurs images en même temps.
//
// Trois décisions, écrites ici pour qu'on ne les redécouvre pas :
//
// 1. LE PLAFOND EST SERVEUR, ET LE NAVIGATEUR NE SAIT PLUS ÉCRIRE. Un plafond vérifié dans
//    le composant d'import ne vaut rien : la clé anon est publique, l'appel au stockage se
//    refait à la main. La migration 0059 retire donc la policy d'écriture du navigateur ;
//    tout passe par /api/media, qui compte avant d'écrire.
//
// 2. ON MESURE LE VRAI, ON NE TIENT PAS DE COMPTEUR. Pour `artisan-media` l'usage est la
//    somme des tailles réelles du dossier de l'artisan (API Storage). Un compteur en base
//    dériverait à la première suppression faite ailleurs (purge de compte, suppression de
//    site, ménage manuel dans la console Supabase) et le quota mentirait — dans le sens qui
//    coûte le plus cher : un artisan bloqué alors qu'il a de la place. La mesure coûte un
//    appel `list` par envoi ; un import d'images, c'est quelques envois par session, pas un
//    chemin chaud. La libération après suppression est alors automatique, sans code.
//
// 3. `lead-media` NE SE MESURE PAS PAREIL. Ses fichiers sont rangés par conversation
//    (`<leadId>/<i>.<ext>`), pas par artisan : mesurer le vrai demanderait un `list` par
//    conversation, donc des centaines d'appels. Là, un compteur EST justifié — c'est la
//    colonne `leads.photos_octets` (0059), remise à zéro par un trigger dès que les photos
//    disparaissent, pour que le compteur ne survive jamais à ce qu'il compte.
//
// Le fail-open est assumé, comme dans lib/limites et consumeCredit : si la mesure est
// indisponible (panne Storage, migration pas encore posée), on laisse passer et on le dit
// fort en console. Un compteur cassé ne doit pas empêcher un artisan de finir son site —
// la borne par fichier, elle, ne dépend d'aucune mesure et tient toujours.

const MO = 1024 * 1024

/**
 * Plafond des images de l'artisan (logo, réalisations, avatars, photos d'inventaire).
 * L'essai reste utilisable — logo + avatar + une dizaine de réalisations tiennent dans
 * 25 Mo — mais 40 comptes d'essai ne suffisent plus à remplir l'offre Supabase.
 */
// Les valeurs (en Mo) vivent dans lib/plans.ts : la grille des offres affichée au public lit les mêmes.
const PLAFOND_IMAGES: Record<PlanId, number> = enOctets(PLAFOND_IMAGES_MO)

/**
 * Plafond des photos de chantier envoyées par les PROSPECTS. Plus serré que les images de
 * l'artisan : il ne les choisit pas, et c'est la surface qu'un tiers peut remplir.
 */
const PLAFOND_PHOTOS_CLIENTS: Record<PlanId, number> = enOctets(PLAFOND_PHOTOS_CLIENTS_MO)

/**
 * Plafond par CONVERSATION. Une demande de devis, ce sont trois photos compressées
 * (≈ 900 Ko chacune) : 3 Mo laissent de la marge. Il borne le cas que le plafond par
 * artisan ne voit pas venir — un seul prospect qui pousse des photos non compressées.
 */
export const PLAFOND_CONVERSATION = 3 * MO

/**
 * Borne dure par fichier sur /api/media. Volontairement sous la limite de corps de requête
 * de l'hébergeur (4,5 Mo) : au-delà, l'artisan recevrait une erreur de plateforme illisible
 * au lieu d'un message de nous. Le parcours d'import produit au pire 1,6 Mo (lib/media.ts).
 */
export const TAILLE_MAX_FICHIER = 4 * MO

/** Le plan tel qu'il est écrit en base, ramené à une clé connue de la matrice des offres. */
const idPlan = (plan: string | null | undefined): PlanId =>
  plan && Object.prototype.hasOwnProperty.call(PLANS, plan) ? (plan as PlanId) : 'gratuit'

export const plafondImages = (plan: string | null | undefined): number => PLAFOND_IMAGES[idPlan(plan)]
export const plafondPhotosClients = (plan: string | null | undefined): number => PLAFOND_PHOTOS_CLIENTS[idPlan(plan)]

/** « 25 Mo », « 1,4 Mo », « 1 Go » — jamais de « 26214400 » à l'écran. */
export function formaterOctets(octets: number): string {
  const n = Math.max(0, octets)
  if (n >= 1024 * MO) return `${String(Math.round((n / (1024 * MO)) * 10) / 10).replace('.', ',')} Go`
  const mo = n / MO
  return `${String(mo >= 10 ? Math.round(mo) : Math.round(mo * 10) / 10).replace('.', ',')} Mo`
}

/** Signature et Business n'ont pas d'offre au-dessus : leur proposer d'y passer serait une impasse. */
const aUneOffreAuDessus = (plan: string | null | undefined): boolean =>
  idPlan(plan) !== 'signature' && idPlan(plan) !== 'business'

/** Le message que voit l'artisan. Il dit la limite, l'offre, et les DEUX portes de sortie. */
export function messagePlafondImages(plan: string | null | undefined, utilise: number): string {
  const sortie = aUneOffreAuDessus(plan)
    ? 'supprimez-en ou passez à l’offre supérieure'
    : 'supprimez-en pour faire de la place'
  return `Vous avez atteint la limite de ${formaterOctets(plafondImages(plan))} d’images de votre offre ${planConf(plan).label}`
    + ` (${formaterOctets(utilise)} utilisés) — ${sortie}.`
}

/**
 * Usage réel du dossier de l'artisan dans `artisan-media`, en octets.
 * `null` = mesure indisponible (l'appelant laisse alors passer, cf. en-tête).
 */
export async function octetsImages(uid: string): Promise<number | null> {
  try {
    let total = 0
    // Pagination : `list` plafonne à 1000 entrées. La boucle est bornée pour qu'une réponse
    // anormale du stockage ne fasse jamais tourner la route en rond.
    for (let page = 0; page < 20; page++) {
      const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET)
        .list(uid, { limit: 1000, offset: page * 1000 })
      if (error) { console.error('[quotaMedia] list', MEDIA_BUCKET, ':', error.message, '(on laisse passer)'); return null }
      const lot = data ?? []
      for (const f of lot) total += Number((f.metadata as { size?: number } | null)?.size ?? 0)
      if (lot.length < 1000) break
    }
    return total
  } catch (e) {
    console.error('[quotaMedia] mesure des images indisponible (on laisse passer):', e instanceof Error ? e.message : e)
    return null
  }
}

export type Verdict =
  | { ok: true; utilise: number; plafond: number }
  | { ok: false; message: string; utilise: number; plafond: number }

/**
 * Le fichier de `taille` octets tient-il encore dans l'offre de l'artisan ?
 * À appeler AVANT l'écriture — un refus après coup ne rend pas la place.
 */
export async function verifierQuotaImages(uid: string, plan: string | null | undefined, taille: number): Promise<Verdict> {
  const plafond = plafondImages(plan)
  const utilise = await octetsImages(uid)
  if (utilise === null) return { ok: true, utilise: 0, plafond } // mesure absente : on ne bloque pas
  if (utilise + taille > plafond) return { ok: false, message: messagePlafondImages(plan, utilise), utilise, plafond }
  return { ok: true, utilise, plafond }
}

/** Octets de photos de chantier déjà stockés pour cet artisan (`null` = mesure indisponible). */
export async function octetsPhotosClients(artisanId: string): Promise<number | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('octets_lead_media', { p_artisan: artisanId })
    if (error) { console.error('[quotaMedia] rpc octets_lead_media:', error.message, '(on laisse passer)'); return null }
    return Number(data ?? 0)
  } catch (e) {
    console.error('[quotaMedia] octets_lead_media indisponible (on laisse passer):', e instanceof Error ? e.message : e)
    return null
  }
}

export type PorteMonnaie = {
  /** Vrai si cette photo tient dans les deux plafonds — elle est alors décomptée. */
  accepte: (taille: number) => boolean
  /** Octets réellement acceptés jusqu'ici (à écrire dans `leads.photos_octets`). */
  octets: () => number
}

/**
 * Porte-monnaie d'octets pour les photos d'UNE conversation : fonction pure, pour que la
 * décision se teste sans base ni réseau (scripts/quota-media-e2e.mjs).
 * `restantArtisan` peut valoir `Infinity` quand la mesure est indisponible.
 */
export function porteMonnaie(restantArtisan: number, plafondConversation = PLAFOND_CONVERSATION): PorteMonnaie {
  let consomme = 0
  return {
    accepte(taille: number): boolean {
      if (taille <= 0) return false
      if (consomme + taille > plafondConversation) return false
      if (consomme + taille > restantArtisan) return false
      consomme += taille
      return true
    },
    octets: () => consomme,
  }
}

/** Le porte-monnaie de cette conversation, une fois l'usage de l'artisan mesuré. */
export async function porteMonnaieConversation(artisanId: string, plan: string | null | undefined): Promise<PorteMonnaie> {
  const deja = await octetsPhotosClients(artisanId)
  const restant = deja === null
    ? Number.POSITIVE_INFINITY // mesure indisponible : on ne perd pas les photos d'un vrai prospect
    : Math.max(0, plafondPhotosClients(plan) - deja)
  return porteMonnaie(restant)
}
