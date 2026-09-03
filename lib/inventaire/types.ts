// Types partagés client/serveur de l'inventaire v2 (§8 F1 + F2).
// Vocabulaire : lib/inventaire/CONTEXT.md.

export type SourceObservation = 'recherche_ia' | 'saisie' | 'facture'
export type TypeFournisseur = 'negoce' | 'gsb' | 'fabricant' | 'marketplace'

export const TYPES_FOURNISSEUR: Record<TypeFournisseur, string> = {
  negoce: 'Négoce', gsb: 'Grande surface de bricolage', fabricant: 'Fabricant', marketplace: 'Marketplace',
}
export const SOURCES_OBSERVATION: Record<SourceObservation, string> = {
  recherche_ia: 'vu par l’assistant', saisie: 'saisi à la main', facture: 'lu sur une facture',
}

/** Un prix vu il y a plus de 30 jours est « à revérifier » (plan §8) : on le montre, on ne s'y fie plus. */
export const JOURS_REVERIFICATION = 30
export function aReverifier(vuLe: string | null | undefined, maintenant = Date.now()): boolean {
  if (!vuLe) return false
  const t = new Date(vuLe).getTime()
  return Number.isFinite(t) && maintenant - t > JOURS_REVERIFICATION * 86_400_000
}

export type Fournisseur = {
  id: string
  nom: string
  url: string | null
  type: TypeFournisseur
  numero_compte: string | null
  remise_pct: number | null
  delai_jours: number | null
  agence: string | null
  contact: string | null
  ordre: number
  prix_publics: boolean
  note_acces: string | null
}

export type Observation = {
  id: string
  materiau_id: string | null
  fournisseur_id: string | null
  fournisseur_nom: string | null
  designation_vue: string | null
  prix_ht: number | null
  prix_ttc: number | null
  unite: string | null
  url: string | null
  source: SourceObservation
  extrait: string | null
  disponibilite: string | null
  vu_le: string
  /** Calculé côté serveur : plus de 30 jours. */
  a_reverifier: boolean
}

export type LigneStock = { lieu: string; quantite: number }

/** La fiche complète d'un matériau, telle que renvoyée par /api/inventaire/materiaux. */
export type Materiau = {
  id: string
  nom: string
  marque: string | null
  /** Référence héritée (0040) : miroir de la référence fabricant, gardée pour l'ancien écran et le scan. */
  reference: string | null
  reference_fabricant: string | null
  reference_fournisseur: string | null
  categorie: string | null
  sous_categorie: string | null
  unite: string
  conditionnement: string | null
  code_barres: string | null
  photo_url: string | null
  fiche_technique_url: string | null
  fournisseur_id: string | null
  fournisseur_prefere: string | null
  prix_achat_ht: number | null
  prix_dernier_ht: number | null
  prix_vu_ht: number | null
  prix_vu_le: string | null
  prix_vu_url: string | null
  prix_vu_source: SourceObservation | null
  disponibilite_vue: string | null
  seuil_alerte: number
  notes: string | null
  tags: string[]
  chantiers_lies: string[]
  stock: LigneStock[]
  quantite_totale: number
  fournisseur: { id: string; nom: string } | null
}

/** Ce que le client envoie pour créer / mettre à jour une fiche (tout est facultatif sauf le nom). */
export type MateriauEntree = Partial<Omit<Materiau, 'id' | 'stock' | 'quantite_totale' | 'fournisseur' | 'prix_dernier_ht' | 'prix_vu_ht' | 'prix_vu_le' | 'prix_vu_url' | 'prix_vu_source'>> & { id?: string; nom: string }

/** Colonnes lues sur `materiaux` — une seule liste, partagée par les routes. */
export const COLONNES_MATERIAU =
  'id, nom, marque, reference, reference_fabricant, reference_fournisseur, categorie, sous_categorie, unite, conditionnement, code_barres, photo_url, fiche_technique_url, fournisseur_id, fournisseur_prefere, prix_achat_ht, prix_dernier_ht, prix_vu_ht, prix_vu_le, prix_vu_url, prix_vu_source, disponibilite_vue, seuil_alerte, notes, tags, chantiers_lies, stock(lieu, quantite), fournisseur:fournisseurs(id, nom)'

export const COLONNES_FOURNISSEUR = 'id, nom, url, type, numero_compte, remise_pct, delai_jours, agence, contact, ordre, prix_publics, note_acces'

export const COLONNES_OBSERVATION = 'id, materiau_id, fournisseur_id, fournisseur_nom, designation_vue, prix_ht, prix_ttc, unite, url, source, extrait, disponibilite, vu_le'
