# 026-104 — contre-vérification indépendante, nuit du 28/09

Trace existante : `echecs-attendus.md` (lot c) et `lot.mjs` portent 3 à 6 sabotages par partie (JA-8), tous rougis au passage de 05:49Z. Les cinq ci-dessous sont NOUVEAUX (absents de `lot.mjs`).

Méthode : copie complète de `.orchestre/travail/juges-026-pilotage/temoin-c` (implémentation de référence verte) dans le scratchpad de la session, hors dépôt ; base verte vérifiée d'abord (`station` 19 verts, `fil` 14, `experience` 9, code 0). Pour chaque sabotage : sauvegarde du fichier, remplacement d'un motif unique, `JUGE_BASE_GIT=4041ec9… node scripts/pilotage-ecran-qa.mjs --partie=<p> --racine=<copie>`, restauration depuis la sauvegarde, SHA-1 relu identique. Le dépôt n'a jamais été saboté : `git status`/`git diff` hors de mes deux fichiers identiques à avant.

| # | Sabotage (fichier de la copie) | Partie | Critère rougi | Restauration |
|---|---|---|---|---|
| 1 | `Equipage.tsx` : `<span data-cadence>{a.cadence ?? ''}</span>` → `{''}` (cadence vidée) | station | ❌ ST-5 « chef : cadence « toutes les 15 min » absente ; … » (code 1) | SHA-1 identique |
| 2 | `Journal.tsx` : `{b.texte}` → `{b.texte.slice(0, 12)}` (bulles rognées) | fil | ❌ FL-2 (texte servi ≠ affiché), aussi FL-5, FL-10, FL-13 (code 1) | SHA-1 identique |
| 3 | `Journal.tsx` : `{heureParis(b.le)}` → `{String(b.le).slice(11, 16)}` (heure UTC brute) | fil | ❌ FL-2 « heure de Paris 04:32 absente (« 02:32 … ») » (code 1) | SHA-1 identique |
| 4 | `salles/Experience.tsx` : `<p data-experience-texte>{v.texte}</p>` → `dangerouslySetInnerHTML={{ __html: v.texte }}` | experience | **d'abord VERT (trou du juge)**, puis après correction : ❌ EX-4 « texte « … Note : », « … Note : <img src=x onerror=alert(1)> » servi ; boîte ouverte par la page : alert « 1 » » (code 1) | SHA-1 identique |
| 5 | `Equipage.tsx` : animation CSS `mcx 2s linear infinite` sur la cadence | station | ❌ ST-16 « sans événement, la station bouge : … animation en cours : mcx sur SPAN » (code 1) | SHA-1 identique |

## Défaut trouvé et corrigé

Sabotage 4 : aucun jeu `experience-*.json` ne servait le texte piège `<img src=x onerror=alert(1)>` (7 jeux sur 39 le portent, aucun d'expérience), donc un rendu HTML du texte servi passait vert. Correction (périmètre de la fiche) : `scripts/fixtures/026-pilotage/c/parties/experience.mjs`, `tirerEnCours()` ajoute le piège au texte tiré ; EX-4 compare déjà le texte affiché au texte servi et relève les boîtes ouvertes. Après correction : témoin vert (code 0), sabotage 4 rouge sur EX-4, verifier relancé en copie isolée.

Bilan : 5 sabotages nouveaux, 5 rougis sur le bon critère après correction (4 rougis avant correction). Le juge n'est pas un juge de présence : il compare l'écran aux valeurs tirées (cadences, heures de Paris, textes) et mesure l'immobilité.

## Second défaut (instabilité), trouvé en relançant le verifier

Copie isolée de 06:0xZ : `❌ VU-9 telephone.jpg : 10151 octets, 10 Ko au moins` (JA-7, JA-9). La feuille Succès du témoin pesait de 10,1 à 11 Ko en JPEG, juste au-dessus ou en dessous du seuil de 10 Ko selon le tirage (les sorties-c de la nuit en montrent trois à 10131-10139 octets). Correction (périmètre) : `scripts/fixtures/026-pilotage/c/parties/vues.mjs` prend la capture du téléphone sur la feuille Aide, une fois la feuille vérifiée (49-50 Ko, écart type 39, trois passages sur trois). Le seuil n'a pas bougé.

## Verdict final

`bash presti-ops/usine/verifier-isole.sh 026-104` → PASS (06:15:53Z, code 0, 458 s), juge d'expérience et juge des vues corrigés compris. Le passage direct `orchestre.mjs verifier 026-104` ne rougissait que sur JA-5 (git status bougé par les sessions concurrentes).
