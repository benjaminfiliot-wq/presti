---
departement: suivi
cle: suivi_relances
titre: Suivi : relancer sans jamais doubler
version: 1
actif: false
statut: brouillon
pose_par: presti
tache: 036-007
---

# Suivi : relancer sans jamais doubler

> Compétence de brouillon, inactive : elle sert de consigne à l'agent `presti-dep-suivi` et de spécification à son workflow n8n (A4, B2). Table cible : `competences` de la migration 0193 (`actif` faux à la naissance ; seul Benj en valide une version).

## Quand l'agent s'en sert
Un palier de relance est atteint (J+2, J+5, J+10) ou un devis reste sans réponse.

## Pas à pas
1. Lire l'état : déjà relancé dans les 3 derniers jours, par n'importe quel chemin ? Alors ne rien faire (`lib/relancesRegistre.ts:18`).
2. Contrôler les conflits : conversation déjà en cours, client sensible (escalade), opposition ou STOP.
3. Calculer la note d'intérêt par le code ; ne jamais la demander au modèle.
4. Rédiger une relance douce qui facilite la reprise (un créneau d'appel, une visite, un devis rapide), sans pression.
5. Studio : relances préparées, en lot à valider le lundi. Signature : `relance_devis` part seule après le délai du pilote, plafond de 20 par jour.

## Le ton de l'artisan
Zéro pression. La deuxième relance propose une étape concrète ; la dernière laisse la porte ouverte.

## Garde-fous
- Anti-fabrication (`lib/ai.ts:428-430`, `lib/ai.ts:583-585`, `lib/ai/antiFabrication.ts`) : jamais de prix chiffré ni de fourchette que l'artisan n'a pas posé lui-même, jamais de délai précis intenable (« rapidement », « au plus vite », « dans la journée » si urgent), jamais un créneau qui ne vient pas de son agenda, jamais un fournisseur absent de sa liste (`lib/ai.ts:990`). « Un prix qui a l'air sourcé alors qu'il est deviné est pire qu'un prix affiché comme estimé. »
- Les montants sont calculés par le code de Presti, jamais par le modèle ; un prix sans source reste « estimé » et ne part jamais seul.
- Une information qui manque : une seule question à la fois, jamais une supposition.
- Aucun nom de client, aucune adresse, aucun téléphone dans une consigne, un journal ou un fait : ce sont des procédures, pas des dossiers.
- Marque blanche (`lib/email.ts:6-11`) : tout message destiné à un client est écrit au nom de l'artisan, son adresse en réponse ; la marque de la plateforme n'y figure jamais.

## Ce qui part seul, ce qui attend
Studio prépare et l'artisan valide : tout s'arrête à « À valider ». Signature envoie seul uniquement les types d'action que l'artisan a activés, après le délai d'annulation du pilote ; tout geste de `OUTILS_JAMAIS_AUTO` reste une carte (`lib/plans.ts:11-12`, `lib/pilote/regles.ts:27-30`).

## Spécification du workflow
Spécialistes `lib-relancer`, `lib-controler-conflit` ; une relance n'est créditée au rapport que si elle précède la signature. Mode simulation, workflow inactif, aucune écriture réelle ; chaque sortie de modèle passe un schéma strict ; une clé d'idempotence par action ; une ligne de journal par décision. Indicateur mesuré : euros de devis relancés puis signés (la relance doit précéder la signature).
