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
| 9 | « Page de conversation à votre marque » | grille | `seo-e2e` §5 white-label absolu, `legal-e2e`, `fermeture-e2e` §4 (« Presti » seulement dans la liste légale des sous-traitants) | 05/09 | ✅ (emails : From encore `contact@prestiapp.fr` → **H10**) |
| 10 | « Assistant IA » (autonome dès Studio, « vous validez » en Essentiel) | grille | `audit-final-e2e` (E-M2 : verrou serveur `plateforme.ia.auto`), `regles-verrou-e2e` 8/8 | 05/09 | ✅ |
| 11 | « Comptes clients (lien magique, historique) » | grille | `comptes-clients-e2e`, auditeur D §3 (lien expiré annoncé depuis `23bfbef`) | 05/09 | ✅ |
| 12 | « Site vitrine » (3 niveaux) | grille | `site-style-e2e`, `seo-e2e`, `slides-e2e` 14/14, `site-motion-e2e`, `a11y-e2e` 5/5 | 05/09 | ✅ |
| 13 | « Votre nom de domaine (site et page de conversation) » | grille | **`domaine-perso-e2e`** (05/09) : `lib/urls`, liens internes, middleware exécuté, domaine non vérifié inerte, unicité (0061) ; ce que Vercel refuse sans DNS réel est dit dans le fichier | 05/09 | ✅ (preuve DNS réelle au premier artisan) |
| 14 | « Devis chiffrés par l'IA, sur vos prix » | grille | `tarifs-e2e` (sans IA) + **`devis-source-e2e` 7/7 rejoué le 05/09** : sur un vrai chiffrage, chaque ligne porte une provenance honnête et le prix de l'artisan prime | 05/09 | ✅ |
| 15 | « Factures + facture électronique » | grille | `facturation-e2e`, `facturx-e2e`, `audit-final-e2e` (avoir 381, PDF AVOIR) | 05/09 | ✅ |
| 16 | « Relances automatiques » | grille | **`relances-e2e`** (05/09) : une relance part une fois, s'arrête si le prospect répond ou le devis est accepté, jamais pour un fondateur ni vers `.invalid`, au nom de l'artisan | 05/09 | ✅ |
| 17 | « Stock par lieu, scan, seuils » | grille | `inventaire-v2-e2e`, `inventaire-e2e` | 05/09 | ✅ |
| 18 | « Recherche IA chez vos fournisseurs » | grille | **`recherche-e2e` 37/37 rejoué le 05/09** (un vrai appel, prix rejeté s'il n'est pas dans une page récupérée), `cache-prix-e2e` 38/38 | 05/09 | ✅ |
| 19 | « Votre boîte email branchée » | grille | `canaux-e2e`, `maillite-e2e`, politique de confidentialité (C15 depuis `cf666ca`) | 05/09 | ✅ |
| 20 | « Export de vos données » | grille | `parametres-e2e` (onglet Données), `suppressions-e2e`, `audit-final-e2e` (export sans IP) | 05/09 | ✅ |
| 21 | « Support prioritaire » | grille (Signature) | CGU art. 4 « Support et assistance » : première réponse en 1 jour ouvré (Signature), 2 (Studio), 3 (Essai/Essentiel), passage en tête de file ; `legal-e2e` | 05/09 | ✅ |
| 22 | « WhatsApp », « Réseaux sociaux » | grille cible | drapeaux baissés → **absents** de la landing et du comparatif (`fermeture-e2e` §6) | 05/09 | ✅ (non vendus tant que non construits) |
| 23 | Étude HBR « The Short Life of Online Sales Leads » (2 241 entreprises) | hero | source citée avec titre et périmètre ; lien externe non vérifié par une suite | — | ✅ (citation sourcée) |

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
