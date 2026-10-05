# 026-216 — sabotages de contenu-ecran-qa

Écrit par `node scripts/contenu-ecran-qa.mjs --sabotages` le 2026-10-05T07:53:46.981Z. Une copie de app/controle/contenu, components/controle/contenu et lib/ ; une faute réelle à la fois (remplacement de texte exact) ; le juge relancé sur la copie avec `--racine` ; la copie remise à l'identique après chaque passage (sha256 comparé). Aucun fichier du dépôt n'est touché.

**Bilan : PASS** — témoin vert ; 30/30 fautes prises par le critère attendu ; 65 s.

| critère | faute | attendu | observé | verdict |
|---|---|---|---|---|
| témoin | copie intacte | 0 | 0 | vert |
| CE-1 | le modèle lit l’horloge | ≠ 0 et FAIL CE-1 | 1 : FAIL CE-1 — app/controle/contenu/suivi.ts contient Date.now( : le modèle et l'affichage sont purs | prise ; sha256 restauré |
| CE-2 | la file TikTok reçoit aussi les posts des autres canaux | ≠ 0 et FAIL CE-2 | 1 : FAIL CE-2 — file TikTok : file-tt,file-ig,file-fb ; file-tt seulement (ni les posts Instagram/Facebook prêts,… | prise ; sha256 restauré |
| CE-2 | le compteur « en attente » d’une ligne compte tous ses posts | ≠ 0 et FAIL CE-2 | 1 : FAIL CE-2 — L1 : 2 publiée(s) et 4 en attente ; 2 et 1 attendues (seuls les statuts publie et en_attente comp… | prise ; sha256 restauré |
| CE-3 | R6 inconnu est traité comme ouvert | ≠ 0 et FAIL CE-3 | 1 : FAIL CE-3 — R6 inconnu : en attente R6 = ; les deux posts Meta prêts attendus (inconnu = fermé) | prise ; sha256 restauré |
| CE-4 | une publication sans preuve publique ne le dit plus | ≠ 0 et FAIL CE-4 | 1 : FAIL CE-4 — une publication à preuve vide : preuveManquante vrai, aucune preuve inventée | prise ; sha256 restauré |
| CE-5 | la miniature n’est plus montrée avec ce que le public verra | ≠ 0 et FAIL CE-5 | 1 : FAIL CE-5 — « Texte de miniature » n'est pas montré avec ce que le public verra (texte, légende, sous-titres,… | prise ; sha256 restauré |
| CE-5 | le texte servi est injecté comme du HTML | ≠ 0 et FAIL CE-5 | 1 : FAIL CE-5 — le texte hostile doit être écrit échappé, jamais interprété | prise ; sha256 restauré |
| CE-6 | une mesure « non mesuré » qui porte la valeur 0 s’affiche 0 | ≠ 0 et FAIL CE-6 | 1 : FAIL CE-6 — vues H+24 (etat non_mesure, valeur 0) : "0" ; « non mesuré » attendu, jamais 0 | prise ; sha256 restauré |
| CE-6 | une mesure absente s’écrit 0 | ≠ 0 et FAIL CE-6 | 1 : FAIL CE-6 — mesure absente d'une échéance échue : "0" ; « non mesuré » attendu | prise ; sha256 restauré |
| CE-6 | la source et la date d’une mesure non servie disparaissent | ≠ 0 et FAIL CE-6 | 1 : FAIL CE-6 — une mesure non servie garde sa source et sa date de relevé | prise ; sha256 restauré |
| CE-7 | la vente par ligne ne dit plus estimation ni sa fenêtre | ≠ 0 et FAIL CE-7 | 1 : FAIL CE-7 — L1 : « 3 ventes rattachées à L1 » ; « estimation » et « 48 h » attendus | prise ; sha256 restauré |
| CE-7 | la vente estimée s’écrit comme une mesure | ≠ 0 et FAIL CE-7 | 1 : FAIL CE-7 — la vente de l'Audience : {"texte":"2","estimation":true,"fenetreH":48} ; estimation, 48 h, « esti… | prise ; sha256 restauré |
| CE-7 | la fenêtre d’attribution n’est plus écrite à l’écran | ≠ 0 et FAIL CE-7 | 1 : FAIL CE-7 — la ligne « ventes » de l'Audience ne dit pas estimation et fenêtre 48 h à l'écran : « <th scope="… | prise ; sha256 restauré |
| CE-8 | une probabilité de 0,5 bloque (le seuil devient ≤) | ≠ 0 et FAIL CE-8 | 1 : FAIL CE-8 — ok-050 : bloqué à tort (p ≥ 0,5, source, chiffres neutres ou affirmation jugée) | prise ; sha256 restauré |
| CE-8 | le seuil de blocage descend à 0,4 | ≠ 0 et FAIL CE-8 | 1 : FAIL CE-8 — bl-049 : 0 carte(s) de blocage, 1 attendue | prise ; sha256 restauré |
| CE-8 | Laya indisponible ne bloque plus | ≠ 0 et FAIL CE-8 | 1 : FAIL CE-8 — bl-indispo-haut : 0 carte(s) de blocage, 1 attendue | prise ; sha256 restauré |
| CE-8 | une affirmation sans source ne bloque plus | ≠ 0 et FAIL CE-8 | 1 : FAIL CE-8 — bl-sans-source-vide : 0 carte(s) de blocage, 1 attendue | prise ; sha256 restauré |
| CE-8 | une probabilité absente devient une valeur flatteuse | ≠ 0 et FAIL CE-8 | 1 : FAIL CE-8 — bl-proba-nan : 0 carte(s) de blocage, 1 attendue | prise ; sha256 restauré |
| CE-8 | un chiffre sans affirmation jugée ne bloque plus | ≠ 0 et FAIL CE-8 | 1 : FAIL CE-8 — bl-chiffre-nu : 0 carte(s) de blocage, 1 attendue | prise ; sha256 restauré |
| CE-9 | Laya en panne laisse les scores à l’écran | ≠ 0 et FAIL CE-9 | 1 : FAIL CE-9 — Laya en panne (disponible faux) : état ok, 2 candidat(s) ; panne et aucun score attendus | prise ; sha256 restauré |
| CE-9 | un candidat sans score reçoit un 3 par défaut | ≠ 0 et FAIL CE-9 | 1 : FAIL CE-9 — c-sans-score : niveau 3 ; null attendu (aucun score par défaut) | prise ; sha256 restauré |
| CE-10 | une source absente du Crieur se dit « vide » | ≠ 0 et FAIL CE-10 | 1 : FAIL CE-10 — posts null → Crieur : état vide, message "Le suivi des publications n’est pas servi : rien n’est… | prise ; sha256 restauré |
| CE-10 | les ventes non servies ne le disent plus | ≠ 0 et FAIL CE-10 | 1 : FAIL CE-10 — ventes null → Recettes : état ok, message "Le rattachement des ventes aux lignes n’est pas servi… | prise ; sha256 restauré |
| CE-11 | un panneau non servi ou en panne n’est plus une alerte | ≠ 0 et FAIL CE-11 | 1 : FAIL CE-11 — tout non servi : 0 alerte(s) (role="alert") ; au moins une par panneau non servi ou en panne | prise ; sha256 restauré |
| CE-11 | sans modèle l’écran ne dit plus qu’il n’est pas servi | ≠ 0 et FAIL CE-11 | 1 : FAIL CE-11 — sans modèle (null) : l'écran doit dire « n'est pas servi » dans une alerte | prise ; sha256 restauré |
| CE-11 | les accords refusés ne sont plus montrés | ≠ 0 et FAIL CE-11 | 1 : FAIL CE-11 — l'accord refusé est montré avec son motif | prise ; sha256 restauré |
| CE-12 | un bouton de publication apparaît dans la file TikTok | ≠ 0 et FAIL CE-12 | 1 : FAIL CE-12 — écran « plein » : un élément interactif ou externe (button) | prise ; sha256 restauré |
| CE-13 | la région défilante des mesures n’est plus focalisable au clavier | ≠ 0 et FAIL CE-13 | 1 : FAIL CE-13 — chaque tableau doit être dans une région défilante focalisable au clavier, nommée (aria-label, t… | prise ; sha256 restauré |
| CE-13 | les lignes longues ne se coupent plus (mobile) | ≠ 0 et FAIL CE-13 | 1 : FAIL CE-13 — une publication : 2/2 sans retour à la ligne forcé (overflow-wrap:anywhere) ni min-width:0 (télé… | prise ; sha256 restauré |
| CE-14 | les champs étrangers d’un post passent dans la sortie | ≠ 0 et FAIL CE-14 | 1 : FAIL CE-14 — « dupont@presti-test.invalid » (champ étranger du jeu d'entrée) est passé dans le modèle | prise ; sha256 restauré |
