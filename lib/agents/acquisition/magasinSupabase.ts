// lib/agents/acquisition/magasinSupabase.ts — l'implémentation de MagasinSocle (fiche 026-060), écrite par Claude Code.
//
// Une méthode par fonction `public.acq_*` de la migration 0105 (supabase/migrations/0105_acquisition_socle.sql), appelée
// par `supabaseAdmin.rpc(...)` avec la clé de service. Une erreur de la base LÈVE (la route qui appelle cette méthode la
// compte en échec) : aucun avalage silencieux ici, contrairement à lib/agents/bus.ts qui traduit l'erreur en résultat.
//
// Le texte brut d'une erreur Postgres (noms de tables, de contraintes…) ne sort jamais tel quel : le message est repris
// dans une Error, préfixé par le nom de la fonction appelée, pour que la route sache où ça a cassé.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type {
  Annonceur, Candidat, Canal, Classement, ClesOpposition, Compteurs, Conversation, ContactPasse, DecisionAcquisition, EtatEnvoi,
  DecisionTranchee, Envoyeur, EnvoiApprouve, EnvoiEnAttente, EnvoiPrepare, Etape, Evenement, LienRdv, MagasinEchanges,
  MagasinSocle, MagasinEnvoi, MaquetteEtat, NomAgent, PatchProspect, PreuveEnvoi, ProspectReserve, ReponseARepondre, ReponseProspect,
  ResultatPreparation, ResultatRegle, Signal, Jauge, TypeDecision, Verdicts,
} from '@/lib/agents/acquisition/contrat'

async function appeler<T>(fonction: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabaseAdmin.rpc(fonction, args)
  if (error) throw new Error(`[magasinSupabase] ${fonction} : ${error.message}`)
  return data as T
}

