# Journal v18 — Lestraque, jugement à l'aveugle et barre retenue (2026-09-14–15)

Protocole : blocs datés, puces courtes, faits mesurés. Heures de Paris (UTC + 2), tirées des commits ou des verdicts ; « vers » signale une estimation. Les durées des verdicts mesurent la vérification, pas le temps total de production.

## Bloc 0 — 14 septembre, 22 h 30 (commit `abac53f`) : un PASS refusé à l'œil
- Le réétalonnage du héros 018-08 passe son juge après un premier lancement Codex rendu à la file, puis une reprise par Antigravity. Claude Code refuse pourtant le résultat à l'œil : l'image est délavée et le juge n'impose pas de plancher de contraste.
- Le héros est d'abord remis par erreur à la version de la vague 1, puis la version v4 de la vague 2 est rétablie : étalonnage sur la luminance seule depuis l'original. Le juge du héros bornait la teinte et les noirs sans plancher de contraste ; il n'a pas été durci depuis (dernier commit sur `scripts/photos-heros-qa.mjs` à 22 h 18).

## Bloc 1 — 14 septembre, 22 h 45 (commit `12bf5d6`) : vague 2
- Lestraque reçoit le héros plein cadre « Fait pour rester », un plateau noir signé, les prestations en liste éditoriale, l'atelier et la galerie sur noir, les communes et étapes monumentales, la voix de l'artisan et un formulaire de démonstration qui n'envoie rien.
- Le menu mobile et les polices du premier passage sont réparés ; onze photos inutilisées sont retirées. Les neuf autres démos restent gelées. Les juges rapportés par le commit donnent Scènes PASS et Usage PASS ; Héros reste un FAIL non bloquant après trois tours.
- Vers 23 h, Benj autorise la photo du héros dans la vidéo : « la photo est bien ». Cette autorisation vaut pour ce cas avec son crédit ; elle ne généralise pas l'usage des photos CC BY-SA.

## Bloc 2 — 15 septembre, 4 h 06 (commit `e78b6c2`) : vague 3
- Les photos sont branchées sans répétition ; la navigation suit le fond, le formulaire tient dans l'écran, la citation passe au « je », « devis gratuit » disparaît et les communes ainsi que l'échelle des titres sont reprises.
- Sur bureau, le plateau monte, les étapes épinglées s'allument une à une et les titres se lèvent. Le relief WebGL de l'escalier reste hors du fil principal, avec repli propre et zéro octet au téléphone ; la galerie passe en perspective.
- Les juges rapportés donnent Finitions PASS au troisième tour, Chorégraphie PASS, Relief PASS au deuxième tour, usage 7/7 et une médiane Lighthouse mobile de 97.

## Bloc 3 — 15 septembre, vers 5 h : jugement à l'aveugle
- Trois juges sans contexte notent six planches de même format. La démo termine à égalité en tête avec stellar-launch, à 4,08 sur 5 ; ses rangs sont 2e, 1re et 2e.
- À la barre haute, les faiblesses sont C2 mouvement ambiant, 2,7 ; C6 matière, 4 contre une cible à 5 ; C7 retenue, 3,3. La navigation chargée explique C7. Le moment signature visé pour C2 et C6 n'est pas livré : seuls des prototypes existent et le cahier des charges est en cours.

## Bloc 4 — 15 septembre, 4 h 49 (commit `68caef1`) : vidéo de la landing refaite
- La cause des plans figés était l'horloge de l'enregistrement Playwright, pas le site : la vidéo dérivait de 0,05 à 0,8 s par rapport au script et coupait chaque geste trop tard. Deux repères blancs servent désormais au recalage.
- Les étapes sont filmées à l'entrée et à la sortie de l'épinglage, le contact pendant la remontée vers le formulaire et le plateau pendant sa montée sur l'escalier. Le juge vidéo passe, avec une pire plage figée de 0,50 s ; la planche complète a été regardée.

## Bloc 5 — 15 septembre, matin : Codex repris avec la session
- Le premier lancement de Codex sur 019-01 est coupé avec la session qui l'avait lancé, puis libéré et relancé. Le second lancement produit le PASS de 019-01 à 9 h 12.
- 019-02 échoue aux deux premiers tours : en haut de page, « Devis » restait visible dans la barre en même temps que le bouton du héros. Son PASS arrive à 9 h 29, au troisième tour.

## Bloc 6 — 15 septembre, 9 h 34 (commit `2e225af`) : la barre retenue en ligne
- Au bureau, un seul appel reste visible à la fois : le bouton du héros en haut, puis « Devis » dans la barre dès que le plateau le recouvre. Le numéro et le burger quittent la barre au bureau ; rien ne change au téléphone. Sans JavaScript, « Devis » reste visible.
- 019-01 puis 019-02 passent. Le premier juge, limité à deux positions, avait pourtant laissé passer un trou d'environ 1 500 px sans appel visible ; Claude Code le trouve sur les captures. Le contrôle parcourt désormais le défilement tous les 150 px et ne relève plus de trou en 1440×900 ni en 1280×800.

## Bloc 7 — 15 septembre, 9 h 40 (commit `9ee9483`) : le juge suit l'usage
- Le juge d'usage 018-02 est accordé à la barre retenue sans être assoupli : au bureau, il défile comme un visiteur jusqu'à voir « Devis », puis vérifie que ce bouton mène au formulaire. Le lien du menu mobile est hors profil au format de bureau sans burger.
- Tout autre élément invisible reste un échec et chaque profil conserve un accès atteignable vers le formulaire. En production sur `2e225af`, les sept contrôles passent.

