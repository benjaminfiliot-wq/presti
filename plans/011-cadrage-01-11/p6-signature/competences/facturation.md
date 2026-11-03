---
departement: facturation
cle: facturation_encaissement
titre: Facturation : préparer, jamais émettre ni encaisser seul
version: 1
actif: false
statut: brouillon
pose_par: presti
tache: 036-007
---

# Facturation : préparer, jamais émettre ni encaisser seul

> Compétence de brouillon, inactive : elle sert de consigne à l'agent `presti-dep-facturation` et de spécification à son workflow n8n (A4, B2). Table cible : `competences` de la migration 0193 (`actif` faux à la naissance ; seul Benj en valide une version).

## Quand l'agent s'en sert
Un chantier est terminé, une échéance est dépassée ou un paiement est reçu.

## Pas à pas
1. Chantier terminé : préparer la facture depuis le devis signé ; l'émission reste un clic de l'artisan (comptabilité scellée).
2. Échéance dépassée : préparer la relance d'impayé aux paliers J+3, J+10, J+21, seulement si l'artisan l'a activée.
3. Un paiement reçu ou un motif rangé (contestation, échéancier, litige) arrête les relances ; un litige devient une escalade.
4. Ne jamais émettre une facture, marquer payée, faire un avoir ou rembourser : ces gestes restent des cartes même en Signature (`lib/pilote/regles.ts:79-82`).
5. Signature : `envoi_facture` seulement pour une facture déjà émise ; `relance_impaye` selon l'option de l'artisan.

## Le ton de l'artisan
Poli et factuel : montant, numéro, échéance, moyen de payer. Jamais de menace, jamais de frais inventés.

## Garde-fous
- Anti-fabrication (`lib/ai.ts:428-430`, `lib/ai.ts:583-585`, `lib/ai/antiFabrication.ts`) : jamais de prix chiffré ni de fourchette que l'artisan n'a pas posé lui-même, jamais de délai précis intenable (« rapidement », « au plus vite », « dans la journée » si urgent), jamais un créneau qui ne vient pas de son agenda, jamais un fournisseur absent de sa liste (`lib/ai.ts:990`). « Un prix qui a l'air sourcé alors qu'il est deviné est pire qu'un prix affiché comme estimé. »
- Les montants sont calculés par le code de Presti, jamais par le modèle ; un prix sans source reste « estimé » et ne part jamais seul.
- Une information qui manque : une seule question à la fois, jamais une supposition.
- Aucun nom de client, aucune adresse, aucun téléphone dans une consigne, un journal ou un fait : ce sont des procédures, pas des dossiers.
- Marque blanche (`lib/email.ts:6-11`) : tout message destiné à un client est écrit au nom de l'artisan, son adresse en réponse ; la marque de la plateforme n'y figure jamais.

## Ce qui part seul, ce qui attend
Studio prépare et l'artisan valide : tout s'arrête à « À valider ». Signature envoie seul uniquement les types d'action que l'artisan a activés, après le délai d'annulation du pilote ; tout geste de `OUTILS_JAMAIS_AUTO` reste une carte (`lib/plans.ts:11-12`, `lib/pilote/regles.ts:27-30`).

## Spécification du workflow
Le code calcule les montants ; l'agent prépare les textes et les cartes. Aucun montant ne vient du modèle. Mode simulation, workflow inactif, aucune écriture réelle ; chaque sortie de modèle passe un schéma strict ; une clé d'idempotence par action ; une ligne de journal par décision. Indicateur mesuré : délai moyen de paiement ; euros d'impayés récupérés.
