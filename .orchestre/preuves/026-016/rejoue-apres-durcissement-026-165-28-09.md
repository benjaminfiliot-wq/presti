# 026-016 — rejeu après durcissement de scripts/agents/mesure-a-sec.mjs (026-165, 28/09)

`scripts/agents/mesure-a-sec.mjs` est un des juges du lot 1 de `scripts/juges-026-acquisition-preuve.mjs`, verifier
officiel de 026-016 (déjà commitée, `.orchestre/fait/026-016.md`). Le durcissement de 026-165 (mission « juges à
durcir », commit `0c0aad1a`, critère MS-4 : distingue désormais une tentative bloquée d'une tentative réellement
sortie) touche ce même fichier. Règle de la mission : rejouer le verifier d'une fiche déjà commitée qui réutilise un
juge corrigé, et noter le résultat.

## Rejeu

```
$ node scripts/orchestre.mjs verifier 026-016
✓ 026-016 : PASS · 50s · 0 ligne(s) produite(s) · preuve : .orchestre/preuves/026-016/verifier.log
```

PASS confirmé, aucune régression. La seule différence dans `.orchestre/preuves/026-016/echecs-attendus.md` régénéré
est l'horodatage de la ligne d'en-tête (`2026-09-26T09:12:28Z` → `2026-09-28T17:03:05Z`) ; le tableau des critères
attendus en échec par juge/partie est identique à l'octet près. Le renforcement de MS-4 (garde « rien ne part ») ne
change donc rien à ce que 026-016 attend de `mesure-a-sec.mjs` sur son propre lot.

Rien d'autre touché ; pas de nouveau commit (le seul changement, la régénération de `echecs-attendus.md`, est un
horodatage sans substance — laissé tel quel dans l'arbre de travail, non commité).
