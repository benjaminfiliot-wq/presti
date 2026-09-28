---
id: 090-relances-devis
type: feature
objectif: Écrire lib/relances/modele.ts, le texte de la relance d'un devis resté sans réponse, jusqu'au vert de scripts/relances-devis-qa.mjs
perimetre: [lib/relances/modele.ts, docs/relances.md, .orchestre/preuves/090-relances-devis/**]
interdit: [scripts/relances-devis-qa.mjs, scripts/fixtures/**, supabase/**, app/**]
verifier: node scripts/relances-devis-qa.mjs
budget: { fichiers: 2, minutes: 5 }
preuve: sortie de verifier dans .orchestre/preuves/090-relances-devis/verifier.log
executant: codex
---

# 090-relances-devis — la relance d'un devis resté sans réponse

Décision : chef:2026-09-21:idee-relances-devis

## Contexte

Fiche d'essai des juges du chantier (026-121) : une idée tranchée « lancer » par Benj devient cette fiche, et son juge
`scripts/relances-devis-qa.mjs`, écrit par la routine, est hors du périmètre. Rien de réel : aucun artisan, aucun envoi.

## Ce qu'il faut faire

1. `lib/relances/modele.ts` exporte `texteRelance({ prenom, numero })`, qui rend un texte de 600 signes au plus, sans
   adresse ni lien, qui cite le numéro du devis.
2. `docs/relances.md` dit quand la relance part (jamais avant sept jours).

## C'est fini quand

- `verifier` est vert depuis `fait/`.
- Rien n'a bougé hors `perimetre`.
