// CRM — l'INFRASTRUCTURE de l'atelier vivant (drapeau crmAtelierVivant, 20/10/2026) : la maquette 3D s'adapte à l'artisan.
// Module PUR (aucun réseau, aucune base, aucun three) : des données de la scène en entrée, des formes simples en sortie ; dessiné
// par app/crm/atelier/Scene3D.tsx, rejoué par scripts/crm-atelier3d-qa.mjs. Drapeau baissé, rien d'ici n'est appelé : la scène est
// celle d'avant, à l'identique (construireScene sans l'option `infra`).
//
//  1. PROFIL : équipe, statut (à son compte / société), gabarit de chaque véhicule, stock, commandes → le LIEU (« de chez moi »,
//     atelier, entrepôt, ou sans local — tout dans le camion). Le lieu DÉCLARÉ par l'artisan (réglage gardé dans son navigateur)
//     prime sur la déduction.
//  2. LA BASE, chacune avec SES bâtiments et SON plan de masse (lot 2, retour de Benj du 20/10 : « il faut des structures
//     différentes ») : la maison de l'artisan et son garage ouvert ; un bâtiment d'atelier avec porte sectionnelle, auvent, cour et
//     bureau accolé ; un hangar à bardage avec quais, bureaux en étage, clôture et portail ; ou le camion-atelier ouvert, seul.
//     Convention de maquette « en coupe » (comme les références) : murs du fond pleins, murs face à la caméra bas, toits sur la
//     moitié du fond — la silhouette se lit, l'intérieur reste visible et cliquable.
//  3. LE MÉTIER SE VOIT : des STRUCTURES propres au métier dehors (hangar à bois et silo à copeaux, cour de matériaux et silo à
//     mortier, hangar haut et monte-matériaux, auvent à tourets, abri à tubes et PAC exposées, cabine de peinture, auvent à
//     palettes filmées…) et des CHANTIERS de types différents (immeubles et commerces, grandes toitures, extensions en
//     construction, maisons en coupe) qui montrent l'avancement.
//  4. JOUR / NUIT : l'heure de Paris choisit la lumière ; le soir, les fenêtres s'allument (calque « fenêtres », un seul appel de dessin).
//
// Règle : JAMAIS un décor qui suggère un équipement que l'artisan n'a pas — pas de rayonnage sans stock, pas de vestiaire pour un
// artisan seul, une place par véhicule à son gabarit, le camion de livraison seulement s'il y a des commandes attendues.
// Palette : celle de la maquette (lib/crm/atelier.ts, COULEURS) — crème, pierre, bois, corail ; ni bleu, ni rouge vif. Recopiée
// ici (types seulement importés d'atelier.ts : aucun cycle de modules).

import type { DonneesAtelier, Forme, Inst, Prereglage, V3 } from './atelier.ts'

// ── 1. Le profil d'infrastructure ───────────────────────────────────────────────────────────────────────────────
export type Equipe = 'solo' | 'petite' | 'equipe'
export type Stock = 'aucun' | 'petit' | 'grand'
/** Le lieu de travail : « de chez moi » (base légère), un atelier, un entrepôt, ou pas de local (tout dans le camion). */
export type Base = 'legere' | 'atelier' | 'entrepot' | 'camion'
export const BASES: readonly Base[] = ['legere', 'atelier', 'entrepot', 'camion']
export const LIBELLES_BASE: Record<Base, string> = { legere: 'Base légère', atelier: 'Atelier', entrepot: 'Entrepôt', camion: 'Camion-atelier' }
/** Ce que l'artisan déclare dans le sélecteur de l'atelier. */
export const LIBELLES_LIEU: Record<Base, string> = { legere: 'Je travaille de chez moi', atelier: 'J’ai un atelier', entrepot: 'J’ai un entrepôt', camion: 'Pas de local (tout dans le camion)' }
export type Statut = 'a_son_compte' | 'societe'
export type Gabarit = 'voiture' | 'fourgonnette' | 'fourgon' | 'camion'
export type Profil = {
  equipe: Equipe; membres: number; vehicules: number; gabarits: Gabarit[]; stock: Stock
  categories: number; references: number; commandesEnCours: number; chantiers: number
  statut: Statut; base: Base
  /** La base que les données suggèrent (le lieu déclaré peut la remplacer). */
  baseDeduite: Base
  /** Vrai si l'artisan a déclaré son lieu (« choisi par vous ») ; faux : « déduit de vos données ». */
  declare: boolean
}

/** Les seuils du profil. Chacun dit pourquoi il est là ; ils ne viennent d'aucune statistique, ils découpent la maquette. */
export const SEUILS = {
  /** 2 personnes actives et plus : une petite équipe (le brief : « petite » = 2 à 4). */
  petiteEquipe: 2,
  /** 5 personnes actives et plus : une équipe — il lui faut un vestiaire et un vrai dépôt. */
  equipe: 5,
  /** Stock « grand » à partir de 6 catégories : l'atelier loge une rangée de 5 rayonnages, la sixième ne tient plus. */
  grandStockCategories: 6,
  /** … ou à partir de 25 références, quel que soit leur rangement. */
  grandStockReferences: 25,
  /** Commandes fournisseur ATTENDUES (ni reçues ni annulées) à partir desquelles un petit stock reçoit comme un dépôt. */
  commandesEnCours: 4,
  /** 3 véhicules actifs et plus : il faut un parking, pas une place devant un bureau. */
  parcAtelier: 3,
} as const

/**
 * Le gabarit d'un véhicule, DÉDUIT DE SON NOM (la fiche véhicule n'a pas de type) :
 *  • camion       : « camion » (mot entier : « camionnette » n'en est pas un), benne, porteur, plateau, poids lourd, « 3,5 t » ;
 *  • fourgon      : les grands utilitaires — Trafic, Master, Jumper, Boxer, Ducato, Sprinter, Crafter, Transit, Vivaro, Movano, Daily, « fourgon » ;
 *  • voiture      : quelques citadines et berlines courantes, ou le mot « voiture » ;
 *  • fourgonnette : Kangoo, Berlingo, Partner, Caddy, Doblo, Combo, Citan, Rifter, « camionnette », « utilitaire »… et tout le reste
 *                   (le cas le plus fréquent chez un artisan : un utilitaire léger).
 */
export function gabaritDe(nom: string | null | undefined): Gabarit {
  const t = (nom ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/\bcamion\b|\bbenne\b|\bporteur\b|\bplateau\b|poids lourd|\b3[,.]5\s?t\b/.test(t)) return 'camion'
  if (/\bfourgon\b|\btrafic\b|\bmaster\b|\bjumper\b|\bboxer\b|\bducato\b|\bsprinter\b|\bcrafter\b|\btransit\b|\bvivaro\b|\bmovano\b|\bdaily\b/.test(t)) return 'fourgon'
  if (/\bvoiture\b|\bclio\b|\btwingo\b|\bmegane\b|\b208\b|\b308\b|\bgolf\b|\bpolo\b|\byaris\b|\bc3\b|\bzoe\b/.test(t)) return 'voiture'
  return 'fourgonnette'
}
/**
 * Le statut : « à son compte » si la forme juridique est individuelle (EI, EIRL, micro-entreprise, auto-entrepreneur, entreprise
 * individuelle), OU si l'artisan travaille seul ; « société » sinon (SARL, SAS, EURL avec salariés…). Sans forme connue : l'équipe tranche.
 */
export function statutDe(formeJuridique: string | null | undefined, membresActifs: number): Statut {
  const t = (formeJuridique ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/\bei\b|\beirl\b|micro|auto[- ]?entrepre|entreprise individuelle/.test(t)) return 'a_son_compte'
  return membresActifs <= 1 ? 'a_son_compte' : 'societe'
}

/**
 * Le profil, à partir des données de la scène. Pur : même entrée, même sortie ; l'entrée n'est jamais modifiée.
 * Base déduite : « entrepôt » si le stock est grand OU si l'équipe compte 5 personnes ; « atelier » s'il y a un stock, une petite
 * équipe, 3 véhicules ou un CAMION (il lui faut une cour et une entrée larges) ; sinon « légère » (l'artisan chez lui).
 * « Sans local » n'est jamais deviné : seul l'artisan peut le dire. Le lieu déclaré (`lieu`) prime.
 */
export function profilInfrastructure(d: Pick<DonneesAtelier, 'membres' | 'vehicules' | 'materiaux' | 'chantiers'> & { commandes?: DonneesAtelier['commandes']; formeJuridique?: string | null }, lieu?: Base | null): Profil {
  const membres = d.membres.filter((m) => m.actif).length
  const actifs = d.vehicules.filter((v) => v.actif)
  const gabarits = actifs.map((v) => gabaritDe(v.nom))
  const references = d.materiaux.length
  const categories = new Set(d.materiaux.map((m) => (m.categorie ?? '').trim() || 'Sans catégorie')).size
  const commandesEnCours = (d.commandes ?? []).filter((c) => c.statut === 'commandee' && !c.recue_le).length
  const equipe: Equipe = membres >= SEUILS.equipe ? 'equipe' : membres >= SEUILS.petiteEquipe ? 'petite' : 'solo'
  let stock: Stock = references === 0 ? 'aucun' : categories >= SEUILS.grandStockCategories || references >= SEUILS.grandStockReferences ? 'grand' : 'petit'
  if (stock === 'petit' && commandesEnCours >= SEUILS.commandesEnCours) stock = 'grand'
  const baseDeduite: Base = stock === 'grand' || equipe === 'equipe' ? 'entrepot'
    : stock === 'petit' || equipe === 'petite' || actifs.length >= SEUILS.parcAtelier || gabarits.includes('camion') ? 'atelier' : 'legere'
  return {
    equipe, membres, vehicules: actifs.length, gabarits, stock, categories, references, commandesEnCours, chantiers: d.chantiers.length,
    statut: statutDe(d.formeJuridique, membres), base: lieu ?? baseDeduite, baseDeduite, declare: !!lieu,
  }
}

/** Une phrase courte du profil (plan 2D, menu de l'atelier) : « Société · 6 personnes · 4 véhicules · stock important ». */
export function resumeProfil(p: Profil): string {
  const statut = p.statut === 'societe' ? 'Société' : 'À son compte'
  const gens = p.membres <= 1 ? 'seul' : `${p.membres} personnes`
  const camions = p.gabarits.filter((g) => g === 'camion').length
  const vh = p.vehicules === 0 ? 'aucun véhicule' : `${p.vehicules} véhicule${p.vehicules > 1 ? 's' : ''}${camions ? ` dont ${camions} camion${camions > 1 ? 's' : ''}` : ''}`
  const st = p.stock === 'aucun' ? 'sans stock' : p.stock === 'petit' ? 'petit stock' : 'stock important'
  return `${statut} · ${gens} · ${vh} · ${st}`
}

// ── 2. Le plan de masse de chaque base (mètres de maquette ; la ville des chantiers autour garde sa grille) ─────
export type Rect = { x0: number; x1: number; z0: number; z1: number }
export type Place = [number, number, 'x' | 'z']
export type PlanBase = {
  base: Base
  /** La parcelle : son sol, sa clôture éventuelle. */
  lot: Rect
  /** Les places des véhicules légers, dans l'ordre ; et celles d'un camion (plus longues, accès large). */
  places: readonly Place[]
  placesCamion: readonly Place[]
  /** Le comptoir (ou guichet, ou boîte aux lettres) de l'accueil, sa longueur ; le premier colis (grille 4 × 2). */
  accueil: { x: number; z: number; l: number }
  colis: { x: number; z: number }
  /** Le centre de l'objet Bureau (la maison, le bureau accolé, le bloc de bureaux, la table pliante). */
  bureau: { x: number; z: number }
  poste: { x: number; z: number }
  racks: { x0: number; z: number; pas: number; max: number }
  /** Où vont l'établi et les machines (dedans), et les structures du métier (dehors). */
  interieur: Rect
  exterieur: Rect
  repos: { x: number; z: number; cols: number; dx: number; dz: number }
  /** Le point par où les personnages sortent pour rejoindre leur chantier. */
  sortie: [number, number]
  /** La cible de la caméra pour la vue « atelier ». */
  cible: V3
  /** Le mobilier du hall (allées marquées, zone de montage, chariot, poste, tri, extincteurs) : atelier et entrepôt. */
  hall: Rect
  /** Les bâtiments et structures de la base que la marche ne traverse jamais (scripts/crm-atelier3d-qa.mjs le vérifie). */
  batiments: readonly Rect[]
  /** Le chemin de sortie, du poste de repos à la rue (le dernier point est SUR la rue de ceinture, z = 14) ; `interne` : combien de
   *  ses premiers tronçons restent à l'intérieur d'un bâtiment de la base (par ses portes). */
  chemin: readonly [number, number][]
  interne: number
}

export const PLANS: Record<Base, PlanBase> = {
  // La maison de l'artisan : pavillon et garage ouvert à gauche, allée et jardin clôturé, l'abri de jardin au fond à droite.
  legere: {
    base: 'legere', lot: { x0: -12, x1: 10, z0: -7, z1: 9.5 },
    places: [[0.75, 5.0, 'z'], [-1.1, -1.5, 'z'], [14.6, -5.2, 'x'], [19.2, -5.2, 'x'], [14.6, -1.9, 'x'], [19.2, -1.9, 'x'], [14.6, 1.4, 'x'], [19.2, 1.4, 'x']],
    placesCamion: [[0.9, 4.6, 'z'], [16.9, 5.0, 'x']],
    accueil: { x: -3.6, z: 2.2, l: 1.2 }, colis: { x: -7.4, z: 2.3 }, bureau: { x: -5.75, z: -1.25 }, poste: { x: -9.3, z: 4.2 },
    racks: { x0: 4.6, z: -3.4, pas: 2.2, max: 3 },
    interieur: { x0: 0.3, x1: 2.3, z0: -3.8, z1: 1.2 }, exterieur: { x0: 3.6, x1: 9.6, z0: -2.2, z1: 8.8 },
    repos: { x: -11.4, z: 2.3, cols: 2, dx: 0.7, dz: 0.75 }, sortie: [0.75, 9.6], cible: [-2, 0, 1],
    hall: { x0: 0.3, x1: 2.3, z0: -3.8, z1: 1.2 },
    batiments: [{ x0: -9, x1: -2.5, z0: -4, z1: 1.5 }, { x0: -2.5, x1: 2.5, z0: -4, z1: 1.5 }, { x0: 3.6, x1: 9.6, z0: -2.2, z1: 8.8 }],
    chemin: [[-5.7, 8.6], [-5.7, 14]], interne: 0,
  },
  // L'atelier artisanal : bâtiment à gauche, bureau accolé encore à gauche, cour devant, structures du métier à droite, parking en façade de rue.
  atelier: {
    base: 'atelier', lot: { x0: -13.5, x1: 12, z0: -8.4, z1: 9.8 },
    places: [[6.4, 4.6, 'x'], [11.0, 4.6, 'x'], [15.6, 4.6, 'x'], [6.4, 7.9, 'x'], [11.0, 7.9, 'x'], [15.6, 7.9, 'x'], [20.2, 4.6, 'x'], [20.2, 7.9, 'x']],
    placesCamion: [[-1.6, 5.6, 'x'], [19.4, -4.0, 'x']],
    accueil: { x: -11.5, z: 2.3, l: 1.8 }, colis: { x: -12.9, z: 3.3 }, bureau: { x: -11.5, z: -1 }, poste: { x: -8.0, z: 3.1 },
    racks: { x0: -9.0, z: -1.9, pas: 2.2, max: 5 },
    interieur: { x0: -9.6, x1: 1.6, z0: -1.0, z1: 1.3 }, exterieur: { x0: 3.4, x1: 11.6, z0: -7.8, z1: 0.9 },
    repos: { x: -5.4, z: 2.6, cols: 3, dx: 0.9, dz: 0.8 }, sortie: [3.8, 2.8], cible: [-3, 0, -1],
    hall: { x0: -9.8, x1: 2.0, z0: -6.4, z1: 1.4 },
    batiments: [{ x0: -10, x1: 2, z0: -6.5, z1: 1.5 }, { x0: -13, x1: -10, z0: -3.5, z1: 1.5 }, { x0: 3.4, x1: 11.6, z0: -7.8, z1: 0.9 }],
    chemin: [[-5.8, 4.4], [-5.8, 14]], interne: 0,
  },
  // La zone d'activité : hangar à bardage au fond, bureaux en étage devant à gauche, quais à droite, parking poids lourds et véhicules légers.
  entrepot: {
    base: 'entrepot', lot: { x0: -13, x1: 24, z0: -9, z1: 10 },
    places: [[12.4, 2.6, 'x'], [12.4, 5.4, 'x'], [12.4, 8.2, 'x'], [21.6, 2.6, 'x'], [21.6, 5.4, 'x'], [21.6, 8.2, 'x'], [16.9, 2.6, 'x'], [16.9, 5.4, 'x']],
    placesCamion: [[15.6, 0.0, 'x'], [15.6, -6.0, 'x']],
    accueil: { x: -8.0, z: 8.7, l: 1.8 }, colis: { x: -12.5, z: 8.9 }, bureau: { x: -8, z: 6 }, poste: { x: -8.3, z: 2.6 },
    racks: { x0: -9.9, z: -3.6, pas: 2.2, max: 9 },
    interieur: { x0: -6.8, x1: 2.6, z0: -2.6, z1: 3.2 }, exterieur: { x0: -4.4, x1: 9.4, z0: 4.6, z1: 8.9 },
    repos: { x: 3.4, z: -0.6, cols: 4, dx: 1.15, dz: 1.2 }, sortie: [17, 10.2], cible: [0, 0, 2.5],
    hall: { x0: -10.8, x1: 8.9, z0: -2.8, z1: 3.8 },
    batiments: [{ x0: -11, x1: 9, z0: -8, z1: 4 }, { x0: -11, x1: -3.8, z0: 4, z1: 8 }, { x0: -4.4, x1: 9.4, z0: 4.6, z1: 8.9 }],
    chemin: [[3.0, 3.4], [3.0, 4.3], [10.0, 4.3], [10.0, 9.6], [16, 9.6], [16, 14]], interne: 2,
  },
  // Sans local : un emplacement gravillonné dans un square, le camion-atelier ouvert au milieu, une table pliante pour bureau.
  camion: {
    base: 'camion', lot: { x0: -9, x1: 9, z0: -5, z1: 6 },
    places: [[0, 0.4, 'x'], [-5.6, -2.9, 'x'], [5.6, -2.9, 'x'], [-5.6, -6.2, 'x'], [5.6, -6.2, 'x'], [14.6, -5.2, 'x'], [19.2, -5.2, 'x'], [14.6, -1.9, 'x']],
    placesCamion: [[0.2, 0.4, 'x'], [5.4, -3.2, 'x']],
    accueil: { x: -3.4, z: 3.0, l: 1.0 }, colis: { x: -6.6, z: 3.6 }, bureau: { x: 3.4, z: 3.0 }, poste: { x: -6.2, z: 0.8 },
    racks: { x0: -2.2, z: -2.6, pas: 2.2, max: 3 },
    interieur: { x0: -1.6, x1: 1.8, z0: 2.0, z1: 3.6 }, exterieur: { x0: -8.6, x1: -4.4, z0: -4.6, z1: 0.2 },
    repos: { x: 5.6, z: 0.2, cols: 2, dx: 0.8, dz: 0.8 }, sortie: [0, 6.2], cible: [0, 0, 1],
    hall: { x0: -1.6, x1: 1.8, z0: 2.0, z1: 3.6 },
    batiments: [{ x0: -2.2, x1: 2.6, z0: -0.6, z1: 1.5 }, { x0: -8.6, x1: -4.4, z0: -4.6, z1: 0.2 }],
    chemin: [[6.2, 14]], interne: 0,
  },
}

