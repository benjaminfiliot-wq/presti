'use client'

// « Une journée avec Presti » (033-009, passe 3), dans la section 3 « Comment ça marche » (jamais une 8e section) : sept moments d'une
// journée d'artisan, chacun avec son écran de Presti (lib/landing/demos.ts, JOURNEE).
// - Sans script, au téléphone, en mouvement réduit : un carrousel horizontal à accrochage (scroll-snap), qu'on fait glisser au doigt,
//   au clavier (flèches, la piste prend le focus) ou avec les boutons ; toutes les diapositives sont dans le DOM et se lisent.
// - Ordinateur (≥ 1024 px, pointeur fin, mouvement autorisé) : la scène s'ÉPINGLE au défilement (GSAP ScrollTrigger, déjà dans le
//   projet, importé à la demande) et les diapositives se succèdent en plein écran. Chaque passage a sa vraie transition, écrite dans
//   les données : « pixels » (un rideau de cases corail et ambre couvre l'écran en marches puis se retire), « profondeur » (la diapositive
//   recule et pivote, la suivante arrive de la droite) et « fondu » (fondu croisé avec un léger flou). Le défilement reste maître
//   (scrub) et s'arrête sur chaque moment (snap). Une barre de progression en sept segments ; les flèches ← → du clavier passent au
//   moment voisin tant que la scène est épinglée.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { JOURNEE, EXEMPLES, euros, type Moment } from '@/lib/landing/demos'
import { STUDIO, SIGNATURE } from '@/lib/landing/contenu'
import { PixelChantier } from './demos/Pixels'
import { Coche } from './demos/scene'

const COLS = 16, RANGS = 9
const TEINTES = ['#D97757', '#EE8B3C', '#B85C3C', '#E8946F', '#D97757', '#14110F']

