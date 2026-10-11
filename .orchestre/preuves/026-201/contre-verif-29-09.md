# 026-201 — contre-vérification (sabotages réversibles de la production)

Faite le 04/10/2026 par Claude Code (agent claude-code), sur le PC. Le juge est `node --import ./scripts/ts-loader.mjs scripts/search-console-qa.mjs` (cahier SC-1 à SC-8, faux Google en loopback, clé factice en mémoire) ; le sabotage 7 est jugé par `scripts/garde-pause-qa.mjs` (GP-2, la pause lue avant toute sortie).

Méthode : pour chaque sabotage, l'ancre est vérifiée présente **une seule fois**, le fichier de production est modifié sur disque, le juge est lancé, puis les **octets d'origine sont réécrits** et le sha256 est comparé à celui d'avant. Un sabotage ne compte que si le juge est rouge **sur le bon critère** et que le sha256 est restauré.

| # | Sabotage de la production | Fichier | Critère attendu | Verdict du juge | sha256 restauré |
|---|---|---|---|---|---|
| 1 | portée OAuth remplacée par `portee-fautive` | `lib/sites/searchConsole.ts` | SC-2 | FAIL SC-2 (signature/claims/échange refusé par le faux Google), puis SC-3, SC-4, SC-6 en cascade | oui |
| 2 | écriture supplémentaire `<commande>/autre.html` dans le bucket | `lib/sites/searchConsole.ts` | SC-4 | FAIL SC-4 (écriture bucket supplémentaire) et SC-3 (ordre) | oui |
| 3 | `console.log(jeton.jeton)` avant les en-têtes | `lib/sites/searchConsole.ts` | SC-7 | FAIL SC-7 (secret en console) | oui |
| 4 | `SITES_SEARCH_CONSOLE_PAR_TOUR` de 3 à 4 | `lib/siteLivraison.ts` | SC-6 | FAIL SC-6 (trois commandes par tour non respectées) | oui |
| 5 | pause du tour ignorée (`if (true)` au lieu de `if (!pause)`) | `lib/siteLivraison.ts` | SC-6 | FAIL SC-6 (appel sous pause) | oui |
| 6 | compteur d'essais perdu (`search_console_essais: 0`) | `lib/siteLivraison.ts` | SC-6 | FAIL SC-6 (compteur / autres vérifications perdus) | oui |
| 7 | lecture commune de la pause (`pauseGenerale()`) retirée avant la sortie | `lib/siteLivraison.ts` | GP-2 | FAIL GP-2 : « lib/siteLivraison.ts appelle soumettreSiteSearchConsole de lib/sites/searchConsole.ts sans lire la pause avant » | oui |

Sept sabotages sur sept détectés par le critère visé ; le sabotage 1 fait aussi tomber SC-3, SC-4 et SC-6 parce que sans jeton rien de la chaîne ne part (cascade normale, pas un faux rouge).

## Restauration

sha256 identiques avant les sabotages, après chacun, et après le dernier (production livrée) :

- `lib/sites/searchConsole.ts` : `7d9aa4b18918d31353fe980b0c33cc8eab141cf18c69c0f568ad12104f8e3002`
- `lib/siteLivraison.ts` : `74dade6799626421d6b6d6b6a9b72dec458ac50aa22b5b28fb6df24927240167`

Juge relancé sur l'état restauré : `search-console-qa : PASS` (SC-1 à SC-8, typecheck réel vert).

## Juges voisins rejoués sur la production livrée

PASS : `livraison-tour-qa`, `bus-livraison-qa`, `retrait-site-qa`, `achat-public-qa`, `achat-ecrans-qa`.

Rouges qui ne sont pas des défauts de ce code (voir le rapport de fin de tâche) :

- `garde-pause-qa` GP-2 : reste rouge pour `lib/direction/comptable.ts` (fichier d'une autre session, appelle `creerLecteur` sans lire la pause) ; la ligne de `lib/siteLivraison.ts` a disparu depuis la lecture de `pauseGenerale()` avant chaque soumission (sabotage 7).
- `generation-actions-qa` GA-6 et `tuile-argent-qa` TA-5 : ces deux juges historiques (026-106, 026-059) retirent « exactement » l'évolution de 026-141 (`49753f4c`, lignes 11 à 197 de `lib/siteLivraison.ts`, soit presque tout le fichier) avant de comparer ; toute modification postérieure de ce fichier, y compris celle que 026-201 doit faire dans son périmètre, les met au rouge (« évolution … altérée ou ambiguë » puis « import ajouté hors contrat »). Leur liste d'évolutions (`retirerEvolutions(…, ['49753f4c'])`) est à compléter par le commit de 026-201 dans `scripts/generation-actions-qa.mjs` et `scripts/tuile-argent-qa.mjs`, hors périmètre de cette fiche.

## Ce que ces sabotages ne couvrent pas, et pourquoi

- Le vrai Google : jamais appelé ici (aucun compte de service posé, `GSC_COMPTE_SERVICE` absent de Vercel). Les chemins des deux API et le format du fichier (`google<16 hexa>.html`, contenu `google-site-verification: <nom>`) sont ceux de la documentation Google ; ils se confirment au premier site vendu, voir `mise-en-service.md`.
- Ajouts hors contrat du juge, voulus et non sabotés : sans compte de service le tour ne lit même pas la table ; un refus de Google ne compte jamais comme erreur du bilan du tour (un domaine qui ne pointe pas encore chez nous ne doit pas couper le battement du livreur) ; le nom du fichier rendu par Google doit être `google<hexa>.html` avant de devenir un chemin du bucket.
