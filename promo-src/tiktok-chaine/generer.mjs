#!/usr/bin/env node
// Chaîne de production des vidéos TikTok « Brico Travaux » (format B : présentation animée des photos
// réelles du produit) AVEC VOIX OFF. Une LIGNE du calendrier → deux vidéos 1080 × 1920 :
//   sorties/<id>-voix.mp4           voix seule (pour poser au dépôt un son TikTok « tendance » de la bibliothèque commerciale)
//   sorties/<id>-voix-musique.mp4   voix + musique licenciée du manifeste, sous la voix (seulement si une piste est licenciée)
//
//   node promo-src/tiktok-chaine/generer.mjs lignes/j1-aspirateur.json [autres lignes…]
//        [--sortie=DOSSIER] [--brouillon] [--sans-rendu] [--travail=DOSSIER]
//   node promo-src/tiktok-chaine/generer.mjs --file[=/home/agents/travail/tiktok]
//        → mode agent (usine) : traite a-produire/*.json, écrit sorties/, range faites/ ou echecs/.
//
// Ordre : ligne validée → voix (garde Fish du dépôt, sinon Kokoro ff_siwis ; cache clé sur le texte) → écoute de chaque
// réplique (faster-whisper : temps réels des mots, refus si la voix ne dit pas le texte affiché) → plans calés sur les
// temps forts de la musique (ou 128 BPM sans piste) et assez longs pour leur réplique → rendu HyperFrames muet → piste
// de voix (-14 LUFS) et, si une piste est licenciée, voix + musique (ducking) → ÉCOUTE de la vidéo finale (le texte dit
// doit être le texte affiché) → rapport.json.
// Variables : FFMPEG, FFPROBE, HYPERFRAMES_BIN, PRODUCER_HEADLESS_SHELL_PATH, TIKTOK_BASE, TIKTOK_CACHE, TIKTOK_GSAP,
// TIKTOK_FENETRE_INTERDITE (« 5-20 »), TIKTOK_MARGE_MIN, TIKTOK_PYTHON, TIKTOK_WHISPER, TIKTOK_VOIX_VITESSE, TIKTOK_MUSIQUE.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { ICI, RACINE_DEPOT, outils, envEnfant, lancer, sonder, rapatrier, preparer } from './outils.mjs'
import { CONSTRUCTEURS as CLASSIQUES, transition as transitionClassique, mots } from './plans.mjs'
import { CONSTRUCTEURS as KEYNOTE, transition as transitionKeynote } from './plans-keynote.mjs'

/** Styles d'animation : « classique » (rubans, coupes balayées) ou « keynote » (whip, cartes 3D, morph, pilule). */
export const STYLES = { classique: { constructeurs: CLASSIQUES, transition: transitionClassique }, keynote: { constructeurs: KEYNOTE, transition: transitionKeynote } }
const CONSTRUCTEURS = CLASSIQUES
import { choisirFournisseur, produireVoix, transcrire, ressemblance } from './voix.mjs'
import { choisirPiste, grille as grilleDe, lireManifeste, defautsLicence } from './musique.mjs'
import { pisteVoix, pisteVoixMusique, poserSon, extraireSon, mesurerNiveau, silences } from './son.mjs'

const HF_VERSION = '0.8.33' // la même que l'usine (outils-pubs) : un rendu ici = un rendu là-bas
const WIN = process.platform === 'win32'
export const DUREE_MIN = 12, DUREE_MAX = 26
const AVANCE = 0.06 // la voix part juste après la coupe
const SOUFFLE = 0.14 // silence minimal entre la fin d'une réplique et la coupe suivante

// ───────────────────────────── Lecture d'une ligne ─────────────────────────────

function lireJSON(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')) } catch (e) { throw new Error(`${f} : JSON illisible (${e.message})`) }
}

function chargerProduit(nom) {
  const f = path.join(ICI, 'produits', `${nom}.json`)
  if (!fs.existsSync(f)) throw new Error(`produit inconnu « ${nom} » (attendu : ${path.relative(RACINE_DEPOT, f)})`)
  return lireJSON(f)
}

