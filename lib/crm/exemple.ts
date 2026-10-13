// lib/crm/exemple.ts — l'atelier d'EXEMPLE : données FICTIVES (aucun client réel), affichées côté écran seulement, jamais
// écrites en base, jamais envoyées au serveur. C'est le SEUL fichier qui en contient (scripts/crm-qa.mjs, règle G10).
//
// Depuis le 13/10 (demande de Benj), l'exemple couvre TOUT le CRM : tableau de bord, pipeline, chantiers et fiche chantier,
// clients et fiche client, équipe, atelier. Pour que les vues restent cohérentes entre elles (mêmes chantiers, mêmes
// clients, mêmes montants), ce fichier ne contient que des LIGNES brutes, comme celles que lit lib/crm/serveur.ts ; tout ce
// qui s'affiche est calculé par lib/crm/vue.ts, exactement comme pour un vrai compte. Un plombier fictif, le 12/10/2026.
//
// Noms clairement fictifs (« Client fictif A », « Négoce fictif Nord »), adresses e-mail en .invalid (domaine qui ne peut
// exister), aucun téléphone, immatriculations AA-00x-AA.
import { construireFicheChantier, construireFicheClient, construireVue, type ChantierLigne, type DevisLigne, type DossiersCrm, type EntreeJournal, type FactureLigne, type FicheChantier, type FicheClient, type LeadLigne, type MateriauLigne, type Membre, type NoteCrm, type ReservationFiche, type TacheFiche, type Vehicule, type Vue } from './vue.ts'
import { regrouperClients, trouverGroupe } from './clients.ts'
import type { DonneesAtelier } from './atelier.ts'

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ART = ID(999)
export const JOUR_EXEMPLE = '2026-10-12'
/** L'instant de l'exemple : le 12/10/2026, 10 h 30 à Paris. Tous ses chiffres sont calculés à cet instant. */
export const MAINTENANT_EXEMPLE = '2026-10-12T08:30:00.000Z'
const T = (jour: string, heure = '09:00') => `${jour}T${heure}:00.000Z`

/** Un identifiant de client (64 hex) stable, sans secret : l'exemple n'a rien à protéger. */
function idExemple(cle: string): string {
  let sortie = ''
  for (let k = 0; k < 8; k++) {
    let h = (2166136261 ^ (k * 16777619)) >>> 0
    for (let i = 0; i < cle.length; i++) { h ^= cle.charCodeAt(i); h = Math.imul(h, 16777619) }
    sortie += (h >>> 0).toString(16).padStart(8, '0')
  }
  return sortie
}

// ── L'équipe et les véhicules ───────────────────────────────────────────────────────────────────────────────────────────
const MEMBRES: Membre[] = [
  { id: ID(201), nom: 'Artisan fictif', role: 'artisan', telephone: null, actif: true },
  { id: ID(202), nom: 'Compagnon 1', role: 'compagnon', telephone: null, actif: true },
  { id: ID(203), nom: 'Compagnon 2', role: 'compagnon', telephone: null, actif: true },
  { id: ID(204), nom: 'Apprenti 1', role: 'apprenti', telephone: null, actif: true },
  { id: ID(205), nom: 'Compagnon 3', role: 'compagnon', telephone: null, actif: true },
  { id: ID(206), nom: 'Apprenti 2', role: 'apprenti', telephone: null, actif: true },
]
const VEHICULES: Vehicule[] = [
  { id: ID(101), nom: 'Camionnette 1', immatriculation: 'AA-001-AA', conducteur_id: ID(201), controle_technique_le: '2027-03-01', entretien_le: '2026-11-15', notes: null, actif: true },
  { id: ID(102), nom: 'Camionnette 2', immatriculation: 'AA-002-AA', conducteur_id: ID(203), controle_technique_le: '2026-10-01', entretien_le: null, notes: null, actif: true },
  { id: ID(103), nom: 'Fourgon', immatriculation: 'AA-003-AA', conducteur_id: ID(205), controle_technique_le: null, entretien_le: null, notes: null, actif: true },
  { id: ID(104), nom: 'Utilitaire', immatriculation: 'AA-004-AA', conducteur_id: null, controle_technique_le: null, entretien_le: null, notes: null, actif: true },
]

