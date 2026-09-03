import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Poste, SourcePrix } from './types'
import { libelleSource } from './types'

// Les prix DE L'ARTISAN (v4 §8/F2) — la seule source qui vaut vraiment quelque chose.
// Un prix négocié chez son fournisseur bat toujours une moyenne nationale.

type Ligne = {
  designation: string; unite: string; prix_ht: number; tva_taux: number
  fournisseur: string | null; reference: string | null; date_prix: string
}

const versPoste = (l: Ligne): Poste => {
  const p: Poste = {
    designation: l.designation, unite: l.unite, prix_ht: Number(l.prix_ht), tva_taux: Number(l.tva_taux),
    source: 'artisan', source_libelle: '', date_prix: l.date_prix,
    fournisseur: l.fournisseur, reference: l.reference,
  }
  p.source_libelle = libelleSource(p)
  return p
}

export const sourceArtisan: SourcePrix = {
  id: 'artisan',

  async catalogue({ artisanId, limite = 200 }) {
    if (!artisanId) return []
    const { data } = await supabaseAdmin.from('prix_artisan')
      .select('designation, unite, prix_ht, tva_taux, fournisseur, reference, date_prix')
      .eq('artisan_id', artisanId).eq('actif', true)
      .order('date_prix', { ascending: false }).limit(limite)
    return ((data ?? []) as Ligne[]).map(versPoste)
  },

  async rechercher(q, { artisanId, limite = 20 }) {
    if (!artisanId || !q.trim()) return []
    // `ilike` plutôt que la recherche plein texte : un artisan tape « chauffe eau »
    // ou « chauffe-eau », et on ne veut pas qu'il ne trouve rien pour un tiret.
    const motif = `%${q.trim().replace(/[%_]/g, '').replace(/[\s-]+/g, '%')}%`
    const { data } = await supabaseAdmin.from('prix_artisan')
      .select('designation, unite, prix_ht, tva_taux, fournisseur, reference, date_prix')
      .eq('artisan_id', artisanId).eq('actif', true)
      .ilike('designation', motif)
      .order('date_prix', { ascending: false }).limit(limite)
    return ((data ?? []) as Ligne[]).map(versPoste)
  },

  async fraicheur({ artisanId }) {
    if (!artisanId) return null
    const { data } = await supabaseAdmin.from('prix_artisan')
      .select('date_prix').eq('artisan_id', artisanId).eq('actif', true)
      .order('date_prix', { ascending: false }).limit(1).maybeSingle()
    return data?.date_prix ? new Date(data.date_prix) : null
  },
}
