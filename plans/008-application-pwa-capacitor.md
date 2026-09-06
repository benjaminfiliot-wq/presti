# PROMPT v9 — L'application Presti : PWA + Capacitor, de zéro aux stores

> À coller en entier dans Claude Code ouvert sur `C:\Users\benja\Documents\presti`. Prérequis : la partie A du prompt v8 (mobile web) est verte — `mobile-e2e` passe sur les trois profils. Si ce n'est pas le cas, tu la termines d'abord : une app qui embarque un site mal adapté au téléphone est une mauvaise app, quel que soit l'emballage.
>
> Protocole inchangé (v6 §0) : boucle fermée, journal `plans/journal-final.md`, aucune permission demandée pour du réversible, **0 appel IA sur la réserve de Presti**, Stripe en mode test, rien de non fini visible. Tout ce que seul Benj peut faire est en §9 — tu le lui poses **en un message dès le début** et tu avances sur le reste.

---

## §0. Ce qu'on construit, en une phrase

**La console de l'artisan (`qg.prestiapp.fr`) devient une application installable — d'abord depuis le navigateur (PWA), puis depuis l'App Store et le Play Store (Capacitor) — avec ce qu'un téléphone apporte vraiment : la notification qui arrive à la seconde où un client écrit, la caméra, Face ID, le partage.**

Un seul code : le Next.js existant. Pas de réécriture, pas de second dépôt d'interface. La coque native charge la version déployée ; une mise à jour web est une mise à jour de l'app sans passer par les stores.

**Ce qui n'entre jamais dans l'app** : les sites vitrine (`/site/[slug]`) et les plateformes (`/p/[slug]`) des artisans. White-label absolu : le client d'un artisan reste sur le web, sans jamais voir « Presti » ni être invité à installer quoi que ce soit. L'app est l'outil de l'artisan, point.

---

## §1. Architecture cible

```
presti/                         (dépôt existant, inchangé dans sa structure)
├── app/manifest.ts             → manifeste PWA
├── app/layout.tsx              → viewport, appleWebApp, themeColor
├── app/sw.ts + serwist         → service worker (enveloppe + hors-ligne, jamais /api)
├── app/hors-ligne/page.tsx     → page hors-ligne sobre
├── lib/natif.ts                → pont : « suis-je dans Capacitor ? » + accès plugins, avec repli web
├── lib/push.ts                 → envoi (web-push VAPID + FCM/APNs via Firebase Admin)
├── app/api/push/…              → abonnement / désabonnement / test
├── app/parametres → Notifications, Appareils
├── supabase/migrations/0064_push.sql
├── scripts/pwa-e2e.mjs, push-e2e.mjs
└── mobile/                     ← NOUVEAU : la coque native
    ├── capacitor.config.ts
    ├── package.json            (Capacitor + plugins, séparé du package.json web)
    ├── ios/  android/          (générés, committés)
    ├── resources/              (icône + écran de lancement sources, depuis public/marque)
    ├── www/                    (uniquement la page de secours hors-ligne : l'app charge server.url)
    ├── scripts/smoke-android.mjs
    ├── codemagic.yaml          (iOS)
    └── README.md               (comment builder, signer, publier — pour Benj et pour l'audit)
```

**Choix structurant, à ne pas contourner** : `server.url = https://qg.prestiapp.fr`. L'app affiche le site déployé dans une WebView native. Le Next.js est en SSR (60 routes API, auth, Supabase) — un export statique embarqué n'est pas possible et n'est pas souhaitable. Ce mode est accepté par Apple **à condition** que l'app apporte une valeur native réelle (guideline 4.2, « minimum functionality ») — c'est exactement le rôle des §4 à §6. Une coque qui ne ferait qu'afficher le site serait refusée, et le mériterait.

---

## §2. PWA — l'app installable depuis le navigateur (jour 1)

