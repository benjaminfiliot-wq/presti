# 026-227 — contre-vérification de la production (sabotages réversibles)

Production visée : `scripts/chef/lancer-experience.mjs`, sha256 `d29dc4348969e9ab0cfa7f97fbbf7c4930cafde7b10ecdb288dd27e83503cb4b`.
Méthode (pilote : `contre-verif-sabotages.mjs`, relançable) : une sauvegarde hors du dépôt, puis pour chaque sabotage UN remplacement de chaîne
exacte (trouvée une seule fois), `node scripts/juges-026-completude-qa.mjs --partie=experience --rapport=…` sur le dépôt réel, lecture du
rapport JSON (code de sortie et critères rouges, pas le texte), restauration dans un `finally`, contrôle du sha256. Juge comportemental :
doublures injectées (ventes, registre, horloge figée, événements, drapeaux), compte d'appels, réseau et lecture de secrets coupés.

Témoin (production intacte) : code 0, aucun critère rouge (EX-0 à EX-9 et EX-R, 11/11).

| # | Sabotage de la production | Code | Critère rougi |
|---|---|---|---|
| 1 | un indicateur « test » absent pris pour un non (`v.test !== true`) | 1 | EX-2 |
| 2 | un encaissement sans source accepté | 1 | EX-2 |
| 3 | un accord sur un autre objectif pris pour un accord (`if (false)`) | 1 | EX-3 |
| 4 | le seuil d'arrêt n'est plus exigé | 1 | EX-4 |
| 5 | le froid s'ouvre avant le 12/10 | 1 | EX-5 |
| 6 | un second lancement du même id redémarre (nouvel événement) | 1 | EX-6 |
| 7 | un cadre modifié ne demande plus de nouvel accord | 1 | EX-7 |
| 8 | une mesure absente conclut par `succes: true` | 1 | EX-8 |
| 9 | le bilan bascule un drapeau (`deps.drapeaux.basculer()`) | 1 | EX-9 |

9/9 sabotages rougis sur le critère visé (et sur lui seul). Restauration : sha256 après = sha256 avant (`d29dc434…cb4b`), juge relancé
après restauration : code 0, aucun rouge. Aucun autre fichier touché.

## Ce que le juge ne prouve pas, prouvé à part

Le juge ne regarde ni les reprises après coupure, ni les accords datés, ni le coût, ni les données personnelles. `essais-complementaires.mjs`
(données fictives, horloge figée, aucune connexion) : **39/39 verts** — proposée puis accord (un seul démarrage), coupure du bus entre
« approuvée » et « en cours » (reprise sous la même clé d'idempotence), accord d'un autre objectif / futur / expiré / sans id refusé sans écriture,
sept champs du cadre modifiés = `nouvel_accord`, adresse, téléphone, secret, id piégé (`../`), portée inconnue, départ absent, version 0 refusés
avant écriture, système de vente muet ou liste illisible = fermé, registre en panne = aucun événement, période absente = « non mesuré » et voie
suspendue, coût dépassé = arrêtée, conclusion d'une expérience seulement proposée refusée, arrêt forcé, bilan en trois sections.

`essai-cli.mjs` : essai à sec de la ligne de commande (dossier de travail jetable) — devis seul refusé (code 3, critère `premiere_vente`),
ventes absentes refusées, encaissement confirmé → en cours, relance → « déjà enregistrée », arrêt forcé → arrêtée « non mesuré », conclusion
après arrêt inchangée, id piégé refusé, sans argument code 2 ; un seul événement de démarrage et un de suspension, tous marqués `a_sec` ;
l'usage réel est fermé sur une racine sans verdicts (026-220, 026-226, 026-103 manquantes). Journal : `essai-cli-a-sec.log`.

Limite assumée : le module ne peut pas prouver qu'un fichier de ventes vient du système de vente ; la règle d'exploitation (export du
Comptable, jamais un fichier tapé à la main) est écrite dans `docs/agents/lancement-experience.md`.
