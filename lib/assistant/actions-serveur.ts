// L'assistant de gestion de la console — les ACTIONS réelles (plans/016-assistant.md, jalon A3). Serveur uniquement.
//
// Règle du plan (016 §3), inchangée : l'assistant n'a AUCUN accès à la base qui lui soit propre. Chaque action passe par le
// chemin même de l'interface, avec la session de l'artisan :
//  • devis → POST /api/devis, POST/DELETE /api/devis/[id], POST /api/devis/[id]/envoyer ;
//  • factures → creerFacture (lib/factureDepuisDevis.ts : mentions bloquantes, numérotation, TVA / franchise 293 B, scellement —
//    la fonction même du bouton « Facturer » et de la facture d'acompte automatique), PATCH /api/factures/[id] ;
//  • tarifs → POST /api/tarifs, et la RLS de prix_artisan pour un prix ou un lot (l'artisan l'écrit aussi depuis son navigateur) ;
//  • inventaire → POST /api/inventaire (fiche, mouvement par appliquer_mouvement), POST /api/inventaire/materiaux ;
//  • CRM → les routes /api/crm/* (la décision d'accès du CRM s'applique : gardeCrm) ;
//  • messages → POST /api/messages (reply, valider, rejeter) ; demandes → la RLS de leads, comme le tableau de bord.
// Aucun SQL de métier dupliqué ici : ce fichier ENCHAÎNE des appels existants, retrouve les objets par numéro ou par nom
// DANS les données de l'artisan, et fabrique la carte que l'artisan lit.
//
// Deux familles (outils-actions.ts) :
//  • directes : exécutées tout de suite, journalisées (assistant_actions), annulables quand un inverse existe ;
//  • à confirmer : l'outil du modèle ne fait que PROPOSER (une carte « en_attente ») ; la réalisation réelle n'est atteinte que
//    par confirmerAction (confirmation.ts), sur le clic de l'artisan — SAUF en mode « fait tout seul » (décision de Benj du 29/10) :
//    l'artisan l'a demandée dans SON message et aucun texte de tiers n'a été lu dans le tour (ctx.autonome, lib/assistant/cadrage.ts
//    faitToutSeul). La proposition est alors faite (mêmes contrôles), puis exécutée aussitôt avec ses entrées, et inscrite au journal
//    des actions comme une action directe (annulable quand un inverse existe). Plafonds inchangés : 30 envois, 200 actions par jour.
//    SAUF les gestes §3.2 du prompt de Benj du 01/11 (lib/pilote/regles.ts OUTILS_JAMAIS_AUTO : encaissement, facture émise et scellée,
//    suppressions, lot de prix) : même demandés par l'artisan, ils restent une carte d'un clic, toujours (02/11).
import { consommerLimite } from '@/lib/limites'
import { sendEmail } from '@/lib/email'
import { creerFacture, simulerFacture } from '@/lib/factureDepuisDevis'
import { estSituation } from '@/lib/crm/argent'
import { COLONNES_LEGALES, mentionsManquantesEmission, messageMentionsBloquantes, versArtisanLegal } from '@/lib/legalArtisan'
import { mailDevis } from '@/lib/devisMail'
import { jourParis } from '@/lib/comptaTableau'
import { POST as devisCreer } from '@/app/api/devis/route'
import { POST as devisMaj, DELETE as devisSupprimer } from '@/app/api/devis/[id]/route'
import { PATCH as factureMaj } from '@/app/api/factures/[id]/route'
import { POST as tarifsEcrire, DELETE as tarifsSupprimer } from '@/app/api/tarifs/route'
import { POST as inventaireEcrire, DELETE as inventaireSupprimer } from '@/app/api/inventaire/route'
import { GET as materiauLire, POST as materiauEcrire } from '@/app/api/inventaire/materiaux/route'
import { POST as messagesEcrire } from '@/app/api/messages/route'
import { POST as chantierCreer } from '@/app/api/crm/chantiers/route'
import { PATCH as chantierMaj, DELETE as chantierSupprimer } from '@/app/api/crm/chantiers/[id]/route'
import { POST as tacheCreer } from '@/app/api/crm/chantiers/[id]/taches/route'
import { POST as reserver } from '@/app/api/crm/chantiers/[id]/materiaux/route'
import { PATCH as tacheMaj, DELETE as tacheSupprimer } from '@/app/api/crm/taches/[id]/route'
import { DELETE as reservationSupprimer, PATCH as reservationSortir } from '@/app/api/crm/materiaux/[id]/route'
import { POST as noteCreer } from '@/app/api/crm/notes/route'
import { DELETE as noteSupprimer } from '@/app/api/crm/notes/[id]/route'
import { POST as membreCreer } from '@/app/api/crm/equipe/route'
import { DELETE as membreSupprimer } from '@/app/api/crm/equipe/[id]/route'
import { apercuLotRelances, fmtDate, fmtEuros, fmtNombre, indicesARetirer, lienDe, MARQUE_HORS_PILOTE, motifPasUnSeul, nommeDans, ordreGroupe, phraseEcartee, prixEcrits, refusRecents, resoudreLignes, REFUS_RETENUS_JOURS, tauxTtcPossibles, texteRelanceDevis, texteRelanceFacture, trouverUnique, VALIDITE_CARTE_MS, type Annulation, type Apercu, type CarteAction, type ExcluLot, type RetenuLot, type TarifLu, type TypeObjet, visePlusieursClients } from './cartes'
import { LOT_RELANCES_MAX, NOMS_ACTIONS, categorieDe, estNomAction, type EntreeAction, type LigneEntree, type NomAction } from './outils-actions'
import { encadrerClient } from './cadrage'
import { ecrireClasseur, type Cellule, type Feuille } from '@/lib/comptaXlsx'
import type { ResultatRecherche } from '@/lib/recherche-fournisseurs'
import type { FicheAction, MagasinActions, Realisateur, Realisation } from './confirmation'
import type { ResultatExecution } from './boucle'
import { appelerAvec, clientDeSession, erreurDe, type ContexteSession, type Gestionnaire, type ReponseRoute } from './session'
import { annulerParRef, piloterCarte } from '@/lib/pilote/serveur'
import { DELAI_ANNULATION_MIN, LIBELLE_MOTIF, MARQUE_CONTENU_TIERS, MESSAGES_ESCALADE_RELUS, OUTILS_CONTENU_TIERS, jamaisAutomatique, prixSources, raisonJamaisAuto, sujetEscalade, typePiloteDeOutil } from '@/lib/pilote/regles'
import { CONFIG_DEFAUT } from '@/lib/plateformeConfig'
import { actionsTout } from './actions-tout'
import { historiqueRelances, phraseRefus, relanceRecente, RELANCE_DELAI_JOURS as DELAI_REGISTRE, type ObjetRelance } from '@/lib/relancesRegistre'

/** Envois (e-mail ou message à un client) que l'assistant peut faire partir en un jour pour un compte. */
export const ENVOIS_JOUR_MAX = 30
/** Actions (directes et cartes) qu'un compte peut faire proposer ou faire en un jour : borne le travail et l'envoi en masse. */
export const ACTIONS_JOUR_MAX = 200
/** Une relance n'est pas redemandée avant ce délai. */
// 02/11 (S4) : le délai vit dans le registre commun des relances (lib/relancesRegistre.ts), lu par les quatre chemins.
export const RELANCE_DELAI_JOURS = DELAI_REGISTRE
const LOT_TARIFS_MAX = 300
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** La carte d'un outil pilotable dont la conversation n'a pas pu être relue (cinquième audit 032-007) : à la main, côté sûr. */
const MOTIF_ESCALADE_ILLISIBLE = 'Les messages du client n’ont pas pu être relus : à valider à la main.'
/** 02/11 (contre-audit 032-035, E3) : une carte de lot réclamée depuis plus longtemps a été coupée (maxDuration de la route : 60 s). */
const CARTE_COUPEE_MS = 15 * 60_000
/** 02/11 (contre-audit 032-035, E6) : la relecture des clients du compte, par pages de 1 000 ; au-delà de 20 pages, la preuve est refusée. */
const PAGE_CLIENTS = 1000
const PAGES_CLIENTS_MAX = 20

/** Ce qui peut être remplacé dans les essais (aucun e-mail réel, aucune facture scellée dans une base partagée). */
export type DependancesActions = {
  /** POST /api/devis/[id]/envoyer (génère le PDF : chargé à la demande). */
  envoyerDevis?: Gestionnaire
  /** POST /api/factures/[id]/envoyer (génère le PDF : chargé à la demande). */
  envoyerFacture?: Gestionnaire
  creerFacture?: typeof creerFacture
  /** La simulation d'une facture de situation ou de solde (0176) : le montant exact de la carte, sans rien émettre. */
  simulerFacture?: typeof simulerFacture
  envoyerMail?: typeof sendEmail
  /** 02/11 (S4) : le registre commun des relances (essais : en mémoire). */
  historiqueRelances?: typeof historiqueRelances
  /**
   * 02/11 (L16) — « Ne plus relancer ce client » (rang 5 du §0 bis) : devis → motif. Sa table `relances_exclusions` (migration 0185) n'est
   * pas posée : aucun client ne peut en porter la marque, le défaut ne lit donc rien et n'invente rien. L13 y branchera le lecteur de 0185 ;
   * une lecture en erreur LÈVE (aucun lot n'est préparé, aucune relance de lot ne part). Essais : une doublure.
   */
  exclusionsRelance?: (artisanId: string, devisIds: readonly string[]) => Promise<ReadonlyMap<string, string>>
  maintenant?: () => Date
  /** 02/11 (contre-audit 032-035, E1) : retirer de la file du pilote une carte déjà mise en file (essais : une doublure). */
  annulerPilote?: typeof annulerParRef
  /** L'appel des routes de l'interface (essais : une doublure qui enregistre la route atteinte, sans réseau). */
  appeler?: (g: Gestionnaire, chemin: string, o: { methode?: string; corps?: unknown; params?: Record<string, string> }) => Promise<ReponseRoute>
  /** Mise en file du pilote automatique (essais : en mémoire). */
  piloterCarte?: typeof piloterCarte
  /** 29/10 — POST /api/inventaire/recherche (le moteur de recherche chez les fournisseurs : chargé à la demande). */
  rechercher?: Gestionnaire
  /** 29/10 — POST /api/inventaire/recherche/retenir (chargé à la demande). */
  retenir?: Gestionnaire
}

export type ContexteActions = ContexteSession & {
  conversationId: string
  /** Le numéro du tour en cours (connu après la prise du tour : lu à l'appel). */
  tour: () => number
  magasin: MagasinActions
  dependances?: DependancesActions
  /**
   * 29/10 — mode « fait tout seul » : vrai quand l'ARTISAN a demandé une action dans SON message et qu'aucun texte écrit par un tiers
   * n'a été lu dans le tour (lu au moment d'agir : lib/assistant/cadrage.ts faitToutSeul). Absent ou faux : une action à confirmer
   * reste une carte. Jamais lu pour un geste de OUTILS_JAMAIS_AUTO (lib/pilote/regles.ts, §3.2) : celui-là reste une carte, toujours.
   */
  autonome?: () => boolean
  /**
   * 02/11 (contre-audit 032-004, D1 bis) — ce que l'ARTISAN a écrit lui-même dans la conversation (son message, ses messages de
   * l'historique ; jamais une réponse de l'assistant ni une donnée lue) : seul un prix qui y figure prend la provenance « prix donné par
   * l'artisan » (lib/assistant/cartes.ts resoudreLignes). Absent : aucun prix n'est le sien (côté sûr).
   */
  textesArtisan?: readonly string[]
}

type Obj = Record<string, unknown>
/**
 * 02/11 (contre-audit 032-035, E9) — le lecteur PAR DÉFAUT de « ne plus relancer » (0185, rang 5), UN SEUL pour l'assistant et pour le pilote
 * (lib/pilote/executeur.ts le passe à realisateursPilote) : le jour où L13 branche la table, c'est ici, et les deux chemins le lisent. Tant
 * que 0185 n'est pas posée, aucun client n'en porte la marque : il ne lit rien et n'invente rien. Une lecture en erreur devra LEVER.
 */
export const exclusionsRelanceParDefaut = async (_artisanId: string, _devisIds: readonly string[]): Promise<ReadonlyMap<string, string>> => new Map<string, string>()
/**
 * `horsAuto` (02/11, audit 032-001 D1) : la préparation refuse le mode « fait tout seul » pour SON objet et dit pourquoi (un devis
 * dont un prix n'est pas sourcé) ; l'action reste alors une carte, comme un geste de OUTILS_JAMAIS_AUTO.
 */
/** `cible` : la pièce d'une relance SEULE (numéro, client) — la preuve « un seul objet désigné » du « fait tout seul » (audit 032-028, D1). */
type Preparation = { ok: true; entrees: Obj; apercu: Apercu; objet?: { type: TypeObjet; id: string } | null; horsAuto?: string; horsPilote?: string; cible?: { numero: string; client: string | null; email?: string | null } } | { ok: false; erreur: string }

const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const txt = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const ko = (erreur: string): { ok: false; erreur: string } => ({ ok: false, erreur })
const sansAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

function apercu(titre: string, p: Partial<Apercu> = {}): Apercu {
  return { titre, lignes: [], avant_apres: [], message: null, alertes: [], irreversible: false, lien: null, ...p }
}

export function versCarte(f: FicheAction): CarteAction {
  return {
    ...f.apercu, id: f.id, outil: f.outil as NomAction, mode: f.mode, statut: f.statut,
    annulable: f.statut === 'executee' && !!f.annulation, annulation_libelle: f.statut === 'executee' ? f.annulation?.libelle ?? null : null,
    resultat: f.resultat_resume, cree_le: f.cree_le, expire_le: f.expire_le,
  }
}

export type ActionsServeur = {
  /** Les outils vus par le modèle : directes (exécutent) et à confirmer (proposent). */
  executeurs: Record<NomAction, (entree: EntreeAction) => Promise<ResultatExecution>>
  /** La réalisation réelle de chaque action (atteinte par confirmerAction pour les cartes, et par les directes). */
  realisateurs: Record<string, Realisateur>
  /** De quoi défaire une action directe. */
  inverses: Record<string, Realisateur>
}

