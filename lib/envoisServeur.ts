// Les ENVOIS au client, en un seul endroit, appelés APRÈS l'authentification par les routes de l'interface ET par le pilote
// automatique (lib/pilote/executeur.ts, passage chaque minute). Serveur seulement, clé de service.
//
// Extraits tels quels des routes (21/10) pour que le pilote automatique n'ait AUCUN chemin d'envoi à lui : mêmes contrôles
// (propriété du compte, statut, mentions légales bloquantes, canal de la conversation), même écriture après coup. Chaque
// lecture et chaque écriture porte `artisan_id = uid` (ou la propriété vérifiée de la conversation) : la clé de service passe
// outre la RLS, ce filtre est la barrière. `uid` vient TOUJOURS d'une session vérifiée ou d'une ligne de la file du pilote
// rattachée à ce compte — jamais d'un corps de requête.
//
// Les envois AVEC PDF (devis, facture) sont dans lib/envoisPdfServeur.ts (le moteur PDF ne se charge pas avec les messages).
// Rendu : { status, json } — la route le renvoie tel quel ; le pilote lit `status === 200`.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/email'
import { planifierRelances } from '@/lib/relances'
import { consommerLimiteStricte, libererLimite } from '@/lib/limites'
import { avecMentionAssistant } from '@/lib/mentionAssistant'
import { completerLeadCanal, envoyerReponseCanal, type IssueEnvoi } from '@/lib/canaux/serveur'

export type ReponseEnvoi = { status: number; json: Record<string, unknown> }
const rep = (status: number, json: Record<string, unknown>): ReponseEnvoi => ({ status, json })

// ── Messages (Poste de pilotage : réponse proposée, réponse de l'artisan) ───────────────────────────────

type LeadMsg = { id: string; artisan_id: string; nom_prospect: string | null; contact: string | null; message: string | null; statut: string | null; prise_en_main: boolean | null; canal: string | null }

export async function leadDuCompte(leadId: string, uid: string): Promise<LeadMsg | null> {
  const { data } = await supabaseAdmin.from('leads').select('id, artisan_id, nom_prospect, contact, message, statut, prise_en_main, canal').eq('id', leadId).maybeSingle()
  const lead = (data as LeadMsg | null) ?? null
  return lead && lead.artisan_id === uid ? lead : null
}

function traceEnvoi(e: IssueEnvoi): { canal_id?: string; externe_id?: string } {
  if (!e.traite || !e.ok) return {}
  return { ...(e.canal_id ? { canal_id: e.canal_id } : {}), ...(e.externe_id ? { externe_id: e.externe_id } : {}) }
}
function reponseCanal(e: IssueEnvoi): { canal?: string; lien?: string } {
  if (!e.traite || !e.ok) return {}
  return { canal: e.canal, ...(e.manuel ? { lien: e.manuel.lien } : {}) }
}

/** Un envoi déclenché par le PILOTE AUTOMATIQUE (aucun clic de l'artisan au moment du départ). */
export type OptionsEnvoi = { automatique?: boolean }
/** Fenêtre de la réclamation d'envoi d'une proposition (fenêtre fixe : une semaine rend la bascule de fenêtre négligeable). */
const RECLAMATION_S = 7 * 86_400
export const cleReclamation = (messageId: string) => `envoi-proposition:${messageId}`

/**
 * L'e-mail au prospect, au nom de l'artisan (marque blanche). Envoi AUTOMATIQUE (audit du 21/10, E2) : la mention de l'assistant IA
 * (règlement IA, art. 50 ; lib/mentionAssistant.ts) et `anonyme: true` — plafond de 3 par jour et par destinataire et part anonyme du
 * plafond quotidien (lib/email.ts), comme la réponse automatique de /api/leads.
 */
async function emailProspect(uid: string, to: string, texte: string, o: OptionsEnvoi): Promise<boolean> {
  const { data: a } = await supabaseAdmin.from('artisans').select('nom, email').eq('id', uid).maybeSingle()
  const nom = (a?.nom as string | null)?.trim() || 'Votre artisan'
  const signe = `${texte}\n\n— ${(a?.nom as string | null) ?? ''}`
  const corps = o.automatique ? avecMentionAssistant(signe, a?.nom as string | null) : signe
  const r = await sendEmail({
    to, fromName: nom, subject: `Réponse de ${(a?.nom as string | null) ?? 'votre artisan'}`, text: corps,
    replyTo: (a?.email as string | null) ?? undefined, transactionnel: true, ...(o.automatique ? { anonyme: true } : {}),
  }).catch(() => ({ ok: false }))
  return !!r.ok
}

/**
 * Valider une réponse PROPOSÉE : elle devient réelle pour le client et part (canal de la conversation, sinon e-mail).
 * IDEMPOTENCE (21/10) : l'envoi d'UNE proposition est réclamé une fois (compteur atomique, fail-closed) — le clic de l'artisan et
 * le pilote automatique, ou deux onglets, ne la font jamais partir deux fois. Un envoi qui ÉCHOUE rend la réclamation (M3).
 * Envoi automatique : l'e-mail part AVANT que le message soit marqué envoyé ; refusé (plafond, panne), la proposition reste à valider.
 */
