#!/usr/bin/env node
// Méthode v2 de la chaîne TikTok « Brico Travaux » : des IMAGES RÉELLES du produit en action (rushes vidéo du
// fournisseur), coupées sur les temps forts d'une musique licenciée de TikTok Studio, avec des sous-titres au style
// TikTok. Une fiche (v2/videos/<id>.json) = une vidéo 1080 × 1920 à 30 i/s ; chaque fiche a SA structure, SA
// typographie, SA musique et SON accroche (voir METHODE-V2.md).
//
//   node promo-src/tiktok-chaine/v2/monter.mjs v2/videos/a1-pov.json [autres…] [--sortie=DOSSIER]
//   node promo-src/tiktok-chaine/v2/monter.mjs --tout
//
// Sorties (sorties/v2/) : <id>.mp4, <id>.ass (sous-titres), <id>.plan.json (montage résolu : chaque plan, sa source,
// ses instants dans la source et dans la vidéo), <id>-planche.jpg (4 i/s).
// Sans voix off : aucune voix de synthèse n'a de licence commerciale prouvée et gratuite (METHODE-V2.md §3) ; la voix
// se pose dans l'appli TikTok au dépôt si Benj le veut. Le son incrusté est la musique seule, à -14 LUFS.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { outils, lancer, sonder } from '../outils.mjs'
import { lireManifeste, defautsLicence, FICHIERS } from '../musique.mjs'
import { mesurerNiveau } from '../son.mjs'
import { lireProvenance, cheminRush, sha256 } from './rushes.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const CHAINE = path.resolve(ICI, '..')
export const DOSSIER_FICHES = path.join(ICI, 'videos')
export const SORTIES = path.join(CHAINE, 'sorties', 'v2')
const PHOTOS = path.join(CHAINE, 'cache', 'photos')
export const POLICES = process.env.TIKTOK_POLICES || path.join(CHAINE, 'cache', 'polices')
const L = 1080, H = 1920, IPS = 30
const r3 = (x) => Math.round(x * 1000) / 1000
const O = outils()

// ───────────────────────────── Fiche et contrôles ─────────────────────────────

const lireJSON = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''))

/** Phrases interdites : rien de faux, rien d'ambigu. Rend la liste des fautes (vide = bon). */
export function fautesDeTexte(fiche, produit) {
  const F = []
  const textes = fiche.textes.map((t) => t.texte.replace(/\|/g, ' '))
  textes.forEach((t, k) => {
    if (/\d|%|€|\$/.test(t)) F.push(`« ${t} » : aucun chiffre, prix ni pourcentage (nombres en lettres)`)
    for (const m of produit?.interdits_v2 || []) if (new RegExp(`\\b${m}\\b`, 'i').test(t)) F.push(`« ${t} » : « ${m} » n'est pas dans le colis ou n'est pas prouvé`)
    // L'erreur du 07/10 : « Deux batteries fournies. Et la voiture aussi… » laissait croire que la voiture est fournie.
    if (/\baussi\b/i.test(t) && k > 0 && /fourni|colis|inclu|dans la bo[iî]te/i.test(textes[k - 1])) F.push(`« ${textes[k - 1]} » puis « ${t} » : « aussi » après une phrase sur le colis laisse croire que c'est fourni`)
    if (/fourni|colis|inclu|dans la bo[iî]te/i.test(t) && /voiture|terrasse|v[ée]lo|canap[ée]|si[èe]ge/i.test(t)) F.push(`« ${t} » : un lieu d'usage dans une phrase sur le colis`)
  })
  return F
}

