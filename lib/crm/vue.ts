// CRM — l'assemblage de ce que les écrans affichent, à partir des LIGNES d'un compte. Module pur, sans base ni réseau :
//   • construireVue          → GET /api/crm/vue (tableau de bord, pipeline, chantiers, clients, atelier) ;
//   • construireFicheChantier → GET /api/crm/chantiers/[id] ;
//   • construireFicheClient   → GET /api/crm/clients?ref=… .
// Les routes lui donnent les vraies lignes lues pour la session ; l'atelier d'EXEMPLE (lib/crm/exemple.ts) lui donne ses
// lignes fictives. Même calcul, même écriture (« deux chiffres, un écran ») : l'exemple ne peut pas montrer un chiffre que
// le vrai CRM ne saurait pas calculer, et ses vues restent cohérentes entre elles (mêmes chantiers, clients, montants).
import { cartes, etapeDevis, frise, pipeline, type Carte, type DeplacementP, type EtapeOuClasse, type Frise, type Pipeline } from './pipeline.ts'
import { assemblerAtelier, type DonneesAtelier, type MembreA, type VehiculeA } from './atelier.ts'
import type { CommandeA } from './commandes.ts'
import { calculerTableauCrm, type TableauCrm } from './tableau.ts'
import { actionsChantier, avancement, indicateurs, joursDeRetard, messageNotification, type ActionsChantier, type Indicateurs } from './chantier.ts'
import { clesDesNotes, regrouperClients, type ClientCarnet, type GroupeClient } from './clients.ts'
import { aFaire, devisARelancer, habillerRappels, LIBELLES_RAPPEL, prochainRendezVous, rappelsDe, type TypeRappel, type AFaire, type DevisARelancer, type Rappel, type RappelLigne } from './rappels.ts'
import { chronologie, type EntreesChrono, type Evenement } from './chronologie.ts'
import { facturesComptees, jourParis, type FacturePresti } from '../comptaTableau.ts'
import { actif } from '../flags.ts'
import { facturesEmises, type FactureEmise } from './assistants.ts'
import { peutValider, typeDuChantier, type PointGeo, type TypeBat } from './carte.ts'

