'use client'

import { useEffect, useRef, useState } from 'react'

export default function Counter({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(false)

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setN(to); return }
    const el = ref.current
    if (!el) { setN(to); return }
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !done.current) {
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
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [to])

  return <span ref={ref}>{prefix}{n}{suffix}</span>
}
