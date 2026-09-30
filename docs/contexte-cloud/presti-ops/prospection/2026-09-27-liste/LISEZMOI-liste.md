# Liste de prospection à sec — 27 septembre 2026

## Méthode

169 sociétés artisanales actives des communes retenues autour de Marans, La Rochelle et Rochefort (17), du sud de la Vendée (85) et de l'ouest des Deux-Sèvres (79). Sélection par métier et code postal, contrôle du SIREN et de l'état actif dans l'API Recherche d'entreprises, exclusion des 119 SIREN de la campagne de Marans. Seules les sociétés de forme juridique 5xxx ou 6xxx sont retenues. Aucun dirigeant, particulier ou courriel n'est collecté.

Pour les entreprises RGE, le téléphone professionnel, la qualification et le site déclaré proviennent de l'ADEME. Pour 125 sociétés sans site déclaré, une recherche Firecrawl ciblée par raison sociale et commune, limitée à deux résultats web et sans extraction de page, distingue les sites propres des annuaires et réseaux sociaux. 40 cas sans site ont reçu une seconde recherche limitée à un résultat. « non » signifie *aucun site propre repéré dans ces recherches*. « oui » indique un site propre déclaré par l'ADEME ou repéré par Firecrawl. Les liens ADEME vers un annuaire, un réseau social ou un domaine de franchise non spécifique sont classés « inconnu ».

Chaque société reçoit une probabilité de 0 à 1 via `jev noul --provider laya` en local, avec comme indices l'état actif, le métier, l'ancienneté de la société, RGE et l'état du site. La colonne `raison` résume ces indices. Il s'agit d'une priorisation commerciale pour l'offre de site à 300 €, sans vérification des finances. Personne n'a été contacté.

## Sources

- [API Recherche d'entreprises](https://recherche-entreprises.api.gouv.fr/search) : SIREN, raison sociale, NAF, commune, code postal, création et état actif. La colonne `source` pointe vers la recherche publique du SIREN pour les sociétés hors RGE.
- [Liste des entreprises RGE de l'ADEME](https://data.ademe.fr/datasets/6x4i1u8yqh1sfhis83l1gw6f) : qualification, téléphone professionnel publié et site déclaré. Pour les lignes RGE, `source` pointe vers l'enregistrement public du SIRET ; l'état actif a aussi été contrôlé dans l'API Recherche d'entreprises.
- [Firecrawl Search](https://docs.firecrawl.dev/features/search) : recherche de présence web, sans scrape, via `outils/firecrawl.sh`.
- [Jev / Laya](https://github.com/cnrai/openpave-jev) : notation locale ; aucune donnée envoyée à une IA gratuite ou à un modèle Ollama `:cloud`.

## Répartition

Total : **169** entreprises, dont **92 sans site repéré**, **63 avec site** et **14 incertaines**.

| Métier | Entreprises | Sans site repéré |
|---|---:|---:|
| carreleur | 13 | 7 |
| chauffagiste | 21 | 10 |
| couvreur | 12 | 6 |
| isolation | 6 | 3 |
| maçon | 17 | 9 |
| menuisier | 34 | 20 |
| paysagiste | 10 | 10 |
| peintre | 11 | 7 |
| plombier | 21 | 10 |
| électricien | 24 | 10 |

| Département | Entreprises | Sans site repéré |
|---|---:|---:|
| 17 | 56 | 27 |
| 79 | 66 | 42 |
| 85 | 47 | 23 |

## Crédits Firecrawl

Solde avant cette collecte : **995** crédits sur 1 000. Coût des recherches réussies d'après les réponses Firecrawl : **332 crédits**, dont 2 pour une recherche exploratoire et 330 pour 125 premières recherches et 40 secondes recherches. Solde actuel indiqué par Firecrawl : **663 crédits**, soit une baisse de **332 crédits** depuis le début. Écart solde/journal : **0 crédit(s)** ; le solde du compte fait foi pour le plafond. Plafond fixé pour cette mission : **350 crédits** ; marge d'après le solde : **18 crédits**. Les réponses 429 ont déclenché une attente progressive et ne sont pas comptées comme des recherches réussies.

## Limites

- Une ou deux recherches à faible nombre de résultats ne prouvent jamais l'absence absolue d'un site. Les fiches d'annuaire et les pages de réseaux sociaux ne sont pas assimilées à un site propre ; les cas « non » sont à revérifier avant tout usage commercial.
- Les sites et téléphones de l'ADEME sont déclaratifs et peuvent changer ; une cellule téléphone vide signifie qu'aucun numéro professionnel n'a été retenu depuis cette source.
- La note Laya est une estimation non calibrée sur des ventes réalisées. Elle n'atteste ni le budget réel ni l'intérêt de l'entreprise.
- La liste est préparée à sec : aucun appel, courriel ou message n'a été envoyé.