export async function validerPropositionServeur(uid: string, lead: LeadMsg, messageId: string, texteRetouche?: string | null, o: OptionsEnvoi = {}): Promise<ReponseEnvoi> {
  const { data: prop } = await supabaseAdmin.from('messages').select('id, contenu, etat').eq('id', messageId).eq('lead_id', lead.id).maybeSingle()
  if (!prop || prop.etat !== 'proposition') return rep(404, { error: 'Proposition introuvable ou déjà traitée.' })
  const cle = cleReclamation(prop.id as string)
  if (!(await consommerLimiteStricte(cle, 1, RECLAMATION_S))) return rep(409, { error: 'Cette réponse est déjà en cours d’envoi.' })
  let envoyee = false
  try {
    const texte = typeof texteRetouche === 'string' && texteRetouche.trim() ? texteRetouche.trim().slice(0, 4000) : (prop.contenu as string)
    const envoi = await envoyerReponseCanal(await completerLeadCanal(lead), texte)
    if (envoi.traite && !envoi.ok) return rep(envoi.statut, { error: envoi.erreur, hors_fenetre: !!envoi.hors_fenetre })
    const parEmail = !envoi.traite && !!lead.contact && lead.contact.includes('@')
    let emailed = false
    if (o.automatique && parEmail) {
      emailed = await emailProspect(uid, lead.contact as string, texte, o)
      if (!emailed) return rep(502, { error: 'L’e-mail n’a pas pu partir (plafond ou panne) : la réponse reste à valider.' })
    }
    await supabaseAdmin.from('messages').update({ etat: null, contenu: texte, sent_at: new Date().toISOString(), ...traceEnvoi(envoi) }).eq('id', prop.id).eq('lead_id', lead.id)
    envoyee = true
    // `repondu` : la balle est chez le prospect — c'est le statut que le cron des relances exige.
    await supabaseAdmin.from('leads').update({ statut: lead.statut === 'gagne' || lead.statut === 'perdu' ? lead.statut : 'repondu', updated_at: new Date().toISOString(), lu_le: new Date().toISOString() }).eq('id', lead.id).eq('artisan_id', uid)
    if (envoi.traite) return rep(200, { ok: true, emailed: false, ...reponseCanal(envoi) })
    if (lead.statut !== 'gagne' && lead.statut !== 'perdu') await planifierRelances(lead.id)
    if (!o.automatique && parEmail) emailed = await emailProspect(uid, lead.contact as string, texte, o)
    return rep(200, { ok: true, emailed })
  } finally {
    // M3 : rien n'est parti (canal refusé, e-mail refusé, erreur) → la réclamation est rendue, l'artisan peut réessayer aussitôt.
    if (!envoyee) await libererLimite(cle)
  }
}

/** Une réponse écrite (par l'artisan, ou par l'assistant et confirmée — ou partie par le pilote) part dans le fil et par le canal / l'e-mail. */
export async function repondreServeur(uid: string, lead: LeadMsg, contenuBrut: string, o: OptionsEnvoi = {}): Promise<ReponseEnvoi> {
  const contenu = contenuBrut.trim().slice(0, 4000)
  if (!contenu) return rep(400, { error: 'Message vide' })
  const envoi = await envoyerReponseCanal(await completerLeadCanal(lead), contenu)
  if (envoi.traite && !envoi.ok) return rep(envoi.statut, { error: envoi.erreur, hors_fenetre: !!envoi.hors_fenetre })
  const parEmail = !envoi.traite && !!lead.contact && lead.contact.includes('@')
  let emailed = false
  if (o.automatique && parEmail) {
    emailed = await emailProspect(uid, lead.contact as string, contenu, o)
    if (!emailed) return rep(502, { error: 'L’e-mail n’a pas pu partir (plafond ou panne) : rien n’a été envoyé.' })
  }
  await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'out', type: 'manuel', contenu, ...traceEnvoi(envoi) })
  // `repondu` : l'artisan vient de parler, la balle repasse au prospect (`en_discussion` éteindrait les relances).
  await supabaseAdmin.from('leads').update({ statut: lead.statut === 'gagne' || lead.statut === 'perdu' ? lead.statut : 'repondu', updated_at: new Date().toISOString(), lu_le: new Date().toISOString() }).eq('id', lead.id).eq('artisan_id', uid)
  if (envoi.traite) return rep(200, { ok: true, emailed: false, ...reponseCanal(envoi) })
  if (lead.statut !== 'gagne' && lead.statut !== 'perdu') await planifierRelances(lead.id)
  if (!o.automatique && parEmail) emailed = await emailProspect(uid, lead.contact as string, contenu, o)
  return rep(200, { ok: true, emailed })
}