/** La place du véhicule n° i (et son sens) : les camions ont leurs places à eux, les autres prennent les places légères dans l'ordre. */
export function placeParking(plan: PlanBase, i: number, gabarits: readonly Gabarit[] = []): Place {
  const g = gabarits[i] ?? 'fourgonnette'
  const avant = gabarits.slice(0, i)
  if (g === 'camion') { const k = avant.filter((x) => x === 'camion').length; if (k < plan.placesCamion.length) return plan.placesCamion[k] }
  const k = avant.filter((x) => x !== 'camion').length + Math.max(0, avant.filter((x) => x === 'camion').length - plan.placesCamion.length)
  return plan.places[Math.min(k, plan.places.length - 1)]
}
/** Le poste de repos n° k (un personnage sans chantier aujourd'hui). */
export function placeRepos(plan: PlanBase, k: number): [number, number] {
  const r = plan.repos
  return [r.x + (k % r.cols) * r.dx, r.z + Math.floor(k / r.cols) * r.dz]
}

// ── Palette (valeurs de COULEURS, lib/crm/atelier.ts, et quelques teintes de matières, toutes chaudes ou neutres) ──
export const P = {
  sol: '#EFE9DD', dalle: '#FAF6EE', mur: '#F4EFE6', corail: '#D97757', corailClair: '#E8946F', corailFonce: '#B85C3C',
  pierre: '#CFC6B8', planche: '#E6DFD3', bois: '#B98B62', boisFonce: '#8A7F72', ardoise: '#3A3632', vitre: '#5B5650',
  blanc: '#FBF8F2', sauge: '#A9C29B', tronc: '#9C8468', peau: '#E9CBB0', vert: '#5E9E7E', ambre: '#C9A27E', gris: '#A8A196',
  // matières
  tuile: '#C2734E', tuileClair: '#D08A66', ardoiseToit: '#6F6862', parpaing: '#BDB5A8', joint: '#A39A8D', beton: '#D3CCC0', cuivre: '#C58A5C', metal: '#A7A096',
  pvc: '#DCD6CB', herbe: '#D5DDC4', haie: '#9DB38F', gravier: '#E4DCCD', route: '#DDD5C7', asphalte: '#D2CABD', place: '#E1D9CB', carton: '#D9C3A0', sac: '#E2D2B8',
  bardage: '#D8D2C7', nervure: '#C4BDB1', sable: '#E6D3A8', granulat: '#C7BEB0', film: '#F3F0EA', eau: '#B7B9A9', bache: '#ECE6DA',
  // lumière
  vitreJour: '#A8A39A', vitreNuit: '#3B3632', lumiere: '#FFC979', ampouleJour: '#EDE6DA', phare: '#FFE2A8',
} as const
const MURS = ['#F3EDE2', '#EADFCF', '#E6E0D6', '#EFE6D8', '#E9D6C3', '#DCD3C4']
const TOITS = ['#C98B6B', '#B9A58E', '#D2A383', '#BF9479', '#8E847A']
export const PEINTURES = ['#F2E3C9', '#E8C9A8', '#E9D8BE', '#EFD3BF']

/** Un hachage STABLE (même identifiant → même nombre dans [0, 1[) : copie de `hacher` (lib/crm/atelier.ts), sans import. */
function hacher(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967296
}
/** Mélange une couleur vers une autre (copie de `melanger`, lib/crm/atelier.ts). */
function melange(a: string, b: string, t: number): string {
  const v = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16)
  return '#' + [0, 1, 2].map((i) => Math.round(v(a, i) + (v(b, i) - v(a, i)) * t).toString(16).padStart(2, '0')).join('')
}

// ── Les fonctions d'ajout que construireScene prête au module ─────────────────────────────────────────────────
/** Ajoute une instance, rend son rang dans la liste de sa forme (pour les personnages qui marchent). */
export type AjoutI = (f: Forme, p: V3, s: V3, c: string, o?: number, r?: V3) => number
/** Une fenêtre (ou une lampe) : sa couleur de jour, et celle de la nuit (allumée ou éteinte). */
export type Fenetre = Inst & { nuit: string }
export type AjoutF = (p: V3, s: V3, jour: string, nuit: string, o?: number) => void
/** Un morceau de personnage qui marche vers son chantier (la position posée est l'ARRIVÉE ; la scène 3D calcule le trajet). */
export type Mobile = {
  forme: Forme; index: number; de: [number, number]; porte: [number, number]; vers: [number, number]; ordre: number
  /** Le trajet complet par les allées et les rues (lot 3) : du poste de repos à l'arrivée. Absent : de → porte → vers. */
  chemin?: [number, number][]
}

// ── Le pinceau : les gestes de construction communs (volumes, murs, toits, fenêtres, clôtures, arbres) ─────────
function pinceau(add: AjoutI, addF: AjoutF, o = -1) {
  const B = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, r: V3 = [0, 0, 0]) => add('box', [x, y, z], [sx, sy, sz], c, o, r)
  const Cy = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, r: V3 = [0, 0, 0]) => add('cyl', [x, y, z], [sx, sy, sz], c, o, r)
  const S = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string) => add('sph', [x, y, z], [sx, sy, sz], c, o)
  const Co = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, r: V3 = [0, 0, 0]) => add('cone', [x, y, z], [sx, sy, sz], c, o, r)
  const F = (x: number, y: number, z: number, sx: number, sy: number, sz: number, jour: string, nuit: string) => addF([x, y, z], [sx, sy, sz], jour, nuit, o)
  /** Un volume posé : rectangle au sol, de y0 à y0 + h. */
  const vol = (x0: number, z0: number, x1: number, z1: number, h: number, c: string, y0 = 0) => B((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2, x1 - x0, h, z1 - z0, c)
  /** Un mur d'épaisseur e entre deux points alignés (sur x ou sur z). */
  const mur = (x0: number, z0: number, x1: number, z1: number, h: number, c: string, e = 0.2, y0 = 0) => B((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2, Math.max(Math.abs(x1 - x0), e), h, Math.max(Math.abs(z1 - z0), e), c)
  /**
   * Un toit à deux pans posé à la hauteur y sur le rectangle, faîtage le long de x (`sens` 'x') ou de z ; pente `a` (radians).
   * `part` 'arriere' : seul le pan du fond est couvert, l'autre montre ses chevrons (la maquette en coupe). `couv` : part couverte
   * le long du faîtage (le couvreur), le reste en chevrons. Pignons pleins (`pignon`) si la pente est de 45°. Rend le haut du faîtage.
   */
  const deuxPans = (x0: number, z0: number, x1: number, z1: number, y: number, a: number, c: string, opt: { sens?: 'x' | 'z'; part?: 'tout' | 'arriere'; couv?: number; pignon?: string | null; deb?: number } = {}) => {
    const sens = opt.sens ?? 'x', deb = opt.deb ?? 0.18, couv = Math.min(1, Math.max(0, opt.couv ?? 1))
    const xc = (x0 + x1) / 2, zc = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0
    const demi = sens === 'x' ? d / 2 : w / 2, long = (sens === 'x' ? w : d) + 2 * deb
    const montee = demi * Math.tan(a), L = demi / Math.cos(a) + deb, yS = y + montee / 2 + 0.04
    for (const s of [1, -1]) {
      const plein = !(opt.part === 'arriere' && s === 1)
      const lc = plein ? long * couv : 0
      const r: V3 = sens === 'x' ? [s * a, 0, 0] : [0, 0, -s * a]
      const pos = (le: number, debut: number): V3 => sens === 'x' ? [x0 - deb + debut + le / 2, yS, zc + s * (demi / 2 + 0.02)] : [xc + s * (demi / 2 + 0.02), yS, z0 - deb + debut + le / 2]
      if (lc > 0.02) B(...pos(lc, 0), ...((sens === 'x' ? [lc, 0.08, L] : [L, 0.08, lc]) as V3), c, r)
      for (let t = lc + 0.2; t < long - 0.05; t += 0.55) B(...pos(0.07, t), ...((sens === 'x' ? [0.07, 0.08, L] : [L, 0.08, 0.07]) as V3), P.bois, r)
    }
    if (opt.pignon && Math.abs(a - Math.PI / 4) < 1e-6) {
      const s = (sens === 'x' ? d : w) / Math.SQRT2
      B(xc, y, zc, ...((sens === 'x' ? [w, s, s] : [s, s, d]) as V3), opt.pignon, sens === 'x' ? [Math.PI / 4, 0, 0] : [0, 0, Math.PI / 4])
    }
    if (couv >= 1 && opt.part !== 'arriere') B(xc, y + montee + 0.06, zc, ...((sens === 'x' ? [long, 0.1, 0.16] : [0.16, 0.1, long]) as V3), melange(c, '#000000', 0.18))
    return y + montee + 0.1
  }
  /** Un toit plat à acrotère (immeubles, bureaux). */
  const plat = (x0: number, z0: number, x1: number, z1: number, y: number, c: string) => {
    vol(x0, z0, x1, z1, 0.1, c, y)
    for (const [a, b, cc, dd] of [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]] as const) mur(a, b, cc, dd, 0.22, melange(c, '#FFFFFF', 0.15), 0.1, y + 0.1)
    return y + 0.32
  }
  /** Les fenêtres d'une façade : face avant (z = pos) ou droite (x = pos), de a à b, `etages` rangées à partir de y0 (pas he). */
  const fenetres = (face: 'z' | 'x', pos: number, a: number, b: number, y0: number, etages: number, he: number, cle: string, allumee: (i: number, n: number) => boolean = (i) => hacher(`${cle}:${i}`) < 0.6, lw = 0.42, lh = 0.4) => {
    const n = Math.max(1, Math.floor((b - a) / 0.72)), pas = (b - a) / n
    let i = 0
    for (let e = 0; e < etages; e++) for (let k = 0; k < n; k++, i++) {
      const t = a + pas * (k + 0.5), y = y0 + e * he
      if (face === 'z') { B(t, y, pos + 0.008, lw + 0.12, lh + 0.1, 0.03, P.blanc); F(t, y, pos + 0.014, lw, lh, 0.03, P.vitreJour, allumee(i, n * etages) ? P.lumiere : P.vitreNuit) }
      else { B(pos + 0.008, y, t, 0.03, lh + 0.1, lw + 0.12, P.blanc); F(pos + 0.014, y, t, 0.03, lh, lw, P.vitreJour, allumee(i, n * etages) ? P.lumiere : P.vitreNuit) }
    }
  }
  /** Une clôture (poteaux et lisses) le long d'un segment aligné, avec ses trous (portails, portillons). */
  const cloture = (x0: number, z0: number, x1: number, z1: number, h: number, c: string, trous: [number, number][] = [], plein = false) => {
    const lx = x1 - x0, lz = z1 - z0, L = Math.hypot(lx, lz), ux = lx / L, uz = lz / L
    const segs: [number, number][] = []
    let t0 = 0
    for (const [a, b] of [...trous].sort((p, q) => p[0] - q[0])) { if (a > t0) segs.push([t0, a]); t0 = b }
    if (t0 < L) segs.push([t0, L])
    for (const [a, b] of segs) {
      const m = (a + b) / 2, l = b - a
      const px = x0 + ux * m, pz = z0 + uz * m
      if (plein) B(px, h / 2, pz, Math.abs(ux) * l + Math.abs(uz) * 0.05, h, Math.abs(uz) * l + Math.abs(ux) * 0.05, c)
      else for (const y of [h * 0.45, h * 0.9]) B(px, y, pz, Math.abs(ux) * l + Math.abs(uz) * 0.06, 0.07, Math.abs(uz) * l + Math.abs(ux) * 0.06, c)
      for (let t = a; t <= b + 1e-6; t += Math.max(1.4, (b - a) / Math.max(1, Math.round((b - a) / 1.6)))) B(x0 + ux * t, h / 2 + 0.05, z0 + uz * t, 0.1, h + 0.1, 0.1, melange(c, '#000000', 0.12))
    }
  }
  const arbre = (x: number, z: number, k = 1, c: string = P.sauge) => { Cy(x, 0.4 * k, z, 0.18, 0.8 * k, 0.18, P.tronc); S(x, 1.25 * k, z, 1.15 * k, 1.15 * k, 1.15 * k, c) }
  const haie = (x0: number, z0: number, x1: number, z1: number, h = 0.8) => vol(Math.min(x0, x1) - 0.25, Math.min(z0, z1) - 0.25, Math.max(x0, x1) + 0.25, Math.max(z0, z1) + 0.25, h, P.haie)
  const lampe = (x: number, z: number, h = 2.4) => { Cy(x, 0.12, z, 0.36, 0.24, 0.36, P.pierre); Cy(x, h / 2, z, 0.11, h, 0.11, P.gris); Cy(x, h + 0.08, z, 0.5, 0.14, 0.5, P.gris); F(x, h - 0.02, z, 0.3, 0.1, 0.3, P.ampouleJour, P.lumiere) }
  return { B, Cy, S, Co, F, vol, mur, deuxPans, plat, fenetres, cloture, arbre, haie, lampe }
}

/**
 * Les MATIÈRES du métier, sur les bâtiments de la base (bardage, toiture, portiques, bandeau) : un coup d'œil suffit à reconnaître
 * le bardage bois du menuisier, les blocs du maçon, la toiture en tuiles du couvreur, le graphite de l'électricien… Teintes chaudes
 * ou neutres seulement.
 */
export const MATIERES: Record<Prereglage, { mur: string; nervure: string; toit: string; bande: string }> = {
  menuisier: { mur: '#D9B48C', nervure: '#B98B62', toit: '#7E7166', bande: '#9C7552' },
  macon: { mur: '#BDB5A8', nervure: '#A39A8D', toit: '#9E958A', bande: '#7E766C' },
  couvreur: { mur: '#E8DDD0', nervure: '#D2C4B4', toit: '#C2734E', bande: '#B0603E' },
  plombier: { mur: '#F1ECE4', nervure: '#E0D8CC', toit: '#A9A296', bande: '#C58A5C' },
  chauffagiste: { mur: '#F1ECE4', nervure: '#E0D8CC', toit: '#A9A296', bande: '#B85C3C' },
  electricien: { mur: '#6F6862', nervure: '#5E5852', toit: '#4D4741', bande: '#D9A441' },
  peintre: { mur: '#F3E6D2', nervure: '#E8C9A8', toit: '#9E958A', bande: '#D97757' },
  carreleur: { mur: '#E6E0D6', nervure: '#CFC6B8', toit: '#8E847A', bande: '#8C9A82' },
  general: { mur: '#D8D2C7', nervure: '#C4BDB1', toit: '#A9A296', bande: '#D97757' },
}

// ── 2b. Les bases : bâtiments, plan de masse, végétation. Chaque fonction rend la liste des structures qu'elle a posées. ──
/** Ce que chaque base DOIT montrer (le brief de Benj du 20/10, lot 2) : scripts/crm-atelier3d-qa.mjs vérifie. */
export const BATIMENTS: Record<Base, string[]> = {
  legere: ['maison', 'garage-ouvert', 'allee', 'cloture', 'jardin'],
  atelier: ['batiment-atelier', 'porte-sectionnelle', 'auvent', 'cour', 'bureau-accole'],
  entrepot: ['hangar-bardage', 'quais', 'portes-multiples', 'parking-poids-lourds', 'bureaux-etage', 'escalier-exterieur', 'cloture', 'portail'],
  camion: ['camion-atelier', 'emplacement', 'table-pliante'],
}

