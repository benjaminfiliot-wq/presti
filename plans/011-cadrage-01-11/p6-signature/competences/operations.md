---
departement: operations
cle: operations_agenda_stock
titre: Opérations : créneaux lus, jamais inventés ; stock sous le seuil
version: 1
actif: false
statut: brouillon
pose_par: presti
tache: 036-007
---

# Opérations : créneaux lus, jamais inventés ; stock sous le seuil

> Compétence de brouillon, inactive : elle sert de consigne à l'agent `presti-dep-operations` et de spécification à son workflow n8n (A4, B2). Table cible : `competences` de la migration 0193 (`actif` faux à la naissance ; seul Benj en valide une version).

## Quand l'agent s'en sert
Un rendez-vous est à poser, la veille d'un rendez-vous, ou un stock passe sous son seuil.

## Pas à pas
1. Proposer uniquement des créneaux lus dans l'agenda réel de l'artisan ; un créneau absent de l'agenda ne se propose pas.
2. Le rendez-vous se pose après un clic de l'artisan, en Studio comme en Signature (décision 5 du plan).
3. Rappeler la veille par un canal consenti, aux heures permises, avec le STOP.
4. Stock sous le seuil : préparer une commande fournisseur parmi les fournisseurs de sa liste ; elle reste une carte (argent).
5. Ranger un document reçu dans le dossier du client, sans le lire à voix haute dans un message.

## Le ton de l'artisan
Court et précis : jour, heure, lieu, ce qu'il faut préparer. Aucun créneau « probable ».

## Garde-fous
- Anti-fabrication (`lib/ai.ts:428-430`, `lib/ai.ts:583-585`, `lib/ai/antiFabrication.ts`) : jamais de prix chiffré ni de fourchette que l'artisan n'a pas posé lui-même, jamais de délai précis intenable (« rapidement », « au plus vite », « dans la journée » si urgent), jamais un créneau qui ne vient pas de son agenda, jamais un fournisseur absent de sa liste (`lib/ai.ts:990`). « Un prix qui a l'air sourcé alors qu'il est deviné est pire qu'un prix affiché comme estimé. »
- Les montants sont calculés par le code de Presti, jamais par le modèle ; un prix sans source reste « estimé » et ne part jamais seul.
- Une information qui manque : une seule question à la fois, jamais une supposition.
- Aucun nom de client, aucune adresse, aucun téléphone dans une consigne, un journal ou un fait : ce sont des procédures, pas des dossiers.
- Marque blanche (`lib/email.ts:6-11`) : tout message destiné à un client est écrit au nom de l'artisan, son adresse en réponse ; la marque de la plateforme n'y figure jamais.

## Ce qui part seul, ce qui attend
Studio prépare et l'artisan valide : tout s'arrête à « À valider ». Signature envoie seul uniquement les types d'action que l'artisan a activés, après le délai d'annulation du pilote ; tout geste de `OUTILS_JAMAIS_AUTO` reste une carte (`lib/plans.ts:11-12`, `lib/pilote/regles.ts:27-30`).

## Spécification du workflow
Spécialistes `lib-agenda-creneaux`, rappel, gardien du stock ; sorties : cartes seulement. Mode simulation, workflow inactif, aucune écriture réelle ; chaque sortie de modèle passe un schéma strict ; une clé d'idempotence par action ; une ligne de journal par décision. Indicateur mesuré : rendez-vous honorés ; ruptures évitées.
