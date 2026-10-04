'use client'

import { useEffect, useRef, useState } from 'react'
import type { Reponse } from '../../client'
import type { Env } from '../Station'

// La lecture d'un panneau (fiche 026-120) : à l'ouverture, puis toutes les 30 s tant que le panneau est monté ET que la page
// est visible. Fermé, le panneau est démonté : sa minuterie est arrêtée et plus aucune requête ne part. Page cachée : aucune.
// Le rythme est de 30 s par défaut ; un panneau plus lent (026-164 : 5 min pour le Radar et le Crieur, 1 min pour le Studio et le Chantier)
// le dit en troisième paramètre. Le composant fournit l'appel (apiDirection sur sa propre adresse) ; ce fichier ne connaît aucune adresse.
export const CADENCE_PANNEAU_MS = 30_000

/** La réponse d'une vue de la station : l'enveloppe sourcée de la route, à plat (valeur, source, a, et pourquoi elle manque). */
export type Rep<T> = Env<T> & { vue?: string; role?: string; error?: string }
/** L'état d'une lecture : la dernière réponse reçue (R) et, si la dernière tentative a échoué, pourquoi. */
export type Etat<R> = { rep: R | null; panne: string | null }
const estVue = (corps: unknown) => !!corps && typeof corps === 'object' && 'vue' in (corps as object)

/** `valide` dit si le corps reçu est une réponse de la vue (par défaut : une enveloppe de la station, qui porte « vue »). */
export function usePanneau<R extends object>(lire: () => Promise<Reponse<R>>, valide: (corps: any) => boolean = estVue, cadenceMs: number = CADENCE_PANNEAU_MS): Etat<R> {
  const [etat, setEtat] = useState<Etat<R>>({ rep: null, panne: null })
  const appel = useRef(lire)
  appel.current = lire
  const validation = useRef(valide)
  validation.current = valide
  useEffect(() => {
    let vivant = true
    let enCours = false
    async function tour() {
      if (enCours || document.visibilityState === 'hidden') return
      enCours = true
      try {
        const r = await appel.current()
        if (!vivant) return
        const corps = r.data as any
        if (r.ok && validation.current(corps)) setEtat({ rep: corps as R, panne: null })
        else setEtat((avant) => ({ rep: avant.rep, panne: corps?.error ?? corps?.erreur ?? 'pas de réponse' }))
      } finally { enCours = false }
    }
    void tour()
    const minuterie = window.setInterval(() => { void tour() }, cadenceMs)
    const visibilite = () => { if (document.visibilityState === 'visible') void tour() }
    document.addEventListener('visibilitychange', visibilite)
    return () => { vivant = false; window.clearInterval(minuterie); document.removeEventListener('visibilitychange', visibilite) }
  }, [])
  return etat
}

// ── Les mises en forme communes (heure et jour de Paris) ─────────────────────────────────────────────────────────────────
const HEURE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const JOUR = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit' })
const instant = (iso: string | null | undefined): number | null => { const t = iso ? Date.parse(iso) : NaN; return Number.isFinite(t) ? t : null }
export const heure = (iso: string | null | undefined): string => { const t = instant(iso); return t === null ? '—' : HEURE.format(new Date(t)) }
export const jour = (iso: string | null | undefined): string => { const t = instant(iso); return t === null ? '—' : JOUR.format(new Date(t)) }

/** Un montant servi : un nombre s'écrit par euros() ; une valeur « hors périmètre » ou absente reste un tiret, jamais 0. */
export const estNombre = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
export const estEnveloppe = (x: unknown): x is Env<unknown> => !!x && typeof x === 'object' && !Array.isArray(x) && 'valeur' in (x as object)
export const HORS_PERIMETRE = '— · hors périmètre'

/** Une valeur d'une enveloppe de la trésorerie ou du barre, écrite : la valeur par `f`, ou « hors périmètre », ou la panne dite en clair. */
export function ecrire<T>(env: Env<T> | null | undefined, f: (v: T) => string, quoi: string): string {
  if (!env) return '…'
  if (env.nonMesure) return HORS_PERIMETRE
  if (env.valeur === null || env.valeur === undefined) return `— · ${messagePanne(quoi, env.erreur ?? env.manque ?? 'pas de réponse')}`
  return f(env.valeur)
}

/** Un lien d'aperçu signé : seulement une adresse https ou un chemin du site (jamais javascript:, jamais « // »). */
export const lienSur = (u: unknown): string | null => (typeof u === 'string' && /^(https:\/\/|\/(?!\/))/.test(u) ? u : null)

/** « <source> ne répond pas : <erreur> » : la panne d'une source se dit toujours. */
export const messagePanne = (source: string, raison: string) => `${source} ne répond pas : ${raison}`
