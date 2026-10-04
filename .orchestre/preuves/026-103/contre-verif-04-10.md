# 026-103 — contre-vérification du 04/10/2026 (Claude Code)

Le juge `node scripts/station-reunion-qa.mjs` est rejoué sur l'USINE (`node scripts/usine.mjs executer --nom=reunion-sab-1`, bac
gelé `~/bacs/reunion-sab-1`, état du PC en paquet) contre des COPIES saboteuses des fichiers de la fiche, posées dans un dossier
temporaire du bac et jugées par `--racine=<copie>`. Aucun fichier du bac ni du dépôt n'est modifié : les sha256 des quatre fichiers
sont relevés avant et après (égaux). Sabotages construits par remplacement exact d'un texte (un sabotage « sans effet », c'est-à-dire
dont le texte à remplacer est introuvable, ferait échouer la contre-vérification : aucun ne l'a été).

Témoin : les trois fichiers copiés tels quels (script, notice, schéma) → `station-reunion-qa : PASS` (le banc des sabotages n'est pas
lui-même fautif).

| # | fichier saboté | sabotage | critère(s) en échec | attendu |
|---|---|---|---|---|
| S1 | `scripts/chef/reunion.mjs` | `finally` sans abandon (`if (id && !close)` → `if (false && …)`) | RU-3, RU-4, RU-6 | RU-3 : PRIS |
| S2 | `scripts/chef/reunion.mjs` | environnement du modèle ouvert (le filtre sur le jeton, `PRESTI_*`, `TOKEN`… retiré) | RU-8 | RU-8 : PRIS |
| S3 | `scripts/chef/reunion.mjs` | délai : l'arbre du modèle n'est plus tué | RU-4 | RU-4 : PRIS |
| S4 | `scripts/chef/reunion.mjs` | un plan fautif n'est plus refusé (`if (fautes.length)` → `if (false)`) | RU-3 | RU-3 : PRIS |
| S5 | `docs/agents/chef-reunion.schema.json` | `ligne.maxLength` 140 → 141 (derrière `$ref` : le correctif du juge) | RU-9 | RU-9 : PRIS |
| S6 | `docs/agents/chef-reunion.schema.json` | `lancer` → `lancerx` (les `const` des `prefixItems` sous `anyOf`) | RU-9 | RU-9 : PRIS |
| S7 | `docs/agents/chef-reunion.schema.json` | clé d'idée `{3,75}` → `{3,76}` (pattern derrière deux `$ref`) | RU-9 | RU-9 : PRIS |
| S8 | `docs/agents/reunion.md` | l'heure (« 18 h ») retirée de la notice | RU-10 | RU-10 : PRIS |

Huit sabotages, huit pris (code 1, le critère attendu en échec). S5 à S7 prouvent que le correctif de RU-9 (suivre `$ref` et `allOf`,
lire les `const` des `prefixItems`) n'a rien assoupli : un schéma du dépôt qui s'écarte d'une borne fait toujours échouer le juge.

sha256 avant = après (relevés sur l'usine, égaux à ceux du PC) :

- `scripts/chef/reunion.mjs` `bfbe27847fb44ce0aa32d89f78e0a6e23b4b878eb40c2ccd33bd09bd66a158e8`
- `docs/agents/reunion.md` `03ff2e01721d6368dfddbda69da31d4598c47fb51b79a61f4e1d8c4e07c50caf`
- `docs/agents/chef-reunion.schema.json` `b65208bc39bb9aeb3a054e72a1cc248ac8ddd0e86564738501564091c95a7806`
- `scripts/station-reunion-qa.mjs` `6a301f799b610d30f4e9669fe79759b7d4a8fd832def0409bab20a5b57d8999f`

Sortie de l'usine : `CONTRE-VERIF : toutes les attaques prises, le témoin passe, sha256 égaux` ; commande 141 s sur l'usine.

## Contrôles faits en plus sur le script (au-delà des sabotages)

- Contrat des routes relu contre le CODE réel : `app/api/agents/reunion/route.ts` (026-092 : `ouvrir` → `{ id }`, 409 `deja_tenue`
  / `deja_ouverte` / `pause`, `clore` : lignes ≤ 140, idées ≤ 120 signes, `abandonner` : motif ≤ 40), `.../chiffres/route.ts`
  (`{ chiffres }`), `app/api/agents/decisions/route.ts` (026-042 : `{ question, contexte, options, defaut, montant_cents, portee,
  echeance, cle }`, 201 créée / 200 `creee: false`), `app/api/agents/evenements/route.ts` (tableau d'événements `{ id, le, agent, type,
  objet, resume }`, sans ceux du Chef lui-même : le curseur local est donc nécessaire, le script en tient un).
- Contre le VRAI schéma de 026-102 et la VRAIE consigne `chef-reunion.md` : 18 cas joués hors dépôt par l'auteur du lot
  (`presti-ops/production-0410/026-103/banc/essai-schema-reel.log`), tous conformes ; ici, RU-9 compare désormais ses bornes à celles du
  schéma d'essai du juge.
- Unités de l'usine (`scripts/usine/systemd/presti-chef-reunion.service` et `.timer`) : l'`ExecStart`
  (`avec-coffre.mjs PRESTI_JETON_CHEF -- node scripts/chef/reunion.mjs --base=https://prestiapp.fr --codex=/usr/local/bin/presti-chef-modele`)
  et l'heure (`18:00:00 Europe/Paris`) sont ceux que la notice décrit.
