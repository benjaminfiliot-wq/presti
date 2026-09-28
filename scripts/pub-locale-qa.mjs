#!/usr/bin/env node
// scripts/pub-locale-qa.mjs — le juge du pack pubs locales (fiche 026-126) : gabarits (gabarits-pubs/locale/),
// textes (sortie/textes.md, sortie/fiche-10-min.md) et pack complet (sortie/ : 3 films + 3 visuels + les textes),
// pour que juges-026-pubs-contenu-preuve.mjs --lot=10 soit vert. Cahier complet dans la fiche 026-126, section
// « Cahier du juge (pub-locale-qa) ».
//
// --temoin : ce juge N'INVOQUE JAMAIS scripts/pack-pub/instancier.mjs, textes.mjs ni fabriquer.mjs — ces scripts
// n'existent pas encore (fiches 026-153, 026-154, 026-156, non faites). Le témoin est un pack AUTOSUFFISANT fabriqué
// par scripts/fixtures/026-pubs-contenu/pack/fabriquer-temoin.mjs, avec ses propres gabarits minimaux (« pas le
// gabarit », fiche 026-126 point 3) : `instancier()` ci-dessous (la même substitution de marques que la fiche décrit
// pour scripts/pack-pub/instancier.mjs) sert à la fois à fabriquer le témoin et à instancier n'importe quel gabarit
// pour PL-G1. Sans --temoin, --partie=gabarit va bien lire gabarits-pubs/locale/ et scripts/pack-pub/instancier.mjs
// à la racine jugée : tant que 026-153 n'est pas faite, ces critères échouent légitimement (c'est le comportement
// attendu par juges-026-pubs-contenu-preuve.mjs --lot=10 sur --racine=<référence>).
//
// Usage :
//   node scripts/pub-locale-qa.mjs --partie=gabarit|textes|complet [--racine=<dossier>] [--temoin] [--dossier=<pack>]
//     [--meta-logement=oui|non|a_verifier]
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide.
// N'écrit que sous .orchestre/travail/ (pub-locale-qa/, 026-pubs-contenu/pack-temoin/).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { R, TRAVAIL, lireOptionsOuQuitter, creerSortie } from './fixtures/025/commun.mjs'

const NOM = 'pub-locale-qa'
const MON_TRAVAIL = path.join(TRAVAIL, 'pub-locale-qa')
export const TEMOIN_DIR = path.join(TRAVAIL, '026-pubs-contenu', 'pack-temoin')
const DELAI_HF = 5 * 60_000
const posix = (p) => String(p).split(path.sep).join('/')
const rel = (p, base = R) => posix(path.relative(base, p)) || '.'
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const existeNonVide = (f) => { try { const s = fs.statSync(f); return s.isFile() && s.size > 0 } catch { return false } }
const echapperHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── Le contrat (gabarits-pubs/locale/contrat.json) ──────────────────────────────────────────────────────────────────
export function chargerContrat(racine) {
  const f = path.join(racine, 'gabarits-pubs', 'locale', 'contrat.json')
  if (!fs.existsSync(f)) return null
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null }
}
export function chargerAssetsAutorises(racine) {
  const f = path.join(racine, 'gabarits-pubs', 'locale', 'assets-autorises.json')
  if (!fs.existsSync(f)) return { fichiers: [] }
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return { fichiers: [] } }
}

// ── Un pack.json (matiere) ───────────────────────────────────────────────────────────────────────────────────────────
export function chargerPack(packJsonPath) {
  const pack = JSON.parse(fs.readFileSync(packJsonPath, 'utf8'))
  pack.__dir = path.dirname(packJsonPath)
  return pack
}
/** Résout le chemin d'une photo/voix de pack.json : "photos/…" ou "voix.mp3" relatif au pack, sinon relatif au dépôt (démos). */
function resoudreChemin(fichier, packDir) {
  if (/^(photos|voix\.mp3)/.test(fichier)) return path.join(packDir, fichier)
  return path.join(R, fichier)
}
export function validerMatiere(pack, contrat) {
  const e = []
  const m = pack?.matiere
  if (!m) return ['matiere manquante']
  const photos = m.photos || []
  const spec = contrat.matiere.photos
  if (photos.length < spec.min || photos.length > spec.max) e.push(`photos : ${photos.length} (attendu ${spec.min}-${spec.max})`)
  for (const p of photos) if (!spec.roles.includes(p.role)) e.push(`rôle de photo invalide : ${p.role}`)
  if (!contrat.matiere.faits.cta.includes(m.cta)) e.push(`cta invalide : ${m.cta}`)
  if (!contrat.matiere.voix.includes(m.voix)) e.push(`voix invalide : ${m.voix}`)
  if (m.voix === 'synthese') {
    const tv = m.texte_voix || ''
    if (tv.length < contrat.matiere.texte_voix.min || tv.length > contrat.matiere.texte_voix.max) e.push(`texte_voix hors bornes (${tv.length})`)
  }
  return e
}

// ── instancier() : substitution des marques d'un gabarit avec un pack (fiche 026-126, § contrat) ──────────────────────
// Marques : {{photo:N}} → img/N.jpg (copié depuis le pack) ; {{metier}}, {{ville}}, {{accroche}}, {{cta}}, {{telephone}},
// {{duree_travaux}}, {{materiaux}} → texte échappé ; {{voix}} (dans un <audio>) → voix.mp3 copiée. Le bloc
// <!-- solo-si-voix --> … <!-- /solo-si-voix --> (audio + mention-ia) est retiré entier quand voix = aucune.
export function instancier(gabaritHtmlPath, pack, sortieDir) {
  let html = fs.readFileSync(gabaritHtmlPath, 'utf8')
  fs.rmSync(sortieDir, { recursive: true, force: true })
  fs.mkdirSync(sortieDir, { recursive: true })
  const photos = pack.matiere.photos || []
  html = html.replace(/\{\{photo:(\d+)\}\}/g, (m, n) => {
    const photo = photos[Number(n) - 1]
    if (!photo) return m
    const src = resoudreChemin(photo.fichier, pack.__dir)
    if (!fs.existsSync(src)) return m
    fs.mkdirSync(path.join(sortieDir, 'img'), { recursive: true })
    const destRel = `img/${n}.jpg`
    fs.copyFileSync(src, path.join(sortieDir, destRel))
    return destRel
  })
  const CTA_LIBELLE = { devis: 'Devis gratuit', appel: 'Appelez-nous', message: 'Envoyez un message' }
  const simples = {
    metier: pack.matiere.metier, ville: pack.matiere.ville, accroche: pack.matiere.accroche,
    cta: CTA_LIBELLE[pack.matiere.cta] || pack.matiere.cta, telephone: pack.matiere.telephone || '',
    duree_travaux: pack.matiere.duree_travaux, materiaux: pack.matiere.materiaux,
  }
  for (const [k, v] of Object.entries(simples)) html = html.split(`{{${k}}}`).join(echapperHtml(v))
  if (pack.matiere.voix === 'synthese') {
    const src = resoudreChemin('voix.mp3', pack.__dir)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(sortieDir, 'voix.mp3'))
    html = html.split('{{voix}}').join('voix.mp3')
  } else {
    html = html.replace(/<!--\s*solo-si-voix\s*-->[\s\S]*?<!--\s*\/solo-si-voix\s*-->/g, '')
  }
  fs.writeFileSync(path.join(sortieDir, 'index.html'), html)
  return sortieDir
}

