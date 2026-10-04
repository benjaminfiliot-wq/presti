---
id: 026-196b
type: feature
objectif: Retirer de docs/agents/openclaw.md les quatre noms de variables Telegram que le juge PT-17 de pont-telegram-qa refuse (il ne lit pas la négation), sans rien changer d'autre, jusqu'au vert de PT-17
perimetre: [docs/agents/openclaw.md, .orchestre/preuves/026-196b/**]
interdit: [scripts/**, lib/**, app/**, supabase/**, public/**, package.json, package-lock.json, .env.local, scripts/orchestre.mjs]
verifier: node scripts/pont-telegram-qa.mjs --partie=usine
budget: { fichiers: 1, minutes: 10 }
preuve: sortie de verifier dans .orchestre/preuves/026-196b/verifier.log
executant: claude-code
---

# 026-196b — PT-17 : la doc d'OpenClaw ne nomme plus les variables Telegram

## Pourquoi

`node scripts/pont-telegram-qa.mjs --reel` (026-196) reste rouge sur **PT-17** quel que soit l'état du bot : `scripts/fixtures/026-transverse/parties/usine.mjs`
(l. 419) refuse tout fichier dont le chemin contient « openclaw » (sous `docs/` et `scripts/usine/`) et qui contient le texte `TELEGRAM_BOT_TOKEN`,
`PRESTI_JETON_TELEGRAM`, `TELEGRAM_CHAT_ID` ou `TELEGRAM_CODE_APPAIRAGE`, sans lire la négation. Le seul fichier fautif est `docs/agents/openclaw.md`,
ligne 101, qui dit justement que le conteneur n'a **aucune** de ces variables. Mesuré le 04/10 : les quatre erreurs sont toutes sur cette ligne ; le
contrôle des « capacités pause ou consigne » ne trouve rien.

## Ce qu'il faut faire

Remplacer la ligne 101 de `docs/agents/openclaw.md`, et elle seule :

```
- le conteneur n'a ni `TELEGRAM_BOT_TOKEN`, ni `TELEGRAM_CHAT_ID`, ni `TELEGRAM_CODE_APPAIRAGE`, ni `PRESTI_JETON_TELEGRAM` (le contrôle refuse tout nom de variable hors liste) ;
```

par :

```
- le conteneur ne reçoit aucune des quatre valeurs du pont, jeton du bot, jeton de l'agent, conversation appairée et code d'appairage (le contrôle refuse tout nom de variable hors liste ; leurs noms sont dans `docs/agents/telegram.md`) ;
```

Le sens est identique, aucun des quatre noms n'apparaît. Ne pas toucher au juge : il fait son travail (un nom cité dans un fichier OpenClaw est un signal), et le
contrôle d'installation réelle d'OpenClaw (`scripts/usine/openclaw/lanceur.mjs`) ne lit pas cette ligne.

## C'est fini quand

- `verifier` est vert (PT-8 à PT-17) ; la simulation du 04/10 de la règle PT-17 sur le fichier corrigé ne rend aucune erreur.
- `git diff --stat` : `docs/agents/openclaw.md`, une ligne.
