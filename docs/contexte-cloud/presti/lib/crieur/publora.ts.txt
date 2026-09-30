const BASE = 'https://api.publora.com/api/v1'

async function appeler(chemin: string, options: RequestInit, fetchImpl: typeof fetch) {
  const cle = process.env.PUBLORA_API_KEY
  if (!cle) throw new Error('PUBLORA_API_KEY absente des variables Vercel')
  const reponse = await fetchImpl(`${BASE}${chemin}`, {
    ...options,
    headers: { 'content-type': 'application/json', 'x-publora-key': cle },
    signal: AbortSignal.timeout(10_000),
  })
  if (!reponse.ok) throw new Error(`Publora : HTTP ${reponse.status}`)
  return reponse.json()
}

export async function connexions(fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const resultat = await appeler('/platform-connections', { method: 'GET' }, fetchImpl)
  if (!Array.isArray(resultat.connections)) throw new Error('Publora : connexions illisibles')
  return resultat.connections
    .filter((c: { platformId?: unknown; tokenStatus?: string }) => typeof c.platformId === 'string' && /^(linkedin|facebook|instagram)-/.test(c.platformId))
    .map((c: { platformId: string }) => c.platformId)
}

type Brouillon = { contenu: string; plateformes: string[]; medias?: string[]; scheduledTime?: never; programmeePour?: never }

/** R24 : un brouillon attend le geste de Benj dans Publora, sans aucune programmation. */
export async function creerPublication(publication: Brouillon, fetchImpl: typeof fetch = fetch): Promise<string> {
  if ('scheduledTime' in publication || 'programmeePour' in publication) throw new Error('Crieur : programmation interdite, brouillon uniquement')
  if (!publication.contenu.trim() || !publication.plateformes.length) throw new Error('Publora : contenu et plateforme obligatoires')
  if (publication.plateformes.some((p) => !/^(linkedin|facebook|instagram)-/.test(p))) throw new Error('Publora : plateforme inconnue')
  const instagram = publication.plateformes.some((p) => p.startsWith('instagram-'))
  if (instagram && (!publication.medias?.length || publication.medias.some((m) => !/^https:\/\/prestiapp\.fr\/api\/crieur\/visuel\/[a-z0-9-]+\.png$/.test(m)))) throw new Error('Publora : visuel Instagram invalide')
  if (!instagram && publication.medias?.length) throw new Error('Publora : média réservé à Instagram')
  const corps = { content: publication.contenu, platforms: publication.plateformes, ...(instagram ? { mediaUrls: publication.medias } : {}) }
  const resultat = await appeler('/create-post', { method: 'POST', body: JSON.stringify(corps) }, fetchImpl)
  if (resultat.success !== true || typeof resultat.postGroupId !== 'string' || !resultat.postGroupId) throw new Error('Publora : création du brouillon refusée')
  return resultat.postGroupId
}