/** Contrôles de la ligne AVANT tout rendu : une erreur de saisie ne doit jamais coûter un rendu. */
function valider(L, produit) {
  const E = []
  if (!/^[a-z0-9-]{3,60}$/.test(L.id || '')) E.push('id : minuscules, chiffres et tirets (ex. j1-aspirateur)')
  if (!L.accroche) E.push('accroche manquante')
  if (!Array.isArray(L.gestes) || L.gestes.length < 3 || L.gestes.length > 7) E.push('gestes : 3 à 7 plans')
  if (!L.benefice) E.push('benefice manquant')
  const chiffre = /\d|%|€|\$|x\s?\d|\bfois\b/i
  const textes = [L.accroche, L.benefice, L.appel, L.revelation?.texte, ...(L.gestes || []).map((g) => g.texte)].filter(Boolean)
  for (const t of textes) if (chiffre.test(t)) E.push(`« ${t} » : aucun chiffre, prix ni performance dans le texte (règle du kit ; écrire les nombres en lettres)`)
  for (const g of L.gestes || []) {
    if (!g.texte) E.push(`geste ${g.plan} sans texte : chaque plan a sa réplique`)
    if (!CONSTRUCTEURS[g.plan]) E.push(`geste « ${g.texte} » : plan inconnu ${g.plan}`)
    for (const n of [g.image, g.outil].filter(Boolean)) if (!produit.images[n]) E.push(`image « ${n} » absente de produits/${L.produit}.json`)
    if (g.plan === 'loupe' && !produit.images[g.image]?.points?.[g.point]) E.push(`loupe « ${g.texte} » : point « ${g.point} » non défini sur l'image ${g.image}`)
  }
  for (const n of [L.outilAccroche, L.revelation?.image, L.imageBenefice, L.imageAppel].filter(Boolean)) if (!produit.images[n]) E.push(`image « ${n} » absente de produits/${L.produit}.json`)
  if (E.length) throw new Error('ligne refusée :\n  - ' + E.join('\n  - '))
}

/** « a | b » → [a, b] ; sinon coupe vers 55 % des mots (jamais un mot seul en tête). */
function couper(texte) {
  if (texte.includes('|')) { const [x, ...y] = texte.split('|'); return [x.trim(), y.join(' ').trim()] }
  const m = mots(texte)
  const k = Math.max(1, Math.min(m.length - 1, Math.round(m.length * 0.55)))
  return [m.slice(0, k).join(' '), m.slice(k).join(' ')]
}

/** Les répliques dites, dans l'ordre : chacune porte ses mots AFFICHÉS (le texte dit = le texte affiché). */
function repliquesDe(L, produit) {
  const [a1, a2] = couper(L.accroche)
  const [b1, b2] = couper(L.benefice)
  const rev = { ...(produit.revelation || {}), ...(L.revelation || {}) }
  const R = [
    { cle: 'accroche', parties: [a1, a2] },
    { cle: 'revelation', parties: [rev.texte || produit.titre] },
    ...L.gestes.map((g, k) => ({ cle: `geste${k}`, parties: [g.texte] })),
    { cle: 'benefice', parties: [b1, b2] },
    { cle: 'appel', parties: [L.appel || 'Lien dans la bio'] },
  ]
  const pron = produit.prononciations || {}
  for (const r of R) {
    r.texte = r.parties.join(' ')
    r.affiches = r.parties.flatMap(mots)
    r.coupe = mots(r.parties[0]).length // indice du premier mot de la 2ᵉ partie
    let dit = r.texte
    for (const [ecrit, prononce] of Object.entries(pron)) dit = dit.replace(new RegExp(`\\b${ecrit}\\b`, 'g'), prononce)
    if (dit !== r.texte) r.prononciation = dit
  }
  return R
}

// ───────────────────────────── Découpage en plans calés sur les temps forts ─────────────────────────────

const ENTREES = ['balaye', 'flash', 'balaye-g', 'monte', 'coupe', 'balaye', 'flash']

/**
 * Chaque plan commence sur un temps fort et dure assez de temps pour sa réplique (voix + souffle).
 * G.t(k) = instant du k-ième temps fort. Les mots affichés reçoivent les instants où la voix les dit.
 */
