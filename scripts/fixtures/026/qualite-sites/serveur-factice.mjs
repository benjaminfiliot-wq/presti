// scripts/fixtures/026/qualite-sites/serveur-factice.mjs — le serveur factice des sites livrés (fiche 026-246).
// Écoute sur 127.0.0.1, port éphémère, rien d'autre : aucun réseau externe, aucune donnée réelle. Chaque site est servi sous
// /s/<slug>/… ; les hôtes publics factices (<slug>.exemple.invalid) sont ramenés ici par `resoudre(url)`. Pas de vrai TLS :
// le protocole et le certificat « rendus » sont annoncés par l'en-tête x-simule-tls (valide | expire | aucun).
// Les pannes se règlent par site : serveur.regler('vallon', ['http500', 'lien_mort', …]). Le serveur ENREGISTRE chaque requête
// (méthode, chemin, instant) : c'est ce journal qui prouve qu'un contrôleur n'a jamais écrit ni soumis quoi que ce soit.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
export const COMMANDES = JSON.parse(fs.readFileSync(path.join(ICI, 'sites-livres.json'), 'utf8')).commandes
export const BUDGET_ESSAI = 3 * 1024 * 1024

/** Pannes connues (liste fermée) : un nom inconnu est refusé, pour qu'une faute de frappe ne passe pas pour un site sain. */
export const PANNES = [
  'http500', 'certificat_expire', 'http_seulement', 'lourd', 'contraste', 'sans_alt',
  'lien_mort', 'lien_redirige', 'lien_boucle', 'lien_lent', 'lien_500',
  'sans_mentions', 'mentions_partielles', 'gabarit_court', 'sans_adresse',
  'form_sans_action', 'form_absent', 'form_entree_500',
]
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const echapper = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')

