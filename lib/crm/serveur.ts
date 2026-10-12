// CRM — la garde commune des routes /api/crm/* et les lectures partagées. Serveur seulement (clé de service).
//
// La clé de service passe outre la RLS : sur CHAQUE requête, le filtre `.eq('artisan_id', uid)` est donc la barrière, et
// l'uid ne vient QUE de la session vérifiée (authArtisan : révocation, suspension, double authentification). Aucun
// paramètre de requête ne choisit le compte. Les déclencheurs de 0141 refusent en plus toute référence croisée.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { enEssai } from '@/lib/flags'
import { ouvertPour } from '@/lib/essais'
import { decisionAcces } from './acces'

export const PAS_DE_CACHE = { 'Cache-Control': 'private, no-store' }
export const json = (corps: unknown, status = 200) => NextResponse.json(corps, { status, headers: PAS_DE_CACHE })
export const erreur = (message: string, status: number, extra: Record<string, unknown> = {}) => json({ error: message, ...extra }, status)
export const INDISPONIBLE = 'Le CRM n’a pas pu lire vos données. Rechargez la page dans un instant.'

export type Garde = { uid: string; metier: string | null } | { reponse: NextResponse }

export async function gardeCrm(req: Request): Promise<Garde> {
  // 1. Drapeau baissé : 404 sans corps, avant toute lecture (ni session, ni base).
  if (!enEssai('crm')) return { reponse: new NextResponse(null, { status: 404, headers: PAS_DE_CACHE }) }
  const session = await authArtisan(req)
  if (estEchec(session)) {
    const d = decisionAcces({ drapeau: true, session: { ok: false, statut: session.status, erreur: session.error, code: session.code }, plan: null })
    return { reponse: erreur(d.ok ? 'Non authentifié' : d.erreur ?? 'Non authentifié', d.ok ? 401 : d.statut, d.ok || !d.code ? {} : { code: d.code }) }
  }
  // Essai (lib/flags.ts ESSAIS) : un compte hors de la liste ne sait pas que le CRM existe.
  if (!ouvertPour('crm', session.uid)) return { reponse: new NextResponse(null, { status: 404, headers: PAS_DE_CACHE }) }
  const { data: art, error } = await supabaseAdmin.from('artisans').select('plan, metier').eq('id', session.uid).maybeSingle()
  if (error) { console.error('[crm] lecture de l’offre :', error.message); return { reponse: erreur(INDISPONIBLE, 503) } }
  const d = decisionAcces({ drapeau: true, session: { ok: true }, plan: (art?.plan as string | null) ?? null })
  if (!d.ok) return { reponse: erreur(d.erreur ?? 'Accès refusé.', d.statut, d.code ? { code: d.code } : {}) }
  return { uid: session.uid, metier: (art?.metier as string | null) ?? null }
}

/** Une erreur PostgREST/Postgres → statut HTTP honnête. Les messages des déclencheurs de 0141 commencent par « crm : ». */
export function statutErreurBase(e: { code?: string; message?: string } | null | undefined): { status: number; message: string } {
  const m = e?.message ?? ''
  if (e?.code === '23505') return { status: 409, message: 'Cet élément existe déjà.' }
  if (e?.code === '23503' || /crm : /.test(m)) return { status: 404, message: 'Élément introuvable.' }
  if (e?.code === '23514' || e?.code === '22P02' || e?.code === '22007' || e?.code === '22008') return { status: 400, message: 'Valeur refusée.' }
  if (e?.code === '42P01' || e?.code === 'PGRST205' || e?.code === '42703') return { status: 503, message: 'Le CRM n’est pas encore installé sur cette base (migration 0141).' }
  return { status: 500, message: 'Enregistrement impossible.' }
}

