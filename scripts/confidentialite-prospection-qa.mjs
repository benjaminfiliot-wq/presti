#!/usr/bin/env node
// scripts/confidentialite-prospection-qa.mjs — le juge de la section « Prospection » de /confidentialite et de la notice
// autonome (fiche 026-037), écrit par Claude Code AVANT les fiches qu'il juge, qui ne peuvent pas le modifier : 026-039
// (cahier CP) et 026-162 (cahier CP-H, avec --hebergement --reel --confirmer-reel).
//
//   node scripts/confidentialite-prospection-qa.mjs [--racine=<dossier>]
//        CP-1 … CP-7. Le juge démarre lui-même `next dev` (serveur() de scripts/lib/capture.mjs), récupère /confidentialite
//        et lit le HTML RENDU ; il régénère lui-même la notice (noticeHtml(), mentionsHtml()) et la capture à 390 px
//        (Playwright). Sans aucune source de section (ni lib/confidentialite/prospection.ts, ni « prospection » dans
//        page.tsx), CP-1 échoue sans servir la page : ce raccourci ne peut que refuser, jamais accorder.
//   node scripts/confidentialite-prospection-qa.mjs --hebergement --reel --confirmer-reel
//        CP-H1 … CP-H6 (026-162), Claude Code seulement, jamais par le registre : NOTICE_URL lu dans contrat.ts (sans
//        adresse : code 2, « notice pas encore publiée, 026-162 »), les deux pages en ligne comparées à l'empreinte des
//        fichiers régénérés, la ligne G3 datée avant le commit publié (gh api), la lecture des conditions d'ads_archive et
//        son verdict en base (acq_etat_envoi, .env.local chargé sans rien afficher).
//   node scripts/confidentialite-prospection-qa.mjs --auto-controle
//        le juge éprouvé sur lui-même : le témoin (scripts/fixtures/026-acquisition/cli/temoins/confidentialite/) rend chaque
//        critère vert et chaque sabotage rend ROUGE le critère qu'il vise (le service et l'hébergement passent par un
//        petit serveur local ; aucun réseau).
//   --domaines est retiré par la voie gratuite : code 2, avec le renvoi vers --hebergement.
// Codes : 0 tout est vert · 1 un critère est rouge · 2 appel invalide ou préalable manquant. N'écrit que sous
// .orchestre/travail/confidentialite-prospection-qa/. N'affiche aucun secret.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { R, TRAVAIL, court, premiereLigne, lireOptions, exigerSousTravail, contient, texteVisibleJuge, decoderEntites, normaliser } from './fixtures/026-acquisition/commun.mjs'

const NOM = 'confidentialite-prospection-qa'
const TEMOIN = path.join(R, 'scripts', 'fixtures', '026-acquisition', 'cli', 'temoins', 'confidentialite')
const TRAV = exigerSousTravail(path.join(TRAVAIL, NOM))
fs.mkdirSync(TRAV, { recursive: true })
const HOTE_PRESTI = 'prestiapp.fr'
const PAGE = 'app/confidentialite/page.tsx', MODULE = 'lib/confidentialite/prospection.ts', SCRIPT = 'scripts/notice-prospection.mjs'
const NOTICE = 'notice-prospection/index.html', MENTIONS = 'notice-prospection/mentions-legales/index.html'
const CONDITIONS = 'docs/agents/meta-ads-archive-conditions.md'
// 026-039, CP-2 (réécrit par la voie gratuite, écrit en 026-037).
const EXIGES = ['formulaire de contact', 'liste des entreprises RGE', 'ADEME', "Recherche d'entreprises", 'bibliothèque publicitaire', 'intérêt légitime', '3 ans', 'dernier contact', 'écrivez STOP', '10 minutes', 'un mois', 'assistant IA', 'Google', 'Oracle', 'GitHub', 'PrestiRecenseur', 'robots.txt', 'Disallow: /', 'diffusion partielle', '21 jours', 'OpenAI', 'Supabase', 'Vercel', 'Meta']
const REFUSES = ['désinscription', 'domaines dédiés', 'séquenceur']
// CP-H4 : la liste du juge des traceurs et ressources distantes.
const TRACEURS = ['google-analytics', 'googletagmanager', 'gtag(', 'fbq(', 'connect.facebook.net', 'plausible', 'matomo', 'hotjar', 'clarity.ms', 'segment.com', 'mixpanel', 'umami', 'fonts.googleapis', 'fonts.gstatic', 'use.typekit', 'facebook.com/tr', 'pixel.gif', '/pixel?', 'tracking-pixel']

