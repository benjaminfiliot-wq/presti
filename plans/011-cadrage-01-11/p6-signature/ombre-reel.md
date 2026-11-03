# La carte de l'ombre qui ne s'écrivait pas — cause, correction, preuve (tâche 036-034, 03/11/2026 au soir)

Écrit par Claude Code sur l'hôte d'agents d'Oracle, à la suite de l'essai réel du palier « ombre » de la session principale. Le compte de
test était fictif ; il est supprimé.
- Rien n'est envoyé, aucune porte « simulation » n'est levée, aucun palier « réel » n'est servi.
- Aucune migration, aucun identifiant créé, aucun fichier de `app/` ni de `lib/` touché.
- Sorties complètes et bancs : `.orchestre/preuves/036-034/resume.md`.

## En une phrase

Toute vraie demande arrive au chef Accueil **sans proposition de réponse**. Dans ce cas, le chef ne prévoit pas d'effet `ecrire_carte` mais
un `demander_brouillon` (brouillon destiné à la boîte, 036-003). Le nœud « Préparer les cartes de l'ombre » de `presti-cerveau` ignorait cet
effet. Résultat : zéro ligne `assistant_actions`, et l'événement quand même marqué « traité ».

## Ce que disent les exécutions

| Fait | Exécution | Ce qu'on y lit |
|---|---|---|
| Les passages de l'essai ne sont **pas conservés** | — | `presti-cerveau`, ses chefs et ses `lib-*` ont `saveDataSuccessExecution: "none"` (réglages du workflow). Un passage réussi est effacé, même sans carte. Les numéros 1408 et voisins sont introuvables. |
| L'essai a eu lieu de **19:04 à 19:08 UTC**, et non vers 20 h 50 comme le dit la consigne | **1409, 1413, 1417, 1422, 1426** (`lib-battement`, en erreur, mode `integrated`) | `lib-battement` ne s'appelle qu'au-delà de l'interrupteur général : celui-ci était donc ouvert pendant ces cinq minutes, et seulement elles. Aucune exécution entre 19:08:30 et les essais manuels de 19:13. |
| Le chef **a tourné** au premier passage | 1409, à 19:04:10.8 | Le battement arrive 10 s après la minute, contre 4 s aux passages suivants (1413 à 1426). L'écart correspond au chef et à son modèle. Au passage suivant, l'événement était déjà marqué. Un rejet « demande introuvable » n'appelle aucun chef et aurait donné un passage de 4 s. |
| Un 2ᵉ défaut, sans lien avec la carte | 1409 à 1426, nœud « Appeler lib-battement » | `SubworkflowPolicyDenialError` : les `callerIds` de `lib-battement` (`rAAqj7NSVJoA3grm`) n'admettaient pas le Cerveau. Le défaut est sans effet (`continueRegularOutput`), mais il y avait une erreur à chaque passage. |
| La **cause**, sur la vraie sortie du chef | **1253** (`presti-banc-cerveau`), nœud « Appeler presti-dep-accueil » | La demande fictive `…a00000000011` n'a pas de proposition. Décision : `carte` (motif `offre`). Effets prévus : `ecrire_note` et `demander_brouillon`, **aucun `ecrire_carte`**. |
| Le symptôme reproduit sur le Cerveau lui-même | **1438** (essai de la session presti-69) | Lectures fictives épinglées, chef Accueil réel. Résultat : `demander_brouillon` seul, `lignes: []`, événement marqué. |

**D'où vient la panne, dans le code** :
- `presti-cerveau`, « Composer les pages » : chaque vraie demande y est composée avec `proposition: null`, `empreinte_contact: null` et
  `destinataire.opposition: null`. C'est une limite connue de 036-030 (`branchement-reel.md`, « Limites connues »).
- `presti-dep-accueil`, « Préparer la porte » : `if (!d.proposition) continue;`. Il n'y a donc ni porte, ni `lib-executer`, ni `ecrire_carte`.
- `presti-dep-accueil`, « Assembler » : il émet à la place `demander_brouillon`, avec `pour: '036-003'`.
- `presti-cerveau`, « Préparer les cartes de l'ombre » : il ne retenait que `ecrire_carte` et `mettre_en_file_pilote`.
- Le banc de 036-030 (999) avait épinglé une sortie de chef qui **avait** une proposition : il ne pouvait pas voir ce chemin.

**Pistes écartées** :
- La contrainte et le déclencheur de 0194 ne sont pas en cause.
  - L'essai **1475** n'épingle pas l'écriture (compte fictif `…c3`). PostgREST y répond `409 / 23503` sur `assistant_actions_artisan_id_fkey`.
  - Postgres évalue les `CHECK`, dont `assistant_actions_agent`, et le déclencheur `BEFORE INSERT`
    `assistant_actions_agent_naissance` avant la clé étrangère : la ligne passe les deux.
