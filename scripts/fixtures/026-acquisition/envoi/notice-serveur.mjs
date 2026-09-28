// scripts/fixtures/026-acquisition/envoi/notice-serveur.mjs — un petit serveur local de la notice, écrit par Claude Code
// AVANT la passe du soir du Facteur qui la revérifie (fiche 026-089, CLAUDE.md:23). Selon `scenario`, sert la notice et ses
// mentions (aux empreintes attendues de noticeHtml()/mentionsHtml(), 026-039), une autre page, un 404, ou une redirection
// vers un autre hôte (jamais suivie : GET NOTICE_URL et NOTICE_URL + 'mentions-legales/' seulement, sans suivre 3xx).
import http from 'node:http'
import { portLibre, ecouterLocal } from './commun.mjs'

export async function demarrerServeurNotice({ scenario = 'ok', html = '<html>Notice Témoin</html>', mentions = '<html>Mentions Témoin</html>' } = {}) {
  const requetes = []
  const serveur = http.createServer((req, res) => {
    requetes.push({ methode: req.method, chemin: req.url })
    if (scenario === '404') { res.writeHead(404); res.end('Introuvable'); return }
    if (scenario === 'redirection') { res.writeHead(302, { Location: 'https://autre-hote-temoin.invalid/notice' }); res.end(); return }
    if (scenario === 'autre-page') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end('<html>Page Témoin sans rapport</html>'); return }
    const estMentions = /mentions-legales/.test(req.url ?? '')
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(estMentions ? mentions : html)
  })
  const port = await portLibre()
  await ecouterLocal(serveur, port)
  const url = `http://127.0.0.1:${port}/`
  return { url, requetes, arreter: () => new Promise((resolve) => serveur.close(() => resolve())) }
}
