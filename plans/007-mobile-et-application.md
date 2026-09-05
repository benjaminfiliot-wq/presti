# PROMPT v8 — Mobile d'abord, puis l'application Presti

> À coller en entier dans Claude Code ouvert sur `C:\Users\benja\Documents\presti`. Même protocole que la v6/v7 : boucle fermée, journal `plans/journal-final.md`, **0 appel IA sur la réserve** (clé de test vide), Stripe en mode test, aucune fonctionnalité non finie visible. Deux parties, dans l'ordre : **A** la version mobile du site web, **B** l'application. On ne commence pas B tant que A n'est pas vert.

---

## PARTIE A — La version mobile du site web

### A0. Ce que Benj a constaté, et ce que le code confirme

Benj : « on ne peut pas se connecter depuis la page web sur mobile ». Cause exacte, `app/globals.css` ligne 1120 :

```css
@media (max-width:760px){.lp-links,.lp-nav .lp-btn--g{display:none} ...}
```

Sous 760 px, la landing **cache** les liens (Fonctionnalités, Tarifs, FAQ, Nous écrire) **et le bouton « Se connecter »** (`.lp-btn--g`). Il ne reste que « Essayer gratuitement ». Un artisan déjà client qui ouvre prestiapp.fr sur son téléphone n'a **aucun** chemin vers son espace. C'est le bug n° 1, et il est probablement resté invisible parce que l'auditeur landing de la v5 a testé l'inscription (qui marchait), pas la connexion.

Autres constats, tous vérifiés dans le code :

| # | Constat | Où | Effet sur mobile |
|---|---|---|---|
| 1 | `100vh` utilisé 4 fois, jamais `dvh` | `globals.css` 380, 382, 881, 1279 | Sur iOS Safari, `100vh` inclut la barre d'adresse : le bas de la sidebar console et du hero sticky est **coupé** ; le contenu saute quand la barre se rétracte |
| 2 | Champs de saisie à 13-14 px | `.inbox-compose textarea` (14 px), `.cp-form input` (13 px), autres | iOS **zoome automatiquement** sur tout champ < 16 px au focus : la page se décale, l'artisan ne voit plus ce qu'il tape |
| 3 | Aucun `env(safe-area-inset-*)` dans `globals.css` (3 seulement dans `plat.css`) | console entière | Sur iPhone à encoche, les boutons collés en bas passent **sous la barre d'accueil** |
| 4 | Seulement **3** media queries ≤ 8xx px pour 2 000+ lignes de CSS console | `globals.css` | Les écrans denses — `devis/[id]` (27 ko), `messages`, poste de pilotage, inventaire, paramètres — n'ont pas de mise en page mobile : colonnes côte à côte écrasées, tableaux qui débordent, scroll horizontal |
| 5 | Info-bulles ⓘ au survol | `app/Info.tsx` | Pas de survol sur mobile : le système d'aide (v5 §4) est **inaccessible** au doigt si le ⓘ n'ouvre pas au tap |
| 6 | Hero landing `.lp-sticky` sticky + `perspective` + 100vh | `globals.css` 1279 | Coûteux sur mobile milieu de gamme ; à vérifier au scroll (0 long task) |
| 7 | Aucun `manifest`, `themeColor`, `appleWebApp` dans `app/layout.tsx` | layout | Ajouté à l'écran d'accueil, le site s'ouvre dans un onglet Safari avec l'icône par défaut — traité en Partie B |
| 8 | Aucune suite ne teste le mobile en tant que tel | `scripts/` | Les suites utilisent 390 px pour des captures, pas pour des assertions (scroll horizontal, cibles tactiles, connexion visible) |

### A1. Correctifs, dans cet ordre

