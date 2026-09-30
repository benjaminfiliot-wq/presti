# Presti — l'application

SaaS pour artisans : répond aux demandes de devis en moins d'une minute et relance à leur place, pour ne plus perdre de chantiers.

Le produit est **en production**. Ce fichier décrit le dépôt tel qu'il est, pas ce qui est prévu.

## Où ça tourne

| Adresse | Ce qu'on y trouve |
|---|---|
| `prestiapp.fr` | la vitrine, l'inscription, les tarifs, les pages légales |
| `qg.prestiapp.fr` | la même application ; seule différence, `/` y est réécrit vers `/controle` (`middleware.ts` l. 65). La coque native charge `https://qg.prestiapp.fr/dashboard` (`mobile/capacitor.config.ts`) |
| `<slug>.<domaine neutre>` et le domaine perso d'un artisan (offre Signature) | le site vitrine et le formulaire de demande de l'artisan, **sans « presti » dans l'adresse** |

Le routage est fait dans `middleware.ts` : `prestiapp.fr`, ses sous-domaines, `*.vercel.app`, `localhost` et `*.localhost`, et tout hôte commençant par `127.0.0.1` sont « maison » et ne sont jamais réécrits (`isPrestiHost`, l. 18-24) ; tout autre hôte est traité comme une surface artisan (`/` → `/site/<slug>`, `/demande` → `/p/<slug>`, `/infos-legales` → `/site/<slug>/infos-legales`). Un domaine perso n'est résolu que s'il est vérifié en base.

