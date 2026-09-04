# PROMPT v6 — AUDIT FINAL TOTAL, correctifs et automatisation permanente

> **Mode d'emploi.** Coller en entier dans Claude Code ouvert sur `C:\Users\benja\Documents\presti`. Tu relis d'abord `plans/journal-v5.md`, `plans/audit-v5.md`, `plans/apres-demo.md`, `plans/demo-parcours.md`, `docs/couts-et-solde.md`, `docs/fournisseurs.md` et `scripts/tout-verifier.mjs`. Ce prompt ne demande pas de nouvelles fonctionnalités : il demande **la preuve que tout ce qui est vendu fonctionne**, la correction de tout ce qui ne fonctionne pas, et un système qui continue de le vérifier tout seul après toi.

---

## §0. MODE : AUTOMATISME COMPLET

Tu travailles **en boucle fermée, sans pause, jusqu'à la sortie verte** :

```
INVENTORIER → AUDITER (agents indépendants) → TRIER → CORRIGER → TESTER → DÉPLOYER → RE-AUDITER
```

- Tu ne demandes **aucune** permission pour une action réversible. Tu ne t'arrêtes que pour les actions de la **§1 (liste humaine)**, et tu continues sur tout le reste pendant qu'elles attendent.
- Journal `plans/journal-final.md`, une ligne par étape : `[bloc] titre — début → fin (durée) — statut`, cumul affiché à chaque fin de bloc.
- Chaque défaut trouvé suit **un seul cycle** : reproduit par un test (rouge) → corrigé → test vert en prod → commit atomique en français → ligne de journal. Un défaut sans test de non-régression n'est pas « corrigé ».
- **Sortie du sprint** : `node scripts/tout-verifier.mjs` (hors IA) **100 % vert**, `plans/audit-final.md` complet, et l'audit **récurrent** de la §8 en place et ayant tourné une fois tout seul. **0 appel IA sur la réserve de Presti** (voir le budget ci-dessous).
- Ce que tu ne peux pas corriger dans ce cycle va dans `plans/apres-demo.md` **avec un chiffrage et une raison** — jamais en silence.

**Budget IA de l'audit : 0 € sur la réserve Anthropic de Presti. C'est une règle, pas un objectif.** La réserve est tombée à zéro le 04/09 et Benj ne veut plus qu'un test y touche. Donc :
- **Aucune suite qui appelle l'IA n'est jouée dans ce sprint.** `tout-verifier.mjs` tourne **sans** `--tout` ; les suites marquées `ia` (`pilotage`, `injection`, `devis-source`, `ai-eval`, `recherche`) sont **exclues**, et leur dernier résultat vert en v5 (journal + `audit-v5.md`) tient lieu de preuve — cité tel quel dans `audit-final.md`, avec sa date.
- Les auditeurs **D et E** n'émettent **aucun message** dans une conversation de plateforme, aucune génération de devis, aucune recherche fournisseurs. Ils vérifient l'IA par **lecture** du code (`lib/ai.ts`, `lib/ai/outils.ts`, prompts métier, filtre anti-fabrication) et par la suite **unitaire gratuite** `ia-unit-e2e.mjs` (métiers, playbooks, anti-fabrication — 0 appel réseau). Une conversation de démonstration se rejoue avec le **compte démo existant** dont les réponses sont déjà en base, jamais en générant.
- Garde-fou technique : pendant le sprint, la variable Vercel de **prévisualisation** utilisée par les tests pointe sur une clé **`ANTHROPIC_API_KEY_TESTS` vide** → tout appel IA lancé par erreur échoue en 401 et fait **échouer le test** au lieu de consommer. La prod garde sa vraie clé, intacte pour les artisans.
- **Compteur dans le journal** : « appels IA du sprint : 0 » à chaque bloc. Si un appel part quand même, il apparaît, avec la suite fautive, et c'est un défaut à corriger.
- Audit récurrent (§8) : **jamais d'IA**, ni la nuit, ni la semaine, ni le mois. Si Benj veut un jour rejouer l'évaluation IA, c'est une commande explicite (`ai-eval.mjs --eco`, ≈ 1 €), jamais un automatisme.
- Tout ce qui est Stripe se joue en **mode test** (aucun débit réel) sauf décision contraire H4. Resend : offre gratuite, aucun coût.
- **Claude Code lui-même** : vérifier `/status`. Sur abonnement → coût marginal nul, mais les 7 auditeurs en parallèle consomment les limites d'usage plus vite ; les lancer **en deux vagues** (A-B-C-H puis D-E-F-G). Sur clé API → **s'arrêter et le dire à Benj avant de lancer quoi que ce soit** : ce serait lui, pas les tests, qui viderait la réserve.

