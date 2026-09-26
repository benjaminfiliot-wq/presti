// scripts/achat-ecrans-qa.mjs — juge des écrans de l'achat public (fiche 026-023, lot B ; critères EA de 026-035), écrit par
// Claude Code AVANT le code qu'il juge. L'exécutant (antigravity) n'y touche jamais (CLAUDE.md:23) : les captures sont
// prises par ce juge, jamais déposées.
//
//   node --import ./scripts/ts-loader.mjs scripts/achat-ecrans-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//
//   --racine=<d>  lit les sources sous <d> (défaut : le dépôt) ; HEAD est celui du dépôt git. La copie servie par next dev
//                 vient toujours de `git archive HEAD` du dépôt, plus les fichiers de travail du périmètre de 026-035 lus
//                 sous <d>.
//   --temoin      seulement EA-10 (NR) et la règle commune des preuves vides (EA-PV). Aucun serveur.
//   --reel        Claude Code seulement, après déploiement : EA-7 contre PRESTI_BASE_URL (défaut https://prestiapp.fr) et le
//                 contrôle PostgREST d'EA-9 ; .env.local chargé par le juge (rien n'est affiché) ; refusé (code 2) tant que
//                 026-035 n'est pas PASS.
//
// Les drapeaux siteCommande et siteAchatPublic sont baissés en production : le juge travaille sur une COPIE, sous
// .orchestre/travail/achat-ecrans-qa/arbre/ (git archive HEAD : app, lib, package.json, tsconfig.json, next.config.mjs,
// middleware.ts, proxy.ts, next-env.d.ts ; plus les fichiers de travail du périmètre de 026-035 et ceux des fiches amont
// 026-025, 026-027 et 026-030 que la racine porte ; node_modules et public reliés par jonction, jamais copiés ni
// effacés), y lève les deux drapeaux dans lib/flags.ts, lance `next dev` sur un port
// libre de 127.0.0.1, sans .env.local (aucune écriture possible en base : l'adresse Supabase pointe sur un port fermé),
// sert lui-même au navigateur (Playwright) la session factice et les réponses de /api/site/commander/complement, ne soumet
// aucun formulaire, et arrête le serveur par son PID dans un finally. Une seule copie, un seul serveur, un seul navigateur.
//
// Critères (cahier du juge de 026-035) :
//   EA-1  app/site/acheter/page.tsx, app/site/commander/merci/page.tsx et app/site/commander/page.tsx existent ; les deux
//         premières appellent notFound() sous !actif('siteAchatPublic') (lu dans le source). Une page absente : les critères
//         suivants sont « non jugés ».
//   EA-2  /site/acheter : source — PRIX_SITE_TEXTE et DELAI_ANNONCE importés de lib/siteCommande, aucun « 300 » ni « 48 » en
//         dur, aucun texte /premi[eè]re page|classement|garanti|douze mois|12 mois/i ; à l'écran — exactement quatre champs
//         visibles dont un de type email, une case obligatoire dont le libellé cite l'article 3 bis et mène à /cgu#site, un
//         piège website invisible (tabindex -1, aria-hidden, autocomplete off), le prix, le délai, la mention de TVA.
//   EA-3  /site/commander/merci : source — le seul fetch part d'un gestionnaire de clic, POST, corps { commande } seulement,
//         noindex ; à l'écran — aucune requête vers /api/ au chargement.
//   EA-4  /site/commander en mode compléter (GET complement servi par le juge) : l'étape « Paiement » absente, « Vos
//         prestations » présente ; l'enregistrement vise PUT /api/site/commander/complement (source) ; un 409 « profil »
//         mène à /onboarding?suite=.
//   EA-5  suiteSure sur les 10 cas de b/suite-sure.json (importée dans un processus enfant par ts-loader), plus null et
//         quatre compléments où le préfixe est bon et seul le caractère interdit décide.
//   EA-6  captures de /site/acheter et /site/commander/merci à 390 × 844 et 1440 × 900 : fichiers non vides et non
//         uniformes, sans défilement horizontal à 390 px, le centre de la case CGU répond à elementFromPoint.
//   EA-7  (--reel) drapeau baissé : /site/acheter et /site/commander/merci rendent 404.
//   EA-8  npm run typecheck (tsc --noEmit) vert sur la racine.
//   EA-9  SLUGS_RESERVES contient acheter et commander, et le diff de lib/urls.ts (depuis la dernière version sans 'acheter')
//         se limite à ces deux mots ; en --reel, aucun artisan n'a l'un de ces liens (PostgREST, service_role).
//   EA-10 (NR) lib/flags.ts, lib/siteCommande.ts, lib/siteCommandeServeur.ts, app/api/site/commander/**, app/cgu/** et
//         app/page.tsx n'ont pas changé depuis HEAD.
//   EA-PV un fichier de 0 octet dans .orchestre/preuves/026-035/ est un échec (règle commune, tous les modes).
//
// Sortie : une ligne par critère, puis « achat-ecrans-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide ou un préalable absent. Écriture seulement sous .orchestre/travail/achat-ecrans-qa/.
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import zlib from 'node:zlib'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  R, TRAVAIL, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lireRacine, sansCommentaires, importsDe,
  differentsDeHead, jugerPreuvesVides, lancerEnfant, resultatEnfant, importer, jugerDans, typecheck, chargerEnvLocal,
  fichePass, baseAvant, diffLignes, exigerSousTravail, extraireReference, fermante,
} from './fixtures/026-livraison-tresor/commun.mjs'
import { preparerEnfantB, jeuB } from './fixtures/026-livraison-tresor/b/enfant.mjs'

