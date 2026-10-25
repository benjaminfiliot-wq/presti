// Routage de modèle (v5 §7) : Standard par défaut, Pro automatiquement sur complexité
// détectée SI l'offre le permet (`plateforme.ia.auto`), Expert uniquement sur demande
// explicite. Le tier réellement utilisé est rendu pour que l'interface l'affiche
// (« répondu avec Pro »). Le mapping tier → modèle reste dans lib/models.ts.
import { resolveModel, type Tier } from '../models'
import { peut } from '../plans'

export type SignauxComplexite = {
  /** Chantier d'ampleur (COMPLEXE_KEYWORDS ou message long). */
  complexe?: boolean
  /** Insatisfaction / SAV : réponse délicate. */
  reclamation?: boolean
  /** Plusieurs types de travaux dans la même demande. */
  multiPostes?: boolean
  /** Contraintes de contexte (assurance, copropriété, budget serré…). */
  contraintes?: boolean
}

export type RaisonRoutage = 'defaut' | 'explicite' | 'complexite' | 'repli_plan'

export type Routage = {
  tier: Tier
  model: string
  raison: RaisonRoutage
  /** Le tier demandé dépassait l'offre : on a servi le meilleur autorisé. */
  downgraded: boolean
  /** Libellé prêt à afficher côté artisan. */
  libelle: string
}

const LIBELLE: Record<Tier, string> = { standard: 'Standard', pro: 'Pro', expert: 'Expert' }

export function estComplexe(s: SignauxComplexite): boolean {
  return !!(s.complexe || s.reclamation || s.multiPostes || s.contraintes)
}

/**
 * @param plan      offre de l'artisan (`artisans.plan`)
 * @param demande   tier demandé explicitement (config plateforme `modele`, ou choix de l'artisan) — null = défaut
 * @param signaux   ce que l'analyse déterministe a vu dans la demande
 */
export function routerModele(opts: { plan: string | null | undefined; demande?: string | null; signaux?: SignauxComplexite }): Routage {
  const demande = (['standard', 'pro', 'expert'] as const).includes(opts.demande as Tier) ? (opts.demande as Tier) : null
  const signaux = opts.signaux ?? {}

  // Expert : jamais automatique — c'est 3 crédits, l'artisan le décide.
  if (demande === 'expert' || demande === 'pro') {
    const r = resolveModel(demande, opts.plan)
    return { ...r, raison: r.downgraded ? 'repli_plan' : 'explicite', libelle: `répondu avec ${LIBELLE[r.tier]}` }
  }

  // Standard (défaut) → Pro si la demande est complexe et que l'offre inclut la plateforme (Studio et au-dessus). Jusqu'au 25/10 la
  // condition était `plateforme.ia.auto`, passée en Signature ce jour-là : Studio aurait perdu la bascule sans que rien ne le dise.
  if (estComplexe(signaux) && peut(opts.plan, 'plateforme.conversation')) {
    const r = resolveModel('pro', opts.plan)
    if (!r.downgraded) return { ...r, raison: 'complexite', libelle: 'répondu avec Pro (demande complexe)' }
  }

  const r = resolveModel('standard', opts.plan)
  return { ...r, raison: 'defaut', libelle: 'répondu avec Standard' }
}
