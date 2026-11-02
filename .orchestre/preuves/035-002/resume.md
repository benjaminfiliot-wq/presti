## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« offre entreprise, n8n : kit commercial du mode A… ») : réponse vide (`[]`), donc aucune règle de
  plus que les cinq de `.claude/rules/`. Je les ai appliquées : aucun prix (le prix, c'est Benj), zéro donnée réelle, pas d'écriture
  dans le vault.
- **MCP `cerveau`, `chercher` puis `lire`** : l'ADR-001 (`vault/10 Presti/04 Décisions/ADR-001 — Toutes les automatisations dans n8n.md`),
  l'ADR-008 (`… ADR-008 — n8n-first — la logique métier récurrente aussi.md`) et `memoire-presti/source-restructureai-depots-n8n-0211.md`.
  Effet sur le kit : chaque automatisation de la matrice est un workflow `ent-exemple-*` et aucune n'est du code de l'app. Le registre
  dit que n8n lit et écrit sans rien garder. Aucun modèle de dépôt n'est copié : on n'en reprend que des motifs.
- **Skill `reseau-neuronal`** : il fixe l'ordre (lire avant de produire, citer les notes par leur chemin) et confirme qu'on n'écrit pas
  dans le vault hors d'une tâche `SaaS/…`. Rien n'y est écrit.
- **Skill `presti-verify`** : une preuve est une sortie de commande. Build, push et vérification en direct ne s'appliquent pas (des
  documents et un script hors ligne ; build et push sont interdits sur cet hôte). La preuve est donc la sortie du juge, ci-dessous.
- **Le prompt 5** (`plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md`), lu en entier par morceaux. Il donne les huit
  parties (p5:100-107), la règle des données (p5:90-96), l'autonomie (p5:222-227), les livrables 2, 3 et 6 (p5:280-284) et les
  interdits de p5:42. Chaque référence p5:NN du kit a été recalée ligne par ligne (`sed -n`). Six étaient fausses à la première
  écriture, elles sont corrigées.
- **La première réponse** (`p5-entreprise/premiere-reponse.md`) : § 5.1 (Bâti-Démo et la matrice), § 5.2 (le plan de la fiche et les
  apports des vidéos), § 7.3 (K1 à K8, base « inconnue » en mode A), § 8 (questions 10, 15 et 27, reprises au registre), et la ligne
  035-002 du tableau des tâches. La ligne 035-006 m'a fait ajouter le mode `--donnees` au juge.
- **Les vidéos déjà analysées** (`p5-entreprise/fiches-videos.md:770-790`) : la colonne « type de valeur » de la matrice et la règle
  « un irritant de pur gain de temps n'a qu'un KPI déclaré ». Les questions des vidéos (procédures écrites, « claquer des doigts »,
  rôle et coût des outils, sortie des données) viennent du § 5.2, qui cite k1adsrTHwPg, O3A2xnBadFo et RWKyUJLi-kI.
- **Le code, relu au fichier:ligne** : `lib/pilote/regles.ts:27` (délai 10 min), `:30` (plafond 20 par jour), `:79-82`
  (`OUTILS_JAMAIS_AUTO`, dix gestes) ; `lib/plans.ts:77` (opt-in des impayés), `:103` (Entreprise = Signature + `organisation.membres`) ;
  `supabase/migrations/0006_factures.sql` (colonnes `artisan_id`, `client_nom`). Le juge relit `regles.ts` à chaque passage : si la liste
  du code change, l'annexe rougit.
- **Le plan du chantier 4** (`chantier-4-assistant-plan.md:555`, § 12.1) : les cinq rôles d'une organisation, et la règle « une procédure
  du client est une donnée de son compte, sous RLS ».
