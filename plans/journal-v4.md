# Journal de bord — Presti v4 (prompt `003-presti-v4-plateforme-site-inventaire.md`)

> Une ligne par étape, mise à jour en direct. Format : `[jalon] titre — début → fin (durée) — statut`.
> Cycle obligatoire : éditer → build 0 erreur → typecheck → déployer → vérifier en live → nettoyer les données de test.

## Session 2026-09-02 (démarrage 22:16)

## [B0-1] Restauration accès fondateur (§17) — 22:16 → …
- état constaté : `benjaminfiliot@gmail.com` **absent** de `auth.users` ET de `artisans` (compte supprimé). `alexandremesroua@gmail.com` intact (fondateur business). → seul Benj est à restaurer.
- approche : `scripts/restore-founder.mjs` idempotent + accès rendu par **magic link** (aucun mot de passe manipulé/loggé, conforme §17 + règle sécurité).
- **✅ fait 22:24** : compte auth recréé + ligne `artisans` (slug `benjamin-filiot`, `is_founder=true`, `plan=business`, crédits 1000). Magic link généré MAIS Supabase redirige vers `localhost` (Site URL en dev) → inutilisable. **Chemin retenu** : Benj lance `FOUNDER_PW='…' node scripts/restore-founder.mjs` (mot de passe de son choix, jamais dans le repo/log) puis se connecte sur qg.prestiapp.fr. Alexandre : intact, rien à faire.
- ⚠️ à corriger un jour (hors B0) : Site URL / redirect allow-list Supabase en dev → les magic/recovery links de prod pointent vers localhost. Non bloquant (connexion par mot de passe OK).

