// CRM — le PLAN DU BÂTIMENT d'un chantier (lot 7, Benj : « le plan du chantier, le modèle est nul »). Module PUR.
//
// Le chantier se lit dans SON bâtiment — le même type que sur la carte de l'atelier (lib/crm/carte.ts : maison, appartement, immeuble,
// hôtel, restaurant…). Chaque type a un plan d'étage schématique (des pièces disposées comme un vrai logement, un restaurant, une
// école…). Les pièces des tâches (lib/crm/plan.ts, planChantier) y prennent leur place : la cuisine des tâches dans la cuisine du plan,
// « Chambre 2 » dans la deuxième chambre ; une pièce que le plan n'a pas devient une ANNEXE posée à côté ; les pièces sans tâche
// restent sur le plan, neutres (« pas de travaux »). La toiture, la façade et l'extérieur ne sont pas des pièces : ce sont
// l'enveloppe et les abords du bâtiment ; « Général » couvre tout le chantier.
// Le même plan sert au SCHÉMA 2D (app/crm/PlanChantier.tsx, en SVG) et à la MAQUETTE 3D (lib/crm/planScene.ts) : mêmes pièces,
// mêmes états, mêmes clics. Les mesures sont en mètres, schématiques (pas à l'échelle d'un relevé).
import { GENERAL, type PiecePlan } from './plan.ts'
import type { TypeBat } from './carte.ts'

/** Le mobilier reconnaissable d'une pièce (dessiné par lib/crm/planScene.ts). */
export type Meuble =
  | 'sejour' | 'cuisine' | 'chambre' | 'sdb' | 'wc' | 'entree' | 'couloir' | 'garage' | 'escalier' | 'technique'
  | 'salleResto' | 'cuisinePro' | 'reserve' | 'boutique' | 'openspace' | 'bureau' | 'reunion' | 'classe' | 'cantine'
  | 'cabinet' | 'attente' | 'accueil' | 'vestiaire' | 'gymnase' | 'stockage' | 'atelierPro' | 'etable' | 'terrasse'
  | 'jardin' | 'piscine' | 'cour' | 'logement' | 'existant' | 'generique'
type Emplacement = { cle: string; nom: string; motif: RegExp; x: number; z: number; w: number; d: number; meuble: Meuble; option?: boolean }
export type Gabarit = { largeur: number; profondeur: number; /** étages sous le plan (appartement au 2e : 2) */ sous: number; emplacements: Emplacement[] }

// Les motifs sur le NOM de la pièce (normalisé : minuscules, sans accents).
const SEJ = /sejour|salon|living|salle a manger|piece de vie/
const CHB = /chambre/
const SDB = /salle de bain|salle d eau|sdb|douche/
const WC = /\bwc\b|toilettes?|sanitaire/
const CUI = /cuisine/
const ENT = /entree|hall|accueil/
const COU = /couloir|degagement|palier|escalier|circulation/
const GAR = /garage|cellier|buanderie|cave|chaufferie|local technique|technique|reserve/
const EXT = /exterieur|jardin|cour|terrasse|preau/
const E = (cle: string, nom: string, motif: RegExp, x: number, z: number, w: number, d: number, meuble: Meuble, option = false): Emplacement => ({ cle, nom, motif, x, z, w, d, meuble, option })