// ── hyperframes CLI ───────────────────────────────────────────────────────────────────────────────────────────────────
// shell: true — sous Windows, spawnSync('npx', …) sans shell échoue en ENOENT (npx est un .cmd, pas un exécutable
// direct) ; aucun argument ici ne porte de métacaractère de shell (chemins internes, sans « | » ni espace).
function hf(args, { cwd = R, timeout = DELAI_HF } = {}) {
  return spawnSync('npx', ['--yes', 'hyperframes@0.8.33', ...args], { cwd, encoding: 'utf8', timeout, windowsHide: true, maxBuffer: 1 << 28, shell: true })
}
function hfCheckJson(dir) {
  const r = hf(['check', '--json', dir])
  let j = null
  try { j = JSON.parse(r.stdout) } catch { /* laissé null */ }
  return { r, j }
}

// ── Racine des gabarits (réels, ou témoin) ───────────────────────────────────────────────────────────────────────────
export const NOMS_GABARITS = ['avant-apres', 'chantier', 'artisan-ville', 'visuel']
function racineGabarits(racine, temoin) { return temoin ? path.join(TEMOIN_DIR, 'gabarits-temoin') : path.join(racine, 'gabarits-pubs', 'locale') }
function scriptInstancierReel(racine) { return path.join(racine, 'scripts', 'pack-pub', 'instancier.mjs') }

