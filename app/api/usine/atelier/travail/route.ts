import { createHash } from 'node:crypto'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent } from '@/lib/agents/garde'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { MAQUETTES_PAR_JOUR, MAQUETTES_ENTRANTS_JOUR, PALIERS } from '@/lib/agents/acquisition/contrat'
import { ops_battement } from '@/lib/agents/bus'
import type { ProspectReserve } from '@/lib/agents/acquisition/contrat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const repondre = (corps: object, status = 200) => Response.json(corps, { status })
const limite = (n: number) => Math.max(0, Math.floor(n))
function projeter(p: ProspectReserve) {
  const fait = p.faits?.find((f) => f.verifie === 'ok') ?? p.faits?.[0]
  return { prospect_id: p.id, cle: createHash('sha256').update(p.cle_dedup).digest('hex').slice(0, 16), entreprise: p.entreprise, metier: p.metier, ville: p.commune, communes: p.commune ? [p.commune] : [], fait: fait ? { extrait: fait.extrait, url: fait.url, id: fait.id, lu_le: fait.lu_le } : null, entrant: p.source === 'entrant' }
}
export async function GET(req: Request) {
  if (!actif('busAgents')) return repondre({}, 404)
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return repondre({ erreur: agent.code }, agent.status)
  if (agent.nom !== 'atelier_maquettes') return repondre({ erreur: 'agent' }, 403)
  if ((await pauseGenerale()).active) return repondre({ pause: true })
  try {
    const [jour, etat] = await Promise.all([magasinSupabase.maquettesDuJour(), magasinSupabase.etatEnvoi()])
    const demandes = await magasinSupabase.prospectsPourMaquette(MAQUETTES_PAR_JOUR + MAQUETTES_ENTRANTS_JOUR + 20, false)
    const entrants = demandes.filter((p) => p.source === 'entrant').slice(0, limite(Math.min(MAQUETTES_ENTRANTS_JOUR - jour.entrants_faites_aujourdhui, MAQUETTES_ENTRANTS_JOUR)))
    const oui = demandes.filter((p) => p.source !== 'entrant').slice(0, limite(Math.min(MAQUETTES_PAR_JOUR - jour.faites_aujourdhui, MAQUETTES_PAR_JOUR)))
    let avance: ProspectReserve[] = []
    if (actif('varianteA' as Parameters<typeof actif>[0])) {
      const parJour = PALIERS.find((p) => p.id === etat.palier)?.par_jour ?? 0
      const n = limite(Math.min(MAQUETTES_PAR_JOUR - jour.faites_aujourdhui - oui.length, 2 * parJour - jour.pretes_non_utilisees))
      if (n) avance = await magasinSupabase.prospectsPourMaquette(n, true)
    }
    const liens = await magasinSupabase.prospectsOui(10)
    const resultat = { a_fabriquer: [...entrants, ...oui, ...avance].map(projeter), liens_a_creer: liens.map((p) => p.id) }
    await ops_battement({ p_nom: 'atelier_maquettes' })
    return repondre(resultat)
  } catch { return repondre({ erreur: 'indisponible' }, 503) }
}
