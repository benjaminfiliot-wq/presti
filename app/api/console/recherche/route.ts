import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { ouvertPour } from '@/lib/essais'
import { peut } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/console/recherche?q=… — la recherche de la palette Ctrl+K de la console v2 (refonte 18/10, drapeau consoleV2).
//
// L'artisan cherche dans SES pièces : devis (numéro, client, objet), factures (numéro, client, objet), clients (nom),
// matériaux (nom). Chaque requête porte `.eq('artisan_id', uid)` : la clé de service passe outre la RLS, ce filtre est la
// seule barrière, et l'uid ne vient QUE de la session vérifiée (authArtisan). Aucun paramètre ne choisit le compte.
// Colonnes choisies une à une : ni e-mail ni téléphone ni adresse du client ne sortent d'ici.
// Drapeau baissé et compte hors essai : 404, l'écran ne sait pas que la route existe.
type Resultat = { type: 'devis' | 'facture' | 'client' | 'materiau'; id: string; titre: string; detail: string; href: string }

// Les caractères qui ont un sens pour PostgREST (`,` `(` `)` `*`) ou pour ILIKE (`%` `_` `\`) sont retirés : la recherche
// porte sur des mots, pas sur une syntaxe.
const nettoyer = (q: string) => q.replace(/[,()*%_\\:"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)

export async function GET(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error, code: s.code }, { status: s.status })
  if (!ouvertPour('consoleV2', s.uid)) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  const q = nettoyer(new URL(req.url).searchParams.get('q') ?? '')
  if (q.length < 2) return NextResponse.json({ resultats: [] })
  const motif = `*${q}*`
  const [d, f, c, m, a] = await Promise.all([
    supabaseAdmin.from('devis').select('id, numero, client_nom, objet, statut').eq('artisan_id', s.uid)
      .or(`numero.ilike.${motif},client_nom.ilike.${motif},objet.ilike.${motif}`).order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('factures').select('id, numero, client_nom, objet, statut').eq('artisan_id', s.uid)
      .or(`numero.ilike.${motif},client_nom.ilike.${motif},objet.ilike.${motif}`).order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('clients').select('id, nom, ville').eq('artisan_id', s.uid).ilike('nom', `%${q}%`).limit(5),
    supabaseAdmin.from('materiaux').select('id, nom, categorie').eq('artisan_id', s.uid).ilike('nom', `%${q}%`).limit(5),
    supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', s.uid).maybeSingle(),
  ])
  // La fiche client du CRM a ses propres clés (lib/crm/vue.ts) : on mène à la liste des clients du CRM si l'offre l'ouvre,
  // sinon aux devis, où le client apparaît.
  const versClients = peut(a.data?.is_founder ? 'business' : (a.data?.plan as string | null | undefined), 'crm') ? '/crm?vue=clients' : '/devis'
  const erreur = d.error ?? f.error ?? c.error ?? m.error
  if (erreur) {
    console.error('[console/recherche]', erreur.message)
    return NextResponse.json({ error: 'Recherche indisponible pour le moment.' }, { status: 503 })
  }
  const resultats: Resultat[] = [
    ...(d.data ?? []).map((x) => ({ type: 'devis' as const, id: x.id, titre: [x.numero, x.client_nom].filter(Boolean).join(' · ') || 'Devis', detail: x.objet ?? '', href: `/devis/${x.id}` })),
    ...(f.data ?? []).map((x) => ({ type: 'facture' as const, id: x.id, titre: [x.numero, x.client_nom].filter(Boolean).join(' · ') || 'Facture', detail: x.objet ?? '', href: '/factures' })),
    ...(c.data ?? []).map((x) => ({ type: 'client' as const, id: x.id, titre: x.nom ?? 'Client', detail: x.ville ?? '', href: versClients })),
    ...(m.data ?? []).map((x) => ({ type: 'materiau' as const, id: x.id, titre: x.nom ?? 'Matériau', detail: x.categorie ?? '', href: '/inventaire' })),
  ]
  return NextResponse.json({ resultats }, { headers: { 'Cache-Control': 'private, no-store' } })
}
