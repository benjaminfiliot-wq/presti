# 026-140 — geste de Benj : lever la station (2 clics, apres avoir regarde)

Ce qui est fait : tout le code de la station est dans le depot (aucune modification de code n'est necessaire a cette fiche,
le perimetre se limite a DEUX lignes, ci-dessous). Ce qui reste est un acte reel en production : lever le drapeau `pilotage`.
Je (agent) ne leve pas de drapeau de lib/flags.ts : c'est le geste.

## Clic 1 — regarder
Ouvrir https://prestiapp.fr/controle/station apres la levee (ou demander a Claude Code de te montrer les captures
bureau.jpg / telephone.jpg que `pilotage-recette --reel` prend en production).

## Clic 2 — dire « leve pilotage » a Claude Code (chef), qui fait EXACTEMENT :
1. lib/pilotage/station.ts : `LANCEMENT = { date: 'AAAA-MM-JJ' (jour de la levee, heure de Paris), source: ... }`
2. lib/flags.ts : `pilotage: true`, commentaire « levé le <date> après la recette 026-140 ». Aucun autre drapeau.
3. `npm run build`, push, `node scripts/deploiement-etat.mjs` (READY), `node scripts/fermeture-e2e.mjs`.
4. `node scripts/pilotage-recette.mjs --reel` (cree puis efface un compte fondateur d'essai @presti-test.invalid et un agent
   essai_e2e_<alea> ; aucun envoi, aucune consigne, aucune reunion). Au premier echec : `pilotage: false`, push, READY.

## Prealables observes le 05/10
- `--avant` : RE-0 OK sauf RE-0-CARTE (Carte.tsx charge deja le moteur : ecart du juge, voir verdict-informatif-05-10.log) ;
  RE-1 a RE-3 non juges de ce fait. Si tu veux lever sans attendre : le juge doit etre mis a jour par son proprietaire
  (026-193), je n'y touche pas.
- RE-3 (appareil de notification du Poste active par Benj, 026-051) : a verifier de ton cote sur ton telephone.

## Constats a venir (aucune action maintenant)
C1 (premier envoi du Facteur, apres ouverture d'envoi_froid, >= 12/10), C2 (premiere reunion 18 h), C3 (premiere consigne) :
`node scripts/pilotage-recette.mjs --constat=envoi|reunion|consigne` quand ils ont lieu.
