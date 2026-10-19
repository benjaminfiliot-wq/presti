// CRM — la garde commune des routes /api/crm/* et les lectures partagées. Serveur seulement (clé de service).
//
// La clé de service passe outre la RLS : sur CHAQUE requête, le filtre `.eq('artisan_id', uid)` est donc la barrière, et
// l'uid ne vient QUE de la session vérifiée (authArtisan : révocation, suspension, double authentification). Aucun
// paramètre de requête ne choisit le compte. Les déclencheurs de 0141 refusent en plus toute référence croisée.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { actif, enEssai } from '@/lib/flags'
import { ouvertPour } from '@/lib/essais'
import { consommerLimite } from '@/lib/limites'
import { decisionAcces } from './acces'
import { commandeDeLigne, type CommandeA } from './commandes'
import { lirePages } from './pages'
import type { RappelLigne } from './rappels'

export const PAS_DE_CACHE = { 'Cache-Control': 'private, no-store' }
export const json = (corps: unknown, status = 200) => NextResponse.json(corps, { status, headers: PAS_DE_CACHE })
export const erreur = (message: string, status: number, extra: Record<string, unknown> = {}) => json({ error: message, ...extra }, status)
export const INDISPONIBLE = 'Le CRM n’a pas pu lire vos données. Rechargez la page dans un instant.'

export type Garde = { uid: string; metier: string | null } | { reponse: NextResponse }

/** 120 requêtes par minute et par compte : un artisan qui coche vite ses tâches en fait une par seconde, au plus. */
export const LIMITE_DEBIT = { max: 120, fenetreSec: 60 } as const

/** Méthode que la route ne sert pas — seulement APRÈS gardeCrm, pour qu'un compte hors essai reçoive 404 et non 405. */
export const nonPermise = (permises: string) => new NextResponse(null, { status: 405, headers: { ...PAS_DE_CACHE, Allow: permises } })

export async function gardeCrm(req: Request, opts: { drapeau?: 'crmPieces' | 'crmPlanning' } = {}): Promise<Garde> {
  // 1. Drapeau baissé : 404 sans corps, avant toute lecture (ni session, ni base). Une partie du CRM livrée sous son propre drapeau
  //    (18/10 : photos du chantier, planning) le vérifie ici aussi, AVANT la session : une route fermée ne dit rien.
  if (!enEssai('crm') || (opts.drapeau && !actif(opts.drapeau))) return { reponse: new NextResponse(null, { status: 404, headers: PAS_DE_CACHE }) }
  const session = await authArtisan(req)
  if (estEchec(session)) {
    const d = decisionAcces({ drapeau: true, session: { ok: false, statut: session.status, erreur: session.error, code: session.code }, plan: null })
    return { reponse: erreur(d.ok ? 'Non authentifié' : d.erreur ?? 'Non authentifié', d.ok ? 401 : d.statut, d.ok || !d.code ? {} : { code: d.code }) }
  }
  // Essai (lib/flags.ts ESSAIS) : un compte hors de la liste ne sait pas que le CRM existe.
  if (!ouvertPour('crm', session.uid)) return { reponse: new NextResponse(null, { status: 404, headers: PAS_DE_CACHE }) }
  // Limite de débit par compte (audit d'attaque du 12/10) : une lecture complète (chargerDossiers) coûte onze requêtes de
  // 2 000 lignes ; sans plafond, un jeton volé ou une boucle mal écrite pouvait marteler la base. Lue en même temps que
  // l'offre (aucune latence ajoutée) ; panne du compteur = on laisse passer (lib/limites.ts, fail-open assumé).
  const [libre, { data: art, error }] = await Promise.all([
    consommerLimite(`crm:${session.uid}`, LIMITE_DEBIT.max, LIMITE_DEBIT.fenetreSec),
    supabaseAdmin.from('artisans').select('plan, metier').eq('id', session.uid).maybeSingle(),
  ])
  if (!libre) return { reponse: erreur('Trop de demandes d’un coup : patientez une minute, rien n’a été perdu.', 429, { code: 'debit' }) }
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
  devis: 'id, artisan_id, lead_id, statut, numero, objet, client_nom, client_email, client_adresse, total_ttc, total_ht, acompte_pct, date_emission, envoye_le, accepte_le, created_at, validite_jours',
  factures: 'id, artisan_id, devis_id, statut, numero, objet, total_ttc, acompte_pct, avoir_de, date_emission, date_echeance, client_nom, client_email, client_id',
  leads: 'id, artisan_id, statut, nom_prospect, contact, canal, type_chantier, ville, created_at',
  chantiers: 'id, artisan_id, devis_id, client_nom, titre, adresse, code_postal, ville, statut, date_debut, date_fin_prevue, date_fin_reelle, vehicule_id, notes, cree_le, maj_le',
  commandes: 'id, fournisseur_nom, fournisseur_contact, reference, statut, commandee_le, livraison_prevue, recue_le, chantier_id, lignes, note, relances, relance_le',
  materiaux: 'id, artisan_id, nom, unite, categorie, seuil_alerte, fournisseur_prefere, prix_vu_ht, prix_vu_le, stock(lieu, quantite), fournisseur:fournisseurs(nom, contact)',
  clients: 'id, artisan_id, nom, email, tel, adresse, code_postal, ville',
  rappels: 'id, artisan_id, client_cle, lead_id, devis_id, chantier_id, type, echeance, heure, texte, fait_le, envoye_le, origine, cree_le',
} as const

