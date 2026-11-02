'use client'

// La barre de la landing v2 (texte.md, « En-tête ») : logo, cinq liens, « Connexion » et un seul bouton plein, « Essayer Presti ».
// La barre publique commune (app/PublicNav.tsx) dit « Essayer gratuitement », libellé sorti de la v2 (plan du chantier 2, §0 bis,
// rang 2) : d'où cette barre propre à la v2, qui reprend son comportement éprouvé (tiroir sous 900 px, focus piégé, Échap, cibles de
// 44 px) et ses classes (.lp-head, .lp-tiroir…), habillées par app/landing/landing-v2.css.
import { useCallback, useEffect, useRef, useState } from 'react'
import Marque from '@/app/Marque'
import { LIENS_ENTETE } from '@/lib/landing/contenu'

/** `base` : « / » hors de la landing (page de démo de /contact), pour que les ancres de la barre ramènent à la landing. */
export default function Entete({ base = '' }: { base?: string }) {
  const vers = (href: string) => (href.startsWith('#') ? base + href : href)
  const [ouvert, setOuvert] = useState(false)
  const tiroir = useRef<HTMLDivElement>(null)
  const bouton = useRef<HTMLButtonElement>(null)
  const fermer = useCallback(() => { setOuvert(false); bouton.current?.focus() }, [])

  useEffect(() => {
    if (!ouvert) return
    const t = tiroir.current
    const focusables = () => Array.from(t?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])
    focusables()[0]?.focus()
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); fermer(); return }
      if (e.key !== 'Tab') return
      const f = focusables(); if (!f.length) return
      const premier = f[0], dernier = f[f.length - 1]
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus() }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus() }
    }
    document.addEventListener('keydown', touche)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', touche); document.body.style.overflow = '' }
  }, [ouvert, fermer])

  return (
    <>
      {/* 033-004, défaut 13 : tiroir ouvert, la barre passe AU-DESSUS du tiroir, pour que la croix reste visible à la même place. */}
      <header className={`lp-head lp3-head${ouvert ? ' est-ouvert' : ''}`}>
        <nav className="lp-nav lp3-nav" aria-label="Navigation principale">
          <a className="lp-brand lp3-marque" href="/"><i className="marque"><Marque size={24} /></i>Presti</a>
          <div className="lp3-liens">
            {LIENS_ENTETE.map((l) => <a key={l.href} href={vers(l.href)}>{l.texte}</a>)}
          </div>
          <a className="lp3-connexion" href="/login">Connexion</a>
          <a className="lp3-btn lp3-btn--plein lp3-btn--petit" href="/signup">Essayer Presti</a>
          <button ref={bouton} type="button" className="lp3-menu" aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={ouvert} aria-controls="lp3-tiroir" onClick={() => setOuvert((v) => !v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              {ouvert ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </nav>
      </header>
      {ouvert ? <div className="lp-scrim" onClick={fermer} aria-hidden="true" /> : null}
      <div id="lp3-tiroir" ref={tiroir} className={`lp3-tiroir${ouvert ? ' on' : ''}`} role="dialog" aria-modal="true" aria-label="Menu" hidden={!ouvert}>
        <nav aria-label="Menu mobile">
          {LIENS_ENTETE.map((l) => <a key={l.href} href={vers(l.href)} onClick={() => setOuvert(false)}>{l.texte}</a>)}
          <a href="/login" onClick={() => setOuvert(false)}>Connexion</a>
        </nav>
      </div>
    </>
  )
}
