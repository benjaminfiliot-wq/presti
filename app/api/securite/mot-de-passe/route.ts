import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { evaluerMotDePasse, messageFuite, recupererDepuisHibp, verifierFuite } from '@/lib/motDePasse'
import { consommerLimite } from '@/lib/limites'

// Changement de mot de passe (sprint J-1 §6) : l'ANCIEN est exigé, le NOUVEAU passe la
// même politique que l'inscription et la réinitialisation (lib/motDePasse : longueur,
// déni-liste, fuites HIBP) — côté serveur, pour qu'un appel direct ne la contourne pas.
//
// Pourquoi une route et pas `supabase.auth.updateUser` seul : GoTrue ne demande pas
// l'ancien mot de passe. Sur un poste laissé ouvert, n'importe qui pouvait s'approprier
// le compte en trente secondes. Ici on vérifie l'ancien par une connexion de contrôle,
// dont la session est fermée aussitôt (elle n'apparaît donc pas dans la liste).

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error }, { status: s.status })
  const body = await req.json().catch(() => null)
  const ancien = String(body?.ancien ?? '')
  const nouveau = String(body?.nouveau ?? '')
  if (!ancien || !nouveau) return NextResponse.json({ error: 'Saisissez votre mot de passe actuel et le nouveau.' }, { status: 400 })

  // Cinq essais par quart d'heure : la vérification de l'ancien mot de passe est une
  // tentative de connexion — on ne laisse pas deviner.
  if (!(await consommerLimite(`mdp:${s.uid}`, 5, 15 * 60))) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' }, { status: 429 })
  }

  const { data: u } = await supabaseAdmin.auth.admin.getUserById(s.uid)
  const email = u?.user?.email
  if (!email) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 })

  const force = evaluerMotDePasse(nouveau, email)
  if (!force.ok) return NextResponse.json({ error: force.probleme, conseil: force.conseil }, { status: 400 })
  if (nouveau === ancien) return NextResponse.json({ error: 'Le nouveau mot de passe est identique à l’actuel.' }, { status: 400 })
  const fuite = await verifierFuite(nouveau, recupererDepuisHibp)
  if (fuite.compromis) return NextResponse.json({ error: messageFuite(fuite) }, { status: 400 })

  // Vérification de l'ancien : une connexion de contrôle, dont on ferme la session tout de suite.
  const controle = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: co, error: eCo } = await controle.auth.signInWithPassword({ email, password: ancien })
  if (eCo || !co?.session) return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 403 })
  try {
    const charge = JSON.parse(Buffer.from(co.session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
    if (typeof charge?.session_id === 'string') await supabaseAdmin.rpc('revoquer_session_auth', { p_uid: s.uid, p_session: charge.session_id })
  } catch { /* la session de contrôle expirera d'elle-même */ }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(s.uid, { password: nouveau })
  if (error) {
    console.error('[securite/mot-de-passe]', error.message)
    return NextResponse.json({ error: 'Changement impossible pour l’instant.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, conseil: force.conseil })
}
