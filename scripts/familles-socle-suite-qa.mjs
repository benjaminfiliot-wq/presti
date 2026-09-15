// scripts/familles-socle-suite-qa.mjs — le juge de la tâche 021-20 : la suite du socle des familles (cahier de la vague 5,
// .orchestre/preuves/021-00/cahier-vague-5.md, §3.0 « 021-20 » et §6.1 SS-1 à SS-5). Tout se passe dans des copies sous
// .orchestre/travail/ ; le site n'est jamais régénéré en place.
//   SS-1 sans famille, le générateur rend exactement ce que rendait celui de 021-01 (245bd3a), à kit égal (le kit du disque, pour
//        que les tâches parallèles sur le kit ne comptent pas) : mêmes fichiers, mêmes octets (sitemap hors lastmod, attributs
//        data-relief-* retirés) ; aucun bureau.css, aucun lien vers bureau.css ;
//   SS-2 famille témoin avec temoin.bureau.css : lestraque/bureau.css écrit avec la règle du témoin ; sur toutes les pages, le lien
//        <link rel="stylesheet" href="…bureau.css" media="(min-width: 1024px)"> juste après celui de styles.css ; au téléphone
//        (390×844), la requête de bureau.css n'a pas la priorité initiale VeryHigh ; au bureau (1440×900), la règle s'applique ;
//   SS-3 le crochet credits du témoin ajoute une entrée « video » : elle apparaît dans les crédits des mentions légales avec un lien
//        vers le texte de sa licence (licenceUrl) ; absente sans la famille ;
//   SS-4 Lighthouse mobile (scripts/lighthouse-mediane.mjs, 5 passes) sur la génération du témoin, dont bureau.css pèse au moins
//        6 000 octets en brotli : médiane de performance ≥ 95 et LCP < 2 500 ms (la barre complète de l'outil) ;
//   SS-5 scripts/familles-socle-qa.mjs PASS.
//
// Usage : node scripts/familles-socle-suite-qa.mjs
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SD = path.join(R, 'public', 'sites-demo')
const BASE = '245bd3a' // le commit du PASS de 021-01
const T = path.join(R, '.orchestre', 'travail', `socle-suite-qa-${process.pid}`)
const LIEN_LICENCE = 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr'
const echecs = [], faits = []
const fin = () => {
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ suite du socle : FAIL — ${echecs.join(' ; ')}` : '✓ suite du socle : PASS — rien ne change sans famille, feuille de bureau non bloquante au téléphone, crédits de vidéo avec lien de licence, Lighthouse tenu, socle intact')
  process.exitCode = echecs.length ? 1 : 0
}
const gen = (sites, a) => { const r = spawnSync(process.execPath, [path.join(sites, 'generer.mjs'), 'lestraque', ...a], { cwd: R, encoding: 'utf8', timeout: 180000 }); return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}` } }
const copierSites = (dst) => { fs.mkdirSync(dst, { recursive: true }); fs.copyFileSync(path.join(SD, 'generer.mjs'), path.join(dst, 'generer.mjs')); for (const d of ['_kit', '_polices', 'lestraque']) fs.cpSync(path.join(SD, d), path.join(dst, d), { recursive: true }) }
const produits = (d) => { const l = []; const walk = (x) => { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const f = path.join(x, e.name); if (e.isDirectory()) { if (!['images', 'fonts', 'relief', 'video', 'eclate'].includes(e.name)) walk(f) } else if (/^(index\.html|styles\.css|bureau\.css|site\.js|sitemap\.xml|robots\.txt|favicon\.svg)$/.test(e.name)) l.push(path.relative(d, f).split(path.sep).join('/')) } }; walk(d); return l.sort() }
const lire = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')
const normaliser = (rel, s) => (/\.html$/.test(rel) ? s.replace(/\sdata-relief-(?:texture|calme|lumiere-css|descente)(?:="[^"]*"|='[^']*')?(?=[\s>])/g, '') : /sitemap\.xml$/.test(rel) ? s.replace(/<lastmod>[^<]*<\/lastmod>/g, '') : s)

fs.rmSync(T, { recursive: true, force: true }); fs.mkdirSync(T, { recursive: true })
try {
  // ── SS-1 ───────────────────────────────────────────────────────────────────────────────────────────────────
  const AVANT = path.join(T, 'avant'), APRES = path.join(T, 'apres')
  copierSites(AVANT)
  const r0 = spawnSync('git', ['show', `${BASE}:public/sites-demo/generer.mjs`], { cwd: R, maxBuffer: 1 << 26 })
  if (r0.status) throw new Error(`git show ${BASE}:generer.mjs impossible`)
  fs.writeFileSync(path.join(AVANT, 'generer.mjs'), r0.stdout)
  const ref = gen(AVANT, ['--familles='])
  if (ref.code !== 0) throw new Error(`le générateur de référence ne génère pas : ${ref.sortie.trim().slice(-240)}`)
  const nouv = gen(SD, ['--familles=', `--sortie=${APRES}`])
  if (nouv.code !== 0) echecs.push(`SS-1 : génération sans famille en échec (${nouv.sortie.trim().slice(-240)})`)
  else {
    const la = produits(path.join(AVANT, 'lestraque')), lb = produits(APRES)
    const diff = la.filter((f) => !lb.includes(f) || normaliser(f, lire(path.join(AVANT, 'lestraque', f))) !== normaliser(f, lire(path.join(APRES, f)))).concat(lb.filter((f) => !la.includes(f)))
    faits.push(`SS-1 : ${la.length} fichiers de référence, ${diff.length} écart(s)`)
    if (diff.length) echecs.push(`SS-1 : sans famille, la sortie diffère de celle de 021-01 (${diff.slice(0, 5).join(', ')})`)
    if (lb.includes('bureau.css') || lb.some((f) => /\.html$/.test(f) && lire(path.join(APRES, f)).includes('bureau.css'))) echecs.push('SS-1 : bureau.css ou son lien présent sans famille')
  }

  // ── SS-2 et SS-3 : la famille témoin ───────────────────────────────────────────────────────────────────────
  const COPIE = path.join(T, 'copie'), FAM = path.join(COPIE, '_kit', 'familles'), ST = path.join(T, 'sortie-temoin')
  copierSites(COPIE)
  fs.mkdirSync(FAM, { recursive: true })
  // une feuille de bureau réaliste : des règles peu compressibles jusqu'à 6 000 octets en brotli, plus une règle témoin lisible
  let regles = ['.hero__contenu{outline:3px solid rgb(1, 2, 3)}']
  for (let i = 0; zlib.brotliCompressSync(Buffer.from(regles.join('\n'))).length < 6000; i++) regles.push(`.t${crypto.createHash('sha1').update(String(i)).digest('hex').slice(0, 16)}{margin:${i % 97}px ${i % 13}px;translate:${i % 7}px 0}`)
  fs.writeFileSync(path.join(FAM, 'temoin.bureau.css'), regles.join('\n') + '\n')
  fs.writeFileSync(path.join(FAM, 'temoin.mjs'), `export default {\n  credits: (entrees, ctx) => [...entrees, { type: 'video', base: 'temoin-video', legende: 'Vidéo témoin du juge', auteur: 'Juge', licence: 'CC BY-SA 4.0', licenceUrl: '${LIEN_LICENCE}', source: 'https://example.invalid/temoin-video' }],\n}\n`)
  const g2 = gen(COPIE, ['--familles=temoin', `--sortie=${ST}`])
  if (g2.code !== 0) echecs.push(`SS-2 : génération avec le témoin en échec (${g2.sortie.trim().slice(-240)})`)
  else {
    const bureau = lire(path.join(ST, 'bureau.css'))
    if (!bureau.includes('rgb(1, 2, 3)') && !bureau.includes('rgb(1,2,3)')) echecs.push('SS-2 : lestraque/bureau.css absent ou sans la règle du témoin')
    const brotli = zlib.brotliCompressSync(Buffer.from(bureau)).length
    faits.push(`SS-2 : bureau.css ${Buffer.byteLength(bureau)} octets, ${brotli} en brotli`)
    const pages = produits(ST).filter((f) => /index\.html$/.test(f))
    const sansLien = pages.filter((f) => !/<link rel="stylesheet" href="((?:\.\.\/)*)styles\.css">\s*<link rel="stylesheet" href="\1bureau\.css" media="\(min-width: 1024px\)">/.test(lire(path.join(ST, f))))
    if (sansLien.length) echecs.push(`SS-2 : ${sansLien.length} page(s) sur ${pages.length} sans le lien bureau.css juste après styles.css (${sansLien.slice(0, 3).join(', ')})`)
    else faits.push(`SS-2 : lien bureau.css en place sur ${pages.length} pages`)
    const mentions = pages.find((f) => /mentions/.test(f))
    const htmlMentions = mentions ? lire(path.join(ST, mentions)) : ''
    if (!htmlMentions.includes('Vidéo témoin du juge')) echecs.push('SS-3 : l\'entrée vidéo du crochet credits est absente des mentions légales')
    else if (!new RegExp(`href="${LIEN_LICENCE.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}"`).test(htmlMentions)) echecs.push('SS-3 : l\'entrée vidéo n\'a pas de lien vers le texte de sa licence')
    else faits.push('SS-3 : entrée vidéo créditée avec le lien de licence')
    const mentionsSans = produits(APRES).find((f) => /mentions/.test(f))
    if (mentionsSans && lire(path.join(APRES, mentionsSans)).includes('Vidéo témoin du juge')) echecs.push('SS-3 : l\'entrée vidéo apparaît sans la famille')

    // navigateur : priorité au téléphone, règle au bureau
    const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', woff2: 'font/woff2', svg: 'image/svg+xml', json: 'application/json' }
    const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ST, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() } r.writeHead(200, { 'content-type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r) })
    await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
    const url = `http://127.0.0.1:${srv.address().port}/index.html`
    const nav = await chromium.launch()
    try {
      const tel = await (await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage()
      const cdp = await tel.context().newCDPSession(tel)
      const priorites = []
      cdp.on('Network.requestWillBeSent', (e) => { if (/bureau\.css/.test(e.request.url)) priorites.push(e.request.initialPriority) })
      await cdp.send('Network.enable')
      await tel.goto(url, { waitUntil: 'load' })
      await tel.waitForTimeout(1000)
      faits.push(`SS-2 : au téléphone, priorité initiale de bureau.css : ${priorites.join(', ') || 'aucune requête'}`)
      if (priorites.includes('VeryHigh')) echecs.push('SS-2 : au téléphone, bureau.css est demandée en priorité VeryHigh (bloquante)')
      const bur = await (await nav.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
      await bur.goto(url, { waitUntil: 'load' })
      const couleur = await bur.evaluate(() => getComputedStyle(document.querySelector('.hero__contenu')).outlineColor)
      if (couleur !== 'rgb(1, 2, 3)') echecs.push(`SS-2 : au bureau, la règle du témoin ne s'applique pas (outline-color ${couleur})`)
    } finally { await nav.close(); srv.close() }

    // ── SS-4 ──────────────────────────────────────────────────────────────────────────────────────────────────
    const lh = spawnSync(process.execPath, [path.join(R, 'scripts', 'lighthouse-mediane.mjs'), ST, `--resume=${path.join(T, 'lighthouse.json')}`], { cwd: R, encoding: 'utf8', timeout: 1800000 })
    const ligne = `${lh.stdout || ''}${lh.stderr || ''}`.trim().split('\n').pop() || ''
    faits.push(`SS-4 : ${ligne.replace(/ — .*$/, '').slice(0, 200)}`)
    if (lh.status !== 0) echecs.push(`SS-4 : ${ligne.slice(0, 200)}`)
    try { fs.copyFileSync(path.join(T, 'lighthouse.json'), path.join(R, '.orchestre', 'preuves', '021-20', 'lighthouse.json')) } catch { /* preuve facultative */ }
  }
} catch (e) {
  echecs.push(`juge interrompu : ${e.message}`)
} finally {
  fs.rmSync(T, { recursive: true, force: true })
}

// ── SS-5 ─────────────────────────────────────────────────────────────────────────────────────────────────────
const so = spawnSync(process.execPath, [path.join(R, 'scripts', 'familles-socle-qa.mjs')], { cwd: R, encoding: 'utf8', timeout: 1800000, maxBuffer: 1 << 26 })
faits.push(`SS-5 : ${`${so.stdout || ''}`.trim().split('\n').pop().slice(0, 140)}`)
if (so.status !== 0) echecs.push('SS-5 : familles-socle-qa.mjs en échec')
fin()
