# 031-011 — journal des écritures et notes tirées des vidéos

Date : 02/11/2026. Auteur de toutes les notes : `claude-code`. Aucune note n'a été écrite autrement que par `creerNote` et `relierNotes`.

## 1. Journal des écritures (code)

- `cerveau/src/ecriture.mjs` : `creerNote(args, options)` et `relierNotes(args, options)` journalisent eux-mêmes, succès et refus, au format de
  `data/journal.jsonl` (`origine`, `outil`, `auteur`, `requete`, `resultats`, `refus`, `duree_ms`). Le contenu des notes et la valeur refusée ne sont jamais
  journalisés. `origine` vaut `direct` (appel de script) ou `mcp`.
- `cerveau/src/mcp.mjs` : pour `creer_note` et `relier_notes`, il appelle avec `{ origine: 'mcp' }` et n'écrit plus sa propre ligne : une seule ligne par appel.
- Garde d'essai : un appel direct n'écrit rien quand `CERVEAU_VAULT_ECRITURE` est posé sans `CERVEAU_DATA`, pour que `test-ecriture.mjs` (vault jetable) ne
  salisse pas le vrai journal. Constaté : aucune ligne « jetable » dans `data/journal.jsonl`.
- `cerveau/scripts/test-journal-ecriture.mjs` (nouveau) : vault et journal jetables, 15 vérifications (succès direct, deux refus, relier succès et refus,
  trois appels par le vrai `mcp.mjs` en JSON-RPC, pas de doublon, contenu non journalisé, valeur refusée non recopiée).
- Mutation : avec `journaliser` rendu muet (copie dans le dossier temporaire de session), le test sort en code 1 avec 6 échecs
  (« creerNote direct : exactement une ligne de journal — 0 ligne(s) », etc.). Sans mutation : « Tout passe. »
- `test-ecriture.mjs` (l'autre moitié de `verifier`) : « 119 vérifications passées, 0 en échec » (il était à 1 échec avant la correction de la garde d'essai ; son
  test « MCP : le journal garde le geste et le refus » exige la ligne du serveur d'essai).

## 2. Notes créées (16), toutes via `creerNote`

Statut = premier statut du modèle ; seul Benj les valide. Chacune est reliée à l'Index de son dossier par `creerNote` (index renvoyé), puis aux notes voisines
par `relierNotes` (section « Liens »). Sources : `presti/plans/analyse-videos.md` (lignes) et horodatages des vidéos, dans l'en-tête `sources` de chaque note.

| Note | Dossier | Type / statut | Sources principales |
|---|---|---|---|
| Client type - Plombier | 30 Prospection/01 ICP | segment / hypothese | analyse :99-105, :285, :1517 ; O3A2xnBadFo [04:19], RWKyUJLi-kI [01:30] |
| Client type - Électricien | idem | idem | idem |
| Client type - Menuisier | idem | idem | idem |
| Client type - Maçon | idem | idem | idem |
| Client type - Peintre | idem | idem | idem |
| Les objections des artisans et ce qui y répond | 30 Prospection/03 Objections | apprentissage / candidate | :102, :113, :282, :363, :1518 ; O3A2xnBadFo [01:49], RWKyUJLi-kI [03:36], k1adsrTHwPg [00:45] |
| Fiche de découverte d'un artisan | 30 Prospection/02 Playbooks | playbook / brouillon | :41-43, :208, :253, :400, :1519 ; O3A2xnBadFo [01:24]-[01:44], RWKyUJLi-kI [03:36]-[03:42], k1adsrTHwPg [00:13] |
| Règles de tri des artisans à contacter | idem | idem | :352, :399, :214, :283, :128, :416-418 ; k1adsrTHwPg [00:16], [00:51], [00:40] |
| Compte rendu d'échange versé au réseau neuronal | 50 Automatisations/01 Workflows n8n | playbook / brouillon | :397, :401, :1505 ; k1adsrTHwPg [00:36], [00:40] ; architecture-outils.md |
| Campagne e-mail par métier | 30 Prospection/02 Playbooks | playbook / brouillon | :122-131, :279-285, :1526 ; O3A2xnBadFo [03:14], [01:48], RWKyUJLi-kI [02:49], [03:31] |
| Dream 100 par ville | idem | idem | :206, :278-279, :1527 ; RWKyUJLi-kI [02:44]-[02:50] |
| Montée en charge d'un domaine d'envoi | idem | idem | :47, :123-124, :1525 ; O3A2xnBadFo [02:48], [02:51] |
| Carrousel BTP en sept diapositives | 40 Vidéos/02 Formats | playbook / brouillon | :1181-1182, :1213, :1535 ; TikTok carrousel BTP 13,4-21,3 s |
| Animation de fonctionnalité carte par carte | idem | idem | :958, :964-970, :1017, :1536 ; TikTok logiciel d'agence 3D 3-34 s |
| Bilan hebdomadaire du maillon faible | 50 Automatisations/04 Prompts | prompt / brouillon | :127, :356, :421, :1529 ; O3A2xnBadFo [00:05], [00:15]-[00:16], k1adsrTHwPg [01:12] |
| Analyse des vidéos du 1er novembre - ce qu'elles ont imposé | 90 Apprentissages | apprentissage / candidate | :1476-1509, :1511-1536, :1561-1577 ; reliée depuis `Index - Références vidéo` |

Lignes du journal correspondantes (`data/journal.jsonl`, origine `direct`) : 17 lignes `creer_note` (16 créations, 1 refus) et 17 lignes `relier_notes`
(16 notes reliées entre elles + `Index - Références vidéo`), du 2026-11-02T10:16:31Z au 10:17:06Z. Le refus : « titre : caractère interdit dans un nom de note »
(la première tentative de titre contenait « 01/11 ») ; la note a été recréée sous « 1er novembre ».

### Écarts à connaître

- **Déjà présentes, donc non recréées** (vérifiées par `chercher` puis `Glob`) : ADR-007 (SMS), l'apprentissage sur les revenus invérifiables, l'erreur 031-004.
- **Note sur l'analyse des vidéos** : la consigne la voulait dans `40 Vidéos/04 Références`, mais aucun type de `TYPES` (`ecriture.mjs:24-34`) n'autorise ce dossier et le
  périmètre interdit d'y toucher. Elle est dans `90 Apprentissages` et reliée depuis `Index - Références vidéo` par `relierNotes`. Si Benj la veut dans
  `40 Vidéos/04 Références`, c'est un déplacement à lui (ou l'ajout d'un dossier à `TYPES`).
- **Les cinq clients types sont volontairement minces** : l'analyse ne contient aucune douleur ni aucun vocabulaire propre à un métier, seulement la méthode (un métier,
  mots exacts, une douleur par e-mail). Chaque fiche le dit et renvoie aux échanges réels ; rien n'a été inventé.
