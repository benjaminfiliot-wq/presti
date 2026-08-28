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

// I5 — une facture est une pièce comptable : le statut n'évolue qu'en marche avant
// (émise → payée/annulée, payée → annulée). Jamais de retour en arrière.
const NEXT_STATUTS: Record<string, string[]> = { emise: ['payee', 'annulee'], payee: ['annulee'], annulee: [] }

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const uid = await auth(req)
  if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const next = b?.statut
  if (!['emise', 'payee', 'annulee'].includes(next)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  const { data: cur } = await supabaseAdmin.from('factures').select('statut').eq('id', id).eq('artisan_id', uid).maybeSingle()
  if (!cur) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  if (next !== cur.statut && !NEXT_STATUTS[cur.statut]?.includes(next)) {
    return NextResponse.json({ error: 'Une facture émise ne peut pas revenir en arrière. Pour l’annuler, passez-la en « annulée ».' }, { status: 409 })
  }
  const { error } = await supabaseAdmin.from('factures').update({ statut: next, updated_at: new Date().toISOString() }).eq('id', id).eq('artisan_id', uid)
  if (error) { console.error('[factures PATCH]', error.message); return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await auth(req)
  if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  // Une facture émise ne se supprime pas (séquence continue obligatoire) : on l'annule.
  return NextResponse.json({ error: 'Une facture ne se supprime pas. Passez-la en « annulée » pour la neutraliser.' }, { status: 403 })
}
