# 036-028 — Audit de conformité du prompt 1 (Studio et Signature), preuve

## Ressources utilisées

- **MCP `cerveau`** : `regles_pour` (« audit, conformité, prompt 6 Signature Studio, agents et automatisations n8n »), `chercher` (« prompt 6
  Signature », « vidéos workflows n8n agents »), `lire` (`memoire-presti/workflows-vrais-outils-0311.md`,
  `memoire-presti/decisions-benj-0311-apres-midi.md`). Effet : les exigences de Benj du 03/11 (vrais nœuds, agent chef et ses spécialistes,
  « active toutes les automatisations en les testant ») entrent dans l'audit comme exigences 34 à 38.
- **MCP `n8n-oracle`, en lecture seule** :
  - `search_workflows` : 75 workflows ; requêtes « gabarit-ent », « provisionnement » et « client- » à 0 ;
  - `get_workflow_details` sur `presti-cerveau` et `gabarit-artisan-suivi` ;
  - `search_workflow_executions` depuis le 03/11 ;
  - `get_workflow_execution` 844 (erreur « Workflow is not active ») et 882 (banc du Cerveau, bilan relu).

  Effet : constats « aucun chef dans n8n », « Entreprise absente de n8n », « Cerveau publié aux lectures `noOp` ». Rien n'a été écrit dans
  n8n.
- **Sous-agent `general-purpose` (Sonnet)**, en lecture seule (`get_workflow_details` seulement) : comptes des nœuds de `-direction`,
  `-facturation` et `-devis`. J'ai recompté `-operations` avec `jq` sur la sortie sauvegardée.
- **Juges, un à la fois** (sorties dans ce dossier) :

  | Juge | Résultat | Sortie |
  |---|---|---|
  | `multi-agents-qa` | OK, 20 mutants | `juge-multi-agents.log` |
  | `p6-transverse-qa` (statique) | OK, 17 sur 17 | `juge-p6-transverse.log` |
  | `p6-transverse-qa --vivant` | **code 1** : `offres-affichage-qa` rouge, 8 juges verts | `juge-p6-transverse-vivant.log` |
  | `provisionnement-qa` | OK, 20 sur 20 | `juge-provisionnement.log` |
  | `offres-affichage-qa` | **code 1**, 3 empreintes changées | `juge-offres.log` |
  | `n8n-specs-qa` sur 036-019 | OK, 16 exports, 110 mutants | `juge-n8n-specs-036-019.log` |
  | `gabarits-{accueil,argent,terrain,entreprise}-qa` | OK | `juge-gabarits-*.log` |

- **Mes scripts de mesure** (dans ce dossier) :
  - `compter-exports.mjs` → `comptes-exports.txt` ;
  - `compter-version-n8n.mjs` → `comptes-version-n8n.txt` ;
  - `atteignabilite.mjs` ;
  - `tables-appelees.mjs` → `tables-appelees.txt` : 52 objets absents sur 61 ;
  - `mesurer-depots.mjs` → `mesure-depots.txt` : 2 669 workflows, médiane de 9 nœuds, 5,7 % de Code.
- **Sources lues** :
  - p6, parties 0 et 1 (l.1-425) ;
  - `RAPPORT-0311.md`, `OUTILLAGE.md`, `multi-agents.md`, `releve-depots.md`, `types-noeuds-depots.md`, `premiere-reponse.md`
    (plan des sections) ;
  - `outillage/gabarits/accueil.md` et `devis.md` ;
  - les `resume.md` de 036-001, 036-012, 036-016, 036-018, 036-019, 036-021 et 036-027 ;
  - `plans/analyse-videos.md` (synthèse, top 20, lignes des motifs) ;
  - les migrations 0157, 0174, 0185 et 0193 ;
  - `lib/flags.ts:340` et `:344`, `lib/plans.ts:115-120` ;
  - `.claude/agents/knowledge/audit.md` et son journal, `CLAUDE.md`, `.claude/rules/*.md`.
- **Non utilisé** : le skill `security-review` (l'audit porte sur la conformité, pas sur une revue de code) et le connecteur Supabase
  (absent de cette session).

## Ce qui est livré

- `plans/011-cadrage-01-11/p6-signature/audit-0311-conformite.md`. Il contient :
  - 40 exigences, chacune avec sa source, son état et sa preuve ;
  - 10 motifs vidéo ;
  - le comptage des dépôts, des exports et de n8n, avec 5 gabarits tirés au sort (`shuf`, graine « 036028 ») ;
  - les mesures ;
  - les trois écarts les plus graves ;
  - le verdict.
- Les sorties de commande et les scripts de mesure de ce dossier.

## Verdict (copie)

**Non, pas prêt.**
- La logique de décision est prouvée hors ligne et en simulation : exécution 882, et les juges verts.
- Mais les gabarits « à vrais outils » appellent 52 objets de base qui n'existent pas, et écrivent dans des colonnes absentes.
- Le multi-agents n'est pas dans n8n, et il est décoratif dans les fichiers.
- Le Cerveau publié ne lit rien. Aucun compte réel n'est branché.
- `offres-affichage-qa` est rouge au commit en production.

## Entrée pour `.claude/agents/knowledge/audit.journal.md` (hors de mon périmètre, à recopier par la session principale)

## 2026-11-03 — presti-audit-conformite — Conformité du prompt 1 (Studio et Signature), tâche 036-028
- **Contexte** : Benj demande si les systèmes d'agents et d'automatisation de Studio et Signature sont prêts, fonctionnels, et conformes aux
  vidéos et aux dépôts. L'audit est en lecture seule : exports, n8n (MCP en lecture), juges rejoués un par un, migrations. Rapport :
  `plans/011-cadrage-01-11/p6-signature/audit-0311-conformite.md`. Verdict : **NON**, trois écarts graves.
- **Constat** :
  1. 52 des 61 tables, vues et fonctions appelées par les gabarits sont absentes des migrations. Les écritures visent `organisation_id` et
     `cle`, absents de `opportunites`, `assistant_actions` et `messages`, et `pilote_file` au lieu de `actions_auto`.
  2. Aucun chef ni `agentTool` dans n8n : les gabarits de n8n sont les exports 036-014 et 036-015, pas 036-019. Les 9 gabarits Entreprise
     sont absents de n8n.
  3. `presti-cerveau` est publié, mais ses lectures sont des `noOp`.
  4. `offres-affichage-qa` est rouge depuis le passage aux prix de 30 € et 60 €.
  5. Le rapport du 03/11 surévalue le travail : 20 gabarits annoncés pour 19, les lots 036-016 et 036-018 dits « dans n8n », et rien sur la
     base manquante.
- **Décision / action** : rapport et preuve seulement ; aucune correction.
- **À retenir** :
  - (a) Un juge de graphe n8n vert ne prouve pas le contrat avec la base. Il faut relever chaque `/rest/v1/<objet>` contre les migrations
    (`tables-appelees.mjs`).
  - (b) Comparer le nombre de nœuds d'un workflow dans n8n à celui de chaque export dit quelle version est vraiment en place.
  - (c) « Publié » (`active: true`) ne veut pas dire « fonctionnel » : il faut lire les nœuds de lecture, un `noOp` épinglé ne lit rien en
    production.
  - (d) Le garde d'Orca refuse toute commande Bash qui contient le nom du lanceur de vérification (motif « build ») : passer par
    `ls scripts/tout-v*.mjs` dans une variable.
