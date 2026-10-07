#!/usr/bin/env node
// scripts/veille-plaintes.mjs — l'outil de la veille agrégée des plaintes publiques d'artisans (07/10/2026).
//
// Deux passes, toutes deux POLIES (robots.txt lu et respecté pour PrestiRecenseur, sinon « * » ; une requête par seconde et
// par hôte ; UA_RECENSEUR ; hôtes publics seulement ; pages UTF-8 seulement) et SANS AUCUNE DONNÉE D'AUTEUR :
//
//   node --import ./scripts/ts-loader.mjs scripts/veille-plaintes.mjs --decouvrir [--max-fils=120]
//        lit les plans de site publics des forums permis (SOURCES ci-dessous), garde les fils dont l'adresse parle d'un des
//        cinq thèmes → .orchestre/travail/veille-plaintes/fils.json
//   node --import ./scripts/ts-loader.mjs scripts/veille-plaintes.mjs --relever [--max-pages=60] [--fils=<fichier>]
//        lit ces fils et en tire les phrases candidates (plaintes.ts : phrasesCandidates — première personne, un thème au
//        moins, 30 à 200 signes, aucune donnée personnelle) → .orchestre/travail/veille-plaintes/candidats-AAAA-MM-JJ.json
//   node --import ./scripts/ts-loader.mjs scripts/veille-plaintes.mjs --agreger
//        régénère docs/agents/plaintes-par-theme.md depuis plaintesParTheme.ts (l'agrégat par thème, avec les sources)
//
// La sortie ne contient QUE : la phrase, ses thèmes, la page du fil, la date de la relève. Jamais pseudo, nom, profil, ville.
// Les candidates sont relues (par Claude Code ou Benj) avant d'entrer dans lib/agents/acquisition/plaintesParTheme.ts : un
// message d'un particulier qui se plaint d'un artisan n'est pas une douleur d'artisan. Reddit, Google Maps, Facebook… ne
// sont jamais lus (HOTES_INTERDITS, docs/agents/plaintes-par-theme.md). Aucun crédit payant : ni Apify, ni Firecrawl.
// Codes : 0 passe faite · 2 appel invalide · 1 panne.
import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', 'veille-plaintes')
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(path.join(RACINE, 'scripts', 'ts-loader.mjs')).href)
const { robotsAutorise, hoteAutorise } = await import(pathToFileURL(path.join(RACINE, 'lib', 'agents', 'acquisition', 'lecteurSite.ts')).href)
const { UA_RECENSEUR } = await import(pathToFileURL(path.join(RACINE, 'lib', 'agents', 'acquisition', 'contrat.ts')).href)
const { phrasesCandidates, hoteInterdit, RE_PAGE_PROFIL } = await import(pathToFileURL(path.join(RACINE, 'lib', 'agents', 'acquisition', 'plaintes.ts')).href)

// Les forums permis : robots.txt et conditions relus le 07/10/2026 (docs/agents/plaintes-par-theme.md, « Sources »).
// `pro` : un forum de professionnels (tout fil y est écrit par des artisans) ; sinon le fil doit aussi nommer un métier.
export const SOURCES = Object.freeze([
  // Forum de professionnels : tout fil y est écrit entre plombiers et chauffagistes ; le titre doit parler d'un thème.
  { hote: 'plombiers-reunis.com', plans: ['https://plombiers-reunis.com/sitemap.xml'], fil: /^https:\/\/plombiers-reunis\.com\/topic\d+-[a-z0-9-]+\.html$/,
    slug: /devis|relanc|impaye|paiement|payer|facture|reglement|tresorerie|telephone|appels|repondeur|site-internet|site-web|internet|google|visibilite|referencement|paperasse|administratif|comptabilite|trouver-des-clients|clients|plateforme/ },
  // Forum grand public (droit et finances) : la plupart des fils sont écrits par des CLIENTS ; on ne garde que les titres
  // écrits du côté de l'entreprise (client qui ne paie pas, recouvrement, devis sans réponse…).
  { hote: 'droit-finances.commentcamarche.com', index: 'https://droit-finances.commentcamarche.com/sitemap/forum/full', fil: /^https:\/\/droit-finances\.commentcamarche\.com\/forum\/affich-\d+-[a-z0-9-]+$/,
    slug: /clients?-(qui-)?(ne-)?(me-)?(paie|paye|payent|regle|repond)|mauvais-payeurs?|impaye|recouvrement|injonction-de-payer|relancer?-(un-|mes-|les-)?(client|devis|facture)|devis-(sans-reponse|non-signe|pas-signe|refuse)|artisan-(impaye|non-paye)|facture-(impayee|non-payee|non-reglee)|auto-entrepreneur-(impaye|non-paye)|retard-de-paiement/ },
])

