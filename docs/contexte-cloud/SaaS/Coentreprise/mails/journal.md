# Journal d'apprentissage — MAILS

Mémoire vivante de la catégorie Mails. Chaque agent AJOUTE une entrée après mission
(format dans `PROTOCOLE.md`). Les faits durables sont promus dans `mails.md`.

## 2026-08-31 — presti-mails-delivrabilite — Domaine Resend VERIFIED
- Contexte : vérification Resend demandée par Benj.
- Constat : `prestiapp.fr` = **verified** (DKIM `resend._domainkey`, SPF `send`, MX `send`
  posés chez OVH et propagés). Envoi de test (contact@prestiapp.fr → benjaminfiliot@gmail.com)
  accepté (HTTP 200 + id Resend).
- Décision : les emails partent désormais aux vraies adresses (réponses auto, notifs, relances).
- À retenir : domaine neuf → surveiller bounces/plaintes, montée en charge progressive ;
  1er email possible en spam le temps d'établir la réputation. Envisager de durcir DMARC
  (`p=none` → `quarantine`) une fois la réputation établie.

## 2026-08-31 — presti-mails-cycle — Garde-fous confirmés
- À retenir : conversation multi-tour = ton vivant, PAS de « Bonjour »/signature à chaque
  message ; jamais de prix chiffré ; toujours une prochaine étape. Relances J+2/5/10, stop
  à la réponse. Éval via `scripts/ai-eval.mjs` avant/après tout changement de prompt.

## 2026-09-03 — presti-mails-delivrabilite — Sprint J-1 §15 : DMARC absent, Reply-To, boîte entreprise
- Contexte : sprint J-1 (plan 004 §11 + §15). Vérification du domaine avant la démo (un devis
  part par email) et branchement de `contact@prestiapp.fr` partout.
- Constat (API Resend + DNS publics 8.8.8.8, 2026-09-03) :
  - Resend `prestiapp.fr` = **verified** ; `resend._domainkey` TXT (DKIM) résolu ;
    `send.prestiapp.fr` TXT `v=spf1 include:amazonses.com ~all` + MX 10
    `feedback-smtp.eu-west-1.amazonses.com` résolus → **envoi vert**.
  - `_dmarc.prestiapp.fr` → **aucun TXT** (DMARC absent). Aucun identifiant OVH dans
    `.env.local` (seulement Resend/Supabase/Vercel/Anthropic/CANAUX_KEY) → impossible de le
    poser par API d'ici. Ligne exacte donnée à Benj (voir `mails.md` §2).
  - MX racine → OVH (`mx1/2/3.mail.ovh.net`), SPF racine `include:mx.ovh.com -all` : les
    réponses à `contact@` vont chez OVH, boîte à créer (J0).
- Décision / action (code, non déployé par moi) : `lib/email.ts` — Reply-To par défaut
  `contact@prestiapp.fr` pour les emails DE Presti, jamais pour les emails white-label ;
  `notifierEntreprise()` ; `reset-request` et `p/auth` audités (Reply-To ajoutés : entreprise
  / artisan). Notifications entreprise : inscription (`/api/account/inscription`), Stripe
  (paiement + résiliation), erreur critique (plafonnée 5/h). Canal fondateur : helper
  `canalEntreprise()` + `scripts/canal-entreprise.mjs` (silencieux tant que les variables
  `PRESTI_MAIL_IMAP_*` n'existent pas).
- À retenir : (1) « domaine verified chez Resend » ≠ « DMARC posé » — vérifier les deux, par
  résolution publique ; (2) un email white-label ne doit JAMAIS porter l'adresse de l'éditeur
  en Reply-To : c'est le `fromName` qui décide ; (3) pour les tests d'envoi, utiliser le puits
  `delivered+<tag>@resend.dev` (livré, jamais de bounce) plutôt qu'un domaine inventé qui
  abîme la réputation.
