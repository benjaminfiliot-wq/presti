import { createHash } from 'node:crypto'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent } from '@/lib/agents/garde'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const repondre = (corps: object, status = 200) => Response.json(corps, { status })
const NOMS = ['capture-telephone.jpg', 'capture-ordinateur.jpg', 'video.mp4'] as const
const UUID = /^[0-9a-f-]{36}$/i
function jpeg(b: Uint8Array) { return b.length > 100 && b[0] === 255 && b[1] === 216 && b[2] === 255 && b.at(-2) === 255 && b.at(-1) === 217 }
export async function POST(req: Request) {
  if (!actif('busAgents')) return repondre({}, 404)
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return repondre({ erreur: agent.code }, agent.status)
  if (agent.nom !== 'atelier_maquettes') return repondre({ erreur: 'agent' }, 403)
  if ((await pauseGenerale()).active) return repondre({ erreur: 'pause' }, 423)
  let corps: { prospect_id?: string; objets?: Record<string, string>; empreintes?: Record<string, string> }
  try { corps = await req.json() } catch { return repondre({ erreur: 'corps' }, 400) }
  // Le prospect est validé AVANT d'entrer dans une expression régulière : jamais une entrée brute dans un RegExp.
  if (!corps.prospect_id || !UUID.test(corps.prospect_id) || !corps.objets || !corps.empreintes || NOMS.some((n) => typeof corps.objets?.[n] !== 'string' || !new RegExp(`^${corps.prospect_id}/[0-9a-f-]{36}/${n.replace('.', '\\.')}$`, 'i').test(corps.objets[n]) || !/^[0-9a-f]{64}$/.test(corps.empreintes?.[n] ?? ''))) return repondre({ erreur: 'entree' }, 400)
  const prospectId = corps.prospect_id
  const stockage = supabaseAdmin.storage.from('maquettes')
  const objets: Record<string, string> = Object.fromEntries(NOMS.map((n) => [n, corps.objets![n]]))
  const empreintes: Record<string, string> = Object.fromEntries(NOMS.map((n) => [n, corps.empreintes![n]]))
  try {
    // Le même état que pour l'adresse de dépôt : verifie (entrant ou froid préparé d'avance) ou oui sans maquette prête.
    const candidats = await magasinSupabase.prospectsPourMaquette(50, false)
    const avance = actif('varianteA' as Parameters<typeof actif>[0]) ? await magasinSupabase.prospectsPourMaquette(50, true) : []
    const p = [...candidats, ...avance].find((x) => x.id === prospectId)
    if (!p || !['verifie', 'oui'].includes(p.etape)) {
      await stockage.remove(Object.values(objets)).catch(() => {})
      return repondre({ erreur: 'etat' }, 409)
    }
    for (const nom of NOMS) {
      const { data, error } = await stockage.download(objets[nom])
      if (error || !data) throw new Error('lecture')
      const b = new Uint8Array(await data.arrayBuffer())
      if (b.length === 0 || b.length > (nom === 'video.mp4' ? 3 : 1) * 1024 ** 2) throw new Error('taille')
      if (nom === 'video.mp4' ? Buffer.from(b).toString('ascii', 4, 8) !== 'ftyp' : !jpeg(b)) throw new Error('format')
      if (createHash('sha256').update(b).digest('hex') !== empreintes[nom]) throw new Error('empreinte')
    }
  } catch {
    await stockage.remove(Object.values(objets)).catch(() => {})
    return repondre({ erreur: 'fichier_refuse' }, 422)
  }
  try {
    // Chaque fichier a son propre dossier dans le bucket (une adresse de dépôt par fichier) : la page privée (maquettesLien) et la
    // purge retrouvent les trois par la table `objets`, jamais par un préfixe commun. `chemin` : la capture du téléphone.
    // La base lit `objets`, `empreintes` et `chemin` (acq_maquette_prete, 0106) : le type étroit du contrat ne les décrit pas tous.
    await magasinSupabase.enregistrerMaquettePrete(prospectId, { chemin: objets['capture-telephone.jpg'], empreinte: empreintes['capture-telephone.jpg'], variante: null, objets, empreintes, prete_le: new Date().toISOString() } as Parameters<typeof magasinSupabase.enregistrerMaquettePrete>[1])
    return repondre({ ok: true })
  } catch {
    await stockage.remove(Object.values(objets)).catch(() => {})
    return repondre({ erreur: 'indisponible' }, 503)
  }
}