function decouper(L, produit, V, G, style = 'classique') {
  const keynote = style === 'keynote'
  const imgP = produit.imagePrincipale
  const plans = []
  const poses = []
  let b = 0
  // plus petit n ≥ min tel que le temps fort (debut + n) arrive après `fin`
  const temps = (debut, fin, min) => { let n = min; while (G.t(debut + n) < fin) n++; return n }
  // plus grand n ≥ min tel que le temps fort (debut + n) arrive avant `limite` (coupe interne d'une réplique en deux plans)
  const avant = (debut, limite, min) => { let n = min; while (G.t(debut + n + 1) <= limite) n++; return n }
  const pousser = (P, nb, motsT) => { plans.push({ ...P, debutTemps: b, nbTemps: nb, motsT }); b += nb }
  const dire = (r, t) => { poses.push({ wav: r.wav, debut: t, cle: r.cle }); return r.temps.map((x) => Math.round((t + x) * 1000) / 1000) }

  // Accroche : une réplique sur deux temps de la même scène ; la coupe interne tombe sur le temps fort qui précède la 2ᵉ partie.
  const A = V.accroche
  const tA = dire(A, 0.03)
  const n1 = Math.max(2, avant(0, tA[A.coupe] + 0.02, 1))
  const nA = temps(0, 0.03 + A.duree + SOUFFLE, n1 + 2)
  pousser({ type: 'accroche', scene: L.probleme, outil: L.outilAccroche || imgP, parties: A.parties, temps1: n1, temps2: nA - n1, motsT1: tA.slice(0, A.coupe), motsT2: tA.slice(A.coupe) }, nA, tA)

  const simple = (r, P, min = 2) => {
    const t0 = G.t(b) + AVANCE
    const T = dire(r, t0)
    pousser(P, temps(b, t0 + r.duree + SOUFFLE, min), T)
  }
  const rev = { ...(produit.revelation || {}), ...(L.revelation || {}) }
  // keynote : la révélation (point lumineux → produit) prend deux temps de plus, ceux du plan d'appel supprimé.
  simple(V.revelation, { type: 'produit', revelation: true, image: rev.image || imgP, texte: V.revelation.texte, motFond: produit.motFond, entree: 'zoom' }, keynote ? 4 : 2)
  let nProduit = 0
  L.gestes.forEach((g, k) => simple(V[`geste${k}`], {
    miroir: g.miroir ?? (g.plan === 'produit' && nProduit++ % 2 === 0),
    type: g.plan, image: g.image, outil: g.outil, scene: g.scene, point: g.point, zoom: g.zoom, mouvement: g.mouvement,
    texte: g.texte, fond: g.fond, motFond: g.motFond || produit.motFond, entree: g.entree || ENTREES[k % ENTREES.length],
  }))

  // Bénéfice : une réplique sur deux plans (gros plan, puis le produit entier) ; coupe interne sur le temps fort.
  const B = V.benefice
  const tB0 = G.t(b) + AVANCE
  const tB = dire(B, tB0)
  const m1 = Math.max(2, avant(b, tB[B.coupe] + 0.02, 1))
  const nB = temps(b, tB0 + B.duree + SOUFFLE, m1 + 2)
  pousser({ type: 'benefice', image: L.imageBenefice || imgP, texte: B.parties[0], variante: 0, entree: 'zoom' }, m1, tB.slice(0, B.coupe))
  pousser({ type: 'benefice', image: L.imageBenefice || imgP, texte: B.parties[1], variante: 1, entree: 'coupe' }, nB - m1, tB.slice(B.coupe))

  const appelTxt = V.appel.texte
  if (keynote) {
    // Une seule fois « Lien dans la bio » : dans la clôture (pilule + phrase dite), assez longue pour se poser.
    simple(V.appel, { type: 'appel', image: L.imageAppel || imgP, texte: appelTxt, variante: 1, marque: produit.marque || 'Brico Travaux', entree: 'flash' }, 4)
  } else {
    simple(V.appel, { type: 'appel', image: L.imageAppel || imgP, texte: appelTxt, variante: 0, motFond: produit.motFond, entree: 'flash' })
    pousser({ type: 'appel', image: L.imageAppel || imgP, texte: appelTxt, variante: 1, marque: produit.marque || 'Brico Travaux', entree: 'monte' }, 3)
  }

  plans.forEach((P, i) => {
    P.i = i; P.id = `p${i}`
    P.t0 = G.t(P.debutTemps); P.d = Math.round((G.t(P.debutTemps + P.nbTemps) - P.t0) * 1000) / 1000
    if (P.type === 'accroche') { P.d1 = Math.round((G.t(P.temps1) - P.t0) * 1000) / 1000; P.d2 = Math.round((P.d - P.d1) * 1000) / 1000 }
  })
  const duree = G.t(b)
  if (duree < DUREE_MIN || duree > DUREE_MAX) throw new Error(`durée ${duree.toFixed(2)} s hors de ${DUREE_MIN}-${DUREE_MAX} s (raccourcir les répliques)`)
  return { plans, poses, bpm: G.bpm, temps: G.pas, duree }
}