- **Tensions de l'analyse laissées visibles pour Benj** : « échantillon de destinataires validé avant l'envoi » (O3A2xnBadFo [02:39]) contre ADR-005 (aucune validation
  de Benj) ; 30 jours (O3A2xnBadFo) contre 60 à 90 jours (k1adsrTHwPg) avant de juger ; « pourquoi maintenant » rejeté comme fausse urgence ou gardé comme urgence réelle.
- Personne n'est nommé ni aucune coordonnée : `creerNote` n'a rien refusé sur ce motif. Les identifiants de vidéos (YouTube) sont cités, pas les noms de comptes TikTok.
- `workflow` n'est pas rempli dans le playbook du compte rendu : le workflow n8n n'existe pas (`architecture-outils.md`, n8n sans workflow métier au 01/11).

## 3. Carte Anki 2 (`SaaS/90 Apprentissages/Anki/anki-2026-11-01.tsv`, ligne 2 seule)

Avant :

```
Qui envoie les e-mails automatiques ?	Seule la chaîne serveur. Plus d'envoi en cliquant dans Gmail, Brevo ou n8n ; les tâches d'envoi et de publication sont en pause.	vault/Decisions/Journal-Decisions.md
```

Après :

```
Qui envoie les e-mails automatiques ? (état au 01/11/2026)	Au 01/11/2026, seule la chaîne serveur envoie, et les tâches d'envoi et de publication sont en pause. La cible décidée par les ADR-001 et ADR-004 est l'e-mail en masse par n8n et Brevo gratuit (300 par jour). Jamais d'envoi en cliquant dans une interface (Gmail, Brevo ou n8n).	vault/Decisions/Journal-Decisions.md:36 ; vault/10 Presti/04 Décisions/ADR-004 — Brevo gratuit pour l'e-mail en masse.md
```

Les trois champs sont toujours séparés par des tabulations (3 champs sur chaque ligne, contrôle `awk`). Les autres lignes et `Journal-Decisions.md` n'ont pas été touchés. La phrase
citée du Journal est à sa ligne 36 aujourd'hui (la consigne disait :18).

## 4. Ce qui n'a pas été fait

Ni commit, ni push, ni build, ni typecheck, ni migration. Aucun secret lu ni affiché. Aucune note de Benj ni ADR acceptée modifiée (`relierNotes` n'a touché que des notes
d'agent au premier statut et des notes-index). La sortie de `node scripts/orchestre.mjs verifier 031-011` est ajoutée plus bas.

## 5. Verdict mécanique

`node scripts/orchestre.mjs verifier 031-011` (tâche d'abord dans en-cours/, puis dans fait/) :

```
✓ 031-011 : PASS · 2s · 0 ligne(s) produite(s) · preuve : .orchestre/preuves/031-011/verifier.log
```

`verifier.log` contient la sortie de `test-journal-ecriture.mjs` (« Tout passe. ») et de `test-ecriture.mjs` (« 119 vérifications passées, 0 en échec »).
