#!/usr/bin/env node
// Juge de la méthode v2 : il REGARDE et ÉCOUTE lui-même chaque vidéo livrée (sorties/v2/<id>.mp4), sans croire le
// rapport du monteur, puis juge le LOT (les vidéos doivent être différentes entre elles).
//
//   node promo-src/tiktok-chaine/v2/juge.mjs [id …] [--sabotages]
//
// Par vidéo :
//   R1 images réelles  : au moins la moitié de la durée vient de RUSHES vidéo du fournisseur, et c'est PROUVÉ à l'image :
//                        pour chaque plan déclaré « rush », l'image livrée au milieu du plan ressemble (corrélation
//                        ≥ 0,75, zone sans sous-titres) à l'image du rush à l'instant déclaré ; un rush absent de
//                        provenance.json, ou pris dans une plage écartée, est refusé ;
//   R2 accroche < 1 s  : un texte à l'écran dès 0,05 s, du mouvement entre 0 et 1 s (pas d'image figée en tête),
//                        du son dès la première demi-seconde ;
//   R3 musique         : la piste est au manifeste ET utilisable (licence TikTok Studio, fichier = empreinte) ET c'est
//                        bien elle qu'on entend (enveloppe du son livré corrélée ≥ 0,6 à la piste au départ déclaré) ;
//   R4 (lot)           : les vidéos sont STRUCTURELLEMENT différentes deux à deux : musique, police ou mode de texte,
//                        structure, premier plan et accroche différents, peu de plans en commun (Jaccard < 0,5) ;
//   R5 honnêteté       : aucun chiffre, aucun mot interdit du produit, aucun « … aussi » après une phrase sur le colis,
//                        aucun lieu d'usage dans une phrase sur le colis (« Deux batteries fournies. Et la voiture aussi »
//                        du 07/10 est refusé) ;
//   R6 durée 12-20 s ; R7 niveau -14 LUFS ± 1,5 ; R8 aucun passage figé > 0,8 s ; R9 appel final (« bio ») à l'écran.
// --sabotages : fabrique des cas cassés ; CHACUN doit être refusé par le bon critère, sinon le juge échoue.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { outils, lancer, sonder } from '../outils.mjs'
import { mesurerNiveau } from '../son.mjs'
import { lireManifeste, defautsLicence, FICHIERS } from '../musique.mjs'
import { plusLongFige } from '../juge.mjs'
import { SORTIES, DOSSIER_FICHES, fautesDeTexte, fenetre } from './monter.mjs'
import { lireProvenance, cheminRush } from './rushes.mjs'

const O = outils()
const ICI = path.dirname(fileURLToPath(import.meta.url))
const CHAINE = path.resolve(ICI, '..')
const lireJSON = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''))
const r2 = (x) => Math.round(x * 100) / 100

// ───────────────────────────── Mesures ─────────────────────────────