export function decorBase(add: AjoutI, addF: AjoutF, plan: PlanBase, profil: Profil, metier: Prereglage, zones: { libelle: string; p: V3 }[]): string[] {
  const k = pinceau(add, addF)
  const faits: string[] = []
  const { lot: L } = plan
  const camion = profil.gabarits.includes('camion')
  const Mt = MATIERES[metier]
  // Les marques des places de stationnement : une par véhicule (à son gabarit), au moins une sauf sans local.
  const marquer = (n: number) => {
    for (let i = 0; i < n; i++) {
      const [x, z, sens] = placeParking(plan, i, profil.gabarits)
      const g = profil.gabarits[i] ?? 'fourgonnette', l = g === 'camion' ? 5.6 : 3.9, la = g === 'camion' ? 3.0 : 2.6
      const [sx, sz] = sens === 'x' ? [l, la] : [la, l]
      for (const s of [-1, 1]) sens === 'x' ? k.B(x, 0.045, z + s * sz / 2, sx, 0.02, 0.07, P.blanc) : k.B(x + s * sx / 2, 0.045, z, 0.07, 0.02, sz, P.blanc)
    }
  }

  if (plan.base === 'legere') {
    // Le jardin clôturé : pelouse, haie au fond, allée gravillonnée (élargie pour un camion), chemin de la porte, arbres fruitiers.
    k.vol(L.x0, L.z0, L.x1, L.z1, 0.03, P.herbe)
    const allee: [number, number] = camion ? [-1.0, 2.9] : [-0.5, 2.0]
    k.vol(allee[0], 1.5, allee[1], L.z1, 0.04, P.gravier)
    k.vol(-6.1, 1.5, -5.3, L.z1, 0.04, P.pierre)
    // La clôture dit le métier : muret de parpaings du maçon, muret de pierre du carreleur, palissade pleine du menuisier,
    // grillage (cuivre, graphite) des métiers techniques, lisses de bois sinon.
    const cl = metier === 'macon' ? { c: P.parpaing, h: 1.0, plein: true } : metier === 'carreleur' ? { c: P.pierre, h: 0.9, plein: true }
      : metier === 'menuisier' ? { c: P.bois, h: 1.2, plein: true } : metier === 'plombier' || metier === 'chauffagiste' || metier === 'electricien' ? { c: Mt.bande, h: 1.1, plein: false } : { c: P.bois, h: 0.9, plein: false }
    k.cloture(L.x0, L.z1, L.x1, L.z1, cl.h, cl.c, [[allee[0] - L.x0, allee[1] - L.x0], [-6.2 - L.x0, -5.2 - L.x0]], cl.plein)
    k.cloture(L.x0, L.z0, L.x0, L.z1, cl.h, cl.c, [], cl.plein)
    k.cloture(L.x1, L.z0, L.x1, L.z1, cl.h, cl.c, [], cl.plein)
    k.haie(L.x0 + 0.4, L.z0 + 0.3, L.x1 - 0.4, L.z0 + 0.3, 1.1)
    // Le portail ouvert, rabattu contre la clôture.
    k.B(allee[1] + 0.9, 0.5, L.z1 - 0.05, allee[1] - allee[0] - 0.2, 0.9, 0.06, P.boisFonce, [0, 0.5, 0])
    faits.push('cloture', 'jardin', 'allee')
    if (camion) faits.push('entree-large')
    // Le garage attenant, ouvert devant (un carport) : murs du fond et de droite, toit plat sur la moitié du fond, linteau devant.
    k.vol(-2.5, -4, 2.5, 1.5, 0.05, P.beton)
    k.mur(-2.5, -4, 2.5, -4, 2.4, Mt.mur)
    k.mur(2.5, -4, 2.5, -1.2, 2.4, Mt.mur)
    for (let z = -3.8; z < -1.2; z += 0.45) k.B(2.62, 1.2, z, 0.06, 2.3, 0.1, Mt.nervure)
    k.mur(2.5, -1.2, 2.5, 1.5, 0.9, Mt.mur)
    k.vol(-2.6, -4.1, 2.6, -1.4, 0.16, Mt.toit, 2.4)
    k.B(0, 2.3, 1.5, 5.0, 0.22, 0.24, Mt.bande)
    k.B(2.5, 1.2, 1.5, 0.24, 2.4, 0.24, Mt.bande)
    k.B(0, 2.12, 1.32, 4.6, 0.14, 0.12, Mt.nervure) // la porte basculante, relevée
    faits.push('garage-ouvert', 'maison')
    // Un banc, un potager (ou l'abri de jardin s'il y a du stock), des arbres fruitiers, une lampe de jardin.
    k.B(-10.9, 0.25, 6.8, 1.4, 0.08, 0.45, P.bois); for (const dx of [-0.55, 0.55]) k.B(-10.9 + dx, 0.12, 6.8, 0.08, 0.24, 0.4, P.boisFonce)
    if (profil.stock === 'aucun') {
      k.vol(4.0, -6.4, 9.2, -4.4, 0.12, '#B8A48A')
      for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) k.S(4.5 + j * 0.72, 0.24, -6.0 + i * 0.5, 0.36, 0.28, 0.36, P.sauge)
      faits.push('potager')
    } else {
      k.vol(3.6, -6.8, 9.6, -4.4, 0.05, P.beton); k.mur(3.6, -6.8, 9.6, -6.8, 2.2, P.bois); k.mur(3.6, -6.8, 3.6, -4.4, 2.2, P.bois)
      k.B(6.6, 2.1, -5.7, 6.4, 0.08, 2.6, '#8E847A', [-0.18, 0, 0])
      faits.push('abri-jardin')
    }
    for (const [x, z, s] of [[-10.6, -5.2, 1.0], [-8.2, 7.6, 0.9], [8.6, 8.4, 0.85], [-11.0, 0.4, 0.8], [8.8, -2.2, 0.8]] as const) k.arbre(x, z, s)
    for (const [x, z] of [[-7.0, 2.0], [-4.4, 2.0]] as const) k.S(x, 0.2, z, 0.5, 0.36, 0.5, P.corailClair)
    k.lampe(-5.7, 8.9, 1.2)
    zones.push({ libelle: 'Maison · bureau', p: [-5.75, 0.1, -4.8] }, { libelle: 'Garage', p: [0, 0.1, -4.6] }, { libelle: 'Jardin', p: [6.6, 0.1, 9.0] }, { libelle: 'Accueil', p: [-5.7, 0.1, 3.6] })
    pelouseVille(k, 12, 24, -9, 10, 'legere', 0.6)
  } else if (plan.base === 'atelier') {
    // La cour pavée devant, l'herbe derrière à droite ; l'entrée de la cour élargie pour un camion.
    k.vol(L.x0, L.z0, L.x1, L.z1, 0.03, P.beton)
    k.vol(-13.5, 1.5, 3.2, L.z1, 0.04, '#E2DACB')
    faits.push('cour')
    if (camion) { k.vol(-4.4, 1.5, 2.8, L.z1, 0.045, P.asphalte); faits.push('entree-large') }
    // Le bâtiment d'atelier : dalle, murs du fond et de gauche pleins (fenêtres hautes), murs face caméra bas, grande porte sectionnelle.
    const H = 3.4
    k.vol(-10, -6.5, 2, 1.5, 0.05, P.dalle)
    k.mur(-10, -6.5, 2, -6.5, H, Mt.mur); k.mur(-10, -6.5, -10, 1.5, H, Mt.mur)
    for (let x = -9.6; x < 2; x += 0.6) k.B(x, H / 2, -6.37, 0.1, H - 0.1, 0.06, Mt.nervure)
    k.fenetres('z', -6.39, -9.4, 1.4, H - 0.75, 1, 1, 'atelier-fond', () => true, 1.0, 0.5)
    k.mur(2, -6.5, 2, -4.2, 1.0, Mt.mur); k.mur(2, -1.6, 2, 1.5, 1.0, Mt.mur)
    for (const z of [-4.2, -1.6]) k.B(2, H / 2, z, 0.3, H, 0.3, Mt.bande) // la porte de côté
    k.B(2, H - 0.15, -2.9, 0.3, 0.3, 2.9, Mt.bande)
    k.mur(-10, 1.5, -6.6, 1.5, 1.0, Mt.mur); k.mur(-2.4, 1.5, 2, 1.5, 1.0, Mt.mur)
    for (const x of [-6.6, -2.4]) k.B(x, H / 2, 1.5, 0.32, H, 0.32, Mt.bande)
    k.B(-4.5, H - 0.15, 1.5, 4.5, 0.3, 0.32, Mt.bande)
    k.B(-4, H + 0.04, -6.5, 12.2, 0.14, 0.26, Mt.bande); k.B(-10, H + 0.04, -2.5, 0.26, 0.14, 8.2, Mt.bande)
    for (let i = 0; i < 4; i++) k.B(-4.5, H - 0.42 - i * 0.13, 1.38, 3.9, 0.11, 0.08, i % 2 ? P.nervure : P.bardage) // le tablier roulé en haut
    faits.push('batiment-atelier', 'porte-sectionnelle')
    // Le toit : sheds (dents de scie) pour le menuisier et le peintre, deux pans pour les autres — en coupe, sur la moitié du fond.
    if (metier === 'menuisier' || metier === 'peintre') {
      for (let t = 0; t < 3; t++) {
        const z0 = -6.5 + t * 2.67, z1 = z0 + 2.67
        if (t < 2) {
          k.B(-4, H + 0.65, (z0 + z1) / 2, 12.3, 0.08, 2.95, Mt.toit, [-0.47, 0, 0])
          k.F(-4, H + 0.65, z0 + 0.05, 12.0, 1.25, 0.06, P.vitreJour, P.lumiere)
        } else for (let x = -9.6; x <= 1.6; x += 1.1) k.B(x, H + 0.65, (z0 + z1) / 2, 0.08, 0.1, 2.95, P.bois, [-0.47, 0, 0])
      }
      faits.push('sheds')
    } else {
      k.deuxPans(-10, -6.5, 2, 1.5, H, 0.5, Mt.toit, { part: 'arriere' })
      k.B(-10, H + 1.0, -2.5, 0.2, 2.0, 7.0, Mt.mur) // le pignon
      faits.push('deux-pans')
    }
    // L'auvent au-dessus de la porte sectionnelle.
    k.B(-4.5, H + 0.25, 2.3, 5.2, 0.1, 1.7, Mt.bande, [0.12, 0, 0])
    for (const x of [-6.9, -2.1]) k.B(x, H + 0.05, 2.0, 0.08, 0.5, 1.2, P.ardoise, [0.6, 0, 0])
    faits.push('auvent', 'bureau-accole')
    // Un vestiaire (équipe seulement), le long du mur de gauche, devant.
    if (profil.equipe !== 'solo') { const n = Math.min(4, profil.membres); for (let i = 0; i < n; i++) k.B(-9.6, 0.9, -0.8 + i * 0.58, 0.5, 1.8, 0.52, i % 2 ? '#E3DDD2' : P.pierre); zones.push({ libelle: 'Vestiaire', p: [-8.6, 0.1, -0.4] }); faits.push('vestiaire') }
    marquer(Math.max(1, profil.vehicules))
    for (const [x, z] of [[14, -7], [17, -5.5], [20.5, -7.4], [22.8, -3.2], [15.8, -1.6], [22, 1.6], [-12.6, -7.4]] as const) k.arbre(x, z, 0.9)
    k.haie(12.6, 9.4, 23.6, 9.4, 0.7)
    for (const x of [-6.8, -2.2]) k.lampe(x, 3.9, 2.6)
    zones.push({ libelle: 'Atelier', p: [-4.5, 0.1, -4.6] }, { libelle: 'Bureau', p: [-11.5, 0.1, -4.2] }, { libelle: 'Accueil', p: [-11.5, 0.1, 5.0] }, { libelle: 'Cour', p: [-4.6, 0.1, 8.6] }, { libelle: 'Parking', p: [11, 0.1, 9.6] })
    if (profil.stock !== 'aucun') zones.push({ libelle: 'Stock', p: [-5.5, 0.1, -2.6] })
    pelouseVille(k, 12.5, 24, -9, 1, 'atelier', 0)
  } else if (plan.base === 'entrepot') {
    // La parcelle bitumée, clôturée, portail coulissant ; hangar à bardage au fond ; quais à droite ; parking poids lourds.
    k.vol(L.x0, L.z0, L.x1, L.z1, 0.03, P.asphalte)
    k.cloture(L.x0, L.z1, L.x1, L.z1, 1.5, P.gris, [[14.5 - L.x0, 19.6 - L.x0]])
    k.cloture(L.x0, L.z0, L.x1, L.z0, 1.5, P.gris); k.cloture(L.x0, L.z0, L.x0, L.z1, 1.5, P.gris); k.cloture(L.x1, L.z0, L.x1, L.z1, 1.5, P.gris)
    k.B(21.9, 0.85, 10.15, 4.6, 1.5, 0.08, P.corail) // le portail, glissé de côté
    for (const x of [14.4, 19.7]) k.B(x, 1.0, 10, 0.3, 2.0, 0.3, P.ardoise)
    faits.push('cloture', 'portail')
    const H = 5.6
    k.vol(-11, -8, 9, 4, 0.05, P.dalle)
    // Bardage nervuré sur les murs du fond et de gauche (pleine hauteur), bande de fenêtres hautes.
    k.mur(-11, -8, 9, -8, H, Mt.mur); k.mur(-11, -8, -11, 4, H, Mt.mur)
    for (let x = -10.6; x < 9; x += 0.8) k.B(x, H / 2, -7.86, 0.12, H - 0.2, 0.08, Mt.nervure)
    for (let z = -7.6; z < 4; z += 0.8) k.B(-10.86, H / 2, z, 0.08, H - 0.2, 0.12, Mt.nervure)
    k.B(-1, H + 0.04, -8, 20.2, 0.24, 0.3, Mt.bande); k.B(-11, H + 0.04, -2, 0.3, 0.24, 12.2, Mt.bande)
    k.B(-1, 1.2, -7.84, 20, 0.5, 0.06, Mt.bande)
    k.fenetres('z', -7.78, -10, 8, H - 0.9, 1, 1, 'hangar', () => true, 1.4, 0.5)
    faits.push('hangar-bardage')
    // Portes multiples en façade (portiques corail et tabliers relevés), murs face caméra bas.
    const portesAvant: [number, number][] = [[-3.6, -0.4], [1.4, 4.6]]
    let xa = -11
    for (const [a, b] of portesAvant) { k.mur(xa, 4, a, 4, 1.0, Mt.mur); for (const x of [a, b]) k.B(x, 2.2, 4, 0.34, 4.4, 0.34, Mt.bande); k.B((a + b) / 2, 4.3, 4, b - a + 0.3, 0.3, 0.34, Mt.bande); k.B((a + b) / 2, 3.95, 3.92, b - a - 0.2, 0.42, 0.12, Mt.nervure); xa = b }
    k.mur(xa, 4, 9, 4, 1.0, Mt.mur)
    faits.push('portes-multiples')
    // Les quais de chargement sur le mur de droite : trois portes, niveleurs, butoirs, sas d'étanchéité.
    let za = -8
    for (const zq of [-6, -3, 0]) {
      k.mur(9, za, 9, zq - 1.2, 1.0, Mt.mur); za = zq + 1.2
      for (const z of [zq - 1.2, zq + 1.2]) k.B(9.05, 1.9, z, 0.36, 3.8, 0.3, P.ardoise)
      k.B(9.05, 3.7, zq, 0.36, 0.3, 2.7, P.ardoise)
      k.vol(9.2, zq - 1.2, 10.7, zq + 1.2, 1.1, P.beton)
      for (const s of [-0.9, 0.9]) k.B(10.75, 0.85, zq + s, 0.14, 0.4, 0.3, P.ardoise)
      k.B(9.0, 3.3, zq, 0.12, 0.6, 2.3, P.nervure)
    }
    k.mur(9, za, 9, 4, 1.0, Mt.mur)
    faits.push('quais', 'bureaux-etage', 'escalier-exterieur')
    // Le toit : pan du fond en bac acier, portiques corail apparents au-dessus de l'atelier.
    const pente = 0.16, yF = H + 6 * Math.tan(pente)
    k.B(-1, H + (3.4 / 2) * Math.tan(pente) + 0.06, -6.3, 20.4, 0.1, 3.5, Mt.toit, [-pente, 0, 0])
    for (let x = -10.6; x < 9.4; x += 0.7) k.B(x, H + (3.4 / 2) * Math.tan(pente) + 0.13, -6.3, 0.06, 0.06, 3.5, melange(Mt.toit, '#000000', 0.12), [-pente, 0, 0])
    // Les portiques : légers, à la couleur du métier.
    for (const x of [-7, 1, 9]) {
      k.B(x, H / 2, 4, 0.18, H, 0.18, Mt.bande)
      k.B(x, (H + yF) / 2, 1.0, 0.14, 0.18, 6.1, Mt.bande, [pente, 0, 0])
    }
    k.B(-1, yF, -2, 20.2, 0.12, 0.12, Mt.bande)
    // Parking poids lourds : trois baies longues devant les quais ; un camion de livraison à quai s'il y a des commandes attendues.
    for (const zq of [-6, -3, 0]) for (const s of [-1.4, 1.4]) k.B(16.4, 0.045, zq + s, 11, 0.02, 0.08, P.blanc)
    faits.push('parking-poids-lourds')
    // Un camion dans le parc d'un métier du bâtiment : une aire de lavage des engins (dalle, caniveau, lance) au fond du parking poids
    // lourds. Le maçon y ajoute un pont-bascule sur l'allée du portail et un parc d'engins (mini-pelle, chargeuse). Tiré des données
    // (gabarit « camion » dans le parc), jamais du hasard.
    if (camion && (metier === 'macon' || metier === 'couvreur' || metier === 'general')) {
      // L'aire de lavage des engins : dalle, caniveau, potence et lance, flaque.
      k.vol(10.9, -8.6, 14.4, -6.7, 0.06, '#BFB7AA'); k.B(12.65, 0.07, -7.65, 3.0, 0.02, 0.18, P.ardoise)
      k.B(14.2, 0.9, -8.4, 0.12, 1.8, 0.12, P.metal); k.B(13.9, 1.75, -8.4, 0.7, 0.1, 0.1, P.metal); k.Cy(12.2, 0.08, -7.3, 1.6, 0.02, 1.0, P.eau)
      faits.push('aire-lavage')
    }
    if (camion && metier === 'macon') {
      // Le pont-bascule sur l'allée du portail, et sa cabine de pesée.
      k.vol(15.9, 6.2, 18.1, 9.4, 0.1, P.beton); for (const z of [6.25, 9.35]) k.B(17, 0.12, z, 2.2, 0.05, 0.1, P.ardoise)
      k.vol(18.6, 6.6, 19.6, 7.6, 2.2, '#ECE6DA'); k.F(19.62, 1.5, 7.1, 0.03, 0.5, 0.7, P.vitreJour, P.lumiere); k.B(19.1, 2.25, 7.1, 1.2, 0.1, 1.2, P.ardoise)
      faits.push('pont-bascule')
      // La plateforme de stockage : trois grands boxes de béton (murs de 1,6 m), tas de sable, de gravier, de gravillons.
      k.vol(18.2, -8.7, 23.8, -4.7, 0.08, P.beton)
      k.B(21.0, 0.85, -8.55, 5.6, 1.6, 0.3, P.beton)
      for (let i = 0; i < 4; i++) k.B(18.35 + i * 1.8, 0.85, -6.7, 0.3, 1.6, 3.6, P.beton)
      ;[P.sable, P.granulat, '#B5AC9E'].forEach((c, i) => k.Co(19.25 + i * 1.8, 0.75, -6.9, 1.7, 1.5, 2.6, c))
      faits.push('plateforme-stockage')
      // Le parc d'engins : une mini-pelle et une chargeuse.
      for (const dz of [-0.45, 0.45]) k.B(15.2, 0.22, -7.6 + dz, 1.8, 0.44, 0.4, P.ardoise)
      k.B(15.2, 0.75, -7.6, 1.4, 0.6, 1.2, P.ambre); k.B(14.9, 1.3, -7.6, 0.8, 0.6, 0.9, P.vitre)
      k.B(16.2, 1.4, -7.6, 1.5, 0.2, 0.2, P.ambre, [0, 0, 0.7]); k.B(16.9, 0.9, -7.6, 0.2, 1.1, 0.2, P.ambre, [0, 0, -0.3]); k.B(17.1, 0.35, -7.6, 0.5, 0.35, 0.6, P.ardoise)
      faits.push('parc-engins')
      // La grue à tour au-dessus de la plateforme : la silhouette qui se voit de loin.
      k.vol(22.4, -8.2, 23.4, -7.2, 0.5, P.beton)
      for (let y = 0.5; y < 11.5; y += 1.0) { k.B(22.9, y + 0.5, -7.7, 0.5, 0.06, 0.5, P.ambre); k.B(22.9, y + 0.5, -7.7, 0.06, 1.0, 0.06, P.ambre) }
      for (const [dx, dz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) k.B(22.9 + dx, 6.0, -7.7 + dz, 0.08, 11.0, 0.08, P.ambre)
      k.B(17.4, 11.7, -7.7, 11.6, 0.4, 0.4, P.ambre); k.B(23.9, 11.7, -7.7, 2.0, 0.4, 0.4, P.ambre); k.B(24.2, 11.2, -7.7, 1.0, 0.9, 0.9, P.beton)
      k.B(22.9, 12.4, -7.7, 0.12, 1.4, 0.12, P.ambre); k.B(22.4, 11.2, -7.7, 0.7, 0.7, 0.7, P.vitre)
      k.B(15.0, 9.0, -7.7, 0.04, 5.0, 0.04, P.ardoise); k.B(15.0, 6.4, -7.7, 0.9, 0.3, 0.9, P.corail)
      faits.push('grue-a-tour')
    }
    if (profil.commandesEnCours > 0) {
      k.B(15.3, 1.95, -3, 8.6, 2.9, 2.4, '#ECE6DA'); k.B(15.3, 1.2, -1.79, 8.4, 0.18, 0.02, P.corail); k.B(15.3, 1.2, -4.21, 8.4, 0.18, 0.02, P.corail)
      k.B(20.6, 1.45, -3, 1.6, 2.1, 2.3, P.corail); k.F(21.42, 1.95, -3, 0.04, 0.6, 1.9, P.vitre, P.phare)
      for (const x of [12.0, 13.2, 17.4, 20.4]) for (const s of [-1.1, 1.1]) k.Cy(x, 0.45, -3 + s, 0.9, 0.3, 0.9, P.ardoise, [Math.PI / 2, 0, 0])
      faits.push('livraison-a-quai')
    }
    // Le vestiaire (équipe), contre le mur de gauche à l'intérieur.
    if (profil.equipe !== 'solo') { const n = Math.min(8, profil.membres); for (let i = 0; i < n; i++) k.B(-10.5, 0.9, -2.3 + i * 0.58, 0.5, 1.8, 0.52, i % 2 ? '#E3DDD2' : P.pierre); zones.push({ libelle: 'Vestiaire', p: [-9.6, 0.1, -2.9] }); faits.push('vestiaire') }
    marquer(Math.max(1, profil.vehicules))
    // Mâts d'éclairage, quelques arbres le long de la clôture.
    for (const [x, z] of [[10.6, 9.2], [23, -8.2], [-12.2, -8.2]] as const) k.lampe(x, z, 5.2)
    for (const [x, z] of [[-12.2, 0], [-12.2, 4.6], [23, 4], [23, -2.4], [6.5, 9.2]] as const) k.arbre(x, z, 0.85)
    zones.push({ libelle: 'Dépôt', p: [-1, 0.1, -5.4] }, { libelle: 'Atelier', p: [-2, 0.1, 3.2] }, { libelle: 'Quais', p: [11.6, 0.1, -8.4] }, { libelle: 'Bureaux', p: [-8, 0.1, 9.6] }, { libelle: 'Parking', p: [17, 0.1, 8.8] })
  } else {
    // Sans local : un emplacement gravillonné dans un square ; le camion-atelier (premier véhicule) est la base.
    k.vol(-14, -9.6, 24.6, 10.4, 0.025, P.herbe)
    k.vol(L.x0, L.z0, L.x1, L.z1, 0.04, P.gravier)
    for (const x of [L.x0, L.x1]) k.B(x, 0.12, (L.z0 + L.z1) / 2, 0.16, 0.24, L.z1 - L.z0, P.pierre)
    k.B((L.x0 + L.x1) / 2, 0.12, L.z0, L.x1 - L.x0, 0.24, 0.16, P.pierre)
    faits.push('emplacement', 'camion-atelier', 'table-pliante')
    for (const [x, z, s] of [[-11.5, -6.5, 1], [-12.5, 3, 0.9], [12, -6, 1.1], [13.5, 4, 0.9], [20, -2, 1], [-4, -8, 0.9], [5, -8.2, 1], [21.5, 6.5, 0.85], [-12, 8.5, 0.8], [11, 8.8, 0.9]] as const) k.arbre(x, z, s)
    k.B(-6.0, 0.25, 5.0, 1.5, 0.08, 0.45, P.bois)
    k.lampe(8.4, 5.4, 2.6)
    zones.push({ libelle: 'Camion-atelier', p: [0, 0.1, -2.0] }, { libelle: 'Bureau', p: [3.4, 0.1, 4.6] }, { libelle: 'Accueil', p: [-3.4, 0.1, 4.8] })
    marquer(Math.max(0, profil.vehicules - 1))
  }
  if (camion) faits.push('place-camion')
  if ((metier === 'electricien' || metier === 'plombier' || metier === 'chauffagiste') && (plan.base === 'atelier' || plan.base === 'entrepot')) faits.push('vitrine')
  // Le statut se voit : une société a son enseigne en totem à l'entrée ; un artisan à son compte, sa boîte aux lettres.
  if (profil.statut === 'societe') {
    const [x, z] = plan.base === 'entrepot' ? [13.4, 10.6] : plan.base === 'atelier' ? [3.6, 9.4] : plan.base === 'legere' ? [3.4, 10.0] : [8.4, 6.6]
    k.B(x, 1.3, z, 0.9, 2.6, 0.3, P.ardoise); k.B(x, 2.1, z + 0.16, 0.8, 0.7, 0.02, P.corail); k.B(x, 1.3, z + 0.16, 0.6, 0.12, 0.02, P.blanc)
    faits.push('totem-societe')
  } else {
    const [x, z] = plan.base === 'legere' ? [-6.7, 9.7] : plan.base === 'atelier' ? [-12.9, 9.4] : plan.base === 'entrepot' ? [12.9, 10.6] : [-7.5, 5.6]
    k.Cy(x, 0.5, z, 0.08, 1.0, 0.08, P.ardoise); k.B(x, 1.1, z, 0.45, 0.32, 0.32, P.corail)
    faits.push('boite-aux-lettres')
  }
  return faits
}

