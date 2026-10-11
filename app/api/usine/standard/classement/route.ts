import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { ops_battement } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { validerClassement, appliquerClasse } from '@/lib/agents/acquisition/standardiste'
import type { Classement } from '@/lib/agents/acquisition/contrat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const entetes = { 'cache-control': 'no-store' }
const erreur = (status: number) => NextResponse.json({ error: 'refus' }, { status, headers: entetes })

export async function POST(req: Request) {
  if (!actif('busAgents')) return erreur(404)
  if (!req.headers.get('authorization')) return erreur(401)
  const agent = await authAgent(req)
  if (!agent || estRefusAgent(agent)) return agent ? reponseRefusAgent(agent) : erreur(503)
  if (agent.nom !== 'standardiste') return erreur(403)
  try { await ops_battement({ p_nom: 'standardiste' }) } catch { /* passage sans battement */ }
  const texte = await req.text().catch(() => '')
  if (texte.length > 8192) return erreur(400)
  let corps: unknown
  try { corps = JSON.parse(texte) } catch { return erreur(400) }
  if (!corps || typeof corps !== 'object') return erreur(400)
  const { reponse_id, brut } = corps as Record<string, unknown>
  if (typeof reponse_id !== 'string' || reponse_id.length < 1 || reponse_id.length > 100 || typeof brut !== 'string' || brut.length > 4000) return erreur(400)
  try {
    const pause = await pauseGenerale()
    if (!pause || pause.active || await magasinSupabase.enPause('standardiste')) return erreur(423)
    const reponse = (await magasinSupabase.reponsesATraiter(20)).find(r => r.id === reponse_id)
    if (!reponse) return erreur(409)
    const classement = validerClassement(brut, reponse)
    const effectif = await appliquerClasse(magasinSupabase, reponse, classement) ?? classement
    await magasinSupabase.classerReponse(reponse.id, effectif as Classement)
    return NextResponse.json({ ok: true, classe: effectif.classe }, { headers: entetes })
  } catch { return erreur(500) }
}
