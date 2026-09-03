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

## [B3-1] Suppression granulaire (§C3) — 23:23 → 23:40 (17 min) — ✅ terminé
- fait : `/api/donnees` — **réinitialiser le site** (textes + composition, images gardées), **supprimer le site** (dépublie + efface contenu et fichiers du bucket), **supprimer la plateforme** (réglages effacés, conversations gardées), **anonymiser une conversation** (droit à l'effacement). Interface dans la zone « Données & suppressions » de /profil.
- garde-fous : **récapitulatif préalable** (ce qui disparaît / ce qui est conservé) + **confirmation par saisie** ; les **devis envoyés et factures émises ne sont jamais supprimables** (archivés, expliqué à l'utilisateur au lieu d'un refus sec) ; l'anonymisation casse les données personnelles **sans casser la chaîne comptable**.
- build : OK · typecheck : OK · déployé : 78ad8be
- preuve : **19/19 PASS en prod** (`scripts/suppressions-e2e.mjs`, test permanent) — dont les deux points capitaux : **le compte Presti reste intact** après suppression du site, et **le devis envoyé survit** à l'anonymisation de la conversation. Refus sans confirmation (400) et refus sur une conversation d'autrui (404) également couverts.
- reste de §C3 pour plus tard : déconnexion d'un canal (les canaux arrivent en B5), délai de grâce de 30 j + export ZIP sur la suppression de compte.
- suivant : [B3-2] comptes clients de la plateforme (§6) — lien magique, espace client, RGPD.

## [B3-2] Comptes clients de la plateforme (§6) — 23:29 → 23:47 (18 min) — ✅ terminé
- **choix d'architecture** : les comptes clients vivent **hors de `auth.users`**. Les y mettre aurait mélangé clients et artisans — un client se connectant aurait pu atterrir dans la console (voire créer un compte artisan). Session maison à la place.
- fait : mig **0034** — `clients_plateforme` (scopé `(artisan_id, email)`), `clients_liens` (magiques, usage unique, 20 min), `clients_sessions` (révocables), `leads.client_plateforme_id`. `lib/clientAuth` + route `/api/p/auth` (demande / vérifier / déconnexion / session). Bloc « Retrouver mes demandes » dans la colonne du chat ; le lien magique arrive **à la marque de l'artisan**.
- sécurité §D4 tenue et **prouvée** : cookie **httpOnly + Secure + SameSite** (aucun jeton en localStorage) · la base ne stocke que l'**empreinte** des jetons · **rate-limit** par IP et par email · **réponse identique** que le compte existe ou non (aucune énumération) · lien à **usage unique** · lien **expiré refusé**.
- build : OK · typecheck : OK · déployé : 78d8508
- preuve : **10/10 PASS en prod** (`scripts/comptes-clients-e2e.mjs`, test permanent). Le test central de §16.2 passe : **un cookie copié AVANT la déconnexion est refusé APRÈS** — la révocation est réellement serveur. Cloisonnement vérifié : même email chez 2 artisans = 2 comptes étanches. RLS : les sessions ne fuient pas.
- reste de §6 pour plus tard : l'espace client `/p/[slug]/compte` (ses devis/factures/documents, modification de ses infos, suppression de son compte) et le rattachement d'un fil anonyme au compte après connexion.
- suivant : [B4] menu profil + page Paramètres à onglets (§C1/C2).

## [B4] Menu de profil + Paramètres à onglets (§C1/§C2) — 23:47 → 00:12 (25 min) — ✅ terminé
- **§C1** : le pied de sidebar devient un vrai menu de compte (nom, email, formule · crédits, puis Paramètres / Ma page / Abonnement / Ma plateforme / Sécurité / Entreprise & légal, puis Se déconnecter).
- **§C2** : `/parametres` à onglets. **Choix assumé et signalé** : on n'a PAS rasé `profil/page.tsx` qui fonctionne (règle « corrections incrémentales »). La page porte les sections qui n'existaient nulle part, et renvoie vers les écrans en place pour le reste.
  - **Entreprise & légal** : SIRET, assujettissement TVA + numéro (mig **0035**), IBAN, assurance décennale — mentions obligatoires des devis/factures et socle des données exigées par §10.
  - **Sécurité** : changer son mot de passe, et **fermer réellement ses autres sessions** (révocation serveur).
  - **Données & confidentialité** : **export complet JSON** (`/api/donnees/export`) + accès aux suppressions granulaires.
- **bug attrapé sur ma propre capture** : le capteur de clic du menu était un `<button>` → il héritait de `button{background:var(--green)}` et, en `position:fixed inset:0`, **repeignait toute la sidebar en orange**. Passé en `<div>` transparent. Corrigé et re-vérifié.
- build : OK · typecheck : OK · déployé : e32e5c9
- preuve : **8/8 PASS en prod** (`scripts/parametres-e2e.mjs`, test permanent) + captures `b4-menu.png` / `b4-parametres.png`.
- suivant : [B5] messagerie console — retirer l'automatique de /messages (l'IA vit dans la plateforme) et connecter les canaux (§4).

