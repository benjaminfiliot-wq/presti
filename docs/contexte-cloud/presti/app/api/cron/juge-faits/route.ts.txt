import { NextResponse } from 'next/server'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { recuperateurReseau } from '@/lib/agents/acquisition/lecteurSite'
import { executerJugeFaits } from '@/lib/agents/acquisition/jugeFaits'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { enregistrerPassage, envoyerAlertes } from '@/lib/alertes'
import { ops_battement } from '@/lib/agents/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const jourParis = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const pause = await pauseGenerale()
  if (pause.active) return NextResponse.json({ pause: true, source: pause.source })
  try {
    if (await magasinSupabase.enPause('juge_faits')) return NextResponse.json({ pause: true })
    const echeance = Date.now() + 45_000
    const horloge = { maintenant: Date.now, attendre: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)) }
    const lecture = await supabaseAdmin.rpc('acq_jeton_meta')
    const jetonMeta: string | null = lecture.error ? null : lecture.data?.[0]?.jeton ?? null
    const bilan = await executerJugeFaits({ magasin: magasinSupabase, recuperer: recuperateurReseau, horloge, echeance, jetonMeta }) ?? {}
    const etat = bilan.meta
    if (etat === 'jeton_invalide' || etat === 'en_attente_identite') {
      await enregistrerPassage('acq-juge-faits', { etat }, false)
      await envoyerAlertes([{ motif: 'jeton_externe', a: 'entreprise', cle: `jeton_externe:meta:${jourParis()}`, sujet: 'Jeton Meta à renouveler', corps: 'Générer un nouveau jeton Meta, le coller dans presti-secrets/meta-bibliotheque-pubs.txt et dire « collé » : Claude Code le pose.' }])
      return NextResponse.json({ error: 'échec' }, { status: 500 })
    }
    await enregistrerPassage('acq-juge-faits', etat === 'limite' ? { limite: 1 } : { etat: etat ?? 'ok' }, true)
    try {
      const battement = await ops_battement({ p_nom: 'juge_faits' })
      if (!battement.ok) console.error('[cron/juge-faits] battement indisponible')
    } catch { console.error('[cron/juge-faits] battement indisponible') }
    return NextResponse.json({ ok: true, etat: etat ?? 'ok' })
  } catch (e) {
    await enregistrerPassage('acq-juge-faits', { erreur: (e instanceof Error ? e.message : String(e)).slice(0, 160) }, false)
    return NextResponse.json({ error: 'échec' }, { status: 500 })
  }
}
