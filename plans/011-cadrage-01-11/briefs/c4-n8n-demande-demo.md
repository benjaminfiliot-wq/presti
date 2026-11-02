# Brief — workflow n8n `presti-demande-demo` (chantier 4, lot L19, tâche 032-026)

Écrit le 02/11/2026 par Claude Code. Sources : tâche `.orchestre/en-cours/032-026.md` ; plan du chantier 4
(`plans/011-cadrage-01-11/chantier-4-assistant-plan.md`) §0 bis rang 16 (l.87-88), table de la l.173, volet « démo Entreprise »
(l.175-209), question 4 (l.238), §8.2 (l.551-569), §14 ligne L19 (l.847) ; formulaire du chantier 2
(`plans/011-cadrage-01-11/c2-lot4/texte.md:278-286`) ; inventaire `p5-entreprise/inventaire.md:76` ; règle n8n-first
(`.claude/rules/architecture-outils.md`) ; fiche méthode n8n (`p5-entreprise/fiche-methode-n8n.md`, points 6, 8, 9 ; fiche 8).
Juge hors ligne : `scripts/demandes-demo-qa.mjs`. Workflow : n8n d'Oracle, id `4R2wS9374GUxb63F`, **inactif, jamais publié**.

## Ce que fait le workflow

Toutes les 15 minutes (cron `0 */15 * * * *`, fuseau `Europe/Paris`), il lit les demandes de démo neuves de `demandes_demo` (0190) et
prévient Benj sur Slack `#presti-auto`, **une fois par demande** ; il relance Benj **à J+2** si la demande n'est pas marquée « traitée »
dans `/controle`. **Aucun envoi au demandeur** : la confirmation et le rappel de rendez-vous du plan (l.202-204) attendent la question 4
et la validation des textes par Benj. Aucune écriture en base, aucun modèle.

