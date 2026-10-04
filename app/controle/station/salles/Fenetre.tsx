'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { SALLES, SALLE_RESERVEE } from '@/lib/pilotage/equipage'
import type { Env, Equipage, Role } from '../Station'
import Resume, { type ResumeInfos } from './Resume'
import { HORS_PERIMETRE, messagePanne, type Etat, type Rep } from './lecture'

// Le cadre commun des panneaux (fiche 026-120) : une fenêtre à bord néon par-dessus la carte au bureau (la barre reste
// visible), une feuille plein écran au téléphone. Elle porte le rôle « dialog », prend le focus à l'ouverture et le rend à
// la fermeture ; « Fermer » (et Échap, dans Panneaux) retire le paramètre de l'adresse. Aucune lecture ici : seulement
// l'âge de la dernière lecture servie, recalculé à la seconde tant que la fenêtre est ouverte et la page visible.

/** Pose des paramètres dans l'adresse (null = retirer), sans quitter la page. */
export type PoserUrl = (p: Record<string, string | null>) => void
export type SalleProps = { role: Role; equipage: Env<Equipage> | null; poser: PoserUrl; onFermer: () => void }

export const GENRE_DE: Record<string, string> = Object.fromEntries([...SALLES, SALLE_RESERVEE].map((s) => [s.cle, s.genre]))
export const PLAQUE_DE: Record<string, string> = Object.fromEntries([...SALLES, SALLE_RESERVEE].map((s) => [s.cle, s.plaque]))

type Attribut = 'data-salle-panneau' | 'data-salle-agents' | 'data-fiche-agent'
type Props = {
  cle: string
  attribut?: Attribut
  titre: string
  genre?: string
  onFermer: () => void
  /** La lecture du panneau : donne l'âge servi (synchro) et le résumé commun. */
  etat?: Etat<Rep<any>> | null
  /** Le résumé de salle commun : donné, il est monté en tête du panneau. */
  resume?: (ResumeInfos & { equipage: Env<Equipage> | null; poser: PoserUrl }) | null
  children?: ReactNode
}

const age = (a: string | undefined): number | null => { const t = a ? Date.parse(a) : NaN; return Number.isFinite(t) ? Math.max(0, Math.round((Date.now() - t) / 1000)) : null }

/** « synchro il y a n s · auto 30 s » : l'âge de la lecture servie (`a`), à la seconde, seulement ouverte et visible. */
function Synchro({ a }: { a: string | undefined }) {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => {
    const maj = () => { if (document.visibilityState !== 'hidden') setN(age(a)) }
    maj()
    const minuterie = window.setInterval(maj, 1000)
    return () => window.clearInterval(minuterie)
  }, [a])
  return <p className="mc-synchro" data-synchro>{n === null ? 'synchro — · auto 30 s' : `synchro il y a ${n} s · auto 30 s`}</p>
}

export default function Fenetre({ cle, attribut = 'data-salle-panneau', titre, genre, onFermer, etat = null, resume = null, children }: Props) {
  const racine = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const avant = document.activeElement instanceof HTMLElement ? document.activeElement : null
    racine.current?.focus({ preventScroll: true })
    return () => { if (avant && avant !== document.body && document.contains(avant)) avant.focus({ preventScroll: true }) }
  }, [])
  // Le focus reste dans la fenêtre (aria-modal) : Tab et Maj+Tab font le tour de ses éléments.
  function piege(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab' || !racine.current) return
    const f = [...racine.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')].filter((x) => x.getClientRects().length > 0)
    if (!f.length) return
    const premier = f[0], dernier = f[f.length - 1], actif = document.activeElement
    if (e.shiftKey && (actif === premier || actif === racine.current)) { e.preventDefault(); dernier.focus() }
    else if (!e.shiftKey && actif === dernier) { e.preventDefault(); premier.focus() }
  }
  const attributs = { [attribut]: cle } as Record<string, string>
  return (
    <div {...attributs} ref={racine} className="mc-fenetre" role="dialog" aria-modal="true" aria-label={titre} tabIndex={-1} data-genre={genre ?? GENRE_DE[cle] ?? 'travail'} onKeyDown={piege}>
      <header className="mc-fen-tete">
        <h2 className="mc-fen-titre">{titre}</h2>
        <button type="button" data-fermer className="mc-fermer" onClick={onFermer}>Fermer</button>
      </header>
      {etat?.rep ? <Synchro a={etat.rep.a} /> : null}
      {resume ? <Resume cle={cle} {...resume} rep={etat?.rep ?? null} /> : null}
      <div className="mc-fen-corps">{children}</div>
    </div>
  )
}

