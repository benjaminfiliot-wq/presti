// Qui compte dans les chiffres de l'entreprise, et qui n'y compte pas (prompt v11 §2.3).
//
// Jusqu'ici l'exclusion tenait à un motif d'adresse (`%@presti-test.invalid`). C'était fragile pour
// deux raisons : elle ratait tout ce qui n'avait pas cette forme — les comptes en `@example.com` créés
// par les suites de facturation y échappaient et gonflaient les compteurs — et elle liait une décision
// d'entreprise à une convention de nommage, que rien ne garantit.
//
// La règle est désormais une COLONNE : `artisans.est_demo`, posée à la main ou par une migration, gelée
// pour le navigateur (0055). Un compte marqué existe, se connecte, sert à ce pour quoi il est fait — le
// compte de relecture des stores en est un, Apple et Google l'exigent — mais il ne compte dans aucun
// chiffre. Le motif d'adresse reste en ceinture : deux filets valent mieux qu'un quand il s'agit de ne
// pas raconter d'histoires sur son propre chiffre d'affaires.

/** Le motif des adresses de test, gardé en ceinture du marqueur `est_demo`. */
export const MOTIF_TEST = '%@presti-test.invalid'

type Filtrable = {
  eq: (colonne: string, valeur: unknown) => Filtrable
  not: (colonne: string, operateur: string, valeur: unknown) => Filtrable
}

/**
 * Restreint une requête aux artisans qui comptent : ni fondateur, ni compte de démonstration, ni
 * adresse de test. À appeler sur TOUTE requête dont le résultat devient un chiffre montré à Benj.
 */
export function seulsLesVrais<T>(requete: T): T {
  // Le typage de PostgREST se perd à travers une fonction générique : on le rétablit à la sortie, la
  // requête rendue étant strictement la même, avec trois filtres de plus.
  const q = requete as unknown as Filtrable
  return q.eq('is_founder', false).eq('est_demo', false).not('email', 'like', MOTIF_TEST) as unknown as T
}

/** La même règle, appliquée à une ligne déjà lue. */
export const compteDansLesChiffres = (a: { is_founder?: boolean | null; est_demo?: boolean | null; email?: string | null }): boolean =>
  !a.is_founder && !a.est_demo && !(a.email ?? '').endsWith('@presti-test.invalid')
