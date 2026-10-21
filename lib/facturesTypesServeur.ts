// Types de devis et de factures — la question « la migration 0176 est-elle appliquée ? », posée à la base et non supposée.
//
// Fail-closed (règle de lib/flags.ts : on colle la migration, PUIS on lève le drapeau — mais si l'ordre est raté, rien ne doit
// casser) : drapeau levé SANS 0176, écrire `type_devis`, `lot` ou `type_facture` ferait échouer l'insertion entière (colonne
// inconnue) — et l'insertion des lignes n'était pas vérifiée : un devis sans ses lignes, une facture scellée vide. On sonde donc
// les colonnes avant d'en écrire une ; absentes, les chemins neufs répondent 503 et les chemins d'avant écrivent ce qu'ils
// écrivaient. Une réponse POSITIVE est gardée (une migration appliquée ne se « désapplique » pas) ; une réponse négative est
// reposée au bout d'une minute.
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type Sonde = { ok: boolean; le: number }
const RESSONDER_MS = 60_000
let lotsSonde: Sonde | null = null
let facturesSonde: Sonde | null = null

async function sonder(cache: Sonde | null, requetes: () => Promise<{ error: unknown }[]>): Promise<Sonde> {
  if (cache && (cache.ok || Date.now() - cache.le < RESSONDER_MS)) return cache
  try {
    const r = await requetes()
    return { ok: r.every((x) => !x.error), le: Date.now() }
  } catch {
    return { ok: false, le: Date.now() }
  }
}

/** devis.type_devis, devis_lignes.lot et factures_lignes.lot existent (0176). */
export async function colonnesLotsPresentes(): Promise<boolean> {
  lotsSonde = await sonder(lotsSonde, () => Promise.all([
    supabaseAdmin.from('devis').select('type_devis').limit(1),
    supabaseAdmin.from('devis_lignes').select('lot').limit(1),
    supabaseAdmin.from('factures_lignes').select('lot').limit(1),
  ]))
  return lotsSonde.ok
}

/** Les colonnes de type et de situation de `factures` existent (0176), et `factures_lignes.lot`. */
export async function colonnesFacturesPresentes(): Promise<boolean> {
  facturesSonde = await sonder(facturesSonde, () => Promise.all([
    supabaseAdmin.from('factures').select('type_facture, situation_numero, avancement_pct, avancement_lots, marche_ht, cumul_ht, situation_detail').limit(1),
    supabaseAdmin.from('factures_lignes').select('lot').limit(1),
  ]))
  return facturesSonde.ok
}

/** Message rendu (503) quand un type neuf est demandé sans 0176. */
export const INDISPONIBLE_0176 = 'Cette fonction n’est pas encore ouverte sur votre compte : réessayez plus tard. Rien n’a été enregistré.'

/** Pour les essais (scripts/types-devis-factures-qa.mjs) : oublie les réponses gardées, la prochaine question repart à la base. */
export function reinitialiserSondes(): void {
  lotsSonde = null
  facturesSonde = null
}
