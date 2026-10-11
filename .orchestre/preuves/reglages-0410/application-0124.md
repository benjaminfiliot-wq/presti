# Application de la migration 0124 (automatisme sous gardes) — lot « tout est automatique » (audit C §5.3, R3)

Décision de Benj du 04/10 (~12 h, `.orchestre/decisions-chef-0410.md` D-0410-1) : les contrôles automatiques remplacent l'accord individuel
sur chaque envoi. Projet Supabase `gorcdvmueakcncsmrouo`. Connecteur Supabase disponible.

## Ce qui s'est passé, dans l'ordre (rien d'embelli)

1. **Application** : la migration `0124_automatisme_sous_gardes` figure dans `list_migrations` à la version `20261004124830`
   (12:48:30 UTC, soit 14:48 à Paris). Elle a été appliquée avant que je reprenne ce lot ; d'après les fichiers laissés dans ce dossier
   (contrôle `supabase/controles/0124_*.sql` de 14:50, gabarit d'essai de 14:53, essai « état réel » de 18:00) c'est un passage PRÉCÉDENT du même lot, qui n'a laissé
   dans le dépôt ni preuve ni commit (je ne peux pas l'établir autrement : l'historique du connecteur ne nomme pas l'auteur).
   Je n'ai donc PAS appliqué 0124 une seconde fois ; je n'ai pas non plus pu revoir le résultat de l'essai à sec qui a précédé l'application
   (le gabarit `essai-0124.tpl.sql` est là, mais son critère B1 — « avant 0124, l'approbation sans accord est refusée » — ne peut plus
   être rejoué sur une base qui a déjà 0124).
2. **Ce que j'ai refait ce soir, sur la base de production, pour que la preuve existe** : lecture intégrale du fichier ; empreintes ;
   contrôle en lecture seule ; essai « état réel » (28 vérifications) dans UN SEUL bloc `DO … raise exception 'ESSAI_A_SEC'` qui annule tout ;
   recherche de traces ; essais sous les quatre attaques ci-dessous.

## Lecture intégrale du fichier (33 505 octets) : ce qu'il change et ce qu'il garde

Le fichier ne contient que deux `create or replace function` (+ `revoke`/`grant`/`comment`) : `ops.garde_envois()` et `public.acq_envoi_reserver(uuid,text)`.
Aucun `alter`, `drop`, `insert`, `update` sur des données, aucun interrupteur, plafond, compte, budget, jeton ni texte d'envoi touché.
`acq_envoi_approuver` (empreinte `288daa09…`) et 0121 (plafond avant coup, coût nul) ne sont pas touchés.

| Garde | Où dans 0124 | Conservée ? |
|---|---|---|
| Opposition / STOP | `garde_envois` : `v_oppose` sur toutes les clés (siren, domaine, page_meta, instagram, e-mail, meta_id, facebook, linkedin, téléphone), `ops:opposition` ; seules exceptions `confirmation_stop` (une, 24 h) et `reponse_rgpd` (35 j, 3 au plus) ; `acq_envoi_reserver` RELIT l'opposition avant de prendre une place, et se ferme (`opposition_indisponible`) si la lecture échoue ; déclencheur `annuler_sur_opposition` actif | OUI |
| Réservation atomique | `acq_envoi_reserver` : `for update`, clé de 64 hex, un seul `update … where statut='approuve'`, `unique_violation` → `deja_reserve` | OUI |
| Plafonds | `garde_envois` §5 (jour de Paris, ligne `*` du canal puis ligne de l'envoyeur, nouveaux contacts) ; `acq_envoi_reserver` les relit sur ce qui est RÉSERVÉ aujourd'hui ; **ajout** : une ligne `*` supprimée après approbation ferme le canal (`quota_absent`) | OUI (+ renforcé) |
| Pause générale | `garde_envois` : entrée en file, approbation, consignation ; `acq_envoi_reserver` : `pause` (une lecture en erreur vaut pause) | OUI |
| Trois verdicts du Facteur | `v_verdicts_ok` (j1/j2/j3, agent `facteur`) exigé à l'approbation et signalé à la consignation | OUI |
| Notice, coût nul | hors de ces deux fonctions (0121 et le code) : non touchés par 0124 | non concernés |
| `envoi_froid` fermé | `garde_envois` : un `premier_contact` hors `essai_e2e` est refusé tant que l'interrupteur est faux ; état réel `envoi_froid=false` | OUI |
| Gel des octets jugés, 90 jours, 72 h, 3 messages, preuve de demande (e-mail sollicité) | inchangés | OUI |
| **Retiré** | l'étape « accord individuel » : plus de ligne `ops.accords_benj` exigée, créée ni consommée ; les accords historiques non consommés d'une ancienne attente sont archivés annulés | voulu |
| **Ajouté** | `approuve` n'est atteignable que depuis `prepare` ou l'ancienne attente (`ops:transition_approbation`) : pas d'insertion directe en `approuve`, pas de retour depuis annule/périmé/sauté | renforcé |

## Empreintes (md5 du corps entre `$$ … $$`, fins de ligne LF) : fichier = base

| Fonction | md5 fichier | md5 base | longueur |
|---|---|---|---|
| `ops.garde_envois()` | `1d97bad6c2b8d529182a705caf96861c` | `1d97bad6c2b8d529182a705caf96861c` | 24 468 |
| `public.acq_envoi_reserver(uuid,text)` | `faed5cf5b5be74fd6818d22e19d5225d` | `faed5cf5b5be74fd6818d22e19d5225d` | 6 137 |
| `public.acq_envoi_approuver(uuid,jsonb)` (non touchée) | — | `288daa09c4e73c7ffb133f53921ab2ff` | — |

(Le fichier du dépôt est en CRLF ; les empreintes sont calculées après passage en LF, comme le fait le contrôle. `sha256` du fichier tel quel :
`18dcbf8931e88375c2b481f28a32cafcc65710285cbc3f3d5df717694b35550c`.)

## Contrôle après application : `supabase/controles/0124_automatisme_sous_gardes.sql`

Lecture seule, rejoué ce soir : **11 colonnes sur 11 `true`** (deux empreintes, approbation inchangée, plus d'`accord_absent`, gardes conservées,
réservation qui relit pause/opposition/plafond/quota_absent, `garde_envois` fermée à tous, `acq_envoi_reserver` pour `service_role` seul,
`envoi_froid` fermé, `pause_generale` présente, déclencheur STOP actif).

## Essai « état réel », annulé (`essai-0124-etat-reel.sql`) : 28 vérifications, 0 en défaut

Un seul énoncé `DO` qui crée ses fixtures (conversation et envois d'essai, canal `messagerie`), joue les cas, puis lève
`ESSAI_A_SEC {…}` : l'exception rend le bilan ET annule tout. Bilan : `n_ok 28, n_ko 0`, empreintes identiques à celles ci-dessus.

Les **quatre attaques** (chacune doit être refusée, sans clé prise, sans quota consommé, sans accord créé) :

1. **Contourner le Facteur ou les verdicts** — T9a verdicts incomplets (j3 absent) refusés ; T9b approuver au nom d'un autre agent refusé ; T10 insertion directe en `approuve`
   refusée ; T11 un envoi annulé ne redevient pas approuvé ; T13 un envoi approuvé est figé (changer l'empreinte du texte : `ops:envoi_fige`).
2. **Pause générale posée en cours de route** — T4a réserver refusé (`pause`, aucune clé) ; T4b approuver refusé ; T4c entrer en file refusé ; T4d consigner un envoi réservé refusé (il reste `en_cours_envoi`).
3. **STOP après l'approbation** — T5a l'envoi approuvé est annulé par le déclencheur et la réservation refuse ; T5b un nouvel envoi vers l'opposant est refusé ;
   T5c **déclencheur coupé**, la réservation relit seule l'opposition et refuse (l'envoi reste `approuve`, aucune clé) ; T5d la confirmation de STOP (exception) s'approuve et se réserve.
4. **Plafond, quota, froid** — T6a plafond du jour atteint : réservation refusée (`plafond`) ; T6b entrer en file refusé (`ops:quota`) ; T7a ligne de quota supprimée après approbation :
   réservation refusée (`quota_absent`) ; T7b canal sans quota : entrée refusée ; T8 premier contact refusé tant qu'`envoi_froid` est fermé.

Le chemin heureux aussi (T1 `prepare → approuve` sans accord ; T2 réservation ; T2b seconde réservation `deja_reserve` ; T3 consignation sans ligne d'accord ; T12a l'ancienne
attente est rejugée sans accord ; T12b une attente abandonnée archive son accord non consommé ; T14 un refus net du transport relâche la réservation ; T16 même clé sur une
autre ligne : une seule réservation gagne ; T17 envoi inconnu / clé mal formée) et P6 (droits : `garde_envois` à personne, `acq_envoi_reserver` à `service_role` seul).

## Rien ne reste (vérifié après l'essai)

`ops.envois` : 0 ligne (dont 0 d'essai) ; `ops.conversations` d'essai : 0 ; `ops.opposition` d'essai : 0 ; `ops.accords_benj` : 0 ; table `essai_res` : absente.
Interrupteurs : `envoi_froid=false`, `pause_generale=false` (inchangés). Quotas inchangés : `email_sollicite/*=50/0`, `essai_e2e/*=4/4`, `facebook`, `formulaire_site`,
`instagram`, `linkedin` = 0/0 (fermés), `messagerie/*=100/0`, `reponse_privee/*=50/0`.

## Ce que cette preuve ne dit pas

- Aucun envoi réel n'a été fait ; `envoi_froid` n'est pas ouvert ; aucune clé ni variable de coût n'est posée ; les canaux `facebook`, `instagram`, `linkedin`, `formulaire_site`
  ont toujours un plafond de 0 : la base refuse tout envoi par ces canaux, accord individuel ou non.
- Le passage précédent a appliqué 0124 sans laisser sa preuve d'avant (essai à sec sur le jumeau, contre-vérification) : voir le point 1 plus haut.
