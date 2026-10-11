# CONTRAT.md — ce que `search-console-qa.mjs` exige (fiche 026-199, pour 026-201)

Le cahier SC-1 à SC-8 dit ce qui est jugé ; la fiche 026-201 dit « tout le monde extérieur injecté : `fetch`, stockage, horloge, adresses de base » sans nommer les champs. Le juge, lui, doit les nommer pour injecter ses faux. Ce fichier les fixe, une fois, pour qui écrit `lib/sites/searchConsole.ts` et l'appel dans `lib/siteLivraison.ts`. Les noms ci-dessous sont **[choix du juge]** : le cahier n'en pose aucun.

## Le module `lib/sites/searchConsole.ts` (exports nommés)

`jetonCompteService(env, deps)` et `soumettreSiteSearchConsole(commande, deps)` — chacun peut s'écrire `export function`, `export async function`, `export const … =` ou `export { … }`. `deps` (toutes les entrées sont facultatives en production : un défaut réel les remplace ; le juge les pose toutes) :

| champ | rôle | défaut de production |
|---|---|---|
| `env` | l'environnement (`GSC_COMPTE_SERVICE`, JSON en base64 : `client_email`, `private_key`) | `process.env` |
| `fetch` | tous les appels réseau, sans exception | `globalThis.fetch` |
| `maintenant()` | l'horloge (`Date`) : `iat`, `exp` et `search_console_le` | `() => new Date()` |
| `jetonUrl` | le point de jeton OAuth (`aud` du JWT et cible de l'échange) | `https://oauth2.googleapis.com/token` |
| `verificationBase` | l'API de vérification de site, **sans** le chemin final | `https://www.googleapis.com/siteVerification/v1` |
| `searchBase` | l'API de la Search Console, **sans** le chemin final | `https://www.googleapis.com/webmasters/v3` |
| `stockage.ecrire(bucket, chemin, contenu)` | l'écriture du fichier de vérification | l'écriture dans le bucket `sites` |
| `mettreAJour(id, patch)` | la mise à jour de la ligne `sites_commandes` | l'update Supabase |

Les chemins que le module ajoute aux bases : `POST <verificationBase>/token` (corps `{ site: { type: 'SITE', identifier: 'https://<domaine>/' }, verificationMethod: 'FILE' }`, réponse `{ token }` : le nom du fichier) ; le fichier `<commande>/<nom>` du bucket `sites`, contenu `google-site-verification: <nom>` ; `POST <verificationBase>/webResource?verificationMethod=FILE` ; `PUT <searchBase>/sites/<site encodé>` ; `PUT <searchBase>/sites/<site encodé>/sitemaps/<https://<domaine>/sitemap.xml encodé>` ; puis `mettreAJour(commande.id, { search_console_le: <maintenant().toISOString()> })`, **seulement après** ce dernier 2xx. L'en-tête `Authorization: Bearer <jeton d'accès>` sur tous les appels après le jeton ; le JWT : `RS256` (`node:crypto`), `iss` = `client_email`, `scope` = `https://www.googleapis.com/auth/siteverification https://www.googleapis.com/auth/webmasters`, `aud` = `jetonUrl`, `iat` = l'horloge, `exp` = `iat + 3600`, échangé par `POST jetonUrl` (formulaire `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` et `assertion`).

Retours : `jetonCompteService` → `{ ok: true, jeton }` ou `{ ok: false, raison }` (sans `GSC_COMPTE_SERVICE` → `raison: 'sans_compte'`, **aucun appel réseau** ; jeton refusé → `jeton_refuse`) ; `soumettreSiteSearchConsole` → `{ ok, etape, raison? }` (`etape: 'sans_objet'` pour `domaine_mode = 'aucun'` ou `search_console_le` déjà posé, **aucun appel** ; un refus 4xx/5xx de Google → `{ ok: false, etape, raison }` et **rien de posé**). Jamais d'exception vers l'appelant, jamais le jeton, la clé ni l'assertion dans une console, une erreur ou un retour.

## Le tour de livraison (`tourLivraison(deps)` de `lib/siteLivraison.ts`)

Le juge charge le VRAI fichier, avec des doublures pour tous ses autres imports `@/lib/…`, et appelle `tourLivraison(deps)` avec `deps = { base, enPause, maintenant, envoyer, searchConsole }` : **`deps.searchConsole` est l'objet `deps` ci-dessus, tendu tel quel à `soumettreSiteSearchConsole`** (le type `Dependances` du tour gagne ce champ facultatif ; sans lui, le défaut de production s'applique). `base` est une table `sites_commandes` d'essai (`select`, `eq`, `is`, `lt`, `in`, `order`, `limit`, `update(…).eq(…)`).

Dans le tour, hors pause (`deps.enPause()` vraie → aucun appel), dans son propre `try`, après les étapes existantes : jusqu'à **3** commandes `etat = 'en_ligne'`, `search_console_le` nul, `domaine_mode ≠ 'aucun'` et moins de 3 essais ; un échec compte un essai dans `verifications.search_console_essais` de la commande (les autres clés de `verifications` sont conservées) ; au 3e échec, plus d'essai automatique (la ligne « À faire » et le bouton « Plan soumis » de 026-078 restent le repli : aucun motif d'alerte nouveau).

## Ce que le juge prouve sur lui-même

`auto-controle.mjs` : le faux Google vérifie réellement la signature RS256 (une clé de 2048 bits tirée à chaque passage), refuse quatre claims fautifs signés, refuse un jeton d'accès invalide, rend une vraie panne 503 ; `--preuve-echecs` plante des fautes dans le témoin (`temoin-module.mjs`, `temoin-tour.mjs` ; la table `fautes` de `search-console-qa.mjs`) et chacune doit mettre son critère au rouge. Clé factice en mémoire, aucun appel hors de `127.0.0.1`.
