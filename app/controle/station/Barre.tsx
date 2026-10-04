'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { euros } from '@/lib/direction/fraicheur'
import type { BarreDonnees, Env, Poser, Role, Tresorerie } from './Station'

// La barre du haut (bureau) : deux lignes, 36 puis 44 px. Ligne 1 : le retour au Poste, le titre, la version, la santé, le
// fil d'Ariane, le jour et l'heure de Paris, la lune ou le soleil, ⚑, les notifications, la cloche et AUTO. Ligne 2 : les
// compteurs. Rien n'est calculé ici : chaque valeur vient d'une réponse servie, et une source en panne se dit.
//
// Ce fichier porte aussi les petits outils que les autres composants de la station partagent (lecture d'une enveloppe,
// compteurs à afficher, stockage du navigateur sous try/catch), pour qu'aucun d'eux n'ait à importer Station.tsx.

// ── Lecture d'une enveloppe { valeur, source, a, erreur?, manque?, nonMesure? } ──────────────────────────────────────────
export type Lecture<T> = { etat: 'chargement' } | { etat: 'ok'; valeur: T } | { etat: 'hors' } | { etat: 'panne'; raison: string }

export function lire<T>(env: Env<T> | null | undefined, erreurVue: string | null = null): Lecture<T> {
  if (!env) return erreurVue ? { etat: 'panne', raison: erreurVue } : { etat: 'chargement' }
  if (env.nonMesure) return { etat: 'hors' }
  if (env.valeur === null || env.valeur === undefined) return { etat: 'panne', raison: env.erreur ?? env.manque ?? 'pas de réponse' }
  return { etat: 'ok', valeur: env.valeur }
}

/** « <source> ne répond pas : <erreur> » — jamais un 0 ni une liste vide rassurante. */
export const messagePanne = (source: string, raison: string) => `${source} ne répond pas : ${raison}`

// ── Le stockage du navigateur : fermé, plein ou absent, la station marche quand même ────────────────────────────────────
export function lireStockage(cle: string): string | null {
  try { return window.localStorage.getItem(cle) } catch { return null }
}
export function ecrireStockage(cle: string, valeur: string) {
  try { window.localStorage.setItem(cle, valeur) } catch { /* stockage fermé : l'état ne survivra pas au rechargement */ }
}

// ── Les compteurs à afficher, dans l'ordre : trois d'argent, COMMANDES · MOIS, SITES EN LIGNE, puis ceux de la barre ────
export type CompteurAffiche = { cle: string; libelle: string; valeur: string; note?: string; ton: 'normal' | 'alerte' | 'muet' }

const HORS = '· hors périmètre'

function mesure(cle: string, libelle: string, l: Lecture<number>, texte: (n: number) => string): CompteurAffiche {
  if (l.etat === 'ok') return { cle, libelle, valeur: texte(l.valeur), ton: 'normal' }
  if (l.etat === 'hors') return { cle, libelle, valeur: '—', note: HORS, ton: 'muet' }
  if (l.etat === 'panne') return { cle, libelle, valeur: '—', note: l.raison, ton: 'alerte' }
  return { cle, libelle, valeur: '…', ton: 'muet' }
}

export function compteursDe(barre: Env<BarreDonnees> | null, tresorerie: Tresorerie | null, erreurTresorerie: string | null, erreurVue: string | null): CompteurAffiche[] {
  const out: CompteurAffiche[] = []
  // Trésorerie : les trois chiffres d'argent sont ceux de la Comptabilité (euros() est la seule fonction de montants).
  const argent: [string, string, () => Lecture<number>][] = [
    ['encaisse_mois', 'ENCAISSÉ · MOIS', () => { const l = lire(tresorerie?.encaisse?.mois); return l.etat === 'ok' ? { etat: 'ok', valeur: l.valeur.net } : l }],
    ['depense_mois', 'DÉPENSÉ · MOIS', () => lire(tresorerie?.depenses_mois)],
    ['marge_mois', 'MARGE · MOIS', () => lire(tresorerie?.marge)],
  ]
  for (const [cle, libelle, lecture] of argent) {
    if (!tresorerie) out.push(erreurTresorerie ? { cle, libelle, valeur: '—', note: 'Trésorerie ne répond pas', ton: 'alerte' } : { cle, libelle, valeur: '…', ton: 'muet' })
    else out.push(mesure(cle, libelle, lecture(), euros))
  }
  const b = lire(barre, erreurVue)
  const donnees = b.etat === 'ok' ? b.valeur : null
  out.push(mesure('commandes_mois', 'COMMANDES · MOIS', lire(donnees?.commandes_mois, b.etat === 'panne' ? b.raison : null), String))
  out.push(mesure('sites_en_ligne', 'SITES EN LIGNE', lire(donnees?.sites_en_ligne, b.etat === 'panne' ? b.raison : null), String))
  if (donnees) for (const c of donnees.compteurs) out.push({ cle: c.cle, libelle: c.libelle, valeur: c.texte, ton: c.ton })
  return out
}

const HEURE_PARIS = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
export const heureParis = (ms: number) => HEURE_PARIS.format(new Date(ms))

const SANTE: Record<string, string> = { 'en ligne': 'STATION EN LIGNE', 'dégradée': 'DÉGRADÉE', 'hors ligne': 'HORS LIGNE' }