- L'écriture n'était pas épinglée : `pinData` est vide dans la version publiée.
- Aucune branche ne saute l'ombre : « Aiguiller » sert `simulation` et `ombre`.
- Le chef n'a pas échoué : la marque n'est posée que pour un département qui a répondu.

**Un 3ᵉ défaut, trouvé en chemin** : « Écrire les cartes (ombre) » continue sur erreur, et « Préparer les marques » marquait l'événement
quand même. Une insertion refusée faisait donc perdre la carte **en silence**.

## La correction (dans n8n, enfants d'abord)

1. **`lib-battement`** : réglage `callerIds` passé à `rAAqj7NSVJoA3grm,596OC5mL2aMBq6SD`. L'appelant existant reste, et le gabarit n'écrit
   rien. La session presti-69 avait posé le même réglage. Preuve : dans 1475, le battement rend `statut: "ok"`. Aucune erreur de politique
   d'appel depuis 1471 (19:15:02).
2. **`presti-cerveau`, « Préparer les cartes de l'ombre »** : en palier `ombre`, un `demander_brouillon` du chef Accueil devient **une**
   carte à valider.
   - Outil `reponse_prospect`, titre « Répondre à une nouvelle demande ».
   - `apercu.brouillon: null`, `brouillon_a_rediger: true` : **aucun texte inventé**.
   - Motif « … rien n'est parti ; la réponse reste à rédiger ».
   - Une source de plus : `decision`, `presti-dep-accueil:<clé>`.
   - Clé : celle du chef (`brouillon:<demande>`).
   - Une seule carte par objet : si le chef a déjà écrit une carte pour cette demande, le brouillon n'en ajoute pas.
   - Le Suivi (`relance_prospect`) est prévu de la même façon. Les autres départements ne sont pas concernés.
   - En `simulation`, toujours **rien** n'est écrit.
3. **`presti-cerveau`, « Préparer les marques »** : si l'écriture des cartes échoue, un événement d'ombre de **moins de 10 minutes** n'est
   pas marqué. Il est relu au passage suivant et réécrit sans doublon (`on_conflict=artisan_id,cle`).
   - Au-delà de 10 minutes, il est marqué : une panne durable ne relance pas le chef et son modèle Sonnet à chaque minute. C'est le
     risque signalé par presti-69, qui est ainsi borné.
4. **`presti-cerveau`, « Bilan du passage »**, posé par la session presti-69 et gardé tel quel : il lève une erreur **après** la marque et le
   journal quand `ecriture_cartes === 'erreur'`. L'exécution est alors conservée (`saveDataErrorExecution: "all"`). Le message ne porte que
   le code et la contrainte de Postgres.
5. Versions de `presti-cerveau`, dans l'ordre :

   | Version | Ce que c'est |
   |---|---|
   | `9b019809-…` | Avant (036-030) |
   | `33a95c8b-…` | Publiée vers 19:17 UTC : points 2 et 4 |
   | **`78c413bb-…`** | Publiée ensuite : point 3 borné. **Version active.** |

   Seuls ces trois nœuds ont changé ; les connexions, les réglages et `pinData` (vide) sont identiques. Les enfants `presti-dep-*` et les
   autres `lib-*` n'ont pas bougé.

## La preuve

- **Banc hors ligne, rouge puis vert** : `node .orchestre/preuves/036-034/banc-cartes-ombre.mjs <export>`. Il rejoue le vrai code des nœuds
  sur la vraie sortie du chef de 1253, avec une demande sans proposition en ombre.
  - Export d'avant (`9b019809`) : 0 carte, événement marqué. **ROUGE**, comme dans l'essai.
  - Export actif (`78c413bb`) : 1 carte conforme à 0157 et 0194, événement marqué. **VERT**.
  - Avec `--ecriture-en-echec` (événement récent) : il n'est pas marqué. Avec `--ancien` en plus : il est marqué, sans rejeu sans fin.
  - Non-régression (`non-regression.mjs`) sur les 20 demandes Studio :
    - en ombre : 16 cartes avant, 17 après (16 `ecrire_carte` et 1 brouillon), sans doublon de clé ;
    - en simulation : 0 avant comme après.
- **Banc n8n `presti-banc-cerveau`, exécution 1494** (manuelle, inactif). Le cas de l'essai y est ajouté : une demande fictive composée
  comme le compose le Cerveau, compte `…c3`.
  - Le **vrai** chef Accueil rend `statut: ok` et les effets `ecrire_note, demander_brouillon, inserer_journal`.
  - Le code exact du Cerveau rejoué (copie tenue égale par `banc-egal.mjs`) donne **1 carte** pour `…c3`, 17 pour le compte Studio en
    ombre et **0** pour le compte Signature laissé en simulation. Verdict `vert`.
  - Les deux comptes historiques donnent les mêmes chiffres qu'en 1007 : 16/0/4/2 et 4/13/3/1.
