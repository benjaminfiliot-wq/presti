// CRM — « l'atelier vivant » : la maquette (jalon J3) DÉDUITE des données réelles de l'artisan. Module pur, sans three :
// des lignes en entrée, une liste de formes simples (boîtes, cylindres, sphères, toits, cônes) et d'objets cliquables en
// sortie. La scène 3D (app/crm/atelier/Scene3D.tsx) ne fait que les dessiner, une forme = UN maillage instancié ; le repli
// 2D (app/crm/atelier/Plan2D.tsx) lit les MÊMES objets. Rejoué par scripts/crm-qa.mjs.
//
// Ce que la maquette montre (plan 3.3) :
//   • Accueil      : un colis à la porte par nouvelle demande (corail si reçue aujourd'hui) ;
//   • Dépôt        : un rayonnage par catégorie d'inventaire, ses cartons ; sous son seuil, il pulse en corail ;
//   • Parking      : une camionnette par véhicule actif ;
//   • Équipe       : un personnage par membre actif, posté sur son chantier du jour, sinon à l'atelier ;
//   • Chantiers    : autour du dépôt, un bâtiment par chantier ouvert (ou terminé à facturer), avec son épingle de statut ;
//   • Bureau       : l'écran du bureau, qui bascule vers les vues 2D.
// Rien n'est inventé : sans véhicule, le parking est vide ; sans inventaire, les rayonnages aussi.

import { joursDeRetard } from './chantier.ts'
import { jourParis } from '../comptaTableau.ts'
import { calculerAlertes, chantierVisible, estAujourdhui, estStockBas, aEncaisser, type Gravite, type TypeAlerte } from './alertes.ts'
import type { CommandeA } from './commandes.ts'
import type { Frise } from './pipeline.ts'
import type { Indicateurs } from './chantier.ts'
import {
  accessoiresBase, avancementDessine, bureauInfra, camionnette, cheminVers, comptoirInfra, decorBase, horsEnclos, maisonChantier, personnage, placeParking, placeRepos,
  PLANS, profilInfrastructure, rayonnageInfra, DECOR_PUR, ficheStructure, type AjoutF, type Base, type Fenetre, type FicheStructure, type Metier3D, type Mobile, type PlanBase, type Profil,
} from './infrastructure.ts'

// Les règles « chantier visible » et « prévu aujourd'hui » vivent dans alertes.ts (une seule écriture, partagée avec les urgences).
export { chantierVisible, estAujourdhui }

// ── Entrées ──────────────────────────────────────────────────────────────────────────────────────────────────
/** Les tâches d'un chantier, telles que le panneau les montre : tout est compté sur les VRAIES lignes de chantier_taches. */
export type TachesA = {
  total: number; faites: number
  /** Faites AUJOURD'HUI (jour de Paris, d'après faite_le). */
  faitesAujourdhui: number
  /** Les premières tâches à faire (8 au plus, dans l'ordre du chantier) ; `total - faites` dit combien il y en a en tout. */
  ouvertes: { id: string; libelle: string; membre_id: string | null }[]
}
export type ChantierA = {
  id: string; titre: string; client: string | null; statut: string; etape: string | null
  avancement: number | null; date_debut: string | null; date_fin_prevue: string | null; vehicule_id: string | null; equipe: string[]
  /** Absent des jeux de données anciens : l'écran retombe alors sur `avancement` seul. */
  taches?: TachesA
  adresse?: string | null
  /** La frise du dossier (sa carte du pipeline) et les indicateurs du chantier : posés par lib/crm/vue.ts, absents des jeux anciens. */
  frise?: Frise
  indicateurs?: Indicateurs
}
/** Un matériau réservé pour un chantier (chantier_materiaux, statut « réservé » : pas encore sorti du stock). */
export type ReservationA = { chantier_id: string; materiau_id: string; quantite: number }
export type MateriauA = { id: string; nom: string; unite: string; categorie: string | null; reste: number; seuil: number; fournisseur: string | null; fournisseur_contact: string | null; prix_vu_ht: number | null; prix_vu_le: string | null }
export type VehiculeA = { id: string; nom: string; immatriculation: string | null; conducteur_id: string | null; controle_technique_le: string | null; entretien_le: string | null; actif: boolean }
export type MembreA = { id: string; nom: string; role: string; actif: boolean }
export type DemandeA = { id: string; titre: string; client: string | null; recue_le: string | null }
export type DonneesAtelier = {
  jour: string
  metier: string | null
  chantiers: ChantierA[]
  materiaux: MateriauA[]
  vehicules: VehiculeA[]
  membres: MembreA[]
  demandes: DemandeA[]
  /** Matériaux réservés non sortis (pour rattacher un stock insuffisant à un chantier). Absent : aucune alerte de ce genre. */
  reservations?: ReservationA[]
  /** Les commandes fournisseur enregistrées (lib/crm/commandes.ts). Absent : aucune « livraison en retard » n'est inventée. */
  commandes?: CommandeA[]
  /** Faux tant que la table des commandes n'existe pas sur la base (migration 0158 non appliquée) : l'écran le dit. */
  commandesDisponibles?: boolean
  /** La forme juridique de la fiche artisan (artisans.forme_juridique), lue SEULEMENT drapeau crmAtelierVivant levé : le statut
   *  « à son compte / société » de l'infrastructure (lib/crm/infrastructure.ts). Absente : l'équipe tranche. */
  formeJuridique?: string | null
  /** Le nom et la ville de la fiche artisan (artisans.nom, artisans.ville), lus SEULEMENT drapeau crmAtelierVivant levé : repris tels quels
   *  dans la maquette (l'enseigne, le bureau), rien à ressaisir. Absents : rien n'est dit. */
  entreprise?: { nom: string | null; ville: string | null }
  /** Les rappels dus aujourd'hui et en retard (crm_rappels, 0162), pour le briefing du matin ; absent : rien n'est dit. */
  rappels?: { aujourdhui: number; enRetard: number; premiers: string[] }
}

// ── Sorties ──────────────────────────────────────────────────────────────────────────────────────────────────
export type Forme = 'box' | 'cyl' | 'sph' | 'toit' | 'cone'
export const FORMES: readonly Forme[] = ['box', 'cyl', 'sph', 'toit', 'cone']
export type V3 = [number, number, number]
/** Une instance : centre, échelle (la forme unitaire fait 1 × 1 × 1), rotation (radians), couleur, objet porteur (-1 = décor). */
export type Inst = { p: V3; s: V3; r: V3; c: string; o: number }
// 'assistants' : le poste des assistants (drapeau crmAtelierVivant, lib/crm/assistants.ts) ; absent de la scène drapeau baissé.
// 'structure' : un bâtiment, une installation ou une machine de la base (infrastructure, lot 4) — un panneau qui dit à quoi elle sert.
export type TypeObjet = 'chantier' | 'categorie' | 'vehicule' | 'membre' | 'accueil' | 'bureau' | 'assistants' | 'structure'
export type EtatObjet = { aujourdhui: boolean; retard: boolean; aFacturer: boolean; stockBas: boolean; livraison: boolean }
/** Une pastille d'alerte posée sur un objet de la maquette (retard, livraison, stock, tâches faites…). */
export type BadgeObjet = { type: TypeAlerte | 'demandes' | 'taches' | 'valider'; libelle: string; gravite: Gravite }
/** Ce que la carte d'un chantier montre sans l'ouvrir : l'équipe, les tâches, le client. Tout vient des données. */
export type InfoChantier = {
  equipe: { id: string; nom: string; role: string }[]
  /** Faux si le chantier n'est pas prévu aujourd'hui : l'équipe est alors celle AFFECTÉE, pas celle présente. */
  surPlace: boolean
  taches: { faites: number; total: number; faitesAujourdhui: number } | null
  client: string | null
}
export type ObjetScene = {
  cle: string; type: TypeObjet; ref: string; libelle: string; detail: string
  centre: V3; hauteur: number; etat: EtatObjet
  /** Couleur de l'épingle / de la pastille (chantiers seulement). */
  epingle: string | null
  /** Les alertes de l'objet, la plus grave d'abord. */
  badges: BadgeObjet[]
  info: InfoChantier | null
  /** Structure seulement : sa fiche (lib/crm/infrastructure.ts, ficheStructure). */
  fiche?: FicheStructure
}
export type Scene = {
  instances: Record<Forme, Inst[]>
  /** Les boîtes qui pulsent (rayonnages sous le seuil) : un calque à part, une seule matière animée. */
  pulse: Inst[]
  objets: ObjetScene[]
  zones: { libelle: string; p: V3 }[]
  bornes: { min: V3; max: V3 }
  prereglage: Prereglage
  /** Ce qui n'a pas pu être placé (au-delà des emplacements) : dit à l'écran, jamais caché. */
  horsScene: { chantiers: number; categories: number; vehicules: number; demandes: number }
  /** Drapeau crmAtelierVivant seulement : le colis de chaque demande (son identifiant et sa place dans instances.box), pour que la scène
   *  fasse tomber celui qui vient d'arriver (lib/crm/accueil.ts). Absent drapeau baissé. */
  colis?: { id: string; index: number }[]
  /** Drapeau crmAtelierVivant seulement (lib/crm/infrastructure.ts) : le profil, la base dessinée (automatique ou choisie), la cible
   *  de la vue « atelier ». Absent drapeau baissé, comme `fenetres` et `mobiles`. */
  infra?: { profil: Profil; base: Base; auto: boolean; cible: V3; structures: string[]; metier: Metier3D }
  /** Les fenêtres et les lampes : un calque à part (une seule matière, non éclairée), allumé le soir. */
  fenetres?: Fenetre[]
  /** Les morceaux des personnages qui partent de la base vers leur chantier du jour (la scène 3D les fait marcher). */
  mobiles?: Mobile[]
}