const LP = 54, HP = 96
/** Image grise LP×HP d'une vidéo à l'instant t, avec un filtre de cadrage optionnel avant la réduction. */
function grise(fichier, t, avant = '') {
  const r = lancer(O.ffmpeg, ['-v', 'error', '-ss', Math.max(0, t).toFixed(3), '-i', fichier, '-frames:v', '1', '-vf', `${avant}scale=${LP}:${HP}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { binaire: true })
  return r.code === 0 && r.sortie.length === LP * HP ? r.sortie : null
}

/** Corrélation de Pearson sur la bande 35 %-58 % de la hauteur (hors sous-titres et étiquettes). */
function correlation(a, b) {
  const y0 = Math.round(HP * 0.35), y1 = Math.round(HP * 0.58)
  const xs = [], ys = []
  for (let y = y0; y < y1; y++) for (let x = 0; x < LP; x++) { xs.push(a[y * LP + x]); ys.push(b[y * LP + x]) }
  const m = (v) => v.reduce((s, x) => s + x, 0) / v.length
  const ma = m(xs), mb = m(ys)
  let sab = 0, saa = 0, sbb = 0
  for (let i = 0; i < xs.length; i++) { const da = xs[i] - ma, db = ys[i] - mb; sab += da * db; saa += da * da; sbb += db * db }
  return sab / Math.sqrt(saa * sbb || 1)
}

/** R1 : chaque plan « rush » prouvé à l'image. */
export function verifierRushes(mp4, plan, P = lireProvenance()) {
  const D = [], preuves = []
  let reel = 0
  for (const p of plan.plans) {
    if (p.source !== 'rush') continue
    const r = P.rushes.find((x) => x.id === p.rush)
    if (!r) { D.push(`R1 rush « ${p.rush} » absent de provenance.json`); continue }
    if (r.plans_ecartes?.some(([a, b]) => p.de < b && p.de + 0.01 > a)) D.push(`R1 plan ${p.rush}@${p.de} pris dans une plage écartée`)
    const f = cheminRush(r)
    if (!fs.existsSync(f)) { D.push(`R1 rush ${p.rush} absent du disque`); continue }
    const milieu = (p.debut + p.fin) / 2
    const fiche = plan.fiche ? lireJSON(path.join(CHAINE, plan.fiche)) : null
    const fp = fiche?.plans?.find((x) => x.rush === p.rush && Math.abs(x.de - p.de) < 0.001)
    const [wl, wh, wx, wy] = fenetre(r.cadre_utile, fp?.x ?? 0.5, fp?.zoom || 1)
    const v = p.vitesse || 1
    const tSource = p.gel ? p.de : p.rembobine ? p.de + (p.fin - milieu) * v : p.de + (milieu - p.debut) * v
    // Le monteur bouge la caméra (poussée, recul, tenue à la main : zoom 1 à 1,16) : on cherche la meilleure
    // correspondance sur ces zooms et à ± 0,15 s ; une image qui ne vient pas du rush reste loin de 0,75.
    const a = grise(mp4, milieu)
    let c = -1
    for (const dt of [0, -0.15, 0.15]) for (const z of [1, 1.05, 1.1, 1.16]) {
      const zl = Math.round(wl / z / 2) * 2, zh = Math.round(wh / z / 2) * 2
      const b = grise(f, Math.max(0, tSource + dt), `crop=${zl}:${zh}:${wx + Math.round((wl - zl) / 2)}:${wy + Math.round((wh - zh) / 2)},`)
      if (a && b) c = Math.max(c, correlation(a, b))
      if (c >= 0.85) break
    }
    preuves.push({ plan: `${p.rush}@${p.de}`, a: r2(milieu), corr: r2(c) })
    if (c >= 0.75) reel += p.fin - p.debut
    else D.push(`R1 plan ${p.rush}@${p.de} (vidéo ${r2(p.debut)}-${r2(p.fin)} s) : l'image livrée ne correspond pas au rush déclaré (corrélation ${r2(c)})`)
  }
  const part = reel / plan.duree
  if (part < 0.5) D.push(`R1 images réelles prouvées sur ${Math.round(part * 100)} % de la durée (il faut ≥ 50 %) : ${plan.plans.filter((p) => p.source === 'photo').length} plan(s) sont des photos`)
  return { defauts: D, part: r2(part), preuves }
}

/** Instants (s) des événements d'un fichier ASS. */
function evenementsASS(ass) {
  const t = (s) => { const [h, m, x] = s.split(':'); return Number(h) * 3600 + Number(m) * 60 + Number(x) }
  return [...ass.matchAll(/^Dialogue: \d+,([^,]+),([^,]+),[^,]*,[^,]*,\d+,\d+,\d+,[^,]*,(.*)$/gm)].map((m) => ({ a: t(m[1]), b: t(m[2]), texte: m[3].replace(/\{[^}]*\}/g, '').replace(/\\N/g, ' ').trim() }))
}

/** Différence moyenne (0-255) entre deux images grises. */
const ecart = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length }

