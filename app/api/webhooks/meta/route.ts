// app/api/webhooks/meta/route.ts — les webhooks de Meta (fiche 026-090) : commentaires « SITE » et messages reçus sur Instagram
// et sur la Page. Route publique : le GET vérifie l'abonnement par le jeton ; le POST est fermé sans secret et refuse toute
// signature X-Hub-Signature-256 fausse AVANT de lire quoi que ce soit du corps. Elle ne répond à personne (le Facteur envoie).
//
// Pas de pauseGenerale ici : recevoir et s'opposer ne s'arrêtent jamais. Ni corps, ni pseudo, ni texte, ni jeton dans un journal
// ou dans une réponse.
import crypto from 'node:crypto'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { creerLecteurProfil, creerMagasinMeta, normaliserEntrees, traiterEvenements, verifierSignature } from '@/lib/agents/acquisition/metaWebhooks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_OCTETS = 256 * 1024

/** Deux chaînes égales, en temps constant (on compare des empreintes de même longueur). */
function memeChaine(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest()
  const hb = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(ha, hb)
}

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
    if (total > max) {
      await lecteur.cancel().catch(() => {})
      return null
    }
    morceaux.push(value)
  }
  const brut = new Uint8Array(total)
  let decalage = 0
  for (const m of morceaux) {
    brut.set(m, decalage)
    decalage += m.byteLength
  }
  return brut
}

export async function GET(req: Request): Promise<Response> {
  const attendu = process.env.META_WEBHOOK_VERIFY_TOKEN
  if (!attendu) return new Response(null, { status: 403 })
  const p = new URL(req.url).searchParams
  const jeton = p.get('hub.verify_token')
  const defi = p.get('hub.challenge')
  if (p.get('hub.mode') !== 'subscribe' || jeton === null || !memeChaine(jeton, attendu)) return new Response(null, { status: 403 })
  if (defi === null || !/^[0-9]{1,50}$/.test(defi)) return new Response(null, { status: 403 })
  return new Response(defi, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } })
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.META_APP_SECRET
  if (!secret) return new Response(null, { status: 503 })

  const brut = await lireCorps(req, MAX_OCTETS)
  if (!brut) return new Response(null, { status: 413 })

  if (!verifierSignature(brut, req.headers.get('x-hub-signature-256'), secret)) return new Response(null, { status: 401 })

  let corps: unknown
  try {
    corps = JSON.parse(new TextDecoder().decode(brut))
  } catch {
    return new Response(null, { status: 400 })
  }

  try {
    const jetonPage = process.env.META_PAGE_TOKEN
    const lireProfil = jetonPage ? creerLecteurProfil({ jeton: jetonPage, fetch }) : async () => null
    const magasin = creerMagasinMeta(magasinSupabase, (fonction, args) => supabaseAdmin.rpc(fonction, args))
    await traiterEvenements(normaliserEntrees(corps), { magasin, lireProfil, maintenant: Date.now() })
    return Response.json({ ok: true })
  } catch {
    // Meta réessaiera ; aucun détail ne sort.
    console.error('[webhook meta] traitement en échec')
    return Response.json({ ok: false }, { status: 500 })
  }
}
