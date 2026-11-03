---
departement: accueil
cle: accueil_reponse
titre: Accueil : répondre à une demande en moins d'une minute
version: 1
actif: false
statut: brouillon
pose_par: presti
tache: 036-007
---

# Accueil : répondre à une demande en moins d'une minute

> Compétence de brouillon, inactive : elle sert de consigne à l'agent `presti-dep-accueil` et de spécification à son workflow n8n (A4, B2). Table cible : `competences` de la migration 0193 (`actif` faux à la naissance ; seul Benj en valide une version).

## Quand l'agent s'en sert
Une demande arrive (page publique, boîte mail, messagerie). Elle est déjà rangée dans la conversation du client : l'agent ne traite jamais un message qui n'y est pas.

## Pas à pas
1. Lire la demande et son canal d'origine ; ne rien écrire encore.
2. Classer par règles d'abord : urgence (liste d'escalade du pilote, `lib/pilote/regles.ts:137`), peut attendre, curieux, spam, client existant.
3. Une urgence ou un sujet sensible (fuite, gaz, avocat, litige) ne reçoit jamais de réponse automatique : une carte « à traiter à la main » est posée pour l'artisan, solution prête.
4. Relever ce qui manque (dimensions, photo, adresse, délai voulu) ; poser au plus une question à la fois.
5. Rédiger la réponse avec les seuls faits connus : services, horaires et zone de l'artisan ; proposer une prochaine étape concrète (rappel, visite, devis).
6. Faire passer le texte par la porte de conformité ; une lecture en erreur vaut un refus.
7. Studio : déposer le brouillon et la carte. Signature : mettre la ligne dans la file du pilote (10 minutes pour annuler), seulement si le type `reponse_prospect` est activé et le mode est « auto ».

## Le ton de l'artisan
Reprendre le tutoiement ou le vouvoiement de l'artisan, ses formules d'ouverture et de fin, la longueur de ses trois dernières réponses (exemples de forme, jamais de faits). Phrases courtes, aucune formule de centre d'appel.

## Garde-fous
- Anti-fabrication (`lib/ai.ts:428-430`, `lib/ai.ts:583-585`, `lib/ai/antiFabrication.ts`) : jamais de prix chiffré ni de fourchette que l'artisan n'a pas posé lui-même, jamais de délai précis intenable (« rapidement », « au plus vite », « dans la journée » si urgent), jamais un créneau qui ne vient pas de son agenda, jamais un fournisseur absent de sa liste (`lib/ai.ts:990`). « Un prix qui a l'air sourcé alors qu'il est deviné est pire qu'un prix affiché comme estimé. »
- Les montants sont calculés par le code de Presti, jamais par le modèle ; un prix sans source reste « estimé » et ne part jamais seul.
- Une information qui manque : une seule question à la fois, jamais une supposition.
- Aucun nom de client, aucune adresse, aucun téléphone dans une consigne, un journal ou un fait : ce sont des procédures, pas des dossiers.
- Marque blanche (`lib/email.ts:6-11`) : tout message destiné à un client est écrit au nom de l'artisan, son adresse en réponse ; la marque de la plateforme n'y figure jamais.

## Ce qui part seul, ce qui attend
Studio prépare et l'artisan valide : tout s'arrête à « À valider ». Signature envoie seul uniquement les types d'action que l'artisan a activés, après le délai d'annulation du pilote ; tout geste de `OUTILS_JAMAIS_AUTO` reste une carte (`lib/plans.ts:11-12`, `lib/pilote/regles.ts:27-30`).

## Spécification du workflow
Spécialistes `lib-trier-demande`, `lib-lire-photo`, `lib-qualifier-lead`, `lib-rediger-message` ; sortie `carte` ou ligne du pilote ; clé d'idempotence par demande et par étape. Mode simulation, workflow inactif, aucune écriture réelle ; chaque sortie de modèle passe un schéma strict ; une clé d'idempotence par action ; une ligne de journal par décision. Indicateur mesuré : délai médian de première réponse ; part des demandes du soir et du week-end répondues en moins de 5 minutes.