1. **En-tête mobile de la landing** (`app/page.tsx` + CSS) : sous 760 px, « Se connecter » reste **visible** dans la barre (texte court ou icône + libellé accessible), « Essayer » reste, et un **bouton menu** ouvre un tiroir avec les 4 liens + Se connecter + Essayer. Cibles ≥ 44 px, fermeture au tap hors tiroir et à Échap, focus piégé dans le tiroir, `aria-expanded`. Même chose pour les en-têtes de `/tarifs`, `/faq`, `/contact`, `/login`, `/signup` s'ils partagent la barre.
2. **Hauteurs** : `100vh` → `100dvh` avec repli (`min-height:100vh; min-height:100dvh`). La sidebar console (`.psh-side`) devient un tiroir sous 900 px (le bouton menu existe déjà, `AppShell.tsx` l. 253 — vérifier qu'il est présent sur **toutes** les pages de la console et que le tiroir se ferme après navigation).
3. **Saisie** : sous 760 px, `input, textarea, select { font-size: 16px }` partout (règle globale, pas au cas par cas). Vérifier `inputmode` (`tel`, `email`, `numeric`, `decimal`) et `autocomplete` sur chaque champ de connexion, inscription, devis, paramètres — le clavier qui s'ouvre doit être le bon.
4. **Zones sûres** : `padding-bottom: env(safe-area-inset-bottom)` sur tout élément collé en bas (composeur de `/messages`, barre d'actions de `devis/[id]`, CTA sticky, tiroirs), `env(safe-area-inset-top)` sur les barres fixes.
5. **Mise en page mobile de chaque écran console** — c'est le gros du travail. Pour chaque page de l'inventaire (`plans/inventaire-produit.md`), à 390 px et 360 px : une seule colonne ; les tableaux deviennent des **cartes** (devis, factures, matériaux, conversations) ou scrollent **dans leur conteneur** (`overflow-x:auto`) — jamais la page ; les panneaux côte à côte (poste de pilotage : liste + fil ; devis : lignes + aperçu) deviennent des **onglets** ou un empilement avec navigation « retour » ; les actions principales sont **atteignables au pouce** (bas d'écran) ; les modales deviennent des feuilles bas-de-page.
6. **Toucher** : toute info-bulle ⓘ s'ouvre **au tap** et se ferme au tap suivant ; aucune interaction n'est réservée au survol ; le curseur de matière (site Signature) et les effets `hover` sont sous `@media (hover:hover) and (pointer:fine)`.
7. **Clavier virtuel** : sur les écrans de conversation (`/messages`, `/p/[slug]`, pilotage), le composeur reste visible quand le clavier s'ouvre (`visualViewport` → hauteur du conteneur), et le fil défile jusqu'au dernier message.
8. **Performance mobile** : hero landing et slides 3D → 0 long task > 50 ms au scroll sur un profil « Moto G Power » de Playwright/Lighthouse ; les animations décoratives coupées sous 760 px (déjà partiellement fait en v3 C1 — vérifier).
9. **Connexion sur mobile, de bout en bout** : mot de passe → code par email (v7) → appareil de confiance → console. Le code à 6 chiffres : `inputmode="numeric"`, `autocomplete="one-time-code"` (iOS et Android le pré-remplissent depuis le SMS/l'email), un seul champ, collage accepté.

### A2. La suite qui verrouille tout ça : `scripts/mobile-e2e.mjs`

Playwright, trois profils (`iPhone 14` 390×844 Safari-like, `Pixel 7` 412×915, `iPad Mini` 768×1024), pour **chaque page** de l'inventaire, connectée et non connectée :

- `document.documentElement.scrollWidth <= innerWidth` (**aucun** scroll horizontal) ;
- l'en-tête montre un chemin vers `/login` (lien visible, ≥ 44 px) sur les pages publiques ;
- aucune cible interactive < 44×44 px (liste des exceptions justifiées dans le script) ;
- aucun `input/textarea/select` avec `font-size` calculé < 16 px ;
- aucun élément interactif dont la boîte dépasse le viewport ;
- les formulaires du parcours (connexion, code, inscription, devis, contact) se soumettent au clavier virtuel simulé ;
- le composeur reste visible avec `visualViewport` réduit de 320 px ;
- Lighthouse mobile ≥ 90 perf / 100 a11y sur `/`, `/login`, `/dashboard`, `/p/atelier-du-chene` ;
- axe-core 0 violation critique sur mobile.

Ajoutée à `tout-verifier.mjs` (coût `navigateur`) et à l'audit nocturne. **A est terminé quand `mobile-e2e` est vert en prod sur les trois profils**, et que Benj a fait **un vrai passage sur son téléphone** (Safari iOS **et** Chrome Android si possible) — le simulateur ne voit pas tout (barre d'adresse, clavier réel, zoom). Journal : liste de ce qu'il a vu.

---

## PARTIE B — L'application Presti

### B0. La décision d'architecture (à valider par Benj, reco argumentée)

Trois voies possibles. **Ma recommandation : PWA + Capacitor, sur le même code.**

| Voie | Ce que c'est | Pour | Contre |
|---|---|---|---|
| **PWA seule** | Le site installable sur l'écran d'accueil, notifications push web, hors-ligne partiel | 1 jour, zéro store, même code | Pas sur l'App Store ; sur iOS les push exigent l'installation « Sur l'écran d'accueil » (16.4+) ; moins « vraie app » aux yeux d'un artisan |
| **PWA + Capacitor** ⭐ | La même app Next.js embarquée dans une coque native iOS/Android : icône dans les stores, push natives (APNs/FCM), caméra, Face ID, partage | 3-5 jours, **un seul code** (60 routes, 35 suites, 56 migrations déjà là), stores | Apple exige une valeur native réelle (guideline 4.2) — d'où push + Face ID + caméra obligatoires, pas une simple coque ; **compiler iOS demande un Mac** |
| **React Native / Expo** | Réécriture de l'interface en natif | Le meilleur ressenti natif | Réécrire la console : plusieurs semaines, deux codes à maintenir, aucun des 35 tests ne s'applique. Non justifié aujourd'hui |

Ce qui reste **web uniquement, jamais dans l'app** : les sites vitrine et les plateformes des artisans (white-label — le client d'un artisan ne doit jamais voir « Presti » ni installer quoi que ce soit).

### B1. PWA (jour 1)

- `app/manifest.ts` : `name` Presti, `short_name` Presti, `start_url` `/dashboard`, `display` `standalone`, `background_color` `#0A0C11`, `theme_color` `#0A0C11`, `lang` fr, icônes **192/512 maskable** générées depuis `public/marque/presti-icone-512.png` (avec marge de sécurité pour le maskable), `screenshots` (depuis `demo-captures`), `shortcuts` (Nouvelle demande, Messages, Devis).
- `app/layout.tsx` : `export const viewport = { themeColor: '#0A0C11', width: 'device-width', initialScale: 1, viewportFit: 'cover' }` et `metadata.appleWebApp = { capable: true, title: 'Presti', statusBarStyle: 'black-translucent' }` ; `apple-touch-icon` déjà en place (`app/apple-icon.png`).
- **Service worker** (Serwist) : cache de l'**enveloppe** (shell, CSS, polices, marque) + page hors-ligne sobre ; **jamais** de cache des routes `/api/*` ni des pages qui portent des données personnelles ; mise à jour silencieuse avec bandeau « nouvelle version — recharger ».
- **Invitation à installer** : dans la console, une carte discrète (fermable, mémorisée) : Android → `beforeinstallprompt` → bouton « Installer Presti » ; iOS → instructions en 2 étapes avec l'icône Partager. Jamais de pop-up bloquante.
- Test `scripts/pwa-e2e.mjs` : manifest valide (Lighthouse PWA), SW enregistré, page hors-ligne servie, aucune réponse `/api` en cache.

### B2. Notifications push web (jour 1-2) — la fonctionnalité qui justifie l'app

Un artisan veut **une** chose de son téléphone : savoir **tout de suite** qu'une demande est arrivée.

- Clés VAPID (variables Vercel `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`), table `push_abonnements` (`artisan_id, endpoint, p256dh, auth, appareil, cree_le, dernier_succes`), RLS par artisan.
- Abonnement depuis **Paramètres → Notifications** (jamais au chargement : au clic, après explication d'une phrase) ; choix par événement : nouveau lead, nouveau message, proposition de l'assistant à valider, devis accepté, paiement, crédits bas.
- Envoi serveur (`lib/push.ts`, `web-push`) depuis les mêmes points que les emails de notification ; un abonnement qui répond 404/410 est supprimé ; **contenu minimal** dans la notification (nom du prospect + type), jamais le message complet ni de données de santé/adresse.
- Sur iOS : fonctionne uniquement si Presti est **installée sur l'écran d'accueil** — l'interface le dit avant de proposer.
- Test `scripts/push-e2e.mjs` : abonnement, envoi simulé, purge des endpoints morts.

### B3. Capacitor (jours 2-5)

- Dossier `mobile/` à la racine : Capacitor 6, `appId` `fr.prestiapp.app`, `appName` Presti, `server.url` = `https://qg.prestiapp.fr` (l'app charge la version déployée : une mise à jour web = une mise à jour app, sans passer par les stores), `allowNavigation` restreint à `*.prestiapp.fr` ; toute URL externe (site d'un artisan, Stripe, fournisseur) s'ouvre dans le navigateur système.
- Plugins : `@capacitor/push-notifications` (APNs + FCM, jeton envoyé à `push_abonnements` avec `type='natif'`), `@capacitor/camera` (photos de chantier, scan code-barres — l'inventaire l'utilise déjà côté web), `capacitor-native-biometric` (Face ID / empreinte pour rouvrir la session, **en plus** du code email de la v7, jamais à la place), `@capacitor/share`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/app` (deep links).
- **Détection** côté web : `Capacitor.isNativePlatform()` → le bandeau « installer » disparaît, les push passent en natif, la barre de statut s'accorde au thème.
- **Deep links / Universal links** : `qg.prestiapp.fr/*` ouvre l'app si installée (`apple-app-site-association`, `assetlinks.json`) ; les liens `/p/` et `/site/` **jamais** (white-label).
- Icônes et écrans de lancement générés depuis l'aube (`public/marque/`) avec `@capacitor/assets` ; écran de lancement nuit + marque corail, sans texte.
- **Compilation** : Android → GitHub Actions produit un APK debug à chaque `main` et un AAB signé sur tag ; **iOS exige macOS** — Benj est sur Windows : soit un Mac, soit un service (Codemagic a un plan gratuit suffisant pour commencer). Le pipeline est écrit pour les deux.
- Store : fiches (FR), captures 6,7" et 6,5" + tablette depuis `demo-captures`, politique de confidentialité (existe), « App Privacy » Apple renseignée depuis le registre des traitements, compte de test pour les relecteurs Apple (**compte démo dédié**, plan Signature, données réelles non sensibles).
- Test : `mobile/scripts/smoke.mjs` — l'app démarre, charge `/login`, la connexion aboutit, une push de test arrive (Android émulateur), la caméra s'ouvre.

### B4. Liste humaine (Benj) — à faire en parallèle de A

| # | Action | Coût | Pour |
|---|---|---|---|
| M1 | Compte **Apple Developer** (organisation, avec le SIREN) | 99 $/an, validation 1-3 j | App Store, APNs, Universal links |
| M2 | Compte **Google Play Console** | 25 $ une fois | Play Store, `assetlinks.json` |
| M3 | Projet **Firebase** (FCM) + clé APNs (.p8) déposée dedans | gratuit | Push natives |
| M4 | Clés **VAPID** (Claude Code les génère, Benj les pose dans Vercel) | gratuit | Push web |
| M5 | Un **Mac** (ou compte Codemagic) | 0-… | Compiler iOS |
| M6 | Nom de l'app dans les stores : « Presti » (vérifier la disponibilité, l'homonyme presti.ai peut gêner) | — | Fiche store |

### B5. Ordre et jalons

| Jalon | Contenu | Terminé quand |
|---|---|---|
| **A** | Mobile web, correctifs A1, suite A2 | `mobile-e2e` vert 3 profils + passage réel de Benj |
| **B1** | PWA | Lighthouse PWA vert, installable sur Android et iOS (capture des deux) |
| **B2** | Push web | une vraie notification reçue sur le téléphone de Benj (Android, puis iOS installée) |
| **B3-android** | Capacitor Android | APK installé sur un téléphone Android, connexion + push + caméra OK |
| **B3-ios** | Capacitor iOS | build TestFlight installé (dépend de M1 + M5) |
| **Stores** | Fiches + relecture | soumis ; la relecture Apple prend 1-3 jours et peut demander des changements — prévu dans `apres-demo.md` |

### B6. Ce qu'on n'oublie pas

- **White-label** : l'app est **la console de l'artisan**, point. Rien de ce que voit un client d'artisan ne passe par l'app.
- **Sécurité** : jeton en cookie `httpOnly` (ouvert depuis l'audit v4) devient plus important dans une WebView — le traiter avant les stores ; Face ID ne remplace jamais le second facteur, il rouvre une session déjà vérifiée.
- **Vie privée** : les push ne portent pas de données personnelles ; le registre des traitements et la politique de confidentialité mentionnent les notifications et les identifiants d'appareil.
- **Coût IA** : 0 — rien dans A ni B n'appelle l'assistant.

---

## Format à chaque étape
Vérifié · Trouvé (preuve : capture à 390 px, mesure) · Corrigé (test rouge → diff → test vert, commit) · Preuve en prod · Journal (ligne + cumul, « appels IA : 0 ») · Suivant — et pour B, la décision B0 de Benj avant la première ligne de code.
