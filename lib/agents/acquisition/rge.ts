import { DOMAINES_EXCLUS, UA_RECENSEUR } from './contrat'
import type { DepsReseau } from './contrat'
import { sirenValide } from '@/lib/facturation'

interface LigneRge {
  siret?: string
  site_internet?: string | null
  code_postal?: string | null
  commune?: string | null
  domaine?: string | null
  nom_qualification?: string | null
}
interface CandidatRge {
  source: 'ademe_rge'
  cible: 'artisan'
  siren: string
  domaine: string
  metier: string | null
  commune: string | null
  departement: string | null
}
type ResultatImport = { candidats: CandidatRge[]; curseur_suivant: string | null; fini: boolean } | { refus: 'injoignable' }

/**
 * 05/10 : les 513 premiers sites importés étaient des architectes, tous rejetés (« hors bâtiment ») : des passes perdues.
 * La liste RGE mêle artisans, architectes, bureaux d'études et audits ; l'import ne garde que les lignes de travaux.
 * Le curseur `after` reste valable d'une requête filtrée à l'autre (vérifié sur l'API ADEME).
 */
const QS_METIERS = 'NOT domaine:"Architecte" AND NOT domaine:Etude* AND NOT domaine:Audit* AND NOT domaine:Commisionnement'

function domaineDe(site: string | null | undefined): string | null {
  if (!site?.trim()) return null
  try {
    const url = new URL(/^https?:\/\//i.test(site.trim()) ? site.trim() : `https://${site.trim()}`)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const domaine = url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '')
    if (!domaine.includes('.') || DOMAINES_EXCLUS.some((exclu) => domaine === exclu || domaine.endsWith(`.${exclu}`))) return null
    return domaine
  } catch {
    return null
  }
}

function departement(codePostal: string | null | undefined): string | null {
  if (!codePostal || !/^\d{5}$/.test(codePostal)) return null
  if (/^97\d/.test(codePostal)) return codePostal.slice(0, 3)
  const debut = Number(codePostal.slice(0, 3))
  if (debut >= 200 && debut <= 201) return '2A'
  if (debut >= 202 && debut <= 206) return '2B'
  return codePostal.slice(0, 2)
}

function metierDe(ligne: LigneRge): string | null {
  const qualification = (ligne.nom_qualification ?? '').toLowerCase()
  if (/installation sanitaire|plomberie/.test(qualification)) return 'plombier'
  const domaine = (ligne.domaine ?? '').toLowerCase()
  if (/menuiserie/.test(domaine)) return 'menuisier'
  if (/électricité|electricite/.test(domaine)) return 'electricien'
  if (/couverture/.test(domaine)) return 'couvreur'
  return null
}

function curseurDe(next: unknown): string | null {
  if (typeof next !== 'string' || !next) return null
  try { return new URL(next).searchParams.get('after') } catch { return null }
}

export async function importerRge(
  { recuperer, horloge, curseur = null, limite = 1000 }: DepsReseau & { curseur?: string | null; limite?: number },
): Promise<ResultatImport> {
  const candidats: CandidatRge[] = []
  const domaines = new Set<string>()
  const sirens = new Set<string>()
  let suivant = curseur
  let lus = 0
  let dernierAppel: number | null = null
  const plafond = Math.max(0, Math.floor(limite))
  if (plafond === 0) return { candidats, curseur_suivant: suivant, fini: false }

  while (lus < plafond) {
    const url = new URL('https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines')
    url.searchParams.set('size', String(Math.min(1000, plafond - lus)))
    url.searchParams.set('qs', QS_METIERS)
    if (suivant) url.searchParams.set('after', suivant)
    try {
      const maintenant = horloge.maintenant()
      if (dernierAppel !== null && maintenant - dernierAppel < 500) await horloge.attendre(500 - (maintenant - dernierAppel))
      dernierAppel = horloge.maintenant()
      const page = await recuperer(url.toString(), { entetes: { 'user-agent': UA_RECENSEUR } })
      if (page.statut < 200 || page.statut >= 300) return { refus: 'injoignable' }
      const reponse: unknown = JSON.parse(page.corps)
      if (!reponse || typeof reponse !== 'object' || !('results' in reponse) || !Array.isArray(reponse.results)) return { refus: 'injoignable' }
      const lignes = reponse.results as LigneRge[]
      for (const ligne of lignes.slice(0, plafond - lus)) {
        lus++
        const domaine = domaineDe(ligne.site_internet)
        const siret = ligne.siret ?? ''
        if (!domaine || !/^\d{14}$/.test(siret) || !sirenValide(siret)) continue
        const siren = siret.slice(0, 9)
        if (!sirenValide(siren) || domaines.has(domaine) || sirens.has(siren)) continue
        domaines.add(domaine)
        sirens.add(siren)
        candidats.push({
          source: 'ademe_rge', cible: 'artisan', siren, domaine,
          metier: metierDe(ligne), commune: ligne.commune ?? null,
          departement: departement(ligne.code_postal),
        })
      }
      const prochain = curseurDe('next' in reponse ? reponse.next : null)
      if (!prochain || lignes.length === 0) return { candidats, curseur_suivant: null, fini: true }
      if (prochain === suivant) return { refus: 'injoignable' }
      suivant = prochain
    } catch {
      return { refus: 'injoignable' }
    }
  }
  return { candidats, curseur_suivant: suivant, fini: false }
}
