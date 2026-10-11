# Schéma du domaine contenu (fiche 026-206, C03)

Migration `supabase/migrations/0114_contenu.sql` (0113 est promis à N2). Source : `Ecosysteme-Marketing-Reel-2026-09-25.md`, §3.7
(ligne C03) et §4 bis. Ce schéma range les lignes éditoriales, les publications, les mesures et les idées ; il ne publie rien.
Un brouillon ou une démonstration ne vaut pas publication. **Plus d'accord individuel** (décision du 30/09, confirmée par Benj
le 04/10) : chaque publication passe les contrôles automatiques de sa ligne (juges, pause générale, plafonds, doublons, chiffres
vérifiés, coût nul) sur son média et son texte exacts.

## Les six tables

| Table | Rôle | Ce que la base refuse |
|---|---|---|
| `contenu_lignes` | Les cinq lignes L1 à L5, leurs canaux, leur campagne UTM. Aucune n'est approuvée à la création. | Une campagne hors liste fermée (`ligne-l1` à `ligne-l5`, une par ligne) ; un canal inconnu. |
| `contenu_comptes` | Un compte par réseau : `code_apport` (`^[a-z0-9]{6,24}$`) et `lien_bio` (`https://prestiapp.fr/a/<code>`), un seul lien de bio par compte. | Un code mal formé, deux comptes sur le même code. |
| `contenu_posts` | Une publication : texte exact, légende, sous-titres incrustés, texte de miniature, description, rendu (type et empreinte du film), affirmations chiffrées et leurs sources, statut, accord, preuve publique. | Un statut hors liste ; `publiable` ou `publie` sans accord valable ; un post TikTok qui n'est pas une vidéo ; deux fois le même contenu exact sur un réseau. |
| `contenu_mesures` | Une ligne par publication, échéance (H+1, H+24, J+7) et métrique, avec sa provenance. | Un zéro pour « non mesuré » ; une vente affichée comme certaine ; une source incohérente avec la métrique ; une mesure avant son échéance. |
| `contenu_suspensions` | Les suspensions par ligne et par agent, en ajout seul. | Effacer une suspension ; la lever sans décision du bus. |
| `contenu_idees` | La banque d'idées, notée par du code, avec sa provenance. | Une idée sans provenance ; une idée nominative de veille qui dure plus de 30 jours. |

## Les cinq lignes, la campagne, le code d'apport

Les libellés et les canaux viennent de `docs/marketing/lignes/README.md` : L1 « Ton site en 20 secondes » (TikTok, Instagram,
Facebook), L2 « La question du métier » (mêmes canaux), L3 « Ce que fait vraiment le logiciel » (mêmes canaux), L4 « Une boîte
tenue par des agents » (TikTok), L5 « Un fait Presti » (Instagram, Facebook, LinkedIn). Chaque ligne a sa campagne UTM, en liste
fermée, mais **aucun code d'apport par ligne** : TikTok et Instagram n'ont qu'un lien, en bio. Le code d'apport est par réseau
(`tiktok`, `instagram`, `facebook`, `linkedin`), et la ligne d'une visite venue de TikTok ou d'Instagram n'est jamais certaine.

À faire hors de cette fiche, avant toute diffusion : ajouter `ligne-l1` à `ligne-l5` à `CAMPAGNES` dans `lib/audience.ts`
(fiche 026-213), et créer l'apporteur de canal `tiktok` (étape 9 de R25). Ce schéma ne les crée pas.

## Le chemin d'une publication

`brouillon` → `en_attente` → `publiable` → `publie`, avec `refuse` possible avant la publication. Tout autre passage est refusé
(`contenu:transition`), y compris une insertion directe en `publiable` ou un passage de `brouillon` à `publiable`.

**Ce qui ouvre `publiable`** : une décision du bus, réellement `tranchee`, choix `accorder`, portée `securite`, prise par un
fondateur, avant son échéance, il y a moins de 7 jours, et dont la clé (`cle_idempotence`) est exactement
`contenu:post:<id>:<empreinte>`. L'empreinte est un sha256 du réseau, du texte, de la légende, des sous-titres incrustés, du texte
de miniature, de la description et de l'empreinte du film. Conséquences :

- un défaut appliqué à l'échéance (`defaut_applique`), un refus, une autre portée, une autre cible ou une décision trop ancienne
  n'ouvrent rien ;
- retoucher un seul mot (ou le film) change l'empreinte : la publication retourne en `en_attente`, l'accord est effacé, une
  décision neuve est nécessaire ;
- une ligne approuvée n'ouvre **jamais** une publication : la ligne doit être approuvée ET la publication accordée à part ;
- la garde est dans des déclencheurs, pas seulement dans les fonctions : une écriture directe par `service_role` ne la contourne pas ;
- un score de Laya n'autorise rien. La base ne conserve que la trace du verdict de chaque affirmation chiffrée.

**Les autres obstacles**, chacun avec son code : la ligne n'est pas approuvée (`ligne_fermee`), le canal n'est pas celui de la ligne
(`canal`), une suspension est active pour la ligne et l'agent (`suspendue`), une affirmation n'est pas prouvée (`affirmation`),
un chiffre visible n'a ni affirmation sourcée ni attestation `chiffres_neutres` (`chiffre`).

