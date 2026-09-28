// TÉMOIN du juge ops-acquisition-qa (026-037) : un magasin qui appelle une fonction du SQL par méthode (OA-6, OB-7).
// Jamais importé par Presti.
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabaseAdmin.rpc(fn, args)
  if (error) throw new Error(`${fn} : ${error.code ?? 'erreur'}`)
  return data as T
}

export const magasinSupabase = {
  // MagasinSocle
  async enPause(agent: string) { return rpc<boolean>('acq_en_pause', { p_agent: agent }) },
  async enregistrerCandidats(c: unknown[]) { return rpc('acq_candidats_enregistrer', { p: c }) },
  async reserver(etape: string, limite: number, bailSecondes: number) { return rpc('acq_reserver', { p_etape: etape, p_limite: limite, p_bail_s: bailSecondes }) },
  async mettreAJour(id: string, depuis: string, vers: string, patch: unknown) { return rpc<boolean>('acq_prospect_mettre_a_jour', { p_id: id, p_depuis: depuis, p_vers: vers, p_patch: patch }) },
  async estOppose(cles: unknown) { return rpc<boolean>('acq_oppose', { p_cles: cles }) },
  async opposer(cles: unknown, motif: string, source: string, expireLe?: string) { await rpc('acq_opposer', { p_cles: cles, p_motif: motif, p_source: source, p_expire_le: expireLe ?? null }) },
  async enregistrerAnnonceurs(a: unknown[]) { return rpc<number>('acq_annonceurs_enregistrer', { p: a }) },
  async evenement(e: { agent: string; type: string; resume: string; objet?: string }) { await rpc('acq_evenement', { p_agent: e.agent, p_type: e.type, p_resume: e.resume, p_objet: e.objet ?? null }) },
  // MagasinEchanges
  async plafondDuJour(canal: string, envoyeur = '*') { return rpc('acq_plafond_du_jour', { p_canal: canal, p_envoyeur: envoyeur }) },
  async envoisDuJour(canal: string, envoyeur = '*') { return rpc('acq_envois_du_jour', { p_canal: canal, p_envoyeur: envoyeur }) },
  async prospectsPourPremierContact(canal: string, limite: number) { return rpc('acq_prospects_pour_premier_contact', { p_canal: canal, p_limite: limite }) },
  async prospectsPourRelance(limite: number) { return rpc('acq_prospects_pour_relance', { p_limite: limite }) },
  async prospectsPourMaquette(limite: number, froid: boolean) { return rpc('acq_prospects_pour_maquette', { p_limite: limite, p_froid: froid }) },
  async prospectsOui(limite: number) { return rpc('acq_prospects_oui', { p_limite: limite }) },
  async historiqueContacts(prospectId: string) { return rpc('acq_historique_contacts', { p_prospect: prospectId }) },
  async perimerEnvois() { return rpc<number>('acq_envois_perimer') },
  async preparerEnvoi(e: unknown) { return rpc('acq_envoi_preparer', { p: e }) },
  async envoisAApprouver(limite: number) { return rpc('acq_envois_a_approuver', { p_limite: limite }) },
  async approuverEnvoi(id: string, verdicts: unknown) { return rpc('acq_envoi_approuver', { p_envoi: id, p_verdicts: verdicts }) },
  async annulerEnvoi(id: string, raison: string) { await rpc('acq_envoi_annuler', { p_envoi: id, p_raison: raison }) },
  async envoisApprouves(canal: string, limite: number) { return rpc('acq_envois_approuves', { p_canal: canal, p_limite: limite }) },
  async marquerEnvoye(id: string, preuve: unknown) { await rpc('acq_envoi_envoye', { p_envoi: id, p_preuve: preuve }) },
  async marquerEchec(id: string, raison: string) { await rpc('acq_envoi_echec', { p_envoi: id, p_raison: raison }) },
  async formulairesAPorter(limite: number, bailSecondes: number) { return rpc('acq_formulaires_a_porter', { p_limite: limite, p_bail_s: bailSecondes }) },
  async formulaireEchec(id: string, raison: string, definitif: boolean) { await rpc('acq_formulaire_echec', { p_envoi: id, p_raison: raison, p_definitif: definitif }) },
  async curseurLire(nom: string) { return rpc<string | null>('acq_curseur_lire', { p_nom: nom }) },
  async curseurPoser(nom: string, valeur: string) { await rpc('acq_curseur_poser', { p_nom: nom, p_valeur: valeur }) },
  async decisionsTranchees(type: string, limite: number) { return rpc('ops_decisions_tranchees', { p_agent: 'standardiste', p_type: type, p_limite: limite }) },
  async maquetteDe(prospectId: string) { return rpc('acq_maquette_de', { p_prospect: prospectId }) },
  async maquettesDuJour() { return rpc('acq_maquettes_du_jour') },
  async enregistrerMaquettePrete(prospectId: string, infos: unknown) { await rpc('acq_maquette_prete', { p_prospect: prospectId, p_infos: infos }) },
  async creerLienMaquette(prospectId: string, objet: string, jetonHache: string, expireLe: string) { await rpc('acq_maquette_lien_creer', { p_prospect: prospectId, p_objet: objet, p_jeton_hache: jetonHache, p_expire_le: expireLe }) },
  async maquetteParJeton(jetonHache: string) { return rpc('acq_maquette_par_jeton', { p_jeton_hache: jetonHache }) },
  async maquettesAPurger(limite: number) { return rpc('acq_maquettes_a_purger', { p_limite: limite }) },
  async marquerMaquettePurgee(id: string) { await rpc('acq_maquette_purgee', { p_id: id }) },
  async reponseRecue(r: unknown) { return rpc('acq_reponse_recue', { p: r }) },
  async reponsesATraiter(limite: number) { return rpc('acq_reponses_a_traiter', { p_limite: limite }) },
  async classerReponse(id: string, c: unknown) { await rpc('acq_reponse_classer', { p_id: id, p: c }) },
  async reponsesARepondre(limite: number) { return rpc('acq_reponses_a_repondre', { p_limite: limite }) },
  async reponseRepondue(id: string, envoiId: string | null) { await rpc('acq_reponse_repondue', { p_id: id, p_envoi: envoiId }) },
  async reclasserReponse(decisionId: string, par: string) { return rpc('acq_reponse_reclasser', { p_decision: decisionId, p_par: par }) },
  async reponsesReclassees(limite: number) { return rpc('acq_reponses_reclassees', { p_limite: limite }) },
  async actesFaits(reponseId: string) { await rpc('acq_reponse_actes_faits', { p_id: reponseId }) },
  async ajouterEmailEntrant(conversationId: string, email: string) { return rpc<boolean>('acq_entrant_email_ajouter', { p_conversation: conversationId, p_email: email }) },
  async exportPersonne(prospectId: string) { return rpc('acq_prospect_export', { p_prospect: prospectId }) },
  async demanderEffacement(prospectId: string) { return rpc('acq_effacement_demander', { p_prospect: prospectId }) },
  async conversation(id: string) { return rpc('acq_conversation', { p_id: id }) },
  async enregistrerConversation(c: unknown) { await rpc('acq_conversation_enregistrer', { p: c }) },
  async creerLienRdv(prospectId: string, jetonHache: string, expireLe: string) { await rpc('acq_rdv_lien_creer', { p_prospect: prospectId, p_jeton_hache: jetonHache, p_expire_le: expireLe }) },
  async rdvParJeton(jetonHache: string) { return rpc('acq_rdv_par_jeton', { p_jeton_hache: jetonHache }) },
  async creneauxPris(depuis: string, jusqua: string) { return rpc('acq_rdv_creneaux_pris', { p_depuis: depuis, p_jusqua: jusqua }) },
  async reserverRdv(jetonHache: string, creneau: string, telephone: string) { return rpc('acq_rdv_reserver', { p_jeton_hache: jetonHache, p_creneau: creneau, p_telephone: telephone }) },
  async creerDecision(d: unknown) { return rpc('acq_decision_creer', { p: d }) },
}
