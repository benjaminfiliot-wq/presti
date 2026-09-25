#!/usr/bin/env node
// scripts/juges-026-preuve.mjs — la couverture de la série 026 (fiche 026-001), écrite par Claude Code.
//
// Ce contrôle se juge sur les fiches elles-mêmes, jamais sur un registre recopié à la main (un registre dérive dès la
// première fiche corrigée). Il lit chaque fiche 026 et 025, son en-tête (la lecture de `lireTache`, recopiée : importer
// orchestre.mjs l'exécuterait) et les quatre lignes de forme fixe de sa section « ## Place dans la série » — lues SEULEMENT
// entre ce titre et le titre de niveau 2 suivant : un exemple de même forme ailleurs dans la fiche n'est jamais lu.
//
//   classes   fiche de juges = `type: test` et `executant: claude-code` ; fiche de mutations = son `verifier` lance
//             scripts/juges-026-mutations-preuve.mjs avec `--script=` ; toutes les autres sont des fiches de fabrication.
//   juge      chaque chemin de script (scripts/….mjs ou ../orchestre/test/….mjs) lancé par `node` dans le `verifier`, hors
//             scripts/ts-loader.mjs et hors la valeur d'une option `--x=<chemin>` ; `a && b` donne deux juges.
//
//   CV-1  fichiers 026-NNN.md, en-tête `id` égal au nom, numéros de 001 à N sans trou ni doublon, section « Place ».
//   CV-2  chaque juge d'une fiche de fabrication ou de mutations est dans le périmètre (chemin exact) d'une fiche de juges,
//         et d'une seule, dont l'id est plus petit ; le juge d'une fiche de juges est dans son propre périmètre ou dans
//         celui d'une fiche de juges plus petite.
//   CV-3  aucun juge, et aucun chemin scripts/fixtures/**, dans le périmètre d'une fiche de fabrication ou de mutations.
//   CV-4  chaque id cité dans les quatre lignes est plus petit que la fiche, chaque 025 cité existe ; « **Collées … » refusé.
//   CV-5  deux fiches qui se chevauchent sont ordonnées (« Dépend de » ou « Sérialisée après », transitivement) ; une fiche
//         026 qui chevauche une fiche 025 en dépend.
//   CV-6  chaque scripts/*-qa.mjs du périmètre d'une fiche de juges est nommé (nom de base, mot entier) dans le corps d'une
//         fiche de mutations — exemption fermée : les juges « --reel seulement » de EXEMPTS_REEL.
//   CV-7  une fiche qui touche un chemin sensible ou un juge est `executant: claude-code` (sauf le script d'une fiche de
//         mutations).
//   CV-8  INDEX.md : chaque fiche dans une vague et une seule, vagues dans l'ordre des ids, au plus 1 Claude Code, 2 PC et
//         2 usine par vague, « sur l'usine » dans la ligne Id d'une fiche de la colonne Usine et pas dans celle d'une fiche
//         de la colonne PC, aucun chevauchement dans une vague, dépendances dans des vagues antérieures.
//
// Usage : node scripts/juges-026-preuve.mjs [--cartes=<dossier>] [--index=<fichier>] [--couverture] [--autotest] [--preuves]
//   --couverture  les huit critères, une ligne par critère ; couverture.md dans .orchestre/preuves/026-001/ (sous
//                 .orchestre/travail/juges-026-preuve/ quand --cartes est donné : une copie ne touche jamais la preuve).
//   --autotest    le jeu propre de scripts/fixtures/026/couverture/propre/ doit passer, et chaque cas de cas.json (un
//                 remplacement de texte exact dans une copie) doit échouer par son critère et par lui seul (plus `aussi`).
//   --preuves     (hors `verifier`) lance le `verifier` de chaque fiche de juges dans l'ordre des ids, sous son budget, et
//                 recopie leurs echecs-attendus.md dans .orchestre/preuves/026-juges/echecs-attendus.md.
// Sans option : --couverture. Code 0 si tout est vert, 1 sinon, 2 si l'appel est invalide. N'écrit que sous
// .orchestre/travail/ et .orchestre/preuves/ ; compare `git status --porcelain` avant et après ; aucun appel réseau.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync, execFileSync } from 'node:child_process'

const CE_SCRIPT = fileURLToPath(import.meta.url)
const R = path.resolve(path.dirname(CE_SCRIPT), '..')
const ORCH = path.join(R, '.orchestre')
const TRAVAIL = path.join(ORCH, 'travail', 'juges-026-preuve')
const PREUVES = path.join(ORCH, 'preuves', '026-001')
const FIXTURES = path.join(R, 'scripts', 'fixtures', '026', 'couverture')
const NOM = 'juges-026-preuve'
const CRITERES = ['CV-1', 'CV-2', 'CV-3', 'CV-4', 'CV-5', 'CV-6', 'CV-7', 'CV-8']
const FILE_ORCHESTRE = ['file', 'en-cours', 'fait', 'refuse'] // l'ordre de lecture : la première fiche trouvée d'un id l'emporte
const MAX_MINUTES = 30 // plafond de l'orchestre (maxMinutes)
const MAX_DEFAUTS_AFFICHES = 60

// La liste FERMÉE des juges exemptés de CV-6 : leurs critères n'ont de sens qu'en production, et leur fiche de juges le
// déclare en toutes lettres (« --reel seulement »). Toute autre exemption est un changement du cahier de 026-001.
const EXEMPTS_REEL = [{ juge: 'scripts/horloge-qa.mjs', fiche: '026-045' }]
// CV-7 : ce qu'une fiche d'exécutant ne touche jamais (en plus de tout juge).
const SENSIBLES = ['supabase/**', 'lib/agents/llm.ts', 'lib/agents/garde.ts', 'lib/agents/jetons.ts', 'app/api/stripe/**', 'lib/stripe*',
  'lib/plans.ts', 'lib/direction/garde.ts', 'lib/direction/reconfirmation.ts', 'lib/controle/droits.ts']
const META_JUGE = 'scripts/juges-026-mutations-preuve.mjs'

