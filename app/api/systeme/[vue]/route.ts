import { NextResponse } from 'next/server'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chargerDossiers } from '@/lib/crm/serveur'
import { construireVue, type DossiersCrm } from '@/lib/crm/vue'
import { idClientPour } from '@/lib/crm/empreinte'
import { DELAI_ANNULATION_MIN, PLAFOND_AUTO_JOUR } from '@/lib/pilote/regles'
import { actif } from '@/lib/flags'
import { COLONNES, decisionGarde, drapeauSysteme, estSignature, estVue, jourParis, offreDe, tableAbsente, type VueSysteme } from '../regles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// LECTURES du système d'assistants (prompt 6, lot 036-011) : GET seulement, jamais une écriture. Le drapeau `systemeAgents` baissé :
// 404 avant la session et avant toute lecture. « Supabase » passe ici par la clé de service, qui passe outre la RLS : CHAQUE requête
// porte donc `artisan_id = uid` (l'uid vient de la session, jamais de la requête). Une table de 0193 pas encore posée répond
// « disponible: false » : l'écran dit « pas encore ouvert », il n'affiche jamais une fausse donnée. Les actions (confirmer, écarter,
// annuler un envoi, retirer une connexion) passent par les routes qui existent déjà : /api/assistant/actions, /api/pilote/file,
// /api/connexions/retirer.
const SANS_CACHE = { 'Cache-Control': 'private, no-store' }
const rep = (corps: unknown, status = 200) => NextResponse.json(corps, { status, headers: SANS_CACHE })

type Ligne = Record<string, unknown>
type Lu = { lignes: Ligne[]; disponible: boolean }

async function lire(table: string, colonnes: string, uid: string, filtre?: (q: any) => any): Promise<Lu> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let q = supabaseAdmin.from(table).select(colonnes).eq('artisan_id', uid)
  if (filtre) q = filtre(q)
  const { data, error } = await q
  if (error) {
    if (tableAbsente(error)) return { lignes: [], disponible: false }
    throw new Error(`${table} : ${error.message}`)
  }
  return { lignes: (data ?? []) as unknown as Ligne[], disponible: true }
}

const num = (v: unknown): number => { const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }

async function lectureAccueil(uid: string, maintenant: Date) {
  const il5j = new Date(maintenant.getTime() - 5 * 86_400_000).toISOString()
  const il3j = new Date(maintenant.getTime() - 3 * 86_400_000).toISOString()
  const [cartes, file, leads, factures, devis, chantiers] = await Promise.all([
    lire('assistant_actions', COLONNES.assistant_actions, uid, (q) => q.eq('statut', 'en_attente').order('cree_le', { ascending: false }).limit(50)),
    lire('actions_auto', COLONNES.actions_auto, uid, (q) => q.in('statut', ['a_partir', 'en_cours']).order('part_le', { ascending: true }).limit(50)),
    lire('leads', COLONNES.leads, uid, (q) => q.gte('created_at', il3j).order('created_at', { ascending: false }).limit(5)),
    lire('factures', 'id, numero, client_nom, total_ttc, date_echeance, statut', uid, (q) => q.neq('statut', 'payee').lt('date_echeance', maintenant.toISOString()).order('date_echeance', { ascending: true }).limit(3)),
    lire('devis', 'id, numero, client_nom, total_ttc, envoye_le, statut', uid, (q) => q.eq('statut', 'envoye').lt('envoye_le', il5j).order('envoye_le', { ascending: true }).limit(50)),
    lire('chantiers', 'id, titre, client_nom, statut, date_debut', uid, (q) => q.neq('statut', 'termine').order('cree_le', { ascending: false }).limit(3)),
  ])
  const enRetard = factures.lignes.map((f) => ({ id: f.id, numero: f.numero, client: f.client_nom, montant: num(f.total_ttc), echeance: f.date_echeance }))
  const sansReponse = devis.lignes.map((d) => ({ id: d.id, numero: d.numero, client: d.client_nom, montant: num(d.total_ttc), envoye_le: d.envoye_le }))
  return {
    cartes: cartes.lignes, file: file.lignes, cartesDisponibles: cartes.disponible,
    leads: leads.lignes, facturesEnRetard: enRetard,
    devisSansReponse: { nombre: sansReponse.length, montant: sansReponse.reduce((s, d) => s + d.montant, 0), premier: sansReponse[0] ?? null },
    chantiers: chantiers.lignes,
    calculeLe: maintenant.toISOString(),
  }
}

