/** Retour local autorisé après la création du profil. */
export function suiteSure(brut: string | null | undefined): string {
  if (typeof brut !== 'string' || !brut.startsWith('/site/commander')) return '/outils'
  if (brut.includes('//') || brut.includes('\\') || brut.includes(':') || /[\r\n]/.test(brut)) return '/outils'
  return brut
}
