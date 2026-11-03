# Fiche connecteur — l'agenda de l'artisan, Google Agenda et Outlook (tâche 036-008)

> Écrite le 03/11/2026 sur l'hôte d'agents d'Oracle, par Claude Code. Format : p6 § 0.4 (« Les vrais outils : les connecteurs »,
> `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md:235-262`). Les workflows qui s'en servent,
> `lib-agenda-creneaux` et `presti-dep-operations`, sont prouvés hors ligne par `scripts/operations-n8n-qa.mjs` ; **le nœud réel décrit plus bas n'est ni posé, ni
> essayé, ni connecté** : il est préparé pour Benj, comme le veut `.claude/rules/securite.md` (aucun agent ne crée de compte, ne saisit une clé ni un code OAuth, ne
> demande un accès à un tiers). Le réseau sortant est fermé à cet hôte : **rien de ce qui dépend de Google ou de Microsoft (noms de portées, quotas, délais,
> classement « sensible » ou « restreint », évaluation de sécurité) n'a été relu ici**. Tout est « à vérifier à la date du jour » sur les pages officielles, citées en bas.

## Le principe qui commande tout (décision 5 du plan, `premiere-reponse.md` § 5)

- **Un créneau vient de l'agenda lu, ou il n'existe pas.** `lib-agenda-creneaux` ne propose que des créneaux libres dans une lecture récente (60 minutes par défaut),
  de cet artisan, qui couvre la période demandée ; une lecture impossible, ancienne, datée du futur ou d'un autre compte donne **aucun créneau**, et la carte « Aucun créneau à proposer » le dit.
- **Le rendez-vous se pose après un clic de l'artisan**, en Studio comme en Signature, pilote actif ou non. Le type « rendez-vous posé » n'entre pas dans `OUTIL_TYPE`
  (`lib/pilote/regles.ts:53-63`) ; il pourra y entrer après les tests de 036-008 et l'accord écrit de Benj. Le juge lit ce fichier à chaque passage (règle S10).
- **Le rappel de la veille reste une carte** (jamais envoyée seule), aux heures de `lib/sms/plage.ts:7-8` (lundi-samedi, 8 h-20 h, Paris, hors fériés).

## Fiche (les neuf champs de p6 § 0.4)

