# Brief — workflow n8n `presti-suivi-artisan` (chantier 4, lot L17, tâche 032-014)

Écrit le 02/11/2026 par Claude Code. Sources : tâche `.orchestre/en-cours/032-014.md` ; plan du chantier 4
(`plans/011-cadrage-01-11/chantier-4-assistant-plan.md`) §0 bis rang 11 (l.77-78), question 4 (l.238), règles communes (l.127-158),
§7 vocabulaire (l.525-526), rang 23 (l.101-102), rang 10 (l.74-76), rang 26 (l.107-108), §14 ligne L17 (l.845) — numéros relus le 02/11 au soir : le plan a bougé de deux lignes depuis la tâche ; vidéos
`plans/analyse-videos.md:143`, `:205`, `:255` ; règle n8n-first (`.claude/rules/architecture-outils.md`) ; e-mail
(`.claude/rules/email-brevo.md:19-20`) ; mémoire `un-message-par-artisan-avant-5-jours` ; audit `032-010` (É1, É3, M1, M10, M11, F1, F2).
Juge hors ligne : `scripts/suivi-artisan-qa.mjs`. Workflow : n8n d'Oracle, id `2HsfV00lGSX1KGY1`, **inactif, jamais publié**.

## Ce que fait le workflow

Chaque jour à 10 h (Europe/Paris ; **défaut du lot, à valider par Benj**), en **brouillon** : il lit des identifiants, des dates et
des statuts, forme au plus un brouillon d'e-mail par artisan, né d'un événement réel lu en base, et rend un bilan agrégé par étape.
Il n'envoie rien, n'écrit rien, n'appelle aucun modèle. Ce sont des e-mails **de Presti à ses artisans clients** (chantier 4, pas la
prospection) : ils ne portent jamais la mention d'IA (plan l.128-141, message de Presti). **Mention d'IA : non visé.**

| # | Nœud | Type | Rôle |
|---|---|---|---|
| 1 | Déclencheur 10 h | Schedule Trigger 1.4 | tous les jours à 10 h, fuseau du workflow `Europe/Paris` |
| 2 | Réglages du suivi | Code | jour de Paris, mode `brouillon`, `mention_ia: 'non_vise'`, offres suivies, fenêtres des étapes, écart de 5 jours, plafond par passage, début de la lecture des comptes |
| 3-7 | Lire comptes, Lire demandes, Lire devis, Lire factures, Lire registre du suivi | HTTP Request 4.5, **GET** | une lecture par table sur `https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/<table>`, `select=` limité aux colonnes permises (plus bas), identifiant prédéfini `supabaseApi` « Supabase account » (`dTewDK98MLrNckNG`) ; pages de 1 000 lignes (au plus 50), `timeout` 30 s ; `executeOnce` et `alwaysOutputData` (une table vide ne coupe pas la chaîne) |
| 8 | Départ du suivi | Code | écarte DANS LE CODE aussi : démo, fondateur, suppression demandée, offre hors du suivi, opposition au suivi (`notifications.suivi === false`) ; une colonne absente écarte (refus par défaut) |
| 9 | Étape premiers pas | Code | J0 à J+2 : au plus un message, né de la première réussite réelle |
| 10-11 | Étape bilan J+14, Étape bilan J+30 | Code | les comptes réels depuis l'inscription ; sans aucun événement, aucun message (« silencieux ») |
| 12 | Garde du suivi | Code | clé déjà au registre ; écart de 5 jours ; un brouillon par artisan et par passage ; plafond (le surplus est reporté) |
| 13 | Textes du suivi (brouillons) | Code | les textes fixes ci-dessous, chacun `statut: 'brouillon'` ; refuse un brouillon sans texte ou un champ manquant |
| 14 | Brouillons et bilan | Code | la seule sortie : `{ mode, mention_ia, jour, bilan: { par_etape, ecartes, reportes }, brouillons }` |

Un brouillon : `{ cle, artisan_id, etape, variante, champs, evenements }`, clé `suivi:<artisan_id>:<étape>` ; chaque événement
`{ table, id, colonne, date }`, la date telle que lue. Jamais un nom, une adresse, un e-mail ni un texte.

## Les colonnes permises (et rien d'autre)

Règle (plan §0 bis, « Ce que n8n lit », l.142-153) : des identifiants, des dates et des statuts. Sous-ensemble de la liste de la tâche,
toutes accordées à `n8n_lecture` (`0189_role_lecture_n8n.sql:38-41`) sauf `notifications` (des booléens par type, absents du rôle).
Écartées parce qu'inutiles : `devis.statut`, `devis.created_at` (l'envoi et l'acceptation ont leur date). Jamais `email`, `nom`, `tel`,
`slug`, `metier` ni un texte. La tâche cite `created_at` des artisans à `0001_artisans.sql:11` : c'est `tel` ; `created_at` est à la l.13.

