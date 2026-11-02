Session cloud : lire d'abord `reprise-cloud/LISEZ-MOI-D-ABORD.md`.

# Presti — contexte du dépôt

Presti est un SaaS pour artisans français : le prospect écrit sur la page publique de l'artisan,
l'IA rédige la réponse en moins d'une minute, chiffre un devis, relance, et l'artisan facture —
sans jamais que le client voie le nom « Presti ». Deux offres : **Studio prépare et l'artisan valide ;
Signature envoie seul** (`lib/plans.ts:11-12`). Le mode de réponse par défaut reste « assistée »
(`lib/plateformeConfig.ts:45`). Détail : `.claude/rules/autonomie-abonnements.md`.

**Le produit est en production**, pas en prototype (compté le 01/11/2026) : `prestiapp.fr` (console sur
`qg.prestiapp.fr`), 53 pages, 224 routes (`app/**/route.ts`, dont 217 sous `app/api/` ; plus une
`route.tsx`), 168 migrations (dernière `0181`), 57 drapeaux, deux crons Vercel, une coque Capacitor dans
`mobile/`. Compteurs à jour : `.orchestre/contexte.md`, régénéré depuis le code. Le pilotage se fait depuis
**`/controle`**, seul écran de direction ; `/direction` y redirige en permanence (`app/direction/page.tsx:13`).
Propriétaire unique : Benjamin Filiot. Un seul compte fondateur.

## Architecture imposée — Presti : les règles non négociables (`.claude/rules/`)

