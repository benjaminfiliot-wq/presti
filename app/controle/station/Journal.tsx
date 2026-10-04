'use client'

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { apiDirection } from '../client'
import { ecrireStockage, lireStockage } from './Barre'
import type { Bulle, Compteur, Env, Equipage, Role } from './Station'
import Transmettre from './journal/Transmettre'
import './journal/journal.css'

// Le Journal de bord de la station (fiche 026-123) : une bulle par événement réel, dans l'ordre servi par le fil.
// Station.tsx lit le fil seule (vue=fil, toutes les 5 s) et nous passe les bulles déjà masquées et groupées : ce fichier ne
// relit le fil que pour remonter l'historique d'UN agent, une fois par changement de filtre (vue=fil&agent=<nom>).
// Aucune bulle n'est jamais inventée ici : tout texte servi s'affiche tel quel, comme du texte (jamais comme du HTML).

const CLE_REPLI = 'mc-journal-replie'
const SEUIL_BAS_PX = 24
const HEURE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false })
const DATE_HEURE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' })

/** L'heure de Paris d'une bulle (« 14:32 »), ou rien si la date servie est illisible. */
function heureParis(iso: string): string {
  try { return HEURE.format(new Date(iso)) } catch { return '' }
}
function dateHeureParis(iso: string): string {
  try { return DATE_HEURE.format(new Date(iso)) } catch { return '' }
}

/** La couleur de la pastille d'un agent : une des teintes des jetons, toujours la même pour le même agent (Benj : la sienne). */
function teinte(agent: string): string {
  if (agent === 'benj') return 'b'
  let h = 0
  for (let i = 0; i < agent.length; i++) h = (h * 31 + agent.charCodeAt(i)) >>> 0
  return String(h % 4)
}

type InfoAgent = { libelle: string; role: string }
type ReponseFilAgent = { valeur?: { bulles?: Bulle[] } | null }

// ── Une bulle ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const BulleFil = memo(function BulleFil({ b, info }: { b: Bulle; info: InfoAgent | null }) {
  const idInfo = useId()
  const heure = heureParis(b.le)
  const adressee = b.type === 'consigne' && !!(b.cibleLibelle || b.cible)
  return (
    <article className="mc-bulle" data-bulle-fil={b.id} data-type={b.type} data-teinte={teinte(b.agent)}>
      <div className="mc-bulle-tete">
        <span data-pastille={b.agent} tabIndex={info ? 0 : undefined} aria-describedby={info ? idInfo : undefined}>{b.pastille}</span>
        {info ? (
          <span id={idInfo} data-info-agent role="tooltip">
            <b>{info.libelle}</b>
            {info.role ? <>{' '}<span>{info.role}</span></> : null}
          </span>
        ) : null}
        {heure ? <time className="mc-bulle-heure" dateTime={b.le} title={dateHeureParis(b.le)}>{heure}</time> : null}
      </div>
      <div className="mc-bulle-texte">
        {adressee ? <><span data-cible={b.cible ?? ''}>{`BENJ ▸ ${b.cibleLibelle ?? b.cible} :`}</span>{' '}</> : null}
        {b.texte}
      </div>
      {b.lignes && b.lignes.length > 0 ? (
        <ul className="mc-bulle-lignes">
          {b.lignes.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      ) : null}
    </article>
  )
})

// ── Le journal ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export type JournalProps = {
  bulles: Bulle[]
  role: Role
  equipage: Env<Equipage> | null
  /** Le compteur AGENTS ACTIFS de la barre : le même objet, jamais recompté ici. */
  agentsActifs: Compteur | null
}

