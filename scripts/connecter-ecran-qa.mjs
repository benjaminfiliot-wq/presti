// scripts/connecter-ecran-qa.mjs — juge de la tâche 036-033 : l'écran « Mes outils » de l'outil de gestion (app/crm/outils/), qui liste
// les connexions de l'artisan et lance l'OAuth Google déjà construit et jugé (036-009, scripts/connexions-qa.mjs).
// Hors ligne : ni compte, ni base, ni réseau (le navigateur des captures refuse toute requête). Il vérifie que :
//   A. chaque outil affiché a son circuit (FOURNISSEURS_GOOGLE et CAPACITE de lib/connexions/oauth.ts), et rien d'autre n'est affiché ;
//   B. chaque bouton mène à une route qui existe, avec la méthode et le corps qu'elle attend ;
//   C. drapeau `connexions` baissé : la page répond 404 côté serveur et l'outil de gestion n'a aucun lien ;
//   D. aucun jeton ni secret côté client : colonnes lues = droits de 0193 sans les deux colonnes chiffrées, aucun module serveur ;
//   E. « Retirer » ne retire rien sans la confirmation (la vue est rendue et ses boutons pressés) ;
//   F. le retour de Google est dit en clair : « Gmail connecté. », et chaque motif de refus de la route a son message ;
//   G. l'offre passe par peut(), le navigateur ne part que vers accounts.google.com ;
//   H. captures 1440 et 390 de la vue rendue (drapeau forcé dans ce banc seulement, jamais dans lib/flags.ts), données fictives.
// Il prouve qu'il peut rougir : chaque mutant de MUTANTS doit être vu.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const RACINE = process.cwd()
const exiger = createRequire(path.join(RACINE, 'package.json'))
const ts = exiger('typescript')
const { renderToStaticMarkup } = exiger('react-dom/server')
const JSX_RUNTIME = pathToFileURL(exiger.resolve('react/jsx-runtime')).href
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8')
const existe = (f) => fs.existsSync(path.join(RACINE, f))
const PREUVE = '.orchestre/preuves/036-033'

const SRC = {
  vue: lire('app/crm/outils/vue.tsx'),
  outils: lire('app/crm/outils/Outils.tsx'),
  page: lire('app/crm/outils/page.tsx'),
  gestion: lire('app/crm/Gestion.tsx'),
}
const OAUTH = lire('lib/connexions/oauth.ts')
const ROUTES = lire('lib/connexions/routes.ts')
const MIGRATION = lire('supabase/migrations/0193_systeme_agents.sql')
const FLAGS = lire('lib/flags.ts')

