// public/sites-demo/generer.mjs — le cerveau site v2 rend un site d'artisan à partir de trois entrées : site.json (le
// dossier), contenu.json (les textes, écrits et jugés), attributions.json (les photos et ce que Commons en dit), et de la
// direction artistique du métier (_kit/da.json). Le mouvement vient de _kit/kit.css + kit.js, copiés dans le site.
// Aucun modèle de langage n'est appelé ici : c'est une mise en page déterministe, rejouable, jugeable par site-qa.mjs.
//
// Depuis le 14/09, UNE seule démo vit : Atelier Lestraque. Les neuf autres démos métier sont gelées (leurs fichiers en ligne
// ne sont plus régénérés) ; ce générateur n'est tenu exécutable que pour lestraque.
//
// Usage : node public/sites-demo/generer.mjs lestraque
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ICI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const DA = JSON.parse(fs.readFileSync(path.join(ICI, '_kit', 'da.json'), 'utf8'))
const KIT_CSS = fs.readFileSync(path.join(ICI, '_kit', 'kit.css'), 'utf8')
const KIT_JS = fs.readFileSync(path.join(ICI, '_kit', 'kit.js'), 'utf8')
const AUJOURDHUI = new Date().toISOString().slice(0, 10)
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const telAffiche = (t) => { const d = String(t).replace(/\D/g, ''); const n = d.startsWith('33') ? '0' + d.slice(2) : d; return n.replace(/(\d{2})(?=\d)/g, '$1 ') }
// le lien d'appel au format RFC 3966 (« tel:+33261913847 ») : des espaces dans l'URI ne sont pas valides (juge du 14/09)
const telHref = (t) => `tel:${String(t).replace(/[^\d+]/g, '')}`
// des espaces réels entre les mots : le texte reste lisible tel quel (juge, lecteur d'écran, copier-coller)
const mots = (h1) => h1.split(/\s+/).map((m, i) => `<span class="mot" style="--i:${i}">${esc(m)}</span>`).join(' ')
// Un titre de scène en mots masqués (priorité 9) : chaque mot monte sous son propre masque, lié à la position de défilement, sur
// bureau seulement (kit.css v26). Ailleurs, les deux spans restent en ligne : aucun effet sur le texte ni sur sa mise en page.
const masque = (t) => t.split(/\s+/).map((m, i) => `<span class="ml"><span class="ml__in" style="--i:${i}">${esc(m)}</span></span>`).join(' ')
const nbMots = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length
const texteDe = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ')
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
// Un h2 écrit pour un humain (« Ce que l'atelier fabrique ») ne dit plus son genre : contenu.json le porte alors en clair
// (champ `genre`), et le h2 SEO d'origine reste dans title/description et sur les pages communes (priorité 5, 14/09).
const genreDe = (s) => s.genre || genre(s.h2)
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
// Un paragraphe numéroté : « 1. Titre : texte », « Étape 2 — Titre. Texte », ou sans ponctuation « 1 Prise de contact Vous
// décrivez… » (les li de contenu.json : avant le 14/09, ce dernier cas n'était pas reconnu et la liste des étapes sortait vide)
const NUMERO = /^\s*(?:étape\s*)?\d+(?:\s*[.)\-–—:]|\s)\s*(?=\S)/i
const enItems = (paras) => paras.map((p) => p.replace(NUMERO, '')).map((p) => {
  const m = /^(.{8,90}?)\s*(?:[:—–]|\.\s)\s*(.+)$/.exec(p)
  // Sans « : » ni « . » entre le titre et le texte, le titre s'arrête avant le premier mot à majuscule initiale suivie d'une
  // minuscule (« Prise de contact | Vous décrivez… ») ; sinon les six premiers mots faisaient le titre (« Prise de contact
  // Vous décrivez vos »). La ponctuation garde la main quand elle coupe plus tôt (« Visite : nous passons à Rennes »).
  const ms = p.split(/\s+/)
  const k = ms.findIndex((w, i) => i > 0 && /^\p{Lu}\p{Ll}/u.test(w))
  if (k > 0) {
    const titre = ms.slice(0, k).join(' '), texte = ms.slice(k).join(' ')
    if (titre.length <= 70 && texte.length >= 20 && (!m || titre.length < m[1].length)) return { titre, textes: [texte] }
  }
  return m ? { titre: m[1].replace(/[.:]$/, ''), textes: [m[2]] } : { titre: ms.slice(0, 6).join(' '), textes: [p] }
})
function faqDepuisParagraphes(paras) {
  const intro = [], items = []; let courant = null
  for (const p of paras) { if (/\?\s*$/.test(p) && p.length < 160) { courant = { titre: p, textes: [] }; items.push(courant) } else if (courant) courant.textes.push(p); else intro.push(p) }
  return { intro, items: items.filter((it) => it.textes.length) }
}
function analyser(s) {
  const g = genreDe(s)
  let { intro, items } = decouper(g === 'galerie' ? avantImage(s.blocs) : s.blocs)
  intro = intro.filter((p) => !/^photo\b|wikimedia|licence cc|\(photo /i.test(p))
  if (!items.length && (g === 'etapes' || g === 'prestations' || g === 'engagements')) {
    const num = intro.filter((p) => NUMERO.test(p))
    if (num.length >= 3) { items = enItems(num); intro = intro.filter((p) => !num.includes(p)) }
  }
  if (!items.length && g === 'faq') { const r = faqDepuisParagraphes(intro); if (r.items.length >= 2) ({ intro, items } = r) }
  return { g, intro, items }
}

// ── Garde-fous de sortie ──────────────────────────────────────────────────────────────────────────────────────
// Ce qu'une capture ne montre pas (une liste vide dans une section sombre, un h3 orphelin sous un en-tête) arrête la
// génération au lieu de partir en ligne — la liste des étapes de Lestraque est sortie vide le 14/09. Ils passent AVANT
// toute écriture : un échec laisse le site tel qu'il était, polices, styles et script compris.
function gardeFous(html, ou, couverture = null) {
  const vide = /<(ol|ul)\b[^>]*>\s*<\/\1>/i.exec(html)
  if (vide) throw new Error(`${ou} : liste <${vide[1]}> vide, après « ${html.slice(Math.max(0, vide.index - 120), vide.index).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(-80)} »`)
  const nu = /<div class="entete\b[^"]*"[^>]*>(?:(?!<\/div>)[\s\S])*<\/div>\s*<h3\b/i.exec(html)
  if (nu) throw new Error(`${ou} : un <h3> nu suit un .entete (« ${nu[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90)} »)`)
  // retirés le 14/09 (priorités 3 et 4) : le rideau cachait l'entrée du titre, la lentille passait sous les lettres, la bande
  // de mots-clés tranchait la photo au premier coup de molette
  for (const [re, quoi] of [[/class="splash/, 'le rideau d’ouverture'], [/hero__revele/, 'la lentille du héros'], [/class="defile/, 'la bande qui défile']]) if (re.test(html)) throw new Error(`${ou} : ${quoi} est revenu`)
  // le texte visible : apostrophes typographiques seulement (« d'escaliers » et « l’atelier » se côtoyaient dans les cartes,
  // juge du 14/09), et aucun caractère que la police de texte ne rend pas
  const visible = texteDe(html.slice(html.indexOf('<body')))
  // les liens d'appel au format RFC 3966 : « tel:+33261913847 », sans espace ni point
  const telFaux = /href="tel:([^"]*)"/.exec([...html.matchAll(/href="tel:[^"]*"/g)].map((m) => m[0]).find((h) => !/^href="tel:\+?\d+"$/.test(h)) || '')
  if (telFaux) throw new Error(`${ou} : lien tel:${telFaux[1]} hors du format RFC 3966 (chiffres et « + » seulement)`)
  // « gratuit » est un engagement commercial que l'artisan n'a pas pris (title, description, FAQ : retirés le 14/09)
  const gratuit = /gratuit/i.exec(html)
  if (gratuit) throw new Error(`${ou} : « ${html.slice(Math.max(0, gratuit.index - 40), gratuit.index + 12).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()} » — la gratuité du devis n’est pas un engagement validé`)
  const droite = /\p{L}'(?=\p{L})/u.exec(visible)
  if (droite) throw new Error(`${ou} : apostrophe droite dans le texte (« ${visible.slice(Math.max(0, droite.index - 30), droite.index + 20).trim()} ») — ’ partout`)
  if (couverture) {
    const hors = [...new Set([...visible].filter((ch) => !/\s/.test(ch) && !couverture.has(ch.codePointAt(0))))]
    if (hors.length) throw new Error(`${ou} : ${hors.map((ch) => `« ${ch} » U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(', ')} hors de la couverture de la police de texte (sortirait dans la police du système)`)
  }
}
// L'accueil : ce que les priorités 3, 4 et 5 promettent, vérifié sur le HTML rendu (et non sur les données d'entrée)
function gardeFousAccueil(html, ou, { site, tel, chapeau, sourceDe = new Map() }) {
  const corps = html.slice(html.indexOf('<body'), html.indexOf('<footer'))
  // Aucune photo plus de deux fois sur l'accueil (l'escalier revenait quatre fois, la cuisine trois, juge du 14/09) : compté par
  // <picture> et par fichier Commons d'origine — le héros et son recadrage 4:5 pour téléphone sont une seule photo
  const vues = new Map()
  for (const pic of corps.match(/<picture\b[\s\S]*?<\/picture>/g) || []) {
    for (const src of new Set([...pic.matchAll(/images\/([a-z0-9-]+)-\d+\.(?:avif|webp)/g)].map((m) => sourceDe.get(m[1]) || m[1]))) vues.set(src, (vues.get(src) || 0) + 1)
  }
  const trop = [...vues].filter(([, n]) => n > 2)
  if (trop.length) throw new Error(`${ou} : ${trop.map(([s, n]) => `« ${decodeURIComponent(s.split('File:').pop())} » ${n} fois`).join(', ')} sur l’accueil (2 au plus)`)
  const hero = /<section class="hero\b[\s\S]*?<\/section>/.exec(corps)?.[0] || ''
  const h1 = texteDe(/<h1\b[\s\S]*?<\/h1>/.exec(html)?.[0] || '')
  if (!/Menuisier/.test(h1) || !/Rennes/.test(h1)) throw new Error(`${ou} : le h1 doit garder « Menuisier » et « Rennes » (lu : « ${h1.trim()} »)`)
  if (/href="tel:/.test(hero)) throw new Error(`${ou} : un lien tel: est resté dans le héros`)
  if (chapeau.length > 90 || nbMots(chapeau) > 20) throw new Error(`${ou} : chapeau de ${chapeau.length} signes et ${nbMots(chapeau)} mots (90 et 20 au plus)`)
  const texte = texteDe(corps)
  for (const interdit of [site.siren, site.decennale?.numero, site.decennale?.assureur, 'fictif'].filter(Boolean)) if (texte.includes(interdit)) throw new Error(`${ou} : « ${interdit} » hors du pied de page (SIREN et assureur : pied de page et mentions légales seulement)`)
  const liensTel = (corps.match(/href="tel:/g) || []).length, affiches = texte.split(telAffiche(tel)).length - 1
  if (liensTel > 2 || affiches > 2) throw new Error(`${ou} : le téléphone revient ${Math.max(liensTel, affiches)} fois hors du pied de page (2 au plus)`)
  if (!/<section class="plateau\b/.test(corps)) throw new Error(`${ou} : le plateau « une phrase et trois chiffres » manque sous le héros`)
  const apresHero = corps.slice(corps.indexOf(hero) + hero.length).trimStart()
  if (!apresHero.startsWith('<section class="plateau')) throw new Error(`${ou} : le plateau doit suivre immédiatement le héros`)
  const prestations = /<section\b[^>]*id="prestations"[\s\S]*?<\/section>/.exec(corps)?.[0] || ''
  if (/class="carte\b/.test(prestations)) throw new Error(`${ou} : des cartes bordées sont revenues dans #prestations (liste éditoriale attendue)`)
  if (!/<section class="contact\b[^"]*"[^>]*id="contact"/.test(corps)) throw new Error(`${ou} : le contact n’est plus le plateau pleine largeur (.contact)`)
  for (const h2 of [...corps.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => texteDe(m[1]).trim())) if (nbMots(h2) < 2 || nbMots(h2) > 4) throw new Error(`${ou} : h2 « ${h2} » de ${nbMots(h2)} mots (2 à 4, écrits pour un humain)`)
}
// Les scènes (priorité 8) : un fond par section, lu sur les classes rendues — photo (héros, bande de l'atelier, contact sur
// photo), noir (plateau, sections noires, contact sans photo) ou papier. Deux voisines n'ont jamais le même ; les surtitres
// ne tiennent que deux scènes ; chaque photo de galerie se dévoile seule (plus de .reveal sur la galerie entière) ; les
// questions sont en deux colonnes. Vérifié sur le HTML rendu de chaque page, accueil et communes.
const fondDe = (classes) => /\b(?:hero--plein|atelier|contact--photo)\b/.test(classes) ? 'photo' : /\b(?:plateau|section--noir|section--sombre|contact)\b/.test(classes) ? 'noir' : 'papier'
function gardeFousScenes(html, ou) {
  const main = html.slice(html.indexOf('<main>'), html.indexOf('</main>'))
  const blocs = main.split(/(?=<section\b)/).filter((b) => b.startsWith('<section'))
  const fonds = blocs.map((b) => ({ fond: fondDe(/^<section class="([^"]*)"/.exec(b)?.[1] || ''), nom: (/id="([^"]+)"/.exec(b.slice(0, 300))?.[1]) || (/^<section class="([^"]*)"/.exec(b)?.[1] || '') }))
  for (let i = 1; i < fonds.length; i++) if (fonds[i].fond === fonds[i - 1].fond) throw new Error(`${ou} : deux scènes voisines sur le même fond (${fonds[i].fond}) : « ${fonds[i - 1].nom} » puis « ${fonds[i].nom} »`)
  const surtitres = blocs.filter((b) => /class="mono"/.test(b)).length
  if (surtitres > 2) throw new Error(`${ou} : ${surtitres} scènes portent un surtitre (2 au plus)`)
  if (/<div class="galerie\b[^"]*\breveal\b/.test(main)) throw new Error(`${ou} : la galerie entière est un seul .reveal (chaque photo se dévoile seule)`)
  for (const m of main.matchAll(/<figure class="galerie__item\b([^"]*)"/g)) if (!/\breveal\b/.test(m[1])) throw new Error(`${ou} : une photo de galerie sans .reveal`)
  if (/<details>/.test(main) && !/class="scene-large faq-scene"/.test(main)) throw new Error(`${ou} : les questions ne sont plus en deux colonnes (.faq-scene)`)
  if (/class="carte\b/.test(main)) throw new Error(`${ou} : une carte bordée est revenue dans une scène`)
  // le pied suit le contact (photo ou noir) : il reste sur papier — le bas du contact et le pied faisaient un seul noir (ΔE 0, juge du 14/09)
  const pied = /<footer class="([^"]*)"/.exec(html)?.[1] || ''
  if (fonds.length && fonds.at(-1).fond !== 'papier' && /\bpied--nuit\b/.test(pied)) throw new Error(`${ou} : le pied de page est sur le même noir que « ${fonds.at(-1).nom} »`)
  // le h1 en deux spans : sans espace entre eux, le nom accessible devenait « Menuisier à RennesFait pour rester »
  if (/<\/span><\/span><span class="h1__ligne"/.test(html)) throw new Error(`${ou} : pas d’espace entre le mot-clé et la ligne display du h1`)
}
// Le devis et le formulaire : un lien « devis » mène au formulaire de la page, et un texte qui parle de « formulaire » en
// exige un (juge et critique du 14/09 : bouton sans issue, étape 1 qui promettait un formulaire absent). Pages légales exclues :
// leur lien de devis vise le formulaire de l'accueil.
function gardeFousDevis(html, ou) {
  const corps = html.slice(html.indexOf('<body'), html.indexOf('<footer'))
  const form = /<form\b[^>]*class="devis__form/.test(corps)
  for (const m of corps.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
    if (/devis/i.test(texteDe(m[2])) && !(form && m[1] === '#contact')) throw new Error(`${ou} : « ${texteDe(m[2]).trim()} » vise ${m[1]}${form ? '' : ', et la page n’a pas de formulaire de devis'}`)
  }
  if (/formulaire/i.test(texteDe(corps)) && !form) throw new Error(`${ou} : le texte parle d’un formulaire que la page n’a pas`)
  if (form && !/id="contact"/.test(corps)) throw new Error(`${ou} : le formulaire n’est pas dans #contact`)
}
// La voix (critique du 14/09, écart 1) : personne ne parlait — ni nom, ni parcours, et un texte de générateur SEO. site.json →
// artisan porte la personne (fictive et vraisemblable sur une démo, le pied de page le dit) ; le texte parle à la première
// personne, avec des faits. Aucun avis inventé : la voix passe par la citation signée.
function verifierArtisan(a, ou) {
  if (!a) throw new Error(`${ou} : site.json → artisan manque (prénom, nom, installation, parcours, citation)`)
  for (const k of ['prenom', 'nom', 'parcours', 'citation']) if (!String(a[k] || '').trim()) throw new Error(`${ou} : artisan.${k} absent`)
  const an = Number(a.installation), maintenant = new Date().getFullYear()
  if (!Number.isInteger(an) || an < 1960 || an > maintenant) throw new Error(`${ou} : artisan.installation « ${a.installation} » n’est pas une année plausible`)
  if (a.parcours.length > 140) throw new Error(`${ou} : artisan.parcours de ${a.parcours.length} signes (une ligne : 140 au plus)`)
  if (a.citation.length < 20 || a.citation.length > 160) throw new Error(`${ou} : artisan.citation hors 20-160 signes`)
  // une phrase signée se dit à la première personne (« c’est la même main qui travaille » restait impersonnelle, juge du 14/09)
  if (!/(?<![\p{L}])(?:je|me|moi|mon|ma|mes)(?![\p{L}])|(?<![\p{L}])[jm]’(?=\p{L})/iu.test(a.citation)) throw new Error(`${ou} : artisan.citation « ${a.citation} » n’est pas à la première personne`)
}
const signatureDe = (a, ville) => `${a.prenom} ${a.nom} · à ${ville} depuis ${a.installation}`
// Les formules d'un texte de générateur : refusées dans tout le texte visible (pages légales comprises)
const CLICHES = [/passionn/i, /professionnalisme/i, /haut niveau d[’']exigence/i, /exemplaire/i, /sublim/i, /de A à Z/, /savoir-faire/i, /int[ée]rieure et ext[ée]rieure/i, /est une priorit[ée]/i]
function gardeFousVoix(html, ou, { accueil = false, artisan = null } = {}) {
  const corps = texteDe(html.slice(html.indexOf('<body'), html.indexOf('<footer')))
  for (const re of CLICHES) { const m = re.exec(corps); if (m) throw new Error(`${ou} : formule de générateur « ${corps.slice(Math.max(0, m.index - 30), m.index + 40).trim()} »`) }
  if (!accueil) return
  const signee = /<figure class="plateau__citation\b[\s\S]*?<blockquote>[\s\S]*?<\/blockquote>\s*<figcaption>([\s\S]*?)<\/figcaption>/.exec(html)
  if (!signee || !artisan || !texteDe(signee[1]).includes(`${artisan.prenom} ${artisan.nom}`)) throw new Error(`${ou} : l’accueil n’a aucune phrase signée par l’artisan (${artisan ? `${artisan.prenom} ${artisan.nom}` : 'site.json → artisan'})`)
  const nous = (corps.match(/(?<![\p{L}])(?:nous|nos|notre)(?![\p{L}])/giu) || []).length
  const je = (corps.match(/(?<![\p{L}])(?:je|j’|mon|ma|mes|moi)(?![\p{L}])/giu) || []).length
  if (je === 0 || nous > 3 * je) throw new Error(`${ou} : ${nous} « nous / nos / notre » pour ${je} « je / mon / moi » — l’artisan parle à la première personne`)
}
// Le plateau vient de site.json : la citation signée de l'artisan et trois chiffres qu'il remplit — jamais des zéros
function verifierPlateau(p, ou) {
  if (!p) return
  if (!Array.isArray(p.chiffres) || p.chiffres.length !== 3) throw new Error(`${ou} : plateau.chiffres doit en compter trois`)
  for (const c of p.chiffres) {
    const n = Number(String(c.valeur).replace(',', '.').replace(/\s/g, ''))
    if (!Number.isFinite(n) || n <= 0) throw new Error(`${ou} : plateau.chiffres « ${c.valeur} » n'est pas un nombre strictement positif`)
    if (!c.legende) throw new Error(`${ou} : le chiffre « ${c.valeur} » n'a pas de légende`)
  }
}

// ── Licences et modifications ─────────────────────────────────────────────────────────────────────────────────
// Les actes de licence, pour les crédits détaillés (une photo CC BY / BY-SA se crédite avec un lien vers sa licence)
const LICENCES_URL = {
  'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/deed.fr',
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/deed.fr', 'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/deed.fr', 'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/deed.fr',
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/deed.fr', 'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/deed.fr', 'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
}
// attributions.json → « modifiee » : « Oui — étalonnée (…) par Presti pour ce site de démonstration ». Une photo étalonnée
// ou recadrée se signale « modifiée » ; une photo CC BY-SA modifiée est une adaptation, sous la même licence.
const estModifiee = (a) => /^oui\b/i.test(String(a.modifiee || '').trim())
const detailModif = (a) => String(a.modifiee || '').trim().replace(/^oui\s*[—–-]?\s*/i, '').replace(/\s*par Presti\b.*$/i, '')
const partageIdentique = (licence) => /BY-SA/i.test(licence)

// ── Images ────────────────────────────────────────────────────────────────────────────────────────────────────
// les variantes disponibles (480 à 2880 selon la date du téléchargement) sont lues dans attributions.json
const srcsetDe = (a, rel, ext) => (a.largeurs || [480, 960, 1600]).map((l) => `${rel}images/${a.base}-${l}.${ext} ${l}w`).join(', ')
// position : le cadrage d'affichage (object-position) quand la case recadre la photo — la vignette « porte » montre la porte des
// boiseries et non le coussin du premier plan ; les fichiers ne sont jamais retouchés pour ça
function photo(a, rel, { eager = false, sizes = '(max-width: 900px) 100vw, 60vw', classe = '', alt = null, position = null } = {}) {
  const defaut = (a.largeurs || [480, 960, 1600]).filter((l) => l <= 960).at(-1) || a.largeurs?.[0] || 960
  return `<picture${classe ? ` class="${classe}"` : ''}><source type="image/avif" srcset="${srcsetDe(a, rel, 'avif')}" sizes="${sizes}"><source type="image/webp" srcset="${srcsetDe(a, rel, 'webp')}" sizes="${sizes}"><img src="${rel}images/${a.base}-${defaut}.webp" alt="${esc(alt ?? (a.alt || a.legende))}" width="${a.largeur}" height="${a.hauteur}"${position ? ` style="object-position:${esc(position)}"` : ''}${eager === true ? ' fetchpriority="high"' : eager ? '' : ' loading="lazy" decoding="async"'}></picture>`
}
// Le héros : la photo de bureau (jusqu'à 2880 px, nette en DPR 2 à 1440) et, sous 768 px, la version recadrée en 4:5 autour
// de l'œil de la spirale. Le héros couvre 100svh : sur un téléphone, l'image affichée est plus large que l'écran (hauteur
// × 0,8), d'où sizes = 80vh quand l'écran est plus étroit que 4:5 — sinon le navigateur prendrait la 720 et l'agrandirait.
const SIZES_HEROS = '100vw'
const SIZES_HEROS_MOBILE = '(max-aspect-ratio: 4/5) 80vh, 100vw'
const MEDIA_MOBILE = '(max-width: 767px)'
// lazy + alt : la même photo plein cadre sous la ligne de flottaison (la bande « Dans l’atelier », le fond du contact, qui
// reprend le héros avec les mêmes sources et le même sizes : le navigateur la sert depuis son cache, zéro octet de plus)
function photoHeros(a, m, rel, { lazy = false, alt = null, sizesMobile = SIZES_HEROS_MOBILE } = {}) {
  const defaut = a.largeurs.filter((l) => l <= 1600).at(-1)
  const mobile = m ? `<source media="${MEDIA_MOBILE}" type="image/avif" srcset="${srcsetDe(m, rel, 'avif')}" sizes="${sizesMobile}"><source media="${MEDIA_MOBILE}" type="image/webp" srcset="${srcsetDe(m, rel, 'webp')}" sizes="${sizesMobile}">` : ''
  // pas de fetchpriority="high" sur l'image : au téléphone, l'élément LCP est le titre, et une photo prioritaire le retardait
  // (LCP mobile 2 485 ms avec, 1 885 ms sans — Lighthouse, 14/09). Le préchargement de bureau garde sa priorité haute.
  return `<picture>${mobile}<source type="image/avif" srcset="${srcsetDe(a, rel, 'avif')}" sizes="${SIZES_HEROS}"><source type="image/webp" srcset="${srcsetDe(a, rel, 'webp')}" sizes="${SIZES_HEROS}"><img src="${rel}images/${a.base}-${defaut}.webp" alt="${esc(alt ?? (a.alt || a.legende))}" width="${a.largeur}" height="${a.hauteur}"${lazy ? ' loading="lazy" decoding="async"' : ''}></picture>`
}

// Une démo est servie par Next depuis public/ : `/sites-demo/x/` y est redirigé (308) vers `/sites-demo/x`, et depuis cette
// adresse sans barre finale, `styles.css` ou `images/…` se résolvent dans `/sites-demo/` — la page arrive nue (constaté en
// production le 14/09). Les liens internes d'une démo visent donc `index.html` explicitement : la page garde son dossier.
function liensIndex(html) {
  return html.replace(/\shref="([^"]*)"/g, (tout, v) => {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(v) || /\.(?:css|js|woff2|webp|avif|png|jpg|svg|ico|xml|txt|html)(?:#.*)?$/i.test(v)) return tout
    const [chemin, ancre] = v.split('#')
    const vers = chemin === '' || chemin === './' ? 'index.html' : chemin.endsWith('/') ? `${chemin}index.html` : chemin
    return ` href="${vers}${ancre !== undefined ? '#' + ancre : ''}"`
  })
}