const JUGE = 'achat-ecrans-qa'
const FICHE = '026-035'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2))
const RAC = o.racine

const PAGE_ACHETER = 'app/site/acheter/page.tsx'
const PAGE_MERCI = 'app/site/commander/merci/page.tsx'
const PAGE_COMMANDER = 'app/site/commander/page.tsx'
const PAGE_ONBOARDING = 'app/onboarding/page.tsx'
const LIB_SUITE = 'lib/suiteSure.ts'
const LIB_URLS = 'lib/urls.ts'
const LIB_FLAGS = 'lib/flags.ts'
const LIB_SITE = 'lib/siteCommande.ts'
const PERIMETRE_035 = [PAGE_ACHETER, PAGE_MERCI, PAGE_COMMANDER, PAGE_ONBOARDING, LIB_SUITE, LIB_URLS]
// Les fichiers de travail des fiches amont (09 à 11 : 026-025, 026-027, 026-030), posés aussi quand la racine les porte : une
// fiche PASS n'est pas forcément poussée quand celle-ci se juge, et sans siteAchatPublic dans lib/flags.ts rien ne se lève.
const PERIMETRE_AMONT = ['lib/siteCommandeServeur.ts', 'lib/siteAchatPublic.ts', 'lib/siteCommande.ts', 'lib/flags.ts', 'lib/siteLivraison.ts',
  'app/api/site/commander/route.ts', 'app/api/site/commander/public/route.ts', 'app/api/site/commander/public/renvoyer/route.ts',
  'app/api/site/commander/complement/route.ts', 'app/api/stripe/webhook/route.ts', 'app/api/auth/lien/route.ts', 'app/connexion/lien/page.tsx', 'app/connexion/lien/layout.tsx']
