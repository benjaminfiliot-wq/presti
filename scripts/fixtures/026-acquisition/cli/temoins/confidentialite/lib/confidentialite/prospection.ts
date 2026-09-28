// TÉMOIN du juge confidentialite-prospection-qa (026-037) : la source unique de la section « Prospection » (026-039).
// Jamais importé par Presti. Les marqueurs {{…}} sont posés par le juge (l'adresse vient des mentions légales du dépôt).
export const SECTION_PROSPECTION = {
  titre: '10. Prospection des professionnels',
  paragraphes: [
    "Presti contacte des entreprises du bâtiment, comme professionnelles, pour leur proposer un site, et des annonceurs de la bibliothèque publicitaire de Meta pour leur proposer des vidéos publicitaires. Le responsable est celui de la section 1.",
    "Les données viennent de la liste des entreprises RGE de l'ADEME (Licence Ouverte), de l'API Recherche d'entreprises, du site de l'entreprise, de la bibliothèque publicitaire de Meta et de la personne elle-même. Aucune adresse e-mail n'est relevée ; les entreprises en diffusion partielle sont écartées.",
    "Le premier message passe par le formulaire de contact du site, un seul par entreprise, à vie. Il est rédigé et envoyé par l'assistant IA de Presti. Les réponses arrivent dans la boîte Gmail de prospection.",
    "Base légale : l'intérêt légitime. Durée : 3 ans à compter du dernier contact émanant de la personne.",
    "Sous-traitants : Supabase, Vercel, Google, Oracle Cloud, GitHub, Meta et OpenAI (Codex), sans usage pour l'entraînement.",
    "Pour refuser, écrivez STOP : le refus est appliqué en moins de 10 minutes. Une demande sur vos données reçoit une réponse dans un délai d'un mois au plus.",
  ],
  liste: [
    'Le robot PrestiRecenseur lit au plus une page par seconde et respecte robots.txt ; pour le bloquer : User-agent: PrestiRecenseur puis Disallow: /',
    "Aucun pixel ni lien pisté ; la maquette offerte est privée et son lien s'arrête au bout de 21 jours.",
  ],
} as const

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const STYLE = 'body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 16px;line-height:1.5}'

export function noticeHtml(): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Prospection des professionnels — Presti</title><style>${STYLE}</style></head>
<body><main>
<h1 id="prospection">${echapper(SECTION_PROSPECTION.titre)}</h1>
<p>Responsable : Benjamin Filiot (Presti), {{ADRESSE}}.</p>
${SECTION_PROSPECTION.paragraphes.map((p) => `<p>${echapper(p)}</p>`).join('\n')}
<ul>${SECTION_PROSPECTION.liste.map((l) => `<li>${echapper(l)}</li>`).join('')}</ul>
<p><a href="mentions-legales/">Mentions légales</a></p>
</main></body></html>
`
}

export function mentionsHtml(): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mentions légales — notice de prospection</title><style>${STYLE}</style></head>
<body><main>
<h1>Mentions légales</h1>
<p>Éditeur : Benjamin Filiot, entrepreneur individuel, SIREN 109 411 348, {{ADRESSE}}.</p>
<p>Hébergeur : GitHub Inc. (GitHub Pages).</p>
<p><a href="../">Retour à la notice</a></p>
</main></body></html>
`
}
