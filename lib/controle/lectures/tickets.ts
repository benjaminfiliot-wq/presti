// NOUVEAU (fiche 026-174) : le NOMBRE de tickets de support ouverts, pour la salle Presti de la station.
// Le domaine `support` est le plus sensible de la matrice des droits : cette lecture ne sélectionne que `id`, avec
// `count` calculé par la base (head : aucune ligne ne revient). Elle ne lit, ne nomme et ne rend jamais un contenu.
// « Ouvert » = la colonne de fermeture est nulle (migration 0074). La garde reste à l'appelant.
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function ticketsOuverts(): Promise<{ nombre: number }> {
  const { count, error } = await supabaseAdmin.from('tickets').select('id', { count: 'exact', head: true }).is('ferme_le', null)
  if (error) throw new Error('lecture des tickets ouverts refusée')
  return { nombre: count ?? 0 }
}
