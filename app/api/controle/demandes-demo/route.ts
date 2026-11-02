import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { estDirection, estFondateur, exigerDomaine } from '@/lib/direction/garde'
import { journaliser } from '@/lib/direction/journal'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { listeDemandesDemo, marquerDemandeTraitee, type DepsPoste } from '@/lib/demandesDemo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// L'onglet « Démos » du Poste de contrôle (chantier 4, lot L19, tâche 032-026 ; migration 0190) : les demandes de démo
// « Presti pour l'entreprise », et le geste « traitée ». Compte fondateur seulement (lib/direction/garde : second facteur passé,
// is_founder gelé, plafond par fondateur), jamais un rôle borné. La logique vit dans lib/demandesDemo.ts, jugée hors ligne par
// scripts/demandes-demo-qa.mjs. Drapeau `demandesDemo` baissé : 404, rien n'est lu.
const deps = (): DepsPoste => ({ drapeau: actif('demandesDemo'), estFondateur, estDirection, exigerDomaine, journaliser, client: supabaseAdmin })

export async function GET(req: Request) {
  const r = await listeDemandesDemo(req, deps())
  return NextResponse.json(r.corps, { status: r.statut, headers: { 'cache-control': 'no-store' } })
}

export async function POST(req: Request) {
  const r = await marquerDemandeTraitee(req, deps())
  return NextResponse.json(r.corps, { status: r.statut, headers: { 'cache-control': 'no-store' } })
}
