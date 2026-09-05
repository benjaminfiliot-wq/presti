# Audit final total — synthèse (prompt v6, 04-05 septembre 2026)

> Ce sprint ne livre pas de fonctionnalité. Il prouve que ce qui est vendu marche, corrige ce qui ne marchait pas, et laisse un système qui se revérifie seul chaque nuit. **Appels IA sur la réserve Anthropic : 0** (la clé locale est restée en commentaire du début à la fin ; aucune suite IA rejouée ; les auditeurs ont travaillé par l'effet et par la lecture).

## Les chiffres
| | |
|---|---|
| Auditeurs indépendants | 8 (A attaque, B conformité, C qualité, D parcours, E IA, F fiabilité, G motion, H abonnement) — sous-agents distincts de celui qui corrige |
| Défauts trouvés | 5 bloquants · 54 majeurs · ≈ 66 mineurs |
| Fermés | 5 bloquants · 52 majeurs — 15 commits ; les 5 suites IA rejouées le 05/09 (toutes vertes) |
| Restent à un humain | rien d'obligatoire — confort seulement : DMARC (H11), clé admin Anthropic (H5), clé Stripe de test (H4), domaine d'envoi neutre (H10) |
| Chiffrés après la démo | plus rien de majeur — les 6 reportés sont livrés le 05/09 (quota, purges, mentions, slides 3D, deux suites) |
| Lanceur `tout-verifier.mjs` | **42/42 suites vertes** — localement ET sur GitHub (audit nocturne run #5, 05/09 19 h, 607 s, sans clé IA) ; 5 suites IA vertes ; `audit-final-e2e` 68/68 |
| Couverture (`plans/couverture.md`) | **0 case vide** (73 → 0) : 30 pages, 58 routes, 58 migrations, 12 drapeaux, 29 emails, 2 crons, 23 capacités, 40 suites |
| Promesses (`plans/promesses.md`) | 23 recensées, **23 prouvées** le 05/09 (dont « résiliable » depuis le portail Stripe, et les 4 promesses IA rejouées) |
| Nouvelles suites | `purge-comptes`, `audit-final` (69 points), `fermeture` (55), `emails` (88), `garde-commit`, `abonnement` (11 transitions, attend H4) |

## Ce qui a changé pour un artisan ou son client
- Un compte qui a émis des factures se supprime vraiment (anonymisé, factures gardées 10 ans) au lieu de rester entier en silence.
- Une facture émise s'annule par un **avoir** numéroté, plus d'un clic ; le n° de TVA et le médiateur figurent sur les documents ; la référence de franchise est la même partout.
- Les CGU s'acceptent à l'inscription (trace datée) ; la politique décrit la messagerie reliée ; l'annexe art. 28 existe ; le client est informé de la rétractation ; son IP n'est plus lisible en clair.
- Plus de second abonnement possible, la fin d'un ancien abonnement ne rétrograde plus, un échec de prélèvement prévient, une erreur de webhook fait réessayer Stripe.
- L'IA coûte son vrai prix (Expert = 3), l'assistant autonome est verrouillé côté serveur, une règle ne chiffre plus un devis sur « Bonjour, vous êtes disponible ? », le filtre anti-fabrication ne mutile plus les phrases honnêtes et ne laisse plus passer « pas de souci, je me déplace gratuitement », une panne IA se voit et rend le crédit.
- La landing pèse 290 Ko au lieu de 2,4 Mo sur téléphone ; le comparatif parle aux lecteurs d'écran ; le lien magique expiré le dit ; `/plateforme` tient sur iPhone ; l'adresse générée est toujours valide ; les champs sont bornés.
- Les alertes sont attendues et tracées ; une relance non partie reste due ; les emails sont bornés (80/jour hors critiques) ; aucune adresse de test n'est plus envoyée ; les alertes arrivent sur `benjaminfiliot+presti@gmail.com`, libellé « Presti ».

## Ce qui se revérifie seul
- **Chaque nuit** (`.github/workflows/audit.yml`, 4 h 17 Paris) : les 37 suites contre la prod, inventaire et couverture en artefact, réglages Supabase — jamais l'IA (la clé est filtrée du secret). Premier run à déclencher à la main après H8.
- **À chaque commit** : typecheck + `garde-commit` (8 régressions connues refusées — il a attrapé un cas pendant le sprint).
- **Inventaire** : `node scripts/inventaire-produit.mjs` — une case vide = un test à écrire.

## Les rapports
`plans/audit-final/` : `attaque.md`, `conformite.md`, `qualite.md`, `parcours.md`, `ia.md`, `fiabilite.md`, `motion.md`, `abonnement.md`, `triage.md` (liste unique), `correctifs.md` (50 lignes). Journal horodaté : `plans/journal-final.md` (liste H en bas). Reste chiffré : `plans/apres-demo.md` § « Audit final (05/09) ».

## Ce que Benj a trouvé après l'audit (prompt v7, 05/09)
Le lendemain de l'audit « total », Benj a constaté à la main que **les trois modes de réponse se comportaient pareil** : remettre « Automatique » ne changeait rien, « Assistée » et « Manuelle » non plus selon la route. Aucune des 42 suites ne l'avait vu — et c'est un trou de la matrice, pas un hasard :

- `plateforme-config-e2e` prouvait que le réglage **s'enregistrait** ; aucune suite ne prouvait son **effet** sur les routes qui le lisent (`/api/conversation`, `/api/conversation/stream`, `/api/leads`), ni l'aller-retour auto → assistée → manuelle → auto.
- Quatre causes, toutes invisibles depuis l'écran : deux sources de vérité (`artisans.reponse_auto` écrit par /profil, `plateforme_config.mode_reponse` écrit par /plateforme) lues dans un ordre différent selon la route ; le verrou d'offre du flux qui se faisait passer pour « assistée » ; pas de « rendre la main » nommé ; un enregistrement du mode noyé dans le bouton global, et un rechargement à chaque re-rendu qui écrasait le choix.
- Corrigé le 05/09 (5 commits, `bfd044d` → `d263d92`) : une seule source de vérité (migration 0062), **une seule fonction de décision** pour les trois routes avec un motif explicite (`verrou_offre`), verrou visible, enregistrement au clic, « mode appliqué par le serveur » affiché, `rendre_main`. Preuve : `modes-e2e` **35/35** en prod (offre × mode × route, aller-retour, prise/rendue de main, booléen hérité ignoré, 0 IA), `pilotage-e2e` 18/18 rejoué.
- La leçon est écrite dans `plans/couverture.md` : **l'effet d'un réglage = le comportement observé sur chaque route qui le lit**. Enregistrer n'est pas appliquer.

Dans la foulée, Benj a demandé le **code par email à la connexion** (bloc 2 du même prompt) : livré le 05/09 derrière le drapeau `codeEmail`, **pas encore prouvé en prod** — la migration 0063 (`_A_COLLER_sql_editor_0063.sql`) attend d'être collée ; ensuite : drapeau levé, déploiement, `code-connexion-e2e` (12 sections). Voir le journal, bloc [16].

## Ce que ce sprint ne prouve pas
- Les 11 transitions d'abonnement en conditions réelles : dès la clé de test Stripe (H4) — le portail est configuré, un abonné réel ne s'est pas encore présenté.
- Le DNS d'un domaine perso réel (Vercel refuse tout hôte inconnu) : au premier artisan qui branche le sien.
- Un sinistre complet : la restauration est prouvée compte par compte (7/7), pas base entière — la procédure est écrite dans `docs/sauvegardes.md`.
- **Le code par email à la connexion** (v7, bloc 2) : code complet, typé, 37 suites adaptées, suite de 12 sections écrite — mais tant que la migration 0063 n'est pas collée, le drapeau reste baissé et rien de tout cela n'est constaté en production. `code-connexion-e2e` le dit et sort en code 2 ; le lanceur compte donc **43/44** jusque-là.
- Ce que le code par email **ne couvrira pas même levé**, écrit d'avance : les lectures directes du navigateur vers PostgREST (RLS) restent ouvertes à un jeton au mot de passe seul — le verrou protège les routes de Presti, comme la révocation des sessions. Le fermer demanderait d'ajouter `connexion_verifiee()` à chaque politique RLS : un chantier à part, à décider.

## Les gestes qui restent à Benj (liste H complète et honnête dans le journal)
Faits et vérifiés par l'effet le 05/09 : H1, H7, H8, H12, H14, H15, H16 (et 0062 rejouée par l'API).
1. **H17 — obligatoire pour le bloc 2** : coller `_A_COLLER_sql_editor_0063.sql` (SQL Editor, 1 min), puis me le dire → drapeau `codeEmail` levé, déploiement, `code-connexion-e2e`, lanceur **44/44**. Tout artisan connecté devra se reconnecter une fois (un code lui sera envoyé).
2. **H4** — clé Stripe de test dans `.env.local` → `abonnement-e2e` (11 transitions en conditions réelles, toujours non prouvées).
3. **H11** — enregistrement DMARC (`node scripts/ovh.mjs dmarc` ou à la main).
4. **H5** — `ANTHROPIC_ADMIN_KEY` sur Vercel (sinon rappel hebdomadaire du solde).
5. **H10 / H13** — domaine d'envoi neutre ; filtre Gmail vers le libellé Presti.
