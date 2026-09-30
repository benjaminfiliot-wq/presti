import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { consommerLimite } from '@/lib/limites'
import { estDirection, estRefus, reponseRefus } from '@/lib/direction/garde'
import { emettre, PORTEES, DUREE_S, type Portee } from '@/lib/direction/reconfirmation'
import { journaliser } from '@/lib/direction/journal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/controle/reconfirmer { password, portee } → { jeton, expire_dans, portee }
//
// Le fondateur redonne son mot de passe ; il est vérifié CÔTÉ SERVEUR par une connexion de contrôle dont la
// session est fermée aussitôt (motif app/api/securite/mot-de-passe/route.ts). Cinq essais par quart d'heure.
// Le compte de relecture des stores (code fixe) n'a rien à faire ici : refusé.
export async function POST(req: Request) {
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const body = (await req.json().catch(() => null)) as { password?: unknown; portee?: unknown } | null
  const password = typeof body?.password === 'string' ? body.password : ''
  const portee = PORTEES.includes(body?.portee as Portee) ? (body!.portee as Portee) : null
  if (!password || !portee) return NextResponse.json({ error: 'Mot de passe et portée requis.' }, { status: 400 })
  if (!(await consommerLimite(`reconf:${f.uid}`, 5, 15 * 60))) return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' }, { status: 429 })

  const { data: u } = await supabaseAdmin.auth.admin.getUserById(f.uid)
  const email = u?.user?.email
  if (!email) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 })
  const relecture = (process.env.RELECTURE_EMAIL || '').trim().toLowerCase()
  if (relecture && email.toLowerCase() === relecture) return NextResponse.json({ error: 'Ce compte ne peut pas confirmer d’action.' }, { status: 403 })

  const controle = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: co, error: eCo } = await controle.auth.signInWithPassword({ email, password })
  if (eCo || !co?.session) return NextResponse.json({ error: 'Mot de passe incorrect.', code: 'mot_de_passe' }, { status: 403 })
  try {
    const charge = JSON.parse(Buffer.from(co.session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
    if (typeof charge?.session_id === 'string') await supabaseAdmin.rpc('revoquer_session_auth', { p_uid: f.uid, p_session: charge.session_id })
  } catch { /* la session de contrôle expirera d'elle-même */ }

  const j = await emettre(f.uid, portee)
  if (!j) return NextResponse.json({ error: 'Confirmation impossible pour l’instant.' }, { status: 503 })
  // Journalisé SANS le jeton. Pas de journal → pas de jeton (il expirera seul, inutilisé).
  if (!(await journaliser({ acteur: f, action: 'reconfirmation', apres: { portee } }, req))) return NextResponse.json({ error: 'Action refusée : le journal de direction est indisponible.', code: 'journal_indisponible' }, { status: 503 })
  return NextResponse.json({ jeton: j.jeton, expire_dans: DUREE_S, portee })
}