## [B5-1] La boîte de réception n'est plus l'endroit de l'IA (§4/B1) — 00:12 → 00:28 (16 min) — ✅ terminé
- fait : `/messages` perd le **sélecteur de modèle** ; il ne reste qu'une aide à la rédaction **explicitement déclenchée** (« Proposer une réponse ») qui remplit un brouillon relu par l'artisan — jamais d'envoi automatique. Le modèle vient désormais de `plateforme_config` (Ma plateforme → Intelligence). La **mise en pause** rejoint elle aussi Ma plateforme : tout le comportement de l'assistant au même endroit ; `/profil` renvoie vers cet écran.
- build : OK · typecheck : OK · déployé : a855514
- preuve : **5/5 PASS en prod** (`scripts/messages-deauto-e2e.mjs`, test permanent).

## [B5-2] Connexion des canaux (§B2) — ⛔ ARRÊT PROTOCOLAIRE (§0.3, cas 3 : accès externe manquant)
- Gmail/Outlook (OAuth Google/Microsoft) et WhatsApp/Instagram/Messenger (Meta) exigent des **applications OAuth déclarées** (Google Cloud Console, Meta for Developers) avec écran de consentement, domaines vérifiés et secrets — **seul Benj peut les créer**. Idem SMS (compte Twilio/Brevo facturé).
- Décision : **ne pas simuler** un bouton « Connecter » qui ne connecte rien (ce serait exactement le vibecoding qu'on s'interdit). Rien n'est livré à moitié ici.
- Ce qu'il me faut pour débloquer : (a) un projet Google Cloud + identifiants OAuth (scopes `gmail.readonly` + `gmail.send`) ; ou (b) l'accord pour la voie **IMAP/SMTP** universelle — qui, elle, ne dépend d'aucun tiers mais impose de stocker des identifiants email : je devrai alors ajouter une **clé de chiffrement applicative** (AES-GCM) en variable d'environnement, jamais en clair en base.
- Les autres blocs continuent sans dépendre de celui-ci.

