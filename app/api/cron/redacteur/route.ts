import { NextResponse } from 'next/server'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { executerRedacteur } from '@/lib/agents/acquisition/redacteur'
import { adresseReponseProspection } from '@/lib/agents/acquisition/boiteProspection'
import { actif } from '@/lib/flags'
import { enregistrerPassage } from '@/lib/alertes'
import { ops_battement } from '@/lib/agents/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const pause = await pauseGenerale()
  if (!pause || pause.active) return NextResponse.json({ pause: true })
  try {
    if (await magasinSupabase.enPause('redacteur')) return NextResponse.json({ pause: true })
    const bilan = await executerRedacteur({ magasin: magasinSupabase, horloge: { maintenant: Date.now, attendre: (ms: number) => new Promise<void>(r => setTimeout(r, ms)) }, echeance: Date.now() + 45_000, adresseReponse: adresseReponseProspection(), drapeaux: { varianteA: actif('varianteA' as Parameters<typeof actif>[0]) } })
    await enregistrerPassage('acq-redacteur', { ...bilan }, true)
    try { await ops_battement({ p_nom: 'redacteur' }) } catch { console.error('[cron/redacteur] battement indisponible') }
    return NextResponse.json({ ok: true, bilan })
  } catch {
    await enregistrerPassage('acq-redacteur', { erreur: 'execution' }, false)
    return NextResponse.json({ error: 'échec' }, { status: 500 })
  }
}