// ── Zone sûre (PL-G5) : analyse STATIQUE du HTML + CSS instanciés, sans navigateur ──────────────────────────────────────
// window.__timelines n'existe que sous le pilote HyperFrames (check/render/snapshot) : une page brute ouverte dans un
// navigateur nu (Playwright seul) n'a pas ce registre (vérifié : PAGEERROR « Cannot set properties of undefined »), donc
// pas de seek() possible hors de ce pilote. On mesure ici la position déclarée (règles CSS #id{top:…} ou
// .texte-surimpression{…}) et une hauteur de texte majorée (2 lignes) à partir du raccourci `font`, sans rendu réel —
// suffisant pour un gabarit qu'on a soi-même écrit avec des blocs de texte non animés verticalement.
function extraireReglesCss(html) {
  const style = (html.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1]
  const regles = new Map()
  for (const m of style.matchAll(/([#.][\w-]+)\s*\{([^}]*)\}/g)) regles.set(m[1], m[2])
  return regles
}
function valeurCss(regle, propriete) {
  const m = regle && regle.match(new RegExp(`(?:^|;)\\s*${propriete}\\s*:\\s*([^;]+)`))
  return m ? m[1].trim() : null
}
function verifierZoneSureStatique(html, hauteurComposition, zoneSure) {
  const regles = extraireReglesCss(html)
  const violations = []
  const balises = [...html.matchAll(/<(?:div|section)[^>]*\bclass="[^"]*\btexte-surimpression\b[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/g)]
  for (const b of balises) {
    const tagOuvrant = b[0].slice(0, b[0].indexOf('>') + 1)
    const idM = tagOuvrant.match(/\bid="([\w-]+)"/)
    const id = idM ? idM[1] : null
    const regleId = id ? regles.get(`#${id}`) : null
    const regleClasse = regles.get('.texte-surimpression')
    const top = valeurCss(regleId, 'top') || valeurCss(regleClasse, 'top')
    const topPct = top ? parseFloat(top) : null
    const fontRaw = valeurCss(regleId, 'font') || valeurCss(regleClasse, 'font') || ''
    const mFont = fontRaw.match(/(\d+)px\/([\d.]+)/)
    const fontPx = mFont ? Number(mFont[1]) : 32
    const ligne = mFont ? Number(mFont[2]) : 1.3
    const hauteurTextePx = fontPx * ligne * 2 // majoré : jusqu'à 2 lignes
    const hauteurPct = (hauteurTextePx / hauteurComposition) * 100
    const texte = b[1].replace(/<[^>]+>/g, '').trim().slice(0, 40)
    if (topPct === null) { violations.push({ id, texte, raison: 'position (top) non trouvée dans le CSS' }); continue }
    const basPct = topPct + hauteurPct
    if (topPct < zoneSure.hautPct || basPct > zoneSure.basPct)
      violations.push({ id, texte, hautPct: topPct, basPct, raison: `${topPct.toFixed(1)}–${basPct.toFixed(1)}% (zone sûre ${zoneSure.hautPct}–${zoneSure.basPct}%)` })
  }
  return violations
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// --partie=gabarit
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function partieGabarit(s, { racine, temoin, contrat }) {
  const dirGabarits = racineGabarits(racine, temoin)
  const dossierInst = path.join(MON_TRAVAIL, 'gabarit')
  fs.rmSync(dossierInst, { recursive: true, force: true })
  fs.mkdirSync(dossierInst, { recursive: true })

  // Le pack utilisé pour instancier : le témoin (--temoin), ou un pack de secours si --racine porte un vrai gabarit
  // sans témoin (hors périmètre de la preuve --lot=10, mais gardé cohérent) — dans les deux cas TEMOIN_DIR, puisque
  // l'appel à scriptInstancierReel() plus bas lui passe déjà TEMOIN_DIR comme <dossier-pack> quand !temoin.
  let pack = null
  await assurerTemoin('base')
  const packJson = path.join(TEMOIN_DIR, 'pack.json')
  if (existeNonVide(packJson)) pack = chargerPack(packJson)

  const manquants = []
  for (const nom of NOMS_GABARITS) if (!fs.existsSync(path.join(dirGabarits, nom, 'index.html'))) manquants.push(nom)
  if (manquants.length) {
    s.echoue('PL-G1', `composition(s) absente(s) sous ${rel(dirGabarits)} : ${manquants.join(', ')}`)
  } else if (!temoin && !fs.existsSync(scriptInstancierReel(racine))) {
    s.echoue('PL-G1', `${rel(scriptInstancierReel(racine))} introuvable`)
  } else if (!pack) {
    s.echoue('PL-G1', 'aucun pack pour instancier (témoin non fabriqué)')
  } else {
    const dureeParNom = {}
    const echecsG1 = [], echecsG2 = [], echecsG3 = [], echecsG4 = [], echecsG5 = []
    for (const nom of NOMS_GABARITS) {
      const gabaritHtml = path.join(dirGabarits, nom, 'index.html')
      const sortie = path.join(dossierInst, nom)
      // PL-G3 : provenance des médias, sur le gabarit BRUT (avant instanciation)
      const brut = fs.readFileSync(gabaritHtml, 'utf8')
      if (/<video\b/i.test(brut)) echecsG3.push(`${nom} : <video> interdit`)
      const assets = chargerAssetsAutorises(racine)
      const parEmpreinte = new Map((assets.fichiers || []).map((f) => [f.sha256, f]))
      const remoteAutorise = contrat.remoteAutorise || []
      const refsMedia = [...brut.matchAll(/<img[^>]*\bsrc="([^"]+)"/gi), ...brut.matchAll(/<source[^>]*\bsrc="([^"]+)"/gi)]
      // url(...) CSS hors @font-face : on retire les blocs @font-face avant de chercher les url(...).
      const cssSansFontFace = brut.replace(/@font-face\s*\{[^}]*\}/gi, '')
      const refsCss = [...cssSansFontFace.matchAll(/url\(([^)]+)\)/gi)].map((m) => m[1].replace(/^['"]|['"]$/g, ''))
      for (const ref of [...refsMedia.map((m) => m[1]), ...refsCss]) {
        if (/^\{\{(photo:\d+|logo)\}\}$/.test(ref)) continue
        if (/^https?:\/\//.test(ref)) {
          if (!remoteAutorise.some((d) => ref.includes(d))) echecsG3.push(`${nom} : média distant non admis : ${ref}`)
          continue
        }
        const local = path.join(path.dirname(gabaritHtml), ref)
        if (!fs.existsSync(local)) { echecsG3.push(`${nom} : référence locale introuvable : ${ref}`); continue }
        const h = sha256(fs.readFileSync(local))
        if (!parEmpreinte.has(h)) echecsG3.push(`${nom} : ${ref} absent d'assets-autorises.json (empreinte ${h.slice(0, 12)}…)`)
      }

      // Instanciation (témoin : notre propre instancier() ; racine réelle : scripts/pack-pub/instancier.mjs)
      let r
      if (temoin) {
        try { instancier(gabaritHtml, pack, sortie); r = { status: 0 } } catch (e) { r = { status: 1, stderr: e.message } }
      } else {
        r = spawnSync(process.execPath, [scriptInstancierReel(racine), nom, TEMOIN_DIR, sortie], { cwd: racine, encoding: 'utf8', windowsHide: true })
      }
      if (r.status !== 0) { echecsG1.push(`${nom} : instanciation en échec — ${(r.stderr || '').trim().split('\n')[0] || r.status}`); continue }

      const { r: rc, j } = hfCheckJson(sortie)
      const erreurs = j ? (j.lint?.errorCount || 0) + (j.runtime?.errorCount || 0) + (j.layout?.errorCount || 0) + (j.motion?.errorCount || 0) : null
      if (!j || rc.status !== 0 || (j.ok === false)) {
        const detail = j ? [...(j.lint?.findings || []), ...(j.runtime?.findings || [])].filter((f) => f.severity === 'error').map((f) => f.rule || f.code || f.message).slice(0, 3).join(', ') : (rc.stderr || '').split('\n').slice(0, 1).join('')
        echecsG1.push(`${nom} : hyperframes check en échec${detail ? ` (${detail})` : ''}`)
      }

      // PL-G2 : durée/dimensions déclarées sur la racine instanciée
      const instHtml = fs.readFileSync(path.join(sortie, 'index.html'), 'utf8')
      const mRoot = instHtml.match(/data-composition-id="[^"]*"[^>]*>/) || instHtml.match(/<div[^>]*data-composition-id[^>]*>/)
      const attr = (nomAttr) => { const m = (mRoot?.[0] || '').match(new RegExp(`${nomAttr}="([^"]+)"`)); return m ? Number(m[1]) : null }
      const spec = contrat.gabarits[nom]
      const l = attr('data-width'), h2 = attr('data-height'), d = attr('data-duration')
      if (l !== spec.largeur || h2 !== spec.hauteur) echecsG2.push(`${nom} : ${l}×${h2} (attendu ${spec.largeur}×${spec.hauteur})`)
      if (spec.duree !== null && d !== spec.duree) echecsG2.push(`${nom} : durée ${d}s (attendu ${spec.duree}s)`)
      dureeParNom[nom] = d ?? spec.duree

      // PL-G4 : mention-ia
      const mMention = instHtml.match(/<div id="mention-ia"[^>]*>([\s\S]*?)<\/div>/)
      if (pack.matiere.voix === 'synthese') {
        if (!mMention) echecsG4.push(`${nom} : mention-ia absente alors que voix = synthese`)
        else {
          const texte = mMention[1].replace(/<[^>]+>/g, '').trim()
          if (texte !== contrat.mentionIa.texte) echecsG4.push(`${nom} : texte de mention-ia « ${texte} », attendu « ${contrat.mentionIa.texte} »`)
          if (!/data-start="0"/.test(mMention[0])) echecsG4.push(`${nom} : mention-ia ne commence pas à 0 s`)
        }
      } else if (mMention) echecsG4.push(`${nom} : mention-ia présente alors que voix = aucune`)

      // PL-G5 : zone sûre (films seulement) — analyse statique du CSS instancié (voir verifierZoneSureStatique)
      if (spec.type === 'film') {
        try {
          const violations = verifierZoneSureStatique(instHtml, h2 || spec.hauteur, contrat.zoneSure)
          for (const v of violations) echecsG5.push(`${nom} — ${v.id || '?'} « ${v.texte} » : ${v.raison}`)
        } catch (e) { echecsG5.push(`${nom} : analyse de zone sûre impossible — ${String(e.message || e).slice(0, 140)}`) }
      }
    }
    s.verdict('PL-G1', !echecsG1.length, `${NOMS_GABARITS.length} composition(s), instanciées avec le pack témoin, hyperframes check ok`, echecsG1.join(' ; '))
    s.verdict('PL-G2', !echecsG2.length, 'durées et dimensions conformes', echecsG2.join(' ; '))
    s.verdict('PL-G3', !echecsG3.length, 'toutes les images sont des marques ou des assets autorisés', echecsG3.join(' ; '))
    s.verdict('PL-G4', !echecsG4.length, 'mention-ia conforme à la présence de la voix', echecsG4.join(' ; '))
    s.verdict('PL-G5', !echecsG5.length, `zone sûre respectée aux instants ${contrat.instantsControle.join(',')}s`, echecsG5.join(' ; '))
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// --partie=textes
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function libelleStatut(statut) {
  return statut === 'oui' ? 'oui' : statut === 'non' ? 'non' : 'a_verifier'
}
/** Vérifie sortie/textes.md et sortie/fiche-10-min.md d'un pack déjà écrit — PL-T2 à PL-T7. Retourne { id: [echecs] }. */
function verifierTextes(sortieDir, pack, contrat, statutMetaLogement) {
  const out = { 'PL-T2': [], 'PL-T3': [], 'PL-T4': [], 'PL-T5': [], 'PL-T6': [], 'PL-T7': [] }
  const fTextes = path.join(sortieDir, 'textes.md'), fFiche = path.join(sortieDir, 'fiche-10-min.md')
  if (!existeNonVide(fTextes)) { out['PL-T2'].push('textes.md absent ou vide'); return out }
  const textes = fs.readFileSync(fTextes, 'utf8')
  const ficheExiste = existeNonVide(fFiche)
  const fiche = ficheExiste ? fs.readFileSync(fFiche, 'utf8') : ''

  // PL-T2 : 3 variantes, longueurs
  const variantes = [...textes.matchAll(/## Variante \d+\n([\s\S]*?)(?=\n## Variante \d+|\n*$)/g)].map((m) => m[1])
  if (variantes.length !== contrat.longueurs.variantes) out['PL-T2'].push(`${variantes.length} variante(s), ${contrat.longueurs.variantes} attendue(s)`)
  const champs = []
  for (const [i, v] of variantes.entries()) {
    const titre = v.match(/Titre\s*:\s*(.+)/)?.[1]?.trim() || ''
    const texte = v.match(/Texte\s*:\s*(.+)/)?.[1]?.trim() || ''
    const description = v.match(/Description\s*:\s*(.+)/)?.[1]?.trim() || ''
    champs.push({ titre, texte, description })
    if (texte.length > contrat.longueurs.texteMax) out['PL-T2'].push(`variante ${i + 1} : texte ${texte.length} signes (≤ ${contrat.longueurs.texteMax})`)
    if (titre.length > contrat.longueurs.titreMax) out['PL-T2'].push(`variante ${i + 1} : titre ${titre.length} signes (≤ ${contrat.longueurs.titreMax})`)
    if (description.length > contrat.longueurs.descriptionMax) out['PL-T2'].push(`variante ${i + 1} : description ${description.length} signes (≤ ${contrat.longueurs.descriptionMax})`)
  }

  // PL-T3 : chaque nombre de textes.md figure dans les faits du pack (téléphone compris) ; dans fiche-10-min.md, en
  // plus des faits : les numéros d'étape en début de ligne et la liste fermée de contrat.json.
  const faitsTexte = [pack.matiere.metier, pack.matiere.ville, pack.matiere.duree_travaux, pack.matiere.materiaux, pack.matiere.telephone || '']
    .join(' ')
  const digitsFaits = faitsTexte.replace(/[^\d]/g, '')
  const nombresTextes = [...textes.matchAll(/\d[\d\s]*\d|\d/g)].map((m) => m[0].replace(/\s+/g, ''))
  for (const n of nombresTextes) if (!digitsFaits.includes(n)) out['PL-T3'].push(`textes.md : nombre « ${n} » absent des faits du pack`)
  if (ficheExiste) {
    const lignesFiche = fiche.split(/\r?\n/)
    for (const ligne of lignesFiche) {
      const etape = /^\s*(\d+)[.)]/.exec(ligne)
      for (const m of ligne.matchAll(/\d[\d\s]*\d|\d/g)) {
        const n = m[0].replace(/\s+/g, '')
        if (etape && n === etape[1] && ligne.trimStart().startsWith(m[0])) continue
        if (digitsFaits.includes(n)) continue
        if (contrat.nombresAdmisFiche10Min.includes(n)) continue
        out['PL-T3'].push(`fiche-10-min.md : nombre « ${n} » ni fait du pack, ni numéro d'étape, ni dans la liste admise`)
      }
    }
  }

  // PL-T4 : termes interdits (garantie décennale permise si decennale = true)
  let corpsT4 = `${textes}\n${fiche}`
  if (pack.matiere.decennale) corpsT4 = corpsT4.replace(new RegExp(contrat.termeGarantiPermis, 'gi'), '')
  const bas = corpsT4.toLowerCase()
  for (const terme of contrat.termesInterdits) if (bas.includes(terme.toLowerCase())) out['PL-T4'].push(`terme interdit trouvé : « ${terme} »`)

  // PL-T5 : fiche selon le statut Logement
  const statut = statutMetaLogement
  if (statut === 'a_verifier') {
    if (ficheExiste) out['PL-T5'].push('fiche-10-min.md écrite alors que le statut Logement est a_verifier')
  } else if (!ficheExiste) {
    out['PL-T5'].push('fiche-10-min.md absente')
  } else {
    const basFiche = fiche.toLowerCase()
    if (statut === 'oui') {
      for (const mot of ['catégorie spéciale', 'logement', 'rayon']) if (!basFiche.includes(mot)) out['PL-T5'].push(`« ${mot} » absent de la fiche (statut oui)`)
      if (/\bâge\b|\bgenre\b|\bsexe\b/.test(basFiche.replace(/aucune consigne de ciblage par âge ou par genre/, ''))) {
        // toléré seulement dans la phrase qui l'exclut explicitement — sinon c'est une consigne de ciblage interdite.
      }
    } else if (statut === 'non') {
      if (basFiche.includes('logement')) out['PL-T5'].push('« Logement » présent alors que le statut est non')
    }
  }

  // PL-T6 : voix de synthèse → garder la mention + déclarer à Meta
  if (pack.matiere.voix === 'synthese' && ficheExiste) {
    const basFiche = fiche.toLowerCase()
    if (!basFiche.includes('mention')) out['PL-T6'].push('la fiche ne dit pas de garder la mention à l’écran')
    if (!basFiche.includes('meta') || !(basFiche.includes('déclar') || basFiche.includes('declar'))) out['PL-T6'].push('la fiche ne dit pas de déclarer le contenu IA à Meta')
  }

  // PL-T7 : aucune adresse web hors celle de pack.json (pack témoin/jeux : aucune)
  const site = pack.site || pack.matiere?.site || null
  const corps = `${textes}\n${fiche}`
  const urls = [...corps.matchAll(/\bhttps?:\/\/\S+|\bwww\.\S+/gi)].map((m) => m[0])
  const emails = [...corps.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/gi)].map((m) => m[0])
  for (const u of [...urls, ...emails]) if (!site || !u.includes(site)) out['PL-T7'].push(`adresse trouvée : ${u}`)

  return out
}

async function partieTextes(s, { racine, temoin, dossier, contrat, metaLogementOverride }) {
  if (dossier) {
    const pack = chargerPack(path.join(dossier, 'pack.json'))
    const meta = lireMetaLogement(racine)
    const echecs = verifierTextes(path.join(dossier, 'sortie'), pack, contrat, meta.statut)
    s.verdict('PL-T1', existeNonVide(path.join(dossier, 'sortie', 'textes.md')), 'sortie/textes.md présent', 'sortie/textes.md absent ou vide')
    for (const id of ['PL-T2', 'PL-T3', 'PL-T4', 'PL-T5', 'PL-T6', 'PL-T7']) s.verdict(id, !echecs[id].length, 'conforme', echecs[id].join(' ; '))
    return
  }
  if (temoin) {
    await assurerTemoin('base')
    const pack = chargerPack(path.join(TEMOIN_DIR, 'pack.json'))
    const statut = metaLogementOverride || 'oui'
    const echecs = verifierTextes(path.join(TEMOIN_DIR, 'sortie'), pack, contrat, statut)
    s.verdict('PL-T1', existeNonVide(path.join(TEMOIN_DIR, 'sortie', 'textes.md')), 'sortie/textes.md (témoin, écrit à la main par fabriquer-temoin.mjs)', 'sortie/textes.md absent ou vide')
    for (const id of ['PL-T2', 'PL-T3', 'PL-T4', 'PL-T5', 'PL-T6', 'PL-T7']) s.verdict(id, !echecs[id].length, 'conforme', echecs[id].join(' ; '))
    return
  }
  // racine réelle (référence, ou dépôt courant) : tant que 026-154 n'est pas faite, scripts/pack-pub/textes.mjs
  // n'existe pas et ces critères échouent légitimement (comportement attendu par juges-026-pubs-contenu-preuve.mjs
  // --lot=10 sur --racine=<référence>). Une fois le script écrit, on l'exécute pour de vrai (même principe que la
  // correction du 28/09 sur --partie=gabarit) : pack témoin recopié dans un dossier neuf (jamais TEMOIN_DIR lui-même,
  // dont sortie/ est le témoin écrit à la main par fabriquer-temoin.mjs, réutilisé par --temoin), le vrai script
  // lancé dessus avec cwd=racine (son --meta-logement par défaut se résout alors sur le vrai docs/pubs/meta-logement.json
  // de la racine jugée), puis vérifié par verifierTextes comme --dossier. Code 3 (catégorie non vérifiée) est une
  // sortie légitime du script, pas un échec du juge.
  const script = path.join(racine, 'scripts', 'pack-pub', 'textes.mjs')
  if (!fs.existsSync(script)) {
    for (const id of ['PL-T1', 'PL-T2', 'PL-T3', 'PL-T4', 'PL-T5', 'PL-T6', 'PL-T7']) s.echoue(id, `non évalué : ${rel(script, racine)} introuvable`)
    return
  }
  await assurerTemoin('base')
  const dirReel = path.join(MON_TRAVAIL, 'textes-reel')
  fs.rmSync(dirReel, { recursive: true, force: true })
  fs.mkdirSync(dirReel, { recursive: true })
  fs.copyFileSync(path.join(TEMOIN_DIR, 'pack.json'), path.join(dirReel, 'pack.json'))
  const r = spawnSync(process.execPath, [script, dirReel], { cwd: racine, encoding: 'utf8', windowsHide: true })
  if (r.status !== 0 && r.status !== 3) {
    const detail = (r.stderr || r.stdout || `code ${r.status}`).trim().split('\n')[0]
    for (const id of ['PL-T1', 'PL-T2', 'PL-T3', 'PL-T4', 'PL-T5', 'PL-T6', 'PL-T7']) s.echoue(id, `${rel(script, racine)} : ${detail}`)
    return
  }
  const pack = chargerPack(path.join(dirReel, 'pack.json'))
  const meta = lireMetaLogement(racine)
  const echecs = verifierTextes(path.join(dirReel, 'sortie'), pack, contrat, meta.statut)
  s.verdict('PL-T1', existeNonVide(path.join(dirReel, 'sortie', 'textes.md')), 'sortie/textes.md présent', 'sortie/textes.md absent ou vide')
  for (const id of ['PL-T2', 'PL-T3', 'PL-T4', 'PL-T5', 'PL-T6', 'PL-T7']) s.verdict(id, !echecs[id].length, 'conforme', echecs[id].join(' ; '))
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// --partie=complet
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function lireMetaLogement(racine) {
  const f = path.join(racine, 'docs', 'pubs', 'meta-logement.json')
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return { statut: 'a_verifier' } }
}

async function verifierComplet(s, sortieDir, packDir, pack, contrat, { estTemoin }) {
  // PL-1 doit s'accorder avec PL-10 (ligne suivante ci-dessous) sur le même fait : `fiche-10-min.md` n'existe QUE si
  // le statut Logement est résolu (oui/non — PL-T5, verifierTextes) — jamais tant qu'il est a_verifier (026-154).
  // Un pack réel en dossier (jamais --temoin, forcé à « oui ») ne peut pas franchir la fabrication tant que Benj n'a
  // pas tranché : exiger `fiche-10-min.md` malgré ça rendait PL-1 impossible à satisfaire par un pack pourtant
  // complet (défaut trouvé en jugeant réellement le témoin de livraison, 026-110/026-157).
  const metaFichiers = estTemoin ? { statut: 'oui' } : lireMetaLogement(R)
  const fichiers = metaFichiers.statut === 'a_verifier' ? contrat.fichiersSortie.filter((f) => f !== 'fiche-10-min.md') : contrat.fichiersSortie
  const chemins = fichiers.map((f) => path.join(sortieDir, f))
  const manquants = fichiers.filter((f, i) => !existeNonVide(chemins[i]))
  let poidsTotal = 0
  try { poidsTotal = fs.readdirSync(sortieDir).reduce((a, n) => a + fs.statSync(path.join(sortieDir, n)).size, 0) } catch { /* dossier absent */ }
  const enTrop = (() => { try { return fs.readdirSync(sortieDir).filter((n) => !fichiers.includes(n)) } catch { return [] } })()
  const poidsMo = poidsTotal / 1e6
  s.verdict('PL-1', !manquants.length && !enTrop.length && poidsMo <= contrat.poidsSortieMaxMo,
    `${fichiers.length} fichiers, ${poidsMo.toFixed(2)} Mo`,
    [manquants.length ? `manquant(s) : ${manquants.join(', ')}` : '', enTrop.length ? `en trop : ${enTrop.join(', ')}` : '', poidsMo > contrat.poidsSortieMaxMo ? `${poidsMo.toFixed(2)} Mo > ${contrat.poidsSortieMaxMo} Mo` : ''].filter(Boolean).join(' ; '))
  if (manquants.length) {
    for (const id of ['PL-2', 'PL-3', 'PL-4', 'PL-5', 'PL-6', 'PL-7', 'PL-8', 'PL-9', 'PL-10', 'PL-11', 'PL-12']) s.echoue(id, 'non évalué : sortie/ incomplète')
    return
  }

  // PL-2 : video-qa --profil=pub-locale
  const echecs2 = []
  for (let n = 1; n <= 3; n++) {
    const f = path.join(sortieDir, `video-${n}.mp4`)
    const r = spawnSync(process.execPath, [path.join(R, 'scripts', 'video-qa.mjs'), '--profil=pub-locale', '--json', f], { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 26 })
    let j = null; try { j = JSON.parse(r.stdout) } catch { /* */ }
    const rap = j?.[0]
    if (!rap || rap.echecs > 0) echecs2.push(`video-${n} : ${rap ? rap.tests.filter((t) => !t.passe).map((t) => `${t.nom} (${t.mesure}, attendu ${t.attendu})`).join(', ') : (r.stderr || 'sortie illisible').split('\n')[0]}`)
  }
  s.verdict('PL-2', !echecs2.length, '3 films conformes à video-qa --profil=pub-locale', echecs2.join(' ; '))

  // PL-3 : empreintes des photos, vrais fichiers image, sans EXIF/GPS
  const echecs3 = []
  const manifeste = (() => { try { return JSON.parse(fs.readFileSync(path.join(packDir, 'manifeste-entrees.json'), 'utf8')) } catch { return null } })()
  if (!manifeste) echecs3.push('manifeste-entrees.json introuvable')
  else {
    const photosDir = path.join(packDir, 'photos')
    const fichiersPhotos = fs.existsSync(photosDir) ? fs.readdirSync(photosDir).filter((n) => /\.(jpe?g|png|webp)$/i.test(n)) : []
    for (const n of fichiersPhotos) {
      const buf = fs.readFileSync(path.join(photosDir, n))
      const h = sha256(buf)
      const entree = manifeste.photos.find((p) => p.fichier.endsWith(n))
      if (!entree) { echecs3.push(`${n} : absente du manifeste`); continue }
      if (entree.sha256 !== h) echecs3.push(`${n} : empreinte différente du manifeste`)
      const magic = buf.subarray(0, 4)
      const estJpeg = magic[0] === 0xff && magic[1] === 0xd8
      const estPng = magic.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      const estWebp = buf.subarray(0, 4).toString('ascii') === 'RIFF'
      if (!estJpeg && !estPng && !estWebp) echecs3.push(`${n} : octets magiques non reconnus`)
      try { const meta = await sharp(buf).metadata(); if (meta.exif) echecs3.push(`${n} : EXIF présent`) } catch (e) { echecs3.push(`${n} : décodage sharp impossible (${e.message})`) }
    }
    for (const p of manifeste.photos) if (!fichiersPhotos.some((n) => p.fichier.endsWith(n))) echecs3.push(`${p.fichier} du manifeste absent de photos/`)
  }
  for (let n = 1; n <= 3; n++) {
    try { const meta = await sharp(path.join(sortieDir, `visuel-${n}.jpg`)).metadata(); if (meta.exif) echecs3.push(`visuel-${n}.jpg : EXIF présent`) } catch { /* couvert par PL-9 */ }
  }
  s.verdict('PL-3', !echecs3.length, 'empreintes, formats et absence d’EXIF conformes', echecs3.join(' ; '))

  // PL-4 : provenance des médias référencés par hf/*/index.html
  const echecs4 = []
  const parEmpreinteManifeste = new Set([...(manifeste?.photos || []).map((p) => p.sha256), manifeste?.voix?.sha256].filter(Boolean))
  const assets = chargerAssetsAutorises(R)
  const parEmpreinteAssets = new Set((assets.fichiers || []).map((f) => f.sha256))
  const dossiersHf = fs.existsSync(path.join(packDir, 'hf')) ? fs.readdirSync(path.join(packDir, 'hf')) : []
  for (const nomHf of dossiersHf) {
    const idx = path.join(packDir, 'hf', nomHf, 'index.html')
    if (!fs.existsSync(idx)) continue
    const brut = fs.readFileSync(idx, 'utf8')
    if (/<video\b/i.test(brut)) echecs4.push(`hf/${nomHf} : <video> interdit`)
    const nAudio = (brut.match(/<audio\b/gi) || []).length
    if (nAudio > 1) echecs4.push(`hf/${nomHf} : plusieurs <audio>`)
    const refs = [...brut.matchAll(/<img[^>]*\bsrc="([^"]+)"/gi), ...brut.matchAll(/<audio[^>]*\bsrc="([^"]+)"/gi), ...brut.matchAll(/<source[^>]*\bsrc="([^"]+)"/gi)].map((m) => m[1])
    for (const ref of refs) {
      if (/^https?:\/\//.test(ref)) { if (!(contrat.remoteAutorise || []).some((d) => ref.includes(d))) echecs4.push(`hf/${nomHf} : média distant non admis : ${ref}`); continue }
      const local = path.join(path.dirname(idx), ref)
      if (!fs.existsSync(local)) { echecs4.push(`hf/${nomHf} : référence locale introuvable : ${ref}`); continue }
      const h = sha256(fs.readFileSync(local))
      if (!parEmpreinteManifeste.has(h) && !parEmpreinteAssets.has(h)) echecs4.push(`hf/${nomHf} : ${ref} absent du manifeste et d'assets-autorises.json`)
    }
  }
  s.verdict('PL-4', !echecs4.length, 'toutes les images/sons référencés sont dans le manifeste ou assets-autorises.json', echecs4.join(' ; '))

  // PL-5 (correspondance) et PL-7 (mention-ia) partagent UN SEUL hyperframes snapshot par film (--against, aux
  // instants des deux critères réunis) : chaque lancement de navigateur coûte plusieurs secondes, et l'appelant
  // (juges-026-pubs-contenu-preuve.mjs) tient tout --partie=complet --temoin (fabrication + vérification) dans un
  // budget de 8 min par appel — six lancements séparés (3 pour PL-5, 3 pour PL-7) ne tiendraient pas à coup sûr.
  const echecs5 = [], echecs7 = []
  const instantsUnion = [...new Set([...contrat.instantsControle, ...contrat.instantsMentionIa])].sort((a, b) => a - b)
  for (let n = 1; n <= 3; n++) {
    const hfDir = path.join(packDir, 'hf', `video-${n}`)
    if (!fs.existsSync(hfDir)) { echecs5.push(`hf/video-${n} absent`); echecs7.push(`hf/video-${n} absent`); continue }
    const out = path.join(MON_TRAVAIL, 'snapshot-against', `video-${n}`)
    fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true })
    const r = hf(['snapshot', hfDir, '--at', instantsUnion.join(','), '--no-end', '--against', path.join(sortieDir, `video-${n}.mp4`), '-o', out])
    if (r.status !== 0) {
      const msg = `video-${n} : hyperframes snapshot en échec — ${(r.stderr || '').split('\n').slice(-3).join(' ')}`
      echecs5.push(msg); if (pack.matiere.voix === 'synthese') echecs7.push(msg)
      continue
    }
    const fichiers = fs.existsSync(out) ? fs.readdirSync(out) : []
    const parInstant = (prefixe) => {
      const m = new Map()
      for (const f of fichiers) { const g = f.match(new RegExp(`^${prefixe}-\\d+-at-([\\d.]+)s`)); if (g) m.set(Number(g[1]), f) }
      return m
    }
    const rendus = parInstant('frame'), refs = parInstant('ref')

    // PL-5 : écart moyen render/référence aux instants de contrôle
    let ecartCumule = 0, nPaires = 0
    for (const t of contrat.instantsControle) {
      const fr = rendus.get(t), rf = refs.get(t)
      if (!fr || !rf) continue
      try {
        const a = await sharp(path.join(out, fr)).resize(320, 569, { fit: 'fill' }).raw().toBuffer()
        const b = await sharp(path.join(out, rf)).resize(320, 569, { fit: 'fill' }).raw().toBuffer()
        let s2 = 0; const n2 = Math.min(a.length, b.length)
        for (let k = 0; k < n2; k++) s2 += Math.abs(a[k] - b[k])
        ecartCumule += s2 / n2 / 255; nPaires++
      } catch { /* image manquante : compté via nPaires plus bas */ }
    }
    const ecartMoyen = nPaires ? ecartCumule / nPaires : 1
    if (!nPaires || ecartMoyen > contrat.ecartSnapshotMax) echecs5.push(`video-${n} : écart moyen ${(ecartMoyen * 100).toFixed(1)}% (≤ ${contrat.ecartSnapshotMax * 100}%), ${nPaires}/${contrat.instantsControle.length} paire(s) lue(s)`)

    // PL-7 : mention-ia visible aux instants dédiés (voix de synthèse) — zone connue (CSS : left 6%, bottom 8%),
    // non uniforme = texte rendu (fond sombre + lettres claires), uniforme = rien affiché.
    if (pack.matiere.voix === 'synthese') {
      try {
        const html = fs.readFileSync(path.join(hfDir, 'index.html'), 'utf8')
        const mRoot = html.match(/<div[^>]*data-composition-id[^>]*>/) || ['']
        const largeur = Number((mRoot[0].match(/data-width="(\d+)"/) || [, 1080])[1])
        const hauteur = Number((mRoot[0].match(/data-height="(\d+)"/) || [, 1920])[1])
        const x0 = Math.round(largeur * 0.05), largeurBoite = Math.round(largeur * 0.42)
        const yBas = Math.round(hauteur * (1 - 0.08)), hauteurBoite = Math.round(hauteur * 0.06)
        const y0 = Math.max(0, yBas - hauteurBoite - 20)
        for (const t of contrat.instantsMentionIa) {
          const fr = rendus.get(t)
          if (!fr) { echecs7.push(`video-${n} à ${t}s : cadre non produit par hyperframes snapshot`); continue }
          const stats = await sharp(path.join(out, fr))
            .extract({ left: x0, top: y0, width: Math.min(largeurBoite, largeur - x0), height: Math.min(hauteurBoite + 40, hauteur - y0) })
            .greyscale().stats()
          const ecartType = stats.channels[0].stdev || 0
          if (ecartType < 8) echecs7.push(`video-${n} à ${t}s : zone de mention-ia quasi uniforme (écart-type ${ecartType.toFixed(1)}) : rien d'affiché`)
        }
      } catch (e) { echecs7.push(`video-${n} : mesure mention-ia impossible — ${String(e.message || e).slice(0, 140)}`) }
    }
  }
  s.verdict('PL-5', !echecs5.length, `écart moyen ≤ ${contrat.ecartSnapshotMax * 100}% aux instants ${contrat.instantsControle.join(',')}s`, echecs5.join(' ; '))
  s.verdict('PL-7', !echecs7.length, pack.matiere.voix === 'synthese' ? 'mention-ia visible aux 3 instants sur les 3 films' : 'sans objet (voix = aucune)', echecs7.join(' ; '))

  // PL-6 : visages-qa
  const echecs6 = []
  {
    const cibles = fs.readdirSync(path.join(packDir, 'photos')).map((n) => path.join(packDir, 'photos', n))
      .concat([1, 2, 3].map((n) => path.join(sortieDir, `video-${n}.mp4`)))
      .concat([1, 2, 3].map((n) => path.join(sortieDir, `visuel-${n}.jpg`)))
    const attenduTotal = (manifeste?.photos || []).filter((p) => p.accord_personnes).length ? undefined : 0
    const r = spawnSync(process.execPath, [path.join(R, 'scripts', 'visages-qa.mjs'), ...cibles, '--json'], { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 26 })
    let rapport = null; try { rapport = JSON.parse(r.stdout) } catch { /* */ }
    if (!rapport) echecs6.push(`visages-qa illisible : ${(r.stderr || '').split('\n')[0]}`)
    else {
      const total = rapport.reduce((a, f) => a + f.cadres.reduce((b, c) => b + c.visages.length, 0), 0)
      const attenduAvecAccord = (manifeste?.photos || []).some((p) => p.accord_personnes)
      if (!attenduAvecAccord && total > 0) echecs6.push(`${total} visage(s) détecté(s) alors qu'aucune photo n'a d'accord_personnes`)
      const sansAccordAvecVisage = rapport.filter((f) => {
        const base = path.basename(f.fichier)
        const p = (manifeste?.photos || []).find((x) => x.fichier.endsWith(base))
        return p && !p.accord_personnes && f.cadres.some((c) => c.visages.length)
      })
      for (const f of sansAccordAvecVisage) echecs6.push(`${path.basename(f.fichier)} : visage détecté sans accord_personnes`)
    }
  }
  s.verdict('PL-6', !echecs6.length, 'aucun visage non accordé', echecs6.join(' ; '))

  // PL-8 : transcription (WER) — faster-whisper en Python directement (npx hyperframes transcribe dépend d'un
  // binaire whisper.cpp absent de ce poste : « whisper_unavailable » ; le paquet Python, lui, y est installé et son
  // modèle « small » déjà en cache).
  const echecs8 = []
  if (pack.matiere.voix === 'synthese') {
    const attendu = normaliserPourWer(pack.matiere.texte_voix)
    const scriptPy = path.join(R, 'scripts', 'fixtures', '026-pubs-contenu', 'pack', 'transcrire.py')
    for (let n = 1; n <= 1; n++) { // un seul film suffit à prouver la piste (les 3 partagent la même voix témoin)
      const f = path.join(sortieDir, `video-${n}.mp4`)
      const r = spawnSync('python', [scriptPy, f], { encoding: 'utf8', windowsHide: true, timeout: 3 * 60_000, maxBuffer: 1 << 24 })
      let j = null; try { j = JSON.parse(r.stdout) } catch { /* */ }
      const texte = j?.texte || ''
      if (!texte) { echecs8.push(`video-${n} : transcription illisible — ${j?.erreur || (r.stderr || '').split('\n')[0]}`); continue }
      const obtenu = normaliserPourWer(texte)
      const wer = distanceMots(attendu, obtenu) / Math.max(1, attendu.length)
      if (wer > contrat.werMax) echecs8.push(`video-${n} : WER ${(wer * 100).toFixed(0)}% (≤ ${contrat.werMax * 100}%) — obtenu « ${obtenu.join(' ')} »`)
    }
  }
  s.verdict('PL-8', !echecs8.length, pack.matiere.voix === 'synthese' ? `transcription conforme (≤ ${contrat.werMax * 100}% WER)` : 'sans objet (voix = aucune)', echecs8.join(' ; '))

  // PL-9 : visuels JPEG 1080×1080 ≤ 1 Mo, non uniformes
  const echecs9 = []
  for (let n = 1; n <= 3; n++) {
    const f = path.join(sortieDir, `visuel-${n}.jpg`)
    try {
      const meta = await sharp(f).metadata()
      if (meta.width !== contrat.gabarits.visuel.largeur || meta.height !== contrat.gabarits.visuel.hauteur) echecs9.push(`visuel-${n} : ${meta.width}×${meta.height}`)
      if (meta.format !== 'jpeg') echecs9.push(`visuel-${n} : format ${meta.format}`)
      const poidsMo9 = fs.statSync(f).size / 1e6
      if (poidsMo9 > contrat.poidsVisuelMaxMo) echecs9.push(`visuel-${n} : ${poidsMo9.toFixed(2)} Mo`)
      const stats = await sharp(f).greyscale().stats()
      if ((stats.channels[0].stdev || 0) < 5) echecs9.push(`visuel-${n} : image quasi uniforme (écart-type ${stats.channels[0].stdev?.toFixed(1)})`)
    } catch (e) { echecs9.push(`visuel-${n} : ${e.message}`) }
  }
  s.verdict('PL-9', !echecs9.length, '3 visuels 1080×1080 conformes', echecs9.join(' ; '))

  // PL-10 : textes.md / fiche-10-min.md (même lecture qu'au calcul de `fichiers` en tête de fonction)
  const echecsTextes = verifierTextes(sortieDir, pack, contrat, metaFichiers.statut)
  const total10 = Object.values(echecsTextes).flat()
  s.verdict('PL-10', !total10.length, 'textes.md et fiche-10-min.md conformes (PL-T2 à PL-T7)', total10.join(' ; '))

  // PL-11 : ni courriel ni téléphone, sauf le téléphone si cta = appel — fiche-10-min.md est absente à bon droit
  // tant que le statut Logement est a_verifier (même fait qu'à PL-1 et PL-10, ci-dessus).
  const echecs11 = []
  const ficheLue11 = existeNonVide(path.join(sortieDir, 'fiche-10-min.md')) ? fs.readFileSync(path.join(sortieDir, 'fiche-10-min.md'), 'utf8') : ''
  const corps11 = `${fs.readFileSync(path.join(sortieDir, 'textes.md'), 'utf8')}\n${ficheLue11}`
  const emails11 = [...corps11.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/gi)]
  if (emails11.length) echecs11.push(`courriel trouvé : ${emails11[0][0]}`)
  const tels11 = [...corps11.matchAll(/0\d(?:[\s.-]?\d{2}){4}/g)]
  if (pack.matiere.cta !== 'appel' && tels11.length) echecs11.push(`téléphone trouvé alors que cta ≠ appel : ${tels11[0][0]}`)
  s.verdict('PL-11', !echecs11.length, 'aucune coordonnée hors règle', echecs11.join(' ; '))

  // PL-12 : jeu-visage (fixture négative) — vérifiée via visages-qa (fabriquer.mjs n'existe pas encore, 026-156)
  const echecs12 = []
  {
    const photoVisage = path.join(R, 'scripts', 'fixtures', '026-pubs-contenu', 'pack', 'jeu-visage', 'photo.jpg')
    if (!existeNonVide(photoVisage)) echecs12.push('jeu-visage/photo.jpg absente')
    else {
      const r = spawnSync(process.execPath, [path.join(R, 'scripts', 'visages-qa.mjs'), photoVisage, '--attendu=1'], { encoding: 'utf8', windowsHide: true })
      if (r.status !== 0) echecs12.push(`visages-qa ne détecte pas le visage attendu sur jeu-visage/photo.jpg (code ${r.status})`)
    }
  }
  s.verdict('PL-12', !echecs12.length, 'jeu-visage/photo.jpg est bien une fixture positive (visage détecté malgré personnes:false)', echecs12.join(' ; '))
}

async function partieComplet(s, { racine, temoin, dossier, contrat }) {
  if (dossier) {
    const pack = chargerPack(path.join(dossier, 'pack.json'))
    await verifierComplet(s, path.join(dossier, 'sortie'), dossier, pack, contrat, { estTemoin: false })
    return
  }
  if (temoin) {
    await assurerTemoin('media')
    const pack = chargerPack(path.join(TEMOIN_DIR, 'pack.json'))
    await verifierComplet(s, path.join(TEMOIN_DIR, 'sortie'), TEMOIN_DIR, pack, contrat, { estTemoin: true })
    return
  }
  const script = path.join(racine, 'scripts', 'pack-pub', 'fabriquer.mjs')
  for (const id of ['PL-1', 'PL-2', 'PL-3', 'PL-4', 'PL-5', 'PL-6', 'PL-7', 'PL-8', 'PL-9', 'PL-10', 'PL-11', 'PL-12']) s.echoue(id, `non évalué : ${rel(script, racine)} introuvable`)
}

function normaliserPourWer(texte) {
  return String(texte || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
}
function distanceMots(a, b) {
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1])
  return d[m][n]
}

// ── Fabrication du témoin (déléguée à fabriquer-temoin.mjs, mise en cache par existence des fichiers) ──────────────────
// niveau=base (pack, photos, voix, gabarits-temoin, textes) : rapide, suffit à --partie=gabarit et --partie=textes.
// niveau=media (+ hf/*, sortie/video-N.mp4 rendus, sortie/visuel-N.jpg) : lent (rendu HyperFrames), pour --partie=complet.
async function assurerTemoin(niveau = 'base') {
  const script = path.join(R, 'scripts', 'fixtures', '026-pubs-contenu', 'pack', 'fabriquer-temoin.mjs')
  const r = spawnSync(process.execPath, [script, `--niveau=${niveau}`], { cwd: R, encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28, timeout: 7 * 60_000 })
  if (r.status !== 0) throw new Error(`fabriquer-temoin.mjs --niveau=${niveau} : code ${r.status} — ${(r.stderr || r.stdout || '').split('\n').slice(-8).join(' | ')}`)
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function main() {
  const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['partie', 'dossier', 'meta-logement'] })
  const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
  if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')}`)
  const partie = o.valeur('partie')
  if (!['gabarit', 'textes', 'complet'].includes(partie)) refuser(`--partie=gabarit|textes|complet attendu (reçu ${partie ?? 'rien'})`)
  const dossierArg = o.valeur('dossier')
  const dossier = dossierArg ? path.resolve(dossierArg) : null
  if (dossier && o.temoin) refuser('--dossier et --temoin sont exclusifs')
  if (dossier && !fs.existsSync(path.join(dossier, 'pack.json'))) refuser(`--dossier=${dossierArg} : pack.json introuvable`)
  const metaLogementOverride = o.valeur('meta-logement')
  if (metaLogementOverride && !['oui', 'non', 'a_verifier'].includes(metaLogementOverride)) refuser(`--meta-logement=oui|non|a_verifier attendu (reçu ${metaLogementOverride})`)

  fs.mkdirSync(MON_TRAVAIL, { recursive: true })
  const contrat = chargerContrat(o.racine)
  const IDS = {
    gabarit: ['PL-G1', 'PL-G2', 'PL-G3', 'PL-G4', 'PL-G5'],
    textes: ['PL-T1', 'PL-T2', 'PL-T3', 'PL-T4', 'PL-T5', 'PL-T6', 'PL-T7'],
    complet: ['PL-1', 'PL-2', 'PL-3', 'PL-4', 'PL-5', 'PL-6', 'PL-7', 'PL-8', 'PL-9', 'PL-10', 'PL-11', 'PL-12'],
  }[partie]
  const s = creerSortie(`${NOM} --partie=${partie}`, IDS, { racine: o.racine, temoin: o.temoin })

  if (!contrat) {
    for (const id of IDS) s.echoue(id, `non évalué : ${rel(path.join(o.racine, 'gabarits-pubs', 'locale', 'contrat.json'), o.racine)} introuvable`)
    s.fin(); return
  }

  await s.executer(async (s) => {
    if (partie === 'gabarit') await partieGabarit(s, { racine: o.racine, temoin: o.temoin, contrat })
    else if (partie === 'textes') await partieTextes(s, { racine: o.racine, temoin: o.temoin, dossier, contrat, metaLogementOverride })
    else await partieComplet(s, { racine: o.racine, temoin: o.temoin, dossier, contrat })
  })
}

const estCli = (() => { try { return import.meta.url === pathToFileURL(process.argv[1]).href } catch { return false } })()
if (estCli) main()