// ───────────────────────────── Images ─────────────────────────────

async function preparerImages(O, produit, noms, dossierAssets, cache) {
  const R = {}
  for (const nom of noms) {
    const spec = produit.images[nom]
    const empreinte = crypto.createHash('sha1').update(JSON.stringify([spec.url, spec.recadrage, spec.decoupe, spec.largeur, spec.seuilBlanc, spec.masques, 3])).digest('hex').slice(0, 12)
    const ext = spec.decoupe && spec.decoupe !== 'aucune' ? 'png' : 'jpg'
    const prepare = path.join(cache, 'prepares', `${nom}-${empreinte}.${ext}`)
    const meta = prepare + '.json'
    let geo
    if (fs.existsSync(prepare) && fs.existsSync(meta)) geo = lireJSON(meta)
    else {
      const source = await rapatrier(spec.url, path.join(cache, 'sources'))
      fs.mkdirSync(path.dirname(prepare), { recursive: true })
      geo = preparer(O, source, spec, prepare)
      fs.writeFileSync(meta, JSON.stringify(geo))
    }
    const fichier = `${nom}.${ext}`
    fs.copyFileSync(prepare, path.join(dossierAssets, fichier))
    const versLocal = ([px, py]) => [(px - geo.x) * geo.k - geo.bx, (py - geo.y) * geo.k - geo.by]
    const points = Object.fromEntries(Object.entries(spec.points || {}).map(([k, p]) => [k, versLocal(p)]))
    R[nom] = {
      fichier: `assets/${fichier}`, largeur: geo.largeur, hauteur: geo.hauteur, decoupe: ext === 'png', fondu: !!spec.fonduBas,
      focale: spec.focale, points, bec: points.bec ? [points.bec[0] / geo.largeur, points.bec[1] / geo.hauteur] : undefined,
    }
  }
  return R
}

function cheminGsap() {
  const essais = [process.env.TIKTOK_GSAP, path.join(RACINE_DEPOT, 'node_modules', 'gsap', 'dist', 'gsap.min.js')]
  try { essais.push(createRequire(import.meta.url).resolve('gsap/dist/gsap.min.js')) } catch {}
  const f = essais.find((x) => x && fs.existsSync(x))
  if (!f) throw new Error('gsap.min.js introuvable (npm install à la racine du dépôt, ou TIKTOK_GSAP=…)')
  return f
}

/** HyperFrames : le binaire installé (usine), sinon npx lancé par node lui-même (pas de shell sous Windows). */
function commandeHyperframes(O) {
  if (O.hyperframes) return /.(cmd|bat)$/i.test(O.hyperframes) ? [O.hyperframes, []] : [process.execPath, [O.hyperframes]]
  const npxCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js')
  if (fs.existsSync(npxCli)) return [process.execPath, [npxCli, '--yes', `hyperframes@${HF_VERSION}`]]
  return [WIN ? 'npx.cmd' : 'npx', ['--yes', `hyperframes@${HF_VERSION}`]]
}

// ───────────────────────────── Une vidéo ─────────────────────────────