**2.1 Manifeste** — `app/manifest.ts` (convention Next) :
`name` « Presti », `short_name` « Presti », `description` « Répondez à chaque demande de devis en moins d'une minute », `id` `/`, `start_url` `/dashboard?source=pwa`, `scope` `/`, `display` `standalone`, `display_override` `["standalone","minimal-ui"]`, `orientation` `portrait`, `lang` `fr`, `dir` `ltr`, `background_color` `#0A0C11`, `theme_color` `#0A0C11`, `categories` `["business","productivity"]`.
`icons` : 192 et 512 en `any` **et** en `maskable` (générés depuis `public/marque/presti-icone-512.png` ; pour le maskable, la marque dans une zone sûre de 80 % centrée sur fond nuit — vérifier sur maskable.app). `screenshots` : 2 portrait (`form_factor: narrow`) + 1 large, depuis `demo-captures`. `shortcuts` : « Messages » `/messages`, « Nouveau devis » `/devis?nouveau=1`, « Inventaire » `/inventaire`.

**2.2 Métadonnées** — `app/layout.tsx` : `export const viewport = { themeColor: '#0A0C11', width: 'device-width', initialScale: 1, viewportFit: 'cover' }` ; `metadata.appleWebApp = { capable: true, title: 'Presti', statusBarStyle: 'black-translucent' }` ; `metadata.applicationName = 'Presti'` ; `apple-touch-icon` déjà présent (`app/apple-icon.png`). **Uniquement sur les surfaces Presti** : le layout de `/site/[slug]` et `/p/[slug]` ne déclare ni manifeste ni `appleWebApp` (white-label — le test le vérifie).

**2.3 Service worker** — `@serwist/next` (compatible App Router, Next 15) :
- précache de l'enveloppe : CSS, polices, `public/marque/*`, page hors-ligne ;
- stratégie `NetworkFirst` sur les pages de la console avec repli sur `/hors-ligne` ;
- **`NetworkOnly` explicite sur `/api/*`, `/auth/*`, `/p/*`, `/site/*`** — aucune donnée personnelle ni aucune page d'artisan en cache, jamais ;
- mise à jour : `skipWaiting` désactivé, bandeau « Une nouvelle version est prête — Recharger » quand un SW attend ;
- `sw.ts` exclu de la CSP stricte ? Non : ajuster `worker-src 'self'` dans les en-têtes existants (`scripts/csp-smoke.mjs` le vérifie).

**2.4 Invitation à installer** — composant `app/InstallerApp.tsx` dans la console, **jamais** sur la landing publique ni sur les surfaces artisan :
- Android/Chrome : capter `beforeinstallprompt`, afficher une carte discrète « Installer Presti sur votre téléphone — recevez les demandes en direct » avec un bouton ; mémoriser le refus 30 jours ;
- iOS/Safari : détecter `navigator.standalone === false` + iOS → carte avec les 2 étapes (Partager → Sur l'écran d'accueil), avec l'icône Partager dessinée en SVG ;
- déjà installée (`display-mode: standalone`) ou dans Capacitor → rien.

