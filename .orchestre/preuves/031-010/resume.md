# 031-010 — les règles du 01/11 dans regles_pour, tests de recherche, npm test

Réseau neuronal consulté d'abord : `regles_pour` (avant action), puis les ADR 001-008 et la consigne `reprise/E1.md`.
Constat de départ, mesuré : `regles_pour("lancer une campagne d'e-mails de prospection")` rendait `[]` avant le travail, puis des mémoires
d'avant le 01/11 sans l'ADR-004.

## Fichiers modifiés (tous dans le périmètre, rien d'interdit touché)

| Fichier | Changement |
|---|---|
| `cerveau/src/config.mjs` | source `regles-presti` (`.claude/rules/*.md`) ; exclusion de `plans/011-cadrage-01-11/brouillons/` (22 fichiers, copies périmées) ; trois déclencheurs (vidéo ou carrousel, campagne ou prospection par e-mail, migration) qui nomment les règles du 01/11 et les ADR 004, 005, 006 ; filet des secrets réécrit : plus de liste propre, il réutilise les 18 détecteurs de clés de `garde-contenu.mjs` (import à la demande par `createRequire`, pour que le hook ne charge pas la garde), échoue si un type est renommé |
| `cerveau/src/indexeur.mjs` | morceaux de `.claude/rules` marqués `r` ; ADR du vault dont l'en-tête dit `acceptee`/`accepted` marquées `ra` (ADR-001 à 006 ; 007 et 008 « proposee » ne le sont pas) ; traitement du vault passé de 2 à 3 (sinon les notes inchangées n'auraient pas été remarquées) ; `fichiersDeLaGarde` exportée |
| `cerveau/src/recherche.mjs` | `reglesPour` filtre `r` ou `ra` ; poids de la source |
| `cerveau/scripts/test-regles.mjs` | **nouveau**, 87 vérifications, avec deux mutants intégrés |
| `cerveau/scripts/preuve.mjs` | 8 questions sur les notes de la phase 1.4, rappel@3 exigé 100 %, mutation + témoin ; ajoutées à la condition PASS |
| `cerveau/scripts/test-ecriture.mjs` | les 8 outils MCP exposés exactement, descriptions et schémas, `sante_reseau` exposé et appelé |
| `cerveau/package.json` | `npm test` : 8 suites + la preuve, enchaînées par `&&` (arrêt au premier échec) |

Choix à connaître : les ADR acceptées portent `ra` et non `r`, parce que `src/sante.mjs` (interdit, intact) classe `r` en « règle »
revue à 30 jours, alors qu'une décision se revoit à 60 jours. `regles_pour` lit les deux.

## Preuves (sorties complètes)

- `chantier-1/suites-cerveau-10h52.log` : `npm test`, code 0 — garde-noms 904, capture-session 67, reindexer 23, contradictions OK,
  sante 57, exclusions OK, ecriture 119, regles 87, preuve PASS.
- `chantier-1/suites-cerveau-10h49.log` : première passe, **rouge**, gardée parce qu'elle a montré une régression de ma part : mon déclencheur
  « vidéo » était trop large et chassait `memoire/delogo-rayures.md` du top 3 de « efface le logo incrusté dans le coin de la vidéo » ;
  motifs resserrés, et 4 contrôles de non-régression ajoutés à `test-regles.mjs`.
- `preuves/031-010/verifier.log` : `test-regles` puis `test-ecriture` puis `preuve`, code 0.
- Une passe `reindexer.mjs --sans-serveur` avant les suites (1 719 fichiers, 10 363 morceaux, 68 exclus dont les 22 brouillons, aucun
  nouvel exclu pour « secret »).

## Les mutants rougissent (rejoués à la main, sorties vues)

- `test-regles` mutant « règles non marquées » : 10 échecs (les 5 fichiers, les 3 questions de la consigne, le rang de migration-production).
- `test-regles` mutant « ADR sans `ra` » : 11 échecs (ADR-001 à 006, ADR-004 absente de la campagne, ADR-006 absente de la vidéo).
- `test-ecriture` avec un `mcp.mjs` privé de `sante_reseau` : 2 échecs (8 outils exactement ; `sante_reseau` exposé).
- `preuve` : retirer le vault et `.claude/rules` fait échouer 7 questions sur 7 de celles qui en dépendent, le témoin « mémoire » reste trouvé.

## Risques et points à valider (Benj)

1. **Contradiction de fond, non tranchée ici** : `memoire/migrations-je-les-applique.md` (24/09 : « ne jamais lui demander de coller une
   migration, je l'applique moi-même ») dit l'inverse de `migration-production.md` (01/11 : « on colle PUIS on lève le drapeau », « le go écrit
   de Benj »). `regles_pour("appliquer une migration")` rend maintenant les deux, la règle du dépôt en deuxième position (test : dans les trois
   premières). À trancher par Benj ; la mémoire n'est pas dans mon périmètre.
2. **Le serveur de l'interface (8810) tourne encore avec l'ancienne config** : déclencheurs et filet de secrets neufs ne valent pour lui qu'après
   un redémarrage. Le MCP `cerveau` lit l'index à chaud mais garde aussi son ancienne config jusqu'au prochain démarrage de session.
3. **Injection du hook** : rappel@3 injection 88,2 % (15/17), « efface le logo… » et « épingle un commentaire… » ne sont pas injectées (une
   capture de session passe devant). Je n'ai pas de mesure d'avant mon travail pour dire si c'est nouveau ; la recherche, elle, est à 100 %.
   « Injection réelle par le serveur » : 5/7, au seuil de 80 %, sous 340-480 Mo de RAM libre ; la première passe a donné 3/7 juste après
   la réécriture de l'index (le serveur a mis 4,2 s à recharger). Limite déjà documentée dans `config.mjs`, pas corrigée.
4. Le filet des secrets est plus strict qu'avant (18 familles au lieu de 8, `sk-` dès 16 signes) : aucun fichier indexé n'en a pâti à la
   passe du 02/11 ; `test-regles` vérifie qu'aucune des 5 règles vivantes n'est exclue.
5. Le repère « GARDE (indexeur.mjs:18) sans `prenoms-complement.mjs` » était déjà résolu dans le code (l'empreinte suit les imports de la
   garde) ; ce qui manquait, c'était la preuve : `test-regles` vérifie les quatre modules et chaque import de la garde.

Aucun commit, aucun push, aucun build, aucun typecheck, aucune migration ; aucun secret lu ni affiché (les fausses clés du test sont assemblées
en morceaux dans le script) ; rien écrit dans le vault.
