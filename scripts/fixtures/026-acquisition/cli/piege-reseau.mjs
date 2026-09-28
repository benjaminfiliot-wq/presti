// scripts/fixtures/026-acquisition/cli/piege-reseau.mjs — chargé par `node --import` devant un script jugé par
// routes-acquisition-qa (fiche 026-037, RA-10) : toute tentative de sortie réseau (fetch, http, https, net, tls) est
// consignée dans le fichier PIEGE_JOURNAL (une ligne par tentative, l'hôte seulement) puis refusée. Le juge lit le fichier :
// une ligne = un appel réseau, donc une écriture ou une vérification qui n'aurait pas dû partir.
import fs from 'node:fs'
import { createRequire, syncBuiltinESMExports } from 'node:module'

const require = createRequire(import.meta.url)
const journal = process.env.PIEGE_JOURNAL
const noter = (genre, cible) => {
  let hote = ''
  try { hote = typeof cible === 'string' || cible instanceof URL ? new URL(String(cible)).host : String(cible?.host ?? cible?.hostname ?? cible?.url ?? '') } catch { hote = String(cible).slice(0, 80) }
  if (journal) fs.appendFileSync(journal, `${genre} ${hote}\n`)
}
const refus = () => new Error('réseau coupé par le juge (piege-reseau.mjs)')
globalThis.fetch = async (cible) => { noter('fetch', typeof cible === 'object' && cible && 'url' in cible ? cible.url : cible); throw refus() }
for (const nom of ['http', 'https']) {
  const m = require(nom)
  for (const f of ['request', 'get']) m[f] = (cible) => { noter(nom, cible); throw refus() }
}
const net = require('net')
net.connect = net.createConnection = (cible) => { noter('net', cible); throw refus() }
const tls = require('tls')
tls.connect = (cible) => { noter('tls', cible); throw refus() }
syncBuiltinESMExports()
