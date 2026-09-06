import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { consommerLimite } from '@/lib/limites'
import { lireUserAgent } from '@/lib/userAgent'
import { actif } from '@/lib/flags'
import { clePubliqueVapid, serviceConnu } from '@/lib/push'

// Appareils abonnés aux notifications push (prompt v9 §3.4 — Paramètres → Notifications).
//
//  GET    : la clé publique VAPID et la liste des appareils de l'artisan (libellé, dates, état).
//  POST   : abonner CET appareil — l'abonnement Web Push tel que le navigateur l'a créé : endpoint https
//           chez un SERVICE DE PUSH CONNU (Google, Apple, Mozilla, Microsoft, Samsung, Opera — pas un hôte
//           quelconque : Presti n'est pas un relais de requêtes signées vers n'importe où), clés p256dh/auth
//           au format et à la taille attendus. Un endpoint déjà connu est repris, pas dupliqué ; s'il est
//           rattaché à un AUTRE compte, il ne change de main que si les clés sont les mêmes (même navigateur
//           qui se reconnecte sous un autre compte) — sinon 409, on ne retire pas l'appareil d'un tiers sur
//           simple connaissance de son adresse. Dix appareils actifs au plus par compte.
//  DELETE : retirer un appareil (le sien : l'artisan ne voit et ne touche que ses lignes).
//
// Le libellé de l'appareil vient du User-Agent (lib/userAgent), jamais de l'adresse IP. Plafond :
// 20 abonnements par compte et par heure — un script ne remplit pas la table.

export const runtime = 'nodejs'

const INDISPONIBLE = { error: 'Les notifications push ne sont pas encore disponibles.' }
/** Clé publique ECDH P-256 (65 octets) et secret d'authentification (16 octets), en base64url. */
const P256DH = /^[A-Za-z0-9_-]{86,90}$/
const AUTH = /^[A-Za-z0-9_-]{20,24}$/
const MAX_APPAREILS = 10

function refus(s: { error: string; status: number; code?: string }) {
  return NextResponse.json({ error: s.error, ...(s.code ? { code: s.code } : {}) }, { status: s.status })
}

export async function GET(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return refus(s)
  if (!actif('pushWeb')) return NextResponse.json(INDISPONIBLE, { status: 503 })
  const { data, error } = await supabaseAdmin
    .from('push_abonnements').select('id, type, endpoint, jeton, appareil, actif, cree_le, dernier_succes, echecs')
    .eq('artisan_id', s.uid).order('cree_le', { ascending: false })
  if (error) return NextResponse.json({ error: 'Liste indisponible.' }, { status: 503 })
  return NextResponse.json({ cle: clePubliqueVapid(), appareils: data ?? [] })
}