// ── L'inventaire ────────────────────────────────────────────────────────────────────────────────────────────────────────
const NORD = { nom: 'Négoce fictif Nord', contact: 'commandes@negoce-fictif.invalid' }
const SUD = { nom: 'Grossiste fictif Sud', contact: null }
const mat = (id: number, nom: string, unite: string, categorie: string, reste: number, seuil: number, fournisseur: { nom: string; contact: string | null } | null, prix: number | null = null, prixLe: string | null = null): MateriauLigne =>
  ({ id: ID(id), artisan_id: ART, nom, unite, categorie, seuil_alerte: seuil, fournisseur_prefere: null, prix_vu_ht: prix, prix_vu_le: prixLe, stock: [{ lieu: 'atelier', quantite: reste }], fournisseur })
const MATERIAUX: MateriauLigne[] = [
  mat(300, 'Raccord laiton 20/27', 'u', 'Raccords', 4, 10, NORD, 1.9, '2026-10-02'),
  mat(301, 'Raccord PER 16', 'u', 'Raccords', 30, 10, NORD, 0.8, '2026-08-20'),
  mat(302, 'Coude cuivre 22', 'u', 'Raccords', 12, 5, NORD, 2.4, '2026-10-05'),
  mat(303, 'Manchon 32', 'u', 'Raccords', 2, 4, NORD, 1.1, '2026-10-05'),
  mat(304, 'Té égal 16', 'u', 'Raccords', 18, 0, NORD),
  mat(310, 'Tube cuivre 14', 'm', 'Tubes', 40, 20, NORD),
  mat(311, 'Tube PER 16', 'm', 'Tubes', 6, 25, NORD),
  mat(312, 'Tube PVC 100', 'm', 'Tubes', 25, 10, NORD),
  mat(320, 'Mitigeur lavabo', 'u', 'Robinetterie', 3, 2, SUD, 48, '2026-09-01'),
  mat(321, 'Mitigeur douche', 'u', 'Robinetterie', 1, 2, SUD, 79, '2026-09-01'),
  mat(322, 'Siphon', 'u', 'Robinetterie', 8, 3, SUD, 6.5, '2026-09-01'),
  mat(330, 'Joint fibre', 'u', 'Consommables', 60, 20, null),
  mat(331, 'Téflon', 'u', 'Consommables', 9, 5, null),
  mat(332, 'Pâte à joint', 'u', 'Consommables', 4, 2, null),
  mat(340, 'Collier 32', 'boîte', 'Fixations', 5, 2, SUD),
  mat(341, 'Cheville 8', 'boîte', 'Fixations', 2, 3, SUD),
  mat(350, 'Groupe de sécurité', 'u', 'Sécurité', 3, 1, null),
  mat(351, 'Réducteur de pression', 'u', 'Sécurité', 2, 1, null),
  mat(360, 'Chauffe-eau 200 L', 'u', 'Appareils', 1, 1, SUD, 389, '2026-10-08'),
  mat(361, 'Pompe de relevage', 'u', 'Appareils', 2, 0, null),
  mat(370, 'Gants', 'paire', 'Outillage', 12, 4, null),
]

// ── Les demandes, devis et factures ─────────────────────────────────────────────────────────────────────────────────────
const lead = (n: number, type: string, nom: string | null, statut: string, cree: string, contact: string | null = null): LeadLigne =>
  ({ id: ID(n), artisan_id: ART, statut, nom_prospect: nom, contact, canal: 'page', type_chantier: type, ville: 'Ville fictive', created_at: cree })
