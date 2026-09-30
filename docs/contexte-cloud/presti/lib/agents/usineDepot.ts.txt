import { supabaseAdmin } from '@/lib/supabaseAdmin'
import limites from './usineLimites.json' with { type: 'json' }
import type { AgentAuth } from './garde'

export type FichierDepot = { nom: string; octets: number; type: string; sha256: string }
type Refus = { status: number; error: string }
type Tache = { id: string; capacite: string }
const refus = (status: number, error: string): Refus => ({ status, error })
const INTROUVABLE = refus(404, 'tache_introuvable')
const BUCKET = 'usine'
const STOCKAGE_TOTAL = 1_073_741_824
const SEUIL_STOCKAGE = STOCKAGE_TOTAL * 0.6

export async function tacheDetenue(agentNom: string, tacheId: string): Promise<Tache | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('ops_tache_detenue', { p_agent: agentNom, p_id: tacheId })
    if (error) return null
    const ligne = Array.isArray(data) ? data[0] : null
    return ligne && typeof ligne.id === 'string' && typeof ligne.capacite === 'string' ? ligne as Tache : null
  } catch { return null }
}

function limiteDe(agent: AgentAuth, tache: Tache) {
  if (!agent.capacites.includes(tache.capacite) || !Object.prototype.hasOwnProperty.call(limites, tache.capacite)) return null
  return limites[tache.capacite as keyof typeof limites]
}

export async function entree(agent: AgentAuth, tacheId: string) {
  const tache = await tacheDetenue(agent.nom, tacheId)
  if (!tache) return INTROUVABLE
  const limite = limiteDe(agent, tache)
  if (!limite) return refus(403, 'capacite')
  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(`${tacheId}/entree`, { limit: limite.entrees_max + 1 })
    if (error || !Array.isArray(data)) return refus(502, 'stockage_indisponible')
    if (data.length > limite.entrees_max) return refus(409, 'trop_d_entrees')
    const entrees: { nom: string; url: string; octets: number }[] = []
    for (const objet of data) {
      const chemin = `${tacheId}/entree/${objet.name}`
      const signe = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(chemin, 900)
      if (signe.error || !signe.data?.signedUrl) return refus(502, 'stockage_indisponible')
      entrees.push({ nom: objet.name, url: signe.data.signedUrl, octets: Number(objet.metadata?.size) })
    }
    return { tache: tacheId, entrees }
  } catch { return refus(502, 'stockage_indisponible') }
}

function nomValide(nom: string) {
  return /^[a-z0-9][a-z0-9._/-]{0,119}$/.test(nom) && !nom.includes('..') && !nom.includes('//')
}

export async function depot(agent: AgentAuth, tacheId: string, fichiers: FichierDepot[]) {
  const tache = await tacheDetenue(agent.nom, tacheId)
  if (!tache) return INTROUVABLE
  const limite = limiteDe(agent, tache)
  if (!limite) return refus(403, 'capacite')
  if (fichiers.length > limite.fichiers_max) return refus(413, 'trop_de_fichiers')
  const noms = new Set<string>()
  let total = 0
  for (const fichier of fichiers) {
    if (!nomValide(fichier.nom) || noms.has(fichier.nom) || !/^[a-f\d]{64}$/i.test(fichier.sha256) || !limite.types.includes(fichier.type)) return refus(400, 'fichier_invalide')
    if (!Number.isSafeInteger(fichier.octets) || fichier.octets <= 0) return refus(400, 'fichier_invalide')
    if (fichier.octets > limite.octets_fichier_max) return refus(413, 'fichier_trop_gros')
    noms.add(fichier.nom)
    total += fichier.octets
  }
  if (total > limite.octets_total_max) return refus(413, 'total_trop_gros')
  try {
    const { data, error } = await supabaseAdmin.rpc('ops_stockage_octets')
    if (error || typeof data !== 'number' || !Number.isFinite(data) || data < 0) return refus(503, 'stockage')
    if (data > SEUIL_STOCKAGE) return refus(507, 'stockage')
  } catch { return refus(503, 'stockage') }
  try {
    const depots: { nom: string; url: string; jeton: string }[] = []
    for (const fichier of fichiers) {
      const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(`${tacheId}/sortie/${fichier.nom}`)
      if (error || !data?.signedUrl || !data.token) return refus(502, 'stockage_indisponible')
      depots.push({ nom: fichier.nom, url: data.signedUrl, jeton: data.token })
    }
    return { depots }
  } catch { return refus(502, 'stockage_indisponible') }
}
