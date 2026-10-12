import { NextResponse } from 'next/server'
import { creerDevisBrouillonPourLead } from '@/lib/devisAuto'
import { authArtisan as verifierSession, estEchec } from '@/lib/authArtisan'
import { getPlateformeConfig } from '@/lib/plateformeConfig'

export const runtime = 'nodejs'
export const maxDuration = 60

// Devis AUTOMATIQUE depuis une conversation (bouton « Devis auto » de la boîte).
// Toute la logique vit dans lib/devisAuto.ts — la même que l'outil de l'assistant et
// les règles d'automatisation. Ici : authentification + décodage du corps, rien d'autre.
export async function POST(req: Request) {
  try {
    // Contrôle central : refuse aussi les jetons antérieurs à une déconnexion globale (§11).
    const session = await verifierSession(req)
    if (estEchec(session)) return NextResponse.json({ error: session.error }, { status: session.status })

    const body = await req.json().catch(() => ({}))
    const leadId = typeof body?.lead_id === 'string' ? body.lead_id : ''
    if (!leadId) return NextResponse.json({ error: 'Conversation manquante' }, { status: 400 })

    // Sans modèle demandé (le bouton de la boîte n'en envoie pas), celui de Ma plateforme : l'aide promet « selon le modèle
    // réglé dans Ma plateforme », et jusqu'au 12/10 le devis partait en Standard quel que soit le réglage (audit des
    // promesses, produit, ligne 7). Le débit suit le modèle servi (lib/devisAuto.ts, resolveModel puis consumeCredit).
    const tier = typeof body?.model === 'string' && body.model ? body.model : ((await getPlateformeConfig(session.uid)).modele || undefined)
    const r = await creerDevisBrouillonPourLead({ artisanId: session.uid, leadId, tier, source: 'manuel' })
    if (!r.ok) return NextResponse.json({ error: r.error, ...(r.outOfCredits ? { outOfCredits: true } : {}) }, { status: r.status })
    return NextResponse.json({ ok: true, id: r.id, numero: r.numero, note: r.note })
  } catch (e) {
    console.error('[devis/auto]', e)
    return NextResponse.json({ error: "L'IA n'a pas pu générer le devis. Réessaie." }, { status: 500 })
  }
}
