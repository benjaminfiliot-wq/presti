'use client'

import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import {
  chiffresFiltres, COULEURS, construireScene, FILTRES, LIBELLES_FILTRE, LIBELLES_PREREGLAGE, objetsAllumes, PREREGLAGES, prereglageDe,
  type DonneesAtelier, type Filtre, type Prereglage,
} from '@/lib/crm/atelier'
import { calculerAlertes, construireBriefing, urgencesDuJour, type EtapeBriefing, type Urgence } from '@/lib/crm/alertes'
import { actif } from '@/lib/flags'
import { arriveesDe, nouvellesArrivees, texteArrivee, type Arrivee } from '@/lib/crm/accueil'
import { posteAssistants } from '@/lib/crm/assistants'
import { BASES, LIBELLES_BASE, LIBELLES_LIEU, type Base } from '@/lib/crm/infrastructure'
import type { Vue } from '@/lib/crm/vue'
import type { CommandesScene, NomVue } from './Scene3D'
import Plan2D from './Plan2D'
import Panneau from './Panneau'
import Urgences from './Urgences'
import './atelier.css'

// « L'atelier vivant » (plan 3.3) : la maquette 3D générée depuis les données, ou son repli 2D.
//
// Le morceau 3D (three + React Three Fiber + drei) n'est chargé qu'ici, à la demande, et seulement si la 3D est choisie.
// Repli 2D AUTOMATIQUE (plan 3.2) : téléphone, WebGL absent, « réduire les animations », batterie faible — ou une erreur
// de rendu. Le repli montre les mêmes objets et ouvre les mêmes panneaux ; l'artisan peut toujours basculer à la main.
//
// 15/10 — la carte est la vue PRINCIPALE du CRM : elle occupe presque tout l'écran, les chantiers du compte y portent leur équipe,
// leurs tâches et leurs alertes, et un clic ouvre le panneau du chantier (urgences, tâches ouvertes, relance du fournisseur…).
// Elle se met à jour toute seule (temps réel, app/crm/useTempsReel.ts) : la sélection et la caméra restent où elles sont.
const Scene3D = dynamic(() => import('./Scene3D'), {
  ssr: false,
  loading: () => <div className="atl-charge" role="status">Construction de la maquette…</div>,
})

/**
 * Précharge le morceau 3D (sans le monter) quand l'appareil l'affichera : la page /crm l'appelle dès son ouverture, pour
 * que le téléchargement de three se fasse PENDANT la lecture des données et non après (recette du 12/10 : premier
 * affichage 3D à froid trop lent). Sur téléphone, sans WebGL ou en « moins d'animations », rien n'est téléchargé.
 */
