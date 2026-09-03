'use client'

// Info-bulle ⓘ (sprint J-1 §4 B2). Usage : <label>Mode de réponse <Info cle="plateforme.mode_reponse" /></label>
// Le texte vient de lib/aide.ts (INFOBULLES) ; une clé inconnue n'affiche rien plutôt que
// de planter la page — l'aide ne doit jamais casser un formulaire.
//
// Accessibilité : bouton réel (focus clavier), aria-describedby vers la bulle (role=tooltip,
// toujours dans le DOM), ouverture au survol souris, au focus clavier et au tap (mobile),
// fermeture à Échap et au clic dehors. La bulle est positionnée en `fixed` et bascule
// au-dessus du bouton quand il n'y a plus de place dessous.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { INFOBULLES } from '@/lib/aide'

type Position = { top: number; left: number; haut: boolean; origine: number }

export default function Info({ cle }: { cle: string }) {
  const bulle = INFOBULLES.find((b) => b.cle === cle)
  const id = useId()
  const btn = useRef<HTMLButtonElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [fixe, setFixe] = useState(false) // épinglée par clic / tap : le survol ne la ferme plus
  const [pos, setPos] = useState<Position>({ top: 0, left: 0, haut: false, origine: 0 })

  const placer = useCallback(() => {
    const b = btn.current, x = box.current
    if (!b || !x) return
    const r = b.getBoundingClientRect()
    const w = x.offsetWidth, h = x.offsetHeight
    const m = 12, vw = window.innerWidth, vh = window.innerHeight
    // Sous le bouton par défaut ; au-dessus seulement si ça déborde en bas ET que ça tient en haut.
    const haut = r.bottom + 8 + h > vh - m && r.top - 8 - h >= m
    const top = haut ? r.top - 8 - h : r.bottom + 8
    let left = r.left + r.width / 2 - w / 2
    left = Math.max(m, Math.min(left, vw - w - m))
    setPos({ top, left, haut, origine: r.left + r.width / 2 - left })
  }, [])

  useLayoutEffect(() => { if (open) placer() }, [open, placer])

  useEffect(() => {
    if (!open) return
    const fermer = () => { setOpen(false); setFixe(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer() }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (btn.current?.contains(t) || box.current?.contains(t)) return
      fermer()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', placer, true)
    window.addEventListener('resize', placer)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', placer, true)
      window.removeEventListener('resize', placer)
    }
  }, [open, placer])

  if (!bulle) return null

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`info${open ? ' on' : ''}`}
        aria-label={`En savoir plus : ${bulle.label}`}
        aria-describedby={id}
        aria-expanded={open}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOpen(true) }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse' && !fixe) setOpen(false) }}
        onClick={(e) => {
          // preventDefault : dans un <label> qui enveloppe une case à cocher, le clic ne
          // doit pas basculer la case. stopPropagation : ni déclencher un parent cliquable.
          e.preventDefault(); e.stopPropagation()
          const n = !fixe
          setFixe(n); setOpen(n)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => { if (!fixe) setOpen(false) }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="8" cy="8" r="6.6" />
          <path d="M8 7.2v4" />
          <circle cx="8" cy="4.9" r=".55" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <div
        ref={box}
        id={id}
        role="tooltip"
        className={`info-bulle${open ? ' on' : ''}`}
        style={{ top: pos.top, left: pos.left, transformOrigin: `${pos.origine}px ${pos.haut ? '100%' : '0%'}` }}
      >
        <span>{bulle.explication}</span>
        <em>Exemple : {bulle.exemple}</em>
      </div>
    </>
  )
}
