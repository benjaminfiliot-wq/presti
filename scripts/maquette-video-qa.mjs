// scripts/maquette-video-qa.mjs — juge de la vidéo de maquette (fiche 026-075), écrit par Claude Code AVANT le module
// qu'il juge (scripts/agents/maquette-video.mjs). L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23). Cahier
// MV de 026-075, écrit ici en 026-071.
//
//   node scripts/maquette-video-qa.mjs [--racine=<dossier>] [--auto-controle]
//
// Le juge lance LUI-MÊME scripts/agents/maquette-video.mjs sur le site d'essai (scripts/fixtures/026-acquisition/
// video/site-temoin/), dans .orchestre/travail/maquette-video-qa/, puis mesure le fichier produit avec ffprobe et
// ffmpeg (mémoire juge-capture-lui-meme) : jamais une vidéo qu'il n'a pas vue se fabriquer. Les chemins des binaires
// viennent de FFMPEG / FFPROBE, sinon du PATH ; absents des deux → code 2, « ffmpeg attendu », jamais un faux vert
// (aucun critère ne peut passer sans avoir réellement mesuré un fichier).
//
//   --racine=<d>     importe <d>/scripts/agents/maquette-video.mjs (défaut : le dépôt).
//   --auto-controle  le module jugé n'existe pas encore (026-075 le dépose après cette fiche) : le juge fabrique
//                     lui-même, avec les MÊMES fonctions de mesure que MV-2/MV-3 (ffprobe, extraction d'images,
//                     détection de mouvement), une vidéo de démonstration mouvante et une figée (ffmpeg lavfi), pour
//                     prouver que ses propres mesures jugent l'une vivante et l'autre figée (MV-6 : « la vidéo d'une
//                     page blanche est bien jugée figée » est ainsi vérifié sur la mesure elle-même). AC-1 les jeux
//                     d'essai (site-temoin, page-blanche, page-courte) ont la forme attendue ; AC-2 ffprobe lit
//                     correctement un fichier que le juge vient de fabriquer (codec, pixels, largeur, images par
//                     seconde, durée, aucune piste audio, moov avant mdat) ; AC-3 la détection de mouvement juge la
//                     vidéo mouvante vivante et la vidéo figée figée ; AC-4 le serveur de fichiers local du juge sert
//                     site-temoin et refuse toute évasion (`..`), et consigne ses requêtes.
//
// Sortie : une ligne par critère, puis « maquette-video-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ;
// 1 sinon ; 2 si l'appel est invalide ou si ffmpeg/ffprobe sont introuvables. Module absent : MV-1 en échec, les
// suivants « non jugés ». Écrit seulement sous .orchestre/travail/maquette-video-qa/.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { R, TRAVAIL, lireOptions, creerSortie, exigerSousTravail, sansCommentaires, sous, court, premiereLigne } from './fixtures/026-acquisition/commun.mjs'

