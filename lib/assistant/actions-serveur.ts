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
//    par confirmerAction (confirmation.ts), sur le clic de l'artisan.
import { consommerLimite } from '@/lib/limites'
import { sendEmail } from '@/lib/email'
import { creerFacture } from '@/lib/factureDepuisDevis'
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
import { DELETE as reservationSupprimer } from '@/app/api/crm/materiaux/[id]/route'
import { POST as noteCreer } from '@/app/api/crm/notes/route'
import { DELETE as noteSupprimer } from '@/app/api/crm/notes/[id]/route'
import { POST as membreCreer } from '@/app/api/crm/equipe/route'
import { DELETE as membreSupprimer } from '@/app/api/crm/equipe/[id]/route'
import { fmtDate, fmtEuros, fmtNombre, indicesARetirer, lienDe, resoudreLignes, texteRelanceDevis, texteRelanceFacture, trouverUnique, VALIDITE_CARTE_MS, type Annulation, type Apercu, type CarteAction, type TarifLu, type TypeObjet } from './cartes'
import { categorieDe, estNomAction, type EntreeAction, type LigneEntree, type NomAction } from './outils-actions'
import type { FicheAction, MagasinActions, Realisateur, Realisation } from './confirmation'
import type { ResultatExecution } from './boucle'
import { appelerAvec, clientDeSession, erreurDe, type ContexteSession, type Gestionnaire, type ReponseRoute } from './session'
import { piloterCarte } from '@/lib/pilote/serveur'
import { DELAI_ANNULATION_MIN, MARQUE_CONTENU_TIERS, OUTILS_CONTENU_TIERS, typePiloteDeOutil } from '@/lib/pilote/regles'
import { actionsTout } from './actions-tout'

/** Envois (e-mail ou message à un client) que l'assistant peut faire partir en un jour pour un compte. */
export const ENVOIS_JOUR_MAX = 30
/** Actions (directes et cartes) qu'un compte peut faire proposer ou faire en un jour : borne le travail et l'envoi en masse. */
export const ACTIONS_JOUR_MAX = 200
/** Une relance n'est pas redemandée avant ce délai. */
export const RELANCE_DELAI_JOURS = 3
const LOT_TARIFS_MAX = 300
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Ce qui peut être remplacé dans les essais (aucun e-mail réel, aucune facture scellée dans une base partagée). */
export type DependancesActions = {
  /** POST /api/devis/[id]/envoyer (génère le PDF : chargé à la demande). */
  envoyerDevis?: Gestionnaire
  /** POST /api/factures/[id]/envoyer (génère le PDF : chargé à la demande). */
  envoyerFacture?: Gestionnaire
  creerFacture?: typeof creerFacture
  envoyerMail?: typeof sendEmail
  maintenant?: () => Date
  /** L'appel des routes de l'interface (essais : une doublure qui enregistre la route atteinte, sans réseau). */
  appeler?: (g: Gestionnaire, chemin: string, o: { methode?: string; corps?: unknown; params?: Record<string, string> }) => Promise<ReponseRoute>
  /** Mise en file du pilote automatique (essais : en mémoire). */
  piloterCarte?: typeof piloterCarte
}

export type ContexteActions = ContexteSession & {
  conversationId: string
  /** Le numéro du tour en cours (connu après la prise du tour : lu à l'appel). */
  tour: () => number
  magasin: MagasinActions
  dependances?: DependancesActions
}

