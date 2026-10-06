// Jeu de données FICTIF pour la vitrine (landing) : il nourrit le vrai calcul (calculer.ts) et le vrai
// composant (app/chiffres/Tableau.tsx), pour que la scène « Vos chiffres » montre exactement l'écran
// livré, sans compte de démonstration en base et sans capture à reprendre. Aucune donnée réelle :
// les noms, montants et villes sont inventés, et la landing l'écrit sous la scène.
//
// Les dates sont RELATIVES au jour du rendu (mois courant, mois -1…) : l'exemple ne vieillit pas.
import { calculer, type Indicateurs, type LigneClient, type LigneDemande, type LigneDevis, type LigneFacture } from './calculer'

const ARTISAN = 'exemple-vitrine'

/** « YYYY-MM-DDT09:00:00Z » pour le jour `jour` du mois décalé de `decal` par rapport à `base`. */
function date(base: Date, decal: number, jour: number, heure = 9): string {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + decal, jour, heure, 0, 0))
  return d.toISOString()
}

/** Il y a `jours` jours, à partir de `base`. */
function ilYa(base: Date, jours: number, heures = 0): string {
  return new Date(base.getTime() - jours * 86_400_000 - heures * 3_600_000).toISOString()
}

export function indicateursExemple(maintenant: Date = new Date()): Indicateurs {
  const m = maintenant
  const f = (id: string, statut: string, decal: number, jour: number, total: number, echeance?: [number, number]): LigneFacture => ({
    id, artisan_id: ARTISAN, statut, date_emission: date(m, decal, jour).slice(0, 10), total_ttc: total,
    date_echeance: echeance ? date(m, echeance[0], echeance[1]).slice(0, 10) : null, devis_id: null, avoir_de: null,
  })
  const factures: LigneFacture[] = [
    f('f1', 'payee', 0, 1, 2480),
    f('f2', 'emise', 0, 1, 1760, [1, 1]),
    f('f3', 'payee', -1, 6, 1950),
    f('f4', 'payee', -1, 19, 2120),
    f('f5', 'payee', -2, 4, 3240),
    f('f6', 'emise', -2, 12, 890, [-1, 1]),
    f('f7', 'payee', -3, 9, 2650),
    f('f8', 'payee', -4, 3, 1980),
    f('f9', 'payee', -4, 22, 1340),
    f('f10', 'payee', -5, 15, 2900),
  ]

  // Devis : chacun rattaché à une demande, envoyé quelques heures après elle (le délai demande → devis).
  const devis: LigneDevis[] = []
  const demandes: LigneDemande[] = []
  const ajouterDevis = (id: string, statut: string, envoye: string, total: number, client: string, numero: string, heuresAvant: number) => {
    const lead = `l-${id}`
    demandes.push({ id: lead, artisan_id: ARTISAN, canal: 'site', statut: 'devis', created_at: new Date(new Date(envoye).getTime() - heuresAvant * 3_600_000).toISOString(), type_chantier: 'Escalier' })
    devis.push({ id, artisan_id: ARTISAN, numero, client_nom: client, statut, date_emission: envoye.slice(0, 10), total_ttc: total, envoye_le: envoye, accepte_le: statut === 'accepte' ? envoye : null, created_at: envoye, lead_id: lead, validite_jours: 90 })
  }
  ajouterDevis('d1', 'accepte', date(m, -5, 10), 2900, 'M. Garnier', 'D-2026-031', 6)
  ajouterDevis('d2', 'accepte', date(m, -4, 1), 1980, 'Mme Roux', 'D-2026-034', 3)
  ajouterDevis('d3', 'refuse', date(m, -4, 14), 4100, 'M. Fabre', 'D-2026-036', 9)
  ajouterDevis('d4', 'accepte', date(m, -3, 5), 2650, 'Mme Colin', 'D-2026-039', 4)
  ajouterDevis('d5', 'accepte', date(m, -2, 2), 3240, 'M. Perrin', 'D-2026-042', 5)
  ajouterDevis('d6', 'accepte', date(m, -1, 3), 1950, 'Mme Lemoine', 'D-2026-045', 2)
  ajouterDevis('d7', 'accepte', date(m, -1, 15), 2120, 'M. Barbier', 'D-2026-047', 7)
  ajouterDevis('d8', 'accepte', ilYa(m, 30), 2480, 'Mme Chevalier', 'D-2026-049', 3)
  ajouterDevis('d9', 'envoye', ilYa(m, 16), 3380, 'M. Mercier', 'D-2026-051', 5)
  ajouterDevis('d10', 'envoye', ilYa(m, 9), 1420, 'Mme Blanc', 'D-2026-052', 4)
  ajouterDevis('d11', 'envoye', ilYa(m, 2), 2760, 'M. Guerin', 'D-2026-054', 3)

  // Demandes sans devis : de quoi remplir les six mois, les canaux et les types de chantier.
  const canaux = ['site', 'formulaire', 'site', 'email', 'formulaire', 'site']
  const types = ['Escalier', 'Placard sur mesure', 'Cuisine', 'Parquet', 'Escalier', 'Placard sur mesure', 'Fenêtres']
  const parMois = [4, 5, 4, 6, 5, 3]
  let n = 0
  parMois.forEach((nb, k) => {
    const decal = k - 5
    for (let j = 0; j < nb; j++) {
      n++
      demandes.push({ id: `l${n}`, artisan_id: ARTISAN, canal: canaux[n % canaux.length], statut: 'nouveau', created_at: decal === 0 ? date(m, 0, 1, 7 + j) : date(m, decal, 2 + j * 4), type_chantier: types[n % types.length] })
    }
  })

  // Rennes et alentours : le même artisan fictif que le site de démonstration (Lestraque, menuisier).
  const villes = ['Rennes', 'Rennes', 'Cesson-Sévigné', 'Rennes', 'Saint-Grégoire', 'Cesson-Sévigné', 'Bruz', 'Pacé', 'Rennes']
  const clients: LigneClient[] = villes.map((ville, k) => ({ id: `c${k}`, artisan_id: ARTISAN, ville }))

  return calculer({ artisanId: ARTISAN, factures, devis, demandes, clients, maintenant })
}
