#!/usr/bin/env node
// scripts/landing-v2-qa.mjs — le juge de la landing v2 (chantier 2, lot 5, tâche 033-002), écrit par Claude Code AVANT que la page soit finie.
//
// Il dit ce qu'une page conforme au prompt 4 de Benj doit tenir (plans/011-cadrage-01-11/prompts-benj/p4-landing.md) et au plan du chantier 2
// (§0 bis, §5) : 19 règles LV-1 à LV-19, jouées HORS LIGNE sur le RENDU SERVEUR de la page (react-dom/static, pas de navigateur, pas de build) et,
// là où le rendu ne tranche pas, sur ses sources et ses feuilles :
//   · « en dur » est une propriété de la source (un « 59 € » lu dans lib/plans.ts et un « 59 € » tapé se rendent pareil) → LV-2(a), LV-18(a) ;
//   · le drapeau se lit dans lib/flags.ts (arbre syntaxique) et dans la porte de app/page.tsx → LV-5 ;
//   · les couleurs vivent dans les feuilles, que le rendu n'applique pas → LV-3, LV-13 ; les feuilles partagées (app/globals.css, app/accueil.css,
//     app/base.css) ne sont lues que pour leurs règles dont un sélecteur n'emploie que des classes et des id présents dans le HTML, plus :root, html, body.
//
// Le harnais (scripts/fixtures/landing-v2-qa/harnais.mjs) transpile les modules avec `typescript` et rend avec `react-dom/static` (rien de natif) ;
// il remplace par des modules neutres, listés à chaque passage, next/link, next/image, next/navigation, next/dynamic, next/script, next/font/*,
// next/headers et les paquets qui ne se chargent pas dans Node (three, gsap…). Jamais un composant de la page. `postcss` (venu de Next, non
// déclaré au package.json) lit les feuilles.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/landing-v2-qa.mjs [--structure] [--test=LV-3,LV-12] [--garder]
//   (sans option)  la PAGE : les 19 règles sur la vraie page, puis les mutants rejoués sur elle. Code 0 seulement si les 19 sont vertes et chaque
//                  mutant attrapé. ROUGE tant que la tâche 033-003 (la v2) n'est pas finie : c'est attendu. C'est ce mode qui entrera dans SUITES.
//   --structure    le verifier de 033-002 ; ne lit RIEN de la page en construction (ni app/, ni components/, ni lib/ du dépôt vivant) :
//                    S1 le témoin (scripts/fixtures/landing-v2-qa/temoin/) : 19 vertes sur 19, aucun faux rouge sur une page conforme ;
//                    S2 chaque mutant, appliqué à l'artefact du témoin, est attrapé par la règle visée ;
//                    S3 la v2 de référence (plans/011-cadrage-01-11/briefs/landing-v2-reference/) rougit sur ses défauts connus, en les citant ;
//                    S4 chaque détecteur éprouvé sur des sondes (fautes vues, justes laissées) ;
//                    S5 le lanceur : promesses-qa.mjs, geo-presti-qa.mjs et landing-v2-qa.mjs déclarés, mutation prouvée.
//                  L'arbre de HEAD est extrait avec `git archive` ; hors dépôt git (copie d'Oracle), le cliché figé .orchestre/travail/landing-v2-qa/tete-figee/.
// Sortie : une ligne par règle (PASS LV-n — … / FAIL LV-n — …), puis « N réussis, M échoués » (lu par scripts/tout-verifier.mjs).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'
import {
  R, TRAVAIL, arbre, construire, rendre, analyserPage, analyserHtml, analyserCss, elements, ancetres, descendants, texteVisible, nettoyer, court, sansCommentaires, lireTexte,
} from './fixtures/landing-v2-qa/harnais.mjs'
import {
  REGLES, PAGES, couleursDe, classeCouleur, FEUILLES_PARTAGEES, TITRE_ENSUITE, ETAPES, CLASSES_BOUTONS, MOTS_DRAPEAUX, estBlocDemo, LIBELLES,
} from './fixtures/landing-v2-qa/regles.mjs'
import { jouerSondesTexte, jouerSondesCouleur, jouerSondesDiverses } from './fixtures/landing-v2-qa/sondes.mjs'
import { git, extraireTar } from './fixtures/025/commun.mjs'

const args = process.argv.slice(2)
const STRUCTURE = args.includes('--structure')
const GARDER = args.includes('--garder')
const SEUL = (args.find((a) => a.startsWith('--test=')) ?? '').slice(7).split(',').filter(Boolean)
const TEMOIN = path.join(R, 'scripts', 'fixtures', 'landing-v2-qa', 'temoin')
const TETE_FIGEE = path.join(TRAVAIL, 'tete-figee')
const REFERENCE_TSX = path.join(R, 'plans/011-cadrage-01-11/briefs/landing-v2-reference/LandingV2.tsx.txt')
const REFERENCE_CSS = path.join(R, 'plans/011-cadrage-01-11/briefs/landing-v2-reference/landing-v2.css.txt')
const ENTREES = { '/': 'app/page.tsx', '/offres': 'app/offres/page.tsx', '/comparatif': 'app/comparatif/page.tsx', '/contact': 'app/contact/page.tsx' }
const HORS_SOURCES = ['lib/plans.ts', 'lib/flags.ts', 'lib/siteCommande.ts']
const IDS = Array.from({ length: 19 }, (_, i) => `LV-${i + 1}`)

const sortie = []
const dire = (l = '') => { sortie.push(l); console.log(l) }
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12)
let compteurBuild = 0

// ── Le drapeau et les portes : transformations de source par l'arbre syntaxique ──────────────────────────────────────────────────────────────
function leverDrapeau(source) {
  const sf = ts.createSourceFile('flags.ts', source, ts.ScriptTarget.ES2022, true)
  let plage = null
  const v = (n) => {
    if (ts.isPropertyAssignment(n) && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) && n.name.text === 'landingV2' && n.initializer.kind === ts.SyntaxKind.FalseKeyword) plage = [n.initializer.getStart(sf), n.initializer.getEnd()]
    ts.forEachChild(n, v)
  }
  v(sf)
  return plage ? source.slice(0, plage[0]) + 'true' + source.slice(plage[1]) : source
}
/** `actif('landingV2')`, `FLAGS.landingV2` ou `FLAGS['landingV2']` → `true`. `etat.touche` dit si l'ancre existait. */
function forcerPorte(etat) {
  return (source) => {
    const sf = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX)
    const plages = []
    const v = (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'actif' && n.arguments[0] && ts.isStringLiteral(n.arguments[0]) && n.arguments[0].text === 'landingV2') plages.push([n.getStart(sf), n.getEnd()])
      else if (ts.isPropertyAccessExpression(n) && n.name.text === 'landingV2') plages.push([n.getStart(sf), n.getEnd()])
      else if (ts.isElementAccessExpression(n) && ts.isStringLiteral(n.argumentExpression) && n.argumentExpression.text === 'landingV2') plages.push([n.getStart(sf), n.getEnd()])
      else ts.forEachChild(n, v)
    }
    v(sf)
    if (plages.length) etat.touche = true
    let t = source
    for (const [d, f] of plages.sort((a, b) => b[0] - a[0])) t = t.slice(0, d) + 'true' + t.slice(f)
    return t
  }
}
const composer = (a, b) => (s) => b(a ? a(s) : s)

