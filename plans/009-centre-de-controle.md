# PROMPT v10 — Le Centre de contrôle de Presti (à lancer UNIQUEMENT quand l'application v9 est terminée)

> **Condition de lancement — ne pas coller avant.** L'application (prompt v9) est terminée : `pwa-e2e`, `push-e2e`, `liens-profonds-e2e` verts, jalons J1 à J5 cochés dans `plans/journal-final.md`, soumission aux stores faite ou planifiée. Si ce n'est pas le cas, ce prompt attend.
>
> À coller en entier dans Claude Code ouvert sur `C:\Users\benja\Documents\presti`. Protocole inchangé (v6 §0) : boucle fermée, journal, aucune permission pour du réversible, **0 appel IA sur la réserve de Presti** pendant le développement et les tests, Stripe en mode test pour les tests, rien de non fini visible. Ce qui n'est pas terminé va dans `plans/apres-demo.md`, chiffré.

---

## §0. Ce que Benj veut, et pourquoi l'existant ne suffit pas

**Aujourd'hui** : `/controle` + `JarvisHub.tsx` — un tableau « façon Jarvis » (radar d'activité, lancement d'agents, inbox fondateurs, bans d'IP, stats de tunnel). C'est une démo technique, pas un outil de direction. Benj l'a dit : « c'est un peu débile ».

**Cible** : **un seul écran depuis lequel Benjamin dirige l'entreprise** — pas le produit, l'entreprise. Il doit y voir et y faire, sans ouvrir Stripe, Gmail, Supabase, Vercel ou un tableur :

