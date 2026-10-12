// lib/canaux/rangement.ts — ranger un message entrant (Meta ou Le Bon Coin) dans la boîte de l'artisan : la bonne liaison,
// l'idempotence, la conversation retrouvée ou ouverte, le message. Sans base ni réseau : le magasin est injecté (Supabase en
// production, lib/canaux/serveur.ts ; en mémoire dans scripts/canaux-meta-e2e.mjs). Aucun appel à l'IA ici : la réponse se
// prépare APRÈS la réponse 200 au webhook (lib/canaux/serveur.ts, preparerReponseCanal).
import { LIBELLE_CANAL, type CanalMeta, type EntrantMeta } from './meta.ts'

export type CanalConversation = CanalMeta | 'leboncoin'

export type Liaison = { id: string; artisan_id: string; type: string; actif: boolean }

export type LeadTrouve = { id: string; statut: string | null }

export type NouveauLead = {
  artisan_id: string; canal: CanalConversation; canal_id: string; canal_externe_id: string
  nom_prospect: string; contact: string | null; message: string
  canal_dernier_entrant_le: string; canal_lien_reponse: string | null
}

export type NouveauMessage = { lead_id: string; canal: CanalConversation; canal_id: string; externe_id: string; contenu: string; sent_at: string }

export interface MagasinCanaux {
  /** La liaison active d'un compte Meta (type + identifiant reçu dans le webhook), ou null. */
  liaison(type: CanalMeta, externeId: string): Promise<Liaison | null>
  /** Pose la marque d'idempotence. true = première fois ; false = déjà vu (rejeu ou course perdue). Atomique. */
  marquer(canalId: string, externeId: string): Promise<boolean>
  /** Retire la marque quand le rangement a échoué après elle : le rejeu de Meta ne doit pas être pris pour un doublon. */
  oublier(canalId: string, externeId: string): Promise<void>
  /**
   * La conversation récente (mise à jour depuis `depuisIso`, 30 jours) avec cette personne sur ce canal, ou une nouvelle. ATOMIQUE
   * par personne : deux webhooks presque simultanés d'un nouveau client (WhatsApp envoie un webhook par message) ne doivent pas
   * ouvrir deux fils. En base : canaux_conversation_ouvrir (0139), sous verrou consultatif.
   */
  ouvrirConversation(l: NouveauLead, depuisIso: string): Promise<LeadTrouve & { nouveau: boolean }>
  /** Met à jour la conversation existante à l'arrivée d'un message du client. */
  rafraichir(leadId: string, champs: { canal_dernier_entrant_le: string; statut?: string; canal_lien_reponse?: string | null }): Promise<void>
  ajouterMessage(m: NouveauMessage): Promise<string>
}

export type Range = { lead_id: string; message_id: string; artisan_id: string; canal: CanalConversation; nouveau: boolean; texte: string }
export type IssueRangement = { etat: 'range'; r: Range } | { etat: 'doublon' } | { etat: 'inconnu' }

const TRENTE_JOURS = 30 * 24 * 3600 * 1000

/** La balle revient chez l'artisan : `repondu` → `en_discussion` (condition d'arrêt des relances). Gagné/perdu ne bougent pas. */
export function statutApresEntrant(statut: string | null): string | undefined {
  if (statut === 'gagne' || statut === 'perdu' || statut === 'nouveau' || statut === null) return undefined
  return 'en_discussion'
}

/** Le nom provisoire d'un client dont Meta ne donne pas le nom (Messenger, Instagram) : lu plus tard par la Graph API. */
export const nomProvisoire = (canal: CanalConversation) => `Client ${LIBELLE_CANAL[canal]}`

async function rangerCommun(
  magasin: MagasinCanaux,
  p: { liaison: Liaison; canal: CanalConversation; personne: string; idMessage: string; nom: string; contact: string | null; texte: string; recuLe: string; lien: string | null; maintenant: number },
): Promise<IssueRangement> {
  if (!(await magasin.marquer(p.liaison.id, p.idMessage))) return { etat: 'doublon' }
  try {
    const o = await magasin.ouvrirConversation({
      artisan_id: p.liaison.artisan_id, canal: p.canal, canal_id: p.liaison.id, canal_externe_id: p.personne,
      nom_prospect: p.nom, contact: p.contact, message: p.texte, canal_dernier_entrant_le: p.recuLe, canal_lien_reponse: p.lien,
    }, new Date(p.maintenant - TRENTE_JOURS).toISOString())
    const leadId = o.id
    const nouveau = o.nouveau
    if (!nouveau) {
      const statut = statutApresEntrant(o.statut)
      await magasin.rafraichir(leadId, { canal_dernier_entrant_le: p.recuLe, ...(statut ? { statut } : {}), ...(p.lien ? { canal_lien_reponse: p.lien } : {}) })
    }
    const messageId = await magasin.ajouterMessage({ lead_id: leadId, canal: p.canal, canal_id: p.liaison.id, externe_id: p.idMessage, contenu: p.texte, sent_at: p.recuLe })
    return { etat: 'range', r: { lead_id: leadId, message_id: messageId, artisan_id: p.liaison.artisan_id, canal: p.canal, nouveau, texte: p.texte } }
  } catch (e) {
    await magasin.oublier(p.liaison.id, p.idMessage).catch(() => {})
    throw e
  }
}

/** Range un message Meta. `inconnu` : aucun artisan n'a relié ce compte (ou la liaison est coupée) — on n'en fait rien. */
export async function rangerEntrantMeta(e: EntrantMeta, magasin: MagasinCanaux, maintenant = Date.now()): Promise<IssueRangement> {
  const liaison = await magasin.liaison(e.canal, e.compte)
  if (!liaison || !liaison.actif || liaison.type !== e.canal) return { etat: 'inconnu' }
  return rangerCommun(magasin, {
    liaison, canal: e.canal, personne: e.expediteur, idMessage: e.id_message,
    nom: e.nom ?? (e.canal === 'whatsapp' ? `+${e.expediteur}` : nomProvisoire(e.canal)),
    contact: e.canal === 'whatsapp' ? `+${e.expediteur}` : null,
    texte: e.texte, recuLe: e.recu_le, lien: null, maintenant,
  })
}

/** Range une notification Le Bon Coin reçue dans la boîte branchée `boite` (une ligne `canaux` de type email). */
export async function rangerNotificationLeboncoin(
  n: { cle_conversation: string; prenom: string | null; texte: string; lien: string },
  boite: Liaison, idMessage: string, recuLe: string, magasin: MagasinCanaux, maintenant = Date.now(),
): Promise<IssueRangement> {
  return rangerCommun(magasin, {
    liaison: boite, canal: 'leboncoin', personne: n.cle_conversation, idMessage,
    // Le contact reste VIDE : l'adresse de l'expéditeur est celle de Le Bon Coin, pas du client — y répondre par e-mail
    // écrirait à un robot (et la relance du jour 2 aussi).
    nom: n.prenom ?? nomProvisoire('leboncoin'), contact: null, texte: n.texte, recuLe, lien: n.lien, maintenant,
  })
}
