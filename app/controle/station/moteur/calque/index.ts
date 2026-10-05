// Fiche 026-184 (K4c) : le CALQUE HTML de la carte. Au-dessus du canevas : les plaques des salles, les noms, les bulles, les « Zz » et les
// « +1 », posés d'après la vue (zoom, centre) et recalculés SEULEMENT quand la vue, un personnage, un texte ou la taille du cadre change ;
// jamais en boucle. Les textes sont en police pixel OFL (`--mc-police-pixel`, posée par next/font sur le layout de la station), 12 px au
// moins. Dessous, le miroir accessible `ul[data-miroir]` (visuellement caché, lu par les lecteurs d'écran), l'info-bulle d'un personnage
// (nom, rôle, modèle) au survol et au focus, et la liste des salles que Carte.tsx garde sous la carte.
//
// RÈGLE DE SÉCURITÉ : tout ce qui vient d'un agent ou d'un réglage (nom, plaque, bulle, rôle, modèle, libellé d'étape) n'entre dans la
// page que par `textContent`. Ce module n'écrit jamais de balisage : `innerHTML`, `insertAdjacentHTML` et `outerHTML` n'y paraissent pas.
//
// Il ENRICHIT ce que les fiches 026-181 à 026-183 posent déjà (le miroir, la bulle, « Zz », les « +1 ») : un élément qu'un autre module a
// déjà posé dans le cadre n'est pas posé une seconde fois, il est seulement habillé (la police, la taille) par calque.css.
import { suiviDe, type Vivant } from '../scene/suivi'
import type { Accroche, ContexteMoteur, Emplacement } from '../types'
import { chargerTheme, dispositionDeRepli, dispositionDuTheme, type Disposition } from './disposition'
import { bullesLues, cleTheme, etapesLues, MOTIFS, nomDe, personnages, plaqueDe, taillePlaques, type Perso } from './lecture'
import { enCss, lireVue, monterVue } from './vue'
import './calque.css'

const DUREE_PLUS_UN_MS = 1500

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, parent?: Element): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  parent?.append(e)
  return e
}
/** Pose un texte seulement s'il change (un nœud texte ne se refait pas pour rien). */
function dire(e: Element, t: string) { if (e.textContent !== t) e.textContent = t }
function placer(e: HTMLElement, x: number, y: number) { e.style.left = `${Math.round(x)}px`; e.style.top = `${Math.round(y)}px` }
const sel = (v: string) => CSS.escape(v)

