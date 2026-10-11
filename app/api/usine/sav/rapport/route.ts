import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { pauseGenerale } from '@/lib/agents/pause'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { rapportSav, type BaseSav } from '@/lib/agents/sav/repondeurClient'

// Le SAV (fiche 026-245), côté Poste : le compteur des approbations sans retouche par type de question (le seuil de 20 ouvre
// l'automatique FAQ, jamais « autre »), les brouillons et les escalades en attente, les décisions de Benj sur 30 jours. Que des
// nombres : le contenu d'un message de client ne sort jamais d'ici. Deux lecteurs : l'agent `sav` (jeton) ou le fondateur (session) ;
// sous la pause générale l'agent n'obtient rien, le fondateur garde sa lecture (aucun effet de bord ici) avec le drapeau `pause`.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const entetes = { 'cache-control': 'private, no-store' }
const erreur = (status: number) => NextResponse.json({ error: 'refus' }, { status, headers: entetes })

export async function GET(req: Request) {
  let parAgent = false
  if (req.headers.get('authorization')) {
    if (!actif('busAgents')) return erreur(404)
    const agent = await authAgent(req)
    if (!agent || estRefusAgent(agent)) return agent ? reponseRefusAgent(agent) : erreur(503)
    if (agent.nom !== 'sav') return erreur(403)
    parAgent = true
  } else {
    if (!actif('pilotage')) return erreur(404)
    const fondateur = await estFondateur(req)
    if (estRefus(fondateur)) return reponseRefus(fondateur)
    const domaine = exigerDomaine(fondateur, 'sante', 'voir')
    if (domaineRefuse(domaine)) return reponseRefus(domaine)
  }
  try {
    const pause = await pauseGenerale()
    const enPause = !pause || pause.active
    if (parAgent && enPause) return NextResponse.json({ pause: true }, { headers: entetes })
    const rapport = await rapportSav(supabaseAdmin as unknown as BaseSav)
    return NextResponse.json({ pause: enPause, ...rapport }, { headers: entetes })
  } catch { return erreur(500) }
}
