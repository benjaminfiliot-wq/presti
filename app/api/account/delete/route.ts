import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

// Droit à l'effacement (RGPD) : l'artisan supprime SON compte et toutes ses données.
// Authentifié : on ne supprime que le compte du porteur du jeton. La suppression de
// l'utilisateur auth cascade sur `artisans` (FK on delete cascade), donc leads, messages,
// devis, factures, relances partent avec (cascade). Action définitive.
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data?.user) return NextResponse.json({ error: 'Session expirée, reconnecte-toi.' }, { status: 401 })
    const uid = data.user.id

    // Filet : par sécurité, on retire d'abord explicitement la ligne artisan (au cas où la
    // cascade ne serait pas en place sur une base ancienne), puis on supprime l'utilisateur.
    await supabaseAdmin.from('artisans').delete().eq('id', uid)
    const del = await supabaseAdmin.auth.admin.deleteUser(uid)
    if (del.error) {
      console.error('[account/delete]', del.error.message)
      return NextResponse.json({ error: 'Suppression impossible. Réessaie dans un instant.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[account/delete] inattendu:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