- **`scripts/orchestre.mjs:164-189`** (le lecteur d'en-tête) : il m'a servi à diagnostiquer le vérificateur de la tâche, cassé
  (dernière section).
- **Écartés, et pourquoi** : le MCP `n8n-oracle` et `fiche-methode-n8n.md` / `fiches-depots.md`, car cette tâche ne construit aucun
  workflow (035-003 à 035-007 le feront) ; les skills de design, car le kit est fait de documents Markdown, pas de pages.

## Les pièces du kit (`plans/011-cadrage-01-11/p5-entreprise/kit/`)

| Pièce | Fichier | Sources p5:NN | Ce qu'elle tient |
|---|---|---|---|
| Index et conventions | `README.md` | p5:22, p5:42, p5:54 | Les quatre pièces et leurs sources ; les six conventions que le juge fait tenir ; les sept interdits de p5:42 dans une liste « jamais » ; le contrat du jeu de données de 035-006 |
| 1. Fiche de découverte | `fiche-decouverte.md` | p5:52, p5:92-107, p5:260, p5:280 | Huit parties dans l'ordre, et 41 champs avec leur question, leur valeur, leur source, leur date et leur confiance (`mesuré`, `déclaré`, `estimé par le client`, `inconnu`). Toutes les valeurs d'exemple portent « Exemple. ». Les questions des vidéos sont placées dans les parties 2, 3, 4 et 5. La fiche se signe des deux côtés |
| 2. Matrice | `matrice.md` | p5:53, p5:163, p5:189-196, p5:271, p5:281, p5:288, p5:298 | Cinq irritants (Exemple. I1 à I5), les mêmes numéros que la partie 3 de la fiche, chacun avec son type de valeur, son workflow `ent-exemple-*`, ses agents, son KPI (K1 à K8) et sa base « inconnue ». I4 (temps) est signalé « aucun ROI mesurable », I5 « sans KPI mesurable » |
| 3. Registre des données | `registre-donnees.md` | p5:90-96, p5:218, p5:259-260, p5:284 | Douze données, chacune avec de qui, la source, la date, la confiance, une base légale proposée (art. 6, à relire par un juriste), le lieu (Supabase UE sous RLS, ou l'outil du client ; n8n n'est qu'un passage) et la durée |
| 4. Annexe d'autonomie | `annexe-autonomie.md` | p5:27, p5:54-57, p5:222-227, p5:263 | Cinq types d'action, tous en « carte à valider » par défaut ; le passage à l'automatique se fait par écrit, après le mode ombre, et l'accord est révocable. On y trouve le pilote (10 minutes, 20 par jour, lus dans le code), les sept gestes de p5:226 et les dix identifiants de `OUTILS_JAMAIS_AUTO`. L'acceptation est signée des deux côtés |

Ce que le kit ne contient pas : aucun montant (ni prix de l'offre, ni euros, ni pourcentage), aucune cible chiffrée, aucun chiffre de
gain, aucune adresse hors de `@exemple.invalid`, aucun téléphone, aucun SIRET.

## Le juge : `scripts/kit-entreprise-qa.mjs`

Hors ligne, sans dépendance, sans écriture. Il porte 38 règles (K1-K3, E1-E5, M1, J1, P42, F1-F6, X1-X7, R1-R5, A1-A9), puis il rejoue
45 mutants du kit et 8 mutants des données. Chaque mutant doit rougir **pour la raison attendue**. Si le kit lui-même n'est pas vert, les
mutants ne sont pas joués : un témoin rouge ne prouve rien. `--donnees <dossier>` juge le jeu de 035-006 selon le contrat du README.

Sortie complète : `.orchestre/preuves/035-002/kit-entreprise-qa.log`. En résumé (02/11/2026, hôte d'agents Oracle) :

```
$ node scripts/kit-entreprise-qa.mjs
· lib/pilote/regles.ts : 10 gestes « jamais automatiques », délai 10 min, plafond 20 par jour
✓ kit plans/011-cadrage-01-11/p5-entreprise/kit : aucun défaut
✓ mutant « pièce absente : le registre » → K1 (attendu K1)
✓ mutant « fiche sans la partie 5 » → F1 (attendu F1)
… (43 autres mutants du kit, tous ✓)
✓ mutants du kit : 45/45 rouges pour la raison attendue
✓ mutants du jeu de données (jeu témoin en mémoire) : 8/8 rouges pour la raison attendue
kit-entreprise-qa : PASS
# code 0
```

Les mutants couvrent chaque exigence de la ligne 035-002 :
- **Les huit parties** : une partie retirée, deux parties inversées, une colonne de traçabilité renommée, une confiance hors liste, un
  « inconnu » passé en « mesuré », une question des vidéos retirée (deux fois), une signature retirée.
- **« Exemple. »** : une valeur et une source sans la marque, le nom de l'entreprise fictive sans la marque, une adresse e-mail réelle, un
  téléphone, un SIRET.
- **Aucun montant de l'offre** : « 990 € HT par mois », « 1 500 euros », « 30 % », et un forfait chiffré sans symbole.
- **Aucune phrase de p5:42** : « remplace un salarié », un appel géré par l'IA, un rendez-vous pris seul, un acompte encaissé
  automatiquement, un témoignage, un chiffre de gain, une promesse « déjà disponibles », et une phrase interdite glissée dans une liste
  « jamais » mal formée.
- **La matrice, le registre et l'annexe** : un ou plusieurs mutants pour chaque règle X2 à X7, R1 à R5 et A2 à A9.

Deux faiblesses ont été trouvées en route, et corrigées :
- **Le juge s'est retourné contre mon propre README.** Au premier passage, il a rougi : la convention 3 citait les phrases interdites hors
  d'une liste « jamais ». J'ai réécrit le README. Le même passage a montré un faux positif de mon fait : « R**appel** de paiement »
  déclenchait A7. Le motif est désormais `\bappels?\b`.
- **Un mutant trop faible.** « procédures écrites retirée » survivait : il ne remplaçait que les minuscules. Je l'ai rendu insensible à la
  casse, et il rougit désormais en F5.

Le mode `--donnees` a été éprouvé sur un vrai dossier écrit dans `/tmp`, hors du dépôt, puis effacé. Un jeu propre donne PASS (code 0).
Un nom et une adresse réels donnent D6 et D5, FAIL (code 1). Un dossier absent donne FAIL.

## Risques et points à valider

1. **Le vérificateur de la tâche est cassé, et ce n'est pas de mon fait** : voir la dernière section et
   `.orchestre/en-cours/035-002.question.md`.
2. **Le juge n'est pas inscrit dans `SUITES`** (`scripts/tout-verifier.mjs`), qui est hors de mon périmètre. Personne ne le jouera tant
   que la session principale ne l'y ajoute pas (suite `cout: 'local'`, hors ligne).
3. **La septième famille de p5:42, « une fonction derrière un drapeau baissé »**, ne se lit qu'en partie : le juge refuse les promesses de
   disponibilité, rien de plus. La relecture humaine reste due ; c'est écrit au README.
4. **Les tranches de téléphone de fiction de l'ARCEP** (mode `--donnees`) sont de mémoire, non lues en ligne. Elles sont marquées « à
   vérifier » au README avant que 035-006 en dépende.
5. **Les bases légales du registre sont proposées, pas tranchées.** Elles sont à relire par un juriste (035-011, audit
   `presti-audit-conformite`). Même chose pour la durée légale de conservation des factures, à confirmer par le comptable.
6. **L'auteur du juge est aussi l'auteur du kit.** La règle du dépôt veut un auditeur distinct : une contre-lecture par un autre agent
   reste à faire.

## Le vérificateur de la tâche (blocage)

L'en-tête de `.orchestre/en-cours/035-002.md` a perdu ses antislashs au dépôt : `[\s\S]` y est devenu `[sS]`, `\n` un vrai retour à la
ligne, et `\s` un simple `s`. `lireTache` (`scripts/orchestre.mjs:184-188`) lit l'en-tête ligne à ligne. La commande s'arrête donc à
`…t.match(/## Ressources utilisées([sS]*?)(`, avec un guillemet ouvert, et bash répond :

```
bash: -c: line 1: unexpected EOF while looking for matching `"'
code=2
```

Elle échoue avant même de lire cette preuve, quoi qu'il y ait dedans. La tâche 035-001 porte le même défaut. Les tâches 032-029 et 032-033,
déposées plus tôt, ont la forme juste. Une fois les antislashs rétablis comme en 032-029, la seconde moitié de la commande passerait :
cette section « Ressources utilisées » compte plus de trois points de liste. La première moitié, `node scripts/kit-entreprise-qa.mjs`, est
verte (code 0). Je ne touche pas l'en-tête, hors de mon périmètre : la question à options est posée.