---

## §1. LISTE HUMAINE — les seules choses que seul Benj peut faire

À poser à Benj **en un seul message, dès le début**, puis à vérifier **par l'effet** (jamais en lui demandant « c'est fait ? ») :

| # | Action | Vérification par l'effet |
|---|---|---|
| H1 | Coller dans le SQL Editor tout fichier `supabase/migrations/_A_COLLER_*.sql` non encore appliqué (vérifier d'abord lequel manque : `0056` cache des prix, ou autre) | `scripts/run-migration.mjs --verifier` ou requête sur `information_schema` : chaque table/colonne/trigger attendu existe |
| H2 | Réglages Supabase Auth : rejeu des jetons de rafraîchissement, durée du jeton d'accès 900 s, politique de mot de passe | `node scripts/verif-supabase-reglages.mjs` → tout vert |
| H3 | Valider l'email du titulaire chez OVH (suspension du domaine le **01/10/2026** sinon) — `https://www.ovh.com/fr/cgi-bin/contactcontrol.cgi` | `node scripts/ovh.mjs etat` → plus d'opération `ContactControlCorrect` en erreur |
| H4 | Stripe : confirmer si le compte est en **mode test ou live**, et si les paiements de la démo doivent être réels | `node scripts/stripe-verifier.mjs` → clés, webhook, produits, TVA cohérents avec la réponse |
| H5 | Fournir une **clé Admin de l'organisation Anthropic** (`ANTHROPIC_ADMIN_KEY`, variable Vercel) et un **budget IA mensuel** (`BUDGET_IA_MENSUEL_EUR`) pour l'alerte de solde (§6) | `node scripts/alertes-e2e.mjs --simuler solde` → email reçu |
| H6 | Confirmer l'adresse qui reçoit les alertes de l'entreprise (`PRESTI_ALERTES_EMAIL`) tant que `contact@prestiapp.fr` n'existe pas | `node scripts/mail-verifier.mjs` → adresse relevée, DMARC vert |

---

## §2. INVENTAIRE — on ne peut auditer que ce qu'on a listé

**2.1 Script d'inventaire** `scripts/inventaire-produit.mjs` (à écrire, à garder) qui produit `plans/inventaire-produit.md` automatiquement, à chaque exécution :
- toutes les **pages** (`app/**/page.tsx`), avec leur surface (landing / console / plateforme / site artisan) et leur exigence d'auth ;
- toutes les **routes API** (`app/api/**/route.ts`), avec méthode, auth, plan requis, plafond, coût en crédits ;
- toutes les **migrations** appliquées vs présentes (H1) ;
- tous les **drapeaux** de `lib/flags.ts` (levé/baissé) et ce qui dépend de chacun ;
- tous les **emails** envoyés (`lib/email.ts`, `lib/notifications.ts`, `lib/alerteService.ts`) avec déclencheur et destinataire ;
- tous les **crons** (`app/api/cron/*`, `vercel.json`) avec fréquence et dernier passage ;
- toutes les **capacités** de `lib/plans.ts` par offre ;
- toutes les **suites** de `scripts/tout-verifier.mjs`.

**2.2 Matrice de couverture** `plans/couverture.md`, générée par le même script : pour **chaque** ligne de l'inventaire, la ou les suites qui la testent réellement (grep des routes/pages/capacités dans les scripts). **Chaque case vide est un test à écrire dans ce sprint.** Objectif : 0 route, 0 page, 0 capacité, 0 email, 0 cron sans test.

**2.3 Registre des promesses** `plans/promesses.md` — le cœur de « aucune fausse promesse ». Un agent lit **tout ce qui parle au client** : landing (`app/page.tsx`, `FeatureShowcase`), `/tarifs`, `/abonnement`, `/faq`, `/aide` et `lib/aide.ts`, CGU, emails d'inscription et de bienvenue, textes des cartes 🔒, descriptions des offres dans Stripe. Il extrait **chaque affirmation vérifiable** (« répond en moins d'une minute », « 3 thèmes », « relances J+2/5/10 », « site indexé », « facture conforme », « recherche chez vos fournisseurs », « 80 crédits/mois »…) et la met en face de **la preuve** : la suite qui la teste, ou le constat qu'elle est fausse. Toute promesse sans preuve est **soit testée, soit reformulée, soit retirée** dans ce sprint. Rien ne reste « à peu près vrai ».

