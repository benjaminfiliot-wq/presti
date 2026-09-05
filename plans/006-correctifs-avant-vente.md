# PROMPT v7 — Trois choses avant de vendre : code email à la connexion · les trois modes de réponse · vérification finale

> À coller en entier dans Claude Code ouvert sur `C:\Users\benja\Documents\presti`. Même protocole que la v6 (§0 : boucle fermée, journal `plans/journal-final.md`, **0 appel IA sur la réserve de Presti**, clé de test vide pour les suites, Stripe en mode test). Trois blocs, dans cet ordre, chacun fermé par un test vert en prod avant le suivant.

---

## BLOC 1 — Le bug des trois modes de réponse (auto · assistée · manuelle)

**Symptôme rapporté par Benj** : dès qu'on passe en assisté ou en manuel, la plateforme demande une validation, on ne peut plus revenir en arrière, et les trois modes finissent par se comporter pareil.

**Diagnostic fait en lisant le code (à confirmer par un test rouge avant de corriger)** — il y a **quatre** causes qui se cumulent, pas une :

1. **Deux sources de vérité qui se contredisent.** L'ancien réglage `artisans.reponse_auto` (booléen, encore écrit par `app/profil/page.tsx:222`) et le nouveau `plateforme_config.mode_reponse` (écrit par `app/plateforme/Reglages.tsx:71`) coexistent. Or `app/api/conversation/route.ts:164` fait `if (artisan.reponse_auto === false || lead.prise_en_main) → silence` **avant** de lire la config. Conséquence : si l'ancien booléen est à « manuel », remettre « auto » dans *Ma plateforme* n'a aucun effet sur cette route. Et `stream/route.ts` fait l'inverse (ignore le booléen sauf en repli). Selon la route qui sert, le même artisan n'a pas le même mode.
2. **Un verrou d'offre silencieux.** `stream/route.ts:100` : si le plan n'a pas `plateforme.ia.auto` (Essai, Essentiel), `auto` devient `assistee` **sans le dire** à l'interface. L'artisan clique « auto », la page dit « auto », le serveur fait « à valider ». C'est exactement « ça demande la confirmation ».
3. **« Je prends la main » n'a pas de retour.** `app/api/messages/route.ts:60` liste les actions `reply, suggest, valider, rejeter, prise_en_main, escalader` — **il n'y a pas de `rendre_main`**. Une fois `leads.prise_en_main = true`, l'assistant se tait sur ce fil pour toujours, quel que soit le mode choisi ensuite. C'est « on ne peut pas rechanger ».
4. **Enregistrement séparé et état affiché non fiable.** Le sélecteur change `cfg` en mémoire, mais rien ne part sans le bouton « Enregistrer » (`Reglages.tsx:190`) ; et le `useEffect` dépend de `[uid, reponseAuto]` — un re-rendu du parent peut recharger la config et écraser un choix non enregistré. Rien n'indique **quel mode est réellement actif côté serveur**.

**Correctif (dans cet ordre, un commit chacun) :**

