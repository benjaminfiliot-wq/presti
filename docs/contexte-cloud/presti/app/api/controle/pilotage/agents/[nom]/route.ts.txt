import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { estDirection, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request, ctx: { params: Promise<{ nom: string }> }) {
  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const domaine = exigerDomaine(f, 'securite', 'ecrire')
  if (domaineRefuse(domaine)) return reponseRefus(domaine)
  const { nom } = await ctx.params
  if (!/^[a-z0-9_]{2,40}$/.test(nom)) return NextResponse.json({ error: 'Agent inconnu.' }, { status: 404 })
  const b = await req.json().catch(() => null) as { pause?: unknown; motif?: unknown } | null
  if (typeof b?.pause !== 'boolean') return NextResponse.json({ error: 'Pause attendue.' }, { status: 400 })
  const motif = b.motif === undefined ? 'Pause depuis la station' : typeof b.motif === 'string' ? b.motif.trim() : ''
  if (motif.length < 3 || motif.length > 200) return NextResponse.json({ error: 'Motif invalide.' }, { status: 400 })
  const refus = await exigerReconfirmation(req, f.uid, 'securite')
  if (refus) return refus
  const journalOk = await journaliser({ acteur: f, action: 'agent_pause', cible_type: 'agent', cible_id: nom, apres: { nom, pause: b.pause }, reconfirme: true }, req)
  if (!journalOk) return refusJournal()
  const resultat = await supabaseAdmin.rpc('ops_agent_pause', { p_nom: nom, p_pause: b.pause, p_motif: motif })
  if (resultat.error) return NextResponse.json({ error: resultat.error.message.includes('ops:agent_inconnu') ? 'Agent inconnu.' : "Rien n'a été fait." }, { status: resultat.error.message.includes('ops:agent_inconnu') ? 404 : 503 })
  return NextResponse.json({ message: b.pause ? 'Agent mis en pause.' : 'Agent repris.' })
}
