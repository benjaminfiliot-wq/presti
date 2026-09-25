// scripts/generateur-vente-qa.mjs — le juge de la fiche 025-21 (« le générateur prêt pour la vente »), écrit par Claude Code le
// 25/09 à partir de la relecture à froid avant mise en ligne (.orchestre/preuves/025-relectures/revue-avant-mise-en-ligne-2026-09-25.md,
// défauts D19 à D25 et le champ `commande` de D01). Les verdicts sont à lui : un exécutant ne le modifie pas.
//
// Pourquoi un juge à part et pas une extension de formulaire-site-qa : le 25/09, une autre session écrivait FS-12 (fiche 025-22,
// la route /api/leads) dans formulaire-site-qa.mjs ; deux sessions dans un même fichier se marchent dessus. Ce juge ne lui emprunte
// rien : il n'importe que scripts/fixtures/025/commun.mjs.
//
// Usage :
//   node scripts/generateur-vente-qa.mjs                    GV-1 à GV-8 sur le dépôt
//   node scripts/generateur-vente-qa.mjs --racine=<dossier> la même chose, tout lu et lancé depuis <dossier>
//   node scripts/generateur-vente-qa.mjs --temoin           GV-1 à GV-8 sur le témoin « après » (voir plus bas)
//   … --critere=GV-2,GV-5                                   seulement ces critères
// Sortie : « PASS|FAIL <id> — … » par critère, puis « generateur-vente-qa : PASS » ou « … : FAIL — ids ». Code 0 si tout est vert,
// 1 sinon, 2 si l'appel est invalide. N'écrit que sous .orchestre/travail/generateur-vente-qa/. Rien n'est généré en place ; aucun
// appel réseau (le service des sites est simulé dans ce processus). GV-8 lance Chromium : sur le PC de Benj, passer par
// `node scripts/usine.mjs executer`.
//
// Les jeux d'essai (scripts/fixtures/025/) :
//   commandes-metiers/<m>/{commande,contenu}.json  quatre commandes FICTIVES neuves (plombier à Lyon, couvreur à Strasbourg,
//        électricien à Nantes, menuisier à Tours), chacune avec SON contenu, un domaine en .example (RFC 2606) ; leurs photos sont
//        celles de la démo gelée public/sites-demo/<m>/ du DÉPÔT (bases de matiere.photos), copiées par le juge avec leurs
//        attributions dans .orchestre/travail/generateur-vente-qa/src/<m>/photos/.
//   commande-exemple/  la commande sans domaine de la série (contenu dérivé de Lestraque) : GV-2, GV-4, GV-5, GV-6, GV-7, GV-8.
//
// Critères :
//   GV-1 (D19) les quatre commandes métier génèrent (<racine>/public/sites-demo/generer.mjs --source, code 0) un site que le juge du
//        dépôt accepte (<racine>/scripts/site-qa.mjs <site> --statique : code 0) ; aucun mot PROPRE à un autre métier (commun.mjs,
//        motsDesMetiers : dictionnaire tiré de <racine>/maquettes/modeles/) dans le texte des pages (corps, title, description,
//        alt, title, aria-label, placeholder) — sont admis les mots de la commande (nom, communes, choix du devis, légendes de ses
//        photos) et « Réalisations », entrée de menu commune à tous les sites ; aucune identité de Lestraque : ni le mot, ni le
//        tracé de son monogramme (_kit/monogrammes/lestraque.json), ni un fichier ou une référence à une de ses photos
//        (public/sites-demo/lestraque/images/), ni une de ses communes que la commande ne sert pas. Et la commande d'exemple, dont
//        le contenu porte demo_v16 « lestraque », ne reçoit pas la direction artistique de Lestraque : pas de monogramme.
//        Mutations : un mot du menuisier glissé dans le site de l'électricien, le monogramme glissé dans une page : vus.
//   GV-2 (D22) le site servi comme en production : app/site-genere/[commande]/[[...chemin]]/route.ts et lib/sitesGeneres.ts de
//        <racine>, transpilés et appelés dans ce processus contre un faux Supabase (la commande, et le bucket « sites » = le dossier
//        généré), précédés de la redirection 308 de la barre finale de Next (next.config.mjs de <racine> : trailingSlash,
//        skipTrailingSlashRedirect) et, sur un domaine, de la réécriture du middleware (/x → /site-genere/<id>/x). Trois parcours :
//        prestiapp.fr/site-genere/<id>/… en ligne (commande d'exemple, sans domaine) ; le même en aperçu (?apercu=<jeton> puis le
//        cookie posé par la route) ; https://<domaine>/… (l'électricien). Chaque page, appelée par son adresse publique avec la
//        barre finale, répond 200 en HTML ; chaque lien et chaque ressource de la page (href, src, srcset, poster, url() des styles,
//        et les url() des feuilles de styles), résolus comme un navigateur contre l'adresse finale, répondent 200 (redirections
//        suivies) ; chaque page a au moins une feuille de styles servie, l'accueil au moins une image. Un lien qui sort du site généré vers une autre
//        page de prestiapp.fr compte comme une erreur. Mutation : la feuille de styles de l'accueil en chemin relatif : vue.
//   GV-3 (D23) les mentions légales d'un vrai site : le site de l'électricien (photos de Commons) et sa variante aux photos de
//        l'artisan (attributions réécrites : auteur = l'artisan, licence « propriétaire », source sur son domaine, non modifiées) :
//        générés en code 0 ; leurs pages de mentions ne disent ni « démonstration » ni « fictif/fictive » ; la variante ne dit ni
//        « Wikimedia », ni « Commons », ni « licence libre », ni « par Presti » (aucune de ses photos n'a été touchée par Presti) ;
//        chaque auteur est cité. Mutation : « site de démonstration » glissé : vu.
//   GV-4 (D20) la commande d'exemple, avec « </script><script>… » dans le nom de son JSON-LD (contenu.json, toutes les pages), génère
//        en code 0 ; dans chaque page, le contenu de chaque <script type="application/ld+json">, lu comme un navigateur (jusqu'au
//        premier « </script »), est un JSON valide qui porte ce nom intact, et la page ne contient pas le script injecté.
//        Mutation : un JSON-LD non échappé : vu.
//   GV-5 (D21) la canonique, og:url et l'url du JSON-LD de chaque page, chaque <loc> du sitemap et la ligne Sitemap: de robots.txt
//        mènent, par le service simulé de GV-2 (redirections suivies), à CETTE page (même objet du bucket) — pour la commande
//        d'exemple sans domaine (son adresse réelle est prestiapp.fr/site-genere/<id>, pas /site/<slug>, le site historique) et pour
//        l'électricien sur son domaine ; chaque page publique est dans le sitemap. Et <racine>/scripts/site-qa.mjs --statique --json
//        accepte les deux sites sur « canonical = la page elle-même » et « sitemap.xml liste toutes les pages ». Mutation : la
//        canonique de l'accueil sur /site/<slug>/ : vue par ce juge ET refusée par site-qa (le juge de dépôt n'est pas rendu
//        aveugle).
//   GV-6 (D24) og:image et les images du JSON-LD (image, logo) de chaque page mènent, par le service simulé, à une image (200,
//        image/*) : commande d'exemple (ses photos n'existent qu'en 480 et 960) et électricien. Mutation : une og:image absente : vue.
//   GV-7 (D25) la commande d'exemple avec « +33 (0)2 61 91 51 05 », « 0033 2 61 91 51 06 » et « 02.61.91.51.07 » : générée en
//        code 0 ; chaque lien d'appel (là où le générateur écrit le numéro : nav, contact, pied, repli) vaut tel:+33XXXXXXXXX ou
//        tel:0XXXXXXXXX pour le bon numéro, et son texte affiché est ce numéro, « 02 61 91 51 0X » au moins une fois. Avec
//        « +33 (0)2 61 91 » (trop court) : code ≠ 0 et aucune page écrite. Mutation : tel:+330… affiché « 00 26 19 15 10 5 » : vu.
//   GV-8 (D01, côté site) chaque formulaire de devis de la commande d'exemple porte data-commande = l'identifiant de la commande, et
//        dans Chromium, l'envoi du formulaire de l'accueil (contre un /api/leads simulé) part avec `commande` = cet identifiant
//        (et toujours `slug`).
//
// --temoin : tous les critères sur l'arbre .orchestre/travail/generateur-vente-qa/temoin/ : lib/urls.ts, lib/sitesGeneres.ts,
//   maquettes/modeles/, public/sites-demo/_kit/, public/sites-demo/_polices/, app/site-genere/ et next.config.mjs copiés du dépôt,
//   puis scripts/fixtures/025/temoins/generateur-vente-qa/ superposé, suffixe .temoin retiré : une copie de generer.mjs corrigée en
//   --source seulement, _kit/formulaire.js qui envoie `commande`, et scripts/site-qa.mjs qui lit la canonique et le sitemap
//   relativement à site.json → url_base. Les jeux d'essai et les photos restent ceux du dépôt.
//
// Choix du juge (la revue ne tranche pas) :
//   - Une adresse qui mène à la page après une redirection 308 de la barre finale (celle que Next pose sur tout chemin) « mène à la
//     page » : c'est aussi le cas de toute page d'un site sur son domaine.
//   - Le service simulé suit les redirections (5 au plus) et garde le cookie d'aperçu par chemin, comme un navigateur.
//   - Un JSON-LD se lit comme le fait un navigateur : le contenu d'un <script> s'arrête au premier « </script » suivi d'un blanc,
//     de « / » ou de « > ».
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import {
  R, FIXTURES, TRAVAIL, COMMANDE_EXEMPLE,
  exigerSousTravail, listerFichiers, lireOuNull, fichierNonVide, lancer, preparerTemoin, lireOptionsOuQuitter, creerSortie,
  lireCommande, lireJson, motsDesMetiers, motsEtrangers, servir, lancerNavigateur, BUREAU,
} from './fixtures/025/commun.mjs'

