import { NextResponse } from 'next/server'
import { enregistrerPassage } from '@/lib/alertes'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { releverCanal, type Canal } from '@/lib/releveCanal'
import { getUserRevocable } from '@/lib/authArtisan'

// Relève des boîtes email (v4 §B2).
// Deux entrées : l'artisan qui clique « Relever maintenant » (POST avec son jeton),
// et le passage automatique de Vercel Cron (GET avec le secret).

export const runtime = 'nodejs'
export const maxDuration = 60

const CHAMPS = 'id, artisan_id, adresse, imap_hote, imap_port, identifiant, secret, derniere_releve'

// ── Passage automatique : toutes les boîtes actives de tous les artisans.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  // Fail-closed : sans secret configuré, la route reste fermée.
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const { data } = await supabaseAdmin.from('canaux').select(CHAMPS).eq('actif', true).eq('type', 'email').limit(50)
  let total = 0
  // `releverCanal` rend `{ importes, erreur? }` : identifiants illisibles, échec d'authentification
  // IMAP. L'erreur était jetée, et le passage s'enregistrait comme réussi. Toutes les boîtes
  // pouvaient échouer sans que rien ne l'annonce : la surveillance disait « ça tourne » pendant
  // qu'aucun message n'arrivait plus chez aucun artisan.
  const echecs: string[] = []
  for (const c of (data ?? []) as Canal[]) {
    const r = await releverCanal(c)
    total += r.importes
    if (r.erreur) echecs.push(`${c.id}: ${r.erreur}`.slice(0, 120))
  }
  const boites = data?.length ?? 0
  const reussi = echecs.length === 0
  if (!reussi) console.error('[canaux/relever] échecs :', echecs.length, 'sur', boites)
  await enregistrerPassage('canaux-relever', { boites, importes: total, echecs: echecs.length }, reussi)
  return NextResponse.json({ ok: reussi, boites, importes: total, echecs: echecs.length })
}

// ── À la demande : l'artisan relève ses propres boîtes.
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: u, error } = await getUserRevocable(token)
    if (error || !u?.user) return NextResponse.json({ error: 'Session expirée, reconnecte-toi.' }, { status: 401 })

    const { data } = await supabaseAdmin.from('canaux').select(CHAMPS)
      .eq('artisan_id', u.user.id).eq('actif', true).eq('type', 'email')
    const canaux = (data ?? []) as Canal[]
    if (canaux.length === 0) return NextResponse.json({ ok: true, importes: 0, message: 'Aucune boîte connectée.' })

    let importes = 0
    const soucis: string[] = []
    for (const c of canaux) {
      const r = await releverCanal(c)
      importes += r.importes
      if (r.erreur) soucis.push(`${c.adresse} : ${r.erreur}`)
    }

    const message = soucis.length
      ? soucis.join(' · ')
      : importes === 0
        ? 'Rien de nouveau dans vos boîtes.'
        : `${importes} nouveau${importes > 1 ? 'x' : ''} message${importes > 1 ? 's' : ''} rangé${importes > 1 ? 's' : ''} dans votre boîte de réception.`
    return NextResponse.json({ ok: soucis.length === 0, importes, message })
  } catch (e) {
    console.error('[canaux/relever] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