const INCHANGES = [LIB_FLAGS, LIB_SITE, 'lib/siteCommandeServeur.ts', 'app/api/site/commander', 'app/cgu', 'app/page.tsx']
const CHEMINS_ARCHIVE = ['app', 'lib', 'package.json', 'tsconfig.json', 'next.config.mjs', 'next.config.ts', 'middleware.ts', 'proxy.ts', 'next-env.d.ts', 'postcss.config.mjs', 'postcss.config.js', 'tailwind.config.ts', 'tailwind.config.js']
const DOSSIER = path.join(TRAVAIL, JUGE)
const CLES_RETIREES = ['ANTHROPIC_ADMIN_KEY', 'ANTHROPIC_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'RESEND_API_KEY', 'CRON_SECRET', 'VERCEL_TOKEN', 'GITHUB_TOKEN', 'PUBLORA_API_KEY']

// ═══ Le processus enfant (EA-5) ═════════════════════════════════════════════════════════════════════════════════════════
if (o.enfant === 'suite') {
  const { reseau } = await preparerEnfantB({ racines: [RAC], doubles: {} })
  const res = { criteres: {} }
  const S = jeuB('suite-sure.json')
  const m = await importer(RAC, LIB_SUITE)
  await jugerDans(res, 'EA-5', () => {
    const e = []
    if (typeof m.m?.suiteSure !== 'function') return { echecs: [`${LIB_SUITE} : suiteSure absente (${m.erreur ?? 'export absent'})`] }
    if (S.cas.length !== 10) e.push(`b/suite-sure.json : ${S.cas.length} cas, 10 attendus`)
    for (const c of [...S.cas, ...S.nuls, ...(S.complements ?? [])]) {
      let r
      try { r = m.m.suiteSure(c.brut) } catch (err) { e.push(`« ${c.nom} » : suiteSure lève (${premiereLigne(err)})`); continue }
      if (r !== c.attendu) e.push(`« ${c.nom} » (${JSON.stringify(c.brut)}) → ${JSON.stringify(r)}, ${JSON.stringify(c.attendu)} attendu`)
    }
    return { echecs: e, detail: `suiteSure : ${S.cas.length} cas de b/suite-sure.json (3 gardés, 7 renvoyés vers /outils), plus null et ${(S.complements ?? []).length} compléments où seul le caractère interdit décide` }
  }, { reseau })
  resultatEnfant(JUGE, res)
} else {
  // ═══ Le juge ══════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
  if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ne vont pas ensemble')
  if (o.reel && !o.racineParDefaut) refuserAppel(JUGE, '--reel se lance sur le dépôt, pas sur une copie')
  if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuserAppel(JUGE, `--racine introuvable : ${RAC}`)

  const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
  const mode = o.temoin ? 'témoin' : o.reel ? 'réel' : 'complet'
  const COMPLET = ['EA-1', 'EA-2', 'EA-3', 'EA-4', 'EA-5', 'EA-6', 'EA-8', 'EA-9', 'EA-10']
  const IDS = o.temoin ? ['EA-10', 'EA-PV'] : [...COMPLET, ...(o.reel ? ['EA-7'] : []), 'EA-PV']
  const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${rel(RAC)}, mode ${mode}`, { nr: ['EA-10'] })
  const src = (f) => sansCommentaires(lireRacine(RAC, f) ?? '')
  const ECR = jeuB('ecrans.json')
  const INTERDITS = new RegExp(ECR.textes_interdits, 'i')
  let suite = true

  if (!o.temoin) {
    await s.critere('EA-1', () => {
      const e = []
      for (const f of [PAGE_ACHETER, PAGE_MERCI, PAGE_COMMANDER]) if (lireRacine(RAC, f) === null) e.push(`${f} absente`)
      for (const f of [PAGE_ACHETER, PAGE_MERCI]) {
        const t = src(f)
        if (!t) continue
        if (!/\bnotFound\s*\(/.test(t)) e.push(`${f} n'appelle pas notFound()`)
        if (!/actif\s*\(\s*['"]siteAchatPublic['"]\s*\)/.test(t)) e.push(`${f} ne lit pas actif('siteAchatPublic')`)
        else if (!/!\s*actif\s*\(\s*['"]siteAchatPublic['"]\s*\)[\s\S]{0,200}?\bnotFound\s*\(/.test(t)) e.push(`${f} : notFound() ne suit pas !actif('siteAchatPublic')`)
      }
      return { echecs: e, detail: `${PAGE_ACHETER}, ${PAGE_MERCI} et ${PAGE_COMMANDER} existent ; les deux premières appellent notFound() sous !actif('siteAchatPublic')` }
    })
    suite = !s.enEchec('EA-1')
    if (!suite) s.nonJuges(COMPLET.filter((id) => !['EA-1', 'EA-10'].includes(id)), 'EA-1 en échec')
  }

  // ── Lecture des sources (EA-2, EA-3, EA-4, EA-9), puis l'enfant (EA-5) ────────────────────────────────────────────────
  const eSrc = { 'EA-2': [], 'EA-3': [], 'EA-4': [] }
  const gestionnairesDeClic = (t) => new Set([...t.matchAll(/onClick\s*=\s*\{\s*(?:\(\)\s*=>\s*(?:void\s+)?)?([A-Za-z_$][\w$]*)\s*(?:\(|\})/g)].map((m) => m[1]))
  const fetchsHorsClic = (t, page) => {
    const e = []
    const g = gestionnairesDeClic(t)
    for (const m of t.matchAll(/\buseEffect\s*\(/g)) {
      const ouvre = t.indexOf('{', m.index), ferme = ouvre >= 0 ? fermante(t, ouvre) : -1
      const corps = ouvre >= 0 && ferme > ouvre ? t.slice(ouvre, ferme + 1) : ''
      if (/\bfetch\s*\(|method\s*:\s*['"]POST['"]/.test(corps)) e.push(`${page} : un useEffect poste au chargement`)
    }
    for (const f of t.matchAll(/\bfetch\s*\(/g)) {
      const decl = [...t.slice(0, f.index).matchAll(/(?:const|let|function)\s+([A-Za-z_$][\w$]*)\s*(?:=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|\()/g)].at(-1)
      const nom = decl?.[1] ?? null
      if (!nom || !g.has(nom)) e.push(`${page} : un fetch hors d'un gestionnaire de clic (dans ${nom ?? 'le corps du composant'})`)
    }
    return e
  }
  if (!o.temoin && suite) {
    {
      const brut = lireRacine(RAC, PAGE_ACHETER) ?? '', t = sansCommentaires(brut)
      const imports = importsDe(brut).filter((i) => /siteCommande/.test(i.spec)).flatMap((i) => i.noms)
      for (const n of ['PRIX_SITE_TEXTE', 'DELAI_ANNONCE']) if (!imports.includes(n)) eSrc['EA-2'].push(`${PAGE_ACHETER} n'importe pas ${n} de lib/siteCommande`)
      const sansClasses = t.replace(/className\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\})/g, '').replace(/^\s*import[^\n]*$/gm, '')
      const durs = [...sansClasses.matchAll(/(?<![\w.$-])(300|48)(?![\w.%-])/g)].map((m) => m[1])
      if (durs.length) eSrc['EA-2'].push(`${PAGE_ACHETER} écrit en dur ${[...new Set(durs)].join(' et ')} (le prix et le délai viennent des constantes)`)
      const textes = [...sansClasses.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]).concat([...sansClasses.matchAll(/(['"`])((?:(?!\1)[^\\]|\\.){4,})\1/g)].map((m) => m[2]))
      const mauvais = textes.find((x) => INTERDITS.test(x))
      if (mauvais) eSrc['EA-2'].push(`${PAGE_ACHETER} : « ${court(mauvais, 60)} » (${ECR.textes_interdits})`)
    }
    {
      const brut = lireRacine(RAC, PAGE_MERCI) ?? '', t = sansCommentaires(brut)
      eSrc['EA-3'].push(...fetchsHorsClic(t, PAGE_MERCI))
      if (!/\bfetch\s*\(/.test(t)) eSrc['EA-3'].push(`${PAGE_MERCI} : aucun fetch (le bouton « Renvoyer le lien » doit poster la commande)`)
      if (!/method\s*:\s*['"]POST['"]/.test(t)) eSrc['EA-3'].push(`${PAGE_MERCI} : le fetch n'est pas un POST`)
      if (!/body\s*:\s*JSON\.stringify\s*\(\s*\{\s*commande\s*(?::\s*[\w.]+)?\s*\}\s*\)/.test(t)) eSrc['EA-3'].push(`${PAGE_MERCI} : le corps posté n'est pas exactement { commande }`)
      const layout = lireRacine(RAC, 'app/site/commander/merci/layout.tsx') ?? ''
      const NOINDEX = /noindex|index\s*:\s*false/i
      if (!NOINDEX.test(brut) && !NOINDEX.test(layout)) eSrc['EA-3'].push(`${PAGE_MERCI} : ni la page ni son layout ne portent noindex`)
    }
    {
      const t = src(PAGE_COMMANDER)
      if (!/\/api\/site\/commander\/complement/.test(t)) eSrc['EA-4'].push(`${PAGE_COMMANDER} n'appelle pas /api/site/commander/complement`)
      const iComplement = t.indexOf('/api/site/commander/complement')
      if (iComplement >= 0 && !/method\s*:\s*['"]PUT['"]/.test(t)) eSrc['EA-4'].push(`${PAGE_COMMANDER} : aucun PUT vers /api/site/commander/complement`)
      if (!/\/onboarding\?suite=/.test(t)) eSrc['EA-4'].push(`${PAGE_COMMANDER} : aucun envoi vers /onboarding?suite= sur un 409 « profil »`)
      if (!/prestations/i.test(t)) eSrc['EA-4'].push(`${PAGE_COMMANDER} : aucune étape « Vos prestations »`)
    }
  }

  // ── Le serveur et le navigateur (EA-2, EA-3, EA-4, EA-6) ─────────────────────────────────────────────────────────────
  const retirerJonction = (p) => { try { if (fs.lstatSync(p).isSymbolicLink()) { try { fs.rmdirSync(p) } catch { fs.unlinkSync(p) } } } catch { /* absente */ } }
  const jonction = (lien, cible) => { retirerJonction(lien); fs.symlinkSync(cible, lien, 'junction') }
  const portLibre = () => new Promise((res, rej) => { const srv = net.createServer(); srv.once('error', rej); srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => res(p)) }) })
  const portFerme = (port) => new Promise((res) => { const c = net.connect({ host: '127.0.0.1', port }); c.once('connect', () => { c.destroy(); res(false) }); c.once('error', () => res(true)) })
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
  const distinctsPng = (buf) => {
    let i = 8; const idat = []
    while (i + 8 <= buf.length) { const long = buf.readUInt32BE(i); const type = buf.toString('ascii', i + 4, i + 8); if (type === 'IDAT') idat.push(buf.subarray(i + 8, i + 8 + long)); if (type === 'IEND') break; i += 12 + long }
    const brut = zlib.inflateSync(Buffer.concat(idat))
    const vus = new Set(); for (let k = 0; k < brut.length; k += 7) vus.add(brut[k])
    return vus.size
  }
  const web = { serveur: null, port: null, navigateur: null, journal: [] }
  const consigner = (t) => { web.journal.push(`${new Date().toISOString()} ${t}`) }

  async function demarrerServeur() {
    fs.mkdirSync(DOSSIER, { recursive: true })
    const arbre = exigerSousTravail(path.join(DOSSIER, 'arbre'))
    retirerJonction(path.join(arbre, 'public'))
    const x = extraireReference('HEAD', arbre, CHEMINS_ARCHIVE)
    consigner(`arbre ${x.commit.slice(0, 7)} ${x.reutilise ? 'réutilisé' : 'extrait'} (${x.fichiers} fichiers)`)
    const poses = []
    for (const f of [...PERIMETRE_035, ...PERIMETRE_AMONT]) {
      const t = lireRacine(RAC, f)
      if (t === null) continue
      const cible = path.join(arbre, f); fs.mkdirSync(path.dirname(cible), { recursive: true }); fs.writeFileSync(cible, t); poses.push(f)
    }
    const flags = path.join(arbre, LIB_FLAGS)
    let texteFlags = fs.readFileSync(flags, 'utf8')
    for (const d of ['siteCommande', 'siteAchatPublic']) {
      const re = new RegExp(`^(\\s*${d}\\s*:\\s*)false\\b`, 'm')
      if (!re.test(texteFlags) && !new RegExp(`^\\s*${d}\\s*:\\s*true\\b`, 'm').test(texteFlags)) throw new Error(`${LIB_FLAGS} de la copie ne porte pas ${d}`)
      texteFlags = texteFlags.replace(re, '$1true')
    }
    fs.writeFileSync(flags, texteFlags)
    jonction(path.join(DOSSIER, 'node_modules'), path.join(R, 'node_modules'))
    jonction(path.join(arbre, 'public'), path.join(R, 'public'))
    const port = await portLibre()
    const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', CI: '1', BROWSER: 'none', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9/doublure', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'doublure-026b', TZ: 'UTC' }
    for (const k of CLES_RETIREES) if (!['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].includes(k)) delete env[k]
    const bin = path.join(R, 'node_modules', 'next', 'dist', 'bin', 'next')
    if (!fs.existsSync(bin)) throw new Error(`next introuvable (${rel(bin)})`)
    const journal = fs.openSync(path.join(DOSSIER, 'next-dev.log'), 'w')
    const p = spawn(process.execPath, [bin, 'dev', '--port', String(port), '--hostname', '127.0.0.1'], { cwd: arbre, env, windowsHide: true, stdio: ['ignore', journal, journal] })
    web.serveur = p; web.port = port
    consigner(`next dev pid ${p.pid} sur 127.0.0.1:${port} (copie : ${poses.length} fichier(s) de travail posés : ${poses.join(', ') || 'aucun'})`)
    const debut = Date.now()
    for (;;) {
      if (p.exitCode !== null) throw new Error(`next dev s'est arrêté (code ${p.exitCode}) : ${court(fs.readFileSync(path.join(DOSSIER, 'next-dev.log'), 'utf8').split(/\r?\n/).filter(Boolean).slice(-3).join(' | '), 200)}`)
      if (Date.now() - debut > 240_000) throw new Error('next dev ne répond pas après 240 s')
      try { const r = await fetch(`http://127.0.0.1:${port}/site/acheter`, { redirect: 'manual' }); if (r.status) { consigner(`prêt en ${((Date.now() - debut) / 1000).toFixed(0)} s (GET /site/acheter → ${r.status})`); break } } catch { /* pas encore */ }
      await dormir(1000)
    }
    return { arbre, port }
  }
  async function arreterServeur() {
    const p = web.serveur
    if (!p) return
    web.serveur = null
    if (p.exitCode === null) {
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      else { try { process.kill(-p.pid, 'SIGKILL') } catch { try { p.kill('SIGKILL') } catch { /* déjà mort */ } } }
    }
    for (let i = 0; i < 20 && !(await portFerme(web.port)); i++) await dormir(500)
    consigner(`serveur arrêté (pid ${p.pid}) ; port ${web.port} ${await portFerme(web.port) ? 'libre' : 'ENCORE OCCUPÉ'}`)
  }
  const nouveauContexte = async (largeur, hauteur, reponses) => {
    const contexte = await web.navigateur.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1, locale: 'fr-FR' })
    const session = { ...ECR.session, expires_at: Math.floor(Date.now() / 1000) + 365 * 86400, expires_in: 365 * 86400, token_type: 'bearer' }
    await contexte.addInitScript(({ cle, valeur }) => { try { localStorage.setItem(cle, JSON.stringify(valeur)) } catch { /* stockage indisponible */ } }, { cle: ECR.session.cle_stockage, valeur: session })
    const requetes = []
    await contexte.route('**/api/**', async (route) => {
      const req = route.request()
      const u = new URL(req.url())
      requetes.push({ methode: req.method(), chemin: u.pathname, corps: req.postData() ?? null })
      const r = reponses(req.method(), u.pathname)
      await route.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.corps) })
    })
    return { contexte, requetes }
  }
  const reponsesCompleter = (m, chemin) => {
    if (chemin === '/api/site/commander/complement' && m === 'GET') return { status: 200, corps: ECR.complement_get }
    if (chemin === '/api/site/commander/complement' && m === 'PUT') return { status: 200, corps: { commande: ECR.complement_get.commandes[0], erreurs: ECR.complement_get.commandes[0].erreurs, complet: false } }
    if (chemin === '/api/site/commander/brouillon') return { status: 200, corps: ECR.brouillon_get }
    return { status: 503, corps: { error: 'service indisponible (doublure du juge)' } }
  }
  const reponsesProfil409 = (m, chemin) => (chemin === '/api/site/commander/complement' && m === 'GET' ? { status: 409, corps: ECR.profil_409 } : reponsesCompleter(m, chemin))
  const reponsesRien = () => ({ status: 503, corps: { error: 'service indisponible (doublure du juge)' } })

  if (!o.temoin && suite) {
    const enfant = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'suite', timeout: 120_000 })
    const c5 = enfant.res?.criteres?.['EA-5']
    const eEcran = { 'EA-2': [], 'EA-3': [], 'EA-4': [], 'EA-6': [] }
    const captures = []
    let detailServeur = ''
    try {
      const { port } = await demarrerServeur()
      const base = `http://127.0.0.1:${port}`
      const { chromium } = await import('playwright')
      web.navigateur = await chromium.launch()
      const dossierCaptures = exigerSousTravail(path.join(DOSSIER, 'captures'))
      fs.rmSync(dossierCaptures, { recursive: true, force: true }); fs.mkdirSync(dossierCaptures, { recursive: true })
      const site = lireRacine(RAC, LIB_SITE) ?? ''
      const PRIX_TEXTE = /PRIX_SITE_TEXTE\s*=\s*'([^']+)'/.exec(site)?.[1] ?? '300 €', DELAI = /DELAI_ANNONCE\s*=\s*'([^']+)'/.exec(site)?.[1] ?? '48 h ouvrées'
      for (const v of ECR.viewports) {
        const { contexte, requetes } = await nouveauContexte(v.largeur, v.hauteur, reponsesRien)
        try {
          // /site/acheter : le formulaire, à l'écran.
          const page = await contexte.newPage()
          const r = await page.goto(`${base}/site/acheter`, { waitUntil: 'networkidle', timeout: 120_000 })
          if (!r || r.status() !== 200) eEcran['EA-2'].push(`${v.largeur} × ${v.hauteur} : GET /site/acheter → ${r?.status() ?? 'sans réponse'} (drapeaux levés dans la copie)`)
          const ecran = await page.evaluate(() => {
            const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth }
            const champs = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]), select, textarea')].filter((el) => el.getAttribute('name') !== 'website' && visible(el))
            const cases = [...document.querySelectorAll('input[type=checkbox]')].map((c) => { const label = (c.id && document.querySelector(`label[for="${c.id}"]`)) || c.closest('label'); const zone = label ?? c.parentElement; const lien = zone?.querySelector('a[href]') ?? c.parentElement?.parentElement?.querySelector('a[href]'); return { required: c.required, texte: (zone?.innerText ?? '').trim(), href: lien?.getAttribute('href') ?? null } })
            const piege = document.querySelector('input[name=website]')
            const pr = piege?.getBoundingClientRect()
            return {
              champs: champs.map((el) => ({ type: el.getAttribute('type') ?? el.tagName.toLowerCase(), name: el.getAttribute('name') })),
              cases,
              piege: piege ? { tabindex: piege.getAttribute('tabindex'), ariaHidden: piege.getAttribute('aria-hidden'), autocomplete: piege.getAttribute('autocomplete'), visible: visible(piege) && pr.left >= 0 && pr.top >= 0 && pr.right <= innerWidth } : null,
              texte: document.body.innerText,
              scrollX: document.documentElement.scrollWidth > innerWidth + 1,
            }
          })
          if (ecran.champs.length !== 4) eEcran['EA-2'].push(`${v.largeur} px : ${ecran.champs.length} champ(s) visible(s) (${ecran.champs.map((c) => c.name ?? c.type).join(', ')}), 4 attendus`)
          if (!ecran.champs.some((c) => c.type === 'email')) eEcran['EA-2'].push(`${v.largeur} px : aucun champ de type email`)
          const cgu = ecran.cases.find((c) => /3\s*bis/i.test(c.texte))
          if (!cgu) eEcran['EA-2'].push(`${v.largeur} px : aucune case dont le libellé cite l'article 3 bis (${ecran.cases.length} case(s))`)
          else { if (!cgu.required) eEcran['EA-2'].push(`${v.largeur} px : la case CGU n'est pas obligatoire (required)`); if (!/\/cgu#site$/.test(cgu.href ?? '')) eEcran['EA-2'].push(`${v.largeur} px : le libellé de la case ne mène pas à /cgu#site (${cgu.href ?? 'aucun lien'})`) }
          if (!ecran.piege) eEcran['EA-2'].push(`${v.largeur} px : aucun piège input[name=website]`)
          else { if (ecran.piege.tabindex !== '-1' || ecran.piege.ariaHidden !== 'true' || ecran.piege.autocomplete !== 'off') eEcran['EA-2'].push(`${v.largeur} px : piège website tabindex=${ecran.piege.tabindex}, aria-hidden=${ecran.piege.ariaHidden}, autocomplete=${ecran.piege.autocomplete}`); if (ecran.piege.visible) eEcran['EA-2'].push(`${v.largeur} px : le piège website est visible à l'écran`) }
          for (const [nom, motif] of [['le prix', PRIX_TEXTE], ['le délai', DELAI], ['la mention de TVA', 'TVA non applicable'], ['l\'article 293 B', '293 B']]) if (!ecran.texte.includes(motif)) eEcran['EA-2'].push(`${v.largeur} px : ${nom} (« ${motif} ») n'est pas à l'écran`)
          const mauvais = INTERDITS.exec(ecran.texte)
          if (mauvais) eEcran['EA-2'].push(`${v.largeur} px : le texte visible dit « ${mauvais[0]} »`)
          if (requetes.some((q) => q.methode !== 'GET')) eEcran['EA-2'].push(`${v.largeur} px : /site/acheter envoie ${requetes.filter((q) => q.methode !== 'GET').map((q) => `${q.methode} ${q.chemin}`).join(', ')} sans qu'on ait rien soumis`)
          // EA-6 : la capture et la case.
          const fichier = path.join(dossierCaptures, `acheter-${v.largeur}x${v.hauteur}.png`)
          const png = await page.screenshot({ path: fichier, fullPage: false })
          captures.push(fichier)
          const distincts = png.length ? distinctsPng(png) : 0
          if (png.length < 5000 || distincts < 16) eEcran['EA-6'].push(`${rel(fichier)} : capture vide ou uniforme (${png.length} octets, ${distincts} valeurs distinctes)`)
          if (v.largeur === 390 && ecran.scrollX) eEcran['EA-6'].push('défilement horizontal à 390 px sur /site/acheter')
          const centre = await page.evaluate(() => {
            const c = [...document.querySelectorAll('input[type=checkbox]')].find((x) => /3\s*bis/i.test(((x.id && document.querySelector(`label[for="${x.id}"]`)) || x.closest('label') || x.parentElement)?.innerText ?? ''))
            if (!c) return { trouvee: false }
            c.scrollIntoView({ block: 'center', inline: 'nearest' })
            const r = c.getBoundingClientRect()
            const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
            return { trouvee: true, repond: !!el && (el === c || el.contains(c) || c.contains(el) || (el.closest('label') !== null && (el.closest('label') === c.closest('label') || el.closest('label')?.htmlFor === c.id))), sur: el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}` : 'rien' }
          })
          if (!centre.trouvee) eEcran['EA-6'].push(`${v.largeur} px : case CGU introuvable pour elementFromPoint`)
          else if (!centre.repond) eEcran['EA-6'].push(`${v.largeur} px : le centre de la case CGU ne répond pas (elementFromPoint → ${centre.sur})`)
          await page.close()
          // /site/commander/merci : rien ne part au chargement, capture.
          const requetesAvant = requetes.length
          const pm = await contexte.newPage()
          const rm = await pm.goto(`${base}/site/commander/merci?commande=${ECR.complement_get.commandes[0].id}`, { waitUntil: 'networkidle', timeout: 120_000 })
          if (!rm || rm.status() !== 200) eEcran['EA-3'].push(`${v.largeur} px : GET /site/commander/merci → ${rm?.status() ?? 'sans réponse'}`)
          await dormir(2000)
          const api = requetes.slice(requetesAvant)
          if (api.length) eEcran['EA-3'].push(`${v.largeur} px : /site/commander/merci appelle ${api.map((q) => `${q.methode} ${q.chemin}`).join(', ')} au chargement`)
          const texteMerci = await pm.evaluate(() => ({ texte: document.body.innerText, scrollX: document.documentElement.scrollWidth > innerWidth + 1, bouton: !!document.querySelector('button') }))
          if (!/lien/i.test(texteMerci.texte) || !texteMerci.bouton) eEcran['EA-3'].push(`${v.largeur} px : la page merci ne montre pas le message du lien et un bouton « Renvoyer le lien »`)
          const fm = path.join(dossierCaptures, `merci-${v.largeur}x${v.hauteur}.png`)
          const pngM = await pm.screenshot({ path: fm, fullPage: false })
          captures.push(fm)
          const dM = pngM.length ? distinctsPng(pngM) : 0
          if (pngM.length < 5000 || dM < 16) eEcran['EA-6'].push(`${rel(fm)} : capture vide ou uniforme (${pngM.length} octets, ${dM} valeurs distinctes)`)
          if (v.largeur === 390 && texteMerci.scrollX) eEcran['EA-6'].push('défilement horizontal à 390 px sur /site/commander/merci')
          await pm.close()
        } finally { await contexte.close() }
      }
      // EA-4 : /site/commander en mode compléter, puis le 409 « profil ».
      {
        const { contexte, requetes } = await nouveauContexte(1440, 900, reponsesCompleter)
        try {
          const page = await contexte.newPage()
          const id = ECR.complement_get.commandes[0].id
          await page.goto(`${base}/site/commander?commande=${id}`, { waitUntil: 'networkidle', timeout: 120_000 })
          await page.waitForFunction(() => /prestations/i.test(document.body.innerText), null, { timeout: 30_000 }).catch(() => {})
          const etat = await page.evaluate(() => ({ texte: document.body.innerText, url: location.href }))
          if (!requetes.some((q) => q.methode === 'GET' && q.chemin === '/api/site/commander/complement')) eEcran['EA-4'].push('la page ne demande pas GET /api/site/commander/complement')
          if (!/vos prestations/i.test(etat.texte)) eEcran['EA-4'].push('l\'étape « Vos prestations » n\'est pas à l\'écran en mode compléter')
          const etapePaiement = /^\s*(?:\d+[.)]?\s*)?(?:le\s+)?paiement\s*$/im.exec(etat.texte) ?? /étape[^\n]{0,30}paiement|paiement[^\n]{0,30}étape|\bpayer\s+maintenant\b/i.exec(etat.texte)
          if (etapePaiement) eEcran['EA-4'].push(`l'écran en mode compléter montre encore une étape de paiement (« ${court(etapePaiement[0].trim(), 60)} »)`)
          if (requetes.some((q) => q.methode === 'PUT' || q.methode === 'POST')) eEcran['EA-4'].push(`un ${requetes.find((q) => q.methode !== 'GET').methode} est parti sans qu'on ait rien enregistré`)
          await page.close()
        } finally { await contexte.close() }
        const { contexte: c2 } = await nouveauContexte(1440, 900, reponsesProfil409)
        try {
          const page = await c2.newPage()
          const id = ECR.complement_get.commandes[0].id
          await page.goto(`${base}/site/commander?commande=${id}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
          let arrivee = null
          try { await page.waitForURL((u) => /\/onboarding\?suite=/.test(u.href), { timeout: 30_000 }); arrivee = page.url() } catch { arrivee = null }
          if (!arrivee) eEcran['EA-4'].push(`un 409 « profil » ne mène pas à /onboarding?suite=… (adresse : ${court(page.url(), 80)})`)
          else { const suiteParam = new URL(arrivee).searchParams.get('suite') ?? ''; if (!suiteParam.startsWith('/site/commander') || !suiteParam.includes(id)) eEcran['EA-4'].push(`/onboarding?suite=${court(suiteParam, 60)} : /site/commander?commande=${id} attendu`) }
          await page.close()
        } finally { await c2.close() }
      }
      detailServeur = `next dev sur 127.0.0.1:${port} (copie de HEAD, drapeaux levés dans la copie seulement, sans .env.local)`
    } catch (err) {
      const m = `serveur ou navigateur : ${premiereLigne(err)}`
      for (const id of Object.keys(eEcran)) eEcran[id].push(m)
    } finally {
      try { await web.navigateur?.close() } catch { /* déjà fermé */ }
      web.navigateur = null
      await arreterServeur()
      retirerJonction(path.join(DOSSIER, 'arbre', 'public'))
      try { fs.writeFileSync(path.join(DOSSIER, 'journal.log'), web.journal.join('\n') + '\n') } catch { /* dossier absent */ }
    }
    s.juger('EA-2', [...eSrc['EA-2'], ...eEcran['EA-2']], `source : PRIX_SITE_TEXTE et DELAI_ANNONCE importés, ni 300 ni 48 en dur, aucun texte interdit ; à l'écran (390 et 1440) : 4 champs dont un email, case obligatoire « 3 bis » → /cgu#site, piège website invisible, prix, délai et TVA affichés ; ${detailServeur}`)
    s.juger('EA-3', [...eSrc['EA-3'], ...eEcran['EA-3']], `source : un seul fetch POST { commande } depuis un gestionnaire de clic, noindex ; à l'écran : aucune requête vers /api/ au chargement de /site/commander/merci`)
    s.juger('EA-4', [...eSrc['EA-4'], ...eEcran['EA-4']], `mode compléter (GET complement servi par le juge) : « Vos prestations » présente, aucune étape de paiement, rien d'envoyé ; source : PUT /api/site/commander/complement ; 409 « profil » → /onboarding?suite=/site/commander?commande=<id>`)
    if (c5) s.juger('EA-5', c5.echecs, c5.detail); else s.echoue('EA-5', `l'enfant n'a rien rendu pour EA-5 (code ${enfant.code}) — ${court(enfant.sortie?.trim().split(/\r?\n/).filter((l) => !l.startsWith('@@')).slice(-2).join(' | ') ?? '', 200)}`)
    s.juger('EA-6', eEcran['EA-6'], `${captures.length} captures sous ${rel(path.join(DOSSIER, 'captures'))} (${captures.map((f) => path.basename(f)).join(', ')}), non vides et non uniformes, sans défilement horizontal à 390 px ; le centre de la case CGU répond à elementFromPoint`)

    await s.critere('EA-8', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })
    await s.critere('EA-9', () => {
      const e = []
      const cur = lireRacine(RAC, LIB_URLS)
      if (cur === null) return { echecs: [`${LIB_URLS} absent`] }
      const bloc = /SLUGS_RESERVES\s*=\s*new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/.exec(sansCommentaires(cur))
      const slugs = bloc ? [...bloc[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []
      for (const m of ['acheter', 'commander']) if (!slugs.includes(m)) e.push(`SLUGS_RESERVES ne contient pas '${m}'`)
      const base = baseAvant(LIB_URLS, /'acheter'/)
      if (base.texte === null) e.push(`${LIB_URLS} : aucune version sans 'acheter' dans l'historique`)
      else {
        const d = diffLignes(base.texte, cur)
        const nettoyer = (l) => l.replace(/'(?:acheter|commander)'\s*,?\s*/g, '').replace(/\s+/g, ' ').trim()
        const retraits = d.retraits.filter((l) => l.texte.trim()).map((l) => nettoyer(l.texte)), ajouts = d.ajouts.filter((l) => l.texte.trim()).map((l) => nettoyer(l.texte))
        if (JSON.stringify(retraits) !== JSON.stringify(ajouts)) e.push(`${LIB_URLS} (base ${base.commit.slice(0, 7)}) : le diff ne se limite pas aux mots 'acheter' et 'commander' (retirées : ${retraits.map((x) => `« ${court(x, 40)} »`).join(', ') || 'aucune'} ; ajoutées : ${ajouts.map((x) => `« ${court(x, 40)} »`).join(', ') || 'aucune'})`)
      }
      return { echecs: e, detail: `SLUGS_RESERVES contient acheter et commander ; le diff de ${LIB_URLS} depuis ${base.commit?.slice(0, 7)} se limite à ces deux mots` }
    })
  }

  {
    await s.critere('EA-10', () => {
      const e = []
      for (const f of INCHANGES) e.push(...differentsDeHead(RAC, f).map((x) => `${x} (interdit à 026-035)`))
      return { echecs: e, detail: `${INCHANGES.join(', ')} inchangés depuis HEAD` }
    })
  }

  // ── EA-7 et le contrôle PostgREST d'EA-9 (--reel) ─────────────────────────────────────────────────────────────────────
  if (o.reel) {
    if (!fichePass(FICHE)) { s.echoue('EA-7', `préalable absent : la fiche ${FICHE} n'est pas PASS (pages non déployées)`); s.finir(); process.exit(2) }
    chargerEnvLocal()
    const manque = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !process.env[k])
    if (manque.length) { s.echoue('EA-7', `préalable absent : ${manque.join(', ')} (.env.local)`); s.finir(); process.exit(2) }
    const BASE = (process.env.PRESTI_BASE_URL || 'https://prestiapp.fr').replace(/\/$/, '')
    const e = []
    let detail = ''
    try {
      const baisse = /^\s*siteAchatPublic\s*:\s*false\b/m.test(lireRacine(RAC, LIB_FLAGS) ?? '')
      const attendu = baisse ? 404 : 200
      const statuts = []
      for (const chemin of ['/site/acheter', '/site/commander/merci']) { const r = await fetch(`${BASE}${chemin}`, { redirect: 'manual' }); statuts.push(r.status); if (r.status !== attendu) e.push(`GET ${chemin} → ${r.status}, ${attendu} attendu (drapeau ${baisse ? 'baissé' : 'levé'} dans ${LIB_FLAGS})`) }
      const { createClient } = await import('@supabase/supabase-js')
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data, error } = await admin.from('artisans').select('id, slug').in('slug', ['acheter', 'commander'])
      if (error) e.push(`PostgREST : ${error.message}`)
      else if (data?.length) e.push(`${data.length} artisan(s) portent déjà le lien acheter ou commander : à signaler à Benj avant le push`)
      detail = `sur ${BASE} : /site/acheter → ${statuts[0]}, /site/commander/merci → ${statuts[1]} (drapeau ${baisse ? 'baissé' : 'levé'}) ; aucun artisan avec le lien acheter ou commander`
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) }
    s.juger('EA-7', e, detail)
  }

  jugerPreuvesVides(s, 'EA', RAC, FICHE)
  process.exit(s.finir())
}
