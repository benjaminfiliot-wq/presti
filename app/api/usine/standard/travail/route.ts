import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { ops_battement } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { CONSIGNES, classerEnCode, appliquerClasse, preparerDonnees, faqApprouvee, identifiantsMetiers } from '@/lib/agents/acquisition/standardiste'
import type { Classement } from '@/lib/agents/acquisition/contrat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const entetes = { 'cache-control': 'no-store' }
const erreur = (status: number) => NextResponse.json({ error: 'refus' }, { status, headers: entetes })

export async function GET(req: Request) {
  if (!actif('busAgents')) return erreur(404)
  if (!req.headers.get('authorization')) return erreur(401)
  const agent = await authAgent(req)
  if (!agent || estRefusAgent(agent)) return agent ? reponseRefusAgent(agent) : erreur(503)
  if (agent.nom !== 'standardiste') return erreur(403)
  try { await ops_battement({ p_nom: 'standardiste' }) } catch { /* passage sans battement */ }
  try {
    const pause = await pauseGenerale()
    if (!pause || pause.active || await magasinSupabase.enPause('standardiste')) return NextResponse.json({ reponses: [] }, { headers: entetes })
    const faq = faqApprouvee()
    const metiers = identifiantsMetiers()
    const reponses = []
    for (const reponse of await magasinSupabase.reponsesATraiter(20)) {
      const code = classerEnCode(reponse)
      if (code) {
        const classement = await appliquerClasse(magasinSupabase, reponse, { classe: code.classe, source: 'regle' }) ?? { classe: code.classe, source: 'regle' }
        await magasinSupabase.classerReponse(reponse.id, classement as Classement)
        continue
      }
      reponses.push({ id: reponse.id, systeme: CONSIGNES, donnees: preparerDonnees(reponse, faq, metiers) })
    }
    return NextResponse.json({ reponses }, { headers: entetes })
  } catch { return erreur(500) }
}
