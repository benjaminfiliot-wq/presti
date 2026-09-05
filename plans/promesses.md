# Registre des promesses — ce que le site vend, et la preuve (prompt v6 §2.3)

> Généré à la main le 2026-09-05 à partir de `app/page.tsx` (landing) et de la grille `lib/plans.ts` (comparatif, identique sur /abonnement).
> Règle : **0 promesse sans preuve datée.** Une preuve = une suite du lanceur (`scripts/tout-verifier.mjs`) ou un rapport d'auditeur, avec sa date. Les suites IA n'ont pas été rejouées pendant ce sprint (règle : 0 appel) : leur dernier vert est cité tel quel, et dit ce qu'il ne prouve pas.

| # | Promesse (texte affiché) | Où | Preuve | Vert le | État |
|---|---|---|---|---|---|
| 1 | « Réponse en moins d'une minute » | hero | `pilotage-e2e` (réponse auto en flux SSE), route `/api/conversation/stream` ; auditeur E : crédit/plafond avant chaque appel sur les 9 routes | 04/09 (17/18, IA) | ⚠️ non rejoué (IA) — dernier vert cité |
| 2 | « Devis conformes, dans votre ton » | hero | `facturation-e2e` 35/35, `mentions-bloquantes-e2e`, `facturx-e2e`, `audit-final-e2e` (TVA intracom, médiateur, rétractation, franchise) | 05/09 | ✅ |
| 3 | « Vos données isolées, chiffrées » | hero | `rls-e2e` (isolation), `canaux-e2e` (identifiants chiffrés), `audit-correctifs-e2e` 19/19, `purge-comptes-e2e` (anonymisation) | 05/09 | ✅ |
| 4 | « Essai offert, résiliable » / « 3 crédits offerts · sans carte » | hero, tarifs | `offres-e2e` 12/12 (inscription = gratuit/3, trigger 0008) ; résiliation : `POST /api/stripe/portail` **rend 500 tant que le portail Stripe n'est pas configuré** (auditeur H, bloquant 1) | 05/09 | 🔴 « résiliable » sans preuve → **H7** |
| 5 | « 1 crédit = 1 génération · Expert = 3 crédits » | tarifs | `lib/plans.ts` `CREDIT_COST`, `audit-final-e2e` (E-M1 : tarif du modèle servi), `limites-e2e` 10/10 | 05/09 | ✅ |
| 6 | « Crédits rechargés chaque mois, non reportés » | tarifs | RPC `consume_credit` (0008 : reset paresseux non cumulatif), auditeur H §6 « reset paresseux sain » | 05/09 | ✅ |
| 7 | « TVA non applicable, art. 293 B du CGI » | tarifs, CGU, mentions | `audit-final-e2e` (A4 : même référence partout), `facturation-e2e` | 05/09 | ✅ |
| 8 | « Créez votre lien Presti en 2 minutes » | CTA | auditeur D : inscription → onboarding → lien, mobile et desktop ; `audit-final-e2e` (slug ≤ 40 valide) | 05/09 | ✅ |
| 9 | « Page de conversation à votre marque » | grille | `seo-e2e` §5 white-label absolu, `legal-e2e`, `fermeture-e2e` §4 (« Presti » seulement dans la liste légale des sous-traitants) | 05/09 | ✅ (emails : From encore `contact@prestiapp.fr` → **H10**) |
| 10 | « Assistant IA » (autonome dès Studio, « vous validez » en Essentiel) | grille | `audit-final-e2e` (E-M2 : verrou serveur `plateforme.ia.auto`), `regles-verrou-e2e` 8/8 | 05/09 | ✅ |
| 11 | « Comptes clients (lien magique, historique) » | grille | `comptes-clients-e2e`, auditeur D §3 (lien expiré annoncé depuis `23bfbef`) | 05/09 | ✅ |
| 12 | « Site vitrine » (3 niveaux) | grille | `site-style-e2e`, `seo-e2e`, `slides-e2e` 14/14, `site-motion-e2e`, `a11y-e2e` 5/5 | 05/09 | ✅ |
| 13 | « Votre nom de domaine (site et page de conversation) » | grille | `middleware.ts` multi-domaine + `lib/urls` ; **aucune suite dédiée** (le DNS d'un artisan ne se simule pas) | — | ⚠️ preuve par lecture seulement — suite à écrire avec un domaine de test (`apres-demo`) |
| 14 | « Devis chiffrés par l'IA, sur vos prix » | grille | `tarifs-e2e` (provenance des prix, sans IA), `devis-source-e2e` 7/7 (IA), auditeur E : `source_prix` revalidée contre le catalogue | 03/09 (IA) / 05/09 | ⚠️ partie IA non rejouée |
| 15 | « Factures + facture électronique » | grille | `facturation-e2e`, `facturx-e2e`, `audit-final-e2e` (avoir 381, PDF AVOIR) | 05/09 | ✅ |
| 16 | « Relances automatiques » | grille | `fermeture-e2e` §2 (cron fermé sans secret) ; logique J+2/5/10 lue par l'auditeur F (en cours) ; **pas de suite qui fait partir une relance** | 05/09 | ⚠️ suite à écrire (`apres-demo`) |
| 17 | « Stock par lieu, scan, seuils » | grille | `inventaire-v2-e2e`, `inventaire-e2e` | 05/09 | ✅ |
| 18 | « Recherche IA chez vos fournisseurs » | grille | `recherche-e2e` 37/37 (IA), cache mutualisé `cache-prix-e2e` (gratuit), sceau HMAC vérifié (auditeur E) | 04/09 (IA) | ⚠️ non rejoué (IA) |
| 19 | « Votre boîte email branchée » | grille | `canaux-e2e`, `maillite-e2e`, politique de confidentialité (C15 depuis `cf666ca`) | 05/09 | ✅ |
| 20 | « Export de vos données » | grille | `parametres-e2e` (onglet Données), `suppressions-e2e`, `audit-final-e2e` (export sans IP) | 05/09 | ✅ |
| 21 | « Support prioritaire » | grille (Signature) | engagement humain — aucun test possible ; à décrire dans les CGU (délai de réponse) | — | ⚠️ à formaliser (texte, `apres-demo`) |
| 22 | « WhatsApp », « Réseaux sociaux » | grille cible | drapeaux baissés → **absents** de la landing et du comparatif (`fermeture-e2e` §6) | 05/09 | ✅ (non vendus tant que non construits) |
| 23 | Étude HBR « The Short Life of Online Sales Leads » (2 241 entreprises) | hero | source citée avec titre et périmètre ; lien externe non vérifié par une suite | — | ✅ (citation sourcée) |

## Bilan
- **17 promesses prouvées** par une suite ou un auditeur daté du 05/09.
- **4 promesses dont la partie IA n'a pas été rejouée** (règle du sprint) : dernier vert cité, à rejouer quand la réserve le permet (`node scripts/tout-verifier.mjs --tout`).
- **1 promesse fausse aujourd'hui** : « résiliable » — le portail Stripe n'existe pas en LIVE (H7, 15 min dans le tableau de bord). Tant que ce n'est pas fait, un abonné ne peut pas résilier seul.
- **3 promesses sans suite** (domaine perso, relances, support prioritaire) : chiffrées dans `plans/apres-demo.md`.
