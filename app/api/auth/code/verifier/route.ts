import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { actif } from '@/lib/flags'
import { getIp, isBanned } from '@/lib/security'
import { consommerLimite } from '@/lib/limites'
import {
  ERREUR_IDENTIFIANTS, JOURS_APPAREIL, clientPublic, creerAppareil, enteteCookieAppareil, hacherCode,
  marquerSessionVerifiee, sessionIdDuJeton,
} from '@/lib/connexion'

// Étape 2 (prompt v7, bloc 2) : le code. Le mot de passe est REDONNÉ ici (le navigateur l'a
// gardé en mémoire le temps de l'écran) : le code n'est jamais accepté sans mot de passe
// valide juste avant, et aucune session n'a eu à être conservée nulle part entre les deux
// étapes. La session qui s'ouvre ici est la seule que le navigateur verra jamais.
//
// La vérification du code est une instruction SQL (verifier_code_connexion, migration 0063) :
// usage unique, 5 essais, 10 minutes — comptés par Postgres, pas par nous.

export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!actif('codeEmail')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const ip = getIp(req)
  if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const code = typeof body?.code === 'string' ? body.code.replace(/\s/g, '') : ''
  const souvenir = body?.souvenir === true
  if (!email || !password) return NextResponse.json({ error: ERREUR_IDENTIFIANTS }, { status: 400 })
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Le code fait 6 chiffres.', code: 'code_forme' }, { status: 400 })

  if (!(await consommerLimite(`code:verif:ip:${ip}`, 60, 600))) return NextResponse.json({ error: 'Trop de tentatives. Patientez quelques minutes.' }, { status: 429 })

  const pub = clientPublic()
  const { data, error } = await pub.auth.signInWithPassword({ email, password })
  if (error || !data.session) return NextResponse.json({ error: ERREUR_IDENTIFIANTS }, { status: 401 })
  const uid = data.session.user.id
  const sid = sessionIdDuJeton(data.session.access_token)
  const refermer = () => pub.auth.signOut({ scope: 'local' }).catch(() => {})

  // Le compte de RELECTURE des stores (Apple, Google) : personne ne lit sa boîte email — son code est fixe, désigné par
  // RELECTURE_EMAIL + RELECTURE_CODE (Vercel, jamais dans le dépôt). Mot de passe, plafond par IP et session marquée
  // restent identiques ; sans ces deux variables, ce chemin n'existe pas.
  const { data: verdict, error: eRpc } = codeRelecture(email, code) ? { data: 'ok', error: null } : await supabaseAdmin.rpc('verifier_code_connexion', { p_user: uid, p_hash: hacherCode(uid, code) })
  if (eRpc || typeof verdict !== 'string' || !sid) {
    await refermer()
    console.error('[auth/code/verifier] rpc:', eRpc?.message ?? 'verdict inattendu')
    return NextResponse.json({ error: 'Vérification impossible pour l’instant.' }, { status: 500 })
  }

  if (verdict !== 'ok') {
    await refermer()
    if (verdict.startsWith('faux:')) {
      const restants = Number(verdict.slice(5)) || 0
      return NextResponse.json({ error: `Code incorrect. Il vous reste ${restants} essai${restants > 1 ? 's' : ''}.`, code: 'code_faux', essais_restants: restants }, { status: 400 })
    }
    const messages: Record<string, string> = {
      absent: 'Aucun code en attente. Demandez un nouveau code.',
      expire: 'Ce code a expiré. Demandez un nouveau code.',
      epuise: 'Cinq codes refusés. Par sécurité, demandez un nouveau code.',
    }
    return NextResponse.json({ error: messages[verdict] ?? 'Code refusé.', code: `code_${verdict}` }, { status: 400 })
  }

  if (!(await marquerSessionVerifiee(sid, uid, 'code_email'))) {
    await refermer()
    return NextResponse.json({ error: 'Connexion impossible pour l’instant.' }, { status: 500 })
  }

  const reponse = NextResponse.json({ ok: true, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } })
  if (souvenir) {
    const cookie = await creerAppareil(req, uid)
    if (cookie) reponse.headers.set('Set-Cookie', enteteCookieAppareil(cookie, JOURS_APPAREIL * 86_400))
  }
  return reponse
}

/** Vrai seulement pour LE compte de relecture désigné (email exact) et son code fixe (comparaison à temps constant). */
function codeRelecture(email: string, code: string): boolean {
  const e = (process.env.RELECTURE_EMAIL || '').trim().toLowerCase(), c = (process.env.RELECTURE_CODE || '').trim()
  if (!e || !/^\d{6}$/.test(c) || email !== e) return false
  return code.length === c.length && timingSafeEqual(Buffer.from(code), Buffer.from(c))
}
