import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Persona } from '@/lib/ai'

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
  // ── Persona (sprint J-1 §9 G2, migration 0053) : le TON de l'assistant, jamais des faits.
  avatar_url: string | null
  style_exemples: string[]
  formule_ouverture: string | null
  formule_cloture: string | null
  vouvoiement: boolean
  emojis: boolean
  longueur: 'courte' | 'moyenne' | 'longue'
  /** Apparence avancée (jsonb, écarts au défaut seulement — lib/plateformeStyle). */
  apparence: Record<string, unknown>
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
  avatar_url: null,
  style_exemples: [],
  formule_ouverture: null,
  formule_cloture: null,
  vouvoiement: true,
  emojis: false,
  longueur: 'moyenne',
  apparence: {},
}

/**
 * La persona telle que le moteur de rédaction (lib/ai) la consomme. Une config par
 * défaut donne une persona « neutre » : vouvoiement, pas d'émoji, longueur moyenne.
 */
export function personaDe(cfg: PlateformeConfig): Persona {
  return {
    nom_assistant: cfg.nom_assistant,
    style_exemples: Array.isArray(cfg.style_exemples) ? cfg.style_exemples : [],
    formule_ouverture: cfg.formule_ouverture,
    formule_cloture: cfg.formule_cloture,
    vouvoiement: cfg.vouvoiement !== false,
    emojis: cfg.emojis === true,
    longueur: cfg.longueur === 'courte' || cfg.longueur === 'longue' ? cfg.longueur : 'moyenne',
  }
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

/**
 * Heure courante EN FRANCE. Le serveur tourne en UTC : sans ça, une plage « 8h–18h »
 * réglée par l'artisan serait décalée de 1 à 2 h selon la saison.
 */
export function heureFrance(d = new Date()): number {
  try {
    return parseInt(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(d), 10)
  } catch { return d.getUTCHours() }
}

/** La plage horaire d'auto-réponse est-elle ouverte maintenant ? (gère le passage de minuit) */
export function dansLaPlage(cfg: PlateformeConfig, maintenant = new Date()): boolean {
  if (cfg.auto_24_7 !== false) return true
  const d = cfg.auto_debut, f = cfg.auto_fin
  if (d == null || f == null) return true
  const h = heureFrance(maintenant)
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
