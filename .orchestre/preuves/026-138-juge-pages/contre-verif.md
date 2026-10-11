# 026-138-juge-pages — contre-vérification (04/10/2026)

Le correctif : `scripts/horloge-qa.mjs` lit le journal ops par `lireJournal` (arrêt sur page VIDE, plus jamais sur une page « plus courte que demandé » ; échec si la base répond en erreur, si le curseur n'avance pas, ou si `pagesMax` est atteint sans page vide). `--temoin` (critère E24-2) lit un journal synthétique de 450 événements servi par une fausse base qui plafonne chaque page à 200 lignes, comme `ops_evenements_lire` (migration 0097), vérifie que tout est lu et que E24-2 est vert sur ce qui est lu, rejette trois lectures sabotées (une page, base en erreur, curseur immobile) chacune pour SA raison, et vérifie que `mesurer` (le lecteur de la production, que `--temoin` ne peut pas lancer) passe par `lireJournal`.

## Quatre mutations, chacune sur une COPIE temporaire (`scripts/horloge-qa-sabotage.tmp.mjs`, retirée ensuite) ; le fichier réel n'est jamais écrit

- M1 : la lecture s'arrête sur une page courte (le défaut du 04/10, remis dans `lireJournal`) : code 1, PRISE par E24-2 — « la lecture rend 200 événement(s) sur 450 : elle doit aller jusqu'au bout d'une base qui plafonne les pages à 200 ».
- M2 : une lecture qui atteint `pagesMax` sans page vide passe pour complète : code 1, PRISE par E24-2 — « sabotage « lecture limitée à une page (pagesMax: 1) » accepté : une lecture tronquée n'est pas rejetée ».
- M3 : le curseur immobile n'est plus détecté : code 1, PRISE par E24-2 — « sabotage « curseur qui n'avance pas » rejeté pour une autre raison que la sienne : … 500 pages lues sans atteindre la fin du journal » (le garde-fou de `pagesMax` aurait masqué la mutation sans le contrôle du message).
- M4 : `mesurer` revient à sa boucle d'une seule page (`p_limite: 500`, pas de `lireJournal`) : code 1, PRISE par E24-2 — « mesurer ne lit pas le journal par lireJournal ; mesurer garde une lecture du journal qui s'arrête sur une page courte ».
- T : la copie non mutée : code 0 (vert, attendu).

sha256 de `scripts/horloge-qa.mjs` avant et après la contre-vérification : `bca7a81b644441542539a5a6bac752df0c76faf3e5668e215c4a6135f277109b`, identique (le fichier réel n'a jamais été écrit par la contre-vérification ; le script de rejeu vit dans le scratchpad de la session, pas dans le dépôt).

## Ce que cette fiche ne prouve pas

Que `mesurer` lit juste en production : c'est le rôle de 026-138 rejouée (`--reel --fenetre=24`), avec le juge corrigé.