/** R2 : texte dès 0,05 s, mouvement dans la 1re seconde, son dès 0,5 s. */
export function verifierAccroche(mp4, ass) {
  const D = []
  const E = evenementsASS(ass).filter((e) => e.texte)
  const premier = Math.min(...E.map((e) => e.a))
  if (!(premier <= 0.05)) D.push(`R2 premier texte à ${r2(premier)} s (il faut un texte dès la première image)`)
  const im = [0.03, 0.33, 0.66, 0.97].map((t) => grise(mp4, t))
  const mvt = im.every(Boolean) ? Math.max(ecart(im[0], im[1]), ecart(im[1], im[2]), ecart(im[2], im[3])) : 0
  if (mvt < 2.5) D.push(`R2 aucune image ne bouge dans la première seconde (écart ${r2(mvt)})`)
  const tmp = path.join(os.tmpdir(), `tete-${process.pid}.wav`)
  lancer(O.ffmpeg, ['-v', 'error', '-y', '-t', '0.5', '-i', mp4, '-vn', '-ac', '1', '-ar', '16000', tmp])
  const n = mesurerNiveau(O, tmp)
  fs.rmSync(tmp, { force: true })
  if (!n || !(n.i > -35)) D.push(`R2 pas de son dans la première demi-seconde (${n?.i ?? '?'} LUFS)`)
  return { defauts: D, premierTexte: r2(premier), mouvement: r2(mvt) }
}

