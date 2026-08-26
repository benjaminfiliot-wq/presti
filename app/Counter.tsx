'use client'

import { useEffect, useRef, useState } from 'react'

export default function Counter({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(false)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); return }
    const animate = () => {
      if (done.current) return
      done.current = true
      const dur = 1400
      let start: number | null = null
      const step = (ts: number) => {
        if (start === null) start = ts
        const p = Math.min((ts - start) / dur, 1)
        setN(Math.round(to * (0.15 + 0.85 * p * (2 - p))))
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }
    let io: IntersectionObserver | null = null
    const el = ref.current
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) animate() }, { threshold: 0.4 })
      io.observe(el)
    }
    // filet de sécurité : la valeur finale s'affiche toujours
    const safety = setTimeout(() => { if (!done.current) { done.current = true; setN(to) } }, 2400)
    return () => { io?.disconnect(); clearTimeout(safety) }
  }, [to])

  return <span ref={ref}>{prefix}{n}{suffix}</span>
}
