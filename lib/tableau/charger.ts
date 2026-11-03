import type { SupabaseClient } from '@supabase/supabase-js'

// Toutes les lectures utilisent le jeton de la session artisan et les politiques RLS.
// Le filtre explicite protège aussi le compte fondateur, dont la RLS peut être élargie.
export type Ligne = Record<string, unknown>
export type DonneesTableau = Record<'artisans' | 'leads' | 'messages' | 'devis' | 'factures' | 'clients' | 'chantiers' | 'materiaux' | 'stock' | 'prix_artisan' | 'crm_rappels' | 'relances' | 'assistant_actions', Ligne[]>

const COLONNES: Record<keyof DonneesTableau, string> = {
  artisans: 'id, credits, credits_periode, credits_forfait_servi, credits_offerts',
  leads: 'id, artisan_id, statut, created_at',
  messages: 'id, lead_id, sens, sent_at, etat',
  devis: 'id, artisan_id, client_id, client_nom, statut, total_ttc, created_at, date_emission, envoye_le, accepte_le',
  factures: 'id, artisan_id, client_id, client_nom, statut, total_ttc, date_emission, date_echeance, payee_le, avoir_de',
  clients: 'id, artisan_id, nom, created_at',
  chantiers: 'id, artisan_id, titre, statut, date_debut, date_fin_prevue',
  materiaux: 'id, artisan_id, nom, seuil_alerte',
  stock: 'id, materiau_id, quantite',
  prix_artisan: 'id, artisan_id, designation, actif, maj_le',
  crm_rappels: 'id, artisan_id, type, echeance, heure, fait_le, envoye_le',
  relances: 'id, lead_id, planifiee_le, envoyee',
  assistant_actions: 'id, artisan_id, statut, mode, cree_le, titre',
}

async function toutesLesPages(client: SupabaseClient, table: keyof DonneesTableau, colonne: string, valeurs: string[], colonnes: string): Promise<Ligne[]> {
  const lignes: Ligne[] = []
  for (let debut = 0; ; debut += 500) {
    const { data, error } = await client.from(table).select(colonnes).in(colonne, valeurs).range(debut, debut + 499)
    if (error) throw new Error(`Lecture du tableau impossible : ${error.message}`)
    const page = (data ?? []) as unknown as Ligne[]
    lignes.push(...page)
    if (page.length < 500) return lignes
  }
}

async function filles(client: SupabaseClient, table: 'messages' | 'relances' | 'stock', colonne: string, ids: string[]): Promise<Ligne[]> {
  const resultat: Ligne[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const lot = ids.slice(i, i + 100)
    resultat.push(...await toutesLesPages(client, table, colonne, lot, COLONNES[table]))
  }
  return resultat
}

export async function chargerTableau(client: SupabaseClient, artisanId: string): Promise<DonneesTableau> {
  if (!artisanId) throw new Error('Session artisan absente.')
  const parents = ['artisans', 'leads', 'devis', 'factures', 'clients', 'chantiers', 'materiaux', 'prix_artisan', 'crm_rappels', 'assistant_actions'] as const
  const entrees = await Promise.all(parents.map(async (table) => [table, await toutesLesPages(client, table, table === 'artisans' ? 'id' : 'artisan_id', [artisanId], COLONNES[table])] as const))
  const base = Object.fromEntries(entrees) as Omit<DonneesTableau, 'messages' | 'relances' | 'stock'>
  const idsLeads = base.leads.map((l) => String(l.id))
  const idsMateriaux = base.materiaux.map((m) => String(m.id))
  const [messages, relances, stock] = await Promise.all([
    filles(client, 'messages', 'lead_id', idsLeads),
    filles(client, 'relances', 'lead_id', idsLeads),
    filles(client, 'stock', 'materiau_id', idsMateriaux),
  ])
  return { ...base, messages, relances, stock }
}