// ── L'arbre de HEAD (git archive) ou le cliché figé d'Oracle ──────────────────────────────────────────────────────────────────────────────
function listerDossier(d, base = d, res = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) listerDossier(p, base, res); else res.push(path.relative(base, p).split(path.sep).join('/')) }
  return res.sort()
}
function empreinteDossier(d) {
  const h = crypto.createHash('sha256')
  for (const f of listerDossier(d)) h.update(f + '\0').update(fs.readFileSync(path.join(d, f))).update('\0')
  return h.digest('hex')
}
function fournirTete() {
  const g = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: R, encoding: 'utf8' })
  if (g.status === 0 && /^[0-9a-f]{40}$/.test(g.stdout.trim())) {
    const sha1 = g.stdout.trim()
    const dest = path.join(TRAVAIL, 'tete-git')
    fs.rmSync(dest, { recursive: true, force: true }); fs.mkdirSync(TRAVAIL, { recursive: true })
    const tar = path.join(TRAVAIL, 'tete-git.tar')
    const a = git(['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'archive', '--format=tar', `--output=${tar.split(path.sep).join('/')}`, sha1, 'app', 'components', 'lib', 'public/llms.txt'])
    if (a.code !== 0) throw new Error(`git archive ${sha1.slice(0, 8)} : ${court(a.stderr)}`)
    extraireTar(tar, dest); fs.rmSync(tar, { force: true })
    return { racine: dest, origine: `git archive HEAD ${sha1.slice(0, 8)}` }
  }
  if (fs.existsSync(TETE_FIGEE)) return { racine: TETE_FIGEE, origine: `cliché figé (hors dépôt git) ${TETE_FIGEE.replace(R + path.sep, '')}, empreinte ${empreinteDossier(TETE_FIGEE).slice(0, 12)}` }
  throw new Error('ni dépôt git (git rev-parse HEAD) ni cliché figé .orchestre/travail/landing-v2-qa/tete-figee/ : question à options pour la session principale')
}

// ── L'artefact : les pages rendues, leurs sources, leurs feuilles, les drapeaux ───────────────────────────────────────────────────────────────
export function trouverBloc(racine) {
  const portent = elements(racine).filter((e) => nettoyer(texteVisible(e)).includes(TITRE_ENSUITE))
  if (!portent.length) return null
  const prof = (e) => ancetres(e).length
  const profond = portent.sort((a, b) => prof(b) - prof(a))[0]
  const chaine = [profond, ...ancetres(profond)].filter((e) => e.type === 'el' && !['main', 'body', '#racine', 'html'].includes(e.tag))
  const t = (e) => nettoyer(texteVisible(e))
  const cadre = chaine.find((e) => ['section', 'aside', 'article'].includes(e.tag) && /d[ée]mo/i.test(t(e)) && /entreprise/i.test(t(e)))
  return cadre ?? chaine.find((e) => /d[ée]mo/i.test(t(e))) ?? profond.parent
}
function sourcesDe(b, rel, A0) {
  const res = {}
  for (const m of b.fermeture(rel)) {
    const s = b.source(m)
    if (s == null || !/\.(tsx?|jsx?|mjs)$/.test(m)) continue
    res[m] = { brut: s, sansCommentaires: sansCommentaires(s) }
  }
  return res
}
function feuillesDe(b, rel) {
  const ferm = b.fermeture(rel)
  return [...new Set(b.feuilles.filter((f) => ferm.has(f.importeur) && !f.absente).map((f) => f.rel))]
}
const motifQs = (id) => (id === '/contact' ? 'motif=entreprise' : '')
function drapeauxDe(source) {
  const sf = ts.createSourceFile('flags.ts', source ?? '', ts.ScriptTarget.ES2022, true)
  const res = {}
  const v = (n) => {
    if (ts.isPropertyAssignment(n) && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) && (n.initializer.kind === ts.SyntaxKind.TrueKeyword || n.initializer.kind === ts.SyntaxKind.FalseKeyword)) res[n.name.text] = n.initializer.kind === ts.SyntaxKind.TrueKeyword
    ts.forEachChild(n, v)
  }
  v(sf)
  return res
}

/**
 * cfg : { racine, repli, nom, jugees, surcharges, versionLeve, publicSecours, lirePlanChantier4 }
 * → artefact { arbre, pages{id}, prod{id}, flagsSource, drapeaux, plans, essaiJours, prixPresti, css{rel}, horsSources, jugees, extra, stubs, manquants, notes }
 */
