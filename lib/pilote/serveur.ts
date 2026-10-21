// PILOTE AUTOMATIQUE — la FILE en base (table actions_auto, réglages pilote_reglages, migration 0174). Serveur seulement.
//
// Écrit avec la clé de service : les deux tables sont fermées aux rôles du navigateur (RLS sans politique). Chaque requête porte
// `artisan_id` — la clé de service passe outre la RLS, ce filtre est la barrière, et il vient de la session ou de l'objet préparé,
// jamais d'un modèle ni d'un écran. Les règles (qui part, quand, garde-fous) sont dans lib/pilote/regles.ts.
//
// Mise en file (APRÈS la préparation, jamais à la place) :
//  • piloterCarte(uid, fiche)       — une carte « à confirmer » de l'assistant de gestion (assistant_actions, statut en_attente) ;
//  • piloterProposition(uid, …)     — une réponse proposée dans une conversation (messages.etat = 'proposition').
// Les deux ne lèvent JAMAIS : la préparation qui les appelle continue comme avant si la file est absente ou en panne (l'action
// reste simplement à valider à la main — fail-closed côté envoi).
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { actif } from '@/lib/flags'
import { consommerLimiteStricte } from '@/lib/limites'
import { envoyerPushArtisan } from '@/lib/push'
import { estCanalConversation } from '@/lib/canaux/regles'
import { peut } from '@/lib/plans'
import type { FicheAction } from '@/lib/assistant/confirmation'
import {
  DELAI_ANNULATION_MIN, MARQUE_CONTENU_TIERS, PLAFOND_AUTO_JOUR, cleIdempotence, decisionPilote, lireReglagesPilote, partLe, typePiloteDeOutil,
  REGLAGES_PILOTE_DEFAUT, LIBELLE_TYPE, type LigneFile, type LignePrix, type MotifManuel, type ReglagesPilote, type TypePilote,
} from './regles'

const FILE = 'actions_auto'
const REGLAGES = 'pilote_reglages'
const COLONNES_FILE = 'id, type, source, libelle, prete_le, part_le, statut, motif, traite_le'

export type MiseEnFile = { id: string; part_le: string } | null

/** Les réglages d'un compte (défaut : coupé). Erreur de lecture : coupé (rien ne part sans réglage lisible). */
export async function lireReglages(uid: string): Promise<ReglagesPilote> {
  try {
    const { data, error } = await supabaseAdmin.from(REGLAGES).select('actif, types').eq('artisan_id', uid).maybeSingle()
    if (error || !data) return { ...REGLAGES_PILOTE_DEFAUT }
    return lireReglagesPilote(data)
  } catch { return { ...REGLAGES_PILOTE_DEFAUT } }
}

/** Envois automatiques partis depuis 24 h pour ce compte (le plafond). Erreur : on compte « plein » (fail-closed). */
export async function partiesDepuis24h(uid: string, maintenant = new Date()): Promise<number> {
  const depuis = new Date(maintenant.getTime() - 24 * 3600_000).toISOString()
  const { count, error } = await supabaseAdmin.from(FILE).select('id', { count: 'exact', head: true })
    .eq('artisan_id', uid).eq('statut', 'partie').gte('traite_le', depuis)
  if (error) return Number.MAX_SAFE_INTEGER
  return count ?? 0
}

async function planDe(uid: string): Promise<{ plan: string | null; email: string | null; leads_pause: boolean }> {
  const { data } = await supabaseAdmin.from('artisans').select('plan, is_founder, email, leads_pause').eq('id', uid).maybeSingle()
  // Un fondateur compte comme Business, comme au départ (lib/pilote/executeur.ts) et partout ailleurs (audit du 21/10, F2).
  return { plan: data?.is_founder ? 'business' : ((data?.plan as string | null) ?? null), email: (data?.email as string | null) ?? null, leads_pause: data?.leads_pause === true }
}

