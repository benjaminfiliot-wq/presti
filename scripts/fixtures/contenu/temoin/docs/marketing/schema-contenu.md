# Schéma du domaine contenu — TÉMOIN (fiche 026-204, partie « sql »)

`contenu_lignes`, `contenu_posts` (statut fermé, `accord_decision_id` obligatoire pour `publiable`/`publie`),
`contenu_mesures` (H+1/H+24/J+7, source obligatoire), `contenu_idees`. RLS activée sur les quatre tables ; aucune
écriture publique (`anon`/`authenticated` en lecture seule). `code_apport` par réseau, `utm_campagne` en liste
fermée applicative (026-206) — jamais une campagne par ligne éditoriale.
