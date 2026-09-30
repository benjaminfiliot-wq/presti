# Liste de prospection à sec — vague 2, 27 septembre 2026

## Méthode

177 sociétés artisanales retenues dans l'agglomération de La Rochelle hors communes présentes en vague 1, autour de Rochefort, Surgères, Aigrefeuille-d'Aunis, Niort et Fontenay-le-Comte. Recherche par code postal et code NAF dans l'API Recherche d'entreprises : activité des dix métiers demandés, société active (forme juridique 5xxx ou 6xxx), établissement local actif et diffusion publique. Les 169 SIREN de la vague 1 et les 119 SIREN déjà contactés, soit 288 exclusions distinctes, sont réunis dans `siren-deja-contactes.txt`. Aucun de ces SIREN ne figure dans la liste. Les communes de l'agglomération rochelaise déjà utilisées en vague 1 ont été écartées.

Une première passe Firecrawl a ciblé 99 sociétés, par raison sociale et commune, avec deux résultats web au plus et sans scrape : 63 recherches réussies, 36 refusées ou en erreur. Après retrait des dénominations comportant clairement un nom complet de personne, 52 sociétés conservées étaient classées « non » et 8 « oui ». Une vérification complémentaire du manifeste et des remplaçants a utilisé 22 recherches réussies ; les résultats d'annuaire ou de portail ne sont pas assimilés à un site propre. Les recherches de téléphones de la même vague ont confirmé quatre sites supplémentaires, la liste RGE de l'ADEME deux autres, et l'audit Firecrawl le site propre d'une société. Deux sociétés parmi les « inconnu » ont été requalifiées « non » après recherche ciblée. La liste finale compte 50 « non », 15 « oui » et 112 « inconnu ». Les statuts corrigés ont été renotés avec Laya. « non » signifie seulement qu'aucun site propre n'a été repéré dans ces recherches limitées. Toute mention explicite d'opposition au démarchage dans les résultats examinés entraîne l'exclusion ; aucune n'a été constatée dans cette passe. Aucun contact n'a été effectué.

Chaque société a été évaluée en local avec Jev / Laya (`jev noul`, moteur `@receptron/laya` chargé une fois puis appelé pour chaque ligne). L'instruction évaluait si un site simple à 300 € serait utile et abordable, avec le métier, l'état actif, la présence web et l'année de création quand disponible : 164 dates retrouvées sur 177. Le score est la probabilité renvoyée par Laya, non une mesure des finances ni de l'intention d'achat. La raison résume les indices utilisés. Les numéros restent vides à ce stade : aucun numéro n'a été inféré.

## Sources

- [API Recherche d'entreprises](https://recherche-entreprises.api.gouv.fr/docs/) : SIREN, raison sociale, NAF, état actif, établissement et code postal, date de création. La colonne `source` pointe vers une requête publique par SIREN.
- [Firecrawl Search](https://docs.firecrawl.dev/features/search) : vérification limitée de la présence d'un site propre et résultats utilisés par la recherche de téléphones, sans scrape des annuaires.
- [Liste des entreprises RGE de l’ADEME](https://data.ademe.fr/datasets/6x4i1u8yqh1sfhis83l1gw6f) : deux sites déclarés par des établissements du même SIREN.
- [Jev / Laya](https://github.com/cnrai/openpave-jev) : notation locale. Aucune donnée n'a été envoyée à une IA gratuite ni à un modèle `:cloud`.

## Répartition

Total : **177** entreprises ; **50 sans site repéré**, **15 avec site**, **112 incertaines**.

| Métier | Entreprises |
|---|---:|
| carreleur | 18 |
| chauffagiste | 19 |
| couvreur | 17 |
| isolation | 13 |
| maçon | 19 |
| menuisier | 18 |
| paysagiste | 20 |
| peintre | 18 |
| plombier | 19 |
| électricien | 16 |

| Zone | Entreprises |
|---|---:|
| Charente-Maritime (17) | 103 |
| Deux-Sèvres (79) | 61 |
| Vendée (85) | 13 |

## Crédits Firecrawl

Solde constaté avant la vague 2 : **604 crédits**. La collecte de liste a consommé **172 crédits** : 2 pour une recherche exploratoire, 126 pour les 63 premières recherches réussies et 44 pour 22 vérifications complémentaires réussies. Les recherches de téléphones ont consommé **60 crédits** en parallèle. Neuf recherches complémentaires de téléphone ont coûté **18 crédits**. Solde relevé immédiatement après la dernière recherche de cette vague : **354 crédits**. Les appels Firecrawl consignés pour la vague ont utilisé **250 crédits** sur le plafond de 250 ; **aucun crédit** ne reste disponible pour cette vague. Un contrôle ultérieur a affiché **282 crédits** sur le compte partagé, sans nouvel appel Firecrawl de ce travail entre les deux relevés : l’écart de 72 crédits n’est pas attribué à la vague 2. Les recherches refusées ou en erreur n'ont pas été comptées comme des recherches réussies ; le solde du compte fait foi.

## Limites

- Deux résultats de recherche ne prouvent pas l'absence absolue d'un site. Le statut « non » doit être revérifié avant tout usage commercial, notamment si un résultat apparaît plus tard.
- 112 sociétés de la liste conservée n'ont pas de statut web établi. Les recherches refusées ou non effectuées restent « inconnu ».
- Aucun téléphone professionnel n'a été ajouté sans source publique vérifiée. L'absence de numéro ne signifie pas que l'entreprise n'en publie aucun.
- La note Laya est une priorisation indicative. Les finances et l'intérêt réel des entreprises ne sont pas connus. La qualification RGE n'a pas été utilisée lorsque l'information n'était pas disponible dans la réponse consultée.
- La liste est préparée à sec ; aucun appel, SMS, mail ni publication n'a été effectué.
