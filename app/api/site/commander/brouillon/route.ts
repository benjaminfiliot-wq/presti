// /api/site/commander/brouillon — le dossier des écrans 1 à 3 (prompt v15 §3.1).
//
// GET  : le brouillon courant, les commandes passées, et ce qui manque encore pour payer.
// PUT  : enregistre le brouillon (nettoyé par lib/siteCommande.ts, jamais rejeté : on sauvegarde ce
//        qu'on a, on dit ce qui manque). Toute écriture passe ici, jamais par le client Supabase.
// Drapeau siteCommande baissé : 404, rien ne trahit la fonctionnalité (règle de lib/flags.ts).
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { nettoyerBrouillon, erreursAvantPaiement } from '@/lib/siteCommande'
import { brouillonDe, commandesDe, enregistrerBrouillon } from '@/lib/siteCommandeServeur'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const vide = () => nettoyerBrouillon({})

export async function GET(req: Request) {
  if (!actif('siteCommande')) return new NextResponse(null, { status: 404 })
  const auth = await authArtisan(req)
  if (estEchec(auth)) return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status })
  try {
    const [brouillon, commandes] = await Promise.all([brouillonDe(auth.uid), commandesDe(auth.uid)])
    const b = brouillon ?? { ...vide(), id: null, etat: 'brouillon' as const }
    return NextResponse.json({ brouillon: b, erreurs: erreursAvantPaiement(b), commandes })
  } catch (e) {
    // Table absente (migration 0088 pas encore collée) ou base injoignable : 503, jamais un faux vide.
    console.error('[site commande] lecture', e)
    return NextResponse.json({ error: 'Le service de commande est momentanément indisponible.' }, { status: 503 })
  }
}

export async function PUT(req: Request) {
  if (!actif('siteCommande')) return new NextResponse(null, { status: 404 })
  const auth = await authArtisan(req)
  if (estEchec(auth)) return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status })
  const corps = await req.json().catch((e) => { console.error('[site commande] corps illisible :', e?.message, 'content-type =', req.headers.get('content-type')); return null })
  if (!corps || typeof corps !== 'object') return NextResponse.json({ error: 'Corps JSON attendu.' }, { status: 400 })
  try {
    // Pas de ligne artisans = inscription pas terminée : on le dit, on n'invente pas un profil.
    const { data: profil } = await supabaseAdmin.from('artisans').select('id').eq('id', auth.uid).maybeSingle()
    if (!profil) return NextResponse.json({ error: 'Terminez d’abord votre inscription (nom et métier) avant de commander un site.' }, { status: 409 })
    const b = nettoyerBrouillon(corps)
    const enregistre = await enregistrerBrouillon(auth.uid, auth.email ?? '', b)
    return NextResponse.json({ brouillon: enregistre, erreurs: erreursAvantPaiement(enregistre) })
  } catch (e) {
    console.error('[site commande] écriture', e)
    return NextResponse.json({ error: 'Le service de commande est momentanément indisponible.' }, { status: 503 })
  }
}
