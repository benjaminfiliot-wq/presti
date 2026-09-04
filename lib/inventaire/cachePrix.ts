import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { LISTE_DEPART, domaineDe } from '@/lib/inventaire/liste-depart'
import type { ResultatRecherche } from '@/lib/recherche-fournisseurs'

// Cache MUTUALISÉ des prix vus chez les fournisseurs (migration 0056).
//
// Ce que l'assistant a vu chez Castorama pour « plaque de plâtre BA13 » est une information
// publique, la même pour tout le monde : la relire pour chaque artisan revient à payer plusieurs
// fois la même chose. On la garde 72 heures et on la sert à tous — le coût est payé une fois,
// l'artisan est servi instantanément.
//
// Deux règles gouvernent tout ce fichier, et elles ne se négocient pas :
//
// · ON NE PARTAGE QUE DU PUBLIC. Un prix n'entre dans le cache que s'il vient d'un domaine de la
//   liste blanche ci-dessous — des enseignes dont les prix sont affichés à un visiteur anonyme,
//   vérifiées à la main. L'artisan est libre d'ajouter le fournisseur qu'il veut et de le déclarer
//   « prix publics » : sans cette liste, il suffirait d'un artisan pointant vers une page qu'il
//   contrôle pour injecter un faux prix « vu par l'assistant » chez TOUS les autres. Aujourd'hui
//   le rayon d'action d'une telle manipulation est d'un compte ; le cache le rendrait global.
//
// · ON NE MENT JAMAIS SUR LA DATE. Un résultat servi depuis le cache garde la date à laquelle il
//   a réellement été vu sur le site, et cette date est scellée avec lui. Ré-horodater au moment
//   de servir ferait signer une date fausse par le serveur, et cette date fausse s'écrirait
//   ensuite dans les observations de prix de l'artisan.

/** Durée de validité. Trois jours captent l'essentiel du gain ; au-delà, on afficherait des prix
 *  d'une semaine sur des enseignes de bricolage qui changent en promotion — la date deviendrait
 *  un aveu au lieu d'une preuve. */
export const HEURES_VALIDITE = 72

/** À incrémenter quand le moteur change au point de rendre les entrées anciennes incomparables :
 *  tout l'ancien cache sort du service d'un coup, sans rien supprimer et sans migration. */
export const VERSION_CACHE = 1

/** Les seuls domaines dont un prix peut être partagé entre artisans : ceux de la liste vérifiée
 *  à la main, marqués « prix publics ». Un fournisseur hors liste fonctionne normalement, en
 *  direct — il coûte le prix plein, mais pour ce seul artisan. */
export const DOMAINES_PARTAGEABLES: ReadonlySet<string> = new Set(
  LISTE_DEPART.filter((f) => f.prix_publics).map((f) => domaineDe(f.url)).filter((d): d is string => !!d),
)

export function domainePartageable(url: string | null | undefined): boolean {
  const d = domaineDe(url)
  return !!d && DOMAINES_PARTAGEABLES.has(d)
}

/**
 * La requête réduite à sa forme comparable. La ponctuation devient une ESPACE et non rien :
 * « BA-13 » et « BA 13 » doivent se rejoindre, mais « ba13 » et « ba18 » ne doivent jamais se
 * confondre — c'est pourquoi le texte est gardé entier, jamais tronqué ni résumé.
 */
export function normaliserRequete(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 300)
    .trim()
}

/** Au-delà, ce n'est plus une désignation de matériau mais du contexte de chantier — donc
 *  potentiellement le nom ou l'adresse d'un client. Ces requêtes-là ne sont jamais partagées. */
export const LONGUEUR_MAX_PARTAGE = 80
export const MOTS_MAX_PARTAGE = 8

/** Une clé peut-elle être mise en commun ? Contrôlé à la lecture ET à l'écriture : c'est la
 *  frontière entre « information publique sur un produit » et « ce que cet artisan prépare ». */
export function clePartageable(cle: string): boolean {
  if (!cle || cle.length > LONGUEUR_MAX_PARTAGE) return false
  return cle.split(' ').filter(Boolean).length <= MOTS_MAX_PARTAGE
}

/** Ce qu'on garde d'un résultat : tout sauf ce qui appartient à l'artisan (le nom qu'il a donné
 *  au fournisseur, l'identifiant de SA fiche) et sauf le sceau, recalculé à chaque lecture. */
export type ResultatEnCache = Omit<ResultatRecherche, 'fournisseur' | 'fournisseur_id' | 'sceau'>

export type EntreeCache = {
  domaine: string
  resultats: ResultatEnCache[]
  raisonNonVu: string | null
  vuLe: string
}

