import { NextResponse } from 'next/server'
import { bearerEgal } from '@/lib/secretEgal' // audit du 20/10 : comparaison du secret en temps constant
import { ronde, enregistrerPassage, MOTIFS, type Motif } from '@/lib/alertes'

// La ronde quotidienne des alertes (prompt v6 §6).
//
// Vercel n'accorde que deux tâches planifiées à cette formule, déjà prises par les relances et
// la relève des canaux : cette route est donc APPELÉE par la tâche des relances (8 h) plutôt que
// planifiée elle-même, et peut l'être aussi par l'audit récurrent (GitHub Actions). Même secret
// que les autres crons, fail-closed : sans CRON_SECRET, rien ne répond.
//
//   GET /api/cron/alertes                → la ronde, envoie ce qui doit partir
//   GET /api/cron/alertes?sec=1          → à sec : rend ce qui partirait, n'envoie rien
//   GET /api/cron/alertes?simuler=motif  → envoie l'exemple du motif, marqué [SIMULATION]

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!bearerEgal(auth, secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const aSec = url.searchParams.get('sec') === '1'
  const simuler = url.searchParams.get('simuler')
  if (simuler && !(MOTIFS as string[]).includes(simuler)) return NextResponse.json({ error: `motif inconnu — attendus : ${MOTIFS.join(', ')}` }, { status: 400 })

  try {
    const r = await ronde({ aSec, simuler: (simuler as Motif) || undefined })
    if (!aSec && !simuler) await enregistrerPassage('alertes', { envoyees: r.envoyees.length, ignorees: r.ignorees.length })
    return NextResponse.json({ ok: true, aSec, simuler: simuler ?? null, candidates: r.candidates.map((c) => ({ motif: c.motif, cle: c.cle, sujet: c.sujet, a: c.a === 'entreprise' ? 'entreprise' : 'artisan' })), envoyees: r.envoyees, ignorees: r.ignorees })
  } catch (e) {
    console.error('[cron/alertes]', e)
    if (!aSec && !simuler) await enregistrerPassage('alertes', { erreur: e instanceof Error ? e.message : String(e) }, false)
    return NextResponse.json({ error: 'ronde en erreur' }, { status: 500 })
  }
}
