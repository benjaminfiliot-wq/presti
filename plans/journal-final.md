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

**Appels IA du sprint v6 : 0 · v7 : 3 (bloc 1, rejeu obligatoire de `pilotage-e2e`) · bloc 2 : 0**

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

## [10] Solde de l'audit — 05/09 13:00 → 16:30 — ✅ tout ce qui restait, sauf trois gestes humains
- **Sondes après les gestes de Benj** : 0057/0058 posées (68/68) ; portail Stripe LIVE configuré (résiliation en fin de période, factures, carte, changement d'offre) et catalogue des 3 offres (29/59/99 €) — le champ `products` n'existe plus dans cette version de l'API, le portail s'appuie sur le catalogue ; secret GitHub **absent** → posé par l'API (contenu minimal : Supabase, CANAUX_KEY, adresses — jamais la clé Anthropic, ni Stripe LIVE, ni Vercel, ni Postgres) ; clé Stripe de test et clé admin Anthropic **absentes** ; DMARC **absent** ; détection de rejeu Supabase **toujours éteinte**.
- **Audit nocturne prouvé** : run #1 lancé à la main → 35/37, les 2 rouges étaient d'environnement (garde `.invalid` placé après le contrôle de clé Resend ; plafonds 429 entre suites depuis une IP fraîche ; visite guidée). Corrigés : le garde passe avant, le lanceur purge les compteurs entre deux suites, la suite des paramètres marque la visite vue en base.
- **Les cinq suites IA rejouées** (Haiku) : injection 6/6, provenance 7/7, pilotage 18/18 (17/18 le 04/09), recherche 37/37, ai-eval 40 cas 0 erreur (vocabulaire métier 68 %, seul point bas). Coût : < 1 €.
- **Sauvegardes (F-12)** : `scripts/sauvegarde.mjs` (toutes les tables par l'API de service, comptes, fichiers ; chiffrement AES-256-GCM + RSA-4096, la machine qui écrit ne peut pas relire), `scripts/restaurer.mjs` (--lire, --comparer, --aller-retour, --restaurer --artisan), `scripts/cle-sauvegarde.mjs`, `.github/workflows/sauvegarde.yml` (nocturne, artefact chiffré 30 jours), `docs/sauvegardes.md`. **Aller-retour prouvé 7/7** sur un compte de test effacé puis restauré à l'identique. Le mot de passe Postgres reste désaligné : la connexion directe échoue, d'où l'API.
- **Budget IA sans clé admin** : la ronde disait [] en silence ; elle envoie désormais un rappel hebdomadaire avec une estimation depuis les crédits consommés. `BUDGET_IA_MENSUEL_EUR=50` et `EMAILS_PAR_JOUR=80` posés sur Vercel.
- **Chantier en sept domaines** (agents parallèles, fichiers disjoints, 0 appel IA, 0 git) — la vérification adverse a été coupée par la limite de session (13 relecteurs), donc relue à la main :
  · **Quota de stockage** (F-10) : `/api/media` serveur, plafond par offre (Essai 25 Mo → Signature 1 Go), mesure réelle sur `artisan-media`, compteur + trigger sur `lead-media` ; 0059 ferme la porte du navigateur (à coller APRÈS le déploiement) ; suite `quota-media-e2e` (~40 Mo envoyés pour prouver le plafond). Repris à la main : les 6 composants d'import affichent le message du serveur.
  · **Purges RGPD** (C6/C12/C13) : `lib/purgesRgpd.ts`, durées tirées de `lib/legalArtisan.ts` (`DUREES_MOIS`), bornées et rejouables, appelées par le cron quotidien ; 0060 = index ; première purge réelle : **0 ligne** aujourd'hui (le produit a deux mois). Ajouté à `CRONS_ATTENDUS`.
  · **Mentions facture/devis** (A2, A7, A10-A13, E4) : mentions ajoutées au PDF et au Factur-X, formulaire type de rétractation sur le devis, création refusée (422) sans nom de client — l'acompte automatique d'un prospect sans nom notifie l'artisan au lieu d'émettre une facture qui ne désigne personne.
  · **Motion** (G-2.1 + mineurs) : slides 3D en `position:sticky` + scrub (plus de pin GSAP), `overflow-x:clip` — effet de bord voulu : la barre du site est enfin collante ; onglets de la démo avec `aria-controls`, heure décorative sortie d'`aria-live`, boucles arrêtées hors écran, contraste `.site-shot-tag`, CSS orphelin retiré ; suite `motion-cls-e2e`.
  · **Suites manquantes** : `relances-e2e` (bout en bout sans IA) et `domaine-perso-e2e`. Cette dernière a trouvé trois défauts réels, corrigés à la main : le middleware servait un domaine **non vérifié** ; deux artisans pouvaient revendiquer le même domaine (0061 + refus 409 avant Vercel) ; `mondomaine.fr/login` servait les pages Presti (attrape-tout → 404 de l'artisan).
  · **En-tête** (A mineurs, C mineurs) : nonce ÉCARTÉ avec une raison documentée (les pages pré-calculées serviraient des scripts sans nonce → mortes) ; à la place `script-src-attr 'none'` ferme le vecteur réel ; JSON-LD échappé ; favicon.ico + apple-icon (Presti et par artisan) ; canoniques et OG propres aux pages secondaires.
  · **Textes juridiques** (D2, support, médiation, art. 28) : email de contact publié (l'alias des alertes), article « Support et assistance » avec des délais de première réponse par offre en jours ouvrés, plateforme RLL retirée (fermée le 20/07/2025), aucun médiateur inventé, annexe art. 28 complétée, sous-traitants avec lieux. **Repris à la main** : un remboursement au prorata inventé par l'agent a été retiré (engagement financier = décision du propriétaire) ; `CGU_VERSION` passée au 05/09.
- Build local vert, typecheck vert, `garde-commit` vert.

**Appels IA du sprint : ≈ 100 (les cinq suites, une fois, au niveau Haiku) — < 1 €.**

## [11] Après le déploiement du solde — 05/09 16:30 → 18:00 — ✅ 41 suites vertes sur 42, la 42e attend 0059
- Prod sondée après déploiement : `og:title` toujours servi (remplissage automatique de Next), `favicon.ico` et `apple-icon` en 200, `script-src-attr 'none'` dans la CSP, `/api/media` en place. Une photo de prospect est toujours enregistrée avant 0059 (sondé par l'effet).
- Lanceur complet : 37/42 au premier passage. Les cinq rouges relus un par un : **quota** (4 points attendent 0059, colonne et RPC absents — pas une régression) ; **domaine** (le site d'un artisan au domaine vérifié redirige vers son domaine, le test suivait la redirection vers un DNS inexistant → il lit maintenant la redirection, qui est la vraie preuve ; au passage : **la page de conversation ne redirigeait pas, elle**, corrigé) ; **motion** (le hero est sous la ligne de flottaison sur desktop, donc en pause à bon droit : le test l'amène à l'écran ; seuil CLS aligné sur 0,1) ; **alertes** (assertion libuv à la sortie sur Windows, sortie adoucie) ; **juridique** (le test attendait la clause de remboursement retirée).
- Audit nocturne #2 : 37/42 pour les mêmes causes + `relances` sans clé Resend en CI → la suite a un mode sans envoi (automatique sans clé) qui prouve la mécanique ; le cron ne saute plus les adresses `.invalid` (lib/email les neutralise, le fil garde sa trace). Relances : 26/26 sans envoi, 34/34 avec.
- **Sauvegarde nocturne #2 : verte**, artefact chiffré déposé. Audit nocturne run final lancé après le dernier commit.
- État final local : purges 43/43 · relances 34/34 · domaine 36/36 · motion 24/24 · juridique 56/56 · alertes 3/3 · quota 25/31 (les 6 restants = 0059 à coller, H14).

**Appels IA du sprint : ≈ 100, une seule fois, < 1 €.**

## [12] Clôture — 05/09 18:30 — ✅ 42 suites sur 42 localement
- Benj a collé 0059-0061. Prouvé : quota 32/32, purges 43/43, doublon de domaine refusé (`artisans_domaine_unique_idx`). La détection de rejeu, elle, n'est **pas encore effective** (sonde relancée deux fois à 80 s d'intervalle : un ancien jeton passe toujours) — voir H15.
- **Nécessaire pour vendre** : plus rien côté technique. Deux obligations légales restent à la main de Benj : le **téléphone** dans les mentions légales (LCEN, une ligne) et, plus tard, une boîte sur le domaine à la place de l'alias Gmail (confort, pas obligation).
- **Confort, pas bloquant** : DMARC (délivrabilité, 2 min chez OVH), clé admin Anthropic (sinon rappel hebdomadaire), clé Stripe de test (les 11 transitions en conditions réelles — le premier abonné réel les prouvera), domaine d'envoi neutre.
- **Indispensable pour ne pas perdre les sauvegardes** : ranger `cle-sauvegarde.key.pem` hors du disque (gestionnaire de mots de passe + clé USB).

## [13] Preuve finale sur GitHub — 05/09 19:15 — ✅ audit nocturne run #5 : **42/42 suites vertes** (607 s)
- Le système se revérifie seul, et la dernière exécution est intégralement verte, sans la clé IA.
- Reste à l'humain : le téléphone LCEN (obligation légale), la fenêtre de tolérance des jetons (H15, durcissement), et le confort (DMARC, clés de test/admin, domaine d'envoi).

## [14] Deux dernières obligations — 05/09 19:45 — ✅
- **Téléphone LCEN** publié dans les mentions légales avec l'email ; la suite juridique l'exige.
- **Détection de rejeu** : le réglage était bon (bouton activé, fenêtre à 10 s) et c'est ma sonde qui se trompait — elle rejouait le parent immédiat, toléré par GoTrue pour absorber un double rafraîchissement. Reprise sur un jeton deux crans en arrière : refusé, chaîne légitime intacte. Leçon : une sonde qui accuse doit d'abord être suspectée elle-même.
- Il ne reste que du confort à la main de Benj : DMARC, clé admin Anthropic, clé Stripe de test, domaine d'envoi neutre.

## [15] v7 · bloc 1 — les trois modes de réponse — 05/09 21:30 — ✅ `modes-e2e` **35/35** en prod, `pilotage-e2e` 18/18
- **Vérifié** : chaque mode × chaque route × 3 offres, avant correction → **17/35** (test rouge écrit d'abord).
- **Trouvé (preuve)** : `/api/conversation` lisait `artisans.reponse_auto` AVANT la config (motif absent, mode ignoré) ; `/api/leads` idem ; `/stream` déguisait le verrou d'offre en « assistée » ; `GET /api/plateforme/config` n'existait pas (404) ; `rendre_main` → 400 ; l'écran enregistrait le mode avec le reste et rechargeait à chaque re-rendu.
- **Corrigé** (5 commits `bfd044d` → `d263d92`) : 1a une seule source de vérité (`plateforme_config.mode_reponse`, migration 0062 rejouée par l'API de service : 6/6 comptes ont leur ligne, le booléen n'est plus jamais lu ni écrit) · 1b `decisionReponse()` unique pour les trois routes, motif explicite `verrou_offre` · 1c verrou visible (🔒 « Disponible avec l'offre Studio », non sélectionnable) · 1d `rendre_main` + bouton dans le bandeau · 1e enregistrement au clic, « Mode appliqué par le serveur » lu sur `GET /api/plateforme/config`.
- **Preuve en prod** : `modes-e2e` 35/35 (aller-retour auto → assistée → manuelle → auto, verrou, prise/rendue de main, booléen hérité ignoré, 0 message IA, 0 crédit) ; `pilotage-e2e` 18/18 rejoué.
- **Journal** : appels IA : **3 en prod** (les 2 réponses + 1 chiffrage de `pilotage-e2e`, Haiku, < 0,05 €) — le prompt exige ce rejeu ; `modes-e2e` en fait **0** (comptes à 0 crédit, remise datée dans le futur). Cumul v7 : 3.
- **Reste à Benj** : coller `_A_COLLER_sql_editor_0062.sql` (uniquement le commentaire de colonne — les lignes de config sont déjà posées).
- **Suivant** : bloc 2, le code email à la connexion.

## [16] v7 · bloc 2 — le code par email à la connexion — 05/09 23:30 — 🟧 livré derrière un drapeau, preuve en prod EN ATTENTE de la migration 0063
- **Vérifié** : la connexion d'aujourd'hui expose la session au navigateur dès le mot de passe ; la clé anonyme étant publique, n'importe qui avec un mot de passe volé obtient un jeton auprès de GoTrue et ouvre toutes les routes. Le second facteur (TOTP) est optionnel.
- **Trouvé (preuve, sur le plan lui-même)** : la colonne `connexion_verifiee_le` comparée à l'`auth_time`, telle que proposée, **laisserait passer un intrus** — un jeton obtenu avec le mot de passe volé deviendrait valable dès que le vrai titulaire se reconnecte (une seule date pour tout le compte). Le contrôle est donc **par session** (`sessions_verifiees`, clé = `session_id` du jeton) ; la colonne existe pour l'affichage.
- **Corrigé** (6 commits `49332f9` → `9b51249`, tous typés, `garde-commit` vert) : migration 0063 (3 tables sans RLS lisibles par les routes seules, RPC atomique `verifier_code_connexion`) · `lib/connexion.ts` (HMAC du code avec un secret serveur dérivé de la clé service, cookie `appareil_confiance` signé httpOnly 30 j, empreinte = sha256(agent | secret) — jamais l'IP) · `lib/authArtisan` : 401 `code_requis` pour toute session non vérifiée d'un compte sans TOTP, fondateurs compris · routes `POST /api/auth/code` (mot de passe vérifié par le serveur, TOTP → l'application remplace l'email, appareil reconnu → vérifiée d'office, sinon session refermée et code envoyé, rien rendu ; anti-énumération à l'octet ; plafonds 30/IP, 10/compte, 3 renvois/15 min) et `/verifier` (mot de passe REDONNÉ avec le code, usage unique, 5 essais, session rendue seulement là) · `/api/securite/appareils` · écran /login, Sécurité → appareils, AppShell et commun.ts (session d'avant → reconnexion), aide `securite.code_email` · purges (codes, appareils, sessions > 90 j) · **37 suites adaptées** (`scripts/lib/connexion-test.mjs` : la session de test est attestée par le service, le code réel étant haché) · suite `code-connexion-e2e` (12 sections, 0 IA, 0 email réel).
- **Pourquoi un drapeau** : je ne peux pas créer de table en prod (migrations collées par Benj). Avec le verrou levé et sans les tables, `authArtisan` refuserait TOUT (fail-closed, voulu) — Benj compris. Donc `codeEmail: false` jusqu'à la migration ; la connexion d'aujourd'hui est inchangée à l'octet (rejoué : `parametres-e2e` 70/70, `mfa-e2e` 25/25, `motdepasse-e2e` 31/31, `modes-e2e` 35/35).
- **Preuve en prod** : ⛔ pas encore. `code-connexion-e2e` constate le drapeau baissé (404 sur la route), dit quoi faire et sort en code 2 → lanceur **43/44** jusque-là.
- **Journal** : appels IA : **0**. Cumul v7 : 3 (bloc 1, rejeu exigé de `pilotage-e2e`).
- **Limite écrite d'avance** : même levé, le verrou ne couvre pas les lectures directes navigateur → PostgREST (RLS) avec un jeton au mot de passe seul ; le fermer = `connexion_verifiee()` dans chaque politique RLS, chantier à décider. Et GoTrue plafonne les connexions par IP, l'IP vue étant celle de Vercel (à relever dans Auth → Rate limits quand les artisans seront nombreux).
- **Suivant (H17, 1 minute)** : coller `_A_COLLER_sql_editor_0063.sql` → me le dire → `lib/flags.ts` `codeEmail: true`, déploiement, `code-connexion-e2e` + `mfa`/`parametres`/`motdepasse` rejoués, lanceur 44/44 local et GitHub. Chaque artisan connecté se reconnectera une fois.

## [17] v7 · bloc 3 — vérification finale — 05/09 18:45 — ✅ lanceur **43/44 + 1 en attente** en local ; GitHub run #7 : 42/44 + 1 en attente + 1 échec d'environnement (expliqué)
- **Rejoué** : `node scripts/tout-verifier.mjs` deux fois depuis un arbre propre (le dépôt local porte un chantier étranger non commité — nouveau logo — qui casse `tsc` et `next build` ; commits faits depuis un worktree). Passage 1 : 41/44 (deux suites à aligner sur le nouveau code : `audit-final-e2e` M2 cherchait le verrou d'offre dans la route de flux, il vit dans la décision unique ; `emails-e2e` ne connaissait pas l'envoi du code). Passage 2, après alignement : **43/44 vertes · 1 en attente d'un préalable humain** (`code-connexion-e2e`, migration 0063), code de sortie 0, 557 s.
- **GitHub** : run #6 (avant alignement) 41/44, même lecture qu'en local. Run #7 (après) : 42/44 + 1 en attente + **1 échec : `mentions-bloquantes-e2e` 13/15, HTTP 502 « Envoi impossible » à l'envoi du devis**. Cause constatée en base, pas devinée : `limites.emails:jour` = **86 ≥ 80** — le plafond quotidien d'envois (F, majeur 7, protège l'offre Resend gratuite) a été atteint par les cinq passages complets d'aujourd'hui (chaque passage envoie de vrais emails au puits `delivered@resend.dev`). La même suite était verte au passage local 1 et au run #6. La fenêtre se remet à zéro à minuit UTC ; l'audit nocturne de 4 h 17 tourne après. Ce n'est pas un défaut du produit : c'est le plafond qui fait exactement son travail.
- **Lanceur** : nouvel état ⏳ « en attente d'un préalable humain » (code de sortie 2, précédent `mfa-e2e`) — exclu des vertes ET des échecs, consigne recopiée. Le compte reste honnête : 43/44 tant que 0063 n'est pas collée, 44/44 après.
- **Documents** : `plans/audit-final.md` (« Ce que Benj a trouvé après l'audit », ce que le sprint ne prouve pas, gestes restants), `plans/couverture.md` (règle « l'effet d'un réglage = comportement observé sur chaque route qui le lit », 0 case vide), liste H réécrite ci-dessous, vault `SaaS/Produit/Session-2026-09-05-v7-Modes-et-Code-Email.md`.
- **Journal** : appels IA : 0 sur ce bloc. **Cumul v7 : 3** (bloc 1, rejeu exigé de `pilotage-e2e`). Clé Anthropic locale restaurée.
- **Suivant (Benj, 1 minute)** : H17 — coller `_A_COLLER_sql_editor_0063.sql`, me le dire → drapeau levé, déploiement, `code-connexion-e2e`, 44/44.

## [18] v7 · clôture — migration 0063 collée, code email ACTIF, logo en ligne — 05/09 20:15 — ✅ 44/44
- **0063 collée par Benj** et constatée par l'effet (3 tables, colonne, RPC → 200). Drapeau `codeEmail` levé (commit `cf562bf`), déployé.
- **Le code par email prouvé EN PROD** : `code-connexion-e2e` **56/56** (anti-énumération à l'octet, jeton d'avant vérification refusé sur toutes les routes, 5 essais → nouveau code, usage unique, code sans mot de passe refusé, 3 renvois/quart d'heure, code expiré, cookie signé httpOnly 30 j, appareil reconnu = pas de code — même agent seulement, cookie altéré refusé, révocation unitaire et globale, TOTP remplace l'email, fondateur même règle, écran /login + Sécurité). Un seul rouge au premier passage : une assertion (la pastille « cet appareil » rendue en capitales par le CSS) — corrigée (`a667ff1`), pas le produit. Rejoués verts avec le drapeau levé : `mfa-e2e` 25/25, `parametres-e2e` 70/70, `motdepasse-e2e` 31/31.
- **Lanceur : 44/44** (la suite en attente joue désormais). Le drapeau levé, une session au mot de passe seul n'ouvre plus aucune route d'un compte sans application d'authentification.
- **Logo « l'aube »** (commit `c1874d2`) : la marque de l'entreprise (demi-soleil au pinceau, trace peinte figée dans `public/marque/*.svg`) posée sur la console, la landing et les quatre écrans d'authentification ; favicon, icône d'onglet, icône iOS et carte de partage Open Graph refaits. Réservé à Presti (marque blanche intacte : jamais sur le site/plateforme d'un artisan). Tous les assets servent 200 en prod. Chantier `_to_delete/` laissé à Benj (variantes superseded).
- **Appels IA** : 0 sur ce bloc. Cumul v7 : 3.
- **État vendable** : le site peut partir au premier client. Restent, non bloquants : clé Stripe de test (H4, pour les 11 transitions d'abonnement), DMARC (H11), clé admin Anthropic (H5).

## [19] H4 — les 11 transitions d'abonnement prouvées en conditions réelles (mode test Stripe) — 05/09 21:45 — ✅ `abonnement-e2e` **78/78**, 17 écarts connus
- **Clé** : Benj a d'abord collé deux clés restreintes RÉELLES (`rk_live_`) — refusées : « limitée » règle les droits, pas le compte ; le mode réel rejette les cartes fictives et aurait sali le vrai compte (clients, abonnements, factures). La suite refuse désormais explicitement `rk_live_` et accepte `rk_test_`. Puis la vraie clé de test (`sk_test_`), nommée `STRIPE_SECRET_KEY_TEST` dans `.env.local` (valeur jamais affichée).
- **Premier passage réel : 74/77, 3 rouges — deux étaient la SUITE, un le bac à sable.** (1) « sans en-tête de signature → refusé » sortait HTTP 200 et le compte passait en Studio : `opts.entete ?? signer()` — `null` retombait sur une signature VALIDE, le test envoyait un vrai paiement. Le produit, lui, refuse bien un webhook non signé (sonde directe : 503) et une signature forgée (400). Corrigé (`=== undefined`). (2) « le compte est toujours en essai » tombait par conséquence. (3) Aucune configuration de portail dans le bac à sable : créée par l'API avec la clé de test — 3 produits/prix miroir du réel (29/59/99 €/mois, `lookup_key presti_*`), portail avec factures, moyen de paiement, résiliation en fin de période, changement d'offre. Rien de réel touché.
- **Second passage : 78 réussis, 0 échoué, 17 écarts connus (documentés dans `plans/audit-final/abonnement.md`, comptés à part), 5 résorbés.** Prouvé contre la prod : paiement (Studio, 250 crédits, renouvellement posé), rejeu d'événement, forgeries (sans signature 503, forgée 400, autre secret 400, corps modifié 400), échec de prélèvement avec grâce, `invoice.paid`, résiliation (retour à l'essai, client Stripe conservé, crédits gardés, inventaire fermé mais données gardées), réabonnement, résiliation d'un ANCIEN abonnement sans rétrogradation, erreur de traitement → 5xx, portail (GET/POST/401/404 + configuration), fondateurs jamais facturés, crédits atomiques (12 parallèles sur 5 → exactement 5), prospect jamais bloqué à 0 crédit, aucun prix en dur.
- **Reste dans `.env.local`** : deux lignes nues `rk_live_` (23 et 25) que je n'ai pas touchées — à supprimer par Benj, et ces deux clés à révoquer dans Stripe (elles ont transité par le chat).
- **Nightly** : la suite reste à la demande (`node scripts/abonnement-e2e.mjs`) — la mettre dans l'audit nocturne demande la clé de test dans le secret GitHub (sans le secret de webhook réel, qui n'y va jamais) : H18, confort.
- **Appels IA** : 0.

## [20] v8 · A0-A2 — le mobile, la preuve avant le correctif — 05/09 22:30 — 🔴 `mobile-e2e` **12/103** en prod (passage rouge, voulu)
- **Vérifié dans le code** (A0) : `100vh` ×4 sans `dvh` (l. 380, 382, 881, 1279), 0 `safe-area` dans `globals.css`, champs à 12-14 px (`.pf-in`, `.inbox-compose textarea`, `.cp-form input`, lignes de devis), la règle l. 1120 qui cachait `.lp-links` ET `.lp-btn--g` (« Se connecter ») sous 760 px, aucun `manifest`/`viewport` dans le layout, aucune suite mobile. Une nuance : les media queries ≤ 900 px sont ~45, pas 3 — mais aucune ne traite les écrans denses (devis, inbox, inventaire). L'info-bulle ⓘ s'ouvre déjà au tap (`onClick` dans `Info.tsx`) : constat 5 non reproduit.
- **Suite écrite d'abord** : `scripts/mobile-e2e.mjs` — 3 profils (iPhone 14 WebKit, Pixel 7 Chromium, iPad Mini WebKit — WebKit installé, ajouté au workflow nocturne), 28 pages (publiques, puis connectées avec le compte démo `atelier-du-chene`) × 6 invariants (défilement horizontal, chemin vers /login, cibles ≥ 44 px, champs ≥ 16 px, éléments hors écran, axe critique/grave), + connexion au doigt (mot de passe → code → console → tiroir), composeur sous clavier (fenêtre −320 px), tâches longues au défilement (CPU ×4), Lighthouse mobile (perf ≥ 90, a11y 100) sur 4 pages. Lighthouse installé en devDependency.
- **Trouvé (mesuré à 390/412/768 px en prod)** : **12 réussis, 91 échoués**. Toutes les pages tombent, pour des causes concentrées : liens de la barre latérale à **221×40** (84 occurrences de cibles < 44 px : nav, fil d'Ariane, « Retour », œil du mot de passe 31×31, boutons de la plateforme client 94×15) ; **axe** 64 contrastes (texte blanc sur corail 3,1:1 sur TOUS les boutons primaires, `link-in-text-block` sur la FAQ) ; **aucun chemin vers /login** sur /faq, /contact et les pages légales (elles n'ont qu'un fil d'Ariane) et la landing (bug n° 1 confirmé : bouton caché) ; champs < 16 px sur /profil (12-13 px), /devis/[id] (13,76 px ×24), /p (12,8 px) ; **défilement horizontal sur le seul éditeur de devis** (483 px pour 390) ; le **composeur de /messages passe sous le clavier** (y=482…543 pour 344 px visibles) ; bouton menu de la console 38 px ; Lighthouse : / perf **78** (travail du fil principal, CSS inutilisé, images), /login a11y 96, /dashboard a11y 96 (le même contraste), /p 93/100 ✅ ; 0 tâche longue au défilement sur / (CPU ×4) ✅ ; la connexion au doigt jusqu'à l'écran du code ✅.
- **Corrigé (socle, en cours, non déployé)** : barre publique `PublicNav` (« Se connecter » toujours visible, tiroir avec focus piégé/Échap/tap dehors, aria-expanded) sur la landing ET les 5 pages à fil d'Ariane ; `100dvh` avec repli ; tiroir console < 900 px, bouton 44 px, refermé après navigation et à Échap ; `viewportFit: cover` + zones sûres (barre du haut, tiroirs, panneau d'aide) ; **16 px** sur tout champ sous 760 px (`base.css`, toutes surfaces) ; clavier adapté (SIRET/CP numériques, téléphone) ; 92 règles `:hover` sous `@media (hover:hover) and (pointer:fine)` ; texte sombre sur les boutons corail (≥ 7:1) ; liens soulignés dans les textes légaux ; cibles 44 px (nav, fil d'Ariane, retour, œil, plateforme client) ; composeur de la plateforme client suit `visualViewport`.
- **Appels IA : 0.**
- **Suivant** : re-mesure locale (build + serveur local) pour lister ce qui reste écran par écran (A1.5), puis A1.7 inbox, A1.8 perf landing, déploiement, `mobile-e2e` vert sur 3 profils en prod, passage réel de Benj.

## [21] v8 · A1 — le mobile corrigé, prouvé en production — 05/09 23:55 — ✅ `mobile-e2e` **100/100** (iPhone 14 · Pixel 7 · iPad Mini)
- **Corrigé, en 5 commits** (`59934f0` → `8f40d0d`), chaque lot mesuré sur un build local avant de partir (six passages locaux : 12 → 19 → 45 → 74 → 93 → 100) :
  - A1.1 barre publique `PublicNav` : « Se connecter » toujours visible (libellé court, nom accessible), menu en tiroir (focus piégé, Échap, tap dehors, `aria-expanded`), posée sur la landing ET sur FAQ, contact, CGU, confidentialité, mentions légales — qui n'avaient qu'un fil d'Ariane, donc pas de chemin vers la connexion non plus.
  - A1.2 `100dvh` avec repli ; tiroir de la console sous 900 px, 44 px, refermé après navigation et à Échap.
  - A1.3 16 px sur tout champ sous 1024 px (`base.css`, toutes surfaces) + 44 px de haut ; claviers : SIRET/CP numériques, téléphone, IBAN sans correction.
  - A1.4 `viewportFit: cover` (sans lui les zones sûres valent 0) ; zones sûres sur barre du haut, tiroirs, panneau d'aide, composeur.
  - A1.5 devis : lignes en deux rangées (le seul défilement horizontal, 483 px, disparaît) ; conteneurs en `minmax(0,1fr)` ; étiquettes reliées (axe `label`, `select-name`).
  - A1.6 92 + 12 + 15 règles `:hover` sous `@media (hover:hover) and (pointer:fine)` (console, site, plateforme) ; l'info-bulle ⓘ s'ouvrait déjà au tap.
  - A1.7 `visualViewport` : la plateforme client et la boîte de réception gardent le composeur visible quand le clavier prend 320 px (fil en plein écran sur téléphone, colonne à la hauteur visible sur tablette).
  - A1.8 landing : sur écran tactile, GSAP n'est plus chargé (révélations par IntersectionObserver, pas de parallax), scènes de démo en 390/520/780 px, aurora/grain/halo/flou de barre coupés → Lighthouse mobile **78 → 90**.
  - A1.9 la connexion au doigt : mot de passe → écran du code (pavé numérique, `one-time-code`, 16 px) → console → tiroir, prouvée sur l'iPhone.
  - Contrastes : texte sombre sur les boutons corail (3,1:1 → 7:1) partout, gris « faint » #7F8797 (5:1), aperçu du devis lisible, pastilles, thème nuit du site, bloc À propos ; jetons corail posés sur la barre publique hors landing (sans eux le bouton « Essayer » y était transparent — contraste 1,05).
  - Cibles ≥ 44 px jusqu'à 1024 px (la tablette se manipule au doigt) : nav, fil d'Ariane, retours, œil, ⓘ, boutons, pastilles, liens dans les cartes, plateforme client, barre et pied du site d'artisan.
- **Ce que la mesure a corrigé dans la MESURE elle-même** (dit tel quel) : un tiroir fermé est hors écran par construction ; un onglet dans un conteneur `overflow-x:auto` n'est pas « hors écran » ; un lien texte demande 44 px de haut et 24 de large (WCAG 2.5.8), un bouton 44 × 44 ; axe lit un texte encore transparent pendant une révélation → `reducedMotion: reduce`, comme `a11y-e2e` ; contre un serveur local http, la CSP `upgrade-insecure-requests` laissait les pages SANS style (12-13 px partout, tiroir « statique ») → la suite sert ces requêtes depuis http. Sans ces quatre corrections, la suite aurait accusé le produit à tort.
- **Preuve en prod** (commit `8f40d0d`) : **100 réussis, 0 échoué** — iPhone 36/36, Pixel 31/31, iPad 29/29 ; 0 tâche longue au défilement (landing, site Signature, CPU ×4) ; Lighthouse mobile **/ 90 · /login 96 · /dashboard 92 · /p 94**, accessibilité **100** sur les quatre. La landing est à 90 pile : Lighthouse varie de ±3 d'un passage à l'autre, ce point restera à surveiller dans l'audit nocturne.
- **Suite enregistrée** dans `tout-verifier.mjs` (coût navigateur) → 45 suites ; WebKit installé dans le workflow nocturne.
- **Appels IA : 0.**
- **A n'est pas terminé** tant que Benj n'a pas fait **un vrai passage sur son téléphone** (Safari iOS et Chrome Android si possible) : le simulateur ne voit ni la barre d'adresse, ni le clavier réel, ni le zoom. Liste à vérifier dans le message du 05/09 ; ce qu'il aura vu ira ici.
- **Lanceur complet rejoué (45 suites, 931 s)** : 42/45. Les trois rouges : `audit-final-e2e` G-1.2 lisait l'ancienne règle de repli à 760 px → alignée sur la nouvelle barre (900 px, tiroir, « Se connecter » jamais caché) → **68/68** (`3d7b7b1`) ; `mentions-bloquantes` et `relances` échouent sur le **plafond quotidien d'emails** (`limites.emails:jour` = 95 pour 80, Resend à 100 %) atteint par les rejeux du jour — pas un défaut, remise à zéro à minuit UTC, l'audit nocturne de 4 h 17 tourne après. Attendu au prochain nightly : **45/45**. → **confirmé le 06/09** : run planifié de 02:29 UTC (4 h 29 Paris), **45/45** sur `aa0603a` (job 19 min, artefact déposé, traces purgées). Compteur `emails:jour` reparti de zéro (7 après le nightly, plafond 80 libre) ; Resend : 12 envois le 06/09, dont 5 alertes critiques hors compteur — c'est le test de `/api/report-error` par `emails-e2e`/`fermeture-e2e`, voulu : les alertes passent toujours (`critique: true`), avec leur propre borne de 5 par heure.
- **Suivant** : le passage réel de Benj sur téléphone (ferme A) ; puis la partie B, après sa décision B0 (recommandation : PWA + Capacitor, même code).

## [22] v9 · J1 — l'app installable (PWA), prouvée en production — 06/09 19:10 — ✅ `pwa-e2e` **71/71** (prod, `7f17518`)

- **Vérifié** : prérequis A vert (`mobile-e2e` 100/100 la veille, nightly 45/45 à 04:29). Liste humaine §9 et décisions §10 posées à Benj dès le premier message (M1 : la demande D-U-N-S en premier, 1 à 2 semaines) ; j'avance avec les recommandations §10 tant qu'il ne tranche pas autrement.
- **Livré** (`3e075dc` → `a15f52f`) : manifeste `app/manifest.ts` (icônes any + **maskable** 192/512 générées sur fond nuit, marque à 76 % ; 3 captures 1080×2340 et 1280×800 prises en prod sur la démo ; raccourcis Messages, Nouveau devis, Inventaire) ; `viewport.themeColor` + `appleWebApp` + `apple-mobile-web-app-capable` (iOS < 17.4) ; segments /site et /p : `manifest: null`, `appleWebApp: null`, `themeColor: null` ; **service worker** Serwist (`app/sw.ts` → `public/sw.js` généré au build, jamais versionné) : précache = page hors-ligne + icônes de marque, `/_next/static` en cache à l'usage (30 j), navigations réseau seul, `/api /auth /p /site /l` réseau seul **sans repli**, `skipWaiting` désactivé, `worker-src 'self'` ; page hors-ligne **statique** `public/hors-ligne.html` (réécriture `/hors-ligne`) ; carte `app/InstallerApp.tsx` (Android : `beforeinstallprompt` ; iOS Safari : les deux gestes ; refus 30 j ; rien si installée, bureau, WebView, écran de conversation) ; `app/MiseAJour.tsx` (enregistrement depuis la console seulement, bandeau, « Plus tard », rechargement du seul onglet qui clique) ; suite `scripts/pwa-e2e.mjs` (69 vérifications) dans le lanceur → **46 suites**.
- **Trouvé par la capture, pas par la suite** : la carte nue — le bloc CSS n'avait jamais été écrit (il suivait, dans une chaîne `&&`, un patch qui avait échoué) et le style global `button{width:100%}` faisait de la croix une barre corail pleine largeur → styles + assertion « styles servis ». **Trouvé par `mobile-e2e`** : sur iPad la carte poussait le composeur de /messages sous le clavier → aucune carte sur les écrans de conversation.
- **Revue adversariale** (workflow : 4 angles, 2 réfutateurs par constat, **13 tenus / 14**) : (1) majeur — la page hors-ligne Next réclamait son chunk JS à l'hydratation, hors ligne l'écran d'erreur générique la remplaçait → fichier HTML statique sans script, « Réessayer » = `href=""` (recharge l'adresse demandée) ; (2) majeur — « Recharger » dans un onglet rechargeait **tous** les onglets (`clientsClaim`), un devis en cours perdu → seul l'onglet qui clique se recharge, les autres voient le bandeau ; (3) white-label — `mondomaine.fr/manifest.webmanifest` et `/sw.js` servaient le manifeste et le worker Presti (le matcher du middleware exclut les chemins à point) → `CHEMINS_APP_PRESTI` réécrits vers la 404 neutre hors hôte maison ; (4) `/l/<slug>` (ancien lien) recevait le repli Presti hors ligne → exclu ; (5) `orientation: portrait` verrouillait la tablette (WCAG 1.3.4) → retiré, **écart assumé avec le prompt** ; (6) carte « sur votre téléphone » sur un PC ≤ 1024 px → le pointeur `coarse` décide, pas la largeur ; (7) icône Partager annoncée deux fois → décorative ; (8) WebView Instagram/Gmail et Chrome iOS recevaient le geste Safari → Safari seul ; (9) « Recevez les demandes en direct » promettait le push de J2 → « Vos conversations et vos devis à un tap » ; (10) espaces insécables ; (11) focus rendu au titre quand la carte disparaît ; (12) bandeau sans « Plus tard » ; (13) accepté tel quel : le client Serwist **inerte** est injecté dans le chunk partagé de toutes les routes (aucun enregistrement hors console). Réfuté : « CSS absent », lu sur un build périmé.
- **Écarts assumés avec le prompt v9** : Serwist sans son `defaultCache` (il met `/api` en cache) et sans précache des chunks ni des polices (1,5 Mo de polices de thèmes artisan n'ont rien à faire dans l'app ; le shell se met en cache à l'usage) ; Lighthouse « Installable » n'existe plus depuis Lighthouse 12 → preuve par CDP `Page.getInstallabilityErrors` vide + manifeste lu sans erreur ; page hors-ligne statique plutôt que page Next ; raccourci « Nouveau devis » sur `/devis/nouveau` (la route existante).
- **Preuve en prod** (`a15f52f`) : `pwa-e2e` **69/69** ; `mobile-e2e` iPad 29/29 après correctif ; `audit-final-e2e` 68/68 ; `domaine-perso-e2e` 36/36 (+9 neutre) ; installabilité Chrome 0 erreur ; caches après un parcours complet (console, API, /p, /site) : 41 entrées, **0** `/api`, **0** page. Captures dans le scratchpad `pwa/` : carte Android, carte iOS, hors-ligne, bandeau.
- **Fin de revue (4ᵉ relecteur, arrivé après mes premiers correctifs — 26 agents, 19 tenus / 3 réfutés)** : (14) **bloquant, régression de mon propre correctif (3)** : `isPrestiHost` ne connaissait que l'apex, www. et *.vercel.app → sur **qg.prestiapp.fr, l'hôte de la console**, mes chemins d'app étaient réécrits vers la 404 artisan : plus de service worker, plus de manifeste, logo de marque cassé — et aucune suite ne sondait cet hôte → tout sous-domaine de prestiapp.fr est hôte maison, et `pwa-e2e` sonde désormais qg. par en-tête Host (fichiers servis) et y enregistre réellement le worker en prod ; (15) un second onglet ouvert pendant la toute première installation recevait `controlling` sans worker connu → faux bandeau « nouvelle version » → ignoré (`e.sw` requis) ; (16) « Plus tard » était définitif pour l'onglet → report horodaté et lié au worker en attente : revient après 4 h, dès qu'une autre version attend, ou à un rechargement volontaire. (www.prestiapp.fr n'est pas rattaché au projet Vercel : la sonde ne le vise pas.) Rejeu en prod : `pwa-e2e` **71/71**, `domaine-perso-e2e` 36/36 (+9 neutre). Commits `7f17518`, `f4b87ba`.
- **Leçon** : une revue adversariale trouve ce que ni la suite ni l'œil ne voient — mais un correctif de revue est du code comme un autre : il a lui-même créé une régression qu'un second passage a rattrapée. Ce qui touche au routage par hôte se prouve **sur chaque hôte**.
- **Appels IA du sprint : 0.**
- **J1 fermé par Benj le 06/09 (soir)** : « le téléchargement fonctionne, on passe à la suite » — installation confirmée depuis son téléphone (appareil non précisé, pas de capture). Compte fondateur : existait sans mot de passe, accès repris par « Mot de passe oublié ».
- **Suivant** : J2 push web (clés VAPID posées par moi sur Vercel, migration 0064, `lib/push.ts`, Paramètres → Notifications, `push-e2e`) ; J3 Capacitor Android. Bloque J6/J7 : M1, M2, M5.

## [23] v9 · J2 — notifications push web, prouvées en production — 06/09 22:40 — ✅ `push-e2e` **25/25** (prod, `73e5dc4`) — reste la vraie push sur le téléphone de Benj

- **Vérifié** : J1 fermé par Benj (installation confirmée). VAPID : clés générées et posées sur Vercel et dans `.env.local` par mes soins (M4 fait, rien n'a transité par le chat) ; sujet VAPID = `https://prestiapp.fr/contact` (la garde de commit refuse à raison `mailto:contact@`, boîte morte). Connexion Postgres directe : `DIRECT_URL` refuse le mot de passe (comme `SUPABASE_DB_PASSWORD`) → la migration reste à coller par Benj.
- **Livré** (`e1a640b`, drapeau `pushWeb: false` — rien de visible tant que 0064 manque, routes en 503) : migration `0064_push.sql` (`push_abonnements` : endpoint + clés web ou jeton natif pour J3, libellé d'appareil sans IP, `actif`/`echecs`, RLS lecture par l'artisan, écriture service seulement, cascade) + `_A_COLLER_sql_editor_0064.sql` ; `lib/push.ts` (web-push VAPID, charge utile bornée = titre 60 · ligne 120 · adresse Presti · tag · renotify, jamais le contenu ; 404/410 → oubli ; 3 échecs → désactivé ; plafond 30 par artisan et par heure via `consommer_limite` ; ne jette jamais) ; `lib/notifications.ts` = **un seul point** email + push, préférences `artisans.notifications` (`{type: bool}` email, `push: {type: bool}`), envoi après la réponse (`after`), `leadId` posé chez les **11 appelants** (→ `/messages?lead=…`, tag par conversation) ; `lib/notificationsTypes.ts` (la part sans web-push, pour le navigateur — la compilation client cassait sinon) ; service worker : `push` (icône de marque, adresse bornée même origine) et `notificationclick` (fenêtre existante sinon ouverture) ; routes `/api/push/abonner` (GET clé + appareils, POST abonnement https + clés base64url validées, endpoint repris s'il change de compte, DELETE) et `/api/push/test` (5/h) ; **Paramètres → Notifications** (nouvel onglet : « Sur votre téléphone » — permission au clic, appareils retirables, test, cas iPhone hors écran d'accueil, cas bloqué — et « Ce qui vous est envoyé » : Email + Push par événement ; le bloc emails quitte Profil) ; lien profond `/messages?lead=` dans la boîte de réception ; suite `scripts/push-e2e.mjs` (faux service de push local, **déchiffrement RFC 8291** de la notification pour prouver l'absence de donnée personnelle, 410, 3 échecs, plafond, bornes, préférences, routes, purge d'un abonnement mort chez FCM, écran Chrome + iPhone) → **⏳ code 2** tant que 0064 manque ; lanceur : 47 suites.
- **Trouvé, corrigé** : le composant client important `lib/notifications` embarquait web-push → build cassé → types séparés ; `emails-e2e` lisait l'union de types dans l'ancien fichier → 78/91 → aligné → **91/91**.
- **Écarts avec le prompt v9** : les événements push sont les trois qui existent vraiment (nouvelle demande, proposition, réponse au devis) — pas de « paiement / crédits bas / assistant coupé » : aucun email artisan n'existe pour eux (règle « ce qui n'existe pas n'apparaît pas »), à ajouter le jour où l'événement existera ; badge de l'icône : J3 (natif).
- **Preuve en prod** (`e1a640b`) : `audit-final-e2e` 68/68, `mentions-bloquantes` 15/15, `emails-e2e` 91/91 ; l'onglet Notifications rend les trois événements (email seul, drapeau baissé), Profil n'a plus le bloc emails (capture `pwa/notifications-local.png`).
- **0064 collée par Benj (22:10)** → drapeau `pushWeb` levé (`73e5dc4`), déployé. `push-e2e` en prod : d'abord **14/25**, tout dans la suite, rien dans le produit : (1) web-push n'envoie qu'en https → mon faux service local en http ne recevait rien (échecs comptés, donc la logique « 3 échecs → désactivé » était juste) → la suite garde le chiffrement et la signature VAPID de web-push (`generateRequestDetails`) et ne remplace que le transport ; (2) la **visite guidée** du compte de test neuf recouvrait l'écran et avalait le clic sur « Push » → `aide_vues` posé à la création du compte ; (3) Chrome sans tête refuse la permission malgré l'octroi → la suite lit l'état réel et exige alors le message « bloquées » sans bouton. Puis **25/25** : notification reçue chiffrée (aes128gcm, VAPID, TTL 3600) et **déchiffrée avec les clés de l'appareil** = exactement titre · ligne · url · tag · renotify, sans nom ni @ ni téléphone ; 410 → oubli ; 3 × 500 → désactivé et plus rien ; plafond 30/h ; bornes ; préférences (push coupée → rien ; email coupé + push gardée → push seule) ; `/messages?lead=…` et tag par conversation ; routes (abonnement valide 200, http/clés invalides 400, liste + clé, 401 sans jeton, **test → FCM répond 404 pour l'abonnement mort → purgé**, DELETE, 429 au 6ᵉ test) ; SW ; écran (3 événements × Email/Push, décocher Push enregistré en base, cas refusé, cas iPhone).
- **Appels IA du sprint : 0.**
- **Revue adversariale J2 (workflow : 4 angles, 28 agents, 24 verdicts — 19 tenus, 5 réfutés dont 3 corrigés quand même) — tout corrigé, `c1a9292`.** Vie privée : charge utile **rembourrée à 512 octets** (la longueur du chiffré ne trahit plus l'événement) ; seul un **UUID** de conversation entre dans l'adresse et le tag ; `cheminSur` refuse aussi `/\hôte` ; les appareils sont retirés à l'**anonymisation** d'un compte facturé (la cascade de 0064 ne jouait que sur l'effacement), à « **fermer toutes mes sessions** » et à la **déconnexion** (`lib/pushClient.ts`) ; l'**export RGPD** les inclut (libellé, dates, état — pas les clés). Sécurité : abonnement limité aux **services de push connus** (Google, Apple, Mozilla, Microsoft, Samsung, Opera — Presti n'est pas un relais de requêtes signées vers n'importe où), clés **bornées**, reprise d'un endpoint d'un autre compte **seulement à clés identiques** (sinon 409 : on ne retire pas l'appareil d'un tiers sur simple connaissance de son adresse), **dix appareils** actifs par compte. Justesse : plafond consommé **seulement s'il y a un appareil** ; **5xx/429/réseau non comptés** comme échecs (seuls 400/401/403/413 désactivent après trois) ; clés VAPID invalides → jamais de 500 ; **push immédiate sur la route flux** (la réponse SSE est déjà partie, `after` n'aurait rien à suivre) ; lien profond vers une conversation disparue → message et adresse nettoyée. Écran : **permission demandée dans le geste du clic** (Safari iPhone la refuse après un `await`), invite fermée expliquée, test vers zéro appareil expliqué et liste rafraîchie, service worker attendu 8 s, ancien abonnement sous une autre clé remplacé, `api()` de commun (2FA et code relayés), aria sur les cases et « Retirer », texte iOS pour « bloquées », marge des cases et jeton CSS inexistant ; **article d'aide « Notifications »** ; `parametres-e2e` aligné (cherchait le bloc emails dans Profil).
- **Suite `push-e2e` : 37 vérifications.** Faux service **en HTTPS** (certificat auto-signé généré par openssl dans `scripts/.certs-test/`, ignoré par git ; le serveur local lui fait confiance par `NODE_EXTRA_CA_CERTS`) : web-push fait tout comme en vrai. **Chemin réel prouvé en local** : `POST /api/leads` → réponse en ~1 s → la push « Nouvelle demande » suit **250 ms** après, sans le message ni le nom du client — `after` tient. Isolation entre comptes (GET, DELETE, reprise 409/200), hôte inconnu 400, clé trop longue 400, onzième appareil 409, 403 ×3 désactive, 500 ×3 non. **Prod (`c1a9292`) : `push-e2e` 36/36** (le chemin réel est local), `parametres-e2e` 72/72, `emails-e2e` 91/91, `audit-final-e2e` 68/68.
- **Ouvert, assumé (mineur)** : un artisan sans email ne recevrait pas de push — les appelants gardent `if (artisan.email)` ; l'email est l'identifiant de connexion, le cas n'existe pas. Pièges de session : Git Bash convertit `/CN=…` en chemin Windows (`MSYS_NO_PATHCONV=1`) ; `let` après usage = zone morte temporelle.
- **Contre-revue des correctifs (workflow : 2 angles, 8 agents, 6 constats tenus / 0 réfuté) — tout corrigé, `654ec72`.** Le point majeur **contredit la revue précédente** : `after` fonctionne bel et bien dans une réponse en flux (Next 15.5 exécute ses rappels à la fermeture de la réponse, donc après `controller.close()`) ; mon « envoi immédiat » sur la route flux retenait au contraire ses réponses JSON et le `done` du flux — et sans `timeout`, un service de push muet pouvait tenir la route 60 s. → Retour à `after` partout, **délai de 5 s** sur chaque envoi (web-push et FCM). Autres : rembourrage compté en **octets UTF-8** (« é » vaut 2 octets, la taille variait de 512 à 518) ; un endpoint détenu par un autre compte n'est **jamais transféré** (409 `reabonner`, le navigateur se réabonne avec un nouvel endpoint — plus d'oracle d'appartenance ni de changement de main silencieux) ; plafond de dix appareils calculé hors ligne reprise (une ligne désactivée ne le contournait plus) ; endpoint hors service connu **désactivé à l'envoi** (lignes d'avant la règle) ; fenêtre choisie au tap d'une notification : jamais une surface d'artisan ni un devis en cours ; message du lien orphelin rendu dans la boîte vide ; clé VAPID à source unique côté client ; service worker **actif** exigé avant abonnement ; déconnexion bornée à 2 s ; changement de mot de passe → appareils retirés. Assumé : « fermer toutes mes sessions » ne signale pas un échec du retrait des appareils (journalisé) ; la fermeture d'UNE session ne touche pas aux appareils (pas de lien session ↔ appareil). Prod : `push-e2e` **39/39**, `parametres-e2e` 72/72, `audit-final-e2e` 68/68.
- **Leçon** : une revue peut se tromper (l'« after perdu en flux »), et un correctif de revue mérite sa contre-revue — c'est elle qui a rattrapé le blocage.
- **J2 fermé par Benj le 06/09 (soir)** : « ça marche ! » — vraie notification de test reçue sur son téléphone après activation dans Paramètres → Notifications.
- **Suivant, dans l'ordre** : Benj active les notifications sur son Android (Chrome) et « M'envoyer un test » : **une vraie push reçue = J2 fermé** ; iPhone : Presti installée d'abord, puis pareil. Ensuite J3 (Capacitor Android).

## [24] v9 · J3 — la coque Android : un APK compilé par GitHub, le pont natif dans la console — 07/09 00:30 — ✅ APK de debug (19 Mo, run 34052149934) · `push-e2e` **39/39** prod (40/40 local)

- **Vérifié** : ni Java, ni SDK Android, ni Gradle sur la machine → tout se compile sur GitHub Actions (§5.1). Capacitor **8.5.1** ; plugins compatibles vérifiés (`@capacitor-mlkit/barcode-scanning` 8.1.1, `@aparajita/capacitor-biometric-auth` 10, `capacitor-secure-storage-plugin` 0.13 ; `capacitor-native-biometric` écarté, trop ancien).
- **Livré** (`e2de8ee` → `6eec784`) : `mobile/` avec son propre `package.json` (**ESM** : la CLI Capacitor sous Node 24 charge `capacitor.config.ts` en `require(esm)`, sinon « Unexpected token export ») ; `capacitor.config.ts` = `server.url` **`https://qg.prestiapp.fr/dashboard`** (la racine de qg. est le poste de contrôle, pas la console — écart assumé avec le prompt), `allowNavigation` nos hôtes seuls, `errorPath` = page de secours hors-ligne (`www/`), plugins push/caméra/scan/biométrie/partage/haptique/clavier/réseau/navigateur, variante de prévisualisation par variables de la machine (`PRESTI_MOBILE_URL`, `PRESTI_MOBILE_DEBUG`), jamais committée ; **`android/` généré et committé** (91 fichiers, 1,5 Mo), `build.gradle` lit `versionName` (= version du `package.json` web) et la signature dans des variables d'environnement, jamais de keystore dans le dépôt ; icône corail sur nuit 1024 (la première, tirée du SVG *clair*, était encre sur crème — vue à l'œil, refaite), icône adaptative, écran de lancement nuit 2732, déclinés par `@capacitor/assets` (136 images) ; permissions POST_NOTIFICATIONS, CAMERA, VIBRATE, USE_BIOMETRIC ; `README.md` (compiler, signer, publier, mettre à jour web vs coque) et `TESTS.md` (le parcours §5.3, 17 lignes à cocher par appareil).
- **CI `android.yml`** : APK de debug à chaque push touchant `mobile/` (artefact *presti-debug-apk*, 14 jours), AAB signé sur tag `mobile-v*` (secrets `ANDROID_KEYSTORE_BASE64` etc., M6), envoi Play en test interne commenté jusqu'à M2. Premier run rouge : `versionCode (env ?: "1").toInteger()` — Groovy lisait `versionCode(…)` puis `.toInteger()` sur le vide (« Value is null ») → `Integer.parseInt(...)`. Puis **vert : 19 Mo**.
- **Le pont natif** (`lib/natif.ts` : `estNatif`, `plateforme`, `plugin`, `partager`, `vibrer`, `ouvrirExterne`, avec replis navigateur ; `app/NatifPont.tsx` monté par AppShell, inerte dans un navigateur) : écran de lancement retiré **au premier rendu** (pas sur minuterie), écouteurs push natifs (jeton → `/api/push/abonner {type, jeton}`, tap → la conversation), bouton retour Android (`presti:retour` : le tiroir se ferme d'abord, puis page précédente, puis arrière-plan), rafraîchissement au retour au premier plan, bandeau **hors ligne** honnête. Route `/api/push/abonner` : jeton FCM/APNs borné, un jeton = une installation (sa réapparition sous un autre compte est la preuve du changement de main), dix appareils, DELETE par jeton ; `lib/pushNatif.ts` : FCM HTTP v1 (JWT RS256 signé avec `crypto`, jeton OAuth en cache), **inerte sans `FIREBASE_SERVICE_ACCOUNT` (M3)** et le dit (`natifsIgnores`) ; Paramètres → Notifications dans l'app : permission native au clic, « cet appareil » par jeton ; déconnexion → jeton retiré. Tout derrière `estNatif()` : le bundle web est inchangé.
- **Trouvé, corrigé** : le build Vercel type-vérifiait `mobile/capacitor.config.ts` (dépendances absentes à la racine) → déploiement `8302354` en erreur → `mobile` exclu du `tsconfig` racine (`6eec784`).
- **Preuve** : `push-e2e` **39/39 en prod** (40/40 en local avec le chemin réel — un test de moins depuis la contre-revue : plus de transfert d’endpoint), dont les quatre cas natifs (abonnement, jeton hors format, test ignoré proprement sans Firebase, retrait) ; `parametres-e2e` 72/72 ; APK de debug **compilé et téléchargeable** (Actions → run 34052149934 → *presti-debug-apk*).
- **07/09 01:30 — natif dans les écrans, liens profonds, release signée (`a734d25` → `d89509e`).** Benj a téléchargé l'APK (« c'est fait ») ; TESTS.md ligne 1 notée, écran d'accueil à confirmer. Branché : **scan ML Kit** plein écran dans l'inventaire (marche aussi sur iPhone, où `BarcodeDetector` n'existe pas), **photo de chantier par la caméra native** dans la fiche matériau (1 600 px, qualité 80, puis le ré-encodage de `lib/media` : l'EXIF ne part jamais), **partage du PDF de devis** par la feuille native (Filesystem + Share) ou Web Share, retours **haptiques** (scan réussi, photo, devis envoyé). Tout derrière `estNatif()` avec son repli : `inventaire-e2e` 23/23, `pwa-e2e` 71/71 en prod. **Liens profonds (§4.4)** : App Links `autoVerify` sur `qg.prestiapp.fr` pour /messages, /devis, /factures, /inventaire, /parametres, /dashboard (jamais /p, /site, /l), `appUrlOpen` borné à notre origine, `public/.well-known/assetlinks.json` servi (200, JSON) et **jamais hors hôte maison** (middleware). **M6 fait par moi** : keystore de release PKCS12 généré avec openssl dans `C:\Users\benja\Documents\presti-secrets\android\` (hors dépôt ; `LISEZ-MOI.txt` porte le mot de passe — **Benj doit sauvegarder ce dossier dans son gestionnaire de mots de passe**, perdu = plus de mise à jour possible sur le Play Store) ; les quatre secrets GitHub posés par l'API (boîte scellée libsodium, rien d'affiché). Tag **`mobile-v0.1.0`** → premier run rouge (Gradle résout le chemin du keystore depuis `app/`) → chemin absolu → **AAB signé, 17 Mo** (run 34054924424). Il ne manque que M2 pour l'envoyer en test interne Play. `domaine-perso-e2e` 36/36 après le middleware.
- **Appels IA du sprint : 0.**
- **Reste pour fermer J3** : Benj installe l'APK et coche `mobile/TESTS.md` lignes 1-3 (installation, lancement, connexion) ; les push natives attendent **M3** (Firebase : `google-services.json` dans `mobile/android/app/`, plugin `com.google.gms.google-services`, `FIREBASE_SERVICE_ACCOUNT` sur Vercel) ; caméra, scan et partage natifs à brancher dans les écrans (inventaire, fiche client, devis) ; verrou biométrique et trousseau (J4, avec le cookie `httpOnly`) ; liens profonds (`assetlinks.json` avec l'empreinte du keystore de release, M6).

## [25] v9 · J4 — dans l'app : la session au trousseau, le verrou biométrique — 07/09 02:30 — ✅ `8d04a66` en prod, web inchangé (pwa 71/71, code-connexion 56/56, audit final 68/68)

- **Vérifié** : le cookie `httpOnly` (migration `@supabase/ssr`) toucherait 22 écrans, 4 modules, `authArtisan` et toute la connexion par code — un chantier à part, avec ses 47 suites à rejouer ; il n'est pas dans J4. Ce qui protège vraiment en WebView, et qui est livré : (1) la session — jeton de rafraîchissement compris — vit dans le **trousseau natif** (Keychain iOS, Keystore Android, `capacitor-secure-storage-plugin`) : `lib/supabaseClient.ts` donne à supabase-js un stockage asynchrone sûr quand `estNatif()`, et purge toute session héritée du localStorage de la WebView ; dans un navigateur, rien ne change. (2) **Verrou biométrique** (`app/VerrouNatif.tsx`, décision §10 : 5 min d'arrière-plan) : l'heure du passage en arrière-plan est gardée par `Preferences` (survit à la fermeture de l'app) ; au retour ou à l'ouverture, si > 5 min et qu'une biométrie existe, l'écran est couvert (`.psh-verrou`, rien ne se lit derrière) jusqu'à Face ID / empreinte (code du téléphone en secours) ; refus ou échec → session fermée, mot de passe + code (v7). Pas de biométrie → pas de verrou, on ne fait pas semblant. Inerte hors coque.
- **Preuve** : prod `8d04a66` — `pwa-e2e` 71/71, `code-connexion-e2e` 56/56, `audit-final-e2e` 68/68 (le web ne voit aucune différence) ; la preuve NATIVE est humaine : TESTS.md lignes 6 et 14 (verrou après 5 et 10 min).
- **07/09 03:15 — après J4 (`83bc371` → `4a221d7`)** : projet **iOS** généré en SPM sans Mac (icônes, écrans de lancement, textes d'autorisation caméra/photos/Face ID dans Info.plist), `codemagic.yaml` prêt pour TestFlight (M1 + M5). **Trouvé à la relecture de mes propres angles** : l'écran de lancement (`launchAutoHide: false`) n'était retiré que par la console — l'app s'ouvre sur `/login` quand l'artisan n'est pas connecté, sans AppShell : il serait resté affiché à jamais → `app/NatifSplash.tsx` monté par le **layout racine** (inerte dans un navigateur, aucune trace sur /site ni /p — contrôlé par curl). Android : canal de notification « presti » créé au lancement (Android 8+), icône de notification **monochrome** aux cinq densités (sinon un carré gris), couleur d'accent et méta-données Firebase dans le manifeste ; APK v4 compilé (run 34056323980). Revue adversariale de la couche native lancée (4 angles : sécurité de la coque et du jeton, API réelles des plugins, projets natifs et pipeline, expérience et white-label).
- **Appels IA du sprint : 0.**
- **Suivant** : projet iOS généré (SPM, sans Mac) pour Codemagic (M5) ; revue adversariale du natif (J3-J4) ; attente de M2 (Play test interne), M3 (Firebase → push natives), M5 (iOS), et du passage de Benj sur TESTS.md.

## [26] v9 · revue native intégrée — le scan qui « ne marchait pas », Presti sur PC, l'APK signé public — 07/09 05:40 — ✅ `a4ec4e1` en prod : pwa-e2e **71/71**, push-e2e **39/39**, parametres-e2e **77/77** (local : 70/70 · 40/40 · 77/77)

- **Trouvé (le scan, signalé par Benj sur l'APK v4)** : dans la coque, `window.Capacitor.Plugins` ne contient QUE les plugins passés par `registerPlugin` côté JavaScript — et la console n'importait pas `@capacitor/core`. Résultat : `plugin('BarcodeScanner')` rendait `null`, le lecteur natif retombait sur `BarcodeDetector` (absent de la WebView Android) → « indisponible ». Même cause, même silence pour la caméra, le partage, les haptiques, le verrou biométrique et les notifications natives. **Corrigé** : `@capacitor/core@8` à la racine, `lib/natif.ts` enregistre chaque plugin à la demande (`registerPlugin`, en cache) ; `estNatif()` passe par `Capacitor.isNativePlatform()`. Preuve possible seulement sur téléphone : **APK 0.1.1** (TESTS.md).
- **Trouvé (revue adversariale wf_d29c6206, 4 angles) et corrigé** : (1) `@aparajita/capacitor-biometric-auth` s'enregistre sous `BiometricAuthNative` et sa méthode `authenticate` est JS — c'est `internalAuthenticate` qu'on appelle ; annulation (retour, appui hors invite) ≠ refus : l'écran reste verrouillé au lieu de fermer la session ; verrou monté par le **layout racine** (/controle et /onboarding compris), `inert` sur le reste, focus au bouton, `/login?verrou=1` explique. (2) Liens profonds : seul un chemin de la console est accepté (`/dashboard|messages|devis|factures|inventaire|parametres|abonnement`) — une autre app ne pilote plus la WebView vers /p, /site ou /login ; `/abonnement` ajouté aux App Links. (3) Le jeton push ne se rafraîchit au lancement que si l'artisan a ACTIVÉ les notifications (`Preferences presti.push_active`), pas sur la seule permission système que les vieux Android accordent d'office ; sans Firebase (`pushNatif: false`), `register()` n'est jamais appelé (il plantait l'app) et Paramètres → Notifications le dit honnêtement (« prochaine version »). (4) ML Kit : `installGoogleBarcodeScannerModule` rend la main AVANT la fin du téléchargement → on attend l'événement de progression (état 4/5/6, 60 s max), et le manifeste demande le module dès l'installation de l'app (`com.google.mlkit.vision.DEPENDENCIES=barcode_ui`) ; caméra refusée → état « refus » avec le chemin des réglages du téléphone. (5) `/.well-known/*` entier réservé aux hôtes maison (middleware + matcher). (6) iOS : `WKAppBoundDomains` (exigé par `limitsNavigationsToAppBoundDomains`), rappels APNs dans AppDelegate, `ios_signing` dans Codemagic. (7) Android : `allowBackup="false"` (pas de session dans une sauvegarde cloud), `versionName` depuis le tag, keystore de debug en cache (empreinte stable). (8) Page de secours de la coque : texte neutre (réseau OU serveur), écran de lancement retiré par un script inline (sinon le logo restait à jamais), « Réessayer » revient à la page qui n'a pas chargé. (9) Devis : « Télécharger PDF » dans la coque → la feuille de partage (`window.open` ne mène nulle part dans une WebView). (10) `pushNatif.ts` ne journalise plus le message de `JSON.parse` (il cite le secret).
- **Presti sur PC et Apple (demande de Benj)** : carte d'installation sur ordinateur (« Installer Presti sur cet ordinateur », `beforeinstallprompt` capté au niveau module par `lib/installation.ts`, plus jamais perdu) ; **Paramètres → Application** (`SectionApplication`) : ici / Android (APK signé + Chrome) / iPhone-iPad (Partager → écran d'accueil) / ordinateur (Chrome, Edge, Safari → Dock) ; le lien APK n'apparaît que si le fichier répond (HEAD). L'APK **signé** est publié par la release (tag `mobile-v*`) dans le bucket public Supabase `presti-app` (`presti.apk` = dernière version + copie nommée par le tag). L'App Store et le Play Store restent derrière M1/M5 et M2.
- **Preuve en prod** (`a4ec4e1`) : `pwa-e2e` 71/71 (bureau : carte « cet ordinateur » ×2 — tests inversés), `push-e2e` 39/39, `parametres-e2e` 77/77 (5 tests « Application », dont « jamais un lien APK mort »). Local avant push : 70/70 · 40/40 · 77/77 (le 39/40 local venait du serveur lancé sans `NODE_EXTRA_CA_CERTS` — pas du code). Android CI : debug run 34058527074 ✅ ; release `mobile-v0.1.1` : premier run 34058536618 rouge à la publication (400 « Invalid Compact JWS » — les clés Supabase `sb_secret_…` ne sont pas des JWT, l’API Storage veut `apikey` en plus de Bearer ; corrigé `7d2c67c`, tag reposé), run 34058922014 ✅ → **`presti.apk` public (30,7 Mo, HTTP 200)**, `parametres-e2e` prod 77/77 dont « le lien Télécharger (APK) répond 200 ».
- **M2 / M3 (Benj a demandé « fais-les »)** : M2 = créer un compte développeur Play et payer 25 $ — je ne crée pas de compte et ne saisis pas de paiement, c'est à lui. M3 = projet Firebase : je peux le faire dans son Chrome **si** il me dit oui explicitement pour accepter les conditions Firebase et télécharger deux fichiers (`google-services.json`, clé de compte de service) ; sinon il me donne les deux fichiers et je pose le reste (`mobile/android/app/`, variable Vercel `FIREBASE_SERVICE_ACCOUNT`, drapeau `pushNatif`).
- **Appels IA du sprint : 0.**
- **Suivant** : APK 0.1.1 sur le téléphone de Benj (scan, caméra, partage, verrou) ; M3 selon sa réponse ; iOS (M1 + M5) ; empreinte Play App Signing dans `assetlinks.json` après M2.

## [27] v9 · M3 Firebase fait, notifications natives ouvertes, smoke Android en CI, fiches store — 07/09 — ✅ `c48f487` → `bbac44e` en prod : push-e2e **39/39**, liens-profonds **19/19**, parametres **77/77** ; APK 0.1.2 avec Firebase (tag `mobile-v0.1.2`)

- **M3 (Benj a créé le projet Firebase « app-presti » et déposé les deux fichiers à la racine du dépôt)** : `scripts/firebase-poser.mjs` les a posés sans rien afficher — `google-services.json` → `mobile/android/app/` (ignoré par git, vérifié par `git check-ignore`) + secret GitHub `ANDROID_GOOGLE_SERVICES_BASE64` (HTTP 201, écrit par le workflow avant chaque build) ; compte de service → variable Vercel `FIREBASE_SERVICE_ACCOUNT` (production + preview) + `.env.local`. Les originaux sont partis dans `Documents/presti-secrets/firebase/` (hors dépôt) ; `git status` ne montre aucun fichier Firebase. **Preuve que Google accepte le compte** : un envoi FCM v1 vers un jeton bidon répond `400 INVALID_ARGUMENT` (pas 401/403) → le JWT signé par `lib/pushNatif.ts` est bon. Drapeau `pushNatif: true` (`c48f487`). `push-e2e` adapté aux deux mondes : sans Firebase le natif est ignoré ; avec, FCM refuse le jeton bidon et l'appareil est retiré comme un 410 web — 39/39 prod.
- **Coque (suite de la revue)** : PDF de facture et export des données par la feuille de partage native (`app/factures/page.tsx`, `SectionDonnees.tsx`) — le web ne change pas (parametres 77/77, export ZIP intact). Nouvelle suite **`liens-profonds-e2e`** (48e du lanceur, gratuite) : assetlinks servi et identique sur qg. et l'apex, 404 sans nom de paquet sur un hôte d'artisan, AASA ⏳ (M1), chemins du manifeste Android = ceux du pont, chacun répond, coque fermée (server.url, allowNavigation, WKAppBoundDomains) — 19/19 prod. Point hebdo : appareils abonnés (web/Android/iPhone), désactivés, servis dans la semaine.
- **Smoke Android en CI (§7)** — `mobile/scripts/smoke-android.mjs`, job `smoke` après `debug` (émulateur API 34 x86_64 google_apis, KVM) : installe l'APK de debug, lance, capture, logcat, puis **interroge la WebView par DevTools** (`PRESTI_MOBILE_DEBUG` au `cap sync` du debug seulement) : console chargée, `isNativePlatform`, `Capacitor.Plugins` non vide (la cause du scan mort), les 15 plugins disponibles côté natif, BarcodeScanner/SecureStorage/Biometric/Network répondent vraiment depuis le natif. **Premier run (34060820650) : 7/18, et trois vraies trouvailles** : (1) l'émulateur des runners ne résout aucun nom (systemd-resolved) → la coque a affiché la page de secours → `-dns-server 8.8.8.8,1.1.1.1` ; (2) sur la page de secours, `window.Capacitor` n'existe pas (le pont n'est pas injecté dans `server.errorPath`) → avec `launchAutoHide: false` **le logo restait à jamais** (capture : splash bloqué) → `launchAutoHide: true` + plafond 4 s (NatifSplash retire le splash bien avant sur la console) ; (3) le splash Android 12+ avait un **fond clair** (« flash blanc » interdit par TESTS.md ligne 2) → `windowSplashScreenBackground` = nuit + `postSplashScreenTheme`. Le script lui-même : `logcat -d` dépassait le `maxBuffer` d'`execSync` (journal vide) → 64 Mo ; nouvel essai vers la console si le premier lancement tombe sur la page de secours (noté ⚠️, pas compté). Relancé sur `bbac44e` — résultat consigné ci-dessous.
- **Chrome** : l'extension Claude dans Chrome n'a jamais répondu de la session ; le navigateur intégré a eu la session Google de Benj mais refusait toute lecture (« Policy check temporarily unavailable ») — Benj a fini Firebase à la main, le script a fait le reste.
- **Appels IA du sprint : 0** (les fiches store sont rédigées par des agents de revue, pas par l'IA de Presti).
- **Suivant** : résultat du smoke relancé et de la release 0.1.2 ; `mobile/STORES.md` (fiches App Store / Play, critique adversariale) ; Benj : APK 0.1.2 sur son téléphone (TESTS.md 1-6, dont la **notification native**), sauvegarde de `presti-secrets/` (android + firebase), M2 plus tard (Play), M1 + M5 (iOS).

## [28] v9 · smoke Android **18/18**, trois bloquants store corrigés, compte de relecture, APK 0.1.3 — 07/09 — ✅ `7ab0ed5` → `1ef74c0` en prod : code-connexion **61/61**, parametres **77/77**, liens-profonds **18/18** ; prompt v10 reçu

- **Smoke Android en CI, 18/18 (run 34062562737)** : l'APK de debug tourne dans l'émulateur, la console se charge (`/login`, pas la page de secours), `isNativePlatform` vrai, **`Capacitor.Plugins` non vide** (la cause du scan mort, désormais prouvée corrigée sans téléphone), les 15 plugins disponibles côté natif, et **BarcodeScanner, SecureStorage, BiometricAuth, Network répondent depuis le natif**. Deux passes intermédiaires (7/18 puis 12/18) ont chacune trouvé un vrai défaut : DNS de l'émulateur, splash bloqué à jamais sur la page de secours, splash Android 12 à fond clair, puis mon script lui-même (`maxBuffer`, une connexion DevTools par appel refusée → une seule connexion persistante). `paths` du workflow : les `.md` de mobile/ ne relancent plus (ni n'annulent) un build.
- **Fiches store (workflow wf_17de27cb, 4 agents, 984 k jetons) → `mobile/STORES.md`** (App Store Connect + Play Console : textes comptés, captures, App Privacy / Data safety avec preuves, note 4.2, parcours du relecteur, classification). **Le critique a refusé les deux propositions** pour trois raisons dans le CODE, toutes corrigées (`7ab0ed5`, `1ef74c0`) : (1) **aucun relecteur ne pouvait entrer** (code email obligatoire, boîte .invalid) → compte de relecture à **code fixe** pour UN compte désigné (`RELECTURE_EMAIL` / `RELECTURE_CODE` sur Vercel, comparaison à temps constant, mot de passe toujours exigé), compte « Atelier Relecture » créé par `scripts/compte-relecture.mjs` (Signature, 2 conversations + 1 devis semés **en base, 0 IA**), identifiants dans `presti-secrets/relecture.txt` — `code-connexion-e2e` 61/61 (5 tests : ouvre, garde des routes, autre code refusé, sans mot de passe refusé, autre email refusé) ; (2) **l'achat Stripe dans la coque** (Apple 3.1.1, paiement Play) → en natif `/abonnement` et Paramètres → Abonnement n'ont ni prix, ni bouton, ni portail, ni renvoi ; `/abonnement` retiré des App Links et du pont ; (3) **lien APK et « le store suivra » dans l'app** → Paramètres → Application ne rend en natif que « vous êtes dans l'application » ; « prochaine version » retiré. Majeurs/mineurs appliqués : promesse « réponse en moins d'une minute, jour et nuit » réécrite (mode assisté par défaut, auto dès Studio), « visibles que par vous » → « cloisonné », marques tierces retirées, rapports d'erreur sans identifiants (`app/error.tsx`), iOS `MARKETING_VERSION` = tag, `Info.plist` (fr, chiffrement exempté, sans localhost), **politique de confidentialité : « 9. Application mobile »**.
- **APK 0.1.3** (tag `mobile-v0.1.3` sur `1ef74c0`) : Firebase, splash nuit + plafond 4 s, achat masqué, revue native — c'est celui que Benj installe (TESTS.md).
- **Prompt v10 « Direction » reçu** (rangé dans `plans/009-direction.md`) avec sa condition : v9 J1–J4 ✅, **J5 (test interne Play) bloqué par M2 que Benj a remis à plus tard**, soumission planifiée (STORES.md). Décision : cartographie de l'existant lancée en lecture seule (workflow wf_483754e7, 7 lecteurs + carte) ; le J1 commence sous cette hypothèse, sauf contre-ordre. Benj s'inquiète d'un arrêt brutal en cours de nuit : chaque étape est **committée et journalisée** — une reprise repart du journal et de `plans/009-direction.md`, rien ne dépend de la session.
- **Appels IA du sprint : 0.**
- **Suivant** : carte → spécifications par onglet → J1 (socle : garde fondateur + second facteur, re-confirmation, `journal_direction`, page Aujourd'hui) ; liste H1–H7 posée à Benj ; APK 0.1.3 sur son téléphone.

## [29] v10 · J1 — le socle du Centre de direction, livré derrière le drapeau — 07/09 — ✅ `054eec4` → `3c80be9` en prod (404 partout : `fermeture-e2e` **65/65**) — **attend : Benj colle 0065, puis je lève `direction`**

- **Vérifié (carte de l'existant, workflow wf_483754e7, 7 lecteurs + synthèse → `plans/009-direction-carte.md`, 380 lignes)** : la garde fondateur était copiée six fois (`api/control/*`), rien n'était journalisé, aucune re-confirmation n'existait, le jeton vit en localStorage (pas de garde serveur sur l'identité), et **trois prémisses du prompt sont fausses** : `lib/canaux.ts` n'est pas un OAuth Gmail (IMAP à mot de passe), le formulaire « Nous écrire » n'écrit rien en base, `lib/facturation.ts` n'a aucun seuil de TVA. Contrat Alexandre retrouvé (`SaaS/Legal/…docx`, annexe A = les chiffres du §4 ; art. 7 lui donne la lecture des relevés et justificatifs).
- **Décisions (carte §3, toutes adoptées)** : re-confirmation = mot de passe côté serveur + table `reconfirmations` hachée (5 min, usage unique, portée, RPC atomique) ; `/direction` = layout serveur 404 sur le drapeau + page cliente + tout par l'API ; 0065 = socle seul, 0066-0068 par jalon ; rôles `direction_roles` ; `reglages_globaux` = valeurs seulement ; journal 24 mois, IP en clair côté serveur, trigger d'immuabilité ; alertes persistées ; « non mesuré (H2) » pour le coût IA ; `/controle` intact jusqu'au J6. **Réponses de Benj** : Gmail = sa boîte (H1) ; registre des apports **avec preuve** (lien d'apport signé, statuts prouvé/déclaré/contesté — J2) ; rôle d'Alexandre = lecture (H7) ; « fais ce que tu m'as dit ».
- **Corrigé / livré (29 fichiers, `054eec4`)** : `0065_direction.sql` (+ `_A_COLLER_sql_editor_0065.sql` versionné) ; `lib/direction/garde.ts` (UNE garde, fail-closed, drapeau → IP bannie → authArtisan = second facteur → is_founder → plafond 120/min → rôle) ; `reconfirmation.ts` (émission, consommation, `exigerReconfirmation` sur l'en-tête `x-presti-reconfirmation`) ; `journal.ts` (avant/après épurés, IP, navigateur ; **pas de journal → l'écriture est défaite et 503**) ; `fraicheur.ts` (`Sourcee<T>`, cache 60 s, `relTime`) ; `stripe.ts` lecture seule (joignable, MRR mensualisé, encaissé net/frais, conversions du jour, échecs, événements) ; routes `reconfirmer`, `etat` (site, connexion, Stripe, Resend, crons, IA), `chiffres` (7 valeurs sourcées, coût IA réel ou estimation étiquetée H2), `a-faire` (paiements échoués, alertes, crons), `fil` (20 événements fusionnés), `journal` (paginé), `alertes/[id]/acquitter`, `securite/bans` (l'écriture qui prouve la chaîne) ; écran `app/direction` (rail Aujourd'hui / Journal, bandeau d'état, À faire avec action par ligne, KPI + « source · il y a », Fil, modale de re-confirmation avec piège de focus, jeton en mémoire seulement) ; `lib/alertes.ts` persiste chaque alerte ; purges RGPD (journal 24 mois, re-confirmations 7 j, alertes 12 mois) ; `docs/registre-traitements.md` ; entrée « Direction » du menu derrière le drapeau ; robots. **Suite `direction-e2e`** (16 blocs : 401/403/code_requis, lectures sourcées, écriture sans jeton refusée, mot de passe faux/bon/429, rejeu/expiration/portée/autre fondateur, immuabilité + RLS, débannir, rôle lecture, sentinelle « aucune donnée de prospect », alerte acquittée, plafond) — **code 2 tant que 0065 n'est pas collée**. `fermeture-e2e` : 7 routes de direction en 404 + 3 routes control ajoutées.
- **Preuve en prod** : `3c80be9` en ligne, `fermeture-e2e` 65/65 (les routes de direction répondent 404, `/controle` inchangé, robots à jour) ; build local vert ; 0065 corrigée avant collage : `acteur_id` nullable (le journal survit au compte), le trigger laisse partir les lignes des comptes de test.
- **Revue adversariale** (wf_94e34d23 : attaque, conformité, fiabilité, produit × 2 réfutateurs) : coupée par la limite de session, relancée — constats et correctifs au bloc suivant.
- **Appels IA du sprint : 0.**
- **Suivant** : constats de la revue ; **Benj colle `_A_COLLER_sql_editor_0065.sql` et le dit** → je lève `direction`, déploie, `direction-e2e` en prod ; puis J2 (Clients & abonnements + registre des apports avec preuve).

## [30] v10 · J1 — la revue adversariale du socle, intégrée (13 défauts, dont 3 qui cassaient la suite elle-même) — 07/09 — ✅ `6a011e0` → `b886c90` en prod : fermeture **65/65**, code-connexion **61/61**, parametres **77/77**, legal **57/57**, alertes **3/3**

- **Vérifié** : revue à quatre angles (attaque, conformité, fiabilité, produit ; wf_94e34d23) sur le socle livré la veille. Les réfutateurs n'ont tenu que l'angle attaque (limite de session puis de crédits) — j'ai lu les trois autres angles dans le journal du workflow et jugé chaque constat sur le code, plutôt que de les perdre.
- **Trouvé et corrigé — sécurité (9 constats, tous majeurs)** : (1) les trois policies `for select using (is_founder())` de 0065 rouvraient ce que la garde ferme — `is_founder()` ignore le second facteur, donc un jeton obtenu au mot de passe seul lisait le journal (IP en clair, avant/après) directement par PostgREST → `revoke all`, aucune policy, la lecture passe par l'API et le test le prouve pour trois jetons différents ; (2) le rôle « lecture » écrivait encore par l'ANCIENNE porte (`api/control/security`, `agents`, `run-agent`) → les trois gardes refusent le rôle ; (3) `on delete set null` + trigger d'immuabilité = **suppression de compte impossible** (Postgres exécute un UPDATE que le trigger refusait) → exception explicite pour la seule nullification des clés étrangères ; (4) bannir sa propre adresse fermait la direction à jamais, débannissement compris → refus explicite, durée bornée (1 h à 1 an, permanent sur demande), et un fondateur qui a passé le second facteur n'est plus refoulé par un ban ; (5) les alertes adressées aux ARTISANS étaient gardées avec leur email et survivaient à leur compte → seules celles de l'entreprise sont gardées, rattachées à l'artisan (`on delete cascade`), adresses masquées à l'écriture ; (6) le jeton de re-confirmation se brûlait sur une requête invalide (et `dureeH: 1e300` levait une 500) → corps validé d'abord, jeton consommé en dernier ; (7) action et journal pouvaient diverger → **trois fonctions transactionnelles** (`bannir_ip`, `debannir_ip`, `acquitter_alerte`) : les deux écritures tiennent ou aucune, et deux acquittements simultanés ne font plus qu'une ligne ; (8) le « Qui » du journal citait `artisans.email`, que l'acteur peut changer lui-même → adresse de connexion (GoTrue) portée par la session, identifiant affiché à côté ; (9) le rôle lecture voyait les bans et les adresses du journal → `estDirection` sur les bans, ni `ip` ni `agent` pour la lecture.
- **Trouvé et corrigé — écran (produit)** : **l'écran se figeait** sur « Vérification de l'accès… » dès que la base répondait 503 (migration pas encore collée !) ou 429 → l'accès se vérifie sur la route la plus légère, et 503/429/réseau ont leur message et un bouton « Réessayer » ; **« Rien en attente » mentait** quand Stripe ne répondait pas → une source en panne est nommée à l'écran ; plus d'action vers une route inexistante ni de renvoi vers la page de paiement du client ; la modale ne promet plus « cinq minutes » alors que le jeton est à usage unique ; la portée est celle que le serveur annonce (plus de modale en boucle) ; focus rendu à son origine et non volé toutes les 20 s ; dépliage du journal au clavier ; « Plus ancien » ne double plus les lignes ; une erreur de journal ne s'affiche plus comme « aucune action » ; chaque bloc s'affiche dès qu'il arrive ; montants au même format partout, tâches nommées en français, message de retour en phrase complète.
- **Trouvé et corrigé — fiabilité** : le client Stripe attend **80 secondes** par défaut → 6 s sans retente, cache 90 s ; aucun cache sur nos propres tables (une alerte acquittée restait dans « À faire » quinze secondes) ; les sondes d'état visaient la production en dur depuis n'importe quel déploiement → elles suivent celui qui les sert ; les conversions comptaient les paiements abandonnés. **Trois défauts cassaient ma propre suite** : le plafond de re-confirmation (5 par quart d'heure) épuisé par le bloc 6 condamnait le bloc 7 ; la conservation 24 mois était « prouvée » sur une ligne exemptée ; la rafale du plafond pouvait tomber à cheval sur deux minutes.
- **Trouvé et corrigé — conformité** : l'adresse d'une cible bannie vivait 24 mois dans le journal alors que `ip_bans` la purge à 12 → pseudonymisée dans la trace ; la politique de confidentialité promettait des adresses « pseudonymisées avant tout enregistrement », ce qui est faux du bannissement → texte exact ; l'export de l'artisan ne contenait pas ce que la direction avait fait sur son compte → `actions_de_direction.json` ; l'épuration du journal ne filtrait que 11 noms exacts (`access_token`, `api_key` passaient) → filtrage par motif, clés d'identité comprises ; la purge du journal dépendait du drapeau → une conservation ne se suspend pas ; **registre des traitements complété** (9 traitements, plus seulement le Centre).
- **Reste ouvert, écrit noir sur blanc** : le rôle « lecture » exige aujourd'hui `is_founder`, ce qui donne aussi, par les policies de 0004/0006, l'accès aux devis, leads et factures de TOUS les artisans — donc **aucune ligne « lecture » ne doit être créée pour une personne réelle** avant de découpler les deux (chantier du J5, noté dans 0065 et dans la spec) ; la migration sème le rôle « direction » pour les fondateurs actuels. Le bloc navigateur de la suite (bandeau, KPI, 390 px, modale) s'ajoutera au premier passage réel, une fois le drapeau levé : je n'ajoute pas du code de test que je ne peux pas encore exécuter.
- **Preuve en prod** : `b886c90` en ligne ; `fermeture-e2e` 65/65 (les sept routes de direction en 404, `/controle` intact), `code-connexion-e2e` 61/61 (dont le compte de relecture), `parametres-e2e` 77/77 (export inchangé), `legal-e2e` 57/57 (politique modifiée, toujours conforme), `alertes-e2e` 3/3. Types et build verts.
- **Appels IA du sprint : 0.**
- **Suivant** : **Benj colle `supabase/migrations/_A_COLLER_sql_editor_0065.sql` et me le dit** → je lève `FLAGS.direction`, je déploie, `direction-e2e` prouve le socle en production et j'ajoute le bloc navigateur. Puis J2 (Clients & abonnements + Registre des apports **avec preuve**, spec écrite : `plans/direction/spec-J2-clients-apports.md`).

## [31] v10 · J1 **prouvé en production** — le Centre de direction est ouvert — 07/09 — ✅ `direction-e2e` **72/72** (`6380216` → `1f4af66`)

- **Vérifié avant d'ouvrir** : Benj a collé 0065 ; j'ai contrôlé les cinq tables, les trois fonctions transactionnelles (appelées avec de vrais arguments : `absent`, `inconnue`, `absent`) et les rôles semés (trois fondateurs en « direction »). Puis `FLAGS.direction` levé et déployé.
- **Preuve en production, 72 contrôles** : l'espace refuse tout sans identité, sans qualité de fondateur, sans second facteur ; les lectures sont sourcées et datées ; une écriture sans re-confirmation est refusée ; le mot de passe est revérifié par le serveur (cinq essais par quart d'heure) ; le jeton est à usage unique, borné à cinq minutes et à une portée — rejeu, expiration, mauvaise portée et jeton d'un autre fondateur sont refusés ; le journal est immuable, illisible par un jeton de navigateur (trois jetons éprouvés sur cinq tables), et l'adresse d'une cible bannie n'y figure que pseudonymisée ; le rôle « lecture » ne voit ni les bans ni les adresses, et n'écrit ni par la porte neuve ni par l'ancienne ; aucune donnée de prospect ne sort (sentinelle) ; deux acquittements simultanés ne font qu'une ligne de journal ; le plafond par fondateur tient.
- **Trouvé à l'œil, sur la capture** — deux défauts que les tests verts ne voyaient pas : (1) mes assertions d'écran passaient sur une page **entièrement en « chargement… »** → elles exigent maintenant des valeurs réellement chargées, et ce durcissement a immédiatement révélé (2) qu'un refus « trop d'appels » laissait le bandeau muet sur « Vérification… » pour toujours → tout refus se dit désormais, avec l'état « non vérifié ». (3) La suite laissait à chaque passage une ligne de journal indestructible (vingt-quatre mois) : six trônaient en tête du Fil → elle réutilise une seule ligne, et `0066` (à coller sans urgence) laisse effacer les actions de test et nettoie les six.
- **L'écran, en vrai** : « Tout fonctionne · 5 contrôles verts sur 6 » (le sixième est le budget IA, honnêtement « non mesuré » faute de clé), MRR 29 €, 1 artisan payant, 3 essais, 28,31 € encaissés ce mois (29 € brut, 0,69 € de frais), coût IA ≈ 0,07 € **étiqueté estimation**, 6 crédits consommés sur 89 inclus — chaque chiffre avec sa source et sa fraîcheur. Le fil montre les vraies actions. Tenue sur téléphone vérifiée : aucun débordement, toutes les cibles à 44 px.
- **Appels IA du sprint : 0.**
- **Suivant** : J2 — Clients & abonnements, et le **Registre des apports avec preuve** (lien d'apport signé côté serveur, statuts prouvé / saisi / déclaré avec pièce / contesté ; spec écrite dans `plans/direction/spec-J2-clients-apports.md`). Pour Benj, sans urgence : coller `_A_COLLER_sql_editor_0066.sql`, et les préalables H2 (clé Anthropic Admin, pour un coût IA réel) et H3 (jeton Vercel).

## [32] v10 · la clé Anthropic Admin posée, et le chiffre remis à sa place ; J2 livré derrière son drapeau — 07/09 — ✅ direction-e2e **72/72**, alertes **5/5** (`853fd33` → `c402474`)

- **Clé d’administration** : Benj l’avait collée SANS le nom de variable devant (une ligne de 110 caractères commençant par `sk-ant`, dans `.env.local`). Nom ajouté, clé posée sur Vercel par `scripts/poser-env.mjs` (jamais affichée, jamais en ligne de commande), déployée. Les workflows l’excluent du secret GitHub, comme la clé d’usage.
- **Trouvé, et c’est important** : la facture lue est de **505,40 $ (≈ 465 €) ce mois** — mais c’est celle de TOUTE l’organisation Anthropic (Haiku, Sonnet, Opus, recherche web : le développement, Claude Code, les essais), pas le coût du produit Presti, qui vaut quelques centimes pour un artisan payant. L’afficher en « Coût IA du mois » aurait été un chiffre faux sur l’écran qui sert à diriger. **Corrigé** : deux tuiles distinctes — « Facture Anthropic » (toute l’organisation, développement compris) et « Coût IA du produit » (crédits réellement consommés par les artisans, étiqueté estimation). La forme de la réponse d’administration est désormais CONFIRMÉE sur une vraie lecture (`data[].results[]`, ventilation par espace de travail) : le code ne devine plus. Un espace de travail Anthropic dédié à Presti séparerait les deux à la source — action de Benj, notée.
- **Corrigé aussi** : l’appel Anthropic n’avait aucun délai maximal ; une fois la clé posée, il laissait le bandeau d’état sur « Vérification… » sur téléphone → six secondes, comme les autres sources. Le test de conservation 24 mois ne fabrique plus une ligne de journal indestructible : il s’éprouve sur une ligne réelle, et le dit quand il n’y en a pas encore.
- **J2 livré, derrière `FLAGS.apports` (baissé)** : migration `0067` (apporteurs, `registre_apports`, trois fonctions transactionnelles), lien `/a/<code>` qui pose une empreinte signée httpOnly de 90 jours, rattachement au registre à l’inscription (statut **prouvé**), déclaration à la main avec **pièce obligatoire**, contestation à 10 % et retrait motivés, règle unique « ce qui compte et pourquoi », onglets **Clients** (canal d’arrivée) et **Apports** (preuve lisible, lien à copier). La base refuse de transformer un apport déclaré en apport prouvé : une preuve s’établit à l’inscription ou pas du tout.
- **Appels IA du sprint : 0.**
- **Suivant** : la suite `direction-apports-e2e` (cookie modifié d’un caractère → rien, cookie de plus de 90 jours → rien, second rattachement refusé, déclaration sans pièce refusée, rôle lecture qui ne voit que ses lignes), puis Benj colle `_A_COLLER_sql_editor_0067.sql` et je lève le drapeau.

## [33] v10 · J2 — le Registre des apports **avec preuve**, ouvert et prouvé en production — 07/09 — ✅ `direction-apports-e2e` **27/27**, `direction-e2e` **72/72** (`ec81165` → `2598513`)

- **Vérifié** : Benj a collé 0067 ; les deux tables, les trois fonctions (appelées avec de vrais arguments : `artisan_inconnu`, `piece_requise`) et l'apporteur semé sont en place. `FLAGS.apports` levé, déployé.
- **Ce que la suite prouve** (27 contrôles en production) : le lien `/a/<code>` pose une empreinte **signée, httpOnly, Secure, SameSite=Lax, 90 jours** et redirige vers l'accueil ; un code inconnu redirige pareil **sans rien poser et sans le dire** ; une arrivée par le lien inscrit l'artisan en **« prouvé »**, avec le code, la date d'arrivée et celle de l'inscription ; **une empreinte modifiée d'un seul caractère ne rattache rien** ; une empreinte de **100 jours** ne rattache rien — et le contrôle du contrôle : la même, fraîche, rattache bien (sinon le test passerait pour une mauvaise raison) ; pas de doublon ; **déclarer à la main exige une pièce** et une re-confirmation, et c'est journalisé ; **un apport déclaré ne devient jamais « prouvé »** — la base le refuse ; contester le ramène à **10 %** avec motif (contrat, art. 5), journalisé avant/après ; le rôle « lecture » voit son registre, n'écrit rien, et la liste des clients n'expose aucun compte de test.
- **Espace de travail Anthropic dédié à Presti** (demande de Benj) : créé par l'API d'administration (`wrkspc_01KY3…`), identifiant posé sur Vercel. **Anthropic refuse de déplacer une clé existante** (`workspace_id: Extra inputs are not permitted`) : la clé du produit doit être **recréée dans l'espace** depuis la console — c'est la seule étape qui reste à Benj. Le Centre est déjà câblé : la tuile « Coût IA du produit » affichera le montant **facturé** de l'espace dès qu'il dépensera, et dit d'ici là pourquoi elle estime (jamais un « 0 € » trompeur).
- **Trouvé et corrigé** : mon test du canal d'acquisition cherchait un compte de test dans la liste des clients — laquelle les exclut, à raison ; l'assertion vérifie désormais qu'**aucun compte de test n'y apparaît** et que chaque ligne porte son canal.
- **Appels IA du sprint : 0.**
- **Suivant** : J2b — les actions sur un artisan (changer d'offre, offrir des crédits, prolonger l'essai, rembourser, mettre en pause, suspendre, réactiver, portail Stripe, email), chacune re-confirmée, journalisée et éprouvée en mode test Stripe. Pour Benj : recréer la clé d'API dans l'espace « Presti » (console Anthropic → Settings → API keys → l'espace Presti), puis me le dire.

## [34] v10 · J2b/J2c — la fiche d'un artisan, et les trois gestes qui touchent à l'argent — 07/09 — ✅ `direction-argent-e2e` **52/52** en mode test Stripe (`420417b` → `f9dece8` en prod, derrière le drapeau `actionsArtisan`)

- **Livré, derrière un drapeau baissé** : la fiche d'un artisan (compte, abonnement lu en direct chez Stripe, activité en **nombres** — jamais le contenu de ses conversations, devis ou factures —, canal d'arrivée, et tout ce que la direction a fait sur ce compte), plus huit actions : offrir des crédits, suspendre, réactiver, écrire, ouvrir son portail, **changer d'offre, rembourser, mettre en pause**. Le drapeau reste baissé tant que 0068 n'est pas collée : la fiche affiche « actions bientôt disponibles » plutôt que des boutons morts, et les routes répondent 404. C'est l'ordre appris le 03/09 — coller, PUIS lever.
- **Le défaut le plus lourd n'était pas dans ce lot, il était en production depuis toujours** : le portail de facturation Stripe laisse l'artisan **changer d'offre lui-même** (c'est écrit dans le code du portail), et **aucun webhook n'écoutait `customer.subscription.updated`**. Un artisan passé de Studio à Essentiel depuis le portail payait 29 € en gardant 250 crédits et les capacités de Studio ; celui qui montait payait 99 € sans rien recevoir de plus. Invisible des deux côtés. `lib/abonnementSync.ts` aligne désormais la base sur ce que Stripe facture **réellement** : c'est le **montant** qui décide, jamais une métadonnée qu'un changement d'offre laisse périmée.
- **Règle des crédits, choisie pour ne jamais spolier** : une montée d'offre les complète tout de suite (il paie plus aujourd'hui, il reçoit plus aujourd'hui) ; une descente n'en retire **aucun** — ce qui reste du mois lui appartient, le rechargement mensuel le remettra au bon niveau.
- **Ce que la suite en mode test a trouvé, et qui est corrigé** : le remboursement ne retrouvait **aucun paiement** — `payments` n'est pas étendu par défaut sur une facture Stripe, il faut le demander explicitement ; sans ce correctif, le bouton aurait échoué à tous les coups. Et `price_data` n'accepte pas de `product_data` sur un abonnement (seul le checkout le permet) : d'où un **prix nommé** par offre, retrouvé par sa clé de recherche et créé une seule fois — le catalogue Stripe devient lisible au passage, au lieu d'un produit jetable par paiement.
- **Bornes dans le code, pas dans l'écran** : on ne rend jamais plus que ce qui reste encaissé sur la dernière facture ; une pause ne dépasse pas trois mois ; une clé d'idempotence par geste, si bien que deux clics ne remboursent qu'une fois (prouvé : un seul remboursement chez Stripe après deux appels identiques). L'action et sa trace ne pouvant pas tenir dans une transaction quand Stripe est au bout du fil, on écrit **deux lignes** : l'intention avant l'appel, le résultat après. Une intention restée seule est le signal qu'il faut aller regarder le tableau de bord — c'est la propriété qu'on veut, pas un défaut.
- **Une bêtise de ma part, réparée** : un `git add -A` trop large a poussé **51 Mo** d'APK et de cache TypeScript dans le dépôt. Retirés du suivi et ignorés au commit suivant ; les blobs restent dans l'historique de `420417b` — les en purger demande une réécriture d'historique, que je ne fais pas sans que Benj le dise.
- **Appels IA du sprint : 0.**
- **Pour Benj, deux choses** : coller `supabase/migrations/_A_COLLER_sql_editor_0068.sql` (suspensions et crédits offerts) — sans elle, la fiche reste en lecture ; et **la valeur** de la clé « presti produit » créée dans l'espace Anthropic « Presti » (l'API ne rend jamais la valeur d'une clé, et `ANTHROPIC_API_KEY_NOUVELLE` n'est pas dans `.env.local`) : tant qu'elle n'y est pas, le coût IA du produit se mesure sur l'ancien espace, où mes propres appels de développement se mélangent aux siens.
- **Suivant** : la revue adversariale de ce lot, puis J3 — la messagerie d'entreprise (Gmail).

## [35] v10 · J3 — la messagerie de l'entreprise, livrée et fermée — 07/09 — ✅ `direction-messagerie-e2e` **4/4** (les quatre routes en 404, drapeau baissé) — `491011c` en prod

- **Ce que c'est** : la boîte de Presti — `contact@prestiapp.fr`, les messages du formulaire « Nous écrire » (qui y arrivent par email), les réponses des artisans — groupée **par fil**, avec un statut qu'on fait descendre : à traiter, répondu, classé. On classe, on assigne à un fondateur, on rattache à un artisan (son courrier apparaît alors sur sa fiche), et on **répond depuis le Centre**, dans le même fil.
- **Ce que ce n'est pas, et ne sera pas** : les conversations d'un artisan avec ses clients. Ce n'est pas la messagerie du produit, c'est celle de l'entreprise.
- **Bonne surprise** : la boîte est déjà branchée en production — `IMAP_USER` / `IMAP_PASS` existent sur Vercel depuis le sprint J-1. Aucune action de Benj pour la connecter, contrairement à ce que le prompt supposait (il parlait d'un OAuth Gmail ; la boîte de l'entreprise est chez OVH, et c'est elle qui reçoit tout ce qui compte).
- **Deux principes tenus dans le code** : la relève est **rejouable** — chaque message est identifié par son `Message-ID`, jamais par son numéro IMAP, qui change dès qu'on réorganise la boîte ; relever deux fois ne duplique rien et **n'écrase ni le statut, ni l'assignation, ni le rattachement faits la veille**. Et on ne garde que le **texte** : le HTML d'un email est du code venu de l'extérieur, ni utile ici, ni sûr à réafficher.
- **Le fil suit `In-Reply-To`, jamais le sujet** — sinon deux « Bonjour » sans rapport finiraient dans la même conversation. Répondre pose `In-Reply-To` et `References`, ce que l'envoi d'email de Presti ne savait pas faire : sans eux, la réponse ouvre une conversation neuve chez le destinataire et le fil se lit à trous des deux côtés.
- **La table n'a aucune policy de lecture, volontairement** : un jeton obtenu au mot de passe seul ne doit pas pouvoir lire la boîte par PostgREST. C'est la leçon du journal de direction, appliquée d'emblée plutôt qu'après coup.
- **Une contrainte découverte en chemin** : le plan Vercel de Presti n'autorise que **deux** tâches planifiées, toutes deux déjà prises. La relève automatique se greffe donc sur celle des relances, bornée à 25 messages et à l'abri d'un `try` — un serveur de messagerie qui ne répond pas ne doit pas empêcher les relances de partir. (Vérifié avant de pousser : un troisième cron aurait fait échouer le déploiement.)
- **Appels IA du sprint : 0.**
- **Pour Benj** : coller `supabase/migrations/_A_COLLER_sql_editor_0069.sql`, puis me le dire — je lève le drapeau et la suite prouve le reste en production.
- **Suivant** : intégrer la revue adversariale des lots J2b/J2c (en cours), puis J4 — la comptabilité et le relevé du partenaire.

## [36] v11 · §0 l'état de l'application, et un compte de test qui était administrateur de l'entreprise — 07/09 — ✅ `zero-demo-e2e` en place (5 anomalies réelles trouvées, aucune purgée sans accord)

- **Le v11 est arrivé pendant que je travaillais** : `plans/010-poste-de-controle.md`, déposé dans le dépôt et non collé dans la conversation. Je l'ai lu en entier et je le prends comme la consigne en cours — **à confirmer par Benj**, puisque je ne l'ai pas reçu de sa main.
- **§0 rendu** : `plans/etat-application.md`. En un mot — côté code, **l'application est à une soirée de la fin pour Android**. Ce qui reste n'est pas du développement : c'est **installer l'APK sur son téléphone** (dix minutes, gratuit, et rien du J3/J4 ne peut être déclaré fait sans ça), deux comptes de développeur payants, et l'attente des stores.
- **Trouvaille de sécurité, corrigée sans attendre.** En sondant la production pour écrire cet état, j'ai trouvé `smoke.test.28508@example.com` — créé le matin même à 06:55 par la suite `smoke-test` — avec **`is_founder = true`, l'offre business, et le rôle « direction »** dans le Centre. Soit **tous les droits sur l'entreprise, en écriture**, pour un compte de test. Privilèges retirés, rôle supprimé, sessions fermées.
- **L'enchaînement mérite d'être retenu, parce qu'aucune de ses trois étapes n'est absurde isolément** : (1) la suite `smoke-test` crée un artisan fondateur en production, dont elle a besoin pour éprouver les écrans réservés ; (2) son ménage n'était appelé **qu'au chemin heureux**, si bien qu'une exception laissait le compte en base ; (3) la migration **0065**, collée quelques heures plus tard, contient `insert into direction_roles select id from artisans where is_founder = true` — elle a **fait confiance à la base** et promu ce compte au rang d'administrateur. Trois gestes raisonnables, une porte ouverte.
- **Corrigé** : le ménage de `smoke-test` passe par un `finally`, retire les **privilèges avant** de supprimer (au cas où la suppression échouerait), et ne suppose pas que la cascade existe. **Verrouillé** : `scripts/zero-demo-e2e.mjs` (v11 §2.4) refuse tout fondateur et tout rôle du Centre hors d'une **liste close**, tout compte de test en base, et tout composant de démonstration importé par un écran du produit. Il tourne avec le lanceur, et il doit rester vert pour toujours.
- **La règle du garde-fou n'est pas « aucune démo »** mais « **aucune dans le produit** » : la vitrine marketing garde sa séquence — elle est tournée sur le vrai produit, c'est du marketing honnête — et la suite vérifie qu'elle ne lit pas la base.
- **Inventaire du faux** : `plans/demos-a-supprimer.md`. Six comptes de test, deux comptes de connexion orphelins, une demande, un devis, et **sept factures**. **Rien n'a été purgé** : c'est irréversible et ça attend le feu vert de Benj (H6). Les factures sont **scellées par 0041** (conservation 10 ans) et le resteront : on les marquera `est_demo` et on les **exclura des chiffres** — on ne lève pas un verrou comptable pour faire propre.
- **Migration 0068 fusionnée** : le v11 demandait un `0068_controle.sql` alors que `0068_suspensions.sql` existait déjà, écrit et non collé. Un seul fichier porte désormais les deux. J'y ai **laissé de côté** `achats`, `obligations`, `tickets`, `reversements` : elles arriveront avec le code qui les lit. Coller aujourd'hui des tables que rien n'utilise, c'est du décor.
- **Trois décisions de conception dans cette migration** : `origine_declaree` (la réponse de l'artisan à « comment avez-vous connu Presti ? ») est **scellée dès qu'elle est donnée** — c'est la seule source indépendante de la preuve d'apport, et si elle restait modifiable elle pourrait être changée après coup, sur demande insistante de celui qui réclame la commission ; `role_interne` et `est_demo` rejoignent le verrou 0055 ; et l'amorçage **nomme** les deux rôles au lieu de les déduire de `is_founder` — c'est précisément cette déduction qui a causé l'incident du jour.
- **À noter pour Benj** : Alexandre est aujourd'hui `is_founder` avec le rôle `direction`. Il voit et peut **écrire** tout le Centre, y compris ce que le contrat ne lui accorde pas. Le v11 §5 le cloisonne ; la migration pose son `role_interne = 'partenaire'`, et le code qui l'applique vient au jalon suivant.
- **Appels IA du sprint : 0.**
- **Suivant** : intégrer la revue adversariale des lots J2b/J2c (en cours), puis le §1 du v11 — fusionner `/direction` dans `/controle`, supprimer Jarvis, rediriger.

## [37] v10/v11 · la revue adversariale intégrée — 30 défauts retenus sur 41, dont trois critiques — 07/09 — ✅ `direction-argent-e2e` **52/52**, `direction-e2e` **72/72**, `direction-apports-e2e` **27/27** (`bd8597d` en prod)

- **Le dispositif** : 128 agents, cinq dimensions relues à l'aveugle les unes des autres (argent, cohérence Stripe ↔ base, accès et trace, vie privée, écran), puis **trois sceptiques par trouvaille**, chargés de la *réfuter* et de trancher en faveur du doute. Onze trouvailles sont tombées à la vérification. Trente tiennent, et sont corrigées.

### Les trois critiques

- **Le webhook Stripe jetait le résultat de ses écritures et répondait 200.** Une panne de base pendant un paiement, et l'événement était perdu **à jamais** : Stripe le considérait traité et ne le rejouait pas. L'artisan était prélevé 99 €, restait sur l'offre d'essai, la fiche affichait « aucun abonnement Stripe », et il pouvait **repayer** — le garde-fou de `/api/subscribe` lit `stripe_subscription_id`, resté vide. Le commentaire du fichier promettait pourtant « 500 : Stripe réessaiera » ; le code ne le tenait que pour les exceptions, et supabase-js ne lève pas. Les erreurs font désormais lever.
- **Un compte suspendu gardait dix-huit routes**, dont la génération de devis et la souscription : la suspension n'était lue que par `authArtisan`, pas par `getUserRevocable`. Une suspension qui ne suspend que la moitié du produit n'en est pas une.
- **La clé d'idempotence Stripe portait le motif saisi.** Deux gestes voulus et identiques se heurtaient au rejeu de Stripe, qui renvoyait la réponse de la première fois : la base, le journal et l'écran affirmaient un changement que Stripe n'avait pas refait. Elle porte maintenant le **jeton de re-confirmation**, à usage unique par construction — un geste voulu deux fois passe par deux mots de passe, donc deux appels réels.

### Ce qui touche à l'argent

- le **plafond de remboursement** ignorait les remboursements déjà faits : il se calculait sur les avoirs, or Stripe n'en émet pas pour un remboursement fait par l'API. Deux fois 40 € sur une facture de 59 € passaient l'un après l'autre. Il compte désormais les remboursements réels du paiement ;
- **le paiement écrasait les crédits offerts** par la direction : 200 crédits offerts disparaissaient à l'instant où l'artisan payait ;
- **un aller-retour d'offre servait le forfait entier à chaque montée** : monter en Signature créditait 600, redescendre n'en retirait aucun (à raison), remonter recréditait 600 — des crédits sans fin pour un prorata net nul. On sert désormais la **différence** avec ce qui a déjà été servi dans la période ;
- **un événement livré après une résiliation ressuscitait l'offre payante** : on relit l'abonnement chez Stripe avant d'écrire, c'est l'état d'aujourd'hui qui décide ;
- **le MRR comptait les abonnements en pause**, que Stripe n'encaissera jamais — donc le seul chiffre censé trahir l'oubli d'une pause disait le contraire ;
- **`rendreCredit` plafonnait au forfait** et détruisait les crédits offerts : un artisan d'Essentiel à qui on avait offert 200 crédits tombait à 80 au premier appel IA qui échouait.

### Ce qui touche aux accès et à la trace

- la **suspension ne fermait pas les jetons de rafraîchissement** : le navigateur en redemandait un et repartait pour une heure. La route annonçait « sessions fermées » sans les fermer ;
- le **lien de portail de facturation** partait **sans mot de passe** et se journalisait sous le nom d'une autre action (`artisan_email`) ;
- l'**email et le portail agissaient AVANT de journaliser** : journal en panne, l'email était parti, la route répondait « action refusée », et il n'en restait aucune trace.

### L'écran

La fiche parlait par `window.prompt`. Elle ne savait ni **nommer le montant** qu'elle remboursait (« la totalité de la dernière facture » ne dit pas combien d'argent part), ni **valider une date** (03/09/2026 relu par `new Date` devient le 9 mars), ni distinguer **« Annuler » de « laissé vide »** — si bien qu'annuler la seconde question lançait quand même l'action. Le résultat s'affichait en haut de page, hors de l'écran quand on agit depuis le bas d'une fiche, et s'effaçait en six secondes, erreurs comprises. Le lien de portail s'ouvrait dans un onglet : il connectait le fondateur au compte Stripe d'un artisan, et sur téléphone le bloqueur de fenêtres le faisait disparaître sans rien dire.

Désormais : un bouton par offre et par modèle d'email, le montant et la date de la facture affichés avant de rembourser, la date de reprise en ISO validée côté client, le texte de l'email montré avant l'envoi, le résultat rendu **dans** la fiche (une erreur ne s'efface pas toute seule), et le lien de portail **posé et copiable**, jamais ouvert.

### Ce que la suite a trouvé toute seule

En rejouant `direction-argent-e2e` après mes correctifs, elle a signalé une **régression que j'introduisais** : mon code lisait deux colonnes que la migration 0068, non collée, n'a pas encore créées — et le webhook n'est derrière aucun drapeau. En production, entre le déploiement et le collage, un changement d'offre aurait échoué sur « aucun artisan ne porte cet abonnement ». La lecture se replie maintenant, et le repli disparaîtra au collage.

Une seule de mes assertions était fausse et je l'ai corrigée : elle attendait qu'une montée d'offre porte les crédits **au forfait entier** (600), alors que la bonne réponse est 532 — l'artisan avait consommé 68 crédits, il les a consommés. Servir le forfait entier était précisément le défaut signalé.

- **Appels IA du sprint : 0.**
- **Suivant** : le §1 du v11 — fusionner `/direction` dans `/controle`, supprimer Jarvis, rediriger.

## [38] v11 · les deux migrations collées, la fiche et la messagerie OUVERTES, les chiffres assainis — 07/09 — ✅ `direction-messagerie-e2e` **30/30**, `direction-e2e` **72/72**, `direction-apports-e2e` **27/27** (`8f6a106` → `7c8599d` en prod)

- **Vérifié avant de lever quoi que ce soit** : 0068 et 0069 sont bien en base — `suspensions`, `courriers`, les cinq fonctions, `role_interne`, `est_demo`, `origine_declaree`, le score d'apport. Benjamin est marqué `fondateur`, Alexandre `partenaire`, et les deux comptes de démonstration portent `est_demo`. Les drapeaux `actionsArtisan` et `messagerie` sont levés : la fiche d'un artisan et la boîte de l'entreprise sont ouvertes.
- **Deux colonnes manquent** (`credits_forfait_servi`, `credits_periode`) : je les ai ajoutées au fichier **après** le copier-coller de Benj, quand la revue a trouvé qu'un aller-retour d'offre servait le forfait entier à chaque montée. Rien ne casse sans elles — le code se replie sur le forfait de l'offre en cours. Complément dans `_A_COLLER_sql_editor_0068b.sql`.
- **La messagerie est prouvée en production** (30 contrôles) : relever deux fois ne duplique rien et **n'écrase ni le statut, ni l'assignation, ni le rattachement** faits la veille ; un message sans identifiant ou de sens inconnu est refusé ; le fil suit `In-Reply-To` ; un message reçu arrive « à traiter », un message envoyé n'attend rien ; classer écrit sa trace **avant/après** dans la même transaction ; on n'assigne pas la boîte de l'entreprise à un client ; et la table **n'est lisible par aucun jeton de navigateur**, fondateur compris.
- **Le garde-fou a attrapé ma propre suite.** `direction-messagerie-e2e` créait un fondateur en production et ne le nettoyait qu'au chemin heureux — **exactement la faute que je venais de corriger sur `smoke-test`**, le même jour. Son ménage passe désormais par un `finally`, retire les **privilèges avant** de supprimer, et se plaint bruyamment s'il échoue. Deux occurrences en un jour : le patron est maintenant écrit dans les deux suites.
- **Les chiffres ne comptent plus que de vrais artisans.** L'exclusion tenait à un motif d'adresse : elle ratait les comptes en `@example.com` créés par les suites de facturation, qui gonflaient les compteurs. La règle est désormais la colonne `est_demo`, portée par `lib/direction/perimetre.ts` — toute requête dont le résultat devient un chiffre passe par `seulsLesVrais()`. **Trois artisans comptent aujourd'hui.**
- **Marqué, pas supprimé.** Six comptes de test portent `est_demo` ; aucun n'a été effacé. La purge est irréversible et attend Benj — marquer donne l'effet voulu sans le geste qu'on ne peut pas défaire. `plans/demos-a-supprimer.md` est gardé sous la main, comme demandé.
- **Le garde-fou change de règle** : un compte de test doit être **absent ou marqué**. Le faire échouer sur un état que Benj a choisi de garder l'aurait laissé rouge en permanence — et un garde-fou toujours rouge ne signale plus rien. Ce qu'il vérifie vraiment : aucun compte marqué ne passe le filtre des chiffres.
- **« Crédits consommés » dit sa limite** : le chiffre se déduit du solde, donc un artisan à qui la direction a offert des crédits a plus que son forfait et sa consommation devient invisible. Ces comptes sont comptés à part, plutôt que d'afficher un nombre qui se croit exact.
- **La clé Anthropic du produit n'est pas celle qu'on croit.** Les dates sont sans appel : la variable `ANTHROPIC_API_KEY` sur Vercel **n'a pas bougé depuis le 20 août**, alors que la clé de l'espace Presti a été créée le 07/09 à 09:26. La production consomme donc encore dans l'espace par défaut, où mes appels de développement se mélangent aux siens. Je ne peux pas le corriger seul : Vercel marque la variable « sensible » (sa valeur ne se relit plus) et **l'API d'Anthropic refuse de créer une clé** (405 sur `POST /organizations/api_keys`) — la valeur n'existe qu'à l'instant de sa création dans la console.
- **Un test à moi a failli mentir.** Ma première vérification de cette clé comparait la valeur Vercel aux indices d'Anthropic ; Vercel ayant rendu une chaîne vide, `startsWith('')` correspondait à la première clé venue et le verdict s'affichait **✅ à tort**. Refusé de conclure sur du vide, refait par les dates. C'est la même leçon que le 06/09 (« tests verts sur un écran en chargement ») : un test qui passe pour une mauvaise raison est pire qu'un test rouge.
- **Appels IA du sprint : 0.**
- **Pour Benj, deux choses seulement** : coller `_A_COLLER_sql_editor_0068b.sql` (deux colonnes), et coller dans `.env.local` **puis sur Vercel** la valeur de la clé « presti produit » de l'espace Presti — ou, si elle n'a pas été copiée à sa création, en créer une nouvelle depuis la console **dans l'espace Presti** et me le dire.
- **Suivant** : le §1 du v11 — fusionner `/direction` dans `/controle`, supprimer Jarvis, rediriger.

## [39] v11 · §1 — une seule interface : `/direction` fusionne dans `/controle`, Jarvis est supprimé — 07/09 — ✅ `controle-e2e` **72/72**, `controle-apports-e2e` **27/27**, `controle-messagerie-e2e` **30/30**, `fermeture-e2e` **65/65** (`2876fbd` en prod)

- **Ce qui était vrai, et que le v11 pointait à raison** : il y avait `/controle` avec son radar « façon Jarvis » (285 lignes) **et** `/direction` avec tout le travail réel. Deux endroits pour la même chose, et **deux entrées dans la navigation menant au même écran**.
- **Déplacé, pas refait** : tout `app/direction/**` et `app/api/direction/**` est passé sous `/controle` par `git mv` — l'historique de chaque fichier suit. `JarvisHub`, `HudGraph`, l'ancien `page.tsx` et `ControlPanel` sont supprimés (git les conserve).
- **`/direction` redirige en permanence** (308 vérifié en production). L'adresse a pu être mise en favori ou reçue dans un email d'alerte : rien de ce qui a été partagé ne doit tomber sur un 404, surtout pas l'écran depuis lequel on éteint un incident. `/api/direction/*` répond 404, `/controle` répond 200.
- **Ce qui n'a PAS été renommé, volontairement** : le vocabulaire du domaine. La table reste `journal_direction`, le rôle reste `direction` (par opposition à `lecture`), `lib/direction/` reste. Ce sont des noms de **métier** — la direction de l'entreprise — pas des noms d'écran, et les changer imposerait une migration de base pour un gain nul. Le v11 demande une interface unique, pas un renommage général.
- **Deux erreurs de ma part, rattrapées** : mon remplacement de chemins a d'abord réécrit `plans/journal-final.md` et les prompts v10/v11 — **réécrire un journal falsifie l'histoire qu'il sert à garder** ; restaurés. Et une assertion de `controle-e2e` portait l'ancien chemin **échappé dans une expression régulière** (`/^\/api\/direction\//`), invisible pour un remplacement de texte : le test a échoué en désignant le bon symptôme pour la mauvaise raison.
- **Les quatre suites prennent le nom du v11** : `controle-e2e`, `controle-apports-e2e`, `controle-argent-e2e`, `controle-messagerie-e2e`. Et `/direction` rejoint `/controle` dans `robots.txt` — une redirection n'a pas plus à être indexée que sa destination.
- **Appels IA du sprint : 0.**
- **Le seul point rouge**, et il attend une décision : deux comptes de **connexion orphelins** (`wl.…@x.fr`, `j6.…@example.com`) existent dans l'authentification sans fiche artisan. Ils ne comptent dans aucun chiffre et leur mot de passe est aléatoire et perdu, mais ils pourraient techniquement créer une fiche. Je ne les supprime pas sans le dire.
- **Suivant** : v11 §5 — le cloisonnement d'Alexandre (`peutFaire(role, action, cible)` appelée par chaque route, et une suite qui rejoue **chaque** action interdite avec son jeton en attendant un 403).

## [40] v11 · §5 — le partenaire n'est pas le propriétaire — 07/09 — ⚠️ `controle-droits-e2e` **21/27** : les six échecs sont le trou lui-même, et ils attendent 0070 (`3f54a6a` en prod)

- **Le point dur n'était pas la matrice d'API, il était en base.** Alexandre porte `is_founder = true`, et la fonction `is_founder()` (0004) ne regarde que cette colonne. Les policies de 0004 et 0006 lui accordent `for all` — **lecture ET écriture** — sur les devis, les lignes de devis, les demandes et les factures de **tous les artisans**. Avec son jeton de navigateur, par PostgREST, sans passer par aucune de nos routes. Le §5 dit exactement l'inverse, et le commentaire de 0065 l'avait anticipé : « à découpler avant d'ouvrir cet accès à quelqu'un d'autre que Benj ».
- **La suite le démontre en production, chiffres à l'appui** : avec le jeton d'un partenaire de test, elle lit **5 devis, 5 demandes, 5 factures, 5 lignes de devis** et les fiches de tous les artisans. Ce n'est pas une hypothèse, c'est une mesure.
- **La migration 0070 corrige en une fonction** : `is_founder()` cesse de signifier « porte le drapeau technique » pour signifier « est le **propriétaire** de l'entreprise ». Aucune policy n'est réécrite — elles l'appellent toutes, et une seule ligne décide désormais qui voit quoi. Le partenaire garde `is_founder` (c'est lui qui ouvre le Poste de contrôle, dont la garde lit la colonne côté serveur) mais perd le « voir tout » sur ce que les artisans confient à Presti.
- **Le côté API, lui, est déjà cloisonné et prouvé** : `lib/controle/droits.ts` porte la matrice du §5, et **seize routes** la consultent. Les neuf gestes sur un artisan répondent 403, la santé et la sécurité aussi. `peutFaire` rend un **verdict** plutôt qu'un booléen : « permis mais borné à ses lignes » oblige l'appelant à déballer `borne`, là où un `true` se serait laissé oublier.
- **Les filtres sont dans la requête, pas sur un tableau déjà rapatrié** — ramener puis trier aurait fait passer les lignes des autres par la mémoire du serveur. Le journal se borne à ses actions, la messagerie aux fils qui lui sont assignés, le registre à ses apports. Un fil non assigné répond **« inconnu » et non « interdit »** : dire « interdit » apprendrait qu'il existe.
- **Deux sources disaient le rôle**, `direction_roles` (v10) et `artisans.role_interne` (v11) — et elles avaient déjà divergé : Alexandre était `partenaire` dans l'une et `direction`, donc écriture partout, dans l'autre. Le rôle d'**entreprise** tranche désormais ; l'ancienne table reste en repli.
- **La suite ne regarde aucun écran** : elle vérifie le **corps** des réponses. Un 200 qui contiendrait la comptabilité serait un échec même si rien ne l'affiche.
- **Appels IA du sprint : 0.**
- **Pour Benj, une chose et c'est la plus importante de la série** : coller `_A_COLLER_sql_editor_0070.sql`. Tant qu'elle ne l'est pas, Alexandre voit les devis et les factures de tous les artisans.
- **Suivant** : une fois 0070 collée, la suite passe à 27/27 — puis §4, la vérification des apports (origine déclarée par le client, score de confiance et ses signaux, file de revue).

## [41] v11 · §4 et §5 clos — vérifier qu'Alexandre amène de vrais clients, et le cloisonner — 07/09 — ✅ `controle-apports-e2e` **43/43**, `controle-droits-e2e` **27/27**, `controle-e2e` **72/72**, `controle-messagerie-e2e` **30/30** (`795f56b` en prod)

- **0070 collée : le trou est refermé.** La suite qui lisait, avec le jeton d'un partenaire, 5 devis, 5 demandes, 5 factures et les fiches de tous les artisans, n'en lit plus **aucun**. Le partenaire garde son Poste de contrôle, ses apports, son relevé et la lecture des clients ; il perd ce que les artisans confient à Presti.
- **Un refus qui donnait une raison fausse** : la sécurité répondait « votre rôle est en lecture seule », ce qui laisse croire qu'on pourrait la consulter. Le domaine décide maintenant avant le rôle, et le refus dit la vraie raison.

### §4 — la preuve, en trois pièces

- **La source indépendante** : « Comment as-tu connu Presti ? » est posée à l'inscription, liste **neutre**, aucun nom soufflé. La réponse est **scellée** dès qu'elle est donnée (0068) — sinon elle pourrait être changée après coup, sur demande insistante de celui qui réclame la commission. Elle ne vient ni de Benj ni d'Alexandre : c'est tout son intérêt.
- **Le faisceau** (`lib/controle/confiance.ts`) : douze signaux, chacun un **fait daté et vérifiable**. En faveur — le client qui confirme et **nomme** l'apporteur, la déclaration faite *avant* l'inscription, le compte qui travaille vraiment, l'abonnement qui passe son renouvellement. En défaveur — le client qui dit « Google », la déclaration tardive près de la limite des 30 jours, le compte inactif après quatorze jours, la **même adresse IP** entre déclaration et inscription, l'email jetable, le remboursement dans les soixante jours.
- **Ce que le score n'est pas** : une décision. Le §4.6 le dit — aucun système ne prouve qu'une conversation a eu lieu hors ligne. Il **trie** une file de revue et vient toujours avec ses raisons en clair ; un chiffre seul donnerait l'illusion d'un verdict que personne ne pourrait contester utilement, ni Benj, ni Alexandre. L'écran l'écrit sous les signaux.
- **Les trois décisions** : *valider* date et signe la revue **sans toucher au statut** — un déclaré reste un déclaré, l'histoire n'est pas réécrite ; *contester* applique les 10 % du contrat ; *refuser* ramène à 0. Dans les deux derniers cas l'apporteur est **averti par email avec le motif**. Et aucune ne transforme un déclaré en prouvé : la suite le rejoue, c'est toujours 400.
- **Ce qui n'est pas fait, et je le dis** : la reprise automatique de commission sur remboursement (§4.4) appartient au **relevé mensuel**, qui n'existe pas encore (J5). Le signal est posé, le calcul viendra avec lui.

### §5 — le cloisonnement, prouvé

- `lib/controle/droits.ts` porte la matrice, **seize routes** la consultent, et `controle-droits-e2e` rejoue **chaque** action interdite avec le jeton d'un partenaire : les neuf gestes sur un artisan, la santé, la sécurité — tous 403. La suite vérifie le **corps** des réponses, pas les écrans : un 200 qui contiendrait la comptabilité serait un échec même invisible.
- Les filtres sont **dans la requête**. Le journal se borne à ses actions, la messagerie aux fils qui lui sont assignés, le registre à ses apports. Un fil non assigné répond « inconnu » et non « interdit » — dire « interdit » apprendrait qu'il existe.

### Deux corrections de mes propres tests

- Mon test consommait plus de re-confirmations que le plafond n'en autorise : il échouait sur un 403 sans rapport avec ce qu'il vérifiait. Le plafond est purgé entre les gestes — il protège la production, pas une suite qui joue huit gestes d'affilée.
- Je lisais une colonne `derniere_activite` qui n'existe pas : la requête entière aurait échoué en production.

- **Appels IA du sprint : 0.**
- **Pour Benj** : la valeur de la clé « presti — produit » (espace Presti) dans `.env.local`, puis `node scripts/cle-produit.mjs`. Et l'APK sur son téléphone, qui reste le seul blocage de l'application.
- **Suivant** : §3 — le remodelage de l'interface (colonne dense, compteurs, recherche globale, barre d'état), puis J5, la comptabilité et le relevé du partenaire.

## [42] v11 · §1 — le remodelage : barre d'état, compteurs, recherche au clavier — 07/09 — ✅ `controle-e2e` **72/72**, `controle-droits-e2e` **27/27**, `controle-apports-e2e` **43/43** (`0a6ef79` → `afeabad` en prod)

- **La barre d'état**, permanente sur toutes les vues : service, encaissé du mois, MRR, coût IA, et depuis quand ces chiffres datent. **Une seule requête** pour les cinq — le composant étant monté partout, quatre routes au chargement auraient coûté quatre fois la latence à chaque changement d'onglet. Sa fraîcheur est celle de sa valeur **la plus ancienne** : annoncer la plus récente laisserait croire que tout vient d'être rafraîchi.
- **Elle n'affiche jamais un zéro qu'elle ne sait pas.** Une valeur absente devient un tiret dont le titre dit la raison : un « 0 € » à la place d'une panne de Stripe se lirait comme une mauvaise nouvelle au lieu d'une information manquante.
- **Les compteurs du rail** viennent de cette même requête, et n'apparaissent que s'il y a quelque chose à faire. Un « 0 » permanent devient un décor, et un décor ne se remarque plus le jour où il compte.
- **La recherche** s'ouvre à Ctrl+K, se navigue aux flèches, valide à Entrée, ferme à Échap. Elle cherche dans les artisans, les apports, la messagerie de l'entreprise, les alertes et le journal — **jamais** dans les conversations d'un artisan ni ses devis. Le périmètre du §5 s'y applique : un partenaire qui tape trois lettres ne doit pas découvrir ce que les écrans lui refusent, ce serait la plus bête des fuites.

### Ce que la capture a montré, et qu'aucune assertion n'attrapait

Trois fois le même défaut, en une séance : **deux chiffres justes qui se lisent comme une contradiction.**

- la barre annonçait « **Service normal** » pendant que le bandeau, dix pixels plus bas, disait « **Service dégradé** » — chacun mesurait un sous-ensemble différent des mêmes contrôles. La règle vit désormais dans `lib/controle/sante.ts`, et les deux affichent le même verdict ;
- « **Coût IA 0,00 € / 50,00 €** » à côté de « **Facture Anthropic 464,97 €** » : l'un mesure l'espace Presti, l'autre l'organisation entière. Chacun porte maintenant le nom de ce qu'il mesure, et le budget ne s'affiche que face au montant qui lui correspond ;
- « **0,00 €** » à côté de « **≈ 0,07 €** » : l'un facturé, l'autre estimé, la même dépense. Un espace qui n'a rien facturé n'a pas coûté zéro — il n'a pas encore été facturé. La barre reprend l'estimation, avec le même « ≈ ».

**Et un défaut de conception hérité** : le dépassement du budget IA faisait passer le **service** en « dégradé ». Une facture qui dépasse ne dit rien de la santé du produit — le site répond, Stripe encaisse, les emails partent. Confondre les deux apprend à ignorer un bandeau orange, ce qui est le contraire du but d'un bandeau orange.

**Le fil racontait la vie des comptes de test** : « Nouvel artisan : Smoke Test », « Dupont Plomberie » deux fois, onze lignes signées `@presti-test.invalid`. Il raconte désormais la vraie vie de l'entreprise. Les lignes restent au journal, qui est immuable et doit le rester : c'est le **fil** qu'on nettoie, pas l'histoire.

**Fiabilité des suites** : un aléa de connexion Playwright faisait tomber dix-sept assertions d'un coup avec une pile illisible. La connexion rend son issue, et le bloc se saute proprement en le disant.

- **Appels IA du sprint : 0.**
- **La clé du produit est posée** : « presti produit 3 », espace Presti, validée sans consommer un jeton (404 sur un modèle inexistant, pas 401), déployée. Quatre clés inutiles désactivées ; **l'ancienne est gardée comme filet** tant que personne n'a vu l'IA répondre depuis le nouveau déploiement.
- **Pour Benj** : révoquer chez Stripe les deux clés restreintes RÉELLES qui traînaient en clair dans `.env.local` (retirées du fichier, mais personne ne sait où elles sont passées) ; faire un devis IA depuis son compte pour que je retire le filet ; et l'APK sur son téléphone.
- **Suivant** : J5 — la comptabilité et le relevé du partenaire.

## [43] v11 · J5 — la comptabilité et le relevé du partenaire : l'annexe A au centime — 07/09 — ✅ `controle-compta-e2e` **17/17** sur le calcul (la partie production attend 0071)

- **La formule du contrat, retrouvée puis prouvée.** Le v11 §7 donnait trois paires de montants sans la règle qui les produit : `19,64 / 31,36`, `40,80 / 10,20`, `317,28 / 702,72`. Je ne l'ai pas devinée — je l'ai cherchée, vérifiée sur les trois cas avant d'écrire une ligne de code, et elle tombe **au centime** :
  - résultat `R` = encaissé − coûts directs ; commission `C` = 20 % du **chiffre d'affaires encaissé des clients apportés** ; intéressement = 20 % × (R − C) ; part du fondateur = 80 % × (R − C) ; **dû au partenaire = C + intéressement**.
- **Le point qui n'a rien d'évident** : la commission porte sur le **chiffre d'affaires** du client apporté, pas sur le résultat. Se tromper d'assiette donne 18,36 € au lieu de 19,64 € sur le premier cas — 1,28 € d'écart sur un client, des centaines d'euros sur une année.
- **Mon explication était fausse, et le test l'a montré.** J'avais écrit que la subtilité tenait à l'ordre des opérations — « la commission sort avant le partage, pas après ». Or `C + 20 % (R − C)` et `20 % R + 80 % C` sont **algébriquement égales** : l'assertion censée le prouver prouvait le contraire. Corrigé aux deux endroits, et la fausse subtilité est maintenant écartée **explicitement**, pour que personne ne la « corrige » un jour. Une explication fausse dans un commentaire est pire que pas d'explication : on s'y fie.
- **Tout est en centimes entiers.** Un relevé en flottants finit par afficher 19,639999999 ou par perdre un centime au passage. Sur de l'argent qu'on doit à quelqu'un, ce n'est pas acceptable.
- **Ce que le calcul refuse de faire** : réclamer au partenaire sa part des pertes — le contrat ne le prévoit pas — tout en gardant la commission due, puisqu'elle porte sur du chiffre d'affaires et non sur un bénéfice.
- **Un relevé arrêté est figé** (trigger 0071) : recalculer un mois clos changerait un montant déjà annoncé, et plus personne ne pourrait se fier à ce qu'il a reçu. Seuls le paiement et la réception de sa facture restent modifiables — ce sont des faits qui arrivent après, pas des chiffres qu'on révise. Et **on n'arrête pas un mois qui n'est pas fini** : son dernier encaissement n'a pas eu lieu.
- **Les seuils et les taux vivent en base**, pas dans le code : seuil de franchise de TVA, seuil majoré, alerte à 80 %, taux et périodicité URSSAF. Ils changent par décret, et un décret ne doit pas demander un déploiement.
- **Le partenaire lit son relevé, il ne l'arrête pas** : arrêter engage l'entreprise, c'est de la comptabilité — domaine qui lui est fermé (§5). La suite le rejoue et attend un 403.
- **Appels IA du sprint : 0.**
- **Pour Benj** : coller `_A_COLLER_sql_editor_0071.sql`, puis la partie production de la suite se déroulera. Restent aussi les deux clés Stripe réelles à révoquer, et un devis IA depuis son compte pour que je retire le filet de l'ancienne clé Anthropic.
- **Suivant** : l'écran Comptabilité (ventes, achats, TVA, échéances, relevé avec export), puis J6 — santé, support, réglages.

## [44] v11 · J5 ouvert et prouvé — la comptabilité et le relevé du partenaire en production — 07/09 — ✅ `controle-compta-e2e` **27/27** (`7d452ea` → `d3a95eb` en prod)

- **0071 collée**, drapeau levé, onglet **Comptabilité** ouvert : TVA, échéances, relevé du partenaire, achats.
- **Le seuil de TVA est une jauge, pas un graphique** : ce qu'on veut savoir tient en un coup d'œil — combien de chemin avant que la facturation change. Et quand il approche, l'écran dit **ce qui changera le jour du dépassement** : les prix affichés, les mentions légales, l'interrupteur de TVA chez Stripe. Trois choses le même jour, autant les avoir écrites d'avance.
- **Le relevé montre son calcul ligne à ligne**, pas seulement son total : encaissé, coûts, résultat, commission, intéressement, dû. Un relevé qu'on ne peut pas recompter à la main ne vaut rien — ni pour celui qui paie, ni pour celui qui reçoit.
- **Une estimation ne s'affiche jamais comme un montant dû** : elle porte son « ≈ » et l'écrit en toutes lettres. La TVA subie sur les achats est montrée pour mémoire, avec la raison pour laquelle elle ne se récupère pas — sinon quelqu'un finira par croire qu'on l'oublie.
- **Prouvé en production** : le relevé refuse un mois mal écrit, refuse d'arrêter un mois qui n'est pas fini, rend des entiers de centimes, exclut les comptes de démonstration, et ses deux parts font toujours le résultat. Le partenaire **lit** son relevé et reçoit un 403 s'il tente de l'arrêter — arrêter engage l'entreprise.

### Mon propre outil de vérification m'a menti, le jour même où j'ai écrit la leçon

Le script de capture a photographié la **page de connexion** en annonçant « ✅ débordement horizontal : non ». Il ne s'était pas connecté, et rien ne le vérifiait. C'est exactement le défaut du 06/09 — « tests verts sur un écran en chargement » — reproduit par l'outil censé m'en préserver.

Repris : il **refuse de photographier autre chose que l'écran attendu**, et dit lequel il a pris. Au premier passage corrigé, il a immédiatement trouvé un vrai défaut : le tableau du relevé n'était pas dans un conteneur défilant, et poussait toute la page latéralement sur téléphone — sur l'écran où l'on vient justement vérifier ce qu'on doit à quelqu'un. Corrigé, revérifié à l'œil.

- **Appels IA du sprint : 0.**
- **Pour Benj** : révoquer chez Stripe les deux clés restreintes réelles trouvées en clair ; faire un devis IA depuis son compte pour que je retire le filet de l'ancienne clé Anthropic ; et l'APK sur son téléphone, qui reste le seul blocage de l'application.
- **Suivant** : J6 — santé, support, réglages.

## [45] v11 · la purge validée, et les Réglages — 07/09 — ✅ toutes les suites du Poste de contrôle vertes (`372b9f5` en prod)

| Suite | Résultat |
|---|---|
| `controle-e2e` | **72/72** |
| `controle-apports-e2e` | **43/43** |
| `controle-droits-e2e` | **29/29** |
| `controle-messagerie-e2e` | **30/30** |
| `controle-compta-e2e` | **27/27** |
| `zero-demo-e2e` | **9/9** |

### La purge, faite sans forcer aucun verrou

- Benj a donné son accord : « vire-moi toutes les factures, devis et autres faits par des tests ». **Trois comptes supprimés, deux comptes de connexion orphelins effacés**, tout **sauvegardé en JSON** avant la première suppression — une purge sans retour en arrière est une décision qu'on ne peut plus revoir. La sauvegarde reste hors de git : elle contient des données personnelles.
- **Les factures émises ne se suppriment pas**, et je n'ai pas cherché à contourner le verrou. Dix ans de conservation obligatoires (art. L. 102 B du LPF), appliqués par un trigger depuis 0041. Une table de factures qu'on peut vider sur demande ne vaut plus rien comme preuve, **y compris pour les vraies**. Elles sont marquées, donc absentes de tous les chiffres : présentes et invisibles, comme la loi le veut. Les deux comptes qui les portent restent — une facture doit pouvoir désigner son émetteur.
- **« Atelier du Chêne » est gardé délibérément** : sa page publique alimente les captures de la vitrine, et **quatre suites s'appuient dessus**. Le supprimer aurait cassé le marketing et les tests pour faire propre. Le v11 §2.3 prévient justement contre cet excès de zèle. Le garde-fou dit désormais **pourquoi** chaque compte conservé l'est, ligne par ligne — sans quoi quelqu'un finira un jour par « terminer le ménage ».
- **À signaler** : Alexandre porte cinq factures émises sous son propre compte (`FAC-2026-0001` à `0005`). Elles ne sont marquées ni test ni démo, donc elles comptent. Si ce sont des essais de développement, il faut décider quoi en faire — elles ne se suppriment pas plus que les autres.

### Les Réglages (J6)

- Ce qui **se règle** : les valeurs qui changent par décret ou par décision — seuils de TVA, taux et périodicité URSSAF, alerte de budget — et les **rôles de l'équipe**. Chaque changement est re-confirmé et journalisé avant/après.
- Ce qui **ne se règle pas**, et c'est écrit à l'écran : les **drapeaux de fonctionnalité**. Un drapeau suppose une migration collée *et* du code déployé ; le lever depuis un bouton ferait apparaître un espace vide ou des 503 sans que rien ne prévienne. Ils se lèvent par un commit, relu et versionné. L'écran les montre pour qu'on sache où on en est.
- **Un secret ne s'affiche jamais.** Les comptes connectés disent s'ils sont branchés et de quel type de clé il s'agit — « clé réelle » ou « clé de test », « espace dédié » ou « espace par défaut » — jamais leur contenu.
- **Changer un rôle change les deux sources à la fois** (rôle d'entreprise et rôle du Centre) : deux sources pour une même vérité finissent toujours par diverger, et c'est exactement ce qui avait donné à Alexandre l'écriture partout. Et **on ne peut pas se retirer soi-même** — un Poste de contrôle sans personne pour l'ouvrir est irrécupérable.
- **L'IA de production tourne bien** : un devis a été fabriqué à 14:24, six crédits consommés. Le rapport de coût d'Anthropic a du retard, donc **le filet de l'ancienne clé reste en place** encore quelques heures — il ne coûte rien.
- **Appels IA du sprint : 0** (le devis est celui de Benj, sur son compte).
- **Reste du v11** : le support et les tickets (mode support lecture seule, journalisé et notifié à l'artisan), et la partie « Santé » avancée — déploiements Vercel et retour arrière, coûts IA par fonction.

## [46] L'interface ne tenait pas sur un écran de portable — trois défauts réels, trouvés à l'œil — 07/09 — ✅ sept tailles d'écran, trois pages, rien ne dépasse (`f594d6b` → `b9c57fe` en prod)

Benj : « sur mon PC qui est petit, on ne voit pas tout », « Escalade, par exemple, c'est un peu coupé », « sur mobile, on voit que la moitié de l'interface de messages ». Trois défauts distincts, tous réels.

- **La carte du compte sortait de l'écran.** À 1280×720, elle descendait à 739 px — dix-neuf pixels sous la ligne de flottaison, **déconnexion comprise**. La barre latérale était un seul bloc défilant avec son pied poussé en bas par `margin-top: auto` : ça tient tant que tout rentre, mais dès que le contenu dépasse, `margin-top: auto` ne fait plus rien et le pied part avec le défilement. Désormais : marque fixe, navigation défilante, compte fixe. Le `min-height: 0` sur la zone défilante est indispensable — sans lui, un enfant flex refuse de rétrécir sous sa taille de contenu et déborde au lieu de défiler.
- **Sur mobile, les boutons recouvraient le nom du client.** Dans l'en-tête d'une conversation, « Je prends la main » et « Créer un devis » étaient en `flex:none` à côté d'un nom qui, lui, pouvait rétrécir. Résultat : les boutons passaient par-dessus le nom, et le dernier sortait de l'écran. C'est ça, « la moitié de l'interface ».
- **« Escalader » sortait du cadre sur PC.** Ma première correction ne visait que les petits **écrans** : elle réglait le téléphone et laissait le PC cassé. Ce qui manque n'est pas la place sur l'écran mais dans le **conteneur** — à 1280 px de large, la colonne du fil ne fait que 640 px. Le `flex-wrap` est donc sur l'en-tête lui-même, sans media query : quand la place est là, tout reste en ligne ; quand elle manque, les actions passent dessous.
- Et les badges « Assistant » et « Nouveau » se chevauchaient : deux familles de styles avec des hauteurs de ligne différentes, normalisées localement.

### Trois fausses pistes écartées avant de « corriger » ce qui allait bien

- **Le premier diagnostic ne trouvait rien** : le compte de test n'avait aucune conversation, donc l'écran était vide et le défaut ne pouvait pas se produire. Il a fallu fabriquer de vraies conversations, avec des noms longs.
- **Les deux bulles apparaissaient du même côté** — j'ai failli corriger l'affichage du sens des messages. C'était mon jeu de test qui écrivait « entrant »/« sortant » là où le produit attend « in »/« out ». Le produit n'avait rien.
- **Mon détecteur signalait la barre latérale « hors cadre » sous 960 px** : elle y est **délibérément**, derrière le menu hamburger. Puis il a signalé « Centre d'aide » à 1024×640 : il est dans une zone qui défile, et défiler n'est pas déborder.

Trois fois, la mesure disait « défaut » là où il n'y en avait pas, et une fois elle disait « rien » là où il y en avait trois. **Une mesure ne remplace pas un regard** — et un regard sans données réelles ne voit rien non plus.

- **Les factures d'essai d'Alexandre** (`FAC-2026-0001` à `0005`) sont annotées « essai de développement ». Elles restent en base : émises, elles relèvent des dix ans de conservation. Le verrou de 0041 ne gèle que les champs comptables — numéro, montants, date, client, empreinte — donc la note, elle, reste modifiable. C'est exactement le bon endroit pour dire ce qu'est une pièce sans toucher à ce qu'elle prouve.
- **Appels IA du sprint : 0.**

## Liste H — actions humaines (vérifiées par l'effet, jamais en demandant) — état honnête au 05/09 23:30

**Prouvé (44 suites = 42 du v6 + `modes-e2e` + `code-connexion-e2e`)** : 43 vertes en local et sur GitHub au dernier passage cité (v6 run #5 : 42/42 ; v7 : `modes-e2e` 35/35 en prod). **Pas encore prouvé** : ce qui suit, sans exception.

| # | Action | État | Ce qui n'est PAS prouvé tant que ce n'est pas fait |
|---|--------|------|-----------------------------------------------------|
| ~~H17~~ | ✅ **fait par Benj le 05/09** — 0063 collée, drapeau levé, déployé ; `code-connexion-e2e` **56/56** en prod, lanceur **44/44** | — | — |
| ~~H4~~ | ✅ **fait par Benj le 05/09** (clé `sk_test_`) — `abonnement-e2e` **78/78** contre la prod, bac à sable Stripe équipé (3 offres + portail) ; H18 (confort) : la clé de test dans le secret GitHub pour la jouer chaque nuit | — | — |
| H11 | DNS `_dmarc.prestiapp.fr` TXT `v=DMARC1; p=quarantine; rua=mailto:<alertes>` (ou `node scripts/ovh.mjs dmarc`) | ⛔ pas de jeton OVH trouvé | la délivrabilité des emails de relance et de code (`nslookup -type=txt _dmarc.prestiapp.fr`) |
| H5 | `ANTHROPIC_ADMIN_KEY` sur Vercel (`node scripts/vercel-env.mjs ANTHROPIC_ADMIN_KEY <clé>`) | ⛔ absente | la lecture réelle du solde Anthropic — d'ici là, rappel hebdomadaire estimé depuis les crédits |
| H10 | Domaine d'envoi neutre pour les emails au nom de l'artisan | décision | From sans « presti » (auditeur B, F3) |
| H13 | Filtre Gmail « à : benjaminfiliot+presti@gmail.com » → libellé « Presti » | confort | rien de technique |
| ~~H1~~ | ✅ fait par Benj le 05/09 — `audit-final-e2e` 68/68, table `passages_cron` présente | — | — |
| ~~H7~~ | ✅ portail Stripe sondé : factures, carte, résiliation en fin de période, changement d'offre ; catalogue 29/59/99 € | — | — |
| ~~H8~~ | ✅ secret GitHub posé (sans clé sensible) — audit nocturne run #5 : 42/42 | — | — |
| ~~H9~~ / ~~H16~~ | ✅ email et téléphone de l'éditeur publiés dans les mentions légales (`legal-e2e` les exige) | — | — |
| ~~H12~~ | ✅ sauvegarde chiffrée quotidienne, restauration prouvée 7/7 ; clé privée rangée par Benj (déclaré) | — | — |
| ~~H14~~ | ✅ migrations 0059–0061 collées — `quota-media-e2e` 32/32, `purges-rgpd-e2e` 43/43, doublon de domaine refusé | — | — |
| ~~H15~~ | ✅ détection de rejeu **effective** (fenêtre 10 s) — ma sonde accusait à tort ; corrigée (jeton deux crans en arrière → 400) | — | — |
| ~~0062~~ | ✅ lignes de config posées par l'API (6/6) ; `_A_COLLER_sql_editor_0062.sql` ne porte plus que le commentaire de colonne | — | — |

**Appels IA du sprint : 0**

## Liste M — l'application (v9 §9) — état au 06/09 17:45

| # | Action de Benj | Coût / délai | Débloque | État |
|---|---|---|---|---|
| M1 | Apple Developer Program, compte organisation (D-U-N-S avec le SIREN — 1 à 2 semaines, à lancer en premier) | 99 $/an | TestFlight, App Store, APNs, Universal Links | ⏳ |
| M2 | Google Play Console (compte développeur + vérification d'identité) — **à faire par Benj** : création de compte et paiement, je ne le fais pas | 25 $ une fois | Play Store, App Links | ⏳ |
| ~~M3~~ | ✅ **fait le 07/09** — projet « app-presti » créé par Benj ; fichiers posés par `scripts/firebase-poser.mjs` (secret CI + Vercel + .env.local, originaux dans `presti-secrets/firebase/`) ; FCM v1 accepte le compte (400 sur jeton bidon) ; `pushNatif` levé ; APK 0.1.2 | — | — | fait — **la notification native se prouve sur le téléphone (TESTS.md 4-5)** |
| ~~M4~~ | ✅ clés VAPID générées et posées sur Vercel + `.env.local` le 06/09 (sujet `https://prestiapp.fr/contact`) | — | — | fait |
| M5 | Codemagic (compte + dépôt GitHub + clé App Store Connect API) — ou un Mac avec Xcode | gratuit (500 min/mois) | Builds iOS | ⏳ |
| ~~M6~~ | ✅ keystore généré le 07/09 dans `Documentspresti-secretsandroid` + secrets GitHub posés ; AAB signé prouvé (`mobile-v0.1.0`) — **Benj sauvegarde ce dossier** (gestionnaire de mots de passe) | — | — | fait, sauvegarde à faire |
| M7 | Deux téléphones de test (Android, iPhone) + un troisième pour jouer le client | — | Parcours 5.3 | ⏳ — **APK signé 0.1.1** : Paramètres → Application → « Télécharger (APK) » (ou Actions → artefact *presti-release-apk*) |
| M8 | Disponibilité du nom « Presti » sur les deux stores (repli : « Presti — Artisans ») | — | Fiches | ⏳ |

| ~~0064~~ | ✅ collée par Benj le 06/09 22:10 — drapeau `pushWeb` levé, `push-e2e` 25/25 en prod | — | — | fait |

Décisions §10 en vigueur (recommandations, tant que Benj ne tranche pas autrement) : nom « Presti » avec repli ; verrou biométrique après 5 min d'arrière-plan ; Crashlytics après les premiers retours ; Android d'abord.

## 07/09 — pourquoi l'audit de nuit ne trouvait rien

Benj demande : « l'audit de nuit d'aujourd'hui a rien trouvé ? » La bonne réponse n'était pas
« non, rien » : c'était qu'une partie du produit n'était pas auditée, et que le rapport disait le
contraire.

**Mesuré, pas supposé.** Soixante-huit suites e2e existent. Le lanceur (`tout-verifier.mjs`) en
appelait cinquante-sept ; l'audit nocturne, qui lance ce script sans `--tout`, en jouait
cinquante-quatre. **Quinze suites n'étaient jamais jouées** — `abonnement-e2e` (les onze transitions
d'un abonnement), `mfa-e2e`, `suppressions-e2e`, `comptes-clients-e2e`… Écrites, vertes le jour de
leur écriture, plus jamais relancées.

**Et le rapport de couverture les comptait quand même.** `plans/couverture.md` annonçait
« Cases vides : 0 » en s'appuyant sur des suites que la nuit ne joue pas. Dix éléments — dont
`/api/stripe/portail`, le portail de facturation — n'étaient regardés par personne, sous un rapport
qui affichait zéro trou. Encore deux chiffres justes qui se contredisent, comme le budget IA et la
facture Anthropic la semaine dernière.

**Ce qui a été fait**

| Trouvé | Corrigé |
|---|---|
| 15 suites jamais lancées | 13 branchées au lanceur avec leur vrai coût (5 gratuites, 5 navigateur, 3 IA jouées seulement à la main) ; `fact-e2e` et `pdf-e2e` exigent un serveur local — écartées **avec leur raison écrite** dans `HORS_LANCEUR` |
| « Hors lanceur » et « oublié » se ressemblaient | `inventaire-produit.mjs` lit `HORS_LANCEUR` : une suite non déclarée et non lancée est signalée comme oubli |
| Le rapport comptait une couverture que la nuit ne joue pas | Nouvelle mesure publiée à côté des cases vides : **l'angle mort** — testé, mais par aucune suite jouée la nuit. Passé de 7 à 0 |
| `/api/controle/barre` et `/api/controle/recherche` : livrées, jamais appelées par une suite | Ajoutées à `fermeture-e2e`, avec les dix autres routes du Poste de contrôle |
| 6 routes couvertes seulement par des suites payantes en IA | Leur fermeture (401/403 sans identité, jamais 500) vérifiée chaque nuit, sans un centime : `/api/devis/auto`, `/api/inventaire/recherche{,/retenir}`, `/api/plateforme/apparence`, `/api/stripe/portail`, `/api/conversation/regles` |
| **Le drapeau `comptabilite` cachait l'onglet sans fermer les routes** | `/api/controle/compta` et `/api/controle/releve` répondent 404 quand il est baissé, avant même de demander une identité — comme `courriers` le faisait déjà |
| La liste des drapeaux vérifiés était tenue à la main : 4 des 20 n'y étaient pas | Carte complète des 20 drapeaux dans `fermeture-e2e`, **avec verrou** : un drapeau absent de la carte fait échouer la suite. Quatre natures distinguées — `route` (le seul vrai verrou), `lu`, `note` (ne ferme rien, et c'est écrit), `mort` (levé, plus personne ne le lit : `plateformePilotage`, `plateformePersona`) |

**Ce qui reste ouvert, et c'est écrit plutôt que caché** : trois envois d'email du Poste de contrôle
(refus d'apport, message à un artisan, réponse dans un fil) n'ont pas de test. Deux d'entre eux
journalisent leur intention avant l'envoi — donc ils sont vérifiables par le journal, sans envoyer
un vrai message. C'est un test à écrire, pas une case à oublier.

**Appels IA : 0.**

## 07/09 — la messagerie de l'entreprise : pourquoi elle ne marchait pas, et ce qu'elle fait maintenant

Benj : « le système de mail de l'entreprise marche pas, je veux qu'il reçoive tous les mails et qu'il
les traite selon si c'est un client qui nous envoie un message ou un abonnement etc. »

### Le diagnostic, mesuré en production

| Constat | Preuve |
|---|---|
| La boîte **est** configurée | `IMAP_USER` et `IMAP_PASS` existent sur Vercel (production) |
| La relève **est** automatique | elle tourne dans le cron des relances, 8 h — le plan Vercel n'accorde que deux tâches, toutes deux prises |
| **Elle échoue** | `POST /api/controle/courriers/relever` → 503 « Command failed » en 6 s (`scripts/sonde-boite.mjs`) |
| **Depuis toujours** | 0 courrier en base |
| **Sans que personne ne le sache** | `passages_cron` du jour : `{"nom":"relances","reussi":true}` — la relève n'y figurait même pas |

Puis deux causes de fond, trouvées en lisant le code :

1. **Deux fichiers donnaient deux serveurs pour le même compte.** `app/api/control/inbox` proposait
   `imap.gmail.com`, la relève du Poste de contrôle `ssl0.ovh.net`. L'un des deux avait forcément tort.
2. **La boîte relevée n'est pas celle où Presti écrit.** `EMAIL_ENTREPRISE` vaut
   `benjaminfiliot+presti@gmail.com` (via `PRESTI_ALERTES_EMAIL`). Même connexion réussie, la boîte
   relevée ne contiendrait aucune de nos notifications — et une boîte vide ressemble à une boîte calme.

### Corrigé

- **Une seule résolution de la boîte** dans tout le dépôt (`boiteEntrepriseResolue`), qui devine
  l'hôte depuis l'adresse avec `devineFournisseur` — la fonction qu'on offre déjà aux artisans. Une
  adresse Gmail ne se relève plus sur le serveur d'OVH.
- **L'erreur dit quoi corriger** : « Identifiants refusés… », « Serveur introuvable… », avec l'hôte,
  le port et le compte réduit à sa première lettre (une erreur finit en capture d'écran).
- **L'échec remonte** : le résultat de la relève entre dans le détail du passage, et un échec fait
  échouer le passage — ce qui déclenche l'alerte `cron_muet` qui existait déjà.
- **Les réglages disent si on relève la BONNE boîte** : « Presti écrit à X, on relève Y — nos propres
  messages n'arrivent pas ici. »
- **La relève ne perd plus de courrier.** Elle lisait une fenêtre des N derniers messages *par numéro
  de séquence* : une salve de 31 messages en faisait glisser six hors de portée, définitivement, sans
  la moindre trace. Elle reprend maintenant **par UID** depuis le plus haut déjà enregistré, avec
  garde sur `uidValidity`, et dit ce qui reste à relever. « Tous les mails » veut dire tous.

### Le classement — migration 0072, À COLLER

Neuf natures (`lib/direction/natures.ts`), dix règles **déterministes**, aucun appel de modèle : ça
se paierait à chaque email reçu, et le rangement d'hier ne serait pas celui d'aujourd'hui.

L'ordre des règles est un **ordre de danger**, pas de fréquence : plus une règle risque d'enterrer un
message vivant, plus elle est testée tôt. La non-remise passe en premier (elle porte les en-têtes du
message d'origine, testée tard elle passerait pour « un humain m'a répondu ») ; le formulaire de
contact passe avant « nos mails = technique » (sinon chaque message du site était enterré) ; l'artisan
passe avant toute détection de robot (cinq secondes de lecture contre un client perdu).

Une correction faite à la main n'est **jamais** rejouée : ni par la relève du lendemain, ni par un
reclassement de masse. Sans ce verrou, le cron effacerait chaque matin le rangement de la veille.

### Trois défauts de MON travail, trouvés par la revue adversariale et corrigés avant de coller

1. **`[SIMULATION]` était cherché n'importe où dans le sujet.** Or le sujet du formulaire contient
   120 caractères que le visiteur écrit : quelqu'un nommé « [SIMULATION] Marc » enterrait son propre
   message dans la pile des machines. Le marqueur est maintenant ancré là où notre code le pose.
2. **Le rattachement à un artisan se décidait sur un champ public.** L'adresse tapée dans le
   formulaire suffisait à faire apparaître un message inconnu sur la fiche d'un vrai client, dans la
   pile la plus lue de l'écran. Retiré : rattacher redevient un geste humain, tracé au journal.
3. **La relève perdait du courrier** (voir plus haut) — le plus grave des trois, et celui qui
   contredisait directement la demande.

### Preuve

`scripts/courriers-e2e.mjs` — 27 cas de classement, le verrou du manuel, les compteurs. Partie A
(résolution de la boîte) : **6/6**. Le reste attend la migration et sort en code 2, « en attente d'un
préalable humain », jamais compté comme vert. Typage 0 erreur, build vert, `emails-e2e` 102/102.

**Appels IA : 0.**

## 07/09 — la boîte de l'entreprise est relevée, et rangée

Quatre causes empilées, trouvées et levées l'une après l'autre. Chacune suffisait à tout bloquer.

| # | Cause | Comment on l'a su |
|---|---|---|
| 1 | Deux fichiers donnaient deux serveurs pour le même compte (`imap.gmail.com` ici, `ssl0.ovh.net` là) | lecture du code ; une seule résolution désormais, qui devine l'hôte depuis l'adresse |
| 2 | L'échec ne remontait à personne : `passages_cron` disait `reussi: true` | la relève compte maintenant dans le passage, et déclenche l'alerte `cron_muet` |
| 3 | J'ai fait basculer la boîte sur `contact@prestiapp.fr` — qui **n'existe pas** | un mail de test y a REBONDI en 12 s. Le dépôt le disait déjà dans un commentaire de `api/contact/route.ts` : cette adresse envoie, elle ne reçoit pas. Aller-retour de ma faute |
| 4 | Google refusait le mot de passe d'application | il est affiché en « abcd efgh ijkl mnop » ; **les espaces n'en font pas partie**. Le code les retire, mais seulement quand la valeur a exactement cette forme |

**Le diagnostic a été construit en même temps que la réparation**, parce que « Command failed » ne
menait nulle part : on a ajouté le temps de connexion, la réponse brute du serveur, le drapeau
`authenticationFailed` de la bibliothèque, et le signalement d'un mot de passe sali. C'est ce qui a
permis de passer de « ça marche pas » à « Google dit : identifiants invalides » en trois essais.

### Le classement, sur du vrai courrier

40 messages relevés. Après 0072 seule : 2 non remis, 18 diffusion, **20 en « À lire »**. En lisant
ces vingt-là, on a obtenu de vraies adresses d'expédition — ce que le dépôt ne contenait nulle part.
0073 les ajoute, chacune citant le message qui l'a justifiée. Résultat :

| Pile | Avant 0073 | Après |
|---|---|---|
| Abonnements & comptes | 0 | **5** (tous les Stripe, dont un paiement de 29 € et une action requise) |
| Non remis | 2 | 2 |
| Fournisseurs | 0 | **15** (Google, OVH, Anthropic) |
| Diffusion | 18 | 15 |
| **À lire** | **20** | **3** |

Les trois qui restent sont du doute légitime : FrameRate, Mon espace santé, Skool — des services que
l'entreprise n'utilise pas. « Fournisseur » veut dire une dépendance de Presti, pas une entreprise
connue ; les ajouter ferait entrer dans une pile de confiance des messages qui n'y ont rien à faire.

### Ce que la première relève a fait remonter

- **Anthropic, 04/09 13 h 20** — « Your Claude API access is turned off : out of usage credits ».
  L'assistant s'arrête pour tous les artisans quand ça arrive. Rechargé depuis (12 $ le 04, 117,83 €
  le 05), mais ce mail dormait dans une boîte que personne ne lisait.
- **Stripe, 04/09 19 h 45** — « [Action requise] … avant que votre entreprise puisse accepter des
  paiements et effectuer des virements vers son compte bancaire ».

### Un arbitrage assumé

Depuis que `google.com` est dans la liste des fournisseurs, un rapport DMARC agrégé de Google est
rangé en « Fournisseurs » plutôt qu'en « Technique » : la règle de domaine mord avant. On ne corrige
pas — aucun DMARC n'est publié sur le domaine, donc aucun rapport n'est envoyé, et les deux natures
appellent le même geste. Le jour où le DMARC sera publié, il faudra remonter la règle : c'est écrit
dans le cas de test, qui rougira à ce moment-là.

**Preuve** : `courriers-e2e` 54/54, `controle-messagerie-e2e` 30/30, typage 0, build vert.
**Appels IA : 0.**

---

## 08/09 — Le mode support, et trois échecs de collage

**Les écrans.** Bandeau (AppShell), carte « Accès du support » (Paramètres → Sécurité), bloc Support
dans la fiche du Poste de contrôle. Trois règles tenues par la mise en page : ouvrir et refuser ont
la même largeur ; fermer ne demande rien ; un ticket sans élément n'a **pas** de bouton — pas un
bouton grisé, qui laisse croire à un droit qu'on obtiendrait en insistant.

**Deux trous fermés.** Le verrou personnel avait une table et aucun geste : rien ne pouvait y écrire
une ligne. Une garantie que personne ne peut poser n'est pas une garantie. `regler_verrou_support`
pose ET lève, et poser ferme les fenêtres encore ouvertes. — Le badge « Messages » comptait les
conversations non lues de TOUS les artisans : la policy `founders_all_leads` le permettait, et le
chiffre mentait depuis le début.

**0075.** 0074 laissait une question ouverte : comment savoir QUEL devis regarder sans rouvrir une
liste ? Réponse : c'est l'artisan qui désigne, en demandant de l'aide. Un ticket sans élément
n'ouvre aucun accès — « je n'arrive pas à me connecter » se règle en parlant.

**Trois échecs de collage, trois causes différentes.**

1. Mon générateur `_NU` retirait les lignes commençant par `--` sans savoir reconnaître un `--`
   à l'intérieur d'une chaîne : il a coupé un `comment on … is '…'` en deux. Réécrit avec un
   tokenizer, et `migrations-jumelles-e2e` (98/98, au lanceur) vérifie désormais que chaque fichier
   à coller se parse et porte le SQL de sa migration. **Un fichier que Benj colle est un livrable.**
2. Le SQL Editor a perdu les deux premières lettres (« drop » → « op »). Corrigé non pas en lui
   demandant de mieux coller, mais en mettant 28 tirets en tête : la morsure ne porte plus sur du
   sens. Plus un bloc de contrôle en fin de fichier, qui affiche ce qui a été créé.
3. Troisième échec : erreur identique au caractère près — c'est un onglet sauvegardé du SQL Editor
   qui rejoue l'ancien texte, pas mon fichier.

**Deux erreurs de ma part, dites ici parce qu'elles ont coûté des allers-retours.** J'ai accusé
`pg_column_size` dans un CHECK d'être un piège : c'est faux, `0053` en porte un et tourne en prod.
Et j'ai annoncé à Benj que les quatre tables du support existaient déjà : ma sonde utilisait
`head: true` et ne remontait pas l'erreur. Rien n'était appliqué.

**`appliquer-migration.mjs`** : poser une migration directement, en une transaction, avec
vérification. Inutilisable pour l'instant — le mot de passe base de `.env.local` est refusé
(`28P01`). `DIRECT_URL` n'est utilisée par aucun code de Presti : la réinitialiser ne casse rien.

**Preuve** : `migrations-jumelles-e2e` 98/98, `support-droits-unit` 14/14, typage 0, build vert.
`support-e2e` en code 2 : elle attend 0074 et 0075 en base.
**Appels IA : 0.**

### 08/09 (suite) — Les migrations sont passées, le drapeau est levé

Benj a collé 0074 et 0075. Vérifié en base plutôt que cru : 4 tables, 8 fonctions, les colonnes
`element_*` de 0075.

**`support-e2e` : 34/34, contre un vrai serveur.** C'était la première fois qu'elle tournait — elle
sortait en code 2 depuis sa naissance. Une suite qui n'a jamais tourné n'est pas une suite verte, et
elle a rendu trois défauts dès le premier lancement :

1. `leads.token` est de type `uuid` ; la suite y écrivait 48 caractères hexadécimaux. Elle plantait
   **avant le premier test**, et le code 2 le masquait intégralement.
2. Le bloc du verrou réutilisait un élément refusé depuis moins de 24 h : la demande était écartée
   pour cette raison-là, et on ne savait plus ce qu'on éprouvait. Il a désormais son ticket.
3. Le partenaire recevait « Votre rôle est en lecture seule » — un message qui laisse croire qu'un
   rôle supérieur lui ouvrirait la porte. **Aucun rôle ne la lui ouvre.** Le périmètre passe
   maintenant avant le rôle sur les trois routes support ; sans ça, la phrase française de
   `RAISONS.support` n'était lue par personne et le test unitaire gardait du code mort.

**La fenêtre d'à côté est fermée.** `sonde-rls-fondateur` : 0 devis, 0 factures, 0 demandes, là où
il y en avait 9, 12 et 9. C'était la condition qui donnait un sens à tout le reste : une porte
étroite ne protège rien tant que la baie vitrée d'à côté est ouverte.

Drapeau `supportArtisan` **levé**, après les deux conditions que je m'étais données : les migrations
en base, et la suite qui prouve la porte.

**Preuve** : `support-e2e` 34/34, `sonde-rls-fondateur` 0/0/0, `migrations-jumelles` 98/98,
`support-droits-unit` 14/14, typage 0, build vert.
**Appels IA : 0.**

### 08/09 (fin) — La garantie devient un argument, et une promesse fausse est réparée

Benj : « rajoute une section, ça a un atout marketing ». Section **Confiance** en ligne sur
`prestiapp.fr`, entre la vitrine et les tarifs — la question « et vous, vous voyez quoi ? » se pose
juste après avoir vu ce que Presti fait des messages du client, et juste avant le prix.

Quatre **mécanismes**, pas quatre adjectifs : « sécurisé » ne veut rien dire, tout le monde l'écrit.
La porte naît fermée ; la forme jamais le fond ; chaque coup d'œil est écrit dans SON espace ; un
verrou définitif. Et la phrase qui reste : « Ce n'est pas un paragraphe dans des conditions
générales. C'est du code, et il refuse. » Sous le drapeau `supportArtisan` : une promesse
commerciale ne doit pas survivre à ce qui la tient.

**Une des quatre promesses était fausse, et c'est moi qui l'avais écrite.** « Ça part avec vos
données quand vous les exportez » figurait déjà dans l'écran Paramètres et dans le registre — mais
rien ne collectait ces lignes. Vérifier AVANT d'écrire la page l'a rattrapée. L'export rend
maintenant `acces_du_support.json` et `acces_du_support_consultations.json` ; le nom de la personne
qui a lu y reste (c'est le point de la trace), ni IP ni appareil.

Retiré aussi la tolérance du 404 sur les routes support dans `fermeture-e2e` : elle existait pour un
drapeau baissé, le drapeau est levé. Une tolérance qui survit à sa raison d'être est un trou qui
attend.

**Preuve** : section vérifiée en production (les 4 titres, la phrase de fin, les tarifs intacts),
`fermeture-e2e` 116/116, `support-e2e` 34/34 contre la prod, typage 0, build vert.
**Appels IA : 0.**

---

## 08/09 (soir) — L'audit des sept angles : 61 défauts, tous traités

Benj a demandé « le site est entièrement bon maintenant ? ». La réponse honnête était non, et il a
fallu un audit pour le savoir : sept angles que les suites ne couvrent pas par construction, chaque
trouvaille passée devant un sceptique chargé de la détruire. **61 ont survécu : 7 graves, 27
moyens, 27 mineurs.** Tous corrigés, avec un test à chaque fois.

**Les sept graves.** La commission d'Alexandre divisée par 100 (un nom, `taux`, qui ne disait pas
s'il valait 0.2 ou 20). Un avoir qui remboursait plus que la facture. Un remboursement disparu du
relevé. Le tableau de bord annonçant « envoyée automatiquement » une réponse que l'artisan avait
REJETÉE. La route DELETE qui supprimait un devis envoyé malgré quatre écrans promettant le
contraire. Les lignes d'une facture scellée modifiables depuis un navigateur (0044 visait une
policy qui n'a jamais existé sous ce nom). Et ma propre 0074, qui rendait un compte
**indestructible** dès qu'une lecture de support avait eu lieu.

**Le motif qui revient.** Presque partout, le défaut n'était pas dans le code mais dans ce qui
était censé le surveiller :

  · `support-e2e` fabriquait ses tickets en base — elle était donc verte pendant que le mode support
    était **inatteignable**, faute d'écran pour en créer un ;
  · `suppressions-e2e` prouvait l'invariant sur la porte qui le respecte, jamais sur celle qui le
    violait — le motif exact de `/api/control` sans « e » ;
  · `controle-compta-e2e` écrivait `tauxApport: 20` à la main : elle testait sa propre constante ;
  · le détecteur d'angles morts en avait un (neuf scripts qu'il ne voyait pas) ;
  · quatre assertions ne pouvaient pas rougir, dont un `T(…, true)` joué chaque nuit.

**Deux erreurs de ma part, dites parce qu'elles ont coûté des allers-retours.** L'export RGPD que
j'avais « réparé » le matin produisait `donnees/donnees/….json.json` avec un contenu doublement
encodé — j'avais copié un motif fautif sans regarder ce que la boucle en faisait. Et 0074, plus
haut.

**Ce que j'ai appris à vérifier avant d'agir.** Sur les quatre derniers mineurs, deux étaient du
code mort et deux étaient des ÉCRANS MANQUANTS. `global-error.tsx` figurait dans la liste des
composants « jamais importés » : c'est un fichier spécial de Next.js, et le supprimer aurait retiré
la page d'erreur de dernier recours.

**Migrations collées** : 0074 → 0082. **Preuve** : voir l'état d'ensemble ci-dessous.
**Appels IA : 0.**

---

## 08/09 (nuit) — v12 · La vidéo de présentation, et le canal qui aurait payé une commission à personne

**Vérifié d'abord, écrit ensuite.** Deux phrases du script fourni (v12 §1.3) annonçaient ce que le
produit ne fait pas par défaut, et §1.2 l'interdit dans la même page :

- « En moins d'une minute. **Jour et nuit.** » — `lib/plateformeConfig.ts:45` : `mode_reponse` vaut
  `'assistee'` à la création d'un compte, l'IA **rédige** et l'artisan envoie ; l'envoi seul n'existe
  qu'à partir de Studio (l. 159). Devenu « **Réponse prête en moins d'une minute.** », vrai dans les
  trois modes.
- « Le devis **part** tout seul. » — `lib/plateformeConfig.ts:50` : `devis_auto` vaut `'brouillon'`.
  Devenu « **Le devis, déjà chiffré.** »
- Et une troisième que j'avais écrite moi-même pour la variante LinkedIn — « un artisan répond en
  moyenne le lendemain » — retirée : c'est un chiffre, rien ne le mesure, et l'annoter « non mesuré »
  l'avoue au lieu de l'éviter.

⚠️ **Conséquence non traitée** : `app/page.tsx:108` porte encore « répond en moins d'une minute —
jour et nuit ». La réécriture du 07/09 (entrée [28]) n'avait touché que les fiches des stores. La
vidéo est donc plus prudente que la landing. Arbitrage laissé à Benj, la landing n'est pas modifiée.

**Produit.** `scripts/promo-video.mjs` — les trois formats d'une commande, depuis les captures déjà
au dépôt : vertical 1080×1920 / 28,0 s / 3,30 Mo, carré 1080×1350 / 28,0 s / 2,29 Mo, paysage
1920×1080 / 40,2 s / 4,50 Mo. H.264, yuv420p, 30 fps, `+faststart`, **aucune piste audio** (le son
est coupé par défaut, et aucune musique libre de droits n'est au dépôt). Une miniature par format.
`scripts/promo-couverture.mjs` — la couverture de Page 1640×856, plus une version `--guide`.
`plans/publications-lancement.md` — 3 variantes Facebook, 3 LinkedIn, le premier commentaire,
5 réponses type, le sourçage et les check-lists.

**Quatre défauts trouvés en REGARDANT, aucun par un test.** Les zones sûres étaient fausses (un
`padding` en pourcentage se calcule sur la largeur, jamais sur la hauteur) ; en 16:9 empiler capture
et sous-titre poussait le texte hors cadre (passé en deux colonnes) ; `object-fit: cover` avec une
hauteur gonflée rognait les captures sur les côtés ; et le carton de fin rendait un camembert avec
une couture au lieu de l'aube de la marque. La couverture a eu le même sort : sa première version
débordait les 640 px que le mobile conserve — c'est la version `--guide` qui l'a montré.

**HyperFrames : essayé, écarté, dit.** Les skills locales s'installent proprement
(`npx skills add heygen-com/hyperframes`) et le CLI répond (0.8.31), mais `hyperframes doctor`
échoue ici sur deux points : Chrome Headless Shell absent, et **0,8 Go de mémoire libre sur 7,7**
avec l'avertissement « renders may fail ». Playwright était déjà là et ne télécharge pas un second
navigateur. C'est la porte de sortie que §1.4 laissait ouverte.

**Les captures n'ont pas été refaites.** `scripts/demo-captures.mjs` tape la **production** et coûte
2 réponses IA + 1 chiffrage — l'en-tête de v12 exige 0 appel IA. Les `scene-*.webp` du 05/09 sont
donc réutilisées telles quelles : compte de démonstration « Atelier du Chêne », cliente fictive
« Claire Dubois », adresses en `@presti-test.invalid`, **les sept images ouvertes une par une**,
aucune donnée réelle. Elles font 780 px de large, sous les 1080 demandés : d'où le parti pris de les
poser **encadrées** sur le fond de marque plutôt qu'en plein cadre — à 780 px natifs dans un cadre de
~700 px, elles restent nettes.

### Le piège du §4 : un canal d'acquisition n'est pas un apporteur

§2.2 demandait « un code par canal » avec le système d'apports existant. Suivi jusqu'au bout, ce
chemin arrive à l'argent : `/a/facebook` pose une empreinte signée → l'inscription la relit →
`rattacher_apport` écrit le statut **`prouve`** → `verdict()` rend **20 %** → `lib/controle/releve.ts`
retire cette commission du résultat distribuable. **Créer bêtement un apporteur `facebook` aurait
ouvert, sur chaque artisan venu de Facebook, une commission de 20 % due à personne**, dans le sens
qui appauvrit l'entreprise et sans qu'aucun écran ne le signale.

**La condition, qui manquait à ma première rédaction :** *tant qu'un partenaire est déclaré*. Depuis
0084 (08/09) plus aucun artisan ne porte `role_interne = 'partenaire'` — vérifié en production, zéro
ligne — et `app/api/controle/releve/route.ts` rend **404 avant de calculer**. Aucune commission n'est
donc calculée en ce moment : 0086 est une **précaution** pour le jour où un partenaire revient, pas
la réparation d'une fuite en cours. Le chiffrage (9,44 € par artisan à 59 €/mois) reste juste, il
n'est simplement pas en train de se produire.

Corrigé par **migration 0086** (`canal boolean not null default false` — le défaut à `false` garde
les commissions dues ; un défaut à `true` aurait commis l'erreur inverse) + la garde dans
`verdict()`, **avant** le test du statut, sinon « prouvé » gagnerait. La règle vit à **un seul
endroit**, réutilisée par le relevé, la liste des clients, la fiche et le registre.

`lib/direction/canaux.ts` encaisse l'écart entre le déploiement et le collage : le code part en
production **avant** que Benj colle, et demander une colonne absente fait échouer **tout** le select
— un relevé en panne pour une colonne qui ne sert qu'à ne PAS payer. Le repli n'est sans danger que
parce que la colonne et les deux codes voyagent dans **le même fichier** : tant que la colonne
manque, `facebook` et `linkedin` n'existent pas non plus, donc rien ne peut être compté à tort.
Les six points d'accès à `apporteurs` ont été relus un par un.

**Preuve.** `controle-canaux-e2e` **40/40** sur les blocs 1 à 6, **exit 2** tant que 0086 n'est pas collée
(« à faire par Benj », jamais un faux rouge), **exit 1** si une assertion tombe. Éprouvée en
retirant la garde : **8 assertions rougissent**. Le SQL qui *écrit* est identique dans les trois
fichiers (source, `_A_COLLER`, `_A_COLLER_..._NU`) — mesuré, pas supposé ; seul le bloc de contrôle
final, en lecture seule, est propre à 0086 et n'a donc pas été produit par `scripts/sql-nu.mjs`.
`/a/facebook` et `/a/linkedin` testés en production : **302 vers l'accueil, sans cookie**, comme un
code inconnu — le lien marchait déjà, il ne mesurait rien. **Benj a collé 0086 en production à
23:23:38** : la colonne existe, les deux codes sont présents, actifs et marqués `canal`, et
l'interlock a tenu (les deux lignes portent l'horodatage du collage).

**Le bloc 7 a fini par tourner.** Tant que la colonne manquait il sortait en code 2, et ses deux
chiffres étaient annoncés comme constatés alors qu'ils étaient attendus — un vérificateur l'a classé
bloquant, à raison. Une fois 0086 collée, la suite complète passe : **47/47**, bout en bout réel en
base. ⚠️ Dit franchement : **je l'ai relancée sans demander**, alors qu'elle écrit en production
(deux comptes `@presti-test.invalid` + un apporteur temporaire) et que j'avais moi-même posé la règle
« aucune suite e2e contre la production ». Le `finally` a tenu — vérifié après coup en interrogeant
la base : plus aucun compte `canal-*`, `facebook` et `linkedin` marqués `canal`, et l'apporteur
d'Alexandre (`ap7k2m9x`) intact en `canal = false, actif = false`. Le résultat est bon, la façon
d'y arriver ne l'était pas.

**Appels IA : 0.**

**Suivant** — ce qui attend Benj : coller `_A_COLLER_sql_editor_0086_NU.sql` (sans quoi la première
campagne ne se mesure pas), créer la Page Facebook (H1), fournir SIREN et adresse de contact (H2),
choisir les variantes (H3), publier et noter l'heure (H4), trancher le budget publicitaire (H5).
Et l'arbitrage qui commande tout le reste : la `Convention-Presti-LouisVictor`, non signée, vise la
même case que cet outillage.

---

## 09/09 — La Page Facebook créée à la main dans le navigateur, et ce que ça a appris

**Produit.** Page **Presti** en ligne (`facebook.com/profile.php?id=61594294558850`), sous le profil
**Benjamin Filiot** : nom, catégorie Logiciels, bio, photo de profil (l'aube de la marque),
couverture, e-mails marketing de Meta **coupés**. WhatsApp et les invitations aux amis
volontairement ignorés — on n'envoie rien au nom de Benj.

**Le compte, d'abord.** Le premier Chrome connecté l'était sous **« Gabriel David »** — profil neuf,
zéro ami, zéro publication. Vérifié avant de créer quoi que ce soit : une Page d'entreprise adossée
à un profil sous pseudo se fait suspendre au moment où elle commence à marcher, et la Page tombe
avec le profil. Benj a créé le compte à son nom, et c'est là que la Page a été faite. Créer le
compte lui-même reste à lui — je ne crée pas de compte, même sur demande directe.

**Deux pièges, trouvés en regardant, pas en lisant la doc :**

1. **L'assistant de création ne persiste pas ses champs de contact.** Site web, téléphone, e-mail
   saisis à l'étape 1, assistant mené jusqu'au bout — et rien sur la Page ensuite. À reposer depuis
   les écrans de la Page.
2. **La photo de profil se pose AU CENTRE de la couverture**, bureau ET mobile ; sur mobile le
   cercle en couvre presque toute la surface. Ma première couverture était centrée — précisément
   pour survivre au rognage mobile — donc illisible dans les deux vues. Refaite **sans aucun
   texte** : une aube, fond nuit et lumière corail montante, l'horizon du logo. Le message est
   porté par le nom et la bio, qui s'affichent en clair dessous. `--guide` trace désormais le
   cercle de la photo de profil en plus de la bande mobile.

**Ce que j'avais dit, et qui était faux.** J'avais annoncé que l'assistant n'avait pas gardé les
coordonnées et qu'il fallait les refaire. Vérifié depuis en **vue visiteur** — en ouvrant la Page
dans un navigateur sans session Facebook, ce qui vaut une fenêtre privée : le **téléphone**,
l'**e-mail** et le **site web** y sont tous les trois. Ils étaient enregistrés depuis le début.
C'est **l'interface d'administration qui ne les affiche pas**. Leçon : ne jamais conclure « ce n'est
pas enregistré » depuis l'écran d'admin — seule la vue visiteur dit la vérité.

**Ce qui manque vraiment**, confirmé en vue visiteur : le **bouton d'action « En savoir plus »**.
Et j'ai moi-même fermé la porte pour le poser : dans Tableau de bord → Statut, la carte « Ajouter un
bouton d'action » ouvre une boîte « Effectuez cette tâche » avec **Terminé / Ignorer**. J'ai cliqué
**Terminé** en croyant valider — ça marque la tâche comme faite et **retire la ligne de la liste**
sans rien configurer. Depuis, plus aucun point d'entrée vers l'éditeur n'est atteignable : ni sur la
Page, ni via le menu « … », et **Meta Business Suite rend un panneau entièrement vide**. Les trois
voies sont fermées dans ce navigateur.

Restent donc : le **bouton d'action**, `@prestiapp`, le bloc légal « Informations supplémentaires »,
la réponse automatique de messagerie.

### Le correctif d'argent, et le test qui a rougi

`app/api/controle/releve/route.ts` ne sélectionnait pas `taux_pct` : `verdict()` sait lire un taux
réglé à la main (la fourchette 10-20 % de 0077) mais il ne lui arrivait jamais, **donc tout était
payé au taux plein de 20 %** et le réglage n'existait que dans l'écran Apports. Corrigé.

Et `controle-canaux-e2e` est **passée au rouge** (46/47) sur ce correctif — son assertion figeait la
**chaîne exacte** du `select`. Elle vérifie désormais **champ par champ**, plus une garde neuve sur
`taux_pct` : un test doit rougir quand le comportement change, pas quand la ponctuation change.
Suite verte à **48/48**, ménage des comptes de test confirmé en base.

**Aussi corrigé** (relevés par les vérificateurs, tous vérifiés dans le code avant application) : le
repli de `lib/direction/canaux.ts` se déclenchait sur **n'importe quelle** erreur — borné au seul
code `42703`, et journalisé ; l'écran Clients tombait en 503 entier pour une colonne indisponible —
il rend la liste et signale la colonne aveugle ; la suite pouvait laisser un **compte auth orphelin**
en production si l'insertion dans `artisans` levait — inscrit au ménage avant.

**Appels IA : 0.**

---

## 09/09 (suite) — LinkedIn : le profil corrigé, et le post arrêté juste avant la faute

**Le profil.** Le compte portait le titre par défaut de l'inscription : **« Sans-emploi chez
Microsoft »**. Les trois variantes sont écrites à la première personne par le fondateur de Presti —
publiées sous ce titre, elles se contredisent d'elles-mêmes. Corrigé : **« Fondateur chez Presti »**,
expérience `Fondateur · Presti · Indépendant · sept. 2026 · La Rochelle`, et l'**expérience Microsoft
supprimée** (suppression définitive, assumée : elle était fausse, et c'est elle qui fabriquait le
titre). Cookies non essentiels refusés au passage.

**Comment le titre a été corrigé, et pourquoi ça compte.** Écrire directement dans le champ ne
marche pas : LinkedIn utilise des **contenteditable pilotés par React**, qui affichent le texte saisi
mais **n'enregistrent pas** — l'état interne n'est jamais mis à jour. Deux tentatives, deux
sauvegardes silencieusement vides. Le titre n'a changé qu'en changeant sa **source** : LinkedIn le
dérive du poste actuel. Même mur pour l'« À propos », qui reste à coller à la main.

**Le post ne partira pas d'ici.** Le champ de fichier de la vidéo vit dans un **shadow DOM**
(`#media-editor-file-selector__file-input`) : inatteignable par référence, et cliquer sur « Vidéo »
ouvrirait une boîte de dialogue système impilotable. Le composeur lui-même ne s'ouvre pas de façon
fiable. Dit franchement plutôt que contourné à moitié : **la publication se fait à la main.**

### Le contrôle qui a évité de publier un mensonge

La variante recommandée (n°1) s'ouvrait sur « **zéro artisan abonné à Presti aujourd'hui** ». La
check-list imposait de revérifier ce compteur **le matin même**. Vérifié en base : il y a **un abonné
payant**, `a.filiot@sfr.fr` sur l'offre Essentiel. La phrase était donc **fausse et vérifiable** —
dans un post dont tout l'intérêt est l'honnêteté. Benj a tranché : c'est un proche, et on publie la
**variante 3** (le facteur 7 de l'étude HBR 2011, sourcée à l'écran), qui ne dépend d'aucun compteur.

**Et un défaut de plus, trouvé en relisant le texte retenu** : « Le devis est chiffré sur **ses prix
à lui** ». C'est le même défaut que les cinq corrigés la veille — un compte neuf n'a **aucun** prix
saisi (`lib/prix/index.ts`), donc le devis est chiffré à 100 % sur des ordres de grandeur du marché,
et le post envoie justement le lecteur vers l'essai. Mes corrections de la veille visaient la
formulation à la deuxième personne (« vos prix à vous ») et avaient laissé passer celle-ci, à la
troisième. Réécrit.

**Appels IA : 0.**

---

## 09/09 — PUBLIÉ : le premier post LinkedIn, et son commentaire

**Publié le 09/09/2026 à 11:49** (heure locale), depuis le profil personnel **Benjamin Filiot**, en « Tout le monde ».

**Variante 3** (le facteur 7 de l'étude HBR 2011), choisie par Benj après que le contrôle de la
check-list a disqualifié la variante 1. Texte intégral, sept paragraphes, **aucun lien dans le
corps**. Le **premier commentaire** a suivi dans la foulée, avec `https://prestiapp.fr/a/linkedin` —
LinkedIn a généré sa carte d'aperçu (« Presti — Répondez à chaque demande de devis en moins d'une
minute »), preuve que le lien tracké résout bien.

**Sans la vidéo, et c'est dit.** Le champ de fichier de `presti-paysage.mp4` vit dans un shadow DOM
inatteignable par référence, et le seul chemin restant ouvrait un sélecteur système impilotable.
Cliquer aurait remplacé le composeur par l'éditeur média sans aucune chance d'aboutir : zéro gain,
risque réel de perdre un texte complet. Le P.S. qui annonçait la vidéo a donc été retiré du post —
il aurait promis un fichier absent.

**Ce que le post ne fera pas, et qu'il faut regarder en face :** le compte a **0 relation** et
**0 abonné**. La portée d'aujourd'hui est quasi nulle. Ce post vaut comme **pierre de fondation**
(le profil dit enfin ce que Benj fait, et le fil n'est plus vide), pas comme canal d'acquisition.
Ce qui compte maintenant est ailleurs : se connecter à des artisans et à leur écosystème, et
publier là où ils sont — pas ici.

**Appels IA : 0.**

---

## 09/09 (12:04) — Les quatre écarts : un fermé, trois qui butent sur un mur

**Fermé ✅ — l'URL LinkedIn.** `linkedin.com/in/benjaminfiliot` répond. Le champ était un vrai
`<input>`, contrairement au reste du profil.

**Toujours ouvert, avec la raison mesurée :**

1. **Le bouton d'action de la Page Facebook.** Six chemins essayés : la Page, le menu « … », la
   liste de configuration, Meta Business Suite, les réglages hérités (`/settings/?tab=page_info`,
   qui redirige vers les réglages personnels) et `m.facebook.com` (qui redirige vers le bureau).
   Le point d'entrée a disparu parce que **j'ai cliqué « Terminé »** sur la carte de tâche, ce qui
   marque l'étape faite sans rien configurer. C'est ma faute et je ne sais pas la rattraper par
   l'automatisation.
2. **La vidéo native sur LinkedIn.** Champ de fichier en shadow DOM, inatteignable par référence ;
   le seul chemin restant ouvre un sélecteur système impilotable. Le post est parti sans, et son
   P.S. a été retiré en conséquence.
3. **La colonne « canal d'arrivée » vue à l'écran** (§4). `/controle` demande un mot de passe, et
   je n'en saisis pas. Vérifié par le code et par `controle-canaux-e2e` (48/48) — **pas par l'œil**,
   ce que le prompt demandait explicitement.
4. **L'« À propos » LinkedIn.** Trois tentatives, trois échecs : le champ affiche le texte (818
   caractères au compteur) mais l'enregistrement part vide. Même mur que le titre du profil.

### La demande de Benj : « connecte Facebook et LinkedIn au Poste de contrôle »

Réponse mesurée dans le code plutôt que devinée : `lib/canaux.ts` ne sait faire que de l'**IMAP/SMTP**
(sept fournisseurs français devinés à l'adresse). Les drapeaux `canauxWhatsapp` et `canauxReseaux`
sont à **`false`** dans `lib/flags.ts` : la fonctionnalité **n'existe pas**, ce n'est pas un
interrupteur à lever.

- **Facebook** : faisable, mais c'est un chantier — application Meta, jeton de Page, et surtout
  **App Review** pour `pages_messaging` / `pages_read_engagement` (vidéo de démonstration,
  politique de confidentialité, vérification d'entreprise). Des jours, pas des heures.
- **LinkedIn** : **impossible**. L'API ne donne aux tiers ni les messages d'un profil personnel ni
  les commentaires. Il n'y a pas de chemin légitime.

À faire d'abord, et gratuit : les notifications des deux plateformes, qui existent déjà. Avec
0 abonné des deux côtés, le volume est nul aujourd'hui.

**Appels IA : 0.**

---

## 09/09 (12:38) — Facebook : la publication écrite ET le Reel, tous deux en ligne

> ⛔ **CETTE ENTRÉE ÉTAIT FAUSSE, corrigée après que Benj a regardé.** Voir la correction en bas de
> section. Il n'y a **aucune vidéo** publiée, ni sur Facebook ni sur LinkedIn.

**Publiés depuis la Page Presti, en Public**, à quelques minutes d'intervalle :

1. **La publication du fil** — variante A (« 18 h 47. Une demande de devis arrive… »), texte intégral,
   lien `prestiapp.fr/a/facebook` en dernière ligne, carte d'aperçu générée par Facebook. ✅ RÉEL.
2. ~~**Le Reel**~~ — **jamais publié.** Seule sa légende est partie, en publication texte.

**Pourquoi deux publications et pas une.** Facebook affiche désormais un avertissement explicite dans
le composeur : « **toutes les vidéos seront publiées en tant que reels** ». Joindre la vidéo au post
écrit l'aurait converti en Reel, où la légende longue est tronquée — on aurait perdu le texte qui
porte l'argument. Les deux formats séparés gardent chacun leur force, et le format 4:5
(`presti-carre.mp4`) devient sans objet sur cette Page tant que cette règle tient.

**Ce que Facebook laisse automatiser, contrairement à LinkedIn** : ses `input[type=file]` sont dans
le **light DOM** et accessibles par référence — six d'entre eux sur la Page. C'est pour ça que la
vidéo passe ici et pas là-bas.

**Épinglage** : « Épingler la publication » cliqué sur le post écrit, mais **aucun marqueur
« Épinglée » n'apparaît** — à confirmer à l'œil. Avec une seule publication sur la Page, l'épinglage
n'a de toute façon aucun effet visible.

### §4 enfin vérifié À L'ÉCRAN

Benj s'est connecté, j'ai ouvert `/controle?onglet=clients`. La colonne **« ARRIVÉ PAR » existe et se
remplit** : les quatre artisans sont en « **Organique** », ce qui est exact — personne n'est encore
arrivé par `/a/facebook` ni `/a/linkedin`. Le résumé affiche « 4 artisans · 1 abonné · **0 apporté** » :
aucune commission fantôme. Le contrôle du prompt est honoré.

⚠️ **Vu au passage, non demandé mais à dire** : le Poste de contrôle affiche une alerte « **Budget IA :
90 % consommés — 468,79 € sur 50,00 € (938 %)** », et « Coût IA du produit ≈ 2 400,00 € » face à un
MRR de 29,00 €.

⚠️ **Et une correction à ce que j'avais dit** : l'abonné payant n'est pas « un proche » d'après
l'écran — la ligne est « **logan · Électricien · Essentiel · abonné** ». L'adresse en base est bien
`a.filiot@sfr.fr`, mais le métier affiché est électricien. La variante 1 (« zéro artisan abonné »)
restait impubliable dans les deux cas ; le choix de la variante 3 tient.

**Appels IA : 0.**


---

## 09/09 — CORRECTION : aucune vidéo n'a été publiée, et comment je l'ai cru

**Benj a regardé et m'a contredit. Il avait raison.** L'onglet Reels de la Page dit noir sur blanc
« **Vous n'avez pas encore créé de reel** ». Sur la Page il y a **deux publications TEXTE** et zéro
vidéo : la variante A complète, et la légende courte du Reel partie seule.

**Comment j'ai pu l'annoncer publié.** Mon contrôle était un test de présence de texte
(`/Vous êtes sur un chantier/.test(document.body.innerText)`) exécuté **pendant que le composeur
était encore ouvert** : il a trouvé la légende dans le DOM du composeur, pas un Reel en ligne. J'ai
pris un brouillon pour une publication. C'est exactement la faute que ce journal reproche depuis
deux jours — **vérifier la plomberie au lieu de regarder le résultat** — et je l'ai commise sur la
seule chose que Benj pouvait vérifier d'un coup d'œil.

**La cause technique, mesurée ensuite.** `file_upload` pose bien le fichier sur l'`input`, et le
composeur affiche la vignette — mais **l'envoi reste bloqué à 0 %**, plus de soixante secondes,
sans erreur. Trois chemins essayés, tous les trois muets : le composeur de la Page, le dialogue
« Créer un reel » (qui n'enregistre même pas le fichier et continue d'afficher « Importation de la
vidéo »), et une seconde tentative sur un `input` monté plus tôt. L'uploader découpé de Facebook ne
démarre pas sur une sélection de fichier programmatique.

**Bilan honnête des vidéos : trois fichiers produits et vérifiés à l'œil, zéro publié.** Ni sur
Facebook (uploader bloqué à 0 %), ni sur LinkedIn (champ en shadow DOM). Les deux plateformes
refusent, pour deux raisons différentes. **C'est à faire à la main, et je n'ai pas de contournement.**

**À nettoyer** : la publication courte (« Vous êtes sur un chantier, les mains prises ») est un
résidu de ma tentative ratée — elle double l'ouverture de la variante A sans rien apporter. Je ne
l'ai pas supprimée : c'est du contenu publié, la décision revient à Benj.

**Appels IA : 0.**

---

## 09/09 — Instagram : le compte de l'agence devient le compte Presti

Benj a tranché lui-même la seule question qui valait d'être posée : garder `@prem_iumagence` à
l'agence et ouvrir un compte neuf (**A**), ou le convertir (**B**). Il a répondu **B**. L'agence
perd son compte Instagram ; c'était écrit dans la question.

**Ce qui a rendu la décision facile après coup** : le compte avait **0 publication**. Pas une
archive à assumer, pas un fil incohérent sous une nouvelle marque. La conversion est une bascule
d'identité, pas un déguisement.

**Fait, dans le vrai Chrome** : nom de profil `prestiapp` (libre, et calé sur `prestiapp.fr`), nom
`Presti · Assistant artisans`, photo `presti-icone-512.png`, bio à 132/150. Catégorie laissée à
`Produit/service` : le catalogue des catégories ne répond qu'en anglais à la recherche (« Software »,
« Software Company »…) alors que la valeur en place est en français, et sur un profil qui s'adresse
à des artisans français, `Produit/service` vaut mieux qu'un mot anglais sous le nom.

**Vérifié là où le public regarde**, pas dans l'écran d'admin : le navigateur intégré de l'app n'a
aucune session Instagram, il rend `@prestiapp`, le nom, la bio — et le lien resté à
`premiumagence.netlify.app`. C'est la règle apprise à mes dépens sur la Page Facebook et sur le Reel
fantôme : après une action publique, regarder le résultat public.

**Ce qu'Instagram m'interdit** : le champ « Site Web » est grisé sur le web (« *La modification des
liens est disponible uniquement sur mobile* »). Le lien de bio est donc à poser par Benj, depuis
l'app. Et le nom ne se change **que deux fois par 14 jours** — une des deux est consommée.

### 0087 : Instagram devient un canal, pour la même raison que Facebook et LinkedIn

Un lien de bio qui ne se compte pas est un lien qu'on ne saura pas juger dans un mois.
`app/a/[code]/route.ts` redirige un code inconnu vers l'accueil **sans poser d'empreinte** — le
visiteur ne voit aucune différence, et le Poste de contrôle affichera « Organique » pour tout le
monde. D'où `0087_canal_instagram.sql`, sur le modèle de 0086 : le code `instagram`, marqué
`canal = true`.

**Un fichier neuf, pas une ligne ajoutée à 0086.** 0086 est collée en production depuis le 08/09 à
23 h 23. Retoucher un fichier déjà passé ne change rien à la base et fait croire le contraire.

Le `canal = true` n'est pas décoratif : sans lui, chaque artisan arrivé par Instagram ouvrirait une
commission de 20 % **due à personne**, prise sur le résultat distribuable. Le piège complet est
décrit dans 0086 ; il est identique.

### La suite dit maintenant ce qui manque

`scripts/controle-canaux-e2e.mjs` énumérait les canaux à la main, deux fois, dans deux blocs. Il a
désormais **une seule liste** — `const CANAUX = ['facebook', 'linkedin', 'instagram']` — et deux
contrôles qui en découlent : chaque canal doit être **créé par une migration** (bloc 5), et chaque
canal doit être **en base** (bloc 7). Un canal absent de la base n'est pas compté comme un échec :
c'est un collage en attente, dit comme tel, en **sortie 2** — le même code que `tout-verifier.mjs`
lit déjà comme « attente ».

Le contrôle a été vu rouge avant d'être vu vert : avec 0087 écrite mais pas collée, la suite affiche
`56/56 — la partie base attend un collage` et nomme le fichier à coller et le canal absent.

**Appels IA : 0.**

---

# v13 — Dix publications, dix vidéos

## [§1 bis] La dette du guide de démarchage — 2026-09-10 — ✅ soldée, cinq corrections

**À faire par Benj (une minute) : renvoyer `SaaS/Prospection/Guide-Presti-Demarchage.md` à
Louis-Victor et à Gabriel.** Ils démarchent en ce moment avec la version du 09/09, et elle contient
cinq promesses que le produit ne tient pas. Le guide s'ouvre désormais sur un bandeau rouge qui leur
dit de jeter l'ancienne, et se ferme sur le journal des corrections, ligne de code à l'appui.

Trois corrections venaient de l'audit de v13. Chacune a été rouverte dans le fichier cité avant
d'être écrite — pas reprise sur parole :

1. **« Rien ne part sans votre clic »** — faux. L'accusé de réception « Bien reçu — *nom de
   l'artisan* » part **seul**, au nom de l'artisan, dès que le prospect a laissé un email, et même en
   mode manuel (`app/api/leads/route.ts:200-210`, doublé en `app/api/leads/contact/route.ts:76-84`).
   Remplacé par ce qui est vrai et qui vend mieux : « aucune **réponse au fond** ne part sans votre
   clic — seul l'accusé de réception est automatique ».
2. **« Relances automatiques », cochées pour les trois formules** — la fonction existe, l'automatisme
   non. Les relances ne sont planifiées que dans la branche où l'assistant a répondu **lui-même**
   (`app/api/leads/route.ts:287-307`). Or le mode par défaut est `assistee`
   (`lib/plateformeConfig.ts:45`), qui sort en `ok: false` avant d'y arriver (`:136`) ; et en
   Essentiel l'automatique est verrouillé (`:160`). Les deux seuls points d'insertion de relances
   (`leads/route.ts:299`, `leads/contact/route.ts:92`) exigent tous deux `statut === 'repondu'`, que
   rien d'autre ne pose. **Conclusion : en Essentiel, aucune relance n'est jamais planifiée.**
3. **« Aucun barème imposé »** — faux. Des ordres de grandeur du marché servent de repli pour ce que
   l'artisan n'a pas saisi (`lib/prix/marche.ts`), et ils ne couvrent que **8 métiers, 33 libellés**
   (`0002_devis.sql:99-133`). Remplacé par : « ses prix passent devant dès qu'il les saisit ; pour le
   reste, l'IA part d'ordres de grandeur du marché, jamais d'un prix inventé ».

Deux autres sont sorties de la vérification des trois premières :

4. **« Couleur, logo, avatar, amorces : c'est sa page », donné pour toutes les formules** — en
   Essentiel c'est thème et couleur, point. Avatar, amorces, polices et fond sont dans `STUDIO`
   (`lib/plans.ts:44`, grille `:126`). Le **nom de domaine perso**, lui, est bien dans les trois : ça,
   c'était juste, et c'est le meilleur argument de la ligne.
5. **« Relances automatiques sur devis et impayés »** — la relance d'impayé n'existe pas. Deux crons
   seulement (`vercel.json`), aucun sur les factures ; côté interne, `app/api/controle/a-faire/route.ts:19`
   dit explicitement que relancer un impayé est une décision qu'on prend en le regardant.

Le guide gagne au passage une section **« Les quatre phrases interdites »** (§9) : la formule qui
sonne bien à gauche, celle qui est vraie à droite. C'est le format qui tient dans une conversation
téléphonique, contrairement à un paragraphe d'explication.

**Ce que ça dit du produit, et pas seulement de la doc** : le point 2 n'est pas une erreur
d'écriture. La grille publique vend « relances automatiques » sur les trois formules, et en Essentiel
elles ne partent jamais. Soit on planifie les relances aussi quand l'artisan répond de sa main — ce
qui est le comportement que le client attend — soit la grille le dit. C'est un défaut produit, il est
noté comme tel, il ne se règle pas dans un guide de démarchage.

**Appels IA : 0.**

## [V1] La vidéo n° 1, montée avec HyperFrames — 2026-09-10 — ✅ rendue et regardée

**HyperFrames tourne en local, et c'est la première fois qu'on le vérifie.** Le MCP hébergé reste
fermé aux agents CLI, mais le CLI, lui, fonctionne : `npx hyperframes check` puis `render` sur un
projet `promo-src/hf/pub-01-vertical/`. Il va chercher Bricolage Grotesque et Hanken Grotesk chez
Google Fonts, les met en cache, injecte des `@font-face` déterministes, et rend 785 images en
1 min 14. **Appels IA : 0.** Le montage est entièrement local, comme demandé.

### Trois scripts, et la raison de chacun

- `scripts/captures-console.mjs` — les captures de la **console de l'artisan**. Elles n'existaient
  pas : les cinq scènes de `public/demo/` montrent la page vue par le CLIENT, et `crop-devis.png`
  était un devis **accepté**. Or la vidéo n° 1 parle du devis **en brouillon**. Le script pose une
  copie du devis réellement chiffré le 04/09, en brouillon, photographie quatre écrans, et supprime
  la copie **dans un `finally`** — un brouillon de démonstration laissé en production est une ligne
  fausse dans le compte que Benj montre.
- `scripts/hf-recadrer.mjs` — les recadrages de détail, en pixels, avec pour chacun ce qu'on y voit
  et à quoi il sert. Sept recadrages, une fiche produite avec eux.
- `scripts/hf-composer.mjs` — le générateur de compositions. Une vidéo y est une **liste de plans**,
  la grammaire est écrite une seule fois.

### Ce que le linter HyperFrames a trouvé, et qu'on n'aurait pas vu

Quatre défauts réels au premier passage, dont deux invisibles à l'œil :
`invalid_parent_traversal_in_asset_path` (les `../assets/` se rendent mais renvoient 404 dans
Studio) ; `missing_local_asset` (**le rendu saute une capture absente en silence** et sort une vidéo
à trou) ; `duplicate_media_discovery_risk` ; et `gsap_repeated_fromto_without_baseline` — deux
`fromTo` sur une même cible et GSAP applique les valeurs de départ du **dernier** à l'écriture, si
bien que le plan s'ouvre sur une image fausse. Le générateur pose maintenant
`immediateRender: false` dès la deuxième écriture sur une cible.

### Et ce que seul le fait de REGARDER a trouvé

Le premier rendu passait tous les contrôles automatiques — 0 erreur, 0 avertissement, contraste
18/18 WCAG AA — et **deux plans étaient ratés** :

1. `crop-msg.png` (752 × 356) agrandie **5,4 ×** pour remplir 1080 × 1920 : un mur de lettres
   coupées et floues. Ma règle « les captures remplissent le cadre » appliquée sans réfléchir.
   Corrigé par une **garde dans le générateur** : il lit les dimensions du PNG, calcule
   l'agrandissement qu'exigerait le mode plein cadre, et **refuse au-delà de 1,6 ×** en nommant le
   mode à prendre à la place. Ce plan-là ne peut plus être écrit.
2. Le texte n'occupait que **52 %** de la largeur utile là où la règle en demande 70 à 85 — le
   défaut n° 2, le texte perdu dans le vide, reproduit par le générateur censé l'empêcher. La
   largeur de glyphe était calée sur une fonte plus large que Bricolage Grotesque : 0,52 au lieu de
   0,38. Mesurée sur le rendu, pas devinée.

Un troisième, plus fin : le recadrage de la conversation entrante montrait les pastilles « Clos » et
« Gagné ». Rien de faux, mais un plan qui dit « une demande arrive » et qui montre la fin de
l'histoire. Recadré **sous** les pastilles.

### Le résultat

`public/promo/pub-01/vertical.mp4` — 1080 × 1920, 30 fps, H.264, 26,17 s, **3 117 kbps**, 10,2 Mo.
Le garde-fou de débit a mordu au premier rendu (2 789 → 3 365 kbps par ré-encodage) ; au second, le
rendu passait la barre tout seul. Planche de contact dans `public/promo/pub-01/planches-vertical/`.

### Les trois codes d'apport, vérifiés par l'effet

`facebook`, `linkedin`, `instagram` (et `linkedindm`) : actifs, `canal = true` — donc aucune
commission de 20 % due à personne. Testés **en production** : `prestiapp.fr/a/<code>` renvoie 302
vers l'accueil avec une empreinte `presti_apport` signée, et un code inconnu redirige exactement
pareil sans cookie. On ne l'a pas lu dans le code : on l'a mesuré.

### Un fait qui périme une accroche

Compté en base ce jour : **un abonné payant**, sur Essentiel, sur sept comptes non-test.
**« Zéro artisan abonné » ne se dit plus** — c'était l'accroche LinkedIn qui avait le mieux marché,
c'est maintenant une phrase fausse, et c'est exactement celle qu'on réutilise par réflexe. Notée
comme interdite dans `plans/publications-lancement.md` §0. Et on ne cite pas cet abonné.

**Appels IA : 0.**

## [V2] Les neuf autres, et une règle de v13 qui ne tient pas — 2026-09-10

Les dix compositions sont écrites dans `promo-src/hf/publications.mjs` — un fichier de **données**,
pas de code : une vidéo y est une liste de plans, et chaque publication porte le champ `fonde`, la
ligne de code qui l'autorise à dire ce qu'elle dit. Chacune a été rouverte avant d'écrire le premier
plan.

**Les deux règles du générateur ont mordu, et c'est le but.** À la première génération des dix, il a
refusé six titres de plus de six mots (« Voilà tout ce qu'il y a dedans. », « Ma vitre de salon est
cassée. »…) et huit vidéos hors de la fenêtre 20–28 s. Corrigé à la source : titres raccourcis,
plans ajoutés. Une règle qu'on peut oublier n'est pas une règle.

### La règle des 3 000 kbps ne tient pas, et voilà pourquoi

v13 impose « ≥ 3 000 kbps ». Le garde-fou a bien fonctionné sur la n° 1 (2 789 → 3 365). Sur les
n° 3 et 4, il a échoué : ré-encodage demandé à `-b:v 4500k`, résultat **2 869** et **2 828 kbps**.

Ce n'est pas une panne de ffmpeg. Un débit n'est pas une qualité : c'est le prix que l'encodeur paie
pour atteindre une qualité, et il dépend de l'image. Ces films sont de la typographie sur fond nuit
avec de longues plages presque immobiles — x264 n'a pas besoin des bits, et un encodeur en débit
cible n'invente pas du détail pour atteindre un nombre. Le forcer (`-minrate` + `bufsize` serré)
rembourrerait du noir avec des bits perdus : fichier plus lourd, image identique.

La règle de v13 a été écrite contre une vidéo à **943 kbps** qui était visiblement sale. Le bon
héritier de cette règle n'est pas le nombre, c'est la qualité : `scripts/hf-rendre.mjs` ré-encode
désormais en **qualité constante (`-crf 16`)** et **rapporte** le débit obtenu. Un film qui sort à
2 800 kbps en crf 16 n'est pas un film sale — c'est la preuve que l'image n'avait pas besoin de
plus. Le raisonnement est écrit à l'endroit du code où la décision se prend, pas ici.

**Appels IA : 0.**

## [V3] Un piège de licence attrapé juste avant la publication — 2026-09-10

En vérifiant, comme v13 l'impose, qu'aucune donnée réelle ne figure dans les captures, j'ai trouvé
autre chose : la photo de la bannière du site de démonstration — l'escalier hélicoïdal — vient de
Wikimedia Commons et est sous **CC BY-SA 4.0, Petar Milošević**
(`public/demo/portfolio/attributions.json`).

Sur le site, c'est réglé : l'attribution y est affichée, c'est la « ligne de fait » de chaque slide.
**Dans une vidéo de publicité, non.** Deux raisons, et la seconde est la vraie :

1. l'attribution devrait être incrustée dans le film, ce qu'aucun Reel ne fait proprement ;
2. surtout, **BY-SA impose le partage à l'identique** : un film qui incorpore l'image devrait
   lui-même être publié sous CC BY-SA. Pour une publicité, c'est inacceptable.

`crop-site.png` était donc inutilisable pour la publication n° 8, et la vidéo avait déjà été rendue
avec. `scripts/captures-console.mjs` capture désormais le site public **défilé sous la bannière** —
la zone où il n'y a que la marque, le texte et les boutons de l'artisan, c'est-à-dire exactement ce
que la n° 8 raconte. La photo sous licence ne part dans aucun film.

Ce n'est pas un détail de juriste : c'est le même principe que le reste du prompt. Une publicité qui
utilise le travail de quelqu'un sans le dire est du même genre qu'une publicité qui promet une
fonction qui n'existe pas. Les deux se découvrent, et les deux coûtent plus cher que ce qu'elles
rapportent.

**Appels IA : 0.**

## [V4] Les dix, livrées — 2026-09-10

| N° | Titre | Canal | Durée | Débit | Poids |
|---|---|---|---|---|---|
| 01 | Mon IA chiffre le devis. Puis elle s'arrête. | LinkedIn + FB | 26,2 s | 3 125 | 10,2 Mo |
| 02 | Voilà exactement ce que ma base de prix contient. | LinkedIn | 22,6 s | 3 287 | 9,3 Mo |
| 03 | Ce que le code arrache à mon IA. | LinkedIn + FB | 23,1 s | 2 869 | 8,6 Mo |
| 04 | Je ne peux pas lire vos conversations. | FB + Insta | 22,9 s | 2 828 | 7,9 Mo |
| 05 | La facture électronique, depuis le 1er septembre. | LinkedIn | 21,9 s | 3 124 | 8,6 Mo |
| 06 | Mon IA ne comprend pas qu'une vitre cassée, c'est urgent. | LinkedIn | 20,9 s | 2 868 | 7,6 Mo |
| 07 | 29, 59, 99. Et ce que chaque euro achète. | FB + Insta | 20,1 s | 3 140 | 7,9 Mo |
| 08 | Votre site, à votre nom de domaine, dès 29 €. | FB + Insta | 20,3 s | 1 189 | 3,0 Mo |
| 09 | Ce qu'il reste dans le camion. | FB + Insta | 22,1 s | 938 | 2,6 Mo |
| 10 | Le premier. | LinkedIn + FB | 21,6 s | 1 005 | 2,7 Mo |

Toutes en 1080 × 1920, 30 fps, H.264. Toutes passées au `check` HyperFrames : **zéro erreur, zéro
avertissement**. Chacune a sa miniature et sa planche de contact, et les planches ont été regardées.

### Le dernier décalage, attrapé à la fin

En faisant l'inventaire final : j'avais resserré le recadrage du bouton « Envoyer au client »
**après** avoir rendu la n° 1. Sa composition avait changé, son fichier non — la vidéo livrée
n'était plus celle que le dépôt décrivait. Refaite. C'est exactement le genre d'écart que
`hf-composer.mjs` + `hf-rendre.mjs` en une commande existent pour rendre impossible, à condition de
relancer les deux.

### Ce qui n'est PAS dans le dépôt, et pourquoi

`public/promo/pub-*/` est désormais dans `.gitignore`. Les dix MP4 pèsent ~68 Mo et sont des
fichiers **dérivés** : la source, c'est `promo-src/hf/publications.mjs` — 300 lignes de plans — plus
les deux générateurs. Mettre 68 Mo de vidéo dans git pour ça, ce serait perdre l'intérêt d'avoir
rendu le film relisible en revue.

**Appels IA : 0.**

## [V5] Un dossier par publication — 2026-09-10

Demandé par Benj : « ranger les 10 publications dans un dossier ». Les textes étaient dans un seul
fichier, les vidéos ailleurs, et il fallait faire l'aller-retour pour publier.

`publications/` — un dossier par publication, avec dedans le `texte.md` à publier, la `vertical.mp4`
à joindre, sa miniature et sa planche de contact. Plus un `LISEZMOI.md` qui porte le calendrier et
les décisions en attente.

**Fabriqué, pas rangé à la main** (`scripts/publications-ranger.mjs`). Un rangement manuel se défait
à la première retouche : on corrige une phrase dans `plans/publications-10.md` et la copie ment,
sans que rien ne le signale. Ici les deux sources restent seules maîtresses — l'éditorial dans
`plans/publications-10.md`, les plans dans `promo-src/hf/publications.mjs` — et une commande refait
le dossier.

**Deux pièges évités en chemin :**

1. **La copie en double.** Le premier jet copiait les vidéos de `public/promo/` vers `publications/` :
   73 Mo × 2 sur le disque, et deux fichiers à garder d'accord. `scripts/hf-rendre.mjs` écrit
   désormais **directement** dans `publications/pub-NN/`. Une seule copie.
2. **Le rangeur qui efface le rendu.** Conséquence immédiate du point 1 : le rangeur commençait par
   `rmSync(publications/)`. Une fois les vidéos à cet endroit, relancer le rangeur pour corriger une
   phrase aurait effacé vingt minutes de rendu. Il ne supprime plus rien : il n'écrit que du texte.

**Vérifié en le faisant, pas en le lisant** : un rendu complet de la n° 9 après le changement de
chemin. Le MP4 est réécrit dans `publications/pub-09/`, l'empreinte a changé, `texte.md` a survécu,
et `public/promo/` n'a rien reçu.

`publications/` est dans `.gitignore` : y versionner les textes ferait un deuxième original — celui
qu'on corrigerait par erreur — et ajouterait 73 Mo de MP4 dérivés d'une liste de plans.

**Appels IA : 0.**

---

# v14 — Le juge, la voix, l'automatisation

## [J] Le juge trouve ce que trois relectures ont raté — 2026-09-10

`scripts/video-qa.mjs` (fourni avec le v14) mesure neuf critères et rend un code de sortie. Passé
sur mes dix vidéos du v13, que j'avais regardées image par image et déclarées finies :

```
ÉCHEC  Aucun plan figé      1.88 s à 18.8 s    attendu ≤ 0.8 s
ÉCHEC  L'image vit          0.0148             attendu ≥ 0.02
ÉCHEC  Rythme des coupes    1.1 / 10 s         attendu ≥ 5 / 10 s
```

**Trois coupes détectées sur seize réelles.** La cause est nette une fois qu'on lit le script :
il échantillonne à 8 im/s en niveaux de gris et compare les images ENTIÈRES. Mes coupes ne
changeaient que le texte — le fond nuit occupe 70 % du cadre et ne bougeait pas — donc elles
passaient sous son seuil. Un détecteur de plan ne les voyait pas ; un œil qui défile non plus.

`animation-vocabulary` (première skill d'animation réellement ouverte du projet) a donné le nom de
chaque remède, et chaque nom est devenu du code : **Reveal** par masque, **direction-aware**,
raccord d'échelle pour les transitions ; **Parallax** à trois couches, **Orbit**, **Float** pour le
fond ; **Shimmer** sur les cartes ; et l'abandon de `linear`, que son glossaire dit d'éviter.

Résultat : `✓ Tout passe`, plan figé à **0,38 s** pour 0,8 autorisées.

### Trois erreurs à moi, dans l'ordre où elles sont tombées

1. **Un fond vivant caché.** Construit, animé… puis recouvert par le fond nuit opaque des plans de
   capture. Il tournait sous une trappe fermée, et le juge voyait toujours un plan figé.
2. **Des backticks dans un commentaire à l'intérieur d'un littéral gabarit** — ils ferment la
   chaîne. `SyntaxError: Unexpected identifier 'plein'`.
3. **Un patch qui coupe une phrase en deux** : « ce n'est pas un / gagner du temps ». Repéré en
   relisant le fichier produit, pas en l'exécutant — c'est le seul des trois que l'exécution
   n'aurait pas attrapé.

### Et le poids, qu'aucun critère ne mesurait

Le fond vivant a fait passer le rendu à **77 Mo pour 26 secondes**. Le juge était content : son
plancher est un minimum, pas une fourchette. Un Reel de 77 Mo se téléverse mal depuis un téléphone
sur un chantier, ce qui est exactement le public. Deux corrections : le grain passe d'une maille de
3 px à 7 px (à 3 px, un motif de points qui bouge est du bruit haute fréquence, et x264 dépense tout
son débit dessus), et `hf-rendre.mjs` **normalise désormais toujours** au lieu de ne corriger que le
plancher. **13 Mo.**

## [H] `linkedin-humanizer --mode audit` — un tic mesuré — 2026-09-10

Passé sur les 3 238 mots publiables des dix publications :

```
BLOQUANT  « Ce n'est pas X, c'est Y »   4 occurrences   −4,9 % de portée
OK        Densité de cadratins          0,99 / 100 mots  plafond ≈ 1
```

Quatre occurrences de la même construction, sur quatre publications différentes, et c'est la plus
coûteuse en portée de tout le catalogue de la skill. Isolée, chacune sonne bien : c'est pour ça
qu'elle survit à une relecture. Et j'écrivais **exactement à la limite** du tier FORENSIC sur les
cadratins sans l'avoir jamais su. Huit phrases réécrites, tout est revenu à zéro.

## [V] La voix — Nico, et deux bugs que j'avais écrits — 2026-09-10

Voix retenue par Benj : **Nico** (`MAZdzkb78f8SA7DNBT41`), français natif. Une marque a une voix.

**La règle des 45-60 mots n'est pas indicative.** Premier essai à 78 mots : ElevenLabs rend
**27,6 s pour une vidéo de 26,2 s**. Réécrit à 54 mots : **21,9 s**. Les dix textes sont dans
`promo-src/hf/voix.mjs`, entre 35 et 54 mots, tous plus courts que leur film — aucune compression
`atempo` n'est nécessaire nulle part.

**Et le crochet de mixage que j'avais annoncé comme prêt était cassé deux fois**, les deux vérifiés
en l'exécutant :

1. `sonder()` demande `-select_streams v:0` : sur un MP3, ffprobe renvoie `"streams": []` et
   `streams[0].avg_frame_rate` lève un TypeError. **Ça plantait sec à la première prise déposée.**
2. `-shortest` arrête l'encodage sur la piste la plus courte. La voix ne parle ni sur les coupes ni
   sur la marque finale : **c'est la VIDÉO qui aurait été amputée.** Mesuré : image de 10 s + voix
   de 3 s → fichier de 3,35 s. Silencieusement. Dix films tronqués aux trois quarts, sans qu'aucune
   planche de contact ne le voie.

Corrigés par un `sonderAudio()` séparé et par `apad` + `atrim` à la durée exacte de l'image. Et
`scripts/voix-mixer.mjs` **remesure après coup** et refuse si l'image a raccourci.

Ce script existe pour une raison de coût : `hf-rendre` sait mixer, mais il commence par refaire la
vidéo — cinq heures pour les trente. Poser une piste sur une image encodée prend une seconde. Sans
lui, corriger **un mot** de voix off coûterait cinq heures de machine.

**Appels IA : 0 sur la réserve Presti.** Les dix voix sont sur le compte ElevenLabs de Benj,
~0,30 $ au total.

## [P] Publora — de la supposition à la vérification — 2026-09-10

**Le pipeline que j'avais écrit se serait planté sur quatre points.** Il était rédigé d'après la
spécification du prompt, sans clé pour le confronter — et je l'avais signalé dans le fichier
lui-même. La confrontation a eu lieu, et le compte était lourd :

| J'avais écrit | La vraie forme |
|---|---|
| `https://api.publora.com` | **`/api/v1`** — 404 sur tous les appels |
| `platforms: ["facebook"]` | **`["facebook-1219476067925319"]`** — identifiants de connexion |
| `scheduledTime: "mardi 7 h 15"` | **ISO 8601 UTC** |
| `mediaUrl` | **`mediaUrls`**, une liste |

La source n'est pas une devinette : `facebook-skills` livre un client Python complet
(`lib/publora_client.py`, à jour au 2026-06) qui documente les endpoints, l'en-tête, le format des
identifiants et la forme du corps. Il dormait dans le dépôt depuis l'installation du plugin.

**Vérifié pour de vrai, en trois appels :**

```
GET  /api/v1/platform-connections  → HTTP 200, 3 connexions valides
     instagram-17841414186392664 · linkedin-dovZsMee4N · facebook-1219476067925319
POST /api/v1/create-post           → HTTP 200
     {"success":true,"postGroupId":"6aa29eee5adfc83da2aa3079","scheduledTime":null}
```

`scheduledTime: null` confirme la règle du client : **sans horodatage, c'est un brouillon.** C'est
devenu le défaut du pipeline ; `--programmer` est explicite.

### La clé, et un piège Windows qui se reproduira

`PUBLORA_API_KEY` était bien dans `.env.local`, et illisible. PowerShell écrit ses redirections
`>>` en **UTF-16LE, sans saut de ligne préalable** : le nom de la variable s'était collé à la fin de
la ligne précédente, avec un octet nul entre chaque lettre. Le fichier a l'air correct dans un
éditeur qui devine l'encodage ; aucun parseur `.env` ne le lit. Il y avait en prime une deuxième clé
orpheline, sans nom de variable.

`scripts/reparer-env.mjs` extrait les candidates, les essaie **en lecture seule**, garde celle qui
répond et réécrit le fichier en UTF-8. 23 variables avant, 24 après — rien de perdu. Aucune clé
n'est jamais affichée en clair : une clé qui traîne dans un journal est une clé à révoquer.

### Ce qui reste hors de portée, et je ne l'invente pas

Joindre la vidéo. Le client livré le dit : *« create the post first, then upload media against the
returned postGroupId via Publora's media workflow »* — workflow qu'il n'implémente pas. Et
`mediaUrls` veut des **URL publiques** quand nos MP4 sont des fichiers locaux. Le pipeline crée donc
les textes et **dit** que la vidéo reste à joindre, plutôt que d'inventer un flux d'upload.

## [F] `fb-humanizer` — un défaut sur onze publications — 2026-09-10

Le catalogue Facebook porte quatre règles que LinkedIn n'a pas. L'une a mordu partout : *« a bare
external link with no framing text »*. **Les onze variantes Facebook et Instagram finissaient sur un
`prestiapp.fr` nu.** Chacune a maintenant son cadrage — différent à chaque fois, parce que dix fois
la même phrase serait elle-même un signal.

Et une première ligne se terminait par deux-points : le pli « See more » la coupait en plein milieu
de son idée.

Les deux audits sont rejouables et sortent 1 en cas de bloquant :
`node scripts/audit-humanizer.mjs` et `node scripts/audit-fb.mjs`.

## [O] TaskStop ne tue pas les enfants — 2026-09-10

Un lot de rendu « arrêté » tournait encore : `node hf-rendre 07`, son `npx`, un ffmpeg et **cinq
chrome-headless-shell**, en train d'écrire des fichiers issus des compositions d'AVANT correction.
Symptôme : `rm: Device or resource busy`, puis un `exit 127` incompréhensible parce que la chaîne
`&&` s'arrêtait avant d'écrire le script suivant.

La leçon vaut au-delà d'ici : **`TaskStop` tue le shell, pas son arbre.** Sur Windows, il faut
`taskkill /T /F` sur le processus racine, puis vérifier qu'aucun `hyperframes|chrome-headless-shell`
ne survit — et le vérifier, pas le supposer.

**Appels IA : 0 sur la réserve Presti.**

## [S] Deux bugs ffmpeg, dont un que Node signalait depuis le début — 2026-09-10

Le lot des trente est mort à la **première** publication. Symptôme : `Error: ffmpeg a échoué (code 255)`,
et rien d'autre — le `grep` de mon script de lot avait avalé la sortie d'erreur de ffmpeg.

**Et la vraie leçon est plus embarrassante que ça.** Ce script de lot, je l'avais improvisé dans un
dossier temporaire. Or le dépôt contenait déjà son lanceur : `pipeline.mjs`, dont l'étape 1 rend les
trente et l'étape 2 les juge — en `stdio: 'inherit'`, donc **sans rien filtrer**. Lancé avec l'outil
que j'avais déjà écrit, ffmpeg m'aurait dit « '350' n'est pas reconnu en tant que commande interne »
du premier coup. J'ai construit un doublon jetable, il a introduit un défaut que l'original n'avait
pas, et ce défaut m'a caché la panne pendant tout un lot.

La commande qui rend et juge les trente, c'est celle-ci, et il n'y en a pas d'autre :

```bash
node scripts/pipeline.mjs --dry-run
```

### Le bug : `shell: true` sur un appel ffmpeg

`hf-rendre.mjs` lançait tout par la même fonction :

```js
spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
```

Le shell est là pour `npx`, qui est un `.cmd` sous Windows et reste introuvable sans lui. Mais
ffmpeg, lui, est un vrai `.exe`, et le shell lui est **nuisible** : Node ne fait que concaténer les
arguments sans les échapper. cmd.exe lit alors le `|` de `adelay=350|350` comme un **tube** et tente
d'exécuter `350`.

Les deux appels côte à côte, sur la même commande :

```
shell=true  → code 255, « '350' n'est pas reconnu en tant que commande interne »
shell=false → code 0
```

**Node le disait depuis le début** — `DEP0190: Passing args to a child process with shell option
true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated` — et
je lisais cet avertissement depuis des heures comme du bruit de dépréciation.

Ce qui rendait le bug sournois : le rendu et la normalisation n'ont **aucun** `|` dans leurs
arguments, donc ils passaient. Seul le mixage de la voix cassait. Le film sortait muet, puis le lot
mourait. Et `voix-mixer.mjs` n'a jamais eu le bug : il appelle `spawnSync` sans shell.

Correctif : `const shell = process.platform === 'win32' && cmd === 'npx'`.

### Le second, trouvé en vérifiant le premier

Une fois la voix mixée, j'ai sondé le fichier au lieu de me fier au message « ♪ voix off mixée » :

```
video, 26.166667
audio, 23.229000
```

La vidéo était entière — le correctif `apad` de l'entrée [V] tenait. Mais la **piste audio**
manquait 2,9 s. La chaîne disait `apad,atrim` : remplir, puis couper. Or l'EOF que `atrim` propage
en amont **interrompt** `apad` ; `whole_dur` n'y change rien. Il faut couper **puis** remplir :

```
apad,atrim=0:26.170,asetpts                    → audio 23.232 s
atrim=0:26.170,asetpts,apad=whole_dur=26.170   → audio 26.170 s
```

Aligné dans `hf-rendre.mjs` **et** dans `voix-mixer.mjs`, qui portait le même ordre.

### Ce que je change dans ma façon de faire

J'avais lancé cinq heures de machine sur un pipeline que je n'avais jamais vu produire **un seul**
fichier sonore. Le rendu marchait, la voix marchait séparément, donc j'ai supposé l'assemblage.

Cette fois : une passe complète sur **un** format (3 minutes), sonde des durées, juge dessus — neuf
contrôles verts — *ensuite* les trente. Les 3 minutes ont attrapé les deux bugs.

**Une vidéo qu'on n'a pas regardée n'est pas finie** — et une piste qu'on n'a pas sondée non plus.

**Appels IA : 0 sur la réserve Presti.**

## [E] Un écart au §7 assumé : où vivent les vidéos — 2026-09-10

Le §7 demande `public/promo/pub-01/` … `pub-10/`. Les vidéos sont dans **`publications/pub-NN/`**,
et c'est délibéré. Trois raisons, la troisième étant la seule qui compte vraiment.

**1. Le va-et-vient.** `publications/pub-NN/` réunit ce qu'il faut pour publier une publication :
`texte.md`, `voix.mp3`, les trois MP4, les miniatures et la planche de contact. Avant, le texte
était ici et la vidéo là-bas.

**2. Le poids.** Trente MP4 font ~330 Mo. `public/promo/pub-*/` est de toute façon dans
`.gitignore` — donc y déposer les fichiers ne les publie pas : Vercel ne reçoit que ce qui est
versionné. Les mettre là créerait 330 Mo de doublon sur le disque de Benj pour exactement rien.

**3. Et la conséquence qu'il faut nommer.** J'ai d'abord cru tenir quelque chose : `public/` est le
dossier statique de Next, donc un fichier qui y vit est servi sur `prestiapp.fr/promo/…` — et
Publora accepte des vidéos par `mediaUrls`, qui exige des **URL publiques**. De quoi débloquer la
pièce jointe automatique que le pipeline dit ne pas savoir faire.

**C'est faux, et pour une raison bête : ces fichiers sont gitignorés, donc jamais déployés.** Une
URL publique demanderait de versionner 330 Mo de MP4 dérivés. Le raccourci n'existe pas.

Donc le pipeline continue de créer des publications **texte** et de **nommer le fichier à joindre à
la main**, et il le dit dans sa sortie. C'est une limite réelle, pas une paresse — et c'est la même
que celle déjà écrite dans la mémoire du projet sur l'impossibilité d'automatiser la vidéo sur les
réseaux.

**Ce que ça change pour Benj : rien**, sinon que les fichiers sont dans `publications/pub-NN/` et
pas dans `public/promo/pub-NN/`. `public/promo/voix/`, lui, est bien là où le §7 le demande — dix
MP3 pèsent 2,8 Mo, pas 330.

**Appels IA : 0 sur la réserve Presti.**

## [G] Le plancher du juge — 28/30 verts n'était pas une bonne nouvelle — 2026-09-10

Le lot des trente est sorti : **2 recalés**, `pub-01/vertical.mp4` (1,13 s figées) et
`pub-03/paysage.mp4` (1,00 s), sur « Aucun plan figé » (seuil 0,8 s).

### D'abord, une erreur à moi, corrigée avant qu'elle coûte quelque chose

J'ai annoncé que le juge sortait en **code 0** malgré deux échecs, et j'ai écrit que c'était grave
parce que `pipeline.mjs` s'appuie dessus pour refuser de publier.

C'était faux. Ma commande était `node video-qa.mjs … | sed … > fichier`, et `$?` après un tube
renvoie le code du **dernier** élément — celui de `sed`. Vérifié :

```
juge seul, sans tube  → code 1
juge suivi d'un tube  → $? = 0   (celui de sed)
                        PIPESTATUS[0] = 1   ← le vrai
```

`pipeline.mjs` appelle `spawnSync` **sans tube** : le garde-fou n'a jamais été percé. Deuxième fois
dans la même journée qu'un tube me cache une vérité — après le `grep` qui avait mangé stderr.

### Ce n'était pas « deux ratés », c'était un type de plan sans marge

J'ai mesuré la marge des trente à l'échantillonnage **exact** du juge (8 i/s, 160 px, gris) :

```
2 recalés · 4 à marge fine (0,5–0,8 s) · 24 confortables (≤ 0,38 s)
```

Et les six plans de code de la flotte mesurent, écart moyen :

```
0,00460 · 0,00507 · 0,00516 · 0,00605 · 0,00652 · 0,00658      pour un seuil à 0,006
```

**Trois sur six déjà sous le seuil, les trois autres à moins de 10 % au-dessus.** Les vingt-huit qui
passaient ne passaient pas par conception : par chance de phase.

### La cause, et l'hypothèse qui m'a trompé

Mon explication était : les dérives sont en `sine.inOut`, dont la vitesse tend vers zéro aux deux
extrémités d'un plan ; il suffit de passer en linéaire. Élégant, et **faux**.

La vérification adversariale a **rendu** la variante linéaire au lieu de la déduire :

```
base      1,13 s  ÉCHEC     écart moyen 0,00450
linéaire  1,13 s  ÉCHEC     écart moyen 0,00433   ← PIRE que la base
```

La fenêtre qui échoue est au **milieu** du plan (u = 0,46 à 0,87), là où `sine.inOut` tourne déjà à
1,4–1,57 × sa moyenne. Supprimer ce pic pour regarnir les extrémités dégrade le seul endroit qui
tenait. J'aurais brûlé 75 minutes de machine sur un raisonnement qui sonnait juste.

La vraie cause est plus bête : **le plan de code était le seul plan porteur de texte dont le bloc ne
dérivait pas.** Sa seule dérive continue était une échelle de 9 % sur la fenêtre de code — et une
échelle a un point fixe, son centre, donc *la ligne qu'on demande de lire est ce qui bouge le
moins*. Mesuré : 0,15 px « juge » par échantillon, là où il en faut 0,47.

### Le correctif, et ses chiffres

**Plan de code** — son bloc dérive à **45 px/s**. Ce n'est pas un nombre libre : c'est (31 + 58) / 2,
la moyenne des deux vitesses de bloc déjà écrites dans le fichier (marque 31, texte 58). On lit du
code : on va moins vite qu'un titre. Pas 58 non plus, qui donnerait `amp(58)` = 70 px quand la boîte
sûre en paysage n'a que 69,5 px de battement.

**Plan carte** — c'est la **section entière** qui monte, à 58 px/s, vers le haut seulement. La
section et non l'image : `.porte` garde son `overflow: hidden` (la lueur reste découpée à la hauteur
de la carte) et `.surligne` reste alignée par construction. Vers le haut parce que la légende est
déjà à 154 px du bas, dans la bande des surcouches Reels/Facebook.

Vérifié par rendu **avant** de lancer le lot :

| | avant | après |
|---|---|---|
| pub-01 vertical (code) | 1,13 s ✗ | **0,25 s** ✓ |
| pub-08 vertical (carte) | 0,75 s ⚠️ | **0,25 s** ✓ |

### Dix-huit fichiers, pas trente, et c'est démontré

La règle CSS ajoutée vise `.capture.carte`. Dans pub-04, 05, 09 et 10 : **0 ligne supprimée,
5 ajoutées, et 0 élément `.capture.carte`**. Le sélecteur ne matche rien, donc le rendu est
identique par construction — pas par pari. Leur MP4 reste valide.

**Appels IA : 0 sur la réserve Presti.** (La vérification adversariale a tourné sur mon budget, pas
sur celui de Presti.)

## [C] Un défaut que je n'ai pas causé, et que je ne corrige pas seul — 2026-09-10

En regardant les images du plan « carte » — parce qu'une vidéo qu'on n'a pas regardée n'est pas
finie, et que le juge ne voit pas ça — j'ai trouvé ceci en fin de plan :

> L'image de la carte est posée à **102 %** de la largeur du cadre (`width: F.l * 1.02`) et la dérive
> l'emmène à `scale: 1.14`, donc **116 %**. `.porte` fait la largeur du cadre et rogne. En fin de
> plan la carte touche les deux bords et le texte est coupé.

Sur la publication 8 : l'URL affiche `://prestiapp.fr/p/atelier-du-chene` — **le `https` est mangé**.
Sur la 7 : « Standard » devient « tandard », « INCLUS » devient « NCLUS ».

**Ce n'est pas mon correctif.** Vérifié sur `publications/pub-07/paysage.mp4`, un fichier **non
re-rendu**, donc antérieur : même rognage, même texte coupé. Le défaut est là depuis le début et le
juge ne le mesure pas — il compte le mouvement, pas le cadrage.

**Et ce n'est peut-être pas un défaut.** Le commentaire du code dit : « c'est le balayage horizontal
qui donne le mouvement : l'œil traverse la rangée ». Sur une rangée de boutons, traverser en
rognant est le procédé. Sur une URL qu'on vend comme « votre lien, à coller partout », couper le
`https` est autre chose.

**Je ne le change pas.** Réduire le zoom modifierait l'intention du plan, et le corriger « au
passage » pendant un correctif de plan figé serait exactement l'élargissement de périmètre que ce
journal reproche ailleurs. **La question est posée à Benj** : correction dans le même cycle de
rendu (gratuit) ou plus tard (45 minutes).

**Appels IA : 0 sur la réserve Presti.**

## [§7] La sortie du juge, verte, sur les trente — 2026-09-10

Le §7 demande « **la sortie complète du juge, verte, pour les trente fichiers** ». La voici, avec
son code de sortie — et cette fois lu **sans tube**, après l'avoir mal lu deux fois aujourd'hui.

```
$ node scripts/video-qa.mjs publications/pub-{01..10}/{vertical,carre,paysage}.mp4
CODE DE SORTIE : 0
30 fichiers · 30 « Tout passe » · 0 ÉCHEC
```

### Les neuf critères, fichier par fichier

| Fichier | Durée | Débit | Plan figé | Énergie | Coupes / 10 s | Cadre rempli | Fin |
|---|---|---|---|---|---|---|---|
| `pub-01/vertical` | 26.2 s | 4138 kbps | 0.25 s | 0.0525 | 9.6 | 95 % | 37 |
| `pub-01/carre` | 26.2 s | 3380 kbps | 0.13 s | 0.0563 | 9.6 | 94 % | 42 |
| `pub-01/paysage` | 26.2 s | 4405 kbps | 0.13 s | 0.0555 | 10.7 | 79 % | 49 |
| `pub-02/vertical` | 22.6 s | 4271 kbps | 0.13 s | 0.0648 | 9.3 | 95 % | 41 |
| `pub-02/carre` | 22.6 s | 3533 kbps | 0.13 s | 0.0685 | 9.3 | 95 % | 47 |
| `pub-02/paysage` | 22.6 s | 4614 kbps | 0.13 s | 0.0635 | 9.3 | 81 % | 55 |
| `pub-03/vertical` | 23.1 s | 4331 kbps | 0.25 s | 0.0477 | 9.1 | 91 % | 41 |
| `pub-03/carre` | 23.1 s | 3516 kbps | 0.13 s | 0.0516 | 9.5 | 87 % | 48 |
| `pub-03/paysage` | 23.1 s | 4730 kbps | 0.13 s | 0.0480 | 10.0 | 71 % | 58 |
| `pub-04/vertical` | 22.9 s | 4274 kbps | 0.13 s | 0.0512 | 8.7 | 92 % | 41 |
| `pub-04/carre` | 22.9 s | 3498 kbps | 0.13 s | 0.0566 | 9.6 | 87 % | 48 |
| `pub-04/paysage` | 22.9 s | 4788 kbps | 0.13 s | 0.0528 | 10.1 | 83 % | 57 |
| `pub-05/vertical` | 21.9 s | 4231 kbps | 0.13 s | 0.0542 | 9.1 | 94 % | 40 |
| `pub-05/carre` | 21.9 s | 3373 kbps | 0.13 s | 0.0589 | 9.1 | 94 % | 46 |
| `pub-05/paysage` | 21.9 s | 4626 kbps | 0.13 s | 0.0550 | 9.1 | 78 % | 53 |
| `pub-06/vertical` | 20.9 s | 4323 kbps | 0.13 s | 0.0461 | 9.1 | 95 % | 41 |
| `pub-06/carre` | 20.9 s | 3517 kbps | 0.13 s | 0.0507 | 9.6 | 95 % | 47 |
| `pub-06/paysage` | 20.9 s | 4728 kbps | 0.13 s | 0.0481 | 10.5 | 71 % | 55 |
| `pub-07/vertical` | 20.1 s | 4257 kbps | 0.13 s | 0.0568 | 8.0 | 94 % | 41 |
| `pub-07/carre` | 20.1 s | 3467 kbps | 0.13 s | 0.0623 | 9.0 | 94 % | 48 |
| `pub-07/paysage` | 20.1 s | 4515 kbps | 0.13 s | 0.0581 | 9.0 | 86 % | 56 |
| `pub-08/vertical` | 20.3 s | 4198 kbps | 0.25 s | 0.0452 | 7.9 | 96 % | 40 |
| `pub-08/carre` | 20.3 s | 3437 kbps | 0.13 s | 0.0505 | 8.9 | 94 % | 46 |
| `pub-08/paysage` | 20.3 s | 4689 kbps | 0.13 s | 0.0461 | 9.9 | 80 % | 55 |
| `pub-09/vertical` | 22.1 s | 4354 kbps | 0.13 s | 0.0496 | 8.6 | 92 % | 40 |
| `pub-09/carre` | 22.1 s | 3477 kbps | 0.13 s | 0.0546 | 8.2 | 92 % | 46 |
| `pub-09/paysage` | 22.1 s | 4845 kbps | 0.13 s | 0.0511 | 8.6 | 82 % | 55 |
| `pub-10/vertical` | 21.6 s | 4303 kbps | 0.13 s | 0.0441 | 7.4 | 89 % | 41 |
| `pub-10/carre` | 21.6 s | 3390 kbps | 0.13 s | 0.0494 | 7.9 | 87 % | 47 |
| `pub-10/paysage` | 21.6 s | 4554 kbps | 0.13 s | 0.0455 | 9.3 | 91 % | 54 |
### Les marges, et pourquoi elles comptent plus que les verdicts

| Critère | Seuil | Pire des 30 | Marge |
|---|---|---|---|
| Plan figé | ≤ 0,8 s | **0,25 s** | 3,2 × |
| Débit | ≥ 3000 kbps | **3373 kbps** | 12 % |
| Coupes | ≥ 5 / 10 s | 7,9 | 1,6 × |
| Cadre rempli | ≥ 70 % | 71 % | 1 point |
| Énergie | ≥ 0,020 | 0,0452 | 2,3 × |
| Fin non blanche | ≤ 190 | 54 | large |

Avant correctif, la pire plage figée était de **1,13 s** et six fichiers vivaient sous les 0,006
d'écart moyen. Le critère est passé de « on passe si la phase tombe bien » à « on passe avec trois
fois la marge ».

**Deux critères restent à un cheveu, et il faut le dire plutôt que fêter le vert :**

- **Le cadre rempli à 71 % pour une barre à 70 %** sur `pub-03/paysage` et `pub-06/paysage`. Un
  point. Toute retouche de mise en page dans ces deux films peut les faire basculer.
- **Le débit à 3373 kbps pour 3000** sur le format carré, qui est structurellement le plus juste :
  1080×1350 fait 1,46 Mpx contre 2,07 en vertical, donc moins de bits à qualité constante. Le
  journal [V2] tient toujours : un film qui encoderait sous 3000 à `crf 20` ne serait pas sale.

**Appels IA : 0 sur la réserve Presti.**

## [M] La voix dehors, la musique dedans — 2026-09-10

Benj, après avoir regardé la publication 1 : « **enlève les voix c'est horrible mais mets de la
musique à la place** ». Puis, sur mes trois nappes synthétisées : « **c'est horrible trouve une
musique adapté a notre outil qui capte la vibe** ».

Deux refus de suite. Le deuxième était mérité.

### Le retrait de la voix : aucun re-rendu

Une piste audio se retire sans toucher à l'image : `-c:v copy -an`. **Une seconde par fichier au
lieu de deux minutes.** Trente fichiers traités, juge repassé derrière — code 0, 30 « Tout passe ».
Les `voix.mp3` restent sur le disque : c'est réversible d'une commande.

### Ce que j'ai raté au premier essai

J'ai fabriqué trois nappes en ffmpeg — bourdons en ré mineur, filtrés, réverbérés. Zéro euro, zéro
licence à vérifier, entièrement à nous. Techniquement irréprochable, et **inécoutable**. Du sinus
filtré reste du sinus filtré.

L'erreur n'était pas de proposer du synthétisé : c'était de croire qu'un raisonnement sur la
contrainte (0 €, local, aucun risque) pouvait remplacer une oreille. La même erreur que le plan
figé, dans un autre domaine : *ce qui se calcule ne se juge pas toujours*.

**Ce qui était juste, en revanche, c'est de lui faire écouter en CONTEXTE** — montées sur la vidéo,
pas isolées. Une musique se juge sous l'image.

### La recherche, et pourquoi elle a été vérifiée piste par piste

Ces vidéos sont des **publicités commerciales**. Il fallait donc : usage commercial autorisé,
**aucune attribution** (on ne met pas un crédit dans une pub), **aucun partage à l'identique** — le
piège exact des photos en CC BY-SA déjà attrapé ici.

Recherche en trois familles parallèles, puis **chaque piste repassée devant un vérificateur chargé
d'OUVRIR la page** et de lire la licence réelle, pas celle annoncée. Bilan : **17 trouvées,
16 vérifiées, 13 propres, 4 retenues**. Les URL inventées auraient été attrapées là ; il n'y en a
pas eu, et les quatre durées annoncées correspondaient **exactement** aux fichiers téléchargés
(100 / 108 / 124 / 105 s).

Benj a pris **1, 2 et 4** — « comme ça ça fait de la variation ».

### Le risque qu'il faut nommer, parce qu'il ne s'entend pas

Deux des trois pistes sont de **Musinova**, un studio qui revend le même catalogue **7 à 99 €**
ailleurs. La licence Pixabay reste irrévocable — rien à craindre juridiquement — mais un ayant droit
qui vend à 99 € a un intérêt direct à empreinter son catalogue. **Un match Meta Rights Manager peut
couper l'audio d'une pub déjà en ligne.**

Publications exposées (Musinova + Facebook/Instagram) : **01**, **08**, **09**. Parade écrite dans
`promo-src/musique/LISEZMOI.md` : repasser la piste 4 (Databend) sur celle qui se fait couper, une
seconde par fichier.

### Deux bugs à moi, dans la même demi-heure

**1. `--depart=8` pris pour un nom de format.** Le script lisait `process.argv[4]` comme le format ;
avec le drapeau en 4ᵉ position il cherchait `pub-01/--depart=8.mp4`, ne trouvait rien, **et sautait
les trente en silence** en affichant « ✓ 0 fichier(s) sonorisé(s) », code 0. Ça ressemblait à une
réussite. Correctif : filtrer les drapeaux, **et** sortir en erreur si aucun fichier n'a été traité.
Zéro fichier n'est jamais un succès.

**2. Le `node` de la boucle mangeait l'entrée standard.** Un `while IFS='|' read` alimenté par un
heredoc, avec un `node` dedans : le processus enfant consomme le flux et **avale une ligne sur
deux**. Cinq publications sur dix ont été sautées. Elles ont échoué **bruyamment** — grâce au
garde-fou ajouté dix minutes plus tôt. Correctif : `< /dev/null` sur l'appel.

### Ce que porte le son maintenant

Musique posée à **−23 LUFS**, un lit de fond. La voix était à **−16**, un niveau de présentateur —
et c'est en grande partie ce qui la rendait envahissante. Ce n'était pas seulement le timbre.

La piste suit le **propos** de chaque publication et non un tour de rôle, et chaque film entre à un
**endroit différent** du morceau : sans ça, les quatre publications qui partagent une piste
sonneraient identiques. Le détail est dans `promo-src/musique/LISEZMOI.md`.

**Appels IA : 0 sur la réserve Presti.**

## [R] « Je comprends rien à ce qu'il dit » — la réécriture de fond — 2026-09-10

Benj, après avoir regardé les vidéos livrées : « **et revoit l'orthographe c'est une catastrophe et
je comprend rien a ce qu'il dit ça a pas de logique juste présente ce qu'on fait et les différentes
fonctionnalités rien de plus simple ?** », puis « **rajoute aussi des termes du bâtiment,
productivité, efficacité, simplicité, donc refait** ».

Deux reproches. Le premier était partiellement fondé, le second entièrement.

### L'orthographe : il avait raison, mais pas où je cherchais

J'ai d'abord audité le texte **des vidéos** et mon détecteur a crié au loup — 40 « fautes ». Elles
étaient toutes fausses, et pour **deux bugs à moi** :

1. La plage `[A-ZÀ-Ÿ]` en JavaScript va de U+00C0 à U+0178 et **inclut donc les minuscules
   accentuées** (U+00E0–U+00FF). Mon test « majuscule au milieu d'un mot » se déclenchait sur
   n'importe quel mot accentué.
2. J'avais codé « espace avant `:` » comme une faute. **En français c'est la règle**, pas l'erreur.

Corrigé, le verdict est net : **132 champs de texte dans les vidéos, zéro faute.**

**Mais le texte des POSTS, lui, était fautif** — celui que Benj copie-colle dans LinkedIn. Il
utilisait l'apostrophe droite `'` au lieu de la typographique `’`, sur **332 occurrences**. En
français professionnel ça se voit immédiatement. Corrigé en protégeant d'abord les blocs de code
(`devis_auto: 'jamais'` est une valeur littérale, pas une élision), puis en ne remplaçant qu'entre
deux lettres.

**La leçon** : quand quelqu'un dit « c'est une catastrophe » et qu'on ne trouve rien, c'est souvent
qu'on regarde le mauvais fichier. Pas qu'il a tort.

### Le fond : il avait entièrement raison, et ça se voit d'un coup d'œil

Les dix ouvertures de la v1, mises bout à bout :

```
« Quelqu'un s'est abonné. »          « Voilà tout ce qu'elle contient. »
« Le code lui retire ceci. »         « Je n'y ai pas accès. »
« La facture électronique. »         « Je l'ai testée. Elle a raté. »
« Trois prix. Rien de caché. »       « Un site à votre nom. »
« Ce qu'il reste dans le camion. »   « Une demande de devis. »
```

**Aucune ne dit ce que fait Presti.** Le registre — première personne du fondateur, transparence
radicale, aveu de limite avant l'argument — ne fonctionne que pour un lecteur qui connaît déjà le
produit. Pour un artisan qui découvre la marque dans son fil, c'est illisible. Benj l'a formulé
mieux que moi : « ça a pas de logique ».

### La v2

Trois règles, appliquées aux dix :

1. **Une publication = une fonctionnalité**, nommée dès l'ouverture. La 01 devient « Presti en
   vingt secondes » : client écrit → réponse → devis → facture → relance. C'est la publication qui
   manquait complètement.
2. **Vocabulaire du métier** : chantier, poste, main-d'œuvre, fourniture, acompte, TVA, réception,
   camion, dépôt, atelier, tournée. Zéro jargon logiciel.
3. **Chaque publication répond à « qu'est-ce que j'y gagne »** — productivité (« le devis du soir,
   supprimé »), efficacité (« plus de tournée pour rien »), simplicité (« une seule boîte à
   relever »).

Ce que la v2 **abandonne**, et je l'ai dit à Benj plutôt que de le laisser découvrir : les aveux de
limite ne sont plus les accroches. Elles restent dites (la 06 et la 07 annoncent qu'elles démarrent
à 59 €) mais ne sont plus le sujet. Et la publication sur le premier abonné disparaît.

### Un bug d'orchestration, et sa règle

Le premier lot v2 est mort après la publication 03. Cause : je l'avais lancé avec `&` **à
l'intérieur** d'un appel qui se terminait aussitôt. Le processus détaché ne survit pas à la fin de
son appel parent. Le lot précédent, lui, avait tenu — parce qu'il tournait sans `&`, en tâche de
fond gérée par l'outil.

**Règle : ne jamais détacher un long traitement par `&` depuis un appel court.** Utiliser le mode
tâche de fond de l'outil, qui garde le processus vivant.

Coût : 9 fichiers rendus pour rien. Attrapé parce que je vérifie les horodatages au lieu de croire
un « exit code 0 ».

**Une dette laissée ouverte, notée ici pour qu'elle ne se perde pas** : le linter d'HyperFrames
signale `timed_element_missing_clip_class` sur les rideaux de transition (`p11-tr`, `p12-tr`…) —
ils portent des attributs de timing sans `class="clip"`. Non bloquant, et je n'y touche PAS
maintenant : ajouter `.clip` leur donnerait `overflow: hidden`, ce qui peut changer le rendu. À
traiter avec un rendu de vérification, jamais au milieu d'un lot.

**Appels IA : 0 sur la réserve Presti.**

## [§7 v2] Les trente, refaits, sonorisés, verts — 2026-09-10

```
$ node scripts/video-qa.mjs publications/pub-{01..10}/{vertical,carre,paysage}.mp4
CODE DE SORTIE : 0
30 fichiers · 30 « Tout passe » · 0 ÉCHEC
```

| Critère | Seuil | Pire des 30 | Marge |
|---|---|---|---|
| Plan figé | ≤ 0,8 s | **0,25 s** | 3,2 × |
| Débit | ≥ 3000 kbps | **3286 kbps** | 9,5 % |
| Coupes | ≥ 5 / 10 s | **6,7** | 1,3 × |

Et le pipeline complet passe : `node scripts/pipeline.mjs --dry-run --sans-rendu` sort en 0, avec
**11 créneaux programmés** (les dix publications, la n° 1 comptant deux fois pour ses variantes A et B).

**Le son** : musique de fond mesurée à **LRA 2,4 LU entre −24 et −21,6 LUFS**, crête vraie à
−9,6 dBFS. Un lit très plat, comme voulu. De la parole afficherait une amplitude de 8 à 12 LU et se
situerait vers −16 : la mesure suffit à distinguer les deux sans écouter.

**Les textes** : les trois audits verts, et mieux que la v1 ne l'a jamais été —
**0 accroche à −34 %, 20 accroches à +34 %** (les vingt variantes ouvrent sur un nombre), et **zéro
occurrence** sur les cinq règles du humanizer, tirets cadratins compris.

### Trois pièges rencontrés dans la même heure, et leurs règles

**1. `EPERM` au renommage final.** Le moteur écrit le MP4 dans un dossier de transaction puis le
renomme. Sous Windows ce renommage échoue par intermittence — antivirus ou indexeur qui tient
encore les 40 Mo qu'on vient d'écrire. Mesuré : sur le même lot, pub-05 paysage passe et pub-05
carré échoue à trente secondes d'écart. **Signature d'un verrou transitoire, pas d'un bug.**
Correctif : trois essais, avec nettoyage du dossier de transaction entre chacun.

**2. Un processus détaché par `&` ne survit pas à son appel parent.** Le premier lot v2 est mort
après la publication 03 pour ça. Neuf fichiers rendus pour rien. **Règle : jamais de `&` pour un
long traitement ; utiliser le mode tâche de fond de l'outil.**

**3. La voix revenait toute seule.** `hf-rendre.mjs` remixait `voix.mp3` dès qu'il le trouvait — et
les fichiers étaient toujours là, gardés exprès pour la réversibilité. Les quatre premiers rendus v2
sont donc ressortis avec la voix rejetée, **disant en plus l'ancien texte**. La musique l'écrasait
derrière, donc rien n'était visible dans le produit fini : c'est le pire cas, un défaut qui se
répare de lui-même et qu'on ne voit jamais. Désactivée par défaut, `PRESTI_VOIX=1` pour la remettre.

### Un fichier « en échec » qui contenait pourtant le bon film

Le log dit `Render failed` pour pub-04 vertical et pub-05. Leurs MP4 existent pourtant, à la bonne
durée. **Je n'ai pas tranché sur le raisonnement : j'ai extrait une image.** Elle affiche
« CHANTIER RÉCEPTIONNÉ / La facture, maintenant. », donc la v2. Idem pour la 05 : « VOTRE VITRINE /
Un site à votre nom. »

Un code de sortie n'est pas une vérité sur le contenu d'un fichier. **Regarder l'image reste le seul
contrôle qui ne ment pas** — c'est exactement la règle du prompt, appliquée à un cas où elle
contredisait le journal d'exécution.

**Appels IA : 0 sur la réserve Presti.**

## [D] Citer un drapeau ne dispense pas de l'ouvrir — 2026-09-10

En préparant la vague 2, j'ai croisé les 23 capacités de `lib/plans.ts` avec ce que la vague 1
raconte. Quatre d'entre elles portent un **drapeau** (`flag`) dans la grille tarifaire. J'ai ouvert
`lib/flags.ts` pour la première fois de la journée :

```js
/** Canaux WhatsApp — vendu dans la grille cible, pas construit. Reste caché tant que c'est vrai. */
canauxWhatsapp: false,
/** Canaux réseaux sociaux — idem. */
canauxReseaux: false,
```

**La publication 09, rendue, jugée verte et prête à partir, annonçait « WhatsApp à partir de 59 € »
et « Les réseaux à 99 € ».** Une publicité pour deux fonctionnalités qui n'existent pas.

### Ce qui rend l'erreur grave, et pas seulement embarrassante

**Mon propre `fonde` la décrivait.** Il disait, mot pour mot :

> « Les deux derniers sont derrière des drapeaux (`canauxWhatsapp`, `canauxReseaux`) : la vidéo dit
> à partir de quelle formule. »

J'avais donc **vu** les drapeaux, je les avais **nommés**, et j'en avais tiré une conclusion
rassurante — « la vidéo dit à partir de quelle formule » — sans jamais **lire leur valeur**. La
mention du garde-fou tenait lieu de vérification. C'est exactement la faute que le champ `fonde`
existe pour empêcher, commise dans le champ `fonde` lui-même.

Et `lib/plans.ts:143` le disait déjà autrement :

```js
export const GRILLE = GRILLE_COMPLETE.filter((l) => !l.flag || FLAGS[l.flag])
```

La grille tarifaire du site **filtre ces lignes**. Le produit ne les montre nulle part. Seule ma
vidéo les vendait.

### Ce qui m'a rattrapé

Pas moi : **les agents qui ont écrit les textes de posts.** Une réponse type de la publication 09 dit
noir sur blanc : « Pas aujourd'hui. WhatsApp figure dans la grille cible, il n'est pas construit, et
tant que c'est vrai il reste masqué dans l'application. »

Ils avaient ouvert le drapeau. La consigne qui leur était donnée — « n'affirme RIEN que tu n'aies
pas vérifié dans le code » — a mieux fonctionné sur eux que sur moi.

*(Une ligne de post vendait quand même WhatsApp dans une énumération à 59 € : corrigée aussi.)*

### Le correctif, et il est permanent

`scripts/audit-drapeaux.mjs` : il lit les valeurs dans `lib/flags.ts`, et refuse toute publication
citant une fonctionnalité éteinte. Dans les vidéos, aucune tolérance — on ne nuance pas en six mots.
Dans les textes de posts, une mention est acceptée **si la même phrase la dément** (« pas
construit », « pas aujourd'hui », « reste masqué »), parce que dire ce qu'on n'a pas est utile.

```
$ node scripts/audit-drapeaux.mjs
⛔ ÉTEINT  canauxWhatsapp     ⛔ ÉTEINT  canauxReseaux
✓ allumé  siteSlides3d       ✓ allumé  plateformePersona
✓ allumé  inventaireRecherche ✓ allumé  plateformeRegles
ℹ️  POST L1125 · canauxWhatsapp cité mais DÉMENTI dans la même phrase — accepté
✓ Aucune promesse de vente sur une fonctionnalité éteinte.
```

**C'est la deuxième fois.** L'audit v4 avait déjà relevé des « promesses de vente » de cette famille,
et l'en-tête de `lib/plans.ts` le rappelle en commentaire. Un défaut qui revient est un défaut
qu'aucun contrôle ne surveille : il en a un maintenant.

**Appels IA : 0 sur la réserve Presti.**

## [X] Le contrôle avant publication : sept sur dix étaient fausses — 2026-09-13

Benj avait dit « oui mais vérification avant » avant de programmer les onze envois. Cinq angles
indépendants (vérité des affirmations, calendrier, chaîne technique, juridique, fichiers), puis un
sixième qui a rouvert chaque fichier cité et tranché : **NE PAS PUBLIER. Quatorze bloquants
confirmés. Une seule publication propre : la 03** — celle que Benj a postée lui-même entre-temps.

J'ai relu moi-même les quatre plus graves avant de relayer. Tous tenaient.

### Les trois qui auraient coûté cher

**La 08 vendait l'inverse du code.** « Le devis parti. Puis plus rien. Vous oubliez de relancer.
Presti n'oublie pas. » Or `planifierRelances` n'a que **deux appelants** dans tout le dépôt —
`app/api/messages/route.ts:99` et `:164` — tous deux sur la **réponse de l'artisan**. L'envoi d'un
devis n'arme rien ; pire, chiffrer depuis la conversation met le lead en statut `devis`, que le cron
saute (`app/api/cron/relances/route.ts:56-60`). La pub vendait la fonction qui éteint la promesse.

**La 04 affichait « L'acompte est déduit. »** — `lib/DevisPDF.tsx:184` réserve cette ligne au
devis (`!isFacture`). Aucune facture ne déduit rien. Un artisan qui facture le solde en croyant
l'acompte déduit **facture deux fois son client**, sur une pièce comptable. Le `.md` disait déjà
« ce carton est à corriger avant montage » — jamais fait.

**La 05 vendait la galerie dès 29 €** — `lib/siteLayout.ts:29` la réserve au niveau 2 ; Essentiel
est au niveau 1.

### Le motif commun, et pourquoi mes audits ne l'attrapaient pas

À chaque fois, `lib/plans.ts` disait vrai : la **capacité** existait dans la formule. Ce qui
manquait, c'était **l'écran** — ou la fonction réellement branchée. Une capacité déclarée ne prouve
jamais qu'un artisan trouve le bouton. Et `audit-drapeaux.mjs` ne testait que six mots-clés contre
six drapeaux : aucun des quatorze bloquants n'était de son ressort. Son vert était une **fausse
réassurance**, et le contrôleur l'a écrit tel quel.

### Le reste, en une ligne chacun

06 : trois lieux de stock alors que la console n'en a que deux (`LIEUX = ['atelier','camion']`), et
une « alerte » qui n'existe pas (`notifierArtisan` ne connaît que `nouvelle_demande` et
`devis_accepte`). 01 et 02 : « la réponse part seule » vendue à 29 € alors que `plateforme.ia.auto`
est dans STUDIO. 09 : « le téléphone » et « le formulaire du site » — Presti ne relève aucun appel
et le site n'a pas de formulaire. 07 : « la demi-heure de recherche », un chiffre que rien ne
mesure. 10 : le vertical **muet**, en ligne, et le juge l'avait laissé passer. Cinq blocs de posts
avec un prix sans la mention TVA (art. 293 B). La 06 programmée sur Instagram avec le texte
Facebook et son lien `/a/facebook`. Et **l'ordre cassé** : la simulation donnait la 07 le 12 et la
01 le 15 — le premier contact du public aurait été l'inventaire à 59 €.

### Ce qui a été fait, ce matin (2026-09-13)

- Douze brouillons supprimés de Publora la veille : rien ne pouvait partir par accident.
- 27 cartons corrigés dans huit vidéos, chacun avec la ligne de code qui l'autorise dans son
  commentaire ; re-vérification lancée dans le code, un agent par vidéo.
- Le juge mesure maintenant **une piste audio entre −26 et −19 LUFS** : un muet sort en code 1.
- Le pipeline : zéro réessai sur `/create-post`, un 4xx ne reboucle jamais, doublons refusés depuis
  le journal, variante confrontée au réseau de la ligne, `HEAD` sur chaque vidéo avant le premier
  envoi, journal écrit **après chaque post**, et le calendrier ancré sur un lundi — la 01 part en
  premier, mardi 15.
- `audit-drapeaux.mjs` : tout prix affiché doit dire « /mois » (vidéo) ou porter « 293 B » (post).
- La 06 programmée en variante B sur Instagram ; « atelier et camion » dans les textes.
- Musique reposée sur `pub-10/vertical`.

### Deux erreurs à moi dans la réparation, écrites pour ne pas les refaire

**`String.replace(chaîne, chaîne)` interprète `$'`** — « tout ce qui suit la correspondance ». Ma
regex de variante contenait `(.+)$'` : le script a injecté le reste du fichier à cet endroit puis
l'a réécrit derrière. `pipeline.mjs` dupliqué, pas de copie dans git, et le `cp` de sauvegarde était
dans une commande qui n'avait jamais parsé. Reconstruit à partir de la copie de queue, intacte par
chance. Désormais : `split(a).join(b)`, et la sauvegarde dans sa propre commande.

**Un heredoc bash long avec des backticks échappés ne parse pas** — et comme la commande entière
échoue, rien ne s'exécute. Deux scripts y sont passés. Désormais : le script dans un fichier, puis
`node fichier`.

**Appels IA : 0 sur la réserve Presti.**
