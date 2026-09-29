# 026-085 — contre-vérification du 29/09 (Claude Code)

## État trouvé en prenant la fiche
Une production laissée par une passe précédente (standardiste.ts 526 lignes, entrant.ts 115 lignes) : 8 rouges au juge officiel (ST-2, 6, 11, 12, 16, 17, 20, 21). Causes, toutes rendues :

1. **Résidu de sabotage dans la production** : la passe précédente avait été interrompue pendant son sabotage n°1 ; `d[ée]sinscri` manquait dans `RE_STOP_PARTOUT` (« Désinscrivez-moi de votre liste » partait au lecteur). Restauré, conforme au §4 de la fiche.
2. **Défauts du juge `scripts/standardiste-qa.mjs`** (et non de la production), corrigés en commit séparé, à la manière des commits « juge corrigé » des fiches 026-116 et 026-044 :
   - graine `siren` : 100000000+n tronqué à 8 chiffres donnait le même SIREN à tous les prospects, l'opposition d'un prospect couvrait les autres (faux « opposé » sur les « non » sans refus, ST-2) ;
   - `lecteur ?? obéissant` remplaçait le `null` demandé par un lecteur obéissant (ST-6, ST-12, ST-16 : le cas « lecteur null » n'était jamais joué) ;
   - échéance RGPD : le juge attendait 30 jours, mais le §4 de cette fiche et 026-016 (contrat) disent « réception + 25 jours » ; le juge accepte désormais 24 à 26 jours ;
   - lecture du prospect par domaine au lieu de sa clé (ST-11), reclassement de Benj non posé dans le magasin factice (`poserEtat tranchees`, ST-16), graine ST-17 qui donnait le courriel dans le message qui n'attendait pas de candidat, réponse « hors fil » gardant un `prospect_id` (ST-20), identifiant externe du cas « 10 min » (ST-21).
   Aucun seuil n'a été assoupli hormis l'échéance RGPD (rendue à la fiche).

## Correction du 27/09 (Laya/Jev)
Le Standard n'a pas de fournisseur : le lecteur est injecté. Un score incertain (certitude < 0,7, ST-4 : 0,5) tombe sur `a_lire` ; les règles déterministes (STOP, RGPD, réponse auto, accusé de site) passent avant tout lecteur ; les seules méthodes du magasin appelables sont celles du tableau, aucun envoi (ST-3). Commentaire d'en-tête ajouté dans le module.

## Sabotages réversibles de la production (juge officiel corrigé, sha256 restaurés, résultat lu)
| # | sabotage | verdict du juge | restauration |
|---|---|---|---|
| 1 | `d[ée]sinscri` retiré de `estStop` | FAIL ST-2 | sha256 identique |
| 2 | extrait non retrouvé dans le texte accepté | FAIL ST-4, ST-10 | sha256 identique |
| 3 | « oui » après le lien n'est plus reclassé `prix` | FAIL ST-18 | sha256 identique |
| 4 | adresses web plus retirées du texte du lecteur | FAIL ST-5, ST-10, ST-22 | sha256 identique |
| témoin | production restaurée (sha256 0fc0bdb75e290e60…) | PASS | — |

Script : `.orchestre/travail/026-085-debug/sab.mjs`.