---

## §3. LES AUDITEURS — sept agents indépendants, en parallèle, en lecture seule

Chaque auditeur reçoit l'inventaire (§2), un mandat précis, et rend `plans/audit-final/<domaine>.md` avec, pour chaque constat : gravité (bloquant / majeur / mineur), **preuve** (commande, URL, capture, réponse HTTP), reproduction, correctif proposé chiffré. Ils testent **contre la production** avec des comptes créés puis détruits (`purger-comptes-test.mjs`) — **jamais** le compte démo `atelier-du-chene`, jamais un vrai artisan.

| Auditeur | Agent(s) du repo | Mandat |
|---|---|---|
| **A — Attaque** | `presti-audit-attaque` | Rejouer les 18 points anti-hack, IDOR sur **les 60 routes**, injection de prompt contre l'assistant à outils (`lib/ai/outils.ts`), abus des routes publiques (`leads`, `contact`, `p/auth`, `conversation/*`, `inventaire/recherche`), rejeu de jetons (accès **et** rafraîchissement), escalade de plan (forger `plan`, `credits`, `is_founder` depuis un jeton navigateur — 0055 doit tenir), webhook Stripe forgé, CSP/headers, secrets dans le bundle et l'historique git. |
| **B — Conformité** | `presti-audit-conformite` | Devis/factures : mentions, numérotation, scellement, franchise en base (293 B) cohérente **partout** (site, Stripe, PDF, XML) ; RGPD : information des personnes, droits, suppressions granulaires, conservation, sous-traitants ; LCEN sur les 3 surfaces ; consommation : médiateur, rétractation ; **white-label** : 0 « presti » dans le HTML, les emails, les PDF et les clés de stockage servis au client d'un artisan. |
| **C — Qualité & checklist** | `presti-auditeur` | Les 20 points de la photo (privacy, CGU, CTA, FAQ, robots, sitemap, 404, alt, analytics/consentement, meta, OG, favicon, canoniques, cookies, mobile, a11y, formulaires, liens morts, perf) sur **chacune des 3 surfaces**, plus les 3 vidéos (sessions, « hacked in 3 h », « site invisible » = rendu serveur). |
| **D — Parcours & UX** | `presti-gestion-donnees` + navigateur | Rejouer **de bout en bout** les parcours de `plans/demo-parcours.md` **et** les 5 personas de l'audit v5, sur mobile 390 px et desktop, en mesurant chaque étape : inscription → onboarding → console → plateforme (**conversation en mode manuel, sans IA**) → prise de main → devis (**saisi à la main, pas généré**) → acceptation → facture → inventaire (**fiche saisie, pas de recherche**) → site → paramètres → abonnement. Tout écran mort, tout bouton sans suite, tout texte faux est un constat. |
| **E — IA** | `presti-ai-engineer` + skill `presti-ai-lab` | **Sans aucun appel IA** (lecture du code + `ia-unit-e2e.mjs` gratuit + conversations déjà en base du compte démo) : anti-fabrication (faux positifs **et** faux négatifs — les deux sont dans `apres-demo.md`) ; modèle réglé = modèle servi ; outils de l'assistant (jamais de devis sans email client, jamais de prix ferme, jamais deux devis pour une conversation) ; persona (ton, tutoiement, exemples injectés comme style et non comme faits) ; playbooks (plafond de questions). |
| **F — Fiabilité, coûts, mails** | `presti-gestion-fiabilite` + `presti-mails-delivrabilite` + `presti-mails-cycle` | Plafonds et compteurs atomiques sous rafale ; idempotence des règles et du webhook ; timeouts Vercel (conversation + règle + recherche) ; cache mutualisé des prix (72 h, sceau, jamais une absence) ; coût réel par action vs `docs/couts-et-solde.md` ; chaîne mail complète (`mail-verifier.mjs`) + contenu de chaque email (ton, garde-fous, liens qui marchent, désinscription) ; relances J+2/5/10 réellement envoyées par le cron. |
| **G — Motion, marque, a11y** | `presti-animateur` + `presti-anim-marque` + `presti-anim-accessibilite` | Slides 3D Signature (0 long task, reduced-motion → galerie), test des 5 secondes sur 3 sites test (un par thème), contraste AA avec accent libre, focus clavier sur le chat, l'éditeur et le pilotage, `aria-live` du fil, cibles tactiles ≥ 44 px. Skills `review-animations`, `improve-animations`. |

