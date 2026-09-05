# Audit offensif — AUDITEUR A (ATTAQUE / pentest)

Date : 2026-09-05 · Cible : presti (Next.js 15, Supabase, prod https://prestiapp.fr) · Lecture seule du dépôt.
Contrainte tenue : **zéro appel IA** (aucune génération déclenchée ; routes IA testées uniquement par entrées rejetées avant le modèle, et par la suite gratuite `ia-unit`).

Méthode : lecture au fichier:ligne + exploits rejoués (2 comptes de test `@presti-test.invalid` créés via l'API admin Supabase et **supprimés**). Rien n'est déclaré « sain » sans preuve rejouée.

---

## Constats

### Aucun défaut bloquant ni majeur trouvé.

L'audit n'a produit aucune faille exploitable. Les vecteurs du mandat (IDOR, escalade, rejeu de jetons, cache mutualisé, webhook, secrets) sont tous couverts et **prouvés tenants en production**. Deux points mineurs de cohérence défensive sont listés plus bas.

### MINEUR 1 — CSP `script-src 'unsafe-inline'` (déjà connu, chantier nonce reporté)
- Preuve : `curl -sSI https://prestiapp.fr/` →
  `Content-Security-Policy: script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; … frame-ancestors 'none'`.
  Fichier : `next.config.mjs:49`.
- Effet : le `'unsafe-inline'` sur `script-src` prive la CSP de son rôle de dernier rempart contre un script inline injecté. Le risque réel est faible ici (rendu React qui échappe, et JSON-LD des pages à données artisan correctement échappé — cf. sain n°8), mais la garantie CSP est décorative tant qu'il est présent.
- Déjà tracé dans `plans/apres-demo.md` (« CSP `unsafe-inline` (chantier nonce) »). Aucune régression, aucune action nouvelle exigée pour la démo.
- Correctif : nonce par requête (middleware) + retrait de `'unsafe-inline'`. **Chiffrage : 4–6 h** (déjà planifié).

### MINEUR 2 — JSON-LD statique sans échappement `</script>` (défense en profondeur, sans impact aujourd'hui)
- Preuve : `app/Breadcrumb.tsx:15`, `app/faq/page.tsx:37`, `app/page.tsx:30/48` sérialisent du JSON-LD sans `.replace(/</g,'\\u003c')`.
- Vérifié : ces blocs ne reçoivent **que du contenu statique éditeur** — `Breadcrumb` n'est appelé qu'avec des libellés en dur (`app/cgu/page.tsx:11`, `app/faq/page.tsx:38`, etc.), jamais une chaîne artisan/utilisateur. La **seule** page à données non fiables, `app/site/[slug]/page.tsx:420/422`, échappe correctement (`.replace(/</g, '\\u003c')`). Donc **pas de XSS stockée** exploitable aujourd'hui.
- Correctif : appliquer le même `.replace(/</g, '\\u003c')` aux 3 fichiers pour qu'un futur libellé dynamique ne rouvre pas le vecteur. **Chiffrage : 0,5 h.**

---

## Vérifié et sain (avec preuve rejouée)

1. **IDOR — isolation entre artisans (14 tables) : SAIN.** `scripts/rls-e2e.mjs` rejoué en prod avec le jeton navigateur (clé anon, pas la clé de service) : **33/33**. A ne lit 0 ligne de B sur `artisans, leads, messages, devis, devis_lignes, factures, prix_artisan, materiaux, stock, mouvements_stock, listes_achat, lignes_achat, canaux, plateforme_config` ; A ne peut modifier/supprimer aucun objet de B ni se réattribuer un lead (« sans effet », B intact). Confirmé aussi par lecture : toutes les routes objets scoping `.eq('artisan_id', uid)` — `app/api/factures/[id]/route.ts:16,33,57`, `app/api/devis/[id]/route.ts:21,50,76`, `lib/devisAuto.ts:30` (`lead.artisan_id !== uid`), `lib/factureDepuisDevis.ts:32`, `app/api/canaux/route.ts:83`, `app/api/tarifs/route.ts:120,127`, `app/api/donnees/route.ts:79,135`.
2. **Routes « publique » de l'inventaire produit = FAUX positif de classification.** `factures`, `devis`, `devis/auto`, `factures/[id]`, `donnees`, `tarifs`, `canaux`, `securite/sessions` authentifient toutes via `authArtisan`/`getUserRevocable` (`lib/authArtisan.ts`) — le script d'inventaire ne détecte pas le wrapper. Aucune n'est réellement anonyme.
3. **Escalade de privilèges : SAINE, prouvée en prod.** Sonde jeton-navigateur (compte de test, supprimé) :
   - `update artisans set credits=999999` → **figé à 3** (trigger `lock_artisan_privileges`, `supabase/migrations/0055:13`, **vivant en prod**).
   - `update … set is_founder=true, plan='business'` → **figé** (`is_founder=false, plan=gratuit`).
   - `stripe_customer_id`, `stripe_subscription_id`, `compteur_devis/facture` → **figés** (0055:15-18).
   - INSERT à la création de compte : `credits`, stripe ids, compteurs **forcés** par `lock_artisan_privileges_ins` (`supabase/migrations/0008:44-58`) — le vecteur « credits libre à l'insert » (que 0005 laissait ouvert) est **fermé par 0008**, vérifié.
   - RPC `consume_credit` et `next_numero` appelées **côté client** → **refusées** (revoke `0008:38-39`, vivant).
4. **Rejeu de jetons après déconnexion : SAIN.** `rls-e2e` §6 en prod : après `POST /api/securite/sessions`, le **même jeton d'accès** → 401 sur `/api/tarifs`, `/api/inventaire`, `/api/donnees` ; et le **jeton de rafraîchissement** ne refabrique plus d'accès (grant refresh_token ≠ 200). Double verrou `sessions_invalides_avant` + `revoquer_sessions_auth` (`lib/authArtisan.ts:113-124`).
5. **Webhook Stripe forgé : SAIN, prouvé en prod.** POST sans `stripe-signature` → **503** ; signature bidon → **400**. Fail-closed (`app/api/stripe/webhook/route.ts:19,23`). Aucun corps forgé n'atteint la mise à jour d'abonnement.
6. **Routes publiques à jeton — rejet avant IA, prouvé en prod.** `GET /api/conversation?token=pas-un-uuid` → **400** ; `POST /api/conversation/devis` jeton uuid aléatoire → **404 « Conversation introuvable »** (aucun appel IA) ; `POST /api/inventaire/recherche` sans Bearer → **401** ; `GET /api/control/stats` sans jeton → **401**. Honeypot + ban IP + plafonds atomiques en tête de chaque route publique (`app/api/leads/route.ts:50-67`, `app/api/p/auth/route.ts:25-52`, `app/api/conversation/devis/route.ts:20-30,96`).
7. **En-têtes HTTP : SAINS, prouvés en prod.** Landing : CSP `frame-ancestors 'none'`, `X-Frame-Options: DENY`, HSTS `max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, Referrer-Policy, Permissions-Policy. `/site/*` et `/p/*` : `frame-ancestors 'self'` + `X-Frame-Options: SAMEORIGIN` (embarquables par la console, pas par un tiers). `connect-src` épinglé au seul projet Supabase (pas de joker `*.supabase.co`).
8. **Secrets côté client / historique : SAINS.** `grep NEXT_PUBLIC_` → seulement `DOMAINE_NEUTRE`/`SUPABASE_URL`/`ANON_KEY` (publics par nature). Aucun `service_role`/`sk_`/`whsec_`/clé en dur dans `app/`+`lib/` (toutes les occurrences sont des commentaires ou `process.env`). `lib/supabaseAdmin.ts` porte l'avertissement « serveur uniquement ». Historique git : seul `.env.local.example` est suivi, valeurs = placeholders (`TA_CLE_SERVICE_SECRETE`, …) ; `.env`/`.env.*` gitignorés.
9. **Cache mutualisé des prix (0056) — pas d'empoisonnement croisé : SAIN.** Un artisan ne peut pas injecter un prix contrôlé chez les autres : l'écriture (`lib/inventaire/cachePrix.ts:143`) exige que le **domaine soit sur la liste blanche serveur** `DOMAINES_PARTAGEABLES` (`LISTE_DEPART` marqués `prix_publics`, vérifiés à la main), re-contrôle `prixPublics`, et filtre `resultats.every(domaineDe(url)===domaine)`. Le drapeau `prix_publics` que l'artisan pose sur SON fournisseur ne suffit pas si le domaine n'est pas blanc. Table `recherche_cache` : **RLS activée sans policy + `revoke all`** (`0056:98-99`) — sonde client : lecture renvoie 0 ligne. Clé bornée (2–80 car., ≤ 8 mots, `clePartageable`) → aucun contexte chantier/PII n'entre.
10. **Injection de prompt : SAINE (par lecture + suite gratuite).** `scripts/ia-unit-e2e.mjs` : **99/99** — « message du prospect INTACT au modèle », balises `[MESSAGE_CLIENT]` écrites par un prospect **retirées**, garde-fous d'injection toujours présents. Nom de fournisseur nettoyé des sauts de ligne/caractères de contrôle avant d'entrer dans le prompt (`app/api/inventaire/fournisseurs/route.ts:74`) ; idem `requete` (`app/api/inventaire/recherche/route.ts:43`).
11. **Verrous d'offre serveur : présents** sur les routes sensibles (`lib/inventaire/auth.ts:20`, `app/api/inventaire/recherche/route.ts:38`, `app/api/domain`, `app/api/plateforme/apparence`). Masquer un menu ne suffit pas — l'URL API applique `peut(plan, capacité)`.
12. **Amplification de coûts IA (recherche) bornée** : plafonds durs jour/mois **appliqués aussi aux fondateurs** (`app/api/inventaire/recherche/route.ts:30-31,70-74`), crédit décompté seulement après appel payant abouti.
13. **Migration 0057 (`passages_cron`, postérieure à l'inventaire des 56) — SAINE.** Nouvelle table de trace des crons : `enable row level security` + `revoke all … from public, anon, authenticated` (`supabase/migrations/0057:25-26`), écrite uniquement par le serveur (service_role), même modèle que `limites` (0049) et `recherche_cache` (0056). Aucune surface cliente ajoutée : ni lecture ni écriture navigateur, aucune donnée personnelle. Le dépôt compte désormais **57 migrations** (l'inventaire fige encore 56).

## Hors périmètre assumé (non exécuté, à dessein)
- **Tests de flood/ban réels non lancés.** Le mandat impose de les faire en dernier, un par un, et **d'autres auditeurs tournent sur la même IP** (consigne « ne les bloque pas »). Le risque de bannir un auditeur concurrent l'emporte sur le gain : la logique anti-flood est vérifiée par lecture (compteurs atomiques `consommerLimite`, `recordAbuse`, auto-ban 12/30 min → 24 h dans `lib/security.ts`) et une suite dédiée existe (`scripts/leads-abuse-test.mjs`). **Recommandation : la rejouer en isolation, hors fenêtre multi-auditeurs, puis `node scripts/purger-abus.mjs`.** Aucun abus n'a été enregistré par mes requêtes (toutes de forme valide, rejetées proprement) — `purger-abus` non lancé pour ne pas effacer les enregistrements des autres auditeurs en cours.

**Comptes de test supprimés : oui** (rls-e2e : 2 comptes auto-nettoyés en `finally` ; sonde escalade : 1 compte supprimé + `deleteUser`). Aucun fichier du dépôt modifié (sonde temporaire écrite hors dépôt/`_*.tmp.mjs` puis supprimée) hormis ce rapport et l'entrée de journal.
