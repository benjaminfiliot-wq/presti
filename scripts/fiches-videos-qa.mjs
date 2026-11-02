#!/usr/bin/env node
// scripts/fiches-videos-qa.mjs — le juge des fiches de lecture de vidéos (prompt 5, tâche 035-008, 02/11/2026).
//
// Il lit des fiches au format de `plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md` (« Sources à étudier
// obligatoirement », p5:71-82) et rougit, fiche par fiche, avec un code par contrôle :
//   FORMAT        les huit champs de p5:74-81, présents, une seule fois, dans l'ordre, non vides ; la ligne Source porte la date
//                 de publication, « lue le » et « intégralement : oui/non » (p5:74) ; « Ce qu'elle montre » tient en 3 à 8
//                 lignes (p5:75) ; une fiche JSON n'a aucune clé hors du schéma ; une vidéo de liste.json a sa fiche.
//   HORODATAGE    chaque horodatage cité ([mm:ss], [h:mm:ss], [h:mm] pour une vidéo d'une heure et plus, [x,y-z,t s],
//                 « image NNN ») tombe dans la durée de la vidéo, et il est bien formé (secondes et minutes < 60).
//   DUREE         la fiche cite des horodatages mais aucune durée n'est connue (transcription, info.json, liste.json, ou
//                 durée déclarée dans Source ou le titre) : ses horodatages ne sont pas vérifiables.
//   TRANSCRIPTION une vidéo n'a pas de transcription (p5:86 : « une vidéo sans transcription se transcrit en local »), ou en a
//                 une vide sans le motif « sans parole » (plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md:1021).
//   CHIFFRE       un chiffre de « Chiffres annoncés » n'est pas marqué « annoncé par l'auteur, non vérifié » (p5:81) — ou
//                 « lu sur une maquette, non vérifié », convention de fiches-videos-restructureai.md:15-16. Une ligne marquée
//                 couvre ses sous-lignes ; un champ en paragraphe est couvert par sa marque.
//   RECOPIE       une suite de plus de 15 mots (16 et plus, accents, casse et ponctuation ignorés) est recopiée de la
//                 transcription (fiches-videos.md:1025 ; fiches-videos.md:12 : « reformulées, jamais recopiées »). La ligne
//                 Source est exclue : elle porte le titre, que p5:74 exige.
// Une source qui n'est pas une vidéo (dépôt, page de documentation) ne passe que FORMAT et CHIFFRE.
//
// Entrées :
//   - un fichier Markdown : chaque fiche commence à une ligne « Source : » (en gras ou non) et finit au titre, au « --- »
//     ou à la Source suivante une fois « Chiffres annoncés » vu ;
//   - un dossier avec liste.json (le format de la tâche 035-009, fiches-videos.md:1006-1018) : un tableau, ou { videos: [...] },
//     d'entrées { identifiant|id, duree (s), date, legende } ; par vidéo, <id>.transcription.txt|json et <id>.fiche.json, un
//     objet dont les clés sont les huit étiquettes de p5 (ou source, ce_qu_elle_montre, principes_et_patterns,
//     erreurs_a_eviter, ce_qui_s_applique, ce_qui_ne_s_applique_pas, licence, chiffres_annonces), une chaîne ou un tableau
//     de chaînes chacune ; « Source » est une chaîne au format de p5:74, qui porte l'identifiant de la vidéo ; métadonnées
//     admises : id, identifiant, duree ;
//   - un dossier sans liste.json : tous ses .md, récursivement.
//   Les transcriptions d'une fiche Markdown se cherchent par l'identifiant de la vidéo (TikTok, YouTube, reel Instagram) dans
//   le nom du fichier ou de son dossier, sous --transcriptions=<d1,d2> puis /home/usine/agents/videos, videos/,
//   docs/connaissance-videos/ et D:/presti-travail/videos s'ils existent.
//
// Usage :
//   node scripts/fiches-videos-qa.mjs                     → juge les deux fichiers de fiches de p5-entreprise/
//   node scripts/fiches-videos-qa.mjs <fichier|dossier>…  → juge ces cibles
//   node scripts/fiches-videos-qa.mjs --temoins           → le banc : témoins propres verts, chaque témoin muté rouge pour SON code
//   node scripts/fiches-videos-qa.mjs --mutants           → le banc, puis chaque contrôle retiré d'une COPIE du juge : le banc
//                                                           de la copie doit rougir, sur le cas attendu (pas sur un plantage)
//   options : --transcriptions=<d1,d2>  --temoins-de=<temoins.json>  --rapport=<fichier.json>  --garder
// Code : 0 vert ; 1 rouge (une fiche en défaut, aucune fiche trouvée, un cas du banc ou un mutant qui ne rougit pas).
// Témoins : scripts/fixtures/fiches-videos-qa/temoins.json, entièrement fictifs (« Exemple. »). Aucune donnée réelle, aucun réseau.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT = fileURLToPath(import.meta.url)
const RACINE = path.resolve(path.dirname(SCRIPT), '..')
const args = process.argv.slice(2)
const option = (nom) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); if (a) return a.slice(nom.length + 3); return args.includes(`--${nom}`) ? 'oui' : null }
const positionnels = args.filter((a) => !a.startsWith('--'))

const SEUIL_RECOPIE = 16 // M:seuil-recopie
const TOLERANCE_S = 1
const LIGNES_MIN = 3
const LIGNES_MAX = 8
const P5 = 'plans/011-cadrage-01-11/p5-entreprise'
const CIBLES_DEFAUT = [`${P5}/fiches-videos.md`, `${P5}/fiches-videos-restructureai.md`]
const DOSSIERS_TRANSCRIPTIONS = ['/home/usine/agents/videos', path.join(RACINE, 'videos'), path.join(RACINE, 'docs', 'connaissance-videos'), 'D:/presti-travail/videos']

// Les huit champs de p5:74-81, dans l'ordre.
const CHAMPS = [
  { cle: 'source', label: 'Source', alias: ['source'] },
  { cle: 'montre', label: "Ce qu'elle montre", alias: ['ce_qu_elle_montre'] },
  { cle: 'principes', label: 'Principes et patterns réutilisables', alias: ['principes_et_patterns'] },
  { cle: 'erreurs', label: 'Erreurs à éviter', alias: ['erreurs_a_eviter'] },
  { cle: 'applique', label: "Ce qui s'applique à Presti / à ce client", alias: ['ce_qui_s_applique'] },
  { cle: 'nonapplique', label: "Ce qui ne s'applique pas, et pourquoi", alias: ['ce_qui_ne_s_applique_pas'] },
  { cle: 'licence', label: 'Licence (dépôt)', alias: ['licence'] },
  { cle: 'chiffres', label: 'Chiffres annoncés', alias: ['chiffres_annonces'] },
]
const META_JSON = ['id', 'identifiant', 'duree']

