'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SALLES } from '@/lib/pilotage/equipage'
import { apiDirection } from '../client'
import Attention from './Attention'
import Bandeau, { ToastErreurs } from './Bandeau'
import Barre, { ecrireStockage, lire, lireStockage } from './Barre'
import Carte from './Carte'
import Commandement from './Commandement'
import Equipage from './Equipage'
import Habillage from './Habillage'
import Journal from './Journal'
import Panneaux from './Panneaux'
import Telephone from './Telephone'
import Vues from './Vues'

// La station Mission Control : l'orchestration (lectures du direct, de la trésorerie, du fil et des réglages ; cadence ;
// visibilité de la page ; pause du direct après 15 min sans geste) et la disposition (bureau : colonnes ou flottante ;
// téléphone : onglets). L'écran n'ordonne, ne filtre et ne calcule rien : ordre d'Attention, couleurs, comptes à rebours et
// missions viennent de la route. Une source en panne se voit ; rien ne bouge sans événement.

// ── Les types des réponses (contrat des vues de la route de la station), recopiés ici une fois ───────────────────────
export type Role = 'direction' | 'lecture'
/** L'enveloppe de chaque sous-partie : sa valeur, sa source, sa date, et pourquoi elle manque ou n'est pas mesurée. */
export type Env<T> = { valeur: T | null; source?: string; a?: string; cache?: boolean; erreur?: string; manque?: string; nonMesure?: boolean; raison?: string }
export type Compteur = { cle: string; libelle: string; texte: string; ton: 'alerte' | 'normal' | 'muet'; source: string }
export type BarreDonnees = {
  compteurs: Compteur[]
  auto: { actif: boolean; texte: string }
  cloche: number | null
  heure: string
  jour: string
  nuit: boolean
  version: Env<string>
  sante: Env<{ etat: 'en ligne' | 'dégradée' | 'hors ligne'; raison: string | null }>
  erreurs: Env<number>
  commandes_mois: Env<number>
  sites_en_ligne: Env<number>
}
export type Agent = {
  nom: string
  libelle: string
  role?: string
  etat: string
  point: 'cyan' | 'jaune' | 'rouge' | 'gris'
  activite: string
  activite_le?: string | null
  cadence: string
  salle: string
  position: { salle: string; motif: string }
  modele: { texte: string; source: string }
}
export type Equipage = { agents: Agent[]; reunionEnCours: boolean; couts: Env<{ nom: string; cout_mois_eur: number | null }[]> }
export type CarteAttention = { cle: string; couleur: 'rouge' | 'orange' | 'jaune' | 'bleu'; nombre: number; titre: string; geste: { type: 'decisions' | 'appels' | 'ouvrir'; cible?: string }; agent: string | null }
export type Attention = { cartes: CarteAttention[]; total: number; vide: string | null }
export type Mission = { cle: string; libelle: string; valeur: number; cible: number; texte: string; atteinte: boolean; debloque?: string }
export type Commandement = {
  objectif: { libelle: string; par: string; progression: number | null } | null
  missions: Mission[]
  succes: { cle: string; libelle: string; le: string | null } | null
  tousSucces: unknown[]
  compteRendu: string[]
  argent: Env<{ niveau: { lv: number; xp: number; texte: string; prochainSeuil?: number; part?: number }; missions: Mission[] }>
}
export type Tapis = { etapes: unknown[]; rejet: unknown; paye: Env<unknown> }
export type BandeauDonnees = { elements: { id: number; le: string; type: string; texte: string }[] }
/** La sous-partie `carte` de vue=direct, telle que servie (lignes, expérience, paliers, nuit, égaliseur, départements). */
export type CarteDonnees = { lignes: Env<unknown>; experience: Env<unknown>; paliers: Env<unknown>; nuit: Env<boolean> } & Record<string, unknown>
export type Direct = {
  barre: Env<BarreDonnees>
  equipage: Env<Equipage>
  attention: Env<Attention>
  commandement: Env<Commandement>
  tapis: Env<Tapis>
  bandeau: Env<BandeauDonnees>
  carte: Env<CarteDonnees>
}
type ReponseDirect = { vue?: string; role?: Role; valeur?: Direct | null }
export type Bulle = { id: number; le: string; agent: string; pastille: string; type: string; texte: string; lignes?: string[]; cible?: string | null; cibleLibelle?: string | null }
type ReponseFil = { vue?: string; valeur?: { bulles: Bulle[]; dernier_id?: number | null } | null }
export type Tresorerie = {
  encaisse: { jour?: Env<unknown>; sept_jours?: Env<unknown>; mois: Env<{ brut: number; frais: number; net: number; paiements: number; rembourse: number }> }
  mrr?: Env<unknown>
  ventes_sites?: Env<unknown>
  depenses_mois: Env<number>
  cout_ia?: Env<unknown>
  marge: Env<number>
  tva?: Env<unknown>
  a?: string
}
/** GET /api/controle/station/reglages : { version, reglages (clés de la liste fermée), modifie_par, modifie_le }. */
export type ReglagesServis = { version: number; reglages: Record<string, unknown>; modifie_par: string | null; modifie_le: string | null }
/** Pose des paramètres dans l'adresse (null = retirer), sans quitter la page. */
export type Poser = (p: Record<string, string | null>) => void