**Après leurs rapports** : skill `triage` → une seule liste priorisée `plans/audit-final/triage.md` (bloquant → majeur → mineur), avec pour chaque ligne : correctif dans ce cycle / reporté chiffré. Puis §5.

---

## §4. L'ABONNEMENT — audit dédié, de fond en comble

C'est la demande explicite de Benj et la partie du produit qui manipule de l'argent. Un auditeur **H** (`presti-gestion` + skill `tdd`) écrit et joue `scripts/abonnement-e2e.mjs`, en **mode test Stripe** (ou live si H4 le dit), qui prouve **chaque** transition :

1. **Inscription** → plan `gratuit`, 3 crédits, capacités exactes de la matrice, 🔒 corrects partout.
2. **Checkout** de chacune des 3 offres → session Stripe créée avec le bon prix, **mention de franchise 293 B** sur la page et sur le reçu, adresse collectée, pas de TVA ajoutée.
3. **Webhook** `checkout.session.completed` → `plan` mis à jour, crédits crédités au montant de la matrice, capacités déverrouillées **côté serveur** (`offres-e2e` rejoué avec le nouveau plan), email de confirmation reçu avec les bons montants.
4. **Webhook forgé / rejoué** → refusé (signature), et un événement livré deux fois n'accrédite qu'une fois (idempotence par `event.id`).
5. **Montée d'offre** (Essentiel → Studio → Signature) et **descente** → proration Stripe correcte, plan et `siteMax` suivent, un site Signature rétrogradé rend un site Pro sans page cassée, l'inventaire verrouillé garde ses données.
6. **Renouvellement mensuel** (`invoice.paid`) → crédits remis au montant du plan, **non cumulés** ; **échec de paiement** (`invoice.payment_failed`) → email clair, période de grâce, puis rétrogradation à `gratuit` sans perte de données ; retour au paiement → réactivation.
7. **Annulation** depuis le portail → fin de période respectée, email, rétrogradation à la date prévue, pas avant.
8. **Portail Stripe** accessible depuis Paramètres → Abonnement, historique des paiements visible.
9. **Fondateurs** : plan `business`, jamais décomptés, jamais facturés, et **impossible** à obtenir autrement (0055).
10. **Crédits** : décompte atomique par action (1 / 1 / 3, recherche 2 à froid / 0 sur cache), refus propre à 0 avec message et lien vers l'offre supérieure, **jamais** un client bloqué au milieu d'une conversation (règle produit : le refus tombe sur l'artisan, pas sur le prospect).
11. **Cohérence des textes** : les montants et capacités affichés sur `/tarifs`, `/abonnement`, la landing, les emails et les descriptions Stripe sont **tous générés depuis `lib/plans.ts`** — un grep prouve qu'aucun prix n'est écrit en dur ailleurs.

`stripe-verifier.mjs` est rejoué à la fin contre la prod. Tout écart = correctif dans ce cycle.

---

## §5. CORRIGER — la boucle

Pour chaque ligne du triage, dans l'ordre de gravité :
1. **Test rouge d'abord** (`tdd`) : ajouter le cas à la suite existante la plus proche, ou créer la suite si la matrice §2.2 avait une case vide.
2. **Correctif** minimal et typé (`diagnosing-bugs` si la cause n'est pas évidente ; `code-review` sur le diff).
3. `npm run build` 0 erreur · `typecheck` · déploiement · **test vert en prod** · données de test purgées.
4. Ligne de journal + ligne dans `plans/audit-final/correctifs.md` (constat → test → commit).
5. Quand la liste des bloquants et majeurs est vide : **re-lancer les 7 auditeurs** sur leur périmètre (pas seulement les correctifs — un correctif peut en casser un autre, l'audit v4 l'a prouvé deux fois). Boucle jusqu'à **0 bloquant, 0 majeur**. Les mineurs restants sont chiffrés dans `apres-demo.md`.

---

## §6. LES ALERTES — Benj doit être prévenu **avant** que ça casse

Nouveau module `lib/alertes.ts` + cron `app/api/cron/alertes` (quotidien) + `scripts/alertes-e2e.mjs --simuler <type>` qui prouve chaque email. Destinataire : `PRESTI_ALERTES_EMAIL` (puis `contact@prestiapp.fr` quand la boîte existe). Chaque alerte : **une fois par motif et par jour**, sujet explicite, une action recommandée, un lien direct.

| Alerte | Déclencheur | Ce que dit l'email |
|---|---|---|
| **Solde IA bientôt à court** ⭐ | Coût cumulé du mois via l'**API Admin Anthropic** (`GET /v1/organizations/cost_report`) ≥ 70 % puis 90 % de `BUDGET_IA_MENSUEL_EUR` ; ou tendance (projection à fin de mois > budget) | « Il reste ~X € de budget IA, à ce rythme épuisé le JJ/MM. Recharger : [lien console Anthropic]. » |
| **Service IA tombé** (existe, `alerteService.ts`) | 402 / clé refusée / débit saturé | conserver, vérifier qu'il part bien depuis les trois chemins d'appel |
| **Crédits d'un artisan bas** | 20 % restants, puis 0 | à **l'artisan** : « il vous reste N crédits sur M, renouvellement le JJ/MM, ou passez à … » + bandeau dans la console ; à l'entreprise : liste hebdo des comptes à 0 (signal d'upsell) |
| **Paiement** | `invoice.payment_failed`, `customer.subscription.deleted`, litige | à l'artisan (action) et à l'entreprise (info) |
| **Erreurs** | ≥ 5 erreurs 5xx ou `report-error` en 10 min, ou un cron sans passage à l'heure prévue (`relances`, `purge-comptes`, `alertes`) | « Presti a produit N erreurs en 10 min sur /route » + extrait |
| **Domaine & mail** | `mail-verifier.mjs` hebdo rouge (DMARC/SPF/DKIM/MX), `ovh.mjs etat` (opération en erreur, expiration du domaine < 60 j) | action précise |
| **Sécurité** | connexion fondateur depuis un nouvel appareil, 10 échecs de connexion sur un compte, révocation globale | information |
| **Digest hebdomadaire** (lundi 8 h) | toujours | inscriptions, conversions lien→lead→devis→facture, crédits consommés, coût IA, suites de l'audit récurrent (§8), 3 risques ouverts |

Règle : chaque alerte a son test simulé **et** a été reçue une fois réellement dans la boîte de Benj pendant ce sprint (preuve : capture ou identifiant Resend dans le journal).

---

## §7. CE QUE L'AUDIT DOIT AUSSI VÉRIFIER (parce que c'est dans `apres-demo.md` et qu'un client peut tomber dessus)

Chaque élément derrière un drapeau baissé : **invisible** partout (console, aide, tarifs, landing, FAQ) — pas un bouton grisé, pas une ligne « bientôt » sans date. Chaque élément à drapeau levé : **testé**. Points nommés dans `apres-demo.md` à statuer explicitement dans ce sprint : ré-import CSV de l'inventaire (2 rouges sur 69 — corriger, c'est petit), suppression RGPD d'un compte avec facture émise (anonymisation au lieu de suppression — **corriger**, c'est un droit légal), `qualifie` toujours vrai (corriger), faux positifs anti-fabrication (corriger avec la suite E), acceptation des CGU à l'inscription avec trace (1 h — **faire**), email de bienvenue (2 h — faire).

