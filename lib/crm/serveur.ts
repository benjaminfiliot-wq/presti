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

/** Les colonnes lues sur la fiche : la forme juridique s'y ajoute drapeau crmAtelierVivant levé seulement (lecture, rien n'est écrit). */
// Lot 5 (même drapeau) : l'adresse et le code postal du siège, pour placer la base sur la carte (lib/crm/geocodage.ts).
const COLONNES_FICHE = (): string => (actif('crmAtelierVivant') ? 'plan, metier, forme_juridique, nom, ville, adresse, code_postal' : 'plan, metier')
// formeJuridique : drapeau crmAtelierVivant seulement (statut « à son compte / société » de la maquette) ; absente drapeau baissé.
export type Garde = {
  uid: string; metier: string | null; formeJuridique?: string | null; entreprise?: { nom: string | null; ville: string | null }
  /** L'adresse du siège (drapeau crmAtelierVivant) : seule l'adresse, le code postal et la ville partent au géocodage. */
  siege?: { adresse: string | null; code_postal: string | null; ville: string | null }
} | { reponse: NextResponse }

/** 120 requêtes par minute et par compte : un artisan qui coche vite ses tâches en fait une par seconde, au plus. */
export const LIMITE_DEBIT = { max: 120, fenetreSec: 60 } as const

/** Méthode que la route ne sert pas — seulement APRÈS gardeCrm, pour qu'un compte hors essai reçoive 404 et non 405. */
export const nonPermise = (permises: string) => new NextResponse(null, { status: 405, headers: { ...PAS_DE_CACHE, Allow: permises } })

export async function gardeCrm(req: Request, opts: { drapeau?: 'crmPieces' | 'crmPlanning' | 'crmApresChantier' | 'crmSuivi' | 'crmAtelierVivant' | 'crmPointage' } = {}): Promise<Garde> {
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
    supabaseAdmin.from('artisans').select(COLONNES_FICHE()).eq('id', session.uid).maybeSingle(),
  ])
  if (!libre) return { reponse: erreur('Trop de demandes d’un coup : patientez une minute, rien n’a été perdu.', 429, { code: 'debit' }) }
  if (error) { console.error('[crm] lecture de l’offre :', error.message); return { reponse: erreur(INDISPONIBLE, 503) } }
  const fiche = art as { plan?: string | null; metier?: string | null; forme_juridique?: string | null; nom?: string | null; ville?: string | null; adresse?: string | null; code_postal?: string | null } | null
  const d = decisionAcces({ drapeau: true, session: { ok: true }, plan: fiche?.plan ?? null })
  if (!d.ok) return { reponse: erreur(d.erreur ?? 'Accès refusé.', d.statut, d.code ? { code: d.code } : {}) }
  return { uid: session.uid, metier: fiche?.metier ?? null, ...(actif('crmAtelierVivant') ? { formeJuridique: fiche?.forme_juridique ?? null, entreprise: { nom: fiche?.nom ?? null, ville: fiche?.ville ?? null }, siege: { adresse: fiche?.adresse ?? null, code_postal: fiche?.code_postal ?? null, ville: fiche?.ville ?? null } } : {}) }
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
/** Les colonnes de la carte (migration 0172) : lues drapeau crmAtelierVivant levé SEULEMENT (drapeau baissé, la lecture est celle d'avant). */
export const COLONNES_CARTE = 'type_batiment, lat, lng, geocode_le, retire_carte_le'
export const colonnesChantiers = (): string => (actif('crmAtelierVivant') ? `${COLONNES.chantiers}, ${COLONNES_CARTE}` : COLONNES.chantiers)

/** Les réglages du CRM (crm_reglages, 0172) : `validation_auto` faux par défaut, et faux si la table manque (rien n'est validé tout seul). */
export async function lireReglages(uid: string): Promise<{ validationAuto: boolean; disponible: boolean }> {
  const { data, error } = await supabaseAdmin.from('crm_reglages').select('validation_auto').eq('artisan_id', uid).maybeSingle()
  if (error) { if (!['42P01', 'PGRST205'].includes(String(error.code))) console.error('[crm] réglages :', error.message); return { validationAuto: false, disponible: !['42P01', 'PGRST205'].includes(String(error.code)) } }
  return { validationAuto: data?.validation_auto === true, disponible: true }
}

/**
 * Tout ce que le pipeline, le tableau de bord et les fiches clients lisent, pour UN artisan. Chaque requête porte
 * `.eq('artisan_id', uid)`. Une requête en erreur fait échouer l'ensemble (jamais un tableau à moitié vide présenté
 * comme complet). `db` : la clé de service, ou une doublure en mémoire (scripts/crm-connecte-qa.mjs joue CETTE fonction).
 */
