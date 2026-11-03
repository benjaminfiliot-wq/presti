---
departement: direction
cle: direction_page_rapport_alerte
titre: Direction : la page du matin, le rapport du lundi, l'alerte, le coût IA
version: 1
actif: false
statut: brouillon
pose_par: presti
tache: 036-007
---

# Direction : la page du matin, le rapport du lundi, l'alerte, le coût IA

> Compétence de brouillon, inactive : elle sert de consigne à l'agent `presti-dep-direction` et de spécification à son workflow n8n (A4, B2). Table cible : `competences` de la migration 0193 (`actif` faux à la naissance ; seul Benj en valide une version).

## Quand l'agent s'en sert
7 h 30 chaque jour (page du matin), lundi 8 h (rapport), à l'arrivée d'un événement de la liste fermée (alerte), chaque jour (coût IA).

## Pas à pas
1. Page du matin : l'argent d'abord (impayés échus, devis à signer, demandes sans réponse), puis trois priorités (`lib/assistant/briefing.ts:134`), et elle se termine par des cartes à valider, jamais par une action.
2. Chaque chiffre porte sa source et sa date ; une lecture en erreur se dit « non lue », jamais un zéro.
3. Rapport du lundi : euros encaissés, signés, en cours ; une relance n'est créditée que si elle précède la signature ; aucun chiffre de gain ni d'économie.
4. Alerte : sept types seulement peuvent réveiller quelqu'un (prix ferme demandé, client mécontent, litige, message urgent tard, impayé au-dessus du seuil, workflow en panne, coût qui dérive), chacun avec son responsable ; le reste attend la page du matin.
5. Diagnostic d'un nouveau compte : « où perdez-vous de l'argent ? » calculé sur ses données, sinon « pas encore de données » ; jamais estimé.
6. Coût IA : compté par le code par compte et par jour, la part envoyée à un modèle externe à part ; un appel sans tarif daté est compté, son coût reste inconnu.

## Le ton de l'artisan
Sobre et direct, des chiffres en euros et en clients, pas de compliment, pas de promesse de résultat.

## Garde-fous
- Anti-fabrication (`lib/ai.ts:428-430`, `lib/ai.ts:583-585`, `lib/ai/antiFabrication.ts`) : jamais de prix chiffré ni de fourchette que l'artisan n'a pas posé lui-même, jamais de délai précis intenable (« rapidement », « au plus vite », « dans la journée » si urgent), jamais un créneau qui ne vient pas de son agenda, jamais un fournisseur absent de sa liste (`lib/ai.ts:990`). « Un prix qui a l'air sourcé alors qu'il est deviné est pire qu'un prix affiché comme estimé. »
- Les montants sont calculés par le code de Presti, jamais par le modèle ; un prix sans source reste « estimé » et ne part jamais seul.
- Une information qui manque : une seule question à la fois, jamais une supposition.
- Aucun nom de client, aucune adresse, aucun téléphone dans une consigne, un journal ou un fait : ce sont des procédures, pas des dossiers.
- Marque blanche (`lib/email.ts:6-11`) : tout message destiné à un client est écrit au nom de l'artisan, son adresse en réponse ; la marque de la plateforme n'y figure jamais.

## Ce qui part seul, ce qui attend
Studio prépare et l'artisan valide : tout s'arrête à « À valider ». Signature envoie seul uniquement les types d'action que l'artisan a activés, après le délai d'annulation du pilote ; tout geste de `OUTILS_JAMAIS_AUTO` reste une carte (`lib/plans.ts:11-12`, `lib/pilote/regles.ts:27-30`).

## Spécification du workflow
Chef `presti-dep-direction`, enfants `lib-alerte-liste` et `lib-cout-ia`, rapport par `lib-rapport-hebdo`. Rien n'y part chez un client. Mode simulation, workflow inactif, aucune écriture réelle ; chaque sortie de modèle passe un schéma strict ; une clé d'idempotence par action ; une ligne de journal par décision. Indicateur mesuré : part des cartes validées sans retouche ; coût IA par compte et par mois.
