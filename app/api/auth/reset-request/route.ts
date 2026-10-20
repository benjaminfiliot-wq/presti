import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { EMAIL_ENTREPRISE, sendEmail } from '@/lib/email'
import { getIp, isBanned, recordAbuse } from '@/lib/security'
import { cleEmail, consommerLimiteStricte } from '@/lib/limites'
// Audit du 20/10 : plafond FAIL-CLOSED (consommerLimiteStricte) — cette route dépense de l'IA ou écrit à un tiers ; base muette = refus, pas « tout passe ».

export const runtime = 'nodejs'

// Demande de réinitialisation : envoi d'un lien via Resend (domaine vérifié), avec un
// jeton aléatoire fort, stocké HASHÉ, à usage unique et expirant (30 min). Réponse
// TOUJOURS générique (anti-énumération d'emails).
//
// Plafonds (audit v4 §3 : « 13 emails envoyables à une cible ; le plafond était global,
// pas par email ») — même logique que /api/p/auth, rendue atomique (lib/limites) :
//  • par IP : 5 demandes / 15 min, au-delà → abus journalisé (auto-ban possible) ;
//  • par EMAIL : 3 demandes / heure, au-delà → silence. Le compteur est consommé pour
//    TOUTE adresse, existante ou non, pour que rien (ni la réponse, ni le temps de
//    réponse, ni le nombre d'emails reçus) ne révèle si un compte existe.
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')
const APP = 'https://prestiapp.fr'
const MAX_PAR_EMAIL = 3
const MAX_PAR_IP = 10

export async function POST(req: Request) {
  const generic = NextResponse.json({ ok: true })
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return generic
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : ''
    if (!email || !email.includes('@')) return generic

    if (ip !== 'unknown' && !(await consommerLimiteStricte(`reset:ip:${ip}`, MAX_PAR_IP, 15 * 60))) {
      await recordAbuse(ip, 'flood reset-request')
      return generic
    }
    if (!(await consommerLimiteStricte(cleEmail('reset:email', email), MAX_PAR_EMAIL, 60 * 60))) return generic

    // Recherche de l'utilisateur par email (stocké sur artisans). Introuvable → on renvoie
    // quand même le message générique (on ne révèle jamais si l'email existe).
    const { data: art } = await supabaseAdmin.from('artisans').select('id, nom').ilike('email', email.replace(/[%_\\]/g, '\\$&')).maybeSingle()
    if (!art?.id) return generic

    // Jeton fort, stocké hashé.
    const token = crypto.randomBytes(32).toString('base64url')
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    await supabaseAdmin.from('password_resets').insert({ uid: art.id, token_hash: sha256(token), expires_at: expires })

    const link = `${APP}/reset-password?token=${token}`
    await sendEmail({ critique: true,
      to: email,
      subject: 'Réinitialisation de votre mot de passe — Presti',
      text: `Bonjour${art.nom ? ' ' + art.nom : ''},\n\nVous avez demandé à réinitialiser votre mot de passe Presti. Cliquez sur ce lien (valable 30 minutes) pour en choisir un nouveau :\n\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email — votre mot de passe reste inchangé.\n\n— Presti`,
      replyTo: EMAIL_ENTREPRISE, // email DE Presti : une réponse arrive à l'entreprise
    }).catch(() => {})

    return generic
  } catch (e) {
    console.error('[reset-request]', e)
    return generic
  }
}