export const magasinSupabase: MagasinSocle & MagasinEchanges & MagasinEnvoi = {
  async etatEnvoi(): Promise<EtatEnvoi> {
    const { data, error } = await supabaseAdmin.rpc('acq_etat_envoi', {})
    if (error) throw new Error(`[magasinSupabase] acq_etat_envoi : ${error.message}`)
    return data as EtatEnvoi
  },
  async signal(s: Signal): Promise<void> {
    await appeler<unknown>('acq_signal', { p: s })
  },
  async modelesSuspendus(): Promise<string[]> {
    return appeler<string[]>('acq_modeles_suspendus', {})
  },
  async suspendreModele(modeleId: string, motif: string): Promise<void> {
    await appeler<unknown>('acq_modele_suspendre', { p_modele: modeleId, p_motif: motif, p_par: 'facteur' })
  },
  async jaugeConsommer(fournisseur: string, n: number): Promise<boolean> {
    const periode = new Date().toISOString().slice(0, 10)
    return appeler<boolean>('acq_jauge_consommer', { p_fournisseur: fournisseur, p_periode: periode, p_n: n, p_plafond: 200 })
  },
  async jauges(): Promise<Jauge[]> {
    return appeler<Jauge[]>('acq_jauges', {})
  },
  async echantillonDuSoir(jour: string): Promise<EnvoiApprouve[]> {
    return appeler<EnvoiApprouve[]>('acq_echantillon_du_soir', { p_jour: jour })
  },
  async enPause(agent: NomAgent): Promise<boolean> {
    return appeler<boolean>('acq_en_pause', { p_agent: agent })
  },

  async enregistrerCandidats(c: Candidat[]) {
    return appeler<{ ajoutes: number; ignores: number }>('acq_candidats_enregistrer', { p: c })
  },

  async reserver(etape: 'candidat' | 'recense', limite: number, bailSecondes: number): Promise<ProspectReserve[]> {
    return appeler<ProspectReserve[]>('acq_reserver', { p_etape: etape, p_limite: limite, p_bail_s: bailSecondes })
  },

  async mettreAJour(id: string, depuis: Etape, vers: Etape, patch: PatchProspect): Promise<boolean> {
    return appeler<boolean>('acq_prospect_mettre_a_jour', { p_id: id, p_depuis: depuis, p_vers: vers, p_patch: patch })
  },

  async estOppose(cles: ClesOpposition): Promise<boolean> {
    return appeler<boolean>('acq_oppose', { p_cles: cles })
  },

  async opposer(cles: ClesOpposition, motif: string, source: string, expireLe?: string): Promise<void> {
    await appeler<null>('acq_opposer', { p_cles: cles, p_motif: motif, p_source: source, p_expire_le: expireLe ?? null })
  },

  async enregistrerAnnonceurs(a: Annonceur[]): Promise<number> {
    return appeler<number>('acq_annonceurs_enregistrer', { p: a })
  },

  async evenement(e: Evenement): Promise<void> {
    await appeler<null>('acq_evenement', { p_agent: e.agent, p_type: e.type, p_resume: e.resume, p_objet: e.objet_id ?? null })
  },

  // — MagasinEchanges (fiche 026-061, migration 0106) — une méthode par fonction acq_* de 0106 —

  async plafondDuJour(canal: Canal, envoyeur?: Envoyeur): Promise<Compteurs | null> {
    return appeler<Compteurs | null>('acq_plafond_du_jour', { p_canal: canal, p_envoyeur: envoyeur ?? '*' })
  },

  async envoisDuJour(canal: Canal, envoyeur?: Envoyeur): Promise<Compteurs> {
    return appeler<Compteurs>('acq_envois_du_jour', { p_canal: canal, p_envoyeur: envoyeur ?? '*' })
  },

  async prospectsPourPremierContact(canal: Canal, limite: number): Promise<ProspectReserve[]> {
    return appeler<ProspectReserve[]>('acq_prospects_pour_premier_contact', { p_canal: canal, p_limite: limite })
  },

  async prospectsPourRelance(limite: number): Promise<ProspectReserve[]> {
    return appeler<ProspectReserve[]>('acq_prospects_pour_relance', { p_limite: limite })
  },

  async prospectsPourMaquette(limite: number, froid: boolean): Promise<ProspectReserve[]> {
    return appeler<ProspectReserve[]>('acq_prospects_pour_maquette', { p_limite: limite, p_froid: froid })
  },

  async prospectsOui(limite: number): Promise<ProspectReserve[]> {
    return appeler<ProspectReserve[]>('acq_prospects_oui', { p_limite: limite })
  },

  async historiqueContacts(prospectId: string): Promise<ContactPasse[]> {
    return appeler<ContactPasse[]>('acq_historique_contacts', { p_prospect: prospectId })
  },

  async perimerEnvois(): Promise<number> {
    return appeler<number>('acq_envois_perimer', {})
  },

  async preparerEnvoi(e: EnvoiPrepare): Promise<ResultatPreparation> {
    return appeler<ResultatPreparation>('acq_envoi_preparer', { p: e })
  },

  async envoisAApprouver(limite: number): Promise<EnvoiEnAttente[]> {
    return appeler<EnvoiEnAttente[]>('acq_envois_a_approuver', { p_limite: limite })
  },

  async approuverEnvoi(id: string, verdicts: Verdicts): Promise<ResultatRegle> {
    return appeler<ResultatRegle>('acq_envoi_approuver', { p_envoi: id, p_verdicts: verdicts })
  },

  async annulerEnvoi(id: string, raison: string): Promise<void> {
    await appeler<null>('acq_envoi_annuler', { p_envoi: id, p_raison: raison })
  },

  async envoisApprouves(canal: Canal, limite: number): Promise<EnvoiApprouve[]> {
    return appeler<EnvoiApprouve[]>('acq_envois_approuves', { p_canal: canal, p_limite: limite })
  },

  async marquerEnvoye(id: string, preuve: PreuveEnvoi): Promise<void> {
    await appeler<null>('acq_envoi_envoye', { p_envoi: id, p_preuve: preuve })
  },

  async marquerEchec(id: string, raison: string): Promise<void> {
    await appeler<null>('acq_envoi_echec', { p_envoi: id, p_raison: raison })
  },

  async formulairesAPorter(limite: number, bailSecondes: number): Promise<EnvoiApprouve[]> {
    return appeler<EnvoiApprouve[]>('acq_formulaires_a_porter', { p_limite: limite, p_bail_s: bailSecondes })
  },

  async formulaireEchec(id: string, raison: string, definitif: boolean): Promise<void> {
    await appeler<null>('acq_formulaire_echec', { p_envoi: id, p_raison: raison, p_definitif: definitif })
  },

  async curseurLire(nom: string): Promise<string | null> {
    return appeler<string | null>('acq_curseur_lire', { p_nom: nom })
  },

  async curseurPoser(nom: string, valeur: string): Promise<void> {
    await appeler<null>('acq_curseur_poser', { p_nom: nom, p_valeur: valeur })
  },

  async decisionsTranchees(type: TypeDecision, limite: number): Promise<DecisionTranchee[]> {
    // Lecture générique du bus (0098) : les décisions tranchées du standardiste, filtrées par la
    // préfixe de type dans leur cle_idempotence (« acq:<type>:… » ou « acq:reponse:<id>:<type> »).
    const rows = await appeler<{ id: string; cle_idempotence: string; choix: string; tranchee_le: string }[]>(
      'ops_decisions_tranchees',
      { p_agent: 'standardiste', p_depuis: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
    )
    return rows
      .filter((r) => r.cle_idempotence === `acq:${type}` || r.cle_idempotence?.startsWith(`acq:${type}:`) || r.cle_idempotence?.endsWith(`:${type}`))
      .slice(0, limite)
      .map((r) => ({ id: r.id, type, prospect_id: null, reponse_id: null, option: r.choix, tranche_le: r.tranchee_le }))
  },

  async maquetteDe(prospectId: string): Promise<MaquetteEtat | null> {
    return appeler<MaquetteEtat | null>('acq_maquette_de', { p_prospect: prospectId })
  },

  async maquettesDuJour() {
    return appeler<{ faites_aujourdhui: number; pretes_non_utilisees: number; entrants_faites_aujourdhui: number }>('acq_maquettes_du_jour', {})
  },

  async enregistrerMaquettePrete(prospectId: string, infos: { chemin: string; empreinte: string; variante: 'A' | 'B' | null }): Promise<void> {
    await appeler<null>('acq_maquette_prete', { p_prospect: prospectId, p_infos: infos })
  },

  async creerLienMaquette(prospectId: string, objet: string, jetonHache: string, expireLe: string): Promise<void> {
    await appeler<null>('acq_maquette_lien_creer', { p_prospect: prospectId, p_objet: objet, p_jeton_hache: jetonHache, p_expire_le: expireLe })
  },

  async maquetteParJeton(jetonHache: string): Promise<MaquetteEtat | null> {
    return appeler<MaquetteEtat | null>('acq_maquette_par_jeton', { p_jeton_hache: jetonHache })
  },

  async maquettesAPurger(limite: number): Promise<MaquetteEtat[]> {
    return appeler<MaquetteEtat[]>('acq_maquettes_a_purger', { p_limite: limite })
  },

  async marquerMaquettePurgee(id: string): Promise<void> {
    await appeler<null>('acq_maquette_purgee', { p_id: id })
  },

  async reponseRecue(r: Omit<ReponseProspect, 'id'>) {
    return appeler('acq_reponse_recue', { p: r })
  },

  async reponsesATraiter(limite: number): Promise<ReponseProspect[]> {
    return appeler<ReponseProspect[]>('acq_reponses_a_traiter', { p_limite: limite })
  },

  async classerReponse(id: string, c: Classement): Promise<void> {
    await appeler<null>('acq_reponse_classer', { p_id: id, p_classement: c })
  },

  async reponsesARepondre(limite: number): Promise<ReponseARepondre[]> {
    return appeler<ReponseARepondre[]>('acq_reponses_a_repondre', { p_limite: limite })
  },

  async reponseRepondue(id: string, envoiId: string | null): Promise<void> {
    await appeler<null>('acq_reponse_repondue', { p_id: id, p_envoi: envoiId })
  },

  async reclasserReponse(decisionId: string, par: string) {
    return appeler('acq_reponse_reclasser', { p_decision: decisionId, p_par: par })
  },

  async reponsesReclassees(limite: number): Promise<ReponseARepondre[]> {
    return appeler<ReponseARepondre[]>('acq_reponses_reclassees', { p_limite: limite })
  },

  async actesFaits(reponseId: string): Promise<void> {
    await appeler<null>('acq_reponse_actes_faits', { p_id: reponseId })
  },

  async ajouterEmailEntrant(conversationId: string, email: string): Promise<boolean> {
    return appeler<boolean>('acq_entrant_email_ajouter', { p_conversation: conversationId, p_email: email })
  },

  async exportPersonne(prospectId: string): Promise<Record<string, unknown>> {
    return appeler<Record<string, unknown>>('acq_prospect_export', { p_prospect: prospectId })
  },

  async demanderEffacement(prospectId: string) {
    const effaceLe = await appeler<string | null>('acq_effacement_demander', { p_prospect: prospectId })
    return { efface_le: effaceLe ?? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() }
  },

  async conversation(id: string): Promise<Conversation | null> {
    return appeler<Conversation | null>('acq_conversation', { p_id: id })
  },

  async enregistrerConversation(c: Conversation): Promise<void> {
    await appeler<null>('acq_conversation_enregistrer', { p: c })
  },

  async creerLienRdv(prospectId: string, jetonHache: string, expireLe: string): Promise<void> {
    await appeler<null>('acq_rdv_lien_creer', { p_prospect: prospectId, p_jeton_hache: jetonHache, p_expire_le: expireLe })
  },

  async rdvParJeton(jetonHache: string): Promise<LienRdv | null> {
    return appeler<LienRdv | null>('acq_rdv_par_jeton', { p_jeton_hache: jetonHache })
  },

  async creneauxPris(depuis: string, jusqua: string): Promise<string[]> {
    return appeler<string[]>('acq_rdv_creneaux_pris', { p_depuis: depuis, p_jusqua: jusqua })
  },

  async reserverRdv(jetonHache: string, creneau: string, telephone: string): Promise<ResultatRegle> {
    return appeler<ResultatRegle>('acq_rdv_reserver', { p_jeton_hache: jetonHache, p_creneau: creneau, p_telephone: telephone })
  },

  async creerDecision(d: DecisionAcquisition) {
    return appeler<{ id: string; cree: boolean }>('acq_decision_creer', { p: d })
  },
}