/** La ville autour selon la base : vergers et haies pour la maison, pelouses et arbres alignés pour l'atelier. */
function pelouseVille(k: ReturnType<typeof pinceau>, x0: number, x1: number, z0: number, z1: number, cle: string, verger: number) {
  k.vol(x0, z0, x1, z1, 0.025, P.herbe)
  const n = Math.max(1, Math.round(((x1 - x0) * (z1 - z0)) / 11))
  for (let i = 0; i < n; i++) {
    const hx = hacher(`${cle}:x:${i}`), hz = hacher(`${cle}:z:${i}`), s = 0.7 + hacher(`${cle}:k:${i}`) * 0.5
    k.arbre(x0 + 0.9 + hx * (x1 - x0 - 1.8), z0 + 0.9 + hz * (z1 - z0 - 1.8), s, hacher(`${cle}:c:${i}`) < verger ? '#B9C99F' : P.sauge)
  }
}

/** Le Bureau, objet cliquable : la maison (base légère), le bureau accolé (atelier), le bloc de bureaux en étage (entrepôt), la table pliante (sans local). */
export function bureauInfra(add: AjoutI, addF: AjoutF, plan: PlanBase, profil: Profil, metier: Prereglage, o: number): void {
  const k = pinceau(add, addF, o)
  const vitrine = metier === 'electricien' || metier === 'plombier' || metier === 'chauffagiste'
  if (plan.base === 'legere') {
    // La maison : un pavillon à deux pans, une cheminée, une plaque « bureau » près de la porte. Elle dit aussi le métier de celui
    // qui l'habite : maison de pierre du maçon, bardage bois du menuisier, ardoises et lucarnes du couvreur, panneaux solaires de
    // l'électricien, capteur et ballon du plombier, pompe à chaleur du chauffagiste, façade colorée du peintre, terrasse carrelée.
    const murMaison = metier === 'macon' ? '#D6CCBC' : metier === 'menuisier' ? '#D9B48C' : metier === 'peintre' ? '#EBC3A6' : '#EFE3D2'
    const toitMaison = metier === 'couvreur' ? P.ardoiseToit : metier === 'electricien' ? '#8E6A58' : '#B9775A'
    k.vol(-9, -4, -2.5, 1.5, 2.4, murMaison, 0.05)
    k.deuxPans(-9, -4, -2.5, 1.5, 2.45, Math.PI / 4, toitMaison, { pignon: murMaison })
    k.vol(-8.2, -2.6, -7.6, -2.0, 1.6, P.pierre, 3.8)
    if (metier === 'macon') for (let y = 0.35; y < 2.4; y += 0.32) k.B(-5.75, y, 1.512, 6.5, 0.03, 0.02, P.joint)
    if (metier === 'menuisier') for (let x = -8.8; x < -2.6; x += 0.28) k.B(x, 1.25, 1.515, 0.05, 2.35, 0.02, P.bois)
    if (metier === 'couvreur') for (const x of [-7.6, -4.2]) { k.vol(x - 0.4, -0.6, x + 0.4, 0.9, 0.9, murMaison, 3.1); k.deuxPans(x - 0.45, -0.6, x + 0.45, 0.95, 4.0, Math.PI / 4, P.ardoiseToit, { sens: 'z' }); k.F(x, 3.5, 0.92, 0.4, 0.45, 0.03, P.vitreJour, P.lumiere) }
    // Les panneaux posés à plat sur le pan avant (pente 45° : y = 2,45 + (1,5 − z)).
    if (metier === 'electricien' || metier === 'plombier') for (let i = 0; i < (metier === 'electricien' ? 6 : 2); i++) k.B(-8.2 + i * 0.95, 2.45 + (1.5 - 0.3) + 0.1, 0.3, 0.85, 0.05, 1.5, P.ardoise, [Math.PI / 4, 0, 0])
    if (metier === 'plombier') k.Cy(-5.0, 5.45, -1.25, 0.5, 1.2, 0.5, P.blanc, [0, 0, Math.PI / 2])
    if (metier === 'chauffagiste') { k.B(-2.5 + 0.35, 0.5, -1.0, 0.45, 0.8, 1.0, '#ECE6DA'); k.Cy(-2.5 + 0.6, 0.5, -1.0, 0.55, 0.03, 0.55, P.ardoise, [0, 0, Math.PI / 2]) }
    if (metier === 'peintre') { k.B(-5.75, 0.45, 1.53, 6.5, 0.9, 0.02, '#D9A27E'); k.B(-5.75, 0.95, 1.535, 6.5, 0.1, 0.02, P.corail) }
    if (metier === 'carreleur') for (let i = 0; i < 18; i++) k.B(-8.6 + (i % 9) * 0.7, 0.08, 2.0 + Math.floor(i / 9) * 0.7, 0.66, 0.04, 0.66, i % 2 ? P.blanc : P.pierre)
    k.B(-5.7, 0.5, 1.53, 0.7, 1.0, 0.05, P.boisFonce)
    k.B(-4.95, 0.95, 1.54, 0.34, 0.22, 0.03, P.corail)
    k.fenetres('z', 1.5, -8.8, -6.3, 1.2, 1, 1, 'maison-av')
    k.fenetres('z', 1.5, -4.9, -2.7, 1.2, 1, 1, 'maison-av2', () => true)
    k.vol(-6.4, 1.5, -5.0, 2.1, 0.12, P.pierre)
    return
  }
  if (plan.base === 'atelier') {
    // Le bureau accolé à gauche du bâtiment, toit en appentis ; en vitrine-boutique pour l'électricien, le plombier, le chauffagiste.
    k.vol(-13, -3.5, -10, 1.5, 2.6, '#EFE6D8', 0.05)
    k.B(-11.5, 2.95, -1.0, 3.3, 0.12, 5.3, '#8E847A', [0, 0, 0.16])
    if (vitrine) {
      k.F(-11.5, 1.2, 1.56, 2.6, 1.5, 0.04, P.vitreJour, P.lumiere)
      k.B(-11.5, 2.35, 2.0, 3.0, 0.08, 0.9, P.corail, [0.35, 0, 0])
      k.B(-11.5, 2.75, 1.57, 2.8, 0.28, 0.03, P.ardoise)
    } else { k.fenetres('z', 1.5, -12.8, -10.2, 1.3, 1, 1, 'bureau-accole', () => true); k.B(-12.4, 0.5, 1.53, 0.6, 1.0, 0.05, P.boisFonce) }
    return
  }
  if (plan.base === 'entrepot') {
    // Les bureaux en étage : deux niveaux, toit plat, fenêtres en bandeau, escalier extérieur à droite vers la porte de l'étage.
    k.vol(-11, 4, -5, 8, 5.2, '#EFE9DF', 0.05)
    k.plat(-11, 4, -5, 8, 5.25, P.pierre)
    k.B(-8, 2.6, 8.02, 6.0, 0.12, 0.06, P.corail)
    if (vitrine) { k.F(-8.6, 1.2, 8.04, 4.4, 1.6, 0.04, P.vitreJour, P.lumiere) } else k.fenetres('z', 8.0, -10.8, -5.2, 1.3, 1, 1, 'bureaux-rdc', () => true, 0.5, 0.6)
    k.fenetres('z', 8.0, -10.8, -5.2, 3.9, 1, 1, 'bureaux-etage', () => true, 0.5, 0.7)
    k.fenetres('x', -5.0, 4.6, 7.6, 3.9, 1, 1, 'bureaux-cote', () => true, 0.5, 0.7)
    k.B(-6.2, 0.6, 8.03, 0.8, 1.2, 0.05, P.boisFonce)
    k.B(-8, 2.9, 8.5, 6.2, 0.08, 1.0, P.ardoise) // la marquise de l'entrée
    for (let i = 0; i < 11; i++) k.B(-4.4, 0.12 + i * 0.24, 7.6 - i * 0.27, 1.0, 0.1, 0.3, P.metal)
    k.vol(-4.9, 4.2, -3.9, 5.2, 0.12, P.metal, 2.6)
    k.B(-3.9, 2.0, 6.0, 0.05, 0.05, 3.6, P.ardoise, [-0.73, 0, 0])
    k.B(-3.9, 3.2, 4.7, 0.05, 0.6, 1.0, P.ardoise)
    k.B(-5.02, 3.4, 4.7, 0.05, 1.6, 0.8, P.boisFonce)
    return
  }
  // Sans local : une table pliante sous l'auvent du camion, un ordinateur, un tabouret.
  const { x, z } = plan.bureau
  k.B(x, 0.72, z, 1.4, 0.05, 0.7, P.planche)
  for (const [dx, dz] of [[-0.6, -0.28], [0.6, -0.28], [-0.6, 0.28], [0.6, 0.28]]) k.B(x + dx, 0.36, z + dz, 0.05, 0.72, 0.05, P.metal)
  k.B(x - 0.1, 0.9, z - 0.15, 0.55, 0.32, 0.03, P.ardoise, [-0.3, 0, 0]); k.B(x - 0.1, 0.76, z + 0.05, 0.55, 0.02, 0.35, P.ardoise)
  k.Cy(x + 0.5, 0.25, z + 0.8, 0.36, 0.5, 0.36, P.corail)
}

/** L'accueil : comptoir (atelier, entrepôt), petit guéridon (maison, sans local). */
export function comptoirInfra(add: AjoutI, plan: PlanBase, o: number): void {
  const { x, z, l } = plan.accueil
  const h = l < 1.5 ? 0.8 : 1.1
  add('box', [x, h / 2, z], [l, h, 0.7], P.planche, o)
  add('box', [x, h + 0.03, z], [l + 0.1, 0.06, 0.76], P.corail, o)
}

/** Un rayonnage (un par catégorie d'inventaire) : montants, trois tablettes, ses cartons. */
export function rayonnageInfra(add: AjoutI, x: number, z: number, cartons: string[], alerte: boolean, o: number): void {
  const montant = alerte ? P.corail : P.metal
  for (const [dx, dz] of [[-0.9, -0.27], [0.9, -0.27], [-0.9, 0.27], [0.9, 0.27]]) add('box', [x + dx, 1.05, z + dz], [0.08, 2.1, 0.08], montant, o)
  for (const y of [0.12, 0.8, 1.48]) add('box', [x, y, z], [1.9, 0.06, 0.62], P.planche, o)
  add('box', [x, 2.08, z - 0.27], [1.88, 0.05, 0.05], montant, o)
  cartons.slice(0, 9).forEach((c, k) => {
    const etage = Math.floor(k / 3), col = k % 3
    add('box', [x - 0.6 + col * 0.6, 0.15 + etage * 0.68 + 0.2, z], [0.48, 0.4, 0.46], c, o)
  })
}

// ── 3a. Le métier dans la base : structures dehors, machines dedans ────────────────────────────────────────────
/** Une pièce du décor de métier ; `k` nomme la structure qu'elle compose (scripts/crm-atelier3d-qa.mjs vérifie les signatures). */
export type Acc = { f: Forme; p: V3; s: V3; c: string; r: V3; k: string }
/** Ce que chaque métier DOIT montrer dans un atelier et un entrepôt (structures et machines). */
export const SIGNATURES: Record<Prereglage, string[]> = {
  menuisier: ['hangar-bois', 'silo-copeaux', 'scie-format'],
  macon: ['boxes-granulats', 'silo-mortier', 'parpaings', 'chargeuse'],
  electricien: ['auvent-tourets', 'tableau'],
  plombier: ['abri-tubes', 'ballons'],
  chauffagiste: ['abri-tubes', 'pac-expo', 'chaudiere'],
  couvreur: ['hangar-haut', 'racks-echafaudage', 'tuiles', 'monte-materiaux'],
  peintre: ['cabine-peinture', 'echafaudage-roulant', 'pots'],
  carreleur: ['auvent-palettes', 'coupe-eau'],
  general: ['boxes-granulats', 'auvent-tourets', 'abri-tubes'],
}
type Module = { k: string; w: number; d: number; poser: (x0: number, z0: number) => void }

