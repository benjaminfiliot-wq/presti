import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { messageVerrou, peut } from '@/lib/plans'
import { addDomain, getStatus, removeDomain, normalizeDomain } from '@/lib/vercelDomains'
import { getUserRevocable } from '@/lib/authArtisan'

export const runtime = 'nodejs'
export const maxDuration = 30

// Domaine personnalisé de l'artisan (offre Signature). Ajout/statut/retrait via l'API Vercel.
async function auth(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: 'Non authentifié', status: 401 as const }
  const { data, error } = await getUserRevocable(token)
  if (error || !data?.user) return { error: 'Session expirée, reconnecte-toi.', status: 401 as const }
  const { data: a } = await supabaseAdmin.from('artisans').select('id, plan, slug, domaine').eq('id', data.user.id).maybeSingle()
  if (!a) return { error: 'Profil introuvable', status: 404 as const }
  return { uid: data.user.id, artisan: a }
}

export async function GET(req: Request) {
  const r = await auth(req)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  if (!r.artisan.domaine) return NextResponse.json({ domaine: null })
  const status = await getStatus(r.artisan.domaine)
  await supabaseAdmin.from('artisans').update({ domaine_verifie: status.served }).eq('id', r.uid)
  return NextResponse.json({ domaine: r.artisan.domaine, status })
}

export async function POST(req: Request) {
  const r = await auth(req)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  if (!peut(r.artisan.plan, 'site.domaine_perso')) {
    return NextResponse.json({ error: `Le nom de domaine personnalisé n’est pas dans votre offre. ${messageVerrou('site.domaine_perso')}` }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const domaine = normalizeDomain(typeof body?.domaine === 'string' ? body.domaine : '')
  if (!domaine) return NextResponse.json({ error: 'Domaine invalide. Saisissez-le sans http:// ni chemin (ex : mondomaine.fr).' }, { status: 400 })

  const status = await addDomain(domaine)
  if (!status.ok) return NextResponse.json({ error: status.error || 'Ajout impossible.' }, { status: 502 })
  await supabaseAdmin.from('artisans').update({ domaine, domaine_verifie: status.served }).eq('id', r.uid)
  return NextResponse.json({ domaine, status })
}

export async function DELETE(req: Request) {
  const r = await auth(req)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  if (r.artisan.domaine) await removeDomain(r.artisan.domaine).catch(() => {})
  await supabaseAdmin.from('artisans').update({ domaine: null, domaine_verifie: false }).eq('id', r.uid)
  return NextResponse.json({ ok: true })
}
