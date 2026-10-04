# 026-178 — corrections de juge du 04/10 (décision du chef : corriger un juge défectueux, jamais l'affaiblir)

Une ligne par correction : fiche · juge · critère · défaut · correction. Rien n'a été écrit dans `.orchestre/decisions.md`.

Défaut commun : le juge a été écrit en 026-067 AVANT les lectures de 026-174 et de 026-175. Ses doublures rendaient des formes **inventées**
(`audience` → `{ pages, minutes, campagnes }`, `bans` → liste, `clients` → `{ actifs, essais }`, `pilotage_radar()` → `{ annonceurs, requetes,
egaliseur }`, `santeService()` → `{ etat: 'en ligne' }` nu) qui ne sont pas celles que rendent les fonctions livrées ni le SQL appliqué. Un
lecteur qui lit la vraie forme était rouge ; un lecteur qui lit la forme inventée (le témoin lui-même) était vert et **muet en production**
(pages toujours vides, 0 artisan, égaliseur absent). Les doublures rendent maintenant la forme réelle, relue dans le code et le SQL.

| # | Fiche | Juge · critère | Défaut | Correction |
|---|---|---|---|---|
| 1 | 026-178 | `station-route-qa --partie=salles2` · SL-3 | La doublure de `santeService()` rendait `{ etat: 'en ligne', raison: null }` ; la vraie fonction (`lib/controle/lectures/sante.ts`) rend un `Sourcee` `{ valeur: { etat: 'ok' \| 'degrade' \| 'incident', detail } }`, dans un autre vocabulaire que celui de l'écran. SL-3 exigeait que `sante.valeur` soit égale à la sortie brute : aucun lecteur correct ne pouvait être vert. | `base-essai.json` : `santeService` à la forme réelle. SL-3 attend la traduction (en ligne, dégradée, hors ligne), la raison (le détail, sauf « en ligne »), les battements de `usine` et de `a0` ; trois cas de plus : dégradé, incident, et un `Sourcee` en erreur (`sante` porte l'erreur, la barre reste servie, jamais « en ligne » par défaut). Sabotage `incident-en-ligne` ajouté (tue SL-3). |
| 2 | 026-178 | `--partie=salles2` · SL-9 | La doublure de `pilotage_radar()` rendait une clé `egaliseur` qui n'existe pas dans le SQL (0113 rend `annonceurs_du_jour`, `requetes_mesurees`, `requetes_meta_par_heure: [{ heure, requetes }]`). | `base-essai.json` : forme réelle (12 heures, mêmes valeurs). SL-9 attend les 12 `requetes` ; nouveau cas : `requetes_mesurees: false` → `carte.egaliseur` nul avec un `manque` (ni douze zéros, ni « arrive avec sa fiche »). Sabotage `vigie-zeros` ajouté (tue SL-9). |
| 3 | 026-178 | `--partie=salles2` · SL-2, SL-5, SL-6, SL-8 (doublures) | `audience` (vraie forme : `{ direct: Sourcee<{ en_ligne, pages_7j, flux, campagnes_7j… }>, inscriptions, historique, saturee }`), `bans` (`{ bans: [{ ip, actif… }], abus24h }`), `clients` (`{ lignes: [{ nom… }], resume }`, avec les noms « Toitures/Menuiserie/Maçonnerie Témoin » que SL-5 cherche déjà), `cerveaux` (`{ id, score, reussis, total, cas, ouverts… }`), `cronsDuService` (`Sourcee`) : formes inventées. | `base-essai.json` : formes réelles, pièges gardés (un `abonnes` dans l'audience, des noms dans `clients`, des adresses dans `bans`). SL-5 cherche en plus les trois adresses IP des bans (« sans cookie ni IP »). Sabotage `adresses-des-bans` ajouté (tue SL-5). |
| 4 | 026-178 | `--partie=salles2` · SL-8 | Le contenu de `parNature` n'était pas jugé (SL-8 ne regardait que « arrive avec sa fiche ») : une table `NATURE_DE` fausse restait verte. Les fournisseurs de la doublure (`openai-codex`, `fish-audio`) n'existent pas dans le catalogue (`lib/agents/moteurs.ts` : `codex`, `fish_audio`). | `base-essai.json` : identifiants du catalogue. SL-8 attend `{ texte: 0, image: 0, video: 0, voix: 1.5 }`. Sabotage `voix-en-texte` ajouté (tue SL-8). |
| 5 | 026-178 | témoin du lot s (`s/temoin/…/salles/*.ts.temoin`, `station.ts.temoin`, `route.ts.temoin`) et `s/lot.mjs` | Le témoin lisait les formes inventées (donc muet en production) ; ses sabotages citaient son texte. | Le témoin est la copie des lecteurs livrés (plus deux fichiers : `outils.ts`, `sante.ts`) et de la route ; `lot.mjs` : trois `avant` mis à jour, quatre sabotages de plus. `juges-026-pilotage-preuve --lot=s` rejoué sur l'usine : PASS (JA-1 à JA-10), 10 sabotages de `salles2` vus. |

Rien n'est assoupli : aucun critère retiré, aucun seuil abaissé, aucune vérification rendue facultative ; SL-2 à SL-9 jugent la même chose
qu'avant sur des formes vraies, et plus (neuf cas de plus au total). Le témoin reste vert, tous les sabotages d'avant restent pris.

## Ce que le juge ne voit toujours pas (à consolider par le chef)

- `station.ts` (026-092, hors de ce qu'écrit 026-178) lit `pilotage_couts_agents` et `pilotage_couts_taches` avec des colonnes qui ne sont pas
  celles du SQL (0107 : `montant_eur`, `tache_id` ; le code lit `eur`, `tache`) : en production `salle=tresorerie.parAgent[].cout_mois_eur`
  vaut toujours 0 et `parTache[].eur` est absent. Les doublures de `pilotage_couts_agents` et `pilotage_couts_taches` ont le même défaut (colonne
  `eur`). SV-23 ne compare que les NOMS de fonctions et de paramètres, jamais les colonnes rendues. À corriger dans une fiche de 026-092 (code
  et doublures ensemble) ; non fait ici : « rien d'autre » dans station.ts.
