# Journal — sprint « audit final total » (prompt v6)

> Format : `[bloc] titre — début → fin (durée) — statut`, cumul à chaque fin de bloc.
> **Règle du sprint : 0 appel IA sur la réserve Anthropic de Presti.** Compteur affiché à chaque bloc.
> Claude Code tourne sur **abonnement** (limite de session observée le 04/09 à 19 h 20, pas de clé API) → coût marginal nul, auditeurs lancés en deux vagues.

## [0] Cadrage — 00:55 → 01:20 (25 min) — ✅
- Relu : journal-v5, audit-v5, apres-demo, demo-parcours, couts-et-solde, fournisseurs, tout-verifier (33 suites : 19 gratuites, 10 navigateur, 3 IA, 1 build).
- Existant confirmé : `verif-supabase-reglages.mjs`, `run-migration.mjs`, `coentreprise.mjs`, `ai-eval.mjs`, Husky pre-commit, `.github/workflows/qualite.yml`, 13 agents `presti-*`, skills `tdd`, `triage`, `code-review`, `diagnosing-bugs`, `presti-ai-lab`, `review-animations`, `improve-animations`.
- Absent (à livrer) : `.github/workflows/audit.yml`, `lib/alertes.ts`, `scripts/alertes-e2e.mjs`, `scripts/abonnement-e2e.mjs`, `scripts/inventaire-produit.mjs`, `plans/{inventaire-produit,couverture,promesses,audit-final}.md`.
- Surface à auditer : **56 routes API, 30 pages**, 56 migrations, drapeaux, emails, 2 crons.
- Garde-fou IA local : la clé Anthropic de `.env.local` est mise en commentaire pour la durée du sprint (tout script local qui l'appellerait échoue en 401 → défaut visible). La prod garde sa clé.
- Stripe est en **mode RÉEL** (vérifié le 04/09) → §4 attend H4 (clé de test) pour ne rien débiter.

**Appels IA du sprint : 0**

## [1] Inventaire et couverture — 01:20 → 01:45 (25 min) — ✅ `scripts/inventaire-produit.mjs`
- 30 pages · 56 routes · 56 migrations (0047→0056 sondées en base : toutes ✅) · 12 drapeaux (2 morts : `inventaireOcr`, `plateformePilotage`) · 26 envois d'email · 2 crons · 23 capacités · 33 suites → `plans/inventaire-produit.md`, `plans/couverture.md` : **75 cases vides**.
- **Trouvé par l'inventaire, à ma charge** : le verrou serveur des règles d'automatisation, déclaré corrigé dans `audit-v5.md` (§8), **n'avait jamais été appliqué** — le script d'édition du 04/09 avait planté sur une assertion précédente. Posé pour de bon, suite gratuite `regles-verrou-e2e` (6/6, aucun appel IA : le contrôle précède tout chiffrage), `audit-v5.md` rectifié. Déployé `b168871`.
- Rectification aussi : la sonde 0047 cherchait une table là où la migration ajoute une colonne (faux rouge).

## [2] Vague 1 d'auditeurs — 01:45 → … — ⚠️ relancée
- Lancés A (attaque), B (conformité), C (qualité), H (abonnement) avec le garde-fou « zéro appel IA » dans chaque brief. **Les quatre coupés par la limite de session** à leur première étape (rien de perdu). Relancés **par deux** (A + B) après la remise à zéro de 3 h ; C et H suivront.

**Appels IA du sprint : 0**

## [6] Alertes — 01:45 → 03:40 (1 h 55, dont 1 h 30 d'attente de limite) — ✅ huit motifs simulés ET reçus
- `lib/alertes.ts` : budget IA (API Admin Anthropic, seuils 70 / 90 % + projection — parseur défensif, forme de la réponse à confirmer dès H5), crédits d'un artisan (20 % puis 0, à l'artisan ; liste hebdo à l'entreprise), erreurs (≥ 5 en 10 min), cron muet (table `passages_cron`, **migration 0057 à coller**), domaine mail (MX/SPF/DKIM/DMARC le lundi), sécurité (révocations 24 h), paiement (déclenchée par le webhook — à brancher par l'auditeur H), digest du lundi. Une alerte par motif et par jour (`consommerLimite`). Jamais d'exception vers l'appelant.
- `app/api/cron/alertes` (secret cron, `?sec=1`, `?simuler=motif`). Vercel n'accorde que 2 crons : la ronde est **appelée par le cron des relances** à 8 h. Les trois crons laissent leur trace dans `passages_cron`.
- `scripts/alertes-e2e.mjs` : ronde à sec = suite gratuite du lanceur ; `--simuler tous` = **9 emails réels reçus sur benjaminfiliot@gmail.com** (paiement en envoie deux : artisan + entreprise). Preuve : sortie ci-dessus, identifiants Resend consultables dans le tableau de bord Resend.
- Non fait, chiffré dans `apres-demo.md` : « connexion fondateur depuis un nouvel appareil » et « 10 échecs de connexion » — la connexion se fait côté client contre Supabase, le serveur ne voit pas les échecs ; il faudrait un enregistrement d'empreinte d'appareil (~2 h) et un relais des échecs (~1 h).