export const GABARITS: Record<TypeBat, Gabarit> = {
  maison: { largeur: 10, profondeur: 8, sous: 0, emplacements: [
    E('chambre1', 'Chambre', CHB, 0, 0, 3.6, 3.2, 'chambre'), E('chambre2', 'Chambre 2', CHB, 3.6, 0, 3.2, 3.2, 'chambre'),
    E('sdb', 'Salle de bain', SDB, 6.8, 0, 2.0, 3.2, 'sdb'), E('wc', 'WC', WC, 8.8, 0, 1.2, 3.2, 'wc'),
    E('sejour', 'Séjour', SEJ, 0, 3.2, 5.2, 4.8, 'sejour'), E('couloir', 'Couloir', COU, 5.2, 3.2, 4.8, 1.2, 'couloir'),
    E('cuisine', 'Cuisine', CUI, 5.2, 4.4, 3.0, 3.6, 'cuisine'), E('entree', 'Entrée', ENT, 8.2, 4.4, 1.8, 3.6, 'entree'),
    E('garage', 'Garage', GAR, 10, 3.2, 3.2, 4.8, 'garage', true),
  ] },
  appartement: { largeur: 9, profondeur: 7, sous: 2, emplacements: [
    E('chambre1', 'Chambre', CHB, 0, 0, 3.4, 3, 'chambre'), E('sdb', 'Salle de bain', SDB, 3.4, 0, 2.2, 3, 'sdb'), E('wc', 'WC', WC, 5.6, 0, 1.2, 3, 'wc'),
    E('chambre2', 'Chambre 2', CHB, 6.8, 0, 2.2, 3, 'chambre'), E('sejour', 'Séjour', SEJ, 0, 3, 4.6, 4, 'sejour'),
    E('couloir', 'Couloir', COU, 4.6, 3, 4.4, 1.2, 'couloir'), E('cuisine', 'Cuisine', CUI, 4.6, 4.2, 2.6, 2.8, 'cuisine'), E('entree', 'Entrée', ENT, 7.2, 4.2, 1.8, 2.8, 'entree'),
    E('cave', 'Cave', GAR, 9, 3, 2.4, 2.4, 'garage', true),
  ] },
  immeuble: { largeur: 12, profondeur: 8, sous: 0, emplacements: [
    E('logA', 'Logement A', new RegExp(`${SEJ.source}|${CHB.source}|${CUI.source}|${SDB.source}|logement|appartement`), 0, 0, 6, 4, 'logement'),
    E('logB', 'Logement B', new RegExp(`${SEJ.source}|${CHB.source}|${CUI.source}|${SDB.source}|logement|appartement`), 6, 0, 6, 4, 'logement'),
    E('hall', 'Hall d’entrée', ENT, 0, 4, 4, 4, 'entree'), E('escalier', 'Cage d’escalier', COU, 4, 4, 2.4, 4, 'escalier'),
    E('technique', 'Local technique', GAR, 6.4, 4, 2.8, 4, 'technique'), E('communs', 'Local vélos', /velo|poubelle|commun/, 9.2, 4, 2.8, 4, 'reserve'),
    E('wc', 'Sanitaires', WC, 12, 4, 2, 2, 'wc', true),
  ] },
  hotel: { largeur: 12, profondeur: 8, sous: 0, emplacements: [
    E('ch101', 'Chambre 101', CHB, 0, 0, 3.4, 3.4, 'chambre'), E('sdb101', 'Salle de bain 101', SDB, 3.4, 0, 1.6, 3.4, 'sdb'),
    E('ch102', 'Chambre 102', CHB, 5, 0, 3.4, 3.4, 'chambre'), E('sdb102', 'Salle de bain 102', SDB, 8.4, 0, 1.6, 3.4, 'sdb'),
    E('office', 'Office', GAR, 10, 0, 2, 3.4, 'technique'), E('couloir', 'Couloir', COU, 0, 3.4, 12, 1.2, 'couloir'),
    E('accueil', 'Accueil', ENT, 0, 4.6, 4, 3.4, 'accueil'), E('salle', 'Salle des petits-déjeuners', new RegExp(`${SEJ.source}|salle|restaurant|bar`), 4, 4.6, 5, 3.4, 'salleResto'),
    E('cuisine', 'Cuisine', CUI, 9, 4.6, 3, 3.4, 'cuisinePro'), E('wc', 'Sanitaires', WC, 12, 4.6, 1.6, 3.4, 'wc', true),
  ] },
  restaurant: { largeur: 12, profondeur: 8, sous: 0, emplacements: [
    E('salle', 'Salle', new RegExp(`${SEJ.source}|salle|bar|comptoir`), 0, 0, 7, 6, 'salleResto'), E('cuisine', 'Cuisine', CUI, 7, 0, 5, 4, 'cuisinePro'),
    E('reserve', 'Réserve', GAR, 7, 4, 2.6, 2, 'reserve'), E('wc', 'WC', new RegExp(`${WC.source}|${SDB.source}`), 9.6, 4, 2.4, 2, 'wc'),
    E('entree', 'Entrée', ENT, 0, 6, 3, 2, 'entree'), E('terrasse', 'Terrasse', EXT, 3, 6, 9, 2, 'terrasse'),
  ] },
  commerce: { largeur: 10, profondeur: 7, sous: 0, emplacements: [
    E('reserve', 'Réserve', GAR, 0, 0, 4, 2.6, 'reserve'), E('bureau', 'Bureau', /bureau/, 4, 0, 3, 2.6, 'bureau'), E('wc', 'WC', new RegExp(`${WC.source}|${SDB.source}`), 7, 0, 1.4, 2.6, 'wc'),
    E('cuisine', 'Coin cuisine', CUI, 8.4, 0, 1.6, 2.6, 'cuisine'), E('vente', 'Espace de vente', new RegExp(`${SEJ.source}|${ENT.source}|boutique|vente|magasin|vitrine`), 0, 2.6, 10, 4.4, 'boutique'),
  ] },
  bureaux: { largeur: 12, profondeur: 8, sous: 0, emplacements: [
    E('bureau1', 'Bureau 1', new RegExp(`bureau|${CHB.source}`), 0, 0, 3, 3, 'bureau'), E('bureau2', 'Bureau 2', new RegExp(`bureau|${CHB.source}`), 3, 0, 3, 3, 'bureau'),
    E('cuisine', 'Cafétéria', CUI, 6, 0, 2.4, 3, 'cuisine'), E('wc', 'Sanitaires', new RegExp(`${WC.source}|${SDB.source}`), 8.4, 0, 1.6, 3, 'wc'),
    E('technique', 'Local technique', GAR, 10, 0, 2, 3, 'technique'), E('open', 'Plateau', new RegExp(`${SEJ.source}|open|plateau|espace`), 0, 3, 8, 5, 'openspace'),
    E('reunion', 'Salle de réunion', /reunion|salle/, 8, 3, 4, 2.2, 'reunion'), E('accueil', 'Accueil', ENT, 8, 5.2, 4, 2.8, 'accueil'),
  ] },
  entrepot: { largeur: 14, profondeur: 9, sous: 0, emplacements: [
    E('stockage', 'Zone de stockage', new RegExp(`${GAR.source}|stock|entrepot|hangar|cellule`), 0, 0, 9, 9, 'stockage'), E('atelier', 'Atelier', /atelier|production/, 9, 0, 5, 4, 'atelierPro'),
    E('bureaux', 'Bureaux', new RegExp(`bureau|${SEJ.source}|${CUI.source}`), 9, 4, 5, 2.6, 'bureau'), E('wc', 'Sanitaires', new RegExp(`${WC.source}|${SDB.source}|vestiaire`), 9, 6.6, 2.6, 2.4, 'wc'),
    E('quai', 'Quai', /quai|chargement|exterieur/, 11.6, 6.6, 2.4, 2.4, 'reserve'),
  ] },
  ecole: { largeur: 13, profondeur: 8, sous: 0, emplacements: [
    E('classe1', 'Classe 1', new RegExp(`classe|${CHB.source}|${SEJ.source}`), 0, 0, 4.3, 3.6, 'classe'), E('classe2', 'Classe 2', new RegExp(`classe|${CHB.source}|${SEJ.source}`), 4.3, 0, 4.3, 3.6, 'classe'),
    E('classe3', 'Classe 3', new RegExp(`classe|${CHB.source}|${SEJ.source}`), 8.6, 0, 4.4, 3.6, 'classe'), E('couloir', 'Couloir', COU, 0, 3.6, 13, 1.2, 'couloir'),
    E('hall', 'Hall', ENT, 0, 4.8, 3, 3.2, 'entree'), E('cantine', 'Cantine', new RegExp(`${CUI.source}|cantine|refectoire`), 3, 4.8, 5, 3.2, 'cantine'),
    E('sanitaires', 'Sanitaires', new RegExp(`${WC.source}|${SDB.source}`), 8, 4.8, 2.6, 3.2, 'wc'), E('preau', 'Préau', EXT, 10.6, 4.8, 2.4, 3.2, 'cour'),
  ] },
  sante: { largeur: 11, profondeur: 8, sous: 0, emplacements: [
    E('cab1', 'Cabinet 1', new RegExp(`cabinet|consultation|soin|${CHB.source}`), 0, 0, 3.6, 3.4, 'cabinet'), E('cab2', 'Cabinet 2', new RegExp(`cabinet|consultation|soin|${CHB.source}`), 3.6, 0, 3.6, 3.4, 'cabinet'),
    E('wc', 'Sanitaires', new RegExp(`${WC.source}|${SDB.source}`), 7.2, 0, 2, 3.4, 'wc'), E('technique', 'Local technique', GAR, 9.2, 0, 1.8, 3.4, 'technique'),
    E('couloir', 'Couloir', COU, 0, 3.4, 11, 1.2, 'couloir'), E('accueil', 'Accueil', ENT, 0, 4.6, 4, 3.4, 'accueil'),
    E('attente', 'Salle d’attente', new RegExp(`${SEJ.source}|attente|salle`), 4, 4.6, 7, 3.4, 'attente'),
  ] },
  equipement: { largeur: 14, profondeur: 10, sous: 0, emplacements: [
    E('salle', 'Salle de sport', new RegExp(`${SEJ.source}|salle|sport|gymnase|terrain`), 0, 0, 10, 10, 'gymnase'), E('vestiaires', 'Vestiaires', new RegExp(`vestiaire|${SDB.source}`), 10, 0, 4, 4, 'vestiaire'),
    E('wc', 'Sanitaires', WC, 10, 4, 4, 2, 'wc'), E('hall', 'Hall', ENT, 10, 6, 4, 2.4, 'entree'), E('technique', 'Local technique', GAR, 10, 8.4, 4, 1.6, 'technique'),
  ] },
  exterieur: { largeur: 10, profondeur: 8, sous: 0, emplacements: [
    E('maison', 'Maison (existante)', /(?!)/, 0, 0, 10, 2.6, 'existant'), E('terrasse', 'Terrasse', /terrasse|pergola|deck/, 0, 2.6, 4, 2.4, 'terrasse'),
    E('piscine', 'Piscine', /piscine|bassin|spa/, 4, 2.6, 6, 3, 'piscine'), E('jardin', 'Jardin', new RegExp(`${EXT.source}|jardin|pelouse|allee|cloture|portail|haie`), 0, 5.6, 10, 2.4, 'jardin'),
  ] },
  agricole: { largeur: 12, profondeur: 8, sous: 0, emplacements: [
    E('grange', 'Grange', new RegExp(`${GAR.source}|grange|stock|foin|hangar`), 0, 0, 7, 8, 'stockage'), E('etable', 'Étable', /etable|stabulation|ecurie|bergerie/, 7, 0, 5, 5, 'etable'),
    E('atelier', 'Atelier', /atelier|materiel/, 7, 5, 5, 3, 'atelierPro'),
  ] },
}

