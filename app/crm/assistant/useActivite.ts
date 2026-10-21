'use client'

// L'assistant dans le CRM — l'ACTIVITÉ de l'assistant et la FILE du pilote automatique, lues pour le poste des assistants et le compteur
// de l'atelier. Deux routes, toutes deux gardées côté serveur :
//  • GET /api/crm/assistants/activite : ce que l'assistant vient de faire (filtré par compte) ;
//  • GET /api/pilote/file : ce qui partira seul, avec « Annuler » (POST /api/pilote/file { id, decision: 'annuler' }). Drapeau
//    piloteAutomatique baissé → 404 : rien n'est montré, pas même un titre. Hors offre (403) ou table absente (503) : rien non plus.
// Dans l'exemple et la démonstration, rien n'est lu : le fil fictif de lib/crm/assistantCrm.ts (activiteExemple).
import { useCallback, useEffect, useState } from 'react'
import { appel } from '../client'
import { activiteExemple, EV_ACTIVITE, type CompteursActivite, type LigneActivite } from '@/lib/crm/assistantCrm'
import type { LigneFile } from '@/lib/pilote/regles'

export type FilePilote = { attente: LigneFile[]; recentes: LigneFile[]; delai_min: number }
export type Activite = { disponible: boolean; lignes: LigneActivite[]; compteurs: CompteursActivite }

/** Relecture : toutes les 30 s tant que l'onglet est visible, et à chaque réponse ou décision de l'assistant. */
export const RELECTURE_MS = 30_000

export function useActivite(simule: boolean) {
  const [activite, setActivite] = useState<Activite | null>(null)
  const [pilote, setPilote] = useState<FilePilote | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const relire = useCallback(async () => {
    if (simule) { setActivite({ disponible: true, ...activiteExemple(new Date()) }); setPilote(null); return }
    const [a, p] = await Promise.all([
      appel<Activite>('/api/crm/assistants/activite'),
      appel<FilePilote>('/api/pilote/file'),
    ])
    if (a.ok) { setActivite(a.corps); setErreur(null) } else if (a.status !== 404) setErreur(a.erreur)
    // Le pilote : seulement une réponse 200 complète. 404 (drapeau baissé), 403 (offre), 503 (table absente) : rien.
    setPilote(p.ok && Array.isArray(p.corps?.attente) ? p.corps : null)
  }, [simule])

  useEffect(() => {
    void relire()
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void relire() }, RELECTURE_MS)
    const ev = () => void relire()
    window.addEventListener(EV_ACTIVITE, ev)
    return () => { window.clearInterval(t); window.removeEventListener(EV_ACTIVITE, ev) }
  }, [relire])

  /** Annule UNE action du pilote : elle ne partira pas (elle reste à valider à la main). */
  const annuler = useCallback(async (id: string): Promise<{ ok: boolean; texte: string }> => {
    if (simule) return { ok: false, texte: 'Exemple : rien n’est annulé, rien ne part.' }
    const r = await appel('/api/pilote/file', { method: 'POST', body: { id, decision: 'annuler' } })
    await relire()
    if (r.ok) return { ok: true, texte: 'Annulée : elle ne partira pas. Elle reste à valider à la main.' }
    return { ok: false, texte: r.status === 409 ? 'Elle est déjà partie ou déjà annulée.' : r.erreur }
  }, [simule, relire])

  return { activite, pilote, erreur, relire, annuler }
}
