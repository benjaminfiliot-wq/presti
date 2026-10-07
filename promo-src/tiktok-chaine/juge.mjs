#!/usr/bin/env node
// Juge de la chaîne TikTok : il ÉCOUTE et MESURE lui-même chaque vidéo livrée, sans croire le rapport du générateur.
//
//   node promo-src/tiktok-chaine/juge.mjs [--sortie=DOSSIER] [--lignes=DOSSIER] [id …] [--sabotages]
//
// Pour chaque <id>-voix.mp4 (et <id>-voix-musique.mp4 s'il existe) :
//   J1 voix présente      : une piste son, un niveau mesurable (pas une piste muette) ;
//   J2 texte dit = affiché: transcription faster-whisper de la vidéo comparée au texte de la LIGNE (≥ 0,85) ;
//   J3 sous-titres calés  : chaque mot affiché (composition.html) apparaît quand la voix le dit (médiane ≤ 0,25 s, pire ≤ 0,7 s) ;
//   J4 niveau             : -14 LUFS ± 1,5 ;
//   J5 tête               : aucun silence de plus de 0,8 s au début ;
//   J6 licence            : toute piste du manifeste a sa preuve (source TikTok Studio, is_commerce_music, type 2, réponse
//                           de l'API) ; une version « voix + musique » nomme une piste utilisable (fichier = empreinte) ;
//   J7 durées             : le son couvre la vidéo (écart ≤ 0,15 s) ;
//   J8 whip               : au moins une coupe à FLOU DIRECTIONNEL (mesuré sur l'image : à la coupe, le rapport des
//                           contrastes horizontal / vertical s'effondre ou s'envole par rapport au milieu des plans) ;
//   J9 perspective        : au moins un plan en perspective 3D (rotationX / rotationY avec transformPerspective) ;
//   J10 mouvement         : aucun passage figé de plus de 0,8 s (différence d'images à 10 i/s).
// --sabotages : fabrique des copies cassées (muette, voix d'une autre vidéo, niveau -10 dB, 1,5 s de silence en tête,
// piste sans preuve au manifeste, sous-titres décalés de 0,8 s, coupes cherchées hors des whips, perspective retirée,
// 1,2 s d'image figée) ; chacune DOIT être refusée, sinon le juge échoue.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ICI, outils, sonder, lancer } from './outils.mjs'
import { transcrire, ressemblance, tempsDesMots, normaliser } from './voix.mjs'
import { mesurerNiveau, silences, extraireSon } from './son.mjs'
import { lireManifeste, defautsLicence, MANIFESTE, FICHIERS } from './musique.mjs'
import { repliquesDe, chargerProduit } from './generer.mjs'

const O = outils()

/**
 * Instant où chaque mot dit est montré, lu dans la composition : les mots (sous-titres « -s-k », rubans « -r…-k ») dans
 * l'ordre du document ; pour chacun, l'instant où il s'allume en jaune s'il est affiché d'avance (accroche lisible dès
 * la 1ʳᵉ image), sinon l'instant où il apparaît. Le ruban du tampon final du style classique (« -r- » du dernier plan)
 * répète l'appel sans le redire : il est écarté.
 */