export const LIMITE = 2000
export const COLONNES = {
  devis: 'id, artisan_id, lead_id, statut, numero, objet, client_nom, client_email, client_adresse, total_ttc, acompte_pct, date_emission, envoye_le, accepte_le, created_at, validite_jours',
  factures: 'id, artisan_id, devis_id, statut, numero, total_ttc, avoir_de, date_emission, date_echeance, client_nom, client_email, client_id',
  leads: 'id, artisan_id, statut, nom_prospect, contact, canal, type_chantier, ville, created_at',
  chantiers: 'id, artisan_id, devis_id, client_nom, titre, adresse, code_postal, ville, statut, date_debut, date_fin_prevue, date_fin_reelle, vehicule_id, notes, cree_le, maj_le',
  materiaux: 'id, artisan_id, nom, unite, categorie, seuil_alerte, fournisseur_prefere, prix_vu_ht, prix_vu_le, stock(lieu, quantite), fournisseur:fournisseurs(nom, contact)',
  clients: 'id, artisan_id, nom, email, tel, adresse, code_postal, ville',
} as const

/**
 * Tout ce que le pipeline, le tableau de bord et les fiches clients lisent, pour UN artisan. Chaque requête porte
 * `.eq('artisan_id', uid)`. Une requête en erreur fait échouer l'ensemble (jamais un tableau à moitié vide présenté
 * comme complet).
 */
export async function chargerDossiers(uid: string) {
  const [devis, factures, leads, chantiers, taches, materiaux, deplacements, carnet, vehicules, membres, equipe] = await Promise.all([
    supabaseAdmin.from('devis').select(COLONNES.devis).eq('artisan_id', uid).order('created_at', { ascending: false }).limit(LIMITE),
    supabaseAdmin.from('factures').select(COLONNES.factures).eq('artisan_id', uid).order('date_emission', { ascending: false }).limit(LIMITE),
    supabaseAdmin.from('leads').select(COLONNES.leads).eq('artisan_id', uid).order('created_at', { ascending: false }).limit(LIMITE),
    supabaseAdmin.from('chantiers').select(COLONNES.chantiers).eq('artisan_id', uid).order('cree_le', { ascending: false }).limit(LIMITE),
    supabaseAdmin.from('chantier_taches').select('chantier_id, faite').eq('artisan_id', uid).limit(20 * LIMITE),
    supabaseAdmin.from('materiaux').select(COLONNES.materiaux).eq('artisan_id', uid).limit(LIMITE),
    supabaseAdmin.from('crm_journal').select('artisan_id, objet, objet_id, vers, etape_derivee, cree_le').eq('artisan_id', uid).eq('champ', 'etape').order('cree_le', { ascending: false }).limit(LIMITE),
    supabaseAdmin.from('clients').select(COLONNES.clients).eq('artisan_id', uid).limit(LIMITE),
    supabaseAdmin.from('vehicules').select('id, nom, immatriculation, conducteur_id, controle_technique_le, entretien_le, actif').eq('artisan_id', uid).order('nom').limit(200),
    supabaseAdmin.from('equipe_membres').select('id, nom, role, actif').eq('artisan_id', uid).order('nom').limit(200),
    supabaseAdmin.from('chantier_equipe').select('chantier_id, membre_id').eq('artisan_id', uid).limit(20 * LIMITE),
  ])
  const premiere = [devis, factures, leads, chantiers, taches, materiaux, deplacements, carnet, vehicules, membres, equipe].find((r) => r.error)
  if (premiere?.error) return { ok: false as const, erreur: premiere.error }
  const lignes = {
    devis: devis.data ?? [], factures: factures.data ?? [], leads: leads.data ?? [], chantiers: chantiers.data ?? [],
    taches: taches.data ?? [], materiaux: materiaux.data ?? [], deplacements: deplacements.data ?? [], carnet: carnet.data ?? [],
    vehicules: vehicules.data ?? [], membres: membres.data ?? [], equipe: equipe.data ?? [],
  }
  const tronque = [lignes.devis, lignes.factures, lignes.leads, lignes.chantiers, lignes.materiaux].some((l) => l.length >= LIMITE)
  return { ok: true as const, ...lignes, tronque }
}

/** Le chantier de l'artisan, ou null. */
export async function chantierDe(uid: string, id: string) {
  const { data, error } = await supabaseAdmin.from('chantiers').select(COLONNES.chantiers).eq('id', id).eq('artisan_id', uid).maybeSingle()
  return { chantier: data, error }
}