## [B5-2] Canaux email IMAP/SMTP (§B2) — 01:05 → 03:10 (2 h 05) — ✅ terminé
- **Débloqué par Benj** : voie **B — IMAP/SMTP**. Elle ne dépend d'aucune application OAuth tierce et marche avec n'importe quel hébergeur (OVH, Gmail, Orange, Free, SFR, La Poste). En contrepartie il faut stocker des identifiants email : d'où le chiffrement ci-dessous, non négociable.
- **Chiffrement** (`lib/secretBox.ts`) : AES-256-GCM, clé de 32 octets **uniquement** en variable d'environnement (`CANAUX_KEY`, générée puis posée sur Vercel en `encrypted` — jamais affichée, jamais dans le dépôt, jamais dans ce journal). Sans la clé, la ligne en base est inexploitable ; une ligne modifiée en base ne s'ouvre plus (intégrité GCM).
- **Connexion** (`/api/canaux`) : réglages devinés par fournisseur (l'artisan ne saisit qu'adresse + mot de passe), **connexion IMAP réellement testée avant enregistrement** — jamais de canal fantôme qui échouerait en silence —, refus d'enregistrer si le chiffrement est indisponible, et le GET ne renvoie **jamais** le secret. Message d'erreur explicite pour le piège Gmail/Outlook (« mot de passe d'application »).
- **Relève** (`lib/mailLite.ts` + `lib/releveCanal.ts` + `/api/canaux/relever`) : les emails reçus deviennent de vraies demandes dans la boîte de réception, à côté de celles de la plateforme. Parseur MIME écrit à la main (objet RFC 2047, quoted-printable/base64, multipart texte+HTML, citation du message précédent retirée) plutôt qu'une grosse dépendance : on n'affiche pas l'email, on en extrait une demande. Trois garde-fous : expéditeurs automatiques ignorés, emails que l'artisan s'envoie à lui-même ignorés, jamais deux fois le même (Message-ID → `messages.externe_id`). Première relève plafonnée à 7 jours et 40 messages.
- **Cadence** : Vercel est en offre **Hobby** → un seul passage automatique par jour (7 h). Compensé par une relève **à l'ouverture des Messages** (au plus toutes les 3 min) et un bouton « Relever maintenant ».
- build : OK · typecheck : OK · déployés : 9695d3c, puis relève, puis correctif visuel.
- **preuves en prod** :
  - `scripts/canaux-e2e.mjs` → **14/14** : aucune colonne de la ligne ne contient le mot de passe en clair, la colonne `secret` est bien un coffre `v1.*`, clé fausse ⇒ rien, ligne bidouillée ⇒ refus, API 401 sans jeton, aucun `select()` ne demande `secret`.
  - `scripts/maillite-e2e.mjs` → **14/14**. **Il a attrapé deux vrais bugs avant le déploiement** : le `split()` du multipart avait un groupe capturant (undefined injecté dans le tableau → plantage sur tout email multipart), et les guillemets du nom d'expéditeur survivaient (`Marie Dupont"`).
  - `scripts/canaux-visuel.mjs` → **9/9**, compte de test créé puis supprimé (zéro donnée de démo).
- **Attrapé à l'œil, pas par les assertions** : le bouton « Connecter ma boîte » se posait **par-dessus** le lien « Mon serveur n'est pas reconnu » — deux `<button>` voisins sont inline-block, donc sur la même ligne. Corrigé (`display:block`), et le test visuel vérifie désormais explicitement que les deux cadres ne se recouvrent pas. Même famille que le scrim orange de B4 : ce sont les captures qui trouvent ça, pas les tests d'API.
- **Non fait, assumé** : WhatsApp/Instagram/Messenger (application déclarée chez Meta) et SMS (compte facturé) — l'écran le dit à l'artisan en clair au lieu de faire semblant.
- suivant : [B6] site sur-mesure (§7).

## [B6-1] Site vitrine — réglages fins (§7/E1) — 03:20 → 05:40 (2 h 20) — ✅ terminé
- **Non-régression par construction**, et c'est le point important : `styleToCss` n'émet QUE ce qui s'écarte du défaut. Un artisan qui n'ouvre jamais le mode avancé reçoit un objet de style vide → exactement le site qu'il avait. Prouvé en prod : aucune variable inline, aucun `data-*`, largeur 1180 px, traits 1 px, Fraunces.
- **Ce qui est réglable** : 8 couples de polices (`preload:false` → seule celle du couple choisi est téléchargée), taille et échelle du texte, interlettrage des titres, couleur secondaire, fond, rayon des angles, épaisseur des filets, style de boutons, hauteur des sections, largeur du contenu, texture (grain/papier/bruit + intensité), intensité d'animation.
- **8 presets métier** — c'est eux qui rendent la personnalisation utilisable par quelqu'un qui n'a pas d'avis sur la typographie. Un clic pose ambiance + couleur + polices + formes, puis l'artisan ajuste.
- **Garde-fou de lisibilité** (`lib/contrast.ts`, WCAG 2.1) : un fond illisible est signalé avec le rapport chiffré, au lieu de laisser publier un site qu'on ne peut pas lire.
- **Sécurité** : tout ce qui vient de la base est borné et validé (`resolveStyle`). Une couleur non hexadécimale est rejetée — pas d'injection CSS par le champ jsonb.
- **Repli digne sans photo** (§E3, repéré sur ma propre capture) : un artisan sans photo avait 500 px de crème vide au-dessus de son nom. Interdit de combler avec une banque d'images → composition typographique, titre plus grand, filet d'accent, et les prestations réelles en bande.
- build : OK · typecheck : OK · migration 0037 appliquée.
- preuve : `scripts/site-style-e2e.mjs` → **33/33 en prod** (non-régression, bornes, contraste, presets, rendu réel avant/après, mouvement coupé).
- **Erreur de méthode corrigée** : mon sondage de déploiement validait « le dernier déploiement », qui juste après un push est celui d'AVANT, déjà READY. J'ai conclu à tort que trois assertions échouaient sur du code qui n'était pas en ligne. `scripts/attendre-deploiement.mjs` attend désormais le SHA de HEAD.

## [B6-2] Mouvement et honnêteté du contenu (§7/E2) — 05:40 → 06:50 (1 h 10) — ✅ terminé
- Skills du repo lus et appliqués (`animate`, `animation-vocabulary`) : courbes et durées prises dans leurs tables, `--se` existant étendu (`--se-io`) plutôt que forké, gating `prefers-reduced-motion` livré avec le mouvement.
- **Visionneuse de galerie** : elle n'existait pas — les photos de chantier, le contenu le plus convaincant du site, restaient en vignette 300 px. Transition d'élément partagé (View Transitions) pour que l'agrandissement soit visiblement la MÊME image, repli en fondu ailleurs. Accessible d'emblée : rôle dialog, focus piégé, Échap, focus rendu à la vignette, flèches, fond verrouillé.
- **Survol des prestations** : 160 ms, filet + fond à 4 %. Un survol se voit des dizaines de fois par visite ⇒ imperceptible ou rien.
- **Révélation par masque** des titres, réservée au niveau « cinématique » choisi par l'artisan.
- **Transition entre pages** site → plateforme (`@view-transition`) : le passage ne clignote plus.
- **Pas de compteur animé** : les seuls nombres réels sont le nombre de prestations (3 à 8). Compter de 0 à 5 n'explique rien. Zéro ligne écrite, assumé.
- **ANTI-FABRICATION — le vrai problème trouvé dans ce bloc** : la bande de réassurance affirmait « Travail assuré », « Devis gratuit », « Sérieux engagé sur chaque chantier ». Des faits sur l'entreprise de l'artisan que **personne n'avait déclarés** — « assuré » sous-entend une assurance décennale. Elle ne contient plus que des données saisies par l'artisan (zone, disponibilités, téléphone, prestations) ou tenues par le produit (réponse rapide, si la plateforme est active), et disparaît s'il en reste moins de deux.
- preuve : `scripts/site-motion-e2e.mjs` → **21/21 en prod**, dont les quatre mentions inventées vérifiées absentes.
- suivant : [B6-3] qualité d'image (§E3) — pipeline 5 tailles AVIF/WebP, EXIF (géolocalisation !) retirés, détection de flou, guide de prise de vue.

## [B6-3] Qualité et sécurité des photos (§7/E3) — 06:50 → 08:20 (1 h 30) — ✅ terminé
- **Le plafond de qualité n'était pas le code, c'était l'import** : les réalisations étaient stockées en **1100 px JPEG q0.72**, alors que la première sert de fond de hero **plein écran** avec un `scale(1.08)` par-dessus. C'était de l'agrandissement, donc du flou, quel que soit le soin apporté au reste du site.
- `preparerPhoto()` : master **WebP 2400 px** pour la photo principale (1800 galerie, 1600 portrait, 1400 détail), q0.82 — visuellement transparent pour la moitié du poids d'un JPEG équivalent ; `next/image` en dérive AVIF/WebP et les tailles servies. Vignette floue (< 3 Ko) générée à l'import → plus de trou blanc au chargement. L'import avant/après est aligné sur le même traitement.
- **Contrôle qualité avant publication** (`lib/imageQualite.ts`) : netteté par variance du laplacien, exposition, contraste, résolution — tout est mesuré **dans le navigateur**, aucune photo n'est envoyée ailleurs pour être analysée. On DIT ce qui ne va pas, en langage d'artisan (« refaites-la en calant le téléphone »), au lieu de dégrader le site en silence. Un seul cas bloque : une photo si petite qu'elle sera floue partout.
- **Six conseils de prise de vue** dépliables à l'import — §E3 dit que la source est le vrai facteur, pas le pipeline.
- **Vie privée — vérifié, pas réécrit** : le ré-encodage par canvas retirait déjà l'EXIF. Plutôt que de refaire, j'ai construit la preuve. `scripts/photos-e2e.mjs` fabrique un **vrai JPEG géolocalisé** (IFD GPS valide, 47°13′N 1°33′W), le passe par le **parcours réel** d'import, puis télécharge le fichier publié et vérifie qu'il ne contient plus ni segment EXIF, ni marqueur GPS, ni les coordonnées elles-mêmes. Un artisan qui publie la photo d'un chantier ne publie pas l'adresse de son client.
- preuve : **15/15 en prod**. Le premier échec venait de mon test (il visait le mauvais champ de fichier parmi logo / portfolio / avant-après), pas du produit — corrigé en ciblant le seul champ `multiple`, et le test dit maintenant ce qui s'est passé au lieu d'expirer en silence.
- suivant : [B6-4] reste de la v3 à vérifier (§E4) : indexation, sitemap, JSON-LD, domaine perso, budgets de perf, axe-core.

## [B6-4] Accessibilité, perf, indexation (§7/E4 + §12-14) — 08:20 → 10:10 (1 h 50) — ✅ terminé
- **axe-core branché** (`scripts/a11y-e2e.mjs`, WCAG 2.1 AA) sur le site, la visionneuse ouverte et la plateforme, plus un parcours au clavier seul. Échoue sur les infractions graves, signale les mineures sans faire tomber le test.
- **Il a trouvé un motif systémique, pas des défauts isolés** : l'accent choisi par l'artisan et les gris les plus clairs servaient de couleur de TEXTE en 11-14 px, où ils tombent entre 2,1:1 et 4,4:1. Trois corrections de fond :
  1. `lisibleSur()` calcule au rendu une variante de l'accent qui atteint 4,6:1 en gardant sa teinte — `--pc-ink` sur fond clair, `--pc-ink-d` sur les panneaux sombres (ma première passe avait oublié les panneaux sombres, l'audit l'a rattrapé). Aucune valeur codée en dur ne peut convenir quand la couleur appartient à l'artisan.
  2. `--pf` redevient une couleur de **filet** : les quatre textes qui l'utilisaient passent en `--pm`. Dont la **mention de consentement** — une information légale doit être lisible.
  3. `--pm` recalculé sur les 7 thèmes contre `--pb`, `--ps` **et** `--ps2`. Ma première passe ne testait que le fond de page et laissait 4,2:1 sur les cartes ; ma deuxième avait une boucle qui ne s'exécutait jamais et n'a rien changé du tout — le test l'a dit.
- **Le bug le plus ancien** : `.site a{color:inherit}` (0,1,1) l'emportait sur `.site-nav-cta` (0,1,0). Le bouton « Demander un devis » de la barre de navigation héritait du gris de `.site-links` : gris foncé sur pastille presque noire, **2:1**. Illisible depuis toujours, invisible pour un test d'API, visible en une seconde pour axe.
- **Méthode** : mon audit mesurait pendant les fondus et rapportait des couleurs mélangées (un titre à mi-transition sort à 1,3:1 alors qu'il est parfaitement lisible une fois posé). Il tourne maintenant en `reducedMotion`, et remonte pour chaque nœud le sélecteur, les deux couleurs et le rapport — « contraste insuffisant » sans dire où ne sert à rien.
- **Budget de perf en CI** (`.github/workflows/qualite.yml` + `scripts/budget-perf.mjs`) : typage, build et poids à chaque PR. Mesure le poids **réellement transféré** (gzip) — ma première version comptait les octets bruts et annonçait 372 Ko pour 107 Ko réels. Site **107 Ko**, plateforme **108 Ko**, budget 135.
- **Indexation vérifiée, pas refaite** (`scripts/seo-e2e.mjs`, 26/26) : site non publié ⇒ hors index et hors sitemap ; référencement coupé par l'artisan ⇒ noindex + sortie du sitemap ; canonique ; JSON-LD LocalBusiness valide et **sans donnée inventée** (ni avis ni note) ; **white-label absolu** — le mot « Presti » n'apparaît nulle part, ni sur le site ni sur la plateforme.
- Corrigé en passant : `robots.txt` ne connaissait pas `/messages`, `/profil`, `/parametres`, `/plateforme`, `/reset-password` (ajoutés depuis sa rédaction) ; et la vignette large de la galerie gardait un ratio 4/3 sur double largeur, deux fois plus haute que ses voisines, creusant un trou dans la grille.
- **§7 (CHANTIER E) est terminé** : E1 réglages fins, E2 mouvement, E3 qualité d'image, E4 reste de la v3.
- suivant : [B7] §8 — socle de prix réels (tarifs de l'artisan d'abord, aucun mail à envoyer).

## [B7] Chiffrage sur des prix réels (§8) — 10:10 → 12:00 (1 h 50) — ✅ terminé
- **Le défaut trouvé en ouvrant le dossier** : le prompt du moteur de devis annonçait à l'IA « la bibliothèque de postes de **CET** artisan », alors que `postes_types` est une table **générique par métier**, partagée par tous. L'IA chiffrait sur des moyennes nationales en croyant utiliser ses tarifs. Le devis avait l'air sourcé et ne l'était pas — exactement ce que §8 veut empêcher.
- **`lib/prix/`** — l'abstraction du §F1. Deux sources aujourd'hui : `artisan` (ses prix réels) et `marche` (les ordres de grandeur, présentés comme tels et jamais comme les siens). Le jour où une licence de base d'ouvrages arrive, on branche une implémentation de plus sans toucher au moteur de devis.
- **Pas de scraping de grossistes — décision, pas oubli** : les prix pro ne sont pas publics (chaque artisan a son net négocié, donc un prix tarif serait faux pour tout le monde), et l'extraction répétée et systématique d'une base tierce est illicite. C'est écrit dans le code pour que personne ne « corrige » ça plus tard par méconnaissance.
- **§F4 appliqué et vérifié** : chaque ligne porte sa provenance, et cette provenance est **validée côté serveur** contre le catalogue réellement transmis. Un libellé fabriqué par le modèle (« tarifs Point.P », « Batiprix mars 2026 ») retombe sur « estimation ». On ne fait pas confiance au modèle pour une mention qui engage l'artisan devant son client.
- **Import CSV délibérément tolérant** : un artisan reçoit un fichier de son fournisseur, pas un export propre. Points-virgules ou virgules, décimales françaises, « 1 234,50 € », en-tête caché sous une ligne de titre, colonnes nommées Libellé / Article / Désignation. **Aperçu de ce qui a été compris avant d'enregistrer** — personne n'écrase 400 prix à l'aveugle — et le ré-import met à jour au lieu d'empiler des doublons (l'artisan réimporte son tarif chaque année).
- Migration 0038 (`prix_artisan` + `devis_lignes.source_prix`), puis **0039 correctif** : l'index unique de 0038 portait sur `lower(designation)` ; un index fonctionnel ne peut pas servir de cible à `on conflict`, donc le ré-import aurait échoué. Repassé sur colonnes brutes avec `NULLS NOT DISTINCT`.
- Écran **« Mes tarifs »** dans la console, et `/tarifs` ajouté au `robots.txt`.
- **preuves en prod** :
  - `scripts/tarifs-e2e.mjs` → **35/35** (filtre de provenance, lecture des prix français, CSV réaliste, ré-import sans doublon).
  - `scripts/devis-source-e2e.mjs` → **7/7**, et c'est celui qui compte : un **vrai appel au modèle en production**. Le prix volontairement atypique de l'artisan (813,50 €) **ressort tel quel**, étiqueté « vos tarifs · Cedeo · 12/02/2026 », et aucune ligne ne cite un fournisseur à tort.
- **Non fait, assumé** : l'API BDM de l'INSEE (indices de révision) et la lecture OCR des factures fournisseurs — utiles, mais secondaires tant que l'artisan peut importer son tarif en un fichier. Aucun mail de licence envoyé, conformément à ta consigne.
- suivant : [B8] §9 — inventaire et achats (Studio + Signature).

## [B8] Inventaire & achats (§9) — 12:00 → 13:30 (1 h 30) — ✅ terminé
- **Fonctionnalité Studio et Signature**, avec le verrou **côté serveur** : masquer l'entrée de menu ne protège rien, l'URL de l'API reste appelable. Vérifié en prod : une offre Essentiel reçoit 403 en lecture **et** en écriture.
- **Pas de table `chantiers`** — décision assumée : le chantier chez Presti, c'est le **devis accepté**. Inventer une entité de plus obligerait l'artisan à ressaisir ce qu'il a déjà saisi.
- `appliquer_mouvement()` en SQL : le mouvement **et** le stock sont écrits dans la même transaction. Une erreur entre les deux laisserait un inventaire faux — et un inventaire faux ne sert plus à rien. C'est exactement comme ça que ces outils meurent chez les artisans.
- **Stock par lieu** (atelier / camion) : « il m'en reste combien » n'a de sens que par endroit. Le seuil d'alerte, lui, se déclenche sur le **total**.
- Le **comptage POSE** la valeur au lieu de l'ajouter — la confusion classique des outils de stock, vérifiée par un test dédié.
- **Scan de code-barres** avec le détecteur natif du navigateur. Sur Safari iPhone, qui ne l'a pas, on le **dit** et on propose la saisie du code au lieu de faire semblant. Un artisan ne saisira jamais son stock au clavier : c'est la seule raison pour laquelle ces logiciels échouent chez lui.
- L'écran s'ouvre sur **« À racheter »**, pas sur la liste complète : c'est la seule chose qu'un artisan vient vérifier avant de partir.
- migration 0040 · build : OK · typecheck : OK.
- preuve : `scripts/inventaire-e2e.mjs` → **23/23 en prod**, dont le cloisonnement entre artisans (un autre Studio ne voit rien et ne peut pas bouger le stock d'autrui).
- **Deux bugs, tous les deux dans MON test** : un mouvement de trop attendu, et surtout — les trois comptes partageaient le **même contexte de navigateur**, donc le même `localStorage`, donc la même session : le test se serait menti à lui-même sur le cloisonnement. Un contexte par compte désormais.
- **Non fait** : liste d'achat agrégée, OCR de facture, coût de revient par chantier. Le socle (matériaux, stock, mouvements, listes) est en place pour les recevoir.
- suivant : [B9] §10 — facturation électronique (Factur-X, archivage).

## [B9] Facturation électronique (§10) — 13:30 → 15:20 (1 h 50) — ✅ terminé (avec un périmètre explicite)
- **Échéance de la cible de Presti : 01/09/2027** (émission + e-reporting pour les TPE). On collecte dès maintenant ce qui sera exigé : une donnée manquante se rattrape mal rétroactivement — personne ne rappellera 300 clients pour leur demander leur SIREN.
- **Données** (migration 0041) : SIREN du client, pays des deux parties, **adresse de chantier distincte de l'adresse de facturation**, catégorie d'opération (**mixte par défaut** — un artisan facture presque toujours fourniture ET pose), devise, motif d'exonération codifié, TVA sur les débits.
- **La mention de franchise n'est plus codée en dur.** La TVA du CGI a été recodifiée vers le **CIBS** le 01/09/2026, avec tolérance jusqu'au 31/12/2027 : la mention se calcule à la date du document et selon le choix de l'artisan, et **passé la tolérance, la référence abrogée n'est plus servie même sur demande**. Au passage, l'écran Paramètres annonçait encore « art. 293 B du CGI » alors que le PDF imprimait déjà le CIBS — incohérence corrigée, avec un aperçu exact de ce qui sera imprimé.
- **SIREN vérifié par clé de Luhn** à la saisie, pas seulement compté : un rejet par la plateforme au moment de l'émission arriverait trop tard.
- **Une facture émise est scellée** : empreinte SHA-256 posée à l'émission, et **deux déclencheurs en base** refusent toute modification de montant, numéro, client ou date, ainsi que la suppression (conservation portée de 6 à **10 ans** par la loi 2026-534). Le verrou est **en base et pas seulement dans le code** : il tient même si une route oublie un jour de le vérifier. Ce qui doit rester modifiable — le passage à « payée » — l'est toujours.
- **XML CII profil EN 16931** (`lib/facturx.ts`) : c'est ce que lisent l'administration et la plateforme agréée. Deux règles font tout le fichier — **aucune donnée inventée** (un SIRET absent produit une balise *absente*, pas une balise vide) et **échappement XML systématique** (un « & » dans un nom d'entreprise casserait le document entier). L'adresse de chantier devient le lieu de livraison au sens de la norme. Unité inconnue ⇒ C62, jamais un code CEFACT inventé.
- **Ce que je ne prétends PAS avoir fait**, et c'est écrit dans le fichier lui-même : l'XML n'a pas été passé au Schematron officiel EN 16931 + CIUS France, ni embarqué dans un PDF/A-3 validé par VeraPDF. Tant que ces deux vérifications manquent, c'est un XML conforme à la **structure**, pas une facture Factur-X **certifiée**. Le raccordement à une plateforme agréée et l'e-reporting B2C restent à faire (échéance printemps 2027).
- **preuves** : `scripts/facturation-e2e.mjs` → **34/34** · `scripts/facturx-e2e.mjs` → **30/30** (XML validé par un analyseur strict, montants relus, caractères spéciaux, absence de données inventées).
- Deux corrections de méthode : `node:crypto` dans un module désormais importé côté client cassait la compilation (passé à Web Crypto), et mon analyseur de test convertissait « 962.00 » en nombre — en XML tout est texte, sinon on ne compare plus ce que le document contient réellement.
- suivant : [B10] §11-15 transverses, puis [B11] §16 audit final.

## [B10] Sécurité (§11) — 15:20 → 17:10 (1 h 50) — ✅ terminé
- **Isolation entre artisans — le test qui compte** (`scripts/rls-e2e.mjs`, **32/32**). Presti héberge les clients, les devis, les prix négociés et les identifiants email de chaque artisan : une seule RLS mal posée et l'un lit le fichier clients de l'autre. Méthode : **jamais la clé de service** (qui contourne tout par conception), mais une vraie connexion d'artisan avec la clé publique — exactement ce dont dispose un navigateur. **14 tables** vérifiées en lecture, 6 tentatives d'écriture chez le voisin, puis contrôle que rien n'a bougé. Résultat : aucune fuite, aucune écriture.
- **Une vraie faille trouvée par ce test** : après une déconnexion globale, **le jeton d'accès déjà émis continuait d'ouvrir le compte**. C'est le comportement normal d'un JWT autoporteur — `signOut` révoque le jeton de rafraîchissement, pas celui d'accès, valable une heure. Concrètement : un jeton copié depuis un poste partagé restait bon une heure après la déconnexion demandée en urgence. Le bouton « Fermer mes autres sessions » ne fermait rien tout de suite.
  - Correction : `artisans.sessions_invalides_avant` (migration 0042) + `getUserRevocable()` qui **remplace l'appel** `supabaseAdmin.auth.getUser()` dans les **28 routes**. Cette forme est un choix : les routes écrivent leur contrôle chacune à leur manière (message, code, forme du retour) ; réécrire 28 variantes, c'est 28 occasions de casser quelque chose. En remplaçant l'appel, la garde déjà présente dans chaque route fait le travail telle quelle.
  - Vérifié en prod : le **même** jeton passe avant, est refusé après, sur `/api/tarifs`, `/api/inventaire` et `/api/donnees`. Le bouton ferme désormais aussi la session courante — et son libellé le dit.
  - **Limite écrite dans le code** : ce verrou couvre les routes de Presti. Les lectures directes du navigateur vers PostgREST restent régies par la RLS et l'expiration du jeton.
- **Injection de prompt** (`scripts/injection-e2e.mjs`, **6/6 en prod**) : le texte d'un prospect arrive dans un prompt et la réponse part **au nom de l'artisan**. Cinq attaques réelles jouées contre la production — faire donner un prix ferme à 1 €, faire recracher le prompt système, **refermer le bloc de données pour reprendre la main**, obtenir les coordonnées d'autres clients, arracher une garantie 30 ans. Toutes tenues.
  - Parades : le texte du prospect est **isolé entre marqueurs** et présenté comme une donnée ; les marqueurs sont **retirés du contenu** (sinon il suffirait de les écrire pour refermer le bloc) ; et le prompt système garde l'autorité avec une règle explicitement prioritaire sur ce que demande le prospect.
- **Secrets** : audit de tout l'historique git — **aucune clé jamais committée**. `.gitignore` couvre bien les fichiers d'environnement. Les seules correspondances étaient le mot « service_role » dans des commentaires.
- §12 (indexation), §13 (perf), §14 (a11y) et §15 (tests) ont été traités en B6-4.
- suivant : [B11] §16 — audit final par des sous-agents indépendants.