export async function produire(fichierLigne, { sortie, travail, cache, brouillon = false, sansRendu = false, style: styleOpt, journal = console.log } = {}) {
  const L = typeof fichierLigne === 'string' ? lireJSON(fichierLigne) : fichierLigne
  const style = styleOpt || L.style || process.env.TIKTOK_STYLE || 'keynote'
  if (!STYLES[style]) throw new Error(`style inconnu « ${style} » (${Object.keys(STYLES).join(', ')})`)
  const produit = chargerProduit(L.produit)
  valider(L, produit)
  const O = outils()
  if (!O.ffmpeg || !O.ffprobe) throw new Error('ffmpeg/ffprobe introuvables (FFMPEG=…, ou dans le PATH)')

  // 1. Musique (seulement une piste licenciée du manifeste) et grille des temps forts.
  const piste = choisirPiste(L)
  const G = grilleDe(piste, L.bpm || 128)
  journal(`[${L.id}] grille : ${G.source} ; style : ${style}`)

  // 2. Voix : fournisseur décidé par la garde du dépôt, puis répliques (cache clé sur le texte) écoutées une à une.
  const R = repliquesDe(L, produit)
  const F = await choisirFournisseur(L.id, R.map((r) => r.texte).join(' '), { journal })
  journal(`[${L.id}] voix : ${F.fournisseur === 'fish' ? `Fish Audio (${F.voix}, forfait commercial prouvé)` : 'Kokoro ff_siwis (locale)'}${F.manifeste.raison_repli ? ` — Fish écarté : ${F.manifeste.raison_repli}` : ''}`)
  await produireVoix(R, F, cache, { journal })
  const V = Object.fromEntries(R.map((r) => [r.cle, r]))

  // 3. Plans calés sur la grille, assez longs pour leur réplique.
  const { plans, poses, bpm, temps, duree } = decouper(L, produit, V, G, style)

  const projet = path.join(travail, L.id)
  fs.rmSync(projet, { recursive: true, force: true })
  fs.mkdirSync(path.join(projet, 'assets'), { recursive: true })
  const noms = new Set([produit.imagePrincipale])
  for (const P of plans) for (const n of [P.image, P.outil]) if (n) noms.add(n)
  const images = await preparerImages(O, produit, [...noms], path.join(projet, 'assets'), cache)
  fs.copyFileSync(cheminGsap(), path.join(projet, 'assets', 'gsap.min.js'))

  const S = STYLES[style]
  const ctx = {
    js: [], defs: [], bpm, style,
    img: (n) => { if (!images[n]) throw new Error(`image ${n} non préparée`); return images[n] },
    point: (n, p) => { const v = images[n]?.points?.[p]; if (!v) throw new Error(`point ${p} absent de l'image ${n}`); return v },
  }
  const blocs = []
  plans.forEach((P, i) => {
    if (style === 'keynote') P.derive = ctx.js // chaque plan dérive (aucun plan figé)
    blocs.push(S.constructeurs[P.type](ctx, P))
    if (i > 0) S.transition(ctx, plans[i - 1], P)
  })
  const gabarit = fs.readFileSync(path.join(ICI, 'gabarit.html'), 'utf8')
  const html = gabarit
    .replace('{{TITRE}}', `Brico Travaux — ${L.id}`)
    .replaceAll('{{DUREE}}', String(duree))
    .replace('{{PLANS}}', () => blocs.join('\n'))
    .replace('{{SCRIPT}}', () => ctx.js.map((l) => '      ' + l).join('\n'))
  fs.writeFileSync(path.join(projet, 'index.html'), html.replace('{{DEFS}}', () => ctx.defs.join('')).replace('data-composition-id="main"', `data-composition-id="main" data-style="${style}"`))
  fs.writeFileSync(path.join(projet, 'hyperframes.json'), JSON.stringify({
    $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
    paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
  }, null, 2))

  const coupes = plans.flatMap((P) => (P.type === 'accroche' ? [P.t0 + P.d1] : [P.t0])).filter((t) => t > 0)
  const reperes = [
    `Repères de rythme — ${L.id}`,
    `Grille : ${G.source} (un temps ≈ ${temps.toFixed(4)} s, ${bpm} BPM). Durée : ${duree} s.`,
    piste ? `Musique incrustée (version voix + musique) : ${piste.titre} — ${piste.artiste} (TikTok Studio, son ${piste.licence.music_id}).`
      : `Aucune piste licenciée au manifeste : publier la version voix seule et choisir au dépôt un son de la bibliothèque commerciale autour de ${bpm} BPM, premier temps fort sur 0,00 s, volume du son bas (voix devant).`,
    `Coupes (s) : ${coupes.map((c) => c.toFixed(2)).join(' · ')}`,
    '',
    ...plans.map((P) => `${P.t0.toFixed(2).padStart(6)} s  ${P.type.padEnd(11)} ${(P.texte || P.parties?.join(' / ') || '').replace(/\s+/g, ' ')}`),
  ].join('\n')

  fs.mkdirSync(sortie, { recursive: true })
  const dossierVerif = path.join(sortie, L.id)
  fs.mkdirSync(dossierVerif, { recursive: true })
  fs.writeFileSync(path.join(dossierVerif, 'reperes.txt'), reperes + '\n')
  fs.copyFileSync(path.join(projet, 'index.html'), path.join(dossierVerif, 'composition.html')) // le juge y lit les instants des sous-titres
  journal(`[${L.id}] ${plans.length} plans, ${duree} s, ${R.length} répliques → ${projet}`)
  if (sansRendu) return { id: L.id, projet, duree, plans: plans.length }

  // 4. Rendu HyperFrames MUET (le binaire de l'usine si présent, sinon npx à la même version).
  const muet = path.join(projet, 'rendu-muet.mp4')
  const env = envEnfant(O)
  const [cmd, pre] = commandeHyperframes(O)
  const t0 = Date.now()
  let r, journalRendu
  for (let essai = 1; essai <= 2; essai++) {
    r = lancer(cmd, [...pre, 'render', '--quality', brouillon ? 'draft' : 'high', '--output', muet], { cwd: projet, env, minutes: 40 })
    journalRendu = (r.sortie || '') + (r.erreur || '')
    // Sur une machine saturée, « ffmpeg -version » peut dépasser le délai de HyperFrames : un second essai suffit.
    if (r.code === 0 || !/FFmpeg cannot start/.test(journalRendu)) break
  }
  fs.writeFileSync(path.join(dossierVerif, 'rendu.log'), journalRendu)
  if (r.code !== 0 || !fs.existsSync(muet)) throw new Error(`rendu HyperFrames en échec (code ${r.code}) : ${journalRendu.slice(-800)}`)

  // 5. Le son : voix seule, et voix + musique si une piste est licenciée.
  const sorties = {}
  const voixWav = path.join(projet, 'voix.wav')
  pisteVoix(O, poses, duree, voixWav)
  sorties.voix = path.join(sortie, `${L.id}-voix.mp4`)
  poserSon(O, muet, voixWav, duree, sorties.voix)
  if (piste) {
    const mixWav = path.join(projet, 'voix-musique.wav')
    pisteVoixMusique(O, voixWav, piste, piste.chemin, duree, mixWav)
    sorties.musique = path.join(sortie, `${L.id}-voix-musique.mp4`)
    poserSon(O, muet, mixWav, duree, sorties.musique)
  } else fs.rmSync(path.join(sortie, `${L.id}-voix-musique.mp4`), { force: true }) // jamais une version musique d'un rendu précédent
  fs.rmSync(path.join(sortie, `${L.id}.mp4`), { force: true }) // l'ancienne version muette ne doit plus traîner à côté

  // 6. Vérification : images, niveaux, silence de tête, et ÉCOUTE de chaque vidéo finale.
  const attendu = R.flatMap((x) => x.affiches)
  const verif = verifier(O, sorties.voix, plans, dossierVerif)
  verif.audio = {}
  for (const [cle, f] of Object.entries(sorties)) verif.audio[cle] = verifierSon(O, f, attendu, path.join(projet, `ecoute-${cle}.wav`))
  for (const [cle, a] of Object.entries(verif.audio)) for (const d of a.defauts) verif.defauts.push(`${cle} : ${d}`)
  verif.ok = verif.defauts.length === 0
  verif.rendu_s = Math.round((Date.now() - t0) / 1000)
  verif.voix = { fournisseur: F.fournisseur, voix: F.voix, vitesse: F.vitesse, manifeste: F.manifeste, repliques: R.map((x) => ({ cle: x.cle, texte: x.texte, entendu: x.transcription, ressemblance: x.ressemblance, duree: x.duree })) }
  verif.musique = piste ? { id: piste.id, titre: piste.titre, artiste: piste.artiste, music_id: piste.licence.music_id, bpm: piste.bpm } : null
  verif.grille = G.source
  verif.style = style
  verif.sorties = sorties
  verif.notes = notesHonnetete(L, produit)
  fs.writeFileSync(path.join(dossierVerif, 'rapport.json'), JSON.stringify(verif, null, 2))
  journal(`[${L.id}] ${verif.ok ? 'OK' : 'À REVOIR'} ${verif.largeur}×${verif.hauteur} ${verif.duree}s en ${verif.rendu_s}s → ${Object.values(sorties).join(' + ')}`)
  for (const [cle, a] of Object.entries(verif.audio)) journal(`[${L.id}]   ${cle} : ${a.lufs} LUFS, ressemblance ${a.ressemblance}, entendu « ${a.entendu} »`)
  if (!verif.ok) throw new Error(`vérification refusée : ${verif.defauts.join(' ; ')}`)
  return { id: L.id, mp4: sorties.voix, ...verif }
}

