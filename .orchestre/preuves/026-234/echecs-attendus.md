# 026-234 — preuve d'échecs (savoir-lecons-qa)

Généré le 2026-09-28T15:53:05.067Z par `node scripts/savoir-lecons-qa.mjs --preuve-echecs`.

Décision de contrat notée en tête : l'identifiant vient du SHA-256 de la source seule (texte de la fiche) ; une ligne déplacée (decisions.md s'écrit du plus récent au plus ancien, en tête du tableau) doit garder une source juste (SVL-2). `valider --par=revue-AAAA-SS` laisse la candidate dans le travail du dépôt principal : la revue écrit dans son worktree, et `candidats` la retire une fois la PR fusionnée.

## (a) Arbre courant du dépôt — attendu : échec, SVL-1 en premier

```
FAIL SVL-1 — scripts/savoir/lecons.mjs absent de la racine jugée (fiche 026-235) (0 s)
FAIL SVL-2 — scripts/savoir/lecons.mjs absent de la racine jugée (fiche 026-235) (0 s)
FAIL SVL-3 — scripts/savoir/lecons.mjs absent de la racine jugée (fiche 026-235) (0 s)
FAIL SVL-4 — scripts/savoir/lecons.mjs absent de la racine jugée (fiche 026-235) (0 s)
FAIL SVL-5 — scripts/savoir/lecons.mjs absent de la racine jugée (fiche 026-235) (0 s)
FAIL SVL-6 — scripts/savoir/lecons.mjs absent de la racine jugée (fiche 026-235) (1 s)
FAIL SVL-7 — lib/agents/lecons.ts absent de la racine jugée (fiche 026-236) (0 s)
FAIL SVL-8 — scripts/savoir/lecons-entree.mjs absent de la racine jugée (fiche 026-236) (0 s)
FAIL SVL-9 — lib/agents/lecons.ts absent de la racine jugée (fiche 026-236) (0 s)
PASS SVL-10 — ok (0 s)
PASS SVL-11 — ok (20 s)
savoir-lecons-qa : FAIL — SVL-1, SVL-2, SVL-3, SVL-4, SVL-5, SVL-6, SVL-7, SVL-8, SVL-9
```

Verdict (a) : CONFORME — premier échec réel : SVL-1

## (b) SVL-10 (consignes) sur le dépôt — attendu : vert

```
PASS SVL-10 — ok (0 s)
```

## (c) Témoin (scripts/fixtures/026/savoir/lecons/temoin/) — attendu : vert

```
PASS SVL-1 — ok (3 s)
PASS SVL-2 — ok (2 s)
PASS SVL-3 — ok (7 s)
PASS SVL-4 — ok (1 s)
PASS SVL-5 — ok (15 s)
PASS SVL-6 — ok (3 s)
PASS SVL-7 — ok (1 s)
PASS SVL-8 — ok (4 s)
PASS SVL-9 — ok (7 s)
PASS SVL-10 — ok (0 s)
PASS SVL-11 — ok (5 s)
savoir-lecons-qa : PASS — tout vert
```

Verdict (c) : CONFORME

## (d) Sabotages (scripts/fixtures/026/savoir/lecons/sabotages.json) — attendu : chaque sabotage fait échouer son critère

