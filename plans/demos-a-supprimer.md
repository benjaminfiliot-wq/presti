# Inventaire du faux — ce qui doit partir, ce qui reste

> Prompt v11 §2.1. Établi le 07/09/2026 par `scripts/zero-demo-e2e.mjs`, qui balaye la base de
> production et le code. **Rien n'a été supprimé** : la purge est irréversible, elle attend le feu vert
> de Benj (H6). Une seule chose a été faite sans attendre, parce qu'elle était dangereuse — voir §0.

---

## §0. Fait immédiatement : un compte de test était administrateur de l'entreprise

`smoke.test.28508@example.com`, créé le 07/09 à 06:55 par la suite `smoke-test`, portait :

| | |
|---|---|
| `is_founder` | `true` |
| offre | `business` |
| rôle dans `direction_roles` | `direction` (lecture **et écriture**) |
| dernière connexion | 07/09 |

Il avait donc accès à tout le Centre de direction en production : la liste des clients, le journal, le
registre des apports, et les écritures. **Privilèges retirés, rôle supprimé, sessions fermées** dès la
découverte. Le compte lui-même est dans la liste ci-dessous, en attente de suppression.

**L'enchaînement, parce qu'il est instructif** :

1. `scripts/smoke-test.mjs` crée en production un artisan `is_founder: true` (il en a besoin pour
   éprouver les écrans réservés) ;
2. son ménage n'était appelé qu'**au chemin heureux**, en fin de fonction : une exception en cours de
   route laissait le compte en base ;
3. la migration `0065`, collée quelques heures plus tard, contient
   `insert into direction_roles select id from artisans where is_founder = true` — elle a **fait
   confiance à la base** et donné le rôle « direction » à ce compte de test.

Aucune de ces trois étapes n'est absurde prise isolément. C'est leur enchaînement qui ouvre la porte.

**Corrigé** : le ménage de `smoke-test` passe désormais par un `finally`, retire les **privilèges avant**
de supprimer (au cas où la suppression échouerait), et ne suppose pas que la cascade existe.
**Verrouillé** : `scripts/zero-demo-e2e.mjs` refuse tout fondateur et tout rôle hors d'une liste close,
à chaque passage du lanceur.

---

## §1. Comptes en base — décision ligne par ligne

| Compte | Origine | Décision |
|---|---|---|
| `benjaminfiliot@gmail.com` | fondateur | **garder** |
| `alexandremesroua@gmail.com` | fondateur (partenaire) | **garder** — mais son rôle est à cloisonner (v11 §5) : il est aujourd'hui `is_founder` avec le rôle `direction`, donc il voit et peut écrire **tout** le Centre, y compris ce que le contrat ne lui accorde pas |
| `relecture-stores@presti-test.invalid` | compte exigé par Apple et Google | **garder, isoler** — à marquer `est_demo`, exclu de tous les chiffres |
| `maximebernard@gmail.com` | vrai compte | **garder** |
| `a.filiot@sfr.fr` | vrai compte | **garder** |
| `filiot.alexandre@orange.fr` | vrai compte | **garder** |
| `demo-menuisier@presti-test.invalid` — « Atelier du Chêne », offre Signature | compte de démonstration du sprint J-1 | **supprimer** (ou marquer `est_demo` s'il sert encore aux captures de la vitrine — à trancher par Benj) |
| `verif-pilotage-a-1788614816355@presti-test.invalid` | suite de vérification, 05/09 | **supprimer** |
| `verif-pilotage-a-1788623207390@presti-test.invalid` | suite de vérification, 05/09 | **supprimer** |
| `fact.1788729088066@example.com` — « Dupont Plomberie » | suite facturation, 06/09 | **supprimer** — mais voir §2, il porte des factures scellées |
| `fact.1788729096105@example.com` — « Dupont Plomberie » | suite facturation, 06/09 | **supprimer** — idem |
| `smoke.test.28508@example.com` | suite smoke, 07/09 | **supprimer** (privilèges déjà retirés) |

**Comptes de connexion orphelins** (existent dans l'authentification, sans fiche artisan) :
`wl.1788382177@x.fr`, `j6.1788340340616@example.com` → **supprimer**.

---

## §2. Les factures : le seul endroit où la purge ne peut pas passer

**7 factures** sont rattachées à des comptes de test. Elles sont **scellées et inaltérables** par la
migration `0041` (conservation légale 10 ans). C'est un verrou volontaire, et il a raison de refuser.

**Ce qu'il ne faut pas faire** : lever le verrou, ou supprimer en passant par le rôle de service. Une
table de factures qu'on peut vider sur demande ne vaut plus rien comme preuve, y compris pour les
vraies.

**Ce qu'il faut faire, dans cet ordre** :

1. ajouter `artisans.est_demo` (migration `0068`) et marquer les comptes concernés ;
2. **exclure les comptes marqués de tous les chiffres** du Poste de contrôle — MRR, encaissé, nombre de
   clients, apports. C'est le seul geste qui rend les chiffres honnêtes ;
3. laisser les factures en place, invisibles des totaux mais présentes dans la table.

Émettre des avoirs n'est utile que si ces factures ont un jour compté dans une déclaration. Ce n'est pas
le cas ici : elles n'ont jamais été payées ni déclarées. **Recommandation : marquer et exclure, sans
avoir.** Si Benj préfère les avoirs, c'est faisable, mais ça ajoute 7 pièces comptables à une histoire
qui n'en a pas besoin.

Sont aussi rattachés à ces comptes : **1 demande** (`leads`) et **1 devis** — eux se suppriment sans
difficulté.

---

## §3. Code — ce qui a été vérifié

| Vérification | Résultat |
|---|---|
| Donnée fabriquée en dur dans un écran du produit (`DEMO`, `MOCK`, `FIXTURE`, `EXEMPLE`, `SAMPLE`) | ✅ aucune |
| Page du produit important un composant de démonstration | ✅ aucune |
| `DemoVideo` / `DemoSequence` | **garder** — vitrine marketing (`app/page.tsx`), tournée sur le vrai produit, ne lit pas la base |

La règle retenue dans la suite n'est pas « aucun composant de démonstration » mais « **aucun dans le
produit** » : ce qu'un artisan ou la direction voit après connexion. La vitrine a le droit de montrer
une démonstration, à condition qu'elle ne partage aucune donnée avec le produit — ce qui est vérifié.

---

## §4. Ce qui reste à faire, et qui attend Benj

| # | Action | Qui |
|---|---|---|
| H6 | **Valider cette liste**, puis je lance la purge (elle est irréversible) | Benj |
| — | Trancher le sort de `demo-menuisier` : supprimer, ou garder marqué `est_demo` s'il sert aux captures | Benj |
| — | Trancher sur les factures : marquer et exclure (recommandé), ou émettre 7 avoirs | Benj |
| H7 | Coller la migration `0068` (`est_demo`, `role_interne`, `origine_declaree`) | Benj |
| — | Cloisonner Alexandre (v11 §5) — aujourd'hui il a tous les droits | Benj confirme la matrice, je l'applique |
