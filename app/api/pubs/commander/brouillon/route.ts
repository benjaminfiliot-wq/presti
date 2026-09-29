import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { brouillonPackDe, enregistrerBrouillonPack } from '@/lib/packPubServeur'
import { nettoyerDossierPack } from '@/lib/packPubDossier'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function contexteSite(uid: string) {
  const { data, error } = await supabaseAdmin.from('sites_commandes')
    .select('matiere').eq('artisan_id', uid).order('cree_le', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(`Lecture du dossier de site impossible : ${error.message}`)
  const matiere = data?.matiere as {
    photos?: { url?: unknown }[]
    decennale?: { assureur?: unknown; numero?: unknown }
  } | null | undefined
  const photosDuSite = Array.isArray(matiere?.photos)
    ? matiere.photos.map((photo) => photo?.url).filter((url): url is string => typeof url === 'string' && !!url)
    : []
  const decennaleDeclaree = !!(matiere?.decennale?.assureur && matiere?.decennale?.numero)
  return { photosDuSite, decennaleDeclaree }
}

export async function GET(req: Request) {
  if (!actif('packPub')) return new NextResponse(null, { status: 404 })
  const auth = await authArtisan(req)
  if (estEchec(auth)) return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status })
  try {
    const [brouillon, contexte] = await Promise.all([brouillonPackDe(auth.uid), contexteSite(auth.uid)])
    return NextResponse.json({ brouillon, ...contexte })
  } catch (e) {
    console.error('[pack pubs] lecture du dossier', e)
    return NextResponse.json({ error: 'Le dossier est momentanément indisponible.' }, { status: 503 })
  }
}

export async function PUT(req: Request) {
  if (!actif('packPub')) return new NextResponse(null, { status: 404 })
  const auth = await authArtisan(req)
  if (estEchec(auth)) return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status })
  const corps: unknown = await req.json().catch(() => null)
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) {
    return NextResponse.json({ erreurs: [{ champ: 'dossier', message: 'Corps JSON attendu.' }] }, { status: 400 })
  }
  try {
    const contexte = await contexteSite(auth.uid)
    const resultat = nettoyerDossierPack(corps, {
      uid: auth.uid,
      urlSupabase: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      ...contexte,
    })
    if (!resultat.ok) return NextResponse.json({ erreurs: resultat.erreurs }, { status: 400 })
    const brouillon = await enregistrerBrouillonPack(auth.uid, auth.email ?? '', resultat.dossier)
    return NextResponse.json({ brouillon })
  } catch (e) {
    console.error('[pack pubs] écriture du dossier', e)
    return NextResponse.json({ error: 'Le dossier est momentanément indisponible.' }, { status: 503 })
  }
}
