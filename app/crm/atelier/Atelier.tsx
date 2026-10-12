'use client'

import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import {
  COULEURS, compteFiltres, construireScene, FILTRES, LIBELLES_FILTRE, LIBELLES_PREREGLAGE, objetsAllumes, PREREGLAGES, prereglageDe,
  type DonneesAtelier, type Filtre, type Prereglage,
} from '@/lib/crm/atelier'
import type { CommandesScene, NomVue } from './Scene3D'
import Plan2D from './Plan2D'
import Panneau from './Panneau'
import './atelier.css'

// « L'atelier vivant » (plan 3.3) : la maquette 3D générée depuis les données, ou son repli 2D.
//
// Le morceau 3D (three + React Three Fiber + drei) n'est chargé qu'ici, à la demande, et seulement si la 3D est choisie.
// Repli 2D AUTOMATIQUE (plan 3.2) : téléphone, WebGL absent, « réduire les animations », batterie faible — ou une erreur
// de rendu. Le repli montre les mêmes objets et ouvre les mêmes panneaux ; l'artisan peut toujours basculer à la main.
const Scene3D = dynamic(() => import('./Scene3D'), {
  ssr: false,
  loading: () => <div className="atl-charge" role="status">Construction de la maquette…</div>,
})

type Mode = '3d' | '2d'
type Detection = { mode: Mode; raison: string | null; webgl: boolean }

function detecter(): Detection {
  const raisons: string[] = []
  let webgl = false
  try { const c = document.createElement('canvas'); webgl = !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { webgl = false }
  if (!webgl) raisons.push('ce navigateur n’affiche pas la 3D (WebGL indisponible)')
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) raisons.push('vous avez demandé moins d’animations')
  const etroit = window.innerWidth < 760 || (window.matchMedia?.('(pointer: coarse)').matches && window.innerWidth < 1024)
  if (etroit) raisons.push('sur téléphone, le plan est plus lisible')
  return { mode: raisons.length ? '2d' : '3d', raison: raisons.length ? `Plan 2D affiché : ${raisons.join(', ')}.` : null, webgl }
}

class GardeRendu extends Component<{ onErreur: () => void; children: ReactNode }, { erreur: boolean }> {
  state = { erreur: false }
  static getDerivedStateFromError() { return { erreur: true } }
  componentDidCatch() { this.props.onErreur() }
  render() { return this.state.erreur ? null : this.props.children }
}

