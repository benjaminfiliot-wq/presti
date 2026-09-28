#!/usr/bin/env node
// scripts/socle-pubs-qa.mjs — le socle des juges de fabrication du pack pubs (fiche 026-124, « Ce qu'il faut faire »,
// point 5) : prouve LUI-MÊME que video-qa.mjs --profil=pub-locale (point 1) et visages-qa.mjs (points 2-3) tiennent
// leurs promesses, sur les jeux d'essai scripts/fixtures/026-pubs-contenu/socle/ (point 4). C'est ce script que
// scripts/juges-026-pubs-contenu-preuve.mjs --lot=09 lance, deux fois : une fois --racine=<référence> (avant cette
// fiche : video-qa n'a pas de profil pub-locale, visages-qa.mjs n'existe pas — SP-1 et SP-4 y échouent, c'est
// attendu), une fois --temoin (racine réelle : tout passe).
//
// video-qa.mjs et visages-qa.mjs sont testés À LA RACINE JUGÉE (--racine=<dossier> pointe l'un ou l'autre) : ce
// script les invoque sous <racine>/scripts/…, jamais son propre scripts/video-qa.mjs — sinon --racine=<référence>
// ne prouverait rien. Les FIXTURES (films du socle, calibrage, portrait) sont toujours les vraies, sous ce dépôt
// (.orchestre/travail/, scripts/fixtures/026-pubs-contenu/socle/) : ce ne sont pas elles qu'on juge.
//
// Fabrique d'abord les films du socle si besoin (scripts/fixtures/026-pubs-contenu/socle/fabriquer-films.mjs,
// idempotent : relance instantanée si déjà là). Écrit, seulement quand la racine jugée est celle par défaut (le
// dépôt réel, jamais --racine=<référence>) : .orchestre/preuves/026-124/etalonnage-visages.json (score et boîte de
// chaque détection sur les 68 photos du calibrage et les témoins positifs — la preuve demandée par la fiche).
//
// Critères (cahier du juge, fiche 026-124) :
//   SP-1 le film conforme du socle passe video-qa --profil=pub-locale --json (code 0, chaque critère « … (pub locale) »)
//   SP-2 chaque mutation échoue sur le critère attendu (durée, format, son, plan figé/image vive)
//   SP-3 non-régression : JSON de video-qa sur lestraque.mp4 --profil=landing et le film socle --profil=reseaux,
//        identique entre la racine jugée et video-qa.mjs actuel de ce dépôt
//   SP-4 visages-qa.mjs existe, accepte le modèle réel, refuse (code 2) un modèle corrompu d'un octet
//   SP-5 sur les 68 photos du calibrage : ≤ 1 fausse alerte au total, aucune sur tournage-copeaux-720.webp
//   SP-6 le portrait témoin (score ≥ 0.9) détecté seul, et incrusté à 30 % de largeur dans une photo de chantier 1080×1920
//   SP-7 sur le film de 4 s, les visages ne sont rapportés qu'entre 2 et 3 s
//   SP-8 deux passages de suite rendent le même JSON
// --temoin : SP-3 seul (non-régression) — les sept autres sont des critères de fabrication, déjà prouvés par le PASS
// de la fiche 026-124 ; les refaire à chaque témoin serait lent (68 photos, incrustation, modèle corrompu…) pour rien.
//
// Usage : node scripts/socle-pubs-qa.mjs [--racine=<dossier>] [--temoin]
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide.
// N'écrit que sous .orchestre/travail/socle-pubs-qa/, .orchestre/travail/socle/ (fabriquer-films.mjs) et, à la
// racine par défaut seulement, .orchestre/preuves/026-124/etalonnage-visages.json. Aucun secret, aucune photo d'une
// personne réelle vivante (le seul visage du socle est un portrait peint du domaine public).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'
import { R, TRAVAIL, lireOptionsOuQuitter } from './fixtures/025/commun.mjs'
import { creerRapport, court } from './lib/sql-essai.mjs'