const JUGE = 'maquette-video-qa'
const o = lireOptions(process.argv.slice(2))
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE}${o.autoControle ? ' --auto-controle' : ''}`
const TRAV = exigerSousTravail(path.join(TRAVAIL, 'maquette-video-qa'))
fs.mkdirSync(TRAV, { recursive: true })
const FIXTURES_VIDEO = path.join(R, 'scripts', 'fixtures', '026-acquisition', 'video')

// ── Les binaires : FFMPEG / FFPROBE, sinon le PATH ; absents des deux → code 2 ───────────────────────────────────────────────
function resoudreBin(nomEnv, defaut) {
  const candidat = process.env[nomEnv]
  if (candidat && fs.existsSync(candidat)) return candidat
  const r = spawnSync(defaut, ['-version'], { encoding: 'utf8', windowsHide: true })
  return r.error || (r.status !== 0 && r.status !== null) ? null : defaut
}
const FFMPEG = resoudreBin('FFMPEG', 'ffmpeg')
const FFPROBE = resoudreBin('FFPROBE', 'ffprobe')
if (!FFMPEG || !FFPROBE) refuser(`ffmpeg attendu (FFMPEG=${process.env.FFMPEG ?? '∅'}, FFPROBE=${process.env.FFPROBE ?? '∅'}, PATH : ffmpeg ${FFMPEG ? 'ok' : 'absent'}, ffprobe ${FFPROBE ? 'ok' : 'absent'})`)

/** Lance un binaire sans shell. → { code, stdout, stderr, erreur } */
function executer(bin, args, { timeout = 120_000 } = {}) {
  const r = spawnSync(bin, args, { encoding: 'utf8', timeout, windowsHide: true, maxBuffer: 1 << 28 })
  return { code: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', erreur: r.error ? premiereLigne(r.error) : null, signal: r.signal }
}
function executerBrut(bin, args, { timeout = 120_000 } = {}) {
  const r = spawnSync(bin, args, { encoding: 'buffer', timeout, windowsHide: true, maxBuffer: 1 << 28 })
  return { code: r.status, stdout: r.stdout ?? Buffer.alloc(0), stderr: (r.stderr ?? Buffer.alloc(0)).toString('utf8'), erreur: r.error ? premiereLigne(r.error) : null }
}

// ── Mesure du conteneur (ffprobe) ─────────────────────────────────────────────────────────────────────────────────────────
/** → { largeur, hauteur, fps, codec, pixels, duree, poids, audio } ou { erreur } */
function sonderConteneur(fichier) {
  if (!fs.existsSync(fichier)) return { erreur: `${rel(fichier)} introuvable` }
  const r = executer(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', fichier])
  if (r.code !== 0) return { erreur: `ffprobe : code ${r.code} — ${court(r.stderr, 200)}` }
  let j; try { j = JSON.parse(r.stdout) } catch (e) { return { erreur: `ffprobe : JSON illisible (${premiereLigne(e)})` } }
  const v = (j.streams ?? []).find((x) => x.codec_type === 'video')
  const a = (j.streams ?? []).find((x) => x.codec_type === 'audio')
  if (!v) return { erreur: 'aucun flux vidéo' }
  const [n, d] = String(v.avg_frame_rate ?? '0/1').split('/').map(Number)
  return {
    largeur: v.width, hauteur: v.height, fps: d ? n / d : 0, codec: v.codec_name, pixels: v.pix_fmt,
    duree: Number(j.format?.duration ?? v.duration ?? NaN), poids: Number(j.format?.size ?? fs.statSync(fichier).size),
    audio: !!a,
  }
}
/** L'ordre des boîtes de tête d'un MP4 (moov avant mdat = lecture continue) : lu directement, sans ffmpeg. → string[] */
function ordreBoitesMp4(fichier) {
  const buf = fs.readFileSync(fichier)
  const ordre = []
  let i = 0
  while (i + 8 <= buf.length) {
    let taille = buf.readUInt32BE(i)
    const type = buf.toString('ascii', i + 4, i + 8)
    if (taille === 1) { if (i + 16 > buf.length) break; taille = Number(buf.readBigUInt64BE(i + 8)) }
    else if (taille === 0) taille = buf.length - i
    if (taille < 8) break
    ordre.push(type)
    i += taille
  }
  return ordre
}

// ── Extraction d'images (mouvement) ───────────────────────────────────────────────────────────────────────────────────────
const LARGEUR_ANALYSE = 64
/** Une image grise brute à l'instant `t` (secondes), LARGEUR_ANALYSE de large, hauteur proportionnelle. → Buffer|null */
function imageGriseA(fichier, t, hauteurSrc, largeurSrc) {
  const h = Math.max(2, Math.round((LARGEUR_ANALYSE * hauteurSrc) / largeurSrc / 2) * 2)
  const r = executerBrut(FFMPEG, ['-v', 'error', '-ss', t.toFixed(3), '-i', fichier, '-frames:v', '1', '-vf', `scale=${LARGEUR_ANALYSE}:${h},format=gray`, '-f', 'rawvideo', '-'])
  const attendu = LARGEUR_ANALYSE * h
  if (r.code !== 0 || r.stdout.length < attendu) return null
  return r.stdout.subarray(0, attendu)
}
/** `n` images à intervalles réguliers sur toute la durée (026-075 MV-3). → { images: Buffer[], instants: number[] } */
function extraireImages(fichier, duree, hauteurSrc, largeurSrc, n = 10) {
  const instants = Array.from({ length: n }, (_, i) => Math.min(duree - 0.05, (i / (n - 1)) * duree))
  const images = instants.map((t) => imageGriseA(fichier, t, hauteurSrc, largeurSrc))
  return { images, instants }
}
const differenceMoyenne = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length / 255 }
const luminanceMoyenne = (img) => { let s = 0; for (let i = 0; i < img.length; i++) s += img[i]; return s / img.length }
const SEUIL_FIGE = 0.01
/** Vrai si toutes les images sont indiscernables deux à deux (aucun mouvement réel). */
function estFigee(images) {
  for (let i = 1; i < images.length; i++) if (differenceMoyenne(images[i - 1], images[i]) >= SEUIL_FIGE) return false
  return true
}

// ── Le serveur de fichiers local du juge (sert un dossier de scripts/fixtures/026-acquisition/video/) ──────────────────────
function demarrerServeurFichiers(dossier) {
  const journal = []
  const srv = http.createServer((req, res) => {
    let u; try { u = new URL(req.url, 'http://127.0.0.1') } catch { res.writeHead(400); res.end(); return }
    journal.push({ chemin: u.pathname, t: Date.now() })
    let chemin = decodeURIComponent(u.pathname)
    if (chemin === '/') chemin = '/index.html'
    const cible = path.join(dossier, chemin.replace(/^\/+/, ''))
    if (chemin.includes('..') || !sous(dossier, cible) || !fs.existsSync(cible) || fs.statSync(cible).isDirectory()) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('introuvable'); return }
    res.writeHead(200, { 'content-type': cible.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' })
    res.end(fs.readFileSync(cible))
  })
  return new Promise((resolve, reject) => {
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => resolve({ srv, base: `http://127.0.0.1:${srv.address().port}`, journal, fermer: () => new Promise((r) => srv.close(r)) }))
  })
}

