// GET /api/controle/sites?etat=<etat>&limite=50
// Les commandes de site à la demande (v15 §3.2) vues du Poste de contrôle : ce qui est payé et attend la
// fabrication, ce qui est généré et attend un humain, ce qui est validé, ce qui est en ligne. Lisible par les deux
// rôles (direction, lecture) — c'est de la lecture d'artisans, domaine « clients ». Les brouillons ne sortent pas :
// un dossier non payé n'est pas une commande.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { ETATS, type EtatCommande } from '@/lib/siteCommande'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'clients', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const u = new URL(req.url)
  const limite = Math.min(200, Math.max(1, Number(u.searchParams.get('limite')) || 50))
  const etat = u.searchParams.get('etat')
  let q = supabaseAdmin.from('sites_commandes')
    .select('id, artisan_id, email, etat, domaine_mode, domaine, metier, metiers_secondaires, communes, prix_cents, paye_le, genere_le, valide_le, en_ligne_le, scores, verifications, consigne, regenerations, cree_le, modifie_le')
    .neq('etat', 'brouillon').order('modifie_le', { ascending: false }).limit(limite)
  if (etat && ETATS.includes(etat as EtatCommande) && etat !== 'brouillon') q = q.eq('etat', etat)
  const { data, error } = await q
  // Table absente (0088 pas collée) ou base injoignable : 503, jamais une liste vide qui rassure à tort.
  if (error) return NextResponse.json({ error: 'Commandes de site indisponibles.', code: 'indisponible' }, { status: 503 })
  const ids = [...new Set((data ?? []).map((c) => c.artisan_id).filter(Boolean))] as string[]
  const { data: artisans } = ids.length ? await supabaseAdmin.from('artisans').select('id, nom, metier, slug').in('id', ids) : { data: [] }
  const parId = new Map((artisans ?? []).map((a) => [a.id, a]))
  // Le lien d'aperçu privé n'est donné qu'à la direction : le rôle lecture voit l'état, pas le site avant validation.
  const jetons = new Map<string, string | null>()
  if (f.role === 'direction' && (data ?? []).length) {
    const { data: j } = await supabaseAdmin.from('sites_commandes').select('id, apercu_jeton').in('id', (data ?? []).map((c) => c.id))
    for (const x of j ?? []) jetons.set(x.id, x.apercu_jeton)
  }
  return NextResponse.json({ commandes: (data ?? []).map((c) => ({ ...c, artisan: c.artisan_id ? parId.get(c.artisan_id) ?? null : null, apercu: jetons.get(c.id) ? `/site-genere/${c.id}/?apercu=${jetons.get(c.id)}` : null })) })
}
