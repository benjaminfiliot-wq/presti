// app/api/canaux/meta/route.ts — le webhook des canaux Meta DE L'ARTISAN : WhatsApp Cloud API, Messenger, Instagram Messaging.
//
// À ne pas confondre avec app/api/webhooks/meta (la prospection de Presti, sur la Page et le compte Instagram de PRESTI). Les deux
// ont leur propre application Meta, donc leur propre secret : META_CANAUX_APP_SECRET / META_CANAUX_VERIFY_TOKEN ici.
//
//   GET  : la vérification d'abonnement (hub.mode / hub.verify_token / hub.challenge).
//   POST : la signature X-Hub-Signature-256 est vérifiée sur le corps BRUT avant toute lecture ; chaque message est rangé chez le
//          bon artisan (liaison par phone_number_id / id de Page / id Instagram), une seule fois (canaux_evenements) ; on répond
//          200 tout de suite, la réponse proposée par l'IA et la notification se font APRÈS (after).
//
// Drapeaux canauxWhatsapp / canauxReseaux baissés : la route répond 404, rien n'est lu. Ni corps, ni nom, ni texte, ni jeton
// dans un journal ou dans une réponse.
import { after } from 'next/server'
import { lireWebhookMeta, reponseVerification, verifierSignatureMeta } from '@/lib/canaux/meta'
import { rangerEntrantMeta, type Range } from '@/lib/canaux/rangement'
import { canalOuvert, metaOuvert } from '@/lib/canaux/regles'
import { magasinCanaux, preparerReponseCanal } from '@/lib/canaux/serveur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_OCTETS = 512 * 1024
/** Attente avant de préparer la réponse : regroupe les rafales de messages d'un même client (voir preparerReponseCanal). */
const ATTENTE_RAFALE_MS = 4_000

/** Lit le corps brut une seule fois, sans dépasser `max` octets (null au-delà). */
async function lireCorps(req: Request, max: number): Promise<Uint8Array | null> {
  const declare = Number(req.headers.get('content-length'))
  if (Number.isFinite(declare) && declare > max) return null
  if (!req.body) return new Uint8Array(0)
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
  return brut
}

export async function GET(req: Request): Promise<Response> {
  if (!metaOuvert()) return new Response(null, { status: 404 })
  const defi = reponseVerification(new URL(req.url).searchParams, process.env.META_CANAUX_VERIFY_TOKEN)
  if (defi === null) return new Response(null, { status: 403 })
  return new Response(defi, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } })
}

export async function POST(req: Request): Promise<Response> {
  if (!metaOuvert()) return new Response(null, { status: 404 })
  const secret = process.env.META_CANAUX_APP_SECRET
  if (!secret) return new Response(null, { status: 503 })

  const brut = await lireCorps(req, MAX_OCTETS)
  if (!brut) return new Response(null, { status: 413 })
  if (!verifierSignatureMeta(brut, req.headers.get('x-hub-signature-256'), secret)) return new Response(null, { status: 401 })

  let corps: unknown
  try { corps = JSON.parse(new TextDecoder().decode(brut)) } catch { return new Response(null, { status: 400 }) }

  // Un canal dont le drapeau est baissé n'est pas lu (WhatsApp ouvert sans les réseaux, par exemple).
  const entrants = lireWebhookMeta(corps).filter((e) => canalOuvert(e.canal))
  const ranges: Range[] = []
  try {
    for (const e of entrants) {
      const issue = await rangerEntrantMeta(e, magasinCanaux)
      if (issue.etat === 'range') ranges.push(issue.r)
    }
  } catch {
    // La marque d'idempotence du message en échec a été retirée : le rejeu de Meta le rangera. Ceux déjà rangés sont des doublons au rejeu.
    console.error('[canaux/meta] rangement en échec')
    return Response.json({ ok: false }, { status: 500 })
  }

  if (ranges.length) {
    after(async () => {
      // Une seule attente pour tout le lot ; ensuite seul le dernier message de chaque client est préparé.
      await new Promise((r) => setTimeout(r, ATTENTE_RAFALE_MS))
      for (const r of ranges) await preparerReponseCanal(r)
    })
  }
  return Response.json({ ok: true })
}
