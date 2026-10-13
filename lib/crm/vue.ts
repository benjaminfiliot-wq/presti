// CRM — l'assemblage de ce que les écrans affichent, à partir des LIGNES d'un compte. Module pur, sans base ni réseau :
//   • construireVue          → GET /api/crm/vue (tableau de bord, pipeline, chantiers, clients, atelier) ;
//   • construireFicheChantier → GET /api/crm/chantiers/[id] ;
//   • construireFicheClient   → GET /api/crm/clients?ref=… .
// Les routes lui donnent les vraies lignes lues pour la session ; l'atelier d'EXEMPLE (lib/crm/exemple.ts) lui donne ses
// lignes fictives. Même calcul, même écriture (« deux chiffres, un écran ») : l'exemple ne peut pas montrer un chiffre que
// le vrai CRM ne saurait pas calculer, et ses vues restent cohérentes entre elles (mêmes chantiers, clients, montants).
import { cartes, etapeDevis, pipeline, type DeplacementP, type EtapeOuClasse, type Pipeline } from './pipeline.ts'
import { assemblerAtelier, type DonneesAtelier, type MembreA, type VehiculeA } from './atelier.ts'
import { calculerTableauCrm, type TableauCrm } from './tableau.ts'
import { actionsChantier, avancement, joursDeRetard, messageNotification, type ActionsChantier } from './chantier.ts'
import { regrouperClients, type ClientCarnet, type GroupeClient } from './clients.ts'
import { facturesComptees, jourParis, type FacturePresti } from '../comptaTableau.ts'

type Nb = number | string | null
// ── Les lignes (colonnes de lib/crm/serveur.ts COLONNES) ─────────────────────────────────────────────────────────────
export type DevisLigne = {
  id: string; artisan_id: string; lead_id: string | null; statut: string | null; numero: string | null; objet: string | null
  client_nom: string | null; client_email: string | null; client_adresse: string | null; total_ttc: Nb; acompte_pct: Nb
  date_emission: string | null; envoye_le: string | null; accepte_le: string | null; created_at: string | null; validite_jours: number | null
}
export type FactureLigne = FacturePresti & { id: string; artisan_id: string; devis_id: string | null; numero: string | null; statut: string | null; total_ttc: Nb; avoir_de: string | null; date_emission: string | null; date_echeance: string | null; client_nom: string | null; client_email?: string | null; acompte_pct?: Nb }
export type LeadLigne = { id: string; artisan_id: string; statut: string | null; nom_prospect: string | null; contact: string | null; canal: string | null; type_chantier: string | null; ville: string | null; created_at: string | null }
export type ChantierLigne = {
  id: string; artisan_id: string; devis_id: string | null; client_nom: string | null; titre: string; adresse: string | null; code_postal: string | null; ville: string | null
  statut: string; date_debut: string | null; date_fin_prevue: string | null; date_fin_reelle: string | null; vehicule_id: string | null; notes: string | null; cree_le: string; maj_le: string
}
export type MateriauLigne = {
  id: string; artisan_id: string; nom: string; unite: string | null; categorie: string | null; seuil_alerte: Nb; fournisseur_prefere: string | null
  prix_vu_ht: Nb; prix_vu_le: string | null; stock: { lieu: string; quantite: Nb }[] | null; fournisseur: { nom: string | null; contact: string | null } | null
}
export type DossiersCrm = {
  devis: readonly DevisLigne[]; factures: readonly FactureLigne[]; leads: readonly LeadLigne[]; chantiers: readonly ChantierLigne[]
  taches: readonly { chantier_id: string; faite: boolean | null }[]; materiaux: readonly MateriauLigne[]
  deplacements: readonly (DeplacementP & { artisan_id?: string | null })[]; carnet: readonly ClientCarnet[]
  vehicules: readonly VehiculeA[]; membres: readonly MembreA[]; equipe: readonly { chantier_id: string; membre_id: string }[]
  tronque: boolean
}

