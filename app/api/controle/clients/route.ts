import { NextResponse } from 'next/server'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { clients } from '@/lib/controle/lectures'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/clients — la liste des artisans (prompt v10 §2.2).
//
// Ce qu'elle contient : ce qu'il faut pour diriger — offre, crédits, inscription, dernière activité, canal
// d'acquisition (organique, ou apporté par X, avec la force de la preuve). Ce qu'elle ne contient pas : le
// contenu des conversations, des devis ou des factures — les données des artisans restent les leurs (§1).
//
// Le statut Stripe n'est pas recopié en base : il est lu en direct pour la fiche (J2b). Ici on ne dit que ce
// que la base sait, avec sa fraîcheur.

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'clients', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim().toLowerCase().slice(0, 60)
  const filtre = u.searchParams.get('offre')

  const lu = await clients(q, filtre, actif('apports'))
  if ('indisponible' in lu) return NextResponse.json({ error: 'Liste indisponible pour l’instant.', detail: lu.indisponible }, { status: 503 })
  return NextResponse.json({ ...lu, role: f.role, a: new Date().toISOString() })
}
