import { NextResponse } from 'next/server'
import { bearerEgal } from '@/lib/secretEgal' // audit du 20/10 : comparaison du secret en temps constant
import { actif } from '@/lib/flags'
import { ops_baux_expirer } from '@/lib/agents/bus'
import { balayerCommandesPayees, traiterFileArgent } from '@/lib/agents/fileArgent'
import { veilleur } from '@/lib/agents/veilleur'
import { pauseGenerale } from '@/lib/agents/pause'
import { enregistrerPassage } from '@/lib/alertes'
import { consommerLimite } from '@/lib/limites'
import { tourLivraison } from '@/lib/siteLivraison'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Etape = { statut: 'ok' | 'echec' | 'saute'; raison?: 'budget' | 'hors_creneau' | 'deja_fait' }

export async function GET(req: Request) {
  if (!actif('busAgents')) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!bearerEgal(auth, secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const debut = Date.now()
  const reste = () => Math.max(0, 25_000 - (Date.now() - debut))
  const etapes: Record<string, Etape> = {}
  let reussi = true
  let pause = true

  try {
    pause = (await pauseGenerale()).active
  } catch {
    reussi = false
    etapes.pause = { statut: 'echec' }
  }

  if (reste() <= 0) etapes.baux = { statut: 'saute', raison: 'budget' }
  else try {
    const resultat = await ops_baux_expirer()
    etapes.baux = { statut: resultat.ok ? 'ok' : 'echec' }
    if (!resultat.ok) reussi = false
  } catch {
    etapes.baux = { statut: 'echec' }
    reussi = false
  }

  if (reste() <= 0) etapes.balayage = { statut: 'saute', raison: 'budget' }
  else try {
    await balayerCommandesPayees()
    etapes.balayage = { statut: 'ok' }
  } catch {
    etapes.balayage = { statut: 'echec' }
    reussi = false
  }

  if (reste() <= 0) etapes.argent = { statut: 'saute', raison: 'budget' }
  else try {
    const bilan = await traiterFileArgent({ budgetMs: Math.min(12_000, reste()) })
    etapes.argent = { statut: bilan.echecs > 0 ? 'echec' : 'ok' }
    if (bilan.echecs > 0) reussi = false
  } catch {
    etapes.argent = { statut: 'echec' }
    reussi = false
  }

  // Le veilleur peut faire plusieurs lectures : lui réserver cinq secondes avant le passage final.
  if (reste() <= 5_000) etapes.veilleur = { statut: 'saute', raison: 'budget' }
  else try {
    const maintenant = new Date()
    if (maintenant.getUTCMinutes() % 5 !== 0) {
      etapes.veilleur = { statut: 'saute', raison: 'hors_creneau' }
    } else {
      const creneau = new Date(maintenant)
      creneau.setUTCMinutes(Math.floor(creneau.getUTCMinutes() / 5) * 5, 0, 0)
      const cle = `a0:creneau:${creneau.toISOString().slice(0, 16).replace(/[-T:]/g, '')}`
      if (await consommerLimite(cle, 1, 300)) {
        await veilleur({ maintenant })
        etapes.veilleur = { statut: 'ok' }
      } else etapes.veilleur = { statut: 'saute', raison: 'deja_fait' }
    }
  } catch {
    etapes.veilleur = { statut: 'echec' }
    reussi = false
  }

  if (new Date().getUTCMinutes() % 15 === 0) {
    try {
      await tourLivraison()
    } catch {
      reussi = false
    }
  }

  const dureeMs = Date.now() - debut
  try {
    await enregistrerPassage('tic', { etapes, dureeMs, pause }, reussi)
  } catch {
    return NextResponse.json({ ok: false, etapes }, { status: 500 })
  }
  return reussi
    ? NextResponse.json({ ok: true, etapes, dureeMs })
    : NextResponse.json({ ok: false, etapes }, { status: 500 })
}