/** Les structures et machines du métier, rangées dans les zones de la base (dehors puis dedans), sans chevauchement. */
export function accessoiresBase(p: Prereglage, plan: PlanBase, opt: { camion?: boolean } = {}): Acc[] {
  const a: Acc[] = []
  let kk = ''
  const b = (x: number, y: number, z: number, s: V3, c: string, r: V3 = [0, 0, 0]) => a.push({ f: 'box', p: [x, y, z], s, c, r, k: kk })
  const cy = (x: number, y: number, z: number, s: V3, c: string, r: V3 = [0, 0, 0]) => a.push({ f: 'cyl', p: [x, y, z], s, c, r, k: kk })
  const sp = (x: number, y: number, z: number, s: V3, c: string) => a.push({ f: 'sph', p: [x, y, z], s, c, r: [0, 0, 0], k: kk })
  const co = (x: number, y: number, z: number, s: V3, c: string, r: V3 = [0, 0, 0]) => a.push({ f: 'cone', p: [x, y, z], s, c, r, k: kk })
  const DEMI = Math.PI / 2
  const M = (k: string, w: number, d: number, poser: (cx: number, cz: number) => void): Module => ({ k, w, d, poser: (x0, z0) => { kk = k; poser(x0 + w / 2, z0 + d / 2) } })

  // — machines et petits matériels (centre x, z) —
  const palette = (x: number, z: number) => b(x, 0.07, z, [1.2, 0.14, 1.0], P.bois)
  const etabli = M('etabli', 3.0, 1.0, (x, z) => {
    b(x, 0.9, z, [3.0, 0.1, 0.9], P.bois); for (const [dx, dz] of [[-1.4, -0.36], [1.4, -0.36], [-1.4, 0.36], [1.4, 0.36]]) b(x + dx, 0.43, z + dz, [0.1, 0.86, 0.1], P.boisFonce)
    b(x, 0.25, z, [2.8, 0.05, 0.7], P.planche); b(x + 1.25, 1.03, z + 0.3, [0.26, 0.16, 0.2], P.ardoise)
    ;[P.ardoise, P.corail, P.ardoise, P.ambre].forEach((c, i) => b(x - 0.9 + i * 0.55, 1.0, z - 0.25, [0.12, 0.12, 0.3], c))
  })
  const parpaings = (n: number) => M('parpaings', 1.3 * n, 1.1, (x, z) => { for (let j = 0; j < n; j++) { const px = x - (1.3 * n) / 2 + 0.65 + j * 1.3; palette(px, z); for (let i = 0; i < 12; i++) b(px - 0.4 + (i % 3) * 0.4, 0.25 + Math.floor(i / 6) * 0.22, z - 0.24 + (Math.floor(i / 3) % 2) * 0.48, [0.38, 0.2, 0.44], i % 5 === 0 ? P.joint : P.parpaing) } })
  const sacs = M('sacs', 1.3, 1.1, (x, z) => { palette(x, z); for (let i = 0; i < 6; i++) b(x - 0.3 + (i % 2) * 0.6, 0.22 + Math.floor(i / 2) * 0.15, z, [0.54, 0.14, 0.82], i % 2 ? P.sac : '#D8C6A8') })
  const betonniere = M('betonniere', 1.3, 1.2, (x, z) => { b(x, 0.3, z, [0.5, 0.5, 0.4], P.ardoise); cy(x, 0.95, z, [0.95, 1.0, 0.95], P.corail, [0.55, 0, 0.3]); cy(x + 0.12, 1.38, z - 0.24, [0.5, 0.2, 0.5], P.corailFonce, [0.55, 0, 0.3]); for (const dz of [-0.32, 0.32]) cy(x - 0.3, 0.2, z + dz, [0.4, 0.12, 0.4], P.ardoise, [DEMI, 0, 0]) })
  const tasSable = M('tas-sable', 2.6, 1.8, (x, z) => { b(x, 0.03, z, [2.6, 0.04, 1.8], P.bache); co(x - 0.6, 0.45, z, [1.4, 0.9, 1.4], P.sable); co(x + 0.7, 0.35, z + 0.1, [1.1, 0.7, 1.1], P.granulat) })
  const touret = (x: number, z: number, c: string, s = 1) => { for (const dx of [-0.3, 0.3]) cy(x + dx * s, 0.55 * s, z, [1.1 * s, 0.08, 1.1 * s], P.bois, [0, 0, DEMI]); cy(x, 0.55 * s, z, [0.78 * s, 0.54 * s, 0.78 * s], c, [0, 0, DEMI]) }
  const tourets = (n: number, k = 'touret') => M(k, 1.3 * n, 1.2, (x, z) => { for (let i = 0; i < n; i++) touret(x - (1.3 * n) / 2 + 0.65 + i * 1.3, z, [P.corail, P.ardoise, P.ambre, P.vert][i % 4]) })
  const tableau = M('tableau', 1.4, 0.6, (x, z) => {
    b(x, 0.75, z, [1.2, 1.5, 0.42], P.pierre); b(x, 0.8, z + 0.22, [1.0, 1.2, 0.02], '#ECE6DA')
    for (let i = 0; i < 6; i++) { b(x - 0.38 + i * 0.15, 1.05, z + 0.24, [0.1, 0.2, 0.03], i === 2 ? P.corail : P.ardoise); b(x - 0.38 + i * 0.15, 0.7, z + 0.24, [0.1, 0.2, 0.03], P.ardoise) }
  })
  const ballon = (x: number, z: number) => { cy(x, 0.9, z, [0.7, 1.7, 0.7], P.blanc); sp(x, 1.75, z, [0.7, 0.24, 0.7], P.blanc); b(x, 1.2, z + 0.36, [0.5, 0.1, 0.02], P.cuivre) }
  const ballons = (n: number) => M('ballons', 0.8 * n + 0.2, 1.0, (x, z) => { b(x, 0.07, z, [0.8 * n + 0.2, 0.14, 1.0], P.bois); for (let i = 0; i < n; i++) ballon(x - (0.8 * n) / 2 + 0.4 + i * 0.8, z) })
  const chaudieres = (n: number) => M('chaudiere', 0.9 * n, 0.8, (x, z) => { for (let i = 0; i < n; i++) { const px = x - (0.9 * n) / 2 + 0.45 + i * 0.9; b(px, 0.55, z, [0.72, 1.1, 0.55], P.blanc); b(px, 0.86, z + 0.28, [0.52, 0.2, 0.02], P.ardoise); cy(px, 1.3, z - 0.08, [0.14, 0.4, 0.14], P.metal) } })
  const pac = (x: number, z: number) => { b(x, 0.05, z, [1.0, 0.1, 0.44], P.ardoise); b(x, 0.5, z, [1.05, 0.8, 0.42], '#ECE6DA'); cy(x - 0.18, 0.5, z + 0.22, [0.56, 0.03, 0.56], P.ardoise, [DEMI, 0, 0]); b(x + 0.36, 0.5, z + 0.22, [0.2, 0.6, 0.02], P.pierre) }
  const pacExpo = (n: number) => M('pac-expo', 1.25 * n + 0.2, 1.0, (x, z) => { b(x, 0.1, z, [1.25 * n + 0.2, 0.2, 1.0], P.beton); for (let i = 0; i < n; i++) pac(x - (1.25 * n) / 2 + 0.62 + i * 1.25, z + 0.05); b(x, 0.12, z + 0.55, [1.25 * n, 0.05, 0.08], P.corail) })
  const scieFormat = M('scie-format', 3.2, 1.9, (x, z) => { b(x + 0.4, 0.4, z, [1.0, 0.8, 0.8], P.ardoise); b(x + 0.4, 0.84, z, [2.4, 0.08, 1.8], '#BDB6AA'); cy(x + 0.4, 0.92, z, [0.56, 0.03, 0.56], P.metal, [DEMI, 0, 0]); b(x + 0.4, 1.22, z, [0.3, 0.12, 0.5], P.corail); b(x - 1.2, 0.84, z, [0.8, 0.06, 1.0], '#BDB6AA') })
  const planches = (long: number) => M('planches', long, 1.0, (x, z) => { for (const dx of [-long / 2 + 0.3, long / 2 - 0.3]) b(x + dx, 0.06, z, [0.12, 0.12, 0.9], P.boisFonce); for (let i = 0; i < 6; i++) b(x, 0.16 + i * 0.09, z - 0.22 + (i % 2) * 0.44, [long, 0.08, 0.45], i % 2 ? P.bois : '#D6B898') })
  const tuiles = (n: number) => M('tuiles', 1.3 * n, 1.1, (x, z) => { for (let j = 0; j < n; j++) { const px = x - (1.3 * n) / 2 + 0.65 + j * 1.3; palette(px, z); for (let i = 0; i < 5; i++) b(px, 0.2 + i * 0.12, z, [1.05, 0.11, 0.85], j % 2 ? (i % 2 ? P.ardoiseToit : '#5E5852') : i % 2 ? P.tuileClair : P.tuile) } })
  const echelleAuSol = (long: number) => M('echelle', long, 0.7, (x, z) => { for (const dz of [-0.22, 0.22]) b(x, 0.06, z + dz, [long, 0.06, 0.07], P.bois); for (let i = 0; i < Math.floor(long / 0.32); i++) b(x - long / 2 + 0.2 + i * 0.32, 0.06, z, [0.05, 0.05, 0.44], P.bois) })
  const pots = (n: number) => M('pots', 0.5 * Math.min(4, n) + 0.2, 0.5 * Math.ceil(n / 4) + 0.3, (x, z) => { const cs = [P.corailClair, P.carton, P.sauge, P.pierre, P.blanc, P.ambre]; const w = 0.5 * Math.min(4, n); for (let i = 0; i < n; i++) { const px = x - w / 2 + 0.25 + (i % 4) * 0.5, pz = z - 0.25 * Math.ceil(n / 4) + 0.25 + Math.floor(i / 4) * 0.5; cy(px, 0.21, pz, [0.38, 0.42, 0.38], cs[i % cs.length]); cy(px, 0.43, pz, [0.4, 0.03, 0.4], P.metal) } })
  const escabeau = M('escabeau', 0.9, 0.8, (x, z) => { b(x, 0.8, z - 0.18, [0.62, 1.6, 0.05], P.metal, [0.2, 0, 0]); b(x, 0.8, z + 0.18, [0.62, 1.6, 0.05], P.metal, [-0.2, 0, 0]); b(x, 1.58, z, [0.62, 0.05, 0.3], P.corail) })
  const coupeEau = M('coupe-eau', 2.0, 1.2, (x, z) => { b(x, 0.75, z, [1.8, 0.12, 0.9], P.metal); for (const dx of [-0.8, 0.8]) for (const dz of [-0.35, 0.35]) b(x + dx, 0.37, z + dz, [0.07, 0.74, 0.07], P.ardoise); b(x, 0.84, z, [1.5, 0.06, 0.6], P.eau); b(x + 0.2, 1.1, z, [0.4, 0.3, 0.3], P.corail); cy(x + 0.2, 0.95, z + 0.18, [0.4, 0.04, 0.4], P.metal, [DEMI, 0, 0]); b(x - 1.0, 0.1, z + 0.4, [0.3, 0.2, 0.3], P.ardoise) })
  const carreaux = (n: number) => M('carreaux', 1.3 * n, 1.1, (x, z) => { for (let j = 0; j < n; j++) { const px = x - (1.3 * n) / 2 + 0.65 + j * 1.3; palette(px, z); for (let i = 0; i < 6; i++) b(px, 0.19 + i * 0.1, z, [1.0, 0.09, 0.9], i % 2 ? P.blanc : P.pierre) } })
  const caisse = M('caisse-outils', 0.9, 0.5, (x, z) => { b(x, 0.18, z, [0.7, 0.34, 0.36], P.corail); b(x, 0.38, z, [0.4, 0.06, 0.06], P.ardoise) })
  const tubesRack = (long: number, c: string) => M('tubes', long, 0.9, (x, z) => { for (const dx of [-long / 2 + 0.3, long / 2 - 0.3]) b(x + dx, 0.32, z, [0.12, 0.64, 0.7], P.boisFonce); for (let i = 0; i < 6; i++) cy(x, 0.66 + Math.floor(i / 3) * 0.13, z - 0.22 + (i % 3) * 0.22, [0.12, long, 0.12], i % 2 ? c : P.pvc, [0, 0, DEMI]) })

  // — les STRUCTURES dehors (bâtiments légers, silos, auvents…) —
  const abri = (x: number, z: number, w: number, d: number, hAv: number, hAr: number, c: string) => {
    // Un abri ouvert devant : poteaux, mur du fond, toit en pente vers l'arrière.
    for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) b(x + dx, hAv / 2, z + d / 2 - 0.1, [0.14, hAv, 0.14], P.boisFonce)
    b(x, hAr / 2, z - d / 2 + 0.06, [w, hAr, 0.12], c)
    b(x, (hAv + hAr) / 2 + 0.06, z, [w + 0.3, 0.08, Math.hypot(d, hAv - hAr) + 0.3], '#8E847A', [Math.atan2(hAv - hAr, d), 0, 0])
  }
  const hangarBois = (w: number) => M('hangar-bois', w, 3.0, (x, z) => {
    abri(x, z, w, 3.0, 3.0, 2.3, P.bois)
    for (let r = 0; r < Math.floor(w / 1.6); r++) { const px = x - w / 2 + 0.8 + r * 1.6; for (let i = 0; i < 4; i++) b(px, 0.3 + i * 0.5, z - 0.3, [1.3, 0.12, 1.6], i % 2 ? P.bois : '#D6B898'); b(px - 0.68, 1.1, z - 0.3, [0.08, 2.2, 0.08], P.ardoise) }
    for (let i = 0; i < 3; i++) cy(x - w / 2 + 0.9 + i * 0.32, 0.18 + (i % 2) * 0.3, z + 1.1, [0.32, Math.min(2.4, w - 1), 0.32], P.tronc, [0, 0, DEMI])
  })
  const siloCopeaux = M('silo-copeaux', 2.4, 2.4, (x, z) => {
    for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) b(x + dx, 1.0, z + dz, [0.1, 2.0, 0.1], P.ardoise)
    co(x, 1.75, z, [1.7, 0.9, 1.7], P.metal, [Math.PI, 0, 0]); cy(x, 3.3, z, [1.7, 2.2, 1.7], P.metal)
    cy(x, 4.65, z, [0.7, 0.5, 0.7], P.pierre); co(x, 4.25, z, [0.7, 0.4, 0.7], P.pierre, [Math.PI, 0, 0])
    cy(x - 1.3, 4.7, z, [0.22, 2.0, 0.22], P.metal, [0, 0, DEMI]) // la gaine vers l'atelier
    b(x + 0.9, 2.3, z + 0.86, [0.06, 4.6, 0.4], P.ardoise) // l'échelle
  })
  const grumes = M('grumes', 3.4, 1.4, (x, z) => { for (let i = 0; i < 6; i++) { const rang = i < 3 ? 0 : i < 5 ? 1 : 2; const dx = (i < 3 ? i - 1 : i < 5 ? i - 3.5 : 0) * 0.5; cy(x + dx, 0.25 + rang * 0.42, z, [0.48, 3.2, 0.48], i % 2 ? P.tronc : '#A48B6E', [0, 0, DEMI]) } })
  const boxesGranulats = (n: number) => M('boxes-granulats', 1.7 * n + 0.2, 2.4, (x, z) => {
    const w = 1.7 * n + 0.2
    b(x, 0.6, z - 1.1, [w, 1.2, 0.2], P.beton)
    for (let i = 0; i <= n; i++) b(x - w / 2 + 0.1 + i * 1.7, 0.6, z - 0.2, [0.2, 1.2, 1.8], P.beton)
    for (let i = 0; i < n; i++) co(x - w / 2 + 0.95 + i * 1.7, 0.5, z - 0.3, [1.4, 1.0, 1.4], [P.sable, P.granulat, '#B5AC9E'][i % 3])
  })
  const siloMortier = M('silo-mortier', 1.8, 1.8, (x, z) => {
    for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) b(x + dx, 0.9, z + dz, [0.12, 1.8, 0.12], P.corail)
    co(x, 2.2, z, [1.3, 0.8, 1.3], '#E3DDD2', [Math.PI, 0, 0]); cy(x, 3.9, z, [1.3, 2.6, 1.3], '#E3DDD2'); cy(x, 5.25, z, [1.1, 0.1, 1.1], P.ardoise)
    b(x, 0.5, z + 0.75, [0.8, 0.5, 0.5], P.corail)
  })
  const chargeuse = M('chargeuse', 2.6, 1.6, (x, z) => {
    b(x, 0.75, z, [1.8, 0.6, 1.1], P.ambre); b(x - 0.3, 1.45, z, [0.9, 0.8, 0.9], P.ambre); b(x - 0.3, 1.5, z, [0.92, 0.5, 0.8], P.vitre)
    for (const dx of [-0.6, 0.6]) for (const dz of [-0.6, 0.6]) cy(x + dx, 0.4, z + dz, [0.8, 0.3, 0.8], P.ardoise, [DEMI, 0, 0])
    b(x + 1.1, 1.0, z, [0.1, 0.1, 0.9], P.ardoise, [0, 0, 0.5]); b(x + 1.3, 0.4, z, [0.5, 0.45, 1.2], P.ardoise, [0, 0, -0.3])
  })
  const grue = M('grue', 2.2, 2.2, (x, z) => {
    b(x, 0.3, z, [1.8, 0.6, 1.8], P.beton); b(x, 4.2, z, [0.4, 7.2, 0.4], P.ambre)
    b(x - 1.4, 7.9, z, [6.2, 0.3, 0.3], P.ambre); b(x + 1.6, 7.6, z, [0.8, 0.7, 0.7], P.beton); b(x - 4.2, 6.2, z, [0.03, 3.2, 0.03], P.ardoise); b(x - 4.2, 4.5, z, [0.6, 0.3, 0.4], P.corail)
  })
  const hangarHaut = M('hangar-haut', 4.8, 3.8, (x, z) => {
    for (const dx of [-2.3, 2.3]) b(x + dx, 2.6, z + 1.8, [0.2, 5.2, 0.2], P.corail)
    b(x, 2.6, z - 1.85, [4.8, 5.2, 0.12], P.bardage); b(x - 2.35, 2.6, z, [0.12, 5.2, 3.8], P.bardage)
    b(x, 5.3, z, [5.0, 0.12, 4.0], '#9E958A')
    // la nacelle rangée dedans, bras replié
    b(x, 0.45, z, [2.2, 0.42, 1.0], P.ambre); for (const dx of [-0.75, 0.75]) for (const dz of [-0.5, 0.5]) cy(x + dx, 0.22, z + dz, [0.44, 0.16, 0.44], P.ardoise, [DEMI, 0, 0])
    b(x - 0.2, 1.5, z, [2.4, 0.22, 0.22], P.ambre, [0, 0, -0.5]); b(x - 1.15, 2.2, z, [0.8, 0.5, 0.7], P.corail)
  })
  const racksEchafaudage = (w: number) => M('racks-echafaudage', w, 1.2, (x, z) => {
    for (let dx = -w / 2 + 0.1; dx <= w / 2 - 0.05; dx += Math.max(1.0, (w - 0.2) / 3)) b(x + dx, 1.1, z, [0.1, 2.2, 1.0], P.ardoise)
    for (let i = 0; i < 9; i++) cy(x, 0.4 + Math.floor(i / 3) * 0.6, z - 0.3 + (i % 3) * 0.3, [0.1, w - 0.1, 0.1], P.metal, [0, 0, DEMI])
    for (let i = 0; i < 2; i++) b(x, 2.0 + i * 0.1, z, [w - 0.3, 0.06, 0.4], P.bois)
  })
  const monteMateriaux = M('monte-materiaux', 1.4, 3.6, (x, z) => {
    b(x, 0.3, z + 1.4, [0.8, 0.6, 0.7], P.ardoise)
    b(x, 2.2, z, [0.4, 0.12, 4.2], P.corail, [-1.0, 0, 0]); b(x, 2.6, z - 0.4, [0.7, 0.08, 0.6], P.metal, [-1.0, 0, 0])
  })
  const auventTourets = (n: number) => M('auvent-tourets', Math.max(3.4, 1.3 * n + 0.4), 2.4, (x, z) => {
    const w = Math.max(3.4, 1.3 * n + 0.4)
    for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) { b(x + dx, 1.45, z + 1.1, [0.12, 2.9, 0.12], P.ardoise); b(x + dx, 1.2, z - 1.1, [0.12, 2.4, 0.12], P.ardoise) }
    b(x, 2.72, z, [w + 0.2, 0.08, 2.6], P.corail, [0.2, 0, 0])
    for (let i = 0; i < n; i++) touret(x - w / 2 + 0.85 + i * 1.3, z - 0.2, [P.corail, P.ardoise, P.ambre, P.vert][i % 4])
  })
  const abriTubes = (w: number, c: string) => M('abri-tubes', w, 1.8, (x, z) => {
    abri(x, z, w, 1.8, 2.5, 2.0, c)
    for (const dx of [-w / 2 + 0.4, 0, w / 2 - 0.4]) b(x + dx, 0.9, z - 0.4, [0.1, 1.8, 0.1], P.ardoise)
    for (let i = 0; i < 9; i++) cy(x, 0.4 + Math.floor(i / 3) * 0.5, z - 0.6 + (i % 3) * 0.25, [0.11, w - 0.3, 0.11], i % 2 ? c : P.pvc, [0, 0, DEMI])
  })
  const cabinePeinture = M('cabine-peinture', 3.4, 2.6, (x, z) => {
    b(x, 1.4, z, [3.4, 2.8, 2.6], '#ECE6DA'); b(x, 2.82, z, [3.5, 0.06, 2.7], P.corail)
    b(x - 0.7, 1.1, z + 1.31, [1.4, 2.0, 0.04], P.nervure); b(x + 1.0, 1.6, z + 1.31, [0.8, 0.5, 0.03], P.vitre)
    b(x + 0.8, 3.2, z - 0.4, [0.9, 0.7, 0.9], P.metal); cy(x + 0.8, 4.0, z - 0.4, [0.45, 1.2, 0.45], P.metal); co(x + 0.8, 4.75, z - 0.4, [0.8, 0.3, 0.8], P.ardoise)
  })
  const echafaudageRoulant = (n: number) => M('echafaudage-roulant', 1.5 * n, 1.3, (x, z) => {
    for (let t = 0; t < n; t++) { const px = x - (1.5 * n) / 2 + 0.75 + t * 1.5
      for (const dx of [-0.55, 0.55]) for (const dz of [-0.5, 0.5]) { cy(px + dx, 1.6, z + dz, [0.06, 3.0, 0.06], P.metal); sp(px + dx, 0.08, z + dz, [0.14, 0.14, 0.14], P.ardoise) }
      for (const y of [1.0, 2.0, 3.0]) b(px, y, z, [1.15, 0.05, 1.05], P.bois); b(px, 3.4, z + 0.5, [1.1, 0.04, 0.04], P.ambre) }
  })
  const auventPalettes = (n: number) => M('auvent-palettes', Math.max(3.4, 1.35 * n + 0.4), 2.6, (x, z) => {
    const w = Math.max(3.4, 1.35 * n + 0.4)
    for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) b(x + dx, 1.4, z + 1.2, [0.12, 2.8, 0.12], P.ardoise)
    b(x, 2.6, z - 1.25, [w, 2.6, 0.1], P.bardage); b(x, 2.82, z, [w + 0.2, 0.08, 2.8], '#9E958A', [0.12, 0, 0])
    for (let i = 0; i < n; i++) { const px = x - w / 2 + 0.85 + i * 1.35; palette(px, z - 0.2); b(px, 0.62, z - 0.2, [1.05, 0.95, 0.9], P.film); b(px, 0.62, z + 0.26, [1.0, 0.05, 0.02], P.corail) }
  })

  // — chaque métier, ses structures (dehors) et ses machines (dedans), selon le niveau de la base —
  const niv = plan.base === 'entrepot' ? 2 : plan.base === 'atelier' ? 1 : 0
  const dehors: Module[] = [], dedans: Module[] = []
  if (niv > 0) dedans.push(etabli)
  switch (p) {
    case 'menuisier':
      if (niv === 0) { dehors.push(hangarBois(3.2), planches(2.4)); dedans.push(caisse) } else { dehors.push(hangarBois(niv === 2 ? 5.6 : 4.6), siloCopeaux); if (niv === 2) dehors.push(grumes, planches(3.0)); dedans.push(scieFormat) }
      break
    case 'macon':
      if (niv === 0) dehors.push(tasSable, betonniere, parpaings(1), sacs)
      else if (niv === 1) { dehors.push(boxesGranulats(2), siloMortier, parpaings(1), chargeuse); dedans.push(sacs) }
      // Avec un camion benne, la plateforme de stockage s'agrandit (quatre boxes) : le site d'une entreprise de gros œuvre.
      else { dehors.push(boxesGranulats(opt.camion ? 4 : 3), siloMortier, grue, parpaings(opt.camion ? 1 : 2)); dedans.push(sacs, chargeuse) }
      break
    case 'couvreur':
      if (niv === 0) dehors.push(racksEchafaudage(2.6), tuiles(1), echelleAuSol(3.0))
      else { dehors.push(hangarHaut, monteMateriaux, racksEchafaudage(3.4), tuiles(2)); dedans.push(echelleAuSol(3.0)); if (niv === 2) dedans.push(tuiles(1)) }
      break
    case 'electricien':
      if (niv === 0) { dedans.push(tourets(1, 'tourets-garage'), caisse); dehors.push(auventTourets(2)) }
      else { dehors.push(auventTourets(niv === 2 ? 4 : 3), tourets(2)); dedans.push(tableau) }
      break
    case 'plombier':
      if (niv === 0) { dedans.push(tubesRack(1.9, P.cuivre)); dehors.push(abriTubes(3.2, P.cuivre), ballons(2)) }
      else { dehors.push(abriTubes(niv === 2 ? 5.0 : 4.2, P.cuivre), ballons(niv === 2 ? 4 : 3)); dedans.push(tubesRack(2.4, P.cuivre)) }
      break
    case 'chauffagiste':
      if (niv === 0) { dedans.push(chaudieres(1)); dehors.push(pacExpo(2), abriTubes(3.0, P.cuivre)) }
      else { dehors.push(pacExpo(niv === 2 ? 4 : 3), abriTubes(niv === 2 ? 4.6 : 3.8, P.cuivre)); dedans.push(chaudieres(niv === 2 ? 3 : 2)) }
      break
    case 'peintre':
      if (niv === 0) { dehors.push(echafaudageRoulant(1), pots(4)); dedans.push(escabeau) }
      else { dehors.push(cabinePeinture, echafaudageRoulant(niv === 2 ? 2 : 1)); dedans.push(pots(niv === 2 ? 8 : 6), escabeau) }
      break
    case 'carreleur':
      if (niv === 0) dehors.push(coupeEau, carreaux(2))
      else { dehors.push(auventPalettes(niv === 2 ? 5 : 3), coupeEau); dedans.push(carreaux(niv === 2 ? 2 : 1)) }
      break
    default:
      if (niv === 0) dehors.push(tasSable, auventTourets(1), tubesRack(2.4, P.cuivre))
      else { dehors.push(boxesGranulats(2), auventTourets(2), abriTubes(3.6, P.cuivre)); dedans.push(pots(niv === 2 ? 8 : 4)) }
  }
  ranger(dehors, plan.exterieur)
  ranger(dedans, plan.interieur)
  if (niv > 0) mobilierHall(plan, (k) => { kk = k }, b, cy)
  return a
}

