'use client'

import { useEffect, useRef } from 'react'

type Hub = { label: string; color: string; count: number }

export default function HudGraph({ demandes, chiffrages, clients, revenus }: { demandes: number; chiffrages: number; clients: number; revenus: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    const hubs: Hub[] = [
      { label: 'DEMANDES', color: '#F5B301', count: demandes },
      { label: 'CHIFFRAGES', color: '#6C8CFF', count: chiffrages },
      { label: 'REVENUS', color: '#38CD8C', count: Math.min(12, Math.round(revenus / 1000) || 1) },
      { label: 'CLIENTS', color: '#3EE0F0', count: clients },
    ]
    // particules d'ambiance (décor, non-données)
    const parts = Array.from({ length: 46 }, (_, i) => ({ a: (i / 46) * Math.PI * 2, r: 60 + (i % 7) * 34, s: 0.08 + (i % 5) * 0.02, sz: 0.6 + (i % 3) * 0.5 }))

    let W = 0, H = 0, cx = 0, cy = 0, dpr = 1
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = rect.width; H = rect.height; cx = W / 2; cy = H / 2
      canvas.width = W * dpr; canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(canvas)

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H)
      const R1 = Math.min(W, H) * 0.28
      const rot = t * 0.06

      // particules d'ambiance
      for (const p of parts) {
        const a = p.a + t * p.s * 0.15
        const x = cx + Math.cos(a) * p.r, y = cy + Math.sin(a) * p.r * 0.7
        ctx.beginPath(); ctx.arc(x, y, p.sz, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(120,180,255,.35)'; ctx.fill()
      }

      hubs.forEach((hub, hi) => {
        const base = rot + (hi / hubs.length) * Math.PI * 2
        const hx = cx + Math.cos(base) * R1, hy = cy + Math.sin(base) * R1 * 0.82
        const leaves = Math.min(9, Math.max(1, hub.count))

        // arête cœur → hub + impulsion mobile
        ctx.strokeStyle = hub.color + '55'; ctx.lineWidth = 1.4
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke()
        const ph = (t * 0.5 + hi * 0.4) % 1
        const px = cx + (hx - cx) * ph, py = cy + (hy - cy) * ph
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fillStyle = hub.color; ctx.shadowBlur = 10; ctx.shadowColor = hub.color; ctx.fill(); ctx.shadowBlur = 0

        // feuilles autour du hub
        for (let i = 0; i < leaves; i++) {
          const la = base + (i - leaves / 2) * 0.42 + Math.sin(t * 0.8 + i + hi) * 0.06
          const lr = R1 * (0.55 + (i % 3) * 0.16)
          const lx = hx + Math.cos(la) * lr, ly = hy + Math.sin(la) * lr * 0.9
          ctx.strokeStyle = hub.color + '33'; ctx.lineWidth = 0.8
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(lx, ly); ctx.stroke()
          const tw = 1.1 + Math.sin(t * 2 + i * 1.7) * 0.5
          ctx.beginPath(); ctx.arc(lx, ly, Math.max(0.5, tw), 0, Math.PI * 2)
          ctx.fillStyle = hub.color; ctx.shadowBlur = 8; ctx.shadowColor = hub.color; ctx.fill(); ctx.shadowBlur = 0
        }

        // nœud hub
        ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI * 2)
        ctx.fillStyle = hub.color; ctx.shadowBlur = 16; ctx.shadowColor = hub.color; ctx.fill(); ctx.shadowBlur = 0
        ctx.font = '700 9px "JetBrains Mono", monospace'; ctx.fillStyle = hub.color; ctx.textAlign = 'center'
        ctx.fillText(hub.label, hx, hy - 12)
        ctx.fillStyle = '#eafcff'; ctx.font = '800 12px "Bricolage Grotesque", sans-serif'
        ctx.fillText(String(hub.count), hx, hy + 20)
      })

      // cœur pulsant
      const pulse = 1 + Math.sin(t * 1.6) * 0.12
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 46 * pulse)
      g.addColorStop(0, 'rgba(230,250,255,.95)'); g.addColorStop(.3, 'rgba(62,224,240,.7)'); g.addColorStop(1, 'rgba(62,224,240,0)')
      ctx.beginPath(); ctx.arc(cx, cy, 46 * pulse, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill()
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fillStyle = '#eafcff'; ctx.shadowBlur = 24; ctx.shadowColor = '#3EE0F0'; ctx.fill(); ctx.shadowBlur = 0
    }

    let raf = 0, start = 0
    const loop = (ms: number) => { if (!start) start = ms; draw((ms - start) / 1000); raf = requestAnimationFrame(loop) }
    draw(0) // premier rendu immédiat (jamais vide)
    if (!reduce) raf = requestAnimationFrame(loop)

    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [demandes, chiffrages, clients, revenus])

  return <canvas ref={canvasRef} className="hud-canvas" aria-hidden="true" />
}
