// public/sites-demo/extraire-contenu.mjs — sortir les TEXTES d'un site v1 (écrits et jugés le 13-14/09) dans contenu.json,
// pour que le générateur v2 (generer.mjs) les remette en page sans les réécrire. À lancer UNE fois par métier, avant
// de régénérer : après, les pages sont celles du v2 et contenu.json fait foi.
//
// Usage : node public/sites-demo/extraire-contenu.mjs plombier [electricien …]
import fs from 'node:fs'
import path from 'node:path'

const ICI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const METIERS = process.argv.slice(2)
if (!METIERS.length) { console.error('métier(s) attendu(s)'); process.exit(2) }

const decoder = (s) => String(s).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
const texte = (html) => decoder(String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
const attr = (bal, nom) => { const m = new RegExp(`\\s${nom}\\s*=\\s*"([^"]*)"`, 'i').exec(bal) || new RegExp(`\\s${nom}\\s*=\\s*'([^']*)'`, 'i').exec(bal); return m ? decoder(m[1]) : '' }
const base = (src) => path.basename(String(src)).replace(/-(480|960|1600)\.(avif|webp|jpg|png)$/i, '').replace(/\.(avif|webp|jpg|png)$/i, '')

// Découpe un fragment HTML en blocs, dans l'ordre : h3 / p / li / details / img.
function blocs(frag) {
  const out = []
  const re = /<(h3|h4|p|li|summary|figcaption)\b[^>]*>([\s\S]*?)<\/\1>|<img\b([^>]*)>/gi
  let m
  while ((m = re.exec(frag))) {
    if (m[3] !== undefined) { const alt = attr(m[3], 'alt'); if (attr(m[3], 'src')) out.push({ type: 'img', fichier: base(attr(m[3], 'src')), alt }); continue }
    const t = texte(m[2]); if (!t) continue
    const tag = m[1].toLowerCase()
    // un <p> qui contient un lien tel: ou une adresse mailto reste du texte : on garde le contenu
    out.push({ type: tag === 'h4' ? 'h3' : tag, texte: t, ...(tag === 'li' && /<a\b/i.test(m[2]) ? { lien: attr(m[2], 'href') || undefined } : {}) })
  }
  // fusion h3 + paragraphes qui suivent → items ; questions <summary>/<h3> + réponse → faq (décidé par le générateur)
  return out
}

function extrairePage(html) {
  const title = texte((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '')
  const description = attr((html.match(/<meta\b[^>]*name\s*=\s*["']description["'][^>]*>/i) || [''])[0], 'content')
  const jsonld = [...html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => { try { return JSON.parse(m[1]) } catch { return null } }).filter(Boolean)
  const corps = (html.split(/<main\b[^>]*>/i)[1] || html).split(/<\/main>|<footer\b/i)[0]
  const h1 = texte((corps.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '')
  // le kicker : le dernier élément court AVANT le h1 ; le chapeau : le premier <p> APRÈS le h1
  const avantH1 = corps.split(/<h1\b/i)[0]
  const kickers = [...avantH1.matchAll(/<(span|p|div)\b[^>]*>([^<]{4,80})<\/\1>/gi)].map((m) => texte(m[2])).filter((t) => t && !/^\+?\d/.test(t) && !/devis|appeler|menu/i.test(t))
  const apresH1 = corps.split(/<\/h1>/i)[1] || ''
  const chapeau = texte((apresH1.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || '')
  // sections : tout ce qui suit chaque <h2>, jusqu'au <h2> suivant
  const morceaux = apresH1.split(/<h2\b[^>]*>/i)
  const avantSections = morceaux[0]
  const sections = morceaux.slice(1).map((m) => { const [titreBrut, ...reste] = m.split(/<\/h2>/i); return { h2: texte(titreBrut), blocs: blocs(reste.join('</h2>')) } })
  // les images du héros / de la zone avant la première section
  const hero = blocs(avantSections).filter((b) => b.type === 'img')
  return { title, description, h1, kicker: kickers.at(-1) || '', chapeau, heroImages: hero, sections, jsonld }
}

for (const metier of METIERS) {
  const dossier = path.join(ICI, metier)
  const site = JSON.parse(fs.readFileSync(path.join(dossier, 'site.json'), 'utf8'))
  const contenu = { metier, extrait_le: new Date().toISOString().slice(0, 10), pages: {} }
  for (const p of site.pages) {
    const f = path.join(dossier, p.chemin.replace(/^\//, ''), 'index.html')
    if (!fs.existsSync(f)) { console.log(`  ✗ ${metier}${p.chemin} absent`); continue }
    const html = fs.readFileSync(f, 'utf8')
    contenu.pages[p.chemin] = { type: p.type, cible: p.cible, ...extrairePage(html) }
  }
  const sortie = path.join(dossier, 'contenu.json')
  if (fs.existsSync(sortie) && !process.argv.includes('--force')) { console.log(`  = ${metier} : contenu.json existe déjà (--force pour réécrire)`); continue }
  fs.writeFileSync(sortie, JSON.stringify(contenu, null, 1))
  const acc = contenu.pages['/']
  console.log(`  ✓ ${metier} : ${Object.keys(contenu.pages).length} pages · accueil ${acc.sections.length} sections (${acc.sections.map((s) => s.blocs.length).join('/')} blocs) · h1 « ${acc.h1} » · kicker « ${acc.kicker} »`)
}
