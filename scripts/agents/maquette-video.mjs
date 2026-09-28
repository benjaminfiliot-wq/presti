import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

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
  const sortieTemporaire = `${cible}.capture.png`
  let serveur, navigateur
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
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.images].map((image) => image.decode().catch(() => {})))
    })
    const hauteur = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight))
    if (hauteur < 1200) throw new ErreurVideo(3, 'page trop courte')
    await page.screenshot({ path: sortieTemporaire, fullPage: true, animations: 'disabled' })
    await page.close()
  } finally {
    if (navigateur) await navigateur.close()
    if (serveur) await serveur.fermer()
  }
  try {
    await fs.mkdir(path.dirname(cible), { recursive: true })
    const hauteurCapture = (await lireDimensionsPng(sortieTemporaire)).hauteur
    const fenetre = 844 * 2
    const mouvement = `crop=in_w:${fenetre}:0:'(in_h-out_h)*min(1,max(0,(t-1.5)/(${duree}-3)))',scale=720:-2,fps=30,format=yuv420p`
    for (const crf of [28, 30, 32]) {
      await executer(ffmpeg, ['-y', '-v', 'error', '-loop', '1', '-framerate', '30', '-i', sortieTemporaire, '-t', String(duree), '-vf', mouvement, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-movflags', '+faststart', '-an', '-map_metadata', '-1', cible])
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
