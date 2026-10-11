# 026-250 — notes de livraison (05/10, lot M-3, Claude Code)

## Ce qui est livré

`scripts/juges-026-postes-mutations.mjs` : 63 mutations des quatre juges des postes (comptable-qa, sav-qa, qualite-sites-qa, vigile-qa), une faute à la fois sur une copie jetable (`.orchestre/travail/juges-026-postes-mutations/`, jonction `node_modules` retirée par `fs.unlinkSync`). Sur l'usine, le 05/10 : les quatre témoins PASS, **63 mutations prises sur 63, code 0** (`mutations.json`, `mutations.md`). Le patch de l'usine (Codex, 04/10, quota épuisé jusqu'au 09/10) en était la base.

## Ce qui a été corrigé dans le script de Codex

- Une mutation non prise ne coupe plus la série : toutes sont jouées, les survivantes listées (`survivantes` dans le rapport), code final 1. Un témoin rouge dont les critères sont nommés est noté au lieu d'arrêter ; un critère muté déjà rouge sur la copie intacte arrête (la mutation ne prouverait rien). Option `--seul=<critère,…>` (rapport sous `essai-<critères>/`).
- Un « avant » ambigu (VG-6, `env: envReduit(env)` présent trois fois) a été précisé.
- **Onze mutations de Codex ne changeaient rien d'observable** (code mort, appel indéfini, branche inatteignable, ou faute masquée par un second garde-fou) ; chacune a été remplacée par la faute réelle, tirée des sabotages de fixtures des juges quand le code livré la porte : CPT-6 (moteur gratuit accepté, modèle `:cloud` accepté), SAV-1 (envoi appelé par `globalThis`, plutôt qu'une fonction indéfinie qui plantait avant le critère), SAV-6 (une `question_autre` prend un type FAQ ; la certitude ignorée), SAV-7 (moteur gratuit, `:cloud`, drapeau `personnelles` ignoré), SAV-8 (une promesse de délai et de prix ajoutée au texte), QSI-2 (le site retiré n'est plus exclu), QSI-9 (clé d'idempotence au milliseconde près, dans le script), VG-2 (adresse IP et raison libre dans le relevé), VG-7 (nombre inventé accepté), VG-12 (pause sur un seul niveau rouge).
- Hors mutation, constat sur le juge (non corrigé, le juge est interdit) : QSI-9 ne juge pas la clé d'idempotence de la route `app/api/usine/qualite/rapport/route.ts` (`Date.now()` à la place de la période y reste vert) ; seule celle du script est jugée.

## Verdict du méta-juge (un seul passage, sur l'usine, le 05/10)

`node scripts/juges-026-mutations-preuve.mjs --fiche=026-250 …` : **PASS** (MP-1 script en code 0 en 361 s, 63 entrées complètes ; MP-2 les 37 critères imposés couverts ; MP-3 trois contre-mutations tirées, graine 2044309464, toutes prises ; MP-4 aucun fichier bougé ; MP-5 `mutations-contre-verifiees.md` écrit). Copie de la sortie : `verifier.log` (ignoré par git, comme tous les `*.log`).

## Gestes de Benj

Aucun.