async function construireArtefact(cfg) {
  const nom = `${cfg.nom ?? 'a'}-${++compteurBuild}`
  const A0 = arbre(cfg.racine, cfg.repli ?? null)
  const jugees = cfg.jugees ?? PAGES
  const dispo = Object.entries(ENTREES).filter(([id, rel]) => jugees.includes(id) && A0.chemin(rel))
  const absentes = Object.entries(ENTREES).filter(([id, rel]) => jugees.includes(id) && !A0.chemin(rel))
  const surch = cfg.surcharges ?? {}
  const surchV2 = { ...surch, 'lib/flags.ts': composer(surch['lib/flags.ts'], leverDrapeau) }
  const entreesV2 = [...dispo.map(([, rel]) => rel), 'lib/plans.ts']
  const bV2 = await construire({ arbre: A0, entrees: entreesV2, surcharges: surchV2, nom: `${nom}-v2` })
  const bProd = dispo.length ? await construire({ arbre: A0, entrees: dispo.map(([, rel]) => rel), surcharges: surch, nom: `${nom}-prod` }) : null
  const A = {
    arbre: A0, pages: {}, prod: {}, css: {}, extra: {}, jugees, horsSources: HORS_SOURCES, notes: [], stubs: bV2.stubs, manquants: bV2.manquants,
    publicSecours: cfg.publicSecours ?? null, planChantier4: cfg.planChantier4 ?? null,
  }
  for (const [id, rel] of absentes) A.pages[id] = { id, erreur: `${rel} absent de l’arbre (page non construite)`, entree: rel }
  for (const [id, rel] of dispo) {
    const r = await rendre(bV2, rel, { qs: motifQs(id), chemin: id })
    const Pg = { id, entree: rel, html: r.html, metadonnees: r.metadonnees, notFound: r.notFound, erreur: r.erreur }
    if (!r.erreur && !r.notFound) {
      Pg.sources = sourcesDe(bV2, rel, A0)
      Pg.feuilles = feuillesDe(bV2, rel)
      if (id === '/contact' && !trouverBloc(analyserHtml(Pg.html))) {
        // Le motif n'est lu qu'après le montage : le composant du bloc, rendu seul (la suite dit lequel).
        const candidats = [...bV2.fermeture(rel)].filter((m) => /\.(tsx|jsx)$/.test(m) && m !== rel && /entreprise/i.test(bV2.source(m) ?? '') && /d[ée]mo/i.test(bV2.source(m) ?? ''))
        for (const cand of candidats) {
          const bs = await construire({ arbre: A0, entrees: [cand], surcharges: surchV2, nom: `${nom}-bloc` })
          const rs = await rendre(bs, cand, { qs: motifQs(id), chemin: id })
          if (rs.html && nettoyer(texteVisible(analyserHtml(rs.html))).includes(TITRE_ENSUITE)) {
            Pg.html = rs.html; Pg.bloc = { mode: 'seul', module: cand }
            Pg.sources = { ...Pg.sources, ...sourcesDe(bs, cand, A0) }
            Pg.feuilles = [...new Set([...Pg.feuilles, ...feuillesDe(bs, cand)])]
            break
          }
        }
      }
    }
    A.pages[id] = Pg
    const rp = await rendre(bProd, rel, { qs: motifQs(id), chemin: id, vercelEnv: 'production' })
    A.prod[id] = { id, html: rp.html, notFound: rp.notFound, erreur: rp.erreur }
  }
  for (const Pg of Object.values(A.pages)) for (const f of Pg.feuilles ?? []) if (A.css[f] == null) A.css[f] = A0.lire(f)
  if (A0.lire('app/base.css') != null) A.css['app/base.css'] = A0.lire('app/base.css')
  for (const f of bV2.feuilles) if (f.absente) A.notes.push(`feuille importée mais absente de l’arbre : ${f.rel} (importée par ${f.importeur})`)
  const flagsBrut = A0.lire('lib/flags.ts')
  A.flagsSource = flagsBrut == null ? null : (surch['lib/flags.ts'] ? surch['lib/flags.ts'](flagsBrut) : flagsBrut)
  A.drapeaux = drapeauxDe(A.flagsSource)
  const mod = await import(bV2.urlsEntrees['lib/plans.ts'])
  A.plans = mod.PLANS; A.essaiJours = mod.ESSAI_JOURS
  const prix = new Set(Object.values(mod.PLANS).map((p) => p.prixMois).filter((n) => n > 0))
  const sc = A0.lire('lib/siteCommande.ts'); const mp = sc && /PRIX_SITE_TEXTE\s*=\s*'(\d[\d\s]*)\s*€/.exec(sc)
  if (mp) prix.add(parseInt(mp[1].replace(/\s/g, ''), 10))
  A.prixPresti = prix
  fs.rmSync(path.join(TRAVAIL, `${nom}-v2`), { recursive: true, force: true })
  fs.rmSync(path.join(TRAVAIL, `${nom}-prod`), { recursive: true, force: true })
  return A
}

/** Analyse (ou ré-analyse) le HTML de chaque page d'un artefact : rien ne se garde d'un passage à l'autre. */
function preparer(A) {
  for (const src of [A.pages, A.prod]) {
    for (const [id, Pg] of Object.entries(src)) {
      if (!Pg.html || Pg.notFound || Pg.erreur) { delete Pg.a; continue }
      Pg.a = analyserPage({ html: Pg.html, metadonnees: id === '/contact' ? [] : Pg.metadonnees ?? [], choisirPortee: id === '/contact' && src === A.pages ? trouverBloc : null })
      Pg.a.bloc = id === '/contact' && src === A.pages && Pg.a.portee !== Pg.a.racine ? Pg.a.portee : null
    }
  }
  return A
}
function cloner(A) {
  const B = { ...A, pages: {}, prod: A.prod, css: { ...A.css }, extra: { ...A.extra } }
  for (const [id, Pg] of Object.entries(A.pages)) { const { a, ...reste } = Pg; B.pages[id] = { ...reste, sources: Pg.sources ? Object.fromEntries(Object.entries(Pg.sources).map(([k, v]) => [k, { ...v }])) : Pg.sources } }
  return B
}

// ── Les règles, jouées ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function jouer(A, ids = IDS) {
  const res = []
  for (const id of ids) {
    let r
    try { r = REGLES[id](A) } catch (e) { r = { id, fautes: [`exception : ${String(e?.stack ?? e).split('\n').slice(0, 3).join(' | ')}`], vu: '' } }
    res.push(r)
  }
  return res
}
const ok = (r) => r.fautes.length === 0
function ligne(r) {
  if (ok(r)) return `PASS ${r.id} — ${r.vu}`
  const [f, ...autres] = r.fautes
  return `FAIL ${r.id} — ${court(f, 240)}${autres.length ? ` (+${autres.length} autre(s))` : ''}`
}

// ── Les mutants ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const ancre = (msg) => { throw new Error(`ancre introuvable : ${msg}`) }
const edits = (Pg, f) => {
  const r = analyserHtml(Pg.html)
  const l = f(r)
  if (!l || !l.length) ancre('aucun endroit où appliquer le mutant')
  let h = Pg.html
  for (const [d, e, t] of [...l].sort((a, b) => b[0] - a[0])) h = h.slice(0, d) + t + h.slice(e)
  Pg.html = h
}
const finDe = (n) => n.fin - `</${n.tag}>`.length
const mainDe = (r) => elements(r, (e) => e.tag === 'main')[0] ?? ancre('<main>')
const sectionsDe = (r) => elements(mainDe(r), (e) => e.tag === 'section' && !ancetres(e).some((a) => a.tag === 'section'))
const inserer = (Pg, texte, ou = (r) => finDe(mainDe(r))) => edits(Pg, (r) => [[ou(r), ou(r), texte]])
const blocDe = (Pg) => trouverBloc(analyserHtml(Pg.html)) ?? ancre('le bloc de démo de /contact')
const insererDansBloc = (Pg, texte) => edits(Pg, (r) => { const b = trouverBloc(r) ?? ancre('le bloc de démo de /contact'); return [[finDe(b), finDe(b), texte]] })
const accueil = (A) => A.pages['/'] ?? ancre('la page /')
const nomLien = (e) => nettoyer(e.attrs['aria-label'] ?? texteVisible(e))
const feuillePropre = (A) => (A.pages['/'].feuilles ?? []).find((f) => !FEUILLES_PARTAGEES.includes(f)) ?? ancre('aucune feuille propre à la page (hors app/globals.css, app/accueil.css, app/base.css)')
const sourcePropre = (A, id = '/') => Object.keys(A.pages[id].sources ?? {}).find((rel) => !HORS_SOURCES.includes(rel) && /^app\/.*\.tsx$/.test(rel)) ?? ancre('aucune source de la page')
const ajouterSource = (A, rel, code) => { for (const id of Object.keys(A.pages)) { const s = A.pages[id].sources?.[rel]; if (s) { s.brut += `\n${code}\n`; s.sansCommentaires += `\n${code}\n` } } }