export type Sorte = 'piece' | 'annexe' | 'exterieur'
export type Zone = { cle: string; nom: string; sorte: Sorte; x: number; z: number; w: number; d: number; meuble: Meuble; piece: PiecePlan | null }
export type PlanBatiment = {
  type: TypeBat; largeur: number; profondeur: number; sous: number
  zones: Zone[]
  /** L'enveloppe et le chantier entier : la toiture, la façade, « Général » (null : pas de tâche à ce titre). */
  toiture: PiecePlan | null; facade: PiecePlan | null; general: PiecePlan | null
  /** Les pièces des tâches posées en annexe (le plan du type ne les avait pas). */
  annexes: string[]
}
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Le plan du bâtiment : le gabarit du type, chaque pièce des tâches dans le premier emplacement libre qui la reconnaît, sinon en
 * annexe ; l'extérieur dans l'emplacement extérieur du gabarit (terrasse, préau…) ou dans une bande de jardin devant ; la toiture,
 * la façade et « Général » à part. Déterministe : l'ordre est celui des pièces (planChantier).
 */
export function planBatiment(type: TypeBat, pieces: readonly PiecePlan[]): PlanBatiment {
  const g = GABARITS[type]
  const libres = new Map(g.emplacements.map((e) => [e.cle, e]))
  const pris = new Map<string, PiecePlan>()
  const annexes: PiecePlan[] = []
  let toiture: PiecePlan | null = null, facade: PiecePlan | null = null, general: PiecePlan | null = null, exterieur: PiecePlan | null = null
  for (const p of pieces) {
    const n = norm(p.nom)
    if (p.nom === GENERAL) { general = p; continue }
    if (/toiture|toit|couverture|charpente|combles?/.test(n)) { toiture = p; continue }
    if (/facade|ravalement|bardage/.test(n)) { facade = p; continue }
    const e = [...libres.values()].find((x) => x.meuble !== 'existant' && x.motif.test(n))
    if (e) { pris.set(e.cle, p); libres.delete(e.cle); continue }
    if (EXT.test(n) || /piscine|allee|cloture|portail/.test(n)) { exterieur = p; continue }
    annexes.push(p)
  }
  const zones: Zone[] = g.emplacements
    .filter((e) => !e.option || pris.has(e.cle))
    .map((e) => ({ cle: e.cle, nom: pris.get(e.cle)?.nom ?? e.nom, sorte: (['terrasse', 'jardin', 'piscine', 'cour'].includes(e.meuble) ? 'exterieur' : 'piece') as Sorte, x: e.x, z: e.z, w: e.w, d: e.d, meuble: e.meuble, piece: pris.get(e.cle) ?? null }))
  // Les annexes : une rangée de pièces de 3 × 3 m accolée à droite du bâtiment (après un éventuel garage).
  const droite = Math.max(g.largeur, ...zones.map((z) => z.x + z.w))
  annexes.forEach((p, i) => zones.push({ cle: `annexe:${i}`, nom: p.nom, sorte: 'annexe', x: droite + Math.floor(i / 3) * 3, z: (i % 3) * 3, w: 3, d: 3, meuble: 'generique', piece: p }))
  // L'extérieur sans emplacement : une bande de jardin devant le bâtiment.
  if (exterieur) zones.push({ cle: 'abords', nom: exterieur.nom, sorte: 'exterieur', x: 0, z: g.profondeur + 0.8, w: g.largeur, d: 2.4, meuble: 'jardin', piece: exterieur })
  return { type, largeur: Math.max(g.largeur, ...zones.map((z) => z.x + z.w)), profondeur: Math.max(g.profondeur, ...zones.map((z) => z.z + z.d)), sous: g.sous, zones, toiture, facade, general, annexes: annexes.map((p) => p.nom) }
}