/** Le jeton du plafond quotidien (audit du 21/10, M2) : atomique, FAIL-CLOSED (base injoignable = plafond atteint). */
export const jetonPlafond = (uid: string): Promise<boolean> => consommerLimiteStricte(`pilote:${uid}`, PLAFOND_AUTO_JOUR, 86_400)

/** Les lignes d'un devis désigné par son numéro (pour le garde-fou des prix), filtrées par compte. */
export async function lignesDuDevis(uid: string, ref: { numero?: string; id?: string }): Promise<LignePrix[] | null> {
  let q = supabaseAdmin.from('devis').select('id').eq('artisan_id', uid)
  q = ref.id ? q.eq('id', ref.id) : q.eq('numero', String(ref.numero ?? ''))
  const { data: d } = await q.maybeSingle()
  if (!d?.id) return null
  const { data, error } = await supabaseAdmin.from('devis_lignes').select('prix_unitaire_ht, source_prix').eq('devis_id', d.id)
  if (error) return null
  return (data ?? []) as LignePrix[]
}

async function inserer(uid: string, l: { type: TypePilote; source: 'carte' | 'proposition'; ref_id: string; lead_id?: string | null; libelle: string }, maintenant: Date): Promise<MiseEnFile> {
  const prete = maintenant
  const ligne = {
    artisan_id: uid, type: l.type, source: l.source, ref_id: l.ref_id, lead_id: l.lead_id ?? null,
    libelle: l.libelle.slice(0, 200), prete_le: prete.toISOString(), part_le: partLe(prete).toISOString(),
    statut: 'a_partir', cle: cleIdempotence(l.source, l.ref_id),
  }
  // Idempotence : la contrainte unique (artisan_id, cle) refuse un second passage pour le même objet.
  const { data, error } = await supabaseAdmin.from(FILE).upsert(ligne, { onConflict: 'artisan_id,cle', ignoreDuplicates: true }).select('id, part_le').maybeSingle()
  if (error || !data) return null
  return { id: data.id as string, part_le: data.part_le as string }
}

/**
 * Prévient l'artisan par PUSH seulement (audit du 21/10, E2 : un e-mail par action consommait le quota global des e-mails du
 * produit). La file est aussi visible en console : Paramètres → Pilote automatique, et le poste des assistants du CRM. Ne lève jamais.
 */
async function prevenir(uid: string, libelle: string, type: TypePilote) {
  const texte = `${LIBELLE_TYPE[type].label} — « ${libelle} » partira automatiquement dans ${DELAI_ANNULATION_MIN} minutes. Touchez pour annuler.`
  try { await envoyerPushArtisan(uid, { titre: 'Pilote automatique', ligne: texte.slice(0, 160), url: '/parametres?onglet=pilote', tag: `pilote-${type}` }) } catch { /* sans push : la console montre la file */ }
}

async function decider(uid: string, type: TypePilote | null, outil: string | undefined, lignes?: LignePrix[]): Promise<{ auto: boolean; motif?: MotifManuel; email: string | null; leads_pause: boolean }> {
  const a = await planDe(uid)
  const reglages = await lireReglages(uid)
  const parties = await partiesDepuis24h(uid)
  const d = decisionPilote({ drapeau: actif('piloteAutomatique'), plan: a.plan, reglages, type, outil, lignes, partiesDepuis24h: parties })
  return d.auto ? { auto: true, email: a.email, leads_pause: a.leads_pause } : { auto: false, motif: d.motif, email: a.email, leads_pause: a.leads_pause }
}

