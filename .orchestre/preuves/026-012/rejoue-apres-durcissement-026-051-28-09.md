# 026-012 — rejeu après durcissement de scripts/pilotage-push-qa.mjs (026-051, 28/09)

`scripts/pilotage-push-qa.mjs` est un des 4 juges du lot `a` de `scripts/juges-026-pilotage-preuve.mjs --lot=a`,
verifier officiel de 026-012 (déjà commitée). Le fichier est aussi dans le périmètre de 026-012 lui-même — c'est
026-012 qui l'a écrit à l'origine ; 026-051 l'a modifié depuis (permis : juge écrit par Claude Code). Règle de la
mission « juges à durcir » : rejouer le verifier d'une fiche déjà commitée qui réutilise un juge corrigé, et noter
le résultat.

## Rejeu

```
$ node scripts/orchestre.mjs verifier 026-012
✗ 026-012 : FAIL — JA-5, JA-7, JA-9 · 652s
```

Sortie complète : `.orchestre/preuves/026-012/verifier.log` (régénéré par ce rejeu, écrase l'ancien PASS).

**JA-5** (fiche propre) est un faux rouge de contexte : au moment du rejeu, l'arbre de travail portait des fichiers
d'autres sessions concurrentes (`.orchestre/contexte.md`, `.orchestre/digest.md`, `lib/direction/journal.ts`,
plusieurs `.orchestre/en-cours/026-075*`, `.orchestre/en-cours/026-078*`, `.orchestre/a-relire/026-086.md`…) —
aucun ne fait partie de ce qui a été touché ici. Sans effet sur le diagnostic ci-dessous.

**JA-7 et JA-9 sont le vrai défaut, et il préexistait à mon durcissement d'aujourd'hui** — il n'est pas né du
changement de PF-2/PF-5/PF-8 fait pour 026-051 :

- Le témoin de lot `a` (`scripts/fixtures/026-pilotage/a/temoin/lib/pilotage/notifications.ts.temoin`, `.../push.ts.temoin`,
  `.../alertes.ts.temoin`) a été posé le 27/09, écrit à la main par Claude Code comme **implémentation de référence
  minimale** (« elle prouve seulement que pilotage-push-qa sait rendre 0 », lot.mjs) — **pas** une copie de la vraie
  livraison de 026-051, qui n'existait pas encore ce jour-là.
- 026-051 n'a été commitée qu'aujourd'hui (28/09, `98bd78c9`, un seul commit pour toute la fiche — code de production
  ET durcissement du juge ensemble). Sa vraie implémentation (`lib/push.ts`, `lib/alertes.ts`,
  `lib/pilotage/notifications.ts` de HEAD) couvre les neuf motifs avec le texte et le `renotify` prescrits ; le
  témoin du 27/09, lui, n'a jamais été mis à jour pour ça.
- Résultat sur le témoin (rejoué isolément, `--racine=.orchestre/travail/juges-026-pilotage/temoin-a`) : PF-2 (texte/
  renotify des neuf motifs), PF-3 (10 alertes attendues, 7 vues) et PF-8 (interrompu, `Cannot read properties of null
  (reading 'titre')`) rouges ; JA-9 ne compte que 7 critères verts distincts sur les 10 exigés par le lot.

**Diagnostic : c'est le témoin qui est périmé, pas la production ni le juge.** La hausse d'exigence de PF-2/PF-8 sur
les neuf motifs (durcissement du 28/09, commit `98bd78c9`) rend visible un témoin resté au niveau du 27/09 (six
motifs). C'est exactement le rôle de JA-7/JA-9 : ils sont censés rougir quand le témoin ne suit plus le contrat du
juge — c'est le comportement voulu, pas un bug de mon durcissement.

## Ce qui reste à faire (pas fait ici, hors du périmètre « rejoue et note » de cette mission)

Régénérer `scripts/fixtures/026-pilotage/a/temoin/lib/pilotage/{notifications,push,alertes}.ts.temoin` à partir des
neuf motifs réellement prescrits (texte + `renotify`), pour que JA-7/JA-9 repassent au vert — sans toucher au juge
ni à la vraie production 026-051, déjà conforme et déjà commitée. Je n'ai pas tenté cette réécriture ici : c'est un
travail de fixture, propre à 026-012, distinct du « rejoue et note » de cette mission. Un `spawn_task` a été posé
pour ce suivi.

Rien commité pour 026-012 (verifier rouge — la règle « verifier vert avant tout commit » l'interdit de toute façon) ;
seule écriture : ce fichier, plus la régénération normale de `verifier.log`/`echecs-attendus.md` par le rejeu
(non commitée non plus).
