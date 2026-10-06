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
//   J7 durées             : le son couvre la vidéo (écart ≤ 0,15 s).
// --sabotages : fabrique des copies cassées (muette, voix d'une autre vidéo, niveau -10 dB, 1,5 s de silence en tête,
// piste sans preuve au manifeste, sous-titres décalés de 0,8 s) ; chacune DOIT être refusée, sinon le juge échoue.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ICI, outils, sonder, lancer } from './outils.mjs'
import { transcrire, ressemblance, tempsDesMots } from './voix.mjs'
import { mesurerNiveau, silences, extraireSon } from './son.mjs'
import { lireManifeste, defautsLicence, MANIFESTE, FICHIERS } from './musique.mjs'
import { repliquesDe, chargerProduit } from './generer.mjs'

const O = outils()

/** Instants d'apparition des mots dits, lus dans la composition (sous-titres « -s-k » et rubans « -r…-k »). */
export function instantsAffiches(html) {
  const plans = [...html.matchAll(/<section class="clip" id="(p\d+)"/g)].map((m) => m[1])
  const dernier = plans.at(-1) // le tampon final répète l'appel sans le redire
  const L = []
  for (const m of html.matchAll(/tl\.fromTo\("#(p\d+)-(s|r1|r2|r)-(\d+)", \{ opacity: 0, scale: (?:0\.45|1\.9)[^}]*\}, \{[^}]*\}, ([\d.]+)\);/g)) {
    if (m[1] === dernier) continue
    L.push({ plan: Number(m[1].slice(1)), bloc: m[2], k: Number(m[3]), t: Number(m[4]) })
  }
  const ordreBloc = { r1: 0, r2: 1, s: 2, r: 3 }
  return L.sort((a, b) => a.plan - b.plan || ordreBloc[a.bloc] - ordreBloc[b.bloc] || a.k - b.k).map((x) => x.t)
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

/** Juge une vidéo. Rend la liste des défauts (vide = bon) et les mesures. */
export function jugerVideo({ mp4, attendus, composition, rapport, manifeste, dossierMusique = FICHIERS, dossierPreuves, version }) {
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
  if (affiches.length !== attendus.length) D.push(`J3 ${affiches.length} mots affichés pour ${attendus.length} mots dits`)
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
  return { defauts: D, mesures }
}

function preparerCas(sortie, dossierLignes, id) {
  const L = JSON.parse(fs.readFileSync(path.join(dossierLignes, `${id}.json`), 'utf8'))
  const attendus = repliquesDe(L, chargerProduit(L.produit)).flatMap((r) => r.affiches)
  const dossier = path.join(sortie, id)
  const composition = fs.readFileSync(path.join(dossier, 'composition.html'), 'utf8')
  let rapport = null
  try { rapport = JSON.parse(fs.readFileSync(path.join(dossier, 'rapport.json'), 'utf8')) } catch {}
  return { id, attendus, composition, rapport }
}

function sabotages(sortie, dossierLignes, ids) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sabotage-tiktok-'))
  const A = preparerCas(sortie, dossierLignes, ids[0])
  const src = path.join(sortie, `${ids[0]}-voix.mp4`)
  const autre = ids[1] ? path.join(sortie, `${ids[1]}-voix.mp4`) : null
  const M = lireManifeste()
  const base = { attendus: A.attendus, composition: A.composition, rapport: A.rapport, manifeste: M, dossierPreuves: path.dirname(MANIFESTE), version: 'voix' }
  const ff = (args, f) => { const r = lancer(O.ffmpeg, ['-v', 'error', '-y', ...args, f]); if (r.code !== 0) throw new Error('sabotage : ' + r.erreur.slice(-300)); return f }
  const cas = [
    ['muette', () => ({ mp4: ff(['-i', src, '-an', '-c:v', 'copy'], path.join(tmp, 'muette.mp4')) }), /^J1/],
    ['niveau -10 dB', () => ({ mp4: ff(['-i', src, '-c:v', 'copy', '-af', 'volume=-10dB', '-c:a', 'aac'], path.join(tmp, 'bas.mp4')) }), /^J4/],
    ['1,5 s de silence en tête', () => ({ mp4: ff(['-i', src, '-c:v', 'copy', '-af', 'adelay=1500:all=1', '-c:a', 'aac', '-t', String(Number(sonder(O, src).format.duration))], path.join(tmp, 'tete.mp4')) }), /^J5/],
    ['sous-titres décalés de 0,8 s', () => ({ mp4: src, composition: A.composition.replace(/(tl\.fromTo\("#p\d+-(?:s|r1|r2|r)-\d+", \{ opacity: 0, scale: (?:0\.45|1\.9)[^}]*\}, \{[^}]*\}, )([\d.]+)\);/g, (m, a, t) => `${a}${(Number(t) + 0.8).toFixed(3)});`) }), /^J3/],
    ['piste sans preuve au manifeste', () => ({ mp4: src, manifeste: { pistes: [...(M.pistes || []), { id: 'tt-sabotage', titre: 'Son protégé', fichier: 'x.mp3', licence: { source: 'youtube', music_id: '1' } }] } }), /^J6/],
  ]
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
      const r = jugerVideo({ mp4, attendus: C.attendus, composition: C.composition, rapport: C.rapport, manifeste: M, dossierPreuves: path.dirname(MANIFESTE), version })
      if (r.defauts.length) refus++
      const m = r.mesures
      console.log(`${r.defauts.length ? 'REFUSÉ' : 'BON   '} ${path.basename(mp4)}  ${m.lufs} LUFS, tête ${m.silence_tete} s, ressemblance ${m.ressemblance}, sous-titres ${m.ecart_median}/${m.ecart_max} s`)
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