/** Une carte « à confirmer » de l'assistant vient d'être créée : la mettre en file si le pilote le permet. Ne lève jamais. */
export async function piloterCarte(uid: string, fiche: Pick<FicheAction, 'id' | 'artisan_id' | 'outil' | 'titre' | 'entrees' | 'mode' | 'statut'>, maintenant = new Date()): Promise<MiseEnFile> {
  try {
    if (!actif('piloteAutomatique')) return null
    if (fiche.artisan_id !== uid || fiche.mode !== 'confirmation' || fiche.statut !== 'en_attente') return null
    const type = typePiloteDeOutil(fiche.outil)
    if (!type) return null
    // M4 : une carte née d'une conversation où l'assistant a lu du texte écrit par un tiers ne part jamais seule.
    if (fiche.entrees?.[MARQUE_CONTENU_TIERS] === true) return null
    const lignes = type === 'envoi_devis' ? (await lignesDuDevis(uid, { numero: String(fiche.entrees?.numero ?? '') })) ?? [] : undefined
    const d = await decider(uid, type, fiche.outil, lignes)
    if (!d.auto) return null
    const r = await inserer(uid, { type, source: 'carte', ref_id: fiche.id, libelle: fiche.titre }, maintenant)
    if (r) await prevenir(uid, fiche.titre, type)
    return r
  } catch (e) {
    console.error('[pilote] mise en file (carte) :', e instanceof Error ? e.message : e)
    return null
  }
}

/** Une réponse vient d'être PROPOSÉE dans une conversation : la mettre en file si le pilote le permet. Ne lève jamais. */
export async function piloterProposition(uid: string, p: { leadId: string; messageId: string; nomProspect?: string | null }, maintenant = new Date()): Promise<MiseEnFile> {
  try {
    if (!actif('piloteAutomatique')) return null
    // Le message doit être une proposition d'un fil de CE compte.
    const { data: lead } = await supabaseAdmin.from('leads').select('id, artisan_id, nom_prospect, canal, prise_en_main').eq('id', p.leadId).maybeSingle()
    if (!lead || lead.artisan_id !== uid || lead.prise_en_main === true) return null
    // WhatsApp, Messenger, Instagram (fenêtre de 24 h, jeton) et Le Bon Coin (l'artisan colle lui-même la réponse) : jamais en pilote.
    if (estCanalConversation(lead.canal)) return null
    const { data: m } = await supabaseAdmin.from('messages').select('id, etat').eq('id', p.messageId).eq('lead_id', lead.id).maybeSingle()
    if (!m || m.etat !== 'proposition') return null
    const d = await decider(uid, 'reponse_prospect', undefined)
    if (!d.auto) return null
    const libelle = `Réponse à ${String(p.nomProspect ?? lead.nom_prospect ?? '').trim() || 'un prospect'}`
    const r = await inserer(uid, { type: 'reponse_prospect', source: 'proposition', ref_id: m.id as string, lead_id: lead.id as string, libelle }, maintenant)
    if (r) await prevenir(uid, libelle, 'reponse_prospect')
    return r
  } catch (e) {
    console.error('[pilote] mise en file (proposition) :', e instanceof Error ? e.message : e)
    return null
  }
}

/** La file d'un compte : ce qui attend, puis les 30 dernières issues. */
export async function lireFile(uid: string): Promise<{ attente: LigneFile[]; recentes: LigneFile[] }> {
  const [a, r] = await Promise.all([
    supabaseAdmin.from(FILE).select(COLONNES_FILE).eq('artisan_id', uid).in('statut', ['a_partir', 'en_cours']).order('part_le', { ascending: true }).limit(50),
    supabaseAdmin.from(FILE).select(COLONNES_FILE).eq('artisan_id', uid).not('statut', 'in', '(a_partir,en_cours)').order('prete_le', { ascending: false }).limit(30),
  ])
  if (a.error || r.error) throw new Error(a.error?.message ?? r.error?.message ?? 'file illisible')
  return { attente: (a.data ?? []) as LigneFile[], recentes: (r.data ?? []) as LigneFile[] }
}

