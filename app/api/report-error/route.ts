import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getIp, isBanned, recordAbuse } from '@/lib/security'

export const runtime = 'nodejs'

// Réception d'un rapport d'erreur (crash reporting self-hosté). Appelé par les error
// boundaries côté client. Public mais borné : IP bannie refusée, longueurs plafonnées,
// et un flood déclenche un abus (auto-ban) — un vrai crash tient largement dans les bornes.
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : null)

export async function POST(req: Request) {
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return NextResponse.json({ ok: true }) // silencieux
    const b = await req.json().catch(() => null)

    // Anti-flood : plus de 20 rapports / 5 min depuis une IP = abus.
    if (ip !== 'unknown') {
      try {
        const since = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { count } = await supabaseAdmin.from('app_errors').select('id', { count: 'exact', head: true }).gte('created_at', since)
        // borne globale grossière (le rapport reste rare) ; par sécurité on ne bloque jamais un vrai crash isolé
        if ((count ?? 0) > 400) { await recordAbuse(ip, 'flood report-error'); return NextResponse.json({ ok: true }) }
      } catch { /* on ne bloque pas */ }
    }

    await supabaseAdmin.from('app_errors').insert({
      contexte: clip(b?.contexte, 80),
      message: clip(b?.message, 500),
      stack: clip(b?.stack, 4000),
      url: clip(b?.url, 400),
      user_agent: clip(req.headers.get('user-agent'), 300),
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[report-error]', e)
    return NextResponse.json({ ok: true }) // ne jamais faire échouer un rapport d'erreur
  }
}
