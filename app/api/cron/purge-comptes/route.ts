import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { MEDIA_BUCKET } from '@/lib/media'
import { notifierEntreprise } from '@/lib/email'

// Purge des comptes dont la suppression a été demandée il y a plus de 30 jours
// (sprint J-1 §6, migration 0052). Appelé chaque jour par Vercel Cron (vercel.json).
//
// Même garde que /api/cron/relances : le secret est obligatoire, fail-closed.
export const runtime = 'nodejs'
export const maxDuration = 60

const JOURS_DE_GRACE = 30

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const seuil = new Date(Date.now() - JOURS_DE_GRACE * 86400000).toISOString()
  const { data: comptes, error } = await supabaseAdmin.from('artisans')
    .select('id, email, nom').lte('suppression_demandee_le', seuil).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let purges = 0
  for (const c of comptes ?? []) {
    try {
      const { data: fichiers } = await supabaseAdmin.storage.from(MEDIA_BUCKET).list(c.id, { limit: 1000 })
      if (fichiers?.length) await supabaseAdmin.storage.from(MEDIA_BUCKET).remove(fichiers.map((f) => `${c.id}/${f.name}`)).catch(() => {})
      // Filet : la ligne artisan d'abord (au cas où la cascade manquerait sur une base ancienne).
      await supabaseAdmin.from('artisans').delete().eq('id', c.id)
      const del = await supabaseAdmin.auth.admin.deleteUser(c.id)
      if (del.error) { console.error('[purge-comptes]', c.id, del.error.message); continue }
      purges++
      await notifierEntreprise(`Compte purgé — ${c.nom || c.email || c.id}`, `Suppression demandée il y a ${JOURS_DE_GRACE} jours, exécutée aujourd'hui.\n\nArtisan : ${c.nom || '—'}\nEmail : ${c.email || '—'}`)
    } catch (e) { console.error('[purge-comptes]', c.id, e) }
  }
  return NextResponse.json({ ok: true, purges, en_attente: (comptes?.length ?? 0) - purges })
}
