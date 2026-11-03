# 036-038 — preuve : le palier « réel » de Studio et Signature

## Ressources utilisées

| Ressource | Ce qu'elle a changé dans le travail |
|---|---|
| **MCP `cerveau`**, `regles_pour` | Elle a rappelé la règle de la marque blanche : expéditeur au nom de l'artisan sur `contact@prestiapp.fr`, Reply-To de l'artisan. Le Décider et le canal l'appliquent tous deux. |
| **MCP `cerveau`**, `chercher` | Il m'a mené à `mise-en-service.md` (11a, 11b, 12) et à `premiere-reponse.md` (« toute sortie passe la porte de conformité », Signature à 10 minutes et 20 par jour). Ce sont l'ordre d'activation de `reel.md` § 5, le plafond de 20 par jour du Décider, et la limite écrite sur `lib-porte-conformite`. |
| **MCP `n8n-oracle`**, `get_workflow_sdk_reference` (patterns, rules) | Chaînes imbriquées dans les branches. `executeOnce` et `alwaysOutputData` sur les lectures, toujours avec un nœud qui traite le cas vide. Identifiants existants recopiés, jamais inventés. |
| **MCP `n8n-oracle`**, `get_workflow_details`, `get_workflow_history` | J'ai relu l'état réel de `presti-cerveau` avant d'y écrire : brouillon `6fedfef9` de 036-036, non publié. D'où la décision de ne **pas** publier, et des retouches par ancres qui laissent 35 nœuds sur 40 intacts. |
| **MCP `n8n-oracle`**, `list_credentials` | Il a confirmé que l'identifiant « Resend (Presti) » existe (`26cc3331017df2d6`, Header Auth). Aucun identifiant n'a été créé. |
| **MCP `n8n-oracle`**, `create_workflow_from_code`, `update_workflow`, `test_workflow`, `get_workflow_execution` | J'ai créé `lib-envoyer-courriel` et `presti-dep-envoi`, posé les cinq retouches du Cerveau, joué l'essai réel (2749) et son rejeu (2753), et relu les envois. |
| **Mémoire du projet** : `n8n-poser-un-gabarit`, `n8n-secret-hors-executions`, `n8n-prouver-une-ecriture` | `crypto` est refusé aux nœuds Code : j'ai écrit un SHA-256 en JS pur, prouvé égal à `node:crypto`. Le workflow d'erreur est posé à la création par le SDK. Le canal ne conserve aucune exécution réussie. Le MCP n'exécute pas un déclencheur manuel : j'ai joué l'essai par `test_workflow` sur le vrai workflow. `ListAgents` : aucune autre session sur la tâche. |
| **Skill `presti-verify`** | Le cycle (build, déployé, vérifié en direct, données nettoyées) n'est pas faisable ici : build interdit, aucune base. Ces pas sont écrits pour la session principale (`reel.md` § 4 et § 5) et ne sont pas déclarés faits. |
| **Règles** : `.claude/rules/autonomie-abonnements.md`, `securite.md`, `migration-production.md`, `architecture-outils.md` ; **code** : `lib/plans.ts` | La table des capacités, recopiée de `peut()`. L'impayé en opt-in. Jamais de prix ni de paiement (types non envoyables). L'envoi vit dans n8n (n8n-first) et l'app ne fait que se taire. Un type à la fois. Aucune migration. |
| **Code et preuves voisins** : `lib/email.ts`, `lib/mentionAssistant.ts`, `lib/crm/apresOpposition.ts`, `0157`, `0193`, `0194`, `ombre-reel.md`, `branchement-reel.md`, `departements-reels.md`, `scenario-ombre.mjs` | Le format de l'expéditeur, le texte de la mention d'IA et l'empreinte d'opposition, repris tels quels. Le réel naît `en_attente` (déclencheur de 0194) et se pose par un fondateur (0193). Le modèle du script d'essai en base. |
| **Fiches de méthode n8n** (`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`), via `branchement-reel.md` | Chaque lecture est filtrée par compte (point 8) et les succès ne sont pas conservés (point 9). |

Les skills de design, de vidéo et d'animation ne servent pas ce domaine : aucune page ni aucun contenu n'est produit ici.