function charger(ficheChemin) {
  const fiche = lireJSON(ficheChemin)
  const E = []
  if (!/^[a-z0-9-]{3,60}$/.test(fiche.id || '')) E.push('id invalide')
  const produit = fiche.produit ? lireJSON(path.join(CHAINE, 'produits', `${fiche.produit}.json`)) : null
  E.push(...fautesDeTexte(fiche, produit))
  const M = lireManifeste()
  const piste = (M.pistes || []).find((p) => p.id === fiche.musique)
  if (!piste) E.push(`musique « ${fiche.musique} » absente du manifeste`)
  else { const d = defautsLicence(piste); if (d.length) E.push(`musique « ${fiche.musique} » non utilisable : ${d.join(' ; ')}`) }
  const P = lireProvenance()
  for (const p of fiche.plans) {
    if (p.rush) {
      const r = P.rushes.find((x) => x.id === p.rush)
      if (!r) E.push(`rush « ${p.rush} » absent de provenance.json`)
      else if (!fs.existsSync(cheminRush(r))) E.push(`rush « ${p.rush} » absent du disque (node v2/rushes.mjs)`)
      else if (r.plans_ecartes?.some(([a, b]) => p.de < b && p.de + 0.01 > a)) E.push(`plan ${p.rush}@${p.de} : dans une plage écartée (${JSON.stringify(r.plans_ecartes)})`)
    } else if (p.photo) {
      const ph = P.photos.find((x) => x.id === p.photo)
      if (!ph) E.push(`photo « ${p.photo} » absente de provenance.json`)
      else if (!fs.existsSync(path.join(PHOTOS, ph.fichier))) E.push(`photo « ${p.photo} » absente du disque`)
    } else if (!p.fond) E.push('plan sans rush, photo ni fond')
  }
  if (E.length) throw new Error(`fiche ${path.basename(ficheChemin)} refusée :\n  - ${E.join('\n  - ')}`)
  return { fiche, piste, P }
}

// ───────────────────────────── Grille des temps forts ─────────────────────────────

/** t(k) : instant (s, vidéo) du k-ième temps à partir du temps de départ choisi dans la piste. */
function grilleDe(piste, debut) {
  const b = piste.temps_forts.map(Number).sort((x, y) => x - y)
  let k0 = b.findIndex((x) => x >= debut - 0.02)
  if (k0 < 0) throw new Error(`départ ${debut} s au-delà des temps forts de ${piste.id}`)
  const rel = b.slice(k0).map((x) => x - b[k0])
  const pas = (rel.at(-1) - rel[0]) / Math.max(1, rel.length - 1)
  return { depart: b[k0], pas, t: (k) => r3(k < rel.length ? rel[Math.floor(k)] + (k % 1) * pas : rel.at(-1) + (k - rel.length + 1) * pas) }
}

// ───────────────────────────── Plans ─────────────────────────────

/** Fenêtre 9:16 dans le cadre utile d'un rush (cadre sans les textes incrustés du fournisseur). */
export function fenetre(cadre, xr = 0.5, zoom = 1) {
  const [cx, cy, cl, ch] = cadre
  let h = ch / zoom, l = h * 9 / 16
  if (l > cl) { l = cl / zoom; h = l * 16 / 9 }
  const x = cx + (cl - l) * Math.min(1, Math.max(0, xr)), y = cy + (ch - h) / 2
  return [Math.round(l / 2) * 2, Math.round(h / 2) * 2, Math.round(x), Math.round(y)]
}

/** Mouvement de caméra d'un plan (expressions sur t, temps du plan) → facteur de zoom z(t) et décalages. */
function mouvement(effet, d) {
  switch (effet) {
    case 'punch': return { z: `(1+0.16*max(0,1-t/0.22))`, dx: '0', dy: '0' } // poussée sèche à la coupe
    case 'pousse': return { z: `(1.0+0.10*t/${d})`, dx: '0', dy: '0' }
    case 'punch-pousse': return { z: `(1+0.16*max(0,1-t/0.22)+0.12*t/${d})`, dx: '0', dy: '0' } // poussée sèche puis avancée continue (photos : jamais figé)
    case 'recul': return { z: `(1.12-0.10*t/${d})`, dx: '0', dy: '0' }
    case 'secousse': return { z: '1.06', dx: `14*sin(t*47)*max(0,1-t/0.35)`, dy: `10*cos(t*39)*max(0,1-t/0.35)` }
    case 'main': return { z: '1.05', dx: `6*sin(t*2.3)+3*sin(t*5.1)`, dy: `5*cos(t*1.7)+2*sin(t*4.3)` } // tenue à la main
    default: return { z: '1.0', dx: '0', dy: '0' }
  }
}

