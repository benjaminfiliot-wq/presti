# 026-194 — contre-vérification (session cloud, 30/09)

Les trois morceaux ont été écrits par trois sous-agents distincts (routes, service de l'usine, durcissement), chacun validé sur une IMPLÉMENTATION DE RÉFÉRENCE écrite hors du dépôt (scratchpad, jamais commitée : elle est le témoin du juge, pas un livrable), puis relus et rejoués par Claude Code.

| Juge / partie | Référence | Sabotages tués | Sabotages rejoués par Claude Code |
|---|---|---|---|
| `usine-durcie-qa` | UD-1 à UD-3 (dont 9 sous-critères UD-2a…i, quatre états) verts | 27 sur 27 (25 sur `durcir.sh`, 2 sur `usine.mjs`) | `set -euo pipefail` → `set -uo pipefail` : FAIL UD-1 ; restauré, PASS |
| `pont-telegram-qa --partie=routes` | PT-1 à PT-7 verts (0,7 s) | 36 sur 36 | motif de pause 150 → 400 signes (dans `lib/agents/telegram.ts`) : FAIL PT-4 ; restauré, PASS |
| `pont-telegram-qa --partie=usine` | PT-1, PT-8 à PT-17 verts (~19 s) | 30 sur 30 | `disable_web_page_preview: true` → `false` : FAIL PT-9 ; restauré, PASS |

Chaque sabotage : sha256 de l'arbre identique avant/après restauration (relevé par le banc de chaque sous-agent).

## Sur l'arbre courant (le seul cas que `verifier` exerce)
- `pont-telegram-qa --preuve-echecs` : PASS — arbre courant code 1 avec `FAIL PT-1`, puis `--temoin` code 0.
- `usine-durcie-qa --preuve-echecs` : PASS — arbre courant code 1 avec `FAIL UD-1`, puis `--temoin` code 0.
Le mode `--temoin` ne fait que la non-régression (package.json et lock identiques à HEAD, typecheck vert) et SAUTE les critères de fabrication tant que 026-195 et 026-197 ne sont pas dans `fait/` ; il juge pour de vrai une fois elles livrées.

## Contrats supposés à connaître avant de déposer 026-195 et 026-197 (à relire par Claude Code)
- **026-197** : `bash scripts/usine/durcir.sh --racine-systeme=<dir> "<clé publique>"` ; commandes par le PATH (pas de chemin absolu) ; chemins système seulement par la variable de racine ; second passage : « déjà », « rien à changer » ou « inchangé » ; `usine.mjs preparer` sans `--with-deps` ni `sudo <commande>` (UD-3 : il retire la garde `sudo -n -l` et `--with-deps` de `preparer()`, et le juge échoue aujourd'hui sur UD-3b et UD-3c).
- **026-195** : le format de `apres_alerte` n'est pas fixé (le juge suit les curseurs rendus) ; titre et ligne d'une alerte séparés par un blanc ou l'un de `: . - – — · | /` ; état `{ pause, rouge, orange, appels, en_panne }` (sémantique de rouge, orange, appels non fixée : le juge exige les 5 clés, les types, la cohérence avec `pauseGenerale()` et un compteur non nul quand la base signale une pause) ; erreur de la base → 503 avec `ops:<code>` dans le corps ; le service utilise le `fetch` global ; `--une-passe` : sémantique libre (le juge le lance une fois et n'en tire que ses sorties) ; `TELEGRAM_CHAT_ID=aucun` et `TELEGRAM_CODE_APPAIRAGE=epuise` lus comme « pas d'identifiant » et « plus de code » ; verrou d'état entre deux processus, repris après `kill -9` (PT-16).
- **Non testé ici** : `UD-R` (`--reel`) et `PT-R` (`--reel`), qui exigent la clé de l'usine et la production ; Windows (le juge du durcissement refuse en code 2 : doublures en bash).
- **À surveiller** : la partie usine du pont dépend de l'ordonnancement (horloge virtuelle, fenêtres de calme de 6 et 12 ms réelles) ; 34 passages consécutifs sans faux rouge ici ; sous forte charge CPU du PC, rejouer avant de conclure à un rouge.
