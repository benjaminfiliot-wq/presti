'use client'

// Le « Chargement… » des écrans de la console, branché sur le drapeau consoleV2 (refonte 18/10, étape 5.4) : en v2, un squelette
// (aria-busy, texte lu par le lecteur d'écran) ; sinon, exactement le texte d'avant. Un seul endroit pour la règle.
import { useConsoleV2 } from '@/lib/consoleV2Client'
import { Squelette } from './base'

export default function ChargementConsole({ carte = false, variante = 'texte', lignes = 4, etiquette = 'Chargement…' }: {
  /** l'ancien rendu était entouré d'une .tool-card */
  carte?: boolean; variante?: 'texte' | 'tableau' | 'chiffres'; lignes?: number; etiquette?: string
}) {
  const v2 = useConsoleV2()
  if (v2) return <Squelette variante={variante} lignes={lignes} etiquette={etiquette} />
  const p = <p className="muted">Chargement…</p>
  return carte ? <div className="tool-card">{p}</div> : p
}
