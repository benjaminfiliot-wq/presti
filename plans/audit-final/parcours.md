# Audit final — D. Parcours & expérience (artisan et client, téléphone + ordinateur)

> Auditeur : `presti-auditeur` (rôle « auditeur D ») — 05/09/2026, production `https://prestiapp.fr`. **Appels IA : 0** (aucun message envoyé sur `/p`, aucune route `leads`/`conversation/stream`/`devis`/`chiffrer`/`recherche`/`pilotage` touchée — un garde-fou dans le navigateur aurait crié `ROUTE IA APPELÉE` ; il n'a rien vu). **Aucun paiement** (arrêt sur l'écran Stripe Checkout), **aucun formulaire `/contact` soumis**, aucune action sur un compte réel.
> Méthode : Playwright (Chromium du dépôt) en 1360×900 et iPhone 13 (390×844, tactile), un compte artisan créé **par l'écran `/signup`** (`parcours.1788588321702@presti-test.invalid`, purgé via `purger_compte_test` : 0 ligne `artisans`, 0 user auth restant), un email client `client.<ts>@presti-test.invalid` (lien magique demandé, jamais ouvert). Chaque effet est prouvé par l'écran (captures), par HTTP (`fetch` sans cookie) ou par la base (service role en lecture). Références `fichier:ligne` sur `origin/main` = HEAD (`9b16deb`). Note : le dépôt et la prod ont **bougé pendant l'audit** (case CGU ajoutée à `/signup`) — mon inscription du 1er passage est passée sans la case, le 2e passage l'a rencontrée ; le rapport décrit l'état final.
> Hors périmètre (déjà couvert) : sécurité (A), conformité (B), qualité/perf/a11y (C). Quand un point recoupe C, je renvoie à son numéro sans le recoter.

## Synthèse

| Gravité | Nombre | Quoi |
|---|---|---|
| 🔴 Bloquant | **0** | tous les parcours vont au bout : inscription → onboarding → console vide → publication → site public → plateforme client → paramètres → Stripe → réinitialisation → déconnexion |
| ⚠️ Majeur | **5** | (1) l'adresse générée à l'onboarding peut être **refusée par le propre validateur de Presti** (45 caractères, double tiret `tres--bupa`) ; (2) **aucune borne** sur le nom et le téléphone (371 caractères et `abc<script>` enregistrés) → `<title>` de 381 caractères, `h1` sur 30 lignes, en-tête `/p` illisible sur téléphone ; (3) un **lien magique invalide ou expiré ne dit rien** au client (400 avalé, écran inchangé) ; (4) `/plateforme` sur téléphone est **rendu à 510 px** (onglets non repliables) → tout est réduit de 24 % ; (5) décocher « Mon site est publié » affiche « **hors ligne — visible de vous seul** » et masque le bloc de partage **alors que le site reste public** tant qu'on n'a pas cliqué Enregistrer |
| ○ Mineur | **9** | tutoiement sur l'onboarding seul ; `retour=` perdu à la première connexion ; `/login` et `/signup` ne renvoient pas l'artisan déjà connecté ; « Bonjour Entreprise » (premier mot de la raison sociale pris pour un prénom) ; site publié vide et indexable sans avertissement ; « Retour presti » / « S'abonner à Presti — Studio » en minuscule sur Stripe ; cibles tactiles 14–18 px (recoupe C) ; « Vérification… » avec bouton actif ; pages console servies `index, follow` (recoupe C-11) |

**Chiffrage : ≈ 7 h 30** (majeurs ≈ 3 h 30 ; mineurs ≈ 4 h). Rien n'empêche la démo ni l'ouverture.

---

## Parcours 1 — Découverte → inscription → première connexion → onboarding

