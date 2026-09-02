import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Panneau de contrôle IA de la plateforme (v4 §A4).
// RÈGLE DE NON-RÉGRESSION : un artisan SANS ligne de config garde son comportement actuel
// (dérivé de `artisans.reponse_auto`). Le défaut « assistée » ne s'applique qu'à ceux qui
// règlent explicitement leur plateforme.

export type ModeReponse = 'auto' | 'assistee' | 'manuelle'

export type PlateformeConfig = {
  mode_reponse: ModeReponse
  modele: string | null
  auto_24_7: boolean
  auto_debut: number | null
  auto_fin: number | null
  devis_auto: 'jamais' | 'brouillon' | 'seuil'
  devis_auto_seuil: number | null
  facture_auto: 'jamais' | 'acceptation'
  ton: 'sobre' | 'chaleureux' | 'direct'
  peut_dire: string[]
  ne_doit_pas_dire: string[]
  escalade_mots: string[]
  limite_messages: number
  nom_assistant: string | null
  message_accueil: string | null
  amorces: string[] | null
}

export const CONFIG_DEFAUT: PlateformeConfig = {
  mode_reponse: 'assistee',
  modele: null,
  auto_24_7: true,
  auto_debut: null,
  auto_fin: null,
  devis_auto: 'brouillon',
  devis_auto_seuil: null,
  facture_auto: 'jamais',
  ton: 'chaleureux',
  peut_dire: ['delais', 'zone', 'disponibilites'],
  ne_doit_pas_dire: ['prix_ferme', 'engagement_date', 'garantie'],
  escalade_mots: ['urgence', 'fuite', 'degat des eaux', 'inondation', 'gaz', 'assurance'],
  limite_messages: 8,
  nom_assistant: null,
  message_accueil: null,
  amorces: null,
}

/** Lit la configuration d'un artisan. Sans ligne : repli sur son réglage historique. */
export async function getPlateformeConfig(artisanId: string, reponseAuto?: boolean | null): Promise<PlateformeConfig> {
  try {
    const { data } = await supabaseAdmin.from('plateforme_config').select('*').eq('artisan_id', artisanId).maybeSingle()
    if (data) return { ...CONFIG_DEFAUT, ...(data as Partial<PlateformeConfig>) }
  } catch { /* table absente ou erreur : on retombe sur le comportement historique */ }
  return { ...CONFIG_DEFAUT, mode_reponse: reponseAuto === false ? 'manuelle' : 'auto' }
}

const sansAccents = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Un mot d'escalade est-il présent dans le message du prospect ? */
export function motEscalade(cfg: PlateformeConfig, message: string): string | null {
  const n = sansAccents(message)
  for (const m of cfg.escalade_mots || []) { const k = sansAccents(m); if (k && n.includes(k)) return m }
  return null
}

/** La plage horaire d'auto-réponse est-elle ouverte maintenant ? (gère le passage de minuit) */
export function dansLaPlage(cfg: PlateformeConfig, maintenant = new Date()): boolean {
  if (cfg.auto_24_7 !== false) return true
  const d = cfg.auto_debut, f = cfg.auto_fin
  if (d == null || f == null) return true
  const h = maintenant.getHours()
  return d <= f ? h >= d && h < f : h >= d || h < f
}

export type Blocage = 'pause' | 'manuelle' | 'assistee' | 'limite' | 'escalade' | 'horaire'

/**
 * L'IA doit-elle répondre au prospect, maintenant ?
 * Renvoie le motif de blocage le cas échéant (jamais deviné : chaque motif est explicite).
 */
export function iaDoitRepondre(
  cfg: PlateformeConfig,
  ctx: { nbReponsesIA: number; message: string; pause?: boolean },
): { ok: true } | { ok: false; raison: Blocage; mot?: string } {
  if (ctx.pause) return { ok: false, raison: 'pause' }
  if (cfg.mode_reponse === 'manuelle') return { ok: false, raison: 'manuelle' }
  if (cfg.mode_reponse === 'assistee') return { ok: false, raison: 'assistee' }
  const mot = motEscalade(cfg, ctx.message)
  if (mot) return { ok: false, raison: 'escalade', mot }
  if (ctx.nbReponsesIA >= (cfg.limite_messages ?? 8)) return { ok: false, raison: 'limite' }
  if (!dansLaPlage(cfg)) return { ok: false, raison: 'horaire' }
  return { ok: true }
}
