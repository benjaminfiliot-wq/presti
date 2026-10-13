// L'assistant de gestion de la console — ce que les outils CRM rendent au modèle (13/10).
//
// Module pur, comme lib/assistant/donnees.ts : il reçoit les lignes que lib/assistant/executeurs.ts a lues SOUS LA SESSION
// de l'artisan (RLS des tables 0141/0152) et les passe aux calculs du CRM, sans en refaire aucun (« deux chiffres, un
// écran ») :
//  • l'étape de chaque dossier et la colonne « À facturer / encaisser » : lib/crm/pipeline.ts (cartes, pipeline) ;
//  • les comptes de chantiers (ouverts, en retard, sans date) : lib/crm/tableau.ts (calculerTableauCrm) ;
//  • l'avancement et les jours de retard d'un chantier : lib/crm/chantier.ts ;
//  • « qui est sur quel chantier aujourd'hui » et la camionnette du jour : la scène de l'atelier (lib/crm/atelier.ts,
//    assemblerAtelier puis construireScene) — l'assistant dit ce que la maquette montre, avec sa règle du jour ;
//  • le stock total d'un article : la somme de l'atelier (assemblerAtelier).
// Les noms de clients sont emballés (encadrerClient : donnée, jamais consigne ; e-mails et téléphones masqués). Les
// nombres sont rendus tels quels, avec les comptes explicites : le modèle n'a rien à compter ni additionner.
// Rien de ce qui n'aide pas à répondre ne part : ni adresse de chantier, ni notes, ni téléphone d'un membre de l'équipe,
// ni immatriculation, ni identifiant technique.
import { cartes, pipeline, LIBELLES_ETAPES, LIBELLES_PREUVE, type DeplacementP, type DevisP, type FactureP, type LeadP } from '@/lib/crm/pipeline'
import { avancement, joursDeRetard } from '@/lib/crm/chantier'
import { calculerTableauCrm } from '@/lib/crm/tableau'
import { assemblerAtelier, construireScene, type MembreA, type VehiculeA } from '@/lib/crm/atelier'
import { LIBELLES_ROLE, LIBELLES_STATUT_CHANTIER } from '@/lib/crm/valider'
import { euros, jourParis, type DemandePresti, type DevisPresti, type FacturePresti } from '@/lib/comptaTableau'
import { encadrerClient, normaliser } from './cadrage'
import type { EntreesOutils } from './outils'

// ── Les lignes lues (colonnes choisies dans executeurs.ts, minimales) ─────────────────────────────────────────
export type ChantierLu = {
  id: string; artisan_id: string; devis_id: string | null; client_nom: string | null; titre: string; statut: string
  date_debut: string | null; date_fin_prevue: string | null; vehicule_id: string | null; cree_le: string | null
}
export type TacheLue = { artisan_id?: string | null; chantier_id: string; faite: boolean | null }
export type AffectationLue = { artisan_id?: string | null; chantier_id: string; membre_id: string }
export type MembreLu = { id: string; artisan_id?: string | null; nom: string; role: string; actif: boolean }
export type VehiculeLu = { id: string; artisan_id?: string | null; nom: string; actif: boolean }
export type ReservationLue = {
  id: string; artisan_id: string; chantier_id: string; materiau_id: string; quantite: number | string | null
  lieu: string | null; statut: string; sorti_le: string | null
}
export type MateriauLu = {
  id: string; artisan_id: string; nom: string; unite: string | null; categorie: string | null
  seuil_alerte: number | string | null; stock: { lieu?: string | null; quantite?: number | string | null }[] | null
}
export type DossiersCrm = {
  /** L'instant de la lecture (ISO) : « aujourd'hui » se calcule au jour de Paris de cet instant. */
  maintenant: string
  chantiers: ChantierLu[]; taches: TacheLue[]; equipe: AffectationLue[]; membres: MembreLu[]; vehicules: VehiculeLu[]
  reservations: ReservationLue[]; materiaux: MateriauLu[]
  devis: DevisP[]; factures: FactureP[]; leads: LeadP[]; deplacements: (DeplacementP & { artisan_id?: string | null })[]
  /** Une lecture a atteint sa limite : les comptes peuvent être incomplets (dit au modèle). */
  tronque: boolean
}

