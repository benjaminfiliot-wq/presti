## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« assistant de gestion, relances groupées de devis, cartes de validation, lot de relances ») : il rend
  « Studio prépare, l'artisan valide ; rien ne part sans un clic » (`regles-presti/autonomie-abonnements.md`) et le pilote Signature à
  10 minutes (`memoire-presti/pilote-auto-aide-2110.md`). Effet sur le travail : une carte de lot n'entre **jamais** dans la file du pilote.
  Sinon, elle partirait seule au bout de 10 minutes, sans clic (garde de `actions-serveur.ts:1675`, mutant A7q).
- **MCP `cerveau`, `chercher`** (« relances groupées carte de lot proposition écartée ne revient pas ») :
  - la fiche vidéo « une proposition écartée ne revient pas » (`p5-entreprise/fiches-videos.md` §2.10) ;
  - le geste « Relancer un devis sans réponse » du vault (`10 Presti/01 Produit/…`) : trois chemins de relance existent, et chacun doit
    voir les autres.

  Effet : chaque relance partie d'un lot s'inscrit **devis par devis** au journal des actions. Le registre commun
  (`lib/relancesRegistre.ts`) et l'anti-doublon la voient donc (A7d, A7e).
- **Le plan du chantier 4** (`plans/011-cadrage-01-11/chantier-4-assistant-plan.md`) :
  - §0 bis rangs 4 et 8 ;
  - question 1 et son défaut : « plusieurs clients : une carte de lot, avec ses exclus. Un objet seul garde le fait tout seul » ;
  - §14, ligne L16.

  Ce défaut est appliqué tel quel : le témoin A7m garde le « fait tout seul » pour un objet seul. Le délai de 7 jours du rang 8 et la
  règle « même outil, même objet, statut refusé » sont repris du détecteur n8n (`scripts/detecteurs-n8n-qa.mjs:701-707`).
- **Le prompt de Benj** (`prompts-benj/p3-assistant.md:160`, « Relance les devis envoyés il y a plus de 5 jours ») : c'est la phrase des
  essais. Le « 5 » est un nombre **à sourcer** : un lot à 7 jours, deviné, est refusé par la boucle (L16k, L16l).
- **Les audits de l'assistant** (`.orchestre/preuves/032-007/`, `032-015/`, `032-018/`). J'en ai tiré deux choses :
  - l'escalade se relit avant d'agir, et une lecture en erreur vaut refus. Au clic, chaque devis du lot est donc relu (A7n, A7o, mutant
    A7v) ;
  - leurs essais devaient rester verts. Le mutant A6h (032-007) a d'abord rougi : mon code recopiait le motif qu'il mute. Le code a été
    rendu distinct, sans toucher au juge.
- **Le registre commun** (`lib/relancesRegistre.ts`) : il ne voit une relance de l'assistant que par son `objet_id`. D'où les traces par
  devis, et l'arrêt du lot si une trace ne s'écrit pas (`actions-serveur.ts:494-505`).
- **Skill `presti-verify`** : le cycle build, déploiement, vérification en direct est interdit ici (pas de build, pas de push). Je le
  laisse à la session principale (points à valider), et je ne dis pas « déployé ».
- **Skill `ecc:security-review`** : j'en ai tiré trois contrôles.
  - L'isolation des comptes : chaque lecture neuve est filtrée sur `ctx.uid`, contrôle déjà fait par `assistant-qa`.
  - L'entrée du modèle : il ne peut écrire ni le `lot` (identifiants), ni `conversation_origine`. Ce sont des champs inconnus, refusés
    (L16i bis).
  - Le plafond d'envois : le lot passe par l'unique chemin d'e-mail plafonné (`envoyerRelance`, 30 par jour). Le contrôle « 4 appels à
    `peutEnvoyer` » d'`assistant-qa` reste vert.

## Ce qui a été fait (lot L16)

**1. Une carte de lot, ses retenus, ses exclus et leur motif.**
- `relancer_devis` prend trois formes, exactement une à la fois (`lib/assistant/outils-actions.ts:106`, cohérence `:664`) :
  - `numero`, pour un devis ;
  - `numeros`, pour un lot nommé (20 au plus, `:47`) ;
  - `envoye_depuis_jours`, pour un lot par ancienneté (nombre à sourcer).