// Mesuré le 13/10 (profil CPU, /crm à froid) : le test WebGL — le PREMIER contexte de la page — coûte 0,3 à 0,8 s de
// calcul. Lancé tout de suite, il retardait d'autant le départ de la lecture des données. Donc : le morceau 3D part tout de
// suite (simple téléchargement), le test WebGL 150 ms plus tard, quand la lecture voyage déjà ; l'atelier le retrouve fait.
export function prechargerScene3D() {
  try {
    const etroit = window.innerWidth < 760 || (window.matchMedia?.('(pointer: coarse)').matches && window.innerWidth < 1024)
    if (etroit || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    void import('./Scene3D')
    window.setTimeout(() => { try { detecter() } catch { /* l'atelier refera le test */ } }, 150)
  } catch { /* le chargement normal prendra le relais */ }
}

type Mode = '3d' | '2d'
type Detection = { mode: Mode; raison: string | null; webgl: boolean }

let webglConnu: boolean | null = null
function detecter(): Detection {
  const raisons: string[] = []
  // Le test WebGL crée un contexte : une fois par page suffit (le préchargement et l'atelier le partagent).
  if (webglConnu === null) {
    try {
      const c = document.createElement('canvas')
      const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
      webglConnu = !!gl
      gl?.getExtension('WEBGL_lose_context')?.loseContext() // le contexte de test est rendu aussitôt
    } catch { webglConnu = false }
  }
  const webgl = webglConnu
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
/** L'horloge a son propre état : elle bat chaque seconde sans refaire le rendu de la carte, du panneau ni des urgences. */
function Horloge() {
  const [heure, setHeure] = useState<string | null>(null)
  useEffect(() => { setHeure(heureParis()); const t = setInterval(() => setHeure(heureParis()), 1000); return () => clearInterval(t) }, [])
  return <time className="tnum" aria-hidden="true">{heure ?? '—'}</time>
}

// Le réglage de l'atelier (drapeau crmAtelierVivant) : le métier et la base que l'artisan a corrigés, gardés DANS CE NAVIGATEUR
// seulement (aucune écriture serveur). Le stockage peut manquer (navigation privée, données effacées) : tout est sous try/catch.
const CLE_REGLAGE = 'crm.atelier.reglage'
type Reglage = { metier?: Prereglage; base?: Base | null }
function lireReglage(): Reglage {
  try {
    const r = JSON.parse(window.localStorage.getItem(CLE_REGLAGE) ?? '{}') as Reglage
    return { metier: (PREREGLAGES as readonly string[]).includes(r.metier ?? '') ? r.metier : undefined, base: (BASES as readonly string[]).includes(r.base ?? '') ? r.base : null }
  } catch { return {} }
}
function ecrireReglage(r: Reglage) {
  try { window.localStorage.setItem(CLE_REGLAGE, JSON.stringify(r)) } catch { /* rien : le réglage vaut pour cette visite */ }
}

const LIBELLE_LIEN = { connexion: 'Connexion…', direct: 'En direct', coupe: 'Hors ligne · relu chaque minute' } as const
const calme = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function Atelier({ donnees, vue, demo = false, mesure = false, onVue2D, prereglageInitial, vueInitiale, filtreInitial, forcer, onChange, lien, dernier, baseInitiale, heure }: {
  donnees: DonneesAtelier
  /** La Vue entière du CRM (page /crm) : lue SEULEMENT drapeau crmAtelierVivant levé (salle d'attente, poste des assistants). Absente : l'atelier d'avant. */
  vue?: Vue
  demo?: boolean
  mesure?: boolean
  onVue2D?: (vue: string) => void
  prereglageInitial?: Prereglage
  vueInitiale?: NomVue
  filtreInitial?: Filtre | null
  /** Page de démonstration : impose le mode (captures et mesures). */
  forcer?: Mode
  /** Une action du panneau a changé une donnée : l'écran relit tout de suite (le temps réel le ferait aussi, un peu après). */
  onChange?: () => void
  /** État de la liaison temps réel (absent : exemple et démonstration, rien à écouter). */
  lien?: 'connexion' | 'direct' | 'coupe'
  /** Le dernier évènement reçu : « Mis à jour : Tâche ». */
  dernier?: { libelle: string; a: number } | null
  /** Page de démonstration, drapeau crmAtelierVivant levé : la base imposée (`?base=`) et l'heure (`?heure=`). Ignorés drapeau baissé. */
  baseInitiale?: Base | null
  heure?: number | null
}) {
  const [detection, setDetection] = useState<Detection | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)
  const [filtre, setFiltre] = useState<Filtre | null>(filtreInitial ?? null)
  // La sélection est une CLÉ d'objet (« chantier:<id> »), pas une position : quand les données se renouvellent en direct, l'objet
  // choisi reste le même même si la liste a changé de forme.
  const [cleSel, setCleSel] = useState<string | null>(null)
  const [prereglage, setPrereglage] = useState<Prereglage>(prereglageInitial ?? prereglageDe(donnees.metier))
  const [visite, setVisite] = useState<{ etapes: EtapeBriefing[]; i: number; auto: boolean } | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const commandes = useRef<CommandesScene>(null)
  // — Arrivée en direct (drapeau crmAtelierVivant) : seules les demandes qui arrivent APRÈS le montage comptent ; le premier chargement ne déclenche rien. —
  const connues = useRef<Arrivee[] | null>(null)
  const [arrivee, setArrivee] = useState<Arrivee[] | null>(null)
  const [chute, setChute] = useState<{ debut: number; index: number[] } | null>(null)
  const [surligne, setSurligne] = useState<string | null>(null)

  useEffect(() => {
    if (mesure) (window as unknown as { __atelierMonte?: number }).__atelierMonte = performance.now()
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
  }, [forcer, mesure])

  // L'atelier vivant (drapeau crmAtelierVivant) : il faut la Vue entière. Baissé, ou sans Vue : rien de ce qui suit n'existe.
  const vivant = actif('crmAtelierVivant') && !!vue
  const poste = useMemo(() => (vivant && vue ? posteAssistants(vue, donnees.jour) : null), [vivant, vue, donnees.jour])
  const total = poste ? poste.total : null
  // L'infrastructure (même drapeau, lib/crm/infrastructure.ts) : la base suit le profil de l'artisan, ou celle qu'il a choisie (null =
  // automatique). Pas besoin de la Vue : la démonstration la montre aussi. Baissé : l'appel d'avant, à l'identique.
  const infra = actif('crmAtelierVivant')
  const [base, setBase] = useState<Base | null>(baseInitiale ?? null)
  useEffect(() => {
    if (!infra || prereglageInitial || baseInitiale) return
    const r = lireReglage()
    if (r.metier) setPrereglage(r.metier)
    if (r.base) setBase(r.base)
  }, [infra, prereglageInitial, baseInitiale])
  const regler = (r: Reglage) => { if (r.metier) setPrereglage(r.metier); if (r.base !== undefined) setBase(r.base); if (infra) ecrireReglage({ metier: r.metier ?? prereglage, base: r.base !== undefined ? r.base : base }) }
  const scene = useMemo(() => (infra
    ? construireScene(donnees, prereglage, { ...(total !== null ? { vivant: { assistants: total } } : {}), infra: { base } })
    : construireScene(donnees, prereglage, total !== null ? { vivant: { assistants: total } } : undefined)), [donnees, prereglage, total, infra, base])
  const resume = useMemo(() => calculerAlertes(donnees), [donnees])
  const urgences = useMemo(() => urgencesDuJour(donnees, resume), [donnees, resume])
  const allumes = useMemo(() => objetsAllumes(scene.objets, filtre), [scene, filtre])
  const comptes = useMemo(() => chiffresFiltres(scene, donnees), [scene, donnees])
  const indexDe = useCallback((cle: string | null) => { const i = cle ? scene.objets.findIndex((o) => o.cle === cle) : -1; return i >= 0 ? i : null }, [scene])
  const selection = indexDe(cleSel)
  const choisi = selection !== null ? scene.objets[selection] ?? null : null
  useEffect(() => { setCleSel(null) }, [prereglage])

  // Une relecture temps réel apporte une demande inconnue de la précédente : bannière (toujours), colis qui tombe en 3D et accueil surligné
  // en 2D (hors « réduire les animations » : alors la bannière seule). useLayoutEffect : l'état de la chute est posé avant la peinture, le
  // colis n'apparaît pas une image au sol avant de tomber.
  useLayoutEffect(() => {
    if (!vivant) { connues.current = null; return }
    const apres = arriveesDe(donnees.demandes)
    const nouvelles = nouvellesArrivees(connues.current, apres)
    connues.current = apres
    if (!nouvelles.length) return
    setArrivee(nouvelles)
    if (calme()) return
    const ids = new Set(nouvelles.map((n) => n.id))
    setChute({ debut: performance.now(), index: (scene.colis ?? []).filter((c) => ids.has(c.id)).map((c) => c.index) })
    setSurligne('accueil')
  }, [vivant, donnees.demandes, scene])
  // La bannière se ferme seule après 8 s, le surlignage de l'accueil (2D) après 5 s.
  useEffect(() => { if (!arrivee) return; const t = setTimeout(() => setArrivee(null), 8000); return () => clearTimeout(t) }, [arrivee])
  useEffect(() => { if (!surligne) return; const t = setTimeout(() => setSurligne(null), 5000); return () => clearTimeout(t) }, [surligne])
  const fermer = useCallback(() => setCleSel(null), [])
  const vers2D = useCallback((v: string) => onVue2D?.(v), [onVue2D])
  const choisirIndex = useCallback((i: number | null) => { setVisite(null); setCleSel(i === null ? null : scene.objets[i]?.cle ?? null) }, [scene])
  const annonce = filtre ? `${comptes[filtre]} élément${comptes[filtre] > 1 ? 's' : ''} : ${LIBELLES_FILTRE[filtre].toLowerCase()}` : `${scene.objets.length} éléments`

  // « Mis à jour : Tâche » : une phrase qui s'efface, dite aussi aux lecteurs d'écran (aria-live polite).
  useEffect(() => {
    if (!dernier) return
    setFlash(`Mis à jour : ${dernier.libelle.toLowerCase()}`)
    const t = setTimeout(() => setFlash(null), 4500)
    return () => clearTimeout(t)
  }, [dernier])

  // ── Le briefing du matin : la caméra va de chantier en chantier, la carte dit ce qui s'y passe ──────────────────
  const etape = visite ? visite.etapes[visite.i] ?? null : null
  const focus = etape?.objetCle ? indexDe(etape.objetCle) : null
  useEffect(() => { if (visite && focus === null) commandes.current?.recentrer() }, [visite, focus])
  useEffect(() => {
    if (!visite || !visite.auto) return
    const t = setTimeout(() => setVisite((v) => (v && v.i < v.etapes.length - 1 ? { ...v, i: v.i + 1 } : null)), 9000)
    return () => clearTimeout(t)
  }, [visite])
  const lancerBriefing = () => {
    const etapes = construireBriefing(donnees, (k) => scene.objets.some((o) => o.cle === k))
    setCleSel(null); setFiltre(null)
    setVisite({ etapes, i: 0, auto: !calme() })
  }
  const ouvrirUrgence = (u: Urgence) => {
    setVisite(null)
    const cle = u.objetCle && scene.objets.some((o) => o.cle === u.objetCle) ? u.objetCle : null
    if (cle) setCleSel(cle)
  }

  const marque = selection ?? focus
  return (
    <div className={`atl${choisi ? ' avec-panneau' : ''}`} data-atelier-mode={mode ?? 'attente'}>
      {/* Infrastructure (drapeau crmAtelierVivant) : la barre tient sur UNE ligne de 1280 à 1920 px — libellés raccourcis sous 1600 px
          (.atl-long), métier et lieu rangés dans le menu « Réglages de l’atelier », filtres qui défilent plutôt que de passer à la ligne. */}
      <div className={`atl-barre${infra ? ' une-ligne' : ''}`} role="toolbar" aria-label="Atelier" data-atelier-barre>
        <button type="button" className="atl-ensemble" onClick={() => { setFiltre(null); setCleSel(null); setVisite(null); commandes.current?.recentrer() }}>Vue d’ensemble</button>
        <span className={`atl-live${lien ? ` ${lien}` : ''}`} role="status" aria-label={lien ? LIBELLE_LIEN[lien] : 'En direct'}><i aria-hidden="true" />{lien ? LIBELLE_LIEN[lien] : 'Live'} <Horloge /></span>
        <button type="button" className="atl-briefing" onClick={lancerBriefing} aria-pressed={!!visite}>Briefing<span className="atl-long"> du matin</span></button>
        {donnees.demandes.length > 0 && (
          <button type="button" className="atl-notif" onClick={() => choisirIndex(scene.objets.findIndex((o) => o.type === 'accueil'))}>
            {donnees.demandes.length} <span className="atl-long">nouvelle{donnees.demandes.length > 1 ? 's' : ''} </span>demande{donnees.demandes.length > 1 ? 's' : ''}
          </button>
        )}
        <div className="atl-filtres" role="group" aria-label="Filtrer la maquette">
          {FILTRES.map((f) => (
            <button key={f} type="button" aria-pressed={filtre === f} className={filtre === f ? 'on' : ''} onClick={() => setFiltre(filtre === f ? null : f)} data-atelier-filtre={f}
              title={f === 'stock_bas' ? 'Nombre de matériaux sous leur seuil (comme le tableau de bord)' : f === 'livraison' ? 'Commandes fournisseur dont la livraison annoncée est dépassée' : undefined}>
              {LIBELLES_FILTRE[f]} <span className="tnum">{comptes[f]}</span>
            </button>
          ))}
        </div>
        {!infra && (
          <label className="atl-metier">
            <span className="crm-sr">Préréglage de l’atelier</span>
            <select value={prereglage} onChange={(e) => setPrereglage(e.target.value as Prereglage)}>
              {PREREGLAGES.map((p) => <option key={p} value={p}>{LIBELLES_PREREGLAGE[p]}</option>)}
            </select>
          </label>
        )}
        {infra && scene.infra && (
          <details className="atl-reglages" data-atelier-base={scene.infra.base}>
            <summary title={`${LIBELLES_PREREGLAGE[prereglage]} · ${LIBELLES_BASE[scene.infra.base]}`}>Réglages<span className="atl-long"> de l’atelier</span></summary>
            <div className="atl-reglages-corps">
              <label className="atl-metier">
                <span>Métier</span>
                <select value={prereglage} onChange={(e) => regler({ metier: e.target.value as Prereglage })}>
                  {PREREGLAGES.map((p) => <option key={p} value={p}>{LIBELLES_PREREGLAGE[p]}</option>)}
                </select>
              </label>
              <label className="atl-metier">
                <span>Lieu de travail</span>
                <select value={base ?? ''} onChange={(e) => regler({ base: (e.target.value || null) as Base | null })} title="Le lieu se déduit de votre équipe, de vos véhicules, de votre stock et de votre statut ; vous pouvez le dire vous-même (gardé dans ce navigateur, rien n’est envoyé).">
                  <option value="">{`Automatique · ${LIBELLES_BASE[scene.infra.profil.baseDeduite]}`}</option>
                  {BASES.map((b) => <option key={b} value={b}>{LIBELLES_LIEU[b]}</option>)}
                </select>
              </label>
              {/* D'où vient le choix : dit en toutes lettres. */}
              <span className="atl-origine" data-atelier-origine={scene.infra.auto ? 'deduit' : 'choisi'}>{scene.infra.auto ? 'déduit de vos données' : 'choisi par vous'}</span>
            </div>
          </details>
        )}
        <details className="atl-aide">
          <summary aria-label="Aide : lire la maquette">?</summary>
          <div className="atl-aide-corps">
            <p><b>La maquette est faite de vos données</b>, rien n’y est dessiné à l’avance, et elle se met à jour toute seule.</p>
            <ul>
              <li><b>Chantiers</b> : une maison par chantier ouvert, avec son équipe, la barre des tâches faites et ses alertes (retard, livraison, stock). Le terrain pulse en cas d’urgence.</li>
              <li><b>Dépôt</b> : un rayonnage par catégorie d’inventaire ; il pulse en corail quand un matériau passe sous son seuil.</li>
              <li><b>Accueil</b> : un colis par nouvelle demande. <b>Parking</b> : une camionnette par véhicule. <b>Bureau</b> : ouvre le tableau de bord, le pipeline et les clients.</li>
              <li><b>Briefing du matin</b> : la caméra passe de chantier en chantier et lit ce qui s’y passe.</li>
            </ul>
            <p>Cliquez un objet pour ouvrir sa fiche. Glissez pour tourner, molette ou pincement pour zoomer, clic droit pour déplacer. Les filtres allument ce qui vous concerne et estompent le reste. Au clavier, ouvrez « Liste des éléments » ou passez au plan 2D.</p>
          </div>
        </details>
        {detection && (
          <button type="button" className="atl-bascule" disabled={mode === '2d' && !detection.webgl} title={!detection.webgl ? 'WebGL indisponible sur ce navigateur' : undefined}
            onClick={() => { setCleSel(null); setMode(mode === '3d' ? '2d' : '3d') }}>
            {mode === '3d' ? 'Plan 2D' : 'Maquette 3D'}
          </button>
        )}
      </div>
      <p className="crm-sr" aria-live="polite">{flash ?? annonce}</p>

      <div className="atl-cadre">
        {/* La zone annoncée existe avant la bannière (un lecteur d'écran n'annonce de façon fiable que ce qui entre dans une zone déjà là). */}
        {vivant && (
          <div className="atl-arrivee-zone" role="status" aria-live="polite" data-atelier-arrivee-zone>
            {arrivee && (
              <div className="atl-arrivee" data-atelier-arrivee>
                <span>{texteArrivee(arrivee)}</span>
                <button type="button" className="psh-btn primary" onClick={() => { const i = scene.objets.findIndex((o) => o.type === 'accueil'); setArrivee(null); if (i >= 0) choisirIndex(i) }}>Voir</button>
                <button type="button" className="atl-arrivee-fermer" aria-label="Fermer l’annonce" onClick={() => setArrivee(null)}>×</button>
              </div>
            )}
          </div>
        )}
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
                <Scene3D ref={commandes} scene={scene} allumes={allumes} filtreActif={filtre !== null} selection={marque} onSelection={choisirIndex} mesure={mesure} vueInitiale={vueInitiale ?? 'ensemble'} chute={vivant ? chute : null} heure={infra ? heure ?? null : null} />
              </GardeRendu>
            </div>
            <Urgences urgences={urgences} variante="carte" actif={choisi?.cle ?? etape?.objetCle ?? null} onChoisir={ouvrirUrgence} />
            {flash && <p className="atl-flash" aria-hidden="true">{flash}</p>}
            {etape && visite && <CarteBriefing etape={etape} i={visite.i} n={visite.etapes.length} auto={visite.auto}
              onPrecedent={() => setVisite({ ...visite, i: Math.max(0, visite.i - 1) })} onSuivant={() => setVisite(visite.i < visite.etapes.length - 1 ? { ...visite, i: visite.i + 1 } : null)}
              onAuto={() => setVisite({ ...visite, auto: !visite.auto })} onOuvrir={() => { if (etape.objetCle) { setCleSel(etape.objetCle); setVisite(null) } }} onArreter={() => setVisite(null)} />}
            {/* Ce que la 3D montre, lisible sans elle : la liste des objets reste atteignable au clavier. */}
            <details className="atl-liste-3d">
              <summary>Liste des éléments de la maquette</summary>
              <Plan2D scene={scene} allumes={allumes} filtreActif={filtre !== null} selection={marque} onSelection={choisirIndex} raison={null} surligne={vivant ? surligne : null} />
            </details>
          </>
        )}
        {mode === '2d' && (
          <Plan2D scene={scene} allumes={allumes} filtreActif={filtre !== null} selection={marque} onSelection={choisirIndex} raison={detection?.raison ?? null} surligne={vivant ? surligne : null}
            avant={<>
              <Urgences urgences={urgences} variante="liste" actif={choisi?.cle ?? null} onChoisir={ouvrirUrgence} />
              {etape && visite && <CarteBriefing etape={etape} i={visite.i} n={visite.etapes.length} auto={false}
                onPrecedent={() => setVisite({ ...visite, i: Math.max(0, visite.i - 1) })} onSuivant={() => setVisite(visite.i < visite.etapes.length - 1 ? { ...visite, i: visite.i + 1 } : null)}
                onAuto={() => {}} onOuvrir={() => { if (etape.objetCle) { setCleSel(etape.objetCle); setVisite(null) } }} onArreter={() => setVisite(null)} />}
            </>} />
        )}
        {mode === null && <div className="atl-charge" role="status">Préparation de l’atelier…</div>}
        {choisi && <Panneau objet={choisi} donnees={donnees} demo={demo} resume={resume} onFermer={fermer} onVue2D={vers2D} onChange={onChange ?? (() => {})} vue={vivant ? vue : undefined} poste={poste} />}
      </div>
      <Legende horsScene={scene.horsScene} sansCommandes={donnees.commandesDisponibles === false} />
    </div>
  )
}