const lire = (racine, rel) => { try { return fs.readFileSync(path.join(racine, rel), 'utf8').replace(/\r\n?/g, '\n') } catch { return null } }
const empreinte = (t) => crypto.createHash('sha256').update(t).digest('hex')
/** L'adresse de la section 1 : celle des mentions légales de prestiapp.fr (app/mentions-legales/page.tsx du dépôt du juge). */
function adresseMentions() {
  const t = lire(R, 'app/mentions-legales/page.tsx') ?? ''
  const m = /<span className="k">Adresse<\/span>\s*([^<]+)</.exec(t)
  return m ? normaliser(decoderEntites(m[1])).replace(/,?\s*France$/, '') : null
}
/** Les titres h2 d'un HTML (texte visible), et le h2 d'id « prospection ». */
function titres(html) {
  return [...String(html).matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi)].map((m) => ({ attributs: m[1], texte: texteVisibleJuge(m[2]), debut: m.index, fin: m.index + m[0].length }))
}
const idProspection = (a) => /\bid\s*=\s*["']prospection["']/i.test(a)
/** Le texte de la section : du h2 #prospection à la fin de main. */
function sectionDe(html) {
  const h = titres(html).find((t) => idProspection(t.attributs))
  if (!h) return null
  const fin = html.indexOf('</main>', h.debut)
  return { titre: h.texte, texte: texteVisibleJuge(html.slice(h.debut, fin < 0 ? html.length : fin)) }
}
const exigences = (texte, lieu) => [...EXIGES.filter((m) => !contient(texte, m)).map((m) => `${lieu} sans « ${m} »`), ...REFUSES.filter((m) => contient(texte, m)).map((m) => `${lieu} dit « ${m} »`)]
/** Un diff ligne à ligne (plus longue sous-suite commune) : [{ op: '=' | '-' | '+', l, a (ligne avant), b (ligne après) }]. */
function diffLignes(avant, apres) {
  const a = avant.split('\n'), b = apres.split('\n')
  const n = a.length, m = b.length
  const t = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1])
  const out = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ op: '=', l: a[i], a: i, b: j }); i++; j++ } else if (t[i + 1][j] >= t[i][j + 1]) { out.push({ op: '-', l: a[i], a: i, b: j }); i++ } else { out.push({ op: '+', l: b[j], a: i, b: j }); j++ }
  }
  while (i < n) out.push({ op: '-', l: a[i], a: i++, b: j })
  while (j < m) out.push({ op: '+', l: b[j], a: i, b: j++ })
  return out
}
/** CP-3 : le diff de page.tsx se limite à la date, à l'import de SECTION_PROSPECTION et à un bloc inséré avant les liens de bas de page. */
function jugerDiff(avant, apres) {
  const e = []
  const d = diffLignes(avant, apres)
  const blocs = []
  for (let k = 0; k < d.length;) {
    if (d[k].op === '=') { k++; continue }
    const debut = k
    while (k < d.length && d[k].op !== '=') k++
    blocs.push(d.slice(debut, k))
  }
  const date = (x) => /Dernière mise à jour/.test(x.l)
  const importSection = (x) => x.op === '+' && /^\s*import\s*\{[^}]*\bSECTION_PROSPECTION\b[^}]*\}\s*from\s*['"][^'"]*confidentialite\/prospection['"]/.test(x.l)
  let insertions = 0
  for (const b of blocs) {
    if (b.every((x) => date(x)) && b.some((x) => x.op === '-') && b.some((x) => x.op === '+')) continue
    if (b.every((x) => importSection(x))) continue
    if (b.every((x) => x.op === '+')) {
      insertions++
      const apresBloc = apres.split('\n')[b.at(-1).b + 1] ?? ''
      if (!/<a href="\/cgu">/.test(apresBloc)) e.push(`un bloc inséré ailleurs qu'avant le paragraphe des liens de bas de page (suivi de « ${court(apresBloc.trim(), 50)} »)`)
      continue
    }
    e.push(`un changement hors date, import et bloc : « ${court(b.map((x) => `${x.op}${x.l.trim()}`).join(' / '), 90)} »`)
  }
  if (insertions > 1) e.push(`${insertions} blocs insérés, un seul d'un tenant attendu`)
  // 04/10 : une fois la section dans HEAD (ef063776), « avant » la porte déjà : seul un bloc inséré est exigé quand « avant » ne l'a pas encore.
  // Les autres écarts (hors date, hors import, bloc déplacé ou retouché) restent refusés par la boucle ci-dessus ; une page identique à HEAD passe.
  const sectionDejaDansAvant = /\bSECTION_PROSPECTION\b/.test(avant)
  if (!insertions && !sectionDejaDansAvant && avant !== apres) e.push('aucun bloc inséré pour la section 10')
  return e
}
/** Les titres 1 à 9 de page.tsx (partie statique, avant toute expression {…}). */
const titresSource = (tsx) => [...tsx.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => normaliser(decoderEntites(m[1].split('{')[0]))).filter((t) => /^[1-9]\./.test(t))
/** CP-7 : les deux pages de la notice. */
function jugerNotice({ notice, mentions, attenduNotice, attenduMentions, section, adresse }) {
  const e = []
  if (notice === null || mentions === null) return [`${notice === null ? NOTICE : MENTIONS} absent`]
  if (notice !== attenduNotice) e.push(`${NOTICE} ≠ noticeHtml() octet pour octet`)
  if (mentions !== attenduMentions) e.push(`${MENTIONS} ≠ mentionsHtml()`)
  const tn = texteVisibleJuge(notice), tm = texteVisibleJuge(mentions)
  const phrases = [section?.titre, ...(section?.paragraphes ?? []), ...(section?.liste ?? [])].filter(Boolean)
  for (const p of phrases) if (!contient(tn, p)) e.push(`la notice ne porte pas « ${court(p, 40)} »`)
  if (!contient(tn, 'Benjamin Filiot')) e.push('la notice ne nomme pas le responsable')
  if (!/\bid\s*=\s*["']prospection["']/.test(notice)) e.push('la notice sans ancre prospection')
  if (!/href\s*=\s*["']mentions-legales\/["']/.test(notice)) e.push('la notice sans lien relatif mentions-legales/')
  for (const m of ['Benjamin Filiot', 'entrepreneur individuel', '109 411 348', 'GitHub', adresse]) if (!m || !contient(tm, m)) e.push(`les mentions sans « ${m ?? 'l\'adresse des mentions de prestiapp.fr'} »`)
  for (const [nom, t] of [['notice', notice], ['mentions', mentions]]) for (const x of ['<script', 'src="http', 'href="http', HOTE_PRESTI]) if (t.toLowerCase().includes(x.toLowerCase())) e.push(`${nom} contient ${x}`)
  return e
}
/** CP-H1 à CP-H4 sur deux corps servis. */
function jugerEnLigne({ notice, mentions, attenduNotice, attenduMentions, adresse }) {
  const h = { 'CP-H1': [], 'CP-H2': [], 'CP-H3': [], 'CP-H4': [] }
  for (const [nom, x, att] of [['notice', notice, attenduNotice], ['mentions', mentions, attenduMentions]]) {
    if (x.erreur) { h['CP-H1'].push(`${nom} : ${x.erreur}`); continue }
    if (x.statut !== 200) h['CP-H1'].push(`${nom} : ${x.url} → ${x.statut}`)
    if (x.autreHote) h['CP-H1'].push(`${nom} : redirection vers un autre hôte (${x.autreHote})`)
    if (empreinte(x.corps) !== empreinte(att)) h['CP-H1'].push(`${nom} : empreinte ${empreinte(x.corps).slice(0, 12)}… ≠ fichier du dépôt ${empreinte(att).slice(0, 12)}…`)
    for (const m of x.corps.matchAll(/\b(?:href|src|action)\s*=\s*["']([^"']*)["']/gi)) if (m[1].toLowerCase().includes(HOTE_PRESTI)) h['CP-H3'].push(`${nom} : un lien vers ${HOTE_PRESTI}`)
    if (/<script\b/i.test(x.corps)) h['CP-H4'].push(`${nom} : un <script>`)
    for (const m of x.corps.matchAll(/\b(?:src|href)\s*=\s*["'](https?:)?\/\/([^/"']+)/gi)) h['CP-H4'].push(`${nom} : une ressource d'un autre hôte (${m[2]})`)
    if (/@import\b|url\(\s*['"]?(https?:)?\/\//i.test(x.corps)) h['CP-H4'].push(`${nom} : @import ou url() distant`)
    for (const t of TRACEURS) if (x.corps.toLowerCase().includes(t)) h['CP-H4'].push(`${nom} : traceur ${t}`)
  }
  if (!mentions.erreur) { const t = texteVisibleJuge(mentions.corps); for (const m of ['Benjamin Filiot', 'entrepreneur individuel', '109 411 348', 'GitHub', adresse]) if (!m || !contient(t, m)) h['CP-H2'].push(`les mentions en ligne sans « ${m ?? 'l\'adresse'} »`) }
  return h
}
/** Récupère une page (10 s), en ne suivant une redirection que sur le même hôte. */
async function recuperer(adresse) {
  let u = adresse
  const hote = new URL(adresse).host
  for (let k = 0; k < 5; k++) {
    let r
    try { r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(10_000) }) } catch (e) { return { url: u, erreur: `${u} : ${premiereLigne(e.cause ?? e)}` } }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      const suivant = new URL(r.headers.get('location'), u)
      if (suivant.host !== hote) return { url: u, statut: r.status, autreHote: suivant.host, corps: '' }
      u = suivant.href
      continue
    }
    return { url: u, statut: r.status, corps: await r.text() }
  }
  return { url: u, erreur: `${u} : trop de redirections` }
}
/** CP-H5 : une ligne « G3 fait » datée, antérieure au commit publié. */
function jugerG3(decisions, datePublication) {
  const l = String(decisions ?? '').split('\n').find((x) => /\bG3\b/.test(x) && /\bfait\b/i.test(x))
  if (!l) return ['G3 absent : la notice dirait vrai trop tôt']
  const m = /(\d{4})-(\d{2})-(\d{2})|(\d{2})\/(\d{2})\/(\d{4})/.exec(l)
  if (!m) return ['la ligne « G3 fait » ne porte pas de date']
  const d = m[1] ? `${m[1]}-${m[2]}-${m[3]}` : `${m[6]}-${m[5]}-${m[4]}`
  if (!datePublication) return ['date du commit publié de presti-notice illisible (gh api)']
  if (!(d <= datePublication.slice(0, 10))) return [`G3 daté du ${d}, après le commit publié (${datePublication.slice(0, 10)})`]
  return []
}
/** CP-H6 : le document des conditions ; `etat` : ce que la base dit (acq_etat_envoi().ads_archive). */
function jugerConditions(doc, etat) {
  const e = []
  if (doc === null) return [`${CONDITIONS} absent`]
  const date = /(\d{4}-\d{2}-\d{2})|(\d{2})\/(\d{2})\/(\d{4})/.exec(doc)
  if (!date) e.push('le document ne porte aucune date')
  if (![...doc.matchAll(/https:\/\/([^/\s)>"']+)/g)].some((m) => /(^|\.)(facebook\.com|meta\.com)$/.test(m[1]))) e.push('aucune adresse https:// d\'un hôte de Meta')
  for (const u of ['repérer des artisans', 'repérer des marques', 'contacter ensuite']) if (!doc.split('\n').some((l) => contient(l, u) && /permis|interdit|\[interprétation\]/i.test(l))) e.push(`pas de ligne pour l'usage « ${u}… » avec permis, interdit ou [interprétation]`)
  const v = /^\s*Verdict\s*:\s*(PERMIS|REFUSE)\s*$/m.exec(doc)
  if (!v) e.push('pas de ligne « Verdict : PERMIS » ou « Verdict : REFUSE »')
  for (const m of doc.matchAll(/«([^»]*)»|"([^"]*)"|“([^”]*)”/g)) { const n = (m[1] ?? m[2] ?? m[3]).trim().split(/\s+/).filter(Boolean).length; if (n > 15) e.push(`une citation de ${n} mots (15 au plus)`) }
  if (etat !== undefined) {
    const a = etat?.ads_archive
    if (!a) e.push('acq_etat_envoi() ne rend pas ads_archive')
    else {
      if (v && Boolean(a.permis) !== (v[1] === 'PERMIS')) e.push(`ads_archive.permis = ${a.permis}, le document dit ${v[1]}`)
      const dDoc = date ? Date.parse(date[1] ?? `${date[4]}-${date[3]}-${date[2]}`) : NaN, dBase = Date.parse(a.le ?? a.date ?? a.lu_le ?? '')
      if (!(Math.abs(dBase - dDoc) <= 36 * 3600_000)) e.push(`date en base ${a.le ?? a.date ?? a.lu_le ?? '—'} à plus de 24 h du document`)
    }
  }
  return e
}

// ── Le verdict CP ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const IDS = ['CP-1', 'CP-2', 'CP-3', 'CP-4', 'CP-5', 'CP-6', 'CP-7']
/** servir(racine) → { base, arreter } ; `avant` : page.tsx de HEAD. */
async function jugerPage(racine, { temoin, servir, avant, contrat, seul = null }) {
  const res = new Map()
  const juge = (id, e, ok) => { if (!seul || seul === id) res.set(id, { echecs: [...new Set(e)], ok }) }
  const tsx = lire(racine, PAGE), mod = lire(racine, MODULE)
  if (mod === null && !/prospection/i.test(tsx ?? '')) {
    juge('CP-1', [`aucune section Prospection : ni ${MODULE} ni « prospection » dans ${PAGE} (page non servie)`], '')
    for (const id of IDS.slice(1)) juge(id, ['non jugé : section absente (CP-1)'], '')
    return res
  }
  let M = null
  try { M = mod === null ? null : await import(`${pathToFileURL(path.join(racine, MODULE)).href}?v=${Date.now()}${Math.random()}`) } catch (e) { M = { erreur: premiereLigne(e) } }
  let srv = null, html = null, capture = null
  try {
    srv = await servir()
    try { const r = await fetch(`${srv.base}/confidentialite`, { signal: AbortSignal.timeout(180_000) }); html = r.ok ? await r.text() : null; if (!r.ok) throw new Error(`/confidentialite → ${r.status}`) } catch (e) { html = { erreur: premiereLigne(e) } }
    if (!seul || seul === 'CP-5') capture = await capturer(srv.base)
  } catch (e) { html = { erreur: `service : ${premiereLigne(e)}` } } finally { await srv?.arreter?.() }
  const servi = typeof html === 'string'
  const sec = servi ? sectionDe(html) : null
  // CP-1
  juge('CP-1', !servi ? [`page non servie : ${html?.erreur}`] : !sec ? ['aucun h2 d\'id « prospection » dans le HTML rendu'] : !/^10\.\s/.test(sec.titre) ? [`le h2 #prospection dit « ${court(sec.titre, 50)} », « 10. … » attendu`] : [], `HTML rendu : h2#prospection « ${sec?.titre ?? ''} »`)
  // CP-2
  {
    const e = []
    if (!sec) e.push('section introuvable dans le HTML rendu')
    else e.push(...exigences(sec.texte, 'la section'))
    if (!M || M.erreur || typeof M.noticeHtml !== 'function') e.push(`noticeHtml() indisponible (${M?.erreur ?? `${MODULE} absent`})`)
    else e.push(...exigences(texteVisibleJuge(M.noticeHtml()), 'la notice'))
    juge('CP-2', e, `la section rendue et la notice régénérée portent les ${EXIGES.length} mentions et aucune des ${REFUSES.length} refusées`)
  }
  // CP-3
  {
    const e = []
    if (avant === null || tsx === null) e.push(`${PAGE} de HEAD ou de la racine illisible`)
    else e.push(...jugerDiff(avant, tsx))
    if (servi && avant) {
      const rendus = titres(html).map((t) => t.texte).filter((t) => /^[1-9]\./.test(t))
      for (const t of titresSource(avant)) if (!rendus.some((x) => x.startsWith(t))) e.push(`le titre « ${court(t, 40)} » a changé dans le HTML rendu`)
    }
    juge('CP-3', e, 'page.tsx face à HEAD : la date, l\'import de SECTION_PROSPECTION et un bloc inséré d\'un tenant avant les liens de bas de page ; titres 1 à 9 inchangés au rendu')
  }
  // CP-4
  {
    const e = []
    const ua = contrat?.UA_RECENSEUR ?? ''
    if (!/#prospection\)?$/.test(ua)) e.push(`UA_RECENSEUR ne pointe pas #prospection (« ${court(ua, 60)} »)`)
    if (!servi || !titres(html).some((t) => idProspection(t.attributs)) && !/\bid\s*=\s*["']prospection["']/.test(html)) e.push('l\'id prospection est absent de la page servie')
    juge('CP-4', e, 'l\'ancre de UA_RECENSEUR est #prospection, présente dans la page servie')
  }
  // CP-5
  if (!seul || seul === 'CP-5') {
    const e = []
    if (!capture || capture.erreur) e.push(`capture : ${capture?.erreur ?? 'non faite'}`)
    else {
      if (capture.absent) e.push('h2#prospection absent à 390 px')
      if (!(capture.sw <= capture.cw)) e.push(`défilement horizontal à 390 px (scrollWidth ${capture.sw} > clientWidth ${capture.cw})`)
      if (!capture.visible) e.push('le h2 n\'est pas visible après défilement (elementFromPoint)')
    }
    juge('CP-5', e, `capture du juge à 390 px (${capture?.fichier ?? ''}) : scrollWidth ${capture?.sw} ≤ clientWidth ${capture?.cw}, h2 visible au centre après défilement`)
  }
  // CP-6
  if (!seul || seul === 'CP-6') {
    if (temoin) juge('CP-6', [], 'témoin : npm run typecheck ne se juge que sur le dépôt')
    else { const t = typecheck(racine); juge('CP-6', t.ok ? [] : [t.detail], t.detail) }
  }
  // CP-7
  if (!seul || seul === 'CP-7') {
    const e = []
    const v = spawnSync(process.execPath, ['--import', pathToFileURL(path.join(R, 'scripts', 'ts-loader.mjs')).href, path.join(racine, SCRIPT), '--verifier'], { cwd: racine, encoding: 'utf8', timeout: 120_000, windowsHide: true })
    if (v.status !== 0) e.push(`notice-prospection.mjs --verifier : code ${v.status} (${court(`${v.stdout}${v.stderr}`, 80)})`)
    if (!M || M.erreur) e.push(`${MODULE} ne s'importe pas : ${M?.erreur ?? 'absent'}`)
    else e.push(...jugerNotice({ notice: lire(racine, NOTICE), mentions: lire(racine, MENTIONS), attenduNotice: M.noticeHtml(), attenduMentions: M.mentionsHtml(), section: M.SECTION_PROSPECTION, adresse: adresseMentions() }))
    const pub = []
    const rec = (d) => { let l = []; try { l = fs.readdirSync(d, { withFileTypes: true }) } catch { return } for (const x of l) { const p = path.join(d, x.name); if (/notice-prospection/i.test(x.name)) pub.push(p); if (x.isDirectory()) rec(p) } }
    rec(path.join(racine, 'public'))
    if (pub.length) e.push(`notice-prospection sous public/ (${pub.length})`)
    juge('CP-7', e, 'notice-prospection.mjs --verifier en 0 ; les deux pages égales à noticeHtml() et mentionsHtml(), avec chaque phrase, le responsable, l\'ancre, le lien relatif, les mentions et l\'adresse ; ni script, ni lien absolu, ni prestiapp.fr ; rien sous public/')
  }
  return res
}
/** CP-5 : Playwright à 390 px de large. */
async function capturer(base) {
  let nav = null
  try {
    const { chromium } = await import('playwright')
    nav = await chromium.launch()
    const p = await nav.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'fr-FR' })
    await p.goto(`${base}/confidentialite`, { waitUntil: 'load', timeout: 180_000 })
    await p.waitForTimeout(800)
    const r = await p.evaluate(async () => {
      const d = document.documentElement
      d.style.scrollBehavior = 'auto'
      const h = document.getElementById('prospection')
      if (!h) return { absent: true, sw: d.scrollWidth, cw: d.clientWidth, visible: false }
      h.scrollIntoView({ block: 'center', behavior: 'instant' })
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)))
      const b = h.getBoundingClientRect()
      const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
      return { absent: false, sw: d.scrollWidth, cw: d.clientWidth, visible: !!el && (el === h || h.contains(el)) }
    })
    const fichier = path.join(TRAV, 'cp5-390.png')
    await p.screenshot({ path: fichier })
    return { ...r, fichier: path.relative(R, fichier).split(path.sep).join('/') }
  } catch (e) { return { erreur: premiereLigne(e) } } finally { await nav?.close().catch(() => {}) }
}
function typecheck(racine) {
  const tsc = path.join(racine, 'node_modules', 'typescript', 'bin', 'tsc')
  if (!fs.existsSync(tsc)) return { ok: false, detail: 'typescript introuvable dans node_modules' }
  const t0 = Date.now()
  const x = spawnSync(process.execPath, [tsc, '--noEmit', '--pretty', 'false', '--incremental', '--tsBuildInfoFile', path.join(TRAV, 'page.tsbuildinfo')], { cwd: racine, encoding: 'utf8', timeout: 15 * 60_000, windowsHide: true, maxBuffer: 64 << 20 })
  if (x.status === 0) return { ok: true, detail: `npm run typecheck vert (${Math.round((Date.now() - t0) / 1000)} s)` }
  return { ok: false, detail: `npm run typecheck en code ${x.status} : ${court((x.stdout || '').split(/\r?\n/).filter((l) => /error TS/.test(l)).slice(0, 2).join(' | ') || x.stderr, 240)}` }
}
const git = (args, cwd = R) => spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20 })
const pageDeHead = () => { const g = git(['show', `HEAD:${PAGE}`]); return g.status === 0 ? g.stdout.replace(/\r\n?/g, '\n') : null }

// ── L'hébergement (026-162) ───────────────────────────────────────────────────────────────────────────────────────────────
async function hebergement() {
  const K = await import(pathToFileURL(path.join(R, 'lib', 'agents', 'acquisition', 'contrat.ts')).href)
  const base = K.NOTICE_URL
  if (!base) return { prealable: 'notice pas encore publiée, 026-162 (NOTICE_URL vaut null dans contrat.ts)' }
  const M = await import(pathToFileURL(path.join(R, MODULE)).href).catch((e) => ({ erreur: premiereLigne(e) }))
  if (M.erreur || typeof M.noticeHtml !== 'function') return { prealable: `${MODULE} ne s'importe pas (${M.erreur ?? 'noticeHtml absente'})` }
  const racineUrl = base.endsWith('/') ? base : `${base}/`
  const notice = await recuperer(racineUrl), mentions = await recuperer(new URL('mentions-legales/', racineUrl).href)
  const h = jugerEnLigne({ notice, mentions, attenduNotice: M.noticeHtml(), attenduMentions: M.mentionsHtml(), adresse: adresseMentions() })
  const u = new URL(racineUrl)
  const depot = /\.github\.io$/.test(u.host) ? `${u.host.replace(/\.github\.io$/, '')}/${u.pathname.split('/').filter(Boolean)[0] ?? 'presti-notice'}` : 'benjaminfiliot-wq/presti-notice'
  const g = spawnSync('gh', ['api', `repos/${depot}/commits?per_page=1`, '--jq', '.[0].commit.committer.date'], { encoding: 'utf8', windowsHide: true, timeout: 60_000 })
  h['CP-H5'] = jugerG3(lire(R, '.orchestre/decisions.md'), g.status === 0 ? g.stdout.trim() : null)
  const { lireEnvLocal } = await import('./lib/sql-essai.mjs')
  lireEnvLocal(R)
  let etat
  const sb = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''), cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!sb || !cle) return { prealable: 'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent de .env.local' }
  try { const r = await fetch(`${sb}/rest/v1/rpc/acq_etat_envoi`, { method: 'POST', headers: { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(20_000) }); etat = r.ok ? await r.json() : { erreur: r.status } } catch (e) { etat = { erreur: premiereLigne(e) } }
  h['CP-H6'] = jugerConditions(lire(R, CONDITIONS), etat?.erreur ? null : etat)
  if (etat?.erreur) h['CP-H6'].push(`acq_etat_envoi : ${etat.erreur}`)
  return { h, base: racineUrl, notice, mentions }
}

// ── Le témoin et ses sabotages ────────────────────────────────────────────────────────────────────────────────────────────
const AUTO = exigerSousTravail(path.join(TRAV, 'auto'))
const ADRESSE = adresseMentions()
function materialiser(dest, sabotages = []) {
  fs.rmSync(dest, { recursive: true, force: true })
  const copier = (s, d) => { for (const e of fs.readdirSync(s, { withFileTypes: true })) { const a = path.join(s, e.name), b = path.join(d, e.name); if (e.isDirectory()) { fs.mkdirSync(b, { recursive: true }); copier(a, b) } else { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.writeFileSync(b, fs.readFileSync(a, 'utf8').replaceAll('{{ADRESSE}}', ADRESSE ?? '')) } } }
  copier(TEMOIN, dest)
  // page.tsx : celle de HEAD, avec l'import, la date du jour dans les deux branches et le bloc de la section
  const avant = pageDeHead()
  const bloc = fs.readFileSync(path.join(dest, 'section.tsx'), 'utf8')
  let tsx = avant.replace("import { MOIS_AUDIENCE } from '@/lib/audience'\n", "import { MOIS_AUDIENCE } from '@/lib/audience'\nimport { SECTION_PROSPECTION } from '@/lib/confidentialite/prospection'\n")
  tsx = tsx.replace(/(Dernière mise à jour : \{actif\('audience'\) \? )'[^']*' : '[^']*'/, "$1'27 septembre 2026' : '27 septembre 2026'")
  const lignes = tsx.split('\n'), i = lignes.findIndex((l) => /<a href="\/cgu">Conditions générales<\/a>/.test(l))
  lignes.splice(i, 0, ...bloc.replace(/\n$/, '').split('\n'))
  fs.mkdirSync(path.join(dest, 'app', 'confidentialite'), { recursive: true })
  fs.writeFileSync(path.join(dest, PAGE), lignes.join('\n'))
  fs.rmSync(path.join(dest, 'section.tsx'))
  const avantSab = sabotages.filter((s) => s.phase !== 'apres')
  const appliquer = (l) => { for (const s of l) { const f = path.join(dest, s.fichier); if (s.creer !== undefined) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s.creer); continue } const x = fs.readFileSync(f, 'utf8'), y = s.remplacer(x); if (x === y) throw new Error(`rien à remplacer dans ${s.fichier}`); fs.writeFileSync(f, y) } }
  appliquer(avantSab)
  const g = spawnSync(process.execPath, [path.join(dest, SCRIPT)], { cwd: dest, encoding: 'utf8', windowsHide: true })
  if (g.status !== 0) throw new Error(`notice du témoin non écrite : ${court(`${g.stdout}${g.stderr}`, 120)}`)
  appliquer(sabotages.filter((s) => s.phase === 'apres'))
  return avant
}
/** Le rendu du témoin (un HTML construit par le juge : les titres 1 à 9 de HEAD, la section du module) et son petit serveur. */
async function servirTemoin(dest, { html: remplacer = (x) => x } = {}) {
  const avant = pageDeHead()
  const M = await import(`${pathToFileURL(path.join(dest, MODULE)).href}?v=${Date.now()}${Math.random()}`)
  const S = M.SECTION_PROSPECTION
  const e = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const html = remplacer(`<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Politique de confidentialité</title><style>body{margin:0;font-family:sans-serif}main{max-width:720px;margin:0 auto;padding:0 16px}</style></head><body><main class="legal-wrap"><h1>Politique de confidentialité</h1>${titresSource(avant).map((t) => `<h2>${e(t)}</h2><p>…</p>`).join('')}<h2 id="prospection">${e(S.titre)}</h2>${S.paragraphes.map((p) => `<p>${e(p)}</p>`).join('')}<ul>${S.liste.map((l) => `<li>${e(l)}</li>`).join('')}</ul><p><a href="/cgu">Conditions générales</a></p></main>${'<p>…</p>'.repeat(30)}</body></html>`)
  const s = http.createServer((req, res) => { if (req.url.split('?')[0] === '/confidentialite') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html) } else { res.writeHead(404); res.end() } })
  await new Promise((r) => s.listen(0, '127.0.0.1', r))
  return { base: `http://127.0.0.1:${s.address().port}`, arreter: () => new Promise((r) => s.close(r)) }
}
const rempl = (fichier, a, b, phase) => ({ fichier, phase, remplacer: (t) => { if (!t.includes(a)) return t; return t.replace(a, b) } })
const SABOTAGES = [
  ['AC-CP-1A', 'CP-1', 'le h2 sans id', { html: (h) => h.replace('<h2 id="prospection">', '<h2>') }],
  ['AC-CP-1B', 'CP-1', 'le titre numéroté 11', { sab: [rempl(MODULE, "titre: '10. Prospection", "titre: '11. Prospection")] }],
  ['AC-CP-1C', 'CP-1', 'aucune source de section (la référence)', { sab: [{ fichier: PAGE, phase: 'apres', remplacer: () => pageDeHead() }], supprimerModule: true }],
  ['AC-CP-2A', 'CP-2', 'la section sans ADEME', { sab: [{ fichier: MODULE, remplacer: (t) => t.replaceAll("RGE de l'ADEME", 'RGE nationale') }] }],
  ['AC-CP-2B', 'CP-2', 'la section parle de séquenceur', { sab: [rempl(MODULE, 'Les réponses arrivent', 'Un séquenceur envoie ; les réponses arrivent')] }],
  ['AC-CP-2C', 'CP-2', 'le rendu perd « 21 jours »', { html: (h) => h.replace('21 jours', 'trois semaines') }],
  ['AC-CP-3A', 'CP-3', 'la section 3 retouchée', { sab: [rempl(PAGE, '<h2>3. Finalités &amp; bases légales</h2>', '<h2>3. Finalités et bases légales</h2>')] }],
  ['AC-CP-3B', 'CP-3', 'le bloc inséré ailleurs', { sab: [{ fichier: PAGE, remplacer: (t) => { const l = t.split('\n'); const i = l.findIndex((x) => /<h2 id="prospection">/.test(x)); const bloc = l.splice(i, 3); const j = l.findIndex((x) => /<h2>9\. Application mobile<\/h2>/.test(x)); l.splice(j, 0, ...bloc); return l.join('\n') } }] }],
  ['AC-CP-4', 'CP-4', 'la page servie sans l\'ancre', { html: (h) => h.replace('<h2 id="prospection">', '<h2 id="prospection-pros">'), seulement: 'CP-4' }],
  ['AC-CP-5', 'CP-5', 'un défilement horizontal à 390 px', { html: (h) => h.replace('</main>', '<div style="width:900px;height:10px"></div></main>') }],
  ['AC-CP-7A', 'CP-7', 'la notice qui n\'est plus régénérée', { sab: [rempl(NOTICE, '</main>', '<p>ajout à la main</p></main>', 'apres')] }],
  ['AC-CP-7B', 'CP-7', 'un script dans la notice', { sab: [rempl(MODULE, '</main></body></html>\n`\n}\n\nexport function mentionsHtml', '</main><script>1</script></body></html>\n`\n}\n\nexport function mentionsHtml')] }],
  ['AC-CP-7C', 'CP-7', 'les mentions sans le SIREN', { sab: [rempl(MODULE, 'SIREN 109 411 348', 'SIREN à venir')] }],
  ['AC-CP-7D', 'CP-7', 'la notice sous public/', { sab: [{ fichier: 'public/notice-prospection/index.html', creer: '<!doctype html>' }] }],
]
async function autoControle() {
  const l = []
  const noter = (id, ok, d) => l.push(`${ok ? '✅' : '❌'} ${id} ${d}`.replace(/\s*\n\s*/g, ' · '))
  const K = await import(pathToFileURL(path.join(R, 'lib', 'agents', 'acquisition', 'contrat.ts')).href)
  const courir = async (dest, { html, seul } = {}) => { const avant = pageDeHead(); return jugerPage(dest, { temoin: true, servir: () => servirTemoin(dest, { html }), avant, contrat: K, seul }) }
  const dest = path.join(AUTO, 'temoin')
  try {
    materialiser(dest)
    const res = await courir(dest)
    const rouges = [...res].filter(([, r]) => r.echecs.length)
    noter('AC-TEMOIN-CP', !rouges.length, rouges.length ? `le témoin est rouge : ${rouges.map(([id, r]) => `${id} ${court(r.echecs.join(' ; '), 160)}`).join(' | ')}` : `le témoin (${path.relative(R, TEMOIN).split(path.sep).join('/')}) rend ${res.size} critère(s) vert(s) : ${[...res.keys()].join(', ')}`)
  } catch (e) { noter('AC-TEMOIN-CP', false, `témoin non jugé : ${premiereLigne(e)}`) }
  for (const [id, critere, lib, o] of SABOTAGES) {
    const d = path.join(AUTO, id)
    try {
      materialiser(d, o.sab ?? [])
      if (o.supprimerModule) fs.rmSync(path.join(d, MODULE), { force: true })
      const res = await courir(d, { html: o.html, seul: o.supprimerModule ? null : critere })
      const r = res.get(critere)
      noter(id, r && r.echecs.length > 0, r && r.echecs.length ? `sabotage « ${lib} » → ❌ ${critere} ${court(r.echecs.join(' ; '), 180)}` : `sabotage « ${lib} » NON repéré${r ? ` : ✅ ${critere} ${court(r.ok, 100)}` : ''}`)
    } catch (e) { noter(id, false, `sabotage « ${lib} » non joué : ${premiereLigne(e)}`) }
    fs.rmSync(d, { recursive: true, force: true })
  }
  // L'hébergement : un faux GitHub Pages local (mêmes pages, puis une empreinte fausse, un 404, une redirection vers un
  // autre hôte, un traceur, un lien vers prestiapp.fr), la ligne G3 et le document des conditions.
  try {
    materialiser(dest)
    const M = await import(`${pathToFileURL(path.join(dest, MODULE)).href}?v=h${Date.now()}`)
    const N = M.noticeHtml(), Me = M.mentionsHtml()
    let mode = 'ok'
    const s = http.createServer((req, res) => {
      const u = req.url
      if (mode === 'redirection' && u === '/presti-notice/') { res.writeHead(301, { location: 'http://127.0.0.2:9/ailleurs/' }); res.end(); return }
      if (mode === '404' && u === '/presti-notice/mentions-legales/') { res.writeHead(404); res.end(); return }
      const corps = u === '/presti-notice/' ? N : u === '/presti-notice/mentions-legales/' ? Me : null
      if (corps === null) { res.writeHead(404); res.end(); return }
      const x = mode === 'empreinte' && u === '/presti-notice/' ? corps.replace('</main>', '<p>modifié</p></main>') : mode === 'traceur' && u === '/presti-notice/' ? corps.replace('</head>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2"></head>') : mode === 'lien' && u === '/presti-notice/mentions-legales/' ? corps.replace('</main>', `<a href="https://${HOTE_PRESTI}/">site</a></main>`) : corps
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(x)
    })
    await new Promise((r) => s.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${s.address().port}/presti-notice/`
    const jouer = async (m) => { mode = m; const n = await recuperer(base), me = await recuperer(new URL('mentions-legales/', base).href); return jugerEnLigne({ notice: n, mentions: me, attenduNotice: N, attenduMentions: Me, adresse: ADRESSE }) }
    const ok = await jouer('ok')
    const rouges = Object.entries(ok).filter(([, e]) => e.length)
    noter('AC-TEMOIN-CPH', !rouges.length, rouges.length ? `hébergement témoin rouge : ${rouges.map(([k, e]) => `${k} ${court(e.join(' ; '), 100)}`).join(' | ')}` : 'faux GitHub Pages local : CP-H1 à CP-H4 verts sur les deux pages du témoin')
    for (const [id, m, crit, lib] of [['AC-CPH-1A', 'empreinte', 'CP-H1', 'une autre empreinte en ligne'], ['AC-CPH-1B', '404', 'CP-H1', 'les mentions en 404'], ['AC-CPH-1C', 'redirection', 'CP-H1', 'une redirection vers un autre hôte'], ['AC-CPH-3', 'lien', 'CP-H3', `un lien vers ${HOTE_PRESTI}`], ['AC-CPH-4', 'traceur', 'CP-H4', 'une police distante']]) {
      const h = await jouer(m)
      noter(id, h[crit].length > 0, h[crit].length ? `sabotage « ${lib} » → ❌ ${crit} ${court(h[crit].join(' ; '), 140)}` : `sabotage « ${lib} » NON repéré`)
    }
    const hm = jugerEnLigne({ notice: { statut: 200, corps: N, url: base }, mentions: { statut: 200, corps: Me.replace('entrepreneur individuel', 'société'), url: base }, attenduNotice: N, attenduMentions: Me, adresse: ADRESSE })
    noter('AC-CPH-2', hm['CP-H2'].length > 0, hm['CP-H2'].length ? `sabotage « les mentions sans entrepreneur individuel » → ❌ CP-H2 ${court(hm['CP-H2'].join(' ; '), 120)}` : 'sabotage « mentions » NON repéré')
    await new Promise((r) => s.close(r))
    const g3ok = jugerG3('- 2026-09-26 : G3 fait (Benj a coupé l\'entraînement dans ChatGPT)', '2026-09-28T10:00:00Z')
    const g3a = jugerG3('- rien', '2026-09-28T10:00:00Z'), g3b = jugerG3('- 2026-09-29 : G3 fait', '2026-09-28T10:00:00Z')
    noter('AC-CPH-5', !g3ok.length && g3a.length > 0 && g3b.length > 0, `G3 daté avant le commit publié : ${g3ok.length ? 'rouge' : 'vert'} ; sans ligne G3 : ${g3a.join(' ; ') || 'NON repéré'} ; G3 après la publication : ${g3b.join(' ; ') || 'NON repéré'}`)
    const doc = lire(dest, CONDITIONS)
    const c0 = jugerConditions(doc, { ads_archive: { permis: true, le: '2026-09-27T09:00:00Z' } })
    const c1 = jugerConditions(doc, { ads_archive: { permis: false, le: '2026-09-27T09:00:00Z' } })
    const c2 = jugerConditions(doc.replace('Verdict : PERMIS', ''), { ads_archive: { permis: true, le: '2026-09-27T09:00:00Z' } })
    const c3 = jugerConditions(doc.replace('« usage conforme aux conditions de la plateforme »', '« un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize »'), undefined)
    noter('AC-CPH-6', !c0.length && c1.length > 0 && c2.length > 0 && c3.length > 0, `document témoin et base d'accord : ${c0.length ? `rouge (${c0.join(' ; ')})` : 'vert'} ; base qui dit REFUSE : ${c1.join(' ; ') || 'NON repéré'} ; sans verdict : ${c2.join(' ; ') || 'NON repéré'} ; citation de 16 mots : ${c3.join(' ; ') || 'NON repérée'}`)
  } catch (e) { noter('AC-CPH', false, `hébergement non éprouvé : ${premiereLigne(e)}`) }
  return l
}

// ── Principal ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const o = lireOptions(process.argv.slice(2), { drapeauxConnus: ['hebergement', 'reel', 'confirmer-reel', 'domaines'] })
const refuser = (m) => { console.log(`${NOM} : appel refusé — ${m}`); process.exit(2) }
if (o.drapeaux.has('domaines')) refuser('--domaines est retiré par la voie gratuite (plus de domaines d\'envoi) : l\'hébergement de la notice se juge par --hebergement --reel --confirmer-reel (026-162)')
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
const HEB = o.drapeaux.has('hebergement'), REEL = o.drapeaux.has('reel'), CONF = o.drapeaux.has('confirmer-reel')
if (REEL && !CONF) refuser('--reel exige --confirmer-reel : il interroge la notice en ligne et la production, Claude Code seulement, jamais le registre')
if ((REEL || CONF) && !HEB) refuser('--reel ne va qu\'avec --hebergement')
if (HEB && !REEL) refuser('--hebergement exige --reel --confirmer-reel')
if (o.autoControle) {
  console.log(`${NOM} --auto-controle — témoin et sabotages`)
  const l = await autoControle()
  for (const x of l) console.log(x)
  const rouges = l.filter((x) => x.startsWith('❌')).map((x) => x.split(' ')[1])
  console.log(rouges.length ? `${NOM} --auto-controle : FAIL — ${rouges.join(', ')}` : `${NOM} --auto-controle : PASS (${l.length} épreuves)`)
  process.exitCode = rouges.length ? 1 : 0
} else if (HEB) {
  console.log(`${NOM} --hebergement --reel`)
  const x = await hebergement()
  if (x.prealable) { console.log(`${NOM} : préalable manquant — ${x.prealable}`); process.exitCode = 2 }
  else {
    const ids = ['CP-H1', 'CP-H2', 'CP-H3', 'CP-H4', 'CP-H5', 'CP-H6']
    const ok = { 'CP-H1': `${x.base} et mentions-legales/ en 200, même hôte, empreintes égales aux fichiers du dépôt (notice ${empreinte(x.notice.corps ?? '').slice(0, 12)}…, mentions ${empreinte(x.mentions.corps ?? '').slice(0, 12)}…)`, 'CP-H2': 'mentions : Benjamin Filiot, entrepreneur individuel, 109 411 348, l\'adresse, GitHub', 'CP-H3': `aucun lien vers ${HOTE_PRESTI}`, 'CP-H4': 'ni script, ni ressource distante, ni traceur', 'CP-H5': 'G3 daté avant le commit publié', 'CP-H6': 'conditions d\'ads_archive datées, sourcées, trois usages, un verdict égal à celui de la base, aucune citation de plus de 15 mots' }
    for (const id of ids) console.log(x.h[id].length ? `❌ ${id} ${x.h[id].slice(0, 6).join(' ; ')}` : `✅ ${id} ${ok[id]}`)
    const rouges = ids.filter((id) => x.h[id].length)
    console.log(rouges.length ? `${NOM} --hebergement : FAIL — ${rouges.join(', ')}` : `${NOM} --hebergement : PASS`)
    process.exitCode = rouges.length ? 1 : 0
  }
} else {
  const racine = o.racine
  if (!fs.existsSync(racine)) refuser(`racine introuvable : ${racine}`)
  const temoin = path.resolve(racine) !== path.resolve(R)
  console.log(`${NOM} — racine ${path.relative(R, racine).split(path.sep).join('/') || '.'}`)
  const K = await import(pathToFileURL(path.join(R, 'lib', 'agents', 'acquisition', 'contrat.ts')).href)
  const res = await jugerPage(racine, { temoin, avant: pageDeHead(), contrat: K, servir: async () => { const { serveur } = await import('./lib/capture.mjs'); return serveur(racine) } })
  for (const id of IDS) { const r = res.get(id); console.log(r.echecs.length ? `❌ ${id} ${r.echecs.slice(0, 6).join(' ; ')}${r.echecs.length > 6 ? ` ; … (${r.echecs.length} défauts)` : ''}` : `✅ ${id} ${r.ok}`) }
  const rouges = IDS.filter((id) => res.get(id).echecs.length)
  console.log(rouges.length ? `${NOM} : FAIL — ${rouges.join(', ')}` : `${NOM} : PASS`)
  process.exitCode = rouges.length ? 1 : 0
}
