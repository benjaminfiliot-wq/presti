# Session 2026-09-06 — Prompt v9, J1 : l'app installable (PWA)

Suite de [[Session-2026-09-05-v8-Mobile]]. Prompt v9 = PWA puis Capacitor, **un seul code**, white-label absolu. Même protocole : preuve avant correctif, journal `plans/journal-final.md` [22], 0 appel IA, Stripe en test. Décision B0 de Benj : « OK pour PWA et Capacitor » après comparaison avec Lovable (générateur : reconstruire), Expo (React Native : réécrire chaque écran, deux codes) et Figma (dessin, pas une app).

## Ce qui est en ligne (`3e075dc` → `a15f52f`)
- **Manifeste** `app/manifest.ts` : icônes any + maskable 192/512 (fond nuit plein cadre, marque à 76 %), 3 captures store prises en prod sur la démo, raccourcis Messages / Nouveau devis / Inventaire. Pas de verrou d'orientation (WCAG 1.3.4).
- **Service worker** Serwist (`app/sw.ts` → `public/sw.js` généré) : précache = page hors-ligne + icônes ; `/_next/static` en cache à l'usage ; navigations réseau seul ; `/api /auth /p /site /l` réseau seul, sans repli ; `skipWaiting` désactivé ; `worker-src 'self'`.
- **Page hors-ligne statique** `public/hors-ligne.html`, zéro script, « Réessayer » = `href=""`.
- **Carte d'installation** (console seulement) : Android → `beforeinstallprompt` ; iOS Safari → Partager → Sur l'écran d'accueil ; refus 30 jours ; rien si installée, bureau, WebView, écran de conversation.
- **Bandeau de mise à jour** : le seul onglet qui clique se recharge ; « Plus tard ».
- **Middleware** : manifeste, sw.js, hors-ligne, marque → 404 neutre hors hôte maison.
- **Suite** `scripts/pwa-e2e.mjs` **71/71 en prod** (installabilité prouvée par CDP `Page.getInstallabilityErrors` : Lighthouse n'a plus d'audit PWA) ; lanceur à 46 suites.

## Ce que j'ai appris (à retenir)
- **Une chaîne `&&` après un patch qui échoue saute l'étape suivante en silence** : le CSS de la carte n'a jamais été écrit, la suite passait, la capture montrait une carte nue. Vérifier à l'œil, et faire tester « les styles sont servis ».
- Le `defaultCache` de @serwist/next met `/api` en cache ; `globPublicPatterns` est ignoré dès qu'`additionalPrecacheEntries` est fourni.
- Une page Next ne convient pas comme page hors-ligne : à l'hydratation elle réclame son chunk, absent hors ligne → écran d'erreur générique. Un fichier HTML statique, sans script.
- `clientsClaim` : le nouveau worker prend la main sur **tous** les onglets ; ne recharger que celui qui a cliqué.
- Le matcher du middleware exclut les chemins à point : manifeste et sw.js passaient sur le domaine perso d'un artisan. Les lister explicitement.
- L'émulation CDP de `display-mode` n'atteint pas `matchMedia` en headless : poser l'état d'un vrai téléphone dans la page.
- Revue adversariale en workflow (4 angles × 2 réfutateurs, 26 agents) : 19 constats tenus, dont 3 majeurs que ni la suite ni la capture n'avaient vus — et **une régression bloquante créée par mon propre correctif** (qg.prestiapp.fr, l'hôte de la console, traité comme hôte d'artisan) rattrapée par le relecteur suivant. Ce qui touche au routage par hôte se prouve sur chaque hôte : la suite sonde maintenant qg. par en-tête Host.

## Reste à Benj
- Installer Presti sur son Android **et** son iPhone (captures → journal) : ferme J1.
- Liste M : M1 Apple Developer (D-U-N-S en premier), M2 Play Console, M3 Firebase, M5 Codemagic, M7 téléphones, M8 nom « Presti ». M4 (VAPID) et M6 (keystore) : moi.
- Décisions §10 : recommandations en vigueur tant qu'il ne tranche pas.

Suivant : J2 push web, puis J3 Capacitor Android.