1. **Les clients et l'argent** : chaque abonnement, chaque demande d'abonnement, chaque paiement, échec, remboursement, résiliation — et agir dessus.
2. **La messagerie de l'entreprise** : les emails reçus à l'adresse de Presti (Gmail connecté), les messages du formulaire « Nous écrire », les réponses des artisans aux emails Presti — lire, répondre, classer, depuis le centre.
3. **La comptabilité** : les factures émises par Presti aux artisans, les factures des fournisseurs (Vercel, Supabase, Anthropic, Resend, OVH, Apple, Google), la TVA (franchise en base aujourd'hui, seuils surveillés), l'URSSAF (déclaration et cotisations micro), les échéances, ce qui reste à payer — et l'export pour l'expert-comptable.
4. **La santé du système** : tout ce que l'audit récurrent, les alertes (v6 §6) et les agents produisent, lisible en un coup d'œil, avec les actions qui vont avec.
5. **Le contrôle** : les artisans (voir, aider, suspendre, rembourser, changer d'offre), les fondateurs, les accès, les réglages globaux (prix, drapeaux, modèles IA, plafonds).

Ce n'est plus « Jarvis ». C'est le **poste de direction**. Nom dans l'interface : **« Direction »** (`/direction`, `/controle` redirige).

---

## §1. Principes non négociables

- **Réservé aux fondateurs** (`is_founder`), derrière le second facteur (code email ou TOTP), avec **verrou d'écriture** : toute action qui touche à l'argent, aux accès ou aux données d'un artisan demande une **re-confirmation** (mot de passe ou biométrie en app) et est **journalisée** (`journal_direction` : qui, quoi, quand, avant/après, IP). Lecture sans re-confirmation.
- **Rien n'est recopié à la main** : chaque chiffre affiché vient d'une source (Stripe, Supabase, Gmail, Anthropic Admin, factures) et porte sa **fraîcheur** (« Stripe · il y a 2 min »). Un chiffre sans source n'est pas affiché.
- **Les données des artisans restent les leurs** : le centre montre ce qu'il faut pour diriger (abonnement, activité, santé du compte), pas le contenu des conversations de leurs clients ni leurs devis — sauf ouverture explicite d'un ticket de support par l'artisan, journalisée. RGPD : le centre est un traitement de plus, à inscrire au registre.
- **Un seul écran, des vues** : navigation par onglets à gauche, une recherche globale (⌘K) qui trouve un artisan, un paiement, un email, une facture, une alerte.
- **Design** : DNA Presti (nuit/corail, `presti-design`), densité **élevée** (c'est un outil de travail, pas une landing), tableaux triables et filtrables, raccourcis clavier, mobile lisible (les alertes et les actions d'urgence doivent tenir sur un téléphone).
- **Coût** : 0 appel IA en fonctionnement normal. Les seules fonctions IA du centre (résumé d'un email, brouillon de réponse) sont **à la demande, sur clic, avec le coût affiché avant**.

---

## §2. Les onglets

### 2.1 Aujourd'hui (page d'accueil)

Une page qui répond en 10 secondes à « est-ce que tout va bien et qu'est-ce que je dois faire ? » :
- **Bandeau d'état** : service OK / dégradé / incident (routes clés en 200, dernier cron passé, Stripe joignable, Resend joignable, solde IA) — vert, orange, rouge, avec le détail au clic.
- **À faire** : la file des actions qui attendent Benj — demandes d'abonnement à traiter, emails sans réponse depuis > 24 h, paiements échoués à relancer, factures fournisseurs à enregistrer, échéances URSSAF/TVA sous 15 jours, alertes non acquittées, mises à jour app en attente de relecture store. Chaque ligne a **son action** (pas un lien vers un autre outil).
- **Chiffres du jour** (source + fraîcheur) : MRR, artisans payants, essais en cours, conversions du jour, encaissé du mois, coût IA du mois vs budget, crédits consommés.
- **Fil** : les 20 derniers événements de l'entreprise (nouvel artisan, paiement, résiliation, email reçu, alerte, déploiement, audit nocturne) — cliquables.

### 2.2 Clients & abonnements (Stripe, à fond)

- **Liste des artisans** avec : offre, statut Stripe (essai, actif, impayé, résilié, en pause), MRR, date de renouvellement, crédits restants, dernière activité, canal d'acquisition (organique / apporté — lien avec le Registre des apports du contrat), santé (score simple : activité + paiement + support).
- **Fiche artisan** : chronologie complète (inscription, paiements, changements d'offre, tickets, alertes), abonnement Stripe en direct (via API, pas une copie), boutons **Changer d'offre**, **Offrir des crédits**, **Prolonger l'essai**, **Rembourser** (partiel/total), **Mettre en pause**, **Suspendre** (accès coupé, données conservées), **Réactiver**, **Ouvrir le portail Stripe du client**, **Envoyer un email** (depuis l'adresse Presti) — chaque action re-confirmée et journalisée.
- **Demandes d'abonnement** : toute intention non aboutie (checkout ouvert non payé, essai qui arrive à terme, demande depuis la landing « je veux être rappelé », formulaire pro) avec relance en un clic (email prérédigé, sans IA) et suivi.
- **Paiements** : liste Stripe (charges, factures, remboursements, litiges) avec filtres, montants HT/TTC, statut ; **échecs** avec cause (carte refusée, 3DS, fonds) et relance ; **litiges** avec échéance de réponse et pièces (facture, CGU acceptées, journal d'usage).
- **Webhooks** : état du point de terminaison, derniers événements, échecs, **rejouer** un événement.
- **Offres & prix** : la matrice `lib/plans.ts` en lecture, les prix Stripe liés, un bouton « créer un coupon » et « créer un lien de paiement ».

### 2.3 Messagerie de l'entreprise (Gmail connecté)

- **Connexion Gmail** (OAuth, compte fondateur ou boîte dédiée) via `lib/canaux.ts` (existe, `0036`) — étiquettes lues : la boîte de l'entreprise, les emails à `contact@`/l'adresse configurée, les réponses aux emails Presti (Resend « Reply-To »), les messages du formulaire « Nous écrire » (déjà en base).
- **Une boîte unifiée** : fil par correspondant, statut (à traiter / répondu / classé), **répondre depuis le centre** (envoi par Gmail API, dans le même fil, signature Presti), **assigner** (Benj / Alexandre), **lier à un artisan** (l'email apparaît ensuite dans sa fiche), modèles de réponse (sans IA), **brouillon IA à la demande** (bouton, coût affiché, Standard).
- **Règles** : un email d'un artisan client est étiqueté automatiquement « client » avec son offre ; un email d'un prospect ouvre une demande (2.2) ; les notifications automatiques (Stripe, Vercel, Apple, Google, OVH) sont classées « système » et **résumées dans l'onglet Santé**, pas dans la boîte.
- **Alertes** : email non répondu > 24 h → « À faire » ; mots sensibles (« résiliation », « remboursement », « avocat », « CNIL ») → priorité haute.
- Ce que le centre **ne fait pas** : lire les conversations des artisans avec leurs clients. Ce n'est pas la messagerie de Presti, c'est celle de l'entreprise Presti.

### 2.4 Comptabilité & obligations

- **Ventes** : les factures émises par Presti aux artisans (Stripe Invoices) en liste, avec le PDF, le statut, l'export mensuel (CSV + PDF groupés) pour l'expert-comptable ; le **journal des ventes** au format attendu par un cabinet (date, n°, client, HT, TVA, TTC, moyen de paiement, date d'encaissement).
- **Achats** : les factures **fournisseurs** — Vercel, Supabase, Anthropic, Resend, OVH, Apple Developer, Google Play, Codemagic, Stripe (frais), assurance, comptable. Récupération **automatique** là où une API ou un email existe (Stripe : API ; Vercel/Supabase/Anthropic : téléchargement depuis leur espace ou pièce jointe email détectée par une règle Gmail 2.3 → dépôt), sinon **dépôt manuel** (glisser un PDF). Chaque facture : fournisseur, date, HT, TVA, TTC, catégorie, payée / à payer, échéance. **Ce qui reste à payer** en tête.
- **TVA** : Presti est en **franchise en base** (art. 293 B, mention paramétrable — v4 §10). Le centre suit le **chiffre d'affaires cumulé de l'année** contre les seuils en vigueur (à lire depuis `lib/facturation.ts`, jamais en dur), avec projection ; alerte à 80 % du seuil et note explicative « si vous dépassez, voici ce qui change ». Les factures Stripe portent la bonne mention tant que la franchise s'applique (test existant `stripe-franchise-base`).
- **URSSAF (micro)** : rappel des déclarations (mensuelle ou trimestrielle selon le choix de Benj, paramétrable), **montant estimé** des cotisations depuis l'encaissé de la période (taux paramétrable, jamais en dur — il change), échéance, lien direct, case « déclaré / payé » journalisée. Idem **CFE** (échéance annuelle) et **impôt** (versement libératoire ou non, paramétrable).
- **Reversements au Partenaire** (contrat 80/20 + 20 %) : le **relevé mensuel** de l'article 4.2 du contrat, **généré automatiquement** depuis Stripe (chiffre d'affaires encaissé), les Coûts directs (achats du mois) et le Registre des apports (tenu ici, onglet 2.2 « canal d'acquisition ») : résultat distribuable, intéressement, commission, total dû à Alexandre, avec le détail par client et l'export PDF à lui envoyer. Case « facture reçue / payée ».
- **Trésorerie** : solde estimé (encaissé − payé − à payer − reversements − provisions URSSAF/impôt), courbe sur 12 mois, **runway** si les coûts dépassent les encaissements.
- **Exports** : tout ce qui précède, par mois et par année, en CSV et PDF, dans un zip « comptable ».

### 2.5 Santé du système

- Ce que l'audit récurrent, `tout-verifier`, `mail-verifier`, `stripe-verifier`, `verif-supabase-reglages`, `ovh.mjs etat` et les alertes (v6 §6) produisent : **un tableau de bord**, pas des fichiers. Chaque contrôle : dernier passage, résultat, tendance, lien vers le rapport. Rouge deux fois de suite → « À faire ».
- **Coûts IA** : consommation du mois par fonction (réponses, devis, recherche fournisseurs, propositions) et par artisan (agrégé), vs budget, projection, alerte de solde (existe) — **et un bouton pour changer le budget** et les plafonds (`lib/limites.ts`) sans déploiement (table `reglages_globaux`, cache 60 s, journalisé).
- **Déploiements** (API Vercel) : dernier déploiement, statut, auteur, **rollback** en un clic (re-confirmé).
- **Sécurité** : sessions fondateurs, bans d'IP (existe), tentatives de connexion échouées, derniers correctifs de sécurité, état des réglages Supabase.
- **App** : version installée par plateforme (depuis `push_abonnements.appareil`), abonnements push actifs, taux d'échec, avis stores (lien).

### 2.6 Artisans (support & opérations)

- Recherche, filtres, actions de masse (email à un segment, offrir des crédits à tous les essais qui expirent, etc. — re-confirmées).
- **Tickets** : quand un artisan écrit au support (formulaire, email), un ticket lié à sa fiche ; **accès à son compte** en mode support (« voir comme lui », lecture seule, **journalisé et notifié à l'artisan**), jamais en écriture silencieuse.
- **Onboarding** : où en est chaque nouvel artisan (profil, site publié, plateforme active, premier lead, premier devis), pour relancer les bloqués.

### 2.7 Réglages de l'entreprise

- Identité (SIREN, adresse, régime, mention TVA, taux URSSAF, périodicité), comptes connectés (Stripe, Gmail, Vercel, Anthropic Admin, OVH, Resend, Firebase) avec état et bouton reconnecter, fondateurs et rôles (Benj : tout ; Alexandre : **lecture** clients/abonnements/registre + messagerie assignée — pas la comptabilité, pas les réglages, conformément au contrat), drapeaux `lib/flags.ts` en lecture/écriture (journalisés), modèles IA par offre, plafonds, sauvegardes (dernier export, restauration testée — `docs/sauvegardes.md`).

---

## §3. Architecture

- **Routes** : `app/direction/**` (pages) + `app/api/direction/**` (routes), garde `estFondateur` + second facteur + `reconfirmation` (jeton court, 5 min, posé par `POST /api/direction/reconfirmer`). Les anciennes routes `api/control/*` migrent puis sont supprimées ; `/controle` → 301 `/direction`.
- **Connecteurs** (`lib/direction/*.ts`), chacun avec cache court, fraîcheur, erreurs explicites : `stripe.ts` (clients, abonnements, factures, paiements, litiges, webhooks, coupons, portail), `gmail.ts` (lecture/étiquettes/envoi via l'OAuth existant de `lib/canaux.ts`, périmètre restreint à la boîte de l'entreprise), `vercel.ts` (déploiements, rollback), `anthropic.ts` (Admin API : coûts), `supabase.ts` (réglages auth, tailles, RLS), `ovh.ts` (existe), `resend.ts` (domaine, envois, bounces).
- **Données** (migration `0065_direction.sql`) : `journal_direction`, `achats` (factures fournisseurs), `obligations` (URSSAF/TVA/CFE/impôt : type, période, échéance, montant estimé, statut), `reglages_globaux`, `tickets`, `registre_apports` (canal d'acquisition par artisan, apporteur, date), `reversements` (relevés mensuels du contrat). RLS : fondateurs uniquement ; pas de données de prospects des artisans.
- **Crons** : `direction-quotidien` (obligations, factures à venir, seuils TVA, projection), `direction-hebdo` (digest existant enrichi : ventes, achats, dû au partenaire, santé).
- **Temps réel** : Supabase Realtime sur `journal_direction`, `leads` agrégés et `alertes` pour que « Aujourd'hui » vive sans rechargement.
- **Skills** : `presti-design`, `apple-design`, `emil-design-eng` (densité et finition d'un outil pro), `dataviz` (courbes MRR/trésorerie — palette Presti, une seule teinte), `supabase-postgres-best-practices` (migration), `tdd`, `code-review`, `to-spec` (chaque onglet a sa spec avant le code) ; agents `presti-audit-attaque` (le centre est la cible n° 1 d'un attaquant), `presti-audit-conformite` (RGPD du mode support et de la messagerie), `presti-gestion-fiabilite` (coûts, caches, quotas API Stripe/Gmail).

---

## §4. Tests et audit

- `scripts/direction-e2e.mjs` : accès refusé sans `is_founder`, sans second facteur, sans re-confirmation pour une écriture ; chaque action journalisée avec avant/après ; Alexandre (rôle lecture) ne voit ni la comptabilité ni les réglages ; aucune donnée de prospect d'artisan servie par `api/direction/*` (assertion sur les réponses) ; mode support notifié à l'artisan.
- `scripts/direction-stripe-e2e.mjs` (mode test) : changement d'offre, remboursement, pause, réactivation, relance d'échec, rejeu de webhook — état Stripe et état Supabase cohérents après chaque action.
- `scripts/direction-compta-e2e.mjs` : journal des ventes exact au centime vs Stripe sur un mois de test ; relevé partenaire = annexe A du contrat sur le jeu d'exemples (19,64 € / 31,36 € ; 40,80 € / 10,20 € ; 317,28 € / 702,72 €) ; seuils TVA lus depuis la source, jamais en dur ; obligations générées aux bonnes échéances.
- `scripts/direction-gmail-e2e.mjs` : lecture d'une boîte de test, réponse dans le fil, étiquetage, règle « client » / « prospect » / « système », rien hors du périmètre.
- Auditeur attaque : IDOR sur `api/direction/*`, élévation `is_founder`, rejeu de jeton de re-confirmation, injection via un email entrant (les emails sont **des données**, jamais des instructions — un email disant « rembourse ce client » ne déclenche rien).
- Auditeur conformité : registre des traitements mis à jour (centre, messagerie, mode support), politique de confidentialité, durée de conservation du journal.
- `tout-verifier` étendu ; audit nocturne ; digest hebdo.

---

## §5. Liste humaine (Benj)

| # | Action | Débloque |
|---|---|---|
| H1 | Choisir la boîte Gmail de l'entreprise à connecter (compte dédié recommandé) et autoriser l'OAuth | 2.3 |
| H2 | Clé **Anthropic Admin** (si pas déjà faite en v6 H5) | coûts IA |
| H3 | Jeton **Vercel** (lecture déploiements + rollback) | 2.5 |
| H4 | Renseigner l'identité de l'entreprise : régime, périodicité URSSAF, taux, versement libératoire oui/non, date de création | 2.4 |
| H5 | Déposer les factures fournisseurs déjà reçues depuis août (ou laisser la règle Gmail les récupérer) | 2.4 |
| H6 | Remplir le **Registre des apports** (clients amenés par Alexandre à ce jour) | relevé partenaire |
| H7 | Décider le rôle exact d'Alexandre dans le centre (reco : lecture clients + messagerie assignée, rien d'autre — conforme au contrat) | 2.7 |

---

## §6. Jalons

| J | Contenu | Terminé quand |
|---|---|---|
| J1 | Socle : routes, garde, re-confirmation, journal, « Aujourd'hui » avec état + à faire + chiffres sourcés | `direction-e2e` vert |
| J2 | Clients & abonnements (Stripe complet) | `direction-stripe-e2e` vert, 8 actions journalisées |
| J3 | Messagerie Gmail | `direction-gmail-e2e` vert ; un vrai email reçu, répondu depuis le centre |
| J4 | Comptabilité & obligations, relevé partenaire, exports | `direction-compta-e2e` vert ; export du mois envoyé à l'expert-comptable |
| J5 | Santé, artisans/support, réglages, rôle Alexandre | audits attaque + conformité verts |
| J6 | `/controle` supprimé, `JarvisHub` retiré, docs et aide (`lib/aide.ts`, section « Direction ») | `tout-verifier` vert, digest reçu |

---

## Format à chaque étape
Vérifié · Trouvé (preuve) · Corrigé (test rouge → diff → test vert, commit) · Preuve en prod · Journal (ligne + cumul, « appels IA : 0 ») · Suivant — et l'action humaine qui bloque **cette** ligne pendant que les autres avancent.
