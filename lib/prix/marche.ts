import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Poste, SourcePrix } from './types'
import { libelleSource } from './types'

// Ordres de grandeur du marché français, par métier (table `postes_types`).
//
// ⚠️ Ce ne sont PAS les prix de l'artisan, et le moteur de devis ne doit jamais les
// présenter comme tels. Le prompt les annonçait comme « la bibliothèque de CET artisan » :
// c'était faux, et c'est le genre d'imprécision qui produit un devis à l'air sourcé.

type Ligne = { designation: string; unite: string; prix_ht_min: number; prix_ht_max: number; tva_defaut: number }

const versPoste = (l: Ligne): Poste => {
  const min = Number(l.prix_ht_min), max = Number(l.prix_ht_max)
  const p: Poste = {
    designation: l.designation, unite: l.unite,
    prix_ht: Math.round(((min + max) / 2) * 100) / 100,
    prix_ht_min: min, prix_ht_max: max,
    tva_taux: Number(l.tva_defaut), source: 'marche', source_libelle: '', date_prix: null,
  }
  p.source_libelle = libelleSource(p)
  return p
}

export const sourceMarche: SourcePrix = {
  id: 'marche',

  async catalogue({ metier, limite = 60 }) {
    if (!metier) return []
    const { data } = await supabaseAdmin.from('postes_types')
      .select('designation, unite, prix_ht_min, prix_ht_max, tva_defaut')
      .eq('metier', metier).limit(limite)
    return ((data ?? []) as Ligne[]).map(versPoste)
  },

  async rechercher(q, { metier, limite = 20 }) {
    if (!metier || !q.trim()) return []
    const motif = `%${q.trim().replace(/[%_]/g, '').replace(/[\s-]+/g, '%')}%`
    const { data } = await supabaseAdmin.from('postes_types')
      .select('designation, unite, prix_ht_min, prix_ht_max, tva_defaut')
      .eq('metier', metier).ilike('designation', motif).limit(limite)
    return ((data ?? []) as Ligne[]).map(versPoste)
  },

  // Une table générique n'a pas de fraîcheur par artisan : on ne prétend pas le contraire.
  async fraicheur() { return null },
}
