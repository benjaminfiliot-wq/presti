// public/sites-demo/generer.mjs — le cerveau site v2 rend un site d'artisan à partir de trois entrées : site.json (le
// dossier), contenu.json (les textes, écrits et jugés), attributions.json (les photos et ce que Commons en dit), et de la
// direction artistique du métier (_kit/da.json). Le mouvement vient de _kit/kit.css + kit.js, copiés dans le site.
// Aucun modèle de langage n'est appelé ici : c'est une mise en page déterministe, rejouable, jugeable par site-qa.mjs.
//
// Usage : node public/sites-demo/generer.mjs plombier [electricien …]     node public/sites-demo/generer.mjs --tous
import fs from 'node:fs'
import path from 'node:path'

const ICI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const DA = JSON.parse(fs.readFileSync(path.join(ICI, '_kit', 'da.json'), 'utf8'))
const KIT_CSS = fs.readFileSync(path.join(ICI, '_kit', 'kit.css'), 'utf8')
const KIT_JS = fs.readFileSync(path.join(ICI, '_kit', 'kit.js'), 'utf8')
const AUJOURDHUI = new Date().toISOString().slice(0, 10)
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const telAffiche = (t) => { const d = String(t).replace(/\D/g, ''); const n = d.startsWith('33') ? '0' + d.slice(2) : d; return n.replace(/(\d{2})(?=\d)/g, '$1 ') }
// des espaces réels entre les mots : le texte reste lisible tel quel (juge, lecteur d'écran, copier-coller)
const mots = (h1) => h1.split(/\s+/).map((m, i) => `<span class="mot" style="--i:${i}">${esc(m)}</span>`).join(' ')
const FLECHE = '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M5 13L13 5M13 5H6M13 5V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

// ── Classification d'une section v1 par son <h2> ─────────────────────────────────────────────────────────────────
function genre(h2) {
  const t = slug(h2)
  if (/question|faq/.test(t)) return 'faq'
  if (/deroul|etape|processus|comment/.test(t)) return 'etapes'
  if (/realisation|chantier|image|galerie|exemple/.test(t)) return 'galerie'
  if (/commune|zone|secteur|intervention|desserv|proximite|autour/.test(t)) return 'communes'
  if (/prestation|service|savoir|travaux/.test(t)) return 'prestations'
  if (/engagement|garantie/.test(t)) return 'engagements'
  if (/contact|echange|devis|discut|demand|votre/.test(t)) return 'contact'
  return 'prose'
}
// Les blocs d'une section : paragraphes d'introduction, items (h3 + paragraphes qui suivent), paragraphes de clôture.
function decouper(blocs) {
  const intro = [], items = [], fin = []
  let courant = null
  for (const b of blocs) {
    if (b.type === 'img') continue
    if (b.type === 'h3' || b.type === 'summary') { courant = { titre: b.texte, textes: [] }; items.push(courant); continue }
    if (b.type === 'li') { (courant ? courant.textes : intro).push(b.texte); continue }
    if (b.type === 'figcaption') continue
    if (!courant) intro.push(b.texte); else courant.textes.push(b.texte)
  }
  // ce qui suit le dernier item et qui n'est pas sa réponse : on garde tout dans l'item (rien n'est jeté)
  return { intro, items, fin }
}

