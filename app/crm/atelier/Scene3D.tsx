'use client'

// La scène 3D de l'atelier — chargée À LA DEMANDE (next/dynamic depuis app/crm/atelier/Atelier.tsx) : three, React Three
// Fiber et drei ne partent que dans ce morceau, jamais sur les autres pages (scripts/crm-poids-pages.mjs le vérifie).
//
// Budget (plan 3.2) : une forme = UN maillage instancié (boîtes, cylindres, sphères, toits, cônes) + le sol + le calque qui
// pulse ; l'ombre portée ajoute un passage par forme. Environ 15 appels de dessin quelle que soit la taille de l'atelier
// (scripts/crm-atelier-qa.mjs les compte). Les couleurs passent par instanceColor : filtrer ou sélectionner ne recrée rien.
//
// Mouvement (J5) : les objets apparaissent en cascade depuis le dépôt, la caméra glisse d'une vue à l'autre. Cette scène
// n'est jamais montée quand l'utilisateur demande moins d'animations (repli 2D), et coupe tout mouvement si la préférence
// change en cours de route.

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { COULEURS, FORMES, initiales, melanger, styleAvatar, type Forme, type Inst, type Scene } from '@/lib/crm/atelier'

export type CommandesScene = {
  zoomer: (facteur: number) => void
  tourner: (sens: 1 | -1) => void
  recentrer: () => void
  vue: (nom: NomVue) => void
}
export type NomVue = 'ensemble' | 'atelier' | 'chantiers' | 'dessus'
export type Mesures = { fps: number; appels: number; triangles: number; premiereImageMs: number | null; geometries: number }

type Props = {
  scene: Scene
  allumes: Set<number>
  filtreActif: boolean
  selection: number | null
  onSelection: (index: number | null) => void
  /** Expose les mesures de rendu sur window.__atelier (page de démonstration et juge de performance). */
  mesure?: boolean
  vueInitiale?: NomVue
}

const CIBLE: THREE.Vector3Tuple = [3, 0, 0]
const AZIMUT_DEFAUT = Math.PI / 4

function geometrie(f: Forme): THREE.BufferGeometry {
  switch (f) {
    case 'box': return new THREE.BoxGeometry(1, 1, 1)
    case 'cyl': return new THREE.CylinderGeometry(0.5, 0.5, 1, 18)
    case 'sph': return new THREE.SphereGeometry(0.5, 18, 12)
    case 'toit': return new THREE.ConeGeometry(0.5, 1, 4)
    case 'cone': return new THREE.ConeGeometry(0.5, 1, 16)
  }
}