/** Enveloppe d'énergie à 100 Hz (différence positive : les attaques) d'un son, entre t0 et t0 + d. */
function enveloppe(fichier, t0, d) {
  const r = lancer(O.ffmpeg, ['-v', 'error', '-ss', String(t0), '-t', String(d), '-i', fichier, '-vn', '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], { binaire: true })
  if (r.code !== 0) return null
  const x = new Float32Array(r.sortie.buffer, r.sortie.byteOffset, Math.floor(r.sortie.length / 4))
  const e = []
  for (let i = 0; i + 80 <= x.length; i += 80) { let s = 0; for (let j = i; j < i + 80; j++) s += x[j] * x[j]; e.push(Math.log10(1e-9 + s / 80)) }
  return e.slice(1).map((v, i) => Math.max(0, v - e[i]))
}
function correlationDecalee(a, b, maxLag = 30) {
  const n = Math.min(a.length, b.length) - maxLag
  const m = (v) => v.slice(0, n).reduce((s, x) => s + x, 0) / n
  let best = -1
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const A = [], B = []
    for (let i = maxLag; i < n; i++) { A.push(a[i]); B.push(b[i + lag]) }
    const ma = m(A), mb = m(B)
    let sab = 0, saa = 0, sbb = 0
    for (let i = 0; i < A.length; i++) { const da = A[i] - ma, db = B[i] - mb; sab += da * db; saa += da * da; sbb += db * db }
    best = Math.max(best, sab / Math.sqrt(saa * sbb || 1))
  }
  return best
}

/** R3 : piste licenciée ET entendue. */
export function verifierMusique(mp4, plan, M = lireManifeste()) {
  const D = []
  const p = (M.pistes || []).find((x) => x.id === plan.musique?.id)
  if (!p) return { defauts: [`R3 musique « ${plan.musique?.id} » absente du manifeste`] }
  const d = defautsLicence(p)
  if (d.length) D.push(`R3 musique ${p.id} non utilisable : ${d.join(' ; ')}`)
  const f = path.join(FICHIERS, p.fichier)
  let c = null
  if (fs.existsSync(f)) {
    const duree = Math.min(plan.duree - 0.8, 12)
    const a = enveloppe(mp4, 0, duree), b = enveloppe(f, plan.musique.depart, duree)
    c = a && b ? correlationDecalee(a, b) : -1
    if (c < 0.6) D.push(`R3 le son livré n'est pas la piste déclarée ${p.id} (corrélation ${r2(c)})`)
  }
  return { defauts: D, correlation: c == null ? null : r2(c) }
}

/** R5 : la fiche, relue. */
export function verifierTextes(fiche) {
  const produit = fiche.produit ? lireJSON(path.join(CHAINE, 'produits', `${fiche.produit}.json`)) : null
  return fautesDeTexte(fiche, produit).map((x) => `R5 ${x}`)
}

/** R4 : différences structurelles deux à deux. */
export function verifierLot(lot) {
  const D = []
  const cle = (x) => `${x.plan.style.police}/${x.plan.style.mode}`
  const plansDe = (x) => new Set(x.plan.plans.map((p) => (p.rush ? `${p.rush}@${Math.round(p.de)}` : `${p.photo}:${(p.recadrage || []).join(',')}`)))
  for (let i = 0; i < lot.length; i++) for (let j = i + 1; j < lot.length; j++) {
    const A = lot[i], B = lot[j], n = `${A.plan.id} / ${B.plan.id}`
    if (A.plan.musique.id === B.plan.musique.id) D.push(`R4 ${n} : même musique`)
    if (cle(A) === cle(B)) D.push(`R4 ${n} : même typographie et même mode de texte (${cle(A)})`)
    if ((A.fiche.structure || '') === (B.fiche.structure || '')) D.push(`R4 ${n} : même structure`)
    if ((A.fiche.textes[0]?.texte || '') === (B.fiche.textes[0]?.texte || '')) D.push(`R4 ${n} : même accroche`)
    const a = plansDe(A), b = plansDe(B)
    const inter = [...a].filter((x) => b.has(x)).length, uni = new Set([...a, ...b]).size
    const jac = inter / (uni || 1)
    if (jac >= 0.5) D.push(`R4 ${n} : ${Math.round(jac * 100)} % de plans en commun`)
    const pa = A.plan.plans[0], pb = B.plan.plans[0]
    if ((pa.rush || pa.photo) === (pb.rush || pb.photo) && Math.abs((pa.de || 0) - (pb.de || 0)) < 1) D.push(`R4 ${n} : même premier plan`)
    const ia = grise(A.mp4, 0.4), ib = grise(B.mp4, 0.4)
    if (ia && ib && ecart(ia, ib) < 6) D.push(`R4 ${n} : la première image se ressemble (écart ${r2(ecart(ia, ib))})`)
  }
  return D
}

/** Juge une vidéo à partir de ses fichiers. */
export function jugerUne({ mp4, plan, ass, fiche }) {
  const D = [], m = { id: plan.id }
  if (!fs.existsSync(mp4) || fs.statSync(mp4).size < 50_000) return { defauts: ['vidéo absente ou vide'], mesures: m }
  const info = sonder(O, mp4)
  const duree = Number(info.format.duration)
  m.duree = r2(duree)
  const R1 = verifierRushes(mp4, plan); D.push(...R1.defauts); m.images_reelles = R1.part; m.preuves_rushes = R1.preuves
  const R2 = verifierAccroche(mp4, ass); D.push(...R2.defauts); m.premier_texte = R2.premierTexte; m.mouvement_tete = R2.mouvement
  const R3 = verifierMusique(mp4, plan); D.push(...R3.defauts); m.musique_correlation = R3.correlation
  D.push(...verifierTextes(fiche))
  if (duree < 12 || duree > 20.5) D.push(`R6 durée ${r2(duree)} s (12 à 20 s)`)
  if (Math.abs(duree - plan.duree) > 0.12) D.push(`R6 durée livrée ${r2(duree)} s ≠ montage prévu ${plan.duree} s (images perdues : les coupes ne tombent plus sur les temps forts)`)
  const n = mesurerNiveau(O, mp4)
  m.lufs = n?.i
  if (!n || Math.abs(n.i + 14) > 1.5) D.push(`R7 niveau ${n?.i ?? '?'} LUFS (-14 ± 1,5)`)
  const fige = plusLongFige(mp4)
  m.plus_long_fige = fige?.secondes
  if (!fige || fige.secondes > 0.8) D.push(`R8 passage figé de ${fige?.secondes ?? '?'} s à ${fige?.a ?? '?'} s`)
  const E = evenementsASS(ass)
  const dernier = E.filter((e) => e.texte).sort((a, b) => b.b - a.b)[0]
  if (!dernier || !/bio/i.test(dernier.texte) || dernier.b < duree - 1) D.push('R9 pas d\'appel final « lien dans la bio » à l\'écran jusqu\'à la fin')
  return { defauts: D, mesures: m }
}

function charger(id, dossier = SORTIES) {
  const plan = lireJSON(path.join(dossier, `${id}.plan.json`))
  return { mp4: path.join(dossier, `${id}.mp4`), plan, ass: fs.readFileSync(path.join(dossier, `${id}.ass`), 'utf8'), fiche: lireJSON(path.join(CHAINE, plan.fiche)) }
}

// ───────────────────────────── Sabotages ─────────────────────────────

function sabotages(ids) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sabotage-v2-'))
  const base = charger(ids.find((x) => fs.existsSync(path.join(SORTIES, `${x}.plan.json`)) && charger(x).plan.plans.some((p) => p.source === 'rush')))
  const enc = (args, sortie) => { const r = lancer(O.ffmpeg, ['-v', 'error', '-y', ...args, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'aac', sortie], { minutes: 10 }); if (r.code !== 0) throw new Error(r.erreur.slice(-300)); return sortie }
  const autre = (lireManifeste().pistes || []).find((p) => p.id !== base.plan.musique.id)
  const cas = [
    { nom: 'plans déclarés « rush » qui ne sont pas à l\'image (instant décalé de 5 s)', critere: 'R1', faire: () => ({ ...base, plan: { ...base.plan, plans: base.plan.plans.map((p) => (p.source === 'rush' ? { ...p, de: p.de > 20 ? p.de - 5 : p.de + 5 } : p)) } }) },
    { nom: 'vidéo faite de photos (aucun rush)', critere: 'R1', faire: () => ({ ...base, plan: { ...base.plan, plans: base.plan.plans.map((p) => ({ ...p, source: 'photo', photo: 'net-seau' })) } }) },
    { nom: 'premier texte à 1,5 s', critere: 'R2', faire: () => ({ ...base, ass: base.ass.replace(/^Dialogue: (\d+),0:00:00\.00,/m, 'Dialogue: $1,0:00:01.50,').replace(/^Dialogue: (\d+),0:00:00\.0\d,/gm, 'Dialogue: $1,0:00:01.50,') }) },
    { nom: 'image figée sur toute la première seconde', critere: 'R2', faire: () => ({ ...base, mp4: enc(['-i', base.mp4, '-vf', 'trim=start=1.1,setpts=PTS-STARTPTS,tpad=start_mode=clone:start_duration=1.1', '-af', 'anull'], path.join(tmp, 'tete-figee.mp4')) }) },
    { nom: 'autre musique que celle déclarée', critere: 'R3', faire: () => ({ ...base, mp4: enc(['-i', base.mp4, '-ss', String(autre.temps_forts[4]), '-i', path.join(FICHIERS, autre.fichier), '-map', '0:v', '-map', '1:a', '-shortest', '-af', 'loudnorm=I=-14'], path.join(tmp, 'autre-musique.mp4')) }) },
    { nom: 'piste absente du manifeste', critere: 'R3', faire: () => ({ ...base, plan: { ...base.plan, musique: { ...base.plan.musique, id: 'tt-inconnue' } } }) },
    { nom: '« Deux batteries fournies » puis « Et la voiture aussi »', critere: 'R5', faire: () => ({ ...base, fiche: { ...base.fiche, produit: 'nettoyeur', textes: [...base.fiche.textes.slice(0, 2), { temps: [0, 1], texte: 'Deux batteries fournies' }, { temps: [1, 2], texte: 'Et la voiture aussi' }] } }) },
    { nom: 'un chiffre à l\'écran', critere: 'R5', faire: () => ({ ...base, fiche: { ...base.fiche, textes: [...base.fiche.textes, { temps: [0, 1], texte: '13000 Pa' }] } }) },
    { nom: 'vidéo de 25 s', critere: 'R6', faire: () => ({ ...base, mp4: enc(['-i', base.mp4, '-vf', 'tpad=stop_mode=clone:stop_duration=9', '-af', 'apad=pad_dur=9'], path.join(tmp, 'longue.mp4')) }) },
    { nom: 'son à -24 LUFS', critere: 'R7', faire: () => ({ ...base, mp4: enc(['-i', base.mp4, '-af', 'volume=-10dB'], path.join(tmp, 'faible.mp4')) }) },
    { nom: '1,2 s d\'image figée au milieu', critere: 'R8', faire: () => ({ ...base, mp4: enc(['-i', base.mp4, '-filter_complex', '[0:v]split[a][b];[a]trim=end=6,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=1.2[x];[b]trim=start=6,setpts=PTS-STARTPTS[y];[x][y]concat=n=2:v=1:a=0[v]', '-map', '[v]', '-map', '0:a', '-shortest'], path.join(tmp, 'fige.mp4')) }) },
    { nom: 'pas d\'appel final', critere: 'R9', faire: () => ({ ...base, ass: base.ass.split('\n').filter((l) => !/BIO/i.test(l)).join('\n') }) },
  ]
  let ok = 0
  for (const c of cas) {
    let res
    try { res = jugerUne(c.faire()) } catch (e) { res = { defauts: [`(erreur : ${e.message.slice(0, 120)})`] } }
    const refuse = res.defauts.some((d) => d.startsWith(c.critere))
    console.log(`${refuse ? 'refusé ' : 'ACCEPTÉ'}  [${c.critere}] ${c.nom}${refuse ? '' : ' — défauts : ' + (res.defauts.join(' | ') || 'aucun')}`)
    if (refuse) ok++
  }
  // R4 : un lot fait de la même vidéo deux fois.
  const lot = verifierLot([{ ...base }, { ...base }])
  const r4 = lot.length > 0
  console.log(`${r4 ? 'refusé ' : 'ACCEPTÉ'}  [R4] deux fois la même vidéo dans le lot`)
  fs.rmSync(tmp, { recursive: true, force: true })
  return ok === cas.length && r4
}

