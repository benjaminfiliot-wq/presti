// Texte transactionnel pur : les adresses signées sont fournies par la route, jamais construites ici.
export const DUREE_LIEN_S = 2592000
export const DUREE_APERCU_S = 600
export const FICHIERS_PACK = [
  'video-1.mp4', 'video-2.mp4', 'video-3.mp4',
  'visuel-1.jpg', 'visuel-2.jpg', 'visuel-3.jpg',
  'textes.md', 'fiche-10-min.md',
] as const

type Entree = {
  nom: string
  liens: { fichier: string; url: string }[]
  expireLe: string
  voixSynthese: boolean
}

function composer(entree: Entree): { sujet: string; texte: string } {
  const date = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(entree.expireLe))
  const nom = entree.nom.replace(/[\r\n<>]/g, '').trim()
  const lignes = entree.liens.map(({ fichier, url }) => `${fichier} : ${url}`)
  return {
    sujet: 'Vos pubs locales sont prêtes',
    texte: [
      `Bonjour ${nom || 'à vous'},`,
      '',
      'Vos pubs locales sont prêtes. Ouvrez d’abord fiche-10-min.md (« lancer la pub en 10 min ») avant les autres fichiers.',
      '',
      ...lignes,
      '',
      `Ces liens expirent le ${date} (heure de Paris).`,
      ...(entree.voixSynthese ? ['Gardez la mention « Voix générée par IA » à l’écran : elle est obligatoire.'] : []),
      'Une retouche est comprise dans les 30 jours : répondez à ce courriel pour la demander.',
      '',
      'L’équipe Presti',
    ].join('\n'),
  }
}

export function courrielLivraison(entree: Entree): { sujet: string; texte: string }
// Compatibilité avec les anciens appels qui passaient un dictionnaire de liens et attendaient le texte seul.
export function courrielLivraison(entree: Omit<Entree, 'liens'> & { liens: Record<string, string> }): string
export function courrielLivraison(entree: Omit<Entree, 'liens'> & { liens: Entree['liens'] | Record<string, string> }): { sujet: string; texte: string } | string {
  if (Array.isArray(entree.liens)) return composer({ ...entree, liens: entree.liens })
  return composer({ ...entree, liens: Object.entries(entree.liens).map(([fichier, url]) => ({ fichier, url })) }).texte
}
