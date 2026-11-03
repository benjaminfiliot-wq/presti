// La garde anti-doublon du palier « réel » (tâche 036-038) : quand n8n prend un type pour un compte, le code de l'app qui faisait ce type
// pour ce compte se tait. Jamais deux envois pour un même fait.
//
// Règle (0193, departements_reglages) : un département n'est au réel que si la ligne « tous » ET la ligne du département sont TOUTES DEUX au
// palier `reel` et en marche (le plus prudent des deux s'applique, comme « Aiguiller » et « Comptes au réel » de n8n,
// lib/agents/n8n/envoi-reel.mjs). Tout le reste — ligne absente, palier ombre ou simulation, lecture en erreur, base lente — rend « non » :
// l'APP garde la main, jamais personne. Aucune demande n'est perdue.
//
// Les types que n8n fait partir au réel, et l'appelant de l'app qui se tait (ENVOYABLES de envoi-reel.mjs) :
//   accueil      → reponse_prospect : la réponse automatique, la proposition et l'accusé de réception de /api/leads ;
//   suivi        → relance_prospect : la relance de conversation du cron (app/api/cron/relances/route.ts) ;
//   facturation  → relance_impaye   : le tour des relances d'impayés du même cron.
// Les autres départements n'envoient rien au réel (cartes seulement) : l'app n'a rien à taire pour eux.
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type DepartementReel = 'accueil' | 'devis' | 'suivi' | 'facturation' | 'apres' | 'operations' | 'direction'

/** Une ligne de departements_reglages, telle que lue (champs inconnus ignorés). */
export type LigneReglage = { departement?: unknown; palier?: unknown; en_marche?: unknown }

/** Le délai au-delà duquel la garde répond « non » (l'app garde la main) : une base lente ne retarde jamais une demande. */
export const DELAI_GARDE_MS = 1500

/**
 * La décision, sans réseau (rejouée par scripts/reel-qa.mjs) : vrai seulement si « tous » et `departement` sont au réel et en marche.
 * Lecture en erreur (`erreur` vrai) ou lignes hors forme : faux.
 */
export function decisionGardeReel(lignes: readonly LigneReglage[] | null | undefined, departement: DepartementReel, erreur = false): boolean {
  if (erreur || !Array.isArray(lignes)) return false
  const auReel = (nom: string) => lignes.some((l) => l !== null && typeof l === 'object' && l.departement === nom && l.palier === 'reel' && l.en_marche === true)
  return auReel('tous') && auReel(departement)
}

/** L'app cède-t-elle ce type à n8n pour ce compte ? Faux au moindre doute (erreur, délai, compte invalide). */
export async function gardeReel(artisanId: string, departement: DepartementReel): Promise<boolean> {
  if (typeof artisanId !== 'string' || !/^[0-9a-f-]{36}$/i.test(artisanId)) return false
  let minuterie: ReturnType<typeof setTimeout> | undefined
  try {
    const lecture = supabaseAdmin.from('departements_reglages')
      .select('departement,palier,en_marche')
      .eq('artisan_id', artisanId)
      .in('departement', ['tous', departement])
      .limit(4)
      .then((r) => decisionGardeReel(r.data as LigneReglage[] | null, departement, !!r.error))
    const delai = new Promise<boolean>((resoudre) => { minuterie = setTimeout(() => resoudre(false), DELAI_GARDE_MS) })
    return await Promise.race([lecture, delai])
  } catch {
    return false
  } finally {
    if (minuterie) clearTimeout(minuterie)
  }
}
