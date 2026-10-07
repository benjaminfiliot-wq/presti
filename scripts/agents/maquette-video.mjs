import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const LIMITE = 3 * 1024 * 1024
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }

class ErreurVideo extends Error {
  constructor(code, message) { super(message); this.code = code }
}

const dans = (racine, cible) => cible === racine || cible.startsWith(`${racine}${path.sep}`)

async function servir(dossier) {
  const racine = await fs.realpath(dossier)
  const serveur = http.createServer(async (requete, reponse) => {
    try {
      const url = new URL(requete.url, 'http://127.0.0.1')
      const chemin = decodeURIComponent(url.pathname)
      if (chemin.split('/').includes('..') || chemin.includes('\\') || chemin.includes('\0')) throw new Error('chemin refusé')
      const cible = path.resolve(racine, `.${chemin === '/' ? '/index.html' : chemin}`)
      if (!dans(racine, cible)) throw new Error('chemin refusé')
      const reel = await fs.realpath(cible)
      if (!dans(racine, reel)) throw new Error('chemin refusé')
      const contenu = await fs.readFile(reel)
      reponse.writeHead(200, { 'content-type': TYPES[path.extname(reel).toLowerCase()] ?? 'application/octet-stream' })
      reponse.end(contenu)
    } catch {
      reponse.writeHead(404)
      reponse.end()
    }
  })
  await new Promise((resoudre, rejeter) => {
    serveur.once('error', rejeter)
    serveur.listen(0, '127.0.0.1', resoudre)
  })
  return { adresse: `http://127.0.0.1:${serveur.address().port}`, fermer: () => new Promise((resoudre) => serveur.close(resoudre)) }
}

function executer(binaire, argumentsCommande) {
  return new Promise((resoudre, rejeter) => {
    const processus = spawn(binaire, argumentsCommande, { stdio: 'ignore', windowsHide: true })
    processus.once('error', () => rejeter(new ErreurVideo(5, 'ffmpeg absent')))
    processus.once('close', (code) => code === 0 ? resoudre() : rejeter(new ErreurVideo(5, 'ffmpeg a échoué')))
  })
}

function validerSortie(sortie) {
  if (!sortie || path.extname(sortie).toLowerCase() !== '.mp4') throw new ErreurVideo(2, 'sortie invalide')
  const cible = path.resolve(sortie)
  const travail = path.join(RACINE, '.orchestre', 'travail')
  if (dans(RACINE, cible) && !dans(travail, cible)) throw new ErreurVideo(2, 'sortie dans le dépôt')
  return cible
}

