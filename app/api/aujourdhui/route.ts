import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { ouvertPour } from '@/lib/essais'
import { actif } from '@/lib/flags'
import { offreMinimale, peut, type Capacite } from '@/lib/plans'
import { lirePages } from '@/lib/crm/pages'
import { calculer, jourParis, type LigneDevis, type LigneFacture } from '@/lib/tableau-de-bord/calculer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/aujourdhui — l'accueil « Aujourd'hui » de la console v2 (refonte 18/10, étape 5.2, drapeau consoleV2).
//
// Ce que la route rend, et d'où ça vient :
//   • les 3 ACTIONS du jour, tirées des vraies pièces : demandes à répondre (plateforme, dès Studio), devis à relancer
//     (la règle de Mes chiffres : envoyé depuis plus de 7 jours et encore valide), factures en retard (émises, échéance
//     dépassée, non annulées) ;
//   • les CHIFFRES DU MOIS, par LE MÊME CALCUL que Mes chiffres (lib/tableau-de-bord/calculer.ts) sur les mêmes colonnes —
//     et SEULEMENT si l'offre ouvre Mes chiffres (`chiffres`, dès Studio). Sinon `chiffres: null` et l'offre qui l'ouvre :
//     le verrou est ici, côté serveur, pas dans l'écran ;
//   • le FIL d'activité (demandes, devis envoyés et acceptés, factures émises et payées), les 8 derniers ;
//   • « DÉCOUVRIR » : les fonctionnalités LEVÉES (drapeaux) que le compte n'utilise pas encore, et si son offre les inclut.
//
// Sécurité : chaque requête porte `.eq('artisan_id', uid)` (la clé de service passe outre la RLS), l'uid ne vient QUE de la
// session vérifiée (authArtisan). Colonnes choisies une à une : ni e-mail, ni téléphone, ni adresse de client.
// Une lecture en erreur rend 503 et AUCUNE donnée : « 0 € » sur une panne serait un mensonge.
// Drapeau baissé et compte hors essai : 404.
const LIMITE = 2000
const COL_FACTURES = 'id, artisan_id, numero, client_nom, statut, date_emission, date_echeance, total_ttc, devis_id, avoir_de'
const COL_DEVIS = 'id, artisan_id, numero, client_nom, statut, date_emission, total_ttc, envoye_le, accepte_le, created_at, lead_id, validite_jours'
const COL_DEMANDES = 'id, artisan_id, nom_prospect, canal, statut, created_at, type_chantier, ville, lu_le'

type Demande = { id: string; nom_prospect: string | null; statut: string | null; created_at: string | null; lu_le?: string | null; canal?: string | null; type_chantier?: string | null; ville?: string | null; artisan_id?: string | null }
type Facture = LigneFacture & { numero?: string | null; client_nom?: string | null; payee_le?: string | null }
type Evenement = { quand: string; type: 'demande' | 'devis_envoye' | 'devis_accepte' | 'facture_emise' | 'facture_payee'; titre: string; detail: string; href: string }

const ecartJours = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000)

