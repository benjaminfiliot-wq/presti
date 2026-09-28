// TÉMOIN du juge routes-acquisition-qa (026-037) : la route du recensement et sa passe rge (026-077). Jamais servie.
import { NextResponse } from 'next/server'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { executerRecenseur } from '@/lib/agents/acquisition/recenseur'
import { importerRge } from '@/lib/agents/acquisition/rge'
import { recuperateurReseau } from '@/lib/agents/acquisition/recuperateur'
import { enregistrerPassage } from '@/lib/alertes'
import { battement } from '@/lib/agents/bus'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const p = await pauseGenerale()
  if (p.active) return NextResponse.json({ pause: true, source: p.source })
  if (await magasinSupabase.enPause('recenseur')) return NextResponse.json({ pause: true })
  const echeance = Date.now() + 45_000
  const horloge = { maintenant: () => Date.now(), attendre: (ms: number) => new Promise((r) => setTimeout(r, ms)) }
  const passe = new URL(req.url).searchParams.get('passe')
  try {
    if (passe === 'rge') {
      const { data: curseur } = await supabaseAdmin.rpc('acq_curseur_lire', { p_nom: 'rge' })
      const r = await importerRge({ recuperer: recuperateurReseau, horloge, curseur: curseur ?? null, limite: 1000 })
      if ('refus' in r) {
        await enregistrerPassage('acq-rge', { injoignable: 1 }, true)
        await battement('recenseur')
        return NextResponse.json({ ok: true, injoignable: true })
      }
      const e = await magasinSupabase.enregistrerCandidats(r.candidats)
      await supabaseAdmin.rpc('acq_curseur_poser', { p_nom: 'rge', p_valeur: r.fini ? '' : (r.curseur_suivant ?? '') })
      await enregistrerPassage('acq-rge', { lus: r.candidats.length, ajoutes: e?.ajoutes ?? 0 }, true)
      await battement('recenseur')
      return NextResponse.json({ ok: true })
    }
    const bilan = await executerRecenseur({ magasin: magasinSupabase, recuperer: recuperateurReseau, horloge, echeance })
    await enregistrerPassage('acq-recenseur', { reserves: bilan?.reserves ?? 0, recense: bilan?.recense ?? 0 }, true)
    await battement('recenseur')
    return NextResponse.json({ ok: true })
  } catch (e) {
    await enregistrerPassage(passe === 'rge' ? 'acq-rge' : 'acq-recenseur', { erreur: String(e instanceof Error ? e.message : e).slice(0, 160) }, false)
    return NextResponse.json({ error: 'échec' }, { status: 500 })
  }
}
