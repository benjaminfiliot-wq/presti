// TÉMOIN du juge routes-acquisition-qa (026-037) : POST /api/usine/standard/classement (026-094, point 2 bis).
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent } from '@/lib/agents/garde'
import { battement } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { appliquerClasse, validerClassement } from '@/lib/agents/acquisition/standardiste'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!actif('busAgents')) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  const a = await authAgent(req)
  if ('status' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  if (a.nom !== 'standardiste') return NextResponse.json({ error: 'interdit' }, { status: 403 })
  await battement('standardiste')
  const p = await pauseGenerale()
  if (p.active || (await magasinSupabase.enPause('standardiste'))) return NextResponse.json({ error: 'pause' }, { status: 423 })
  let corps: { reponse_id?: unknown; brut?: unknown } | null = null
  try { corps = await req.json() } catch { return NextResponse.json({ error: 'mal formé' }, { status: 400 }) }
  if (!corps || typeof corps.reponse_id !== 'string' || typeof corps.brut !== 'string' || corps.brut.length > 4000) return NextResponse.json({ error: 'mal formé' }, { status: 400 })
  const reponse = (await magasinSupabase.reponsesATraiter(200)).find((r: { id: string }) => r.id === corps.reponse_id)
  if (!reponse) return NextResponse.json({ error: 'déjà classée' }, { status: 409 })
  const classement = validerClassement(corps.brut, reponse)
  await appliquerClasse(magasinSupabase, reponse, classement)
  return NextResponse.json({ ok: true, classe: classement.classe })
}