| Champ | Google Agenda (Calendar API) | Outlook (Microsoft Graph) |
|---|---|---|
| **Portées demandées** | Le minimum pour **lire** : la portée de disponibilité seule (`https://www.googleapis.com/auth/calendar.freebusy` ou, si elle existe, sa variante limitée aux événements — à vérifier sur la page des portées de Google). Elle rend des plages occupées, **sans titre, sans invité, sans lieu**. Pour **poser** après le clic : une portée d'écriture sur les événements, demandée **à part** et seulement quand l'artisan active la pose (`calendar.events`, à vérifier). Jamais la portée de gestion complète du compte, jamais celle des agendas partagés. | Le minimum pour lire les plages occupées : lecture des horaires d'agenda (`Calendars.ReadBasic` ou la lecture de disponibilité `getSchedule`, à vérifier sur la page des permissions de Graph). Pour poser : écriture d'événements (`Calendars.ReadWrite`, à vérifier), demandée à part. Pas d'accès aux courriers ni aux contacts. |
| **Ce qu'on lit** | Les **plages occupées** de l'agenda principal de l'artisan sur les 14 prochains jours au plus (la fenêtre maximale du juge, G12) : début et fin, rien d'autre. Le contrat d'entrée de `lib-agenda-creneaux` **refuse** tout champ hors de `{ artisan_id, debut, fin }` (`additionalProperties: false`) et toute adresse e-mail ou téléphone (`sans_contact`). | Les mêmes plages occupées (début et fin), sur la même fenêtre, sans objet ni participants. |
| **Ce qu'on écrit** | **Rien tant que l'artisan n'a pas cliqué.** Côté plateforme : la carte « Proposer ces créneaux au client » (`preparer_carte`, `a_valider`) ; après le clic, **un** événement sur le créneau cliqué et seulement lui (`poser_rendez_vous`, via `clic_artisan`), prévu dans `effets_prevus`, jamais fait dans ce lot. Aucune modification ni suppression d'un événement existant. | Idem : un événement créé sur le créneau cliqué. |
| **Où vit l'autorisation** | **Supabase, chiffrée**, table `connexions` (`supabase/migrations/0193_systeme_agents.sql:99-128`) : `secret_n8n` au format `v1.<iv>.<tag>.<données>` (AES-256-GCM, `lib/secretBox.ts:21-30`), chiffré avec la clé propre à n8n, déchiffré **en mémoire, à l'exécution** (décision 1 du plan, `premiere-reponse.md:359-371`). Jamais dans un identifiant n8n, jamais dans un fichier versionné, jamais dans un journal. | Idem. |
| **Retrait par le client** | Le bouton « Retirer » de « Connexions » (lot 036-009) : l'état passe à `retiree`, les secrets sont effacés par la base elle-même (`connexions_retiree_sans_secret`, `0193_systeme_agents.sql:126`). L'artisan peut aussi révoquer l'accès depuis son compte Google. Dès lors, la lecture est impossible : **aucun créneau** et la carte le dit. | Idem, et la révocation depuis le compte Microsoft. |
| **Expiration, refus** | Jeton révoqué ou expiré : la lecture est marquée `lue: false` (ou `lu_le: null`) ; `lib-agenda-creneaux` rend **aucun créneau** et une carte « Votre agenda n'a pas pu être lu… Reconnectez-le dans Connexions » (`agenda_illisible`) ; **une** alerte au titulaire (`lib-alerter`), pas de nouvelle lecture tant qu'il n'a pas reconnecté. Rien ne plante (statut `ok`). Lecture trop ancienne (> `age_max_agenda_min`) : `agenda_trop_ancien`. | Idem. |
| **Quotas de l'API** | Quota par projet et par utilisateur affiché dans la console Google Cloud (valeur à relever ce jour-là, pas ici). Notre usage prévu est très bas : **une lecture par demande de rendez-vous**, plus **une relecture juste avant la pose**. | Limites de Graph par application et par boîte (à relever). Même usage. |
| **Coût** | 0 € côté Presti : n8n existe déjà. Le nœud Google Calendar natif (`calendar.availability`, relevé `search_nodes` du 03/11) ou un nœud HTTP Request avec le jeton déchiffré (décision 1) ; aucun service payant. | 0 € : nœud Microsoft Outlook natif (`event.getAll`, `event.create`) ou HTTP Request. |
| **Le test qui le prouve** | `node scripts/operations-n8n-qa.mjs` (hors ligne, 56 mutants) : 200 agendas tirés au hasard confrontés à un calcul refait à part (grille, horaires, marge, chevauchement, deux par jour, trois en tout) ; un créneau absent de l'agenda ne se propose jamais ; l'agenda d'un autre compte (ou l'un de ses blocs) fait refuser la recherche ; un rendez-vous ne se pose jamais sans clic (4 offres × pilote actif ou non) ; le créneau cliqué doit avoir été proposé et être encore libre dans l'agenda **relu**. Et, **au premier branchement réel** : un essai de lecture réussi avant tout état `active` (`connexions_active_verifiee`, `0193_systeme_agents.sql:127`). | idem |

## Vérification Google : ce qui est à confirmer (rien n'est affirmé ici)

Le plan (`premiere-reponse.md` § 3.2) note que les portées d'agenda sont **« sensibles »** et que la vérification Google se ferait **sans évaluation de sécurité** (CASA), contrairement à
Gmail dont les portées sont « restreintes » (décision 2). Cette fiche **ne le confirme pas** : à vérifier sur la console Google Cloud (écran de consentement, « Centre de vérification »)
et sur la page d'aide citée en bas, **le jour** où Benj prépare la demande. Points à relever ce jour-là : (1) le classement exact de la portée de disponibilité retenue ; (2) si une évaluation
de sécurité est exigée pour elle ; (3) le délai de vérification annoncé ; (4) tant que l'application n'est pas vérifiée : le plafond de 100 utilisateurs en test et l'écran « application non vérifiée ».
**Chemin sans application OAuth** (si la vérification traîne) : l'artisan colle l'adresse secrète de son agenda au format iCal ou exporte ses plages ; `lib-agenda-creneaux` lit la même forme (`agenda.occupe`), sans aucun changement de contrat.

## Pourquoi le nœud réel n'est pas dans les exports

