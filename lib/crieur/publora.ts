const BASE = 'https://api.publora.com/api/v1'

/** La pause retire la programmation, sans effacer le contenu ni publier quoi que ce soit.
 * Contrat vérifié : https://docs.publora.com/guides/update-scheduled-post (01/10/2026).
 * Un état déjà en cours de publication est un échec déclaré, jamais une suspension fictive.
 */
export async function suspendrePublication(id: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new Error('Publora : identifiant de publication invalide')
  const resultat = await appeler(`/update-post/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify({ status: 'draft' }),
  }, fetchImpl)
  if (resultat.success !== true || resultat.postGroup?.status !== 'draft') {
    throw new Error('Publora : suspension non confirmée')
  }
}

async function appeler(chemin: string, options: RequestInit, fetchImpl: typeof fetch) {
  const cle = process.env.PUBLORA_API_KEY
  if (!cle) throw new Error('PUBLORA_API_KEY absente des variables Vercel')
  const reponse = await fetchImpl(`${BASE}${chemin}`, {
    ...options,
    headers: { 'content-type': 'application/json', 'x-publora-key': cle, ...options.headers },
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

/** Dépôt en brouillon avant la programmation automatique séparée et contrôlée (30/09). */
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

/** Programmation séparée du dépôt : chaque réponse doit confirmer le créneau futur exact.
 * La clé stable provient de la réservation unique en base ; aucun coût inconnu/positif n'est accepté. */
export async function programmerPublication(id: string, programmeePour: string, cle: string, coutEuros: unknown, fetchImpl: typeof fetch = fetch, maintenant: Date = new Date()): Promise<void> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new Error('Publora : identifiant de publication invalide')
  if (coutEuros !== 0) throw new Error('Crieur : coût inconnu ou positif, programmation refusée')
  if (!/^crieur-[a-zA-Z0-9_-]{1,120}$/.test(cle)) throw new Error('Crieur : clé idempotente invalide')
  const date = Date.parse(programmeePour)
  if (!Number.isFinite(date) || date <= maintenant.getTime()) throw new Error('Crieur : créneau futur obligatoire')
  const iso = new Date(date).toISOString()
  const resultat = await appeler(`/update-post/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'Idempotency-Key': cle }, body: JSON.stringify({ status: 'scheduled', scheduledTime: iso }),
  }, fetchImpl)
  if (resultat.success !== true || resultat.postGroup?.status !== 'scheduled' || Date.parse(resultat.postGroup?.scheduledTime) !== date) throw new Error('Publora : programmation non confirmée')
}
