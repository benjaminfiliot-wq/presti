'use client'

import { useEffect, useRef } from 'react'

export default function HeroDemo() {
  const m1 = useRef<HTMLDivElement>(null)
  const typ = useRef<HTMLDivElement>(null)
  const m2 = useRef<HTMLDivElement>(null)
  const toast = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = [m1, typ, m2, toast]
    const timers: ReturnType<typeof setTimeout>[] = []
    const show = (r: typeof m1, on: boolean) => r.current?.classList.toggle('show', on)

    if (reduce) {
      ;[m1, m2, toast].forEach((r) => show(r, true))
      return
    }
    function scene() {
      els.forEach((r) => r.current?.classList.remove('show'))
      timers.push(setTimeout(() => show(m1, true), 500))
      timers.push(setTimeout(() => show(typ, true), 1500))
      timers.push(setTimeout(() => { show(typ, false); show(m2, true) }, 3100))
      timers.push(setTimeout(() => show(toast, true), 4700))
    }
    scene()
    const loop = setInterval(scene, 8200)
    return () => { clearInterval(loop); timers.forEach(clearTimeout) }
  }, [])

  return (
    <div className="pdemo">
      <div className="pdemo-top">
        <div className="pdemo-pa">ML</div>
        <div><div className="pn">Marie Lefèvre</div><div className="ps">Presti répond en direct</div></div>
      </div>
      <div className="pdemo-chat">
        <div className="pdemo-msg in" ref={m1}>Bonjour, fuite sous mon évier depuis ce matin 😣 vous pouvez passer cette semaine ?<span className="stamp">Marie · 14:02</span></div>
        <div className="pdemo-typing" ref={typ}><i /><i /><i /></div>
        <div className="pdemo-msg out" ref={m2}>Bonjour Marie, merci pour votre message ! Je comprends l&apos;urgence. Je vous rappelle dans la journée pour convenir d&apos;un passage — en attendant, coupez l&apos;arrivée d&apos;eau sous l&apos;évier.<span className="stamp">Presti · répondu en 41 s</span></div>
        <div className="pdemo-toast" ref={toast}>
          <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg></span>
          <div><b>Devis DEV-2026-0042 envoyé</b><div className="sub">Chauffe-eau 200 L · PDF conforme</div></div>
          <span className="amt">704,00 €</span>
        </div>
      </div>
    </div>
  )
}
