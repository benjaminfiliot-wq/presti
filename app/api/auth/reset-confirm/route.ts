import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getIp, isBanned } from '@/lib/security'

export const runtime = 'nodejs'

// Confirmation : le jeton (issu du lien email) autorise à définir un nouveau mot de passe.
// Vérifie : jeton connu (par son hash), non utilisé, non expiré. Puis met à jour le mot de
// passe via l'API admin et marque le jeton consommé (usage unique).
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

export async function POST(req: Request) {
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    const body = await req.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!token || password.length < 8) return NextResponse.json({ error: 'Lien ou mot de passe invalide (8 caractères minimum).' }, { status: 400 })

    const { data: row } = await supabaseAdmin
      .from('password_resets')
      .select('id, uid, expires_at, used_at')
      .eq('token_hash', sha256(token))
      .maybeSingle()

    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Ce lien est invalide ou expiré. Refaites une demande.' }, { status: 400 })
    }

    const upd = await supabaseAdmin.auth.admin.updateUserById(row.uid, { password })
    if (upd.error) {
      console.error('[reset-confirm]', upd.error.message)
      return NextResponse.json({ error: 'Impossible de mettre à jour le mot de passe. Réessayez.' }, { status: 500 })
    }
    // Usage unique + on invalide les autres jetons en attente de cet utilisateur.
    await supabaseAdmin.from('password_resets').update({ used_at: new Date().toISOString() }).eq('uid', row.uid).is('used_at', null)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[reset-confirm]', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
