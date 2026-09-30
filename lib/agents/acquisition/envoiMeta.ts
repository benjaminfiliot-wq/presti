// lib/agents/acquisition/envoiMeta.ts — le client d'envoi de Meta (fiche 026-089) : la réponse privée à un commentaire et le
// message dans la fenêtre de 24 h. Le monde extérieur est injecté (`fetch`), rien n'est lu ailleurs.
//
// Contrat retenu (les chemins et champs exacts sont à vérifier le jour de R6, Page liée et application examinée) :
//   réponse privée : POST https://graph.facebook.com/v26.0/{comment_id}/private_replies   corps { message, access_token }
//   message        : POST https://graph.facebook.com/v26.0/me/messages                     corps { recipient:{id}, messaging_type:'RESPONSE', message:{text | attachment}, access_token }
// Jamais le tag `HUMAN_AGENT` (réservé aux humains), jamais un autre hôte que graph.facebook.com, 10 s de délai au plus.
// Le jeton ne sort jamais : ni dans un journal, ni dans un résultat, ni dans une erreur.
import { consommerJauge } from './jauges'
import type { Magasin } from './contrat'

export const HOTE_META = 'graph.facebook.com'
export const VERSION_GRAPH = 'v26.0'
export const DELAI_META_MS = 10_000

export type ResultatMeta = { ok: true; id: string } | { ok: false; raison: 'politique' | 'debit' | 'fenetre_fermee' | 'autre' }

export interface EnvoiMeta {
  reponsePrivee(m: { commentaire_id: string; texte: string }): Promise<ResultatMeta>
  message(m: { meta_id: string; texte: string; video_url?: string }): Promise<ResultatMeta>
}

type ReponseFetch = { ok: boolean; status: number; json(): Promise<unknown> }
type FetchMeta = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<ReponseFetch>

/** Le code d'erreur de Graph → la raison rendue au Facteur. */
function raisonDe(status: number, corps: unknown): 'politique' | 'debit' | 'fenetre_fermee' | 'autre' {
  const e = corps && typeof corps === 'object' ? (corps as { error?: { code?: unknown; error_subcode?: unknown; message?: unknown } }).error : null
  const code = Number(e?.code)
  const sous = Number(e?.error_subcode)
  const message = String(e?.message ?? '')
  if (code === 4 || code === 17 || code === 32 || code === 613 || status === 429) return 'debit'
  if (code === 10 || (code >= 200 && code <= 299)) return 'politique'
  if (/window|fen[eê]tre/i.test(message) || sous === 2534022 || sous === 2018278 || code === 100) return 'fenetre_fermee'
  return 'autre'
}

/**
 * `magasin` : quand il est fourni, chaque appel consomme d'abord la jauge `instagram_api` (026-064) ; au plafond, aucun appel
 * ne part et le résultat est `{ ok: false, raison: 'debit' }`.
 */
export function creerEnvoiMeta(options: { jeton: string; idCompte: string; fetch: FetchMeta | typeof fetch; magasin?: Magasin | null; pauseGenerale?: () => Promise<{ active: boolean }> }): EnvoiMeta {
  const jeton = options.jeton
  const appeler = options.fetch as FetchMeta

  async function poster(chemin: string, corps: Record<string, unknown>): Promise<ResultatMeta> {
    if (options.magasin) {
      let permis = false
      try { permis = await consommerJauge(options.magasin, 'instagram_api', 1) } catch { permis = false }
      if (!permis) return { ok: false, raison: 'debit' }
    }
    const url = `https://${HOTE_META}/${VERSION_GRAPH}/${chemin}`
    if (new URL(url).hostname !== HOTE_META) return { ok: false, raison: 'autre' }
    const arret = new AbortController()
    const minuteur = setTimeout(() => arret.abort(), DELAI_META_MS)
    try {
      const pauseGenerale = options.pauseGenerale ?? (async () => (await import('../pause')).pauseGenerale())
      let pause: unknown
      try { pause = await pauseGenerale() } catch { return { ok: false, raison: 'politique' } }
      if (!pause || typeof pause !== 'object' || (pause as { active?: unknown }).active !== false) return { ok: false, raison: 'politique' }
      const r = await appeler(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...corps, access_token: jeton }),
        signal: arret.signal,
      })
      let contenu: unknown = null
      try { contenu = await r.json() } catch { contenu = null }
      if (!r.ok) return { ok: false, raison: raisonDe(r.status, contenu) }
      const id = contenu && typeof contenu === 'object' ? (contenu as { id?: unknown; message_id?: unknown }).id ?? (contenu as { message_id?: unknown }).message_id : null
      if (typeof id !== 'string' || !id) return { ok: false, raison: 'autre' }
      return { ok: true, id }
    } catch {
      return { ok: false, raison: 'autre' }
    } finally {
      clearTimeout(minuteur)
    }
  }

  return {
    reponsePrivee({ commentaire_id, texte }) {
      if (!/^[A-Za-z0-9_:-]{1,120}$/.test(commentaire_id)) return Promise.resolve({ ok: false, raison: 'autre' })
      return poster(`${encodeURIComponent(commentaire_id)}/private_replies`, { message: texte })
    },
    async message({ meta_id, texte, video_url }) {
      if (!/^[A-Za-z0-9_:-]{1,120}$/.test(meta_id)) return { ok: false, raison: 'autre' }
      // Le texte part toujours (il porte l'identité et le lien) ; la vidéo, quand il y en a une, suit en second message.
      const premier = await poster('me/messages', { recipient: { id: meta_id }, messaging_type: 'RESPONSE', message: { text: texte } })
      if (!premier.ok || !video_url) return premier
      await poster('me/messages', { recipient: { id: meta_id }, messaging_type: 'RESPONSE', message: { attachment: { type: 'video', payload: { url: video_url, is_reusable: false } } } })
      return premier
    },
  }
}
