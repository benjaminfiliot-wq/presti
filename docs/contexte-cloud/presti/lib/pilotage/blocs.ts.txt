import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sourcer, type Sourcee } from '@/lib/direction/fraicheur'
import { cartesDecisions, type Decision } from './decisions'
import { appelsDepuisReponses, appelsDepuisCommandes, fusionnerAppels, type ReponseAppel, type CommandeAppel } from './appels'
import { envoisDesAgents } from './envois'
import { entonnoir } from './entonnoir'
import { lignesAgents, type Agent } from './agents'
import { validerSnapshot, resumeCode } from './code'
import { erreursAvantPaiement, nettoyerBrouillon } from '@/lib/siteCommande'
import { pauseGenerale } from '@/lib/agents/pause'

export const BLOCS_ROUTE = ['decider', 'appeler', 'envois', 'entonnoir', 'agents', 'code'] as const
export type BlocRoute = typeof BLOCS_ROUTE[number]

type ValeurBloc =
  | ReturnType<typeof cartesDecisions>
  | { appels: ReturnType<typeof fusionnerAppels>; partiel: string | null }
  | ReturnType<typeof envoisDesAgents>
  | ReturnType<typeof entonnoir>
  | { agents: ReturnType<typeof lignesAgents>; pauseGenerale: Awaited<ReturnType<typeof pauseGenerale>> | null }
  | ReturnType<typeof resumeCode>

function exigerLecture<T>(lecture: { data: T | null; error: { message: string } | null }, nom: string): T {
  if (lecture.error) throw new Error(`${nom} : ${lecture.error.message}`)
  if (lecture.data === null) throw new Error(`${nom} : aucune réponse de la base.`)
  return lecture.data
}

async function lireAppels(maintenant: Date): Promise<{ appels: ReturnType<typeof fusionnerAppels>; partiel: string | null }> {
  const reponses = await (async () => {
    try {
      const lecture = await supabaseAdmin.rpc('pilotage_appels', { p_limite: 20 })
      return { cartes: appelsDepuisReponses(exigerLecture(lecture, 'Réponses') as ReponseAppel[], maintenant), erreur: null }
    } catch {
      return { cartes: [], erreur: 'Les réponses et rendez-vous sont indisponibles.' }
    }
  })()

  const commandes = await (async () => {
    try {
      const lecture = await supabaseAdmin.from('sites_commandes')
        .select('id, artisan_id, etat, paye_le, metier, communes, domaine_mode, domaine, metiers_secondaires, matiere')
        .in('etat', ['payee', 'generee'])
      const lignes = exigerLecture(lecture, 'Commandes')
      const ids = lignes.map((commande) => commande.artisan_id).filter((id): id is string => typeof id === 'string')
      const artisans = ids.length
        ? exigerLecture(await supabaseAdmin.from('artisans').select('id, nom, tel').in('id', ids), 'Artisans')
        : []
      const parId = new Map(artisans.map((artisan) => [artisan.id, artisan]))
      const entrees: CommandeAppel[] = lignes.map((commande) => {
        const artisan = commande.artisan_id ? parId.get(commande.artisan_id) : null
        return {
          id: commande.id, etat: commande.etat, paye_le: commande.paye_le,
          metier: commande.metier, communes: commande.communes,
          nom: artisan?.nom ?? null, tel: artisan?.tel ?? null,
          manques: erreursAvantPaiement(nettoyerBrouillon(commande)),
        }
      })
      return { cartes: appelsDepuisCommandes(entrees, maintenant), erreur: null }
    } catch {
      return { cartes: [], erreur: 'Les commandes de site sont indisponibles.' }
    }
  })()

  if (reponses.erreur && commandes.erreur) throw new Error('Réponses, rendez-vous et commandes de site indisponibles.')
  return {
    appels: fusionnerAppels(reponses.cartes, commandes.cartes),
    partiel: reponses.erreur ?? commandes.erreur,
  }
}

export async function lireBloc(nom: BlocRoute, options: { epingle?: string; maintenant?: Date } = {}): Promise<Sourcee<ValeurBloc>> {
  const maintenant = options.maintenant ?? new Date()
  return sourcer(`pilotage:${nom}`, 'supabase', async (): Promise<ValeurBloc> => {
    if (nom === 'decider') {
      const lecture = await supabaseAdmin.rpc('pilotage_decisions', { p_limite: 50 })
      return cartesDecisions(exigerLecture(lecture, 'Décisions') as Decision[], options.epingle, maintenant)
    }
    if (nom === 'appeler') return lireAppels(maintenant)
    if (nom === 'envois') {
      const [envois, canaux, technologies] = await Promise.all([
        supabaseAdmin.rpc('pilotage_envois_du_jour'),
        supabaseAdmin.rpc('pilotage_compteurs_du_jour'),
        supabaseAdmin.rpc('pilotage_compteurs_technologies'),
      ])
      return envoisDesAgents(
        exigerLecture(envois, 'Envois') as Parameters<typeof envoisDesAgents>[0],
        exigerLecture(canaux, 'Canaux') as Parameters<typeof envoisDesAgents>[1],
        exigerLecture(technologies, 'Technologies') as Parameters<typeof envoisDesAgents>[2],
        maintenant,
      )
    }
    if (nom === 'entonnoir') {
      const depuis = new Date(maintenant.getTime())
      depuis.setUTCDate(depuis.getUTCDate() - 30)
      const lecture = await supabaseAdmin.rpc('pilotage_entonnoir', { p_depuis: depuis.toISOString() })
      return entonnoir(exigerLecture(lecture, 'Entonnoir') as Parameters<typeof entonnoir>[0], maintenant)
    }
    if (nom === 'agents') {
      const [lecture, pause] = await Promise.all([supabaseAdmin.rpc('pilotage_agents'), pauseGenerale()])
      return { agents: lignesAgents(exigerLecture(lecture, 'Agents') as Agent[], maintenant), pauseGenerale: pause }
    }
    const lecture = await supabaseAdmin.rpc('pilotage_code_lire')
    const lignes = exigerLecture(lecture, 'Code') as { etat: unknown; publie_le: string | null }[]
    const ligne = lignes[0]
    return resumeCode(validerSnapshot(ligne?.etat), ligne?.publie_le ?? null, maintenant)
  })
}
