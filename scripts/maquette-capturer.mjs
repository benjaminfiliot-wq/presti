// Capture locale du haut de l'accueil d'une maquette privée.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { chromium } from 'playwright'
import sharp from 'sharp'

const dossier = path.resolve(process.argv[2] || '')
if (!process.argv[2] || !fs.statSync(dossier, { throwIfNoEntry: false })?.isDirectory()) {
  console.error('Usage : node scripts/maquette-capturer.mjs <dossier>')
  process.exit(1)
}

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' }
const serveur = http.createServer((req, res) => {
  let nom
  try { nom = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname) } catch { res.writeHead(400).end(); return }
  const fichier = path.resolve(dossier, '.' + nom, nom.endsWith('/') ? 'index.html' : '')
  if (!fichier.startsWith(dossier + path.sep)) { res.writeHead(403).end(); return }
  fs.readFile(fichier, (err, data) => {
    if (err) { res.writeHead(404).end(); return }
    res.writeHead(200, { 'content-type': types[path.extname(fichier)] || 'application/octet-stream' }).end(data)
  })
})

let navigateur
try {
  await new Promise((resolve) => serveur.listen(0, '127.0.0.1', resolve))
  navigateur = await chromium.launch({ headless: true })
  const base = `http://127.0.0.1:${serveur.address().port}`
  for (const [nom, largeur, hauteur, mobile] of [['bureau', 1440, 900, false], ['telephone', 390, 844, true]]) {
    const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile })
    try {
      const page = await contexte.newPage()
      await page.goto(base + '/', { waitUntil: 'load' })
      await page.evaluate(() => document.fonts?.ready)
      const fichier = path.join(dossier, `capture-${nom}.jpg`)
      await page.screenshot({ path: fichier, type: 'jpeg', quality: 78, fullPage: false })
      const octets = fs.statSync(fichier).size
      const stats = await sharp(fichier).greyscale().stats()
      if (!octets || octets > 1_000_000 || stats.channels[0].stdev < 8) throw new Error(`${nom} : capture vide ou trop lourde`)
      console.log(`${nom} : ${largeur}×${hauteur}, ${octets} octets`)
    } finally { await contexte.close() }
  }
} catch (erreur) {
  console.error(erreur.message)
  process.exitCode = 1
} finally {
  if (navigateur) await navigateur.close()
  serveur.close()
}
