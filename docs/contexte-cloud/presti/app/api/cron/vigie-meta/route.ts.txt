import { NextResponse } from 'next/server'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { recuperateurReseau } from '@/lib/agents/acquisition/lecteurSite'
import { executerVigie } from '@/lib/agents/acquisition/vigieMeta'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { consommerLimite } from '@/lib/limites'
import { enregistrerPassage, envoyerAlertes } from '@/lib/alertes'
import { ops_battement, ops_agent_echeance, ops_evenements_lire, ops_evenement_ajouter } from '@/lib/agents/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const jourParis = (d = new Date()) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

async function lireEcheance(jeton: string) {
  try {
    const evenements = await ops_evenements_lire({ p_agent: 'vigie_meta', p_limite: 100 })
    if (!evenements.ok) return
    const aujourdHui = jourParis()
    if (evenements.data.some((e) => e.type === 'echeance_lue' && jourParis(new Date(e.le)) === aujourdHui)) return
    // L'auto inspection du jeton est à confirmer avec le premier jeton réel.
    const url = new URL('https://graph.facebook.com/debug_token')
    url.searchParams.set('input_token', jeton)
    url.searchParams.set('access_token', jeton)
    const reponse = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: 'error' })
    if (!reponse.ok) return
    const corps = await reponse.json() as { data?: { expires_at?: number; is_valid?: boolean } }
    if (corps.data?.is_valid === false || !Number.isFinite(corps.data?.expires_at)) return
    const secondes = corps.data!.expires_at!
    const expireLe = secondes === 0 ? null : secondes > 0 ? new Date(secondes * 1000).toISOString() : undefined
    if (expireLe === undefined) return
    const pose = await ops_agent_echeance({ p_nom: 'vigie_meta', p_expire_le: expireLe })
    if (!pose.ok) return
    await ops_evenement_ajouter({ p_agent: 'vigie_meta', p_type: 'echeance_lue', p_resume: `Échéance contrôlée le ${aujourdHui}` })
  } catch {
    // Le passage reste réussi et la dernière échéance connue reste en place.
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const pause = await pauseGenerale()
  if (pause.active) return NextResponse.json({ pause: true, source: pause.source })
  try {
    if (await magasinSupabase.enPause('vigie_meta')) return NextResponse.json({ pause: true })
    const echeance = Date.now() + 45_000
    const horloge = { maintenant: Date.now, attendre: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)) }
    const lecture = await supabaseAdmin.rpc('acq_jeton_meta')
    const jeton: string | null = lecture.error ? null : lecture.data?.[0]?.jeton ?? null
    const budget = { prendre: () => consommerLimite('meta:ads_archive', 150, 3600) }
    const artisan = await executerVigie({ jeton, cible: 'artisan', magasin: magasinSupabase, recuperer: recuperateurReseau, horloge, echeance, budget })
    const marque = await executerVigie({ jeton, cible: 'marque', magasin: magasinSupabase, recuperer: recuperateurReseau, horloge, echeance, budget })
    const etats = [artisan.etat, marque.etat]
    const etat = etats.find((x) => x === 'jeton_invalide' || x === 'en_attente_identite')
    if (etat) {
      await enregistrerPassage('acq-vigie-meta', { etat }, false)
      await envoyerAlertes([{ motif: 'jeton_externe', a: 'entreprise', cle: `jeton_externe:meta:${jourParis()}`, sujet: 'Jeton Meta à renouveler', corps: 'Générer un nouveau jeton Meta, le coller dans presti-secrets/meta-bibliotheque-pubs.txt et dire « collé » : Claude Code le pose.' }])
      return NextResponse.json({ error: 'échec' }, { status: 500 })
    }
    const bilan = { artisan: { etat: artisan.etat, appels: artisan.appels ?? 0, candidats: artisan.candidats ?? 0 }, marque: { etat: marque.etat, appels: marque.appels ?? 0, candidats: marque.candidats ?? 0 }, ...(etats.includes('limite') ? { limite: 1 } : {}), ...(etats.includes('injoignable') ? { injoignable: 1 } : {}), ...(etats.includes('budget_epuise') ? { budget_epuise: 1 } : {}) }
    await enregistrerPassage('acq-vigie-meta', bilan, true)
    try {
      const battement = await ops_battement({ p_nom: 'vigie_meta' })
      if (!battement.ok) console.error('[cron/vigie-meta] battement indisponible')
    } catch { console.error('[cron/vigie-meta] battement indisponible') }
    if (jeton && !etats.includes('en_attente_jeton')) await lireEcheance(jeton)
    return NextResponse.json({ ok: true, bilan })
  } catch (e) {
    await enregistrerPassage('acq-vigie-meta', { erreur: (e instanceof Error ? e.message : String(e)).slice(0, 160) }, false)
    return NextResponse.json({ error: 'échec' }, { status: 500 })
  }
}