**Appels IA du sprint : 0**

## [3] Vague 1 : rapports A, B, C — 03:40 → 05:10 — ✅ A (0/0/2) · B (2/11/…) · C (0/4/14)
- **A — attaque** : 0 bloquant, 0 majeur, 2 mineurs (CSP `unsafe-inline`, échappement JSON-LD) → `apres-demo.md`.
- **B — conformité** : 2 bloquants (boîte `contact@prestiapp.fr` morte sur 3 pages + 2 Reply-To ; purge d'un compte facturé impossible et silencieuse), 11 majeurs (≈ 35 h).
- **C — qualité** : 0 bloquant, 4 majeurs (poids mobile de la landing 2,8 Mo, infos-légales indexable malgré `site_seo` coupé, comparatif muet aux lecteurs d'écran, contraste 2,73:1), 14 mineurs (≈ 13 h).
- **H — abonnement** : en cours (Stripe réel → transitions lues au code + webhook signé, H4 attendu pour les 11 transitions réelles).

## [5a] Correctifs — bloquants B — 05:10 → 05:45 (35 min) — ✅ commit `c1ffcb7`, vert en prod
- **B-bloquant 1** — test rouge `seo-e2e` §2 bis (3 pages ❌) → CGU, FAQ, confidentialité renvoient au formulaire `/contact` ; `reglesServeur.ts` et `conversation/devis` perdent leur Reply-To mort → **32/32 en prod**.
- **B-bloquant 2** — test rouge `purge-comptes-e2e.mjs` (9/18 ❌ : « Database error deleting user » avalé, compte facturé intact et connectable) → `lib/purgeComptes.ts` : sans facture = effacé (erreurs remontées) ; avec facture émise = **anonymisé** (factures + devis/clients cités + identité d'émetteur gardés 10 ans, tout le reste effacé, accès banni, abonnement Stripe annulé). Le récapitulatif de `/api/account/delete` le dit avant confirmation → **18/18**.
- Suite ajoutée au lanceur (`tout-verifier`, gratuite). Registre : `plans/audit-final/correctifs.md`.

**Appels IA du sprint : 0**

## [3b] Vague 2 : rapports E, D — 06:30 → 08:40 — ✅ E (0/5/9) · D (0/5/9) · F, G coupés par la limite (à relancer)
- **E — IA (lecture seule, 0 appel)** : Expert débité 1 crédit au lieu de 3 ; assistant autonome non verrouillé côté serveur ; `qualifie` toujours vrai (règle « tout auto » chiffrait et envoyait sur une conversation vide) ; filtre anti-fabrication faux positifs/négatifs (8 cas) ; solde à zéro muet sur 6 chemins, crédit jamais rendu.
- **D — parcours (mobile + desktop, 0 appel)** : slug généré invalide (45 car., `--`) ; aucune borne nom/tel (371 car., `<script>`) ; lien magique expiré muet ; `/plateforme` à 510 px sur iPhone ; « site hors ligne » affiché avant Enregistrer.
- Tous les parcours vont au bout ; Stripe Checkout LIVE atteint sans payer.

## [5b] Correctifs — majeurs B, C, H, E — 05:45 → 09:00 — ✅ 4 commits, 46 points verts en prod
- `cf666ca` — 12 majeurs B/C/H : franchise « auto » = 293 B tant que la tolérance dure ; n° TVA sur le PDF ; CGU acceptées à l'inscription (date + version en métadonnées) ; messagerie connectée dans la politique ; rétractation (L. 221-18/25/28) ; identité de facturation Stripe ; infos-légales suit `site_seo` ; comparatif accessible ; contraste 4,9:1 ; 409 → portail si déjà abonné ; fin d'un ancien abonnement ignorée ; `invoice.payment_failed` écouté ; erreur webhook → 500 + alerte.
- `303a5fd` — landing 2,4 Mo → 290 Ko (WebP, 2 scènes montées) ; CGU : pros, prix, TVA ; fondateur 403 ; scripts Stripe dangereux neutralisés.
- `(lot 3)` — avoir de facture (`POST /api/factures/[id]/avoir`, 381 Factur-X, PDF « AVOIR ») ; médiateur sur le devis ; IP pseudonymisées (leads, devis, export) ; annexe art. 28 dans les CGU ; chat jamais muet.
- `(lot E)` — coûts justes, verrou serveur `plateforme.ia.auto`, qualification par le message, filtre anti-fabrication (8 cas), pannes signalées + crédits rendus. **Piège rencontré** : un `` dans un script Python passé par heredoc est devenu un caractère de contrôle (regex muette) — remplacé par `includes`.
- Restent (décisions ou dashboard) : H-bloquant 1 portail Stripe (H7), D2 email/téléphone de l'éditeur, F3 domaine d'envoi, C6/C12/C13 (purges 12 mois / 3 ans), A2/A7/A10-13 mentions facture (chiffrés `apres-demo`).

**Appels IA du sprint : 0**

## [5c] Correctifs — majeurs D — 09:00 → 09:40 — ✅ `23bfbef`, 50/52 en prod (les 2 rouges attendent 0058)
- Slug généré toujours valide (`slugBase`, ≤ 40) ; nom/tel/métier bornés à l'onboarding **et par la base** (migration 0058, contraintes `check`) ; lien magique expiré annoncé (`role="alert"`) ; onglets de `/plateforme` défilants ; « hors ligne » seulement une fois enregistré.
- Suite `audit-final-e2e` : 52 points. Les 2 rouges (« la base refuse 371 caractères / abc<script> ») passeront au vert dès que 0058 est collée — c'est voulu : la prod n'est pas protégée tant que ce n'est pas fait.

## [8] Audit récurrent — 09:40 → 10:00 — ✅ `.github/workflows/audit.yml` + `scripts/garde-commit.mjs`
- Nuit (4 h 17 Paris) : toutes les suites gratuites + navigateur contre la prod, inventaire + couverture en artefact, réglages Supabase. **Jamais l'IA** (la ligne `ANTHROPIC_API_KEY` est filtrée du secret à l'entrée).
- Pré-commit : typecheck + `garde-commit` (8 régressions connues refusées : boîte morte, IP en clair, tarif standard forcé, annulation sans avoir, clés en clair).
- Coentreprise `sync-down` : à la main, hors CI (elle touche la réserve Anthropic via les mémoires — pas dans une tâche automatique).

## [3c] Vague 2 : rapport F — 10:00 → 10:15 — ✅ F (0/12/14)
- **F — fiabilité, coûts, emails** : `signalerPanneIA` lancé en `void` avant `return` (Vercel peut couper) ; alerte perdue 24 h si Resend tombe ; `passages_cron` absente en prod (0057 non collée) ; ronde « erreurs » lisait une colonne inexistante (`route`) sur 10 min ; relance marquée envoyée même si l'email échoue ; crédits bas chaque matin ; aucune borne globale d'emails (Resend gratuit = 100/jour) ; 34 % de rebonds (adresses .invalid des suites) ; DMARC absent ; `artisan-media` sans quota ; démo relancée au nom d'un artisan fictif ; aucune sauvegarde prouvée.

## [5d] Correctifs — majeurs F — 10:15 → 10:45 — ✅ `67f7283`, 57/59 (les 2 rouges attendent 0058)
- 9 des 12 majeurs fermés par le code (voir `correctifs.md` 33-41). Restent : 0057 (H1), DMARC (H11), quota `artisan-media` (`apres-demo`, 1 h : politique de stockage), sauvegardes (H12).

**Appels IA du sprint : 0**

## [9] Lanceur complet et adresse dédiée — 11:00 → 11:30 — ✅ 37/37 hors IA
- `node scripts/tout-verifier.mjs` (37 suites, 434 s, jamais l'IA) : 32/37 au premier passage. Les 5 rouges : 2 suites en retard sur les correctifs (case CGU, import CSV qui met à jour au lieu d'empiler — comportement voulu, test corrigé), 2 suites bloquées par les plafonds (429) parce que les auditeurs et moi frappions la prod depuis la même adresse (`purger-abus` vide maintenant aussi les créneaux), 1 suite recouverte par la visite guidée (mémorisée en base : `aide_vues`). Rejouées une à une : **toutes vertes**. Seuls restent les 2 points de `audit-final-e2e` qui attendent 0058 (H1).
- **Adresse dédiée aux tâches automatiques** (demande Benj) : `benjaminfiliot+presti@gmail.com` — alias Gmail, rien à créer. Posée en local et sur Vercel (`scripts/vercel-env.mjs PRESTI_ALERTES_EMAIL …`), libellé « Presti » créé dans Gmail, **digest simulé reçu à 11:12** et rangé sous le libellé. Il reste à Benj un filtre Gmail (« à : benjaminfiliot+presti@gmail.com » → libellé Presti) pour que les suivants se rangent seuls.

**Appels IA du sprint : 0**

## [3d] + [5e] Rapport G et correctifs — 12:30 → 13:30 — ✅ G (0/9/6), 8 majeurs fermés
- **G — motion, marque, accessibilité** (mesures Playwright : reduced-motion, CLS, clavier, white-label) : séquence auto-défilante sans pause tactile ; CTA coupé à 200 % de zoom ; CLS 1,05 des slides 3D (pin GSAP) ; visionneuse dont la molette fait défiler la page derrière ; focus invisible sur le curseur avant/après ; tiroir mobile sans dialog/Échap/inert ; focus du composeur imperceptible ; fil sans région live ; 404 racine Presti servie sous /site/<slug>/xyz et /p/<slug>/xyz. Sain : reduced-motion propre partout, lightbox conforme, /p 0 violation axe en clair/nuit, zoom 400 % sans débordement.
- 8 des 9 fermés (lot G) ; G-2.1 (slides 3D : remplacer le pin par sticky + scrub, 1 h 30) → `apres-demo`. **Point produit** : la vitrine des fonctionnalités (`FeatureShowcase`) n'existe pas dans le dépôt — la règle « chaque fonctionnalité a son onglet » n'a plus de support ; à trancher avec Benj.

**Appels IA du sprint : 0**

## Liste H — actions humaines (vérifiées par l'effet, jamais en demandant)
| # | Action | Où | Effet vérifiable |
|---|--------|----|------------------|
| ~~H1~~ | ✅ fait par Benj le 05/09 — vérifié : `audit-final-e2e` **68/68**, table `passages_cron` présente (première trace au cron de 8 h) | — | — |
| H4 | Clé Stripe de TEST (`STRIPE_SECRET_KEY_TEST`) dans `.env.local` | Stripe → Développeurs | `abonnement-e2e` joue ses 11 transitions sans débit |
| H5 | `ANTHROPIC_ADMIN_KEY` + `BUDGET_IA_MENSUEL_EUR` sur Vercel | Vercel → Environment | `GET /api/cron/alertes?sec=1` mesure le coût du mois |
| H7 | Portail client Stripe activé en LIVE (factures, moyen de paiement, résiliation, changement d'offre) + modèle de facture avec pied « TVA non applicable, art. 293 B du CGI » | Stripe → Paramètres → Facturation | `POST /api/stripe/portail` → 200 (auditeur H, bloquant 1) |
| H8 | Secret GitHub `PRESTI_ENV_LOCAL` (contenu de `.env.local` sans la clé Anthropic) | GitHub → Settings → Secrets → Actions | premier run vert de « Audit récurrent » (workflow_dispatch) |
| H9 | Email et téléphone de l'éditeur (LCEN) — boîte qui fonctionne ou adresse choisie | décision Benj | mentions légales complètes (auditeur B, D2) |
| H10 | Domaine d'envoi neutre pour les emails au nom de l'artisan | décision + DNS | From sans « presti » (auditeur B, F3) |
| H13 | Filtre Gmail : « à : benjaminfiliot+presti@gmail.com » → libellé « Presti » (le libellé existe déjà) | Gmail → Paramètres → Filtres | le prochain email d'alerte arrive rangé |
| H11 | Enregistrement DNS `_dmarc.prestiapp.fr` TXT `v=DMARC1; p=quarantine; rua=mailto:<adresse des alertes>` (ou `node scripts/ovh.mjs dmarc`) | OVH → zone DNS | `nslookup -type=txt _dmarc.prestiapp.fr` répond ; alerte `domaine_mail` se tait |
| H12 | Sauvegardes : offre Supabase avec sauvegardes quotidiennes (Pro) ou `pg_dump` planifié (mot de passe Postgres à réaligner) | Supabase → Settings → Database | une restauration testée une fois, datée dans le journal (auditeur F, 12) |

**Appels IA du sprint : 0**
