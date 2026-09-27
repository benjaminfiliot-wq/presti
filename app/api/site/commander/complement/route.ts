// Compléter le dossier d'une commande payée, avant le début de sa génération.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { rattacherCommandesParEmail } from '@/lib/siteAchatPublic'
import { erreursFabrication } from '@/lib/siteCommande'
import { commandesACompleter, completerDossier } from '@/lib/siteCommandeServeur'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const indisponible = () => NextResponse.json({ error: 'Le service de commande est momentanément indisponible.' }, { status: 503 })
const inscription = () => NextResponse.json({ error: 'Terminez d’abord votre inscription (nom et métier) avant de commander un site.' }, { status: 409 })

async function profilExiste(uid: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('artisans').select('id').eq('id', uid).maybeSingle()
  if (error) throw new Error(`lecture du profil impossible : ${error.message}`)
  return Boolean(data)
}

export async function GET(req: Request) {
  if (!actif('siteCommande')) return new NextResponse(null, { status: 404 })
  const auth = await authArtisan(req)
  if (estEchec(auth)) return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status })
  try {
    if (!await profilExiste(auth.uid)) return inscription()
    await rattacherCommandesParEmail(auth.uid, auth.email ?? '')
    const commandes = (await commandesACompleter(auth.uid)).map((commande) => {
      const erreurs = erreursFabrication(commande)
      return { ...commande, erreurs, complet: erreurs.length === 0 }
    })
    return NextResponse.json({ commandes })
  } catch (e) {
    console.error('[site commande complément] lecture', e)
    return indisponible()
  }
}

export async function PUT(req: Request) {
  if (!actif('siteCommande')) return new NextResponse(null, { status: 404 })
  const auth = await authArtisan(req)
  if (estEchec(auth)) return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status })
  const corps = await req.json().catch(() => null)
  if (!corps || typeof corps !== 'object' || Array.isArray(corps) || typeof corps.commande !== 'string' || !corps.commande.trim()) {
    return NextResponse.json({ error: 'Commande et dossier JSON attendus.' }, { status: 400 })
  }
  try {
    if (!await profilExiste(auth.uid)) return inscription()
    await rattacherCommandesParEmail(auth.uid, auth.email ?? '')
    const { data, error } = await supabaseAdmin.from('sites_commandes').select('id, etat, genere_le')
      .eq('id', corps.commande).eq('artisan_id', auth.uid).maybeSingle()
    if (error) throw new Error(`lecture de la commande impossible : ${error.message}`)
    if (!data) return new NextResponse(null, { status: 404 })
    if (data.etat !== 'payee' || data.genere_le !== null) {
      return NextResponse.json({ error: 'Cette commande ne peut plus être complétée.' }, { status: 409 })
    }
    const resultat = await completerDossier(auth.uid, corps.commande, corps)
    if (!resultat) return NextResponse.json({ error: 'Cette commande ne peut plus être complétée.' }, { status: 409 })
    return NextResponse.json({ ...resultat, complet: resultat.erreurs.length === 0 })
  } catch (e) {
    console.error('[site commande complément] écriture', e)
    return indisponible()
  }
}
