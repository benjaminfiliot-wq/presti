// app/api/cron/repondeur/route.ts — le Répondeur (A9), sur Vercel (fiche 026-096).
//
// GET (toutes les 15 min) : prépare la réponse à chaque message classé (question tirée de la FAQ, prix, appel, STOP, demande
// RGPD, questions à un entrant, suite du Studio), la réponse privée aux commentaires « SITE » et la seule relance après un
// lien de maquette sans réponse. Il NE ROUTE RIEN vers l'extérieur : le Facteur (026-089) fait juger puis envoie. Aucun modèle
// de langage, aucun envoi, aucun `fetch`.
//
// Réponses par le standard `Response.json` (aucun import de `next/server` : la route s'importe telle quelle par Node, comme le juge le fait).
//
// Rien n'est préparé pendant la pause générale, ni quand le Répondeur est en pause. Aucun secret, texte de message, adresse
// ni jeton dans la console, le passage ou la réponse : des compteurs seulement.
import { pauseGenerale } from '@/lib/agents/pause'
import { ops_battement } from '@/lib/agents/bus'
import { enregistrerPassage } from '@/lib/alertes'
import { actif } from '@/lib/flags'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { executerRepondeur } from '@/lib/agents/acquisition/repondeur'
import { adresseReponseProspection } from '@/lib/agents/acquisition/boiteProspection'
import type { OffreLue } from '@/lib/agents/acquisition/repondeur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUDGET_MS = 45_000

/**
 * L'offre du Studio (026-166), lue par un `import()` protégé : sans le fichier ou sans son secret, le Répondeur ne prépare
 * aucun `studio_offre_v1` (événement `offre_absente`) et le reste de son travail continue.
 */
async function lireOffreStudio(): Promise<{ offre: OffreLue | null; lienCommandeStudio: ((p: { id: string; marque_cle: string }) => string) | null }> {
  try {
    const m = await import('@/lib/studio/offre')
    const o = m.offre()
    return {
      offre: { videos: o.videos, prix_texte: o.prix_texte },
      lienCommandeStudio: (p) => m.lienCommandeStudio({ prospect_id: p.id, marque_cle: p.marque_cle }),
    }
  } catch {
    return { offre: null, lienCommandeStudio: null }
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) return Response.json({ error: 'unauthorized' }, { status: 401 })

  // Quand on ne sait pas si la pause est levée, rien n'est préparé.
  const pause = await pauseGenerale()
  if (!pause || pause.active) return Response.json({ pause: true })
  try {
    if (await magasinSupabase.enPause('repondeur')) return Response.json({ pause: true })

    const { offre, lienCommandeStudio } = await lireOffreStudio()
    const horloge = { maintenant: Date.now, attendre: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)) }
    const bilan = await executerRepondeur({
      magasin: magasinSupabase,
      horloge,
      echeance: Date.now() + BUDGET_MS,
      drapeaux: { siteAchatPublic: actif('siteAchatPublic') },
      adresseReponse: adresseReponseProspection() || null,
      offre,
      lienCommandeStudio,
    })

    // Un passage réussi seulement : les refus de J3 ou de la base sont des résultats, pas des pannes.
    await enregistrerPassage('acq-repondeur', { ...bilan }, bilan.erreurs === 0)
    if (bilan.erreurs === 0) {
      try { await ops_battement({ p_nom: 'repondeur' }) } catch { console.error('[cron/repondeur] battement indisponible') }
    }
    return Response.json({ ok: bilan.erreurs === 0, ...bilan })
  } catch (e) {
    await enregistrerPassage('acq-repondeur', { erreur: (e instanceof Error ? e.message : String(e)).slice(0, 160) }, false)
    return Response.json({ error: 'échec' }, { status: 500 })
  }
}
