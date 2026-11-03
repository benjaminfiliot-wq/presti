// Calendrier public de la DINUM : aucune donnée de compte ne sort de Presti.
// Une réponse absente ou illisible reste inconnue : les relances attendent le prochain passage.
export const SOURCE_JOURS_FERIES = 'https://calendrier.api.gouv.fr/jours-feries/metropole.json'
export const DELAI_JOURS_FERIES_MS = 1800

export type JourFerie = { etat: 'ferie'; nom: string } | { etat: 'ouvre' } | { etat: 'inconnu' }

export async function jourFerieMetropole(jour: string, lire: typeof fetch = fetch): Promise<JourFerie> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return { etat: 'inconnu' }
  try {
    const reponse = await lire(SOURCE_JOURS_FERIES, { signal: AbortSignal.timeout(DELAI_JOURS_FERIES_MS), headers: { accept: 'application/json' } })
    if (!reponse.ok) return { etat: 'inconnu' }
    const brut: unknown = await reponse.json()
    if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return { etat: 'inconnu' }
    const jours = brut as Record<string, unknown>
    // La présence d'autres dates de l'année prouve que la réponse couvre bien l'année demandée.
    if (!Object.keys(jours).some((cle) => cle.startsWith(jour.slice(0, 4) + '-') && /^\d{4}-\d{2}-\d{2}$/.test(cle))) return { etat: 'inconnu' }
    if (!Object.prototype.hasOwnProperty.call(jours, jour)) return { etat: 'ouvre' }
    const nom = jours[jour]
    return typeof nom === 'string' && nom.length <= 80 ? { etat: 'ferie', nom } : { etat: 'inconnu' }
  } catch {
    return { etat: 'inconnu' }
  }
}
