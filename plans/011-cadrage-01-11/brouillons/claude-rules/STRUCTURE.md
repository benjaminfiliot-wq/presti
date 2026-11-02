# Structure proposée — un CLAUDE.md court et cinq rules (brouillon du 01/11/2026)

Brouillon pour Benj : rien n'est posé dans le dépôt, ni dans le vault, ni dans `~/.claude`.
Source des décisions : l'addendum de Benj du 01/11
(`C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-presti/b6e06ae6-7abe-49a0-baf6-ddf3a2f1d6b7/scratchpad/benj-0111-addendum.md`).
Consigne de Benj : voir la structure avant de créer les fichiers. C'est ce document.

## 1. L'arbre proposé

Lignes comptées par `wc -l`, lignes vides comprises (l'ancien CLAUDE.md en a 401 de cette façon).

```
presti/
├── CLAUDE.md                          196 lignes (aujourd'hui : 401)
└── .claude/
    └── rules/                         (n'existe pas encore)
        ├── architecture-outils.md      67 lignes
        ├── autonomie-abonnements.md    52 lignes
        ├── email-brevo.md              40 lignes
        ├── migration-production.md     48 lignes
        └── securite.md                 40 lignes
                                       ───────────
                                       443 lignes chargées à chaque session (CLAUDE.md + rules)

SaaS/ (vault, phase 1.4, hors de ce brouillon)
└── 10 Presti/04 Décisions/            (n'existe pas encore)
    ├── ADR-001 — Toutes les automatisations dans n8n.md
    ├── ADR-002 — Hermes Agent systématique + Orca harness.md
    ├── ADR-003 — Infrastructure auto-hébergée sur Oracle.md
    ├── ADR-004 — Brevo gratuit pour l'e-mail en masse.md
    ├── ADR-005 — Prospection e-mail automatique.md
    └── ADR-006 — Vidéos et carrousels, validation initiale puis auto.md   (« : » retiré, voir §6)
```

Brouillons → destination :

| Brouillon (dans `C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-presti/b6e06ae6-7abe-49a0-baf6-ddf3a2f1d6b7/scratchpad/brouillons/claude-rules/`) | Destination dans le dépôt |
|---|---|
| `CLAUDE.md` | `presti/CLAUDE.md` |
| `rules/architecture-outils.md` | `presti/.claude/rules/architecture-outils.md` |
| `rules/autonomie-abonnements.md` | `presti/.claude/rules/autonomie-abonnements.md` |
| `rules/email-brevo.md` | `presti/.claude/rules/email-brevo.md` |
| `rules/migration-production.md` | `presti/.claude/rules/migration-production.md` |
| `rules/securite.md` | `presti/.claude/rules/securite.md` |

Addendum → rule : §1 → `migration-production` · §2 et §3 → `architecture-outils` · §4 → `email-brevo` ·
§5 → `autonomie-abonnements` (et les exceptions de `securite`) · §6 → `architecture-outils`, section
« Méthode » (§6 n'était dans aucune rule de la consigne ; je l'ai mis là parce que le bloc régénéré du
CLAUDE.md le contredit) · §7 → `securite`.

## 2. Comment Claude Code charge `.claude/rules/` (documentation officielle, lue le 01/11/2026)

Page : https://code.claude.com/docs/en/memory (sections « Organize rules with .claude/rules/ »,
« Path-specific rules », « Import additional files », « How CLAUDE.md files load »).

- **Chargement automatique.** Tous les `.md` de `.claude/rules/` sont découverts, sous-dossiers compris.
  « Rules without `paths` frontmatter are loaded at launch with the same priority as `.claude/CLAUDE.md`. »
- **Frontmatter `paths` facultatif.** Une liste YAML de globs limite la rule aux fichiers qui
  correspondent ; elle se charge quand Claude lit ou modifie un de ces fichiers. `paths` est le seul
  champ lu. Aucune des cinq rules n'en a : elles valent partout, y compris pour le travail hors dépôt
  (n8n, Brevo, Supabase par MCP).
