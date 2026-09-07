import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estDirection, estRefus, reponseRefus } from '@/lib/direction/garde'
import { lireUserAgent } from '@/lib/userAgent'
import { oublier } from '@/lib/direction/fraicheur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/direction/alertes/<id>/acquitter — « j'ai vu ». Rôle direction, journalisé (avant/après), sans
// re-confirmation : ni argent, ni accès, ni donnée d'artisan (prompt v10 §1).
//
// L'acquittement et sa ligne de journal se font dans UNE transaction (fonction `acquitter_alerte`, migration
// 0065) : deux clics simultanés ne produisent plus deux lignes de journal pour un seul acquittement, et une
// panne ne laisse plus l'un sans l'autre (revue du 07/09).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Alerte inconnue.' }, { status: 404 })
  const u = lireUserAgent(req.headers.get('user-agent'))
  const { data, error } = await supabaseAdmin.rpc('acquitter_alerte', {
    p_acteur: f.uid, p_acteur_email: f.email, p_alerte: id, p_ip_acteur: f.ip, p_agent: `${u.appareil} · ${u.navigateur}`.slice(0, 120),
  })
  if (error) { console.error('[direction] acquitter_alerte :', error.message); return NextResponse.json({ error: 'Acquittement impossible : rien n’a été fait.', code: 'transaction' }, { status: 503 }) }
  const r = data as { etat?: string; journal?: string }
  if (r?.etat === 'inconnue') return NextResponse.json({ error: 'Alerte inconnue.' }, { status: 404 })
  if (r?.etat === 'deja') return NextResponse.json({ ok: true, deja: true })
  oublier('afaire:'); oublier('fil:')
  return NextResponse.json({ ok: true, message: 'Alerte acquittée.', journal: r?.journal ?? null })
}
