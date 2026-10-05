// Ce qui bouge sur la carte, et seulement quand les DONNÉES SERVIES bougent (fiche 026-183, K4b) : le tapis de la prospection et ses
// carrés, les lignes du Crieur et de l'Usine, l'égaliseur du Radar, l'écran de la Salle Expérience, les badges LV, les points du
// hublot de l'Observatoire. Tout est dans un calque HTML au-dessus du canevas, nourri par les enveloppes de `direct.carte` et de
// `direct.tapis` ; RIEN n'est peint dans le décor (le canevas est identique d'un jeu de données à l'autre, CL-8) et rien ne bouge entre
// deux lectures : l'égaliseur est figé, un carré ne part que sur un vrai changement d'étape (`mouvements`, 026-070).
//
// Règles :
//   · une valeur absente, « hors périmètre » ou manquante se dit « — », JAMAIS 0 ;
//   · chaque carré est un élément HTML qui glisse le long du tracé du tapis d'une étape à la suivante (WAAPI, une fois, 1,2 s) puis disparaît ;
//     au premier relevé et sur deux relevés identiques : aucun carré ; en mouvement réduit le carré saute à l'étape, sans glisser ;
//   · les textes servis n'entrent dans la page que par `textContent` : ce module n'écrit aucun balisage.
// Ce module ne lit ni horloge ni hasard : les seules minuteries sont celles qui retirent un carré posé en mouvement réduit.
import { LIGNES, mouvements } from '@/lib/pilotage/tapis'
import { lireVue, enCss } from '../calque/vue'
import { mondeDe, type Monde } from '../theme/grille'
import type { Accroche, ContexteMoteur, PropsCarte } from '../types'
import './acteurs.css'

const DUREE_CARRE_MS = 1200
const DUREE_CARRE_REDUIT_MS = 1500
const DUREE_PLUS_UN_MS = 1500
const CARRES_MAX = 5
const POINTS_MAX = 24

const objet = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const texte = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x : null)
const nombre = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null)
/** Le contenu d'une enveloppe `{ valeur, source, … }` ; null quand elle est absente, vide ou en défaut. */
const lire = (env: unknown): unknown => (objet(env) && 'valeur' in env ? env.valeur ?? null : null)

type Etape = { cle: string; libelle: string; jour: number | null }
type Boite = { x: number; y: number; l: number; h: number }
type Point = { x: number; y: number }

/** « libellé nombre », « libellé — » quand la source est absente : jamais 0 pour une mesure qui n'existe pas. */
function dit(libelle: string, jour: number | null): string {
  return `${libelle} ${jour === null ? '—' : jour}`
}

/** Les étapes d'un relevé : `source: 'absente'` (ou un jour illisible) donne `null`, le compteur du jour sinon. */
function etapesDe(x: unknown): Etape[] {
  const e = objet(x) ? x.etapes : null
  if (!Array.isArray(e)) return []
  return e.flatMap((s): Etape[] => {
    if (!objet(s)) return []
    const cle = texte(s.cle)
    if (!cle) return []
    const jour = s.source === 'absente' ? null : nombre(s.jour)
    return [{ cle, libelle: texte(s.libelle) ?? cle, jour }]
  })
}

