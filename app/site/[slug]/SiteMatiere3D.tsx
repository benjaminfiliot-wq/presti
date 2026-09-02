'use client'

import { useEffect, useRef } from 'react'

// three.js chargé EN DIFFÉRÉ depuis le CDN (0 ajout au bundle de la route → budget M4/LCP tenus).
// Autorisé dans la CSP des pages /site et /l uniquement (script-src cdnjs).
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
let threePromise: Promise<unknown> | null = null
function loadThree(): Promise<unknown> {
  const w = window as unknown as { THREE?: unknown }
  if (w.THREE) return Promise.resolve(w.THREE)
  if (!threePromise) {
    threePromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = THREE_URL; s.async = true; s.crossOrigin = 'anonymous'
      s.onload = () => resolve((window as unknown as { THREE: unknown }).THREE)
      s.onerror = () => reject(new Error('three'))
      document.head.appendChild(s)
    })
  }
  return threePromise
}

// Hero « matière » (niveau Signature) : un bloc travaillé, lentement tournant, éclairé chaud.
// Repli silencieux (l'image hero reste dessous) sur mobile, reduced-motion, connexion lente, ou échec.
export default function SiteMatiere3D({ accent }: { accent: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (conn && (conn.saveData || /(slow-2g|2g|3g)/.test(conn.effectiveType || ''))) return
    if (window.innerWidth < 760) return

    let raf = 0, disposed = false
    let cleanupResize: (() => void) | null = null
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let renderer: any = null

    loadThree().then((THREE: any) => {
      if (disposed || !THREE || !canvas.parentElement) return
      const parent = canvas.parentElement as HTMLElement
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      const scene = new THREE.Scene()
      const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100); cam.position.set(0, 0.3, 6.6)
      scene.add(new THREE.AmbientLight(0xfff2e0, 0.5))
      const key = new THREE.DirectionalLight(0xfff1dd, 1.5); key.position.set(4, 6, 5); scene.add(key)
      const accHex = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#D97757'
      const rim = new THREE.DirectionalLight(new THREE.Color(accHex).getHex(), 0.7); rim.position.set(-5, 2, -3); scene.add(rim)
      const fill = new THREE.DirectionalLight(0xffffff, 0.3); fill.position.set(-2, -3, 4); scene.add(fill)

      const geo = new THREE.BoxGeometry(2.1, 2.1, 2.1)
      const mat = new THREE.MeshStandardMaterial({ color: 0x9c6a35, roughness: 0.5, metalness: 0.05 })
      const mesh = new THREE.Mesh(geo, mat); scene.add(mesh)
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 })))

      const size = () => {
        const b = parent.getBoundingClientRect()
        if (b.width < 1 || b.height < 1) return
        renderer.setSize(b.width, b.height, false); cam.aspect = b.width / b.height; cam.updateProjectionMatrix()
      }
      size()
      const onResize = () => size(); window.addEventListener('resize', onResize)
      cleanupResize = () => window.removeEventListener('resize', onResize)

      let ry = 0.7
      const loop = () => { raf = requestAnimationFrame(loop); ry += 0.0032; mesh.rotation.y = ry; mesh.rotation.x = -0.12; renderer.render(scene, cam) }
      loop()
    }).catch(() => { /* repli : image hero conservée */ })

    return () => {
      disposed = true; cancelAnimationFrame(raf)
      try { cleanupResize?.(); renderer?.dispose?.() } catch { /* ignore */ }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, [accent])

  return <canvas ref={ref} className="site-matiere" aria-hidden="true" />
}
