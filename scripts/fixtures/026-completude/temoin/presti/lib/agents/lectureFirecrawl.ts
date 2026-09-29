// Témoin de 026-220 : implémentation de RÉFÉRENCE de l'adaptateur Firecrawl (jamais déployée). Elle prouve que le juge
// `scripts/juges-026-completude-qa.mjs --partie=firecrawl` sait être vert ; chaque sabotage de --preuve-echecs le rend
// rouge. Le contrat : `node scripts/juges-026-completude-qa.mjs --contrat=firecrawl`.
//
// Règles tenues : page publique seulement (ni réseau local, ni lien de compte, ni donnée personnelle) ; robots lus
// AVANT la requête, un robots inconnu annule ; borne de 1 000 crédits configurable (jamais présentée comme un solde) ;
// pas de mesure = pas de Firecrawl ; clé absente, 429, panne, quota ou page sans provenance → lecteur 026-020 ; la
// clé ne sort jamais dans le résultat.

export const PLAFOND_CAHIER = 1000
export const COUT_PAGE = 1

type Credits = { plafond: number; consommes: number | null; date: string | null; source: string | null }
type ReponseFirecrawl = { statut: number; corps: any }
type Deps = {
  cle: string | null
  firecrawl: (operation: 'scrape' | 'search', corps: Record<string, unknown>, entetes: Record<string, string>) => Promise<ReponseFirecrawl>
  robots: (url: string) => Promise<string | null>
  repli: (url: string) => Promise<any>
  credits: Credits
  horloge: { maintenant(): number }
}
type Demande = { operation: 'lire'; url: string } | { operation: 'chercher'; requete: string }

