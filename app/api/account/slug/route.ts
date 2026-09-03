import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserRevocable } from '@/lib/authArtisan'
import { problemeSlug, urlPlateforme, urlSite } from '@/lib/urls'

export const runtime = 'nodejs'

// L'artisan change son adresse (v5, migration 0051). Le seul chemin possible : la colonne
// `slug` est figée côté navigateur par `lock_artisan_privileges`, parce qu'un `update` direct
// contournait la validation et les mots réservés (« www », « demande »…).
//
// Refus si l'adresse est prise — y compris si elle est l'ANCIENNE adresse d'un autre artisan :
// sinon B récupère les cartes de visite de A.

async function auth(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: 'Non authentifié', status: 401 as const }
  const { data, error } = await getUserRevocable(token)
  if (error || !data?.user) return { error: 'Session expirée, reconnectez-vous.', status: 401 as const }
  const { data: a } = await supabaseAdmin.from('artisans').select('id, slug, domaine, domaine_verifie').eq('id', data.user.id).maybeSingle()
  if (!a) return { error: 'Profil introuvable', status: 404 as const }
  return { uid: data.user.id, artisan: a }
}

export async function GET(req: Request) {
  const r = await auth(req)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ slug: r.artisan.slug, site: urlSite(r.artisan), plateforme: urlPlateforme(r.artisan) })
}

export async function POST(req: Request) {
  const r = await auth(req)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  const body = await req.json().catch(() => null)
  const slug = String(body?.slug ?? '').trim().toLowerCase()

  const probleme = problemeSlug(slug)
  if (probleme) return NextResponse.json({ error: probleme }, { status: 400 })
  if (slug === r.artisan.slug) return NextResponse.json({ slug, site: urlSite(r.artisan), plateforme: urlPlateforme(r.artisan) })

  const [{ data: pris }, { data: ancien }] = await Promise.all([
    supabaseAdmin.from('artisans').select('id').eq('slug', slug).neq('id', r.uid).maybeSingle(),
    supabaseAdmin.from('artisans').select('id').contains('slugs_anciens', [slug]).neq('id', r.uid).maybeSingle(),
  ])
  if (pris || ancien) return NextResponse.json({ error: 'Cette adresse est déjà utilisée. Essayez-en une autre.' }, { status: 409 })

  const { error } = await supabaseAdmin.from('artisans').update({ slug }).eq('id', r.uid)
  if (error) {
    // Course entre deux artisans sur la même adresse : l'index unique tranche.
    if (/duplicate|unique/i.test(error.message)) return NextResponse.json({ error: 'Cette adresse vient d’être prise. Essayez-en une autre.' }, { status: 409 })
    console.error('[account/slug]', error.message)
    return NextResponse.json({ error: 'Changement impossible pour le moment.' }, { status: 500 })
  }
  const nouveau = { ...r.artisan, slug }
  return NextResponse.json({ slug, site: urlSite(nouveau), plateforme: urlPlateforme(nouveau), ancien: r.artisan.slug })
}