| Table | Colonne | Source |
|---|---|---|
| `artisans` | `id` | `0001_artisans.sql:5` |
| `artisans` | `plan` | `0001_artisans.sql:12` |
| `artisans` | `created_at` | `0001_artisans.sql:13` |
| `artisans` | `is_founder` | `0003_founders.sql:8` |
| `artisans` | `est_demo` | `0068_controle.sql:127` |
| `artisans` | `suppression_demandee_le` | `0052_parametres.sql:26` |
| `artisans` | `notifications` | `0052_parametres.sql:19` |
| `leads` | `id` | `0010_hardening.sql:7` |
| `leads` | `artisan_id` | `0010_hardening.sql:8` |
| `leads` | `canal` | `0010_hardening.sql:9` |
| `leads` | `created_at` | `0010_hardening.sql:11` |
| `devis` | `id` | `0002_devis.sql:37` |
| `devis` | `artisan_id` | `0002_devis.sql:38` |
| `devis` | `envoye_le` | `0055_verrou_credits_stripe.sql:35` |
| `devis` | `accepte_le` | `0033_devis_conversation.sql:4` |
| `factures` | `id` | `0006_factures.sql:11` |
| `factures` | `artisan_id` | `0006_factures.sql:12` |
| `factures` | `statut` | `0006_factures.sql:17` |
| `factures` | `emise_le` | `0041_facturation_electronique.sql:17` |
| `factures` | `avoir_de` | `0041_facturation_electronique.sql:20` |
| `suivi_artisan_envois` | `cle` | à créer (question 1) |
| `suivi_artisan_envois` | `artisan_id` | à créer (question 1) |
| `suivi_artisan_envois` | `etape` | à créer (question 1) |
| `suivi_artisan_envois` | `envoye_le` | à créer (question 1) |

Filtres de la requête (le code les refait) : `artisans` : `plan=in.(studio,signature,entreprise)`, `est_demo=is.false`,
`is_founder=is.false`, `suppression_demandee_le=is.null`, `created_at=gte.<jour − 34>` ; les quatre autres : `artisan_id=in.(…)` des
comptes lus. Le registre n'existe pas : tant que la table manque, sa lecture échoue (404) et le passage s'arrête avant tout brouillon.
Jamais `getWorkflowStaticData` comme registre.

## Les étapes (jours comptés au jour de Paris depuis l'inscription)

| Étape | Passe les jours | Événements retenus | Variante | Champs | Se tait |
|---|---|---|---|---|---|
| `premiers_pas` | J0 à J+3 (un jour de rattrapage) | la **première** réussite, datée de J0 à J+2 : demande reçue (`leads.created_at`, canal autre que `import`), devis envoyé (`devis.envoye_le`), devis accepté (`devis.accepte_le`), facture émise (`factures.emise_le`, statut `emise` ou `payee`, `avoir_de` vide) | `premiere_demande`, `premier_devis_envoye`, `premier_devis_accepte`, `premiere_facture` | aucun | inscription seule ; demande importée ; avoir ; facture annulée |
| `bilan_j14` | J+14 à J+16 | tous les événements ci-dessus, depuis l'inscription jusqu'au jour du passage | `comptes` | `demandes_recues`, `devis_envoyes`, `devis_acceptes`, `factures_emises` | aucun événement : « silencieux » au bilan |
| `bilan_j30` | J+30 à J+32 | idem | `comptes` | idem | idem |

Fenêtres, rattrapage, heure et plafond (10 par passage) : **défauts du lot, à valider par Benj** (questions 3 et 4 de `resume.md`).
Le message des premiers pas ne redit pas un avis qui existe déjà (nouvelle demande, devis accepté, fin d'essai) : il dit la suite.

## La garde (une fois par étape et par artisan)

- une clé `suivi:<artisan_id>:<étape>` déjà au registre ne revient jamais ;
- jamais un e-mail du suivi à un artisan moins de 5 jours après le précédent (registre, `envoye_le` au jour de Paris ; une date
  illisible compte comme un envoi du jour) ;
- au plus un brouillon par artisan et par passage ;
- au-delà du plafond : reporté, jamais perdu tant que la fenêtre court ; la fenêtre la plus proche de sa fin passe en tête au passage
  suivant (même principe que `.claude/rules/email-brevo.md:18`). Limite : un report au dernier jour d'une fenêtre se perd (question 3).

## Les textes (brouillons, à valider par Benj)

Textes **fixes** : aucun appel à un modèle. E-mails de Presti (`lib/email.ts:6-9`, Reply-To `contact@prestiapp.fr`) : sans mention
d'IA. Ton du vault (« Relances - prospection et produit », §2 ; `mails.md:60-61`) : ni « vous n'avez pas… », ni culpabilité, ni fausse
urgence. Aucun chiffre écrit : les nombres viennent des champs, entre accolades. Aucun mot du §7 ni marque du rang 23. Aucune offre
n'est visée par un texte, donc aucun ne dit « part seul », « envoie seul » ni « relance prévue » (Studio n'a pas `plateforme.ia.auto`,
`lib/plans.ts:149`). Une ligne pour ne plus recevoir ces e-mails. Signature : « Presti » (question 7). Une ligne à zéro du bilan
s'écrit telle quelle (« Devis acceptés : 0 »), sans reproche.