const PERSONNEL = /[\w.+-]+@[\w-]+(\.[\w-]+)+|(\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/
const COMPTE = /\/(login|connexion|compte|account|signin|sign-in|wp-admin|admin|mon-espace)(\/|$|\?)/i
const neutre = (h: string) => h.toLowerCase().replace(/^www\./, '')

function hotePublic(url: string): boolean {
  let u: URL
  try { u = new URL(url) } catch { return false }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return false
  if (u.port && !['80', '443'].includes(u.port)) return false
  const h = u.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!h.includes('.') || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false
  if (/^[\d.]+$/.test(h) || h.includes(':')) return false
  return true
}

type GroupeRobots = { agents: string[]; regles: { permet: boolean; motif: string }[] }
function robotsInterdit(texte: string, chemin: string): boolean {
  const groupes: GroupeRobots[] = []
  let courant: GroupeRobots | null = null
  for (const brut of texte.split(/\r?\n/)) {
    const m = brut.replace(/#.*$/, '').trim().match(/^([\w-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const cle = m[1].toLowerCase()
    const valeur = m[2].trim()
    if (cle === 'user-agent') {
      if (!courant || courant.regles.length) { courant = { agents: [], regles: [] }; groupes.push(courant) }
      courant.agents.push(valeur.toLowerCase())
    } else if ((cle === 'allow' || cle === 'disallow') && courant && valeur) courant.regles.push({ permet: cle === 'allow', motif: valeur })
  }
  // RFC 9309 : le groupe qui nomme l'agent l'emporte sur « * » ; la règle la plus longue gagne, Allow à égalité.
  const propres = groupes.filter((g) => g.agents.some((a) => a.includes('firecrawl')))
  const actifs = propres.length ? propres : groupes.filter((g) => g.agents.includes('*'))
  let longueur = -1
  let interdit = false
  for (const g of actifs) for (const r of g.regles) {
    if (!chemin.startsWith(r.motif.replace(/\*.*$/, '').replace(/\$$/, ''))) continue
    if (r.motif.length > longueur) { longueur = r.motif.length; interdit = !r.permet } else if (r.motif.length === longueur && r.permet) interdit = false
  }
  return interdit
}

function etatCredits(c: Credits) {
  const consommes = typeof c.consommes === 'number' ? c.consommes : null
  return { plafond: c.plafond, consommes, restant_estime: consommes === null ? 'non mesuré' : Math.max(0, c.plafond - consommes), solde_constate: 'non mesuré' }
}

function firecrawlAdmis(deps: Deps, cout: number): string | null {
  if (!deps.cle) return 'cle_absente'
  const c = deps.credits
  if (!c || typeof c.plafond !== 'number' || c.plafond > PLAFOND_CAHIER) return 'borne_depassee'
  if (typeof c.consommes !== 'number' || !c.date || !c.source) return 'mesure_absente'
  if (c.consommes + cout > c.plafond) return 'quota_epuise'
  return null
}

async function parRepli(url: string, raison: string, deps: Deps) {
  const r = await deps.repli(url)
  const horodatage = new Date(deps.horloge.maintenant()).toISOString()
  if (!r || r.refus) return { refus: `repli_${r?.refus || 'vide'}`, raison_repli: raison, horodatage }
  return {
    texte: String(r.corps ?? ''),
    url_finale: r.url_finale || url,
    methode: 'lecteur-026-020',
    horodatage,
    robots: 'autorise',
    incertain: true,
    raison_repli: raison,
    credits: etatCredits(deps.credits),
  }
}

export async function lireAvecFirecrawl(demande: Demande, deps: Deps): Promise<any> {
  const horodatage = () => new Date(deps.horloge.maintenant()).toISOString()
  if (demande.operation === 'chercher') {
    if (PERSONNEL.test(demande.requete)) return { refus: 'donnee_personnelle' }
    const pourquoi = firecrawlAdmis(deps, 2)
    if (pourquoi) return { refus: 'recherche_indisponible', raison: pourquoi }
    const r = await deps.firecrawl('search', { query: demande.requete, limit: 5 }, { authorization: `Bearer ${deps.cle}` })
    deps.credits.consommes = (deps.credits.consommes as number) + 2
    const resultats = (r.corps?.data || []).filter((x: any) => x?.url && hotePublic(x.url)).map((x: any) => ({ url: x.url, titre: x.title || '' }))
    return { resultats, methode: 'firecrawl', horodatage: horodatage(), credits: etatCredits(deps.credits) }
  }

  const url = demande.url
  if (!hotePublic(url) || COMPTE.test(new URL(url).pathname)) return { refus: 'hote' }
  if (PERSONNEL.test(decodeURIComponent(url))) return { refus: 'donnee_personnelle' }
  const u = new URL(url)
  const robots = await deps.robots(url)
  if (robots === null || robots === undefined) return { refus: 'robots_inconnu' }
  if (robotsInterdit(robots, u.pathname + u.search)) return { refus: 'robots' }

  const pourquoi = firecrawlAdmis(deps, COUT_PAGE)
  if (pourquoi) return parRepli(url, pourquoi, deps)

  let r: ReponseFirecrawl
  try {
    r = await deps.firecrawl('scrape', { url, formats: ['markdown'], onlyMainContent: true }, { authorization: `Bearer ${deps.cle}` })
  } catch {
    return parRepli(url, 'panne', deps)
  }
  if (r.statut === 429) return parRepli(url, '429', deps)
  deps.credits.consommes = (deps.credits.consommes as number) + COUT_PAGE
  if (r.statut !== 200 || !r.corps?.success) return parRepli(url, `statut_${r.statut}`, deps)
  const meta = r.corps.data?.metadata || {}
  const source = meta.sourceURL || meta.url
  if (!source) return parRepli(url, 'sans_provenance', deps)
  if (!hotePublic(source) || neutre(new URL(source).hostname) !== neutre(u.hostname)) return { refus: 'redirection' }
  const texte = String(r.corps.data?.markdown || '')
  return {
    texte,
    url_finale: source,
    methode: 'firecrawl',
    horodatage: horodatage(),
    robots: 'autorise',
    incertain: texte.trim().length < 40,
    credits: etatCredits(deps.credits),
  }
}
