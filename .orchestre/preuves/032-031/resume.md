## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« n8n, après-chantier, rappel, migration… ») : la règle de remplacement en cinq pas
  (`regles-presti/migration-production.md`), ADR-001 (l'après-chantier fait partie du cron à migrer). A fixé le périmètre : pas 1 à 3 seulement,
  rien d'effacé, l'ancien appel reste.
- **MCP `n8n-oracle`** : `get_workflow_best_practices` (scheduling : fuseau dans le workflow, idempotence par la base, pas de
  `alwaysOutputData` sans raison — gardé ici parce qu'une table vide doit encore mener au bilan) ; `get_workflow_sdk_reference` (patterns :
  `executeOnce` sur chaque lecture chaînée, sinon multiplication des appels) ; `search_nodes` (Schedule Trigger, HTTP Request 4.5, Code 2,
  Error Trigger) ; `search_workflows` (aucun `presti-apres-chantier` avant) ; `validate_workflow`, `create_workflow_from_code`,
  `test_workflow` (pin data), `get_workflow_execution` (exécution 355), `get_workflow_details` (export).
- **`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`** (points 5, 6, 9) : branche d'erreur interne (le workflow d'erreur commun
  n'existe pas encore) ; idempotence tenue par la clé unique en base `(artisan_id, cle)`, pas par n8n ; n8n garde les exécutions 14 jours →
  ajouté à « Avant la bascule » (sauvegarde des succès coupée avant publication).
- **`plans/011-cadrage-01-11/p5-entreprise/fiches-depots.md`** et **`fiches-videos.md:386-410`**, **`plans/analyse-videos.md:470-554`**
  (vidéo angelotturri, 58,1-85,3 s) : la vidéo vend un « contrat d'entretien » envoyé par SMS ; le plan l'écarte (§0 bis, rang 6 ;
  question 6 a) : ce workflow ne propose qu'une date, n'envoie rien, aucun texte « comme s'il avait accepté » (rang 10).
- **Le plan du chantier 4** (`chantier-4-assistant-plan.md` : tableau des chemins codés l.169, règles communes l.127-158, rang 6, question 7,
  détecteur 12) et **`supabase/migrations/0189_role_lecture_n8n.sql`** : « ni texte libre (… objet, titre) » → l'équipement et l'opposition
  passent par une vue proposée, jamais par une lecture de texte.
- **Les juges du soir, pour la forme** : `scripts/suivi-artisan-qa.mjs` (rejeu des nœuds Code hors ligne, mutants),
  `scripts/n8n-specs-qa.mjs` (garde commune, non modifiée, verte sur l'export), l'export de `presti-detecteurs` (gabarit des lectures HTTP,
  pagination, jointure par compte ET identifiant, M2 de 032-010).

## Le workflow

`presti-apres-chantier`, n8n d'Oracle, **id `18cmxK4gy1ceqFYD`**, `active: false`, aucune version publiée (`activeVersionId: null`),
versionId `e4061868-5ecc-49c7-8390-20bca2c3f92a`, fuseau `Europe/Paris`, 12 nœuds. Export : `presti-apres-chantier.workflow.json` (écrit
depuis la source de création, identique au rendu de `get_workflow_details` ; le rejeu de l'essai 355 le vérifie, contrôle E3 du juge).
Déclencheur 8 h (Paris) → contexte (jour de Paris, copie figée des constantes) → six lectures `GET` aux colonnes permises (identifiants,
dates, statuts, booléens, codes) → règle de `tourApresChantier` en code pur → **pose en simulation** (`ecrit: false`, aucune requête) ;
branche d'erreur sans donnée ni envoi. Aucun identifiant créé ni modifié (« Supabase account », déjà là). Détail : le brief
`plans/011-cadrage-01-11/briefs/c4-n8n-apres-chantier.md`.

## L'essai à blanc

`test_workflow` sur pin data fictive, **exécution 355, `success`** (02/11/2026 20:04:50 UTC). Les sept cas demandés, dans un seul passage
(`mondeEssai` du juge, régénérable par `--pin=2026-11-02`) : chantier terminé hier (avis le 03/11, entretien chaudière le 17/10/2027),
terminé il y a 6 mois (entretien de la pompe à chaleur le 17/04/2028, pas d'avis : hors rattrapage), avec opposition (rien), déjà rappelé
(rien), compte en pause de ses demandes (`leads_pause` : avis posé, comme l'ancien code qui ne lit pas cet état), offre Studio (rien),
offre Signature. Sortie de n8n : 2 comptes, **4 lignes**, 1 opposition écartée — `essai-n8n.json`. La « pause générale » est jouée par le
juge (cas « active » et « illisible ») : rien n'est posé.

## Comparaison à l'ancien code

`node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/apres-chantier-n8n-qa.mjs` → **OK, code 0** : 16 cas × 3 instants
(14 h UTC ; 23 h 30 UTC, déjà le lendemain à Paris ; 28/02/2027 23 h 30 UTC), mêmes données fictives données à `tourApresChantier`
(doublure qui rejoue les requêtes de `route.ts:316-339`) et aux nœuds Code de l'export. Chaque écart est rejoué par l'ancien code lui-même
sur les données ajustées ; toute autre différence rougit. Cas par cas (jour de Paris du 02/11/2026) :

| Cas | Ancien | n8n | Résultat |
|---|---|---|---|
| essai (les sept cas) | 6 | 4 | mêmes clés et échéances ; 2 de moins = chantier opposé (É2) ; textes sans nom (É1) |
| terminé hier | 2 | 2 | identiques (É1 sur le texte) |
| il y a 6 mois ; rattrapage à la limite (17 j, activé il y a 3 j) | 2 | 2 | identiques (É1) |
| avec opposition | 2 | 0 | É2 |
| opposition posée depuis l'avis : l'ancien REPOSE l'entretien retiré par la route | 1 | 0 | É2 (défaut de l'ancien, corrigé) |
| déjà rappelé (clés existantes, rang plus loin) | 2 | 2 | identiques (É1) |
| pause générale active | 0 | 0 | identiques |
| pause générale illisible | 0 | 0 | identiques (doute = pause des deux côtés) |
| Studio, Essentiel, sans offre | 0 | 0 | identiques |
| Signature avis seul, Entreprise entretien seul, fondateur en Studio, réglages décochés | 3 | 3 | identiques (É1) |
| en cours, fin future, plus de 3 ans, sans date ; équipement lu dans une ligne du devis | 2 | 2 | identiques, mot pour mot |
| plafond : 26 chantiers → 20, les plus proches d'abord | 20 | 20 | identiques (É1) |
| « Pompe à chaleur » avec majuscule (motif sensible à la casse, `lib/apresChantier.ts:97`) | 1 | 1 | identiques |
| signal d'un autre compte sur le même chantier (client opposé) | 2 | 0 | É2 ; la ligne étrangère est ignorée (jointure par compte ET chantier) |
| chantier absent de la vue des signaux | 4 | 2 | É4 |
| deux comptes : la clé d'un autre compte ne compte pas | 2 | 2 | identiques (É1) |
| idempotence : second passage, rappels du premier posés | 0 | 0 | 4 au premier passage, 0 au second |

Écarts écrits (brief, « Comparaison ») : **É1** texte sans nom de client (n8n ne lit pas `client_nom`) ; **É2** opposition (0171) respectée
dès la pose ; **É3** 8 h Paris au lieu de 8 h UTC, même jour calculé ; **É4** chantier sans signal : rien ; **É5** une lecture en erreur
arrête le passage entier, et la variable Vercel `PAUSE_GENERALE` n'arrête plus ce passage (seul l'interrupteur en base).
Copie figée contrôlée contre le code : seuils, équipements, offres par `peut(plan, 'crm')`, drapeau `crmApresChantier`, formule de
l'empreinte (C1-C6). **28 mutants, tous rouges**, dont les trois demandés : opposition ignorée, clé de l'avis changée, fuseau changé (UTC,
dans le code et dans les réglages) ; et pause ignorée, pause illisible prise pour levée, Studio admis, fondateur ignoré, plafond, délai,
rattrapage, préavis, périodicité, clés ignorées ou mêlées entre comptes, signal joint par le seul chantier, fin à venir, drapeau, écriture
réelle, déclencheur à 9 h, workflow actif, `client_nom` ou `titre` lus, filtre « terminé » ôté, lecture en POST, nœud d'écriture, branche
d'erreur ôtée. Garde commune `n8n-specs-qa` sur l'export : R1 à R7 tenues.

Limite, dite : la vue `apres_chantier_signaux` n'existe pas encore ; le juge la simule avec `equipementDe` du code. La traduction SQL
proposée (motifs POSIX) n'est prouvée par personne ici : c'est un préalable de la migration (brief, « Avant la bascule », 2).

## Avant la bascule

Pas 4 et 5 : rien n'est fait ce soir ; l'ancien appel (`app/api/cron/relances/route.ts:313-344`) tourne toujours. Ce que Benj décide, dans
l'ordre (détail et SQL dans le brief) :
1. accepter les écarts É1 à É5, ou demander la pose par une fonction en base qui remplit le nom côté base (supprime É1) ;
2. le « go » de la migration : `n8n_pause_generale()` et la vue `apres_chantier_signaux` (essai à sec sur les textes des 16 cas d'abord) ;
3. la voie d'écriture de n8n (0189 dit « n8n n'écrit jamais ») : fonction `crm_poser_rappels_apres` (recommandée) ou nœud direct, plus
   l'exception déclarée dans la garde commune (R5) ;
4. avant publication : registre (« Lectures de n8n sur le serveur Oracle »), identifiant d'alerte de la branche d'erreur, sauvegarde des
   exécutions réussies coupée ;
5. un passage d'ombre de quelques jours (simulation publiée, comparée chaque matin aux rappels posés par le cron) ;
6. **pas 4** : un drapeau neuf (`apresChantierParN8n`) qui saute `tourApresChantier` dans le cron, code gardé ; publier l'écriture n8n
   d'abord, constater un passage, puis couper (la clé rend un jour de chevauchement sans effet ; un trou perdrait un jour) ;
7. **pas 5** : `crmApresChantier` gouverne toujours écran et routes ; le workflow en porte la copie (contrôlée, C4) : le baisser impose de
   dépublier `presti-apres-chantier` le même jour.

## Fichiers

- `scripts/apres-chantier-n8n-qa.mjs` (neuf) — le juge ; hors `SUITES` de `scripts/tout-verifier.mjs` (interdit à cette tâche) : à y
  ajouter par la session principale.
- `plans/011-cadrage-01-11/briefs/c4-n8n-apres-chantier.md` (neuf).
- `.orchestre/preuves/032-031/` : `presti-apres-chantier.workflow.json`, `essai-n8n.json`, `apres-chantier-n8n-qa.txt` (sortie du juge), `resume.md`, `verifier.log`.
- n8n d'Oracle : `presti-apres-chantier` (`18cmxK4gy1ceqFYD`), inactif. Aucun autre workflow touché, aucun identifiant, aucune base, aucun envoi.
