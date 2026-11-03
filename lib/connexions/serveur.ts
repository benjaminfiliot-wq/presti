// Serveur seulement : les vraies dépendances des routes « Connecter / Retirer » (tâche 036-009).
// Le drapeau `connexions` (lib/flags.ts) décide de tout ; l'offre passe par peut() (lib/plans.ts) ; chaque requête filtre sur le
// compte (la clé de service passe outre la RLS de public.connexions). Rien ici ne renvoie un secret au navigateur.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { actif } from '@/lib/flags'
import { peut } from '@/lib/plans'
import { suspensionEnCours } from '@/lib/suspension'
import type { Dependances, MagasinConnexions } from './routes'
import type { LigneConnexion } from './etat'

const COLONNES = 'id, artisan_id, fournisseur, compte_affiche, portees, etat, motif_erreur, verifiee_le, derniere_synchro, expire_le, retiree_le, secret_app, secret_n8n'

const magasin: MagasinConnexions = {
  async lire(id, artisanId) {
    const { data, error } = await supabaseAdmin.from('connexions').select(COLONNES).eq('id', id).eq('artisan_id', artisanId).maybeSingle()
    if (error) { console.error('[connexions] lecture :', error.code); return null }
    return (data as LigneConnexion | null) ?? null
  },
  async vivantes(artisanId, fournisseur, compte) {
    let q = supabaseAdmin.from('connexions').select(COLONNES).eq('artisan_id', artisanId).neq('etat', 'retiree')
    if (fournisseur) q = q.eq('fournisseur', fournisseur)
    q = compte ? q.eq('compte_affiche', compte) : q.is('compte_affiche', null)
    const { data, error } = await q
    // Jamais une liste vide sur erreur : l'appelant s'arrête (routes.ts).
    if (error) { console.error('[connexions] vivantes :', error.code); throw new Error('lecture des connexions impossible') }
    return (data as LigneConnexion[] | null) ?? []
  },
  async inserer(l) {
    // Jamais le message d'erreur complet : un détail de contrainte recopie la ligne (0193, connexions_coherence).
    const { error } = await supabaseAdmin.from('connexions').insert({ ...l, acteur_id: l.artisan_id })
    if (error) { console.error('[connexions] insertion refusée :', error.code); return false }
    return true
  },
  async maj(id, artisanId, patch) {
    const { error } = await supabaseAdmin.from('connexions').update(patch).eq('id', id).eq('artisan_id', artisanId)
    if (error) { console.error('[connexions] mise à jour refusée :', error.code); return false }
    return true
  },
}

export function dependancesReelles(): Dependances {
  return {
    drapeauLeve: () => actif('connexions'),
    session: async (req) => {
      const s = await authArtisan(req)
      return estEchec(s) ? { statut: s.status, erreur: s.error } : { uid: s.uid, iat: s.iat }
    },
    // Les deux verrous d'authArtisan, relus au retour de Google (il n'y a pas de Bearer) : suspension, déconnexion de partout.
    compteValide: async (uid, iatSession) => {
      const [{ data, error }, suspension] = await Promise.all([
        supabaseAdmin.from('artisans').select('sessions_invalides_avant').eq('id', uid).maybeSingle(),
        suspensionEnCours(uid),
      ])
      if (error || !data || suspension) return false
      const seuil = data.sessions_invalides_avant ? Math.floor(new Date(data.sessions_invalides_avant as string).getTime() / 1000) : 0
      return !(seuil && iatSession < seuil)
    },
    planDe: async (uid) => {
      const { data, error } = await supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', uid).maybeSingle()
      if (error) return null
      // Un fondateur compte comme Business, comme partout ailleurs (lib/accesOffreServeur.ts).
      return { plan: data?.is_founder ? 'business' : ((data?.plan as string | null | undefined) ?? null) }
    },
    peut,
    magasin,
    env: process.env,
    fetch: (...a) => fetch(...a),
    maintenant: () => Date.now(),
  }
}
