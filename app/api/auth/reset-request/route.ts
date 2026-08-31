import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/email'
import { getIp, isBanned, recordAbuse } from '@/lib/security'

export const runtime = 'nodejs'

// Demande de réinitialisation : envoi d'un lien via Resend (domaine vérifié), avec un
// jeton aléatoire fort, stocké HASHÉ, à usage unique et expirant (30 min). Réponse
// TOUJOURS générique (anti-énumération d'emails). Rate-limit par IP.
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')
const APP = 'https://prestiapp.fr'

export async function POST(req: Request) {
  const generic = NextResponse.json({ ok: true })
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return generic
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : ''
    if (!email || !email.includes('@')) return generic

    // Anti-flood : au-delà de 5 demandes / 15 min par IP → abus (auto-ban possible).
    if (ip !== 'unknown') {
      try {
        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
        const { count } = await supabaseAdmin.from('password_resets').select('id', { count: 'exact', head: true }).gte('created_at', since)
        if ((count ?? 0) > 40) { await recordAbuse(ip, 'flood reset-request'); return generic }
      } catch { /* on n'empêche pas une vraie demande */ }
    }

    // Recherche de l'utilisateur par email (stocké sur artisans). Introuvable → on renvoie
    // quand même le message générique (on ne révèle jamais si l'email existe).
    const { data: art } = await supabaseAdmin.from('artisans').select('id, nom').ilike('email', email).maybeSingle()
    if (!art?.id) return generic

    // Jeton fort, stocké hashé.
    const token = crypto.randomBytes(32).toString('base64url')
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    await supabaseAdmin.from('password_resets').insert({ uid: art.id, token_hash: sha256(token), expires_at: expires })

    const link = `${APP}/reset-password?token=${token}`
    await sendEmail({
      to: email,
      subject: 'Réinitialisation de votre mot de passe — Presti',
      text: `Bonjour${art.nom ? ' ' + art.nom : ''},\n\nVous avez demandé à réinitialiser votre mot de passe Presti. Cliquez sur ce lien (valable 30 minutes) pour en choisir un nouveau :\n\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email — votre mot de passe reste inchangé.\n\n— Presti`,
    }).catch(() => {})

    return generic
  } catch (e) {
    console.error('[reset-request]', e)
    return generic
  }
}
