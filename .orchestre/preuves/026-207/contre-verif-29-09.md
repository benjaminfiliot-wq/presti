# Contre-vérification de 026-207 (29/09, Claude Code)

La revue Codex est indisponible (quota jusqu'au 3/10) : contre-vérification faite à la main, par sabotage réversible de
`lib/contenu/lignes.ts` (sha256 avant = sha256 après : d23cf9e2ca8754d7fe3823ded10f2b5a25194d22ec548cc04ec15e2d7ccc33af).

| Sabotage | Effet attendu | Résultat |
|---|---|---|
| S1 : la cible de l'accord n'est plus comparée (`if (false)`) | « accord pour un AUTRE post » doit passer à `publier` | attrapé par `cas-essai.mjs` (1 cas KO). Le juge `contenu-qa` seul ne le voit pas : c'est pourquoi ce cas est dans `cas-essai.mjs` |
| S2 : le bloc Crieur est neutralisé | un post `crieur_posts` deviendrait publiable | attrapé : LN-5 rouge (juge) + 5 cas KO |
| S3 : seuil Laya ignoré (`passe = true`) | un chiffre à p=0,1 passerait | attrapé : LN-4 rouge (juge) + 2 cas KO |
| S4 : drapeau baissé ignoré | fonction masquée montrée | attrapé : 3 cas KO (drapeau du post baissé, inconnu, fait à drapeau) |

Fichier restauré à l'identique après chacun. Journal brut : sortie de la commande, recopiée ci-dessous.

- S1 KO « accord pour un AUTRE post → publier » ; S2 KO ×5 + « ❌ LN-5 » ; S3 KO ×2 + « ❌ LN-4 » ; S4 KO ×3.

Constat de la relecture : le premier lancement à froid du juge a dépassé le délai de 15 s du critère LN-1 (« code 124 ») sur le PC
chargé ; rejoué, PASS. Ce n'est pas un défaut du module (cold start de l'enfant Node), mais un rouge sur le PC saturé n'est pas un
verdict.

## Écarts assumés
- Étape 6 « ajouter des cas aux fixtures du juge » : `scripts/fixtures/**` et `scripts/contenu-qa.mjs` sont hors périmètre de la fiche
  (périmètre = `lib/contenu/lignes.ts` et les preuves). Les cas supplémentaires (ligne suspendue, quota, accord d'un autre post,
  drapeau baissé, preuve Jev absente, Crieur `brouillon_publora` + `accorder`) sont donc dans `.orchestre/preuves/026-207/cas-essai.mjs`
  (52 cas, journal `cas-essai.log`, tous conformes). Le juge du Crieur (026-116) n'est pas modifié.
- Étape 2 « fait présent dans le registre » : la garde exige un registre fourni par l'appelant (`post.contexte.faits`) dès qu'un
  `fait_ids` est cité ; le juge existant ne passe aucun fait, donc ce chemin n'est éprouvé que par `cas-essai.mjs`.
- `ligne.approuvee` n'est refusé que s'il vaut explicitement `false` (le juge existant ne le renseigne pas) ; la base refuse de toute
  façon `ligne_fermee`.
