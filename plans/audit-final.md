# Audit final total — synthèse (prompt v6, 04-05 septembre 2026)

> Ce sprint ne livre pas de fonctionnalité. Il prouve que ce qui est vendu marche, corrige ce qui ne marchait pas, et laisse un système qui se revérifie seul chaque nuit. **Appels IA sur la réserve Anthropic : 0** (la clé locale est restée en commentaire du début à la fin ; aucune suite IA rejouée ; les auditeurs ont travaillé par l'effet et par la lecture).

## Les chiffres
| | |
|---|---|
| Auditeurs indépendants | 8 (A attaque, B conformité, C qualité, D parcours, E IA, F fiabilité, G motion, H abonnement) — sous-agents distincts de celui qui corrige |
| Défauts trouvés | 5 bloquants · 54 majeurs · ≈ 66 mineurs |
| Fermés | 5 bloquants · 52 majeurs — 15 commits ; les 5 suites IA rejouées le 05/09 (toutes vertes) |
| Restent à un humain | téléphone LCEN (H16, obligation légale) · clé privée des sauvegardes à mettre à l'abri (H12) · confort : DMARC (H11), clé admin Anthropic (H5), clé Stripe de test (H4), domaine d'envoi neutre (H10) |
| Chiffrés après la démo | plus rien de majeur — les 6 reportés sont livrés le 05/09 (quota, purges, mentions, slides 3D, deux suites) |
| Lanceur `tout-verifier.mjs` | **42/42 suites vertes** hors IA le 05/09 au soir (0059-0061 collées) ; 5 suites IA vertes ; `audit-final-e2e` 68/68 |
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

## Ce que ce sprint ne prouve pas
- Les 11 transitions d'abonnement en conditions réelles : dès la clé de test Stripe (H4) — le portail est configuré, un abonné réel ne s'est pas encore présenté.
- Le DNS d'un domaine perso réel (Vercel refuse tout hôte inconnu) : au premier artisan qui branche le sien.
- Un sinistre complet : la restauration est prouvée compte par compte (7/7), pas base entière — la procédure est écrite dans `docs/sauvegardes.md`.

## Les 7 gestes qui restent à Benj (liste H complète dans le journal)
1. **H1** — coller `supabase/migrations/_A_COLLER_sql_editor_0057_0058.sql` (2 min) → `audit-final-e2e` 69/69, alerte « cron muet » vivante.
2. **H7** — portail client Stripe en LIVE + pied de facture 293 B (15 min) → la promesse « résiliable » devient vraie.
3. **H8** — secret GitHub `PRESTI_ENV_LOCAL` (sans la clé Anthropic) puis lancer « Audit récurrent » une fois.
4. **H4** — clé Stripe de test dans `.env.local` → `abonnement-e2e`.
5. **H11** — enregistrement DMARC (`node scripts/ovh.mjs dmarc` ou à la main).
6. **H9 / H10** — décisions : email et téléphone de l'éditeur (LCEN), domaine d'envoi neutre.
7. **H12 / H13** — sauvegardes Supabase ; filtre Gmail vers le libellé Presti.
