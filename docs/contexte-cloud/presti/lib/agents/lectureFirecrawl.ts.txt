// Adaptateur borné : les fonctions d'accès sont injectées par l'appelant ; aucun secret n'est lu ici.

export const PLAFOND_CAHIER = 1000
export const COUT_PAGE = 1

type Credits = { plafond: number; consommes: number | null; date: string | null; source: string | null }
type ReponseFirecrawl = { statut: number; corps: any }
type Deps = {
  cle: string | null
  firecrawl: (operation: 'scrape' | 'search', corps: Record<string, unknown>, entetes: Record<string, string>) => Promise<ReponseFirecrawl>
  robots: (url: string) => Promise<string | null>
  // Si des conditions propres au site sont connues, un verdict inconnu ferme l'accès.
  conditions?: (url: string) => Promise<'autorise' | 'interdit' | 'inconnu'>
  repli: (url: string) => Promise<any>
  credits: Credits
  horloge: { maintenant(): number }
}
type Demande = { operation: 'lire'; url: string } | { operation: 'chercher'; requete: string }

const PERSONNEL = /[\w.+-]+(?:@|%40)[\w-]+(?:\.|%2e)[\w.-]+|(\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}|(?:%2b33|0033)[\s\d.%+-]{8,}/i
const COMPTE = /\/(login|connexion|compte|account|signin|sign-in|wp-admin|admin|mon-espace|espace-client|dashboard|profil|checkout|panier)(\/|$|\?)/i
const neutre = (h: string) => h.toLowerCase().replace(/^www\./, '')
const donneesPersonnelles = (s: string) => {
  try { return PERSONNEL.test(decodeURIComponent(s)) } catch { return true }
}

function hotePublic(url: string): boolean {
  let u: URL
  try { u = new URL(url) } catch { return false }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return false
  if (u.port && !['80', '443'].includes(u.port)) return false
  const h = u.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!h.includes('.') || h === 'localhost' || ['.localhost', '.local', '.internal', '.test', '.home', '.lan'].some((fin) => h.endsWith(fin))) return false
  if (/^[\d.]+$/.test(h) || h.includes(':') || /^0x[\da-f]+$/i.test(h) || /^\d+$/.test(h)) return false
  if (u.hash) return false
  return true
}

function pageAdmise(url: string): boolean {
  if (!hotePublic(url) || donneesPersonnelles(url)) return false
  const u = new URL(url)
  return !COMPTE.test(u.pathname) && !COMPTE.test(u.search)
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
  if (!c || !Number.isSafeInteger(c.plafond) || c.plafond < 1 || c.plafond > PLAFOND_CAHIER) return 'borne_depassee'
  if (typeof c.consommes !== 'number' || !c.date || !c.source) return 'mesure_absente'
  const maintenant = deps.horloge.maintenant()
  const mesure = Date.parse(c.date)
  if (!Number.isSafeInteger(c.consommes) || c.consommes < 0 || !Number.isFinite(mesure) || mesure > maintenant || maintenant - mesure > 86_400_000 || !c.source.trim()) return 'mesure_absente'
  if (c.consommes + cout > c.plafond) return 'quota_epuise'
  return null
}

async function parRepli(url: string, raison: string, deps: Deps) {
  const horodatage = new Date(deps.horloge.maintenant()).toISOString()
  let r: Awaited<ReturnType<Deps['repli']>>
  try { r = await deps.repli(url) } catch { return { refus: 'repli_panne', raison_repli: raison, horodatage } }
  if (!r || r.refus) return { refus: `repli_${r?.refus || 'vide'}`, raison_repli: raison, horodatage }
  const source = r.url_finale
  if (typeof source !== 'string' || !pageAdmise(source) || neutre(new URL(source).hostname) !== neutre(new URL(url).hostname)) return { refus: 'repli_provenance', raison_repli: raison, horodatage }
  if (r.statut !== 200 || typeof r.corps !== 'string' || !r.corps.trim()) return { refus: 'repli_page_inutilisable', raison_repli: raison, horodatage }
  return {
    texte: r.corps,
    url_finale: source,
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
    if (donneesPersonnelles(demande.requete)) return { refus: 'donnee_personnelle' }
    if (!demande.requete.trim() || demande.requete.length > 160 || /https?:\/\/|\b(?:login|connexion|compte|account|signin|admin)\b/i.test(demande.requete)) return { refus: 'recherche_non_bornee' }
    const pourquoi = firecrawlAdmis(deps, 2)
    if (pourquoi) return { refus: 'recherche_indisponible', raison: pourquoi }
    let r: ReponseFirecrawl
    try { r = await deps.firecrawl('search', { query: demande.requete, limit: 5 }, { authorization: `Bearer ${deps.cle}` }) }
    catch { return { refus: 'recherche_indisponible', raison: 'panne' } }
    if (r.statut === 429) return { refus: 'recherche_indisponible', raison: '429' }
    deps.credits.consommes = (deps.credits.consommes as number) + 2
    if (r.statut !== 200 || !r.corps?.success || !Array.isArray(r.corps?.data)) return { refus: 'recherche_indisponible', raison: 'reponse_inutilisable' }
    const resultats = r.corps.data.slice(0, 5).filter((x: any) => typeof x?.url === 'string' && pageAdmise(x.url)).map((x: any) => ({ url: x.url, titre: typeof x.title === 'string' && !donneesPersonnelles(x.title) ? x.title.slice(0, 160) : '' }))
    return { resultats, methode: 'firecrawl', horodatage: horodatage(), credits: etatCredits(deps.credits) }
  }

  const url = demande.url
  if (!hotePublic(url) || COMPTE.test(new URL(url).pathname)) return { refus: 'hote' }
  if (donneesPersonnelles(url)) return { refus: 'donnee_personnelle' }
  const u = new URL(url)
  let robots: string | null
  try { robots = await deps.robots(url) } catch { return { refus: 'robots_inconnu' } }
  if (robots === null || robots === undefined) return { refus: 'robots_inconnu' }
  if (robotsInterdit(robots, u.pathname + u.search)) return { refus: 'robots' }
  if (deps.conditions) {
    let conditions: 'autorise' | 'interdit' | 'inconnu'
    try { conditions = await deps.conditions(url) } catch { return { refus: 'conditions_inconnues' } }
    if (conditions !== 'autorise') return { refus: conditions === 'interdit' ? 'conditions' : 'conditions_inconnues' }
  }

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
  if (!pageAdmise(source) || neutre(new URL(source).hostname) !== neutre(u.hostname)) return { refus: 'redirection' }
  if (robotsInterdit(robots, new URL(source).pathname + new URL(source).search)) return { refus: 'robots_redirection' }
  const texte = String(r.corps.data?.markdown || '')
  if (!texte.trim() || donneesPersonnelles(texte)) return parRepli(url, 'page_inutilisable', deps)
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
