import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus } from '@/lib/direction/garde'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/direction/journal?avant=<iso>&limite=50&action=<action>&artisan=<uuid>
// Le journal de direction, paginé, du plus récent au plus ancien — lisible par les deux rôles (direction, lecture).
export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const u = new URL(req.url)
  const limite = Math.min(200, Math.max(1, Number(u.searchParams.get('limite')) || 50))
  const avant = u.searchParams.get('avant')
  const action = u.searchParams.get('action')
  const artisan = u.searchParams.get('artisan')
  // Le rôle « lecture » (Alexandre) suit les actions, pas les adresses : ni `ip` ni `agent` ne sortent pour lui
  // (revue du 07/09 — sa matrice, v10 §2.7, ne les contient pas).
  const colonnes = 'id, acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, reconfirme, cree_le' + (f.role === 'direction' ? ', ip, agent' : '')
  let q = supabaseAdmin.from('journal_direction').select(colonnes).order('cree_le', { ascending: false }).limit(limite)
  if (avant && !Number.isNaN(Date.parse(avant))) q = q.lt('cree_le', new Date(avant).toISOString())
  if (action && /^[a-z_]{2,40}$/.test(action)) q = q.eq('action', action)
  if (artisan && /^[0-9a-f-]{36}$/i.test(artisan)) q = q.eq('artisan_id', artisan)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: 'Journal indisponible pour l’instant.' }, { status: 503 })
  const lignes = (data ?? []) as unknown as { cree_le: string }[]
  return NextResponse.json({ lignes, suivant: lignes.length === limite ? lignes[lignes.length - 1].cree_le : null, role: f.role, a: new Date().toISOString() })
}
