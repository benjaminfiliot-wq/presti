import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Export de TOUTES ses données (RGPD, droit à la portabilité — §C3).
// Proposé avant toute suppression, et disponible à tout moment depuis Paramètres.
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: userData, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !userData?.user) return NextResponse.json({ error: 'Session expirée, reconnecte-toi.' }, { status: 401 })
    const uid = userData.user.id

    const [artisan, leads, devis, factures, clients] = await Promise.all([
      supabaseAdmin.from('artisans').select('*').eq('id', uid).maybeSingle(),
      supabaseAdmin.from('leads').select('*').eq('artisan_id', uid).order('created_at', { ascending: true }),
      supabaseAdmin.from('devis').select('*').eq('artisan_id', uid).order('created_at', { ascending: true }),
      supabaseAdmin.from('factures').select('*').eq('artisan_id', uid).order('created_at', { ascending: true }).then((r) => r, () => ({ data: [] })),
      supabaseAdmin.from('clients_plateforme').select('*').eq('artisan_id', uid).then((r) => r, () => ({ data: [] })),
    ])

    // Messages de toutes ses conversations (par lots, pour ne pas charger l'univers).
    const ids = (leads.data ?? []).map((l) => l.id)
    let messages: unknown[] = []
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await supabaseAdmin.from('messages').select('*').in('lead_id', ids.slice(i, i + 100)).order('sent_at', { ascending: true })
      messages = messages.concat(data ?? [])
    }

    const paquet = {
      genere_le: new Date().toISOString(),
      a_propos: 'Export complet de vos données Presti (format JSON). Les documents à valeur légale sont inclus.',
      profil: artisan.data ?? null,
      conversations: leads.data ?? [],
      messages,
      devis: devis.data ?? [],
      factures: (factures as { data?: unknown[] }).data ?? [],
      clients_plateforme: (clients as { data?: unknown[] }).data ?? [],
    }

    return new NextResponse(JSON.stringify(paquet, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="mes-donnees-presti-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (e) {
    console.error('[donnees/export]', e)
    return NextResponse.json({ error: 'Export impossible pour le moment.' }, { status: 500 })
  }
}
