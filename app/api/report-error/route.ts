import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getIp, isBanned, recordAbuse } from '@/lib/security'
import { consommerLimite } from '@/lib/limites'
import { notifierEntreprise } from '@/lib/email'

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

    // Anti-flood, compté atomiquement PAR IP (lib/limites) : 60 rapports / 5 min, large
    // pour une boucle de crash légitime, mais un robot qui martèle finit banni.
    if (ip !== 'unknown' && !(await consommerLimite(`err:ip:${ip}`, 60, 5 * 60))) {
      await recordAbuse(ip, 'flood report-error')
      return NextResponse.json({ ok: true })
    }

    const rapport = {
      contexte: clip(b?.contexte, 80),
      message: clip(b?.message, 500),
      stack: clip(b?.stack, 4000),
      url: clip(b?.url, 400),
      user_agent: clip(req.headers.get('user-agent'), 300),
    }
    await supabaseAdmin.from('app_errors').insert(rapport)

    // Notification de l'entreprise (sprint J-1 §15) : un crash côté client est une erreur
    // critique — les fondateurs le savent tout de suite. Plafonné à 5 emails / heure au
    // total : la route est publique, elle ne doit pas devenir un canon à emails.
    if (await consommerLimite('notif:erreur-critique', 5, 60 * 60)) {
      await notifierEntreprise(
        `Erreur critique — ${rapport.contexte || 'contexte inconnu'}`,
        `Un rapport d'erreur vient d'arriver.\n\nContexte : ${rapport.contexte || '—'}\nPage : ${rapport.url || '—'}\nMessage : ${rapport.message || '—'}\n\nDétail dans /controle (journal des erreurs).`,
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[report-error]', e)
    return NextResponse.json({ ok: true }) // ne jamais faire échouer un rapport d'erreur
  }
}
