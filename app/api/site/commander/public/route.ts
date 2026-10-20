// POST /api/site/commander/public — acheter son site SANS compte (fiche 026-025, plan §6.4), derrière le drapeau
// siteAchatPublic. { email, entreprise, metier, commune, cgu, renonciationRetractation, website } → { url } (Stripe).
//
// Dans cet ordre, et chaque étape avant la suivante : drapeaux (404) ; bannissement (403) ; piège `website` rempli (200
// neutre, rien créé, aucun plafond consommé : un robot n'apprend rien) ; plafonds (5 par heure et par adresse IP
// pseudonymisée, 50 par jour pour tout le site : 429) ; validation (400) ; insertion d'une commande brouillon SANS compte ;
// Checkout bâti par parametresCheckoutSite, le MÊME constructeur que l'achat avec compte ; session posée sur le brouillon.
//
// Mêmes garanties que l'achat avec compte (000-retractation, 27/09) : la case de renoncement L221-28 n'est jamais
// présumée — sans `renonciationRetractation: true` exact, 400 et aucun appel à Stripe — et son horodatage part dans les
// deux métadonnées Stripe (retractation_accord). La case des CGU est horodatée en base (cgu_acceptees_le).
// Aucun compte n'est créé ici : il naît au webhook, APRÈS le paiement (lib/siteAchatPublic.ts).
import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { getIp, isBanned, ipPseudonyme } from '@/lib/security'
import { consommerLimiteStricte } from '@/lib/limites'
// Audit du 20/10 : plafond FAIL-CLOSED (consommerLimiteStricte) — cette route dépense de l'IA ou écrit à un tiers ; base muette = refus, pas « tout passe ».
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PRIX_SITE_CENTS } from '@/lib/siteCommande'
import { parametresCheckoutSite, poserSessionStripePublique } from '@/lib/siteCommandeServeur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/
/** Un champ court : espaces resserrés ; vide s'il n'est pas du texte. */
const champ = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
/** Longueur bornée, et ni balise ni caractère de contrôle (le nom finit sur un site et dans un e-mail). */
const propre = (t: string, min: number, max: number): boolean =>
  t.length >= min && t.length <= max && !/[<>]/.test(t) && !/\p{Cc}/u.test(t)
/** Le retour après paiement : jamais l'origine d'une requête étrangère (un lien de paiement forgé ne renvoie pas ailleurs). */
const ORIGINE_SURE = /^(https:\/\/(www\.)?prestiapp\.fr|http:\/\/localhost(:\d{1,5})?)$/

export async function POST(req: Request) {
  if (!actif('siteAchatPublic') || !actif('siteCommande')) return new NextResponse(null, { status: 404 })

  const ip = getIp(req)
  if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const corps = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const donnees: Record<string, unknown> = corps && typeof corps === 'object' && !Array.isArray(corps) ? corps : {}
  // Le piège : un champ caché que seul un robot remplit. Réponse neutre, rien d'écrit, aucun plafond consommé.
  if (typeof donnees.website === 'string' && donnees.website.trim()) return NextResponse.json({ ok: true })

  if (!(await consommerLimiteStricte(`site-public:ip:${ipPseudonyme(ip) ?? 'inconnue'}`, 5, 3600))) {
    return NextResponse.json({ error: 'Trop de demandes depuis cette connexion : réessayez dans une heure.' }, { status: 429 })
  }
  if (!(await consommerLimiteStricte('site-public:jour', 50, 86_400))) {
    return NextResponse.json({ error: 'Trop de commandes aujourd’hui : réessayez demain.' }, { status: 429 })
  }

  const email = typeof donnees.email === 'string' ? donnees.email.trim().toLowerCase() : ''
  const entreprise = champ(donnees.entreprise), metier = champ(donnees.metier), commune = champ(donnees.commune)
  const champs: string[] = []
  if (email.length > 254 || !EMAIL.test(email)) champs.push('email')
  if (!propre(entreprise, 2, 80)) champs.push('entreprise')
  if (!propre(metier, 2, 60)) champs.push('metier')
  if (!propre(commune, 2, 80)) champs.push('commune')
  if (donnees.cgu !== true) champs.push('cgu')
  // L221-28 1° : le renoncement exprès, jamais présumé (même refus que /api/site/commander).
  if (donnees.renonciationRetractation !== true) champs.push('renonciationRetractation')
  if (champs.length) {
    return NextResponse.json({
      error: champs.length === 1 && champs[0] === 'renonciationRetractation'
        ? 'Vous devez accepter le début de la réalisation et reconnaître la perte du droit de rétractation une fois le site entièrement livré.'
        : 'Le formulaire est incomplet.',
      champs,
    }, { status: 400 })
  }
  if (!stripe) return NextResponse.json({ error: 'Paiement indisponible pour le moment.' }, { status: 503 })

  const id = crypto.randomUUID()
  const maintenant = new Date().toISOString()
  const { error: eCreation } = await supabaseAdmin.from('sites_commandes').insert({
    id,
    artisan_id: null,
    achat_public: true,
    email,
    entreprise,
    metier,
    communes: [commune],
    etat: 'brouillon',
    prix_cents: PRIX_SITE_CENTS,
    cgu_acceptees_le: maintenant,
    cree_le: maintenant,
    modifie_le: maintenant,
  })
  if (eCreation) {
    console.error('[site public] commande', eCreation.message)
    return NextResponse.json({ error: 'Impossible d’ouvrir la page de paiement pour le moment.' }, { status: 503 })
  }

  const originDemandee = req.headers.get('origin') || ''
  const origin = ORIGINE_SURE.test(originDemandee) ? originDemandee : 'https://prestiapp.fr'
  let sessionId: string | null = null
  try {
    const session = await stripe.checkout.sessions.create(parametresCheckoutSite({
      commandeId: id,
      email,
      clientStripe: null,
      uid: null,
      origin,
      public: true,
      // L'accord L221-28 vient d'être vérifié plus haut (400 sans lui) : son horodatage part dans les deux métadonnées.
      metadata: { retractation_accord: new Date().toISOString() },
    }))
    sessionId = session.id
    await poserSessionStripePublique(id, session.id)
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('[site public] paiement', e)
    // Rien ne reste à moitié : ni page de paiement ouverte sur un dossier perdu, ni dossier sans paiement possible.
    if (sessionId) await stripe.checkout.sessions.expire(sessionId).catch(() => {})
    await supabaseAdmin.from('sites_commandes').delete().eq('id', id).eq('etat', 'brouillon').is('artisan_id', null)
    return NextResponse.json({ error: 'Impossible d’ouvrir la page de paiement pour le moment.' }, { status: 503 })
  }
}