function pageAccueil(cmd, pannes) {
  const a = cmd.artisan
  const a_ = (p) => pannes.has(p)
  const gabarit = a_('gabarit_court') ? 'nom,siren' : 'nom,siren,adresse,forme_juridique'
  const css = [
    'body{font-family:sans-serif;color:#1a1a1a;background:#ffffff}',
    '.zq-note{color:#767676}',
    '.zq-bandeau{background:#1b3a4b;color:#ffffff}',
    '.zq-gros{color:#777777;font-size:24px}',
    '.zq-carte{background:#1b3a4b;color:' + (a_('contraste') ? '#2a4a5b' : '#ffffff') + '}',
    '.zq-pale{color:#cfd8dc;background:#eceff1}',
    '.zq-faible{color:#777777}',
    'footer{background:#f2f2f2;color:#222222}',
  ].join('\n')
  const liens = ['<a href="/realisations">Réalisations</a>', '<a href="/services">Services</a>', '<a href="/contact">Contact</a>',
    '<a href="/prive/archives">Archives</a>', '<a href="https://externe.exemple.invalid/partenaire">Partenaire</a>']
  if (a_('lien_boucle')) liens.push('<a href="/boucle-a">Ancien lien</a>')
  if (a_('lien_lent')) liens.push('<a href="/lent">Galerie</a>')
  if (a_('lien_500')) liens.push('<a href="/casse500">Brochure</a>')
  const images = a_('sans_alt')
    ? '<img src="/a.jpg"><img src="/b.jpg"><img src="/c.jpg" alt="Chantier">'
    : '<img src="/a.jpg" alt="Atelier"><img src="/c.jpg" alt="Chantier">'
  const pale = a_('contraste') ? '<p class="zq-pale">Texte trop pâle</p><p class="zq-faible">Texte gris moyen</p>' : ''
  const action = a_('form_sans_action') ? '' : ' action="/contact/envoyer"'
  const formulaire = a_('form_absent') ? '' :
    `<form${action} method="post"><input name="nom"><input type="email" name="email"><textarea name="message"></textarea><button type="submit">Envoyer</button></form>`
  let mentions = ''
  if (!a_('sans_mentions')) {
    const morceaux = [echapper(a.nom), echapper(a.forme_juridique)]
    if (!a_('mentions_partielles')) morceaux.push('SIREN ' + a.siren)
    if (!a_('sans_adresse')) morceaux.push(echapper(a.adresse))
    mentions = `<section id="mentions-legales"><h2>Mentions légales</h2><p>${morceaux.join(' — ')}</p></section>`
  }
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapper(a.nom)}</title>
<meta name="mentions-attendues" content="${gabarit}">
<style>
${css}
</style></head><body>
<header class="zq-bandeau"><h1>${echapper(a.nom)}</h1></header>
<nav>${liens.join(' ')}</nav>
<main><p class="zq-note">Travail soigné, devis gratuit.</p><p class="zq-gros">Grand titre de section</p>
<div class="zq-carte"><span>Texte sur carte</span></div>
${pale}${images}
${formulaire}</main>
<footer>${mentions}</footer></body></html>`
}

export async function demarrerServeur() {
  const requetes = []
  const config = new Map(COMMANDES.map((c) => [c.slug, new Set()]))
  const octets = new Map()
  const parSlug = new Map(COMMANDES.map((c) => [c.slug, c]))

  const serveur = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1')
    const m = /^\/s\/([a-z0-9-]+)(\/.*)?$/.exec(u.pathname)
    const chemin = m ? (m[2] ?? '/') : u.pathname
    const slug = m ? m[1] : null
    requetes.push({ t: performance.now(), slug, methode: req.method, chemin })
    req.resume()
    const cmd = slug ? parSlug.get(slug) : null
    if (!cmd) { res.writeHead(404); res.end('inconnu'); return }
    const pannes = config.get(slug)
    const tls = pannes.has('http_seulement') || cmd.url_en_ligne?.startsWith('http://') ? 'aucun' : pannes.has('certificat_expire') ? 'expire' : 'valide'
    const entetes = (type, extra = {}) => ({ 'content-type': type, 'x-simule-tls': tls, ...extra })
    const public_ = (p) => `https://${slug}.exemple.invalid${p}`
    // Le serveur est inoffensif : il ne mémorise rien, mais journalise toute écriture (c'est ce que le juge relit).
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(200, entetes('text/plain')); res.end('recu'); return }
    const envoyer = (code, type, corps, extra) => {
      res.writeHead(code, entetes(type, extra))
      res.end(req.method === 'HEAD' ? undefined : corps)
    }
    if (chemin === '/') {
      if (pannes.has('http500')) { envoyer(500, 'text/plain', 'Erreur interne'); return }
      let corps = pageAccueil(cmd, pannes)
      if (pannes.has('lourd')) {
        const cible = BUDGET_ESSAI + 123_457
        corps += '<!-- ' + 'x'.repeat(Math.max(0, cible - Buffer.byteLength(corps) - 9)) + ' -->'
      }
      const tampon = Buffer.from(corps, 'utf8')
      if (req.method === 'GET') octets.set(slug, tampon.length)
      // En-tête d'estimation volontairement faux : un contrôleur qui s'y fie se trompe (le poids est celui des octets reçus).
      res.writeHead(200, entetes('text/html; charset=utf-8', { 'x-poids-annonce': pannes.has('lourd') ? '1200' : '99999999' }))
      if (req.method === 'HEAD') { res.end(); return }
      for (let i = 0; i < tampon.length; i += 65536) res.write(tampon.subarray(i, i + 65536))
      res.end()
      return
    }
    if (chemin === '/robots.txt') { envoyer(200, 'text/plain', 'User-agent: *\nDisallow: /prive/\n'); return }
    if (chemin === '/services') { pannes.has('lien_mort') ? envoyer(404, 'text/plain', 'absent') : envoyer(200, 'text/html', '<p>Services</p>'); return }
    if (chemin === '/realisations') {
      if (pannes.has('lien_redirige')) { envoyer(301, 'text/plain', '', { location: public_('/realisations-v2') }); return }
      envoyer(200, 'text/html', '<p>Réalisations</p>'); return
    }
    if (chemin === '/realisations-v2') { envoyer(200, 'text/html', '<p>Réalisations</p>'); return }
    if (chemin === '/contact') { envoyer(200, 'text/html', '<p>Contact</p>'); return }
    if (chemin === '/contact/envoyer') { pannes.has('form_entree_500') ? envoyer(500, 'text/plain', 'panne') : envoyer(200, 'text/plain', 'formulaire'); return }
    if (chemin === '/boucle-a') { envoyer(302, 'text/plain', '', { location: public_('/boucle-b') }); return }
    if (chemin === '/boucle-b') { envoyer(302, 'text/plain', '', { location: public_('/boucle-a') }); return }
    if (chemin === '/lent') { await pause(1500); try { envoyer(200, 'text/html', '<p>Lent</p>') } catch { /* client parti */ } return }
    if (chemin === '/casse500') { envoyer(500, 'text/plain', 'panne'); return }
    if (chemin === '/prive/archives') { envoyer(200, 'text/html', '<p>Privé</p>'); return }
    envoyer(404, 'text/plain', 'absent')
  })
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok) })
  const port = serveur.address().port
  return {
    port,
    requetes,
    regler(slug, liste = []) {
      if (!config.has(slug)) throw new Error(`site inconnu : ${slug}`)
      for (const p of liste) if (!PANNES.includes(p)) throw new Error(`panne inconnue : ${p}`)
      config.set(slug, new Set(liste))
    },
    vider() { requetes.length = 0 },
    requetesDe: (slug) => requetes.filter((r) => r.slug === slug),
    octetsAccueil: (slug) => octets.get(slug) ?? null,
    ecritures: () => requetes.filter((r) => r.methode !== 'GET' && r.methode !== 'HEAD'),
    resoudre(url) {
      const u = new URL(url)
      const h = /^([a-z0-9-]+)\.exemple\.invalid$/.exec(u.hostname)
      if (!h) throw new Error('hote_inconnu')
      return `http://127.0.0.1:${port}/s/${h[1]}${u.pathname}${u.search}`
    },
    fermer: () => new Promise((ok) => { serveur.closeAllConnections?.(); serveur.close(() => ok()) }),
  }
}
