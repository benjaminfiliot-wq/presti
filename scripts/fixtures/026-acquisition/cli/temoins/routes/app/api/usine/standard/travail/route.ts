// TÉMOIN du juge routes-acquisition-qa (026-037) : GET /api/usine/standard/travail (026-094, point 2 bis).
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent } from '@/lib/agents/garde'
import { battement } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { CONSIGNES, appliquerClasse, classerEnCode, preparerDonnees } from '@/lib/agents/acquisition/standardiste'
import { FAQ } from '@/lib/agents/acquisition/faq'
import { METIERS } from '@/lib/agents/acquisition/contrat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!actif('busAgents')) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  const a = await authAgent(req)
  if ('status' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  if (a.nom !== 'standardiste') return NextResponse.json({ error: 'interdit' }, { status: 403 })
  await battement('standardiste')
  const p = await pauseGenerale()
  if (p.active || (await magasinSupabase.enPause('standardiste'))) return NextResponse.json({ reponses: [] })
  const reponses = await magasinSupabase.reponsesATraiter(20)
  const out = []
  for (const r of reponses) {
    const c = classerEnCode(r)
    if (c) { await appliquerClasse(magasinSupabase, r, c); continue }
    out.push({ id: r.id, systeme: CONSIGNES, donnees: preparerDonnees(r, FAQ, METIERS) })
  }
  return NextResponse.json({ reponses: out })
}