async function lectureFait(uid: string, maintenant: Date) {
  const il7j = new Date(maintenant.getTime() - 7 * 86_400_000).toISOString()
  const jour = jourParis(maintenant)
  const debutMois = `${jour.slice(0, 8)}01`
  const [file, cartes, leads, couts, reglages] = await Promise.all([
    lire('actions_auto', COLONNES.actions_auto, uid, (q) => q.gte('prete_le', il7j).order('prete_le', { ascending: false }).limit(80)),
    lire('assistant_actions', COLONNES.assistant_actions, uid, (q) => q.gte('cree_le', il7j).order('cree_le', { ascending: false }).limit(80)),
    lire('leads', COLONNES.leads, uid, (q) => q.gte('created_at', il7j).order('created_at', { ascending: false }).limit(20)),
    lire('couts_ia_jour', COLONNES.couts_ia_jour, uid, (q) => q.gte('jour', debutMois).limit(500)),
    lire('departements_reglages', COLONNES.departements_reglages, uid),
  ])
  const duJour = couts.lignes.filter((c) => c.jour === jour)
  const tous = reglages.lignes.find((r) => r.departement === 'tous')
  return {
    file: file.lignes, cartes: cartes.lignes, leads: leads.lignes,
    cout: {
      disponible: couts.disponible,
      jourCentimes: duJour.reduce((s, c) => s + num(c.cout_centimes), 0),
      moisCentimes: couts.lignes.reduce((s, c) => s + num(c.cout_centimes), 0),
      appelsJour: duJour.reduce((s, c) => s + num(c.appels), 0),
      plafondCentimes: tous && tous.plafond_cout_centimes_jour != null ? num(tous.plafond_cout_centimes_jour) : null,
      jour,
    },
    plafondEnvois: PLAFOND_AUTO_JOUR, delaiMin: DELAI_ANNULATION_MIN,
  }
}

async function lectureConnexions(uid: string) {
  const c = await lire('connexions', COLONNES.connexions, uid, (q) => q.neq('etat', 'retiree'))
  return { disponible: c.disponible, connexions: c.lignes, ouvertes: actif('connexions') }
}

async function lectureDepartements(uid: string, maintenant: Date) {
  const debut = `${jourParis(maintenant)}T00:00:00+01:00`
  const [reglages, parties] = await Promise.all([
    lire('departements_reglages', COLONNES.departements_reglages, uid),
    lire('actions_auto', 'type, statut', uid, (q) => q.in('statut', ['a_partir', 'en_cours', 'partie']).gte('prete_le', debut)),
  ])
  const parType: Record<string, number> = {}
  for (const l of parties.lignes) parType[String(l.type)] = (parType[String(l.type)] ?? 0) + 1
  return { disponible: reglages.disponible, reglages: reglages.lignes, enviJourParType: parType, envoisJour: parties.lignes.length, plafondEnvois: PLAFOND_AUTO_JOUR, delaiMin: DELAI_ANNULATION_MIN }
}

async function lectureClients(uid: string, metier: string | null, maintenant: Date) {
  const d = await chargerDossiers(uid)
  if (!d.ok) throw new Error('crm : lecture impossible')
  const v = construireVue({ uid, metier, d: d as unknown as DossiersCrm, maintenant, idDe: idClientPour(uid) })
  const t = v.tableau
  return {
    lu_le: maintenant.toISOString(),
    signeMois: t.signeMois, devisEnAttente: t.devisEnAttente, aEncaisser: t.aEncaisser,
    clientsActifs: v.clients.length,
    clients: v.clients.slice(0, 500).map((c) => ({ id: c.id, nom: c.nom, email: c.email, demandes: c.demandes, devis: c.devis, factures: c.factures, chantiers: c.chantiers, derniere: c.derniere })),
    chantiers: v.chantiers.slice(0, 6).map((c) => ({ id: c.id, titre: c.titre, client: c.client, statut: c.statut, date_debut: c.date_debut })),
    tronque: v.tronque,
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ vue: string }> }) {
  // 1. Le drapeau d'abord : baissé, la route n'existe pas.
  if (!drapeauSysteme()) return rep({ error: 'introuvable' }, 404)
  const { vue } = await ctx.params
  if (!estVue(vue)) return rep({ error: 'introuvable' }, 404)
  const s = await authArtisan(req)
  const g = decisionGarde({ drapeau: true, session: estEchec(s) ? { ok: false, statut: s.status, erreur: s.error } : { ok: true } })
  if (!g.ok || estEchec(s)) return rep({ error: g.ok ? 'Session refusée.' : g.erreur, ...(estEchec(s) && s.code ? { code: s.code } : {}) }, g.ok ? 401 : g.statut)
  const uid = s.uid
  try {
    const { data: art, error } = await supabaseAdmin.from('artisans').select('nom, metier, plan, is_founder').eq('id', uid).maybeSingle()
    if (error) return rep({ error: 'Votre offre n’a pas pu être lue. Réessayez dans un instant.' }, 503)
    const plan = art?.is_founder ? 'business' : ((art?.plan as string | null | undefined) ?? null)
    const maintenant = new Date()
    const base = { vue: vue as VueSysteme, offre: offreDe(plan), signature: estSignature(plan), plan, nom: (art?.nom as string | null) ?? null, metier: (art?.metier as string | null) ?? null }
    const donnees =
      vue === 'accueil' ? await lectureAccueil(uid, maintenant)
        : vue === 'fait' ? await lectureFait(uid, maintenant)
          : vue === 'connexions' ? await lectureConnexions(uid)
            : vue === 'departements' ? await lectureDepartements(uid, maintenant)
              : await lectureClients(uid, base.metier, maintenant)
    return rep({ ...base, ...donnees })
  } catch (e) {
    console.error('[systeme] lecture :', e instanceof Error ? e.message : e)
    return rep({ error: 'La lecture n’a pas abouti. Rechargez dans un instant.' }, 503)
  }
}

export async function POST() { return rep({ error: 'Méthode non permise' }, 405) }
export async function PUT() { return rep({ error: 'Méthode non permise' }, 405) }
export async function PATCH() { return rep({ error: 'Méthode non permise' }, 405) }
export async function DELETE() { return rep({ error: 'Méthode non permise' }, 405) }
