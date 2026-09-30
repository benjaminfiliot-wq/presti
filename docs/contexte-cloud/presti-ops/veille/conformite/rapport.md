# Relecture de conformité de l’écosystème Presti

## En bref

Le reel marketing montre une chaîne complète, de la veille aux ventes.
Le manifeste contient 94 images, pas 95 ; elles ont toutes été revues.
Les 203 fiches 026 corrigent déjà beaucoup d’anciens écarts.
G3 a été fait le 25/09, mais l’INDEX et 026-148 le redemandent encore.
Le chiffre de 1 300 € du reel pubs est une déclaration, pas une preuve de paiement.
Les seize fiches marketing C01–C16 sont conçues à part ; elles ne sont pas dans la série 026.
La consigne Laya/Jev de Benj manque dans les fiches 026, alors que le plan marketing la dit déjà prévue.

## Écarts confirmés

- **Important · interface** — L’INDEX demande encore de confirmer le geste G3 et le range parmi les gestes humains futurs. Preuve : ecosysteme-presti.md:56 « G3 FAIT » le 25/09. Dans le conçu : 026/INDEX.md:402,425 ; 026-148. Correction : Inscrire G3 comme fait le 25/09 dans le suivi et vérifier sa preuve datée ; ne plus demander de refaire le réglage.
- **Important · ia-usine** — G3 est encore formulé comme geste à faire, bien qu’il soit daté fait le 25/09. Preuve : ecosysteme-presti.md:56 « G3 FAIT ». Dans le conçu : 026-148.md:26,71,84 ; 026/INDEX.md:402. Correction : Vérifier une fois la ligne G3 dans decisions.md ; si elle manque, la consigner à partir de la preuve existante sans renvoyer Benj dans ses réglages.
- **Important · ia-usine** — Laya/Jev est demandé pour les décisions locales, mais le plan marketing le dit « déjà prévu » en le remplaçant par des juges en code. Aucune fiche 026 ne le nomme. Preuve : ecosysteme-presti.md:57-58 ; reel t043.0 « Jev checks ». Dans le conçu : Ecosysteme-Marketing-Reel-2026-09-25.md:247,322 ; 026/INDEX.md. Correction : créer une fiche Laya/Jev pour tri, score et contrôle probabiliste ; garder les règles déterministes et calibrer les seuils avant usage.
- **Mineur · pubs** — La promesse « client payé 1 300 € » est présentée comme preuve de paiement alors que le reel ne montre que l’affirmation du créateur. Preuve : hugomatias-DcODQPCMsLl t000.0, voix 0:00-0:05. Dans le conçu : inventaires/pubs.md:5 ; Ecosysteme-Recherche-Pubs-2026-09-24.md ; 026-126. Correction : Écrire « Hugo affirme avoir été payé » ; ne pas utiliser le chiffre comme preuve de résultat Presti.

## Écarts réfutés

- interface — L’ancien plan dit encore que Benj envoie le message et les captures, alors que le Mission Control et les agents sont désormais la voie retenue. Réfuté : L’ancien plan manuel est déjà corrigé par les fiches actives 026.
- prospection — Le parcours manuel ancien fait envoyer par Benj les premiers messages et les deux captures. Réfuté : Le parcours manuel est une ancienne version rectifiée par 026-087, 026-089 et 026-095.
- prospection — L’INDEX présente les décisions R déjà tranchées comme paramètres provisoires à confirmer. Réfuté : R4, R10, R17 et R23 sont tranchées dans l’INDEX et reprises par les fiches actives.
- prospection — La page du vieux plan peut encore orienter vers un séquenceur et des boîtes payants. Réfuté : Le séquenceur et les boîtes payantes sont explicitement annulés dans l’INDEX.
- pubs — Le service pubs retenu ne doit pas exiger Alexya ni les crédits ElevenLabs. Réfuté : Alexya est déjà retiré au profit de la chaîne gratuite dans 026-156 et 026-200.
- marketing — La série 026 ne contient aucune fiche C01-C16 pour la structure complète du reel marketing. Réfuté : C01 à C16 sont définies dans un document marketing distinct de la série 026.
- marketing — Le projet R24 autoriserait une ligne entière après un seul accord alors que le reel demande chaque post dans la file. Réfuté : R24 reste ouvert ; la validation par publication demeure la règle par défaut.
- marketing — Le Mesureur prévoit un relevé TikTok manuel régulier si l’API est fermée. Réfuté : C10 examine d’abord la voie API TikTok et ne prévoit le manuel qu’en repli.
- ia-usine — La question « Codex en automatique sur les prospects : oui ou non ? » reste ouverte malgré l’architecture active et G3 fait. Réfuté : G3 autorise le traitement des données par Codex, mais ne tranche pas explicitement le mode automatique ; la question reste ouverte dans 026-148:26.
- ia-usine — Le registre historique recommande Groq malgré son refus ultérieur. Réfuté : Le refus de Groq est déjà consigné après l’ancienne recommandation.

## Corrections non prises

- **Marketing** : C01–C16 sont détaillées dans `Ecosysteme-Marketing-Reel-2026-09-25.md:379-394`, mais aucune fiche numérotée 026 ne les exécute. La vérification adverse a réfuté le terme « oubli » car la série C est conçue séparément. Il reste à l’assembler et à en suivre le statut.
- **Douleurs mensuelles** : `026/INDEX.md:471` indique une passe mensuelle sans fiche dédiée. La fiche 026-073 couvre déjà l’approbation mensuelle ; l’écart d’absence totale est donc non confirmé. Préciser qui lance la passe.
- **Expériences payantes** : `026/INDEX.md:471` réserve le geste de lancement à après la première vente ; aucune fiche 026 ne le prend encore. Le blocage des dépenses reste voulu.
- **Laya/Jev** : aucune des 203 fiches 026 ne prend l'intégration du modèle local demandé dans `ecosysteme-presti.md:57-58`. Le plan marketing `:247,322` la qualifie pourtant de déjà prévue.

## Méthode et modèles

- Codex (GPT-6) : lecture dans l’ordre des 94 images du reel, de sa transcription, de 15 images au moins par vidéo de référence, de tous les carrousels, puis comparaison des décisions et des fiches.
- freellmapi : revue rapide des candidats avec Gemini 3.6 Flash ; contrôle adverse final de chaque écart avec ce modèle, d’une autre famille que Codex. Doute = `reel=false`.
- Ollama : Qwen3 4B local a tenté de réfuter l'écart Laya et l'a confirmé ; modèle d'une autre famille que Codex.
- Laya/Jev : `jev noul` local exécuté sur chacun des 14 écarts. La probabilité « cet écart est réel » figure dans `verdicts.json`. Aucun étalonnage propre à ce dossier n'est disponible : ces nombres sont des avis de tri, pas des preuves ni des réfutations. Les raisons sourcées viennent de la vérification adverse textuelle.
- Les écrans des références sont des images de démonstration. Leurs chiffres ne prouvent ni ventes ni fonctionnement réel de Presti.
