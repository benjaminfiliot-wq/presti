import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { ops_battement } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  MOTEUR_SAV, depsDepuisBase, entreeLecteur, escaladerBenj, marquerTraite, messagesATraiter, reglerEnCode, type BaseSav,
} from '@/lib/agents/sav/repondeurClient'

// Le SAV (fiche 026-245) : ce que l'usine doit lire avec Codex. Les messages que le code règle seul (aucun client rattaché, mot de
// remboursement, de litige ou de sécurité) ne quittent jamais Vercel : ils sont réglés ici (carte pour Benj, ou rien) et repérés
// « traités ». Seuls les autres sont rendus, avec la consigne, le texte du client tel quel et les types de FAQ — et l'obligation
// du moteur : Codex avec les données personnelles permises, jamais un moteur gratuit ni un modèle de nuage.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const entetes = { 'cache-control': 'no-store' }
const erreur = (status: number) => NextResponse.json({ error: 'refus' }, { status, headers: entetes })
const LOT = 20

export async function GET(req: Request) {
  if (!actif('busAgents')) return erreur(404)
  if (!req.headers.get('authorization')) return erreur(401)
  const agent = await authAgent(req)
  if (!agent || estRefusAgent(agent)) return agent ? reponseRefusAgent(agent) : erreur(503)
  if (agent.nom !== 'sav') return erreur(403)
  try { await ops_battement({ p_nom: 'sav' }) } catch { /* passage sans battement */ }
  try {
    const pause = await pauseGenerale()
    if (!pause || pause.active) return NextResponse.json({ pause: true, messages: [] }, { headers: entetes })
    const base = supabaseAdmin as unknown as BaseSav
    const messages = []
    let reglees = 0
    let erreurs = 0
    for (const message of await messagesATraiter(base, LOT)) {
      try {
        const deps = depsDepuisBase(base, { fil_id: message.fil })
        const code = await reglerEnCode(message, deps)
        if (code) {
          if (code.decision === 'escalade_benj') await escaladerBenj(message, code.motif ?? code.classe, deps)
          await marquerTraite(base, message.id)
          reglees += 1
          continue
        }
        messages.push({ id: message.id, ...entreeLecteur(message.texte, deps) })
      } catch { erreurs += 1 }
    }
    return NextResponse.json({ pause: false, moteur: MOTEUR_SAV, messages, reglees_en_code: reglees, erreurs }, { headers: entetes })
  } catch { return erreur(500) }
}
