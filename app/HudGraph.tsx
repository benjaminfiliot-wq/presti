'use client'

import { useEffect, useRef } from 'react'

// Explosion réseau lumineuse (fidèle à la vidéo) : filaments colorés qui rayonnent du centre.
export default function HudGraph({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    const PAL = ['#3EE0F0', '#6C8CFF', '#8A6BFF', '#F0567A', '#38CD8C', '#F5B301']
    const N = Math.round(98 * Math.min(1.6, Math.max(0.8, density)))
    // filaments déterministes, groupés par couleur en secteurs (clusters, comme la vidéo)
    const fil = Array.from({ length: N }, (_, i) => {
      const sector = Math.floor(i / (N / PAL.length)) % PAL.length
      const a = (i / N) * Math.PI * 2 + (i % 5) * 0.09
      const len = 0.36 + ((i * 37) % 62) / 100 * 0.62
      const segs = 4 + (i % 3)
      const jit = ((i * 53) % 100) / 100 - 0.5
      return { a, len, segs, jit, color: PAL[sector], speed: 0.4 + (i % 4) * 0.18, wob: 0.05 + (i % 5) * 0.015 }
    })
    const labels = ['REVENUS', 'DEVIS', 'DEMANDES', 'RELANCES', 'CLIENTS', 'LEADS', 'PAIEMENTS', 'RÉSEAU', 'PIPELINE', 'CONVERSION', 'SIGNATURES', 'ACOMPTES']

    let W = 0, H = 0, cx = 0, cy = 0, dpr = 1, R = 0
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = rect.width; H = rect.height; cx = W / 2; cy = H / 2; R = Math.min(W, H) / 2
      canvas.width = W * dpr; canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(canvas)

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H)
      const rot = t * 0.04
      fil.forEach((f, i) => {
        const a = f.a + rot
        // polyligne jaggy du centre vers l'extérieur
        ctx.beginPath(); ctx.moveTo(cx, cy)
        let ex = cx, ey = cy
        for (let s = 1; s <= f.segs; s++) {
          const p = s / f.segs
          const rr = R * f.len * p
          const wob = Math.sin(t * f.speed + i + s) * f.wob + f.jit * 0.06 * p
          const aa = a + wob
          ex = cx + Math.cos(aa) * rr
          ey = cy + Math.sin(aa) * rr
          ctx.lineTo(ex, ey)
        }
        ctx.strokeStyle = f.color + '66'; ctx.lineWidth = 1
        ctx.shadowBlur = 6; ctx.shadowColor = f.color
        ctx.stroke(); ctx.shadowBlur = 0
        // particule qui voyage
        const ph = (t * f.speed * 0.5 + i * 0.13) % 1
        const px = cx + Math.cos(a) * R * f.len * ph
        const py = cy + Math.sin(a) * R * f.len * ph
        ctx.beginPath(); ctx.arc(px, py, 1.3, 0, Math.PI * 2)
        ctx.fillStyle = f.color; ctx.shadowBlur = 8; ctx.shadowColor = f.color; ctx.fill(); ctx.shadowBlur = 0
        // nœud d'extrémité
        const tw = 1 + Math.sin(t * 1.5 + i) * 0.5
        ctx.beginPath(); ctx.arc(ex, ey, Math.max(0.6, tw), 0, Math.PI * 2)
        ctx.fillStyle = f.color; ctx.shadowBlur = 7; ctx.shadowColor = f.color; ctx.fill(); ctx.shadowBlur = 0
        // labels dispersés sur les nœuds (comme la vidéo)
        if (i % 8 === 0) {
          ctx.font = '700 8px "JetBrains Mono", monospace'
          ctx.fillStyle = f.color + 'dd'; ctx.textAlign = 'center'
          ctx.fillText(labels[(i / 8) % labels.length], ex, ey - 6)
        }
      })
      // burst central
      const pulse = 1 + Math.sin(t * 1.8) * 0.14
      const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 40 * pulse)
      g.addColorStop(0, 'rgba(240,252,255,.95)'); g.addColorStop(.35, 'rgba(62,224,240,.6)'); g.addColorStop(1, 'rgba(62,224,240,0)')
      ctx.beginPath(); ctx.arc(cx, cy, 40 * pulse, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill()
    }

    let raf = 0, start = 0
    const loop = (ms: number) => { if (!start) start = ms; draw((ms - start) / 1000); raf = requestAnimationFrame(loop) }
    draw(0)
    if (!reduce) raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [density])

  return <canvas ref={ref} className="jv-explosion" aria-hidden="true" />
}
