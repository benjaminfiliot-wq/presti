# Contre-vérification 026-083 — 29/09 (fiche NON PASS : voir la cause en fin de fichier)

Moyen : le verifier officiel (`conformite-qa`, 3 min par passage, rouge sur CO-4/5/9/10 pour des causes du juge, voir plus bas) ne peut pas
mesurer un sabotage. Les 4 sabotages ont donc été mesurés par un banc jetable (scratchpad de la session) : copie de `lib/agents/acquisition/`
dont les seuls écarts sont `approuve: true`, `NOTICE_URL` posée, `DOULEURS` = celles du corpus du juge (fictives, approuvées), FAQ approuvée ;
il rejoue le corpus de 78 messages du juge (`entreeDe` recopié de `conformite-qa.mjs`) puis 18 cas de complément (faits, douleur, longueur du
champ, historique, source `meta`, FAQ, formes Meta) que le corpus ne peut pas exprimer. Sur ce banc, avant sabotage : 18/18 cas de complément
verts ; 12 écarts du corpus, tous expliqués plus bas (aucun ne vient de conformite.ts).

Protocole ×4 : sha256 avant → une seule modification de `lib/agents/acquisition/conformite.ts` → banc rejoué → constat du rouge → fichier
restauré depuis la copie → sha256 recontrôlé. Sha256 de production avant = après :
`8b133e46549aed3c72cb105a7db3edb59a94cd07c933f9ff2eca0bb0ce9af852`.

| # | Sabotage (un seul point) | Rouge constaté sur le banc |
|---|---|---|
| 1 | test `premiere_phrase` d'un formulaire remplacé par `if (false)` | `f-premiere-phrase` et `f-premiere-phrase-modifiee` : raison `premiere_phrase` manquante |
| 2 | test des chiffres/`%`/nombres en lettres de `promesse` remplacé par `if (false \|\|` | `f-promesse-pourcent` et `f-promesse-chiffre` : `promesse` manquante |
| 3 | fenêtre de la `confirmation_stop` portée de 24 h à 240 h | `f-oppose-stop-30h` accepté (`oppose` attendu) |
| 4 | test `lien_formulaire` remplacé par `if (false)` | `f-lien-formulaire` et `f-prestiapp-formulaire` : `lien_formulaire` manquante |

Un premier essai de sabotage 2 (retirer `garanti` de `LISTE_NOIRE`) n'a rien rougi : le corpus du juge y ajoute toujours `48 h`, que le test des
chiffres attrape aussi. Ce n'est pas un défaut du sabotage mais un trou du corpus (un seul mot de la liste noire, seul, n'est jamais testé) ;
signalé, pas corrigé (fixtures interdites à cette fiche).

## Étalonnage du second juge : tenté, pas obtenu

`node scripts/usine.mjs executer … -- node --import ./scripts/ts-loader.mjs scripts/conformite-qa.mjs --etalonner --reel --confirmer-reel` : paquet
accepté, bac monté, commande finie en 0,4 s avec `modele_agents 100%/0%, modele_rejuge 100%/0%` (tous refusés, aucun conforme accepté) : le
lecteur était `null` (`creerLecteur('facteur')` rend null sans `CODEX_LANCEUR` exécutable dans l'environnement de l'usine), donc `jugerTon`
fermé par défaut. Le rapport écrit par cette passe a été SUPPRIMÉ (il aurait fait passer un lecteur absent pour un étalonnage raté) ;
`ETALONNAGE` est restée à `version: null` (amorce posée pour la passe puis retirée). Le juge n'a d'ailleurs aucune garde contre un lecteur null.

## Cause exacte de l'absence de PASS

1. **Approbation de Benj (geste réservé)** : tous les modèles sont à `approuve: false` (voulu par la fiche). Tant qu'`approbation.txt` n'existe pas,
   `jugerMessage` rend `modele_non_approuve` : CO-4 et CO-10 ne peuvent pas être verts, et une partie de CO-5 (raisons manquantes derrière).
2. **`NOTICE_URL` est `null` dans `contrat.ts`** (posée par 026-162, pas encore) : la fiche exige que J3 refuse alors tout formulaire (`notice_absente`),
   ce que fait le module ; les conformes du corpus (`notice_url` d'essai en `github.io`) ne peuvent donc pas être acceptés.
3. **Douleurs** : `DOULEURS` réelle est entièrement `approuve: false` (geste de Benj, 026-073) ; le corpus attend `douleur_id` absent = accepté.
4. **Le juge ne peut pas exprimer plusieurs de ses propres cas** (`entreeDe` de `conformite-qa.mjs`, fixtures interdites à cette fiche) :
   - `prospect.faits` jamais passé, `fait_id` toujours null : `c-formulaire-b-ademe` (conforme) et `f-fait-absent` (fautif) sont le MÊME appel ;
     `f-extrait-altere` ne peut pas rendre `extrait_altere`.
   - `formulaire` jamais passé : `f-longueur-champ` ne peut pas rendre `longueur_champ` ; `historique` toujours vide : `f-trop-de-messages`,
     `f-trop-tot`, `f-deja-contacte` ne peuvent rien rendre ; `approuve` de la ligne du corpus ignoré : `f-modele-non-approuve`.
   - `c-formulaire-studio` est jugé avec la source `ademe_rge` alors que son pied cite `meta` ; `c-rep-faq` n'a pas de `faq_id` et un texte
     absent de la FAQ.
   - `c-lien-meta-froid` et `c-lien-entrant-meta` n'ont ni mention IA ni STOP, alors que la fiche dit « chaque modèle porte la mention IA » et le
     STOP de tout modèle non exempté ; `modeles.ts` a suivi la fiche (pied Meta ajouté aux quatre `lien_maquette_*_meta*` et aux
     quatre `lien_maquette_entrant_*_meta*`), d'où `hors_modele` sur ces deux conformes. À arbitrer par le propriétaire du juge.
5. **Étalonnage impossible tant que `CODEX_LANCEUR` n'est pas posé sur l'usine** (CO-9).