Claude Code charge seul tous les `.md` de `.claude/rules/` à chaque session ; sans `paths`, ils ont la
même priorité que ce fichier (https://code.claude.com/docs/en/memory). On ne les importe pas ici.

| Fichier | Ce qu'il fixe |
|---|---|
| `architecture-outils.md` | Claude Code et Hermes seuls, Orca, n8n pour toute automatisation, Oracle, outils interdits |
| `autonomie-abonnements.md` | tout automatique par défaut ; vidéos et carrousels : 2-3 validations puis auto ; Studio, Signature |
| `email-brevo.md` | e-mail en masse par Brevo gratuit : 300/jour, quota vérifié, file du lendemain, seuil de bascule |
| `migration-production.md` | automatisations remplacées une par une dans n8n ; migration collée PUIS drapeau levé |
| `securite.md` | secrets, données, comptes, actions irréversibles, interdits des sous-agents |

**Règle n8n-first (NON NÉGOCIABLE, Benj, 02/11)** : automatisation, relance, déclencheur, notification ou logique métier récurrente → n8n
(par l'API ou le MCP), jamais l'app, qui ne sert qu'à l'interface ; d'abord « quel workflow n8n ? », toute exception justifiée par écrit.
Le « pourquoi » vit dans le vault : ADR-001 à ADR-008 de `10 Presti/04 Décisions/` (posées les 01 et 02/11/2026).
Les sous-agents intégrés Explore et Plan ne reçoivent ni ce fichier ni les rules : leur redire la règle utile.
Le dossier d'ouverture compte : agents, skills et rules ne se chargent que si la session est ouverte sur
`C:/Users/benja/Documents/presti` ; ouverte ailleurs, les lire à la main (c'est arrivé : `plans/journal-v5.md:10`).

## Le réseau neuronal d'abord (décisions de Benj, 25/10 et 26/10/2026)

Tout ce qu'on fait — session, sous-agent, workflow, skill, plugin, Hermes, Harvey — part du réseau
neuronal : le vault Obsidian `C:/Users/benja/Documents/SaaS`, lu par les outils MCP `cerveau`
(`regles_pour` avant une action à risque, `chercher` puis `lire` pour le reste), à défaut le vault lui-même ;
puis la carte des outils `SaaS/wiki/outils/Carte-des-outils.md` et les skills du métier. Un prompt d'agent
ou de workflow écrit ici dit quoi y chercher. Ce qu'on apprend en route retourne dans le vault.

## Où vit la mémoire

- **Pourquoi on l'a décidé → le vault** `C:/Users/benja/Documents/SaaS` : `Produit/` (notes de session, la
  plus récente fait foi), `Decisions/Journal-Decisions.md` (chaque GO/NO-GO daté), `Récap-Projet.md`
  (la boussole), `Fondateurs/`, `Legal/`, `Prospection/`, `Coentreprise/`. Règle n°4 de « Écrire ici »
  (`SaaS/CLAUDE.md:52-55`, réécrit le 01/11) : à chaque chantier livré et au moins une fois par jour de travail, une note
  dans `Produit/`, les décisions dans `Journal-Decisions`, une ligne dans `wiki/hot.md` ; en fin de gros chantier, `Récap-Projet` aussi.
- **Ce que le code fait → `.orchestre/contexte.md`**, copié dans `SaaS/Produit/Carte-du-code.md`. Jamais à la main.
- **Mémoire de chantier → `plans/`** : prompts numérotés `001` à `016`, journaux (`journal-v4`, `-v5`,
  `-final`, `-v15` à `-v18`), audits, cadrage du 01/11 dans `plans/011-cadrage-01-11/`.
- **`lib/flags.ts` fait foi sur les drapeaux**, jamais un document.
- Contextes locaux, à lire plutôt que deviner : `lib/ai/README.md` (moteur IA), `lib/inventaire/CONTEXT.md`
  (vocabulaire de l'inventaire), `mobile/README.md`, `mobile/STORES.md`, `mobile/TESTS.md` (coque native).

## Modèles et effort — « Opus pour penser, Sonnet pour coder »

- Défaut : `opusplan`, effort `high` (`.claude/settings.json:2-3`). `max` seulement à la main (`/effort max`)
  pour la sécurité, les bugs complexes et les audits, puis on redescend. `ultracode` pour un workflow
  multi-agents : `/effort ultracode on` dans la session (jamais enregistré), ou le mot dans la demande.
- Sous-agents : exploration et résumés → `haiku` ; implémentation, tests, itérations → `sonnet` ;
  architecture, sécurité, argent, migrations, verdicts → `opus`.

## Règles de travail (prompt de lancement du 01/11/2026)

- Cinq chantiers, dans cet ordre, jamais deux en parallèle : 1. réseau neuronal Obsidian ; 2. landing
  prestiapp.fr ; 3. prospection automatique ; 4. refonte de l'assistant de gestion ; 5. vidéo et carrousels.
- Chaque chantier : plan, puis « approuvé » de Benj, puis exécution, puis tests verts. Aucun fichier
  n'est créé avant la validation du plan de la phase.
- Sur toute la chaîne : mode à blanc avant la production ; chaque sortie de modèle passe un schéma strict ;
  chaque action est journalisée ; idempotence (un crash ne crée aucun doublon) ; multi-tenant strict par
  RLS ; aucune donnée inventée n'entre en base.
- Chaque phase rend un rapport (fichiers modifiés, tests, risques, points à valider) ; chaque chantier
  finit par un contrôle croisé avec son plan.

<!-- orchestre:debut — bloc tenu à jour par `node scripts/orchestre.mjs contexte` ; ne pas éditer à la main -->
## Méthode — Claude Code × Hermes (prompt v16 §1)

1. **Claude Code pense, Hermes produit et orchestre** (exécutants admis : hermes, claude-code ; historiques, plus distribués : antigravity, codex). Claude Code n'écrit lui-même que ce qui exige du jugement : schéma et migrations, tout ce qui touche à l'argent, sécurité et droits, les cerveaux (prompts) et les verdicts. Tout le reste — variantes, contenus, tests, captures, boucles QA — est une tâche déposée dans `.orchestre/file/`.
2. **Le système vit dans `.orchestre/`** : `file/` (à prendre) → `en-cours/` (verrou `<id>.lock`) → `fait/` ou `refuse/`. Une tâche = un Markdown à en-tête YAML (`id, type, objectif, perimetre, interdit, verifier, budget, preuve` — tous obligatoires) ; `node scripts/orchestre.mjs prochaine --agent=<nom>` la distribue sans chevauchement de périmètre.
3. **La vérification est mécanique** : `node scripts/orchestre.mjs verifier <id>` exécute la commande `verifier` de la tâche ; son code de sortie fait le verdict, écrit dans `.orchestre/digest.md`. Personne ne relit un diff : on lit le digest.
4. **Ce que le code fait vit dans `.orchestre/contexte.md`** (régénéré depuis le code, copié dans `../SaaS/Produit/Carte-du-code.md`) ; **pourquoi on l'a décidé vit dans le vault** `../SaaS` (`CLAUDE.md`, `Decisions/`, `Récap-Projet.md`). Avant toute tâche : lire ces deux cartes, pas le dépôt. On n'écrit dans le vault que par une tâche dont le périmètre est `SaaS/…`.
5. **Bloqué = une question à options** : `.orchestre/en-cours/<id>.question.md`, deux ou trois options numérotées ; la réponse arrive en `<id>.reponse.md` (`orchestre.mjs repondre`). Jamais une discussion.
6. **Poussé n'est pas déployé** : après chaque push sur `main`, `node scripts/deploiement-etat.mjs` (le 13-14/09, 37 déploiements de production en ERROR à la suite, près de quinze heures sans que personne ne le voie) ; avant de pousser une page, `npm run build` en local.
7. **Hermes produit par sa file n8n** : `node scripts/hermes-tache-n8n.mjs --prendre --passage=<passage de sa consigne>`, puis `--fini <id>` (briefs en liste blanche dans le script ; sans passage, on ne reçoit qu'une tâche que personne ne porte, sinon `FILE OCCUPEE`) ; ses consignes : `.hermes.md`. Aucun autre exécutant depuis le 01/11 (`.claude/rules/architecture-outils.md`) : ni Antigravity, ni Codex, ni `scripts/executant.mjs` ; un modèle gratuit (freellmapi) pour une petite tâche seulement, jamais avec une donnée de prospect ou de client. Un site de démonstration se **génère** (`public/sites-demo/generer.mjs`, kit et direction artistique dans `_kit/`), ses photos viennent de `scripts/photos-demo.mjs` et leur provenance se prouve (`scripts/photos-provenance.mjs`) — une attribution déclarée ne vaut rien.
8. **Routage (v16 §1.3, revu le 01/11)** : jugement (schéma, argent, sécurité, cerveaux, verdicts) → Claude Code ; exploration et résumés de fichiers → sous-agent `haiku` ; volume (pages, variantes, tests, boucles QA) → Hermes (Haiku 5.5, Sonnet 5.5 si besoin) ; toute automatisation → n8n ; recherche et extraction web → SearXNG, Firecrawl auto-hébergé, Crawlee, ScrapeGraphAI (Oracle) ; navigation et captures → Claude in Chrome. Claude Code lit `digest.md` et `contexte.md`, pas le dépôt ; `node scripts/orchestre.mjs budget --tous` dit s'il lit trop.

Conventions communes : identifiants et commentaires en français · zéro donnée réelle dans les tests · « une fonctionnalité non finie n'apparaît pas » (drapeau dans `lib/flags.ts`) · on ne touche jamais à `interdit`, même pour aider · aucun chiffre non sourcé, aucun secret dans un fichier versionné · une preuve est une sortie de commande, pas une paraphrase.
<!-- orchestre:fin -->

> Ce bloc est régénéré par `node scripts/orchestre.mjs contexte` : texte en dur dans `blocMethode` (`scripts/orchestre.mjs`),
> exécutants, exécutants historiques, tête du point 1 et points 6 à 8 dans `.orchestre/orchestre.json` (`executants`,
> `executantsHistoriques`, `methodeTete`, `methodeSupplement`). Corrigé le 02/11 : il suit `.claude/rules/architecture-outils.md`, qui fait foi.

## Les commandes qui comptent

`package.json` ne déclare que cinq scripts : `dev`, `build` (`next build --webpack`), `start`, `typecheck`,
`prepare`. **`npm run lint` et `npm test` n'existent pas.**

| But | Commande |
|---|---|
| **Vérifier** (la vraie commande ; sans tests IA par défaut) | `node scripts/tout-verifier.mjs` |
| … avec les tests IA / sans navigateur | `node scripts/tout-verifier.mjs --tout` / `--rapide` |
| Typage | `npm run typecheck` |
| Build (interdit aux sous-agents : `securite.md`) | `npm run build` |
| Après un push : attendre que HEAD soit déployé, puis l'état | `node scripts/attendre-deploiement.mjs`, `node scripts/deploiement-etat.mjs` |
| Poser une migration (`migration-production.md`) | `node scripts/appliquer-migration.mjs supabase/migrations/00NN_x.sql` |
| Ranger une valeur collée sans son nom dans `.env.local` | `node scripts/ranger-env.mjs` |

Pièges du lanceur `scripts/tout-verifier.mjs` :
- Il lance lui-même `npm run build` (l.27) sans poser `PRESTI_DIST` : il écrit dans `.next`. Il transmet
  l'environnement (l.240) : un sous-agent pose `PRESTI_DIST=.next-prod` devant, ou s'en abstient.
- `SUITES` (l.25) compte 112 suites, dont 8 `cout: 'ia'`, dans l'ordre de déclaration, jamais trié (filtre
  l.217, boucle l.232) ; une suite IA arrive dès la l.99. Avec `--tout`, un échec bête peut survenir après
  des appels au modèle.
- Une suite absente de `SUITES` n'est jouée par personne, ni en local ni par l'audit de nuit. Ce qui est
  écarté exprès se déclare dans `HORS_LANCEUR` (l.184-215), avec sa raison.
- `scripts/csp-smoke.mjs` n'assertionne rien : jamais une preuve.

## Carte du dépôt (courte ; le détail est dans `.orchestre/contexte.md`)

```
app/            53 pages, 224 routes. /controle (poste de contrôle) ; /p/[slug] et /site/[slug] (surfaces
                white-label de l'artisan) ; /plateforme, /dashboard, /devis, /factures, /inventaire…
lib/            le cœur métier : ai.ts (moteur IA), email.ts (envoi Resend), flags.ts, plans.ts (offres,
                source de vérité), plateformeConfig.ts, pilote/, relances.ts…
supabase/migrations/  168 migrations numérotées + 136 jumeaux _A_COLLER_sql_editor_* (copier-coller)
scripts/        541 .mjs à la racine (510 suivis par git), dont 86 suites e2e ; tout-verifier.mjs ; orchestre.mjs ; hooks/
plans/ docs/    pilotage (prompts, journaux, audits) ; notes datées (coûts, fournisseurs, registre, sauvegardes)
mobile/         coque Capacitor (android/, ios/, codemagic.yaml) + README/STORES/TESTS
.github/workflows/  android, audit (contre la PRODUCTION, zéro appel IA), generer-site, qualite, sauvegarde, security
.claude/        agents/ (13), skills/ (79 entrées, 53 suivies par git), rules/ (5), settings.json (hooks)
```

Les 57 drapeaux de `lib/flags.ts` (11 baissés le 01/11) cachent ce qui n'est pas fini : menu masqué, route
en 404, rien dans le DOM. `.env.local.example` ne déclare que 6 variables actives, `lib/` seul en lit au
moins 48 (relevé du 01/11) : ne pas s'y fier pour monter un environnement.

## Agents (`.claude/agents/`) et skills (`.claude/skills/`)

13 agents, quatre pôles de trois et un transverse : audit (`presti-auditeur`, `-audit-attaque`,
`-audit-conformite`) ; animation (`presti-animateur`, `-anim-accessibilite`, `-anim-marque`) ; gestion
(`presti-gestion`, `-gestion-donnees`, `-gestion-fiabilite`) ; mails (`presti-mails`, `-mails-delivrabilite`,
`-mails-cycle`) ; transverse `presti-ai-engineer` (`lib/ai.ts`, prompts, éval).
Protocole obligatoire : lire `.claude/agents/knowledge/<domaine>.md` et `<domaine>.journal.md` avant la
mission, vérifier au fichier:ligne pendant, écrire une entrée datée dans le journal après.

Skills : 79 entrées sur le disque (53 suivies par git), dont 76 liens vers `.agents/skills` et trois skills
maison : `presti-verify` (anti-vibecoding, avant tout « c'est bon »), `presti-design` (design system),
`presti-ai-lab` (évaluer l'IA sans régression, harnais `ai-eval`). ⚠️ `presti-verify/SKILL.md` a vieilli
(l.19, 33-34) : la production est `prestiapp.fr`, `/api/control/*` est supprimé, la vraie suite est
`scripts/tout-verifier.mjs`. Son cycle reste bon.

## Tests et preuves

- Anti-vibecoding : aucun « c'est bon » sans le cycle — éditer proprement (typé, aucun secret côté client)
  → build 0 erreur → typecheck → déployer → vérifier en direct (routes 200, DOM et CSS inspectés,
  endpoints protégés testés) → nettoyer les données de test.
- Une suite se joue hors ligne, prouve qu'elle peut rougir (mutation) et entre dans `SUITES`.
  Jamais deux suites e2e en parallèle contre la production (`securite.md`).
- Un test vert ne prouve que ce qu'il regarde : lire ses assertions avant de le citer. Audit du 08/09
  (61 défauts confirmés, 7 graves) : le défaut était presque partout dans ce qui devait surveiller le code.
- Zéro donnée réelle. Comptes de test créés par l'API admin Supabase, supprimés après ;
  `scripts/zero-demo-e2e.mjs` garde l'invariant. Les comptes `est_demo` voulus (relecture Apple et Google,
  `demo-menuisier`, ancien compte partenaire) sont exclus de tous les chiffres ; le script lit leur nombre en base.
- Les auditeurs sont toujours des sous-agents distincts de celui qui corrige.

## Règles produit

- **Anti-fabrication** : l'IA n'invente jamais un fait pour un artisan — ni prix sourcé, ni fournisseur
  absent de sa liste, ni délai précis intenable, ni créneau. « Un prix qui a l'air sourcé alors qu'il est
  deviné est pire qu'un prix affiché comme estimé. » Garde-fous dans les prompts de `lib/ai.ts`. Même règle
  pour la documentation : citer un fichier:ligne ou omettre.
- **White-label** : le site et la plateforme de l'artisan n'affichent jamais « Presti ». E-mails au nom de
  l'artisan, son adresse en `Reply-To` (`lib/email.ts:6-11`) ; ni manifeste ni mode « app iOS » sur `/site`
  et `/p` ; jamais `AppShell` ni `InstallerApp` sur une surface artisan.

## Déployer

- Une seule branche, **`main`**, qui suit `origin/main` (`github.com/benjaminfiliot-wq/presti`).
  **Un push sur `main` déclenche le déploiement Vercel de production.**
- Pré-commit husky (`.husky/pre-commit`) : `npm run typecheck`, `node scripts/garde-commit.mjs`, puis
  l'évaluation `lib/ai/cerveaux/urgence/evaluer.mjs`.
- Après un push, « le dernier déploiement » est celui d'avant, déjà READY : `node scripts/attendre-deploiement.mjs`
  attend celui dont le SHA est exactement HEAD.
- Crons Vercel (`vercel.json`) : `/api/cron/relances` (`0 8 * * *`), `/api/canaux/relever` (`0 7 * * *`).
  Audit de nuit : `.github/workflows/audit.yml:17` (`17 2 * * *`).

## Poser une migration

**On colle la migration, PUIS on lève le drapeau** — jamais l'inverse. Les deux voies, les jumeaux testés
et le remplacement des automatisations par n8n : `.claude/rules/migration-production.md`.
