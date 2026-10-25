/** Retour local autorisé après la création du profil : la commande de site, ou le paiement d'une offre précise (« s'abonner directement » de l'accueil). */
export function suiteSure(brut: string | null | undefined): string {
  // Le paiement d'une offre : exactement /abonnement?offre=<offre payante>, rien d'autre (16/10). L'Essentiel n'est plus vendu (25/10).
  if (typeof brut === 'string' && /^\/abonnement\?offre=(studio|signature)$/.test(brut)) return brut
  if (typeof brut !== 'string' || !brut.startsWith('/site/commander')) return '/outils'
  if (brut.includes('//') || brut.includes('\\') || brut.includes(':') || /[\r\n]/.test(brut)) return '/outils'
  return brut
}
