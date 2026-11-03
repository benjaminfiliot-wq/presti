---
departement: apres
cle: apres_chantier_reputation
titre: Après-chantier : demander l'avis, préparer les réponses
version: 1
actif: false
statut: brouillon
pose_par: presti
tache: 036-007
---

# Après-chantier : demander l'avis, préparer les réponses

> Compétence de brouillon, inactive : elle sert de consigne à l'agent `presti-dep-apres` et de spécification à son workflow n8n (A4, B2). Table cible : `competences` de la migration 0193 (`actif` faux à la naissance ; seul Benj en valide une version).

## Quand l'agent s'en sert
Un chantier est terminé depuis 2 jours (`lib/apresChantier.ts:23`) ou un nouvel avis est arrivé.

## Pas à pas
1. Demander l'avis seulement par un canal que le client a accepté ; sans consentement, ne rien envoyer.
2. Préparer la réponse à un avis dans la voix de l'artisan, en citant un fait vrai du chantier, sans en inventer.
3. Un avis négatif n'est jamais publié sans l'artisan, en Signature comme en Studio : carte à traiter, brouillon prêt.
4. Proposer la date d'un entretien dans « À valider », jamais l'imposer.
5. Un STOP du client coupe toute demande suivante.

## Le ton de l'artisan
Remercier sans emphase, nommer le chantier, rester simple. Un avis difficile appelle de l'écoute, pas une défense.

## Garde-fous
- Anti-fabrication (`lib/ai.ts:428-430`, `lib/ai.ts:583-585`, `lib/ai/antiFabrication.ts`) : jamais de prix chiffré ni de fourchette que l'artisan n'a pas posé lui-même, jamais de délai précis intenable (« rapidement », « au plus vite », « dans la journée » si urgent), jamais un créneau qui ne vient pas de son agenda, jamais un fournisseur absent de sa liste (`lib/ai.ts:990`). « Un prix qui a l'air sourcé alors qu'il est deviné est pire qu'un prix affiché comme estimé. »
- Les montants sont calculés par le code de Presti, jamais par le modèle ; un prix sans source reste « estimé » et ne part jamais seul.
- Une information qui manque : une seule question à la fois, jamais une supposition.
- Aucun nom de client, aucune adresse, aucun téléphone dans une consigne, un journal ou un fait : ce sont des procédures, pas des dossiers.
- Marque blanche (`lib/email.ts:6-11`) : tout message destiné à un client est écrit au nom de l'artisan, son adresse en réponse ; la marque de la plateforme n'y figure jamais.

## Ce qui part seul, ce qui attend
Studio prépare et l'artisan valide : tout s'arrête à « À valider ». Signature envoie seul uniquement les types d'action que l'artisan a activés, après le délai d'annulation du pilote ; tout geste de `OUTILS_JAMAIS_AUTO` reste une carte (`lib/plans.ts:11-12`, `lib/pilote/regles.ts:27-30`).

## Spécification du workflow
Spécialistes `lib-avis-lire` et `lib-avis-repondre` (modèle épinglé) ; la réponse à un avis positif reste une carte tant que Benj n'a pas ajouté ce type à la liste fermée. Mode simulation, workflow inactif, aucune écriture réelle ; chaque sortie de modèle passe un schéma strict ; une clé d'idempotence par action ; une ligne de journal par décision. Indicateur mesuré : avis obtenus après chantier.
