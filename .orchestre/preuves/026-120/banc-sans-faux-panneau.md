# 026-120 — le même code, jugé sur une copie sans le faux panneau d'Attention.tsx

Ce fichier n'est PAS la sortie de `verifier` : `verifier` (racine réelle, `next dev`) échoue tant que `Attention.tsx` (hors périmètre,
interdit, ouvrage non commité de 026-117) rend son propre `[data-salle-panneau="envois"]` (l.181-203) avant `Panneaux` : le juge lit le
premier élément de ce nom. Voir `.orchestre/en-cours/026-120.question.md`.

Ce qui est jugé ici : le mode banc du même juge (`--racine=<copie>`), la copie étant `app/` et `lib/` de la production, octet pour octet,
sauf le bloc `{salle === 'envois' ? (<div data-salle-panneau="envois" …>…</div>) : null}` d'`Attention.tsx` retiré. La production n'a pas
été modifiée. Sans cette retouche, le même juge rend SA-8 et SA-18 rouges (2 reprises et 2 levées au lieu de 1 et 1, J1 ×0).

Fichiers jugés (sha256) : voir `contre-verif-29-09.md`.

```
$ node scripts/pilotage-ecran-qa.mjs --partie=salles --racine=<copie de app/ et lib/ de la production, SANS le bloc data-salle-panneau="envois" d’Attention.tsx>
# 2026-10-04T20:09:35Z

pilotage-ecran-qa --partie=salles — racine C:\Users\benja\AppData\Local\Temp\claude\C--Users-benja-Documents-ofm\fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d\scratchpad\racine-sans-hack — banc (racine lue au drapeau levé, servie sur 127.0.0.1) — base 9ab71ce — graine 1634508262 — 4 scénario(s) à la fois
✅ SA-1 Panneaux.tsx n'est plus le cadre d'attente ; 13 fichiers des salles et salles.css présents ; lectures par apiDirection( sur vue=salle et vue=agent (et /api/controle/jauges pour la Salle des machines) ; ni fetch(, ni supabase
✅ SA-2 ?salle=recettes → [data-salle-panneau="recettes"] (dialog), « Fermer » et Échap retirent ?salle= ; ?agent=chef → sa fiche ; ?salle=radar → [data-salle-agents] avec un bouton par agent servi, qui ouvre sa fiche ; repos et ecommerce → « Aucun agent… » ; un bouton de la liste des salles ouvre le même panneau que l’adresse
✅ SA-3 cinq onglets ; « Venu des agents (froid) » et « Hors agents » tirés ; trente [data-jour] ; packs : le manque ; MRR 736,68 € et PAIEMENTS 8 de la trésorerie ; CANAUX brut 6 280,15 €, frais 176,99 €, net 6 103,16 € ; brut et frais absents de la station et des panneaux Trésorerie, Usine, Machines et Envois
✅ SA-4 dépenses par agent et par tâche, nature (texte, image, vidéo, voix) ou son manque tel quel, abonnements, marge 5 252,19 € et « 12 % du seuil de franchise » de la trésorerie servie, tous tirés ; aucun crédit
✅ SA-5 quatre tuiles, quatre onglets ; COMMANDES · MOIS = « 45 » de la barre ; chaque commande (métier, commune) ; aperçus = les liens signés tirés, aucun autre ; « à valider » → /controle?onglet=sites seulement si aValider > 0 (2 puis 0) ; tâches du Livreur (vue=agent&nom=livreur) et leurs pastilles
✅ SA-6 trois onglets ; maquettes (métier, commune, verdict), aperçu signé, « RÉVISION DEMANDÉE » et sa raison ; REJET 5 et PASS 67 % tirés ; PASS inconnu → « — »
✅ SA-19 résumé : RECETTES, AGENTS, AUTOMATISMES, PRODUITS DU JOUR, TÂCHES, ACTIVE AUJ. ; ACTIVE AUJ. non servie → « — » ; « synchro il y a 40 s · auto 30 s » = âge de a servi (41 s) ; I replie et déplie ; GÉRER → ?agent=tresorier ; pas d’UPGRADE ; bordure --mc-argent ; fermé : minuteries revenues à 4, aucune animation
✅ SA-7 les 5 lignes dans l'ordre, l'objectif « PAR LE CHEF », les idées et leur statut ; reunion-en-cours.json avec « Réunion en cours », reunion-close.json sans « Réunion en cours »
✅ SA-8 une ligne par canal (compteur, santé) et par technologie (envois, échecs, état, motif) ; l’anomalie en --mc-crit ; J1, J3 et « 2e juge » par envoi ; ni « chauffe », ni « boîte d’envoi », ni « R1-R3 » ; aucun bouton d’envoi ; formulaire fermé : la phrase vide exacte, aucun tableau
✅ SA-9 chef, facteur, facteur_usine, repondeur, livreur : libellé, rôle, état, cadence, [data-modele] et sa date, tâches et pastilles ; consignes (et « reçue ») du Chef, technologies des facteurs, réponses exactes du Répondeur ; [data-pause-agent] pour la direction, absent pour la lecture
✅ SA-10 horloge de la page avancée : panneau Recettes ouvert, lu à l’ouverture puis 2 fois en 60 s (1 à 3 : ni figé, ni trop souvent) ; fermé : aucune lecture ; fiche du Chef lue à l’ouverture puis 2 fois en 60 s (1 à 3), plus rien fermée ; page cachée : aucune
✅ SA-11 à 390×844 : Salle des envois et fiche d’agent en feuilles plein écran, scrollWidth ≤ 390, boutons ≥ 44 px, textes ≥ 12 px ; à 1440×900 le panneau sous la barre
✅ SA-12 aucun champ _piege dans la Trésorerie, la Salle des envois, le Standard ni les fiches (hors Répondeur, servi sans piège) ; « <img src=x onerror=alert(1)> » du Standard affiché tel quel, aucune image ni boîte ; aucune requête du navigateur hors de la page servie sur les 21 pages ouvertes
✅ SA-13 bureau.jpg 1440×900, 180 Ko, écart type 31.9 ; telephone.jpg 390×844, 48 Ko, écart type 34.0 — prises par le juge, différentes entre elles et des autres parties ; bureau : la Trésorerie ouverte ; téléphone : la Salle des envois
✅ SA-15 une pastille par classe (nombres tirés) ; les 10 réponses tirées dans l'ordre, texte exact ; [data-salle-panneau="standard"], pas la liste des agents ; aucun bouton
✅ SA-16 variantes (contacts et oui tirés), J1, J3 et 2e juge par envoi, modèles suspendus ; aucun bouton
✅ SA-17 une ligne par agent et par cron ; la mesure de l’usine ou son manque ; chaque jauge de /api/controle/jauges avec son état, la pleine en crit ; ni part ni seuil dans Machines.tsx
✅ SA-18 rôle direction : [data-gestes-envoi] avec les gestes servis ; rôle lecture : absent
✅ SA-20 IA gratuites : 2 fournisseurs (résumé tel quel), 16 bascules sur 16 tirées, coût 0,77 € ; ia nul → le manque ; Trésorerie : chaque modèle et le total tirés, aucun crédit ; aucun « 0 € » écrit dans Machines.tsx
✅ SA-14 salles.css sans hexadécimal, gardes prefers-reduced-motion (le typecheck se juge sur la racine réelle)
pilotage-ecran-qa --partie=salles : PASS
```
