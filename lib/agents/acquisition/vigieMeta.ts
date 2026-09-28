import { DOMAINES_EXCLUS, METIERS, TERMES_MARQUES } from './contrat'
import type { Annonceur, Budget, Candidat, Horloge, MagasinSocle, Recuperateur } from './contrat'

type Pub = {
  id: string
  page_id: string
  page_name: string
  ad_delivery_start_time?: string
  ad_creative_link_titles?: string[]
  ad_creative_bodies?: string[]
  ad_creative_link_captions?: string[]
  eu_total_reach?: number
}

type Deps = {
  jeton: string | null
  cible: 'artisan' | 'marque'
  magasin: MagasinSocle
  recuperer: Recuperateur
  horloge: Horloge
  echeance: number
  budget: Budget
  metiers?: string[]
  termes?: string[]
}

type Etat = 'ok' | 'en_attente_jeton' | 'budget_epuise' | 'jeton_invalide' | 'en_attente_identite' | 'limite' | 'injoignable'
type PageRetenue = { page_id: string; page_name: string; pubs: Pub[]; premiere_diffusion: string }

const ADRESSE = 'https://graph.facebook.com/v26.0/ads_archive'
const CHAMPS = 'id,page_id,page_name,ad_delivery_start_time,ad_creative_link_titles,ad_creative_bodies,ad_creative_link_captions,eu_total_reach'
const JOUR = 86_400_000

export function domaineDepuisLegendes(legendes: readonly string[] | null | undefined): string | null {
  const comptes = new Map<string, number>()
  for (const legende of legendes ?? []) {
    const domaine = String(legende ?? '').trim().toLowerCase().replace(/^www\./, '')
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domaine)) continue
    if (DOMAINES_EXCLUS.some((exclu) => domaine === exclu || domaine.endsWith(`.${exclu}`))) continue
    comptes.set(domaine, (comptes.get(domaine) ?? 0) + 1)
  }
  let meilleur: string | null = null
  let nombre = 0
  for (const [domaine, total] of comptes) {
    if (total > nombre) { meilleur = domaine; nombre = total }
  }
  return meilleur
}

export function filtrerAnnonceurs(pubs: readonly Pub[], maintenant: number): PageRetenue[] {
  const pages = new Map<string, Map<string, Pub>>()
  for (const pub of pubs) {
    if (!pub.page_id || !pub.id) continue
    if (!pages.has(pub.page_id)) pages.set(pub.page_id, new Map())
    pages.get(pub.page_id)!.set(pub.id, pub)
  }
  const retenues: PageRetenue[] = []
  for (const [page_id, parId] of pages) {
    const actives = [...parId.values()].filter((pub) => {
      const debut = Date.parse(pub.ad_delivery_start_time ?? '')
      return Number.isFinite(debut) && debut <= maintenant
    })
    if (actives.length < 3) continue
    actives.sort((a, b) => Date.parse(a.ad_delivery_start_time!) - Date.parse(b.ad_delivery_start_time!))
    const premiere_diffusion = actives[0].ad_delivery_start_time!
    if (maintenant - Date.parse(premiere_diffusion) <= 30 * JOUR) continue
    retenues.push({ page_id, page_name: actives[0].page_name, pubs: actives, premiere_diffusion })
  }
  return retenues
}

function phraseEntiere(texte: string, minimum: number, maximum: number): string | null {
  const phrase = texte.trim().match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? ''
  return phrase.length >= minimum && phrase.length <= maximum ? phrase : null
}

function premierTexte(pubs: readonly Pub[], minimum: number, maximum: number): string | null {
  for (const pub of pubs) {
    for (const titre of pub.ad_creative_link_titles ?? []) {
      const texte = titre.trim()
      if (texte.length >= minimum && texte.length <= maximum) return texte
    }
  }
  for (const pub of pubs) {
    for (const corps of pub.ad_creative_bodies ?? []) {
      const phrase = phraseEntiere(corps, minimum, maximum)
      if (phrase) return phrase
    }
  }
  return null
}

function etatErreur(statut: number, code: number | undefined): Etat {
  if (code === 190) return 'jeton_invalide'
  if (code === 1357045) return 'en_attente_identite'
  if ([4, 17, 32, 613].includes(code ?? -1)) return 'limite'
  if (statut >= 500 || statut >= 400) return 'injoignable'
  return 'ok'
}

function jourDeLAnnee(instant: number): number {
  const date = new Date(instant)
  return Math.floor((instant - Date.UTC(date.getUTCFullYear(), 0, 1)) / JOUR)
}

function prochainePage(adresse: unknown, jeton: string): string | null {
  if (typeof adresse !== 'string') return null
  try {
    const url = new URL(adresse)
    if (url.protocol !== 'https:' || url.hostname !== 'graph.facebook.com' || url.pathname !== '/v26.0/ads_archive' || url.port || url.username || url.password) return null
    url.searchParams.set('access_token', jeton)
    return url.toString()
  } catch { return null }
}