export function instantsAffiches(html) {
  const plans = [...html.matchAll(/<section class="clip" id="(p\d+)"/g)].map((m) => m[1])
  const dernier = plans.at(-1)
  const ids = [...html.matchAll(/<span class="(?:mot|eti)[^"]*" id="(p\d+)-(s|r1|r2|r)-(\d+)"/g)]
    .filter((m) => !(m[1] === dernier && m[2] === 'r')).map((m) => `${m[1]}-${m[2]}-${m[3]}`)
  const echappe = (x) => x.replace(/[-]/g, '\\-')
  return ids.map((id) => {
    const allume = html.match(new RegExp(`tl\\.set\\("#${echappe(id)}", \\{[^}]*color: "#FFC400"[^}]*\\}, ([\\d.]+)\\);`))
    const parait = html.match(new RegExp(`tl\\.fromTo\\("#${echappe(id)}", \\{ opacity: 0[^}]*\\}, \\{[^}]*\\}, ([\\d.]+)\\);`))
    const m = allume || parait
    return m ? Number(m[1]) : NaN
  })
}

/** Les mots qu'un fond a le droit de montrer : ceux de la ligne, la marque, les étiquettes de la chaîne. */
function vocabulaire(attendus, extra = []) {
  const V = new Set(['brico', 'travaux', 'avant', 'apres', 'lien', 'dans', 'bio'])
  for (const m of [...attendus, ...extra]) for (const p of String(m).split(/[\s'’·-]+/)) { const n = normaliser(p); if (n) V.add(n) }
  return V
}

/**
 * J11 : OCR (tesseract) de 3 images, zone au-dessus des sous-titres ; tout mot lu avec assurance (≥ 75, au moins
 * 3 lettres, sans chiffre) doit être un mot de la ligne ou de la marque : un mot tronqué ou collé (« EMUTS »,
 * « SANFIL ») est refusé.
 */
export function ocrFond(mp4, html, V) {
  const tess = ['tesseract', '/usr/bin/tesseract', 'C:/Program Files/Tesseract-OCR/tesseract.exe'].find((x) => lancer(x, ['--version']).code === 0)
  if (!tess) return { indisponible: true }
  const P = [...html.matchAll(/<section class="clip" id="p\d+" data-start="([\d.]+)" data-duration="([\d.]+)"/g)].map((m) => Number(m[1]) + Number(m[2]) * 0.7)
  const instants = [P[Math.floor(P.length * 0.25)], P[Math.floor(P.length * 0.5)], P[Math.floor(P.length * 0.75)]]
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-tiktok-'))
  const lus = [], fautifs = []
  try {
    instants.forEach((t, k) => {
      const f = path.join(tmp, `${k}.png`)
      lancer(O.ffmpeg, ['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', mp4, '-frames:v', '1', '-vf', 'crop=1080:1140:0:0,format=gray', f])
      const r = lancer(tess, [f, 'stdout', '--psm', '11', 'tsv'])
      for (const l of String(r.sortie).split('\n').slice(1)) {
        const c = l.split('\t')
        const conf = Number(c[10]), mot = (c[11] || '').trim()
        if (!mot || conf < 75 || /\d/.test(mot)) continue
        const n = normaliser(mot)
        if (n.length < 3) continue
        lus.push(mot)
        if (!V.has(n)) fautifs.push(`${mot} (${t.toFixed(1)} s)`)
      }
    })
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
  return { lus, fautifs }
}

function licenceManifeste(M, dossierPreuves) {
  const D = []
  for (const p of M.pistes || []) {
    // Seuls les défauts de LICENCE comptent ici (le fichier audio n'est pas sur toutes les machines).
    const d = defautsLicence(p, '/__aucun__').filter((x) => !/^fichier absent|empreinte|ne correspond/.test(x))
    if (dossierPreuves && p.licence?.preuve && !fs.existsSync(path.join(dossierPreuves, p.licence.preuve))) d.push('preuve absente')
    if (d.length) D.push(`piste ${p.id} sans licence prouvée : ${d.join(' ; ')}`)
  }
  return D
}

/** Image en niveaux de gris (L × H) à l'instant t. */
function imageGrise(mp4, t, L = 270, H = 480) {
  const r = lancer(O.ffmpeg, ['-v', 'error', '-ss', Math.max(0, t).toFixed(3), '-i', mp4, '-frames:v', '1', '-vf', `scale=${L}:${H},format=gray`, '-f', 'rawvideo', '-'], { binaire: true })
  return r.code === 0 && r.sortie.length === L * H ? r.sortie : null
}

/** Rapport des contrastes horizontal / vertical (somme |dI/dx| / somme |dI/dy|) : un flou sur x le fait chuter. */
function rapportContrastes(img, L = 270, H = 480) {
  let gx = 0, gy = 0
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < L - 1; x++) { const i = y * L + x; gx += Math.abs(img[i + 1] - img[i - 1]); gy += Math.abs(img[i + L] - img[i - L]) }
  return gx / Math.max(1, gy)
}

/** Les coupes et les milieux de plans, lus dans la composition. */
export function coupesDe(html) {
  const P = [...html.matchAll(/<section class="clip" id="p\d+" data-start="([\d.]+)" data-duration="([\d.]+)"/g)].map((m) => ({ t0: Number(m[1]), d: Number(m[2]) }))
  return { coupes: P.slice(1).map((p) => p.t0), milieux: P.map((p) => p.t0 + p.d / 2) }
}

/** J8 : coupes dont l'image porte un flou directionnel (rapport x/y < 0,5 × la référence, ou > 2 ×). */
export function mesurerWhips(mp4, html) {
  const { coupes, milieux } = coupesDe(html)
  const ref = milieux.map((t) => imageGrise(mp4, t)).filter(Boolean).map((i) => rapportContrastes(i)).sort((a, b) => a - b)
  const base = ref[Math.floor(ref.length / 2)] || 1
  const whips = []
  for (const c of coupes) {
    const r = [c - 0.04, c + 0.05].map((t) => imageGrise(mp4, t)).filter(Boolean).map((i) => rapportContrastes(i) / base)
    const pire = r.reduce((m, x) => (Math.abs(Math.log(x)) > Math.abs(Math.log(m)) ? x : m), 1)
    if (pire < 0.5 || pire > 2) whips.push({ coupe: c, rapport: Math.round(pire * 100) / 100 })
  }
  return { base: Math.round(base * 100) / 100, whips, coupes: coupes.length }
}

/** J10 : plus long passage figé (s), par différence moyenne d'images consécutives à 10 i/s (108 × 192). */
export function plusLongFige(mp4, seuil = 0.6) {
  const L = 108, H = 192
  const r = lancer(O.ffmpeg, ['-v', 'error', '-i', mp4, '-vf', `fps=10,scale=${L}:${H},format=gray`, '-f', 'rawvideo', '-'], { binaire: true, minutes: 5 })
  if (r.code !== 0) return null
  const n = Math.floor(r.sortie.length / (L * H))
  let run = 0, pire = 0, debut = 0, pireDebut = 0
  for (let k = 1; k < n; k++) {
    let s = 0
    const a = (k - 1) * L * H, b = k * L * H
    for (let i = 0; i < L * H; i++) s += Math.abs(r.sortie[b + i] - r.sortie[a + i])
    if (s / (L * H) < seuil) { if (!run) debut = k - 1; run++; if (run > pire) { pire = run; pireDebut = debut } } else run = 0
  }
  return { secondes: pire / 10, a: pireDebut / 10 }
}

/** Juge une vidéo. Rend la liste des défauts (vide = bon) et les mesures. */
export function jugerVideo({ mp4, attendus, composition, rapport, manifeste, dossierMusique = FICHIERS, dossierPreuves, version, vocab }) {
  const D = []
  const mesures = { fichier: path.basename(mp4) }
  if (!fs.existsSync(mp4) || fs.statSync(mp4).size < 50_000) return { defauts: ['vidéo absente ou vide'], mesures }
  const info = sonder(O, mp4)
  const audio = info.streams.find((s) => s.codec_type === 'audio')
  if (!audio) return { defauts: ['J1 aucune piste son'], mesures }
  const n = mesurerNiveau(O, mp4)
  mesures.lufs = n?.i
  if (!n || !Number.isFinite(n.i) || n.i < -40) { D.push(`J1 voix absente (niveau ${n?.i ?? '?'} LUFS)`); return { defauts: D, mesures } }
  // J2 : on écoute la vidéo elle-même.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'juge-tiktok-'))
  let e
  try { e = transcrire(extraireSon(O, mp4, path.join(tmp, 'son.wav'))) } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
  mesures.entendu = e.transcription
  mesures.ressemblance = Math.round(ressemblance(attendus, e.mots.map((w) => w.mot)) * 1000) / 1000
  if (mesures.ressemblance < 0.85) D.push(`J2 le texte dit n'est pas le texte affiché (ressemblance ${mesures.ressemblance} ; entendu « ${e.transcription} »)`)
  // J3 : sous-titres calés sur la voix réelle.
  const affiches = instantsAffiches(composition)
  if (affiches.length !== attendus.length || affiches.some(Number.isNaN)) D.push(`J3 ${affiches.length} mots affichés pour ${attendus.length} mots dits`)
  else if (mesures.ressemblance >= 0.6) {
    const entendus = tempsDesMots(attendus, e.mots)
    const ecarts = affiches.map((t, k) => Math.abs(t + 0.04 - entendus[k])).sort((a, b) => a - b)
    mesures.ecart_median = Math.round(ecarts[Math.floor(ecarts.length / 2)] * 1000) / 1000
    mesures.ecart_max = Math.round(ecarts.at(-1) * 1000) / 1000
    if (mesures.ecart_median > 0.25 || mesures.ecart_max > 0.7) D.push(`J3 sous-titres décalés de la voix (médiane ${mesures.ecart_median} s, pire ${mesures.ecart_max} s)`)
  }
  // J4 : niveau.
  if (Math.abs(n.i + 14) > 1.5) D.push(`J4 niveau ${n.i} LUFS (attendu -14 ± 1,5)`)
  // J5 : silence de tête.
  const tete = silences(O, mp4, { bruit: -45, duree: 0.3 }).find((s) => s.debut <= 0.05)
  mesures.silence_tete = tete ? Math.round(Math.min(tete.fin, 99) * 100) / 100 : 0
  if (tete && tete.fin > 0.8) D.push(`J5 silence de ${mesures.silence_tete} s au début`)
  // J6 : licences.
  D.push(...licenceManifeste(manifeste, dossierPreuves).map((x) => `J6 ${x}`))
  if (version === 'musique') {
    const id = rapport?.musique?.id
    const p = (manifeste.pistes || []).find((x) => x.id === id)
    if (!p) D.push(`J6 version musique sans piste du manifeste (rapport : ${id ?? 'aucune'})`)
    else { const d = defautsLicence(p, dossierMusique); if (d.length) D.push(`J6 piste ${id} non utilisable : ${d.join(' ; ')}`) }
  }
  // J7 : le son couvre la vidéo.
  const dv = Number(info.streams.find((s) => s.codec_type === 'video')?.duration || info.format.duration)
  const da = Number(audio.duration || info.format.duration)
  if (Math.abs(dv - da) > 0.15) D.push(`J7 son ${da.toFixed(2)} s pour une vidéo de ${dv.toFixed(2)} s`)
  // J8-J10 : l'animation.
  const w = mesurerWhips(mp4, composition)
  mesures.whips = w.whips.length
  if (!w.whips.length) D.push(`J8 aucune coupe à flou directionnel mesurée (${w.coupes} coupes)`)
  const perspective = /transformPerspective: \d+, rotationY: -?[1-9]/.test(composition) || /transformPerspective: \d+, rotationX: -?[1-9]/.test(composition)
  mesures.perspective = perspective
  if (!perspective) D.push('J9 aucun plan en perspective 3D')
  const f = plusLongFige(mp4)
  mesures.fige = f?.secondes
  if (!f) D.push('J10 mouvement illisible')
  else if (f.secondes > 0.8) D.push(`J10 image figée ${f.secondes} s (à ${f.a} s)`)
  // J11 : aucun mot tronqué ou collé lisible à l'écran.
  const o = ocrFond(mp4, composition, vocab || vocabulaire(attendus))
  if (o.indisponible) D.push("J11 OCR indisponible (tesseract) : juger sur l'usine")
  else { mesures.ocr = o.lus.length; if (o.fautifs.length) D.push(`J11 mot tronqué ou collé à l'écran : ${o.fautifs.join(', ')}`) }
  return { defauts: D, mesures }
}

function preparerCas(sortie, dossierLignes, id) {
  const L = JSON.parse(fs.readFileSync(path.join(dossierLignes, `${id}.json`), 'utf8'))
  const attendus = repliquesDe(L, chargerProduit(L.produit)).flatMap((r) => r.affiches)
  const dossier = path.join(sortie, id)
  const composition = fs.readFileSync(path.join(dossier, 'composition.html'), 'utf8')
  let rapport = null
  try { rapport = JSON.parse(fs.readFileSync(path.join(dossier, 'rapport.json'), 'utf8')) } catch {}
  const P = chargerProduit(L.produit)
  const vocab = vocabulaire(attendus, [P.marque, P.motFond, P.titre, ...L.gestes.map((g) => g.motFond)].filter(Boolean))
  return { id, attendus, composition, rapport, vocab }
}

function sabotages(sortie, dossierLignes, ids) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sabotage-tiktok-'))
  const A = preparerCas(sortie, dossierLignes, ids[0])
  const src = path.join(sortie, `${ids[0]}-voix.mp4`)
  const autre = ids[1] ? path.join(sortie, `${ids[1]}-voix.mp4`) : null
  const M = lireManifeste()
  const base = { attendus: A.attendus, vocab: A.vocab, composition: A.composition, rapport: A.rapport, manifeste: M, dossierPreuves: path.dirname(MANIFESTE), version: 'voix' }
  const ff = (args, f) => { const r = lancer(O.ffmpeg, ['-v', 'error', '-y', ...args, f]); if (r.code !== 0) throw new Error('sabotage : ' + r.erreur.slice(-300)); return f }
  const cas = [
    ['muette', () => ({ mp4: ff(['-i', src, '-an', '-c:v', 'copy'], path.join(tmp, 'muette.mp4')) }), /^J1/],
    ['niveau -10 dB', () => ({ mp4: ff(['-i', src, '-c:v', 'copy', '-af', 'volume=-10dB', '-c:a', 'aac'], path.join(tmp, 'bas.mp4')) }), /^J4/],
    ['1,5 s de silence en tête', () => ({ mp4: ff(['-i', src, '-c:v', 'copy', '-af', 'adelay=1500:all=1', '-c:a', 'aac', '-t', String(Number(sonder(O, src).format.duration))], path.join(tmp, 'tete.mp4')) }), /^J5/],
    ['sous-titres décalés de 0,8 s', () => ({ mp4: src, composition: A.composition.replace(/(tl\.(?:set|fromTo)\("#p\d+-(?:s|r1|r2|r)-\d+", \{ (?:opacity: 0|backgroundColor|color)[^\n]*?, )([\d.]+)\);/g, (m, a, t) => `${a}${(Number(t) + 0.8).toFixed(3)});`) }), /^J3/],
    ['piste sans preuve au manifeste', () => ({ mp4: src, manifeste: { pistes: [...(M.pistes || []), { id: 'tt-sabotage', titre: 'Son protégé', fichier: 'x.mp3', licence: { source: 'youtube', music_id: '1' } }] } }), /^J6/],
  ]
  cas.push(['coupes cherchées hors des whips', () => ({ mp4: src, composition: A.composition.replace(/(<section class="clip" id="p(?!0")\d+" data-start=")([\d.]+)/g, (m, a, t) => a + (Number(t) + 0.45).toFixed(3)) }), /^J8/])
  cas.push(['perspective retirée', () => ({ mp4: src, composition: A.composition.replace(/transformPerspective: \d+, /g, '') }), /^J9/])
  cas.push(["1,2 s d'image figée", () => ({ mp4: ff(['-i', src, '-filter_complex', '[0:v]split[a][b];[a][b]freezeframes=first=150:last=186:replace=150[v]', '-map', '[v]', '-map', '0:a', '-c:a', 'copy'], path.join(tmp, 'fige.mp4')) }), /^J10/])
  const police = ['/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf'].find((f) => fs.existsSync(f))
  if (police) cas.push(['texte de fond tronqué (« EMUTS SANFIL »)', () => ({ mp4: ff(['-i', src, '-vf', `drawtext=fontfile='${police.replace(/:/g, '\\:')}':text='EMUTS SANFIL':fontsize=150:fontcolor=white:x=60:y=380`, '-c:a', 'copy'], path.join(tmp, 'ocr.mp4')) }), /^J11/])
  if (autre && fs.existsSync(autre)) cas.push(['voix d\'une autre vidéo', () => ({ mp4: ff(['-i', src, '-i', autre, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-shortest'], path.join(tmp, 'autre.mp4')) }), /^J2/])
  let ratés = 0
  for (const [nom, fab, attendu] of cas) {
    const r = jugerVideo({ ...base, ...fab() })
    const refuse = r.defauts.some((d) => attendu.test(d))
    if (!refuse) ratés++
    console.log(`  sabotage « ${nom} » : ${refuse ? 'REFUSÉ (bien)' : 'ACCEPTÉ (le juge est aveugle !)'} — ${r.defauts.join(' | ') || 'aucun défaut'}`)
  }
  fs.rmSync(tmp, { recursive: true, force: true })
  return ratés
}

async function principal() {
  const args = process.argv.slice(2)
  const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true] }))
  const sortie = opt.sortie || path.join(ICI, 'sorties')
  const dossierLignes = opt.lignes || path.join(ICI, 'lignes')
  let ids = args.filter((a) => !a.startsWith('--'))
  if (!ids.length) ids = fs.readdirSync(sortie).map((f) => f.match(/^(.+)-voix\.mp4$/)?.[1]).filter(Boolean).sort()
  if (!ids.length) { console.error(`aucune vidéo <id>-voix.mp4 dans ${sortie}`); return 1 }
  const M = lireManifeste()
  let refus = 0
  for (const id of ids) {
    const C = preparerCas(sortie, dossierLignes, id)
    for (const version of ['voix', 'musique']) {
      const mp4 = path.join(sortie, `${id}-voix${version === 'musique' ? '-musique' : ''}.mp4`)
      if (version === 'musique' && !fs.existsSync(mp4)) continue
      const r = jugerVideo({ mp4, attendus: C.attendus, vocab: C.vocab, composition: C.composition, rapport: C.rapport, manifeste: M, dossierPreuves: path.dirname(MANIFESTE), version })
      if (r.defauts.length) refus++
      const m = r.mesures
      console.log(`${r.defauts.length ? 'REFUSÉ' : 'BON   '} ${path.basename(mp4)}  ${m.lufs} LUFS, tête ${m.silence_tete} s, ressemblance ${m.ressemblance}, sous-titres ${m.ecart_median}/${m.ecart_max} s, whips ${m.whips}, perspective ${m.perspective}, figé max ${m.fige} s`)
      console.log(`       entendu : « ${m.entendu} »`)
      for (const d of r.defauts) console.log(`       - ${d}`)
    }
  }
  if (opt.sabotages) {
    console.log('Sabotages :')
    const r = sabotages(sortie, dossierLignes, ids)
    if (r) { console.log(`${r} sabotage(s) accepté(s) : juge non fiable`); return 1 }
  }
  return refus ? 1 : 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  principal().then((c) => { process.exitCode = c }, (e) => { console.error(e.stack || e); process.exitCode = 1 })
}
