# 026-087 — contre-vérification du 04/10 (claude-code)

Production : `lib/agents/acquisition/redacteur.ts`, sha256 `561a73c911c40817e6e6753527fb52e96279447854c7480815538b1d0b9ec295`
(le fichier de la contre-vérification du 29/09 : il n'a pas changé ; ce qui bloquait la fiche était le JUGE, voir `decisions-juges-04-10.md`).
Juge : `scripts/redacteur-qa.mjs` au commit `cd20e4b4`.

## Témoin

- Usine (`usine.mjs executer`, bac gelé `redacteur-qa-087`, HEAD `d9beba2d` + paquet, 28 s) : `redacteur-qa : PASS`, RD-1 à RD-15 verts, typecheck vert (RD-12), code 0.
- Auto-contrôle (`--auto-controle`) : AC-1, AC-2 (34 règles du magasin factice) et AC-3 (67 échantillons fautifs repérés, 14 conformes acceptés) verts.

## Sabotages de la production (15 essais, sur un JUMEAU : le vrai fichier n'est jamais touché)

Méthode : copie de `lib/agents/acquisition/{contrat,modeles,affirmations,faq,douleurs,conformite,redacteur}.ts` sous un dossier jetable, une
substitution exacte (une seule occurrence exigée, sinon la mise en scène échoue) dans `redacteur.ts`, puis
`node --import ./scripts/ts-loader.mjs scripts/redacteur-qa.mjs --racine=<jumeau>`. Le jumeau n'a ni `package.json` ni `tsconfig` : RD-12
(typecheck) y est rouge pour TOUS les essais, le témoin S0 compris ; c'est la seule ligne rouge du témoin. Seule la colonne « autres critères rouges »
compte. sha256 du vrai `redacteur.ts` relu avant et après : identique (`561a73c9…ec295`).

| # | Sabotage de la production | Critères rouges (hors RD-12) |
|---|---------------------------|------------------------------|
| S0 | aucun (témoin) | aucun : 14 verts sur 15, RD-12 seul rouge (jumeau sans package.json) |
| S1 | `perimerEnvois` ignoré (`bilan.perimes = 0`) | RD-11 |
| S2 | garde `ads_archive.permis` retirée | RD-15 (3 envois au lieu de 1, 0 `ads_archive_non_lue` au lieu de 2) |
| S3 | ordre des faits inversé (intertitre avant copyright) | RD-4 |
| S4 | douleur toujours d'indice 0 | RD-4 |
| S6 | longueur du champ ignorée | RD-14 |
| S7 | `envoi_froid` fermé ignoré | RD-2 |
| S8 | `preparerMessageLien` lit `envoi_froid` | RD-13 (et RD-9 : un entrant n'aurait plus son lien) |
| S9 | variante A sans le drapeau `varianteA` | RD-6 |
| S10 | `prospectsPourRelance` appelé (relance à froid) | RD-7 |
| S11 | verdict de `jugerMessage` ignoré | RD-4 (portail de J3 ajouté au juge le 04/10 : avant, ce sabotage restait vert) |
| S12 | référence en minuscules (hors `[A-Z0-9]{6}`) | RD-14 |
| S13 | faits non vérifiés admis | RD-5 |
| S14 | douleurs non approuvées admises | RD-4, RD-5, RD-6, RD-11, RD-14, RD-15 |

Pas pris par le juge, et pourquoi (défense en profondeur, rien d'à corriger) :

| # | Sabotage | Résultat | Explication |
|---|----------|----------|-------------|
| S5 | preuve de demande non exigée dans `preparerMessageLien` | rien de rouge hors RD-12 | `jugerMessage` (J3) refuse lui-même un `email_sollicite` sans preuve : `raison` reste `preuve_demande_absente`, rien n'est préparé. La garde de la production est redondante avec J3 ; l'issue observable est identique. |

## Sabotage du juge (le correctif du ton)

Le correctif de RD-9 (« rendez-vous » vu comme un « vous ») remis à l'ancienne expression (`VOUVOIEMENT.test(texte)` sans retirer adresses et
« rendez-vous ») : `AC-1 FAIL — lecture du ton : un texte en « ta maquette » dont l'adresse contient « rendez-vous » doit se lire tutoyé`. Un « vous »
glissé dans un texte tutoyé reste vu (échantillon « Meta vouvoyé » d'AC-3 et mélange tu/vous d'AC-1) : le correctif n'assouplit rien.

## Ce que cette contre-vérification n'a pas fait

- Aucun envoi, aucun appel réseau, aucune donnée réelle (prospects `*.invalid`), `envoi_froid` et les drapeaux de `lib/flags.ts` non touchés.
- Pas d'essai sur la vraie base : la Plume n'est branchée à aucune route tant que 026-094 n'est pas faite.