// ── Le schéma 2D : où écrire le nom et le pourcentage de chaque pièce, sans déborder ni chevaucher ───────────────────────────
export const ABREGES: Record<string, string> = { 'Salle de bain': 'SdB', 'Salle de bain 101': 'SdB 101', 'Salle de bain 102': 'SdB 102', 'Salle des petits-déjeuners': 'Salle', 'Local technique': 'Local', 'Cage d’escalier': 'Escalier', 'Hall d’entrée': 'Hall', 'Salle de réunion': 'Réunion', 'Salle d’attente': 'Attente', 'Zone de stockage': 'Stockage', 'Espace de vente': 'Vente', 'Maison (existante)': 'Maison' }
/** La largeur approchée d'un texte (px) : 0,58 em par caractère, en gras. */
export const largeurTexte = (t: string, taille: number): number => [...t].length * taille * 0.58
export type EtiquetteSchema = { cle: string; lignes: string[]; x: number; y: number; taille: number; l: number; h: number }
/**
 * Les étiquettes du schéma (en pixels, `echelle` px par mètre) : le nom (abrégé s'il ne tient pas) et le pourcentage, centrés dans la
 * pièce ; une pièce trop petite garde son seul pourcentage, ou rien. Chaque étiquette tient DANS sa pièce : deux étiquettes ne
 * peuvent donc pas se chevaucher (les pièces ne se chevauchent pas).
 */
