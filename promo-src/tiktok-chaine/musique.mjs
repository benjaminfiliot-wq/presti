// Musique de la chaîne TikTok : manifeste des pistes, contrôle de licence, choix d'une piste et grille des temps forts.
//
// Règle permanente : jamais un son protégé incrusté (contrefaçon → TikTok coupe le son ou retire la vidéo).
// Seule source admise : TikTok Studio > « Sons libres de droits » (bibliothèque commerciale : is_commerce_music vrai,
// commercial_right_type 2). Une piste n'est UTILISABLE que si sa preuve de licence est au manifeste ET si le fichier
// sur le disque a l'empreinte notée. Sans piste utilisable : vidéos « voix seule », jamais une musique au hasard.
//
//   node promo-src/tiktok-chaine/musique.mjs                          → état du manifeste (pistes utilisables ou non)
//   node promo-src/tiktok-chaine/musique.mjs ajouter <reponse.json> <music_id> <fichier.mp3> [--ambiance=a,b]
//        → ajoute une piste à partir de la réponse de l'API de recherche (sauvée dans la page connectée) et du
//          fichier téléchargé ; recopie le fichier dans musique/fichiers/ (jamais versionné).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { ICI, outils, sonder, lancer } from './outils.mjs'

export const DOSSIER = path.join(ICI, 'musique')
export const MANIFESTE = path.join(DOSSIER, 'manifeste.json')
export const FICHIERS = process.env.TIKTOK_MUSIQUE || path.join(DOSSIER, 'fichiers')

export function lireManifeste(f = MANIFESTE) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return { pistes: [] } }
}

const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')

/** Les raisons pour lesquelles une piste n'est PAS utilisable (liste vide = utilisable). */
export function defautsLicence(p, dossier = FICHIERS) {
  const D = []
  const L = p?.licence || {}
  if (!p?.id) D.push('id manquant')
  if (L.source !== 'tiktok_studio_sons_libres_de_droits') D.push('source : seule « tiktok_studio_sons_libres_de_droits » est admise')
  if (L.is_commerce_music !== true) D.push('is_commerce_music ≠ true')
  if (Number(L.commercial_right_type) !== 2) D.push('commercial_right_type ≠ 2')
  if (!L.releve_le || Number.isNaN(Date.parse(L.releve_le))) D.push('date du relevé de licence manquante')
  if (!L.music_id) D.push('music_id manquant')
  if (!L.preuve || !fs.existsSync(path.join(DOSSIER, L.preuve))) D.push("preuve de licence (réponse de l'API) absente de musique/preuves/")
  if (!p?.sha256) D.push('empreinte sha256 manquante')
  const f = p?.fichier ? path.join(dossier, p.fichier) : null
  if (!f || !fs.existsSync(f)) D.push(`fichier absent (${p?.fichier || '?'})`)
  else if (p.sha256 && sha256(f) !== p.sha256) D.push('le fichier ne correspond pas à l\'empreinte du manifeste')
  if (!Array.isArray(p?.temps_forts) || p.temps_forts.length < 16) D.push('temps forts manquants (au moins 16)')
  return D
}

export function pistesUtilisables(M = lireManifeste(), dossier = FICHIERS) {
  return (M.pistes || []).filter((p) => defautsLicence(p, dossier).length === 0)
}

/**
 * Piste d'une ligne : celle qu'elle nomme (L.musique = id), sinon une piste utilisable choisie de façon stable par
 * l'id de la ligne. Une piste nommée mais non utilisable est une ERREUR (jamais de repli silencieux vers une autre).
 */
export function choisirPiste(L, M = lireManifeste(), dossier = FICHIERS) {
  if (L.musique === false || L.musique === 'aucune') return null
  if (L.musique) {
    const p = (M.pistes || []).find((x) => x.id === L.musique)
    if (!p) throw new Error(`musique « ${L.musique} » absente du manifeste`)
    const d = defautsLicence(p, dossier)
    if (d.length) throw new Error(`musique « ${L.musique} » non utilisable : ${d.join(' ; ')}`)
    return { ...p, chemin: path.join(dossier, p.fichier) }
  }
  const U = pistesUtilisables(M, dossier)
  if (!U.length) return null
  let h = 0
  for (const c of L.id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const p = U[h % U.length]
  return { ...p, chemin: path.join(dossier, p.fichier) }
}

/**
 * Grille des coupes : t(k) = instant du k-ième temps fort, 0 = premier temps fort de la piste (la piste est coupée là).
 * Sans piste : grille régulière au tempo de la ligne (128 BPM par défaut), celle d'un son TikTok à choisir au dépôt.
 */
export function grille(piste, bpmLigne = 128) {
  if (piste) {
    const b = piste.temps_forts.map(Number).filter((x) => x >= Number(piste.premier_temps || 0)).sort((x, y) => x - y)
    const z = b[0]
    const rel = b.map((x) => x - z)
    const pas = (rel.at(-1) - rel[0]) / (rel.length - 1)
    return { bpm: Math.round(600 / pas) / 10, pas, t: (k) => Math.round((k < rel.length ? rel[k] : rel.at(-1) + (k - rel.length + 1) * pas) * 1000) / 1000, source: `piste ${piste.id}` }
  }
  const pas = 60 / bpmLigne
  return { bpm: bpmLigne, pas, t: (k) => Math.round(k * pas * 1000) / 1000, source: `tempo ${bpmLigne} BPM (aucune piste licenciée)` }
}

// ───────────────────────────── Ajout d'une piste depuis TikTok Studio ─────────────────────────────

/** Les temps forts d'un son TikTok : extra.beats.beats_tracker (secondes ou millisecondes, nombres ou objets). */
export function tempsForts(son) {
  let b = son?.extra?.beats?.beats_tracker ?? son?.beats?.beats_tracker ?? son?.extra?.beats
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = b.split(/[,\s]+/) } }
  if (b && !Array.isArray(b) && typeof b === 'object') b = b.beats || b.beat_list || Object.values(b).find(Array.isArray)
  if (!Array.isArray(b)) return []
  let t = b.map((x) => (typeof x === 'object' && x ? x.time ?? x.t ?? x.start ?? x.timestamp : x)).map(Number).filter(Number.isFinite)
  if (t.length && Math.max(...t) > 1000) t = t.map((x) => x / 1000) // millisecondes
  return t.sort((a, c) => a - c)
}