/** L'artisan annule UNE action en attente : elle ne partira pas (la carte ou la proposition reste, à valider à la main). */
export async function annulerAuto(uid: string, id: string, motif = 'annulée par l’artisan'): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from(FILE)
    .update({ statut: 'annulee', motif: motif.slice(0, 300), traite_le: new Date().toISOString() })
    .eq('id', id).eq('artisan_id', uid).eq('statut', 'a_partir').select('id')
  if (error) throw new Error(error.message)
  return (data ?? []).length === 1
}

/** L'objet préparé a été traité à la main (validé, écarté, confirmé, refusé) : sa ligne de file, si elle attend, est annulée. */
export async function annulerParRef(uid: string, source: 'carte' | 'proposition', refId: string, motif: string): Promise<boolean> {
  if (!actif('piloteAutomatique')) return false
  const { data, error } = await supabaseAdmin.from(FILE)
    .update({ statut: 'annulee', motif: motif.slice(0, 300), traite_le: new Date().toISOString() })
    .eq('artisan_id', uid).eq('cle', cleIdempotence(source, refId)).eq('statut', 'a_partir').select('id')
  if (error) return false
  return (data ?? []).length === 1
}

/** Coupe tout : chaque action en attente est annulée, d'un coup (désactivation immédiate). Rend le nombre annulé. */
export async function annulerTout(uid: string, motif: string): Promise<number> {
  const { data, error } = await supabaseAdmin.from(FILE)
    .update({ statut: 'annulee', motif: motif.slice(0, 300), traite_le: new Date().toISOString() })
    .eq('artisan_id', uid).eq('statut', 'a_partir').select('id')
  if (error) throw new Error(error.message)
  return (data ?? []).length
}

/** Annule ce qui attend pour UN type (le type vient d'être décoché). */
export async function annulerType(uid: string, type: TypePilote, motif: string): Promise<number> {
  const { data, error } = await supabaseAdmin.from(FILE)
    .update({ statut: 'annulee', motif: motif.slice(0, 300), traite_le: new Date().toISOString() })
    .eq('artisan_id', uid).eq('type', type).eq('statut', 'a_partir').select('id')
  if (error) throw new Error(error.message)
  return (data ?? []).length
}

/** Enregistre les réglages ; ce qui n'est plus permis est annulé AUSSITÔT. */
export async function ecrireReglages(uid: string, r: ReglagesPilote): Promise<{ reglages: ReglagesPilote; annulees: number }> {
  const propres = lireReglagesPilote(r)
  const { error } = await supabaseAdmin.from(REGLAGES).upsert({ artisan_id: uid, actif: propres.actif, types: propres.types, maj_le: new Date().toISOString() }, { onConflict: 'artisan_id' })
  if (error) throw new Error(error.message)
  let annulees = 0
  if (!propres.actif) annulees = await annulerTout(uid, 'pilote automatique coupé')
  else for (const t of Object.keys(LIBELLE_TYPE) as TypePilote[]) if (!propres.types[t]) annulees += await annulerType(uid, t, 'type d’action désactivé')
  return { reglages: propres, annulees }
}

/**
 * L'offre du compte vient de changer (audit du 21/10, F1) : hors Signature, tout ce qui attendait dans la file est annulé AUSSITÔT
 * (les cartes et propositions restent, à valider à la main). Appelée par le webhook Stripe (retour à l'offre gratuite) et par
 * l'alignement sur l'abonnement (lib/abonnementSync.ts). Ne lève jamais.
 */
export async function apresChangementOffre(uid: string, plan: string | null | undefined): Promise<number> {
  try {
    if (!actif('piloteAutomatique') || peut(plan, 'assistant.pilote')) return 0
    return await annulerTout(uid, 'offre sans pilote automatique')
  } catch { return 0 }
}

/** Les tables existent-elles (0174 appliquée) ? Sans elles : routes 503, rien n'entre en file. */
export async function piloteDisponible(): Promise<boolean> {
  const { error } = await supabaseAdmin.from(FILE).select('id').limit(1)
  return !error
}
