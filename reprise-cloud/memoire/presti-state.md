---
name: presti-state
description: État et feuille de route de Presti — le SaaS artisans déployé sur prestiapp.fr
metadata: 
  node_type: memory
  type: project
  originSessionId: 7e59f8cf-41af-4413-b326-b03458018a55
  modified: 2026-09-25T20:16:40.828Z
---

Presti est en production sur `https://prestiapp.fr` (dépôt `C:\Users\benja\Documents\presti`, branche
locale `master`, poussée par `git push origin HEAD:main`).

**25/09/2026 (soir) : VENTE DES SITES OUVERTE** (siteCommandeVente levé, commit 86ce0f3, READY).
- « Commander mon site », à 300 € une fois, est visible sur la landing, sur /abonnement et dans le menu.
- Ouvert sur décision de Benj, pour ses appels du 26/09 autour de Marans (Charente-Maritime) ; la campagne est préparée dans `presti-ops/prospection/2026-09-26-marans/`.
- **Rappel à faire au PREMIER site vendu : passer Vercel en Pro** (décision de Benj ; l'offre Hobby interdit l'usage commercial).
- En production aussi : la série 025 et sa suite (0170524, ef8ff27, 32333bc) ; la proposition de réponse dès la première demande ; les migrations 0093 à 0095.

**Le Poste de contrôle** (`/controle`) est l'écran unique depuis lequel Benj dirige l'entreprise. Au
2026-09-07 il porte : Aujourd'hui (chiffres sourcés, à faire, fil), Clients & abonnements avec la
fiche d'un artisan et ses huit actions, Apports (registre avec preuve), Messagerie (boîte de
l'entreprise, IMAP OVH), Journal. `/direction`, son ancienne adresse du prompt v10, redirige en 308 ;
l'ancien écran « façon Jarvis » est supprimé.

Le vocabulaire de la base garde le mot *direction* (table `journal_direction`, rôle `direction`,
`lib/direction/`) : c'est un nom de métier, pas de chemin. Ne pas le renommer sans raison.

**Prompts** : v10 dans `plans/009-centre-de-controle.md`, v11 (en cours) dans
`plans/010-poste-de-controle.md`. Jalons v11 faits : J0 (état de l'app), J1 (nettoyage, partiel — la
purge attend Benj), J2 (fusion des interfaces). Reste : J3 droits d'Alexandre + preuve des apports,
J4 clients complet, J5 comptabilité, J6 messagerie/santé/support/réglages.

**Le mode support** (v11 §5, livré le 2026-09-08, drapeau `supportArtisan` levé). Ce n'est **pas**
un « voir comme lui » : une session en tant que l'artisan produirait des traces attribuées à lui.
C'est une fenêtre d'une heure, sur UN élément que **l'artisan a désigné** en demandant de l'aide
(0075) ; elle naît fermée, elle ne s'ouvre que par son clic, on n'y lit que la **forme** (jamais le
contenu des échanges ni les coordonnées de ses clients), et chaque lecture écrit deux traces dont
une qu'il lit. Il peut poser un verrou définitif. Preuve : `support-e2e` 34/34.

Effet de bord important : les policies `founders_all_*` (0004, 0006) sont **supprimées**. Sous RLS,
Benj ne voit plus les devis / factures / demandes des autres artisans depuis son navigateur (il en
voyait 9, 12 et 9). `/controle` n'est pas touché : ses routes lisent avec la clé de service.

**L'audit des sept angles** (2026-09-08) : 61 défauts confirmés, tous corrigés. Migrations 0074 →
0082, toutes collées. Le motif dominant n'était pas dans le code mais dans **ce qui était censé le
surveiller** : une suite qui fabriquait ses propres tickets restait verte pendant que le mode
support était inatteignable ; une autre prouvait un invariant sur la porte qui le respecte, jamais
sur celle qui le violait ; le détecteur d'angles morts en avait un. À refaire périodiquement, et
toujours avec la question : **quand un test est vert, qu'est-ce qu'il ne peut pas voir ?**

