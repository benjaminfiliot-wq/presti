// scripts/lib/sql-essai.mjs — les aides partagées par les juges SQL de la série 026 (fiche 026-009), écrites par Claude Code.
//
// Depuis le 14/09, la connexion directe à la base est refusée : un juge ne peut pas exécuter de SQL arbitraire. Il juge donc en
// trois temps (026-009, « Contexte ») : une lecture statique du fichier, un essai à sec qu'il GÉNÈRE lui-même et dont il relit
// le compte rendu, puis `--reel` après l'application par Claude Code. Ce module porte ce que ces trois temps ont en commun.
//
//   segments(sql)          le texte découpé en {type: code | chaine | ident | dollar | commentaire, texte, ferme, tag, corps}.
//                          Les étiquettes `$tag$` suivent la règle de Postgres (lettres, chiffres, _, jamais un chiffre en tête) :
//                          le tokenizer de sql-nu.mjs ne connaît pas les chiffres, et `$essai_026$` lui échapperait.
//   instructions(sql)      les instructions, commentaires ôtés par `sansCommentaires` de sql-nu.mjs (réutilisé, pas recopié),
//                          chaînes et blocs `$tag$` respectés ; sans le « ; » final.
//   normaliser(sql)        une forme comparable : code en minuscules, blancs repliés, rien autour de ( ) :: , (« , » gardé),
//                          `!=` écrit `<>` ; chaînes, identifiants entre guillemets et blocs `$tag$` recopiés tels quels.
//   seParse(sql)           chaînes, commentaires et blocs refermés, parenthèses équilibrées (récursif dans les blocs `$tag$`).
//   masquer(sql)           même longueur, intérieur des chaînes, identifiants, blocs et commentaires remplacé : la structure
//                          (parenthèses, virgules, mots-clés) se lit sur le masque, le contenu se découpe dans l'original.
//   fermante(masque, i)    la parenthèse qui ferme celle de l'indice i ; decouperVirgules(t) : les virgules de premier niveau.
//   compacter(sql)         minuscules, sans blancs ni commentaires, `!=` écrit `<>` : la forme où une règle du contrat se cherche.
//   JUMEAU_EXEMPLE         un jumeau nu d'exemple (table, fonction à corps commenté, chaîne piégée) pour éprouver --generer-essai.
//   jumeauNuCoupe(fichier) le jumeau nu coupé à MARQUE_CONTROLE (sql-nu.mjs), fins de ligne en LF : ce que l'essai exécute.
//   empreinte(texte)       sha256 hexadécimal.
//   blocEssai({ nus, scenario, empreinte })   UN énoncé `do $essai_026$ … $essai_026$;` : chaque jumeau passé à `execute
//                          $migration_026$…$migration_026$`, puis le scénario, puis `raise exception 'ESSAI_A_SEC % %'`. Refuse
//                          si un jumeau ou le scénario porte déjà l'une des deux étiquettes.
//   analyserEssai(bloc)    ce que JP-3 exige d'un bloc : un seul énoncé qui se parse, qui finit par le raise, sans commit,
//                          rollback, grant, drop schema ni vault. hors des chaînes (le jumeau est une chaîne `$migration_026$`).
//   clesScenario(sql)      les clés d'assertion d'un scénario (`r := r || jsonb_build_object('<clé>', …)`), hors `diag_*`.
//   lireCompteRendu(f, { empreinte, cles })   refuse un fichier absent ou de 0 octet, sans `ESSAI_A_SEC <empreinte> {…}`,
//                          sans la ligne `APRES rien_ne_reste=true`, dont l'empreinte n'est pas celle du jumeau courant, ou
//                          dont le JSON n'a pas chaque clé attendue à true (ou porte un false ailleurs).
//   nonRegression(racine, { exclus })          aucune migration, aucun jumeau ni contrôle existant modifié (git diff HEAD ;
//                          sur une copie non Git : chaque fichier comparé au blob de HEAD du dépôt qui porte ce module, lu
//                          par `ls-tree --full-tree`, fins de ligne normalisées),
//                          et `migrations-jumelles-e2e.mjs` vert, lancé sur la racine jugée.
//   creerRapport(juge, …)  la sortie : « PASS|FAIL|SAUTE <id> — … » par critère, puis « <juge> : PASS » ou « … : FAIL — ids ».
//   lireEnvLocal()         .env.local chargé dans process.env sans rien afficher (modèle : scripts/site-deposer.mjs:16).
//
// Les tags d'essai sont fixés par la fiche : `$essai_026$` pour le bloc, `$migration_026$` pour chaque jumeau.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { sansCommentaires, MARQUE_CONTROLE } from '../sql-nu.mjs'
import { git, estRacineGit, blobGit, listerFichiers, sous } from '../fixtures/025/commun.mjs'