export async function GET(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error, code: s.code }, { status: s.status })
  if (!ouvertPour('consoleV2', s.uid)) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  const uid = s.uid

  const { data: art, error: eArt } = await supabaseAdmin.from('artisans').select('nom, metier, plan, is_founder, slug, domaine, domaine_verifie').eq('id', uid).maybeSingle()
  if (eArt || !art) return NextResponse.json({ error: 'Votre compte n’a pas pu être lu. Rechargez la page dans un instant.' }, { status: 503 })
  const plan = art.is_founder ? 'business' : (art.plan as string | null)
  const plateforme = peut(plan, 'plateforme.conversation')

  const colFactures = actif('comptaDateReglement') ? `${COL_FACTURES}, payee_le` : COL_FACTURES
  const [f, d, l] = await Promise.all([
    lirePages((de, a) => supabaseAdmin.from('factures').select(colFactures).eq('artisan_id', uid).order('date_emission', { ascending: false }).order('id').range(de, a), LIMITE),
    lirePages((de, a) => supabaseAdmin.from('devis').select(COL_DEVIS).eq('artisan_id', uid).order('created_at', { ascending: false }).order('id').range(de, a), LIMITE),
    plateforme
      ? lirePages((de, a) => supabaseAdmin.from('leads').select(COL_DEMANDES).eq('artisan_id', uid).order('created_at', { ascending: false }).order('id').range(de, a), LIMITE)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (f.error || d.error || l.error) {
    console.error('[aujourdhui] lecture', f.error?.message ?? d.error?.message ?? l.error?.message)
    return NextResponse.json({ error: 'Votre journée n’a pas pu être lue. Rechargez la page dans un instant.' }, { status: 503 })
  }
  const factures = (f.data ?? []) as unknown as Facture[]
  const devis = (d.data ?? []) as unknown as LigneDevis[]
  const demandes = (l.data ?? []) as unknown as Demande[]
  const maintenant = new Date()
  const aujourdhui = jourParis(maintenant)
  const i = calculer({ artisanId: uid, factures, devis, demandes, maintenant })

  // — Action 1 : les demandes à répondre (nouvelles, ou avec une réponse préparée qui attend la validation) —
  let aRepondre: { total: number; liste: { id: string; nom: string }[] } | null = null
  if (plateforme) {
    const ouvertes = demandes.filter((x) => x.statut === 'nouveau' || x.statut === 'en_discussion').slice(0, 300)
    const ids = ouvertes.map((x) => x.id)
    const propositions = new Set<string>()
    if (ids.length) {
      const m = await supabaseAdmin.from('messages').select('lead_id').in('lead_id', ids).eq('etat', 'proposition').limit(1000)
      if (m.error) { console.error('[aujourdhui] messages', m.error.message); return NextResponse.json({ error: 'Votre journée n’a pas pu être lue. Rechargez la page dans un instant.' }, { status: 503 }) }
      for (const x of m.data ?? []) if (x.lead_id) propositions.add(x.lead_id as string)
    }
    const liste = ouvertes.filter((x) => x.statut === 'nouveau' || propositions.has(x.id))
    aRepondre = { total: liste.length, liste: liste.slice(0, 3).map((x) => ({ id: x.id, nom: x.nom_prospect ?? 'Client' })) }
  }

  // — Action 3 : les factures en retard (même règle que l'indicateur « En retard ») —
  const annulees = new Set(factures.map((x) => x.avoir_de).filter((x): x is string => !!x))
  const enRetard = factures
    .filter((x) => x.statut === 'emise' && !x.avoir_de && !(x.id && annulees.has(x.id)) && !!x.date_echeance && x.date_echeance.slice(0, 10) < aujourdhui)
    .map((x) => ({ id: x.id ?? '', numero: x.numero ?? null, client: x.client_nom ?? null, jours: ecartJours(aujourdhui, (x.date_echeance as string).slice(0, 10)), montant: Number(x.total_ttc) || 0 }))
    .sort((a, b) => b.jours - a.jours)

  // — Le fil d'activité —
  const fil: Evenement[] = []
  for (const x of demandes.slice(0, 20)) if (x.created_at) fil.push({ quand: x.created_at, type: 'demande', titre: 'Nouvelle demande', detail: [x.nom_prospect, x.type_chantier].filter(Boolean).join(', '), href: '/messages' })
  for (const x of devis.slice(0, 40)) {
    if (x.accepte_le) fil.push({ quand: x.accepte_le, type: 'devis_accepte', titre: 'Devis accepté', detail: [x.numero, x.client_nom].filter(Boolean).join(' · '), href: `/devis/${x.id}` })
    if (x.envoye_le) fil.push({ quand: x.envoye_le, type: 'devis_envoye', titre: 'Devis envoyé', detail: [x.numero, x.client_nom].filter(Boolean).join(' · '), href: `/devis/${x.id}` })
  }
  for (const x of factures.slice(0, 40)) {
    if (x.payee_le) fil.push({ quand: x.payee_le, type: 'facture_payee', titre: 'Facture payée', detail: [x.numero, x.client_nom].filter(Boolean).join(' · '), href: '/factures' })
    if (x.date_emission && !x.avoir_de) fil.push({ quand: x.date_emission, type: 'facture_emise', titre: 'Facture émise', detail: [x.numero, x.client_nom].filter(Boolean).join(' · '), href: '/factures' })
  }
  fil.sort((a, b) => (a.quand < b.quand ? 1 : -1))

  // — Découvrir : seulement ce qui est LEVÉ, et pas encore utilisé —
  const compter = async (table: string): Promise<number | null> => {
    const r = await supabaseAdmin.from(table).select('id', { count: 'exact', head: true }).eq('artisan_id', uid)
    return r.error ? null : (r.count ?? 0)
  }
  const candidats: { id: string; cap: Capacite; leve: boolean; utilise: () => Promise<boolean | null> }[] = [
    { id: 'relances', cap: 'factures.relances', leve: actif('relancesImpayes'), utilise: async () => { const r = await supabaseAdmin.from('relances_impayes_reglages').select('actif').eq('artisan_id', uid).maybeSingle(); return r.error ? null : !!r.data?.actif } },
    { id: 'plateforme', cap: 'plateforme.conversation', leve: true, utilise: async () => (demandes.length > 0) },
    { id: 'assistant', cap: 'assistant', leve: actif('assistant') && ouvertPour('assistant', uid), utilise: async () => { const n = await compter('assistant_conversations'); return n === null ? null : n > 0 } },
    { id: 'crm', cap: 'crm', leve: actif('crm') && ouvertPour('crm', uid), utilise: async () => { const n = await compter('chantiers'); return n === null ? null : n > 0 } },
    { id: 'inventaire', cap: 'inventaire.stock', leve: true, utilise: async () => { const n = await compter('materiaux'); return n === null ? null : n > 0 } },
  ]
  const decouvrir: { id: string; inclus: boolean; offre: string | null }[] = []
  for (const c of candidats) {
    if (!c.leve) continue
    const u = await c.utilise().catch(() => null)
    if (u === true) continue // déjà utilisé : on ne le « présente » pas
    decouvrir.push({ id: c.id, inclus: peut(plan, c.cap), offre: offreMinimale(c.cap) })
  }
  decouvrir.sort((a, b) => Number(b.inclus) - Number(a.inclus))

  const chiffres = peut(plan, 'chiffres') ? {
    moisLibelle: i.periode.moisLibelle,
    moisPrecedentLibelle: i.periode.moisPrecedentLibelle,
    caMois: i.argent.caMois, variationMois: i.argent.variationMois,
    enAttente: i.argent.enAttente, nbEnAttente: i.argent.nbEnAttente,
    enRetard: i.argent.enRetard, nbEnRetard: i.argent.nbEnRetard,
    tauxAcceptation: i.devis.tauxAcceptation, devisEnvoyes: i.devis.envoyes,
    mois: i.mois.map((m) => ({ libelle: m.libelle, ca: m.ca })),
  } : null

  return NextResponse.json({
    maintenant: maintenant.toISOString(),
    artisan: { nom: art.nom ?? null, metier: art.metier ?? null, plan, slug: art.slug ?? null, domaine: art.domaine ?? null, domaine_verifie: art.domaine_verifie ?? null },
    actions: {
      repondre: aRepondre,
      relancer: { total: i.aRelancer.total, seuilJours: i.aRelancer.seuilJours, liste: i.aRelancer.liste.slice(0, 3) },
      retard: { total: i.argent.nbEnRetard, liste: enRetard.slice(0, 3) },
    },
    chiffres,
    verrouChiffres: chiffres ? null : offreMinimale('chiffres'),
    fil: fil.slice(0, 8),
    decouvrir,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