const sansIdentite = (r: ResultatRecherche): ResultatEnCache => {
  const { fournisseur: _f, fournisseur_id: _i, sceau: _s, ...reste } = r
  return reste
}

/**
 * Ce que le cache sait déjà, pour cette requête, parmi ces domaines. Ne renvoie que des entrées
 * encore valides : un appel n'est évité que si l'information est fraîche.
 * Ne jette jamais — un cache en panne doit dégrader vers une recherche normale, pas vers une erreur.
 */
export async function lireCache(requete: string, domaines: string[]): Promise<Map<string, EntreeCache>> {
  const trouves = new Map<string, EntreeCache>()
  const cle = normaliserRequete(requete)
  const partageables = domaines.filter((d) => DOMAINES_PARTAGEABLES.has(d))
  if (!clePartageable(cle) || !partageables.length) return trouves
  try {
    const { data, error } = await supabaseAdmin
      .from('recherche_cache')
      .select('domaine, resultats, raison_non_vu, vu_le')
      .eq('requete_norm', cle)
      .eq('version', VERSION_CACHE)
      .in('domaine', partageables)
      .gt('expire_le', new Date().toISOString())
    if (error) { console.error('[cachePrix] lecture:', error.message); return trouves }
    for (const l of data ?? []) {
      // Même contrôle à la lecture : une ligne écrite avant ce garde-fou ne doit pas ressortir.
      const brut = Array.isArray(l.resultats) ? (l.resultats as ResultatEnCache[]) : []
      const resultats = brut.filter((r) => domaineDe(r.url) === String(l.domaine))
      trouves.set(String(l.domaine), {
        domaine: String(l.domaine),
        resultats,
        raisonNonVu: l.raison_non_vu ? String(l.raison_non_vu) : null,
        vuLe: String(l.vu_le),
      })
    }
  } catch (e) {
    console.error('[cachePrix] lecture:', e instanceof Error ? e.message : e)
  }
  return trouves
}

/**
 * Enregistre ce qui vient d'être vu, domaine par domaine. `prix_publics` est revérifié ICI et
 * pas seulement à l'appel : c'est la frontière juridique du partage, elle doit être contrôlée au
 * moment exact où la donnée devient commune.
 * N'écrit jamais après une panne : mettre en cache un échec le figerait pour trois jours.
 */
export async function ecrireCache(
  requete: string,
  entrees: { domaine: string; prixPublics: boolean; resultats: ResultatRecherche[]; raisonNonVu: string | null }[],
  tierSource: string,
): Promise<number> {
  const cle = normaliserRequete(requete)
  if (!clePartageable(cle)) return 0
  const maintenant = new Date()
  const expire = new Date(maintenant.getTime() + HEURES_VALIDITE * 3_600_000).toISOString()
  const lignes = entrees
    .filter((e) => e.prixPublics && DOMAINES_PARTAGEABLES.has(e.domaine))
    // Une ligne ne contient QUE des résultats de son propre site. Sans ce contrôle, un résultat
    // mal rattaché serait ensuite servi aux autres artisans sous le nom du mauvais fournisseur.
    .filter((e) => e.resultats.every((r) => domaineDe(r.url) === e.domaine))
    .map((e) => ({
      requete_norm: cle,
      domaine: e.domaine,
      version: VERSION_CACHE,
      resultats: e.resultats.map(sansIdentite),
      raison_non_vu: e.raisonNonVu,
      // La date de lecture réelle : celle que porte le premier résultat, sinon maintenant (cas
      // d'une absence constatée). Jamais recalculée à la lecture.
      vu_le: e.resultats[0]?.vu_le ?? maintenant.toISOString(),
      expire_le: expire,
      tier_source: tierSource,
    }))
  if (!lignes.length) return 0
  try {
    const { error } = await supabaseAdmin.from('recherche_cache').upsert(lignes, { onConflict: 'requete_norm,domaine,version' })
    if (error) { console.error('[cachePrix] écriture:', error.message); return 0 }
    return lignes.length
  } catch (e) {
    console.error('[cachePrix] écriture:', e instanceof Error ? e.message : e)
    return 0
  }
}

/** Compte, sans bloquer, ce que le cache a fait économiser. Sert à régler la durée de validité
 *  sur des faits plutôt que sur une intuition. */
export function marquerHits(requete: string, domaines: string[]): void {
  const cle = normaliserRequete(requete)
  if (!clePartageable(cle) || !domaines.length) return
  void supabaseAdmin
    .rpc('incrementer_hits_cache', { p_requete: cle, p_domaines: domaines, p_version: VERSION_CACHE })
    .then(({ error }) => { if (error) console.error('[cachePrix] hits:', error.message) })
}