export const JUGE = 'generateur-vente-qa'
export const IDS = ['GV-1', 'GV-2', 'GV-3', 'GV-4', 'GV-5', 'GV-6', 'GV-7', 'GV-8']
const ICI = path.join(TRAVAIL, JUGE)
const METIERS = ['plombier', 'couvreur', 'electricien', 'menuisier']
const DOSSIER_METIERS = path.join(FIXTURES, 'commandes-metiers')
const HOTE_PRESTI = 'prestiapp.fr'
const JETON = 'jeton-essai-025-21-apercu'
const NOM_HOSTILE = 'Atelier </script><script>window.__gv4=1</script> Lestraque'

const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const decoder = (s) => String(s).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const texteHtml = (html) => decoder(String(html).replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/[\s  ]+/g, ' ')
const pagesHtml = (site) => [...listerFichiers(site)].filter((f) => /\.html?$/i.test(f)).sort()
const cheminDePage = (f) => `/${f.replace(/index\.html?$/i, '')}`.replace(/\/{2,}/g, '/')
const attributs = (brut) => { const o = {}; for (const m of String(brut).matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) o[m[1].toLowerCase()] = decoder(m[2] ?? m[3] ?? m[4] ?? ''); return o }
const balises = (html, nom) => [...String(html).matchAll(new RegExp(`<${nom}\\b((?:[^>"']|"[^"]*"|'[^']*')*)>`, 'gi'))].map((m) => attributs(m[1]))
/** Le texte que lit un moteur ou un lecteur d'écran : le corps, title, description, alt, title, aria-label, placeholder. */
function texteExamine(html) {
  const morceaux = [texteHtml(html)]
  for (const m of String(html).matchAll(/\b(?:alt|title|aria-label|placeholder)\s*=\s*"([^"]*)"/gi)) morceaux.push(decoder(m[1]))
  for (const m of String(html).matchAll(/<meta\b[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*"([^"]*)"/gi)) morceaux.push(decoder(m[1]))
  return morceaux.join('\n')
}

// ── Préparation des commandes et génération ───────────────────────────────────────────────────────────────────────────────
/** Un dossier de commande sous .orchestre/travail/<juge>/src/<nom> : copie de `depuis` (dossier), puis fichiers remplacés. */
function preparerSource(nom, { depuis = COMMANDE_EXEMPLE, commande = null, contenu = null, attributions = null } = {}) {
  const src = exigerSousTravail(path.join(ICI, 'src', nom))
  fs.rmSync(src, { recursive: true, force: true })
  fs.cpSync(depuis, src, { recursive: true })
  if (commande) fs.writeFileSync(path.join(src, 'commande.json'), `${JSON.stringify(commande, null, 2)}\n`)
  if (contenu) fs.writeFileSync(path.join(src, 'contenu.json'), `${JSON.stringify(contenu, null, 2)}\n`)
  if (attributions) fs.writeFileSync(path.join(src, 'photos', 'attributions.json'), `${JSON.stringify(attributions, null, 1)}\n`)
  return src
}
/** Une commande métier : commande.json et contenu.json du jeu d'essai, photos de la démo gelée du DÉPÔT (bases de matiere.photos). */
function preparerMetier(metier, { nom = metier, attributions: transformer = null } = {}) {
  const fx = path.join(DOSSIER_METIERS, metier)
  const commande = lireJson(path.join(fx, 'commande.json'))
  const demo = path.join(R, 'public', 'sites-demo', metier)
  const toutes = lireJson(path.join(demo, 'attributions.json'))
  const bases = new Set(commande.matiere.photos.map((p) => p.base))
  const gardees = toutes.filter((a) => bases.has(a.base))
  const manquantes = [...bases].filter((b) => !gardees.some((a) => a.base === b))
  if (manquantes.length) throw new Error(`jeu d’essai ${metier} : photo(s) ${manquantes.join(', ')} absente(s) de ${rel(demo)}/attributions.json`)
  const src = exigerSousTravail(path.join(ICI, 'src', nom))
  fs.rmSync(src, { recursive: true, force: true })
  fs.mkdirSync(path.join(src, 'photos'), { recursive: true })
  fs.copyFileSync(path.join(fx, 'commande.json'), path.join(src, 'commande.json'))
  fs.copyFileSync(path.join(fx, 'contenu.json'), path.join(src, 'contenu.json'))
  for (const a of gardees) fs.copyFileSync(path.join(demo, a.fichier), path.join(src, 'photos', path.basename(a.fichier)))
  fs.writeFileSync(path.join(src, 'photos', 'attributions.json'), `${JSON.stringify(transformer ? gardees.map(transformer) : gardees, null, 1)}\n`)
  return { src, commande, attributions: transformer ? gardees.map(transformer) : gardees }
}
/** <racine>/public/sites-demo/generer.mjs --source=<src> --sortie=<.orchestre/travail/<juge>/sites/<nom>> (cwd <racine>). */
function generer(racine, src, nom) {
  const sortie = exigerSousTravail(path.join(ICI, 'sites', nom))
  fs.rmSync(sortie, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(sortie), { recursive: true })
  const g = path.join(racine, 'public', 'sites-demo', 'generer.mjs')
  if (!fichierNonVide(g)) return { code: null, sortie, message: `${g} absent ou vide` }
  const t0 = Date.now()
  const r = lancer(process.execPath, [g, `--source=${src}`, `--sortie=${sortie}`], { cwd: racine, timeout: 240_000 })
  return { ...r, sortie, secondes: (Date.now() - t0) / 1000, message: r.derniereLigne }
}
const echecGeneration = (quoi, g) => `${quoi} : ${g.code === null && !g.signal ? g.message : `code ${g.code}${g.signal ? ` (${g.signal})` : ''} : « ${court(g.message, 180)} »`}`
/** <racine>/scripts/site-qa.mjs <site> --statique --json → { code, rapport, echecs: ['bloc › test (mesure)'] } */
function siteQa(racine, site) {
  const qa = path.join(racine, 'scripts', 'site-qa.mjs')
  if (!fichierNonVide(qa)) return { code: null, rapport: null, echecs: [`${qa} absent`] }
  const r = lancer(process.execPath, [qa, site, '--statique', '--json'], { cwd: racine, timeout: 180_000 })
  let rapport = null
  try { rapport = JSON.parse(r.stdout) } catch { /* sortie non JSON */ }
  if (!rapport) return { code: r.code, rapport: null, echecs: [`site-qa illisible (code ${r.code}) : ${court(r.sortie, 160)}`] }
  const echecs = rapport.blocs.flatMap((b) => b.tests.filter((t) => !t.passe).map((t) => `${b.nom} › ${t.nom} (${court(t.mesure, 90)})`))
  return { code: r.code, rapport, echecs }
}

// ── Le service simulé : Next (barre finale), le middleware d'un domaine, la route réelle de app/site-genere ───────────────────
/** Transpile et charge un module .ts de <racine> dans ce processus ; `stubs` remplace des imports ; les autres @/… sont lus sous <racine>. */
async function chargerTs({ racine, fichier, stubs = {} }) {
  const ts = (await import('typescript')).default
  const { createRequire, builtinModules } = await import('node:module')
  const requireNode = createRequire(import.meta.url)
  const caches = new Map()
  const resoudre = (spec, depuis) => {
    const cands = spec.startsWith('@/') ? [path.join(racine, spec.slice(2))] : spec.startsWith('.') ? [path.resolve(path.dirname(depuis), spec)] : []
    for (const c of cands) for (const e of ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts']) if (fs.existsSync(c + e) && fs.statSync(c + e).isFile()) return c + e
    return null
  }
  const charger = (f) => {
    if (caches.has(f)) return caches.get(f).exports
    const js = ts.transpileModule(fs.readFileSync(f, 'utf8'), { fileName: f, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
    const module = { exports: {} }
    caches.set(f, module)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:') || builtinModules.includes(spec)) return requireNode(spec)
      const cible = resoudre(spec, f)
      if (cible) return charger(cible)
      throw new Error(`${rel(f)} importe « ${spec} », que le juge ne simule pas`)
    }
    new Function('exports', 'require', 'module', '__filename', '__dirname', 'process', js)(module.exports, req, module, f, path.dirname(f), { env: {} })
    return module.exports
  }
  if (!fichierNonVide(fichier)) throw new Error(`${rel(fichier)} absent ou vide`)
  return charger(fichier)
}
/** next.config.mjs de <racine> : trailingSlash et skipTrailingSlashRedirect (lus au texte ; absents = false). */
function reglagesNext(racine) {
  const t = lireOuNull(path.join(racine, 'next.config.mjs'))?.toString('utf8') || ''
  return { trailingSlash: /\btrailingSlash\s*:\s*true\b/.test(t), sansRedirection: /\bskipTrailingSlashRedirect\s*:\s*true\b/.test(t) }
}
class ReponseNext {
  constructor(corps, init = {}) { this.status = init.status ?? 200; this.entetes = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v)])); this.corps = corps }
  static json(o, init = {}) { return new ReponseNext(JSON.stringify(o), { ...init, headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) } }) }
  static redirect(u, s = 307) { return new ReponseNext(null, { status: s, headers: { location: String(u) } }) }
}
function fauxSupabase({ lignes, site, id, journal }) {
  class Requete {
    constructor(t) { this.t = t; this.filtres = []; this.unique = null }
    select() { return this }
    eq(c, v) { this.filtres.push((r) => r[c] === v); return this }
    limit() { return this }
    maybeSingle() { this.unique = 'maybe'; return this }
    single() { this.unique = 'single'; return this }
    then(ok, ko) {
      return Promise.resolve().then(() => {
        const l = (lignes[this.t] || []).filter((r) => this.filtres.every((f) => f(r))).map((r) => ({ ...r }))
        if (this.unique === 'maybe') return { data: l[0] ?? null, error: null }
        if (this.unique === 'single') return l.length === 1 ? { data: l[0], error: null } : { data: null, error: { message: 'pas une ligne' } }
        return { data: l, error: null }
      }).then(ok, ko)
    }
  }
  return {
    from: (t) => new Requete(t),
    storage: {
      from: (bucket) => ({
        download: async (objet) => {
          journal.push(objet)
          if (bucket !== 'sites' || !String(objet).startsWith(`${id}/`)) return { data: null, error: { message: 'objet inconnu' } }
          const f = path.join(site, String(objet).slice(id.length + 1))
          if (!(path.relative(site, f) && !path.relative(site, f).startsWith('..')) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return { data: null, error: { message: 'Object not found' } }
          const b = fs.readFileSync(f)
          return { data: { arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length) }, error: null }
        },
        list: async () => ({ data: [], error: null }),
      }),
    },
  }
}
/**
 * Le service d'un site généré, simulé : { suivre(url) → { url, statut, type, corps (Buffer), objet, sauts[] } }.
 * `commande` : { id, etat, jeton, domaine }. Sur prestiapp.fr : barre finale (Next) puis route. Sur le domaine : barre finale, puis
 * réécriture du middleware vers /site-genere/<id>/…, puis route. Tout autre hôte : externe (non servi).
 */
