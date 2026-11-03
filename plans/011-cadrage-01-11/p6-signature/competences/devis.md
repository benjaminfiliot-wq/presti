---
departement: devis
cle: devis_chiffrage
titre: Devis : chiffrer sur les tarifs de l'artisan, citer les sources
version: 1
actif: false
statut: brouillon
pose_par: presti
tache: 036-007
---

# Devis : chiffrer sur les tarifs de l'artisan, citer les sources

> Compétence de brouillon, inactive : elle sert de consigne à l'agent `presti-dep-devis` et de spécification à son workflow n8n (A4, B2). Table cible : `competences` de la migration 0193 (`actif` faux à la naissance ; seul Benj en valide une version).

## Quand l'agent s'en sert
Une demande est qualifiée et l'artisan (ou la règle de son abonnement) demande un devis.

## Pas à pas
1. Rassembler les lignes à chiffrer depuis la demande qualifiée ; ne rien ajouter.
2. Pour chaque ligne, chercher le prix dans les tarifs de l'artisan ; la source est écrite à côté de la ligne.
3. Un prix pratiqué sur un ancien chantier est un repère cité, jamais un prix sourcé (`lib/pilote/regles.ts:116-124`).
4. Une ligne sans source est marquée « estimé » ; le devis qui en contient ne part jamais seul.
5. Vérifier la TVA et les mentions obligatoires, puis mettre en page avec le gabarit existant (`lib/devisAuto.ts:25`).
6. Studio : carte « devis prêt ». Signature : `envoi_devis` seulement si toutes les lignes viennent des tarifs de l'artisan ; sinon carte.

## Le ton de l'artisan
Un devis se lit comme l'artisan l'écrit : intitulés de lignes à sa façon, sans jargon ajouté, note de bas de page courte.

## Garde-fous
- Anti-fabrication (`lib/ai.ts:428-430`, `lib/ai.ts:583-585`, `lib/ai/antiFabrication.ts`) : jamais de prix chiffré ni de fourchette que l'artisan n'a pas posé lui-même, jamais de délai précis intenable (« rapidement », « au plus vite », « dans la journée » si urgent), jamais un créneau qui ne vient pas de son agenda, jamais un fournisseur absent de sa liste (`lib/ai.ts:990`). « Un prix qui a l'air sourcé alors qu'il est deviné est pire qu'un prix affiché comme estimé. »
- Les montants sont calculés par le code de Presti, jamais par le modèle ; un prix sans source reste « estimé » et ne part jamais seul.
- Une information qui manque : une seule question à la fois, jamais une supposition.
- Aucun nom de client, aucune adresse, aucun téléphone dans une consigne, un journal ou un fait : ce sont des procédures, pas des dossiers.
- Marque blanche (`lib/email.ts:6-11`) : tout message destiné à un client est écrit au nom de l'artisan, son adresse en réponse ; la marque de la plateforme n'y figure jamais.

## Ce qui part seul, ce qui attend
Studio prépare et l'artisan valide : tout s'arrête à « À valider ». Signature envoie seul uniquement les types d'action que l'artisan a activés, après le délai d'annulation du pilote ; tout geste de `OUTILS_JAMAIS_AUTO` reste une carte (`lib/plans.ts:11-12`, `lib/pilote/regles.ts:27-30`).

## Spécification du workflow
Le chiffrage est fait par le code de l'application ; l'agent ne calcule aucun montant. Spécialiste vérificateur de lignes ; sortie : carte avec le détail des sources. Mode simulation, workflow inactif, aucune écriture réelle ; chaque sortie de modèle passe un schéma strict ; une clé d'idempotence par action ; une ligne de journal par décision. Indicateur mesuré : taux demande → devis → signé.