export function actionsDeSession(ctx: ContexteActions): ActionsServeur {
  const session = clientDeSession(ctx.jeton)
  const dep = ctx.dependances ?? {}
  const maintenant = () => (dep.maintenant ? dep.maintenant() : new Date())
  const aujourdhui = () => jourParis(maintenant())
  const route = (g: Gestionnaire, chemin: string, o: { methode?: string; corps?: unknown; params?: Record<string, string> } = {}) => (dep.appeler ? dep.appeler(g, chemin, o) : appelerAvec(ctx, g, chemin, o))
  const sansCrm = ko('Le CRM n’est pas ouvert sur ce compte.')
  // 02/11 (D1 bis, puis troisième audit A3) : les PRIX que l'artisan a écrits lui-même (un nombre marqué « € », « HT », « le m² »…), seuls à
  // pouvoir faire un « prix donné par l'artisan » sur une ligne, ou un prix de sa bibliothèque de tarifs.
  // 02/11 (cinquième audit 032-007, « TTC ») : un prix marqué TTC n'entre que par sa forme HT AU TAUX de la pièce (lignes sans tarif d'un
  // devis : 10 %). Un HT qui n'en serait la forme qu'à un autre taux est refusé par la question du taux, jamais deviné.
  const nombresArtisan = prixEcrits(ctx.textesArtisan ?? [])
  const tauxDe = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 10)
  const prixDeLArtisan = (v: unknown, tva: number): boolean => { const n = Number(v); return Number.isFinite(n) && n > 0 && prixEcrits(ctx.textesArtisan ?? [], tva).has(Math.round(n * 100)) }
  const prixNonDonne = (v: unknown, tva: number) => {
    const autres = tauxTtcPossibles(ctx.textesArtisan ?? [], num(v), tva)
    if (autres.length) return ko(`Prix TTC donné : quel taux de TVA ? L'artisan a écrit un prix TTC ; ${fmtEuros(num(v))} HT n'en est la forme hors taxes qu'à ${autres.map((t) => `${fmtNombre(t)} %`).join(' ou ')}, pas à ${fmtNombre(tva)} %. Rien n'a été enregistré : demande-lui le taux de TVA (ou son prix HT), puis recalcule le HT.`)
    return ko(`Le prix ${fmtEuros(num(v))} HT ne vient pas de ce que l'artisan t'a écrit (une donnée lue, un autre devis ou ta propre réponse n'en sont pas la source) : rien n'a été enregistré. Demande-lui son prix, en chiffres avec « € » ou « HT ».`)
  }
  // 02/11 (S4) : avant toute relance (proposée ou envoyée), le registre commun des quatre chemins (assistant et pilote, CRM, impayés,
  // conversation) : déjà relancé depuis moins de RELANCE_DELAI_JOURS jours, ou registre illisible = rien ne part. Rend la phrase du refus.
  async function registre(objet: ObjetRelance): Promise<string | null> {
    const v = relanceRecente(await (dep.historiqueRelances ?? historiqueRelances)(ctx.uid, objet), maintenant())
    return v.refus ? phraseRefus(v, (iso) => { const t = new Date(iso); return Number.isFinite(t.getTime()) ? fmtDate(jourParis(t)) : 'récemment' }) : null
  }

  // ── Lectures sous la session (RLS) ───────────────────────────────────────────────────────────────
  type DevisRow = { id: string; numero: string | null; statut: string | null; objet: string | null; client_nom: string | null; client_email: string | null; client_adresse: string | null; total_ht: number | string | null; total_tva: number | string | null; total_ttc: number | string | null; remise_pct: number | string | null; acompte_pct: number | string | null; validite_jours: number | null; conditions: string | null; notes: string | null; lead_id: string | null; envoye_le: string | null }
  const COL_DEVIS = 'id, numero, statut, objet, client_nom, client_email, client_adresse, total_ht, total_tva, total_ttc, remise_pct, acompte_pct, validite_jours, conditions, notes, lead_id, envoye_le'
  async function devisDe(numero: string): Promise<DevisRow | null> {
    const { data, error } = await session.from('devis').select(COL_DEVIS).eq('artisan_id', ctx.uid).eq('numero', numero).maybeSingle()
    if (error) throw new Error('devis illisible')
    return (data as unknown as DevisRow | null) ?? null
  }
  async function devisParId(id: string): Promise<DevisRow | null> {
    const { data, error } = await session.from('devis').select(COL_DEVIS).eq('artisan_id', ctx.uid).eq('id', id).maybeSingle()
    if (error) throw new Error('devis illisible')
    return (data as unknown as DevisRow | null) ?? null
  }
  // `lot` (0176, devis par lots) : lu par `*` pour qu'une modification par l'assistant ne retire pas les lignes de leur lot ; absent
  // tant que la migration n'est pas appliquée, et alors rien ne change.
  type LigneRow = { designation: string; quantite: number | string; unite: string | null; prix_unitaire_ht: number | string; tva_taux: number | string; source_prix?: string | null; lot?: string | null }
  async function lignesDe(devisId: string): Promise<LigneRow[]> {
    const { data, error } = await session.from('devis_lignes').select('*').eq('devis_id', devisId).order('ordre')
    if (error) throw new Error('lignes illisibles')
    return (data ?? []) as unknown as LigneRow[]
  }
  const corpsDevis = (d: DevisRow, lignes: readonly LigneRow[], sur: Obj = {}): Obj => ({
    objet: d.objet, validite_jours: d.validite_jours ?? 90, remise_pct: num(d.remise_pct), acompte_pct: num(d.acompte_pct), conditions: d.conditions, notes: d.notes,
    client_nom: d.client_nom, client_email: d.client_email, client_adresse: d.client_adresse,
    lignes: lignes.map((l) => ({ designation: l.designation, quantite: num(l.quantite), unite: l.unite ?? 'u', prix_unitaire_ht: num(l.prix_unitaire_ht), tva_taux: num(l.tva_taux), ...(l.source_prix ? { source_prix: l.source_prix } : {}), ...(l.lot ? { lot: l.lot } : {}) })),
    ...sur,
  })
  async function tarifsParIds(ids: readonly string[]): Promise<Map<string, TarifLu>> {
    const out = new Map<string, TarifLu>()
    if (!ids.length) return out
    const { data, error } = await session.from('prix_artisan').select('id, designation, unite, prix_ht, tva_taux').eq('artisan_id', ctx.uid).eq('actif', true).in('id', [...new Set(ids)])
    if (error) throw new Error('tarifs illisibles')
    for (const t of (data ?? []) as unknown as TarifLu[]) out.set(t.id, t)
    return out
  }
  async function profil(): Promise<{ nom: string; email: string | null; legal: Record<string, unknown> | null }> {
    const { data, error } = await session.from('artisans').select(`email, ${COLONNES_LEGALES}`).eq('id', ctx.uid).maybeSingle()
    if (error) throw new Error('profil illisible')
    const a = (data ?? null) as Record<string, unknown> | null
    return { nom: txt(a?.nom) ?? 'Votre artisan', email: txt(a?.email), legal: a }
  }
  const mentionsDe = (a: Record<string, unknown> | null) => mentionsManquantesEmission(versArtisanLegal(a))

  type Chantier = { id: string; titre: string; client_nom: string | null; statut: string; devis_id: string | null; date_debut: string | null; date_fin_prevue: string | null; adresse: string | null; notes: string | null }
  async function chantierDe(nom: string) {
    const { data, error } = await session.from('chantiers').select('id, titre, client_nom, statut, devis_id, date_debut, date_fin_prevue, adresse, notes').eq('artisan_id', ctx.uid).limit(500)
    if (error) throw new Error('chantiers illisibles')
    return trouverUnique((data ?? []) as unknown as Chantier[], nom, (c) => [c.titre, c.client_nom ?? ''].filter(Boolean), 'Chantier')
  }
  type Article = { id: string; nom: string; unite: string | null; seuil_alerte: number | string | null; stock: { lieu: string; quantite: number | string }[] | null }
  async function articleDe(nom: string) {
    const { data, error } = await session.from('materiaux').select('id, nom, unite, seuil_alerte, stock(lieu, quantite)').eq('artisan_id', ctx.uid).limit(500)
    if (error) throw new Error('inventaire illisible')
    return trouverUnique((data ?? []) as unknown as Article[], nom, (a) => [a.nom], 'Article')
  }
  type Lead = { id: string; nom_prospect: string | null; contact: string | null; statut: string | null }
  async function leadDe(id: string): Promise<Lead | null> {
    const { data, error } = await session.from('leads').select('id, nom_prospect, contact, statut').eq('id', id).eq('artisan_id', ctx.uid).maybeSingle()
    if (error) throw new Error('conversation illisible')
    return (data as unknown as Lead | null) ?? null
  }
  async function peutEnvoyer(): Promise<boolean> {
    return consommerLimite(`assistant-envois:${ctx.uid}`, ENVOIS_JOUR_MAX, 24 * 3600)
  }
  const objetErreur = (r: { status: number; json: Obj | null }, defaut: string) => erreurDe(r.json, defaut)

  // ═══════════════════════════ LES RÉALISATIONS (exécution réelle) ═══════════════════════════
  const R: Record<string, Realisateur> = {}
  const INV: Record<string, Realisateur> = {}

  R.creer_devis = async (e) => {
    let client = txt(e.client_nom)
    let email = txt(e.client_email)
    let leadId: string | null = null
    if (txt(e.conversation_id)) {
      const lead = await leadDe(e.conversation_id as string)
      if (!lead) return ko('Conversation introuvable.')
      leadId = lead.id
      client = client ?? txt(lead.nom_prospect)
      // L'e-mail du dossier est repris ici, côté serveur : le modèle ne le voit jamais.
      if (!email && lead.contact && EMAIL.test(lead.contact.trim())) email = lead.contact.trim().toLowerCase()
    }
    const lignes = (e.lignes as LigneEntree[]) ?? []
    const tarifs = await tarifsParIds(lignes.map((l) => l.tarif_id).filter((x): x is string => !!x))
    const r = resoudreLignes(lignes, tarifs, nombresArtisan)
    if (r.introuvables.length) return ko(`Tarif introuvable dans la bibliothèque de l'artisan : ${r.introuvables.slice(0, 3).join(' ; ')}. Relis-les avec lire_tarifs.`)
    const rep = await route(devisCreer, '/api/devis', {
      corps: { objet: e.objet, client_nom: client, client_email: email, remise_pct: e.remise_pct ?? 0, acompte_pct: e.acompte_pct ?? 0, validite_jours: e.validite_jours ?? undefined, conditions: e.conditions, lignes: r.lignes },
    })
    if (rep.status !== 200 || typeof rep.json?.id !== 'string') return ko(objetErreur(rep, 'Le devis n’a pas pu être créé.'))
    const id = rep.json.id as string
    const d = await devisParId(id)
    const numero = d?.numero ?? (typeof rep.json.numero === 'string' ? rep.json.numero : '')
    return {
      ok: true, resume: `devis brouillon ${numero} créé`, objet: { type: 'devis', id },
      annulation: { outil: 'supprimer_devis', entrees: { devis_id: id }, libelle: `Supprimer le brouillon ${numero}` },
      donnees: {
        numero, statut: 'brouillon', client_renseigne: !!client, nb_lignes: r.lignes.length,
        total_ht: num(d?.total_ht), total_tva: num(d?.total_tva), total_ttc: num(d?.total_ttc),
        lignes_a_chiffrer: r.aChiffrer, lignes_prix_a_verifier: r.aVerifier, lignes_au_tarif_de_l_artisan: lignes.filter((l) => l.tarif_id).length,
        e_mail_client_present: !!email,
        a_savoir: "Devis BROUILLON créé : rien n'est envoyé. Les totaux sont ceux calculés par Presti (cite-les tels quels)." + (r.aChiffrer.length ? ` Des lignes n'ont AUCUN prix (à chiffrer) : dis-le et demande-le à l'artisan.` : '')
          + (r.aVerifier.length ? " Des prix viennent d'une donnée lue ou de ta propre réponse, pas de l'artisan : dis-lui de les vérifier. Le devis ne partira pas sans qu'il les confirme." : '') + (email ? '' : " Le client n'a pas d'e-mail : il faudra le renseigner avant l'envoi."),
      },
      apercu: {
        lignes: [{ label: 'Client', valeur: client ?? '—' }, { label: 'Objet', valeur: String(e.objet ?? '') }, { label: 'Lignes', valeur: String(r.lignes.length) }, { label: 'Total TTC', valeur: fmtEuros(d?.total_ttc) }, ...(r.aChiffrer.length ? [{ label: 'À chiffrer', valeur: r.aChiffrer.join(' ; ') }] : []), ...(r.aVerifier.length ? [{ label: 'Prix à vérifier', valeur: r.aVerifier.join(' ; ') }] : [])],
        alertes: [...(r.aChiffrer.length ? [`${r.aChiffrer.length} ligne(s) sans prix : à chiffrer avant l’envoi.`] : []), ...(r.aVerifier.length ? [`${r.aVerifier.length} prix repris d’une donnée : à vérifier avant l’envoi.`] : [])],
        lien: lienDe('devis', id),
      },
    }
  }
  INV.supprimer_devis = async (e) => {
    const rep = await route(devisSupprimer, `/api/devis/${e.devis_id}`, { methode: 'DELETE', params: { id: String(e.devis_id) } })
    return rep.status === 200 ? { ok: true, resume: 'brouillon de devis supprimé' } : ko(objetErreur(rep, 'Suppression impossible.'))
  }

  R.modifier_devis = async (e) => {
    const d = await devisDe(String(e.numero))
    if (!d) return ko(`Devis ${e.numero} introuvable.`)
    if ((d.statut ?? 'brouillon') !== 'brouillon') return ko(`Le devis ${d.numero} est ${d.statut === 'envoye' ? 'déjà parti chez le client' : 'au statut ' + d.statut} : il ne se modifie plus (créez-en un nouveau).`)
    const avant = await lignesDe(d.id)
    const ret = indicesARetirer(avant.map((l) => l.designation), (e.retirer_lignes as string[]) ?? [])
    if (ret.introuvables.length) return ko(`Ligne(s) à retirer introuvable(s) : ${ret.introuvables.join(' ; ')}. Positions : 1 à ${avant.length}.`)
    const ajout = (e.ajouter_lignes as LigneEntree[]) ?? []
    const tarifs = await tarifsParIds(ajout.map((l) => l.tarif_id).filter((x): x is string => !!x))
    const r = resoudreLignes(ajout, tarifs, nombresArtisan)
    if (r.introuvables.length) return ko(`Tarif introuvable dans la bibliothèque de l'artisan : ${r.introuvables.slice(0, 3).join(' ; ')}.`)
    const gardees = avant.filter((_, i) => !ret.indices.includes(i))
    const sur: Obj = {}
    if (txt(e.objet)) sur.objet = e.objet
    if (typeof e.remise_pct === 'number') sur.remise_pct = e.remise_pct
    if (typeof e.acompte_pct === 'number') sur.acompte_pct = e.acompte_pct
    if (txt(e.client_nom)) sur.client_nom = e.client_nom
    if (txt(e.client_email)) sur.client_email = e.client_email
    const corps = corpsDevis(d, gardees, sur)
    ;(corps.lignes as Obj[]).push(...r.lignes)
    const rep = await route(devisMaj, `/api/devis/${d.id}`, { corps, params: { id: d.id } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'Le devis n’a pas pu être modifié.'))
    const apres = await devisParId(d.id)
    return {
      ok: true, resume: `devis ${d.numero} modifié`, objet: { type: 'devis', id: d.id },
      annulation: { outil: 'restaurer_devis', entrees: { devis_id: d.id, corps: corpsDevis(d, avant) }, libelle: `Remettre le devis ${d.numero} comme avant` },
      donnees: { numero: d.numero, lignes_ajoutees: r.lignes.length, lignes_retirees: ret.indices.length, total_ht: num(apres?.total_ht), total_ttc: num(apres?.total_ttc), lignes_a_chiffrer: r.aChiffrer, lignes_prix_a_verifier: r.aVerifier,
        a_savoir: 'Totaux recalculés par Presti : cite-les tels quels.' + (r.aVerifier.length ? " Des prix ajoutés viennent d'une donnée lue ou de ta propre réponse, pas de l'artisan : dis-lui de les vérifier ; le devis ne partira pas sans qu'il les confirme." : '') },
      apercu: {
        lignes: [{ label: 'Devis', valeur: String(d.numero) }, { label: 'Lignes ajoutées', valeur: String(r.lignes.length) }, { label: 'Lignes retirées', valeur: String(ret.indices.length) }],
        avant_apres: [{ libelle: 'Total TTC', avant: fmtEuros(d.total_ttc), apres: fmtEuros(apres?.total_ttc) }],
        alertes: r.aChiffrer.length ? [`${r.aChiffrer.length} ligne(s) sans prix : à chiffrer.`] : [], lien: lienDe('devis', d.id),
      },
    }
  }
  INV.restaurer_devis = async (e) => {
    const rep = await route(devisMaj, `/api/devis/${e.devis_id}`, { corps: e.corps, params: { id: String(e.devis_id) } })
    return rep.status === 200 ? { ok: true, resume: 'devis remis comme avant' } : ko(objetErreur(rep, 'Restauration impossible.'))
  }

  R.changer_statut_devis = async (e) => {
    const d = await devisDe(String(e.numero))
    if (!d) return ko(`Devis ${e.numero} introuvable.`)
    const cible = String(e.statut)
    if (d.statut === cible) return ko(`Le devis ${d.numero} est déjà « ${cible} ».`)
    const lignes = await lignesDe(d.id)
    const rep = await route(devisMaj, `/api/devis/${d.id}`, { corps: corpsDevis(d, lignes, { statut: cible }), params: { id: d.id } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'Le statut n’a pas pu être changé.'))
    return {
      ok: true, resume: `devis ${d.numero} : ${d.statut} → ${cible}`, objet: { type: 'devis', id: d.id },
      annulation: { outil: 'restaurer_devis', entrees: { devis_id: d.id, corps: corpsDevis(d, lignes, { statut: d.statut ?? 'brouillon' }) }, libelle: `Remettre le devis ${d.numero} à « ${d.statut} »` },
      donnees: { numero: d.numero, ancien_statut: d.statut, statut: cible, a_savoir: cible === 'accepte' ? 'Le devis est signé : il peut être facturé (creer_facture) et devenir un chantier (creer_chantier).' : undefined },
      apercu: { lignes: [{ label: 'Devis', valeur: String(d.numero) }], avant_apres: [{ libelle: 'Statut', avant: String(d.statut), apres: cible }], lien: lienDe('devis', d.id) },
    }
  }

  R.supprimer_devis_brouillon = async (e) => {
    const d = await devisDe(String(e.numero))
    if (!d) return ko(`Devis ${e.numero} introuvable (déjà supprimé ?).`)
    if ((d.statut ?? 'brouillon') !== 'brouillon') return ko(`Le devis ${d.numero} n'est plus un brouillon : il se conserve.`)
    const rep = await route(devisSupprimer, `/api/devis/${d.id}`, { methode: 'DELETE', params: { id: d.id } })
    return rep.status === 200 ? { ok: true, resume: `devis brouillon ${d.numero} supprimé` } : ko(objetErreur(rep, 'Suppression impossible.'))
  }

  R.envoyer_devis = async (e) => {
    const d = await devisDe(String(e.numero))
    if (!d) return ko(`Devis ${e.numero} introuvable.`)
    if (d.statut === 'accepte') return ko(`Le devis ${d.numero} est déjà accepté : il ne se renvoie pas.`)
    if (!(await peutEnvoyer())) return ko(`Limite d'envois du jour atteinte (${ENVOIS_JOUR_MAX}) : réessayez demain.`)
    const gestionnaire = dep.envoyerDevis ?? (await import('@/app/api/devis/[id]/envoyer/route')).POST
    const rep = await route(gestionnaire, `/api/devis/${d.id}/envoyer`, { corps: {}, params: { id: d.id } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'Le devis n’a pas pu être envoyé.'))
    return { ok: true, resume: `devis ${d.numero} envoyé au client`, objet: { type: 'devis', id: d.id } }
  }

  async function envoyerRelance(to: string, objet: string, texte: string): Promise<Realisation | null> {
    if (!(await peutEnvoyer())) return ko(`Limite d'envois du jour atteinte (${ENVOIS_JOUR_MAX}) : réessayez demain.`)
    const p = await profil()
    const r = await (dep.envoyerMail ?? sendEmail)({ to, subject: objet, text: texte, fromName: p.nom, replyTo: p.email ?? undefined, transactionnel: true })
    return r.ok ? null : ko('L’e-mail n’a pas pu partir pour le moment. Rien n’a été envoyé : réessayez dans un instant.')
  }
  // ── 02/11 (L16, chantier 4) — les relances GROUPÉES : une seule carte de lot, jamais d'office ─────────────────────────────────
  // « Relance les devis envoyés il y a plus de 5 jours » (P3:160) vise plusieurs clients : une carte qui nomme les retenus (avec le texte
  // exact de chaque relance) et les exclus avec leur motif ; rien ne part avant le clic (§0 bis, rang 4, question 1). Une relance écartée
  // par l'artisan depuis moins de REFUS_RETENUS_JOURS jours n'est pas reproposée d'elle-même (rang 8) : l'outil le dit au modèle, au tour.
  /** Le message de CE tour (lib/assistant : la route met le message de l'artisan en tête de textesArtisan). Absent : vide. */
  const messageArtisan = ctx.textesArtisan?.[0] ?? ''
  const MOTIF_PAUSE = 'compte en pause (demandes en pause, Ma plateforme) : rien ne part tant qu’elle dure'
  const exclusionsRelance = dep.exclusionsRelance ?? exclusionsRelanceParDefaut
  const estLot = (e: Obj): boolean => Array.isArray(e.lot) || (Array.isArray(e.numeros) && e.numeros.length > 0) || (typeof e.envoye_depuis_jours === 'number')
  /** Les devis dont une carte de relance (seule ou de lot) a été écartée depuis REFUS_RETENUS_JOURS jours : id → date. Une erreur lève. */
  async function devisEcartes(): Promise<Map<string, string>> {
    const depuis = new Date(maintenant().getTime() - REFUS_RETENUS_JOURS * 86_400_000)
    const { data, error } = await session.from('assistant_actions').select('outil, statut, objet_id, entrees, maj_le').eq('artisan_id', ctx.uid).eq('outil', 'relancer_devis').eq('statut', 'refusee').gte('maj_le', depuis.toISOString()).order('maj_le', { ascending: false }).limit(200)
    if (error) throw new Error('cartes écartées illisibles')
    return refusRecents((data ?? []) as unknown as Parameters<typeof refusRecents>[0], 'relancer_devis', depuis)
  }
  /** La pause de l'artisan (artisans.leads_pause, 0031), comme le pilote (lib/pilote/file.ts) : rien ne part tant qu'elle dure. Une erreur lève. */
  async function compteEnPause(): Promise<boolean> {
    const { data, error } = await session.from('artisans').select('leads_pause').eq('id', ctx.uid).maybeSingle()
    if (error) throw new Error('réglages du compte illisibles')
    return (data as { leads_pause?: unknown } | null)?.leads_pause === true
  }
  // ── 02/11 (audit 032-028, D2) — deux cartes sur les mêmes devis ne relancent jamais deux fois ──────────────────────────────────────
  /** Une carte relancer_devis ouverte qui retient un devis : en attente du clic, ou en cours d'exécution (une réservation de lot comprise). */
  type CarteOuverte = { statut: 'en_attente' | 'en_cours'; lot: boolean }
  /**
   * Les devis déjà retenus par une carte relancer_devis OUVERTE de ce compte : une carte seule (objet_id), une carte de lot (entrees.lot[].id),
   * une relance de lot en train de partir (réservation, mode direct). Une carte en attente déjà expirée ne compte plus. Une erreur lève.
   */
  async function cartesRelanceOuvertes(): Promise<Map<string, CarteOuverte>> {
    const { data, error } = await session.from('assistant_actions').select('id, mode, statut, objet_id, entrees, expire_le, maj_le').eq('artisan_id', ctx.uid).eq('outil', 'relancer_devis').in('statut', ['en_attente', 'en_cours']).limit(200)
    if (error) throw new Error('cartes ouvertes illisibles')
    const out = new Map<string, CarteOuverte>()
    const garder = (idDevis: unknown, c: CarteOuverte) => { if (typeof idDevis !== 'string' || !idDevis) return; const avant = out.get(idDevis); if (!avant || (avant.statut === 'en_attente' && c.statut === 'en_cours') || (avant.lot && !c.lot && avant.statut === c.statut)) out.set(idDevis, c) }
    const borne = maintenant().getTime() - RELANCE_DELAI_JOURS * 86_400_000
    for (const f of (data ?? []) as { mode?: string; statut?: string; objet_id?: string | null; entrees?: unknown; expire_le?: string | null; maj_le?: string | null }[]) {
      const statut = f.statut === 'en_cours' ? 'en_cours' : 'en_attente'
      if (statut === 'en_attente' && f.expire_le && Date.parse(f.expire_le) <= maintenant().getTime()) continue
      // Une réservation restée en_cours (envoi interrompu) bloque RELANCE_DELAI_JOURS jours, comme une relance partie — pas à vie.
      if (statut === 'en_cours' && f.mode === 'direct' && f.maj_le && Date.parse(f.maj_le) < borne) continue
      // 02/11 (contre-audit 032-035, E3) : une carte RÉCLAMÉE (en_cours) puis coupée (fonction tuée, déploiement) ne bloque plus à vie.
      //  • Une carte SEULE a pu partir sans que sa fin soit écrite : elle compte comme partie RELANCE_DELAI_JOURS jours, comme une réservation.
      //  • Une carte de LOT ne réserve rien elle-même : chaque devis tenté a sa réservation (mode direct, ci-dessus). Passé CARTE_COUPEE_MS
      //    (bien au-delà de maxDuration), elle ne bloque plus ; ses devis jamais tentés redeviennent libres, ceux tentés restent tenus.
      const lotF = Array.isArray((f.entrees as { lot?: unknown } | null)?.lot)
      if (statut === 'en_cours' && f.mode !== 'direct' && f.maj_le && Date.parse(f.maj_le) < (lotF ? maintenant().getTime() - CARTE_COUPEE_MS : borne)) continue
      const lot = (f.entrees as { lot?: unknown } | null)?.lot
      if (Array.isArray(lot)) { for (const m of lot) garder((m as { id?: unknown } | null)?.id, { statut, lot: true }) }
      else garder(f.objet_id, { statut, lot: f.mode === 'direct' })
    }
    return out
  }
  /**
   * Au clic, APRÈS avoir posé sa propre réservation (la trace `en_cours` du devis, `monId`) et AVANT l'envoi : une autre relance de ce devis
   * est-elle en cours (réservation d'un autre lot, carte seule en train d'être exécutée) ou partie depuis moins de RELANCE_DELAI_JOURS jours ?
   * Écrire puis relire : de deux clics simultanés, au moins un voit l'autre et s'abstient — s'ils se voient tous deux, aucun n'envoie (côté
   * sûr : rien en double, la carte dit « non relancé »). Une réservation restée `en_cours` (envoi interrompu) compte comme partie. Erreur : lève.
   */
  async function relanceConcurrente(devisId: string, monId: string): Promise<string | null> {
    const depuis = new Date(maintenant().getTime() - RELANCE_DELAI_JOURS * 86_400_000).toISOString()
    const { data, error } = await session.from('assistant_actions').select('id, statut, maj_le').eq('artisan_id', ctx.uid).eq('outil', 'relancer_devis').eq('objet_id', devisId).in('statut', ['en_cours', 'executee']).gte('maj_le', depuis).limit(20)
    if (error) throw new Error('journal des relances illisible')
    const autres = ((data ?? []) as { id?: string; statut?: string; maj_le?: string }[]).filter((f) => f.id !== monId)
    const partie = autres.find((f) => f.statut === 'executee')
    if (partie) return `déjà relancé le ${fmtDate(jourParis(new Date(String(partie.maj_le))))} : pas avant ${RELANCE_DELAI_JOURS} jours`
    return autres.length ? 'une autre relance de ce devis part au même moment (une autre carte) : pas de doublon' : null
  }
  /** Une relance de LOT de ce devis est-elle en train de partir (réservation `en_cours`, mode direct) ? Pour la relance seule. Erreur : lève. */
  async function lotEnCoursSur(devisId: string): Promise<boolean> {
    const depuis = new Date(maintenant().getTime() - RELANCE_DELAI_JOURS * 86_400_000).toISOString()
    const { data, error } = await session.from('assistant_actions').select('id').eq('artisan_id', ctx.uid).eq('outil', 'relancer_devis').eq('objet_id', devisId).eq('statut', 'en_cours').eq('mode', 'direct').gte('maj_le', depuis).limit(20)
    if (error) throw new Error('journal des relances illisible')
    // 02/11 (contre-audit 032-035, E8) : la réservation que CE tour vient de poser pour sa propre relance d'office ne compte pas contre elle.
    return ((data ?? []) as { id?: string }[]).some((f) => !reservationsDuTour.has(String(f.id)))
  }
  /** 02/11 (contre-audit 032-035, E8) — les réservations posées par ce tour pour ses relances d'office (actionsDeSession vit un tour). */
  const reservationsDuTour = new Set<string>()
  /** Les noms des clients du compte (devis et factures) : la preuve « un seul client » (cartes.ts motifPasUnSeul) les compare. Erreur : lève. */
  async function clientsDuCompte(): Promise<string[]> {
    // 02/11 (contre-audit 032-035, E6) : TOUS les clients, page par page dans un ordre fixe (l'ancien .limit(500) sans ordre pouvait
    // laisser de côté l'autre client nommé). Au-delà de PAGES_CLIENTS_MAX pages : lève — la preuve n'est pas faite, la relance est une carte.
    const noms = new Set<string>()
    for (const table of ['devis', 'factures'] as const) {
      for (let page = 0; ; page++) {
        if (page >= PAGES_CLIENTS_MAX) throw new Error('trop de pièces pour relire tous les clients')
        const { data, error } = await session.from(table).select('id, client_nom').eq('artisan_id', ctx.uid).order('id', { ascending: true }).range(page * PAGE_CLIENTS, (page + 1) * PAGE_CLIENTS - 1)
        if (error) throw new Error('clients du compte illisibles')
        for (const x of data ?? []) { const n = txt((x as { client_nom?: unknown }).client_nom); if (n) noms.add(n) }
        if ((data ?? []).length < PAGE_CLIENTS) break
      }
    }
    return [...noms]
  }
  /**
   * 02/11 (contre-audit 032-035, E7) — combien de devis ce client a EN ATTENTE (statut envoyé), par son e-mail ou par son nom : un nom
   * désigne un client, pas un objet ; s'il en a plusieurs, le message ne dit pas lequel relancer. Erreur : lève (carte).
   */
  async function devisEnAttenteDuClient(cible: { client: string | null; email?: string | null }): Promise<number> {
    const ids = new Set<string>()
    const ajouter = (data: unknown[] | null) => { for (const x of data ?? []) { const i = txt((x as { id?: unknown }).id); if (i) ids.add(i) } }
    const email = txt(cible.email)
    if (email) {
      const { data, error } = await session.from('devis').select('id').eq('artisan_id', ctx.uid).eq('statut', 'envoye').in('client_email', [...new Set([email, email.toLowerCase()])]).limit(LOT_RELANCES_MAX + 1)
      if (error) throw new Error('devis du client illisibles')
      ajouter(data)
    }
    const nom = txt(cible.client)
    if (nom) {
      const { data, error } = await session.from('devis').select('id').eq('artisan_id', ctx.uid).eq('statut', 'envoye').eq('client_nom', nom).limit(LOT_RELANCES_MAX + 1)
      if (error) throw new Error('devis du client illisibles')
      ajouter(data)
    }
    return ids.size
  }
  const MOTIF_DESIGNATION_ILLISIBLE = 'Les clients du compte n’ont pas pu être relus : la relance attend le clic de l’artisan.'
  const MOTIF_JOURNAL_ILLISIBLE = 'journal des relances illisible : exclu (rien ne part sans savoir s’il a déjà été relancé)'
  const STATUT_LOT: Record<string, string> = { brouillon: 'brouillon', accepte: 'signé', refuse: 'refusé', expire: 'expiré' }
  /**
   * Pourquoi CE devis ne part pas dans un lot (ou null) : les contrôles d'une relance seule (statut, e-mail, journal des actions, registre
   * commun des quatre chemins), plus « ne plus relancer », la relance écartée récemment (sauf devis nommé par l'artisan dans CE message) et
   * le sujet d'escalade du fil, relu comme le pilote au départ — une lecture en erreur exclut (côté sûr). À la réalisation, `ecartes` est vide :
   * le clic de l'artisan sur la carte du lot vaut sa demande.
   */
  async function motifExclusion(d: DevisRow, x: { ecartes: ReadonlyMap<string, string>; neplus: ReadonlyMap<string, string>; ouvertes?: ReadonlyMap<string, CarteOuverte> }): Promise<string | null> {
    if (d.statut !== 'envoye') return `pas en attente de réponse (statut : ${STATUT_LOT[String(d.statut)] ?? d.statut})`
    const to = txt(d.client_email)
    if (!to || !EMAIL.test(to)) return 'pas d’e-mail client'
    const neplus = x.neplus.get(d.id)
    if (neplus) return neplus
    const ecartee = x.ecartes.get(d.id)
    if (ecartee && !nommeDans(messageArtisan, String(d.numero))) return phraseEcartee(ecartee)
    // 02/11 (audit 032-028, D2) : à la préparation, un devis qu'une autre carte est en train de relancer n'entre pas dans ce lot. Un devis
    // qu'une autre carte (seule ou de lot) ATTEND de relancer reste retenu, avec une alerte sur la carte : l'artisan peut vouloir ce lot-ci
    // (essai A7k du banc 032-028), et la réservation au clic (realiserLotDevis, relanceConcurrente) ne le relance qu'une fois.
    if (x.ouvertes?.get(d.id)?.statut === 'en_cours') return 'une relance de ce devis est en train de partir (une autre carte)'
    // 02/11 (audit 032-028, D8) : un journal illisible n'est plus lu « jamais relancé » (côté ouvert) : le devis est exclu.
    const dernier = await ctx.magasin.dernierEnvoi(ctx.uid, 'relancer_devis', d.id).then((v) => v, () => MOTIF_JOURNAL_ILLISIBLE)
    if (dernier === MOTIF_JOURNAL_ILLISIBLE) return MOTIF_JOURNAL_ILLISIBLE
    if (dernier && maintenant().getTime() - Date.parse(dernier) < RELANCE_DELAI_JOURS * 86_400_000) return `déjà relancé le ${fmtDate(jourParis(new Date(dernier)))} : pas avant ${RELANCE_DELAI_JOURS} jours`
    const reg = await registre({ type: 'devis', id: d.id })
    if (reg) return reg
    return await escaladeDeLaCarte({ type: 'devis', id: d.id }, {}).then((m) => m, () => MOTIF_ESCALADE_ILLISIBLE)
  }
  const texteDuDevis = (d: DevisRow, artisan: string, ton: 'cordial' | 'ferme') => texteRelanceDevis({ client: d.client_nom, numero: String(d.numero), objet: d.objet, totalTtc: d.total_ttc === null ? null : num(d.total_ttc), envoyeLe: d.envoye_le, validiteJours: d.validite_jours, artisan, ton })
  /** La carte de lot : les devis visés (numéros donnés, ou envoyés depuis plus de N jours), triés en retenus et exclus. Jamais d'office. */
  async function preparerLotDevis(e: Obj): Promise<Preparation> {
    const ton = (e.ton as 'cordial' | 'ferme') ?? 'cordial'
    const numeros = Array.isArray(e.numeros) ? (e.numeros as string[]) : []
    const jours = typeof e.envoye_depuis_jours === 'number' ? e.envoye_depuis_jours : null
    const exclus: ExcluLot[] = []
    let candidats: DevisRow[] = []
    let enPlus = false
    if (numeros.length) {
      if (numeros.length > LOT_RELANCES_MAX) return ko(`Un lot nomme ${LOT_RELANCES_MAX} devis au plus.`)
      for (const n of numeros) { const d = await devisDe(n); if (d) candidats.push(d); else exclus.push({ numero: n, client: null, motif: 'introuvable sur ce compte' }) }
    } else if (jours !== null) {
      const seuil = new Date(maintenant().getTime() - jours * 86_400_000).toISOString()
      const { data, error } = await session.from('devis').select(COL_DEVIS).eq('artisan_id', ctx.uid).eq('statut', 'envoye').lt('envoye_le', seuil).order('envoye_le', { ascending: true }).limit(LOT_RELANCES_MAX + 1)
      if (error) throw new Error('devis illisibles')
      candidats = (data ?? []) as unknown as DevisRow[]
      enPlus = candidats.length > LOT_RELANCES_MAX
      candidats = candidats.slice(0, LOT_RELANCES_MAX)
    } else return ko('Un lot de relances : numeros ou envoye_depuis_jours.')
    const pause = await compteEnPause()
    const ecartes = await devisEcartes()
    const neplus = await exclusionsRelance(ctx.uid, candidats.map((d) => d.id))
    const ouvertes = await cartesRelanceOuvertes()
    const p = await profil()
    const retenus: (RetenuLot & { id: string })[] = []
    const aussiAilleurs: string[] = []
    for (const d of candidats) {
      const motif = pause ? MOTIF_PAUSE : await motifExclusion(d, { ecartes, neplus, ouvertes })
      if (motif) { exclus.push({ numero: String(d.numero), client: d.client_nom, motif }); continue }
      if (ouvertes.get(d.id)?.statut === 'en_attente') aussiAilleurs.push(String(d.numero))
      const t = texteDuDevis(d, p.nom, ton)
      retenus.push({ id: d.id, numero: String(d.numero), client: d.client_nom, montant_ttc: d.total_ttc === null ? null : num(d.total_ttc), envoye_le: d.envoye_le, message: { a: String(txt(d.client_email)), objet: t.objet, texte: t.texte } })
    }
    const critere = numeros.length ? `relancer ${numeros.join(', ')}` : `relancer les devis envoyés il y a plus de ${jours} jour${(jours ?? 0) > 1 ? 's' : ''}`
    if (!retenus.length) {
      return ko(`Aucun devis à relancer (${critere}) : ${exclus.length ? exclus.map((x) => `${x.numero}${x.client ? ` (${x.client})` : ''} — ${x.motif}`).join(' ; ') : 'aucun devis envoyé ne correspond'}. Rien n'a été préparé ni envoyé : dis-le à l'artisan, avec ces motifs.`)
    }
    const ap = apercuLotRelances({ lot: { retenus: retenus.map(({ id: _id, ...r }) => r), exclus }, ton, critere,
      alertes: [
        ...(enPlus ? [`D'autres devis correspondent au-delà des ${LOT_RELANCES_MAX} plus anciens : ils feront un second lot, une fois celui-ci traité.`] : []),
        ...(aussiAilleurs.length ? [`${aussiAilleurs.join(', ')} : aussi dans une autre carte de relance qui attend votre clic. Chaque client n’est relancé qu’une fois, au premier clic ; l’autre carte le dira.`] : []),
      ] })
    return {
      ok: true, objet: null, apercu: ap,
      entrees: { lot: retenus.map((r) => ({ id: r.id, numero: r.numero })), ton, conversation_origine: ctx.conversationId, ...(numeros.length ? { numeros } : { envoye_depuis_jours: jours }) },
      horsAuto: 'Un lot de relances (plusieurs devis, plusieurs clients) ne part jamais d’office : l’artisan relit les retenus et les exclus, puis valide d’un clic.',
    }
  }
  /**
   * La réalisation du lot, atteinte SEULEMENT par confirmerAction (le clic de l'artisan sur la carte) : chaque devis est relu et recontrôlé
   * juste avant son envoi (statut, e-mail, registre, escalade, « ne plus relancer », pause), puis sa relance part et s'inscrit, objet par
   * objet, au journal des actions — c'est là que le registre commun et l'anti-doublon la verront (lib/relancesRegistre.ts). Une inscription
   * impossible arrête le lot (aucune relance suivante ne part sans trace). La carte réclamée une seule fois (confirmation.ts) : pas de doublon.
   */
  async function realiserLotDevis(e: Obj): Promise<Realisation> {
    const lot = (Array.isArray(e.lot) ? e.lot : []).filter((m): m is { id: string; numero: string } => !!m && typeof (m as Obj).id === 'string' && typeof (m as Obj).numero === 'string')
    if (!lot.length || lot.length > LOT_RELANCES_MAX) return ko('Ce lot de relances est vide ou trop grand : rien n’est parti.')
    if (await compteEnPause()) return ko(`Aucune relance n’est partie : ${MOTIF_PAUSE}.`)
    const ton = e.ton === 'ferme' ? 'ferme' as const : 'cordial' as const
    const neplus = await exclusionsRelance(ctx.uid, lot.map((m) => m.id))
    const p = await profil()
    const conv = typeof e.conversation_origine === 'string' && UUID.test(e.conversation_origine) ? e.conversation_origine : ctx.conversationId
    const partis: string[] = [], nonPartis: string[] = []
    for (const [i, m] of lot.entries()) {
      const d = await devisDe(m.numero)
      if (!d || d.id !== m.id) { nonPartis.push(`${m.numero} : introuvable`); continue }
      const motif = await motifExclusion(d, { ecartes: new Map(), neplus })
      if (motif) { nonPartis.push(`${d.numero} : ${motif}`); continue }
      const t = texteDuDevis(d, p.nom, ton)
      // 02/11 (audit 032-028, D2) — la RÉSERVATION avant l'envoi : la trace du devis est posée `en_cours` (elle était écrite après), puis
      // relue avec les autres traces de ce devis. Deux cartes cliquées en même temps ne relancent donc jamais deux fois le même client.
      // Réservation impossible : le lot s'arrête (aucune relance ne part sans trace).
      const resa = await ctx.magasin.creer({
        artisan_id: ctx.uid, conversation_id: conv, tour: Math.max(1, ctx.tour()), outil: 'relancer_devis', mode: 'direct', statut: 'en_cours',
        titre: `Relance du devis ${d.numero} (lot)`.slice(0, 200), entrees: { numero: d.numero, ton, du_lot: true },
        apercu: apercu(`Relance du devis ${d.numero} (lot)`, { message: { a: String(txt(d.client_email)), objet: t.objet, texte: t.texte }, irreversible: true }),
        annulation: null, resultat_resume: null, objet_type: 'devis', objet_id: d.id, expire_le: null,
      }).then((f) => f, () => null)
      if (!resa) {
        const reste = lot.slice(i).map((x) => x.numero)
        nonPartis.push(`${reste.join(', ')} : non tentés — le journal des actions est indisponible (rien n’est parti sans trace)`)
        break
      }
      // 02/11 (contre-audit 032-035, E5) : la levée est réessayée une fois ; si elle échoue encore, la carte le DIT (journal à reprendre) au
      // lieu de le taire — la réservation restée en_cours tient le devis RELANCE_DELAI_JOURS jours, et la relance seule en fait une carte.
      const lever = async (pourquoi: string) => {
        const champs = { resultat_resume: `non envoyée : ${pourquoi}`.slice(0, 300) }
        const leve = await ctx.magasin.transiter(ctx.uid, resa.id, ['en_cours'], 'echec', champs).then((f) => !!f, () => false)
          || await ctx.magasin.transiter(ctx.uid, resa.id, ['en_cours'], 'echec', champs).then((f) => !!f, () => false)
        if (!leve) nonPartis.push(`${d.numero} : sa réservation n’a pas pu être levée (journal à reprendre) — il reste tenu ${RELANCE_DELAI_JOURS} jours, une relance seule en fera une carte`)
      }
      const concurrente = await relanceConcurrente(d.id, resa.id).then((m) => m, () => MOTIF_JOURNAL_ILLISIBLE)
      if (concurrente) { await lever(concurrente); nonPartis.push(`${d.numero} : ${concurrente}`); continue }
      const echec = await envoyerRelance(String(txt(d.client_email)), t.objet, t.texte)
      if (echec && !echec.ok) {
        await lever(echec.erreur)
        nonPartis.push(`${d.numero} : ${echec.erreur}`)
        if (/Limite d'envois/.test(echec.erreur)) { const reste = lot.slice(i + 1).map((x) => x.numero); if (reste.length) nonPartis.push(`${reste.join(', ')} : non tentés (limite d’envois du jour)`); break }
        continue
      }
      partis.push(String(d.numero))
      const inscrite = await ctx.magasin.transiter(ctx.uid, resa.id, ['en_cours'], 'executee', { resultat_resume: `relance du devis ${d.numero} envoyée au client (lot)` }).then((f) => !!f, () => false)
      if (!inscrite) {
        // La réservation reste `en_cours` : elle compte toujours comme partie (relanceConcurrente, lotEnCoursSur). Le lot s'arrête.
        const reste = lot.slice(i + 1).map((x) => x.numero)
        nonPartis.push(`${reste.length ? `${reste.join(', ')} : non tentés — ` : ''}la relance de ${d.numero} est partie mais n’a pas pu être inscrite au journal`)
        break
      }
    }
    if (!partis.length) return ko(`Aucune relance n’est partie : ${nonPartis.join(' ; ')}`.slice(0, 280))
    return {
      ok: true, objet: null, donnees: { relances_parties: partis, non_parties: nonPartis },
      resume: `${partis.length} relance${partis.length > 1 ? 's' : ''} de devis envoyée${partis.length > 1 ? 's' : ''} (${partis.join(', ')})${nonPartis.length ? ` ; non relancé : ${nonPartis.join(' ; ')}` : ''}`.slice(0, 300),
    }
  }

  R.relancer_devis = async (e) => {
    if (estLot(e)) return realiserLotDevis(e)
    const d = await devisDe(String(e.numero))
    if (!d) return ko(`Devis ${e.numero} introuvable.`)
    if (d.statut !== 'envoye') return ko(`Le devis ${d.numero} n'est pas « envoyé » (statut : ${d.statut}) : pas de relance.`)
    const to = txt(d.client_email)
    if (!to || !EMAIL.test(to)) return ko('Le devis n’a pas d’e-mail client.')
    const p = await profil()
    const t = texteRelanceDevis({ client: d.client_nom, numero: String(d.numero), objet: d.objet, totalTtc: d.total_ttc === null ? null : num(d.total_ttc), envoyeLe: d.envoye_le, validiteJours: d.validite_jours, artisan: p.nom, ton: (e.ton as 'cordial' | 'ferme') ?? 'cordial' })
    const reg = await registre({ type: 'devis', id: d.id })
    if (reg) return ko(reg)
    // 02/11 (audit 032-028, D3) : « ne plus relancer » vaut aussi pour la relance seule, au clic comme d'office. Lecture en erreur : refus.
    const neplus = await exclusionsRelance(ctx.uid, [d.id]).then((m) => m.get(d.id) ?? null, () => 'la liste « ne plus relancer » n’a pas pu être relue')
    if (neplus) return ko(`Pas de relance du devis ${d.numero} : ${neplus}.`)
    // 02/11 (audit 032-028, D2) : une relance de LOT de ce devis est en train de partir (sa réservation est posée) : pas de doublon.
    const lotEnCours = await lotEnCoursSur(d.id).then((v) => v, () => true)
    if (lotEnCours) return ko(`Pas de relance du devis ${d.numero} : une autre relance de ce devis part au même moment (ou le journal est illisible). Rien n’est parti.`)
    const echec = await envoyerRelance(to, t.objet, t.texte)
    return echec ?? { ok: true, resume: `relance du devis ${d.numero} envoyée au client`, objet: { type: 'devis', id: d.id } }
  }

  type FactureRow = { id: string; numero: string | null; statut: string | null; objet: string | null; client_nom: string | null; client_email: string | null; total_ttc: number | string | null; date_echeance: string | null; avoir_de: string | null }
  async function factureDe(numero: string): Promise<FactureRow | null> {
    const { data, error } = await session.from('factures').select('id, numero, statut, objet, client_nom, client_email, total_ttc, date_echeance, avoir_de').eq('artisan_id', ctx.uid).eq('numero', numero).maybeSingle()
    if (error) throw new Error('facture illisible')
    return (data as unknown as FactureRow | null) ?? null
  }
  R.creer_facture = async (e) => {
    const d = await devisDe(String(e.devis_numero))
    if (!d) return ko(`Devis ${e.devis_numero} introuvable.`)
    if (d.statut !== 'accepte') return ko(`Le devis ${d.numero} n'est pas signé (statut : ${d.statut}) : on ne facture qu'un devis accepté.`)
    const acompte = e.type === 'acompte' ? num(e.acompte_pct) : undefined
    // 0176 (drapeau facturesSituation, validé par outils-actions.ts) : situation de travaux et solde explicite.
    const typeNeuf = e.type === 'situation' || e.type === 'solde' ? e.type : null
    const r = await (dep.creerFacture ?? creerFacture)({
      artisanId: ctx.uid, devisId: d.id, ...(acompte ? { acomptePct: acompte } : {}),
      ...(typeNeuf ? { type: typeNeuf, ...(typeNeuf === 'situation' ? { avancement: { global: num(e.avancement_pct) } } : {}) } : {}),
      // Le TTC que la carte a annoncé (situation, solde) : un montant recalculé différent = rien d'émis (M5).
      ...(typeof e.ttc_attendu === 'number' && Number.isFinite(e.ttc_attendu) ? { ttcAttendu: e.ttc_attendu } : {}),
    })
    if (!r.ok) return ko(r.error)
    return {
      ok: true, resume: `facture ${r.numero} émise${acompte ? ` (acompte ${fmtNombre(acompte)} %)` : typeNeuf === 'situation' ? ` (situation de travaux, avancement cumulé ${fmtNombre(num(e.avancement_pct))} %)` : typeNeuf === 'solde' ? ' (solde)' : ''} pour le devis ${d.numero}`, objet: { type: 'facture', id: r.id },
      donnees: { numero_facture: r.numero, devis: d.numero, type: acompte ? 'acompte' : typeNeuf ?? 'complete' },
      apercu: { irreversible: true, lien: lienDe('facture', r.id) },
    }
  }

  R.marquer_facture_payee = async (e) => {
    const f = await factureDe(String(e.numero))
    if (!f) return ko(`Facture ${e.numero} introuvable.`)
    if (f.statut !== 'emise' || f.avoir_de) return ko(`La facture ${f.numero} n'est pas « émise » (statut : ${f.avoir_de ? 'avoir' : f.statut}) : rien à encaisser.`)
    const rep = await route(factureMaj, `/api/factures/${f.id}`, { methode: 'PATCH', corps: { statut: 'payee' }, params: { id: f.id } })
    return rep.status === 200 ? { ok: true, resume: `facture ${f.numero} marquée payée`, objet: { type: 'facture', id: f.id } } : ko(objetErreur(rep, 'La facture n’a pas pu être marquée payée.'))
  }
  R.relancer_facture = async (e) => {
    const f = await factureDe(String(e.numero))
    if (!f) return ko(`Facture ${e.numero} introuvable.`)
    if (f.statut !== 'emise' || f.avoir_de) return ko(`La facture ${f.numero} n'est pas un impayé (statut : ${f.avoir_de ? 'avoir' : f.statut}).`)
    const to = txt(f.client_email)
    if (!to || !EMAIL.test(to)) return ko('La facture n’a pas d’e-mail client.')
    const p = await profil()
    const t = texteRelanceFacture({ client: f.client_nom, numero: String(f.numero), totalTtc: f.total_ttc === null ? null : num(f.total_ttc), echeance: f.date_echeance, joursRetard: joursDepuis(f.date_echeance), artisan: p.nom, ton: (e.ton as 'cordial' | 'ferme') ?? 'cordial' })
    const reg = await registre({ type: 'facture', id: f.id })
    if (reg) return ko(reg)
    const echec = await envoyerRelance(to, t.objet, t.texte)
    return echec ?? { ok: true, resume: `relance de la facture ${f.numero} envoyée au client`, objet: { type: 'facture', id: f.id } }
  }
  function joursDepuis(iso: string | null): number | null {
    if (!iso) return null
    return Math.floor((Date.parse(aujourdhui() + 'T00:00:00Z') - Date.parse(iso.slice(0, 10) + 'T00:00:00Z')) / 86_400_000)
  }

  // ── Tarifs
  type TarifRow = { id: string; designation: string; unite: string | null; prix_ht: number | string; tva_taux: number | string; fournisseur: string | null; reference: string | null; date_prix: string | null }
  async function tarifDe(id: string): Promise<TarifRow | null> {
    const { data, error } = await session.from('prix_artisan').select('id, designation, unite, prix_ht, tva_taux, fournisseur, reference, date_prix').eq('artisan_id', ctx.uid).eq('id', id).maybeSingle()
    if (error) throw new Error('tarif illisible')
    return (data as unknown as TarifRow | null) ?? null
  }
  async function tarifParCle(designation: string, fournisseur: string | null, reference: string | null): Promise<TarifRow | null> {
    let q = session.from('prix_artisan').select('id, designation, unite, prix_ht, tva_taux, fournisseur, reference, date_prix').eq('artisan_id', ctx.uid).eq('designation', designation)
    q = fournisseur ? q.eq('fournisseur', fournisseur) : q.is('fournisseur', null)
    q = reference ? q.eq('reference', reference) : q.is('reference', null)
    const { data, error } = await q.limit(1).maybeSingle()
    if (error) throw new Error('tarif illisible')
    return (data as unknown as TarifRow | null) ?? null
  }
  async function ecrirePrix(id: string, prix: number, dateIso?: string | null): Promise<boolean> {
    // La RLS de prix_artisan (« écriture propre ») : l'artisan écrit ses prix depuis son navigateur de la même façon.
    const { data, error } = await session.from('prix_artisan').update({ prix_ht: Math.round(prix * 100) / 100, date_prix: dateIso ?? aujourdhui(), maj_le: maintenant().toISOString() }).eq('id', id).eq('artisan_id', ctx.uid).select('id')
    return !error && (data ?? []).length === 1
  }
  R.ajouter_tarif = async (e) => {
    // 02/11 (troisième audit 032-005, A2) : la bibliothèque de tarifs n'enregistre que le prix que l'artisan a écrit lui-même. Sinon une
    // estimation lue dans un autre devis y devenait « tarif de l'artisan », et le devis fait avec partait seul.
    if (!prixDeLArtisan(e.prix_ht, tauxDe(e.tva_taux))) return prixNonDonne(e.prix_ht, tauxDe(e.tva_taux))
    const designation = String(e.designation)
    const fournisseur = txt(e.fournisseur), reference = txt(e.reference)
    const avant = await tarifParCle(designation, fournisseur, reference)
    const rep = await route(tarifsEcrire, '/api/tarifs', { corps: { designation, prix_ht: e.prix_ht, unite: e.unite ?? undefined, tva_taux: e.tva_taux ?? undefined, fournisseur, reference } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'Le tarif n’a pas pu être enregistré.'))
    const apres = await tarifParCle(designation, fournisseur, reference)
    const id = apres?.id ?? null
    return {
      ok: true, resume: avant ? `tarif « mis à jour » : ${fmtEuros(avant.prix_ht)} → ${fmtEuros(e.prix_ht as number)} HT` : `tarif ajouté : ${fmtEuros(e.prix_ht as number)} HT`, objet: id ? { type: 'tarif', id } : null,
      annulation: avant
        ? { outil: 'restaurer_prix_tarif', entrees: { id, prix: num(avant.prix_ht), date: avant.date_prix }, libelle: `Remettre le prix à ${fmtEuros(avant.prix_ht)}` }
        : id ? { outil: 'supprimer_tarif_id', entrees: { id }, libelle: 'Retirer ce tarif' } : null,
      donnees: { designation, prix_ht: e.prix_ht, ancien_prix_ht: avant ? num(avant.prix_ht) : null, tarif_id: id },
      apercu: { lignes: [{ label: 'Désignation', valeur: designation }, { label: 'Prix HT', valeur: `${fmtEuros(e.prix_ht as number)}${txt(e.unite) ? ' / ' + e.unite : ''}` }], avant_apres: avant ? [{ libelle: 'Prix HT', avant: fmtEuros(avant.prix_ht), apres: fmtEuros(e.prix_ht as number) }] : [], lien: lienDe('tarif', null) },
    }
  }
  INV.restaurer_prix_tarif = async (e) => ((await ecrirePrix(String(e.id), num(e.prix), (e.date as string | null) ?? null)) ? { ok: true, resume: 'prix remis comme avant' } : ko('Le tarif n’existe plus ou a changé.'))
  INV.supprimer_tarif_id = async (e) => {
    const rep = await route(tarifsSupprimer, `/api/tarifs?id=${encodeURIComponent(String(e.id))}`, { methode: 'DELETE' })
    return rep.status === 200 ? { ok: true, resume: 'tarif retiré' } : ko(objetErreur(rep, 'Suppression impossible.'))
  }
  R.modifier_tarif = async (e) => {
    // 02/11 (troisième audit 032-005, A2) : même règle que ajouter_tarif — un « ordre de grandeur » donné par l'assistant n'est pas un tarif.
    // 032-007 : le taux est celui du tarif modifié (défaut 10 %).
    const t = await tarifDe(String(e.tarif_id))
    if (!t) return ko('Tarif introuvable dans la bibliothèque de l’artisan (relis-le avec lire_tarifs).')
    const tvaTarif = t.tva_taux === null || t.tva_taux === undefined || !Number.isFinite(Number(t.tva_taux)) ? 10 : Number(t.tva_taux)
    if (!prixDeLArtisan(e.prix_ht, tvaTarif)) return prixNonDonne(e.prix_ht, tvaTarif)
    const ancien = num(t.prix_ht)
    if (!(await ecrirePrix(t.id, e.prix_ht as number))) return ko('Le prix n’a pas pu être enregistré.')
    return {
      ok: true, resume: `tarif modifié : ${fmtEuros(ancien)} → ${fmtEuros(e.prix_ht as number)} HT`, objet: { type: 'tarif', id: t.id },
      annulation: { outil: 'restaurer_prix_tarif', entrees: { id: t.id, prix: ancien, date: t.date_prix }, libelle: `Remettre le prix à ${fmtEuros(ancien)}` },
      donnees: { designation: t.designation, ancien_prix_ht: ancien, prix_ht: e.prix_ht },
      apercu: { lignes: [{ label: 'Désignation', valeur: t.designation }], avant_apres: [{ libelle: 'Prix HT', avant: fmtEuros(ancien), apres: fmtEuros(e.prix_ht as number) }], lien: lienDe('tarif', null) },
    }
  }
  R.augmenter_tarifs = async (e) => {
    const lot = (e.lot as { id: string; avant: number; apres: number; date_avant: string | null }[]) ?? []
    if (!lot.length) return ko('Aucun tarif dans ce lot.')
    const faits: typeof lot = []
    let ignores = 0
    for (let i = 0; i < lot.length; i += 25) {
      await Promise.all(lot.slice(i, i + 25).map(async (l) => {
        // Seulement si le prix n'a pas bougé depuis la carte : un prix changé entre-temps n'est pas écrasé.
        const { data, error } = await session.from('prix_artisan').update({ prix_ht: l.apres, date_prix: aujourdhui(), maj_le: maintenant().toISOString() }).eq('id', l.id).eq('artisan_id', ctx.uid).eq('prix_ht', l.avant).select('id')
        if (!error && (data ?? []).length === 1) faits.push(l); else ignores++
      }))
    }
    if (!faits.length) return ko('Aucun prix n’a été modifié (ils ont changé depuis la proposition). Redemandez le lot.')
    return {
      ok: true, resume: `${faits.length} tarif(s) modifié(s) de ${e.pourcentage} %${ignores ? ` (${ignores} ignoré(s) : prix changé entre-temps)` : ''}`,
      annulation: { outil: 'restaurer_prix_lot', entrees: { lot: faits }, libelle: `Remettre les ${faits.length} prix comme avant` },
      apercu: { lien: lienDe('tarif', null) },
    }
  }
  INV.restaurer_prix_lot = async (e) => {
    const lot = (e.lot as { id: string; avant: number; apres: number; date_avant: string | null }[]) ?? []
    let n = 0
    for (let i = 0; i < lot.length; i += 25) {
      await Promise.all(lot.slice(i, i + 25).map(async (l) => {
        const { data, error } = await session.from('prix_artisan').update({ prix_ht: l.avant, date_prix: l.date_avant ?? aujourdhui(), maj_le: maintenant().toISOString() }).eq('id', l.id).eq('artisan_id', ctx.uid).eq('prix_ht', l.apres).select('id')
        if (!error && (data ?? []).length === 1) n++
      }))
    }
    return n ? { ok: true, resume: `${n} prix remis comme avant` } : ko('Les prix ont changé depuis : rien n’a été remis.')
  }
  R.supprimer_tarif = async (e) => {
    const t = await tarifDe(String(e.tarif_id))
    if (!t) return ko('Tarif introuvable (déjà supprimé ?).')
    const rep = await route(tarifsSupprimer, `/api/tarifs?id=${encodeURIComponent(t.id)}`, { methode: 'DELETE' })
    if (rep.status !== 200) return ko(objetErreur(rep, 'Suppression impossible.'))
    return {
      ok: true, resume: `tarif « ${t.designation} » supprimé`,
      annulation: { outil: 'recreer_tarif', entrees: { designation: t.designation, prix_ht: num(t.prix_ht), unite: t.unite, tva_taux: num(t.tva_taux), fournisseur: t.fournisseur, reference: t.reference }, libelle: 'Remettre ce tarif' },
    }
  }
  INV.recreer_tarif = async (e) => {
    const rep = await route(tarifsEcrire, '/api/tarifs', { corps: e })
    return rep.status === 200 ? { ok: true, resume: 'tarif remis' } : ko(objetErreur(rep, 'Impossible de remettre le tarif.'))
  }

  // ── Inventaire
  R.ajouter_article = async (e) => {
    const nom = String(e.nom)
    const { data: memes, error } = await session.from('materiaux').select('id, nom').eq('artisan_id', ctx.uid).limit(500)
    if (error) throw new Error('inventaire illisible')
    if ((memes ?? []).some((m) => sansAccent(String(m.nom)).toLowerCase().trim() === sansAccent(nom).toLowerCase())) return ko(`L'article « ${nom} » existe déjà : utilise modifier_article ou ajuster_stock.`)
    const rep = await route(inventaireEcrire, '/api/inventaire', { corps: { nom, unite: e.unite ?? undefined, categorie: e.categorie ?? undefined, seuil_alerte: e.seuil_alerte ?? undefined, fournisseur_prefere: e.fournisseur_prefere ?? undefined, prix_dernier_ht: e.prix_dernier_ht ?? undefined } })
    if (rep.status !== 200 || typeof rep.json?.id !== 'string') return ko(objetErreur(rep, 'L’article n’a pas pu être créé.'))
    const id = rep.json.id as string
    let reste: number | null = null
    const q = num(e.quantite_initiale)
    if (q > 0) {
      const m = await route(inventaireEcrire, '/api/inventaire', { corps: { mouvement: { materiau_id: id, type: 'entree', quantite: q, lieu: e.lieu ?? 'atelier', source: 'manuel', note: 'Quantité initiale (assistant)' } } })
      if (m.status !== 200) return ko(`Article créé, mais la quantité initiale n'a pas pu être enregistrée : ${objetErreur(m, 'mouvement refusé')}`)
      reste = num(m.json?.reste)
    }
    return {
      ok: true, resume: `article « ${nom} » ajouté${q > 0 ? ` (${fmtNombre(q)} en stock)` : ''}`, objet: { type: 'article', id },
      annulation: { outil: 'supprimer_article', entrees: { id }, libelle: `Retirer l’article « ${nom} »` },
      donnees: { article: nom, quantite_en_stock: reste },
      apercu: { lignes: [{ label: 'Article', valeur: nom }, ...(q > 0 ? [{ label: 'Stock initial', valeur: `${fmtNombre(q)} ${txt(e.unite) ?? ''} (${e.lieu ?? 'atelier'})`.trim() }] : [])], lien: lienDe('article', id) },
    }
  }
  INV.supprimer_article = async (e) => {
    const rep = await route(inventaireSupprimer, `/api/inventaire?id=${encodeURIComponent(String(e.id))}`, { methode: 'DELETE' })
    return rep.status === 200 ? { ok: true, resume: 'article retiré' } : ko(objetErreur(rep, 'Suppression impossible.'))
  }
  R.modifier_article = async (e) => {
    const a = await articleDe(String(e.article))
    if (!a.ok) return ko(a.erreur)
    const fiche = await route(materiauLire, `/api/inventaire/materiaux?id=${a.item.id}`)
    const m = fiche.json?.materiau as Obj | undefined
    if (fiche.status !== 200 || !m) return ko(objetErreur(fiche, 'Fiche illisible.'))
    const champs: Obj = {}
    if (typeof e.seuil_alerte === 'number') champs.seuil_alerte = e.seuil_alerte
    if (txt(e.fournisseur_prefere)) champs.fournisseur_prefere = e.fournisseur_prefere
    if (txt(e.categorie)) champs.categorie = e.categorie
    const avant: Obj = Object.fromEntries(Object.keys(champs).map((k) => [k, m[k] ?? null]))
    const rep = await route(materiauEcrire, '/api/inventaire/materiaux', { corps: { ...m, ...champs, id: a.item.id, fournisseur_id: (m.fournisseur as { id?: string } | null)?.id ?? m.fournisseur_id ?? null } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'La fiche n’a pas pu être modifiée.'))
    return {
      ok: true, resume: `fiche « ${a.item.nom} » modifiée`, objet: { type: 'article', id: a.item.id },
      annulation: { outil: 'restaurer_article', entrees: { id: a.item.id, champs: avant }, libelle: `Remettre la fiche « ${a.item.nom} » comme avant` },
      donnees: { article: a.item.nom, modifie: Object.keys(champs) },
      apercu: { lignes: [{ label: 'Article', valeur: a.item.nom }], avant_apres: Object.keys(champs).map((k) => ({ libelle: k.replace(/_/g, ' '), avant: String(avant[k] ?? '—'), apres: String(champs[k]) })), lien: lienDe('article', a.item.id) },
    }
  }
  INV.restaurer_article = async (e) => {
    const fiche = await route(materiauLire, `/api/inventaire/materiaux?id=${e.id}`)
    const m = fiche.json?.materiau as Obj | undefined
    if (fiche.status !== 200 || !m) return ko('Fiche introuvable.')
    const rep = await route(materiauEcrire, '/api/inventaire/materiaux', { corps: { ...m, ...(e.champs as Obj), id: e.id, fournisseur_id: (m.fournisseur as { id?: string } | null)?.id ?? m.fournisseur_id ?? null } })
    return rep.status === 200 ? { ok: true, resume: 'fiche remise comme avant' } : ko(objetErreur(rep, 'Restauration impossible.'))
  }
  R.ajuster_stock = async (e) => {
    const a = await articleDe(String(e.article))
    if (!a.ok) return ko(a.erreur)
    const lieu = String(e.lieu ?? 'atelier')
    const avantLieu = num((a.item.stock ?? []).find((s) => s.lieu === lieu)?.quantite)
    const type = String(e.mouvement)
    // Une sortie ou une perte plus grande que le stock rendrait le stock négatif (appliquer_mouvement ne l'interdit pas) : refus, avec ce qu'il reste.
    if ((type === 'sortie' || type === 'perte') && num(e.quantite) > avantLieu) return ko(`Stock insuffisant : il reste ${fmtNombre(avantLieu)} ${a.item.unite ?? ''} de « ${a.item.nom} » à ${lieu}, impossible d'en sortir ${fmtNombre(num(e.quantite))}. Si le stock réel est différent, fais un inventaire (recomptage).`.replace(/\s+/g, ' '))
    // 29/10 — une SORTIE pour un chantier du CRM : rattachée au chantier. Une réservation de MÊME quantité attend ce matériel sur ce chantier
    // → elle est sortie par la route de la fiche du chantier (crm_sortir_materiau : verrou, mouvement rattaché au devis, réservation « sortie ») ;
    // sinon, un mouvement de sortie rattaché au devis du chantier, refusé s'il rendrait le stock négatif (comme l'atelier du CRM).
    let pourChantier: Chantier | null = null
    if (txt(e.chantier)) {
      if (!ctx.crm) return sansCrm
      const c = await chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
      pourChantier = c.item
      const { data: resas, error: eResa } = await session.from('chantier_materiaux').select('id, quantite').eq('artisan_id', ctx.uid).eq('chantier_id', c.item.id).eq('materiau_id', a.item.id).eq('statut', 'reserve').eq('lieu', lieu).limit(20)
      if (eResa) throw new Error('réservations illisibles')
      const resa = ((resas ?? []) as unknown as { id: string; quantite: number | string }[]).find((x) => num(x.quantite) === num(e.quantite))
      if (resa) {
        const rs = await route(reservationSortir, `/api/crm/materiaux/${resa.id}`, { methode: 'PATCH', corps: { action: 'sortir' }, params: { id: resa.id } })
        if (rs.status !== 200) return ko(objetErreur(rs, 'La sortie de la réservation n’a pas pu se faire : rien n’a été décompté.'))
        const resteR = num(rs.json?.reste)
        return {
          ok: true, resume: `stock « ${a.item.nom} » : sortie de ${fmtNombre(e.quantite as number)} (${lieu}) pour le chantier « ${c.item.titre} », réservation sortie, reste ${fmtNombre(resteR)}`, objet: { type: 'chantier', id: c.item.id },
          annulation: { outil: 'mouvement_inverse', entrees: { materiau_id: a.item.id, lieu, type: 'entree', quantite: e.quantite }, libelle: 'Remettre ce matériel en stock' },
          donnees: { article: a.item.nom, mouvement: 'sortie', quantite: e.quantite, lieu, chantier: c.item.titre, reservation_sortie: true, reste_en_stock: resteR, a_savoir: 'La réservation de ce chantier est passée « sortie ». Une annulation remet le matériel en stock (la réservation reste « sortie »).' },
          apercu: { lignes: [{ label: 'Article', valeur: a.item.nom }, { label: 'Chantier', valeur: c.item.titre }, { label: 'Mouvement', valeur: `sortie · ${fmtNombre(e.quantite as number)} ${a.item.unite ?? ''} · ${lieu}`.trim() }], avant_apres: [{ libelle: `Stock (${lieu})`, avant: fmtNombre(avantLieu), apres: fmtNombre(resteR) }], lien: lienDe('chantier', c.item.id) },
        }
      }
    }
    const noteMvt = pourChantier ? `${txt(e.note) ? `${txt(e.note)} — ` : ''}Sortie pour le chantier « ${pourChantier.titre} »`.slice(0, 300) : txt(e.note) ?? 'Saisi par l’assistant'
    const rep = await route(inventaireEcrire, '/api/inventaire', { corps: { mouvement: { materiau_id: a.item.id, type, quantite: e.quantite, lieu, source: 'manuel', note: noteMvt, ...(pourChantier ? { devis_id: pourChantier.devis_id ?? null, refuser_negatif: true } : {}) } } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'Le mouvement n’a pas pu être enregistré (stock insuffisant ?).'))
    const reste = num(rep.json?.reste)
    const inverse = type === 'entree' ? { type: 'sortie', quantite: e.quantite } : type === 'inventaire' ? { type: 'inventaire', quantite: avantLieu } : { type: 'entree', quantite: e.quantite }
    return {
      ok: true, resume: `stock « ${a.item.nom} » : ${type} de ${fmtNombre(e.quantite as number)} (${lieu})${pourChantier ? ` pour le chantier « ${pourChantier.titre} »` : ''}, reste ${fmtNombre(reste)}`, objet: pourChantier ? { type: 'chantier', id: pourChantier.id } : { type: 'article', id: a.item.id },
      annulation: { outil: 'mouvement_inverse', entrees: { materiau_id: a.item.id, lieu, ...inverse }, libelle: 'Annuler ce mouvement de stock' },
      donnees: { article: a.item.nom, mouvement: type, quantite: e.quantite, lieu, ...(pourChantier ? { chantier: pourChantier.titre } : {}), reste_en_stock: reste, seuil_alerte: num(a.item.seuil_alerte), sous_le_seuil: num(a.item.seuil_alerte) > 0 && reste <= num(a.item.seuil_alerte) },
      apercu: { lignes: [{ label: 'Article', valeur: a.item.nom }, { label: 'Mouvement', valeur: `${type} · ${fmtNombre(e.quantite as number)} ${a.item.unite ?? ''} · ${lieu}`.trim() }], avant_apres: [{ libelle: `Stock (${lieu})`, avant: fmtNombre(avantLieu), apres: fmtNombre(reste) }], lien: lienDe('article', a.item.id) },
    }
  }
  INV.mouvement_inverse = async (e) => {
    const rep = await route(inventaireEcrire, '/api/inventaire', { corps: { mouvement: { materiau_id: e.materiau_id, type: e.type, quantite: e.quantite, lieu: e.lieu, source: 'manuel', note: 'Annulation (assistant)' } } })
    return rep.status === 200 ? { ok: true, resume: 'mouvement de stock annulé' } : ko(objetErreur(rep, 'Annulation impossible.'))
  }

  // ── CRM
  R.reserver_materiau = async (e) => {
    if (!ctx.crm) return sansCrm
    const c = await chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
    const a = await articleDe(String(e.article)); if (!a.ok) return ko(a.erreur)
    const rep = await route(reserver, `/api/crm/chantiers/${c.item.id}/materiaux`, { corps: { materiau_id: a.item.id, quantite: e.quantite, lieu: e.lieu ?? 'atelier' }, params: { id: c.item.id } })
    if (rep.status !== 201 || typeof rep.json?.id !== 'string') return ko(objetErreur(rep, 'La réservation n’a pas pu être faite.'))
    return {
      ok: true, resume: `${fmtNombre(e.quantite as number)} × « ${a.item.nom} » réservé(s) pour le chantier « ${c.item.titre} »`, objet: { type: 'chantier', id: c.item.id },
      annulation: { outil: 'annuler_reservation', entrees: { id: rep.json.id }, libelle: 'Annuler cette réservation' },
      donnees: { article: a.item.nom, chantier: c.item.titre, quantite: e.quantite, a_savoir: 'La réservation ne touche pas au stock : la sortie se fait sur la fiche du chantier.' },
      apercu: { lignes: [{ label: 'Chantier', valeur: c.item.titre }, { label: 'Article', valeur: a.item.nom }, { label: 'Quantité', valeur: fmtNombre(e.quantite as number) }], lien: lienDe('chantier', c.item.id) },
    }
  }
  INV.annuler_reservation = async (e) => {
    const rep = await route(reservationSupprimer, `/api/crm/materiaux/${e.id}`, { methode: 'DELETE', params: { id: String(e.id) } })
    return rep.status === 200 ? { ok: true, resume: 'réservation annulée' } : ko(objetErreur(rep, 'Annulation impossible (déjà sortie du stock ?).'))
  }
  R.creer_chantier = async (e) => {
    if (!ctx.crm) return sansCrm
    let devisId: string | null = null
    if (txt(e.devis_numero)) {
      const d = await devisDe(String(e.devis_numero))
      if (!d) return ko(`Devis ${e.devis_numero} introuvable.`)
      devisId = d.id
    }
    const rep = await route(chantierCreer, '/api/crm/chantiers', { corps: { ...(devisId ? { devis_id: devisId } : {}), ...(txt(e.titre) ? { titre: e.titre } : {}), ...(txt(e.client_nom) ? { client_nom: e.client_nom } : {}), ...(txt(e.adresse) ? { adresse: e.adresse } : {}), ...(e.date_debut ? { date_debut: e.date_debut } : {}), ...(e.date_fin_prevue ? { date_fin_prevue: e.date_fin_prevue } : {}), ...(e.generer_taches === true ? { generer_taches: true } : {}) } })
    if (rep.status !== 201 || typeof rep.json?.id !== 'string') return ko(objetErreur(rep, 'Le chantier n’a pas pu être créé.'))
    const id = rep.json.id as string
    return {
      ok: true, resume: `chantier créé${num(rep.json.taches) ? ` avec ${rep.json.taches} tâche(s)` : ''}`, objet: { type: 'chantier', id },
      annulation: { outil: 'supprimer_chantier', entrees: { id }, libelle: 'Supprimer ce chantier' },
      donnees: { taches_creees: num(rep.json.taches), avertissements: rep.json.avertissements ?? [] },
      apercu: { lignes: [{ label: 'Chantier', valeur: txt(e.titre) ?? `depuis le devis ${e.devis_numero}` }], lien: lienDe('chantier', id) },
    }
  }
  INV.supprimer_chantier = async (e) => {
    const rep = await route(chantierSupprimer, `/api/crm/chantiers/${e.id}`, { methode: 'DELETE', params: { id: String(e.id) } })
    return rep.status === 200 ? { ok: true, resume: 'chantier supprimé' } : ko(objetErreur(rep, 'Suppression impossible.'))
  }
  R.modifier_chantier = async (e) => {
    if (!ctx.crm) return sansCrm
    const c = await chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
    const champs: Obj = {}
    for (const k of ['statut', 'date_debut', 'date_fin_prevue', 'adresse', 'notes']) if (e[k] !== null && e[k] !== undefined && e[k] !== '') champs[k] = e[k]
    const avant: Obj = Object.fromEntries(Object.keys(champs).map((k) => [k, (c.item as unknown as Obj)[k] ?? null]))
    const rep = await route(chantierMaj, `/api/crm/chantiers/${c.item.id}`, { methode: 'PATCH', corps: champs, params: { id: c.item.id } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'Le chantier n’a pas pu être modifié.'))
    return {
      ok: true, resume: `chantier « ${c.item.titre} » modifié (${Object.keys(champs).join(', ')})`, objet: { type: 'chantier', id: c.item.id },
      annulation: { outil: 'restaurer_chantier', entrees: { id: c.item.id, champs: avant }, libelle: 'Remettre le chantier comme avant' },
      donnees: { chantier: c.item.titre, modifie: Object.keys(champs) },
      apercu: { lignes: [{ label: 'Chantier', valeur: c.item.titre }], avant_apres: Object.keys(champs).map((k) => ({ libelle: k.replace(/_/g, ' '), avant: String(avant[k] ?? '—'), apres: String(champs[k]) })), lien: lienDe('chantier', c.item.id) },
    }
  }
  INV.restaurer_chantier = async (e) => {
    const rep = await route(chantierMaj, `/api/crm/chantiers/${e.id}`, { methode: 'PATCH', corps: e.champs, params: { id: String(e.id) } })
    return rep.status === 200 ? { ok: true, resume: 'chantier remis comme avant' } : ko(objetErreur(rep, 'Restauration impossible.'))
  }
  R.affecter_equipe = async (e) => {
    if (!ctx.crm) return sansCrm
    const c = await chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
    const { data: ms, error } = await session.from('equipe_membres').select('id, nom, actif').eq('artisan_id', ctx.uid).limit(200)
    if (error) throw new Error('équipe illisible')
    const membres = ((ms ?? []) as unknown as { id: string; nom: string; actif: boolean }[]).filter((m) => m.actif !== false)
    const { data: aff, error: ea } = await session.from('chantier_equipe').select('membre_id').eq('chantier_id', c.item.id).eq('artisan_id', ctx.uid)
    if (ea) throw new Error('équipe illisible')
    const avant = new Set(((aff ?? []) as unknown as { membre_id: string }[]).map((x) => x.membre_id))
    const apres = new Set(avant)
    const noms = (liste: string[]) => liste.map((n) => trouverUnique(membres, n, (m) => [m.nom], 'Membre de l’équipe'))
    const ajoutes = noms((e.ajouter as string[]) ?? []), retires = noms((e.retirer as string[]) ?? [])
    const mauvais = [...ajoutes, ...retires].find((r) => !r.ok)
    if (mauvais && !mauvais.ok) return ko(mauvais.erreur)
    for (const r of ajoutes) if (r.ok) apres.add(r.item.id)
    for (const r of retires) if (r.ok) apres.delete(r.item.id)
    const rep = await route(chantierMaj, `/api/crm/chantiers/${c.item.id}`, { methode: 'PATCH', corps: { equipe: [...apres] }, params: { id: c.item.id } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'L’équipe n’a pas pu être modifiée.'))
    const nomsApres = membres.filter((m) => apres.has(m.id)).map((m) => m.nom)
    return {
      ok: true, resume: `équipe du chantier « ${c.item.titre} » mise à jour`, objet: { type: 'chantier', id: c.item.id },
      annulation: { outil: 'restaurer_equipe', entrees: { id: c.item.id, equipe: [...avant] }, libelle: 'Remettre l’équipe comme avant' },
      donnees: { chantier: c.item.titre, equipe_affectee: nomsApres },
      apercu: { lignes: [{ label: 'Chantier', valeur: c.item.titre }, { label: 'Équipe', valeur: nomsApres.join(', ') || 'personne' }], lien: lienDe('chantier', c.item.id) },
    }
  }
  INV.restaurer_equipe = async (e) => {
    const rep = await route(chantierMaj, `/api/crm/chantiers/${e.id}`, { methode: 'PATCH', corps: { equipe: e.equipe }, params: { id: String(e.id) } })
    return rep.status === 200 ? { ok: true, resume: 'équipe remise comme avant' } : ko(objetErreur(rep, 'Restauration impossible.'))
  }
  R.ajouter_tache = async (e) => {
    if (!ctx.crm) return sansCrm
    const c = await chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
    const rep = await route(tacheCreer, `/api/crm/chantiers/${c.item.id}/taches`, { corps: { libelle: e.libelle }, params: { id: c.item.id } })
    if (rep.status !== 201 || typeof rep.json?.id !== 'string') return ko(objetErreur(rep, 'La tâche n’a pas pu être ajoutée.'))
    return {
      ok: true, resume: `tâche ajoutée au chantier « ${c.item.titre} »`, objet: { type: 'chantier', id: c.item.id },
      annulation: { outil: 'supprimer_tache', entrees: { id: rep.json.id }, libelle: 'Retirer cette tâche' },
      donnees: { chantier: c.item.titre, tache: e.libelle },
      apercu: { lignes: [{ label: 'Chantier', valeur: c.item.titre }, { label: 'Tâche', valeur: String(e.libelle) }], lien: lienDe('chantier', c.item.id) },
    }
  }
  INV.supprimer_tache = async (e) => {
    const rep = await route(tacheSupprimer, `/api/crm/taches/${e.id}`, { methode: 'DELETE', params: { id: String(e.id) } })
    return rep.status === 200 ? { ok: true, resume: 'tâche retirée' } : ko(objetErreur(rep, 'Suppression impossible.'))
  }
  R.cocher_tache = async (e) => {
    if (!ctx.crm) return sansCrm
    const c = await chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
    const { data, error } = await session.from('chantier_taches').select('id, libelle, faite').eq('chantier_id', c.item.id).eq('artisan_id', ctx.uid).limit(500)
    if (error) throw new Error('tâches illisibles')
    const t = trouverUnique((data ?? []) as unknown as { id: string; libelle: string; faite: boolean }[], String(e.tache), (x) => [x.libelle], 'Tâche')
    if (!t.ok) return ko(t.erreur)
    const faite = e.faite !== false
    if (!!t.item.faite === faite) return ko(`La tâche « ${t.item.libelle} » est déjà ${faite ? 'faite' : 'à faire'}.`)
    const rep = await route(tacheMaj, `/api/crm/taches/${t.item.id}`, { methode: 'PATCH', corps: { faite }, params: { id: t.item.id } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'La tâche n’a pas pu être mise à jour.'))
    return {
      ok: true, resume: `tâche « ${t.item.libelle} » ${faite ? 'cochée' : 'décochée'}`, objet: { type: 'chantier', id: c.item.id },
      annulation: { outil: 'restaurer_tache', entrees: { id: t.item.id, faite: !faite }, libelle: faite ? 'Décocher cette tâche' : 'Recocher cette tâche' },
      donnees: { chantier: c.item.titre, tache: t.item.libelle, faite },
      apercu: { lignes: [{ label: 'Chantier', valeur: c.item.titre }, { label: 'Tâche', valeur: t.item.libelle }], avant_apres: [{ libelle: 'État', avant: faite ? 'à faire' : 'faite', apres: faite ? 'faite' : 'à faire' }], lien: lienDe('chantier', c.item.id) },
    }
  }
  INV.restaurer_tache = async (e) => {
    const rep = await route(tacheMaj, `/api/crm/taches/${e.id}`, { methode: 'PATCH', corps: { faite: e.faite }, params: { id: String(e.id) } })
    return rep.status === 200 ? { ok: true, resume: 'tâche remise comme avant' } : ko(objetErreur(rep, 'Restauration impossible.'))
  }
  R.ajouter_note = async (e) => {
    if (!ctx.crm) return sansCrm
    let cible: Obj; let objet: { type: TypeObjet; id: string }; let ou: string
    if (txt(e.chantier)) {
      const c = await chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
      cible = { chantier_id: c.item.id }; objet = { type: 'chantier', id: c.item.id }; ou = `chantier « ${c.item.titre} »`
    } else {
      const lead = await leadDe(String(e.conversation_id))
      if (!lead) return ko('Conversation introuvable.')
      cible = { lead_id: lead.id }; objet = { type: 'conversation', id: lead.id }; ou = 'la conversation'
    }
    const rep = await route(noteCreer, '/api/crm/notes', { corps: { texte: e.texte, ...cible } })
    if (rep.status !== 201 || typeof rep.json?.id !== 'string') return ko(objetErreur(rep, 'La note n’a pas pu être ajoutée.'))
    return {
      ok: true, resume: `note ajoutée sur ${ou}`, objet,
      annulation: { outil: 'supprimer_note', entrees: { id: rep.json.id }, libelle: 'Supprimer cette note' },
      donnees: { sur: ou, a_savoir: 'Note interne : le client ne la voit jamais.' },
      apercu: { lignes: [{ label: 'Note', valeur: String(e.texte) }], lien: lienDe(objet.type, objet.id) },
    }
  }
  INV.supprimer_note = async (e) => {
    const rep = await route(noteSupprimer, `/api/crm/notes/${e.id}`, { methode: 'DELETE', params: { id: String(e.id) } })
    return rep.status === 200 ? { ok: true, resume: 'note supprimée' } : ko(objetErreur(rep, 'Suppression impossible.'))
  }
  R.ajouter_membre_equipe = async (e) => {
    if (!ctx.crm) return sansCrm
    const rep = await route(membreCreer, '/api/crm/equipe', { corps: { nom: e.nom, ...(e.role ? { role: e.role } : {}) } })
    if (rep.status !== 201 || typeof rep.json?.id !== 'string') return ko(objetErreur(rep, 'Le membre n’a pas pu être ajouté.'))
    return {
      ok: true, resume: `membre « ${e.nom} » ajouté à l’équipe`, objet: { type: 'membre', id: rep.json.id },
      annulation: { outil: 'supprimer_membre', entrees: { id: rep.json.id }, libelle: `Retirer ${e.nom} de l’équipe` },
      donnees: { membre: e.nom, role: e.role ?? null },
      apercu: { lignes: [{ label: 'Membre', valeur: String(e.nom) }, { label: 'Rôle', valeur: String(e.role ?? '—') }], lien: lienDe('membre', null) },
    }
  }
  INV.supprimer_membre = async (e) => {
    const rep = await route(membreSupprimer, `/api/crm/equipe/${e.id}`, { methode: 'DELETE', params: { id: String(e.id) } })
    return rep.status === 200 ? { ok: true, resume: 'membre retiré' } : ko(objetErreur(rep, 'Suppression impossible.'))
  }

  // ── Demandes et messages
  R.changer_statut_demande = async (e) => {
    const lead = await leadDe(String(e.conversation_id))
    if (!lead) return ko('Conversation introuvable.')
    if (lead.statut === e.statut) return ko(`La demande est déjà « ${e.statut} ».`)
    // Comme le tableau de bord : la RLS de leads, avec la session de l'artisan.
    const { data, error } = await session.from('leads').update({ statut: e.statut, updated_at: maintenant().toISOString() }).eq('id', lead.id).eq('artisan_id', ctx.uid).select('id')
    if (error || (data ?? []).length !== 1) return ko('Le statut n’a pas pu être enregistré.')
    return {
      ok: true, resume: `demande : ${lead.statut ?? '—'} → ${e.statut}`, objet: { type: 'conversation', id: lead.id },
      annulation: { outil: 'restaurer_statut_demande', entrees: { id: lead.id, statut: lead.statut ?? 'nouveau' }, libelle: `Remettre la demande à « ${lead.statut ?? 'nouveau'} »` },
      donnees: { ancien_statut: lead.statut, statut: e.statut },
      apercu: { avant_apres: [{ libelle: 'Statut', avant: String(lead.statut ?? '—'), apres: String(e.statut) }], lien: lienDe('conversation', lead.id) },
    }
  }
  INV.restaurer_statut_demande = async (e) => {
    const { data, error } = await session.from('leads').update({ statut: e.statut, updated_at: maintenant().toISOString() }).eq('id', String(e.id)).eq('artisan_id', ctx.uid).select('id')
    return !error && (data ?? []).length === 1 ? { ok: true, resume: 'statut remis comme avant' } : ko('Restauration impossible.')
  }
  async function propositionDe(leadId: string): Promise<{ id: string; contenu: string } | null> {
    const { data, error } = await session.from('messages').select('id, contenu').eq('lead_id', leadId).eq('etat', 'proposition').order('sent_at', { ascending: false }).limit(1)
    if (error) throw new Error('messages illisibles')
    const m = (data ?? [])[0] as { id: string; contenu: string } | undefined
    return m ?? null
  }
  R.repondre_client = async (e) => {
    const lead = await leadDe(String(e.conversation_id))
    if (!lead) return ko('Conversation introuvable.')
    if (!(await peutEnvoyer())) return ko(`Limite d'envois du jour atteinte (${ENVOIS_JOUR_MAX}) : réessayez demain.`)
    const rep = await route(messagesEcrire as Gestionnaire, '/api/messages', { corps: { action: 'reply', lead_id: lead.id, message: e.texte } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'Le message n’a pas pu partir.'))
    return { ok: true, resume: `message envoyé au client${rep.json?.emailed ? ' (par e-mail)' : ''}`, objet: { type: 'conversation', id: lead.id } }
  }
  R.valider_reponse_proposee = async (e) => {
    const lead = await leadDe(String(e.conversation_id))
    if (!lead) return ko('Conversation introuvable.')
    const prop = await propositionDe(lead.id)
    if (!prop) return ko('Aucune réponse préparée n’attend dans cette conversation (déjà envoyée ou écartée).')
    if (!(await peutEnvoyer())) return ko(`Limite d'envois du jour atteinte (${ENVOIS_JOUR_MAX}) : réessayez demain.`)
    const rep = await route(messagesEcrire as Gestionnaire, '/api/messages', { corps: { action: 'valider', lead_id: lead.id, message_id: prop.id } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'La réponse n’a pas pu partir.'))
    return { ok: true, resume: `réponse préparée envoyée au client${rep.json?.emailed ? ' (par e-mail)' : ''}`, objet: { type: 'conversation', id: lead.id } }
  }
  R.rejeter_reponse_proposee = async (e) => {
    const lead = await leadDe(String(e.conversation_id))
    if (!lead) return ko('Conversation introuvable.')
    const prop = await propositionDe(lead.id)
    if (!prop) return ko('Aucune réponse préparée n’attend dans cette conversation.')
    const rep = await route(messagesEcrire as Gestionnaire, '/api/messages', { corps: { action: 'rejeter', lead_id: lead.id, message_id: prop.id } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'La réponse n’a pas pu être écartée.'))
    return { ok: true, resume: 'réponse préparée écartée', objet: { type: 'conversation', id: lead.id }, donnees: { a_savoir: 'La réponse écartée ne partira pas. Pour une nouvelle : preparer_reponse.' }, apercu: { lien: lienDe('conversation', lead.id) } }
  }

  // ═══════════════════════════ LES PROPOSITIONS (cartes à confirmer) ═══════════════════════════
  const P: Record<string, (e: EntreeAction) => Promise<Preparation>> = {}

  P.supprimer_devis_brouillon = async (e) => {
    const d = await devisDe(String(e.numero))
    if (!d) return ko(`Devis ${e.numero} introuvable.`)
    if ((d.statut ?? 'brouillon') !== 'brouillon') return ko(`Le devis ${d.numero} n'est pas un brouillon (statut : ${d.statut}) : un devis parti chez le client se conserve.`)
    return { ok: true, entrees: { ...e }, objet: { type: 'devis', id: d.id }, apercu: apercu(`Supprimer le brouillon ${d.numero}`, { lignes: [{ label: 'Devis', valeur: `${d.numero} — ${d.objet ?? 'sans objet'}` }, { label: 'Client', valeur: d.client_nom ?? '—' }, { label: 'Total TTC', valeur: fmtEuros(d.total_ttc) }], irreversible: true, alertes: ['Le brouillon et ses lignes seront supprimés définitivement.'] }) }
  }

  P.envoyer_devis = async (e) => {
    const d = await devisDe(String(e.numero))
    if (!d) return ko(`Devis ${e.numero} introuvable.`)
    if (d.statut === 'accepte') return ko(`Le devis ${d.numero} est déjà accepté par le client : il ne se renvoie pas.`)
    const p = await profil()
    const manquantes = mentionsDe(p.legal)
    if (manquantes.length) return ko(messageMentionsBloquantes(manquantes, 'ce devis'))
    let email = txt(d.client_email)
    let repris = false
    if (!email && d.lead_id) {
      const lead = await leadDe(d.lead_id)
      if (lead?.contact && EMAIL.test(lead.contact.trim())) { email = lead.contact.trim(); repris = true }
    }
    if (!email) return ko('Le client n’a pas d’e-mail sur ce devis : renseigne-le d’abord (modifier_devis avec client_email, si l’artisan te l’a donné).')
    const deja = d.statut === 'envoye'
    // 02/11 (audit 032-001, D1 ; §3.2 du prompt de Benj : « envoyer un devis […] avec un prix sans source » ne s'automatise jamais ;
    // promesse de lib/plans.ts) : une ligne au prix estimé, à chiffrer ou nul, et le devis ne part JAMAIS d'office, même demandé —
    // LA règle du pilote et de « Tout auto » (lib/pilote/regles.ts prixSources). Lignes illisibles : pareil (côté sûr). La carte le dit ;
    // confirmée d'un clic par l'artisan, elle part comme avant.
    const sources = await lignesDe(d.id).then((l) => prixSources(l), () => false)
    const mail = mailDevis({ numero: d.numero, client_nom: d.client_nom, objet: d.objet, validite_jours: d.validite_jours }, p.nom)
    return {
      ok: true, entrees: { ...e }, objet: { type: 'devis', id: d.id }, ...(sources ? {} : { horsAuto: LIBELLE_MOTIF.prix_non_source }),
      apercu: apercu(`Envoyer le devis ${d.numero} à ${d.client_nom ?? 'votre client'}`, {
        lignes: [{ label: 'À', valeur: email }, { label: 'Devis', valeur: `${d.numero} — ${d.objet ?? 'sans objet'}` }, { label: 'Total TTC', valeur: fmtEuros(d.total_ttc) }, { label: 'Pièce jointe', valeur: `${d.numero}.pdf` }],
        message: { a: email, objet: mail.subject, texte: mail.text },
        alertes: [...(deja ? ['Ce devis a déjà été envoyé : il repartira une seconde fois.'] : []), ...(repris ? ['L’e-mail est celui de la conversation du client.'] : []),
          ...(sources ? [] : ['Une ligne a un prix estimé, à chiffrer ou nul : relisez-la avant de confirmer.'])],
        irreversible: true,
      }),
    }
  }

  P.relancer_devis = async (e) => {
    if (estLot(e)) return preparerLotDevis(e)
    // 02/11 (L16) : un ordre groupé (plusieurs devis ou clients) ne se relance pas devis par devis — une seule carte de lot.
    if (ordreGroupe(messageArtisan)) return ko("Ordre groupé (plusieurs devis ou plusieurs clients) : n'appelle pas relancer_devis une fois par devis. Appelle-le UNE seule fois, avec numeros (les numéros rendus par lire_devis) ou envoye_depuis_jours (le nombre de jours que l'artisan a écrit) : une seule carte de lot, que l'artisan valide d'un clic. Rien n'a été préparé.")
    const d = await devisDe(String(e.numero))
    if (!d) return ko(`Devis ${e.numero} introuvable.`)
    if (d.statut !== 'envoye') return ko(`Le devis ${d.numero} n'a pas été envoyé ou n'attend plus de réponse (statut : ${d.statut}) : pas de relance.`)
    const to = txt(d.client_email)
    if (!to || !EMAIL.test(to)) return ko('Le devis n’a pas d’e-mail client : pas de relance par e-mail possible.')
    // 02/11 (audit 032-028, D8) : un journal illisible n'est plus lu « jamais relancé » : rien n'est préparé.
    const dernier = await ctx.magasin.dernierEnvoi(ctx.uid, 'relancer_devis', d.id).then((v) => v, () => MOTIF_JOURNAL_ILLISIBLE)
    if (dernier === MOTIF_JOURNAL_ILLISIBLE) return ko(`Le journal des relances n'a pas pu être relu (devis ${d.numero}) : rien n'a été préparé. Réessaie dans un instant.`)
    if (dernier && Date.now() - Date.parse(dernier) < RELANCE_DELAI_JOURS * 86_400_000) return ko(`Ce devis a déjà été relancé le ${fmtDate(jourParis(new Date(dernier)))} : on ne renvoie pas de message avant ${RELANCE_DELAI_JOURS} jours.`)
    const regP = await registre({ type: 'devis', id: d.id })
    if (regP) return ko(regP)
    // 02/11 (audit 032-028, D3) : « ne plus relancer » (le point d'entrée de 0185) vaut pour la relance seule comme pour le lot.
    const neplusP = await exclusionsRelance(ctx.uid, [d.id]).then((m) => m.get(d.id) ?? null, () => 'la liste « ne plus relancer » n’a pas pu être relue')
    if (neplusP) return ko(`Pas de relance du devis ${d.numero} : ${neplusP}. Rien n'a été préparé : dis-le à l'artisan.`)
    // 02/11 (audit 032-028, D2) : un devis déjà retenu par une carte de relance ouverte (seule ou de lot) ne fait pas une seconde carte.
    // 02/11 (contre-audit 032-035, E5) : une relance de ce devis EN COURS (réservation non levée, carte coupée récente) ou un journal illisible
    // ne fait plus refuser : une CARTE qui le dit, jamais d'office ni par le pilote — au clic, la réservation est relue (lotEnCoursSur).
    const ouverteBrute = await cartesRelanceOuvertes().then((m) => m.get(d.id) ?? null, () => ({ statut: 'en_cours' as const, lot: false }))
    const ouverteP = ouverteBrute?.statut === 'en_attente' ? ouverteBrute : null
    if (ouverteP) return ko(`Une carte de relance du devis ${d.numero} attend déjà le clic de l’artisan : ne la repropose pas. Rien n'a été préparé.`)
    const enCoursP = ouverteBrute?.statut === 'en_cours' ? `Une relance de ce devis est peut-être déjà en train de partir (ou son journal est à reprendre) : vérifiez avant de confirmer.` : undefined
    // 02/11 (L16, rang 8) : une relance que l'artisan a écartée depuis moins de REFUS_RETENUS_JOURS jours n'est pas reproposée d'elle-même ;
    // redemandée par lui (son ordre, ou le numéro écrit dans son message), elle redevient une carte — jamais faite d'office. Journal illisible : carte.
    const ecartee = await devisEcartes().then((m) => m.get(d.id) ?? null, () => 'illisible')
    const redemandee = ctx.autonome?.() === true || nommeDans(messageArtisan, String(d.numero))
    if (ecartee && ecartee !== 'illisible' && !redemandee) return ko(`L'artisan a écarté cette relance (devis ${d.numero}) le ${fmtDate(ecartee)} : ne la repropose pas. S'il la veut quand même, il te la redemande. Rien n'a été préparé.`)
    const horsAutoEcartee = ecartee === 'illisible' ? 'Les cartes écartées n’ont pas pu être relues : à valider à la main.' : ecartee ? `Vous aviez écarté cette relance le ${fmtDate(ecartee)} : elle attend votre clic.` : undefined
    // 02/11 (audit 032-028, D4) : compte en pause (le lot et le pilote s'arrêtent) : la relance seule ne part pas d'office non plus — une carte.
    const pauseP = ctx.autonome?.() === true ? await compteEnPause().then((v) => v, () => true) : false
    const horsAutoP = enCoursP ?? horsAutoEcartee ?? (pauseP ? `Le ${MOTIF_PAUSE} ; la relance attend votre clic (ou les réglages n’ont pas pu être relus).` : undefined)
    const p = await profil()
    const t = texteRelanceDevis({ client: d.client_nom, numero: String(d.numero), objet: d.objet, totalTtc: d.total_ttc === null ? null : num(d.total_ttc), envoyeLe: d.envoye_le, validiteJours: d.validite_jours, artisan: p.nom, ton: (e.ton as 'cordial' | 'ferme') ?? 'cordial' })
    return { ok: true, ...(horsAutoP ? { horsAuto: horsAutoP } : {}), ...(enCoursP ? { horsPilote: enCoursP } : {}), cible: { numero: String(d.numero), client: d.client_nom, email: to }, entrees: { ...e }, objet: { type: 'devis', id: d.id }, apercu: apercu(`Relancer ${d.client_nom ?? 'le client'} pour le devis ${d.numero}`, { lignes: [{ label: 'À', valeur: to }, { label: 'Devis', valeur: `${d.numero} — ${fmtEuros(d.total_ttc)} TTC` }, { label: 'Ton', valeur: String(e.ton ?? 'cordial') }], message: { a: to, objet: t.objet, texte: t.texte }, irreversible: true }) }
  }

  P.creer_facture = async (e) => {
    const d = await devisDe(String(e.devis_numero))
    if (!d) return ko(`Devis ${e.devis_numero} introuvable.`)
    if (d.statut !== 'accepte') return ko(`Le devis ${d.numero} n'est pas signé (statut : ${d.statut}) : on ne facture qu'un devis accepté. S'il est signé, change d'abord son statut.`)
    if (!txt(d.client_nom)) return ko('Le devis n’a pas de nom de client : c’est une mention obligatoire de la facture. Renseigne-le d’abord.')
    const p = await profil()
    const manquantes = mentionsDe(p.legal)
    if (manquantes.length) return ko(messageMentionsBloquantes(manquantes, 'cette facture'))
    const { data: deja, error } = await session.from('factures').select('id, numero, statut, objet, avoir_de, total_ttc').eq('artisan_id', ctx.uid).eq('devis_id', d.id)
    if (error) throw new Error('factures illisibles')
    const lignes = (deja ?? []) as unknown as { id: string; numero: string | null; statut: string | null; objet: string | null; avoir_de: string | null; total_ttc: number | string }[]
    const annulees = new Set(lignes.map((f) => f.avoir_de).filter(Boolean))
    const vivantes = lignes.filter((f) => !f.avoir_de && !annulees.has(f.id))
    const acompte = e.type === 'acompte' ? num(e.acompte_pct) : 0
    // 0176 — situation de travaux, solde explicite, ou facture « complète » d'un devis déjà facturé par situations (c'est alors le
    // SOLDE) : la carte annonce le montant EXACT que le clic émettra, calculé par le chemin même de la création (simulation : ni
    // numéro, ni écriture). Un refus (avancement qui recule, rien à facturer…) est dit ici, avant toute carte.
    const parSituations = vivantes.some((f) => estSituation(f))
    if (e.type === 'situation' || e.type === 'solde' || (parSituations && e.type !== 'acompte')) {
      const type = e.type === 'situation' ? 'situation' as const : 'solde' as const
      const sim = await (dep.simulerFacture ?? simulerFacture)({ artisanId: ctx.uid, devisId: d.id, type, ...(type === 'situation' ? { avancement: { global: num(e.avancement_pct) } } : {}) })
      if (!sim.ok) return ko(sim.error)
      const det = sim.situation?.detail
      const alertesS = ['Une facture est émise et scellée dès sa création : numéro définitif, plus modifiable (une erreur se corrige par un avoir).']
      if (det) alertesS.push('L’avancement est CUMULÉ depuis le début du chantier : la prochaine situation ne pourra pas descendre sous ce pourcentage.')
      return {
        // Le TTC annoncé part avec la carte (audit argent du 21/10, M5) : au clic, s'il a changé d'un centime, rien n'est émis.
        ok: true, entrees: { ...e, ttc_attendu: sim.total_ttc }, objet: { type: 'devis', id: d.id },
        apercu: apercu(sim.situation ? `Situation de travaux n° ${sim.situation.numero} — devis ${d.numero}` : `Facture de solde — devis ${d.numero}`, {
          lignes: [
            { label: 'Client', valeur: d.client_nom ?? '—' }, { label: 'Devis', valeur: `${d.numero} — ${d.objet ?? 'sans objet'}` },
            ...(det ? [{ label: 'Avancement cumulé', valeur: `${fmtNombre(det.avancement_pct)} % — ${fmtEuros(det.cumul_ht)} HT sur ${fmtEuros(det.marche_ht)} HT` }, { label: 'Déjà facturé HT (déduit)', valeur: fmtEuros(det.deja_facture_ht) }] : []),
            ...(!det && sim.deduites.length ? [{ label: 'Factures déduites', valeur: sim.deduites.join(', ') }] : []),
            { label: 'Montant de cette facture TTC', valeur: fmtEuros(sim.total_ttc) }, { label: 'Échéance', valeur: '30 jours après l’émission' },
          ],
          alertes: alertesS, irreversible: true, lien: lienDe('devis', d.id),
        }),
      }
    }
    const complete = vivantes.find((f) => !/^Acompte/i.test(f.objet ?? ''))
    if (!acompte && complete) return ko(`Ce devis est déjà facturé (${complete.numero}). Pour refaire la facture, il faut d'abord un avoir (écran Factures).`)
    const acomptes = vivantes.filter((f) => /^Acompte/i.test(f.objet ?? ''))
    // C3 (audit du 18/10) : la facture complète d'un devis dont un acompte est facturé est une facture de SOLDE, qui le déduit
    // (lib/factureDepuisDevis.ts) : l'aperçu annonce le reste dû, pas le devis entier.
    const dejaAcompte = acomptes.filter((f) => f.statut === 'emise' || f.statut === 'payee').reduce((s, f) => s + num(f.total_ttc), 0)
    const montant = acompte ? Math.round(num(d.total_ttc) * acompte) / 100 : Math.round((num(d.total_ttc) - (acomptes.length ? dejaAcompte : 0)) * 100) / 100
    const alertes: string[] = ['Une facture est émise et scellée dès sa création : numéro définitif, plus modifiable (une erreur se corrige par un avoir).']
    if (acomptes.length && !acompte) alertes.push(`Un acompte a déjà été facturé (${acomptes.map((f) => f.numero).join(', ')}) : ce sera la facture de SOLDE. Elle reprend les lignes du devis et déduit l'acompte (${fmtEuros(dejaAcompte)}) : le client ne paie que le reste.`)
    if (acompte && acomptes.length) alertes.push(`Un autre acompte existe déjà (${acomptes.map((f) => f.numero).join(', ')}).`)
    return {
      ok: true, entrees: { ...e }, objet: { type: 'devis', id: d.id },
      apercu: apercu(acompte ? `Facture d’acompte ${fmtNombre(acompte)} % — devis ${d.numero}` : acomptes.length ? `Facture de solde — devis ${d.numero}` : `Facture complète — devis ${d.numero}`, {
        lignes: [{ label: 'Client', valeur: d.client_nom ?? '—' }, { label: 'Devis', valeur: `${d.numero} — ${d.objet ?? 'sans objet'}` }, { label: acompte ? 'Montant de l’acompte (environ)' : acomptes.length ? 'Reste à payer TTC (acompte déduit)' : 'Montant TTC', valeur: fmtEuros(montant) }, { label: 'Échéance', valeur: '30 jours après l’émission' }],
        alertes, irreversible: true, lien: lienDe('devis', d.id),
      }),
    }
  }

  P.marquer_facture_payee = async (e) => {
    const f = await factureDe(String(e.numero))
    if (!f) return ko(`Facture ${e.numero} introuvable.`)
    if (f.statut !== 'emise' || f.avoir_de) return ko(`La facture ${f.numero} n'est pas « émise » (statut : ${f.avoir_de ? 'avoir' : f.statut}) : rien à encaisser.`)
    return { ok: true, entrees: { ...e }, objet: { type: 'facture', id: f.id }, apercu: apercu(`Marquer la facture ${f.numero} comme payée`, { lignes: [{ label: 'Facture', valeur: String(f.numero) }, { label: 'Client', valeur: f.client_nom ?? '—' }, { label: 'Montant TTC', valeur: fmtEuros(f.total_ttc) }], alertes: ['Une facture payée ne revient pas en arrière. Confirmez seulement si le règlement est bien encaissé.'], irreversible: true, lien: lienDe('facture', f.id) }) }
  }

  P.relancer_facture = async (e) => {
    const f = await factureDe(String(e.numero))
    if (!f) return ko(`Facture ${e.numero} introuvable.`)
    if (f.statut !== 'emise' || f.avoir_de) return ko(`La facture ${f.numero} n'est pas un impayé (statut : ${f.avoir_de ? 'avoir' : f.statut}).`)
    const retard = joursDepuis(f.date_echeance)
    if (retard === null || retard <= 0) return ko(`La facture ${f.numero} n'est pas encore échue${f.date_echeance ? ` (échéance le ${fmtDate(f.date_echeance)})` : ''} : pas de relance.`)
    const to = txt(f.client_email)
    if (!to || !EMAIL.test(to)) return ko(`La facture ${f.numero} n'a pas d'e-mail client : pas de relance par e-mail possible.`)
    const dernier = await ctx.magasin.dernierEnvoi(ctx.uid, 'relancer_facture', f.id).catch(() => null)
    if (dernier && Date.now() - Date.parse(dernier) < RELANCE_DELAI_JOURS * 86_400_000) return ko(`Cette facture a déjà été relancée le ${fmtDate(jourParis(new Date(dernier)))} : on ne renvoie pas de message avant ${RELANCE_DELAI_JOURS} jours.`)
    const regP = await registre({ type: 'facture', id: f.id })
    if (regP) return ko(regP)
    const p = await profil()
    const t = texteRelanceFacture({ client: f.client_nom, numero: String(f.numero), totalTtc: f.total_ttc === null ? null : num(f.total_ttc), echeance: f.date_echeance, joursRetard: retard, artisan: p.nom, ton: (e.ton as 'cordial' | 'ferme') ?? 'cordial' })
    return { ok: true, cible: { numero: String(f.numero), client: f.client_nom }, entrees: { ...e }, objet: { type: 'facture', id: f.id }, apercu: apercu(`Relancer ${f.client_nom ?? 'le client'} — facture ${f.numero}`, { lignes: [{ label: 'À', valeur: to }, { label: 'Facture', valeur: `${f.numero} — ${fmtEuros(f.total_ttc)} TTC` }, { label: 'Retard', valeur: `${retard} jour${retard > 1 ? 's' : ''}` }, { label: 'Ton', valeur: String(e.ton ?? 'cordial') }], message: { a: to, objet: t.objet, texte: t.texte }, irreversible: true, lien: lienDe('facture', f.id) }) }
  }

  P.augmenter_tarifs = async (e) => {
    const pct = e.pourcentage as number
    let q = session.from('prix_artisan').select('id, designation, prix_ht, date_prix, fournisseur').eq('artisan_id', ctx.uid).eq('actif', true)
    const mot = txt(e.recherche)
    if (mot) q = q.ilike('designation', `%${mot.replace(/[%_]/g, '').replace(/[\s-]+/g, '%')}%`)
    const fo = txt(e.fournisseur)
    if (fo) q = q.ilike('fournisseur', `%${fo.replace(/[%_]/g, '')}%`)
    const { data, error } = await q.order('designation').limit(LOT_TARIFS_MAX + 1)
    if (error) throw new Error('tarifs illisibles')
    const lignes = (data ?? []) as unknown as { id: string; designation: string; prix_ht: number | string; date_prix: string | null }[]
    if (!lignes.length) return ko(`Aucun tarif ne correspond${mot ? ` à « ${mot} »` : ''}.`)
    if (lignes.length > LOT_TARIFS_MAX) return ko(`Plus de ${LOT_TARIFS_MAX} tarifs correspondent : précise un mot de la désignation ou un fournisseur.`)
    const lot = lignes.map((l) => ({ id: l.id, avant: num(l.prix_ht), apres: Math.round(num(l.prix_ht) * (1 + pct / 100) * 100) / 100, date_avant: l.date_prix })).filter((l) => l.apres !== l.avant)
    if (!lot.length) return ko('Ce pourcentage ne change aucun prix (arrondis).')
    const nomDe = new Map(lignes.map((l) => [l.id, l.designation]))
    return {
      ok: true, entrees: { pourcentage: pct, recherche: mot, fournisseur: fo, lot }, objet: null,
      apercu: apercu(`${pct >= 0 ? 'Augmenter' : 'Baisser'} ${lot.length} tarif${lot.length > 1 ? 's' : ''} de ${fmtNombre(Math.abs(pct))} %`, {
        lignes: [{ label: 'Tarifs concernés', valeur: `${lot.length}${mot ? ` (désignation contenant « ${mot} »)` : ' (toute la bibliothèque)'}` }, { label: 'Variation', valeur: `${pct >= 0 ? '+' : '−'}${fmtNombre(Math.abs(pct))} %` }],
        avant_apres: lot.slice(0, 6).map((l) => ({ libelle: (nomDe.get(l.id) ?? '').slice(0, 60), avant: fmtEuros(l.avant), apres: fmtEuros(l.apres) })),
        alertes: ['Les devis déjà faits ne changent pas. Annulable après coup.', ...(lot.length > 6 ? [`Et ${lot.length - 6} autre(s) ligne(s) calculée(s) de la même façon.`] : [])],
        lien: lienDe('tarif', null),
      }),
    }
  }

  P.supprimer_tarif = async (e) => {
    const t = await tarifDe(String(e.tarif_id))
    if (!t) return ko('Tarif introuvable dans la bibliothèque de l’artisan.')
    return { ok: true, entrees: { ...e }, objet: { type: 'tarif', id: t.id }, apercu: apercu(`Supprimer le tarif « ${t.designation} »`, { lignes: [{ label: 'Tarif', valeur: `${t.designation} — ${fmtEuros(t.prix_ht)} HT` }], alertes: ['Annulable après coup (le tarif est remis tel quel).'], lien: lienDe('tarif', null) }) }
  }

  P.repondre_client = async (e) => {
    const lead = await leadDe(String(e.conversation_id))
    if (!lead) return ko('Conversation introuvable.')
    if (lead.statut === 'perdu') return ko('Cette demande est marquée « perdue » : rouvre-la d’abord si l’artisan veut répondre.')
    const to = lead.contact && EMAIL.test(lead.contact.trim()) ? lead.contact.trim() : null
    return { ok: true, entrees: { ...e }, objet: { type: 'conversation', id: lead.id }, apercu: apercu(`Répondre à ${txt(lead.nom_prospect) ?? 'ce client'}`, { lignes: [{ label: 'Canal', valeur: to ? `e-mail (${to}) et fil de la conversation` : 'fil de la conversation (ou canal de la demande)' }], message: { a: to ?? 'la conversation', objet: '', texte: String(e.texte) }, irreversible: true, lien: lienDe('conversation', lead.id) }) }
  }

  P.valider_reponse_proposee = async (e) => {
    const lead = await leadDe(String(e.conversation_id))
    if (!lead) return ko('Conversation introuvable.')
    const prop = await propositionDe(lead.id)
    if (!prop) return ko('Aucune réponse préparée n’attend dans cette conversation.')
    const to = lead.contact && EMAIL.test(lead.contact.trim()) ? lead.contact.trim() : null
    return { ok: true, entrees: { ...e, message_id: prop.id }, objet: { type: 'conversation', id: lead.id }, apercu: apercu(`Envoyer la réponse préparée à ${txt(lead.nom_prospect) ?? 'ce client'}`, { lignes: [{ label: 'Canal', valeur: to ? `e-mail (${to}) et fil de la conversation` : 'fil de la conversation (ou canal de la demande)' }], message: { a: to ?? 'la conversation', objet: '', texte: prop.contenu }, irreversible: true, lien: lienDe('conversation', lead.id) }) }
  }

  // ═══════════════ 29/10 — l'assistant qui FAIT à la place de l'artisan (décision de Benj : « il doit tout faire à la place des artisans ») ═══════════════

  // ── Facture SANS devis : le chemin même de l'écran Factures (creerFacture avec un corps, comme POST /api/factures sans devis_id) :
  //    mentions bloquantes, nom du client obligatoire, numérotation continue, émission d'un seul tenant (lib/factureEmission.ts). La
  //    proposition SIMULE la pièce (ni numéro, ni écriture) pour annoncer le montant exact ; l'émission refuse si ce montant a bougé.
  async function corpsFactureLibre(e: EntreeAction): Promise<{ ok: true; corps: Obj; client: string; nb: number } | { ok: false; erreur: string }> {
    let client = txt(e.client_nom)
    let email = txt(e.client_email)
    if (txt(e.conversation_id)) {
      const lead = await leadDe(String(e.conversation_id))
      if (!lead) return ko('Conversation introuvable.')
      client = client ?? txt(lead.nom_prospect)
      // L'e-mail du dossier est repris ici, côté serveur : le modèle ne le voit jamais.
      if (!email && lead.contact && EMAIL.test(lead.contact.trim())) email = lead.contact.trim().toLowerCase()
    }
    if (!client) return ko('Le nom du client manque : c’est une mention obligatoire de la facture. Demande-le à l’artisan.')
    const lignes = (e.lignes as LigneEntree[]) ?? []
    const tarifs = await tarifsParIds(lignes.map((l) => l.tarif_id).filter((x): x is string => !!x))
    // 032-007 : les lignes sans tarif d'une facture libre sont au taux `tva_taux` (défaut 10 %) : un prix TTC n'y vaut que sa forme HT à ce taux.
    const r = resoudreLignes(lignes, tarifs, prixEcrits(ctx.textesArtisan ?? [], tauxDe(e.tva_taux)))
    if (r.introuvables.length) return ko(`Tarif introuvable dans la bibliothèque de l'artisan : ${r.introuvables.slice(0, 3).join(' ; ')}. Relis-les avec lire_tarifs.`)
    if (r.aChiffrer.length) return ko(`Ligne(s) sans prix : ${r.aChiffrer.slice(0, 4).join(' ; ')}. Une facture ne s’émet pas avec une ligne à 0 € : demande le prix à l’artisan (ou utilise un tarif de lire_tarifs). Rien n’a été émis.`)
    const tva = typeof e.tva_taux === 'number' ? e.tva_taux : null
    const lignesF = r.lignes.map((l, i) => ({ designation: l.designation, quantite: l.quantite, unite: l.unite, prix_unitaire_ht: l.prix_unitaire_ht, tva_taux: lignes[i]?.tarif_id ? l.tva_taux : tva ?? l.tva_taux }))
    return { ok: true, client, nb: lignesF.length, corps: { objet: e.objet, client_nom: client, client_email: email, client_adresse: txt(e.client_adresse), conditions: txt(e.conditions), lignes: lignesF } }
  }
  P.creer_facture_libre = async (e) => {
    const c = await corpsFactureLibre(e)
    if (!c.ok) return ko(c.erreur)
    const sim = await (dep.simulerFacture ?? simulerFacture)({ artisanId: ctx.uid, corps: c.corps })
    if (!sim.ok) return ko(sim.error)
    return {
      // Le TTC annoncé part avec les entrées (audit argent du 21/10, M5) : à l'émission, s'il a changé d'un centime, rien n'est émis.
      ok: true, entrees: { corps: c.corps, ttc_attendu: sim.total_ttc }, objet: null,
      apercu: apercu(`Émettre une facture pour ${c.client}`, {
        lignes: [{ label: 'Client', valeur: c.client }, { label: 'Objet', valeur: String(e.objet ?? '') }, { label: 'Lignes', valeur: String(c.nb) }, { label: 'Total HT', valeur: fmtEuros(sim.total_ht) }, { label: 'Montant TTC', valeur: fmtEuros(sim.total_ttc) }, { label: 'Échéance', valeur: '30 jours après l’émission' }],
        alertes: ['Une facture est émise et scellée dès sa création : numéro définitif, plus modifiable (une erreur se corrige par un avoir).'],
        irreversible: true, lien: lienDe('facture', null),
      }),
    }
  }
  R.creer_facture_libre = async (e) => {
    const corps = e.corps && typeof e.corps === 'object' && !Array.isArray(e.corps) ? (e.corps as Obj) : null
    if (!corps) return ko('Cette facture est à reproposer (contenu manquant) : rien n’a été émis.')
    const r = await (dep.creerFacture ?? creerFacture)({ artisanId: ctx.uid, corps, ...(typeof e.ttc_attendu === 'number' && Number.isFinite(e.ttc_attendu) ? { ttcAttendu: e.ttc_attendu } : {}) })
    if (!r.ok) return ko(r.error)
    return {
      ok: true, resume: `facture ${r.numero} émise (sans devis)`, objet: { type: 'facture', id: r.id },
      donnees: { numero_facture: r.numero, ...(typeof e.ttc_attendu === 'number' ? { total_ttc: e.ttc_attendu } : {}), a_savoir: 'Facture émise et scellée (numéro définitif). Elle n’est PAS envoyée au client : envoyer_facture la fait partir.' },
      apercu: { irreversible: true, lien: lienDe('facture', r.id) },
    }
  }

  // ── Recherche chez les fournisseurs : la route même de l'Inventaire (drapeau inventaireRecherche, capacité inventaire.recherche_ia,
  //    plafonds 20 / heure, 30 / jour, 200 / mois, crédit du niveau, cache mutualisé), appelée comme une fonction, avec la session.
  //    Les prix sont ceux VUS sur les pages (montant tel quel, HT/TTC tel qu'écrit, page et date) ; les textes des pages sont du texte
  //    de TIERS (emballés comme un message de client : ils ne commandent rien et leurs nombres ne sont pas des sources).
  const RESULTATS_RECHERCHE_MAX = 12
  const vuLe = (iso: unknown): string | null => {
    const d = new Date(String(iso ?? ''))
    return Number.isNaN(d.getTime()) ? null : `${fmtDate(jourParis(d))} à ${d.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })}`
  }
  const enTaxe = (h: unknown) => (h === 'HT' || h === 'TTC' ? String(h) : 'HT ou TTC non précisé sur la page')
  R.rechercher_fournisseurs = async (e) => {
    const g = dep.rechercher ?? (await import('@/app/api/inventaire/recherche/route')).POST
    const rep = await route(g, '/api/inventaire/recherche', { corps: { requete: e.requete, ...(typeof e.quantite === 'number' && e.quantite > 0 ? { quantite: e.quantite } : {}) } })
    if (rep.status !== 200 || rep.json?.ok !== true) return ko(objetErreur(rep, 'La recherche chez les fournisseurs n’a pas pu se faire.'))
    const resultats = (Array.isArray(rep.json.resultats) ? rep.json.resultats : []).slice(0, RESULTATS_RECHERCHE_MAX) as ResultatRecherche[]
    const nonVus = (Array.isArray(rep.json.nonVus) ? rep.json.nonVus : []) as { fournisseur?: unknown; raison?: unknown }[]
    return {
      ok: true, resume: `recherche chez les fournisseurs : ${resultats.length} résultat(s), ${nonVus.length} fournisseur(s) sans résultat`,
      // Les résultats SCELLÉS par le moteur sont gardés sur la fiche du journal : retenir_resultat les relit tels quels (le sceau prouve à
      // /recherche/retenir qu'ils sortent du moteur, pour ce compte ; la moindre retouche est refusée).
      garder: { resultats_scelles: resultats },
      donnees: {
        requete: e.requete, nb_resultats: resultats.length,
        resultats: resultats.map((x, i) => ({
          resultat: i + 1, fournisseur: x.fournisseur, produit_vu: encadrerClient(x.designation_vue, 160), reference: encadrerClient(x.reference, 60),
          prix_vu: x.prix_vu, prix_affiche_en: enTaxe(x.ht_ou_ttc), unite: x.unite, conditionnement: encadrerClient(x.conditionnement, 60),
          disponibilite_vue: encadrerClient(x.disponibilite_vue, 80), source: `page de ${x.fournisseur}, vue le ${vuLe(x.vu_le) ?? 'date inconnue'}`,
        })),
        non_vus: nonVus.map((n) => ({ fournisseur: txt(n.fournisseur) ?? 'fournisseur', raison: encadrerClient(txt(n.raison), 160) })),
        credits_de_recherche_utilises: num(rep.json.credits),
        ...(rep.json.panne ? { panne_partielle: true } : {}),
        a_savoir: "Prix VUS sur les pages des fournisseurs, tels qu'affichés : cite chacun avec son fournisseur et sa date (« vu chez … le … »), sans convertir HT/TTC ni en déduire un autre prix. Aucun prix n'est inventé : un fournisseur « non vu » se dit tel quel. Pour garder un résultat dans l'inventaire ou la liste d'achat : retenir_resultat avec son numéro.",
      },
      apercu: {
        lignes: [{ label: 'Recherche', valeur: String(e.requete ?? '') }, ...resultats.slice(0, 6).map((x) => ({ label: x.fournisseur, valeur: `${fmtEuros(x.prix_vu)} ${x.ht_ou_ttc === 'inconnu' ? '(HT/TTC non précisé)' : x.ht_ou_ttc} — ${String(x.designation_vue ?? '').slice(0, 80)}` }))],
        alertes: nonVus.length ? [`Sans résultat chez : ${nonVus.map((n) => txt(n.fournisseur) ?? '?').slice(0, 6).join(', ')}.`] : [],
        lien: lienDe('article', null),
      },
    }
  }
  R.retenir_resultat = async (e) => {
    const fiche = ctx.magasin.derniere ? await ctx.magasin.derniere(ctx.uid, ctx.conversationId, 'rechercher_fournisseurs') : null
    const liste = Array.isArray(fiche?.entrees?.resultats_scelles) ? (fiche!.entrees.resultats_scelles as Obj[]) : []
    if (!liste.length) return ko('Aucune recherche chez les fournisseurs avec résultat dans cette conversation : lance d’abord rechercher_fournisseurs.')
    const res = liste[num(e.resultat) - 1]
    if (!res) return ko(`Pas de résultat n° ${e.resultat} : la dernière recherche en a ${liste.length}.`)
    const vers = e.vers === 'liste_achat' ? 'liste_achat' : 'inventaire'
    let materiauId: string | null = null
    let nomArticle: string | null = null
    if (txt(e.article)) {
      const a = await articleDe(String(e.article))
      if (!a.ok) return ko(a.erreur)
      materiauId = a.item.id; nomArticle = a.item.nom
    }
    // Une fiche CRÉÉE par ce geste se retire à l'annulation ; une fiche qui existait (même nom) n'est jamais touchée.
    let creeIci = false
    if (vers === 'inventaire' && !materiauId) {
      const nom = String(res.designation_vue ?? '').trim().slice(0, 200)
      const { data: memes, error: eMemes } = await session.from('materiaux').select('id').eq('artisan_id', ctx.uid).eq('nom', nom).limit(1)
      if (eMemes) throw new Error('inventaire illisible')
      creeIci = (memes ?? []).length === 0
    }
    const g = dep.retenir ?? (await import('@/app/api/inventaire/recherche/retenir/route')).POST
    const rep = await route(g, '/api/inventaire/recherche/retenir', { corps: { action: vers, resultat: res, ...(materiauId ? { materiau_id: materiauId } : {}), ...(typeof e.quantite === 'number' ? { quantite: e.quantite } : {}) } })
    if (rep.status !== 200 || rep.json?.ok !== true) return ko(objetErreur(rep, 'Le résultat n’a pas pu être gardé.'))
    const prix = `${fmtEuros(res.prix_vu as number)} ${res.ht_ou_ttc === 'HT' || res.ht_ou_ttc === 'TTC' ? res.ht_ou_ttc : '(HT/TTC non précisé)'}`
    const fournisseur = String(res.fournisseur ?? 'le fournisseur')
    if (vers === 'liste_achat') {
      const ligneId = txt(rep.json.ligne_id), listeId = txt(rep.json.liste_id)
      return {
        ok: true, resume: `résultat n° ${e.resultat} (${fournisseur}, ${prix}) ajouté à la liste d’achat`, objet: null,
        annulation: ligneId && listeId ? { outil: 'retirer_lignes_achat', entrees: { liste_id: listeId, lignes: [ligneId], liste_creee: false }, libelle: 'Retirer cette ligne de la liste d’achat' } : null,
        donnees: { fournisseur, prix_vu: res.prix_vu, prix_affiche_en: enTaxe(res.ht_ou_ttc), a_savoir: 'Ajouté à la liste d’achat ouverte (rien n’est commandé). Elle s’exporte en Excel : exporter_tableau, quoi=liste_achat.' },
        apercu: { lignes: [{ label: 'Fournisseur', valeur: fournisseur }, { label: 'Prix vu', valeur: prix }], lien: lienDe('article', null) },
      }
    }
    const matId = txt(rep.json.materiau_id)
    return {
      ok: true, resume: `prix vu chez ${fournisseur} (${prix}) gardé dans l’inventaire${nomArticle ? ` sur « ${nomArticle} »` : creeIci ? ' (fiche créée)' : ''}`, objet: matId ? { type: 'article', id: matId } : null,
      annulation: creeIci && matId ? { outil: 'supprimer_article', entrees: { id: matId }, libelle: 'Retirer l’article créé' } : null,
      donnees: { fournisseur, prix_vu: res.prix_vu, prix_affiche_en: enTaxe(res.ht_ou_ttc), fiche_creee: creeIci, a_savoir: 'Le prix est gardé comme une OBSERVATION (page et date), jamais converti : le dernier prix noté sur la fiche ne change pas.' },
      apercu: { lignes: [{ label: 'Fournisseur', valeur: fournisseur }, { label: 'Prix vu', valeur: prix }, ...(nomArticle ? [{ label: 'Article', valeur: nomArticle }] : [])], lien: lienDe('article', matId) },
    }
  }

  // ── Liste d'achat « à racheter » (table listes_achat, 0040 : écrite sous la RLS de l'artisan, ses lignes via leur liste). Les alertes
  //    suivent la règle de l'écran Inventaire (GET /api/inventaire) : seuil > 0 et stock total ≤ seuil.
  type ArticleAlerte = { id: string; nom: string; unite: string | null; seuil_alerte: number | string | null; fournisseur_prefere: string | null; prix_dernier_ht: number | string | null; stock: { lieu: string; quantite: number | string }[] | null }
  const totalStock = (m: { stock: { quantite: number | string }[] | null }) => (m.stock ?? []).reduce((t, l) => t + num(l.quantite), 0)
  const norme = (x: string) => sansAccent(String(x ?? '')).toLowerCase().replace(/\s+/g, ' ').trim()
  R.preparer_liste_achat = async (e) => {
    const { data, error } = await session.from('materiaux').select('id, nom, unite, seuil_alerte, fournisseur_prefere, prix_dernier_ht, stock(lieu, quantite)').eq('artisan_id', ctx.uid).limit(5000)
    if (error) throw new Error('inventaire illisible')
    let alertes = ((data ?? []) as unknown as ArticleAlerte[]).filter((m) => num(m.seuil_alerte) > 0 && totalStock(m) <= num(m.seuil_alerte))
    const voulus = ((e.articles as string[]) ?? []).map(norme).filter(Boolean)
    if (voulus.length) alertes = alertes.filter((m) => voulus.some((v) => norme(m.nom).includes(v)))
    const fo = txt(e.fournisseur)
    if (fo) alertes = alertes.filter((m) => norme(m.fournisseur_prefere ?? '').includes(norme(fo)))
    if (!alertes.length) return ko(`${voulus.length || fo ? 'Aucun de ces articles n’est' : 'Aucun article n’est'} sous son seuil d’alerte : rien à racheter. (Un article sans seuil d’alerte ne déclenche jamais d’alerte : modifier_article en pose un.)`)
    let listeId: string
    let nomListe: string
    let creee = false
    const { data: ouvertes, error: eListe } = await session.from('listes_achat').select('id, nom').eq('artisan_id', ctx.uid).eq('statut', 'ouverte').order('cree_le', { ascending: false }).limit(1)
    if (eListe) throw new Error('liste d’achat illisible')
    const ouverte = ((ouvertes ?? []) as unknown as { id: string; nom: string | null }[])[0]
    if (ouverte) { listeId = ouverte.id; nomListe = ouverte.nom ?? 'Liste d’achat' } else {
      nomListe = `À racheter — ${fmtDate(aujourdhui())}`
      const { data: neuve, error: eNeuve } = await session.from('listes_achat').insert({ artisan_id: ctx.uid, nom: nomListe, statut: 'ouverte' }).select('id').single()
      if (eNeuve || !neuve) return ko('La liste d’achat n’a pas pu être créée.')
      listeId = String((neuve as { id: string }).id); creee = true
    }
    // Les lignes d'une liste se lisent et s'écrivent par leur liste, qui vient d'être relue sur le compte (RLS « lignes achat propres »).
    const { data: deja, error: eDeja } = await session.from('lignes_achat').select('materiau_id').eq('liste_id', listeId).eq('achete', false)
    if (eDeja) throw new Error('liste d’achat illisible')
    const dejaIds = new Set(((deja ?? []) as { materiau_id: string | null }[]).map((l) => l.materiau_id).filter(Boolean))
    const nouvelles = alertes.filter((m) => !dejaIds.has(m.id))
    if (!nouvelles.length) return ko(`Ces articles sont déjà tous sur la liste d’achat ouverte (« ${nomListe} ») : rien d’ajouté.`)
    const aRacheter = (m: ArticleAlerte) => Math.max(1, Math.round((num(m.seuil_alerte) - totalStock(m)) * 100) / 100)
    const { data: inserees, error: eIns } = await session.from('lignes_achat').insert(nouvelles.map((m) => ({
      liste_id: listeId, materiau_id: m.id, quantite: aRacheter(m), achete: false, prix_cible_ht: m.prix_dernier_ht === null || m.prix_dernier_ht === undefined ? null : num(m.prix_dernier_ht), fournisseur: txt(m.fournisseur_prefere),
    }))).select('id')
    if (eIns) {
      if (creee) await session.from('listes_achat').delete().eq('artisan_id', ctx.uid).eq('id', listeId)
      return ko('La liste d’achat n’a pas pu être écrite : rien n’a été ajouté.')
    }
    const ids = ((inserees ?? []) as { id: string }[]).map((x) => x.id)
    return {
      ok: true, resume: `liste d’achat : ${nouvelles.length} article(s) à racheter ajouté(s)`, objet: null,
      annulation: { outil: 'retirer_lignes_achat', entrees: { liste_id: listeId, lignes: ids, liste_creee: creee }, libelle: `Retirer ces ${nouvelles.length} ligne(s) de la liste d’achat` },
      donnees: {
        liste: nomListe, liste_creee: creee, lignes_ajoutees: nouvelles.length, deja_sur_la_liste: alertes.length - nouvelles.length,
        articles: nouvelles.map((m) => ({ article: m.nom, a_racheter: aRacheter(m), unite: m.unite, reste_en_stock: totalStock(m), seuil_alerte: num(m.seuil_alerte), fournisseur_note: txt(m.fournisseur_prefere), dernier_prix_ht_note: m.prix_dernier_ht === null ? null : num(m.prix_dernier_ht) })),
        a_savoir: "Rien n'est commandé : c'est la liste « à racheter ». Quantité = ce qui manque pour revenir au seuil d'alerte (1 au moins), calculée par Presti. Fournisseur et prix sont ceux NOTÉS sur la fiche, pas des prix actuels (rechercher_fournisseurs pour en voir). La liste s'exporte en Excel (exporter_tableau, quoi=liste_achat) ; aucun écran ne l'affiche encore.",
      },
      apercu: { lignes: [{ label: 'Liste', valeur: nomListe }, ...nouvelles.slice(0, 8).map((m) => ({ label: m.nom, valeur: `${fmtNombre(aRacheter(m))} ${m.unite ?? ''}`.trim() }))], lien: lienDe('article', null) },
    }
  }
  INV.retirer_lignes_achat = async (e) => {
    const listeId = String(e.liste_id ?? '')
    const { data: l, error } = await session.from('listes_achat').select('id').eq('artisan_id', ctx.uid).eq('id', listeId).maybeSingle()
    if (error) throw new Error('liste d’achat illisible')
    if (!l) return ko('La liste d’achat n’existe plus.')
    const ids = (Array.isArray(e.lignes) ? e.lignes : []).map(String).filter((x) => UUID.test(x))
    if (ids.length) {
      const { error: eSup } = await session.from('lignes_achat').delete().eq('liste_id', listeId).in('id', ids)
      if (eSup) return ko('Les lignes n’ont pas pu être retirées.')
    }
    // Une liste créée par l'assistant et redevenue vide disparaît ; une liste où d'autres lignes ont été ajoutées entre-temps reste.
    if (e.liste_creee === true) {
      const { data: restes } = await session.from('lignes_achat').select('id').eq('liste_id', listeId).limit(1)
      if (!(restes ?? []).length) await session.from('listes_achat').delete().eq('artisan_id', ctx.uid).eq('id', listeId)
    }
    return { ok: true, resume: `${ids.length} ligne(s) retirée(s) de la liste d’achat` }
  }

  // ── Supprimer un article : la route de l'écran Inventaire (DELETE /api/inventaire). Ne se défait pas (historique supprimé avec la fiche).
  P.supprimer_article = async (e) => {
    const a = await articleDe(String(e.article))
    if (!a.ok) return ko(a.erreur)
    return {
      ok: true, entrees: { id: a.item.id, nom: a.item.nom }, objet: { type: 'article', id: a.item.id },
      apercu: apercu(`Supprimer l’article « ${a.item.nom} »`, {
        lignes: [{ label: 'Article', valeur: a.item.nom }, { label: 'En stock', valeur: `${fmtNombre(totalStock(a.item))} ${a.item.unite ?? ''}`.trim() }],
        alertes: ['La fiche, son stock et son historique de mouvements sont supprimés : cela ne se défait pas.'], irreversible: true, lien: lienDe('article', null),
      }),
    }
  }
  R.supprimer_article = async (e) => {
    const id = String(e.id ?? '')
    if (!UUID.test(id)) return ko('Cette suppression est à reproposer : rien n’a été supprimé.')
    const { data, error } = await session.from('materiaux').select('id, nom').eq('artisan_id', ctx.uid).eq('id', id).maybeSingle()
    if (error) throw new Error('inventaire illisible')
    if (!data) return ko('Article introuvable (déjà supprimé ?).')
    const rep = await route(inventaireSupprimer, `/api/inventaire?id=${encodeURIComponent(id)}`, { methode: 'DELETE' })
    return rep.status === 200 ? { ok: true, resume: `article « ${String((data as { nom: string }).nom)} » supprimé de l’inventaire` } : ko(objetErreur(rep, 'Suppression impossible.'))
  }

  // ── Exporter un tableau : un vrai classeur .xlsx (lib/comptaXlsx.ts, le même écrivain que l'export de Mes chiffres : textes inertes,
  //    jamais de formule venue des données). Lu sous la session, filtré sur le compte ; rendu à l'ÉCRAN seulement (bouton Télécharger),
  //    jamais au modèle ni au journal des actions.
  const EXPORT_LIGNES_MAX = 5000
  const EXPORT_OCTETS_MAX = 4_000_000
  const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const cT = (v: unknown): Cellule => (txt(v) ? { t: 'texte', v: String(v).trim() } : null)
  const cE = (v: unknown): Cellule => (v === null || v === undefined || v === '' ? null : { t: 'euros', v: Math.round(num(v) * 100) })
  const cN = (v: unknown): Cellule => (v === null || v === undefined || v === '' ? null : { t: 'nombre', v: Math.round(num(v) * 100) / 100 })
  const cD = (v: unknown): Cellule => { const d = typeof v === 'string' ? v.slice(0, 10) : ''; return /^\d{4}-\d{2}-\d{2}$/.test(d) ? { t: 'date', v: d } : null }
  const enTete = (cols: string[]): Cellule[] => cols.map((c) => ({ t: 'texte', v: c }))
  /** La ligne TOTAL : une SOMME (résultat déjà calculé) par colonne de montants. */
  const ligneTotal = (nbCols: number, colonnes: number[], lignes: Cellule[][]): Cellule[] => {
    const out: Cellule[] = Array.from({ length: nbCols }, () => null)
    out[0] = { t: 'texte', v: 'TOTAL', gras: true }
    for (const c of colonnes) out[c] = { t: 'somme', de: 2, a: lignes.length + 1, v: lignes.reduce((t, l) => t + (l[c]?.t === 'euros' ? (l[c] as { v: number }).v : 0), 0), euros: true }
    return out
  }
  const STATUT_DEVIS: Record<string, string> = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Signé', refuse: 'Refusé', expire: 'Expiré' }
  const STATUT_FACTURE: Record<string, string> = { brouillon: 'Brouillon', emise: 'Émise', payee: 'Payée', annulee: 'Annulée' }
  R.exporter_tableau = async (e) => {
    const quoi = String(e.quoi)
    let feuille: Feuille
    let titre: string
    let n = 0
    if (quoi === 'devis' || quoi === 'factures') {
      let q = quoi === 'devis'
        ? session.from('devis').select('numero, date_emission, client_nom, objet, statut, total_ht, total_tva, total_ttc').eq('artisan_id', ctx.uid)
        : session.from('factures').select('numero, date_emission, date_echeance, client_nom, objet, statut, avoir_de, total_ht, total_tva, total_ttc').eq('artisan_id', ctx.uid)
      if (e.depuis) q = q.gte('date_emission', String(e.depuis))
      if (e.jusqu_a) q = q.lte('date_emission', String(e.jusqu_a))
      const { data, error } = await q.order('date_emission', { ascending: false }).limit(EXPORT_LIGNES_MAX)
      if (error) throw new Error(`${quoi} illisibles`)
      const rows = (data ?? []) as unknown as Obj[]
      n = rows.length
      const corps: Cellule[][] = quoi === 'devis'
        ? rows.map((r) => [cT(r.numero), cD(r.date_emission), cT(r.client_nom), cT(r.objet), cT(STATUT_DEVIS[String(r.statut)] ?? r.statut), cE(r.total_ht), cE(r.total_tva), cE(r.total_ttc)])
        : rows.map((r) => [cT(r.numero), cD(r.date_emission), cD(r.date_echeance), cT(r.client_nom), cT(r.objet), cT(r.avoir_de ? 'Avoir' : STATUT_FACTURE[String(r.statut)] ?? r.statut), cE(r.total_ht), cE(r.total_tva), cE(r.total_ttc)])
      const cols = quoi === 'devis' ? ['Numéro', 'Date', 'Client', 'Objet', 'Statut', 'Total HT', 'TVA', 'Total TTC'] : ['Numéro', 'Émise le', 'Échéance', 'Client', 'Objet', 'Statut', 'Total HT', 'TVA', 'Total TTC']
      const montants = quoi === 'devis' ? [5, 6, 7] : [6, 7, 8]
      titre = quoi === 'devis' ? 'Devis' : 'Factures'
      feuille = { nom: titre, largeurs: quoi === 'devis' ? [16, 12, 26, 40, 12, 14, 12, 14] : [16, 12, 12, 26, 40, 12, 14, 12, 14], lignes: [enTete(cols), ...corps, ...(corps.length ? [ligneTotal(cols.length, montants, corps)] : [])], filtre: true }
    } else if (quoi === 'stock') {
      const { data, error } = await session.from('materiaux').select('nom, reference, categorie, unite, seuil_alerte, fournisseur_prefere, prix_dernier_ht, stock(lieu, quantite)').eq('artisan_id', ctx.uid).order('nom').limit(EXPORT_LIGNES_MAX)
      if (error) throw new Error('inventaire illisible')
      const rows = (data ?? []) as unknown as (Obj & { stock: { lieu: string; quantite: number | string }[] | null })[]
      n = rows.length
      titre = 'Stock'
      feuille = {
        nom: titre, largeurs: [34, 16, 18, 8, 12, 12, 12, 24, 14], filtre: true,
        lignes: [enTete(['Article', 'Référence', 'Catégorie', 'Unité', 'Quantité', 'Seuil d’alerte', 'À racheter', 'Fournisseur habituel', 'Dernier prix HT noté']),
          ...rows.map((r) => { const t = totalStock(r); const seuil = num(r.seuil_alerte); return [cT(r.nom), cT(r.reference), cT(r.categorie), cT(r.unite), cN(t), cN(seuil), cT(seuil > 0 && t <= seuil ? 'Oui' : 'Non'), cT(r.fournisseur_prefere), cE(r.prix_dernier_ht)] })],
      }
    } else if (quoi === 'tarifs') {
      const { data, error } = await session.from('prix_artisan').select('designation, unite, prix_ht, tva_taux, fournisseur, reference, date_prix').eq('artisan_id', ctx.uid).eq('actif', true).order('designation').limit(EXPORT_LIGNES_MAX)
      if (error) throw new Error('tarifs illisibles')
      const rows = (data ?? []) as unknown as Obj[]
      n = rows.length
      titre = 'Tarifs'
      feuille = { nom: titre, largeurs: [40, 8, 14, 8, 22, 16, 12], filtre: true, lignes: [enTete(['Désignation', 'Unité', 'Prix HT', 'TVA %', 'Fournisseur', 'Référence', 'Prix du']), ...rows.map((r) => [cT(r.designation), cT(r.unite), cE(r.prix_ht), cN(r.tva_taux), cT(r.fournisseur), cT(r.reference), cD(r.date_prix)])] }
    } else {
      const { data: ouvertes, error: eL } = await session.from('listes_achat').select('id, nom').eq('artisan_id', ctx.uid).eq('statut', 'ouverte').order('cree_le', { ascending: false }).limit(1)
      if (eL) throw new Error('liste d’achat illisible')
      const liste = ((ouvertes ?? []) as unknown as { id: string; nom: string | null }[])[0]
      if (!liste) return ko('Aucune liste d’achat ouverte : preparer_liste_achat en prépare une depuis les alertes de stock.')
      // Les lignes d'une liste se lisent par leur liste, relue juste au-dessus sur le compte.
      const { data, error } = await session.from('lignes_achat').select('designation_libre, quantite, prix_cible_ht, fournisseur, achete, materiaux(nom, unite)').eq('liste_id', liste.id).limit(EXPORT_LIGNES_MAX)
      if (error) throw new Error('liste d’achat illisible')
      const rows = (data ?? []) as unknown as (Obj & { materiaux?: { nom?: string; unite?: string } | null })[]
      n = rows.length
      titre = 'Liste d’achat'
      feuille = { nom: 'Liste d achat', largeurs: [44, 10, 8, 22, 14, 10], filtre: true, lignes: [enTete(['Article', 'Quantité', 'Unité', 'Fournisseur', 'Prix cible HT', 'Acheté']), ...rows.map((r) => [cT(r.materiaux?.nom ?? r.designation_libre), cN(r.quantite), cT(r.materiaux?.unite), cT(r.fournisseur), cE(r.prix_cible_ht), cT(r.achete === true ? 'Oui' : 'Non')])] }
    }
    if (!n) return ko(`Rien à exporter : aucune ligne de ${titre.toLowerCase()}${e.depuis || e.jusqu_a ? ' sur cette période' : ''}.`)
    const octets = ecrireClasseur([feuille])
    if (octets.length > EXPORT_OCTETS_MAX) return ko('Le tableau est trop gros pour être rendu ici : précise une période (depuis / jusqu_a).')
    const fichier = `${quoi.replace('_', '-')}-${aujourdhui()}.xlsx`
    return {
      ok: true, resume: `tableau Excel « ${titre} » prêt (${n} ligne${n > 1 ? 's' : ''})`, objet: null,
      donnees: { fichier, feuille: titre, nb_lignes: n, tronque: n >= EXPORT_LIGNES_MAX, a_savoir: 'Le fichier Excel est prêt : un bouton « Télécharger » s’affiche sous ta réponse. Ne recopie pas son contenu : dis ce qu’il contient et combien de lignes.' },
      apercu: { lignes: [{ label: 'Fichier', valeur: fichier }, { label: 'Lignes', valeur: String(n) }] },
      brouillon: { type: 'tableau', lien: `data:${MIME_XLSX};base64,${Buffer.from(octets).toString('base64')}`, libelle: `${titre} — ${n} ligne${n > 1 ? 's' : ''}`, fichier },
    }
  }

  // ═══════════════ 21/10 — l'assistant relié à TOUT Presti : factures, plateforme, « Ma page », CRM récent (lib/assistant/actions-tout.ts) ═══════════════
  // Mêmes familles, mêmes routes, même session ; les recherches (chantier, devis, facture, conversation) sont celles de ce fichier.
  {
    const tout = actionsTout({
      uid: ctx.uid, crm: ctx.crm, session, route, maintenant, chantierDe, devisDe, factureDe, leadDe, peutEnvoyer, plafondEnvois: ENVOIS_JOUR_MAX,
      profil: async () => { const p = await profil(); return { nom: p.nom, email: p.email } }, envoyerFacture: dep.envoyerFacture,
    })
    Object.assign(R, tout.R); Object.assign(P, tout.P); Object.assign(INV, tout.INV)
  }

  // ═══════════════════════════ Les outils vus par le modèle ═══════════════════════════
  const plafondJour = (): Promise<boolean> => consommerLimite(`assistant-actions:${ctx.uid}`, ACTIONS_JOUR_MAX, 24 * 3600)
  const refusJour: ResultatExecution = { donnees: { ok: false, erreur: `Limite de ${ACTIONS_JOUR_MAX} actions par jour atteinte : l'assistant reprend demain.` }, resume: 'plafond d’actions du jour atteint', resultat: 'refus' }
  type Faite = Extract<Realisation, { ok: true }>
  const JOURNAL_INDISPONIBLE = { journal_des_actions_indisponible: true, a_savoir_journal: "L'action est faite mais n'a pas pu être inscrite au journal des actions : dis-le à l'artisan, il ne pourra pas l'annuler d'un clic." }
  /**
   * Inscrit au journal des actions une action FAITE — directe, ou « à confirmer » exécutée en mode « fait tout seul » (alors `base` est
   * l'aperçu de sa proposition : texte exact, avant / après). Mode « direct », statut « executee », annulable si un inverse existe.
   */
  async function inscrireFaite(nom: NomAction, entrees: Obj, r: Faite, base: Apercu | null): Promise<{ carte?: CarteAction; nonEnregistre: boolean }> {
    const titre = r.resume.slice(0, 200)
    try {
      const fiche = await ctx.magasin.creer({
        artisan_id: ctx.uid, conversation_id: ctx.conversationId, tour: Math.max(1, ctx.tour()), outil: nom, mode: 'direct', statut: 'executee',
        titre, entrees: r.garder ? { ...entrees, ...r.garder } : entrees,
        apercu: base ? { ...base, ...(r.apercu ?? {}), titre, alertes: r.apercu?.alertes ?? [] } : apercu(titre, r.apercu),
        annulation: r.annulation ?? null, resultat_resume: r.resume.slice(0, 300),
        objet_type: r.objet?.type ?? null, objet_id: r.objet?.id ?? null, expire_le: null,
      })
      return { carte: versCarte(fiche), nonEnregistre: false }
    } catch (e) { console.error('[assistant] action non enregistrée :', e instanceof Error ? e.message : e); return { nonEnregistre: true } }
  }
  const directe = (nom: NomAction) => async (entree: EntreeAction): Promise<ResultatExecution> => {
    if (!(await plafondJour())) return refusJour
    const r = await R[nom](entree)
    if (!r.ok) return { donnees: { ok: false, erreur: r.erreur }, resume: r.erreur.slice(0, 280), resultat: 'refus' }
    const { carte, nonEnregistre } = await inscrireFaite(nom, entree, r, null)
    return {
      donnees: { ok: true, fait: r.resume, annulable_par_l_artisan: !!(r.annulation && carte), ...(nonEnregistre ? JOURNAL_INDISPONIBLE : {}), ...(r.donnees ?? {}) },
      resume: r.resume.slice(0, 280), objet: r.objet ?? null, ...(carte ? { carte } : {}), ...(r.brouillon ? { brouillon: r.brouillon } : {}),
    }
  }
  /** Cette conversation a-t-elle appelé un outil qui rend du texte écrit par un tiers ? (journal de l'assistant, sous la RLS ; erreur = oui). */
  async function contenuTiersLu(): Promise<boolean> {
    const { data, error } = await session.from('assistant_journal').select('id').eq('artisan_id', ctx.uid).eq('conversation_id', ctx.conversationId).in('outil', [...OUTILS_CONTENU_TIERS]).limit(1)
    return !!error || (data ?? []).length > 0
  }
  /**
   * §3.2 (« parler au nom de l'artisan sur un sujet d'escalade » ne s'automatise jamais, « même au niveau 3 ») — cinquième audit 032-007,
   * voisin moyen : le mode « fait tout seul » relit, comme le pilote au départ (lib/pilote/executeur.ts, `escalade`), la conversation où
   * la carte écrit : la conversation elle-même (réponse, réponse préparée), celle du devis (relance, envoi), celle du devis de la facture
   * (relance d'impayé, envoi). Les 10 derniers messages ENTRANTS et la demande d'origine, par sujetEscalade, avec les mots de l'artisan.
   * Lectures sous la session (RLS). Rend le motif de la carte, ou null ; une lecture en erreur garde la carte (côté sûr).
   */
  async function escaladeDeLaCarte(objet: { type: TypeObjet; id: string } | null, entrees: Obj): Promise<string | null> {
    // TOUTES les conversations rattachées à la carte (son objet, et un conversation_id d'entrée s'il y en a un) : une seule qui parle d'un
    // sujet d'escalade suffit — jamais l'une à la place de l'autre.
    const leads = new Set<string>()
    const ajout = (v: unknown) => { const t = txt(v); if (t) leads.add(t) }
    if (objet?.type === 'conversation') ajout(objet.id)
    ajout(entrees.conversation_id)
    let devisId = objet?.type === 'devis' ? txt(objet.id) : null
    // 02/11 (audit 032-028, D5) : les e-mails du client de la pièce — ses AUTRES conversations comptent aussi (un litige écrit ailleurs
    // qu'au fil du devis, ou un devis créé à la main sans conversation), comme relancesImpayesMagasin. Lecture en erreur : lève (carte).
    const emails = new Set<string>()
    const email = (v: unknown) => { const t = txt(v); if (t) { emails.add(t); emails.add(t.toLowerCase()) } }
    if (objet?.type === 'facture') {
      const { data, error } = await session.from('factures').select('devis_id, client_email').eq('artisan_id', ctx.uid).eq('id', objet.id).maybeSingle()
      if (error) throw new Error('facture illisible')
      devisId = txt((data as { devis_id?: unknown } | null)?.devis_id)
      email((data as { client_email?: unknown } | null)?.client_email)
    }
    if (devisId) {
      const { data, error } = await session.from('devis').select('lead_id, client_email').eq('artisan_id', ctx.uid).eq('id', devisId).maybeSingle()
      if (error) throw new Error('devis illisible')
      ajout((data as { lead_id?: unknown } | null)?.lead_id)
      email((data as { client_email?: unknown } | null)?.client_email)
    }
    if (emails.size) {
      const { data, error } = await session.from('leads').select('id').eq('artisan_id', ctx.uid).in('contact', [...emails]).limit(20)
      if (error) throw new Error('conversations du client illisibles')
      for (const l of data ?? []) ajout((l as { id?: unknown }).id)
    }
    if (!leads.size) return null
    // Les mots de l'artisan (Ma plateforme), lus avec leur erreur, comme getPlateformeConfigStrict ; sans ligne ou table absente : les défauts.
    const { data: cfg, error: errCfg } = await session.from('plateforme_config').select('escalade_mots').eq('artisan_id', ctx.uid).maybeSingle()
    if (errCfg && !/PGRST205|42P01/.test(`${errCfg.code ?? ''}`)) throw new Error('réglages de la plateforme illisibles')
    const mots = Array.isArray((cfg as { escalade_mots?: unknown } | null)?.escalade_mots) ? (cfg as { escalade_mots: unknown[] }).escalade_mots : CONFIG_DEFAUT.escalade_mots
    for (const leadId of leads) {
      const { data: lead, error: errLead } = await session.from('leads').select('id, message').eq('artisan_id', ctx.uid).eq('id', leadId).maybeSingle()
      if (errLead) throw new Error('conversation illisible')
      if (!lead) continue
      const { data: msgs, error: errMsg } = await session.from('messages').select('contenu').eq('lead_id', leadId).eq('sens', 'in')
        .order('sent_at', { ascending: false }).limit(MESSAGES_ESCALADE_RELUS)
      if (errMsg) throw new Error('messages du client illisibles')
      const textes = [...(msgs ?? []).map((m) => (m as { contenu?: unknown }).contenu), (lead as { message?: unknown }).message]
      if (sujetEscalade(textes, mots) !== null) return LIBELLE_MOTIF.escalade
    }
    return null
  }
  // 02/11 (L16) — les relances d'UN tour (actionsDeSession vit le temps d'un tour) : la première d'un message peut partir d'office (« un
  // objet seul garde le fait tout seul ») ; une seconde, sur un autre objet, attend le clic — un ordre groupé mal repéré ne part pas en rafale.
  const relancesDuTour = new Set<string>()
  const MOTIF_PLUSIEURS = 'Plusieurs relances dans le même message (un ordre groupé) : chacune attend le clic de l’artisan, aucune ne part d’office ni par le pilote.'
  function horsAutoDuTour(nom: NomAction, objet: { type: TypeObjet; id: string } | null): string | null {
    if ((nom !== 'relancer_devis' && nom !== 'relancer_facture') || !objet) return null
    const autre = [...relancesDuTour].some((x) => x !== `${objet.type}:${objet.id}`)
    relancesDuTour.add(`${objet.type}:${objet.id}`)
    return autre || (nom === 'relancer_facture' && ordreGroupe(messageArtisan)) ? MOTIF_PLUSIEURS : null
  }
  /**
   * 02/11 (contre-audit 032-035, E1) — les relances de ce tour déjà mises au pilote (une PREMIÈRE carte, avant qu'une seconde ne révèle un
   * ordre groupé) : la seconde les en RETIRE (la carte reste, à valider d'un clic). Le pilote, au départ, le revoit de lui-même (executeur.ts).
   */
  const relancesPiloteesDuTour: string[] = []
  let retireesDuPilote = 0
  async function retirerDuPiloteLesCartesDuTour(motif: string): Promise<void> {
    while (relancesPiloteesDuTour.length) {
      const idCarte = relancesPiloteesDuTour.shift() as string
      if (await (dep.annulerPilote ?? annulerParRef)(ctx.uid, 'carte', idCarte, motif).catch(() => false)) retireesDuPilote++
    }
  }
  /**
   * 02/11 (contre-audit 032-035, E8) — la réservation d'une relance SEULE d'office : la trace du devis posée `en_cours` (mode direct) AVANT
   * l'envoi, puis relue (relanceConcurrente) ; une autre relance en cours ou partie : la réservation passe en échec et rien ne part. Journal
   * indisponible : rien ne part (aucune relance sans trace).
   */
  async function reserverRelanceSeule(devisId: string, entrees: Obj, ap: Apercu): Promise<{ ok: true; id: string } | { ok: false; erreur: string }> {
    const resa = await ctx.magasin.creer({
      artisan_id: ctx.uid, conversation_id: ctx.conversationId, tour: Math.max(1, ctx.tour()), outil: 'relancer_devis', mode: 'direct', statut: 'en_cours',
      titre: `Réservation : ${ap.titre}`.slice(0, 200), entrees: { numero: entrees.numero, ton: entrees.ton ?? 'cordial', reservation: true }, apercu: ap,
      annulation: null, resultat_resume: null, objet_type: 'devis', objet_id: devisId, expire_le: null,
    }).then((f) => f, () => null)
    if (!resa) return { ok: false, erreur: 'Le journal des actions est indisponible : la relance n’est pas partie (aucune relance sans trace). Réessaie dans un instant.' }
    reservationsDuTour.add(resa.id)
    const concurrente = await relanceConcurrente(devisId, resa.id).then((m) => m, () => MOTIF_JOURNAL_ILLISIBLE)
    if (!concurrente) return { ok: true, id: resa.id }
    await ctx.magasin.transiter(ctx.uid, resa.id, ['en_cours'], 'echec', { resultat_resume: `non envoyée : ${concurrente}`.slice(0, 300) }).catch(() => null)
    return { ok: false, erreur: `Pas de relance du devis ${String(entrees.numero ?? '')} : ${concurrente}. Rien n’est parti.` }
  }
  /**
   * 02/11 (L16) — ce que le modèle reçoit d'une carte de LOT : rien n'est parti, les retenus et les exclus avec leur motif (à redire à
   * l'artisan), et pourquoi c'est une carte même demandée. Jamais le pilote : un lot ne part qu'au clic.
   */
  async function carteDeLot(p: Extract<Preparation, { ok: true }>): Promise<ResultatExecution> {
    const lot = p.apercu.lot ?? { retenus: [], exclus: [] }
    const fiche = await ctx.magasin.creer({
      artisan_id: ctx.uid, conversation_id: ctx.conversationId, tour: Math.max(1, ctx.tour()), outil: 'relancer_devis', mode: 'confirmation', statut: 'en_attente',
      titre: p.apercu.titre.slice(0, 200), entrees: p.entrees, apercu: p.apercu, annulation: null, resultat_resume: null,
      objet_type: null, objet_id: null, expire_le: new Date(maintenant().getTime() + VALIDITE_CARTE_MS).toISOString(),
    })
    return {
      donnees: {
        ok: true, en_attente_de_confirmation: true, carte_de_lot: true, carte: p.apercu.titre,
        retenus: lot.retenus.map((r) => `${r.numero}${r.client ? ` (${r.client})` : ''}`), exclus: lot.exclus.map((x) => `${x.numero}${x.client ? ` (${x.client})` : ''} — ${x.motif}`),
        a_savoir: `RIEN n'a été envoyé. UNE carte de lot attend le clic de l'artisan (« Confirmer ») sous ta réponse : ${lot.retenus.length} relance${lot.retenus.length > 1 ? 's' : ''} retenue${lot.retenus.length > 1 ? 's' : ''}${lot.exclus.length ? `, ${lot.exclus.length} exclu${lot.exclus.length > 1 ? 's' : ''} (dis lesquels et pourquoi, en une phrase chacun)` : ''}. Un lot ne part jamais d'office, même demandé : ${p.horsAuto ?? 'il se valide d’un clic.'} Ne prétends jamais que c'est envoyé.`,
        pas_d_office: true, pourquoi_une_carte: p.horsAuto ?? 'carte de lot',
      },
      resume: `proposée, en attente de confirmation : ${p.apercu.titre}`.slice(0, 280), objet: null, carte: versCarte(fiche),
    }
  }
  const proposee = (nom: NomAction) => async (entree: EntreeAction): Promise<ResultatExecution> => {
    if (!(await plafondJour())) return refusJour
    const p = await P[nom](entree)
    if (!p.ok) return { donnees: { ok: false, erreur: p.erreur }, resume: p.erreur.slice(0, 280), resultat: 'refus' }
    // 02/11 (audit 032-028, D1) : la PREMIÈRE relance du message (aucun autre objet relancé avant dans ce tour) — lu avant la règle du tour.
    const premiereDuTour = !!p.objet && ![...relancesDuTour].some((x) => x !== `${p.objet?.type}:${p.objet?.id}`)
    // 02/11 (L16) : une seconde relance d'un AUTRE objet dans le même tour, ou une relance d'impayé d'un ordre groupé, attend le clic.
    const tour = horsAutoDuTour(nom, p.objet ?? null)
    if (tour && !p.horsAuto) p.horsAuto = tour
    // 02/11 (contre-audit 032-035, E1 et E2) — HORS PILOTE : une carte née d'un ordre sur plusieurs clients (reconnu, ou découpé en cartes
    // seules dans le même tour), d'une désignation douteuse ou d'un sujet d'escalade n'entre JAMAIS dans la file du pilote automatique —
    // « un lot, ses exclus revus, un clic, jamais le pilote » (plan du chantier 4, question 1) ; l'escalade ne s'automatise jamais (§13).
    // Le pilote est un choix de l'artisan pour UNE action préparée, pas pour un ordre groupé sans revue. La marque (MARQUE_HORS_PILOTE) est
    // aussi relue par le pilote à l'entrée et au départ (lib/pilote/serveur.ts, executeur.ts) : deux gardes, pas une.
    let horsPilote: string | null = tour ?? p.horsPilote ?? null
    const avantRetrait = retireesDuPilote
    if (tour) await retirerDuPiloteLesCartesDuTour(tour)
    const retirees = retireesDuPilote - avantRetrait
    let preuveFaite = false
    // 02/11 (audit 032-028, D1) — la charge de la preuve INVERSÉE : en « fait tout seul », une relance seule ne part d'office que si le
    // message de l'artisan désigne CETTE pièce et elle seule (cartes.ts motifPasUnSeul : un seul numéro complet, ou le nom de SON client,
    // sans « et », virgule, « tout le monde », numéro abrégé ni autre client nommé). Sinon : une carte. Trois gardes, trois domaines :
    // l'ordre que ordreGroupe reconnaît est refusé en amont (P.relancer_devis) ; toute relance APRÈS la première suit la règle du tour ;
    // celle-ci tient la première d'un ordre que ni l'une ni l'autre ne voit. Message absent de la session (textesArtisan non fourni : la
    // route le fournit toujours, app/api/assistant/route.ts:130-131) : rien à prouver ici. Lecture des clients en erreur : carte.
    if (!p.horsAuto && p.cible && premiereDuTour && ctx.autonome?.() === true && ctx.textesArtisan !== undefined && !ordreGroupe(messageArtisan)) {
      const cible = p.cible
      p.horsAuto = (await Promise.all([clientsDuCompte(), devisEnAttenteDuClient(cible)]).then(([autres, n]) => motifPasUnSeul(messageArtisan, cible, autres, n), () => MOTIF_DESIGNATION_ILLISIBLE)) ?? undefined
      if (p.horsAuto) horsPilote = horsPilote ?? p.horsAuto
      else preuveFaite = true
    }
    // E1, quel que soit le mode (une question, une carte déjà « pas d'office » pour une autre raison) : un message qui vise à coup sûr plusieurs
    // clients (quantifieur, autre client nommé) tient la carte hors du pilote. Lecture des clients en erreur : hors pilote aussi (côté sûr).
    if (!horsPilote && !preuveFaite && p.cible && ctx.textesArtisan !== undefined && messageArtisan.trim() && typePiloteDeOutil(nom)) {
      const cible = p.cible
      horsPilote = await clientsDuCompte().then((autres) => visePlusieursClients(messageArtisan, cible, autres), () => MOTIF_DESIGNATION_ILLISIBLE)
    }
    // 29/10 — MODE « FAIT TOUT SEUL » (choix de Benj) : l'artisan a demandé l'action dans SON message et aucun texte de tiers n'a été lu
    // dans ce tour → la proposition (mêmes contrôles, même aperçu) est exécutée aussitôt, avec SES entrées (TTC annoncé…),
    // et inscrite au journal comme une action faite. Les plafonds d'envois et d'actions sont ceux des réalisations et de plafondJour.
    // 02/11 — §3.2 du prompt de Benj du 01/11 : un geste de OUTILS_JAMAIS_AUTO (lib/pilote/regles.ts, la liste même du pilote :
    // encaissement, facture émise et scellée, suppression, lot de prix) ne s'exécute JAMAIS d'office, même demandé : carte d'un clic.
    const jamaisSeul = jamaisAutomatique(nom)
    // 02/11 (audit 032-001, D1) : la préparation peut aussi refuser le mode pour SON objet (un devis à prix non sourcé) : carte.
    let horsAuto = p.horsAuto ?? null
    // 02/11 (cinquième audit 032-007) : un outil pilotable sur une conversation où le client parle d'un sujet d'escalade (litige, sinistre,
    // avocat, fuite…) reste une carte, même demandé — le pilote la renverrait à la main au départ. Lecture en erreur : carte aussi.
    if (!jamaisSeul && !horsAuto && ctx.autonome?.() === true && typePiloteDeOutil(nom)) horsAuto = await escaladeDeLaCarte(p.objet ?? null, p.entrees).catch(() => MOTIF_ESCALADE_ILLISIBLE)
    if (!jamaisSeul && !horsAuto && ctx.autonome?.() === true) {
      // 02/11 (contre-audit 032-035, E8) : la relance SEULE d'office réserve son devis avant l'envoi, comme une relance de lot (trace
      // en_cours, puis relecture) : deux tours « fait tout seul » simultanés (deux onglets, un double envoi) ne relancent qu'une fois.
      const verrou = nom === 'relancer_devis' && p.objet?.type === 'devis' ? await reserverRelanceSeule(p.objet.id, p.entrees, p.apercu) : null
      if (verrou && !verrou.ok) return { donnees: { ok: false, erreur: verrou.erreur, rien_n_a_ete_fait: true }, resume: `demandée par l’artisan, non faite : ${verrou.erreur}`.slice(0, 280), resultat: 'refus' }
      const r = await R[nom](p.entrees)
      if (!r.ok) {
        if (verrou && verrou.ok) await ctx.magasin.transiter(ctx.uid, verrou.id, ['en_cours'], 'echec', { resultat_resume: `non envoyée : ${r.erreur}`.slice(0, 300) }).catch(() => null)
        return { donnees: { ok: false, erreur: r.erreur, rien_n_a_ete_fait: true }, resume: `demandée par l’artisan, non faite : ${r.erreur}`.slice(0, 280), resultat: 'refus' }
      }
      const objet = r.objet ?? p.objet ?? null
      const { carte, nonEnregistre } = await inscrireFaite(nom, p.entrees, { ...r, objet }, p.apercu)
      // La réservation se lève une fois la relance inscrite (la trace est la carte faite) ; non inscrite, la réservation DEVIENT la trace.
      if (verrou && verrou.ok) await ctx.magasin.transiter(ctx.uid, verrou.id, ['en_cours'], nonEnregistre ? 'executee' : 'annulee', { resultat_resume: nonEnregistre ? `relance du devis envoyée au client (fait tout seul)` : 'réservation levée : la relance est inscrite au journal' }).catch(() => null)
      const annulable = !!(r.annulation && carte)
      return {
        donnees: {
          ok: true, fait: r.resume, fait_tout_seul: true, annulable_par_l_artisan: annulable,
          a_savoir: `C'est FAIT : l'artisan te l'a demandé lui-même, l'action est exécutée sans attendre de confirmation. Dis-le simplement (« c'est fait : … »)${annulable ? ", et qu'il peut l'annuler d'un clic sous ta réponse" : " ; elle ne se défait pas d'un clic"}.`,
          ...(nonEnregistre ? JOURNAL_INDISPONIBLE : {}), ...(r.donnees ?? {}),
        },
        resume: `faite à la demande de l’artisan : ${r.resume}`.slice(0, 280), objet, ...(carte ? { carte } : {}), ...(r.brouillon ? { brouillon: r.brouillon } : {}),
      }
    }
    // 02/11 (contre-audit 032-035, E2) : la carte d'escalade (litige vu dans une conversation du client, ou conversations illisibles) ne va jamais au pilote.
    if (horsAuto === LIBELLE_MOTIF.escalade || horsAuto === MOTIF_ESCALADE_ILLISIBLE) horsPilote = horsPilote ?? horsAuto
    // 02/11 (L16) : une carte de LOT de relances n'entre jamais dans la file du pilote — elle ne part qu'au clic de l'artisan (rang 4, question 1).
    if (nom === 'relancer_devis' && p.apercu.lot) return carteDeLot(p)
    // Audit du 21/10 (M4, injection de prompt indirecte) : une carte pilotable née d'une conversation où l'assistant a LU du texte
    // écrit par un tiers (messages de prospects, demandes, fournisseurs) est MARQUÉE ; le pilote automatique ne la fait jamais partir.
    const lu = typePiloteDeOutil(nom) ? await contenuTiersLu() : false
    // 02/11 (contre-audit 032-035, E1 et E2) : la marque HORS PILOTE, dans les entrées de la carte (lue par le pilote à l'entrée et au départ).
    if (horsPilote && typePiloteDeOutil(nom)) p.entrees = { ...p.entrees, [MARQUE_HORS_PILOTE]: horsPilote }
    const fiche = await ctx.magasin.creer({
      artisan_id: ctx.uid, conversation_id: ctx.conversationId, tour: Math.max(1, ctx.tour()), outil: nom, mode: 'confirmation', statut: 'en_attente',
      titre: p.apercu.titre.slice(0, 200), entrees: lu ? { ...p.entrees, [MARQUE_CONTENU_TIERS]: true } : p.entrees, apercu: p.apercu, annulation: null, resultat_resume: null,
      objet_type: p.objet?.type ?? null, objet_id: p.objet?.id ?? null, expire_le: new Date(maintenant().getTime() + VALIDITE_CARTE_MS).toISOString(),
    })
    // PILOTE AUTOMATIQUE (21/10, lib/pilote) : si l'artisan l'a activé pour ce type d'action (Signature, drapeau levé, garde-fous
    // passés), la carte entre dans la file et partira seule après le délai d'annulation. Sinon : rien ne change, elle attend le clic.
    // E1/E2 : une carte HORS PILOTE n'est même pas présentée au pilote (qui la refuserait aussi : piloterCarte lit la marque).
    const auto = horsPilote ? null : await (dep.piloterCarte ?? piloterCarte)(ctx.uid, fiche)
    if (auto && (nom === 'relancer_devis' || nom === 'relancer_facture')) relancesPiloteesDuTour.push(fiche.id)
    return {
      donnees: { ok: true, en_attente_de_confirmation: true, carte: p.apercu.titre, contenu_de_la_carte: [...p.apercu.lignes.filter((l) => !['Client', 'À'].includes(l.label)).map((l) => `${l.label} : ${l.valeur}`), ...p.apercu.alertes],
        a_savoir: auto
          ? `RIEN n'est encore parti. Le pilote automatique de l'artisan enverra cette action seule à ${new Date(auto.part_le).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })} (dans ${DELAI_ANNULATION_MIN} minutes), sauf s'il l'annule (Paramètres → Pilote automatique, ou le poste des assistants du CRM). Dis-le clairement.`
          : `RIEN n'a été fait. Une carte attend le clic de l'artisan (bouton « Confirmer ») sous ta réponse. Dis-le clairement : ne prétends jamais que c'est envoyé, émis ou supprimé.${jamaisSeul
            ? ` Ce geste ne se fait JAMAIS d'office, même quand l'artisan le demande lui-même : ${raisonJamaisAuto(nom)}. Dis-lui pourquoi en une phrase : c'est lui qui confirme d'un clic.`
            : horsAuto ? ` Elle ne se fait pas d'office, même demandée : ${horsAuto} Dis-lui pourquoi en une phrase : c'est lui qui relit et confirme d'un clic.`
            : ctx.autonome ? " (Elle n'a pas été faite d'office parce que l'artisan ne l'a pas demandée lui-même dans ce message, parce que son message était une question, ou parce qu'un texte écrit par un client ou un fournisseur a été lu dans ce tour.)" : ''}`,
        ...(jamaisSeul ? { jamais_d_office: true, pourquoi_une_carte: raisonJamaisAuto(nom) } : horsAuto ? { pas_d_office: true, pourquoi_une_carte: horsAuto } : {}),
        ...(auto ? { pilote_automatique: { part_le: auto.part_le } } : {}), ...(horsPilote && typePiloteDeOutil(nom) ? { hors_pilote: true } : {}),
        ...(retirees ? { retirees_du_pilote: retirees, a_savoir_aussi: `${retirees} relance${retirees > 1 ? 's' : ''} de ce message, mise${retirees > 1 ? 's' : ''} plus tôt au pilote automatique, en ${retirees > 1 ? 'ont été retirées' : 'a été retirée'} : un ordre sur plusieurs clients attend le clic de l’artisan. Dis-le.` } : {}) },
      resume: `proposée, en attente de confirmation : ${p.apercu.titre}`.slice(0, 280), objet: p.objet ?? null, carte: versCarte(fiche),
    }
  }

  const executeurs = {} as ActionsServeur['executeurs']
  for (const nom of Object.keys(R)) {
    if (!estNomAction(nom)) continue
    // Fail-closed : une action « à confirmer » SANS proposition ne doit jamais tomber en exécution directe.
    if (categorieDe(nom) === 'confirmation' && !P[nom]) throw new Error(`action à confirmer sans proposition : ${nom}`)
    if (categorieDe(nom) === 'direct' && P[nom]) throw new Error(`action directe avec proposition : ${nom}`)
    executeurs[nom] = categorieDe(nom) === 'confirmation' ? proposee(nom) : directe(nom)
  }
  // 29/10 — mode « fait tout seul » : une action à confirmer peut aussi s'EXÉCUTER depuis le modèle (sa proposition, puis sa réalisation) ;
  // toute proposition a donc sa réalisation. Et chaque outil du catalogue (SPEC) a son exécution : un outil montré au modèle qui ne ferait
  // rien (ou répondrait « pas ouvert ») fait échouer la construction, au lieu de laisser l'assistant dire qu'il ne peut pas.
  for (const nom of Object.keys(P)) if (!R[nom]) throw new Error(`proposition sans réalisation : ${nom}`)
  for (const nom of NOMS_ACTIONS) if (!executeurs[nom]) throw new Error(`action sans exécution : ${nom}`)
  return { executeurs, realisateurs: R, inverses: INV }
}