- **La requête d'insertion exacte**, montrée par le banc et jamais envoyée : `POST /rest/v1/assistant_actions?on_conflict=artisan_id,cle`,
  `Prefer: resolution=ignore-duplicates,return=minimal`. Corps pour le compte d'essai, sans donnée personnelle :

  ```json
  {"artisan_id":"00000000-0000-4000-8000-0000000000c3","conversation_id":"eeeeeeee-0000-4000-8000-c00000000001","tour":1,
   "outil":"reponse_prospect","mode":"confirmation","statut":"en_attente","titre":"Répondre à une nouvelle demande",
   "entrees":{"type_action":"reponse_prospect","canal":null,"objet_id":"00000000-0000-4000-8000-c00000000001","effet":"demander_brouillon"},
   "apercu":{"brouillon":null,"canal":null,"pilote_en_reel":false,"brouillon_a_rediger":true},
   "objet_type":"conversation","objet_id":"00000000-0000-4000-8000-c00000000001","expire_le":"2026-11-10T19:20:17.008Z",
   "origine":"agent","departement":"accueil",
   "motif":"Une nouvelle demande est arrivée sur votre page ; préparé en mode ombre, rien n’est parti ; la réponse reste à rédiger (au réel, un brouillon serait préparé).",
   "sources":[{"fait":"evenement","source":"evenements_metier:eeeeeeee-0000-4000-8000-c00000000001"},
              {"fait":"objet","source":"leads:00000000-0000-4000-8000-c00000000001"},
              {"fait":"palier","source":"departements_reglages:00000000-0000-4000-8000-0000000000c3:accueil:ombre"},
              {"fait":"decision","source":"presti-dep-accueil:brouillon:00000000-0000-4000-8000-c00000000001"}],
   "cle":"brouillon:00000000-0000-4000-8000-c00000000001"}
  ```

- **L'insertion confrontée à la vraie base** : essai **1475** de presti-69, sur `presti-cerveau`, écriture non épinglée, compte fictif.
  Seule la clé étrangère refuse la ligne, ce qui est attendu : aucun compte réel, et je n'en crée pas. Rien n'est écrit. L'erreur du
  Bilan a gardé l'exécution.
- **Reste à faire, par la session principale** : rejouer l'essai réel avec son script, sur un compte de test.
  - Attendu : une ligne `assistant_actions` avec `origine = 'agent'`, `departement = 'accueil'` et `cle = 'brouillon:<lead>'`, en moins de 2 minutes.
  - L'événement doit être marqué traité, avec **zéro envoi**.
  - Si l'écriture échoue, une exécution en erreur est désormais **conservée** : elle donne le code de Postgres.

## Retour arrière

Chaque pas est réversible, et rien n'est à nettoyer en base : aucune ligne n'a été écrite.
1. `presti-cerveau` : `restore_workflow_version` sur `9b019809-fcc0-44a2-b951-441b95a7f678`, puis `publish_workflow`. On revient au
   comportement de 036-030, sans carte pour une demande sans proposition. Pour ne défaire que le rejeu borné : restaurer `33a95c8b-…`.
2. `lib-battement` : `setWorkflowSettings` avec `callerIds = "rAAqj7NSVJoA3grm"`. Les erreurs de politique d'appel reviennent alors à
   chaque passage ouvert.
3. `presti-banc-cerveau` : restaurer `a5f45834-b5b5-4577-b35f-679b1620fc23`. Il est inactif et jamais publié.
4. Si des cartes d'agents ont été écrites entre-temps par un essai réel : `delete from public.assistant_actions where origine = 'agent'`.
   C'est un geste de la session principale, sur le compte de test seulement.

## Limites, écrites

- La carte d'ombre d'une demande sans proposition n'a **pas de texte** : le Cerveau ne compose pas de proposition, et la boîte (036-003)
  n'écrit rien en ombre. Pour comparer un vrai brouillon à ce que l'artisan a fait, il faudra une proposition composée en amont, sur le
  « go » de Benj.
- Le rejeu borné se fonde sur `survenu_le`, lu dans `n8n_evenements_a_traiter`. Un événement sans date est marqué tout de suite, jamais
  rejoué : choix prudent, pour ne pas rejouer sans fin.
- Les chefs Devis, Suivi et Facturation n'émettent pas de `demander_brouillon` vu par ce banc. Seul l'Accueil est prouvé ici.
- Un passage réussi n'est toujours pas conservé, c'est voulu (fiche méthode n8n, point 9). On ne lit une carte réussie qu'en base.
