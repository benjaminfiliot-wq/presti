#!/usr/bin/env node
// scripts/ops-sql-qa.mjs — le juge SQL du bus des agents (schéma ops), migrations 0096, 0097 et 0098 ; écrit par Claude Code
// (fiche 026-009) AVANT les migrations qu'il juge (026-010, 026-011, 026-013), qui ne peuvent pas le modifier.
//
// Depuis le 14/09, la connexion directe à la base est refusée : le juge ne lance aucun SQL. Il juge en trois temps :
//   1. la lecture statique de la migration, de ses deux jumeaux et de son contrôle, contre le contrat machine
//      scripts/fixtures/026-horloge-bus/contrat-ops.json (un seul contrat, recopié des fiches 05 à 09 et 16) ;
//   2. l'essai à sec, qu'il GÉNÈRE lui-même (--generer-essai) et dont il relit le compte rendu recopié par Claude Code dans
//      .orchestre/preuves/<fiche>/essai-a-sec.txt (empreinte du jumeau courant, APRES rien_ne_reste=true, chaque clé du
//      scénario scripts/fixtures/026-horloge-bus/essais/<n>.sql à true) ;
//   3. --reel, après l'application par Claude Code (apply_migration), par PostgREST avec la clé de service et la clé anonyme.
//
// Critères (une ligne par critère, « PASS|FAIL|SAUTE <id> — … », puis « ops-sql-qa : PASS » ou « … : FAIL — ids ») :
//   0096  OS-1 fichier et liste permise · OS-2 idempotence · OS-3 contrat (tables, colonnes, types, contraintes, index) ·
//         OS-4 fermeture · OS-5 graines · OS-6 jumeaux · OS-7 contrôle · OS-8 essai à sec · OS-9 non-régression · OS-10 --reel
//   0097  OI-1 fichier · OI-2 fonctions du contrat · OI-3 sécurité · OI-4 corps · OI-5 jumeaux et contrôle · OI-6 essai ·
//         OI-7 non-régression · OI-8 --reel
//   0098  OT-1 … OT-8, même découpage qu'en 0097 (cahier OT de 026-013).
//
// Usage :
//   node scripts/ops-sql-qa.mjs --migration=0096|0097|0098 [--racine=<dossier>] [--sans-essai]
//        le verdict. Sur une racine qui n'est pas un dépôt Git (arbre extrait, copie mutée), la non-régression compare ses
//        fichiers aux blobs de HEAD du dépôt de ce juge. --sans-essai (mutations de 026-091 seulement : une copie mutée n'a
//        pas d'essai à elle) note le critère d'essai « sauté » ; aucun `verifier` ne l'emploie.
//   node scripts/ops-sql-qa.mjs --migration=… --temoin
//        les seuls critères de non-régression (définition de 025-01) : aucune migration, aucun jumeau ni contrôle existant
//        modifié, migrations-jumelles-e2e.mjs vert, le scénario se parse et porte toutes les clés du contrat, et
//        --generer-essai rend un bloc valide sur le jumeau d'exemple. Les critères de fabrication sont « sautés ».
//   node scripts/ops-sql-qa.mjs --migration=… --generer-essai [--avec=0096,0097] [--racine=<dossier>]
//        écrit sur la sortie standard le bloc `do $essai_026$ … $essai_026$;` (jumeaux de --avec d'abord, dans l'ordre des
//        numéros, puis celui de la migration) ; la requête « après » part sur la sortie d'erreur. Code 2 si un jumeau manque.
//   node scripts/ops-sql-qa.mjs --migration=… --reel
//        PostgREST (.env.local chargé sans rien afficher). Code 2 si un préalable manque (clés absentes, migration pas
//        encore appliquée : ses fonctions sont inconnues de PostgREST). Écrit en base des lignes essai_e2e_<aléa>, effacées
//        dans un finally. Ne se lance que sur la racine du dépôt.
// Codes : 0 tout est vert · 1 un critère est rouge · 2 appel invalide ou préalable manquant. N'écrit que sous
// .orchestre/travail/ops-sql-qa/. N'affiche aucun secret.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  R, MARQUE_CONTROLE, instructions, normaliser, codeSeul, seParse, segments, masquer, fermante, decouperVirgules, compacter,
  jumeauNuCoupe, empreinte, blocEssai, analyserEssai, clesScenario, lireCompteRendu, nonRegression, creerRapport, lireEnvLocal,
  dossierTravail, court, lf, JUMEAU_EXEMPLE, serrer,
} from './lib/sql-essai.mjs'
import { lireOptionsOuQuitter } from './fixtures/025/commun.mjs'

const NOM = 'ops-sql-qa'
const CONTRAT_F = 'scripts/fixtures/026-horloge-bus/contrat-ops.json'
const CONTRAT = JSON.parse(fs.readFileSync(path.join(R, CONTRAT_F), 'utf8'))
const ROLES = {
  '0096': { fichier: 'OS-1', idempotence: 'OS-2', contrat: 'OS-3', fermeture: 'OS-4', graines: 'OS-5', jumeaux: 'OS-6', controle: 'OS-7', essai: 'OS-8', nr: 'OS-9', reel: 'OS-10' },
  '0097': { fichier: 'OI-1', fonctions: 'OI-2', securite: 'OI-3', corps: 'OI-4', jumeaux: 'OI-5', controle: 'OI-5', essai: 'OI-6', nr: 'OI-7', reel: 'OI-8' },
  '0098': { fichier: 'OT-1', fonctions: 'OT-2', securite: 'OT-3', corps: 'OT-4', jumeaux: 'OT-5', controle: 'OT-5', essai: 'OT-6', nr: 'OT-7', reel: 'OT-8' },
}
const ROLES_FERMES = ['public', 'anon', 'authenticated', 'service_role']
const TABLES_OPS = Object.entries(CONTRAT.tables).filter(([, t]) => t.migration === '0096').map(([n]) => n)

// ── Options ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['migration', 'generer-essai', 'avec', 'sans-essai'] })
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
const num = o.valeur('migration')
if (!ROLES[num]) refuser(`--migration=0096|0097|0098 attendu (reçu : ${num ?? 'rien'})`)
const GENERER = o.drapeau('generer-essai'), SANS_ESSAI = o.drapeau('sans-essai'), AVEC = o.liste('avec')
if (o.valeur('generer-essai') !== undefined || o.valeur('sans-essai') !== undefined) refuser('--generer-essai et --sans-essai ne prennent pas de valeur')
if (o.drapeau('migration') || o.drapeau('avec')) refuser('--migration= et --avec= attendent une valeur')
if (GENERER && (o.temoin || o.reel || SANS_ESSAI)) refuser('--generer-essai se lance sans --temoin, --reel ni --sans-essai')
if (AVEC.length && !GENERER) refuser('--avec= ne sert qu\'avec --generer-essai')
if (SANS_ESSAI && (o.temoin || o.reel)) refuser('--sans-essai ne se combine ni avec --temoin ni avec --reel')
for (const a of AVEC) if (!ROLES[a] || a >= num) refuser(`--avec=${a} : une migration de la série antérieure à ${num} attendue`)
const M = CONTRAT.migrations[num]
const racine = o.racine
const ch = (rel) => path.join(racine, rel)
const aff = (p) => String(p).split(path.sep).join('/')
function lireSi(f) { try { const b = fs.readFileSync(f); return b.length ? lf(b.toString('utf8')) : '' } catch { return null } }
const listeTxt = (a, n = 6) => `${a.slice(0, n).join(', ')}${a.length > n ? ` (et ${a.length - n} autre(s))` : ''}`

// ── Petites lectures SQL ──────────────────────────────────────────────────────────────────────────────────────────────
const SYN = { int: 'integer', int4: 'integer', integer: 'integer', int8: 'bigint', bigint: 'bigint', bool: 'boolean', boolean: 'boolean',
  timestamptz: 'timestamptz', timestampwithtimezone: 'timestamptz', text: 'text', uuid: 'uuid', jsonb: 'jsonb', numeric: 'numeric',
  decimal: 'numeric', void: 'void', trigger: 'trigger', _text: 'text[]' }
