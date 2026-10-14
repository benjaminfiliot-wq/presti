// L'assistant de gestion de la console — la SESSION de l'artisan et l'appel des routes de l'interface. Serveur seulement.
//
// Extrait de executeurs.ts pour que les lectures (executeurs.ts) et les actions (actions-serveur.ts) partagent les mêmes
// outils sans s'importer l'une l'autre. Règle inchangée : l'assistant n'a aucun accès à la base qui lui soit propre ; chaque
// outil passe par le chemin même de l'interface, avec le jeton de l'artisan (déjà vérifié par la route de l'assistant).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type ContexteSession = {
  uid: string
  /** Le jeton d'accès de l'artisan, tel que reçu (déjà vérifié par authArtisan dans la route de l'assistant). */
  jeton: string
  /** L'origine de la requête de l'assistant : les requêtes internes vers les gestionnaires y sont adressées. */
  origine: string
  isFounder: boolean
  /** Le compte a le CRM (décidé par la route : drapeau ou essai, et capacité `crm`). */
  crm: boolean
  /** L'artisan a demandé ses meilleurs clients dans CE message (cadrerDemande) : sinon lire_chiffres ne les rend pas. */
  meilleursClients: boolean
}

/** Un client PostgREST qui porte le jeton de l'artisan : la RLS décide, comme dans son navigateur. */
export function clientDeSession(jeton: string): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jeton}` } },
  })
}

// `Response | undefined` : le type que TypeScript déduit de app/api/messages/route.ts (une branche sans retour explicite).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Gestionnaire = (req: Request, c?: any) => Promise<Response | undefined>

export type ReponseRoute = { status: number; json: Record<string, unknown> | null }

/**
 * Appelle un gestionnaire de route de l'interface, avec la session de l'artisan. `params` : les segments dynamiques de la
 * route ([id]). Rend le statut et le JSON (ou null).
 */
export async function appelerAvec(ctx: Pick<ContexteSession, 'jeton' | 'origine'>, g: Gestionnaire, chemin: string, o: { methode?: string; corps?: unknown; params?: Record<string, string> } = {}): Promise<ReponseRoute> {
  const methode = o.methode ?? (o.corps === undefined ? 'GET' : 'POST')
  const req = new Request(new URL(chemin, ctx.origine), {
    method: methode,
    headers: { authorization: `Bearer ${ctx.jeton}`, ...(o.corps === undefined ? {} : { 'content-type': 'application/json' }) },
    body: o.corps === undefined ? undefined : JSON.stringify(o.corps),
  })
  const rep = await g(req, o.params ? { params: Promise.resolve(o.params) } : undefined)
  if (!rep) return { status: 500, json: null }
  const json = await rep.json().catch(() => null)
  return { status: rep.status, json: json && typeof json === 'object' ? (json as Record<string, unknown>) : null }
}

/** Forme historique : GET sans corps, POST avec. */
export const appeler = (ctx: Pick<ContexteSession, 'jeton' | 'origine'>, g: Gestionnaire, chemin: string, corps?: unknown) => appelerAvec(ctx, g, chemin, { corps })

export const erreurDe = (json: Record<string, unknown> | null, defaut: string) => (typeof json?.error === 'string' && json.error ? json.error : defaut)
