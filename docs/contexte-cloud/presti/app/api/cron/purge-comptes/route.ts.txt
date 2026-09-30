import { NextResponse } from 'next/server'
import { purgerComptes } from '@/lib/purgeComptes'

// Purge des comptes après 30 jours de grâce (§6). La logique vit dans lib/purgeComptes.ts et
// est exécutée chaque jour par le cron des relances (limite de 2 tâches planifiées sur Vercel
// Hobby). Cette route reste appelable à la main, avec le même secret, fail-closed.
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const r = await purgerComptes()
  if (r.erreur) return NextResponse.json({ error: r.erreur }, { status: 500 })
  return NextResponse.json({ ok: true, ...r })
}
