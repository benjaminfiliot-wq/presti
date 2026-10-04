# 026-094 — correction du juge RB-17 accordée par le chef (D-0410-3, 04/10/2026)

Contexte : le premier agent (Codex, usine) s'est arrêté sur une question : `jugerTon` (026-083) ne reconnaît que l'identité du lecteur
étalonné (`ETALONNAGE.lecteur` = `codex:gpt-6-luna`), donc le lecteur du soir bâti avec `modele: 'rejuge'` (`gpt-6-sol`) est refusé
avant tout appel (`second_juge_non_etalonne`), et le faux lanceur de RB-17 rendait au Facteur une réponse de classement, pas un avis
de ton : aucun `POST avis` ne partait. Décision du chef D-0410-3 : le rejugement du soir se fait sur le modèle étalonné,
`creerLecteur('facteur')` sans `modele: 'rejuge'` ; un avis de ton illisible n'annule jamais un envoi sain.

## Ce qui change (rien n'est assoupli, tout se renforce)

`scripts/routes-acquisition-qa.mjs`, fonction `jugerPasses` (RB-17) :

| Avant | Après |
|---|---|
| le Facteur tourne avec le faux lanceur qui rend `{"classe":"oui",…}` : `executerJuge` ne rend rien, `POST avis` jamais atteint | le faux lanceur rend au Facteur `{"verdict":"ok","raisons":[]}` (variable `FAUX_LANCEUR_BRUT` du faux lanceur, déjà prévue, par passage ; le script `faux-lanceur.sh` n'a pas changé) |
| `--agent=facteur` : un `POST avis` (compté seulement) | un `POST avis` dont le corps est `envoi_id` `e-1`, l'empreinte sha256 du texte, `j2` = `{ verdict: ok, raisons: [] }`, sans `passe: soir` ; le lanceur appelé UNE fois, sur `gpt-6-luna` ; code 0 |
| `--soir` : `?passe=soir` et `gpt-6-sol` dans l'argv | `?passe=soir` (GET) ; le lanceur appelé UNE fois sur `gpt-6-luna`, jamais `gpt-6-sol` ; un `POST avis` portant `passe: 'soir'` et `j2.verdict` `ok` ; code 0 |
| — | NOUVEAU : un avis de ton illisible (le faux lanceur rend un classement) → code 0 et AUCUN `POST avis` (l'envoi reste `prepare`, option 3 du chef refusée) |
| — | NOUVEAU : `--agent=standardiste` ne lance jamais `gpt-6-sol` |

Le test échoue toujours si la passe du soir ne part pas, ou part sur un autre modèle (sabotages A, B ci-dessous, et AC-RB-17B à AC-RB-17F).

Témoin du juge (`scripts/fixtures/026-acquisition/cli/temoins/routes/scripts/agents/passes-modele.mjs`) aligné : modèle unique `gpt-6-luna`,
avis rendu seulement si le lanceur rend `{ verdict, raisons }`, `passe: 'soir'` seulement au soir (comme le vrai script).

`--auto-controle` du lot : 5 sabotages nouveaux (AC-RB-17B à AC-RB-17F : soir sur `gpt-6-sol`, soir sans `?passe=soir`, soir sans avis,
avis du soir sans `passe: soir`, avis illisible rendu) : tous repérés ; 26 épreuves vertes (preuve : `auto-controle-echanges-04-10.log`).

## Le code et la fiche

- `scripts/agents/passes-modele.mjs` : `creerLecteur(agent, {}, deps)` pour les trois passes (le `--soir` ne change plus le modèle).
- Fiche (`.orchestre/en-cours/026-094.md` puis `fait/`) : point 2 ter et RB-17 adaptés (`?passe=soir`, `gpt-6-luna`, avis de ton valide).
- Rien dans `lib/**`, `decisions.md`, `scripts/orchestre.mjs`.
