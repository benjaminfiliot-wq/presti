// app/api/canaux/telegram/webhook/[canal]/route.ts — le webhook du BOT TELEGRAM d'un artisan (21/10/2026, drapeau canauxTelegram).
//
// Une adresse par liaison (l'id de la ligne `canaux`), posée par app/api/canaux/telegram avec un `secret_token` DÉRIVÉ de cet id
// (lib/canaux/telegram.ts). Ordre, avant toute lecture :
//   1. drapeau baissé → 404 ; CANAUX_KEY absente → 503 ;
//   2. l'en-tête X-Telegram-Bot-Api-Secret-Token doit valoir le secret de CETTE liaison (temps constant) → sinon 401. Le secret d'un
//      autre bot (d'un autre artisan) n'ouvre pas ce chemin : c'est le routage, et la garde contre l'IDOR ;
//   3. corps borné (256 Kio), JSON ;
//   4. la liaison est relue en base (type telegram, active) : coupée ou supprimée → 200 sans rien ranger (Telegram cesse de rejouer) ;
//   5. un message privé seulement ; rangé une fois (canaux_evenements, clé <chat>:<message>) ; on répond 200 tout de suite, la
//      réponse proposée par l'IA (et le Pilote, s'il est activé) se fait APRÈS (after).
// Ni corps, ni nom, ni texte, ni jeton dans un journal ou dans une réponse.
import { after } from 'next/server'
import { actif } from '@/lib/flags'
import { estIdLiaison, lireUpdateTelegram, secretWebhookTelegram, verifierSecretTelegram } from '@/lib/canaux/telegram'
import { personneTelegram, rangerEntrantTelegram } from '@/lib/canaux/rangement'
import { filTelegramExiste, liaisonTelegram, magasinCanaux, preparerReponseCanal } from '@/lib/canaux/serveur'
import { consommerLimiteStricte } from '@/lib/limites'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_OCTETS = 256 * 1024
/** Attente avant de préparer la réponse : regroupe les rafales de messages d'un même client (voir preparerReponseCanal). */
const ATTENTE_RAFALE_MS = 4_000

// 21/10/2026 (audit offensif, E2 et M2) — un inconnu qui inonde le bot d'un artisan ne remplit ni sa base, ni sa boîte, ni ses crédits.
// Au-delà d'un plafond : 200 SANS rien ranger (Telegram cesse de rejouer ; rien ne lui dit qu'un plafond existe).
/** Messages au plus par bot et par heure. */
const TG_PAR_BOT_HEURE = 300
/** Messages au plus par conversation : par heure, et par jour. */
const TG_PAR_FIL_HEURE = 30
const TG_PAR_FIL_JOUR = 100
/** NOUVELLES conversations au plus par bot et par jour. */
const TG_NOUVEAUX_FILS_JOUR = 30

async function lireCorps(req: Request, max: number): Promise<string | null> {
  const declare = Number(req.headers.get('content-length'))
  if (Number.isFinite(declare) && declare > max) return null
  if (!req.body) return ''
  const lecteur = req.body.getReader()
  const morceaux: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await lecteur.read()
    if (done) break
    total += value.byteLength
    if (total > max) { await lecteur.cancel().catch(() => {}); return null }
    morceaux.push(value)
  }
  const brut = new Uint8Array(total)
  let decalage = 0
  for (const m of morceaux) { brut.set(m, decalage); decalage += m.byteLength }
  return new TextDecoder().decode(brut)
}

export async function POST(req: Request, ctx: { params: Promise<{ canal: string }> }): Promise<Response> {
  if (!actif('canauxTelegram')) return new Response(null, { status: 404 })
  const { canal } = await ctx.params
  if (!estIdLiaison(canal)) return new Response(null, { status: 404 })
  const attendu = secretWebhookTelegram(process.env.CANAUX_KEY, canal)
  if (!attendu) return new Response(null, { status: 503 })
  if (!verifierSecretTelegram(req.headers.get('x-telegram-bot-api-secret-token'), attendu)) return new Response(null, { status: 401 })

  const brut = await lireCorps(req, MAX_OCTETS)
  if (brut === null) return new Response(null, { status: 413 })
  let corps: unknown
  try { corps = JSON.parse(brut) } catch { return new Response(null, { status: 400 }) }

  try {
    const liaison = await liaisonTelegram(canal)
    if (!liaison || !liaison.actif) return Response.json({ ok: true })
    const e = lireUpdateTelegram(corps)
    if (!e || !liaison.externe_id) return Response.json({ ok: true })
    const personne = personneTelegram(liaison.externe_id, e.chat_id)
    // Fail-closed (consommerLimiteStricte) : base muette = rien rangé, comme si elle l'était de toute façon.
    if (!(await consommerLimiteStricte(`canaux:tg:bot:${canal}`, TG_PAR_BOT_HEURE, 3_600))
      || !(await consommerLimiteStricte(`canaux:tg:fil:${canal}:${e.chat_id}`, TG_PAR_FIL_HEURE, 3_600))
      || !(await consommerLimiteStricte(`canaux:tg:fil-jour:${canal}:${e.chat_id}`, TG_PAR_FIL_JOUR, 86_400))) return Response.json({ ok: true })
    if (!(await filTelegramExiste(liaison.artisan_id, personne))
      && !(await consommerLimiteStricte(`canaux:tg:nouveaux:${canal}`, TG_NOUVEAUX_FILS_JOUR, 86_400))) return Response.json({ ok: true })
    const issue = await rangerEntrantTelegram(e, liaison, magasinCanaux)
    if (issue.etat === 'range') {
      const r = issue.r
      after(async () => { await preparerReponseCanal({ ...r, attenteMs: ATTENTE_RAFALE_MS }) })
    }
    return Response.json({ ok: true })
  } catch {
    // La marque d'idempotence du message en échec a été retirée (rangement.ts) : le rejeu de Telegram le rangera.
    console.error('[canaux/telegram] rangement en échec')
    return Response.json({ ok: false }, { status: 500 })
  }
}
