import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { mentionFranchise } from '@/lib/facturation'
import { brouillonStudio, poserSessionStudio } from '@/lib/studio/commandeServeur'
import { PRIX_PACK_STUDIO_CENTS, PRIX_PACK_STUDIO_TEXTE, VIDEOS_PACK_STUDIO, lireJetonCommande } from '@/lib/studio/offre'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ORIGINE = 'https://prestiapp.fr'

/** Le jeton du lien privé, dans un corps JSON ou dans le formulaire de la page (bouton « Payer »). */
async function jetonDe(req: Request): Promise<{ jeton: string; formulaire: boolean }> {
  const type = req.headers.get('content-type') || ''
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const f = await req.formData().catch(() => null)
    return { jeton: String(f?.get('jeton') || ''), formulaire: true }
  }
  const corps = (await req.json().catch(() => ({}))) as { jeton?: unknown }
  return { jeton: typeof corps.jeton === 'string' ? corps.jeton : '', formulaire: false }
}

export async function POST(req: Request) {
  const { jeton, formulaire } = await jetonDe(req)
  const lu = lireJetonCommande(jeton)
  if (!lu) return new NextResponse(null, { status: 404 })
  if (!stripe) return NextResponse.json({ error: 'Paiement indisponible pour le moment.' }, { status: 503 })

  try {
    const brouillon = await brouillonStudio(lu.marque_cle, lu.prospect_id)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: 'Presti Studio — pack de départ', description: `${VIDEOS_PACK_STUDIO} vidéos de démonstration de votre produit, ${PRIX_PACK_STUDIO_TEXTE}, une fois.` },
          unit_amount: PRIX_PACK_STUDIO_CENTS,
        },
        quantity: 1,
      }],
      billing_address_collection: 'required',
      invoice_creation: { enabled: true, invoice_data: { description: 'Pack de départ du Studio — Presti', footer: mentionFranchise('auto') } },
      metadata: { type: 'pack_studio', pack_id: brouillon.id, marque_cle: lu.marque_cle },
      payment_intent_data: { metadata: { type: 'pack_studio', pack_id: brouillon.id, marque_cle: lu.marque_cle } },
      success_url: `${ORIGINE}/studio/commander/${encodeURIComponent(jeton)}?paiement=ok`,
      cancel_url: `${ORIGINE}/studio/commander/${encodeURIComponent(jeton)}?paiement=annule`,
    })
    await poserSessionStudio(brouillon.id, session.id)
    if (formulaire && session.url) return NextResponse.redirect(session.url, 303)
    return NextResponse.json({ url: session.url })
  } catch (erreur) {
    // Aucune valeur du corps ni du jeton dans le journal.
    console.error('[pack Studio] paiement', erreur instanceof Error ? erreur.message : 'erreur')
    return NextResponse.json({ error: 'Impossible d’ouvrir la page de paiement pour le moment.' }, { status: 503 })
  }
}
