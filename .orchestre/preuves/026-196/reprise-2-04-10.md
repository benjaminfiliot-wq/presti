# 026-196 — deuxième reprise du 04/10/2026 (23 h 50, claude-code) : toujours bloquée par des gestes de Benj

Ce n'est pas la preuve de mise en service : `mise-en-service.md` et `telephone.md` n'existent pas, parce que rien de ce qu'ils attestent n'a eu lieu.
Aucune valeur de jeton lue, écrite ou affichée ; rien posé sur l'usine ; aucune unité installée ; aucun service relancé.

## Remesuré (lecture seule)

| Contrôle | Résultat |
|---|---|
| Coffre de l'usine (`usine-coffre.mjs noms`) | `PRESTI_JETON_USINE` seul : toujours ni jeton de bot, ni jeton d'agent, ni identifiant de conversation, ni code |
| `docs/agents/openclaw.md` ligne 101 (PT-17) | inchangée : les quatre noms y sont encore ; `026-196b` (`fiche-pt17.md`) n'est pas déposée dans `.orchestre/file/` |
| Décision du chef pour 026-196 (`decisions-chef-0410.md`) | aucune |
| « Oui » de Benj au jeton de l'agent, à `usine-agents.mjs maj --forcer` et à `presti-telegram.service` | aucun reçu dans cette conversation |

## Pourquoi « ça marche pas » côté Benj (cause trouvée et reproduite)

La fiche donne le geste en chemin relatif : `node scripts/usine-coffre.mjs poser TELEGRAM_BOT_TOKEN`. Le Terminal de Benj s'ouvre dans
`C:\Users\benja\Documents\ofm`, pas dans `presti` : le même geste y rend « Cannot find module 'C:\Users\benja\Documents\ofm\scripts\usine-coffre.mjs' »
(reproduit le 04/10). Le script ne dépend pas du dossier courant (racine tirée de `import.meta.url`, clé SSH dans le dossier personnel) : en chemin
absolu il marche de n'importe où (reproduit avec `noms` : même réponse, code 0).

Gestes corrigés, à faire par Benj dans son propre terminal (valeur masquée, jamais dans la conversation) :

```
node C:\Users\benja\Documents\presti\scripts\usine-coffre.mjs poser TELEGRAM_BOT_TOKEN
```

Si la saisie masquée elle-même ne prend pas le collage, autre voie sans changer la règle (la valeur reste sur son poste, jamais en argument) :

```
$env:TG_TMP = Read-Host "jeton du bot"
node C:\Users\benja\Documents\presti\scripts\usine-coffre.mjs poser TELEGRAM_BOT_TOKEN --depuis-env=TG_TMP
Remove-Item Env:TG_TMP
```

Forme attendue du jeton (refus avant tout envoi sinon) : 6 à 12 chiffres, deux-points, 30 signes ou plus de `[A-Za-z0-9_-]` (celle que `@BotFather` rend).

## Ce qui reste bloqué, et par qui

1. Benj : créer le bot (`@BotFather`, `/newbot`) et déposer son jeton (ci-dessus).
2. Benj : un « oui » à trois choses (jeton de l'agent `pont_telegram` posé sans être affiché ; `usine-agents.mjs maj --forcer`, qui met à jour le code de l'usine pendant que `presti-surveillance` tourne ; installation et démarrage de `presti-telegram.service`).
3. Le chef : PT-17 est rouge quel que soit le bot, et `docs/**` est interdit à cette fiche (voir `026-196.question.md`).
4. Benj : `/start <code>` dans les 10 min après le démarrage, puis `/etat` ; confirmer le digest de 7 h 30.
