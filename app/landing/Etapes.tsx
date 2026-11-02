'use client'

// Section 3 de la landing v2 : les trois temps (texte de Benj mot pour mot, p4-landing.md:64-66), chaque étape avec la capture du VRAI
// produit (public/demo, scripts/demo-captures.mjs : rien n'est dessiné à la main).
// - Servie lisible sans script : une liste de trois étapes, la ligne d'exemple entière, les trois captures.
// - 033-009 (passe 3) : l'épinglage des trois temps est retiré — « Une journée avec Presti » (Journee.tsx), juste en dessous, porte
//   désormais les diapositives épinglées de la section ; deux épinglages de suite noieraient le lecteur. Les trois temps passent en
//   rangée : chaque carte entre à son tour (cascade de .reveal-kids), sa capture se dévoile, la ligne d'exemple se tape, et « Valider »
//   passe au vert quand la troisième carte est à l'écran (jamais en mouvement réduit, jamais si le visiteur a déjà cliqué).
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ETAPES } from '@/lib/landing/contenu'

const Coche = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>

function LigneTapee({ texte }: { texte: string }) {
  const [vu, setVu] = useState(texte)
  const [tape, setTape] = useState(false)
  const racine = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    let minuterie = 0
    const io = new IntersectionObserver((e) => {
      if (!e[0]?.isIntersecting) return
      io.disconnect()
      let i = 0
      setTape(true); setVu('')
      minuterie = window.setInterval(() => {
        i += 1
        setVu(texte.slice(0, i))
        if (i >= texte.length) { clearInterval(minuterie); setTape(false) }
      }, 30)
    }, { threshold: 0.8 })
    if (racine.current) io.observe(racine.current)
    return () => { io.disconnect(); clearInterval(minuterie) }
  }, [texte])
  // Le texte entier reste en place, invisible, sous la frappe : la boîte ne change jamais de taille (aucun décalage).
  return (
    <span className="lp3-tape" ref={racine}>
      <span className="lp3-tape-fantome" aria-hidden="true">{texte}</span>
      <span className="lp3-tape-vue" aria-hidden={tape}>{vu}{tape ? <i className="lp3-curseur" /> : null}</span>
      {tape ? <span className="sr-only">{texte}</span> : null}
    </span>
  )
}

/** Une capture recadrée en CSS sur une zone de l'image source (en pixels) : la boîte prend les proportions de la zone. */
type Zone = { x: number; y: number; l: number; h: number }
/** Les zones passent en variables CSS : la feuille choisit celle de l'ordinateur ou, plus serrée, celle du téléphone (landing-v2.css). */
function Recadre({ src, alt, r, m }: { src: string; alt: string; r: Zone; m?: Zone }) {
  const v = (z: Zone, s: string) => ({ [`--x${s}`]: z.x, [`--y${s}`]: z.y, [`--l${s}`]: z.l, [`--h${s}`]: z.h })
  return (
    <span className="lp3-recadre" style={{ ...v(r, ''), ...v(m ?? r, 'm') } as CSSProperties}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={1400} height={875} alt={alt} loading="lazy" decoding="async" />
    </span>
  )
}

export default function Etapes() {
  const [valide, setValide] = useState(false)
  const touche = useRef(false) // le visiteur a cliqué : la page ne décide plus à sa place
  const racine = useRef<HTMLOListElement>(null)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    const li = racine.current?.querySelectorAll('.lp3-etape')[2]
    if (!li) return
    let t = 0
    const io = new IntersectionObserver((e) => {
      if (!e[0]?.isIntersecting) return
      io.disconnect()
      t = window.setTimeout(() => { if (!touche.current) setValide(true) }, 1400)
    }, { threshold: 0.6 })
    io.observe(li)
    return () => { io.disconnect(); clearTimeout(t) }
  }, [])

  return (
    <ol className="lp3-etapes reveal-kids" ref={racine}>
      {ETAPES.map((e, i) => {
        const derniere = i === ETAPES.length - 1
        const tel = e.appareil === 'telephone'
        const alt = `Exemple, capture du produit : ${e.legende}`
        return (
          <li key={e.titre} className={`lp3-etape${derniere && valide ? ' est-valide' : ''}`}>
            <figure className={`lp3-ecran${tel ? ' lp3-ecran--tel' : ' lp3-ecran--ordi'}`}>
              <span className="lp3-puce lp3-puce--flottante">Exemple</span>
              {'recadre' in e && e.recadre ? <Recadre src={e.image} alt={alt} r={e.recadre} m={'recadreTel' in e ? e.recadreTel : undefined} /> : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.image}
                  srcSet={tel ? `${e.image.replace(/\.webp$/, '-390.webp')} 390w, ${e.image.replace(/\.webp$/, '-520.webp')} 520w, ${e.image} 780w` : undefined}
                  sizes={tel ? '(max-width: 900px) 90vw, 380px' : undefined}
                  width={tel ? 780 : 1400} height={tel ? 1688 : 875}
                  alt={alt} loading="lazy" decoding="async"
                />
              )}
              <figcaption>{e.legende}</figcaption>
            </figure>
            <div className="lp3-etape-texte">
              <span className="lp3-pastille" aria-hidden="true">{derniere && valide ? <Coche /> : i + 1}</span>
              <h3>{e.titre}</h3>
              <p>{e.texte}</p>
              {'exemple' in e && e.exemple ? (
                <p className="lp3-saisie"><span className="lp3-puce">Exemple</span><LigneTapee texte={e.exemple} /></p>
              ) : null}
              {derniere ? (
                <div className="lp3-valider">
                  <button type="button" className={`lp3-btn ${valide ? 'lp3-btn--valide' : 'lp3-btn--contour'}`} aria-pressed={valide}
                    onClick={() => { touche.current = true; setValide((v) => !v) }}>
                    {valide ? <><Coche />Validé</> : 'Valider'}
                  </button>
                  {/* Les deux phrases occupent la même case : la boîte prend la plus longue, le bloc ne saute pas au clic (033-004, défaut 3). */}
                  <span className="lp3-valider-aide" aria-hidden="true">
                    <span className={valide ? '' : 'est-vue'}>Votre geste : relire, puis valider.</span>
                    <span className={valide ? 'est-vue' : ''}>Le devis part à votre client, à votre nom.</span>
                  </span>
                  <span className="sr-only" aria-live="polite">{valide ? 'Le devis part à votre client, à votre nom.' : 'Votre geste : relire, puis valider.'}</span>
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