| # | Nœud | Type | Rôle |
|---|---|---|---|
| 1 | Toutes les 15 minutes | Schedule Trigger 1.4 | cron `0 */15 * * * *` |
| 2 | Fenêtres du passage | Code | la fenêtre `[fin − 15 min, fin)`, `fin` = l'heure du passage arrondie au quart d'heure, moins 5 minutes ; la relance : la même fenêtre 48 h plus tôt |
| 3 | Lire demandes neuves | HTTP Request 4.5, **GET** | `select=id,taille,activite,etat,cree_le`, `motif=eq.entreprise`, `and=(cree_le.gte.<début>,cree_le.lt.<fin>)`, `order=cree_le.asc,id.asc`, `limit=200` |
| 4 | Lire demandes à relancer | HTTP Request 4.5, **GET** | idem, fenêtre de J−2, plus `etat=eq.nouvelle` |
| 5 | Avis à Benj | Code | refait les filtres DANS LE CODE (refus par défaut), ne garde que identifiant, taille, activité, date ; un avis `demo:<id>:avis` et une relance `demo:<id>:relance_j2` au plus par demande |
| 6 | Prévenir Benj (#presti-auto) | Slack 2.7, message | `={{ $json.texte }}`, identifiant existant « Slack account 2 » (`lR0GZ7FGXI3FCAF8`, déjà celui de `presti-garde-sauvegarde`), sans lien vers le workflow |

Les deux lectures : URL `https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/demandes_demo`, identifiant prédéfini `supabaseApi`
« Supabase account » (`dTewDK98MLrNckNG`), `timeout` 30 s, `executeOnce` et `alwaysOutputData` (une lecture vide ne coupe pas la
chaîne ; le nœud 5 écarte l'élément vide). Aucun identifiant créé ni modifié.

## Ce que n8n lit (et rien d'autre)

`id`, `taille`, `activite`, `etat`, `cree_le` de `demandes_demo` (0190 : l.24, 26, 27, 31, 36), plus le filtre sur `motif` (l.25).
**Jamais** `prenom`, `email` ni `message` (plan l.199-201 : « le prénom et l'e-mail, seulement au moment d'envoyer, jamais le
message ») : aucun envoi au demandeur dans ce lot, donc aucune lecture de coordonnées. Le message Slack ne porte ni nom, ni adresse :
l'activité, la taille de l'équipe et le lien vers `/controle?onglet=demos` (plan l.200-201).

**Ce qui protège vraiment, aujourd'hui** (audit distinct de 032-026, point 2) : les lectures passent par « Supabase account », la clé
de service, qui passe outre la RLS et les droits par colonne. La seule barrière devant prénom, adresse et message est donc le `select=`
des deux nœuds, figé par le juge (gabarit exact, empreintes, mutants). La voie stricte est prête côté base : 0190 accorde ces mêmes
colonnes, et elles seules, au rôle `n8n_lecture` de 0189 s'il existe ; elle demande un identifiant Postgres `n8n_lecture` dans n8n,
que seul Benj peut créer (`.claude/rules/securite.md`), et que 0189 soit appliquée AVANT 0190 (sinon le bloc est sauté : le rejouer).

## Une fois par demande, sans mémoire dans n8n

n8n n'écrit pas en base (il tire, il ne reçoit rien ; `n8n_lecture` est en lecture seule) et le registre ne vit jamais dans
`getWorkflowStaticData` (`c4-n8n-suivi-artisan.md`, « Jamais `getWorkflowStaticData` comme registre »). La garantie « une fois » tient
donc aux **fenêtres** : alignées sur l'horloge, de 15 minutes, elles se suivent sans trou ni chevauchement ; une demande tombe dans
une seule fenêtre d'avis et une seule fenêtre de relance. Le décalage de 5 minutes laisse à une écriture le temps d'être visible.
Le juge le prouve sur des passages tirés au hasard (chaque demande : un avis exactement ; une relance exactement si elle n'est pas
traitée 48 h après, aucune sinon).

**Limite écrite** (fiche 8 et « scheduling » du MCP : pas de rattrapage) : un passage manqué (n8n arrêté) ne prévient pas pour les
demandes de sa fenêtre. Rien n'est perdu : la demande est en base, l'e-mail actuel est parti, et l'onglet « Démos » la montre avec son
compteur « À traiter ». Le remède durable — une colonne `avis_le` posée par n8n après l'envoi (règle 8 du SDK) — demande une écriture
de n8n en base : décision de Benj, pas de ce lot.

## Les textes (à valider par Benj avant l'activation)

```text
Nouvelle demande de démo entreprise : {activité}, équipe {taille} personnes. À lire et traiter dans le Poste de contrôle : https://qg.prestiapp.fr/controle?onglet=demos
Demande de démo entreprise toujours à traiter, reçue il y a 2 jours : {activité}, équipe {taille} personnes. Poste de contrôle : https://qg.prestiapp.fr/controle?onglet=demos
```

Pour une équipe de 1, « équipe seul ». Textes fixes, internes à Presti (Benj seul les lit).

## Réglages du workflow

`executionOrder: v1`, `timezone: Europe/Paris`, `saveDataSuccessExecution: none` (rien des passages réussis ne reste dans la base
de n8n), `availableInMCP: true` (c'est par le MCP que Claude Code construit, exporte et essaie). Aucun `errorWorkflow` : aucun
workflow d'erreur commun n'existe encore (rang 26).

## Ce que le juge garantit — et ses limites

`scripts/demandes-demo-qa.mjs`, hors ligne : export inactif ; nœuds permis seulement ; chaîne exacte ; chaque lecture comparée à un
gabarit exact (GET, URL, identifiant, `select=` sans coordonnées, filtres) ; un seul nœud d'envoi, vers `#presti-auto` ; réglages en
liste blanche ; aucun secret ; empreintes SHA-256 du code ; rejeu du code des deux nœuds dans un contexte `vm` sur l'essai épinglé (même
sortie que n8n) et sur des passages tirés ; mutants. Limites : le rejeu n'est pas n8n ; la lecture réelle (0190 non appliquée : 404) n'est
pas l'objet de ce lot ; l'envoi Slack réel n'a jamais été fait (nœud épinglé à l'essai).
