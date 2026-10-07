// maquettes/rendu.mjs — la maquette privée de prospection, au niveau de la démo Lestraque (07/10).
//
// Avant le 07/10, une maquette était une page de 35 lignes de CSS (héros scindé, trois cases « À compléter », un contact sans
// formulaire) : rien à voir avec l'exemple montré sur la vitrine. Elle reprend maintenant LE kit de Lestraque (kit.css, kit.js et
// les familles recit, survol, telephone) et ses scènes, dans le même ordre et le même balisage : héros plein cadre et ligne
// display, plateau noir (une phrase et trois repères), prestations en liste éditoriale avec vignettes, bande plein cadre, réalisations
// sur noir en travelling, zone en liste monumentale, étapes monumentales, questions en deux colonnes, contact sur photo avec le
// formulaire de démonstration. Les textes viennent du modèle du MÉTIER (maquettes/modeles/<métier>/contenu.json, version 2) ;
// la direction artistique, de _kit/da.json pour ce métier (couleurs, polices).
//
// Les photos : d'abord celles du site de l'artisan (relevées par scripts/agents/atelier-photos.mjs, son propre contenu montré à
// lui seul en aperçu privé, jamais publié), et la maquette le dit en clair ; sinon, des photos sous licence libre déjà prouvée
// (attributions.json des démos), créditées. Jamais le portfolio du compte de démo.
//
// Aucun modèle de langage, aucun réseau : mise en page déterministe, rejouable. Tous les contrôles passent AVANT la première
// écriture. Appelé par public/sites-demo/generer.mjs --maquette=… --sortie=… (l'interface de l'Atelier ne change pas).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..')
const DEMOS = path.join(RACINE, 'public', 'sites-demo')
const KIT = path.join(DEMOS, '_kit')

export const MENTION_ARTISAN = 'photos reprises de votre site, à remplacer à votre convenance'
export const MENTION_LIBRE = 'photos d’illustration sous licence libre, à remplacer par les vôtres'
/** Les scènes attendues sur toute maquette, dans l'ordre de Lestraque (le juge les compte). */
export const SCENES = ['hero', 'plateau', 'prestations', 'atelier', 'realisations', 'communes', 'etapes', 'questions', 'contact']
/** Alias des métiers tels que la base les écrit (« électricien », « carrelage », « maçonnerie »…) vers un modèle. */
export const ALIAS_METIER = Object.freeze({
  plombier: 'plombier', plomberie: 'plombier', 'plombier-chauffagiste': 'plombier',
  chauffagiste: 'chauffagiste', chauffage: 'chauffagiste',
  electricien: 'electricien', electricite: 'electricien',
  menuisier: 'menuisier', menuiserie: 'menuisier', ebeniste: 'menuisier',
  couvreur: 'couvreur', couverture: 'couvreur', toiture: 'couvreur', charpente: 'couvreur', charpentier: 'couvreur', zingueur: 'couvreur',
  macon: 'macon', maconnerie: 'macon',
  peintre: 'peintre', peinture: 'peintre',
  carreleur: 'carreleur', carrelage: 'carreleur',
  isolation: 'isolation', plaquiste: 'isolation', platrier: 'isolation',
  paysagiste: 'paysagiste', paysage: 'paysagiste',
  serrurier: 'serrurier', serrurerie: 'serrurier',
})
export function modeleDuMetier(metier) {
  const cle = String(metier ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, '-')
  return ALIAS_METIER[cle] ?? null
}