/** L'écran de chaque moment : une vue réduite d'un vrai écran de Presti, données d'exemple. */
function EcranMoment({ m }: { m: Moment }) {
  const d = EXEMPLES.devis
  switch (m.ecran) {
    case 'point':
      return (
        <div className="jr-ecran jr-ecran--point jr-ecran--scene">
          <div className="jr-scene"><PixelChantier scene="aube" mode="boucle" /></div>
          <div className="jr-carte">
            <small>Point du jour</small>
            <ul>
              <li><b>2</b> demandes attendent votre réponse</li>
              <li><b>1</b> devis envoyé, sans réponse</li>
              <li><b>1</b> facture échue</li>
              <li><b>1</b> article sous son seuil, au camion</li>
            </ul>
          </div>
        </div>
      )
    case 'demande':
      return (
        <div className="jr-ecran jr-ecran--tel jr-ecran--scene">
          <div className="jr-scene"><PixelChantier scene="outils" mode="boucle" /></div>
          <div className="jr-tel">
            <p className="jr-tel-tete"><b>Atelier Garnier</b><small>Votre page de demande</small></p>
            <p className="dm-bulle dm-bulle--out dm-bulle--moi jr-a1">Bonjour, l’enduit de ma façade se décolle par plaques. Vous pourriez venir voir ?</p>
            <p className="jr-tel-envoi jr-a2">Envoyé · 9 h 12</p>
          </div>
        </div>
      )
    case 'reponse':
      return (
        <div className="jr-ecran jr-ecran--tel">
          <div className="jr-tel">
            <p className="jr-tel-tete"><b>Demande de façade</b><small>Réponse préparée</small></p>
            <p className="dm-bulle dm-bulle--in jr-a1 jr-revele">Bonjour, merci pour votre message. Pouvez-vous m’envoyer deux photos de la façade et sa surface approximative ? Je vous propose ensuite un passage.</p>
            <p className="jr-tel-actions jr-a2"><span className="dm-pastille">{STUDIO} · à valider</span><span className="dm-pastille dm-pastille--minute">{SIGNATURE} · peut partir seule</span></p>
          </div>
        </div>
      )
    case 'devis':
      return (
        <div className="jr-ecran jr-ecran--scene">
          <div className="jr-scene"><PixelChantier scene="mur" mode="boucle" /></div>
          <div className="jr-carte jr-carte--large">
            <small>Brouillon de devis</small><b className="jr-titre">{d.titre}</b>
            <ul className="jr-lignes">
              {d.lignes.map((l, i) => (
                <li key={l.designation} className={`jr-a${Math.min(i + 1, 3)}`}><span>{l.designation}</span><span className={`dm-source dm-source--${l.source}`}>{l.source === 'tarifs' ? 'Mes tarifs' : 'Estimé'}</span><b>{euros(l.montant)}</b></li>
              ))}
            </ul>
            <p className="jr-total jr-a4"><span>Total HT</span><b>{euros(d.lignes.reduce((s, l) => s + l.montant, 0))}</b></p>
          </div>
        </div>
      )
    case 'relance':
      return (
        <div className="jr-ecran">
          <div className="jr-carte jr-carte--large">
            <small>Devis D-2026-031 · envoyé lundi</small><b className="jr-titre">Relance J+2</b>
            <ul className="jr-relances">
              <li className="jr-a1"><span className="dm-offre">{STUDIO}</span><span>Prête</span><span className="dm-pastille">À valider</span></li>
              <li className="jr-a2"><span className="dm-offre">{SIGNATURE}</span><span>Pilote automatique</span><span className="dm-pastille dm-pastille--minute">Partira dans 7 min</span><span className="dm-lien">Annuler</span></li>
            </ul>
            <p className="jr-frise jr-a3"><span className="est-fait">Envoi</span><span className="est-actif">J+2</span><span>J+5</span><span>J+10</span></p>
          </div>
        </div>
      )
    case 'facture':
      return (
        <div className="jr-ecran">
          <div className="dm-pile jr-pile">
            <div className="dm-doc dm-doc--devis est-derriere"><small>Devis D-2026-031</small><b>{EXEMPLES.factures.client}</b><span className="dm-montant">{euros(EXEMPLES.factures.montant)}</span><span className="dm-tampon d-vu"><Coche />Accepté en ligne</span></div>
            <div className="dm-doc dm-doc--facture jr-a2"><small>Facture {EXEMPLES.factures.numero}</small><b>{EXEMPLES.factures.client}</b><span className="dm-montant">{euros(EXEMPLES.factures.montant)} HT</span><span className="dm-mentions">Mentions légales · PDF</span></div>
          </div>
        </div>
      )
    case 'paiement':
      return (
        <div className="jr-ecran jr-ecran--soir jr-ecran--scene">
          <div className="jr-scene"><PixelChantier scene="maison" mode="boucle" /></div>
          <div className="jr-carte">
            <small>Facture {EXEMPLES.factures.numero}</small><b className="jr-titre">{euros(EXEMPLES.factures.montant)} HT</b>
            <span className="dm-tampon dm-tampon--paye d-vu jr-a1"><Coche />Payée</span>
            <p className="jr-note jr-a2">Relances de cette facture : arrêtées.</p>
          </div>
        </div>
      )
  }
}

