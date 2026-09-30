import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { DOMAINES_EXCLUS, DOMAINES_TIERS, EXTRAIT_MAX, EXTRAIT_MIN, UA_RECENSEUR, RAISONS_ABANDON, TECHNOLOGIES_FORMULAIRE } from './contrat'
import type { Fait, Formulaire, Horloge, LectureSite, PageRecue, RaisonAbandon, Recuperateur, ReseauLu, VerdictFormulaire } from './contrat'

type Deps = { recuperer: Recuperateur; horloge: Horloge; echeance?: number }
type OptionsReseau = { entetes?: Record<string,string>; delaiMs?: number; maxOctets?: number }
type ReponsePolie = ({ refus: string } | PageRecue) & { robots?: string }
const LIMITE = 1024 * 1024
const agent = 'PrestiRecenseur'
const refuse = (raison: RaisonAbandon): VerdictFormulaire => ({ eligible: false, raison })
const neutre = (h: string) => h.toLowerCase().replace(/^www\./, '')
const memeDomaine = (a: string, b: string) => neutre(a) === neutre(b)

function ipPublique(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a,b] = ip.split('.').map(Number)
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127 || a === 192 && b === 0 || a === 198 && (b === 18 || b === 19))
  }
  if (isIP(ip) === 6) {
    const s = ip.toLowerCase()
    if (s.includes('.')) { const v = s.slice(s.lastIndexOf(':') + 1); if (isIP(v) === 4) return ipPublique(v) }
    return !(s === '::' || s === '::1' || /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || /^::ffff:/.test(s))
  }
  return false
}
export function hoteAutorise(url: string, ips: string[]): boolean {
  try {
    const u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || (u.port && !['80','443'].includes(u.port))) return false
    const h = u.hostname.replace(/^\[|\]$/g, '').toLowerCase()
    if (!h || h === 'localhost' || h.endsWith('.localhost') || isIP(h) || /^0x[\da-f]+$/i.test(h) || /^\d+$/.test(h) || /^\d+(?:\.\d+){1,3}$/.test(h)) return false
    return ips.length > 0 && ips.every(ipPublique)
  } catch { return false }
}
export function robotsAutorise(texte: string, ua: string, chemin: string): boolean {
  const groupes: { agents: string[]; regles: { permet: boolean; motif: string }[] }[] = []
  let courant: typeof groupes[number] | null = null
  for (const ligne of texte.split(/\r?\n/)) {
    if (!ligne.trim()) { courant = null; continue }
    const m = ligne.replace(/#.*$/, '').match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/)
    if (!m) continue
    const cle = m[1].toLowerCase(), valeur = m[2]
    if (cle === 'user-agent') {
      if (!courant || courant.regles.length) { courant = { agents: [], regles: [] }; groupes.push(courant) }
      courant.agents.push(valeur.toLowerCase())
    } else if ((cle === 'allow' || cle === 'disallow') && courant && valeur) courant.regles.push({ permet: cle === 'allow', motif: valeur })
  }
  const nom = ua.toLowerCase().split('/')[0]
  const specifiques = groupes.filter(g => g.agents.some(a => a !== '*' && nom.includes(a)))
  const actives = specifiques.length ? specifiques : groupes.filter(g => g.agents.includes('*'))
  let longueur = -1, permet = true
  for (const g of actives) for (const r of g.regles) {
    const re = '^' + r.motif.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\\\$$/, '$').replace(/\*/g, '.*')
    try { if (new RegExp(re).test(chemin)) {
      const n = r.motif.replace(/[\*$]/g, '').length
      if (n > longueur || n === longueur && r.permet) { longueur = n; permet = r.permet }
    } } catch { /* règle incorrecte */ }
  }
  return permet
}

