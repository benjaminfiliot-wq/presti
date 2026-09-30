# 026-176 — contre-vérification (session cloud, 30/09)

Fiche de Codex prise par Claude Code (session cloud) le 30/09 à la demande de Benj (« si des fiches sont libres, fais-les »), sans conflit avec un autre écrivain relevé sur `origin`. Trois lignes de code ajoutées (drapeau + son commentaire dans `lib/flags.ts`, ligne « note » de la `CARTE`), plus `docs/ecommerce/LISEZMOI.md`.

- `verifier` (`ecommerce-reservee-qa`) : PASS depuis `en-cours/`, puis depuis `fait/`. EC-1 à EC-5 verts.
- Le juge a été contre-vérifié en 026-171 : 17 sabotages du témoin tués (drapeau levé, commentaire retiré ou amputé, drapeau déclaré deux fois, carte en « lu » ou sans la ligne, LISEZMOI amputé de « rien n'est construit », des vidéos ou du drapeau, table ou fichier e-commerce ajouté, autre drapeau ou ligne de carte modifiés).
- `npm run typecheck` : vert.
- Texte du LISEZMOI : suit la correction du 27/09 (six vidéos sources du 25/09, quatorze inventaires du 26/09) ; le commentaire du drapeau garde la formule de la fiche (« trois vidéos sources »), que le juge exige. La fiche 026-176 et son juge acceptent les deux ; Benj a dit « on garde toutes les vidéos ».

## Reste à faire côté PC (geste de Benj)
Accord sur le diff de `lib/flags.ts` (il fusionne la PR), puis `node scripts/deploiement-etat.mjs` à READY et `node scripts/fermeture-e2e.mjs` vert en production (réseau et `.env.local`, non joué ici).
