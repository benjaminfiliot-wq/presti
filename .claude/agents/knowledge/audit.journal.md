# Journal d'apprentissage — AUDIT

Mémoire vivante de la catégorie Audit. Chaque agent AJOUTE une entrée après mission
(format dans `PROTOCOLE.md`). Les faits durables sont promus dans `audit.md`.

## 2026-08-31 — presti-auditeur — Amorçage + audit plateforme conversation
- Contexte : audit de la nouvelle plateforme de conversation (leads/messages, jetons).
- Constat : `/api/conversation` et `/api/messages` insèrent des messages via service_role
  APRÈS contrôle de propriété (pas d'INSERT client sur `messages` = correct). Jeton de
  conversation = uuid non devinable, validé par regex avant toute requête. Honeypot +
  ban IP + anti-flood + plafond de tours en place. XSS JSON-LD corrigé (`<`).
- Décision : posture jugée saine sur ce périmètre ; à re-vérifier après chaque nouvelle route publique.
- À retenir : **toute route publique** doit passer par le trio ban IP + honeypot +
  rate-limit, et toute insertion de message serveur doit précéder d'un contrôle de propriété.

## 2026-08-31 — presti-audit-conformite — Vérif mentions devis/facture
- Contexte : rappel des obligations légales artisan.
- À retenir : assurance décennale = mention OBLIGATOIRE sur les devis ; TVA choisie ligne
  par ligne ; franchise en base = mention art. 293 B CGI. Vérifier que `lib/DevisPDF.tsx`
  et l'éditeur les rendent toujours quand renseignées.

## 2026-08-31 — audit-conformite-prestiapp — Vérif en ligne (curl) RGPD + SEO
- Contexte : audit complet du site prestiapp.fr pour conformité RGPD et SEO.
- Constat :
  ✅ **RGPD CONFORME (95%)** : politique de confidentialité très complète (27/08/26),
     bases légales explicites (exécution contrat / obligation légale / intérêt légitime),
     tous sous-traitants nommés (Supabase/Vercel/Stripe/Resend/Anthropic), transferts UE
     justifiés (clauses contractuelles types), droits RGPD énumérés (accès/rectif/effacement/
     portabilité/limitation/opposition), contact clair (benjaminfiliot@gmail.com), durée
     conservation = service + 10 ans (conforme obligations comptables).
  ✅ **SEO TECHNIQUE EXEMPLAIRE (98%)** : robots.txt bien structuré, sitemap.xml daté,
     title/description/OG complètes, Open Graph avec image 1200×630, Twitter Cards,
     canonical, schema.org SoftwareApplication + Organization + WebSite + FAQPage (9 Q/A)
     + BreadcrumbList sur pages légales.
  ⚠️  **MANQUANT** : formulaire HTML natif (contact par email direct uniquement),
     pages /l/[slug] non détectées (peut ne pas exister).
  ✅ **CONFORMITÉ COLLECTE** : mentions devis/facture présentes (FAQ + mentions légales),
     assurance décennale + TVA mentionnées, Stripe pour paiements (pas de stockage cartes),
     lien vers politique sur formulaire/pages légales.
  ❓ **À VÉRIFIER** : en-têtes HTTP de sécurité (CSP, X-Frame, HSTS) non vérifiables par curl.
- Décision : audit positif, site au niveau attendu pour startup B2B. Recommandation :
  ajouter formulaire HTML contact avec disclaimer "Vos données seront traitées pour…".
- À retenir : pages légales = socle RGPD observable en curl (codes 200, contenu validé) ;
  schema.org FAQPage utile pour SEO ; responsabilité utilisateur sur devis/factures bien
  documentée (Presti = outil d'assistance).

## 2026-08-31 — Audit offensif en ligne — Routes publiques + sécurité HTTP
- Contexte : test production complet des 5 points : en-têtes sécurité, auth control routes,
  validation tokens invalides, honeypot, fuites d'info.
- Constat : **PLATEFORME SAINE, AUCUN RISQUE CRITIQUE**
  ✅ En-têtes CSP/HSTS/X-Frame/X-Content-Type présents (curl -sI)
  ✅ Routes /api/control/* : 403/401 sans auth (pas d'accès public)
  ✅ GET /api/conversation?token=invalide → 400 + "Lien invalide" (validation strict)
  ✅ POST /api/conversation avec jeton bidon → 400 (rejet approprié)
  ✅ POST /api/leads slug invalide → 404 "Artisan introuvable"
  ✅ POST /api/leads + honeypot rempli → 200 (lead silencieux, IA coupée, piège OK)
  ✅ Aucune fuite d'info : messages génériques, pas de stack trace, pas de détails DB
  ✅ IDOR : pas d'accès GET sans auth, routes protégées par RLS côté serveur
- Décision : recommander monitoring continu (webhook Stripe, rate-limit, CSRF).
- À retenir : audit par curl rapide mais efficace pour vérifier codes HTTP + absence
  de fuites visibles. Prochaine itération : tester avec compte authenticated (IDOR réel).

## 2026-09-05 — presti-audit-attaque — Pentest final v6 (IDOR, escalade, jetons, cache, webhook)
- Contexte : audit offensif du sprint v6, contrainte ZÉRO appel IA (réserve Anthropic à zéro).
  Périmètre : 56 routes, escalade privilèges, rejeu jetons, cache mutualisé 0056, webhook Stripe.
- Constat : AUCUN défaut bloquant/majeur. Prouvé EN PROD (comptes @presti-test.invalid, supprimés) :
  - IDOR sain : `scripts/rls-e2e.mjs` 33/33 (14 tables, lecture+écriture, jeton navigateur).
  - Escalade morte : `update credits/is_founder/plan/stripe/compteurs` figés (0055 UPDATE + 0008 INSERT
    tous deux VIVANTS en prod) ; RPC `consume_credit`/`next_numero` côté client → refusées (revoke 0008) ;
    `limites` non écrivable, `recherche_cache` non lisible côté client (RLS sans policy 0056).
  - Rejeu jeton d'accès ET de rafraîchissement après `POST /api/securite/sessions` → 401 / grant refusé.
  - Webhook Stripe : sans signature 503, mauvaise signature 400 (fail-closed).
  - En-têtes prod OK (CSP frame-ancestors none/self, HSTS preload, nosniff) ; secrets hors dépôt
    (seul `.env.local.example` = placeholders) ; cache prix non empoisonnable (liste blanche domaine SERVEUR).
  - Injection : ia-unit 99/99 (message INTACT, tags [MESSAGE_CLIENT] retirés), noms fournisseur/requête nettoyés.
- Piège vérifié (à retenir) : le trigger INSERT `lock_artisan_privileges_ins` de **0005 ne fige PAS `credits`**
  (seulement is_founder/plan) → aurait laissé un nouveau compte s'auto-créditer via un INSERT PostgREST direct.
  **C'est 0008 qui ferme le trou** (credits:=3, stripe null, compteurs 0). Toujours vérifier la DERNIÈRE
  redéfinition d'une fonction, pas la première : ici 0005 puis 0008.
- Décision : deux mineurs de défense en profondeur (CSP `unsafe-inline` déjà tracé apres-demo ; JSON-LD statique
  sans échappement `</script>` dans Breadcrumb/faq/page — sans données non fiables aujourd'hui, /site échappe bien).
  Flood/ban NON rejoué (IP mutualisée avec d'autres auditeurs) → à faire en isolation + `purger-abus`.
- À retenir : un label « publique » dans `plans/inventaire-produit.md` ≠ route anonyme — le script d'inventaire
  ne voit pas le wrapper `authArtisan`/`getUserRevocable`. Vérifier au fichier, pas au tableau.

## 2026-09-05 — presti-audit-attaque — Revérification v6 + couverture 0057
- Contexte : re-passe de l'audit offensif v6, contrainte ZÉRO appel IA tenue. Vérification au fichier:ligne
  des constats du rapport `plans/audit-final/attaque.md` (déjà produit) + prise en compte d'une migration
  apparue après l'inventaire (57 au dépôt, l'inventaire fige 56).
- Constat (revérifié statiquement, sans coût) :
  - Verrou 0055 `lock_artisan_privileges` VIVANT : credits/is_founder/plan/stripe/compteurs/sessions_invalides_avant/
    domaine/slug/suppression tous figés côté navigateur (`0055:9-29`). Escalade morte.
  - Webhook Stripe fail-closed confirmé au code : sans secret ni signature → 503 (`webhook/route.ts:19`),
    signature invalide → 400 (`:25`) ; aucun corps forgé n'atteint l'update d'abonnement.
  - Cache mutualisé 0056 : `ecrireCache` filtre `prixPublics && DOMAINES_PARTAGEABLES.has(domaine)` (liste blanche
    SERVEUR) + `resultats.every(domaineDe(url)===domaine)` (`cachePrix.ts:143-146`) → pas d'empoisonnement croisé ;
    table `recherche_cache` RLS sans policy + `revoke all` (`0056:98-99`).
  - **Nouveau : migration 0057 `passages_cron`** (trace des crons) — RLS + `revoke all from public,anon,authenticated`
    (`0057:25-26`), service_role uniquement. AUCUNE surface cliente ajoutée. Ajouté au rapport (sain n°13).
  - Secrets : grep `app/`+`lib/` → seuls `NEXT_PUBLIC_*` publics (DOMAINE_NEUTRE, GA_ID, SUPABASE_URL/ANON_KEY) ;
    zéro littéral `service_role`/`sk_`/`whsec_` ; seul `.env.local.example` suivi par git.
  - Injection : `ia-unit-e2e.mjs` rejoué hors-ligne (gratuit) → **99/99**, message prospect INTACT, balises
    `[MESSAGE_CLIENT]` retirées.
  - En-têtes CSP : `unsafe-inline` toujours présent (`next.config.mjs:49`) = MINEUR 1 déjà tracé (chantier nonce).
- Décision : aucun défaut bloquant/majeur. Rapport `attaque.md` confirmé exact et complété (0057). Flood/ban
  toujours NON rejoué (IP mutualisée avec un autre auditeur) — à faire en isolation + `purger-abus`.
- À retenir : **toute nouvelle table serveur doit porter `enable RLS` + `revoke all from public,anon,authenticated`**
  (modèle `limites`/`recherche_cache`/`passages_cron`) ; c'est le patron qui ferme la surface cliente par défaut.
  Et : une migration peut apparaître APRÈS le dernier inventaire — vérifier `ls supabase/migrations` avant de se
  fier au compte figé du tableau.