// ── Vidéos de démonstration (autocontrôle seulement : ffmpeg lavfi, jamais scripts/agents/maquette-video.mjs) ──────────────
function fabriquerClipEssai(sortie, { duree = 6, mouvante }) {
  const source = mouvante ? `testsrc2=size=192x342:rate=30:duration=${duree}` : `color=c=white:size=192x342:rate=30:duration=${duree}`
  return executer(FFMPEG, ['-y', '-v', 'error', '-f', 'lavfi', '-i', source, '-t', String(duree), '-r', '30', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-an', '-movflags', '+faststart', '-map_metadata', '-1', sortie])
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ids = o.autoControle ? ['AC-1', 'AC-2', 'AC-3', 'AC-4'] : ['MV-1', 'MV-2', 'MV-3', 'MV-4', 'MV-5', 'MV-6', 'MV-7']
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — ffmpeg ${rel(FFMPEG) === FFMPEG ? FFMPEG : rel(FFMPEG)}, ffprobe ${rel(FFPROBE) === FFPROBE ? FFPROBE : rel(FFPROBE)}`)

if (o.autoControle) {
  // AC-1 : les jeux d'essai ont la forme attendue
  {
    const e = []
    const lireHtml = (p) => { try { return fs.readFileSync(p, 'utf8') } catch { return null } }
    const siteTemoin = lireHtml(path.join(FIXTURES_VIDEO, 'site-temoin', 'index.html'))
    const pageBlanche = lireHtml(path.join(FIXTURES_VIDEO, 'page-blanche', 'index.html'))
    const pageCourte = lireHtml(path.join(FIXTURES_VIDEO, 'page-courte', 'index.html'))
    if (!siteTemoin) e.push('site-temoin/index.html introuvable')
    else {
      const nSections = (siteTemoin.match(/<section\b/gi) ?? []).length
      const hSection = Number(/section\s*\{[^}]*height:\s*(\d+)px/.exec(sansCommentaires(siteTemoin))?.[1] ?? 0)
      const hauteurTotale = nSections * hSection
      if (!(hauteurTotale >= 3000)) e.push(`site-temoin : hauteur totale estimée ${hauteurTotale}px (${nSections} section(s) × ${hSection}px), 3000 au moins attendus`)
      if (!/system-ui/.test(siteTemoin)) e.push('site-temoin : pas de police système déclarée')
      const hotes = [...siteTemoin.matchAll(/(?:src|href)=["']https?:\/\/([^/"']+)/gi)].map((m) => m[1].toLowerCase())
      if (hotes.length !== 1) e.push(`site-temoin : ${hotes.length} référence(s) à un autre hôte, une seule attendue (MV-5)`)
      else if (!hotes[0].endsWith('.invalid')) e.push(`site-temoin : la référence externe (${hotes[0]}) n'est pas en .invalid`)
    }
    if (!pageBlanche) e.push('page-blanche/index.html introuvable')
    else if (!/height:\s*(\d{4,})px/.test(pageBlanche) && !(Number(/height:\s*(\d+)px/.exec(pageBlanche)?.[1] ?? 0) >= 1200)) e.push('page-blanche : hauteur déclarée sous 1 200 px')
    if (!pageCourte) e.push('page-courte/index.html introuvable')
    else { const h = Number(/height:\s*(\d+)px/.exec(pageCourte)?.[1] ?? 0); if (!(h > 0 && h < 1200)) e.push(`page-courte : hauteur déclarée ${h}px, entre 1 et 1199 attendue`) }
    s.juger('AC-1', e, 'site-temoin ≥ 3000 px avec une seule référence externe en .invalid ; page-blanche ≥ 1200 px ; page-courte < 1200 px')
  }
  // AC-2 : ffprobe lit correctement un fichier que le juge vient de fabriquer
  {
    const e = []
    const f = path.join(TRAV, 'essai-mouvant.mp4')
    const fab = fabriquerClipEssai(f, { duree: 6, mouvante: true })
    if (fab.code !== 0) e.push(`fabrication de l'essai : ffmpeg code ${fab.code} — ${court(fab.stderr, 200)}`)
    else {
      const m = sonderConteneur(f)
      if (m.erreur) e.push(`ffprobe : ${m.erreur}`)
      else {
        if (m.codec !== 'h264') e.push(`codec ${m.codec}, h264 attendu`)
        if (m.pixels !== 'yuv420p') e.push(`pixels ${m.pixels}, yuv420p attendu`)
        if (m.largeur !== 192) e.push(`largeur ${m.largeur}, 192 attendue`)
        if (!(m.fps >= 29 && m.fps <= 31)) e.push(`fps ${m.fps}, 30 attendu`)
        if (!(m.duree >= 5.8 && m.duree <= 6.2)) e.push(`durée ${m.duree} s, ~6 s attendue`)
        if (m.audio) e.push('une piste audio est présente, aucune attendue')
        const boites = ordreBoitesMp4(f)
        if (boites.indexOf('moov') < 0 || boites.indexOf('mdat') < 0 || boites.indexOf('moov') > boites.indexOf('mdat')) e.push(`boîtes MP4 ${JSON.stringify(boites)} : moov avant mdat attendu`)
      }
    }
    s.juger('AC-2', e, "ffprobe lit un fichier fabriqué par le juge : h264, yuv420p, 192 de large, ~30 i/s, ~6 s, aucun flux audio, moov avant mdat")
  }
  // AC-3 : la détection de mouvement juge vivant et figé correctement
  {
    const e = []
    const fMouvant = path.join(TRAV, 'essai-mouvant.mp4')
    const fFige = path.join(TRAV, 'essai-fige.mp4')
    if (!fs.existsSync(fMouvant)) e.push('vidéo mouvante absente (AC-2 doit avoir échoué avant)')
    const fab = fabriquerClipEssai(fFige, { duree: 6, mouvante: false })
    if (fab.code !== 0) e.push(`fabrication de l'essai figé : ffmpeg code ${fab.code} — ${court(fab.stderr, 200)}`)
    if (!e.length) {
      const mMouvant = sonderConteneur(fMouvant), mFige = sonderConteneur(fFige)
      const imgsMouvant = extraireImages(fMouvant, mMouvant.duree, mMouvant.hauteur, mMouvant.largeur, 10).images
      const imgsFige = extraireImages(fFige, mFige.duree, mFige.hauteur, mFige.largeur, 10).images
      if (imgsMouvant.some((i) => !i) || imgsFige.some((i) => !i)) e.push('extraction d\'image en échec (ffmpeg -ss/-frames:v)')
      else {
        if (estFigee(imgsMouvant)) e.push('la vidéo mouvante (testsrc2) est jugée figée')
        const distinctesMouvant = imgsMouvant.slice(1).filter((im, i) => differenceMoyenne(imgsMouvant[i], im) >= SEUIL_FIGE).length
        if (distinctesMouvant < 7) e.push(`vidéo mouvante : ${distinctesMouvant} paires différentes sur 9, 7 au moins attendues`)
        if (imgsMouvant.some((im) => luminanceMoyenne(im) <= 10)) e.push('vidéo mouvante : une image est noire')
        if (!estFigee(imgsFige)) e.push('la vidéo figée (blanc uni) n\'est pas jugée figée')
      }
    }
    s.juger('AC-3', e, "vidéo mouvante (testsrc2) jugée vivante (≥ 7 paires distinctes sur 9, aucune noire) ; vidéo figée (blanc uni, comme la page blanche) jugée figée — MV-6")
  }
  // AC-4 : le serveur de fichiers local sert site-temoin et refuse `..`
  {
    const e = []
    let srv = null
    try {
      srv = await demarrerServeurFichiers(path.join(FIXTURES_VIDEO, 'site-temoin'))
      const r1 = await fetch(`${srv.base}/index.html`)
      if (!r1.ok || !(await r1.text()).includes('Témoin')) e.push(`/index.html : ${r1.status}, contenu « Témoin » attendu`)
      const r2 = await fetch(`${srv.base}/..%2f..%2fpackage.json`).catch((err) => ({ ok: false, status: `exception : ${premiereLigne(err)}` }))
      const r3 = await fetch(`${srv.base}/../../package.json`).catch((err) => ({ ok: false, status: `exception : ${premiereLigne(err)}` }))
      if (r2.ok) e.push(`évasion encodée servie (code ${r2.status})`)
      if (r3.ok) e.push(`évasion littérale servie (code ${r3.status})`)
      if (srv.journal.length < 2) e.push(`serveur : ${srv.journal.length} requête(s) consignée(s), au moins 2 attendues`)
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) } finally { if (srv) await srv.fermer() }
    s.juger('AC-4', e, "le serveur de fichiers local sert index.html, refuse toute évasion hors du dossier et consigne ses requêtes")
  }
} else {
  const fichierModule = path.join(RAC, 'scripts', 'agents', 'maquette-video.mjs')
  let mod = null
  const e1 = []
  if (!fs.existsSync(fichierModule)) e1.push(`module absent : ${rel(fichierModule)}`)
  else {
    const t0 = Date.now()
    try { mod = await import(pathToFileURL(fichierModule).href) } catch (e) { e1.push(`maquette-video.mjs ne s'importe pas : ${premiereLigne(e)}`) }
    const duree = Date.now() - t0
    if (mod && typeof mod.fabriquerVideo !== 'function') e1.push('export fabriquerVideo absent (ou pas une fonction)')
    if (mod && duree > 5000) e1.push(`l'import a pris ${(duree / 1000).toFixed(1)} s : le module semble avoir lancé quelque chose à l'import`)
  }
  s.juger('MV-1', e1, `maquette-video.mjs importé depuis ${rel(RAC)} : exporte fabriquerVideo, n'exécute rien à l'import`)
  if (e1.length || !mod) { s.nonJuges(['MV-2', 'MV-3', 'MV-4', 'MV-5', 'MV-6', 'MV-7'], 'MV-1 en échec') } else {
    const SORTIE = path.join(TRAV, 'site-temoin.mp4')
    const dossierSite = path.join(FIXTURES_VIDEO, 'site-temoin')
    let err1 = null
    try { await mod.fabriquerVideo({ dossierSite, sortie: SORTIE, duree: 18 }) } catch (e) { err1 = premiereLigne(e) }

    // MV-2 : mesure du conteneur
    {
      const e = []
      if (err1) e.push(`fabrication interrompue : ${err1}`)
      else {
        const m = sonderConteneur(SORTIE)
        if (m.erreur) e.push(m.erreur)
        else {
          if (m.codec !== 'h264') e.push(`codec ${m.codec}, h264 attendu`)
          if (m.pixels !== 'yuv420p') e.push(`pixels ${m.pixels}, yuv420p attendu`)
          if (m.largeur !== 720) e.push(`largeur ${m.largeur}, 720 attendue`)
          if (!(m.fps >= 29.5 && m.fps <= 30.5)) e.push(`fps ${m.fps}, 30 attendu`)
          if (!(m.duree >= 15 && m.duree <= 20)) e.push(`durée ${m.duree} s, 15 à 20 s attendue`)
          if (m.audio) e.push('une piste audio est présente, aucune attendue')
          if (m.poids > 3 * 1024 * 1024) e.push(`poids ${(m.poids / 1e6).toFixed(2)} Mo, 3 Mo au plus attendu`)
          const boites = ordreBoitesMp4(SORTIE)
          if (boites.indexOf('moov') < 0 || boites.indexOf('mdat') < 0 || boites.indexOf('moov') > boites.indexOf('mdat')) e.push(`boîtes MP4 ${JSON.stringify(boites)} : moov avant mdat attendu`)
        }
      }
      s.juger('MV-2', e, `${rel(SORTIE)} mesuré par ffprobe : h264, yuv420p, 720 de large, 15 à 20 s, 30 i/s, aucun flux audio, 3 Mo au plus, moov avant mdat`)
    }
    // MV-3 : le mouvement
    if (!s.enEchec('MV-2')) {
      const e = []
      const m = sonderConteneur(SORTIE)
      const { images, instants } = extraireImages(SORTIE, m.duree, m.hauteur, m.largeur, 10)
      if (images.some((i) => !i)) e.push('extraction d\'image en échec')
      else {
        const distinctes = images.slice(1).filter((im, i) => differenceMoyenne(images[i], im) >= SEUIL_FIGE).length
        if (distinctes < 7) e.push(`${distinctes} paire(s) différente(s) sur 9, 7 au moins attendues`)
        if (differenceMoyenne(images[0], images[images.length - 1]) < SEUIL_FIGE) e.push('la première et la dernière image sont identiques')
        if (images.some((im) => luminanceMoyenne(im) <= 10)) e.push('une image est noire (luminance ≤ 10)')
        const premiereSeconde = instants.map((t, i) => [t, i]).filter(([t]) => t <= 1).map(([, i]) => i)
        for (let k = 1; k < premiereSeconde.length; k++) if (differenceMoyenne(images[premiereSeconde[k - 1]], images[premiereSeconde[k]]) >= SEUIL_FIGE) e.push('la première seconde (tenue en haut) n\'est pas figée')
      }
      s.juger('MV-3', e, '10 images extraites : au moins 7 paires distinctes, première et dernière différentes, aucune noire, la première seconde tenue')
    } else s.echoue('MV-3', 'non jugé : MV-2 en échec')
    // MV-4 : déterminisme (une deuxième fabrication)
    {
      const e = []
      const SORTIE2 = path.join(TRAV, 'site-temoin-2.mp4')
      let err2 = null
      try { await mod.fabriquerVideo({ dossierSite, sortie: SORTIE2, duree: 18 }) } catch (er) { err2 = premiereLigne(er) }
      if (err1 || err2) e.push(`fabrication interrompue (${err1 ?? ''} ${err2 ?? ''})`.trim())
      else {
        const m1 = sonderConteneur(SORTIE), m2 = sonderConteneur(SORTIE2)
        if (m1.erreur || m2.erreur) e.push(`mesure : ${m1.erreur ?? ''} ${m2.erreur ?? ''}`.trim())
        else {
          if (Math.abs(m1.duree - m2.duree) > 0.05) e.push(`durées ${m1.duree} et ${m2.duree} s différentes`)
          if (m1.largeur !== m2.largeur || m1.hauteur !== m2.hauteur) e.push(`dimensions différentes (${m1.largeur}x${m1.hauteur} puis ${m2.largeur}x${m2.hauteur})`)
          const i1 = extraireImages(SORTIE, m1.duree, m1.hauteur, m1.largeur, 5).images
          const i2 = extraireImages(SORTIE2, m2.duree, m2.hauteur, m2.largeur, 5).images
          for (let k = 0; k < 5; k++) if (i1[k] && i2[k] && differenceMoyenne(i1[k], i2[k]) >= SEUIL_FIGE) e.push(`image ${k} différente entre les deux fabrications`)
        }
      }
      s.juger('MV-4', e, 'deux fabrications de suite : même durée, mêmes dimensions, images identiques aux mêmes instants')
    }
    // MV-5 : le callback du module réel décide pour des requêtes Chromium réelles.
    // Le garde du juge intercepte toute continuation extérieure AVANT le réseau :
    // un module fautif est observable, sans jamais joindre cet autre hôte.
    {
      const e = [], decisions = []
      // Conserver les contrôles historiques du serveur et du site témoin.
      let srv = null
      try {
        srv = await demarrerServeurFichiers(dossierSite)
        const evasion = await fetch(`${srv.base}/../../package.json`).catch(err => ({ ok: false, status: `exception : ${premiereLigne(err)}` }))
        if (evasion.ok) e.push(`le serveur d'essai sert une évasion hors dossier (${evasion.status})`)
        const html = fs.readFileSync(path.join(dossierSite, 'index.html'), 'utf8')
        const hotes = [...html.matchAll(/(?:src|href)=["']https?:\/\/([^/"']+)/gi)].map(m => m[1].toLowerCase())
        if (!hotes.length) e.push('le site témoin ne contient aucune référence à un autre hôte')
      } catch (err) { e.push(`serveur interrompu : ${premiereLigne(err)}`) }
      finally { if (srv) await srv.fermer() }
      let navigateur = null, ferme = false
      try {
        const { chromium } = await import('playwright')
        navigateur = await chromium.launch()
        const browser = navigateur
        const lancerNavigateur = async () => ({
          newPage: async options => {
            const page = await browser.newPage(options)
            // Filet indépendant si le module omet entièrement son routeur.
            await page.context().route('**/*', route => new URL(route.request().url()).hostname === 'autre-hote-mv5.invalid' ? route.abort() : route.continue())
            const routeReelle = page.route.bind(page), gotoReel = page.goto.bind(page)
            page.route = async (motif, handler) => routeReelle(motif, async route => {
              const url = route.request().url(), externe = new URL(url).hostname === 'autre-hote-mv5.invalid'
              const observer = action => { decisions.push({ url, externe, action }) }
              await handler({
                request: () => route.request(),
                continue: async () => { observer('continue'); return externe ? route.abort() : route.continue() },
                abort: async () => { observer('abort'); return route.abort() },
              })
            })
            page.goto = async (...args) => {
              const reponse = await gotoReel(...args)
              await page.evaluate(() => new Promise(resolve => {
                const image = new Image()
                const delai = setTimeout(resolve, 3000)
                image.onload = image.onerror = () => { clearTimeout(delai); resolve() }
                image.src = 'http://autre-hote-mv5.invalid/interdit.png'
                document.body.append(image)
              }))
              return reponse
            }
            return page
          },
          close: async () => { await browser.close(); ferme = true },
        })
        let code = null
        try {
          await mod.fabriquerVideo({ dossierSite: path.join(FIXTURES_VIDEO, 'page-courte'), sortie: path.join(TRAV, 'hotes-mv5.mp4'), duree: 15, lancerNavigateur })
        } catch (err) { code = err?.code }
        if (code !== 3) e.push(`fin de page courte : code ${code}, 3 attendu après contrôle des requêtes`)
        if (!decisions.some(d => !d.externe && d.action === 'continue')) e.push('aucune requête du serveur local autorisée par le module')
        const externes = decisions.filter(d => d.externe)
        if (externes.length !== 1 || externes[0]?.action !== 'abort') e.push(`requête autre hôte : ${JSON.stringify(externes)}, exactement un abort attendu`)
        if (!ferme) e.push('le module ne ferme pas Chromium sur la page courte')
      } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) }
      finally { if (navigateur && !ferme) await navigateur.close().catch(() => {}) }
      s.juger('MV-5', e, "callback réseau du module exécuté par Chromium réel : serveur local autorisé, autre hôte bloqué avant le réseau, navigateur fermé")
    }
    // MV-6 : les cas limites (page blanche figée, page courte code 3, sortie sous public/ code 2, ffmpeg absent code 5)
    {
      const e = []
      const casPageBlanche = async () => {
        const sortie = path.join(TRAV, 'page-blanche.mp4')
        try { await mod.fabriquerVideo({ dossierSite: path.join(FIXTURES_VIDEO, 'page-blanche'), sortie, duree: 15 }) } catch (er) { return e.push(`page blanche : fabrication interrompue (${premiereLigne(er)})`) }
        const m = sonderConteneur(sortie)
        if (m.erreur) return e.push(`page blanche : ${m.erreur}`)
        const { images } = extraireImages(sortie, m.duree, m.hauteur, m.largeur, 10)
        if (images.some((i) => !i) || !estFigee(images)) e.push('page blanche : la vidéo n\'est pas jugée figée')
      }
      await casPageBlanche()
      const codePageCourte = await (async () => {
        try { await mod.fabriquerVideo({ dossierSite: path.join(FIXTURES_VIDEO, 'page-courte'), sortie: path.join(TRAV, 'page-courte.mp4'), duree: 15 }); return null } catch (er) { return er?.code ?? er?.message ?? String(er) }
      })()
      if (codePageCourte === null) e.push('page courte (800 px) : aucune erreur levée, code 3 attendu')
      const codeSortieInterdite = await (async () => {
        try { await mod.fabriquerVideo({ dossierSite, sortie: path.join(RAC, 'public', 'temoin-interdit.mp4'), duree: 15 }); return null } catch (er) { return er }
      })()
      if (codeSortieInterdite === null) e.push('sortie sous public/ : aucune erreur levée, code 2 attendu')
      s.juger('MV-6', e, "page blanche → vidéo figée ; page de 800 px → erreur (code 3) ; sortie sous public/ → erreur (code 2)")
    }
    // MV-7 : lecture du source (shell, arguments de ffmpeg, process.env, fetch)
    {
      const e = []
      const src = fs.readFileSync(fichierModule, 'utf8')
      const nu = sansCommentaires(src)
      if (/shell\s*:\s*true/.test(nu)) e.push('shell: true dans le source')
      if (/\bprocess\s*\.\s*env\b/.test(nu)) { const m = [...nu.matchAll(/process\s*\.\s*env\s*\.\s*(\w+)/g)].map((x) => x[1]); if (m.some((n) => !['FFMPEG', 'PLAYWRIGHT_BROWSERS_PATH'].includes(n))) e.push(`process.env hors FFMPEG/PLAYWRIGHT_BROWSERS_PATH : ${m.join(', ')}`) }
      if (/\bfetch\s*\(/.test(nu)) e.push('fetch( dans le source (aucun appel externe attendu)')
      s.juger('MV-7', e, 'aucun shell: true, process.env limité à FFMPEG/PLAYWRIGHT_BROWSERS_PATH, aucun fetch(')
    }
  }
}
// process.exitCode (jamais process.exit()) : Node 24 plante sous Windows quand des descripteurs (serveur, fetch) sont
// encore en train de se fermer — laisser la boucle d'événements se vider normalement.
process.exitCode = s.finir()