const LEADS: LeadLigne[] = [
  lead(401, 'Fuite sous évier', 'Prospect fictif 1', 'nouveau', T('2026-10-12', '06:40'), 'prospect-1@exemple.invalid'),
  lead(402, 'Remplacement WC', 'Prospect fictif 2', 'nouveau', T('2026-10-12', '07:55'), 'prospect-2@exemple.invalid'),
  lead(403, 'Salle d’eau', 'Prospect fictif 3', 'en_discussion', T('2026-10-08', '14:00'), 'prospect-3@exemple.invalid'),
  lead(404, 'Chauffe-eau en panne', 'Prospect fictif 4', 'en_discussion', T('2026-10-10', '15:20'), 'prospect-4@exemple.invalid'),
  lead(405, 'Robinet qui goutte', null, 'nouveau', T('2026-10-09')),
  lead(406, 'Ballon d’eau chaude', 'Prospect fictif 6', 'repondu', T('2026-10-11', '17:10'), 'prospect-6@exemple.invalid'),
  lead(410, 'Salle de bain', 'Client fictif A', 'gagne', T('2026-09-12'), 'client-a@exemple.invalid'),
]
const devis = (n: number, numero: number, objet: string, client: string, statut: string, ttc: number, cree: string, envoye: string | null, accepte: string | null, extra: Partial<DevisLigne> = {}): DevisLigne => ({
  id: ID(n), artisan_id: ART, lead_id: null, statut, numero: `EX-2026-${String(numero).padStart(3, '0')}`, objet, client_nom: client,
  client_email: `${client.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}@exemple.invalid`,
  client_adresse: 'Rue de l’Exemple, 00000 Ville fictive', total_ttc: ttc, acompte_pct: 0, date_emission: cree.slice(0, 10),
  envoye_le: envoye ? T(envoye) : null, accepte_le: accepte ? T(accepte) : null, created_at: T(cree), validite_jours: 30, ...extra,
})
const DEVIS: DevisLigne[] = [
  devis(501, 1, 'Salle de bain, étage', 'Client fictif A', 'accepte', 8400, '2026-09-14', '2026-09-15', '2026-09-25', { acompte_pct: 30, lead_id: ID(410), client_email: 'client-a@exemple.invalid' }),
  devis(502, 2, 'Cuisine ouverte', 'Client fictif B', 'accepte', 6200, '2026-09-02', '2026-09-03', '2026-09-15'),
  devis(503, 3, 'Chauffe-eau', 'Client fictif C', 'accepte', 1450, '2026-09-26', '2026-09-27', '2026-09-29'),
  devis(504, 4, 'Réseau d’évacuation', 'Client fictif D', 'accepte', 3900, '2026-10-01', '2026-10-02', '2026-10-06'),
  devis(505, 5, 'Douche à l’italienne', 'Client fictif E', 'accepte', 4700, '2026-10-03', '2026-10-04', '2026-10-09'),
  devis(506, 6, 'Rénovation sanitaires', 'Client fictif F', 'accepte', 5300, '2026-09-20', '2026-09-21', '2026-09-30'),
  devis(507, 7, 'Mise aux normes gaz', 'Client fictif G', 'accepte', 2100, '2026-09-01', '2026-09-02', '2026-09-10'),
  devis(508, 8, 'Colonne d’immeuble', 'Copropriété fictive H', 'accepte', 18600, '2026-08-20', '2026-08-21', '2026-09-01', { acompte_pct: 30 }),
  devis(509, 9, 'Radiateurs, séjour', 'Client fictif I', 'accepte', 1900, '2026-10-05', '2026-10-06', '2026-10-08'),
  devis(510, 10, 'Remplacement robinetterie', 'Client fictif K', 'accepte', 980, '2026-08-10', '2026-08-11', '2026-08-20'),
  devis(511, 11, 'Détartrage chauffe-eau', 'Client fictif L', 'accepte', 320, '2026-07-01', '2026-07-02', '2026-07-10'),
  // Deux brouillons pour le même client (v1 puis v2) : le pipeline n'en compte qu'un, le plus récent (recette du 12/10).
  devis(512, 12, 'Salle d’eau', 'Prospect fictif 3', 'brouillon', 3200, '2026-10-09', null, null, { lead_id: ID(403), client_email: 'prospect-3@exemple.invalid' }),
  devis(513, 13, 'Salle d’eau (version 2)', 'Prospect fictif 3', 'brouillon', 3450, '2026-10-11', null, null, { lead_id: ID(403), client_email: 'prospect-3@exemple.invalid' }),
  devis(514, 14, 'Adoucisseur', 'Client fictif M', 'envoye', 2600, '2026-09-27', '2026-09-28', null),
  devis(515, 15, 'WC suspendu', 'Client fictif N', 'envoye', 1250, '2026-10-07', '2026-10-08', null),
  devis(516, 16, 'Robinet extérieur', 'Client fictif O', 'refuse', 450, '2026-09-05', '2026-09-06', null),
  // Signé, pas encore de chantier : la colonne « Signé » et « Nouveau chantier → depuis un devis signé ».
  devis(517, 17, 'Mitigeur thermostatique', 'Client fictif P', 'accepte', 690, '2026-10-08', '2026-10-08', '2026-10-10'),
]
const facture = (n: number, numero: number, devisN: number, statut: string, ttc: number, emise: string, extra: Partial<FactureLigne> = {}): FactureLigne => {
  const d = DEVIS.find((x) => x.id === ID(devisN))!
  return { id: ID(n), artisan_id: ART, devis_id: d.id, numero: `EX-F-2026-${String(numero).padStart(3, '0')}`, statut, total_ttc: ttc, avoir_de: null, date_emission: emise, date_echeance: null, client_nom: d.client_nom, client_email: d.client_email, client_id: null, acompte_pct: 0, ...extra }
}
const FACTURES: FactureLigne[] = [
  facture(601, 1, 501, 'payee', 2520, '2026-09-26', { acompte_pct: 30 }),
  facture(602, 2, 507, 'emise', 2100, '2026-09-25', { date_echeance: '2026-10-25' }),
  facture(603, 3, 510, 'payee', 980, '2026-08-28'),
  facture(604, 4, 511, 'payee', 320, '2026-07-15'),
  facture(605, 5, 508, 'payee', 5580, '2026-09-03', { acompte_pct: 30 }),
]

