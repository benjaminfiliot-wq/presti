'use client'

// La MAQUETTE du chantier (lot 7) — le BÂTIMENT du chantier en coupe isométrique, ses pièces meublées et colorées selon leur état —
// chargée À LA DEMANDE (next/dynamic depuis app/crm/PlanChantier.tsx) : three et React Three Fiber ne partent que dans ce morceau.
// Les volumes viennent de lib/crm/planScene.ts (pur) : une forme = une couche instanciée, au plus cinq appels de dessin + le sol.
// Ombres figées (la maquette ne bouge pas). Jamais montée sur téléphone ni avec « moins d'animations » : le schéma 2D suffit.
// Clic sur une pièce (son sol, ses murs, ses meubles) → ses tâches ; survol → son nom et son pourcentage. Les étiquettes des pièces
// sont des boutons DOM PLACÉS sans chevauchement (lib/crm/etiquettes.ts), replacés seulement quand la caméra bouge.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { COULEURS, FORMES, type Forme, type Inst } from '@/lib/crm/atelier'
import { LIBELLES_ETAT_ZONE, type SceneChantier as Donnees } from '@/lib/crm/planScene'
import { placerEtiquettes, type EntreeEtiquette } from '@/lib/crm/etiquettes'
import { bornerCible } from '@/lib/crm/carte'

function geometrie(f: Forme): THREE.BufferGeometry {
  switch (f) {
    case 'box': return new THREE.BoxGeometry(1, 1, 1)
    case 'cyl': return new THREE.CylinderGeometry(0.5, 0.5, 1, 16)
    case 'sph': return new THREE.SphereGeometry(0.5, 16, 10)
    case 'toit': return new THREE.ConeGeometry(0.5, 1, 4)
    case 'cone': return new THREE.ConeGeometry(0.5, 1, 14)
  }
}

function Couche({ forme, insts, choisie, survol, onPick, onSurvol }: { forme: Forme; insts: Inst[]; choisie: number | null; survol: number | null; onPick: (o: number) => void; onSurvol: (o: number | null) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => geometrie(forme), [forme])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color(), fond = new THREE.Color(COULEURS.sol), lueur = new THREE.Color(COULEURS.corail)
    insts.forEach((it, i) => {
      mesh.setMatrixAt(i, m.compose(new THREE.Vector3(...it.p), q.setFromEuler(e.set(it.r[0], it.r[1], it.r[2])), new THREE.Vector3(...it.s)))
      // La pièce choisie ressort ; les autres s'estompent un peu. La pièce survolée se réchauffe légèrement.
      c.set(it.c)
      if (choisie !== null && it.o !== choisie) c.lerp(fond, 0.42)
      else if (survol !== null && it.o === survol && it.o >= 0) c.lerp(lueur, 0.12)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [insts, choisie, survol])
  useEffect(() => () => geo.dispose(), [geo])
  if (!insts.length) return null
  const objet = (e: ThreeEvent<PointerEvent | MouseEvent>) => { for (const x of e.intersections) { const id = x.instanceId; if (x.object === ref.current && id !== undefined && insts[id] && insts[id].o >= 0) return insts[id].o } return null }
  return (
    <instancedMesh ref={ref} args={[geo, undefined, insts.length]} castShadow receiveShadow
      onClick={(e) => { if (e.delta > 6) return; const o = objet(e); if (o !== null) { e.stopPropagation(); onPick(o) } }}
      onPointerMove={(e) => { const o = objet(e); if (o !== null) { e.stopPropagation(); onSurvol(o) } }}
      onPointerOut={() => onSurvol(null)}>
      <meshStandardMaterial roughness={0.86} metalness={0} />
    </instancedMesh>
  )
}

function OmbresFigees({ version }: { version: unknown }) {
  const { gl } = useThree()
  const images = useRef(0)
  useEffect(() => { gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; images.current = 0 }, [gl, version])
  useFrame(() => { images.current++; if (images.current <= 3) gl.shadowMap.needsUpdate = true })
  return null
}

/** Le cadrage automatique : tout le bâtiment dans la toile, vu de trois quarts. */
function Cadrage({ bornes }: { bornes: Donnees['bornes'] }) {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    const lx = bornes.max[0] - bornes.min[0], lz = bornes.max[2] - bornes.min[2], ly = bornes.max[1]
    const zoom = Math.max(8, Math.min(size.width / ((lx + lz) * 0.74), size.height / ((lx + lz) * 0.42 + ly * 0.85)))
    camera.position.set(28, 30, 34)
    ;(camera as THREE.OrthographicCamera).zoom = zoom
    camera.lookAt(0, ly * 0.28, 0)
    camera.updateProjectionMatrix()
  }, [bornes, size.width, size.height, camera])
  return null
}

