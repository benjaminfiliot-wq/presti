# 026-238 — preuve d'échecs (savoir-reflexion-qa)

Généré le 2026-09-29T10:19:01.205Z par `node scripts/savoir-reflexion-qa.mjs --preuve-echecs`.

Décisions de contrat notées en tête : (1) « zéro requête » d'un bilan refusé s'entend « zéro requête d'écriture » : `bilan-donnees.mjs` lit l'état du bus (GET /api/agents/etat) avant le modèle ; (2) `savoir_lie` demande à `chercher.mjs` la question « <critère> <fiche> » (le verdict à la place du critère s'il n'y en a pas), au plus 3 sources `chemin:debut-fin` par échec ; (3) les recherches de `recherches` sont comptées avant celles du savoir lié ; (4) l'état du bus rend `couts_mois` et les agents en pause ou à disjoncteur ouvert : `quotas` en est tiré.

## (a) Arbre courant du dépôt — attendu : échec, SVB-1 en premier

```
FAIL SVB-1 — scripts/chef/bilan-donnees.mjs absent de la racine jugée (fiche 026-239) (0 s)
PASS SVB-2 — ok (0 s)
FAIL SVB-3 — scripts/chef/bilan.mjs absent de la racine jugée (fiche 026-239) (0 s)
FAIL SVB-4 — scripts/chef/bilan.mjs absent de la racine jugée (fiche 026-239) (0 s)
FAIL SVB-5 — scripts/chef/bilan.mjs absent de la racine jugée (fiche 026-239) (0 s)
PASS SVB-6 — ok (2 s)
PASS SVB-7 — ok (0 s)
FAIL SVB-8 — scripts/usine/systemd/presti-chef-bilan.service absent de la racine jugée (fiche 026-239) (0 s)
  ✗ scripts/usine/systemd/presti-chef-bilan.timer absent de la racine jugée (fiche 026-239)
FAIL SVB-9 — scripts/chef/bilan-donnees.mjs absent de la racine jugée (fiche 026-239) (0 s)
PASS SVB-10 — ok (37 s)
savoir-reflexion-qa : FAIL — SVB-1, SVB-3, SVB-4, SVB-5, SVB-8, SVB-9
```

Verdict (a) : CONFORME — premier échec réel : SVB-1

## (b) SVB-2 (schéma) et SVB-7 (consignes) sur le dépôt — attendu : verts

```
PASS SVB-2 — ok (0 s)
PASS SVB-7 — ok (0 s)
```

Verdict (b) : CONFORME

## (c) Témoin (scripts/fixtures/026/savoir/reflexion/temoin/) — attendu : vert

```
PASS SVB-1 — ok (6 s)
PASS SVB-2 — ok (0 s)
PASS SVB-3 — ok (17 s)
PASS SVB-4 — ok (0 s)
PASS SVB-5 — ok (0 s)
PASS SVB-6 — ok (2 s)
PASS SVB-7 — ok (0 s)
PASS SVB-8 — ok (0 s)
PASS SVB-9 — ok (8 s)
PASS SVB-10 — ok (0 s)
savoir-reflexion-qa : PASS — tout vert
```

Verdict (c) : CONFORME

## (d) Sabotages (scripts/fixtures/026/savoir/reflexion/sabotages.json) — attendu : chaque sabotage fait échouer son critère

