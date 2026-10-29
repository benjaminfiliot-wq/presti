'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Marque from './Marque'

// Barre publique de Presti (landing, FAQ, contact, pages légales) — prompt v8, A1.1.
//
// Le bug n° 1 du mobile : sous 760 px, la barre cachait les liens ET « Se connecter ». Un artisan
// déjà client qui ouvrait prestiapp.fr sur son téléphone n'avait aucun chemin vers son espace.
// Ici, « Se connecter » reste toujours visible (libellé court sur petit écran), « Essayer » aussi,
// et un bouton de menu ouvre un tiroir avec les quatre liens + les deux actions. Cibles ≥ 44 px,
// fermeture au tap hors tiroir et à Échap, focus gardé dans le tiroir, aria-expanded/controls.

const LIENS = [
  { href: '/#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#tarifs', label: 'Tarifs' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Nous écrire' },
]

export default function PublicNav({ accueil = false }: { accueil?: boolean }) {
  const [ouvert, setOuvert] = useState(false)
  const tiroir = useRef<HTMLDivElement>(null)
  const bouton = useRef<HTMLButtonElement>(null)

  const fermer = useCallback(() => { setOuvert(false); bouton.current?.focus() }, [])

  useEffect(() => {
    if (!ouvert) return
    // Focus dans le tiroir, piégé entre son premier et son dernier élément ; Échap referme.
    const t = tiroir.current
    const focusables = () => Array.from(t?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); fermer(); return }
      if (e.key !== 'Tab') return
      const f = focusables(); if (!f.length) return
      const premier = f[0], dernier = f[f.length - 1]
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus() }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus() }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [ouvert, fermer])

  // Les ancres de la landing (#fonctionnalites, #tarifs) restent des ancres sur la landing elle-même.
  const lien = (href: string) => (accueil && href.startsWith('/#') ? href.slice(1) : href)

  // 29/10/2026 — bug mobile signalé par Benj : le tiroir (position:fixed) était DANS l'en-tête, et le backdrop-filter de .lp-head
  // en fait le bloc conteneur des descendants fixes ; le tiroir était donc cantonné à la hauteur de l'en-tête, sous le reste de la page.
  // Le voile et le tiroir sont maintenant frères de l'en-tête, rattachés au viewport.
  return (
    <>
    <header className="lp-head">
      <nav className="lp-nav" aria-label="Navigation principale">
        <a className="lp-brand" href="/"><i className="marque"><Marque size={26} /></i>Presti</a>
        <div className="lp-sp" />
        <div className="lp-links">
          {LIENS.map((l) => <a key={l.href} href={lien(l.href)}>{l.label}</a>)}
        </div>
        <a className="lp-btn lp-btn--g lp-btn--login" href="/login" aria-label="Se connecter"><span className="lp-long">Se connecter</span><span className="lp-court" aria-hidden="true">Connexion</span></a>
        <a className="lp-btn lp-btn--p lp-btn--essai" href="/signup" aria-label="Essayer gratuitement"><span className="lp-long">Essayer gratuitement</span><span className="lp-court" aria-hidden="true">Essayer</span></a>
        <button ref={bouton} type="button" className="lp-burger" aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={ouvert} aria-controls="lp-tiroir" onClick={() => setOuvert((v) => !v)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {ouvert ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>
    </header>
      {ouvert ? <div className="lp-scrim" onClick={fermer} aria-hidden="true" /> : null}
      <div id="lp-tiroir" ref={tiroir} className={`lp-tiroir${ouvert ? ' on' : ''}`} role="dialog" aria-modal="true" aria-label="Menu" hidden={!ouvert}>
        <nav aria-label="Menu mobile">
          {LIENS.map((l) => <a key={l.href} href={lien(l.href)} onClick={() => setOuvert(false)}>{l.label}</a>)}
        </nav>
        <div className="lp-tiroir-actions">
          <a className="lp-btn lp-btn--g" href="/login">Se connecter</a>
          <a className="lp-btn lp-btn--p" href="/signup">Essayer gratuitement</a>
        </div>
      </div>
    </>
  )
}