La garde `scripts/n8n-specs-qa.mjs` ne permet que les types de nœuds de sa liste blanche (`TYPES_PERMIS`) : `n8n-nodes-base.googleCalendar` et `n8n-nodes-base.microsoftOutlook` n'y sont pas, et le juge
`scripts/operations-n8n-qa.mjs` les refuse aussi (règle S3, avec un mutant qui ajoute le nœud Google Agenda). Poser le nœud réel exige donc : (1) l'accès OAuth (compte de Benj, hors de portée d'un agent) ou, pour les
artisans, un nœud HTTP Request avec le jeton déchiffré ; (2) un **amendement de la garde** — un nœud d'agenda déclaré, **désactivé**, derrière la sortie « faux » de la porte « simulation », `pied: aucun` — dans une
tâche dont le périmètre contient `scripts/n8n-specs-qa.mjs` (hors périmètre de 036-008).

## Les gestes préparés pour Benj (aucun n'est fait)

1. **Créer l'application OAuth** (lot 036-009) avec la seule portée de disponibilité, écran de consentement au nom de Presti (c'est l'écran de **connexion**, pas un écran de l'artisan) ; relire les points ci-dessus. Geste réservé : compte, jamais un agent.
2. **Les migrations**, dans l'ordre (`migration-production.md`) : `0185`, `0192`, `0193`, **puis** les drapeaux `systemeAgents` et `connexions`. À écrire avant le premier passage réel, par une tâche dont le périmètre est `supabase/**` :
   (a) la vue étroite du travail dû de `presti-dep-operations` (rendez-vous à poser, rendez-vous de demain avec canal, consentement et opposition, articles d'inventaire sous leur seuil avec fournisseur et prix, commandes ouvertes — une ligne = une
   ligne, `artisan_id` partout, jamais de texte libre) ; (b) la colonne `source` des imports de « Mes chiffres » (C3 : « lu dans <outil> le <date> » ou « déclaré ») ; (c) les tables d'écriture des effets prévus (carte, rendez-vous, ligne importée) avec clé unique `(artisan_id, cle)`.
3. **Le nœud réel**, relu et essayé par Benj sur **son** agenda de test, en simulation, avant tout `simulation: false`.
4. **Les paliers** : simulation → mode ombre sur un compte volontaire → Studio réel → Signature réel (`premiere-reponse.md:369-372`). Publier les enfants **avant** le parent : `lib-agenda-creneaux`, `lib-synchroniser-outil`, puis `presti-dep-operations`. Jamais `presti-banc-operations`.
5. **Le Cerveau** : ajouter les routes `veille_de_rendez_vous`, `stock_sous_le_seuil`, `pose_rendez_vous` (clic) et `import_demande` (`rendez_vous_a_poser` est déjà connue) ; il n'envoie pas encore les blocs de lecture, donc le chef répond `lecture_absente` ou « aucun créneau » (dit, non inventé : contrôles X3 et X4 du juge).

## Les contrôles que le nœud réel doit tenir (sinon il n'est pas posé)

- **Le compte** : chaque lecture porte l'`artisan_id` du compte ; « Supabase account » passe outre la RLS, donc le filtre sur le compte est dans chaque requête, et l'agenda lu est celui de **ce** compte (juge G8, D5).
- **Le secret** : déchiffré en mémoire, jamais écrit, jamais dans un journal, un message d'erreur ou une sortie de nœud ; les erreurs du serveur sont réduites à `identifiants_refuses`, `serveur_refuse`, `injoignable`, `jeton_expire`.
- **La minimisation** : la lecture ne demande que début et fin ; si l'API rend un titre, un lieu ou des invités, le nœud les **jette avant** `lib-agenda-creneaux` (le contrat les refuserait).
- **L'heure** : tout est calculé à l'heure de Paris (heure d'été et d'hiver), jamais « UTC+1 » en dur (`lib/sms/plage.ts:1-6`).

## Sources (à relire le jour du geste)

- Console Google Cloud, écran de consentement OAuth et centre de vérification ; page d'aide Google « Vérification de l'application OAuth » ; page des portées de l'API Google Calendar.
- Documentation Microsoft Graph : permissions de l'API Calendrier ; `calendar/getSchedule`.
- Pour mémoire, `premiere-reponse.md` § 5 cite en bas [support.google.com/cloud/answer/13465431](https://support.google.com/cloud/answer/13465431?hl=fr) (vérification OAuth) : non relue ici.
