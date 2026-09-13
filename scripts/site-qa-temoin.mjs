// scripts/site-qa-temoin.mjs — le témoin du juge de site : un juge qu'on n'a pas vu juger n'est pas un juge.
//
// Fabrique dans un dossier temporaire un site minimal CONFORME au contrat (site.json, accueil, une page de commune,
// une page de métier secondaire, mentions légales, confidentialité, sitemap, robots, une image WebP) et vérifie
// que scripts/site-qa.mjs le passe ; puis une variante CASSÉE (noindex, page de commune satellite, alt vide,
// title dupliqué, pas de décennale) et vérifie qu'il la refuse — avec les bons critères en échec.
//
// Usage : node scripts/site-qa-temoin.mjs            (statique + Lighthouse sur le témoin vert : ~40 s)
//         node scripts/site-qa-temoin.mjs --statique (sans Lighthouse)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STATIQUE = process.argv.includes('--statique')
// --garder : ne pas effacer le dossier temporaire et imprimer son chemin (pour lancer le juge à la main dessus).
const GARDER = process.argv.includes('--garder')
// Un WebP 1×1 valide (sans perte) : assez pour que le juge lise un format, un alt, des dimensions.
const WEBP = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')

const CONTRAT = {
  metier: 'plombier', nom: 'Martin Plomberie', telephone: '+33 4 00 00 00 00', siren: '123456782',
  decennale: { assureur: 'Assureur Témoin', numero: 'DEC-000001' },
  communes: ['Lyon', 'Villeurbanne'], metiers_secondaires: ['chauffagiste'],
  pages: [
    { chemin: '/', type: 'accueil' },
    { chemin: '/plombier-lyon/', type: 'commune', cible: 'Lyon' },
    { chemin: '/plombier-villeurbanne/', type: 'commune', cible: 'Villeurbanne' },
    { chemin: '/chauffagiste/', type: 'metier', cible: 'chauffagiste' },
    { chemin: '/mentions-legales/', type: 'legal' },
    { chemin: '/confidentialite/', type: 'legal' },
  ],
}
const ld = (type) => JSON.stringify({
  '@context': 'https://schema.org', '@type': type, name: CONTRAT.nom, url: 'https://martin-plomberie.example/', telephone: CONTRAT.telephone,
  address: { '@type': 'PostalAddress', streetAddress: '12 rue des Artisans', postalCode: '69003', addressLocality: 'Lyon', addressCountry: 'FR' },
  openingHours: 'Mo-Fr 08:00-18:00', areaServed: CONTRAT.communes,
})
const PARAGRAPHE = 'Martin Plomberie intervient pour le dépannage, l’installation et la rénovation de plomberie : arrivée d’eau, groupe de sécurité, mitigeur, réseaux en PER, cuivre ou multicouche. Chaque intervention commence par un diagnostic sur place — jamais à distance — et un devis clair, sans surprise. '
function page({ titre, description, h1, texte, chemin, type = 'Plumber', casse = {} }) {
  const robots = casse.noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow">'
  const alt = casse.altVide ? '' : 'Rénovation d’une salle de bain à Lyon'
  const sections = ['Nos prestations', 'Nos réalisations', 'Communes servies', 'Comment ça se passe', 'Questions fréquentes'].map((s) => `<section><h2>${s}</h2><p>${PARAGRAPHE}</p></section>`).join('')
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre}</title><meta name="description" content="${description}">${robots}
<link rel="canonical" href="https://martin-plomberie.example${chemin}">
<meta property="og:title" content="${titre}"><meta property="og:description" content="${description}"><meta property="og:image" content="https://martin-plomberie.example/images/hero.webp">
<link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">${ld(type)}</script></head>
<body><main><h1>${h1}</h1><img src="/images/hero.webp" alt="${alt}" width="1600" height="1067" fetchpriority="high"><p>${texte} ${PARAGRAPHE}</p>${sections}<img src="/images/chantier.webp" alt="Chantier terminé à Villeurbanne" width="1600" height="1067" loading="lazy"><img src="/images/cuisine.webp" alt="Cuisine rénovée" width="1600" height="1067" loading="lazy">
<p><a class="btn" href="/demande/">Demander un devis</a></p></main><footer><a href="/mentions-legales/">Mentions légales</a> · <a href="/confidentialite/">Politique de confidentialité</a></footer></body></html>`
}
// Les trois photos libres du dépôt (public/demo/portfolio, CC BY-SA 4.0, Wikimedia Commons) : de vraies photos, de vrais
// auteurs — le juge lit la largeur dans l'en-tête et refuse un auteur bidon.
const PORTFOLIO = path.join(RACINE, 'public', 'demo', 'portfolio')
const PHOTOS = [
  { source: 'escalier-helicoidal-1.webp', cible: 'hero.webp', auteur: 'Petar Milošević', url: 'https://commons.wikimedia.org/wiki/File:Wooden_spiral_stairs_(Neboti%C4%8Dnik,_Ljubljana).jpg', legende: 'Escalier hélicoïdal en bois' },
  { source: 'escalier-helicoidal-2.webp', cible: 'chantier.webp', auteur: 'Petar Milošević', url: 'https://commons.wikimedia.org/wiki/File:Wooden_spiral_stairs_(Neboti%C4%8Dnik,_Ljubljana).jpg', legende: 'Escalier, vue rapprochée' },
  { source: 'cuisine-bois.webp', cible: 'cuisine.webp', auteur: 'JessofWoodnCo', url: 'https://commons.wikimedia.org/wiki/File:Wooden_kitchen.jpg', legende: 'Cuisine en bois' },
]
// Une police auto-hébergée factice mais reconnaissable (signature wOF2 + remplissage) et un CSS de vraie taille : le
// témoin prouve la mécanique du juge, pas la beauté d'un site.
const WOFF2 = Buffer.concat([Buffer.from('wOF2'), Buffer.alloc(8000, 1)])
const CSS = `@font-face{font-family:'Manrope';src:url('/fonts/manrope.woff2') format('woff2');font-display:swap}\nhtml{background:#F6F8FA;color:#10233A}\nbody{font-family:'Manrope',system-ui,sans-serif;margin:0;line-height:1.55}\nh1,h2{font-family:'Manrope',system-ui,sans-serif}\na.btn{background:#1E6FA8;color:#fff;padding:12px 20px;border-radius:12px;display:inline-block}\nmain{padding:24px;max-width:720px;margin:auto}img{max-width:100%;height:auto}footer{padding:24px;font-size:14px}\n` + Array.from({ length: 60 }, (_, i) => `.s${i}{padding:${i}px;margin:${i}px;color:#10233A;border-radius:${i % 13}px;transition:opacity .4s ease-out}`).join('\n')
function fabriquer(dossier, casse = {}) {
  fs.rmSync(dossier, { recursive: true, force: true })
  fs.mkdirSync(path.join(dossier, 'images'), { recursive: true })
  fs.mkdirSync(path.join(dossier, 'fonts'), { recursive: true })
  for (const p of PHOTOS) fs.copyFileSync(path.join(PORTFOLIO, p.source), path.join(dossier, 'images', p.cible))
  fs.writeFileSync(path.join(dossier, 'fonts', 'manrope.woff2'), WOFF2)
  fs.writeFileSync(path.join(dossier, 'fonts', 'OFL.txt'), 'SIL Open Font License 1.1 — témoin.\n')
  fs.writeFileSync(path.join(dossier, 'styles.css'), CSS)
  const contrat = JSON.parse(JSON.stringify(CONTRAT))
  if (casse.sansDecennale) delete contrat.decennale
  contrat.demo = true
  const attributions = PHOTOS.map((p) => ({ fichier: `images/${p.cible}`, auteur: p.auteur, source: p.url, licence: 'CC BY-SA 4.0', legende: p.legende }))
  fs.writeFileSync(path.join(dossier, 'attributions.json'), JSON.stringify(casse.sansAttribution ? attributions.slice(0, 1) : attributions, null, 2))
  // La page satellite est DÉCLARÉE comme page de commune : c'est le cas réaliste d'un générateur trop zélé.
  if (casse.satellite) contrat.pages.push({ chemin: '/plombier-marseille/', type: 'commune', cible: 'Marseille' })
  fs.writeFileSync(path.join(dossier, 'site.json'), JSON.stringify(contrat, null, 2))
  const ecrire = (chemin, html) => { const d = path.join(dossier, chemin.replace(/^\//, '')); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'index.html'), html) }
  const desc = (x) => `Plombier à ${x} : dépannage, installation et rénovation par Martin Plomberie, artisan assuré. Devis clair, intervention soignée.`
  ecrire('/', page({ titre: 'Plombier à Lyon — Martin Plomberie', description: desc('Lyon et alentours'), h1: 'Martin Plomberie, plombier à Lyon', texte: 'Dépannage, installation et rénovation de plomberie à Lyon et dans les communes voisines.', chemin: '/', casse: { noindex: casse.noindex, altVide: casse.altVide } }))
  ecrire('/plombier-lyon/', page({ titre: casse.titreDouble ? 'Plombier à Lyon — Martin Plomberie' : 'Plombier à Lyon 3e — Martin Plomberie', description: desc('Lyon 3e'), h1: 'Votre plombier à Lyon', texte: 'Interventions dans tout Lyon, du 1er au 9e arrondissement.', chemin: '/plombier-lyon/' }))
  ecrire('/plombier-villeurbanne/', page({ titre: 'Plombier à Villeurbanne — Martin Plomberie', description: desc('Villeurbanne'), h1: 'Votre plombier à Villeurbanne', texte: 'Martin Plomberie intervient à Villeurbanne du lundi au vendredi.', chemin: '/plombier-villeurbanne/' }))
  ecrire('/chauffagiste/', page({ titre: 'Chauffagiste à Lyon — Martin Plomberie', description: 'Entretien, dépannage et remplacement de chaudière à Lyon par Martin Plomberie, chauffagiste assuré. Devis clair.', h1: 'Chauffagiste à Lyon', texte: 'Entretien annuel, dépannage et remplacement de chaudières.', chemin: '/chauffagiste/' }))
  if (casse.satellite) ecrire('/plombier-marseille/', page({ titre: 'Plombier à Marseille — Martin Plomberie', description: desc('Marseille'), h1: 'Plombier à Marseille', texte: 'Page satellite : la commune n’est pas servie.', chemin: '/plombier-marseille/' }))
  const legal = (titre, h1, corps, chemin) => page({ titre, description: `${h1} de Martin Plomberie, plombier à Lyon : identité de l’entreprise, assurance et vos droits sur vos données.`, h1, texte: corps, chemin })
  ecrire('/mentions-legales/', legal('Mentions légales — Martin Plomberie', 'Mentions légales', `Martin Plomberie, entreprise individuelle, SIREN ${CONTRAT.siren}, 12 rue des Artisans 69003 Lyon. Assurance décennale : ${CONTRAT.decennale.assureur}, contrat n° ${CONTRAT.decennale.numero}. Hébergeur : Vercel Inc. Site de démonstration : entreprise fictive. Crédits photos : Petar Milošević, JessofWoodnCo (CC BY-SA 4.0, Wikimedia Commons).`, '/mentions-legales/'))
  ecrire('/confidentialite/', legal('Politique de confidentialité — Martin Plomberie', 'Politique de confidentialité', 'Les données du formulaire de demande servent uniquement à vous répondre. Vous pouvez demander leur suppression à tout moment.', '/confidentialite/'))
  const pages = contrat.pages.filter((p) => p.type !== 'legal').map((p) => p.chemin).concat(casse.satellite ? ['/plombier-marseille/'] : [])
  fs.writeFileSync(path.join(dossier, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((p) => `<url><loc>https://martin-plomberie.example${p}</loc></url>`).join('')}</urlset>`)
  fs.writeFileSync(path.join(dossier, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://martin-plomberie.example/sitemap.xml\n')
}
function juger(dossier, extra = []) {
  const r = spawnSync(process.execPath, ['scripts/site-qa.mjs', dossier, '--json', ...(STATIQUE ? ['--statique'] : ['--pages=1']), ...extra], { cwd: RACINE, encoding: 'utf8', maxBuffer: 64 << 20 })
  let rapport = null
  try { rapport = JSON.parse(r.stdout) } catch { /* pas de JSON : erreur d'usage */ }
  const echecs = rapport ? rapport.blocs.flatMap((b) => b.tests.filter((t) => !t.passe).map((t) => `${b.nom} › ${t.nom} (${t.mesure})`)) : [`(pas de rapport) ${(r.stderr || r.stdout).slice(0, 200)}`]
  return { code: r.status, echecs }
}

let ok = 0, ko = 0
const T = (nom, cond, detail = '') => { if (cond) { ok++; console.log(`  ✅ ${nom}`) } else { ko++; console.log(`  ❌ ${nom}${detail ? ' — ' + detail : ''}`) } }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'site-qa-temoin-'))
try {
  console.log('── 1. Le témoin conforme doit passer')
  const vert = path.join(tmp, 'vert')
  fabriquer(vert)
  const rv = juger(vert)
  T('code de sortie 0', rv.code === 0, `code ${rv.code}`)
  T('aucun critère en échec', rv.echecs.length === 0, rv.echecs.slice(0, 5).join(' | '))

  console.log('── 2. Le témoin cassé doit échouer, sur les bons critères')
  const rouge = path.join(tmp, 'rouge')
  fabriquer(rouge, { noindex: true, satellite: true, altVide: true, titreDouble: true, sansDecennale: true, sansAttribution: true })
  const rr = juger(rouge, ['--statique'])
  T('code de sortie 1', rr.code === 1, `code ${rr.code}`)
  const attendu = [/noindex/i, /satellite/i, /alt rédigé/i, /title unique/i, /décennale/i, /attribution/i]
  for (const re of attendu) T(`échec attendu : ${re.source}`, rr.echecs.some((e) => re.test(e)), rr.echecs.slice(0, 8).join(' | '))

  console.log('── 3. Sans site.json, le juge refuse')
  fs.unlinkSync(path.join(vert, 'site.json'))
  const rs = juger(vert, ['--statique'])
  T('code de sortie 1 sans contrat', rs.code === 1 && rs.echecs.some((e) => /site\.json/.test(e)), rs.echecs.slice(0, 3).join(' | '))
} finally {
  if (GARDER) console.log(`(dossier gardé : ${tmp})`)
  else fs.rmSync(tmp, { recursive: true, force: true })
}
console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués`)
process.exit(ko === 0 ? 0 : 1)
