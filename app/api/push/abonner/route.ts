import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { consommerLimite } from '@/lib/limites'
import { lireUserAgent } from '@/lib/userAgent'
import { actif } from '@/lib/flags'
import { clePubliqueVapid } from '@/lib/push'

// Appareils abonnés aux notifications push (prompt v9 §3.4 — Paramètres → Notifications).
//
//  GET    : la clé publique VAPID et la liste des appareils de l'artisan (libellé, dates, état).
//  POST   : abonner CET appareil — l'abonnement Web Push tel que le navigateur l'a créé (endpoint https
//           chez le service de push, clés p256dh/auth). Un endpoint déjà connu est repris, pas dupliqué.
//  DELETE : retirer un appareil (le sien : l'artisan ne voit et ne touche que ses lignes).
//
// Le libellé de l'appareil vient du User-Agent (lib/userAgent), jamais de l'adresse IP. Plafond :
// 20 abonnements par compte et par heure — un script ne remplit pas la table.

export const runtime = 'nodejs'

const INDISPONIBLE = { error: 'Les notifications push ne sont pas encore disponibles.' }
const B64URL = /^[A-Za-z0-9_-]{16,}$/

function refus(s: { error: string; status: number; code?: string }) {
  return NextResponse.json({ error: s.error, ...(s.code ? { code: s.code } : {}) }, { status: s.status })
}

export async function GET(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return refus(s)
  if (!actif('pushWeb')) return NextResponse.json(INDISPONIBLE, { status: 503 })
  const { data, error } = await supabaseAdmin
    .from('push_abonnements').select('id, type, endpoint, appareil, actif, cree_le, dernier_succes, echecs')
    .eq('artisan_id', s.uid).order('cree_le', { ascending: false })
  if (error) return NextResponse.json({ error: 'Liste indisponible.' }, { status: 503 })
  return NextResponse.json({ cle: clePubliqueVapid(), appareils: data ?? [] })
}

export async function POST(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return refus(s)
  if (!actif('pushWeb')) return NextResponse.json(INDISPONIBLE, { status: 503 })
  if (!(await consommerLimite(`push:abonner:${s.uid}`, 20, 3600))) return NextResponse.json({ error: 'Trop de tentatives. Patientez quelques minutes.' }, { status: 429 })

  const body = (await req.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint.trim() : ''
  const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh.trim() : ''
  const auth = typeof body?.keys?.auth === 'string' ? body.keys.auth.trim() : ''
  let url: URL | null = null
  try { url = new URL(endpoint) } catch { url = null }
  if (!url || url.protocol !== 'https:' || endpoint.length > 2000 || !B64URL.test(p256dh) || !B64URL.test(auth)) {
    return NextResponse.json({ error: 'Abonnement invalide.' }, { status: 400 })
  }
  const ua = lireUserAgent(req.headers.get('user-agent'))
  const appareil = `${ua.appareil} · ${ua.navigateur}`.slice(0, 80)

  // Même endpoint déjà connu (rechargement, réactivation) : on le remet à jour, quel que soit son état.
  const { data: existant } = await supabaseAdmin.from('push_abonnements').select('id, artisan_id').eq('endpoint', endpoint).maybeSingle()
  if (existant && existant.artisan_id !== s.uid) {
    // Un endpoint appartient à un navigateur, donc à une seule personne : s'il change de compte, il change de main.
    await supabaseAdmin.from('push_abonnements').delete().eq('id', existant.id)
  }
  const ligne = { artisan_id: s.uid, type: 'web', endpoint, p256dh, auth, appareil, actif: true, echecs: 0 }
  const { data, error } = existant && existant.artisan_id === s.uid
    ? await supabaseAdmin.from('push_abonnements').update(ligne).eq('id', existant.id).select('id, appareil, cree_le').single()
    : await supabaseAdmin.from('push_abonnements').insert(ligne).select('id, appareil, cree_le').single()
  if (error) {
    console.error('[push/abonner]', error.message)
    return NextResponse.json({ error: 'Abonnement non enregistré.' }, { status: 503 })
  }
  return NextResponse.json({ ok: true, appareil: data })
}

export async function DELETE(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return refus(s)
  if (!actif('pushWeb')) return NextResponse.json(INDISPONIBLE, { status: 503 })
  const body = (await req.json().catch(() => null)) as { id?: unknown; endpoint?: unknown } | null
  const id = typeof body?.id === 'string' ? body.id : null
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : null
  if (!id && !endpoint) return NextResponse.json({ error: 'Appareil non précisé.' }, { status: 400 })
  let q = supabaseAdmin.from('push_abonnements').delete().eq('artisan_id', s.uid)
  q = id ? q.eq('id', id) : q.eq('endpoint', endpoint as string)
  const { error } = await q
  if (error) return NextResponse.json({ error: 'Suppression impossible.' }, { status: 503 })
  return NextResponse.json({ ok: true })
}
