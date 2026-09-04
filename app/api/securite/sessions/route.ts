import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authArtisan, estEchec, revoquerSessions } from '@/lib/authArtisan'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Sessions de l'artisan (sprint J-1 §6 — Paramètres → Sécurité).
//
//  GET    : la liste de ses sessions ouvertes (appareil et navigateur déduits du User-Agent,
//           adresse IP telle que GoTrue l'a enregistrée — rien d'inventé : pas de ville).
//  DELETE : fermer UNE session (migration 0052, `revoquer_session_auth`).
//  POST   : « fermer toutes mes sessions » (v4 §11) — inchangé, et pour de vrai.

export const runtime = 'nodejs'

/** Le `session_id` porté par le jeton — pour marquer « cette session ». Sans vérifier la signature : Supabase l'a fait. */
function sessionDuJeton(req: Request): string | null {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    const charge = token.split('.')[1]
    if (!charge) return null
    const json = JSON.parse(Buffer.from(charge.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
    return typeof json?.session_id === 'string' ? json.session_id : null
  } catch { return null }
}

/**
 * Lecture du User-Agent, sans bibliothèque : on ne cherche pas l'exhaustivité, juste de
 * quoi reconnaître « mon téléphone » de « l'ordinateur du bureau ». Ce qu'on ne sait pas
 * lire s'affiche « Appareil inconnu », jamais une valeur devinée.
 */
function lireUserAgent(ua: string | null | undefined): { appareil: string; navigateur: string } {
  const s = ua || ''
  let appareil = 'Appareil inconnu'
  if (/iPhone/i.test(s)) appareil = 'iPhone'
  else if (/iPad/i.test(s)) appareil = 'iPad'
  else if (/Android/i.test(s)) appareil = /Mobile/i.test(s) ? 'Téléphone Android' : 'Tablette Android'
  else if (/Windows/i.test(s)) appareil = 'Ordinateur Windows'
  else if (/Macintosh|Mac OS X/i.test(s)) appareil = 'Mac'
  else if (/CrOS/i.test(s)) appareil = 'Chromebook'
  else if (/Linux/i.test(s)) appareil = 'Ordinateur Linux'
  let navigateur = 'Navigateur inconnu'
  if (/Edg\//i.test(s)) navigateur = 'Edge'
  else if (/OPR\//i.test(s)) navigateur = 'Opera'
  else if (/SamsungBrowser/i.test(s)) navigateur = 'Samsung Internet'
  else if (/Firefox\//i.test(s)) navigateur = 'Firefox'
  else if (/Chrome\//i.test(s)) navigateur = 'Chrome'
  else if (/Safari\//i.test(s) && /Version\//i.test(s)) navigateur = 'Safari'
  else if (/Playwright|HeadlessChrome/i.test(s)) navigateur = 'Chrome (test)'
  return { appareil, navigateur }
}

export async function GET(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error }, { status: s.status })

  // La RPC filtre sur auth.uid() : on l'appelle donc AVEC le jeton de l'artisan, pas avec
  // la clé service (qui n'a pas d'uid). Aucun moyen de lister les sessions d'un autre.
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data, error } = await client.rpc('sessions_de_l_artisan')
  if (error) {
    console.error('[securite/sessions] liste:', error.message)
    return NextResponse.json({ error: 'Liste des sessions indisponible pour l’instant.' }, { status: 500 })
  }
  const courante = sessionDuJeton(req)
  const sessions = ((data ?? []) as { id: string; created_at: string; updated_at: string | null; user_agent: string | null; ip: string | null }[]).map((x) => ({
    id: x.id,
    ...lireUserAgent(x.user_agent),
    ip: x.ip || null,
    ouverte_le: x.created_at,
    derniere_activite: x.updated_at || x.created_at,
    courante: !!courante && x.id === courante,
  }))
  // La session courante en tête : c'est celle qu'on ne doit pas fermer par erreur.
  sessions.sort((a, b) => Number(b.courante) - Number(a.courante))
  return NextResponse.json({ sessions })
}

export async function DELETE(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error }, { status: s.status })
  const body = await req.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Session inconnue.' }, { status: 400 })

  // On ne peut fermer que SA session : la RPC filtre sur (user_id = uid AND id = session).
  const { data, error } = await supabaseAdmin.rpc('revoquer_session_auth', { p_uid: s.uid, p_session: id })
  if (error) {
    console.error('[securite/sessions] unitaire:', error.message)
    return NextResponse.json({ error: 'Fermeture impossible pour l’instant.' }, { status: 500 })
  }
  if (!Number(data)) return NextResponse.json({ error: 'Cette session n’existe plus.' }, { status: 404 })
  return NextResponse.json({ ok: true, courante: sessionDuJeton(req) === id })
}

export async function POST(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error }, { status: s.status })

  // On n'annonce JAMAIS un succès qu'on n'a pas. Le premier code répondait « toutes vos
  // sessions ont été fermées » même quand la révocation avait échoué : l'artisan croyait
  // avoir coupé l'accès d'un ancien salarié, et ne changeait donc pas son mot de passe.
  if (!(await revoquerSessions(s.uid))) {
    return NextResponse.json({
      error: 'Impossible de fermer vos sessions pour l’instant. Par sécurité, changez votre mot de passe : cela coupe l’accès immédiatement.',
    }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: 'Toutes vos sessions ont été fermées, y compris celle-ci. Reconnectez-vous.',
  })
}
