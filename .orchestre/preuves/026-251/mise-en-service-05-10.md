# 026-251 — mise en service des postes, suite du 05/10/2026 (Claude Code, agent Sonnet)

Autorité : l'ordre de Benj du 05/10 matin (« tu es autorisé, tu as toutes les clés, fais-le seul ; 7 : je n'ai rien ») et D-0410-15. Gestes root par `gardien`. La migration 0115 était déjà appliquée (voir `mise-en-service.md`, même dossier).

## Fait

| # | Geste | Preuve |
|---|---|---|
| 1 | Jeton `vigile` créé par `scripts/agents-jeton.mjs` et posé au coffre de l'usine sans être affiché : `node scripts/usine-coffre.mjs poser-jeton-agent vigile` | « PRESTI_JETON_VIGILE : jeton posé, jamais affiché » ; `usine-coffre.mjs noms` liste `PRESTI_JETON_VIGILE` |
| 2 | Jeton `qualite_sites` posé sous `PRESTI_JETON_QUALITE` (même outil, même règle) | « PRESTI_JETON_QUALITE : jeton posé, jamais affiché » ; le nom est au coffre |
| 3 | Minuteur : `PRESTI_USINE=gardien@88.96.53.3 node scripts/usine-agents.mjs installer vigile` (clé du gardien) : `presti-vigile.service` et `.timer` copiés, `systemd-analyze` sans erreur, timer activé | `systemctl list-timers` : `presti-vigile.timer`, prochain passage 06/10 04:50 UTC (6 h 50 Paris) |
| 4 | Première passe du Vigile, en lecture seule : `systemctl start presti-vigile.service` par gardien | `Result=success`, `ExecMainStatus=0` ; journal : « vigile : relevé du 2026-10-05, niveau orange (gabarit), code 0 » ; relevé `~agents/travail/vigile/releves/2026-10-05.json` relu : les cinq sections (`erreurs`, `dependances`, `conseiller`, `echeances`, `bannissements`) à l'état `mesure`, dont `conseiller` (0115 appliquée), `alertes: []`, `pauses: []`, `pauses_ecartees` toutes à 0 ; coffre : aucun manquant ; aucune adresse ni valeur dans le relevé |

Constats du relevé (niveau orange, à lire, rien de grave) : 1 erreur applicative en 24 h ; `presti-chef-plein.service` en échec sur l'usine (autre session, 026-148 ; voir ci-dessous) ; `npm audit` : 3 vulnérabilités « high » (brace-expansion, browserslist) avec correctif disponible, 1 « moderate » ; conseiller Supabase : `function_search_path_mutable` 10, `rls_enabled_no_policy` 31, `unindexed_foreign_keys` 33 ; certificat TLS de prestiapp.fr valide 51 jours ; cinq échéances du registre « inconnues » (META_PAGE_TOKEN, PUBLORA_API_KEY, GITHUB_DISPATCH_TOKEN, LIVRAISON_ENV, GSC_COMPTE_SERVICE).

## Pas fait

- **Jeton `tresorier`** : attend la clé Stripe (consigne) et une graine : `ops.agents` n'a pas `tresorier` (constat du matin, `mise-en-service.md`) ; à décider par le chef.
- **Clé Stripe restreinte** : à Benj, voir `reste-pour-benj.md`.
- **Première passe du Contrôleur qualité** sur les sites livrés : hors de ma consigne ; le jeton est posé, la commande est dans la fiche (étape 7).
- **Pause de sécurité du Vigile** : reste inerte (`accord: null` dans `vigile.json`), seuils à confirmer par Benj.
- **Passage de 6 h 50 du lendemain** (VG-R2 veut un relevé de moins de 26 h) : à regarder le 06/10 avant le PASS.

## Les juges de `verifier` (sortie : `verifier-05-10.log`, même dossier)

| Juge | Résultat |
|---|---|
| `node scripts/pilotage-sql-qa.mjs --migration=postes --reel` | code 2 : « appel refusé — `--migration=lecture|echanges|station|reglages` attendu » : l'extension du juge (préalable 1 de la fiche, `--migration=postes`, hors série) n'est pas faite ; la fiche m'interdit de toucher à ce juge |
| `node scripts/usine-socle-qa.mjs --groupe=coffre,socle` | FAIL CF-10, SO-6, SO-9 : le juge connaît encore 11 noms et 6 groupes (préalable 2 non fait) ; il refuse `PRESTI_JETON_VIGILE/QUALITE/SAV`, les groupes `sav`, `qualite` et `vigile` ; le code et le doc sont conformes à la fiche, c'est le juge qui est en retard |
| `node --import ./scripts/ts-loader.mjs scripts/station-logique-qa.mjs --partie=modules` | PASS (SM-1 à SM-2, EQ-1 à EQ-6 : vingt-huit titulaires ; tsc vert) |
| `node scripts/vigile-qa.mjs --reel` | PASS |

Les deux premiers juges rougissent donc sur un préalable de chef (extension de juge « hors série »), pas sur la mise en service.

## Autre constat (hors fiche)

`presti-chef-plein.service` : échec à 08:01 UTC (« ✗ événements illisibles (HTTP 200) »), puis arrêté à 08:18 par un ordre extérieur (statut 143) ; installé par une autre session (chef, 026-148). Le Vigile le remonte déjà dans `unites_usine_en_echec`.
