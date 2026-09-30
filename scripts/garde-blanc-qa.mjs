#!/usr/bin/env node
// scripts/garde-blanc-qa.mjs — le juge de la règle « white-label » du dépôt (écrit par Claude Code, AVANT tout correctif).
//
// La règle : tout ce que voit le prospect ou le client d'un artisan (sites et maquettes générés, e-mails, mentions légales, pieds
// de page, crédits photo, PDF, pages /site et /p, messages) porte la marque de l'ARTISAN, jamais « Presti » ni « prestiapp ».
// Aucun juge existant ne cherchait le mot : site-qa, maquette-qa, photos-provenance, conformite-qa regardent autre chose.
//
//   node scripts/garde-blanc-qa.mjs [--racine=<dossier>] [--liste]
//   node scripts/garde-blanc-qa.mjs --temoin       (auto-contrôle : le témoin de scripts/fixtures/026-garde/blanc/temoin/ est vert,
//                                                   et chacun des sabotages de lot.mjs est vu par le critère qu'il vise)
//
// Les critères GB (une ligne chacun, « ✅ GB-n … » ou « ❌ GB-n … ») :
//   GB-1  aucune occurrence de « presti » / « prestiapp » (casse ignorée ; « prestige » n'en est pas une) dans les surfaces artisan,
//         hors la liste fermée d'exemptions (moteur.mjs, EXEMPTIONS) : public/sites-demo/**, gabarits-pubs/**, maquettes/**,
//         app/site/**, app/p/**, lib/pubs/** quand il existe, lib/email.ts, lib/agents/acquisition/modeles.ts, lib/DevisPDF.tsx,
//         lib/legalArtisan.ts (la page /site/<slug>/infos-legales la rend) ; ET dans ce que generer.mjs FABRIQUE : le juge l'exécute
//         (hors ligne, sortie sous .orchestre/travail/garde-blanc-qa/) sur la démo Lestraque et sur une maquette d'essai, puis lit
//         chaque fichier produit ;
//   GB-2  les crédits et attributions photo (attributions*.json, crédits des pages, chaînes du générateur) ne nomment ni Presti ni
//         son fondateur ;
//   GB-3  mentions légales d'un site d'artisan (pages produites, pages générées, et la page /infos-legales du dépôt) : raison
//         sociale, SIREN, adresse, hébergeur, directeur de publication, médiateur, RGPD/cookies présents OU marqués « à compléter »,
//         jamais au nom de Presti ;
//   GB-4  e-mails sortants : lib/email.ts est EXÉCUTÉ (fetch factice, aucun réseau) : sous un nom d'artisan l'expéditeur affiche ce
//         nom, l'adresse d'envoi n'est pas sur le domaine de Presti, Reply-To est l'artisan, rien ne retombe sur « Presti » (nom vide
//         compris) ; lu aussi : le Reply-To par défaut, le repli de fromHeader, et les appelants qui passent `fromName` (pas de repli
//         « Presti » dans leurs textes, pas de `fromName` pouvant valoir undefined) ;
//   GB-5  un titre ou un h1 n'affirme pas une zone d'intervention ni un fait que le corps de la page marque « à confirmer » ;
//   GB-6  un numéro que la page dit « à reconfirmer » n'est pas un lien tel: cliquable ;
//   GB-7  la liste fermée d'exemptions est courte (≤ 8), chaque entrée est justifiée et bornée (jamais public/, jamais un joker,
//         jamais le mot seul sans raison) ; et la portée du juge n'a pas été réduite (un garde-blanc-portee.json n'est reçu que d'un
//         témoin posé par --racine).
//
// Sortie : une ligne par critère, puis « garde-blanc-qa : PASS|FAIL — ids ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide ou si un préalable manque (racine sans surface à juger). Hors ligne : aucun fetch réel (celui de GB-4 est
// factice), aucun secret lu. N'écrit que sous .orchestre/travail/garde-blanc-qa/ (et le nettoie).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { R, lireOptions, creerSortie, lancer, court, premiereLigne, listerFichiers } from './fixtures/026-pilotage/a/commun.mjs'
import * as M from './fixtures/026-garde/blanc/moteur.mjs'