function CarteBriefing({ etape, i, n, auto, onPrecedent, onSuivant, onAuto, onOuvrir, onArreter }: {
  etape: EtapeBriefing; i: number; n: number; auto: boolean
  onPrecedent: () => void; onSuivant: () => void; onAuto: () => void; onOuvrir: () => void; onArreter: () => void
}) {
  return (
    <section className={`atl-brief g-${etape.gravite}`} aria-label="Briefing du matin" aria-live="polite" data-atelier-briefing>
      <p className="atl-brief-pas tnum">Briefing · {i + 1}/{n}</p>
      <h2>{etape.titre}</h2>
      <p>{etape.texte}</p>
      <div className="crm-boutons">
        <button type="button" className="psh-btn ghost" onClick={onPrecedent} disabled={i === 0}>Précédent</button>
        <button type="button" className="psh-btn primary" onClick={onSuivant}>{i < n - 1 ? 'Suivant' : 'Terminer'}</button>
        {etape.objetCle && <button type="button" className="psh-btn ghost" onClick={onOuvrir}>Ouvrir la fiche</button>}
        {!calme() && <button type="button" className="psh-btn ghost" onClick={onAuto} aria-pressed={auto}>{auto ? 'Pause' : 'Lecture'}</button>}
        <button type="button" className="psh-btn ghost" onClick={onArreter}>Arrêter</button>
      </div>
    </section>
  )
}

function Legende({ horsScene, sansCommandes }: { horsScene: { chantiers: number; categories: number; vehicules: number; demandes: number }; sansCommandes: boolean }) {
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
      <span><i style={{ background: COULEURS.vert }} />À facturer · tâches faites</span>
      <span><i style={{ background: COULEURS.corail, opacity: 0.45 }} />Terrain ou rayonnage qui pulse : urgence ou stock bas</span>
      <span><i style={{ background: COULEURS.bois, opacity: 0.6 }} />Palette pâle : livraison attendue, pas encore là</span>
      {sansCommandes && <span className="atl-hors">Suivi des commandes pas encore installé sur cette base : aucune livraison ne peut être signalée en retard.</span>}
      {hors.length > 0 && <span className="atl-hors">Hors maquette (place limitée) : {hors.join(', ')} — ils restent dans les onglets Chantiers, Pipeline et dans l’Inventaire, et dans les urgences.</span>}
    </div>
  )
}
