#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const LARGEUR = 1080
const HAUTEUR = 1350
const FOND = { r: 10, g: 12, b: 17 }
const ACCENT = '#D97757'
const BLANC = '#F7F4EF'
const DOSSIER_SORTIE = path.join('publications', 'serie-2')
const NUMEROS = ['11', '12', '14', '15', '16']
const CAPTURES = {
  11: path.join('promo-src', 'crop-devis.png'),
  12: path.join('promo-src', 'captures', 'console-devis-brouillon.png'),
  14: path.join('promo-src', 'captures', 'console-tableau-de-bord.png'),
  15: path.join('promo-src', 'crop-msg.png'),
}

function echapperXml(texte) {
  return texte
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function largeurEstimee(texte, taille) {
  return [...texte].reduce((total, caractere) => {
    if (' ilItfrj'.includes(caractere)) return total + taille * 0.3
    if ('MWÉÀ'.includes(caractere)) return total + taille * 0.82
    return total + taille * 0.56
  }, 0)
}

function composerLignes(titre) {
  for (let taille = 76; taille >= 54; taille -= 2) {
    const lignes = []
    let ligne = ''
    for (const mot of titre.split(/\s+/)) {
      const essai = ligne ? `${ligne} ${mot}` : mot
      if (ligne && largeurEstimee(essai, taille) > 920) {
        lignes.push(ligne)
        ligne = mot
      } else {
        ligne = essai
      }
    }
    if (ligne) lignes.push(ligne)
    if (lignes.length <= 3 && lignes.every((item) => largeurEstimee(item, taille) <= 920)) {
      return { lignes, taille }
    }
  }
  throw new Error(`Titre trop long pour trois lignes : ${titre}`)
}

function calqueTexte(titre) {
  const { lignes, taille } = composerLignes(titre)
  const interligne = Math.round(taille * 1.08)
  const premiereLigne = 190
  const tspans = lignes.map((ligne, index) => (
    `<tspan x="60" y="${premiereLigne + index * interligne}">${echapperXml(ligne)}</tspan>`
  )).join('')

  return Buffer.from(`
    <svg width="${LARGEUR}" height="${HAUTEUR}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${LARGEUR}" height="420" fill="${ACCENT}"/>
      <text x="60" y="82" fill="#0A0C11" font-family="Arial, Helvetica, sans-serif"
        font-size="30" font-weight="700" letter-spacing="4">Presti</text>
      <rect x="60" y="112" width="92" height="5" rx="2.5" fill="#0A0C11"/>
      <text fill="${BLANC}" font-family="Arial, Helvetica, sans-serif" font-size="${taille}"
        font-weight="700" letter-spacing="-1">${tspans}</text>
      <text x="60" y="1310" fill="#A9ADB8" font-family="Arial, Helvetica, sans-serif"
        font-size="26" font-weight="700" letter-spacing="1.5">prestiapp.fr</text>
    </svg>
  `)
}

function fondNuit() {
  const pixels = Buffer.alloc(LARGEUR * HAUTEUR * 3)
  let hasard = 0x02205
  for (let index = 0; index < pixels.length; index += 3) {
    hasard = (hasard * 1664525 + 1013904223) >>> 0
    const grain = (hasard >>> 29) - 3
    pixels[index] = FOND.r + grain
    pixels[index + 1] = FOND.g + grain
    pixels[index + 2] = FOND.b + grain
  }
  return sharp(pixels, { raw: { width: LARGEUR, height: HAUTEUR, channels: 3 } })
}

function cadreCapture() {
  return Buffer.from(`
    <svg width="${LARGEUR}" height="${HAUTEUR}" xmlns="http://www.w3.org/2000/svg">
      <rect x="59" y="549" width="962" height="692" rx="28" fill="#11151D" stroke="#2B303A" stroke-width="2"/>
      <rect x="80" y="570" width="920" height="650" rx="10" fill="#0E1118"/>
    </svg>
  `)
}

function carteTypographique() {
  const traits = Array.from({ length: 13 }, (_, index) => {
    const y = 606 + index * 45
    const largeur = 820 - (index % 4) * 90
    return `<rect x="130" y="${y}" width="${largeur}" height="2" fill="#F7F4EF" opacity="${0.10 + (index % 3) * 0.05}"/>`
  }).join('')

  return Buffer.from(`
    <svg width="${LARGEUR}" height="${HAUTEUR}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="corail" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#D97757"/>
          <stop offset="1" stop-color="#A74631"/>
        </linearGradient>
      </defs>
      <rect x="59" y="549" width="962" height="692" rx="28" fill="url(#corail)"/>
      <circle cx="880" cy="690" r="230" fill="none" stroke="#F7F4EF" stroke-width="3" opacity="0.22"/>
      <circle cx="880" cy="690" r="168" fill="none" stroke="#F7F4EF" stroke-width="3" opacity="0.18"/>
      ${traits}
      <text x="126" y="1035" fill="#F7F4EF" font-family="Arial, Helvetica, sans-serif"
        font-size="108" font-weight="700" letter-spacing="-3">Presti</text>
    </svg>
  `)
}

async function lireTitres() {
  const markdown = await fs.readFile(path.join('plans', 'publications-serie-2.md'), 'utf8')
  const titres = new Map()
  const motif = /^# Publication n° (\d+) — « (.+?) »/gm
  for (const correspondance of markdown.matchAll(motif)) {
    titres.set(correspondance[1], correspondance[2])
  }
  for (const numero of NUMEROS) {
    if (!titres.has(numero)) throw new Error(`Titre de la publication n° ${numero} introuvable`)
  }
  return titres
}

async function preparerCapture(source) {
  await fs.access(source)
  return sharp(source)
    .resize({ width: 920, height: 650, fit: 'contain', background: '#0E1118' })
    .png()
    .toBuffer()
}

async function fabriquer(numero, titre) {
  const calques = []
  if (numero === '16') {
    calques.push({ input: carteTypographique(), left: 0, top: 0 })
  } else {
    const capture = await preparerCapture(CAPTURES[numero])
    calques.push({ input: cadreCapture(), left: 0, top: 0 })
    calques.push({ input: capture, left: 80, top: 570 })
  }
  calques.push({ input: calqueTexte(titre), left: 0, top: 0 })

  const sortie = path.join(DOSSIER_SORTIE, `pub-${numero}-instagram.jpg`)
  await fondNuit()
    .composite(calques)
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toFile(sortie)
  console.log(`Écrit : ${sortie}`)
}

await fs.mkdir(DOSSIER_SORTIE, { recursive: true })
const titres = await lireTitres()
for (const numero of NUMEROS) {
  await fabriquer(numero, titres.get(numero))
}