async function generer(metier, options = {}) {
  const dossierSource = path.join(ICI, metier)
  const dossier = options.sortie || dossierSource
  const site = JSON.parse(fs.readFileSync(path.join(dossierSource, 'site.json'), 'utf8'))
  const contenu = JSON.parse(fs.readFileSync(path.join(dossierSource, 'contenu.json'), 'utf8'))
  const remplacementDa = options.da ? JSON.parse(fs.readFileSync(options.da, 'utf8')) : null
  const da = { ...DA.generique, ...(DA[site.metier] || {}), ...(site.da && DA[site.da] ? DA[site.da] : {}), ...(remplacementDa || {}) }
  const famillesActives = options.familles ?? (Array.isArray(da.familles) ? da.familles : [])
  const dossierFamilles = path.join(ICI, '_kit', 'familles')
  const famillesChargees = []
  for (const nom of famillesActives) {
    if (!/^[a-z0-9-]+$/.test(nom)) throw new Error(`${metier} : nom de famille invalide : ${nom}`)
    const css = path.join(dossierFamilles, `${nom}.css`)
    const cssBureau = path.join(dossierFamilles, `${nom}.bureau.css`)
    const js = path.join(dossierFamilles, `${nom}.js`)
    const module = path.join(dossierFamilles, `${nom}.mjs`)
    famillesChargees.push({
      nom,
      css: fs.existsSync(css) ? fs.readFileSync(css, 'utf8') : '',
      cssBureau: fs.existsSync(cssBureau) ? fs.readFileSync(cssBureau, 'utf8') : '',
      js: fs.existsSync(js) ? fs.readFileSync(js, 'utf8') : '',
      crochets: fs.existsSync(module) ? (await import(pathToFileURL(module).href)).default || {} : {},
    })
  }
  let attributions = JSON.parse(fs.readFileSync(path.join(dossierSource, 'attributions.json'), 'utf8'))
  for (const { nom } of famillesChargees) {
    const fichier = path.join(dossierSource, nom, 'attributions.json')
    if (fs.existsSync(fichier)) attributions = attributions.concat(JSON.parse(fs.readFileSync(fichier, 'utf8')))
  }
  const BASE = site.url_base || `https://${metier}.demo.invalid`
  const ville = site.communes[0]
  const tel = site.telephone
  verifierArtisan(site.artisan, metier)
  verifierPlateau(site.plateau, metier)
  // une photo par base (attributions.json porte une ligne par fichier)
  const baseDe = (a) => a.base || String(a.fichier).replace(/^images\//, '').replace(/-(\d+)\.\w+$/, '')
  // `usage: "reserve"` : photos mises de côté (tâche 018-06), pas encore branchées. Elles ne sont ni affichées, ni créditées, ni
  // comptées comme orphelines : la génération échouait sur elles et bloquait la voix et le devis (juge du 14/09, 22 h 06).
  const attributionsPhotos = attributions.filter((a) => !['video', 'rendu'].includes(a.type))
  const photos = [...new Map(attributionsPhotos.filter((a) => a.usage !== 'reserve').map((a) => [baseDe(a), a])).values()]
  for (const p of photos) p.largeurs = [...new Set(attributionsPhotos.filter((x) => baseDe(x) === baseDe(p)).map((x) => Number((/-(\d+)\.(avif|webp)$/.exec(x.fichier) || [])[1])).filter(Boolean))]
    .sort((x, y) => x - y)
  if (!photos.length) throw new Error(`${metier} : aucune photo dans attributions.json`)
  const photoDe = (base, role) => { const p = photos.find((x) => x.base === base); if (!p) throw new Error(`${metier} : photo « ${base} » (${role}) absente d'attributions.json`); for (const l of p.largeurs) for (const ext of ['avif', 'webp']) if (!fs.existsSync(path.join(dossierSource, 'images', `${base}-${l}.${ext}`))) throw new Error(`${metier} : images/${base}-${l}.${ext} manque sur le disque`); return p }
  const heros = da.heros ? photoDe(da.heros, 'héros') : (photos.find((p) => p.base === 'hero') || photos[0])
  const herosMobile = da.herosMobile ? photoDe(da.herosMobile, 'héros mobile') : null
  const galerieAccueil = Array.isArray(da.galerie) ? da.galerie.map((b) => photoDe(b, 'galerie')) : null
  // les galeries des pages intérieures puisent dans la même sélection que l'accueil, sans le héros
  const galerie = (galerieAccueil || photos).filter((p) => p !== heros)
  const auteurs = [...new Set(photos.map((p) => p.auteur))]

  // ── Polices : lues et vérifiées ici, copiées seulement après les garde-fous ──────────────────────────────────
  const familles = [...new Set([da.display, da.texte])]
  const statiques = Array.isArray(da.texteStatiques) && da.texte !== da.display ? da.texteStatiques : null
  // La police de titre en graisses statiques (da.displayStatiques, préchargées : da.displayPrecharge) : la variable unique servait
  // quatre graisses au premier rendu du téléphone, quatre instances à construire (TBT 338 → 213 ms en trace CPU ×4, 15/09 ;
  // scripts/polices-fraunces-statiques.py)
  const statiquesDisplay = Array.isArray(da.displayStatiques) && da.texte !== da.display ? da.displayStatiques : null
  const prechargeDisplay = statiquesDisplay ? (da.displayPrecharge || statiquesDisplay) : null
  const fichiersPolice = []   // { src, nom }
  for (const f of familles) {
    const s = slug(f)
    const noms = f === da.texte && statiques ? statiques.map((w) => `${s}-${w}.woff2`) : f === da.display && statiquesDisplay ? statiquesDisplay.map((w) => `${s}-${w}.woff2`) : [`${s}.woff2`]
    for (const nom of noms) {
      const src = path.join(ICI, '_polices', s, nom)
      if (!fs.existsSync(src) || fs.statSync(src).size < 8000) throw new Error(`police absente ou tronquée : ${src} (node scripts/polices-demo.mjs${statiques ? ' puis python scripts/polices-plex-sous-ensemble.py' : ''}${statiquesDisplay ? ' et python scripts/polices-fraunces-statiques.py' : ''})`)
      fichiersPolice.push({ src, nom })
    }
  }
  fichiersPolice.push({ src: path.join(ICI, '_polices', slug(da.display), 'OFL.txt'), nom: 'OFL.txt' })
  // Ce que les deux graisses de texte savent rendre (scripts/polices-plex-sous-ensemble.py) : un caractère hors couverture sort
  // dans la police du système — le « š » et le « ć » de « Milošević » en Segoe UI dans les crédits (juge, 14/09)
  const fCouverture = statiques ? path.join(ICI, '_polices', slug(da.texte), 'couverture.json') : null
  if (fCouverture && !fs.existsSync(fCouverture)) throw new Error(`${metier} : ${fCouverture} manque (python scripts/polices-plex-sous-ensemble.py)`)
  const couverture = fCouverture ? new Set(JSON.parse(fs.readFileSync(fCouverture, 'utf8')).points) : null
  // La police de titre (l'identité, préchargée) en swap. La police de texte en optional : arrivée après le premier rendu, elle
  // refaisait toute la mise en page (longue tâche de 112 à 196 ms, trace mobile CPU ×4 du 14/09). Mais sans préchargement,
  // elle ratait la fenêtre de 100 ms et le texte sortait en Segoe UI au premier passage (critique du 14/09) : d'où, pour
  // Lestraque, deux graisses statiques en sous-ensemble (~12 Ko chacune), préchargées.
  const faces = familles.map((f) => f === da.texte && statiques
    ? statiques.map((w) => `@font-face{font-family:'${f}';src:url('fonts/${slug(f)}-${w}.woff2') format('woff2');font-weight:${w};font-display:optional}`).join('\n')
    : f === da.display && statiquesDisplay
    ? statiquesDisplay.map((w) => `@font-face{font-family:'${f}';src:url('fonts/${slug(f)}-${w}.woff2') format('woff2');font-weight:${w};font-display:swap}`).join('\n')
    : `@font-face{font-family:'${f}';src:url('fonts/${slug(f)}.woff2') format('woff2');font-weight:100 900;font-display:${f === da.display ? 'swap' : 'optional'}}`).join('\n')
  const tokens = `:root{--accent:${da.accent};--accent-texte:${da.accentTexte};--fond:${da.fond};--fond-2:${da.fond2};--encre:${da.encre};--encre-2:${da.encre2};--ligne:${da.ligne};--rayon:${da.rayon};--police-display:'${da.display}',Georgia,serif;--police-texte:'${da.texte}',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;--graisse-titre:${da.graisse || 700};--graisse-ligne:${da.graisseLigne || da.graisse || 700};--graisse-marque:${da.graisseMarque || 700};--approche-titre:${da.approche || '-0.025em'};--ombre:${da.ombre || '0 30px 60px -28px rgba(20,25,35,.35)'};--grain:${da.grain || '.12'};--grain-mode:${da.grainMode || 'multiply'}${da.motif ? `;--motif:${da.motif}` : ''}}
.mono{color:var(--accent-texte)}
${da.casse ? `h1,h2{text-transform:${da.casse};letter-spacing:.01em}` : ''}
${da.display === da.texte ? '' : `body{font-feature-settings:"kern"}`}`
  // les URL de polices sont relatives à styles.css, qui est à la racine du site : « fonts/… » vaut depuis toute page
  // styles.css bloque le rendu : les commentaires du kit (le « pourquoi » de chaque règle, un bon quart du fichier) restent dans
  // _kit/kit.css et ne partent pas en ligne. Le h1 est l'élément LCP du téléphone, peint après styles.css (Lighthouse, 14/09).
  const sansCommentaires = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{2,}/g, '\n').trim()
  const cssFamilles = famillesChargees.map((famille) => sansCommentaires(famille.css)).filter(Boolean)
  const cssBureauFamilles = famillesChargees.map((famille) => sansCommentaires(famille.cssBureau)).filter(Boolean)
  const bureauCss = cssBureauFamilles.length ? `${cssBureauFamilles.join('\n')}\n` : null
  const stylesCss = `/* ${site.nom} — direction artistique « ${da.label} » (cerveau site v2, ${AUJOURDHUI}) — source commentée : _kit/kit.css */\n${faces}\n${tokens}\n${sansCommentaires(KIT_CSS)}\n${cssFamilles.length ? `${cssFamilles.join('\n')}\n` : ''}`
  if (/ui-monospace|Consolas|SFMono/.test(stylesCss)) throw new Error(`${metier} : styles.css renvoie encore à une pile monospace du système`)

  let pageCourante = null
  const contexte = (rel) => ({ metier, da, site, contenu, rel, photoDe, esc, page: pageCourante })
  const crochetDernier = (nom, valeur, args, rel) => {
    for (const famille of famillesChargees) {
      const crochet = famille.crochets[nom]
      if (typeof crochet === 'function') valeur = crochet(...args, contexte(rel))
    }
    return valeur
  }
  const crochetConcatene = (nom, args, rel) => famillesChargees.map((famille) => {
    const crochet = famille.crochets[nom]
    return typeof crochet === 'function' ? crochet(...args, contexte(rel)) : ''
  }).filter((html) => html != null).join('')
  const crochetsCredits = (entrees, rel) => {
    let resultat = entrees
    for (const famille of famillesChargees) {
      const crochet = famille.crochets.credits
      if (typeof crochet === 'function') resultat = crochet(resultat, contexte(rel))
      if (!Array.isArray(resultat)) throw new Error(`${metier} : le crochet credits de « ${famille.nom} » doit renvoyer une liste`)
    }
    return resultat
  }

  // ── La marque : un monogramme tiré de la police de titre (nav, pied de page, favicon) ─────────────────────────
  let marque = '<i></i>', favicon = null
  if (da.monogramme) {
    const f = path.join(ICI, '_kit', 'monogrammes', `${da.monogramme}.json`)
    if (!fs.existsSync(f)) throw new Error(`${metier} : monogramme absent (python scripts/monogramme-demo.py ${da.monogramme} ${site.nom.replace(/^Atelier\s+/i, '')[0]} ${slug(da.display)} 600)`)
    const m = JSON.parse(fs.readFileSync(f, 'utf8'))
    const S = Math.round(Math.max(m.largeur, m.hauteur) * 1.62), tx = ((S - m.largeur) / 2).toFixed(1), ty = ((S - m.hauteur) / 2).toFixed(1)
    const glyphe = `<path transform="translate(${tx} ${ty})" d="${m.d}"/>`
    marque = `<svg class="marque" viewBox="0 0 ${S} ${S}" aria-hidden="true"><circle cx="${S / 2}" cy="${S / 2}" r="${(S / 2 - S * 0.025).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="${(S * 0.035).toFixed(1)}"/><g fill="currentColor">${glyphe}</g></svg>`
    favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}"><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}" fill="#14110E"/><g fill="#E9D6B8">${glyphe}</g></svg>\n`
    if (Buffer.byteLength(favicon) > 1500) throw new Error(`${metier} : favicon.svg de ${Buffer.byteLength(favicon)} octets (1,5 Ko au plus)`)
  }

  const pages = site.pages
  const communes = site.communes
  const pageDe = (commune) => pages.find((p) => p.type === 'commune' && p.cible === commune)
  const prestationsTitres = (() => { const s = contenu.pages['/']?.sections.find((x) => genreDe(x) === 'prestations'); return s ? decouper(s.blocs).items.map((i) => i.titre) : [] })()

  function tete(page, rel, { titre, description, image, bandeau = null }) {
    const url = BASE + page.chemin
    const ld = (contenu.pages[page.chemin]?.jsonld?.[0] || contenu.pages['/']?.jsonld?.[0])
    const ldPage = ld ? { ...ld, url, telephone: tel, image: BASE + '/images/' + heros.base + '-1600.webp' } : null
    const precharges = [
      ...(prechargeDisplay ? prechargeDisplay.map((w) => `${slug(da.display)}-${w}`) : [slug(da.display)]).map((n) => `<link rel="preload" href="${rel}fonts/${n}.woff2" as="font" type="font/woff2" crossorigin>`),
      ...(statiques ? statiques.map((w) => `<link rel="preload" href="${rel}fonts/${slug(da.texte)}-${w}.woff2" as="font" type="font/woff2" crossorigin>`) : []),
    ]
    if (page.type === 'accueil' && da.hero === 'plein') {
      if (herosMobile) precharges.push(`<link rel="preload" as="image" type="image/avif" media="${MEDIA_MOBILE}" imagesrcset="${srcsetDe(herosMobile, rel, 'avif')}" imagesizes="${SIZES_HEROS_MOBILE}">`)
      precharges.push(`<link rel="preload" as="image" type="image/avif"${herosMobile ? ' media="(min-width: 768px)"' : ''} imagesrcset="${srcsetDe(heros, rel, 'avif')}" imagesizes="${SIZES_HEROS}" fetchpriority="high">`)
    } else if (bandeau) {
      // le bandeau d'une page commune : préchargé en priorité haute au bureau seulement ; au téléphone (plein écran, kit.css v25), l'élément
      // LCP est le titre, et l'image n'a ni priorité haute ni chargement paresseux (site-qa exige un héros non paresseux)
      precharges.push(`<link rel="preload" as="image" type="image/avif" media="(min-width: 768px)" imagesrcset="${srcsetDe(bandeau, rel, 'avif')}" imagesizes="100vw" fetchpriority="high">`)
    } else if (page.type === 'accueil') precharges.push(`<link rel="preload" as="image" type="image/avif" imagesrcset="${srcsetDe(heros, rel, 'avif')}" imagesizes="${da.hero === 'aplat' ? '(max-width: 960px) calc(100vw - 2.5rem), 50vw' : '(max-width: 960px) calc(100vw - 2.5rem), 45vw'}" fetchpriority="high">`)
    // UNE liste d'entrées pour la nav de bureau et le panneau du téléphone ; « Accueil » seulement hors de l'accueil. Le devis vise
    // le formulaire de la page quand elle en a un (accueil, communes), celui de l'accueil sinon (pages légales)
    const liens = [['prestations', 'Prestations'], ['realisations', 'Réalisations'], ['communes', 'Communes'], ['questions', 'Questions']].map(([id, t]) => `<a href="${rel}#${id}">${t}</a>`).join('')
    const versContact = page.type === 'legal' ? `${rel}#contact` : '#contact'
    const navClaire = da.hero === 'plein' ? page.type === 'accueil' || page.type === 'commune' : page.type === 'accueil' && da.hero === 'aplat'
    return `<!doctype html>
<html lang="fr" class="no-js${da.texture === 'grain' ? ' texture--grain' : da.texture === 'papier' ? ' texture--papier' : ''}${da.raccords ? ' da--raccords' : ''}${da.etapesMonumentales ? ' da--etapes' : ''}${da.communesMonumentales ? ' da--communes' : ''}${da.navRetenue ? ' da--nav-retenue' : ''}${da.signature ? ' da--signature' : ''}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="${da.hero === 'plein' && page.type === 'accueil' ? '#0E0A07' : da.fond}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${BASE}/images/${(image || heros).base}-1600.webp">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="fr_FR">
${favicon ? `<link rel="icon" href="${rel}favicon.svg" type="image/svg+xml">\n` : ''}${precharges.join('\n')}
<link rel="stylesheet" href="${rel}styles.css">
${bureauCss ? `<link rel="stylesheet" href="${rel}bureau.css" media="(min-width: 1024px)">\n` : ''}<script>document.documentElement.classList.replace('no-js','js')</script>
<script src="${rel}site.js" defer></script>
${ldPage ? `<script type="application/ld+json">${JSON.stringify(ldPage)}</script>` : ''}
</head>
<body>
<header class="nav${navClaire ? ' nav--claire' : ''}"><div class="conteneur nav__inner">
<a class="nav__marque" href="${rel || './'}">${marque}<span>${esc(site.nom)}</span></a>
<nav class="nav__liens" aria-label="Sections">${liens}</nav>
<div class="nav__droite"><a class="nav__tel" href="${telHref(tel)}">${telAffiche(tel)}</a>${site.devis ? `<a class="nav__devis" href="${versContact}">Devis</a>` : ''}<button class="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="panneau"><span></span><span></span></button></div>
</div></header>
<div class="voile" aria-hidden="true"></div>
<div class="panneau" id="panneau">
<nav aria-label="Menu">${page.type === 'accueil' ? '' : `<a href="${rel || './'}">Accueil</a>`}${liens}${pages.filter((p) => p.type === 'metier').map((p) => `<a href="${rel}${p.chemin.slice(1)}">${esc(p.cible)}</a>`).join('')}<a href="${versContact}">Contact</a></nav>
<div class="panneau__bas"><span>${communes.map((c) => { const p = pageDe(c); return p ? `<a href="${rel}${p.chemin.slice(1)}">${esc(c)}</a>` : esc(c) }).join(' · ')}</span></div>
<div><a class="bouton" href="${versContact}">Demander un devis <span class="bouton__cercle">${FLECHE}</span></a></div>
</div>
<main>`
  }

  // nuit : le pied continue le noir du contact (pages à formulaire) ; les pages légales gardent le papier
  function pied(rel, nuit = false) {
    return `</main>
<footer class="pied${nuit ? ' pied--nuit' : ''}"><div class="conteneur">
<div class="pied__grille">
<div><div class="nav__marque" style="margin-bottom:.75rem">${marque}<span>${esc(site.nom)}</span></div><p>${esc(da.label)} à ${esc(ville)} · <a href="${telHref(tel)}">${telAffiche(tel)}</a></p><p>SIREN ${esc(site.siren)} · Assurance décennale ${esc(site.decennale.assureur)} n° ${esc(site.decennale.numero)}</p></div>
<div><p class="pied__titre">Communes servies</p><ul>${communes.map((c) => { const p = pageDe(c); return `<li>${p ? `<a href="${rel}${p.chemin.slice(1)}">${esc(c)}</a>` : esc(c)}</li>` }).join('')}</ul></div>
<div><p class="pied__titre">Le site</p><ul><li><a href="${rel || './'}">Accueil</a></li>${pages.filter((p) => p.type === 'metier').map((p) => `<li><a href="${rel}${p.chemin.slice(1)}">${esc(p.cible)}</a></li>`).join('')}<li><a href="${rel}mentions-legales/">Mentions légales</a></li><li><a href="${rel}confidentialite/">Confidentialité</a></li></ul></div>
</div>
<div class="pied__bas"><span>© ${AUJOURDHUI.slice(0, 4)} ${esc(site.nom)}</span>${site.demo ? '<span>Site de démonstration — entreprise fictive, photos sous licence libre (voir les mentions légales)</span>' : ''}</div>
</div></footer>
</body>
</html>
`
  }

  // scene : un h2 de scène clé, à 7-8 vw, sorti de la colonne de 840 px (priorité 5)
  const entete = (kicker, h2, intro, i = 0, scene = false) => `<div class="entete${scene ? ' entete--scene' : ''} reveal" style="--i:${i}"><span class="mono">${esc(kicker)}</span><h2${scene ? ' class="h2--scene"' : ''}>${esc(h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`
  const cartes = (items, depart = 0) => `<div class="cartes">${items.map((it, i) => `<article class="carte reveal" style="--i:${(i % 3) + 1}"><span class="mono">${String(depart + i + 1).padStart(2, '0')}</span><h3>${esc(it.titre)}</h3>${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}</article>`).join('')}</div>`
  // Les prestations : une liste éditoriale pleine largeur (grand numéro, titre, filet, texte) — plus de cartes bordées en 3×2
  const prestaListe = (items) => `<ol class="presta">${items.map((it, i) => `<li class="presta__ligne reveal"><span class="presta__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3>${esc(it.titre)}</h3><div class="presta__texte">${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}</div></li>`).join('')}</ol>`
  // une scène sombre ou noire fait passer la nav en noir translucide (kit.js)
  const nuit = (classe) => (/section--(?:sombre|noir)\b/.test(classe) ? ' data-nav="sombre"' : '')
  // les h2 des scènes (da.scenes) en mots masqués : ils se lèvent au défilement sur bureau (kit.css v26)
  const titreScene = (t) => (da.scenes ? masque(t) : esc(t))
  const classeDe = (g, alt) => `section${da.sombre === g ? ' section--sombre' : (da.noires || []).includes(g) ? ' section--noir' : alt && !da.sansAlt ? ' section--alt' : ''}`
  // Les crédits : dans chaque légende (défaut), ou — da.creditsGroupes — sur UNE ligne sous la galerie (auteurs, licences, lien
  // vers le détail des mentions légales, où chaque photo a sa page source, son acte de licence et ses modifications). Une photo
  // étalonnée ou recadrée (attributions.json → modifiee) est dite « modifiée » ; une CC BY-SA modifiée est une adaptation.
  const creditsLigne = (liste, rel) => {
    const groupes = new Map()
    for (const a of liste) { const k = `${a.auteur}|${a.licence}`; const g = groupes.get(k) || { a, modif: false }; g.modif = g.modif || estModifiee(a); groupes.set(k, g) }
    const toutes = liste.every(estModifiee), aucune = !liste.some(estModifiee)
    const items = [...groupes.values()].map(({ a, modif }) => `${esc(a.auteur)} (${esc(a.licence)}${modif && partageIdentique(a.licence) ? ', adaptation sous la même licence' : modif && !toutes ? ', modifiée' : ''})`)
    const mention = aucune ? 'redimensionnées pour le web' : toutes ? 'toutes modifiées pour ce site (étalonnées, parfois recadrées) et redimensionnées pour le web' : 'redimensionnées pour le web ; celles dites « modifiée » ont aussi été étalonnées ou recadrées'
    return `<p class="galerie__credits">Photographies : ${items.join(', ')} — ${mention}. <a href="${rel}mentions-legales/#credits">Sources, licences et modifications</a></p>`
  }
  // autresCredits : les photos de la page hors galerie (le bandeau d'une page commune), créditées sur la même ligne
  // La case suit l'orientation de la photo : une photo en hauteur prend la 2e place (case 4:5), jamais une case 3:2 où la
  // penderie ne montrait plus qu'un panneau nu (page Rennes, 14/09)
  const enPortrait = (a) => Number(a.hauteur) > Number(a.largeur)
  const ordonner = (liste) => { const l = [...liste]; const k = l.findIndex(enPortrait); if (k >= 0 && k !== 1 && l.length >= 2) l.splice(1, 0, ...l.splice(k, 1)); return l }
  const galerieHtml = (liste, rel, eagerPremier = false, autresCredits = []) => `<div class="galerie">${ordonner(liste).map((a, i) => `<figure class="galerie__item${enPortrait(a) ? ' galerie__item--portrait' : ''} reveal" style="--i:${i % 2}"><div class="galerie__cadre">${photo(a, rel, { eager: eagerPremier && i === 0, sizes: '(max-width: 899px) 90vw, 55vw' })}</div><figcaption><span class="galerie__n">${String(i + 1).padStart(2, '0')}</span><span>${esc(a.legende)}</span>${da.creditsGroupes ? '' : `<small>Photo ${esc(a.auteur)} · ${esc(a.licence)}${estModifiee(a) ? ' · modifiée' : ''}</small>`}</figcaption></figure>`).join('')}</div>${da.creditsGroupes ? creditsLigne([...new Set([...autresCredits, ...liste])], rel) : ''}`
  // plus d'étiquette <small> « Menuisier à X » à côté du nom : au survol, le nom glissait dessus (« RennesMenuisier à Rennes »)
  const communesHtml = (liste, rel, sauf) => `<div class="communes">${liste.filter((c) => c !== sauf).map((c) => { const p = pageDe(c); return p ? `<a class="commune reveal" href="${rel}${p.chemin.slice(1)}"><span>${esc(c)}</span>${FLECHE}</a>` : `<span class="commune reveal"><span>${esc(c)}</span></span>` }).join('')}</div>`
  // Les étapes : au moins deux, sinon la génération échoue. da.etapesMonumentales : un grand numéro par étape, qui s'allume
  // quand la ligne --avancee (kit.js) atteint son seuil --k (le haut de l'étape, en fraction de la liste).
  const etapesHtml = (s, intro, items, classe, id, ou, rel = '') => {
    if (items.length < 2) throw new Error(`${ou} : la section étapes « ${s.h2} » n'a que ${items.length} étape(s) lisible(s), 2 au moins attendues`)
    const lis = items.map((it, i) => {
      const nn = String(i + 1).padStart(2, '0'), corps = `<h3>${esc(it.titre)}</h3>${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}`
      return da.etapesMonumentales ? `<li class="etape" style="--k:${((i + 0.15) / items.length).toFixed(3)};--e:${i};--ne:${items.length}"><span class="etape__num" aria-hidden="true">${nn}</span><div class="etape__corps">${corps}</div></li>` : `<li class="etape"><span class="mono">Étape ${nn}</span>${corps}</li>`
    }).join('')
    const surtitre = da.scenes ? kicker('etapes', 'Comment ça se passe') : '<span class="mono">Comment ça se passe</span>'
    // da.etapesPhoto : une photo sous le titre (colonne collante sur bureau, pleine largeur au téléphone)
    const ep = da.etapesPhoto ? photoDe(da.etapesPhoto, 'photo des étapes') : null
    const photoEtapes = ep ? `<div class="etapes__photo">${photo(ep, rel, { sizes: '(max-width: 959px) 100vw, 30rem' })}</div>` : ''
    const mediaFamille = crochetDernier('etapesMedia', null, [], rel)
    return `<section class="${classe}"${id ? ` id="${id}"` : ''}${nuit(classe)}><div class="conteneur"><div class="etapes"><div class="etapes__tete reveal">${surtitre}<h2>${titreScene(s.h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}${mediaFamille ?? photoEtapes}</div><ol class="etapes__liste">${lis}</ol>${da.etapesMonumentales ? '<div class="etapes__jauge" aria-hidden="true"><span></span></div>' : ''}</div></div></section>`
  }

  // ── Les scènes (da.scenes, priorité 8) : un gabarit par genre de section au lieu d'entete() + cartes() partout ─────────
  // Deux fonds seulement, le papier et le noir chaud, plus la photo ; le surtitre ne reste que sur les scènes de da.kickers.
  const kicker = (g, texte) => ((da.kickers || []).includes(g) ? `<span class="mono">${esc(texte)}</span>` : '')
  // la vignette d'une prestation : la première clé de da.prestationsPhotos contenue dans le h3 (« escalier », « parquet »…)
  // une entrée de prestationsPhotos : le nom de base, ou { base, position } pour cadrer l'affichage
  const refPhoto = (v) => (typeof v === 'string' ? { base: v, position: null } : { base: v?.base, position: v?.position || null })
  const vignetteDe = (titre) => { const k = Object.keys(da.prestationsPhotos || {}).find((x) => slug(titre).includes(x)); if (!k) return null; const r = refPhoto(da.prestationsPhotos[k]); return { p: photoDe(r.base, `vignette de « ${titre} »`), position: r.position } }
  const vignettesAccueil = () => Object.values(da.prestationsPhotos || {}).map((v) => photoDe(refPhoto(v).base, 'vignette de prestation'))
  // Les prestations : numéro, titre, filet, texte ; sur bureau à la souris, la photo de l'ouvrage s'ouvre à côté du numéro au survol
  // (chargée seulement là : display:none ailleurs + loading=lazy) ; au téléphone, un rail aimanté (kit.css)
  const prestaScene = (s, intro, items, rel, id) => `<section class="scene scene--papier scene--presta"${id ? ` id="${id}"` : ''}><div class="scene-large"><div class="scene__tete scene__tete--deux reveal">${kicker('prestations', 'Prestations')}<h2 class="h2--scene">${titreScene(s.h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}</div><ol class="presta">${items.map((it, i) => {
    const v = vignetteDe(it.titre)
    return `<li class="presta__ligne reveal" style="--i:${Math.min(i, 2)}"><span class="presta__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3>${esc(it.titre)}</h3><div class="presta__texte">${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}</div>${v ? `<div class="presta__vignette" aria-hidden="true" data-nav="sombre">${photo(v.p, rel, { sizes: '(max-width: 767px) 80vw, 11rem', position: v.position })}</div>` : ''}</li>`
  }).join('')}</ol><div class="presta__jauge" aria-hidden="true"><span></span></div></div></section>`
  // La bande plein cadre « Dans l’atelier » : les mains, une phrase de l'artisan, la légende de la photo
  const atelierScene = (s, intro, rel) => {
    if (!da.atelier) throw new Error(`${metier} : section « ${s.h2} » (atelier) sans photo (da.json → atelier)`)
    const a = photoDe(da.atelier, 'bande « Dans l’atelier »'), m = da.atelierMobile ? photoDe(da.atelierMobile, 'bande « Dans l’atelier », téléphone') : null
    // au téléphone, le 9:16 couvre 100svh : sa largeur affichée vaut 56,25 % de la hauteur quand l'écran est plus étroit que 9:16
    return `<section class="scene atelier" id="atelier" data-nav="sombre"><div class="atelier__media">${photoHeros(a, m, rel, { lazy: true, sizesMobile: '(max-aspect-ratio: 9/16) 56.25vh, 100vw' })}</div><div class="atelier__contenu"><h2 class="atelier__titre reveal">${titreScene(s.h2)}</h2>${intro.map((p) => `<p class="atelier__phrase reveal" style="--i:2">${crochetDernier('atelierPhrase', esc(p), [p], rel)}</p>`).join('')}<p class="atelier__legende">${esc(a.legende)}</p></div></section>`
  }
  // Les réalisations sur noir : chaque photo est son propre .reveal ; à l'accueil, un travelling épinglé (kit.css, bureau et
  // view() seulement) avec un compteur 01/05 lié à la position ; ailleurs, une rangée de trois ouvrages
  const galerieScene = (s, intro, liste, rel, autres, { id = '', travelling = true } = {}) => {
    const n = liste.length
    const items = liste.map((a, i) => `<figure class="galerie__item${enPortrait(a) ? ' galerie__item--portrait' : ''} reveal" style="--i:${i}"><div class="galerie__cadre">${photo(a, rel, { sizes: travelling ? '(max-width: 767px) 85vw, (max-width: 1023px) 58vw, 56vw' : '(max-width: 767px) 85vw, 32vw' })}</div><figcaption><span class="galerie__n">${String(i + 1).padStart(2, '0')}</span><span>${esc(a.legende)}</span></figcaption></figure>`).join('')
    const nn = (k) => String(k).padStart(2, '0')
    const compteur = travelling ? `<p class="compteur" aria-hidden="true"><span class="compteur__fenetre"><span class="compteur__piste" style="--n:${n}">${liste.map((_, i) => `<span>${nn(i + 1)}</span>`).join('')}</span></span><span class="compteur__total">/ ${nn(n)}</span></p>` : ''
    const tete = `<div class="scene__tete galerie__tete reveal"><div>${kicker('galerie', 'Réalisations')}<h2 class="h2--scene">${titreScene(s.h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}</div>${compteur}</div>`
    const credits = da.creditsGroupes ? creditsLigne([...new Set([...autres, ...liste])], rel) : ''
    // la jauge du rail au téléphone (kit.css : affichée seulement sous 768 px, avec scroll-timeline)
    const jauge = '<div class="galerie__jauge" aria-hidden="true"><span></span></div>'
    const debut =`<section class="section section--noir scene--galerie"${id ? ` id="${id}"` : ''} data-nav="sombre">`
    // les crédits DANS le bloc épinglé : la section s'arrête avec le travelling (3,3 écrans de noir avec les crédits en dessous,
    // juge du 14/09 ; 250svh au plus aujourd'hui)
    return travelling
      ? `${debut}<div class="travelling" style="--n:${n}"><div class="travelling__epingle"><div class="scene-large">${tete}</div><div class="travelling__fenetre"><div class="galerie galerie--scene">${items}</div>${jauge}</div><div class="scene-large travelling__credits">${credits}</div></div></div></section>`
      : `${debut}<div class="scene-large">${tete}<div class="galerie galerie--scene galerie--rangee">${items}</div>${jauge}${credits}</div></section>`
  }
  const communesScene = (s, intro, liste, rel, sauf, retour) => `<section class="scene scene--papier scene--communes" id="communes"><div class="conteneur"><div class="scene__tete scene__tete--deux reveal">${kicker('communes', 'Zone d’intervention')}<h2>${titreScene(s.h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}</div></div>${communesHtml(liste, rel, sauf)}${retour ? `<div class="conteneur"><p class="retour"><a href="${rel}">${FLECHE}Retour à l’accueil</a></p></div>` : ''}</section>`
  // Les questions en deux colonnes : le titre à gauche, les questions à droite (accordéon, une seule ouverte : kit.js)
  // da.faqPhoto : une photo sous le titre (la colonne de gauche était un grand vide de papier à 1440, juge du 14/09) ; la première
  // question est ouverte d'emblée, les deux colonnes s'équilibrent
  // Vague 3, 2e tour : la photo n'est plus sous le titre mais sa voisine de grille (colonne de gauche, 2e rangée), et l'introduction
  // ouvre la colonne des questions — la colonne du titre, plus haute que la liste, laissait du papier vide en bas à droite (juge du 14/09)
  const faqScene = (s, intro, items, id, rel = '') => `<section class="scene scene--papier scene--faq"${id ? ` id="${id}"` : ''}><div class="scene-large faq-scene"><div class="faq-scene__tete reveal">${kicker('faq', 'Questions fréquentes')}<h2>${titreScene(s.h2)}</h2></div>${da.faqPhoto ? `<div class="faq-scene__photo" data-nav="sombre">${photo(photoDe(da.faqPhoto, 'photo des questions'), rel, { sizes: '(max-width: 959px) 100vw, 36vw' })}</div>` : ''}<div class="faq-scene__droite">${intro.map((p) => `<p class="faq-scene__intro reveal">${esc(p)}</p>`).join('')}<div class="faq reveal">${items.map((it) => `<details><summary>${esc(it.titre)}</summary><div class="faq__corps">${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}</div></details>`).join('')}</div></div></div></section>`
  // Le formulaire de devis (site.json → devis) : « Demander un devis » menait à une carte sans formulaire, qui n'offrait qu'un
  // lien tel: (critique et juge du 14/09). Sur une démo, rien ne part : kit.js montre l'état « demande reçue » et le dit.
  const formDevis = (cible) => {
    const dv = site.devis
    if (!dv) return ''
    const options = (l, choisi) => l.map((x) => `<option${x === choisi ? ' selected' : ''}>${esc(x)}</option>`).join('')
    return `<div class="devis"><form class="devis__form"${site.demo ? ' data-demo' : ''} method="post" action="#contact" aria-label="Demande de devis">`
      + `<div class="devis__champ"><label for="devis-projet">Votre projet</label><select id="devis-projet" name="projet" required><option value="">Choisir</option>${options(dv.projets)}</select></div>`
      + `<div class="devis__champ"><label for="devis-commune">Commune</label><select id="devis-commune" name="commune">${options([...communes, 'Autre commune'], cible)}</select></div>`
      + `<div class="devis__champ"><label for="devis-delai">Quand</label><select id="devis-delai" name="delai">${options(dv.delais)}</select></div>`
      + `<div class="devis__champ devis__champ--large"><label for="devis-message">La pièce, l’usage, le bois</label><textarea id="devis-message" name="message" rows="3"></textarea></div>`
      + `<div class="devis__champ devis__champ--large"><label for="devis-contact">Téléphone ou e-mail</label><input id="devis-contact" name="contact" type="text" autocomplete="tel" required></div>`
      + `<div class="devis__envoi"><button class="bouton" type="submit">Envoyer ma demande <span class="bouton__cercle">${FLECHE}</span></button>${site.demo ? '<p class="devis__note">Démonstration : rien n’est envoyé.</p>' : ''}</div></form>`
      + merciDevis(dv, cible)
  }
  // Après l'envoi : ce qui a été demandé (kit.js le recopie depuis le formulaire, sans rien stocker), puis la suite du chantier
  // (les étapes de l'accueil après la prise de contact) — la colonne restait presque vide sur un halo (juge du 14/09)
  const merciDevis = (dv, cible) => {
    const s = contenu.pages['/']?.sections.find((x) => genreDe(x) === 'etapes')
    const suite = s ? analyser(s).items.slice(1) : []
    const suiteHtml = suite.length ? `<p class="devis__suite-titre">La suite</p><ol class="devis__suite">${suite.map((it, i) => `<li><span aria-hidden="true">${String(i + 2).padStart(2, '0')}</span><div><strong>${esc(it.titre)}</strong>${it.textes[0] ? `<p>${esc(it.textes[0])}</p>` : ''}</div></li>`).join('')}</ol>` : ''
    // la mention de démonstration juste sous « Demande reçue. » : en bas de la confirmation, elle tombait sous la ligne de
    // flottaison au téléphone (juge du 14/09)
    return `<div class="devis__merci" hidden tabindex="-1" role="status"><p class="devis__merci-titre">Demande reçue.</p>${site.demo ? '<p class="devis__note devis__note--merci">Démonstration : aucune donnée n’a été envoyée.</p>' : ''}<p class="devis__merci-rappel">${esc(dv.rappel)}</p>`
      + `<dl class="devis__recap"><div><dt>Projet</dt><dd data-champ="projet">À préciser à la visite</dd></div><div><dt>Commune</dt><dd data-champ="commune">${esc(cible)}</dd></div><div><dt>Quand</dt><dd data-champ="delai">${esc(dv.delais[0])}</dd></div></dl>`
      + `${suiteHtml}<button class="devis__encore" type="button">Faire une autre demande</button></div></div>`
  }
  // Le contact : le formulaire, et le numéro en lien secondaire (UNE fois) ; SIREN et assureur n'y sont plus (pied de page et
  // mentions légales seulement, priorité 4). Sans site.devis, l'ancien bouton d'appel.
  // fond (scènes) : { a, m } — la photo de la page assombrie sous le plateau (le héros et son portrait à l'accueil, le bandeau sur
  // une page commune), avec exactement les sources et le sizes de l'image du haut : servie depuis le cache du navigateur
  const bande = (intro, infos, rel, cible, fond = null) => {
    const form = formDevis(cible)
    // une info peut tenir sur deux lignes (v2) : « Lundi–vendredi, 8 h–18 h » puis « Intervention sur rendez-vous » — collées
    // dans le même paragraphe, elles se lisaient d'une traite (juge du 14/09)
    const infosHtml = `<div class="bande__infos">${infos.map((x) => `<div><strong>${esc(x.k)}</strong> ${x.href ? `<a href="${x.href}">${esc(x.v)}</a>` : `<span class="bande__ligne">${esc(x.v)}</span>`}${x.v2 ? ` <span class="bande__ligne">${esc(x.v2)}</span>` : ''}</div>`).join('')}</div>`
    const appel = form ? `<p class="bande__tel">Ou par téléphone : <a href="${telHref(tel)}">${telAffiche(tel)}</a></p>` : `<div class="hero__actions" style="margin-top:2rem"><a class="bouton" href="${telHref(tel)}">${telAffiche(tel)} <span class="bouton__cercle">${FLECHE}</span></a></div>`
    // au téléphone, le contact est haut (≈ 2 écrans) : une photo en largeur y est affichée à ≈ 2 fois la largeur de l'écran
    const media = fond ? `<div class="contact__media" aria-hidden="true">${fond.hero ? photoHeros(fond.a, fond.m, rel, { lazy: true }) : photo(fond.a, rel, { sizes: '(max-width: 899px) 200vw, 100vw', position: fond.position })}</div>` : ''
    const classes = `contact${fond ? ' contact--photo' : ''}${fond?.matiere ? ' contact--matiere' : ''}${fond && intro.titre.length > 26 ? ' contact--long' : ''}`
    const surtitre = da.scenes ? kicker('contact', 'Contact') : '<span class="mono">Contact</span>'
    // avec un formulaire : un plateau noir pleine largeur, dans l'ordre du pouce (titre, formulaire, numéro et infos)
    if (form) return `<section class="${classes}" id="contact" data-nav="sombre">${media}<div class="contact__inner"><div class="contact__tete reveal">${surtitre}<h2>${titreScene(intro.titre)}</h2>${intro.textes.map((t) => `<p>${esc(t)}</p>`).join('')}</div>${form}<div class="contact__infos">${appel}${infosHtml}</div></div></section>`
    return `<section class="section" id="contact"><div class="conteneur"><div class="bande${form ? ' bande--devis' : ''} reveal"><div><span class="mono">Contact</span><h2 style="margin-top:1rem">${esc(intro.titre)}</h2>${intro.textes.map((t) => `<p style="margin-top:1rem;opacity:.85">${esc(t)}</p>`).join('')}${appel}${form ? infosHtml : ''}</div>${form || infosHtml}</div></div></section>`
  }
  const infosContact = (textes) => {
    const out = []
    for (const t of textes) {
      if (/\b\d{5}\b/.test(t) && /rue|avenue|chemin|place|boulevard|allée|route|impasse/i.test(t)) out.push({ k: 'Adresse', v: t })
      else if (/lundi|mardi|samedi|\d\s?h/i.test(t) && t.length < 90) out.push({ k: 'Horaires', v: t })
      else if (/sur rendez-vous/i.test(t) && t.length < 60 && out.some((x) => x.k === 'Horaires' && !x.v2)) out.find((x) => x.k === 'Horaires').v2 = t
      else if (/@/.test(t)) out.push({ k: 'Email', v: t })
    }
    out.push({ k: 'Intervention', v: communes.join(', ') })
    return out
  }
  // le texte d'une section contact : son introduction (hors adresse et horaires) ; ses items (h3 : adresse, téléphone,
  // disponibilités, assurance) nourrissent seulement les infos — plus rien n'est imprimé deux fois
  const contactDe = (s, intro, items) => ({ titre: s.h2, textes: intro.filter((t) => !(/\b\d{5}\b/.test(t) && /rue|avenue|chemin|place|boulevard/i.test(t)) && !(/lundi|mardi|samedi/i.test(t) && t.length < 90)), tous: [...intro, ...items.flatMap((it) => it.textes)] })

  // ── Le plateau noir : une phrase de l'artisan, signée, et trois chiffres (site.json → plateau) ─────────────────
  const plateauHtml = () => {
    const p = site.plateau
    if (!p) return ''
    // da.plateauPhoto : des mains au travail à côté de « c’est la même main qui travaille » — au téléphone, l'écran sous le héros
    // n'était qu'une phrase et trois chiffres, sans aucune image (juge du 14/09, priorité 10)
    const ph = da.plateauPhoto ? photoDe(da.plateauPhoto, 'photo du plateau') : null
    const photoPlateau = ph ? `<div class="plateau__photo reveal" style="--i:1">${photo(ph, '', { sizes: '(max-width: 767px) 100vw, 40vw' })}</div>` : ''
    return `<section class="plateau" data-nav="sombre" aria-label="L’atelier en bref"><div class="plateau__inner"><div class="plateau__haut"><figure class="plateau__citation reveal"><blockquote><p>${crochetDernier('plateauCitation', esc(site.artisan.citation), [site.artisan.citation], '')}</p></blockquote><figcaption><span class="plateau__signe">${esc(`${site.artisan.prenom} ${site.artisan.nom}`)} · <span>${esc(signatureDe(site.artisan, ville).split(' · ')[1])}</span></span><span class="plateau__parcours">${esc(site.artisan.parcours)}</span></figcaption></figure>${photoPlateau}</div><dl class="chiffres">${p.chiffres.map((x, i) => `<div class="chiffre reveal" style="--i:${i + 1}"><dt>${esc(x.legende)}</dt><dd>${crochetDernier('plateauValeur', `<span class="chiffre__valeur">${esc(x.valeur)}</span>`, [x, i], '')}${x.unite ? `<span class="chiffre__unite">${esc(x.unite)}</span>` : ''}</dd></div>`).join('')}</dl></div></section>`
  }

  // ── L'accueil ────────────────────────────────────────────────────────────────────────────────────────────────
  const attributsRelief = (rel) => {
    if (!da.relief) return ''
    const valeurOuSignature = (cle) => Object.hasOwn(da.relief, cle) ? da.relief[cle] === true : !!da.signature
    let attributs = ` data-relief="${rel}relief.js" data-relief-fil="${rel}relief-fil.js" data-relief-profondeur="${rel}${esc(da.relief.profondeur)}" data-relief-oeil="${da.relief.oeil.join(',')}"`
    if (valeurOuSignature('calme')) attributs += ' data-relief-calme'
    if (valeurOuSignature('lumiereCss')) attributs += ' data-relief-lumiere-css'
    if (da.relief.descente != null) attributs += ` data-relief-descente="${esc(JSON.stringify(da.relief.descente))}"`
    if (da.relief.texture) attributs += ` data-relief-texture="${esc(da.relief.texture)}"`
    return attributs
  }

  function accueil(page) {
    const c = contenu.pages['/']
    const rel = ''
    let heroHtml
    if (da.hero === 'plein') {
      // Une idée monumentale DANS le h1, qui garde le mot-clé en petit (« Menuisier à Rennes ») : le SEO garde son h1, l'œil lit
      // une phrase d'atelier. Plus de rabot, de lentille, de rideau ni de balayage : l'escalier seul, et un seul geste (kit.css).
      if (!c.h1Ligne) throw new Error(`${metier}/ : contenu.json → pages["/"].h1Ligne manque (la ligne display du h1)`)
      // da.relief : le relief WebGL du héros (bureau seulement, chargé par kit.js après load) — la page ne porte que trois attributs
      const relief = attributsRelief(rel)
      heroHtml = `<section class="hero hero--plein" data-nav="sombre"${relief}><div class="hero__media">${photoHeros(heros, herosMobile, rel)}${crochetConcatene('herosMedia', [], rel)}</div><div class="hero__contenu"><h1><span class="h1__cle"><span>${esc(c.h1)}</span></span> <span class="h1__ligne"><span class="h1__ligne-in">${mots(c.h1Ligne)}</span></span></h1><div class="hero__pied"><p class="chapeau">${esc(c.chapeau)}</p><div class="hero__actions"><a class="bouton" href="#contact">Demander un devis <span class="bouton__cercle">${FLECHE}</span></a></div></div></div></section>`
    } else {
      const heroTexte = `<span class="mono entre" style="--d:.3s">${esc(c.kicker || `${da.label} · ${ville}`)}</span><h1>${mots(c.h1)}</h1><p class="chapeau entre" style="--d:1.1s">${esc(c.chapeau)}</p><div class="hero__actions entre" style="--d:1.3s"><a class="bouton" href="#contact">Demander un devis <span class="bouton__cercle">${FLECHE}</span></a></div>`
      if (da.hero === 'aplat') heroHtml = `<section class="hero hero--aplat"><div class="conteneur hero__grille"><div class="hero__contenu">${heroTexte}</div><div class="hero__media entre" style="--d:.9s">${photo(heros, rel, { eager: true, sizes: '(max-width: 960px) calc(100vw - 2.5rem), 50vw' })}</div></div></section>`
      else heroHtml = `<section class="hero hero--scinde"><div class="conteneur hero__grille"><div class="hero__contenu">${heroTexte}</div><div class="hero__cadre entre" style="--d:.9s" data-legende="${esc(heros.legende)}"><div class="hero__media">${photo(heros, rel, { eager: true, sizes: '(max-width: 960px) calc(100vw - 2.5rem), 45vw' })}</div></div></div></section>`
    }

    let corps = '', alt = false, contact = null
    // Les scènes (priorité 8) : héros (photo) · plateau (noir) · prestations (papier) · atelier (photo) · réalisations (noir) ·
    // communes (papier) · étapes (noir) · questions (papier) · contact sur photo, pied intégré — l'ordre est celui de contenu.json,
    // et gardeFousScenes refuse deux voisines sur le même fond
    if (da.scenes) {
      for (const s of c.sections) {
        const { g, intro, items } = analyser(s)
        if (g === 'prestations') corps += prestaScene(s, intro, items, rel, 'prestations')
        else if (g === 'atelier') corps += atelierScene(s, intro, rel)
        else if (g === 'galerie') {
          if (!galerieAccueil || galerieAccueil.length !== 4) throw new Error(`${metier}/ : la galerie des scènes compte ${galerieAccueil?.length ?? 0} photos (4 attendues : grille 8 + 4 puis 6 + 6 sans orpheline)`)
          // « Pièces livrées » promet des ouvrages : des mains sur une planche et un tournage y sont passés (juge du 14/09)
          const horsOuvrages = galerieAccueil.filter((p) => !(da.ouvrages || []).includes(p.base))
          if (horsOuvrages.length) throw new Error(`${metier}/ : la galerie des réalisations montre ${horsOuvrages.map((p) => p.base).join(', ')}, qui n’est pas un ouvrage fini (da.json → ouvrages)`)
          const autres = [heros, herosMobile, da.atelier && photoDe(da.atelier, 'atelier'), da.atelierMobile && photoDe(da.atelierMobile, 'atelier'), ...vignettesAccueil(), ...['plateauPhoto', 'etapesPhoto', 'faqPhoto', 'contactPhoto'].map((k) => da[k] && photoDe(refPhoto(da[k]).base, k))].filter(Boolean)
          corps += galerieScene(s, intro, galerieAccueil, rel, autres, { id: 'realisations' })
        }
        else if (g === 'communes') corps += communesScene(s, intro, communes, rel, null, false)
        else if (g === 'etapes') corps += etapesHtml(s, intro, items, classeDe(g), 'etapes', `${metier}${page.chemin}`)
        else if (g === 'faq') corps += faqScene(s, intro, items, 'questions')
        else if (g === 'contact') contact = contactDe(s, intro, items)
        else throw new Error(`${metier}/ : section « ${s.h2} » (genre ${g}) sans gabarit de scène`)
      }
      if (!contact) contact = { titre: 'Parlons de votre projet', textes: [], tous: [] }
      // da.contactPhoto : le contact sur une autre photo que le héros — l'escalier revenait quatre fois sur l'accueil (juge du 14/09)
      const refContact = da.contactPhoto ? refPhoto(da.contactPhoto) : null
      // matiere : une photo de fond (des boiseries) et non un ouvrage — au téléphone, son bas (le tapis clair) passe sous un voile plus dense
      const fondContact = refContact ? { a: photoDe(refContact.base, 'fond du contact'), position: refContact.position, matiere: true } : { a: heros, m: herosMobile, hero: true }
      // l'ouverture (priorité 9) : le héros et le plateau dans un même parent — sur bureau, le héros reste (sticky) et le plateau
      // noir monte dessus (kit.css v26) ; ailleurs, ce parent n'a aucun style
      const ouverture = da.hero === 'plein' && site.plateau ? `<div class="ouverture">${heroHtml}${plateauHtml()}</div>` : heroHtml + plateauHtml()
      return tete(page, rel, { titre: c.title, description: c.description }) + ouverture + corps + bande(contact, infosContact(contact.tous), rel, ville, fondContact) + pied(rel)
    }
    for (const s of c.sections) {
      const { g, intro, items } = analyser(s)
      const classe = classeDe(g, alt)
      if (g === 'prestations') { corps += `<section class="${classe}" id="prestations"${nuit(classe)}><div class="scene-large">${entete('Prestations', s.h2, intro, 0, true)}${prestaListe(items)}</div></section>`; alt = !alt }
      else if (g === 'engagements') { corps += `<section class="${classe}"><div class="conteneur">${entete('Engagements', s.h2, intro)}${cartes(items)}</div></section>`; alt = !alt }
      // le héros n'est plus dans la galerie : il est crédité sur la même ligne (CC BY-SA, adaptation)
      else if (g === 'galerie') { corps += `<section class="${classe}" id="realisations"${nuit(classe)}><div class="scene-large">${entete('Réalisations', s.h2, intro, 0, true)}${galerieHtml(galerieAccueil || (galerie.length >= 3 ? galerie : photos), rel, false, [heros, herosMobile].filter(Boolean))}</div></section>`; alt = !alt }
      // les items h3/p d'une section communes ne sont plus imprimés sur l'accueil : ils répétaient quatre fois la même phrase
      // « … à X » sous l'en-tête ; le texte propre à chaque commune vit sur sa page /metier-commune/
      else if (g === 'communes') { corps += da.communesMonumentales ? `<section class="${classe}" id="communes"><div class="conteneur">${entete('Zone d’intervention', s.h2, intro)}</div>${communesHtml(communes, rel)}</section>` : `<section class="${classe}" id="communes"><div class="conteneur"><div class="deux"><div>${entete('Zone d’intervention', s.h2, intro)}</div>${communesHtml(communes, rel)}</div></div></section>`; alt = !alt }
      else if (g === 'etapes') { corps += etapesHtml(s, intro, items, classe, 'etapes', `${metier}${page.chemin}`); alt = !alt }
      else if (g === 'faq') { corps += `<section class="${classe}" id="questions"><div class="conteneur">${entete('Questions fréquentes', s.h2, intro)}<div class="faq reveal">${items.map((it) => `<details><summary>${esc(it.titre)}</summary><div class="faq__corps">${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}</div></details>`).join('')}</div></div></section>`; alt = !alt }
      else if (g === 'contact') contact = contactDe(s, intro, items)
      else { corps += `<section class="${classe}"><div class="conteneur"><div class="prose reveal"><h2>${esc(s.h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}${items.map((it) => `<h3>${esc(it.titre)}</h3>${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}`).join('')}</div></div></section>`; alt = !alt }
    }
    if (!contact) contact = { titre: 'Parlons de votre projet', textes: [], tous: [] }
    // sous le héros, directement : le plateau noir (à la place de la bande de mots-clés et des « faits » SIREN / assureur)
    return tete(page, rel, { titre: c.title, description: c.description }) + heroHtml + plateauHtml() + corps + bande(contact, infosContact(contact.tous), rel, ville) + pied(rel)
  }

  // ── Une page intérieure (commune, métier secondaire) ────────────────────────────────────────────────────────
  function interieure(page, index) {
    const c = contenu.pages[page.chemin]
    const rel = '../'.repeat(page.chemin.split('/').filter(Boolean).length)
    const kicker = c.kicker || (page.type === 'commune' ? `Intervention à ${page.cible}` : `${page.cible} · ${ville}`)
    // toutes les autres communes, en liste monumentale (le bloc « deux cases » de deux voisines faisait gabarit, juge du 14/09)
    const voisines = page.type === 'commune' ? communes.filter((x) => x !== page.cible) : communes.slice(0, 3)
    // Une page commune ouvre sur un ouvrage en plein cadre (da.photosCommunes, tournante, jamais un outil seul) et un h1 qui n'est
    // pas celui de l'accueil : le mot-clé en petit, puis sa ligne display (contenu.json → h1Ligne). Avant le 14/09 : un aplat
    // beige sans photo, avec le même h1 « Menuisier à Rennes » que l'accueil (critique, écart 3).
    const bandeaux = page.type === 'commune' && da.hero === 'plein' && c.h1Ligne && Array.isArray(da.photosCommunes) ? da.photosCommunes.map((b) => photoDe(b, 'bandeau de commune')) : []
    const bandeau = bandeaux.length ? bandeaux[index % bandeaux.length] : null
    // 4 photos (ou 2), jamais 3 avec une orpheline dans la grille ; sans le bandeau de la page
    const mesPhotos = (() => { const l = galerie.filter((p) => p !== bandeau); const n = l.length >= 4 ? 4 : l.length >= 2 ? 2 : l.length; return Array.from({ length: n }, (_, k) => l[(index + k) % l.length]) })()
    let corps = bandeau
      ? `<section class="hero hero--plein hero--commune${enPortrait(bandeau) ? ' hero--portrait' : ''}" data-nav="sombre"><div class="hero__media">${photo(bandeau, rel, { eager: 'sans-priorite', sizes: '100vw' })}</div><div class="hero__contenu"><nav class="ariane" aria-label="Fil d’Ariane"><a href="${rel}">Accueil</a><span>/</span><span>${esc(page.cible)}</span></nav><h1><span class="h1__cle"><span>${esc(c.h1)}</span></span> <span class="h1__ligne"><span class="h1__ligne-in">${mots(c.h1Ligne)}</span></span></h1><div class="hero__pied">${c.chapeau ? `<p class="chapeau">${esc(c.chapeau)}</p>` : ''}<div class="hero__actions"><a class="bouton" href="#contact">Demander un devis <span class="bouton__cercle">${FLECHE}</span></a></div></div></div></section>`
      : `<section class="hero hero--page"><div class="conteneur"><div class="hero__contenu"><nav class="ariane entre" style="--d:.2s" aria-label="Fil d’Ariane"><a href="${rel}">Accueil</a><span>/</span><span>${esc(page.cible)}</span></nav><span class="mono entre" style="--d:.3s">${esc(kicker)}</span><h1>${mots(c.h1)}</h1>${c.chapeau ? `<p class="chapeau entre" style="--d:1s">${esc(c.chapeau)}</p>` : ''}<div class="hero__actions entre" style="--d:1.2s"><a class="bouton" href="#contact">Demander un devis <span class="bouton__cercle">${FLECHE}</span></a></div></div></div></section>`
    const creditsBandeau = bandeau ? [bandeau] : []
    // Les scènes sur une page commune : bandeau d'ouvrage (photo) · prestations (papier) · trois ouvrages sur noir · communes
    // voisines (papier) · contact sur la photo du bandeau, pied intégré. Galerie : des ouvrages finis seulement (da.ouvrages),
    // jamais un outil ni des mains, et trois sur une rangée (jamais une orpheline)
    if (da.scenes) {
      const rangee = (da.ouvrages || []).map((b) => photoDe(b, 'ouvrage')).filter((p) => p !== bandeau).slice(0, 3)
      if (rangee.length !== 3) throw new Error(`${metier}${page.chemin} : ${rangee.length} ouvrage(s) pour la galerie (3 attendus, da.json → ouvrages)`)
      let contactS = null, aGalerie = false, aCommunes = false
      for (const s of c.sections) {
        const { g, intro, items } = analyser(s)
        if (g === 'prestations' && items.length) corps += prestaScene(s, intro, items, rel, '')
        else if (g === 'galerie') { corps += galerieScene(s, intro, rangee, rel, creditsBandeau, { travelling: false }); aGalerie = true }
        else if (g === 'communes') { corps += communesScene(s, intro, voisines, rel, page.cible, true); aCommunes = true }
        else if (g === 'etapes') corps += etapesHtml(s, intro, items, classeDe(g), '', `${metier}${page.chemin}`, rel)
        else if (g === 'faq' && items.length) corps += faqScene(s, intro, items, '', rel)
        else if (g === 'contact') contactS = contactDe(s, intro, items)
        else throw new Error(`${metier}${page.chemin} : section « ${s.h2} » (genre ${g}) sans gabarit de scène`)
      }
      if (!aGalerie) corps += galerieScene({ h2: 'Quelques ouvrages' }, [], rangee, rel, creditsBandeau, { travelling: false })
      if (page.type === 'commune' && !aCommunes) corps += communesScene({ h2: 'Autres communes desservies' }, [], voisines, rel, page.cible, true)
      if (!contactS) contactS = { titre: `Votre ${da.label.toLowerCase()} à ${page.cible}`, textes: [], tous: [] }
      return tete(page, rel, { titre: c.title, description: c.description, image: bandeau || rangee[0], bandeau }) + corps + bande(contactS, infosContact(contactS.tous), rel, page.type === 'commune' ? page.cible : ville, bandeau ? { a: bandeau } : null) + pied(rel)
    }
    let alt = true, premierePhoto = true, contact = null
    for (const s of c.sections) {
      const { g, intro, items } = analyser(s)
      const classe = classeDe(g, alt)
      if (g === 'prestations' && items.length) { corps += `<section class="${classe}"${nuit(classe)}><div class="scene-large">${entete('Prestations', s.h2, intro)}${prestaListe(items)}</div></section>`; alt = !alt }
      else if (g === 'galerie') { corps += `<section class="${classe}"${nuit(classe)}><div class="scene-large">${entete('Réalisations', s.h2, intro)}${galerieHtml(mesPhotos, rel, premierePhoto && !bandeau, creditsBandeau)}</div></section>`; premierePhoto = false; alt = !alt }
      else if (g === 'communes' && da.communesMonumentales) { corps += `<section class="${classe}" id="communes"${nuit(classe)}><div class="conteneur">${entete('À proximité', s.h2, intro)}</div>${communesHtml(voisines, rel, page.cible)}<div class="conteneur"><p class="retour"><a href="${rel}">${FLECHE}Retour à l’accueil</a></p></div></section>`; alt = !alt }
      else if (g === 'communes') { corps += `<section class="${classe}"><div class="conteneur"><div class="deux"><div>${entete('À proximité', s.h2, intro)}</div>${communesHtml(voisines, rel, page.cible)}</div><p style="margin-top:2rem"><a class="bouton bouton--contour" href="${rel}">Retour à l’accueil</a></p></div></section>`; alt = !alt }
      else if (g === 'etapes') { corps += etapesHtml(s, intro, items, classe, '', `${metier}${page.chemin}`, rel); alt = !alt }
      else if (g === 'faq' && items.length) { corps += `<section class="${classe}"><div class="conteneur">${entete('Questions', s.h2, intro)}<div class="faq reveal">${items.map((it) => `<details><summary>${esc(it.titre)}</summary><div class="faq__corps">${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}</div></details>`).join('')}</div></div></section>`; alt = !alt }
      // le contact est reconnu même avec des items (zone, téléphone, assurance) : ils tombaient en prose brute, puis la carte
      // redisait tout (critique du 14/09) — et l'assureur n'a rien à faire hors du pied de page et des mentions légales
      else if (g === 'contact') contact = contactDe(s, intro, items)
      else { corps += `<section class="${classe}"><div class="conteneur"><div class="prose reveal"><h2>${esc(s.h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}${items.map((it) => `<h3>${esc(it.titre)}</h3>${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}`).join('')}</div></div></section>`; alt = !alt }
    }
    if (!c.sections.some((s) => genreDe(s) === 'galerie') && mesPhotos.length) corps += `<section class="section"><div class="conteneur">${entete('Réalisations', 'Quelques chantiers', [])}${galerieHtml(mesPhotos, rel, premierePhoto && !bandeau, creditsBandeau)}</div></section>`
    if (page.type === 'commune' && !c.sections.some((s) => genreDe(s) === 'communes')) corps += `<section class="section section--alt"><div class="conteneur"><div class="deux"><div>${entete('À proximité', 'Autres communes desservies', [])}</div>${communesHtml(voisines, rel, page.cible)}</div></div></section>`
    if (!contact) contact = { titre: `Votre ${da.label.toLowerCase()} à ${page.cible}`, textes: [], tous: [] }
    return tete(page, rel, { titre: c.title, description: c.description, image: bandeau || mesPhotos[0], bandeau }) + corps + bande(contact, infosContact(contact.tous), rel, page.type === 'commune' ? page.cible : ville) + pied(rel)
  }

  // ── Les pages légales ───────────────────────────────────────────────────────────────────────────────────────
  // Une entrée par fichier source (le héros de bureau et sa version 4:5 pour téléphone viennent du même fichier Commons) :
  // légende, auteur, licence (lien vers l'acte), CE QUI A ÉTÉ MODIFIÉ, page du fichier. Toutes les photos d'attributions.json
  // y figurent (le juge exige chaque auteur cité).
  const entreeCredit = (groupe) => {
    const modifs = groupe.filter(estModifiee)
    const p = modifs[0] || groupe[0]
    const licence = LICENCES_URL[p.licence] ? `<a href="${LICENCES_URL[p.licence]}" rel="license noopener" target="_blank">${esc(p.licence)}</a>` : esc(p.licence)
    let modif = 'Redimensionnée et convertie pour le web.'
    if (modifs.length) {
      const details = [...new Set(modifs.map(detailModif))].sort((a, b) => b.length - a.length)
      let d = details[0]
      const recadrage = /^recadrée[^,]*/i.exec(d)?.[0]
      // le recadrage ne vaut que pour la version qui le porte (la 4:5 du téléphone) : on le dit
      if (recadrage && details.some((x) => !/recadr/i.test(x))) d = `${d.slice(recadrage.length).replace(/^,\s*/, '')} ; ${recadrage} pour la version téléphone`
      // le relief du héros déforme la photo à l’écran (carte de profondeur tirée de l’image) : c’est une modification, dite ici
      if (da.relief && groupe.some((x) => x.base === da.relief.photo)) d = `${d} ; sur ordinateur, animée en relief à partir d’une carte de profondeur calculée depuis la photo`
      modif = partageIdentique(p.licence)
        ? `Modifiée — adaptation : ${d}, par Presti. L’adaptation est diffusée sous la même licence, ${p.licence}.`
        : `Modifiée : ${d}, par Presti.`
    }
    return `<li><span>${esc(p.legende)}</span><span>— ${esc(p.auteur)}</span><span>(${licence})</span><span>${esc(modif)}</span><a href="${p.source}" rel="noopener" target="_blank">page du fichier</a></li>`
  }
  // Les mentions légales ne créditent que les photos qu'une page du site affiche (elles listaient encore neuf photos d'outils et
  // d'anciens ouvrages disparus du site, juge du 14/09) : `photosUtilisees` est fixé après le rendu des autres pages.
  let photosUtilisees = photos
  const groupesCredits = (entrees = photosUtilisees) => [...new Set(entrees.map((p) => p.source))].map((src) => entrees.filter((p) => p.source === src))
  const entreeCreditNonPhoto = (p) => `<li><span>${esc(p.legende)}</span><span>— ${esc(p.auteur)}</span><span>(<a href="${esc(p.licenceUrl)}" rel="noopener" target="_blank">${esc(p.licence)}</a>)</span><a href="${esc(p.source)}" rel="noopener" target="_blank">source</a></li>`
  const creditsListe = (rel) => {
    const entrees = crochetsCredits([...photosUtilisees], rel)
    const photosCredits = entrees.filter((p) => !p.type || p.type === 'photo')
    const autresCredits = entrees.filter((p) => p.type && p.type !== 'photo')
    return `<ul class="credits">${groupesCredits(photosCredits).map(entreeCredit).join('')}${autresCredits.map(entreeCreditNonPhoto).join('')}</ul>`
  }
  const texteCredits = () => `Les photographies de ce site de démonstration proviennent de Wikimedia Commons, sous licence libre. Pour chacune : l’auteur, la licence, les modifications apportées et la page d’origine. ${photosUtilisees.every(estModifiee) ? 'Toutes ont été redimensionnées et converties pour le web, et modifiées par Presti : étalonnées, et recadrées pour certaines.' : 'Toutes ont été redimensionnées et converties pour le web ; celles dites « modifiée » ont aussi été étalonnées ou recadrées par Presti.'}`
  function legale(page) {
    const c = contenu.pages[page.chemin]
    const rel = '../'
    let corps = `<section class="hero hero--page"><div class="conteneur"><div class="hero__contenu"><nav class="ariane" aria-label="Fil d’Ariane"><a href="${rel}">Accueil</a><span>/</span><span>${esc(c.h1)}</span></nav><h1>${mots(c.h1)}</h1>${c.chapeau ? `<p class="chapeau">${esc(c.chapeau)}</p>` : ''}</div></div></section><section class="section"><div class="conteneur"><div class="prose">`
    for (const s of c.sections) {
      const { intro, items } = decouper(s.blocs)
      if (/cr[ée]dit/i.test(s.h2)) { corps += `<h2 id="credits">${esc(s.h2)}</h2><p>${texteCredits()}</p>${creditsListe(rel)}`; continue }
      corps += `<h2>${esc(s.h2)}</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}${items.map((it) => `<h3>${esc(it.titre)}</h3>${it.textes.map((t) => `<p>${esc(t)}</p>`).join('')}`).join('')}`
    }
    if (/mentions/.test(page.chemin) && !c.sections.some((s) => /cr[ée]dit/i.test(s.h2))) corps += `<h2 id="credits">Crédits photographiques</h2><p>${texteCredits()}</p>${creditsListe(rel)}`
    if (/mentions/.test(page.chemin) && site.demo && !JSON.stringify(c.sections).toLowerCase().includes('démonstration')) corps += `<p><strong>Site de démonstration :</strong> entreprise fictive, coordonnées fictives.</p>`
    corps += `</div></div></section>`
    return tete(page, rel, { titre: c.title, description: c.description }) + corps + pied(rel)
  }

  // ── Rendu, garde-fous, puis écriture ─────────────────────────────────────────────────────────────────────────
  // Tout est rendu et vérifié AVANT la moindre écriture (polices, styles.css, site.js, favicon, pages, sitemap) : un échec
  // laisse le site tel qu'il était — le 14/09, styles.css, site.js et fonts/ partaient sur le disque avant les garde-fous.
  let indexInterieure = 0
  const rendues = []
  // les pages légales en dernier : leurs crédits ne listent que ce que les autres pages affichent
  const ordre = [...pages.filter((p) => p.type !== 'legal'), ...pages.filter((p) => p.type === 'legal')]
  for (const page of ordre) {
    if (!contenu.pages[page.chemin]) { console.log(`  ✗ ${metier}${page.chemin} : pas de contenu extrait`); continue }
    if (page.type === 'legal' && photosUtilisees === photos) {
      const vues = new Set(rendues.flatMap((r) => [...r.html.matchAll(/images\/([a-z0-9-]+)-\d+\.(?:avif|webp)/g)].map((m) => m[1])))
      const orphelines = photos.filter((p) => !vues.has(p.base))
      // une photo d'attributions.json qu'aucune page n'affiche n'a rien à faire en ligne (ni dans les crédits, ni sur le disque)
      if (orphelines.length) throw new Error(`${metier} : ${orphelines.length} photo(s) d’attributions.json qu’aucune page n’affiche (${orphelines.map((p) => p.base).join(', ')}) — les retirer d’attributions.json et d’images/`)
      photosUtilisees = photos.filter((p) => vues.has(p.base))
    }
    pageCourante = page
    const html = page.type === 'accueil' ? accueil(page) : page.type === 'legal' ? legale(page) : interieure(page, indexInterieure++)
    const ou = `${metier}${page.chemin}`
    gardeFous(html, ou, couverture)
    if (page.type === 'accueil' && da.hero === 'plein') gardeFousAccueil(html, ou, { site, tel, chapeau: contenu.pages['/'].chapeau, sourceDe: new Map(photos.map((p) => [p.base, p.source])) })
    if (site.devis && page.type !== 'legal') gardeFousDevis(html, ou)
    gardeFousVoix(html, ou, { accueil: page.type === 'accueil', artisan: site.artisan })
    if (da.scenes && page.type !== 'legal') gardeFousScenes(html, ou)
    const relPage = page.type === 'accueil' ? '' : '../'.repeat(page.chemin.split('/').filter(Boolean).length)
    for (const famille of famillesChargees) {
      const garde = famille.crochets.garde
      if (typeof garde === 'function') garde(html, contexte(relPage))
    }
    if (page.type === 'commune' && da.hero === 'plein') {
      const h1 = texteDe(/<h1\b[\s\S]*?<\/h1>/.exec(html)?.[0] || '').replace(/\s+/g, ' ').trim()
      const h1Accueil = texteDe(/<h1\b[\s\S]*?<\/h1>/.exec(rendues.find((r) => r.page.type === 'accueil')?.html || '')?.[0] || '').replace(/\s+/g, ' ').trim()
      if (!/Menuisier/.test(h1) || !h1.includes(page.cible)) throw new Error(`${ou} : le h1 doit garder « Menuisier » et « ${page.cible} » (lu : « ${h1} »)`)
      if (h1 === h1Accueil) throw new Error(`${ou} : même h1 que l’accueil (« ${h1} »)`)
      if (!/class="hero hero--plein hero--commune(?:"| )/.test(html)) throw new Error(`${ou} : la page commune n’ouvre pas sur un ouvrage en plein cadre`)
    }
    // chaque photo modifiée affichée sur la page est dite « modifiée » dans sa ligne de crédits
    const credits = /<p class="galerie__credits">[\s\S]*?<\/p>/.exec(html)?.[0]
    if (credits && galerieAccueil && page.type === 'accueil' && galerieAccueil.some(estModifiee) && !/modifiée/.test(credits)) throw new Error(`${ou} : la ligne de crédits ne dit pas « modifiée » alors que des photos ont été étalonnées ou recadrées`)
    if (page.type === 'legal' && /mentions/.test(page.chemin)) {
      const lis = [...html.matchAll(/<ul class="credits">([\s\S]*?)<\/ul>/g)].flatMap((m) => m[1].split('</li>')).filter((l) => l.includes('<li>'))
      for (const g of groupesCredits().filter((g) => g.some(estModifiee))) {
        const li = lis.find((l) => l.includes(`href="${g[0].source}"`))
        if (!li || !/Modifiée/.test(li)) throw new Error(`${ou} : l'entrée de crédits de « ${g[0].legende} » ne dit pas « Modifiée »`)
        if (partageIdentique(g[0].licence) && !li.includes('adaptation')) throw new Error(`${ou} : « ${g[0].legende} » (${g[0].licence}, modifiée) n'est pas signalée comme adaptation`)
      }
    }
    rendues.push({ page, html })
  }
  pageCourante = null
  if (!rendues.some((r) => r.page.type === 'accueil')) throw new Error(`${metier} : aucune page d'accueil rendue`)
  // le relief : sa photo est bien le héros, sa carte existe (scripts/relief-profondeur.mjs), son module est dans le kit
  const KIT_RELIEF = path.join(ICI, '_kit', 'relief.js'), KIT_RELIEF_FIL = path.join(ICI, '_kit', 'relief-fil.js')
  if (da.relief) {
    if (da.relief.photo !== heros.base) throw new Error(`${metier} : da.json → relief.photo (« ${da.relief.photo} ») n’est pas le héros (« ${heros.base} »)`)
    if (!fs.existsSync(path.join(dossierSource, da.relief.profondeur)) || fs.statSync(path.join(dossierSource, da.relief.profondeur)).size < 1024) throw new Error(`${metier} : carte de profondeur ${da.relief.profondeur} absente ou vide — node scripts/relief-profondeur.mjs`)
    if (!Array.isArray(da.relief.oeil) || da.relief.oeil.length !== 2 || da.relief.oeil.some((v) => !(v > 0 && v < 1))) throw new Error(`${metier} : da.json → relief.oeil doit être deux fractions entre 0 et 1`)
    if (da.relief.descente != null) {
      const d = da.relief.descente
      if (!d || d.palier !== 0.30) throw new Error(`${metier} : da.json → relief.descente.palier doit valoir 0.30`)
      if (!(d.dmax1 > 0 && d.dmax1 <= 0.26)) throw new Error(`${metier} : da.json → relief.descente.dmax1 doit être dans ]0 ; 0.26]`)
      if (d.dmax15 > d.dmax1) throw new Error(`${metier} : da.json → relief.descente.dmax15 ne peut pas dépasser dmax1`)
      if (![ -1, 1 ].includes(d.h)) throw new Error(`${metier} : da.json → relief.descente.h doit valoir -1 ou 1`)
      if (d.gamma !== 0.6) throw new Error(`${metier} : da.json → relief.descente.gamma doit valoir 0.6`)
      if (d.rw !== 0.045) throw new Error(`${metier} : da.json → relief.descente.rw doit valoir 0.045`)
    }
    if (da.relief.texture) {
      const texture = path.join(dossierSource, da.relief.texture)
      if (!fs.existsSync(texture) || fs.statSync(texture).size < 1024) throw new Error(`${metier} : texture de relief ${da.relief.texture} absente ou vide`)
    }
    for (const f of [KIT_RELIEF, KIT_RELIEF_FIL]) if (!fs.existsSync(f)) throw new Error(`${metier} : _kit/${path.basename(f)} manque`)
  }

  if (dossier !== dossierSource) {
    fs.mkdirSync(path.dirname(dossier), { recursive: true })
    fs.cpSync(dossierSource, dossier, { recursive: true })
  }
  const fonts = path.join(dossier, 'fonts'); fs.rmSync(fonts, { recursive: true, force: true }); fs.mkdirSync(fonts)
  for (const { src, nom } of fichiersPolice) fs.copyFileSync(src, path.join(fonts, nom))
  fs.writeFileSync(path.join(dossier, 'styles.css'), stylesCss)
  if (bureauCss) fs.writeFileSync(path.join(dossier, 'bureau.css'), bureauCss)
  else fs.rmSync(path.join(dossier, 'bureau.css'), { force: true })
  const jsFamilles = famillesChargees.map((famille) => famille.js).filter(Boolean)
  fs.writeFileSync(path.join(dossier, 'site.js'), [KIT_JS, ...jsFamilles].join('\n;\n'))
  for (const f of [KIT_RELIEF, KIT_RELIEF_FIL]) { if (da.relief) fs.copyFileSync(f, path.join(dossier, path.basename(f))); else fs.rmSync(path.join(dossier, path.basename(f)), { force: true }) }
  if (favicon) fs.writeFileSync(path.join(dossier, 'favicon.svg'), favicon)
  let n = 0
  for (const { page, html } of rendues) {
    const f = path.join(dossier, page.chemin.replace(/^\//, ''), 'index.html')
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, site.demo ? liensIndex(html) : html); n++
  }
  const publiques = pages.filter((p) => p.type !== 'legal')
  fs.writeFileSync(path.join(dossier, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publiques.map((p) => `  <url><loc>${BASE}${p.chemin}</loc><lastmod>${AUJOURDHUI}</lastmod></url>`).join('\n')}\n</urlset>\n`)
  fs.writeFileSync(path.join(dossier, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`)
  for (const vieux of ['build.mjs']) { const f = path.join(dossier, vieux); if (fs.existsSync(f)) fs.rmSync(f) }
  console.log(`  ✓ ${metier} : ${n} pages, ${photos.length} photos (${auteurs.length} auteurs), héros « ${da.hero} » (${heros.base}${herosMobile ? ` + ${herosMobile.base} sous 768 px` : ''}), police ${da.display}${da.texte !== da.display ? ' + ' + da.texte + (statiques ? ` ${statiques.join('/')}` : '') : ''}, styles.css ${(Buffer.byteLength(stylesCss) / 1024).toFixed(1)} Ko${favicon ? ', favicon.svg' : ''}`)
}

