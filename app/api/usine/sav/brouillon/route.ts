import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { ops_battement } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  classerMessage, depsDepuisBase, dejaTraite, escaladerBenj, marquerTraite, messageParId, preparerBrouillon, type BaseSav,
} from '@/lib/agents/sav/repondeurClient'

// Le SAV (fiche 026-245) : l'usine rend ce que Codex a lu d'UN message ; le code refait la décision. Cette route dépose, dans la file
// d'approbation du Poste, un brouillon fait du gabarit approuvé (jamais un texte venu du modèle ni du corps de la requête), ou une
// carte Attention pour Benj (remboursement, litige, demande sensible, lecture invalide, aucun gabarit approuvé). Elle n'envoie rien :
// le seul portier est Benj, par le geste « trancher ». Même une FAQ qui a atteint 20 approbations sans retouche y reste un brouillon.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const entetes = { 'cache-control': 'no-store' }
const erreur = (status: number) => NextResponse.json({ error: 'refus' }, { status, headers: entetes })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** La lecture du modèle : un objet tel quel, ou le JSON d'une chaîne (clôtures de code retirées) ; sinon la chaîne, que le code juge invalide. */
function lectureDe(brut: unknown): unknown {
  if (typeof brut !== 'string') return brut
  const nu = brut.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(nu) } catch { return brut }
}

export async function POST(req: Request) {
  if (!actif('busAgents')) return erreur(404)
  if (!req.headers.get('authorization')) return erreur(401)
  const agent = await authAgent(req)
  if (!agent || estRefusAgent(agent)) return agent ? reponseRefusAgent(agent) : erreur(503)
  if (agent.nom !== 'sav') return erreur(403)
  try { await ops_battement({ p_nom: 'sav' }) } catch { /* passage sans battement */ }
  const texte = await req.text().catch(() => '')
  if (texte.length > 8192) return erreur(400)
  let corps: unknown
  try { corps = JSON.parse(texte) } catch { return erreur(400) }
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return erreur(400)
  const recu = corps as Record<string, unknown>
  if (Object.keys(recu).some((k) => k !== 'message_id' && k !== 'lecture')) return erreur(400)
  const messageId = recu.message_id
  if (typeof messageId !== 'string' || !UUID.test(messageId)) return erreur(400)
  try {
    const pause = await pauseGenerale()
    if (!pause || pause.active) return erreur(423)
    const base = supabaseAdmin as unknown as BaseSav
    if (await dejaTraite(base, messageId)) return NextResponse.json({ ok: true, deja_traite: true }, { headers: entetes })
    const message = await messageParId(base, messageId)
    if (!message) return erreur(409)
    const lecture = lectureDe(recu.lecture)
    const deps = depsDepuisBase(base, {
      fil_id: message.fil,
      lecteur: async () => { if (recu.lecture === undefined) throw new Error('aucune lecture du modèle'); return lecture },
    })
    const resultat = await classerMessage(message, deps)
    if (resultat.decision === 'escalade_benj') {
      await escaladerBenj(message, resultat.motif ?? resultat.classe, deps)
    } else if (resultat.decision === 'brouillon' || resultat.decision === 'automatique_faq') {
      let brouillon = null
      try { brouillon = await preparerBrouillon(message, resultat, deps) } catch { brouillon = null }
      if (!brouillon || !deps.brouillons) await escaladerBenj(message, 'modele_absent', deps)
      else await deps.brouillons.deposer({ ...brouillon, message_id: message.id, origine: resultat.decision })
    }
    await marquerTraite(base, message.id)
    return NextResponse.json({ ok: true, decision: resultat.decision, classe: resultat.classe, motif: resultat.motif }, { headers: entetes })
  } catch { return erreur(500) }
}