const heureParis = () => new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function Atelier({ donnees, demo = false, mesure = false, onVue2D, prereglageInitial, vueInitiale, filtreInitial, forcer }: {
  donnees: DonneesAtelier
  demo?: boolean
  mesure?: boolean
  onVue2D?: (vue: string) => void
  prereglageInitial?: Prereglage
  vueInitiale?: NomVue
  filtreInitial?: Filtre | null
  /** Page de démonstration : impose le mode (captures et mesures). */
  forcer?: Mode
}) {
  const [detection, setDetection] = useState<Detection | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)
  const [filtre, setFiltre] = useState<Filtre | null>(filtreInitial ?? null)
  const [selection, setSelection] = useState<number | null>(null)
  const [prereglage, setPrereglage] = useState<Prereglage>(prereglageInitial ?? prereglageDe(donnees.metier))
  const [heure, setHeure] = useState<string | null>(null)
  const commandes = useRef<CommandesScene>(null)

  useEffect(() => {
    const d = detecter()
    setDetection(d)
    setMode(forcer ?? d.mode)
    // Batterie faible (quand le navigateur sait le dire) : on bascule au plan, et on le dit.
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> }
    if (!forcer && d.mode === '3d' && nav.getBattery) {
      void nav.getBattery().then((b) => {
        if (b.level < 0.2 && !b.charging) { setDetection({ ...d, mode: '2d', raison: 'Plan 2D affiché : batterie faible.' }); setMode('2d') }
      }).catch(() => {})
    }
  }, [forcer])
  useEffect(() => { setHeure(heureParis()); const t = setInterval(() => setHeure(heureParis()), 1000); return () => clearInterval(t) }, [])

  const scene = useMemo(() => construireScene(donnees, prereglage), [donnees, prereglage])
  const allumes = useMemo(() => objetsAllumes(scene.objets, filtre), [scene, filtre])
  const comptes = useMemo(() => compteFiltres(scene.objets), [scene])
  const choisi = selection !== null ? scene.objets[selection] ?? null : null
  useEffect(() => { setSelection(null) }, [prereglage])
  const fermer = useCallback(() => setSelection(null), [])
  const vers2D = useCallback((v: string) => onVue2D?.(v), [onVue2D])
  const annonce = filtre ? `${comptes[filtre]} élément${comptes[filtre] > 1 ? 's' : ''} : ${LIBELLES_FILTRE[filtre].toLowerCase()}` : `${scene.objets.length} éléments`

  return (
    <div className={`atl${choisi ? ' avec-panneau' : ''}`} data-atelier-mode={mode ?? 'attente'}>
      <div className="atl-barre" role="toolbar" aria-label="Atelier">
        <button type="button" className="atl-ensemble" onClick={() => { setFiltre(null); setSelection(null); commandes.current?.recentrer() }}>Vue d’ensemble</button>
        <span className="atl-live" aria-label={heure ? `Heure : ${heure}` : undefined}><i aria-hidden="true" />Live <time className="tnum">{heure ?? '—'}</time></span>
        {donnees.demandes.length > 0 && (
          <button type="button" className="atl-notif" onClick={() => setSelection(scene.objets.findIndex((o) => o.type === 'accueil'))}>
            {donnees.demandes.length} nouvelle{donnees.demandes.length > 1 ? 's' : ''} demande{donnees.demandes.length > 1 ? 's' : ''}
          </button>
        )}
        <div className="atl-filtres" role="group" aria-label="Filtrer la maquette">
          {FILTRES.map((f) => (
            <button key={f} type="button" aria-pressed={filtre === f} className={filtre === f ? 'on' : ''} onClick={() => setFiltre(filtre === f ? null : f)} data-atelier-filtre={f}>
              {LIBELLES_FILTRE[f]} <span className="tnum">{comptes[f]}</span>
            </button>
          ))}
        </div>
        <label className="atl-metier">
          <span className="crm-sr">Préréglage de l’atelier</span>
          <select value={prereglage} onChange={(e) => setPrereglage(e.target.value as Prereglage)}>
            {PREREGLAGES.map((p) => <option key={p} value={p}>{LIBELLES_PREREGLAGE[p]}</option>)}
          </select>
        </label>
        <details className="atl-aide">
          <summary aria-label="Aide : lire la maquette">?</summary>
          <div className="atl-aide-corps">
            <p><b>La maquette est faite de vos données</b>, rien n’y est dessiné à l’avance.</p>
            <ul>
              <li><b>Accueil</b> : un colis par nouvelle demande, en corail si elle est arrivée aujourd’hui.</li>
              <li><b>Dépôt</b> : un rayonnage par catégorie d’inventaire ; il pulse en corail quand un matériau passe sous son seuil.</li>
              <li><b>Parking</b> : une camionnette par véhicule. <b>Équipe</b> : un personnage par membre, sur son chantier du jour.</li>
              <li><b>Chantiers</b> : une maison par chantier ouvert ; l’épingle donne son état (voir la légende).</li>
              <li><b>Bureau</b> : ouvre le tableau de bord, le pipeline et les clients.</li>
            </ul>
            <p>Cliquez un objet pour ouvrir sa fiche. Glissez pour tourner, molette ou pincement pour zoomer, clic droit pour déplacer. Les filtres allument ce qui vous concerne et estompent le reste. Au clavier, ouvrez « Liste des éléments » ou passez au plan 2D.</p>
          </div>
        </details>
        {detection && (
          <button type="button" className="atl-bascule" disabled={mode === '2d' && !detection.webgl} title={!detection.webgl ? 'WebGL indisponible sur ce navigateur' : undefined}
            onClick={() => { setSelection(null); setMode(mode === '3d' ? '2d' : '3d') }}>
            {mode === '3d' ? 'Plan 2D' : 'Maquette 3D'}
          </button>
        )}
      </div>
      <p className="crm-sr" aria-live="polite">{annonce}</p>

      <div className="atl-cadre">
        {mode === '3d' && (
          <>
            <div className="atl-outils" role="group" aria-label="Caméra">
              <button type="button" aria-label="Zoom avant" onClick={() => commandes.current?.zoomer(1.35)}>+</button>
              <button type="button" aria-label="Zoom arrière" onClick={() => commandes.current?.zoomer(1 / 1.35)}>−</button>
              <button type="button" aria-label="Tourner à gauche" onClick={() => commandes.current?.tourner(-1)}>⟲</button>
              <button type="button" aria-label="Tourner à droite" onClick={() => commandes.current?.tourner(1)}>⟳</button>
              <button type="button" aria-label="Recentrer" onClick={() => commandes.current?.recentrer()}>⌂</button>
              <span className="atl-sep" aria-hidden="true" />
              <button type="button" title="Vue de l’atelier" aria-label="Vue de l’atelier" onClick={() => commandes.current?.vue('atelier')}>1</button>
              <button type="button" title="Vue des chantiers" aria-label="Vue des chantiers" onClick={() => commandes.current?.vue('chantiers')}>2</button>
              <button type="button" title="Vue de dessus" aria-label="Vue de dessus" onClick={() => commandes.current?.vue('dessus')}>3</button>
            </div>
            <div className="atl-toile">
              <GardeRendu onErreur={() => { setDetection((d) => d && { ...d, raison: 'Plan 2D affiché : la maquette 3D n’a pas pu s’afficher sur cet appareil.' }); setMode('2d') }}>
                <Scene3D ref={commandes} scene={scene} allumes={allumes} filtreActif={filtre !== null} selection={selection} onSelection={setSelection} mesure={mesure} vueInitiale={vueInitiale ?? 'ensemble'} />
              </GardeRendu>
            </div>
            {/* Ce que la 3D montre, lisible sans elle : la liste des objets reste atteignable au clavier. */}
            <details className="atl-liste-3d">
              <summary>Liste des éléments de la maquette</summary>
              <Plan2D scene={scene} allumes={allumes} filtreActif={filtre !== null} selection={selection} onSelection={setSelection} raison={null} />
            </details>
          </>
        )}
        {mode === '2d' && <Plan2D scene={scene} allumes={allumes} filtreActif={filtre !== null} selection={selection} onSelection={setSelection} raison={detection?.raison ?? null} />}
        {mode === null && <div className="atl-charge" role="status">Préparation de l’atelier…</div>}
        {choisi && <Panneau objet={choisi} donnees={donnees} demo={demo} onFermer={fermer} onVue2D={vers2D} />}
      </div>
      <Legende horsScene={scene.horsScene} />
    </div>
  )
}

