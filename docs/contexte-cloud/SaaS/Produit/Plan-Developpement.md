# Plan de développement — Presti (par étapes testables)

> Basé sur [[Architecture]]. **Chaque étape est testable indépendamment** → tu ne passes à la suivante que quand la précédente marche. Idéal pour builder avec l'IA sans te noyer.
> ⚠️ À lancer **après** la validation terrain (interviews artisans).

## ▶️ Étape 1 — Socle : projet + authentification
**Construire :** initialiser le projet Next.js + Supabase, brancher l'auth (inscription/connexion artisan par email).
**Fichiers :** `lib/supabase.ts`, pages `login` / `signup`, table `artisans`.
**✅ Test :** je peux créer un compte, me déconnecter, me reconnecter. Un artisan apparaît dans la table `artisans`.

## Étape 2 — Onboarding + lien public
**Construire :** formulaire de config (métier, ton/style, coordonnées) qui génère un `slug` unique → le lien `/l/slug`.
**✅ Test :** je remplis mon profil, il est sauvegardé, et `presti.fr/l/mon-slug` existe (page vide pour l'instant).

## Étape 3 — Capture de lead (formulaire public)
**Construire :** la page `app/l/[slug]/page.tsx` (nom + contact + message) + `POST /api/leads` qui enregistre.
**✅ Test :** un prospect soumet le formulaire → un `lead` apparaît en base, rattaché au bon artisan.

## Étape 4 — Réponse IA instantanée + email  ⭐ (le cœur)
**Construire :** `POST /api/ai/respond` (Claude rédige la réponse dans le ton de l'artisan) + `lib/email.ts` (Resend envoie au prospect) + notif à l'artisan. Déclenché par l'étape 3.
**✅ Test :** je soumets un lead de test → je reçois un email de réponse pro **en moins d'une minute**, dans le bon ton.

## Étape 5 — Dashboard des leads
**Construire :** liste des leads + statuts + page détail ; bouton pour changer le statut.
**✅ Test :** je vois mes leads, j'ouvre un lead, je passe son statut à « devis envoyé ».

## Étape 6 — Relances automatiques
**Construire :** `lib/relances.ts` (planifie J+2/5/10 quand statut = « devis envoyé ») + `GET /api/relances/cron` (Supabase cron) qui envoie les relances dues.
**✅ Test :** je marque un devis « envoyé » → les relances se créent aux bonnes dates ; en accéléré, le cron les envoie et s'arrête si le client répond.

## Étape 7 — Génération de devis (IA)
**Construire :** page `devis` + `POST /api/devis` (Claude structure le devis) + export PDF (stocké sur Supabase Storage).
**✅ Test :** je décris un chantier → j'obtiens un devis PDF correct et propre.

## Étape 8 — Abonnement Stripe + paliers
**Construire :** Stripe (Gratuit / Pro 39€ / Business 79€), `POST /api/stripe/webhook`, paywall + quota du gratuit (voir [[Tarifs]]).
**✅ Test :** je m'abonne en test ; le quota gratuit bloque au bon endroit ; l'abonnement débloque.

## Étape 9 — Landing + capture email réelle
**Construire :** brancher la [[Landing-et-objections|landing]] (waitlist) à une vraie collecte d'emails.
**✅ Test :** un email saisi sur la landing est bien stocké et récupérable.

## Étape 10 — Déploiement
**Construire :** Vercel (front) + Supabase prod + domaine `presti.fr`, variables d'env, tests de bout en bout.
**✅ Test :** le parcours complet marche en prod, sur un vrai téléphone.

---
**Ordre de priorité si on veut un MVP vendable au plus vite :** étapes 1 → 6 (capture + réponse IA + dashboard + relances = la promesse « ne plus perdre de chantier »). Les devis (7) et Stripe (8) juste après. Le reste ensuite.

## Quand c'est « VENDABLE » — et je préviens Benj
**Définition (pas un % de code) :** un vrai artisan peut faire le tour complet (lead → réponse auto → relance) ET on peut l'encaisser.
= **étapes 1-6** (le cœur) **+ étape 8** (Stripe) **+ le pack légal** ([[Legal-site-web]]).
➡️ **Engagement : dès qu'on coche ces cases en construisant, Claude prévient Benj que c'est vendable** (suivi de l'avancement sur ce plan). Rien à notifier tant que le build n'a pas commencé.

### Mais on cherche des clients AVANT (le bon ordre)
1. **Maintenant (0 code) :** interviews Alexandre + collecte d'emails (waitlist landing). La chasse commence tout de suite.
2. **Membres fondateurs / pré-ventes :** dès que des artisans confirment la douleur → accès anticipé -50 % à vie → engagements/pré-paiements **avant** que le produit soit fini.
3. **Beta payante (cœur = étapes 1-6) :** onboarder les premiers artisans payants, **co-construire avec leurs retours** (ce qui ne plaît pas, on le change avant de finir).
4. **Vendable officiel (1-6 + Stripe + légal) :** vente self-service ouverte à tous.
> Vendre avant que ce soit fini = la bonne stratégie : des clients tôt + un produit amélioré selon eux.
> Note : « membres fondateurs » = clients impliqués qui façonnent le produit (≠ investisseurs financiers, qui est un autre sujet réglementé).
