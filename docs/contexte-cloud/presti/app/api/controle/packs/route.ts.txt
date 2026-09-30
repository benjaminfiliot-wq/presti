import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { DUREE_APERCU_S, FICHIERS_PACK } from '@/lib/packPubLivraison'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  if (f.role !== 'direction') return NextResponse.json({ error: 'Lecture seule.' }, { status: 403 })
  const droit = exigerDomaine(f, 'clients', 'voir')
  if (domaineRefuse(droit)) return reponseRefus(droit)

  const { data, error } = await supabaseAdmin.from('packs_pubs')
    .select('id, artisan_id, email, etat, paye_le, fabrique_le, livre_le, lien_expire_le, cree_le, modifie_le, refaits, verifications')
    .neq('etat', 'brouillon').order('modifie_le', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'Packs indisponibles.' }, { status: 503 })

  const ids = [...new Set((data ?? []).map((p) => p.artisan_id).filter(Boolean))] as string[]
  const { data: artisans, error: erreurArtisans } = ids.length
    ? await supabaseAdmin.from('artisans').select('id, nom, metier, slug').in('id', ids)
    : { data: [], error: null }
  if (erreurArtisans) return NextResponse.json({ error: 'Artisans indisponibles.' }, { status: 503 })
  const parId = new Map((artisans ?? []).map((a) => [a.id, a]))

  const packs = await Promise.all((data ?? []).map(async (pack) => {
    let apercus: { fichier: string; url: string }[] = []
    if (pack.etat === 'fabriquee') {
      const medias = FICHIERS_PACK.slice(0, 6)
      const chemins = medias.map((fichier) => `packs-pubs/${pack.id}/${fichier}`)
      const { data: liens, error: erreurLiens } = await supabaseAdmin.storage.from('packs-pubs').createSignedUrls(chemins, 600)
      if (erreurLiens || !liens || liens.some((l) => l.error || !l.signedUrl)) return { erreur: true as const }
      apercus = liens.map((l, i) => ({ fichier: medias[i], url: l.signedUrl! }))
    }
    return { ...pack, artisan: pack.artisan_id ? parId.get(pack.artisan_id) ?? null : null, apercus, duree_apercu_s: DUREE_APERCU_S }
  }))
  if (packs.some((p) => 'erreur' in p)) return NextResponse.json({ error: 'Aperçus indisponibles.' }, { status: 503 })
  return NextResponse.json({ packs })
}