function Legende({ horsScene }: { horsScene: { chantiers: number; categories: number; vehicules: number; demandes: number } }) {
  const hors = [
    horsScene.chantiers && `${horsScene.chantiers} chantier${horsScene.chantiers > 1 ? 's' : ''}`,
    horsScene.vehicules && `${horsScene.vehicules} véhicule${horsScene.vehicules > 1 ? 's' : ''}`,
    horsScene.demandes && `${horsScene.demandes} demande${horsScene.demandes > 1 ? 's' : ''}`,
  ].filter(Boolean)
  return (
    <div className="atl-legende">
      <span><i style={{ background: COULEURS.gris }} />À démarrer</span>
      <span><i style={{ background: COULEURS.ambre }} />Planifié</span>
      <span><i style={{ background: COULEURS.corail }} />En cours</span>
      <span><i style={{ background: COULEURS.corailFonce }} />En retard</span>
      <span><i style={{ background: COULEURS.vert }} />À facturer</span>
      <span><i style={{ background: COULEURS.corail, opacity: 0.45 }} />Stock bas (rayonnage qui pulse)</span>
      {hors.length > 0 && <span className="atl-hors">Hors maquette (place limitée) : {hors.join(', ')} — ils restent dans les onglets Chantiers, Pipeline et dans l’Inventaire.</span>}
    </div>
  )
}
