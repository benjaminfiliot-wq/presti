// app/api/usine/facteur/travail/route.ts — ce que le second juge lit, sur l'usine (fiche 026-089, moitié qui juge).
//
// GET                → { envois: [{ id, canal, type, modele_id, texte, empreinte }] } : les envois `prepare` (20 au plus), avec
//                      leur texte exact et son SHA-256. Rien d'autre : ni adresse, ni fait, ni référence.
// GET ?passe=soir    → l'échantillon d'un envoi sur dix du jour de Paris, à rejuger sur un autre modèle : une seule fois par
//                      jour de Paris, `[]` ensuite et avant 20 h.
//
// Le jeton est celui de l'agent `facteur`, derrière le drapeau `busAgents` (404 sinon, avant toute identité). Chaque appel
// authentifié bat (`ops_battement`). Pause générale ou pause du Facteur : `{ envois: [] }`. Cette route ne fait aucun
// jugement de modèle et n'importe pas `@/lib/agents/llm` : l'usine juge, Vercel approuve.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { ops_battement } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { travailDuJuge, travailDuSoir } from '@/lib/agents/acquisition/facteur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AGENT = 'facteur'
const entetes = { 'cache-control': 'no-store' }
const rien = () => NextResponse.json({ envois: [] }, { headers: entetes })
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status, headers: entetes })

export async function GET(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (!agent || estRefusAgent(agent)) return agent ? reponseRefusAgent(agent) : erreur(503, 'indisponible')
  if (agent.nom !== AGENT) return erreur(403, 'agent')
  try { await ops_battement({ p_nom: agent.nom }) } catch { /* un battement manqué ne change pas le travail */ }

  let passe: string | null = null
  try { passe = new URL(req.url).searchParams.get('passe') } catch { passe = null }
  if (passe !== null && passe !== 'soir') return erreur(400, 'passe')

  try {
    const pause = await pauseGenerale()
    if (!pause || pause.active) return rien()
    if (await magasinSupabase.enPause('facteur')) return rien()
    const horloge = { maintenant: Date.now, attendre: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)) }
    const travail = passe === 'soir' ? await travailDuSoir(magasinSupabase, horloge) : await travailDuJuge(magasinSupabase, 20)
    // Champ par champ : rien d'autre ne sort d'ici.
    const envois = travail.envois.map((e) => ({ id: e.id, canal: e.canal, type: e.type, modele_id: e.modele_id, texte: e.texte, empreinte: e.empreinte }))
    return NextResponse.json({ envois }, { headers: entetes })
  } catch {
    return erreur(500, 'echec')
  }
}
