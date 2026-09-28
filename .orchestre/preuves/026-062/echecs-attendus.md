# Échecs attendus des juges du domaine acquisition sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:5:debut -->
## Lot 5 — fiche 026-062 — référence `86ce0f3`

Écrit par `node scripts/juges-026-acquisition-preuve.mjs --lot=5` le 2026-09-28T08:48:02Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-acquisition/reference`), avec `--racine`, puis en `--auto-controle` sur l'état actuel. L'extrait est la première ligne de critère de sa sortie, recopiée telle quelle (seul `|` est échappé), relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Autocontrôle |
|---|---|---|---|---|---|
| facteur-qa --partie=facteur | `86ce0f3` | FA-1 | 1 | ❌ FA-1 absent : facteur.ts ; absent : porteurs.ts ; absent : envoiMeta.ts ; absent : cron/facteur/route.ts ; absent : usine/facteur/travail/route.ts ; absent : usine/facteur/avis/route.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
| facteur-qa --partie=porteur | `86ce0f3` | PF-1 | 1 | ❌ PF-1 absent : porteurFormulaire.ts ; absent : porteur-formulaire.mjs ; absent : usine/porteur/travail/route.ts ; absent : usine/porteur/rendu/route.ts ; absent : usine/porteur/oppositions/route.ts ; unité systemd absente : presti-porteur.service ; … (9 défauts) | PASS, code 0 (AC-2, AC-3) |
| facteur-qa --partie=gmail | `86ce0f3` | GM-1 | 1 | ❌ GM-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/porteurs/gmail.ts | PASS, code 0 (AC-1, AC-3) |
| disjoncteurs-qa | `86ce0f3` | DJ-1 | 1 | ❌ DJ-1 aucune migration supabase/migrations/*_acquisition_envoi.sql sous .orchestre/travail/026-acquisition/reference ; module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/disjoncteurs.ts | PASS, code 0 (AC-1, AC-2) |
| jauges-qa | `86ce0f3` | JG-1 | 1 | ❌ JG-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/jauges.ts ; route absente : .orchestre/travail/026-acquisition/reference/app/api/controle/jauges/route.ts | PASS, code 0 (AC-1, AC-2) |
<!-- lot:5:fin -->