const texte = (v: unknown, max = 160): string | null => {
  if (typeof v !== 'string') return null
  const t = v.replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, max) : null
}
const nombre = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN
  return Number.isFinite(n) ? n : null
}
const jour = (v: unknown): string | null => (typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null)
const enEuros = (centimes: number) => ({ euros: Math.round(centimes) / 100, texte: euros(Math.round(centimes)) })
const libelleStatut = (s: string) => (LIBELLES_STATUT_CHANTIER as Record<string, string>)[s] ?? s
const libelleRole = (r: string) => (LIBELLES_ROLE as Record<string, string>)[r] ?? r
const compterPar = <T>(lignes: readonly T[], cle: (l: T) => string) => {
  const out: Record<string, number> = {}
  for (const l of lignes) { const k = cle(l); out[k] = (out[k] ?? 0) + 1 }
  return out
}
const instant = (d: DossiersCrm) => (d.maintenant && !Number.isNaN(Date.parse(d.maintenant)) ? new Date(d.maintenant) : new Date())

/** Seulement les lignes du compte (un fondateur voit plus sous la RLS : le filtre de la lecture est doublé ici). */
function duCompte(d: DossiersCrm, uid: string) {
  const mien = <T extends { artisan_id?: string | null }>(l: readonly T[] | null | undefined): T[] => (Array.isArray(l) ? l : []).filter((x) => !!x && x.artisan_id === uid)
  return {
    chantiers: mien(d.chantiers), taches: mien(d.taches), equipe: mien(d.equipe), membres: mien(d.membres), vehicules: mien(d.vehicules),
    reservations: mien(d.reservations), materiaux: mien(d.materiaux), devis: mien(d.devis), factures: mien(d.factures), leads: mien(d.leads),
    deplacements: mien(d.deplacements),
  }
}
type Propres = ReturnType<typeof duCompte>

const cartesDe = (p: Propres, uid: string) => cartes({ artisanId: uid, leads: p.leads, devis: p.devis, factures: p.factures, chantiers: p.chantiers, deplacements: p.deplacements })

const vehiculeA = (v: VehiculeLu): VehiculeA => ({ id: v.id, nom: v.nom, immatriculation: null, conducteur_id: null, controle_technique_le: null, entretien_le: null, actif: v.actif !== false })
const membreA = (m: MembreLu): MembreA => ({ id: m.id, nom: m.nom, role: m.role, actif: m.actif !== false })

/** La maquette de l'atelier, telle que GET /api/crm/vue la construit (sans inventaire : inutile ici). */
function atelierDe(p: Propres, uid: string, jourJ: string) {
  const donnees = assemblerAtelier({
    jour: jourJ, metier: null, chantiers: p.chantiers, cartes: cartesDe(p, uid), taches: p.taches.map((t) => ({ chantier_id: t.chantier_id, faite: t.faite })),
    equipe: p.equipe, materiaux: [], vehicules: p.vehicules.map(vehiculeA), membres: p.membres.map(membreA),
  })
  return { donnees, scene: construireScene(donnees) }
}

