# 026-200 — les suites, hors périmètre (rien de ceci n'est fait par la fiche)

Cinq points. Le premier est une conséquence de D-0410-6 qui rougit un juge existant ; les quatre autres ferment ou précisent ce que la fiche suppose. Chacun dit qui doit le faire et ce que la fiche attend de lui.

## 1. `usine-socle-qa --groupe=coffre` : CF-10 est ROUGE depuis la ligne `PRESTI_JETON_STUDIO` (mesuré le 04/10)

La ligne posée par le chef dans `scripts/usine/coffre-regles.mjs` (D-0410-6) fait passer `NOMS_PERMIS` à douze noms. Le juge de 026-048, `scripts/usine-socle-qa.mjs`, porte sa propre liste fermée de onze noms (ligne 77, constante `NOMS_PERMIS`) et la compare à celle du code au critère CF-10 : `node scripts/usine-socle-qa.mjs --groupe=coffre` rend `FAIL CF-10 — NOMS_PERMIS de coffre-regles.mjs ≠ la liste fermée`, CF-1 à CF-9 et CF-11 à CF-13 restent verts (essai du 04/10, sortie complète rejouée une fois). Avant la ligne, les deux listes étaient identiques (onze noms ; `git diff` de `coffre-regles.mjs` : une seule ligne ajoutée).

Trois fichiers portent la même liste ; seul le premier a été changé :

| fichier | état | à faire |
|---|---|---|
| `scripts/usine/coffre-regles.mjs` (`NOMS_PERMIS`) | `PRESTI_JETON_STUDIO` posée (D-0410-6) | rien |
| `scripts/usine/presti-coffre.sh` (fonction `nom_permis`, ligne `PRESTI_JETON_CHEF \| … \| PRESTI_JETON_FACTEUR_USINE`) | **absente** | ajouter `PRESTI_JETON_STUDIO` dans le même `case` (« qui change une règle ici la change là-bas, dans le même commit », en-tête de `coffre-regles.mjs`) : sans elle, `presti-coffre poser PRESTI_JETON_STUDIO` sur l'usine répond code 2, donc **026-202 ne peut pas poser le jeton** de `studio` |
| `scripts/usine-socle-qa.mjs` (constante `NOMS_PERMIS`, ligne 77) et `scripts/fixtures/026/usine-socle/coffre/cas-valeurs.json` (`noms_permis`, comparé à la constante par un autre critère) | **absentes** | ajouter `PRESTI_JETON_STUDIO` aux deux, à la même place, puis rejouer `--groupe=coffre,socle` (CF-2, CF-3 et CF-10 le rejouent) |