const args = process.argv.slice(2)
if (args.includes('--tous')) { console.error('--tous est retiré (14/09) : une seule démo vit, Lestraque ; les neuf autres sont gelées. Usage : node public/sites-demo/generer.mjs lestraque'); process.exit(2) }
const valeurSortie = args.find((a) => a.startsWith('--sortie='))?.slice('--sortie='.length)
const valeurFamilles = args.find((a) => a.startsWith('--familles='))?.slice('--familles='.length)
const valeurDa = args.find((a) => a.startsWith('--da='))?.slice('--da='.length)
if (valeurSortie === '') { console.error('--sortie attend un dossier'); process.exit(2) }
if (valeurDa === '') { console.error('--da attend un fichier JSON'); process.exit(2) }
const METIERS = args.filter((a) => !a.startsWith('--'))
if (!METIERS.length) { console.error('usage : node public/sites-demo/generer.mjs lestraque'); process.exit(2) }
if (valeurSortie !== undefined && METIERS.length !== 1) { console.error('--sortie accepte un seul métier'); process.exit(2) }
const options = {
  sortie: valeurSortie === undefined ? null : path.resolve(valeurSortie),
  familles: valeurFamilles === undefined ? null : valeurFamilles.split(',').map((x) => x.trim()).filter(Boolean),
  da: valeurDa === undefined ? null : path.resolve(valeurDa),
}
for (const m of METIERS) { try { await generer(m, options) } catch (e) { console.log(`  ✗ ${m} : ${e.message}`); process.exitCode = 1 } }