// ── lire_chantiers ────────────────────────────────────────────────────────────────────────────────────
export function resumerChantiers(d: DossiersCrm, uid: string, entree: EntreesOutils['lire_chantiers']) {
  const p = duCompte(d, uid)
  const maintenant = instant(d)
  const jourJ = jourParis(maintenant)
  const carteDe = new Map(cartesDe(p, uid).filter((c) => c.chantierId).map((c) => [c.chantierId as string, c]))
  const devisParId = new Map(p.devis.map((x) => [x.id, x]))
  const membres = new Map(p.membres.map((m) => [m.id, m]))
  const vehicules = new Map(p.vehicules.map((v) => [v.id, v]))
  const tachesPar = new Map<string, TacheLue[]>()
  for (const t of p.taches) tachesPar.set(t.chantier_id, [...(tachesPar.get(t.chantier_id) ?? []), t])
  const equipePar = new Map<string, string[]>()
  for (const e of p.equipe) equipePar.set(e.chantier_id, [...(equipePar.get(e.chantier_id) ?? []), e.membre_id])
  // Les comptes du tableau de bord du CRM (ouverts, en retard, sans date de fin), au même calcul.
  const tableau = calculerTableauCrm({ artisanId: uid, devis: p.devis as DevisPresti[], factures: p.factures as FacturePresti[], demandes: p.leads as DemandePresti[], chantiers: p.chantiers, materiaux: [], maintenant })

  const ouvert = (s: string) => s !== 'termine' && s !== 'annule'
  const cherche = entree.recherche ? normaliser(entree.recherche).trim() : ''
  const retenus = p.chantiers.filter((c) => {
    if (entree.ouverts_seulement && !ouvert(c.statut)) return false
    if (entree.statut && c.statut !== entree.statut) return false
    if (!cherche) return true
    const dv = c.devis_id ? devisParId.get(c.devis_id) : undefined
    return normaliser(`${c.titre} ${dv?.client_nom ?? c.client_nom ?? ''}`).includes(` ${cherche}`)
  })
  return {
    filtre: { statut: entree.statut, ouverts_seulement: entree.ouverts_seulement, recherche: entree.recherche },
    aujourd_hui: jourJ,
    nb_chantiers_total: p.chantiers.length,
    nb_par_statut: compterPar(p.chantiers, (c) => libelleStatut(c.statut)),
    nb_ouverts: tableau.chantiers?.actifs ?? 0,
    nb_en_retard: tableau.chantiers?.enRetard ? tableau.chantiers.enRetard.nombre : null,
    nb_ouverts_sans_date_de_fin: tableau.chantiers?.sansDate ?? 0,
    nb_correspondants: retenus.length,
    nb_rendus: Math.min(retenus.length, entree.limite),
    chantiers: retenus.slice(0, entree.limite).map((c) => {
      const dv = c.devis_id ? devisParId.get(c.devis_id) : undefined
      const carte = carteDe.get(c.id)
      const av = avancement(tachesPar.get(c.id) ?? [])
      const retard = joursDeRetard(c, jourJ)
      return {
        chantier: texte(c.titre) ?? 'Chantier',
        client: encadrerClient(dv?.client_nom ?? c.client_nom, 120),
        statut: libelleStatut(c.statut),
        etape_du_pipeline: carte ? LIBELLES_ETAPES[carte.etape] : null,
        devis: texte(dv?.numero, 40),
        avancement: { taches_faites: av.faites, taches_total: av.total, pourcentage: av.pct },
        debut: jour(c.date_debut),
        fin_prevue: jour(c.date_fin_prevue),
        jours_de_retard: retard,
        equipe: (equipePar.get(c.id) ?? []).map((id) => texte(membres.get(id)?.nom, 80)).filter((x): x is string => !!x),
        camionnette: c.vehicule_id ? texte(vehicules.get(c.vehicule_id)?.nom, 80) : null,
      }
    }),
    donnees_tronquees: d.tronque,
    a_savoir: "Calculs de l'écran CRM. jours_de_retard : jours depuis la fin prévue dépassée (0 : dans les temps ; null : pas de date de fin). avancement : tâches cochées dans le CRM, pas une mesure du chantier réel. pourcentage null : aucune tâche.",
  }
}

