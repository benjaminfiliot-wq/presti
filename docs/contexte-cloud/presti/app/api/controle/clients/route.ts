import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { seulsLesVrais } from '@/lib/direction/perimetre'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { sourcer } from '@/lib/direction/fraicheur'
import { planConf } from '@/lib/plans'
import { verdict, type Statut } from '@/lib/direction/apports'
import { lireApporteurs, type Apporteur } from '@/lib/direction/canaux'
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

  const liste = await sourcer('clients:liste', 'supabase', async () => {
    let req = seulsLesVrais(supabaseAdmin.from('artisans')
      .select('id, nom, email, metier, plan, credits, credits_reset_le, stripe_customer_id, stripe_subscription_id, created_at, suppression_demandee_le'))
      .order('created_at', { ascending: false }).limit(500)
    if (filtre && ['gratuit', 'essentiel', 'studio', 'signature'].includes(filtre)) req = req.eq('plan', filtre)
    const { data, error } = await req
    if (error) throw new Error(error.message)
    return data ?? []
  })
  if (liste.erreur) return NextResponse.json({ error: 'Liste indisponible pour l’instant.', detail: liste.erreur }, { status: 503 })

  const artisans = (liste.valeur ?? []).filter((a) => !q || `${a.nom ?? ''} ${a.email ?? ''} ${a.metier ?? ''}`.toLowerCase().includes(q))
  const ids = artisans.map((a) => a.id)

  // Canal d'acquisition : le registre des apports, jamais une saisie libre.
  // Sans 0067, la table n'existe pas : chaque artisan est simplement « organique » — rien n'est inventé.
  const { data: apports } = actif('apports') && ids.length
    ? await supabaseAdmin.from('registre_apports').select('artisan_id, statut, piece, motif, apporteur_id').in('artisan_id', ids)
    : { data: [] as { artisan_id: string; statut: Statut; piece: string | null; motif: string | null; apporteur_id: string }[] }
  // 0086 — la table dit maintenant qui est un APPORTEUR (commission due) et qui est un CANAL
  // d'acquisition (Facebook, LinkedIn : on sait par où l'artisan est arrivé, il n'y a personne à
  // rémunérer). Les deux s'affichent dans « Arrivé par », mais ils ne se comptent pas pareil.
  // Si la table est illisible, on rend quand même la liste : cet écran n'engage aucun argent, il
  // affiche. Éteindre l'onglet principal du Poste de contrôle pour une colonne indisponible coûte
  // plus que la colonne. Le RELEVÉ, lui, garde son 503 — là, un canal pris pour un apporteur se
  // paierait en euros.
  const parApporteur = actif('apports') ? await lireApporteurs().catch(() => null) : new Map<string, Apporteur>()
  const canalIndisponible = parApporteur === null
  const apporteursLus = parApporteur ?? new Map<string, Apporteur>()
  const parArtisan = new Map((apports ?? []).map((x) => [x.artisan_id, x]))

  // Dernière activité : le dernier lead reçu (la trace la plus fiable sans toucher au contenu).
  const { data: derniers } = ids.length
    ? await supabaseAdmin.from('leads').select('artisan_id, created_at').in('artisan_id', ids).order('created_at', { ascending: false }).limit(1000)
    : { data: [] as { artisan_id: string; created_at: string }[] }
  const activite = new Map<string, string>()
  for (const l of derniers ?? []) if (!activite.has(l.artisan_id)) activite.set(l.artisan_id, l.created_at)

  const lignes = artisans.map((a) => {
    const ap = parArtisan.get(a.id)
    const apporteur = ap ? apporteursLus.get(ap.apporteur_id) ?? null : null
    const v = ap ? verdict({ ...ap, canal: apporteur?.canal }) : null
    return {
      id: a.id, nom: a.nom, metier: a.metier, plan: a.plan, offre: planConf(a.plan).label,
      credits: a.credits, inscrit_le: a.created_at,
      abonne: !!a.stripe_subscription_id, client_stripe: !!a.stripe_customer_id,
      suppression_demandee_le: a.suppression_demandee_le,
      derniere_activite: activite.get(a.id) ?? null,
      canal: !ap ? { type: 'organique' } : apporteur?.canal
        // Arrivé par un canal : on le dit tel quel. Pas de « compte / ne compte pas » ici — la
        // question de la commission ne se pose pas, et l'afficher laisserait croire le contraire.
        ? { type: 'canal', apporteur: apporteur.nom, code: apporteur.code, statut: ap.statut, compte: false, raison: v?.raison ?? '' }
        : { type: 'apporte', apporteur: apporteur?.nom ?? null, code: apporteur?.code ?? null, statut: ap.statut, compte: v?.compte ?? false, raison: v?.raison ?? '' },
    }
  })
  return NextResponse.json({
    lignes,
    resume: {
      total: lignes.length, payants: lignes.filter((l) => l.abonne).length,
      // « Apportés » ne compte que les apports au sens du contrat : un artisan venu de Facebook
      // n'est pas apporté par quelqu'un, et le compter ici gonflerait un chiffre qui sert à parler
      // d'argent. Les canaux ont leur propre compteur.
      apportes: lignes.filter((l) => l.canal.type === 'apporte').length,
      canaux: lignes.filter((l) => l.canal.type === 'canal').length,
    },
    // Dit à l'écran que la colonne « Arrivé par » est aveugle en ce moment, plutôt que de la
    // laisser afficher « Organique » pour tout le monde — un silence qui se lirait comme un fait.
    canalIndisponible,
    source: { source: liste.source, a: liste.a, cache: liste.cache },
    role: f.role, a: new Date().toISOString(),
  })
}
