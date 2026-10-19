// components/ui/base.tsx — Carte, Tuile de chiffre (avec compteur), Bento, Accordéon, Barre d'état, Squelette, État vide,
// Pastille d'offre, Pastille de statut. Refonte 18/10, étape 4.2 (piste A « Instrument »).
// Composants sans état serveur : ils affichent ce qu'on leur donne. Une valeur absente s'écrit « — », jamais « 0 ».
'use client'

import './ui.css'
import { useEffect, useState, type ReactNode } from 'react'
import { Icone } from './icones'
import { offreMinimale, peut, PLANS, type Capacite } from '@/lib/plans'

/* ── Carte ─────────────────────────────────────────────────────────────────────────────────────────── */
export function Carte({ titre, niveau = 2, action, lueur, className = '', children, id, etiquette }: {
  titre?: ReactNode; niveau?: 2 | 3; action?: { href: string; libelle: string }; lueur?: boolean; className?: string; children: ReactNode; id?: string; etiquette?: string
}) {
  const H = niveau === 3 ? 'h3' : 'h2'
  return (
    <section id={id} className={`ui-carte${lueur ? ' sweepborder' : ''}${className ? ` ${className}` : ''}`} aria-label={etiquette}>
      {titre || action ? (
        <div className="ui-carte-t">
          {titre ? <H>{titre}</H> : null}
          {action ? <a className="ui-carte-act" href={action.href}>{action.libelle} <span aria-hidden="true">→</span></a> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/* ── Compteur ──────────────────────────────────────────────────────────────────────────────────────── */
// Repris du CountUp du tableau de bord actuel (app/dashboard/page.tsx) : 0 → valeur en ~650 ms, courbe en sortie ;
// mouvement réduit : la valeur finale tout de suite. Pas de Counter.tsx dans le dépôt (retiré), d'où ce crochet.
export function useCompteur(valeur: number | null, duree = 650): number | null {
  const [n, setN] = useState<number | null>(valeur === null ? null : 0)
  useEffect(() => {
    if (valeur === null) { setN(null); return }
    if (typeof window === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches || valeur === 0) { setN(valeur); return }
    let raf = 0
    const t0 = performance.now()
    const pas = (t: number) => {
      const p = Math.min(1, (t - t0) / duree)
      setN(valeur * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(pas)
      else setN(valeur)
    }
    raf = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(raf)
  }, [valeur, duree])
  return n
}

const fmtEuros = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`
const fmtNombre = (n: number) => Math.round(n).toLocaleString('fr-FR')

/* ── Tuile de chiffre ──────────────────────────────────────────────────────────────────────────────── */
export function TuileChiffre({ libelle, valeur, format = 'nombre', sous, ton, anime = true }: {
  libelle: string; valeur: number | null; format?: 'euros' | 'nombre' | 'pourcent'; sous?: ReactNode; ton?: 'ok' | 'crit' | 'warn'; anime?: boolean
}) {
  const v = useCompteur(anime ? valeur : null)
  const affiche = anime ? v : valeur
  const texte = affiche === null || affiche === undefined ? '—' : format === 'euros' ? fmtEuros(affiche) : format === 'pourcent' ? `${Math.round(affiche)} %` : fmtNombre(affiche)
  // Le lecteur d'écran lit la valeur FINALE (pas les étapes du compteur).
  const finale = valeur === null ? 'non disponible' : format === 'euros' ? fmtEuros(valeur) : format === 'pourcent' ? `${Math.round(valeur)} %` : fmtNombre(valeur)
  return (
    <div className={`ui-tuile${ton ? ` ui-tuile--${ton}` : ''}`}>
      <small>{libelle}</small>
      <b aria-hidden="true">{texte}</b>
      <span className="ui-sr">{libelle} : {finale}</span>
      {sous ? <i>{sous}</i> : null}
    </div>
  )
}

/* ── Bento ─────────────────────────────────────────────────────────────────────────────────────────── */
export function Bento({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`ui-bento${className ? ` ${className}` : ''}`}>{children}</div>
}
export function BentoTuile({ large, haute, children }: { large?: boolean; haute?: boolean; children: ReactNode }) {
  return <div className={`${large ? 'ui-bento-l ' : ''}${haute ? 'ui-bento-h' : ''}`.trim() || undefined}>{children}</div>
}

/* ── Accordéon (details natifs) ────────────────────────────────────────────────────────────────────── */
export function Accordeon({ items }: { items: { titre: string; contenu: ReactNode; ouvert?: boolean }[] }) {
  return (
    <div className="ui-accordeon">
      {items.map((it) => (
        <details key={it.titre} open={it.ouvert}>
          <summary>{it.titre}</summary>
          <div className="ui-acc-corps">{it.contenu}</div>
        </details>
      ))}
    </div>
  )
}

/* ── Barre d'état ──────────────────────────────────────────────────────────────────────────────────── */
export function BarreEtat({ synchro, credits, offre }: { synchro: 'ok' | 'hors-ligne' | null; credits?: { restants: number | null; total: number | null }; offre?: string | null }) {
  return (
    <div className="ui-etat" role="status" aria-live="polite">
      {synchro ? <span><i className={`ui-etat-pt${synchro === 'ok' ? '' : ' hors'}`} aria-hidden="true" />{synchro === 'ok' ? 'Synchronisé' : 'Hors ligne'}</span> : null}
      {credits && credits.restants !== null ? <span><b>{credits.restants.toLocaleString('fr-FR')}</b>{credits.total ? ` / ${credits.total.toLocaleString('fr-FR')}` : ''} crédits</span> : null}
      {offre ? <span>{offre}</span> : null}
    </div>
  )
}

/* ── Squelette ─────────────────────────────────────────────────────────────────────────────────────── */
export function Squelette({ lignes = 3, variante = 'texte', etiquette = 'Chargement…' }: { lignes?: number; variante?: 'texte' | 'tableau' | 'chiffres'; etiquette?: string }) {
  return (
    <div className="ui-squelette" aria-busy="true" role="status">
      <span className="ui-sr">{etiquette}</span>
      {variante === 'chiffres'
        ? <div className="ui-tuiles" aria-hidden="true">{Array.from({ length: lignes }, (_, i) => <div key={i} className="ui-squelette"><span className="ui-sq" style={{ width: '50%' }} /><span className="ui-sq ui-sq--chiffre" /></div>)}</div>
        : Array.from({ length: lignes }, (_, i) => <span key={i} aria-hidden="true" className={`ui-sq${variante === 'tableau' ? ' ui-sq--ligne' : i === 0 ? ' ui-sq--titre' : ''}`} style={variante === 'texte' && i > 0 ? { width: `${92 - i * 13}%` } : undefined} />)}
    </div>
  )
}

/* ── État vide : ce que fait l'écran, et le premier geste ──────────────────────────────────────────── */
export function EtatVide({ titre, texte, action, icone = 'devis' }: { titre: string; texte: ReactNode; action?: { href?: string; onClick?: () => void; libelle: string }; icone?: string }) {
  return (
    <div className="ui-vide">
      <span className="ui-vide-ill" aria-hidden="true"><Icone nom={icone} /></span>
      <h3>{titre}</h3>
      <p>{texte}</p>
      {action ? (action.href
        ? <a className="ui-btn ui-btn--p" href={action.href}>{action.libelle}</a>
        : <button type="button" className="ui-btn ui-btn--p" onClick={action.onClick}>{action.libelle}</button>) : null}
    </div>
  )
}

/* ── Pastille d'offre : présentation seulement, le verrou reste côté serveur (peut(), lib/plans.ts) ── */
export function PastilleOffre({ plan, capacite, href = '/abonnement', inclus }: { plan: string | null | undefined; capacite: Capacite; href?: string; inclus?: boolean }) {
  if (peut(plan, capacite)) return inclus ? <span className="ui-offre ui-offre--inclus"><Icone nom="ok" />Inclus dans votre offre</span> : null
  const o = offreMinimale(capacite)
  if (!o) return null
  return <a className="ui-offre" href={href} title={`Disponible avec l’offre ${PLANS[o].label}`}><Icone nom="cadenas" />Disponible avec {PLANS[o].label}</a>
}

/* ── Pastille de statut ────────────────────────────────────────────────────────────────────────────── */
export function Statut({ ton = 'neutre', children }: { ton?: 'neutre' | 'accent' | 'warn' | 'ok' | 'crit'; children: ReactNode }) {
  return <span className={`ui-st ui-st--${ton}`}>{children}</span>
}
