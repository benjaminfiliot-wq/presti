# 026-162 : décisions sur les juges, 04/10/2026 (correction de la notice de prospection)

Contexte : l'audit de confidentialité du 04/10 a montré que la notice publique affirmait « Aucune adresse e-mail n'est relevée »
(faux : 166 e-mails envoyés le 16/09 à des adresses lues sur les sites ; la liste ADEME porte une adresse par entreprise et les
fichiers de travail en gardent des extraits) et qu'elle taisait le téléphone, OpenStreetMap et les annuaires, Firecrawl, Anthropic et
les transferts hors UE. Texte réécrit dans `lib/confidentialite/prospection.ts`, relu par un second agent, pages régénérées et
republiées (décision de Benj du 04/10, « règle ce qui doit être réglé »). Rien n'est écrit dans `.orchestre/decisions.md`.

## Juge `scripts/confidentialite-prospection-qa.mjs`, critère CP-3 : une correction, rien d'assoupli

- Symptôme : CP-3 rouge (« aucun bloc inséré pour la section 10 ») dès que `app/confidentialite/page.tsx` diffère de HEAD, même par la seule
  ligne « Dernière mise à jour » (passée au 4 octobre 2026, parce que le texte de la section a changé).
- Cause : le juge a été écrit AVANT l'insertion de la section et suppose que HEAD ne la porte pas. Depuis ef063776 HEAD la porte : le
  diff de la date seule n'a donc aucun bloc inséré, et la dernière ligne de `jugerDiff` refusait tout écart sans insertion.
- Correction : cette dernière ligne n'exige un bloc inséré que si « avant » (HEAD) ne porte pas déjà `SECTION_PROSPECTION`.
- Ce qui reste refusé : tout écart hors ligne de date, hors import de `SECTION_PROSPECTION` et hors bloc d'un seul tenant inséré avant les
  liens de bas de page (boucle de `jugerDiff`, inchangée) ; plus d'un bloc inséré ; un bloc inséré ailleurs ; les sabotages AC-CP-3A
  (section 3 retouchée) et AC-CP-3B (bloc déplacé) restent rouges. Une page identique à HEAD passe, comme avant.

## CP-2, CP-7 et CP-H : inchangés

Le texte conserve les 24 mentions exigées par CP-2 et aucune des 3 refusées ; CP-7 compare octet pour octet les pages au rendu de
`noticeHtml()` et `mentionsHtml()`. CP-H1 compare les pages en ligne aux fichiers régénérés : à rejouer après la publication.