- **Pas d'import.** `@chemin` existe dans un CLAUDE.md (chemin relatif au fichier, quatre niveaux au
  plus), mais un fichier importé se charge avec le CLAUDE.md qui l'importe : aucun gain de contexte, et
  un `@.claude/rules/x.md` risque de charger la rule une seconde fois (la page ne dit pas si Claude Code
  dédoublonne une rule importée). Le brouillon de CLAUDE.md n'importe donc
  rien ; il cite les rules entre accents graves (un chemin entre accents graves n'est jamais importé).
- **Taille.** La page vise moins de 200 lignes par CLAUDE.md, et prévient au démarrage si l'ensemble des
  fichiers chargés dépasse une limite (chaque CLAUDE.md, rule et import compte à part).
- **Commentaires HTML.** Les commentaires de bloc d'un CLAUDE.md sont retirés avant d'entrer dans le
  contexte : les marques `orchestre:debut` et `orchestre:fin` ne coûtent rien.
- **AGENTS.md.** Quand un CLAUDE.md existe, Claude Code ne lit pas `AGENTS.md` par défaut ; les rules
  se chargent dans les deux cas (même page, section « AGENTS.md »).
- **Sous-agents.** Explore et Plan démarrent sans CLAUDE.md ni rules ; les autres sous-agents les
  reçoivent (https://code.claude.com/docs/en/sub-agents, « What loads at startup »).
- Dans le dépôt, le crochet `scripts/hooks/read-garde.mjs:22` bloque la lecture d'un fichier de plus de
  300 lignes : le nouveau CLAUDE.md (196) se lit d'un seul coup, l'ancien (401) non.

## 3. Section du CLAUDE.md actuel → où elle va

| Section actuelle | Lignes | Où elle va |
|---|---|---|
| « Session cloud » | 1 | CLAUDE.md, gardée |
| Présentation de Presti | 3-11 | CLAUDE.md, réécrite d'après `lib/plans.ts:11-12` (Studio prépare, Signature envoie seul) |
| Production, compteurs, `/controle`, propriétaire | 13-19 | CLAUDE.md (compteurs revérifiés le 01/11) ; §1 de l'addendum → `migration-production.md` |
| Architecture imposée (01/11) | 23-35 | `architecture-outils.md`, réécrite d'après l'addendum §2 et §3 |
| Tableau des rôles | 37-48 | `architecture-outils.md` (Firecrawl en ligne, Scrapin, Apify, SERP, WaveSpeed remplacés par §3) |
| Où chaque outil tourne | 50-61 | `architecture-outils.md` |
| Ce que ces règles rencontrent dans l'existant | 63-76 | point 1 → `migration-production.md` ; points 2 et 3 → `architecture-outils.md` ; point 4 → tranché par l'addendum §5 (`autonomie-abonnements.md`), voir §6 |
| Modèles et effort | 78-87 | CLAUDE.md, resserrée |
| Règles de travail (prompt de lancement) | 89-108 | CLAUDE.md, resserrée |
| Convention de tests | 110-116 | CLAUDE.md, « Tests et preuves » ; e2e jamais en parallèle aussi dans `securite.md` |
| Règles de sécurité (rappel) | 118-126 | `securite.md` |
| Bloc orchestre | 130-143 | CLAUDE.md, recopié octet pour octet (vérifié par `diff`), marques gardées ; avertissement ajouté juste après la marque de fin |
| Le cerveau d'abord | 145-151 | CLAUDE.md, « Le réseau neuronal d'abord » (mot voulu par Benj le 26/10, `~/.claude/projects/C--Users-benja-Documents-presti/memory/dire-reseau-neuronal-2610.md`) + carte des outils |
| §0 Le dossier d'ouverture | 153-158 | CLAUDE.md, une phrase dans « Les règles » (les rules ajoutées à la liste) |
| §1 Mémoire longue | 162-169 | CLAUDE.md ; la « règle n°6 » est juste (`SaaS/CLAUDE.md:97`, « Règles de travail ») et reste, complétée par le point 8 de la mise à jour du 19/10 (`SaaS/CLAUDE.md:32`). La règle 8 du vault (l.99) parle des photos de démo |
| §1 Mémoire de chantier | 171-175 | CLAUDE.md, mise à jour (prompts `001` à `016`, journaux `-v15` à `-v18`) |
| §1 Avertissement journal-final / etat-application | 177-180 | CLAUDE.md garde « `lib/flags.ts` fait foi » ; le reste est supprimé (§4) |
| §1 Contextes locaux | 182-185 | CLAUDE.md |
| §2 Les commandes qui comptent | 189-224 | CLAUDE.md, mise à jour ; le piège `PRESTI_DIST` aussi dans `securite.md` |
| §3 Carte du dépôt | 228-259 | CLAUDE.md, courte ; le détail vit dans `.orchestre/contexte.md` |
| §4 Agents | 263-286 | CLAUDE.md, liste resserrée |
| Skills du dépôt | 288-300 | CLAUDE.md |
| §5 Anti-vibecoding, test vert, auditeurs, zéro compte de démo | 306-317, 336-346 | CLAUDE.md, « Tests et preuves » |
| §5 Anti-fabrication, white-label | 319-330 | CLAUDE.md, « Règles produit » ; « Hermes jamais montré » → `architecture-outils.md` |
| §5 Corrections incrémentales | 332-334 | `migration-production.md` |
| §6 Interdictions pour les sous-agents | 350-368 | `securite.md` |
| §7 Déployer | 372-383 | CLAUDE.md |
| Poser une migration | 385-401 | `migration-production.md` ; rappel de deux lignes dans CLAUDE.md |

## 4. Supprimé volontairement (et pourquoi)

- l.9-11 : « l'envoi autonome est vendu à partir de Studio (`lib/plans.ts:44`) » et la réécriture du 08/09.
  Faux depuis le 25/10 : `plateforme.ia.auto` est en Signature (`lib/plans.ts:63`, `:80`).
- l.15 : « Les compteurs plus bas (§2, §3) datent du 08/09 » : les compteurs sont refaits ou renvoyés à `.orchestre/contexte.md`.
- l.34-35 et lignes du tableau : Firecrawl en ligne, Scrapin, Apify, SERP, WaveSpeed comme outils du
  système. Contredits par l'addendum §3. « Modèle ouvert si la machine le permet » (l.73) est retiré :
  absent de l'addendum, et on ne sait pas quel outil il remplace.
- l.75-76 : « à trancher avant le chantier 3 » : tranché par l'addendum §5.
- l.172-173 : le détail de `010-poste-de-controle.md` (§9 l.214, §0 l.15) : vieilli, les prompts vont jusqu'à `016`.
- l.177-179 : l'arrêt de `journal-final.md` au commit `b4e57ff` et les drapeaux faux de `etat-application.md` : historique du 08/09.
- l.205-224 : numéros de ligne et compteurs du 08/09 (`npx next build`, l.85, l.155-159, l.170, 77 suites,
  139 `.mjs`, 71 e2e, 19 suites gratuites) : remplacés par les valeurs du 01/11.
- l.231-249 : le détail des 7 onglets de `/controle` : non revérifié, retiré de la carte courte.
- l.252-254 : « 21 drapeaux, 3 baissés » : faux (57 drapeaux, 11 baissés).
- l.258 : « le code applicatif en lit 43 » : remplacé par « `lib/` seul en lit au moins 48 ».
- l.265-283 : le tableau des agents devient une liste ; les rôles détaillés vivent dans `.claude/agents/*.md`.
- l.313-315 : les exemples `support-e2e`, `controle-compta-e2e`, « quatre assertions » : la leçon reste.
- l.337 : « 15 défauts en v4 et 25 en v5 » : chiffre historique.
- l.341-346 : références `0068_controle.sql:217`, `0084_sortie_partenaire.sql:55-60`, `zero-demo-e2e.mjs` l.100 et l.117 : non revérifiées.
- l.362-366 : « 18 entrées, l.131-153 » et la liste des raisons : `HORS_LANCEUR` est aux l.184-215 (27 entrées) et dit lui-même ses raisons.
- l.367 : « dix motifs » : `scripts/garde-commit.mjs:10-27` en compte 11 ; le chiffre n'est plus écrit.
- l.399 : « Le commentaire est en tête de `lib/flags.ts` » : inexact, la règle est dans le commentaire
  de chaque drapeau (`lib/flags.ts:20-22`, `:32-33`) ; la rule cite `lib/flags.ts:20-22`.
- Retirés sans être listés plus haut (relevé du vérificateur) : l.29-30, Claude Code « construit et maintient
  le code, les workflows n8n et la configuration » (voir §6, point 1) ; l.80-83, le détail d'`opusplan` et
  « Aucun fichier ne peut garder `max` : c'est voulu » (resserrés en « `max` seulement à la main ») ;
  l.174-175, `couverture.md`, `inventaire-produit.md`, `etat-application.md` et les sous-dossiers d'audit
  (resserrés en « audits ») ; l.266, `knowledge/PROTOCOLE.md` ; l.393-394, le détail de `sql-nu.mjs`.

## 5. Le bloc orchestre : qui l'écrit, et quoi changer (non appliqué)

Le texte « Claude Code pense, les exécutants produisent (antigravity, codex) » contredit l'addendum §2
(Claude Code et Hermes seuls). Il vient de :
- `scripts/orchestre.mjs:931` : le point 1 en dur, « les exécutants produisent (${qui}) » ;
- `scripts/orchestre.mjs:928-929` : `qui` = `CONFIG.executants` sans `claude-code` ;
- `.orchestre/orchestre.json:20-24` : `"executants": ["antigravity", "codex", "claude-code"]` ;
- `scripts/orchestre.mjs:54` : la même liste par défaut, reprise si la clé manque ou est vide (l.98) ;
- `scripts/orchestre.mjs:942` : le titre « Méthode — Claude Code × exécutants (prompt v16 §1) » ;
- `scripts/orchestre.mjs:938` : les points 6 à 8 viennent de `methodeSupplement`,
  `.orchestre/orchestre.json:33-35` ; les points 7 et 8 (l.34-35) nomment Antigravity et `executant.mjs`.

Qui le réécrit : `poserBlocMethode()` (`scripts/orchestre.mjs:987-993`) remplace ce qui est entre les
marques dans `CLAUDE.md` et `AGENTS.md` (l.989-992), appelé par `contexte` (l.920). Le crochet
`scripts/hooks/contexte-fond.mjs` relance `contexte` après chaque modification d'un fichier de code
(l.18 : ts, tsx, js, mjs, sql, css), au plus une fois par minute (l.20, l.59). Une retouche à la main
du bloc est donc écrasée dans la minute. Sans marques, le bloc serait réinséré avant la première
section `## ` (l.953-955) : les deux marques sont gardées dans le brouillon.

Correctif proposé, à valider par Benj :
1. `.orchestre/orchestre.json:20-24` → `"executants": ["hermes", "claude-code"]`.
   Avant : réattribuer la file. Sur 57 tâches en `file/`, 45 portent `executant: codex` et 10
   `antigravity` ; 029-001, en cours, porte `codex`. `scripts/orchestre.mjs:197` refuserait leur en-tête.
   `CONFIG.executants[0]` est aussi l'exécutant par défaut des verdicts (l.278, 323, 452, 569, 1199).
2. `.orchestre/orchestre.json:34-35` → retirer Antigravity et `executant.mjs` des points 7 et 8.
3. `scripts/orchestre.mjs:931` et `:942` → reprendre l'addendum §6 (« Claude Code pense, Hermes Agent
   produit et orchestre »). À faire aussi dans la source `C:/Users/benja/Documents/orchestre/bin/orchestre.mjs`
   (mêmes lignes 54, 931, 942) : `maj` recopie `bin/orchestre.mjs` sur `scripts/orchestre.mjs`
   (`scripts/orchestre.mjs:1146`). L'outil est générique (`init`, `maj`) : préférer un texte réglé par
   `orchestre.json` à un texte en dur.
4. `AGENTS.md:1` (« règles pour Antigravity (et tout exécutant) ») : titre écrit à la main, hors bloc.
5. Ensuite `node scripts/orchestre.mjs contexte`, puis relire le bloc de `CLAUDE.md` et d'`AGENTS.md`.
Tant que ce n'est pas fait, la note sous la marque de fin du brouillon dit que `architecture-outils.md` fait foi.

## 6. Points à signaler à Benj

Les décisions de l'addendum sont reprises telles quelles dans les rules. Voici ce que l'existant
contredit ou complète. Rien n'a été changé pour en tenir compte.

**Agents et outils (§2, §3, §6)**
1. §2 et §6 se contredisent : §2 donne à Claude Code « développement, maintenance, tests » ; §6 dit
   qu'il n'écrit lui-même que schéma, argent, sécurité, cerveaux et verdicts, le reste allant en tâche.
   Les deux sont recopiés dans `architecture-outils.md`. Qui écrit le code courant et les tests ?
   L'ancien CLAUDE.md (l.29-30) disait aussi que Claude Code « construit et maintient le code, les workflows
   n8n et la configuration » ; la rule ne le reprend pas (absent de l'addendum). Qui construit les workflows n8n ?
2. Hermes ne produit rien aujourd'hui. L'ancien CLAUDE.md (l.57) dit « branchement aux MCP à faire » ; depuis,
   `%LOCALAPPDATA%/hermes/config.yaml` (modifié le 01/11 à 16 h 05, copie « avant-mcp » à 14 h 18) déclare deux
   serveurs MCP, `n8n-oracle` et `cerveau`, sans preuve qu'ils répondent. Sa connexion OAuth attend un geste de Benj
   (`C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-presti/b6e06ae6-7abe-49a0-baf6-ddf3a2f1d6b7/scratchpad/quatre-prompts.md:163`). Avec Antigravity et
   Codex écartés, la règle « tout le reste va dans `.orchestre/file/` » n'a plus de preneur.
3. Orca : l'addendum en fait le harness de Hermes. Le cadrage du 01/11 (`plans/011-cadrage-01-11/cadrage-p3.md`,
   §1.11) le décrit comme un outil de worktrees et de terminaux de développement, sans place dans le chemin
   de production ; son crochet est branché sur Claude Code (`~/.claude/settings.json`), pas sur Hermes.
   Le même cadrage (l.413) laisse aussi Hermes « hors chemin de production » : l'addendum §2 le renverse.
4. Restes d'Antigravity et Codex, à retirer par une tâche : `AGENTS.md`, `.agents/rules/orchestre.md`,
   `.agents/workflows/`, `scripts/executant.mjs`, `scripts/antigravity.mjs` ; dans le vault,
   `SaaS/CLAUDE.md:53` et `Produit/Antigravity.md` ; en mémoire, `presti-orchestre-antigravity` et `codex-executant`
   (mémoire du projet `ofm` : `~/.claude/projects/C--Users-benja-Documents-ofm/memory/`).
5. Oracle : disque à 89 % après nettoyage le 01/11 et « essai Oracle expiré le 24/10 » : vérifier l'offre
   Always Free avant d'ajouter Firecrawl, Crawlee et ScrapeGraphAI (cadrage-p3 §1.11). Seul SearXNG est
   dans le relevé du 01/11 (ancien CLAUDE.md l.54) : les trois autres n'y figurent pas (serveur non ouvert pour le vérifier).
6. « 224 routes API » (addendum §1) compte tous les `app/**/route.ts` ; 217 seulement sont sous `app/api/`
   (`.orchestre/contexte.md:48`). Le brouillon écrit les deux. S'y ajoute une `route.tsx`
   (`app/api/crieur/visuel/[id]/route.tsx`) : 225 routes en tout, dont 218 sous `app/api/`.

**Brevo (§4)**
7. La politique anti-spam de Brevo interdit les listes récoltées sur Internet, en marketing comme en
   transactionnel, sous peine de suspension (https://www.brevo.com/legal/antispampolicy/, lue le 01/11
   par recherche, la page ne se charge pas en direct ; `plans/flyers-cartes-brevo.md:7`, `:37-40`). Les listes de prospection viennent de sites d'artisans et
   de la liste RGE de l'ADEME (`SaaS/Decisions/Journal-Decisions.md:19`).
8. La décision du 01/11 renverse deux décisions écrites : « Brevo pour le froid » refusé
   (`SaaS/Produit/Ecosysteme-Prospection-Gratuite-2026-09-24.md:193`, `:236`) et D1 du 26/10, « ni Brevo
   pour le froid », envoi sur Gmail (`SaaS/Decisions/Journal-Decisions.md:18`). ADR-004 et ADR-005 doivent le dire.
9. L'envoi actuel passe par Gmail, 50 par jour (`Journal-Decisions.md:5` et `:18` ; plafond codé dans
   `presti-ops/agents-prospection/outils/envoi_manuel.py:62`, `PLAFOND_JOUR = 50`). Gmail s'arrête-t-il ?