Côté interne : `/controle`, le Poste de contrôle (onglets Aujourd'hui, Clients & abonnements, Apports, Messagerie, Comptabilité, Journal, Réglages — `app/controle/page.tsx`), et `/direction`, l'ancienne adresse, qui fait une redirection permanente vers `/controle`.

## Stack

Next.js 15 (App Router, TypeScript, React 19) · Supabase (auth + Postgres) · déployé sur Vercel.

Le reste des dépendances de `package.json`, et à quoi elles servent ici :

- `@anthropic-ai/sdk` — les réponses, les devis, l'assistance (`lib/ai.ts`, `lib/ai/`)
- `stripe` — l'abonnement de l'artisan à Presti et les gestes d'argent du Poste de contrôle
- `@react-pdf/renderer` — les devis et factures PDF (`lib/DevisPDF.tsx`, `lib/renderPdf.ts`)
- `@serwist/next` + `serwist` — la PWA et le service worker
- `web-push` — les notifications web ; `@capacitor/core` — la coque native
- `imapflow` — la relève de la boîte d'entreprise (`lib/releveCanal.ts`)
- `gsap` + `lenis` — les animations de la vitrine
- côté vérification : `playwright`, `lighthouse`, `@axe-core/playwright`, `pg`

Les emails partent par Resend (`lib/email.ts`, `RESEND_API_KEY`).

## Lancer en local

```bash
npm install
cp .env.local.example .env.local   # puis remplir les valeurs
npm run dev                        # http://localhost:3000
```

Scripts déclarés dans `package.json` : `dev`, `build`, `start`, `lint`, `typecheck`, `prepare`.

Deux mises en garde vérifiées :

- **`npm run lint` ne marche pas.** Le script appelle `next lint`, mais aucune dépendance eslint n'est installée et il n'y a aucun fichier de configuration eslint à la racine. Les vraies barrières sont `npm run typecheck`, `npx next build` et `node scripts/garde-commit.mjs`.
- **`.env.local.example` est incomplet.** Il déclare 6 variables (plus `NEXT_PUBLIC_GA_ID`, laissée en commentaire, donc non copiée par un `cp`) ; le code applicatif (`app/`, `lib/`, `middleware.ts`, `next.config.mjs`) en lit **43**. Les deux clés Supabase publiques suffisent à démarrer le serveur, mais pas à se connecter : la connexion passe par un code à 6 chiffres envoyé par email (`FLAGS.codeEmail = true`, `app/login/page.tsx`), donc sans `RESEND_API_KEY` le parcours s'arrête à l'écran du code.

Manquent notamment à `.env.local.example` : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DIRECT_URL` (utilisée par `scripts/appliquer-migration.mjs`), `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`, `CANAUX_KEY`, `IP_SEL`, `PRESTI_SECRET_CONNEXION`, `RECHERCHE_SCEAU_SECRET`, `FIREBASE_SERVICE_ACCOUNT`, `NEXT_PUBLIC_DOMAINE_NEUTRE`, `EMAIL_ENTREPRISE`, `IMAP_*` et `PRESTI_MAIL_IMAP_*`, `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID`.

Si une valeur a été collée dans `.env.local` sans son nom (`NOM=valeur` est la seule forme lue par Node, Vercel et les scripts d'ici), `node scripts/ranger-env.mjs` dit ce qu'il ferait, et `--ecrire` le fait.

Après l'inscription, l'application redirige vers `/outils` **si Supabase ouvre la session tout de suite** ; sinon elle reste sur la page et demande d'ouvrir le lien de confirmation reçu par email (`app/signup/page.tsx` l. 72-80).

## Carte du dépôt

| Dossier | Contenu |
|---|---|
| `app/` | les pages et l'API, App Router (`find app -name page.tsx`, `-name route.ts` pour le compte du jour) |
| `lib/` | la logique métier partagée, plus 5 sous-dossiers : `ai/`, `controle/`, `direction/`, `inventaire/`, `prix/` |
| `supabase/` | `migrations/` (85 migrations numérotées ; 47 fichiers `_A_COLLER_sql_editor_*.sql`, qui ne sont pas 47 migrations : 33 jumeaux commentés, dont certains couvrent plusieurs numéros — `0047_a_0052`, `0054_0055`, `0057_0058`, `0059_0061` —, et 14 jumeaux `_NU` générés, de 0072 à 0085) et `setup.sql` |
| `scripts/` | 139 fichiers `.mjs` : les suites de test, les outils de migration, de déploiement et de maintenance |
| `plans/` | les documents de pilotage : prompts numérotés, journaux, inventaires, audits + `audit-final/`, `audit-recurrent/`, `direction/` |
| `docs/` | 4 notes d'exploitation : `couts-et-solde.md`, `fournisseurs.md`, `sauvegardes.md`, `registre-traitements.md` — toutes datées dans leur en-tête, à relire avant de s'en servir |
| `mobile/` | la coque Capacitor (Android, iOS). Tout est expliqué dans `mobile/README.md`, `mobile/STORES.md` et `mobile/TESTS.md` |
| `public/` | les fichiers servis tels quels (le service worker `sw.js` est généré au build, jamais versionné) |
| `.github/workflows/` | `qualite.yml`, `audit.yml`, `sauvegarde.yml`, `android.yml`, `security.yml` |
| `.claude/` | 14 entrées dans `agents/` et 53 dans `skills/` (dont 50 liens symboliques ; les 3 skills du dépôt sont `presti-ai-lab`, `presti-design`, `presti-verify`). Chargés uniquement si la session Claude Code est ouverte sur ce dossier |
| `_to_delete/` | deux visuels de marque et un texte alternatif Open Graph, mis de côté |

L'état réel des fonctionnalités se lit dans `lib/flags.ts`, et nulle part ailleurs : 21 drapeaux, dont 3 encore baissés (`inventaireOcr`, `canauxWhatsapp`, `canauxReseaux`). Un drapeau baissé cache l'entrée de menu et fait répondre 404 à la route.

## Poser une migration

Deux façons, une seule automatique.

1. **En ligne de commande** — `node scripts/appliquer-migration.mjs supabase/migrations/00NN_x.sql`. Le fichier est lu sur le disque et appliqué dans une transaction (tout ou rien), puis le script vérifie que les objets attendus existent. Demande `DIRECT_URL` dans `.env.local`.
2. **À la main** — coller un jumeau dans le SQL Editor de Supabase. **Deux familles cohabitent dans `supabase/migrations/`, et elles ne se valent pas au moment de coller :**
   - **`_A_COLLER_sql_editor_00NN_NU.sql`** (0072 → 0085, 14 fichiers) — fabriqué par `node scripts/sql-nu.mjs <source> <destination>`, qui refuse d'écrire si le SQL des deux fichiers n'est pas identique une fois les commentaires retirés. Quand il existe, c'est lui qui porte la bannière « coller ce fichier EN ENTIER » (`scripts/sql-nu.mjs` l. 80 : 28 tirets en tête, pour que le SQL Editor puisse mordre les premières lettres sans emporter du sens — incident du 08/09, `plans/journal-final.md` l. 815-816), et un bloc de contrôle post-collage qui ne fait que **lire**. Deux exceptions mesurées : les `_NU` de 0072 et 0073 n'ont ni l'un ni l'autre — vérifie la bannière avant de coller, ne la suppose pas.
   - **`_A_COLLER_sql_editor_00NN.sql`** (sans `_NU`, 33 fichiers, 0047 → 0085) — la version commentée, antérieure à cet outil et **seule disponible pour 0047 → 0071**. Elle porte le même SQL. Onze d'entre elles commencent par un pavé `-- ====…` : deux caractères mordus au collage et la première ligne n'est plus un commentaire. **La règle sûre ne dépend d'aucun décompte : ouvre le fichier, et si la première ligne n'est pas la bannière, colle le jumeau `_NU` s'il existe.**

   `scripts/migrations-jumelles-e2e.mjs` (au lanceur, sous le nom « Fichiers a coller ») vérifie **les deux familles** : chaque jumeau se parse, et porte le SQL de sa migration. Passage local du 08/09 : 192 contrôles verts, 0 échoué.

   **À confirmer par Benj** : lequel des deux il ouvre réellement quand il colle. Pour 0062 → 0071 le journal nomme explicitement le fichier **sans** `_NU` (`plans/journal-final.md` l. 139, 355, 519) ; pour le 08/09 il raconte un `_NU` cassé dans le SQL Editor, donc c'est bien un `_NU` qu'il collait ce jour-là (l. 811-814) — mais aucune consigne écrite postérieure à `0071` ne tranche noir sur blanc. **Tant que ce n'est pas confirmé, coller le `_NU` quand il existe** : il porte la bannière et le contrôle de fin, l'autre non.

Ordre à respecter, expliqué en tête de `lib/flags.ts` : **on colle la migration, PUIS on lève le drapeau.** Drapeau levé sans les tables, le verrou refuse tout (fail-closed, voulu).

Dernier fichier de migration : `0085_purger_compte_test_devis.sql` (qu'il soit posé en base se vérifie côté Supabase, pas ici — le dépôt ne prouve que l'existence du fichier).

## Déployer

Un push sur `main` (`github.com/benjaminfiliot-wq/presti`) déclenche le déploiement Vercel. Le dépôt n'a qu'une branche, `main`, qui suit `origin/main`.

- **Avant le commit** : le hook `.husky/pre-commit` exécute `npm run typecheck` puis `node scripts/garde-commit.mjs`, qui refuse 10 régressions connues (boîte `[EMAIL_MASQUE]` morte, IP en clair, annulation de facture sans avoir, clés Stripe/Anthropic/Supabase en clair, …).
- **Après le push** : `node scripts/attendre-deploiement.mjs` attend le déploiement dont le SHA est exactement celui de HEAD — sonder « le dernier déploiement » ment juste après un push.
- **Crons Vercel** (`vercel.json`) : `/api/cron/relances` à 8 h UTC, `/api/canaux/relever` à 7 h UTC (`0 8 * * *` et `0 7 * * *` — Vercel lit ces expressions en UTC, pas en heure de Paris).
- **GitHub Actions** : `qualite.yml` (typage, build, budget de poids JS) sur chaque PR et chaque push sur `main` ; `security.yml` sur chaque PR ; `audit.yml` toutes les nuits à 2 h 17 UTC ; `sauvegarde.yml` à 1 h 40 UTC ; `android.yml` compile la coque à chaque push sur `main` touchant `mobile/` **hors ses fichiers `.md`** (`paths: ['mobile/**', '!mobile/*.md', …]`, l. 13 — un push qui ne touche que `mobile/README.md`, `mobile/STORES.md` ou `mobile/TESTS.md` ne déclenche rien), et signe un AAB sur un tag `mobile-v*`.

Vérification locale en mode production : `PRESTI_DIST=.next-prod` fait compiler dans un dossier séparé (`next.config.mjs`), pour ne pas casser le `.next` d'un autre processus.

## Tests

Le lanceur est `scripts/tout-verifier.mjs`, pas `npm test` (qui n'existe pas). Il enregistre **77 suites**, grossièrement rangées du moins cher au plus cher. L'ordre est celui de la déclaration, **jamais trié** (aucun `.sort(` dans le fichier) : une suite IA figure dès la l. 85, devant une trentaine de suites gratuites — avec `--tout`, un échec tardif se paie quand même en crédits.

```bash
node scripts/tout-verifier.mjs            # tout sauf ce qui consomme des crédits IA
node scripts/tout-verifier.mjs --tout     # y compris les suites qui appellent l'IA
node scripts/tout-verifier.mjs --rapide   # seulement les suites sans navigateur
```

Une suite absente de la table `SUITES` n'est jouée par personne — ni ici, ni par l'audit de nuit qui appelle ce script. Ce qui est écarté volontairement est déclaré dans `HORS_LANCEUR`, avec sa raison.

`scripts/` contient 71 fichiers `*-e2e.mjs`. Pour en lancer une seule, reprendre la commande exacte de la table `SUITES` : certaines suites sont de simples `node scripts/<nom>.mjs`, d'autres ont besoin du chargeur TypeScript, par exemple

```bash
node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/controle-e2e.mjs
```

Deux choses à savoir avant de lancer quoi que ce soit :

- **Ces suites visent la PRODUCTION par défaut.** 42 d'entre elles font `process.env.TEST_BASE || 'https://prestiapp.fr'` : poser `TEST_BASE` pour viser autre chose.
- **Elles lisent `.env.local`** (65 des 71 fichiers e2e) et utilisent la clé de service Supabase. 54 d'entre elles créent des comptes de test en `@presti-test.invalid`, et le ménage est censé se faire dans un `finally` pour qu'un échec au milieu ne laisse rien derrière lui — règle tenue par 51 sur 54 : `controle-argent-e2e`, `pwa-e2e` et `zero-demo-e2e` n'ont aucun `finally` aujourd'hui.

Quelques suites, par domaine : `controle-e2e` (socle du Poste de contrôle), `controle-argent-e2e`, `controle-apports-e2e`, `controle-droits-e2e`, `controle-messagerie-e2e`, `controle-compta-e2e`, `zero-demo-e2e` (aucun compte de démonstration en base hors ceux qui sont justifiés), `support-e2e`, `rls-e2e` et `sonde-rls-fondateur` (ce qu'un jeton de navigateur voit des autres artisans), `sonde-ancien-poste` (les routes de la fuite du 07/09 restent supprimées), `mobile-e2e`, `pwa-e2e`, `push-e2e`, `facturation-e2e`, `legal-e2e`.

`scripts/smoke-test.mjs` est hors du lanceur et **ne doit pas servir de preuve** : il teste encore une route de paiement supprimée et lève une `ReferenceError` avant d'y arriver. Même chose pour `scripts/csp-smoke.mjs`, qui n'assertionne rien.