## [B0-2] Bug d'envoi message artisan (§B5) — 22:24 → 22:35 (11 min) — ✅ test vert
- **diagnostic** : route `/api/messages` (reply) insère `sens:'out'` via service_role après contrôle de propriété = correct ; RLS SELECT `message_select_own` correcte (l'artisan relit ses messages) ; `loadThread` refetch = OK. **Le bug n'est pas reproductible.**
- **livrable** : `scripts/messages-e2e.mjs` — écrit dans les 2 sens, vérifie persistance (service_role + RLS artisan = ce que voit loadThread) + remise (le prospect retrouve la réponse via `/api/conversation`). **7/7 PASS en prod.**
- **fix au passage** : l'email de réponse au prospect partait « de Presti » → `fromName = artisan.nom` (white-label).
- réserve honnête : la remise par EMAIL n'est pas prouvée par le test (adresse `example.com` rejetée par Resend) ; la remise PLATEFORME l'est. Un vrai domaine passe (domaine Resend vérifié).
- build/déploiement du fix : voir commit ci-dessous.

## [B1-1] Plateforme → route canonique /p/[slug] (§A1) — 22:29 → 22:47 (18 min) — ✅ terminé
- fait : `git mv app/l → app/p` (imports relatifs intacts) ; redirections **permanentes** `/l/:slug → /p/:slug` (Next émet 308 = équivalent moderne du 301, SEO identique) ; en-têtes embarquables déplacés sur `/p` (console garde DENY) ; liens mis à jour (dashboard, profil, bouton contact du site, smoke-test).
- build : OK (0 erreur) · typecheck : OK (après purge des types périmés `.next/types/app/l`) · déployé : oui (75edd8a)
- **incident & correction** : le 1er commit (a3d7641) ne contenait QUE les déplacements — `git add` avait avorté sur `app/l` supprimé, donc next.config n'était pas parti. Détecté en vérifiant les en-têtes live (`/p` en DENY, `/l` encore SAMEORIGIN). Re-commit 75edd8a → tout correct.
- preuve : 7/7 PASS en prod — `/p` sert la plateforme, `/l` redirige 308 vers `/p`, un ancien lien aboutit, le site pointe sur `/p`, plus aucun `/l` rendu, `/p` embarquable (SAMEORIGIN).
- suivant : [B1-2] interface de conversation (§A2) — colonne conversations, fil, composeur, streaming SSE, bandeau de transparence IA.

## [B1-2] Plateforme = application de conversation (§A2) — 22:47 → 22:54 (7 min) — ✅ terminé
- fait : `/p/[slug]` n'est plus une page marketing. Nouveau `PlatChat.tsx` — colonne des conversations (persistées en local, tiroir sur mobile + scrim), fil bulles/photos, composeur (Entrée envoie, Maj+Entrée saut de ligne, pièce jointe, auto-grow), **états par message** (envoi → envoyé → échec + **retry visible**), amorces d'ouverture bâties sur les **vraies prestations**, mention « X vous répond directement » quand l'humain reprend, **bandeau de transparence IA permanent**. Capture des coordonnées après la 1re réponse.
- nettoyage : `LeadForm.tsx` et `PlatMotion.tsx` supprimés (code mort) → Lenis n'est plus chargé sur la plateforme, **First Load 181 → 170 kB**.
- **fix white-label trouvé en vérifiant** : `openGraph.url` héritait de `https://prestiapp.fr` (la landing Presti) → un partage de la plateforme d'un artisan pointait sur Presti. Écrasé par l'URL de la plateforme.
- build : OK · typecheck : OK · déployé : f3f4f24
- preuve : **15/15 PASS en prod** (`scripts/plateforme-e2e.mjs`, désormais test permanent §15) + captures desktop/mobile. Reste « presti » uniquement dans le domaine d'hébergement (exception documentée, disparaît avec un domaine perso).
- dette notée : `plat.css` contient encore les styles de l'ancienne page marketing (non utilisés) → à élaguer (budget §13).
- suivant : [B1-3] streaming SSE de la réponse IA (§A2) puis [B2] cartes riches + panneau de contrôle IA (§A3/A4).

## [B1-3] Streaming SSE de la réponse IA (§A2) — 22:54 → 23:06 (12 min) — ✅ terminé
- fait : `generateConversationReply` accepte un callback `onDelta` (via `client.messages.stream`) — les blocs de raisonnement ne sont JAMAIS transmis au prospect. Nouvelle route `POST /api/conversation/stream` avec **les mêmes garde-fous** que la route classique (jeton secret, honeypot, anti-flood 6/5 min, plafond 60 tours, crédits, mode manuel, mode pause) ; erreurs en JSON *avant* le flux, puis SSE (`no-transform`, `X-Accel-Buffering: no`). Client : lecture du flux, bulle qui se remplit, bulle vide retirée si l'IA n'a rien produit. La route non-streamée reste le repli.
- build : OK · typecheck : OK · déployé : 5c39059
- preuve : **7/7 PASS en prod** — content-type `text/event-stream`, **6 fragments** (donc pas un bloc unique), **1er fragment à 2,5 s** au lieu d'attendre toute la génération, et la réponse diffusée est exactement celle persistée en base.
- limite honnête : le tout 1er message passe encore par `/api/leads` (non streamé) — à basculer quand le devis auto arrivera (B2).
- suivant : [B2] cartes riches dans le fil (devis / facture / RDV) + panneau de contrôle IA `plateforme_config` (§A3/A4).

## [B2-1] Panneau de contrôle IA — socle serveur (§A4) — 23:00 → 23:20 (20 min) — ✅ terminé
- fait : table `plateforme_config` (mig **0032**, RLS stricte par artisan) — mode de réponse, modèle, plage horaire, devis/facture auto, ton, périmètre de ce que l'IA peut/ne peut pas dire, mots d'escalade, plafond de messages. `lib/plateformeConfig` décide **côté serveur** ; la route de streaming applique mode + escalade + plafond + plage, et le ton alimente la persona.
- **règle de non-régression tenue** : un artisan SANS ligne de config garde exactement son comportement actuel (dérivé de `reponse_auto`). Vérifié explicitement.
- **bug trouvé par le test** : `dansLaPlage()` lisait `getHours()` — or le serveur tourne en **UTC**. Une plage « 8h–18h » réglée par l'artisan aurait été décalée de 1 à 2 h selon la saison. Corrigé : lecture de l'heure **Europe/Paris**.
- build : OK · typecheck : OK · déployé : 4c45696
- preuve : **7/7 PASS en prod** (`scripts/plateforme-config-e2e.mjs`, test permanent) — non-régression, manuelle, assistée, escalade (« fuite » coupe l'IA + alerte artisan), plafond, plage horaire, et RLS (un anonyme ne lit aucune config).
- deux erreurs de MON test, corrigées (pas le produit) : l'upsert PostgREST *remplace* la ligne (colonnes omises → défaut) ; et 6 messages sur le même fil déclenchaient l'anti-flood.
- suivant : [B2-2] l'écran « Ma plateforme → Intelligence » dans la console, puis [B2-3] les cartes riches (devis / facture / RDV) dans le fil.

## [B2-2] Écran « Ma plateforme → Intelligence » (§A4) — 23:11 → 23:30 (19 min) — ✅ terminé
- fait : entrée de navigation **Ma plateforme** + page `/plateforme`. Le lien de conversation (copier / ouvrir) et TOUS les réglages : mode de réponse (automatique / assistée / manuelle, en cartes explicites), modèle, ton, plage horaire (heure française), devis auto (jamais / brouillon / envoi sous seuil + seuil €), facture auto, mots d'escalade éditables, reprise humaine après N réponses, nom et message d'accueil de l'assistant.
- ergonomie : sans configuration existante, l'écran **part du comportement actuel** de l'artisan (aucune surprise au premier enregistrement).
- build : OK · typecheck : OK · déployé : 025b501
- preuve : **10/10 PASS en prod** (`scripts/plateforme-intelligence-e2e.mjs`, test permanent) — affichage, réglage, enregistrement, persistance en base des 5 champs, et reprise correcte après rechargement. Capture : `b22-intelligence.png`.
- suivant : [B2-3] cartes riches dans le fil (devis / facture / RDV / récapitulatif éditable) — §A3.

## [B2-3] Carte Devis dans la conversation (§A3) — 23:17 → 23:32 (15 min) — ✅ terminé
- fait : le devis n'est plus « promis », il est **posé dans le fil**. Mig **0033** : `devis.lead_id` (le devis auto rattache désormais sa conversation) + `accepte_le` / `accepte_ip` / `accepte_canal`. `/api/conversation` renvoie le devis du fil ; nouvelle route `/api/conversation/devis` (Accepter / Demander une modification). Carte rendue dans le chat : numéro, montant TTC, 3 lignes, boutons, mention d'horodatage.
- **confidentialité** : un devis en **brouillon n'est JAMAIS exposé** au client — il ne voit que ce que l'artisan a envoyé. Testé explicitement.
- **valeur probante** : acceptation horodatée + IP + canal journalisés, trace écrite dans le fil, lead passé en « gagné », alerte à l'artisan. **Idempotent** : ré-accepter ne modifie pas l'horodatage (la preuve est figée).
- build : OK · typecheck : OK · déployé : 0d2536b
- preuve : **13/13 PASS en prod** (`scripts/devis-conversation-e2e.mjs`, test permanent). Capture : `b23-carte-devis.png`.
- **⇒ Sortie attendue du bloc B2 (« un devis naît d'une conversation ») : atteinte.**
- suivant : [B3] comptes clients (§6) + suppression granulaire (§C3).