/**
 * Le mobilier du hall (atelier, entrepôt) : allées marquées au sol, zone de découpe et de montage, chariot, poste de travail, panneau
 * d'outils, bacs de tri, extincteurs aux portes. Des boîtes et des cylindres de plus, AUCUN appel de dessin de plus.
 */
function mobilierHall(plan: PlanBase, quoi: (k: string) => void, b: (x: number, y: number, z: number, s: V3, c: string, r?: V3) => void, cy: (x: number, y: number, z: number, s: V3, c: string, r?: V3) => void) {
  const ligne = (x0: number, z0: number, x1: number, z1: number) => b((x0 + x1) / 2, 0.065, (z0 + z1) / 2, [Math.max(0.08, Math.abs(x1 - x0)), 0.012, Math.max(0.08, Math.abs(z1 - z0))], P.ambre)
  const table = (x: number, z: number) => { b(x, 0.85, z, [2.0, 0.08, 1.0], P.bois); for (const [dx, dz] of [[-0.9, -0.42], [0.9, -0.42], [-0.9, 0.42], [0.9, 0.42]]) b(x + dx, 0.42, z + dz, [0.07, 0.84, 0.07], P.metal); b(x - 0.2, 0.93, z, [1.2, 0.05, 0.7], '#D6B898'); b(x + 0.7, 0.95, z + 0.2, [0.3, 0.08, 0.12], P.corail) }
  const chariot = (x: number, z: number) => { for (const y of [0.35, 0.8]) b(x, y, z, [0.9, 0.05, 0.55], P.corail); for (const [dx, dz] of [[-0.4, -0.22], [0.4, -0.22], [-0.4, 0.22], [0.4, 0.22]]) { b(x + dx, 0.45, z + dz, [0.04, 0.8, 0.04], P.metal); cy(x + dx, 0.06, z + dz, [0.12, 0.08, 0.12], P.ardoise, [Math.PI / 2, 0, 0]) } b(x - 0.45, 1.0, z, [0.04, 0.4, 0.5], P.metal); b(x, 0.88, z, [0.5, 0.1, 0.3], P.ardoise) }
  const poste = (x: number, z: number) => { b(x, 0.74, z, [1.2, 0.05, 0.6], P.planche); for (const dx of [-0.55, 0.55]) b(x + dx, 0.37, z, [0.05, 0.74, 0.55], P.metal); b(x, 1.05, z - 0.18, [0.55, 0.36, 0.04], P.ardoise); b(x, 1.06, z - 0.155, [0.48, 0.28, 0.01], P.corailClair); cy(x, 0.25, z + 0.55, [0.42, 0.5, 0.42], P.ardoise) }
  const tri = (x: number, z: number, axeX: boolean) => [P.vert, P.ambre, P.gris].forEach((c, i) => { const px = axeX ? x + i * 0.55 : x, pz = axeX ? z : z + i * 0.55; b(px, 0.4, pz, [0.48, 0.8, 0.48], c); b(px, 0.82, pz, [0.5, 0.05, 0.5], melange(c, '#000000', 0.2)) })
  const panneau = (x: number, z: number, sur: 'z' | 'x') => { b(x, 1.55, z, sur === 'z' ? [2.0, 1.0, 0.05] : [0.05, 1.0, 2.0], P.planche); [P.ardoise, P.corail, P.ardoise, P.ambre, P.ardoise].forEach((c, i) => { const t = -0.8 + i * 0.4; b(sur === 'z' ? x + t : x + 0.04, 1.55, sur === 'z' ? z + 0.04 : z + t, sur === 'z' ? [0.1, 0.55 - (i % 2) * 0.15, 0.04] : [0.04, 0.55 - (i % 2) * 0.15, 0.1], c) }) }
  const extincteur = (x: number, z: number) => { cy(x, 0.28, z, [0.2, 0.5, 0.2], P.corailFonce); cy(x, 0.58, z, [0.08, 0.1, 0.08], P.ardoise) }
  if (plan.base === 'atelier') {
    quoi('allees'); ligne(-9.8, -1.3, 1.8, -1.3); ligne(1.4, -6.3, 1.4, -1.3); ligne(-1.9, -5.9, 0.6, -5.9); ligne(-1.9, -3.9, 0.6, -3.9); ligne(-1.9, -5.9, -1.9, -3.9); ligne(0.6, -5.9, 0.6, -3.9)
    quoi('zone-montage'); table(-0.65, -4.9)
    quoi('chariot'); chariot(1.05, -3.1)
    quoi('poste-travail'); poste(-1.3, -3.15)
    quoi('tri'); tri(1.55, -6.0, false)
    quoi('panneau-outils'); panneau(-0.6, -6.36, 'z')
    quoi('extincteur'); extincteur(-6.25, 1.2); extincteur(1.7, -1.6)
  } else if (plan.base === 'entrepot') {
    quoi('allees'); ligne(-10.8, -2.75, 8.8, -2.75); ligne(-10.8, 3.6, 8.8, 3.6); ligne(2.95, -2.7, 2.95, 3.6)
    quoi('zone-montage'); table(5.8, 3.0)
    quoi('chariot'); chariot(8.1, 2.9)
    quoi('poste-travail'); poste(7.9, -0.3)
    quoi('tri'); tri(6.0, -2.2, true)
    quoi('panneau-outils'); b(4.2, 0.75, -2.3, [0.06, 1.5, 0.06], P.metal); panneau(4.2, -2.3, 'z')
    quoi('extincteur'); extincteur(1.15, 3.75); extincteur(-3.85, 3.75); extincteur(8.7, -1.3)
  }
}

/** Range des modules dans un rectangle, en rangées (comme des livres sur une étagère) ; ce qui ne tient pas n'est pas posé. */
function ranger(mods: readonly Module[], r: Rect, jeu = 0.45): void {
  let x = r.x0, z = r.z0, rangee = 0
  for (const m of mods) {
    if (x + m.w > r.x1 + 1e-9 && x > r.x0) { x = r.x0; z += rangee + jeu; rangee = 0 }
    if (z + m.d > r.z1 + 1e-9 || m.w > r.x1 - r.x0 + 1e-9) continue
    m.poser(x, z)
    x += m.w + jeu; rangee = Math.max(rangee, m.d)
  }
}

// ── 3b. Le métier sur le chantier : le TYPE de bâtiment et l'avancement des travaux ───────────────────────────
export type TypeBatiment = 'maison' | 'pavillon' | 'grange' | 'immeuble' | 'commerce' | 'extension' | 'coupe'
/** Les chantiers typiques de chaque métier ; le type d'UN chantier se tire de son identifiant (stable). */
export const TYPES_CHANTIER: Record<Prereglage, TypeBatiment[]> = {
  electricien: ['immeuble', 'commerce', 'immeuble', 'maison'],
  peintre: ['immeuble', 'commerce', 'maison', 'immeuble'],
  couvreur: ['grange', 'maison', 'grange', 'pavillon'],
  macon: ['extension', 'extension', 'maison', 'extension'],
  plombier: ['coupe', 'coupe', 'maison', 'coupe'],
  carreleur: ['coupe', 'coupe', 'commerce', 'coupe'],
  chauffagiste: ['maison', 'pavillon', 'immeuble', 'maison'],
  menuisier: ['maison', 'pavillon', 'grange', 'maison'],
  general: ['maison', 'immeuble', 'commerce', 'extension'],
}
export const typeChantier = (metier: Prereglage, h: number): TypeBatiment => TYPES_CHANTIER[metier][Math.floor(((h * 11) % 1) * 4)]

export type Maison = {
  x: number; z: number; w: number; dd: number; ht: number
  /** Le hachage du chantier (formes, couleurs, fenêtres allumées le soir). */
  h: number; id: string
  /** L'avancement, 0 à 1 (la donnée `avancement` du chantier ; un chantier terminé vaut 1). */
  pct: number; termine: boolean; enCours: boolean; o: number
  /** La base dessinée (le terrain : jardin pour la maison, pavé pour l'entrepôt). */
  base?: Base
}
/** L'avancement à dessiner : la donnée elle-même (0 à 100 %), 1 si le chantier est terminé, 0 s'il n'est pas commencé. */
export function avancementDessine(c: { statut: string; etape: string | null; avancement: number | null }): number {
  if (c.statut === 'termine' || c.etape === 'a_facturer') return 1
  return Math.min(1, Math.max(0, (c.avancement ?? 0) / 100))
}

