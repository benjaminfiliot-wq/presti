# Fish Audio sous garde de licence et de quota (026-224)

Code : `lib/studio/voixFish.ts` (`choisirVoix`). Juge : `node scripts/juges-026-completude-qa.mjs --partie=fish` (contrat : `--contrat=fish`).

## Où on en est (29/09/2026)

| Point | État |
| --- | --- |
| Forfait Fish commercial | **Aucun.** Décision d'argent de Benj, non prise. `droits` vaut `null`. |
| Plan réellement disponible | **Non mesuré.** Aucun relevé daté du plan ni du quota n'est versionné ; une simulation du juge ne vaut pas un relevé. |
| Texte des droits (version, date) | **Non consigné.** À relever sur la page des conditions de Fish le jour où Benj envisage un forfait, avec date et version. |
| Voix de production et commandes payées | `ff_siwis` (voix locale, Kokoro), seule voie admissible. |
| Fish en `usage_interne` | Possible seulement avec clé, sonde 200, quota constaté et daté. Média **non publiable**. |

Une réponse HTTP 200 prouve l'accès technique, jamais un droit commercial. Selon la revue du 26/09, l'offre gratuite ne donne pas de droit commercial.

## Ce que la garde décide

`choisirVoix(demande, deps)` rend un manifeste, ou `{ refus, critere }` pour une demande invalide.

- Demande : `{ id, usage: 'usage_interne' | 'usage_commercial', texte, source_texte, voix?, voix_clonee?, droit_clonage? }`.
- Fish n'est choisi que si toutes ces conditions tiennent :
  1. clé présente (`deps.cle`, lue par l'appelant dans presti-secrets, jamais ici) ;
  2. quota constaté : solde numérique, date, source, relevé de moins de 24 h et pas dans le futur ;
  3. solde supérieur ou égal au besoin estimé pour le texte (un crédit par tranche de 100 caractères, au moins un) ;
  4. pour `usage_commercial` : forfait commercial, source, preuve datée, échéance connue et non passée ;
  5. sonde du service à 200.
- Sinon : synthèse locale `ff_siwis`, manifeste `fournisseur: 'local'`, `droit: 'voix_locale'`. Rien dans `fournisseur`, `voix` ni `droit` ne nomme Fish ; la raison du repli (`raison_repli`) est un code (`cle_absente`, `quota_inconnu`, `quota_perime`, `quota_insuffisant`, `licence_commerciale_absente`, `licence_non_prouvee`, `licence_sans_echeance`, `licence_expiree`, `service_indisponible`, `reservation_refusee`, `echec_synthese`, `voix_locale_demandee`).
- Un refus ou un repli ne déclenche ni dépense ni appel Fish : les contrôles précèdent la sonde, la sonde précède la réservation, la réservation précède la synthèse.

## Crédit

Avant la synthèse : réservation par id (`credits.reserver(id, besoin)`), une seule fois par id. Succès : `consommer`. Échec de la synthèse : `restituer`, puis repli local. Si `consommer` échoue après une synthèse réussie, le manifeste porte `comptabilite: 'a_reconcilier'` (l'audio existe, le crédit reste réservé). Un id déjà servi rend le même manifeste, sans nouvelle synthèse ni réservation.

## Voix clonée

Une voix clonée exige un droit de clonage distinct : `droit_clonage = { accorde: true, source, date }`, date non future. Sans lui : refus (`clonage`) avant toute sonde, réservation ou synthèse. Aucune voix de client réel dans les fixtures.

## Manifeste du média

Toujours : `id`, `fournisseur`, `voix`, `droit`, `publiable`, `date` (horloge de l'appelant), `source_texte`. Fish : `credits`, `comptabilite`, et `licence` (forfait, preuve, source, échéance) en usage commercial, `droit_clonage` (source, date) pour une voix clonée. La clé n'y figure jamais. Le journal facultatif (`deps.journal`) ne reçoit qu'un id, l'étape, le critère et l'heure.

## Branchement (montage 026-158, usines 026-200 et 026-209)

Les trois passent par `choisirVoix` et posent le manifeste à côté du média ; aucun ne choisit la voix de son côté. Tant que le forfait n'est pas décidé, l'appelant passe `droits: null` : toute demande commerciale retombe sur `ff_siwis`. Un échantillon en `usage_interne` Fish ne se publie ni ne se remet à un prospect comme produit commercial.

## Ce qui reste à Benj

- Décider d'un forfait Fish commercial (dépense). Ensuite seulement : relever le plan, la version et le texte des droits, avec date et source, et les fournir comme `droits`.
- Fournir un relevé de quota daté (le tableau de bord de Fish) : sans lui, la garde reste sur la voix locale.