const mouvementReduit = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ── Une couche instanciée : toutes les instances d'une forme, un seul appel de dessin ──────────────────────────
function Couche({ forme, insts, couleur, onPick, onSurvol, apparition }: {
  forme: Forme; insts: Inst[]; couleur: (it: Inst) => string
  onPick: (o: number) => void; onSurvol: (o: number | null) => void
  apparition: { debut: number; centre: THREE.Vector3 } | null
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => geometrie(forme), [forme])
  const fini = useRef(false)
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color() }), [])
  const poser = (k: number) => {
    const mesh = ref.current
    if (!mesh) return
    insts.forEach((it, i) => {
      // Apparition : chaque objet grandit depuis le sol, en cascade depuis le centre du dépôt (≈ 0,9 s en tout).
      let f = 1
      if (k < 1 && apparition) {
        const d = Math.hypot(it.p[0] - apparition.centre.x, it.p[2] - apparition.centre.z)
        const t = Math.min(1, Math.max(0, (k * 1.6 - d / 60)))
        f = 1 - Math.pow(1 - t, 3)
      }
      tmp.p.set(it.p[0], it.p[1] * (k < 1 ? f : 1), it.p[2])
      tmp.s.set(it.s[0] * Math.max(f, 0.0001), it.s[1] * Math.max(f, 0.0001), it.s[2] * Math.max(f, 0.0001))
      tmp.q.setFromEuler(tmp.e.set(it.r[0], it.r[1], it.r[2]))
      mesh.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s))
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }
  // Pose les matrices quand les instances changent ; reprend l'apparition là où elle en est (un survol ne la relance pas).
  useLayoutEffect(() => {
    const k = apparition ? Math.min(1, (performance.now() - apparition.debut) / 950) : 1
    fini.current = k >= 1
    poser(k)
  }, [insts, apparition]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    if (fini.current || !apparition) return
    const k = Math.min(1, (performance.now() - apparition.debut) / 950)
    poser(k)
    if (k >= 1) fini.current = true
  })
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    insts.forEach((it, i) => mesh.setColorAt(i, tmp.c.set(couleur(it))))
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  if (!insts.length) return null
  const objet = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId === undefined ? -1 : insts[e.instanceId]?.o ?? -1)
  return (
    <instancedMesh
      ref={ref} args={[geo, undefined, insts.length]} castShadow receiveShadow frustumCulled={false}
      onClick={(e) => { if (e.delta > 6) return; const o = objet(e); if (o >= 0) { e.stopPropagation(); onPick(o) } }}
      // Pas de survol pendant un glisser (la caméra tourne) : chaque changement de survol redessine les couleurs.
      onPointerMove={(e) => { if (e.buttons) return; const o = objet(e); e.stopPropagation(); onSurvol(o >= 0 ? o : null) }}
      onPointerOut={() => onSurvol(null)}
    >
      <meshStandardMaterial roughness={0.86} metalness={0} />
    </instancedMesh>
  )
}

// ── Le calque qui pulse : les rayonnages sous leur seuil, en corail ────────────────────────────────────────────
function Pulse({ insts, visible }: { insts: Inst[]; visible: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  // La préférence est lue une fois, puis suivie par écouteur (pas une requête matchMedia à chaque image).
  const calme = useRef(mouvementReduit())
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const f = () => { calme.current = !!mq?.matches }
    mq?.addEventListener?.('change', f)
    return () => mq?.removeEventListener?.('change', f)
  }, [])
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    insts.forEach((it, i) => ref.current?.setMatrixAt(i, m.compose(new THREE.Vector3(...it.p), new THREE.Quaternion(), new THREE.Vector3(...it.s))))
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  }, [insts])
  useFrame(({ clock }) => {
    if (!mat.current) return
    mat.current.opacity = calme.current ? 0.22 : 0.1 + 0.2 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3.2))
  })
  if (!insts.length) return null
  return (
    <instancedMesh ref={ref} args={[geo, undefined, insts.length]} visible={visible} raycast={() => null}>
      <meshBasicMaterial ref={mat} color={COULEURS.corail} transparent opacity={0.2} depthWrite={false} />
    </instancedMesh>
  )
}