- La consigne au modèle dit « UNE SEULE fois, jamais une fois par devis ».
- La carte se fabrique par `apercuLotRelances` (`lib/assistant/cartes.ts:227`), avec le champ `Apercu.lot` (`:37`). Elle porte :
  - une ligne « À relancer » par retenu ;
  - une ligne « Exclu » par devis écarté, avec son motif ;
  - le **texte exact de chaque relance** (`lot.retenus[].message`), la première affichée en entier ;
  - irréversible ; au plus 20 retenus.
- La préparation est `preparerLotDevis` (`actions-serveur.ts:425`). Les motifs d'exclusion sont dans `motifExclusion` (`:409`) :
  - pas en attente de réponse ;
  - pas d'e-mail ;
  - « ne plus relancer » ;
  - relance écartée récemment ;
  - déjà relancé (journal des actions, puis registre commun des quatre chemins, 3 jours) ;
  - sujet d'escalade (le motif du pilote ; une lecture en erreur exclut) ;
  - compte en pause (`leads_pause`, comme `lib/pilote/file.ts:105`).

**2. Le réalisateur n'est atteint qu'au clic.**
- La préparation pose `horsAuto` (`:463`) : même en « fait tout seul », le lot reste une carte.
- La carte est créée à part, sans passer par le pilote (`carteDeLot`, `:1624`, appelée à `:1675`). L'appel au pilote des autres cartes
  ne change pas (`:1686`).
- `realiserLotDevis` (`:472`) n'est joint que par `confirmerAction`, c'est-à-dire la route des clics. Au moment d'envoyer, il :
  - recontrôle chaque devis ;
  - envoie par `envoyerRelance` ;
  - inscrit une trace par devis (`:494`) ;
  - s'arrête si une trace ne s'écrit pas.

  La carte n'est réclamée qu'une fois : il n'y a pas de doublon (A7e).
- Deux gardes de plus, pour qu'un ordre groupé ne parte pas en rafale :
  - sous un ordre groupé (`ordreGroupe`, `cartes.ts:179`), une relance seule est refusée et le modèle est dirigé vers le lot (`:1054`) ;
  - une seconde relance d'un autre objet dans le même tour attend le clic (`horsAutoDuTour`, `:1614`). Cela vaut aussi pour les impayés
    d'un ordre groupé (A7w).

**3. Une carte refusée ne revient pas en boucle (rang 8).**
- `refusRecents` (`cartes.ts:196`) : une carte d'un objet, ou chaque retenu d'une carte de lot, écartée depuis 7 jours.
- Ce qu'en fait `devisEcartes` (`actions-serveur.ts:390`) :
  - dans un lot, le devis écarté est exclu avec « relance écartée par vous le … », sauf si l'artisan écrit son numéro ;
  - en relance seule (`:1066`), l'assistant ne la repropose pas de lui-même ; redemandée par l'artisan, c'est une carte, jamais d'office.
- Le motif revient au modèle dans le résultat de l'outil, donc dans le contexte du tour (champs `exclus`, `a_savoir`).

**4. Les essais : 3 retenus, 1 exclu, et le réalisateur jamais appelé avant la validation.**
- `scripts/securite-assistant-0211-qa.mjs`, partie A7 (`:641`). Le vrai `actionsDeSession` tourne sur la doublure de PostgREST, avec un
  magasin miroir de `assistant_actions`. Les clics passent par une seconde fabrique, comme `app/api/assistant/actions/route.ts:44-47`.
  - A7a et A7b : P3:160 en « fait tout seul » donne UNE carte. 101, 102 et 103 sont retenus ; 104 est exclu (relancé hier depuis le
    CRM) ; 105, trop récent, reste hors du lot. Avant le clic : 0 e-mail, 0 pilote, une seule fiche, en attente.
  - A7c et A7d : le motif et les 3 textes exacts sont sur la carte. Au clic, 3 e-mails partent, avec 3 traces par devis.
  - A7e à A7o :
    - second clic sans effet ;
    - les motifs ;
    - la pause ;
    - « ne plus relancer » illisible : aucun lot (fail-closed) ;
    - le rang 8, pour un lot et pour une relance seule ;
    - un ordre groupé ne se relance pas devis par devis ;
    - témoin du « fait tout seul » ;
    - le recontrôle au clic : un litige écrit après la carte, ou une conversation illisible.
  - **7 mutants** (A7p à A7v) : chaque garde retirée, le juge voit la brèche.
    - Sans `horsAuto`, le réalisateur part avant tout clic (4 e-mails).
    - La carte de lot entre dans la file du pilote.
    - Le lot écarté revient.
    - La relance seule écartée est reproposée.
    - La relance d'un seul devis part sous P3:160.
    - Deux relances partent en rafale.
    - Le client en litige est relancé.
