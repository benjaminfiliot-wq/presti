// Génère une fois les jeux d'essai binaires et arborescents du lot D (scripts/fixtures/026-livraison-tresor/d/) :
// le faux stockage imbriqué (stockage/) et les sorties d'usine (usine/). Relancé : réécrit les mêmes octets.
import fs from 'node:fs'
import path from 'node:path'

const D = path.resolve('scripts/fixtures/026-livraison-tresor/d')
// Les fichiers de 0 octet laissés par la version Gemini du 26/09 (d/index.html, d/sitemap.xml, d/menuisier-rennes/…) :
// remplacés par le faux stockage ci-dessous, sous d/stockage/.
for (const x of ['index.html', 'sitemap.xml', 'menuisier-rennes']) fs.rmSync(path.join(D, x), { recursive: true, force: true })
for (const x of ['stockage', 'usine']) fs.rmSync(path.join(D, x), { recursive: true, force: true })
const ecrire = (rel, contenu) => { const f = path.join(D, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, contenu) }
// Octets pseudo-aléatoires déterministes (les images ne sont pas du texte : 0x00, 0xFF, octets hors UTF-8 compris).
function octets(n, graine) { const b = Buffer.alloc(n); let x = graine >>> 0; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) >>> 0; b[i] = x >>> 24 } return b }
const webp = (n, g) => { const corps = Buffer.concat([Buffer.from('VP8L'), octets(n, g)]); const t = Buffer.alloc(4); t.writeUInt32LE(4 + corps.length); return Buffer.concat([Buffer.from('RIFF'), t, Buffer.from('WEBP'), corps]) }
const jpeg = (n, g) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), octets(n, g), Buffer.from([0xff, 0xd9])])

// ── Le faux stockage du bucket « sites » (DZ-3, DZ-5) ─────────────────────────────────────────────────────────────────────
const C1 = 'd0260000-0000-4000-8000-00000000d001', C2 = 'd0260000-0000-4000-8000-00000000d002'
ecrire(`stockage/${C1}/index.html`, '<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Menuiserie Témoin — Rennes</title><link rel="stylesheet" href="/css/site.css"></head>\n<body><h1>Menuiserie Témoin</h1><p>Escaliers, dressings et cuisines sur mesure à Rennes.</p><a href="/menuisier-rennes/">Menuisier à Rennes</a></body></html>\n')
ecrire(`stockage/${C1}/menuisier-rennes/index.html`, '<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Menuisier à Rennes — Menuiserie Témoin</title></head>\n<body><h1>Menuisier à Rennes</h1><img src="/images/a-480.webp" alt="Escalier en chêne"><img src="/menuisier-rennes/images/b-960.webp" alt="Dressing"></body></html>\n')
ecrire(`stockage/${C1}/images/a-480.webp`, webp(3000, 480))
ecrire(`stockage/${C1}/menuisier-rennes/images/b-960.webp`, webp(5200, 960))
ecrire(`stockage/${C1}/sitemap.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://menuiserie-temoin.fr/</loc></url><url><loc>https://menuiserie-temoin.fr/menuisier-rennes/</loc></url></urlset>\n')
ecrire(`stockage/${C2}/index.html`, '<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Une autre commande</title></head><body><p>Ce fichier n’appartient pas à la commande jugée : il ne doit jamais entrer dans son archive.</p></body></html>\n')

// ── Les sorties de l'usine (BL-8, BL-9) : usine/<cas>/ = le contenu de usine/<tache>/ ─────────────────────────────────────
const site = {
  'site/index.html': Buffer.from('<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Plomberie Témoin</title></head><body><h1>Plomberie Témoin</h1></body></html>\n'),
  'site/site.json': Buffer.from(`${JSON.stringify({ version: 2, pages: ['/', '/plombier-bruz/'] }, null, 1)}\n`),
  'site/plombier-bruz/index.html': Buffer.from('<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Plombier à Bruz</title></head><body><h1>Plombier à Bruz</h1></body></html>\n'),
  'site/images/a-480.webp': webp(2400, 7),
  'site/photos/chantier.jpg': jpeg(1800, 11),
  'site/sitemap.xml': Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://prestiapp.fr/</loc></url></urlset>\n'),
}
const TYPES = { html: 'text/html', json: 'application/json', webp: 'image/webp', jpg: 'image/jpeg', xml: 'application/xml' }
const typeDe = (n) => TYPES[n.split('.').pop()]
const rapport = (verdict) => Buffer.from(`${JSON.stringify({ commande: '(remplacée par le juge)', verdict, criteres: [{ id: 'SQ-1', passe: verdict === 'PASS' }] }, null, 1)}\n`)
function sortie(cas, { fichiers = site, manifesteEnPlus = [], sansFichier = [], verdict = 'PASS', essai = false, horsManifeste = true } = {}) {
  const entree = { _: 'Entrée d’une tâche livrer_site du jeu d’essai du lot D (026-026) : l’export de la commande (format --depuis), plus « commande » (son id) et, pour une tâche d’essai, « essai: true ». Données FICTIVES (téléphone de la plage 02 61 91, adresse en .invalid) : aucune ne doit sortir dans un événement, un journal ou une réponse.', commande: '(remplacée par le juge)', id: '(remplacée par le juge)', nom: 'Plomberie Témoin Lestrade', email: 'plomberie.temoin@lestrade.invalid', telephone: '+33 2 61 91 44 18', adresse: '7 rue du Témoin, 35170 Bruz', ...(essai ? { essai: true } : {}) }
  ecrire(`usine/${cas}/entree/commande.json`, `${JSON.stringify(entree, null, 1)}\n`)
  const liste = [...Object.keys(fichiers).map((nom) => ({ nom, type: typeDe(nom) })), ...manifesteEnPlus, { nom: 'rapport-qa.json', type: 'application/json' }]
  ecrire(`usine/${cas}/sortie/manifeste.json`, `${JSON.stringify({ fichiers: liste }, null, 1)}\n`)
  ecrire(`usine/${cas}/sortie/rapport-qa.json`, rapport(verdict))
  for (const [nom, contenu] of Object.entries(fichiers)) if (!sansFichier.includes(nom)) ecrire(`usine/${cas}/sortie/${nom}`, contenu)
  // Un fichier hors du manifeste : il ne doit être ni lu, ni copié.
  if (horsManifeste) ecrire(`usine/${cas}/sortie/site/brouillon-non-liste.html`, '<!doctype html><title>hors manifeste</title><p>Ce fichier n’est pas dans le manifeste.</p>\n')
}
sortie('complete')
sortie('essai', { essai: true })
sortie('incomplete', { sansFichier: ['site/images/a-480.webp'] })
sortie('fautive-pdf', { fichiers: { ...site, 'site/photos/chantier.jpg': Buffer.concat([Buffer.from('%PDF-1.7\n'), octets(900, 3)]) } })
sortie('rapport-rouge', { verdict: 'FAIL' })
sortie('nom-hors-contrat', { fichiers: { ...site, 'site/Photo Chantier.jpg': jpeg(600, 5) } })
console.log('jeux du lot D écrits sous', D)
