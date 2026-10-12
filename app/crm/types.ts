// Les formes renvoyées par GET /api/crm/vue (app/api/crm/vue/route.ts). Types seulement : aucun code ne part au navigateur.
import type { Pipeline } from '@/lib/crm/pipeline'
import type { TableauCrm } from '@/lib/crm/tableau'
import type { DonneesAtelier } from '@/lib/crm/atelier'

export type ChantierListe = {
  id: string; titre: string; statut: string; date_debut: string | null; date_fin_prevue: string | null
  client: string | null; devis_numero: string | null
  avancement: { pct: number | null; faites: number; total: number }
  retard: number | null
}
export type DevisSigne = { id: string; numero: string | null; objet: string | null; client_nom: string | null; total_ttc: number | string | null; accepte_le: string | null }
export type ClientListe = { id: string; nom: string | null; email: string | null; telephone: string | null; demandes: number; devis: number; factures: number; chantiers: number; derniere: string | null }
export type Vue = {
  maintenant: string
  tronque: boolean
  pipeline: Pipeline
  tableau: TableauCrm
  chantiers: ChantierListe[]
  devisSignesSansChantier: DevisSigne[]
  clients: ClientListe[]
  atelier: DonneesAtelier
}
export type Membre = { id: string; nom: string; role: string; telephone: string | null; actif: boolean }
export type Vehicule = { id: string; nom: string; immatriculation: string | null; conducteur_id: string | null; controle_technique_le: string | null; entretien_le: string | null; notes: string | null; actif: boolean }