/** Dessine le chantier ; rend la hauteur de son sommet (l'épingle et la carte se posent au-dessus). */
export function maisonChantier(add: AjoutI, addF: AjoutF, m: Maison, metier: Prereglage): number {
  const k = pinceau(add, addF, m.o)
  const { x, z, h, id } = m
  const pct = m.termine ? 1 : m.pct, fini = pct >= 1
  const type = typeChantier(metier, h)
  const y0 = 0.06
  const murC = MURS[Math.floor(((h * 17) % 1) * MURS.length)], toitC = TOITS[Math.floor(((h * 3) % 1) * TOITS.length)]
  const h2 = (h * 29) % 1, h3 = (h * 41) % 1
  // Le terrain : un jardin à haie pour la base légère, du pavé ailleurs.
  k.B(x, 0.03, z, 4.2, 0.06, 4.2, m.base === 'legere' ? '#DCE2CC' : m.base === 'entrepot' ? '#E2DACC' : '#E9E1D3')
  if (m.base === 'legere') { k.B(x - 2.0, 0.35, z, 0.2, 0.6, 4.0, P.haie); k.B(x, 0.35, z - 2.0, 4.0, 0.6, 0.2, P.haie) }
  // Les dimensions selon le type (toutes tirées du hachage : même chantier, même bâtiment).
  let w = m.w, d = m.dd, ht = m.ht
  if (type === 'immeuble') { w = 2.8 + h2 * 0.5; d = 2.6 + h3 * 0.4; ht = 2.9 + Math.floor(h2 * 3) * 0.95 }
  else if (type === 'commerce') { w = 3.1; d = 2.6 + h3 * 0.3; ht = 2.0 }
  else if (type === 'grange') { w = 3.5; d = 2.4 + h3 * 0.4; ht = 1.5 + h2 * 0.4 }
  else if (type === 'pavillon') { w = d = 2.9 + h2 * 0.3; ht = 1.4 + h3 * 0.3 }
  else if (type === 'extension') { w = 2.2; d = 2.3; ht = 1.6 + h2 * 0.5 }
  else if (type === 'coupe') { w = 3.2; d = 2.8; ht = 1.7 }
  let xc = x, zc = z
  if (type === 'extension') { xc = x - 0.75; zc = z - 0.7 }
  if (metier === 'carreleur' && type !== 'coupe') { w = Math.min(w, 2.6); d = Math.min(d, 2.2); zc = z - 0.45 }
  const x0 = xc - w / 2, x1 = xc + w / 2, z0 = zc - d / 2, z1 = zc + d / 2
  const lumiere = (i: number, n: number) => (metier === 'electricien' && !fini ? i < Math.round(n * pct) : hacher(`${id}:f${i}`) < 0.6)
  let sommet = y0 + ht

  const echafaudage = (xa: number, xb: number, zf: number, haut: number) => {
    const zA = zf + 0.22, zB = zf + 0.62
    for (const px of [xa, xb]) for (const pz of [zA, zB]) k.Cy(px, haut / 2, pz, 0.06, haut, 0.06, P.ambre)
    for (let y = 0.9; y <= haut + 0.01; y += 0.9) { k.B((xa + xb) / 2, y, (zA + zB) / 2, xb - xa + 0.1, 0.05, 0.44, P.bois); k.B((xa + xb) / 2, y + 0.42, zB, xb - xa, 0.04, 0.04, P.ambre) }
  }
  const palette = (px: number, pz: number, c: string, couches: number) => { k.B(px, 0.13, pz, 0.9, 0.14, 0.8, P.bois); for (let i = 0; i < couches; i++) k.B(px, 0.26 + i * 0.12, pz, 0.8, 0.11, 0.7, i % 2 ? melange(c, '#FFFFFF', 0.15) : c) }
  const buisson = () => { k.S(x - 1.55, 0.35, z + 1.55, 0.7, 0.6, 0.7, P.sauge); k.S(x + 1.6, 0.3, z - 1.5, 0.55, 0.5, 0.55, P.sauge) }
  /** Le corps, la porte et les fenêtres ; `neuve` : la peinture (peintre, tous corps) monte avec l'avancement. */
  const corps = (hh: number, posees = 99, neuve: string | null = null) => {
    if (neuve && !fini) { k.vol(x0, z0, x1, z1, hh, melange(murC, P.gris, 0.4), y0); if (pct > 0) k.vol(x0 - 0.015, z0 - 0.015, x1 + 0.015, z1 + 0.015, hh * pct, neuve, y0) }
    else k.vol(x0, z0, x1, z1, hh, neuve ?? murC, y0)
    const av = neuve ? 0.016 : 0
    k.B(xc, y0 + 0.45, z1 + 0.012 + av, 0.55, 0.9, 0.04, posees > 0 ? P.boisFonce : P.ardoise)
    const etages = Math.max(1, Math.floor((hh - 0.3) / 0.95))
    // Les baies non posées (menuisier) restent sombres : on les dessine comme des trous.
    let i = 0
    const posee = () => ++i <= posees - 1
    for (let e = 0; e < etages; e++) for (const [fx, face] of [[x0 + 0.42, 'z'], [x1 - 0.42, 'z']] as const) {
      const y = y0 + 0.6 + e * 0.95
      if (posee()) { k.B(fx, y, z1 + 0.008 + av, 0.54, 0.5, 0.03, P.blanc); k.F(fx, y, z1 + 0.014 + av, 0.42, 0.38, 0.03, P.vitreJour, lumiere(i, 2 * etages + 2) ? P.lumiere : P.vitreNuit) }
      else k.B(fx, y, z1 + 0.006 + av, 0.46, 0.4, 0.03, P.ardoise)
      void face
    }
    for (const fz of [zc - d * 0.22, zc + d * 0.22]) {
      const y = y0 + 0.6
      if (posee()) { k.B(x1 + 0.008 + av, y, fz, 0.03, 0.5, 0.54, P.blanc); k.F(x1 + 0.014 + av, y, fz, 0.03, 0.38, 0.42, P.vitreJour, lumiere(i, 2 * etages + 2) ? P.lumiere : P.vitreNuit) }
      else k.B(x1 + 0.006 + av, y, fz, 0.03, 0.4, 0.46, P.ardoise)
    }
  }
  const neuve = PEINTURES[Math.floor(h3 * PEINTURES.length)]
  const peint = metier === 'peintre' || metier === 'general'
  const posees = metier === 'menuisier' || metier === 'general' ? (fini ? 99 : Math.round(7 * pct)) : 99
  const sensToit: 'x' | 'z' = h2 < 0.5 ? 'x' : 'z'

  switch (type) {
    case 'immeuble': {
      corps(ht, posees, peint ? neuve : null)
      sommet = k.plat(x0, z0, x1, z1, y0 + ht, P.pierre)
      k.vol(xc - 0.4, zc - 0.5, xc + 0.5, zc + 0.2, 0.6, P.pierre, sommet - 0.2)
      for (let e = 1; e < Math.floor(ht / 0.95); e++) k.B(xc, y0 + e * 0.95 + 0.05, z1 + 0.25, w * 0.5, 0.06, 0.5, P.pierre) // les balcons
      if (!fini && (peint || metier === 'electricien')) echafaudage(x0 - 0.25, x1 + 0.25, z1, Math.max(1.0, peint ? ht * 0.9 : 1.8))
      break
    }
    case 'commerce': {
      k.vol(x0, z0, x1, z1, ht, peint && !fini ? melange(murC, P.gris, 0.4) : murC, y0)
      if (peint && !fini && pct > 0) k.vol(x0 - 0.015, z0 - 0.015, x1 + 0.015, z1 + 0.015, ht * pct, neuve, y0)
      k.F(xc, y0 + 0.55, z1 + 0.02, w - 0.6, 0.9, 0.03, P.vitreJour, P.lumiere) // la vitrine
      k.B(xc, y0 + 1.22, z1 + 0.35, w - 0.3, 0.06, 0.8, hacher(`${id}:store`) < 0.5 ? P.corail : P.vert, [0.35, 0, 0]) // le store
      k.B(xc, y0 + 1.4, z1 + 0.02, w - 0.4, 0.22, 0.03, P.ardoise) // l'enseigne
      k.fenetres('z', z1, x0 + 0.2, x1 - 0.2, y0 + 1.75, 1, 1, `${id}:etage`, lumiere)
      sommet = k.deuxPans(x0, z0, x1, z1, y0 + ht, Math.PI / 4, toitC, { pignon: murC })
      if (!fini && peint) echafaudage(x0 - 0.25, x1 + 0.25, z1 + 0.6, 1.8)
      break
    }
    case 'grange': case 'maison': case 'pavillon': {
      corps(ht, posees, peint ? neuve : null)
      const couv = metier === 'couvreur' ? pct : 1
      if (type === 'pavillon' && (metier !== 'couvreur' || fini)) {
        const s = Math.max(w, d) * 1.45
        add('toit', [xc, y0 + ht + 0.75, zc], [s, 1.5, s], toitC, m.o, [0, Math.PI / 4, 0])
        sommet = y0 + ht + 1.5
      } else sommet = k.deuxPans(x0, z0, x1, z1, y0 + ht, Math.PI / 4, metier === 'couvreur' && h3 < 0.4 ? P.ardoiseToit : toitC, { sens: type === 'grange' ? 'x' : sensToit, couv, pignon: murC })
      if (type === 'grange') k.B(xc, y0 + 0.75, z1 + 0.02, 1.4, 1.5, 0.04, P.bois)
      if (!fini && (metier === 'couvreur' || peint)) echafaudage(x0 - 0.25, x1 + 0.25, z1, ht + (metier === 'couvreur' ? 0.1 : -0.2))
      if (!fini && metier === 'couvreur') { palette(x - 1.55, z + 1.55, h3 < 0.4 ? P.ardoiseToit : P.tuile, 4); k.B(x1 + 0.05, (ht + 0.6) / 2, z1 + 0.75, 0.06, ht + 0.8, 0.06, P.bois, [-0.22, 0, 0]) }
      if (metier === 'menuisier' && !fini) {
        // L'ossature bois d'une avancée : les montants montent, le bardage suit.
        const n = 6
        for (let i = 0; i < n; i++) if (i < Math.max(1, Math.round(n * pct))) k.B(x1 + 0.3, y0 + ht * 0.45, z0 + 0.3 + i * (d - 0.6) / (n - 1), 0.08, ht * 0.9, 0.08, P.bois)
        k.B(x1 + 0.3, y0 + ht * 0.9, zc, 0.12, 0.1, d - 0.4, P.bois)
        for (let i = 0; i < Math.min(2, 7 - posees); i++) k.B(x - 1.55 + i * 0.12, 0.42, z + 1.45 + i * 0.1, 0.62, 0.72, 0.05, P.bois, [-0.2, 0.3, 0])
      }
      if (metier === 'chauffagiste') {
        k.Cy(x0 + 0.4, sommet + 0.2, zc - 0.3, 0.2, 1.0, 0.2, P.metal) // le conduit
        if (fini || pct >= 0.6) { k.B(x1 + 0.3, 0.05, zc + 0.15, 0.42, 0.1, 0.95, P.ardoise); k.B(x1 + 0.3, 0.5, zc + 0.15, 0.4, 0.78, 1.0, '#ECE6DA'); k.Cy(x1 + 0.51, 0.5, zc - 0.02, 0.5, 0.03, 0.5, P.ardoise, [0, 0, Math.PI / 2]) }
        else { k.B(x - 1.4, 0.13, z + 1.5, 1.0, 0.14, 0.7, P.bois); k.B(x - 1.4, 0.6, z + 1.5, 0.95, 0.8, 0.6, P.carton) }
        if (!fini && pct > 0) k.B(x1 + 0.05, 0.35, z1 - (d * pct) / 2, 0.06, 0.06, d * pct, P.cuivre)
      }
      if (metier === 'carreleur') {
        k.B(x, 0.085, z + 1.45, 3.0, 0.05, 0.9, P.beton)
        const n = Math.round(14 * pct)
        for (let i = 0; i < n; i++) k.B(x - 1.29 + (i % 7) * 0.43, 0.125, z + 1.24 + Math.floor(i / 7) * 0.43, 0.4, 0.04, 0.4, i % 2 ? P.planche : P.pierre)
      }
      if (fini) buisson()
      break
    }
    case 'extension': {
      // La maison existante au fond à gauche ; l'extension (ou le garage) monte devant à droite, par rangs de parpaings.
      k.vol(x0, z0, x1, z1, ht, murC, y0)
      k.deuxPans(x0, z0, x1, z1, y0 + ht, Math.PI / 4, toitC, { sens: 'x', pignon: murC })
      k.fenetres('z', z1, x0 + 0.2, x1 - 0.2, y0 + 0.6, 1, 1, `${id}:maison`)
      sommet = y0 + ht + d / 2 + 0.1
      const ex0 = x1, ex1 = x1 + 1.6, ez0 = z1 - 1.6, ez1 = z1 + 0.6
      k.vol(ex0, ez0 - 0.15, ex1 + 0.15, ez1 + 0.15, 0.1, P.beton, y0)
      const hb = fini ? ht * 0.85 : Math.max(0.22, ht * 0.85 * pct), e = 0.16
      const murExt = fini ? murC : P.parpaing
      k.vol(ex0, ez1 - e, ex1, ez1, hb, murExt, y0 + 0.1); k.vol(ex1 - e, ez0, ex1, ez1, hb, murExt, y0 + 0.1); k.vol(ex0, ez0, ex1, ez0 + e, hb, murExt, y0 + 0.1)
      if (!fini) for (let y = 0.22; y < hb; y += 0.22) { k.B((ex0 + ex1) / 2, y0 + 0.1 + y, ez1 + 0.004, 1.6, 0.025, 0.012, P.joint); k.B(ex1 + 0.004, y0 + 0.1 + y, (ez0 + ez1) / 2, 0.012, 0.025, 2.2, P.joint) }
      if (fini) { k.vol(ex0 - 0.05, ez0 - 0.05, ex1 + 0.05, ez1 + 0.05, 0.12, P.pierre, y0 + 0.1 + hb); k.B((ex0 + ex1) / 2, y0 + 0.6, ez1 + 0.01, 1.1, 1.0, 0.03, P.nervure) }
      else { palette(x - 1.5, z + 1.6, P.parpaing, 3); k.Cy(x - 0.4, 0.45, z + 1.6, 0.6, 0.65, 0.6, P.corail, [0.55, 0, 0.3]); if (pct >= 0.45) echafaudage(ex0, ex1, ez1, Math.max(1.0, hb)) }
      break
    }
    case 'coupe': {
      // La maison EN COUPE (plombier, carreleur) : murs du fond pleins, murs face à la caméra arasés, cloison, salle d'eau.
      k.vol(x0, z0, x1, z1, 0.08, P.planche, y0)
      k.vol(x0, z0, x1, z0 + 0.16, ht, murC, y0); k.vol(x0, z0, x0 + 0.16, z1, ht, murC, y0)
      k.vol(x0, z1 - 0.16, x1, z1, 0.4, murC, y0); k.vol(x1 - 0.16, z0, x1, z1, 0.4, murC, y0)
      k.vol(xc - 0.08, z0, xc + 0.08, zc + 0.4, ht * 0.85, murC, y0) // la cloison
      k.deuxPans(x0, z0, x1, z1, y0 + ht, 0.6, toitC, { part: 'arriere' })
      sommet = y0 + ht + (d / 2) * Math.tan(0.6) + 0.1
      const sol = y0 + 0.08
      if (metier === 'carreleur') {
        // Le sol des deux pièces se carrelle (24 carreaux), la faïence monte sur le mur du fond.
        const n = Math.round(24 * pct)
        for (let i = 0; i < n; i++) k.B(x0 + 0.42 + (i % 6) * 0.47, sol + 0.02, z0 + 0.45 + Math.floor(i / 6) * 0.55, 0.44, 0.03, 0.5, i % 2 ? P.blanc : P.pierre)
        if (pct > 0) k.B(xc - w / 4, y0 + (ht * 0.8 * pct) / 2, z0 + 0.17, w / 2 - 0.2, ht * 0.8 * pct, 0.02, P.blanc)
        if (!fini) { k.B(x + 1.65, 0.1, z + 1.4, 0.5, 0.14, 0.9, P.boisFonce); for (let i = 0; i < 4; i++) k.B(x + 1.65, 0.22 + i * 0.08, z + 1.4, 0.44, 0.07, 0.84, i % 2 ? P.blanc : P.pierre) }
      } else {
        // La salle d'eau : baignoire, WC, lavabo, ballon — posés au fil du chantier ; le cuivre court sur le mur du fond.
        const app = [
          () => { k.B(x0 + 0.75, sol + 0.25, z0 + 0.6, 1.2, 0.5, 0.65, P.blanc); k.B(x0 + 0.75, sol + 0.42, z0 + 0.6, 1.0, 0.1, 0.45, P.pvc) },
          () => { k.B(xc + 0.5, sol + 0.2, z0 + 0.35, 0.36, 0.4, 0.5, P.blanc); k.B(xc + 0.5, sol + 0.55, z0 + 0.22, 0.36, 0.4, 0.15, P.blanc) },
          () => { k.B(x1 - 0.55, sol + 0.75, z0 + 0.3, 0.6, 0.12, 0.4, P.blanc); k.Cy(x1 - 0.55, sol + 0.38, z0 + 0.25, 0.12, 0.7, 0.12, P.blanc) },
          () => { k.Cy(x0 + 0.4, sol + 0.65, zc + 0.4, 0.5, 1.2, 0.5, P.blanc) },
        ]
        const n = fini ? app.length : Math.round(app.length * pct)
        app.slice(0, n).forEach((f) => f())
        for (let i = n; i < Math.min(app.length, n + 2); i++) k.B(x + 1.6 - (i - n) * 0.7, 0.35, z + 1.55, 0.6, 0.6, 0.5, P.carton)
        if (pct > 0) k.Cy(x0 + (w * pct) / 2, sol + 0.25, z0 + 0.2, 0.08, w * pct, 0.08, P.cuivre, [0, 0, Math.PI / 2])
      }
      if (fini) buisson()
      break
    }
  }
  // L'électricien : le touret et le câble déroulé vers le bâtiment ; le tableau posé à partir de la moitié.
  if (metier === 'electricien') {
    if (fini || pct >= 0.5) { k.B(x1 - 0.35, y0 + 0.9, z1 + 0.04, 0.4, 0.5, 0.06, P.ardoise); k.B(x1 - 0.35, y0 + 1.1, z1 + 0.075, 0.36, 0.06, 0.01, P.corail) }
    if (!fini) {
      for (const dx of [-0.22, 0.22]) k.Cy(x - 1.65 + dx, 0.42, z + 1.55, 0.84, 0.06, 0.84, P.bois, [0, 0, Math.PI / 2])
      k.Cy(x - 1.65, 0.42, z + 1.55, 0.6, 0.4, 0.6, P.corail, [0, 0, Math.PI / 2])
      const l = 1.6 * Math.max(0.08, pct)
      k.B(x - 1.45 + l / 2, 0.08, z + 1.55, l, 0.05, 0.05, P.ardoise)
    }
  }
  // Le plombier hors coupe : la tranchée de la rue au bâtiment, le tuyau y avance.
  if (metier === 'plombier' && type !== 'coupe' && !fini) {
    const za = z + 2.05, zb = z1 + 0.05, l = za - zb
    k.B(xc + 0.75, 0.065, (za + zb) / 2, 0.34, 0.02, l, P.boisFonce)
    if (pct > 0) k.Cy(xc + 0.75, 0.1, za - (l * pct) / 2, 0.12, l * pct, 0.12, P.cuivre, [Math.PI / 2, 0, 0])
  }
  return sommet
}

// ── Les véhicules (à leur gabarit) et les personnages ─────────────────────────────────────────────────────
/**
 * Un véhicule à son gabarit, le long de x (au parking) ou de z (garé sur le côté d'un chantier). `ouvert` : le camion-atelier
 * (sans local) a sa porte latérale et ses portes arrière ouvertes sur ses rangements. L'échelle du toit pour les métiers qui en portent.
 */