type Nb = number | string | null
// ── Les lignes (colonnes de lib/crm/serveur.ts COLONNES) ─────────────────────────────────────────────────────────────
export type DevisLigne = {
  id: string; artisan_id: string; lead_id: string | null; statut: string | null; numero: string | null; objet: string | null
  client_nom: string | null; client_email: string | null; client_adresse: string | null; total_ttc: Nb; acompte_pct: Nb
  date_emission: string | null; envoye_le: string | null; accepte_le: string | null; created_at: string | null; validite_jours: number | null
  /** HT du devis (colonne de 0002) : la base de la « marge sur matériaux, estimée » des indicateurs du chantier. */
  total_ht?: Nb
}
export type FactureLigne = FacturePresti & { id: string; artisan_id: string; devis_id: string | null; numero: string | null; statut: string | null; total_ttc: Nb; avoir_de: string | null; date_emission: string | null; date_echeance: string | null; client_nom: string | null; client_email?: string | null; acompte_pct?: Nb; objet?: string | null }
export type LeadLigne = { id: string; artisan_id: string; statut: string | null; nom_prospect: string | null; contact: string | null; canal: string | null; type_chantier: string | null; ville: string | null; created_at: string | null }
export type ChantierLigne = {
  id: string; artisan_id: string; devis_id: string | null; client_nom: string | null; titre: string; adresse: string | null; code_postal: string | null; ville: string | null
  statut: string; date_debut: string | null; date_fin_prevue: string | null; date_fin_reelle: string | null; vehicule_id: string | null; notes: string | null; cree_le: string; maj_le: string
  /** La carte (0172, drapeau crmAtelierVivant) : lues drapeau levé seulement. */
  type_batiment?: string | null; lat?: number | string | null; lng?: number | string | null; geocode_le?: string | null; retire_carte_le?: string | null
}
export type MateriauLigne = {
  id: string; artisan_id: string; nom: string; unite: string | null; categorie: string | null; seuil_alerte: Nb; fournisseur_prefere: string | null
  prix_vu_ht: Nb; prix_vu_le: string | null; stock: { lieu: string; quantite: Nb }[] | null; fournisseur: { nom: string | null; contact: string | null } | null
}
export type DossiersCrm = {
  devis: readonly DevisLigne[]; factures: readonly FactureLigne[]; leads: readonly LeadLigne[]; chantiers: readonly ChantierLigne[]
  taches: readonly { id?: string; chantier_id: string; faite: boolean | null; libelle?: string | null; faite_le?: string | null; membre_id?: string | null; ordre?: number | null }[]; materiaux: readonly MateriauLigne[]
  /** Matériaux réservés (« reserve » : rattacher un stock insuffisant à son chantier) et sortis (« sorti » : la matière sortie
   *  des indicateurs du chantier) — chantier_materiaux. L'atelier ne garde que les réservations. */
  reservations?: readonly { chantier_id: string; materiau_id: string; quantite: Nb; statut?: string | null }[]
  /** Commandes fournisseur (table commandes_fournisseur, migration 0158). Absentes : aucune livraison en retard n'est inventée. */
  commandes?: readonly CommandeA[]
  /** Faux si la table n'existe pas encore sur la base : l'écran le dit au lieu de laisser croire qu'il n'y a aucune commande. */
  commandesDisponibles?: boolean
  deplacements: readonly (DeplacementP & { artisan_id?: string | null })[]; carnet: readonly ClientCarnet[]
  vehicules: readonly VehiculeA[]; membres: readonly MembreA[]; equipe: readonly { chantier_id: string; membre_id: string }[]
  /** Les rappels et rendez-vous (crm_rappels, migration 0162) : à faire, et faits ces 60 derniers jours. */
  rappels?: readonly RappelLigne[]
  /** Faux tant que la table n'existe pas (0162 non appliquée) : l'écran le dit au lieu de montrer « aucun rappel ». */
  rappelsDisponibles?: boolean
  tronque: boolean
}

// ── Ce que les écrans reçoivent ─────────────────────────────────────────────────────────────────────────────────────────
export type ChantierListe = {
  id: string; titre: string; statut: string; date_debut: string | null; date_fin_prevue: string | null
  client: string | null; devis_numero: string | null
  adresse: string | null
  avancement: { pct: number | null; faites: number; total: number }
  retard: number | null
  /** Drapeau crmAtelierVivant (lot 5) : validé et retiré de la carte le… (le filtre « Voir les chantiers validés »). Absent drapeau baissé. */
  retireCarte?: string | null
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
  /** Rappels et rendez-vous (plan du 18/10, n°1) : « À faire aujourd'hui », la liste, et les devis à relancer d'un geste. */
  rappels: VueRappels
  /** « Atelier vivant » (drapeau crmAtelierVivant, 20/10) : ce que le poste des assistants lit en plus (lib/crm/assistants.ts). ABSENT drapeau baissé. */
  vivant?: { facturesEmises: FactureEmise[] }
}
export type VueRappels = { disponibles: boolean; liste: Rappel[]; aFaire: AFaire; devisARelancer: DevisARelancer[] }
export type Membre = { id: string; nom: string; role: string; telephone: string | null; actif: boolean }
export type Vehicule = { id: string; nom: string; immatriculation: string | null; conducteur_id: string | null; controle_technique_le: string | null; entretien_le: string | null; notes: string | null; actif: boolean }

