'use client'

import { supabase } from '@/lib/supabaseClient'

// Les appels du Centre de direction (client) : jeton de session + en-tête de re-confirmation quand une écriture
// l'exige. Le jeton de re-confirmation vit EN MÉMOIRE (module), jamais dans localStorage ; il est à USAGE UNIQUE
// côté serveur, donc oublié dès qu'il a servi.
//
// Cette fonction ne rejette JAMAIS (revue du 07/09) : une coupure réseau ou un délai dépassé devenaient un rejet
// non géré qui figeait l'écran sur « Chargement… ». Une panne rend un refus lisible, comme n'importe quel refus.
export type Reponse<T> = { ok: boolean; status: number; data: T & { error?: string; code?: string; portee?: string } }

const DELAI_MS = 15_000
let reconfirmation: { jeton: string; portee: string; expire: number } | null = null

export const reconfirmationValide = (portee: string) => !!reconfirmation && reconfirmation.portee === portee && reconfirmation.expire > Date.now()
export const garderReconfirmation = (jeton: string, portee: string, expireDansS: number) => { reconfirmation = { jeton, portee, expire: Date.now() + expireDansS * 1000 - 5000 } }
export const oublierReconfirmation = () => { reconfirmation = null }

export async function apiDirection<T = Record<string, unknown>>(chemin: string, init: RequestInit = {}, avecReconfirmation = false): Promise<Reponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) }
  try {
    const { data } = await supabase.auth.getSession()
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`
  } catch { /* session illisible : la route répondra 401, c'est le bon message */ }
  if (avecReconfirmation && reconfirmation && reconfirmation.expire > Date.now()) headers['x-presti-reconfirmation'] = reconfirmation.jeton
  let r: Response
  try {
    r = await fetch(chemin, { ...init, headers, cache: 'no-store', signal: init.signal ?? AbortSignal.timeout(DELAI_MS) })
  } catch (e) {
    const delai = e instanceof DOMException && e.name === 'TimeoutError'
    return { ok: false, status: 0, data: { error: delai ? 'Presti met trop de temps à répondre. Réessayez.' : 'Réseau indisponible.', code: 'reseau' } as T & { error: string; code: string } }
  }
  let body: T & { error?: string; code?: string }
  try { body = (await r.json()) as T & { error?: string; code?: string } } catch { body = {} as T & { error?: string; code?: string } }
  // Un jeton consommé, expiré, rejoué ou de mauvaise portée ne sert plus ; un jeton qui a servi non plus (usage unique).
  if (avecReconfirmation && (r.ok || (body?.code && ['reconfirmation_requise', 'rejoue', 'expire', 'portee', 'indisponible'].includes(body.code)))) reconfirmation = null
  return { ok: r.ok, status: r.status, data: body }
}
