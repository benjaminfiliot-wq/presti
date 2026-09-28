export const SECTION_PROSPECTION = {
  titre: '10. Prospection des professionnels',
  paragraphes: [
    'Presti contacte des entreprises du bâtiment en tant que professionnelles pour leur proposer un site, et des entreprises qui font de la publicité dans la bibliothèque publicitaire de Meta pour leur proposer des vidéos publicitaires. Nous répondons aussi aux personnes qui nous écrivent elles-mêmes, par le formulaire « Recevoir la maquette », un commentaire ou un message. Le responsable du traitement est Benjamin Filiot (Presti), dont les coordonnées figurent à la section 1 de la politique de confidentialité.',
    'Nous utilisons la liste des entreprises RGE de l’ADEME, publiée sous Licence Ouverte, le répertoire public accessible par l’API Recherche d’entreprises, le site de l’entreprise, la bibliothèque publicitaire de Meta et les informations données par la personne. Les entreprises en diffusion partielle au répertoire sont écartées. Nous n’utilisons ni annuaire payant, ni Google Maps, ni PagesJaunes. Aucune adresse e-mail n’est relevée : nous gardons seulement celle qu’une personne nous donne en nous écrivant.',
    'Notre finalité est de proposer un service en rapport avec le métier de l’entreprise. La base légale est notre intérêt légitime. Le premier message passe par le formulaire de contact du site : un seul message par entreprise, à vie, sans relance. L’assistant IA de Presti le rédige et l’envoie ; il se présente dès sa première phrase, indique qui écrit, la source de la liste et comment refuser. Nous n’utilisons aucun formulaire protégé contre les robots. Le message ne contient aucun lien cliquable.',
    'Les réponses arrivent dans la boîte Gmail de prospection de Presti. L’assistant IA les lit et y répond seulement aux personnes qui nous ont écrit. Sur Instagram et Facebook, nous répondons seulement aux personnes qui nous ont écrit ou laissé un commentaire. Les captures qui prouvent une soumission ne montrent que le formulaire rempli, avec adresses et numéros masqués. Aucune capture n’est prise sur un site où rien n’est envoyé.',
    'Les données, y compris les preuves de soumission, sont conservées 3 ans à compter du dernier contact émanant de la personne. En cas de refus, seule une trace minimale du refus est gardée pour ne plus écrire à cette entreprise. Aucun pixel ni lien pisté n’est utilisé. La maquette offerte est privée, non indexée, et son lien expire au bout de 21 jours.',
    'Pour refuser, écrivez STOP à l’adresse indiquée dans notre message, ou répondez « STOP » à l’un de nos courriels. Le refus est appliqué en moins de 10 minutes sur tous les canaux, pour l’entreprise entière. Vous pouvez aussi écrire au responsable indiqué à la section 1. Une demande concernant vos données reçoit une réponse dans un délai d’un mois au plus.',
    'Le robot PrestiRecenseur lit au plus une page par seconde et respecte robots.txt. Pour le bloquer, ajoutez à votre fichier robots.txt les deux lignes suivantes : User-agent: PrestiRecenseur puis Disallow: /.',
  ],
  liste: [
    'Supabase héberge la base de données ; Vercel héberge l’application.',
    'Google fournit la boîte Gmail de prospection, reçoit les réponses et envoie les nôtres.',
    'Oracle Cloud fournit le serveur de fabrication à Paris : il prépare les maquettes et les sites et conserve les preuves de soumission des formulaires.',
    'GitHub sert à générer les sites commandés et à héberger cette notice.',
    'Meta traite les messages Instagram et Facebook et donne accès à sa bibliothèque publicitaire.',
    'OpenAI (Codex) classe les réponses reçues et relit le ton des messages, sans usage pour l’entraînement après désactivation de ce réglage par Presti. Le texte d’une réponse n’est envoyé à personne d’autre que ces prestataires nécessaires au traitement.',
  ],
} as const

const echapperHtml = (texte: string): string => texte.replace(/[&<>"']/g, (caractere) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[caractere] ?? caractere)

const style = 'body{font:16px/1.65 system-ui,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;color:#17212b;background:#fff}h1,h2{line-height:1.25}a{color:#155b86}li{margin:.7rem 0}footer{margin-top:2rem;border-top:1px solid #ccd;padding-top:1rem}'

export function noticeHtml(): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Notice de prospection — Presti</title><style>${style}</style></head>
<body><main><h1>Notice de confidentialité — prospection</h1>
<p>Responsable : Benjamin Filiot (Presti), 1 rue du Brouage, 17230 Marans, France. Contact : benjaminfiliot+presti@gmail.com.</p>
<h2 id="prospection">${echapperHtml(SECTION_PROSPECTION.titre)}</h2>
${SECTION_PROSPECTION.paragraphes.map((paragraphe) => `<p>${echapperHtml(paragraphe)}</p>`).join('\n')}
<h3>Qui traite les données pour nous ?</h3><ul>
${SECTION_PROSPECTION.liste.map((element) => `<li>${echapperHtml(element)}</li>`).join('\n')}
</ul></main><footer><a href="mentions-legales/">Mentions légales</a></footer></body></html>
`
}

export function mentionsHtml(): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mentions légales — Notice Presti</title><style>${style}</style></head>
<body><main><h1>Mentions légales</h1>
<p>Éditeur et directeur de la publication : Benjamin Filiot (Presti), entrepreneur individuel, SIREN 109 411 348.</p>
<p>Adresse : 1 rue du Brouage, 17230 Marans, France. Courriel : benjaminfiliot+presti@gmail.com. Téléphone : 06 30 78 16 47.</p>
<p>Hébergement de cette notice : GitHub Inc. Les données de prospection sont traitées selon la notice de confidentialité.</p>
</main><footer><a href="../">Notice de confidentialité</a></footer></body></html>
`
}
