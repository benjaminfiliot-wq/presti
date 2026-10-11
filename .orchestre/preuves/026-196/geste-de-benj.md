# 026-196 — le pont Telegram : gestes de Benj (05/10/2026)

Aucun code dans le périmètre (preuves seulement). Rien n'est installé : il manque le bot et son jeton, qui ne viennent que de Benj.
Verdict informatif : `pont-telegram-qa --reel` rend PT-1 à PT-16 PASS (le code du pont est sain), FAIL PT-R (service inactif, normal)
et FAIL PT-17 : `docs/agents/openclaw.md` cite les noms TELEGRAM_BOT_TOKEN, PRESTI_JETON_TELEGRAM, TELEGRAM_CHAT_ID
(`docs/` est interdit à cette fiche : à corriger par la fiche d'OpenClaw 026-221 ou par une décision du chef).

À faire, dans l'ordre :
1. Benj : Telegram, `@BotFather`, `/newbot`, nom « Presti Station » ; garder le jeton.
2. Benj, dans son propre terminal : `node scripts/usine-coffre.mjs poser TELEGRAM_BOT_TOKEN` (saisie masquée, jamais dans la conversation).
3. Benj : dire « oui » au jeton de l'agent `pont_telegram` (posé par Claude Code, jamais affiché) et au service `presti-telegram`.
4. Claude Code installe l'unité par `gardien`, donne le code d'appairage dans la conversation ; Benj envoie `/start <code>` au bot dans les 10 min,
   puis `/etat`, et dit ce qu'il a reçu ; Claude Code pose l'identifiant de conversation, relance, joue `--reel`. Jamais de `/pause` d'essai en production.
