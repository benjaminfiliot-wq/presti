import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { empreinte } from '@/lib/facturation'

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
  const { data: cur } = await supabaseAdmin.from('factures').select('*').eq('id', id).eq('artisan_id', uid).maybeSingle()
  if (!cur) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  if (next !== cur.statut && !NEXT_STATUTS[cur.statut]?.includes(next)) {
    return NextResponse.json({ error: 'Une facture émise ne peut pas revenir en arrière. Pour l’annuler, passez-la en « annulée ».' }, { status: 409 })
  }

  // Passage à « émise » : la pièce est SCELLÉE (v4 §10.7). On enregistre son empreinte au
  // moment exact de l'émission, et la base refuse ensuite toute modification de montant,
  // de numéro, de client ou de date. Une correction passe désormais par un avoir.
  const scelle: Record<string, unknown> = {}
  if (next === 'emise' && !cur.verrouillee) {
    const { data: lignes } = await supabaseAdmin.from('factures_lignes')
      .select('designation, quantite, unite, prix_unitaire_ht, tva_taux').eq('facture_id', id).order('ordre')
    const empreinteDoc = await empreinte(JSON.stringify({
      numero: cur.numero, client: cur.client_nom, siren: cur.client_siren,
      totaux: [cur.total_ht, cur.total_tva, cur.total_ttc], lignes: lignes ?? [],
    }))
    scelle.verrouillee = true
    scelle.emise_le = new Date().toISOString()
    scelle.empreinte = empreinteDoc
  }

  const { error } = await supabaseAdmin.from('factures')
    .update({ statut: next, ...scelle, updated_at: new Date().toISOString() })
    .eq('id', id).eq('artisan_id', uid)
  if (error) { console.error('[factures PATCH]', error.message); return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await auth(req)
  if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  // Une facture émise ne se supprime pas (séquence continue obligatoire) : on l'annule.
  return NextResponse.json({ error: 'Une facture ne se supprime pas. Passez-la en « annulée » pour la neutraliser.' }, { status: 403 })
}
