# Échecs attendus des juges du pont Telegram et du durcissement de l'usine (026-194)

Une section par juge, réécrite par `--preuve-echecs` de ce juge.

<!-- juge:usine-durcie-qa:debut -->
## usine-durcie-qa

Écrit par `node scripts/usine-durcie-qa.mjs --preuve-echecs` le 2026-10-04T11:09:35Z.

| Passage | Code | Extrait réel de la sortie |
|---|---|---|
| arbre témoin vide (aucun durcir.sh) | 1 | FAIL UD-1 — scripts/usine/durcir.sh absent |
| `--temoin` (non-régression) | 0 | usine-durcie-qa : PASS |
<!-- juge:usine-durcie-qa:fin -->

<!-- juge:pont-telegram-qa:debut -->
## pont-telegram-qa

Écrit par `node scripts/pont-telegram-qa.mjs --preuve-echecs` le 2026-10-04T11:09:28Z.

| Passage | Code | Extrait réel de la sortie |
|---|---|---|
| arbre témoin vide (aucun fichier du pont) | 1 | FAIL PT-1 — lib/agents/telegram.ts absent ; app/api/agents/telegram/sortie/route.ts absent ; app/api/agents/telegram/entree/route.ts absent ; scripts/usine/telegram.mjs absent ; scripts/usine/systemd/presti-telegram.service absent ; docs/agents/telegram.md absent |
| `--temoin` (non-régression) | 0 | pont-telegram-qa : PASS |
<!-- juge:pont-telegram-qa:fin -->
