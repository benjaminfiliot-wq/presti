// PILOTE AUTOMATIQUE — l'ORCHESTRATEUR du départ (pur, injecté : ni réseau ni base). Le détail des étapes est en tête de
// lib/pilote/executeur.ts, qui lui fournit les dépendances réelles ; scripts/pilote-qa.mjs le rejoue avec une file en mémoire.
//
// Audit offensif du 21/10 : un BUDGET de temps (le tic a 60 s, M2) — ce qui n'est pas traité attend le passage suivant ; les
// lignes restées « en_cours » plus de 5 minutes (passage interrompu) sont REPRISES ; le plafond du jour est tenu par un jeton
// atomique par compte (M2) ; un compte suspendu ne fait rien partir (M1) ; une carte née d'une conversation où l'assistant a lu
// du contenu écrit par un tiers ne part jamais seule (M4) ; une réponse rejoue la limite de messages par conversation et la
// plage horaire de Ma plateforme (E2).
// 02/11 (§3.2 du prompt de Benj du 01/11) : toute ligne rattachée à une conversation relit, juste avant de partir, les derniers messages
// ENTRANTS du client ; un sujet d'escalade (litige, sinistre, avocat, urgence…) la renvoie à la main (motif « escalade »).
import {
  LIBELLE_MOTIF, LOT_PAR_PASSAGE, OUTILS_EXECUTABLES_PILOTE, decisionPilote, etatEcheance, typePiloteDeOutil,
  type LignePrix, type MotifManuel, type ReglagesPilote, type StatutFile, type TypePilote,
} from './regles'

export type LigneAuto = { id: string; artisan_id: string; type: TypePilote; source: 'carte' | 'proposition'; ref_id: string; lead_id: string | null; libelle: string; prete_le: string; part_le: string }
export type ContexteCompte = { plan: string | null; leads_pause: boolean; suspendu: boolean; reglages: ReglagesPilote; parties: number }
export type Issue = { ok: true; resume: string } | { ok: false; deja: boolean; erreur: string }
/** L'état d'une conversation au moment de répondre (réponse à un prospect). */
export type EtatConversation = 'ok' | 'prise_en_main' | 'limite' | 'horaire'

/** Budget de temps d'un passage (le tic a 60 s et d'autres étapes) ; reprise des lignes « en_cours » après 5 min. */
export const BUDGET_PASSAGE_MS = 20_000
export const REPRISE_EN_COURS_MS = 5 * 60_000

export type DependancesFile = {
  drapeau: () => boolean
  /** Remet « a_partir » les lignes « en_cours » réclamées avant `avant` (passage interrompu). Rend le nombre repris. */
  reprendre: (avant: Date) => Promise<number>
  /** Lignes a_partir dont part_le ≤ maintenant, les plus anciennes d'abord. */
  mures: (maintenant: Date, n: number) => Promise<LigneAuto[]>
  /** a_partir → en_cours en UNE instruction ; true seulement pour l'appelant qui a fait la transition. */
  reclamer: (l: LigneAuto, maintenant: Date) => Promise<boolean>
  /** en_cours → statut final (ou de nouveau a_partir pour attendre). */
  terminer: (l: LigneAuto, statut: StatutFile, motif: string | null, maintenant: Date) => Promise<void>
  contexte: (uid: string, maintenant: Date) => Promise<ContexteCompte>
  /** Les lignes du devis visé (garde-fou des prix), null si introuvable. */
  lignesDevis: (l: LigneAuto) => Promise<LignePrix[] | null>
  /**
   * La carte visée, si elle attend encore (null : introuvable ou déjà traitée) ; `contenuClientLu` : marque posée à sa création ;
   * `leadId` (facultatif) : la conversation où elle écrit (réponse, relance du devis ou de la facture d'une conversation), pour relire
   * les messages du client avant le départ (§3.2) — absent ou null : aucune conversation connue.
   */
  carteDe: (l: LigneAuto) => Promise<{ outil: string; contenuClientLu: boolean; leadId?: string | null } | null>
  /** Pour une réponse à un prospect : prise en main, limite de réponses de l'IA atteinte, hors plage horaire, ou ok. */
  etatConversation: (l: LigneAuto, maintenant: Date) => Promise<EtatConversation>
  /**
   * §3.2 (02/11) — les derniers messages ENTRANTS de cette conversation parlent-ils d'un sujet d'escalade (MOTS_ESCALADE_TOUJOURS ou
   * les mots de l'artisan, lib/pilote/regles.ts sujetEscalade) ? Lecture impossible : lever (la ligne passe en échec, rien ne part).
   * Facultative pour les faux d'avant le 02/11 ; la vraie (lib/pilote/executeur.ts) la fournit toujours.
   */
  escalade?: (l: LigneAuto, leadId: string, maintenant: Date) => Promise<boolean>
  /** Le jeton du plafond quotidien (atomique, fail-closed) : false = plafond atteint. */
  jeton: (uid: string) => Promise<boolean>
  executer: (l: LigneAuto) => Promise<Issue>
}