// ── La caméra : vues enregistrées, rotation par quarts, glissements doux ──────────────────────────────────────
type But = { pos: THREE.Vector3; cible: THREE.Vector3; zoom: number }
const Regie = forwardRef<CommandesScene, { scene: Scene; controles: RefObject<OrbitControlsImpl | null>; selection: number | null; vueInitiale: NomVue; zoomEnsemble: RefObject<number> }>(function Regie({ scene, controles, selection, vueInitiale, zoomEnsemble }, ref) {
  const { camera, size } = useThree()
  const anim = useRef<{ de: But; vers: But; debut: number; duree: number } | null>(null)
  const azimut = useRef(AZIMUT_DEFAUT)
  const zoomAjuste = useMemo(() => {
    const lx = scene.bornes.max[0] - scene.bornes.min[0] + 6, lz = scene.bornes.max[2] - scene.bornes.min[2] + 6
    // En vue isométrique, l'emprise au sol occupe ≈ (lx + lz)·0,71 en largeur et la moitié en hauteur.
    return Math.max(6, Math.min(size.width / ((lx + lz) * 0.56), size.height / ((lx + lz) * 0.36)))
  }, [scene.bornes, size.width, size.height])
  zoomEnsemble.current = zoomAjuste
  const butPour = (nom: NomVue, az = azimut.current): But => {
    const polaire = nom === 'dessus' ? 0.12 : 0.96
    const dist = 60
    const cible = new THREE.Vector3(...(nom === 'atelier' ? [0, 0, -1] as THREE.Vector3Tuple : CIBLE))
    const pos = new THREE.Vector3(cible.x + dist * Math.sin(polaire) * Math.sin(az), dist * Math.cos(polaire), cible.z + dist * Math.sin(polaire) * Math.cos(az))
    const zoom = nom === 'atelier' ? zoomAjuste * 2.1 : nom === 'chantiers' ? zoomAjuste * 0.85 : nom === 'dessus' ? zoomAjuste * 0.82 : zoomAjuste
    return { pos, cible, zoom }
  }
  const aller = (vers: But, duree = 700) => {
    const c = controles.current
    const de: But = { pos: camera.position.clone(), cible: c ? c.target.clone() : new THREE.Vector3(...CIBLE), zoom: (camera as THREE.OrthographicCamera).zoom }
    if (mouvementReduit()) { anim.current = { de, vers, debut: performance.now() - duree, duree: 1 }; return }
    anim.current = { de, vers, debut: performance.now(), duree }
  }
  // Première image : directement à la vue demandée.
  useLayoutEffect(() => {
    const b = butPour(vueInitiale)
    camera.position.copy(b.pos); (camera as THREE.OrthographicCamera).zoom = b.zoom; camera.updateProjectionMatrix()
    controles.current?.target.copy(b.cible); controles.current?.update()
  }, [zoomAjuste]) // eslint-disable-line react-hooks/exhaustive-deps
  // Sélection : la caméra glisse vers l'objet, sans changer d'angle.
  useEffect(() => {
    if (selection === null) return
    const o = scene.objets[selection]
    if (!o || !controles.current) return
    const cible = new THREE.Vector3(o.centre[0], 0, o.centre[2])
    const ecart = camera.position.clone().sub(controles.current.target)
    aller({ pos: cible.clone().add(ecart), cible, zoom: Math.max((camera as THREE.OrthographicCamera).zoom, zoomAjuste * 1.6) }, 650)
  }, [selection]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    const a = anim.current
    if (!a) return
    const t = Math.min(1, (performance.now() - a.debut) / a.duree)
    const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 // easeInOutCubic
    camera.position.lerpVectors(a.de.pos, a.vers.pos, k)
    const cam = camera as THREE.OrthographicCamera
    cam.zoom = a.de.zoom + (a.vers.zoom - a.de.zoom) * k
    cam.updateProjectionMatrix()
    controles.current?.target.lerpVectors(a.de.cible, a.vers.cible, k)
    controles.current?.update()
    if (t >= 1) anim.current = null
  })
  useImperativeHandle(ref, () => ({
    zoomer: (f) => {
      const c = controles.current
      aller({ pos: camera.position.clone(), cible: c ? c.target.clone() : new THREE.Vector3(...CIBLE), zoom: Math.min(110, Math.max(4, (camera as THREE.OrthographicCamera).zoom * f)) }, 300)
    },
    tourner: (sens) => {
      const c = controles.current
      if (!c) return
      const ecart = camera.position.clone().sub(c.target)
      ecart.applyAxisAngle(new THREE.Vector3(0, 1, 0), (sens * Math.PI) / 4)
      azimut.current += (sens * Math.PI) / 4
      aller({ pos: c.target.clone().add(ecart), cible: c.target.clone(), zoom: (camera as THREE.OrthographicCamera).zoom }, 600)
    },
    recentrer: () => { azimut.current = AZIMUT_DEFAUT; aller(butPour('ensemble', AZIMUT_DEFAUT)) },
    vue: (nom) => aller(butPour(nom)),
  }))
  return null
})