// ── Les chantiers, leurs tâches, leur équipe ────────────────────────────────────────────────────────────────────────────
const chantier = (n: number, devisN: number | null, titre: string, statut: string, debut: string | null, fin: string | null, vehicule: number | null, extra: Partial<ChantierLigne> = {}): ChantierLigne => ({
  id: ID(n), artisan_id: ART, devis_id: devisN ? ID(devisN) : null, client_nom: null, titre, adresse: null, code_postal: null, ville: null, statut,
  date_debut: debut, date_fin_prevue: fin, date_fin_reelle: null, vehicule_id: vehicule ? ID(vehicule) : null, notes: null,
  // Créé au plus tard la veille du jour de l'exemple : un chantier planifié pour demain n'a pas été créé demain.
  cree_le: T(debut && debut < '2026-10-11' ? debut : '2026-10-11'), maj_le: T('2026-10-11'), ...extra,
})
const CHANTIERS: ChantierLigne[] = [
  chantier(1, 501, 'Salle de bain, étage', 'en_cours', '2026-10-05', '2026-10-16', 101, { cree_le: T('2026-09-26') }),
  chantier(2, 502, 'Cuisine ouverte', 'en_cours', '2026-09-28', '2026-10-08', 102),
  chantier(3, 503, 'Chauffe-eau', 'termine', '2026-10-01', '2026-10-02', null, { date_fin_reelle: '2026-10-02' }),
  chantier(4, 504, 'Réseau d’évacuation', 'planifie', '2026-10-19', '2026-10-23', null),
  chantier(5, 505, 'Douche à l’italienne', 'a_planifier', null, null, null),
  chantier(6, 506, 'Rénovation sanitaires', 'en_cours', '2026-10-07', '2026-10-10', 103),
  chantier(7, 507, 'Mise aux normes gaz', 'termine', '2026-09-20', '2026-09-24', null, { date_fin_reelle: '2026-09-24' }),
  chantier(8, 508, 'Colonne d’immeuble', 'en_pause', '2026-09-15', '2026-11-15', null),
  chantier(9, 509, 'Radiateurs, séjour', 'planifie', '2026-10-12', '2026-10-13', 104),
  chantier(10, null, 'Fuite sous dalle', 'a_planifier', null, null, null, { client_nom: 'Client fictif J', adresse: 'Impasse de l’Exemple', code_postal: '00000', ville: 'Ville fictive' }),
]
const EQUIPE: { chantier_id: string; membre_id: string }[] = [
  [1, 201], [1, 202], [2, 203], [4, 204], [6, 205], [9, 206],
].map(([c, m]) => ({ chantier_id: ID(c), membre_id: ID(m) }))
const LISTES_TACHES: Record<number, [string, boolean, number | null][]> = {
  1: [['Dépose de l’ancienne baignoire', true, 202], ['Alimentations en PER', true, 202], ['Évacuations', true, 201], ['Pose du receveur et de la paroi', false, 202], ['Raccordement des mitigeurs', false, null]],
  2: [['Dépose de l’évier', true, 203], ['Alimentations de la cuisine', false, 203], ['Évacuation du lave-vaisselle', false, null], ['Raccordement final', false, null]],
  3: [['Dépose de l’ancien chauffe-eau', true, null], ['Pose du chauffe-eau 200 L et du groupe de sécurité', true, null]],
  4: [['Ouverture de la tranchée', false, 204], ['Pose du PVC 100', false, null], ['Raccordement au regard', false, null]],
  6: [['Dépose des sanitaires', true, 205], ['Alimentations', true, 205], ['Évacuations', true, 205], ['Pose des sanitaires', true, 205], ['Essais et finitions', false, 205]],
  7: [['Mise en conformité de l’arrivée', true, null], ['Remplacement du robinet de coupure', true, null], ['Essai d’étanchéité', true, null]],
  8: [['Repérage des colonnes', true, null], ['Coupure et vidange', true, null], ['Remplacement colonne A', false, null], ['Remplacement colonne B', false, null], ['Remise en eau', false, null]],
  9: [['Dépose des anciens radiateurs', false, 206], ['Pose et raccordement', false, 206]],
}
const TACHES: (TacheFiche & { chantier_id: string })[] = Object.entries(LISTES_TACHES).flatMap(([c, liste]) =>
  liste.map(([libelle, faite, membre], i) => ({
    id: ID(1000 + Number(c) * 20 + i), chantier_id: ID(Number(c)), libelle, quantite: null, unite: null, ordre: i, faite,
    faite_le: faite ? T('2026-10-08') : null, membre_id: membre ? ID(membre) : null, devis_ligne_id: null,
  })))
