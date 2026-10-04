# 026-249 — contre-vérification du 04/10 (le Vigile)

Quatre sabotages **réversibles** du code de production, jugés par `scripts/vigile-qa.mjs --racine=<copie> --partie=<partie du critère>`. Méthode : une copie de la production est construite comme `construireTemoin` du juge (`lib/`, la route, le script, les deux unités, `vigile.md`, `vigile.json`) ; le fichier visé est modifié dans la copie, jugé, **restauré octet pour octet depuis la production** (sha256 contrôlé), puis la même partie est rejouée. Les fichiers du dépôt ne sont jamais ouverts en écriture : les sha256 des 8 fichiers de la fiche sont relevés au départ et à la fin.

| n | critère visé | partie | fichier | sabotage | sabotage jugé | autres critères rouges | restauré (sha256) | partie rejouée |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | VG-12 | pause | `lib/vigile/releve.ts` | Matt (chef) retiré de la liste en dur des cibles interdites | **rouge** : CIBLES_INTERDITES de releve.ts : ["pont","pont_telegram","systeme","a0","usine","vigile"] (exactement chef, pont, pont_… | aucun | identique | verte (75 s) |
| 2 | VG-6 | usine | `scripts/vigile/releve.mjs` | le jeton du Vigile transmis à npm (environnement complet au lieu de PATH, HOME, LANG) | **rouge** : faux-npm.mjs : le jeton est dans l'environnement de l'enfant ; environnement de npm : PATH, HOME, LANG, PRESTI_JETON_VI… | aucun | identique | verte (158 s) |
| 3 | VG-3 | serveur | `app/api/agents/vigile/route.ts` | la route ouverte à tout agent (le refus hors_perimetre supprimé) | **rouge** : a0 : 200, 403 attendu (« {"le":"2026-10-01T04:50:00.000Z","bannissements":{"etat":"mesure","poses_24h":5… ») ; jeton de… | aucun | identique | verte (10 s) |
| 4 | VG-4 | serveur | `lib/vigile/sources.ts` | une requête recopiée sur ip_bans dans sources.ts au lieu de la lecture bans() du Poste | **rouge** : lib/vigile/sources.ts : .from( (une requête recopiée au lieu de la lecture partagée) ; lib/vigile/sources.ts nomme ip_b… | VG-3 | identique | verte (14 s) |

## sha256 (production = copie restaurée)

| fichier | sha256 de la production, au départ | à la fin |
| --- | --- | --- |
| `lib/vigile/releve.ts` | `e5cb9c5930cd0ebfb7534eac9db53535bf83074ce3bfb31c4f2f5121e1cdcee6` | identique |
| `lib/vigile/serveur.ts` | `b62e0f53f6d8c6fae786edface32ba1447d9bc966b42d6905394795bfa14a1ff` | identique |
| `lib/vigile/sources.ts` | `6ee06946753a14930d7b6a8c416f14f2984b0aabbd497581d36b716ce7b44de5` | identique |
| `app/api/agents/vigile/route.ts` | `1f8294964846805be079a4b7455d2c9e4db05f2c7c441db577e488a3421cc8f5` | identique |
| `scripts/vigile/releve.mjs` | `6f62ff32532c8853162d59337c2a13c341872448acd040b3c21fce64784eee7a` | identique |
| `scripts/usine/systemd/presti-vigile.service` | `511cd3cceb9cd4e4857de3f196aa3c03708c95cdd5d69595dc0867832ef0b6f5` | identique |
| `scripts/usine/systemd/presti-vigile.timer` | `41dc8a8bb1d7f610635e66109fb5e9386096ceef0969fc4b1fc66d056ef3299c` | identique |
| `lib/pilotage/salles/securite.ts` | `80fd32381b66b1592fe9c2faf98f1db8323a2a943f458d6083d84521ba967d6d` | identique |

## Sabotages (texte exact)

1. `lib/vigile/releve.ts` : `Object.freeze(['chef', 'pont', 'pont_telegram'` → `Object.freeze(['pont', 'pont_telegram'` (sha256 du fichier saboté dans la copie : `dec3fc6a0e1d8cac…`)
2. `scripts/vigile/releve.mjs` : `ARGS_NPM, { cwd: o.depot, env: envReduit(env),` → `ARGS_NPM, { cwd: o.depot, env,` (sha256 du fichier saboté dans la copie : `b01a21d58f4c705c…`)
3. `app/api/agents/vigile/route.ts` : `if (agent.nom !== 'vigile')` → `if (false)` (sha256 du fichier saboté dans la copie : `03d05fe622d2d351…`)
4. `lib/vigile/sources.ts` : `bans: () => bans(),` → `bans: async () => (await supabaseAdmin.from('ip_bans').select('ip, raison, auto, created_at, expires_le').limit(200)).data,` (sha256 du fichier saboté dans la copie : `0bb3befd26a7e2b9…`)

**Verdict : les quatre sabotages sont pris (chacun rougit son critère), les quatre restaurations sont identiques au sha256, les quatre parties rejouées sont vertes, rien du dépôt n'a bougé.**