- `scripts/assistant-qa.mjs`, partie E2 (`:734`) et L16l (`:1060`) : `ordreGroupe` (8 ordres groupés, 6 ordres sur un seul objet), les
  refus récents, la carte, le schéma, les nombres à sourcer, la boucle avec un faux modèle. Ce sont 13 essais, dont **2 mutants** de
  `cartes.ts` (L16b, L16d).

## La sortie des suites

Les deux suites, l'état avant puis l'état après. Les sorties complètes sont dans ce dossier (`securite-avant.txt`,
`securite-apres.txt`, `assistant-qa-avant.txt`, `assistant-qa-apres.txt`).

| Suite | Avant | Après |
|---|---|---|
| `securite-assistant-0211-qa` | 189 PASS, 0 FAIL | **212 PASS, 0 FAIL** (+23 : A7a à A7w) |
| `assistant-qa` | 310 PASS, 0 FAIL | **323 PASS, 0 FAIL** (+13 : L16a à L16l) |

Les suites qui lisent les fichiers touchés ont été rejouées en entier, après le dernier changement (`apres-*.txt` ici) :

| Suite | Résultat |
|---|---|
| `assistant-tout-qa` | 120 PASS |
| `relances-registre-qa` | 44 PASS |
| `pilote-qa` | 88 verts |
| `aide-automatique-qa` | 62 |
| `avancement-qa` | 30 |
| `types-devis-factures-qa` | 101 |
| `crm-assistant-panneau-qa` | 63 |
| `garde-fou-envoi-qa` | 33 |

Toutes sont à 0 rouge. Rien de ce que 032-007 à 032-018 ont fermé ne s'est rouvert : A1 à A6, C1 à C10 et D sont verts dans la suite
sécurité.

## Fichiers modifiés (périmètre)

- `lib/assistant/outils-actions.ts`
- `lib/assistant/cartes.ts`
- `lib/assistant/actions-serveur.ts`
- `scripts/securite-assistant-0211-qa.mjs`
- `scripts/assistant-qa.mjs`
- `.orchestre/preuves/032-021/**`

Je n'ai touché ni `app/`, ni `lib/pilote/`, ni `lib/relances*.ts`, ni n8n, ni le vault. Aucune migration, aucun build, aucun typecheck,
aucun commit.

## Risques et points à valider

1. **Pas de typecheck ni de build ici** (interdits sur l'hôte). Le code se charge et tourne par `--experimental-strip-types`, qui ne
   vérifie pas les types. La session principale doit lancer `npm run typecheck`, puis le build (`PRESTI_DIST=.next-prod`).
2. **Ce que l'écran montre** : `app/assistant/CarteView.tsx` (hors périmètre) affiche les lignes, retenus et exclus avec leur motif, et le
   message du premier retenu. Les textes des autres retenus sont dans `carte.lot.retenus[].message`, que l'écran ignore pour l'instant :
   un lot d'interface doit les rendre (dépliant par client).
3. **« Ne plus relancer »** : la table `relances_exclusions` (0185) n'existe pas. Le point d'entrée `exclusionsRelance` est posé, mais son
   défaut ne lit rien (`actions-serveur.ts:92`). L13 y branchera le lecteur, au « go » de la migration. Le motif est essayé par une
   doublure (A7f), et une lecture en erreur refuse le lot (A7h).
4. **Détecteur n8n du rang 8** : il lit les cartes refusées par `objet_id`. Une carte de lot écartée a un `objet_id` vide (ses devis sont
   dans `entrees.lot`), donc le détecteur ne la voit pas. Il faut le corriger dans le workflow n8n (hors périmètre, lot L12 n8n).
5. **Le diff de `lib/assistant/` contre HEAD** compte aussi le travail des tâches d'avant (dont `cadrage.ts`, que je n'ai pas touché) :
   ne rapatrier que les fichiers listés plus haut, comparés à leur version actuelle.
6. **Une seule interprétation** : j'ai lu « compte en pause » comme la pause de l'artisan (`artisans.leads_pause`), comme le fait le
   pilote. Si Benj vise une pause par client, il faudra une colonne, donc une migration et son « go ».

TACHE 032-021 FAITE
