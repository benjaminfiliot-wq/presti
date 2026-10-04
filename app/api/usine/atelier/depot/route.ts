import { randomUUID } from 'node:crypto'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent } from '@/lib/agents/garde'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const repondre = (corps: object, status = 200) => Response.json(corps, { status })
const FICHIERS = new Set(['capture-telephone.jpg', 'capture-ordinateur.jpg', 'video.mp4'])
export async function POST(req: Request) {
  if (!actif('busAgents')) return repondre({}, 404)
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return repondre({ erreur: agent.code }, agent.status)
  if (agent.nom !== 'atelier_maquettes') return repondre({ erreur: 'agent' }, 403)
  if ((await pauseGenerale()).active) return repondre({ erreur: 'pause' }, 423)
  let corps: { prospect_id?: string; fichier?: string }
  try { corps = await req.json() } catch { return repondre({ erreur: 'corps' }, 400) }
  if (!corps.prospect_id || !/^[0-9a-f-]{36}$/i.test(corps.prospect_id) || !FICHIERS.has(corps.fichier ?? '')) return repondre({ erreur: 'entree' }, 400)
  try {
    // Les demandes (entrants, froids à « oui »), et, drapeau levé seulement, le froid préparé d'avance (variante A).
    const candidats = await magasinSupabase.prospectsPourMaquette(50, false)
    const avance = actif('varianteA' as Parameters<typeof actif>[0]) ? await magasinSupabase.prospectsPourMaquette(50, true) : []
    const p = [...candidats, ...avance].find((x) => x.id === corps.prospect_id)
    if (!p || !['verifie', 'oui'].includes(p.etape)) return repondre({ erreur: 'etat' }, 409)
    const objet = `${p.id}/${randomUUID()}/${corps.fichier}`
    const { data, error } = await supabaseAdmin.storage.from('maquettes').createSignedUploadUrl(objet)
    if (error || !data) return repondre({ erreur: 'stockage' }, 503)
    return repondre({ objet, url: data.signedUrl })
  } catch { return repondre({ erreur: 'indisponible' }, 503) }
}