## Ce qui est livré

| Fichier ou objet | Quoi |
|---|---|
| `lib/agents/n8n/envoi-reel.mjs` (neuf) | La source unique du code n8n du réel : `BLOC_CARTES_REEL` et les quatre fonctions `appliquerReel*` du Cerveau, puis `CODE_COMPTES_REEL`, `CODE_DECIDER`, `CODE_RECLAMEES`, `CODE_RESULTATS`, `CODE_CONTROLER`, `CODE_RENDRE` et les écritures. |
| `lib/agents/n8n/garde-reel.ts` (refait) | `decisionGardeReel`, une fonction pure, et `gardeReel`, bornée à 1,5 s. Toute erreur ou lenteur rend `false` : l'app garde la main. |
| `app/api/leads/route.ts` | Le travail de Codex est gardé. J'y ajoute l'avis à l'artisan dans la branche du réel. Ni réponse, ni proposition, ni accusé. |
| `app/api/cron/relances/route.ts` | Le travail de Codex est corrigé : une relance cédée est désormais **prise**. Avant, elle restait due et revenait chaque jour dans le lot de 100. S'y ajoutent la garde de la Facturation sur le tour des impayés (`magasinHorsReel`) et le compte `cedees_n8n`. Les fins de ligne CRLF de HEAD sont rétablies. |
| `app/api/assistant/agents/route.ts` | Le code n'a pas changé : son « Valider » atomique était juste. Seul le commentaire est mis à jour (le clic est le seul chemin vers l'envoi au réel). |
| `scripts/reel-qa.mjs` (refait) + une entrée dans `SUITES` (`scripts/tout-verifier.mjs`) | Le juge : 16 contrôles et 28 mutants. |
| `plans/011-cadrage-01-11/p6-signature/reel.md` (refait) | Le chemin de chaque offre, la garde type par type, l'essai, le geste d'activation et le retour arrière. |
| n8n : `presti-dep-envoi` `DPZnxlsZHUwFEY0H`, `lib-envoyer-courriel` `Zs4fVsKZThSRCDjd` (neufs, **non publiés**) ; `presti-cerveau` (brouillon `02860d45`, actif **inchangé** `78c413bb`) | Les exports sont dans ce dossier : `*.workflow.json`. |
| Ce dossier | Les relevés d'essai : `banc-fictif.json`, `essai-pindata.json`, `essais-n8n.json`. Les scripts : `poser-n8n.mjs` (générateur du code SDK depuis la source ; son mode `banc` n'a pas servi, l'essai a été joué sur le vrai workflow) et `essai-compte-test.mjs` (l'essai en base, pour la session principale). |

Gardé de Codex et d'Antigravity : le placement de la garde dans `/api/leads`, le clic atomique de la boîte, `gardeReel` sur les deux lignes.
Refait :
- le juge, qui ne testait que des expressions régulières sur du texte, avec des mutants sans effet ;
- la relance cédée mais jamais prise ;
- la garde sans délai.

## L'essai réel (vers delivered@resend.dev seulement)