// Ombres figées : la maquette ne bouge pas, ses ombres non plus. Elles sont recalculées pendant l'apparition des objets
// (≈ 1 s) et quand la scène change, puis plus jamais — le passage d'ombre, qui doublait le coût de chaque image, disparaît.
function OmbresFigees({ version, dureeMs }: { version: unknown; dureeMs: number }) {
  const { gl } = useThree()
  const jusqua = useRef(0)
  const images = useRef(0)
  useEffect(() => { gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; jusqua.current = performance.now() + dureeMs; images.current = 0 }, [gl, version, dureeMs])
  // Les trois premières images, puis toute la durée de l'apparition : même une première image lente a ses ombres justes.
  useFrame(() => { images.current++; if (images.current <= 3 || performance.now() <= jusqua.current + 50) gl.shadowMap.needsUpdate = true })
  return null
}

// Les étiquettes (zones, pastilles des chantiers, bulle de survol) vivent dans UN calque DOM posé sur la toile. Une seule
// boucle les replace, et seulement quand la caméra ou la taille ont changé : translate3d sur des éléments déjà composés,
// rien d'autre. (Le composant Html de drei, une instance par étiquette, faisait tomber la rotation à ~20 i/s : mesuré.)
type Cible = { el: HTMLElement | null; p: THREE.Vector3 }
// `racine` porte data-niveau : « loin » (cartes réduites au nom et aux alertes) tant que la caméra est près de la vue d'ensemble ET que la
// ville est dense (plus de 6 chantiers) ; « pres » sinon (équipe, tâches, détail). Le CSS fait le reste, aucun rendu React.
function Projecteur({ cibles, racine, zoomEnsemble, dense }: { cibles: RefObject<Cible[]>; racine: RefObject<HTMLDivElement | null>; zoomEnsemble: RefObject<number>; dense: boolean }) {
  const { camera, size } = useThree()
  const avant = useRef<number[]>([])
  const listeAvant = useRef<Cible[] | null>(null)
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const niveau = dense && (camera as THREE.OrthographicCamera).zoom < zoomEnsemble.current * 1.5 ? 'loin' : 'pres'
    if (racine.current && racine.current.dataset.niveau !== niveau) racine.current.dataset.niveau = niveau
    const e = camera.matrixWorld.elements, q = camera.projectionMatrix.elements
    const cle = [...e, q[0], q[5], size.width, size.height, cibles.current?.length ?? 0]
    // Rien à faire si ni la caméra, ni la taille, ni les étiquettes (nouvelle liste à chaque rendu React) n'ont changé.
    if (cibles.current === listeAvant.current && cle.length === avant.current.length && cle.every((x, i) => Math.abs(x - avant.current[i]) < 1e-6)) return
    avant.current = cle
    listeAvant.current = cibles.current
    for (const c of cibles.current ?? []) {
      if (!c.el) continue
      v.copy(c.p).project(camera)
      const x = (v.x * 0.5 + 0.5) * size.width, y = (-v.y * 0.5 + 0.5) * size.height
      c.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
      c.el.style.zIndex = String(Math.round(y)) // plus bas à l'écran = plus près : la carte du devant passe devant
    }
  })
  return null
}

// Les étapes du premier affichage (mesure seulement) : module chargé, scène montée, toile créée, première image.
const ETAPES: Record<string, number> = { module: typeof performance !== 'undefined' ? performance.now() : 0 }
const marquer = (k: string) => { if (!(k in ETAPES) && typeof performance !== 'undefined') ETAPES[k] = performance.now() }

