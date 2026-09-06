import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estDirection, estRefus, reponseRefus } from '@/lib/direction/garde'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { oublier } from '@/lib/direction/fraicheur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/direction/alertes/<id>/acquitter — « j'ai vu ». Rôle direction, journalisé (avant/après), sans
// re-confirmation : ni argent, ni accès, ni donnée d'artisan (prompt v10 §1).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Alerte inconnue.' }, { status: 404 })
  const { data: avant, error: e1 } = await supabaseAdmin.from('alertes').select('id, motif, sujet, acquittee_le, acquittee_par').eq('id', id).maybeSingle()
  if (e1) return NextResponse.json({ error: 'Alertes indisponibles.' }, { status: 503 })
  if (!avant) return NextResponse.json({ error: 'Alerte inconnue.' }, { status: 404 })
  if (avant.acquittee_le) return NextResponse.json({ ok: true, deja: true })
  const apres = { acquittee_le: new Date().toISOString(), acquittee_par: f.uid }
  const { error: e2 } = await supabaseAdmin.from('alertes').update(apres).eq('id', id).is('acquittee_le', null)
  if (e2) return NextResponse.json({ error: 'Acquittement impossible.' }, { status: 503 })
  // Journal obligatoire : s'il échoue, on défait l'acquittement — une action non journalisée n'a pas lieu.
  if (!(await journaliser({ acteur: f, action: 'alerte_acquittee', cible_type: 'alerte', cible_id: id, avant: { acquittee_le: null, motif: avant.motif, sujet: avant.sujet }, apres }, req))) {
    await supabaseAdmin.from('alertes').update({ acquittee_le: null, acquittee_par: null }).eq('id', id)
    return refusJournal()
  }
  oublier('afaire:'); oublier('fil:')
  return NextResponse.json({ ok: true })
}