### premiers_pas.premiere_demande

Objet : Une première demande : la suite

```text
Bonjour,

Une première demande est arrivée sur votre page. Vous retrouvez l’échange dans Messages, et le devis se prépare depuis la même conversation.

Une question en route ? Répondez simplement à cet e-mail.

Pour ne plus recevoir ces e-mails de suivi, répondez « stop » à ce message.

Presti
```

### premiers_pas.premier_devis_envoye

Objet : Votre premier devis est parti : la suite

```text
Bonjour,

Votre premier devis est parti. Quand votre client l’accepte, ouvrez le devis et cliquez « Créer la facture » : les lignes sont reprises, la numérotation suit.

Une question en route ? Répondez simplement à cet e-mail.

Pour ne plus recevoir ces e-mails de suivi, répondez « stop » à ce message.

Presti
```

### premiers_pas.premier_devis_accepte

Objet : Après le devis accepté : la facture

```text
Bonjour,

La suite d’un devis accepté, c’est la facture : ouvrez le devis et cliquez « Créer la facture ». Les lignes sont reprises, la numérotation suit.

Une question en route ? Répondez simplement à cet e-mail.

Pour ne plus recevoir ces e-mails de suivi, répondez « stop » à ce message.

Presti
```

### premiers_pas.premiere_facture

Objet : Votre première facture : la suite

```text
Bonjour,

Votre première facture est émise. Vous suivez son paiement dans Factures, avec ce qui est réglé et ce qui reste à encaisser.

Une question en route ? Répondez simplement à cet e-mail.

Pour ne plus recevoir ces e-mails de suivi, répondez « stop » à ce message.

Presti
```

### bilan_j14.comptes

Objet : Vos premières semaines sur Presti

```text
Bonjour,

Voici ce qui s’est passé sur votre compte depuis votre inscription :

Demandes reçues : {demandes_recues}
Devis envoyés : {devis_envoyes}
Devis acceptés : {devis_acceptes}
Factures émises : {factures_emises}

Une idée, une question, quelque chose qui vous manque ? Répondez simplement à cet e-mail.

Pour ne plus recevoir ces e-mails de suivi, répondez « stop » à ce message.

Presti
```

### bilan_j30.comptes

Objet : Votre premier mois sur Presti

```text
Bonjour,

Voici ce qui s’est passé sur votre compte depuis votre inscription :

Demandes reçues : {demandes_recues}
Devis envoyés : {devis_envoyes}
Devis acceptés : {devis_acceptes}
Factures émises : {factures_emises}

Une idée, une question, quelque chose qui vous manque ? Répondez simplement à cet e-mail.

Pour ne plus recevoir ces e-mails de suivi, répondez « stop » à ce message.

Presti
```

## Sortie

`{ mode: 'brouillon', mention_ia: 'non_vise', jour, bilan: { par_etape: { <étape>: { brouillons, reportes, silencieux } }, ecartes: { <motif>: n },
reportes: [<clé>] }, brouillons: [...] }`. Motifs d'écart : `demo`, `fondateur`, `suppression_demandee`, `hors_offre`, `opposition_suivi`,
`inscription_illisible`, `deja_au_registre`, `ecart_5_jours`, `un_par_passage`. Aucun nœud d'envoi : l'envoi (Resend par n8n, question 4
du plan) viendra par un lot suivant, après la validation des textes, l'adresse et le nom lus au seul moment d'envoyer (plan l.144-145).

## Réglages du workflow

`executionOrder: v1`, `timezone: Europe/Paris`, `saveDataSuccessExecution: none` (F1 : rien des passages réussis ne reste dans la base
de n8n), `availableInMCP: true` (F2 : gardé, c'est par le MCP que Claude Code construit, exporte et essaie le workflow ; le couper est
une décision de la session principale). Aucun `errorWorkflow` : aucun workflow d'erreur commun n'existe (`search_workflows` « erreur » et
« error » : aucun, le 02/11) — rang 26, « Avant l'activation ».

## Ce que le juge garantit — et ses limites

`scripts/suivi-artisan-qa.mjs`, hors ligne : structure (types permis, gabarit exact de chaque nœud HTTP, `select=` égal au tableau,
filtres aux noms et valeurs, réglages en liste blanche, aucun secret), colonnes présentes à la ligne citée, empreintes SHA-256 du code
(toute différence : « nouvel audit requis »), textes du brief égaux à ceux du nœud et sans mot interdit, rejeu du code dans un processus
enfant `--permission`, cas et propriétés (aucun message sans événement réel, un seul message par étape et par artisan, jamais un compte
de démo), essai n8n rejoué, mutants. Limites : le rejeu n'est pas n8n (l'exécuteur `runners` d'Oracle a le réseau sortant : brief des
détecteurs, l.150-160) ; Node 24 ne borne pas le réseau du processus enfant ; les empreintes ont été posées par l'auteur et doivent être
reconfirmées par l'audit distinct.