// ── lire_equipe_du_jour ───────────────────────────────────────────────────────────────────────────────
export function resumerEquipeDuJour(d: DossiersCrm, uid: string) {
  const p = duCompte(d, uid)
  const jourJ = jourParis(instant(d))
  const { donnees, scene } = atelierDe(p, uid, jourJ)
  const objet = (type: string, ref: string) => scene.objets.find((o) => o.type === type && o.ref === ref) ?? null
  // Le chantier « du jour » d'après la maquette : la règle de l'atelier (estAujourdhui), lue sur la scène, jamais refaite ici.
  const duJour = (id: string) => !!objet('chantier', id)?.etat.aujourdhui
  const membres = new Map(donnees.membres.map((m) => [m.id, m]))
  const vehicules = new Map(donnees.vehicules.map((v) => [v.id, v]))
  const clientDe = new Map(p.chantiers.map((c) => [c.id, c]))
  const devisParId = new Map(p.devis.map((x) => [x.id, x]))

  const chantiersDuJour = donnees.chantiers.filter((c) => duJour(c.id))
  const actifs = donnees.membres.filter((m) => m.actif)
  const equipe = actifs.map((m) => {
    const o = objet('membre', m.id)
    if (!o) return { membre: texte(m.nom, 80), role: libelleRole(m.role), chantier_du_jour: null, ou: 'non déterminé (trop de membres pour la maquette)' }
    // Même recherche que construireScene : le PREMIER chantier du jour (visible sur la maquette) où il est affecté.
    const c = o.etat.aujourdhui ? donnees.chantiers.find((x) => x.equipe.includes(m.id) && duJour(x.id)) ?? null : null
    return { membre: texte(m.nom, 80), role: libelleRole(m.role), chantier_du_jour: c ? texte(c.titre) : null, ou: c ? 'sur le chantier' : 'à l’atelier' }
  })
  const camionnettes = donnees.vehicules.filter((v) => v.actif).map((v) => {
    const o = objet('vehicule', v.id)
    const c = o?.etat.aujourdhui
      ? donnees.chantiers.find((x) => x.vehicule_id === v.id && duJour(x.id)) ?? donnees.chantiers.find((x) => x.vehicule_id === v.id && o.detail.endsWith(`→ ${x.titre}`)) ?? null
      : null
    return { camionnette: texte(v.nom, 80), chantier_du_jour: c ? texte(c.titre) : null, ou: !o ? 'non déterminé (trop de véhicules pour la maquette)' : c ? 'sur le chantier' : 'au dépôt' }
  })
  return {
    aujourd_hui: jourJ,
    nb_membres_actifs: actifs.length,
    nb_sur_un_chantier: equipe.filter((e) => e.chantier_du_jour).length,
    nb_a_l_atelier: equipe.filter((e) => e.ou === 'à l’atelier').length,
    nb_chantiers_du_jour: chantiersDuJour.length,
    nb_camionnettes_actives: camionnettes.length,
    chantiers_du_jour: chantiersDuJour.map((c) => {
      const lu = clientDe.get(c.id)
      const dv = lu?.devis_id ? devisParId.get(lu.devis_id) : undefined
      return {
        chantier: texte(c.titre),
        client: encadrerClient(dv?.client_nom ?? lu?.client_nom ?? c.client, 120),
        statut: libelleStatut(c.statut),
        equipe_affectee: c.equipe.map((id) => texte(membres.get(id)?.nom, 80)).filter((x): x is string => !!x),
        camionnette: c.vehicule_id ? texte(vehicules.get(c.vehicule_id)?.nom, 80) : null,
      }
    }),
    equipe,
    camionnettes,
    chantiers_hors_maquette: scene.horsScene.chantiers,
    donnees_tronquees: d.tronque,
    a_savoir: "Règle de l'atelier du CRM : un chantier est « du jour » s'il est en cours, ou planifié et que ses dates encadrent aujourd'hui. Ce sont les affectations notées dans le CRM, pas un pointage : personne n'a confirmé sa présence. Un membre sans chantier du jour est compté « à l'atelier ».",
  }
}