export type Bilan = { prises: number; parties: number; manuel: number; annulees: number; echecs: number; attente: number; reprises: number; reportees: number }

export async function traiterFile(d: DependancesFile, maintenant = new Date(), lot = LOT_PAR_PASSAGE, budgetMs = BUDGET_PASSAGE_MS, horloge: () => number = () => Date.now()): Promise<Bilan> {
  const bilan: Bilan = { prises: 0, parties: 0, manuel: 0, annulees: 0, echecs: 0, attente: 0, reprises: 0, reportees: 0 }
  if (!d.drapeau()) return bilan
  const debut = horloge()
  bilan.reprises = await d.reprendre(new Date(maintenant.getTime() - REPRISE_EN_COURS_MS))
  const lignes = await d.mures(maintenant, lot)
  const contextes = new Map<string, ContexteCompte>()
  for (const l of lignes) {
    // Budget épuisé : le reste attend le passage suivant (rien n'est réclamé, donc rien ne reste coincé).
    if (horloge() - debut > budgetMs) { bilan.reportees++; continue }
    if (!(await d.reclamer(l, maintenant))) continue
    bilan.prises++
    const fin = async (statut: StatutFile, motif: string | null) => {
      await d.terminer(l, statut, motif, maintenant)
      if (statut === 'partie') bilan.parties++
      else if (statut === 'manuel') bilan.manuel++
      else if (statut === 'annulee') bilan.annulees++
      else if (statut === 'echec') bilan.echecs++
      else if (statut === 'a_partir') bilan.attente++
    }
    const manuel = (m: MotifManuel) => fin('manuel', LIBELLE_MOTIF[m])
    try {
      if (etatEcheance(l, maintenant) === 'trop_ancienne') { await manuel('trop_ancienne'); continue }
      let c = contextes.get(l.artisan_id)
      if (!c) { c = await d.contexte(l.artisan_id, maintenant); contextes.set(l.artisan_id, c) }
      if (c.suspendu) { await manuel('suspendu'); continue }
      let outil: string | undefined
      let leadCarte: string | null = null
      if (l.source === 'carte') {
        const carte = await d.carteDe(l)
        if (!carte) { await fin('annulee', 'carte introuvable ou déjà traitée'); continue }
        if (!OUTILS_EXECUTABLES_PILOTE.includes(carte.outil) || typePiloteDeOutil(carte.outil) !== l.type) { await manuel('jamais_auto'); continue }
        if (carte.contenuClientLu) { await manuel('contenu_client'); continue }
        outil = carte.outil
        leadCarte = carte.leadId ?? null
      }
      const lignesPrix = l.type === 'envoi_devis' ? (await d.lignesDevis(l)) ?? [] : undefined
      const dec = decisionPilote({ drapeau: d.drapeau(), plan: c.plan, reglages: c.reglages, type: l.type, outil, lignes: lignesPrix, partiesDepuis24h: c.parties })
      if (!dec.auto) {
        // Le pilote a été coupé (ou le type décoché) entre-temps : la ligne aurait dû être annulée ; elle l'est maintenant.
        if (dec.motif === 'inactif' || dec.motif === 'type_inactif') await fin('annulee', LIBELLE_MOTIF[dec.motif])
        else await manuel(dec.motif)
        continue
      }
      if (l.type === 'reponse_prospect') {
        if (c.leads_pause) { await fin('a_partir', null); continue } // pause de l'artisan : la file attend
        const e = await d.etatConversation(l, maintenant)
        if (e === 'prise_en_main') { await fin('annulee', 'conversation reprise en main par l’artisan'); continue }
        if (e === 'limite') { await manuel('limite_conversation'); continue }
        if (e === 'horaire') { await fin('a_partir', null); continue } // hors plage horaire : elle partira à l'ouverture (ou passera en manuel après 24 h)
      }
      // §3.2 (prompt de Benj du 01/11) : jamais parler au nom de l'artisan sur un sujet d'escalade. Chaque type de la file écrit à un
      // client ; rattachée à une conversation, la ligne relit juste avant de partir les derniers messages ENTRANTS (mots de l'artisan et
      // MOTS_ESCALADE_TOUJOURS) : un sujet sensible → validation manuelle. Sans conversation connue, rien n'est relu et la ligne part.
      const leadId = l.lead_id ?? leadCarte
      if (leadId && d.escalade && (await d.escalade(l, leadId, maintenant))) { await manuel('escalade'); continue }
      // Le plafond du jour, tenu par un jeton atomique par compte (deux passages ou deux instances ne le dépassent pas).
      if (!(await d.jeton(l.artisan_id))) { await manuel('plafond'); continue }
      const r = await d.executer(l)
      if (r.ok) { c.parties++; await fin('partie', r.resume.slice(0, 300)) }
      else if (r.deja) await fin('annulee', `déjà traitée : ${r.erreur}`.slice(0, 300))
      else await fin('echec', r.erreur.slice(0, 300))
    } catch (e) {
      await fin('echec', (e instanceof Error ? e.message : 'erreur inattendue').slice(0, 300)).catch(() => {})
    }
  }
  return bilan
}