- `presti-dep-envoi` **2749** : deux envois Resend.
  - Studio, au clic : `01a1a3a9-e1dd-7aff-95ed-02fe30fc383d`.
  - Signature, par le pilote : `01a1a3a9-e2ae-7cd0-8690-887dd515c092`.
  - Trois cartes écartées (STOP, sans opt-in, « Presti ») et trois laissées (pilote pas échu, Studio sans clic, carte de l'ombre).
- **2753**, le rejeu : les deux mêmes identifiants, donc aucun second envoi.
- Détail dans `essais-n8n.json` et dans `reel.md` § 4.

## Ce que je n'ai pas fait, et pourquoi

- Je n'ai rien publié dans n8n :
  - `presti-cerveau` porte le brouillon de 036-036, encore en file ;
  - l'activation revient à la session principale, sur le « go » de Benj.
- Aucun vrai compte n'est passé en réel. Je n'ai fait aucune écriture en base, aucune migration (la 0198 est inutile), aucun commit, aucun
  build, aucun typecheck. La session principale doit jouer `npm run typecheck` et `npm run build` (avec `PRESTI_DIST=.next-prod` si elle le
  souhaite).
- L'essai en base sur deux comptes de test : `essai-compte-test.mjs`, à jouer par la session principale (`reel.md` § 4).
- Ce que la porte ne couvre pas encore : `reel.md` § 7. Il y a quatre limites écrites, dont la **condition d'activation de l'Accueil en
  Signature** (pas de texte de réponse composé en amont).

## Sortie de `node scripts/reel-qa.mjs`

```
OK   A1 garde : « tous » ET le département au réel, échec = l’app garde la main
OK   A2 /api/leads : au réel, l’Accueil de l’app se tait (ni réponse, ni proposition, ni accusé)
OK   A3 cron : Suivi cédé ET pris, impayés de la Facturation au réel sautés
OK   A4 boîte : seul le clic « Valider » rend une carte exécutable
OK   B1 n8n Comptes au réel : le plus prudent des deux
OK   B2 n8n Décider : Studio au clic, Signature pilote permis, opt-in, STOP, marque, mention, plafond, pause, retour arrière
OK   B3 n8n Contrôler : la dernière porte avant Resend
OK   B4 n8n Réclamer : une carte part une fois, et seulement si réclamée
OK   C1 export presti-cerveau : réel servi, chefs en simulation, cartes du réel exécutées
OK   C2 export presti-dep-envoi = source ; écritures conditionnelles ; lectures filtrées par compte
OK   C3 export lib-envoyer-courriel : « Resend (Presti) », Idempotency-Key, contrôle obligatoire, appelants restreints
OK   C4 rien n’est publié par 036-038 (Cerveau sur sa version active d’avant, expéditeur et canal non publiés)
OK   C5 essai réel (presti-dep-envoi, exécutions 2749 et 2753) vers delivered@resend.dev : Studio validé + Signature par le pilote, rejeu sans second envoi
OK   C6 juge déclaré dans SUITES
OK   C7 preuves écrites (reel.md, resume.md avec « Ressources utilisées »)
OK   mutant vu — double envoi (l’app répond encore au réel)
OK   mutant vu — double envoi (l’app envoie la réponse dans la branche du réel)
OK   mutant vu — double envoi (relance cédée mais laissée due)
OK   mutant vu — double envoi (impayés de l’app sans garde)
OK   mutant vu — double envoi (n8n envoie sans réclamer la carte)
OK   mutant vu — Studio envoie sans clic (n8n)
OK   mutant vu — Studio envoie sans clic (boîte)
OK   mutant vu — Studio envoie sans clic (carte du Cerveau en pilote)
OK   mutant vu — Signature envoie un type non permis
OK   mutant vu — impayé sans opt-in (n8n)
OK   mutant vu — impayé sans opt-in (carte du Cerveau)
OK   mutant vu — « Presti » dans l’e-mail (décision)
OK   mutant vu — « Presti » dans l’e-mail (canal)
OK   mutant vu — mention d’IA absente (décision)
OK   mutant vu — mention d’IA absente (canal)
OK   mutant vu — opposition ignorée (STOP)
OK   mutant vu — opposition ignorée (pied sans STOP)
OK   mutant vu — clé d’idempotence absente (canal)
OK   mutant vu — clé d’idempotence absente (en-tête Resend)
OK   mutant vu — clé d’idempotence absente (décision)
OK   mutant vu — garde en échec qui laisse tout le monde muet (erreur lue comme réel)
OK   mutant vu — garde en échec qui laisse tout le monde muet (exception lue comme réel)
OK   mutant vu — garde en échec qui laisse tout le monde muet (délai lu comme réel)
OK   mutant vu — le plus prudent des deux ignoré (« tous » seul suffit)
OK   mutant vu — un chef sort de la simulation au réel
OK   mutant vu — essai vers une vraie adresse
OK   mutant vu — rejeu qui crée un second envoi
OK   mutant vu — Resend joignable sans contrôle
OK   B5 empreinte d’adresse du nœud Décider = lib/crm/apresOpposition.ts
036-038 : PASS — 16 contrôles verts, 28/28 mutants vus
```
