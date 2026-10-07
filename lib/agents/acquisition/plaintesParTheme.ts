// lib/agents/acquisition/plaintesParTheme.ts — les douleurs d'artisans AGRÉGÉES par thème, avec leurs mots exacts (07/10/2026).
//
// Deux origines, les mêmes règles (citation mot pour mot, page du fil, date de la relève, JAMAIS d'auteur) :
//   · « douleurs » : la bibliothèque relue de douleurs.ts (fiches 026-073 et 026-254), rangée ici par thème (THEMES_DES_DOULEURS) ;
//   · « veille » : les plaintes trouvées par scripts/veille-plaintes.mjs puis relues une à une (PLAINTES_VEILLE).
// Toute entrée naît à approuve: false ; seules les approuvées entrent dans un message (règle de douleurs.ts). Le rédacteur
// et la maquette prennent leurs FORMULATIONS ici (formulationsPour) : on reprend les mots de l'artisan, pas les nôtres.
// Juge : scripts/veille-plaintes-qa.mjs (relit chaque page de la veille, sans donnée personnelle). Méthode et sources :
// docs/agents/plaintes-par-theme.md (régénéré par `scripts/veille-plaintes.mjs --agreger`).
import type { Metier } from './contrat'
import { DOULEURS } from './douleurs'
import { THEMES } from './plaintes'
import type { ThemePlainte } from './plaintes'

export interface PlainteVeille {
  id: string
  themes: readonly ThemePlainte[]
  metier: Metier['id'] | 'tous'
  /** La phrase exacte, telle qu'écrite sur la page (200 signes au plus), fautes comprises. */
  citation: string
  /** La page du fil (jamais une page de profil). */
  source_url: string
  /** AAAA-MM-JJ : la date de la relève. */
  relevee_le: string
  approuve: boolean
}

/** Relève du 2026-10-07 : forums de professionnels lus poliment, phrases relues une à une (voir la doc). */
export const PLAINTES_VEILLE: readonly PlainteVeille[] = Object.freeze(
  [
    { id: 'veille-plombier-client-paie-une-partie', themes: ['impayes'], metier: 'plombier', citation: "J'ai changer un ballon d'eau chaude chez un client qui à déja payer une partie de la facture mais ne veux pas payer le reste.", source_url: 'https://plombiers-reunis.com/topic3140-client-refusant-de-payer-la-facture.html', relevee_le: '2026-10-07', approuve: false },
    { id: 'veille-plombier-un-mois-apres-toujours-pas-paye', themes: ['impayes'], metier: 'plombier', citation: "un moi après le chantier il ne veut toujours pas payer que puis je faire et il me doit encore 400 €???????", source_url: 'https://plombiers-reunis.com/topic3140-client-refusant-de-payer-la-facture.html', relevee_le: '2026-10-07', approuve: false },
    { id: 'veille-tous-appels-renseignements-prix', themes: ['appels_manques', 'administratif'], metier: 'tous', citation: "Entre les appels, les demandes de renseignements et les personnes qui veulent simplement avoir une première idée du prix, ça peut vite prendre du temps.", source_url: 'https://plombiers-reunis.com/topic9680-combien-de-temps-vous-passez-a-gerer-les-appels.html', relevee_le: '2026-10-07', approuve: false },
    { id: 'veille-tous-chantier-decrocher-rappeler', themes: ['appels_manques'], metier: 'tous', citation: "Et quand on est sur un chantier, ce n'est pas toujours évident de décrocher ou de rappeler rapidement.", source_url: 'https://plombiers-reunis.com/topic9680-combien-de-temps-vous-passez-a-gerer-les-appels.html', relevee_le: '2026-10-07', approuve: false },
    { id: 'veille-tous-nouvelle-boite-visibilite', themes: ['site_absent'], metier: 'tous', citation: "Je viens de créer ma boite,le plus important c'est avoir le maximum de visibilité", source_url: 'https://plombiers-reunis.com/topic3191-site-de-devis-gratuits.html', relevee_le: '2026-10-07', approuve: false },
    { id: 'veille-plombier-trouver-clients-gratuit', themes: ['site_absent'], metier: 'plombier', citation: "Avez-vous des conseils, des méthodes pour trouver des clietns ou des liens de site pour trouver de nouveau clients (pas de 123devis et compagnie, merci) du gratuit svp ?", source_url: 'https://plombiers-reunis.com/topic3385-des-conseils-pour-un-debut-dactivite-comment-trouver-des-chantiers.html', relevee_le: '2026-10-07', approuve: false },
    { id: 'veille-plombier-site-et-fiche-google', themes: ['site_absent'], metier: 'plombier', citation: "Mieux vos lancer son site internet et ça fiche Google et payer quelqu'un pour bien référencer tout ça", source_url: 'https://plombiers-reunis.com/topic8048-que-pensez-vous-des-plateformes-de-mise-en-relation.html', relevee_le: '2026-10-07', approuve: false },
  ].map((p) => Object.freeze({ ...p, themes: Object.freeze([...p.themes]) as readonly ThemePlainte[] }) as PlainteVeille),
)

