// Serveur factice des sites livrés (fiche 026-246, jeu d'essai du juge qualite-sites-qa) : un seul serveur HTTP sur 127.0.0.1,
// qui répond au nom de plusieurs « sites » (l'en-tête Host choisit le site) et dont chaque site porte des PANNES réglables,
// chacune indépendante des autres. Aucun vrai TLS : le protocole logique (http/https) arrive dans l'en-tête x-factice-schema,
// et un certificat expiré est un INDICATEUR (en-tête de réponse x-factice-certificat: expire), jamais un vrai certificat.
//
// Ce que le serveur journalise (c'est la preuve du juge, côté serveur, pas côté module) : chaque requête reçue, avec la méthode,
// l'hôte, le chemin, la voie par laquelle elle est arrivée (x-factice-via : navigateur | recuperer | inconnu) et l'instant de
// l'HORLOGE FACTICE du banc (jamais l'heure réelle : les attentes d'une seconde ne coûtent rien). Un site audité n'est jamais
// écrit : toute méthode autre que GET/HEAD est refusée (405) ET consignée ; un POST sur /api/contact est de plus compté dans
// `soumissions` (le formulaire d'un client ne reçoit jamais de faux message).
//
// Données synthétiques : noms, SIREN et adresses sont inventés ; les domaines sont en .test (réservé, jamais résolu).
import http from 'node:http'
import zlib from 'node:zlib'

/** Budget de poids de la page d'accueil (QSI-3), en octets : 3 Mio. Au-delà (strictement) : poids_excessif. */
export const BUDGET_POIDS_OCTETS = 3 * 1024 * 1024

/** Les pannes que ce serveur sait servir, chacune à poser seule sur un site sain. */
export const PANNES = Object.freeze([
  'http_500', 'injoignable', 'certificat_expire', 'http_simple', 'http_vers_https',
  'poids_excessif', 'poids_limite', 'poids_gzip',
  'contraste_faible', 'contraste_juste_ok', 'contraste_juste_ko', 'grand_texte_ok', 'petit_texte_ko', 'sans_alt',
  'lien_mort', 'lien_500', 'lien_lent', 'lien_boucle', 'lien_redirige', 'lien_robots',
  'mentions_absentes', 'mention_siren_absente',
  'formulaire_absent', 'formulaire_sans_action', 'formulaire_point_entree_mort',
])

export const IDENTITE_PAR_DEFAUT = Object.freeze({
  nom_artisan: 'Martin Plomberie', siren: '123456782', adresse: '12 rue des Lilas, 69003 Lyon', forme_juridique: 'SARL',
})

export const sirenAffiche = (s) => String(s ?? '').replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3')

// ── couleurs de la ligne « #intro » selon la panne de contraste (les autres lignes sont toujours lisibles) ───────────────
function styleIntro(pannes) {
  if (pannes.has('contraste_faible')) return { couleur: '#aaaaaa', taille: 16 }
  if (pannes.has('contraste_juste_ok')) return { couleur: '#767676', taille: 16 } // 4,54:1 — au-dessus du seuil AA
  if (pannes.has('contraste_juste_ko')) return { couleur: '#777777', taille: 16 } // 4,48:1 — juste en dessous
  if (pannes.has('grand_texte_ok')) return { couleur: '#949494', taille: 24 } // 3,03:1 — passe en GRAND texte seulement
  if (pannes.has('petit_texte_ko')) return { couleur: '#949494', taille: 16 } // 3,03:1 en petit texte : insuffisant
  return { couleur: '#333333', taille: 16 }
}

