// Chaque chiffre du Centre de direction vient d'une source et porte sa fraîcheur (prompt v10 §1 : « un chiffre
// sans source n'est pas affiché »). `Sourcee<T>` est la forme unique rendue par toutes les routes de lecture ;
// `sourcer()` y ajoute un cache mémoire court (60 s par défaut, local au lambda — motif lib/authArtisan.ts) et
// transforme toute erreur en `{ valeur: null, erreur }` : l'écran dit « Stripe injoignable », jamais 0.
export type Source = 'stripe' | 'supabase' | 'resend' | 'anthropic' | 'vercel' | 'app' | 'estimation'

export type Sourcee<T> = {
  valeur: T | null
  source: Source
  /** ISO : quand la valeur a été lue à la source (pas quand la réponse est rendue). */
  a: string
  cache: boolean
  erreur?: string
  /** Ce qui manque pour mesurer (ex. « H2 » : clé Anthropic Admin absente). */
  manque?: string
}

type Entree = { valeur: unknown; a: string; jusqua: number }
const memoire = new Map<string, Entree>()

/** Lit à la source (ou au cache), sans jamais lever : la panne devient une valeur nulle sourcée et datée. */
export async function sourcer<T>(cle: string, source: Source, f: () => Promise<T>, ttlMs = 60_000): Promise<Sourcee<T>> {
  const m = memoire.get(cle)
  if (m && m.jusqua > Date.now()) return { valeur: m.valeur as T, source, a: m.a, cache: true }
  try {
    const valeur = await f()
    const a = new Date().toISOString()
    memoire.set(cle, { valeur, a, jusqua: Date.now() + ttlMs })
    return { valeur, source, a, cache: false }
  } catch (e) {
    const erreur = (e instanceof Error ? e.message : String(e)).slice(0, 160)
    return { valeur: null, source, a: new Date().toISOString(), cache: false, erreur }
  }
}

/** Une valeur qu'on ne peut pas mesurer (préalable humain absent) — jamais un nombre inventé. */
export const nonMesure = <T>(source: Source, manque: string): Sourcee<T> => ({ valeur: null, source, a: new Date().toISOString(), cache: false, manque })

/** « à l'instant », « il y a 2 min », « il y a 3 h », « il y a 2 j » — partagé écran et emails. */
export function relTime(iso: string | null | undefined, maintenant = Date.now()): string {
  if (!iso) return '—'
  const d = new Date(iso).getTime()
  if (!Number.isFinite(d)) return '—'
  const s = Math.max(0, Math.round((maintenant - d) / 1000))
  if (s < 45) return 'à l’instant'
  const min = Math.round(s / 60)
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 36) return `il y a ${h} h`
  return `il y a ${Math.round(h / 24)} j`
}

/** Vide le cache (tests, ou après une écriture qui change un chiffre). */
export const oublier = (prefixe?: string) => { for (const k of memoire.keys()) if (!prefixe || k.startsWith(prefixe)) memoire.delete(k) }
