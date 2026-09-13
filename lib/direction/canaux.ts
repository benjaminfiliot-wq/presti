import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Les apporteurs, et lesquels sont des CANAUX d'acquisition (migration 0086).
//
// Pourquoi un fichier plutôt qu'un `select` de plus dans chaque route : quatre écrans lisent cette
// table pour décider si une commission est due (le relevé, la liste des clients, la fiche d'un
// client, le registre). Quatre `select` écrits à la main, c'est quatre occasions d'en oublier un —
// et celui qu'on oublie est celui qui paie 20 % à personne.
//
// La tolérance à l'absence de la colonne n'est pas de la prudence décorative : Benj colle les
// migrations à la main dans le SQL Editor, et le code part en production AVANT le collage. Entre
// les deux, demander `canal` fait échouer TOUT le select — c'est-à-dire, sans ce repli, un relevé
// et une liste de clients en panne pour une colonne qui ne sert qu'à ne PAS payer.
//
// Le repli est sans danger, et c'est la migration qui le garantit : la colonne et les deux codes
// 'facebook' / 'linkedin' sont créés dans le même fichier. Tant que la colonne manque, ces codes
// n'existent pas non plus, donc aucune arrivée ne peut être comptée à tort comme un apport.

export type Apporteur = {
  id: string
  code: string
  nom: string
  artisan_id: string | null
  actif: boolean
  /** true = canal d'acquisition (Facebook, LinkedIn) : personne à rémunérer. Voir 0086. */
  canal: boolean
  cree_le: string | null
}

type Brut = { id: string; code: string; nom: string; artisan_id?: string | null; actif?: boolean | null; canal?: boolean | null; cree_le?: string | null }

const CHAMPS = 'id, code, nom, artisan_id, actif, cree_le'

/**
 * Tous les apporteurs, par identifiant, du plus ancien au plus récent. La table est minuscule.
 * LÈVE une erreur si la table elle-même est illisible — voir ci-dessous, c'est important.
 */
export async function lireApporteurs(): Promise<Map<string, Apporteur>> {
  const { data, error } = await supabaseAdmin.from('apporteurs').select(`${CHAMPS}, canal`).order('cree_le')
  if (!error) return indexer((data ?? []) as Brut[])
  // Le repli ne vaut que pour UNE panne : la colonne n'existe pas encore (42703). Il se déclenchait
  // sur n'importe quelle erreur — et depuis que 0086 est collée (08/09 23:23) c'est devenu
  // dangereux : un échec passager sur la première lecture, une réussite sur la seconde, et
  // 'facebook' et 'linkedin' redeviennent des apporteurs à 20 %, en silence et sans une ligne de
  // journal. Sur toute autre erreur on lève tout de suite, pour la raison écrite plus bas.
  const colonneAbsente = error.code === '42703' || /column .* does not exist/i.test(error.message ?? '')
  if (!colonneAbsente) throw new Error(`apporteurs illisibles (${error.code ?? '?'}) : ${error.message}`)
  console.warn('[canaux] 0086 pas encore collée : lecture sans la colonne, personne n’est un canal.')
  const { data: avant, error: encore } = await supabaseAdmin.from('apporteurs').select(CHAMPS).order('cree_le')
  // Deux échecs d'affilée : ce n'est plus la colonne qui manque, c'est la table qui ne répond pas.
  // Rendre une liste vide serait le pire des deux mondes — un CANAL passerait pour un apporteur
  // ordinaire, donc 20 % de commission sur un client venu de Facebook, due à personne. Un écran en
  // panne se voit et se corrige ; un chiffre faux se paie.
  if (encore) throw new Error(`apporteurs illisibles : ${encore.message}`)
  return indexer((avant ?? []) as Brut[])
}

const indexer = (lignes: Brut[]): Map<string, Apporteur> =>
  new Map(lignes.map((a) => [a.id, {
    id: a.id, code: a.code, nom: a.nom,
    artisan_id: a.artisan_id ?? null,
    actif: a.actif !== false,
    canal: a.canal === true,
    cree_le: a.cree_le ?? null,
  }]))

/** Le canal d'un apport, en une expression, pour les endroits qui n'ont que l'identifiant. */
export const estCanal = (apporteurs: Map<string, Apporteur>, id: string | null | undefined): boolean =>
  !!id && apporteurs.get(id)?.canal === true

/** Le code de ce canal est-il un canal ? (Le POST et le PATCH raisonnent sur le code, pas sur l'id.) */
export const canalParCode = (apporteurs: Map<string, Apporteur>, code: string): Apporteur | null => {
  for (const a of apporteurs.values()) if (a.code === code && a.canal) return a
  return null
}
