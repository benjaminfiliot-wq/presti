# 026-094 — contre-vérification du 04/10/2026 (après D-0410-3)

Méthode : chaque sabotage est appliqué à un fichier de PRODUCTION (jamais au juge), le juge est rejoué SUR L'USINE (`usine.mjs executer`,
bac monté depuis le PC), le fichier est restauré à l'octet près (sha256 comparé, voir la colonne « sha256 »). Le juge reste intact :
c'est lui qui doit rougir.

| # | Fichier saboté | Sabotage | Critère attendu | Verdict du juge (usine) | sha256 avant = après |
|---|---|---|---|---|---|
| A | `scripts/agents/passes-modele.mjs` | le rejugement du soir revient sur `gpt-6-sol` (`creerLecteur(agent, soir ? { modele: 'rejuge' } : {}, …)`) | RB-17 | ❌ RB-17 `--soir : le lanceur doit être appelé une fois, sur le modèle étalonné gpt-6-luna (reçu : aucun appel) ; --soir : pas un POST avis portant passe: soir par envoi` (le second juge refuse `gpt-6-sol` avant tout appel : rien ne part) ; code 1 | `541541f7fcf651af` |
| B | `scripts/agents/passes-modele.mjs` | la passe du soir ne demande plus `?passe=soir` | RB-17 | ❌ RB-17 `--soir : pas de ?passe=soir` ; code 1 | `541541f7fcf651af` |
| C | `scripts/usine/systemd/presti-facteur-soir.timer` | `OnCalendar` à 21 h 05 au lieu de 20 h 05 | RB-18 | ❌ RB-18 `presti-facteur-soir.timer : OnCalendar=*-*-* 21:05:00 Europe/Paris (*-*-* 20:05:00 Europe/Paris attendu)` | `112563ce1784b4fa` |
| D | `app/api/usine/standard/classement/route.ts` | le brut du lecteur appliqué sans `validerClassement` (`JSON.parse(brut)`) | RB-16 | ❌ RB-16 `brut valide : 200, validerClassement puis appliquerClasse(classe oui) attendus ; brut non JSON : appliquerClasse ne reçoit pas a_lire ; … extrait absent du texte : non vidé` | `391596c30c3fe436` |

C et D ont été joués dans la même exécution du lot complet (`--lot=echanges`) : le juge rend `FAIL — RB-7, RB-16, RB-18` ; RB-17 y est vert
(les passes du modèle sont intactes), RB-7 y est rouge pour une raison étrangère au sabotage (fichiers d'autres sessions dans l'arbre partagé : voir la note de fin).

Les sabotages A et B ont été REJOUÉS sur la version finale de passes-modele.mjs (refonte en fonction passer() : fin naturelle du processus, plus de process.exit après un fetch, sur la consigne process.exitCode) ; base RB-17 verte avant ; ils ont été joués seuls (`--partie=passes`, c'est ce que le juge relance sur l'usine pour RB-17).

## Le juge sur lui-même (`--auto-controle`, usine) — `auto-controle-echanges-04-10.log`

Témoin vert (18 critères) et 25 sabotages repérés : PASS (26 épreuves), dont les cinq nouveaux du jour sur RB-17 :
AC-RB-17B (soir sur `gpt-6-sol`), AC-RB-17C (soir sans `?passe=soir`), AC-RB-17D (soir sans avis rendu), AC-RB-17E (avis du soir sans
`passe: soir`), AC-RB-17F (un avis de ton illisible rendu à Vercel).

## Note de fin : pourquoi la vérification finale est jugée sur un arbre propre

Dans l'arbre partagé, RB-7 (« les autres routes n'ont pas changé », `git diff HEAD -- app/api lib/agents/llm.ts vercel.json`) est rouge dès
qu'une autre session y laisse un fichier de `app/api` non commité : le 04/10 au soir `app/api/usine/porteur/{rendu,travail}/route.ts`
(commentaires, modifiés à 12 h 52), `app/api/agents/vigile/route.ts` et `app/api/usine/pubs/*` (026-249, 026-200). Ce n'est pas un défaut
de cette fiche et rien n'y a été touché. Comme demandé par le chef (« juge sur l'usine, arbre propre »), le verdict final a donc été
rendu par `verifier-final.mjs 026-094` avec `PRESTI_RACINE` pointé sur un worktree jetable de `HEAD` (64a864be, le commit du juge
corrigé, poussé) + les seuls 11 fichiers du périmètre + la fiche en `fait/` : `✓ 026-094 : PASS · 129 s · machine : usine`, RB-1 à RB-18 verts
dont RB-7 (typecheck vert, 45 s). Le journal complet est `verifier.log` ; la ligne de verdict (champ `arbre` ajouté) est dans
`.orchestre/verdicts.jsonl` ; le worktree a été retiré.

## Fichiers restaurés, sha256 de contrôle (fin de séance)

- `scripts/agents/passes-modele.mjs` `541541f7fcf651af…`
- `scripts/usine/systemd/presti-facteur-soir.timer` `112563ce1784b4fa…`
- `app/api/usine/standard/classement/route.ts` `391596c30c3fe436…`
- `scripts/routes-acquisition-qa.mjs` `4086a8d4682b5c11…` (juge, jamais saboté)
- témoin `scripts/fixtures/026-acquisition/cli/temoins/routes/scripts/agents/passes-modele.mjs` `5985099d30adfbe2…`
