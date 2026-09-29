Session cloud : lire d'abord reprise-cloud/LISEZ-MOI-D-ABORD.md

# Presti — contexte du dépôt

Presti est un SaaS pour artisans français : le prospect écrit sur la page publique de l'artisan,
l'IA rédige la réponse en moins d'une minute, chiffre un devis, relance, et l'artisan facture —
sans jamais que le client voie le nom « Presti ». **Par défaut l'IA propose et l'artisan valide**
(`mode_reponse: 'assistee'`, `lib/plateformeConfig.ts:45` ; `iaDoitRepondre` refuse avec le motif
`assistee`, l.136) ; l'envoi autonome est vendu à partir de Studio (capacité `plateforme.ia.auto`,
`lib/plans.ts:44`) et `modeEffectif` rétrograde en « assistée » avec le motif `verrou_offre` en
dessous. La promesse a été réécrite pour cette raison le 08/09 (`plans/journal-final.md:278`).

**Le produit est en production**, pas en prototype : `prestiapp.fr` (console sur `qg.prestiapp.fr`),
33 pages, 87 routes API, 85 migrations, deux crons Vercel, une coque Capacitor dans `mobile/`.
Le pilotage de l'entreprise se fait depuis **`/controle`**, seul écran de direction ; `/direction`
est l'ancienne adresse et redirige en permanence (`app/direction/page.tsx`).

Propriétaire unique : Benjamin Filiot. Un seul compte fondateur.

---

<!-- orchestre:debut — bloc tenu à jour par `node scripts/orchestre.mjs contexte` ; ne pas éditer à la main -->
## Méthode — Claude Code × exécutants (prompt v16 §1)

1. **Claude Code pense, les exécutants produisent** (antigravity, codex). Claude Code n'écrit lui-même que ce qui exige du jugement : schéma et migrations, tout ce qui touche à l'argent, sécurité et droits, les cerveaux (prompts) et les verdicts. Tout le reste — variantes, contenus, tests, captures, boucles QA — est une tâche déposée dans `.orchestre/file/`.
2. **Le système vit dans `.orchestre/`** : `file/` (à prendre) → `en-cours/` (verrou `<id>.lock`) → `fait/` ou `refuse/`. Une tâche = un Markdown à en-tête YAML (`id, type, objectif, perimetre, interdit, verifier, budget, preuve` — tous obligatoires) ; `node scripts/orchestre.mjs prochaine --agent=<nom>` la distribue sans chevauchement de périmètre.
3. **La vérification est mécanique** : `node scripts/orchestre.mjs verifier <id>` exécute la commande `verifier` de la tâche ; son code de sortie fait le verdict, écrit dans `.orchestre/digest.md`. Personne ne relit un diff : on lit le digest.
4. **Ce que le code fait vit dans `.orchestre/contexte.md`** (régénéré depuis le code, copié dans `../SaaS/Produit/Carte-du-code.md`) ; **pourquoi on l'a décidé vit dans le vault** `../SaaS` (`CLAUDE.md`, `Decisions/`, `Récap-Projet.md`). Avant toute tâche : lire ces deux cartes, pas le dépôt. On n'écrit dans le vault que par une tâche dont le périmètre est `SaaS/…`.
5. **Bloqué = une question à options** : `.orchestre/en-cours/<id>.question.md`, deux ou trois options numérotées ; la réponse arrive en `<id>.reponse.md` (`orchestre.mjs repondre`). Jamais une discussion.
6. **Poussé n'est pas déployé** : après chaque push sur `main`, `node scripts/deploiement-etat.mjs` (le 13-14/09, 37 déploiements de production en ERROR à la suite, près de quinze heures sans que personne ne le voie) ; avant de pousser une page, `npm run build` en local.
7. **Quand Antigravity est à sec** : `scripts/executant.mjs` (Gemini CLI ou Qwen Code, gratuits, même contrat de tâche). Un site de démonstration se **génère** (`public/sites-demo/generer.mjs`, kit et direction artistique dans `_kit/`), ses photos viennent de `scripts/photos-demo.mjs` et leur provenance se prouve (`scripts/photos-provenance.mjs`) — une attribution déclarée ne vaut rien.
8. **Routage des modèles (v16 §1.3)** : jugement (schéma, argent, sécurité, cerveaux, verdicts) → Claude Code ; exploration et résumés de fichiers → sous-agent `haiku` ; volume (pages, variantes, tests, boucles QA) → Antigravity ou `executant.mjs` ; recherche web → Perplexity ; navigation et captures → navigateur d'Antigravity ou Claude in Chrome. Claude Code lit `digest.md` et `contexte.md`, pas le dépôt ; `node scripts/orchestre.mjs budget --tous` dit s'il lit trop.

