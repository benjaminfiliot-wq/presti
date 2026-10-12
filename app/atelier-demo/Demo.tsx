'use client'

import '@/app/globals.css'
import '@/app/crm/crm.css'
import { useEffect, useState } from 'react'
import Atelier from '@/app/crm/atelier/Atelier'
import { PREREGLAGES, FILTRES, type DonneesAtelier, type Filtre, type Prereglage } from '@/lib/crm/atelier'
import type { NomVue } from '@/app/crm/atelier/Scene3D'

// Données FICTIVES de démonstration — jamais affichées à un artisan : cette page n'est servie qu'avec PRESTI_DEMO_ATELIER=1.
// Paramètres : ?metier=plombier&vue=ensemble|atelier|chantiers|dessus&filtre=retard&mode=3d|2d&mesure=1&vide=1
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const JOUR = '2026-10-12'
const FICTIF: DonneesAtelier = {
  jour: JOUR,
  metier: 'Plombier',
  chantiers: [
    { id: ID(1), titre: 'Salle de bain, étage', client: 'Client fictif A', statut: 'en_cours', etape: 'chantier', avancement: 60, date_debut: '2026-10-05', date_fin_prevue: '2026-10-16', vehicule_id: ID(101), equipe: [ID(201), ID(202)] },
    { id: ID(2), titre: 'Cuisine ouverte', client: 'Client fictif B', statut: 'en_cours', etape: 'chantier', avancement: 25, date_debut: '2026-09-28', date_fin_prevue: '2026-10-08', vehicule_id: ID(102), equipe: [ID(203)] },
    { id: ID(3), titre: 'Chauffe-eau', client: 'Client fictif C', statut: 'termine', etape: 'a_facturer', avancement: 100, date_debut: '2026-10-01', date_fin_prevue: '2026-10-02', vehicule_id: null, equipe: [] },
    { id: ID(4), titre: 'Réseau d’évacuation', client: 'Client fictif D', statut: 'planifie', etape: 'chantier', avancement: 0, date_debut: '2026-10-19', date_fin_prevue: '2026-10-23', vehicule_id: null, equipe: [ID(204)] },
    { id: ID(5), titre: 'Douche à l’italienne', client: 'Client fictif E', statut: 'a_planifier', etape: 'chantier', avancement: null, date_debut: null, date_fin_prevue: null, vehicule_id: null, equipe: [] },
    { id: ID(6), titre: 'Rénovation sanitaires', client: 'Client fictif F', statut: 'en_cours', etape: 'chantier', avancement: 80, date_debut: '2026-10-07', date_fin_prevue: '2026-10-10', vehicule_id: ID(103), equipe: [ID(205)] },
    { id: ID(7), titre: 'Mise aux normes gaz', client: 'Client fictif G', statut: 'termine', etape: 'a_facturer', avancement: 100, date_debut: '2026-09-20', date_fin_prevue: '2026-09-24', vehicule_id: null, equipe: [] },
    { id: ID(8), titre: 'Colonne d’immeuble', client: 'Copropriété fictive H', statut: 'en_pause', etape: 'chantier', avancement: 40, date_debut: '2026-09-15', date_fin_prevue: '2026-11-15', vehicule_id: null, equipe: [] },
    { id: ID(9), titre: 'Radiateurs, séjour', client: 'Client fictif I', statut: 'planifie', etape: 'chantier', avancement: 0, date_debut: '2026-10-12', date_fin_prevue: '2026-10-13', vehicule_id: ID(104), equipe: [ID(206)] },
    { id: ID(10), titre: 'Fuite sous dalle', client: 'Client fictif J', statut: 'a_planifier', etape: 'chantier', avancement: null, date_debut: null, date_fin_prevue: null, vehicule_id: null, equipe: [] },
  ],
  materiaux: [
    ...['Raccord laiton 20/27', 'Raccord PER 16', 'Coude cuivre 22', 'Manchon 32', 'Té égal 16'].map((nom, i) => ({ id: ID(300 + i), nom, unite: 'u', categorie: 'Raccords', reste: [4, 30, 12, 2, 18][i], seuil: [10, 10, 5, 4, 0][i], fournisseur: 'Négoce fictif Nord', fournisseur_contact: 'commandes@negoce-fictif.invalid', prix_vu_ht: [1.9, 0.8, 2.4, 1.1, null][i], prix_vu_le: ['2026-10-02', '2026-08-20', '2026-10-05', '2026-10-05', null][i] })),
    ...['Tube cuivre 14', 'Tube PER 16', 'Tube PVC 100'].map((nom, i) => ({ id: ID(310 + i), nom, unite: 'm', categorie: 'Tubes', reste: [40, 6, 25][i], seuil: [20, 25, 10][i], fournisseur: 'Négoce fictif Nord', fournisseur_contact: 'commandes@negoce-fictif.invalid', prix_vu_ht: null, prix_vu_le: null })),
    ...['Mitigeur lavabo', 'Mitigeur douche', 'Siphon'].map((nom, i) => ({ id: ID(320 + i), nom, unite: 'u', categorie: 'Robinetterie', reste: [3, 1, 8][i], seuil: [2, 2, 3][i], fournisseur: 'Grossiste fictif Sud', fournisseur_contact: null, prix_vu_ht: [48, 79, 6.5][i], prix_vu_le: '2026-09-01' })),
    ...['Joint fibre', 'Téflon', 'Pâte à joint'].map((nom, i) => ({ id: ID(330 + i), nom, unite: 'u', categorie: 'Consommables', reste: [60, 9, 4][i], seuil: [20, 5, 2][i], fournisseur: null, fournisseur_contact: null, prix_vu_ht: null, prix_vu_le: null })),
    ...['Collier 32', 'Cheville 8'].map((nom, i) => ({ id: ID(340 + i), nom, unite: 'boîte', categorie: 'Fixations', reste: [5, 2][i], seuil: [2, 3][i], fournisseur: 'Grossiste fictif Sud', fournisseur_contact: null, prix_vu_ht: null, prix_vu_le: null })),
    ...['Groupe de sécurité', 'Réducteur de pression'].map((nom, i) => ({ id: ID(350 + i), nom, unite: 'u', categorie: 'Sécurité', reste: [3, 2][i], seuil: [1, 1][i], fournisseur: null, fournisseur_contact: null, prix_vu_ht: null, prix_vu_le: null })),
    { id: ID(360), nom: 'Chauffe-eau 200 L', unite: 'u', categorie: 'Appareils', reste: 1, seuil: 1, fournisseur: 'Grossiste fictif Sud', fournisseur_contact: null, prix_vu_ht: 389, prix_vu_le: '2026-10-08' },
    { id: ID(361), nom: 'Pompe de relevage', unite: 'u', categorie: 'Appareils', reste: 2, seuil: 0, fournisseur: null, fournisseur_contact: null, prix_vu_ht: null, prix_vu_le: null },
    { id: ID(370), nom: 'Gants', unite: 'paire', categorie: 'Outillage', reste: 12, seuil: 4, fournisseur: null, fournisseur_contact: null, prix_vu_ht: null, prix_vu_le: null },
  ],
  vehicules: [
    { id: ID(101), nom: 'Camionnette 1', immatriculation: 'AA-001-AA', conducteur_id: ID(201), controle_technique_le: '2027-03-01', entretien_le: '2026-11-15', actif: true },
    { id: ID(102), nom: 'Camionnette 2', immatriculation: 'AA-002-AA', conducteur_id: ID(203), controle_technique_le: '2026-10-01', entretien_le: null, actif: true },
    { id: ID(103), nom: 'Fourgon', immatriculation: 'AA-003-AA', conducteur_id: ID(205), controle_technique_le: null, entretien_le: null, actif: true },
    { id: ID(104), nom: 'Utilitaire', immatriculation: 'AA-004-AA', conducteur_id: null, controle_technique_le: null, entretien_le: null, actif: true },
  ],
  membres: [
    { id: ID(201), nom: 'Artisan fictif', role: 'artisan', actif: true },
    { id: ID(202), nom: 'Compagnon 1', role: 'compagnon', actif: true },
    { id: ID(203), nom: 'Compagnon 2', role: 'compagnon', actif: true },
    { id: ID(204), nom: 'Apprenti 1', role: 'apprenti', actif: true },
    { id: ID(205), nom: 'Compagnon 3', role: 'compagnon', actif: true },
    { id: ID(206), nom: 'Apprenti 2', role: 'apprenti', actif: true },
  ],
  demandes: [
    { id: ID(401), titre: 'Fuite sous évier', client: 'Prospect fictif 1', recue_le: JOUR },
    { id: ID(402), titre: 'Remplacement WC', client: 'Prospect fictif 2', recue_le: JOUR },
    { id: ID(403), titre: 'Devis salle d’eau', client: 'Prospect fictif 3', recue_le: '2026-10-11' },
    { id: ID(404), titre: 'Chauffe-eau en panne', client: 'Prospect fictif 4', recue_le: '2026-10-10' },
    { id: ID(405), titre: 'Robinet qui goutte', client: null, recue_le: '2026-10-09' },
  ],
}
const VIDE: DonneesAtelier = { jour: JOUR, metier: null, chantiers: [], materiaux: [], vehicules: [], membres: [], demandes: [] }

export default function Demo() {
  const [p, setP] = useState<URLSearchParams | null>(null)
  useEffect(() => { setP(new URLSearchParams(window.location.search)) }, [])
  if (!p) return null
  const metier = (PREREGLAGES as readonly string[]).includes(p.get('metier') ?? '') ? (p.get('metier') as Prereglage) : undefined
  const vue = (['ensemble', 'atelier', 'chantiers', 'dessus'] as const).find((v) => v === p.get('vue'))
  const filtre = (FILTRES as readonly string[]).includes(p.get('filtre') ?? '') ? (p.get('filtre') as Filtre) : null
  const mode = p.get('mode') === '2d' ? '2d' : p.get('mode') === '3d' ? '3d' : undefined
  return (
    <main style={{ background: 'var(--paper)', minHeight: '100vh', padding: 16 }}>
      <p className="crm-note" style={{ marginBottom: 8 }}>Démonstration interne · données fictives · rien n’est lu ni écrit.</p>
      <Atelier donnees={p.get('vide') === '1' ? VIDE : FICTIF} demo mesure={p.get('mesure') === '1'} prereglageInitial={metier} vueInitiale={vue as NomVue | undefined} filtreInitial={filtre} forcer={mode} />
    </main>
  )
}