/**
 * Tout ce que le pipeline, le tableau de bord et les fiches clients lisent, pour UN artisan. Chaque requête porte
 * `.eq('artisan_id', uid)`. Une requête en erreur fait échouer l'ensemble (jamais un tableau à moitié vide présenté
 * comme complet).
 */
export async function chargerDossiers(uid: string) {
  // Lecture PAR PAGES de 1 000 lignes : PostgREST plafonne chaque réponse (réglage « max rows » du projet, 1 000 par défaut), et un
  // `.limit(2000)` serait coupé à 1 000 SANS erreur — des tâches, des factures ou des devis manquants, des chiffres faux, et le
  // drapeau `tronque` (≥ 2 000) qui ne se lèverait jamais. Un second tri sur la clé rend les pages stables d'une page à l'autre.
  // Les rappels (0162) : tous ceux à faire, plus ceux faits ces 60 derniers jours (historique des fiches, relances envoyées).
  const depuis = new Date(Date.now() - 60 * 86_400_000).toISOString()
  const [devis, factures, leads, chantiers, taches, materiaux, deplacements, carnet, vehicules, membres, equipe, reservations, commandes, rappels] = await Promise.all([
    lirePages((de, a) => supabaseAdmin.from('devis').select(COLONNES.devis).eq('artisan_id', uid).order('created_at', { ascending: false }).order('id').range(de, a), LIMITE),
    lirePages((de, a) => supabaseAdmin.from('factures').select(COLONNES.factures).eq('artisan_id', uid).order('date_emission', { ascending: false }).order('id').range(de, a), LIMITE),
    lirePages((de, a) => supabaseAdmin.from('leads').select(COLONNES.leads).eq('artisan_id', uid).order('created_at', { ascending: false }).order('id').range(de, a), LIMITE),
    lirePages((de, a) => supabaseAdmin.from('chantiers').select(COLONNES.chantiers).eq('artisan_id', uid).order('cree_le', { ascending: false }).order('id').range(de, a), LIMITE),
    lirePages((de, a) => supabaseAdmin.from('chantier_taches').select('id, chantier_id, faite, libelle, faite_le, membre_id, ordre').eq('artisan_id', uid).order('id').range(de, a), 20 * LIMITE),
    lirePages((de, a) => supabaseAdmin.from('materiaux').select(COLONNES.materiaux).eq('artisan_id', uid).order('id').range(de, a), LIMITE),
    lirePages((de, a) => supabaseAdmin.from('crm_journal').select('artisan_id, objet, objet_id, vers, etape_derivee, cree_le').eq('artisan_id', uid).eq('champ', 'etape').order('cree_le', { ascending: false }).order('id').range(de, a), LIMITE),
    lirePages((de, a) => supabaseAdmin.from('clients').select(COLONNES.clients).eq('artisan_id', uid).order('id').range(de, a), LIMITE),
    lirePages((de, a) => supabaseAdmin.from('vehicules').select('id, nom, immatriculation, conducteur_id, controle_technique_le, entretien_le, actif').eq('artisan_id', uid).order('nom').order('id').range(de, a), 200),
    lirePages((de, a) => supabaseAdmin.from('equipe_membres').select('id, nom, role, actif').eq('artisan_id', uid).order('nom').order('id').range(de, a), 200),
    lirePages((de, a) => supabaseAdmin.from('chantier_equipe').select('chantier_id, membre_id').eq('artisan_id', uid).order('chantier_id').order('membre_id').range(de, a), 20 * LIMITE),
    lirePages((de, a) => supabaseAdmin.from('chantier_materiaux').select('chantier_id, materiau_id, quantite, statut').eq('artisan_id', uid).in('statut', ['reserve', 'sorti']).order('id').range(de, a), 20 * LIMITE),
    lirePages((de, a) => supabaseAdmin.from('commandes_fournisseur').select(COLONNES.commandes).eq('artisan_id', uid).in('statut', ['commandee']).order('livraison_prevue', { ascending: true }).order('id').range(de, a), 500),
    lirePages((de, a) => supabaseAdmin.from('crm_rappels').select(COLONNES.rappels).eq('artisan_id', uid).or(`fait_le.is.null,fait_le.gte.${depuis}`).order('echeance').order('id').range(de, a), LIMITE),
  ])
  const premiere = [devis, factures, leads, chantiers, taches, materiaux, deplacements, carnet, vehicules, membres, equipe, reservations].find((r) => r.error)
  if (premiere?.error) return { ok: false as const, erreur: premiere.error }
  // Les commandes : la migration 0158 peut ne pas être appliquée. Table absente = « pas encore de suivi des commandes » (dit à
  // l'écran), jamais « aucune commande » ; toute AUTRE erreur fait échouer la lecture comme pour les autres tables.
  const tableAbsente = !!commandes.error && ['42P01', 'PGRST205'].includes(String(commandes.error.code))
  if (commandes.error && !tableAbsente) return { ok: false as const, erreur: commandes.error }
  // Les rappels : même règle (0162 peut ne pas être appliquée : l'écran dit « rappels pas encore installés »).
  const rappelsAbsents = !!rappels.error && ['42P01', 'PGRST205'].includes(String(rappels.error.code))
  if (rappels.error && !rappelsAbsents) return { ok: false as const, erreur: rappels.error }
  const commandesLues: CommandeA[] = (commandes.data ?? []).map((r) => commandeDeLigne(r as unknown as Record<string, unknown>)).filter((c): c is CommandeA => c !== null)
  const lignes = {
    devis: devis.data ?? [], factures: factures.data ?? [], leads: leads.data ?? [], chantiers: chantiers.data ?? [],
    taches: taches.data ?? [], materiaux: materiaux.data ?? [], deplacements: deplacements.data ?? [], carnet: carnet.data ?? [],
    vehicules: vehicules.data ?? [], membres: membres.data ?? [], equipe: equipe.data ?? [],
    reservations: reservations.data ?? [], commandes: commandesLues, commandesDisponibles: !tableAbsente,
    rappels: (rappels.data ?? []) as unknown as RappelLigne[], rappelsDisponibles: !rappelsAbsents,
  }
  const tronque = [lignes.devis, lignes.factures, lignes.leads, lignes.chantiers, lignes.materiaux].some((l) => l.length >= LIMITE)
  return { ok: true as const, ...lignes, tronque }
}

/** Le chantier de l'artisan, ou null. */
export async function chantierDe(uid: string, id: string) {
  const { data, error } = await supabaseAdmin.from('chantiers').select(COLONNES.chantiers).eq('id', id).eq('artisan_id', uid).maybeSingle()
  return { chantier: data, error }
}
