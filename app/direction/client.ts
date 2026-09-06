'use client'

import { supabase } from '@/lib/supabaseClient'

// Les appels du Centre de direction (client) : jeton de session + en-tête de re-confirmation quand une écriture
// l'exige. Le jeton de re-confirmation vit EN MÉMOIRE (module), jamais dans localStorage ; il meurt avec l'onglet
// ou au bout de 5 minutes.
export type Reponse<T> = { ok: boolean; status: number; data: T & { error?: string; code?: string; portee?: string } }

let reconfirmation: { jeton: string; portee: string; expire: number } | null = null

export const reconfirmationValide = (portee: string) => !!reconfirmation && reconfirmation.portee === portee && reconfirmation.expire > Date.now()
export const garderReconfirmation = (jeton: string, portee: string, expireDansS: number) => { reconfirmation = { jeton, portee, expire: Date.now() + expireDansS * 1000 - 5000 } }
export const oublierReconfirmation = () => { reconfirmation = null }
export const resteReconfirmation = () => (reconfirmation ? Math.max(0, Math.round((reconfirmation.expire - Date.now()) / 1000)) : 0)

export async function apiDirection<T = Record<string, unknown>>(chemin: string, init: RequestInit = {}, avecReconfirmation = false): Promise<Reponse<T>> {
  const { data } = await supabase.auth.getSession()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) }
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`
  if (avecReconfirmation && reconfirmation && reconfirmation.expire > Date.now()) headers['x-presti-reconfirmation'] = reconfirmation.jeton
  const r = await fetch(chemin, { ...init, headers, cache: 'no-store' })
  const body = (await r.json().catch(() => ({}))) as T & { error?: string; code?: string }
  // Un jeton consommé, expiré ou rejoué ne sert plus : on l'oublie pour que l'écran redemande.
  if (avecReconfirmation && (r.status === 403 || r.status === 503) && body?.code && ['reconfirmation_requise', 'rejoue', 'expire', 'portee', 'indisponible'].includes(body.code)) reconfirmation = null
  if (avecReconfirmation && r.ok) reconfirmation = null // usage unique côté serveur : inutile de le garder
  return { ok: r.ok, status: r.status, data: body }
}