export default function Journal({ bulles, role, equipage, agentsActifs }: JournalProps) {
  const [filtre, setFiltre] = useState('')
  const [historique, setHistorique] = useState<Bulle[]>([])
  const [lecture, setLecture] = useState<'repos' | 'charge' | 'echec'>('repos')
  const [replie, setReplie] = useState(() => lireStockage(CLE_REPLI) === 'oui')
  const [enBas, setEnBas] = useState(true)
  const [vuMax, setVuMax] = useState(0)
  const listeRef = useRef<HTMLDivElement>(null)
  const lectureNo = useRef(0)
  const hauteurVue = useRef(0) // scrollHeight de la liste à la dernière pose du suivi
  const cadreVu = useRef(0) // clientHeight de la liste à la même pose
  const forcerBas = useRef(true) // le prochain passage descend quoi qu'il arrive (premier affichage, filtre, dépliage)
  const dernierVu = useRef(0)

  // Qui est qui : le libellé et le rôle d'un agent, tirés de l'équipage servi.
  const infos = useMemo(() => {
    const m = new Map<string, InfoAgent>()
    for (const a of equipage?.valeur?.agents ?? []) m.set(a.nom, { libelle: a.libelle || a.nom, role: a.role ?? '' })
    return m
  }, [equipage])

  // Les agents présents dans le fil (pastille servie de leur première bulle), plus l'agent filtré s'il a quitté les 200 dernières.
  const agents = useMemo(() => {
    const m = new Map<string, string>()
    for (const b of bulles) if (b.agent && !m.has(b.agent)) m.set(b.agent, b.pastille || b.agent)
    for (const b of historique) if (b.agent && !m.has(b.agent)) m.set(b.agent, b.pastille || b.agent)
    if (filtre && !m.has(filtre)) m.set(filtre, filtre.toUpperCase())
    return [...m.entries()]
  }, [bulles, historique, filtre])

  // Ce qui s'affiche : tout le fil, ou l'historique de l'agent complété par ses bulles qui arrivent.
  const visibles = useMemo(() => {
    if (!filtre) return bulles
    const par = new Map<number, Bulle>()
    for (const b of historique) par.set(b.id, b)
    for (const b of bulles) if (b.agent === filtre) par.set(b.id, b)
    return [...par.values()].sort((x, y) => x.id - y.id)
  }, [bulles, filtre, historique])

  const dernierId = visibles.length ? visibles[visibles.length - 1].id : 0
  const nouvelles = enBas ? 0 : visibles.reduce((n, b) => (b.id > vuMax ? n + 1 : n), 0)

  // Le fil suit le bas tant que Benj n'est pas remonté ; sinon on compte ce qui est arrivé depuis. C'est la géométrie VIVANTE
  // de la liste (scrollTop maintenant, hauteur et cadre d'avant l'arrivée) qui décide, pas un événement de défilement qui
  // pourrait arriver après la bulle : un fil remonté n'est jamais ramené en bas par une bulle nouvelle.
  const etaitEnBas = useCallback(() => {
    const c = listeRef.current
    if (!c) return true
    const reste = hauteurVue.current - c.scrollTop
    return Math.min(reste - cadreVu.current, reste - c.clientHeight) < SEUIL_BAS_PX
  }, [])
  const poser = useCallback((c: HTMLDivElement) => { hauteurVue.current = c.scrollHeight; cadreVu.current = c.clientHeight }, [])

  useEffect(() => {
    const c = listeRef.current
    if (!c) return
    dernierVu.current = dernierId
    const suivre = forcerBas.current || etaitEnBas()
    if (suivre) { c.scrollTop = c.scrollHeight; setVuMax(dernierId) }
    setEnBas((avant) => (avant === suivre ? avant : suivre))
    poser(c)
    forcerBas.current = false
  }, [dernierId, visibles.length, filtre, replie, etaitEnBas, poser])

  // Le cadre de la liste change de hauteur quand les colonnes se remplissent (le direct arrive après le fil) : un fil qui
  // était en bas y reste.
  useEffect(() => {
    const c = listeRef.current
    if (!c || typeof ResizeObserver === 'undefined') return
    const veille = new ResizeObserver(() => {
      if (c.clientHeight === 0) return
      if (forcerBas.current || etaitEnBas()) c.scrollTop = c.scrollHeight
      poser(c)
    })
    veille.observe(c)
    return () => veille.disconnect()
  }, [etaitEnBas, poser])

  const surDefilement = useCallback(() => {
    const c = listeRef.current
    if (!c) return
    const bas = c.scrollHeight - c.scrollTop - c.clientHeight < SEUIL_BAS_PX
    poser(c)
    if (bas) setVuMax(dernierVu.current)
    setEnBas((avant) => (avant === bas ? avant : bas))
  }, [poser])

  const redescendre = useCallback(() => {
    const c = listeRef.current
    if (c) c.scrollTop = c.scrollHeight
    setVuMax(dernierVu.current)
    setEnBas(true)
  }, [])

  // Le filtre : une seule lecture vue=fil&agent=<nom> par changement ; « Tous » revient au flux sans rien relire.
  const choisir = useCallback(async (agent: string) => {
    const no = ++lectureNo.current
    forcerBas.current = true
    setFiltre(agent)
    setHistorique([])
    setEnBas(true)
    if (!agent) { setLecture('repos'); return }
    setLecture('charge')
    const r = await apiDirection<ReponseFilAgent>('/api/controle/station?vue=fil&agent=' + encodeURIComponent(agent))
    if (no !== lectureNo.current) return
    const recues = r.ok ? r.data.valeur?.bulles : undefined
    if (Array.isArray(recues)) { setHistorique(recues); setLecture('repos') } else setLecture('echec')
  }, [])

  // L'état replié se garde dans ce navigateur (lecture et écriture sous try/catch : un stockage fermé ne casse rien).
  const basculerRepli = useCallback(() => {
    const prochain = !replie
    forcerBas.current = true
    setReplie(prochain)
    ecrireStockage(CLE_REPLI, prochain ? 'oui' : 'non')
  }, [replie])

  return (
    <section className="mc-zone mc-journal" data-station-journal data-replie={replie ? 'oui' : 'non'} aria-label="Journal de bord">
      <button type="button" className="mc-jrn-replier" data-replier-journal aria-expanded={!replie} aria-label={replie ? 'Déplier le journal' : 'Replier le journal'} onClick={basculerRepli}>
        {replie ? '▲' : '▼'}
      </button>

      <div className="mc-jrn-entete">
        <h2 className="mc-titre-zone">JOURNAL DE BORD</h2>
        {agentsActifs ? <span className="mc-jrn-en-ligne" data-en-ligne>{agentsActifs.texte}</span> : null}
        {agents.length > 0 ? (
          <select className="mc-jrn-filtre" data-filtre-agent value={filtre} aria-label="Filtrer le journal par agent" onChange={(e) => { void choisir(e.target.value) }}>
            <option value="">Tous</option>
            {agents.map(([nom, pastille]) => <option key={nom} value={nom}>{pastille}</option>)}
          </select>
        ) : null}
      </div>

      <div className="mc-jrn-corps">
        {lecture === 'charge' ? <p className="mc-jrn-note" role="status">Historique en cours de lecture…</p> : null}
        {lecture === 'echec' ? <p className="mc-jrn-note mc-jrn-note-panne" role="status">Historique indisponible : seules les bulles récentes sont affichées.</p> : null}
        <div className="mc-jrn-fils" ref={listeRef} onScroll={surDefilement} role="log" aria-label="Fil du journal" tabIndex={0}>
          {visibles.length === 0 ? (
            <p className="mc-jrn-vide">{filtre ? 'Rien au journal pour cet agent.' : 'Rien au journal pour l’instant.'}</p>
          ) : visibles.map((b) => <BulleFil key={b.id} b={b} info={infos.get(b.agent) ?? null} />)}
        </div>
        {nouvelles > 0 ? (
          <button type="button" className="mc-jrn-nouvelles" onClick={redescendre}>
            {`${nouvelles} nouvelle${nouvelles > 1 ? 's' : ''} ↓`}
          </button>
        ) : null}
      </div>

      <Transmettre role={role} />
    </section>
  )
}
