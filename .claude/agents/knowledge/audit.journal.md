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