/** Filtre vidéo d'un plan, à partir d'une image 1080×1920 nommée [v]. */
function camera(effet, d) {
  const m = mouvement(effet, d)
  if (m.z === '1.0' && m.dx === '0') return 'null'
  // zoompan image par image (d=1) : t = numéro d'image / IPS. Piège évité : « scale eval=frame » suivi de « crop »
  // change la taille des images en cours de flux et le recadrage dérive (image livrée ≠ rush : vu par le juge R1).
  // Marge de 4 % pour que la secousse ne sorte jamais du cadre.
  const t = `(on/${IPS})`
  const z = m.z.replace(/\bt\b/g, t), dx = m.dx.replace(/\bt\b/g, t), dy = m.dy.replace(/\bt\b/g, t)
  const marge = m.dx === '0' ? '' : '*1.04'
  return `zoompan=z='${z}${marge}':x='iw/2-iw/zoom/2+(${dx})':y='ih/2-ih/zoom/2+(${dy})':d=1:s=${L}x${H}:fps=${IPS}`
}

function rendrePlan(plan, P, duree, sortie) {
  const n = Math.max(1, Math.round(duree * IPS))
  const d = r3(n / IPS)
  const fx = [camera(plan.effet || 'main', d)]
  if (plan.flash) fx.push(`fade=t=in:st=0:d=0.12:color=white`)
  if (plan.assombrir) fx.push(`eq=brightness=${-plan.assombrir}:saturation=0.85`)
  let args
  if (plan.rush) {
    const r = P.rushes.find((x) => x.id === plan.rush)
    const v = plan.vitesse || 1
    const [wl, wh, wx, wy] = fenetre(r.cadre_utile, plan.x ?? 0.5, plan.zoom || 1)
    const lu = r3(plan.gel ? 0.04 : d * v)
    if (!plan.gel && plan.de + lu > r.duree + 0.01) throw new Error(`plan ${plan.rush}@${plan.de} : ${lu} s demandées, le rush s'arrête à ${r.duree} s`)
    const base = `crop=${wl}:${wh}:${wx}:${wy},scale=${L}:${H}:flags=lanczos,unsharp=5:5:0.7,setsar=1`
    const temps = plan.gel ? `trim=duration=0.04,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${d + 0.1}` : `setpts=(PTS-STARTPTS)/${v}${plan.rembobine ? ',reverse' : ''}`
    args = ['-ss', String(plan.de), '-t', String(r3(lu + 0.2)), '-i', cheminRush(r), '-an', '-vf', `${base},${temps},fps=${IPS},${fx.join(',')}`] // fps APRÈS le changement de vitesse : zoompan (d=1) rend une image par image reçue
  } else if (plan.photo) {
    const ph = P.photos.find((x) => x.id === plan.photo)
    const src = path.join(PHOTOS, ph.fichier)
    const [cx, cy, cl, ch] = plan.recadrage || ph.recadrage || [0, 0, 0, 0]
    const crop = cl ? `crop=${cl}:${ch}:${cx}:${cy},` : ''
    // Masques en pixels de la SOURCE : peints avant le recadrage (ils effacent un texte du vendeur collé au produit).
    const masques = (plan.masques || []).map(([mx, my, ml, mh]) => `drawbox=x=${mx}:y=${my}:w=${ml}:h=${mh}:color=${plan.masque_couleur || 'white'}:t=fill,`).join('')
    let vf
    if ((plan.mode || 'plein') === 'plein') vf = `${masques}${crop}scale=${L}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${L}:${H},setsar=1,fps=${IPS}`
    else {
      // « carte » : l'image entière au centre, sur sa propre copie floutée et assombrie (format paysage dans du vertical).
      const fond = plan.fond_uni ? `color=c=${plan.fond_uni}:s=${L}x${H}` : null
      const lc = plan.largeur_carte || 1000
      vf = fond ? null : `${masques}${crop}split[a][b];[a]scale=${L}:${H}:force_original_aspect_ratio=increase,crop=${L}:${H},boxblur=28:2,eq=brightness=-0.22:saturation=0.8[f];[b]scale=${lc}:-2:flags=lanczos[c];[f][c]overlay=(W-w)/2:(H-h)/2+${plan.dy || 0},setsar=1,fps=${IPS}`
      if (fond) {
        args = ['-f', 'lavfi', '-i', `${fond}:r=${IPS}:d=${d + 0.2}`, '-loop', '1', '-t', String(d + 0.2), '-i', src, '-filter_complex',
          `[1]${masques}${crop}scale=${lc}:-2:flags=lanczos[c];[0][c]overlay=(W-w)/2:(H-h)/2+${plan.dy || 0},setsar=1,fps=${IPS},${fx.join(',')}[v]`, '-map', '[v]']
      }
    }
    if (!args) args = ['-loop', '1', '-t', String(d + 0.2), '-i', src, '-filter_complex', `[0]${vf},${fx.join(',')}[v]`, '-map', '[v]']
  } else {
    args = ['-f', 'lavfi', '-i', `color=c=${plan.fond}:s=${L}x${H}:r=${IPS}:d=${d + 0.2}`, '-vf', fx.join(',')]
  }
  const r = lancer(O.ffmpeg, ['-v', 'error', '-y', ...args, '-frames:v', String(n), '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '15', '-r', String(IPS), sortie])
  if (r.code !== 0 || !fs.existsSync(sortie)) throw new Error(`plan ${JSON.stringify(plan).slice(0, 120)} : ${String(r.erreur).slice(-700)}`)
  return n
}

// ───────────────────────────── Sous-titres (ASS) ─────────────────────────────

const bgr = (hex) => { const h = hex.replace('#', ''); return `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase() }
const tps = (s) => { const c = Math.max(0, Math.round(s * 100)); const h = Math.floor(c / 360000), m = Math.floor(c / 6000) % 60, x = Math.floor(c / 100) % 60, cc = c % 100; return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}.${String(cc).padStart(2, '0')}` }
const echapper = (t) => t.replace(/[{}]/g, '').replace(/\\/g, '')
/** Coche dessinée (dessin vectoriel ASS, aucune police requise). */
const COCHE = (c) => `{\\p1\\bord3\\3c&H000000&\\1c${c}&\\shad0}m 0 26 l 14 40 l 46 6 l 38 0 l 14 26 l 7 18{\\p0}`

/**
 * Événements ASS d'un texte. Modes (style.mode) :
 *   mot      : 2-4 mots, le mot courant change de couleur (style des anciens posts de Brico Travaux) ;
 *   choc     : un groupe à la fois, énorme, qui claque à chaque temps (pop d'échelle) ;
 *   bandeau  : texte noir sur pavé blanc (style « texte TikTok »), étiquette AVANT/APRÈS possible ;
 *   liste    : chaque élément s'ajoute à une liste cochée qui reste à l'écran.
 */
function evenements(fiche, g) {
  const S = fiche.style
  const E = []
  const ac = (m, t) => (t.accent || []).some((a) => m.toUpperCase().replace(/[.,!?:;]/g, '').includes(a.toUpperCase()))
  const maj = (x) => (S.majuscules === false ? x : x.toUpperCase())
  const liste = []
  for (const t of fiche.textes) {
    const t0 = g(t.temps[0]), t1 = g(t.temps[1])
    const lignes = t.texte.split('|').map((x) => maj(x.trim()))
    const pop = `{\\fscx${S.pop || 118}\\fscy${S.pop || 118}\\t(0,110,\\fscx100\\fscy100)}`
    const style = t.style || 'Base'
    const pos = t.pos ? `{\\pos(${t.pos[0]},${t.pos[1]})}` : ''
    if (S.mode === 'mot' || t.mode === 'mot') {
      const mots = lignes.join(' \\N ').split(' ').filter(Boolean)
      const vrais = mots.filter((m) => m !== '\\N')
      const pas = (t1 - t0) / vrais.length
      let k = 0
      for (let i = 0; i < mots.length; i++) {
        if (mots[i] === '\\N') continue
        const a = t0 + k * pas, b = k === vrais.length - 1 ? t1 : t0 + (k + 1) * pas
        const corps = mots.map((m, j) => (m === '\\N' ? '\\N' : j === i || ac(m, t) && j < i ? `{\\1c${bgr(ac(m, t) ? S.accent : S.actif || S.accent)}}${echapper(m)}{\\1c${bgr(S.couleur)}}` : echapper(m))).join(' ').replace(/ \\N /g, '\\N')
        E.push(`Dialogue: 0,${tps(a)},${tps(b)},${style},,0,0,0,,${pos}${k === 0 ? pop : ''}${corps}`)
        k++
      }
    } else if (S.mode === 'liste' && !t.hors_liste) {
      liste.push({ texte: lignes.join(' '), t0 })
      const fin = g(fiche.liste_fin ?? t.temps[1])
      const y = S.liste_y + (liste.length - 1) * S.liste_pas
      E.push(`Dialogue: 1,${tps(t0)},${tps(fin)},Liste,,0,0,0,,{\\an4\\pos(${S.liste_x},${y})}${pop}${COCHE(bgr(S.accent))}  ${echapper(lignes.join(' '))}`)
    } else {
      const corps = lignes.map((l) => l.split(' ').map((m) => (ac(m, t) ? `{\\1c${bgr(S.accent)}}${echapper(m)}{\\1c${bgr(t.couleur || S.couleur)}}` : echapper(m))).join(' ')).join('\\N')
      const fad = S.mode === 'choc' ? '' : '{\\fad(40,0)}'
      E.push(`Dialogue: 0,${tps(t0)},${tps(t1)},${style},,0,0,0,,${pos}${fad}${pop}${corps}`)
    }
    if (t.etiquette) {
      const e = t.etiquette
      E.push(`Dialogue: 2,${tps(t0)},${tps(t1)},Etiquette,,0,0,0,,{\\an7\\pos(${e.x ?? 70},${e.y ?? 300})\\3c${bgr(e.fond)}\\4c${bgr(e.fond)}}{\\fscx130\\fscy130\\t(0,120,\\fscx100\\fscy100)}${echapper(maj(e.texte))}`)
    }
  }
  return E
}

function ecrireASS(fiche, g, sortie) {
  const S = fiche.style
  const st = (nom, police, taille, prim, contour, ombre, align, mv, extra = {}) => {
    const bs = extra.boite ? 3 : 1
    const back = extra.fond ? bgr(extra.fond) : '&H64000000'
    return `Style: ${nom},${police},${taille},${prim},&H000000FF,${extra.contourCouleur ? bgr(extra.contourCouleur) : '&H00000000'},${back},0,0,0,0,100,100,${extra.espace ?? 0},0,${bs},${contour},${ombre},${align},60,60,${mv},1`
  }
  const lignes = [
    '[Script Info]', 'ScriptType: v4.00+', `PlayResX: ${L}`, `PlayResY: ${H}`, 'WrapStyle: 2', 'ScaledBorderAndShadow: yes', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // Pavé (BorderStyle 3) : libass peint la boîte avec la couleur de CONTOUR ; l'épaisseur du contour fait la marge.
    st('Base', S.police, S.taille, bgr(S.couleur), S.contour ?? 7, S.ombre ?? 3, S.alignement ?? 2, S.marge_bas ?? 640, { boite: S.boite, fond: S.fond_boite, contourCouleur: S.boite ? S.fond_boite : null, espace: S.espace }),
    st('Haut', S.police, S.taille_haut || S.taille, bgr(S.couleur), S.contour ?? 7, S.ombre ?? 3, 8, S.marge_haut ?? 300, { boite: S.boite, fond: S.fond_boite, contourCouleur: S.boite ? S.fond_boite : null, espace: S.espace }),
    st('Liste', S.police_liste || S.police, S.taille_liste || 64, bgr(S.couleur), 5, 2, 4, 0),
    st('Etiquette', S.police_etiquette || S.police, S.taille_etiquette || 70, '&H00FFFFFF', 14, 0, 7, 0, { boite: true, fond: '#000000', espace: 2 }),
    '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...evenements(fiche, g),
  ]
  fs.writeFileSync(sortie, lignes.join('\n') + '\n', 'utf8')
}

// ───────────────────────────── Montage ─────────────────────────────

export async function monter(ficheChemin, { sortie = SORTIES } = {}) {
  const { fiche, piste, P } = charger(ficheChemin)
  const grille = grilleDe(piste, fiche.musique_debut ?? piste.premier_temps)
  const g = grille.t
  fs.mkdirSync(sortie, { recursive: true })
  const travail = path.join(CHAINE, 'travail', 'v2', fiche.id)
  fs.rmSync(travail, { recursive: true, force: true })
  fs.mkdirSync(travail, { recursive: true })
  // Polices : copiées dans le dossier de travail (libass les lit par fontsdir relatif, sans « C: » dans le filtre).
  fs.mkdirSync(path.join(travail, 'polices'), { recursive: true })
  for (const f of fs.readdirSync(POLICES).filter((x) => /\.(ttf|otf)$/i.test(x))) fs.copyFileSync(path.join(POLICES, f), path.join(travail, 'polices', f))

  // 1. Plans, chacun sur sa plage de temps forts ; nombre d'images arrondi sur l'instant absolu (aucune dérive).
  let k = 0
  const resolus = []
  const liste = []
  for (const [i, p] of fiche.plans.entries()) {
    const a = g(k), b = g(k + p.temps)
    const na = Math.round(a * IPS), nb = Math.round(b * IPS)
    const f = path.join(travail, `p${String(i).padStart(2, '0')}.mp4`)
    rendrePlan(p, P, (nb - na) / IPS, f)
    liste.push(`file '${path.basename(f)}'`)
    resolus.push({ k, debut: r3(na / IPS), fin: r3(nb / IPS), ...p, source: p.rush ? 'rush' : p.photo ? 'photo' : 'fond' })
    k += p.temps
  }
  const duree = r3(Math.round(g(k) * IPS) / IPS)
  fs.writeFileSync(path.join(travail, 'liste.txt'), liste.join('\n') + '\n')
  let r = lancer(O.ffmpeg, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'liste.txt', '-c', 'copy', 'muet.mp4'], { cwd: travail })
  if (r.code !== 0) throw new Error('assemblage : ' + r.erreur.slice(-500))

  // 2. Sous-titres.
  ecrireASS(fiche, g, path.join(travail, 'sous-titres.ass'))

  // 3. Musique : la piste démarre sur le temps choisi (0 s de la vidéo), fondu final, -14 LUFS en deux passes.
  const musique = path.join(FICHIERS, piste.fichier)
  r = lancer(O.ffmpeg, ['-v', 'error', '-y', '-ss', String(grille.depart), '-t', String(duree), '-i', musique, '-af', `afade=t=out:st=${r3(duree - 0.7)}:d=0.7,aresample=48000`, '-ac', '2', path.join(travail, 'musique-brut.wav')])
  if (r.code !== 0) throw new Error('musique : ' + r.erreur.slice(-400))
  const m = mesurerNiveau(O, path.join(travail, 'musique-brut.wav'))
  const ln = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.brut.input_i}:measured_TP=${m.brut.input_tp}:measured_LRA=${m.brut.input_lra}:measured_thresh=${m.brut.input_thresh}:offset=${m.brut.target_offset}:linear=true`

  // 4. Rendu final.
  const mp4 = path.join(sortie, `${fiche.id}.mp4`)
  r = lancer(O.ffmpeg, ['-v', 'error', '-y', '-i', 'muet.mp4', '-i', 'musique-brut.wav',
    '-vf', `subtitles=sous-titres.ass:fontsdir=polices`, '-af', `${ln},aresample=48000`,
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', path.resolve(mp4)], { cwd: travail, minutes: 20 })
  if (r.code !== 0) throw new Error('rendu final : ' + r.erreur.slice(-800))
  fs.copyFileSync(path.join(travail, 'sous-titres.ass'), path.join(sortie, `${fiche.id}.ass`))

  // 5. Planche à 4 i/s (contrôle à l'œil) et plan résolu (pour le juge).
  lancer(O.ffmpeg, ['-v', 'error', '-y', '-i', mp4, '-vf', `fps=4,scale=135:-2,tile=12x${Math.ceil(duree * 4 / 12)}`, '-frames:v', '1', '-q:v', '3', path.join(sortie, `${fiche.id}-planche.jpg`)])
  const plan = {
    id: fiche.id, fiche: path.relative(CHAINE, ficheChemin).replace(/\\/g, '/'), structure: fiche.structure, produit: fiche.produit,
    duree, ips: IPS, musique: { id: piste.id, titre: piste.titre, depart: grille.depart, pas: r3(grille.pas), sha256: piste.sha256 },
    style: { police: fiche.style.police, mode: fiche.style.mode },
    plans: resolus.map((p) => ({ debut: p.debut, fin: p.fin, source: p.source, rush: p.rush, de: p.de, vitesse: p.vitesse || 1, gel: !!p.gel, rembobine: !!p.rembobine, photo: p.photo, recadrage: p.recadrage, effet: p.effet || 'main' })),
    textes: fiche.textes.map((t) => ({ debut: g(t.temps[0]), fin: g(t.temps[1]), texte: t.texte.replace(/\|/g, ' ') })),
    rushes: [...new Set(resolus.filter((p) => p.rush).map((p) => p.rush))].map((id) => { const x = P.rushes.find((y) => y.id === id); return { id, sha256: x.sha256, source: x.source } }),
  }
  fs.writeFileSync(path.join(sortie, `${fiche.id}.plan.json`), JSON.stringify(plan, null, 2) + '\n')
  fs.rmSync(travail, { recursive: true, force: true })
  return { mp4, duree, plan }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2)
  const opt = Object.fromEntries(a.filter((x) => x.startsWith('--')).map((x) => { const [k, ...v] = x.slice(2).split('='); return [k, v.join('=') || true] }))
  let fiches = a.filter((x) => !x.startsWith('--')).map((f) => path.resolve(f))
  if (opt.tout) fiches = fs.readdirSync(DOSSIER_FICHES).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(DOSSIER_FICHES, f))
  if (!fiches.length) { console.error('usage : monter.mjs <fiche.json…> | --tout'); process.exitCode = 2 }
  ;(async () => {
    for (const f of fiches) {
      try { const t = Date.now(); const { mp4, duree } = await monter(f, { sortie: opt.sortie ? path.resolve(opt.sortie) : SORTIES }); console.log(`ok  ${path.relative(process.cwd(), mp4)}  ${duree} s  (${Math.round((Date.now() - t) / 1000)} s)`) }
      catch (e) { console.error(`ÉCHEC ${path.basename(f)} : ${e.message}`); process.exitCode = 1 }
    }
  })()
}
