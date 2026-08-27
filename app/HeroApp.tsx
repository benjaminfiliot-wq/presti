'use client'

import { useEffect, useRef } from 'react'

/** Fenêtre "produit" du hero : le chat se joue tout seul (message → frappe → réponse), en boucle. */
export default function HeroApp() {
  const inB = useRef<HTMLDivElement>(null)
  const typ = useRef<HTMLDivElement>(null)
  const outB = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const els = [inB, typ, outB]
    const show = (r: typeof inB, on: boolean) => r.current?.classList.toggle('show', on)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      show(inB, true); show(outB, true); return
    }
    const timers: ReturnType<typeof setTimeout>[] = []
    const scene = () => {
      els.forEach((r) => r.current?.classList.remove('show'))
      timers.push(setTimeout(() => show(inB, true), 450))
      timers.push(setTimeout(() => show(typ, true), 1500))
      timers.push(setTimeout(() => { show(typ, false); show(outB, true) }, 3100))
    }
    scene()
    const loop = setInterval(scene, 7200)
    return () => { clearInterval(loop); timers.forEach(clearTimeout) }
  }, [])

  return (
    <div className="lp-win">
      <div className="lp-winbar"><span className="d" /><span className="d" /><span className="d" /><span className="u">presti · réponse en direct</span></div>
      <div className="lp-wingrid">
        <div className="lp-pane">
          <div className="lp-lbl">Demande entrante</div>
          <div className="lp-chat">
            <div className="lp-bub in" ref={inB}>Bonjour, fuite sous mon évier depuis ce matin, vous pouvez passer cette semaine ?<span className="st">Marie · 14:02</span></div>
            <div className="lp-typing" ref={typ}><i /><i /><i /></div>
            <div className="lp-bub out" ref={outB}>Bonjour Marie, merci de votre message ! Je comprends l&apos;urgence. Je vous rappelle dans la journée pour convenir d&apos;un passage — en attendant, coupez l&apos;arrivée d&apos;eau sous l&apos;évier.<span className="st">Presti · répondu en 41 s</span></div>
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