/** Ce que la vidéo montre et que le fournisseur doit confirmer : lu par l'humain avant publication. */
function notesHonnetete(L, produit) {
  const N = [...(produit.avertissements || [])]
  if (['terrasse', 'velo', 'miettes'].includes(L.probleme) || L.gestes.some((g) => g.plan === 'avant-apres')) N.push('avant/après DESSINÉ (illustration du geste), pas une photo de résultat')
  return N
}

/** Le son d'une vidéo finale : niveau, silence de tête, et écoute (le texte dit doit être le texte affiché). */
export function verifierSon(O, mp4, attendu, wavEcoute) {
  const defauts = []
  const info = sonder(O, mp4)
  if (!info.streams.some((s) => s.codec_type === 'audio')) return { defauts: ['aucune piste son'], lufs: null, ressemblance: 0, entendu: '' }
  const n = mesurerNiveau(O, mp4)
  if (!n || !Number.isFinite(n.i)) defauts.push('niveau illisible (piste muette ?)')
  else if (Math.abs(n.i - -14) > 1.5) defauts.push(`niveau ${n.i} LUFS (attendu -14 ± 1,5)`)
  const tete = silences(O, mp4, { bruit: -45, duree: 0.3 }).find((s) => s.debut <= 0.05)
  if (tete && tete.fin > 0.8) defauts.push(`silence de ${Math.min(99, tete.fin).toFixed(2)} s au début (max 0,8 s)`)
  const e = transcrire(extraireSon(O, mp4, wavEcoute))
  const res = Math.round(ressemblance(attendu, e.mots.map((w) => w.mot)) * 1000) / 1000
  if (res < 0.85) defauts.push(`la voix ne dit pas le texte affiché (ressemblance ${res})`)
  return { defauts, lufs: n?.i ?? null, crete: n?.tp ?? null, silence_tete: tete ? Math.round(tete.fin * 100) / 100 : 0, ressemblance: res, entendu: e.transcription }
}