type Cible = { el: HTMLElement | null; p: THREE.Vector3; cle: string; priorite: number }
function Projecteur({ cibles }: { cibles: React.RefObject<Cible[]> }) {
  const { camera, size } = useThree()
  const avant = useRef('')
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const cle = [...camera.matrixWorld.elements, camera.projectionMatrix.elements[0], size.width, size.height, cibles.current?.length ?? 0].map((x) => x.toFixed(4)).join()
    if (cle === avant.current) return
    avant.current = cle
    const liste = (cibles.current ?? []).filter((c) => c.el)
    const entrees: EntreeEtiquette[] = liste.map((c) => {
      v.copy(c.p).project(camera)
      const x = (v.x * 0.5 + 0.5) * size.width, y = (-v.y * 0.5 + 0.5) * size.height
      return { cle: c.cle, priorite: c.priorite, epingle: { x: x - 3, y: y - 3, l: 6, h: 6 }, taille: { l: c.el!.offsetWidth || 90, h: c.el!.offsetHeight || 24 } }
    })
    const places = placerEtiquettes(entrees, { l: size.width, h: size.height })
    liste.forEach((c, k) => {
      const p = places[k]
      c.el!.dataset.mode = p.mode
      c.el!.style.transform = p.mode === 'cachee' ? 'translate3d(-9999px, -9999px, 0)' : `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`
    })
  })
  return null
}

export default function SceneChantier({ scene, choisie, onChoisir }: { scene: Donnees; choisie: string | null; onChoisir: (nom: string | null) => void }) {
  const indexChoisi = choisie === null ? null : scene.cibles.findIndex((e) => e.nom === choisie)
  const [survol, setSurvol] = useState<number | null>(null)
  const cibles = useRef<Cible[]>([])
  // Les étiquettes : les pièces du chantier d'abord (nom + %), puis les autres (nom seul, plus discret).
  cibles.current = scene.cibles.map((e, k) => ({ el: cibles.current[k]?.el ?? null, p: new THREE.Vector3(...e.centre), cle: e.cle, priorite: (indexChoisi === k ? 100 : 0) + (e.pct !== null ? 50 : 10) }))
  const choisir = (o: number) => { const c = scene.cibles[o]; if (c) onChoisir(choisie === c.nom ? null : c.nom) }
  const s = survol !== null ? scene.cibles[survol] : null
  return (
    <div className="crm-maquette" data-crm-maquette onPointerLeave={() => setSurvol(null)}>
      <Canvas orthographic flat shadows="percentage" dpr={[1, 1.5]} gl={{ antialias: true }} camera={{ position: [28, 30, 34], zoom: 30, near: -200, far: 400 }} aria-hidden="true" style={{ background: COULEURS.sol }}>
        <color attach="background" args={[COULEURS.sol]} />
        <hemisphereLight args={['#FFFDF8', '#DCD0BE', 1.45]} />
        <directionalLight castShadow position={[-14, 30, 18]} intensity={1.35} color="#FFF3E2" shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-radius={3}
          shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={(e) => { if (e.delta <= 6) onChoisir(null) }}>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color={COULEURS.sol} roughness={1} />
        </mesh>
        {FORMES.map((f) => <Couche key={`${f}-${scene.instances[f].length}`} forme={f} insts={scene.instances[f]} choisie={indexChoisi !== null && indexChoisi >= 0 ? indexChoisi : null} survol={survol} onPick={choisir} onSurvol={setSurvol} />)}
        <Cadrage bornes={scene.bornes} />
        {/* Caméra orbitale BORNÉE : jamais sous le sol ni à plat, zoom limité, pas de glissement hors du chantier. */}
        <OrbitControls makeDefault enableDamping dampingFactor={0.12} minPolarAngle={0.3} maxPolarAngle={1.12} minZoom={8} maxZoom={140} target={[0, 0.6, 0]}
          // Lot 8 : comme la carte — glisser déplace, clic droit ou deux doigts tournent ; la cible reste sur le bâtiment.
          mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }} touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
          onChange={(e) => { const c = e?.target as unknown as { target: THREE.Vector3; object: THREE.Camera } | undefined; if (!c) return; const [x, z] = bornerCible([c.target.x, c.target.z], { min: [scene.bornes.min[0], scene.bornes.min[2]], max: [scene.bornes.max[0], scene.bornes.max[2]] }, 1); const dx = x - c.target.x, dz = z - c.target.z; if (dx || dz) { c.target.x += dx; c.target.z += dz; c.object.position.x += dx; c.object.position.z += dz } }} />
        <OmbresFigees version={scene} />
        <Projecteur cibles={cibles} />
      </Canvas>
      <div className="crm-maquette-etiquettes">
        {scene.cibles.map((e, k) => (
          <button key={e.cle} type="button" ref={(el) => { if (cibles.current[k]) cibles.current[k].el = el }} className={`e-${e.etat}${choisie === e.nom ? ' choisie' : ''}${e.pct === null ? ' neutre' : ''}`}
            aria-pressed={choisie === e.nom} onClick={() => onChoisir(choisie === e.nom ? null : e.nom)} data-crm-piece={e.nom}>
            <b>{e.nom}</b>{e.pct !== null && <span className="tnum"> {e.pct} %</span>}
          </button>
        ))}
      </div>
      {s && <p className="crm-maquette-bulle" role="status" data-crm-survol>{s.nom} · {s.pct !== null ? `${s.pct} % · ${LIBELLES_ETAT_ZONE[s.etat]}` : LIBELLES_ETAT_ZONE[s.etat]}</p>}
    </div>
  )
}