---

## §8. L'AUDIT RÉCURRENT — pour que ça continue sans toi

Livrer et faire tourner **une fois** avant la fin du sprint :

- **`.github/workflows/audit.yml`** (ou cron Vercel) : chaque nuit `tout-verifier.mjs --rapide` + `mail-verifier.mjs` + `stripe-verifier.mjs` + `verif-supabase-reglages.mjs` + `seo-e2e.mjs` ; chaque dimanche `tout-verifier.mjs` complet hors IA. **Jamais de suite IA en automatique.** Résultat → email digest (§6) + fichier `plans/audit-recurrent/AAAA-MM-JJ.md` commité. Une suite rouge deux nuits de suite = alerte dédiée.
- **Pre-commit** (Husky, existe) : `typecheck` + suites `gratuit` les plus rapides. Un commit qui casse une suite ne part pas.
- **`scripts/inventaire-produit.mjs`** rejoué à chaque nuit : une nouvelle route ou page **sans test** apparaît dans le digest comme une case vide — la matrice §2.2 ne se dégrade jamais en silence.
- **Agents de la coentreprise** : `node scripts/coentreprise.mjs sync-down` en fin de sprint, journaux des agents remontés dans le vault Obsidian (`SaaS/Coentreprise/`) ; note de session + `Récap-Projet` + `Journal-Decisions` mis à jour (règle 6 du `CLAUDE.md` du vault).