function pageAccueil(site, pannes, octetsCible) {
  const id = site.identite
  const intro = styleIntro(pannes)
  const formulaire = pannes.has('formulaire_absent') ? '' :
    `<form id="contact"${pannes.has('formulaire_sans_action') ? '' : ' action="/api/contact"'} method="post">` +
    '<label>Nom <input name="nom" type="text"></label><label>Courriel <input name="email" type="email"></label>' +
    '<label>Message <textarea name="message"></textarea></label><button type="submit">Envoyer</button></form>'
  const images = `<img src="/img/logo.svg" alt="Logo ${id.nom_artisan}">` +
    (pannes.has('sans_alt') ? '<img src="/img/chantier.jpg"><img src="/img/deco.svg" alt="">' : '')
  const prive = pannes.has('lien_robots') ? ' <a href="/espace-prive/doc">Espace privé</a>' : ''
  const avantPad = '<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>' + id.nom_artisan + '</title></head>\n' +
    '<body style="background:#ffffff;color:#222222">\n' +
    `<h1 id="titre" style="color:#1a1a1a;background:#ffffff;font-size:32px">${id.nom_artisan}</h1>\n` +
    `<p id="intro" style="color:${intro.couleur};background:#ffffff;font-size:${intro.taille}px">Dépannage, installation et entretien chez les particuliers.</p>\n` +
    images + '\n' +
    '<nav><a href="/">Accueil</a> <a href="/services">Services</a> <a href="/realisations">Réalisations</a> ' +
    '<a href="/mentions-legales">Mentions légales</a> <a href="/services#tarifs">Tarifs</a> ' +
    `<a href="mailto:contact@${site.hote}">Écrire</a> <a href="tel:+33400000000">Appeler</a> ` +
    `<a href="https://annuaire-externe.test/fiche">Annuaire</a>${prive}</nav>\n` +
    formulaire + '\n' +
    `<footer id="pied" style="color:#444444;background:#f2f2f2;font-size:14px">© ${id.nom_artisan}</footer>\n`
  const fin = '</body></html>\n'
  if (!octetsCible) return avantPad + fin
  const base = Buffer.byteLength(avantPad + fin)
  const pad = octetsCible - base - 7 // « <!-- » + « --> » = 7 octets
  if (pad < 0) throw new Error('cible de poids trop petite')
  return avantPad + '<!--' + 'x'.repeat(pad) + '-->' + fin
}

function pageMentions(site, pannes) {
  const id = site.identite
  const lignes = [`Éditeur : ${id.nom_artisan}`]
  if (!pannes.has('mentions_absentes')) {
    if (!pannes.has('mention_siren_absente')) lignes.push(`SIREN : ${sirenAffiche(id.siren)}`)
    lignes.push(`Siège : ${id.adresse}`, `Forme juridique : ${id.forme_juridique}`)
  }
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Mentions légales</title></head><body>' +
    `<h1>Mentions légales</h1>${lignes.map((l) => `<p>${l}</p>`).join('')}</body></html>`
}