export async function chargerDossiers(uid: string, db: Pick<typeof supabaseAdmin, 'from'> = supabaseAdmin) {
  // Lecture PAR PAGES de 1 000 lignes : PostgREST plafonne chaque réponse (réglage « max rows » du projet, 1 000 par défaut), et un
  // `.limit(2000)` serait coupé à 1 000 SANS erreur — des tâches, des factures ou des devis manquants, des chiffres faux, et le
  // drapeau `tronque` (≥ 2 000) qui ne se lèverait jamais. Un second tri sur la clé rend les pages stables d'une page à l'autre.
  // Les rappels (0162) : tous ceux à faire, plus ceux faits ces 60 derniers jours (historique des fiches, relances envoyées).
  const depuis = new Date(Date.now() - 60 * 86_400_000).toISOString()
  const [devis, factures, leads, chantiers, taches, materiaux, deplacements, carnet, vehicules, membres, equipe, reservations, commandes, rappels] = await Promise.all([
    lirePages((de, a) => db.from('devis').select(COLONNES.devis).eq('artisan_id', uid).order('created_at', { ascending: false }).order('id').range(de, a), LIMITE),
    lirePages((de, a) => db.from('factures').select(COLONNES.factures).eq('artisan_id', uid).order('date_emission', { ascending: false }).order('id').range(de, a), LIMITE),
    lirePages((de, a) => db.from('leads').select(COLONNES.leads).eq('artisan_id', uid).order('created_at', { ascending: false }).order('id').range(de, a), LIMITE),
    lirePages((de, a) => db.from('chantiers').select(colonnesChantiers()).eq('artisan_id', uid).order('cree_le', { ascending: false }).order('id').range(de, a), LIMITE),
    lirePages((de, a) => db.from('chantier_taches').select('id, chantier_id, faite, libelle, faite_le, membre_id, ordre').eq('artisan_id', uid).order('id').range(de, a), 20 * LIMITE),
    lirePages((de, a) => db.from('materiaux').select(COLONNES.materiaux).eq('artisan_id', uid).order('id').range(de, a), LIMITE),
    lirePages((de, a) => db.from('crm_journal').select('artisan_id, objet, objet_id, vers, etape_derivee, cree_le').eq('artisan_id', uid).eq('champ', 'etape').order('cree_le', { ascending: false }).order('id').range(de, a), LIMITE),
    lirePages((de, a) => db.from('clients').select(COLONNES.clients).eq('artisan_id', uid).order('id').range(de, a), LIMITE),
    lirePages((de, a) => db.from('vehicules').select('id, nom, immatriculation, conducteur_id, controle_technique_le, entretien_le, actif').eq('artisan_id', uid).order('nom').order('id').range(de, a), 200),
    lirePages((de, a) => db.from('equipe_membres').select('id, nom, role, actif').eq('artisan_id', uid).order('nom').order('id').range(de, a), 200),
    lirePages((de, a) => db.from('chantier_equipe').select('chantier_id, membre_id').eq('artisan_id', uid).order('chantier_id').order('membre_id').range(de, a), 20 * LIMITE),
    lirePages((de, a) => db.from('chantier_materiaux').select('chantier_id, materiau_id, quantite, statut').eq('artisan_id', uid).in('statut', ['reserve', 'sorti']).order('id').range(de, a), 20 * LIMITE),
    lirePages((de, a) => db.from('commandes_fournisseur').select(COLONNES.commandes).eq('artisan_id', uid).in('statut', ['commandee']).order('livraison_prevue', { ascending: true }).order('id').range(de, a), 500),
    lirePages((de, a) => db.from('crm_rappels').select(COLONNES.rappels).eq('artisan_id', uid).or(`fait_le.is.null,fait_le.gte.${depuis}`).order('echeance').order('id').range(de, a), LIMITE),
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

/** Une ligne de chantier telle que lue (colonnes de la carte présentes drapeau crmAtelierVivant levé seulement). */
export type ChantierLu = {
  id: string; artisan_id: string; devis_id: string | null; client_nom: string | null; titre: string; adresse: string | null; code_postal: string | null; ville: string | null
  statut: string; date_debut: string | null; date_fin_prevue: string | null; date_fin_reelle: string | null; vehicule_id: string | null; notes: string | null; cree_le: string; maj_le: string
  type_batiment?: string | null; lat?: number | string | null; lng?: number | string | null; geocode_le?: string | null; retire_carte_le?: string | null
}
/** Le chantier de l'artisan, ou null. */
export async function chantierDe(uid: string, id: string) {
  const { data, error } = await supabaseAdmin.from('chantiers').select(colonnesChantiers()).eq('id', id).eq('artisan_id', uid).maybeSingle()
  return { chantier: data as unknown as ChantierLu | null, error }
}