export async function fabriquerVideo({ dossierSite, sortie, duree = 18, lancerNavigateur = () => chromium.launch({ headless: true }), ffmpeg = process.env.FFMPEG || 'ffmpeg' }) {
  const cible = validerSortie(sortie)
  if (!Number.isFinite(Number(duree)) || Number(duree) < 15 || Number(duree) > 20) throw new ErreurVideo(2, 'durée invalide')
  duree = Number(duree)
  let dossier
  try { dossier = await fs.realpath(dossierSite) } catch { throw new ErreurVideo(2, 'dossier absent') }
  if (!(await fs.stat(dossier)).isDirectory()) throw new ErreurVideo(2, 'dossier absent')
  const sortieTemporaire = `${cible}.capture.jpg`
  // 540 px de large et 24 images par seconde : une page de neuf scènes tient sous 3 Mo
  const LARGE = 540
  let serveur, navigateur, hauteurCapture = 0
  try {
    await fs.mkdir(path.dirname(cible), { recursive: true })
    serveur = await servir(dossier)
    try { navigateur = await lancerNavigateur() } catch { throw new ErreurVideo(5, 'Chromium absent') }
    const page = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })
    await page.route('**/*', (route) => {
      const demande = new URL(route.request().url())
      return demande.origin === serveur.adresse ? route.continue() : route.abort()
    })
    await page.goto(serveur.adresse, { waitUntil: 'load', timeout: 30000 })
    await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; scroll-behavior: auto !important; }' })
    // La maquette au niveau Lestraque (07/10) dévoile ses blocs au défilement (.reveal → .vu, kit.js) et épingle sa galerie : sur
    // une capture pleine page, tout ce qui n'a pas été vu restait à opacité 0 et le travelling occupait trois écrans de noir.
    await page.addStyleTag({ content: 'html.js .reveal, html.js .etape, .reveal, .etape { opacity: 1 !important; transform: none !important; } .travelling { height: auto !important; } .travelling__epingle { position: static !important; height: auto !important; } .galerie--scene { transform: none !important; } html.tuile-suivante .nav, html.tuile-suivante .apercu { visibility: hidden !important; }' })
    await page.evaluate(() => document.querySelectorAll('.reveal, .etape').forEach((e) => e.classList.add('vu')))
    await page.evaluate(async () => {
      await document.fonts.ready
      // les photos « lazy » sous la ligne de flottaison ne se chargeraient jamais : decode() attendait sans fin (07/10, maquette v2)
      for (const image of document.images) image.loading = 'eager'
      await Promise.race([Promise.all([...document.images].map((image) => image.decode().catch(() => {}))), new Promise((r) => setTimeout(r, 15000))])
    })
    const hauteur = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight))
    if (hauteur < 1200) throw new ErreurVideo(3, 'page trop courte')
    // Écran par écran, puis bout à bout : une capture « pleine page » agrandit la fenêtre à la hauteur de la page, et les scènes en
    // 100svh (héros, bande, contact) devenaient des aplats de plusieurs milliers de pixels (07/10). La nav et la mention d'aperçu
    // ne figurent que sur le premier écran.
    // Chaque écran est ramené à LARGE px dès sa capture et posé dans UN JPEG : l'assemblage en PNG plein format puis sa réduction
    // prenaient 54 s (07/10).
    const echelle = LARGE / 390
    const tuiles = []
    for (let y = 0; y < hauteur; y += 844) {
      // le dernier écran ne peut pas descendre plus bas que la page : on y prend seulement ce qui manque, à son décalage réel
      const reel = await page.evaluate((yy) => { window.scrollTo(0, yy); document.documentElement.classList.toggle('tuile-suivante', yy > 0); return window.scrollY }, y)
      await page.waitForTimeout(300)
      const decalage = Math.max(0, Math.round(y - reel))
      const reste = Math.floor(Math.min(844 - decalage, hauteur - y))
      if (reste < 2) break
      const brut = await page.screenshot({ type: 'jpeg', quality: 92, animations: 'disabled', clip: { x: 0, y: decalage, width: 390, height: reste } })
      tuiles.push({ input: await sharp(brut).resize({ width: LARGE, height: Math.max(1, Math.round(reste * echelle)), fit: 'fill' }).toBuffer(), left: 0, top: Math.round(y * echelle) })
    }
    hauteurCapture = Math.ceil(hauteur * echelle) + 2
    await sharp({ create: { width: LARGE, height: hauteurCapture, channels: 3, background: '#000' }, limitInputPixels: false })
      .composite(tuiles).jpeg({ quality: 86 }).toFile(sortieTemporaire)
    await page.close()
  } finally {
    if (navigateur) await navigateur.close()
    if (serveur) await serveur.fermer()
  }
  try {
    await fs.mkdir(path.dirname(cible), { recursive: true })
    // La page entière d'une maquette v2 fait 8 000 à 9 000 px de haut : l'image réduite est recadrée image par image
    const reduite = sortieTemporaire
    const infos = { height: hauteurCapture }
    const fenetre = Math.round((844 * LARGE) / 390 / 2) * 2
    // un écran après l'autre : chaque écran reste posé (65 % de son temps) puis glisse au suivant en douceur — un défilement continu
    // de 8 000 px en 15 s ne se lisait pas et ne se compressait pas
    const ecrans = Math.max(1, Math.ceil((infos.height - fenetre) / fenetre))
    const parEcran = (duree - 3) / ecrans
    // l'image est décodée UNE fois (filtre loop) puis recadrée : « -loop 1 » la redécodait à chacune des 540 images (230 s, 07/10)
    const u = `max(0\,t-1.5)`
    const glisse = `clip((mod(${u}\,${parEcran.toFixed(4)})/${parEcran.toFixed(4)}-0.65)/0.35\,0\,1)`
    const mouvement = `loop=loop=-1:size=1:start=0,setpts=N/24/TB,crop=in_w:${fenetre}:0:'(in_h-out_h)/${ecrans}*min(${ecrans}\,floor(${u}/${parEcran.toFixed(4)})+st(1\,${glisse})*0+ld(1)*ld(1)*(3-2*ld(1)))',format=yuv420p`
    for (const crf of [28, 30, 32]) {
      await executer(ffmpeg, ['-y', '-v', 'error', '-i', reduite, '-vf', mouvement, '-t', String(duree), '-r', '24', '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-movflags', '+faststart', '-an', '-map_metadata', '-1', cible])
      const poids = (await fs.stat(cible)).size
      if (poids <= LIMITE) return { code: 0, duree, poids, hauteur: hauteurCapture }
    }
    throw new ErreurVideo(4, 'vidéo trop lourde')
  } finally {
    await fs.rm(sortieTemporaire, { force: true })
  }
}

async function lireDimensionsPng(fichier) {
  const fichierOuvert = await fs.open(fichier, 'r')
  try {
    const entete = Buffer.alloc(24)
    await fichierOuvert.read(entete, 0, 24, 0)
    return { largeur: entete.readUInt32BE(16), hauteur: entete.readUInt32BE(20) }
  } finally { await fichierOuvert.close() }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const dossierSite = args[0]
  const options = args.slice(1)
  const sorties = options.filter((argument) => argument.startsWith('--sortie='))
  const durees = options.filter((argument) => argument.startsWith('--duree='))
  const inconnues = options.filter((argument) => !argument.startsWith('--sortie=') && !argument.startsWith('--duree='))
  try {
    if (!dossierSite || sorties.length !== 1 || durees.length > 1 || inconnues.length) throw new ErreurVideo(2, 'usage')
    const resultat = await fabriquerVideo({ dossierSite, sortie: sorties[0].slice(9), duree: durees.length ? Number(durees[0].slice(8)) : 18 })
    console.log(`${resultat.duree} s · ${resultat.poids} octets · code 0`)
  } catch (erreur) {
    const code = Number.isInteger(erreur?.code) ? erreur.code : 1
    console.log(`0 s · 0 octet · code ${code}`)
    process.exitCode = code
  }
}