export function etiquettesSchema(plan: PlanBatiment, echelle: number): EtiquetteSchema[] {
  const sortie: EtiquetteSchema[] = []
  for (const z of plan.zones) {
    const lp = z.w * echelle - 8, hp = z.d * echelle - 6
    const pct = z.piece ? `${z.piece.pct} %` : ''
    for (const taille of [12, 11, 10]) {
      const essais: string[][] = [[z.nom, pct], [ABREGES[z.nom] ?? z.nom, pct], [pct], [ABREGES[z.nom] ?? z.nom]].map((l) => l.filter(Boolean))
      const ok = essais.find((l) => l.length && l.every((t) => largeurTexte(t, taille) <= lp) && l.length * taille * 1.25 <= hp)
      if (ok) {
        const l = Math.max(...ok.map((t) => largeurTexte(t, taille))), h = ok.length * taille * 1.25
        sortie.push({ cle: z.cle, lignes: ok, x: (z.x + z.w / 2) * echelle - l / 2, y: (z.z + z.d / 2) * echelle - h / 2, taille, l, h })
        break
      }
    }
  }
  return sortie
}
/** Deux zones du plan se chevauchent-elles (pour les tests) ? */
export const zonesSeCoupent = (a: Zone, b: Zone): boolean => a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.z < b.z + b.d - 1e-6 && b.z < a.z + a.d - 1e-6

/** « Répartir les tâches par pièce » : s'offre quand aucune tâche n'a de pièce CHOISIE et que le plan n'en distingue qu'une (ou aucune). */
export function repartitionUtile(pieces: readonly PiecePlan[]): boolean {
  const toutes = pieces.flatMap((p) => p.taches)
  return toutes.length > 0 && toutes.every((t) => t.pieceDevinee) && pieces.filter((p) => p.nom !== GENERAL).length <= 1
}
