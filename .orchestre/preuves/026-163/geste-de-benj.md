# 026-163 — l'épreuve de bout en bout, PC éteint : gestes de Benj (05/10/2026)

Cette fiche n'a aucun code : elle est un constat. Le périmètre est le seul dossier de preuves. Elle ne peut pas être « livrée » par
un agent : l'épreuve est PC éteint et elle exige les mains de Benj. Claude Code n'a rien lancé (`--etape=preparer` écrirait
un envoi d'essai en production). Aucun envoi réel, `envoi_froid` fermé.

## Avant : ce qui doit être vrai (le juge `--etape=preparer` le relit, une ligne par préalable manquant)
- 026-143 : minuteurs `presti-porteur` et `presti-atelier` installés sur l'usine (gestes de `preuves/026-143/geste-de-benj.md`).
- Variables Vercel `PROSPECTION_GMAIL_USER`, `PROSPECTION_GMAIL_PASS`, `ACQ_ADRESSE_REPONSE` posées (noms seulement lus).
- Notice vérifiée depuis moins de 7 jours (026-162), pause générale inactive, `prospectsEntrant` levé (026-145).

## Le jour J (un dimanche soir ou un jour avant un jour de semaine ; le porteur ne soumet que du lundi au vendredi, 8 h - 18 h de Paris)
1. Dire à Claude Code « lance la préparation » : il lance
   `node --import ./scripts/ts-loader.mjs scripts/atelier-maquettes-qa.mjs --reel --bout-en-bout --etape=preparer --confirmer-reel`
   et te donne les valeurs à taper (entreprise « Essai Presti », menuisier, Paris, site `essai-026-e2e-….invalid`).
2. Toi : remplir le formulaire de la landing avec ces valeurs et ton adresse personnelle, case cochée.
3. Éteindre le PC. L'e-mail de la maquette arrive sur le téléphone : regarder la vidéo, répondre « Oui, c'est combien ? » depuis la
   même adresse ; noter l'heure de réception de la réponse du Répondeur.
4. Le lendemain soir, rallumer et dire à Claude Code : l'heure d'extinction, l'heure de rallumage, l'heure de réception. Il lance
   `--etape=conclure --pc-eteint-de=<ISO> --pc-eteint-a=<ISO> --recu-le=<ISO>` : le juge écrit `releve.md`, pose l'événement
   `epreuve_bout_en_bout`, fait son ménage.

Ensuite seulement, et au plus tôt le 12/10/2026 (mesure à sec 026-165 PASS, notice vérifiée), Benj peut ouvrir `envoi_froid`.
