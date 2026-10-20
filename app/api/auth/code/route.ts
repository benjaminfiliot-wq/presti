import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { actif } from '@/lib/flags'
import { getIp, isBanned } from '@/lib/security'
import { consommerLimiteStricte, cleEmail } from '@/lib/limites'
// Audit du 20/10 : plafond FAIL-CLOSED (consommerLimiteStricte) — cette route dépense de l'IA ou écrit à un tiers ; base muette = refus, pas « tout passe ».
import { sendEmail } from '@/lib/email'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import {
  ERREUR_IDENTIFIANTS, MINUTES_CODE, appareilReconnu, clientPublic, gabaritCode, genererCode, hacherCode,
  marquerSessionVerifiee, sessionIdDuJeton,
} from '@/lib/connexion'

// Étape 1 de la connexion (prompt v7, bloc 2) : le mot de passe, vérifié ICI — pas dans le
// navigateur. Trois issues :
//  • le compte a une application d'authentification (TOTP) → elle REMPLACE le code email :
//    on rend la session, le navigateur demande le code de l'application (lib/authArtisan
//    exige aal2 de toute façon) ;
//  • l'appareil est de confiance (cookie signé, empreinte reconnue) → session rendue, vérifiée ;
//  • sinon → la session qui vient de s'ouvrir est refermée, un code part par email, et RIEN
//    n'est rendu au navigateur : il devra prouver le code (et redonner le mot de passe).
//
// Anti-énumération : un email inconnu et un mauvais mot de passe reçoivent exactement la
// même réponse. Le code n'est envoyé QUE si le mot de passe est bon.
//
// Plafonds (lib/limites, atomiques) : 30 essais de mot de passe par adresse IP et 10 par
// compte sur 10 min ; 3 renvois de code par compte sur 15 min, 6 envois au total.
//
// Limite connue : GoTrue plafonne aussi les connexions PAR IP, et l'IP qu'il voit ici est celle
// de Vercel, pas celle de l'artisan. À relever dans Auth → Rate limits si les connexions se
// multiplient (aujourd'hui : quelques artisans).

export const runtime = 'nodejs'

const EMAIL_SIMPLE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const TROP = 'Trop de tentatives. Patientez quelques minutes.'

async function totpActif(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId })
  if (error) { console.error('[auth/code] listFactors:', error.message); return false }
  return (data?.factors ?? []).some((f) => f.factor_type === 'totp' && f.status === 'verified')
}

export async function POST(req: Request) {
  if (!actif('codeEmail')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const ip = getIp(req)
  if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const renvoi = body?.renvoi === true
  if (!EMAIL_SIMPLE.test(email) || !password) return NextResponse.json({ error: ERREUR_IDENTIFIANTS }, { status: 400 })

  if (!(await consommerLimiteStricte(`code:ip:${ip}`, 30, 600))) return NextResponse.json({ error: TROP }, { status: 429 })
  if (!(await consommerLimiteStricte(cleEmail('code:mdp', email), 10, 600))) return NextResponse.json({ error: TROP }, { status: 429 })

  const pub = clientPublic()
  const { data, error } = await pub.auth.signInWithPassword({ email, password })
  if (error || !data.session) return NextResponse.json({ error: ERREUR_IDENTIFIANTS }, { status: 401 })
  const session = { access_token: data.session.access_token, refresh_token: data.session.refresh_token }
  const uid = data.session.user.id
  const sid = sessionIdDuJeton(session.access_token)

  // Application d'authentification : c'est elle le second facteur, pas l'email.
  if (await totpActif(uid)) return NextResponse.json({ etape: 'totp', session })

  // Appareil de confiance : pas de code, la session est vérifiée d'office.
  if (sid && (await appareilReconnu(req, uid))) {
    if (!(await marquerSessionVerifiee(sid, uid, 'appareil'))) return NextResponse.json({ error: 'Connexion impossible pour l’instant.' }, { status: 500 })
    return NextResponse.json({ etape: 'ok', session })
  }

  // Sinon cette session ne sert à rien : refermée tout de suite. Le navigateur n'en saura rien.
  await pub.auth.signOut({ scope: 'local' }).catch(() => {})

  if (renvoi && !(await consommerLimiteStricte(cleEmail('code:renvoi', email), 3, 900))) {
    return NextResponse.json({ error: 'Trop de codes demandés. Patientez 15 minutes.', code: 'renvoi_plafond' }, { status: 429 })
  }
  if (!(await consommerLimiteStricte(cleEmail('code:envoi', email), 6, 900))) {
    return NextResponse.json({ error: 'Trop de codes demandés. Patientez 15 minutes.', code: 'renvoi_plafond' }, { status: 429 })
  }

  const code = genererCode()
  const { error: eCode } = await supabaseAdmin.from('codes_connexion').upsert({
    user_id: uid, hash_code: hacherCode(uid, code), expire_le: new Date(Date.now() + MINUTES_CODE * 60_000).toISOString(), essais: 0, cree_le: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (eCode) { console.error('[auth/code] codes_connexion:', eCode.message); return NextResponse.json({ error: 'Connexion impossible pour l’instant.' }, { status: 500 }) }

  // `critique` : le plafond quotidien d'envois ne doit jamais empêcher quelqu'un d'entrer.
  const gab = gabaritCode(code)
  const envoi = await sendEmail({ to: email, subject: gab.subject, text: gab.text, critique: true })
  if (!envoi.ok) { console.error('[auth/code] envoi:', envoi.error); return NextResponse.json({ error: 'L’envoi du code a échoué. Réessayez dans un instant.' }, { status: 500 }) }
  return NextResponse.json({ etape: 'code', expire_dans: MINUTES_CODE * 60 })
}

/** L'état de la session courante : 200 si elle a passé le code, 401 `code_requis` sinon (AppShell s'en sert au montage). */
export async function GET(req: Request) {
  if (!actif('codeEmail')) return NextResponse.json({ verifiee: true, actif: false })
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error, code: s.code }, { status: s.status })
  return NextResponse.json({ verifiee: true, actif: true })
}
