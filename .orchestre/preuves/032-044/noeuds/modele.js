// presti-relances : la place du MODÈLE. ÉPINGLÉ : ce nœud n'appelle rien, il rend un texte d'exemple fixe pour chaque relance dont la décision est
// « prepare » (Studio) ou « part_seul » (Signature), rien pour les autres. Le jour où le workflow est publié, ce nœud est remplacé par le modèle
// (le prompt de lib/ai.ts:694-711, brief « Avant la bascule »). La garde commune n'admet encore aucun nœud de modèle dans un workflow du
// chantier 4 (scripts/n8n-specs-qa.mjs, liste blanche de la famille c4).
const TEXTE_EPINGLE = 'Relance exemple.';
return $input.all().map((i) => ({ json: { ...i.json, modele: 'epingle', texte_modele: i.json.courrier === 'decision' && (i.json.decision === 'prepare' || i.json.decision === 'part_seul') ? TEXTE_EPINGLE : null } }));
