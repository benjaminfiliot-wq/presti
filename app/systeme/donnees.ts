'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Lecture des écrans du système d'assistants : GET /api/systeme/<vue>, avec la session de l'artisan. Rien n'est écrit d'ici ; les
// décisions passent par les routes qui existent déjà (decider, annulerEnvoi).
export type Etat<T> = { etat: 'chargement' } | { etat: 'erreur'; message: string } | { etat: 'ok'; donnees: T }

async function jeton(): Promise<string | null> { return (await supabase.auth.getSession()).data.session?.access_token ?? null }

export function useLecture<T>(vue: string): { lecture: Etat<T>; relire: () => void } {
  const [lecture, setLecture] = useState<Etat<T>>({ etat: 'chargement' })
  const [n, setN] = useState(0)
  useEffect(() => {
    let annule = false
    ;(async () => {
      const j = await jeton()
      if (!j) { if (!annule) setLecture({ etat: 'erreur', message: 'Reconnectez-vous pour voir cet écran.' }); return }
      try {
        const r = await fetch(`/api/systeme/${vue}`, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' })
        const c = await r.json().catch(() => null)
        if (annule) return
        if (!r.ok) setLecture({ etat: 'erreur', message: typeof c?.error === 'string' ? c.error : 'La lecture n’a pas abouti.' })
        else setLecture({ etat: 'ok', donnees: c as T })
      } catch { if (!annule) setLecture({ etat: 'erreur', message: 'La lecture n’a pas abouti. Rechargez dans un instant.' }) }
    })()
    return () => { annule = true }
  }, [vue, n])
  return { lecture, relire: useCallback(() => setN((x) => x + 1), []) }
}

/** Décider d'une carte : la route existante de l'assistant (confirmer, écarter). */
export async function decider(id: string, decision: 'confirmer' | 'refuser'): Promise<{ ok: boolean; message: string }> {
  const j = await jeton()
  if (!j) return { ok: false, message: 'Reconnectez-vous.' }
  const r = await fetch('/api/assistant/actions', { method: 'POST', headers: { Authorization: `Bearer ${j}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, decision }) })
  const c = await r.json().catch(() => null)
  return { ok: r.ok && c?.ok === true, message: typeof c?.resume === 'string' ? c.resume : typeof c?.error === 'string' ? c.error : r.ok ? 'Fait.' : 'Non fait.' }
}

/** Annuler un envoi en délai : la route existante du pilote. */
export async function annulerEnvoi(id: string): Promise<{ ok: boolean; message: string }> {
  const j = await jeton()
  if (!j) return { ok: false, message: 'Reconnectez-vous.' }
  const r = await fetch('/api/pilote/file', { method: 'POST', headers: { Authorization: `Bearer ${j}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, decision: 'annuler' }) })
  const c = await r.json().catch(() => null)
  return { ok: r.ok && c?.ok === true, message: r.ok ? 'L’envoi est annulé.' : typeof c?.error === 'string' ? c.error : 'Non annulé.' }
}

/** Retirer une connexion : la route existante (036-009), qui efface l'autorisation. Elle répond 404 tant que le drapeau `connexions` est baissé. */
export async function retirerConnexion(id: string): Promise<{ ok: boolean; message: string }> {
  const j = await jeton()
  if (!j) return { ok: false, message: 'Reconnectez-vous.' }
  const r = await fetch('/api/connexions/retirer', { method: 'POST', headers: { Authorization: `Bearer ${j}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  const c = await r.json().catch(() => null)
  return { ok: r.ok, message: r.ok ? 'L’accès est retiré.' : typeof c?.error === 'string' ? c.error : 'Non retiré.' }
}

const FR = 'fr-FR'
export const eur = (n: number): string => `${Math.round(n).toLocaleString(FR)} €`.replace(/ /g, ' ')
export const eurCentimes = (c: number): string => `${(c / 100).toLocaleString(FR, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
export const heureFr = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(FR, { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' }).replace(':', ' h ').replace(/^(\d+) h 00$/, '$1 h')
}
export const dateFr = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(FR, { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' })
}
export const dateHeureFr = (iso: string | null | undefined): string => (iso ? `${dateFr(iso)} à ${heureFr(iso)}` : '')

/** Connecter un outil Google : la route existante rend l'adresse d'autorisation (OAuth sur Presti, jamais sur n8n). 404 tant que le drapeau `connexions` est baissé. */
export async function connecterGoogle(fournisseur: string): Promise<{ ok: boolean; message: string; url?: string }> {
  const j = await jeton()
  if (!j) return { ok: false, message: 'Reconnectez-vous.' }
  const r = await fetch('/api/connexions/google/demarrer', { method: 'POST', headers: { Authorization: `Bearer ${j}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fournisseur }) })
  const c = await r.json().catch(() => null)
  return r.ok && typeof c?.url === 'string' ? { ok: true, message: '', url: c.url } : { ok: false, message: typeof c?.error === 'string' ? c.error : 'Connexion indisponible pour le moment.' }
}