/** La pastille d'état : l'état servi, la raison au survol, « — » tant que la sous-partie dit `manque` ou n'est pas lue. */
export function Sante({ barre, erreurVue, court = false }: { barre: Env<BarreDonnees> | null; erreurVue: string | null; court?: boolean }) {
  const b = lire(barre, erreurVue)
  const s = b.etat === 'ok' ? lire(b.valeur.sante) : null
  const etat = s?.etat === 'ok' ? s.valeur.etat : null
  const texte = etat ? SANTE[etat] ?? '—' : '—'
  const titre = s?.etat === 'ok' ? (s.valeur.raison ?? texte) : s?.etat === 'panne' ? s.raison : 'état non lu'
  return <span data-sante data-etat={etat ?? 'inconnu'} className="mc-sante" title={titre} aria-label={`État de la station : ${texte}`}>{court ? '' : texte}</span>
}

import { InterrupteurAuto } from './Gestes'

/** Le bouton AUTO : rendu par InterrupteurAuto (en lecture seule pour le rôle lecture). */
export function Auto({ barre, role = 'direction' }: { barre: Env<BarreDonnees> | null; role?: Role }) {
  const b = lire(barre)
  const auto = b.etat === 'ok' ? b.valeur.auto : null
  const [estLecture, setEstLecture] = useState(role === 'lecture')

  useEffect(() => {
    if (role === 'lecture') { setEstLecture(true); return }
    const verifier = () => {
      if (document.querySelector('.mc[data-role="lecture"], .mc-lecture, [data-lecture-seule]')) {
        setEstLecture(true)
      }
    }
    verifier()
    const timer = setInterval(verifier, 100)
    return () => clearInterval(timer)
  }, [role])

  return <InterrupteurAuto auto={auto} role={estLecture ? 'lecture' : role} />
}


export function Cloche({ barre }: { barre: Env<BarreDonnees> | null }) {
  const b = lire(barre)
  const n = b.etat === 'ok' ? b.valeur.cloche : null
  return <span data-cloche title="Ce qui attend l’artisan" aria-label={`File d’attention : ${n ?? 'inconnue'}`}>🔔 {n ?? '—'}</span>
}

/** Un compteur : étiquette en petites capitales, valeur en mono ; la panne et le hors périmètre s'écrivent, jamais un 0. */
export function Compteur({ c }: { c: CompteurAffiche }) {
  return (
    <div className="mc-cpt" data-compteur={c.cle} data-ton={c.ton}>
      <span className="mc-cpt-l" data-libelle>{c.libelle}</span>
      <span className="mc-cpt-v" data-valeur>{c.valeur}</span>
      {c.note ? <span className="mc-cpt-n">{c.note}</span> : null}
    </div>
  )
}

type Props = {
  role: Role
  barre: Env<BarreDonnees> | null
  erreurVue: string | null
  tresorerie: Tresorerie | null
  erreurTresorerie: string | null
  titre: string
  maintenant: number
  ariane: string
  poser: Poser
  onMissions: () => void
}

export default function Barre({ role, barre, erreurVue, tresorerie, erreurTresorerie, titre, maintenant, ariane, poser, onMissions }: Props) {
  const b = lire(barre, erreurVue)
  const donnees = b.etat === 'ok' ? b.valeur : null
  const version = donnees ? lire(donnees.version) : null
  const [notif, setNotif] = useState<'actif' | 'inactif' | 'refuse' | 'absent'>('inactif')
  // L'état de Web Push sur CET appareil : lu dans le navigateur, jamais servi.
  useEffect(() => {
    try {
      if (typeof Notification === 'undefined') { setNotif('absent'); return }
      setNotif(Notification.permission === 'granted' ? 'actif' : Notification.permission === 'denied' ? 'refuse' : 'inactif')
    } catch { setNotif('absent') }
  }, [])
  const compteurs = compteursDe(barre, tresorerie, erreurTresorerie, erreurVue)
  return (
    <header className="mc-barre" data-zone="barre">
      <div className="mc-ligne1" data-barre-ligne="1">
        <Link href="/controle" className="mc-retour" data-retour-poste>← Poste</Link>
        <span className="mc-titre" data-titre>{titre}</span>
        {version?.etat === 'ok' ? <span className="mc-version" data-version>{version.valeur}</span> : null}
        <Sante barre={barre} erreurVue={erreurVue} />
        <span className="mc-ariane" data-ariane>{ariane}</span>
        {role === 'lecture' ? <span className="mc-lecture">lecture seule</span> : null}
        <span className="mc-temps">
          {donnees ? <span data-jour>{donnees.jour}</span> : null}
          {donnees ? ' · ' : null}
          <span data-heure>{heureParis(maintenant)}</span>
        </span>
        {donnees ? <span className="mc-nuit" data-nuit={donnees.nuit ? 'lune' : 'soleil'} aria-label={donnees.nuit ? 'Nuit' : 'Jour'}>{donnees.nuit ? '☾' : '☀'}</span> : null}
        <button type="button" className="mc-icone" data-drapeau-missions aria-label="Missions" title="Missions" onClick={onMissions}>⚑</button>
        {role === 'direction' ? (
          <button type="button" className="mc-icone" data-notifications data-etat={notif} aria-label={`Notifications sur cet appareil : ${notif}`} title={`Notifications sur cet appareil : ${notif}`} onClick={() => poser({ vue: 'reglages' })}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7z" /><path d="M10 20a2 2 0 0 0 4 0" />{notif === 'actif' ? null : <path d="M4 4l16 16" />}</svg>
          </button>
        ) : null}
        <Cloche barre={barre} />
        <Auto barre={barre} role={role} />
      </div>
      <div className="mc-ligne2" data-barre-ligne="2">
        {compteurs.map((c) => <Compteur key={c.cle} c={c} />)}
      </div>
    </header>
  )
}