export default function Journee() {
  const [mode, setMode] = useState<'carrousel' | 'epingle'>('carrousel')
  const [pret, setPret] = useState(false)
  const [actif, setActif] = useState(0)
  const racine = useRef<HTMLDivElement>(null)
  const piste = useRef<HTMLDivElement>(null)
  const course = useRef<{ debut: number; fin: number } | null>(null)
  const n = JOURNEE.length

  // Carrousel : le moment courant suit la diapositive la plus visible dans la piste.
  useEffect(() => {
    setPret(true)
    if (mode !== 'carrousel' || !piste.current || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) setActif(Number((e.target as HTMLElement).dataset.i))
    }, { root: piste.current, threshold: 0.6 })
    piste.current.querySelectorAll('.lp3-jr-diapo').forEach((d) => io.observe(d))
    return () => io.disconnect()
  }, [mode])

  // Ordinateur : l'épinglage et les transitions.
  useEffect(() => {
    const ok = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!ok || !racine.current) return
    let annule = false
    let revert: (() => void) | null = null
    ;(async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      if (annule || !racine.current) return
      gsap.registerPlugin(ScrollTrigger)
      setMode('epingle')
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      if (annule || !racine.current) return
      const el = racine.current
      const ctx = gsap.context(() => {
        const diapos = gsap.utils.toArray<HTMLElement>('.lp3-jr-diapo', el)
        const cases = gsap.utils.toArray<HTMLElement>('.lp3-jr-case', el)
        const barre = el.querySelector<HTMLElement>('.lp3-jr-barre i')
        gsap.set(diapos, { autoAlpha: 0 })
        gsap.set(diapos[0], { autoAlpha: 1 })
        gsap.set(cases, { scale: 0 })
        const tl = gsap.timeline({ defaults: { ease: 'power2.inOut', immediateRender: false } })
        // Unités : chaque moment tient 1, chaque passage dure 1. Arrêts aux temps 0, 2, 4… (2 × i).
        for (let i = 1; i < n; i++) {
          const t = 2 * i - 1
          const de = diapos[i - 1], vers = diapos[i]
          const type = JOURNEE[i].entree
          if (type === 'pixels') {
            // Rideau en marches : les cases couvrent en diagonale, on échange les diapositives sous le rideau, elles se retirent.
            // Tout tient dans l'unité du passage [t, t + 1] : à l'arrêt suivant, le rideau est entièrement retiré.
            tl.fromTo(cases, { scale: 0 }, { scale: 1.04, duration: 0.28, ease: 'power1.in', stagger: { grid: [RANGS, COLS], from: 'start', amount: 0.18 } }, t)
              .set(de, { autoAlpha: 0 }, t + 0.47).set(vers, { autoAlpha: 1, xPercent: 0, scale: 1, rotateY: 0, filter: 'blur(0px)' }, t + 0.47)
              .fromTo(cases, { scale: 1.04 }, { scale: 0, duration: 0.28, ease: 'power1.out', stagger: { grid: [RANGS, COLS], from: 'end', amount: 0.18 } }, t + 0.5)
          } else if (type === 'profondeur') {
            tl.fromTo(de, { autoAlpha: 1, xPercent: 0, scale: 1, rotateY: 0 }, { autoAlpha: 0, xPercent: -14, scale: 0.84, rotateY: 14, duration: 0.8 }, t)
              .fromTo(vers, { autoAlpha: 0, xPercent: 34, scale: 0.9, rotateY: -16 }, { autoAlpha: 1, xPercent: 0, scale: 1, rotateY: 0, duration: 0.85 }, t + 0.15)
          } else {
            tl.fromTo(de, { autoAlpha: 1, scale: 1, filter: 'blur(0px)' }, { autoAlpha: 0, scale: 0.97, filter: 'blur(6px)', duration: 0.7 }, t)
              .fromTo(vers, { autoAlpha: 0, scale: 1.03, filter: 'blur(6px)' }, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.7 }, t + 0.25)
          }
        }
        tl.to({}, { duration: 0.001 }, 2 * (n - 1))
        if (barre) tl.fromTo(barre, { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 2 * (n - 1) }, 0)
        const arrets = Array.from({ length: n }, (_, i) => i / (n - 1))
        const st = ScrollTrigger.create({
          trigger: el.querySelector('.lp3-jr-scene'), start: 'top top', end: () => `+=${Math.round(window.innerHeight * 0.85 * (n - 1))}`,
          pin: true, scrub: 0.6, animation: tl, invalidateOnRefresh: true,
          snap: { snapTo: arrets, directional: false, inertia: false, duration: { min: 0.3, max: 0.8 }, delay: 0.1, ease: 'power2.inOut' },
          onUpdate: (s) => setActif(Math.min(n - 1, Math.floor(s.progress * (n - 1) + 0.04))), // le moment change à l'ARRIVÉE de la diapositive
          onRefresh: (s) => { course.current = { debut: s.start, fin: s.end }; el.dataset.course = `${Math.round(s.start)},${Math.round(s.end)}` },
        })
        course.current = { debut: st.start, fin: st.end }
        el.dataset.course = `${Math.round(st.start)},${Math.round(st.end)}` // lu par les outils de preuve
        // Les flèches ← → passent au moment voisin, seulement quand la scène est épinglée et que le focus n'est pas dans un champ.
        const touche = (e: KeyboardEvent) => {
          // Pas st.isActive : aux bornes exactes (premier et dernier arrêt, où le snap pose la page), il vaut faux.
          if ((e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') || scrollY < st.start - 4 || scrollY > st.end + 4) return
          const cible = e.target as HTMLElement | null
          if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return
          e.preventDefault()
          const i = Math.round(st.progress * (n - 1)) + (e.key === 'ArrowRight' ? 1 : -1)
          if (i < 0 || i >= n) return
          window.scrollTo({ top: Math.round(st.start + (st.end - st.start) * (i / (n - 1))), behavior: 'smooth' })
        }
        window.addEventListener('keydown', touche)
        return () => window.removeEventListener('keydown', touche)
      }, el)
      revert = () => ctx.revert()
      ScrollTrigger.refresh()
    })()
    return () => { annule = true; revert?.(); setMode('carrousel') }
  }, [n])

  const aller = useCallback((i: number) => {
    const k = Math.max(0, Math.min(n - 1, i))
    const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (mode === 'epingle' && course.current) {
      const c = course.current
      window.scrollTo({ top: Math.round(c.debut + (c.fin - c.debut) * (k / (n - 1))), behavior: reduit ? 'auto' : 'smooth' })
      return
    }
    const d = piste.current?.querySelectorAll<HTMLElement>('.lp3-jr-diapo')[k]
    if (d && piste.current) piste.current.scrollTo({ left: d.offsetLeft - piste.current.offsetLeft, behavior: reduit ? 'auto' : 'smooth' })
  }, [mode, n])

  return (
    <div className={`lp3-journee${mode === 'epingle' ? ' est-epingle' : ''}${pret ? ' est-pret' : ''}`} ref={racine}>
      <header className="lp3-jr-tete reveal">
        <p className="lp3-surtitre">Une journée avec Presti</p>
        <h3 className="lp3-h3">Du point du matin au règlement du soir.</h3>
        <p>Sept moments d’une journée d’artisan, et l’écran de Presti à chacun. Exemple.</p>
      </header>
      <div className="lp3-jr-scene">
        <div className="lp3-jr-piste" ref={piste} role="region" aria-roledescription="carrousel" aria-label="Une journée avec Presti, sept moments" tabIndex={mode === 'carrousel' ? 0 : -1}>
          {JOURNEE.map((m, i) => (
            <article key={m.heure} data-i={i} className={`lp3-jr-diapo${actif === i ? ' est-active' : ''}`} aria-roledescription="diapositive" aria-label={`${i + 1} sur ${n} : ${m.heureLongue}`}>
              <div className="lp3-jr-texte">
                <p className="lp3-jr-heure"><time>{m.heure}</time></p>
                <h4>{m.titre}</h4>
                <p>{m.texte}</p>
              </div>
              <div className="lp3-jr-visuel" aria-hidden="true">
                <span className="lp3-puce lp3-puce--flottante">Exemple</span>
                <EcranMoment m={m} />
              </div>
            </article>
          ))}
        </div>
        {/* Le rideau de pixels des passages « pixels » (ordinateur seulement ; décor). */}
        <div className="lp3-jr-rideau" aria-hidden="true">
          {Array.from({ length: COLS * RANGS }, (_, k) => <i key={k} className="lp3-jr-case" style={{ background: TEINTES[(k * 7 + Math.floor(k / COLS) * 3) % TEINTES.length] } as CSSProperties} />)}
        </div>
        <div className="lp3-jr-commandes">
          <div className="lp3-jr-barre" aria-hidden="true">
            <i />
            {JOURNEE.map((m, i) => <span key={m.heure} className={i <= actif ? 'est-passe' : ''} />)}
          </div>
          <p className="lp3-jr-compteur" aria-live="polite"><span>{JOURNEE[actif].heure}</span> · {actif + 1} / {n}</p>
          {pret ? (
            <div className="lp3-jr-fleches">
              <button type="button" className="lp3-jr-fleche" onClick={() => aller(actif - 1)} disabled={actif === 0} aria-label="Moment précédent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
              </button>
              <button type="button" className="lp3-jr-fleche" onClick={() => aller(actif + 1)} disabled={actif === n - 1} aria-label="Moment suivant">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
