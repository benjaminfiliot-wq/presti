'use client'

// CRM — l'accès aux routes /api/crm/* depuis le navigateur, et les formats d'affichage. Le jeton de session est relu à
// chaque appel, jamais gardé. Une réponse en erreur est rendue telle quelle (statut + message de la route) : l'écran
// l'affiche, il ne la transforme jamais en succès.
import { supabase } from '@/lib/supabaseClient'

export type Reponse<T> = { ok: true; status: number; corps: T } | { ok: false; status: number; erreur: string; code?: string }

export async function appel<T = Record<string, unknown>>(chemin: string, init: { method?: string; body?: unknown } = {}): Promise<Reponse<T>> {
  const jeton = (await supabase.auth.getSession()).data.session?.access_token ?? null
  if (!jeton) return { ok: false, status: 401, erreur: 'Session expirée : reconnectez-vous.' }
  const r = await fetch(chemin, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${jeton}`, ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  }).catch(() => null)
  if (!r) return { ok: false, status: 0, erreur: 'Pas de réseau : rien n’a été enregistré.' }
  const corps = await r.json().catch(() => null) as (T & { error?: string; code?: string }) | null
  if (!r.ok) return { ok: false, status: r.status, erreur: corps?.error ?? (r.status === 404 ? 'Introuvable.' : 'Le service ne répond pas. Réessayez dans un instant.'), code: corps?.code }
  return { ok: true, status: r.status, corps: (corps ?? {}) as T }
}

/** « 1 240 € » ou « 1 240,50 € » depuis des centimes ; « — » pour null. */
export function euros(c: number | null | undefined): string {
  if (c === null || c === undefined || !Number.isFinite(c)) return '—'
  const n = c / 100
  return `${n.toLocaleString('fr-FR', Number.isInteger(n) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}
/** Un montant en euros (numeric de la base) → centimes. */
export const enCentimes = (v: number | string | null | undefined): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? Math.round(n * 100) : null
}
/** « 12/10/2026 » depuis « 2026-10-12 » ou un horodatage (jour de Paris) ; « — » sinon. */
export function dateFr(v: string | null | undefined): string {
  if (!v) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split('-').reverse().join('/')
  const t = Date.parse(v)
  return Number.isNaN(t) ? '—' : new Date(t).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
}
export function dateHeureFr(v: string | null | undefined): string {
  if (!v) return '—'
  const t = Date.parse(v)
  return Number.isNaN(t) ? '—' : new Date(t).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const LIBELLES_DEVIS: Record<string, string> = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Signé', refuse: 'Refusé', expire: 'Expiré' }
export const LIBELLES_FACTURE: Record<string, string> = { brouillon: 'Brouillon', emise: 'Émise', payee: 'Payée', annulee: 'Annulée' }
export const LIBELLES_DEMANDE: Record<string, string> = { nouveau: 'Nouvelle', repondu: 'Répondue', en_discussion: 'En discussion', devis: 'Devis envoyé', gagne: 'Gagnée', perdu: 'Perdue' }
export const TON_STATUT_CHANTIER: Record<string, string> = { a_planifier: 'muted', planifie: 'info', en_cours: 'warn', en_pause: 'muted', termine: 'ok', annule: 'muted' }