const entete = (p: PageRecue, nom: string) => Object.entries(p.entetes || {}).find(([k]) => k.toLowerCase() === nom)?.[1] || ''
const etats = new WeakMap<Deps, { robots: Map<string, string | null>; dernier: Map<string, number>; origine: string; echecsRobots: Set<string> }>()
async function demander(url: string, deps: Deps): Promise<PageRecue> {
  const etat = etats.get(deps)!
  const h = new URL(url).hostname
  const precedent = etat.dernier.get(h)
  if (precedent !== undefined) await deps.horloge.attendre(Math.max(0, 1000 - (deps.horloge.maintenant() - precedent)))
  if (deps.echeance && deps.horloge.maintenant() >= deps.echeance) throw new Error('echeance')
  etat.dernier.set(h, deps.horloge.maintenant())
  return deps.recuperer(url, { entetes: { 'user-agent': UA_RECENSEUR }, delaiMs: 8000, maxOctets: LIMITE })
}
async function ipsDe(h: string): Promise<string[]> {
  const dns = await import('node:dns/promises')
  return (await dns.lookup(h, { all: true, verbatim: true })).map(x => x.address)
}
async function sur(href: string, deps: Deps): Promise<boolean> {
  if (deps.recuperer !== recuperateurReseau) return hoteAutorise(href, ['93.184.216.34'])
  try { return hoteAutorise(href, await ipsDe(new URL(href).hostname)) } catch { return false }
}
async function robotsPour(url: string, deps: Deps): Promise<string | null> {
  const etat = etats.get(deps)!
  const h = new URL(url).hostname
  if (etat.robots.has(h)) return etat.robots.get(h)!
  etat.robots.set(h, null)
  try {
    const r = await demander(new URL('/robots.txt', url).href, deps)
    const texte = r.statut >= 400 && r.statut < 500 ? '' : r.statut >= 500 ? null : r.corps
    etat.robots.set(h, texte)
    return texte
  } catch { etat.echecsRobots.add(h); return null }
}
export async function recupererPoli(url: string, deps: Deps): Promise<ReponsePolie> {
  if (!etats.has(deps)) etats.set(deps, { robots: new Map(), dernier: new Map(), origine: new URL(url).hostname, echecsRobots: new Set() })
  const etat = etats.get(deps)!
  for (let i = 0; i <= 3; i++) {
    let u: URL
    try { u = new URL(url) } catch { return { refus: 'hote' } }
    if (!memeDomaine(u.hostname, etat.origine) || !await sur(url, deps)) return { refus: 'hote' }
    const robots = await robotsPour(url, deps)
    if (robots === null || !robotsAutorise(robots, agent, u.pathname + u.search)) return { refus: 'robots_txt' }
    let p: PageRecue
    try { p = await demander(url, deps) } catch { return { refus: 'injoignable' } }
    if (p.statut >= 300 && p.statut < 400 && entete(p, 'location')) {
      if (i === 3) return { refus: 'redirections' }
      try { url = new URL(entete(p, 'location'), url).href } catch { return { refus: 'redirections' } }
      continue
    }
    if (p.tronque || Buffer.byteLength(p.corps || '') > LIMITE) return { refus: 'trop_gros' }
    if (p.statut === 200 && !/^text\/html\b/i.test(entete(p, 'content-type'))) return { refus: 'type' }
    return { ...p, robots }
  }
  return { refus: 'redirections' }
}

export function recuperateurReseau(url: string, options: OptionsReseau): Promise<PageRecue> { return (async () => {
  const controleur = new AbortController()
  const minuterie = setTimeout(() => controleur.abort(), Math.min(options.delaiMs || 8000, 8000))
  try {
    if (!hoteAutorise(url, await ipsDe(new URL(url).hostname))) throw new Error('hote')
    const r = await fetch(url, { redirect: 'manual', headers: options.entetes, signal: controleur.signal, credentials: 'omit' })
    const max = options.maxOctets || LIMITE
    const morceaux: Uint8Array[] = []
    let taille = 0, tronque = false
    if (r.body) { const lecteur = r.body.getReader(); while (true) { const suivant = await lecteur.read(); if (suivant.done) break; const bloc = suivant.value; taille += bloc.length; if (taille > max) { tronque = true; await lecteur.cancel(); break }; morceaux.push(bloc) } }
    return { statut: r.status, entetes: Object.fromEntries(r.headers), corps: Buffer.concat(morceaux).toString('utf8'), url_finale: url, tronque }
  } finally { clearTimeout(minuterie) }
  })() }