/** ffprobe + une image au milieu de chaque plan + une planche ; refuse un fichier vide ou une image noire. */
function verifier(O, mp4, plans, dossier) {
  const info = sonder(O, mp4)
  const v = info.streams.find((s) => s.codec_type === 'video') || {}
  const duree = Number(info.format?.duration || 0)
  const defauts = []
  if (v.width !== 1080 || v.height !== 1920) defauts.push(`résolution ${v.width}×${v.height}`)
  if (duree < DUREE_MIN || duree > DUREE_MAX + 0.2) defauts.push(`durée ${duree.toFixed(2)} s`)
  const imgs = path.join(dossier, 'images')
  fs.rmSync(imgs, { recursive: true, force: true }); fs.mkdirSync(imgs, { recursive: true })
  const instants = plans.map((P) => (P.type === 'accroche' ? [P.t0 + 0.6, P.t0 + P.d1 + P.d2 * 0.7] : [P.t0 + P.d * 0.7])).flat()
  const fichiers = []
  instants.forEach((t, k) => {
    const f = path.join(imgs, `${String(k).padStart(2, '0')}-${t.toFixed(2)}s.jpg`)
    lancer(O.ffmpeg, ['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', mp4, '-frames:v', '1', '-q:v', '3', f])
    const taille = fs.existsSync(f) ? fs.statSync(f).size : 0
    if (taille < 15000) defauts.push(`image à ${t.toFixed(2)} s vide ou presque (${taille} o)`)
    fichiers.push(f)
  })
  const planche = path.join(dossier, 'planche.jpg')
  fs.rmSync(planche, { force: true }) // jamais une planche d'un rendu précédent
  const n = fichiers.length, cols = 7, lignes = Math.ceil(n / cols)
  const liste = path.join(imgs, 'liste.txt')
  fs.writeFileSync(liste, fichiers.map((f) => `file '${path.basename(f)}'`).join('\n'))
  lancer(O.ffmpeg, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'liste.txt', '-vf', `scale=270:480,tile=${cols}x${lignes}:padding=6:color=white`, '-frames:v', '1', planche], { cwd: imgs })
  fs.rmSync(liste, { force: true })
  if (!fs.existsSync(planche)) defauts.push('planche non produite')
  return { ok: defauts.length === 0, defauts, largeur: v.width, hauteur: v.height, duree: Math.round(duree * 100) / 100, images: n, planche, taille_mo: Math.round(fs.statSync(mp4).size / 1e5) / 10 }
}

// ───────────────────────────── Mode agent (usine) ─────────────────────────────

