/** Client à portée étroite : les quatre seuls gestes de l'Atelier. */
export function magasinUsine(base: string, jeton: string) {
  const racine = new URL('/api/usine/atelier/', base).toString()
  async function appel(route: 'travail' | 'depot' | 'maquette' | 'lien', corps?: object) {
    const reponse = await fetch(new URL(route, racine), {
      method: corps ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${jeton}`, ...(corps ? { 'Content-Type': 'application/json' } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    })
    if (!reponse.ok) throw new Error(`atelier ${route} : HTTP ${reponse.status}`)
    return reponse.json()
  }
  return {
    travail: () => appel('travail'),
    async deposer(prospectId: string, fichier: string, octets: Uint8Array) {
      const { url, objet, token } = await appel('depot', { prospect_id: prospectId, fichier })
      if (typeof url !== 'string' || typeof objet !== 'string') throw new Error('adresse de dépôt absente')
      const reponse = await fetch(url, {
        method: 'PUT', headers: { 'Content-Type': fichier.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg', ...(token ? { 'x-upsert': 'false' } : {}) },
        body: Buffer.from(octets), signal: AbortSignal.timeout(30_000),
      })
      if (!reponse.ok) throw new Error(`dépôt : HTTP ${reponse.status}`)
      return objet
    },
    maquettePrete: (prospectId: string, objets: Record<string, string>, empreintes: Record<string, string>) => appel('maquette', { prospect_id: prospectId, objets, empreintes }),
    demanderLien: (prospectId: string) => appel('lien', { prospect_id: prospectId }),
  }
}
export const travail = (base: string, jeton: string) => magasinUsine(base, jeton).travail()
export const deposer = (base: string, jeton: string, prospectId: string, fichier: string, octets: Uint8Array) => magasinUsine(base, jeton).deposer(prospectId, fichier, octets)
export const maquettePrete = (base: string, jeton: string, prospectId: string, objets: Record<string, string>, empreintes: Record<string, string>) => magasinUsine(base, jeton).maquettePrete(prospectId, objets, empreintes)
export const demanderLien = (base: string, jeton: string, prospectId: string) => magasinUsine(base, jeton).demanderLien(prospectId)