/** Le corps d'un panneau selon ce que la lecture a rendu : valeur, manque, hors périmètre, panne — jamais un 0 qui rassure. */
export function Corps<T>({ etat, quoi, children }: { etat: Etat<Rep<T>>; quoi: string; children: (v: T, rep: Rep<T>) => ReactNode }) {
  const { rep, panne } = etat
  if (!rep) return panne ? <p className="mc-panne" role="alert">{messagePanne(quoi, panne)}</p> : <p className="mc-etat" role="status">Chargement…</p>
  const avertissement = panne ? <p className="mc-panne" role="alert">{messagePanne(quoi, panne)}</p> : null
  if (rep.valeur !== null && rep.valeur !== undefined) return <>{avertissement}{children(rep.valeur, rep)}</>
  if (rep.nonMesure) return <p className="mc-etat">{HORS_PERIMETRE}</p>
  if (rep.erreur) return <p className="mc-panne" role="alert">{messagePanne(rep.source ?? quoi, rep.erreur)}</p>
  if (rep.manque) return <p className="mc-etat">{rep.manque}</p>
  return <p className="mc-etat">—</p>
}

/** Une pastille d'état : le texte servi, sa teinte (ok, warn, crit, actif, muet). */
export function Pastille({ ton, children }: { ton: 'ok' | 'warn' | 'crit' | 'actif' | 'muet'; children: ReactNode }) {
  return <span className="mc-etiquette" data-ton={ton}>{children}</span>
}

export type Onglet = { cle: string; libelle: string }
/** Les onglets d'un panneau : un bouton [data-onglet] par onglet, un seul contenu monté à la fois. */
export function Onglets({ liste, actif, choisir, nom }: { liste: Onglet[]; actif: string; choisir: (cle: string) => void; nom: string }) {
  return (
    <div className="mc-onglets" role="tablist" aria-label={nom}>
      {liste.map((o) => (
        <button key={o.cle} type="button" role="tab" data-onglet={o.cle} aria-selected={o.cle === actif} onClick={() => choisir(o.cle)}>{o.libelle}</button>
      ))}
    </div>
  )
}

/** Une tuile : un libellé en capitales, sa valeur en chiffres à chasse fixe, une note facultative. */
export function Tuile({ libelle, children, note, attribut }: { libelle: string; children: ReactNode; note?: ReactNode; attribut?: string }) {
  const marque = attribut ? ({ 'data-tuile': attribut } as Record<string, string>) : {}
  return (
    <div className="mc-tuile" {...marque}>
      <span className="mc-tuile-l">{libelle}</span>
      <span className="mc-tuile-v">{children}</span>
      {note ? <span className="mc-tuile-n">{note}</span> : null}
    </div>
  )
}

export type TacheServie = { numero: number; type: string; statut: string; resultat: string | null; le?: string | null }
const TON_STATUT: Record<string, 'ok' | 'warn' | 'crit' | 'actif' | 'muet'> = { FAIT: 'ok', 'REJETÉ': 'crit', 'ANNULÉ': 'muet', 'BLOQUÉ': 'warn', 'EN COURS': 'actif' }
/** Les tâches récentes d'un agent : « #numéro · type », la pastille de son statut servi, « ↳ résultat », et son coût s'il est servi. */
export function ListeTaches({ taches, couts }: { taches: TacheServie[]; couts?: Map<number, string> }) {
  if (taches.length === 0) return <p className="mc-etat">Aucune tâche récente.</p>
  return (
    <ul className="mc-liste mc-taches" data-groupe="taches">
      {taches.map((t) => (
        <li key={t.numero} data-tache={t.numero}>
          <span className="mc-tache-l"><span className="mc-chiffre">#{t.numero}</span> <span>{t.type}</span></span>
          <Pastille ton={TON_STATUT[t.statut] ?? 'muet'}>{t.statut}</Pastille>
          {couts?.has(t.numero) ? <span className="mc-chiffre" data-cout-tache>{couts.get(t.numero)}</span> : null}
          {t.resultat ? <small className="mc-tache-r">↳ {t.resultat}</small> : null}
        </li>
      ))}
    </ul>
  )
}