/** Les ajouts de l'atelier vivant (drapeau crmAtelierVivant). Absents : la scène est celle d'avant, à l'identique. */
export type OptionsScene = {
  vivant?: { assistants: number }
  /** L'infrastructure (même drapeau) : la base suit le profil de l'artisan (`base` absente ou null) ou celle qu'il a choisie. */
  infra?: { base?: Base | null; metier?: Metier3D | null }
}

// ── Palette « maquette d'architecte » : crème, pierre, bois, corail. Ni bleu, ni rouge vif. ──────────────────
export const COULEURS = {
  sol: '#EFE9DD', dalle: '#FAF6EE', mur: '#F4EFE6', corail: '#D97757', corailClair: '#E8946F', corailFonce: '#B85C3C',
  pierre: '#CFC6B8', planche: '#E6DFD3', bois: '#B98B62', boisFonce: '#8A7F72', ardoise: '#3A3632', vitre: '#5B5650',
  blanc: '#FBF8F2', sauge: '#A9C29B', tronc: '#9C8468', peau: '#E9CBB0', vert: '#5E9E7E', ambre: '#C9A27E', gris: '#A8A196',
} as const
const CARTONS = ['#D9C3A0', '#C9A27E', '#B9B2A6', '#E2D2B8', '#A89F92', '#D6B898']
const MURS_MAISON = ['#F3EDE2', '#EADFCF', '#E6E0D6', '#EFE6D8']
const TOITS = ['#C98B6B', '#B9A58E', '#D2A383', '#BF9479']
const ROLES: Record<string, string> = { artisan: COULEURS.corail, compagnon: '#6F6A64', apprenti: COULEURS.ambre, salarie: '#8C857C', sous_traitant: '#A89F92', autre: '#B9B2A6' }

/** La couleur d'un membre d'équipe (le personnage de la maquette et sa pastille sur la carte du chantier). */
export const couleurRole = (role: string): string => ROLES[role] ?? ROLES.autre
/** Le style d'une pastille de membre : la couleur de son rôle, et le texte (clair ou sombre) qui s'y lit à 4,5:1 au moins. */
export function styleAvatar(role: string): { background: string; color: string } {
  const fond = couleurRole(role)
  const lum = (h: string) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const L = lum(fond), contraste = (l2: number) => (Math.max(L, l2) + 0.05) / (Math.min(L, l2) + 0.05)
  const clair = '#FFFFFF', sombre = '#17140F'
  return { background: fond, color: contraste(lum(clair)) >= contraste(lum(sombre)) ? clair : sombre }
}
/** « Compagnon 2 » → « C2 », « Marie Dupont » → « MD » : les deux premières initiales. */
export const initiales = (nom: string): string => nom.trim().split(/\s+/).slice(0, 2).map((s) => (s[0] ?? '').toUpperCase()).join('') || '?'

/** La couleur d'épingle d'un chantier : à démarrer · en cours · en retard · terminé à facturer. */
export function couleurEpingle(c: { statut: string; etape: string | null }, retard: number | null): string {
  if (c.etape === 'a_facturer' || c.statut === 'termine') return COULEURS.vert
  if (retard && retard > 0) return COULEURS.corailFonce
  if (c.statut === 'en_cours') return COULEURS.corail
  if (c.statut === 'planifie') return COULEURS.ambre
  return COULEURS.gris
}