export const MUTANTS = [
  { test: 'LV-1', nom: 'une 8e section (plan)', appliquer: (A) => inserer(accueil(A), '<section id="mutant-8e"><h2>Section en trop</h2><p>Texte neutre.</p></section>') },
  { test: 'LV-1', nom: 'un second h1', appliquer: (A) => inserer(accueil(A), '<h1>Un second titre</h1>') },
  { test: 'LV-2', nom: '« 59 € » dans le JSX (plan)', appliquer: (A) => ajouterSource(A, sourcePropre(A), 'export const MUTANT_PRIX = <b>59 €</b>') },
  { test: 'LV-2', nom: '« Presti répond à vos appels »', appliquer: (A) => inserer(accueil(A), '<p>Presti répond à vos appels.</p>') },
  { test: 'LV-2', nom: '« vos messages WhatsApp »', appliquer: (A) => inserer(accueil(A), '<p>Retrouvez vos messages WhatsApp dans Presti.</p>') },
  { test: 'LV-3', nom: 'color:#2563eb en ligne', appliquer: (A) => edits(accueil(A), (r) => { const h = elements(mainDe(r), (e) => e.tag === 'h2')[0] ?? ancre('un <h2>'); return [[h.ouvrantFin - 1, h.ouvrantFin - 1, ' style="color:#2563eb"']] }) },
  { test: 'LV-3', nom: '#3EE0F0 dans une feuille propre à la page', appliquer: (A) => { A.css[feuillePropre(A)] += '\n.lp2-mutant-cyan{color:#3EE0F0}\n' } },
  { test: 'LV-4', nom: 'href="/page-absente"', appliquer: (A) => edits(accueil(A), (r) => { const a = elements(mainDe(r), (e) => e.tag === 'a' && /^\//.test(e.attrs.href ?? ''))[0] ?? ancre('un lien interne dans <main>'); return [[a.debut, a.ouvrantFin, A.pages['/'].html.slice(a.debut, a.ouvrantFin).replace(/href="[^"]*"/, 'href="/page-absente"')]] }) },
  { test: 'LV-4', nom: 'href="#ancre-absente"', appliquer: (A) => edits(accueil(A), (r) => { const a = elements(mainDe(r), (e) => e.tag === 'a' && /^\//.test(e.attrs.href ?? ''))[0] ?? ancre('un lien interne dans <main>'); return [[a.debut, a.ouvrantFin, A.pages['/'].html.slice(a.debut, a.ouvrantFin).replace(/href="[^"]*"/, 'href="#ancre-absente"')]] }) },
  { test: 'LV-5', nom: 'landingV2: true dans l’arbre de test (plan)', reconstruire: (cfg) => ({ ...cfg, surcharges: { ...cfg.surcharges, 'lib/flags.ts': composer(cfg.surcharges?.['lib/flags.ts'], leverDrapeau) } }) },
  { test: 'LV-5', nom: 'actif(\'landingV2\') remplacé par true dans la porte de app/page.tsx', reconstruire: (cfg, etat) => ({ ...cfg, surcharges: { ...cfg.surcharges, 'app/page.tsx': composer(cfg.surcharges?.['app/page.tsx'], forcerPorte(etat)) } }) },
  { test: 'LV-5', nom: 'le bloc de démo de /contact ne lit plus le drapeau', appliquer: (A) => { const Pg = A.pages['/contact'] ?? ancre('/contact'); for (const s of Object.values(Pg.sources ?? {})) s.sansCommentaires = s.sansCommentaires.replace(/landingV2/g, 'landingVx') } },
  { test: 'LV-6', nom: '« Places limitées : dernière chance »', appliquer: (A) => inserer(accueil(A), '<p>Places limitées : dernière chance.</p>') },
  { test: 'LV-6', nom: '« 02:59:59 »', appliquer: (A) => inserer(accueil(A), '<p>L’offre se termine dans 02:59:59</p>') },
  { test: 'LV-7', nom: '« 2 000 € de CA en plus »', appliquer: (A) => inserer(accueil(A), '<p>2 000 € de CA en plus chaque mois.</p>') },
  { test: 'LV-7', nom: '« combien il vous rapporte » (lib/demoScenes.ts:29)', appliquer: (A) => inserer(accueil(A), '<p>Le chantier, sa marge, combien il vous rapporte.</p>') },
  { test: 'LV-8', nom: '« Résultats garantis »', appliquer: (A) => inserer(accueil(A), '<p>Résultats garantis</p>') },
  { test: 'LV-9', nom: '« ★★★★★ »', appliquer: (A) => inserer(accueil(A), '<p>★★★★★</p>') },
  { test: 'LV-9', nom: '« 1 200 artisans l’utilisent »', appliquer: (A) => inserer(accueil(A), '<p>1 200 artisans l’utilisent.</p>') },
  { test: 'LV-9', nom: 'une image de personne', appliquer: (A) => inserer(accueil(A), '<img src="/people/artisan.jpg" alt="Portrait d’un artisan souriant" width="200" height="200">') },
  { test: 'LV-9', nom: 'un logo tiers', appliquer: (A) => inserer(accueil(A), '<img src="/logos/capeb.svg" alt="Logo CAPEB" width="80" height="40">') },
  { test: 'LV-10', nom: '<del>99 €</del>', appliquer: (A) => inserer(accueil(A), '<p><del>99 €</del></p>') },
  { test: 'LV-10', nom: '« -20 % avec le code PRESTI20 »', appliquer: (A) => inserer(accueil(A), '<p>-20 % avec le code PRESTI20</p>') },
  { test: 'LV-11', nom: '« hébergé chez Supabase » dans le bloc de démo de /contact (plan)', appliquer: (A) => insererDansBloc(A.pages['/contact'] ?? ancre('/contact'), '<p>Hébergé chez Supabase.</p>') },
  { test: 'LV-11', nom: '« nos agents » hors du bloc 6', appliquer: (A) => inserer(accueil(A), '<p>Nos agents répondent à vos clients.</p>') },
  { test: 'LV-12', nom: 'la puce « Exemple » retirée de la fenêtre du hero (plan)', appliquer: (A) => edits(accueil(A), (r) => {
    const s1 = sectionsDe(r)[0] ?? ancre('la section 1')
    const demo = elements(s1, estBlocDemo)[0] ?? ancre('la fenêtre de démo de la section 1')
    const l = []
    for (const n of [demo, ...descendants(demo)]) if (n.type === 'texte' && /exemples?/i.test(n.texte)) l.push([n.debut, n.fin, A.pages['/'].html.slice(n.debut, n.fin).replace(/exemples?/gi, '')])
    return l
  }) },
  { test: 'LV-12', nom: 'un montant sans « Exemple » dans une carte de la section 4', appliquer: (A) => edits(accueil(A), (r) => { const s4 = sectionsDe(r)[3] ?? ancre('la section 4'); return [[finDe(s4), finDe(s4), '<figure class="lp2-carte"><h3>Carte en trop</h3><p>873,40 €</p></figure>']] }) },
  { test: 'LV-13', nom: 'une annotation verte', appliquer: (A) => { A.css[feuillePropre(A)] += '\n.lp2-annotation{color:var(--ok)}\n'; inserer(accueil(A), '<span class="lp2-annotation">Annotation</span>') } },
  { test: 'LV-13', nom: 'une pastille violette (plan)', appliquer: (A) => { A.css[feuillePropre(A)] += '\n.lp2-pastille{background:#8A6BFF}\n'; inserer(accueil(A), '<i class="lp2-pastille"></i>') } },
  { test: 'LV-13', nom: '--ok redéfini à #46C89A par une règle de la feuille propre (question 8)', appliquer: (A) => { A.css[feuillePropre(A)] += '\n.lp2{--ok:#46C89A}\n' } },
  { test: 'LV-14', nom: 'deux phrases dans le h1 (plan)', appliquer: (A) => edits(accueil(A), (r) => { const h = elements(r, (e) => e.tag === 'h1')[0] ?? ancre('le h1'); return [[h.ouvrantFin, finDe(h), 'Une première phrase. Une seconde phrase.']] }) },
  { test: 'LV-15', nom: 'un chiffre dans le h1', appliquer: (A) => edits(accueil(A), (r) => { const h = elements(r, (e) => e.tag === 'h1')[0] ?? ancre('le h1'); return [[finDe(h), finDe(h), ' en 3 étapes']] }) },
  { test: 'LV-15', nom: '« en moins d’une minute » dans la sous-phrase', appliquer: (A) => edits(accueil(A), (r) => {
    const h = elements(r, (e) => e.tag === 'h1')[0] ?? ancre('le h1')
    const section = ancetres(h).find((a) => a.tag === 'section') ?? mainDe(r)
    const tous = [...descendants(section)]
    const p = tous.slice(tous.indexOf(h) + 1).find((e) => e.type === 'el' && e.tag === 'p' && nettoyer(texteVisible(e))) ?? ancre('la sous-phrase')
    return [[finDe(p), finDe(p), ' en moins d’une minute']]
  }) },
  { test: 'LV-15', nom: '« en moins d’une minute » dans le JSON-LD', appliquer: (A) => edits(accueil(A), (r) => {
    const s = elements(r, (e) => e.tag === 'script' && /ld\+json/i.test(e.attrs.type ?? ''))[0] ?? ancre('un script JSON-LD')
    const t = s.enfants[0] ?? ancre('le contenu du JSON-LD')
    const o = JSON.parse(t.texte); o.description = `${o.description ?? ''} Réponse prête en moins d’une minute.`
    return [[t.debut, t.fin, JSON.stringify(o)]]
  }) },
  { test: 'LV-16', nom: '« Relance J+2 planifiée » (la puce de la v2)', appliquer: (A) => inserer(accueil(A), '<span class="lp-puce">Relance J+2 planifiée</span>') },
  { test: 'LV-16', nom: '« Rien ne part sans vous »', appliquer: (A) => inserer(accueil(A), '<p>Rien ne part sans vous.</p>') },
  { test: 'LV-17', nom: '« Essayer gratuitement » au lieu d’« Essayer Presti »', appliquer: (A) => edits(accueil(A), (r) => elements(r, (e) => e.tag === 'a' && nomLien(e) === nettoyer(LIBELLES.essayer)).map((a) => [a.ouvrantFin, finDe(a), 'Essayer gratuitement'])) },
  { test: 'LV-17', nom: '« Demander une démo » en bouton plein', appliquer: (A) => edits(accueil(A), (r) => elements(r, (e) => e.tag === 'a' && nomLien(e) === nettoyer(LIBELLES.demo)).map((a) => [a.debut, a.ouvrantFin, A.pages['/'].html.slice(a.debut, a.ouvrantFin).replace('lp-btn--g', 'lp-btn--p')])) },
  { test: 'LV-17', nom: 'un bouton de classe inconnue (lp-btn--z)', appliquer: (A) => inserer(accueil(A), '<a class="lp-btn lp-btn--z" href="/signup">Un autre bouton</a>') },
  { test: 'LV-18', nom: '« 14 jours » rendu puis tapé dans la source (plan)', appliquer: (A) => { inserer(accueil(A), '<p>14 jours gratuits, sans carte.</p>'); ajouterSource(A, sourcePropre(A), "export const MUTANT_JOURS = '14 jours'") } },
  { test: 'LV-18', nom: '« Essentiel » sur /offres', appliquer: (A) => inserer(A.pages['/offres'] ?? ancre('/offres'), '<p>Essentiel</p>') },
  { test: 'LV-19', nom: '« sous 24 h » dans le bloc', appliquer: (A) => insererDansBloc(A.pages['/contact'] ?? ancre('/contact'), '<p>Réponse sous 24 h.</p>') },
  { test: 'LV-19', nom: 'un mot changé à l’étape 2', appliquer: (A) => edits(A.pages['/contact'] ?? ancre('/contact'), (r) => {
    const b = trouverBloc(r) ?? ancre('le bloc'); const n = [...descendants(b)].find((x) => x.type === 'texte' && /une démonstration sur vos propres cas/.test(x.texte)) ?? ancre('l’étape 2')
    return [[n.debut, n.fin, A.pages['/contact'].html.slice(n.debut, n.fin).replace('démonstration', 'présentation')]]
  }) },
  { test: 'LV-19', nom: 'une seconde copie des étapes dans un autre module', appliquer: (A) => { A.extra['app/contact/copie-etapes.ts'] = `export const COPIE = ${JSON.stringify(ETAPES)}\n` } },
]
async function jouerMutants(A, cfg, ids = null) {
  const res = []
  const base = {}
  for (const m of MUTANTS) {
    if (ids && !ids.includes(m.test)) continue
    let B
    try {
      if (m.reconstruire) {
        const etat = { touche: false }
        B = preparer(await construireArtefact({ ...m.reconstruire(cfg, etat), nom: 'mutant' }))
        if (m.nom.includes('actif(') && !etat.touche) throw new Error('ancre introuvable : actif(\'landingV2\') ou FLAGS.landingV2 dans la porte de app/page.tsx')
      } else {
        B = cloner(A); m.appliquer(B); preparer(B)
      }
    } catch (e) { res.push({ ...m, ok: false, raison: String(e.message).split('\n')[0] }); continue }
    const r = jouer(B, [m.test])[0]
    // Attrapé = la règle visée porte une faute que l'artefact intact n'avait pas : une règle déjà rouge pour une autre raison (page absente…) ne prouve rien.
    if (!base[m.test]) base[m.test] = new Set(jouer(A, [m.test])[0].fautes)
    const neuves = r.fautes.filter((f) => !base[m.test].has(f))
    res.push({ ...m, ok: neuves.length > 0, raison: neuves.length ? court(neuves[0], 150) : ok(r) ? `NON attrapé : ${m.test} reste vert (${r.vu})` : `NON démontré : ${m.test} était déjà rouge (${base[m.test].size} faute(s)) et le mutant n’y ajoute rien` })
  }
  return res
}

// ── S3 : la référence ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function preparerReference(tete) {
  const dossier = path.join(TRAVAIL, 'reference')
  fs.rmSync(dossier, { recursive: true, force: true })
  fs.mkdirSync(path.join(dossier, 'app'), { recursive: true })
  fs.writeFileSync(path.join(dossier, 'app', 'LandingV2.tsx'), lireTexte(REFERENCE_TSX))
  fs.writeFileSync(path.join(dossier, 'app', 'landing-v2.css'), lireTexte(REFERENCE_CSS))
  fs.writeFileSync(path.join(dossier, 'app', 'page.tsx'), "import LandingV2 from './LandingV2'\n// Porte de test de landing-v2-qa : la référence est servie telle quelle.\nexport default function Page() { return <LandingV2 /> }\n")
  return dossier
}
// [règle, motif de la chaîne citée, ce qu'elle cite, nombre minimal de fautes qui la citent]. Lignes de LandingV2.tsx.txt : 168-340 (10 sections),
// 67, 151 et 180 (« moins d'une minute »), 191 (« Relance J+2 planifiée »), 175 et 344 (« Essayer gratuitement »), 173 et 215 (PLANS.essentiel.label).
const ATTENDUS_REFERENCE = [
  ['LV-1', /\b(8|9|10) <section>/, '8 à 10 sections', 1],
  ['LV-15', /moins d’une minute/, '« moins d’une minute »', 3],
  ['LV-16', /Relance J\+2 planifiée/, '« Relance J+2 planifiée »', 1],
  ['LV-17', /Essayer gratuitement/, '« Essayer gratuitement »', 2],
  ['LV-18', /Essentiel/, 'l’Essentiel', 2],
]

// ── S5 : le lanceur ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function lireLanceur() {
  const texte = lireTexte(path.join(R, 'scripts', 'tout-verifier.mjs'))
  const sf = ts.createSourceFile('tout-verifier.mjs', texte, ts.ScriptTarget.ES2022, true)
  const suites = []; const hors = []; let ordreCles = []
  const v = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'SUITES' && n.initializer && ts.isArrayLiteralExpression(n.initializer)) {
      n.initializer.elements.forEach((e, i) => {
        if (!ts.isObjectLiteralExpression(e)) return
        const o = {}
        for (const p of e.properties) if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) o[p.name.text] = p.initializer.getText(sf)
        suites.push({ ...o, i, ligne: sf.getLineAndCharacterOfPosition(e.getStart(sf)).line + 1, pos: e.getFullStart(), texteEntier: e.getText(sf) })
      })
    }
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'HORS_LANCEUR' && n.initializer && ts.isObjectLiteralExpression(n.initializer)) {
      for (const p of n.initializer.properties) if (ts.isPropertyAssignment(p)) { const k = p.name.getText(sf).replace(/^['"]|['"]$/g, ''); ordreCles.push(k); hors.push({ cle: k, raison: p.initializer.getText(sf) }) }
    }
    ts.forEachChild(n, v)
  }
  v(sf)
  return { texte, suites, hors, ordreCles }
}
function copierArbre(src, dest, filtre = () => true) {
  fs.rmSync(dest, { recursive: true, force: true })
  for (const f of listerDossier(src)) { if (!filtre(f)) continue; fs.mkdirSync(path.dirname(path.join(dest, f)), { recursive: true }); fs.copyFileSync(path.join(src, f), path.join(dest, f)) }
}
function lancerNode(argv, cwd) {
  const r = spawnSync('node', argv, { cwd, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024 })
  return { code: r.status, sortie: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}
function s5(tete) {
  const lignes = []
  const point = (nom, bon, detail) => lignes.push({ nom, ok: !!bon, detail })
  const L = lireLanceur()
  const cherche = (script) => L.suites.find((s) => (s.args ?? '').includes(`scripts/${script}`))
  const geo = cherche('geo-presti-qa.mjs'), pro = cherche('promesses-qa.mjs')
  const idxIndex = L.suites.findIndex((s) => /Indexation et white-label/.test(s.nom ?? ''))
  point('S5.1 geo-presti-qa.mjs est dans SUITES, cout gratuit', geo && /gratuit/.test(geo.cout ?? ''), geo ? `l.${geo.ligne}` : 'absent')
  point('S5.2 promesses-qa.mjs est dans SUITES, cout gratuit', pro && /gratuit/.test(pro.cout ?? ''), pro ? `l.${pro.ligne}` : 'absent')
  point('S5.3 elles suivent « Indexation et white-label »', geo && pro && idxIndex >= 0 && [geo.i, pro.i].every((i) => i > idxIndex && i <= idxIndex + 3), `entrées ${idxIndex} → ${geo?.i}, ${pro?.i}`)
  const avant = geo ? L.texte.slice(0, geo.texteEntier ? L.texte.indexOf(geo.texteEntier) : 0) : ''
  point('S5.4 une ligne de commentaire datée les précède', /\/\/ \d{2}\/11[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*$/.test(avant.slice(-600)) || /\/\/ 0[23]\/11\/2026[^\n]*\n\s*$/.test(avant.slice(-400)), court(avant.slice(-160).replace(/\n/g, ' ⏎ '), 150))
  point('S5.5 ni promesses-qa.mjs ni geo-presti-qa.mjs dans HORS_LANCEUR', !L.hors.some((h) => /promesses-qa|geo-presti-qa/.test(h.cle)), 'une suite rouge sur HEAD ne se cache pas')
  const hl = L.hors.find((h) => h.cle === 'landing-v2-qa.mjs')
  point('S5.6 landing-v2-qa.mjs est dans HORS_LANCEUR, en tête, avec sa raison', hl && L.ordreCles[0] === 'landing-v2-qa.mjs' && /rouge|033-003|n.est pas finie/i.test(hl.raison), hl ? `1re clé : ${L.ordreCles[0]} ; ${court(hl.raison, 120)}` : 'absent')
  point('S5.7 landing-v2-qa.mjs n’est pas dans SUITES (rouge tant que la v2 n’est pas finie)', !cherche('landing-v2-qa.mjs'), '')
  // Mutation prouvée, sur l'arbre de HEAD extrait.
  const t = path.join(TRAVAIL, 's5')
  fs.rmSync(t, { recursive: true, force: true }); fs.mkdirSync(t, { recursive: true })
  const saine = path.join(t, 'saine')
  copierArbre(tete, saine)
  const geoJuge = path.join(R, 'scripts', 'geo-presti-qa.mjs')
  const v0 = lancerNode([geoJuge], saine)
  point('S5.8 geo-presti-qa.mjs : verte sur l’arbre de HEAD extrait', v0.code === 0, court(v0.sortie.trim().split('\n').pop(), 140))
  const ge2 = path.join(t, 'sabote-ge2'); copierArbre(tete, ge2)
  fs.writeFileSync(path.join(ge2, 'app/page.tsx'), fs.readFileSync(path.join(ge2, 'app/page.tsx'), 'utf8').replace(/FAQPage/g, 'FaqSupprimee'))
  const r2 = lancerNode([geoJuge], ge2)
  point('S5.9 geo-presti-qa.mjs : rouge sur GE-2 (FAQPage ôté de app/page.tsx)', r2.code !== 0 && /GE-2/.test(r2.sortie), court((r2.sortie.match(/GE-2[^\n]*/) ?? [''])[0], 140))
  const ge5 = path.join(t, 'sabote-ge5'); copierArbre(tete, ge5)
  const llms = path.join(ge5, 'public/llms.txt')
  const avantLlms = fs.readFileSync(llms, 'utf8')
  fs.writeFileSync(llms, avantLlms.replace(/(Studio : )\d+( € par mois)/, '$1' + '49' + '$2'))
  const r5 = lancerNode([geoJuge], ge5)
  point('S5.10 geo-presti-qa.mjs : rouge sur GE-5 (un prix changé dans public/llms.txt)', avantLlms !== fs.readFileSync(llms, 'utf8') && r5.code !== 0 && /GE-5/.test(r5.sortie), court((r5.sortie.match(/GE-5[^\n]*/) ?? [''])[0], 140))
  // promesses-qa : la mutation se prouve par DIFFÉRENCE (PR-7 sur la copie saine, puis sur la copie sabotée), car hors dépôt git la référence 1620723 manque.
  const pj = path.join(R, 'scripts', 'promesses-qa.mjs')
  const p0 = lancerNode([pj, `--racine=${saine}`], R)
  const l7 = (s) => (s.match(/(?:PASS|FAIL) PR-7[^\n]*/) ?? ['(ligne PR-7 absente)'])[0]
  const sab = path.join(t, 'sabote-pr7'); copierArbre(tete, sab)
  const hero = path.join(sab, 'app/HeroApp.tsx')
  fs.writeFileSync(hero, fs.readFileSync(hero, 'utf8') + "\nexport const SABOTAGE_PR7 = <p>Presti a répondu en 41 s.</p>\n")
  const p1 = lancerNode([pj, `--racine=${sab}`], R)
  const nomme = /41 s/.test(l7(p1.sortie)) || /41 s/.test(fs.existsSync(path.join(R, '.orchestre/travail/promesses-qa/releve.txt')) ? fs.readFileSync(path.join(R, '.orchestre/travail/promesses-qa/releve.txt'), 'utf8') : '')
  point('S5.11 promesses-qa.mjs : PR-7 rouge sur « répondu en 41 s » dans une scène de la landing', p1.code !== 0 && /FAIL PR-7/.test(p1.sortie) && nomme && !/41 s/.test(l7(p0.sortie)), `saine : ${court(l7(p0.sortie), 80)} | sabotée : ${court(l7(p1.sortie), 160)}`)
  const vertesSaine = ['PR-8', 'PR-9', 'PR-10', 'PR-11', 'PR-12'].filter((x) => new RegExp(`PASS ${x}\\b`).test(p0.sortie))
  point('S5.12 promesses-qa.mjs : l’état de la copie saine est dit (jamais caché)', true, `sortie ${p0.code === 0 ? 'verte' : 'ROUGE'} (code ${p0.code}) ; vertes : ${vertesSaine.join(' ')} ; rouges : ${(p0.sortie.match(/FAIL PR-\d+/g) ?? []).join(' ') || 'aucune'}`)
  return lignes
}

// ── Les modes ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function imprimerRegles(res) {
  for (const r of res) {
    dire(ligne(r))
    if (!ok(r)) for (const f of r.fautes.slice(0, 6)) dire(`      · ${court(f, 300)}`)
  }
}

async function modeStructure() {
  let reussis = 0, echoues = 0
  const compter = (b) => { if (b) reussis++; else echoues++ }
  dire('landing-v2-qa --structure : ne lit rien de la page en construction (ni app/, ni components/, ni lib/ du dépôt vivant)')
  const tete = fournirTete()
  dire(`  · arbre de HEAD : ${tete.origine}`)
  // S1 — le témoin
  dire('\nS1 — le témoin conforme : 19 vertes sur 19 (aucun faux rouge sur une page juste)')
  const cfgT = { racine: TEMOIN, repli: tete.racine, nom: 'temoin' }
  const T = preparer(await construireArtefact(cfgT))
  dire(`  · remplacements du harnais : ${T.stubs.join(', ') || 'aucun'} ; modules absents rendus transparents : ${T.manquants.join(', ') || 'aucun'}`)
  const r1 = jouer(T)
  for (const r of r1) { dire(ligne(r)); if (!ok(r)) for (const f of r.fautes.slice(0, 4)) dire(`      · ${court(f, 260)}`); compter(ok(r)) }
  // S2 — les mutants
  dire('\nS2 — chaque mutant, appliqué à l’artefact du témoin, est attrapé par la règle visée')
  const ms = await jouerMutants(T, cfgT)
  for (const m of ms) { dire(`${m.ok ? 'PASS' : 'FAIL'} ${m.test} mutant « ${m.nom} » — ${m.ok ? 'attrapé : ' : ''}${m.raison}`); compter(m.ok) }
  // S2 bis — une page manquante n'efface pas ce que disent les autres : sans /contact, un mot interdit sur / reste vu (et l'absence est une faute de plus)
  {
    const B = cloner(T); delete B.pages['/contact'].sources; B.pages['/contact'].notFound = true; B.pages['/contact'].html = ''
    inserer(B.pages['/'], '<p>Résultats garantis</p>'); preparer(B)
    const r = jouer(B, ['LV-8'])[0]
    const bon = r.fautes.some((f) => /garantis/.test(f)) && r.fautes.some((f) => /^\/contact/.test(f))
    dire(`${bon ? 'PASS' : 'FAIL'} S2bis page manquante non masquante — LV-8 sans /contact : ${bon ? 'voit « Résultats garantis » sur / ET note /contact absente' : court(r.fautes.join(' | '), 200)}`)
    compter(bon)
  }
  // S3 — la référence
  dire('\nS3 — la v2 de référence rougit sur ses défauts connus, en citant la chaîne')
  const dossierRef = preparerReference(tete)
  const REF = preparer(await construireArtefact({ racine: dossierRef, repli: tete.racine, nom: 'reference', jugees: ['/'] }))
  const pr = REF.pages['/']
  dire(`  · rendu de la référence : ${pr.erreur ? 'ÉCHEC — ' + pr.erreur : `${pr.html.length} octets`} ; remplacements : ${REF.stubs.join(', ') || 'aucun'} ; modules absents rendus transparents : ${REF.manquants.join(', ') || 'aucun'}`)
  for (const n of REF.notes) dire(`  · ${n}`)
  const rr = jouer(REF, ATTENDUS_REFERENCE.map((a) => a[0]))
  for (const [i, r] of rr.entries()) {
    const [id, motif, quoi, mini] = ATTENDUS_REFERENCE[i]
    const citees = r.fautes.filter((f) => motif.test(f))
    const cite = !ok(r) && citees.length >= mini
    dire(`${cite ? 'PASS' : 'FAIL'} ${id} sur la référence — ${cite ? `rouge, cite ${quoi} (${citees.length} faute(s)) : ${court(citees[0], 170)}` : `attendu rouge avec ${quoi} ; obtenu : ${ok(r) ? 'vert' : court(r.fautes[0], 170)}`}`)
    compter(cite)
  }
  const autres = jouer(REF, IDS.filter((x) => !ATTENDUS_REFERENCE.some((a) => a[0] === x)))
  dire(`  · à titre d’information, les autres règles sur la référence : ${autres.map((r) => `${r.id} ${ok(r) ? 'vert' : 'rouge'}`).join(', ')}`)
  // S4 — les sondes
  dire('\nS4 — chaque détecteur éprouvé sur des sondes (fautes vues, justes laissées)')
  for (const [nom, f] of [['texte', jouerSondesTexte], ['couleur', jouerSondesCouleur], ['diverses (fictif, sélecteur, drapeau, constantes)', jouerSondesDiverses]]) {
    const r = f()
    dire(`${r.defauts.length ? 'FAIL' : 'PASS'} S4 sondes ${nom} — ${r.total} sonde(s)${r.defauts.length ? ' : ' + r.defauts.join(' ; ') : ''}`)
    compter(!r.defauts.length)
  }
  const jt = jetonsDuSocle(tete.racine)
  dire(`${jt.defauts.length ? 'FAIL' : 'PASS'} S4 jetons de app/base.css et de .lp — ${jt.n} jeton(s) de couleur classés neutre, corail, vert ou sémantique${jt.exceptions.length ? ` ; exception(s) documentée(s) : ${jt.exceptions.join(', ')}` : ''}${jt.defauts.length ? ' : ' + jt.defauts.join(' ; ') : ''}`)
  compter(!jt.defauts.length)
  // S5 — le lanceur
  dire('\nS5 — le lanceur (scripts/tout-verifier.mjs, lu comme du texte : son import lancerait toutes les suites)')
  for (const p of s5(tete.racine)) { dire(`${p.ok ? 'PASS' : 'FAIL'} ${p.nom} — ${p.detail}`); compter(p.ok) }
  dire(`\n${reussis} réussis, ${echoues} échoués`)
  return echoues === 0
}
function jetonsDuSocle(racineTete) {
  const defauts = []; const exceptions = []; let n = 0
  const connus = { '--grid': 'froid' } // grille de fond de la console (bleu) : employée par des règles de la console, jamais par la v2 ; LV-3 la rougit si une règle concernée l'emploie
  for (const [f, filtre] of [['app/base.css', (r) => r.selecteurs.includes(':root')], ['app/globals.css', (r) => r.selecteurs.some((s) => s.trim() === '.lp')]]) {
    const p = path.join(racineTete, f)
    if (!fs.existsSync(p)) { defauts.push(`${f} introuvable dans l’arbre de HEAD`); continue }
    for (const r of analyserCss(fs.readFileSync(p, 'utf8'), f).filter(filtre)) for (const d of r.decls) {
      if (!d.prop.startsWith('--')) continue
      for (const c of couleursDe(d.valeur).map(classeCouleur)) {
        n++
        if (c === 'froid') { if (connus[d.prop] === 'froid') exceptions.push(`${d.prop} (${f}:${d.ligne}, bleu, hors v2)`); else defauts.push(`${f}:${d.ligne} ${d.prop} est froid (bleu, cyan ou violet) et n’est pas une exception connue`) }
      }
    }
  }
  return { n, defauts, exceptions: [...new Set(exceptions)] }
}

async function modePage() {
  let reussis = 0, echoues = 0
  dire(`landing-v2-qa — la page (racine ${R})`)
  const publicSecours = path.join(R, 'public')
  const plan4 = path.join(R, 'plans/011-cadrage-01-11/chantier-4-assistant-plan.md')
  const cfg = { racine: R, repli: null, nom: 'page', publicSecours, planChantier4: fs.existsSync(plan4) ? lireTexte(plan4) : null }
  const A = preparer(await construireArtefact(cfg))
  dire(`  · remplacements du harnais : ${A.stubs.join(', ') || 'aucun'} ; modules absents rendus transparents : ${A.manquants.join(', ') || 'aucun'}`)
  for (const n of A.notes) dire(`  · ${n}`)
  const ids = SEUL.length ? IDS.filter((x) => SEUL.includes(x)) : IDS
  const res = jouer(A, ids)
  for (const r of res) { dire(ligne(r)); if (!ok(r)) for (const f of r.fautes.slice(0, 8)) dire(`      · ${court(f, 300)}`); if (ok(r)) reussis++; else echoues++ }
  dire('\nLes mutants, rejoués sur la page')
  const ms = await jouerMutants(A, cfg, SEUL.length ? SEUL : null)
  for (const m of ms) { dire(`${m.ok ? 'PASS' : 'FAIL'} ${m.test} mutant « ${m.nom} » — ${m.ok ? 'attrapé : ' : ''}${m.raison}`); if (m.ok) reussis++; else echoues++ }
  dire(`\n${reussis} réussis, ${echoues} échoués`)
  return echoues === 0
}

async function main() {
  fs.mkdirSync(TRAVAIL, { recursive: true })
  let bon = false
  try { bon = STRUCTURE ? await modeStructure() : await modePage() }
  catch (e) { dire(`ERREUR landing-v2-qa : ${String(e?.stack ?? e).split('\n').slice(0, 6).join('\n')}`) }
  finally {
    if (!GARDER) for (const e of fs.existsSync(TRAVAIL) ? fs.readdirSync(TRAVAIL) : []) if (e !== 'tete-figee') fs.rmSync(path.join(TRAVAIL, e), { recursive: true, force: true })
  }
  if (!bon && !sortie.some((l) => /réussis, \d+ échoués/.test(l))) dire('0 réussis, 1 échoués')
  process.exit(bon ? 0 : 1)
}
main()
