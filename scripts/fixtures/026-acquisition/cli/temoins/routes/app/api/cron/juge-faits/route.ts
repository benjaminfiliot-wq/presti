// TÉMOIN du juge routes-acquisition-qa (026-037) : la route du juge des faits (026-077). Jamais servie par Presti.
import { NextResponse } from 'next/server'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { executerJugeFaits } from '@/lib/agents/acquisition/jugeFaits'
import { recuperateurReseau } from '@/lib/agents/acquisition/recuperateur'
import { enregistrerPassage, envoyerAlertes } from '@/lib/alertes'
import { battement } from '@/lib/agents/bus'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const jourParis = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const p = await pauseGenerale()
  if (p.active) return NextResponse.json({ pause: true, source: p.source })
  if (await magasinSupabase.enPause('juge_faits')) return NextResponse.json({ pause: true })
  const echeance = Date.now() + 45_000
  try {
    let jetonMeta: string | null = null
    try {
      const { data, error } = await supabaseAdmin.rpc('acq_jeton_meta')
      jetonMeta = error ? null : ((Array.isArray(data) ? data[0]?.jeton : data?.jeton) ?? null)
    } catch { jetonMeta = null }
    const horloge = { maintenant: () => Date.now(), attendre: (ms: number) => new Promise((r) => setTimeout(r, ms)) }
    const bilan = await executerJugeFaits({ recuperer: recuperateurReseau, horloge, echeance, jetonMeta, magasin: magasinSupabase })
    if (bilan?.meta === 'jeton_invalide' || bilan?.meta === 'en_attente_identite') {
      await enregistrerPassage('acq-juge-faits', { etat: bilan.meta }, false)
      await envoyerAlertes([{ motif: 'jeton_externe', a: 'entreprise', cle: `jeton_externe:meta:${jourParis()}`, sujet: 'Jeton Meta à renouveler', corps: 'Générer un nouveau jeton Meta, le coller dans presti-secrets/meta-bibliotheque-pubs.txt et dire « collé » : Claude Code le pose.' }])
      return NextResponse.json({ ok: false, etat: bilan.meta })
    }
    await enregistrerPassage('acq-juge-faits', { verifies: bilan?.verifies ?? 0, rejetes: bilan?.rejetes ?? 0 }, true)
    const b = await battement('juge_faits')
    if (!b?.ok) console.error('[cron/juge-faits] battement refusé')
    return NextResponse.json({ ok: true })
  } catch (e) {
    await enregistrerPassage('acq-juge-faits', { erreur: String(e instanceof Error ? e.message : e).slice(0, 160) }, false)
    return NextResponse.json({ error: 'échec' }, { status: 500 })
  }
}
