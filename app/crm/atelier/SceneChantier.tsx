'use client'

// La MAQUETTE du chantier en coupe isométrique (plan du 18/10, n°8, version 2) — chargée À LA DEMANDE (next/dynamic depuis
// app/crm/PlanChantier.tsx) : three et React Three Fiber ne partent que dans ce morceau. Les volumes viennent de
// lib/crm/planScene.ts (pur) : une forme = une couche instanciée, au plus cinq appels de dessin + le sol. Ombres figées (la
// maquette ne bouge pas). Jamais montée sur téléphone ni quand l'utilisateur demande moins d'animations : le schéma 2D suffit.
// Les étiquettes des pièces sont des boutons DOM posés sur la toile (une seule boucle les replace quand la caméra bouge).

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { COULEURS, FORMES, type Forme, type Inst } from '@/lib/crm/atelier'
import type { SceneChantier as Donnees } from '@/lib/crm/planScene'

function geometrie(f: Forme): THREE.BufferGeometry {
  switch (f) {
    case 'box': return new THREE.BoxGeometry(1, 1, 1)
    case 'cyl': return new THREE.CylinderGeometry(0.5, 0.5, 1, 16)
    case 'sph': return new THREE.SphereGeometry(0.5, 16, 10)
    case 'toit': return new THREE.ConeGeometry(0.5, 1, 4)
    case 'cone': return new THREE.ConeGeometry(0.5, 1, 14)
  }
}

function Couche({ forme, insts, choisie }: { forme: Forme; insts: Inst[]; choisie: number | null }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => geometrie(forme), [forme])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color()
    insts.forEach((it, i) => {
      mesh.setMatrixAt(i, m.compose(new THREE.Vector3(...it.p), q.setFromEuler(e.set(it.r[0], it.r[1], it.r[2])), new THREE.Vector3(...it.s)))
      // La pièce choisie ressort ; les autres s'estompent un peu.
      c.set(it.c)
      if (choisie !== null && it.o !== choisie) c.lerp(new THREE.Color(COULEURS.sol), 0.45)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [insts, choisie])
  useEffect(() => () => geo.dispose(), [geo])
  if (!insts.length) return null
  return (
    <instancedMesh ref={ref} args={[geo, undefined, insts.length]} castShadow receiveShadow frustumCulled={false} raycast={() => null}>
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

function Cadrage({ bornes }: { bornes: Donnees['bornes'] }) {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    const lx = bornes.max[0] - bornes.min[0], lz = bornes.max[2] - bornes.min[2]
    const zoom = Math.max(14, Math.min(size.width / ((lx + lz) * 0.78), size.height / ((lx + lz) * 0.5)))
    camera.position.set(30, 30, 30)
    ;(camera as THREE.OrthographicCamera).zoom = zoom
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [bornes, size.width, size.height, camera])
  return null
}

type Cible = { el: HTMLElement | null; p: THREE.Vector3 }
function Projecteur({ cibles }: { cibles: React.RefObject<Cible[]> }) {
  const { camera, size } = useThree()
  const avant = useRef('')
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const cle = [...camera.matrixWorld.elements, camera.projectionMatrix.elements[0], size.width, size.height].map((x) => x.toFixed(4)).join()
    if (cle === avant.current) return
    avant.current = cle
    for (const c of cibles.current ?? []) {
      if (!c.el) continue
      v.copy(c.p).project(camera)
      c.el.style.transform = `translate3d(${((v.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * size.height).toFixed(1)}px, 0) translate(-50%, -50%)`
    }
  })
  return null
}

export default function SceneChantier({ scene, choisie, onChoisir }: { scene: Donnees; choisie: string | null; onChoisir: (nom: string | null) => void }) {
  const indexChoisi = choisie === null ? null : scene.etiquettes.findIndex((e) => e.nom === choisie)
  const cibles = useRef<Cible[]>([])
  cibles.current = scene.etiquettes.map((e, k) => ({ el: cibles.current[k]?.el ?? null, p: new THREE.Vector3(...e.p) }))
  return (
    <div className="crm-maquette">
      <Canvas orthographic flat shadows="percentage" dpr={[1, 1.5]} gl={{ antialias: true }} camera={{ position: [30, 30, 30], zoom: 30, near: -200, far: 400 }} aria-hidden="true" style={{ background: COULEURS.sol }}>
        <color attach="background" args={[COULEURS.sol]} />
        <hemisphereLight args={['#FFFDF8', '#E4DACB', 1.5]} />
        <directionalLight castShadow position={[-16, 30, 10]} intensity={1.1} color="#FFF6EC" shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005}
          shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color={COULEURS.sol} roughness={1} />
        </mesh>
        {FORMES.map((f) => <Couche key={`${f}-${scene.instances[f].length}`} forme={f} insts={scene.instances[f]} choisie={indexChoisi !== null && indexChoisi >= 0 ? indexChoisi : null} />)}
        <Cadrage bornes={scene.bornes} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.12} enablePan={false} minPolarAngle={0.35} maxPolarAngle={1.15} minZoom={10} maxZoom={120} />
        <OmbresFigees version={scene} />
        <Projecteur cibles={cibles} />
      </Canvas>
      <div className="crm-maquette-etiquettes">
        {scene.etiquettes.map((e, k) => (
          <button key={e.nom} type="button" ref={(el) => { if (cibles.current[k]) cibles.current[k].el = el }} className={`e-${e.etat}${choisie === e.nom ? ' choisie' : ''}`}
            aria-pressed={choisie === e.nom} onClick={() => onChoisir(choisie === e.nom ? null : e.nom)}>
            <b>{e.nom}</b> <span className="tnum">{e.pct} %</span>
          </button>
        ))}
      </div>
    </div>
  )
}
