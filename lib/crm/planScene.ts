// CRM — la MAQUETTE du chantier (lot 7, Benj : « le plan du chantier, le modèle est nul ») : le BÂTIMENT du chantier, en coupe
// isométrique, avec ses pièces. Module PUR : à partir du plan du bâtiment (lib/crm/planBatiment.ts — le même type que sur la carte
// de l'atelier), il pose les volumes que app/crm/atelier/SceneChantier.tsx dessine. Même méthode que l'atelier : une forme = une
// couche instanciée, donc au plus cinq appels de dessin (plus le sol), quel que soit le bâtiment.
//
// Ce qu'on voit : le sol de chaque pièce coloré selon son état (pas de travaux · à faire · en cours · fini), les murs coupés (hauts au
// fond et à gauche, bas devant et à droite : on voit dedans), chaque pièce MEUBLÉE de façon reconnaissable (lit, canapé, cuisine,
// baignoire, pupitres, casiers…), les TRAVAUX DU MÉTIER dans les pièces du chantier (cuivre, câbles, carrelage, plaques, peinture,
// parpaings…), les compagnons dans la pièce où ils ont des tâches, la toiture du chantier soulevée au-dessus (vue éclatée), la façade
// et l'ensemble du chantier (« Général ») en liseré. Chaque volume porte l'index de sa CIBLE (pièce, toiture, façade, général) : un
// clic sur un meuble ouvre sa pièce. Mesures en mètres (schématiques), ramenées à l'échelle de la maquette par ECHELLE.
import { COULEURS, couleurRole, type Forme, type Inst } from './atelier.ts'
import type { EtatPiece, PiecePlan } from './plan.ts'
import type { Meuble, PlanBatiment, Zone } from './planBatiment.ts'
import type { Metier3D } from './infrastructure.ts'

type V3 = [number, number, number]
/** Mètres → unités de la maquette. */
export const ECHELLE = 0.6
export const HAUT_FOND = 2.5
export const HAUT_CLOISON = 1.05
export const HAUT_DEVANT = 0.42
const EP = 0.16
const HAUT_ETAGE = 2.8

export type EtatZone = EtatPiece | 'neutre'
/** Les couleurs d'état du sol (les mêmes dans le schéma 2D) : aucune n'est un bleu, toutes se lisent sous une étiquette sombre. */
export const COULEUR_ETAT: Record<EtatZone, string> = { neutre: '#ECE6DA', a_faire: '#EFCBB4', en_cours: '#E8BE7C', fini: '#B7CFA5' }
export const LIBELLES_ETAT_ZONE: Record<EtatZone, string> = { neutre: 'Pas de travaux', a_faire: 'À faire', en_cours: 'En cours', fini: 'Fini' }

export type CibleScene = { cle: string; nom: string; etat: EtatZone; pct: number | null; centre: V3; sorte: 'piece' | 'annexe' | 'exterieur' | 'toiture' | 'facade' | 'general' }
export type SceneChantier = { instances: Record<Forme, Inst[]>; cibles: CibleScene[]; bornes: { min: V3; max: V3 } }

const BLANC = '#FBF8F2', BOIS = '#B98B62', BOIS_CLAIR = '#D6B898', TISSU = '#C9B6A0', ARDOISE = '#3A3632', METAL = '#A7A096', INOX = '#C9C6BF'
const CUIVRE = '#C58A5C', VERRE = '#BFC4BC', SAUGE = '#A9C29B', CORAIL = '#D97757', AMBRE = '#C9A27E', PARPAING = '#BDB5A8', EAU = '#9FB3AA', HERBE = '#B9CDA2'
const PEINTURES = ['#F2E3C9', '#E8C9A8', '#E9D8BE', '#EFD3BF']
const etatDe = (p: PiecePlan | null): EtatZone => (p ? p.etat : 'neutre')