```
S01 (scripts/savoir/lecons.mjs : un QUOTA pris pour un échec) → SVL-1 attendu en échec : pris — candidate en trop : .orchestre/verdicts.jsonl:4 (verdict QUOTA : PASS et QUOTA n'en donnent jamais) (aussi : SVL-2, SVL-3, SVL-4)
S02 (scripts/savoir/lecons.mjs : un identifiant en chiffres hexadécimaux) → SVL-1 attendu en échec : pris — L-2026-09-15-47ad296d17ae.md : identifiant hors format L-AAAA-MM-JJ-<12 lettres a-p> (aussi : SVL-2, SVL-3)
S03 (scripts/savoir/lecons.mjs : le second passage réécrit tout (curseur ignoré)) → SVL-1 attendu en échec : pris — second passage : nouvelles = 17 (0 attendu) (aussi : SVL-2)
S04 (scripts/savoir/lecons.mjs : le jeton dans l'adresse du bus) → SVL-2 attendu en échec : pris — requête 1 : le jeton est dans l'adresse
S05 (scripts/savoir/lecons.mjs : une décision déplacée garde sa vieille source) → SVL-2 attendu en échec : pris — après une décision insérée en tête : .orchestre/decisions.md:7 → ligne sans cette date (une ligne déplacée doit garder une source juste)
S06 (scripts/savoir/lecons.mjs : un ### hors d'une « Correction du » devient candidate) → SVL-2 attendu en échec : pris — candidate en trop : .orchestre/brouillons-ecosysteme/026/026-901.md:36 (aussi : SVL-1, SVL-3, SVL-4)
S07 (scripts/savoir/lecons.mjs : verifier-source dit oui à tout) → SVL-3 attendu en échec : pris — verifier-source d'une candidate plantée (l'id de la ligne n'est pas la fiche, .orchestre/verdicts.jsonl:3) : code 0 (1 attendu)
S08 (scripts/savoir/lecons.mjs : valider sans résoudre la source) → SVL-3 attendu en échec : pris — valider une candidate plantée (ligne introuvable, .orchestre/verdicts.jsonl:999) : code 0 (1 attendu)
S09 (scripts/savoir/lecons.mjs : les coordonnées recopiées sans caviardage) → SVL-4 attendu en échec : pris — .orchestre/decisions.md:9 : un numéro de téléphone dans la candidate
S10 (scripts/savoir/lecons.mjs : un fait secret devient candidate) → SVL-4 attendu en échec : pris — .orchestre/verdicts.jsonl:31 porte un secret : une candidate a été écrite
S11 (scripts/savoir/lecons.mjs : un constat de plus de 400 signes) → SVL-4 attendu en échec : pris — .orchestre/verdicts.jsonl:14 : constat de 825 signes (1 à 400)
S12 (scripts/savoir/lecons.mjs : la validation tourne sur l'usine) → SVL-5 attendu en échec : pris — valider PRESTI_HOTE=usine : code 0 (2 attendu)
S13 (scripts/savoir/lecons.mjs : Codex peut valider) → SVL-5 attendu en échec : pris — valider --par=codex : code 0 (2 attendu)
S14 (scripts/savoir/lecons.mjs : la candidate reste après la validation de Claude Code) → SVL-5 attendu en échec : pris — --par=claude-code : la candidate est restée dans le travail (elle doit être retirée)
S15 (scripts/savoir/lecons.mjs : une règle à numéro, secret ou lien acceptée) → SVL-5 attendu en échec : pris — valider avec règle au numéro : code 0 (1 attendu)
S16 (scripts/savoir/lecons.mjs : la revue valide sur une ligne fautive) → SVL-6 attendu en échec : pris — valider --par=revue-2026-40 quand la ligne de la leçon est fautive (« source-differente ») : code 0, leçon écrite (1 attendu, rien d'écrit)
S17 (lib/agents/lecons.ts : LECONS_DE élargi (douleurs reçoit les données)) → SVL-7 attendu en échec : pris — LECONS_DE.douleurs : ["prospection","general","donnees"] (["prospection","general"] attendu)
S18 (lib/agents/lecons.ts : la leçon au numéro gardée) → SVL-7 attendu en échec : pris — leconsPour(standardiste) : ["L-2026-09-26-aaaaaaaaaaab","L-2026-09-25-aaaaaaaaaaac","L-2026-09-23-aaaaaaaaaaaf","L-2026-09-22-aaaaaaaaaaag","L-2026-09-21-aaaaaaaaaaah","… (aussi : SVL-8)
S19 (lib/agents/lecons.ts : la balise piégée non neutralisée) → SVL-7 attendu en échec : pris — consigneAvecLecons (leçon piégée) : 1 ouverture(s) et 2 fermeture(s) de <lecons_validees> (1 et 1 : la balise venue d'une règle doit être neutralisée) (aussi : SVL-8)
S20 (lib/agents/lecons.ts : les options relèvent le plafond de 8) → SVL-7 attendu en échec : pris — leconsPour, cas « huit-plafonds-jamais-releves » : ["L-2026-09-12-llllllllllll","L-2026-09-11-kkkkkkkkkkkk","L-2026-09-10-jjjjjjjjjjjj","L-2026-09-09-iiiiiiiiiiii","L-20…
S21 (scripts/savoir/lecons-entree.mjs : l'entrée change interrupteur éteint) → SVL-8 attendu en échec : pris — interrupteur éteint : entree.md modifié (inchangé à l’octet près attendu)
S22 (scripts/savoir/lecons-entree.mjs : le bloc se double au lieu de se remplacer) → SVL-8 attendu en échec : pris — lecons-entree relancé : le fichier a changé (2 bloc(s) ; le bloc se remplace, jamais ne se double)
S23 (lib/agents/llm.ts : les leçons relues à chaque appel) → SVL-9 attendu en échec : pris — facteur-allume : 42 ouverture(s) de leçons pendant les appels (lues une seule fois, par creerLecteur)
S24 (scripts/chef/etat.mjs : etat.mjs n'ajoute pas les leçons du chef) → SVL-9 attendu en échec : pris — etat.mjs (allumé) : le bloc des leçons est absent, pas après le bloc de l'état
S25 (scripts/chef/etat.mjs : lecons-entree lancé par un shell) → SVL-9 attendu en échec : pris — etat.mjs (allumé) : le bloc des leçons est absent, pas après le bloc de l'état
S26 (docs/agents/chef.md : chef.md ne dit pas ce qu'est le bloc) → SVL-9 attendu en échec : pris — docs/agents/chef.md ne nomme pas <lecons_validees> (026-237)
S27 (docs/agents/lecons.md : lecons.md ne dit plus « jamais validée sur l'usine ») → SVL-10 attendu en échec : pris — docs/agents/lecons.md ne dit pas « jamais validée sur l'usine »
S28 (docs/agents/revue-hebdo.md : la revue ne dit plus qu'elle lance lecons.mjs) → SVL-10 attendu en échec : pris — docs/agents/revue-hebdo.md : « Ce que la routine ne fait jamais » ne nomme pas lecons.mjs dans ce qu'elle lance
S29 (lib/agents/lecons.ts : une erreur de type dans lecons.ts) → SVL-11 attendu en échec : pris — typecheck strict de lib/agents/lecons.ts, lib/agents/llm.ts : lib/agents/lecons.ts(58,39): error TS2322: Type 'number' is not assignable to type 'string'. | lib/agents/l…
```

Verdict (d) : CONFORME

## Bilan

(a) ok · (b) ok · (c) ok · (d) ok · 267 s

**026-234 : PASS**