function Mesureur({ actif }: { actif: boolean }) {
  const { gl, scene } = useThree()
  useEffect(() => { if (actif) (window as unknown as { __atelierRendu?: unknown; __atelierEtapes?: unknown }).__atelierRendu = { gl, scene } }, [actif, gl, scene])
  useEffect(() => { if (actif) (window as unknown as { __atelierEtapes?: unknown }).__atelierEtapes = ETAPES }, [actif])
  const etat = useRef({ images: 0, depuis: performance.now(), premiere: null as number | null })
  useFrame(() => {
    if (!actif) return
    const e = etat.current
    if (e.premiere === null) { e.premiere = performance.now(); marquer('premiereImage') }
    e.images++
    const dt = performance.now() - e.depuis
    if (dt >= 1000) {
      const w = window as unknown as { __atelier?: Mesures }
      w.__atelier = { fps: Math.round((e.images * 1000) / dt), appels: gl.info.render.calls, triangles: gl.info.render.triangles, premiereImageMs: e.premiere, geometries: gl.info.memory.geometries }
      e.images = 0; e.depuis = performance.now()
    }
  })
  return null
}

const Scene3D = forwardRef<CommandesScene, Props>(function Scene3D({ scene, allumes, filtreActif, selection, onSelection, mesure = false, vueInitiale = 'ensemble' }, ref) {
  const controles = useRef<OrbitControlsImpl | null>(null)
  const [survol, setSurvol] = useState<number | null>(null)
  marquer('sceneRendue')
  // L'apparition en cascade ne se joue qu'à la PREMIÈRE image : quand les données se renouvellent en direct, la ville ne se reconstruit pas.
  const apparition = useMemo(() => (mouvementReduit() ? null : { debut: performance.now(), centre: new THREE.Vector3(0, 0, 0) }), [])
  const racine = useRef<HTMLDivElement | null>(null)
  const zoomEnsemble = useRef(14)
  const nbChantiers = useMemo(() => scene.objets.filter((o) => o.type === 'chantier').length, [scene])
  useEffect(() => { document.body.style.cursor = survol !== null ? 'pointer' : ''; return () => { document.body.style.cursor = '' } }, [survol])

  const couleur = (it: Inst): string => {
    if (it.o === selection && it.o >= 0) return melanger(it.c, COULEURS.corail, 0.28)
    if (filtreActif) {
      if (it.o < 0 || !allumes.has(it.o)) return melanger(it.c, COULEURS.sol, it.o < 0 ? 0.5 : 0.78)
    }
    if (it.o === survol && it.o >= 0) return melanger(it.c, '#FFFFFF', 0.28)
    return it.c
  }
  const objetSurvol = survol !== null ? scene.objets[survol] : null
  // Une cible par étiquette ; l'élément DOM est rattaché par ref, la position 3D est fixe (la maquette ne bouge pas).
  const etiquettes = useMemo(() => [
    ...scene.zones.map((z) => ({ cle: `zone:${z.libelle}`, p: new THREE.Vector3(...z.p), zone: z.libelle, i: -1 })),
    ...scene.objets.flatMap((o, i) => (o.type === 'chantier' ? [{ cle: o.cle, p: new THREE.Vector3(o.centre[0], o.hauteur + 0.6, o.centre[2]), zone: null, i }] : [])),
  ], [scene])
  const cibles = useRef<Cible[]>([])
  const bulle = useRef<HTMLSpanElement | null>(null)
  cibles.current = [
    ...etiquettes.map((e, k) => ({ el: cibles.current[k]?.el ?? null, p: e.p })),
    { el: bulle.current, p: objetSurvol ? new THREE.Vector3(objetSurvol.centre[0], objetSurvol.hauteur + 0.6, objetSurvol.centre[2]) : new THREE.Vector3(0, -999, 0) },
  ]

  return (
    <div className="atl-scene">
    <Canvas
      orthographic flat shadows="percentage" dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [40, 36, 40], zoom: 14, near: -500, far: 1000 }}
      onPointerMissed={() => onSelection(null)}
      onCreated={() => marquer('toileCreee')}
      style={{ background: COULEURS.sol }}
      aria-hidden="true"
    >
      <color attach="background" args={[COULEURS.sol]} />
      <hemisphereLight args={['#FFFDF8', '#E4DACB', 1.55]} />
      <directionalLight
        castShadow position={[-24, 44, 14]} intensity={1.15} color="#FFF6EC"
        shadow-mapSize={[1536, 1536]} shadow-bias={-0.0005} shadow-normalBias={0.02}
        shadow-camera-left={-55} shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55} shadow-camera-near={1} shadow-camera-far={140}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow onClick={(e) => { if (e.delta <= 6) onSelection(null) }}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color={COULEURS.sol} roughness={1} />
      </mesh>
      {FORMES.map((f) => (
        <Couche key={`${f}-${scene.instances[f].length}`} forme={f} insts={scene.instances[f]} couleur={couleur} apparition={apparition}
          onPick={(o) => onSelection(o === selection ? null : o)} onSurvol={setSurvol} />
      ))}
      <Pulse insts={scene.pulse} visible={!filtreActif || scene.pulse.some((p) => allumes.has(p.o))} />
      <OrbitControls
        ref={controles} makeDefault enableDamping dampingFactor={0.12} target={CIBLE}
        minPolarAngle={0.05} maxPolarAngle={1.2} minZoom={4} maxZoom={110} screenSpacePanning={false}
      />
      <Regie ref={ref} scene={scene} controles={controles} selection={selection} vueInitiale={vueInitiale} zoomEnsemble={zoomEnsemble} />
      <OmbresFigees version={scene} dureeMs={apparition ? 1100 : 0} />
      <Mesureur actif={mesure} />
      <Projecteur cibles={cibles} racine={racine} zoomEnsemble={zoomEnsemble} dense={nbChantiers > 6} />
    </Canvas>
    {/* Le calque des étiquettes (DOM, aucun appel de dessin). */}
    <div className="atl-etiquettes" ref={racine} data-niveau="pres">
      {etiquettes.map((e, k) => {
        const lier = (el: HTMLElement | null) => { if (cibles.current[k]) cibles.current[k].el = el }
        if (e.zone) return <span key={e.cle} ref={lier} className="atl-zone">{e.zone}</span>
        const o = scene.objets[e.i]
        const t = o.info?.taches ?? null
        const pct = t && t.total ? Math.round((t.faites / t.total) * 100) : null
        const equipe = o.info?.equipe ?? []
        const critique = o.badges.some((b) => b.gravite === 'critique')
        return (
          <button key={e.cle} ref={lier} type="button" tabIndex={-1}
            className={`atl-carte${filtreActif && !allumes.has(e.i) ? ' estompe' : ''}${selection === e.i ? ' choisie' : ''}${critique ? ' urgente' : ''}`}
            onClick={() => onSelection(e.i)}>
            <span className="atl-carte-tete"><i style={{ background: o.epingle ?? COULEURS.gris }} aria-hidden="true" /><b>{o.libelle}</b></span>
            <span className="atl-carte-ligne">{o.detail}</span>
            {pct !== null && <span className="atl-carte-barre" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>}
            <span className="atl-carte-pied">
              {equipe.length > 0 && <span className="atl-carte-equipe" title={equipe.map((m) => m.nom).join(', ')}>{equipe.slice(0, 4).map((m) => <i key={m.id} className="atl-av" style={styleAvatar(m.role)}>{initiales(m.nom)}</i>)}{equipe.length > 4 && <em>+{equipe.length - 4}</em>}</span>}
              {o.badges.map((b) => <span key={b.type} className={`atl-badge g-${b.gravite}`}>{b.libelle}</span>)}
            </span>
          </button>
        )
      })}
      <span ref={(el) => { bulle.current = el; const c = cibles.current[cibles.current.length - 1]; if (c) c.el = el }} className={`atl-bulle${objetSurvol && objetSurvol.type !== 'chantier' ? '' : ' cachee'}`} aria-hidden="true">
        {objetSurvol && <><b>{objetSurvol.libelle}</b>{objetSurvol.detail}</>}
      </span>
    </div>
    </div>
  )
})

export default Scene3D
