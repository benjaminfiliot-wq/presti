'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { appliquerReglages, fusionner, type Reglages } from '@/lib/pilotage/reglages'
import { JETONS_PALETTE, type Theme } from '@/lib/pilotage/theme'
import { chargerTheme } from './moteur/theme/charger'
import PanneauReglages from './reglages/Reglages'
import type { ReglagesServis, Role } from './Station'

// L'habillage de la station (fiche 026-187) : pose les réglages sur le SEUL nœud `.mc` (jetons --mc-* du thème, puis couleurs
// réglées, et data-mise-en-page ; jamais sur <html> ni <body>), et, quand `?vue=reglages` est dans l'adresse et que le rôle est
// `direction`, monte le panneau Réglages. Les règles viennent des modules purs (lib/pilotage/reglages.ts, 026-173) ; le thème,
// du chargeur de la carte (moteur/theme/charger.ts, 026-180 : le seul `fetch` de la station, thème déjà validé).
export type HabillageProps = { reglages: ReglagesServis | null; role: Role }

const CLES_CONNUES = ['station', 'vaisseau', 'essai']
const cleDe = (x: unknown): string => (typeof x === 'string' && CLES_CONNUES.includes(x) ? x : 'station')
const VIDE: Reglages = {}
const objet = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)

/** Les défauts du thème : sa clé, sa mise en page, sa palette (jetons), la place de chaque salle. L'habit, jamais les chiffres. */
export function defautsDuTheme(theme: Theme | null): Record<string, unknown> {
  if (!theme) return {}
  return {
    theme: theme.cle,
    mise_en_page: theme.mise_en_page,
    couleurs: { ...theme.palette },
    salles: Object.fromEntries(theme.defauts.map((d) => [d.salle, { emplacement: d.emplacement }])),
  }
}

export default function Habillage({ reglages, role }: HabillageProps) {
  const router = useRouter()
  const params = useSearchParams()
  const marqueur = useRef<HTMLSpanElement>(null)
  const ouvert = role === 'direction' && params.get('vue') === 'reglages'

  // La dernière version écrite d'ici (le temps que la station relise les réglages) et l'aperçu en cours (jamais écrit).
  const [local, setLocal] = useState<ReglagesServis | null>(null)
  const [apercu, setApercu] = useState<Reglages | null>(null)
  const enregistres = local && local.version > (reglages?.version ?? -1) ? local : reglages
  const enregistresReglages: Reglages = objet(enregistres?.reglages) ? (enregistres?.reglages as Reglages) : VIDE
  const effectifs: Reglages = ouvert && apercu ? apercu : enregistresReglages
  const cle = cleDe(effectifs.theme)

  useEffect(() => { if (!ouvert) setApercu(null) }, [ouvert])

  // Le thème choisi : chargé une fois par clé. Refusé ou absent → les défauts de station.css, sans panne affichée.
  const memoire = useRef(new Map<string, Theme | null>())
  const [theme, setTheme] = useState<Theme | null>(null)
  const [echec, setEchec] = useState<string | null>(null)
  useEffect(() => {
    let vivant = true
    const connu = memoire.current.get(cle)
    if (connu !== undefined) { setTheme(connu); setEchec(connu ? null : cle); return }
    ;(async () => {
      let lu: Theme | null = null
      try {
        const r = await chargerTheme(cle)
        lu = r.ok ? r.theme : null
      } catch { lu = null }
      memoire.current.set(cle, lu)
      if (!vivant) return
      setTheme(lu)
      setEchec(lu ? null : cle)
    })()
    return () => { vivant = false }
  }, [cle])

  // L'habillage : sur le seul nœud `.mc`. Le nettoyage retire les jetons posés (un thème refusé rend les défauts de station.css).
  useEffect(() => {
    const noeud = marqueur.current?.closest<HTMLElement>('.mc') ?? null
    if (!noeud) return
    if (!theme) {
      // Thème pas encore chargé (ou refusé) : les seules couleurs réglées s'appliquent déjà, sur `.mc`, jetons de la liste fermée et #RRGGBB seulement.
      const c = effectifs.couleurs
      const poses: string[] = []
      if (objet(c)) for (const [j, v] of Object.entries(c)) if ((JETONS_PALETTE as readonly string[]).includes(j) && typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v)) { noeud.style.setProperty(j, v); poses.push(j) }
      return () => { for (const j of poses) noeud.style.removeProperty(j) }
    }
    appliquerReglages(noeud, fusionner(defautsDuTheme(theme), effectifs), theme)
    const poses = Object.keys(theme.palette)
    return () => { for (const j of poses) noeud.style.removeProperty(j) }
  }, [theme, effectifs])

  const fermer = useCallback(() => {
    const q = new URLSearchParams(window.location.search)
    q.delete('vue')
    const s = q.toString()
    router.replace(`${window.location.pathname}${s ? `?${s}` : ''}`, { scroll: false })
  }, [router])
  const poser = useCallback((p: Record<string, string | null>) => {
    const q = new URLSearchParams(window.location.search)
    for (const [k, v] of Object.entries(p)) { if (v === null) q.delete(k); else q.set(k, v) }
    const s = q.toString()
    router.replace(`${window.location.pathname}${s ? `?${s}` : ''}`, { scroll: false })
  }, [router])

  return (
    <>
      <span ref={marqueur} hidden data-habillage />
      {ouvert ? (
        <PanneauReglages
          enregistres={enregistres}
          theme={theme}
          echecTheme={echec}
          onApercu={setApercu}
          onEnregistre={setLocal}
          onFermer={fermer}
          poser={poser}
        />
      ) : null}
    </>
  )
}