// ── Ce que les écrans reçoivent ─────────────────────────────────────────────────────────────────────────────────────────
export type ChantierListe = {
  id: string; titre: string; statut: string; date_debut: string | null; date_fin_prevue: string | null
  client: string | null; devis_numero: string | null
  adresse: string | null
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

/** L'adresse d'un chantier, telle qu'elle se tape dans un GPS : celle du chantier, sinon celle du devis. */
export const adresseChantier = (c: { adresse: string | null; code_postal: string | null; ville: string | null }, devisAdresse?: string | null): string | null =>
  [c.adresse, [c.code_postal, c.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') || devisAdresse || null

export function construireVue(p: { uid: string; metier: string | null; d: DossiersCrm; maintenant: Date; idDe: (cle: string) => string }): Vue {
  const { uid, d, maintenant } = p
  const jour = jourParis(maintenant)
  const tachesPar = new Map<string, { faite: boolean | null }[]>()
  for (const t of d.taches) tachesPar.set(t.chantier_id, [...(tachesPar.get(t.chantier_id) ?? []), t])
  const devisParId = new Map(d.devis.map((x) => [x.id, x]))
  const entreesPipeline = { artisanId: uid, leads: d.leads, devis: d.devis, factures: d.factures, chantiers: d.chantiers, deplacements: d.deplacements }
  const chantierParDevis = new Set(d.chantiers.map((c) => c.devis_id).filter(Boolean))
  return {
    maintenant: maintenant.toISOString(),
    tronque: d.tronque,
    pipeline: pipeline(entreesPipeline),
    // La maquette de l'atelier (J3) : les mêmes lignes, mises en scène par lib/crm/atelier.ts.
    atelier: assemblerAtelier({ jour, metier: p.metier, chantiers: d.chantiers, cartes: cartes(entreesPipeline), taches: d.taches, equipe: d.equipe, materiaux: d.materiaux, vehicules: d.vehicules, membres: d.membres }),
    tableau: calculerTableauCrm({ artisanId: uid, devis: d.devis, factures: d.factures, demandes: d.leads, chantiers: d.chantiers, materiaux: d.materiaux, maintenant }),
    chantiers: d.chantiers.map((c) => {
      const dv = c.devis_id ? devisParId.get(c.devis_id) : undefined
      return {
        id: c.id, titre: c.titre, statut: c.statut, date_debut: c.date_debut, date_fin_prevue: c.date_fin_prevue,
        client: dv?.client_nom ?? c.client_nom ?? null, devis_numero: dv?.numero ?? null, adresse: adresseChantier(c, dv?.client_adresse),
        avancement: avancement(tachesPar.get(c.id) ?? []), retard: joursDeRetard(c, jour),
      }
    }),
    // Les devis signés qui n'ont pas encore de chantier : ce que « Créer un chantier » propose.
    devisSignesSansChantier: d.devis
      .filter((x) => x.statut === 'accepte' && !chantierParDevis.has(x.id))
      .map((x) => ({ id: x.id, numero: x.numero, objet: x.objet, client_nom: x.client_nom, total_ttc: x.total_ttc, accepte_le: x.accepte_le })),
    clients: regrouperClients({ artisanId: uid, devis: d.devis, factures: d.factures, leads: d.leads, chantiers: d.chantiers, carnet: d.carnet, idDe: p.idDe })
      .map((c) => ({ id: c.id, nom: c.nom, email: c.email, telephone: c.telephone, demandes: c.leads.length, devis: c.devis.length, factures: c.factures.length, chantiers: c.chantiers.length, derniere: c.derniere })),
  }
}

// ── La fiche chantier ───────────────────────────────────────────────────────────────────────────────────────────────────
export type TacheFiche = { id: string; libelle: string; quantite: number | null; unite: string | null; ordre: number; faite: boolean; faite_le: string | null; membre_id: string | null; devis_ligne_id: string | null }
export type ReservationFiche = { id: string; materiau_id: string; quantite: number; lieu: string; statut: string; sorti_le: string | null; note: string | null; materiau: { id: string; nom: string; unite: string } | null }
export type EntreeJournal = { id: string; objet: string; champ: string; de: string | null; vers: string | null; origine: string; etape_derivee: string | null; note: string | null; cree_le: string }
export type NoteCrm = { id: string; texte: string; cree_le: string }
export type DevisFiche = { id: string; numero: string | null; objet: string | null; statut: string | null; total_ttc: number | null; acompte_pct: number | null; accepte_le: string | null; envoye_le?: string | null; client_nom: string | null; client_email: string | null; client_adresse: string | null; lead_id: string | null }
export type FactureFiche = { id: string; artisan_id?: string; devis_id?: string | null; numero: string | null; statut: string | null; total_ttc: number | null; avoir_de?: string | null; date_emission: string | null; acompte_pct: number | null }
export type FicheChantier = {
  chantier: { id: string; titre: string; statut: string; client_nom: string | null; adresse: string | null; code_postal: string | null; ville: string | null; date_debut: string | null; date_fin_prevue: string | null; date_fin_reelle: string | null; vehicule_id: string | null; notes: string | null; devis_id: string | null }
  devis: DevisFiche | null
  factures: (FactureFiche & { comptee: boolean })[]
  etape: EtapeOuClasse | null
  taches: TacheFiche[]
  avancement: { pct: number | null; faites: number; total: number }
  retard: number | null
  equipe: { id: string; nom: string; role: string }[]
  vehicule: { id: string; nom: string; immatriculation: string | null } | null
  materiaux: ReservationFiche[]
  notes: NoteCrm[]
  journal: EntreeJournal[]
  actions: ActionsChantier
  notificationPreparee: string
}

export function construireFicheChantier(p: {
  uid: string; chantier: FicheChantier['chantier']; devis: DevisFiche | null; factures: readonly FactureFiche[]; leadStatut: string | null
  taches: TacheFiche[]; equipe: { id: string; nom: string; role: string }[]; vehicule: FicheChantier['vehicule']
  materiaux: ReservationFiche[]; notes: NoteCrm[]; journal: EntreeJournal[]; maintenant: Date
}): FicheChantier {
  const c = p.chantier, devis = p.devis
  const factures = p.factures.map((f) => ({ ...f, artisan_id: p.uid, devis_id: f.devis_id ?? devis?.id ?? null }))
  const comptees = facturesComptees(factures)
  const av = avancement(p.taches)
  return {
    chantier: c,
    devis,
    // Factures du devis : toutes (pour l'historique), avec celles qui COMPTENT marquées (ni annulée, ni avoir).
    factures: factures.map((f) => ({ ...f, comptee: comptees.some((x) => x.id === f.id) })),
    etape: devis ? etapeDevis({ ...devis, artisan_id: p.uid }, p.leadStatut && devis.lead_id ? { id: devis.lead_id, statut: p.leadStatut } : null, comptees, c).etape : null,
    taches: p.taches,
    avancement: av,
    retard: joursDeRetard(c, jourParis(p.maintenant)),
    equipe: p.equipe,
    vehicule: p.vehicule,
    materiaux: p.materiaux,
    notes: p.notes,
    journal: p.journal,
    actions: actionsChantier({ devis, factures, leadStatut: p.leadStatut }),
    notificationPreparee: messageNotification({ titre: c.titre, statut: c.statut, avancementPct: av.pct, dateDebut: c.date_debut, dateFinPrevue: c.date_fin_prevue }),
  }
}

// ── La fiche client 360° ────────────────────────────────────────────────────────────────────────────────────────────────
export type FicheClient = {
  client: { id: string; nom: string | null; email: string | null; telephone: string | null; adresse: string | null }
  demandes: { id: string; statut: string | null; type_chantier: string | null; canal: string | null; ville: string | null; created_at: string | null }[]
  devis: { id: string; numero: string | null; objet: string | null; statut: string | null; total_ttc: Nb; date_emission: string | null; accepte_le: string | null }[]
  factures: { id: string; numero: string | null; statut: string | null; total_ttc: Nb; date_emission: string | null; date_echeance: string | null; avoir_de: string | null }[]
  chantiers: { id: string; titre: string; statut: string; date_debut: string | null; date_fin_prevue: string | null }[]
  notes: NoteCrm[]
  prochainRendezVous: null
  prochainChantier: { id: string; titre: string; date_debut: string } | null
  signe: number | null
}

export function construireFicheClient(p: { groupe: GroupeClient; d: Pick<DossiersCrm, 'devis' | 'factures' | 'leads' | 'chantiers'>; notes: NoteCrm[]; maintenant: Date }): FicheClient {
  const c = p.groupe
  const dans = <T extends { id: string }>(l: readonly T[], ids: string[]) => l.filter((x) => ids.includes(x.id))
  const devis = dans(p.d.devis, c.devis)
  const factures = dans(p.d.factures, c.factures)
  const chantiers = dans(p.d.chantiers, c.chantiers)
  const leads = dans(p.d.leads, c.leads)
  const jour = jourParis(p.maintenant)
  const aVenir = chantiers
    .filter((x) => x.statut !== 'termine' && x.statut !== 'annule' && typeof x.date_debut === 'string' && x.date_debut >= jour)
    .sort((a, b) => String(a.date_debut).localeCompare(String(b.date_debut)))[0] ?? null
  return {
    client: { id: c.id, nom: c.nom, email: c.email, telephone: c.telephone, adresse: c.adresse },
    demandes: leads.map((l) => ({ id: l.id, statut: l.statut, type_chantier: l.type_chantier, canal: l.canal, ville: l.ville, created_at: l.created_at })),
    devis: devis.map((x) => ({ id: x.id, numero: x.numero, objet: x.objet, statut: x.statut, total_ttc: x.total_ttc, date_emission: x.date_emission, accepte_le: x.accepte_le })),
    factures: factures.map((x) => ({ id: x.id, numero: x.numero, statut: x.statut, total_ttc: x.total_ttc, date_emission: x.date_emission, date_echeance: x.date_echeance, avoir_de: x.avoir_de })),
    chantiers: chantiers.map((x) => ({ id: x.id, titre: x.titre, statut: x.statut, date_debut: x.date_debut, date_fin_prevue: x.date_fin_prevue })),
    notes: p.notes,
    // Il n'existe pas d'agenda de rendez-vous côté artisan (ops.rendez_vous est celui de Presti avec ses prospects) :
    // la case reste vide plutôt que d'inventer un rendez-vous. Le prochain DÉBUT de chantier est donné à part, pour ce qu'il est.
    prochainRendezVous: null,
    prochainChantier: aVenir && aVenir.date_debut ? { id: aVenir.id, titre: aVenir.titre, date_debut: aVenir.date_debut } : null,
    // Total des devis signés de ce client, en centimes ; null s'il n'a aucun devis (l'écran affiche « — »).
    signe: devis.length ? devis.filter((x) => x.statut === 'accepte').reduce((s, x) => s + Math.round(Number(x.total_ttc ?? 0) * 100), 0) : null,
  }
}