// ── lire_materiaux_reserves ───────────────────────────────────────────────────────────────────────────
export function resumerMateriauxReserves(d: DossiersCrm, uid: string, entree: EntreesOutils['lire_materiaux_reserves']) {
  const p = duCompte(d, uid)
  const jourJ = jourParis(instant(d))
  // Le stock total d'un article : la somme de l'atelier (assemblerAtelier), comme la maquette et le tableau de bord.
  const stock = new Map(assemblerAtelier({ jour: jourJ, metier: null, chantiers: [], cartes: [], taches: [], equipe: [], materiaux: p.materiaux, vehicules: [], membres: [] }).materiaux.map((m) => [m.id, m]))
  const chantiers = new Map(p.chantiers.map((c) => [c.id, c]))
  const cherche = entree.recherche ? normaliser(entree.recherche).trim() : ''
  const retenues = p.reservations
    .filter((r) => (entree.statut === 'tous' ? r.statut === 'reserve' || r.statut === 'sorti' : r.statut === entree.statut))
    .filter((r) => !cherche || normaliser(`${stock.get(r.materiau_id)?.nom ?? ''} ${chantiers.get(r.chantier_id)?.titre ?? ''}`).includes(` ${cherche}`))

  const parArticle = new Map<string, { quantite: number; chantiers: Set<string> }>()
  for (const r of retenues) {
    const x = parArticle.get(r.materiau_id) ?? { quantite: 0, chantiers: new Set<string>() }
    x.quantite += nombre(r.quantite) ?? 0
    x.chantiers.add(r.chantier_id)
    parArticle.set(r.materiau_id, x)
  }
  const enAttente = entree.statut === 'reserve'
  return {
    filtre: { statut: entree.statut, recherche: entree.recherche },
    nb_reservations: retenues.length,
    nb_articles: parArticle.size,
    nb_chantiers: new Set(retenues.map((r) => r.chantier_id)).size,
    nb_rendues: Math.min(retenues.length, entree.limite),
    reservations: retenues.slice(0, entree.limite).map((r) => {
      const m = stock.get(r.materiau_id)
      const c = chantiers.get(r.chantier_id)
      return {
        article: texte(m?.nom) ?? 'Article supprimé de l’inventaire',
        quantite: nombre(r.quantite), unite: texte(m?.unite, 16),
        lieu: texte(r.lieu, 60),
        etat: r.statut === 'sorti' ? 'sorti du stock' : 'réservé, pas encore sorti',
        sorti_le: jour(r.sorti_le),
        chantier: texte(c?.titre) ?? 'Chantier introuvable',
        statut_du_chantier: c ? libelleStatut(c.statut) : null,
      }
    }),
    par_article: [...parArticle.entries()].map(([id, x]) => {
      const m = stock.get(id)
      const total = Math.round(x.quantite * 100) / 100
      return {
        article: texte(m?.nom) ?? 'Article supprimé de l’inventaire', unite: texte(m?.unite, 16),
        quantite_totale: total, nb_chantiers: x.chantiers.size,
        stock_total_inventaire: m ? m.reste : null,
        ...(enAttente ? { reserve_plus_que_le_stock: m ? total > m.reste : null } : {}),
      }
    }),
    donnees_tronquees: d.tronque,
    a_savoir: "Une réservation ne touche pas au stock : c'est la sortie (fiche chantier du CRM) qui le décrémente. stock_total_inventaire : la somme de tous les lieux de l'inventaire, réservations comprises.",
  }
}

// ── lire_a_facturer ───────────────────────────────────────────────────────────────────────────────────
export function resumerAFacturer(d: DossiersCrm, uid: string, entree: EntreesOutils['lire_a_facturer']) {
  const p = duCompte(d, uid)
  const pip = pipeline({ artisanId: uid, leads: p.leads, devis: p.devis, factures: p.factures, chantiers: p.chantiers, deplacements: p.deplacements })
  const col = pip.colonnes.find((c) => c.etape === 'a_facturer')
  const toutes = col?.cartes ?? []
  const devisParId = new Map(p.devis.map((x) => [x.id, x]))
  return {
    colonne: LIBELLES_ETAPES.a_facturer,
    nb_dossiers: toutes.length,
    nb_chantiers_termines_pas_encore_factures: toutes.filter((c) => c.preuve === 'chantier_termine').length,
    nb_factures_reglement_attendu: toutes.filter((c) => c.preuve === 'facture_impayee').length,
    nb_deplaces_a_la_main: toutes.filter((c) => c.manuel).length,
    total_de_la_colonne_ttc: enEuros(col?.montant ?? 0),
    nb_rendus: Math.min(toutes.length, entree.limite),
    dossiers: toutes.slice(0, entree.limite).map((c) => ({
      dossier: texte(c.titre),
      client: encadrerClient(c.client, 120),
      situation: c.manuel ? `placé ici à la main (${LIBELLES_PREUVE[c.preuve]})` : LIBELLES_PREUVE[c.preuve],
      devis: c.devisId ? texte(devisParId.get(c.devisId)?.numero, 40) : null,
      montant_devis_ttc: c.montant === null ? null : enEuros(c.montant),
      depuis: jour(c.depuis),
    })),
    donnees_tronquees: d.tronque,
    a_savoir: "Colonne « À facturer / encaisser » du pipeline du CRM, même calcul que l'écran : « chantier terminé, pas encore facturé » = à facturer ; « facturé, règlement attendu » = la facture existe, le paiement manque. Montants : le TTC des devis. La facture se crée et s'envoie depuis l'écran Factures, jamais d'ici.",
  }
}