10. Brevo Trigger ne connaît pas les réponses : ses événements sont bloqué, cliqué, différé, délivré,
    hard bounce, invalide, spam, ouvert, envoyé, soft bounce, ouverture unique, désabonné
    (https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.brevotrigger/). Les réponses
    demandent un autre chemin : la relève Gmail de `lib/agents/acquisition/boiteProspection.ts:1-13`, ou l'Edge
    Function `courriel-entrant` prévue dans `SaaS/Produit/Ecosysteme-Prospection-Gratuite-2026-09-24.md:320`.
11. Le node Brevo de n8n n'a pas d'opération « campagne » : Contact, Contact Attribute, Email (Send,
    Send Template), Sender (https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.brevo/).
12. Le quota de 300 est celui du compte, « campagnes et transactionnel confondus » (note du vault
    `Ecosysteme-Prospection-Gratuite-2026-09-24.md:368`). Un workflow distinct ne donne pas un quota distinct :
    des relances clients passées par le même compte Brevo mangent les mêmes 300.
13. Brevo ne reporte pas une campagne au lendemain : au-delà de 300 elle s'arrête au plafond du jour,
    et on ne peut plus la programmer pour le lendemain (https://help.brevo.com/hc/en-us/articles/208580669,
    lu par recherche, la page répond 403 en direct). La « file du lendemain » doit être tenue par n8n et Supabase.
