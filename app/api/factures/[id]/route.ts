import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function auth(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await supabaseAdmin.auth.getUser(token)
  return data?.user?.id ?? null
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const uid = await auth(req)
  if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { data: facture } = await supabaseAdmin.from('factures').select('*').eq('id', id).eq('artisan_id', uid).maybeSingle()
  if (!facture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  const { data: lignes } = await supabaseAdmin.from('factures_lignes').select('*').eq('facture_id', id).order('ordre')
  return NextResponse.json({ facture, lignes: lignes ?? [] })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const uid = await auth(req)
  if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (['emise', 'payee', 'annulee'].includes(b?.statut)) patch.statut = b.statut
  const { error } = await supabaseAdmin.from('factures').update(patch).eq('id', id).eq('artisan_id', uid)
  if (error) { console.error('[factures PATCH]', error.message); return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const uid = await auth(req)
  if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { error } = await supabaseAdmin.from('factures').delete().eq('id', id).eq('artisan_id', uid)
  if (error) return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