export const accrocheCalque: Accroche = (contexte: ContexteMoteur) => {
  const { racine, jeu } = contexte
  if (!racine || !jeu || !jeu.canvas) return
  const toile = jeu.canvas
  // Ce que la scène a décidé (positions des personnages, état, antenne) : le calque le LIT, il ne déduit rien et n'appelle jamais le pont.
  const suivi = suiviDe(contexte)
  const carte = racine.closest<HTMLElement>('[data-station-carte]') ?? racine
  if (getComputedStyle(racine).position === 'static') racine.style.position = 'relative'

  // ── La vue : lue sur le cadre, tenue ici seulement si la caméra de 026-182 n'est pas là ──────────────────────────
  const defaireVue = monterVue({ carte, racine, jeu, grille: contexte.grille, lectureSeule: !!carte.querySelector('[data-camera]') })

  // ── Les calques ──────────────────────────────────────────────────────────────────────────────────────────────────
  const calque = el('div', { 'data-calque': '', 'aria-hidden': 'true' })
  calque.className = 'mc-calque'
  const couchePlaques = el('div', { 'data-plaques': '' }, calque)
  const coucheNoms = el('div', { 'data-noms': '' }, calque)
  const coucheBulles = el('div', { 'data-bulles': '' }, calque)
  const couchePlusUn = el('div', { 'data-plus-uns': '' }, calque)
  const coucheAntenne = el('div', { 'data-antennes': '' }, calque)
  const antenne = el('div', { 'data-antenne': '', 'data-etat': 'fixe' }, coucheAntenne)
  antenne.style.position = 'absolute'
  const infobulle = el('div', { 'data-infobulle': '', role: 'tooltip', hidden: '' }, calque)
  racine.append(calque)

  // Le miroir : celui de 026-181 s'il existe, sinon le nôtre. Le nôtre est visuellement caché, jamais retiré de l'arbre d'accessibilité.
  let miroir = carte.querySelector<HTMLUListElement>('ul[data-miroir]')
  const miroirAMoi = !miroir
  if (!miroir) { miroir = el('ul', { 'data-miroir': '', 'aria-label': 'Les personnages de la station' }); miroir.className = 'mc-miroir'; racine.after(miroir) }
  const annexe = el('ul', { 'data-miroir-annexe': '', 'aria-label': 'Halo et tapis de la station' })
  annexe.className = 'mc-miroir'
  miroir.after(annexe)

  const ailleurs = (sl: string) => [...carte.querySelectorAll(sl)].some((x) => !calque.contains(x))

  // ── L'état ───────────────────────────────────────────────────────────────────────────────────────────────────────
  let theme: Awaited<ReturnType<typeof chargerTheme>> = null
  let cleChargee = ''
  let dispo: Disposition | null = null
  let persos: Perso[] = []
  let positions = new Map<string, Emplacement>()
  let actif: string | null = null
  let affiche: string | null = null
  let detruit = false
  let planifie = 0
  let signature = ''
  let etapesAvant: Map<string, number> | null = null
  const minuteries = new Set<number>()
  const plaques = new Map<string, HTMLElement>()
  const noms = new Map<string, HTMLElement>()
  const bulles = new Map<string, HTMLElement>()
  const zz = new Map<string, HTMLElement>()
  const lignes = new Map<string, { li: HTMLLIElement; mien: boolean }>()

  const recalculer = () => { if (!planifie && !detruit) planifie = requestAnimationFrame(() => { planifie = 0; dessiner() }) }

  function chargerSiBesoin() {
    const cle = cleTheme(contexte.props)
    if (cle === cleChargee) return
    cleChargee = cle
    void chargerTheme(cle).then((t) => { if (detruit || cle !== cleChargee) return; theme = t; dispo = null; recalculer() })
  }

  function laDisposition(): Disposition {
    if (!dispo) dispo = theme ? dispositionDuTheme(theme, contexte.grille) : dispositionDeRepli(contexte.grille)
    return dispo
  }

  // ── L'info-bulle : nom, rôle et modèle, en texte ─────────────────────────────────────────────────────────────────
  function montrer(p: Perso | undefined) {
    if (!p) return
    affiche = p.nom
    const d: [string, string][] = [['data-i-nom', nomDe(contexte.props, p.nom, p.libelle)], ['data-i-role', p.role], ['data-i-modele', p.modele]]
    infobulle.replaceChildren(...d.filter(([, t]) => t).map(([attr, t]) => { const l = el('div', { [attr]: '' }); l.textContent = t; return l }))
    infobulle.hidden = false
    posInfobulle()
  }
  function cacher() { affiche = null; infobulle.hidden = true }
  function posInfobulle() {
    const pos = affiche ? positions.get(affiche) : null
    if (!pos) return
    const W = toile.clientWidth, H = toile.clientHeight
    const c = enCss(lireVue(carte, contexte.grille), contexte.grille, W, H, pos)
    const l = infobulle.offsetWidth, h = infobulle.offsetHeight
    placer(infobulle, Math.max(2, Math.min(W - l - 2, c.x + 10)), Math.max(2, Math.min(H - h - 2, c.y - h - 6)))
  }

  // ── Le dessin : plaques, noms, bulles, « Zz », miroir ────────────────────────────────────────────────────────────
  function dessiner() {
    if (detruit) return
    const g = contexte.grille, W = toile.clientWidth, H = toile.clientHeight
    if (!W || !H) return
    Object.assign(calque.style, { left: `${toile.offsetLeft}px`, top: `${toile.offsetTop}px`, width: `${W}px`, height: `${H}px` })
    const vue = lireVue(carte, g)
    const d = laDisposition()
    const p = contexte.props
    const taille = taillePlaques(p)
    calque.style.setProperty('--mc-taille-plaque', `${taille}px`)

    // Les plaques : posées d'après la vue, du texte réglé ou du nom de la salle, jamais du HTML.
    const vues = new Set<string>()
    for (const pl of d.places) {
      vues.add(pl.cle)
      let n = plaques.get(pl.cle)
      if (!n) { n = el('span', { 'data-plaque': pl.cle }, couchePlaques); plaques.set(pl.cle, n) }
      dire(n, plaqueDe(p, pl.cle, pl.texte))
      n.toggleAttribute('data-reservee', pl.reservee)
      const c = enCss(vue, g, W, H, pl.plaque)
      placer(n, c.x, c.y)
      n.style.maxWidth = `${Math.max(48, (pl.cadre.l - 6) * c.s)}px`
    }
    for (const [cle, n] of plaques) if (!vues.has(cle)) { n.remove(); plaques.delete(cle) }

    // Les personnages : ceux que la scène dessine, à la place où elle les a posés (le dernier pas de marche) ; un acteur sans salle ou sans
    // emplacement n'a pas de position de la scène : il n'est pas dessiné, il n'a pas de ligne dans le miroir.
    persos = personnages(p, suivi.acteurs).filter((a) => suivi.vivants.has(a.nom))
    positions = new Map()
    for (const a of persos) { const v = suivi.vivants.get(a.nom) as Vivant; positions.set(a.nom, { x: v.x, y: v.y }) }
    const dessines = persos.filter((a) => positions.has(a.nom))
    const lesBulles = new Map(bullesLues(p).map((b) => [b.agent, b]))
    const noms2 = new Set(dessines.map((a) => a.nom))
    for (const [nom, n] of noms) if (!noms2.has(nom)) { n.remove(); noms.delete(nom) }
    for (const [nom, n] of bulles) if (!noms2.has(nom) || !lesBulles.has(nom)) { n.remove(); bulles.delete(nom) }
    for (const [nom, n] of zz) if (!noms2.has(nom)) { n.remove(); zz.delete(nom) }
    for (const a of dessines) {
      const pos = positions.get(a.nom) as Emplacement
      const c = enCss(vue, g, W, H, pos)
      const nom = nomDe(p, a.nom, a.libelle)
      let n = noms.get(a.nom)
      if (!n) { n = el('span', { 'data-nom': a.nom }, coucheNoms); noms.set(a.nom, n) }
      dire(n, nom)
      placer(n, c.x, c.y + 2)
      const b = lesBulles.get(a.nom)
      if (b && !ailleurs(`[data-bulle="${sel(a.nom)}"]`)) {
        let bn = bulles.get(a.nom)
        if (!bn) { bn = el('span', { 'data-bulle': a.nom }, coucheBulles); bulles.set(a.nom, bn) }
        dire(bn, b.texte)
        placer(bn, c.x, c.y - 17 * c.s - 2)
      }
      // « Zz » : seulement pour le motif `pause`, une fois arrivé à la salle de repos.
      if (a.motif === 'pause' && a.salle === 'repos' && suivi.vivants.get(a.nom)?.etat === 'arrive' && !ailleurs(`[data-zz="${sel(a.nom)}"]`)) {
        let z = zz.get(a.nom)
        if (!z) { z = el('span', { 'data-zz': a.nom }, coucheBulles); zz.set(a.nom, z) }
        dire(z, 'Zz')
        placer(z, c.x + 5 * c.s, c.y - 15 * c.s)
      } else if (zz.has(a.nom)) { zz.get(a.nom)?.remove(); zz.delete(a.nom) }
    }
    ecrireMiroir(dessines, p)
    for (const a of dessines) { const v = suivi.vivants.get(a.nom); if (v) dernierEtat.set(a.nom, `${v.salle}|${v.motif}|${v.etat}`) }
    placerAntenne()
    if (affiche) { if (noms2.has(affiche)) posInfobulle(); else cacher() }
  }

  /** Écrit un attribut seulement s'il change : un relevé du miroir (et le lecteur d'écran) ne voit que de vrais changements. */
  function poser(li: HTMLElement, attr: string, valeur: string) { if (li.getAttribute(attr) !== valeur) li.setAttribute(attr, valeur) }
  /** Les attributs d'une ligne du miroir : ce que la scène a décidé, rien de déduit ici. */
  function ecrireLigne(li: HTMLElement, v: Vivant) {
    poser(li, 'data-salle', v.salle)
    poser(li, 'data-motif', v.motif ?? '')
    poser(li, 'data-etat', v.etat)
    poser(li, 'data-x', String(v.x))
    poser(li, 'data-y', String(v.y))
    poser(li, 'data-halo', v.motif === 'tache' ? 'oui' : 'non')
  }

  // ── L'antenne : un élément qui recouvre sa zone, `data-etat` fixe ou tourne (la scène décide, ce module recopie) ───────
  function placerAntenne() {
    const zone = suivi.antenne.zone
    const W = toile.clientWidth, H = toile.clientHeight
    if (!zone || !W || !H) return
    const c = enCss(lireVue(carte, contexte.grille), contexte.grille, W, H, { x: zone.x, y: zone.y })
    Object.assign(antenne.style, { left: `${Math.round(c.x)}px`, top: `${Math.round(c.y)}px`, width: `${Math.round(zone.l * c.s)}px`, height: `${Math.round(zone.h * c.s)}px` })
    const etat = suivi.antenne.tourne ? 'tourne' : 'fixe'
    if (antenne.getAttribute('data-etat') !== etat) antenne.setAttribute('data-etat', etat)
  }

  /** Un pas de marche (ou une arrivée) : la ligne du miroir, le nom, la bulle et « Zz » de ce personnage suivent, rien d'autre ne se redessine. */
  const dernierEtat = new Map<string, string>()
  /** La taille du canevas, relevée une fois par changement de taille : surPas ne relit jamais la mise en page à chaque pas. */
  const taille = { l: toile.clientWidth, h: toile.clientHeight }
  function surPas(nom: string) {
    const v = suivi.vivants.get(nom)
    const a = persos.find((x) => x.nom === nom)
    const l = lignes.get(nom)
    if (!v || !a || !l) { recalculer(); return }
    // La ligne du miroir d'abord, tout de suite : c'est elle que lisent le lecteur d'écran et le juge.
    if (l.mien) ecrireLigne(l.li, v)
    positions.set(nom, { x: v.x, y: v.y })
    // Un changement de salle, de motif ou d'état (arrivée : « Zz » apparaît, départ : il disparaît) refait tout : tout de suite à l'arrivée
    // d'un personnage en pause (« Zz » est là dès l'arrivée, la machine fût-elle chargée), à la prochaine image sinon (treize personnages
    // qui partent ensemble ne redessinent pas treize fois).
    const cle = `${v.salle}|${v.motif}|${v.etat}`
    if (dernierEtat.get(nom) !== cle) {
      dernierEtat.set(nom, cle)
      if (v.etat === 'arrive' && v.motif === 'pause') dessiner(); else recalculer()
      return
    }
    const W = taille.l, H = taille.h
    if (!W || !H) return
    const c = enCss(lireVue(carte, contexte.grille), contexte.grille, W, H, v)
    const n = noms.get(nom); if (n) placer(n, c.x, c.y + 2)
    const b = bulles.get(nom); if (b) placer(b, c.x, c.y - 17 * c.s - 2)
    const z = zz.get(nom); if (z) placer(z, c.x + 5 * c.s, c.y - 15 * c.s)
    if (affiche === nom) posInfobulle()
  }

  // ── Le miroir : un `li` par personnage (salle, motif, état, x, y, halo, texte), et l'annexe (halo, tapis) ─────────────
  function ecrireMiroir(dessines: Perso[], p: typeof contexte.props) {
    const noms2 = new Set(dessines.map((a) => a.nom))
    for (const [nom, l] of lignes) if (!noms2.has(nom)) { if (l.mien) l.li.remove(); lignes.delete(nom) }
    const place = (cle: string | null) => (cle ? plaqueDe(p, cle, cle) : '')
    for (const a of dessines) {
      let l = lignes.get(a.nom)
      if (!l) {
        let li = miroir!.querySelector<HTMLLIElement>(`li[data-personnage="${sel(a.nom)}"]`)
        const mien = !li
        if (!li) {
          // La ligne naît COMPLÈTE (salle, motif, état, place, texte) : un relevé du miroir ne voit jamais un personnage à moitié posé.
          const v = suivi.vivants.get(a.nom) as Vivant
          li = el('li', { 'data-personnage': a.nom, 'data-salle': v.salle, 'data-motif': v.motif ?? '', 'data-etat': v.etat, 'data-x': String(v.x), 'data-y': String(v.y), 'data-halo': v.motif === 'tache' ? 'oui' : 'non' })
          li.textContent = `${nomDe(p, a.nom, a.libelle)}, ${place(a.salle)}, ${a.motif ? MOTIFS[a.motif] : 'sans position'}`
          miroir!.append(li)
        }
        l = { li, mien }
        lignes.set(a.nom, l)
        li.addEventListener('focus', () => { actif = a.nom; roulement(); montrer(persos.find((x) => x.nom === a.nom)) })
        li.addEventListener('blur', () => cacher())
        li.addEventListener('keydown', (ev) => deplacerFocus(ev, a.nom))
      }
      if (l.mien) ecrireLigne(l.li, suivi.vivants.get(a.nom) as Vivant)
      dire(l.li, `${nomDe(p, a.nom, a.libelle)}, ${place(a.salle)}, ${a.motif ? MOTIFS[a.motif] : 'sans position'}`)
    }
    roulement()
    const halo = dessines.filter((a) => a.motif === 'tache').map((a) => nomDe(p, a.nom, a.libelle))
    const etapes = etapesLues(p)
    const lignesAnnexe = [
      halo.length ? `Halo : ${halo.join(', ')}` : 'Halo : personne au travail',
      // Une source absente se dit « — », jamais 0 : le tapis ne montre que ce que la route a servi.
      etapes ? `Tapis : ${etapes.map((e) => `${e.libelle} ${e.jour}`).join(', ')}` : 'Tapis : —',
    ]
    annexe.replaceChildren(...lignesAnnexe.map((t) => { const li = el('li'); li.textContent = t; return li }))
  }
  /** Un seul personnage reçoit Tab (celui qui a le focus, sinon le premier) ; les flèches parcourent les autres. */
  function roulement() {
    const ordre = persos.filter((a) => lignes.has(a.nom)).map((a) => a.nom)
    const cible = actif && ordre.includes(actif) ? actif : ordre[0]
    for (const [nom, l] of lignes) l.li.tabIndex = nom === cible ? 0 : -1
  }
  function deplacerFocus(ev: KeyboardEvent, nom: string) {
    const ordre = persos.filter((a) => lignes.has(a.nom)).map((a) => a.nom)
    const i = ordre.indexOf(nom)
    const cibles: Record<string, number> = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: ordre.length - 1 }
    const suivant = cibles[ev.key]
    if (suivant === undefined || !ordre.length) return
    ev.preventDefault(); ev.stopPropagation()
    lignes.get(ordre[Math.max(0, Math.min(ordre.length - 1, suivant))])?.li.focus()
  }

  // ── Les « +1 » : un par mouvement de l'étape, 1,5 s, jamais au premier relevé ni sur une relecture identique ─────────
  function plusUns() {
    const etapes = etapesLues(contexte.props)
    if (!etapes) return
    const maintenant = new Map(etapes.map((e) => [e.cle, e.jour]))
    const avant = etapesAvant
    etapesAvant = maintenant
    if (!avant || ailleurs('[data-tapis-etape]')) return
    // Mouvement réduit : aucun « +1 » (rien ne se déplace sur la carte).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const W = toile.clientWidth, H = toile.clientHeight
    for (const e of etapes) {
      const delta = e.jour - (avant.get(e.cle) ?? e.jour)
      if (delta <= 0) continue
      const c = enCss(lireVue(carte, contexte.grille), contexte.grille, W, H, laDisposition().etapes[e.cle] ?? { x: contexte.grille.largeur / 2, y: contexte.grille.hauteur / 2 })
      for (let i = 0; i < Math.min(delta, 5); i++) {
        const n = el('span', { 'data-plus-un': e.cle }, couchePlusUn)
        n.textContent = `+1 ${e.libelle}`
        placer(n, c.x, c.y - 10 * c.s - i * 14)
        const m = window.setTimeout(() => { n.remove(); minuteries.delete(m) }, DUREE_PLUS_UN_MS)
        minuteries.add(m)
      }
    }
  }

  // ── Ce qui déclenche un recalcul : jamais une horloge ─────────────────────────────────────────────────────────────
  const empreinte = () => JSON.stringify([contexte.props.equipage?.valeur?.agents?.map((a) => [a.nom, a.libelle, a.role, a.position, a.modele?.texte]) ?? null, bullesLues(contexte.props), contexte.props.reglages?.reglages ?? null, etapesLues(contexte.props)])
  contexte.ecouter(() => {
    chargerSiBesoin()
    const s = empreinte()
    if (s === signature) return
    signature = s
    plusUns()
    recalculer()
  })
  const observeurVue = new MutationObserver(recalculer)
  observeurVue.observe(carte, { attributes: true, attributeFilter: ['data-zoom', 'data-vue-x', 'data-vue-y'] })
  const observeurTaille = new ResizeObserver(() => { taille.l = toile.clientWidth; taille.h = toile.clientHeight; recalculer() })
  observeurTaille.observe(toile)
  observeurTaille.observe(racine)
  // La scène dit ce qui change : un personnage (un pas, une arrivée, un retrait), l'antenne, ou la liste des acteurs.
  const desabonner = suivi.ecouter((nom) => {
    if (detruit) return
    if (nom === null) { placerAntenne(); recalculer(); return }
    if (!suivi.vivants.has(nom)) { dernierEtat.delete(nom); recalculer(); return }
    if (!lignes.has(nom)) { recalculer(); return }
    surPas(nom)
  })

  // L'info-bulle au survol : le personnage le plus proche du pointeur.
  const surPointeur = (ev: PointerEvent) => {
    const r = toile.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top
    const vue = lireVue(carte, contexte.grille)
    let trouve: Perso | undefined, mieux = Infinity
    for (const a of persos) {
      const pos = positions.get(a.nom)
      if (!pos) continue
      const c = enCss(vue, contexte.grille, r.width, r.height, pos)
      const dx = Math.abs(px - c.x), dy = py - c.y
      if (dx > Math.max(10, 6 * c.s) || dy < -(18 * c.s + 4) || dy > 6) continue
      const dist = dx + Math.abs(dy + 8 * c.s)
      if (dist < mieux) { mieux = dist; trouve = a }
    }
    if (trouve) { if (affiche !== trouve.nom) montrer(trouve) } else if (!miroir!.contains(document.activeElement)) cacher()
  }
  const surSortie = () => { if (!miroir!.contains(document.activeElement)) cacher() }
  racine.addEventListener('pointermove', surPointeur)
  racine.addEventListener('pointerleave', surSortie)

  chargerSiBesoin()
  signature = empreinte()
  plusUns()
  dessiner()

  return () => {
    detruit = true
    if (planifie) cancelAnimationFrame(planifie)
    for (const m of minuteries) window.clearTimeout(m)
    minuteries.clear()
    observeurVue.disconnect()
    observeurTaille.disconnect()
    desabonner()
    racine.removeEventListener('pointermove', surPointeur)
    racine.removeEventListener('pointerleave', surSortie)
    defaireVue()
    for (const l of lignes.values()) if (l.mien) l.li.remove()
    annexe.remove()
    if (miroirAMoi) miroir?.remove()
    calque.remove()
  }
}