---

## §9. LIVRABLES ET DEFINITION OF DONE

**Fichiers** : `plans/inventaire-produit.md` · `plans/couverture.md` (0 case vide) · `plans/promesses.md` (0 promesse sans preuve) · `plans/audit-final/{attaque,conformite,qualite,parcours,ia,fiabilite,motion,abonnement,triage,correctifs}.md` · `plans/audit-final.md` (synthèse : ce qui a été trouvé, corrigé, ce qui reste avec chiffrage, ce que l'audit récurrent surveille) · `plans/journal-final.md` · `plans/apres-demo.md` à jour · `.github/workflows/audit.yml` · `lib/alertes.ts` + `scripts/alertes-e2e.mjs` + `scripts/abonnement-e2e.mjs` + `scripts/inventaire-produit.mjs`.

**Terminé quand, et seulement quand** :
1. `node scripts/tout-verifier.mjs` (hors IA) → **100 % vert en production**, sortie collée dans le journal ; suites IA : dernier vert de v5 cité avec sa date ; **compteur d'appels IA du sprint = 0**.
2. Triage : **0 bloquant, 0 majeur** ; mineurs chiffrés.
3. `plans/promesses.md` : chaque promesse a une preuve, ou a été reformulée/retirée (diff cité).
4. `plans/couverture.md` : 0 route, 0 page, 0 capacité, 0 email, 0 cron sans suite.
5. §4 abonnement : les 11 transitions prouvées, `stripe-verifier` vert.
6. §6 : les 8 alertes simulées vertes **et** reçues réellement une fois.
7. §8 : l'audit récurrent a tourné **une fois tout seul** et son digest est arrivé.
8. Les actions humaines H1–H6 vérifiées **par l'effet** ; celles non faites listées en tête de `audit-final.md` avec ce qui reste bloqué par chacune.
9. Aucun compte de test en base (`purger-comptes-test.mjs`), le compte démo intact.
10. Vault Obsidian à jour (§8, dernier point).

---

## §10. FORMAT À CHAQUE ÉTAPE

1. **Vérifié** · 2. **Trouvé** (constat, gravité, preuve) · 3. **Corrigé** (test rouge → diff → test vert, commit) · 4. **Preuve en prod** · 5. **Journal** (ligne + cumul) · 6. **Suivant** — enchaîné immédiatement, ou l'action humaine qui bloque **cette** ligne pendant que les autres avancent.

Agents et skills : l'Annexe A de `plans/004-sprint-j1-demo.md` reste la référence d'affectation. Dans ce sprint, les auditeurs sont **toujours** des sous-agents distincts de celui qui corrige — c'est ce qui a fait trouver 15 défauts en v4 et 25 en v5.