export { MARQUE_CONTROLE }
export const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const TRAVAIL = path.join(R, '.orchestre', 'travail')
export const ETIQUETTE_ESSAI = 'essai_026'
export const ETIQUETTE_MIGRATION = 'migration_026'
const TAG_ESSAI = `$${ETIQUETTE_ESSAI}$`
const TAG_MIGRATION = `$${ETIQUETTE_MIGRATION}$`

const court = (t, n = 160) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const lf = (t) => String(t).replace(/\r\n?/g, '\n')

// ── Découpage ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const CAR_IDENT = /[A-Za-z0-9_$\u0080-￿]/
const RE_TAG = /^\$([A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*)?\$/

/** Le SQL en segments { type, texte, ferme, tag?, corps? } ; `type` : code | chaine | ident | dollar | commentaire. */
export function segments(sql) {
  const s = String(sql)
  const out = []
  let code = '', i = 0
  const pousser = (seg) => { if (code) { out.push({ type: 'code', texte: code, ferme: true }); code = '' } out.push(seg) }
  while (i < s.length) {
    const c = s[i]
    if (c === '-' && s[i + 1] === '-') {
      const nl = s.indexOf('\n', i); const j = nl === -1 ? s.length : nl
      pousser({ type: 'commentaire', texte: s.slice(i, j), ferme: true }); i = j; continue
    }
    if (c === '/' && s[i + 1] === '*') { // Postgres imbrique les commentaires de bloc
      let prof = 0, j = i
      while (j < s.length) {
        if (s[j] === '/' && s[j + 1] === '*') { prof++; j += 2 } else if (s[j] === '*' && s[j + 1] === '/') { prof--; j += 2; if (!prof) break } else j++
      }
      pousser({ type: 'commentaire', texte: s.slice(i, j), ferme: prof === 0 }); i = j; continue
    }
    if (c === "'") {
      const echappe = /[eE]/.test(s[i - 1] || '') && !CAR_IDENT.test(s[i - 2] || '') // E'…' : \' n'est pas une fin
      let j = i + 1, ferme = false
      while (j < s.length) {
        if (echappe && s[j] === '\\') { j += 2; continue }
        if (s[j] === "'") { if (s[j + 1] === "'") { j += 2; continue } j++; ferme = true; break }
        j++
      }
      pousser({ type: 'chaine', texte: s.slice(i, j), ferme }); i = j; continue
    }
    if (c === '"') {
      let j = i + 1, ferme = false
      while (j < s.length) { if (s[j] === '"') { if (s[j + 1] === '"') { j += 2; continue } j++; ferme = true; break } j++ }
      pousser({ type: 'ident', texte: s.slice(i, j), ferme }); i = j; continue
    }
    if (c === '$' && !CAR_IDENT.test(s[i - 1] || '')) {
      const m = RE_TAG.exec(s.slice(i, i + 130))
      if (m) {
        const fin = s.indexOf(m[0], i + m[0].length)
        const ferme = fin !== -1
        const j = ferme ? fin + m[0].length : s.length
        pousser({ type: 'dollar', texte: s.slice(i, j), tag: m[1] || '', corps: s.slice(i + m[0].length, ferme ? fin : s.length), ferme })
        i = j; continue
      }
    }
    code += c; i++
  }
  if (code) out.push({ type: 'code', texte: code, ferme: true })
  return out
}

/** Les instructions (sans le « ; »), commentaires ôtés par le tokenizer de sql-nu.mjs, chaînes et blocs $tag$ respectés. */
export function instructions(sql) {
  const out = []
  let cur = ''
  for (const seg of segments(sansCommentaires(lf(sql)))) {
    if (seg.type === 'commentaire') continue
    if (seg.type !== 'code') { cur += seg.texte; continue }
    for (const ch of seg.texte) {
      if (ch === ';') { if (cur.trim()) out.push(cur.trim()); cur = '' } else cur += ch
    }
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

const normaliserCode = (t) => t.toLowerCase().replace(/\s+/g, ' ').replace(/!=/g, '<>')
  .replace(/\s*\(\s*/g, '(').replace(/\s*\)/g, ')').replace(/\s*,\s*/g, ', ').replace(/\s*::\s*/g, '::')

/** Forme comparable d'un SQL : voir l'en-tête. Les commentaires sont ôtés. */
export function normaliser(sql) {
  let out = ''
  for (const seg of segments(sansCommentaires(lf(sql)))) {
    if (seg.type === 'commentaire') continue
    out += seg.type === 'code' ? normaliserCode(seg.texte) : seg.texte
  }
  return out.replace(/ {2,}/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim()
}

/** Le code seul (chaînes vidées en '', blocs $tag$ remplacés par $$, commentaires ôtés), normalisé. */
export function codeSeul(sql) {
  let out = ''
  for (const seg of segments(sansCommentaires(lf(sql)))) {
    if (seg.type === 'commentaire') continue
    if (seg.type === 'code') out += normaliserCode(seg.texte)
    else if (seg.type === 'chaine') out += "''"
    else if (seg.type === 'dollar') out += '$$'
    else out += seg.texte.toLowerCase()
  }
  return out.replace(/ {2,}/g, ' ').trim()
}

/**
 * Le même texte, de la même longueur, où l'intérieur des chaînes, des identifiants entre guillemets, des blocs $tag$ et des
 * commentaires est remplacé par « _ » (délimiteurs gardés) : on y cherche parenthèses, virgules et mots-clés sans être
 * trompé par une chaîne, puis on découpe le texte d'origine aux mêmes positions.
 */
export function masquer(sql) {
  let out = ''
  for (const seg of segments(lf(sql))) {
    if (seg.type === 'code') { out += seg.texte; continue }
    if (seg.type === 'commentaire') { out += ' '.repeat(seg.texte.length); continue }
    if (seg.type === 'dollar') {
      const t = `$${seg.tag}$`
      const fin = seg.ferme ? t : ''
      out += t + '_'.repeat(seg.texte.length - t.length - fin.length) + fin
      continue
    }
    const q = seg.texte[0]
    out += seg.texte.length < 2 ? seg.texte : q + '_'.repeat(seg.texte.length - 2) + seg.texte.at(-1)
  }
  return out
}
/** L'indice de la parenthèse fermante qui répond à l'ouvrante en `i` (sur le texte masqué), ou -1. */
export function fermante(masque, i) {
  let prof = 0
  for (let j = i; j < masque.length; j++) {
    if (masque[j] === '(') prof++
    else if (masque[j] === ')') { prof--; if (!prof) return j }
  }
  return -1
}
/** Découpe `texte` aux virgules de premier niveau (hors parenthèses, crochets, chaînes et blocs). */
export function decouperVirgules(texte) {
  const t = lf(texte), m = masquer(t)
  const out = []
  let prof = 0, debut = 0
  for (let j = 0; j < m.length; j++) {
    const c = m[j]
    if (c === '(' || c === '[') prof++
    else if (c === ')' || c === ']') prof--
    else if (c === ',' && prof === 0) { out.push(t.slice(debut, j).trim()); debut = j + 1 }
  }
  if (t.slice(debut).trim()) out.push(t.slice(debut).trim())
  return out
}
/** Forme compacte pour chercher une règle : minuscules, aucun blanc, `!=` écrit `<>`, commentaires ôtés. */
export const compacter = (sql) => sansCommentaires(lf(sql)).toLowerCase().replace(/!=/g, '<>').replace(/\s+/g, '')
/**
 * Forme serrée : comme compacter, mais un blanc reste entre deux mots (« and statut in('file','bail') ») : on y lit une liste
 * de valeurs sans confondre `statut` avec `v_statut` ni avec la fin du mot qui le précède.
 */
export const serrer = (sql) => sansCommentaires(lf(sql)).toLowerCase().replace(/!=/g, '<>').replace(/\s+/g, ' ')
  .replace(/ ?([^\w\s]) ?/g, '$1').trim()

/**
 * Un jumeau nu d'exemple, pour `--generer-essai` en témoin et pour la preuve de 026-009 : une table, une fonction dont le corps
 * porte un commentaire et un « ; », une chaîne qui contient « ; », « -- » et une apostrophe doublée. Rien de ce qu'il crée
 * n'existe en base, et il n'est jamais exécuté par un juge.
 */
export const JUMEAU_EXEMPLE = [
  "create table if not exists public.essai_exemple_026 (id bigint generated always as identity primary key, libelle text not null default 'l''exemple ; avec -- un piège');",
  'create or replace function public.essai_exemple_026_compter()',
  'returns bigint language plpgsql stable as $fn$',
  'begin',
  '  -- un commentaire dans le corps ; il reste dans le jumeau nu',
  '  return (select count(*) from public.essai_exemple_026);',
  'end',
  '$fn$;',
  "comment on table public.essai_exemple_026 is 'exemple du juge ops-sql-qa (026-009) : jamais exécuté';",
  '',
].join('\n')

/** Chaînes, commentaires et blocs refermés ; parenthèses équilibrées dans le code (et dans chaque bloc $tag$). */
export function seParse(sql, profondeur = 0) {
  const raisons = []
  let par = 0
  for (const seg of segments(lf(sql))) {
    if (!seg.ferme) raisons.push(`${seg.type === 'dollar' ? `bloc $${seg.tag}$` : seg.type} non refermé : « ${court(seg.texte, 60)} »`)
    if (seg.type === 'code') { for (const ch of seg.texte) { if (ch === '(') par++; else if (ch === ')') par-- } }
    if (seg.type === 'dollar' && seg.ferme && profondeur < 4) {
      const r = seParse(seg.corps, profondeur + 1)
      for (const x of r.raisons) raisons.push(`dans $${seg.tag}$ : ${x}`)
    }
  }
  if (par !== 0) raisons.push(`parenthèses déséquilibrées (${par > 0 ? `${par} de trop` : `${-par} manquante(s)`})`)
  return { ok: raisons.length === 0, raisons }
}

// ── Jumeau, empreinte, bloc d'essai ────────────────────────────────────────────────────────────────────────────────────────
/** Le jumeau nu, coupé à MARQUE_CONTROLE (le contrôle ne fait que lire), fins de ligne en LF. Lève si le fichier manque. */
export function jumeauNuCoupe(fichier) {
  return lf(fs.readFileSync(fichier, 'utf8')).split(MARQUE_CONTROLE)[0]
}
export const empreinte = (texte) => crypto.createHash('sha256').update(String(texte), 'utf8').digest('hex')

/** Le bloc d'essai à sec : un seul énoncé, voir l'en-tête. */
export function blocEssai({ nus, scenario, empreinte: e }) {
  if (!Array.isArray(nus) || !nus.length || nus.some((n) => typeof n !== 'string' || !n.trim())) throw new Error('blocEssai : au moins un jumeau nu non vide')
  if (typeof scenario !== 'string' || !scenario.trim()) throw new Error('blocEssai : scénario vide')
  if (!/^[0-9a-f]{64}$/.test(String(e))) throw new Error('blocEssai : empreinte sha256 hexadécimale attendue')
  const textes = [...nus.map((n, k) => [`le jumeau ${k + 1}`, n]), ['le scénario', scenario]]
  for (const [nom, t] of textes) for (const tag of [TAG_ESSAI, TAG_MIGRATION]) {
    if (t.includes(tag)) throw new Error(`blocEssai : ${nom} contient déjà l'étiquette ${tag} — bloc refusé`)
  }
  const l = ['do $essai_026$', 'declare', "  r jsonb := '{}'::jsonb;", 'begin']
  for (const nu of nus) l.push(`  execute ${TAG_MIGRATION}${lf(nu)}${TAG_MIGRATION};`)
  l.push(lf(scenario).trimEnd())
  l.push(`  raise exception 'ESSAI_A_SEC % %', '${e}', r::text;`)
  l.push(`end ${TAG_ESSAI};`)
  return `${l.join('\n')}\n`
}

const MOTS_INTERDITS_ESSAI = [
  ['commit', /\bcommit\b/], ['rollback', /\brollback\b/], ['grant', /\bgrant\b/], ['drop schema', /\bdrop\s+schema\b/], ['vault.', /\bvault\s*\./],
]
/**
 * JP-3 : { ok, raisons[], enonces, charges (jumeaux exécutés), corps (le PL/pgSQL hors jumeaux), octets }.
 * `nus` (facultatif) : les jumeaux attendus, dans l'ordre — chaque charge doit leur être identique.
 */
export function analyserEssai(bloc, { nus = null } = {}) {
  const raisons = []
  const texte = lf(bloc)
  const instr = instructions(texte)
  if (instr.length !== 1) raisons.push(`${instr.length} énoncé(s), un seul attendu`)
  if (!/^do\s+\$essai_026\$/i.test(texte.trim())) raisons.push('ne commence pas par « do $essai_026$ »')
  if (!/\$essai_026\$\s*;\s*$/.test(texte)) raisons.push('ne se termine pas par « $essai_026$; »')
  const p = seParse(texte)
  if (!p.ok) raisons.push(`ne se parse pas : ${p.raisons.slice(0, 3).join(' ; ')}`)
  // le tokenizer de sql-nu.mjs ne doit pas voir le bloc autrement : même nombre d'étiquettes après ses retraits
  const vuParSqlNu = sansCommentaires(texte)
  const compter = (t, tag) => t.split(tag).length - 1
  if (compter(vuParSqlNu, TAG_ESSAI) !== compter(texte, TAG_ESSAI) || compter(vuParSqlNu, TAG_MIGRATION) !== compter(texte, TAG_MIGRATION)) {
    raisons.push('le tokenizer de sql-nu.mjs retire une étiquette : un commentaire mal fermé avale une partie du bloc')
  }
  const blocs = segments(texte).filter((s) => s.type === 'dollar' && s.tag === ETIQUETTE_ESSAI)
  let corps = '', charges = []
  if (blocs.length !== 1) raisons.push(`${blocs.length} bloc(s) $essai_026$, un seul attendu`)
  else {
    const segs = segments(blocs[0].corps)
    charges = segs.filter((s) => s.type === 'dollar' && s.tag === ETIQUETTE_MIGRATION).map((s) => s.corps)
    if (!charges.length) raisons.push('aucun jumeau exécuté par « execute $migration_026$…$migration_026$ »')
    const autres = segs.filter((s) => s.type === 'dollar' && s.tag !== ETIQUETTE_MIGRATION)
    if (autres.length) raisons.push(`bloc(s) $…$ inattendu(s) dans le corps : ${autres.map((s) => `$${s.tag}$`).join(', ')}`)
    const code = segs.filter((s) => s.type === 'code').map((s) => s.texte).join(' ').toLowerCase()
    for (const [nom, re] of MOTS_INTERDITS_ESSAI) if (re.test(code)) raisons.push(`« ${nom} » hors des chaînes`)
    corps = segs.filter((s) => !(s.type === 'dollar' && s.tag === ETIQUETTE_MIGRATION)).map((s) => s.texte).join('')
    if (!/raise\s+exception\s+'ESSAI_A_SEC %[^']*'\s*,[^;]*;\s*end\s*$/i.test(sansCommentaires(corps).trimEnd())) {
      raisons.push("la dernière instruction n'est pas « raise exception 'ESSAI_A_SEC % %', … »")
    }
    // chaque jumeau est l'argument d'un « execute » (le segment de code qui le précède finit par ce mot) et suivi d'un « ; »
    segs.forEach((s, k) => {
      if (!(s.type === 'dollar' && s.tag === ETIQUETTE_MIGRATION)) return
      const prec = segs[k - 1], suiv = segs[k + 1]
      if (!prec || prec.type !== 'code' || !/\bexecute\s*$/i.test(prec.texte)) raisons.push(`le jumeau ${charges.indexOf(s.corps) + 1} n'est pas passé à execute`)
      if (!suiv || suiv.type !== 'code' || !/^\s*;/.test(suiv.texte)) raisons.push(`le jumeau ${charges.indexOf(s.corps) + 1} n'est pas suivi de « ; »`)
    })
    if (nus) {
      if (charges.length !== nus.length) raisons.push(`${charges.length} jumeau(x) exécuté(s), ${nus.length} attendu(s)`)
      else nus.forEach((n, k) => { if (charges[k] !== lf(n)) raisons.push(`le jumeau ${k + 1} exécuté n'est pas identique au jumeau nu coupé`) })
    }
  }
  return { ok: raisons.length === 0, raisons, enonces: instr.length, charges: charges.length, corps, octets: Buffer.byteLength(texte) }
}

/** Les clés d'assertion d'un scénario : `r := r || jsonb_build_object('<clé>', …)`, sauf les diagnostics `diag_*`. */
export function clesScenario(sql) {
  const cles = new Set()
  for (const m of sansCommentaires(lf(sql)).matchAll(/\br\s*:=\s*r\s*\|\|\s*jsonb_build_object\(\s*'([a-z0-9_]+)'\s*,/gi)) {
    if (!m[1].startsWith('diag_')) cles.add(m[1])
  }
  return [...cles]
}

// ── Compte rendu de l'essai ────────────────────────────────────────────────────────────────────────────────────────────────
function objetJsonA(texte, debut) {
  const i = texte.indexOf('{', debut)
  if (i < 0) return null
  let prof = 0, dans = false
  for (let j = i; j < texte.length; j++) {
    const c = texte[j]
    if (dans) { if (c === '\\') j++; else if (c === '"') dans = false; continue }
    if (c === '"') dans = true
    else if (c === '{') prof++
    else if (c === '}') { prof--; if (!prof) return texte.slice(i, j + 1) }
  }
  return null
}
function lireJsonTolerant(brut) {
  for (const essai of [brut, brut.replace(/\\\\/g, '\u0000').replace(/\\"/g, '"').replace(/\u0000/g, '\\')]) {
    try { const o = JSON.parse(essai); if (o && typeof o === 'object' && !Array.isArray(o)) return o } catch { /* forme suivante */ }
  }
  return null
}
/**
 * Relit essai-a-sec.txt : { ok, raisons[], empreinte, resultat, apres }. Le message d'erreur de l'essai (recopié tel que
 * execute_sql le rend) porte `ESSAI_A_SEC <empreinte> {json}` ; s'il y en a plusieurs, le dernier compte. Le JSON peut être
 * échappé (\") par l'enveloppe de l'outil. `empreinte` : celle du jumeau courant ; `cles` : les clés du scénario.
 */
export function lireCompteRendu(fichier, { empreinte: attendue = null, cles = null } = {}) {
  const raisons = []
  let brut
  try { brut = fs.readFileSync(fichier) } catch { return { ok: false, raisons: [`${path.basename(fichier)} absent`], empreinte: null, resultat: null, apres: null } }
  if (!brut.length) return { ok: false, raisons: [`${path.basename(fichier)} : 0 octet — une preuve vide est un refus`], empreinte: null, resultat: null, apres: null }
  const texte = lf(brut.toString('utf8'))
  const occ = [...texte.matchAll(/ESSAI_A_SEC\s+([0-9a-f]{64})\b/g)]
  const m = occ.at(-1)
  let resultat = null
  if (!m) raisons.push('aucune ligne « ESSAI_A_SEC <empreinte sha256> {…} » : le message de l\'essai n\'est pas recopié')
  else {
    // l'enveloppe de l'outil (execute_sql rend son erreur dans un JSON) échappe le message une fois, parfois deux : on essaie
    // le texte brut, puis une et deux fois désenveloppé (\" → ", \\ → \, \n → fin de ligne)
    const desenvelopper = (t) => t.replace(/\\\\/g, '\u0000').replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\u0000/g, '\\')
    const reste = texte.slice(m.index + m[0].length)
    for (const c of [reste, desenvelopper(reste), desenvelopper(desenvelopper(reste))]) {
      const j = objetJsonA(c, 0)
      resultat = j ? lireJsonTolerant(j) : null
      if (resultat) break
    }
    if (!resultat) raisons.push('le JSON qui suit ESSAI_A_SEC est absent ou illisible')
  }
  const apres = [...texte.matchAll(/^APRES rien_ne_reste=(\S+)\s*$/gm)].at(-1)
  if (!apres) raisons.push('ligne « APRES rien_ne_reste=true » absente : rien ne prouve que l\'essai n\'a rien laissé')
  else if (apres[1] !== 'true') raisons.push(`APRES rien_ne_reste=${apres[1]} : l'essai a laissé une trace`)
  if (attendue && m && m[1] !== attendue) raisons.push(`empreinte ${m[1].slice(0, 12)}… ≠ celle du jumeau courant ${String(attendue).slice(0, 12)}… : l'essai a porté sur un autre texte`)
  if (resultat) {
    const manquantes = (cles || []).filter((c) => !(c in resultat))
    const fausses = Object.entries(resultat).filter(([k, v]) => !k.startsWith('diag_') && ((cles || []).includes(k) ? v !== true : v === false)).map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    if (manquantes.length) raisons.push(`clé(s) attendue(s) absente(s) : ${manquantes.slice(0, 8).join(', ')}${manquantes.length > 8 ? ` (et ${manquantes.length - 8} autres)` : ''}`)
    if (fausses.length) {
      const diags = Object.entries(resultat).filter(([k]) => k.startsWith('diag_')).map(([k, v]) => `${k}: ${court(v, 80)}`)
      raisons.push(`clé(s) qui ne valent pas true : ${fausses.slice(0, 8).join(', ')}${fausses.length > 8 ? ` (et ${fausses.length - 8} autres)` : ''}${diags.length ? ` — ${diags.slice(0, 3).join(' ; ')}` : ''}`)
    }
  }
  return { ok: raisons.length === 0, raisons, empreinte: m ? m[1] : null, resultat, apres: apres ? apres[1] : null }
}

// ── Non-régression ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const CHEMINS_NON_REGRESSION = ['supabase/migrations', 'supabase/controles']
const posix = (p) => p.split(path.sep).join('/')
/**
 * Aucune migration, aucun jumeau ni aucun contrôle existant n'a changé (hors `exclus`, les fichiers de la migration jugée), et
 * migrations-jumelles-e2e.mjs est vert sur la racine. → { ok, echecs[], resume }.
 * Racine d'un dépôt Git : `git diff --name-status HEAD` sur ces chemins (un fichier non suivi n'est pas un changement).
 * Copie (arbre extrait, copie mutée) : chaque fichier de HEAD sous ces chemins comparé à la copie, fins de ligne normalisées.
 */
export function nonRegression(racine, { exclus = [] } = {}) {
  const echecs = []
  const ex = new Set(exclus)
  let changes = []
  let mode
  if (estRacineGit(racine)) {
    mode = 'git diff HEAD'
    const d = git(['diff', '--name-status', 'HEAD', '--', ...CHEMINS_NON_REGRESSION], { cwd: racine })
    if (d.code !== 0) echecs.push(`git diff HEAD en erreur : ${court(d.stderr || d.erreur)}`)
    changes = d.stdout.split('\n').filter(Boolean).map((l) => { const [etat, ...ch] = l.split('\t'); return { etat, chemin: ch.at(-1) } })
  } else {
    mode = 'copie comparée aux blobs de HEAD'
    for (const prefixe of CHEMINS_NON_REGRESSION) {
      // --full-tree : quand le juge tourne depuis une copie rangée DANS le dépôt (.orchestre/travail/…), git remonte au dépôt
      // et lirait les chemins relativement à ce sous-dossier : l'arbre serait vide et la comparaison passerait à vide.
      const t = git(['ls-tree', '-r', '--full-tree', '--name-only', '-z', 'HEAD', '--', prefixe], { cwd: R })
      if (t.code !== 0) { echecs.push(`git ls-tree HEAD ${prefixe} : ${court(t.stderr || t.erreur)}`); continue }
      const arbre = t.stdout.split('\0').filter(Boolean).map((rel) => [rel])
      if (!arbre.length) { echecs.push(`git ls-tree HEAD ${prefixe} : aucun fichier — la comparaison ne prouverait rien`); continue }
      for (const [rel] of arbre) {
        const f = path.join(racine, rel)
        if (!fs.existsSync(f)) { changes.push({ etat: 'D', chemin: rel }); continue }
        const blob = blobGit(R, 'HEAD', rel)
        if (blob === null || lf(blob.toString('utf8')) !== lf(fs.readFileSync(f, 'utf8'))) changes.push({ etat: 'M', chemin: rel })
      }
    }
  }
  const retenus = changes.filter((c) => !ex.has(c.chemin))
  if (retenus.length) echecs.push(`${retenus.length} fichier(s) existant(s) changé(s) (${mode}) : ${retenus.slice(0, 5).map((c) => `${c.etat} ${c.chemin}`).join(', ')}${retenus.length > 5 ? ' …' : ''}`)
  const j = spawnSync(process.execPath, [path.join(R, 'scripts', 'migrations-jumelles-e2e.mjs')], { cwd: racine, encoding: 'utf8', timeout: 180_000, maxBuffer: 64 << 20, windowsHide: true })
  const bilan = (j.stdout || '').split('\n').map((l) => l.trim()).filter((l) => /réussis, \d+ échoués/.test(l)).at(-1) || ''
  if (j.status !== 0) {
    const rouges = (j.stdout || '').split('\n').filter((l) => l.includes('❌')).slice(0, 2).map((l) => court(l, 120))
    echecs.push(`migrations-jumelles-e2e.mjs en code ${j.status}${j.error ? ` (${court(j.error.message)})` : ''} : ${rouges.join(' ; ') || court(bilan || j.stderr, 160)}`)
  }
  const resume = `${mode} : aucun fichier existant de ${CHEMINS_NON_REGRESSION.join(', ')} changé${ex.size ? ` (hors ${[...ex].map((x) => path.basename(x)).join(', ')})` : ''} ; migrations-jumelles-e2e.mjs vert (${court(bilan.replace(/^✅\s*/, ''), 60)})`
  return { ok: echecs.length === 0, echecs, resume }
}

// ── Sortie ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * const s = creerRapport('ops-sql-qa', ids, { entete: 'ops-sql-qa 0096 — racine …' })
 * s.passe(id, d) · s.echoue(id, d) · s.saute(id, d) · s.verdict(id, ok, dOk, dKo) · s.note(t) · s.fin() → code (0 ou 1)
 * Un échec est collant. Un critère déclaré jamais évalué est un échec (« non évalué »). Un critère sauté n'est pas un échec.
 */
export function creerRapport(juge, ids, { entete } = {}) {
  const etat = new Map(ids.map((id) => [id, { passes: [], echecs: [], saute: null }]))
  const notes = []
  const e = (id) => { if (!etat.has(id)) etat.set(id, { passes: [], echecs: [`critère non déclaré par le juge`], saute: null }); return etat.get(id) }
  const s = {
    passe(id, d = '') { e(id).passes.push(String(d)) },
    echoue(id, d) { e(id).echecs.push(String(d || 'échec sans détail')) },
    saute(id, d) { e(id).saute = String(d) },
    verdict(id, ok, dOk = '', dKo = '') { if (ok) s.passe(id, dOk); else s.echoue(id, dKo || dOk) },
    note(t) { notes.push(String(t)) },
    enEchec: (id) => (etat.get(id)?.echecs.length || 0) > 0,
    evalue: (id) => { const x = etat.get(id); return !!x && (x.passes.length + x.echecs.length > 0 || x.saute !== null) },
    lignes() {
      const out = []
      for (const [id, x] of etat) {
        if (x.echecs.length) out.push(`FAIL ${id} — ${x.echecs.slice(0, 4).join(' ; ')}${x.echecs.length > 4 ? ` (et ${x.echecs.length - 4} autre(s))` : ''}`)
        else if (x.saute !== null) out.push(`SAUTE ${id} — ${x.saute}`)
        else if (x.passes.length) out.push(`PASS ${id} — ${x.passes.filter(Boolean).join(' ; ') || 'conforme'}`)
        else out.push(`FAIL ${id} — non évalué`)
      }
      return out
    },
    fin() {
      const lignes = s.lignes()
      const rouges = lignes.filter((l) => l.startsWith('FAIL ')).map((l) => l.split(' ')[1])
      console.log(entete || juge)
      for (const n of notes) console.log(`  · ${n}`)
      for (const l of lignes) console.log(l)
      console.log(rouges.length ? `${juge} : FAIL — ${rouges.join(', ')}` : `${juge} : PASS`)
      return rouges.length ? 1 : 0
    },
  }
  return s
}
/** La sortie d'un juge de la série : { lignes: [{ verdict, id, detail }], juge, verdict, rouges[] }. */
export function analyserSortieJuge(texte) {
  const out = { lignes: [], juge: null, verdict: null, rouges: [] }
  for (const l of String(texte).split(/\r?\n/)) {
    const m = /^(PASS|FAIL|SAUTE) (\S+) — (.*)$/.exec(l)
    if (m) { out.lignes.push({ verdict: m[1], id: m[2], detail: m[3] }); continue }
    const f = /^(\S+) : (PASS|FAIL)(?: — (.*))?$/.exec(l)
    if (f) { out.juge = f[1]; out.verdict = f[2]; out.rouges = f[3] ? f[3].split(', ') : [] }
  }
  return out
}

// ── Divers ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** .env.local du dépôt dans process.env, sans rien afficher (scripts/site-deposer.mjs:16). → la liste des noms présents. */
export function lireEnvLocal(racine = R) {
  const f = path.join(racine, '.env.local')
  const noms = []
  for (const l of fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/) : []) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m) { noms.push(m[1]); if (!process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
  }
  return noms
}
/** Un dossier de travail sous .orchestre/travail/<nom>/ (créé) ; lève si le chemin en sortait. */
export function dossierTravail(...parties) {
  const d = path.join(TRAVAIL, ...parties)
  if (!sous(TRAVAIL, d)) throw new Error(`dossier de travail hors de .orchestre/travail/ : ${d}`)
  fs.mkdirSync(d, { recursive: true })
  return d
}
export { court, lf, posix, listerFichiers }