const pageSimple = (titre) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${titre}</title></head><body><h1>${titre}</h1></body></html>`

/**
 * Démarre le serveur. `sites` : [{ hote, pannes: string[], identite? }]. `horloge` : { maintenant() } (l'horloge factice du banc).
 * Rend { port, journal, soumissions, tailles, arreter() }. `tailles[hote]` : les octets DÉCODÉS de la page d'accueil servie.
 */
export async function demarrerServeur({ sites, horloge }) {
  const journal = [], soumissions = [], tailles = {}, prises = new Set()
  const parHote = new Map(sites.map((s) => [String(s.hote).toLowerCase(), { hote: String(s.hote).toLowerCase(), pannes: new Set(s.pannes ?? []), identite: { ...IDENTITE_PAR_DEFAUT, ...(s.identite ?? {}) } }]))
  for (const s of parHote.values()) for (const p of s.pannes) if (!PANNES.includes(p)) throw new Error(`panne inconnue : ${p}`)

  const envoyer = (res, methode, statut, entetes, corps) => {
    const tampon = Buffer.isBuffer(corps) ? corps : Buffer.from(String(corps ?? ''))
    const enTetes = { 'content-type': 'text/html; charset=utf-8', ...entetes }
    if (!('transfer-encoding' in enTetes)) enTetes['content-length'] = String(tampon.length)
    res.writeHead(statut, enTetes)
    if (methode === 'HEAD') return res.end()
    if ('transfer-encoding' in enTetes) { res.write(tampon); return res.end() }
    return res.end(tampon)
  }

  const traiter = (req, res, corpsRecu) => {
    const hote = String(req.headers.host ?? '').split(':')[0].toLowerCase()
    const schema = req.headers['x-factice-schema'] === 'https' ? 'https' : 'http'
    const via = String(req.headers['x-factice-via'] ?? 'inconnu')
    const methode = String(req.method ?? 'GET').toUpperCase()
    const url = new URL(req.url ?? '/', 'http://factice.test')
    const chemin = url.pathname
    journal.push({ t: horloge.maintenant(), via, schema, methode, hote, chemin: chemin + url.search })
    const site = parHote.get(hote)
    if (!site) return envoyer(res, methode, 404, {}, 'hôte inconnu')
    const p = site.pannes
    if (p.has('injoignable')) { req.socket.destroy(); return }
    if (methode !== 'GET' && methode !== 'HEAD') {
      if (chemin === '/api/contact') soumissions.push({ hote, methode, octets: corpsRecu.length })
      return envoyer(res, methode, 405, { allow: 'GET, HEAD' }, 'un site audité ne reçoit aucune écriture')
    }
    const html = (statut, corps, entetes = {}) => envoyer(res, methode, statut, entetes, corps)
    const aller = (statut, vers) => envoyer(res, methode, statut, { location: vers }, '')

    if (chemin === '/robots.txt') return envoyer(res, methode, 200, { 'content-type': 'text/plain; charset=utf-8' }, 'User-agent: *\nDisallow: /espace-prive/\n')
    if (chemin === '/') {
      if (schema === 'http' && p.has('http_vers_https')) return aller(301, `https://${hote}/`)
      if (p.has('http_500')) return html(500, '<h1>Erreur interne</h1>')
      const cible = p.has('poids_excessif') ? BUDGET_POIDS_OCTETS + 1 : p.has('poids_limite') ? BUDGET_POIDS_OCTETS : p.has('poids_gzip') ? BUDGET_POIDS_OCTETS + 700 : 0
      const corps = Buffer.from(pageAccueil(site, p, cible))
      tailles[hote] = corps.length
      const entetes = {}
      if (schema === 'https' && p.has('certificat_expire')) entetes['x-factice-certificat'] = 'expire'
      if (p.has('poids_gzip')) { // Content-Length = les octets COMPRESSÉS : quelques ko, alors que la page décodée dépasse le budget
        return html(200, zlib.gzipSync(corps, { level: 9 }), { ...entetes, 'content-encoding': 'gzip' })
      }
      if (cible) return html(200, corps, { ...entetes, 'transfer-encoding': 'chunked' })
      return html(200, corps, entetes)
    }
    if (chemin === '/services') return html(200, pageSimple('Services'))
    if (chemin === '/ancien') return aller(301, '/services')
    if (chemin === '/boucle-a') return aller(302, '/boucle-b')
    if (chemin === '/boucle-b') return aller(302, '/boucle-a')
    if (chemin === '/realisations') {
      if (p.has('lien_mort')) return html(404, pageSimple('Introuvable'))
      if (p.has('lien_500')) return html(500, pageSimple('Erreur'))
      if (p.has('lien_lent')) return // jamais de réponse : le délai du récupérateur tranche
      if (p.has('lien_boucle')) return aller(302, '/boucle-a')
      if (p.has('lien_redirige')) return aller(301, '/services')
      return html(200, pageSimple('Réalisations'))
    }
    if (chemin === '/mentions-legales') return html(200, pageMentions(site, p))
    if (chemin === '/espace-prive/doc') return html(200, pageSimple('Espace privé'))
    if (chemin === '/api/contact') {
      if (p.has('formulaire_point_entree_mort')) return html(404, pageSimple('Introuvable'))
      return html(405, 'Méthode non permise : ce point d’entrée ne reçoit que des POST', { allow: 'POST' })
    }
    if (chemin.startsWith('/img/')) return envoyer(res, methode, 200, { 'content-type': 'image/svg+xml' }, '<svg xmlns="http://www.w3.org/2000/svg"/>')
    return html(404, pageSimple('Introuvable'))
  }

  const serveur = http.createServer((req, res) => {
    const morceaux = []
    req.on('data', (c) => morceaux.push(c))
    req.on('end', () => { try { traiter(req, res, Buffer.concat(morceaux)) } catch (e) { try { res.statusCode = 500; res.end('erreur du serveur factice') } catch { /* socket fermée */ } } })
  })
  serveur.on('connection', (s) => { prises.add(s); s.on('close', () => prises.delete(s)) })
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok))
  const port = serveur.address().port
  return {
    port, journal, soumissions, tailles,
    arreter: () => new Promise((ok) => { for (const s of prises) s.destroy(); serveur.close(() => ok()) }),
  }
}