const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const versSlash = (p) => String(p).split(path.sep).join('/')
const relR = (p) => versSlash(path.relative(R, p))
const court = (t, n = 200) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const normChemin = (p) => versSlash(String(p).trim().replace(/^["'`]|["'`]$/g, '')).replace(/^\.\//, '')
const sous = (enfant, parent) => { const r = path.relative(parent, enfant); return !!r && !r.startsWith('..') && !path.isAbsolute(r) }

// ── Options ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function refuser(m) { console.error(`✗ ${m}`); process.exit(2) }
function lireOptions(argv) {
  const o = { cartes: null, index: null, couverture: false, autotest: false, preuves: false }
  for (const a of argv) {
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a)
    if (!m) refuser(`argument inattendu : ${a}`)
    const [, cle, val] = m
    if (cle === 'cartes' || cle === 'index') { if (!val) refuser(`--${cle} attend un chemin : --${cle}=<chemin>`); o[cle] = path.resolve(R, val) }
    else if (['couverture', 'autotest', 'preuves'].includes(cle)) { if (val !== undefined) refuser(`--${cle} ne prend pas de valeur`); o[cle] = true }
    else refuser(`option inconnue : --${cle} (connues : --cartes=, --index=, --couverture, --autotest, --preuves)`)
  }
  if (!o.couverture && !o.autotest && !o.preuves) o.couverture = true
  if (o.cartes && (!existe(o.cartes) || !fs.statSync(o.cartes).isDirectory())) refuser(`--cartes : dossier introuvable : ${o.cartes}`)
  if (o.index && !existe(o.index)) refuser(`--index : fichier introuvable : ${o.index}`)
  return o
}

// ── L'en-tête YAML : la lecture de lireTache (scripts/orchestre.mjs:165-189), recopiée ────────────────────────────────────
const CHAMPS = ['id', 'type', 'objectif', 'perimetre', 'interdit', 'verifier', 'budget', 'preuve']
const sansGuillemets = (v) => (/^'.*'$/.test(v) || /^".*"$/.test(v)) && v.length >= 2 ? v.slice(1, -1) : v
function valeurYaml(brut) {
  const v = brut.trim()
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((x) => sansGuillemets(x.trim())).filter(Boolean)
  if (/^\{.*\}$/.test(v)) {
    const o = {}
    for (const part of v.slice(1, -1).split(',')) { const i = part.indexOf(':'); if (i > 0) o[part.slice(0, i).trim()] = valeurYaml(part.slice(i + 1)) }
    return o
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  if (v === 'true' || v === 'false') return v === 'true'
  return sansGuillemets(v)
}
function lireEntete(texte) {
  const m = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return { entete: null, corps: texte, erreurs: ['pas d’en-tête YAML (--- … ---) en tête de fichier'] }
  const entete = {}
  for (const ligne of m[1].split(/\r?\n/)) {
    const s = ligne.replace(/\s+#.*$/, ''); const i = s.indexOf(':')
    if (i < 1 || /^\s/.test(s) || s.startsWith('#')) continue
    entete[s.slice(0, i).trim()] = valeurYaml(s.slice(i + 1))
  }
  const erreurs = CHAMPS.filter((c) => entete[c] === undefined || entete[c] === '' || (Array.isArray(entete[c]) && !entete[c].length)).map((c) => `champ obligatoire absent ou vide : ${c}`)
  if (entete.perimetre !== undefined && !Array.isArray(entete.perimetre)) erreurs.push('perimetre : attendu une liste [a, b]')
  return { entete, corps: texte.slice(m[0].length), erreurs }
}

// ── Globs et chevauchement, comme l'orchestre (scripts/orchestre.mjs:113-127 et 192-193) ─────────────────────────────────
function globVersRegex(motif) {
  const m = normChemin(motif)
  let re = ''
  for (let i = 0; i < m.length; i++) {
    const c = m[i]
    if (c === '*') { if (m[i + 1] === '*') { if (m[i + 2] === '/') { re += '(?:.*/)?'; i += 2 } else { re += '.*'; i += 1 } } else re += '[^/]*' }
    else if (c === '?') re += '[^/]'
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}
const prefixe = (g) => normChemin(g).split(/[*?{]/)[0]
const chevauche = (a, b) => { const pa = prefixe(a), pb = prefixe(b); return pa.startsWith(pb) || pb.startsWith(pa) }
const estPreuve = (g) => prefixe(g).startsWith('.orchestre/preuves/')
const perimetreUtile = (f) => (f.perimetre || []).filter((g) => !estPreuve(g))
/** Le premier couple de motifs qui se chevauchent entre deux fiches (hors .orchestre/preuves/**), ou null. */
function chevauchement(a, b) {
  for (const p of perimetreUtile(a)) for (const q of perimetreUtile(b)) if (chevauche(p, q)) return `${p} ↔ ${q}`
  return null
}
/** Un motif de périmètre peut-il écrire un chemin de scripts/fixtures/ ? */
const toucheFixtures = (g) => { const p = prefixe(g); return p.startsWith('scripts/fixtures/') || (/\*\*/.test(normChemin(g)) && 'scripts/fixtures/'.startsWith(p)) }

// ── Ids ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const RE_ID = /(?<![\w-])(02[56])-(\d{2,3})(?![\w-])/g
const idsDans = (texte) => [...String(texte).matchAll(RE_ID)].map((m) => `${m[1]}-${m[2]}`)
const rang = (id) => { const m = /^(\d{3})-(\d+)$/.exec(id); return m ? Number(m[1]) * 1000 + Number(m[2]) : NaN }
const plusPetit = (a, b) => rang(a) < rang(b)

// ── La section « ## Place dans la série » et ses quatre lignes de forme fixe ───────────────────────────────────────────────
const LIGNES_FIXES = {
  depend: /^\s*-\s*\*\*Dépend de \(PASS\)\s*:\*\*(.*)$/,
  serialisee: /^\s*-\s*\*\*Sérialisée après\s*:\*\*(.*)$/,
  appliquees: /^\s*-\s*\*\*Appliquées avant le dépôt\s*:\*\*(.*)$/,
  deployees: /^\s*-\s*\*\*Poussées et déployées avant le dépôt\s*:\*\*(.*)$/,
}
/** Les lignes d'une section de niveau 2 dont le titre répond à `titre`, jusqu'au `## ` suivant ; null si elle manque. */
function section(texte, titre) {
  const L = texte.split(/\r?\n/)
  const i = L.findIndex((l) => /^## /.test(l) && titre.test(l))
  if (i < 0) return null
  let j = i + 1
  while (j < L.length && !/^## /.test(L[j])) j++
  return L.slice(i + 1, j)
}
function lirePlace(texte) {
  const lignes = section(texte, /^## Place dans la série/)
  if (!lignes) return null
  const p = { depend: [], serialisee: [], appliquees: [], deployees: [], collees: [], idLigne: '' }
  for (const l of lignes) {
    for (const [cle, re] of Object.entries(LIGNES_FIXES)) { const m = re.exec(l); if (m) p[cle].push(...idsDans(m[1])) }
    if (/\*\*Collées\b/.test(l)) p.collees.push(court(l, 120))
    if (!p.idLigne && /^\s*-\s*\*\*Id\s*:\*\*/.test(l)) p.idLigne = l
  }
  return p
}

// ── Le `verifier` : juges, script de mutations ─────────────────────────────────────────────────────────────────────────
const RE_SCRIPT = /^(?:scripts\/[^\s"'`]+\.mjs|\.\.\/orchestre\/test\/[^\s"'`]+\.mjs)$/
function lireVerifier(verifier) {
  const juges = [], scriptsMutations = []
  let lanceMetaJuge = false
  for (const segment of String(verifier || '').split(/&&|\|\||;|\|/)) {
    const jetons = segment.trim().split(/\s+/).filter(Boolean).map((j) => j.replace(/^["']|["']$/g, ''))
    if (!jetons.length || !/(^|[\\/])node(\.exe)?$/i.test(jetons[0])) continue
    const ici = []
    for (const j of jetons.slice(1)) {
      if (j.startsWith('-')) { const m = /^--script=(.+)$/.exec(j); if (m) scriptsMutations.push(normChemin(m[1])); continue }
      const c = normChemin(j)
      if (RE_SCRIPT.test(c) && c !== 'scripts/ts-loader.mjs') ici.push(c)
    }
    juges.push(...ici)
    if (ici.includes(META_JUGE) && jetons.some((j) => j.startsWith('--script='))) lanceMetaJuge = true
  }
  return { juges: [...new Set(juges)], lanceMetaJuge, scriptMutations: lanceMetaJuge ? scriptsMutations[0] || null : null }
}

// ── Chargement des fiches ─────────────────────────────────────────────────────────────────────────────────────────────
function dossiers(cartes) {
  if (cartes) return { d026: [cartes], d025: [cartes] }
  return {
    d026: [...FILE_ORCHESTRE.map((d) => path.join(ORCH, d)), path.join(ORCH, 'brouillons-ecosysteme', '026')],
    d025: [...FILE_ORCHESTRE.map((d) => path.join(ORCH, d)), path.join(ORCH, 'brouillons-ecosysteme')],
  }
}
function lister(liste, serie) {
  const vus = new Map()
  for (const d of liste) {
    if (!existe(d)) continue
    for (const f of fs.readdirSync(d).sort()) {
      if (!f.startsWith(`${serie}-`) || !f.endsWith('.md') || /\.(question|reponse)\.md$/.test(f)) continue
      const p = path.join(d, f)
      if (!fs.statSync(p).isFile()) continue
      const nom = f.slice(0, -3)
      if (!vus.has(nom)) vus.set(nom, p)
    }
  }
  return vus
}
function chargerFiche(nom, fichier) {
  const texte = lire(fichier).replace(/\r\n/g, '\n')
  const { entete, corps, erreurs } = lireEntete(texte)
  const e = entete || {}
  const perimetre = Array.isArray(e.perimetre) ? e.perimetre.map(normChemin) : []
  const v = lireVerifier(e.verifier)
  return {
    nom, fichier, texte, corps, erreurs, id: e.id !== undefined ? String(e.id) : null, type: e.type, executant: e.executant || null,
    verifier: e.verifier || '', budget: e.budget, perimetre, place: lirePlace(texte), ...v,
  }
}
function charger(o) {
  const d = dossiers(o.cartes)
  const f026 = [...lister(d.d026, '026')].map(([nom, f]) => chargerFiche(nom, f))
  const f025 = [...lister(d.d025, '025')].map(([nom, f]) => chargerFiche(nom, f))
  for (const f of f026) {
    f.classe = f.type === 'test' && f.executant === 'claude-code' ? 'juges' : f.lanceMetaJuge ? 'mutations' : 'fabrication'
  }
  return { f026, f025 }
}

// ── Les critères ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function evaluer(o) {
  const { f026, f025 } = charger(o)
  const D = Object.fromEntries(CRITERES.map((c) => [c, []]))
  const note = (c, qui, texte) => D[c].push(`${qui} : ${texte}`)
  const nomValide = (n) => /^026-\d{3}$/.test(n)
  // Une fiche par id : celle dont le fichier porte le nom (les défauts de nom et d'id sont relevés par CV-1).
  const parId = new Map()
  for (const f of f026) if (f.id && nomValide(f.nom) && f.id === f.nom && !parId.has(f.id)) parId.set(f.id, f)
  const f025ParId = new Map(f025.map((f) => [f.id || f.nom, f]))
  const valides = [...parId.values()].sort((a, b) => rang(a.id) - rang(b.id))
  const connu = (id) => parId.has(id) || f025ParId.has(id)

  // CV-1 — noms, ids, numérotation, section « Place dans la série »
  const vusId = new Map()
  for (const f of f026) {
    if (!nomValide(f.nom)) note('CV-1', f.nom, `fichier ${relR(f.fichier)} : nom attendu 026-NNN.md`)
    for (const e of f.erreurs) note('CV-1', f.nom, `en-tête : ${e}`)
    if (f.id !== null && f.id !== f.nom) note('CV-1', f.nom, `en-tête id « ${f.id} » différent du nom du fichier`)
    if (f.id) { if (vusId.has(f.id)) note('CV-1', f.nom, `id ${f.id} en double (aussi ${vusId.get(f.id)})`); else vusId.set(f.id, f.nom) }
    if (!f.place) note('CV-1', f.nom, 'pas de section « ## Place dans la série »')
  }
  // Le trou se cherche deux fois : dans les noms de fichier, puis dans les `id` d'en-tête (une fiche renumérotée à moitié
  // garde son nom mais laisse un trou dans les ids).
  const numeros = f026.filter((f) => nomValide(f.nom)).map((f) => Number(f.nom.slice(4)))
  const numerosIds = f026.filter((f) => f.id && nomValide(f.id)).map((f) => Number(f.id.slice(4)))
  const N = Math.max(0, ...numeros, ...numerosIds)
  if (!N) note('CV-1', 'série', 'aucune fiche 026 lue')
  for (let n = 1; n <= N; n++) {
    const id = `026-${String(n).padStart(3, '0')}`
    if (!numeros.includes(n)) note('CV-1', id, `trou dans la numérotation des fichiers : pas de ${id}.md (fiches lues jusqu'à 026-${String(N).padStart(3, '0')})`)
    else if (!numerosIds.includes(n)) note('CV-1', id, `trou dans les ids : aucun en-tête ne porte « id: ${id} »`)
  }

  const juges = valides.filter((f) => f.classe === 'juges')
  const ecritsPar = (j) => juges.filter((g) => g.perimetre.includes(j))

  // CV-2 — chaque juge écrit avant, par une fiche de juges et une seule
  for (const f of valides) {
    if (!f.juges.length) { note('CV-2', f.id, `aucun juge : le verifier ne lance aucun script par node (« ${court(f.verifier, 90)} »)`); continue }
    for (const j of f.juges) {
      const auteurs = ecritsPar(j)
      if (f.classe === 'juges') {
        if (!f.perimetre.includes(j) && !auteurs.some((g) => plusPetit(g.id, f.id))) {
          note('CV-2', f.id, `son juge ${j} n'est ni dans son périmètre ni dans celui d'une fiche de juges plus petite${auteurs.length ? ` (écrit par ${auteurs.map((g) => g.id).join(', ')}, plus grande)` : ''}`)
        }
        continue
      }
      if (!auteurs.length) note('CV-2', f.id, `juge ${j} écrit par aucune fiche de juges (fiche de ${f.classe})`)
      else if (auteurs.length > 1) note('CV-2', f.id, `juge ${j} écrit par plusieurs fiches de juges : ${auteurs.map((g) => g.id).join(', ')}`)
      else if (!plusPetit(auteurs[0].id, f.id)) note('CV-2', f.id, `juge ${j} écrit par ${auteurs[0].id}, fiche de juges plus grande que la fiche jugée`)
    }
  }
  const tousJuges = [...new Set(valides.flatMap((f) => f.juges))]

  // CV-3 — aucun juge, aucun jeu d'essai, dans le périmètre d'une fiche de fabrication ou de mutations
  for (const f of valides.filter((x) => x.classe !== 'juges')) {
    for (const g of f.perimetre) {
      if (f.classe === 'mutations' && g === f.scriptMutations) continue
      const re = globVersRegex(g)
      for (const j of tousJuges) if (re.test(j)) note('CV-3', f.id, `son périmètre (${g}) contient le juge ${j}`)
      if (toucheFixtures(g)) note('CV-3', f.id, `son périmètre (${g}) touche scripts/fixtures/**`)
    }
  }

  // CV-4 — ids cités dans les quatre lignes : plus petits, 025 existants ; libellé « Collées » refusé
  for (const f of valides) {
    if (!f.place) continue
    for (const cle of Object.keys(LIGNES_FIXES)) for (const id of f.place[cle]) {
      if (!plusPetit(id, f.id)) note('CV-4', f.id, `« ${cle} » cite ${id}, qui n'est pas plus petit`)
      else if (!connu(id)) note('CV-4', f.id, `« ${cle} » cite ${id}, fiche introuvable${id.startsWith('025') ? ' (025 absente)' : ''}`)
    }
    for (const l of f.place.collees) note('CV-4', f.id, `libellé périmé « **Collées … » dans la section Place (il faisait croire à un geste de Benj) : ${l}`)
  }

  // CV-5 — deux fiches qui se chevauchent sont ordonnées (Dépend de / Sérialisée après, transitivement)
  const aretes = new Map()
  for (const f of valides) aretes.set(f.id, f.place ? [...new Set([...f.place.depend, ...f.place.serialisee])] : [])
  const memo = new Map()
  const ancetres = (id, pile = new Set()) => {
    if (memo.has(id)) return memo.get(id)
    const s = new Set()
    if (pile.has(id)) return s
    pile.add(id)
    for (const a of aretes.get(id) || []) { s.add(a); for (const x of ancetres(a, pile)) s.add(x) }
    pile.delete(id)
    memo.set(id, s)
    return s
  }
  for (let i = 0; i < valides.length; i++) for (let k = i + 1; k < valides.length; k++) {
    const a = valides[i], b = valides[k] // a < b
    const c = chevauchement(a, b)
    if (c && !ancetres(b.id).has(a.id)) note('CV-5', b.id, `chevauche ${a.id} (${c}) sans en dépendre ni être sérialisée après elle`)
  }
  for (const b of valides) for (const a of f025) {
    const c = chevauchement(a, b)
    if (c && !ancetres(b.id).has(a.id || a.nom)) note('CV-5', b.id, `chevauche la fiche ${a.id || a.nom} (${c}) sans en dépendre`)
  }

  // CV-6 — chaque *-qa.mjs d'une fiche de juges est nommé dans le corps d'une fiche de mutations
  const mutations = valides.filter((f) => f.classe === 'mutations')
  const motEntier = (base) => new RegExp(`(?<![\\w-])${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`)
  const mutePar = (j) => { const re = motEntier(path.posix.basename(j, '.mjs')); return mutations.filter((m) => re.test(m.corps)).map((m) => m.id) }
  const exempte = (j, f) => EXEMPTS_REEL.some((x) => x.juge === j && x.fiche === f.id) && /--reel`?\s+seulement/.test(f.texte)
  for (const f of juges) for (const g of f.perimetre) {
    if (!/^scripts\/[^/*?{]+-qa\.mjs$/.test(g) || exempte(g, f)) continue
    if (!mutePar(g).length) note('CV-6', f.id, `${g} (${path.posix.basename(g, '.mjs')}) n'est nommé dans le corps d'aucune fiche de mutations`)
  }

  // CV-7 — les chemins sensibles et les juges ne se touchent que par Claude Code
  for (const f of valides) {
    if (f.executant === 'claude-code') continue
    for (const g of f.perimetre) {
      if (f.classe === 'mutations' && g === f.scriptMutations) continue
      const s = SENSIBLES.find((x) => chevauche(g, x))
      if (s) note('CV-7', f.id, `exécutant ${f.executant || '(aucun)'} : son périmètre (${g}) touche ${s}`)
      const re = globVersRegex(g)
      const j = tousJuges.find((x) => re.test(x))
      if (j) note('CV-7', f.id, `exécutant ${f.executant || '(aucun)'} : son périmètre (${g}) touche le juge ${j}`)
    }
  }

  // CV-8 — INDEX.md, le tableau des vagues
  const index = o.index || (o.cartes ? path.join(o.cartes, 'INDEX.md') : path.join(ORCH, 'brouillons-ecosysteme', '026', 'INDEX.md'))
  const vagues = lireVagues(index, (m) => note('CV-8', 'INDEX', m))
  if (vagues) {
    const vagueDe = new Map()
    for (const v of vagues) for (const col of ['claude', 'pc', 'usine']) for (const id of v[col]) {
      if (!id.startsWith('026-')) continue
      if (!parId.has(id)) { note('CV-8', id, `${v.nom} cite ${id}, fiche introuvable`); continue }
      if (vagueDe.has(id)) note('CV-8', id, `dans deux vagues : ${vagueDe.get(id).v.nom} et ${v.nom}`)
      else vagueDe.set(id, { v, col })
    }
    for (const f of valides) if (!vagueDe.has(f.id)) note('CV-8', f.id, 'dans aucune vague de INDEX.md')
    let maxAvant = null, numPrec = -1
    for (const v of vagues) {
      const num = Number(v.nom.slice(1))
      if (!(num > numPrec)) note('CV-8', v.nom, `vague hors d'ordre ou en double (après V${String(numPrec).padStart(2, '0')})`)
      numPrec = Math.max(numPrec, num)
      const ids = [...v.claude, ...v.pc, ...v.usine].filter((x) => x.startsWith('026-')).sort((a, b) => rang(a) - rang(b))
      if (ids.length && maxAvant && !plusPetit(maxAvant, ids[0])) note('CV-8', v.nom, `les vagues ne suivent pas l'ordre des ids : ${ids[0]} vient après ${maxAvant}`)
      if (ids.length && (!maxAvant || plusPetit(maxAvant, ids.at(-1)))) maxAvant = ids.at(-1)
      if (v.claude.length > 1) note('CV-8', v.nom, `${v.claude.length} fiches Claude Code (au plus une) : ${v.claude.join(', ')}`)
      if (v.pc.length > 2) note('CV-8', v.nom, `${v.pc.length} fiches d'exécutant sur le PC (au plus deux) : ${v.pc.join(', ')}`)
      if (v.usine.length > 2) note('CV-8', v.nom, `${v.usine.length} fiches sur l'usine (au plus deux) : ${v.usine.join(', ')}`)
      for (const [col, doit] of [['usine', true], ['pc', false]]) for (const id of v[col]) {
        const f = parId.get(id)
        if (!f || !f.place) continue
        const porte = /sur l['’]usine/i.test(f.place.idLigne)
        if (doit && !porte) note('CV-8', id, `colonne Usine de ${v.nom}, mais sa ligne Id ne porte pas « sur l'usine »`)
        if (!doit && porte) note('CV-8', id, `colonne Exécutant (PC) de ${v.nom}, mais sa ligne Id porte « sur l'usine »`)
      }
      const dansVague = [...v.claude, ...v.pc, ...v.usine].map((id) => parId.get(id) || f025ParId.get(id)).filter(Boolean)
      for (let i = 0; i < dansVague.length; i++) for (let k = i + 1; k < dansVague.length; k++) {
        const c = chevauchement(dansVague[i], dansVague[k])
        if (c) note('CV-8', v.nom, `${dansVague[i].id} et ${dansVague[k].id} se chevauchent dans la même vague (${c})`)
      }
    }
    for (const f of valides) {
      const ici = vagueDe.get(f.id)
      if (!ici || !f.place) continue
      for (const d of f.place.depend) {
        const la = vagueDe.get(d)
        if (la && !(la.v.rang < ici.v.rang)) note('CV-8', f.id, `dépend de ${d} (${la.v.nom}), qui n'est pas dans une vague antérieure à ${ici.v.nom}`)
      }
    }
  }
  const compte = { juges: juges.length, fabrication: valides.filter((f) => f.classe === 'fabrication').length, mutations: mutations.length }
  return { D, f026, f025, valides, compte, N, index, ecritsPar, mutePar, exempte }
}

/** Le tableau `| Vague | Claude Code | Exécutant (PC) | Usine (Codex) | Avant la vague |` de INDEX.md. */
function lireVagues(index, signaler) {
  if (!existe(index)) { signaler(`${versSlash(index)} introuvable`); return null }
  const L = lire(index).split(/\r?\n/)
  const i = L.findIndex((l) => /^\|\s*Vague\s*\|/.test(l))
  if (i < 0) { signaler('tableau des vagues introuvable (ligne « | Vague | Claude Code | Exécutant (PC) | Usine (Codex) | Avant la vague | »)'); return null }
  const cellules = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
  const tete = cellules(L[i])
  const col = (re) => tete.findIndex((c) => re.test(c))
  const cc = col(/^Claude Code$/), pc = col(/^Exécutant \(PC\)$/), us = col(/^Usine\b/)
  if (cc < 0 || pc < 0 || us < 0) { signaler(`en-tête du tableau des vagues inattendu : ${L[i]}`); return null }
  const vagues = []
  for (let k = i + 2; k < L.length && /^\|/.test(L[k]); k++) {
    const c = cellules(L[k])
    if (!/^V\d+$/.test(c[0] || '')) { signaler(`ligne du tableau des vagues sans nom de vague : ${court(L[k], 80)}`); continue }
    vagues.push({ nom: c[0], rang: vagues.length, claude: idsDans(c[cc] || ''), pc: idsDans(c[pc] || ''), usine: idsDans(c[us] || '') })
  }
  if (!vagues.length) signaler('tableau des vagues vide')
  return vagues
}

// ── Sortie ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
function imprimerCouverture(r) {
  const lignes = []
  for (const c of CRITERES) {
    const d = r.D[c]
    if (!d.length) lignes.push(`PASS ${c} — ${resumePass(c, r)}`)
    else {
      lignes.push(`FAIL ${c} — ${d.length} défaut(s) : ${court(d[0], 160)}`)
      for (const x of d.slice(0, MAX_DEFAUTS_AFFICHES)) lignes.push(`  ✗ ${c} ${x}`)
      if (d.length > MAX_DEFAUTS_AFFICHES) lignes.push(`  ✗ ${c} … et ${d.length - MAX_DEFAUTS_AFFICHES} autre(s)`)
    }
  }
  return lignes
}
function resumePass(c, r) {
  const n = r.valides.length
  return {
    'CV-1': `${n} fiche(s) de 026-001 à 026-${String(r.N).padStart(3, '0')}, sans trou ni doublon, chacune avec sa section « Place dans la série »`,
    'CV-2': `chaque juge des ${r.compte.fabrication} fiche(s) de fabrication et des ${r.compte.mutations} de mutations écrit avant par une seule des ${r.compte.juges} fiche(s) de juges`,
    'CV-3': 'aucun juge ni jeu d’essai dans le périmètre d’une fiche de fabrication ou de mutations',
    'CV-4': `ids cités dans « Place dans la série » tous plus petits, ${r.f025.length} fiche(s) 025 lue(s)`,
    'CV-5': 'chaque chevauchement de périmètres ordonné par « Dépend de » ou « Sérialisée après »',
    'CV-6': `chaque *-qa.mjs des fiches de juges nommé par une fiche de mutations (exemptés : ${EXEMPTS_REEL.map((x) => x.juge).join(', ')})`,
    'CV-7': 'chemins sensibles et juges touchés par Claude Code seulement',
    'CV-8': `${relR(r.index)} : chaque fiche dans une vague, plafonds et ordre tenus`,
  }[c]
}
function tableauFiches(r) {
  const L = ['| fiche | classe | juge | écrit par | muté par |', '|---|---|---|---|---|']
  for (const f of r.valides) {
    const js = f.juges.length ? f.juges : ['(aucun)']
    for (const j of js) {
      const auteurs = f.juges.length ? r.ecritsPar(j).map((g) => g.id).join(', ') || '—' : '—'
      const auteurJuge = r.valides.find((g) => g.classe === 'juges' && g.perimetre.includes(j))
      const mutes = f.juges.length ? r.mutePar(j) : []
      const muteTxt = mutes.length ? mutes.join(', ') : (auteurJuge && r.exempte(j, auteurJuge) ? 'exempté (--reel seulement)' : '—')
      L.push(`| ${f.id} | ${f.classe} | \`${j}\` | ${auteurs} | ${muteTxt} |`)
    }
  }
  return L
}

// ── L'autotest : le jeu propre, puis chaque défaut planté ─────────────────────────────────────────────────────────────────
function lancerEnfant(args, cwd = R, delaiMs = 180_000) {
  const r = spawnSync(process.execPath, [CE_SCRIPT, ...args], { cwd, encoding: 'utf8', timeout: delaiMs, windowsHide: true, maxBuffer: 64 * 1024 * 1024 })
  return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}`, erreur: r.error ? r.error.message : null }
}
const criteresEnEchec = (sortie) => [...new Set(String(sortie).split(/\r?\n/).map((l) => /^FAIL (CV-\d)\b/.exec(l)).filter(Boolean).map((m) => m[1]))]
const lignesDe = (sortie, c) => String(sortie).split(/\r?\n/).filter((l) => new RegExp(`^(?:FAIL|  ✗) ${c}\\b`).test(l))
function copierPropre(dest) {
  if (!sous(dest, TRAVAIL)) throw new Error(`copie hors de ${relR(TRAVAIL)} : ${dest}`)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  const source = path.join(FIXTURES, 'propre')
  for (const f of fs.readdirSync(source)) {
    const p = path.join(source, f)
    if (fs.statSync(p).isFile()) fs.writeFileSync(path.join(dest, f), lire(p).replace(/\r\n/g, '\n')) // fin de ligne du dépôt ramenée à \n
  }
}
function autotest() {
  const resultats = []
  const lignes = []
  const casFichier = path.join(FIXTURES, 'cas.json')
  let cas = []
  try { cas = JSON.parse(lire(casFichier)); if (!Array.isArray(cas) || !cas.length) throw new Error('liste vide') }
  catch (e) { lignes.push(`FAIL AT-0 — ${relR(casFichier)} illisible : ${e.message}`); return { ok: false, lignes, resultats } }
  const noms = new Set()
  // Le jeu propre : vert, sans une seule ligne rouge.
  const dPropre = path.join(TRAVAIL, 'propre')
  copierPropre(dPropre)
  const rp = lancerEnfant(['--couverture', `--cartes=${dPropre}`, `--index=${path.join(dPropre, 'INDEX.md')}`])
  const rougesP = criteresEnEchec(rp.sortie)
  const okP = rp.code === 0 && !rougesP.length && /juges-026-preuve : PASS/.test(rp.sortie)
  resultats.push({ nom: 'propre', attendu: 'aucun', code: rp.code, rouges: rougesP, ok: okP, ligne: okP ? 'jeu propre vert' : court(lignesDe(rp.sortie, rougesP[0] || 'CV-\\d')[0] || rp.erreur || rp.sortie.split(/\r?\n/).filter(Boolean).at(-1), 160) })
  lignes.push(`${okP ? 'PASS' : 'FAIL'} AT-propre — code ${rp.code}${rougesP.length ? `, en échec : ${rougesP.join(', ')}` : ', aucun critère en échec'}`)
  if (!okP) for (const l of rp.sortie.split(/\r?\n/).filter((x) => /^(FAIL|  ✗)/.test(x)).slice(0, 8)) lignes.push(`    ${l}`)
  for (const k of cas) {
    const nom = String(k.nom || '')
    const attendu = k.attendu || null
    const aussi = Array.isArray(k.aussi) ? k.aussi : []
    const defaut = (m) => { resultats.push({ nom, attendu: attendu || 'aucun', code: null, rouges: [], ok: false, ligne: m }); lignes.push(`FAIL AT-${nom || '?'} — ${m}`) }
    if (!/^[a-z0-9-]+$/.test(nom) || nom === 'propre' || noms.has(nom)) { defaut(`nom de cas invalide ou en double : « ${nom} »`); continue }
    noms.add(nom)
    if (typeof k.fichier !== 'string' || typeof k.avant !== 'string' || !k.avant || typeof k.apres !== 'string') { defaut('cas mal formé : { nom, fichier, avant, apres, attendu, aussi? } attendu'); continue }
    if (attendu !== null && !CRITERES.includes(attendu)) { defaut(`critère attendu inconnu : ${attendu}`); continue }
    const dest = path.join(TRAVAIL, nom)
    copierPropre(dest)
    const cible = path.join(dest, k.fichier)
    if (!sous(cible, dest) || !existe(cible)) { defaut(`fichier du cas introuvable dans le jeu propre : ${k.fichier}`); continue }
    const texte = lire(cible)
    const n = texte.split(k.avant).length - 1
    if (n !== 1) { defaut(`« avant » présent ${n} fois dans ${k.fichier} (exactement une fois attendu)`); continue }
    const i = texte.indexOf(k.avant)
    fs.writeFileSync(cible, texte.slice(0, i) + k.apres + texte.slice(i + k.avant.length))
    const r = lancerEnfant(['--couverture', `--cartes=${dest}`, `--index=${path.join(dest, 'INDEX.md')}`])
    const rouges = criteresEnEchec(r.sortie)
    let ok, pourquoi, ligne
    if (attendu === null) {
      ok = r.code === 0 && !rouges.length
      pourquoi = ok ? 'reste vert, comme attendu' : `aurait dû rester vert : code ${r.code}, en échec ${rouges.join(', ') || '(aucun critère)'}`
      ligne = ok ? 'aucune ligne en échec' : court(lignesDe(r.sortie, rouges[0] || 'CV-\\d')[0] || r.erreur || '', 160)
    } else {
      const lignesAttendu = lignesDe(r.sortie, attendu)
      const motif = typeof k.motif === 'string' && k.motif ? k.motif : null
      const porteMotif = !motif || lignesAttendu.some((l) => l.includes(motif))
      const intrus = rouges.filter((c) => c !== attendu && !aussi.includes(c))
      ok = r.code === 1 && rouges.includes(attendu) && !intrus.length && porteMotif
      pourquoi = ok ? `attrapé par ${attendu}${aussi.length ? ` (aussi en échec : ${rouges.filter((c) => c !== attendu).join(', ') || 'aucun'})` : ''}`
        : r.code !== 1 ? `code ${r.code} (1 attendu)${r.erreur ? ` — ${r.erreur}` : ''}`
        : !rouges.includes(attendu) ? `${attendu} n'est pas en échec (en échec : ${rouges.join(', ') || 'aucun'})`
        : intrus.length ? `critère(s) en échec non déclaré(s) : ${intrus.join(', ')}`
        : `aucune ligne ${attendu} ne porte « ${motif} »`
      ligne = court((motif ? lignesAttendu.find((l) => l.includes(motif)) : null) || lignesAttendu.find((l) => l.startsWith('  ✗')) || lignesAttendu[0] || '', 200)
    }
    resultats.push({ nom, attendu: attendu || 'aucun', code: r.code, rouges, ok, ligne })
    lignes.push(`${ok ? 'PASS' : 'FAIL'} AT-${nom} — ${pourquoi}${ligne && ok && attendu ? ` · « ${court(ligne.trim(), 110)} »` : ''}`)
  }
  // Au moins un cas par critère du cahier.
  const couverts = new Set(cas.map((k) => k.attendu).filter(Boolean))
  const manquants = CRITERES.filter((c) => !couverts.has(c))
  if (manquants.length) lignes.push(`FAIL AT-cahier — aucun cas pour ${manquants.join(', ')}`)
  else lignes.push(`PASS AT-cahier — au moins un cas par critère (${CRITERES.join(', ')}), ${cas.length} cas`)
  return { ok: resultats.every((x) => x.ok) && !manquants.length, lignes, resultats }
}

// ── --preuves : rejouer toute la preuve des fiches de juges ────────────────────────────────────────────────────────────
function tuerArbre(pid) {
  try { if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* déjà mort */ }
}
function executer(commande, minutes) {
  return new Promise((resoudre) => {
    const enfant = spawn(commande, { cwd: R, shell: true, windowsHide: true, detached: process.platform !== 'win32', env: { ...process.env, FORCE_COLOR: '0' } })
    let sortie = '', expire = false
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', (d) => { sortie += d }); enfant.stderr.on('data', (d) => { sortie += d })
    const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, minutes * 60_000)
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 1), sortie, expire }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sortie}\n${e.message}`, expire }) })
  })
}
async function preuves(o, r) {
  const sortieMd = o.cartes ? path.join(TRAVAIL, 'preuves-echecs-attendus.md') : path.join(ORCH, 'preuves', '026-juges', 'echecs-attendus.md')
  const md = ['# Échecs attendus des fiches de juges de la série 026', '', `> Écrit par \`node scripts/juges-026-preuve.mjs --preuves\` le ${new Date().toISOString()}. Une fiche de juges pas encore écrite est « en attente », jamais « verte ».`, '']
  const lignes = []
  let ok = true
  for (const f of r.valides.filter((x) => x.classe === 'juges')) {
    const absents = f.juges.filter((j) => !existe(path.join(R, j)))
    md.push(`## ${f.id}`, '')
    if (!f.juges.length || absents.length) {
      ok = false
      lignes.push(`EN ATTENTE ${f.id} — juge(s) pas encore écrit(s) : ${(absents.length ? absents : ['(aucun juge)']).join(', ')}`)
      md.push(`En attente : ${(absents.length ? absents : ['aucun juge dans le verifier']).join(', ')}.`, '')
      continue
    }
    const minutes = Math.min(Number(f.budget && f.budget.minutes) || MAX_MINUTES, MAX_MINUTES)
    const t0 = Date.now()
    const x = await executer(f.verifier, minutes)
    const duree = Math.round((Date.now() - t0) / 1000)
    ecrire(path.join(TRAVAIL, 'preuves', `${f.id}.log`), `$ ${f.verifier}\n# code ${x.code} · ${duree}s\n\n${x.sortie}`)
    const ea = path.join(ORCH, 'preuves', f.id, 'echecs-attendus.md')
    const contenu = existe(ea) ? lire(ea).trim() : ''
    const vert = x.code === 0
    if (!vert) ok = false
    lignes.push(`${vert ? 'PASS' : 'FAIL'} ${f.id} — code ${x.code}${x.expire ? ` (délai de ${minutes} min dépassé)` : ''} · ${duree}s${contenu ? '' : ' · pas d’echecs-attendus.md'}`)
    md.push(`Verifier : \`${f.verifier}\` → code ${x.code} en ${duree}s.`, '', contenu ? contenu.replace(/^#/gm, '###') : `(pas de ${relR(ea)} : preuves de la fiche dans ${relR(path.dirname(ea))}/)`, '')
  }
  ecrire(sortieMd, md.join('\n') + '\n')
  lignes.push(`→ ${relR(sortieMd)}`)
  return { ok, lignes }
}

// ── Hygiène : `git status --porcelain` avant et après, hors travail/, preuves/ et chantiers des fiches en cours ───────────
function porcelain() {
  try { return execFileSync('git', ['status', '--porcelain'], { cwd: R, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return null }
}
function perimetresEnCours() {
  const d = path.join(ORCH, 'en-cours')
  if (!existe(d)) return []
  return fs.readdirSync(d).filter((f) => /^\d{3}-[\w-]+\.md$/.test(f) && !/\.(question|reponse)\.md$/.test(f))
    .flatMap((f) => { const e = lireEntete(lire(path.join(d, f))).entete; return e && Array.isArray(e.perimetre) ? e.perimetre.map(prefixe).filter(Boolean) : [] })
}
function filtrerPorcelain(txt, ignores) {
  return String(txt || '').split(/\r?\n/).filter(Boolean).filter((l) => {
    const chemins = l.slice(3).split(' -> ').map((c) => c.trim().replace(/^"|"$/g, ''))
    return !chemins.every((c) => c.startsWith('.orchestre/travail/') || c.startsWith('.orchestre/preuves/') || ignores.some((p) => c.startsWith(p) || p.startsWith(c)))
  }).sort().join('\n')
}

// ── Principal ────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  const o = lireOptions(process.argv.slice(2))
  const hygiene = !o.cartes
  const avant = hygiene ? porcelain() : null
  const sorties = []
  let ok = true
  let r = null
  if (o.couverture || o.preuves) r = evaluer(o)
  let couvLignes = []
  if (o.couverture) {
    couvLignes = imprimerCouverture(r)
    for (const l of couvLignes) console.log(l)
    if (CRITERES.some((c) => r.D[c].length)) ok = false
  }
  let at = null
  if (o.autotest) {
    at = autotest()
    for (const l of at.lignes) console.log(l)
    if (!at.ok) ok = false
  }
  if (o.preuves) {
    const p = await preuves(o, r)
    for (const l of p.lignes) console.log(l)
    if (!p.ok) ok = false
  }
  if (o.couverture) {
    const sortie = o.cartes ? path.join(TRAVAIL, `${path.basename(o.cartes)}.couverture.md`) : path.join(PREUVES, 'couverture.md')
    const enEchec = CRITERES.filter((c) => r.D[c].length)
    const md = [
      '# Couverture de la série 026', '',
      `> Écrit par \`node scripts/juges-026-preuve.mjs${process.argv.slice(2).length ? ` ${process.argv.slice(2).join(' ')}` : ''}\` le ${new Date().toISOString()}. Rien ici n'est recopié à la main : tout est lu dans les fiches.`, '',
      `**Fiches 026 lues : ${r.f026.length}** — fiches de juges : ${r.compte.juges} · fiches de fabrication : ${r.compte.fabrication} · fiches de mutations : ${r.compte.mutations}${r.f026.length !== r.valides.length ? ` · fiches mal nommées ou sans id : ${r.f026.length - r.valides.length}` : ''}. Fiches 025 lues : ${r.f025.length}.`,
      `Sources : ${o.cartes ? relR(o.cartes) : `.orchestre/{${FILE_ORCHESTRE.join(',')}}/ puis .orchestre/brouillons-ecosysteme/026/ (025 : …/brouillons-ecosysteme/)`} · vagues : ${relR(r.index)}.`, '',
      `**Verdict de la couverture : ${enEchec.length ? `FAIL (${enEchec.join(', ')})` : 'PASS'}**`, '',
      '## Les critères', '', ...couvLignes.map((l) => `    ${l}`), '',
      '## Une ligne par fiche : son juge, la fiche qui l’écrit, la fiche qui le mute', '', ...tableauFiches(r), '',
    ]
    if (at) {
      md.push('## Autotest : une ligne par défaut planté, avec le critère qui l’a attrapé', '', '| cas | attendu | code | critère(s) en échec | verdict | ligne en échec |', '|---|---|---|---|---|---|')
      for (const x of at.resultats) md.push(`| ${x.nom} | ${x.attendu} | ${x.code ?? '—'} | ${x.rouges.join(', ') || '—'} | ${x.ok ? 'PASS' : 'FAIL'} | ${String(x.ligne || '').replace(/\|/g, '\\|')} |`)
      md.push('', ...at.lignes.filter((l) => /^(PASS|FAIL) AT-cahier/.test(l)))
    }
    ecrire(sortie, md.join('\n') + '\n')
    console.log(`→ ${relR(sortie)}`)
  }
  if (hygiene) {
    const ignores = perimetresEnCours()
    const apres = porcelain()
    if (avant === null || apres === null) { console.log('FAIL HY-1 — git status illisible'); ok = false }
    else {
      const a = filtrerPorcelain(avant, ignores), b = filtrerPorcelain(apres, ignores)
      if (a !== b) {
        ok = false
        const A = new Set(a.split('\n')), B = new Set(b.split('\n'))
        console.log(`FAIL HY-1 — git status --porcelain a changé hors .orchestre/travail/, .orchestre/preuves/ et chantiers en cours : ${court([...[...B].filter((x) => !A.has(x)).map((x) => `+${x}`), ...[...A].filter((x) => !B.has(x)).map((x) => `-${x}`)].join(' ; '), 200)}`)
      } else console.log('PASS HY-1 — git status --porcelain identique avant et après (hors travail/, preuves/ et chantiers en cours)')
    }
  }
  const rouges = []
  if (r && o.couverture) rouges.push(...CRITERES.filter((c) => r.D[c].length))
  if (at && !at.ok) rouges.push('autotest')
  console.log(`${NOM} : ${ok ? 'PASS' : `FAIL${rouges.length ? ` — ${rouges.join(', ')}` : ''}`}`)
  process.exit(ok ? 0 : 1)
}

principal().catch((e) => { console.error(`FAIL ${NOM} — exception : ${e && e.stack ? e.stack : e}`); process.exit(1) })