const RESERVATIONS: (ReservationFiche & { chantier_id: string })[] = [
  { id: ID(701), chantier_id: ID(1), materiau_id: ID(321), quantite: 1, lieu: 'atelier', statut: 'reserve', sorti_le: null, note: null, materiau: { id: ID(321), nom: 'Mitigeur douche', unite: 'u' } },
  { id: ID(702), chantier_id: ID(1), materiau_id: ID(301), quantite: 10, lieu: 'atelier', statut: 'sorti', sorti_le: T('2026-10-06'), note: null, materiau: { id: ID(301), nom: 'Raccord PER 16', unite: 'u' } },
  { id: ID(703), chantier_id: ID(2), materiau_id: ID(322), quantite: 1, lieu: 'atelier', statut: 'reserve', sorti_le: null, note: null, materiau: { id: ID(322), nom: 'Siphon', unite: 'u' } },
]
const NOTES_CHANTIER: (NoteCrm & { chantier_id: string })[] = [
  { id: ID(801), chantier_id: ID(1), texte: 'Accès par la cour ; prévenir la veille de l’arrivée du camion.', cree_le: T('2026-10-04', '16:00') },
  { id: ID(802), chantier_id: ID(8), texte: 'Reprise après l’accord du syndic sur les dates de coupure d’eau.', cree_le: T('2026-10-01', '11:00') },
]
/** Les notes client, rangées par CLÉ de regroupement (lib/crm/clients.ts). */
const NOTES_CLIENT: Record<string, NoteCrm[]> = {
  'e:client-a@exemple.invalid': [{ id: ID(811), texte: 'Préfère être appelée après 17 h.', cree_le: T('2026-09-15', '18:00') }],
}
const journalDe = (c: ChantierLigne): EntreeJournal[] => {
  const e: EntreeJournal[] = [{ id: `${c.id}-j0`, objet: 'chantier', champ: 'creation', de: null, vers: 'a_planifier', origine: 'artisan', etape_derivee: null, note: null, cree_le: c.cree_le }]
  if (c.statut !== 'a_planifier') e.push({ id: `${c.id}-j1`, objet: 'chantier', champ: 'statut', de: 'a_planifier', vers: c.statut, origine: 'artisan', etape_derivee: null, note: null, cree_le: T(c.date_debut ?? '2026-10-10', '07:30') })
  for (const t of TACHES.filter((x) => x.chantier_id === c.id && x.faite)) e.push({ id: `${t.id}-j`, objet: 'tache', champ: 'faite', de: 'false', vers: 'true', origine: 'artisan', etape_derivee: null, note: t.libelle, cree_le: t.faite_le ?? c.maj_le })
  for (const r of RESERVATIONS.filter((x) => x.chantier_id === c.id && x.statut === 'sorti')) e.push({ id: `${r.id}-j`, objet: 'materiau', champ: 'sortie', de: 'reserve', vers: 'sorti', origine: 'artisan', etape_derivee: null, note: `${r.quantite} — ${r.lieu}`, cree_le: r.sorti_le ?? c.maj_le })
  return e.sort((a, b) => b.cree_le.localeCompare(a.cree_le))
}

// ── Assemblage : les mêmes fonctions que pour un vrai compte ────────────────────────────────────────────────────────────
const DOSSIERS: DossiersCrm = {
  devis: DEVIS, factures: FACTURES, leads: LEADS, chantiers: CHANTIERS,
  taches: TACHES.map((t) => ({ chantier_id: t.chantier_id, faite: t.faite })), materiaux: MATERIAUX, deplacements: [], carnet: [],
  vehicules: VEHICULES.map(({ notes: _n, ...v }) => v), membres: MEMBRES.map(({ telephone: _t, ...m }) => m), equipe: EQUIPE, tronque: false,
}
const maintenant = () => new Date(MAINTENANT_EXEMPLE)