Ce n'est pas à cette fiche de le faire : `presti-coffre.sh` n'est pas dans son périmètre, le juge et les fixtures lui sont interdits (« un juge n'est écrit que par Claude Code »), et D-0410-6 ne couvre que `coffre-regles.mjs`. Une seule édition regroupe les trois : l'extension du juge que 026-251 attend déjà avant sa reprise (D-0410-7 : `PRESTI_JETON_SAV`, `PRESTI_JETON_QUALITE`, `PRESTI_JETON_VIGILE` y entrent aussi ; y ajouter `PRESTI_JETON_STUDIO` au passage). Tant que ce n'est pas fait, `usine-socle-qa --groupe=coffre` reste rouge sur CF-10 et la mise en service de 026-202 est bloquée sur la pose du jeton.

## 2. Les deux fonctions SQL `acq_studio_a_fabriquer` et `acq_studio_bail_poser` n'existent dans aucune migration

La route `travail` (et `rendu`, pour retrouver le travail détenu) les appelle par `supabaseAdmin.rpc(...)` ; aucune migration de `supabase/migrations/` ni de `supabase/controles/` ne les contient, et aucune fiche de `file/`, `en-cours/` ou `fait/` ne les crée (recherche faite le 04/10). La route est écrite pour cette absence : une erreur ou une réponse qui n'est pas un tableau donne « pas de travail pour le Studio », les packs locaux (A6) continuent. **Conséquence : tant qu'une migration ne les crée pas, les échantillons du Studio (A9) ne se fabriquent jamais**, sans aucun signal d'erreur ; seuls les packs payés se fabriquent.

Ce que la route attend (le contrat à tenir) :

- `acq_studio_a_fabriquer(p_limite int)` rend un tableau, de la plus ancienne décision `studio_echantillon` accordée et sans échantillon à la plus récente, avec, par ligne : `decision_id` (uuid), `marque_cle` (clé de marque), `page_produit` (URL http(s) de 500 signes au plus), `accord_message_id`, `accord_recu_le` (date), `accord_texte` (le texte de la réponse d'accord, dont la route ne rend que 400 signes masqués), `opposition` (booléen), `refus` (booléen), `echantillons_refuses` (entiers, numéros d'échantillons déjà refusés). La route écarte elle-même `opposition` et `refus`.
- `acq_studio_bail_poser(p_decision uuid, p_bail_s int)` rend `true` si le bail (90 min, `BAIL_S`) est posé, `false` si la décision est déjà sous bail.

À faire : une fiche de migration (propriétaire de `supabase/**`), appliquée par Claude Code lui-même par le connecteur (règle « je les applique moi-même ») avec contrôle, essai à sec annulé et zéro trace. Avant son application, vérifier que le tourneur, qui lit `echantillons_refuses`, n'est pas tenu à un champ qu'elle ne produit pas.

## 3. Le plafond de 3 Mo d'un échantillon ne peut pas être tenu par la chaîne réelle (à mesurer au premier échantillon)

`LIMITES.studio.octetsMax = 3 * MO` (`lib/pubs/usinePubs.ts`, comme la fiche et comme `scripts/studio/deposer-echantillon.mjs`, `TAILLE_MAX`). Mais `scripts/studio/monter.mjs` (interdit à cette fiche) fabrique un MP4 de `DUREE_S = 15` s à débit constant, `DEBIT_CIBLE_KBPS = 3800` (minimum `DEBIT_MIN_KBPS = 3200`) : 15 s × 3 800 kbit/s font environ 7 Mo, 15 s × 3 200 kbit/s environ 6 Mo, soit deux fois le plafond. Calculé sur les constantes, pas mesuré sur un vrai fichier. Si c'est confirmé, chaque échantillon réel sera refusé à `depot` (400, `fichier_trop_gros`) ou à `rendu` (`taille_hors_limite`), le tourneur le journalisera en échec, et le chemin du poste (`deposer-echantillon.mjs`, 026-166) refuserait le même fichier : le défaut précède cette fiche.

À trancher par le chef : relever le plafond (le Gmail joint 25 Mo ; un plafond de 12 Mo laisse de la marge) dans les trois endroits qui le disent (`LIMITES.studio` de `lib/pubs/usinePubs.ts`, `deposer-echantillon.mjs`, le critère du cahier du juge UP-4 de `usine-pubs-qa`), ou recomprimer à la sortie du montage (ce qui abaisse le débit sous le plancher que `pub-qa` exige). Mesurer d'abord : `ls -l ~/presti-studio/<marque>/echantillon-<n>/sortie/echantillon.mp4` sur l'usine après le premier montage réel.

## 4. L'écran Packs du Poste n'affiche pas les échecs du tourneur

La fiche dit qu'au troisième échec un pack « reste `payee`, visible avec ses échecs dans l'écran Packs du Poste (026-147) ». Le tourneur et les routes écrivent bien ces échecs dans `packs_pubs.verifications` (`usine_echecs`, le compteur ; `usine_echec { raison, le }`, le dernier code et sa date ; `usine_bail_jusqua`, le bail), et `GET /api/controle/packs` renvoie déjà la colonne `verifications` entière. Mais l'écran (`app/controle/Packs.tsx`, et ce que `app/api/controle/packs/route.ts` en fait) ne lit aucun de ces trois champs : un pack abandonné après trois échecs reste donc `payee` sans rien montrer à Benj. Le chiffre de huit fichiers à toucher vient de la consigne du chef ; il n'a pas été recompté ici (seul `app/controle/Packs.tsx` lit `/api/controle/packs`, le reste est à inventorier par la fiche qui s'en charge : route, types, juge de l'écran, doc).

À faire : une fiche de l'écran Packs : montrer, pour un pack `payee` dont `usine_echecs` atteint `ECHECS_MAX` (3), « abandonné après N échecs, dernière raison X le … », et ce que le repli du poste prévoit (026-157). D'ici là, le repli du poste (`scripts/pack-pub/…`) se lance à la main et reste la voie sûre.

## 5. À savoir au moment de la mise en service (026-202), sans geste de la fiche

- L'unité installée portera `PRESTI_JETON_STUDIO` : le jeton de l'agent `studio` doit être dans le coffre de l'usine avant le premier passage, sinon `avec-coffre.mjs` rend « nom absent » (code 3) et le minuteur retombe sans rien faire. La migration 0113 (agent `studio`, 026-175) doit être appliquée avant (déjà indiqué dans la fiche).
- La première fabrication de bout en bout reste à regarder par Benj (cinq premiers packs, premier échantillon) : aucune ne s'est faite sur de vraies données, tout est jugé sur doublures.