export async function POST(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return refus(s)
  if (!actif('pushWeb')) return NextResponse.json(INDISPONIBLE, { status: 503 })
  if (!(await consommerLimite(`push:abonner:${s.uid}`, 20, 3600))) return NextResponse.json({ error: 'Trop de tentatives. Patientez quelques minutes.' }, { status: 429 })

  const body = (await req.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown }; type?: unknown; jeton?: unknown } | null
  const ua = lireUserAgent(req.headers.get('user-agent'))

  // ── Appareil NATIF (coque Capacitor, J3) : un jeton APNs/FCM, pas d'endpoint ni de clés ──────────────
  if (body?.type === 'android' || body?.type === 'ios') {
    const type = body.type
    const jeton = typeof body.jeton === 'string' ? body.jeton.trim() : ''
    if (!/^[A-Za-z0-9_:-]{20,400}$/.test(jeton)) return NextResponse.json({ error: 'Jeton invalide.' }, { status: 400 })
    const appareil = `${type === 'ios' ? 'iPhone' : 'Android'} · application Presti${ua.appareil && !/inconnu/i.test(ua.appareil) ? ` (${ua.appareil})` : ''}`.slice(0, 80)
    // Un jeton natif appartient à UNE installation de l'app : s'il réapparaît sous un autre compte, l'appareil a changé
    // de main (autre artisan connecté sur le même téléphone) — le jeton lui-même en est la preuve.
    const { data: existant } = await supabaseAdmin.from('push_abonnements').select('id, artisan_id').eq('jeton', jeton).maybeSingle()
    if (existant && existant.artisan_id !== s.uid) await supabaseAdmin.from('push_abonnements').delete().eq('id', existant.id)
    const reprise = !!existant && existant.artisan_id === s.uid
    if (!reprise) {
      const { count } = await supabaseAdmin.from('push_abonnements').select('id', { count: 'exact', head: true }).eq('artisan_id', s.uid).eq('actif', true)
      if ((count ?? 0) >= MAX_APPAREILS) return NextResponse.json({ error: `${MAX_APPAREILS} appareils sont déjà abonnés : retirez-en un d’abord.` }, { status: 409 })
    }
    const ligne = { artisan_id: s.uid, type, jeton, appareil, actif: true, echecs: 0 }
    const { data, error } = reprise
      ? await supabaseAdmin.from('push_abonnements').update(ligne).eq('id', existant!.id).select('id, appareil, cree_le').single()
      : await supabaseAdmin.from('push_abonnements').insert(ligne).select('id, appareil, cree_le').single()
    if (error) { console.error('[push/abonner natif]', error.message); return NextResponse.json({ error: 'Abonnement non enregistré.' }, { status: 503 }) }
    return NextResponse.json({ ok: true, appareil: data })
  }

  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint.trim() : ''
  const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh.trim() : ''
  const auth = typeof body?.keys?.auth === 'string' ? body.keys.auth.trim() : ''
  let url: URL | null = null
  try { url = new URL(endpoint) } catch { url = null }
  if (!url || url.protocol !== 'https:' || endpoint.length > 2000 || !P256DH.test(p256dh) || !AUTH.test(auth)) {
    return NextResponse.json({ error: 'Abonnement invalide.' }, { status: 400 })
  }
  if (!serviceConnu(url.hostname)) return NextResponse.json({ error: 'Service de notifications inconnu.' }, { status: 400 })
  const appareil = `${ua.appareil} · ${ua.navigateur}`.slice(0, 80)

  const { data: existant } = await supabaseAdmin.from('push_abonnements').select('id, artisan_id').eq('endpoint', endpoint).maybeSingle()
  if (existant && existant.artisan_id !== s.uid) {
    // Un endpoint détenu par un autre compte ne change JAMAIS de main ici (contre-revue du 06/09 : un transfert sur
    // simple possession serait un canal silencieux). Le navigateur se réabonne (nouvel endpoint) et refait la demande.
    return NextResponse.json({ error: 'Abonnement à refaire sur cet appareil.', code: 'reabonner' }, { status: 409 })
  }
  const reprise = !!existant
  // Dix appareils ACTIFS au plus, la ligne reprise exclue du compte (une ligne désactivée reprise ne contourne pas le plafond).
  let q = supabaseAdmin.from('push_abonnements').select('id', { count: 'exact', head: true }).eq('artisan_id', s.uid).eq('actif', true)
  if (reprise) q = q.neq('id', existant!.id)
  const { count } = await q
  if ((count ?? 0) >= MAX_APPAREILS) return NextResponse.json({ error: `${MAX_APPAREILS} appareils sont déjà abonnés : retirez-en un d’abord.` }, { status: 409 })
  const ligne = { artisan_id: s.uid, type: 'web', endpoint, p256dh, auth, appareil, actif: true, echecs: 0 }
  const { data, error } = reprise
    ? await supabaseAdmin.from('push_abonnements').update(ligne).eq('id', existant!.id).select('id, appareil, cree_le').single()
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
  const body = (await req.json().catch(() => null)) as { id?: unknown; endpoint?: unknown; jeton?: unknown } | null
  const id = typeof body?.id === 'string' ? body.id : null
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : null
  const jeton = typeof body?.jeton === 'string' ? body.jeton : null
  if (!id && !endpoint && !jeton) return NextResponse.json({ error: 'Appareil non précisé.' }, { status: 400 })
  let q = supabaseAdmin.from('push_abonnements').delete().eq('artisan_id', s.uid)
  q = id ? q.eq('id', id) : endpoint ? q.eq('endpoint', endpoint) : q.eq('jeton', jeton as string)
  const { error } = await q
  if (error) return NextResponse.json({ error: 'Suppression impossible.' }, { status: 503 })
  return NextResponse.json({ ok: true })
}
