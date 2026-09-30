import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { estDirection, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const domaine = exigerDomaine(f, 'sante', 'ecrire')
  if (domaineRefuse(domaine)) return reponseRefus(domaine)
  const { id } = await ctx.params
  if (!UUID.test(id)) return NextResponse.json({ error: "Demande d'appel introuvable." }, { status: 404 })
  const source = new URL(req.url).searchParams.get('source') ?? 'reponse'
  if (source !== 'rdv' && source !== 'reponse') return NextResponse.json({ error: 'Source inconnue.' }, { status: 400 })
  const journalOk = await journaliser({ acteur: f, action: 'appel_rendu', cible_type: source === 'rdv' ? 'rendez_vous' : 'reponse', cible_id: id, apres: { action: 'appel_rendu', source } }, req)
  if (!journalOk) return refusJournal()
  const resultat = source === 'rdv'
    ? await supabaseAdmin.rpc('acq_rdv_appel_rendu', { p_id: id })
    : await supabaseAdmin.rpc('acq_reponse_appel_rendu', { p_reponse: id })
  if (resultat.error) return NextResponse.json({ error: "Rien n'a été fait." }, { status: 503 })
  if (resultat.data !== true) return NextResponse.json({ error: "Demande d'appel introuvable ou déjà rendue." }, { status: 404 })
  return NextResponse.json({ message: 'Appel marqué rendu.' })
}
