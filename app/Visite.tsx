'use client'

// Visite guidée à la première ouverture (sprint J-1 §4 B3). Projecteur sur un élément
// marqué `data-visite="…"`, texte court, « Plus tard » toujours visible, Échap ferme.
// Jamais bloquante : chaque étape a une sortie, et la visite se rejoue depuis le panneau « ? ».
//
// Une visite par surface. Seule `console` est livrée : les autres surfaces (plateforme
// côté artisan, éditeur de site, inventaire) reçoivent la leur après leur refonte — la
// structure est prête, il suffit d'ajouter les étapes.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export type Etape = {
  /** valeur de l'attribut data-visite de l'élément visé */
  cible: string
  titre: string
  texte: string
  /** l'élément vit dans le menu latéral : sur mobile, le shell l'ouvre avant de le montrer */
  menu?: boolean
}

export const VISITES: Record<string, Etape[]> = {
  console: [
    { cible: 'sidebar', menu: true, titre: 'Tout est dans ce menu', texte: 'Vos devis et factures, vos tarifs, votre page, et — dès l’offre Studio — la plateforme avec vos demandes et vos messages : chaque outil a son entrée ici.' },
    { cible: 'nav-outils', menu: true, titre: 'Réponses instantanées', texte: 'Dès l’offre Studio : collez la demande d’un client, Presti rédige la réponse dans votre ton. Vous la relisez, puis vous la copiez où vous voulez.' },
    { cible: 'nav-plateforme', menu: true, titre: 'Ma plateforme', texte: 'La plateforme commence avec l’offre Studio : réglez comment l’assistant répond à vos clients (après votre validation, jamais, ou automatiquement) et l’apparence de votre page.' },
    { cible: 'nav-devis', menu: true, titre: 'Devis', texte: 'Décrivez le chantier, l’IA propose un chiffrage, sur vos prix dès que votre bibliothèque de tarifs est remplie. Vous ajustez, vous envoyez ; un devis envoyé depuis une conversation, le client l’accepte en ligne.' },
    { cible: 'aide', titre: 'Un doute ? Ce bouton', texte: 'Sur chaque écran, il explique à quoi sert la page et comment s’en servir. Vous y retrouverez aussi cette visite.' },
  ],
}

type Rect = { top: number; left: number; width: number; height: number }
const sel = (cible: string) => document.querySelector<HTMLElement>(`[data-visite="${cible}"]`)

export default function Visite({
  surface,
  onEtape,
  onFin,
}: {
  surface: string
  /** appelé à chaque étape (le shell s'en sert pour ouvrir le menu sur mobile) */
  onEtape?: (e: Etape) => void
  /** true = visite terminée ; false = « Plus tard » ou Échap */
  onFin: (terminee: boolean) => void
}) {
  // Les étapes dont la cible n'est pas à l'écran sont sautées : une visite ne doit jamais
  // pointer dans le vide.
  const [etapes] = useState<Etape[]>(() => (VISITES[surface] ?? []).filter((e) => !!sel(e.cible)))
  const [i, setI] = useState(0)
  const [spot, setSpot] = useState<Rect | null>(null)
  const [carte, setCarte] = useState<{ top: number; left: number }>({ top: 12, left: 12 })
  const [visible, setVisible] = useState(false)
  const carteRef = useRef<HTMLDivElement>(null)
  const etape = etapes[i] as Etape | undefined
  const fin = useRef(onFin)
  fin.current = onFin

  const mesurer = useCallback(() => {
    if (!etape) return
    const el = sel(etape.cible)
    if (!el) return
    const r = el.getBoundingClientRect()
    const pad = 6
    const s = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 }
    setSpot(s)
    const c = carteRef.current
    const cw = c?.offsetWidth ?? 300, ch = c?.offsetHeight ?? 170
    const m = 12, vw = window.innerWidth, vh = window.innerHeight
    let top: number, left: number
    if (s.left + s.width + m + cw <= vw - m) { left = s.left + s.width + m; top = s.top }           // à droite de la cible
    else if (s.top + s.height + m + ch <= vh - m) { top = s.top + s.height + m; left = s.left }   // dessous
    else if (s.top - m - ch >= m) { top = s.top - m - ch; left = s.left }                          // dessus
    else { top = vh - ch - m; left = s.left }                                                      // bas d'écran
    left = Math.max(m, Math.min(left, vw - cw - m))
    top = Math.max(m, Math.min(top, vh - ch - m))
    setCarte({ top, left })
  }, [etape])

  // Aucune cible : on rend la main tout de suite (et on ne marque rien comme vu).
  useEffect(() => { if (!etapes.length) fin.current(false) }, [etapes.length])

  // À chaque étape : prévenir le shell, amener la cible à l'écran, mesurer (deux fois :
  // tout de suite, puis après la transition du menu mobile, 220 ms).
  useLayoutEffect(() => {
    if (!etape) return
    onEtape?.(etape)
    sel(etape.cible)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    mesurer()
    const t = setTimeout(mesurer, 260)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape, mesurer])

  useEffect(() => {
    window.addEventListener('resize', mesurer)
    window.addEventListener('scroll', mesurer, true)
    return () => { window.removeEventListener('resize', mesurer); window.removeEventListener('scroll', mesurer, true) }
  }, [mesurer])

  useEffect(() => {
    const t = setTimeout(() => { setVisible(true); carteRef.current?.focus() }, 20)
    return () => clearTimeout(t)
  }, [])

  const suivant = useCallback(() => {
    if (i + 1 >= etapes.length) fin.current(true)
    else setI(i + 1)
  }, [i, etapes.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); fin.current(false) }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); suivant() }
      else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); setI(i - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [i, suivant])

  if (!etape || !spot) return null
  const derniere = i === etapes.length - 1

  return (
    <div className={`visite${visible ? ' on' : ''}`}>
      {/* Un clic hors de la carte ferme la visite (comme « Plus tard ») : elle ne bloque jamais l'écran (recette du 12/10). */}
      <div className="visite-fond" aria-hidden="true" onClick={() => fin.current(false)} />
      <div className="visite-spot" style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }} aria-hidden="true" />
      <div
        ref={carteRef}
        className="visite-carte"
        role="dialog"
        aria-label="Visite guidée"
        aria-live="polite"
        tabIndex={-1}
        style={{ top: carte.top, left: carte.left }}
      >
        <span className="psh-crumb">Visite guidée · {i + 1}/{etapes.length}</span>
        <h3>{etape.titre}</h3>
        <p>{etape.texte}</p>
        <div className="visite-pts" aria-hidden="true">
          {etapes.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}
        </div>
        <div className="visite-act">
          <button type="button" className="psh-btn ghost visite-tard" onClick={() => fin.current(false)}>Plus tard</button>
          {i > 0 && <button type="button" className="psh-btn ghost" onClick={() => setI(i - 1)} aria-label="Étape précédente">←</button>}
          <button type="button" className="psh-btn primary" onClick={suivant}>{derniere ? 'Terminer' : 'Suivant'}</button>
        </div>
      </div>
    </div>
  )
}