/** Les entrées de douleurs.ts rangées par thème (relu à la main le 07/10 ; une entrée peut relever de deux thèmes). */
export const THEMES_DES_DOULEURS: Readonly<Record<string, readonly ThemePlainte[]>> = Object.freeze({
  'plaquiste-devis-pas-signes': ['devis_sans_suite'],
  'couvreur-aucun-retour-apres-devis': ['devis_sans_suite'],
  'plombier-demandes-en-baisse': ['devis_sans_suite'],
  'couvreur-clients-multiples-devis': ['devis_sans_suite'],
  'tous-plateforme-curieux-du-prix': ['devis_sans_suite'],
  'plombier-plateforme-meme-demande': ['devis_sans_suite'],
  'plombier-sites-demandes-sans-reponse': ['appels_manques'],
  'plombier-plateforme-contact-bidon': ['appels_manques'],
  'chauffagiste-recherches-sponsorisees': ['site_absent'],
  'plombier-pas-assez-d-appels': ['site_absent'],
  'electricien-remplir-l-agenda': ['site_absent'],
  'electricien-flyers-peu-d-appels': ['site_absent'],
  'plombier-manque-clientele': ['site_absent'],
  'chauffagiste-reseau-perdu': ['site_absent'],
  'menuisier-prospection-lendemain': ['site_absent'],
  'plombier-a-peine-de-quoi-survivre': ['site_absent'],
  'menuisier-client-oublie-de-payer': ['impayes'],
  'peintre-facture-refusee-client': ['impayes'],
  'macon-relance-solde-sans-reponse': ['impayes'],
  'macon-impayes-clients-tresorerie': ['impayes'],
  'couvreur-prix-brades-clients-tardifs': ['impayes'],
  'tous-impaye-donneur-d-ordre': ['impayes'],
  'macon-client-conteste-apres-chantier': ['impayes'],
  'plombier-bureaucratie': ['administratif'],
  'chauffagiste-paperasse': ['administratif'],
  'electricien-devis-une-heure': ['administratif'],
  'electricien-devis-longs': ['administratif'],
  'menuisier-devis-le-soir': ['administratif'],
  'menuisier-jour-devis-facturation': ['administratif'],
  'couvreur-devis-journee-entiere': ['administratif'],
  'electricien-premier-devis': ['administratif'],
  'electricien-redactions-ratees': ['administratif'],
  'peintre-calcul-du-devis': ['administratif'],
  'peintre-facture-fournitures': ['administratif'],
  'menuisier-detail-oublie-devis': ['administratif'],
  'macon-travaux-en-plus-non-factures': ['administratif', 'impayes'],
})

export interface Formulation {
  citation: string
  source_url: string
  relevee_le: string
  metier: string
  origine: 'douleurs' | 'veille'
  id: string
  approuve: boolean
}

/** Toutes les formulations d'un thème (les approuvées d'abord). Avec approuveesSeulement, seules celles qui peuvent entrer dans un message. */
export function formulationsPour(theme: ThemePlainte, { approuveesSeulement = false }: { approuveesSeulement?: boolean } = {}): Formulation[] {
  const r: Formulation[] = []
  for (const d of DOULEURS) if ((THEMES_DES_DOULEURS[d.id] ?? []).includes(theme)) r.push({ citation: d.citation, source_url: d.source_url, relevee_le: d.relevee_le, metier: d.metier, origine: 'douleurs', id: d.id, approuve: d.approuve })
  for (const p of PLAINTES_VEILLE) if (p.themes.includes(theme)) r.push({ citation: p.citation, source_url: p.source_url, relevee_le: p.relevee_le, metier: p.metier, origine: 'veille', id: p.id, approuve: p.approuve })
  return r.filter((x) => !approuveesSeulement || x.approuve).sort((a, b) => Number(b.approuve) - Number(a.approuve))
}

/** L'agrégat par thème : libellé, ce que Presti y répond, nombre de citations et les citations elles-mêmes. */
export function agregatParTheme(): { theme: ThemePlainte; libelle: string; reponse_presti: string; nombre: number; approuvees: number; sources: number; formulations: Formulation[] }[] {
  return THEMES.map((t) => {
    const f = formulationsPour(t.id)
    return { theme: t.id, libelle: t.libelle, reponse_presti: t.reponse_presti, nombre: f.length, approuvees: f.filter((x) => x.approuve).length, sources: new Set(f.map((x) => x.source_url)).size, formulations: f }
  })
}
