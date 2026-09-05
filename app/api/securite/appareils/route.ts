import { NextResponse } from 'next/server'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { actif } from '@/lib/flags'
import { enteteCookieAppareilVide, lireCookieAppareil, listerAppareils, revoquerAppareils } from '@/lib/connexion'

// Appareils de confiance (prompt v7, bloc 2 — Paramètres → Sécurité).
//  GET    : la liste (nom lu dans l'agent, dates, « cet appareil » si le cookie correspond).
//  DELETE : en retirer un — au prochain accès depuis cet appareil, le code sera redemandé.
// « Fermer toutes mes sessions » (api/securite/sessions, POST) les révoque tous.

export const runtime = 'nodejs'

export async function GET(req: Request) {
  if (!actif('codeEmail')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error, code: s.code }, { status: s.status })
  return NextResponse.json({ appareils: await listerAppareils(req, s.uid) })
}

export async function DELETE(req: Request) {
  if (!actif('codeEmail')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error, code: s.code }, { status: s.status })
  const body = await req.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Appareil inconnu.' }, { status: 400 })
  const n = await revoquerAppareils(s.uid, id)
  if (!n) return NextResponse.json({ error: 'Cet appareil n’est plus dans la liste.' }, { status: 404 })
  const reponse = NextResponse.json({ ok: true, courant: lireCookieAppareil(req)?.id === id })
  if (lireCookieAppareil(req)?.id === id) reponse.headers.set('Set-Cookie', enteteCookieAppareilVide())
  return reponse
}