export function sceneBatiment(p: { plan: PlanBatiment; metier: Metier3D; roles?: ReadonlyMap<string, string> }): SceneChantier {
  const inst: Record<Forme, Inst[]> = { box: [], cyl: [], sph: [], toit: [], cone: [] }
  const cibles: CibleScene[] = []
  const { plan, metier } = p
  // Le bâtiment est centré : le centre du plan en (0, 0).
  const cx0 = plan.largeur / 2, cz0 = plan.profondeur / 2
  const y0 = plan.sous * HAUT_ETAGE
  const pose = (f: Forme, x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, o: number, r: V3 = [0, 0, 0]) =>
    inst[f].push({ p: [(x - cx0) * ECHELLE, y * ECHELLE, (z - cz0) * ECHELLE], s: [sx * ECHELLE, sy * ECHELLE, sz * ECHELLE], r, c, o })
  const B = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, o = -1, r: V3 = [0, 0, 0]) => pose('box', x, y, z, sx, sy, sz, c, o, r)
  const Cy = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, o = -1, r: V3 = [0, 0, 0]) => pose('cyl', x, y, z, sx, sy, sz, c, o, r)
  const S = (x: number, y: number, z: number, d: number, c: string, o = -1) => pose('sph', x, y, z, d, d, d, c, o)

  // ── L'immeuble sous le plan (appartement au 2e : deux étages pleins, fenêtres en bandeau) ──
  if (plan.sous > 0) {
    B(cx0, y0 / 2, cz0, plan.largeur, y0, plan.profondeur, '#E6DFD3')
    for (let e = 0; e < plan.sous; e++) {
      B(cx0, e * HAUT_ETAGE + 1.5, plan.profondeur + 0.01, plan.largeur - 0.6, 1.1, 0.04, VERRE)
      B(plan.largeur + 0.01, e * HAUT_ETAGE + 1.5, cz0, 0.04, 1.1, plan.profondeur - 0.6, VERRE)
      B(cx0, (e + 1) * HAUT_ETAGE - 0.08, plan.profondeur + 0.05, plan.largeur, 0.16, 0.1, '#D3CCC0')
    }
  }

  // ── Les pièces : sol d'état, murs coupés, mobilier, travaux du métier, compagnons ──
  const bord = { x0: 0, z0: 0, x1: plan.largeur, z1: plan.profondeur }
  const interieures = plan.zones.filter((z) => z.sorte !== 'exterieur')
  plan.zones.forEach((z) => {
    const o = cibles.length
    const etat = etatDe(z.piece)
    cibles.push({ cle: z.cle, nom: z.nom, etat, pct: z.piece ? z.piece.pct : null, centre: [(z.x + z.w / 2 - cx0) * ECHELLE, (y0 + HAUT_CLOISON + 0.6) * ECHELLE, (z.z + z.d / 2 - cz0) * ECHELLE], sorte: z.sorte })
    const ext = z.sorte === 'exterieur'
    // Le sol : la couleur d'état (une pièce sans travaux reste crème) ; dehors, l'herbe ou le dallage sous un liseré d'état.
    B(z.x + z.w / 2, y0 + 0.06, z.z + z.d / 2, z.w - 0.04, 0.12, z.d - 0.04, ext && !z.piece ? HERBE : COULEUR_ETAT[etat], o)
    if (ext && z.piece) B(z.x + z.w / 2, y0 + 0.13, z.z + z.d / 2, z.w - 0.5, 0.03, z.d - 0.5, z.meuble === 'terrasse' ? BOIS_CLAIR : HERBE, o)
    // La bande d'avancement, au bord avant de la pièce.
    if (z.piece && z.piece.pct > 0 && z.piece.pct < 100) B(z.x + 0.15 + ((z.w - 0.3) * z.piece.pct) / 200, y0 + 0.14, z.z + z.d - 0.18, ((z.w - 0.3) * z.piece.pct) / 100, 0.04, 0.16, CORAIL, o)
    if (!ext) murs(z, o)
    meubles(z, o)
    if (z.piece) travaux(z, o)
    // L'équipe : un personnage par membre qui a des tâches dans la pièce (corps à la couleur du rôle, tête).
    if (z.piece) z.piece.membres.slice(0, 3).forEach((m, k) => {
      const mx = z.x + z.w * 0.68 - k * 0.55, mz = z.z + z.d * 0.62
      Cy(mx, y0 + 0.12 + 0.62, mz, 0.42, 1.24, 0.42, couleurRole(p.roles?.get(m.id) ?? 'compagnon'), o)
      S(mx, y0 + 0.12 + 1.5, mz, 0.4, COULEURS.peau, o)
      S(mx, y0 + 0.12 + 1.66, mz, 0.42, k % 2 ? AMBRE : CORAIL, o) // le casque
    })
  })

  // ── La toiture du chantier : soulevée au-dessus du bâtiment (vue éclatée), couverte à l'avancement, chevrons à nu sur le reste ──
  if (plan.toiture) {
    const o = cibles.length, t = plan.toiture
    const yT = y0 + HAUT_FOND + 2.4, L = plan.largeur + 0.6, demi = plan.profondeur / 2 + 0.3, a = 0.62
    const pan = Math.hypot(demi, demi * Math.tan(a))
    cibles.push({ cle: 'toiture', nom: t.nom, etat: t.etat, pct: t.pct, centre: [0, (yT + 1.6) * ECHELLE, (-plan.profondeur / 4) * ECHELLE], sorte: 'toiture' })
    // Le pan du fond seulement (on voit les pièces dessous), et le faîtage.
    const couvert = L * (t.pct / 100)
    if (couvert > 0.05) B(-0.3 + couvert / 2, yT + (demi * Math.tan(a)) / 2, demi / 2 - 0.3, couvert, 0.12, pan, '#B9785B', o, [a, 0, 0])
    for (let x = couvert + 0.3; x < L; x += 0.6) B(-0.3 + x, yT + (demi * Math.tan(a)) / 2, demi / 2 - 0.3, 0.1, 0.12, pan, BOIS, o, [a, 0, 0])
    B(cx0, yT + demi * Math.tan(a) + 0.05, cz0, L, 0.14, 0.2, COULEUR_ETAT[t.etat], o)
    // Les poteaux qui disent « c'est le toit de ce bâtiment » (repères, fins).
    for (const x of [0, plan.largeur]) B(x, y0 + HAUT_FOND + 1.2, 0.1, 0.06, 2.4, 0.06, METAL, o)
  }
  // ── La façade : les murs extérieurs du fond et de gauche teintés à son état, l'échafaudage tant qu'elle n'est pas finie ──
  if (plan.facade) {
    const o = cibles.length, f = plan.facade
    cibles.push({ cle: 'facade', nom: f.nom, etat: f.etat, pct: f.pct, centre: [(-cx0 - 0.6) * ECHELLE, (y0 + HAUT_FOND + 0.6) * ECHELLE, 0], sorte: 'facade' })
    B(-0.12, y0 + HAUT_FOND / 2 + 0.12, cz0, 0.06, HAUT_FOND * (f.etat === 'fini' ? 1 : Math.max(0.15, f.pct / 100)), plan.profondeur, COULEUR_ETAT[f.etat], o)
    if (f.etat !== 'fini') for (const z of [0.4, plan.profondeur - 0.4]) for (const dx of [-0.5, -0.9]) Cy(dx, y0 + 1.4, z, 0.06, 2.8, 0.06, AMBRE, o)
    if (f.etat !== 'fini') for (const y of [1.0, 2.1]) B(-0.7, y0 + y, cz0, 0.45, 0.05, plan.profondeur - 0.6, BOIS, o)
  }
  // ── « Général » : le chantier entier — un liseré autour du bâtiment, à l'état des tâches générales ──
  if (plan.general) {
    const o = cibles.length, g = plan.general
    cibles.push({ cle: 'general', nom: g.nom, etat: g.etat, pct: g.pct, centre: [(cx0 + 0.2) * ECHELLE, (y0 + 0.4) * ECHELLE, (cz0 + 0.5) * ECHELLE], sorte: 'general' })
    const c = COULEUR_ETAT[g.etat], m = 0.35
    B(cx0, y0 + 0.03, -m / 2, plan.largeur + 2 * m, 0.06, m, c, o); B(cx0, y0 + 0.03, plan.profondeur + m / 2, plan.largeur + 2 * m, 0.06, m, c, o)
    B(-m / 2, y0 + 0.03, cz0, m, 0.06, plan.profondeur, c, o); B(plan.largeur + m / 2, y0 + 0.03, cz0, m, 0.06, plan.profondeur, c, o)
  }

  const demiX = (plan.largeur / 2 + 1.2) * ECHELLE, demiZ = (plan.profondeur / 2 + 1.2) * ECHELLE
  return { instances: inst, cibles, bornes: { min: [-demiX, 0, -demiZ], max: [demiX, (y0 + HAUT_FOND + (plan.toiture ? 4.4 : 0.6)) * ECHELLE, demiZ] } }

  // ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  /** Les murs d'une pièce : son mur du fond et son mur de gauche (hauts s'ils sont extérieurs, cloisons basses dedans, une porte au
   *  milieu des cloisons) ; devant et à droite, un muret bas seulement là où aucune pièce ne la touche (l'extérieur coupé). */
  function murs(z: Zone, o: number) {
    const yS = y0 + 0.12
    const segment = (ax: number, az: number, bx: number, bz: number, h: number, porte: boolean, fenetres: boolean) => {
      const long = Math.hypot(bx - ax, bz - az), surX = Math.abs(bz - az) < 1e-6
      const morceau = (t0: number, t1: number) => {
        if (t1 - t0 < 0.05) return
        const mx = ax + ((bx - ax) * (t0 + t1)) / 2 / long, mz = az + ((bz - az) * (t0 + t1)) / 2 / long
        B(mx, yS + h / 2, mz, surX ? t1 - t0 : EP, h, surX ? EP : t1 - t0, '#F4EFE6', o)
      }
      if (porte && long > 1.7) { const m = long / 2; morceau(0, m - 0.45); morceau(m + 0.45, long); B(ax + ((bx - ax) * m) / long, yS + 0.01, az + ((bz - az) * m) / long, surX ? 0.9 : EP, 0.02, surX ? EP : 0.9, BOIS, o) }
      else morceau(0, long)
      if (fenetres) for (let t = 1.3; t < long - 0.8; t += 2.6) {
        const fx = ax + ((bx - ax) * t) / long, fz = az + ((bz - az) * t) / long
        B(fx, yS + 1.45, fz, surX ? 1.1 : EP + 0.04, 1.0, surX ? EP + 0.04 : 1.1, VERRE, o)
        B(fx, yS + 0.93, fz, surX ? 1.2 : EP + 0.1, 0.06, surX ? EP + 0.1 : 1.2, BLANC, o)
      }
    }
    const exterieurFond = z.z <= bord.z0 + 1e-6, exterieurGauche = z.x <= bord.x0 + 1e-6
    segment(z.x, z.z, z.x + z.w, z.z, exterieurFond ? HAUT_FOND : HAUT_CLOISON, !exterieurFond, exterieurFond)
    segment(z.x, z.z, z.x, z.z + z.d, exterieurGauche ? HAUT_FOND : HAUT_CLOISON, !exterieurGauche, exterieurGauche)
    // Devant et à droite : si une autre pièce touche ce bord, c'est SON mur (fond ou gauche) ; sinon, le muret coupé de l'extérieur.
    const touche = (dx: number, dz: number) => interieures.some((a) => a !== z && (dz ? Math.abs(a.z - (z.z + z.d)) < 1e-6 && a.x < z.x + z.w - 1e-6 && a.x + a.w > z.x + 1e-6 : Math.abs(a.x - (z.x + z.w)) < 1e-6 && a.z < z.z + z.d - 1e-6 && a.z + a.d > z.z + 1e-6))
    if (!touche(0, 1)) segment(z.x, z.z + z.d, z.x + z.w, z.z + z.d, HAUT_DEVANT, false, false)
    if (!touche(1, 0)) segment(z.x + z.w, z.z, z.x + z.w, z.z + z.d, HAUT_DEVANT, false, false)
  }

  /** Le mobilier : de quoi reconnaître la pièce d'un coup d'œil. Repère local : x0/z0 = coin du fond à gauche, `y` au-dessus du sol. */
  function meubles(z: Zone, o: number) {
    const x0 = z.x, z0 = z.z, w = z.w, d = z.d, y = y0 + 0.12
    const b = (x: number, yy: number, zz: number, sx: number, sy: number, sz: number, c: string, r: V3 = [0, 0, 0]) => B(x0 + x, y + yy, z0 + zz, sx, sy, sz, c, o, r)
    const cy = (x: number, yy: number, zz: number, sx: number, sy: number, sz: number, c: string, r: V3 = [0, 0, 0]) => Cy(x0 + x, y + yy, z0 + zz, sx, sy, sz, c, o, r)
    const plante = (x: number, zz: number) => { cy(x, 0.2, zz, 0.36, 0.4, 0.36, '#C9B49A'); S(x0 + x, y + 0.65, z0 + zz, 0.62, SAUGE, o) }
    const chaise = (x: number, zz: number) => { b(x, 0.22, zz, 0.42, 0.06, 0.42, BOIS); b(x, 0.45, zz - 0.19, 0.42, 0.45, 0.05, BOIS); cy(x, 0.11, zz, 0.06, 0.22, 0.06, ARDOISE) }
    const table = (x: number, zz: number, l: number, p2: number, c = BOIS) => { b(x, 0.73, zz, l, 0.05, p2, c); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b(x + dx * (l / 2 - 0.08), 0.36, zz + dz * (p2 / 2 - 0.08), 0.06, 0.72, 0.06, ARDOISE) }
    const etagere = (x: number, zz: number, l: number, h = 1.8, p2 = 0.45) => { b(x, h / 2, zz, l, h, 0.04, METAL); for (let k = 0; k < 4; k++) { b(x, 0.15 + k * (h - 0.2) / 3, zz + p2 / 2, l, 0.04, p2, METAL); for (let i = 0; i < Math.floor(l / 0.5); i++) b(x - l / 2 + 0.3 + i * 0.5, 0.33 + k * (h - 0.2) / 3, zz + p2 / 2, 0.38, 0.32, 0.36, ['#D9C3A0', '#C9A27E', '#E2D2B8'][(i + k) % 3]) } }
    switch (z.meuble) {
      case 'sejour':
        b(w * 0.5, 0.01, d * 0.55, Math.min(2.6, w * 0.55), 0.02, 1.8, '#E8C4A8') // le tapis
        b(w * 0.5, 0.22, d * 0.55 - 1.15, 2.2, 0.44, 0.9, TISSU); b(w * 0.5, 0.6, d * 0.55 - 1.52, 2.2, 0.5, 0.18, TISSU) // le canapé
        for (const s of [-1, 1]) b(w * 0.5 + s * 1.05, 0.38, d * 0.55 - 1.15, 0.18, 0.36, 0.9, TISSU)
        b(w * 0.5, 0.2, d * 0.55, 1.0, 0.4, 0.55, BOIS) // la table basse
        b(0.3, 0.3, d * 0.55, 0.45, 0.6, 1.6, BOIS); b(0.12, 0.95, d * 0.55, 0.06, 0.6, 1.1, ARDOISE) // le meuble et l'écran
        plante(w - 0.45, 0.45)
        break
      case 'cuisine': case 'cantine':
        b(w / 2, 0.45, 0.33, w - 0.3, 0.9, 0.6, BLANC); b(w / 2, 0.92, 0.33, w - 0.28, 0.04, 0.64, BOIS) // les meubles bas et le plan
        b(w * 0.35, 0.95, 0.33, 0.55, 0.02, 0.45, ARDOISE); b(w * 0.68, 0.94, 0.33, 0.6, 0.03, 0.4, INOX) // plaque et évier
        b(w / 2, 1.75, 0.2, w - 0.3, 0.6, 0.35, BLANC) // les meubles hauts
        if (z.meuble === 'cuisine') { b(w - 0.45, 0.95, 0.4, 0.62, 1.9, 0.64, BLANC); if (d > 2.6) { table(w * 0.45, d * 0.65, 1.2, 0.8); chaise(w * 0.45 - 0.4, d * 0.65 + 0.6); chaise(w * 0.45 + 0.4, d * 0.65 + 0.6) } }
        else for (let k = 0; k < 2; k++) { table(w * 0.5, 1.6 + k * 1.1, w * 0.7, 0.7); b(w * 0.5, 0.25, 1.6 + k * 1.1 + 0.55, w * 0.7, 0.05, 0.3, BOIS) }
        break
      case 'chambre':
        b(w / 2, 0.2, 1.15, 1.6, 0.4, 2.0, BOIS); b(w / 2, 0.47, 1.15, 1.5, 0.16, 1.9, BLANC) // le lit
        b(w / 2, 0.57, 1.55, 1.52, 0.06, 1.1, CORAIL); for (const s of [-0.38, 0.38]) b(w / 2 + s, 0.6, 0.35, 0.6, 0.14, 0.32, BLANC) // couette, oreillers
        b(w / 2, 0.55, 0.12, 1.7, 1.1, 0.08, BOIS) // la tête de lit
        for (const s of [-1.1, 1.1]) if (w > 2.6) b(w / 2 + s, 0.25, 0.3, 0.42, 0.5, 0.4, BOIS_CLAIR)
        if (d > 2.8) b(0.32, 0.95, d - 0.9, 0.55, 1.9, 1.2, BOIS_CLAIR) // l'armoire
        break
      case 'sdb':
        if (w >= 1.9) { b(w / 2, 0.28, 0.42, Math.min(1.7, w - 0.2), 0.56, 0.75, BLANC); b(w / 2, 0.5, 0.42, Math.min(1.5, w - 0.4), 0.06, 0.55, EAU) } // la baignoire
        else { b(w / 2, 0.06, 0.5, w - 0.2, 0.1, 0.9, BLANC); b(w / 2, 1.0, 0.97, w - 0.25, 1.9, 0.03, VERRE) } // la douche et sa paroi
        b(0.3, 0.75, d - 0.6, 0.5, 0.18, 0.6, BLANC); b(0.3, 0.38, d - 0.6, 0.45, 0.6, 0.55, BOIS_CLAIR); b(0.1, 1.45, d - 0.6, 0.04, 0.7, 0.55, VERRE) // vasque, meuble, miroir
        b(w - 0.1, 1.0, d * 0.5, 0.06, 0.9, 0.5, METAL) // le sèche-serviettes
        break
      case 'wc':
        cy(w / 2, 0.22, 0.55, 0.42, 0.44, 0.55, BLANC); b(w / 2, 0.62, 0.2, 0.42, 0.42, 0.18, BLANC) // cuvette et réservoir
        if (d > 2.4) b(w / 2, 0.8, d - 0.35, 0.4, 0.15, 0.3, BLANC) // le lave-mains
        break
      case 'entree': case 'accueil':
        if (z.meuble === 'accueil') { b(w / 2, 0.55, d * 0.45, Math.min(2.4, w - 0.6), 1.1, 0.55, BOIS); b(w / 2, 1.12, d * 0.45, Math.min(2.5, w - 0.5), 0.05, 0.65, BLANC); plante(0.4, d - 0.4) }
        else { cy(0.35, 0.9, 0.35, 0.06, 1.8, 0.06, ARDOISE); S(x0 + 0.35, y + 1.6, z0 + 0.35, 0.3, CORAIL, o); b(w / 2, 0.22, 0.28, Math.min(1.2, w - 0.4), 0.44, 0.35, BOIS_CLAIR); b(w / 2, 0.01, d - 0.45, 0.9, 0.02, 0.6, '#C2734E') }
        break
      case 'couloir':
        b(w / 2, 0.01, d / 2, Math.max(0.6, w - 0.8), 0.02, Math.min(0.7, d - 0.3), '#D9B48C')
        break
      case 'escalier':
        for (let k = 0; k < 9; k++) b(w / 2, 0.09 + k * 0.18, 0.4 + k * ((d - 0.8) / 9), w - 0.6, 0.18 + k * 0.18, (d - 0.8) / 9, '#E6DFD3')
        break
      case 'garage':
        if (w >= 3) { b(w / 2, 0.55, d / 2, 1.7, 0.7, 3.4, '#E3DDD2'); b(w / 2, 1.05, d / 2 + 0.2, 1.5, 0.5, 1.8, '#E3DDD2'); for (const [dx, dz] of [[-0.8, -1.1], [0.8, -1.1], [-0.8, 1.1], [0.8, 1.1]]) cy(w / 2 + dx, 0.32, d / 2 + dz, 0.6, 0.22, 0.6, ARDOISE, [0, 0, Math.PI / 2]) } // la voiture
        else etagere(w / 2, 0.3, w - 0.5)
        break
      case 'technique':
        b(0.45, 0.85, 0.35, 0.6, 1.7, 0.55, BLANC); cy(w - 0.45, 0.8, 0.45, 0.6, 1.6, 0.6, BLANC); b(w / 2, 1.5, 0.11, 0.55, 0.7, 0.08, METAL) // chaudière, ballon, tableau
        break
      case 'salleResto': {
        const nx = Math.max(1, Math.floor((w - 0.6) / 1.7)), nz = Math.max(1, Math.floor((d - 0.8) / 1.6))
        for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { const tx = 0.9 + i * 1.7, tz = 0.9 + k * 1.6; cy(tx, 0.72, tz, 0.8, 0.05, 0.8, BLANC); cy(tx, 0.36, tz, 0.08, 0.72, 0.08, ARDOISE); chaise(tx - 0.55, tz + 0.2); chaise(tx + 0.55, tz + 0.2) }
        break
      }
      case 'cuisinePro':
        b(w / 2, 0.45, 0.33, w - 0.3, 0.9, 0.62, INOX); b(0.33, 0.45, d / 2, 0.62, 0.9, d - 1.0, INOX) // les plans inox
        b(w * 0.55, 0.95, 0.33, 1.2, 0.04, 0.55, ARDOISE); b(w * 0.55, 2.0, 0.4, 1.6, 0.5, 0.8, METAL) // le piano et la hotte
        b(w / 2 + 0.3, 0.45, d * 0.62, 1.6, 0.9, 0.8, INOX) // l'îlot
        break
      case 'reserve': case 'stockage': {
        const rangs = Math.max(1, Math.floor((d - 0.6) / 1.9))
        for (let k = 0; k < rangs; k++) etagere(w / 2, 0.35 + k * 1.9, Math.min(w - 0.6, z.meuble === 'stockage' ? 6 : 3), z.meuble === 'stockage' ? 2.6 : 1.8)
        if (z.meuble === 'stockage') for (let i = 0; i < 3; i++) { b(1.2 + i * 1.3, 0.08, d - 1.0, 1.2, 0.14, 1.0, BOIS); b(1.2 + i * 1.3, 0.45, d - 1.0, 1.1, 0.6, 0.9, '#D9C3A0') }
        break
      }
      case 'boutique':
        for (let i = 0; i < Math.floor((w - 1) / 2.2); i++) { b(1.3 + i * 2.2, 0.4, d * 0.55, 1.4, 0.8, 0.8, BOIS_CLAIR); for (let k = 0; k < 3; k++) b(0.95 + i * 2.2 + k * 0.35, 0.92, d * 0.55, 0.28, 0.22, 0.3, ['#E8946F', '#D9C3A0', '#A9C29B'][k]) }
        b(w / 2, 1.0, 0.25, w - 0.6, 2.0, 0.4, BOIS); b(w - 1.0, 0.55, d - 0.9, 1.4, 1.1, 0.6, BOIS) // les rayonnages, la caisse
        break
      case 'openspace': case 'bureau': case 'reunion': {
        if (z.meuble === 'reunion') { table(w / 2, d / 2, Math.min(2.6, w - 1), 1.1, BLANC); for (let i = 0; i < 3; i++) { chaise(w / 2 - 0.8 + i * 0.8, d / 2 + 0.85); chaise(w / 2 - 0.8 + i * 0.8, d / 2 - 0.85) } b(w / 2, 1.4, 0.12, 1.6, 0.9, 0.05, ARDOISE); break }
        const nx = z.meuble === 'bureau' ? 1 : Math.max(1, Math.floor((w - 0.6) / 1.8)), nz = z.meuble === 'bureau' ? 1 : Math.max(1, Math.floor((d - 0.6) / 1.8))
        for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { const tx = z.meuble === 'bureau' ? w / 2 : 1.0 + i * 1.8, tz = z.meuble === 'bureau' ? 0.75 : 0.8 + k * 1.8; table(tx, tz, 1.4, 0.7, BLANC); b(tx, 0.98, tz - 0.15, 0.6, 0.38, 0.04, ARDOISE); chaise(tx, tz + 0.65) }
        if (z.meuble === 'bureau') b(w - 0.3, 0.9, d - 0.6, 0.4, 1.8, 0.9, BOIS_CLAIR)
        break
      }
      case 'classe': {
        b(w / 2, 1.35, 0.11, Math.min(3, w - 0.8), 1.0, 0.04, '#4E5B50') // le tableau
        table(w / 2, 0.8, 1.2, 0.6, BOIS)
        for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) { const tx = w * (0.25 + i * 0.25), tz = 1.8 + k * 0.95; if (tz > d - 0.3) continue; b(tx, 0.62, tz, 0.9, 0.04, 0.5, BOIS_CLAIR); b(tx, 0.31, tz, 0.08, 0.62, 0.08, METAL); chaise(tx, tz + 0.45) }
        break
      }
      case 'cabinet':
        b(w * 0.62, 0.5, 0.8, 0.7, 0.18, 1.9, '#E3DDD2'); b(w * 0.62, 0.25, 0.8, 0.5, 0.5, 1.6, METAL) // la table d'examen
        table(0.85, d - 0.9, 1.2, 0.65, BLANC); chaise(0.85, d - 0.3); b(w - 0.3, 0.8, d - 0.5, 0.45, 1.6, 0.6, BLANC)
        break
      case 'attente':
        for (let i = 0; i < Math.floor((w - 0.6) / 0.6); i++) { b(0.6 + i * 0.6, 0.23, 0.35, 0.5, 0.06, 0.48, TISSU); b(0.6 + i * 0.6, 0.48, 0.13, 0.5, 0.5, 0.06, TISSU) }
        b(w / 2, 0.2, d / 2 + 0.2, 1.0, 0.4, 0.6, BOIS); plante(w - 0.4, d - 0.4)
        break
      case 'vestiaire':
        for (let i = 0; i < Math.floor((w - 0.4) / 0.42); i++) b(0.4 + i * 0.42, 0.95, 0.3, 0.4, 1.9, 0.48, i % 2 ? '#D3CCC0' : '#C4BDB1')
        b(w / 2, 0.22, d / 2 + 0.3, w - 1, 0.06, 0.4, BOIS)
        break
      case 'gymnase':
        b(w / 2, 0.01, d / 2, w - 1.2, 0.02, d - 1.2, '#E2C79A') // le parquet
        for (const [lx, lz, sx, sz] of [[w / 2, 0.6, w - 1.2, 0.08], [w / 2, d - 0.6, w - 1.2, 0.08], [0.6, d / 2, 0.08, d - 1.2], [w - 0.6, d / 2, 0.08, d - 1.2], [w / 2, d / 2, 0.08, d - 1.2]] as const) b(lx, 0.03, lz, sx, 0.02, sz, BLANC)
        cy(w / 2, 0.03, d / 2, 2.2, 0.02, 2.2, CORAIL)
        for (const zz of [0.8, d - 0.8]) { cy(w / 2, 1.5, zz, 0.12, 3.0, 0.12, METAL); b(w / 2, 2.9, zz + (zz < 1 ? 0.2 : -0.2), 1.0, 0.7, 0.05, BLANC) }
        break
      case 'atelierPro':
        b(w / 2, 0.45, 0.45, Math.min(2.4, w - 0.6), 0.9, 0.7, BOIS); b(w - 0.8, 0.6, d - 0.9, 0.9, 1.2, 0.9, '#6F6862'); b(0.6, 0.8, d - 0.6, 0.6, 1.6, 0.6, CORAIL)
        break
      case 'etable':
        for (let i = 0; i < 3; i++) { b(1 + i * 1.4, 0.5, d / 2, 0.08, 1.0, d - 1.2, BOIS); b(1.7 + i * 1.4, 0.95, 0.4, 1.3, 0.06, 0.06, BOIS) }
        for (let i = 0; i < 3; i++) cy(0.9 + i * 1.3, 0.45, d - 0.7, 0.9, 0.9, 0.9, '#E6D3A8', [Math.PI / 2, 0, 0])
        break
      case 'terrasse':
        for (let k = 0; k < Math.floor(d / 0.3); k++) b(w / 2, 0.02, 0.15 + k * 0.3, w - 0.3, 0.03, 0.26, BOIS_CLAIR)
        cy(w / 2, 0.72, d / 2, 0.8, 0.05, 0.8, BLANC); cy(w / 2, 1.2, d / 2, 0.05, 2.3, 0.05, METAL); pose('cone', x0 + w / 2, y + 2.35, z0 + d / 2, 2.0, 0.5, 2.0, CORAIL, o)
        chaise(w / 2 - 0.6, d / 2 + 0.3); chaise(w / 2 + 0.6, d / 2 + 0.3)
        break
      case 'jardin': case 'cour':
        for (let i = 0; i < Math.max(1, Math.floor(w / 3)); i++) { cy(1.2 + i * 3, 0.6, d * 0.4, 0.2, 1.2, 0.2, '#9C8468'); S(x0 + 1.2 + i * 3, y + 1.7, z0 + d * 0.4, 1.3, SAUGE, o) }
        if (z.meuble === 'jardin') for (let i = 0; i < Math.floor(w / 1.4); i++) S(x0 + 0.6 + i * 1.4, y + 0.2, z0 + d - 0.4, 0.45, i % 2 ? '#E8946F' : '#C9A27E', o)
        else for (const [lx, sx] of [[w / 2, w - 1]] as const) b(lx, 0.03, d - 0.6, sx, 0.02, 0.08, BLANC)
        break
      case 'piscine':
        b(w / 2, 0.02, d / 2, w - 0.6, 0.05, d - 0.6, BLANC); b(w / 2, 0.06, d / 2, w - 1.0, 0.06, d - 1.0, EAU)
        for (let i = 0; i < 2; i++) b(0.7 + i * 0.9, 0.2, 0.35, 0.6, 0.12, 0.25, BLANC, [0.2, 0, 0])
        break
      case 'logement':
        b(w * 0.5, HAUT_CLOISON / 2, d * 0.5, 0.1, HAUT_CLOISON, d - 0.6, '#F4EFE6')
        b(w * 0.25, 0.22, d * 0.5, 1.6, 0.44, 0.8, TISSU); b(w * 0.75, 0.22, d * 0.45, 1.4, 0.44, 1.8, BLANC); b(w * 0.75, 0.5, d * 0.45 + 0.4, 1.4, 0.06, 0.9, CORAIL)
        break
      case 'existant':
        b(w / 2, 1.3, d / 2, w - 0.4, 2.6, d - 0.4, '#EADFCF'); pose('toit', x0 + w / 2, y + 3.1, z0 + d / 2, w * 0.75, 1.1, d * 1.1, '#C98B6B', o, [0, Math.PI / 4, 0])
        for (let i = 0; i < Math.floor(w / 2); i++) B(x0 + 1 + i * 2, y + 1.4, z0 + d - 0.19, 0.8, 0.9, 0.04, VERRE, o)
        break
      case 'generique': default:
        b(w * 0.35, 0.25, d * 0.5, 0.6, 0.5, 0.5, '#D9C3A0'); b(w * 0.6, 0.2, d * 0.6, 0.5, 0.4, 0.5, '#C9A27E'); plante(w - 0.4, 0.4)
        break
    }
  }

  /** Les TRAVAUX du métier dans une pièce du chantier : ce que l'artisan y pose, à hauteur de l'avancement. */
  function travaux(z: Zone, o: number) {
    const t = z.piece!, pct = t.etat === 'fini' ? 1 : t.pct / 100
    const x0 = z.x, z0 = z.z, w = z.w, d = z.d, y = y0 + 0.12
    const b = (x: number, yy: number, zz: number, sx: number, sy: number, sz: number, c: string, r: V3 = [0, 0, 0]) => B(x0 + x, y + yy, z0 + zz, sx, sy, sz, c, o, r)
    const fond = 0.16 // contre le mur du fond
    // Pendant les travaux : l'escabeau et la caisse à outils.
    if (t.etat !== 'fini') { b(w - 0.55, 0.65, d - 0.55, 0.5, 1.3, 0.05, AMBRE, [0.22, 0, 0]); b(w - 0.55, 0.65, d - 0.35, 0.5, 1.3, 0.05, AMBRE, [-0.22, 0, 0]); b(0.45, 0.13, d - 0.4, 0.5, 0.26, 0.26, CORAIL) }
    switch (metier) {
      case 'plombier': case 'chauffagiste': case 'climaticien': {
        const l = Math.max(0.3, (w - 0.4) * pct)
        b(0.2 + l / 2, 0.28, fond, l, 0.06, 0.06, CUIVRE); b(0.2 + l / 2, 0.4, fond, l, 0.06, 0.06, CUIVRE) // alimentations
        b(0.28, 1.25, fond, 0.08, 2.3, 0.08, CUIVRE) // la colonne
        if (metier === 'chauffagiste') for (let i = 0; i < Math.round(2 * pct + 0.4); i++) b(w * (0.35 + i * 0.35), 0.55, fond + 0.06, 0.9, 0.55, 0.08, BLANC)
        if (metier === 'climaticien' && pct > 0.3) { b(w / 2, 2.05, fond + 0.12, 0.9, 0.3, 0.22, BLANC); b(w / 2, 1.97, fond + 0.24, 0.8, 0.04, 0.02, METAL) }
        break
      }
      case 'electricien': {
        const l = Math.max(0.3, (w - 0.4) * pct)
        b(0.2 + l / 2, 2.15, fond, l, 0.05, 0.05, ARDOISE) // le câble en saignée
        for (let i = 0; i < Math.max(1, Math.round(4 * pct)); i++) { b(0.6 + i * ((w - 1) / 4), 0.35, fond, 0.12, 0.12, 0.05, BLANC); b(0.6 + i * ((w - 1) / 4), 1.25, fond, 0.04, 0.9, 0.04, ARDOISE) }
        if (/entree|technique|garage|accueil|couloir/.test(z.meuble)) b(w - 0.3, 1.5, fond, 0.5, 0.65, 0.12, METAL)
        break
      }
      case 'carreleur': {
        const n = Math.round(Math.min(64, Math.floor(w / 0.6) * Math.floor(d / 0.6)) * pct), parRang = Math.max(1, Math.floor(w / 0.6))
        for (let i = 0; i < n; i++) b(0.3 + (i % parRang) * 0.6, 0.02, 0.3 + Math.floor(i / parRang) * 0.6, 0.56, 0.03, 0.56, i % 2 ? BLANC : '#CFC6B8')
        if (/sdb|wc|cuisine/.test(z.meuble)) b(w / 2, 0.9 * pct, fond, w - 0.3, 1.8 * pct, 0.03, BLANC) // la faïence
        break
      }
      case 'peintre': case 'facadier':
        b(w / 2, (HAUT_FOND - 0.1) * pct / 2, fond - 0.06, w - 0.2, Math.max(0.05, (HAUT_FOND - 0.1) * pct), 0.03, PEINTURES[(z.cle.length + 1) % PEINTURES.length])
        if (t.etat !== 'fini') { for (let i = 0; i < 3; i++) Cy(x0 + 0.9 + i * 0.32, y + 0.15, z0 + d - 0.6, 0.26, 0.3, 0.26, PEINTURES[i], o); b(1.6, 0.03, d - 0.6, 0.4, 0.05, 0.3, METAL) }
        break
      case 'plaquiste': {
        const n = Math.max(1, Math.round(((w - 0.4) / 0.6) * pct))
        for (let i = 0; i < Math.floor((w - 0.4) / 0.6); i++) i < n ? b(0.5 + i * 0.6, 1.2, fond + 0.08, 0.58, 2.3, 0.03, '#F4F1EA') : b(0.5 + i * 0.6, 1.2, fond + 0.08, 0.05, 2.3, 0.05, METAL)
        break
      }
      case 'menuisier': case 'charpentier':
        b(w / 2, 1.1, fond + 0.05, 1.0, 2.2, 0.06, BOIS); b(w / 2, 1.1, fond + 0.09, 0.8, 2.0, 0.03, BOIS_CLAIR) // la porte posée
        if (t.etat !== 'fini') for (let i = 0; i < 3; i++) b(1.0, 0.06 + i * 0.07, d - 0.9, 1.8, 0.06, 0.18, BOIS)
        break
      case 'vitrier':
        for (let i = 0; i < Math.max(1, Math.round(3 * pct)); i++) b(0.8 + i * 0.4, 0.6, d - 0.7, 0.04, 1.2, 0.9, VERRE, [0, 0, 0.12])
        break
      case 'serrurier':
        b(w / 2, 0.95, fond + 0.1, 1.0, 2.1, 0.07, '#5E5A55'); for (let i = 0; i < Math.round(5 * pct); i++) b(0.5 + i * 0.25, 0.5, d - 0.3, 0.04, 1.0, 0.04, '#5E5A55')
        break
      case 'paysagiste': case 'piscinier':
        for (let i = 0; i < Math.max(1, Math.round(4 * pct)); i++) { Cy(x0 + 0.6 + i * 0.6, y + 0.18, z0 + d - 0.6, 0.3, 0.3, 0.3, '#C9B49A', o); S(x0 + 0.6 + i * 0.6, y + 0.45, z0 + d - 0.6, 0.4, SAUGE, o) }
        break
      case 'couvreur':
        b(w - 0.5, 1.4, fond + 0.4, 0.5, 2.8, 0.06, BOIS, [0.25, 0, 0])
        break
      default: { // maçon, tous corps d'état, multiservice : la cloison en parpaings monte
        const h = Math.max(0.2, HAUT_CLOISON * 1.4 * pct)
        b(0.32, h / 2, d / 2, 0.2, h, Math.min(2.4, d - 0.8), PARPAING)
        if (t.etat !== 'fini') { b(1.0, 0.08, d - 0.7, 0.9, 0.14, 0.7, BOIS); for (let i = 0; i < 4; i++) b(0.8 + (i % 2) * 0.45, 0.25 + Math.floor(i / 2) * 0.22, d - 0.7, 0.4, 0.2, 0.6, PARPAING) }
      }
    }
  }
}

/** Le nombre d'appels de dessin : une couche par forme utilisée (le sol de la scène en plus, compté par le composant). */
export const appelsDeDessin = (s: SceneChantier): number => (Object.keys(s.instances) as Forme[]).filter((f) => s.instances[f].length > 0).length
/** Les volumes d'une cible (pour les tests : tout ce qui appartient à une pièce, son sol compris). */
export const volumesDe = (s: SceneChantier, o: number): Inst[] => (Object.values(s.instances) as Inst[][]).flatMap((l) => l.filter((x) => x.o === o))
export type { Meuble }
