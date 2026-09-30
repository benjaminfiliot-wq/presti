// 026-092 — adapté de la référence contractuelle 026-067, sans import de fixture à l'exécution.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent } from '@/lib/agents/garde'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!actif('busAgents') || !actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const a = await authAgent(req)
  if ('error' in a) return NextResponse.json({ error: a.error, code: a.code }, { status: a.status })
  if (a.nom !== 'chef') return NextResponse.json({ error: 'Réservé au Chef.' }, { status: 403 })
  try {
    const r = await supabaseAdmin.rpc('station_reunion_chiffres')
    if (r.error) return NextResponse.json({ error: 'Base indisponible.' }, { status: 503 })
    return NextResponse.json({ chiffres: r.data })
  } catch {
    return NextResponse.json({ error: 'Base indisponible.' }, { status: 503 })
  }
}