14. 2 000 contacts uniques : la limite vaut pour les automatisations Brevo ; un employé de Brevo, sur le
    forum communautaire, la dit valable pour toute la vie du plan (non vérifié). Si n8n séquence et Brevo ne fait qu'envoyer,
    elle ne s'applique peut-être pas : à préciser pour le seuil de bascule.
15. Aujourd'hui les relances clients partent par Resend, au nom de l'artisan (`lib/email.ts:1-19`,
    plafond gratuit 100/jour `lib/email.ts:77`), depuis le cron `/api/cron/relances`. Passées par Brevo
    gratuit, elles porteraient le logo Brevo chez les clients de l'artisan (surface white-label).
16. SES n'est pas gratuit : 0,10 $ pour 1 000 e-mails après l'offre d'essai AWS
    (https://aws.amazon.com/ses/pricing/, lu le 01/11). Contredit « rien à payer » (`Journal-Decisions.md:8`).
17. Le vault interdit tout pixel de suivi chez Brevo (recommandation CNIL du 14/04/2026,
    `Ecosysteme-Prospection-Gratuite-2026-09-24.md:196`). L'addendum n'en parle pas : à garder ?
18. `scripts/garde-commit.mjs:10-27` n'a aucun motif pour une clé Brevo ou n8n : à ajouter au branchement.

**Autonomie (§5)**
19. « TOUT est automatique par défaut » contre le code : le mode de réponse par défaut est « assistée »
    (`lib/plateformeConfig.ts:45`, base `supabase/migrations/0032_plateforme_config.sql:6`), et rien dans
    `lib/` ni `app/` ne passe un compte Signature en « auto ». Un Signature n'envoie seul que s'il le choisit.
20. Même en Signature : « jamais un prix estimé ni un paiement sans vous » (`lib/plans.ts:207`, `:266`).
    « Devis automatiques » s'arrête là.
21. La mémoire `positionnement-automatique-2510` dit « vrai dès Studio (répond seul, relances) » ;
    `lib/plans.ts:63` dit le contraire depuis le 25/10. Le code fait foi ; la mémoire est à corriger.
22. Vidéos et carrousels : TikTok exige l'accord de Benj sur chaque vidéo
    (`docs/marketing/tiktok-publication.md:1`, `:22-24`) ; Instagram et Facebook n'en demandent déjà plus
    (`lib/contenu/lignes.ts:3`). Aucun passage « 2-3 validations puis auto » n'est codé dans
    `lib/contenu/lignes.ts` ; un accord y vaut 7 jours et une seule version du texte (`:143-157`).
23. La D4 du 26/10 (« envoi automatique de la sortie de la chasse », `Journal-Decisions.md:22`) et le
    point 4 de l'ancien CLAUDE.md (l.75-76) sont tranchés par §5 : à inscrire au journal des décisions.

**Sécurité et migrations (§1, §7)**
24. La liste d'exceptions de §7 (prospection, carrousels, vidéos) ne cite pas les envois automatiques
    de l'abonnement de §5 (Signature). `securite.md` renvoie vers `autonomie-abonnements.md` : à confirmer.
25. La mémoire `migrations-je-les-applique` (24/09, rangée dans la mémoire du projet `ofm`, rendue par `regles_pour`) dit : ne jamais demander à Benj de coller une migration,
    l'appliquer soi-même par le connecteur Supabase après un essai à sec. L'ancien CLAUDE.md demande un
    « go » écrit pour une migration en production. `migration-production.md` garde le « go » et les deux
    voies de l'ancien CLAUDE.md, sans la voie du connecteur. Faut-il l'ajouter ?
26. `cron.job` lu en base le 01/11 (une lecture seule, par le vérificateur) : les 16 tâches des migrations,
    rien d'autre ; `acq-vigie-meta` est inactive. Le relire avant tout remplacement.
27. Règles existantes en mémoire, absentes de l'ancien CLAUDE.md, candidates pour `securite.md` :
    WhatsApp de Benj, jamais ses autres conversations (`whatsapp-perso-intouchable-2110`) ; freellmapi
    ne reçoit que du public, Gemini gratuit exclu pour un service EEE (`ia-gratuite-produit-2910`).

**ADR et vault**
28. `10 Presti/04 Décisions/` n'existe pas : le vault range ses décisions dans `Decisions/Journal-Decisions.md`.
    Deux endroits pour le « pourquoi » : prévoir le renvoi du journal vers chaque ADR.
29. Le titre d'ADR-006 contient « : », interdit dans un nom de fichier Windows. Nom proposé :
    « ADR-006 — Vidéos et carrousels, validation initiale puis auto.md » (utilisé dans les rules).
30. Ces règles ne joignent que Claude Code. Ce que lit Hermes n'est pas vérifié : ses propres consignes
    doivent porter §2 à §7.

**État non commité (ajouté par le vérificateur)**
31. Au 01/11, `CLAUDE.md` et `.claude/settings.json` sont modifiés sans commit : les l.2-3 de `settings.json`
    (`opusplan`, `high`), que le brouillon cite, n'existent pas dans `HEAD`. 26 des 79 entrées de
    `.claude/skills/` (des liens vers les skills vidéo) et 31 des 541 `.mjs` de `scripts/` ne sont pas suivis
    par git. Sans commit, le brouillon cite des fichiers qu'un clone n'aura pas.

## 7. Ordre de pose proposé (après « approuvé »)

1. Corriger le générateur (§5 de ce document), ou garder la note sous la marque de fin.
2. Créer `presti/.claude/rules/` avec les cinq brouillons.
3. Remplacer `presti/CLAUDE.md` par le brouillon.
4. Ouvrir une session neuve sur `C:/Users/benja/Documents/presti` ; `/context` doit lister CLAUDE.md et
   les cinq rules sous « Memory files » ; `/status` dit s'il y a un avertissement de taille.
5. Phase 1.4 : créer ADR-001 à ADR-006 dans le vault, puis remplacer « liens à créer » par les wikilinks.
