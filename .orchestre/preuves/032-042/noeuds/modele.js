// presti-reponse-seule : la place du MODÈLE. ÉPINGLÉ : ce nœud n'appelle rien, il rend une réponse d'exemple fixe pour chaque demande dont la
// décision est « part_seul » (rien pour les autres). Le jour où le workflow est publié, ce nœud est remplacé par le modèle (le prompt de
// lib/ai.ts:412-438 et le garde-fou de lib/ai/antiFabrication.ts : brief, « Avant la bascule »). La garde commune n'admet encore aucun nœud de
// modèle dans un workflow du chantier 4 (scripts/n8n-specs-qa.mjs, liste blanche de la famille c4) : voir le brief.
const REPONSE_EPINGLEE = 'Réponse exemple.';
return $input.all().map((i) => ({ json: { ...i.json, modele: 'epingle', texte_modele: i.json.decision === 'part_seul' ? REPONSE_EPINGLEE : null } }));