const boiteDe = (e: Monde['carte']['emplacements'][number]): Boite => {
  const f = e.forme
  if (f.type === 'polygone' && f.points?.length) {
    const xs = f.points.map((p) => p[0]), ys = f.points.map((p) => p[1])
    return { x: Math.min(...xs), y: Math.min(...ys), l: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  }
  return { x: f.x ?? 0, y: f.y ?? 0, l: f.l ?? 0, h: f.h ?? 0 }
}

export const accrocheActeurs: Accroche = (contexte: ContexteMoteur) => {
  const { racine, jeu } = contexte
  const monde0 = mondeDe(contexte)
  if (!racine || !jeu || !jeu.canvas || !monde0) return
  const monde: Monde = monde0
  const toile = jeu.canvas
  const grille = contexte.grille
  const carte = racine.closest<HTMLElement>('[data-station-carte]') ?? racine
  if (getComputedStyle(racine).position === 'static') racine.style.position = 'relative'

  // La salle d'une clé : la boîte de l'emplacement qui l'accueille (la disposition réglée est déjà appliquée dans monde.carte).
  const boiteSalle = (cle: string): Boite | null => {
    const e = monde.carte.emplacements.find((x) => (x.salle ?? x.cle) === cle)
    return e ? boiteDe(e) : null
  }

  const couche = document.createElement('div')
  couche.setAttribute('data-acteurs', '')
  couche.setAttribute('aria-hidden', 'true')
  couche.className = 'mc-acteurs'
  racine.append(couche)
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, parent?: Element) => {
    const e = document.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    parent?.append(e)
    return e
  }
  const dire = (e: Element, t: string) => { if (e.textContent !== t) e.textContent = t }

  // ── Les blocs : un élément par donnée, posé d'après la vue ──────────────────────────────────────────────────────────────────
  type Bloc = { el: HTMLElement; ancre: () => Point | null; largeur?: () => number | null }
  const blocs = new Map<string, Bloc>()
  const bloc = (cle: string, creer: () => HTMLElement, ancre: () => Point | null, largeur?: () => number | null) => {
    let b = blocs.get(cle)
    if (!b) { b = { el: creer(), ancre, largeur }; blocs.set(cle, b) } else { b.ancre = ancre; b.largeur = largeur }
    return b.el
  }
  const retirerBlocsHors = (gardes: Set<string>) => { for (const [cle, b] of blocs) if (!gardes.has(cle)) { b.el.remove(); blocs.delete(cle) } }

  const placer = () => {
    const W = toile.clientWidth, H = toile.clientHeight
    if (!W || !H) return
    Object.assign(couche.style, { left: `${toile.offsetLeft}px`, top: `${toile.offsetTop}px`, width: `${W}px`, height: `${H}px` })
    const vue = lireVue(carte, grille)
    for (const b of blocs.values()) {
      const p = b.ancre()
      if (!p) continue
      const c = enCss(vue, grille, W, H, p)
      b.el.style.left = `${Math.round(c.x)}px`
      b.el.style.top = `${Math.round(c.y)}px`
      const l = b.largeur?.()
      if (l) b.el.style.maxWidth = `${Math.max(24, Math.round(l * c.s))}px`
    }
  }

  // ── Le dessin des données ───────────────────────────────────────────────────────────────────────────────────────────────────
  function dessiner(props: PropsCarte) {
    const gardes = new Set<string>()
    const garde = (cle: string) => { gardes.add(cle); return cle }

    // Le tapis : huit étapes (la septième du relevé, PAYÉ à part) posées sur le tracé du thème, et la zone REJET.
    const tapis = props.tapis?.valeur as unknown as { etapes?: unknown[]; rejet?: unknown; paye?: unknown } | null | undefined
    const servies = etapesDe(tapis)
    const paye = objet(tapis?.paye) ? tapis.paye : null
    const payeEtape = objet(paye?.valeur) ? etapesDe({ etapes: [paye.valeur] })[0] : null
    const horsPerimetre = !!paye && !payeEtape && (texte(paye.manque) !== null || paye.nonMesure === true || /p[ée]rim[eè]tre/i.test(texte(paye.raison) ?? ''))
    const lignesTapis: Etape[] = [...servies.filter((e) => e.cle !== 'paye'), payeEtape ?? { cle: 'paye', libelle: 'PAYÉ', jour: null }]
    for (const e of monde.carte.tapis.etapes) {
      const s = lignesTapis.find((x) => x.cle === e.cle)
      if (!s) continue
      const t = e.cle === 'paye' && horsPerimetre ? `${dit(s.libelle, s.jour)} · hors périmètre` : dit(s.libelle, s.jour)
      const n = bloc(garde(`tapis:${e.cle}`), () => el('span', { 'data-tapis-etape': e.cle }, couche), () => ({ x: e.x, y: e.y }))
      dire(n, t)
    }
    const rejet = objet(tapis?.rejet) ? tapis.rejet : null
    const nRejet = nombre(rejet?.nombre), taux = nombre(rejet?.tauxPass)
    const xs = monde.carte.tapis.etapes
    const dernier = xs.length ? xs[xs.length - 1] : null
    const nr = bloc(garde('tapis:rejet'), () => el('span', { 'data-tapis-rejet': '' }, couche), () => (dernier ? { x: dernier.x, y: dernier.y + monde.carte.canvas.tileSize } : { x: 0, y: monde.carte.canvas.tileSize }))
    dire(nr, `REJET ${nRejet === null ? '—' : nRejet} · PASS ${taux === null ? '—' : Math.round(taux * 100)} %`)

    const donnees = lire(props.carte) as Record<string, unknown> | null

    // Les lignes : le Crieur (contenu), l'Usine (sites et packs). Une ligne absente se dit « — » à chaque étape.
    const lignes = lire(donnees?.lignes) as Record<string, unknown> | null
    const ligne = (nom: string, cles: readonly (readonly [string, string])[], salle: string, colonne: number, colonnes: number) => {
      const etapes = etapesDe(lire(lignes?.[nom]))
      const boite = boiteSalle(salle)
      const conteneur = bloc(garde(`ligne:${nom}`), () => el('div', { 'data-ligne': nom }, couche), () => (boite ? { x: boite.x + (boite.l * colonne) / colonnes, y: boite.y + 12 } : null), () => (boite ? boite.l / colonnes : null))
      const vus = new Set<string>()
      for (const [cle, libelle] of cles) {
        const e = etapes.find((x) => x.cle === cle)
        const id = `${nom}:${cle}`
        vus.add(id)
        let n = conteneur.querySelector<HTMLElement>(`[data-ligne-etape="${id}"]`)
        if (!n) n = el('span', { 'data-ligne-etape': id }, conteneur)
        dire(n, dit(e?.libelle ?? libelle, e ? e.jour : null))
      }
      for (const n of [...conteneur.querySelectorAll<HTMLElement>('[data-ligne-etape]')]) if (!vus.has(n.getAttribute('data-ligne-etape') ?? '')) n.remove()
    }
    ligne('contenu', LIGNES.contenu, 'crieur', 0, 1)
    ligne('sites', LIGNES.sites, 'usine', 0, 2)
    ligne('packs', LIGNES.packs, 'usine', 1, 2)

    // L'égaliseur du Radar : douze barres, une par heure ; FIGÉ entre deux lectures (aucune animation, aucune minuterie).
    const valeurs = lire(donnees?.egaliseur)
    const barres = Array.isArray(valeurs) ? valeurs.slice(0, 12).map(nombre) : []
    const boiteRadar = boiteSalle('radar')
    const eg = bloc(garde('egaliseur'), () => el('div', { 'data-egaliseur': '' }, couche), () => (boiteRadar ? { x: boiteRadar.x + 3, y: boiteRadar.y + boiteRadar.h - 4 } : null), () => (boiteRadar ? boiteRadar.l - 6 : null))
    while (eg.children.length < 12) el('i', { 'data-barre': '' }, eg)
    const max = Math.max(1, ...barres.filter((v): v is number => v !== null))
    for (let i = 0; i < 12; i++) {
      const b = eg.children[i] as HTMLElement
      const v = barres[i] ?? null
      const valeur = v === null ? '—' : String(v)
      if (b.getAttribute('data-valeur') !== valeur) b.setAttribute('data-valeur', valeur)
      const h = v === null ? 1 : Math.max(1, Math.round((v / max) * 14))
      if (b.style.height !== `${h}px`) b.style.height = `${h}px`
    }

    // L'écran de l'Expérience : « J6/30 · 0 € » en cours ; avant la première vente, « FERMÉE · R13 » ; une source absente, « — ».
    const experience = lire(donnees?.experience)
    const boiteExp = boiteSalle('experience')
    const ecran = bloc(garde('ecran:experience'), () => el('div', { 'data-ecran': 'experience' }, couche), () => (boiteExp ? { x: boiteExp.x + 3, y: boiteExp.y + boiteExp.h / 2 } : null), () => (boiteExp ? boiteExp.l - 6 : null))
    dire(ecran, !objet(experience) ? '—' : experience.statut === 'en_cours' && texte(experience.barre) ? (experience.barre as string) : 'FERMÉE · R13')

    // Les écrans des autres salles : une salle sans flux sur la carte dit « — » (jamais 0), pour le lecteur d'écran ; un écran par salle non réservée.
    for (const e of monde.carte.emplacements) {
      if (!e.salle || e.reservee || e.salle === 'experience') continue
      const salle = e.salle
      dire(bloc(garde(`ecran:${salle}`), () => el('span', { 'data-ecran': salle }, couche), () => null), '—')
    }

    // Les badges LV : seulement là où un palier est servi (palierSalle).
    const paliers = lire(donnees?.paliers)
    if (objet(paliers)) {
      for (const [salle, p] of Object.entries(paliers)) {
        const t = objet(p) ? texte(p.texte) : null
        const boite = boiteSalle(salle)
        if (!t || !boite) continue
        const b = bloc(garde(`badge:${salle}`), () => el('span', { 'data-badge-lv': salle }, couche), () => ({ x: boite.x + boite.l - 2, y: boite.y + 1 }))
        dire(b, t)
      }
    }

    // Le hublot de l'Observatoire : un point par département qui a des prospects (agrégé), dans l'ordre servi ; aucune donnée géographique.
    const departements = lire(donnees?.departements)
    const boiteObs = boiteSalle('observatoire')
    if (Array.isArray(departements) && boiteObs) {
      const liste = departements.flatMap((d) => (objet(d) && texte(d.departement) ? [texte(d.departement) as string] : [])).slice(0, POINTS_MAX)
      const colonnes = 6, pas = Math.max(4, Math.floor(Math.min(boiteObs.l - 12, boiteObs.h - 20) / colonnes))
      liste.forEach((code, i) => {
        const p = bloc(garde(`hublot:${code}`), () => el('i', { 'data-departement': code }, couche), () => ({ x: boiteObs.x + 6 + (i % colonnes) * pas, y: boiteObs.y + 14 + Math.floor(i / colonnes) * pas }))
        void p
      })
    }
    retirerBlocsHors(gardes)
    placer()
  }

  // ── Les carrés : un par carré qui avance d'une étape à la suivante, sur un VRAI changement d'étape ───────────────────────────────
  const animations = new Set<Animation>()
  const minuteries = new Set<number>()
  let releveAvant: unknown = null
  const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /** Le tracé du tapis entre deux étapes (le sous-chemin du thème), en pixels logiques ; la droite d'une étape à l'autre si le tracé manque. */
  function cheminEntre(de: Point | null, vers: Point): Point[] {
    const trace = monde.carte.tapis.trace
    if (!de || !trace?.length) return [de ?? vers, vers]
    const idx = (p: Point) => trace.findIndex((t) => t.x === p.x && t.y === p.y)
    const a = idx(de), b = idx(vers)
    if (a < 0 || b < 0 || a === b) return [de, vers]
    return (a < b ? trace.slice(a, b + 1) : trace.slice(b, a + 1).reverse()).map((p) => ({ x: p.x, y: p.y }))
  }

  function lancerCarres(apres: unknown) {
    const m = mouvements(releveAvant as never, apres as never)
    releveAvant = apres
    if (!Array.isArray(m) || !m.length) return
    const W = toile.clientWidth, H = toile.clientHeight
    if (!W || !H) return
    const vue = lireVue(carte, grille)
    const etapes = monde.carte.tapis.etapes
    for (const mv of m) {
      const i = etapes.findIndex((e) => e.cle === mv.etape)
      if (i < 0) continue
      const vers = etapes[i], de = i > 0 ? etapes[i - 1] : null
      const chemin = cheminEntre(de ? { x: de.x, y: de.y } : null, { x: vers.x, y: vers.y })
      // « +1 <ÉTAPE> » : du texte HTML au-dessus de l'étape franchie, 1,5 s, un par mouvement ; aucun en mouvement réduit.
      if (!reduit()) {
        const libelle = etapesDe(apres).find((x) => x.cle === mv.etape)?.libelle ?? mv.etape
        const base = enCss(vue, grille, W, H, { x: vers.x, y: vers.y })
        for (let n = 0; n < Math.min(mv.carres, CARRES_MAX); n++) {
          const t = el('span', { 'data-plus-un': mv.etape }, couche)
          t.textContent = `+1 ${libelle}`
          t.style.left = `${Math.round(base.x)}px`
          t.style.top = `${Math.round(base.y - 6 * base.s - n * 14)}px`
          const m = window.setTimeout(() => { t.remove(); minuteries.delete(m) }, DUREE_PLUS_UN_MS)
          minuteries.add(m)
        }
      }
      for (let n = 0; n < Math.min(mv.carres, CARRES_MAX); n++) {
        const c = el('span', { 'data-carre': mv.etape }, couche)
        const pts = chemin.map((p) => enCss(vue, grille, W, H, p))
        if (reduit() || pts.length < 2) {
          // Mouvement réduit : le carré saute à l'étape (aucun glissement), puis s'en va.
          const fin = pts[pts.length - 1]
          c.style.left = `${Math.round(fin.x)}px`
          c.style.top = `${Math.round(fin.y)}px`
          const t = window.setTimeout(() => { c.remove(); minuteries.delete(t) }, DUREE_CARRE_REDUIT_MS)
          minuteries.add(t)
          continue
        }
        c.style.left = '0px'
        c.style.top = '0px'
        const trajet = pts.map((p, k) => ({ transform: `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`, offset: k / (pts.length - 1) }))
        const a = c.animate(trajet, { duration: DUREE_CARRE_MS, delay: n * 150, easing: 'linear', fill: 'both' })
        animations.add(a)
        a.onfinish = () => { animations.delete(a); c.remove() }
      }
    }
  }

  // ── Ce qui déclenche un redessin : jamais une horloge, seulement les données servies, la vue ou la taille ──────────────────────────
  const empreinte = (p: PropsCarte) => JSON.stringify([p.tapis?.valeur ?? null, p.carte?.valeur ?? null, p.reglages?.reglages?.salles ?? null])
  let signature = empreinte(contexte.props)
  releveAvant = lire(contexte.props.tapis)
  contexte.ecouter((props) => {
    const s = empreinte(props)
    if (s === signature) return
    signature = s
    lancerCarres(lire(props.tapis))
    dessiner(props)
  })
  const observeurVue = new MutationObserver(placer)
  observeurVue.observe(carte, { attributes: true, attributeFilter: ['data-zoom', 'data-vue-x', 'data-vue-y'] })
  const observeurTaille = new ResizeObserver(placer)
  observeurTaille.observe(toile)
  observeurTaille.observe(racine)
  dessiner(contexte.props)

  return () => {
    observeurVue.disconnect()
    observeurTaille.disconnect()
    for (const a of animations) a.cancel()
    animations.clear()
    for (const t of minuteries) window.clearTimeout(t)
    minuteries.clear()
    blocs.clear()
    couche.remove()
  }
}