**Alexandre est parti le 2026-09-08.** Décision de Benj (« il sert à rien »). Presti est à 100 % à
lui, et le poste de partenaire est VACANT — le rôle `partenaire` reste dans le code, éprouvé, parce
que c'est un rôle et pas une personne. Retiré et prouvé en production (0084) : `is_founder`,
`role_interne`, le rôle du Centre, son code d'apport (désactivé, jamais supprimé) et sa session
ouverte. Bilan : **zéro client apporté, zéro commission versée** — aucune dette. Restent, exprès,
ses 11 lignes de journal et ses 5 factures (dix ans). **Le piège à connaître** : `garde.ts` fait
`role_interne === 'partenaire' ? 'partenaire' : 'fondateur'` — vider le rôle sans retirer
`is_founder` PROMEUT au lieu de dégrader. **Reste à faire par lui seul** (pas d'identifiants ici) :
la redirection OVH `contact@prestiapp.fr` → son Gmail, les membres du projet Supabase, les
collaborateurs GitHub, l'équipe Stripe. Vérifié propre : Vercel (Benj seul propriétaire) et les
variables d'environnement.

**Le SQL Editor de Supabase refuse `constant`** dans un fichier collé (« syntax error at or near
constant »). Mesuré le 2026-09-08 : 0072 et 0080 portent le même `do $tag$ / declare` et passent —
c'est bien ce mot-clé, pas les blocs `do`. `migrations-jumelles-e2e` le refuse désormais.

**Lighthouse mobile (2026-09-08)** : trois defauts reels trouves, et un test qui mesurait la
machine. (1) `VerrouNatif` — verrou biometrique NATIF — est monte par le layout RACINE et importait
le client Supabase : 181 Ko charges par chaque visiteur de la vitrine. Ses DEPENDANCES sont
differees, pas lui : le differer ouvrait une course avec `NatifSplash` (app visible sans verrou).
(2) Le hero etait cache jusqu'a l'hydratation et son animation bouclait pendant le chargement →
Speed Index 7,1 s pour un premier rendu a 1,3 s. (3) Fraunces et le mono etaient prechargees sans
servir au premier ecran. **L'element LCP de la landing est le mot « Presti » du bandeau** — du
texte, donc tout se joue sur les polices. Et surtout : trois passes sur le MEME code donnent
72/73/95 — la suite juge desormais sur la **mediane de trois** quand la premiere est rouge, seuil
inchange a 90. Mediane obtenue : / 91, /p 92.

**Ce qui attend Benj** : la valeur de la clé Anthropic de l'espace Presti, le mot de passe de la base
(celui de `.env.local` est refusé — `28P01` — et `scripts/appliquer-migration.mjs` l'attend pour poser
les migrations sans copier-coller ; `DIRECT_URL` ne sert à aucun code de Presti, la réinitialiser ne
casse rien), et la validation de la purge
des comptes de test (`plans/demos-a-supprimer.md` — à garder sous la main, il l'a demandé).

**Ce qu'il a explicitement ÉCARTÉ le 2026-09-08, ne pas le reproposér** : révoquer les clés Stripe
`rk_live_` (vérifié : `.env.local` n'est pas suivi par git, aucune clé n'a jamais été committée —
la recommandation était excessive) ; les comptes Play (25 $) et Apple (99 $/an), reportés aux
premiers revenus puisque l'APK est déjà téléchargeable depuis le site.

Voir aussi [[presti-agents-coentreprise]], [[presti-facturation-tva]], [[presti-ai-architecture]],
[[presti-feature-showcase-rule]], [[livrable-colle-a-la-main]].

**2026-09-13 — prompt v15 (site à la demande, 300 € une fois).** Le site vitrine sort de l'abonnement. Fait : système `.orchestre/` (voir [[presti-orchestre-antigravity]]), migration 0088 (`sites_commandes`, `artisans.site_origine`) appliquée, Stripe Checkout `payment` + webhook idempotent (e2e 27/27), juge `scripts/site-qa.mjs` prouvé par son témoin ; décision : un site généré est un dossier statique jugé hors Next (vault `Decisions/Journal-Decisions.md`). Drapeaux : `siteCommande` levé, `siteCommandeVente` baissé jusqu'à l'étape 7 + regard de Benj. Attend Benj : H1 (produit Stripe → `STRIPE_PRIX_SITE`), H2/H3, OAuth MotionSites, push de `main`.

**2026-09-13, fin de passe v15 (12 commits sur `main`, non poussés).** Fait en plus : juge `scripts/site-qa.mjs` (contrat `site.json`, témoin), cerveau `plans/cerveau-site.md`, §2.1 (site sorti des formules, `siteMax` gardé pour les 5 sites historiques), validation humaine (`/api/controle/sites`), cœur de cerveau (`lib/ai/cerveaux/urgence`, vitrier corrigé 65 → 100 %, verrou au commit), §5 (la suspension coupait l'accès, pas l'activité : `lib/suspension.ts` lu par page publique, leads, moteur, relances), hébergement (migration 0089 : bucket privé `sites` ; route `/site-genere/<commande>` avec aperçu par jeton ; `scripts/site-deposer.mjs` ; geste `mettre_en_ligne`). 18 tâches en file pour Antigravity (014-01 → 014-19 sauf 014-11, qui attend 014-01). Reste : §8.2 (corrections d'artisans, consentement, anonymisation), 014-11 (Playwright parcours complet), H8 (sitemap dans la Search Console), le push.


**État au 14/09/2026, 7 h 50 (v15 presque bouclé).** Site à la demande : commande en quatre écrans (/site/commander), Stripe payment 300 € (produit live), webhook, bucket privé « sites », route /site-genere/<id> avec aperçu par jeton, onglet Sites du Poste de contrôle (valider / régénérer / aperçu / mettre en ligne / DNS), onglet Cerveaux, cerveau urgence 100 % sur 562 références. Neuf sites de démonstration (public/sites-demo/<métier>) verts au juge durci, livrés par des agents Gemini 3.8/3.7 Flash via le pilote. Suites e2e : controle-sites (19/19), site-hebergement (23/23). Postage : trois parutions Publora programmées, la tâche planifiée « Presti publications » pose la suite. Reste : corpus 014-20 et suite de suspension 014-17 (agents Opus, quota), 014-11 (Playwright parcours complet) non écrite, §8.2 signal corrections artisan, vault Antigravity.md à mettre à jour. Voir [[presti-orchestre-antigravity]], [[juge-capture-lui-meme]], [[publora-limites]].

**14/09/2026, après-midi — démos v2 (voir [[cerveau-site-v2]]).** Benj a jugé les démos v1 « très nulles » et a commencé ses appels : refonte le jour même. Neuf sites régénérés par `public/sites-demo/generer.mjs` (kit d'animation `_kit/`, DA par métier `da.json`, textes v1 conservés dans `contenu.json`), photos re-sourcées et prouvées (56, 0 fausse attribution), juge étendu (bloc « Le geste »). Second exécutant `scripts/executant.mjs` (Gemini CLI / Qwen Code) prêt, attend la connexion de Benj. Postage : les 10 publications sont parues le 14/09. En attente : verdicts 014-11 (site-commander e2e) et 014-17 (suspension e2e).

**14/09/2026, 11 h 30 — production réparée.** 37 déploiements Vercel de suite étaient en ERROR depuis le 13/09 17 h 57 UTC (`useSearchParams` sans Suspense dans /site/commander) : rien de la nuit n'était en ligne. Corrigé et déployé (1e3884d READY à 09:25 UTC) ; la suspension e2e passe 29/29 en production (lecture directe via lib/suspension.ts). Voir [[pousse-n-est-pas-deploye]]. 014-11 clos aussi : commande de site e2e 18/18 en production (la suite attendait la réponse du brouillon au lieu du POST de paiement).

**14/09/2026, vers 14 h (Paris) — prompt v16 livré** (voir [[orchestre-autonome]], [[demo-v16-grille]]). Orchestre autonome (`Documents/orchestre`, installé sur Presti). LA démo « Atelier Lestraque » (`public/sites-demo/lestraque/`) validée sans Benj : grille C1–C8 PASS 8/8 par un juge indépendant, Lighthouse mobile 97 stable, 016-02 PASS. Bloc « Et le site qui va avec » en ligne sur la landing (drapeau `landingDemoSite`, commit ca5d62c READY, 016-03 PASS en production). Attend de Benj : H1 MotionSites Unlimited / Design Rocket Pro (argent), H2 Chrome connecté aux deux sites, H3 oui/non sur la démo (facultatif), connexion Gemini CLI ou Qwen Code, nouvelle autorisation du connecteur MotionSites.

**14/09/2026, soir — v17 : LA démo Lestraque relevée au haut du panier, et les exécutants en appui** (voir [[demo-niveau-benj]], [[demo-un-seul-site]], [[codex-executant]]). Benj a jugé la démo v16 « loin encore » : grille relevée au 3e quartile, analyse à sept angles + critique d'usage, puis vagues de retouches jugées par des agents qui utilisent le site. Vague 1 en ligne (efda4a7), vague 2 en ligne (12bf5d6, 22 h 50 : héros plein cadre « Fait pour rester » en étalonnage v4, plateau noir signé Camille Lestraque, scènes, galerie sur noir, formulaire de devis démo, menu mobile réparé, Lighthouse mobile 98). Vague 3 lancée (workflow demo-lestraque-vague-3 : finitions et photos branchées, chorégraphie au défilement, relief 3D WebGL sur bureau voulu par Benj, jugement final à l'aveugle). Neuf démos métier gelées. Codex branché à l'orchestre (quota ChatGPT épuisé à 22 h 16, retour 2 h 17), Antigravity en appui (vidéo sensible aux licences, grille à l'aveugle). À faire après la vague 3 : vidéo de la landing refaite (script prêt, sans photo CC BY-SA), texte du bloc de la landing, captures avant/après pour Benj. Questions ouvertes pour Benj : la photo CC BY-SA du héros dans la vidéo (lecture « collection » ou règle prudente), « devis gratuit » (retiré en attendant), abonnement Codex (Pro ou crédits : argent).

**15/09/2026, matin — vague 3 en ligne, jugement à l'aveugle, vague 4 lancée** (voir [[demo-niveau-benj]], [[playwright-video-horloge]], [[juge-relais-continu]], [[codex-executant]]).
- **Vague 3 :** en ligne (e78b6c2 : finitions, chorégraphie au défilement, relief WebGL sur bureau).
- **Jugement à l'aveugle** (planches de même format, clé hors du dossier) : démo à égalité en tête avec stellar-launch (4,08 sur 5), mais faible sur C2 mouvement ambiant (2,7), C6 matière (4) et C7 retenue (3,3).
- **Landing (68caef1) :** vidéo refaite, video-qa landing tout vert après recalage de l'horloge Playwright. Texte du bloc démo réécrit (018-10).
- **Vague 4, C7 barre retenue (2e225af, Codex) :** 019-01 puis 019-02. Au bureau, un seul appel visible à la fois ; le numéro et le burger quittent la barre (choix de Claude Code, que Benj peut renverser). Juge d'usage accordé sans assouplissement (9ee9483), 7/7 en production.
- **Vague 4, C2/C6 moment signature :** le premier chantier a été coupé à la fermeture de session, seuls des prototypes restent dans le scratchpad (descente dans la cage de l'escalier au défilement). Le cahier des charges est relancé en workflow (lestraque-signature-cahier), puis découpage en tâches d'exécutant.
- **Codex :** tourne en gpt-5.6-sol ; un lancement meurt avec la session qui l'a lancé.
- **En attente de Benj :** son avis sur le numéro retiré de la barre ; « devis gratuit » (retiré) ; abonnement Codex (il a dit d'attendre) ; les deux ouvertures MotionSites restent en réserve.
- **À ranger :** fichiers orphelins à la racine de presti (tâche proposée, rien supprimé).

**15/09/2026, 14 h — moment signature en ligne** (voir [[benj-executants-d-abord]], [[playwright-video-horloge]]). La cage de l'escalier tourne avec la lumière du projecteur, sur l'accueil au bureau :
- 020-02, 1bdcd05 : les blocs R et L1 dans le kit, derrière le drapeau `signature` de da.json ;
- 020-15, e33aec0 : le relief WebGL synchronisé et calme, le projecteur décalé de −2,5 s.

Vérifié en ligne : part > 8 de 0,68 en 1440×900 et 0,62 en 1088×800, rien au téléphone. Page de choix de Benj : https://claude.ai/artifact/Bjo17CSAxqgw5KxTeBgwKp. La vague 5 (récit au défilement, défilement fluide, vidéo de héros, révélation au survol, objet décomposé via Blender) a son cahier en cours. Il reste aussi la descente (020-03) et la vidéo de la landing à refaire après la vague 5.

**Mise à jour du 2026-09-15 (23 h 15) — vague 5 de la démo Lestraque en ligne.** Récit au défilement, texture 2880, vidéo d'atelier, survol des prestations, descente de la signature (D-15 à 81-89 % accepté), marche éclatée + récit des étapes, profil téléphone (Codex), et vidéo de la landing refilmée (3bd2b8f). Tout est consigné, avec les réserves et le relais, dans le vault : `SaaS/Produit/Session-2026-09-15-Lestraque-Vague-5.md` ; prompt de relais pour Codex : `SaaS/Produit/Prompt-Codex-2026-09-15.md` (mails aux 166 artisans, ménage Gmail, série 2 des publications, test de mutation d'eclate-qa, Lighthouse 021-20). Benj a confié la suite à Codex et Antigravity : ils ont un navigateur connecté à ses comptes (ne pas redire qu'ils n'ont pas accès sans vérifier).
