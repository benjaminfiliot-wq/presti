# Registre des promesses — ce que le site vend, et la preuve (prompt v6 §2.3)

> Généré à la main le 2026-09-05 à partir de `app/page.tsx` (landing) et de la grille `lib/plans.ts` (comparatif, identique sur /abonnement).
> Règle : **0 promesse sans preuve datée.** Une preuve = une suite du lanceur (`scripts/tout-verifier.mjs`) ou un rapport d'auditeur, avec sa date. Les suites IA ont été rejouées le 05/09 après-midi, une fois, au niveau le moins cher.

| # | Promesse (texte affiché) | Où | Preuve | Vert le | État |
|---|---|---|---|---|---|
| 1 | « Réponse en moins d'une minute » | hero | `pilotage-e2e` **18/18 rejoué le 05/09** (mode assisté, prise de main, règles, flux SSE) | 05/09 | ✅ |
| 2 | « Devis conformes, dans votre ton » | hero | `facturation-e2e` 35/35, `mentions-bloquantes-e2e`, `facturx-e2e`, `audit-final-e2e` (TVA intracom, médiateur, rétractation, franchise) | 05/09 | ✅ |
| 3 | « Vos données isolées, chiffrées » | hero | `rls-e2e` (isolation), `canaux-e2e` (identifiants chiffrés), `audit-correctifs-e2e` 19/19, `purge-comptes-e2e` (anonymisation) | 05/09 | ✅ |
| 4 | « Essai offert, résiliable » / « 3 crédits offerts · sans carte » | hero, tarifs | `offres-e2e` 12/12 ; **portail client Stripe configuré et sondé le 05/09** : factures, moyen de paiement, résiliation en fin de période, changement d'offre, retour vers /parametres ; catalogue de 3 offres (29/59/99 €) en place | 05/09 | ✅ (une résiliation réelle reste à voir au premier abonné) |
| 5 | « 1 crédit = 1 génération · Expert = 3 crédits » | tarifs | `lib/plans.ts` `CREDIT_COST`, `audit-final-e2e` (E-M1 : tarif du modèle servi), `limites-e2e` 10/10 | 05/09 | ✅ |
| 6 | « Crédits rechargés chaque mois, non reportés » | tarifs | RPC `consume_credit` (0008 : reset paresseux non cumulatif), auditeur H §6 « reset paresseux sain » | 05/09 | ✅ |
| 7 | « TVA non applicable, art. 293 B du CGI » | tarifs, CGU, mentions | `audit-final-e2e` (A4 : même référence partout), `facturation-e2e` | 05/09 | ✅ |
| 8 | « Créez votre lien Presti en 2 minutes » | CTA | auditeur D : inscription → onboarding → lien, mobile et desktop ; `audit-final-e2e` (slug ≤ 40 valide) | 05/09 | ✅ |
| 9 | « Page de conversation à votre marque » | grille | `seo-e2e` §5 white-label absolu, `legal-e2e`, `fermeture-e2e` §4 (« Presti » seulement dans la liste légale des sous-traitants) | 05/09 | ✅ (emails : From encore `contact@prestiapp.fr` → **H10**) — **depuis le 15/10, dès Studio seulement** : voir la révision du 15/10 plus bas |
| 10 | « Assistant IA » (autonome dès Studio ; pas de plateforme en Essentiel) | grille | `audit-final-e2e` (E-M2 : verrou serveur `plateforme.ia.auto`), `regles-verrou-e2e` 8/8 | 05/09 | ✅ |
| 11 | « Comptes clients (lien magique, historique) » | grille | `comptes-clients-e2e`, auditeur D §3 (lien expiré annoncé depuis `23bfbef`) | 05/09 | ✅ |
| 12 | « Site vitrine » (3 niveaux) | grille | `site-style-e2e`, `seo-e2e`, `slides-e2e` 14/14, `site-motion-e2e`, `a11y-e2e` 5/5 | 05/09 | ✅ |
| 13 | « Votre nom de domaine (site et page de conversation) » | grille | **`domaine-perso-e2e`** (05/09) : `lib/urls`, liens internes, middleware exécuté, domaine non vérifié inerte, unicité (0061) ; ce que Vercel refuse sans DNS réel est dit dans le fichier | 05/09 | ✅ (preuve DNS réelle au premier artisan) |
| 14 | « Devis chiffrés par l'IA, sur vos prix » | grille | `tarifs-e2e` (sans IA) + **`devis-source-e2e` 7/7 rejoué le 05/09** : sur un vrai chiffrage, chaque ligne porte une provenance honnête et le prix de l'artisan prime | 05/09 | ✅ |
| 15 | « Factures + facture électronique » | grille | `facturation-e2e`, `facturx-e2e`, `audit-final-e2e` (avoir 381, PDF AVOIR) | 05/09 | ✅ |
| 16 | « Relances automatiques » | grille | **`relances-e2e` 39/39 (10/09)** : une relance part une fois, s'arrête si le prospect répond ou le devis est accepté, jamais pour un fondateur ni vers `.invalid`, au nom de l'artisan — **et §9-10 : elles s'ARMENT quand l'artisan répond de sa main, en Essentiel, mode assisté** | 10/09 | ✅ |
| 17 | « Stock par lieu, scan, seuils » | grille | `inventaire-v2-e2e`, `inventaire-e2e` | 05/09 | ✅ |
| 18 | « Recherche IA chez vos fournisseurs » | grille | **`recherche-e2e` 37/37 rejoué le 05/09** (un vrai appel, prix rejeté s'il n'est pas dans une page récupérée), `cache-prix-e2e` 38/38 | 05/09 | ✅ |
| 19 | « Votre boîte email branchée » | grille | `canaux-e2e`, `maillite-e2e`, politique de confidentialité (C15 depuis `cf666ca`) | 05/09 | ✅ |
| 20 | « Export de vos données » | grille | `parametres-e2e` (onglet Données), `suppressions-e2e`, `audit-final-e2e` (export sans IP) | 05/09 | ✅ |
| 21 | « Support prioritaire » | grille (Signature) | CGU art. 4 « Support et assistance » : première réponse en 1 jour ouvré (Signature), 2 (Studio), 3 (Essai/Essentiel), passage en tête de file ; `legal-e2e` | 05/09 | ✅ |
| 22 | « WhatsApp », « Réseaux sociaux » | grille cible | drapeaux baissés → **absents** de la landing et du comparatif (`fermeture-e2e` §6) | 05/09 | ✅ (non vendus tant que non construits) |
| 23 | Étude HBR « The Short Life of Online Sales Leads » (2 241 entreprises) | hero | source citée avec titre et périmètre ; lien externe non vérifié par une suite | — | ✅ (citation sourcée) |