// ── Constantes ───────────────────────────────────────────────────────────────────────────────────────────────────────
const CADENCE = { direct: 30_000, tresorerie: 30_000, fil: 5_000 } as const
const PAUSE_APRES_MS = 15 * 60_000
const ENTRE_DEUX_DIRECTS_MS = 5_000
const BULLES_GARDEES = 200
const TITRE_PAR_DEFAUT = 'PRESTI · MISSION CONTROL'
const PLAQUES: Record<string, string> = Object.fromEntries(SALLES.map((s) => [s.cle, s.plaque]))
type Boucle = 'direct' | 'tresorerie' | 'fil'

const objet = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)

type Props = { role: Role; decision?: string; prenom?: string }

export default function Station({ role, decision, prenom }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const routeur = useRef(router)
  routeur.current = router

  const [direct, setDirect] = useState<Direct | null>(null)
  const [erreurDirect, setErreurDirect] = useState<string | null>(null)
  const [tresorerie, setTresorerie] = useState<Tresorerie | null>(null)
  const [erreurTresorerie, setErreurTresorerie] = useState<string | null>(null)
  const [bulles, setBulles] = useState<Bulle[]>([])
  const [reglages, setReglages] = useState<ReglagesServis | null>(null)
  const [maintenant, setMaintenant] = useState(() => Date.now())
  const [pause, setPause] = useState(false)
  const [large, setLarge] = useState<boolean | null>(null)
  const [repliG, setRepliG] = useState(false)
  const [repliD, setRepliD] = useState(false)
  const [cmdOuvert, setCmdOuvert] = useState(false)

  // ── Les lectures, la cadence, la visibilité, la pause ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let vivant = true
    let dernierGeste = Date.now()
    let enPause = false
    let dernierDirect = 0
    let filMax: number | null = null
    let filLu = false
    const minuteries: Record<Boucle, number> = { direct: 0, tresorerie: 0, fil: 0 }
    const versLogin = () => routeur.current.replace(`/login?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`)

    async function lireDirect() {
      dernierDirect = Date.now()
      const r = await apiDirection<ReponseDirect>('/api/controle/station?vue=direct')
      if (!vivant) return
      if (r.status === 401) { versLogin(); return }
      if (r.status === 403 || r.status === 404) { routeur.current.replace('/dashboard'); return }
      if (r.ok && objet(r.data.valeur)) { setDirect(r.data.valeur as Direct); setErreurDirect(null) }
      else setErreurDirect(r.data.error ?? 'le direct ne répond pas')
    }
    async function lireTresorerie() {
      const r = await apiDirection<Tresorerie>('/api/controle/tresorerie')
      if (!vivant) return
      if (r.ok && objet(r.data) && objet(r.data.encaisse)) { setTresorerie(r.data); setErreurTresorerie(null) }
      else { setTresorerie(null); setErreurTresorerie(r.data.error ?? 'Trésorerie ne répond pas') }
    }
    async function lireFil() {
      // La première lecture prend les 100 dernières bulles ; les suivantes ne demandent que ce qui suit le plus grand id vu.
      const suite = filMax === null ? '' : `&apres=${filMax}`
      const r = await apiDirection<ReponseFil>(`/api/controle/station?vue=fil${suite}`)
      if (!vivant || !r.ok || !r.data.valeur || !Array.isArray(r.data.valeur.bulles)) return
      const recues = r.data.valeur.bulles
      const precedent = filMax
      const nouvelles = recues.filter((b) => precedent === null || b.id > precedent)
      if (recues.length) filMax = Math.max(filMax ?? 0, ...recues.map((b) => b.id))
      if (recues.length) {
        setBulles((avant) => {
          const connus = new Set(avant.map((b) => b.id))
          return [...avant, ...recues.filter((b) => !connus.has(b.id))].sort((x, y) => x.id - y.id).slice(-BULLES_GARDEES)
        })
      }
      // Une bulle nouvelle (jamais à la première lecture) : les positions viennent de `direct`, on le relit sans attendre
      // les 30 s — au plus une fois toutes les 5 s.
      if (filLu && nouvelles.length) relireDirectBientot()
      filLu = true
    }
    async function lireReglages() {
      const r = await apiDirection<ReglagesServis>('/api/controle/station/reglages')
      if (!vivant) return
      // 404 (drapeau baissé, route absente) ou erreur : les réglages par défaut, sans panne affichée.
      setReglages(r.ok && objet(r.data) && objet(r.data.reglages) ? r.data : null)
    }
    const lecteurs: Record<Boucle, () => Promise<void>> = { direct: lireDirect, tresorerie: lireTresorerie, fil: lireFil }

    const visible = () => document.visibilityState !== 'hidden'
    function programmer(nom: Boucle) {
      window.clearTimeout(minuteries[nom])
      if (!vivant || enPause) return
      minuteries[nom] = window.setTimeout(() => { void tourner(nom) }, CADENCE[nom])
    }
    async function tourner(nom: Boucle) {
      if (!vivant) return
      if (Date.now() - dernierGeste > PAUSE_APRES_MS) { mettreEnPause(); return }
      if (visible()) await lecteurs[nom]()
      programmer(nom)
    }
    function relireDirectBientot() {
      const attente = Math.max(0, dernierDirect + ENTRE_DEUX_DIRECTS_MS - Date.now())
      window.clearTimeout(minuteries.direct)
      minuteries.direct = window.setTimeout(() => { void tourner('direct') }, attente)
    }
    function mettreEnPause() {
      enPause = true
      for (const nom of Object.keys(minuteries) as Boucle[]) window.clearTimeout(minuteries[nom])
      setPause(true)
    }
    function toutLire() {
      for (const nom of ['direct', 'tresorerie', 'fil'] as Boucle[]) { window.clearTimeout(minuteries[nom]); void tourner(nom) }
    }
    const geste = () => {
      dernierGeste = Date.now()
      if (enPause) { enPause = false; setPause(false); toutLire() }
    }
    const visibilite = () => { if (visible() && !enPause) toutLire() }
    const relireReglages = () => { void lireReglages() }

    const GESTES = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'] as const
    for (const g of GESTES) window.addEventListener(g, geste, { passive: true })
    document.addEventListener('visibilitychange', visibilite)
    // Les réglages : une fois au chargement, puis après chaque enregistrement (le panneau des réglages le signale).
    window.addEventListener('station:reglages', relireReglages)
    void lireReglages()
    if (visible()) toutLire()
    return () => {
      vivant = false
      for (const nom of Object.keys(minuteries) as Boucle[]) window.clearTimeout(minuteries[nom])
      for (const g of GESTES) window.removeEventListener(g, geste)
      document.removeEventListener('visibilitychange', visibilite)
      window.removeEventListener('station:reglages', relireReglages)
    }
  }, [])

  // L'heure de Paris et les âges se rafraîchissent à la minute.
  useEffect(() => {
    const t = window.setInterval(() => setMaintenant(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  // Bureau (1024 px et plus) ou téléphone.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const maj = () => setLarge(mq.matches)
    maj()
    mq.addEventListener('change', maj)
    return () => mq.removeEventListener('change', maj)
  }, [])

  // Les colonnes repliées : l'état est gardé dans ce navigateur (le stockage peut être fermé, la station marche quand même).
  useEffect(() => {
    setRepliG(lireStockage('mc-replie-gauche') === 'oui')
    setRepliD(lireStockage('mc-replie-droite') === 'oui')
  }, [])
  const replier = (cote: 'gauche' | 'droite') => {
    const etat = cote === 'gauche' ? repliG : repliD
    if (cote === 'gauche') setRepliG(!etat)
    else setRepliD(!etat)
    ecrireStockage(`mc-replie-${cote}`, etat ? 'non' : 'oui')
  }

  const poser: Poser = useCallback((p) => {
    const q = new URLSearchParams(window.location.search)
    for (const [k, v] of Object.entries(p)) { if (v === null) q.delete(k); else q.set(k, v) }
    const s = q.toString()
    routeur.current.replace(`/controle/station${s ? `?${s}` : ''}`, { scroll: false })
  }, [])

  // ── Ce qui est servi, lu une fois pour tous les composants ────────────────────────────────────────────────────────
  const r = reglages && objet(reglages.reglages) ? reglages.reglages : null
  const miseEnPage: 'colonnes' | 'flottante' = r?.mise_en_page === 'flottante' ? 'flottante' : 'colonnes'
  const affichage = r && objet(r.affichage) ? r.affichage : null
  const titre = typeof affichage?.titre === 'string' && affichage.titre.trim() && affichage.titre.length <= 60 ? affichage.titre : TITRE_PAR_DEFAUT
  const vue = params.get('vue')
  const salle = params.get('salle')
  const agentOuvert = params.get('agent')
  const barre = direct?.barre ?? null
  const agentsActifs = useMemo(() => {
    const b = lire(barre)
    return b.etat === 'ok' ? b.valeur.compteurs.find((c) => c.cle === 'agents') ?? null : null
  }, [barre])
  const ariane = useMemo(() => {
    if (salle) return `Station › ${PLAQUES[salle] ?? salle}`
    if (agentOuvert) {
      const e = lire(direct?.equipage)
      const a = e.etat === 'ok' ? e.valeur.agents.find((x) => x.nom === agentOuvert) : null
      return `Station › ${a?.libelle ?? agentOuvert}`
    }
    return 'Station'
  }, [salle, agentOuvert, direct])
  const nomFondateur = prenom?.trim() || 'Commandant'

  // La carte n'est montée qu'après une première réponse 200 de vue=direct ; ses propriétés sont figées (fiche 026-111).
  const noeudCarte = direct ? <Carte equipage={direct.equipage} tapis={direct.tapis} bulles={bulles} reglages={reglages} carte={direct.carte} /> : null
  const onMissions = () => { if (miseEnPage === 'flottante' && large) setCmdOuvert((o) => !o); else poser({ vue: 'missions' }) }
  const enBureau = large === true

  const equipage = <Equipage env={direct?.equipage ?? null} erreurVue={erreurDirect} attention={direct?.attention ?? null} maintenant={maintenant} prenom={nomFondateur} replie={enBureau && repliG} poser={poser} />
  const attention = <Attention env={direct?.attention ?? null} erreurVue={erreurDirect} />
  const commandement = <Commandement env={direct?.commandement ?? null} erreurVue={erreurDirect} onFermer={miseEnPage === 'flottante' ? () => setCmdOuvert(false) : undefined} />
  const journal = <Journal bulles={bulles} role={role} equipage={direct?.equipage ?? null} agentsActifs={agentsActifs} />

  return (
    <div className={`mc ${enBureau ? 'mc-bureau' : 'mc-tel'}${enBureau && repliG ? ' mc-repli-g' : ''}${enBureau && repliD ? ' mc-repli-d' : ''}`} data-station data-mise-en-page={miseEnPage} data-role={role} data-decision={decision} data-cmd-ouvert={cmdOuvert ? 'oui' : 'non'}>
      {large === null ? null : enBureau ? (
        <>
          <Barre role={role} barre={barre} erreurVue={erreurDirect} tresorerie={tresorerie} erreurTresorerie={erreurTresorerie} titre={titre} maintenant={maintenant} ariane={ariane} poser={poser} onMissions={onMissions} />
          {noeudCarte}
          <ToastErreurs barre={barre} />
          <aside className={`mc-col mc-col-g${repliG ? ' mc-replie' : ''}`}>
            <button type="button" className="mc-replier" data-replier="gauche" aria-label={repliG ? 'Déplier l’équipage' : 'Replier l’équipage'} onClick={() => replier('gauche')}>{repliG ? '►' : '◄'}</button>
            {equipage}
            {miseEnPage === 'colonnes' && !repliG ? attention : null}
          </aside>
          {miseEnPage === 'colonnes' ? (
            <aside className={`mc-col mc-col-d${repliD ? ' mc-replie' : ''}`}>
              <button type="button" className="mc-replier" data-replier="droite" aria-label={repliD ? 'Déplier le Commandement' : 'Replier le Commandement'} onClick={() => replier('droite')}>{repliD ? '◄' : '►'}</button>
              {repliD ? null : commandement}
              {repliD ? null : journal}
            </aside>
          ) : (
            <>
              <div className="mc-flot mc-flot-att">{attention}</div>
              {cmdOuvert ? <div className="mc-flot mc-flot-cmd">{commandement}</div> : null}
              <div className="mc-flot mc-flot-journal">{journal}</div>
            </>
          )}
          <Bandeau role={role} env={direct?.bandeau ?? null} erreurVue={erreurDirect} barre={barre} tresorerie={tresorerie} vue={vue} poser={poser} />
          <Panneaux role={role} equipage={direct?.equipage ?? null} tresorerie={tresorerie} barre={barre} />
        </>
      ) : (
        <>
          <Telephone role={role} direct={direct} erreurVue={erreurDirect} tresorerie={tresorerie} erreurTresorerie={erreurTresorerie} maintenant={maintenant} prenom={nomFondateur} poser={poser} bulles={bulles} agentsActifs={agentsActifs} carte={noeudCarte} />
          <Panneaux role={role} equipage={direct?.equipage ?? null} tresorerie={tresorerie} barre={barre} />
        </>
      )}
      <Vues vue={vue} role={role} direct={direct} tresorerie={tresorerie} reglages={reglages} />
      <Habillage reglages={reglages} role={role} />
      {pause ? <div className="mc-avis" data-direct-pause role="status">Direct en pause : touche pour reprendre</div> : null}
      {!pause && direct && erreurDirect ? <div className="mc-avis mc-avis-panne" data-direct-erreur role="alert">{`Direct : la dernière lecture a échoué (${erreurDirect})`}</div> : null}
    </div>
  )
}