// ───────────────────────────── Principal ─────────────────────────────

async function principal() {
  const a = process.argv.slice(2)
  let ids = a.filter((x) => !x.startsWith('--'))
  if (!ids.length) ids = fs.readdirSync(DOSSIER_FICHES).filter((f) => f.endsWith('.json')).map((f) => lireJSON(path.join(DOSSIER_FICHES, f)).id)
  ids = ids.filter((id) => fs.existsSync(path.join(SORTIES, `${id}.plan.json`)))
  if (a.includes('--sabotages')) { const bon = sabotages(ids); console.log(bon ? '\nsabotages : tous refusés (le juge sait échouer)' : '\nsabotages : AU MOINS UN ACCEPTÉ — juge à réparer'); return bon ? 0 : 1 }
  const lot = []
  let echecs = 0
  for (const id of ids) {
    const x = charger(id)
    const { defauts, mesures } = jugerUne(x)
    lot.push(x)
    console.log(`\n${defauts.length ? 'REFUSÉE' : 'BONNE  '}  ${id}  ${JSON.stringify({ duree: mesures.duree, images_reelles: mesures.images_reelles, premier_texte: mesures.premier_texte, musique: mesures.musique_correlation, lufs: mesures.lufs, fige: mesures.plus_long_fige })}`)
    for (const d of defauts) console.log(`   - ${d}`)
    if (defauts.length) echecs++
    fs.writeFileSync(path.join(SORTIES, `${id}.juge.json`), JSON.stringify({ juge_le: new Date().toISOString(), defauts, mesures }, null, 2) + '\n')
  }
  const L = verifierLot(lot)
  console.log(`\nLOT (${ids.length} vidéos) : ${L.length ? 'REFUSÉ' : 'structures différentes'}`)
  for (const d of L) console.log(`   - ${d}`)
  return echecs || L.length ? 1 : 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().then((c) => { process.exitCode = c }, (e) => { console.error(e.stack || e); process.exitCode = 1 })
}