Conventions communes : identifiants et commentaires en français · zéro donnée réelle dans les tests · « une fonctionnalité non finie n'apparaît pas » (drapeau dans `lib/flags.ts`) · on ne touche jamais à `interdit`, même pour aider · aucun chiffre non sourcé, aucun secret dans un fichier versionné · une preuve est une sortie de commande, pas une paraphrase.
<!-- orchestre:fin -->

## 0. Avant tout — le dossier d'ouverture compte

Les 13 agents `presti-*` et les 53 skills de `.claude/` ne sont chargés que si la session Claude Code
est ouverte **sur `C:/Users/benja/Documents/presti`**. Ouverte ailleurs (par exemple sur
`Documents/ofm`), il faut les lire à la main depuis le disque — c'est arrivé, c'est écrit dans
`plans/journal-v5.md:10`.

---

## 1. Où vit la mémoire

**Mémoire longue → le vault Obsidian `C:/Users/benja/Documents/SaaS`.**
C'est le cerveau du projet : `Produit/` (notes de session, la plus récente fait foi sur l'état),
`Decisions/Journal-Decisions.md` (chaque GO/NO-GO daté), `Récap-Projet.md` (la boussole),
`Fondateurs/`, `Legal/`, `Prospection/`, `Coentreprise/`.
Sa règle, écrite dans `SaaS/CLAUDE.md` n°6 : **en fin de gros chantier, mettre à jour
`Produit/` (une note de session) + `Récap-Projet` + `Journal-Decisions` si une décision a été prise.**