- **1a. Une seule source de vérité** : `plateforme_config.mode_reponse`. Migration `0062_mode_reponse_unique.sql` : backfill — pour chaque artisan sans ligne de config, créer la ligne avec `mode_reponse = reponse_auto === false ? 'manuelle' : 'auto'` ; puis `artisans.reponse_auto` devient **lecture seule dérivée** (colonne conservée pour ne rien casser, plus jamais écrite — retirer l'écriture de `profil/page.tsx`, le sélecteur de `/profil` renvoie vers *Ma plateforme*). `getPlateformeConfig()` ne lit plus jamais le booléen.
- **1b. Une seule fonction de décision**, `decisionReponse(artisan, lead, cfg, ctx)` dans `lib/plateformeConfig.ts`, appelée par **les deux** routes (`conversation/route.ts` et `conversation/stream/route.ts`) — supprimer le test `reponse_auto === false` de la ligne 164 et tout autre chemin parallèle. Le verrou d'offre y vit **aussi**, et renvoie un motif explicite `'verrou_offre'` distinct de `'assistee'`.
- **1c. Le verrou d'offre devient visible** : dans `Reglages.tsx`, le bouton « Automatique » porte 🔒 + « Disponible avec Studio » si `!peut(plan,'plateforme.ia.auto')`, et n'est pas sélectionnable ; le serveur continue de le refuser (défense en profondeur), mais l'interface ne ment plus. Vérifier la matrice de `lib/plans.ts` : **Essentiel = assistée**, Studio+ = auto — et que c'est bien ce que disent `/tarifs` et `/aide`.
- **1d. Rendre la main** : action `rendre_main` dans `api/messages` (remet `prise_en_main = false`), bouton dans le poste de pilotage à côté de « Je prends la main », **et** un bandeau sur chaque fil pris en main : « Vous avez la main sur cette conversation — [Rendre la main à l'assistant] ». Côté client (`GET /api/conversation`), la bascule est visible dans les deux sens.
- **1e. Enregistrement immédiat et état réel** : le choix du mode s'enregistre **au clic** (upsert immédiat, retour visuel « enregistré » / erreur avec retry), sans bouton séparé ; l'interface affiche **le mode tel que le serveur l'applique** (`GET /api/plateforme/config` renvoie `mode_effectif` + `motif` si différent du mode choisi). Le `useEffect` ne recharge qu'au montage.

**Sémantique attendue, écrite dans `lib/aide.ts` et testée :**

| Mode | Message du prospect | Ce que voit le client | Ce que voit l'artisan |
|---|---|---|---|
| **Automatique** | l'assistant répond, en streaming | la réponse, bandeau « assistant » | le fil, avec mention du modèle servi |
| **Assistée** | l'assistant **prépare** (`etat='proposition'`, invisible du client) | « votre message est bien reçu, réponse sous peu » | la proposition, boutons valider / modifier / rejeter |
| **Manuelle** | l'assistant ne prépare **rien**, aucun crédit | accusé de réception, délai indiqué | notification + fil, bouton « Proposer une réponse » à la demande |
| **Main prise** (par fil, tous modes) | silence de l'assistant sur ce fil | « Marc vous répond directement » | bandeau + « Rendre la main » |

**Test rouge avant, vert après** : `scripts/modes-e2e.mjs`, ajouté à `tout-verifier` (coût `gratuit` : les réponses IA sont **simulées** par la clé vide — on vérifie les décisions, les états en base et l'interface, pas le texte). Il joue, pour **chaque** mode × **chaque** route (`route.ts` et `stream`) × **3 plans** (Essai, Essentiel, Signature) : aller-retour auto → assistée → manuelle → auto sans perte ; verrou d'offre visible et refusé ; prise de main puis **rendue** puis assistant qui reprend ; ancien booléen `reponse_auto` ignoré. Et `pilotage-e2e` rejoué. Rien n'est « corrigé » tant que ces deux suites ne sont pas vertes en prod.

---

## BLOC 2 — Un code par email à la connexion

**Ce que veut Benj** : à la connexion, un email de vérification. Aujourd'hui : confirmation d'email à **l'inscription** (existe, `signup/page.tsx:78`), TOTP **optionnel** (existe, `login/page.tsx:47`). Il manque le **second facteur par email**, obligatoire, comme sur Claude.

**Comportement cible :**
- Après mot de passe correct, si l'appareil n'est pas reconnu : email « Votre code Presti : 482 913 » (6 chiffres, valable 10 min, usage unique), écran de saisie, 5 essais max puis nouveau code, lien « renvoyer » (plafond 3 / 15 min / compte, réutiliser `lib/limites.ts`).
- Case « Se souvenir de cet appareil 30 jours » → cookie signé `httpOnly` `appareil_confiance` (empreinte : hash de l'agent + un secret aléatoire côté serveur, jamais l'IP seule). Liste des appareils de confiance dans *Paramètres → Sécurité*, révocables un à un ; « fermer toutes mes sessions » les révoque tous.
- TOTP activé ⇒ il **remplace** le code email (pas les deux). Comptes clients de la plateforme (lien magique) : non concernés.
- Fondateurs : même règle, aucune exception.
- Le code n'est **jamais** accepté sans mot de passe valide juste avant (anti-énumération : réponse identique que le compte existe ou non ; le code n'est envoyé que si le mot de passe est bon).

**Implémentation** : table `codes_connexion` (`user_id, hash_code, expire_le, essais, cree_le`) — migration `0063` ; route `POST /api/auth/code` (envoi) et `POST /api/auth/code/verifier` ; la session Supabase n'est **exposée au navigateur** qu'après vérification (le mot de passe ouvre une session « en attente » côté serveur ; `lib/authArtisan.ts` refuse toute route tant que `connexion_verifiee` n'est pas posé — même mécanisme que `sessions_invalides_avant`, colonne `connexion_verifiee_le` comparée à `auth_time`). Email via Resend, gabarit sobre, **white-label non concerné** (c'est la console Presti). Texte d'aide dans `lib/aide.ts` (`securite.code_email`), ⓘ sur l'écran.

**Tests** : `scripts/code-connexion-e2e.mjs` (gratuit) — code reçu (Resend en mode test ou boîte de test), code faux ×5 → nouveau code requis, code expiré refusé, appareil de confiance → pas de code pendant 30 j, révocation → code redemandé, TOTP actif → pas d'email, anti-énumération, et **un jeton obtenu avant vérification ne passe aucune route** (auditeur A, rejeu). `mfa-e2e`, `motdepasse-e2e`, `parametres-e2e` rejoués.

---

## BLOC 3 — Vérification finale, et ce qu'on peut honnêtement affirmer

Rejouer **tout** : `node scripts/tout-verifier.mjs` (hors IA) doit passer de 42 à **44/44** (les deux nouvelles suites), localement **et** dans l'audit nocturne GitHub. Puis `audit-final-e2e`, `rls-e2e`, `injection` (dernier vert cité), `abonnement-e2e` en mode test **si** la clé H4 a été posée.

Mettre à jour `plans/audit-final.md` avec une section **« Ce que Benj a trouvé après l'audit »** : le bug des modes n'était couvert par aucune suite (`plateforme-config-e2e` testait l'enregistrement, pas l'effet sur les deux routes ni l'aller-retour) — c'est un trou de la matrice de couverture, à écrire tel quel, et la matrice `plans/couverture.md` gagne la ligne « effet d'un réglage = comportement observé sur chaque route qui le lit ».

Enfin, réécrire honnêtement la liste H dans le journal : ce qui est prouvé (44/44), et ce qui ne l'est **pas encore** — les 11 transitions Stripe en conditions réelles (clé de test H4 toujours absente au 05/09), la détection de rejeu (H15, fenêtre de tolérance), le téléphone LCEN (H9/H16), DMARC (H11).

---

## Format à chaque étape
Vérifié · Trouvé (preuve) · Corrigé (test rouge → diff → test vert, commit) · Preuve en prod · Journal (ligne + cumul, « appels IA : 0 ») · Suivant.