/** L'adresse d'un chantier, telle qu'elle se tape dans un GPS : celle du chantier, sinon celle du devis. */
export const adresseChantier = (c: { adresse: string | null; code_postal: string | null; ville: string | null }, devisAdresse?: string | null): string | null =>
  [c.adresse, [c.code_postal, c.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') || devisAdresse || null

/** Les indicateurs de chaque chantier du compte (lib/crm/chantier.ts, indicateurs) à partir des lignes de la vue. */
function indicateursParChantier(uid: string, d: DossiersCrm, jour: string): Map<string, Indicateurs> {
  const devisParId = new Map(d.devis.filter((x) => x.artisan_id === uid).map((x) => [x.id, x]))
  const facturesParDevis = new Map<string, FactureLigne[]>()
  for (const f of d.factures) if (f.artisan_id === uid && f.devis_id) facturesParDevis.set(f.devis_id, [...(facturesParDevis.get(f.devis_id) ?? []), f])
  const prix = new Map(d.materiaux.map((m) => [m.id, m.prix_vu_ht]))
  const sorties = new Map<string, { statut: string; quantite: Nb; prix_vu_ht: Nb }[]>()
  for (const r of d.reservations ?? []) if (r.statut === 'sorti') sorties.set(r.chantier_id, [...(sorties.get(r.chantier_id) ?? []), { statut: 'sorti', quantite: r.quantite, prix_vu_ht: prix.get(r.materiau_id) ?? null }])
  const taches = new Map<string, { faite: boolean | null }[]>()
  for (const t of d.taches) taches.set(t.chantier_id, [...(taches.get(t.chantier_id) ?? []), t])
  const sortie = new Map<string, Indicateurs>()
  for (const c of d.chantiers) {
    if (c.artisan_id !== uid) continue
    const dv = c.devis_id ? devisParId.get(c.devis_id) ?? null : null
    sortie.set(c.id, indicateurs({ devis: dv, factures: dv ? facturesParDevis.get(dv.id) ?? [] : [], materiaux: sorties.get(c.id) ?? [], taches: taches.get(c.id) ?? [], chantier: c, jour }))
  }
  return sortie
}

export function construireVue(p: {
  uid: string; metier: string | null; formeJuridique?: string | null; entreprise?: { nom: string | null; ville: string | null }; d: DossiersCrm; maintenant: Date; idDe: (cle: string) => string
  /** La carte (drapeau crmAtelierVivant, lot 5) : la base géocodée et le réglage « valider automatiquement ». */
  carte?: { base: PointGeo | null; validationAuto: boolean }
}): Vue {
  const { uid, d, maintenant } = p
  const jour = jourParis(maintenant)
  const tachesPar = new Map<string, { faite: boolean | null }[]>()
  for (const t of d.taches) tachesPar.set(t.chantier_id, [...(tachesPar.get(t.chantier_id) ?? []), t])
  const devisParId = new Map(d.devis.map((x) => [x.id, x]))
  const entreesPipeline = { artisanId: uid, leads: d.leads, devis: d.devis, factures: d.factures, chantiers: d.chantiers, deplacements: d.deplacements }
  const chantierParDevis = new Set(d.chantiers.map((c) => c.devis_id).filter(Boolean))
  const toutes = cartes(entreesPipeline)
  const groupes = regrouperClients({ artisanId: uid, devis: d.devis, factures: d.factures, leads: d.leads, chantiers: d.chantiers, carnet: d.carnet, idDe: p.idDe })
  const lignesRappels = (d.rappels ?? []).filter((r) => !r.artisan_id || r.artisan_id === uid)
  const rappels = habillerRappels(lignesRappels, { jour, devis: d.devis, leads: d.leads, chantiers: d.chantiers, clients: groupes })
  // Le prochain rappel ouvert de chaque dossier : un badge sur sa carte du pipeline.
  const prochainDe = (c: Carte) => rappels.find((r) => !r.fait_le && ((!!c.devisId && r.devis_id === c.devisId) || (!!c.leadId && r.lead_id === c.leadId) || (!!c.chantierId && r.chantier_id === c.chantierId))) ?? null
  const pl = pipeline(entreesPipeline)
  const af = aFaire(rappels, jour)
  for (const col of pl.colonnes) col.cartes = col.cartes.map((c) => { const r = prochainDe(c); return r ? { ...c, rappel: { echeance: r.echeance, heure: r.heure, type: r.type, retard: r.retard } } : c })
  // La carte (drapeau levé) : chaque chantier porte l'objet de son devis — la déduction du type de bâtiment le lit avec le titre.
  const chantiersAtelier = actif('crmAtelierVivant') ? d.chantiers.map((c) => ({ ...c, objet: c.devis_id ? devisParId.get(c.devis_id)?.objet ?? null : null })) : d.chantiers
  const atelier = assemblerAtelier({ jour, metier: p.metier, chantiers: chantiersAtelier, cartes: toutes, ...(p.carte ? { carte: p.carte } : {}), taches: d.taches, reservations: d.reservations, commandes: d.commandes, commandesDisponibles: d.commandesDisponibles, equipe: d.equipe, materiaux: d.materiaux, vehicules: d.vehicules, membres: d.membres, ...(p.formeJuridique !== undefined ? { formeJuridique: p.formeJuridique } : {}), ...(p.entreprise !== undefined ? { entreprise: p.entreprise } : {}) })
  // Le panneau de l'atelier montre la frise et les indicateurs du chantier : ceux de sa carte et de lib/crm/chantier.ts, les mêmes
  // que la fiche chantier (même fonction, mêmes lignes).
  const cartesChantier = new Map(toutes.filter((c) => c.chantierId).map((c) => [c.chantierId as string, c]))
  const ind = indicateursParChantier(uid, d, jour)
  atelier.chantiers = atelier.chantiers.map((c) => ({ ...c, frise: cartesChantier.get(c.id)?.frise, indicateurs: ind.get(c.id) }))
  // Le briefing du matin de l'atelier dit aussi « À faire aujourd'hui » (le même compte que le tableau de bord).
  if (d.rappelsDisponibles !== false) atelier.rappels = { aujourdhui: af.aujourdhui.length, enRetard: af.enRetard.length, premiers: [...af.enRetard, ...af.aujourdhui].map((r) => `${LIBELLES_RAPPEL[r.type as TypeRappel] ?? 'Rappel'} — ${r.cible.libelle}`) }
  return {
    maintenant: maintenant.toISOString(),
    tronque: d.tronque,
    pipeline: pl,
    // La maquette de l'atelier (J3) : les mêmes lignes, mises en scène par lib/crm/atelier.ts.
    atelier,
    tableau: calculerTableauCrm({ artisanId: uid, devis: d.devis, factures: d.factures, demandes: d.leads, chantiers: d.chantiers, materiaux: d.materiaux, maintenant, cartes: toutes }),
    chantiers: d.chantiers.map((c) => {
      const dv = c.devis_id ? devisParId.get(c.devis_id) : undefined
      return {
        id: c.id, titre: c.titre, statut: c.statut, date_debut: c.date_debut, date_fin_prevue: c.date_fin_prevue,
        client: dv?.client_nom ?? c.client_nom ?? null, devis_numero: dv?.numero ?? null, adresse: adresseChantier(c, dv?.client_adresse),
        avancement: avancement(tachesPar.get(c.id) ?? []), retard: joursDeRetard(c, jour),
        ...('retire_carte_le' in c ? { retireCarte: c.retire_carte_le ?? null } : {}),
      }
    }),
    // Les devis signés qui n'ont pas encore de chantier : ce que « Créer un chantier » propose.
    devisSignesSansChantier: d.devis
      .filter((x) => x.statut === 'accepte' && !chantierParDevis.has(x.id))
      .map((x) => ({ id: x.id, numero: x.numero, objet: x.objet, client_nom: x.client_nom, total_ttc: x.total_ttc, accepte_le: x.accepte_le })),
    rappels: {
      disponibles: d.rappelsDisponibles ?? true,
      liste: rappels,
      aFaire: af,
      devisARelancer: devisARelancer({ artisanId: uid, devis: d.devis, rappels: lignesRappels, jour }),
    },
    // Drapeau baissé : le champ n'existe pas, la réponse de GET /api/crm/vue est celle d'avant.
    ...(actif('crmAtelierVivant') ? { vivant: { facturesEmises: facturesEmises(uid, d.factures) } } : {}),
    clients: groupes
      .map((c) => ({ id: c.id, nom: c.nom, email: c.email, telephone: c.telephone, demandes: c.leads.length, devis: c.devis.length, factures: c.factures.length, chantiers: c.chantiers.length, derniere: c.derniere })),
  }
}

// ── La fiche chantier ───────────────────────────────────────────────────────────────────────────────────────────────────
export type TacheFiche = { id: string; libelle: string; quantite: number | null; unite: string | null; ordre: number; faite: boolean; faite_le: string | null; membre_id: string | null; devis_ligne_id: string | null; piece?: string | null }
export type ReservationFiche = { id: string; materiau_id: string; quantite: number; lieu: string; statut: string; sorti_le: string | null; note: string | null; materiau: { id: string; nom: string; unite: string; prix_vu_ht?: Nb } | null }
export type EntreeJournal = { id: string; objet: string; champ: string; de: string | null; vers: string | null; origine: string; etape_derivee: string | null; note: string | null; cree_le: string }
export type NoteCrm = { id: string; texte: string; cree_le: string }
export type DevisFiche = {
  id: string; numero: string | null; objet: string | null; statut: string | null; total_ttc: number | null; acompte_pct: number | null; accepte_le: string | null; envoye_le?: string | null
  client_nom: string | null; client_email: string | null; client_adresse: string | null; lead_id: string | null
  total_ht?: number | string | null; created_at?: string | null; date_emission?: string | null
}
export type FactureFiche = { id: string; artisan_id?: string; devis_id?: string | null; numero: string | null; objet?: string | null; statut: string | null; total_ttc: number | null; avoir_de?: string | null; date_emission: string | null; acompte_pct: number | null }
export type FicheChantier = {
  /** Le métier du compte (décor de la maquette du chantier, lot 5) ; absent dans l'exemple. */
  metier?: string | null
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
  /** Les sept pastilles du dossier (lib/crm/pipeline.ts, frise) : les mêmes que sur sa carte du pipeline. */
  frise: Frise
  /** La colonne d'indicateurs (lib/crm/chantier.ts, indicateurs) : argent, matière sortie, marge estimée, avancement. */
  indicateurs: Indicateurs
  /** Les rappels du chantier, de son devis et de sa demande (crm_rappels, 0162). */
  rappels: Rappel[]
  rappelsDisponibles: boolean
  /** Le jour de la fiche (Paris) : les échéances rapides des rappels en partent. */
  jour: string
  /** La carte (drapeau crmAtelierVivant, lot 5) : le type de bâtiment (choisi, ou null = déduit, et le type déduit), la validation
   *  (possible ? déjà validé le… ?) et le réglage automatique. Absente drapeau baissé. */
  carte?: FicheCarte
}
export type FicheCarte = { type: TypeBat | null; typeDeduit: TypeBat; retire: string | null; validable: boolean; validationAuto: boolean }
/** La partie « carte » d'une fiche chantier : ce que le sélecteur de type et le bouton « Valider le chantier » lisent. */
export function ficheCarte(c: { statut: string; titre: string; type_batiment?: string | null; retire_carte_le?: string | null }, objet: string | null, taches: readonly { faite: boolean | null }[], validationAuto: boolean): FicheCarte {
  const t = typeDuChantier({ titre: c.titre, objet })
  const choisi = typeDuChantier({ type_batiment: c.type_batiment, titre: c.titre, objet })
  return {
    type: choisi.deduit ? null : choisi.type, typeDeduit: t.type, retire: c.retire_carte_le ?? null, validationAuto,
    validable: peutValider({ statut: c.statut, retire_carte_le: c.retire_carte_le ?? null, taches: { total: taches.length, faites: taches.filter((x) => x.faite).length } }),
  }
}

export function construireFicheChantier(p: {
  uid: string; chantier: FicheChantier['chantier']; devis: DevisFiche | null; factures: readonly FactureFiche[]; leadStatut: string | null
  /** La demande d'origine (pour la pastille « Demande ») ; facultative. */
  lead?: { id: string; statut: string | null; created_at: string | null } | null
  /** Déplacement manuel en vigueur dans le pipeline (la frise le signale). */
  manuel?: Exclude<EtapeOuClasse, 'classe'> | null
  taches: TacheFiche[]; equipe: { id: string; nom: string; role: string }[]; vehicule: FicheChantier['vehicule']
  materiaux: ReservationFiche[]; notes: NoteCrm[]; journal: EntreeJournal[]; maintenant: Date
  rappels?: readonly RappelLigne[]; rappelsDisponibles?: boolean
}): FicheChantier {
  const c = p.chantier, devis = p.devis
  const factures = p.factures.map((f) => ({ ...f, artisan_id: p.uid, devis_id: f.devis_id ?? devis?.id ?? null }))
  const comptees = facturesComptees(factures)
  const av = avancement(p.taches)
  const lead = devis?.lead_id ? (p.lead && p.lead.id === devis.lead_id ? p.lead : { id: devis.lead_id, statut: p.leadStatut, created_at: null }) : null
  return {
    chantier: c,
    devis,
    // Factures du devis : toutes (pour l'historique), avec celles qui COMPTENT marquées (ni annulée, ni avoir).
    factures: factures.map((f) => ({ ...f, comptee: comptees.some((x) => x.id === f.id) })),
    frise: frise({ lead, devis, factures, chantier: c, manuel: p.manuel ?? null }),
    indicateurs: indicateurs({
      devis, factures, taches: p.taches, chantier: c, jour: jourParis(p.maintenant),
      materiaux: p.materiaux.map((r) => ({ statut: r.statut, quantite: r.quantite, prix_vu_ht: r.materiau?.prix_vu_ht ?? null })),
    }),
    rappels: habillerRappels(rappelsDe(p.rappels ?? [], { chantiers: [c.id], devis: devis ? [devis.id] : [], leads: devis?.lead_id ? [devis.lead_id] : [] }), {
      jour: jourParis(p.maintenant), devis: devis ? [{ id: devis.id, numero: devis.numero, objet: devis.objet, client_nom: devis.client_nom }] : [], leads: [], chantiers: [{ id: c.id, titre: c.titre }], clients: [],
    }),
    rappelsDisponibles: p.rappelsDisponibles ?? true,
    jour: jourParis(p.maintenant),
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
  /** Le prochain rendez-vous (visite, métré, rendez-vous) posé sur le client ou une de ses pièces (crm_rappels, 0162). */
  prochainRendezVous: Rappel | null
  /** Les rappels du client et de ses pièces, et la disponibilité de la table. */
  rappels: Rappel[]
  rappelsDisponibles: boolean
  /** La chronologie (plan du 18/10, n°4) : un fil daté, le plus récent en haut (lib/crm/chronologie.ts). */
  chronologie: Evenement[]
  /** La demande la plus récente (« Écrire » ouvre sa conversation, « Nouveau devis » s'y rattache). */
  derniereDemande: string | null
  jour: string
  prochainChantier: { id: string; titre: string; date_debut: string } | null
  signe: number | null
  /** Chaque dossier du client (demande, devis, chantier), avec sa frise : les cartes du pipeline de CE client. */
  dossiers: DossierClient[]
}
export type DossierClient = { cle: string; titre: string; montant: number | null; etape: EtapeOuClasse; manuel: boolean; frise: Frise; aEncaisser: number; depuis: string | null }
const versDossier = (c: Carte): DossierClient => ({ cle: c.cle, titre: c.titre, montant: c.montant, etape: c.etape, manuel: c.manuel, frise: c.frise, aEncaisser: c.aEncaisser, depuis: c.depuis })

export function construireFicheClient(p: {
  groupe: GroupeClient; d: Pick<DossiersCrm, 'devis' | 'factures' | 'leads' | 'chantiers'> & { deplacements?: DossiersCrm['deplacements'] }; notes: NoteCrm[]; maintenant: Date
  /** Tous les groupes du compte : pour rattacher un rappel posé sous une ANCIENNE clé du client (C4, lib/crm/clients.ts). */
  groupes?: readonly GroupeClient[]
  rappels?: readonly RappelLigne[]; rappelsDisponibles?: boolean
  /** Les notes posées sur les demandes et chantiers du client (la chronologie les montre ; le bloc Notes garde celles du client). */
  notesPieces?: readonly NoteCrm[]
  /** Les échanges et relances (lus par la route pour les seules demandes du client). */
  messages?: EntreesChrono['messages']; relancesConversation?: EntreesChrono['relancesConversation']; relancesImpayes?: EntreesChrono['relancesImpayes']
}): FicheClient {
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
  const groupes = p.groupes ?? [c]
  const rappels = habillerRappels(
    rappelsDe(p.rappels ?? [], { leads: c.leads, devis: c.devis, chantiers: c.chantiers }).concat((p.rappels ?? []).filter((r) => !!r.client_cle && clesDesNotes(groupes, c).includes(r.client_cle))),
    { jour, devis, leads, chantiers, clients: groupes },
  )
  const derniereDemande = [...leads].sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))[0]?.id ?? null
  return {
    client: { id: c.id, nom: c.nom, email: c.email, telephone: c.telephone, adresse: c.adresse },
    demandes: leads.map((l) => ({ id: l.id, statut: l.statut, type_chantier: l.type_chantier, canal: l.canal, ville: l.ville, created_at: l.created_at })),
    devis: devis.map((x) => ({ id: x.id, numero: x.numero, objet: x.objet, statut: x.statut, total_ttc: x.total_ttc, date_emission: x.date_emission, accepte_le: x.accepte_le })),
    factures: factures.map((x) => ({ id: x.id, numero: x.numero, statut: x.statut, total_ttc: x.total_ttc, date_emission: x.date_emission, date_echeance: x.date_echeance, avoir_de: x.avoir_de })),
    chantiers: chantiers.map((x) => ({ id: x.id, titre: x.titre, statut: x.statut, date_debut: x.date_debut, date_fin_prevue: x.date_fin_prevue })),
    notes: p.notes,
    // Le prochain rendez-vous vient des rappels de l'artisan (visite, métré, rendez-vous) : sans rappel de ce type, la case reste
    // vide plutôt que d'inventer un rendez-vous. Le prochain DÉBUT de chantier est donné à part, pour ce qu'il est.
    prochainRendezVous: prochainRendezVous(rappels, jour),
    rappels,
    rappelsDisponibles: p.rappelsDisponibles ?? true,
    derniereDemande,
    jour,
    chronologie: chronologie({
      leads, devis, factures, chantiers, rappels,
      notes: [...p.notes, ...(p.notesPieces ?? []).filter((n) => !p.notes.some((x) => x.id === n.id))],
      messages: (p.messages ?? []).filter((m) => c.leads.includes(m.lead_id)),
      relancesConversation: (p.relancesConversation ?? []).filter((r) => c.leads.includes(r.lead_id)),
      relancesImpayes: (p.relancesImpayes ?? []).filter((r) => c.factures.includes(r.facture_id)),
    }),
    prochainChantier: aVenir && aVenir.date_debut ? { id: aVenir.id, titre: aVenir.titre, date_debut: aVenir.date_debut } : null,
    // Total des devis signés de ce client, en centimes ; null s'il n'a aucun devis (l'écran affiche « — »).
    signe: devis.length ? devis.filter((x) => x.statut === 'accepte').reduce((s, x) => s + Math.round(Number(x.total_ttc ?? 0) * 100), 0) : null,
    // Les dossiers : le même calcul que le pipeline (cartes), sur les seules pièces de ce client. Le plus récent d'abord.
    dossiers: (() => {
      const artisanId = devis[0]?.artisan_id ?? leads[0]?.artisan_id ?? chantiers[0]?.artisan_id ?? ''
      return cartes({ artisanId, leads, devis, factures, chantiers, deplacements: p.d.deplacements ?? [] })
        .sort((a, b) => String(b.depuis ?? '').localeCompare(String(a.depuis ?? '')) || a.cle.localeCompare(b.cle)).map(versDossier)
    })(),
  }
}
