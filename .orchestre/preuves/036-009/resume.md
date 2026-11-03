## Ressources utilisées

- **Skill `reseau-neuronal`** (chargé en premier) : la méthode lire avant de produire, rien écrit dans le vault (consigne de l'hôte Oracle : lecture seule).
- **MCP `cerveau`** : `regles_pour` (« OAuth Gmail Google de l'artisan, jetons chiffrés, connexions, données client, envoi automatique, agents n8n ») n'a rendu aucune règle de plus que `.claude/rules/` ; `chercher` (« connexions OAuth Gmail jeton chiffré secretBox vérification Google CASA ») m'a donné la décision 2 du plan, les fiches `connecteurs/imap.md` (036-003) et `fiche-google.md` (036-006), et `plans/journal-v4.md` [B5-2] (« ne pas simuler un bouton Connecter qui ne marche pas ; seul Benj crée les applications OAuth »). **Ce que ça a changé** : la clé de n8n s'appelle `BOITE_CLE_N8N`, le nom déjà fixé par 036-003, au lieu d'un second nom ; Gmail est fermé dans le code tant que Benj n'a pas posé `GOOGLE_VERIFICATION_GMAIL=accordee`.
- **Prompt 6** `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md` (partie 0, § 0.4 l. 235-268 ; prompt 1, § 1.3 et § 1.7) : les neuf champs de chaque fiche, « le client branche lui-même », « chaque connecteur commence en lecture », la règle de l'expiration (« le système se tait, Connexions le dit, une alerte part, rien ne plante »). **Ce que ça a changé** : la première phase de chaque portée est en lecture seule (`gmail.readonly`, `calendar.freebusy`, `drive.file`).
- **Plan** `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md` (§ 3.1-3.3, § 4 ligne 036-009, § 5 décisions 1, 2 et 5) : deux secrets chiffrés au format v1, n8n qui déchiffre à l'exécution, échange OAuth sur Presti, jamais sur n8n, coût CASA relevé le 03/11 avec ses sources, rendez-vous jamais posé seul. **Ce que ça a changé** : deux destinataires de chiffrement distincts ; la vérification en deux temps (agenda et Drive d'abord, Gmail plus tard).
- **`supabase/migrations/0193_systeme_agents.sql:90-180`** (lecture seule) : la table `connexions`, son déclencheur et la consigne écrite pour 036-009 (« lier chaque chiffré à sa ligne par la donnée associée GCM »). **Ce que ça a changé** : la donnée associée `connexions:<id>:app|n8n`, l'id généré par l'app avant l'insertion, la naissance en `a_verifier`, l'état `active` seulement après un essai de lecture.
- **Vidéos analysées** : `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md` (l. 63, image 044 `POST /webhook/gmail-reply` ; l. 132, 167, 263 : « réserve dans l'agenda »), `plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md`, `plans/analyse-videos.md` (l. 597 « Memory / Connections / Skills ») et `docs/connaissance-videos/`. **Ce que ça a changé** : on reprend la lecture de la boîte et de l'agenda, pas la réservation seule (décision 5) ni l'agent vocal (payant, p6 § 0.2 F) ; écrit dans `gmail.md`.
- **Skill `ecc:security-review`** : la liste de contrôle (secrets en variables d'environnement, aucun secret dans les journaux ni les erreurs, validation des entrées, cookies HttpOnly, Secure et SameSite, autorisation avant toute opération sensible). **Ce que ça a changé** : le cookie d'état `__Host-` chiffré, une liste blanche des champs de la vue « Connexions », les journaux limités à `error.code`.
- **Agent `presti-audit-attaque`** (sous-agent distinct, lecture seule sur mon diff) : aucune faille critique ni haute, un défaut moyen et deux bas, **tous corrigés** (section « Revue de sécurité »).
- **Règles** `CLAUDE.md`, `.claude/rules/securite.md`, `architecture-outils.md`, `autonomie-abonnements.md`, `migration-production.md`, `.orchestre/contexte.md` : aucun compte ni application OAuth créé, aucun secret saisi, aucune migration, le drapeau reste baissé, n8n-first (l'app ne fait que l'interface et l'échange OAuth, n8n fera la relève), `peut()` partout.
- **Skill `supabase-postgres-best-practices`** : pas chargé, faute d'objet. Ce lot n'écrit aucun SQL : il lit la table de 0193, et chaque requête du magasin filtre sur `artisan_id` (contrôle statique du juge).
- **Non disponibles ou hors domaine** : pas de MCP n8n sur cet hôte, et aucun workflow n'est écrit (interdit du lot). Les skills de design et de vidéo sont hors domaine : ce lot n'a pas d'écran, « Connexions » arrive avec 036-010 et 036-011.

## Ce qui est livré (périmètre de 036-009, rien hors périmètre)

| Fichier | Rôle |
|---|---|
| `lib/connexions/chiffrement.ts` | `chiffrerPour` et `dechiffrerPour('app' \| 'n8n', …, lien)` : AES-256-GCM au format `v1.<iv>.<tag>.<données>` de `lib/secretBox.ts:21-30`, fichier **inchangé** (le juge le compare à HEAD). Deux clés : `CANAUX_KEY` pour l'app, `BOITE_CLE_N8N` pour n8n ; une clé de n8n égale à celle de l'app est refusée ; chaque chiffré est lié à sa ligne et à son destinataire par la donnée associée. |
| `lib/connexions/oauth.ts` | Portées minimales (`PORTEES`), capacité par outil pour `peut()` (`CAPACITE`), Gmail fermé sans vérification (`fournisseurOuvert`), PKCE S256, état scellé, contrôle des portées accordées (exactement celles demandées), lecture de l'id_token (émetteur, destinataire, adresse vérifiée). |
| `lib/connexions/etat.ts` | `vueConnexion` (liste blanche, sans secret), `jetonUtilisable` (rafraîchissement, expiration, ne lève jamais), `patchRetrait`. |
| `lib/connexions/routes.ts` | Le cœur de `demarrer`, `retour` et `retirer`, avec des dépendances injectées. |
| `lib/connexions/serveur.ts` | Les vraies dépendances : `actif('connexions')`, `authArtisan`, `peut`, `suspensionEnCours`, le magasin `supabaseAdmin` filtré sur `artisan_id`. |
| `app/api/connexions/google/demarrer/route.ts`, `google/retour/route.ts`, `retirer/route.ts` | Chaque méthode délègue au cœur, rien d'autre (contrôle statique). |
| `scripts/connexions-qa.mjs` | Le juge : hors ligne, faux Google, fausse base, 39 mutants. |
| `plans/011-cadrage-01-11/p6-signature/connecteurs/gmail.md` | Gmail **et Google Agenda** (même application OAuth). |
| `connecteurs/outlook.md` | Outlook, boîte et agenda (Microsoft Graph, permissions déléguées ; code Microsoft non écrit, IMAP d'ici là). |
| `connecteurs/drive-sheets.md` | Drive et Sheets (`drive.file` et le sélecteur de fichiers), OneDrive et Excel. |
| `connecteurs/messageries.md` | WhatsApp (drapeau baissé), Telegram, SMS préparé (décision 4). |
| `connecteurs/stripe-artisan.md` | Le Stripe de l'artisan en lecture : clé restreinte saisie par lui, « marquer payée » toujours une carte. |
| `connecteurs/verification-google.md` | La demande de vérification, **prête pour Benj, jamais envoyée**. |

La fiche Google de l'entreprise (avis) existe déjà : `connecteurs/fiche-google.md` (036-006), non touchée.

## Les routes et leur garde

L'ordre ne change jamais (`lib/connexions/routes.ts`) : (1) drapeau `connexions` baissé → **404**, avant toute lecture ; le juge exige que ce soit la première instruction des trois routes ; (2) session (`authArtisan`, Bearer) ; (3) offre par `peut(plan, CAPACITE[outil])`, jamais `plan === …` ; (4) le travail.

- **`POST /api/connexions/google/demarrer { fournisseur }`** : refuse un outil inconnu (400), Gmail sans vérification (409), une offre sans la capacité (403), une configuration ou une clé manquante (503). Rend seulement `{ ok, url }`. Pose le cookie `__Host-cnx_oauth` (HttpOnly, Secure, SameSite=Lax, 10 min), **chiffré**, qui contient l'uid et l'`iat` de la session, l'outil, le `state` (32 octets aléatoires), le vérificateur PKCE et l'heure limite. L'URL demande les portées minimales, `code_challenge_method=S256`, `include_granted_scopes=false`, `access_type=offline`.
- **`GET /api/connexions/google/retour?code&state`** : vérifie que le cookie est présent, intact et non échu, et que le `state` est identique (comparaison à temps constant) ; sinon refus `etat_invalide`, sans échange. Puis il relit le compte (suspension, déconnexion de partout) et l'offre pour l'uid scellé. Il échange le code avec le vérificateur PKCE et le client secret, côté serveur seulement. Les portées accordées doivent être **exactement** celles demandées : une de plus donne `portee_elargie`, une de moins `portee_refusee`. Ensuite, chiffrement pour l'app et pour n8n, insertion en `a_verifier` (ou renouvellement sur place de la connexion existante du même compte), essai de lecture, puis `active`, ou `erreur` avec `essai_lecture_echoue`. Redirection 303 vers `/dashboard?connexion=ok|refus&motif=…` ; aucun jeton dans l'URL ; cookie effacé.
- **`POST /api/connexions/retirer { id }`** : permis quelle que soit l'offre ; la ligne de **son** compte seulement (404 sinon). Révocation chez Google au mieux, puis `retiree`, les deux secrets à `null`, `retiree_le` posé. Idempotent.

## Le chiffrement

`secret_app = chiffrerPour('app', s, id)` avec `CANAUX_KEY` ; `secret_n8n = chiffrerPour('n8n', s, id)` avec `BOITE_CLE_N8N`. Les deux suivent le format v1 que 0193 exige. La donnée associée vaut `connexions:<id>:app` ou `connexions:<id>:n8n` : un chiffré recopié sur une autre ligne, ou passé de `secret_app` à `secret_n8n`, ne s'ouvre pas. n8n n'a jamais `CANAUX_KEY`, l'app ne lit jamais `secret_n8n`.

**Contrat pour n8n** (le juge le prouve avec un déchiffrement écrit à part) : AES-256-GCM, clé `BOITE_CLE_N8N` en base64, iv, étiquette et données en base64url, donnée associée `connexions:<id>:n8n`. Le texte clair est `{ refresh_token, access_token, access_expire }`.

## Expiration et retrait

- **Expiration** (`jetonUtilisable`) : Google répond `invalid_grant` → état `expiree`, **une** alerte `connexion_expiree` au bon compte, sans secret. L'écran affiche « Autorisation expirée : reconnectez-le » et le département se tait. Google injoignable, en panne ou illisible → silence, ni état changé ni alerte. Une connexion déjà expirée → silence. Un secret illisible → `erreur` et une alerte. Aucun cas ne lève d'exception.
- **Retrait** : jetons effacés par le code, puis par la base d'elle-même (`connexions_coherence`). Si une autre connexion vivante dépend du même compte Google, Presti ne révoque pas chez Google (Google retirerait toute l'autorisation) et efface seulement chez lui.

## La demande de vérification, prête pour Benj

`connecteurs/verification-google.md` contient : la recommandation (agenda et Drive d'abord, sans évaluation de sécurité, 0 € ; Gmail plus tard), chaque portée avec sa justification en français et en anglais, l'écran de consentement champ par champ, la déclaration d'usage limité, la partie Gmail restreinte avec son coût relevé le 03/11 (**500 à 6 000 dollars par an**, sources du plan ; le chiffre de 15 000 à 75 000 dollars n'est pas retenu), la vidéo de démonstration en six plans et la liste de Benj avant l'envoi. **Rien n'est envoyé, rien n'est créé.**

## Revue de sécurité (`presti-audit-attaque`, sous-agent distinct, lecture seule)

Bloqués : CSRF de connexion dans les deux sens (`state` + PKCE + cookie `__Host-`), rejeu (10 min, cookie effacé, code à usage unique), fuites (aucun jeton, vérificateur ni client secret en réponse ou en journal), IDOR au retrait, contournement du drapeau, portées élargies, redirection ouverte, confusion de clés, plantage à l'expiration.

Corrigé après la revue :
1. **Moyenne** : retirer un outil pouvait révoquer l'autorisation Google des autres outils du même compte. Corrigé : révocation seulement si aucune autre connexion vivante n'a ce compte. Mutants « retrait qui révoque malgré… » et « refus de portée qui révoque malgré… ».
2. **Basse** : rebrancher retirait l'ancienne connexion avant d'écrire la nouvelle, et une lecture en erreur rendait une liste vide. Corrigé : renouvellement **sur place**, sans fenêtre vide ; une lecture en erreur lève et arrête tout, sans révocation à l'aveugle. Mutants associés.
3. **Basse** : au retour, la suspension et la déconnexion de partout n'étaient pas relues. Corrigé : `compteValide(uid, iat)` relit `suspensionEnCours` et `sessions_invalides_avant`. Mutants associés.

Reste à confirmer par Benj sur un compte Google de test : qu'une révocation emporte bien toute l'autorisation de l'application. Le code suppose le pire.

## La sortie du juge et ses mutants

`node scripts/connexions-qa.mjs` (sortie complète : `connexions-qa.txt`, dans ce dossier) donne **vert**, code de sortie 0 :
- 17 contrôles statiques ;
- **116 cas verts, 0 rouge** sur le cœur ;
- **39 mutants sur 39 tués**, dont les sept que la tâche exige : drapeau baissé qui répond 200 (les trois routes, plus retour seul et retrait seul) ; `state` non vérifié ; jeton renvoyé au client (vérificateur au départ, jetons au retour) ; secret stocké en clair (et `secret_n8n` chiffré avec la clé de l'app, donnée associée ôtée, clés identiques acceptées) ; retrait qui garde le jeton ; jeton expiré qui fait planter (et expiration traitée comme une panne) ; portée élargie (Gmail complet, agenda complet, élargie acceptée au retour, portées héritées).

Le reste de la commande `verifier` : `npx tsc --noEmit` donne 0 erreur ; `scripts/offres-affichage-qa.mjs` est vert (code 0) ; `scripts/pilote-qa.mjs` donne 95 verts, 0 rouge.

## Préparé pour Benj, jamais fait

Créer le projet et l'application OAuth Google ; poser `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` et `BOITE_CLE_N8N` (générée par lui) ; compléter la politique de confidentialité ; coller `0185`, `0192` et `0193`, **puis** lever `connexions` ; tourner la vidéo ; envoyer la vérification ; pour Gmail, accepter la dépense puis poser `GOOGLE_VERIFICATION_GMAIL=accordee`. L'écran « Connexions » et le bouton viennent avec 036-010 et 036-011. Les routes Microsoft se brancheront sur le même cœur.
