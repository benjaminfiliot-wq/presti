'use client'

import { useEffect, useRef } from 'react'

/** Fenêtre "produit" du hero : le chat se joue tout seul (message → frappe → réponse), en boucle. */
export default function HeroApp() {
  const racine = useRef<HTMLDivElement>(null)
  const inB = useRef<HTMLDivElement>(null)
  const typ = useRef<HTMLDivElement>(null)
  const outB = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const els = [inB, typ, outB]
    const show = (r: typeof inB, on: boolean) => r.current?.classList.toggle('show', on)
    // La scene est desormais VISIBLE par defaut (globals.css) : rendue par le serveur, lisible avant
    // qu'un script tourne. `lp-anime` est ce qui donne la main a l'animation — tant qu'il n'est pas
    // pose, rien ne clignote et rien n'est cache. Ne rien faire est donc le bon repli quand le
    // visiteur demande moins de mouvement : il garde la conversation entiere sous les yeux.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timers: ReturnType<typeof setTimeout>[] = []
    const scene = () => {
      els.forEach((r) => r.current?.classList.remove('show'))
      timers.push(setTimeout(() => show(inB, true), 450))
      timers.push(setTimeout(() => show(typ, true), 1500))
      timers.push(setTimeout(() => { show(typ, false); show(outB, true) }, 3100))
    }
    let boucle = 0
    const demarrer = () => {
      if (boucle) return
      racine.current?.classList.add('lp-anime') // a partir d'ici, c'est l'animation qui decide
      scene(); boucle = window.setInterval(scene, 7200)
    }
    const arreter = () => {
      if (boucle) { clearInterval(boucle); boucle = 0 }
      timers.forEach(clearTimeout); timers = []
      // On rend la scene a son etat lisible : sortir du viewport ne doit pas laisser un cadre vide
      // derriere soi, et revenir dessus ne doit pas montrer un trou le temps que la scene reparte.
      racine.current?.classList.remove('lp-anime')
      els.forEach((r) => r.current?.classList.remove('show'))
    }

    // La boucle continuait de tourner quand le hero était à cinq écrans du visiteur (audit final G) :
    // des timers et des transitions CSS payés pour une scène que personne ne regarde. On ne joue
    // que dans le viewport ; en revenant, la scène repart proprement du début.
    // Et on ne demarre pas pendant que la page charge. L'animation n'a aucune urgence : la scene est
    // deja lisible. La faire tourner pendant le chargement prend du temps de calcul sur un telephone
    // au moment ou il en manque, et empeche la page de se stabiliser visuellement.
    let io: IntersectionObserver | null = null
    let annuleAttente: (() => void) | undefined
    const brancher = () => {
      if ('IntersectionObserver' in window && racine.current) {
        io = new IntersectionObserver((e) => { if (e[0]?.isIntersecting) demarrer(); else arreter() }, { threshold: 0.15 })
        io.observe(racine.current)
      } else demarrer()
    }
    const quandLaPageRespire = () => {
      const ric = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      if (ric) { const id = ric(brancher, { timeout: 2500 }); annuleAttente = () => (window as unknown as { cancelIdleCallback?: (i: number) => void }).cancelIdleCallback?.(id) }
      else { const t = setTimeout(brancher, 1200); annuleAttente = () => clearTimeout(t) }
    }
    if (document.readyState === 'complete') quandLaPageRespire()
    else {
      window.addEventListener('load', quandLaPageRespire, { once: true })
      annuleAttente = () => window.removeEventListener('load', quandLaPageRespire)
    }

    return () => { annuleAttente?.(); io?.disconnect(); arreter() }
  }, [])

  return (
    <div className="lp-win" ref={racine}>
      <div className="lp-winbar"><span className="d" /><span className="d" /><span className="d" /><span className="u">presti · votre poste</span></div>
      <div className="lp-wingrid">
        <div className="lp-pane">
          <div className="lp-lbl">Demande entrante</div>
          <div className="lp-chat">
            <div className="lp-bub in" ref={inB}>Bonjour, je souhaite remplacer mon chauffe-eau. Pouvez-vous me préparer un devis ?<span className="st">Marie · 14:02</span></div>
            <div className="lp-typing" ref={typ}><i /><i /><i /></div>
            <div className="lp-bub out" ref={outB}>Bonjour Marie, merci pour votre demande. Pour préparer votre devis, pouvez-vous préciser la capacité souhaitée et joindre une photo de l&apos;installation actuelle ?<span className="st">Presti · réponse préparée, à valider par l&apos;artisan</span></div>
          </div>
        </div>
        <div className="lp-pane hide-sm">
          <div className="lp-lbl">Devis chiffré</div>
          <div className="lp-drow"><span>Pose chauffe-eau 200 L</span><span className="p">620,00</span></div>
          <div className="lp-drow"><span>Groupe de sécurité</span><span className="p">84,00</span></div>
          <div className="lp-drow"><span>Main-d&apos;œuvre (2 h)</span><span className="p">90,00</span></div>
          <div className="lp-dtot"><span>Total TTC</span><span className="p">873,40 €</span></div>
          <span className="lp-dbadge"><svg viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>PDF conforme · DEV-2026-0042</span>
        </div>
      </div>
    </div>
  )
}