type Obj = Record<string, unknown>
type Preparation = { ok: true; entrees: Obj; apercu: Apercu; objet?: { type: TypeObjet; id: string } | null } | { ok: false; erreur: string }

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
  type LigneRow = { designation: string; quantite: number | string; unite: string | null; prix_unitaire_ht: number | string; tva_taux: number | string; source_prix?: string | null }
  async function lignesDe(devisId: string): Promise<LigneRow[]> {
    const { data, error } = await session.from('devis_lignes').select('designation, quantite, unite, prix_unitaire_ht, tva_taux, source_prix, ordre').eq('devis_id', devisId).order('ordre')
    if (error) throw new Error('lignes illisibles')
    return (data ?? []) as unknown as LigneRow[]
  }
  const corpsDevis = (d: DevisRow, lignes: readonly LigneRow[], sur: Obj = {}): Obj => ({
    objet: d.objet, validite_jours: d.validite_jours ?? 90, remise_pct: num(d.remise_pct), acompte_pct: num(d.acompte_pct), conditions: d.conditions, notes: d.notes,
    client_nom: d.client_nom, client_email: d.client_email, client_adresse: d.client_adresse,
    lignes: lignes.map((l) => ({ designation: l.designation, quantite: num(l.quantite), unite: l.unite ?? 'u', prix_unitaire_ht: num(l.prix_unitaire_ht), tva_taux: num(l.tva_taux), ...(l.source_prix ? { source_prix: l.source_prix } : {}) })),
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
    const r = resoudreLignes(lignes, tarifs)
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
        lignes_a_chiffrer: r.aChiffrer, lignes_au_tarif_de_l_artisan: lignes.filter((l) => l.tarif_id).length,
        e_mail_client_present: !!email,
        a_savoir: "Devis BROUILLON créé : rien n'est envoyé. Les totaux sont ceux calculés par Presti (cite-les tels quels)." + (r.aChiffrer.length ? ` Des lignes n'ont AUCUN prix (à chiffrer) : dis-le et demande-le à l'artisan.` : '') + (email ? '' : " Le client n'a pas d'e-mail : il faudra le renseigner avant l'envoi."),
      },
      apercu: {
        lignes: [{ label: 'Client', valeur: client ?? '—' }, { label: 'Objet', valeur: String(e.objet ?? '') }, { label: 'Lignes', valeur: String(r.lignes.length) }, { label: 'Total TTC', valeur: fmtEuros(d?.total_ttc) }, ...(r.aChiffrer.length ? [{ label: 'À chiffrer', valeur: r.aChiffrer.join(' ; ') }] : [])],
        alertes: r.aChiffrer.length ? [`${r.aChiffrer.length} ligne(s) sans prix : à chiffrer avant l’envoi.`] : [],
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
    const r = resoudreLignes(ajout, tarifs)
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
      donnees: { numero: d.numero, lignes_ajoutees: r.lignes.length, lignes_retirees: ret.indices.length, total_ht: num(apres?.total_ht), total_ttc: num(apres?.total_ttc), lignes_a_chiffrer: r.aChiffrer, a_savoir: 'Totaux recalculés par Presti : cite-les tels quels.' },
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
  R.relancer_devis = async (e) => {
    const d = await devisDe(String(e.numero))
    if (!d) return ko(`Devis ${e.numero} introuvable.`)
    if (d.statut !== 'envoye') return ko(`Le devis ${d.numero} n'est pas « envoyé » (statut : ${d.statut}) : pas de relance.`)
    const to = txt(d.client_email)
    if (!to || !EMAIL.test(to)) return ko('Le devis n’a pas d’e-mail client.')
    const p = await profil()
    const t = texteRelanceDevis({ client: d.client_nom, numero: String(d.numero), objet: d.objet, totalTtc: d.total_ttc === null ? null : num(d.total_ttc), envoyeLe: d.envoye_le, validiteJours: d.validite_jours, artisan: p.nom, ton: (e.ton as 'cordial' | 'ferme') ?? 'cordial' })
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
    const r = await (dep.creerFacture ?? creerFacture)({ artisanId: ctx.uid, devisId: d.id, ...(acompte ? { acomptePct: acompte } : {}) })
    if (!r.ok) return ko(r.error)
    return {
      ok: true, resume: `facture ${r.numero} émise${acompte ? ` (acompte ${fmtNombre(acompte)} %)` : ''} pour le devis ${d.numero}`, objet: { type: 'facture', id: r.id },
      donnees: { numero_facture: r.numero, devis: d.numero, type: acompte ? 'acompte' : 'complete' },
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
    const t = await tarifDe(String(e.tarif_id))
    if (!t) return ko('Tarif introuvable dans la bibliothèque de l’artisan (relis-le avec lire_tarifs).')
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
    const rep = await route(inventaireEcrire, '/api/inventaire', { corps: { mouvement: { materiau_id: a.item.id, type, quantite: e.quantite, lieu, source: 'manuel', note: txt(e.note) ?? 'Saisi par l’assistant' } } })
    if (rep.status !== 200) return ko(objetErreur(rep, 'Le mouvement n’a pas pu être enregistré (stock insuffisant ?).'))
    const reste = num(rep.json?.reste)
    const inverse = type === 'entree' ? { type: 'sortie', quantite: e.quantite } : type === 'inventaire' ? { type: 'inventaire', quantite: avantLieu } : { type: 'entree', quantite: e.quantite }
    return {
      ok: true, resume: `stock « ${a.item.nom} » : ${type} de ${fmtNombre(e.quantite as number)} (${lieu}), reste ${fmtNombre(reste)}`, objet: { type: 'article', id: a.item.id },
      annulation: { outil: 'mouvement_inverse', entrees: { materiau_id: a.item.id, lieu, ...inverse }, libelle: 'Annuler ce mouvement de stock' },
      donnees: { article: a.item.nom, mouvement: type, quantite: e.quantite, lieu, reste_en_stock: reste, seuil_alerte: num(a.item.seuil_alerte), sous_le_seuil: num(a.item.seuil_alerte) > 0 && reste <= num(a.item.seuil_alerte) },
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
    const mail = mailDevis({ numero: d.numero, client_nom: d.client_nom, objet: d.objet, validite_jours: d.validite_jours }, p.nom)
    return {
      ok: true, entrees: { ...e }, objet: { type: 'devis', id: d.id },
      apercu: apercu(`Envoyer le devis ${d.numero} à ${d.client_nom ?? 'votre client'}`, {
        lignes: [{ label: 'À', valeur: email }, { label: 'Devis', valeur: `${d.numero} — ${d.objet ?? 'sans objet'}` }, { label: 'Total TTC', valeur: fmtEuros(d.total_ttc) }, { label: 'Pièce jointe', valeur: `${d.numero}.pdf` }],
        message: { a: email, objet: mail.subject, texte: mail.text },
        alertes: [...(deja ? ['Ce devis a déjà été envoyé : il repartira une seconde fois.'] : []), ...(repris ? ['L’e-mail est celui de la conversation du client.'] : [])],
        irreversible: true,
      }),
    }
  }

  P.relancer_devis = async (e) => {
    const d = await devisDe(String(e.numero))
    if (!d) return ko(`Devis ${e.numero} introuvable.`)
    if (d.statut !== 'envoye') return ko(`Le devis ${d.numero} n'a pas été envoyé ou n'attend plus de réponse (statut : ${d.statut}) : pas de relance.`)
    const to = txt(d.client_email)
    if (!to || !EMAIL.test(to)) return ko('Le devis n’a pas d’e-mail client : pas de relance par e-mail possible.')
    const dernier = await ctx.magasin.dernierEnvoi(ctx.uid, 'relancer_devis', d.id).catch(() => null)
    if (dernier && Date.now() - Date.parse(dernier) < RELANCE_DELAI_JOURS * 86_400_000) return ko(`Ce devis a déjà été relancé le ${fmtDate(jourParis(new Date(dernier)))} : on ne renvoie pas de message avant ${RELANCE_DELAI_JOURS} jours.`)
    const p = await profil()
    const t = texteRelanceDevis({ client: d.client_nom, numero: String(d.numero), objet: d.objet, totalTtc: d.total_ttc === null ? null : num(d.total_ttc), envoyeLe: d.envoye_le, validiteJours: d.validite_jours, artisan: p.nom, ton: (e.ton as 'cordial' | 'ferme') ?? 'cordial' })
    return { ok: true, entrees: { ...e }, objet: { type: 'devis', id: d.id }, apercu: apercu(`Relancer ${d.client_nom ?? 'le client'} pour le devis ${d.numero}`, { lignes: [{ label: 'À', valeur: to }, { label: 'Devis', valeur: `${d.numero} — ${fmtEuros(d.total_ttc)} TTC` }, { label: 'Ton', valeur: String(e.ton ?? 'cordial') }], message: { a: to, objet: t.objet, texte: t.texte }, irreversible: true }) }
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
    const p = await profil()
    const t = texteRelanceFacture({ client: f.client_nom, numero: String(f.numero), totalTtc: f.total_ttc === null ? null : num(f.total_ttc), echeance: f.date_echeance, joursRetard: retard, artisan: p.nom, ton: (e.ton as 'cordial' | 'ferme') ?? 'cordial' })
    return { ok: true, entrees: { ...e }, objet: { type: 'facture', id: f.id }, apercu: apercu(`Relancer ${f.client_nom ?? 'le client'} — facture ${f.numero}`, { lignes: [{ label: 'À', valeur: to }, { label: 'Facture', valeur: `${f.numero} — ${fmtEuros(f.total_ttc)} TTC` }, { label: 'Retard', valeur: `${retard} jour${retard > 1 ? 's' : ''}` }, { label: 'Ton', valeur: String(e.ton ?? 'cordial') }], message: { a: to, objet: t.objet, texte: t.texte }, irreversible: true, lien: lienDe('facture', f.id) }) }
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
  const directe = (nom: NomAction) => async (entree: EntreeAction): Promise<ResultatExecution> => {
    if (!(await plafondJour())) return refusJour
    const r = await R[nom](entree)
    if (!r.ok) return { donnees: { ok: false, erreur: r.erreur }, resume: r.erreur.slice(0, 280), resultat: 'refus' }
    let carte: CarteAction | undefined
    let nonEnregistre = false
    try {
      const fiche = await ctx.magasin.creer({
        artisan_id: ctx.uid, conversation_id: ctx.conversationId, tour: Math.max(1, ctx.tour()), outil: nom, mode: 'direct', statut: 'executee',
        titre: r.resume.slice(0, 200), entrees: entree, apercu: apercu(r.resume.slice(0, 200), r.apercu), annulation: r.annulation ?? null, resultat_resume: r.resume.slice(0, 300),
        objet_type: r.objet?.type ?? null, objet_id: r.objet?.id ?? null, expire_le: null,
      })
      carte = versCarte(fiche)
    } catch (e) { nonEnregistre = true; console.error('[assistant] action non enregistrée :', e instanceof Error ? e.message : e) }
    return {
      donnees: { ok: true, fait: r.resume, annulable_par_l_artisan: !!(r.annulation && carte), ...(nonEnregistre ? { journal_des_actions_indisponible: true, a_savoir_journal: "L'action est faite mais n'a pas pu être inscrite au journal des actions : dis-le à l'artisan, il ne pourra pas l'annuler d'un clic." } : {}), ...(r.donnees ?? {}) },
      resume: r.resume.slice(0, 280), objet: r.objet ?? null, ...(carte ? { carte } : {}),
    }
  }
  /** Cette conversation a-t-elle appelé un outil qui rend du texte écrit par un tiers ? (journal de l'assistant, sous la RLS ; erreur = oui). */
  async function contenuTiersLu(): Promise<boolean> {
    const { data, error } = await session.from('assistant_journal').select('id').eq('artisan_id', ctx.uid).eq('conversation_id', ctx.conversationId).in('outil', [...OUTILS_CONTENU_TIERS]).limit(1)
    return !!error || (data ?? []).length > 0
  }
  const proposee = (nom: NomAction) => async (entree: EntreeAction): Promise<ResultatExecution> => {
    if (!(await plafondJour())) return refusJour
    const p = await P[nom](entree)
    if (!p.ok) return { donnees: { ok: false, erreur: p.erreur }, resume: p.erreur.slice(0, 280), resultat: 'refus' }
    // Audit du 21/10 (M4, injection de prompt indirecte) : une carte pilotable née d'une conversation où l'assistant a LU du texte
    // écrit par un tiers (messages de prospects, demandes, fournisseurs) est MARQUÉE ; le pilote automatique ne la fait jamais partir.
    const lu = typePiloteDeOutil(nom) ? await contenuTiersLu() : false
    const fiche = await ctx.magasin.creer({
      artisan_id: ctx.uid, conversation_id: ctx.conversationId, tour: Math.max(1, ctx.tour()), outil: nom, mode: 'confirmation', statut: 'en_attente',
      titre: p.apercu.titre.slice(0, 200), entrees: lu ? { ...p.entrees, [MARQUE_CONTENU_TIERS]: true } : p.entrees, apercu: p.apercu, annulation: null, resultat_resume: null,
      objet_type: p.objet?.type ?? null, objet_id: p.objet?.id ?? null, expire_le: new Date(maintenant().getTime() + VALIDITE_CARTE_MS).toISOString(),
    })
    // PILOTE AUTOMATIQUE (21/10, lib/pilote) : si l'artisan l'a activé pour ce type d'action (Signature, drapeau levé, garde-fous
    // passés), la carte entre dans la file et partira seule après le délai d'annulation. Sinon : rien ne change, elle attend le clic.
    const auto = await (dep.piloterCarte ?? piloterCarte)(ctx.uid, fiche)
    return {
      donnees: { ok: true, en_attente_de_confirmation: true, carte: p.apercu.titre, contenu_de_la_carte: [...p.apercu.lignes.filter((l) => !['Client', 'À'].includes(l.label)).map((l) => `${l.label} : ${l.valeur}`), ...p.apercu.alertes],
        a_savoir: auto
          ? `RIEN n'est encore parti. Le pilote automatique de l'artisan enverra cette action seule à ${new Date(auto.part_le).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })} (dans ${DELAI_ANNULATION_MIN} minutes), sauf s'il l'annule (Paramètres → Pilote automatique, ou le poste des assistants du CRM). Dis-le clairement.`
          : "RIEN n'a été fait. Une carte attend le clic de l'artisan (bouton « Confirmer ») sous ta réponse. Dis-le clairement : ne prétends jamais que c'est envoyé, émis ou supprimé.",
        ...(auto ? { pilote_automatique: { part_le: auto.part_le } } : {}) },
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
  return { executeurs, realisateurs: R, inverses: INV }
}