const sansAccent = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const norm = (s) => sansAccent(s).replace(/[’‘]/g, "'").toLowerCase()
const cleNorm = (s) => norm(s).replace(/[^a-z0-9]/g, '')
const mots = (s) => norm(s).replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean)
const MARQUE = /(annonce(e)?s?\s+par\s+l'auteur|lue?s?\s+sur\s+(une|des)\s+maquettes?)[^\n]{0,80}?non\s+verifie(e)?s?/ // M:marque-maquettes
const marque = (t) => MARQUE.test(norm(t))

function motifEtiquette(label) {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const souple = esc.replace(/[eéèê]/g, '[eéèê]').replace(/à/g, '[aà]').replace(/'/g, "['’]")
  return new RegExp(`^\\s{0,3}${souple}(\\s*\\([^)]*\\))?\\s*:\\s*(.*)$`, 'i')
}
const ETIQUETTES = CHAMPS.map((c) => ({ ...c, re: motifEtiquette(c.label) }))
function etiquette(ligne) {
  const l = ligne.replace(/\*\*/g, '')
  for (const e of ETIQUETTES) { const m = l.match(e.re); if (m) return { cle: e.cle, label: e.label, reste: (m[2] || '').trim() } }
  return null
}

// ── lecture des fiches ─────────────────────────────────────────────────────────────────────────────────────────
function lireFichesMarkdown(texte, fichier) {
  const lignes = texte.split(/\r?\n/)
  const fiches = []
  let titre = ''
  let fiche = null
  let champ = null
  let cloture = false
  const fermer = () => { if (fiche) fiches.push(fiche); fiche = null; champ = null }
  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i]
    if (/^\s*```/.test(l)) { cloture = !cloture; continue }
    if (cloture) continue
    if (/^#{1,6}\s/.test(l)) { fermer(); titre = l.replace(/^#+\s*/, '').trim(); continue }
    if (/^\s*---\s*$/.test(l)) { fermer(); continue }
    const e = etiquette(l)
    if (e && e.cle === 'source' && fiche && !fiche.champs.some((c) => c.cle === 'chiffres')) {
      if (champ) champ.lignes.push({ texte: l, n: i + 1 }) // une « Source : » citée au milieu d'une fiche est du contenu
      continue
    }
    if (e) {
      if (e.cle === 'source') { fermer(); fiche = { fichier, titre, ligne: i + 1, champs: [], horsFormat: [], clesInconnues: [], type: 'md' } }
      if (!fiche) continue
      champ = { cle: e.cle, label: e.label, entete: e.reste, lignes: [], ligne: i + 1 }
      fiche.champs.push(champ)
      continue
    }
    if (!fiche) continue
    if (/^\*\*/.test(l)) { champ = null; fiche.horsFormat.push(i + 1); continue } // un bloc en gras hors des huit champs
    if (champ) champ.lignes.push({ texte: l, n: i + 1 })
  }
  fermer()
  return fiches
}

function ficheDepuisJson(obj, fichier, titre) {
  const fiche = { fichier, titre, ligne: 1, champs: [], horsFormat: [], clesInconnues: [], type: 'json' }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { fiche.illisible = 'la fiche n\'est pas un objet JSON'; return fiche }
  for (const [k, v] of Object.entries(obj)) {
    const kn = cleNorm(k)
    if (META_JSON.includes(kn)) continue
    const c = CHAMPS.find((x) => cleNorm(x.label) === kn || x.alias.some((a) => cleNorm(a) === kn))
    if (!c) { fiche.clesInconnues.push(k); continue }
    const enTexte = (x) => (typeof x === 'string' ? x : JSON.stringify(x))
    const champ = Array.isArray(v)
      ? { entete: '', lignes: v.map((x) => ({ texte: `- ${enTexte(x)}`, n: 0 })) }
      : { entete: String(v ?? '').split('\n')[0].trim(), lignes: String(v ?? '').split('\n').slice(1).map((x) => ({ texte: x, n: 0 })) }
    fiche.champs.push({ cle: c.cle, label: c.label, ligne: 0, ...champ })
  }
  return fiche
}

const contenu = (champ) => (champ ? [champ.entete, ...champ.lignes.map((x) => x.texte)].join('\n') : '')
function decouper(champ) {
  const items = []
  const horsListe = champ.entete ? [champ.entete] : []
  for (const { texte } of champ.lignes) {
    if (!texte.trim()) continue
    const m = texte.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/)
    if (m) items.push({ indent: m[1].length, texte: m[2] })
    else if (items.length) items[items.length - 1].texte += ` ${texte.trim()}`
    else horsListe.push(texte.trim())
  }
  return { items, horsListe }
}
function compterLignes(champ) {
  const { items, horsListe } = decouper(champ)
  if (!items.length) { // un paragraphe : ses phrases, pas ses lignes physiques (le repli à 140 signes est arbitraire)
    const t = horsListe.join(' ').trim()
    return t ? (t.match(/[.!?](?=\s+[«A-ZÀÂÉÈÊÎÔÛÇ]|\s*$)/g) || []).length || 1 : 0 // M:lignes-phrases
  }
  const min = Math.min(...items.map((x) => x.indent))
  return items.filter((x) => x.indent === min).length + (champ.entete ? 1 : 0)
}

// ── transcriptions et durées ───────────────────────────────────────────────────────────────────────────────────
let indexFichiers = null
function indexer(dossiers) {
  const liste = []
  const parcourir = (d, profondeur) => {
    if (profondeur > 5) return
    let entrees = []
    try { entrees = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entrees) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) { if (!/(^|-)images$|^node_modules$|^\.git$/.test(e.name)) parcourir(p, profondeur + 1) } else liste.push(p)
    }
  }
  for (const d of dossiers) if (d && fs.existsSync(d)) parcourir(d, 0)
  return liste
}
function lireTranscription(fichier) {
  const brut = fs.readFileSync(fichier, 'utf8')
  let texte = brut
  let duree = null
  if (fichier.endsWith('.json')) {
    try {
      const j = JSON.parse(brut)
      texte = Array.isArray(j.segments) ? j.segments.map((s) => s.texte ?? s.text ?? '').join(' ') : String(j.texte ?? j.text ?? '')
      if (j.motif) texte += ` ${j.motif}`
      duree = Number(j.duree ?? j.duration) || null
    } catch { texte = '' }
  }
  if (/\.(vtt|srt)$/i.test(fichier)) { // des sous-titres : on retire les lignes de minutage et les balises, la durée est le dernier minutage
    const fins = [...brut.matchAll(/-->\s*(?:(\d+):)?(\d{2}):(\d{2})[.,]\d+/g)].map((m) => Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]))
    duree = fins.length ? Math.max(...fins) : null
    texte = brut.split(/\r?\n/).filter((l) => !/-->|^WEBVTT|^\d+$|^(Kind|Language):/.test(l.trim())).join(' ').replace(/<[^>]+>/g, ' ') // M:transcription-vtt
  }
  const motif = /sans parole/.test(norm(texte))
  const m = mots(norm(texte).replace(/sans parole/g, ' '))
  const info = fichier.replace(/\.transcription\.(json|txt|md)$/, '.info.json')
  if (!duree && info !== fichier && fs.existsSync(info)) { try { duree = Number(JSON.parse(fs.readFileSync(info, 'utf8')).duration) || null } catch { /* sans durée */ } }
  return { fichier, mots: m, vide: m.length === 0, motif, duree }
}
function trouverTranscription(id, compte) {
  const estTranscription = (p) => (/transcri/i.test(path.basename(p)) && !/manquante/i.test(path.basename(p)) && /\.(json|txt|md)$/i.test(p)) || /\.(vtt|srt)$/i.test(p)
  const autreId = (p) => (path.basename(p).match(/\d{18,20}/g) || []).some((x) => x !== id)
  let candidats = indexFichiers.filter((p) => (path.basename(p).includes(id) || path.basename(path.dirname(p)).includes(id)) && estTranscription(p))
  // repli : un dossier au nom du compte (« veille/trevsagents/transcription.txt »), si le fichier ne porte l'identifiant d'aucune autre vidéo
  if (!candidats.length && compte) candidats = indexFichiers.filter((p) => path.basename(path.dirname(p)).toLowerCase() === compte.toLowerCase() && estTranscription(p) && !autreId(p)) // M:transcription-compte
  candidats.sort((a, b) => Number(b.endsWith('.json')) - Number(a.endsWith('.json')))
  return candidats.length ? lireTranscription(candidats[0]) : null
}
// le compte (@nom) écrit sur la même ligne que l'identifiant, dans Source
function compteDe(id, texte) {
  const l = texte.split('\n').find((x) => x.includes(id))
  return l?.match(/@([\w.-]+)/)?.[1]?.replace(/\.$/, '') ?? null
}
function extraireIds(texte) {
  const ids = new Set()
  for (const m of texte.matchAll(/(?<!\d)(\d{18,20})(?!\d)/g)) ids.add(m[1])
  for (const m of texte.matchAll(/(?:youtu\.be\/|[?&]v=|youtube\.com\/shorts\/)([\w-]{11})/g)) ids.add(m[1])
  for (const m of texte.matchAll(/instagram\.com\/(?:reel|p)\/([\w-]+)/g)) ids.add(m[1])
  for (const m of texte.matchAll(/\breel[- ]([A-Za-z0-9_-]{8,})/g)) ids.add(m[1])
  return [...ids]
}
function dureeDeclaree(texte) {
  const t = norm(texte).replace(/\[[^\]]*\]/g, ' ')
  let m = t.match(/(\d+)\s*h\s*(\d{1,2})\b/); if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60
  m = t.match(/(\d+)\s*heures?\b/); if (m) return Number(m[1]) * 3600
  m = t.match(/(\d+(?:[.,]\d+)?)\s?s\b/); if (m) return Number(m[1].replace(',', '.'))
  return null
}

function horodatages(texte, duree) {
  const res = []
  for (const m of texte.matchAll(/\[([^\]\n]{1,60})\]/g)) {
    const c = m[1].trim()
    if (/^[\d\s,.\-–]+s$/.test(c)) {
      for (const n of c.replace(/s$/, '').matchAll(/\d+(?:[.,]\d+)?/g)) res.push({ brut: m[0], s: Number(n[0].replace(',', '.')) }) // M:horodatage-secondes
      continue
    }
    if (!/^[\d:\s,\-–]+$/.test(c) || !c.includes(':')) continue
    for (const n of c.matchAll(/(\d{1,2}):(\d{2})(?::(\d{2}))?/g)) {
      const [a, b, x] = [Number(n[1]), Number(n[2]), n[3] === undefined ? null : Number(n[3])]
      if (x !== null) res.push({ brut: m[0], s: a * 3600 + b * 60 + x, malforme: b > 59 || x > 59 })
      else if (duree >= 3600) res.push({ brut: m[0], s: a * 3600 + b * 60, malforme: b > 59 })
      else res.push({ brut: m[0], s: a * 60 + b, malforme: b > 59 })
    }
  }
  for (const m of texte.matchAll(/\bimages?\s+((?:\d{3}(?:\s*(?:,|et|à|-|–)\s*)?)+)/gi)) for (const n of m[1].matchAll(/\d{3}/g)) res.push({ brut: `image ${n[0]}`, s: Number(n[0]) }) // M:horodatage-image
  return res
}

function aDesChiffres(s) {
  const t = String(s)
    .replace(/\[[^\]]*\]/g, ' ').replace(/`[^`]*`/g, ' ')
    .replace(/[\w./-]+:\d+(?:[-–]\d+)?/g, ' ').replace(/:\d+(?:[-–]\d+)?/g, ' ')
    .replace(/\bimages?\s+\d+(?:\s*(?:et|,|à)\s*\d+)*/gi, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ' ').replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
  return /\d/.test(t)
}
function recopie(texte, grammes) {
  const m = mots(texte)
  for (let i = 0; i + SEUIL_RECOPIE <= m.length; i++) {
    if (!grammes.has(m.slice(i, i + SEUIL_RECOPIE).join(' '))) continue
    let j = i + SEUIL_RECOPIE
    while (j < m.length && grammes.has(m.slice(j - SEUIL_RECOPIE + 1, j + 1).join(' '))) j++
    return { n: j - i, extrait: m.slice(i, j).join(' ') }
  }
  return null
}

// ── les contrôles d'une fiche ──────────────────────────────────────────────────────────────────────────────────
// ctx : { video, ids, transcriptions: [{ id, t }], duree, origineDuree, idAttendu }
function controler(fiche, ctx) {
  const defauts = []
  const signaler = (code, message) => defauts.push({ code, message })
  if (fiche.illisible) { signaler('FORMAT', fiche.illisible); return defauts }
  const par = (cle) => fiche.champs.filter((c) => c.cle === cle)
  const champ = (cle) => par(cle)[0]

  // FORMAT (p5:71-82)
  for (const c of CHAMPS) {
    if (par(c.cle).length === 0) signaler('FORMAT', `champ absent : « ${c.label} »`) // M:format-manquant
    if (par(c.cle).length > 1) signaler('FORMAT', `champ en double : « ${c.label} »`) // M:format-doublon
  }
  const rangs = fiche.champs.map((x) => CHAMPS.findIndex((c) => c.cle === x.cle))
  if (rangs.some((r, k) => k > 0 && r < rangs[k - 1])) signaler('FORMAT', `champs hors de l'ordre de p5:74-81 : ${fiche.champs.map((x) => x.label).join(' → ')}`) // M:format-ordre
  for (const x of fiche.champs) if (!contenu(x).trim()) signaler('FORMAT', `champ vide : « ${x.label} »`) // M:format-vide
  if (fiche.clesInconnues.length) signaler('FORMAT', `clé(s) hors du schéma de p5 : ${fiche.clesInconnues.join(', ')}`) // M:format-cle-inconnue
  const src = champ('source')
  if (src) {
    const s = norm(contenu(src)).replace(/\*/g, '')
    if (!/integralement\s*:\s*(oui|non)\b/.test(s)) signaler('FORMAT', 'Source sans « intégralement : oui/non » (p5:74)') // M:format-source
    if (!/\blue?s?\s+le\s+\S*\d/.test(s)) signaler('FORMAT', 'Source sans « lue le <date> » (p5:74)') // M:format-source-lue
    if (!/date de publication|publiee?s?\s+le/.test(s)) signaler('FORMAT', 'Source sans date de publication (p5:74)') // M:format-source-publication
    if (ctx.idAttendu && !contenu(src).includes(ctx.idAttendu)) signaler('FORMAT', `Source ne porte pas l'identifiant de la vidéo ${ctx.idAttendu}`) // M:format-source-id
  }
  const montre = champ('montre')
  if (montre && contenu(montre).trim()) {
    const n = compterLignes(montre)
    if (n < LIGNES_MIN || n > LIGNES_MAX) signaler('FORMAT', `« Ce qu'elle montre » tient en ${n} ligne(s), pas 3 à 8 (p5:75)`) // M:format-lignes
  }

  // CHIFFRE (p5:81)
  const ch = champ('chiffres')
  if (ch) {
    const { items, horsListe } = decouper(ch)
    const texteHorsListe = horsListe.join(' ')
    const racineCouverte = marque(texteHorsListe)
    if (aDesChiffres(texteHorsListe) && !racineCouverte) signaler('CHIFFRE', `chiffre sans « annoncé par l'auteur, non vérifié » : « ${texteHorsListe.slice(0, 120)} »`) // M:chiffre-paragraphe
    const pile = []
    for (const item of items) {
      while (pile.length && pile[pile.length - 1].indent >= item.indent) pile.pop()
      const parentCouvert = pile.length ? pile[pile.length - 1].couvert : racineCouverte
      const couvert = marque(item.texte) || parentCouvert // M:chiffre-heritage
      if (aDesChiffres(item.texte) && !couvert) signaler('CHIFFRE', `chiffre sans « annoncé par l'auteur, non vérifié » : « ${item.texte.slice(0, 120)} »`) // M:chiffre-item
      pile.push({ indent: item.indent, couvert })
    }
  }
  if (!ctx.video) return defauts

  // TRANSCRIPTION (p5:86 ; fiches-videos.md:1021)
  if (!ctx.ids.length) signaler('TRANSCRIPTION', 'aucun identifiant de vidéo dans Source : transcription introuvable')
  for (const { id, t } of ctx.transcriptions) {
    if (!t) { signaler('TRANSCRIPTION', `vidéo ${id} : aucune transcription trouvée`); continue } // M:transcription-absente
    const motifAccepte = t.motif // M:transcription-motif
    if (t.vide && !motifAccepte) signaler('TRANSCRIPTION', `vidéo ${id} : transcription vide sans le motif « sans parole » (${path.basename(t.fichier)})`) // M:transcription-vide
  }

  // HORODATAGE et DUREE
  const texte = fiche.champs.map(contenu).join('\n')
  const stamps = horodatages(texte, ctx.duree ?? 0)
  if (stamps.length && !ctx.duree) signaler('DUREE', `${stamps.length} horodatage(s) cité(s), aucune durée connue : invérifiables`) // M:duree-introuvable
  for (const h of stamps) {
    if (h.malforme) signaler('HORODATAGE', `horodatage mal formé ${h.brut}`) // M:horodatage-malforme
    if (ctx.duree && h.s > ctx.duree + TOLERANCE_S) signaler('HORODATAGE', `${h.brut} = ${h.s} s, hors de la durée de ${ctx.duree} s (${ctx.origineDuree})`) // M:horodatage-hors-duree
  }

  // RECOPIE (plus de 15 mots ; la ligne Source, qui porte le titre, est exclue)
  const grammes = new Set()
  for (const { t } of ctx.transcriptions) if (t) for (let i = 0; i + SEUIL_RECOPIE <= t.mots.length; i++) grammes.add(t.mots.slice(i, i + SEUIL_RECOPIE).join(' '))
  if (grammes.size) {
    for (const x of fiche.champs) {
      if (x.cle === 'source') continue
      const r = recopie(contenu(x), grammes)
      if (r) signaler('RECOPIE', `« ${x.label} » recopie ${r.n} mots de la transcription : « ${r.extrait.slice(0, 160)} »`) // M:recopie
    }
  }
  return defauts
}

const estVideo = (fiche) => /tiktok|youtu|instagram|vimeo|\.mp4\b|\bvid[ée]o|\breel\b/i.test(fiche.champs.filter((c) => c.cle === 'source' || c.cle === 'licence').map(contenu).join(' '))

function contexteMarkdown(fiche) {
  const src = contenu(fiche.champs.find((c) => c.cle === 'source'))
  const video = estVideo(fiche)
  const ids = video ? extraireIds(src) : []
  const transcriptions = ids.map((id) => ({ id, t: trouverTranscription(id, compteDe(id, src)) }))
  const connues = transcriptions.map((x) => x.t?.duree).filter(Boolean)
  let duree = connues.length ? Math.max(...connues) : null
  let origineDuree = 'mesurée (transcription ou info.json)'
  if (!duree) { duree = dureeDeclaree(`${fiche.titre}\n${src}`); origineDuree = 'déclarée dans Source ou le titre' } // M:duree-declaree
  return { video, ids, transcriptions, duree, origineDuree }
}

function jugerDossierListe(dossier, liste) {
  const fiches = []
  const entrees = Array.isArray(liste) ? liste : Array.isArray(liste?.videos) ? liste.videos : null
  if (!entrees) return [{ fichier: path.join(dossier, 'liste.json'), titre: 'liste.json', ligne: 1, defauts: [{ code: 'FORMAT', message: 'liste.json n\'est ni un tableau ni { videos: [...] }' }] }]
  for (const e of entrees) {
    const id = String(e.identifiant ?? e.id ?? '')
    const fFiche = path.join(dossier, `${id}.fiche.json`)
    const fT = ['json', 'txt'].map((x) => path.join(dossier, `${id}.transcription.${x}`)).find((p) => fs.existsSync(p))
    const t = fT ? lireTranscription(fT) : null
    let fiche
    if (!fs.existsSync(fFiche)) {
      fiches.push({ fichier: fFiche, titre: `vidéo ${id}`, ligne: 1, defauts: [{ code: 'FORMAT', message: `la vidéo ${id} de liste.json n'a pas sa fiche ${id}.fiche.json` }] }) // M:format-fiche-absente
      continue
    }
    try { fiche = ficheDepuisJson(JSON.parse(fs.readFileSync(fFiche, 'utf8')), fFiche, `vidéo ${id}`) } catch (err) { fiche = { fichier: fFiche, titre: `vidéo ${id}`, illisible: `JSON illisible : ${err.message}` } }
    const duree = Number(e.duree) || t?.duree || null
    const ctx = { video: true, ids: [id], transcriptions: [{ id, t }], duree, origineDuree: Number(e.duree) ? 'liste.json' : 'transcription', idAttendu: id }
    fiches.push({ fichier: fFiche, titre: fiche.titre, ligne: 1, defauts: controler(fiche, ctx), horsFormat: [] })
  }
  return fiches
}

function juger(cibles, dossiersTranscriptions) {
  const resultats = []
  const fichiersMd = []
  const extra = []
  for (const c of cibles) {
    const p = path.resolve(RACINE, c)
    if (!fs.existsSync(p)) { resultats.push({ fichier: c, titre: '(cible)', ligne: 0, defauts: [{ code: 'FORMAT', message: 'cible introuvable' }] }); continue }
    if (fs.statSync(p).isDirectory()) {
      extra.push(p)
      const fl = path.join(p, 'liste.json')
      if (fs.existsSync(fl)) {
        let liste = null
        try { liste = JSON.parse(fs.readFileSync(fl, 'utf8')) } catch (err) { resultats.push({ fichier: fl, titre: 'liste.json', ligne: 1, defauts: [{ code: 'FORMAT', message: `liste.json illisible : ${err.message}` }] }); continue }
        resultats.push(...jugerDossierListe(p, liste))
      } else fichiersMd.push(...indexer([p]).filter((x) => x.endsWith('.md')))
    } else fichiersMd.push(p)
  }
  indexFichiers = indexer([...dossiersTranscriptions, ...extra])
  for (const f of fichiersMd) {
    const fiches = lireFichesMarkdown(fs.readFileSync(f, 'utf8'), f)
    if (!fiches.length) resultats.push({ fichier: f, titre: '(fichier)', ligne: 0, defauts: [{ code: 'FORMAT', message: 'aucune fiche (aucune ligne « Source : »)' }] })
    for (const fiche of fiches) resultats.push({ fichier: f, titre: fiche.titre, ligne: fiche.ligne, defauts: controler(fiche, contexteMarkdown(fiche)), horsFormat: fiche.horsFormat })
  }
  return resultats
}

function imprimer(resultats) {
  const rel = (f) => path.relative(RACINE, f) || f
  const rouges = resultats.filter((r) => r.defauts.length)
  console.log(`fiches-videos-qa — ${resultats.length} fiche(s) jugée(s)`)
  for (const r of resultats) {
    console.log(`  ${r.defauts.length ? '✗' : '✓'} ${rel(r.fichier)}:${r.ligne}  ${r.titre}`)
    for (const d of r.defauts) console.log(`      ${d.code} — ${d.message}`)
    if (r.horsFormat?.length) console.log(`      (avertissement : bloc hors des huit champs, ligne ${r.horsFormat.join(', ')})`)
  }
  const parCode = {}
  for (const r of rouges) for (const d of r.defauts) parCode[d.code] = (parCode[d.code] || 0) + 1
  console.log(`Bilan : ${resultats.length} fiche(s), ${resultats.length - rouges.length} verte(s), ${rouges.length} rouge(s)` +
    (rouges.length ? ` ; défauts : ${Object.entries(parCode).map(([k, v]) => `${k} ${v}`).join(', ')}` : ''))
  return rouges.length === 0 && resultats.length > 0
}

// ── le banc : témoins propres et témoins mutés ─────────────────────────────────────────────────────────────────
function remplacer(texte, avant, apres) {
  if (!texte.includes(avant)) throw new Error(`mutation inapplicable : « ${avant.slice(0, 60)} » absent du témoin`)
  return texte.replace(avant, apres)
}
const ID_MD = '7000000000000000001'
const ID_D = '7000000000000000002'
const PHRASE16 = 'Every morning the planner agent reads the orders, checks the stock and prepares a short list'
function muterMd(fn) { return (d) => { const f = path.join(d, 'md', 'fiche.md'); fs.writeFileSync(f, fn(fs.readFileSync(f, 'utf8'))) } }
function muterJsonMd(fn) { return (d) => { const f = path.join(d, 'md', 'transcriptions', `${ID_MD}.transcription.json`); const j = JSON.parse(fs.readFileSync(f, 'utf8')); fn(j); fs.writeFileSync(f, JSON.stringify(j)) } }
function muterFiche(fn) { return (d) => { const f = path.join(d, 'dossier', `${ID_D}.fiche.json`); const j = JSON.parse(fs.readFileSync(f, 'utf8')); fs.writeFileSync(f, JSON.stringify(fn(j) ?? j)) } }
const LICENCE = '**Licence (dépôt) :** sans objet (vidéo).'
const ERREURS = "**Erreurs à éviter :**\n- Constaté : aucun journal d'exécution n'est montré.\n\n"
const PRINCIPES = "**Principes et patterns réutilisables :**\n- Une file d'approbation avant toute sortie [00:27].\n- Une exception arrive avec sa solution [00:41]-[00:58].\n\n"
const CHIFFRES_PARAGRAPHE = '**Chiffres annoncés :** 40 dollars par mois [01:05] ; 2 agents nommés (image 045).'

const CAS = [
  { nom: 'md-temoin', libelle: 'md : témoin propre', cible: 'md', attendu: null },
  { nom: 'md-champ-retire', libelle: 'md : « Erreurs à éviter » retiré', cible: 'md', attendu: 'FORMAT', muter: muterMd((t) => remplacer(t, ERREURS, '')) },
  { nom: 'md-champs-inverses', libelle: 'md : « Principes » et « Erreurs » inversés', cible: 'md', attendu: 'FORMAT', muter: muterMd((t) => remplacer(t, PRINCIPES + ERREURS, ERREURS + PRINCIPES)) },
  { nom: 'md-champ-double', libelle: 'md : « Licence » en double', cible: 'md', attendu: 'FORMAT', muter: muterMd((t) => remplacer(t, LICENCE, `${LICENCE}\n\n${LICENCE}`)) },
  { nom: 'md-champ-vide', libelle: 'md : « Licence » vidé', cible: 'md', attendu: 'FORMAT', muter: muterMd((t) => remplacer(t, LICENCE, '**Licence (dépôt) :**')) },
  { nom: 'md-integralement', libelle: 'md : « intégralement » retiré de Source', cible: 'md', attendu: 'FORMAT', muter: muterMd((t) => remplacer(t, ' · intégralement : oui', '')) },
  { nom: 'md-lue-retiree', libelle: 'md : « lue le » retiré de Source', cible: 'md', attendu: 'FORMAT', muter: muterMd((t) => remplacer(t, ' · lue le 2026-11-02', '')) },
  { nom: 'md-publication-retiree', libelle: 'md : date de publication retirée de Source', cible: 'md', attendu: 'FORMAT', muter: muterMd((t) => remplacer(t, ' · publiée le 01/10/2026', '')) },
  { nom: 'md-deux-lignes', libelle: "md : « Ce qu'elle montre » réduit à 2 lignes", cible: 'md', attendu: 'FORMAT', muter: muterMd((t) => remplacer(remplacer(t, "- [00:27]-[00:41] Rien ne part chez un client sans le bouton vert de la file d'approbation (image 030).\n", ''), '- [00:41]-[00:58] Un retard de livraison arrive préparé : un brouillon et une solution.\n', '')) },
  { nom: 'md-hors-duree', libelle: 'md : [01:45] dans une vidéo de 90 s', cible: 'md', attendu: 'HORODATAGE', muter: muterMd((t) => remplacer(t, '- [00:41]-[00:58] Un retard', '- [00:41]-[01:45] Un retard')) },
  { nom: 'md-secondes', libelle: 'md : [12,0-97,0 s] dans une vidéo de 90 s', cible: 'md', attendu: 'HORODATAGE', muter: muterMd((t) => remplacer(t, '[12,0-27,0 s]', '[12,0-97,0 s]')) },
  { nom: 'md-image', libelle: 'md : image 120 dans une vidéo de 90 s', cible: 'md', attendu: 'HORODATAGE', muter: muterMd((t) => remplacer(t, '(image 030)', '(image 120)')) },
  { nom: 'md-malforme', libelle: 'md : horodatage mal formé [00:75]', cible: 'md', attendu: 'HORODATAGE', muter: muterMd((t) => remplacer(t, 'avant toute sortie [00:27]', 'avant toute sortie [00:75]')) },
  { nom: 'md-transcription-retiree', libelle: 'md : transcription retirée (la durée venait d\'elle : DUREE aussi)', cible: 'md', attendu: ['DUREE', 'TRANSCRIPTION'], muter: (d) => fs.rmSync(path.join(d, 'md', 'transcriptions', `${ID_MD}.transcription.json`)) },
  { nom: 'md-duree-retiree', libelle: 'md : durée retirée de la transcription', cible: 'md', attendu: 'DUREE', muter: muterJsonMd((j) => { delete j.duree }) },
  { nom: 'md-duree-declaree', libelle: 'md : durée retirée, mais déclarée « (90 s) » dans Source', cible: 'md', attendu: null, muter: (d) => { muterJsonMd((j) => { delete j.duree })(d); muterMd((t) => remplacer(t, 'intégralement : oui', 'intégralement : oui (90 s)'))(d) } },
  { nom: 'md-chiffre-nu', libelle: 'md : chiffre sans marque', cible: 'md', attendu: 'CHIFFRE', muter: muterMd((t) => remplacer(t, '  - 2 agents nommés à l\'écran (image 045).\n', '  - 2 agents nommés à l\'écran (image 045).\n- 3 boutiques équipées [00:20].\n')) },
  { nom: 'md-parent-demarque', libelle: 'md : marque retirée de la ligne parente', cible: 'md', attendu: 'CHIFFRE', muter: muterMd((t) => remplacer(t, "- Par l'auteur, tous annoncés par l'auteur, non vérifiés :", "- Par l'auteur :")) },
  { nom: 'md-paragraphe-nu', libelle: 'md : chiffres en paragraphe sans marque', cible: 'md', attendu: 'CHIFFRE', muter: muterMd((t) => t.slice(0, t.indexOf('**Chiffres annoncés :**')) + CHIFFRES_PARAGRAPHE + '\n') },
  { nom: 'md-paragraphe-marque', libelle: 'md : chiffres en paragraphe, marqués', cible: 'md', attendu: null, muter: muterMd((t) => t.slice(0, t.indexOf('**Chiffres annoncés :**')) + CHIFFRES_PARAGRAPHE + " Annoncés par l'auteur, non vérifiés.\n") },
  { nom: 'md-maquettes-pluriel', libelle: 'md : marque au pluriel « lus sur des maquettes, non vérifiés »', cible: 'md', attendu: null, muter: muterMd((t) => remplacer(t, '  - 2 agents nommés à l\'écran (image 045).\n', '  - 2 agents nommés à l\'écran (image 045).\n- « 7 devis » (image 050) : lus sur des maquettes, non vérifiés.\n')) },
  { nom: 'md-paragraphe-trois-phrases', libelle: "md : « Ce qu'elle montre » en paragraphe de 3 phrases sur 2 lignes", cible: 'md', attendu: null, muter: muterMd((t) => t.replace(/\*\*Ce qu'elle montre :\*\*\n[\s\S]*?\n\n/, "**Ce qu'elle montre :** Une boulangerie fictive confie son arrière-boutique à des agents [00:00]-[00:12]. Chaque matin, une liste\nà valider [12,0-27,0 s]. Rien ne part sans le bouton vert (image 030).\n\n")) },
  { nom: 'md-paragraphe-deux-phrases', libelle: "md : « Ce qu'elle montre » en paragraphe de 2 phrases", cible: 'md', attendu: 'FORMAT', muter: muterMd((t) => t.replace(/\*\*Ce qu'elle montre :\*\*\n[\s\S]*?\n\n/, "**Ce qu'elle montre :** Une boulangerie fictive et ses agents [00:00]-[00:12] ; une liste\nà valider [12,0-27,0 s]. Rien ne part sans le bouton vert (image 030).\n\n")) },
  { nom: 'md-par-compte', libelle: 'md : transcription rangée sous le nom du compte (compte-exemple/transcription.txt)', cible: 'md', attendu: null, muter: (d) => { const dt = path.join(d, 'md', 'transcriptions'); const j = JSON.parse(fs.readFileSync(path.join(dt, `${ID_MD}.transcription.json`), 'utf8')); fs.rmSync(path.join(dt, `${ID_MD}.transcription.json`)); fs.mkdirSync(path.join(dt, 'compte-exemple')); fs.writeFileSync(path.join(dt, 'compte-exemple', 'transcription.txt'), j.segments.map((x) => x.texte).join(' ')); muterMd((t) => remplacer(t, 'intégralement : oui', 'intégralement : oui (90 s)'))(d) } },
  { nom: 'md-compte-autre-video', libelle: "md : le dossier du compte ne porte que la transcription d'une AUTRE vidéo", cible: 'md', attendu: ['DUREE', 'TRANSCRIPTION'], muter: (d) => { const dt = path.join(d, 'md', 'transcriptions'); fs.rmSync(path.join(dt, `${ID_MD}.transcription.json`)); fs.mkdirSync(path.join(dt, 'compte-exemple')); fs.writeFileSync(path.join(dt, 'compte-exemple', '7000000000000000009.transcription.txt'), 'Exemple. Another video.') } },
  { nom: 'md-sous-titres-vtt', libelle: 'md : sous-titres .vtt à la place de la transcription (durée lue au dernier minutage)', cible: 'md', attendu: 'RECOPIE', muter: (d) => { const dt = path.join(d, 'md', 'transcriptions'); fs.rmSync(path.join(dt, `${ID_MD}.transcription.json`)); fs.writeFileSync(path.join(dt, `${ID_MD}.en-orig.vtt`), `WEBVTT\nKind: captions\n\n00:00:12.000 --> 00:00:20.000\n<c>${PHRASE16.split(',')[0]},</c>\n\n00:00:20.000 --> 00:01:30.000\n${PHRASE16.split(', ')[1]} for the owner\n`); muterMd((t) => remplacer(t, '- Une exception arrive avec sa solution [00:41]-[00:58].\n', `- Une exception arrive avec sa solution [00:41]-[00:58].\n- L'auteur dit : « ${PHRASE16} » (traduit plus haut).\n`))(d) } },
  { nom: 'md-recopie-16', libelle: 'md : 16 mots recopiés de la transcription', cible: 'md', attendu: 'RECOPIE', muter: muterMd((t) => remplacer(t, '- Une exception arrive avec sa solution [00:41]-[00:58].\n', `- Une exception arrive avec sa solution [00:41]-[00:58].\n- L'auteur dit : « ${PHRASE16} » (traduit plus haut).\n`)) },
  { nom: 'md-recopie-15', libelle: 'md : 15 mots recopiés (la borne)', cible: 'md', attendu: null, muter: muterMd((t) => remplacer(t, '- Une exception arrive avec sa solution [00:41]-[00:58].\n', `- Une exception arrive avec sa solution [00:41]-[00:58].\n- L'auteur dit : « ${PHRASE16.replace('Every ', '')} » (traduit plus haut).\n`)) },
  { nom: 'd-temoin', libelle: 'dossier : témoin propre', cible: 'dossier', attendu: null },
  { nom: 'd-transcription-retiree', libelle: 'dossier : transcription retirée (la mutation de fiches-videos.md:1027)', cible: 'dossier', attendu: 'TRANSCRIPTION', muter: (d) => fs.rmSync(path.join(d, 'dossier', `${ID_D}.transcription.txt`)) },
  { nom: 'd-transcription-vide', libelle: 'dossier : transcription vidée, sans motif', cible: 'dossier', attendu: 'TRANSCRIPTION', muter: (d) => fs.writeFileSync(path.join(d, 'dossier', `${ID_D}.transcription.txt`), '  \n') },
  { nom: 'd-sans-parole', libelle: 'dossier : transcription vide avec le motif « sans parole »', cible: 'dossier', attendu: null, muter: (d) => fs.writeFileSync(path.join(d, 'dossier', `${ID_D}.transcription.txt`), 'sans parole\n') },
  { nom: 'd-fiche-absente', libelle: 'dossier : fiche.json absente', cible: 'dossier', attendu: 'FORMAT', muter: (d) => fs.rmSync(path.join(d, 'dossier', `${ID_D}.fiche.json`)) },
  { nom: 'd-cle-retiree', libelle: 'dossier : clé « Erreurs à éviter » retirée', cible: 'dossier', attendu: 'FORMAT', muter: muterFiche((j) => { delete j['Erreurs à éviter'] }) },
  { nom: 'd-cle-inconnue', libelle: 'dossier : clé hors schéma ajoutée', cible: 'dossier', attendu: 'FORMAT', muter: muterFiche((j) => { j['Note libre'] = 'Exemple.' }) },
  { nom: 'd-neuf-lignes', libelle: "dossier : « Ce qu'elle montre » à 9 lignes", cible: 'dossier', attendu: 'FORMAT', muter: muterFiche((j) => { j["Ce qu'elle montre"] = Array.from({ length: 9 }, (_, k) => `[00:0${k}] Exemple. Ligne ${k + 1}.`) }) },
  { nom: 'd-source-sans-id', libelle: "dossier : Source sans l'identifiant de la vidéo", cible: 'dossier', attendu: 'FORMAT', muter: muterFiche((j) => { j.Source = remplacer(j.Source, `https://www.tiktok.com/@compte-exemple/video/${ID_D}`, 'lien perdu') }) },
  { nom: 'd-hors-duree', libelle: 'dossier : [01:30] dans une vidéo de 75 s', cible: 'dossier', attendu: 'HORODATAGE', muter: muterFiche((j) => { j["Ce qu'elle montre"][2] = remplacer(j["Ce qu'elle montre"][2], '[01:10]', '[01:30]') }) },
  { nom: 'd-duree-absente', libelle: 'dossier : durée absente de liste.json', cible: 'dossier', attendu: 'DUREE', muter: (d) => { const f = path.join(d, 'dossier', 'liste.json'); const l = JSON.parse(fs.readFileSync(f, 'utf8')); delete l[0].duree; fs.writeFileSync(f, JSON.stringify(l)) } },
  { nom: 'd-chiffre-nu', libelle: 'dossier : chiffre sans marque', cible: 'dossier', attendu: 'CHIFFRE', muter: muterFiche((j) => { j['Chiffres annoncés'].push('5 clients par jour [00:30].') }) },
  { nom: 'd-recopie', libelle: 'dossier : 17 mots recopiés de la transcription', cible: 'dossier', attendu: 'RECOPIE', muter: muterFiche((j) => { j['Principes et patterns réutilisables'].push("L'auteur dit : « The owner checks the draft, presses approve and the message leaves with the quote attached. The author » (sic).") }) },
]

function materialiser(temoins, d) {
  fs.mkdirSync(path.join(d, 'md', 'transcriptions'), { recursive: true })
  fs.mkdirSync(path.join(d, 'dossier'), { recursive: true })
  fs.writeFileSync(path.join(d, 'md', 'fiche.md'), temoins.md['fiche.md'].join('\n'))
  for (const [nom, v] of Object.entries(temoins.md.transcriptions)) fs.writeFileSync(path.join(d, 'md', 'transcriptions', nom), JSON.stringify(v, null, 2))
  for (const [nom, v] of Object.entries(temoins.dossier)) fs.writeFileSync(path.join(d, 'dossier', nom), typeof v === 'string' ? v : JSON.stringify(v, null, 2))
}

function executerTemoins(tmp) {
  const fichierTemoins = path.resolve(option('temoins-de') || path.join(RACINE, 'scripts', 'fixtures', 'fiches-videos-qa', 'temoins.json'))
  const temoins = JSON.parse(fs.readFileSync(fichierTemoins, 'utf8'))
  const echecs = []
  console.log(`banc : ${CAS.length} cas sur les témoins fictifs (${path.relative(RACINE, fichierTemoins) || fichierTemoins})`)
  CAS.forEach((cas, k) => {
    const d = path.join(tmp, `cas-${String(k + 1).padStart(2, '0')}`)
    let codes = []
    let erreur = null
    try {
      materialiser(temoins, d)
      if (cas.muter) cas.muter(d)
      const r = cas.cible === 'md' ? juger([path.join(d, 'md', 'fiche.md')], [path.join(d, 'md', 'transcriptions')]) : juger([path.join(d, 'dossier')], [])
      codes = [...new Set(r.flatMap((x) => x.defauts.map((y) => y.code)))].sort()
      if (!r.length) erreur = 'aucune fiche lue'
    } catch (err) { erreur = err.message }
    const attendus = cas.attendu ? [cas.attendu].flat().sort() : [] // l'ensemble EXACT des codes : ni moins, ni plus
    const ok = !erreur && codes.join('+') === attendus.join('+')
    if (!ok) echecs.push(cas.nom)
    console.log(`  ${ok ? '✓' : '✗'} ${cas.libelle} — attendu ${cas.attendu ? [cas.attendu].flat().sort().join('+') : 'vert'}, obtenu ${erreur ? `ERREUR ${erreur}` : codes.length ? codes.join('+') : 'vert'}`)
  })
  console.log(`banc : ${CAS.length - echecs.length}/${CAS.length} cas au bon verdict`)
  if (option('rapport')) fs.writeFileSync(option('rapport'), JSON.stringify({ echecs }))
  return echecs.length === 0
}

// ── les mutants du juge : un contrôle retiré d'une COPIE ; le banc de la copie doit rougir sur le cas attendu ──────────
// marque : le repère de fin de ligne dans ce fichier ; transformer : la ligne mutée ('' = ligne retirée).
const MUTANTS = [
  { marque: 'format-manquant', attendus: ['md-champ-retire', 'd-cle-retiree'] },
  { marque: 'format-doublon', attendus: ['md-champ-double'] },
  { marque: 'format-ordre', attendus: ['md-champs-inverses'] },
  { marque: 'format-vide', attendus: ['md-champ-vide'] },
  { marque: 'format-cle-inconnue', attendus: ['d-cle-inconnue'] },
  { marque: 'format-source', attendus: ['md-integralement'] },
  { marque: 'format-source-lue', attendus: ['md-lue-retiree'] },
  { marque: 'format-source-publication', attendus: ['md-publication-retiree'] },
  { marque: 'format-source-id', attendus: ['d-source-sans-id'] },
  { marque: 'format-lignes', attendus: ['md-deux-lignes', 'd-neuf-lignes'] },
  { marque: 'format-fiche-absente', attendus: ['d-fiche-absente'] },
  { marque: 'horodatage-hors-duree', attendus: ['md-hors-duree', 'md-secondes', 'md-image', 'd-hors-duree'] },
  { marque: 'horodatage-secondes', attendus: ['md-secondes'] },
  { marque: 'horodatage-image', attendus: ['md-image'] },
  { marque: 'horodatage-malforme', attendus: ['md-malforme'] },
  { marque: 'duree-introuvable', attendus: ['md-duree-retiree', 'd-duree-absente'] },
  { marque: 'duree-declaree', attendus: ['md-duree-declaree'] },
  { marque: 'transcription-absente', attendus: ['md-transcription-retiree', 'd-transcription-retiree'] },
  { marque: 'transcription-vide', attendus: ['d-transcription-vide'] },
  { marque: 'transcription-motif', attendus: ['d-sans-parole'], transformer: (l) => l.replace('= t.motif', '= false') },
  { marque: 'marque-maquettes', attendus: ['md-maquettes-pluriel'], transformer: (l) => l.replace('(une|des)\\s+maquettes?', 'une\\s+maquette') },
  { marque: 'lignes-phrases', attendus: ['md-paragraphe-trois-phrases'], transformer: (l) => l.replace('.length || 1', '.length * 0 + 2') },
  { marque: 'transcription-compte', attendus: ['md-par-compte'] },
  { marque: 'transcription-compte', nom: 'transcription-compte-autre', attendus: ['md-compte-autre-video'], transformer: (l) => l.replace(' && !autreId(p)', '') },
  { marque: 'transcription-vtt', attendus: ['md-sous-titres-vtt'] },
  { marque: 'chiffre-item', attendus: ['md-chiffre-nu', 'd-chiffre-nu', 'md-parent-demarque'] },
  { marque: 'chiffre-heritage', attendus: ['md-temoin'], transformer: (l) => l.replace(' || parentCouvert', '') },
  { marque: 'chiffre-paragraphe', attendus: ['md-paragraphe-nu'] },
  { marque: 'recopie', attendus: ['md-recopie-16', 'd-recopie'] },
  { marque: 'seuil-recopie', nom: 'seuil-recopie-15', attendus: ['md-recopie-15'], transformer: (l) => l.replace('= 16', '= 15') },
  { marque: 'seuil-recopie', nom: 'seuil-recopie-17', attendus: ['md-recopie-16'], transformer: (l) => l.replace('= 16', '= 17') },
]

function executerMutants(tmp) {
  const source = fs.readFileSync(SCRIPT, 'utf8').split('\n')
  const fichierTemoins = path.resolve(option('temoins-de') || path.join(RACINE, 'scripts', 'fixtures', 'fiches-videos-qa', 'temoins.json'))
  let rates = 0
  // garde : chaque repère du juge a son mutant (un contrôle ajouté sans mutant fait rougir le banc)
  const reperes = [...new Set(source.map((l) => l.trimEnd().match(new RegExp(`// ${'M'}:([\\w-]+)$`))?.[1]).filter(Boolean))]
  const orphelins = reperes.filter((r) => !MUTANTS.some((m) => m.marque === r))
  if (orphelins.length) { console.log(`  ✗ repère(s) sans mutant : ${orphelins.join(', ')}`) }
  console.log(`\nmutants : chaque contrôle retiré d'une copie du juge (${MUTANTS.length}) ; le banc de la copie doit rougir sur le cas attendu`)
  MUTANTS.forEach((m, k) => {
    const nom = m.nom || m.marque
    const repere = `// ${'M'}:${m.marque}`
    const lignes = source.map((l, i) => (l.trimEnd().endsWith(repere) ? i : -1)).filter((i) => i >= 0)
    let verdict
    if (lignes.length !== 1) verdict = `repère « ${repere} » trouvé ${lignes.length} fois (attendu : 1) : mutant périmé`
    else {
      const copie = [...source]
      const avant = copie[lignes[0]]
      copie[lignes[0]] = m.transformer ? m.transformer(avant) : ''
      if (m.transformer && copie[lignes[0]] === avant) verdict = 'la transformation ne change rien : mutant périmé'
      else {
        const d = path.join(tmp, `mutant-${String(k + 1).padStart(2, '0')}`)
        fs.mkdirSync(d, { recursive: true })
        const fCopie = path.join(d, 'fiches-videos-qa.mjs')
        const fRapport = path.join(d, 'rapport.json')
        fs.writeFileSync(fCopie, copie.join('\n'))
        const r = spawnSync(process.execPath, [fCopie, '--temoins', `--temoins-de=${fichierTemoins}`, `--rapport=${fRapport}`], { encoding: 'utf8', timeout: 120000 })
        const rapport = fs.existsSync(fRapport) ? JSON.parse(fs.readFileSync(fRapport, 'utf8')) : null
        const pris = rapport ? m.attendus.filter((a) => rapport.echecs.includes(a)) : []
        if (r.status !== 1) verdict = `la copie sort en ${r.status} : le mutant SURVIT`
        else if (!rapport) verdict = `la copie a planté sans rapport (mauvaise raison) : ${(r.stderr || '').split('\n').find((x) => x.trim()) || ''}`
        else if (!pris.length) verdict = `rouge, mais sur ${rapport.echecs.join(', ')} et pas sur ${m.attendus.join(' ou ')} (mauvaise raison)`
        else verdict = null
        if (!verdict) console.log(`  ✓ ${nom} — tué par ${pris.join(', ')}`)
      }
    }
    if (verdict) { rates++; console.log(`  ✗ ${nom} — ${verdict}`) }
  })
  console.log(`mutants : ${MUTANTS.length - rates}/${MUTANTS.length} tués pour la bonne raison${orphelins.length ? ` ; ${orphelins.length} repère(s) sans mutant` : ''}`)
  return rates === 0 && orphelins.length === 0
}

// ── principal ──────────────────────────────────────────────────────────────────────────────────────────────────
if (option('temoins') || option('mutants')) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fiches-videos-qa-'))
  let ok = false
  try {
    ok = executerTemoins(tmp)
    if (option('mutants')) {
      if (!ok) console.log('\nmutants : non joués, le banc lui-même est rouge')
      else ok = executerMutants(tmp)
    }
  } finally { if (!option('garder')) fs.rmSync(tmp, { recursive: true, force: true }) }
  console.log(ok ? 'VERT' : 'ROUGE')
  process.exit(ok ? 0 : 1)
} else {
  const dossiers = [...(option('transcriptions') ? option('transcriptions').split(',').map((x) => path.resolve(x)) : []), ...DOSSIERS_TRANSCRIPTIONS]
  const ok = imprimer(juger(positionnels.length ? positionnels : CIBLES_DEFAUT, dossiers))
  process.exit(ok ? 0 : 1)
}