// ── Ce que le circuit offre (lu dans le code jugé de 036-009, jamais recopié ici) ────────────────────────────────────────────
const FOURNISSEURS = [...(OAUTH.match(/FOURNISSEURS_GOOGLE[^=]*=\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
const CAPACITES = Object.fromEntries([...(OAUTH.match(/export const CAPACITE[^{]*\{([^}]*)\}/)?.[1] ?? '').matchAll(/([a-z_]+):\s*'([^']+)'/g)].map((m) => [m[1], m[2]]))
const MOTIFS_ROUTE = new Set([
  ...[...ROUTES.matchAll(/retourVers\('refus', '([a-z_]+)'\)/g)].map((m) => m[1]),
  ...[...OAUTH.matchAll(/motif: '([a-z_]+)'/g)].map((m) => m[1]),
  ...(/motif \|\| 'inconnu'/.test(ROUTES) ? ['inconnu'] : []),
])
const LIEU_RETOUR = ROUTES.match(/issue === 'ok' \? '([^'?]+)\?connexion=ok'/)?.[1] ?? null
const GRANT = (MIGRATION.match(/grant select \(([^)]*)\) on public\.connexions to authenticated/)?.[1] ?? '').split(',').map((c) => c.trim()).filter(Boolean)

// ── La vue, transpilée et chargée hors de Next ───────────────────────────────────────────────────────────────────────────────
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'connecter-ecran-qa-'))
let nVue = 0
async function chargerVue(source) {
  const js = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const f = path.join(TMP, `vue-${nVue++}.mjs`)
  fs.writeFileSync(f, js.replace(/(['"])react\/jsx-runtime\1/g, `'${JSX_RUNTIME}'`))
  return import(pathToFileURL(f).href)
}

/** Déplie l'arbre rendu par des composants sans état (la vue n'a aucun crochet) : la liste plate des éléments HTML. */
function deplier(n) {
  if (n == null || typeof n === 'boolean') return []
  if (Array.isArray(n)) return n.flatMap(deplier)
  if (typeof n !== 'object') return []
  if (typeof n.type === 'function') return deplier(n.type(n.props))
  return [n, ...deplier(n.props?.children)]
}

const CNX_GMAIL = { id: '00000000-0000-4000-8000-0000000000a1', fournisseur: 'gmail', compte_affiche: 'atelier.exemple@example.com', etat: 'active', motif_erreur: null,
  verifiee_le: '2026-11-03T09:12:00Z', derniere_synchro: null, expire_le: null, cree_le: '2026-11-03T09:11:00Z' }
const CNX_AGENDA = { id: '00000000-0000-4000-8000-0000000000a2', fournisseur: 'google_agenda', compte_affiche: 'atelier.exemple@example.com', etat: 'erreur',
  motif_erreur: 'essai_lecture_echoue', verifiee_le: null, derniere_synchro: null, expire_le: null, cree_le: '2026-11-02T16:40:00Z' }

function espion() {
  const appels = []
  const a = (nom) => (...x) => appels.push([nom, ...x])
  return { appels, actions: { connecter: a('connecter'), demanderRetrait: a('demanderRetrait'), confirmerRetrait: a('confirmerRetrait'), annulerRetrait: a('annulerRetrait') } }
}

/** Le juge : une fonction des sources, pour qu'un mutant puisse la faire rougir. */
async function juger(src, { captures = false } = {}) {
  const r = []
  const T = (nom, ok, detail = '') => r.push({ nom, ok: !!ok, detail })
  let V
  try { V = await chargerVue(src.vue) } catch (e) { T('Z0 la vue se transpile et se charge', false, String(e?.message ?? e).slice(0, 160)); return r }

  // A. chaque outil a son circuit
  T('A0 le circuit est lisible (FOURNISSEURS_GOOGLE, CAPACITE)', FOURNISSEURS.length === 3 && Object.keys(CAPACITES).length === 3, FOURNISSEURS.join(','))
  const declares = [...(src.vue.match(/export const OUTILS[^=]*=\s*\[([\s\S]*?)\n\]/)?.[1] ?? '').matchAll(/fournisseur: '([a-z_]+)'[^}]*?capacite: '([^']+)'/g)].map((m) => ({ f: m[1], c: m[2] }))
  T('A1 chaque outil déclaré a un circuit OAuth (FOURNISSEURS_GOOGLE)', declares.length > 0 && declares.every((o) => FOURNISSEURS.includes(o.f)), declares.map((o) => o.f).join(','))
  T('A2 chaque outil pose la même question d\'offre que le circuit (CAPACITE)', declares.length > 0 && declares.every((o) => CAPACITES[o.f] === o.c))
  T('A3 OUTILS (chargé) = OUTILS (lu) : aucun outil ajouté hors de la liste', V.OUTILS.length === declares.length && V.OUTILS.every((o) => FOURNISSEURS.includes(o.fournisseur)))
  const sp0 = espion()
  const props0 = { etat: 'pret', outils: V.OUTILS, horsOffre: false, connexions: [CNX_GMAIL, CNX_AGENDA], avis: { ton: 'ok', texte: 'Gmail connecté.' }, aConfirmer: null, occupe: null, actions: sp0.actions }
  const html0 = renderToStaticMarkup(V.VueOutils(props0))
  const affiches = [...html0.matchAll(/data-outil="([^"]+)"/g)].map((m) => m[1])
  T('A4 rendu : chaque outil affiché a son circuit, et il y en a', affiches.length > 0 && affiches.every((f) => FOURNISSEURS.includes(f)), affiches.join(','))
  T('A5 rendu : seuls les outils permis par l\'offre sont montrés (liste reçue = liste rendue)', (() => {
    const un = renderToStaticMarkup(V.VueOutils({ ...props0, outils: V.OUTILS.filter((o) => o.fournisseur === 'gmail') }))
    return [...un.matchAll(/data-outil="([^"]+)"/g)].map((m) => m[1]).join() === 'gmail'
  })())

  // B. chaque bouton mène à une route qui existe
  const fichierRoute = (u) => `app${u}/route.ts`
  const exportePost = (u) => existe(fichierRoute(u)) && /export async function POST\(/.test(lire(fichierRoute(u)))
  T(`B1 « Connecter » → ${V.ROUTE_DEMARRER} : la route existe et répond à POST`, exportePost(V.ROUTE_DEMARRER) && /demarrer\(req, dependancesReelles\(\)\)/.test(lire(fichierRoute(V.ROUTE_DEMARRER)) ))
  T(`B2 « Retirer » → ${V.ROUTE_RETIRER} : la route existe et répond à POST`, exportePost(V.ROUTE_RETIRER) && /retirer\(req, dependancesReelles\(\)\)/.test(lire(fichierRoute(V.ROUTE_RETIRER)) ))
  T('B3 la route de retour de Google existe (GET)', existe('app/api/connexions/google/retour/route.ts') && /export async function GET\(/.test(lire('app/api/connexions/google/retour/route.ts')))
  T('B4 le conteneur appelle demarrer en POST { fournisseur }', /appel<[^>]*>\(ROUTE_DEMARRER, \{ method: 'POST', body: \{ fournisseur: f \} \}\)/.test(src.outils))
  T('B5 le conteneur appelle retirer en POST { id }', /appel<[^>]*>\(ROUTE_RETIRER, \{ method: 'POST', body: \{ id \} \}\)/.test(src.outils))
  T('B6 aucune autre route n\'est appelée par l\'écran', ![...src.outils.matchAll(/['`](\/api\/[^'`]+)['`]/g)].length && ![...src.vue.matchAll(/['`](\/api\/[^'`]+)['`]/g)].filter((m) => ![V.ROUTE_DEMARRER, V.ROUTE_RETIRER].includes(m[1])).length)
  const el0 = deplier(V.VueOutils(props0))
  const boutons = el0.filter((e) => e.props?.['data-geste'] === 'connecter')
  boutons.forEach((b) => b.props.onClick())
  T('B7 rendu : un « Connecter » par outil, qui demande le bon fournisseur', boutons.length === V.OUTILS.length
    && sp0.appels.filter((a) => a[0] === 'connecter').map((a) => a[1]).join() === V.OUTILS.map((o) => o.fournisseur).join())

  // C. le drapeau
  const corpsPage = src.page.match(/export default function Page\(\) \{([\s\S]*?)\n\}/)?.[1] ?? ''
  T('C1 la page lit le drapeau `connexions` par actif() de lib/flags', /import \{ actif \} from '@\/lib\/flags'/.test(src.page))
  T('C2 drapeau baissé : notFound() est la première instruction de la page (404 serveur, rien dans le DOM)', /^\s*if \(!actif\('connexions'\)\) notFound\(\)\n\s*return <Outils \/>\s*$/.test(corpsPage))
  T('C3 la page n\'est pas un composant client (la garde tourne sur le serveur)', !/^'use client'/.test(src.page.trimStart()))
  const liens = [...src.gestion.matchAll(/href="\/crm\/outils"/g)].length
  T('C4 l\'outil de gestion a exactement un lien « Mes outils »', liens === 1)
  T('C5 ce lien n\'est rendu que drapeau levé et offre permise (actif + peut)', /const outils = actif\('connexions'\) && plan !== undefined && OUTILS\.some\(\(o\) => peut\(/.test(src.gestion)
    && /\{outils \? \(\s*<section[^>]*data-gestion-outils>[\s\S]*?href="\/crm\/outils"[\s\S]*?\) : null\}/.test(src.gestion))
  const ailleurs = (function chercher(dir, acc = []) {
    for (const n of fs.readdirSync(path.join(RACINE, dir), { withFileTypes: true })) {
      const f = `${dir}/${n.name}`
      if (n.isDirectory()) { if (f !== 'app/crm/outils') chercher(f, acc) } else if (/\.(tsx?|jsx?)$/.test(n.name) && f !== 'app/crm/Gestion.tsx' && /\/crm\/outils/.test(lire(f))) acc.push(f)
    }
    return acc
  })('app')
  T('C6 aucun autre lien vers /crm/outils dans app/ (un lien non gardé apparaîtrait drapeau baissé)', ailleurs.length === 0, ailleurs.join(', '))
  T('C7 état présent du drapeau lu dans lib/flags.ts (information : baissé = 404)', /\n\s*connexions: (true|false),/.test(FLAGS), `connexions: ${FLAGS.match(/\n\s*connexions: (true|false),/)?.[1]}`)

  // D. aucun jeton ni secret côté client
  const CLIENT = { 'vue.tsx': src.vue, 'Outils.tsx': src.outils, 'page.tsx': src.page, 'Gestion.tsx': src.gestion }
  const INTERDITS = [/secret_app/, /secret_n8n/, /access_token/, /refresh_token/, /client_secret/i, /GOOGLE_OAUTH/, /CANAUX_KEY/, /BOITE_CLE_N8N/, /supabaseAdmin/, /service_role/i,
    /process\.env/, /select\(\s*['"]\*['"]\s*\)/, /from '@\/lib\/connexions\//, /from '@\/lib\/(secretBox|supabaseAdmin|authArtisan)'/, /code_verifier|verificateur/]
  for (const [nom, s] of Object.entries(CLIENT)) {
    const vus = INTERDITS.filter((re) => re.test(s)).map(String)
    T(`D1 ${nom} : aucun jeton, secret, clé ni module serveur`, vus.length === 0, vus.join(' '))
  }
  const lues = V.COLONNES_LUES.split(',').map((c) => c.trim())
  T('D2 colonnes lues ⊆ droits de 0193 pour le navigateur, sans colonne chiffrée', GRANT.length > 5 && lues.every((c) => GRANT.includes(c)) && !lues.some((c) => /^secret/.test(c)), lues.filter((c) => !GRANT.includes(c)).join(','))
  T('D3 la seule lecture de connexions passe par COLONNES_LUES', [...src.outils.matchAll(/from\('connexions'\)\.select\(([^)]*)\)/g)].map((m) => m[1]).join() === 'COLONNES_LUES')
  T('D4 le HTML rendu ne porte ni jeton ni secret', !/token|secret|verifier/i.test(html0))

  // E. « Retirer » sans confirmation : jamais
  const sp1 = espion()
  const el1 = deplier(V.VueOutils({ ...props0, actions: sp1.actions }))
  const retirer = el1.filter((e) => e.props?.['data-geste'] === 'retirer')
  retirer.forEach((b) => b.props.onClick())
  T('E1 rendu : un « Retirer » par compte branché', retirer.length === 2)
  T('E2 presser « Retirer » demande la confirmation et ne retire rien', sp1.appels.length === 2 && sp1.appels.every((a) => a[0] === 'demanderRetrait'))
  T('E3 sans confirmation ouverte, aucun bouton ne retire', !el1.some((e) => e.props?.['data-geste'] === 'confirmer-retrait'))
  const sp2 = espion()
  const el2 = deplier(V.VueOutils({ ...props0, aConfirmer: CNX_GMAIL.id, actions: sp2.actions }))
  const conf = el2.filter((e) => e.props?.['data-geste'] === 'confirmer-retrait')
  conf.forEach((b) => b.props.onClick())
  T('E4 confirmation ouverte : « Retirer l\'accès » retire CETTE connexion, et un « Garder » existe', conf.length === 1 && sp2.appels.length === 1 && sp2.appels[0][0] === 'confirmerRetrait'
    && sp2.appels[0][1] === CNX_GMAIL.id && el2.some((e) => e.props?.['data-geste'] === 'garder'))
  T('E5 le conteneur refuse un retrait dont la ligne n\'est pas confirmée', /const confirmerRetrait = useCallback\(async \(id: string\) => \{\s*if \(aConfirmer !== id\) return/.test(src.outils))
  T('E6 le texte de confirmation dit ce qui se passe', /Retirer \{nom\} \? L’autorisation est effacée tout de suite/.test(src.vue))

  // F. le retour de Google
  T(`F1 chaque motif de refus de la route a son message en clair (${MOTIFS_ROUTE.size} motifs)`, MOTIFS_ROUTE.size >= 10 && [...MOTIFS_ROUTE].every((m) => typeof V.MOTIFS_RETOUR[m] === 'string' && V.MOTIFS_RETOUR[m].length > 20),
    [...MOTIFS_ROUTE].filter((m) => !V.MOTIFS_RETOUR[m]).join(','))
  T('F2 « ?connexion=ok » après Gmail → « Gmail connecté. »', V.avisDuRetour('ok', null, 'gmail')?.texte === 'Gmail connecté.' && V.avisDuRetour('ok', null, 'gmail')?.ton === 'ok')
  const refus = V.avisDuRetour('refus', 'portee_refusee', 'google_agenda')
  T('F3 « ?connexion=refus&motif=… » → l\'erreur en clair, nommant l\'outil', refus?.ton === 'erreur' && refus.texte.startsWith('Google Agenda n’est pas connecté.') && refus.texte.includes('décochée'))
  T('F4 un motif inconnu → un message, jamais du vide', V.avisDuRetour('refus', 'xyz', null)?.texte === V.MOTIFS_RETOUR.inconnu)
  T('F5 le conteneur lit connexion, motif (et outil) dans l\'adresse, puis nettoie l\'adresse', /p\.get\('connexion'\), p\.get\('motif'\), p\.get\('outil'\)/.test(src.outils) && /history\.replaceState/.test(src.outils))
  T('F6 rendu : l\'avis est annoncé (role=status ou alert)', /role="status" data-avis="ok">Gmail connecté\.</.test(html0))
  T(`F7 information : la route de retour mène aujourd'hui à ${LIEU_RETOUR ?? '?'} (lib/connexions/routes.ts, hors périmètre)`, !!LIEU_RETOUR)

  // G. offre et destination
  T('G1 l\'offre passe par peut(), outil par outil, fondateur = business comme le serveur', /OUTILS\.filter\(\(o\) => peut\(plan, o\.capacite\)\)/.test(src.outils) && /is_founder \? 'business'/.test(src.outils))
  T('G2 aucun verrou d\'offre en dur (plan === …)', !/plan\s*===\s*'/.test(src.outils + src.vue))
  T('G3 le navigateur ne part que vers accounts.google.com en https', V.urlGoogleSure('https://accounts.google.com/o/oauth2/v2/auth?x=1') && !V.urlGoogleSure('https://exemple.invalid/o/oauth2/v2/auth')
    && !V.urlGoogleSure('http://accounts.google.com/o/oauth2/v2/auth') && !V.urlGoogleSure('javascript:alert(1)') && !V.urlGoogleSure(undefined)
    && /if \(r\.ok && urlGoogleSure\(r\.corps\.url\)\) \{ window\.location\.assign\(r\.corps\.url\)/.test(src.outils))
  T('G4 hors offre : aucun outil, un renvoi vers les offres', /href="\/abonnement"/.test(renderToStaticMarkup(V.VueOutils({ ...props0, horsOffre: true }))) && !/data-outil=/.test(renderToStaticMarkup(V.VueOutils({ ...props0, horsOffre: true }))))
  T('G5 table absente ou erreur : un message, jamais une fausse liste', !/data-outil=/.test(renderToStaticMarkup(V.VueOutils({ ...props0, etat: 'fermee' }))) && /role="alert"/.test(renderToStaticMarkup(V.VueOutils({ ...props0, etat: 'erreur', message: 'x' }))))

  if (captures) await prendreCaptures(V, props0, T)
  return r
}

// ── H. Les captures ─────────────────────────────────────────────────────────────────────────────────────────────────────────
async function prendreCaptures(V, props, T) {
  const css = ['app/base.css', 'app/globals.css', 'app/crm/crm.css'].map(lire).join('\n')
  const page = (corps) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}
    body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
    .banc{padding:32px 40px} @media (max-width:720px){.banc{padding:20px 16px}}</style></head><body><main class="banc">${corps}</main></body></html>`
  let navigateur
  try {
    const { chromium } = exiger('playwright')
    navigateur = await chromium.launch({ args: ['--no-sandbox'] })
    const plans = [
      ['capture-1440.png', 1440, 900, props],
      ['capture-390.png', 390, 844, props],
      ['capture-390-confirmer.png', 390, 844, { ...props, avis: null, aConfirmer: CNX_GMAIL.id }],
    ]
    fs.mkdirSync(path.join(RACINE, PREUVE), { recursive: true })
    for (const [nom, l, h, p] of plans) {
      const ctx = await navigateur.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: 1 })
      const pg = await ctx.newPage()
      let sortantes = 0
      await pg.route('**/*', (route) => { sortantes++; return route.abort() }) // aucun réseau : ni police, ni image distante
      await pg.setContent(page(renderToStaticMarkup(V.VueOutils(p))), { waitUntil: 'load' })
      const debord = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      const cible = path.join(RACINE, PREUVE, nom)
      await pg.screenshot({ path: cible, fullPage: true })
      const taille = fs.statSync(cible).size
      const png = fs.readFileSync(cible)
      const largeur = png.readUInt32BE(16)
      T(`H ${nom} : PNG ${largeur} px de large, ${taille} octets, sans débordement horizontal, ${sortantes} requête sortante refusée`, png.subarray(1, 4).toString() === 'PNG' && largeur === l && taille > 8000 && debord <= 0, `débord ${debord}`)
      await ctx.close()
    }
  } catch (e) {
    T('H les captures sont prises', false, String(e?.message ?? e).slice(0, 200))
  } finally { await navigateur?.close() }
}

// ── Base, puis mutants ──────────────────────────────────────────────────────────────────────────────────────────────────────
const base = await juger(SRC, { captures: true })
let rouge = 0
for (const x of base) { console.log(`${x.ok ? 'ok  ' : 'ECHEC'} ${x.nom}${x.detail && (!x.ok || /^(A1|A4|C7)/.test(x.nom)) ? ' — ' + x.detail : ''}`); if (!x.ok) rouge++ }
console.log(`\njuge : ${base.length - rouge}/${base.length}`)

const remplacer = (s, a, b) => { if (!s.includes(a)) throw new Error('mutant sans prise : ' + a.slice(0, 60)); return s.replace(a, b) }
const MUTANTS = [
  ['M1 bouton vers une route absente (demarrer → commencer)', () => ({ ...SRC, vue: remplacer(SRC.vue, "'/api/connexions/google/demarrer'", "'/api/connexions/google/commencer'") })],
  ['M2 « Retirer » vers une route absente', () => ({ ...SRC, vue: remplacer(SRC.vue, "'/api/connexions/retirer'", "'/api/connexions/supprimer'") })],
  ['M3 outil sans circuit affiché (Outlook)', () => ({ ...SRC, vue: remplacer(SRC.vue, 'export const OUTILS: readonly Outil[] = [\n',
    "export const OUTILS: readonly Outil[] = [\n  { fournisseur: 'outlook' as Fournisseur, nom: 'Outlook', icone: 'courrier', capacite: 'canaux.email', role: 'Votre boîte Outlook.' },\n") })],
  ['M4 outil au verrou d\'offre recopié de travers (Drive sur canaux.email)', () => ({ ...SRC, vue: remplacer(SRC.vue, "{ fournisseur: 'google_drive', nom: 'Google Drive', icone: 'dossier', capacite: 'assistant'",
    "{ fournisseur: 'google_drive', nom: 'Google Drive', icone: 'dossier', capacite: 'canaux.email'") })],
  ['M5 écran visible avec le drapeau baissé (garde de la page retirée)', () => ({ ...SRC, page: remplacer(SRC.page, "  if (!actif('connexions')) notFound()\n", '') })],
  ['M6 écran visible avec le drapeau baissé (page passée côté client)', () => ({ ...SRC, page: "'use client'\n" + SRC.page })],
  ['M7 lien « Mes outils » rendu drapeau baissé', () => ({ ...SRC, gestion: remplacer(SRC.gestion, "const outils = actif('connexions') && ", 'const outils = ') })],
  ['M8 jeton ou secret dans le client (colonne chiffrée lue)', () => ({ ...SRC, vue: remplacer(SRC.vue, "expire_le, cree_le'", "expire_le, cree_le, secret_app'") })],
  ['M9 jeton ou secret dans le client (jeton manipulé par le conteneur)', () => ({ ...SRC, outils: remplacer(SRC.outils, '    const lignes = (cnx.data', "    const jeton = (cnx.data as unknown as { refresh_token?: string }[] | null)?.[0]?.refresh_token\n    const lignes = (cnx.data") })],
  ['M10 jeton ou secret dans le client (module serveur importé)', () => ({ ...SRC, outils: remplacer(SRC.outils, "import { appel } from '../client'\n", "import { appel } from '../client'\nimport { PORTEES } from '@/lib/connexions/oauth'\n") })],
  ['M11 « Retirer » sans confirmation (le bouton retire directement)', () => ({ ...SRC, vue: remplacer(SRC.vue, 'onClick={() => actions.demanderRetrait(c.id)}', 'onClick={() => actions.confirmerRetrait(c.id)}') })],
  ['M12 « Retirer » sans confirmation (garde du conteneur retirée)', () => ({ ...SRC, outils: remplacer(SRC.outils, '    if (aConfirmer !== id) return // jamais un retrait sans la confirmation de cette ligne\n', '') })],
  ['M13 un motif de refus sans message (portee_elargie)', () => ({ ...SRC, vue: SRC.vue.replace(/\n  portee_elargie: '[^\n]*',/, '') })],
  ['M14 « Gmail connecté » jamais dit', () => ({ ...SRC, vue: remplacer(SRC.vue, '`${nom} connecté.`', '`${nom} : c’est fait.`') })],
  ['M15 adresse de Google non contrôlée avant de partir', () => ({ ...SRC, outils: remplacer(SRC.outils, 'if (r.ok && urlGoogleSure(r.corps.url))', "if (r.ok && typeof r.corps.url === 'string')") })],
  ['M16 verrou d\'offre contourné (tous les outils, quelle que soit l\'offre)', () => ({ ...SRC, outils: remplacer(SRC.outils, 'OUTILS.filter((o) => peut(plan, o.capacite))', 'OUTILS.filter(() => true)') })],
]
let survivants = 0
console.log('\nmutants :')
for (const [nom, fab] of MUTANTS) {
  let mute
  try { mute = fab() } catch (e) { console.log(`SANS PRISE ${nom} — ${String(e?.message ?? e).slice(0, 80)}`); survivants++; continue }
  const echecs = (await juger(mute)).filter((x) => !x.ok)
  console.log(`${echecs.length ? 'tué     ' : 'SURVIVANT'} ${nom}${echecs.length ? ` (${echecs.map((x) => x.nom.split(' ')[0]).join(', ')})` : ''}`)
  if (!echecs.length) survivants++
}
console.log(`\nmutants tués : ${MUTANTS.length - survivants}/${MUTANTS.length}`)
fs.rmSync(TMP, { recursive: true, force: true })
process.exit(rouge || survivants ? 1 : 0)
