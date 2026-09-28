// TÉMOIN du juge routes-acquisition-qa (026-037) : la route de la Plume (026-094, point 1). Jamais servie par Presti.
import { NextResponse } from 'next/server'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { executerRedacteur } from '@/lib/agents/acquisition/redacteur'
import { actif } from '@/lib/flags'
import { enregistrerPassage } from '@/lib/alertes'
import { battement } from '@/lib/agents/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const p = await pauseGenerale()
  if (p.active) return NextResponse.json({ pause: true, source: p.source })
  if (await magasinSupabase.enPause('redacteur')) return NextResponse.json({ pause: true })
  const echeance = Date.now() + 45_000
  try {
    const horloge = { maintenant: () => Date.now(), attendre: (ms: number) => new Promise((r) => setTimeout(r, ms)) }
    const bilan = await executerRedacteur({ magasin: magasinSupabase, horloge, echeance, adresseReponse: process.env.ACQ_ADRESSE_REPONSE ?? '', drapeaux: { varianteA: actif('varianteA') } })
    await enregistrerPassage('acq-redacteur', { prepares: bilan?.prepares ?? 0, refus: bilan?.refus ?? 0, etat: bilan?.etat ?? null }, true)
    const b = await battement('redacteur')
    if (!b?.ok) console.error('[cron/redacteur] battement refusé')
    return NextResponse.json({ ok: true })
  } catch (e) {
    await enregistrerPassage('acq-redacteur', { erreur: String(e instanceof Error ? e.message : e).slice(0, 160) }, false)
    return NextResponse.json({ error: 'échec' }, { status: 500 })
  }
}