const CLICHES = [/gratuit/i, /passionn/i, /professionnalisme/i, /haut niveau d[’']exigence/i, /exemplaire/i, /sublim/i, /de A à Z/, /savoir-faire/i, /int[ée]rieure et ext[ée]rieure/i, /est une priorit[ée]/i]
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const typo = (s) => String(s ?? '').replace(/(\p{L})'(?=\p{L})/gu, '$1’').replace(/\s+/g, ' ').trim()
const texteDe = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ')
const FLECHE = '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M5 13L13 5M13 5H6M13 5V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const mots = (t) => String(t).split(/\s+/).map((m, i) => `<span class="mot" style="--i:${i}">${esc(m)}</span>`).join(' ')
const masque = (t) => String(t).split(/\s+/).map((m, i) => `<span class="ml"><span class="ml__in" style="--i:${i}">${esc(m)}</span></span>`).join(' ')
const motsCitation = (t) => String(t).split(/\s+/).filter(Boolean).map((m, i) => `<span class="citation__mot" style="--i:${i}">${esc(m)}</span>`).join(' ')
const sansCommentaires = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{2,}/g, '\n').trim()
const nbMots = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length
// La ligne display garde la taille du kit tant qu'elle tient dans le cadre ; plus longue, elle s'ajuste (repris de generer.mjs :
// « L’eau trouve son chemin » sortait du cadre à 1440 px)
const plafondsTitre = (ligne) => {
  const texte = String(ligne ?? '').trim()
  const motLePlusLong = Math.max(1, ...texte.split(/\s+/).map((mot) => [...mot].length))
  const longueur = [...texte].length
  return `--h1-plafond-tel:calc(88vw / ${(0.62 * motLePlusLong).toFixed(2)});--h1-plafond-bureau:calc(88vw / ${(0.62 * Math.max(motLePlusLong, Math.ceil(longueur * 0.6))).toFixed(2)})`
}
const CSS_TITRE = '.hero--plein h1[style]{font-size:min(var(--h1-ligne),var(--h1-plafond-tel,100vw))}\n@media(min-width:768px){.hero--plein h1[style]{font-size:min(var(--h1-ligne),var(--h1-plafond-bureau,100vw))}.hero--plein h1[style] .h1__ligne{white-space:normal;text-wrap:balance}}\n'

/** « SARL DUPONT PLOMBERIE » → « SARL Dupont Plomberie » ; un nom déjà en casse mixte reste tel quel. */
export function nomPropre(s) {
  const t = typo(s)
  if (!t || t !== t.toUpperCase() || t.length < 4) return t
  const FORMES = new Set(['SARL', 'SAS', 'SASU', 'EURL', 'EI', 'EIRL', 'SA', 'SCOP', 'SNC'])
  const PETITS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'sur', 'en', 'aux', 'au'])
  return t.split(/(\s+|-)/).map((m, i) => {
    if (/^\s+$|^-$/.test(m)) return m
    if (FORMES.has(m)) return m
    const bas = m.toLowerCase()
    if (i > 0 && PETITS.has(bas)) return bas
    return bas.replace(/^(\p{L})/u, (c) => c.toUpperCase()).replace(/([’'])(\p{L})/u, (_, a, c) => a + c.toUpperCase())
  }).join('')
}

// ── Les photos ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const LARGEURS_ARTISAN = [480, 960, 1600]
function photoLibre(demo, base) {
  const dossier = path.join(DEMOS, demo, 'images')
  const attributions = JSON.parse(fs.readFileSync(path.join(DEMOS, demo, 'attributions.json'), 'utf8'))
  const a = attributions.find((x) => (x.base || String(x.fichier).replace(/^images\//, '').replace(/-(\d+)\.\w+$/, '')) === base)
  if (!a?.auteur || !a?.licence || !a?.source) throw new Error(`photo ${demo}/${base} sans attribution prouvée (auteur, licence, source)`)
  if (/portfolio|compte de d[ée]mo/i.test(`${a.source} ${a.legende}`)) throw new Error(`photo ${demo}/${base} : portfolio du compte de démo refusé`)
  const largeurs = [...new Set(fs.readdirSync(dossier).map((f) => new RegExp(`^${base}-(\\d+)\\.webp$`).exec(f)?.[1]).filter(Boolean).map(Number))].sort((x, y) => x - y)
  if (!largeurs.length) throw new Error(`photo ${demo}/${base} absente du disque`)
  return {
    base: `libre-${demo}-${base}`, provenance: 'libre', largeurs, largeur: Number(a.largeur) || 1600, hauteur: Number(a.hauteur) || 1067,
    legende: typo(a.legende), alt: typo(a.alt || a.legende), auteur: a.auteur, licence: a.licence, source: a.source, modifiee: a.modifiee || null,
    // copiées octet pour octet (maquette-qa, MQ-5 : chaque photo libre est identique à celle de sa démo) ; `largeurs` peut être
    // réduit par l'appelant (le 1 600 px seulement pour les photos plein cadre)
    copier(sortie) { for (const l of this.largeurs) fs.copyFileSync(path.join(dossier, `${base}-${l}.webp`), path.join(sortie, `libre-${demo}-${base}-${l}.webp`)) },
  }
}
async function photoArtisan(dossierEntree, p, i, entreprise, domaine) {
  const fichier = path.resolve(dossierEntree, p.fichier)
  if (!fichier.startsWith(path.resolve(dossierEntree) + path.sep) || !fs.existsSync(fichier)) throw new Error(`photo de l’artisan absente : ${p.fichier}`)
  const meta = await sharp(fichier).rotate().metadata()
  const largeur = meta.autoOrient?.width ?? meta.width, hauteur = meta.autoOrient?.height ?? meta.height
  if (!(largeur >= 600 && hauteur >= 400)) throw new Error(`photo de l’artisan trop petite : ${p.fichier}`)
  const largeurs = LARGEURS_ARTISAN.filter((l) => l <= largeur)
  if (!largeurs.length || largeurs.at(-1) < largeur * 0.8) largeurs.push(Math.min(largeur, 1600))
  const base = `artisan-${i + 1}`
  const alt = typo(p.alt && p.alt.length >= 4 && p.alt.length <= 120 && !/logo|icon|ic[oô]ne/i.test(p.alt) ? p.alt : `Photo publiée par ${entreprise}`)
  return {
    base, provenance: 'artisan', largeurs: [...new Set(largeurs)].sort((x, y) => x - y), largeur, hauteur,
    legende: 'Photo reprise de votre site', alt, auteur: entreprise, licence: 'reprise de votre site', source: p.url || `https://${domaine}/`, modifiee: null,
    copier: async (sortie) => {
      for (const l of new Set(largeurs)) {
        const flux = sharp(fichier).rotate().resize({ width: l, withoutEnlargement: true })
        await flux.clone().webp({ quality: 76 }).toFile(path.join(sortie, `${base}-${l}.webp`))
      }
    },
  }
}
// WebP seulement : le dossier complet tient sous 3 Mo (maquette-qa, MQ-6)
const srcset = (p) => p.largeurs.map((l) => `images/${p.base}-${l}.webp ${l}w`).join(', ')
function picture(p, { sizes = '100vw', paresseuse = true, position = null } = {}) {
  const defaut = p.largeurs.filter((l) => l <= 960).at(-1) || p.largeurs[0]
  return `<picture><source type="image/webp" srcset="${srcset(p)}" sizes="${sizes}"><img src="images/${p.base}-${defaut}.webp" alt="${esc(p.alt)}" width="${p.largeur}" height="${p.hauteur}"${position ? ` style="object-position:${esc(position)}"` : ''}${paresseuse ? ' loading="lazy" decoding="async"' : ''}></picture>`
}
const enPortrait = (p) => p.hauteur > p.largeur

// ── Le modèle ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function lireModele(nom) {
  if (!/^[a-z0-9-]+$/.test(nom)) throw new Error('modèle invalide')
  const f = path.join(RACINE, 'maquettes', 'modeles', nom, 'contenu.json')
  if (!fs.existsSync(f)) throw new Error(`modèle ${nom} absent`)
  const m = JSON.parse(fs.readFileSync(f, 'utf8'))
  if (m.version !== 2) throw new Error(`modèle ${nom} : version 2 attendue`)
  const exiger = (cond, quoi) => { if (!cond) throw new Error(`modèle ${nom} : ${quoi}`) }
  exiger(m.accueil?.h1 && m.accueil?.h1Ligne && m.accueil?.chapeau && m.accueil?.title, 'accueil incomplet')
  exiger(Array.isArray(m.prestations?.items) && m.prestations.items.length >= 5 && m.prestations.items.length <= 6, 'prestations : 5 ou 6')
  exiger(Array.isArray(m.etapes?.items) && m.etapes.items.length === 4, 'étapes : 4')
  exiger(Array.isArray(m.faq?.items) && m.faq.items.length >= 4 && m.faq.items.length <= 5, 'questions : 4 ou 5')
  exiger(m.atelier?.h2 && m.atelier?.phrase && m.realisations?.h2 && m.zone?.h2 && m.contact?.h2, 'sections incomplètes')
  exiger(Array.isArray(m.contact?.projets) && m.contact.projets.length >= 3, 'contact.projets')
  exiger(m.photos === null || (m.photos?.demo && m.photos?.heros && m.photos?.atelier && Array.isArray(m.photos?.galerie) && m.photos.galerie.length === 4), 'photos : null ou { demo, heros, atelier, galerie[4] }')
  return m
}

// ── Le rendu ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * entree : maquette.json — { entreprise, metier, ville, communes, modele, source_fait, photos_artisan?: { domaine, fichiers: [{ fichier, url, alt }] } }
 * Rend le site dans `sortie` (index.html, styles.css, bureau.css, site.js, fonts/, images/, attributions.json, rapport.json).
 */
export async function rendreMaquette(fichierEntree, sortie) {
  const dossierEntree = path.dirname(path.resolve(fichierEntree))
  const entree = JSON.parse(fs.readFileSync(path.resolve(fichierEntree), 'utf8'))
  for (const cle of ['entreprise', 'metier', 'ville', 'modele']) if (typeof entree[cle] !== 'string' || !entree[cle].trim()) throw new Error(`maquette.json : ${cle} absent`)
  if (!Array.isArray(entree.communes) || entree.communes.some((c) => typeof c !== 'string')) throw new Error('maquette.json : communes invalides')
  const nomModele = modeleDuMetier(entree.modele) ?? modeleDuMetier(entree.metier)
  if (!nomModele) throw new Error(`aucun modèle pour le métier « ${entree.metier} »`)
  const modele = lireModele(nomModele)
  const entreprise = nomPropre(entree.entreprise)
  const ville = nomPropre(entree.ville)
  const remplir = (t) => typo(String(t ?? '').replaceAll('{entreprise}', () => entreprise).replaceAll('{ville}', () => ville))
  const DA = JSON.parse(fs.readFileSync(path.join(KIT, 'da.json'), 'utf8'))
  const da = { ...DA.generique, ...(DA[modele.da] || {}) }

  // Les photos : celles du site de l'artisan d'abord, la licence libre en repli
  const relevees = Array.isArray(entree.photos_artisan?.fichiers) ? entree.photos_artisan.fichiers.slice(0, 6) : []
  const domaine = String(entree.photos_artisan?.domaine || '').toLowerCase().replace(/[^a-z0-9.-]/g, '')
  const artisan = []
  for (const [i, p] of relevees.entries()) artisan.push(await photoArtisan(dossierEntree, p, i, entreprise, domaine))
  const libres = modele.photos ? {
    heros: photoLibre(modele.photos.demo, modele.photos.heros), atelier: photoLibre(modele.photos.demo, modele.photos.atelier),
    galerie: modele.photos.galerie.map((b) => photoLibre(modele.photos.demo, b)),
  } : null
  if (!artisan.length && !libres) throw new Error(`modèle ${nomModele} : aucune photo libre cohérente, et le site de l’artisan n’en a pas donné`)
  const paysages = artisan.filter((p) => !enPortrait(p)).sort((a, b) => b.largeur * b.hauteur - a.largeur * a.hauteur)
  const heros = paysages[0] || artisan[0] || libres.heros
  const restantes = artisan.filter((p) => p !== heros)
  const atelier = restantes.find((p) => !enPortrait(p)) || (libres ? libres.atelier : restantes[0] || heros)
  const galerie = []
  // la photo de la bande revient au fond du contact : jamais aussi dans la galerie (trois apparitions)
  for (const p of [...artisan.filter((p) => p !== atelier), ...(libres ? libres.galerie : [])]) if (galerie.length < 4 && !galerie.some((g) => g.base === p.base) && p.base !== atelier.base) galerie.push(p)
  // trop peu de photos (menuisier : cinq en tout) : le héros entre dans la galerie, puis la bande, et le contact prend alors le héros
  let fondContact = atelier
  if (galerie.length < 4 && !galerie.some((g) => g.base === heros.base)) galerie.push(heros)
  if (galerie.length < 4 && atelier !== heros && !galerie.some((g) => g.base === atelier.base || g.base === heros.base)) { galerie.push(atelier); fondContact = heros }
  // sans photo libre (paysagiste), la galerie se contente de ce que le site donne : 2 à 4 photos, jamais une troisième apparition
  if (galerie.length < 2) throw new Error(`trop peu de photos pour la galerie (${galerie.length}) : il en faut 2 au moins`)
  // les vignettes des prestations : la photo libre que le modèle donne, tant qu'elle ne dépasse pas deux apparitions
  const vues = new Map()
  const compter = (p) => vues.set(p.base, (vues.get(p.base) || 0) + 1)
  for (const p of [heros, atelier, ...galerie, fondContact]) compter(p)
  // les photos d'accompagnement de Lestraque (plateau, étapes, questions) : prises dans la galerie, deux apparitions au plus
  const accompagner = (ordre) => { for (const i of ordre) { const q = galerie[i]; if (q && (vues.get(q.base) || 0) < 2) { compter(q); return q } } return null }
  const photoPlateau = accompagner([1, 2, 3, 0]), photoEtapes = accompagner([3, 2, 0, 1]), photoFaq = accompagner([2, 0, 1, 3])
  const vignettes = modele.prestations.items.map((it) => {
    if (!it.photo || !modele.photos) return null
    const p = photoLibre(modele.photos.demo, it.photo)
    const deja = [heros, atelier, ...galerie].find((x) => x.base === p.base) || p
    if ((vues.get(deja.base) || 0) >= 2) return null
    compter(deja); return deja
  })
  // Les légendes et textes alternatifs des photos libres viennent du métier du modèle, jamais de la démo d'origine : la légende
  // « collecteurs, vannes et manomètres » d'une démo parlait plomberie sur une maquette de chauffagiste (maquette-qa, MQ-10)
  const activite = typo(modele.libelles?.activite || da.labelPluriel || 'travaux')
  for (const p of [heros, atelier, ...galerie, ...vignettes.filter(Boolean)]) if (p.provenance === 'libre') { p.legende = `Exemple de chantier — ${activite}`; p.alt = `Illustration : ${activite}` }
  const toutes = [...new Map([heros, atelier, ...galerie, fondContact, ...vignettes.filter(Boolean)].map((p) => [p.base, p])).values()]
  // le 1 600 px seulement pour ce qui couvre l'écran (héros, bande, fond du contact) : les autres s'arrêtent à 960
  const pleinCadre = new Set([heros.base, atelier.base, fondContact.base])
  for (const p of toutes) if (!pleinCadre.has(p.base)) p.largeurs = p.largeurs.filter((l) => l <= 960).length ? p.largeurs.filter((l) => l <= 960) : [p.largeurs[0]]
  const deLartisan = toutes.filter((p) => p.provenance === 'artisan')
  const libresUtilisees = toutes.filter((p) => p.provenance === 'libre')
  const mention = deLartisan.length ? MENTION_ARTISAN : MENTION_LIBRE

  // ── Les scènes ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  const a = modele.accueil
  const h1 = remplir(a.h1), h1Ligne = remplir(a.h1Ligne), chapeau = remplir(a.chapeau)
  // le crédit de la photo du haut, DANS le haut de la page (maquette-qa, MQ-11 : la capture montrée au prospect le porte)
  const creditHeros = `Photo : ${heros.auteur} · ${heros.licence}${/^oui\b/i.test(String(heros.modifiee || '')) ? ' · modifiée' : ''}`
  const heroHtml = `<section class="hero hero--plein" data-nav="sombre"><div class="hero__media">${picture(heros, { paresseuse: false })}</div><p class="hero__credit">${esc(creditHeros)}</p><div class="hero__contenu"><h1 style="${plafondsTitre(h1Ligne)}"><span class="h1__cle"><span>${esc(h1)}</span></span> <span class="h1__ligne"><span class="h1__ligne-in">${mots(h1Ligne)}</span></span></h1><div class="hero__pied"><p class="chapeau">${esc(chapeau)}</p><div class="hero__actions"><a class="bouton" href="#contact">Demander un devis <span class="bouton__cercle">${FLECHE}</span></a></div></div></div></section>`
  // le plateau : la place d'une phrase signée et de trois repères, que la maquette ne remplit PAS (rien n'est inventé sur l'entreprise)
  // (maquette-qa, MQ-4 : la phrase signée, le parcours et les trois repères portent « À compléter avec vous », sans chiffre)
  const VIDE = 'À compléter avec vous'
  const reperes = [['Votre expérience', VIDE], ['Votre zone d’intervention', VIDE], ['Ce qui vous distingue', VIDE]]
  const plateauHtml = `<section class="plateau" data-nav="sombre" aria-label="L’entreprise en bref"><div class="plateau__inner"><div class="plateau__haut"><figure class="plateau__citation reveal"><blockquote><p>${motsCitation(VIDE)}</p></blockquote><figcaption><span class="plateau__signe">Votre phrase · <span>signée de votre nom</span></span><span class="plateau__parcours maquette__vide">${VIDE}</span></figcaption></figure>${photoPlateau ? `<div class="plateau__photo reveal" style="--i:1">${picture(photoPlateau, { sizes: '(max-width: 767px) 100vw, 40vw' })}</div>` : ''}</div><dl class="chiffres">${reperes.map(([dt, v], i) => `<div class="chiffre reveal" style="--i:${i + 1}"><dt>${esc(dt)}</dt><dd><span class="chiffre__valeur maquette__vide">${esc(v)}</span></dd></div>`).join('')}</dl></div></section>`
  const presta = modele.prestations
  const prestaHtml = `<section class="scene scene--papier scene--presta" id="prestations"><div class="scene-large"><div class="scene__tete scene__tete--deux reveal"><h2 class="h2--scene">${masque(remplir(presta.h2))}</h2>${presta.intro ? `<p>${esc(remplir(presta.intro))}</p>` : ''}</div><ol class="presta">${presta.items.map((it, i) => `<li class="presta__ligne reveal" style="--i:${Math.min(i, 2)}"><span class="presta__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3>${esc(remplir(it.titre))}</h3><div class="presta__texte"><p>${esc(remplir(it.texte))}</p></div>${vignettes[i] ? `<div class="presta__vignette" aria-hidden="true" data-nav="sombre">${picture(vignettes[i], { sizes: '(max-width: 767px) 80vw, 11rem' })}</div>` : ''}</li>`).join('')}</ol><div class="presta__jauge" aria-hidden="true"><span></span></div></div></section>`
  const atelierHtml = `<section class="scene atelier" id="atelier" data-nav="sombre"><div class="atelier__media">${picture(atelier)}</div><div class="atelier__contenu"><h2 class="atelier__titre reveal">${masque(remplir(modele.atelier.h2))}</h2><p class="atelier__phrase reveal" style="--i:2">${esc(remplir(modele.atelier.phrase))}</p><p class="atelier__legende">${esc(atelier.legende)}</p></div></section>`
  const introReal = deLartisan.length >= 2 ? 'Des photos reprises de votre site actuel : on choisira ensemble celles à garder.' : remplir(modele.realisations.intro)
  const nn = (k) => String(k).padStart(2, '0')
  const items = galerie.map((p, i) => `<figure class="galerie__item${enPortrait(p) ? ' galerie__item--portrait' : ''} reveal" style="--i:${i}"><div class="galerie__cadre">${picture(p, { sizes: '(max-width: 767px) 85vw, (max-width: 1023px) 58vw, 56vw' })}</div><figcaption><span class="galerie__n">${nn(i + 1)}</span><span>${esc(p.legende)}</span></figcaption></figure>`).join('')
  const ligneCredits = () => {
    const parts = []
    if (deLartisan.length) parts.push(`Photos reprises du site de ${esc(entreprise)}${domaine ? ` (${esc(domaine)})` : ''} pour cet aperçu privé, à remplacer à votre convenance`)
    if (libresUtilisees.length) {
      const groupes = [...new Set(libresUtilisees.map((p) => `${p.auteur} (${p.licence}${/^oui\b/i.test(String(p.modifiee || '')) ? /BY-SA/i.test(p.licence) ? ', adaptation sous la même licence' : ', modifiée' : ''})`))]
      parts.push(`Illustrations sous licence libre : ${groupes.map(esc).join(', ')}`)
    }
    return `<p class="galerie__credits">${parts.join(' — ')}.</p>`
  }
  const galerieHtml = `<section class="section section--noir scene--galerie" id="realisations" data-nav="sombre"><div class="travelling" style="--n:${galerie.length}"><div class="travelling__epingle"><div class="scene-large"><div class="scene__tete galerie__tete reveal"><div><h2 class="h2--scene">${masque(remplir(modele.realisations.h2))}</h2><p>${esc(introReal)}</p></div><p class="compteur" aria-hidden="true"><span class="compteur__fenetre"><span class="compteur__piste" style="--n:${galerie.length}">${galerie.map((_, i) => `<span>${nn(i + 1)}</span>`).join('')}</span></span><span class="compteur__total">/ ${nn(galerie.length)}</span></p></div></div><div class="travelling__fenetre"><div class="galerie galerie--scene">${items}</div><div class="galerie__jauge" aria-hidden="true"><span></span></div></div><div class="scene-large travelling__credits">${ligneCredits()}</div></div></div></section>`
  const communes = [...new Set([ville, ...entree.communes.map(nomPropre)].filter(Boolean))].slice(0, 4)
  const communesHtml = `<section class="scene scene--papier scene--communes" id="communes"><div class="conteneur"><div class="scene__tete scene__tete--deux reveal"><h2>${masque(remplir(modele.zone.h2))}</h2>${modele.zone.intro ? `<p>${esc(remplir(modele.zone.intro))}</p>` : ''}</div></div><div class="communes">${communes.map((c) => `<span class="commune reveal"><span>${esc(c)}</span></span>`).join('')}<span class="commune commune--a-preciser reveal"><span>Et alentours</span></span></div></section>`
  const et = modele.etapes
  const etapesHtml = `<section class="section section--noir" id="etapes" data-nav="sombre"><div class="conteneur"><div class="etapes"><div class="etapes__tete reveal"><span class="mono">Comment ça se passe</span><h2>${masque(remplir(et.h2))}</h2>${et.intro ? `<p>${esc(remplir(et.intro))}</p>` : ''}${photoEtapes ? `<div class="etapes__photo">${picture(photoEtapes, { sizes: '(max-width: 959px) 100vw, 30rem' })}</div>` : ''}</div><ol class="etapes__liste">${et.items.map((it, i) => `<li class="etape" style="--k:${((i + 0.15) / et.items.length).toFixed(3)};--e:${i};--ne:${et.items.length}"><span class="etape__num" aria-hidden="true">${nn(i + 1)}</span><div class="etape__corps"><h3>${esc(remplir(it.titre))}</h3><p>${esc(remplir(it.texte))}</p></div></li>`).join('')}</ol><div class="etapes__jauge" aria-hidden="true"><span></span></div></div></div></section>`
  const faqHtml = `<section class="scene scene--papier scene--faq" id="questions"><div class="scene-large faq-scene"><div class="faq-scene__tete reveal"><h2>${masque(remplir(modele.faq.h2))}</h2></div>${photoFaq ? `<div class="faq-scene__photo" data-nav="sombre">${picture(photoFaq, { sizes: '(max-width: 959px) 100vw, 36vw' })}</div>` : ''}<div class="faq-scene__droite"><div class="faq reveal">${modele.faq.items.map((q) => `<details><summary>${esc(remplir(q.question))}</summary><div class="faq__corps"><p>${esc(remplir(q.reponse))}</p></div></details>`).join('')}</div></div></div></section>`
  const ct = modele.contact
  const option = (l) => l.map((x) => `<option>${esc(remplir(x))}</option>`).join('')
  const formHtml = `<div class="devis"><form class="devis__form" data-demo method="post" action="#contact" aria-label="Demande de devis"><div class="devis__champ"><label for="devis-projet">Votre projet</label><select id="devis-projet" name="projet" required><option value="">Choisir</option>${option(ct.projets)}</select></div><div class="devis__champ"><label for="devis-commune">Commune</label><select id="devis-commune" name="commune">${option([...communes, 'Autre commune'])}</select></div><div class="devis__champ"><label for="devis-delai">Quand</label><select id="devis-delai" name="delai"><option>Dès que possible</option><option>Dans les prochains mois</option><option>Plus tard, je me renseigne</option></select></div><div class="devis__champ devis__champ--large"><label for="devis-message">${esc(remplir(ct.message || 'Votre projet, en quelques mots'))}</label><textarea id="devis-message" name="message" rows="3"></textarea></div><div class="devis__champ devis__champ--large"><label for="devis-contact">Téléphone ou e-mail</label><input id="devis-contact" name="contact" type="text" autocomplete="tel" required></div><div class="devis__envoi"><button class="bouton" type="submit">Envoyer ma demande <span class="bouton__cercle">${FLECHE}</span></button><p class="devis__note">Maquette : rien n’est envoyé.</p></div></form><div class="devis__merci" hidden tabindex="-1" role="status"><p class="devis__merci-titre">Demande reçue.</p><p class="devis__note devis__note--merci">Maquette : aucune donnée n’a été envoyée.</p><dl class="devis__recap"><div><dt>Projet</dt><dd data-champ="projet">À préciser</dd></div><div><dt>Commune</dt><dd data-champ="commune">${esc(ville)}</dd></div><div><dt>Quand</dt><dd data-champ="delai">Dès que possible</dd></div></dl><button class="devis__encore" type="button">Faire une autre demande</button></div></div>`
  const contactHtml = `<section class="contact contact--photo contact--matiere" id="contact" data-nav="sombre"><div class="contact__media" aria-hidden="true">${picture(fondContact, { sizes: '(max-width: 899px) 200vw, 100vw' })}</div><div class="contact__inner"><div class="contact__tete reveal"><span class="mono">Contact</span><h2>${masque(remplir(ct.h2))}</h2>${ct.texte ? `<p>${esc(remplir(ct.texte))}</p>` : ''}</div>${formHtml}<div class="contact__infos"><div class="bande__infos"><div><strong>Intervention</strong> <span class="bande__ligne">${esc(communes.join(', '))} et alentours</span></div><div><strong>Coordonnées</strong> <span class="bande__ligne">Vos coordonnées, ici</span></div></div></div></div></section>`

  const liens = [['prestations', 'Prestations'], ['realisations', 'Réalisations'], ['communes', 'Zone'], ['questions', 'Questions']].map(([id, t]) => `<a href="#${id}">${t}</a>`).join('')
  const initiale = esc((entreprise.replace(/^(SARL|SAS|SASU|EURL|EI|EIRL|SA)\s+/, '')[0] || 'A').toUpperCase())
  const marque = `<svg class="marque" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.6" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="20" y="27" text-anchor="middle" font-family="var(--police-display)" font-size="20" fill="currentColor">${initiale}</text></svg>`
  const familles = ['recit', 'survol', 'telephone']
  const lire = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')
  const cssFamilles = familles.map((n) => sansCommentaires(lire(path.join(KIT, 'familles', `${n}.css`)))).filter(Boolean)
  const cssBureau = familles.map((n) => sansCommentaires(lire(path.join(KIT, 'familles', `${n}.bureau.css`)))).filter(Boolean).join('\n')
  const jsFamilles = familles.map((n) => lire(path.join(KIT, 'familles', `${n}.js`))).filter(Boolean)
  const display = da.display, texte = 'IBM Plex Sans'
  const polices = [...new Set([display, texte])]
  const faces = polices.map((f) => `@font-face{font-family:'${f}';src:url('fonts/${slug(f)}.woff2') format('woff2');font-weight:100 900;font-display:swap}`).join('\n')
  const tokens = `:root{--accent:${da.accent};--accent-texte:${da.accentTexte};--fond:${da.fond};--fond-2:${da.fond2};--encre:${da.encre};--encre-2:${da.encre2};--ligne:${da.ligne};--rayon:${da.rayon};--police-display:'${display}',Georgia,serif;--police-texte:'${texte}',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;--graisse-titre:${da.graisse || 500};--graisse-ligne:${da.graisseLigne || da.graisse || 400};--graisse-marque:${da.graisseMarque || 600};--approche-titre:${da.approche || '-0.025em'};--ombre:${da.ombre || '0 30px 60px -28px rgba(20,25,35,.35)'};--grain:${da.grain || '.08'};--grain-mode:${da.grainMode || 'multiply'}}\n.mono{color:var(--accent-texte)}\n${da.casse ? `h1,h2{text-transform:${da.casse};letter-spacing:.01em}` : ''}`
  // L'habillage propre à la maquette : la mention d'aperçu privé (en bas d'écran, présente sur chaque capture et dans la vidéo),
  // les repères du plateau à compléter, la commune « et alentours »
  const cssMaquette = `.apercu{position:fixed;z-index:120;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);width:max-content;max-width:calc(100vw - 24px);padding:.55rem 1rem;border-radius:999px;background:rgba(14,11,8,.86);color:#fff;font:500 12.5px/1.35 var(--police-texte);letter-spacing:.01em;text-align:center;box-shadow:0 10px 30px -12px rgba(0,0,0,.5);backdrop-filter:blur(8px)}
.apercu strong{font-weight:600;color:#F3D9B8}
.maquette__vide{font-family:var(--police-texte)!important;font-size:clamp(1rem,1.4vw,1.25rem)!important;font-style:italic;letter-spacing:0!important;opacity:.62;border-bottom:1px dashed currentColor;padding-bottom:.2rem}
.commune--a-preciser{opacity:.4}
.hero__credit{position:absolute;z-index:3;right:clamp(1rem,3vw,2.5rem);top:calc(var(--nav-h,64px) + 1.25rem);margin:0;max-width:min(26rem,calc(100% - 2rem));padding:.35rem .6rem;border-radius:4px;background:rgba(10,7,4,.62);color:#fff;font:500 11px/1.35 var(--police-texte);letter-spacing:.01em}
.galerie__credits{font-size:12px}
@media(max-width:767px){.apercu{font-size:11.5px;padding:.5rem .8rem;border-radius:14px;width:calc(100vw - 24px)}.hero--plein .hero__pied{padding-bottom:96px}.hero__credit{top:auto;bottom:66px;left:20px;right:auto}}`
  const stylesCss = `/* ${entreprise} — maquette privée, direction « ${da.label} » — source commentée : _kit/kit.css */\n${faces}\n${tokens}\n${sansCommentaires(lire(path.join(KIT, 'kit.css')))}\n${cssFamilles.join('\n')}\n${CSS_TITRE}${cssMaquette}\n`
  // le pied : la provenance de chaque photo, mot pour mot (les photos de l'artisan, puis « Photos d’illustration : auteur (licence) »)
  const piedPhotos = () => [deLartisan.length ? `Photos reprises de votre site${domaine ? ` (${esc(domaine)})` : ''}, à remplacer à votre convenance` : '', libresUtilisees.length ? `Photos d’illustration : ${[...new Set(libresUtilisees.map((p) => `${p.auteur} (${p.licence}${/^oui/i.test(String(p.modifiee || '')) ? ', modifiée' : ''})`))].map(esc).join(', ')}` : ''].filter(Boolean).join(' · ')
  const titre = remplir(a.title)
  const html = `<!doctype html>
<html lang="fr" class="no-js${da.texture === 'grain' ? ' texture--grain' : da.texture === 'papier' ? ' texture--papier' : ''} da--etapes da--communes da--nav-retenue">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(remplir(a.description || ''))}">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="theme-color" content="#0E0A07">
<meta name="maquette" content="v2 ${esc(nomModele)} photos-artisan:${deLartisan.length} photos-libres:${libresUtilisees.length}">
<link rel="preload" href="fonts/${slug(display)}.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css">
${cssBureau ? '<link rel="stylesheet" href="bureau.css" media="(min-width: 1024px)">\n' : ''}<script>document.documentElement.classList.replace('no-js','js')</script>
<script src="site.js" defer></script>
</head>
<body>
<header class="nav nav--claire"><div class="conteneur nav__inner">
<a class="nav__marque" href="#">${marque}<span>${esc(entreprise)}</span></a>
<nav class="nav__liens" aria-label="Sections">${liens}</nav>
<div class="nav__droite"><a class="nav__devis" href="#contact">Devis</a><button class="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="panneau"><span></span><span></span></button></div>
</div></header>
<div class="voile" aria-hidden="true"></div>
<div class="panneau" id="panneau">
<nav aria-label="Menu">${liens}<a href="#contact">Contact</a></nav>
<div><a class="bouton" href="#contact">Demander un devis <span class="bouton__cercle">${FLECHE}</span></a></div>
</div>
<main><div class="ouverture">${heroHtml}${plateauHtml}</div>${prestaHtml}${atelierHtml}${galerieHtml}${communesHtml}${etapesHtml}${faqHtml}${contactHtml}</main>
<footer class="pied"><div class="conteneur">
<div class="pied__grille">
<div><div class="nav__marque" style="margin-bottom:.75rem">${marque}<span>${esc(entreprise)}</span></div><p>${esc(modele.libelles?.metier || da.label)} à ${esc(ville)}</p></div>
<div><p class="pied__titre">Zone</p><ul>${communes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>
<div><p class="pied__titre">Cet aperçu</p><ul><li>Maquette privée, non publiée</li><li>Textes à valider avec vous</li></ul></div>
</div>
<div class="pied__bas"><span>Maquette privée préparée pour ${esc(entreprise)}. Rien n’est publié.</span><span>${piedPhotos()}</span></div>
</div></footer>
<aside class="apercu" role="note">Aperçu privé pour <strong>${esc(entreprise)}</strong> · ${esc(mention)}</aside>
</body>
</html>
`

  // ── Les contrôles, avant toute écriture ───────────────────────────────────────────────────────────────────────────────
  verifierMaquette(html, { entreprise, artisan: deLartisan.length })

  fs.rmSync(sortie, { recursive: true, force: true })
  fs.mkdirSync(path.join(sortie, 'images'), { recursive: true })
  fs.mkdirSync(path.join(sortie, 'fonts'), { recursive: true })
  for (const f of polices) fs.copyFileSync(path.join(DEMOS, '_polices', slug(f), `${slug(f)}.woff2`), path.join(sortie, 'fonts', `${slug(f)}.woff2`))
  for (const p of toutes) await p.copier(path.join(sortie, 'images'))
  fs.writeFileSync(path.join(sortie, 'index.html'), html)
  fs.writeFileSync(path.join(sortie, 'styles.css'), stylesCss)
  if (cssBureau) fs.writeFileSync(path.join(sortie, 'bureau.css'), cssBureau)
  fs.writeFileSync(path.join(sortie, 'site.js'), [lire(path.join(KIT, 'kit.js')), ...jsFamilles].join('\n;\n'))
  // une entrée par fichier (maquette-qa, MQ-5 et MQ-11 retrouvent chaque image par son champ `fichier`)
  fs.writeFileSync(path.join(sortie, 'attributions.json'), JSON.stringify(toutes.flatMap(({ copier, ...p }) => p.largeurs.map((l) => ({ fichier: `images/${p.base}-${l}.webp`, ...p }))), null, 2))
  const rapport = { version: 2, modele: nomModele, scenes: SCENES, photos_artisan: deLartisan.length, photos_libres: libresUtilisees.length, heros: heros.provenance, mention }
  fs.writeFileSync(path.join(sortie, 'rapport.json'), JSON.stringify(rapport, null, 2))
  return rapport
}

/** Les garde-fous du HTML rendu (exportés : le juge de l'Atelier les rejoue sur ses sabotages). */
export function verifierMaquette(html, { entreprise = '', artisan = 0 } = {}) {
  const corps = html.slice(html.indexOf('<body'))
  const visible = texteDe(corps)
  const ids = { hero: /<section class="hero hero--plein/, plateau: /<section class="plateau/, prestations: /id="prestations"/, atelier: /id="atelier"/, realisations: /id="realisations"/, communes: /id="communes"/, etapes: /id="etapes"/, questions: /id="questions"/, contact: /id="contact"/ }
  for (const [nom, re] of Object.entries(ids)) if (!re.test(corps)) throw new Error(`scène « ${nom} » absente`)
  if (/\{[a-z_]+\}/.test(visible)) throw new Error('un emplacement {…} reste dans le texte')
  for (const re of CLICHES) { const m = re.exec(visible); if (m) throw new Error(`formule refusée : « ${visible.slice(Math.max(0, m.index - 30), m.index + 30).trim()} »`) }
  const droite = /\p{L}'(?=\p{L})/u.exec(visible)
  if (droite) throw new Error(`apostrophe droite : « ${visible.slice(Math.max(0, droite.index - 20), droite.index + 20)} »`)
  const nbPresta = (corps.match(/class="presta__ligne/g) || []).length
  if (nbPresta < 5) throw new Error(`${nbPresta} prestations (5 au moins)`)
  const nGal = (corps.match(/class="galerie__item/g) || []).length
  if (nGal < 2 || nGal > 4) throw new Error(`la galerie compte ${nGal} photos (2 à 4)`)
  if ((corps.match(/class="etape"/g) || []).length !== 4) throw new Error('4 étapes attendues')
  if ((corps.match(/<details>/g) || []).length < 4) throw new Error('4 questions au moins')
  if (!/<form class="devis__form" data-demo/.test(corps)) throw new Error('le formulaire de démonstration manque')
  for (const m of corps.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)) { const n = nbMots(texteDe(m[1])); if (n < 2 || n > 6) throw new Error(`h2 « ${texteDe(m[1]).trim()} » de ${n} mots (2 à 6)`) }
  // aucune photo plus de deux fois (une photo = une base, toutes largeurs confondues)
  const vues = new Map()
  for (const pic of corps.match(/<picture\b[\s\S]*?<\/picture>/g) || []) { const b = /images\/([a-z0-9-]+)-\d+\.webp/.exec(pic)?.[1]; if (b) vues.set(b, (vues.get(b) || 0) + 1) }
  const trop = [...vues].filter(([, n]) => n > 2)
  if (trop.length) throw new Error(`photo affichée plus de deux fois : ${trop.map(([b]) => b).join(', ')}`)
  // la provenance des photos, dite en clair
  if (artisan > 0 && !visible.includes(MENTION_ARTISAN)) throw new Error('les photos de l’artisan sont montrées sans la mention de provenance')
  if (artisan === 0 && !visible.includes(MENTION_LIBRE)) throw new Error('la mention des photos d’illustration manque')
  if (artisan > 0 && !/<section class="hero hero--plein[\s\S]*?images\/artisan-\d+-/.test(corps.slice(0, corps.indexOf('</section>') + 10))) throw new Error('le site a des photos : le héros doit en être une')
  if (!/noindex/.test(html)) throw new Error('noindex manquant')
  if (entreprise && !visible.includes(entreprise)) throw new Error('le nom de l’entreprise n’apparaît pas')
  // deux scènes voisines jamais sur le même fond
  const main = corps.slice(corps.indexOf('<main>'), corps.indexOf('</main>'))
  const fonds = main.split(/(?=<section\b)/).filter((b) => b.startsWith('<section')).map((b) => { const c = /^<section class="([^"]*)"/.exec(b)?.[1] || ''; return /\b(?:hero--plein|atelier|contact--photo)\b/.test(c) ? 'photo' : /\b(?:plateau|section--noir|contact)\b/.test(c) ? 'noir' : 'papier' })
  for (let i = 1; i < fonds.length; i++) if (fonds[i] === fonds[i - 1]) throw new Error(`deux scènes voisines sur le même fond (${fonds[i]})`)
  return true
}