function trouverSon(reponse, musicId) {
  const pile = [reponse]
  while (pile.length) {
    const o = pile.pop()
    if (!o || typeof o !== 'object') continue
    if (String(o.music_id ?? o.id_str ?? o.id ?? '') === String(musicId) && (o.play_url || o.title)) return o
    for (const v of Object.values(o)) if (v && typeof v === 'object') pile.push(v)
  }
  return null
}

function ajouter(fichierReponse, musicId, fichierAudio, opt) {
  const son = trouverSon(JSON.parse(fs.readFileSync(fichierReponse, 'utf8')), musicId)
  if (!son) throw new Error(`son ${musicId} absent de ${fichierReponse}`)
  const licence = {
    source: 'tiktok_studio_sons_libres_de_droits',
    music_id: String(musicId),
    is_commerce_music: son.is_commerce_music === true,
    commercial_right_type: Number(son.commercial_right_type),
    is_unlimited_music: son.is_unlimited_music === true,
    releve_le: new Date().toISOString(),
    preuve: `preuves/${musicId}.json`,
  }
  // La preuve versionnée : l'objet du son tel que l'API de TikTok Studio l'a rendu (licence, auteur, temps forts).
  fs.mkdirSync(path.join(DOSSIER, 'preuves'), { recursive: true })
  fs.writeFileSync(path.join(DOSSIER, licence.preuve), JSON.stringify({ releve_le: licence.releve_le, api: 'POST /tiktok/v1/creator/music/unlimited/search/list/?aid=1988', son }, null, 2) + '\n')
  const O = outils()
  const duree = Number(sonder(O, fichierAudio).format?.duration || 0)
  let tf = tempsForts(son)
  let origineTemps = 'extra.beats.beats_tracker (TikTok)'
  if (tf.length < 16) {
    // Repli : détection locale des temps par HyperFrames (même version que le rendu).
    const r = lancer(process.execPath, [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'), '--yes', 'hyperframes@0.8.33', 'beats', fichierAudio, '--json'], { minutes: 5 })
    try { const j = JSON.parse(String(r.sortie).trim().split('\n').pop()); tf = (j.beats || j.downbeats || []).map((x) => Number(x.time ?? x)).filter(Number.isFinite); origineTemps = 'hyperframes beats (détection locale)' } catch {}
  }
  const ext = path.extname(fichierAudio) || '.mp3'
  const nom = `${musicId}${ext}`
  fs.mkdirSync(FICHIERS, { recursive: true })
  fs.copyFileSync(fichierAudio, path.join(FICHIERS, nom))
  const M = lireManifeste()
  M.pistes = (M.pistes || []).filter((p) => p.id !== `tt-${musicId}`)
  const pas = tf.length > 1 ? (tf.at(-1) - tf[0]) / (tf.length - 1) : null
  M.pistes.push({
    id: `tt-${musicId}`, titre: son.title || son.music_name || '', artiste: son.author || son.author_name || '',
    fichier: nom, sha256: sha256(path.join(FICHIERS, nom)), duree: Math.round(duree * 100) / 100,
    bpm: pas ? Math.round(600 / pas) / 10 : null, premier_temps: tf[0] ?? 0, temps_forts: tf.map((x) => Math.round(x * 1000) / 1000),
    origine_temps: origineTemps, ambiance: opt.ambiance ? String(opt.ambiance).split(',') : [], licence,
  })
  fs.writeFileSync(MANIFESTE, JSON.stringify(M, null, 2) + '\n')
  const p = M.pistes.at(-1)
  console.log(`ajoutée : ${p.id} « ${p.titre} » ${p.bpm} BPM, ${tf.length} temps forts ; défauts de licence : ${defautsLicence(p).join(' ; ') || 'aucun'}`)
}

function etat() {
  const M = lireManifeste()
  const P = M.pistes || []
  if (!P.length) { console.log('manifeste vide : aucune piste licenciée → vidéos « voix seule » (la musique se choisit au dépôt dans TikTok)'); return }
  for (const p of P) { const d = defautsLicence(p); console.log(`${d.length ? 'NON UTILISABLE' : 'utilisable    '} ${p.id} « ${p.titre} » ${p.bpm ?? '?'} BPM${d.length ? ' — ' + d.join(' ; ') : ''}`) }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const [cmd, ...reste] = process.argv.slice(2)
  const opt = Object.fromEntries(reste.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.join('=') || true] }))
  const pos = reste.filter((a) => !a.startsWith('--'))
  try {
    if (cmd === 'ajouter') { if (pos.length < 3) throw new Error('usage : musique.mjs ajouter <reponse.json> <music_id> <fichier>'); ajouter(pos[0], pos[1], pos[2], opt) }
    else etat()
  } catch (e) { console.error(e.message); process.exitCode = 1 }
}
