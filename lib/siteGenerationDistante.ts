import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { consommerLimite } from '@/lib/limites'
import { envoyerAlertes, type Alerte } from '@/lib/alertes'
import { erreursFabrication, type Commande } from '@/lib/siteCommande'

type CommandeGeneration = Commande & {
  generation_tentatives?: number | null
  generation_demandee_le?: string | null
}

type Livreur = { dernier_battement: string; periode_minutes: number }
type Usine = {
  index: (id: string) => Promise<{ tache: string } | null>
  manifeste: (tache: string) => Promise<boolean>
  livreur: () => Promise<Livreur | null>
}

type Dependances = {
  fetch?: typeof fetch
  base?: typeof supabaseAdmin
  limite?: typeof consommerLimite
  alerter?: typeof envoyerAlertes
  env?: Record<string, string | undefined>
  maintenant?: () => Date
  usine?: Usine
}

const objetAbsent = (erreur: { statusCode?: string | number; error?: string } | null) =>
  erreur?.statusCode === '404' || erreur?.statusCode === 404 || erreur?.error === 'not_found'

const usineDepuis = (base: typeof supabaseAdmin): Usine => {
  const lire = async (chemin: string): Promise<Blob | null> => {
    const { data, error } = await base.storage.from('usine').download(chemin)
    if (error) {
      if (objetAbsent(error)) return null
      throw new Error('Stockage usine indisponible')
    }
    if (!data) throw new Error('Stockage usine sans réponse')
    return data
  }
  return {
    index: async (id) => {
      const objet = await lire(`commandes/${id}.json`)
      if (!objet) return null
      const index = JSON.parse(await objet.text()) as { tache?: unknown }
      if (typeof index.tache !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(index.tache)) throw new Error('Index usine invalide')
      return { tache: index.tache }
    },
    manifeste: async (tache) => !!(await lire(`${tache}/sortie/manifeste.json`)),
    livreur: async () => {
      const { data, error } = await base.rpc('ops_etat')
      if (error || !data || typeof data !== 'object') throw new Error('État usine indisponible')
      const agents = (data as { agents?: unknown }).agents
      if (!Array.isArray(agents)) throw new Error('Agents usine illisibles')
      const ligne = agents.find((agent) => agent?.nom === 'livreur_usine')
      return ligne ? { dernier_battement: ligne.dernier_battement, periode_minutes: Number(ligne.periode_minutes) } : null
    },
  }
}

export async function demanderGeneration(commande: CommandeGeneration, deps: Dependances = {}): Promise<boolean> {
  const maintenant = deps.maintenant?.() ?? new Date()
  const env = deps.env ?? process.env
  const alerter = deps.alerter ?? envoyerAlertes
  const signaler = async (cause: string) => {
    const alerte: Alerte = {
      motif: 'paiement', a: 'entreprise', cle: `generation:${commande.id}:${cause}`,
      sujet: 'Génération de site à vérifier',
      corps: `Commande ${commande.id} : génération distante indisponible (${cause}).`,
    }
    await alerter([alerte])
  }

  if (commande.etat !== 'payee' || erreursFabrication(commande).length) return false
  if ((commande.generation_tentatives ?? 0) >= 3) return false
  if (commande.generation_demandee_le && maintenant.getTime() - new Date(commande.generation_demandee_le).getTime() < 45 * 60_000) return false
  const jeton = env.GITHUB_DISPATCH_TOKEN
  if (!jeton) return false
  const depot = env.GITHUB_DEPOT_LIVRAISON
  if (!depot || !/^[\w.-]+\/[\w.-]+$/.test(depot)) { await signaler('depot_invalide'); return false }

  const base = deps.base ?? supabaseAdmin
  try {
    const usine = deps.usine ?? usineDepuis(base)
    const index = await usine.index(commande.id)
    if (index) {
      const sortie = await usine.manifeste(index.tache)
      if (sortie) return false
      const payeeDepuis = commande.paye_le ? maintenant.getTime() - new Date(commande.paye_le).getTime() : 0
      const livreur = await usine.livreur()
      const battementDepuis = livreur?.dernier_battement ? maintenant.getTime() - new Date(livreur.dernier_battement).getTime() : Infinity
      const muet = !livreur || !Number.isFinite(battementDepuis) || !Number.isFinite(livreur.periode_minutes) || battementDepuis > 2 * livreur.periode_minutes * 60_000
      if (payeeDepuis <= 60 * 60_000 && !muet) return false
    }
  } catch {
    await signaler('usine_incertitude')
    return false
  }

  const maximum = Number(env.GENERATIONS_MOIS_MAX) || 10
  const mois = maintenant.toISOString().slice(0, 7)
  if (!(await (deps.limite ?? consommerLimite)(`actions:generer:${mois}`, maximum, 32 * 86_400))) {
    await signaler('plafond')
    return false
  }
  try {
    const reponse = await (deps.fetch ?? fetch)(`https://api.github.com/repos/${depot}/dispatches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'generer-site', client_payload: { commande: commande.id } }),
      signal: AbortSignal.timeout(10_000),
    })
    if (reponse.status !== 204) { await signaler(`http_${reponse.status}`); return false }
    const { error } = await base.from('sites_commandes')
      .update({ generation_demandee_le: maintenant.toISOString(), generation_tentatives: (commande.generation_tentatives ?? 0) + 1 })
      .eq('id', commande.id).eq('etat', 'payee').eq('generation_tentatives', commande.generation_tentatives ?? 0)
    if (error) { await signaler('ecriture'); return false }
    return true
  } catch {
    await signaler('reseau')
    return false
  }
}
