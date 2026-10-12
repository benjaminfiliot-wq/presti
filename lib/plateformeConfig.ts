import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Persona } from '@/lib/ai'
import { peut } from '@/lib/plans'

// Panneau de contrôle IA de la plateforme (v4 §A4).
//
// UNE SEULE SOURCE DE VÉRITÉ (prompt v7, bloc 1a) : `plateforme_config.mode_reponse`. L'ancien
// booléen `artisans.reponse_auto` n'est plus jamais lu ni écrit — deux réglages qui se
// contredisaient selon la route qui servait (« les trois modes se comportent pareil »). La
// migration 0062 a créé la ligne de config des comptes qui n'en avaient pas ; un compte créé
// depuis démarre en « assistée » : rien ne part sans l'artisan tant qu'il n'a pas choisi.

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

// Le réglage « Ton » de Ma plateforme, en consigne pour le moteur de rédaction.
export const TON_TEXTE: Record<PlateformeConfig['ton'], string> = {
  sobre: 'sobre, factuel et précis',
  chaleureux: 'professionnel, chaleureux et rassurant',
  direct: 'direct et efficace, sans détour',
}

/**
 * Le ton que l'assistant applique. Le réglage de Ma plateforme FAIT FOI (l'écran le promet : « ce que vous réglez ici fait
 * foi ») : jusqu'au 12/10, le texte libre saisi à l'inscription (`artisans.ton_style`, toujours rempli) passait devant, et
 * le choix Sobre / Chaleureux / Direct n'avait aucun effet (audit des promesses, produit, lignes 4 et 45). Ce texte reste
 * utilisé, mais comme exemple de manière d'écrire seulement — l'inscription promet « l'IA s'en inspirera ».
 */
export function tonDeReponse(cfg: Pick<PlateformeConfig, 'ton'>, tonInscription?: string | null): string {
  const base = TON_TEXTE[cfg.ton] ?? TON_TEXTE.chaleureux
  const exemple = String(tonInscription ?? '').replace(/\s+/g, ' ').trim()
  return exemple
    ? `${base}. Pour la manière d'écrire seulement (jamais pour les faits, les délais ou les prix), inspire-toi aussi de ce message de l'artisan : « ${exemple.slice(0, 300)} »`
    : base
}

/** Lit la configuration d'un artisan. Sans ligne : repli sur son réglage historique. */
export async function getPlateformeConfig(artisanId: string): Promise<PlateformeConfig> {
  try {
    const { data } = await supabaseAdmin.from('plateforme_config').select('*').eq('artisan_id', artisanId).maybeSingle()
    if (data) return { ...CONFIG_DEFAUT, ...(data as Partial<PlateformeConfig>) }
  } catch { /* table absente ou erreur : on retombe sur le comportement historique */ }
  return { ...CONFIG_DEFAUT }
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
  // Le mot d'escalade passe AVANT le mode assisté (audit des promesses du 12/10, produit, ligne 49) : l'aide promet
  // « l'assistant se tait et vous recevez une alerte ». Testé après, il laissait le mode par défaut (Assistée, le seul
  // possible en Essai et en Essentiel) rédiger une proposition — un crédit débité — sans que l'alerte parte.
  const mot = motEscalade(cfg, ctx.message)
  if (mot) return { ok: false, raison: 'escalade', mot }
  if (cfg.mode_reponse === 'assistee') return { ok: false, raison: 'assistee' }
  if (ctx.nbReponsesIA >= (cfg.limite_messages ?? 8)) return { ok: false, raison: 'limite' }
  if (!dansLaPlage(cfg)) return { ok: false, raison: 'horaire' }
  return { ok: true }
}

// ── La décision, en un seul endroit (prompt v7, bloc 1b) ──────────────────────────────────────
//
// Avant, trois routes décidaient chacune à leur façon (/api/leads lisait un booléen, /api/conversation
// aussi mais avant la config, /stream lisait la config mais déguisait le verrou d'offre en
// « assistée »). Résultat : le même artisan n'avait pas le même mode selon le chemin emprunté.
// Désormais une seule fonction, et un motif EXPLICITE pour chaque non-réponse — l'interface et
// les tests s'y fient.

export type MotifDecision = Blocage | 'humain' | 'verrou_offre'

/**
 * Le mode que le serveur APPLIQUE, et pourquoi il diffère du mode choisi le cas échéant.
 * L'assistant autonome est vendu à partir de Studio : un compte Essai ou Essentiel qui choisit
 * « auto » est servi en « assistée » — et le motif `verrou_offre` le dit, au lieu de se taire.
 */
export function modeEffectif(plan: string | null | undefined, cfg: PlateformeConfig): { mode: ModeReponse; motif: 'verrou_offre' | null } {
  if (cfg.mode_reponse === 'auto' && !peut(plan, 'plateforme.ia.auto')) return { mode: 'assistee', motif: 'verrou_offre' }
  return { mode: cfg.mode_reponse, motif: null }
}

export type Decision =
  | { ok: true }
  | { ok: false; raison: MotifDecision; mot?: string; comportement: 'silence' | 'preparer' }

/**
 * L'assistant doit-il répondre à ce message, maintenant ? `comportement` dit quoi faire quand il
 * ne répond pas : 'preparer' (assistée, ou auto verrouillé par l'offre : il rédige une proposition
 * que l'artisan validera), 'silence' (manuel, main prise, pause, escalade, plafond, hors plage).
 */
export function decisionReponse(
  artisan: { plan?: string | null; leads_pause?: boolean | null },
  lead: { prise_en_main?: boolean | null },
  cfg: PlateformeConfig,
  ctx: { nbReponsesIA: number; message: string },
): Decision {
  // La main prise sur CE fil prime sur tout : l'artisan a dit « je m'en occupe ».
  if (lead.prise_en_main) return { ok: false, raison: 'humain', comportement: 'silence' }
  const eff = modeEffectif(artisan.plan, cfg)
  const base = iaDoitRepondre({ ...cfg, mode_reponse: eff.mode }, { nbReponsesIA: ctx.nbReponsesIA, message: ctx.message, pause: artisan.leads_pause === true })
  if (base.ok) return { ok: true }
  if (base.raison === 'assistee') return { ok: false, raison: eff.motif ?? 'assistee', comportement: 'preparer' }
  return { ok: false, raison: base.raison, mot: base.mot, comportement: 'silence' }
}
