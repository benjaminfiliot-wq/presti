import { NextResponse } from 'next/server'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { recuperateurReseau } from '@/lib/agents/acquisition/lecteurSite'
import { executerRecenseur } from '@/lib/agents/acquisition/recenseur'
import { importerRge } from '@/lib/agents/acquisition/rge'
import type { Candidat } from '@/lib/agents/acquisition/contrat'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { enregistrerPassage } from '@/lib/alertes'
import { ops_battement } from '@/lib/agents/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const pause = await pauseGenerale()
  if (pause.active) return NextResponse.json({ pause: true, source: pause.source })
  const passeRge = new URL(req.url).searchParams.get('passe') === 'rge'
  try {
    if (await magasinSupabase.enPause('recenseur')) return NextResponse.json({ pause: true })
    const echeance = Date.now() + 45_000
    const horloge = { maintenant: Date.now, attendre: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)) }
    let bilan: Record<string, unknown>
    if (passeRge) {
      const lecture = await supabaseAdmin.rpc('acq_curseur_lire', { p_nom: 'rge' })
      if (lecture.error) throw new Error('curseur indisponible')
      const resultat = await importerRge({ recuperer: recuperateurReseau, horloge, curseur: lecture.data || null, limite: 1000 })
      if ('refus' in resultat) {
        bilan = { injoignable: 1 }
      } else {
        const candidats = resultat.candidats.map((c) => 'cle_dedup' in c ? c : {
          ...c, cle_dedup: `siren:${c.siren}`, entreprise: '', faits: [], canaux: [], froid: true,
        }) as Candidat[]
        const comptes = await magasinSupabase.enregistrerCandidats(candidats)
        const pose = await supabaseAdmin.rpc('acq_curseur_poser', { p_nom: 'rge', p_valeur: resultat.fini ? '' : resultat.curseur_suivant ?? '' })
        if (pose.error) throw new Error('curseur indisponible')
        bilan = { candidats: resultat.candidats.length, ajoutes: comptes.ajoutes, ignores: comptes.ignores, fini: resultat.fini }
      }
    } else {
      bilan = { ...await executerRecenseur({ magasin: magasinSupabase, recuperer: recuperateurReseau, horloge, echeance }) }
    }
    await enregistrerPassage(passeRge ? 'acq-rge' : 'acq-recenseur', bilan, true)
    try {
      const battement = await ops_battement({ p_nom: 'recenseur' })
      if (!battement.ok) console.error('[cron/recenseur] battement indisponible')
    } catch { console.error('[cron/recenseur] battement indisponible') }
    return NextResponse.json({ ok: true, bilan })
  } catch (e) {
    await enregistrerPassage(passeRge ? 'acq-rge' : 'acq-recenseur', { erreur: (e instanceof Error ? e.message : String(e)).slice(0, 160) }, false)
    return NextResponse.json({ error: 'échec' }, { status: 500 })
  }
}