```
S01 (scripts/chef/bilan-donnees.mjs : le jour civil est celui de l'UTC, pas celui de Paris) → SVB-1 attendu en échec : pris — jour 2026-09-28 : « executants » obtenu {"fraicheur":"2026-09-28T22:30:00Z","par_executant":{"claude-code":{"disjonctees":0,"expirees":1,"fail":0,"pass":1,"refusees":0},… (aussi : SVB-9)
S02 (scripts/chef/bilan-donnees.mjs : douze échecs au lieu des dix plus récents) → SVB-1 attendu en échec : pris — semaine 2026-39 : « echecs » obtenu [{"critere":"SVL-10","date":"2026-09-27T21:45:00Z","id":"099-26","source":"verdicts.jsonl:26","verdict":"FAIL"},{"critere":"SVB-5","d… (aussi : SVB-9)
S03 (scripts/chef/bilan-donnees.mjs : la ligne abîmée de agents.jsonl n'est pas comptée) → SVB-1 attendu en échec : pris — jour 2026-09-28 : « lignes_illisibles » obtenu 1, attendu 2 (aussi : SVB-9)
S04 (scripts/chef/bilan-donnees.mjs : un QUOTA compté comme un FAIL) → SVB-1 attendu en échec : pris — semaine 2026-39 : « executants » obtenu {"fraicheur":"2026-09-28T22:30:00Z","par_executant":{"ag-essai":{"disjonctees":0,"expirees":0,"fail":1,"pass":0,"refusees":0},"cl… (aussi : SVB-9)
S05 (scripts/chef/bilan-donnees.mjs : sans état : 0 au lieu de « non mesuré ») → SVB-1 attendu en échec : pris — état absent : « couts » obtenu 0, attendu "non mesuré"
S06 (scripts/chef/bilan-donnees.mjs : le critère « CH-C4 » n'est pas reconnu (une lettre après le tiret)) → SVB-1 attendu en échec : pris — semaine 2026-39 : « echecs » obtenu [{"critere":"SVL-10","date":"2026-09-27T21:45:00Z","id":"099-26","source":"verdicts.jsonl:26","verdict":"FAIL"},{"critere":"SVB-5","d… (aussi : SVB-9)
S07 (docs/agents/chef-bilan.schema.json : le schéma laisse passer quatre propositions) → SVB-2 attendu en échec : pris — bilan fautif « quatre propositions » : accepté par le schéma (refus attendu)
S08 (docs/agents/chef-bilan.schema.json : une proposition accepte la clé appliquer: true) → SVB-2 attendu en échec : pris — bilan fautif « clé inconnue appliquer: true (proposition) » : accepté par le schéma (refus attendu)
S09 (docs/agents/chef-bilan.schema.json : le schéma n'interdit plus le @) → SVB-2 attendu en échec : pris — bilan fautif « chaîne avec @ » : accepté par le schéma (refus attendu)
S10 (scripts/chef/bilan.mjs : un bilan qui ne passe pas la validation est envoyé quand même) → SVB-3 attendu en échec : pris — bilan fautif « invente » : code 0 (1 attendu) — ✓ bilan du 2026-09-28 : 3 proposition(s) envoyée(s) au pont
S11 (scripts/chef/bilan.mjs : le délai ne tue rien : le modèle dort jusqu'au bout) → SVB-3 attendu en échec : pris — délai : bilan.mjs n'a pas rendu la main (arbre du modèle non tué dans le délai)
S12 (scripts/chef/bilan.mjs : l'interrupteur éteint est ignoré) → SVB-3 attendu en échec : pris — interrupteur éteint : la sortie ne dit pas « bilan éteint »
S13 (scripts/chef/bilan.mjs : l'événement du fil n'est pas de type bilan_quotidien) → SVB-3 attendu en échec : pris — chaîne « ok » (3 proposition(s)) : événement de type « cycle_termine » (bilan_quotidien attendu)
S14 (scripts/chef/bilan.mjs : les tâches du plan sortent de Presti (sortante: true)) → SVB-4 attendu en échec : pris — plan du bilan « ok » : refusé par docs/agents/chef-plan.schema.json ($.taches[0].sortante : const ; $.taches[1].sortante : const ; $.taches[2].sortante : const) (aussi : SVB-3)
S15 (scripts/chef/bilan.mjs : le plan du bilan est un cycle plein) → SVB-4 attendu en échec : pris — plan du bilan « ok » : cycle « plein » (leger attendu) (aussi : SVB-3)
S16 (scripts/chef/bilan.mjs : la clé d'idempotence perd son « bilan-<n>- ») → SVB-4 attendu en échec : pris — plan du bilan « ok », tâche 1 : clé « chef:2026-09-28:relire-le-dernier-echec-de-la-periode » (chef:2026-09-28:bilan-1-<mot> attendu)
S17 (scripts/chef/bilan.mjs : l'effet attendu n'est pas dans la charge de la tâche) → SVB-4 attendu en échec : pris — plan du bilan « ok », tâche 1 : charge.pourquoi ne porte pas l'effet attendu en entier
S18 (scripts/chef/bilan.mjs : la charge dépasse 300 signes (aucune coupe)) → SVB-4 attendu en échec : pris — plan du bilan « ok » : la chaîne rend code 1 — ✗ taches refusée (HTTP TimeoutError) (aussi : SVB-3)
S19 (scripts/chef/bilan.mjs : le modèle tourne en danger-full-access) → SVB-5 attendu en échec : pris — chaîne « ok » : argv sans « -s workspace-write »
S20 (scripts/chef/bilan.mjs : le modèle reçoit tout l'environnement (jeton compris)) → SVB-5 attendu en échec : pris — chaîne « ok » : l'environnement du modèle porte ANTHROPIC_API_KEY, COMSPEC, NODE_OPTIONS, NUMBER_OF_PROCESSORS, OPENAI_API_KEY, ORCHESTRE_CODEX_BIN, OS, PATHEXT, PRESTI_…
S21 (scripts/chef/bilan.mjs : une commande git dans le bilan) → SVB-5 attendu en échec : pris — scripts/chef/bilan.mjs : une commande git (le bilan n'a aucun droit de plus que le plan léger) (aussi : SVB-3)
S22 (scripts/chef/bilan.mjs : le réseau du modèle est ouvert) → SVB-5 attendu en échec : pris — chaîne « ok » : argv sans « -c sandbox_workspace_write.network_access=false » (le réseau du modèle n'est pas coupé)
S23 (docs/revues/GABARIT-bilan.md : le gabarit du bilan perd un titre de section) → SVB-6 attendu en échec : pris — GABARIT-bilan.md : section « ## Coûts » absente (aussi : SVB-7)
S24 (docs/agents/chef-bilan.md : la consigne n'énonce plus le plafond de 5 constats) → SVB-7 attendu en échec : pris — docs/agents/chef-bilan.md ne dit pas « 5 constats au plus »
S25 (docs/agents/revue-hebdo.md : revue-hebdo.md dit « Fusion permise » au lieu de « Jamais de fusion ») → SVB-7 attendu en échec : pris — docs/agents/revue-hebdo.md ne dit pas « jamais de fusion »
S26 (scripts/usine/systemd/presti-chef-bilan.timer : le minuteur perd son fuseau) → SVB-8 attendu en échec : pris — presti-chef-bilan.timer : OnCalendar=*-*-* 07:35:00 (*-*-* 07:35:00 Europe/Paris attendu)
S27 (scripts/usine/systemd/presti-chef-bilan.service : l'unité lit un EnvironmentFile) → SVB-8 attendu en échec : pris — presti-chef-bilan.service : un EnvironmentFile= (aucun : le jeton vient du coffre, par avec-coffre.mjs)
S28 (scripts/usine/systemd/presti-chef-bilan.service : l'unité lance le binaire de Codex, pas le lanceur) → SVB-8 attendu en échec : pris — presti-chef-bilan.service : ORCHESTRE_CODEX_BIN=/opt/codex/bin/codex (le lanceur /usr/local/bin/presti-chef-modele attendu, jamais le binaire de Codex)
S29 (scripts/chef/bilan-donnees.mjs : le savoir lié demande le web) → SVB-9 attendu en échec : pris — chercher.mjs lancé avec --web pour « SVL-10 099-26 » : le savoir lié ne demande jamais le web
S30 (scripts/chef/bilan-donnees.mjs : quatre recherches au lieu de trois) → SVB-9 attendu en échec : pris — savoir_lie : 4 recherche(s) (3 attendues, les trois premiers échecs)
S31 (scripts/chef/bilan-donnees.mjs : la question ne porte plus le critère) → SVB-9 attendu en échec : pris — savoir_lie[0] : question « 099-26 » (« SVL-10 099-26 » attendue : le critère, puis la fiche)
S32 (scripts/chef/bilan.mjs : bilan.mjs importe un paquet npm) → SVB-10 attendu en échec : pris — scripts/chef/bilan.mjs importe « lodash » (node: ou relatif seulement : aucune dépendance nouvelle)
```

Verdict (d) : CONFORME

## Bilan

(a) ok · (b) ok · (c) ok · (d) ok · 549 s

**026-238 : PASS**