const NOM = 'socle-pubs-qa'
const FICHE = '026-124'
const IDS = ['SP-1', 'SP-2', 'SP-3', 'SP-4', 'SP-5', 'SP-6', 'SP-7', 'SP-8']
const DELAI = 5 * 60_000
const posix = (p) => String(p).split(path.sep).join('/')
const rel = (p) => posix(path.relative(R, p)) || '.'

const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: [] })
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exitCode = 2 }
if (o.positionnels.length) { refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')}`); process.exit(process.exitCode) }
const racine = o.racine

// ── les fixtures, toujours les vraies (jamais sous --racine) ─────────────────────────────────────────────────────
const SOCLE_FAB = path.join(R, 'scripts', 'fixtures', '026-pubs-contenu', 'socle', 'fabriquer-films.mjs')
const SOCLE_FIXTURES = path.join(R, 'scripts', 'fixtures', '026-pubs-contenu', 'socle')
const SOCLE_FILMS = path.join(TRAVAIL, 'socle')
const PORTRAIT = path.join(SOCLE_FIXTURES, 'visage-domaine-public.jpg')
const CALIBRAGE = path.join(SOCLE_FIXTURES, 'calibrage-sans-visage.json')
const MON_TRAVAIL = path.join(TRAVAIL, 'socle-pubs-qa')
fs.mkdirSync(MON_TRAVAIL, { recursive: true })

function lancer(bin, args, { cwd = R, timeout = DELAI } = {}) {
  return spawnSync(bin, args, { cwd, encoding: 'utf8', timeout, windowsHide: true, maxBuffer: 64 << 20 })
}
function lancerNode(script, args, opts) { return lancer(process.execPath, [script, ...args], opts) }
function jsonOuNull(texte) { try { return JSON.parse(texte) } catch { return null } }

// ── SP-1/SP-2/SP-3 : video-qa.mjs, à la racine jugée ──────────────────────────────────────────────────────────────
function videoQaA(root, fichier, profil) {
  const script = path.join(root, 'scripts', 'video-qa.mjs')
  if (!fs.existsSync(script)) return { manquant: true, script }
  const r = lancerNode(script, [`--profil=${profil}`, '--json', fichier])
  const rapport = jsonOuNull(r.stdout)
  return { manquant: false, code: r.status, stderr: r.stderr, stdout: r.stdout, rapport: rapport?.[0] || null }
}

const s = creerRapport(NOM, IDS, { entete: `${NOM} (${FICHE}) — racine ${rel(racine)}${o.temoin ? ' — témoin' : ''}` })
const SAUT_TEMOIN = 'témoin : critère de fabrication, prouvé par le PASS de la fiche 026-124'

async function principal() {
  // ── fabrication (toujours la vraie, jamais dépendante de --racine) ───────────────────────────────────────────────
  const fab = lancerNode(SOCLE_FAB, [], { timeout: 20 * 60_000 })
  if (fab.status !== 0) {
    const msg = `fabriquer-films.mjs en échec (code ${fab.status}) : ${court(fab.stderr || fab.stdout, 300)}`
    for (const id of IDS) s.echoue(id, `non jugé : ${msg}`)
    return s.fin()
  }

  // ── SP-1 ─── --temoin : SP-3 seul ─────────────────────────────────────────────────────────────────────────────
  if (o.temoin) s.saute('SP-1', SAUT_TEMOIN)
  else {
    const film = path.join(SOCLE_FILMS, 'conforme.mp4')
    const v = videoQaA(racine, film, 'pub-locale')
    if (v.manquant) s.echoue('SP-1', `${rel(v.script)} absent sous la racine jugée`)
    else if (!v.rapport) s.echoue('SP-1', `video-qa --profil=pub-locale --json sur ${rel(film)} : sortie illisible (code ${v.code}) — ${court(v.stderr || v.stdout, 160)}`)
    else {
      const sansSuffixe = v.rapport.tests.filter((t) => !t.nom.endsWith(' (pub locale)'))
      if (v.code !== 0) s.echoue('SP-1', `code ${v.code} sur le film conforme : ${v.rapport.tests.filter((t) => !t.passe).map((t) => t.nom).join(', ')}`)
      if (sansSuffixe.length) s.echoue('SP-1', `${sansSuffixe.length} critère(s) sans « (pub locale) » : ${sansSuffixe.map((t) => t.nom).join(', ')}`)
      if (!s.enEchec('SP-1')) s.passe('SP-1', `code 0, ${v.rapport.tests.length} critères, tous « (pub locale) »`)
    }
  }

  // ── SP-2 ─── --temoin : SP-3 seul ─────────────────────────────────────────────────────────────────────────────
  if (o.temoin) s.saute('SP-2', SAUT_TEMOIN)
  else {
    const MUTATIONS = [
      { fichier: 'mutation-duree.mp4', attendu: ['Durée (pub locale)'], nom: 'durée' },
      { fichier: 'mutation-format.mp4', attendu: ['Format 1080×1920 (pub locale)'], nom: 'format' },
      { fichier: 'mutation-son.mp4', attendu: ['Son (pub locale)'], nom: 'son' },
      { fichier: 'mutation-diaporama.mp4', attendu: ['Aucun plan figé (pub locale)', 'L’image vit (pub locale)'], nom: 'diaporama figé' },
    ]
    for (const m of MUTATIONS) {
      const film = path.join(SOCLE_FILMS, m.fichier)
      const v = videoQaA(racine, film, 'pub-locale')
      if (v.manquant) { s.echoue('SP-2', `${m.nom} : ${rel(v.script)} absent sous la racine jugée`); continue }
      if (!v.rapport) { s.echoue('SP-2', `${m.nom} (${m.fichier}) : sortie illisible (code ${v.code}) — ${court(v.stderr || v.stdout, 140)}`); continue }
      if (v.code === 0) { s.echoue('SP-2', `${m.nom} (${m.fichier}) : code 0, aucun échec — ${m.attendu.join(' ou ')} attendu en échec`); continue }
      const echecsNoms = v.rapport.tests.filter((t) => !t.passe).map((t) => t.nom)
      const touche = m.attendu.find((a) => echecsNoms.includes(a))
      if (!touche) s.echoue('SP-2', `${m.nom} (${m.fichier}) : échoue sur ${echecsNoms.join(', ') || 'rien'}, attendu parmi ${m.attendu.join(' ou ')}`)
      else s.passe('SP-2', `${m.nom} : échoue sur « ${touche} »`)
    }
  }

  // ── SP-3 ───────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const CIBLES = [
      { fichier: path.join(R, 'public', 'promo', 'demo-site', 'lestraque.mp4'), profil: 'landing' },
      { fichier: path.join(SOCLE_FILMS, 'reseaux-temoin.mp4'), profil: 'reseaux' },
    ]
    const diffs = []
    for (const c of CIBLES) {
      if (!fs.existsSync(c.fichier)) { diffs.push(`${rel(c.fichier)} introuvable`); continue }
      const a = videoQaA(racine, c.fichier, c.profil)
      const b = videoQaA(R, c.fichier, c.profil)
      if (a.manquant) { diffs.push(`${rel(c.fichier)} --profil=${c.profil} : video-qa.mjs absent à la racine jugée`); continue }
      if (!a.rapport || !b.rapport) { diffs.push(`${rel(c.fichier)} --profil=${c.profil} : sortie illisible (racine ${a.rapport ? 'ok' : 'illisible'}, actuelle ${b.rapport ? 'ok' : 'illisible'})`); continue }
      const ja = JSON.stringify(a.rapport), jb = JSON.stringify(b.rapport)
      if (ja !== jb) diffs.push(`${rel(c.fichier)} --profil=${c.profil} : sortie différente entre la racine jugée et video-qa.mjs actuel de ce dépôt`)
    }
    if (diffs.length) s.echoue('SP-3', diffs.join(' ; '))
    else s.passe('SP-3', `${CIBLES.length} film(s) (landing, reseaux) : JSON identique entre la racine jugée et video-qa.mjs actuel`)
  }

  // ── SP-4 ─── --temoin : SP-3 seul ─────────────────────────────────────────────────────────────────────────────
  let SCRIPT_VISAGES_QA = null
  if (o.temoin) s.saute('SP-4', SAUT_TEMOIN)
  else {
    const script = path.join(racine, 'scripts', 'visages-qa.mjs')
    if (!fs.existsSync(script)) s.echoue('SP-4', `visages-qa.mjs absent sous ${rel(racine)}`)
    else {
      SCRIPT_VISAGES_QA = script
      const cal = jsonOuNull(fs.readFileSync(CALIBRAGE, 'utf8'))
      const imgTest = cal && cal.photos?.[0] ? path.join(R, cal.photos[0].fichier) : null
      if (!imgTest || !fs.existsSync(imgTest)) s.echoue('SP-4', 'aucune image de calibrage disponible pour l’essai du modèle réel')
      else {
        const r1 = lancerNode(script, [imgTest, '--json'])
        if (r1.status === 2) s.echoue('SP-4', `visages-qa.mjs refuse sur une image normale avec le modèle réel (code 2) : ${court(r1.stderr, 160)}`)
        else {
          const modeleReel = path.join(racine, 'scripts', 'modeles', 'face_detection_yunet_2023mar.onnx')
          if (!fs.existsSync(modeleReel)) s.echoue('SP-4', `modèle absent sous ${rel(racine)} : la corruption ne peut pas être testée`)
          else {
            const buf = Buffer.from(fs.readFileSync(modeleReel))
            buf[buf.length - 1] = buf[buf.length - 1] ^ 0xff
            const copie = path.join(MON_TRAVAIL, 'modele-corrompu.onnx')
            fs.writeFileSync(copie, buf)
            const r2 = lancerNode(script, [imgTest, `--modele=${copie}`])
            if (r2.status !== 2) s.echoue('SP-4', `modèle corrompu d’un octet : code ${r2.status}, 2 attendu — ${court(r2.stderr, 120)}`)
            else if (!s.enEchec('SP-4')) s.passe('SP-4', 'visages-qa.mjs présent, modèle réel accepté, modèle corrompu (1 octet) refusé en code 2')
          }
        }
      }
    }
  }

  // ── SP-5 ─── --temoin : SP-3 seul ─────────────────────────────────────────────────────────────────────────────
  let mesuresCalibrage = null
  if (o.temoin) s.saute('SP-5', SAUT_TEMOIN)
  else {
    if (!SCRIPT_VISAGES_QA) s.echoue('SP-5', 'non jugé : visages-qa.mjs absent (SP-4)')
    else {
      const cal = jsonOuNull(fs.readFileSync(CALIBRAGE, 'utf8'))
      const photos = (cal?.photos || []).map((p) => path.join(R, p.fichier))
      const manquantes = photos.filter((f) => !fs.existsSync(f))
      if (!photos.length) s.echoue('SP-5', `${rel(CALIBRAGE)} : aucune photo`)
      else if (manquantes.length) s.echoue('SP-5', `${manquantes.length} photo(s) du calibrage introuvable(s) : ${manquantes.slice(0, 3).map(rel).join(', ')}`)
      else {
        const r = lancerNode(SCRIPT_VISAGES_QA, [...photos, '--json'], { timeout: 8 * 60_000 })
        const rapport = jsonOuNull(r.stdout)
        if (!rapport) s.echoue('SP-5', `sortie illisible (code ${r.status}) : ${court(r.stderr || r.stdout, 160)}`)
        else {
          mesuresCalibrage = rapport
          const detections = []
          for (const f of rapport) for (const c of f.cadres) for (const v of c.visages) detections.push({ fichier: f.fichier, score: v.score })
          const surCopeaux = detections.filter((d) => d.fichier.replace(/\\/g, '/').endsWith('tournage-copeaux-720.webp'))
          if (surCopeaux.length) s.echoue('SP-5', `fausse alerte sur tournage-copeaux-720.webp (score ${surCopeaux.map((d) => d.score.toFixed(2)).join(', ')})`)
          if (detections.length > 1) s.echoue('SP-5', `${detections.length} fausse(s) alerte(s) sur ${photos.length} photos, au plus 1 admise : ${detections.slice(0, 5).map((d) => `${rel(d.fichier)} (${d.score.toFixed(2)})`).join(', ')}`)
          if (!s.enEchec('SP-5')) s.passe('SP-5', `${detections.length} fausse(s) alerte(s) sur ${photos.length} photos (≤ 1 admise), aucune sur tournage-copeaux-720.webp`)
        }
      }
    }
  }

  // ── SP-6 ─── --temoin : SP-3 seul ─────────────────────────────────────────────────────────────────────────────
  let mesuresTemoins = null
  if (o.temoin) s.saute('SP-6', SAUT_TEMOIN)
  else {
    if (!SCRIPT_VISAGES_QA) s.echoue('SP-6', 'non jugé : visages-qa.mjs absent (SP-4)')
    else if (!fs.existsSync(PORTRAIT)) s.echoue('SP-6', `portrait témoin absent : ${rel(PORTRAIT)}`)
    else {
      const meilleurScore = (rapport) => (rapport?.[0]?.cadres?.[0]?.visages || []).reduce((m, v) => Math.max(m, v.score), -1)

      const r1 = lancerNode(SCRIPT_VISAGES_QA, [PORTRAIT, '--json'])
      const rap1 = jsonOuNull(r1.stdout)
      const s1 = rap1 ? meilleurScore(rap1) : -1
      if (s1 < 0.9) s.echoue('SP-6', `portrait seul : score ${s1 < 0 ? 'aucune détection' : s1.toFixed(3)}, ≥ 0,90 attendu`)

      const composite = path.join(MON_TRAVAIL, 'portrait-incruste-30pct.jpg')
      const fond = path.join(R, 'public', 'sites-demo', 'carreleur', 'images', 'dallage-720.webp')
      let composeOk = true
      try {
        const fondBuf = await sharp(fond).resize(1080, 1920, { fit: 'cover' }).toBuffer()
        const portraitBuf = await sharp(PORTRAIT).resize({ width: 324 }).toBuffer()
        const meta = await sharp(portraitBuf).metadata()
        const left = Math.round((1080 - meta.width) / 2), top = Math.round((1920 - meta.height) / 2)
        await sharp(fondBuf).composite([{ input: portraitBuf, left, top }]).jpeg({ quality: 92 }).toFile(composite)
      } catch (e) { composeOk = false; s.echoue('SP-6', `incrustation (sharp) : ${court(e.message, 160)}`) }

      let s2 = -1
      if (composeOk) {
        const r2 = lancerNode(SCRIPT_VISAGES_QA, [composite, '--json'])
        const rap2 = jsonOuNull(r2.stdout)
        s2 = rap2 ? meilleurScore(rap2) : -1
        if (s2 < 0.9) s.echoue('SP-6', `portrait incrusté à 30 % de largeur dans ${rel(fond)} (1080×1920) : score ${s2 < 0 ? 'aucune détection' : s2.toFixed(3)}, ≥ 0,90 attendu`)
      }
      if (!s.enEchec('SP-6')) s.passe('SP-6', `portrait seul score ${s1.toFixed(3)}, incrusté (30 % de largeur) score ${s2.toFixed(3)}`)
      mesuresTemoins = { portrait_seul: { fichier: rel(PORTRAIT), score: s1, visages: rap1?.[0]?.cadres?.[0]?.visages || [] }, portrait_incruste_30pct: { fichier: rel(composite), fond: rel(fond), score: s2 } }
    }
  }

  // ── SP-7 ─── --temoin : SP-3 seul ─────────────────────────────────────────────────────────────────────────────
  if (o.temoin) s.saute('SP-7', SAUT_TEMOIN)
  else {
    const film = path.join(SOCLE_FILMS, 'portrait-4s.mp4')
    if (!SCRIPT_VISAGES_QA) s.echoue('SP-7', 'non jugé : visages-qa.mjs absent (SP-4)')
    else if (!fs.existsSync(film)) s.echoue('SP-7', `film témoin absent : ${rel(film)}`)
    else {
      const r = lancerNode(SCRIPT_VISAGES_QA, [film, '--json', '--ips=4'])
      const rapport = jsonOuNull(r.stdout)
      if (!rapport) s.echoue('SP-7', `sortie illisible (code ${r.status}) : ${court(r.stderr || r.stdout, 160)}`)
      else {
        const instants = rapport[0].cadres.filter((c) => c.visages.length).map((c) => c.instant)
        const horsFenetre = instants.filter((t) => t < 2 - 1e-9 || t > 3 + 1e-9)
        if (!instants.length) s.echoue('SP-7', 'aucune détection sur le film de 4 s (portrait attendu entre 2 et 3 s)')
        else if (horsFenetre.length) s.echoue('SP-7', `détection(s) hors de [2, 3] s : ${horsFenetre.map((t) => t.toFixed(2)).join(', ')} s`)
        else s.passe('SP-7', `visage détecté à ${instants.map((t) => t.toFixed(2)).join(', ')} s, tous dans [2, 3] s`)
      }
    }
  }

  // ── SP-8 ─── --temoin : SP-3 seul ─────────────────────────────────────────────────────────────────────────────
  if (o.temoin) s.saute('SP-8', SAUT_TEMOIN)
  else {
    if (!SCRIPT_VISAGES_QA) s.echoue('SP-8', 'non jugé : visages-qa.mjs absent (SP-4)')
    else if (!fs.existsSync(PORTRAIT)) s.echoue('SP-8', `portrait témoin absent : ${rel(PORTRAIT)}`)
    else {
      const a = lancerNode(SCRIPT_VISAGES_QA, [PORTRAIT, '--json'])
      const b = lancerNode(SCRIPT_VISAGES_QA, [PORTRAIT, '--json'])
      if (a.status !== b.status || a.stdout !== b.stdout) s.echoue('SP-8', `deux passages différents (codes ${a.status}/${b.status})`)
      else s.passe('SP-8', `deux passages identiques (code ${a.status}, ${a.stdout.length} octet(s) de JSON)`)
    }
  }

  // ── la preuve d'étalonnage, seulement à la racine par défaut (jamais sous --racine=<référence>) ────────────────────
  if (o.racineParDefaut && (mesuresCalibrage || mesuresTemoins)) {
    const dossier = path.join(R, '.orchestre', 'preuves', FICHE)
    fs.mkdirSync(dossier, { recursive: true })
    const etalonnage = {
      _source: `scripts/socle-pubs-qa.mjs — SP-5 (68 photos du calibrage) et SP-6 (témoins positifs), fiche ${FICHE}. Score et boîte (x, y, l, h en pixels) de chaque détection au seuil 0,9.`,
      genere_le: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      seuil: 0.9,
      photos_calibrage: mesuresCalibrage ? mesuresCalibrage.map((f) => ({ fichier: rel(f.fichier), visages: f.cadres[0]?.visages || [] })) : null,
      temoins_positifs: mesuresTemoins,
    }
    fs.writeFileSync(path.join(dossier, 'etalonnage-visages.json'), JSON.stringify(etalonnage, null, 2))
  }

  return s.fin()
}

process.exitCode = await principal()
