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

## Liste H — actions humaines (vérifiées par l'effet, jamais en demandant) — état honnête au 05/09 23:30

**Prouvé (44 suites = 42 du v6 + `modes-e2e` + `code-connexion-e2e`)** : 43 vertes en local et sur GitHub au dernier passage cité (v6 run #5 : 42/42 ; v7 : `modes-e2e` 35/35 en prod). **Pas encore prouvé** : ce qui suit, sans exception.

| # | Action | État | Ce qui n'est PAS prouvé tant que ce n'est pas fait |
|---|--------|------|-----------------------------------------------------|
| ~~H17~~ | ✅ **fait par Benj le 05/09** — 0063 collée, drapeau levé, déployé ; `code-connexion-e2e` **56/56** en prod, lanceur **44/44** | — | — |
| H4 | Clé Stripe de TEST (`STRIPE_SECRET_KEY_TEST`) dans `.env.local` | ⛔ absente au 05/09 | les **11 transitions d'abonnement** en conditions réelles (`abonnement-e2e`) — le portail est configuré, un abonné réel ne s'est pas présenté |
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