| # | Étape | État | Preuve | Gravité | Correctif (h) |
|---|---|---|---|---|---|
| 1.1 | `/signup` vide, faible, fuité, fort | ✅ | Soumission vide → `Please fill out this field` natif sur `#email-inscription` ; `123456` → « Trop court : il faut au moins 10 caractères. » + bouton grisé ; `motdepasse123456` → « Ce mot de passe figure dans toutes les listes d'attaque. » + grisé ; mot fort → « Vérification… » puis « Solide. » (`/api/auth/mdp-fuite` 200). Ordre Tab : email → mot de passe → œil → bouton → « Se connecter » | — | — |
| 1.2 | Case CGU (arrivée en prod pendant l'audit) | ✅ | Bouton grisé tant que la case n'est pas cochée (`disabled: m‖!v.ok‖z‖!b` dans le chunk servi ; `app/signup/page.tsx:27,64-65`), `cgu_acceptees_le` + `cgu_version` posés dans les métadonnées auth | — | Le libellé « Créer mon compte » reste grisé sans dire pourquoi si l'artisan n'a pas vu la case → voir mineur 1.9 |
| 1.3 | Après inscription | ✅ | Session immédiate (pas de confirmation email bloquante : `email_confirmed_at` déjà posé), redirection `/outils` → `/onboarding` (pas de profil) | — | — |
| 1.4 | `/login` mauvais mot de passe | ✅ | « Email ou mot de passe incorrect. » (400 Supabase traduit, `lib/motDePasse.ts:104`) ; bon mot de passe + Entrée → `/outils` | — | — |
| 1.5 | `/onboarding` vide | ✅ | Soumission vide → champ nom `:invalid`, focus dessus | — | — |
| 1.6 | **Nom 371 caractères + tel `abc<script>`** | ⚠️ | Enregistré tel quel en base (`nom` length 371, `tel = "abc<script>"`) : aucun `maxLength`, aucun motif, aucun `slice` côté client (`app/onboarding/page.tsx:47-52`, `:74-80`) ni côté base (colonne sans contrainte ; l'upsert passe par PostgREST, pas par une route). Effets mesurés : `<title>` de `/site` = **381 caractères**, `h1` de la vitrine sur **30 lignes** (capture `d-site`), en-tête `/p` = 9 lignes de titre sur iPhone (capture `m-p-accueil`), « Bonjour Entreprise » au tableau de bord. Les 15 champs de `/profil` sont aussi à `maxLength=-1` (seuls tel/email publics sont tronqués au save, `profil/page.tsx:218-219`) | **majeur** | `maxLength` 80 sur le nom, 40 sur le tel + motif `[0-9 +().-]`, et une contrainte `check (char_length(nom) <= 120)` en migration ; même passe sur `/profil` (1 h 30) |
| 1.7 | **Adresse générée invalide** | ⚠️ | Slug produit : `entreprise-tres-longue-tres-longue-tres--bupa` (45 car., **double tiret**). Cause : `lib/slug.ts:7-8` retire les tirets de bord **puis** coupe à 40 → un tiret peut rester en fin, et `onboarding:47` colle `-xxxx` derrière (max **45**). Or le validateur maison refuse les deux : `POST /api/account/slug` → 400 « Trop long : 40 caractères maximum. » et `abc--def` → 400 « Uniquement des lettres… (pas au début ni à la fin) » (`lib/urls.ts:79-85`) ; le middleware multi-domaine rejette aussi `SLUG_OK` (`middleware.ts:41`). Aujourd'hui `/p/<slug>` et `/site/<slug>` répondent 200 sur prestiapp.fr, mais l'artisan ne peut pas **re-valider sa propre adresse**, et le jour du domaine neutre son site ne résoudra pas | **majeur** | `slugify` : `.slice(0, 35)` **avant** le nettoyage des bords ; onboarding : garantir `problemeSlug(slug) === null` (0 h 30) |
| 1.8 | Tutoiement | ○ | « Ton profil », « Ton nom », « Ton métier », « Ton téléphone » (`onboarding:71-80`) ; partout ailleurs vouvoiement (« Vos demandes », « Votre lien de contact », paramètres) | mineur | Passer au vouvoiement (0 h 15) |
| 1.9 | `retour=` perdu | ○ | `/login?retour=/parametres` → connexion → `/onboarding` (pas de profil) → `/outils` : la destination demandée est oubliée (`login/page.tsx:22-25` ne la transmet pas à l'onboarding) | mineur | Propager `retour` dans l'URL d'onboarding (0 h 20) |
| 1.10 | Déjà connecté sur `/login`, `/signup` | ○ | Les deux pages s'affichent normalement à un artisan connecté (URL inchangée après 3 s) ; il peut recréer un compte par-dessus sa session | mineur | Rediriger vers `/outils` si `getSession()` renvoie une session (0 h 15) |
| 1.11 | « Vérification… » | ○ | Pendant la recherche HIBP le bouton reste actif ; l'envoi refait la vérification en bloquant (`signup:44-56`) → correct, mais l'artisan peut cliquer et attendre sans indicateur | mineur | Griser pendant `verifEnCours` (0 h 05) |

## Parcours 2 — Tableau de bord vide → profil → publication du site

| # | Étape | État | Preuve | Gravité | Correctif (h) |
|---|---|---|---|---|---|
| 2.1 | Visite guidée | ✅ | Première ouverture : « VISITE GUIDÉE · 1/5 — Tout est dans ce menu », « Plus tard » / « Suivant » ; après « Plus tard », **ne revient pas** dans un navigateur neuf (0 bulle sur `/dashboard` puis `/profil`) → mémorisée côté serveur | — | — |
| 2.2 | État vide | ✅ | 4 KPI à 0 (« tout est à jour »), « Aucune demande pour l'instant. Dès qu'un client remplira votre lien, elle apparaîtra ici. » ; `/plateforme` : « Aucune conversation pour l'instant. Partagez votre lien (onglet « Ma page »)… » ; `/devis` et `/factures` : messages d'amorce explicites | — | — |
| 2.3 | Copier le lien | ✅ | « Copier » → « ✓ Copié » ; lien = `https://prestiapp.fr/p/<slug>` (le même que sur `/plateforme`) | — | — |
| 2.4 | « Bonjour Entreprise » | ○ | `dashboard/page.tsx:80` prend le premier mot du nom pour un prénom : « Entreprise Très Longue » → « Bonjour Entreprise » ; « Dupont Plomberie » donnerait « Bonjour Dupont » | mineur | « Bonjour » + nom complet tronqué, ou pas de prénom (0 h 10) |
| 2.5 | Publication | ✅ | Avant : `/site/<slug>` 200 « Site non publié », `noindex, nofollow`. Case cochée → libellé « Mon site est publié — accessible à tous » ; **double-clic** sur Enregistrer → toast « Profil enregistré ✅ » (128 ms après le clic, disparaît à 2,5 s), base `site_active=true, site_tier=1`, aucune requête en échec ; `/site/<slug>` 200 avec le contenu, « Voir en grand ↗ » pointe la bonne URL, aperçu iframe `?preview=1` | — | Le toast dit « Profil enregistré », pas « Site publié » : acceptable (un seul bouton pour toute la page), à condition de corriger 2.6 |
| 2.6 | **Décocher sans Enregistrer** | ⚠️ | Case décochée → libellé « Mon site est **hors ligne — visible de vous seul** » et le bloc lien/aperçu **disparaît** (`.site-publish` = 0) ; au même instant `GET /site/<slug>` (sans cookie) = **200, contenu public**. L'écran affirme un état que rien n'a produit (`profil/page.tsx:549-556` : libellé et affichage dérivent de l'état local, la base n'est écrite qu'au save) | **majeur** | Libellé conditionnel : « sera hors ligne après Enregistrer » tant que `siteActive !== valeur enregistrée`, garder le bloc de partage visible avec un bandeau « modification non enregistrée » (0 h 30) |
| 2.7 | Site vide publié | ○ | Compte neuf : la vitrine publiée ne contient que le nom, « Un travail soigné… », un CTA et « Parlons de votre projet » (0 image, 1 `h2`), et elle est servie `index, follow` (`site_seo` vrai par défaut). Aucun avertissement « votre site est vide » avant de cocher | mineur | Sur `/profil`, un rappel « Ajoutez une présentation et une réalisation avant de publier » quand `services`/`realisations`/`presentation` sont vides (0 h 30) |
| 2.8 | Retour arrière | ✅ | `/profil` → `/dashboard` → retour : `/profil` rechargé proprement, aucune erreur console | — | — |

## Parcours 3 — Côté client : `/site`, `/p`, infos légales, 404

| # | Étape | État | Preuve | Gravité | Correctif (h) |
|---|---|---|---|---|---|
| 3.1 | `/p/<slug>` desktop + iPhone | ✅ | « Bonjour 👋 », 4 amorces (« J'ai un problème à réparer », « Je voudrais un devis », …), champ « Décrivez votre besoin… », bandeau « Assistant de l'entreprise — un humain prend le relais à tout moment », notice RGPD avec « En savoir plus » → `/site/<slug>/infos-legales` ; `noindex, nofollow` ; 0 débordement (scrollWidth 390) | — | — |
| 3.2 | Identification par email | ✅ | Vide → `required` natif ; `pas-un-email` → `checkValidity()=false`, rien envoyé ; email valide → « Si un espace existe pour cette adresse, un lien de connexion vient d'être envoyé. Vérifiez votre boîte mail. » (réponse uniforme, `api/p/auth/route.ts:37-66`) | — | — |
| 3.3 | **Lien magique invalide / expiré** | ⚠️ | `/p/<slug>?connexion=jeton-bidon` → `POST /api/p/auth` **400** (« Lien invalide. »), le paramètre est retiré de la barre d'adresse et… **rien** : le volet montre « Retrouver mes demandes » comme si de rien n'était (capture `d-p-lien-bidon`, `PlatChat.tsx:195-197` ignore la réponse). Un lien est valable 20 min et une seule fois : le cas « je clique trop tard » est le cas courant, et le client ne saura pas qu'il doit en redemander un | **majeur** | Lire `r.ok` / `d.error` et afficher « Ce lien a expiré ou a déjà servi — demandez-en un nouveau ci-dessous » dans `.pchat-compte` (0 h 30) |
| 3.4 | Volet sur téléphone | ✅ | Le formulaire vit dans le volet latéral, fermé par défaut (`translateX(-102%)`, `plat.css:395`) ; bouton ☰ « Mes demandes » 29×30 px l'ouvre, « Recevoir mon lien » devient visible (x=18, y=634). « Recevoir mon lien » = **14 px** de haut (recoupe C, cibles tactiles) | mineur (C) | — |
| 3.5 | Photo jointe sans envoi | ✅ | `setInputFiles` PNG → vignette dans `.pchat-joint`, bouton Envoyer actif même sans texte (voulu : `PlatChat.tsx:265`), **aucune requête** émise tant qu'on n'envoie pas | — | — |
| 3.6 | `/site/<slug>` | ✅ | 3 CTA « Demander un devis » / « Démarrer une demande » → `/p/<slug>`, « Informations légales » en pied, 0 débordement sur iPhone | — | Titre 381 car. → 1.6 |
| 3.7 | `/site/<slug>/infos-legales` | ✅ | 200, « ← Retour au site », « Qui je suis, et ce que deviennent vos données », dénomination, `index, follow` | — | `index` inconditionnel → C-majeur 2 (non recoté) |
| 3.8 | 404 | ✅ | `/p/inexistant-xyz`, `/site/inexistant-xyz`, `/site/inexistant-xyz/infos-legales` → **404** « Page introuvable », `noindex` ; `/p/` et `/site/` → 308 vers `/p` et `/site` → 404 | — | — |

## Parcours 4 — Paramètres (sécurité, données, suppression), abonnement, réinitialisation, déconnexion

| # | Étape | État | Preuve | Gravité | Correctif (h) |
|---|---|---|---|---|---|
| 4.1 | Sécurité : ancien mot de passe faux | ✅ | « Mot de passe actuel incorrect. » (`/api/securite/mot-de-passe` 403), nouveau mot de passe jaugé « Solide. » avant l'envoi | — | — |
| 4.2 | Données : récapitulatif avant suppression | ✅ | « Supprimer mon compte » → « CE QUI DISPARAÎT / CE QUI RESTE » + mot à taper ; `supprimer` en minuscules accepté (`toUpperCase`) ; « Confirmer » → « Suppression programmée. Vous pouvez l'annuler jusqu'à la date indiquée. », base `suppression_demandee_le` posée ; « Annuler » → « Suppression annulée — votre compte reste. », base `null` | — | Compte avec facture : B-bloquant 2 (non recoté) |
| 4.3 | Export | ✅ | « Télécharger mon archive (.zip) » présent (contenu vérifié par `parametres-e2e` §5, non rejoué) | — | — |
| 4.4 | Abonnement → Stripe | ✅ | Trois boutons « S'abonner à Essentiel / Studio / Signature » ; clic Studio → « Redirection… » → `https://checkout.stripe.com/c/pay/cs_live_…` : « Presti — Studio 59,00 € par mois, 250 crédits / mois, Taxe 0,00 € », email prérempli, retour navigateur → `/abonnement` intact (les erreurs console `payments-eu.amazon.com` viennent de Stripe, pas de Presti) | — | — |
| 4.5 | Marque sur Stripe | ○ | Bouton « Retour **presti** », « Payez en toute sécurité sur **presti** » : nom public du compte Stripe en minuscules | mineur | Tableau de bord Stripe → Paramètres → nom public « Presti » (0 h 05, hors code) |
| 4.6 | **`/plateforme` sur iPhone** | ⚠️ | `innerWidth` = **510** (les 6 autres écrans de la console : 390) : le navigateur dézoome pour faire tenir la barre d'onglets « Conversations · Automatisations · Apparence · Réglages » (`.pil-volets` `display:flex` sans `flex-wrap` ni `overflow-x`, `globals.css:2012` ; boutons mesurés jusqu'à `right=510`). Tout l'écran (capture `m-plateforme`) est réduit de 24 %, texte de 12 px effectif, et « Réglages » déborde à droite | **majeur** | `.pil-volets{overflow-x:auto;scrollbar-width:none}` + `flex:none` sur les boutons, ou `flex-wrap:wrap` (0 h 20) |
| 4.7 | Réinitialisation | ✅ | Demande → « Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé… » ; `?token=jeton-bidon-0000` → titre « Nouveau mot de passe », mots différents → « Les deux mots de passe ne correspondent pas. », jeton bidon → « Ce lien est invalide ou expiré. Refaites une demande. » (400 traduit) | — | — |
| 4.8 | Déconnexion | ✅ | Menu compte → « ↩ Se déconnecter » → `/login` ; `/dashboard` déconnecté → `/login` ; `/profil`, `/parametres`, `/devis` en HTTP nu = 200 coquille puis redirection cliente | — | Coquilles `index, follow` + titre landing → C-11 (`robots.txt` les interdit déjà, `app/robots.ts:12-16`) |
| 4.9 | Cibles tactiles console | ○ | `/outils` : boutons ⓘ « En savoir plus » 18 px de haut ; « Recevoir mon lien » 14 px | mineur (C) | — |

## Vérifié et sain (avec preuve)

1. **Inscription complète par l'écran** : politique 10+ caractères, listes d'attaque, HIBP (`/api/auth/mdp-fuite` 200 depuis le navigateur), case CGU obligatoire, session immédiate, `/outils` → `/onboarding` → `/outils`.
2. **Messages d'erreur traduits et humains** partout où j'ai provoqué l'échec : login (400 → « Email ou mot de passe incorrect. »), changement de mot de passe (403 → « Mot de passe actuel incorrect. »), reset (400 → « Ce lien est invalide ou expiré. »), signup doublon prévu (`lib/motDePasse.ts:104`).
3. **Réponses uniformes** (aucune énumération) sur la demande de lien magique `/p` et sur la demande de réinitialisation — le même texte pour un email existant ou inconnu.
4. **Suppression de compte** : récap avant action, mot de confirmation, date de grâce, annulation — chaque étape a son effet en base et son message.
5. **Stripe Checkout** atteint en mode LIVE avec le bon produit, le bon prix, 0 € de taxe (293 B), email prérempli, retour propre.
6. **404 réelles** sur `/p`, `/site` et `infos-legales` inexistants, `noindex`.
7. **Visite guidée** mémorisée serveur : ne réapparaît pas après « Plus tard », même dans un navigateur neuf.
8. **Double-clic** sur Enregistrer : deux sauvegardes identiques, un seul toast, aucune erreur ; aucune requête en échec (hors 400/403/404 attendus) sur les 21 écrans parcourus.
9. **Déconnexion** effective : le menu ferme la session et chaque page console renvoie vers `/login`.
10. **Mobile** : 0 débordement horizontal sur `/dashboard`, `/profil`, `/parametres`, `/abonnement`, `/outils`, `/messages`, `/devis`, `/factures`, `/inventaire`, `/tarifs`, `/p`, `/site` (seule exception : 4.6).
11. **Photo jointe** sur `/p` : compression locale, aucune requête avant l'envoi ; bouton envoyer autorisé sans texte (voulu).
12. **Navigation clavier** : ordre logique sur `/login` (Retour → email → mot de passe → œil → Se connecter → Mot de passe oublié → Créer un compte) et `/signup` ; Entrée soumet.

## Plan de correction (ordre conseillé)

1. 1.7 slug : `slice` avant le nettoyage + `problemeSlug` à l'onboarding — 0 h 30.
2. 1.6 bornes nom/tel (client + migration `check`) et champs `/profil` — 1 h 30.
3. 3.3 message « lien expiré » sur `/p` — 0 h 30.
4. 4.6 `.pil-volets` défilable sur téléphone — 0 h 20.
5. 2.6 libellé « hors ligne » conditionné à l'état enregistré — 0 h 30.
6. Mineurs (1.8, 1.9, 1.10, 1.11, 2.4, 2.7, 4.5) — ≈ 2 h ; 3.4/4.9 et 4.8 suivent le plan de C.

Captures : `scratchpad/shots/*.png` (session d'audit, non versionnées). Scripts temporaires supprimés, compte de test purgé.
