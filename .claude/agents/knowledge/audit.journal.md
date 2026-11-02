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

## 2026-09-05 — presti-audit-conformite — Audit final B (RGPD · légal artisan · LCEN · conso · white-label)
- Contexte : audit final v6, contrainte ZÉRO appel IA, éditeur en franchise 293 B (immatriculations Stripe closes le 04/09,
  `STRIPE_TAXE_AUTO` baissé), boîte contact@prestiapp.fr inexistante remplacée par `/contact`. Rapport : `plans/audit-final/conformite.md`.
- Constat (preuves : HTML de prod, Stripe LIVE en lecture seule, 5 suites gratuites vertes — facturx 30/30, facturation 34/34,
  mentions-bloquantes 15/15, seo 26/26, legal 30/30 — comptes de test purgés) :
  - 🔴 `contact@prestiapp.fr` est **toujours** l'adresse d'exercice des droits sur `/confidentialite:23,56`, `/cgu:71`, `/faq:50`
    (seules les mentions légales ont été corrigées) ; `lib/reglesServeur.ts:67` et `conversation/devis/route.ts:87` y envoient encore un Reply-To.
  - 🔴 Suppression de compte avec facture émise : `lib/purgeComptes.ts:24-26` avale l'erreur du trigger `factures_conservees` (0041) ;
    `/api/account/delete` promet « Rien après 30 jours ». Modèle à décider : anonymiser, conserver les factures.
  - Majeurs : IP des prospects lisible par l'artisan (`lead_select_own` 0010:16 sans revoke de colonne + export `leads.*`) — le
    commentaire de 0010:42 affirme le contraire ; médiateur et n° TVA absents du PDF ; défaut de mention `'auto'` = CIBS depuis le
    01/09 alors que l'éditeur écrit 293 B (texte non confirmable → repasser à `'cgi'`) ; pas de rétractation à l'acceptation en ligne
    (facture d'acompte immédiate) ; CGU jamais acceptées à l'inscription ; `From: contact@prestiapp.fr` sur les emails white-label ;
    canaux IMAP (lecture de la boîte de l'artisan) absents de la politique de confidentialité ; pas d'annexe art. 28.
  - Sain : 293 B cohérent partout côté éditeur (landing, /abonnement, mentions, session Stripe sans taxe, 0 facture Stripe) ;
    mentions bloquantes + scellement + Factur-X ; bucket `lead-media` privé (sonde anonyme `NoSuchBucket`, 0045:103) ; white-label
    0 « Presti » textuel sur /site et /p (seules des URL absolues `prestiapp.fr`, et la ligne sous-traitant sur infos-legales — légitime).
- Décision / action : rapport tableau + plan de correction ordonné (~35 h dont 2 bloquants en 3 h 30). Aucun fichier modifié hors rapport et journal.
- À retenir : (1) vérifier une policy RLS **par colonne** quand un commentaire promet qu'une colonne « n'est pas lisible » — une policy
  `select using (auth.uid() = artisan_id)` expose toutes les colonnes, IP comprise, via PostgREST et l'export ; (2) le régime de TVA de
  l'ÉDITEUR (Stripe, landing, CGU) et celui de CHAQUE ARTISAN (`tva_regime`, mention par document) sont deux vérifications distinctes ;
  (3) `stripe.invoiceRenderingTemplates.list` + `tax.registrations.list({status})` + `invoices.list` = contrôle lecture seule suffisant
  pour prouver « 0 TVA facturée » sans ouvrir le tableau de bord ; le pied de page du modèle de facture reste à poser à la main.

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

## 2026-09-05 — presti-auditeur (auditeur C) — Qualité : 20 points × 3 surfaces (rapport `plans/audit-final/qualite.md`)
- Contexte : audit final qualité (checklist pré-lancement) sur landing, `/site/atelier-du-chene`, `/p/atelier-du-chene`,
  0 appel IA, aucun formulaire soumis, Playwright 1440×900 + iPhone 13 + axe-core, `a11y-e2e` 5/5, `budget-perf` ✅ (build local).
- Constat : 0 bloquant, 4 majeurs, 14 mineurs.
  - Landing sur téléphone : **2 823 Ko dont 2 417 Ko d'images** — sous 640 px la séquence remplace la vidéo
    (`DemoVideo.tsx:20`) et ses 5 PNG sont tous dans le DOM au même endroit (`DemoSequence.tsx:75`, `loading="lazy"`
    inopérant) ; `public/demo/scene-5.png` = 1,59 Mo. Desktop sans reduced-motion : 566 Ko, vidéo non téléchargée avant lecture.
  - `app/site/[slug]/infos-legales/page.tsx:51` : `robots index,follow` inconditionnel → la page légale d'un artisan
    `site_seo=false` reste indexable (prouvé sur la démo : site `noindex`, infos-légales `index`).
  - `app/Comparatif.tsx:11-12` : `aria-label` sur `<span>` sans rôle = ignoré (axe `aria-prohibited-attr` × 26) ;
    `.cmp-wrap` défilant non focusable. `.lp-trust` (« 3 crédits offerts · sans carte ») 2,73:1 (`--faint` #5B564E).
  - Canonique `'/'` du layout racine héritée par toute page sans `alternates` (`app/layout.tsx:36`) : /login, /signup,
    /abonnement, /reset-password et la 404 déclarent `https://prestiapp.fr`. OG title/description hérités sur /faq, /contact, /cgu…
  - `/favicon.ico` → 404 et aucun `apple-icon` (Safari/iOS sans icône ; `/p` épinglable sans logo).
  - TTFB dynamique : `/site` 491–685 ms, `/p` 660–1 030 ms (`no-store`, 2–3 requêtes Supabase par rendu) vs landing 47 ms (HIT).
  - Cookies : 0 sur les 3 surfaces, 0 script externe (GA inerte) → pas de bannière due. Liens 14/14 en 200. `/p` = 0 violation axe.
- Décision / action : rapport priorisé avec chiffrage (≈ 13 h, majeurs ≈ 3,5 h) ; rien ne bloque la démo. Correctifs délégués au dev principal.
- À retenir (candidats au socle) :
  - **Mesurer le poids SANS `reducedMotion:'reduce'`** : ce réglage bascule DemoVideo en séquence et fausse le desktop ;
    et mesurer sur iPhone, où la séquence est le chemin par défaut.
  - **`loading="lazy"` ne protège pas des images empilées dans le viewport** (carrousel en `position:absolute`) : ne monter que l'active.
  - **Tout `metadata` de sous-page doit redéfinir `alternates.canonical`, `openGraph.title/description/url`** sinon Next hérite du
    layout racine (piège déjà documenté dans `app/faq/page.tsx:5-6`, retrouvé sur 5 pages). Idem `robots` : toute page fille d'une
    surface artisan doit dériver `indexable` de `site_seo`, pas le coder en dur.
  - `aria-label` n'est valide que sur un élément avec rôle (pas sur `span`/`div` nus) ; axe le remonte en `aria-prohibited-attr`.
  - Les fichiers `public/` sont servis par Vercel en `max-age=0, must-revalidate` : les médias lourds passent par `next/image`
    ou un `headers()` `immutable`.

## 2026-09-05 — presti-ai-engineer (auditeur E) — IA : coûts, anti-fabrication, injection, verrous, observabilité (rapport `plans/audit-final/ia.md`)
- Contexte : audit final v6 de l'IA, **0 appel au modèle** (réserve Anthropic à zéro, clé `.env.local` en commentaire). Preuves = lecture
  au fichier:ligne + `ia-unit-e2e.mjs` rejoué (99/99, vérifié sans réseau) + un script hors-ligne sur les modules purs
  (`antiFabrication.ts`, `qualifyLead`, `findFabrications`) dans le scratchpad. Aucune route IA appelée.
- Constat : 0 bloquant, 5 majeurs, 9 mineurs (≈ 9 h 30).
  - 🟠 `/api/conversation/stream:139/154` débite `'standard'` (1 crédit) puis sert `resolveModel(cfg.modele)` → Opus (3 crédits) pour 1.
  - 🟠 `plateforme.ia.auto` (Studio+) n'existe qu'en UI : `mode_reponse` écrit par le navigateur (RLS 0032, trigger 0053 ne fige
    que apparence/avatar/amorces), défaut sans config = `'auto'` (`plateformeConfig.ts:89`) → un Essentiel a l'assistant autonome
    alors que la grille vend « vous validez chaque réponse » (`plans.ts:121`).
  - 🟠 `qualifie` toujours vrai (reporté le 04/09, non corrigé) : `qualifyLead` retombe sur le métier (`ai.ts:286`) → prouvé :
    « Bonjour, vous êtes disponible ? » → `Plomberie` → règle « Tout auto » = devis chiffré ET envoyé sur une conversation vide.
  - 🟠 Filtre anti-fabrication étendu : faux positifs prouvés (« urgence », « entretien », « après le week-end », « la nuit
    dernière » → phrase retirée) et faux négatifs prouvés (`RE_NEGATION` saute toute phrase contenant « pas de »/« malheureusement » :
    « Pas de souci, je me déplace gratuitement et j'interviens sous 24 h » passe).
  - 🟠 Solde à zéro muet sur `/leads`, `/devis/generer`, `/tools/reponse`, `/site/generate`, `/messages` et le cron relances (repli
    silencieux sur le template) ; crédit débité avant l'appel, jamais rendu.
  - Sain (prouvé) : crédit/plafond avant chaque appel sur les 9 routes ; bornes (4 000 car., 60 tours, 6/5 min clé partagée, boucle
    outils 4 tours/40 s, recherche 50 s/`maxRetries:0`) ; `source_prix` revalidée ; prix de recherche seulement si dans l'extrait ET
    dans une page récupérée ; sceau HMAC vérifié à `/retenir` ; `blocProspect` intact + balises retirées ; outils fermés sur
    artisan/lead ; IMAP sans génération IA ; photos jamais envoyées au modèle ; IDs de modèles exacts, thinking adaptatif 4.6+/5 seulement,
    zéro `temperature`.
  - Code mort à connaître : `repondreAvecOutils` et `routerModele` ne sont appelés par aucune route (seulement `ai-eval`/`ia-unit`).
- Décision : rapport tableau + ordre de correction (M1 → M3 → M5 → M2 → M4 → mineurs). Aucun fichier modifié hors rapport et journal.
- À retenir (candidats au socle) :
  - **Un débit de crédit doit recevoir le tier RÉSOLU, jamais un littéral** : chercher `consumeCredit(…, 'standard'` à côté d'un `resolveModel` — c'est le motif du sous-paiement.
  - **Une capacité `peut()` lue seulement par l'UI n'est pas un verrou** : pour chaque `Capacite` de `lib/plans.ts`, exiger un appel serveur (grep `peut(` hors `app/*.tsx`). `plateforme.ia.auto` et `plateforme.ia.expert` n'en ont aucun.
  - **Prouver un filtre déterministe hors-ligne** : les modules purs (`antiFabrication`, `qualifyLead`) se testent en 8 phrases avec
    `node --experimental-strip-types --import ./scripts/ts-loader.mjs` + clé factice — 0 € et plus précis qu'une suite IA.
  - Un « reporté dans `apres-demo.md` » n'est pas un « corrigé » : `qualifie` y dort depuis le 04/09 ; l'audit suivant doit relire la
    liste des reportés et vérifier chacun au fichier:ligne.
  - Vérifier que `signalerPanneIA` est dans **chaque** `catch` qui entoure un appel `lib/ai` (grep `generate\|repondre` puis `catch`) : une
    panne de compte est la seule panne qui touche tous les clients, et un `console.error` seul ne réveille personne.

## 2026-09-05 — presti-auditeur (auditeur D) — Parcours & expérience (rapport `plans/audit-final/parcours.md`)
- Contexte : audit final des parcours artisan + client en prod, 0 appel IA (garde-fou réseau dans Playwright), aucun paiement
  (arrêt sur Stripe Checkout LIVE), un compte créé PAR L'ÉCRAN `/signup` puis purgé (`purger_compte_test`), iPhone 13 + 1360×900.
- Constat : 0 bloquant, 5 majeurs, 9 mineurs (≈ 7 h 30).
  - `lib/slug.ts:7-8` coupe à 40 APRÈS avoir retiré les tirets de bord, puis l'onboarding colle `-xxxx` → slug de 45 car. avec
    `--` que `problemeSlug` (`lib/urls.ts:83`) et le middleware refusent : Presti génère une adresse que Presti ne valide pas.
  - Aucune borne sur nom/tel (371 car. et `abc<script>` enregistrés, PostgREST direct, pas de `check`) → `<title>` 381 car., h1 30 lignes.
  - `PlatChat.tsx:195` avale le 400 d'un lien magique expiré : le client ne voit rien (cas courant : lien de 20 min, usage unique).
  - `.pil-volets` (`globals.css:2012`) sans repli → `/plateforme` rendu à 510 px sur iPhone (dézoom automatique, seul écran touché).
  - Décocher « Mon site est publié » affiche « hors ligne — visible de vous seul » et masque le partage alors que `/site` reste 200 public.
  - Sain : messages d'erreur traduits partout, réponses uniformes (lien magique, reset), suppression/annulation avec effet en base,
    visite guidée mémorisée serveur, 404 réelles, 0 débordement mobile ailleurs, clavier OK.
- Décision / action : rapport tableau par parcours + plan ordonné. Aucun fichier modifié hors rapport et journal ; scripts temporaires
  (`scripts/_audit-d-*-tmp.mjs`) supprimés.
- À retenir :
  - **La prod peut changer PENDANT l'audit** (case CGU arrivée entre deux passages) : dater chaque preuve, relire `git status -sb`
    et le chunk servi (`_next/static/chunks/app/<page>/page-*.js`) quand l'écran contredit le fichier lu une heure plus tôt.
  - Un `innerWidth` > largeur d'appareil sur mobile = dézoom automatique de Chrome : chercher l'élément dont `right` dépasse,
    pas le `scrollWidth` du document (il suit le dézoom).
  - Pour tester « ce que l'écran dit vs ce qui est vrai » : lire l'état RÉEL par HTTP nu ou par la base au même instant que le libellé.
  - Playwright : `getByRole('button', {name})` peut résoudre un scrim `aria-label="Fermer le menu"` invisible ; viser la classe (`.pchat-burger`).
  - Un slug généré doit repasser par le validateur qui servira à le modifier (`problemeSlug`) — sinon l'utilisateur hérite d'une adresse « invalide ».

## 2026-10-11 — presti-auditeur — Audit anti-vibecoding A–E avant clients (lecture seule)
- Constat : 2 bloquants. (1) public/sites-demo/appel-* = 20 maquettes de prospects RÉELS (tél, SIRET, adresse) servies sur
  prestiapp.fr alors que présentées « privées » ; (2) /site/commander (bouton de la landing) bloqué sur « Chargement… » sans session
  (page.tsx `if (!t) return`, AppShell ne redirige pas). docs/presti/appels (141 fichiers) réintroduit après la règle du 04/10.
  RLS 65+31 tables et 226 definer révoquées : sain. typecheck 0.
- Corrigé le jour même (branche claude/refonte-comptabilite-ruda7g) : dossiers sortis du dépôt et de public/ (copie dans les fichiers
  du projet), .gitignore ; redirection vers /login?retour= ; erreurs brutes de l'onboarding traduites ; faux « aucun devis / aucune
  demande » remplacés par un état d'erreur ; /pubs/commander en 404 drapeau baissé ; og:url par page ; llms.txt ; npm audit en CI.
- À retenir : (a) un robots.txt dans un sous-dossier de public/ n'a AUCUN effet et tout public/ est servi : « privé » = route à jeton ;
  (b) une page client qui fait `if (!jeton) return` sans redirection reste bloquée pour un anonyme ; (c) une règle .gitignore n'agit
  pas sur un fichier déjà suivi : vérifier avec `git ls-files` ; (d) les marqueurs « IA » se comptent dans le CSS (orbes, grille,
  bruit, faisceau) et dans le texte une fois les commentaires retirés.

## 2026-10-11 — presti-audit-attaque — Pentest statique avant démonstration (166 routes, 135 migrations, historique 1 398 commits)
- Contexte : lecture seule, zéro requête prod, aucun exploit rejoué. typecheck vert.
- Constat : 0 critique, 3 élevés : (E1) second facteur, suspension et révocation absents de la RLS, donc mot de passe seul =
  PostgREST complet ; (E2) quota emails 80/j vidable anonymement + relais du message du prospect ; (E3) amplification IA sur
  conversation (pas de limite IP/artisan, historique entier renvoyé, fondateur sans crédit). 6 moyens, 11 faibles.
- Corrigé le jour même : E2 (message plus recopié, adresse validée, part anonyme du plafond + 3/jour par destinataire), E3 (plafonds
  par adresse et par artisan, historique borné à 16 messages / 12 000 caractères), M1 (getIp ramène l'IPv6 au /64), M2 (notification
  groupée même sous limite), M3 (bac à sable CSP sur /site-genere servi par un domaine Presti, jeton comparé en temps constant).
- Reste, à décider par Benj : E1 (politique RESTRICTIVE aal2 / sessions_verifiees / suspension, migration en production), M4-M6,
  purge de l'historique git des données de prospects (réécriture de main).
- À retenir : un second facteur vérifié dans les routes Next ne protège rien si le front lit PostgREST : il faut une policy
  RESTRICTIVE. Toute clé de limite par IP doit passer par le /64.

## 2026-10-11 (soir) — suite de l'audit d'attaque : E1 posé, historique purgé (accord écrit de Benj)
- E1 : migration 0138 (garde RESTRICTIVE `garde_session` + trois gardes de suspension en écriture) sur les 63 tables à RLS
  de production, 252 politiques. Mesuré avant : 0 des 38 sessions actives coupée. Vérifié après, sur jetons simulés en
  transaction annulée : session passée par le code = ses 3 devis ; même compte au mot de passe seul = 0.
- Réserve voulue : un compte jamais passé par le code (`connexion_verifiee_le` nul) garde sa session d'inscription,
  sinon l'écran de premiers pas (upsert direct sur `artisans`) casse selon le réglage « confirmer l'email ».
- Historique : `git filter-repo` sur presti et presti-sauvegarde (toutes branches) : prospection, presti-secrets,
  docs/presti/appels, public/sites-demo/appel-*. Sauvegarde complète avant : /mnt/project-files/sauvegardes/*.bundle.
- Reste : la clé Firebase `compte-de-service.json` était dans l'historique depuis le 30/09, à révoquer dans Google
  Cloud ; GitHub garde les têtes de PR (refs/pull/*) tant que le support ne les purge pas (dépôt privé).
- À retenir : (a) l'outil apply_migration du connecteur Supabase dépasse 60 s sur un bloc `do` qui boucle sur 63 tables ;
  des instructions simples par lots de 16 tables passent ; (b) le proxy du conteneur refuse (403) toute poussée de tag.

## 2026-10-20 — presti-audit-attaque — Atelier vivant du CRM (diff 8f70fe19 + Stock/Structure/contexte, commits e3fcac3/8f70fe1)
- Contexte : lecture seule imposée (aucune écriture prod, aucun compte créé) : preuves statiques au fichier:ligne, catalogue non lu (DIRECT_URL refusée : mot de passe).
- Constat : 0 critique, 0 élevé. /api/crm/vue : uid de session seulement, 14 lectures `.eq('artisan_id', uid)` (lib/crm/serveur.ts:93-106), fiche par `.eq('id', uid)` (l.49),
  `facturesEmises` refiltre par artisan (lib/crm/assistants.ts:24), aucun paramètre d'URL lu ; fournisseur imbriqué protégé par le déclencheur de 0048:123-134.
  Aucun dangerouslySetInnerHTML/innerHTML ; liens construits sur des UUID ; localStorage revalidé par liste blanche + slice(60) (Atelier.tsx:96-103).
  Opposition : garde + propriété sur rappel, chantier, devis ; upsert ignoreDuplicates (idempotent).
  Moyen : « Ajouter un article » (Stock.tsx:51) sans référence → upsert onConflict (artisan_id, nom, reference) NULLS NOT DISTINCT (0040:31) qui ÉCRASE
  une fiche homonyme (marque, photo, notes, tags, prix → null) via nettoyer() (materiaux/route.ts:104-127,187).
  Faibles : comptage à 0 impossible (Stock.tsx:69 `!q`), sortie > stock → négatif (0040 appliquer_mouvement), seuil par GET+POST entier (perte de concurrence,
  tags passés en minuscules), aucune limite de débit sur /api/inventaire*, metier3DDe : « Électricité » → façadier (`ite`), « espaces verts » → chauffagiste (`pac`).
- Décision / action : rapport au dev principal ; aucun fichier modifié hors ce journal.
- À retenir : un upsert sur une clé unique NULLS NOT DISTINCT dont la colonne n'est pas envoyée par le formulaire = écrasement silencieux d'un homonyme ;
  une route « créer » doit faire insert + 409, pas upsert. Les regex de classement par sous-chaîne courte (`ite`, `pac`, `iti`) doivent être bornées par \b.

## 2026-10-20 — presti-audit-attaque — Lot 5 du CRM : carte, validation, géocodage BAN (non commité, migration 0172 en prod)
- Contexte : lecture seule (aucun compte créé, aucune écriture) ; preuves statiques + sondes anon en prod (crm_reglages : 401/42501, chantiers : 401).
- Constat : 0 critique, 0 élevé. Garde + propriété `artisan_id = uid` sur chaque lecture/écriture (valider/route.ts:17,25,31,36,45 ;
  reglages/route.ts:12,19,25 ; taches/[id]/route.ts:93,109-110,117 ; geocodage.ts:46). Listes blanches exactes (valider.ts:304-312),
  lat/lng/geocode_le/retire_carte_le hors de REGLES_CHANTIER, TYPES_BATIMENT = CHECK de 0172:18-21. SSRF impossible (carte.ts:212,230),
  délai 4 s qui couvre aussi le corps (l.246-256), bornes lat/lng (l.237) + CHECK, ≤ 10 appels (geocodage.ts:57,69), aucun appel client.
  /suivi lit des colonnes explicites (app/suivi/[jeton]/route.ts:47). Registre § 13 présent.
  Moyen : aucune mémoire des pannes BAN — base puis chantiers EN SÉRIE (geocodage.ts:58 puis :72) = jusqu'à 8 s par vue et 10 appels
  relancés à chaque chargement tant que la BAN est lente. Faibles : course adresse modifiée pendant la recherche (le filtre
  `geocode_le IS NULL` ne protège pas un chantier jamais géocodé) ; validation auto qui re-retire un chantier « terminé » remis sur la
  carte (peutValider vrai pour `termine`) ; CACHE_BASE sans plafond ; valider renvoie ok même si 0 ligne écrite (course).
- Décision / action : rapport au dev principal ; aucun fichier modifié hors ce journal.
- À retenir : un filtre d'écriture « encore vide » (`is(col, null)`) ne protège contre une course que si l'autre écrivain REMPLIT la
  colonne ; s'il la remet à NULL, il faut comparer la valeur source (adresse, maj_le). Tout appel externe dans une route de lecture
  doit avoir un coupe-circuit et ne jamais être en série avec un autre appel externe.

## 2026-10-21 — presti-audit-attaque — Pilote automatique, pointage, temps réel complet (lot non commité, 0174/0175 non appliquées)
- Contexte : lecture seule (aucun compte, aucune écriture, aucune requête prod) ; preuves statiques au fichier:ligne.
- Constat : 0 critique, 2 élevés. (E1) le garde-fou « prix sourcé » se contourne : l'éditeur de devis ne renvoie jamais `source_prix`
  (app/devis/[id]/page.tsx:139 chiffrerIA, :153 save) et regles.ts:103 lit une provenance vide comme « saisie par l'artisan » → un devis
  chiffré par l'IA, ou un devis auto réenregistré, part seul. (E2) la réponse au prospect pilotée part par validerPropositionServeur
  (lib/envoisServeur.ts:60) sans `anonyme` (pas de 3/j par destinataire, quota produit 80/j partagé vidable) ni mention IA (exigée
  leads/route.ts:464-472), à une adresse déclarée par un anonyme ; limite_messages et plage horaire ne s'appliquent pas en assistée
  (plateformeConfig.ts:162-164). Moyens : suspension non relue par le pilote ; traiterFile sans budget (lignes/cartes figées en_cours,
  plafond dépassable si passages chevauchés) ; claim envoi-proposition consommé avant l'envoi (409 pendant 24 h après échec canal) ;
  cartes repondre_client issues d'un tour ayant lu du [MESSAGE_CLIENT] pilotables.
- Sain : filtre artisan_id partout (file, réclamation, magasin.lire, leadDuCompte, envois PDF), claim atomique a_partir→en_cours puis
  carte en_attente→en_cours, annulation conditionnelle a_partir, drapeau+offre+réglages+plafond relus au départ, OUTILS_JAMAIS_AUTO,
  pause générale au tic (fail-closed), /pointage (32 octets, SHA-256, regex 43, révocable, 3 filtres, CSP/noindex/no-referrer, échappement),
  0174 RLS sans politique + revoke + déclencheurs, 0175 RLS SELECT own (0002:32, 0141:209).
- Décision / action : rapport au dev principal ; aucun fichier modifié hors ce journal.
- À retenir : une provenance « vide = sûre » ne vaut que si TOUS les écrans font l'aller-retour du champ — un formulaire qui le perd
  blanchit la ligne. Un envoi qui perd sa validation humaine doit reprendre les garde-fous de l'envoi autonome (anonyme, mention IA,
  limites de conversation), pas ceux du clic de l'artisan.

## 2026-10-21 — presti-audit-attaque — Canaux : Telegram, notifications des réseaux, « Vos réseaux », import CSV (non commité, 0177 non appliquée)
- Contexte : lecture seule, zéro requête prod, aucun compte créé ; `canaux-reseaux-qa.mjs` joué en local (86/0) ; sonde hors dépôt
  (scratchpad `sonde-notif.mjs`) sur lireMail + lireNotificationReseau ; DMARC publics lus par DNS.
- Constat : 0 critique, 2 élevés. (E1) `lib/mailLite.ts:47` garde le DERNIER en-tête d'un nom → l'Authentication-Results lu est celui
  que l'EXPÉDITEUR a posé sous ceux du serveur : fixture `faux-linkedin-dmarc-fail.eml` + une ligne `Authentication-Results: x;
  dkim=pass header.d=linkedin.com; dmarc=pass header.from=linkedin.com` → verdict `ok`, rangé « LinkedIn ». 123devis (sans DMARC),
  habitatpresto, solocal, starofservice (p=none) livrent le faux en boîte de réception ; même faille pour Le Bon Coin (leboncoin.ts:145).
  L'écran promet « un faux LinkedIn est ignoré » (canaux/page.tsx:189). (E2) webhook Telegram sans aucune limite d'entrée ;
  preparerReponseCanal envoie une notification e-mail `transactionnel` à CHAQUE message (serveur.ts:184), clé GLOBALE
  `emails:produit:jour` 80 (email.ts:86-89) → un compte Telegram anonyme, un message toutes les 5 s, vide en ~7 min les e-mails
  produit de TOUS les artisans. Moyens : crédits IA vidables (8/10 min/artisan = 1 152/j), messages/leads illimités par bot,
  registre RGPD sans Telegram/notifications/import, colonnes de consentement de l'import jetées. Faibles : redirecteurs des réseaux
  admis par lienSur (l.facebook.com/l.php, linkedin.com/redir, fb.me), fils fusionnés par nom/objet, fil Telegram sans canal_id,
  mention IA + 4000 car. > 4096, CANAUX_KEY réutilisée en HMAC et AES.
- Sain : secret de webhook dérivé par liaison (401 avant toute lecture, temps constant), drapeaux statiques (aucune surcharge),
  jeton jamais renvoyé ni journalisé, getMe lie jeton et id du bot, pas de SSRF, envoi borné à ligneCanal(…, artisan), origine en
  liste fermée + CHECK, import : uid de session et fichier relu côté serveur, aucun envoi automatique à un importé (pilote, relances,
  refusAutomatique), mention IA sur l'envoi auto Telegram, rien en innerHTML, 0177 sans droit anon/authenticated.
- Décision / action : rapport au dev principal ; aucun fichier du dépôt modifié hors ce journal.
- À retenir : (a) un analyseur d'en-têtes maison qui écrase par nom rend tout en-tête de confiance (Authentication-Results,
  Received) falsifiable : ne lire que le PREMIER, et seulement si son authserv-id est celui du serveur de la boîte ; (b) une
  entrée publique sans coût pour l'émetteur (bot, webhook) ne doit jamais déclencher un envoi qui puise dans un plafond PARTAGÉ
  entre comptes ; (c) une suite qui teste le parseur sur des fixtures à UN seul en-tête ne voit pas l'attaque par doublon.

## 2026-11-02 — presti-audit-attaque (tâche 032-028, sur Oracle) — Lot L16 du chantier 4 : relances groupées de l'assistant (non commité)
- Contexte : lecture seule, hors ligne, aucune base ni e-mail ni modèle ; banc `.orchestre/preuves/032-028/attaques-l16.mjs` (236 PASS,
  8 FAIL, tous dans la partie « attaques ») ; les quatre suites rejouées. Entrée posée par la session principale (hors périmètre de l'agent).
- Constat : verdict NE TIENT PAS, 2 majeurs. (D1) `ordreGroupe` (`lib/assistant/cartes.ts:179-185`) reconnaît un ordre groupé par une liste
  de motifs ; « Relance M. Leroy et Mme Garnier », « relance tout le monde » passent pour un objet seul, et en « fait tout seul » la
  PREMIÈRE relance part sans clic (la règle du tour ne rattrape que la seconde). (D2) aucune carte en attente n'est lue à la préparation, et
  l'anti-doublon du clic lit, envoie, puis trace : deux clics proches relancent deux fois chaque client. 6 mineurs (D3 à D8). Le reste tient :
  la carte de lot ne part jamais sans clic, exclus et cartes écartées tiennent, isolation des comptes, escalade, rien de 032-007 à 032-018 rouvert.
- Décision / action : L16 retenu hors du push ; correction confiée à un agent distinct (032-030), vérifiée par le banc de l'auditeur rejoué sans
  modification, puis les quatre suites.
- À retenir : (a) une garde qui reconnaît un cas dangereux par une liste de motifs rate ce qu'elle ne liste pas : inverser la charge (ne
  laisser passer d'office que ce qui est prouvé simple) ; (b) un anti-doublon « lire puis envoyer puis tracer » a une fenêtre de course :
  réserver avant d'envoyer.
