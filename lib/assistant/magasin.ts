// L'assistant de gestion de la console — le MAGASIN des actions en base (table assistant_actions, migration 0157). Serveur seulement.
//
// Écrit avec la clé de service (aucune politique d'écriture pour les artisans : ils LISENT leurs actions sous la RLS, et ne
// peuvent ni en créer, ni en modifier, ni en supprimer depuis un navigateur). Chaque requête porte `artisan_id` : la clé de
// service passe outre la RLS, ce filtre est la barrière — et il vient de la session, jamais du modèle ni de l'écran.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { FicheAction, MagasinActions, NouvelleFiche } from './confirmation'

const TABLE = 'assistant_actions'
const COLONNES = 'id, artisan_id, conversation_id, tour, outil, mode, statut, titre, entrees, apercu, annulation, resultat_resume, objet_type, objet_id, cree_le, maj_le, expire_le'

export function magasinSupabase(): MagasinActions {
  return {
    async creer(f: NouvelleFiche) {
      const { data, error } = await supabaseAdmin.from(TABLE).insert(f).select(COLONNES).single()
      if (error || !data) throw new Error(error?.message ?? 'action non enregistrée')
      return data as unknown as FicheAction
    },
    async lire(artisanId, id) {
      const { data, error } = await supabaseAdmin.from(TABLE).select(COLONNES).eq('id', id).eq('artisan_id', artisanId).maybeSingle()
      if (error) throw new Error(error.message)
      return (data as unknown as FicheAction | null) ?? null
    },
    async transiter(artisanId, id, de, vers, maj = {}) {
      // UNE instruction : le WHERE sur le statut est la réclamation atomique (le perdant d'une course voit 0 ligne).
      const { data, error } = await supabaseAdmin.from(TABLE)
        .update({ ...maj, statut: vers, maj_le: new Date().toISOString() })
        .eq('id', id).eq('artisan_id', artisanId).in('statut', [...de])
        .select(COLONNES).maybeSingle()
      if (error) throw new Error(error.message)
      return (data as unknown as FicheAction | null) ?? null
    },
    async dernierEnvoi(artisanId, outil, objetId) {
      const { data, error } = await supabaseAdmin.from(TABLE).select('maj_le').eq('artisan_id', artisanId).eq('outil', outil).eq('objet_id', objetId).eq('statut', 'executee').order('maj_le', { ascending: false }).limit(1).maybeSingle()
      if (error) throw new Error(error.message)
      return (data?.maj_le as string | undefined) ?? null
    },
    async derniere(artisanId, conversationId, outil) {
      const { data, error } = await supabaseAdmin.from(TABLE).select(COLONNES).eq('artisan_id', artisanId).eq('conversation_id', conversationId).eq('outil', outil).eq('statut', 'executee').order('cree_le', { ascending: false }).limit(1).maybeSingle()
      if (error) throw new Error(error.message)
      return (data as unknown as FicheAction | null) ?? null
    },
  }
}

let dispo: { ok: boolean; le: number } | null = null
/**
 * La table des actions existe-t-elle (migration 0157 appliquée) ? Sans elle, l'assistant ne propose AUCUN outil d'action
 * (fail-closed : pas d'action sans journal ni carte) et lit comme avant. Le résultat positif est gardé pour le processus ;
 * un résultat négatif se revérifie après une minute.
 */
export async function actionsDisponibles(): Promise<boolean> {
  if (dispo && (dispo.ok || Date.now() - dispo.le < 60_000)) return dispo.ok
  // Pas de requête HEAD : sur une table absente elle ne rend pas d'erreur lisible. Un SELECT ordinaire rend l'erreur PostgREST.
  const { error } = await supabaseAdmin.from(TABLE).select('id').limit(1)
  dispo = { ok: !error, le: Date.now() }
  return dispo.ok
}