// Les sections v1 n'ont pas toutes des <h3> : des étapes numérotées en paragraphes, des questions en paragraphes qui
// finissent par « ? ». On les reconstruit ici plutôt que de les aplatir en prose.
const avantImage = (blocs) => { const i = blocs.findIndex((b) => b.type === 'img'); return i < 0 ? blocs : blocs.slice(0, i) }
const enItems = (paras) => paras.map((p) => p.replace(/^\s*(?:étape\s*)?\d+\s*[.)\-–—:]?\s*/i, '')).map((p) => {
  const m = /^(.{8,90}?)\s*(?:[:—–]|\.\s)\s*(.+)$/.exec(p)
  return m ? { titre: m[1].replace(/[.:]$/, ''), textes: [m[2]] } : { titre: p.split(' ').slice(0, 6).join(' '), textes: [p] }
})
function faqDepuisParagraphes(paras) {
  const intro = [], items = []; let courant = null
  for (const p of paras) { if (/\?\s*$/.test(p) && p.length < 160) { courant = { titre: p, textes: [] }; items.push(courant) } else if (courant) courant.textes.push(p); else intro.push(p) }
  return { intro, items: items.filter((it) => it.textes.length) }
}
function analyser(s) {
  const g = genre(s.h2)
  let { intro, items } = decouper(g === 'galerie' ? avantImage(s.blocs) : s.blocs)
  intro = intro.filter((p) => !/^photo\b|wikimedia|licence cc|\(photo /i.test(p))
  if (!items.length && (g === 'etapes' || g === 'prestations' || g === 'engagements')) {
    const num = intro.filter((p) => /^\s*(?:étape\s*)?\d+\s*[.)\-–—:]/i.test(p))
    if (num.length >= 3) { items = enItems(num); intro = intro.filter((p) => !num.includes(p)) }
  }
  if (!items.length && g === 'faq') { const r = faqDepuisParagraphes(intro); if (r.items.length >= 2) ({ intro, items } = r) }
  return { g, intro, items }
}

// les variantes disponibles (480/720/960/1600 selon la date du téléchargement) sont lues dans attributions.json
const srcsetDe = (a, rel, ext) => (a.largeurs || [480, 960, 1600]).map((l) => `${rel}images/${a.base}-${l}.${ext} ${l}w`).join(', ')
function photo(a, rel, { eager = false, sizes = '(max-width: 900px) 100vw, 60vw', classe = '' } = {}) {
  const defaut = (a.largeurs || [480, 960, 1600]).filter((l) => l <= 960).at(-1) || 960
  return `<picture${classe ? ` class="${classe}"` : ''}><source type="image/avif" srcset="${srcsetDe(a, rel, 'avif')}" sizes="${sizes}"><source type="image/webp" srcset="${srcsetDe(a, rel, 'webp')}" sizes="${sizes}"><img src="${rel}images/${a.base}-${defaut}.webp" alt="${esc(a.alt || a.legende)}" width="${a.largeur}" height="${a.hauteur}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}></picture>`
}

