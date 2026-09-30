# Base de connaissances — GESTION (santé · données · fiabilité)

Socle stable de la catégorie Gestion. Lire aussi `gestion.journal.md`.
Rôle : donner à Benj un état **clair et fiable**, sans deviner. Vérifier, ne pas construire.

## 1. Cartographie de l'application

**Stack** : Next.js 15.5 (App Router) + TypeScript + React 19 ; Supabase (Postgres, RLS) ;
Anthropic SDK ; @react-pdf/renderer ; Stripe ; Resend. Déploiement **Vercel** (push sur
`main` → déploie). Repo github.com/benjaminfiliot-wq/presti.
Domaines : `prestiapp.fr` (landing) + `qg.prestiapp.fr` (espace connecté).

**Routes clés** :
- Publiques : `/` (landing), `/l/[slug]` (plateforme artisan), `/login` `/signup` `/onboarding`.
- Console : `/dashboard`, `/messages` (boîte de réception), `/devis` `/devis/[id]`,
  `/factures`, `/profil` (Ma page), `/abonnement`, `/outils`, `/controle` (fondateur).
- API : `/api/leads` (contact public), `/api/conversation` (chat public),
  `/api/messages` (réponse artisan), `/api/devis` `/api/devis/generer` `/api/devis/[id]/pdf|envoyer`,
  `/api/factures`, `/api/subscribe` `/api/stripe/webhook`, `/api/tools/reponse`,
  `/api/cron/relances`, `/api/control/{stats,stripe,security,agents,inbox}`.

**Tables** (schéma dans `supabase/migrations/*`) :
- `artisans` (profil, plan, is_founder, credits, slug, infos légales, bio, services,
  zone, horaires, logo_url, plateforme_active, accent).
- `leads` (= conversations : artisan_id, nom_prospect, contact, message, statut, canal,
  ip, token, lu_le, created_at, updated_at). Statuts : nouveau → en_discussion → repondu → gagne/perdu.
- `messages` (lead_id, sens in/out, type manuel/reponse_auto, contenu, sent_at).
- `relances` (lead_id, planifiee_le, rang, envoyee).
- `devis`, `devis_lignes`, `factures`, `facture_lignes`.
- `ip_bans`, `ip_abus` (sécurité). `postes_types` (bibliothèque prix par métier, optionnelle).
- Migrations appliquées : 0001 → 0015.

## 2. Tunnel métier (le cœur de la valeur)
`lien partagé` → **lead** (contact) → **conversation** (client ↔ IA en direct) →
**devis** (chiffré par IA, pré-rempli depuis la conversation via `?lead=`) → **facture**
(1 clic depuis le devis) → **relances** auto J+2/5/10 (stop si le client répond).
Métriques de tunnel à suivre : nb leads, taux de réponse IA, nb conversations actives,
taux lead→devis, devis→facture, CA facturé, délai de 1re réponse.

## 3. Comptes, crédits, abonnement
- Plans : gratuit / essentiel / studio / signature / pro / business. Fondateurs = business + bypass crédits.
- `credits` : consommés par génération IA (`consumeCredit`, `lib/credits.ts`). Épuisés →
  l'IA se coupe mais **rien n'est perdu** (lead/message sauvés). Paliers de modèle par
  plan (`lib/models.ts` `resolveModel`) : standard (Haiku) / pro / expert.
- Stripe : abonnement via `/api/subscribe` + webhook `/api/stripe/webhook`
  (`scripts/stripe-webhook-setup.mjs`, `provision-webhook.mjs`). Le paiement CLIENT a été retiré.

## 4. Contrôles de santé (agent gestion)
- **Prod up** : `curl -sI https://prestiapp.fr` → 200 + en-tête CSP ; `/robots.txt`,
  `/sitemap.xml` → 200 ; `qg.prestiapp.fr` répond.
- **API fondateur** : token via password grant → `/api/control/stats`, `/api/control/stripe`
  répondent (403 pour non-fondateur = correct). Identifiants dans `.env.local` (jamais afficher).
- **Base** : compter les lignes des tables clés (`select id, count exact, head`).
- **Resend** : domaine `prestiapp.fr` = **verified** (2026-08-31). `scripts/resend-domain.mjs`.
- **Migrations** : lister `supabase/migrations/*` ; `scripts/run-migration.mjs` n'applique
  que du neuf ; pour lire, requête `pg` directe (host pooler eu-central-1, user `postgres.<ref>`).
- **Bans** : `ip_bans` actifs (expires_le futur ou null).

## 5. Fiabilité, coûts, quotas (spécialiste fiabilité)
- **Coûts IA** : Haiku pour le volume (réponses/conversations), Sonnet/Opus pour devis
  Pro/Expert. `thinking:{type:'adaptive'}` sur 4.6+/5-series (jamais `budget_tokens` sur 5-series
  → 400). Surveiller l'amplification : plafonds (MAX_TOURS, rate-limits, throttle par artisan).
- **Vercel** : routes IA lentes → `maxDuration` (ex. `/api/devis/generer` = 60 s). Fonctions
  serverless : attention aux timeouts (10 s défaut) et cold starts.
- **Robustesse** : chemins critiques (leads) « ne rien perdre » — l'insertion du lead précède
  toute étape IA/email, chacune non bloquante (try/catch, le lead reste visible).
- **Idempotence** : migrations `if not exists` ; webhooks Stripe idempotents.

## 6. Sortie & règles
- Rapport concis ✅/⚠️/🔴 par item + la donnée (code HTTP, statut, compte). Mettre à jour
  le cockpit (artifact 289531c7) si un lien/état change. Comptes de test → **supprimés** après.
- Ne modifie pas le code applicatif. Références : [[presti-state]], [[presti-platform-vision]].