**Les affirmations chiffrées** sont un tableau `{texte, source_ref, verdict, probabilite, le}`. Elles passent seulement avec le
verdict `pass`, une source et une probabilité d'au moins 0,5 (`jev noul --provider laya`). Un verdict `refus`, une panne locale de
Laya (`indisponible`), une probabilité de 0,4 ou une source absente bloquent. Le texte, la source, le verdict et la date restent
sur la ligne pour que le juge puisse refaire la décision sur des fixtures.

**Publier** : `publiable` → `publie` exige une preuve publique (une adresse `https`, relevée sans cookies) et un accord qui vise
encore exactement ce texte et ce rendu. Une publication publiée est figée et sa preuve ne s'efface pas. Le lanceur relit
`contenu_post_peut_publier(<id>)` juste avant « Publier » : l'accord peut avoir expiré, une suspension peut être tombée. Une reprise
après erreur vérifie d'abord l'état externe (colonne `id_externe`, unique par réseau) avant de réessayer ; l'absence de preuve laisse
la publication en attente.

## Suspendre, reprendre

`contenu_suspendre(ligne, agent, motif, par)` suspend une ligne pour un agent, ou pour `*` (tous). C'est le sens sûr : sans accord,
rejouable, sans effet sur les publications déjà en ligne ni sur leurs preuves. `contenu_reprendre(suspension, décision)` est le sens
risqué : il exige une décision `tranchee`/`accorder`/`securite` sur `contenu:reprise:<id de la suspension>`. La table est en
ajout seul.

## Les mesures

Trois échéances après la publication : **H+1, H+24, J+7**. Une ligne par métrique : `vues`, `lectures_completes`, `temps_moyen_s`,
`enregistrements`, `partages`, `commentaires`, `j_aime`, `visites`, `demandes_maquette`, `ventes`.

| État | Sens | Valeur |
|---|---|---|
| `en_attente` | pas encore relevé | jamais de valeur |
| `non_mesure` | le réseau ne l'a pas donné (API fermée, panne) | jamais de valeur : ni zéro ni succès |
| `mesure` | relevé | obligatoire, positive ou nulle |

**Provenance** (colonne `source`, liste fermée) : `api_officielle` ou `releve_main` pour les chiffres du réseau (jamais une lecture
scriptée de TikTok Studio ni du Creative Center, CGU EEA §4.5) ; `audience_maison` pour les visites par source et campagne ;
`base_presti` pour les demandes de maquette et les ventes. Une valeur mesurée ne se réécrit plus ; une mesure « mesurée » ne précède
pas son échéance ; une publication non publiée n'a pas de mesure.

**Attribution** : les demandes de maquette et les ventes sont rattachées à une ligne par la **fenêtre de temps** qui suit chaque
publication sur le même réseau. C'est une **estimation** : la colonne `certitude` vaut `estimation`, la fenêtre (`fenetre_attribution_h`,
de 1 à 168 heures) est obligatoire, et la base refuse `mesure` pour ces deux métriques. Les visites par campagne et le code d'apport
ne prouvent pas seuls une vente causée par un post. Le choix de la fenêtre appartient au Mesureur (fiche 026-213) ; il n'est pas
décidé ici.

**Conservation** : les agrégats (mesures, notes) se gardent sans limite de durée, parce qu'ils ne contiennent aucune donnée
nominative ; aucune colonne de texte libre n'y est prévue (la référence de source est bornée à `^[a-z0-9_.:/-]{2,80}$`). Une idée
de veille qui contient une donnée nominative doit porter `nominative = true` et une `expire_le` à 30 jours au plus après sa création ;
`contenu_veille_purger()` retire les idées échues et rend leur nombre. Aucune fonction ne le planifie : la tâche de veille l'appelle.

## Droits

RLS activée sur les six tables, aucune politique d'écriture. `anon` n'a aucun droit. `authenticated` lit seulement, et seulement
s'il est fondateur (`public.is_founder()`). Les écritures passent par `service_role` (les agents de `lib/contenu`) sous les
déclencheurs. Les fonctions sont réservées à `service_role` ; le journal et les déclencheurs n'ont aucun exécuteur. Aucune clé,
aucun jeton, aucune personne réelle dans la migration ni dans les preuves ; les essais emploient des personnes fictives et
`@presti-test.invalid`.

## Contrôle et mise en service

- Le juge : `node scripts/contenu-qa.mjs --partie=sql` (026-204), sur le texte de la migration.
- Le comportement : `.orchestre/preuves/026-206/generer-essai.mjs` fabrique `essai.sql`, un énoncé qui exécute la migration
  puis éprouve 105 cas (favorables et défavorables, décisions du bus réelles) et annule tout. Résultat : `essai-a-sec.txt`.
- L'application sur la base a lieu en séance Claude Code (`apply_migration`), suivie du contrôle des fonctions par md5, de la
  vérification des droits et de l'absence de trace d'essai : voir `application-*.md` dans le dossier de preuves.
- La lecture de ces tables par les écrans (Tour du Crieur, Audience, Recettes) et la fabrique de publications sont d'autres
  fiches (026-207 à 026-218). Ce schéma ne crée ni route ni carte.
