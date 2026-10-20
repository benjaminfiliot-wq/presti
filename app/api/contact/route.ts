import { NextResponse } from 'next/server'
import { getIp, isBanned, recordAbuse } from '@/lib/security'
import { consommerLimiteStricte } from '@/lib/limites'
// Audit du 20/10 : plafond FAIL-CLOSED (consommerLimiteStricte) — cette route dépense de l'IA ou écrit à un tiers ; base muette = refus, pas « tout passe ».
import { notifierEntreprise } from '@/lib/email'

// Le formulaire de contact public (§ mise en service du 05/09/2026).
//
// Pourquoi il existe : les mentions légales publiaient `contact@prestiapp.fr`, une adresse dont la
// boîte n'a jamais pu être créée chez l'hébergeur du domaine. Tout ce qu'on y écrivait était perdu
// SANS QUE PERSONNE NE LE SACHE — ni l'expéditeur, qui croyait avoir écrit, ni nous. Publier une
// adresse qui jette le courrier est pire que ne rien publier.
//
// Ce formulaire remplace ce besoin sans dépendre d'aucune boîte : le message part par le service
// d'envoi déjà en place, vers l'adresse réellement relevée (EMAIL_ENTREPRISE), avec l'adresse de
// l'expéditeur en « répondre à » pour qu'un simple bouton Répondre suffise.

export const runtime = 'nodejs'
export const maxDuration = 20

const clip = (v: unknown, n: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, n) : null
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: Request) {
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const body = await req.json().catch(() => null)

    // Champ piège : invisible à l'écran, donc rempli seulement par un robot. On répond « ok »
    // pour ne pas lui apprendre qu'il a été repéré.
    if (clip(body?.societe, 50)) {
      await recordAbuse(ip, 'honeypot /api/contact')
      return NextResponse.json({ ok: true })
    }

    const nom = clip(body?.nom, 120)
    const email = clip(body?.email, 200)
    const message = clip(body?.message, 4000)
    if (!nom || !email || !message) return NextResponse.json({ error: 'Il manque votre nom, votre email ou votre message.' }, { status: 400 })
    if (!EMAIL.test(email)) return NextResponse.json({ error: 'Cette adresse email ne semble pas valide.' }, { status: 400 })
    if (message.length < 10) return NextResponse.json({ error: 'Dites-nous un peu plus, en une phrase au moins.' }, { status: 400 })

    // Trois messages par heure et par adresse : de quoi écrire, se corriger, relancer — pas de
    // quoi transformer le formulaire en relais d'envoi.
    if (!(await consommerLimiteStricte(`contact:${ip}`, 3, 3600))) {
      await recordAbuse(ip, 'flood /api/contact')
      return NextResponse.json({ error: 'Vous avez déjà écrit plusieurs fois : laissez-nous le temps de répondre.' }, { status: 429 })
    }

    const r = await notifierEntreprise(
      `Message de ${nom}`,
      `${message}\n\n— ${nom} · ${email}\n(envoyé depuis le formulaire de contact de prestiapp.fr)`,
      email,
    )
    if (!r.ok) return NextResponse.json({ error: 'Votre message n’a pas pu partir. Réessayez dans un moment.' }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[contact] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
