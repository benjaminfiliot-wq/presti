# Presti — la coque native (Android, iOS)

L'application Presti est **la console de l'artisan** (`https://qg.prestiapp.fr`) chargée dans une WebView native, avec ce qu'un téléphone apporte vraiment : notifications, caméra, Face ID / empreinte, partage. **Un seul code** : le Next.js du dépôt. Une mise à jour web est une mise à jour de l'app, sans passer par les stores.

Ce dossier ne contient que la coque : `capacitor.config.ts`, les projets natifs générés (`android/`, plus tard `ios/`), les images sources (`resources/`) et la page de secours hors-ligne (`www/`). Aucune clé, aucun secret.

## Ce qui est où

| Fichier | Rôle |
|---|---|
| `capacitor.config.ts` | l'adresse chargée (`server.url`), les hôtes autorisés, les plugins. `PRESTI_MOBILE_URL` et `PRESTI_MOBILE_DEBUG` (variables de la machine qui compile) servent à viser une prévisualisation ou un serveur local — jamais committés. |
| `www/` | la page « Vous êtes hors ligne » que la coque affiche quand la console ne répond pas (`server.errorPath`). |
| `resources/` | icône 1024, icône adaptative (premier plan + fond nuit), écran de lancement 2732. Générés depuis `public/marque/` par `node` + `sharp` ; `npx capacitor-assets generate --android` les décline dans `android/`. |
| `android/` | le projet Android Studio, **committé**. `app/build.gradle` lit la version (`versionName` = version du `package.json` web) et la signature dans des variables d'environnement. |
| `../lib/natif.ts` | côté web : « suis-je dans la coque ? », partage, haptique, ouverture externe — avec repli navigateur. |

## Compiler

**Sans rien installer : GitHub Actions** (`.github/workflows/android.yml`). Chaque push sur `main` qui touche `mobile/` produit **l'APK de debug** en artefact (onglet Actions → le run → *presti-debug-apk*). Téléchargez-le sur le téléphone, autorisez l'installation d'apps inconnues pour ce navigateur, ouvrez-le.

**En local (Android Studio)** : ouvrir `mobile/android`, laisser Gradle se synchroniser, *Run*. Avant : `cd mobile && npm ci && npx cap sync android`.

**iOS** : il faut un Mac ou Codemagic (`codemagic.yaml`, à venir avec M5). `npx cap add ios` puis Xcode.

## Signer et publier (Android)

1. **Keystore** (M6) : généré une fois, **sauvegardé hors dépôt** par Benj (gestionnaire de mots de passe). Perdu = impossible de mettre à jour l'app sur le Play Store.
   ```bash
   keytool -genkeypair -v -keystore presti-release.keystore -alias presti -keyalg RSA -keysize 2048 -validity 10000
   ```
2. **Secrets GitHub** (Réglages → Secrets → Actions) : `ANDROID_KEYSTORE_BASE64` (le fichier en base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Plus tard `PLAY_SERVICE_ACCOUNT_JSON` pour l'envoi en test interne.
3. **Tag** `mobile-v1.0.0` → le workflow produit **l'AAB signé** (`versionCode` = numéro du run). Play Console → Test interne → déposer l'AAB, ou laisser l'étape `upload-google-play` (commentée dans le workflow) le faire.

## Mettre à jour

- **Le web** (écrans, routes, corrections) : un déploiement Vercel, rien d'autre. L'app affiche la nouvelle version au prochain chargement.
- **La coque** (nouveau plugin, permission, icône, version Capacitor) : `npx cap sync android`, commit, puis un nouveau build store (tag `mobile-v…`).

## Sécurité

- `allowNavigation` : seulement `qg.prestiapp.fr` et `prestiapp.fr`. Tout autre hôte s'ouvre dans le navigateur système (`lib/natif.ts → ouvrirExterne`).
- Pas de `cleartext`, débogage WebView désactivé en prod, ATS iOS par défaut, CSP inchangée.
- Aucune clé dans l'APK : les fichiers Firebase (`google-services.json`, `GoogleService-Info.plist`) sont des identifiants publics côté client ; la clé serveur Firebase est une variable Vercel.
- Jeton de session : voir J4 (cookie `httpOnly`, trousseau natif pour le jeton de rafraîchissement).

## Vérifier

`mobile/TESTS.md` : le parcours complet sur de vrais appareils, coché avec la date et l'appareil. Les suites web (`scripts/pwa-e2e.mjs`, `scripts/push-e2e.mjs`) couvrent ce que la coque charge.