function option(argv, nom) {
  const a = argv.find((x) => x === `--${nom}` || x.startsWith(`--${nom}=`))
  if (a === undefined) return undefined
  return a.includes('=') ? a.slice(a.indexOf('=') + 1) : true
}

// ── Le lecteur poli ──────────────────────────────────────────────────────────────────────────────────────────────────────
const dernier = new Map(), robots = new Map()
const attendre = (ms) => new Promise((r) => setTimeout(r, ms))
let requetes = 0
async function demander(url, maxOctets) {
  const u = new URL(url)
  const ecart = (dernier.get(u.host) ?? 0) + 1000 - Date.now()
  if (ecart > 0) await attendre(ecart)
  dernier.set(u.host, Date.now())
  const ips = (await dns.lookup(u.hostname, { all: true, verbatim: true })).map((x) => x.address)
  if (!hoteAutorise(url, ips)) throw new Error('hote')
  requetes++
  const r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': UA_RECENSEUR }, signal: AbortSignal.timeout(20_000) })
  const morceaux = []; let taille = 0
  if (r.body) for await (const b of r.body) { taille += b.length; if (taille > maxOctets) throw new Error('trop_gros'); morceaux.push(b) }
  return { statut: r.status, type: r.headers.get('content-type') || '', location: r.headers.get('location'), corps: Buffer.concat(morceaux) }
}
/** → { ok, texte } ou { ok: false, raison } ; robots.txt d'abord ; 3 redirections au plus, sur le même hôte. */
export async function lirePoliment(url, { maxOctets = 1 << 20, html = true } = {}) {
  for (let i = 0; i <= 3; i++) {
    let u; try { u = new URL(url) } catch { return { ok: false, raison: 'url' } }
    if (u.protocol !== 'https:' || hoteInterdit(url) || RE_PAGE_PROFIL.test(u.pathname + u.search)) return { ok: false, raison: 'hote_ou_profil_interdit' }
    if (!robots.has(u.host)) {
      try { const r = await demander(`${u.origin}/robots.txt`, 512 << 10); robots.set(u.host, r.statut >= 500 ? null : r.statut >= 400 ? '' : r.corps.toString('utf8')) } catch { robots.set(u.host, null) }
    }
    const rb = robots.get(u.host)
    if (rb === null || !robotsAutorise(rb, 'PrestiRecenseur', u.pathname + u.search)) return { ok: false, raison: 'robots_txt' }
    let r; try { r = await demander(url, maxOctets) } catch (e) { return { ok: false, raison: String(e?.message || e).slice(0, 60) } }
    if (r.statut >= 300 && r.statut < 400 && r.location) {
      const suivant = new URL(r.location, url)
      if (suivant.host !== u.host) return { ok: false, raison: 'redirection_hors_hote' }
      url = suivant.href; continue
    }
    if (r.statut !== 200) return { ok: false, raison: `http_${r.statut}` }
    const texte = r.corps.toString('utf8')
    if (html) {
      const charset = (/charset=([\w-]+)/i.exec(r.type)?.[1] || /<meta[^>]+charset=["']?([\w-]+)/i.exec(texte.slice(0, 4000))?.[1] || 'utf-8').toLowerCase()
      if (charset !== 'utf-8' && charset !== 'utf8') return { ok: false, raison: `encodage_${charset}` }
    }
    return { ok: true, texte, url_finale: url }
  }
  return { ok: false, raison: 'redirections' }
}

const locs = (xml) => [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'))

async function decouvrir(maxFils) {
  const fils = []
  const bilan = {}
  for (const s of SOURCES) {
    let plans = s.plans ? [...s.plans] : []
    if (s.index) {
      const r = await lirePoliment(s.index, { maxOctets: 8 << 20, html: false })
      plans = r.ok ? locs(r.texte).filter((l) => l !== s.index) : []
      bilan[`${s.hote}:index`] = r.ok ? `${plans.length} plans` : r.raison
    }
    let vus = 0, retenus = 0
    for (const plan of plans) {
      if (retenus >= maxFils) break
      const r = await lirePoliment(plan, { maxOctets: 8 << 20, html: false })
      if (!r.ok) { bilan[plan] = r.raison; continue }
      for (const l of locs(r.texte)) {
        if (!s.fil.test(l)) continue
        vus++
        if (!s.slug.test(l.toLowerCase())) continue
        fils.push({ hote: s.hote, url: l })
        if (++retenus >= maxFils) break
      }
    }
    bilan[s.hote] = `${vus} fils vus, ${retenus} retenus`
  }
  return { fils, bilan }
}

async function relever(fils, maxPages) {
  const jour = new Date().toISOString().slice(0, 10)
  const candidats = []
  const pages = []
  for (const f of fils.slice(0, maxPages)) {
    const r = await lirePoliment(f.url)
    pages.push({ url: f.url, lue: r.ok, raison: r.ok ? null : r.raison })
    if (!r.ok) continue
    for (const c of phrasesCandidates(r.texte)) candidats.push({ ...c, source_url: f.url, relevee_le: jour })
  }
  // Une phrase vue sur trois pages ou plus est un gabarit du site (titre d'un fil voisin, bandeau), pas une plainte.
  const vues = new Map()
  for (const c of candidats) vues.set(c.citation, (vues.get(c.citation) ?? 0) + 1)
  return { jour, candidats: candidats.filter((c) => vues.get(c.citation) < 3), pages }
}

// ── L'agrégat par thème → docs/agents/plaintes-par-theme.md ──────────────────────────────────────────────────────────────
export const DOC = path.join(RACINE, 'docs', 'agents', 'plaintes-par-theme.md')
const echapper = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
export async function documentAgrege() {
  const { agregatParTheme } = await import(pathToFileURL(path.join(RACINE, 'lib', 'agents', 'acquisition', 'plaintesParTheme.ts')).href)
  const ag = agregatParTheme()
  const l = []
  l.push('# Les plaintes d\'artisans, agrégées par thème', '')
  l.push('Demande de Benj (07/10/2026) : contacter « des personnes qui ont des problèmes qu\'on peut résoudre, et le mieux serait qu\'elles s\'en plaignent ». Ce document est l\'AGRÉGAT : par thème, les phrases exactes d\'artisans (citation, page du fil, date de relève), pour reprendre LEURS mots dans le message et la maquette. Il est régénéré par `node --import ./scripts/ts-loader.mjs scripts/veille-plaintes.mjs --agreger` ; ne pas l\'éditer à la main sous la ligne « Agrégat ».', '')
  l.push('Code : `lib/agents/acquisition/plaintes.ts` (thèmes, classement, contrôle des données personnelles), `lib/agents/acquisition/plaintesParTheme.ts` (les citations retenues, `formulationsPour(theme)`), `scripts/veille-plaintes.mjs` (découverte et relève polies), juge `scripts/veille-plaintes-qa.mjs`.', '')
  l.push('## Règles (RGPD)', '')
  l.push('- On garde la phrase, la page du fil et la date. JAMAIS l\'auteur : ni pseudo, ni nom, ni profil, ni ville, ni photo. Les en-têtes de message (« Réponse de … ») sont écartés à la lecture.')
  l.push('- On ne contacte JAMAIS l\'auteur d\'un message de forum : c\'est un particulier qui n\'a rien demandé, il n\'y a aucune base légale. La veille sert à comprendre et à formuler, pas à trouver des personnes.')
  l.push('- Lecture polie seulement : robots.txt lu et respecté (PrestiRecenseur, sinon « * »), une requête par seconde et par hôte, pages publiques sans compte, UTF-8. Conditions d\'utilisation relues avant d\'ajouter une source.')
  l.push('- Une phrase d\'un client qui se plaint d\'un artisan, d\'un vendeur d\'outil ou d\'une étude de marché n\'est pas une douleur d\'artisan : chaque candidate est relue avant d\'entrer dans `plaintesParTheme.ts`. Toute entrée naît à `approuve: false` ; seules les approuvées entrent dans un message.', '')
  l.push('## Sources', '')
  l.push('| Source | Lecture automatique | Raison (relu le 07/10/2026) |', '|---|---|---|')
  l.push('| plombiers-reunis.com (forum de plombiers et chauffagistes) | oui | robots.txt n\'interdit que /admin, /cache, /profile*, /search*, /user*, /v3/ ; CGU : contenus publiés sous licence Creative Commons, aucune clause contre la lecture automatisée. Plan de site public utilisé pour la découverte. |')
  l.push('| droit-finances.commentcamarche.com (forum questions-réponses) | oui, titres côté entreprise seulement | robots.txt n\'interdit que /xhr/, /s/, /profile/… et publie ses plans de site ; CGU muettes sur la lecture automatisée. Forum surtout écrit par des CLIENTS : rendement faible (relève du 07/10 : aucune phrase d\'artisan du bâtiment retenue hors celles déjà dans douleurs.ts). |')
  l.push('| volta-electricite.info, forum.copaindescopeaux.fr | oui (fils déjà relus en 026-073/026-254) | robots.txt permissif ; pas de plan de site exploitable (redirection, ou fils sans titre dans l\'adresse) : ajout fil par fil. |')
  l.push('| **Reddit** (r/france, r/vosfinances, r/BTP…) | **NON** | `robots.txt` de www.reddit.com et old.reddit.com : `User-agent: *` / `Disallow: /` (lu le 07/10/2026) ; ce même fichier renvoie à la Public Content Policy de Reddit pour les restrictions d\'usage et ne réserve l\'accès qu\'à la recherche et à l\'usage non commercial (r/reddit4researchers) : Presti est un usage commercial. Ce qu\'il faudrait : un accord commercial avec Reddit (API de données) ; à défaut, une lecture HUMAINE par Benj, phrase par phrase, recopiée dans `plaintesParTheme.ts` avec la page du fil — jamais un robot, jamais un acteur Apify « reddit-scraper ». |')
  l.push('| **Avis Google (Google Maps)** | **NON** | robots.txt laisse /maps/place/, mais les Conditions additionnelles de Google Maps interdisent l\'extraction en masse et la copie des avis ; les acteurs Apify (compass/crawler-google-places : 0,004 $ par fiche + 0,002 $ de détails + 0,0005 $ par avis, soit environ 0,016 $ par entreprise à 20 avis, ~0,50 $ pour 30 prospects, ce que le crédit gratuit couvrirait) les moissonnent : non lancé. Ce qu\'il faudrait : l\'API Places officielle (Place Details, champ `reviews`, 5 avis au plus par fiche) avec une clé Google Cloud et un compte de facturation — décision de Benj. Le score de douleur sait déjà compter les avis en mémoire (`compterAvis`) sans rien stocker. |')
  l.push('| Facebook, Instagram, LinkedIn, X, TikTok, PagesJaunes, Trustpilot | **NON** | Conditions qui interdisent la collecte automatisée (`HOTES_INTERDITS` de plaintes.ts). |', '')
  l.push('## Brancher le message et la maquette', '')
  l.push('`formulationsPour(theme, { approuveesSeulement: true })` (plaintesParTheme.ts) rend, pour un thème, les phrases d\'artisans approuvées avec leur page et leur date : le rédacteur et la maquette y prennent LEURS mots (« un devis, une journée entière », « pas un appel, pas un courrier ») au lieu des nôtres. Le branchement n\'est pas fait ici : `redacteur.ts`, `modeles.ts` et `maquettes/**` sont tenus par d\'autres sessions (07/10). Tant qu\'aucune entrée d\'un thème n\'est approuvée, `approuveesSeulement` rend une liste vide pour ce thème : rien n\'entre dans un message sans l\'accord de Benj.', '')
  l.push('## Le score de douleur des entreprises prospectées', '')
  l.push('Pendant B2B de cette veille : `lib/agents/acquisition/scoreDouleur.ts` note chaque entreprise prospectée de 0 à 100 à partir de signaux publics sur elle-même (pas de site 35, copyright ancien 20, pas de version mobile 15, sans HTTPS 10, formulaire absent ou cassé 15, avis qui se plaignent de devis ou de rappels absents — comptés, jamais stockés —, nos messages restés sans réponse 5). Le recenseur pose le score dans son patch ; `scripts/score-douleur-passe.mjs --ecrire` (re)note la file ; les files du recenseur (`acq_reserver`) et du premier contact (`acq_prospects_pour_premier_contact`) passent par score décroissant (migrations 0135-0136). Juge : `scripts/score-douleur-qa.mjs` (`--auto-controle`, `--reel`).', '')
  l.push('## Crédits', '')
  l.push('La veille ne consomme AUCUN crédit payant : lecture directe polie. Apify et Firecrawl ne sont pas appelés (Firecrawl reste refusé par `lib/agents/depense.mjs` tant que Benj n\'a pas décidé).', '')
  l.push('## Agrégat', '')
  const total = ag.reduce((s, t) => s + t.nombre, 0)
  l.push(`${total} citation(s) rangée(s) (une citation peut compter dans deux thèmes).`, '')
  l.push('| Thème | Citations | Approuvées | Pages sources | Ce que Presti y répond |', '|---|---|---|---|---|')
  for (const t of ag) l.push(`| ${echapper(t.libelle)} | ${t.nombre} | ${t.approuvees} | ${t.sources} | ${echapper(t.reponse_presti)} |`)
  for (const t of ag) {
    l.push('', `### ${t.libelle}`, '')
    l.push('| Citation (mot pour mot) | Métier | Page | Relevée le | Origine | Approuvée |', '|---|---|---|---|---|---|')
    for (const f of t.formulations) l.push(`| « ${echapper(f.citation)} » | ${f.metier} | ${f.source_url} | ${f.relevee_le} | ${f.origine} (${f.id}) | ${f.approuve ? 'oui' : 'non'} |`)
  }
  return l.join('\n') + '\n'
}

async function principal() {
  const argv = process.argv.slice(2)
  if (option(argv, 'agreger')) {
    fs.writeFileSync(DOC, await documentAgrege())
    console.log(`✓ ${path.relative(RACINE, DOC)} régénéré`)
    return 0
  }
  fs.mkdirSync(TRAVAIL, { recursive: true })
  if (option(argv, 'decouvrir')) {
    const max = Number(option(argv, 'max-fils') ?? 120)
    const { fils, bilan } = await decouvrir(Number.isFinite(max) && max > 0 ? max : 120)
    fs.writeFileSync(path.join(TRAVAIL, 'fils.json'), JSON.stringify({ le: new Date().toISOString(), bilan, fils }, null, 2) + '\n')
    console.log(`✓ découverte : ${fils.length} fil(s) retenu(s), ${requetes} requête(s) ; ${JSON.stringify(bilan)}`)
    return 0
  }
  if (option(argv, 'relever')) {
    const src = option(argv, 'fils')
    const fichier = typeof src === 'string' ? path.resolve(src) : path.join(TRAVAIL, 'fils.json')
    let fils = []
    try { const v = JSON.parse(fs.readFileSync(fichier, 'utf8')); fils = Array.isArray(v) ? v : v.fils ?? [] } catch { console.error(`✗ ${fichier} illisible : lancez d'abord --decouvrir`); return 2 }
    const max = Number(option(argv, 'max-pages') ?? 60)
    const r = await relever(fils, Number.isFinite(max) && max > 0 ? max : 60)
    const sortie = path.join(TRAVAIL, `candidats-${r.jour}.json`)
    fs.writeFileSync(sortie, JSON.stringify(r, null, 2) + '\n')
    const parTheme = {}
    for (const c of r.candidats) for (const t of c.themes) parTheme[t] = (parTheme[t] ?? 0) + 1
    console.log(`✓ relève : ${r.pages.filter((p) => p.lue).length}/${r.pages.length} page(s) lue(s), ${r.candidats.length} candidate(s) ${JSON.stringify(parTheme)}, ${requetes} requête(s) → ${path.relative(RACINE, sortie)}`)
    return 0
  }
  console.error('usage : veille-plaintes.mjs --decouvrir [--max-fils=N] | --relever [--max-pages=N] [--fils=fichier] | --agreger')
  return 2
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().then((c) => { process.exitCode = c }).catch((e) => { console.error(`✗ ${e?.message || e}`); process.exitCode = 1 })
}
