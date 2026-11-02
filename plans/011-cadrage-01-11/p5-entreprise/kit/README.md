# Kit commercial du mode A — « Presti pour l'entreprise »

> Tâche 035-002, écrite le 02/11/2026 par Claude Code sur l'hôte d'agents d'Oracle. Mode A : aucun client signé, aucune donnée réelle
> (p5:22). Le prompt 5 (`plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md`, « p5:NN ») fait foi ; la première réponse
> (`premiere-reponse.md`, § 5.1 et § 5.2, ligne 035-002 du tableau des tâches) donne le plan. Le juge est `scripts/kit-entreprise-qa.mjs`.

## Les pièces

| Pièce | Fichier | Ce qu'elle est | Source |
|---|---|---|---|
| 1 | `fiche-decouverte.md` | Le modèle de la fiche de découverte, en huit parties, rempli sur une entreprise fictive | p5:98-107, étape 2 (p5:52), livrable 2 (p5:280) ; `premiere-reponse.md` § 5.2 |
| 2 | `matrice.md` | La matrice irritant → type de valeur → workflow → agent → KPI | étape 3 (p5:53), livrable 3 (p5:281) ; `premiere-reponse.md` § 5.1 ; `fiches-videos.md:779-781` |
| 3 | `registre-donnees.md` | Le registre des données collectées : source, date, confiance, base légale, lieu | livrable 6 (p5:284) ; p5:90-96 ; p5:259-260 |
| 4 | `annexe-autonomie.md` | L'annexe d'autonomie du contrat : par type d'action, carte d'abord, la liste « jamais en automatique » | étape 5 (p5:55) ; p5:222-227 ; `lib/pilote/regles.ts:27`, `:30`, `:79-82` |

La conformité du kit (sous-traitants ultérieurs, modèle de contrat art. 28, question sur la licence de n8n) est la tâche 035-011, dans
`kit/conformite/`. Le jeu de données fictif est la tâche 035-006.

## Les conventions, que le juge fait tenir

1. **« Exemple. » partout.** Toute valeur, source ou date d'exemple porte « Exemple. » en tête : chaque cellule d'une colonne dont l'en-tête
   contient « Exemple. ». Le nom de l'entreprise fictive ne s'écrit jamais sans « Exemple. » juste devant. Aucune adresse e-mail hors de
   `@exemple.invalid`, aucun numéro de téléphone, aucun SIRET.
2. **Aucun montant.** Ni prix de l'offre (le prix, c'est Benj : p5:54), ni aucun autre montant en euros, ni pourcentage : le kit n'en a
   pas besoin, et un montant d'exemple se lirait comme un prix ou un gain.
3. **Aucune phrase interdite de p5:42.** Elles ne s'écrivent que dans une liste « jamais » : entre les balises `jamais:debut` et
   `jamais:fin`, sous un titre qui contient « jamais » ou « interdit », et où chaque ligne non vide est un point de liste. Le juge cherche
   les six premières familles de la liste ci-dessous, chacune par des motifs écrits dans `PHRASES_INTERDITES`. La septième ne se lit pas
   mécaniquement : le juge refuse seulement les promesses de disponibilité, et la relecture humaine reste due.
4. **Huit parties, dans l'ordre**, et quatre colonnes de traçabilité dans chacune (valeur, source, date, confiance : p5:94).
5. **Les numéros d'irritant** de la matrice sont ceux de la partie 3 de la fiche.
6. **La liste « jamais en automatique »** de l'annexe contient chacun des gestes de p5:226 et chaque identifiant de `OUTILS_JAMAIS_AUTO`,
   relu dans `lib/pilote/regles.ts` à chaque passage du juge.

## Ce que le kit ne dit jamais (p5:42)

<!-- jamais:debut -->
- Jamais un chiffre de gain non mesuré chez ce client.
- Jamais un témoignage ou un logo inventé.
- Jamais « remplace un salarié ».
- Jamais un appel téléphonique géré par l'IA.
- Jamais un rendez-vous pris seul.
- Jamais un paiement encaissé par l'IA.
- Jamais une fonction derrière un drapeau baissé.
<!-- jamais:fin -->

## Le contrat du jeu de données fictif (tâche 035-006)

`node scripts/kit-entreprise-qa.mjs --donnees <dossier>` juge le jeu « Exemple. Bâti-Démo » déposé par 035-006. Le dossier contient au
moins cinq fichiers JSON, chacun un tableau d'objets : `membres.json`, `demandes.json`, `devis.json`, `factures.json`, `relances.json`.
D'autres colonnes, prises des vraies tables, sont permises. Le juge exige :

- un `id` sur chaque ligne, et tout identifiant (`id`, `*_id`) de la forme `00000000-0000-4000-8000-` suivie de douze chiffres hexadécimaux ;
- un `artisan_id` sur chaque ligne, de la même forme ;
- `membres.json` : un `role` parmi titulaire, associé, administratif, compagnon, invité, et au moins un titulaire ;
- toute adresse e-mail en `@exemple.invalid` ;
- tout texte libre (`nom`, `client_nom`, `raison_sociale`, `message`, `objet`, `description`, `texte`) qui commence par « Exemple. » ;
- aucun numéro de téléphone hors des tranches que l'ARCEP réserve à la fiction (`01 99 00`, `02 61 91`, `03 53 01`, `04 65 71`,
  `05 36 49`, `06 39 98` : liste de mémoire, **à vérifier** sur la décision de l'ARCEP avant d'en dépendre ; non lue en ligne ici),
  aucun SIRET ;
- les sept cas limites, chacun porté par au moins une ligne dans un champ `cas_limite` : `sans_contact`, `doublon`, `stop`, `litige`,
  `palier_manque`, `prix_absent`, `escalade`.
