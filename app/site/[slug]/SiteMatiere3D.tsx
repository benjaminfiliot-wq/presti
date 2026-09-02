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
      const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 100); cam.position.set(0, 0.2, 7.2)
      scene.add(new THREE.AmbientLight(0xfff2e0, 0.4))
      const key = new THREE.DirectionalLight(0xfff3e2, 1.7); key.position.set(5, 7, 6); scene.add(key)
      const accHex = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#D97757'
      const rim = new THREE.DirectionalLight(new THREE.Color(accHex).getHex(), 0.9); rim.position.set(-6, 1, -4); scene.add(rim)
      const fill = new THREE.DirectionalLight(0x9fb6cc, 0.22); fill.position.set(-3, -4, 3); scene.add(fill)

      // Une pièce de bois DEBOUT (pas un dé) + léger chanfrein → lecture « matière travaillée ».
      const geo = new THREE.BoxGeometry(1.5, 2.7, 1.5, 1, 1, 1)
      const mat = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.62, metalness: 0.04 })
      const group = new THREE.Group()
      const mesh = new THREE.Mesh(geo, mat); group.add(mesh)
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x2a1a0c, transparent: true, opacity: 0.18 })))
      // Décalé à droite pour laisser respirer le titre ; incliné pour montrer 3 faces.
      group.position.set(2.15, -0.15, 0)
      group.rotation.set(-0.16, 0.7, 0.06)
      group.scale.setScalar(0.92)
      scene.add(group)

      const size = () => {
        const b = parent.getBoundingClientRect()
        if (b.width < 1 || b.height < 1) return
        renderer.setSize(b.width, b.height, false); cam.aspect = b.width / b.height; cam.updateProjectionMatrix()
        // Sur desktop étroit, on rapproche le bloc du bord pour ne pas mordre le titre.
        group.position.x = b.width < 1040 ? 1.7 : 2.15
      }
      size()
      const onResize = () => size(); window.addEventListener('resize', onResize)
      cleanupResize = () => window.removeEventListener('resize', onResize)

      let ry = 0.7
      const loop = () => { raf = requestAnimationFrame(loop); ry += 0.0026; group.rotation.y = ry; renderer.render(scene, cam) }
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