// ── Préréglages par métier : les accessoires de l'atelier changent. ─────────────────────────────────────────
export const PREREGLAGES = ['plombier', 'electricien', 'menuisier', 'macon', 'couvreur', 'carreleur', 'peintre', 'chauffagiste', 'general'] as const
export type Prereglage = (typeof PREREGLAGES)[number]
export const LIBELLES_PREREGLAGE: Record<Prereglage, string> = {
  plombier: 'Plombier', electricien: 'Électricien', menuisier: 'Menuisier', macon: 'Maçon', couvreur: 'Couvreur',
  carreleur: 'Carreleur', peintre: 'Peintre', chauffagiste: 'Chauffagiste', general: 'Tous corps d’état',
}
/** Le métier de la fiche artisan (texte libre) → un préréglage. Inconnu → « général ». */
export function prereglageDe(metier: string | null | undefined): Prereglage {
  const t = (metier ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const regles: [RegExp, Prereglage][] = [
    [/chauffag|climat|pompe a chaleur|pac\b/, 'chauffagiste'], [/plomb|sanitaire/, 'plombier'], [/electric/, 'electricien'],
    [/menuis|ebenist|charpent/, 'menuisier'], [/macon|gros oeuvre|beton/, 'macon'], [/couvr|toitur|zingu/, 'couvreur'],
    [/carrel|faience/, 'carreleur'], [/peint|plaqui|platr|decor/, 'peintre'],
  ]
  return regles.find(([re]) => re.test(t))?.[1] ?? 'general'
}

// ── Géométrie du plan (mètres de maquette) ───────────────────────────────────────────────────────────────────
export const DEPOT = { x0: -11, x1: 11, z0: -7, z1: 7 }
export const PARKING = { x0: 12.5, x1: 22, z0: -7, z1: 7 }
/** Le centre du poste des assistants (drapeau crmAtelierVivant) : zone Bureau du dépôt, entre le bureau et la ligne de zone x = -3,7. */
export const POSTE = { x: -5.2, z: 5.0 }
export const LIMITES = { rayonnages: 10, camionnettes: 8, chantiers: 30, colis: 16, personnages: 16 }

/** Un nombre pseudo-aléatoire STABLE tiré d'un identifiant (même chantier → même maison, à chaque ouverture). */
export function hacher(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967296
}

/** Les emplacements de la « petite ville » autour du dépôt : une grille, hors dépôt et parking, du plus proche au plus loin. */
export function emplacementsChantiers(n: number): V3[] {
  const pas = 5.6, cases: V3[] = []
  for (let x = -33.6; x <= 39.2; x += pas) for (let z = -28; z <= 30.8; z += pas) {
    const dehors = x < DEPOT.x0 - 2.6 || x > PARKING.x1 + 2.6 || z < DEPOT.z0 - 2.6 || z > DEPOT.z1 + 3.4
    if (dehors) cases.push([Math.round(x * 10) / 10, 0, Math.round(z * 10) / 10])
  }
  const centre: V3 = [5, 0, 0]
  const d = (p: V3) => Math.hypot(p[0] - centre[0], (p[2] - centre[2]) * 1.15)
  return cases.sort((a, b) => d(a) - d(b) || Math.atan2(a[2], a[0]) - Math.atan2(b[2], b[0])).slice(0, n)
}


export function construireScene(d: DonneesAtelier, prereglageForce?: Prereglage, options?: OptionsScene): Scene {
  const prereglage = prereglageForce ?? prereglageDe(d.metier)
  const instances: Record<Forme, Inst[]> = { box: [], cyl: [], sph: [], toit: [], cone: [] }
  const pulse: Inst[] = []
  const objets: ObjetScene[] = []
  const zones: Scene['zones'] = []
  const colis: { id: string; index: number }[] = []
  const ajouter = (f: Forme, p: V3, s: V3, c: string, o = -1, r: V3 = [0, 0, 0]) => { instances[f].push({ p, s, r, c, o }); return instances[f].length - 1 }
  // L'infrastructure (drapeau crmAtelierVivant, lib/crm/infrastructure.ts) : absente, tout ce qui suit dessine la scène d'avant, à l'identique.
  // Le lieu DÉCLARÉ par l'artisan (options.infra.base) prime sur la déduction (profilInfrastructure).
  const profil = options?.infra ? profilInfrastructure(d, options.infra.base ?? null) : null
  const plan: PlanBase | null = profil ? PLANS[profil.base] : null
  const structures: string[] = []
  // Le métier 3D (lot 4 : tous les métiers de Presti, pas seulement les neuf préréglages) ; à défaut, le préréglage.
  const metierI: Metier3D = options?.infra?.metier ?? prereglage
  /** Une structure de la base devient un objet cliquable, avec sa fiche (à quoi elle sert, données liées, actions). */
  const objetStructure = (cle: string, centre: V3, hauteur: number) => {
    const f = ficheStructure(cle, d, profil!, metierI)
    return objet({ cle: `structure:${cle}`, type: 'structure', ref: cle, libelle: f.titre, detail: f.role, centre, hauteur, epingle: null, fiche: f })
  }
  const fenetres: Fenetre[] = [], mobiles: Mobile[] = []
  const ajouterFenetre: AjoutF = (p, s, jour, nuit, o = -1) => { fenetres.push({ p, s, r: [0, 0, 0], c: jour, o, nuit }) }
  const objet = (o: Omit<ObjetScene, 'etat' | 'badges' | 'info'> & { etat?: Partial<EtatObjet>; badges?: BadgeObjet[]; info?: InfoChantier | null }) => { objets.push({ ...o, badges: o.badges ?? [], info: o.info ?? null, etat: { aujourdhui: false, retard: false, aFacturer: false, stockBas: false, livraison: false, ...o.etat } }); return objets.length - 1 }

  // — Sol, dalle du dépôt, murs bas à bandeau corail, porte au milieu de la façade —
  if (plan && profil) structures.push(...decorBase(ajouter, ajouterFenetre, plan, profil, metierI, zones, objetStructure))
  else {
  ajouter('box', [(DEPOT.x0 + DEPOT.x1) / 2, 0.02, 0], [DEPOT.x1 - DEPOT.x0, 0.04, DEPOT.z1 - DEPOT.z0], COULEURS.dalle)
  ajouter('box', [(PARKING.x0 + PARKING.x1) / 2, 0.015, 0], [PARKING.x1 - PARKING.x0, 0.03, PARKING.z1 - PARKING.z0], '#E7E0D3')
  const mur = (x0: number, z0: number, x1: number, z1: number) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, lx = Math.max(Math.abs(x1 - x0), 0.2), lz = Math.max(Math.abs(z1 - z0), 0.2)
    ajouter('box', [cx, 0.35, cz], [lx, 0.7, lz], COULEURS.mur)
    ajouter('box', [cx, 0.74, cz], [lx + 0.02, 0.08, lz + 0.02], COULEURS.corail)
  }
  mur(DEPOT.x0, DEPOT.z0, DEPOT.x1, DEPOT.z0)
  mur(DEPOT.x0, DEPOT.z0, DEPOT.x0, DEPOT.z1)
  mur(DEPOT.x1, DEPOT.z0, DEPOT.x1, -1.6)
  mur(DEPOT.x1, 1.6, DEPOT.x1, DEPOT.z1)
  mur(DEPOT.x0, DEPOT.z1, -2, DEPOT.z1)
  mur(2, DEPOT.z1, DEPOT.x1, DEPOT.z1)
  // Lignes de zone au sol (corail clair).
  ajouter('box', [0, 0.05, -4.7], [21, 0.02, 0.08], COULEURS.corailClair)
  ajouter('box', [-7.3, 0.05, 3.2], [7.2, 0.02, 0.08], COULEURS.corailClair)
  ajouter('box', [-3.7, 0.05, 5.1], [0.08, 0.02, 3.8], COULEURS.corailClair)
  zones.push({ libelle: 'Dépôt', p: [0, 0.1, -5.2] }, { libelle: 'Bureau', p: [-8.6, 0.1, 6.4] }, { libelle: 'Accueil', p: [0, 0.1, 10.3] }, { libelle: 'Parking', p: [17.2, 0.1, 6.6] }, { libelle: 'Atelier', p: [-3, 0.1, 2.4] })
  }

  // — Accueil : le comptoir, et un colis à la porte par nouvelle demande —
  const demandes = d.demandes.slice(0, LIMITES.colis)
  const auj = d.demandes.filter((x) => (x.recue_le ?? '').slice(0, 10) === d.jour).length
  const oAccueil = objet({
    cle: 'accueil', type: 'accueil', ref: 'accueil', libelle: 'Accueil',
    detail: d.demandes.length ? `${d.demandes.length} nouvelle${d.demandes.length > 1 ? 's' : ''} demande${d.demandes.length > 1 ? 's' : ''}` : 'Aucune nouvelle demande',
    centre: plan ? [plan.accueil.x, 0, plan.accueil.z + 0.6] : [0, 0, 6.2], hauteur: 1.4, epingle: null, etat: { aujourdhui: auj > 0 },
  })
  if (plan) comptoirInfra(ajouter, plan, oAccueil)
  else {
  ajouter('box', [0, 0.55, 5.6], [3.4, 1.1, 0.8], COULEURS.planche, oAccueil)
  ajouter('box', [0, 1.13, 5.6], [3.5, 0.06, 0.86], COULEURS.corail, oAccueil)
  }
  demandes.forEach((x, i) => {
    colis.push({ id: x.id, index: instances.box.length })
    const jourJ = (x.recue_le ?? '').slice(0, 10) === d.jour
    // Avec l'infrastructure, les colis attendent devant la porte de la base dessinée (la même grille, décalée).
    const p: V3 = plan ? [plan.colis.x + (i % 4) * 0.9, 0.18 + Math.floor(i / 8) * 0.34, plan.colis.z + (Math.floor(i / 4) % 2) * 0.6] : [-1.35 + (i % 4) * 0.9, 0.18 + Math.floor(i / 8) * 0.34, 8.1 + (Math.floor(i / 4) % 2) * 0.7]
    ajouter('box', p, [0.6, 0.32, 0.45], jourJ ? COULEURS.corail : COULEURS.blanc, oAccueil)
  })

  // — Bureau : le poste qui bascule vers les vues 2D —
  const oBureau = objet({ cle: 'bureau', type: 'bureau', ref: 'bureau', libelle: 'Bureau', detail: 'Tableau de bord, pipeline, clients', centre: plan ? [plan.bureau.x, 0, plan.bureau.z] : [-8.4, 0, 4.9], hauteur: 1.7, epingle: null })
  if (plan && profil) bureauInfra(ajouter, ajouterFenetre, plan, profil, metierI, oBureau)
  else {
  ajouter('box', [-8.4, 0.4, 4.9], [2.6, 0.8, 1.2], COULEURS.planche, oBureau)
  ajouter('box', [-8.4, 1.22, 4.65], [1.3, 0.78, 0.08], COULEURS.ardoise, oBureau)
  ajouter('box', [-8.4, 1.24, 4.7], [1.12, 0.6, 0.02], COULEURS.corailClair, oBureau)
  ajouter('cyl', [-8.4, 0.35, 5.9], [0.6, 0.7, 0.6], COULEURS.boisFonce, oBureau)
  }

  // — Le poste des assistants (drapeau crmAtelierVivant) : un comptoir près du bureau, dans la zone Bureau du dépôt (x ∈ [-6,4 ; -4,0],
  //   z ∈ [4,4 ; 5,6] : entre le bureau et la ligne de zone x = -3,7, sans toucher à rien). Quatre petits personnages, un par assistant ;
  //   son badge dit combien de choses attendent la validation de l'artisan. Rien n'est posé drapeau baissé. —
  if (options?.vivant) {
    const n = options.vivant.assistants
    const POSTE_ = plan ? plan.poste : POSTE
    const oPoste = objet({
      cle: 'assistants', type: 'assistants', ref: 'assistants', libelle: 'Poste des assistants',
      detail: n > 0 ? `${n} chose${n > 1 ? 's' : ''} à valider` : 'Rien à valider',
      centre: [POSTE_.x, 0, POSTE_.z], hauteur: 1.9, epingle: null,
      badges: n > 0 ? [{ type: 'valider', libelle: `${n} à valider`, gravite: 'info' }] : [],
    })
    ajouter('box', [POSTE_.x, 0.4, POSTE_.z], [2.2, 0.8, 1.1], COULEURS.planche, oPoste)
    ajouter('box', [POSTE_.x, 0.83, POSTE_.z], [2.3, 0.06, 1.2], COULEURS.corail, oPoste)
    ajouter('box', [POSTE_.x, 1.3, POSTE_.z + 0.4], [1.5, 0.5, 0.06], COULEURS.ardoise, oPoste)
    ;[COULEURS.corail, COULEURS.ambre, COULEURS.vert, COULEURS.sauge].forEach((c, k) => {
      const x = POSTE_.x - 0.75 + k * 0.5
      ajouter('cyl', [x, 1.12, POSTE_.z - 0.1], [0.26, 0.5, 0.26], c, oPoste)
      ajouter('sph', [x, 1.48, POSTE_.z - 0.1], [0.28, 0.28, 0.28], COULEURS.blanc, oPoste)
    })
  }

  // — Dépôt : un rayonnage par catégorie d'inventaire —
  const parCat = new Map<string, MateriauA[]>()
  for (const m of d.materiaux) { const k = (m.categorie ?? '').trim() || 'Sans catégorie'; parCat.set(k, [...(parCat.get(k) ?? []), m]) }
  let cats = [...parCat.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'))
  let catsHors = 0
  // L'infrastructure loge moins de rayonnages dans un atelier (5) ou une base légère (4) : le reste se range de même.
  const maxRayonnages = plan ? plan.racks.max : LIMITES.rayonnages
  if (cats.length > maxRayonnages) {
    // Au-delà de dix, les dernières se rangent ensemble — rien n'est perdu, le panneau les liste toutes.
    const reste = cats.slice(maxRayonnages - 1)
    catsHors = reste.length - 1
    cats = [...cats.slice(0, maxRayonnages - 1), ['Autres catégories', reste.flatMap(([, ms]) => ms)]]
  }
  cats.forEach(([nom, ms], i) => {
    const alertes = ms.filter((m) => m.seuil > 0 && m.reste <= m.seuil).length
    const x = plan ? plan.racks.x0 + i * plan.racks.pas : -9.9 + i * 2.2, z = plan ? plan.racks.z : -6.15
    const o = objet({
      cle: `categorie:${nom}`, type: 'categorie', ref: nom, libelle: nom,
      detail: `${ms.length} référence${ms.length > 1 ? 's' : ''}${alertes ? ` · ${alertes} alerte${alertes > 1 ? 's' : ''}` : ''}`,
      centre: [x, 0, z], hauteur: 2.2, epingle: alertes ? COULEURS.corail : null, etat: { stockBas: alertes > 0 },
    })
    if (plan) rayonnageInfra(ajouter, x, z, ms.slice(0, 9).map((m) => (m.seuil > 0 && m.reste <= m.seuil ? COULEURS.corailClair : CARTONS[Math.floor(hacher(m.id) * CARTONS.length)])), alertes > 0, o)
    else {
    const montant = alertes ? COULEURS.corail : COULEURS.pierre
    for (const [dx, dz] of [[-0.9, -0.27], [0.9, -0.27], [-0.9, 0.27], [0.9, 0.27]]) ajouter('box', [x + dx, 1.05, z + dz], [0.08, 2.1, 0.08], montant, o)
    for (const y of [0.12, 0.8, 1.48]) ajouter('box', [x, y, z], [1.9, 0.06, 0.62], COULEURS.planche, o)
    const n = Math.min(ms.length, 9)
    for (let k = 0; k < n; k++) {
      const etage = Math.floor(k / 3), col = k % 3
      const m = ms[k]
      ajouter('box', [x - 0.6 + col * 0.6, 0.15 + etage * 0.68 + 0.2, z], [0.48, 0.4, 0.46], m.seuil > 0 && m.reste <= m.seuil ? COULEURS.corailClair : CARTONS[Math.floor(hacher(m.id) * CARTONS.length)], o)
    }
    }
    if (alertes) pulse.push({ p: [x, 1.1, z], s: [2.15, 2.3, 0.85], r: [0, 0, 0], c: COULEURS.corail, o })
  })

  // — Atelier : l'établi et les accessoires du métier —
  if (plan) {
    // Infrastructure : chaque structure du métier (silo, hangar à bois, boxes…) est UN objet cliquable ; le mobilier du hall reste décor.
    const acc = accessoiresBase(metierI, plan, { camion: !!profil?.gabarits.includes('camion') })
    const parK = new Map<string, typeof acc>()
    for (const a of acc) parK.set(a.k, [...(parK.get(a.k) ?? []), a])
    for (const [k, morceaux] of parK) {
      let o = -1
      if (!DECOR_PUR.includes(k)) {
        const xs = morceaux.flatMap((a) => [a.p[0] - a.s[0] / 2, a.p[0] + a.s[0] / 2]), zs = morceaux.flatMap((a) => [a.p[2] - a.s[2] / 2, a.p[2] + a.s[2] / 2])
        const haut = Math.max(...morceaux.map((a) => a.p[1] + a.s[1] / 2))
        o = objetStructure(k, [(Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2], haut + 0.4)
      }
      for (const a of morceaux) ajouter(a.f, a.p, a.s, a.c, o, a.r)
      if (!structures.includes(k)) structures.push(k)
    }
  } else for (const a of accessoires(prereglage)) ajouter(a.f, a.p, a.s, a.c, -1, a.r)

  // — Chantiers : la petite ville autour du dépôt —
  const resume = calculerAlertes(d)
  const visibles = d.chantiers.filter(chantierVisible)
  // Avec l'infrastructure, la rangée de parcelles qui touchait la base reste libre : une rue de ceinture fait le tour du site.
  const places = plan ? emplacementsChantiers(100000).filter(horsEnclos).slice(0, Math.min(visibles.length, LIMITES.chantiers)) : emplacementsChantiers(Math.min(visibles.length, LIMITES.chantiers))
  const posChantier = new Map<string, V3>()
  const membreParId = new Map(d.membres.map((m) => [m.id, m]))
  visibles.slice(0, places.length).forEach((c, i) => {
    const [x, , z] = places[i]
    const h = hacher(c.id)
    const w = 2.2 + h * 0.8, dd = 2.2 + ((h * 7) % 1) * 0.8, ht = 1.4 + ((h * 13) % 1) * 1.3
    const retard = joursDeRetard(c, d.jour)
    const couleur = couleurEpingle(c, retard)
    const alertes = resume.parChantier.get(c.id) ?? []
    const encaisser = aEncaisser(c)
    const etat: EtatObjet = {
      aujourdhui: estAujourdhui(c, d.jour), retard: !!retard && retard > 0, aFacturer: encaisser,
      stockBas: alertes.some((a) => a.type === 'stock'), livraison: alertes.some((a) => a.type === 'livraison'),
    }
    // Recette du 12/10 : un chantier en cours déjà facturé s'affichait « Terminé · à facturer ».
    const statutTxt = encaisser && c.statut !== 'termine' ? `En cours${c.avancement !== null ? ` · ${c.avancement} %` : ''} · facturé` : encaisser ? 'Terminé · à facturer' : c.statut === 'termine' ? 'Terminé' : etat.retard ? `En retard · ${retard} j` : c.statut === 'en_cours' ? `En cours${c.avancement !== null ? ` · ${c.avancement} %` : ''}` : c.statut === 'planifie' ? 'Planifié' : c.statut === 'en_pause' ? 'En pause' : 'À démarrer'
    const t = c.taches ?? null
    const badges: BadgeObjet[] = alertes.map((a) => ({ type: a.type, gravite: a.gravite, libelle: a.type === 'retard' ? `Retard ${a.jours} j` : a.type === 'livraison' ? 'Livraison en retard' : a.type === 'attendue' ? 'Livraison aujourd’hui' : a.type === 'stock' ? 'Stock à compléter' : a.type === 'facturer' ? 'À facturer' : 'Sans équipe' }))
    if (t && t.total) badges.push({ type: 'taches', gravite: 'info', libelle: `${t.faites}/${t.total} tâches` })
    const info: InfoChantier = {
      equipe: c.equipe.map((id) => membreParId.get(id)).filter((m): m is MembreA => !!m && m.actif).map((m) => ({ id: m.id, nom: m.nom, role: m.role })),
      surPlace: estAujourdhui(c, d.jour), client: c.client,
      taches: t ? { faites: t.faites, total: t.total, faitesAujourdhui: t.faitesAujourdhui } : null,
    }
    const o = objet({ cle: `chantier:${c.id}`, type: 'chantier', ref: c.id, libelle: c.titre, detail: statutTxt, centre: [x, 0, z], hauteur: ht + 1.1 + 1.6, epingle: couleur, etat, badges, info })
    posChantier.set(c.id, [x, 0, z])
    // Avec l'infrastructure, la maison montre le TYPE de travaux du métier et leur avancement (lib/crm/infrastructure.ts).
    // Le sommet (l'épingle et la carte se posent au-dessus) : celui du bâtiment dessiné ; sans infrastructure, `ht + 1.1` comme avant.
    let sommet = ht + 1.1
    if (plan) { sommet = maisonChantier(ajouter, ajouterFenetre, { x, z, w, dd, ht, h, id: c.id, pct: avancementDessine(c), termine: c.statut === 'termine' || c.etape === 'a_facturer', enCours: c.statut === 'en_cours', o, base: plan.base }, metierI) + 0.15; objets[o].hauteur = sommet + 1.6 }
    else {
    ajouter('box', [x, 0.03, z], [4.2, 0.06, 4.2], '#E9E1D3', o)
    ajouter('box', [x, ht / 2 + 0.06, z], [w, ht, dd], MURS_MAISON[Math.floor(h * MURS_MAISON.length)], o)
    ajouter('toit', [x, ht + 0.06 + 0.55, z], [Math.max(w, dd) * 1.45, 1.1, Math.max(w, dd) * 1.45], TOITS[Math.floor(((h * 3) % 1) * TOITS.length)], o, [0, Math.PI / 4, 0])
    ajouter('box', [x, 0.5, z + dd / 2 + 0.01], [0.55, 0.9, 0.04], COULEURS.boisFonce, o) // la porte
    // Échafaudage léger sur un chantier en cours : deux montants et un plancher.
    if (c.statut === 'en_cours') {
      ajouter('box', [x - w / 2 - 0.25, ht / 2, z + dd / 2 + 0.3], [0.06, ht, 0.06], COULEURS.ambre, o)
      ajouter('box', [x + w / 2 + 0.25, ht / 2, z + dd / 2 + 0.3], [0.06, ht, 0.06], COULEURS.ambre, o)
      ajouter('box', [x, ht * 0.62, z + dd / 2 + 0.3], [w + 0.6, 0.05, 0.4], COULEURS.ambre, o)
    }
    }
    const yEp = sommet + 0.95
    ajouter('cone', [x, yEp, z], [0.42, 0.75, 0.42], couleur, o, [Math.PI, 0, 0])
    ajouter('sph', [x, yEp + 0.55, z], [0.62, 0.62, 0.62], couleur, o)
    // Les tâches : une barre au sol devant la maison — le fond gris, la part FAITE en vert (les chiffres exacts sont sur la carte).
    if (t && t.total > 0) {
      const part = Math.min(1, t.faites / t.total), lf = 3.4 * part
      ajouter('box', [x, 0.07, z + 2.95], [3.4, 0.06, 0.26], COULEURS.pierre, o)
      if (lf > 0.01) ajouter('box', [x - 1.7 + lf / 2, 0.1, z + 2.95], [lf, 0.08, 0.26], COULEURS.vert, o)
    }
    // Une urgence : le terrain pulse (calque à part, une seule matière animée).
    if (alertes.some((a) => a.gravite === 'critique')) pulse.push({ p: [x, 0.09, z], s: [5.1, 0.05, 5.1], r: [0, 0, 0], c: COULEURS.corailFonce, o })
    // Une livraison en retard : la palette ATTENDUE, en teinte pâle (elle n'est pas là), un fanion corail foncé planté dessus.
    if (etat.livraison) {
      const px = x - 2.7, pz = z + 0.9
      ajouter('box', [px, 0.08, pz], [1.2, 0.16, 1.2], melanger(COULEURS.bois, COULEURS.sol, 0.5), o)
      for (const [dx, dz, hh] of [[-0.28, -0.28, 0.5], [0.28, -0.28, 0.4], [-0.28, 0.28, 0.4], [0.28, 0.28, 0.55]] as const) ajouter('box', [px + dx, 0.16 + hh / 2, pz + dz], [0.5, hh, 0.5], melanger(CARTONS[Math.floor(hacher(`${c.id}${dx}${dz}`) * CARTONS.length)], COULEURS.sol, 0.55), o)
      ajouter('cyl', [px + 0.5, 0.95, pz - 0.5], [0.07, 1.8, 0.07], COULEURS.ardoise, o)
      ajouter('box', [px + 0.72, 1.62, pz - 0.5], [0.46, 0.3, 0.05], COULEURS.corailFonce, o)
    }
  })

  // — Parking : une camionnette par véhicule actif —
  const vehicules = d.vehicules.filter((v) => v.actif).slice(0, LIMITES.camionnettes)
  if (!plan) for (let i = 0; i <= 4; i++) ajouter('box', [PARKING.x0 + 0.6, 0.04, PARKING.z0 + 0.4 + i * 3.25], [0.05, 0.02, 0.08], COULEURS.blanc) // repères
  vehicules.forEach((v, i) => {
    const chantierDuJour = d.chantiers.find((c) => c.vehicule_id === v.id && estAujourdhui(c, d.jour)) ?? null
    // Avec l'infrastructure : sa place du parking de la base, ou — affectée à un chantier du jour posé sur la maquette — garée le
    // long de ce chantier, sur la rue de droite (sa place reste marquée, vide).
    // Sans local, le premier véhicule EST la base (le camion-atelier) : il reste à sa place, portes ouvertes.
    const atelierRoulant = plan?.base === 'camion' && i === 0
    const garee = plan && chantierDuJour && !atelierRoulant ? posChantier.get(chantierDuJour.id) ?? null : null
    const gab = profil ? profil.gabarits[d.vehicules.filter((vv) => vv.actif).indexOf(v)] ?? 'fourgonnette' : 'fourgonnette'
    const place = plan && profil ? placeParking(plan, i, profil.gabarits) : null
    const [x, z] = plan ? (garee ? [garee[0] + 2.8, garee[2] - 0.3] : [place![0], place![1]]) : [14.6 + (i % 2) * 4.6, -5.2 + Math.floor(i / 2) * 3.3]
    const o = objet({
      cle: `vehicule:${v.id}`, type: 'vehicule', ref: v.id, libelle: v.nom,
      detail: [v.immatriculation, chantierDuJour ? `→ ${chantierDuJour.titre}` : null].filter(Boolean).join(' · ') || 'Au dépôt',
      centre: [x, 0, z], hauteur: 1.9, epingle: null, etat: { aujourdhui: !!chantierDuJour },
    })
    if (plan) {
      const sens = garee ? 'z' : place![2], lg = gab === 'camion' ? 5.4 : 3.9, la = gab === 'camion' ? 2.9 : 2.6
      if (!garee && !atelierRoulant) ajouter('box', [x, 0.05, z], sens === 'x' ? [lg, 0.02, la] : [la, 0.02, lg], '#E1D9CB', o)
      camionnette(ajouter, ajouterFenetre, x, z, sens, o, metierI, gab, atelierRoulant)
      return
    }
    ajouter('box', [x, 0.05, z], [3.9, 0.02, 2.6], '#E1D9CB', o) // la place
    ajouter('box', [x - 0.25, 0.85, z], [2.3, 1.1, 1.25], COULEURS.blanc, o)
    ajouter('box', [x + 1.25, 0.68, z], [0.9, 0.76, 1.22], '#E3DDD2', o)
    ajouter('box', [x + 1.55, 0.86, z], [0.32, 0.36, 1.16], COULEURS.vitre, o)
    ajouter('box', [x - 0.25, 0.75, z + 0.63], [2.3, 0.12, 0.02], COULEURS.corail, o)
    ajouter('box', [x - 0.25, 0.75, z - 0.63], [2.3, 0.12, 0.02], COULEURS.corail, o)
    for (const [dx, dz] of [[-0.85, 0.62], [0.95, 0.62], [-0.85, -0.62], [0.95, -0.62]]) ajouter('cyl', [x + dx, 0.28, z + dz], [0.52, 0.2, 0.52], COULEURS.ardoise, o, [Math.PI / 2, 0, 0])
  })

  // — Équipe : un personnage par membre actif, sur son chantier du jour, sinon à l'atelier —
  const membres = d.membres.filter((m) => m.actif).slice(0, LIMITES.personnages)
  let aLAtelier = 0
  const surPlace = new Map<string, number>()
  membres.forEach((m, rang) => {
    const chantier = d.chantiers.find((c) => c.equipe.includes(m.id) && estAujourdhui(c, d.jour) && posChantier.has(c.id)) ?? null
    let x: number, z: number
    if (chantier) { const p = posChantier.get(chantier.id)!; const k = surPlace.get(chantier.id) ?? 0; surPlace.set(chantier.id, k + 1); x = p[0] + 1.6 - (k % 4) * 0.6; z = p[2] + 2.0 + Math.floor(k / 4) * 0.6 }
    else if (plan) { [x, z] = placeRepos(plan, aLAtelier); aLAtelier++ }
    else { x = 2.6 + (aLAtelier % 4) * 1.15; z = -2.4 + Math.floor(aLAtelier / 4) * 1.3; aLAtelier++ }
    const o = objet({ cle: `membre:${m.id}`, type: 'membre', ref: m.id, libelle: m.nom, detail: chantier ? `Aujourd’hui : ${chantier.titre}` : 'À l’atelier', centre: [x, 0, z], hauteur: 1.8, epingle: null, etat: { aujourdhui: !!chantier } })
    if (plan) {
      // Un personnage affecté à un chantier du jour part de la base et marche jusqu'à lui (Scene3D anime le trajet ; la position posée
      // est l'arrivée). Il part d'une place de repos après celles des présents, pour ne croiser personne au départ.
      const morceaux = personnage(ajouter, x, z, ROLES[m.role] ?? ROLES.autre, o, m.role === 'artisan')
      if (chantier) { const de = placeRepos(plan, membres.length + rang); const pc = posChantier.get(chantier.id)!; const chemin = cheminVers(plan, de, [x, z], [pc[0], pc[2]]); const ordre = new Set(mobiles.map((mb) => mb.vers.join())).size; for (const mc of morceaux) mobiles.push({ ...mc, de, porte: plan.chemin[0] as [number, number], vers: [x, z], ordre, chemin }) }
      return
    }
    ajouter('cyl', [x, 0.55, z], [0.46, 1.1, 0.46], ROLES[m.role] ?? ROLES.autre, o)
    ajouter('sph', [x, 1.32, z], [0.36, 0.36, 0.36], COULEURS.peau, o)
  })

  // — Décor : quelques arbres, toujours aux mêmes endroits —
  for (const [x, z] of [[-13.5, 9.5], [13.5, 9.6], [24, -8.5], [24, 8.6], [-13.6, -9.4], [6.5, 9.8], [-6.5, 9.8]]) {
    ajouter('cyl', [x, 0.4, z], [0.18, 0.8, 0.18], COULEURS.tronc)
    ajouter('sph', [x, 1.25, z], [1.15, 1.15, 1.15], COULEURS.sauge)
  }

  const tout = FORMES.flatMap((f) => instances[f])
  const min: V3 = [Infinity, 0, Infinity], max: V3 = [-Infinity, 0, -Infinity]
  for (const it of tout) { min[0] = Math.min(min[0], it.p[0] - it.s[0] / 2); min[2] = Math.min(min[2], it.p[2] - it.s[2] / 2); max[0] = Math.max(max[0], it.p[0] + it.s[0] / 2); max[2] = Math.max(max[2], it.p[2] + it.s[2] / 2); max[1] = Math.max(max[1], it.p[1] + it.s[1] / 2) }

  // — La ville : routes entre les parcelles, parcs et terrains vides sur les parcelles libres. Décor pur (aucun objet cliquable,
  //   rien de vos données) : ajouté APRÈS le calcul des bornes, le cadrage de la caméra ne dépend que de ce qui est posé. —
  if (plan) decorVille(ajouter, places.length, { campusZ: 14, libres: emplacementsChantiers(100000).filter(horsEnclos).slice(places.length) })
  else decorVille(ajouter, places.length)

  return {
    instances, pulse, objets, zones, bornes: { min, max }, prereglage,
    ...(options?.vivant ? { colis } : {}),
    ...(profil && plan ? { infra: { profil, base: plan.base, auto: !profil.declare, cible: plan.cible, structures, metier: metierI }, fenetres, mobiles } : {}),
    horsScene: {
      chantiers: Math.max(0, visibles.length - places.length), categories: catsHors,
      vehicules: Math.max(0, d.vehicules.filter((v) => v.actif).length - vehicules.length), demandes: Math.max(0, d.demandes.length - demandes.length),
    },
  }
}

type Ajouter = (f: Forme, p: V3, s: V3, c: string, o?: number, r?: V3) => void
const ROUTE = '#DDD5C7'
/**
 * La ville autour du dépôt : une trame de routes entre les parcelles (coupée autour du dépôt et du parking), et sur chaque
 * parcelle que PERSONNE n'occupe — un parc, des arbres, ou rien. Stable : tout se tire d'un hachage de la position, jamais du hasard.
 */
// `infra` (drapeau crmAtelierVivant) : la rue de ceinture (z = ±14) reste tracée autour de la base, et les parcelles libres sont celles
// hors de l'enclos. Absent : la ville d'avant, à l'identique.
function decorVille(ajouter: Ajouter, utilises: number, infra?: { campusZ: number; libres: V3[] }) {
  const r1 = (v: number) => Math.round(v * 10) / 10
  const xs: number[] = [], zs: number[] = []
  for (let x = -33.6; x <= 39.2; x += 5.6) xs.push(r1(x))
  for (let z = -28; z <= 30.8; z += 5.6) zs.push(r1(z))
  const x0 = r1(xs[0] - 2.8), x1 = r1(xs[xs.length - 1] + 2.8), z0 = r1(zs[0] - 2.8), z1 = r1(zs[zs.length - 1] + 2.8)
  const campus = { x0: DEPOT.x0 - 1.8, x1: PARKING.x1 + 1.8, z: infra ? infra.campusZ : 11.6 }
  const segH = (z: number, a: number, b: number) => { if (b - a > 0.5) ajouter('box', [(a + b) / 2, 0.03, z], [b - a, 0.03, 1.1], ROUTE) }
  const segV = (x: number, a: number, b: number) => { if (b - a > 0.5) ajouter('box', [x, 0.03, (a + b) / 2], [1.1, 0.03, b - a], ROUTE) }
  for (const z of [r1(zs[0] - 2.8), ...zs.map((v) => r1(v + 2.8))]) {
    if (Math.abs(z) < campus.z) { segH(z, x0, campus.x0); segH(z, campus.x1, x1) } else segH(z, x0, x1)
  }
  for (const x of [r1(xs[0] - 2.8), ...xs.map((v) => r1(v + 2.8))]) {
    if (x > campus.x0 && x < campus.x1) { segV(x, z0, -campus.z); segV(x, campus.z, z1) } else segV(x, z0, z1)
  }
  for (const [x, , z] of infra ? infra.libres : emplacementsChantiers(100000).slice(utilises)) {
    const h = hacher(`ville:${x}:${z}`)
    const arbre = (dx: number, dz: number, k: number) => {
      ajouter('cyl', [x + dx, 0.4 * k, z + dz], [0.18, 0.8 * k, 0.18], COULEURS.tronc)
      ajouter('sph', [x + dx, 1.25 * k, z + dz], [1.15 * k, 1.15 * k, 1.15 * k], COULEURS.sauge)
    }
    if (h < 0.42) arbre(0, 0, 0.8 + ((h * 9) % 1) * 0.5)
    else if (h < 0.62) { arbre(-0.9, -0.7, 0.9); arbre(0.9, 0.8, 0.75) }
    else if (h < 0.78) { ajouter('box', [x, 0.035, z], [3.8, 0.05, 3.8], melanger(COULEURS.sauge, COULEURS.sol, 0.55)); arbre(0.5, 0.3, 0.85) }
  }
}

type Acc = { f: Forme; p: V3; s: V3; c: string; r: V3 }
/** Les accessoires de l'atelier selon le métier (zone x ∈ [-8, 1], z ∈ [-3.6, 1.8]). Toujours l'établi. */
export function accessoires(p: Prereglage): Acc[] {
  const a: Acc[] = []
  const b = (pp: V3, s: V3, c: string, r: V3 = [0, 0, 0]) => a.push({ f: 'box', p: pp, s, c, r })
  const cyl = (pp: V3, s: V3, c: string, r: V3 = [0, 0, 0]) => a.push({ f: 'cyl', p: pp, s, c, r })
  // L'établi.
  b([-3.2, 0.9, -2.9], [3.2, 0.1, 1.0], COULEURS.bois)
  for (const [dx, dz] of [[-1.45, -0.4], [1.45, -0.4], [-1.45, 0.4], [1.45, 0.4]]) b([-3.2 + dx, 0.43, -2.9 + dz], [0.1, 0.86, 0.1], COULEURS.boisFonce)
  const palette = (x: number, z: number) => b([x, 0.08, z], [1.2, 0.16, 1.0], COULEURS.bois)
  switch (p) {
    case 'plombier':
      for (let i = 0; i < 6; i++) cyl([-6.4, 0.25 + (i % 3) * 0.22, -1.2 + Math.floor(i / 3) * 0.3], [0.16, 3.2, 0.16], i % 2 ? '#C58A5C' : COULEURS.pierre, [0, 0, Math.PI / 2])
      b([-6.4, 0.1, -1.05], [3.4, 0.08, 0.9], COULEURS.boisFonce)
      for (let i = 0; i < 3; i++) b([-0.8 + i * 0.7, 0.3, 0.6], [0.55, 0.6, 0.45], COULEURS.blanc) // cartons de raccords
      cyl([-1.2, 0.5, -2.9], [0.5, 1.0, 0.5], COULEURS.blanc) // chauffe-eau
      break
    case 'chauffagiste':
      for (let i = 0; i < 3; i++) b([-6.8 + i * 1.2, 0.6, -1.0], [0.8, 1.2, 0.6], COULEURS.blanc) // chaudières
      for (let i = 0; i < 2; i++) b([-6.2 + i * 1.6, 0.45, 0.8], [1.3, 0.8, 0.12], '#E3DDD2') // radiateurs
      for (let i = 0; i < 4; i++) cyl([-1.0 + i * 0.4, 0.15, 0.9], [0.14, 2.0, 0.14], '#C58A5C', [Math.PI / 2, 0, 0])
      break
    case 'electricien':
      for (let i = 0; i < 4; i++) {
        const x = -7.2 + i * 1.3
        cyl([x, 0.55, -0.9], [1.1, 0.7, 1.1], COULEURS.bois, [Math.PI / 2, 0, 0]) // tourets de câble
        cyl([x, 0.55, -0.9], [0.75, 0.72, 0.75], i % 2 ? COULEURS.corail : COULEURS.ardoise, [Math.PI / 2, 0, 0])
      }
      b([-1.2, 0.6, 0.5], [1.4, 1.2, 0.4], COULEURS.pierre) // armoire de chantier
      b([-1.2, 0.95, 0.31], [1.0, 0.4, 0.02], COULEURS.corailClair)
      break
    case 'menuisier':
      cyl([-3.2, 1.1, -2.9], [0.6, 0.03, 0.6], COULEURS.pierre, [Math.PI / 2, 0, 0]) // lame de scie
      b([-3.2, 1.0, -2.9], [0.6, 0.1, 0.4], COULEURS.ardoise)
      for (let i = 0; i < 5; i++) b([-6.6, 0.1 + i * 0.12, -0.6], [3.0, 0.1, 0.32], i % 2 ? COULEURS.bois : '#D6B898') // planches
      for (let i = 0; i < 3; i++) b([-0.8 + i * 0.75, 0.42, 0.7], [0.6, 0.85, 0.6], '#D6B898') // caissons
      break
    case 'macon':
      for (let k = 0; k < 2; k++) { palette(-7.2 + k * 1.6, -0.8); for (let i = 0; i < 6; i++) b([-7.5 + k * 1.6 + (i % 2) * 0.55, 0.32 + Math.floor(i / 2) * 0.26, -0.8], [0.5, 0.24, 0.9], COULEURS.pierre) }
      cyl([-1.2, 0.7, 0.4], [1.0, 1.1, 1.0], COULEURS.corail, [0.5, 0, 0.4]) // bétonnière
      cyl([-1.2, 0.3, 0.4], [0.2, 0.6, 0.2], COULEURS.ardoise)
      for (let i = 0; i < 4; i++) b([-4.2 + i * 0.5, 0.25, 0.9], [0.4, 0.5, 0.3], '#E2D2B8') // sacs
      break
    case 'couvreur':
      for (let k = 0; k < 2; k++) { palette(-7.2 + k * 1.6, -0.8); for (let i = 0; i < 4; i++) b([-7.2 + k * 1.6, 0.24 + i * 0.13, -0.8], [1.05, 0.11, 0.85], '#C2734E') } // palettes de tuiles
      b([-1.2, 1.4, 0.4], [0.5, 2.8, 0.06], COULEURS.bois, [0.25, 0, 0]) // échelle
      for (let i = 0; i < 3; i++) cyl([-3.8 + i * 0.6, 0.12, 0.9], [0.5, 0.24, 0.5], '#B9B2A6') // rouleaux de zinc
      break
    case 'carreleur':
      for (let k = 0; k < 3; k++) for (let i = 0; i < 5; i++) b([-7.3 + k * 1.2, 0.07 + i * 0.12, -0.8], [0.9, 0.1, 0.9], k === 1 ? COULEURS.planche : COULEURS.pierre) // piles de carreaux
      for (let i = 0; i < 3; i++) cyl([-1.4 + i * 0.6, 0.25, 0.6], [0.45, 0.5, 0.45], i === 1 ? COULEURS.corailClair : COULEURS.blanc) // seaux de colle
      break
    case 'peintre':
      for (let i = 0; i < 8; i++) cyl([-7.4 + (i % 4) * 0.7, 0.24 + Math.floor(i / 4) * 0.5, -0.8], [0.5, 0.46, 0.5], ['#E8946F', '#D9C3A0', '#A9C29B', '#CFC6B8'][i % 4]) // pots
      b([-1.6, 0.9, 0.4], [0.9, 1.8, 0.06], COULEURS.pierre, [0.2, 0, 0]) // escabeau
      b([-1.6, 0.9, 0.9], [0.9, 1.8, 0.06], COULEURS.pierre, [-0.2, 0, 0])
      break
    default:
      for (let i = 0; i < 4; i++) b([-7.0 + i * 1.0, 0.35, -0.8], [0.8, 0.7, 0.7], CARTONS[i % CARTONS.length])
      palette(-1.4, 0.5)
  }
  return a
}

// ── Filtres de la barre du haut ──────────────────────────────────────────────────────────────────────────────
export const FILTRES = ['aujourdhui', 'retard', 'livraison', 'a_facturer', 'stock_bas'] as const
export type Filtre = (typeof FILTRES)[number]
export const LIBELLES_FILTRE: Record<Filtre, string> = { aujourdhui: 'Aujourd’hui', retard: 'En retard', livraison: 'Livraisons', a_facturer: 'À facturer', stock_bas: 'Stock bas' }
/** Les objets qu'un filtre allume (les autres s'estompent). Sans filtre : tous. */
export function objetsAllumes(objets: readonly ObjetScene[], filtre: Filtre | null): Set<number> {
  const s = new Set<number>()
  objets.forEach((o, i) => {
    const garde = !filtre ? true
      : filtre === 'aujourdhui' ? o.etat.aujourdhui
        : filtre === 'retard' ? o.etat.retard
          : filtre === 'livraison' ? o.etat.livraison
            : filtre === 'a_facturer' ? o.etat.aFacturer
              : o.etat.stockBas
    if (garde) s.add(i)
  })
  return s
}
export function compteFiltres(objets: readonly ObjetScene[]): Record<Filtre, number> {
  return Object.fromEntries(FILTRES.map((f) => [f, objetsAllumes(objets, f).size])) as Record<Filtre, number>
}
/**
 * Les chiffres des boutons de la barre. « Deux chiffres, un écran » : ce sont ceux du TABLEAU DE BORD (retards, stock bas) et de
 * la commande fournisseur, pas un décompte d'objets de la maquette — un rayonnage peut porter cinq matériaux sous leur seuil, et
 * un chantier hors des 30 emplacements reste en retard. Seul « Aujourd'hui » compte des objets posés.
 */
export function chiffresFiltres(scene: Scene, d: DonneesAtelier): Record<Filtre, number> {
  const c = calculerAlertes(d).chiffres
  return { aujourdhui: compteFiltres(scene.objets).aujourdhui, retard: c.retards, livraison: c.livraisonsEnRetard, a_facturer: c.aFacturer, stock_bas: c.stockBas }
}

/** Mélange une couleur vers une autre (t = 0 → a, 1 → b). « #rrggbb » seulement. */
export function melanger(a: string, b: string, t: number): string {
  const x = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  return '#' + [0, 1, 2].map((i) => Math.round(x(a, i) + (x(b, i) - x(a, i)) * t).toString(16).padStart(2, '0')).join('')
}

// ── J4 : préparer la commande fournisseur ────────────────────────────────────────────────────────────────────
export type LigneCommande = { materiau_id: string; nom: string; unite: string; reste: number; seuil: number; quantite: number; prix_vu_ht: number | null; prix_vu_le: string | null; prixAVerifier: boolean }
export type Commande = { fournisseur: string; contact: string | null; lignes: LigneCommande[] }

/**
 * Ce qui est sous son seuil, regroupé par fournisseur préféré. La quantité PROPOSÉE ramène le stock au double du seuil
 * (arrondie à l'unité supérieure) : c'est une proposition, l'artisan la change avant d'envoyer quoi que ce soit. Un prix vu
 * de plus de 30 jours est marqué « à revérifier » (règle de l'inventaire, lib/inventaire/CONTEXT.md). Rien n'est envoyé ici.
 */
export function preparerCommande(materiaux: readonly MateriauA[], jour: string): Commande[] {
  const parF = new Map<string, Commande>()
  const t0 = Date.UTC(+jour.slice(0, 4), +jour.slice(5, 7) - 1, +jour.slice(8, 10))
  for (const m of materiaux) {
    if (!(m.seuil > 0) || m.reste > m.seuil) continue
    const f = (m.fournisseur ?? '').trim() || 'Fournisseur à choisir'
    const c = parF.get(f) ?? { fournisseur: f, contact: m.fournisseur_contact ?? null, lignes: [] }
    const vu = m.prix_vu_le ? Date.parse(m.prix_vu_le) : NaN
    c.lignes.push({
      materiau_id: m.id, nom: m.nom, unite: m.unite || 'u', reste: m.reste, seuil: m.seuil,
      quantite: Math.max(1, Math.ceil(2 * m.seuil - Math.max(0, m.reste))),
      prix_vu_ht: m.prix_vu_ht, prix_vu_le: m.prix_vu_le, prixAVerifier: m.prix_vu_ht !== null && (!Number.isFinite(vu) || (t0 - vu) / 86_400_000 > 30),
    })
    if (!c.contact && m.fournisseur_contact) c.contact = m.fournisseur_contact
    parF.set(f, c)
  }
  return [...parF.values()].sort((a, b) => (a.fournisseur === 'Fournisseur à choisir' ? 1 : b.fournisseur === 'Fournisseur à choisir' ? -1 : a.fournisseur.localeCompare(b.fournisseur, 'fr')))
    .map((c) => ({ ...c, lignes: c.lignes.sort((x, y) => x.nom.localeCompare(y.nom, 'fr')) }))
}

/** Le texte de la commande, prêt à copier : quantités, unités, références — aucun prix inventé (seuls les prix vus, datés). */
export function texteCommande(c: Commande, quantites: Record<string, number>, signature: string | null): string {
  const lignes = c.lignes.map((l) => `- ${quantites[l.materiau_id] ?? l.quantite} ${l.unite} · ${l.nom}`)
  return [`Bonjour,`, ``, `Je souhaite commander :`, ...lignes, ``, `Merci de me confirmer la disponibilité et le délai.`, ...(signature ? [``, signature] : [])].join('\n')
}

// ── Assemblage des données de la maquette à partir des lignes de la base (appelé par GET /api/crm/vue) ─────
type Nb = number | string | null | undefined
type Four = { nom?: string | null; contact?: string | null }
// PostgREST rend une relation « plusieurs vers un » en objet ; sans schéma typé, le client la croit tableau : on accepte les deux.
const unSeul = (f: Four | Four[] | null | undefined): Four | null => (Array.isArray(f) ? f[0] ?? null : f ?? null)
const nb = (v: Nb): number => { const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN; return Number.isFinite(n) ? n : 0 }
export function assemblerAtelier(e: {
  jour: string
  metier: string | null
  chantiers: readonly { id: string; titre: string; statut: string; date_debut: string | null; date_fin_prevue: string | null; vehicule_id: string | null; client_nom?: string | null; devis_id?: string | null }[]
  /** Les cartes du pipeline (lib/crm/pipeline.ts) : l'étape de chaque chantier et les demandes sans devis. */
  cartes: readonly { objet: string; id: string; etape: string; titre: string; client: string | null; chantierId: string | null; depuis: string | null }[]
  taches: readonly { id?: string; chantier_id: string; faite: boolean | null; libelle?: string | null; faite_le?: string | null; membre_id?: string | null; ordre?: number | null }[]
  /** Les matériaux réservés (chantier_materiaux) ; seules les réservations au statut « reserve » comptent. */
  reservations?: readonly { chantier_id: string; materiau_id: string; quantite?: Nb; statut?: string | null }[]
  commandes?: readonly CommandeA[]
  commandesDisponibles?: boolean
  equipe: readonly { chantier_id: string; membre_id: string }[]
  materiaux: readonly { id: string; nom: string; unite?: string | null; categorie?: string | null; seuil_alerte?: Nb; stock?: { quantite?: Nb }[] | null; fournisseur_prefere?: string | null; fournisseur?: Four | Four[] | null; prix_vu_ht?: Nb; prix_vu_le?: string | null }[]
  vehicules: readonly VehiculeA[]
  membres: readonly MembreA[]
  /** Drapeau crmAtelierVivant seulement (lib/crm/vue.ts) : la forme juridique de la fiche ; absente, rien n'est ajouté. */
  formeJuridique?: string | null
  /** Même drapeau : le nom et la ville de la fiche. */
  entreprise?: { nom: string | null; ville: string | null }
}): DonneesAtelier {
  const etapeChantier = new Map<string, string>()
  const clientChantier = new Map<string, string | null>()
  for (const c of e.cartes) if (c.chantierId) { etapeChantier.set(c.chantierId, c.etape); clientChantier.set(c.chantierId, c.client) }
  const taches = new Map<string, { t: number; f: number; auj: number; ouvertes: { id: string; libelle: string; membre_id: string | null; ordre: number }[] }>()
  for (const t of e.taches) {
    const x = taches.get(t.chantier_id) ?? { t: 0, f: 0, auj: 0, ouvertes: [] }
    x.t++
    if (t.faite) {
      x.f++
      if (t.faite_le && !Number.isNaN(Date.parse(t.faite_le)) && jourParis(new Date(t.faite_le)) === e.jour) x.auj++
    } else if (t.id) x.ouvertes.push({ id: t.id, libelle: (t.libelle ?? '').trim() || 'Tâche', membre_id: t.membre_id ?? null, ordre: Number.isFinite(Number(t.ordre)) ? Number(t.ordre) : 0 })
    taches.set(t.chantier_id, x)
  }
  const equipe = new Map<string, string[]>()
  for (const l of e.equipe) equipe.set(l.chantier_id, [...(equipe.get(l.chantier_id) ?? []), l.membre_id])
  return {
    jour: e.jour, metier: e.metier,
    ...(e.formeJuridique !== undefined ? { formeJuridique: e.formeJuridique } : {}),
    ...(e.entreprise !== undefined ? { entreprise: e.entreprise } : {}),
    chantiers: e.chantiers.map((c) => {
      const t = taches.get(c.id)
      return {
        id: c.id, titre: c.titre, client: clientChantier.get(c.id) ?? c.client_nom ?? null, statut: c.statut, etape: etapeChantier.get(c.id) ?? null,
        avancement: t && t.t ? Math.round((t.f / t.t) * 100) : null, date_debut: c.date_debut, date_fin_prevue: c.date_fin_prevue,
        vehicule_id: c.vehicule_id, equipe: equipe.get(c.id) ?? [],
        taches: {
          total: t?.t ?? 0, faites: t?.f ?? 0, faitesAujourdhui: t?.auj ?? 0,
          ouvertes: [...(t?.ouvertes ?? [])].sort((a, b) => a.ordre - b.ordre || a.id.localeCompare(b.id)).slice(0, 8).map(({ id, libelle, membre_id }) => ({ id, libelle, membre_id })),
        },
      }
    }),
    materiaux: e.materiaux.map((m) => ({
      id: m.id, nom: m.nom, unite: m.unite || 'u', categorie: m.categorie ?? null,
      reste: Math.round((m.stock ?? []).reduce((s, l) => s + nb(l.quantite), 0) * 100) / 100, seuil: nb(m.seuil_alerte),
      fournisseur: unSeul(m.fournisseur)?.nom ?? m.fournisseur_prefere ?? null, fournisseur_contact: unSeul(m.fournisseur)?.contact ?? null,
      prix_vu_ht: m.prix_vu_ht === null || m.prix_vu_ht === undefined ? null : nb(m.prix_vu_ht), prix_vu_le: m.prix_vu_le ?? null,
    })),
    reservations: (e.reservations ?? []).filter((r) => r.statut === undefined || r.statut === null || r.statut === 'reserve').map((r) => ({ chantier_id: r.chantier_id, materiau_id: r.materiau_id, quantite: nb(r.quantite) })).filter((r) => r.quantite > 0),
    commandes: [...(e.commandes ?? [])],
    commandesDisponibles: e.commandesDisponibles ?? true,
    vehicules: [...e.vehicules],
    membres: [...e.membres],
    demandes: e.cartes.filter((c) => c.objet === 'lead' && c.etape === 'demande').map((c) => ({ id: c.id, titre: c.titre, client: c.client, recue_le: c.depuis && !Number.isNaN(Date.parse(c.depuis)) ? jourParis(new Date(c.depuis)) : null })),
  }
}
