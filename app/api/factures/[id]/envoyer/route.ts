export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { exigerCapacite } from '@/lib/accesOffreServeur'
import { envoyerFactureServeur } from '@/lib/envoisPdfServeur'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 21/10 — Envoyer au client, par e-mail, une facture DÉJÀ émise (PDF joint). N'émet rien, n'encaisse rien, ne touche pas à la
// facture scellée. Session vérifiée (révocation, suspension, double authentification), offre « factures » (toutes les offres),
// puis lib/envoisServeur.ts — la même fonction que le pilote automatique et l'outil « envoyer_facture » de l'assistant.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    const g = await exigerCapacite(req, 'factures', 'L’envoi des factures')
    if ('reponse' in g) return g.reponse
    // Plafond du jour et idempotence (audit du 21/10, F3) : dans envoyerFactureServeur, pour la route ET le pilote automatique.
    const r = await envoyerFactureServeur(g.uid, id)
    return NextResponse.json(r.json, { status: r.status })
  } catch (e) {
    console.error('[facture envoyer] inattendu:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