## Révision du 10/09 — la promesse 16 était verte à moitié

En confrontant le guide de démarchage au code, un décalage : la grille cochait « Relances automatiques »
pour les trois offres, alors que **le produit ne les planifiait jamais en Essentiel**.

- Les trois relances n'avaient que deux points d'insertion, et le principal (`app/api/leads/route.ts`)
  vit dans la branche qui suit une réponse écrite par l'assistant **tout seul**.
- Or l'assistant autonome se vend à partir de Studio (`plateforme.ia.auto`, absent de `BASE`) et le mode
  par défaut est « assistée ». Un artisan à 29 € qui répond de sa main — le parcours **normal** de sa
  formule — n'avait aucune relance. Un Studio en mode assisté non plus.
- Second défaut, trouvé dans la foulée : le cron n'agit que sur les leads en `repondu`, et la réponse
  manuelle de l'artisan posait `en_discussion` — le statut qui sert justement de condition d'**arrêt**.
  Le lead éteignait les relances de sa propre réponse.

Correctif produit (plutôt que rabotage de la grille) : `lib/relances.ts` porte la cadence et le
planificateur ; `app/api/messages/route.ts` pose `repondu` et arme les relances **dans ses deux
branches** — la réponse libre et la validation d'une proposition de l'assistant. La garde d'idempotence
porte sur les relances **en attente**, pour qu'un lead réarme sa cadence après un cycle consommé.

Ce que la preuve vaut : `relances-e2e` §9-10 échoue sur le code d'avant (6 rouges, dont « 0 ligne(s) »)
et passe après — vérifié le 10/09, 39/39.

**Reste à faire** : `app/api/leads/route.ts` et `app/api/leads/contact/route.ts` écrivent encore leur
propre `[2, 5, 10]` au lieu d'appeler `planifierRelances`. Volontairement laissé de côté : aucune suite
n'exerce leur planification (seule une regex sur le source la garde), donc les refondre serait un
changement non prouvé sur un chemin qui marche.

## Bilan au 05/09 après-midi
- **23 promesses prouvées sur 23**, toutes datées du 05/09.
- **Les cinq suites IA ont été rejouées** ce jour, au niveau le moins cher (Haiku) : `injection` 6/6, `devis-source` 7/7, `pilotage` 18/18, `recherche` 37/37, `ai-eval` 40 cas sans erreur. Plus aucune promesse ne repose sur un vert périmé.
- **« Résiliable » est devenue vraie** : le portail client Stripe est configuré (résiliation, factures, carte, changement d'offre) et le catalogue des trois offres est en place.
- **Une réserve honnête** : « votre nom de domaine » est prouvée jusqu'à la limite de ce qu'on peut faire sans posséder un domaine ; la preuve DNS réelle viendra au premier artisan qui branche le sien.

### Ce que dit l'évaluation de l'IA (`ai-eval`, 40 cas, niveau Standard)
| Critère | Taux |
|---|---|
| Ton respecté et signature de l'artisan | 98 % |
| Aucun prix chiffré dans la réponse | 100 % |
| Au plus trois questions | 95 % |
| Aucune capacité inventée | 100 % |
| Longueur tenue | 98 % |
| Vocabulaire du métier employé | 68 % |

Le vocabulaire est le seul point bas, et il tombe à 0 % sur les demandes de rendez-vous : c'est attendu (on ne place pas de jargon pour fixer une heure), mais cela mérite un coup d'œil sur les demandes de prix, où il n'est employé qu'une fois sur deux.

## Révision du 15/10 — la plateforme commence avec Studio

Décision de Benj : « Dans Essentiel il n'y a PAS de plateforme. » La page de conversation publique, la réponse préparée par l'IA,
les comptes clients, les relances de conversation (J+2, J+5, J+10), le nom de domaine sur la page, la boîte e-mail branchée, « Ma plateforme »,
« Messages » et « Réponses instantanées » passent de la base (Essai, Essentiel) à Studio, **pour tous les comptes** (`lib/plans.ts`, bloc STUDIO).
Les promesses 9, 10, 11, 13, 16 (relances de conversation) et 19 ne valent donc plus qu'à partir de Studio ; la page publique d'un compte sans
plateforme est neutre et n'enregistre rien (`lib/plateformeAcces.ts`, `scripts/ecrans-offre-e2e.mjs`). Essentiel garde : clients, devis chiffrés
par l'IA sur ses prix (14), factures + export Factur-X (15), tarifs, crédits, export de données, support.
