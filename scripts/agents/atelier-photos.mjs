// scripts/agents/atelier-photos.mjs — les photos du site de l'artisan, pour SA maquette (07/10, accord de Benj).
//
// Benj : « tu montres un site cohérent comme celui en exemple sur le site, en essayant de reprendre les images de l'artisan, en lui
// précisant bien sûr ». Le site de l'artisan est lu par le même robot poli que le recenseur (lib/agents/acquisition/lecteurSite.ts :
// robots.txt respecté, hôte public seulement, une requête par seconde et par hôte, 1 Mo au plus par page) : l'accueil, puis au plus
// une page de réalisations. Les images retenues sont SES photos de chantier (assez grandes, pas un logo, pas une icône, pas une
// image unie), jamais une photo de personne repérée par son nom de fichier, ré-encodées en JPEG SANS métadonnées (ni EXIF, ni GPS).
// Elles ne servent qu'à l'aperçu privé montré à lui seul (captures et vidéo de la maquette) ; rien n'est publié. La maquette le dit
// en clair (maquettes/rendu.mjs, MENTION_ARTISAN).
//
// Aucun modèle de langage, aucun service payant : la lecture est directe (Firecrawl et Apify ne sont pas appelés ici).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'

const MAX_IMAGES = 6
const MAX_CANDIDATES = 14
const MAX_OCTETS = 6 * 1024 * 1024
const UA = 'PrestiRecenseur/1.0 (+https://prestiapp.fr/confidentialite#prospection)'
const EXCLUS = /(logo|icon|icone|favicon|sprite|avatar|banniere-pub|badge|label|qualibat|rge|qualifelec|facebook|instagram|google|whatsapp|linkedin|youtube|pinterest|tiktok|maps|placeholder|loader|spinner|pixel|tracking|portrait|equipe|team|profil|cv\b|photo-identite)/i
const attribut = (s, nom) => { const m = s.match(new RegExp('(?:^|\\s)' + nom + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i')); return (m?.[1] ?? m?.[2] ?? m?.[3] ?? '').replace(/&amp;/g, '&').trim() }
function plusGrandeDuSrcset(srcset) {
  let meilleur = null, largeur = -1
  for (const part of String(srcset).split(',')) {
    const [url, taille] = part.trim().split(/\s+/)
    const w = Number.parseInt(taille, 10) || (taille?.endsWith('x') ? Number.parseFloat(taille) * 1000 : 1)
    if (url && w > largeur) { meilleur = url; largeur = w }
  }
  return meilleur
}

/** Les URL d'images candidates d'une page, dans l'ordre de la page, la plus grande variante de chaque <img>/<source>. */
export function imagesDeLaPage(html, base) {
  const propre = String(html).replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
  const vus = new Set(), sortie = []
  const ajouter = (brut, alt = '') => {
    if (!brut || /^data:/i.test(brut)) return
    let u
    try { u = new URL(brut, base) } catch { return }
    if (!['http:', 'https:'].includes(u.protocol) || /\.(svg|gif|ico)(?:$|\?)/i.test(u.pathname) || EXCLUS.test(decodeURIComponent(u.pathname))) return
    const cle = u.origin + u.pathname
    if (vus.has(cle)) return
    vus.add(cle); sortie.push({ url: u.href, alt: alt.replace(/\s+/g, ' ').slice(0, 140) })
  }
  for (const m of propre.matchAll(/<img\b([^>]*)>/gi)) {
    const a = m[1], alt = attribut(a, 'alt')
    if (EXCLUS.test(`${attribut(a, 'class')} ${attribut(a, 'id')} ${alt}`)) continue
    ajouter(plusGrandeDuSrcset(attribut(a, 'srcset') || attribut(a, 'data-srcset')) || attribut(a, 'data-src') || attribut(a, 'data-lazy-src') || attribut(a, 'src'), alt)
  }
  for (const m of propre.matchAll(/<source\b([^>]*)>/gi)) ajouter(plusGrandeDuSrcset(attribut(m[1], 'srcset') || attribut(m[1], 'data-srcset')))
  // les images de fond déclarées dans le HTML (héros des sites Wix, Elementor) ; le CSS externe n'est pas lu
  for (const m of propre.matchAll(/background(?:-image)?\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) ajouter(m[1])
  const og = /<meta\b(?=[^>]*property\s*=\s*["']og:image["'])[^>]*>/i.exec(propre)
  if (og) ajouter(attribut(og[0], 'content'))
  return sortie.slice(0, MAX_CANDIDATES)
}

/** Une page de réalisations liée depuis l'accueil (même domaine), si elle existe. */
export function pageRealisations(html, base) {
  for (const m of String(html).matchAll(/<a\b([^>]*)>/gi)) {
    const href = attribut(m[1], 'href')
    try {
      const u = new URL(href, base)
      if (u.hostname.replace(/^www\./, '') === new URL(base).hostname.replace(/^www\./, '') && /r[ée]alisation|galerie|chantier|portfolio|projets|travaux|photos/i.test(decodeURIComponent(u.pathname))) return u.href.split('#')[0]
    } catch { /* lien invalide */ }
  }
  return null
}

async function telecharger(url, { hoteAutorise, ipsDe, robotsAutorise, robotsDe, attendre }) {
  const u = new URL(url)
  if (!hoteAutorise(url, await ipsDe(u.hostname))) return null
  const robots = await robotsDe(u.origin)
  if (robots === null || !robotsAutorise(robots, 'PrestiRecenseur', u.pathname + u.search)) return null
  await attendre(u.hostname)
  const controleur = new AbortController()
  const minuterie = setTimeout(() => controleur.abort(), 8000)
  try {
    const r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': UA, accept: 'image/avif,image/webp,image/jpeg,image/png' }, signal: controleur.signal, credentials: 'omit' })
    if (r.status !== 200 || !/^image\/(jpeg|png|webp|avif)/i.test(r.headers.get('content-type') || '')) return null
    const morceaux = []; let taille = 0
    for await (const bloc of r.body) { taille += bloc.length; if (taille > MAX_OCTETS) return null; morceaux.push(bloc) }
    return Buffer.concat(morceaux)
  } catch { return null } finally { clearTimeout(minuterie) }
}

/** Une vraie photo : assez grande, proportions d'une photo, pas unie, pas un détourage transparent. */
export async function estUnePhoto(octets) {
  try {
    const img = sharp(octets, { failOn: 'error' }).rotate()
    const meta = await img.metadata()
    const w = meta.autoOrient?.width ?? meta.width, h = meta.autoOrient?.height ?? meta.height
    if (!(w >= 700 && h >= 450) || w / h > 2.4 || h / w > 1.7) return null
    const stats = await sharp(octets).greyscale().stats()
    if (stats.channels[0].stdev < 28) return null
    if (meta.hasAlpha) { const a = await sharp(octets).ensureAlpha().extractChannel(3).stats(); if (a.channels[0].mean < 250) return null }
    const empreinte = (await sharp(octets).rotate().greyscale().resize(16, 16, { fit: 'fill' }).raw().toBuffer())
    return { largeur: w, hauteur: h, empreinte }
  } catch { return null }
}
const proches = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length < 9 }

/**
 * Relève jusqu'à six photos du site `domaine` dans `dossier/artisan/` (JPEG sans métadonnées). Rend { domaine, fichiers } pour
 * maquette.json → photos_artisan, ou null si le site n'en donne aucune (la maquette prend alors les photos libres du métier).
 * deps : { recupererPoli, recuperateurReseau, hoteAutorise, robotsAutorise, ipsDe?, horloge? } (injectés : le juge les remplace).
 */
export async function photosDuSite(domaine, dossier, deps) {
  const h = String(domaine || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(h) || /\.invalid$/.test(h) && !deps.essai) return null
  const horloge = deps.horloge ?? { maintenant: () => Date.now(), attendre: (ms) => new Promise((r) => setTimeout(r, ms)) }
  const etatLecture = { recuperer: deps.recuperateurReseau, horloge, echeance: horloge.maintenant() + 45_000 }
  const dernier = new Map(), robotsCache = new Map()
  const attendre = async (hote) => { const d = dernier.get(hote); if (d !== undefined) await horloge.attendre(Math.max(0, 1000 - (horloge.maintenant() - d))); dernier.set(hote, horloge.maintenant()) }
  const ipsDe = deps.ipsDe ?? (async (hote) => (await (await import('node:dns/promises')).lookup(hote, { all: true, verbatim: true })).map((x) => x.address))
  const robotsDe = deps.robotsDe ?? (async (origine) => {
    if (robotsCache.has(origine)) return robotsCache.get(origine)
    let texte = null
    try { const r = await deps.recuperateurReseau(`${origine}/robots.txt`, { entetes: { 'user-agent': UA }, delaiMs: 8000, maxOctets: 512 * 1024 }); texte = r.statut >= 400 && r.statut < 500 ? '' : r.statut === 200 ? r.corps : null } catch { texte = null }
    robotsCache.set(origine, texte); return texte
  })
  let accueil = await deps.recupererPoli(`https://${h}/`, etatLecture)
  if ('refus' in accueil && accueil.refus === 'injoignable') accueil = await deps.recupererPoli(`http://${h}/`, etatLecture)
  if ('refus' in accueil || accueil.statut !== 200) return null
  const base = accueil.url_finale || `https://${h}/`
  let candidats = imagesDeLaPage(accueil.corps, base)
  const real = pageRealisations(accueil.corps, base)
  if (real) { const p = await deps.recupererPoli(real, etatLecture); if (!('refus' in p) && p.statut === 200) candidats = [...imagesDeLaPage(p.corps, real), ...candidats].slice(0, MAX_CANDIDATES) }
  const retenues = []
  for (const c of candidats) {
    if (retenues.length >= MAX_IMAGES || horloge.maintenant() > etatLecture.echeance) break
    const octets = await (deps.telecharger ?? telecharger)(c.url, { hoteAutorise: deps.hoteAutorise, ipsDe, robotsAutorise: deps.robotsAutorise, robotsDe, attendre })
    if (!octets) continue
    const photo = await estUnePhoto(octets)
    if (!photo || retenues.some((r) => proches(r.empreinte, photo.empreinte))) continue
    retenues.push({ ...photo, octets, url: c.url, alt: c.alt })
  }
  if (!retenues.length) return null
  const sortie = path.join(dossier, 'artisan')
  fs.mkdirSync(sortie, { recursive: true })
  const fichiers = []
  for (const [i, r] of retenues.entries()) {
    const nom = `${i + 1}.jpg`
    // ré-encodée : les métadonnées (EXIF, GPS, auteur) ne suivent pas
    await sharp(r.octets).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(sortie, nom))
    fichiers.push({ fichier: `artisan/${nom}`, url: r.url, alt: r.alt, empreinte: crypto.createHash('sha256').update(r.octets).digest('hex').slice(0, 16) })
  }
  return { domaine: h, fichiers }
}
