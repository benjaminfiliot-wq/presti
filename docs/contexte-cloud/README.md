# Contexte de l'écosystème Presti pour Claude cloud

Instantané documentaire du 30 septembre 2026. Les quatre dossiers sources sont couverts : SaaS, Presti, presti-ops et presti-secrets (pluriel exact sur le PC). Ce dossier est un miroir documentaire ; ne pas le maintenir comme deuxième source ni exécuter ses scripts à la place des originaux. Les sources, noms et empreintes sont dans MANIFESTE.json.

## Lecture conseillée

1. [Décisions courantes et état du relais](ETAT-ET-DECISIONS.md).
2. [Organigramme](SaaS/Produit/Ecosysteme-Organigramme-2026-09-27.md), [plan](SaaS/Produit/Ecosysteme-Plan-2026-09-24.md), [rectifications](SaaS/Produit/Ecosysteme-Rectification-2026-09-24.md).
3. [Interface du Poste](SaaS/Produit/Ecosysteme-Interface-Poste-2026-09-24.md), [registre IA](SaaS/Produit/Ecosysteme-IA-Registre-2026-09-25.md), [recherche des agents](SaaS/Produit/Ecosysteme-Recherche-Agents-2026-09-24.md).
4. [Carte réelle du code](presti/.orchestre/contexte.md), [digest PC](presti/.orchestre/digest.md), [droits et méthodes](presti/AGENTS.md), [état des fiches et verdicts](ETAT-FICHES.json).
5. [Usine](presti-ops/usine/LISEZMOI.md), [moteur de fiches](presti-ops/usine/moteur.mjs), [Hermes](presti-ops/usine/hermes/LISEZMOI.md), [OpenClaw](presti-ops/usine/openclaw/LISEZMOI.md), [Ollama](presti-ops/usine/ollama-LISEZMOI.md), [Laya](presti-ops/usine/laya-LISEZMOI.md).
6. [Inventaire du coffre](presti-secrets/INVENTAIRE.json), [noms des variables et présence](ENVIRONNEMENT-VARIABLES.json).

## Les quatre dossiers

- SaaS : conception, organigramme, interface, recherche, cerveaux, décisions et historique technique.
- Presti : documentation, cartes de code, fiches et index de la série, snapshots des routes et modules agents/pilotage, scripts d'orchestration et SQL du bus. Le code canonique reste à la racine du dépôt ; les snapshots peuvent être non committés/non validés sur le PC.
- presti-ops : infrastructure de l'usine, orchestration des exécutants, installation/intégration des autres IA, veille et transcription. Les dépendances, artefacts, vidéos et données de prospection sont exclus.
- presti-secrets : existence, usage, notices et schémas masqués. Aucun jeton, clé privée, mot de passe, magasin de clés ni liste de prospects n'est publié. La présence d'un fichier ne prouve ni la validité de sa clé ni la disponibilité du fournisseur.

## Limites à lire avant de travailler

Les documents datés décrivent parfois des plans ou un état ancien. Un fichier présent n'est pas une preuve de service actif. Les versions du snapshot Presti contiennent des travaux non validés ; aucun PASS supplémentaire n'est revendiqué. Le journal de verdicts est résumé sans sorties privées, 2 ligne(s) non parsée(s) étant signalée(s). Les emails, téléphones et secrets reconnus sont masqués ; un snapshot nettoyé sert à comprendre, pas à reproduire octet pour octet une preuve. Aucun original du PC n'a été modifié.

Les données commerciales brutes, clés, verrous, logs de sessions, binaires, caches, médias et dépendances ne font pas partie du paquet. Leur absence est volontaire : voir le relevé des exclusions. Pour les preuves indépendantes 092/151, utiliser la branche codex/relais-cloud-0930 et les commentaires des PR fusionnées #2/#3.

Comptage documentaire : {"SaaS":53,"presti":858,"presti-ops":93,"presti-secrets":5,"ENVIRONNEMENT-VARIABLES.json":1,"ETAT-FICHES.json":1}.

Les empreintes SHA256 du manifeste portent sur les blobs Git publiés après normalisation des fins de ligne ; les empreintes des copies nettoyées avant Git restent indiquées séparément.

Les snapshots TypeScript se terminent par .ts.txt ou .tsx.txt afin de rester lisibles sur GitHub sans être compilés par Next.js. Le chemin source original est conservé dans le manifeste.

Complément : [mise à jour entreprise et décision du 30/09](MISE-A-JOUR-0930.md), [inventaire complet des fichiers parcourus](INVENTAIRE-COMPLET.json).

[Catalogue vidéo — statut de transfert explicite](VIDEOS-INVENTAIRE.json) et [audit des protections pour l’automatisme](AUDIT-AUTOMATISME-0930.md).

Toutes les vidéos locales recensées : **808 fichiers**, archives sur la [release privée du 30/09](https://github.com/benjaminfiliot-wq/presti/releases/tag/codex-videos-2026-09-30). Quatre ZIP, avec empreintes et chemins dans VIDEOS-INVENTAIRE.json. Un fichier vide et un pointeur LFS restent signalés comme sources incomplètes.
