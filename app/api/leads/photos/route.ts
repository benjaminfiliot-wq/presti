import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'

// Photos de chantier — URLs signées, à durée courte (v4 §11).
//
// Pourquoi cette route existe : le bucket `lead-media` était PUBLIC, et son listing
// anonyme énumérait les identifiants de demandes. N'importe qui pouvait donc télécharger
// les photos de chantier envoyées par les clients — des photos de domiciles privés,
// prises à l'intérieur. C'est la fuite la plus grave trouvée par l'audit, et elle ne
// demandait aucun compte.
//
// Le bucket est désormais privé ; l'artisan obtient ici des liens signés valables une
// heure, uniquement pour SES demandes.

export const runtime = 'nodejs'

const DUREE = 3600 // une heure : le temps de consulter une demande, pas plus

export async function POST(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error }, { status: s.status })

  const b = await req.json().catch(() => null)
  const leadId = String(b?.lead || '')
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return NextResponse.json({ error: 'Demande invalide' }, { status: 400 })

  // Propriété vérifiée AVANT de signer quoi que ce soit.
  const { data: lead } = await supabaseAdmin.from('leads')
    .select('photos').eq('id', leadId).eq('artisan_id', s.uid).maybeSingle()
  if (!lead) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  const photos = Array.isArray(lead.photos) ? (lead.photos as string[]) : []
  if (!photos.length) return NextResponse.json({ ok: true, urls: [] })

  // Les valeurs stockées sont des URL publiques héritées : on en extrait le chemin.
  const chemins = photos
    .map((u) => (String(u).match(/\/lead-media\/(.+)$/)?.[1] ?? String(u)).split('?')[0])
    .filter(Boolean)

  const { data, error } = await supabaseAdmin.storage.from('lead-media').createSignedUrls(chemins, DUREE)
  if (error) { console.error('[leads/photos]', error.message); return NextResponse.json({ error: 'Photos indisponibles' }, { status: 500 }) }

  return NextResponse.json({ ok: true, urls: (data ?? []).map((d) => d.signedUrl).filter(Boolean) })
}