**Mémoire de chantier → `plans/`** : les prompts numérotés `001` à `010`
(le dernier en date, `010-poste-de-controle.md`, porte les jalons du sprint v11 en **§9**, à partir
de la l.214 — le tableau du §0, l.15, est l'état des jalons **v9**, à ne pas confondre), les journaux
`journal-v4.md`, `journal-v5.md`, `journal-final.md`, plus `couverture.md`, `inventaire-produit.md`,
`etat-application.md` et les sous-dossiers `audit-final/`, `audit-recurrent/`, `direction/`.

⚠️ `plans/journal-final.md` s'arrête au commit `b4e57ff` du 08/09 (14:33) : les dix commits suivants
de la journée — dont `0083`, `0084`, `0085` et tout le chantier Lighthouse — ne sont journalisés que
dans le vault. Et `plans/etat-application.md` est daté du 07/09 : ses drapeaux `actionsArtisan` et
`messagerie` « baissés » sont faux. **`lib/flags.ts` fait foi sur les drapeaux, jamais un document.**

**Contextes locaux** : `lib/ai/README.md` (le moteur IA et ce qui l'enrichit) et
`lib/inventaire/CONTEXT.md` (le vocabulaire du domaine inventaire).
`mobile/README.md`, `mobile/STORES.md`, `mobile/TESTS.md` pour la coque native — s'y référer plutôt
que de deviner.

---

## 2. Les commandes qui comptent

`package.json` ne déclare que six scripts : `dev`, `build`, `start`, `lint`, `typecheck`, `prepare`.

| But | Commande |
|---|---|
| **Vérifier** (la vraie commande) | `node scripts/tout-verifier.mjs` |
| … sans les tests qui consomment des crédits IA | (c'est le défaut) |
| … avec les tests IA | `node scripts/tout-verifier.mjs --tout` |
| … sans navigateur, rapide | `node scripts/tout-verifier.mjs --rapide` |
| Typage | `npm run typecheck` |
| Build | `npx next build` (voir §6 : interdit aux sous-agents) |
| Attendre que HEAD soit réellement déployé | `node scripts/attendre-deploiement.mjs` |
| Poser une migration | `node scripts/appliquer-migration.mjs supabase/migrations/00NN_x.sql` |
| Ranger une valeur collée sans son nom dans `.env.local` | `node scripts/ranger-env.mjs` |

⚠️ **La « vraie commande » lance elle-même un `next build`.** La 2ᵉ entrée du tableau `SUITES` est
`{ nom: 'Build', cmd: 'npx', args: ['next', 'build'] }` (`scripts/tout-verifier.mjs:27`), exécutée
avec `env: process.env` et **sans `PRESTI_DIST`** (le mot n'apparaît nulle part dans le fichier) :
elle écrit donc dans `.next`, ce que §6 interdit aux sous-agents. Un sous-agent qui doit lancer le
lanceur pose `PRESTI_DIST=.next-prod` devant, ou s'en abstient — sinon il rejoue la panne de
`plans/journal-v5.md:77` (« build cassé par une compilation parallèle d'un sous-agent »).

**`npm run lint` est mort** : il appelle `next lint`, mais aucune dépendance eslint n'est installée
et il n'y a aucun fichier de configuration eslint. Ne pas le citer comme un contrôle.
**`npm test` n'existe pas.**

`scripts/tout-verifier.mjs` enregistre **77 suites**, grossièrement rangées du moins cher au plus
cher (typage et build en tête, le gros des suites IA à la fin). Mais **l'ordre est celui de la
déclaration, jamais trié** — aucun `.sort(` dans le fichier, `l.155-159` ne fait que filtrer et la
boucle `l.170` suit le tableau : une suite `cout: 'ia'` est déclarée `l.85` (`pilotage-e2e`), devant
19 suites gratuites ou navigateur. Avec `--tout`, un échec bête peut donc survenir **après** des
appels au modèle. `scripts/` contient 139 fichiers `.mjs` à la racine (140 en récursif, avec
`scripts/lib/connexion-test.mjs`), dont 71 `*-e2e.mjs`. **Une suite absente du tableau `SUITES` n'est
jouée par personne**, ni en local ni par l'audit de nuit ; ce qui est écarté volontairement se
déclare dans `HORS_LANCEUR` avec sa raison.

---

## 3. Carte du dépôt

```
app/            33 pages + 87 routes API. Écrans clés :
                /controle  Poste de contrôle — 7 onglets : Aujourd'hui, Clients & abonnements,
                           Apports, Messagerie, Comptabilité, Journal, Réglages
                /p/[slug]  page publique de l'artisan (white-label)
                /site/[slug] site de l'artisan (white-label)
                /plateforme, /dashboard, /devis, /factures, /inventaire, /parametres…
lib/            le cœur métier. ai.ts (moteur IA), email.ts, flags.ts, plans.ts (grille tarifaire,
                source de vérité), DevisPDF.tsx, + 5 sous-dossiers : ai/ controle/ direction/
                inventaire/ prix/
supabase/migrations/  85 migrations numérotées, plus 47 jumeaux _A_COLLER_sql_editor_*.sql
                destinés au copier-coller (dont 14 en variante _NU).
                Dernière migration : 0085_purger_compte_test_devis.sql
scripts/        139 .mjs — suites e2e, sondes, outils de ménage, lanceur tout-verifier.mjs
plans/          les documents de pilotage : prompts, journaux, audits
docs/           4 notes datées : couts-et-solde, fournisseurs, registre-traitements, sauvegardes
mobile/         coque Capacitor (android/, ios/, codemagic.yaml) + README/STORES/TESTS
.github/workflows/  android.yml, audit.yml (cron 17 2 * * *, contre la PRODUCTION, zéro appel IA),
                qualite.yml, sauvegarde.yml, security.yml
.claude/        agents/ (13) et skills/ (53)
```

Les **drapeaux** de `lib/flags.ts` (21 au total) cachent ce qui n'est pas fini : entrée de menu
masquée, route en 404, rien dans le DOM. Trois seulement sont baissés aujourd'hui —
`inventaireOcr` (l.50), `canauxWhatsapp` (l.68), `canauxReseaux` (l.70).

`.env.local.example` ne déclare que **6** variables actives (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`,
`CRON_SECRET`), plus `NEXT_PUBLIC_GA_ID` laissée en commentaire ; le code applicatif en lit **43**.
Ne pas s'y fier pour monter un environnement.

---

## 4. Agents (`.claude/agents/`)

Douze agents en quatre pôles de trois, plus un transverse. Ils partagent une mémoire dans
`.claude/agents/knowledge/` : `PROTOCOLE.md`, puis par domaine (`audit`, `animation`, `gestion`,
`mails`) un fichier de base et un journal d'apprentissage.

| Agent | Rôle |
|---|---|
| `presti-auditeur` | chef de file audit : sécurité, conformité, qualité, checklist anti-hack 18 points |
| `presti-audit-attaque` | offensif / pentest : IDOR, injection, escalade de privilèges |
| `presti-audit-conformite` | RGPD et légal artisan France : mentions devis/facture, TVA |
| `presti-animateur` | chef de file animation : motion craft, plans d'animation précis |
| `presti-anim-accessibilite` | a11y, perf, reduced-motion, contraste WCAG |
| `presti-anim-marque` | direction artistique, white-label, système d'accent |
| `presti-gestion` | chef de file supervision : santé de l'app, routes 200, Stripe/Resend, migrations |
| `presti-gestion-donnees` | métriques du tunnel lien→lead→conversation→devis→facture |
| `presti-gestion-fiabilite` | coûts IA, quotas, timeouts, idempotence |
| `presti-mails` | chef de file emails sortants : triage et rédaction |
| `presti-mails-delivrabilite` | DNS SPF/DKIM/DMARC, réputation, bounces |
| `presti-mails-cycle` | séquences, relances, copywriting FR artisan |
| `presti-ai-engineer` | transverse : `lib/ai.ts`, prompts, thinking adaptatif, éval |

**Protocole obligatoire** : lire `knowledge/<domaine>.md` et `<domaine>.journal.md` **avant** la
mission, vérifier au fichier:ligne pendant, et **écrire une entrée datée dans le journal après**.

## Skills du dépôt (`.claude/skills/`)

53 entrées : 50 liens symboliques vers `.agents/skills`, et **trois skills maison** :

- **`presti-verify`** — la discipline anti-vibecoding, à charger avant de dire « c'est bon ».
- **`presti-design`** — le design system (dark cinématique, niveau d'animation codé).
- **`presti-ai-lab`** — améliorer et **évaluer** l'IA générative sans régression (harnais `ai-eval`).

⚠️ `presti-verify/SKILL.md` a vieilli sur trois points : il envoie vérifier
`presti-ashen.vercel.app` (la production est `prestiapp.fr`), il cite les routes `/api/control/*`
qui ont été **supprimées** après la fuite du 07/09, et il présente `scripts/smoke-test.mjs` comme la
suite de tests — la vraie est `scripts/tout-verifier.mjs`. Le **cycle** de la skill reste bon ;
ses adresses, non.

---

## 5. Règles de travail

**Anti-vibecoding.** On ne devine pas, on vérifie. Aucun « c'est bon » sans avoir bouclé le cycle :
éditer proprement (typé, pas de secret côté client) → build 0 erreur → typecheck → déployer →
**vérifier en direct** (routes 200, DOM/CSS inspectés dans le navigateur, endpoints protégés testés)
→ nettoyer les données de test. La checklist est dans `.claude/skills/presti-verify/SKILL.md`.

**Un test vert ne prouve que ce qu'il regarde.** C'est la leçon dominante de l'audit du 08/09
(61 défauts confirmés, 7 graves) : presque partout le défaut n'était pas dans le code mais dans ce
qui était censé le surveiller. `support-e2e` fabriquait ses tickets en base et restait verte pendant
que le mode support était inatteignable faute d'écran ; `controle-compta-e2e` écrivait sa propre
constante et testait donc elle-même ; quatre assertions ne pouvaient pas rougir. Avant de citer une
suite comme preuve, lire ce qu'elle assertionne. `scripts/csp-smoke.mjs` **n'assertionne rien** :
ne jamais s'en servir comme preuve.

**Anti-fabrication, côté produit.** L'IA ne doit jamais inventer un fait pour le compte d'un
artisan : ni un prix sourcé, ni un nom de fournisseur absent de la liste de l'artisan, ni un délai
précis intenable, ni un créneau de rendez-vous. « Un prix qui a l'air sourcé alors qu'il est deviné
est pire qu'un prix affiché comme estimé : l'artisan le présente à son client. » Les garde-fous sont
dans les prompts de `lib/ai.ts`. La même règle vaut pour la documentation : citer un fichier:ligne
ou omettre.

**White-label.** Le site et la plateforme livrés à l'artisan n'affichent **jamais** « Presti » :
le prospect voit la marque de l'artisan. Concrètement, les emails partent au nom de l'artisan avec
son adresse en `Reply-To` (`lib/email.ts`), le manifeste d'application et le mode « app iOS » sont
retirés des segments `/site` et `/p`, et les composants de console (`AppShell`, `InstallerApp`) ne
sont jamais montés sur une surface artisan.

**Corrections incrémentales.** On fixe et on fait évoluer l'existant, on ne rase jamais pour
réécrire. Chaque refactor est une suite de pas réversibles, chacun compilable et déployable.
Quand on choisit de ne pas raser un écran qui fonctionne, on le dit dans le journal.

**Les auditeurs sont toujours des sous-agents distincts de celui qui corrige.** C'est ce qui a fait
trouver 15 défauts en v4 et 25 en v5.

**Zéro compte de démo laissé en base.** Les comptes de test se créent via l'API admin Supabase et se
suppriment après. `scripts/zero-demo-e2e.mjs` garde l'invariant en permanence. Quelques comptes
portent volontairement `est_demo` et sont **exclus de tous les chiffres** : le compte de relecture
exigé par Apple et Google — qui n'est pas un compte de démonstration — et `demo-menuisier`
(`supabase/migrations/0068_controle.sql:217`), et depuis le 08/09 l'ancien compte partenaire
(`0084_sortie_partenaire.sql:55-60`, qui explique pourquoi aux l.46-50). **Le nombre exact est celui que
`zero-demo-e2e.mjs` lit en base** (l.100, et l.117 pour les comptes internes marqués sans être des
comptes de test), jamais une constante écrite ici.

---

## 6. Interdictions pour les sous-agents

- **Pas de `next build` ni de `next dev`.** Le dossier `.next` est partagé : une compilation
  parallèle a déjà cassé le build de l'agent principal. Une vérification locale se fait en mode
  production sur un dossier de build isolé : `PRESTI_DIST=.next-prod` (paramètre lu par
  `next.config.mjs`), sur un port dédié. **Attention au piège** : `scripts/tout-verifier.mjs`
  contient lui-même un `next build` (l.27) sans `PRESTI_DIST` — la « vraie commande » de §2 tombe
  donc sous cette interdiction telle quelle. Voir l'encadré de §2.
- **Pas de commit, pas de push, pas de migration.** Un push sur `main` déploie en production ;
  une migration touche la base réelle. Ces gestes reviennent à l'agent principal, après accord.
- **Pas de suites e2e concurrentes contre la production.** Elles créent et suppriment des comptes,
  écrivent en base et s'appellent les unes après les autres pour de bonnes raisons ; jouées en
  parallèle elles se marchent dessus. `HORS_LANCEUR` (18 entrées, `tout-verifier.mjs:131-153`) dit
  **pourquoi** chaque script est écarté du lanceur ; deux seulement le sont parce qu'ils doivent être
  joués seuls (`leads-abuse-test.mjs`, `stripe-session-test.mjs`). Les autres le sont pour d'autres
  raisons : serveur local exigé (`fact-e2e`, `pdf-e2e`), outil de ménage, sonde ponctuelle,
  bibliothèque partagée, ou `csp-smoke.mjs` qui n'assertionne rien.
- **Pas de secret en clair.** `scripts/garde-commit.mjs` refuse au pré-commit dix motifs de
  régression déjà corrigés, dont les clés Stripe live, Anthropic et Supabase.

---

## 7. Déployer

Le dépôt n'a qu'une branche : **`main`**, qui suit `origin/main` sur
`github.com/benjaminfiliot-wq/presti`. **Un push sur `main` déclenche le déploiement Vercel.**
Le pré-commit husky exécute `npm run typecheck` puis `node scripts/garde-commit.mjs`.

Après un push, ne pas sonder « le dernier déploiement » : juste après le push, le dernier est celui
d'**avant**, déjà READY. Utiliser `node scripts/attendre-deploiement.mjs`, qui attend le déploiement
dont le SHA est exactement celui de HEAD.

Deux crons Vercel tournent en production (`vercel.json`) : `/api/cron/relances` à 8 h et
`/api/canaux/relever` à 7 h. L'audit de nuit (`.github/workflows/audit.yml`) tourne à `17 2 * * *`.

## Poser une migration

Deux voies, et une seule est automatique.

1. **`node scripts/appliquer-migration.mjs supabase/migrations/00NN_x.sql`** — tout ou rien dans une
   transaction, fichier lu sur le disque (jamais retapé), vérification des objets attendus après
   coup. Exige `DIRECT_URL` dans `.env.local`.
2. **Benj colle à la main** le jumeau `_A_COLLER_sql_editor_00NN.sql` dans le SQL Editor Supabase.
   Ce jumeau est fabriqué par `scripts/sql-nu.mjs` (qui suit l'état du texte caractère par caractère
   pour ne pas couper un `comment on … is '…'` en deux) et sa parsabilité comme son équivalence au
   fichier source sont vérifiées par `scripts/migrations-jumelles-e2e.mjs`, au lanceur.

**Règle d'ordre : on colle la migration, PUIS on lève le drapeau.** Jamais l'inverse — un drapeau
levé sans ses tables fait refuser tout le chemin (fail-closed, voulu), et l'artisan tombe sur un
écran mort. Le commentaire est en tête de `lib/flags.ts`.

Un fichier que Benj colle lui-même est un livrable : sans test, la panne se découvre chez lui.
