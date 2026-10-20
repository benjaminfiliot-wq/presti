// CRM — la part de l'effacement d'une conversation qui touche la base et le stockage (audit RGPD du 20/10, point 4). Le choix de
// ce qui part est PUR et vit dans lib/crm/effacement.ts (choisirEffacementCrm → chantiersAEffacer) ; ici on l'exécute. Séparé de
// app/api/donnees/route.ts pour être joué tel quel, avec une doublure de la base, par scripts/rgpd-qa.mjs.
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type BaseEffacement = typeof supabaseAdmin

/** Une table que la production n'a pas encore (migration en retard) n'est pas une erreur d'effacement : il n'y a rien à y effacer. */
export const tableAbsente = (m: string) => /does not exist|schema cache|could not find the table/i.test(m)
/** Une colonne que la base n'a pas encore (0172 : lat, lng, geocode_le) : on efface alors sans elle. */
const colonneAbsente = (m: string) => /column .* does not exist|could not find the .* column|schema cache/i.test(m)

export const BUCKET_PIECES = 'chantier-pieces'
export const LOT_FICHIERS = 100

/** Combien de lignes d'une table du CRM portent sur ces chantiers (0 si la table n'existe pas encore). */
export async function compterDeChantiers(table: 'chantier_pieces' | 'chantier_suivi', uid: string, ids: string[], db: BaseEffacement = supabaseAdmin): Promise<number> {
  if (!ids.length) return 0
  const { count, error } = await db.from(table).select('chantier_id', { count: 'exact', head: true }).eq('artisan_id', uid).in('chantier_id', ids)
  if (error) { if (tableAbsente(error.message)) return 0; throw new Error(error.message) }
  return count ?? 0
}

/**
 * Efface ce que le CRM garde d'un chantier SANS devis envoyé ni facture : ses photos et pièces, d'abord les FICHIERS du bucket
 * privé puis les lignes (la base n'emporte jamais un fichier : si le retrait échoue, la ligne reste et le prochain essai la
 * retrouve), son lien de suivi, son adresse et sa position sur la carte. TOUJOURS filtré sur artisan_id = uid. Rend le texte de
 * l'erreur, ou null. Reprenable : chaque étape est idempotente.
 */
export async function effacerDossiersChantiers(uid: string, ids: string[], db: BaseEffacement = supabaseAdmin): Promise<string | null> {
  if (!ids.length) return null
  for (;;) {
    const { data, error } = await db.from('chantier_pieces').select('chemin').eq('artisan_id', uid).in('chantier_id', ids).limit(LOT_FICHIERS)
    if (error) { if (tableAbsente(error.message)) break; return `pièces (lecture) : ${error.message}` }
    // Un chemin hors du dossier du compte n'est jamais retiré (la base l'interdit déjà, 0163) : double garde.
    const chemins = (data ?? []).map((p) => p.chemin).filter((c): c is string => typeof c === 'string' && c.startsWith(`${uid}/`))
    if (!chemins.length) break
    const { error: eF } = await db.storage.from(BUCKET_PIECES).remove(chemins)
    if (eF) return `pièces (fichiers) : ${eF.message}`
    const { error: eL } = await db.from('chantier_pieces').delete().eq('artisan_id', uid).in('chemin', chemins)
    if (eL) return `pièces (lignes) : ${eL.message}`
    if ((data ?? []).length < LOT_FICHIERS) break
  }
  const { error: eS } = await db.from('chantier_suivi').delete().eq('artisan_id', uid).in('chantier_id', ids)
  if (eS && !tableAbsente(eS.message)) return `lien de suivi : ${eS.message}`
  // geocode_le est posé à l'instant, pas remis à NULL : NULL voudrait dire « à chercher », et la carte irait redemander à la Base
  // Adresse Nationale l'adresse écrite sur le devis brouillon du même chantier. Posé, lat et lng vides disent « cherché, introuvable ».
  const maintenant = new Date().toISOString()
  const base = { adresse: null, code_postal: null, ville: null, maj_le: maintenant }
  let { error: eC } = await db.from('chantiers').update({ ...base, lat: null, lng: null, geocode_le: maintenant }).eq('artisan_id', uid).in('id', ids)
  if (eC && colonneAbsente(eC.message)) ({ error: eC } = await db.from('chantiers').update(base).eq('artisan_id', uid).in('id', ids))
  return eC ? `adresse du chantier : ${eC.message}` : null
}