const nettoyer = (s: string) => s.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
const decoder = (s: string) => s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|copy);?/gi, (tout, x: string) => {
  const n = x.toLowerCase()
  if (n.startsWith('#')) { const v = Number.parseInt(n.slice(n[1] === 'x' ? 2 : 1), n[1] === 'x' ? 16 : 10); return v > 0 && v <= 0x10ffff ? String.fromCodePoint(v) : tout }
  return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©' } as Record<string,string>)[n] || tout
})
const visible = (s: string) => decoder(nettoyer(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
const attribut = (s: string, nom: string) => { const m = s.match(new RegExp('(?:^|\\s)' + nom + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i')); return decoder(m?.[1] ?? m?.[2] ?? m?.[3] ?? '') }
const present = (s: string, nom: string) => new RegExp('(?:^|\\s)' + nom + '(?:\\s|=|>|$)', 'i').test(s)
const sansAdresse = (s: string) => s.replace(/\b[^\s<>]+@[^\s<>]+/g, '[masqué]')
function fait(type: Fait['type'], extrait: string, url: string, date: string): Fait | null {
  if (!extrait || extrait.length < EXTRAIT_MIN || extrait.length > EXTRAIT_MAX) return null
  return { id: createHash('sha256').update(url + type + extrait).digest('hex').slice(0,16), type, extrait, url, lu_le: date }
}
const luhn = (s: string) => { let somme = 0; for (let i = s.length - 1, j = 0; i >= 0; i--, j++) { let n = Number(s[i]); if (j % 2) { n *= 2; if (n > 9) n -= 9 } somme += n } return somme % 10 === 0 }
export function extraire(html: string, url: string, date = new Date().toISOString()): { faits: Fait[]; siren: string | null; reseaux: ReseauLu[] } {
  const propre = nettoyer(html), faits: Fait[] = [], reseaux: ReseauLu[] = []
  for (const [balise, type, limite] of [['title','site_titre',1], ['h1','site_h1',1], ['h2','site_intertitre',3]] as const) {
    const matches = [...propre.matchAll(new RegExp(`<${balise}\\b[^>]*>([\\s\\S]*?)<\\/${balise}>`, 'gi'))].slice(0,limite)
    for (const m of matches) { const f = fait(type, sansAdresse(visible(m[1])), url, date); if (f) faits.push(f) }
  }
  let siren: string | null = null
  if (/mentions|legal/i.test(new URL(url).pathname)) {
    const texte = visible(propre), numeros = new Set<string>()
    for (const m of texte.matchAll(/\b(?:SIREN|SIRET|RCS)\b[^\d]{0,40}((?:\d[\s.]*){9,14})/gi)) {
      const chiffres = m[1].replace(/\D/g,'')
      const n = chiffres.slice(0,9)
      if (n.length === 9 && luhn(n)) numeros.add(n)
    }
    if (numeros.size === 1) siren = [...numeros][0]
  }
  for (const m of propre.matchAll(/<a\b([^>]*)>/gi)) {
    const lien = attribut(m[1], 'href')
    let u: URL
    try { u = new URL(lien) } catch { continue }
    const h = neutre(u.hostname), compte = u.pathname.split('/').filter(Boolean)[0]
    if (!compte) continue
    const reseau = h === 'instagram.com' ? 'instagram' : h === 'facebook.com' ? 'facebook' : null
    if (!reseau || !/^[A-Za-z0-9._]{1,30}$/.test(compte)) continue
    if (reseau === 'instagram' && /^(p|reel|explore|accounts)$/i.test(compte) || reseau === 'facebook' && /^(sharer|sharer.php|dialog|plugins)$/i.test(compte)) continue
    reseaux.push({ reseau, compte, url: u.href, url_source: url })
  }
  return { faits, siren, reseaux }
}
function technologie(html: string, form: string): Formulaire['technologie'] {
  const x = (html + ' ' + form).toLowerCase()
  if (/wpcf7/.test(x)) return 'contact_form_7'
  if (/wpforms/.test(x)) return 'wpforms'
  if (/gform_/.test(x)) return 'gravity_forms'
  if (/elementor-form/.test(x)) return 'elementor'
  if (/et_pb_contact_form/.test(x)) return 'divi'
  if (/wix/.test(x)) return 'wix'
  if (/jimdo/.test(x)) return 'jimdo'
  if (/w-form/.test(x)) return 'webflow'
  if (/sqs-block-form/.test(x)) return 'squarespace'
  if (/form_type.{0,20}contact/.test(x)) return 'shopify'
  return 'html'
}
export function lireFormulaire(html: string, url: string, robots = ''): { formulaire: Formulaire | null; verdict: VerdictFormulaire } {
  const propre = nettoyer(html)
  const formes = [...propre.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)]
  const cible = formes.find(m => /<textarea\b/i.test(m[2]))
  const pageTexte = visible(propre).toLowerCase()
  if (/recaptcha|hcaptcha|h-captcha|turnstile|cf-turnstile|friendly.captcha|frc-captcha|grecaptcha/i.test(html)) return { formulaire: null, verdict: refuse('captcha') }
  if (/je ne suis pas un robot|i am not a robot/i.test(pageTexte)) return { formulaire: null, verdict: refuse('case_robot') }
  if (/combien font\s*\d+\s*[+×x*-]\s*\d+|question anti.?spam|anti.?spam\s*:\s*\d+/i.test(pageTexte)) return { formulaire: null, verdict: refuse('question_antispam') }
  if (/akismet|cleantalk|antispam.bee|ct_checkjs|apbct|wpforms.*(token|nonce)/i.test(html)) return { formulaire: null, verdict: refuse('extension_antispam') }
  if (/pas de d[eé]marchage|d[eé]marchage interdit|sollicitations? commerciales? (?:interdites?|refus[eé]es?|non accept[eé]es?)/i.test(pageTexte)) return { formulaire: null, verdict: refuse('refus_demarchage') }
  if (/extraction automatis[eé]e.{0,40}interdite|robots?.{0,40}interdits?|aspiration.{0,40}interdite/i.test(pageTexte)) return { formulaire: null, verdict: refuse('cgu_robots') }
  if (!cible) return { formulaire: null, verdict: refuse(/javascript.{0,40}(challenge|enable)|just a moment|v[eé]rifiez que vous [eê]tes humain/i.test(pageTexte) ? 'defi_js' : 'sans_formulaire') }
  const [tout, attrs, interieur] = cible
  const actionBrute = attribut(attrs, 'action') || url
  let action: URL
  try { action = new URL(actionBrute, url) } catch { return { formulaire: null, verdict: refuse('plateforme') } }
  const champs: Formulaire['champs'] = []
  let longueur: number | null = null, tel = false
  for (const m of interieur.matchAll(/<(input|textarea|select)\b([^>]*)(?:>([\s\S]*?)<\/\1>)?/gi)) {
    const tag = m[1].toLowerCase(), a = m[2]
    const type = tag === 'input' ? attribut(a, 'type').toLowerCase() || 'text' : tag
    if (['hidden','submit','button','reset','image'].includes(type)) continue
    const nom = attribut(a, 'name'), requis = present(a, 'required') || attribut(a, 'aria-required') === 'true'
    const brutMax = Number(attribut(a, 'maxlength'))
    const max = Number.isInteger(brutMax) && brutMax > 0 ? brutMax : undefined
    if (nom) champs.push({ nom, type, requis, ...(max ? { max } : {}) })
    if (tag === 'textarea') longueur = max ?? null
    if (type === 'tel' && requis) tel = true
  }
  const motifs: string[] = []
  for (const m of interieur.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) if (present(m[1], 'required')) {
    for (const o of m[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)) {
      const v = visible(o[2]); if (v && attribut(o[1], 'value') !== '') motifs.push(v)
    }
  }
  const formulaire: Formulaire = { url_page: url, url_action: action.href, methode: attribut(attrs, 'method').toUpperCase() || 'GET', champs, motifs, technologie: technologie(html, tout), telephone_requis: tel, longueur_max_message: longueur }
  if (!memeDomaine(new URL(url).hostname, action.hostname) || DOMAINES_TIERS.some(d => neutre(action.hostname) === d || neutre(action.hostname).endsWith('.' + d))) return { formulaire, verdict: refuse('plateforme') }
  if (!robotsAutorise(robots, agent, new URL(url).pathname) || !robotsAutorise(robots, agent, action.pathname + action.search)) return { formulaire, verdict: refuse('robots_txt') }
  if (/<(?:input|textarea)\b[^>]*(?:name\s*=\s*["']?[^\s>"']*(?:honeypot|pot_de_miel|website|site_web_pot)|tabindex\s*=\s*["']?-1|aria-hidden\s*=\s*["']?true)/i.test(interieur) || /<(?:p|div|label)\b[^>]*(?:display\s*:\s*none|aria-hidden\s*=\s*["']?true)[^>]*>(?:(?!<\/(?:p|div|label)>)[\s\S])*?<input\b(?![^>]*type\s*=\s*["']?hidden)/i.test(interieur)) return { formulaire, verdict: refuse('pot_de_miel') }
  if (tel) return { formulaire, verdict: refuse('telephone_requis') }
  if (motifs.length && motifs.every(m => /devis/i.test(m))) return { formulaire, verdict: refuse('motif_devis_seul') }
  return { formulaire, verdict: { eligible: true } }
}

export function validerLecture(objet: unknown): objet is LectureSite {
  if (!objet || typeof objet !== 'object') return false
  const o = objet as Record<string, unknown>
  if (typeof o.domaine !== 'string' || !Array.isArray(o.pages) || o.pages.length > 4 || !Array.isArray(o.faits) || !Array.isArray(o.reseaux) || !(o.siren === null || typeof o.siren === 'string')) return false
  if (!o.pages.every((p: {url?: unknown; statut?: unknown}) => typeof p.url === 'string' && typeof p.statut === 'number')) return false
  if (!o.faits.every((f: Fait) => typeof f.id === 'string' && /^[a-f0-9]{16}$/.test(f.id) && typeof f.extrait === 'string' && !f.extrait.includes('@') && typeof f.url === 'string' && typeof f.lu_le === 'string')) return false
  if (!o.reseaux.every((r: ReseauLu) => ['instagram','facebook'].includes(r.reseau) && typeof r.compte === 'string' && typeof r.url === 'string' && typeof r.url_source === 'string')) return false
  const v = o.verdict_formulaire as VerdictFormulaire
  if (!v || typeof v !== 'object' || typeof v.eligible !== 'boolean' || (!v.eligible && !RAISONS_ABANDON.includes(v.raison))) return false
  if (o.formulaire !== null) {
    const f = o.formulaire as Formulaire
    if (!f || typeof f.url_page !== 'string' || typeof f.url_action !== 'string' || typeof f.methode !== 'string' || !Array.isArray(f.champs) || !Array.isArray(f.motifs) || !TECHNOLOGIES_FORMULAIRE.includes(f.technologie) || typeof f.telephone_requis !== 'boolean' || !(f.longueur_max_message === null || typeof f.longueur_max_message === 'number')) return false
  }
  return true
}
export async function lireSite(domaine: string, deps: Deps): Promise<LectureSite | { refus: string }> {
  let h: string
  try { h = new URL(domaine.includes('://') ? domaine : 'https://' + domaine).hostname.toLowerCase() } catch { return { refus: 'hote' } }
  if (DOMAINES_EXCLUS.some(d => h === d || h.endsWith('.' + d))) return { refus: 'annuaire' }
  if (!etats.has(deps)) etats.set(deps, { robots: new Map(), dernier: new Map(), origine: h, echecsRobots: new Set() })
  const pages: LectureSite['pages'] = [], faits: Fait[] = [], reseaux: ReseauLu[] = []
  let siren: string | null = null, formulaire: Formulaire | null = null, verdict: VerdictFormulaire = refuse('sans_formulaire')
  let racine = 'https://' + h + '/'
  let accueil = await recupererPoli(racine, deps)
  if ('refus' in accueil && (accueil.refus === 'injoignable' || accueil.refus === 'robots_txt' && etats.get(deps)?.echecsRobots.has(h))) { racine = 'http://' + h + '/'; etats.get(deps)?.robots.delete(h); accueil = await recupererPoli(racine, deps) }
  if ('refus' in accueil) return accueil.refus === 'robots_txt' ? { domaine: h, pages, faits, siren, formulaire, verdict_formulaire: refuse('robots_txt'), reseaux } : { refus: accueil.refus }
  const traiter = (p: PageRecue & { robots?: string }, url: string, principal: boolean) => {
    pages.push({ url, statut: p.statut })
    if (p.statut !== 200) { if ((p.statut === 403 || p.statut === 503) && /challenge/i.test(entete(p,'cf-mitigated'))) verdict = refuse('pare_feu'); return }
    const lu = extraire(p.corps, url, new Date(deps.horloge.maintenant()).toISOString())
    faits.push(...lu.faits); reseaux.push(...lu.reseaux)
    if (lu.siren) siren = siren && siren !== lu.siren ? null : lu.siren
    if (principal) {
      const date = new Date(deps.horloge.maintenant()).toISOString()
      if (new URL(url).protocol !== 'https:') { const f = fait('site_http', url, url, date); if (f) faits.push(f) }
      if (!/<meta\b(?=[^>]*name\s*=\s*["']?viewport\b)[^>]*>/i.test(p.corps)) { const t = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(nettoyer(p.corps)); const f = t && fait('site_mobile', visible(t[1]), url, date); if (f) faits.push(f) }
      const pied = /<footer\b[^>]*>([\s\S]*?)<\/footer>/i.exec(nettoyer(p.corps))?.[1] || ''
      const mention = /(?:©|Copyright)\s*(\d{4})/i.exec(visible(pied))
      if (mention && Number(mention[1]) <= new Date(deps.horloge.maintenant()).getUTCFullYear() - 4) { const f = fait('site_copyright', mention[0], url, date); if (f) faits.push(f) }
    }
    const luForm = lireFormulaire(p.corps, url, p.robots || '')
    if (luForm.formulaire && !formulaire) { formulaire = luForm.formulaire; verdict = luForm.verdict }
    else if (luForm.verdict.eligible === false && luForm.verdict.raison !== 'sans_formulaire') verdict = luForm.verdict
  }
  traiter(accueil, racine, true)
  const liens = [...accueil.corps.matchAll(/<a\b([^>]*)>/gi)].map(m => attribut(m[1],'href')).filter(Boolean)
  const candidats: { url: string; priorite: number }[] = []
  for (const lien of liens) {
    try {
      const u = new URL(lien, racine), path = u.pathname.toLowerCase()
      if (!memeDomaine(u.hostname, h) || u.href === racine || !/(contact|devis|mentions|legal|l[eé]gal|cgu|conditions)/i.test(path)) continue
      const priorite = /contact|devis/.test(path) ? 0 : /mentions|legal|l[eé]gal/.test(path) ? 1 : 2
      if (!candidats.some(c => c.url === u.href)) candidats.push({ url: u.href, priorite })
    } catch { /* lien invalide */ }
  }
  candidats.sort((a,b) => a.priorite - b.priorite)
  for (const c of candidats.slice(0,3)) {
    if (deps.echeance && deps.horloge.maintenant() >= deps.echeance) break
    const p = await recupererPoli(c.url, deps)
    if ('refus' in p) { if (p.refus === 'robots_txt') verdict = refuse('robots_txt'); continue }
    traiter(p, c.url, false)
  }
  const sortie: LectureSite = { domaine: h, pages, faits, siren, formulaire, verdict_formulaire: verdict, reseaux }
  return validerLecture(sortie) ? sortie : { refus: 'forme' }
}