const JUGE = 'garde-blanc-qa'
const IDS = ['GB-1', 'GB-2', 'GB-3', 'GB-4', 'GB-5', 'GB-6', 'GB-7']
const o = lireOptions(process.argv.slice(2), { connues: ['liste'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.valeurs.racine) refuser('--temoin se juge lui-même : pas de --racine')
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
const LISTE = o.drapeaux.has('liste')
const FIXTURES = path.join(R, 'scripts', 'fixtures', '026-garde', 'blanc')
const TRAVAIL_JUGE = path.join(R, '.orchestre', 'travail', JUGE)
const posix = (p) => p.split(path.sep).join('/')
const lire = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
const listeTronquee = (l, n = 6) => l.slice(0, n).join(' ; ') + (l.length > n ? ` ; … (${l.length} au total)` : '')

// ── La portée : ce que le juge lit sur un arbre ─────────────────────────────────────────────────────────────────────────────
const RACINES = ['public/sites-demo', 'gabarits-pubs', 'maquettes', 'app/site', 'app/p', 'lib/pubs']
const FICHIERS_SEULS = ['lib/email.ts', 'lib/agents/acquisition/modeles.ts', 'lib/DevisPDF.tsx', 'lib/legalArtisan.ts']
const PAGE_LEGALE_CODE = ['app/site/[slug]/infos-legales/page.tsx', 'lib/legalArtisan.ts']
const SANS_DESCENTE = new Set(['node_modules', '.next'])
const PLAFOND_OCTETS = 5_000_000
function marcher(racine, rel, sortie) {
  const abs = path.join(racine, rel)
  let st
  try { st = fs.statSync(abs) } catch { return }
  if (st.isFile()) { if (M.EXTENSIONS_TEXTE.test(rel) && st.size <= PLAFOND_OCTETS) sortie.push(rel); return }
  if (!st.isDirectory() || SANS_DESCENTE.has(path.basename(rel))) return
  for (const e of fs.readdirSync(abs).sort()) marcher(racine, `${rel}/${e}`, sortie)
}
function portee(racine) {
  const p = { manifeste: false, fichiers: [], generations: [], sites: [], appelants: [], courriel: 'lib/email.ts', legalCode: [], refus: [] }
  const f = path.join(racine, 'garde-blanc-portee.json')
  if (fs.existsSync(f)) {
    p.manifeste = true
    let m
    try { m = JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { p.refus.push(`garde-blanc-portee.json illisible : ${premiereLigne(e)}`); return p }
    p.fichiers = Array.isArray(m.fichiers) ? m.fichiers.filter((x) => typeof x === 'string') : []
    p.generations = Array.isArray(m.generations) ? m.generations : []
    p.sites = Array.isArray(m.sites) ? m.sites : []
    p.appelants = Array.isArray(m.appelants) ? m.appelants : []
    p.courriel = typeof m.courriel === 'string' ? m.courriel : null
    return p
  }
  for (const r of RACINES) marcher(racine, r, p.fichiers)
  for (const x of FICHIERS_SEULS) if (fs.existsSync(path.join(racine, x))) p.fichiers.push(x)
  p.fichiers = [...new Set(p.fichiers)]
  const demos = path.join(racine, 'public', 'sites-demo')
  if (fs.existsSync(demos)) for (const e of fs.readdirSync(demos).sort()) if (fs.existsSync(path.join(demos, e, 'mentions-legales', 'index.html'))) p.sites.push(`public/sites-demo/${e}`)
  p.generations = [{ nom: 'lestraque', metier: 'lestraque' }, { nom: 'maquette-electricien', maquette: path.join(FIXTURES, 'jeu', 'maquette.json') }]
  p.legalCode = PAGE_LEGALE_CODE.filter((x) => fs.existsSync(path.join(racine, x)))
  const code = []
  for (const r of ['app', 'lib']) marcher(racine, r, code)
  p.appelants = code.filter((x) => /\.tsx?$/.test(x) && x !== 'lib/email.ts' && /\bfromName\s*:/.test(M.lireSelonMode(lire(path.join(racine, x)) ?? '', 'code')))
  return p
}

// ── Le générateur, exécuté hors ligne ───────────────────────────────────────────────────────────────────────────────────────
function generer(racine, g) {
  const gen = path.join(racine, 'public', 'sites-demo', 'generer.mjs')
  const sortie = path.join(racine, '.orchestre', 'travail', JUGE, `sortie-${g.nom}`)
  fs.rmSync(sortie, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(sortie), { recursive: true })
  if (!fs.existsSync(gen)) return { nom: g.nom, erreur: 'public/sites-demo/generer.mjs absent', sortie }
  const entree = g.maquette ? (path.isAbsolute(g.maquette) ? g.maquette : path.join(racine, g.maquette)) : null
  if (g.maquette && !fs.existsSync(entree)) return { nom: g.nom, erreur: `entrée ${g.maquette} absente`, sortie }
  const args = g.maquette ? [gen, `--maquette=${entree}`, `--sortie=${sortie}`] : [gen, g.metier, `--sortie=${sortie}`]
  const r = lancer(process.execPath, args, { cwd: racine, timeout: 120_000 })
  if (r.code !== 0 || !fs.existsSync(sortie)) return { nom: g.nom, erreur: `code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} — ${court(r.sortie.trim().split(/\r?\n/).pop() ?? '', 110)}`, sortie }
  return { nom: g.nom, sortie, fichiers: [...listerFichiers(sortie)].filter((x) => M.EXTENSIONS_TEXTE.test(x)).sort() }
}

// ── Le courrier, exécuté avec un fetch factice ──────────────────────────────────────────────────────────────────────────────
async function essaiCourriel(racine, chemin) {
  const f = path.join(racine, chemin)
  if (!fs.existsSync(f)) return [`${chemin} absent`]
  const envois = []
  const fetchAvant = globalThis.fetch, cleAvant = process.env.RESEND_API_KEY
  process.env.RESEND_API_KEY = 'cle-factice-hors-ligne'
  globalThis.fetch = async (_url, init) => { envois.push(JSON.parse(String(init?.body ?? '{}'))); return new Response(JSON.stringify({ id: 'factice' }), { status: 200, headers: { 'content-type': 'application/json' } }) }
  const echecs = []
  try {
    const m = await import(`${pathToFileURL(f).href}?garde=${Date.now()}-${Math.random().toString(36).slice(2)}`)
    if (typeof m.sendEmail !== 'function') return [`${chemin} n'exporte pas sendEmail`]
    const cas = [
      ['nom d’artisan et Reply-To', { fromName: 'Menuiserie Duval', replyTo: 'duval@exemple.fr' }, 'Menuiserie Duval', 'duval@exemple.fr'],
      ['nom d’artisan sans Reply-To', { fromName: 'Menuiserie Duval' }, 'Menuiserie Duval', null],
      ['nom d’artisan vide après nettoyage', { fromName: '<>' }, null, null],
    ]
    for (const [quoi, opts, affiche, reponse] of cas) {
      envois.length = 0
      let r
      try { r = await m.sendEmail({ to: 'client@exemple.fr', subject: 'Votre demande', text: 'Bonjour, votre demande est bien reçue.', critique: true, ...opts }) } catch (e) { echecs.push(`${quoi} : sendEmail a levé « ${premiereLigne(e)} »`); continue }
      const c = envois[0]
      if (!c) { echecs.push(`${quoi} : aucun envoi capturé (résultat ${JSON.stringify(r)})`); continue }
      const mm = /^(.*?)\s*<([^>]+)>\s*$/.exec(String(c.from ?? ''))
      const nom = mm ? mm[1].trim() : String(c.from ?? ''), adresse = mm ? mm[2] : ''
      if (M.reMarque().test(adresse)) echecs.push(`${quoi} : l'adresse d'envoi « ${adresse} » est sur le domaine de Presti, visible du client`)
      if (M.reMarque().test(nom)) echecs.push(`${quoi} : le nom d'expéditeur affiché est « ${nom} »`)
      else if (affiche && nom !== affiche) echecs.push(`${quoi} : nom affiché « ${nom} », « ${affiche} » attendu`)
      if (!nom) echecs.push(`${quoi} : expéditeur sans nom affiché`)
      if (reponse && c.reply_to !== reponse) echecs.push(`${quoi} : Reply-To « ${c.reply_to ?? 'absent'} », l'artisan « ${reponse} » attendu`)
      if (!reponse && c.reply_to && M.reMarque().test(String(c.reply_to))) echecs.push(`${quoi} : Reply-To « ${c.reply_to} » renvoie le client chez Presti`)
      const reste = JSON.stringify({ ...c, from: undefined }).match(M.reMarque())
      if (reste) echecs.push(`${quoi} : « ${reste[0]} » dans le sujet, le texte ou les en-têtes`)
    }
  } catch (e) { echecs.push(`${chemin} n'a pas pu être exécuté : ${premiereLigne(e)}`) } finally {
    globalThis.fetch = fetchAvant
    if (cleAvant === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = cleAvant
  }
  return [...new Set(echecs)]
}
/** La forme de lib/email.ts lue sans l'exécuter : Reply-To par défaut, repli de fromHeader, adresse sous le nom de l'artisan. */
function formeCourriel(source) {
  const code = M.lireSelonMode(source, 'code')
  const e = []
  const reply = /const\s+replyTo\s*=\s*([^\n]+)/.exec(code)?.[1]
  if (!reply) e.push('aucune ligne « const replyTo = … » : la règle du Reply-To n’est plus lisible')
  else if (!/fromName(?:\s*!==\s*undefined)?\s*\?\s*(?:undefined|null)\b/.test(reply)) e.push(`Reply-To par défaut « ${court(reply, 90)} » : sous un nom d'artisan il doit valoir undefined, pas l'adresse de l'éditeur`)
  const i = code.search(/function\s+fromHeader\b/)
  if (i < 0) e.push('fromHeader introuvable')
  else {
    let prof = 0, fin = code.length
    for (let k = code.indexOf('{', i); k < code.length; k++) { if (code[k] === '{') prof++; else if (code[k] === '}' && --prof === 0) { fin = k + 1; break } }
    const corps = code.slice(i, fin)
    if (/\|\|\s*(?:['"]Presti['"]|\w*PLATEFORME\w*|EMAIL_ENTREPRISE)/.test(corps)) e.push('fromHeader retombe sur la marque de l’éditeur quand le nom de l’artisan manque (« || … Presti »)')
    for (const m of corps.matchAll(/\$\{(\w+)\}\s*<\$\{(\w+)\}>/g)) {
      const rhs = new RegExp(`(?:const|let)\\s+${m[2]}\\s*=\\s*([^\\n]+)`).exec(code)?.[1] ?? ''
      if (!/PLATEFORME/.test(m[1]) && M.reMarque().test(rhs)) e.push(`l'expéditeur « \${${m[1]}} <\${${m[2]}}> » du chemin artisan utilise ${m[2]} = ${court(rhs, 50)}`)
    }
  }
  return e
}

// ── L'évaluation d'un arbre ─────────────────────────────────────────────────────────────────────────────────────────────────
async function evaluer(racine, { sondes = false } = {}) {
  const res = new Map()
  const poser = (id, echecs, ok) => res.set(id, { echecs, ok })
  const p = portee(racine)
  const sources = new Map()
  const source = (x) => { if (!sources.has(x)) sources.set(x, lire(path.join(racine, x))); return sources.get(x) }
  const manquants = p.fichiers.filter((x) => source(x) === null)
  const utilisees = new Set()
  const fuites = []
  const nettoyage = []

  // Les sorties du générateur
  const sorties = []
  const pannes = []
  for (const g of p.generations) {
    const s = generer(racine, g)
    nettoyage.push(s.sortie)
    if (s.erreur) { pannes.push(`générateur « ${g.nom} » : ${s.erreur}`); continue }
    sorties.push(s)
  }
  const dansSortie = (s) => s.fichiers.map((x) => ({ chemin: `sortie ${s.nom}/${x}`, brut: lire(path.join(s.sortie, x)), mode: 'brut' })).filter((f) => f.brut !== null)

  // GB-1
  {
    const e = [...pannes, ...manquants.map((x) => `fichier de la portée absent : ${x}`)]
    let nFichiers = 0, nSorties = 0
    for (const x of p.fichiers) {
      const t = source(x); if (t === null) continue
      nFichiers++
      for (const f of M.trouverMarque(x, t, { utilisees })) fuites.push(`${x}:${f.ligne} « ${f.extrait} »`)
    }
    for (const s of sorties) for (const f of dansSortie(s)) { nSorties++; for (const m of M.trouverMarque(f.chemin, f.brut, { mode: 'brut', utilisees })) fuites.push(`${f.chemin}:${m.ligne} « ${m.extrait} »`) }
    if (LISTE && !sondes) for (const f of fuites) console.log(`  fuite ${f}`)
    const parFichier = new Map()
    for (const f of fuites) { const k = f.replace(/:\d+ «.*$/, ''); parFichier.set(k, (parFichier.get(k) ?? 0) + 1) }
    if (fuites.length) e.push(`${fuites.length} occurrence(s) de la marque de l'éditeur dans ${parFichier.size} fichier(s) : ${listeTronquee(fuites)}`)
    const sondesMoteur = []
    if (sondes) {
      if (M.trouverMarque('a.html', '<p>Le prestige du chantier, la prestidigitation</p>', { mode: 'brut' }).length) sondesMoteur.push('« prestige » pris pour la marque')
      for (const t of ['Presti', 'PRESTI', 'prestiapp.fr', 'Pres&shy;ti', '&#80;resti', 'Ｐresti', 'P​resti']) if (!M.trouverMarque('a.html', `<p>${t}</p>`, { mode: 'brut' }).length) sondesMoteur.push(`« ${t} » non vue`)
      if (M.trouverMarque('app/x.tsx', 'const a = 1 // Presti\n/* prestiapp */', {}).length) sondesMoteur.push('un commentaire de code compté')
      if (!M.trouverMarque('public/sites-demo/x.js', '// c’est la messagerie Presti', {}).length) sondesMoteur.push('un commentaire de fichier servi ignoré')
      if (!M.trouverMarque('app/x.tsx', 'const u = `${basePresti}/site/${id}`', {}).length) sondesMoteur.push('adresse fabriquée avec la constante de l’éditeur non vue')
      for (const s of sondesMoteur) e.push(`sonde du moteur : ${s}`)
    }
    poser('GB-1', e, `aucune occurrence dans ${nFichiers} fichier(s) et ${nSorties} fichier(s) produit(s) par ${sorties.length} exécution(s) du générateur (${sorties.map((s) => s.nom).join(', ') || 'aucune'}) ; ${utilisees.size} exemption(s) utilisée(s) (${[...utilisees].sort().join(', ') || 'aucune'})`)
  }

  // GB-2
  {
    const e = []
    const vus = (chemin, texte, mode) => {
      if (/(?:^|\/)attributions?[^/]*\.json$/i.test(chemin)) {
        normaliserLignes(texte).forEach((l, i) => { if (M.reMarque().test(l) || /\bFiliot\b/i.test(l)) e.push(`${chemin}:${i + 1} « ${court(l, 90)} »`) })
        return
      }
      for (const c of M.creditsNommantEditeur(M.sansExemptions(chemin, texte, mode))) e.push(`${chemin} « ${c} »`)
    }
    const normaliserLignes = (t) => M.normaliser(t).split('\n')
    let n = 0
    for (const x of p.fichiers) { const t = source(x); if (t === null) continue; n++; vus(x, t, M.modeDe(x)) }
    for (const s of sorties) for (const f of dansSortie(s)) { n++; vus(f.chemin.replace(/^sortie /, 'sortie '), f.brut, 'brut') }
    if (LISTE && !sondes) for (const l of e) console.log(`  credit ${l}`)
    poser('GB-2', e.length ? [`${e.length} crédit(s) ou attribution(s) nommant l'éditeur ou son fondateur : ${listeTronquee(e)}`] : [], `crédits et attributions de ${n} fichier(s) : aucun ne nomme Presti ni son fondateur`)
  }

  // GB-3
  {
    const e = []
    let corpus = 0
    const jugerCorpus = (nom, lignes) => { corpus++; for (const d of M.defautsLegaux(lignes)) e.push(`${nom} : ${d}`) }
    const dossiers = [...p.sites.map((s) => ({ nom: s, lire: (rel) => source(`${s}/${rel}`) ?? lire(path.join(racine, s, rel)) })), ...sorties.filter((s) => fs.existsSync(path.join(s.sortie, 'mentions-legales', 'index.html'))).map((s) => ({ nom: `sortie ${s.nom}`, lire: (rel) => lire(path.join(s.sortie, rel)) }))]
    for (const d of dossiers) {
      const pages = ['mentions-legales/index.html', 'confidentialite/index.html'].map((rel) => d.lire(rel)).filter((t) => t !== null)
      if (!pages.length) { e.push(`${d.nom} : aucune page de mentions légales lisible`); continue }
      jugerCorpus(d.nom, pages.flatMap((h) => M.texteHtml(h)))
    }
    if (p.legalCode.length) {
      const lignes = p.legalCode.flatMap((x) => M.sansExemptions(x, source(x) ?? '', 'code').split('\n')).map((l) => l.trim()).filter(Boolean)
      jugerCorpus('page /infos-legales du dépôt', lignes)
    }
    if (!corpus) e.push('aucun site d’artisan dont les mentions légales se lisent : rien n’est jugé')
    poser('GB-3', e.length ? [`${e.length} défaut(s) : ${listeTronquee(e)}`] : [], `${corpus} corpus de mentions légales : les sept rubriques sont renseignées ou marquées « à compléter », aucune au nom de Presti`)
  }

  // GB-4
  {
    const e = []
    if (!p.courriel) e.push('la portée ne désigne aucun fichier de courrier')
    else {
      const t = source(p.courriel) ?? lire(path.join(racine, p.courriel))
      if (t === null) e.push(`${p.courriel} absent`)
      else { e.push(...formeCourriel(t)); e.push(...await essaiCourriel(racine, p.courriel)) }
    }
    for (const x of p.appelants) {
      const t = source(x) ?? lire(path.join(racine, x))
      if (t === null) { e.push(`${x} absent`); continue }
      for (const f of M.trouverMarque(x, t, { utilisees })) e.push(`${x}:${f.ligne} e-mail d'un artisan à son client : « ${f.extrait} »`)
      const code = M.lireSelonMode(t, 'code').split('\n')
      code.forEach((l, i) => { if (/\bfromName\s*:[^,}]*(?:\|\||\?\?)\s*undefined\b/.test(l)) e.push(`${x}:${i + 1} fromName peut valoir undefined (nom d'artisan vide) : l'e-mail part alors sous « Presti » avec Reply-To chez l'éditeur — « ${court(l.trim(), 80)} »`) })
    }
    poser('GB-4', e.length ? [`${e.length} défaut(s) : ${listeTronquee(e)}`] : [], `lib/email.ts exécuté (3 cas, fetch factice) : expéditeur au nom de l'artisan, adresse d'envoi neutre, Reply-To l'artisan, aucun repli « Presti » ; ${p.appelants.length} appelant(s) de fromName lus`)
  }

  // GB-5 et GB-6
  {
    const e5 = [], e6 = []
    let pages = 0, marques = 0, liens = 0
    const htmls = [...p.fichiers.filter((x) => /\.html?$/i.test(x)).map((x) => ({ nom: x, h: source(x) })), ...sorties.flatMap((s) => dansSortie(s).filter((f) => /\.html?$/i.test(f.chemin)).map((f) => ({ nom: f.chemin, h: f.brut })))]
    for (const { nom, h } of htmls) {
      if (!h) continue
      pages++
      const a = M.contradictionsTitre(h); marques += a.marques
      for (const d of a.defauts) e5.push(`${nom} : ${d}`)
      const b = M.telephonesMarques(h); liens += b.liens
      for (const d of b.defauts) e6.push(`${nom} : ${d}`)
    }
    poser('GB-5', e5.length ? [`${e5.length} contradiction(s) : ${listeTronquee(e5)}`] : [], `${pages} page(s) lues, ${marques} ligne(s) marquée(s) « à confirmer » : aucun titre ni h1 n'affirme ce qu'elles réservent${marques ? '' : ' (sans objet sur cet arbre : aucune ligne marquée, le critère est prouvé par les sabotages du témoin)'}`)
    poser('GB-6', e6.length ? [`${e6.length} numéro(s) à reconfirmer rendu(s) cliquable(s) : ${listeTronquee(e6)}`] : [], `${liens} lien(s) tel: dans ${pages} page(s) : aucun ne porte un numéro marqué « à reconfirmer »`)
  }

  // GB-7
  {
    const e = [...M.defautsExemptions()]
    if (p.manifeste) {
      if (path.resolve(racine) === R) e.push('garde-blanc-portee.json à la racine du dépôt jugé : la portée réduite n’est reçue que d’un témoin posé par --racine, jamais du dépôt lui-même')
      e.push(...p.refus)
      if (!p.fichiers.some((x) => /\.html?$/i.test(x))) e.push('portée réduite sans aucune page HTML : un témoin qui ne juge aucune page')
      if (!p.courriel || !p.fichiers.includes(p.courriel)) e.push('portée réduite sans fichier de courrier : GB-4 ne jugerait rien')
      if (!p.generations.length) e.push('portée réduite sans exécution du générateur : GB-1 ne verrait que des sources')
      if (!p.sites.length) e.push('portée réduite sans site dont lire les mentions légales')
    } else if (!p.fichiers.length) e.push('aucune surface lue')
    const mortes = M.EXEMPTIONS.filter((x) => !utilisees.has(x.id)).map((x) => x.id)
    poser('GB-7', e, `${M.EXEMPTIONS.length} exemption(s) sur ${M.LIMITE_EXEMPTIONS} permises, chacune justifiée et bornée (aucune sous public/, aucun joker) ; ${utilisees.size} utilisée(s) sur cet arbre${mortes.length ? `, non utilisée(s) ici : ${mortes.join(', ')} (à retirer quand la correction les rend inutiles)` : ''}`)
  }

  for (const d of nettoyage) fs.rmSync(d, { recursive: true, force: true })
  try { fs.rmdirSync(path.join(racine, '.orchestre', 'travail', JUGE)) } catch { /* non vide ou absent */ }
  return res
}

function afficher(resultats, extra = {}) {
  const s = creerSortie(JUGE, [...IDS], `${JUGE} — ${extra.entete ?? `racine ${posix(path.relative(R, o.racine)) || '.'}`}`)
  for (const id of IDS) {
    const r = resultats.get(id)
    if (!r) { s.echoue(id, 'non évalué'); continue }
    const plus = extra.plus?.[id] ?? []
    s.juger(id, [...r.echecs, ...plus], `${r.ok}${extra.ok?.[id] ? ` ; ${extra.ok[id]}` : ''}`)
  }
  return s.finir()
}

// ── --temoin : le témoin est vert et chaque sabotage est vu ────────────────────────────────────────────────────────────────
function copier(src, dest, retirerSuffixe) {
  for (const f of listerFichiers(src)) {
    const cible = path.join(dest, retirerSuffixe ? f.replace(/\.temoin$/, '') : f)
    fs.mkdirSync(path.dirname(cible), { recursive: true })
    fs.copyFileSync(path.join(src, f), cible)
  }
}
async function autoControle() {
  const base = TRAVAIL_JUGE
  const temoin = path.join(base, 'temoin-local')
  fs.rmSync(base, { recursive: true, force: true })
  fs.mkdirSync(base, { recursive: true })
  copier(path.join(FIXTURES, 'temoin'), temoin, true)
  const lot = await import(`${pathToFileURL(path.join(FIXTURES, 'lot.mjs')).href}?lu=${Date.now()}`)
  const vert = await evaluer(temoin, { sondes: true })
  const plus = {}, ok = {}
  const sabotages = (lot.juges?.[0]?.sabotages ?? [])
  const vus = {}
  for (const sab of sabotages) {
    const copie = path.join(base, 'sabote')
    fs.rmSync(copie, { recursive: true, force: true })
    copier(temoin, copie, false)
    const f = path.join(copie, sab.fichier)
    if (sab.retirer) fs.rmSync(f, { force: true })
    else {
      const t = lire(f)
      if (t === null || t.split(sab.avant).length !== 2) { (plus[sab.tue] ??= []).push(`sabotage « ${sab.nom} » inapplicable (le texte à remplacer doit figurer une fois)`); continue }
      fs.writeFileSync(f, t.replace(sab.avant, () => sab.apres))
    }
    const r = await evaluer(copie)
    if (r.get(sab.tue)?.echecs.length) (vus[sab.tue] ??= []).push(sab.nom)
    else (plus[sab.tue] ??= []).push(`sabotage « ${sab.nom} » non vu par ${sab.tue}`)
  }
  for (const id of IDS) ok[id] = vus[id] ? `${vus[id].length} sabotage(s) vu(s) (${vus[id].join(', ')})` : 'aucun sabotage déclaré pour ce critère'
  fs.rmSync(base, { recursive: true, force: true })
  return afficher(vert, { entete: `auto-contrôle du témoin (${sabotages.length} sabotage(s) rejoués)`, plus, ok })
}

if (o.temoin) process.exit(await autoControle())
{
  const p0 = portee(o.racine)
  if (!p0.manifeste && !fs.existsSync(path.join(o.racine, 'public', 'sites-demo')) && !p0.fichiers.length) refuser(`--racine : aucune surface à juger sous ${o.racine} (ni public/sites-demo, ni garde-blanc-portee.json) — préalable manquant`)
}
process.exit(afficher(await evaluer(o.racine)))