/** Toute la vue du CRM d'exemple (tableau de bord, pipeline, chantiers, clients, atelier). */
export const VUE_EXEMPLE: Vue = construireVue({ uid: ART, metier: 'Plombier', d: DOSSIERS, maintenant: maintenant(), idDe: idExemple })
/** L'atelier d'exemple (maquette 3D / plan 2D) : celui de la vue, donc les mêmes chantiers que les autres onglets. */
export const DONNEES_EXEMPLE: DonneesAtelier = VUE_EXEMPLE.atelier
/** L'onglet Équipe & véhicules de l'exemple. */
export const EQUIPE_EXEMPLE: { membres: Membre[]; vehicules: Vehicule[] } = { membres: MEMBRES, vehicules: VEHICULES }
/** L'inventaire tel que la fiche chantier le lit (pour « Réserver un matériau »). */
export const INVENTAIRE_EXEMPLE = MATERIAUX.map((m) => ({ id: m.id, nom: m.nom, unite: m.unite ?? 'u', stock: (m.stock ?? []).map((s) => ({ lieu: s.lieu, quantite: Number(s.quantite) })), quantite_totale: (m.stock ?? []).reduce((s, l) => s + Number(l.quantite), 0) }))

/** La fiche d'un chantier de l'exemple, ou null si l'identifiant n'en est pas un. */
export function ficheChantierExemple(id: string): FicheChantier | null {
  const c = CHANTIERS.find((x) => x.id === id)
  if (!c) return null
  const d = c.devis_id ? DEVIS.find((x) => x.id === c.devis_id) ?? null : null
  const leadStatut = d?.lead_id ? LEADS.find((l) => l.id === d.lead_id)?.statut ?? null : null
  const vh = VEHICULES.find((v) => v.id === c.vehicule_id)
  return construireFicheChantier({
    uid: ART,
    chantier: { id: c.id, titre: c.titre, statut: c.statut, client_nom: c.client_nom, adresse: c.adresse, code_postal: c.code_postal, ville: c.ville, date_debut: c.date_debut, date_fin_prevue: c.date_fin_prevue, date_fin_reelle: c.date_fin_reelle, vehicule_id: c.vehicule_id, notes: c.notes, devis_id: c.devis_id },
    devis: d ? { id: d.id, numero: d.numero, objet: d.objet, statut: d.statut, total_ttc: Number(d.total_ttc), acompte_pct: Number(d.acompte_pct), accepte_le: d.accepte_le, envoye_le: d.envoye_le, client_nom: d.client_nom, client_email: d.client_email, client_adresse: d.client_adresse, lead_id: d.lead_id } : null,
    factures: d ? FACTURES.filter((f) => f.devis_id === d.id).map((f) => ({ id: f.id, devis_id: f.devis_id, numero: f.numero, statut: f.statut, total_ttc: Number(f.total_ttc), avoir_de: f.avoir_de, date_emission: f.date_emission, acompte_pct: Number(f.acompte_pct ?? 0) })) : [],
    leadStatut,
    taches: TACHES.filter((t) => t.chantier_id === c.id).map(({ chantier_id: _c, ...t }) => t),
    equipe: EQUIPE.filter((e) => e.chantier_id === c.id).map((e) => MEMBRES.find((m) => m.id === e.membre_id)!).map((m) => ({ id: m.id, nom: m.nom, role: m.role })),
    vehicule: vh ? { id: vh.id, nom: vh.nom, immatriculation: vh.immatriculation } : null,
    materiaux: RESERVATIONS.filter((r) => r.chantier_id === c.id).map(({ chantier_id: _c, ...r }) => r),
    notes: NOTES_CHANTIER.filter((n) => n.chantier_id === c.id).map(({ chantier_id: _c, ...n }) => n),
    journal: journalDe(c),
    maintenant: maintenant(),
  })
}

/** La fiche d'un client de l'exemple (par son identifiant ou une de ses pièces), ou null. */
export function ficheClientExemple(ref: string): FicheClient | null {
  const groupes = regrouperClients({ artisanId: ART, devis: DEVIS, factures: FACTURES, leads: LEADS, chantiers: CHANTIERS, idDe: idExemple })
  const g = trouverGroupe(groupes, ref)
  return g ? construireFicheClient({ groupe: g, d: DOSSIERS, notes: NOTES_CLIENT[g.cle] ?? [], maintenant: maintenant() }) : null
}