async function serviceSimule({ racine, site, commande }) {
  const journal = []
  const sb = fauxSupabase({ lignes: { sites_commandes: [{ id: commande.id, etat: commande.etat, apercu_jeton: commande.jeton ?? null, domaine: commande.domaine ?? null }] }, site, id: commande.id, journal })
  const stubs = { 'next/server': { NextResponse: ReponseNext }, '@/lib/supabaseAdmin': { supabaseAdmin: sb } }
  const route = await chargerTs({ racine, fichier: path.join(racine, 'app', 'site-genere', '[commande]', '[[...chemin]]', 'route.ts'), stubs })
  if (typeof route.GET !== 'function') throw new Error('la route app/site-genere n’exporte pas GET')
  const nx = reglagesNext(racine)
  const cookies = []
  const hotesDomaine = commande.domaine ? [commande.domaine, `www.${commande.domaine}`] : []
  async function repondre(u) {
    const url = new URL(u)
    const hote = url.hostname.toLowerCase()
    const presti = hote === HOTE_PRESTI || hote === `www.${HOTE_PRESTI}`
    if (!presti && !hotesDomaine.includes(hote)) return { statut: null, externe: true }
    let p = url.pathname
    // Next : la redirection 308 de la barre finale précède le middleware et les routes
    const dernier = p.split('/').pop()
    if (!nx.sansRedirection && p !== '/') {
      if (!nx.trailingSlash && p.endsWith('/')) return { statut: 308, location: `${p.replace(/\/+$/, '') || '/'}${url.search}` }
      if (nx.trailingSlash && !p.endsWith('/') && !/\.[a-z0-9]+$/i.test(dernier)) return { statut: 308, location: `${p}/${url.search}` }
    }
    if (!presti) {
      if (/^\/(?:api|_next)(?:\/|$)/.test(p)) return { statut: 404, hors: 'route de l’application (hors du site généré)' }
      p = `/site-genere/${commande.id}${p}` // la réécriture du middleware (middleware.ts, commandeForDomain)
    }
    const m = /^\/site-genere\/([^/]+)(?:\/(.*))?$/.exec(p)
    if (!m) return { statut: 404, hors: `autre page de ${HOTE_PRESTI} (${p})` }
    const params = { commande: decodeURIComponent(m[1]), ...(m[2] && m[2].split('/').filter(Boolean).length ? { chemin: m[2].split('/').filter(Boolean).map(decodeURIComponent) } : {}) }
    const envoyes = cookies.filter((c) => p === c.chemin || p.startsWith(c.chemin.endsWith('/') ? c.chemin : `${c.chemin}/`)).map((c) => `${c.nom}=${c.valeur}`).join('; ')
    const entetes = { host: url.host, ...(envoyes ? { cookie: envoyes } : {}) }
    const req = { url: `${url.protocol}//${url.host}${p}${url.search}`, headers: { get: (k) => entetes[String(k).toLowerCase()] ?? null } }
    journal.length = 0
    const rep = await route.GET(req, { params: Promise.resolve(params) })
    const objet = journal.at(-1) ?? null
    const sc = rep.entetes['set-cookie']
    if (sc) { const [nv, ...attrs] = sc.split(';'); const i = nv.indexOf('='); const ch = (attrs.map((a) => a.trim()).find((a) => /^path=/i.test(a)) || 'Path=/').slice(5); const nom = nv.slice(0, i).trim(); const k = cookies.findIndex((c) => c.nom === nom); const c = { nom, valeur: nv.slice(i + 1).trim(), chemin: ch }; if (k >= 0) cookies[k] = c; else cookies.push(c) }
    const corps = rep.corps === null || rep.corps === undefined ? Buffer.alloc(0) : typeof rep.corps === 'string' ? Buffer.from(rep.corps, 'utf8') : Buffer.from(rep.corps)
    return { statut: rep.status, type: rep.entetes['content-type'] || '', location: rep.entetes.location, corps, objet: rep.status === 200 ? objet : null }
  }
  async function suivre(u) {
    const sauts = []
    let courant = u
    for (let i = 0; i < 6; i++) {
      const r = await repondre(courant)
      if (r.statut && [301, 302, 303, 307, 308].includes(r.statut) && r.location) { sauts.push(`${r.statut}`); courant = new URL(r.location, courant).href; continue }
      return { ...r, url: courant, sauts }
    }
    return { statut: 'boucle', url: courant, sauts, corps: Buffer.alloc(0), type: '', objet: null }
  }
  return { suivre, cookies }
}
/** Les références d'une page HTML (href, src, srcset, poster, url() des styles), sans les ancres, mailto:, tel:, data: */
function referencesPage(html) {
  const refs = []
  const base = balises(html, 'base')[0]?.href || null
  for (const t of String(html).matchAll(/<([a-z][a-z0-9-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
    const nom = t[1].toLowerCase(), a = attributs(t[2])
    // la canonique et les alternates ne sont pas des ressources de la page : GV-5 les juge
    if (nom === 'base' || nom === 'form' || (nom === 'link' && /(?:^|\s)(?:canonical|alternate)(?:\s|$)/i.test(a.rel || ''))) continue
    for (const k of ['href', 'src', 'poster', 'data-src']) if (a[k] !== undefined) refs.push({ balise: nom, attr: k, valeur: a[k] })
    for (const k of ['srcset', 'imagesrcset', 'data-srcset']) if (a[k]) for (const c of a[k].split(',')) { const v = c.trim().split(/\s+/)[0]; if (v) refs.push({ balise: nom, attr: k, valeur: v }) }
    if (a.style) for (const m of a.style.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) refs.push({ balise: nom, attr: 'style', valeur: m[2] })
  }
  for (const s of String(html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) for (const m of s[1].matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) refs.push({ balise: 'style', attr: 'url()', valeur: m[2] })
  return { base, refs: refs.filter((r) => { const v = r.valeur.trim(); return v && !v.startsWith('#') && !/^(?:mailto|tel|javascript|data|blob|about):/i.test(v) }) }
}
// les images en data: sont ôtées d'abord (un SVG en data: porte ses propres url(%23filtre), qui ne sont pas des fichiers)
const sansDataUri = (css) => String(css).replace(/url\(\s*(["'])data:[\s\S]*?\1\s*\)/gi, 'url()').replace(/url\(\s*data:[^)]*\)/gi, 'url()')
const refsCss = (css) => [...sansDataUri(css).matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)|@import\s+(['"])([^'"]+)\3/gi)].map((m) => (m[2] || m[4] || '').trim()).filter((v) => { let d = v; try { d = decodeURIComponent(v) } catch { /* tel quel */ } return v && !/^(?:data:|#)/i.test(d) })

// ── GV-2 : le site servi ──────────────────────────────────────────────────────────────────────────────────────────────────
/** Un parcours : chaque page (adresse publique, barre finale), ses références, les url() de ses feuilles. → { echecs, faits } */
async function parcourir({ racine, site, commande, origine, premiere = '' }) {
  const echecs = [], sv = await serviceSimule({ racine, site, commande })
  const vus = new Map()
  let feuilles = 0, images = 0, nRefs = 0
  const verifier = async (u, ou) => {
    const sans = u.split('#')[0]
    if (!vus.has(sans)) vus.set(sans, await sv.suivre(sans))
    const r = vus.get(sans)
    if (r.externe) return r
    nRefs++
    if (r.statut !== 200) echecs.push(`${ou} → ${court(sans.replace(origine, ''), 90)} : ${r.statut}${r.sauts.length ? ` après ${r.sauts.join(', ')}` : ''}${r.hors ? ` (${r.hors})` : ''}`)
    return r
  }
  const pages = pagesHtml(site)
  for (const [i, f] of pages.entries()) {
    const chemin = cheminDePage(f)
    const adresse = `${origine}${chemin}${i === 0 ? premiere : ''}`
    const p = await sv.suivre(adresse)
    if (p.statut !== 200 || !/text\/html/.test(p.type)) { echecs.push(`${chemin} : ${p.statut}${p.hors ? ` (${p.hors})` : ''} (${p.type || 'sans type'}) pour ${adresse.replace(origine, '')}`); continue }
    const html = p.corps.toString('utf8')
    const { base, refs } = referencesPage(html)
    const baseUrl = base ? new URL(base, p.url).href : p.url
    let feuille = false, image = false
    for (const r of refs) {
      let u
      try { u = new URL(r.valeur, baseUrl).href } catch { echecs.push(`${chemin} : référence illisible « ${court(r.valeur, 60)} »`); continue }
      const rep = await verifier(u, `${chemin} <${r.balise} ${r.attr}>`)
      if (rep.externe || rep.statut !== 200) continue
      if (r.balise === 'link' && /text\/css/.test(rep.type)) { feuille = true; for (const c of refsCss(rep.corps.toString('utf8'))) { try { await verifier(new URL(c, rep.url).href, `${chemin} → ${court(rep.url.replace(origine, ''), 40)} url()`) } catch { echecs.push(`url() illisible « ${c} »`) } } }
      if (/^image\//.test(rep.type)) image = true
    }
    if (feuille) feuilles++; else echecs.push(`${chemin} : aucune feuille de styles servie (la page arriverait nue)`)
    if (image) images++; else if (chemin === '/') echecs.push(`${chemin} : aucune image servie sur l’accueil`)
  }
  return { echecs: [...new Set(echecs)], faits: `${pages.length} page(s), ${nRefs} adresse(s) du site vérifiée(s) (${vus.size} distinctes), ${feuilles} page(s) avec feuille de styles, ${images} avec image` }
}
async function jugerService({ racine, siteExemple, commandeExemple, siteDomaine, commandeDomaine }) {
  const echecs = [], faits = []
  const parcours = [
    { nom: `${HOTE_PRESTI}/site-genere/<id>/ en ligne`, site: siteExemple, commande: { id: commandeExemple.id, etat: 'en_ligne' }, origine: `https://${HOTE_PRESTI}/site-genere/${commandeExemple.id}` },
    { nom: `${HOTE_PRESTI}/site-genere/<id>/?apercu=<jeton> (aperçu)`, site: siteExemple, commande: { id: commandeExemple.id, etat: 'generee', jeton: JETON }, origine: `https://${HOTE_PRESTI}/site-genere/${commandeExemple.id}`, premiere: `?apercu=${JETON}` },
    { nom: `https://${commandeDomaine.domaine}/ (domaine)`, site: siteDomaine, commande: { id: commandeDomaine.id, etat: 'en_ligne', domaine: commandeDomaine.domaine }, origine: `https://${commandeDomaine.domaine}` },
  ]
  for (const p of parcours) {
    const r = await parcourir({ racine, ...p })
    if (r.echecs.length) echecs.push(`${p.nom} : ${r.echecs.slice(0, 6).join(' ; ')}${r.echecs.length > 6 ? ` (et ${r.echecs.length - 6} autre(s))` : ''}`)
    else faits.push(`${p.nom} : ${r.faits}`)
  }
  // mutation : la feuille de styles de l'accueil en chemin relatif (la page d'avant le correctif) doit être vue
  const mute = exigerSousTravail(path.join(ICI, 'mutations', 'gv2'))
  fs.rmSync(mute, { recursive: true, force: true }); fs.cpSync(siteExemple, mute, { recursive: true })
  const idx = path.join(mute, 'index.html')
  const avant = fs.readFileSync(idx, 'utf8')
  // (sur un site encore en chemins relatifs, la mutation ne change rien : le détecteur doit le voir quand même)
  const apres = avant.replace(/(<link\b[^>]*rel="stylesheet"[^>]*href=")[^"]*?(styles\.css")/i, '$1$2')
  if (!/<link\b[^>]*rel="stylesheet"[^>]*href="styles\.css"/i.test(apres)) echecs.push('mutation impossible : aucune feuille styles.css dans l’accueil de la commande d’exemple')
  else {
    fs.writeFileSync(idx, apres)
    const m = await parcourir({ racine, ...parcours[0], site: mute })
    if (!m.echecs.some((e) => e.startsWith('/ '))) echecs.push('détecteur aveugle : une feuille de styles en chemin relatif, servie sous /site-genere/<id> après la 308, n’est pas vue')
    else faits.push('mutation : feuille de styles relative → vue')
  }
  return { ok: !echecs.length, echecs, faits }
}

// ── GV-5 et GV-6 : les adresses d'une page mènent à cette page ; ses images existent ─────────────────────────────────────────
const lienCanonique = (html) => balises(html, 'link').find((l) => /(?:^|\s)canonical(?:\s|$)/i.test(l.rel || ''))?.href ?? null
const metaPropriete = (html, p) => balises(html, 'meta').find((m) => (m.property || m.name || '').toLowerCase() === p)?.content ?? null
/** Les blocs JSON-LD lus comme un navigateur → [{ brut, json, erreur }] */
export function jsonLds(html) {
  const out = []
  for (const m of String(html).matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>/gi)) {
    const debut = m.index + m[0].length
    const fin = String(html).slice(debut).search(/<\/script[\s/>]/i)
    const brut = fin < 0 ? String(html).slice(debut) : String(html).slice(debut, debut + fin)
    try { out.push({ brut, json: JSON.parse(brut), erreur: null }) } catch (e) { out.push({ brut, json: null, erreur: premiereLigne(e) }) }
  }
  return out
}
const valeursUrl = (o, cles) => { const out = []; const v = (x, k) => { if (typeof x === 'string') { if (cles.includes(k) && /^https?:\/\//i.test(x)) out.push([k, x]) } else if (Array.isArray(x)) x.forEach((y) => v(y, k)); else if (x && typeof x === 'object') for (const [kk, vv] of Object.entries(x)) v(vv, kk) }; v(o, ''); return out }
async function adressesVersLaPage({ racine, site, commande }) {
  const echecs = [], sv = await serviceSimule({ racine, site, commande })
  const objetDe = (chemin) => `${commande.id}${chemin.endsWith('/') ? `${chemin}index.html` : chemin}`
  const contrat = lireJson(path.join(site, 'site.json'))
  const publiques = (contrat.pages || []).filter((p) => p.type !== 'legal').map((p) => p.chemin)
  let n = 0
  const doitMener = async (u, attendu, ou) => {
    n++
    if (!u || !/^https?:\/\//i.test(u)) { echecs.push(`${ou} : « ${court(u, 60) || 'absente'} » n’est pas une adresse absolue`); return }
    const r = await sv.suivre(u)
    if (r.externe) echecs.push(`${ou} : ${court(u, 90)} n’est ni ${HOTE_PRESTI} ni le domaine de la commande`)
    else if (r.statut !== 200) echecs.push(`${ou} : ${court(u, 90)} → ${r.statut}${r.hors ? ` (${r.hors})` : ''}`)
    else if (r.objet !== attendu) echecs.push(`${ou} : ${court(u, 90)} → ${r.objet}, ${attendu} attendu (une autre page)`)
  }
  for (const f of pagesHtml(site)) {
    const html = fs.readFileSync(path.join(site, f), 'utf8'), ch = cheminDePage(f), attendu = objetDe(ch)
    await doitMener(lienCanonique(html), attendu, `${ch} canonique`)
    await doitMener(metaPropriete(html, 'og:url'), attendu, `${ch} og:url`)
    for (const ld of jsonLds(html)) {
      if (ld.erreur) { echecs.push(`${ch} : JSON-LD illisible (${ld.erreur})`); continue }
      for (const [k, u] of valeursUrl(ld.json, ['url', '@id'])) await doitMener(u, attendu, `${ch} JSON-LD ${k}`)
    }
  }
  const sitemap = lireOuNull(path.join(site, 'sitemap.xml'))?.toString('utf8') || ''
  const locs = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])
  const servis = new Set()
  for (const u of locs) { const r = await sv.suivre(u); n++; if (r.statut === 200 && r.objet) servis.add(r.objet); else echecs.push(`sitemap.xml <loc> ${court(u, 90)} → ${r.statut}${r.hors ? ` (${r.hors})` : ''}`) }
  const absentes = publiques.filter((c) => !servis.has(objetDe(c)))
  if (absentes.length) echecs.push(`page(s) publique(s) qu’aucun <loc> ne sert : ${absentes.join(', ')}`)
  const robots = lireOuNull(path.join(site, 'robots.txt'))?.toString('utf8') || ''
  const lignes = [...robots.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1])
  if (!lignes.length) echecs.push('robots.txt sans ligne Sitemap:')
  for (const u of lignes) await doitMener(u, `${commande.id}/sitemap.xml`, 'robots.txt Sitemap:')
  return { echecs: [...new Set(echecs)], n }
}
const TESTS_ADRESSE = [/^canonical = la page elle-même$/, /^sitemap\.xml liste toutes les pages/]
function siteQaAdresse(racine, site) {
  const q = siteQa(racine, site)
  if (!q.rapport) return { echecs: q.echecs, n: 0 }
  const tests = q.rapport.blocs.flatMap((b) => b.tests.map((t) => ({ ...t, bloc: b.nom }))).filter((t) => TESTS_ADRESSE.some((re) => re.test(t.nom)))
  return { echecs: tests.filter((t) => !t.passe).map((t) => `site-qa refuse : ${t.bloc} › ${t.nom} (${court(t.mesure, 80)})`), n: tests.length }
}
async function jugerCanonique({ racine, siteExemple, commandeExemple, siteDomaine, commandeDomaine }) {
  const echecs = [], faits = []
  const cas = [
    { nom: 'commande d’exemple sans domaine', site: siteExemple, commande: { id: commandeExemple.id, etat: 'en_ligne' } },
    { nom: `électricien sur ${commandeDomaine.domaine}`, site: siteDomaine, commande: { id: commandeDomaine.id, etat: 'en_ligne', domaine: commandeDomaine.domaine } },
  ]
  for (const c of cas) {
    const a = await adressesVersLaPage({ racine, ...c })
    const q = siteQaAdresse(racine, c.site)
    const e = [...a.echecs, ...q.echecs]
    if (!q.n) e.push('site-qa n’a jugé ni la canonique ni le sitemap')
    if (e.length) echecs.push(`${c.nom} : ${e.slice(0, 6).join(' ; ')}${e.length > 6 ? ` (et ${e.length - 6} autre(s))` : ''}`)
    else faits.push(`${c.nom} : ${a.n} adresse(s) (canoniques, og:url, JSON-LD, <loc>, Sitemap:) mènent chacune à sa page ; site-qa accepte ses ${q.n} contrôles d’adresse`)
  }
  // mutation : la canonique de l'accueil sur le site historique (/site/<slug>/)
  const mute = exigerSousTravail(path.join(ICI, 'mutations', 'gv5'))
  fs.rmSync(mute, { recursive: true, force: true }); fs.cpSync(siteExemple, mute, { recursive: true })
  const idx = path.join(mute, 'index.html')
  const faux = `https://${HOTE_PRESTI}/site/${commandeExemple.slug}/`
  fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace(/(<link\b[^>]*rel="canonical"[^>]*href=")[^"]*/i, `$1${faux}`))
  const vu = (await adressesVersLaPage({ racine, site: mute, commande: cas[0].commande })).echecs.some((e) => e.startsWith('/ canonique'))
  const refuse = siteQa(racine, mute).rapport?.blocs.some((b) => /^Page \/ /.test(b.nom) && b.tests.some((t) => /^canonical = la page elle-même$/.test(t.nom) && !t.passe))
  if (!vu) echecs.push(`détecteur aveugle : une canonique sur ${faux} n’est pas vue`)
  if (!refuse) echecs.push(`site-qa aveugle : une canonique de l’accueil sur ${faux} passe le juge de dépôt`)
  if (vu && refuse) faits.push(`mutation : canonique de l’accueil sur /site/<slug>/ → vue, et refusée par site-qa`)
  return { ok: !echecs.length, echecs, faits }
}
async function imagesApercu({ racine, site, commande }) {
  const echecs = [], sv = await serviceSimule({ racine, site, commande })
  let n = 0
  for (const f of pagesHtml(site)) {
    const html = fs.readFileSync(path.join(site, f), 'utf8'), ch = cheminDePage(f)
    const adresses = [['og:image', metaPropriete(html, 'og:image')], ...jsonLds(html).filter((l) => l.json).flatMap((l) => valeursUrl(l.json, ['image', 'logo']).map(([k, u]) => [`JSON-LD ${k}`, u]))]
    if (!adresses[0][1]) echecs.push(`${ch} : pas d’og:image`)
    for (const [k, u] of adresses) {
      if (!u) continue
      n++
      const r = await sv.suivre(u)
      if (r.externe) echecs.push(`${ch} ${k} : ${court(u, 90)} hors du site`)
      else if (r.statut !== 200 || !/^image\//.test(r.type)) echecs.push(`${ch} ${k} : ${court(u, 90)} → ${r.statut} ${r.type || ''}`.trim())
    }
  }
  return { echecs: [...new Set(echecs)], n }
}
async function jugerImages({ racine, siteExemple, commandeExemple, siteDomaine, commandeDomaine }) {
  const echecs = [], faits = []
  for (const c of [{ nom: 'commande d’exemple', site: siteExemple, commande: { id: commandeExemple.id, etat: 'en_ligne' } }, { nom: 'électricien', site: siteDomaine, commande: { id: commandeDomaine.id, etat: 'en_ligne', domaine: commandeDomaine.domaine } }]) {
    const r = await imagesApercu({ racine, ...c })
    if (r.echecs.length) echecs.push(`${c.nom} : ${r.echecs.slice(0, 5).join(' ; ')}${r.echecs.length > 5 ? ` (et ${r.echecs.length - 5} autre(s))` : ''}`)
    else if (!r.n) echecs.push(`${c.nom} : aucune image d’aperçu à juger`)
    else faits.push(`${c.nom} : ${r.n} image(s) d’aperçu (og:image, JSON-LD) servies en image/*`)
  }
  const mute = exigerSousTravail(path.join(ICI, 'mutations', 'gv6'))
  fs.rmSync(mute, { recursive: true, force: true }); fs.cpSync(siteExemple, mute, { recursive: true })
  const idx = path.join(mute, 'index.html')
  fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace(/(<meta\b[^>]*property="og:image"[^>]*content="[^"]*?)(-\d+)?\.webp"/i, '$1-9999.webp"'))
  const vu = (await imagesApercu({ racine, site: mute, commande: { id: commandeExemple.id, etat: 'en_ligne' } })).echecs.some((e) => e.startsWith('/ og:image'))
  if (!vu) echecs.push('détecteur aveugle : une og:image vers un fichier absent n’est pas vue'); else faits.push('mutation : og:image absente → vue')
  return { ok: !echecs.length, echecs, faits }
}

// ── GV-1 : quatre métiers, sans mot d'un autre ni identité de Lestraque ──────────────────────────────────────────────────────
function identiteLestraque() {
  const demo = path.join(R, 'public', 'sites-demo', 'lestraque')
  const bases = new Set([...listerFichiers(path.join(demo, 'images'))].map((f) => path.posix.basename(f).replace(/-\d+\.[a-z0-9]+$/i, '')).filter((b) => b.length >= 5))
  const communes = lireJson(path.join(demo, 'site.json')).communes || []
  const mono = lireJson(path.join(R, 'public', 'sites-demo', '_kit', 'monogrammes', 'lestraque.json'))
  return { bases, communes, trace: String(mono.d || '').slice(0, 32) }
}
const TEXTES_SITE = /\.(?:html?|css|js|json|xml|txt|svg|webmanifest)$/i
/** Les traces de Lestraque dans un site → liste */
export function tracesLestraque(site, idt, communesServies = []) {
  const d = []
  for (const f of [...listerFichiers(site)].sort()) {
    if (!TEXTES_SITE.test(f)) {
      const b = path.posix.basename(f).replace(/-\d+\.[a-z0-9]+$/i, '')
      if (f.startsWith('images/') && idt.bases.has(b)) d.push(`${f} : photo de Lestraque (${b})`)
      continue
    }
    const t = fs.readFileSync(path.join(site, f), 'utf8')
    if (/lestraque/i.test(t)) d.push(`${f} : « Lestraque »`)
    if (idt.trace && t.includes(idt.trace)) d.push(`${f} : le monogramme de Lestraque`)
    if (/\.html?$/i.test(f)) {
      for (const b of idt.bases) if (new RegExp(`images/${b}-\\d+\\.`).test(t)) d.push(`${f} : référence à la photo de Lestraque ${b}`)
      const texte = texteHtml(t)
      for (const c of idt.communes) if (!communesServies.includes(c) && new RegExp(`(?<![\\p{L}-])${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}-])`, 'u').test(texte)) d.push(`${f} : « ${c} », commune de Lestraque que la commande ne sert pas`)
    }
  }
  return [...new Set(d)]
}
async function jugerMetiers({ racine, siteExemple }) {
  const echecs = [], faits = []
  const dico = motsDesMetiers(racine)
  if (dico.modeles.length < 2) return { ok: false, echecs: [`${dico.modeles.length} modèle(s) sous maquettes/modeles/ : pas de dictionnaire des métiers`], faits }
  const idt = identiteLestraque()
  let siteElectricien = null, dicoElec = null
  for (const m of METIERS) {
    let prep
    try { prep = preparerMetier(m) } catch (e) { echecs.push(`${m} : ${premiereLigne(e)}`); continue }
    const g = generer(racine, prep.src, `metier-${m}`)
    if (g.code !== 0) { echecs.push(echecGeneration(`${m} (${prep.commande.communes[0]})`, g)); continue }
    const d = []
    const q = siteQa(racine, g.sortie)
    if (q.code !== 0) d.push(`site-qa --statique refuse le site (${q.echecs.length} critère(s) : ${q.echecs.slice(0, 3).join(' ; ')})`)
    const admis = [prep.commande.nom, ...prep.commande.communes, ...(prep.commande.devis?.projets || []), ...(prep.commande.devis?.delais || []), ...prep.attributions.map((a) => `${a.legende || ''} ${a.alt || ''}`), 'Réalisations'].join(' ')
    for (const f of pagesHtml(g.sortie)) for (const h of motsEtrangers(texteExamine(fs.readFileSync(path.join(g.sortie, f), 'utf8')), m, dico, admis)) d.push(`${f} : « ${h.mot} » (propre au ${h.modele}) : « ${h.extrait} »`)
    d.push(...tracesLestraque(g.sortie, idt, prep.commande.communes))
    if (d.length) echecs.push(`${m} : ${[...new Set(d)].slice(0, 5).join(' ; ')}${d.length > 5 ? ` (et ${d.length - 5} autre(s))` : ''}`)
    else faits.push(`${m} à ${prep.commande.communes[0]} : code 0 en ${g.secondes.toFixed(1)} s, site-qa --statique vert, ni mot d’un autre métier ni trace de Lestraque`)
    if (m === 'electricien') { siteElectricien = g.sortie; dicoElec = admis }
  }
  // la commande d'exemple (contenu à demo_v16 « lestraque ») : pas la DA de Lestraque (pas de monogramme)
  if (!siteExemple) echecs.push('commande d’exemple non générée (voir GV-2)')
  else {
    const mono = tracesLestraque(siteExemple, { ...idt, bases: new Set(), communes: [] }).filter((x) => /monogramme/.test(x))
    if (mono.length) echecs.push(`commande d’exemple : la direction artistique de Lestraque lui est appliquée (${mono.slice(0, 2).join(' ; ')})`)
    else faits.push('commande d’exemple : sans le monogramme de Lestraque')
  }
  // mutations : un mot du menuisier chez l'électricien ; le monogramme dans une page
  if (siteElectricien) {
    const html = fs.readFileSync(path.join(siteElectricien, 'index.html'), 'utf8')
    const motVu = motsEtrangers(texteExamine(html.replace('</h1>', ' menuiserie</h1>')), 'electricien', dico, dicoElec).some((h) => h.modele === 'menuisier')
    const mute = exigerSousTravail(path.join(ICI, 'mutations', 'gv1'))
    fs.rmSync(mute, { recursive: true, force: true }); fs.cpSync(siteElectricien, mute, { recursive: true })
    fs.writeFileSync(path.join(mute, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg"><path d="${idt.trace}"/></svg>`)
    const monoVu = tracesLestraque(mute, idt, []).some((x) => /monogramme/.test(x))
    if (!motVu) echecs.push('détecteur aveugle : « menuiserie » glissé dans le site de l’électricien n’est pas vu')
    if (!monoVu) echecs.push('détecteur aveugle : le monogramme de Lestraque glissé dans le site n’est pas vu')
    if (motVu && monoVu) faits.push('mutations : « menuiserie » chez l’électricien → vu ; monogramme de Lestraque → vu')
  }
  return { ok: !echecs.length, echecs, faits, siteElectricien }
}

// ── GV-3 : les mentions légales d'un vrai site ──────────────────────────────────────────────────────────────────────────────
export function defautsMentions(texte, { propres = false, auteurs = [] } = {}) {
  const d = []
  const t = String(texte)
  for (const [re, quoi] of [[/d[ée]monstration/i, '« démonstration »'], [/(?<![\p{L}])ficti(?:f|ve|fs|ves)(?![\p{L}])/iu, '« fictif »']]) { const m = re.exec(t); if (m) d.push(`${quoi} : « ${court(t.slice(Math.max(0, m.index - 50), m.index + 40), 100)} »`) }
  if (propres) for (const [re, quoi] of [[/wikimedia/i, '« Wikimedia »'], [/commons/i, '« Commons »'], [/licence libre/i, '« licence libre »'], [/par Presti/i, '« par Presti »']]) { const m = re.exec(t); if (m) d.push(`${quoi} alors que les photos sont celles de l’artisan : « ${court(t.slice(Math.max(0, m.index - 50), m.index + 40), 100)} »`) }
  for (const a of auteurs) if (!t.includes(a)) d.push(`auteur « ${a} » non cité`)
  return d
}
async function jugerMentions({ racine, siteElectricien }) {
  const echecs = [], faits = []
  const cmd = lireJson(path.join(DOSSIER_METIERS, 'electricien', 'commande.json'))
  const artisan = `${cmd.matiere.artisan.prenom} ${cmd.matiere.artisan.nom}`
  const propres = (a) => { const { titre_commons: _t, ...x } = a; return { ...x, auteur: artisan, licence: 'propriétaire', source: `https://${cmd.domaine}/photos/${a.base}`, modifiee: 'Non' } }
  let variante = null
  try { const p = preparerMetier('electricien', { nom: 'electricien-photos-propres', attributions: propres }); const g = generer(racine, p.src, 'electricien-photos-propres'); if (g.code !== 0) echecs.push(echecGeneration('électricien aux photos de l’artisan', g)); else variante = { site: g.sortie, auteurs: [artisan] } } catch (e) { echecs.push(`variante aux photos de l’artisan : ${premiereLigne(e)}`) }
  const cas = [
    ...(siteElectricien ? [{ nom: 'électricien (photos de Commons)', site: siteElectricien, propres: false, auteurs: [...new Set(lireJson(path.join(siteElectricien, 'attributions.json')).map((a) => a.auteur))] }] : []),
    ...(variante ? [{ nom: 'électricien (photos de l’artisan)', ...variante, propres: true }] : []),
  ]
  if (!siteElectricien) echecs.push('site de l’électricien non généré (GV-1)')
  for (const c of cas) {
    const pages = pagesHtml(c.site).filter((f) => /mentions/.test(f))
    if (!pages.length) { echecs.push(`${c.nom} : aucune page de mentions légales`); continue }
    const d = pages.flatMap((f) => defautsMentions(texteHtml(fs.readFileSync(path.join(c.site, f), 'utf8')), c).map((x) => `${f} : ${x}`))
    if (d.length) echecs.push(`${c.nom} : ${d.slice(0, 4).join(' ; ')}`)
    else faits.push(`${c.nom} : ${pages.join(', ')} sans « démonstration » ni « fictif »${c.propres ? ', ni Commons, ni licence libre, ni « par Presti »' : ''}, ${c.auteurs.length} auteur(s) cité(s)`)
  }
  const sonde = defautsMentions('Les photographies de ce site de démonstration proviennent de Wikimedia Commons, modifiées par Presti.', { propres: true })
  if (sonde.length < 3) echecs.push(`détecteur aveugle : la phrase d’aujourd’hui ne donne que ${sonde.length} défaut(s)`); else faits.push(`mutation : « site de démonstration … Wikimedia Commons … par Presti » → ${sonde.length} défauts vus`)
  return { ok: !echecs.length, echecs, faits }
}

// ── GV-4 : JSON-LD avec « </script> » dans un texte ─────────────────────────────────────────────────────────────────────────
const contientValeur = (o, v) => (typeof o === 'string' ? o === v : Array.isArray(o) ? o.some((x) => contientValeur(x, v)) : o && typeof o === 'object' ? Object.values(o).some((x) => contientValeur(x, v)) : false)
export function defautsJsonLd(html) {
  const d = []
  const lds = jsonLds(html)
  if (!lds.length) d.push('aucun JSON-LD')
  for (const l of lds) {
    if (l.erreur) d.push(`JSON-LD coupé : « ${court(l.brut.slice(-60), 70)} » (${l.erreur})`)
    else if (!contientValeur(l.json, NOM_HOSTILE)) d.push('le nom du JSON-LD n’est plus intact')
  }
  if (/<script>window\.__gv4/.test(html)) d.push('le script glissé dans le nom est dans la page')
  return d
}
async function jugerJsonLd({ racine }) {
  const echecs = [], faits = []
  const contenu = lireJson(path.join(COMMANDE_EXEMPLE, 'contenu.json'))
  let n = 0
  for (const p of Object.values(contenu.pages || {})) for (const l of p.jsonld || []) { l.name = NOM_HOSTILE; n++ }
  if (!n) return { ok: false, echecs: ['jeu d’essai : aucun JSON-LD dans commande-exemple/contenu.json'], faits }
  const src = preparerSource('jsonld-hostile', { contenu })
  const g = generer(racine, src, 'jsonld-hostile')
  if (g.code !== 0) return { ok: false, echecs: [echecGeneration('commande d’exemple au nom hostile dans le JSON-LD', g)], faits }
  let blocs = 0
  for (const f of pagesHtml(g.sortie)) { const html = fs.readFileSync(path.join(g.sortie, f), 'utf8'); blocs += jsonLds(html).length; for (const x of defautsJsonLd(html)) echecs.push(`${f} : ${x}`) }
  const vu = defautsJsonLd(`<script type="application/ld+json">${JSON.stringify({ name: NOM_HOSTILE })}</script>`).length > 0
  if (!vu) echecs.push('détecteur aveugle : un JSON-LD non échappé n’est pas vu')
  if (!echecs.length) faits.push(`${n} JSON-LD au nom « ${NOM_HOSTILE} » : ${blocs} bloc(s) lus comme un navigateur, JSON valide et nom intact, aucun script glissé ; mutation : JSON-LD non échappé → vu`)
  return { ok: !echecs.length, echecs: [...new Set(echecs)], faits }
}

// ── GV-7 : les numéros ──────────────────────────────────────────────────────────────────────────────────────────────────────
const NUMEROS = [
  { saisi: '+33 (0)2 61 91 51 05', national: '0261915105' },
  { saisi: '0033 2 61 91 51 06', national: '0261915106' },
  { saisi: '02.61.91.51.07', national: '0261915107' },
]
const NUMERO_ILLISIBLE = '+33 (0)2 61 91'
const grouper = (n) => n.replace(/(\d{2})(?=\d)/g, '$1 ')
/** Les liens d'appel des pages (là où le générateur écrit le numéro : nav, contact, pied, repli) : href et texte affiché. */
export function defautsNumero(fichiers, national) {
  const d = []
  let affiche = false, liens = 0
  for (const [f, html] of fichiers) {
    for (const m of html.matchAll(/<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/a>/gi)) {
      const href = attributs(m[1]).href
      if (href === undefined || !/^tel:/i.test(href)) continue
      liens++
      const v = decodeURIComponent(href.slice(4))
      const x = /^(?:\+33|0)(\d{9})$/.exec(v)
      if (!x || `0${x[1]}` !== national) d.push(`${f} : lien « tel:${v} », tel:+33${national.slice(1)} attendu`)
      const texte = texteHtml(m[2]).trim()
      const chiffres = texte.replace(/\D/g, '')
      if (chiffres.length >= 6) {
        const n = chiffres.startsWith('33') && chiffres.length === 11 ? `0${chiffres.slice(2)}` : chiffres
        if (n !== national) d.push(`${f} : « ${texte} » affiché sur le lien d’appel, ${grouper(national)} attendu`)
        else if (texte.replace(/[  ]/g, ' ').includes(grouper(national))) affiche = true
      }
    }
  }
  if (!liens) d.push('aucun lien d’appel')
  if (!affiche) d.push(`« ${grouper(national)} » n’est affiché sur aucun lien d’appel`)
  return [...new Set(d)]
}
async function jugerNumeros({ racine }) {
  const echecs = [], faits = []
  const base = lireCommande()
  for (const x of NUMEROS) {
    const src = preparerSource(`tel-${x.national}`, { commande: { ...base, telephone: x.saisi } })
    const g = generer(racine, src, `tel-${x.national}`)
    if (g.code !== 0) { echecs.push(echecGeneration(`« ${x.saisi} »`, g)); continue }
    const fichiers = pagesHtml(g.sortie).map((f) => [f, fs.readFileSync(path.join(g.sortie, f), 'utf8')])
    const d = defautsNumero(fichiers, x.national)
    if (d.length) echecs.push(`« ${x.saisi} » : ${d.slice(0, 4).join(' ; ')}${d.length > 4 ? ` (et ${d.length - 4} autre(s))` : ''}`)
    else faits.push(`« ${x.saisi} » → tel:+33${x.national.slice(1)}, affiché « ${grouper(x.national)} »`)
  }
  const src = preparerSource('tel-illisible', { commande: { ...base, telephone: NUMERO_ILLISIBLE } })
  const g = generer(racine, src, 'tel-illisible')
  const ecrit = fs.existsSync(path.join(g.sortie, 'index.html'))
  if (g.code === 0 || ecrit) echecs.push(`« ${NUMERO_ILLISIBLE} » (trop court) : code ${g.code}${ecrit ? ', index.html écrit' : ''} — la génération doit s’arrêter sans rien écrire`)
  else faits.push(`« ${NUMERO_ILLISIBLE} » : refusé (code ${g.code} : « ${court(g.message, 90)} »), rien d’écrit`)
  const vu = defautsNumero([['sonde.html', '<a href="tel:+330261915105">00 26 19 15 10 5</a>']], '0261915105').length >= 2
  if (!vu) echecs.push('détecteur aveugle : « tel:+330261915105 » affiché « 00 26 19 15 10 5 » n’est pas vu'); else faits.push('mutation : tel:+330… « 00 26 19 15 10 5 » → vu')
  return { ok: !echecs.length, echecs, faits }
}

// ── GV-8 : data-commande, et `commande` dans l'envoi ────────────────────────────────────────────────────────────────────────
async function jugerDataCommande({ site, commande }) {
  const echecs = [], faits = []
  let formulaires = 0
  for (const f of pagesHtml(site)) for (const m of fs.readFileSync(path.join(site, f), 'utf8').matchAll(/<form\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
    const a = attributs(m[1])
    if (!/devis/.test(a.class || '') && a['data-slug'] === undefined) continue
    formulaires++
    if (a['data-commande'] !== commande.id) echecs.push(`${f} : formulaire de devis ${a['data-commande'] === undefined ? 'sans data-commande' : `data-commande="${a['data-commande']}"`}, « ${commande.id} » attendu`)
  }
  if (!formulaires) echecs.push('aucun formulaire de devis')
  const recus = []
  const srv = await servir(site, { routes: { '/api/leads': (e) => { recus.push(e); return { statut: 200, corps: { ok: true, leadId: '00000000-0000-4000-8000-000000025210', token: 'jeton-essai', paused: true, reply: null } } } } })
  let nav = null
  try {
    nav = await lancerNavigateur('chromium')
    const ctx = await nav.newContext({ ...BUREAU, serviceWorkers: 'block' })
    await ctx.route('**/*', (r) => (r.request().url().startsWith(srv.base) ? r.continue() : r.abort('blockedbyclient')))
    const page = await ctx.newPage()
    await page.goto(`${srv.base}/`, { waitUntil: 'load', timeout: 60_000 })
    await page.waitForTimeout(500)
    const pret = await page.evaluate(() => {
      const f = document.querySelector('form.devis__form') || document.querySelector('form')
      if (!f) return 'aucun formulaire'
      f.setAttribute('data-juge', '1')
      for (const s of f.querySelectorAll('select[required]')) { const o = [...s.options].find((x) => x.value || x.textContent.trim() !== 'Choisir'); if (o) s.value = o.value || o.textContent }
      const c = f.querySelector('[name="contact"]'); if (!c) return 'pas de champ contact'
      c.value = '02 61 91 00 25'
      const b = f.querySelector('[type="submit"]'); if (!b) return 'pas de bouton d’envoi'
      b.setAttribute('data-juge-envoi', '1')
      return ''
    })
    if (pret) echecs.push(`accueil : ${pret}`)
    else {
      await page.locator('[data-juge-envoi]').scrollIntoViewIfNeeded()
      await page.locator('[data-juge-envoi]').click({ timeout: 10_000 })
      const fin = Date.now() + 6000
      while (!recus.length && Date.now() < fin) await page.waitForTimeout(100)
      if (!recus.length) echecs.push('aucun envoi sur /api/leads après le clic')
      else {
        const j = recus[0].json || {}
        if (j.commande !== commande.id) echecs.push(`envoi sans « commande » = ${commande.id} (reçu : ${JSON.stringify(j.commande)}) ; corps : ${court(JSON.stringify(j), 140)}`)
        if (j.slug !== commande.slug) echecs.push(`envoi sans le slug « ${commande.slug} » (reçu : ${JSON.stringify(j.slug)})`)
        if (!echecs.length) faits.push(`${formulaires} formulaire(s) avec data-commande ; envoi Chromium : ${court(JSON.stringify({ ...j, message: court(j.message, 30) }), 180)}`)
      }
    }
  } finally { if (nav) await nav.close().catch(() => {}); await srv.fermer() }
  return { ok: !echecs.length, echecs, faits }
}

// ── Témoin ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function construireTemoin() {
  const d = preparerTemoin(JUGE, { copier: ['lib/urls.ts', 'lib/sitesGeneres.ts', 'maquettes/modeles', 'public/sites-demo/_kit', 'public/sites-demo/_polices', 'app/site-genere', 'next.config.mjs'] })
  let n = 0
  for (const f of listerFichiers(d)) if (f.endsWith('.temoin')) { fs.renameSync(path.join(d, f), path.join(d, f.slice(0, -'.temoin'.length))); n++ }
  if (n < 3) throw new Error(`témoin incomplet : ${n} fichier(s) .temoin dans ${rel(path.join(FIXTURES, 'temoins', JUGE))}`)
  return d
}

// ── Le juge ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['critere'] })
  if (o.positionnels.length) { console.error(`✗ argument(s) inattendu(s) : ${o.positionnels.join(' ')}`); process.exit(2) }
  if (o.reel) { console.error('✗ ce juge n’a pas de mode --reel : il ne parle jamais à la production'); process.exit(2) }
  const ids = o.valeur('critere') === undefined ? IDS : o.liste('critere')
  if (o.drapeau('critere') || !ids.length || ids.some((x) => !IDS.includes(x))) { console.error(`✗ --critere attend des critères de ${IDS.join(', ')}`); process.exit(2) }
  const s = creerSortie(JUGE, ids, { racine: o.racine, temoin: o.temoin })
  const veut = (...xs) => xs.some((x) => ids.includes(x))
  if (ids !== IDS) s.note(`--critere : seulement ${ids.join(', ')}`)
  await s.executer(async () => {
    let racine = o.racine
    if (o.temoin) { racine = construireTemoin(); s.note(`témoin : ${rel(racine)} (générateur, formulaire.js et site-qa de scripts/fixtures/025/temoins/${JUGE}/)`) }
    exigerSousTravail(ICI)
    const commandeExemple = lireCommande()
    const commandeDomaine = lireJson(path.join(DOSSIER_METIERS, 'electricien', 'commande.json'))
    // la commande d'exemple, sans domaine (GV-1, GV-2, GV-5, GV-6, GV-8)
    let siteExemple = null
    if (veut('GV-1', 'GV-2', 'GV-5', 'GV-6', 'GV-8')) {
      const g = generer(racine, preparerSource('exemple'), 'exemple')
      if (g.code === 0) siteExemple = g.sortie
      else for (const id of ['GV-1', 'GV-2', 'GV-5', 'GV-6', 'GV-8'].filter((x) => ids.includes(x))) s.echoue(id, echecGeneration('commande d’exemple', g))
    }
    // GV-1 (et le site de l'électricien, lu par GV-2, GV-3, GV-5, GV-6)
    let siteElectricien = null
    if (veut('GV-1')) { const r = await jugerMetiers({ racine, siteExemple }); siteElectricien = r.siteElectricien; s.verdict('GV-1', r.ok, r.faits.join(' ; '), r.echecs.join(' ; ')) }
    if (!siteElectricien && veut('GV-2', 'GV-3', 'GV-5', 'GV-6')) {
      try { const p = preparerMetier('electricien'); const g = generer(racine, p.src, 'metier-electricien'); if (g.code === 0) siteElectricien = g.sortie; else s.note(echecGeneration('électricien', g)) } catch (e) { s.note(`électricien : ${premiereLigne(e)}`) }
    }
    const deux = { racine, siteExemple, commandeExemple, siteDomaine: siteElectricien, commandeDomaine }
    const sites = (id, f) => (siteExemple && siteElectricien ? f() : s.echoue(id, `site(s) non généré(s) : ${[!siteExemple && 'commande d’exemple', !siteElectricien && 'électricien'].filter(Boolean).join(', ')}`))
    if (veut('GV-2')) await sites('GV-2', async () => { const r = await jugerService(deux); s.verdict('GV-2', r.ok, r.faits.join(' ; '), r.echecs.join(' ; ')) })
    if (veut('GV-3')) { const r = await jugerMentions({ racine, siteElectricien }); s.verdict('GV-3', r.ok, r.faits.join(' ; '), r.echecs.join(' ; ')) }
    if (veut('GV-4')) { const r = await jugerJsonLd({ racine }); s.verdict('GV-4', r.ok, r.faits.join(' ; '), r.echecs.join(' ; ')) }
    if (veut('GV-5')) await sites('GV-5', async () => { const r = await jugerCanonique(deux); s.verdict('GV-5', r.ok, r.faits.join(' ; '), r.echecs.join(' ; ')) })
    if (veut('GV-6')) await sites('GV-6', async () => { const r = await jugerImages(deux); s.verdict('GV-6', r.ok, r.faits.join(' ; '), r.echecs.join(' ; ')) })
    if (veut('GV-7')) { const r = await jugerNumeros({ racine }); s.verdict('GV-7', r.ok, r.faits.join(' ; '), r.echecs.join(' ; ')) }
    if (veut('GV-8')) { if (!siteExemple) { if (!s.evalue('GV-8')) s.echoue('GV-8', 'commande d’exemple non générée') } else { const r = await jugerDataCommande({ site: siteExemple, commande: commandeExemple }); s.verdict('GV-8', r.ok, r.faits.join(' ; '), r.echecs.join(' ; ')) } }
  })
}
const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) await principal()
