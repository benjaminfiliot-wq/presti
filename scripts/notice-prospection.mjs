#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { noticeHtml, mentionsHtml } from '../lib/confidentialite/prospection.ts'

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pages = [
  ['notice-prospection/index.html', noticeHtml()],
  ['notice-prospection/mentions-legales/index.html', mentionsHtml()],
]

if (process.argv.slice(2).some((argument) => argument !== '--verifier')) {
  console.error('Usage : node --import ./scripts/ts-loader.mjs scripts/notice-prospection.mjs [--verifier]')
  process.exitCode = 2
} else if (process.argv.includes('--verifier')) {
  for (const [fichier, attendu] of pages) {
    let obtenu
    // Fins de ligne ramenées à LF : sous Windows, git (core.autocrlf) extrait ces pages en CRLF (026-039, 28/09).
    try { obtenu = fs.readFileSync(path.join(racine, fichier), 'utf8').replace(/\r\n/g, '\n') } catch { obtenu = null }
    if (obtenu !== attendu) {
      console.error(`${fichier} diffère de sa source`)
      process.exitCode = 1
    }
  }
  if (!process.exitCode) console.log('Notice de prospection : fichiers conformes')
} else {
  for (const [fichier, contenu] of pages) {
    const cible = path.join(racine, fichier)
    fs.mkdirSync(path.dirname(cible), { recursive: true })
    fs.writeFileSync(cible, contenu)
    console.log(`${fichier} généré`)
  }
}