function typeCanon(t) {
  let x = String(t).toLowerCase().replace(/\s+/g, '')
  const tab = x.endsWith('[]')
  if (tab) x = x.slice(0, -2)
  const m = /^([a-z_][a-z0-9_]*)(\(.*\))?$/.exec(x)
  const base = m ? (SYN[m[1]] || m[1]) : x
  return `${base}${m?.[2] || ''}${tab ? '[]' : ''}`
}
/** Le type en tête d'une définition de colonne ou de paramètre (texte normalisé). */
function typeEnTete(def) {
  const m = /^(timestamp(?:\(\d+\))? with(?:out)? time zone|double precision|character varying(?:\(\d+\))?|[a-z_][a-z0-9_.]*(?:\(\d+(?:, ?\d+)?\))?)(\[\])?/.exec(def.trim())
  return m ? `${m[1]}${m[2] || ''}` : ''
}
const sansCast = (v) => v.replace(/::[a-z_]+(\[\])?(\(\d+(,\d+)?\))?/g, '')
function canonDefaut(x) {
  let v = sansCast(String(x))
  while (v.startsWith('(') && fermante(v, 0) === v.length - 1) v = v.slice(1, -1)
  return /^-?\d+(\.\d+)?$/.test(v) ? String(Number(v)) : v
}
const MOTS_COL = /notnull|null|check\(|references|primarykey|unique|constraint|generated|collate|$/
function defautDe(defCompact) {
  const i = defCompact.indexOf('default')
  if (i < 0) return null
  const reste = defCompact.slice(i + 7)
  const m = MOTS_COL.exec(reste)
  return reste.slice(0, m ? m.index : reste.length)
}
/** La définition d'une colonne sans ses « check(…) » : un « is not null » de contrainte n'est pas un « not null » de colonne. */
function horsCheck(n) {
  let out = n
  for (let garde = 0; garde < 20; garde++) {
    const i = out.search(/\bcheck ?\(/)
    if (i < 0) break
    const a = out.indexOf('(', i), j = fermante(masquer(out), a)
    if (j < 0) break
    out = out.slice(0, i) + out.slice(j + 1)
  }
  return out
}
/** Les instructions d'un fichier, chacune sous trois formes : t (texte), n (normalisé), c (compact). */
const lireInstructions = (sql) => instructions(sql).map((t) => ({ t, n: normaliser(t), c: compacter(t) }))
function rolesApres(n, mot) {
  const i = n.lastIndexOf(` ${mot} `)
  if (i < 0) return []
  return n.slice(i + mot.length + 2).split(',').map((x) => x.trim().replace(/\s+(cascade|restrict)$/, '').replace(/"/g, '')).filter(Boolean)
}
/** Les segments avec leur position (ils se suivent sans trou). */
function segmentsPos(t) { let p = 0; return segments(t).map((s) => { const x = { ...s, debut: p }; p += s.texte.length; return x }) }

// ── Règles du contrat (DSL de contrat-ops.json) ─────────────────────────────────────────────────────────────────────────
function valeursListe(c, debut, fermant) {
  let prof = 0, j = debut
  for (; j < c.length; j++) {
    const x = c[j]
    if (x === '(' || x === '[' || x === '{') prof++
    else if (x === ')' || x === ']' || x === '}') { if (prof === 0) break; prof-- }
  }
  if (c[j] !== fermant) return null
  return c.slice(debut, j).split(',').map((v) => sansCast(v).replace(/^'|'$/g, '').replace(/^"|"$/g, '')).filter((v) => v !== '')
}
/** Les listes de valeurs posées sur `col` dans un texte SERRÉ (serrer) : col in(…), col=any(array[…]), col<@array[…], col<@'{…}'. */
function listesDe(c, col) {
  const out = []
  const re = new RegExp(`(?<![\\w.])${col} ?(in\\(|=any\\(array\\[|<@array\\[|<@'\\{)`, 'g')
  for (const m of c.matchAll(re)) {
    const fermant = m[1] === 'in(' ? ')' : m[1].endsWith('[') ? ']' : '}'
    const v = valeursListe(c, m.index + m[0].length, fermant)
    if (v) out.push(v)
  }
  return out
}
/**
 * `c` contient `s` (formes compactes), sans qu'un nombre final soit le début d'un plus grand : « between0and3 » ne se lit pas
 * dans « between0and30 », ni « <=4096 » dans « <=40960 », ni « length(x) » dans « char_length(x) » quand on cherche length.
 */
function inclut(c, s) {
  for (let i = c.indexOf(s); i >= 0; i = c.indexOf(s, i + 1)) {
    if (/\d$/.test(s) && /\d/.test(c[i + s.length] || '')) continue
    if (s.startsWith('length(') && c.slice(Math.max(0, i - 5), i) === 'char_') continue
    return true
  }
  return false
}
function regleOk(regle, c, sr) {
  if (regle.contient !== undefined) return inclut(c, compacter(regle.contient))
  if (regle.un_de) return regle.un_de.some((x) => inclut(c, compacter(x)))
  if (regle.entre) {
    const [e, a, b] = regle.entre, E = compacter(e)
    return inclut(c, `${E}between${a}and${b}`) || (inclut(c, `${E}>=${a}`) && inclut(c, `${E}<=${b}`))
  }
  if (regle.longueur) {
    const [col, a, b] = regle.longueur
    return ['char_length', 'length'].some((f) => {
      const E = `${f}(${col})`
      if (a !== null && b !== null) return inclut(c, `${E}between${a}and${b}`) || (inclut(c, `${E}>=${a}`) && inclut(c, `${E}<=${b}`))
      if (a === null) return inclut(c, `${E}<=${b}`) || inclut(c, `${E}<${b + 1}`)
      return inclut(c, `${E}>=${a}`) || inclut(c, `${E}>${a - 1}`)
    })
  }
  if (regle.taille_json) {
    const [col, n] = regle.taille_json
    return inclut(c, `pg_column_size(${col})<=${n}`) || inclut(c, `octet_length(${col}::text)<=${n}`)
  }
  if (regle.liste) {
    const [col, vals] = regle.liste
    const attendu = [...vals].sort().join(',')
    return listesDe(sr, col).some((v) => [...v].sort().join(',') === attendu)
  }
  throw new Error(`règle inconnue au contrat : ${JSON.stringify(regle)}`)
}

// ── Lecture d'une création de table et d'index ──────────────────────────────────────────────────────────────────────────
function parserTable(t) {
  const m = masquer(t)
  const i = m.indexOf('(')
  const j = i < 0 ? -1 : fermante(m, i)
  if (i < 0 || j < 0) return null
  const items = decouperVirgules(t.slice(i + 1, j))
  const colonnes = new Map(), contraintes = []
  for (const it of items) {
    const n = normaliser(it)
    if (/^(constraint|check|unique|primary key|foreign key|exclude)\b/.test(n)) { contraintes.push(n); continue }
    const nom = n.split(' ')[0].replace(/"/g, '')
    colonnes.set(nom, { n: n.slice(n.indexOf(' ') + 1), c: compacter(it.slice(it.indexOf(nom) + nom.length)) })
  }
  return { colonnes, contraintes, c: compacter(t), sr: serrer(t) }
}
function parserIndex(ins) {
  const m = /^create (unique )?index (?:if not exists )?(?:[a-z0-9_]+ )?on (?:only )?ops\.([a-z_]+)/.exec(ins.n)
  if (!m) return null
  const mm = masquer(ins.t)
  const i = mm.indexOf('(', mm.toLowerCase().indexOf(`ops.${m[2]}`))
  const j = i < 0 ? -1 : fermante(mm, i)
  if (j < 0) return null
  const ou = ins.t.slice(j + 1)
  const where = /^\s*where\b/i.test(ou) ? ou.replace(/^\s*where\b/i, '') : ''
  return { unique: !!m[1], table: m[2], colonnes: compacter(ins.t.slice(i + 1, j)), where: compacter(where), whereSerre: serrer(where) }
}

// ── Lecture d'une fonction ──────────────────────────────────────────────────────────────────────────────────────────────
function parserParam(p) {
  let n = normaliser(p).replace(/^(in|out|inout|variadic) /, '')
  n = n.split(/ default | = /)[0]
  const nom = n.split(' ')[0].replace(/"/g, '')
  return [nom, typeCanon(typeEnTete(n.slice(nom.length + 1)))]
}
function parserRend(texte) { // « table(a t, …) » ou un type → { table: [[nom, type]…] } | { type }
  const n = normaliser(texte).trim()
  if (/^table\(/.test(n)) {
    const i = n.indexOf('('), j = fermante(n, i)
    return { table: decouperVirgules(n.slice(i + 1, j)).map((x) => { const nom = x.split(' ')[0]; return [nom, typeCanon(typeEnTete(x.slice(nom.length + 1)))] }) }
  }
  if (/^setof /.test(n)) return { type: `setof ${typeCanon(typeEnTete(n.slice(6)))}` }
  return { type: typeCanon(typeEnTete(n)) }
}
const rendTxt = (r) => r.table ? `table(${r.table.map(([a, b]) => `${a} ${b}`).join(', ')})` : r.type
function parserFonction(ins) {
  const m = /^create (or replace )?function ([a-z_]+)\.([a-z0-9_]+)\(/.exec(ins.n)
  if (!m) return null
  const t = ins.t, mm = masquer(t)
  const i = mm.indexOf('('), j = fermante(mm, i)
  if (j < 0) return { schema: m[2], nom: m[3], orReplace: !!m[1], erreur: 'paramètres non refermés' }
  const params = decouperVirgules(t.slice(i + 1, j)).filter(Boolean).map(parserParam)
  const corpsSeg = segmentsPos(t).find((s) => s.type === 'dollar' && s.debut > j)
  const corps = corpsSeg ? corpsSeg.corps : ''
  const entete = corpsSeg ? t.slice(0, corpsSeg.debut) + '$$' + t.slice(corpsSeg.debut + corpsSeg.texte.length) : t
  const en = normaliser(entete), em = masquer(entete).toLowerCase()
  let rend = null
  const reRend = /\sreturns\s/g
  reRend.lastIndex = j
  const mr = reRend.exec(em)
  const k = mr ? mr.index : -1
  if (k >= 0) {
    const apres = entete.slice(k + mr[0].length).trimStart()
    const off = entete.length - apres.length
    if (/^table\s*\(/i.test(apres)) { const a = masquer(entete).indexOf('(', off); rend = parserRend(entete.slice(off, fermante(masquer(entete), a) + 1)) }
    else rend = parserRend(apres.split(/\s+(?:language|as|security|set|stable|immutable|volatile|strict|leakproof|parallel|cost|rows|called)\b/i)[0])
  }
  const sp = /set search_path (?:=|to) ([^ ,]+(?:, [^ ,]+)*)/.exec(en)
  return {
    schema: m[2], nom: m[3], orReplace: !!m[1], params, rend, corps, entete: en,
    definer: /\bsecurity definer\b/.test(en), searchPath: sp ? sp[1].split(', ').map((x) => x.replace(/^['"]|['"]$/g, '')) : null,
  }
}
/** Les instructions d'un corps PL/pgSQL (découpées aux « ; » hors chaînes). */
function instructionsCorps(corps) {
  const m = masquer(corps), out = []
  let d = 0
  for (let j = 0; j < m.length; j++) if (m[j] === ';') { out.push(corps.slice(d, j)); d = j + 1 }
  if (corps.slice(d).trim()) out.push(corps.slice(d))
  return out.map((x) => x.trim()).filter(Boolean)
}

// ── Les critères communs ────────────────────────────────────────────────────────────────────────────────────────────────
function lancerNode(args, opts = {}) {
  return spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 120_000, windowsHide: true, maxBuffer: 64 << 20, ...opts })
}
function jugerJumeaux(s, id, texteM) {
  const fM = ch(M.fichier), fJ = ch(M.jumeau), fN = ch(M.nu), fC = ch(M.controle)
  const J = lireSi(fJ), N = lireSi(fN), C = lireSi(fC)
  if (J === null || N === null) { s.echoue(id, `jumeau(x) absent(s) : ${[J === null && M.jumeau, N === null && M.nu].filter(Boolean).join(', ')}`); return }
  if (!J || !N) { s.echoue(id, `jumeau(x) de 0 octet : ${[!J && M.jumeau, !N && M.nu].filter(Boolean).join(', ')}`); return }
  for (const [nom, x] of [[M.jumeau, J], [M.nu, N]]) { const p = seParse(x); if (!p.ok) s.echoue(id, `${nom} ne se parse pas : ${p.raisons.slice(0, 2).join(' ; ')}`) }
  // Le premier jumeau est une copie de la migration (modèle 0092) ou la sortie de sql-nu.mjs sans --controle, qui ajoute après
  // la marque le contrôle par défaut : dans les deux cas, c'est son SQL AVANT la marque qui doit être celui de la migration.
  let fJv = fJ
  if (J.includes(MARQUE_CONTROLE)) { fJv = path.join(dossierTravail(NOM, num), `coupe-${path.basename(M.jumeau)}`); fs.writeFileSync(fJv, J.split(MARQUE_CONTROLE)[0]) }
  const v = lancerNode([path.join(R, 'scripts', 'sql-nu.mjs'), '--verifier', fM, fJv])
  if (v.status !== 0) s.echoue(id, `sql-nu.mjs --verifier ${M.fichier} ${M.jumeau}${fJv !== fJ ? ' (coupé à la marque)' : ''} en code ${v.status} : ${court(`${v.stdout}${v.stderr}`, 200)}`)
  if (!N.includes(MARQUE_CONTROLE)) s.echoue(id, `${M.nu} ne porte pas la marque du contrôle (sql-nu.mjs --controle ${M.controle})`)
  else if (C !== null && N.split(MARQUE_CONTROLE)[1].trim() !== lf(C).trim()) s.echoue(id, `ce qui suit la marque dans ${M.nu} n'est pas exactement ${M.controle}`)
  if (C) { // le nu régénéré par sql-nu.mjs, ligne d'en-tête exceptée (elle porte le nom du fichier)
    const d = dossierTravail(NOM, num)
    const dest = `${aff(d)}/${path.basename(M.nu)}`
    const g = lancerNode([path.join(R, 'scripts', 'sql-nu.mjs'), fM, dest, '--controle', fC])
    if (g.status !== 0) s.echoue(id, `sql-nu.mjs ne régénère pas le nu (code ${g.status}) : ${court(`${g.stdout}${g.stderr}`, 160)}`)
    else {
      const A = lf(fs.readFileSync(dest, 'utf8')).split('\n'), B = N.split('\n')
      if (!/^-{28} .*coller ce fichier EN ENTIER\./.test(B[0] || '')) s.echoue(id, `${M.nu} ne commence pas par l'en-tête de sql-nu.mjs`)
      const k = A.findIndex((l, x) => x > 0 && l !== B[x])
      if (k > 0 || A.length !== B.length) s.echoue(id, `${M.nu} ne sort pas de sql-nu.mjs : diverge à la ligne ${k > 0 ? k + 1 : Math.min(A.length, B.length) + 1} (attendu « ${court(A[k] ?? '(fin)', 80)} », trouvé « ${court(B[k] ?? '(fin)', 80)} »)`)
    }
  } else s.echoue(id, `${M.controle} ${C === null ? 'absent' : 'vide'} : le nu ne peut pas être régénéré`)
  const a = instructions(texteM).map(normaliser), b = instructions(jumeauNuCoupe(fN)).map(normaliser)
  const k = a.findIndex((x, i) => x !== b[i])
  if (k >= 0 || a.length !== b.length) s.echoue(id, `découpage du juge : la migration a ${a.length} instruction(s), le nu coupé ${b.length} ; première différence à l'instruction ${(k >= 0 ? k : Math.min(a.length, b.length)) + 1} (« ${court(a[k] ?? b[k] ?? '', 90)} »)`)
  if (!s.enEchec(id)) s.passe(id, `jumeaux présents, équivalents (sql-nu --verifier, nu régénéré à l'identique, ${a.length} instructions identiques au découpage du juge)`)
}
function jugerControleLecture(s, id) {
  const C = lireSi(ch(M.controle))
  if (C === null || !C) { s.echoue(id, `contrôle ${C === null ? 'absent' : 'vide'} : ${M.controle}`); return null }
  const ins = lireInstructions(C)
  if (!ins.length) s.echoue(id, `${M.controle} ne porte aucune instruction`)
  for (const x of ins) if (!/^(select|with)\b/.test(x.n)) s.echoue(id, `${M.controle} : instruction qui n'est pas une lecture : « ${court(x.n, 90)} »`)
  const cs = codeSeul(C)
  const verbe = /\b(insert|update|delete|truncate|create|alter|drop|grant|revoke|call|copy|vacuum|comment)\b/.exec(cs)
  if (verbe) s.echoue(id, `${M.controle} contient « ${verbe[1]} » hors des chaînes : un contrôle ne fait que lire`)
  if (!C.includes("'oui'")) s.echoue(id, `${M.controle} ne rend aucune ligne « oui »`)
  return compacter(C)
}
function jugerEssai(s, id) {
  if (SANS_ESSAI) { s.saute(id, '--sans-essai (mutations de 026-091) : une copie mutée n\'a pas d\'essai à elle'); return }
  const sc = lireSi(path.join(R, M.scenario))
  if (!sc) { s.echoue(id, `scénario ${sc === null ? 'absent' : 'vide'} : ${M.scenario}`); return }
  const cles = clesScenario(sc)
  const perdues = M.cles_essai.cles.filter((c) => !cles.includes(c))
  if (perdues.length) s.echoue(id, `${M.scenario} a perdu ${perdues.length} clé(s) du contrat (${M.cles_essai.cahier}) : ${listeTxt(perdues)}`)
  const N = lireSi(ch(M.nu))
  if (!N) { s.echoue(id, `jumeau nu ${N === null ? 'absent' : 'vide'} (${M.nu}) : l'empreinte de l'essai ne se calcule pas`); return }
  const e = empreinte(jumeauNuCoupe(ch(M.nu)))
  const cr = lireCompteRendu(ch(M.essai_a_sec), { empreinte: e, cles })
  if (!cr.ok) for (const r of cr.raisons) s.echoue(id, `${M.essai_a_sec} : ${r}`)
  if (!s.enEchec(id)) s.passe(id, `essai à sec du jumeau ${e.slice(0, 12)}… : ${cles.length} clés à true, APRES rien_ne_reste=true`)
}
function jugerNonRegression(s, id) {
  const r = nonRegression(racine, { exclus: [M.fichier, M.jumeau, M.nu, M.controle] })
  if (r.ok) s.passe(id, r.resume)
  else for (const x of r.echecs) s.echoue(id, x)
}

// ── 0096 : le socle ─────────────────────────────────────────────────────────────────────────────────────────────────────
const GENRES_0096 = [
  ['schema', /^create schema (if not exists )?ops$/],
  ['revoke_schema', /^revoke all on schema ops from /],
  ['table', /^create table (if not exists )?ops\.([a-z_]+)\(/],
  ['index', /^create (unique )?index (if not exists )?([a-z0-9_]+ )?on (only )?ops\.([a-z_]+)[ (]/],
  ['fonction', /^create (or replace )?function ops\.evenements_ajout_seul\(\)/],
  ['drop_trigger', /^drop trigger if exists ([a-z0-9_]+) on ops\.evenements$/],
  ['trigger', /^create (or replace )?trigger ([a-z0-9_]+) /],
  ['rls', /^alter table (if exists )?(only )?ops\.([a-z_]+) enable row level security$/],
  ['revoke_tables', /^revoke all on all tables in schema ops from /],
  ['defauts', /^alter default privileges (for role [a-z_]+ )?in schema ops revoke all on (tables|sequences|functions) from /],
  ['graine', /^insert into ops\.([a-z_]+)\(/],
  ['commentaire', /^comment on (schema|table|column|function|trigger) /],
]
const INTERDITS_0096 = [['create policy', /\bcreate policy\b/], ['grant', /\bgrant\b/], ['drop table', /\bdrop table\b/], ['create extension', /\bcreate extension\b/]]
function genreDe(ins, genres) { for (const [g, re] of genres) { const m = re.exec(ins.n); if (m) return { g, m } } return null }

function valeurSql(x) {
  const v = sansCast(x.trim()).trim()
  if (/^'[\s\S]*'$/.test(v)) {
    const s = v.slice(1, -1).replace(/''/g, "'")
    return /^\{.*\}$/.test(s) ? s.slice(1, -1).split(',').map((z) => z.trim().replace(/^"|"$/g, '')).filter(Boolean) : s
  }
  if (/^array\s*\[/i.test(v)) return decouperVirgules(v.slice(v.indexOf('[') + 1, v.lastIndexOf(']'))).map(valeurSql)
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  if (/^(true|false)$/i.test(v)) return /^true$/i.test(v)
  if (/^null$/i.test(v)) return null
  return { expr: v }
}
function parserInsert(ins) {
  const t = ins.t, m = masquer(t), ml = m.toLowerCase()
  const table = /^insert into ops\.([a-z_]+)/.exec(ins.n)[1]
  const i0 = m.indexOf('('), j0 = fermante(m, i0)
  if (j0 < 0) return { table, erreur: 'liste de colonnes non refermée' }
  const cols = decouperVirgules(t.slice(i0 + 1, j0)).map((x) => x.replace(/"/g, '').trim().toLowerCase())
  const iv = ml.indexOf('values', j0)
  if (iv < 0) return { table, cols, erreur: 'graine sans « values » (insert … select refusé)' }
  const lignes = []
  let k = iv + 6
  for (;;) {
    const a = m.indexOf('(', k)
    const oc = ml.indexOf('on conflict', k)
    if (a < 0 || (oc >= 0 && oc < a)) break
    const b = fermante(m, a)
    if (b < 0) return { table, cols, erreur: 'ligne de valeurs non refermée' }
    lignes.push(decouperVirgules(t.slice(a + 1, b)).map(valeurSql))
    k = b + 1
    if (!ml.slice(k).trimStart().startsWith(',')) break
  }
  return { table, cols, lignes: lignes.map((l) => Object.fromEntries(cols.map((c, x) => [c, l[x]]))), nbValeurs: lignes.map((l) => l.length) }
}
const egaux = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const ensemble = (a) => [...new Set((Array.isArray(a) ? a : [])).values()].sort()

function juger0096(s, texteM) {
  const ids = ROLES['0096']
  const ins = lireInstructions(texteM)
  // OS-1 — le fichier et la liste permise
  if (!ins.length) s.echoue(ids.fichier, `${M.fichier} ne porte aucune instruction`)
  const cs = codeSeul(texteM)
  for (const [nom, re] of INTERDITS_0096) if (re.test(cs)) s.echoue(ids.fichier, `« ${nom} » interdit dans 0096`)
  const genres = ins.map((x) => ({ ...x, genre: genreDe(x, GENRES_0096) }))
  for (const x of genres) if (!x.genre) s.echoue(ids.fichier, `instruction hors de la liste permise : « ${court(x.n, 110)} »`)
  if (!s.enEchec(ids.fichier)) s.passe(ids.fichier, `${ins.length} instructions, toutes de la liste permise ; ni create policy, ni grant, ni drop table, ni create extension`)

  // OS-2 — idempotence
  const dropsTrigger = new Map()
  genres.forEach((x, i) => {
    const G = x.genre
    if (!G) return
    const n = x.n
    if (G.g === 'schema' && !G.m[1]) s.echoue(ids.idempotence, 'create schema sans « if not exists »')
    if (G.g === 'table' && !G.m[1]) s.echoue(ids.idempotence, `create table ops.${G.m[2]} sans « if not exists »`)
    if (G.g === 'index' && !G.m[2]) s.echoue(ids.idempotence, `index sans « if not exists » : « ${court(n, 90)} »`)
    if (G.g === 'fonction' && !G.m[1]) s.echoue(ids.idempotence, 'create function ops.evenements_ajout_seul sans « or replace »')
    if (G.g === 'drop_trigger') dropsTrigger.set(G.m[1], i)
    if (G.g === 'trigger' && !G.m[1] && !(dropsTrigger.has(G.m[2]) && dropsTrigger.get(G.m[2]) < i)) s.echoue(ids.idempotence, `create trigger ${G.m[2]} sans « drop trigger if exists ${G.m[2]} on ops.evenements » avant lui`)
    if (G.g === 'graine' && !/ on conflict(?:\([^)]*\))? do nothing$/.test(n)) s.echoue(ids.idempotence, `graine de ops.${G.m[1]} sans « on conflict do nothing »`)
  })
  if (!s.enEchec(ids.idempotence)) s.passe(ids.idempotence, 'if not exists, or replace, drop trigger if exists avant create trigger, graines en on conflict do nothing')

  // OS-3 — le contrat
  const tables = new Map()
  for (const x of genres) if (x.genre?.g === 'table') tables.set(x.genre.m[2], { ...parserTable(x.t), ins: x })
  const index = genres.filter((x) => x.genre?.g === 'index').map(parserIndex).filter(Boolean)
  let nCol = 0, nRegle = 0
  const enPlus = []
  for (const [nomT, spec] of Object.entries(CONTRAT.tables).filter(([, t]) => t.migration === '0096')) {
    const T = tables.get(nomT)
    if (!T) { s.echoue(ids.contrat, `table ops.${nomT} absente (contrat : ${court(spec.contrat, 60)})`); continue }
    if (!T.colonnes) { s.echoue(ids.contrat, `ops.${nomT} : corps de table illisible`); continue }
    const pkTable = T.contraintes.map((c) => /^(?:constraint [a-z0-9_]+ )?primary key\((.*)\)$/.exec(c)).filter(Boolean).flatMap((m) => m[1].split(', '))
    const uniqueTable = T.contraintes.map((c) => /^(?:constraint [a-z0-9_]+ )?unique\((.*)\)$/.exec(c)).filter(Boolean).map((m) => m[1].replace(/\s+/g, ''))
    for (const col of spec.colonnes) {
      nCol++
      const D = T.colonnes.get(col.nom)
      const ou = `ops.${nomT}.${col.nom}`
      if (!D) { s.echoue(ids.contrat, `${ou} absente (contrat : ${court(col.texte, 70)})`); continue }
      const type = typeEnTete(D.n)
      if (typeCanon(type) !== typeCanon(col.type)) s.echoue(ids.contrat, `${ou} : type « ${type || '?'} », contrat « ${col.type} »`)
      const Dn = horsCheck(D.n)
      const estPk = /\bprimary key\b/.test(Dn) || pkTable.includes(col.nom)
      if (col.pk && !(/\bprimary key\b/.test(Dn) || (pkTable.length === 1 && pkTable[0] === col.nom))) s.echoue(ids.contrat, `${ou} n'est pas la clé primaire`)
      if (col.not_null && !/\bnot null\b/.test(Dn) && !estPk) s.echoue(ids.contrat, `${ou} n'est pas « not null »`)
      if (col.unique && !/\bunique\b/.test(Dn) && !uniqueTable.includes(col.nom) && !index.some((x) => x.table === nomT && x.unique && !x.where && x.colonnes === col.nom)) s.echoue(ids.contrat, `${ou} n'est pas unique`)
      if (col.defaut !== undefined) {
        const d = defautDe(D.c)
        if (d === null) s.echoue(ids.contrat, `${ou} sans valeur par défaut (contrat : default ${col.defaut})`)
        else if (canonDefaut(d) !== canonDefaut(compacter(col.defaut))) s.echoue(ids.contrat, `${ou} : défaut « ${d} », contrat « ${col.defaut} »`)
      }
      if (col.ref && !D.c.includes(compacter(`references ${col.ref}`))) s.echoue(ids.contrat, `${ou} : « references ${col.ref} » absent`)
      if (col.identite && !D.c.includes('generatedalwaysasidentity')) s.echoue(ids.contrat, `${ou} : « generated always as identity » absent`)
    }
    for (const k of spec.contraintes) {
      nRegle++
      const manque = k.regles.filter((rg) => !regleOk(rg, T.c, T.sr))
      if (manque.length) s.echoue(ids.contrat, `ops.${nomT} : contrainte du contrat introuvable — ${court(k.texte, 110)}`)
    }
    for (const ix of spec.index || []) {
      nRegle++
      const ok = index.some((x) => x.table === nomT && x.unique === ix.unique && x.colonnes === compacter(ix.colonnes)
        && (!ix.where_contient || x.where.includes(compacter(ix.where_contient)))
        && (!ix.where_liste || listesDe(x.whereSerre, ix.where_liste[0]).some((v) => [...v].sort().join(',') === [...ix.where_liste[1]].sort().join(','))))
      if (!ok) s.echoue(ids.contrat, `ops.${nomT} : index du contrat introuvable — ${court(ix.texte, 110)}`)
    }
    for (const c of spec.jamais_unique || []) {
      if (/\bunique\b/.test(horsCheck(T.colonnes.get(c)?.n || '')) || uniqueTable.includes(c) || index.some((x) => x.table === nomT && x.unique && x.colonnes === c)) s.echoue(ids.contrat, `ops.${nomT}.${c} porte un index ou une contrainte unique : le dédoublonnage hiérarchique échouerait (seule cle_dedup est unique)`)
    }
    if (spec.prospection) {
      for (const [c, D] of T.colonnes) {
        const nn = /\bnot null\b/.test(horsCheck(D.n)) || /\bprimary key\b/.test(horsCheck(D.n)) || pkTable.includes(c)
        if (nn && defautDe(D.c) === null && !D.c.includes('generated') && !CONTRAT.identite_sans_defaut.includes(c)) s.echoue(ids.contrat, `ops.${nomT}.${c} est not null sans valeur par défaut (hors colonnes d'identité) : une insertion acq_* qui l'ignore échouerait`)
      }
    }
    if (spec.declencheur) {
      nRegle++
      const dcl = spec.declencheur
      const fn = genres.find((x) => x.genre?.g === 'fonction')
      if (!fn) s.echoue(ids.contrat, `fonction ${dcl.fonction}() absente`)
      else for (const sn of dcl.corps_contient) if (!fn.c.includes(compacter(sn))) s.echoue(ids.contrat, `${dcl.fonction}() : « ${sn} » absent du corps`)
      const tg = genres.find((x) => x.genre?.g === 'trigger')
      if (!tg || !/before(updateordelete|deleteorupdate)onops\.evenements/.test(tg.c) || !tg.c.includes('foreachrow') || !/execute(function|procedure)ops\.evenements_ajout_seul\(\)/.test(tg.c)) s.echoue(ids.contrat, `déclencheur absent ou incomplet : ${court(dcl.texte, 110)}`)
    }
    const connues = new Set(spec.colonnes.map((c) => c.nom))
    for (const c of T.colonnes.keys()) if (!connues.has(c)) enPlus.push(`ops.${nomT}.${c}`)
  }
  for (const nomT of tables.keys()) if (!CONTRAT.tables[nomT]) s.echoue(ids.contrat, `table ops.${nomT} hors contrat`)
  for (const c of CONTRAT.interdits.colonnes) { const [t, col] = c.split('.'); if (tables.get(t)?.colonnes?.has(col)) s.echoue(ids.contrat, `colonne ops.${c} : ${court(CONTRAT.interdits.texte, 100)}`) }
  if (compacter(texteM).includes("'benj'")) s.echoue(ids.contrat, "défaut 'benj' : plus aucune approbation humaine message par message")
  if (enPlus.length) s.note(`${ids.contrat} : colonne(s) en plus du contrat (signalées, sans échec) : ${listeTxt(enPlus)}`)
  if (!s.enEchec(ids.contrat)) s.passe(ids.contrat, `${TABLES_OPS.length} tables, ${nCol} colonnes, ${nRegle} contraintes et index du contrat lus dans le texte`)

  // OS-4 — fermeture
  const rls = new Set(genres.filter((x) => x.genre?.g === 'rls').map((x) => x.genre.m[3]))
  const sansRls = TABLES_OPS.filter((t) => !rls.has(t))
  if (sansRls.length) s.echoue(ids.fermeture, `enable row level security absent pour : ${listeTxt(sansRls)}`)
  const couvre = (x, mot) => { const r = rolesApres(x.n, mot); return ROLES_FERMES.every((ro) => r.includes(ro)) }
  const revS = genres.filter((x) => x.genre?.g === 'revoke_schema')
  if (!revS.some((x) => couvre(x, 'from'))) s.echoue(ids.fermeture, `revoke all on schema ops from ${ROLES_FERMES.join(', ')} absent ou incomplet`)
  const revT = genres.filter((x) => x.genre?.g === 'revoke_tables')
  if (!revT.some((x) => couvre(x, 'from'))) s.echoue(ids.fermeture, `revoke all on all tables in schema ops from ${ROLES_FERMES.join(', ')} absent ou incomplet`)
  for (const quoi of ['tables', 'sequences', 'functions']) {
    if (!genres.some((x) => x.genre?.g === 'defauts' && x.genre.m[2] === quoi && couvre(x, 'from'))) s.echoue(ids.fermeture, `alter default privileges in schema ops revoke all on ${quoi} from ${ROLES_FERMES.join(', ')} absent ou incomplet`)
  }
  if (/\bgrant\b/.test(cs)) s.echoue(ids.fermeture, 'un grant subsiste : aucun droit sur ops')
  if (!s.enEchec(ids.fermeture)) s.passe(ids.fermeture, `RLS sur les ${TABLES_OPS.length} tables, schéma et tables révoqués à ${ROLES_FERMES.join(', ')}, défauts retirés (tables, séquences, fonctions), aucun grant`)

  // OS-5 — graines
  const G = CONTRAT.graines
  const inserts = genres.filter((x) => x.genre?.g === 'graine').map(parserInsert)
  const parTable = new Map()
  for (const x of inserts) {
    if (x.erreur) { s.echoue(ids.graines, `graine de ops.${x.table} illisible : ${x.erreur}`); continue }
    if (x.nbValeurs.some((n) => n !== x.cols.length)) s.echoue(ids.graines, `graine de ops.${x.table} : nombre de valeurs ≠ nombre de colonnes`)
    if (!['agents', 'quotas_canaux', 'interrupteurs'].includes(x.table)) s.echoue(ids.graines, `insertion hors graines : ops.${x.table}`)
    parTable.set(x.table, [...(parTable.get(x.table) || []), ...x.lignes.map((l) => ({ ...l, _cols: x.cols }))])
  }
  const colsPermises = { agents: ['nom', 'libelle', 'periode_minutes', 'tables_ecrites'], quotas_canaux: ['canal', 'envoyeur', 'plafond_jour', 'plafond_nouveaux_jour'], interrupteurs: ['nom', 'actif', 'motif'] }
  for (const [t, lignes] of parTable) for (const l of lignes) for (const c of l._cols) if (colsPermises[t] && !colsPermises[t].includes(c)) s.echoue(ids.graines, `graine de ops.${t} : colonne « ${c} » hors contrat`)
  const ag = parTable.get('agents') || []
  const agTxt = (l) => `${l.nom}`
  for (const e of G.agents) {
    const l = ag.filter((x) => x.nom === e.nom)
    if (l.length !== 1) { s.echoue(ids.graines, `agent ${e.nom} : ${l.length} graine(s), une attendue`); continue }
    const x = l[0]
    if (x.libelle !== e.libelle) s.echoue(ids.graines, `agent ${e.nom} : libellé « ${x.libelle} », contrat « ${e.libelle} »`)
    if (x.periode_minutes !== e.periode_minutes) s.echoue(ids.graines, `agent ${e.nom} : periode_minutes ${x.periode_minutes}, contrat ${e.periode_minutes}`)
    if (!egaux(ensemble(x.tables_ecrites ?? []), ensemble(e.tables_ecrites))) s.echoue(ids.graines, `agent ${e.nom} : tables_ecrites ${JSON.stringify(x.tables_ecrites ?? [])}, contrat ${JSON.stringify(e.tables_ecrites)}`)
  }
  for (const x of ag) if (!G.agents.some((e) => e.nom === x.nom)) s.echoue(ids.graines, `agent semé hors contrat : ${agTxt(x)}`)
  const qu = (parTable.get('quotas_canaux') || []).map((x) => ({ canal: x.canal, envoyeur: x.envoyeur === undefined ? '*' : x.envoyeur, plafond_jour: x.plafond_jour, plafond_nouveaux_jour: x.plafond_nouveaux_jour === undefined ? 0 : x.plafond_nouveaux_jour }))
  const qTxt = (q) => `(${q.canal}, ${q.envoyeur}, ${q.plafond_jour}, ${q.plafond_nouveaux_jour})`
  for (const e of G.quotas_canaux) { const n = qu.filter((q) => egaux(q, e)).length; if (n !== 1) s.echoue(ids.graines, `quota ${qTxt(e)} : ${n} graine(s), une attendue`) }
  for (const q of qu) {
    if (!G.quotas_canaux.some((e) => egaux(q, e))) s.echoue(ids.graines, `quota hors contrat : ${qTxt(q)}`)
    if (q.envoyeur !== '*') s.echoue(ids.graines, `quota d'envoyeur « ${q.envoyeur} » : la voie gratuite n'a que des lignes '*'`)
  }
  const it = parTable.get('interrupteurs') || []
  for (const e of G.interrupteurs) { const l = it.filter((x) => x.nom === e.nom); if (l.length !== 1) s.echoue(ids.graines, `interrupteur ${e.nom} : ${l.length} graine(s), une attendue`); else if ((l[0].actif ?? false) !== false) s.echoue(ids.graines, `interrupteur ${e.nom} semé ouvert`) }
  for (const x of it) if (!G.interrupteurs.some((e) => e.nom === x.nom)) s.echoue(ids.graines, `interrupteur semé hors contrat : ${x.nom}`)
  const txtGraines = genres.filter((x) => x.genre?.g === 'graine').map((x) => x.c).join('\n')
  if (txtGraines.includes("'email'")) s.echoue(ids.graines, "une graine nomme 'email' : la valeur n'existe plus (voie gratuite du 25/09)")
  if (/boite_\d/.test(txtGraines)) s.echoue(ids.graines, 'une graine nomme une boîte boite_NN : il n\'y en a plus')
  const fContrat = ch('lib/agents/acquisition/contrat.ts')
  if (fs.existsSync(fContrat)) {
    const src = fs.readFileSync(fContrat, 'utf8')
    const m = /PLAFONDS_DEFAUT\b[^=]*=\s*(?:Object\.freeze\(\s*)?\{([^}]*)\}/.exec(src)
    if (!m) s.echoue(ids.graines, 'lib/agents/acquisition/contrat.ts existe mais PLAFONDS_DEFAUT y est illisible')
    else {
      const paires = [...m[1].matchAll(/['"]?([a-z_]+)['"]?\s*:\s*(\d+)/g)].map((x) => [x[1], Number(x[2])])
      for (const [canal, v] of paires) {
        if (canal === 'email') s.echoue(ids.graines, 'PLAFONDS_DEFAUT a une clé email')
        const q = qu.find((x) => x.canal === canal && x.envoyeur === '*')
        if (!q || q.plafond_jour !== v) s.echoue(ids.graines, `PLAFONDS_DEFAUT.${canal} = ${v}, graine ${q ? q.plafond_jour : 'absente'} : un seul chiffre, deux endroits interdits de diverger`)
      }
    }
  }
  if (!s.enEchec(ids.graines)) s.passe(ids.graines, `2 agents, 8 quotas '*' (formulaire, Instagram, Facebook et LinkedIn à 0, email_sollicite à 50), 2 interrupteurs fermés, aucune autre insertion${fs.existsSync(fContrat) ? ', égales à PLAFONDS_DEFAUT' : ''}`)

  // OS-6 — jumeaux ; OS-7 — contrôle
  jugerJumeaux(s, ids.jumeaux, texteM)
  const cC = jugerControleLecture(s, ids.controle)
  if (cC !== null) {
    const points = [
      ['le schéma existe', ['pg_namespace', 'information_schema.schemata', 'to_regnamespace('], ["'ops'"]],
      ['les 11 tables ont relrowsecurity', ['relrowsecurity'], TABLES_OPS.map((t) => `'${t}'`)],
      ['aucune politique pour ops', ['pg_policies'], []],
      ["has_schema_privilege d'anon, authenticated et service_role", ['has_schema_privilege'], ["'anon'", "'authenticated'", "'service_role'"]],
      ['les graines exactes', ['quotas_canaux'], ["'instagram'", "'formulaire_site'", "'email_sollicite'", "'email'", 'interrupteurs', "'envoi_froid'", 'agents']],
    ]
    for (const [quoi, unDe, tous] of points) {
      if (!unDe.some((x) => cC.includes(compacter(x))) || tous.some((x) => !cC.includes(compacter(x)))) s.echoue(ids.controle, `${M.controle} ne couvre pas : ${quoi} (attendu : ${unDe.join(' | ')}${tous.length ? ` et ${listeTxt(tous, 4)}` : ''})`)
    }
    if (!s.enEchec(ids.controle)) s.passe(ids.controle, `${M.controle} en lecture seule, couvre schéma, RLS des 11 tables, politiques, droits des trois rôles et graines`)
  }
}

// ── 0097 et 0098 : les fonctions ────────────────────────────────────────────────────────────────────────────────────────
function jugerFonctions(s, texteM) {
  const ids = ROLES[num]
  const attendues = Object.entries(CONTRAT.fonctions).filter(([, f]) => f.migration === num)
  const ins = lireInstructions(texteM)
  // X-1 — le fichier
  if (!ins.length) s.echoue(ids.fichier, `${M.fichier} ne porte aucune instruction`)
  const genres = ins.map((x) => {
    if (/^create or replace function public\.ops_[a-z0-9_]+\(/.test(x.n)) return { ...x, g: 'fonction', f: parserFonction(x) }
    let m = /^revoke (?:all|execute)(?: privileges)? on function public\.(ops_[a-z0-9_]+)\b/.exec(x.n)
    if (m) return { ...x, g: 'revoke', nom: m[1], roles: rolesApres(x.n, 'from') }
    m = /^grant execute on function public\.(ops_[a-z0-9_]+)\b/.exec(x.n)
    if (m) return { ...x, g: 'grant', nom: m[1], roles: rolesApres(x.n, 'to') }
    m = /^comment on function public\.(ops_[a-z0-9_]+)\b/.exec(x.n)
    if (m) return { ...x, g: 'commentaire', nom: m[1] }
    return { ...x, g: null }
  })
  for (const x of genres) {
    if (!x.g) s.echoue(ids.fichier, `instruction hors liste (create or replace function public.ops_*, revoke, grant execute … to service_role, comment on function) : « ${court(x.n, 100)} »`)
    if (x.g === 'grant' && !(x.roles.length === 1 && x.roles[0] === 'service_role')) s.echoue(ids.fichier, `grant à un autre rôle que service_role : « ${court(x.n, 100)} »`)
  }
  if (/\b(create|alter|drop) (table|policy|schema|extension|trigger|index)\b/.test(codeSeul(texteM))) s.echoue(ids.fichier, 'le fichier crée ou modifie autre chose que des fonctions')
  if (!s.enEchec(ids.fichier)) s.passe(ids.fichier, `${ins.length} instructions : fonctions public.ops_*, leurs revoke et grant à service_role, des commentaires`)

  // X-2 — les fonctions du contrat, et elles seules
  const fonctions = genres.filter((x) => x.g === 'fonction')
  const parNom = new Map()
  for (const x of fonctions) parNom.set(x.f.nom, [...(parNom.get(x.f.nom) || []), x.f])
  for (const [nom, l] of parNom) {
    if (l.length > 1) s.echoue(ids.fonctions, `${nom} créée ${l.length} fois (surcharge ou doublon)`)
    if (!CONTRAT.fonctions[nom] || CONTRAT.fonctions[nom].migration !== num) s.echoue(ids.fonctions, `public.${nom} hors contrat de ${num} : le contrat est la seule porte`)
  }
  for (const [nom, spec] of attendues) {
    const f = parNom.get(nom)?.[0]
    if (!f) { s.echoue(ids.fonctions, `public.${nom} absente (contrat : ${court(spec.contrat, 80)})`); continue }
    if (f.erreur) { s.echoue(ids.fonctions, `public.${nom} : ${f.erreur}`); continue }
    const att = spec.params.map(([n, t]) => [n, typeCanon(t)])
    if (!egaux(f.params, att)) s.echoue(ids.fonctions, `public.${nom} : paramètres (${f.params.map((p) => p.join(' ')).join(', ')}), contrat (${att.map((p) => p.join(' ')).join(', ')})`)
    const rAtt = parserRend(spec.rend)
    if (!f.rend || rendTxt(f.rend) !== rendTxt(rAtt)) s.echoue(ids.fonctions, `public.${nom} rend « ${f.rend ? rendTxt(f.rend) : '?'} », contrat « ${rendTxt(rAtt)} »`)
  }
  if (!s.enEchec(ids.fonctions)) s.passe(ids.fonctions, `les ${attendues.length} fonctions du contrat, paramètres (noms, types, ordre) et type rendu conformes, aucune autre`)

  // X-3 — sécurité
  for (const [nom] of attendues) {
    const f = parNom.get(nom)?.[0]
    if (!f || f.erreur) { s.echoue(ids.securite, `public.${nom} : non jugée (absente)`); continue }
    if (!f.definer) s.echoue(ids.securite, `public.${nom} n'est pas security definer`)
    const sp = CONTRAT.fonctions[nom].search_path || CONTRAT.regles_fonctions.search_path
    if (!f.searchPath || f.searchPath.join(', ') !== sp) s.echoue(ids.securite, `public.${nom} : search_path ${f.searchPath ? f.searchPath.join(', ') : 'absent'}, attendu « ${sp} » (pg_temp en dernier)`)
    const rev = genres.filter((x) => x.g === 'revoke' && x.nom === nom)
    if (!rev.some((x) => ['public', 'anon', 'authenticated'].every((ro) => x.roles.includes(ro)))) s.echoue(ids.securite, `public.${nom} : revoke … from public, anon, authenticated absent ou incomplet`)
    const gr = genres.filter((x) => x.g === 'grant' && x.nom === nom)
    if (!gr.some((x) => x.roles.includes('service_role'))) s.echoue(ids.securite, `public.${nom} : grant execute … to service_role absent`)
  }
  for (const x of genres) if (x.g === 'grant' && x.roles.some((ro) => ro !== 'service_role')) s.echoue(ids.securite, `grant à ${x.roles.filter((ro) => ro !== 'service_role').join(', ')} sur ${x.nom}`)
  if (/\bgrant\b(?![^;]*\bto service_role\b)/.test(codeSeul(texteM).replace(/grant execute on function public\.ops_[a-z0-9_]+(\([^)]*\))? to service_role/g, ''))) s.echoue(ids.securite, 'un grant qui ne va pas à service_role')
  if (!s.enEchec(ids.securite)) s.passe(ids.securite, `security definer, search_path « ${CONTRAT.regles_fonctions.search_path} », revoke de public, anon, authenticated et grant à service_role seul, pour les ${attendues.length} fonctions`)

  // X-4 — lecture des corps
  const corps = (nom) => parNom.get(nom)?.[0]?.corps ?? null
  const cc = (nom) => { const c = corps(nom); return c === null ? null : compacter(c) }
  const exiger = (nom, ok, quoi) => { if (cc(nom) === null) s.echoue(ids.corps, `${nom} : absente, corps non lu`); else if (!ok(cc(nom), corps(nom))) s.echoue(ids.corps, `${nom} : ${quoi}`) }
  if (num === '0097') {
    for (const [nom, spec] of attendues) if (spec.ecriture) exiger(nom, (c) => c.includes('insertintoops.evenements') || c.includes('ops_evenement_ajouter('), 'écriture sans événement dans ops.evenements (même transaction)')
    exiger('ops_agent_poser_jeton', (c, brut) => {
      const inst = instructionsCorps(brut)
      const teintes = new Set(['p_hash', 'jeton_hash'])
      for (const i of inst) { const m = /^([a-z_][a-z0-9_]*)\s*:=/.exec(normaliser(i)); if (m && /\bp_hash\b/.test(normaliser(i))) teintes.add(m[1]) }
      return !inst.filter((i) => /evenements|ops_evenement_ajouter/.test(i.toLowerCase())).some((i) => [...teintes].some((v) => new RegExp(`\\b${v}\\b`).test(normaliser(i))))
    }, "p_hash (ou une variable qui en dérive) alimente l'événement : le hash ne doit jamais entrer dans resume ni objet")
    exiger('ops_evenements_lire', (c) => /agent<>p_agent|p_agent<>[a-z_.]*agent|agentisdistinctfromp_agent/.test(c) && /200/.test(c), "ne filtre pas agent <> p_agent ou ne borne pas sa limite à 200")
    exiger('ops_interrupteur_poser', (c) => c.includes('is_founder'), 'ne contrôle pas is_founder')
  } else {
    exiger('ops_tache_prendre', (c) => c.includes('forupdateskiplocked') && c.includes('limit1') && c.includes("'30minutes'"), "sans « for update skip locked », « limit 1 » ou l'intervalle de « 30 minutes »")
    for (const nom of ['ops_baux_expirer', 'ops_decisions_echues']) exiger(nom, (c) => /limit200(?![0-9])/.test(c), 'sans limite de 200 lignes par appel')
    exiger('ops_tache_creer', (c) => {
      const cle = Math.min(...['cle_idempotence=p_cle', 'p_cle=cle_idempotence', 'cle_idempotence=p_cle'].map((x) => c.indexOf(x)).filter((x) => x >= 0))
      const quota = Math.min(...['quota_creations_jour', "'ops:quota'"].map((x) => c.indexOf(x)).filter((x) => x >= 0))
      return Number.isFinite(cle) && Number.isFinite(quota) && cle < quota
    }, 'la recherche de la clé existante ne vient pas avant le calcul du quota')
    exiger('ops_tache_creer', (c) => c.includes("attimezone'europe/paris'"), "le jour du quota ne se calcule pas « at time zone 'Europe/Paris' »")
    exiger('ops_decision_trancher', (c) => {
      const f = c.indexOf('is_founder'), ecr = Math.min(...['updateops.', 'insertintoops.', 'deletefromops.', 'ops_evenement_ajouter('].map((x) => c.indexOf(x)).filter((x) => x >= 0))
      return f >= 0 && c.includes('artisans') && (!Number.isFinite(ecr) || f < ecr)
    }, 'ne contrôle pas is_founder sur public.artisans avant toute écriture')
    exiger('ops_decisions_tranchees', (c, brut) => /creee_par=p_agent|p_agent=[a-z_.]*creee_par/.test(c) && !/\b(insert|update|delete)\b/.test(codeSeul(brut)), 'ne filtre pas creee_par = p_agent, ou écrit (insert, update, delete)')
    exiger('ops_tache_clore', (c) => c.includes('forupdate') && /in\('file','bail'\)|in\('bail','file'\)/.test(c) && c.includes("'ops:statut'"), "sans « for update », sans la liste ('file','bail') des statuts qu'elle touche, ou sans ops:statut")
  }
  if (!s.enEchec(ids.corps)) s.passe(ids.corps, num === '0097'
    ? 'chaque écriture journalisée, le hash hors du journal, lire sans ses propres événements et borné à 200, is_founder contrôlé'
    : 'skip locked, limit 1 et 30 minutes ; 200 par appel ; clé avant quota ; heure de Paris ; is_founder avant écriture ; tranchées en lecture ; clôture sous verrou, file et bail seulement')

  // X-5 — jumeaux et contrôle
  jugerJumeaux(s, ids.jumeaux, texteM)
  const cC = jugerControleLecture(s, ids.controle)
  if (cC !== null) {
    for (const [nom] of attendues) if (!cC.includes(nom)) s.echoue(ids.controle, `${M.controle} ne nomme pas ${nom}`)
    for (const [quoi, unDe] of [["l'existence", ['to_regprocedure(', 'pg_proc']], ['prosecdef', ['prosecdef']], ['le search_path', ['proconfig']], ["les droits d'exécution", ['has_function_privilege']]]) {
      if (!unDe.some((x) => cC.includes(x))) s.echoue(ids.controle, `${M.controle} ne couvre pas ${quoi} (${unDe.join(' | ')})`)
    }
    if (!cC.includes('search_path')) s.echoue(ids.controle, `${M.controle} ne lit pas le search_path dans proconfig`)
    for (const ro of ['anon', 'authenticated', 'service_role']) if (!cC.includes(`'${ro}'`)) s.echoue(ids.controle, `${M.controle} ne lit pas le droit de ${ro}`)
    if (!s.enEchec(ids.controle)) s.passe(ids.controle, `${M.controle} en lecture seule : existence, prosecdef, search_path et droits d'anon, authenticated et service_role pour les ${attendues.length} fonctions`)
  }
}

// ── Le jugement ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function idsDe() { return [...new Set(Object.values(ROLES[num]))] }
function juger() {
  const ids = ROLES[num]
  const s = creerRapport(NOM, idsDe(), { entete: `${NOM} ${num} (${M.fiche}) — racine ${aff(racine)}${o.temoin ? ' — témoin : critères de non-régression' : ''}${SANS_ESSAI ? ' — sans essai' : ''}` })
  s.saute(ids.reel, '--reel seulement, après l\'application par Claude Code')
  if (o.temoin) {
    for (const id of idsDe()) if (![ids.nr, ids.essai, ids.reel].includes(id)) s.saute(id, `témoin : critère de fabrication, prouvé par le PASS de ${M.fiche} et par les mutations de 026-091`)
    jugerNonRegression(s, ids.nr)
    // la part du critère d'essai qui ne dépend pas de la migration : le scénario, et un bloc généré sur le jumeau d'exemple
    const sc = lireSi(path.join(R, M.scenario))
    if (!sc) s.echoue(ids.essai, `scénario ${sc === null ? 'absent' : 'vide'} : ${M.scenario}`)
    else {
      const p = seParse(sc)
      if (!p.ok) s.echoue(ids.essai, `${M.scenario} ne se parse pas : ${p.raisons.slice(0, 2).join(' ; ')}`)
      const cles = clesScenario(sc)
      const perdues = M.cles_essai.cles.filter((c) => !cles.includes(c))
      if (perdues.length) s.echoue(ids.essai, `${M.scenario} a perdu ${perdues.length} clé(s) du contrat : ${listeTxt(perdues)}`)
      let bloc = null
      try { bloc = blocEssai({ nus: [JUMEAU_EXEMPLE], scenario: sc, empreinte: empreinte(JUMEAU_EXEMPLE) }) } catch (e) { s.echoue(ids.essai, `--generer-essai sur le jumeau d'exemple : ${e.message}`) }
      if (bloc) {
        const a = analyserEssai(bloc, { nus: [JUMEAU_EXEMPLE] })
        if (!a.ok) s.echoue(ids.essai, `bloc d'essai généré sur le jumeau d'exemple invalide : ${a.raisons.slice(0, 3).join(' ; ')}`)
        else s.passe(ids.essai, `témoin : ${M.scenario} se parse (${cles.length} clés, toutes celles du contrat) ; --generer-essai sur le jumeau d'exemple rend 1 énoncé, 1 jumeau exécuté, ${a.octets} octets, sans mot interdit hors chaînes`)
      }
    }
    return s.fin()
  }
  const texteM = lireSi(ch(M.fichier))
  if (!texteM) {
    s.echoue(ids.fichier, texteM === null ? `migration absente : ${M.fichier} (racine ${aff(racine)})` : `migration vide (0 octet) : ${M.fichier}`)
    for (const id of idsDe()) if (![ids.fichier, ids.nr, ids.reel].includes(id)) s.echoue(id, `non jugé : la migration manque (${ids.fichier})`)
  } else {
    if (num === '0096') juger0096(s, texteM)
    else jugerFonctions(s, texteM)
    jugerEssai(s, ids.essai)
  }
  jugerNonRegression(s, ids.nr)
  return s.fin()
}

// ── --generer-essai ─────────────────────────────────────────────────────────────────────────────────────────────────────
function genererEssai() {
  const nus = []
  for (const a of [...AVEC].sort()) {
    const f = ch(CONTRAT.migrations[a].nu)
    if (!lireSi(f)) refuser(`préalable manquant : jumeau nu de ${a} absent ou vide (${CONTRAT.migrations[a].nu})`)
    nus.push(jumeauNuCoupe(f))
  }
  const fN = ch(M.nu)
  if (!lireSi(fN)) refuser(`préalable manquant : jumeau nu de ${num} absent ou vide (${M.nu}, racine ${aff(racine)})`)
  const nu = jumeauNuCoupe(fN)
  nus.push(nu)
  const sc = lireSi(path.join(R, M.scenario))
  if (!sc) refuser(`scénario absent ou vide : ${M.scenario}`)
  let bloc
  try { bloc = blocEssai({ nus, scenario: sc, empreinte: empreinte(nu) }) } catch (e) { console.error(`✗ ${NOM} : ${e.message}`); process.exit(1) }
  const a = analyserEssai(bloc, { nus })
  if (!a.ok) { console.error(`✗ ${NOM} : bloc d'essai invalide — ${a.raisons.join(' ; ')}`); process.exit(1) }
  process.stdout.write(bloc)
  console.error(`-- ${NOM} : essai à sec de ${num}${AVEC.length ? ` (précédé de ${AVEC.join(', ')})` : ''}, empreinte ${empreinte(nu).slice(0, 12)}… ; après l'exécution : ${M.apres} → « APRES rien_ne_reste=<valeur> » dans ${M.essai_a_sec}`)
  process.exit(0)
}

// ── --reel ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Un préalable manquant se lève et sort en code 2. Jamais process.exit() après un fetch : sous Windows, fermer le processus
// pendant que les sockets de fetch se referment fait tomber libuv (0xC0000409) ; on pose process.exitCode et on laisse finir.
class Prealable extends Error {}
async function reel() {
  const id = ROLES[num].reel
  lireEnvLocal(R)
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const cles = { anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY }
  const manque = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !cles.anon && 'NEXT_PUBLIC_SUPABASE_ANON_KEY', !cles.service && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean)
  const prealable = (m) => { throw new Prealable(m) }
  if (manque.length) prealable(`${manque.join(', ')} absent(s) de .env.local`)
  if (!lireSi(ch(M.fichier))) prealable(`${M.fichier} absent du dépôt`)
  const entetes = (cle, extra = {}) => ({ apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json', ...extra })
  async function appel(chemin, cle, { methode = 'GET', corps, extra } = {}) {
    try {
      const res = await fetch(`${url}${chemin}`, { method: methode, headers: entetes(cle, extra), body: corps === undefined ? undefined : JSON.stringify(corps), signal: AbortSignal.timeout(20_000) })
      const t = await res.text()
      let j = null
      try { j = JSON.parse(t) } catch { j = t }
      return { status: res.status, ok: res.ok, j }
    } catch (e) { return { status: 0, ok: false, j: { message: court(e.message, 120) } } }
  }
  const args = (fn, valeurs) => {
    const p = CONTRAT.fonctions[fn].params
    if (p.length !== valeurs.length) throw new Error(`${fn} : ${valeurs.length} valeur(s) pour ${p.length} paramètre(s) au contrat`)
    return Object.fromEntries(p.map(([n], k) => [n, valeurs[k]]))
  }
  const rpc = (fn, valeurs, cle) => appel(`/rest/v1/rpc/${fn}`, cle, { methode: 'POST', corps: args(fn, valeurs) })
  const code = (x) => `${x.status}${x.j && typeof x.j === 'object' && x.j.code ? ` ${x.j.code}` : ''}${x.j && typeof x.j === 'object' && x.j.message ? ` ${court(x.j.message, 60)}` : ''}`
  const inconnue = (x) => x.status === 404 && x.j && x.j.code === 'PGRST202'
  const racineOk = await appel('/rest/v1/', cles.service)
  if (racineOk.status === 0) prealable(`PostgREST injoignable (${code(racineOk)})`)
  const s = creerRapport(NOM, [id], { entete: `${NOM} ${num} (${M.fiche}) — --reel sur ${url.replace(/^https?:\/\//, '').split('.')[0]}…` })
  const alea = crypto.randomBytes(4).toString('hex')
  const agent = `essai_e2e_${alea}`
  if (num === '0096') {
    s.note('0096 ne crée aucune fonction : son application ne se voit pas par PostgREST, dont la fermeture est justement ce qui est jugé')
    for (const [role, cle] of [['anon', cles.anon], ['service_role', cles.service]]) {
      const x = await appel('/rest/v1/taches?select=*&limit=1', cle, { extra: { 'Accept-Profile': 'ops' } })
      s.verdict(id, !x.ok && x.status !== 0, `schema('ops').from('taches') refusé avec la clé ${role} (${code(x)})`, `schema('ops').from('taches') ${x.status === 0 ? 'sans réponse' : 'lu'} avec la clé ${role} (${code(x)}) : le schéma est exposé`)
    }
    return s.fin()
  }
  const sonde = num === '0097' ? await rpc('ops_battement', [agent], cles.service) : await rpc('ops_etat', [], cles.service)
  if (inconnue(sonde)) prealable(`${num === '0097' ? 'ops_battement' : 'ops_etat'} inconnue de PostgREST : ${num} n'est pas appliquée (${code(sonde)})`)
  let enregistre = false
  let hash = null
  try {
    const e = await rpc('ops_agent_enregistrer', [agent, `Essai ${num} --reel`, ['essai'], ['essai'], ['taches', 'evenements', 'decisions'], 60, 30, 50, 1], cles.service)
    enregistre = e.ok
    s.verdict(id, e.ok, `ops_agent_enregistrer(${agent}) avec la clé de service`, `ops_agent_enregistrer refusé (${code(e)})`)
    if (num === '0097') {
      hash = crypto.randomBytes(32).toString('hex')
      const p = await rpc('ops_agent_poser_jeton', [agent, hash], cles.service)
      s.verdict(id, p.ok, 'ops_agent_poser_jeton avec un hash tiré au hasard', `ops_agent_poser_jeton refusé (${code(p)})`)
      const l = await rpc('ops_agent_par_jeton', [hash], cles.service)
      s.verdict(id, l.ok && Array.isArray(l.j) && l.j.length === 1 && l.j[0].nom === agent, 'ops_agent_par_jeton rend l\'agent', `ops_agent_par_jeton ne rend pas l'agent (${code(l)})`)
      const a = await rpc('ops_agent_par_jeton', [hash], cles.anon)
      s.verdict(id, !a.ok && a.status !== 0, `ops_agent_par_jeton refusé avec la clé anonyme (${code(a)})`, `ops_agent_par_jeton ${a.status === 0 ? 'sans réponse' : 'accepté'} avec la clé anonyme (${code(a)})`)
    } else {
      const c1 = await rpc('ops_tache_creer', [agent, 'essai', `essai_e2e:${alea}`, 'essai', {}, null, null], cles.service)
      const t1 = Array.isArray(c1.j) ? c1.j[0] : null
      s.verdict(id, c1.ok && t1?.id && t1.creee === true, `ops_tache_creer essai_e2e:${alea}`, `ops_tache_creer refusé (${code(c1)})`)
      const pr = await rpc('ops_tache_prendre', [agent], cles.service)
      const t2 = Array.isArray(pr.j) ? pr.j[0] : null
      s.verdict(id, pr.ok && t2?.id === t1?.id, 'ops_tache_prendre rend la tâche', `ops_tache_prendre ne rend pas la tâche (${code(pr)})`)
      const re = await rpc('ops_tache_rendre', [agent, t1?.id ?? null, 'faite', `supabase://essai/${alea}`, null], cles.service)
      s.verdict(id, re.ok && re.j === 'faite', 'ops_tache_rendre → faite', `ops_tache_rendre ne rend pas « faite » (${code(re)})`)
      const c2 = await rpc('ops_tache_creer', [agent, 'essai', `essai_e2e:${alea}:2`, 'essai', {}, null, null], cles.service)
      const cl = await rpc('ops_tache_clore', [agent, `essai_e2e:${alea}:2`, `supabase://essai/${alea}`], cles.service)
      s.verdict(id, c2.ok && cl.ok && cl.j === 'faite', `ops_tache_clore essai_e2e:${alea}:2 → faite`, `ops_tache_clore ne rend pas « faite » (${code(c2)} ; ${code(cl)})`)
      const opts = [{ cle: 'oui', libelle: 'Oui', recommandee: false }, { cle: 'non', libelle: 'Non', recommandee: true }]
      const echeance = new Date(Date.now() + 2 * 3600_000).toISOString()
      const dc = await rpc('ops_decision_creer', [agent, `Essai ${num} --reel ?`, null, opts, 'non', null, 'aucune', echeance, `essai_e2e:${alea}:d`, null], cles.service)
      const d = Array.isArray(dc.j) ? dc.j[0] : null
      s.verdict(id, dc.ok && d?.id, 'ops_decision_creer', `ops_decision_creer refusé (${code(dc)})`)
      const tr = await rpc('ops_decision_trancher', [d?.id ?? null, 'oui', crypto.randomUUID()], cles.service)
      s.verdict(id, !tr.ok && tr.j?.message === 'ops:auteur', 'trancher avec un uuid tiré au hasard → ops:auteur', `trancher avec un uuid tiré au hasard : ${code(tr)} (ops:auteur attendu)`)
      const tt = await rpc('ops_decisions_tranchees', [agent, new Date(Date.now() - 3600_000).toISOString()], cles.service)
      s.verdict(id, tt.ok && Array.isArray(tt.j) && tt.j.length === 0, 'ops_decisions_tranchees de l\'agent : 0 ligne', `ops_decisions_tranchees : ${code(tt)}`)
      const et = await rpc('ops_etat', [], cles.service)
      const six = ['taches', 'agents', 'decisions_ouvertes', 'interrupteurs', 'couts_mois', 'notifications_jour']
      s.verdict(id, et.ok && et.j && six.every((k) => k in et.j), 'ops_etat rend les six clés', `ops_etat : ${code(et)}`)
      const ea = await rpc('ops_etat', [], cles.anon)
      s.verdict(id, !ea.ok && ea.status !== 0, `ops_etat refusé avec la clé anonyme (${code(ea)})`, `ops_etat ${ea.status === 0 ? 'sans réponse' : 'accepté'} avec la clé anonyme (${code(ea)})`)
    }
  } catch (e) {
    s.echoue(id, `exception : ${court(e.message, 160)}`)
  } finally {
    if (enregistre) {
      const rt = await rpc('ops_agent_retirer', [agent], cles.service)
      s.verdict(id, rt.ok, `ménage : ops_agent_retirer(${agent})`, `ménage : ops_agent_retirer refusé (${code(rt)}) — ${agent} reste en base`)
      if (num === '0097' && hash) {
        const l = await rpc('ops_agent_par_jeton', [hash], cles.service)
        s.verdict(id, l.ok && Array.isArray(l.j) && l.j.length === 0, `${agent} a disparu (par_jeton : 0 ligne)`, `${agent} est encore rendu par ops_agent_par_jeton (${code(l)})`)
      }
      if (num === '0098') {
        const et = await rpc('ops_etat', [], cles.service)
        s.verdict(id, et.ok && !JSON.stringify(et.j).includes(agent), `${agent} a disparu`, `${agent} est encore dans ops_etat`)
      }
    }
  }
  return s.fin()
}

// ── Aiguillage ──────────────────────────────────────────────────────────────────────────────────────────────────────────
if (GENERER) genererEssai()
else if (o.reel) {
  try { process.exitCode = await reel() } catch (e) {
    if (!(e instanceof Prealable)) throw e
    console.log(`${NOM} ${num} --reel : PRÉALABLE MANQUANT — ${e.message}`)
    process.exitCode = 2
  }
}
else process.exit(juger())
