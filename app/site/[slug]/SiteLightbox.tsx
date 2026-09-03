'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Visionneuse de la galerie (v4 §7/E2).
//
// Pourquoi elle existe : sans elle, une photo de chantier reste en vignette 300 px — c'est
// le contenu le plus convaincant du site, et on le montrait au timbre-poste.
//
// Le mouvement sert ici la CONTINUITÉ : l'image agrandie doit être visiblement la même que
// la vignette cliquée, pas une nouvelle image qui apparaît. D'où la transition d'élément
// partagé (View Transitions API), avec un repli en fondu là où l'API n'existe pas.
//
// Accessibilité livrée avec, pas après : rôle dialog, focus piégé, Échap, focus rendu à la
// vignette d'origine, flèches gauche/droite, et fond de page verrouillé.

type Vue = { src: string; titre: string; tag: string }

export default function SiteLightbox() {
  const [i, setI] = useState<number | null>(null)
  const [vues, setVues] = useState<Vue[]>([])
  const boite = useRef<HTMLDivElement>(null)
  const declencheur = useRef<HTMLElement | null>(null)
  const reduit = useRef(false)

  // Ouverture : on lit la galerie déjà rendue par le serveur — pas de duplication de données.
  useEffect(() => {
    reduit.current = matchMedia('(prefers-reduced-motion: reduce)').matches
    const figures = () => Array.from(document.querySelectorAll<HTMLElement>('.site-gallery .site-shot'))

    const onClick = (ev: MouseEvent) => {
      const fig = (ev.target as HTMLElement)?.closest?.('.site-gallery .site-shot') as HTMLElement | null
      if (!fig) return
      const liste = figures()
      const idx = liste.indexOf(fig)
      if (idx < 0) return
      ev.preventDefault()
      declencheur.current = fig
      setVues(liste.map((f) => ({
        src: f.querySelector('img')?.currentSrc || f.querySelector('img')?.src || '',
        titre: f.querySelector('figcaption b')?.textContent || '',
        tag: f.querySelector('.site-shot-tag')?.textContent || '',
      })))
      ouvrir(idx, fig)
    }

    // Les figures deviennent de vraies cibles clavier : sans ça, la galerie n'existe pas
    // pour quelqu'un qui n'utilise pas de souris.
    const armer = () => figures().forEach((f, n) => {
      f.setAttribute('role', 'button')
      f.setAttribute('tabindex', '0')
      f.setAttribute('aria-label', `Agrandir la réalisation ${n + 1}`)
    })
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return
      const fig = (ev.target as HTMLElement)?.closest?.('.site-gallery .site-shot') as HTMLElement | null
      if (!fig) return
      ev.preventDefault()
      fig.click()
    }
    armer()
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey) }
  }, [])

  // La transition d'élément partagé : la vignette et la grande image portent le même nom,
  // le navigateur fait voyager l'une vers l'autre. Sans l'API : simple fondu (le repli).
  const transitionner = (maj: () => void, source: HTMLElement | null) => {
    type Doc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }
    const d = document as Doc
    if (reduit.current || typeof d.startViewTransition !== 'function') { maj(); return }
    const img = source?.querySelector<HTMLElement>('img')
    if (img) img.style.viewTransitionName = 'site-lb'
    const t = d.startViewTransition(maj)
    t.finished.finally(() => { if (img) img.style.viewTransitionName = '' })
  }

  const ouvrir = (idx: number, source: HTMLElement | null) => transitionner(() => setI(idx), source)

  const fermer = useCallback(() => {
    const source = declencheur.current
    transitionner(() => setI(null), source)
    // On rend le focus là où l'utilisateur l'avait laissé.
    setTimeout(() => source?.focus(), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aller = useCallback((pas: number) => {
    setI((n) => (n === null ? n : (n + pas + vues.length) % vues.length))
  }, [vues.length])

  // Clavier + verrouillage du fond, uniquement pendant l'ouverture.
  useEffect(() => {
    if (i === null) return
    const avant = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { ev.preventDefault(); fermer(); return }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); aller(1); return }
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); aller(-1); return }
      if (ev.key !== 'Tab') return
      // Piège à focus : la tabulation ne doit pas repartir dans la page derrière.
      const cibles = boite.current?.querySelectorAll<HTMLElement>('button')
      if (!cibles?.length) return
      const [prem, dern] = [cibles[0], cibles[cibles.length - 1]]
      if (ev.shiftKey && document.activeElement === prem) { ev.preventDefault(); dern.focus() }
      else if (!ev.shiftKey && document.activeElement === dern) { ev.preventDefault(); prem.focus() }
    }
    document.addEventListener('keydown', onKey)
    boite.current?.querySelector('button')?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = avant }
  }, [i, fermer, aller])

  if (i === null || !vues[i]) return null
  const v = vues[i]

  return (
    <div className="site-lb" role="dialog" aria-modal="true" aria-label={v.titre || 'Réalisation'} onClick={(e) => { if (e.target === e.currentTarget) fermer() }}>
      <div className="site-lb-in" ref={boite}>
        <button type="button" className="site-lb-x" onClick={fermer} aria-label="Fermer">✕</button>
        {vues.length > 1 ? <button type="button" className="site-lb-nav p" onClick={() => aller(-1)} aria-label="Réalisation précédente">‹</button> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={v.src} alt={v.titre || 'Réalisation'} className="site-lb-img" />
        {vues.length > 1 ? <button type="button" className="site-lb-nav n" onClick={() => aller(1)} aria-label="Réalisation suivante">›</button> : null}
        {(v.titre || v.tag) ? (
          <div className="site-lb-cap">
            {v.tag ? <span className="site-shot-tag">{v.tag}</span> : null}
            {v.titre ? <b>{v.titre}</b> : null}
            {vues.length > 1 ? <em>{i + 1} / {vues.length}</em> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