export async function executerVigie(deps: Deps): Promise<{ etat: Etat; appels?: number; annonceurs?: number; candidats?: number }> {
  const { jeton, cible, magasin, recuperer, horloge, echeance, budget } = deps
  if (!jeton?.trim()) return { etat: 'en_attente_jeton' }
  const termes = cible === 'marque' ? [...(deps.termes ?? TERMES_MARQUES)] : [...(deps.metiers ?? METIERS.map((m) => m.terme_meta))]
  if (!termes.length) return { etat: 'ok', appels: 0, annonceurs: 0, candidats: 0 }
  const depart = jourDeLAnnee(horloge.maintenant()) % termes.length
  let appels = 0
  let annonceurs = 0
  let candidats = 0

  for (let rang = 0; rang < termes.length; rang++) {
    if (horloge.maintenant() >= echeance) break
    const terme = termes[(depart + rang) % termes.length]
    const url = new URL(ADRESSE)
    url.searchParams.set('ad_reached_countries', JSON.stringify(['FR']))
    url.searchParams.set('ad_type', 'ALL')
    url.searchParams.set('ad_active_status', 'ACTIVE')
    url.searchParams.set('search_terms', terme.slice(0, 100))
    url.searchParams.set('search_type', 'KEYWORD_EXACT_PHRASE')
    url.searchParams.set('languages', JSON.stringify(['fr']))
    url.searchParams.set('fields', CHAMPS)
    url.searchParams.set('limit', '100')
    url.searchParams.set('access_token', jeton)
    let adresse: string | null = url.toString()
    const pubs: Pub[] = []
    const pagesVues = new Set<string>()

    while (adresse && horloge.maintenant() < echeance) {
      if (pagesVues.has(adresse)) break
      pagesVues.add(adresse)
      if (!(await budget.prendre(1))) return { etat: 'budget_epuise', appels, annonceurs, candidats }
      let reponse: Awaited<ReturnType<Recuperateur>>
      try { reponse = await recuperer(adresse, { delaiMs: 10_000, maxOctets: 1_000_000 }) }
      catch { return { etat: 'injoignable', appels: appels + 1, annonceurs, candidats } }
      appels++
      let corps: { data?: Pub[]; paging?: { next?: string }; error?: { code?: number } }
      try { corps = JSON.parse(reponse.corps) }
      catch { return { etat: 'injoignable', appels, annonceurs, candidats } }
      const etat = etatErreur(reponse.statut, corps.error?.code)
      if (etat !== 'ok') return { etat, appels, annonceurs, candidats }
      if (Array.isArray(corps.data)) pubs.push(...corps.data)
      adresse = prochainePage(corps.paging?.next, jeton)
    }

    const retenues = filtrerAnnonceurs(pubs, horloge.maintenant())
    const lignes: Annonceur[] = []
    const nouveaux: Candidat[] = []
    const vu_le = new Date(horloge.maintenant()).toISOString()
    for (const page of retenues) {
      const legendes = page.pubs.flatMap((pub) => pub.ad_creative_link_captions ?? [])
      const domaine = domaineDepuisLegendes(legendes)
      if (cible === 'marque' && !domaine) continue
      const extrait = premierTexte(page.pubs, 6, 120)
      const annonce = page.pubs.find((pub) => (pub.ad_creative_link_titles ?? []).includes(extrait ?? '') || (pub.ad_creative_bodies ?? []).some((corps) => corps.includes(extrait ?? '\u0000')))
      if (!extrait || !annonce) continue
      lignes.push({
        page_id: page.page_id, page_nom: page.page_name, domaine, cible, terme,
        annonces: page.pubs.map((pub) => ({ id: pub.id, textes: pub.ad_creative_bodies ?? [], titres: pub.ad_creative_link_titles ?? [], debut: pub.ad_delivery_start_time ?? null })),
        page_name: page.page_name, metier: cible === 'artisan' ? terme : null,
        nb_pubs_actives: page.pubs.length, premiere_diffusion: page.premiere_diffusion,
        eu_total_reach_max: Math.max(...page.pubs.map((pub) => pub.eu_total_reach ?? 0)), vu_le,
      } as Annonceur)
      nouveaux.push({
        cle_dedup: domaine ? `domaine:${domaine}` : `page_meta:${page.page_id}`,
        source: 'meta', cible, domaine, page_meta: page.page_id, entreprise: page.page_name,
        metier: cible === 'artisan' ? terme : null, produit: cible === 'marque' ? premierTexte(page.pubs, 3, 60) : null,
        froid: true,
        faits: [{ id: annonce.id, type: 'pub_meta', extrait, url: `https://www.facebook.com/ads/library/?id=${encodeURIComponent(annonce.id)}`, lu_le: vu_le, annonce_id: annonce.id, page_id: page.page_id }],
        canaux: [{ canal: 'facebook', valeur: `https://www.facebook.com/${encodeURIComponent(page.page_id)}`, url_source: `https://www.facebook.com/ads/library/?id=${encodeURIComponent(annonce.id)}` }],
      })
    }
    if (lignes.length) { annonceurs += await magasin.enregistrerAnnonceurs(lignes); const r = await magasin.enregistrerCandidats(nouveaux); candidats += r.ajoutes }
  }
  return { etat: 'ok', appels, annonceurs, candidats }
}
