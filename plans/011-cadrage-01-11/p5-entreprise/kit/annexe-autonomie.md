# Annexe d'autonomie — modèle (mode A), sur « Exemple. Bâti-Démo »

> **Pièce 4 du kit commercial du mode A** (tâche 035-002). C'est l'annexe du contrat de l'étape 5 (p5:55) : la liste des actions
> autorisées en automatique, type d'action par type d'action. Elle applique la section « Autonomie et validation » (p5:222-227).
> Modèle à faire relire par un juriste avant le premier contrat ; aucun prix n'y figure (le prix, c'est Benj : p5:54).
>
> **Les règles.**
> - L'autonomie est celle de **Signature**, ni plus ni moins (p5:27, `lib/plans.ts:103`), réglée **par type d'action** (p5:224).
> - **Par défaut, tout commence en carte à valider** (p5:224). Un type d'action passe en automatique seulement quand le client l'accepte
>   **par écrit**, après le **mode ombre** (étape 7a, p5:57), où rien ne sort et où l'on compare à ce qu'aurait fait l'équipe.
> - Une action automatique passe par le **pilote automatique** : **10 minutes pour annuler** (`DELAI_ANNULATION_MIN`,
>   `lib/pilote/regles.ts:27`), au plus **20 par jour** et par compte (`PLAFOND_AUTO_JOUR`, `lib/pilote/regles.ts:30`), sur une liste
>   fermée (p5:225).
> - L'accord est **révocable à tout moment** : le client repasse un type en carte à valider d'un mot écrit, et l'interrupteur général
>   par client et par agent coupe tout, avec effet immédiat (p5:263).
> - Rien ne passe en production chez le client sans son accord écrit sur ce qui change (p5:227).
> - Un geste de la liste « jamais en automatique » reste une carte, **même réglé en automatique au contrat** (p5:226) : la ligne ne peut
>   pas entrer dans le tableau des types d'action.

## Les types d'action

| Type d'action | Niveau par défaut | Niveau demandé (Exemple.) | Accord écrit (Exemple.) | Condition avant l'automatique |
|---|---|---|---|---|
| Relance de devis | carte à valider | Exemple. automatique après accord écrit | Exemple. accord du titulaire, daté au contrat | mode ombre terminé, registre commun des relances lu avant chaque envoi |
| Rappel de paiement d'une facture échue | carte à valider | Exemple. carte à valider | Exemple. aucun accord : reste en carte | mode ombre terminé ; opt-in des impayés coché (`lib/plans.ts:77`) |
| Réponse à une demande simple | carte à valider | Exemple. carte à valider | Exemple. aucun accord : reste en carte | mode ombre terminé ; porte de conformité passée |
| Alerte interne à un membre | carte à valider | Exemple. automatique après accord écrit | Exemple. accord de l'associé, daté au contrat | aucune donnée sensible en clair dans la notification |
| Rapport hebdomadaire du gérant | carte à valider | Exemple. automatique après accord écrit | Exemple. accord du titulaire, daté au contrat | chiffres sourcés et datés ; déclaré jamais présenté comme mesuré |

## Jamais en automatique, même au contrat

Source : p5:226, et la liste fermée du code, `OUTILS_JAMAIS_AUTO` (`lib/pilote/regles.ts:79-82`), copiée ici et comparée au code par le
juge `scripts/kit-entreprise-qa.mjs`.

<!-- jamais:debut -->
- Envoyer un devis signé, ou modifier un prix sans source.
- Encaisser, rembourser, toucher un moyen de paiement.
- Déclarer à l'URSSAF ou aux impôts.
- Supprimer des données.
- Parler au nom de l'entreprise sur un sujet d'escalade : litige, sinistre, menace, avocat, assureur.
- Inventer un créneau, un délai, un fournisseur ou un prix ; prendre un rendez-vous seul.
- Passer ou prendre un appel téléphonique.
- Les gestes du code, toujours des cartes : `marquer_facture_payee`, `creer_facture`, `creer_facture_libre`, `rembourser`.
- Les gestes du code, suite : `payer`, `creer_avoir`, `supprimer_devis_brouillon`, `supprimer_tarif`, `supprimer_article`, `augmenter_tarifs`.
<!-- jamais:fin -->

## Signatures

| Partie | Nom — Exemple. | Rôle | Date — Exemple. |
|---|---|---|---|
| Accepté pour l'entreprise | Exemple. le titulaire d'« Exemple. Bâti-Démo » | titulaire | Exemple. date de signature du contrat |
| Accepté pour Presti | Exemple. Benj | fondateur | Exemple. date de signature du contrat |