**2.5 Comportement installé** : pas de barre d'adresse, donc **un bouton retour** dans l'en-tête de chaque page profonde de la console (déjà présent ? vérifier `Breadcrumb.tsx`) ; les liens externes (site de l'artisan, Stripe, fournisseurs) s'ouvrent avec `target="_blank"` ; `theme_color` accordé au fond.

**2.6 Test** `scripts/pwa-e2e.mjs` : manifeste valide et servi en `application/manifest+json`, icônes maskable présentes, Lighthouse « Installable », SW enregistré, `/hors-ligne` servie sans réseau, **aucune** réponse `/api` ni `/p/` dans le cache après un parcours complet, surfaces artisan sans manifeste. Ajouté à `tout-verifier` (coût `navigateur`).

---

## §3. Notifications push web (jour 1-2) — la raison d'être de l'app

**3.1 Données** — migration `0064_push.sql` : table `push_abonnements` (`id, artisan_id, type` `'web'|'ios'|'android'`, `endpoint` (web) / `jeton` (natif), `p256dh, auth` (web), `appareil` (libellé), `cree_le, dernier_succes, echecs`), RLS par artisan, index sur `artisan_id`. Préférences dans `artisans.notifications` (jsonb) : par événement, `push` / `email` / les deux / rien.

**3.2 Événements** (les mêmes points d'appel que les emails de `lib/notifications.ts`) : nouveau lead · nouveau message d'un client · proposition de l'assistant à valider · devis accepté · paiement reçu / échoué · crédits bas (20 %, 0) · assistant coupé (escalade). Chaque push : **titre + une ligne**, jamais le contenu du message, jamais l'adresse ni les photos — le détail est dans l'app. `url` de destination dans la charge utile (`/messages?lead=…`), `tag` par conversation (regroupement), `renotify` sur nouveau message.

**3.3 Envoi** — `lib/push.ts` : `web-push` avec VAPID (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:…` en variables Vercel), file d'envoi simple (les envois partent **après** la réponse HTTP, via `after()` ou un cron de rattrapage — un push ne doit jamais ralentir une conversation), 404/410 → abonnement supprimé, 3 échecs → désactivé. Plafond par artisan et par heure (`lib/limites.ts`) pour qu'un flood de leads ne devienne pas un flood de push.

**3.4 Abonnement** — dans **Paramètres → Notifications** : explication d'une phrase, bouton « Activer sur cet appareil », puis `Notification.requestPermission()` **au clic** (jamais au chargement) ; liste des appareils abonnés avec suppression unitaire ; bouton « M'envoyer un test ». Le SW gère `push` (affichage) et `notificationclick` (focus ou ouverture de l'URL). Sur iOS : possible **uniquement si Presti est installée sur l'écran d'accueil** (iOS 16.4+) — l'interface le dit et renvoie vers la carte d'installation.

**3.5 Test** `scripts/push-e2e.mjs` : abonnement enregistré, envoi simulé reçu par un SW de test, purge d'un endpoint 410, plafond respecté, aucune donnée personnelle dans la charge utile (assertion sur le JSON).

---

## §4. Capacitor — la coque native (jours 2-5)

**4.1 Initialisation** — `mobile/` avec `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` (version stable courante — vérifier `npm view @capacitor/core version` et lire les notes de migration si ≥ 8). `capacitor.config.ts` :

```ts
import type { CapacitorConfig } from '@capacitor/cli'
const config: CapacitorConfig = {
  appId: 'fr.prestiapp.app',
  appName: 'Presti',
  webDir: 'www',                                   // page de secours hors-ligne uniquement
  server: { url: 'https://qg.prestiapp.fr', cleartext: false, allowNavigation: ['qg.prestiapp.fr', 'prestiapp.fr'] },
  ios: { contentInset: 'automatic', scheme: 'Presti', limitsNavigationsToAppBoundDomains: true },
  android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: false },
  plugins: { SplashScreen: { launchAutoHide: false, backgroundColor: '#0A0C11' }, PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] }, Keyboard: { resize: 'body' } },
}
export default config
```

Variante `capacitor.config.dev.ts` (`server.url` = URL de prévisualisation Vercel, `webContentsDebuggingEnabled: true`) sélectionnée par variable d'environnement, jamais committée en prod.

**4.2 Le pont web ↔ natif** — `lib/natif.ts` (côté web, chargé par la console) :
```ts
export const estNatif = () => typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.()
export const plateforme = (): 'ios' | 'android' | 'web' => …
```
Chaque fonctionnalité a **un chemin natif et un repli web**, choisis à l'exécution : push (natif ↔ web-push), caméra (`@capacitor/camera` ↔ `<input type=file capture>`), scan (`@capacitor-mlkit/barcode-scanning` ↔ `BarcodeDetector`), partage (`@capacitor/share` ↔ `navigator.share` ↔ copie du lien), biométrie (natif uniquement, sinon rien). Les plugins sont injectés par la coque (`Capacitor` global) : le code web ne les importe pas en dur — il les lit sur `window.Capacitor.Plugins` derrière `estNatif()`, pour que le bundle web reste inchangé.

**4.3 Plugins** (chacun avec son usage précis et son test) :

| Plugin | Usage | Repli web |
|---|---|---|
| `@capacitor/push-notifications` | jeton APNs/FCM → `push_abonnements` (`type` ios/android) ; tap → navigation vers l'URL de la charge utile ; badge = nombre de conversations non lues | web-push (§3) |
| `@capacitor/camera` | photos de chantier (inventaire, fiche client), qualité 80, redimensionnement 1600 px **avant** envoi, EXIF strippé côté serveur (existe) | `<input capture>` |
| `@capacitor-mlkit/barcode-scanning` | scan code-barres de l'inventaire (existe côté web via `BarcodeDetector`, absent sur Safari) — le natif règle le cas iPhone | `BarcodeDetector` puis saisie |
| `capacitor-native-biometric` (ou `@aparajita/capacitor-biometric-auth`) | **rouvrir** une session déjà vérifiée par Face ID / empreinte : le jeton de rafraîchissement est rangé dans le trousseau (`@capacitor-community/secure-storage` / Keychain / Keystore), jamais en `localStorage` en natif ; après 5 min d'arrière-plan → verrou biométrique ; échec → mot de passe + code email (v7). **Jamais** à la place du second facteur. | rien |
| `@capacitor/share` | partager un devis PDF, le lien de sa plateforme | `navigator.share` / copie |
| `@capacitor/haptics` | retour léger sur validation d'une proposition, envoi d'un devis, scan réussi | rien |
| `@capacitor/status-bar`, `@capacitor/splash-screen` | barre sombre, écran de lancement nuit + aube corail, masqué **quand la première page est rendue** (événement du web), pas sur minuterie | — |
| `@capacitor/keyboard` | `resize: 'body'` + événements pour que le composeur reste visible (v8 A1.7) | `visualViewport` |
| `@capacitor/app` | liens profonds, retour Android (ferme un tiroir avant de quitter une page), état arrière-plan/premier plan (rafraîchir la boîte au retour) | — |
| `@capacitor/network` | bandeau « hors ligne » + désactivation des envois | `navigator.onLine` |

**4.4 Liens profonds** — Universal Links (iOS) et App Links (Android) sur `qg.prestiapp.fr/*` **uniquement** : `public/.well-known/apple-app-site-association` (`applinks`, `paths` `["/messages*", "/devis*", "/factures*", "/inventaire*", "/parametres*", "/dashboard*"]`, **jamais** `/p/*` ni `/site/*`) et `public/.well-known/assetlinks.json` (SHA-256 du certificat de signature). Un email de notification (« un client vous a écrit ») ouvre donc l'app si elle est installée. Servis avec le bon `Content-Type`, sans redirection (test).

**4.5 Icônes et écrans de lancement** — `@capacitor/assets` depuis `mobile/resources/` : `icon.png` 1024×1024 (l'aube corail sur nuit, zone sûre respectée), `icon-foreground.png` / `icon-background.png` (adaptive Android), `splash.png` 2732×2732 (fond nuit, marque centrée, sans texte) + variante sombre. Les sources viennent de `public/marque/` — pas de nouvelle marque.

**4.6 Sécurité en WebView** :
- **Le jeton en cookie `httpOnly`** (ouvert depuis l'audit v4, migration `@supabase/ssr`) devient **prioritaire** avant la première soumission aux stores : en WebView, un `localStorage` est plus exposé qu'en navigateur ; et en natif, le jeton de rafraîchissement va au trousseau (4.3).
- `allowNavigation` restreint ; toute URL hors `*.prestiapp.fr` → `Browser.open` (navigateur système) ; `webContentsDebuggingEnabled: false` en prod ; pas de `cleartext` ; ATS iOS par défaut ; CSP inchangée.
- `App.addListener('appUrlOpen')` valide l'URL (même origine) avant de naviguer.
- Aucune clé (Firebase server key, APNs, VAPID privée) dans `mobile/` ni dans le bundle : `google-services.json` et `GoogleService-Info.plist` **sont** dans le dépôt (ce sont des identifiants publics côté client), la clé serveur Firebase est une variable Vercel.

**4.7 Version et publication** — `versionName` = version du `package.json` web, `versionCode`/`build` incrémenté par le pipeline ; `mobile/README.md` explique en français : construire en local (Android Studio ; Xcode sur Mac), signer, tester, publier ; où sont les secrets ; comment publier une mise à jour **web** (rien à faire) vs **native** (nouveau build store).

---

## §5. Compilation et distribution

**5.1 Android — GitHub Actions** (`.github/workflows/android.yml`) : à chaque `main`, `cap sync android` + `gradle assembleDebug` → APK en artefact (installable sur le téléphone de Benj pour tester) ; sur tag `mobile-v*`, `bundleRelease` signé (keystore en secret GitHub, **jamais** dans le dépôt) → AAB en artefact, puis upload en **test interne** Play via `r0adkll/upload-google-play` avec un compte de service.

**5.2 iOS — Codemagic** (`mobile/codemagic.yaml`) : Benj est sur Windows, **aucun build iOS n'est possible localement**. Codemagic (plan gratuit : 500 min/mois de macOS, suffisant pour démarrer) : `cap sync ios` + `xcodebuild archive` avec signature automatique via clé App Store Connect API, export `.ipa`, upload **TestFlight**. Déclenché sur tag `mobile-v*`. Alternative si Benj a accès à un Mac : Xcode + `fastlane match`, même résultat.

**5.3 Parcours de test** — avant toute soumission, sur **de vrais appareils** (un Android, un iPhone), le parcours `plans/demo-parcours.md` rejoué dans l'app : installation → ouverture (écran de lancement → connexion) → mot de passe + code email → activation des notifications → verrou Face ID → une conversation réelle depuis un autre téléphone → **la push arrive** → tap → la conversation s'ouvre → prise de main → devis → partage du PDF → photo de chantier → scan d'un code-barres → arrière-plan 10 min → retour avec verrou. Chaque étape cochée dans `mobile/TESTS.md` avec la date et l'appareil.

**5.4 Fiches store** (contenu à préparer, à soumettre par Benj) :
- **App Store Connect** : nom « Presti », sous-titre (30 car.) « Répondez à vos clients en 1 minute », catégorie Business, description FR, mots-clés, captures 6,9" et 6,5" + iPad (depuis `demo-captures` recadrées dans un cadre d'appareil, sans fausse barre de statut), URL confidentialité (existe), URL support (`/contact`), **App Privacy** renseignée depuis le registre des traitements (identifiants, coordonnées, contenu utilisateur, diagnostics), **compte de test** pour la relecture (compte démo dédié, Signature, données réelles non sensibles, mot de passe transmis dans les notes de relecture), note expliquant la valeur native (push, caméra, Face ID) — c'est ce qui passe la guideline 4.2.
- **Play Console** : fiche FR, captures, Data safety (même source), politique de confidentialité, classification de contenu, déclaration « accès à la caméra pour photos de chantier et scan ».

---

## §6. Ce que l'app fait mieux que le site (et qui justifie tout ça)

À livrer réellement, pas seulement à promettre :
1. **La notification en moins d'une seconde** quand un client écrit — avec le badge sur l'icône. C'est la fonctionnalité que les artisans citent en premier.
2. **Face ID pour rouvrir** — un artisan ouvre l'app 20 fois par jour, sur chantier, avec des gants parfois : pas de mot de passe à retaper.
3. **Photo et scan en un tap** depuis la fiche client ou l'inventaire.
4. **Partage natif** du devis PDF (WhatsApp, Mail, AirDrop) — le canal réel des artisans.
5. **Le bandeau hors-ligne** honnête : on lit ce qui est chargé, on ne prétend pas envoyer.

Chaque point a un test ou une étape du parcours 5.3. Rien de ce qui n'est pas prêt n'apparaît (drapeaux `lib/flags.ts`).

---

## §7. Tests et vérification

- `scripts/pwa-e2e.mjs`, `scripts/push-e2e.mjs` (§2.6, §3.5) dans `tout-verifier`.
- `scripts/liens-profonds-e2e.mjs` : AASA et assetlinks servis, bon `Content-Type`, chemins white-label absents.
- `mobile/scripts/smoke-android.mjs` : build debug, lancement sur émulateur (GitHub Actions `reactivecircus/android-emulator-runner`), capture d'écran de `/login`, vérification `logcat` sans erreur Capacitor, réception d'une push de test via FCM.
- iOS : le smoke est **manuel sur TestFlight** (pas d'émulateur en CI sans Mac), consigné dans `mobile/TESTS.md`.
- Un auditeur indépendant (`presti-audit-attaque`) sur la coque : `allowNavigation` contournable ? jeton accessible depuis la WebView ? lien profond forgé vers `/p/` ? push avec charge utile malveillante ? secrets dans l'APK (`apkanalyzer`, `strings`) ?
- Ajout au digest hebdo (v6 §8) : abonnements push actifs, taux d'échec d'envoi, version d'app la plus installée, crashs (Firebase Crashlytics en option — à décider, ce n'est pas indispensable au départ).

---

## §8. Jalons

| Jalon | Contenu | Terminé quand |
|---|---|---|
| **J1** | §2 PWA | Lighthouse « Installable », installée sur l'Android **et** l'iPhone de Benj (captures dans le journal) |
| **J2** | §3 push web | une vraie push reçue sur son Android, puis sur son iPhone (installée) |
| **J3** | §4.1-4.5 coque + plugins, Android | APK debug installé, parcours 5.3 complet sur Android |
| **J4** | §4.6 sécurité + cookie `httpOnly` | auditeur attaque vert ; `rls-e2e` et `code-connexion-e2e` rejoués verts |
| **J5** | §5.1 pipeline Android + test interne Play | AAB en test interne, installable depuis le Play Store (lien testeurs) |
| **J6** | §5.2 iOS via Codemagic + TestFlight | build TestFlight installé sur l'iPhone de Benj, parcours 5.3 |
| **J7** | §5.4 fiches + soumission | soumis aux deux stores ; réponses aux relecteurs suivies dans le journal |

Ordre de grandeur honnête : J1-J2 en 1-2 jours, J3-J5 en 3-4 jours, J6 dès que M1 et M5 sont prêts, J7 + relecture Apple 1 à 7 jours (un refus 4.2 se répond avec la note de valeur native et une vidéo du parcours).

---

## §9. LISTE HUMAINE — Benj, en parallèle, dès aujourd'hui

| # | Action | Coût / délai | Débloque |
|---|---|---|---|
| M1 | **Apple Developer Program**, compte **organisation** (D-U-N-S avec le SIREN — la demande D-U-N-S peut prendre 1-2 semaines, à lancer en premier) | 99 $/an | TestFlight, App Store, APNs, Universal Links |
| M2 | **Google Play Console** (compte développeur, vérification d'identité) | 25 $ une fois | Play Store, App Links |
| M3 | Projet **Firebase** « Presti » : app Android (`fr.prestiapp.app`) + app iOS ; télécharger `google-services.json` et `GoogleService-Info.plist` dans `mobile/` ; générer une **clé APNs (.p8)** dans Apple Developer et la déposer dans Firebase ; clé serveur Firebase Admin → variable Vercel `FIREBASE_SERVICE_ACCOUNT` | gratuit | Push natives |
| M4 | **Clés VAPID** : Claude Code les génère (`npx web-push generate-vapid-keys`) ; Benj pose `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` dans Vercel | gratuit | Push web |
| M5 | **Codemagic** (compte + connexion au dépôt GitHub + clé App Store Connect API) — ou un Mac avec Xcode | gratuit (500 min/mois) | Builds iOS |
| M6 | **Keystore Android** : généré par Claude Code, **sauvegardé par Benj** hors du dépôt (gestionnaire de mots de passe) — perdu = impossible de mettre à jour l'app sur le Play Store | — | Signature release |
| M7 | Deux téléphones de test (un Android, un iPhone) + un second téléphone pour jouer le client | — | Parcours 5.3 |
| M8 | Vérifier la **disponibilité du nom « Presti »** sur les deux stores (l'homonyme presti.ai peut gêner) ; prévoir « Presti — Artisans » en repli | — | Fiches |

---

## §10. Décisions à trancher (une seule fois, au début)

1. **Nom sur les stores** : « Presti » ou « Presti — Artisans » ? *(Reco : essayer « Presti », repli prêt.)*
2. **Verrou biométrique** : après 5 min d'arrière-plan (reco) ou à chaque ouverture ?
3. **Crashlytics** : maintenant ou après les premiers retours ? *(Reco : après — un service de plus à configurer, peu de valeur tant qu'il y a 10 utilisateurs.)*
4. **Android d'abord** (tout se teste sans Mac) puis iOS dès M1/M5 prêts ? *(Reco : oui, c'est l'ordre naturel.)*

---

## Format à chaque étape
Vérifié · Trouvé (preuve : capture d'appareil, `logcat`, réponse HTTP) · Corrigé (test rouge → diff → test vert, commit) · Preuve en prod / sur appareil · Journal (ligne + cumul, « appels IA : 0 ») · Suivant — et l'action humaine qui bloque **cette** ligne pendant que les autres avancent.
