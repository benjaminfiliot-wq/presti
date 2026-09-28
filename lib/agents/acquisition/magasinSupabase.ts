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
  Annonceur, Candidat, ClesOpposition, Etape, Evenement, MagasinSocle, NomAgent, PatchProspect, ProspectReserve,
} from '@/lib/agents/acquisition/contrat'

async function appeler<T>(fonction: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabaseAdmin.rpc(fonction, args)
  if (error) throw new Error(`[magasinSupabase] ${fonction} : ${error.message}`)
  return data as T
}

export const magasinSupabase: MagasinSocle = {
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
}