export function camionnette(add: AjoutI, addF: AjoutF, x: number, z: number, sens: 'x' | 'z', o: number, metier: Prereglage, gabarit: Gabarit = 'fourgonnette', ouvert = false): void {
  // Repère local : lx le long du véhicule (l'avant vers +lx), lz en travers (+lz : le côté vu par la caméra).
  const B = (lx: number, y: number, lz: number, sx: number, sy: number, sz: number, c: string, rx = 0) =>
    add('box', sens === 'x' ? [x + lx, y, z + lz] : [x - lz, y, z + lx], sens === 'x' ? [sx, sy, sz] : [sz, sy, sx], c, o, sens === 'x' ? [rx, 0, 0] : [0, 0, rx])
  const F = (lx: number, y: number, lz: number, sx: number, sy: number, sz: number, jour: string, nuit: string) => addF(sens === 'x' ? [x + lx, y, z + lz] : [x - lz, y, z + lx], sens === 'x' ? [sx, sy, sz] : [sz, sy, sx], jour, nuit, o)
  const roue = (lx: number, lz: number, d = 0.52) => add('cyl', sens === 'x' ? [x + lx, d * 0.54, z + lz] : [x - lz, d * 0.54, z + lx], [d, 0.2, d], P.ardoise, o, sens === 'x' ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2])
  const echelle = (lx: number, y: number, long: number) => { for (const lz of [0.4, -0.4]) B(lx, y, lz, long, 0.05, 0.05, P.metal); for (let i = 0; i < 5; i++) B(lx - long / 2 + 0.2 + i * (long - 0.4) / 4, y, 0, 0.05, 0.04, 0.8, P.metal) }
  const porteEchelle = metier === 'couvreur' || metier === 'peintre' || metier === 'electricien' || metier === 'general'
  if (gabarit === 'voiture') {
    B(0, 0.5, 0, 2.2, 0.5, 1.05, P.blanc); B(-0.15, 0.95, 0, 1.2, 0.42, 0.98, '#E3DDD2'); B(0.47, 0.95, 0, 0.04, 0.34, 0.9, P.vitre)
    for (const lz of [0.53, -0.53]) B(0, 0.52, lz, 2.0, 0.08, 0.02, P.corail)
    for (const [lx, lz] of [[-0.7, 0.5], [0.7, 0.5], [-0.7, -0.5], [0.7, -0.5]]) roue(lx, lz, 0.46)
    for (const lz of [0.35, -0.35]) F(1.11, 0.55, lz, 0.03, 0.08, 0.2, P.ampouleJour, P.phare)
    return
  }
  if (gabarit === 'camion') {
    // Le camion benne (ou plateau) : cabine haute, châssis, benne ouverte, six roues.
    B(1.9, 1.2, 0, 1.1, 1.5, 1.4, P.corail); B(2.46, 1.55, 0, 0.04, 0.6, 1.25, P.vitre); B(1.9, 0.38, 0, 1.1, 0.3, 1.4, P.ardoise)
    B(-0.6, 0.62, 0, 3.6, 0.22, 1.3, P.ardoise)
    B(-0.6, 0.78, 0, 3.4, 0.1, 1.5, P.metal)
    for (const lz of [0.72, -0.72]) B(-0.6, 1.15, lz, 3.4, 0.7, 0.06, P.metal)
    B(-2.27, 1.15, 0, 0.06, 0.7, 1.5, P.metal); B(1.1, 1.3, 0, 0.06, 1.0, 1.5, P.metal)
    B(-0.9, 0.95, 0, 1.6, 0.3, 1.0, P.granulat)
    for (const [lx, lz] of [[1.9, 0.65], [1.9, -0.65], [-1.2, 0.65], [-1.2, -0.65], [-1.95, 0.65], [-1.95, -0.65]]) roue(lx, lz, 0.72)
    for (const lz of [0.5, -0.5]) F(2.46, 0.75, lz, 0.03, 0.14, 0.24, P.ampouleJour, P.phare)
    return
  }
  const grand = gabarit === 'fourgon'
  const L = grand ? 3.0 : 2.3, H = grand ? 1.5 : 1.1, l = grand ? 1.35 : 1.25, yC = grand ? 1.05 : 0.85
  const av = L / 2 + 0.2
  B(-0.25, yC, 0, L, H, l, P.blanc)
  B(av, 0.68, 0, 0.9, 0.76, l - 0.03, '#E3DDD2'); B(av + 0.3, grand ? 1.05 : 0.86, 0, 0.32, 0.36, l - 0.09, P.vitre)
  for (const lz of [l / 2, -l / 2]) B(-0.25, 0.75, lz, L, 0.12, 0.02, P.corail)
  for (const lz of [0.4, -0.4]) F(av + 0.46, 0.62, lz, 0.03, 0.1, 0.22, P.ampouleJour, P.phare)
  for (const [lx, lz] of [[-L / 2 + 0.3, l / 2 - 0.03], [av - 0.05, l / 2 - 0.03], [-L / 2 + 0.3, -l / 2 + 0.03], [av - 0.05, -l / 2 + 0.03]]) roue(lx, lz)
  if (ouvert) {
    // La porte latérale glissée, l'intérieur visible : étagères, bacs de couleur, un établi rabattable ; portes arrière ouvertes.
    B(-0.9, yC, l / 2 + 0.06, 0.95, H - 0.1, 0.04, P.blanc)
    B(0.1, yC, l / 2 - 0.01, 1.4, H - 0.2, 0.02, P.ardoise)
    for (let e = 0; e < 3; e++) { B(0.1, yC - H / 2 + 0.35 + e * 0.38, l / 2 - 0.25, 1.35, 0.04, 0.4, P.bois); for (let i = 0; i < 4; i++) B(-0.42 + i * 0.34, yC - H / 2 + 0.47 + e * 0.38, l / 2 - 0.2, 0.28, 0.18, 0.3, [P.corail, P.ambre, P.vert, P.corailClair][(i + e) % 4]) }
    B(0.1, yC - H / 2 + 0.3, l / 2 + 0.35, 1.2, 0.05, 0.5, P.bois)
    for (const lz of [l / 2 + 0.3, -l / 2 - 0.3]) B(-L / 2 - 0.25, yC, lz, 0.04, H - 0.1, 0.62, P.blanc)
    B(-0.25, yC + H / 2 + 0.05, l / 2 + 0.45, L, 0.04, 0.9, P.bache, sens === 'x' ? 0.25 : -0.25) // l'auvent déroulé, court
  }
  if (porteEchelle) echelle(-0.3, yC + H / 2 + 0.06, L - 0.1)
}

/** Un personnage : jambes, buste à la couleur de son rôle, tête, casquette. Rend ses morceaux (pour le faire marcher). */
export function personnage(add: AjoutI, x: number, z: number, couleur: string, o: number, chef: boolean): { forme: Forme; index: number }[] {
  return [
    { forme: 'box', index: add('box', [x, 0.26, z], [0.32, 0.5, 0.2], '#5E5852', o) },
    { forme: 'box', index: add('box', [x, 0.76, z], [0.44, 0.52, 0.28], couleur, o) },
    { forme: 'sph', index: add('sph', [x, 1.17, z], [0.32, 0.32, 0.32], P.peau, o) },
    { forme: 'sph', index: add('sph', [x, 1.29, z], [0.34, 0.16, 0.34], chef ? P.corail : P.ambre, o) },
  ]
}

// ── Les rues : la marche les suit (lot 3 : « sans traverser une maison ni un bâtiment ») ───────────────────────────
const r1 = (v: number) => Math.round(v * 10) / 10
/** Les axes des rues de la ville (lib/crm/atelier.ts, decorVille) : entre les parcelles, tous les 5,6 m. */
export const RUES_X: readonly number[] = Array.from({ length: 15 }, (_, i) => r1(-36.4 + i * 5.6))
export const RUES_Z: readonly number[] = Array.from({ length: 12 }, (_, i) => r1(-30.8 + i * 5.6))
/** L'enclos de la base, bordé par la rue de ceinture (x = −14 et 25,2 ; z = ±14) : aucune rue ne le traverse, aucun chantier n'y est posé. */
export const ENCLOS = { x0: -14, x1: 25.2, z0: -14, z1: 14 } as const
/** Une parcelle de chantier hors de l'enclos (avec l'infrastructure, la rangée qui touchait la base est laissée libre). */
export const horsEnclos = (p: readonly number[]): boolean => !(p[0] > ENCLOS.x0 - 2.1 && p[0] < ENCLOS.x1 + 2.1 && p[2] > ENCLOS.z0 - 2.1 && p[2] < ENCLOS.z1 + 2.1)
/** Un tronçon de rue est ouvert s'il ne passe pas DANS l'enclos (la rue de ceinture, elle, est ouverte). */
function ouvert(a: readonly [number, number], b: readonly [number, number]): boolean {
  const e = 1e-6
  if (Math.abs(a[1] - b[1]) < e) return !(a[1] > ENCLOS.z0 + e && a[1] < ENCLOS.z1 - e && Math.max(a[0], b[0]) > ENCLOS.x0 + e && Math.min(a[0], b[0]) < ENCLOS.x1 - e)
  return !(a[0] > ENCLOS.x0 + e && a[0] < ENCLOS.x1 - e && Math.max(a[1], b[1]) > ENCLOS.z0 + e && Math.min(a[1], b[1]) < ENCLOS.z1 - e)
}
/**
 * Le plus court chemin PAR LES RUES entre deux points posés sur des rues (Dijkstra sur les carrefours ; les tronçons qui
 * traverseraient l'enclos de la base sont fermés). Rend la suite des points, du départ à l'arrivée ; null si rien ne relie.
 */
export function cheminRues(de: [number, number], vers: [number, number]): [number, number][] | null {
  const pts: [number, number][] = [de, vers]
  for (const x of RUES_X) for (const z of RUES_Z) pts.push([x, z])
  const sur = (v: number, w: number) => Math.abs(v - w) < 1e-6
  const voisins: { j: number; d: number }[][] = pts.map(() => [])
  const relier = (idx: number[], axe: 0 | 1) => {
    idx.sort((a, b) => pts[a][axe] - pts[b][axe])
    for (let k = 1; k < idx.length; k++) {
      const a = idx[k - 1], b = idx[k]
      if (!ouvert(pts[a], pts[b])) continue
      const d = dist(pts[a], pts[b])
      voisins[a].push({ j: b, d }); voisins[b].push({ j: a, d })
    }
  }
  for (const z of RUES_Z) relier(pts.map((p, i) => (sur(p[1], z) ? i : -1)).filter((i) => i >= 0), 0)
  for (const x of RUES_X) relier(pts.map((p, i) => (sur(p[0], x) ? i : -1)).filter((i) => i >= 0), 1)
  const d = pts.map(() => Infinity), prec = pts.map(() => -1), fait = pts.map(() => false)
  d[0] = 0
  for (;;) {
    let u = -1
    for (let i = 0; i < pts.length; i++) if (!fait[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i
    if (u < 0 || u === 1) break
    fait[u] = true
    for (const v of voisins[u]) if (d[u] + v.d < d[v.j] - 1e-9) { d[v.j] = d[u] + v.d; prec[v.j] = u }
  }
  if (!Number.isFinite(d[1])) return null
  const route: [number, number][] = []
  for (let i = 1; i >= 0; i = prec[i]) route.unshift(pts[i])
  return route
}
/**
 * Le trajet d'un compagnon : du poste de repos, par le chemin de sortie de la base (ses portes et ses allées), puis par les rues
 * jusqu'à la rue qui longe le devant de sa parcelle, et enfin à sa place devant la maison. `parcelle` : le centre de la parcelle.
 */
export function cheminVers(plan: PlanBase, de: [number, number], vers: [number, number], parcelle: [number, number]): [number, number][] {
  const E = plan.chemin[plan.chemin.length - 1]
  const A: [number, number] = [vers[0], r1(parcelle[1] + 2.8)]
  const rues = cheminRues([E[0], E[1]], A) ?? [[E[0], E[1]], A]
  const tout: [number, number][] = [de, ...plan.chemin.map((p) => [p[0], p[1]] as [number, number]), ...rues.slice(1), vers]
  return tout.filter((p, i) => i === 0 || dist(p, tout[i - 1]) > 1e-6)
}

// ── La marche vers le chantier du jour (Scene3D l'anime ; rien ne bouge avec « réduire les animations ») ─────────
/** 6,5 m de maquette par seconde (le trajet suit les rues : plus long qu'à vol d'oiseau) ; départ 1,3 s après l'ouverture ; 0,35 s entre deux personnages. */
export const MARCHE = { vitesse: 6.5, departMs: 1300, decalageMs: 350 } as const
function dist(a: readonly number[], b: readonly number[]): number { return Math.hypot(b[0] - a[0], b[1] - a[1]) }
const trace = (m: Pick<Mobile, 'de' | 'porte' | 'vers' | 'chemin'>): [number, number][] => m.chemin ?? [m.de, m.porte, m.vers]
/** La longueur du trajet (le chemin par les rues, ou de → porte → vers). */
export const longueurMarche = (m: Pick<Mobile, 'de' | 'porte' | 'vers' | 'chemin'>): number => trace(m).reduce((t, p, i, l) => (i ? t + dist(l[i - 1], p) : 0), 0)
/** Combien de temps (ms, depuis l'ouverture) jusqu'à ce que le dernier personnage soit arrivé. */
export function dureeMarche(mobiles: readonly Mobile[]): number {
  return mobiles.reduce((t, m) => Math.max(t, MARCHE.departMs + m.ordre * MARCHE.decalageMs + (longueurMarche(m) / MARCHE.vitesse) * 1000), 0)
}
/**
 * Le décalage [dx, dy, dz] d'un morceau de personnage par rapport à son ARRIVÉE, `t` ms après l'ouverture : au départ avant son
 * tour, sur le trajet ensuite (avec un léger rebond de pas), [0, 0, 0] une fois arrivé.
 */
export function decalageMarche(m: Mobile, t: number): [number, number, number] {
  const l = trace(m), L = longueurMarche(m)
  const brut = Math.max(0, ((t - MARCHE.departMs - m.ordre * MARCHE.decalageMs) / 1000) * MARCHE.vitesse)
  if (brut >= L) return [0, 0, 0]
  // Départ et arrêt en douceur (easeInOutSine sur la progression, même durée totale) : pas d'à-coup au premier ni au dernier pas.
  const s = L * (0.5 - 0.5 * Math.cos(Math.PI * (brut / L)))
  let reste = s
  for (let i = 1; i < l.length; i++) {
    const seg = dist(l[i - 1], l[i])
    if (reste <= seg || i === l.length - 1) {
      const k = seg ? Math.min(1, reste / seg) : 1
      const x = l[i - 1][0] + (l[i][0] - l[i - 1][0]) * k, z = l[i - 1][1] + (l[i][1] - l[i - 1][1]) * k
      return [x - m.vers[0], s > 0 ? 0.06 * Math.abs(Math.sin(s * 3.6)) : 0, z - m.vers[1]]
    }
    reste -= seg
  }
  return [0, 0, 0]
}

// ── 4. Jour et nuit ──────────────────────────────────────────────────────────────────────────────────────────
export type Moment = 'jour' | 'crepuscule' | 'nuit'
/** L'heure de Paris, en heures décimales (14 h 30 → 14,5), quel que soit le fuseau du navigateur. */
export function heureParis(d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return v('hour') + v('minute') / 60
}
/** Jour de 8 h à 18 h, crépuscule de 6 h 30 à 8 h et de 18 h à 20 h, nuit sinon. */
export function momentDe(heure: number): Moment {
  const h = ((heure % 24) + 24) % 24
  if (h >= 8 && h < 18) return 'jour'
  if ((h >= 6.5 && h < 8) || (h >= 18 && h < 20)) return 'crepuscule'
  return 'nuit'
}
export type Ambiance = {
  moment: Moment; fond: string
  ciel: string; terre: string; hemi: number
  soleil: string; intensite: number; position: V3
  /** Les fenêtres et les lampadaires sont-ils allumés ? */
  lumieres: boolean
}
export function ambiance(heure: number): Ambiance {
  const moment = momentDe(heure)
  if (moment === 'jour') return { moment, fond: P.sol, ciel: '#FFFDF8', terre: '#DCD0BE', hemi: 1.4, soleil: '#FFF3E2', intensite: 1.5, position: [-24, 44, 14], lumieres: false }
  // Crépuscule : une lumière rasante dorée mais retenue (lot 3 : « moins orange saturé »).
  if (moment === 'crepuscule') return { moment, fond: '#E7DCD2', ciel: '#F7E7DA', terre: '#B7A898', hemi: 1.15, soleil: '#F4C7A1', intensite: 1.05, position: [-40, 18, 10], lumieres: true }
  // Nuit : ciel bleu nuit TRÈS désaturé (le bleu ne domine jamais : b − r < 25), lune froide et légère, sol encore lisible ;
  // fenêtres et lampadaires chauds ressortent par contraste (lot 3 : « moins brun boueux »).
  return { moment, fond: '#262A31', ciel: '#7E8796', terre: '#3B3732', hemi: 0.95, soleil: '#C9D1DB', intensite: 0.55, position: [-20, 40, -18], lumieres: true }
}

// ── Démonstration : un jeu de données fictives ramené au cas voulu (page /atelier-demo, drapeau levé) ─────────
/**
 * Le jeu d'exemple ramené à ce qu'une base suppose, pour que la démonstration ne montre pas un décor que les données démentent :
 * légère et sans local = l'artisan seul, un véhicule, sans stock ; atelier = trois personnes, deux véhicules, quatre catégories ;
 * entrepôt = tout. Options : la forme juridique (statut) et un camion benne dans le parc. Données FICTIVES (lib/crm/exemple.ts).
 */
export function echantillonPourBase(d: DonneesAtelier, base: Base, opt: { statut?: Statut; camion?: boolean } = {}): DonneesAtelier {
  const seul = base === 'legere' || base === 'camion'
  const membres = base === 'entrepot' ? d.membres : d.membres.slice(0, seul ? 1 : 3)
  let vehicules = base === 'entrepot' ? d.vehicules : d.vehicules.slice(0, seul ? 1 : 2)
  if (base === 'camion') vehicules = vehicules.map((v, i) => (i === 0 ? { ...v, nom: 'Fourgon atelier (Master)' } : v))
  if (opt.camion) vehicules = vehicules.map((v, i) => (i === vehicules.length - 1 ? { ...v, nom: 'Camion benne 3,5 t' } : v))
  const cats = [...new Set(d.materiaux.map((m) => (m.categorie ?? '').trim() || 'Sans catégorie'))].sort((a, b) => a.localeCompare(b, 'fr')).slice(0, base === 'entrepot' ? 99 : seul ? 0 : 4)
  const materiaux = base === 'entrepot' ? d.materiaux : d.materiaux.filter((m) => cats.includes((m.categorie ?? '').trim() || 'Sans catégorie')).slice(0, 15)
  const ids = new Set(membres.map((m) => m.id)), vids = new Set(vehicules.map((v) => v.id)), mids = new Set(materiaux.map((m) => m.id))
  return {
    ...d, membres, vehicules, materiaux,
    ...(opt.statut ? { formeJuridique: opt.statut === 'societe' ? 'SARL' : 'EI' } : {}),
    chantiers: d.chantiers.map((c) => ({ ...c, equipe: c.equipe.filter((id) => ids.has(id)), vehicule_id: c.vehicule_id && vids.has(c.vehicule_id) ? c.vehicule_id : null })),
    reservations: (d.reservations ?? []).filter((r) => mids.has(r.materiau_id)),
    commandes: seul ? [] : d.commandes,
  }
}
