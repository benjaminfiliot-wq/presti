# Base de connaissances — AUDIT (sécurité · qualité · conformité)

Socle stable de la catégorie Audit. Lire aussi le journal `audit.journal.md`.

## 1. Posture de sécurité de Presti (état des lieux)

**Modèle d'accès Supabase**
- `anon` key (public, front) : soumise à la RLS. `service_role` (serveur seulement,
  `lib/supabaseAdmin.ts`) : **bypass RLS** — ne jamais l'exposer au client.
- RLS activée sur `artisans`, `leads`, `messages`, `relances`, `devis`, `factures`,
  `ip_bans`, `ip_abus`. Politiques : `*_select_own` / `*_update_own` scoperisées sur
  `auth.uid()`. `messages` : SELECT autorisé si le lead appartient à l'artisan ; **pas
  d'INSERT client** → les insertions de messages passent par le serveur (service_role)
  APRÈS contrôle de propriété (`app/api/messages/route.ts`, `app/api/conversation/route.ts`).
- `is_founder()` : SECURITY DEFINER, `execute` **révoqué** pour `public`/`anon`,
  accordé à `authenticated` (migration 0010). Fondateurs = benjaminfiliot@gmail.com +
  alexandremesroua@gmail.com → plan business, bypass crédits.

**Migrations (chronologie sécurité)** : 0005 secure_privileges, 0008 secure_rpc,
0010 hardening (RLS leads/messages/relances + colonne ip + revoke is_founder),
0011 indexes, 0013 ip_security (ip_bans, ip_abus), 0015 conversation (token secret).
Lire `supabase/migrations/*` — c'est la source de vérité du schéma et des droits.

**En-têtes HTTP** (`next.config.mjs`) : CSP, HSTS (preload), X-Frame-Options,
X-Content-Type-Options nosniff. Vérifier leur présence en prod : `curl -sI https://prestiapp.fr`.

**Anti-abus des routes publiques** (`/api/leads`, `/api/conversation`) :
- Ban IP (`lib/security.ts` : `isBanned` fail-open, `recordAbuse`, auto-ban à 12 abus/30 min → 24 h).
- Honeypot (champ caché `website` qui doit rester vide → abus + drop silencieux).
- Rate-limit par IP (≥6 leads/10 min → 429 + abus). Anti-flood conversation (≥6 msg/5 min).
- Plafond de tours par conversation (`MAX_TOURS`) contre l'amplification de coûts IA.
- Crédits : `consumeCredit` coupe l'IA quand épuisé, **le lead est toujours sauvé**.
- Jeton de conversation = uuid non devinable (bearer secret d'UNE conversation).

## 2. Checklist anti-hack (18 points — vidéo « Vibecoders getting hacked »)

1. Secrets en dur dans le code → `grep` clés/API/tokens ; doivent venir de `process.env`.
2. Secrets dans l'historique git → `git log -p` ; `.env.local` gitignoré.
3. `.env` exposé publiquement / servi par le front.
4. Auth faible (mots de passe, reset, sessions).
5. **Autorisation côté serveur** (pas seulement client) sur chaque route sensible.
6. **IDOR** : accès à l'objet d'un autre user (tester avec 2 comptes).
7. Permissions DB trop larges (RLS manquante/large, grants).
8. Supabase mal configuré (anon peut écrire ? definer functions ouvertes ?).
9. Routes admin/fondateur non protégées (`requireFounder`).
10. Mode debug en prod / stack traces.
11. Logs qui fuient des données sensibles.
12. Messages d'erreur verbeux (renvoyer un message générique au client, logguer le détail serveur).
13. Secrets côté frontend (`NEXT_PUBLIC_*` = public par définition).
14. Contrôles « client-only » contournables.
15. **Validation d'entrée** (types, bornes, regex slug/uuid, longueurs max).
16. Injection SQL/NoSQL (paramétrage, pas de concat).
17. XSS (dont **JSON-LD** : `JSON.stringify` n'échappe pas `</script>` → `.replace(/</g,'\\u003c')`).
18. Dépendances vulnérables / CORS trop permissif / CSRF sur mutations.

## 3. Méthode d'audit
- Fan-out par dimension. Chaque constat : **SÉVÉRITÉ** (CRITIQUE/IMPORTANT/MINEUR),
  `fichier:ligne`, scénario d'exploit concret, et **PREUVE** (test rejoué, grep, migration).
- Rejouer les exploits connus : RPC crédits appelée côté client → doit être **403** ;
  injection à l'inscription → credits forcés à 3 pour non-fondateur.
- Outils : token client via password grant (anon) ; admin via service_role (`.env.local`).
- Ne jamais annoncer « sain » sans confirmation au fichier:ligne. Rendre un tableau
  priorisé + la liste de ce qui est explicitement sain. **Ne modifie aucun fichier.**

## 4. Conformité (RGPD + légal artisan France)
- **Devis/facture** (obligations mentions) : identité entreprise (nom, forme, SIRET,
  adresse), **assurance décennale** (assureur + n° contrat + couverture géo), TVA
  (taux par ligne : 20 neuf / 10 réno / 5,5 réno énergétique ; mention franchise en
  base art. 293 B CGI si applicable), numéro de pièce, date, validité, conditions de
  paiement, mention « Devis reçu avant l'exécution des travaux » (bon pour accord),
  pénalités de retard (facture). Voir `lib/DevisPDF.tsx` + éditeur `app/devis/[id]`.
- **RGPD** : données prospects (nom, contact, message, IP) = données perso. Base
  légale = intérêt légitime/relation précontractuelle. Minimisation (ne stocker que
  l'utile), durée de conservation raisonnable, droit d'accès/effacement. Pages CGU +
  confidentialité présentes (`app/cgu`, `app/confidentialite`, `app/mentions-legales`).
  L'IP n'est jamais lisible par les artisans (aucune policy select cliente dessus).
- **Emails** : consentement/relation, lien de contact clair, pas d'usage détourné des
  adresses. Le paiement client a été RETIRÉ (ira sur la plateforme dédiée).

## 5. Références
- Mémoires : [[presti-guiding-videos]] (checklists 18 pts + sécurité + pré-lancement),
  [[presti-state]], [[presti-ai-architecture]].
- Skills : `code-review`, `diagnosing-bugs`, `supabase-postgres-best-practices`.