function generer(metier) {
  const dossier = path.join(ICI, metier)
  const site = JSON.parse(fs.readFileSync(path.join(dossier, 'site.json'), 'utf8'))
  const contenu = JSON.parse(fs.readFileSync(path.join(dossier, 'contenu.json'), 'utf8'))
  const attributions = JSON.parse(fs.readFileSync(path.join(dossier, 'attributions.json'), 'utf8'))
  const da = { ...DA.generique, ...(DA[site.metier] || {}) }
  const BASE = site.url_base || `https://${metier}.demo.invalid`
  const ville = site.communes[0]
  const tel = site.telephone
  // une photo par base (attributions.json porte une ligne par fichier)
  const baseDe = (a) => a.base || String(a.fichier).replace(/^images\//, '').replace(/-(\d+)\.\w+$/, '')
  const photos = [...new Map(attributions.map((a) => [baseDe(a), a])).values()]
  for (const p of photos) p.largeurs = [...new Set(attributions.filter((x) => baseDe(x) === baseDe(p)).map((x) => Number((/-(\d+)\.(avif|webp)$/.exec(x.fichier) || [])[1])).filter(Boolean))].sort((x, y) => x - y)
  if (!photos.length) throw new Error(`${metier} : aucune photo dans attributions.json`)
  const hero = photos.find((p) => p.base === 'hero') || photos[0]
  const galerie = photos.filter((p) => p !== hero)
  const auteurs = [...new Set(photos.map((p) => p.auteur))]

  // Les polices : copiées depuis _polices, jamais fabriquées
  const fonts = path.join(dossier, 'fonts'); fs.rmSync(fonts, { recursive: true, force: true }); fs.mkdirSync(fonts)
  const familles = [...new Set([da.display, da.texte])]
  for (const f of familles) {
    const s = slug(f); const src = path.join(ICI, '_polices', s, `${s}.woff2`)
    if (!fs.existsSync(src)) throw new Error(`police absente : ${src} (node scripts/polices-demo.mjs)`)
    fs.copyFileSync(src, path.join(fonts, `${s}.woff2`))
  }
  fs.copyFileSync(path.join(ICI, '_polices', slug(da.display), 'OFL.txt'), path.join(fonts, 'OFL.txt'))

  // styles.css = la direction artistique (tokens + @font-face) + le kit
  const faces = familles.map((f) => `@font-face{font-family:'${f}';src:url('fonts/${slug(f)}.woff2') format('woff2');font-weight:300 800;font-display:swap}`).join('\n')
  const tokens = `:root{--accent:${da.accent};--accent-texte:${da.accentTexte};--fond:${da.fond};--fond-2:${da.fond2};--encre:${da.encre};--encre-2:${da.encre2};--ligne:${da.ligne};--rayon:${da.rayon};--police-display:'${da.display}',Georgia,serif;--police-texte:'${da.texte}',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;--graisse-titre:${da.graisse || 700};--approche-titre:${da.approche || '-0.025em'};--ombre:${da.ombre || '0 30px 60px -28px rgba(20,25,35,.35)'};--grain:${da.grain || '.12'};--grain-mode:${da.grainMode || 'multiply'}${da.motif ? `;--motif:${da.motif}` : ''}}
.mono{color:var(--accent-texte)}
${da.casse ? `h1,h2{text-transform:${da.casse};letter-spacing:.01em}` : ''}
${da.display === da.texte ? '' : `body{font-feature-settings:"kern"}`}`
  // les URL de polices sont relatives à styles.css, qui est à la racine du site : « fonts/… » vaut depuis toute page
  fs.writeFileSync(path.join(dossier, 'styles.css'), `/* ${site.nom} — direction artistique « ${da.label} » (cerveau site v2, ${AUJOURDHUI}) */\n${faces}\n${tokens}\n${KIT_CSS}`)
  fs.writeFileSync(path.join(dossier, 'site.js'), KIT_JS)

  const pages = site.pages
  const communes = site.communes
  const pageDe = (commune) => pages.find((p) => p.type === 'commune' && p.cible === commune)
  const prestationsTitres = (() => { const s = contenu.pages['/']?.sections.find((x) => genre(x.h2) === 'prestations'); return s ? decouper(s.blocs).items.map((i) => i.titre) : [] })()

  function tete(page, rel, { titre, description, image }) {
    const url = BASE + page.chemin
    const ld = (contenu.pages[page.chemin]?.jsonld?.[0] || contenu.pages['/']?.jsonld?.[0])
    const ldPage = ld ? { ...ld, url, image: BASE + '/images/' + hero.base + '-1600.webp' } : null
    return `<!doctype html>
<html lang="fr" class="no-js${da.texture === 'grain' ? ' texture--grain' : da.texture === 'papier' ? ' texture--papier' : ''}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="${da.fond}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${BASE}/images/${(image || hero).base}-1600.webp">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="fr_FR">
<link rel="preload" href="${rel}fonts/${slug(da.display)}.woff2" as="font" type="font/woff2" crossorigin>
${page.type === 'accueil' ? `<link rel="preload" as="image" type="image/avif" imagesrcset="${srcsetDe(hero, rel, 'avif')}" imagesizes="${da.hero === 'plein' ? '100vw' : da.hero === 'aplat' ? '(max-width: 960px) 100vw, 50vw' : '(max-width: 960px) 100vw, 45vw'}" fetchpriority="high">` : ''}
<link rel="stylesheet" href="${rel}styles.css">
<script>document.documentElement.classList.replace('no-js','js');try{if(sessionStorage.getItem('rideau'))document.documentElement.classList.add('splash-vu')}catch(e){}</script>
<script src="${rel}site.js" defer></script>
${ldPage ? `<script type="application/ld+json">${JSON.stringify(ldPage)}</script>` : ''}
</head>
<body>
<div class="splash" aria-hidden="true"><div class="splash__rangee"><div class="splash__case"></div><div class="splash__case"></div><div class="splash__case"></div><div class="splash__case"></div><div class="splash__case"></div></div><div class="splash__rangee"><div class="splash__case"></div><div class="splash__case"></div><div class="splash__case"></div><div class="splash__case"></div><div class="splash__case"></div></div></div>
<header class="nav${page.type === 'accueil' && (da.hero === 'plein' || da.hero === 'aplat') ? ' nav--claire' : ''}"><div class="conteneur nav__inner">
<a class="nav__marque" href="${rel || './'}"><i></i>${esc(site.nom)}</a>
<nav class="nav__liens" aria-label="Sections"><a href="${rel}#prestations">Prestations</a><a href="${rel}#realisations">Réalisations</a><a href="${rel}#communes">Communes</a><a href="${rel}#questions">Questions</a></nav>
<div class="nav__droite"><a class="nav__tel" href="tel:${tel}">${telAffiche(tel)}</a><button class="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="panneau"><span></span><span></span></button></div>
</div></header>
<div class="panneau" id="panneau">
<nav aria-label="Menu"><a href="${rel || './'}">Accueil</a><a href="${rel}#prestations">Prestations</a><a href="${rel}#realisations">Réalisations</a>${pages.filter((p) => p.type === 'metier').map((p) => `<a href="${rel}${p.chemin.slice(1)}">${esc(p.cible)}</a>`).join('')}<a href="${rel}#contact">Contact</a></nav>
<div class="panneau__bas"><a href="tel:${tel}">${telAffiche(tel)}</a><span>${communes.map((c) => { const p = pageDe(c); return p ? `<a href="${rel}${p.chemin.slice(1)}">${esc(c)}</a>` : esc(c) }).join(' · ')}</span></div>
<div><a class="bouton" href="${rel}#contact">Demander un devis <span class="bouton__cercle">${FLECHE}</span></a></div>
</div>
<main>`
  }

  function pied(rel) {
    return `</main>
<footer class="pied"><div class="conteneur">
<div class="pied__grille">
<div><div class="nav__marque" style="margin-bottom:.75rem"><i></i>${esc(site.nom)}</div><p>${esc(da.label)} à ${esc(ville)} · <a href="tel:${tel}">${telAffiche(tel)}</a></p><p>SIREN ${esc(site.siren)} · Assurance décennale ${esc(site.decennale.assureur)} n° ${esc(site.decennale.numero)}</p></div>
<div><p class="pied__titre">Communes servies</p><ul>${communes.map((c) => { const p = pageDe(c); return `<li>${p ? `<a href="${rel}${p.chemin.slice(1)}">${esc(c)}</a>` : esc(c)}</li>` }).join('')}</ul></div>
<div><p class="pied__titre">Le site</p><ul><li><a href="${rel || './'}">Accueil</a></li>${pages.filter((p) => p.type === 'metier').map((p) => `<li><a href="${rel}${p.chemin.slice(1)}">${esc(p.cible)}</a></li>`).join('')}<li><a href="${rel}mentions-legales/">Mentions légales</a></li><li><a href="${rel}confidentialite/">Confidentialité</a></li></ul></div>
</div>
<div class="pied__bas"><span>© ${AUJOURDHUI.slice(0, 4)} ${esc(site.nom)}</span>${site.demo ? '<span>Site de démonstration — entreprise fictive, photos sous licence libre (voir les mentions légales)</span>' : ''}</div>
</div></footer>
</body>
</html>
`
  }

  const entete = (kicker, h2, intro, i = 0) => `<div class="entete reveal" style="--i:${i}"><span class="mono">${esc(kicker)}</span><h2>${esc(h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`
  const cartes = (items, depart = 0) => `<div class="cartes">${items.map((it, i) => `<article class="carte reveal" style="--i:${(i % 3) + 1}"><span class="mono">${String(depart + i + 1).padStart(2, '0')}</span><h3>${esc(it.titre)}</h3>${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}</article>`).join('')}</div>`
  // le dévoilement porte sur le rail entier : sur mobile, les photos hors de l'écran (défilement horizontal) ne croisent jamais l'observateur
  const galerieHtml = (liste, rel, eagerPremier = false) => `<div class="galerie reveal">${liste.map((a, i) => `<figure class="galerie__item"><div class="galerie__cadre">${photo(a, rel, { eager: eagerPremier && i === 0, sizes: '(max-width: 900px) 80vw, 40vw' })}</div><figcaption><span>${esc(a.legende)}</span><small>Photo ${esc(a.auteur)} · ${esc(a.licence)}</small></figcaption></figure>`).join('')}</div>`
  const communesHtml = (liste, rel, sauf) => `<div class="communes">${liste.filter((c) => c !== sauf).map((c) => { const p = pageDe(c); return p ? `<a class="commune reveal" href="${rel}${p.chemin.slice(1)}"><span>${esc(c)}</span><small>${esc(da.label)} à ${esc(c)}</small>${FLECHE}</a>` : `<span class="commune reveal"><span>${esc(c)}</span></span>` }).join('')}</div>`
  const bande = (intro, infos, rel) => `<section class="section" id="contact"><div class="conteneur"><div class="bande reveal"><div><span class="mono">Parlons de votre projet</span><h2 style="margin-top:1rem">${esc(intro.titre)}</h2>${intro.textes.map((t) => `<p style="margin-top:1rem;opacity:.85">${esc(t)}</p>`).join('')}<div class="hero__actions" style="margin-top:2rem"><a class="bouton" href="tel:${tel}">Demander un devis <span class="bouton__cercle">${FLECHE}</span></a><a class="hero__tel" href="tel:${tel}">${telAffiche(tel)}</a></div></div><div class="bande__infos">${infos.map((x) => `<div><strong>${esc(x.k)}</strong>${x.href ? `<a href="${x.href}">${esc(x.v)}</a>` : esc(x.v)}</div>`).join('')}</div></div></div></section>`
  const infosContact = (textes) => {
    const out = [{ k: 'Téléphone', v: telAffiche(tel), href: `tel:${tel}` }]
    for (const t of textes) {
      if (/\b\d{5}\b/.test(t) && /rue|avenue|chemin|place|boulevard|allée|route|impasse/i.test(t)) out.push({ k: 'Adresse', v: t })
      else if (/lundi|mardi|samedi|\d\s?h/i.test(t) && t.length < 90) out.push({ k: 'Horaires', v: t })
      else if (/@/.test(t)) out.push({ k: 'Email', v: t })
    }
    out.push({ k: 'Assurance', v: `Décennale ${site.decennale.assureur}, n° ${site.decennale.numero}` }, { k: 'SIREN', v: site.siren })
    return out
  }

  // ── L'accueil ────────────────────────────────────────────────────────────────────────────────────────────────
  function accueil(page) {
    const c = contenu.pages['/']
    const rel = ''
    const kicker = c.kicker || `${da.label} · ${ville}`
    const heroTexte = `<span class="mono entre" style="--d:.3s">${esc(kicker)}</span><h1>${mots(c.h1)}</h1><p class="chapeau entre" style="--d:1.1s">${esc(c.chapeau)}</p><div class="hero__actions entre" style="--d:1.3s"><a class="bouton" href="#contact">Demander un devis <span class="bouton__cercle">${FLECHE}</span></a><a class="hero__tel" href="tel:${tel}">${telAffiche(tel)}</a></div>`
    let heroHtml
    if (da.hero === 'plein') heroHtml = `<section class="hero hero--plein"><div class="hero__media">${photo(hero, rel, { eager: true, sizes: '100vw' })}</div>${da.filigrane ? `<div class="hero__filigrane" aria-hidden="true">${esc(da.filigrane)}</div>` : ''}<div class="conteneur"><div class="hero__contenu">${heroTexte}</div></div><div class="hero__indice">Défiler</div></section>`
    else if (da.hero === 'aplat') heroHtml = `<section class="hero hero--aplat"><div class="conteneur hero__grille"><div class="hero__contenu">${heroTexte}</div><div class="hero__media entre" style="--d:.9s">${photo(hero, rel, { eager: true, sizes: '(max-width: 960px) 100vw, 50vw' })}</div></div></section>`
    else heroHtml = `<section class="hero hero--scinde"><div class="conteneur hero__grille"><div class="hero__contenu">${heroTexte}</div><div class="hero__cadre entre" style="--d:.9s" data-legende="${esc(hero.legende)}"><div class="hero__media">${photo(hero, rel, { eager: true, sizes: '(max-width: 960px) 100vw, 45vw' })}</div></div></div></section>`

    const defile = [...prestationsTitres, ...communes.map((x) => `${da.label} à ${x}`)]
    const groupe = `<div class="defile__groupe">${defile.map((t) => `<span>${esc(t)}</span>`).join('')}</div>`
    const faits = `<section class="section section--serre"><div class="conteneur"><div class="faits"><div class="fait reveal" style="--i:0"><span class="mono">01 · Assurance</span><strong>Assuré décennale</strong><p>${esc(site.decennale.assureur)}, contrat n° ${esc(site.decennale.numero)} : chaque chantier est couvert dix ans.</p></div><div class="fait reveal" style="--i:1"><span class="mono">02 · Entreprise</span><strong>SIREN ${esc(site.siren)}</strong><p>Une entreprise déclarée, établie à ${esc(ville)}, joignable au ${telAffiche(tel)}.</p></div><div class="fait reveal" style="--i:2"><span class="mono">03 · Devis</span><strong>Devis clair et gratuit</strong><p>Un chiffrage écrit après visite, sans surprise ni ligne cachée.</p></div></div></div></section>`

    let corps = '', alt = false, contact = null
    for (const s of c.sections) {
      const { g, intro, items } = analyser(s)
      const classe = `section${alt ? ' section--alt' : ''}`
      if (g === 'prestations') { corps += `<section class="${classe}" id="prestations"><div class="conteneur">${entete('Prestations', s.h2, intro)}${cartes(items)}</div></section>`; alt = !alt }
      else if (g === 'engagements') { corps += `<section class="${classe}"><div class="conteneur">${entete('Engagements', s.h2, intro)}${cartes(items)}</div></section>`; alt = !alt }
      else if (g === 'galerie') { corps += `<section class="${classe}" id="realisations"><div class="conteneur">${entete('Réalisations', s.h2, intro)}${galerieHtml(galerie.length >= 3 ? galerie : photos, rel)}</div></section>`; alt = !alt }
      else if (g === 'communes') { corps += `<section class="${classe}" id="communes"><div class="conteneur"><div class="deux"><div>${entete('Zone d’intervention', s.h2, intro)}${items.map((it) => `<h3>${esc(it.titre)}</h3>${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}`).join('')}</div>${communesHtml(communes, rel)}</div></div></section>`; alt = !alt }
      else if (g === 'etapes') { corps += `<section class="${classe}" id="etapes"><div class="conteneur"><div class="etapes"><div class="etapes__tete reveal"><span class="mono">Comment ça se passe</span><h2>${esc(s.h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}</div><ol class="etapes__liste">${items.map((it, i) => `<li class="etape"><span class="mono">Étape ${String(i + 1).padStart(2, '0')}</span><h3>${esc(it.titre)}</h3>${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}</li>`).join('')}</ol></div></div></section>`; alt = !alt }
      else if (g === 'faq') { corps += `<section class="${classe}" id="questions"><div class="conteneur">${entete('Questions fréquentes', s.h2, intro)}<div class="faq reveal">${items.map((it) => `<details><summary>${esc(it.titre)}</summary><div class="faq__corps">${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}</div></details>`).join('')}</div></div></section>`; alt = !alt }
      else if (g === 'contact') contact = { titre: s.h2, textes: intro.filter((t) => !(/\b\d{5}\b/.test(t) && /rue|avenue|chemin|place|boulevard/i.test(t)) && !(/lundi|mardi|samedi/i.test(t) && t.length < 90)), tous: intro }
      else { corps += `<section class="${classe}"><div class="conteneur"><div class="prose reveal"><h2>${esc(s.h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}${items.map((it) => `<h3>${esc(it.titre)}</h3>${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}`).join('')}</div></div></section>`; alt = !alt }
    }
    if (!contact) contact = { titre: 'Échangeons sur votre projet', textes: [], tous: [] }
    return tete(page, rel, { titre: c.title, description: c.description }) + heroHtml + `<div class="defile" aria-hidden="true"><div class="defile__piste">${groupe}${groupe}</div></div>` + faits + corps + bande(contact, infosContact(contact.tous), rel) + pied(rel)
  }

  // ── Une page intérieure (commune, métier secondaire) ────────────────────────────────────────────────────────
  function interieure(page, index) {
    const c = contenu.pages[page.chemin]
    const rel = '../'.repeat(page.chemin.split('/').filter(Boolean).length)
    const kicker = c.kicker || (page.type === 'commune' ? `Intervention à ${page.cible}` : `${page.cible} · ${ville}`)
    const voisines = page.type === 'commune' ? [1, 2].map((k) => communes[(communes.indexOf(page.cible) + k) % communes.length]).filter((x) => x && x !== page.cible) : communes.slice(0, 3)
    const mesPhotos = [1, 2, 3].map((k) => galerie[(index + k) % galerie.length]).filter(Boolean)
    let corps = `<section class="hero hero--page"><div class="conteneur"><div class="hero__contenu"><nav class="ariane entre" style="--d:.2s" aria-label="Fil d’Ariane"><a href="${rel}">Accueil</a><span>/</span><span>${esc(page.cible)}</span></nav><span class="mono entre" style="--d:.3s">${esc(kicker)}</span><h1>${mots(c.h1)}</h1>${c.chapeau ? `<p class="chapeau entre" style="--d:1s">${esc(c.chapeau)}</p>` : ''}<div class="hero__actions entre" style="--d:1.2s"><a class="bouton" href="#contact">Demander un devis <span class="bouton__cercle">${FLECHE}</span></a><a class="hero__tel" href="tel:${tel}">${telAffiche(tel)}</a></div></div></div></section>`
    let alt = true, premierePhoto = true, contact = null
    for (const s of c.sections) {
      const { g, intro, items } = analyser(s)
      const classe = `section${alt ? ' section--alt' : ''}`
      if (g === 'prestations' && items.length) { corps += `<section class="${classe}"><div class="conteneur">${entete('Prestations', s.h2, intro)}${cartes(items)}</div></section>`; alt = !alt }
      else if (g === 'galerie') { corps += `<section class="${classe}"><div class="conteneur">${entete('Réalisations', s.h2, intro)}${galerieHtml(mesPhotos, rel, premierePhoto)}</div></section>`; premierePhoto = false; alt = !alt }
      else if (g === 'communes') { corps += `<section class="${classe}"><div class="conteneur"><div class="deux"><div>${entete('À proximité', s.h2, intro)}</div>${communesHtml([...voisines, ...(page.type === 'commune' ? [] : [])], rel, page.cible)}</div><p style="margin-top:2rem"><a class="bouton bouton--contour" href="${rel}">Retour à l’accueil</a></p></div></section>`; alt = !alt }
      else if (g === 'etapes' && items.length) { corps += `<section class="${classe}"><div class="conteneur"><div class="etapes"><div class="etapes__tete reveal"><span class="mono">Comment ça se passe</span><h2>${esc(s.h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}</div><ol class="etapes__liste">${items.map((it, i) => `<li class="etape"><span class="mono">Étape ${String(i + 1).padStart(2, '0')}</span><h3>${esc(it.titre)}</h3>${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}</li>`).join('')}</ol></div></div></section>`; alt = !alt }
      else if (g === 'faq' && items.length) { corps += `<section class="${classe}"><div class="conteneur">${entete('Questions', s.h2, intro)}<div class="faq reveal">${items.map((it) => `<details><summary>${esc(it.titre)}</summary><div class="faq__corps">${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}</div></details>`).join('')}</div></div></section>`; alt = !alt }
      else if (g === 'contact' && !items.length) contact = { titre: s.h2, textes: intro, tous: intro }
      else { corps += `<section class="${classe}"><div class="conteneur"><div class="prose reveal"><h2>${esc(s.h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}${items.map((it) => `<h3>${esc(it.titre)}</h3>${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}`).join('')}</div></div></section>`; alt = !alt }
    }
    if (!c.sections.some((s) => genre(s.h2) === 'galerie') && mesPhotos.length) corps += `<section class="section"><div class="conteneur">${entete('Réalisations', 'Quelques chantiers', [])}${galerieHtml(mesPhotos, rel, premierePhoto)}</div></section>`
    if (page.type === 'commune' && !c.sections.some((s) => genre(s.h2) === 'communes')) corps += `<section class="section section--alt"><div class="conteneur"><div class="deux"><div>${entete('À proximité', 'Autres communes desservies', [])}</div>${communesHtml(voisines, rel, page.cible)}</div></div></section>`
    if (!contact) contact = { titre: `Votre ${da.label.toLowerCase()} à ${page.cible}`, textes: [], tous: [] }
    return tete(page, rel, { titre: c.title, description: c.description, image: mesPhotos[0] }) + corps + bande(contact, infosContact(contact.tous), rel) + pied(rel)
  }

  // ── Les pages légales ───────────────────────────────────────────────────────────────────────────────────────
  function legale(page) {
    const c = contenu.pages[page.chemin]
    const rel = '../'
    let corps = `<section class="hero hero--page"><div class="conteneur"><div class="hero__contenu"><nav class="ariane" aria-label="Fil d’Ariane"><a href="${rel}">Accueil</a><span>/</span><span>${esc(c.h1)}</span></nav><h1>${mots(c.h1)}</h1>${c.chapeau ? `<p class="chapeau">${esc(c.chapeau)}</p>` : ''}</div></div></section><section class="section"><div class="conteneur"><div class="prose">`
    for (const s of c.sections) {
      const { intro, items } = decouper(s.blocs)
      if (/cr[ée]dit/i.test(s.h2)) {
        corps += `<h2>${esc(s.h2)}</h2><p>Les photographies de ce site de démonstration proviennent de Wikimedia Commons, sous licence libre. Pour chacune : l’auteur, la licence et la page d’origine.</p><ul class="credits">${photos.map((p) => `<li><span>${esc(p.legende)}</span><span>— ${esc(p.auteur)}</span><span>(${esc(p.licence)})</span><a href="${p.source}" rel="license noopener" target="_blank">page du fichier</a></li>`).join('')}</ul>`
        continue
      }
      corps += `<h2>${esc(s.h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}${items.map((it) => `<h3>${esc(it.titre)}</h3>${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}`).join('')}`
    }
    if (/mentions/.test(page.chemin) && !c.sections.some((s) => /cr[ée]dit/i.test(s.h2))) corps += `<h2>Crédits photographiques</h2><ul class="credits">${photos.map((p) => `<li><span>${esc(p.legende)}</span><span>— ${esc(p.auteur)}</span><span>(${esc(p.licence)})</span><a href="${p.source}" rel="license noopener" target="_blank">page du fichier</a></li>`).join('')}</ul>`
    if (/mentions/.test(page.chemin) && site.demo && !JSON.stringify(c.sections).toLowerCase().includes('démonstration')) corps += `<p><strong>Site de démonstration :</strong> entreprise fictive, coordonnées fictives.</p>`
    corps += `</div></div></section>`
    return tete(page, rel, { titre: c.title, description: c.description }) + corps + pied(rel)
  }

  // ── Écriture ────────────────────────────────────────────────────────────────────────────────────────────────
  let n = 0, indexInterieure = 0
  for (const page of pages) {
    if (!contenu.pages[page.chemin]) { console.log(`  ✗ ${metier}${page.chemin} : pas de contenu extrait`); continue }
    const html = page.type === 'accueil' ? accueil(page) : page.type === 'legal' ? legale(page) : interieure(page, indexInterieure++)
    const f = path.join(dossier, page.chemin.replace(/^\//, ''), 'index.html')
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); n++
  }
  const publiques = pages.filter((p) => p.type !== 'legal')
  fs.writeFileSync(path.join(dossier, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publiques.map((p) => `  <url><loc>${BASE}${p.chemin}</loc><lastmod>${AUJOURDHUI}</lastmod></url>`).join('\n')}\n</urlset>\n`)
  fs.writeFileSync(path.join(dossier, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`)
  for (const vieux of ['build.mjs']) { const f = path.join(dossier, vieux); if (fs.existsSync(f)) fs.rmSync(f) }
  console.log(`  ✓ ${metier} : ${n} pages, ${photos.length} photos (${auteurs.length} auteurs), héros « ${da.hero} », police ${da.display}${da.texte !== da.display ? ' + ' + da.texte : ''}, styles.css ${(fs.statSync(path.join(dossier, 'styles.css')).size / 1024).toFixed(1)} Ko`)
}

const args = process.argv.slice(2)
const METIERS = args.includes('--tous') ? Object.keys(DA).filter((m) => m !== '_' && fs.existsSync(path.join(ICI, m, 'contenu.json'))) : args.filter((a) => !a.startsWith('--'))
if (!METIERS.length) { console.error('usage : node public/sites-demo/generer.mjs <metier…> | --tous'); process.exit(2) }
for (const m of METIERS) { try { generer(m) } catch (e) { console.log(`  ✗ ${m} : ${e.message}`); process.exitCode = 1 } }