function fenetreInterdite(maintenant = new Date()) {
  const [a, b] = String(process.env.TIKTOK_FENETRE_INTERDITE ?? '5-20').split('-').map(Number)
  if (Number.isNaN(a) || Number.isNaN(b)) return false
  const marge = Number(process.env.TIKTOK_MARGE_MIN ?? 12)
  const m = maintenant.getMinutes()
  // Un rendu qui démarre à m finit avant m + marge : il ne doit pas chevaucher [a, b].
  for (let k = 0; k <= marge; k++) { const x = (m + k) % 60; if (x >= a && x <= b) return true }
  return false
}

async function modeFile(base) {
  const dossiers = Object.fromEntries(['a-produire', 'sorties', 'faites', 'echecs', 'travail', 'cache'].map((d) => [d, path.join(base, d)]))
  for (const d of Object.values(dossiers)) fs.mkdirSync(d, { recursive: true })
  const verrou = path.join(base, '.verrou')
  if (fs.existsSync(verrou) && Date.now() - fs.statSync(verrou).mtimeMs < 60 * 60_000) { console.log('une passe tourne déjà (verrou) : rien à faire'); return 0 }
  fs.writeFileSync(verrou, `${process.pid} ${new Date().toISOString()}`)
  const jrn = path.join(base, 'journal.jsonl')
  const noter = (o) => fs.appendFileSync(jrn, JSON.stringify({ quand: new Date().toISOString(), ...o }) + '\n')
  let faites = 0
  try {
    for (;;) {
      const file = fs.readdirSync(dossiers['a-produire']).filter((f) => f.endsWith('.json')).sort()
      if (!file.length) break
      if (fenetreInterdite()) { console.log('fenêtre du Chef (ou trop proche) : la suite attend la prochaine passe'); break }
      const f = path.join(dossiers['a-produire'], file[0])
      try {
        const r = await produire(f, { sortie: dossiers.sorties, travail: dossiers.travail, cache: process.env.TIKTOK_CACHE || dossiers.cache })
        fs.renameSync(f, path.join(dossiers.faites, file[0]))
        noter({ ligne: file[0], ok: true, sorties: r.sorties, duree: r.duree, rendu_s: r.rendu_s, voix: r.voix?.fournisseur, musique: r.musique?.id ?? null, ecoute: Object.fromEntries(Object.entries(r.audio || {}).map(([k, a]) => [k, { lufs: a.lufs, ressemblance: a.ressemblance }])), notes: r.notes })
        faites++
      } catch (e) {
        fs.renameSync(f, path.join(dossiers.echecs, file[0]))
        fs.writeFileSync(path.join(dossiers.echecs, file[0] + '.erreur.txt'), String(e.stack || e))
        noter({ ligne: file[0], ok: false, erreur: String(e.message).slice(0, 500) })
        console.error(`[${file[0]}] échec : ${e.message}`)
      }
    }
  } finally { fs.rmSync(verrou, { force: true }) }
  console.log(`${faites} vidéo(s) produite(s)`)
  return 0
}

// ───────────────────────────── Ligne de commande ─────────────────────────────

async function principal() {
  const args = process.argv.slice(2)
  const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true] }))
  if ('file' in opt) return modeFile(opt.file === true ? process.env.TIKTOK_BASE || '/home/agents/travail/tiktok' : opt.file)
  let entrees = args.filter((a) => !a.startsWith('--'))
  if (!entrees.length) { console.error('usage : node generer.mjs lignes/j1-aspirateur.json […] [--sortie=…] [--brouillon] [--sans-rendu]  |  --file[=base]'); return 2 }
  entrees = entrees.flatMap((e) => (fs.statSync(e).isDirectory() ? fs.readdirSync(e).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(e, f)) : [e]))
  const sortie = opt.sortie || path.join(ICI, 'sorties')
  const travail = opt.travail || path.join(ICI, 'travail')
  const cache = process.env.TIKTOK_CACHE || path.join(ICI, 'cache')
  let echecs = 0
  for (const e of entrees) {
    try { await produire(e, { sortie, travail, cache, brouillon: !!opt.brouillon, sansRendu: !!opt['sans-rendu'], style: typeof opt.style === 'string' ? opt.style : undefined }) }
    catch (err) { echecs++; console.error(`[${path.basename(e)}] ${err.message}`) }
  }
  return echecs ? 1 : 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  principal().then((c) => { process.exitCode = c }, (e) => { console.error(e.stack || e); process.exitCode = 1 })
}

export { lireManifeste, defautsLicence, repliquesDe, decouper, valider, chargerProduit }
