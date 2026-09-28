#!/usr/bin/env node
// Faux Ollama du juge savoir-socle-qa (026-229) : un serveur HTTP sur 127.0.0.1 (port libre, écrit dans FAUX_OLLAMA_PORT)
// qui consigne chaque requête dans FAUX_OLLAMA_JOURNAL ({ methode, url, corps }) et répond à POST /api/embed par des
// vecteurs fixes, un par entrée. Il ne sort jamais de la boucle locale ; le juge l'arrête par son PID.
import fs from 'node:fs'
import http from 'node:http'

const journal = process.env.FAUX_OLLAMA_JOURNAL
const fichierPort = process.env.FAUX_OLLAMA_PORT
if (!journal || !fichierPort) { process.stderr.write('faux ollama : FAUX_OLLAMA_JOURNAL et FAUX_OLLAMA_PORT attendus\n'); process.exit(97) }
const VECTEUR = [0.125, 0.25, 0.5, 1]
const serveur = http.createServer((req, res) => {
  let corps = ''
  req.setEncoding('utf8')
  req.on('data', (d) => { corps += d })
  req.on('end', () => {
    fs.appendFileSync(journal, `${JSON.stringify({ methode: req.method, url: req.url, corps })}\n`)
    if (req.method === 'POST' && req.url === '/api/embed') {
      let n = 1
      try { const j = JSON.parse(corps); n = Array.isArray(j.input) ? j.input.length : 1 } catch { n = 0 }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ model: 'faux', embeddings: Array.from({ length: n }, () => VECTEUR) }))
      return
    }
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end('{}')
  })
})
serveur.listen(0, '127.0.0.1', () => fs.writeFileSync(fichierPort, String(serveur.address().port)))