## J2 (soir) — push web livrée derrière le drapeau `pushWeb`
Un seul point de passage `notifierArtisan` = email + push ; charge utile neutre et bornée (déchiffrée par la suite pour le prouver) ; 410 → oubli, 3 échecs → désactivé, 30/h ; Paramètres → Notifications (onglet neuf, Email + Push par événement, appareils, test, cas iPhone) ; `/messages?lead=` ouvre la conversation. VAPID posées par moi (M4). À retenir : un composant client ne doit jamais importer un module qui tire web-push (types séparés dans `lib/notificationsTypes.ts`) ; `DIRECT_URL` ne marche pas (mot de passe refusé) → migrations toujours collées par Benj. Reste : Benj colle 0064 → drapeau → `push-e2e` en prod → vraie push sur son Android.

## J3 (nuit) — la coque Android compilée par GitHub
`mobile/` (Capacitor 8, ESM pour la CLI sous Node 24), `android/` committé, icône et écrans de lancement depuis la marque, workflow `android.yml` → APK de debug 19 Mo à chaque push. Pont natif dans la console (`lib/natif.ts`, `app/NatifPont.tsx`), route et envoi natifs (FCM v1, inerte sans M3). À retenir : Groovy lit `versionCode (x).toInteger()` comme `versionCode(x).toInteger()` ; le `tsconfig` racine doit exclure `mobile/` sinon Vercel type-vérifie la config Capacitor ; `server.url` = `/dashboard` (la racine de qg. est le poste de contrôle) ; le premier SVG d'icône était la variante claire — vérifier l'image, pas le nom du fichier.

## J4 + revue native (07/09 nuit) — le scan qui ne marchait pas, Presti sur PC, l'APK signé public
Benj a testé l'APK v4 : « le système de scan marche pas ». Cause : dans la coque, `Capacitor.Plugins` ne connaît que les plugins enregistrés par `registerPlugin` côté JavaScript — la console n'importait pas `@capacitor/core`, donc rien de natif ne répondait (scan, caméra, partage, verrou, push) et tout retombait en silence sur le web. Corrigé (`lib/natif.ts`), avec la revue adversariale du natif : verrou biométrique au layout racine (annulation ≠ refus), liens profonds bornés à la console, jeton push seulement si l'artisan a activé (préférence), ML Kit attendu jusqu'à la fin du téléchargement, `/.well-known/*` réservé aux hôtes maison, iOS `WKAppBoundDomains` + APNs, page de secours neutre qui retire l'écran de lancement. Presti sur PC : carte « Installer Presti sur cet ordinateur » + **Paramètres → Application** (Android APK signé / Chrome, iPhone Partager → écran d'accueil, ordinateur Chrome/Edge/Safari Dock). APK signé publié par la release dans un bucket public Supabase.
À retenir : une fonctionnalité native « branchée » n'est prouvée que sur le téléphone — le web ne voit rien ; les clés Supabase `sb_secret_` exigent l'en-tête `apikey` sur l'API Storage ; M2 (compte + paiement) reste à Benj, M3 (Firebase) attend son oui explicite.

## M3 Firebase + smoke en émulateur (07/09)
Benj a créé le projet Firebase et déposé les deux fichiers ; un script les a posés là où ils servent (secret CI, Vercel, .env.local) sans jamais les afficher, et les originaux sont partis hors dépôt. Preuve serveur sans téléphone : Google répond « jeton invalide » (400) et non « refusé » (401) à un envoi bidon. Le job smoke en CI lance l'APK dans un émulateur et interroge la WebView : au premier passage il a trouvé trois vrais défauts (DNS de l'émulateur, splash bloqué à jamais sur la page de secours, fond clair du splash Android 12), tous corrigés avant qu'un artisan ne les voie. Leçon : un test qui échoue pour une raison d'outillage (buffer, DNS) cache les vrais défauts derrière — corriger l'outillage d'abord, relire ensuite.

## 07/09 — smoke vert, les fiches store et leurs trois bloquants
Le smoke en émulateur est passé à 18/18 : la coque charge la console et chaque plugin natif répond — le « scan qui ne marche pas » est corrigé et prouvé sans téléphone. Le workflow des fiches store (deux rédacteurs, un critique, une synthèse) a produit `mobile/STORES.md`, et surtout le critique a refusé les deux textes pour trois raisons de CODE : aucun relecteur Apple/Google ne pouvait se connecter (code email obligatoire), la coque vendait un abonnement Stripe (refus Apple 3.1.1 certain), et l'app affichait un lien APK hors store. Tout corrigé le jour même. Leçon : une revue de « texte » qui lit le code trouve des défauts produit que personne ne cherchait ; la faire tôt, avant la soumission, coûte moins qu'un refus. Benj a collé le prompt v10 (Centre de direction) : le v9 est terminé côté code, il reste ses gestes (téléphone, Play, Apple).
