// scripts/fixtures/025/verrous-sql.mjs — les outils des juges des verrous de public.artisans (verrou-maj-qa en entier ;
// verrou-insertion-qa pour ses contrôles), écrit par Claude Code pour la fiche 025-13. Lecture statique : rien ne touche une base.
//
//   - le découpage du SQL (chaînes, blocs $tag$, commentaires) et des instructions, repris de verrou-site-qa / verrou-insertion-qa ;
//   - l'analyse d'une définition « create or replace function … $$ … $$ » et la plus longue sous-suite commune de ses lignes ;
//   - un analyseur de corps PL/pgSQL (begin … end, if / elsif / else / end if, affectations, raise, return) qui garde la position
//     de chaque instruction dans le texte brut, et un interprète de ce sous-ensemble : conditions, = any (array[…]), in, @>, <@,
//     is [not] null, is [not] distinct from, exists (select … from artisans …), appel d'une fonction « language sql »
//     (security definer ou non), current_user. La RLS de public.artisans est simulée : un rôle autre que postgres et
//     service_role ne voit que sa propre ligne (artisan_select_own, 0001_artisans.sql:19-20), une fonction security definer
//     (propriétaire postgres) voit tout ;
//   - les mutations « de branche » d'une affectation : retirée, remplacée par « -- col », commentée (« -- new.col := … »),
//     enfermée dans /* … */, déplacée après le « end if; » du bloc current_user, enfermée sous « if false then … end if; »,
//     neutralisée (« new.col := new.col; ») ;
//   - le simulateur des contrôles après collage : chaque « case when … then '…' else '…' end » est évalué contre des textes de
//     pg_get_functiondef simulés et contre un catalogue pg_trigger simulé (tgname, tgrelid, tgfoid, tgtype, tgenabled,
//     tgisinternal), avec ses mutants (fonction, AFTER, FOR EACH STATEMENT, événement, D / R / A, autre table, absent).
import crypto from 'node:crypto'

export const premiere = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
export const court = (x, n = 140) => { const t = String(x ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
export const ligneDe = (texte, pos) => texte.slice(0, pos).split('\n').length
export const COMMANDES_SQL = new Set(['create', 'alter', 'drop', 'select', 'with', 'insert', 'update', 'delete', 'comment', 'grant', 'revoke', 'do', 'begin', 'commit', 'rollback', 'set', 'reset', 'notify', 'truncate', 'analyze', 'vacuum', 'refresh', 'lock', 'call', 'values', 'explain', 'reindex', 'security', 'table'])
export const MOTS_ECRITURE = new Set(['insert', 'update', 'delete', 'merge', 'truncate', 'drop', 'alter', 'create', 'grant', 'revoke', 'copy', 'call', 'do', 'execute', 'perform', 'set', 'reset', 'lock', 'vacuum', 'analyze', 'refresh', 'comment', 'begin', 'commit', 'rollback', 'savepoint', 'notify', 'listen', 'reindex', 'cluster', 'discard', 'security', 'into'])
export const SI_EXTERIEUR = /^if current_user not in \('service_role', 'postgres'\) then$/i
export const AFFECTATION = /^new\.([a-z_][a-z0-9_]*) := (.+);$/i

// ── Découpage du SQL ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export function decouperSql(sql) {
  const seg = []
  let i = 0, code = '', debutCode = 0
  const vider = () => { if (code) seg.push({ type: 'code', texte: code, pos: debutCode }); code = '' }
  while (i < sql.length) {
    const c = sql[i], d = sql.slice(i, i + 2)
    if (c === "'") {
      let j = i + 1, ferme = false
      while (j < sql.length) { if (sql[j] === "'") { if (sql[j + 1] === "'") j += 2; else { j++; ferme = true; break } } else j++ }
      vider(); seg.push({ type: 'chaine', texte: sql.slice(i, j), pos: i, ferme }); i = j; continue
    }
    if (c === '$') {
      const m = /^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/.exec(sql.slice(i))
      if (m) {
        const fin = sql.indexOf(m[0], i + m[0].length)
        const j = fin < 0 ? sql.length : fin + m[0].length
        vider(); seg.push({ type: 'dollar', texte: sql.slice(i, j), pos: i, tag: m[0], corps: sql.slice(i + m[0].length, fin < 0 ? sql.length : fin), ferme: fin >= 0 }); i = j; continue
      }
    }
    if (d === '--') { const nl = sql.indexOf('\n', i); const j = nl < 0 ? sql.length : nl; vider(); seg.push({ type: 'ligne', texte: sql.slice(i, j), pos: i }); i = j; continue }
    if (d === '/*') { const f = sql.indexOf('*/', i + 2); const j = f < 0 ? sql.length : f + 2; vider(); seg.push({ type: 'bloc', texte: sql.slice(i, j), pos: i, ferme: f >= 0 }); i = j; continue }
    if (!code) debutCode = i
    code += c; i++
  }
  vider()
  return seg
}
export const sansCommentaires = (sql) => decouperSql(sql).filter((s) => s.type !== 'ligne' && s.type !== 'bloc').map((s) => s.texte).join('')
export const sansCommentairesPartout = (sql) => decouperSql(sql).filter((s) => s.type !== 'ligne' && s.type !== 'bloc').map((s) => s.type === 'dollar' ? `${s.tag}${sansCommentairesPartout(s.corps)}${s.ferme ? s.tag : ''}` : s.texte).join('')
export const noyau = (sql) => sansCommentaires(sql).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim()).join('\n')
export function instructions(sql) {
  const res = []
  let cur = [], fin = -1
  const clore = () => {
    const utiles = cur.filter((s) => s.type !== 'ligne' && s.type !== 'bloc')
    const code = utiles.map((s) => s.texte).join('')
    if (code.trim()) {
      const s0 = utiles.find((s) => s.texte.trim())
      res.push({ segs: cur, code: code.trim(), debut: s0.pos + (s0.texte.length - s0.texte.trimStart().length), fin })
    }
    cur = []; fin = -1
  }
  for (const s of decouperSql(sql)) {
    if (s.type !== 'code') { cur.push(s); continue }
    let t = s.texte, p = s.pos, k
    while ((k = t.indexOf(';')) >= 0) { cur.push({ type: 'code', texte: t.slice(0, k + 1), pos: p }); fin = p + k; clore(); p += k + 1; t = t.slice(k + 1) }
    if (t) cur.push({ type: 'code', texte: t, pos: p })
  }
  clore()
  return res
}
export function defautsDeSyntaxe(sql, { commandes = COMMANDES_SQL } = {}) {
  const d = []
  const verifier = (texte, ou) => {
    let prof = 0, negatif = false
    for (const s of decouperSql(texte)) {
      if (s.type === 'chaine' && !s.ferme) d.push(`${ou}chaîne non refermée (ligne ${ligneDe(texte, s.pos)})`)
      if (s.type === 'dollar' && !s.ferme) d.push(`${ou}bloc ${s.tag} non refermé (ligne ${ligneDe(texte, s.pos)})`)
      if (s.type === 'bloc' && !s.ferme) d.push(`${ou}commentaire /* non refermé`)
      if (s.type === 'code') for (const c of s.texte) { if (c === '(') prof++; else if (c === ')') { prof--; if (prof < 0) negatif = true } }
      if (s.type === 'dollar' && s.ferme) verifier(s.corps, `corps ${s.tag} : `)
    }
    if (prof !== 0 || negatif) d.push(`${ou}parenthèses déséquilibrées (${prof > 0 ? `${prof} non refermée(s)` : negatif ? 'une « ) » avant sa « ( »' : `${-prof} de trop`})`)
  }
  verifier(sql, '')
  const ins = instructions(sql)
  if (!ins.length) d.push('aucune instruction SQL')
  for (const x of ins) {
    const mot = (/^[A-Za-z]+/.exec(x.code) || [''])[0].toLowerCase()
    if (!commandes.has(mot)) d.push(`instruction qui commence par « ${court(x.code, 30)} » (ligne ${ligneDe(sql, x.debut)})`)
  }
  const utile = sansCommentairesPartout(sql)
  if (/\bconstant\b/i.test(utile)) d.push('mot-clé CONSTANT (refusé par l’éditeur SQL le 08/09)')
  if (/U&'/.test(utile)) d.push('littéral U&\'…\' (dépend de standard_conforming_strings)')
  return d
}
export function divergence(a, b) {
  const x = a.split('\n'), y = b.split('\n')
  const n = x.findIndex((l, k) => l !== y[k])
  const k = n < 0 ? x.length : n
  return `ligne ${k + 1} du SQL utile : « ${court(x[k] ?? '(fin)', 70)} » / « ${court(y[k] ?? '(fin)', 70)} »`
}

// ── Définitions de fonction, lignes de code, sous-suite commune ─────────────────────────────────────────────────────────────
export const normaliserLigne = (l) => l.replace(/\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/g, '$$$$').replace(/\s*:=\s*/g, ' := ').replace(/\s+/g, ' ').trim()
export const lignesDeCode = (corps) => sansCommentairesPartout(corps).split('\n').map(normaliserLigne).filter(Boolean)
/** L'empreinte du code d'un fichier SQL, commentaires ôtés partout (corps $$ compris), espaces réduits : un changement de
 *  commentaire ne la change pas, un changement de code si. */
export const empreinteCode = (texte) => crypto.createHash('sha1').update(lignesDeCode(String(texte).replace(/\r\n/g, '\n')).join('\n')).digest('hex')
export function analyserDefinition(ins) {
  const iDollar = ins.segs.findIndex((s) => s.type === 'dollar')
  const avant = ins.segs.slice(0, iDollar < 0 ? ins.segs.length : iDollar).filter((s) => s.type === 'code' || s.type === 'chaine').map((s) => s.texte).join('')
  const apres = iDollar < 0 ? '' : ins.segs.slice(iDollar + 1).filter((s) => s.type === 'code' || s.type === 'chaine' || s.type === 'dollar').map((s) => s.texte).join('')
  const d = iDollar < 0 ? null : ins.segs[iDollar]
  return {
    entete: avant.replace(/\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/g, '$$$$').replace(/\s+/g, ' ').trim().toLowerCase(),
    corps: d ? d.corps : null, ferme: !!(d && d.ferme), tag: d ? d.tag : null,
    apres: apres.replace(/\s+/g, ''),
    dollars: ins.segs.filter((s) => s.type === 'dollar').length,
    lignes: d ? lignesDeCode(d.corps) : [],
  }
}
export function differenceLignes(a, b) {
  const n = a.length, m = b.length
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const retires = [], ajoutes = []
  let i = 0, j = 0
  while (i < n && j < m) { if (a[i] === b[j]) { i++; j++ } else if (L[i + 1][j] >= L[i][j + 1]) retires.push(i++); else ajoutes.push(j++) }
  while (i < n) retires.push(i++)
  while (j < m) ajoutes.push(j++)
  return { retires, ajoutes }
}
/** Pour chaque ligne de code (indice), la pile des « if … then » ouverts (lecture ligne à ligne, comme les juges 025-04/025-12). */
export function piles(lignes) {
  const pile = [], res = new Map()
  lignes.forEach((l, j) => {
    const b = l.toLowerCase()
    if (/^end if\s*;$/.test(b)) { pile.pop(); return }
    if (b === 'else' || /^els(?:e)?if\b.*\bthen$/.test(b)) { if (pile.length) pile[pile.length - 1].branche = 'else'; return }
    if (/^if\b.*\bthen$/.test(b)) { pile.push({ ligne: l, branche: 'then' }); return }
    res.set(j, pile.map((p) => ({ ...p })))
  })
  return res
}
export const dansLaBrancheServeur = (p) => !!p && p.length === 1 && SI_EXTERIEUR.test(p[0].ligne) && p[0].branche === 'then'
export const decrirePile = (p) => (p && p.length ? `sous ${p.map((x) => `« ${court(x.ligne, 50)} »${x.branche === 'else' ? ' (branche else)' : ''}`).join(' > ')}` : 'hors de tout bloc if')
export function affectations(lignes) {
  const p = piles(lignes)
  const out = []
  lignes.forEach((l, j) => { const m = AFFECTATION.exec(l); if (m) out.push({ j, col: m[1].toLowerCase(), valeur: m[2], pile: p.get(j) }) })
  return out
}
/** Ce que pg_get_functiondef rend (forme relue en production le 24/09) : en-tête de Postgres, corps tel qu'il a été collé. */
export const defSimulee = (fn, corps) => `CREATE OR REPLACE FUNCTION public.${fn}()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO 'public'\nAS $function$${corps}$function$\n`
export const enCrlf = (t) => t.replace(/\r?\n/g, '\r\n')

// ── Jetons ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Jetons d'un texte SQL ou PL/pgSQL, commentaires sautés : { t: 'lit' | 'mot' | 'nb' | 'op' | '(' | ')' | ',' | ';' | '[' | ']', v, debut, fin }. */
export function jetons(s) {
  const out = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) { i++; continue }
    if (c === '-' && s[i + 1] === '-') { const nl = s.indexOf('\n', i); i = nl < 0 ? s.length : nl; continue }
    if (c === '/' && s[i + 1] === '*') { const f = s.indexOf('*/', i + 2); if (f < 0) throw new Error('commentaire /* non refermé'); i = f + 2; continue }
    const debut = i
    if ((c === 'e' || c === 'E') && s[i + 1] === "'") {
      let j = i + 2, v = ''
      for (;;) {
        if (j >= s.length) throw new Error('chaîne E\'…\' non refermée')
        if (s[j] === '\\') { v += s[j + 1] ?? ''; j += 2; continue }
        if (s[j] === "'") { if (s[j + 1] === "'") { v += "'"; j += 2; continue } j++; break }
        v += s[j++]
      }
      out.push({ t: 'lit', v, debut, fin: j }); i = j; continue
    }
    if (c === "'") {
      let j = i + 1, v = ''
      for (;;) {
        if (j >= s.length) throw new Error('chaîne non refermée')
        if (s[j] === "'") { if (s[j + 1] === "'") { v += "'"; j += 2; continue } j++; break }
        v += s[j++]
      }
      out.push({ t: 'lit', v, debut, fin: j }); i = j; continue
    }
    if (c === '$') {
      const m = /^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/.exec(s.slice(i))
      if (m) { const f = s.indexOf(m[0], i + m[0].length); if (f < 0) throw new Error(`bloc ${m[0]} non refermé`); out.push({ t: 'lit', v: s.slice(i + m[0].length, f), debut, fin: f + m[0].length }); i = f + m[0].length; continue }
    }
    if (c === '"') { const f = s.indexOf('"', i + 1); if (f < 0) throw new Error('identifiant "…" non refermé'); out.push({ t: 'mot', v: s.slice(i + 1, f).toLowerCase(), debut, fin: f + 1 }); i = f + 1; continue }
    if ('(),;[]'.includes(c)) { out.push({ t: c, debut, fin: i + 1 }); i++; continue }
    const op = /^(?::=|::|!~\*|!~|~\*|<>|!=|>=|<=|@>|<@|&&|\|\||[~=<>+\-*/%&|#^.])/.exec(s.slice(i))
    if (op) { out.push({ t: 'op', v: op[0], debut, fin: i + op[0].length }); i += op[0].length; continue }
    const w = /^[A-Za-z_][\w$]*(?:\.[A-Za-z_][\w$]*)*/.exec(s.slice(i))
    if (w) { out.push({ t: 'mot', v: w[0].toLowerCase(), debut, fin: i + w[0].length }); i += w[0].length; continue }
    const nb = /^\d+(?:\.\d+)?/.exec(s.slice(i))
    if (nb) { out.push({ t: 'nb', v: Number(nb[0]), debut, fin: i + nb[0].length }); i += nb[0].length; continue }
    throw new Error(`caractère inattendu « ${c} »`)
  }
  return out
}
export const texteJetons = (ts) => ts.map((x) => x.t === 'lit' ? `'${String(x.v).replace(/'/g, "''")}'` : x.t === 'mot' || x.t === 'op' || x.t === 'nb' ? String(x.v) : x.t).join(' ')
const estMot = (x, v) => !!x && x.t === 'mot' && (v === undefined || x.v === v)
const estOp = (x, v) => !!x && x.t === 'op' && (v === undefined || x.v === v)

// ── Motifs : LIKE et expressions rationnelles de Postgres (ARE) → RegExp ───────────────────────────────────────────────────────
const echapperRe = (x) => x.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
export function likeVersRegex(p, insensible, echap = '\\') {
  let r = ''
  for (let i = 0; i < p.length; i++) {
    const c = p[i]
    if (echap && c === echap) { i++; if (i < p.length) r += echapperRe(p[i]); continue }
    r += c === '%' ? '[\\s\\S]*' : c === '_' ? '[\\s\\S]' : echapperRe(c)
  }
  return new RegExp(`^${r}$`, insensible ? 'i' : '')
}
/** Une ARE de Postgres en RegExp : « . » attrape le saut de ligne (mode par défaut de Postgres), \m \M \y → \b. */
export function areVersRegex(p, insensible) {
  let s = p.startsWith('***:') ? p.slice(4) : p
  s = s.replace(/\[\[:(space|alpha|digit|alnum|upper|lower):\]\]/g, (_, k) => ({ space: '\\s', alpha: '[A-Za-z]', digit: '\\d', alnum: '[A-Za-z0-9]', upper: '[A-Z]', lower: '[a-z]' })[k])
  s = s.replace(/\[:(space|alpha|digit|alnum|upper|lower):\]/g, (_, k) => ({ space: '\\s', alpha: 'A-Za-z', digit: '0-9', alnum: 'A-Za-z0-9', upper: 'A-Z', lower: 'a-z' })[k])
  s = s.replace(/(?<!\\)((?:\\\\)*)\\[mMy]/g, '$1\\b')
  return new RegExp(s, `s${insensible ? 'i' : ''}`)
}

// ── Le catalogue pg_trigger simulé et ses mutants ───────────────────────────────────────────────────────────────────────────
/** Les déclencheurs de public.artisans en production (relus le 24/09 : tgtype 7 = ROW|BEFORE|INSERT, 19 = ROW|BEFORE|UPDATE). */
export const CATALOGUE_ARTISANS = Object.freeze([
  { tgname: 'trg_artisans_slug_historique', tgrelid: 'public.artisans', tgfoid: 'public.artisans_slug_historique()', tgtype: 19, tgenabled: 'O', tgisinternal: false },
  { tgname: 'trg_lock_artisan_ins', tgrelid: 'public.artisans', tgfoid: 'public.lock_artisan_privileges_ins()', tgtype: 7, tgenabled: 'O', tgisinternal: false },
  { tgname: 'trg_lock_artisan_upd', tgrelid: 'public.artisans', tgfoid: 'public.lock_artisan_privileges()', tgtype: 19, tgenabled: 'O', tgisinternal: false },
])
/** Les mutants du déclencheur `tgname` : chacun doit faire répondre autre chose que « oui » à la ligne qui le contrôle. */
export function mutantsDeclencheur(tgname, catalogue = CATALOGUE_ARTISANS) {
  const base = catalogue.find((r) => r.tgname === tgname)
  if (!base) throw new Error(`${tgname} absent du catalogue simulé`)
  const avec = (nom, patch) => ({ nom, catalogue: catalogue.map((r) => (r === base ? { ...r, ...patch } : { ...r })) })
  const evenement = base.tgtype & 16 ? (base.tgtype & ~16) | 4 : (base.tgtype & ~4) | 16
  return [
    { nom: 'absent', catalogue: catalogue.filter((r) => r !== base).map((r) => ({ ...r })) },
    avec('autre fonction (tgfoid)', { tgfoid: 'public.autre_fonction()' }),
    avec('AFTER au lieu de BEFORE', { tgtype: base.tgtype & ~2 }),
    avec('FOR EACH STATEMENT', { tgtype: base.tgtype & ~1 }),
    avec(`autre événement (${base.tgtype & 16 ? 'INSERT' : 'UPDATE'})`, { tgtype: evenement }),
    avec("désactivé (tgenabled = 'D')", { tgenabled: 'D' }),
    avec("réplication seulement (tgenabled = 'R')", { tgenabled: 'R' }),
    avec("toujours, même en réplication (tgenabled = 'A')", { tgenabled: 'A' }),
    avec('autre table', { tgrelid: 'public.leads' }),
  ]
}
const normRelation = (x) => { const t = String(x).replace(/"/g, '').trim().toLowerCase(); return t.includes('.') ? t : `public.${t}` }
const normFonction = (x) => { let t = String(x).replace(/"/g, '').replace(/\s+/g, '').toLowerCase(); if (!t.includes('.')) t = `public.${t}`; return t.endsWith(')') ? t : `${t}()` }

// ── Le simulateur des contrôles après collage ──────────────────────────────────────────────────────────────────────────────
const ARGUMENT_FONCTION = /^(?:public\.)?([a-z_][a-z0-9_]*)(?:\(\))?$/i
/** Clé d'une lecture pg_get_functiondef('<fn>'::regprocedure) : le nom de la fonction, sans schéma ni parenthèses. */
function lectureFonction(ops) {
  let x = ops.slice()
  for (;;) {
    const n = x.length
    if (n >= 2 && estOp(x[n - 2], '::') && x[n - 1].t === 'mot') { x = x.slice(0, -2); continue }
    if (n >= 2 && x[0].t === '(' && x[n - 1].t === ')') {
      let p = 0, enveloppe = true
      for (let k = 0; k < n; k++) { if (x[k].t === '(') p++; else if (x[k].t === ')') p--; if (p === 0 && k < n - 1) { enveloppe = false; break } }
      if (enveloppe) { x = x.slice(1, -1); if (estMot(x[0], 'select')) x = x.slice(1); continue }
    }
    break
  }
  if (x.length === 6 && estMot(x[0]) && /^(?:pg_catalog\.)?pg_get_functiondef$/.test(x[0].v) && x[1].t === '(' && x[2].t === 'lit'
    && estOp(x[3], '::') && ['regprocedure', 'regproc'].includes(x[4].v) && x[5].t === ')') {
    const m = ARGUMENT_FONCTION.exec(x[2].v.trim())
    return m ? m[1].toLowerCase() : null
  }
  return null
}
const COLONNES_TRIGGER = new Set(['tgname', 'tgrelid', 'tgfoid', 'tgtype', 'tgenabled', 'tgisinternal'])
function compilerConditionControle(ts) {
  let i = 0
  const t = (k = 0) => ts[i + k]
  const attendre = (type, v) => { const x = t(); if (!x || x.t !== type || (v !== undefined && x.v !== v)) throw new Error(`« ${v ?? type} » attendu près de « ${court(texteJetons(ts.slice(i, i + 5)), 50)} »`); i++; return x }
  const comparateurTexte = (k = 0) => {
    const x = t(k)
    if (estMot(x, 'like') || estMot(x, 'ilike')) return 1
    if (estMot(x, 'not') && (estMot(t(k + 1), 'like') || estMot(t(k + 1), 'ilike'))) return 2
    if (estOp(x) && ['~', '~*', '!~', '!~*'].includes(x.v)) return 1
    if (estMot(x, 'similar')) return -1
    return 0
  }
  const operandeFonction = (arret) => {
    const debut = i
    let p = 0
    while (i < ts.length) {
      const x = t()
      if (p === 0) {
        if (arret ? x.t === arret : comparateurTexte() !== 0) break
        if (x.t === ')' || estMot(x, 'and') || estMot(x, 'or')) break
      }
      if (x.t === '(') p++; else if (x.t === ')') p--
      i++
    }
    const fn = lectureFonction(ts.slice(debut, i))
    if (!fn) throw new Error(`opérande non simulée « ${court(texteJetons(ts.slice(debut, i)), 70)} » (pg_get_functiondef('public.<fonction>()'::regprocedure) attendu)`)
    return fn
  }
  const texteDe = (ctx, fn) => { if (!ctx.defs || !(fn in ctx.defs)) throw new Error(`pg_get_functiondef de ${fn} non simulé ici`); return ctx.defs[fn] }
  const numerique = (f) => {
    const c = t(), n = t(1)
    if (!estOp(c) || !['>', '>=', '=', '<>', '!=', '<', '<='].includes(c.v) || n?.t !== 'nb') throw new Error('comparaison à un nombre attendue après position/strpos')
    i += 2
    const v = n.v
    const cmp = { '>': (a) => a > v, '>=': (a) => a >= v, '=': (a) => a === v, '<>': (a) => a !== v, '!=': (a) => a !== v, '<': (a) => a < v, '<=': (a) => a <= v }[c.v]
    return (ctx) => cmp(f(ctx))
  }
  // exists (select … from pg_trigger [alias] where …)
  const existsDeclencheur = () => {
    attendre('mot', 'exists'); attendre('(')
    attendre('mot', 'select')
    let p = 0
    while (i < ts.length && !(p === 0 && estMot(t(), 'from'))) { if (t().t === '(') p++; else if (t().t === ')') p--; i++ }
    attendre('mot', 'from')
    const table = attendre('mot').v
    if (!/^(?:pg_catalog\.)?pg_trigger$/.test(table)) throw new Error(`exists sur ${table} : non simulé (seul pg_trigger l'est)`)
    let alias = null
    if (estMot(t(), 'as')) i++
    if (estMot(t()) && !estMot(t(), 'where')) alias = attendre('mot').v
    let cond = () => true
    if (estMot(t(), 'where')) { i++; cond = tou(alias) }
    attendre(')')
    return (ctx) => { if (!ctx.catalogue) throw new Error('catalogue pg_trigger non simulé ici'); return ctx.catalogue.some((r) => cond(r) === true) }
  }
  // conditions sur une ligne de pg_trigger
  const colonne = (alias) => {
    const x = t()
    if (!estMot(x)) return null
    let nom = x.v
    if (alias && nom.startsWith(`${alias}.`)) nom = nom.slice(alias.length + 1)
    else if (nom.startsWith('pg_trigger.')) nom = nom.slice(11)
    if (!COLONNES_TRIGGER.has(nom)) return null
    i++
    return nom
  }
  const valeur = () => {
    const x = t()
    if (!x) throw new Error('valeur attendue')
    if (estMot(x, 'to_regclass') || estMot(x, 'to_regprocedure') || estMot(x, 'to_regproc')) {
      i++; attendre('('); const l = attendre('lit'); attendre(')')
      return { type: x.v === 'to_regclass' ? 'relation' : 'fonction', v: x.v === 'to_regclass' ? normRelation(l.v) : normFonction(l.v) }
    }
    if (x.t === 'nb') { i++; return { type: 'nb', v: x.v } }
    if (estMot(x, 'true') || estMot(x, 'false')) { i++; return { type: 'bool', v: x.v === 'true' } }
    if (x.t === 'lit') {
      i++
      let type = 'texte', v = x.v
      while (estOp(t(), '::')) {
        i++
        const ty = attendre('mot').v
        if (ty === 'regclass') { type = 'relation'; v = normRelation(v) } else if (ty === 'regprocedure' || ty === 'regproc') { type = 'fonction'; v = normFonction(v) } else if (['char', 'text', 'name', 'varchar', 'bpchar'].includes(ty)) type = 'texte'
        else if (['int', 'int2', 'integer', 'smallint', 'int4'].includes(ty)) { type = 'nb'; v = Number(v) } else throw new Error(`conversion ::${ty} non simulée`)
      }
      return { type, v }
    }
    throw new Error(`valeur non simulée « ${court(texteJetons(ts.slice(i, i + 3)), 40)} »`)
  }
  const typeColonne = { tgname: 'texte', tgrelid: 'relation', tgfoid: 'fonction', tgtype: 'nb', tgenabled: 'texte', tgisinternal: 'bool' }
  const comparer = (op, a, b) => ({ '=': a === b, '<>': a !== b, '!=': a !== b, '>': a > b, '>=': a >= b, '<': a < b, '<=': a <= b })[op]
  const tatome = (alias) => {
    // (col & n) op m   |   col & n op m
    const sauve = i
    let masque = null, col = null
    if (t()?.t === '(') {
      i++
      const c = colonne(alias)
      if (c && estOp(t(), '&') && t(1)?.t === 'nb' && t(2)?.t === ')') { col = c; i++; masque = t().v; i += 2 } else i = sauve
    }
    if (!col) {
      const c = colonne(alias)
      if (!c) { i = sauve; throw new Error(`condition sur pg_trigger non simulée près de « ${court(texteJetons(ts.slice(i, i + 5)), 50)} »`) }
      col = c
      if (estOp(t(), '&') && t(1)?.t === 'nb') { i++; masque = t().v; i++ }
    }
    const lire = (r) => (masque === null ? r[col] : (r[col] & masque))
    const tyCol = masque === null ? typeColonne[col] : 'nb'
    if (estMot(t(), 'is')) {
      i++
      let neg = false
      if (estMot(t(), 'not')) { neg = true; i++ }
      const v = attendre('mot').v
      if (!['true', 'false', 'null'].includes(v)) throw new Error(`is ${v} non simulé`)
      return (r) => { const x = lire(r); const res = v === 'null' ? x === null || x === undefined : x === (v === 'true'); return neg ? !res : res }
    }
    if (estMot(t(), 'in') || (estMot(t(), 'not') && estMot(t(1), 'in'))) {
      const neg = estMot(t(), 'not'); i += neg ? 2 : 1
      attendre('(')
      const vals = []
      for (;;) { vals.push(valeur()); if (t()?.t === ',') { i++; continue } break }
      attendre(')')
      for (const v of vals) if (v.type !== tyCol) throw new Error(`${col} comparée à une valeur de type ${v.type} (${tyCol} attendu : erreur en Postgres)`)
      return (r) => { const x = lire(r); const res = vals.some((v) => v.v === x); return neg ? !res : res }
    }
    if (estOp(t()) && ['=', '<>', '!=', '>', '>=', '<', '<='].includes(t().v)) {
      const op = t().v; i++
      const v = valeur()
      if (v.type !== tyCol) throw new Error(`${col} comparée à ${v.type === 'texte' ? 'un texte sans ::regclass / ::regprocedure' : `une valeur de type ${v.type}`} (erreur en Postgres)`)
      return (r) => comparer(op, lire(r), v.v)
    }
    if (tyCol === 'bool') return (r) => lire(r) === true
    throw new Error(`comparaison attendue après ${col}`)
  }
  const tnon = (alias) => { if (estMot(t(), 'not')) { i++; const f = tnon(alias); return (r) => !f(r) } if (t()?.t === '(') { const sauve = i; try { i++; const g = tou(alias); attendre(')'); return g } catch { i = sauve } } return tatome(alias) }
  const tet = (alias) => { let g = tnon(alias); while (estMot(t(), 'and')) { i++; const d = tnon(alias), a = g; g = (r) => a(r) && d(r) } return g }
  const tou = (alias) => { let g = tet(alias); while (estMot(t(), 'or')) { i++; const d = tet(alias), a = g; g = (r) => a(r) || d(r) } return g }
  // conditions sur pg_get_functiondef
  const atome = () => {
    if (estMot(t(), 'exists')) return existsDeclencheur()
    if (estMot(t(), 'position') && t(1)?.t === '(') {
      i += 2
      const l = attendre('lit'); attendre('mot', 'in')
      const fn = operandeFonction(')'); attendre(')')
      return numerique((ctx) => texteDe(ctx, fn).indexOf(l.v) + 1)
    }
    if (estMot(t(), 'strpos') && t(1)?.t === '(') {
      i += 2
      const fn = operandeFonction(','); attendre(',')
      const l = attendre('lit'); attendre(')')
      return numerique((ctx) => texteDe(ctx, fn).indexOf(l.v) + 1)
    }
    const fn = operandeFonction(null)
    const k = comparateurTexte()
    if (k <= 0) throw new Error(k < 0 ? 'similar to non pris en charge' : `comparaison attendue (like, ilike, ~, ~*, !~, !~*, position, strpos) près de « ${court(texteJetons(ts.slice(i, i + 4)), 40)} »`)
    let neg = false
    if (k === 2) { neg = true; i++ }
    const x = t(); i++
    let sorte = x.v
    if (x.t === 'op' && sorte.startsWith('!')) { neg = !neg; sorte = sorte.slice(1) }
    const l = attendre('lit')
    let echap = '\\'
    if (estMot(t(), 'escape')) { i++; echap = attendre('lit').v }
    const re = sorte === 'like' || sorte === 'ilike' ? likeVersRegex(l.v, sorte === 'ilike', echap) : areVersRegex(l.v, sorte === '~*')
    return (ctx) => re.test(texteDe(ctx, fn)) !== neg
  }
  const non = () => {
    if (estMot(t(), 'not') && comparateurTexte() !== 2) { i++; const f = non(); return (ctx) => !f(ctx) }
    if (t()?.t === '(') {
      const sauve = i
      try { i++; const g = ou(); attendre(')'); if (!comparateurTexte()) return g } catch { /* une opérande entre parenthèses */ }
      i = sauve
    }
    return atome()
  }
  const et = () => { let g = non(); while (estMot(t(), 'and')) { i++; const d = non(), a = g; g = (ctx) => a(ctx) && d(ctx) } return g }
  const ou = () => { let g = et(); while (estMot(t(), 'or')) { i++; const d = et(), a = g; g = (ctx) => a(ctx) || d(ctx) } return g }
  const f = ou()
  if (i !== ts.length) throw new Error(`jeton inattendu « ${court(texteJetons(ts.slice(i, i + 4)), 40)} »`)
  return f
}
/**
 * Un contrôle après collage lu par le juge → { defauts[], ecritures[], lectures (Set des fonctions lues), lignes[], erreur }.
 * Chaque ligne : { n, quoi, branches: [{ cond (ctx → bool) | null, val, erreur }], sinon, erreur, litteraux[], mots[], peutOui }.
 * ctx = { defs: { <fonction>: texte de pg_get_functiondef }, catalogue: [lignes de pg_trigger] }.
 */
export function lireControle(texte) {
  const res = { defauts: defautsDeSyntaxe(texte, { commandes: new Set(['select', 'with']) }), ecritures: [], lectures: new Set(), lignes: [], erreur: null }
  let ts
  try { ts = jetons(sansCommentaires(texte)) } catch (e) { res.erreur = `illisible par le juge : ${premiere(e)}`; return res }
  res.ecritures = [...new Set(ts.filter((x) => x.t === 'mot' && MOTS_ECRITURE.has(x.v)).map((x) => x.v))]
  for (let k = 0; k < ts.length; k++) if (estMot(ts[k]) && /^(?:pg_catalog\.)?pg_get_functiondef$/.test(ts[k].v)) { const fn = lectureFonction(ts.slice(k, k + 6)); if (fn) res.lectures.add(fn) }
  let dernierSelect = -1
  for (let k = 0; k < ts.length; k++) {
    if (estMot(ts[k], 'select')) dernierSelect = k
    if (!estMot(ts[k], 'case')) continue
    const ligne = { n: res.lignes.length + 1, quoi: '', branches: [], sinon: null, erreur: null, litteraux: [], mots: [] }
    const etiquette = ts.slice(dernierSelect + 1, k).find((x) => x.t === 'lit')
    ligne.quoi = etiquette ? etiquette.v : ''
    res.lignes.push(ligne)
    let j = k + 1
    if (!estMot(ts[j], 'when')) { ligne.erreur = 'case <expression> when … (forme simple) non pris en charge'; continue }
    while (estMot(ts[j], 'when')) {
      let q = j + 1, p = 0
      while (q < ts.length && !(p === 0 && estMot(ts[q], 'then'))) { if (ts[q].t === '(') p++; else if (ts[q].t === ')') p--; if (estMot(ts[q], 'case')) ligne.erreur = 'case imbriqué non pris en charge'; q++ }
      const cond = ts.slice(j + 1, q)
      const val = ts[q + 1]
      for (const x of cond) { if (x.t === 'lit') ligne.litteraux.push(x.v); if (x.t === 'mot') ligne.mots.push(x.v) }
      const b = { cond: null, val: val?.t === 'lit' ? val.v : null, erreur: null }
      if (val?.t !== 'lit') b.erreur = 'valeur de then non littérale'
      else { try { b.cond = compilerConditionControle(cond) } catch (e) { b.erreur = premiere(e) } }
      ligne.branches.push(b)
      j = q + 2
    }
    if (estMot(ts[j], 'else')) { if (ts[j + 1]?.t === 'lit') ligne.sinon = ts[j + 1].v; else ligne.erreur = ligne.erreur || 'valeur de else non littérale'; j += 2 }
    if (!estMot(ts[j], 'end')) ligne.erreur = ligne.erreur || '« end » attendu'
    ligne.peutOui = ligne.branches.some((b) => b.val === 'oui') || ligne.sinon === 'oui'
    k = j
  }
  return res
}
/** La réponse d'une ligne de contrôle dans un contexte simulé ; lève si la ligne n'est pas simulable. */
export function repondre(ligne, ctx) {
  if (ligne.erreur) throw new Error(ligne.erreur)
  for (const b of ligne.branches) { if (b.erreur) throw new Error(b.erreur); if (b.cond(ctx)) return b.val }
  return ligne.sinon
}

// ── PL/pgSQL : analyse d'un corps, avec la position de chaque instruction dans le texte brut ────────────────────────────────
const NIVEAUX_RAISE = new Set(['debug', 'log', 'info', 'notice', 'warning', 'exception'])
/**
 * Le corps d'une fonction plpgsql (texte entre les $$) → { instructions: [...] }. Instructions : { type: 'si', branches:
 * [{ cond: jetons | null, corps: [...] }] } | { type: 'affectation', cible, expr } | { type: 'raise', niveau, jetons } |
 * { type: 'return', jetons } | { type: 'autre', jetons } ; chacune avec debut / fin (positions dans le texte brut).
 */
export function analyserPlpgsql(corps) {
  const ts = jetons(corps)
  let i = 0
  const t = (k = 0) => ts[i + k]
  const jusquA = (arret) => { const d = i; let p = 0; while (i < ts.length && !(p === 0 && arret(t()))) { if (t().t === '(' || t().t === '[') p++; else if (t().t === ')' || t().t === ']') p--; i++ } if (i >= ts.length) throw new Error(`fin du corps atteinte après « ${court(texteJetons(ts.slice(d, d + 6)), 50)} »`); return ts.slice(d, i) }
  const finIf = () => estMot(t(), 'end') && estMot(t(1), 'if')
  const liste = (arret) => { const out = []; while (i < ts.length && !arret()) out.push(instruction()); if (i >= ts.length) throw new Error('fin du corps atteinte dans un bloc'); return out }
  function instruction() {
    const x = t(), debut = x.debut
    if (estMot(x, 'if')) {
      i++
      const branches = []
      let cond = jusquA((y) => estMot(y, 'then')); i++
      for (;;) {
        const corpsB = liste(() => estMot(t(), 'elsif') || estMot(t(), 'elseif') || estMot(t(), 'else') || finIf())
        branches.push({ cond, corps: corpsB })
        if (estMot(t(), 'elsif') || estMot(t(), 'elseif')) { i++; cond = jusquA((y) => estMot(y, 'then')); i++; continue }
        if (estMot(t(), 'else')) { i++; branches.push({ cond: null, corps: liste(finIf) }) }
        break
      }
      if (!finIf()) throw new Error('« end if » attendu')
      i += 2
      if (t()?.t !== ';') throw new Error('« ; » attendu après « end if »')
      const fin = t().fin; i++
      return { type: 'si', branches, debut, fin }
    }
    const jet = jusquA((y) => y.t === ';')
    const fin = t().fin; i++
    if (estMot(jet[0], 'raise')) {
      const niveau = estMot(jet[1]) && NIVEAUX_RAISE.has(jet[1].v) ? jet[1].v : 'exception'
      return { type: 'raise', niveau, jetons: jet, debut, fin }
    }
    if (estMot(jet[0], 'return')) return { type: 'return', jetons: jet, debut, fin }
    if (estMot(jet[0]) && estOp(jet[1], ':=')) return { type: 'affectation', cible: jet[0].v, expr: jet.slice(2), debut, fin }
    return { type: 'autre', jetons: jet, debut, fin }
  }
  if (estMot(t(), 'declare')) throw new Error('bloc declare non pris en charge par le juge')
  if (!estMot(t(), 'begin')) throw new Error('« begin » attendu en tête du corps')
  i++
  const instr = liste(() => estMot(t(), 'end') && !estMot(t(1), 'if'))
  i++
  if (t()?.t === ';') i++
  if (i < ts.length) throw new Error(`texte après le « end » final : « ${court(texteJetons(ts.slice(i, i + 4)), 40)} »`)
  return { instructions: instr }
}
/** La signature d'une instruction (comparaison de structure, espaces et casse ramenés). */
export function signature(st) {
  switch (st.type) {
    case 'affectation': return `A:${st.cible}:=${texteJetons(st.expr)}`
    case 'raise': return `R:${texteJetons(st.jetons)}`
    case 'return': return `T:${texteJetons(st.jetons)}`
    case 'autre': return `X:${texteJetons(st.jetons)}`
    case 'si': return `S(${st.branches.map((b) => `${b.cond ? texteJetons(b.cond) : 'else'}{${b.corps.map(signature).join(';')}}`).join('|')})`
    default: return '?'
  }
}
export const signatureListe = (l) => l.map(signature).join(';')
/** Le bloc « if current_user not in ('service_role', 'postgres') then » au premier niveau, ou null. */
export function blocServeur(arbre) {
  const x = arbre.instructions.filter((s) => s.type === 'si' && s.branches[0].cond && /^current_user not in \( 'service_role' , 'postgres' \)$/i.test(texteJetons(s.branches[0].cond)))
  return x.length === 1 ? x[0] : null
}
/** Un refus : un if sans else dont chaque branche ne fait que lever une exception. */
export const estRefus = (st) => st.type === 'si' && st.branches.length === 1 && st.branches[0].cond && st.branches[0].corps.length > 0
  && st.branches[0].corps.every((x) => x.type === 'raise' && x.niveau === 'exception')

// ── Mutations « de branche » d'une affectation ─────────────────────────────────────────────────────────────────────────────
export const MODES_BRANCHE = ['retire', 'commente', 'ligne-commentee', 'bloc', 'apres', 'si-faux', 'garde']
/** Les modes qui ne changent pas la structure des autres lignes : la ligne d'une autre colonne doit continuer à dire « oui ». */
export const MODES_NEUTRES = ['retire', 'commente', 'ligne-commentee', 'garde', 'apres']
export const DESCRIPTION_MODE = {
  retire: 'retirée', commente: 'remplacée par « -- colonne »', 'ligne-commentee': 'commentée (« -- new.… »)', bloc: 'enfermée dans /* … */',
  apres: 'déplacée après le « end if; » du bloc current_user', 'si-faux': 'enfermée sous « if false then … end if; »', garde: 'neutralisée (« new.col := new.col; »)',
}
/**
 * Le corps muté : l'affectation « new.<col> := … ; » de la branche du navigateur (profondeur 1) subit `mode`. Lève si
 * l'affectation n'est pas trouvée une seule fois, seule sur sa ligne, ou si le bloc current_user est introuvable.
 */
export function muterAffectation(corps, col, mode) {
  const arbre = analyserPlpgsql(corps)
  const bloc = blocServeur(arbre)
  if (!bloc) throw new Error('bloc « if current_user not in (\'service_role\', \'postgres\') then » introuvable au premier niveau')
  const cibles = bloc.branches[0].corps.filter((s) => s.type === 'affectation' && s.cible === `new.${col}`)
  if (cibles.length !== 1) throw new Error(`new.${col} affectée ${cibles.length} fois à la profondeur 1 de la branche`)
  const st = cibles[0]
  const debutLigne = corps.lastIndexOf('\n', st.debut - 1) + 1
  const finLigne = (() => { const k = corps.indexOf('\n', st.fin); return k < 0 ? corps.length : k })()
  const avant = corps.slice(debutLigne, st.debut), apres = corps.slice(st.fin, finLigne)
  if (avant.trim() || apres.replace(/--.*$/, '').trim()) throw new Error(`new.${col} ne tient pas seule sur sa ligne`)
  const retrait = avant.replace(/\r$/, '')
  const texte = corps.slice(st.debut, st.fin)
  const fin = corps[finLigne] === '\n' ? finLigne + 1 : finLigne
  const sans = corps.slice(0, debutLigne) + corps.slice(fin)
  const nl = (x) => `${x}\n`
  switch (mode) {
    case 'retire': return sans
    case 'commente': return corps.slice(0, debutLigne) + nl(`${retrait}-- ${col}`) + corps.slice(fin)
    case 'ligne-commentee': return corps.slice(0, debutLigne) + nl(`${retrait}-- ${texte}`) + corps.slice(fin)
    case 'bloc': return corps.slice(0, debutLigne) + nl(`${retrait}/*`) + nl(`${retrait}${texte}`) + nl(`${retrait}*/`) + corps.slice(fin)
    case 'si-faux': return corps.slice(0, debutLigne) + nl(`${retrait}if false then`) + nl(`${retrait}  ${texte}`) + nl(`${retrait}end if;`) + corps.slice(fin)
    case 'garde': return corps.slice(0, debutLigne) + nl(`${retrait}new.${col} := new.${col};`) + corps.slice(fin)
    case 'apres': {
      const decalage = fin - debutLigne
      const finBloc = bloc.fin - decalage
      const k = sans.indexOf('\n', finBloc)
      const pos = k < 0 ? sans.length : k + 1
      const retraitBloc = (() => { const d = sans.lastIndexOf('\n', finBloc - 1) + 1; return /^[ \t]*/.exec(sans.slice(d))[0] })()
      return sans.slice(0, pos) + nl(`${retraitBloc}${texte}`) + sans.slice(pos)
    }
    default: throw new Error(`mode ${mode} inconnu`)
  }
}
/** Le corps sans l'instruction `st` (ses lignes entières). */
export function sansInstruction(corps, st) {
  const debutLigne = corps.lastIndexOf('\n', st.debut - 1) + 1
  const k = corps.indexOf('\n', st.fin)
  return corps.slice(0, debutLigne) + (k < 0 ? '' : corps.slice(k + 1))
}

// ── L'interprète : expressions ──────────────────────────────────────────────────────────────────────────────────────────────
export class Refus extends Error { constructor(message, code) { super(message); this.refus = true; this.code = code } }
export class NonSimule extends Error { constructor(message) { super(message); this.nonSimule = true } }
/** Analyse une expression SQL (jetons) → arbre. */
export function analyserExpression(ts) {
  let i = 0
  const t = (k = 0) => ts[i + k]
  const attendre = (type, v) => { const x = t(); if (!x || x.t !== type || (v !== undefined && x.v !== v)) throw new NonSimule(`« ${v ?? type} » attendu près de « ${court(texteJetons(ts.slice(i, i + 5)), 50)} »`); i++; return x }
  const liste = (fin) => { const out = []; if (t()?.t === fin) return out; for (;;) { out.push(ou()); if (t()?.t === ',') { i++; continue } break } return out }
  function select() {
    attendre('mot', 'select')
    const cols = liste(null)
    let from = null, where = null
    if (estMot(t(), 'from')) {
      i++
      const table = attendre('mot').v
      let alias = null
      if (estMot(t(), 'as')) i++
      if (estMot(t()) && !['where', 'limit'].includes(t().v)) alias = attendre('mot').v
      from = { table, alias }
    }
    if (estMot(t(), 'where')) { i++; where = ou() }
    if (estMot(t(), 'limit')) { i++; attendre('nb') }
    return { cols, from, where }
  }
  function primaire() {
    const x = t()
    if (!x) throw new NonSimule('expression incomplète')
    if (x.t === 'lit') { i++; return { k: 'val', v: x.v } }
    if (x.t === 'nb') { i++; return { k: 'val', v: x.v } }
    if (x.t === '(') {
      i++
      if (estMot(t(), 'select')) { const s = select(); attendre(')'); return { k: 'sousRequete', s } }
      const e = ou(); attendre(')'); return e
    }
    if (estMot(x, 'null')) { i++; return { k: 'val', v: null } }
    if (estMot(x, 'true') || estMot(x, 'false')) { i++; return { k: 'val', v: x.v === 'true' } }
    if (estMot(x, 'current_user') || estMot(x, 'session_user')) { i++; return { k: 'role' } }
    if (estMot(x, 'array') && t(1)?.t === '[') { i += 2; const elems = liste(']'); attendre(']'); return { k: 'tableau', elems } }
    if (estMot(x, 'exists') && t(1)?.t === '(') { i += 2; const s = select(); attendre(')'); return { k: 'exists', s } }
    if (estMot(x) && t(1)?.t === '(') { i += 2; const args = liste(')'); attendre(')'); return { k: 'appel', nom: x.v.replace(/^public\./, ''), args } }
    if (estMot(x)) { i++; return { k: 'ref', nom: x.v } }
    throw new NonSimule(`jeton inattendu « ${court(texteJetons(ts.slice(i, i + 4)), 40)} »`)
  }
  function unaire() {
    let e = primaire()
    while (estOp(t(), '::')) { i++; let ty = attendre('mot').v; if (t()?.t === '[' && t(1)?.t === ']') { i += 2; ty += '[]' } e = { k: 'cast', e, ty } }
    return e
  }
  const OPS_AUTRES = new Set(['||', '@>', '<@', '&&'])
  function autre() { let a = unaire(); while (estOp(t()) && OPS_AUTRES.has(t().v)) { const op = t().v; i++; a = { k: 'bin', op, a, b: unaire() } } return a }
  function cmp() {
    const a = autre()
    const x = t()
    if (estOp(x) && ['=', '<>', '!=', '<', '>', '<=', '>='].includes(x.v)) {
      i++
      if ((estMot(t(), 'any') || estMot(t(), 'some') || estMot(t(), 'all')) && t(1)?.t === '(') {
        const q = t().v; i += 2; const b = ou(); attendre(')')
        return { k: 'quantifie', op: x.v, q: q === 'some' ? 'any' : q, a, b }
      }
      return { k: 'bin', op: x.v, a, b: autre() }
    }
    const neg = estMot(x, 'not') && (estMot(t(1), 'in') || estMot(t(1), 'like') || estMot(t(1), 'ilike'))
    if (neg) i++
    if (estMot(t(), 'in')) { i++; attendre('('); const l = liste(')'); attendre(')'); return { k: 'dans', a, l, neg } }
    if (estMot(t(), 'like') || estMot(t(), 'ilike')) { const sorte = t().v; i++; return { k: 'like', a, b: autre(), sorte, neg } }
    if (neg) throw new NonSimule('« not » inattendu')
    if (estOp(x) && ['~', '~*', '!~', '!~*'].includes(x.v)) { i++; return { k: 'regex', op: x.v, a, b: autre() } }
    return a
  }
  function est() {
    let a = cmp()
    while (estMot(t(), 'is')) {
      i++
      let neg = false
      if (estMot(t(), 'not')) { neg = true; i++ }
      if (estMot(t(), 'distinct')) { i++; attendre('mot', 'from'); a = { k: 'distinct', a, b: cmp(), neg }; continue }
      const v = attendre('mot').v
      if (!['null', 'true', 'false'].includes(v)) throw new NonSimule(`is ${v} non simulé`)
      a = { k: 'est', a, v, neg }
    }
    return a
  }
  function non() { if (estMot(t(), 'not')) { i++; return { k: 'non', e: non() } } return est() }
  function et() { let a = non(); while (estMot(t(), 'and')) { i++; a = { k: 'et', a, b: non() } } return a }
  function ou() { let a = et(); while (estMot(t(), 'or')) { i++; a = { k: 'ou', a, b: et() } } return a }
  const e = ou()
  if (i !== ts.length) throw new NonSimule(`jeton inattendu « ${court(texteJetons(ts.slice(i, i + 4)), 40)} »`)
  return e
}
const FONCTIONS_INTEGREES = new Set(['lower', 'upper', 'btrim', 'trim', 'coalesce', 'length', 'char_length', 'auth.email', 'auth.uid'])
/** Les tables, fonctions (hors fonctions intégrées) et listes de littéraux d'un arbre d'expression (pour classer un refus). */
export function aspects(e, acc = { tables: new Set(), appels: new Set(), tableauxLitteraux: 0 }) {
  if (!e || typeof e !== 'object') return acc
  if (e.k === 'exists' || e.k === 'sousRequete') { if (e.s.from) acc.tables.add(e.s.from.table.replace(/^public\./, '')) }
  if (e.k === 'appel' && !FONCTIONS_INTEGREES.has(e.nom)) acc.appels.add(e.nom)
  if ((e.k === 'tableau' && e.elems.length >= 3 && e.elems.every((x) => x.k === 'val')) || (e.k === 'dans' && e.l.length >= 3)) acc.tableauxLitteraux++
  for (const v of Object.values(e)) { if (Array.isArray(v)) v.forEach((x) => aspects(x, acc)); else if (v && typeof v === 'object') aspects(v, acc) }
  if (e.s) { e.s.cols.forEach((x) => aspects(x, acc)); aspects(e.s.where, acc) }
  return acc
}
const PRIVILEGIES = new Set(['postgres', 'service_role'])
/** Les lignes de public.artisans visibles de `role` : la RLS (artisan_select_own : auth.uid() = id) pour tout autre que le
 *  propriétaire (postgres, qui contourne la RLS) et service_role. */
const visibles = (env) => (PRIVILEGIES.has(env.role) ? env.lignes : env.lignes.filter((r) => r.id === env.uid))
const enTableau = (v) => {
  if (v === null || v === undefined) return null
  if (Array.isArray(v)) return v
  if (typeof v === 'string' && /^\{.*\}$/s.test(v)) { const c = v.slice(1, -1).trim(); return c ? c.split(',').map((x) => x.trim().replace(/^"|"$/g, '')) : [] }
  throw new NonSimule(`tableau attendu, ${JSON.stringify(v)} trouvé`)
}
const et3 = (a, b) => (a === false || b === false ? false : a === null || b === null ? null : true)
const ou3 = (a, b) => (a === true || b === true ? true : a === null || b === null ? null : false)
/** Évalue un arbre d'expression. env = { role, uid, nouvelle, ligne, alias, params, lignes, fonctions, droits }. */
export function evaluer(e, env) {
  switch (e.k) {
    case 'val': return e.v
    case 'role': return env.role
    case 'ref': {
      const n = e.nom
      if (n.startsWith('new.')) { const c = n.slice(4); if (!env.nouvelle) throw new NonSimule(`${n} hors d'un déclencheur`); if (!(c in env.nouvelle)) throw new NonSimule(`colonne ${c} absente de la ligne simulée`); return env.nouvelle[c] }
      if (n.startsWith('old.')) throw new NonSimule(`${n} : pas de ligne old à l'insertion`)
      if (env.params && n in env.params) return env.params[n]
      if (env.ligne) {
        let c = n
        if (env.alias && c.startsWith(`${env.alias}.`)) c = c.slice(env.alias.length + 1)
        else if (c.startsWith('public.artisans.')) c = c.slice(16)
        else if (c.startsWith('artisans.')) c = c.slice(9)
        if (!c.includes('.') && c in env.ligne) return env.ligne[c]
      }
      throw new NonSimule(`référence ${n} non résolue`)
    }
    case 'cast': {
      const v = evaluer(e.e, env)
      if (v === null) return null
      if (e.ty.endsWith('[]')) return enTableau(v)
      if (['text', 'varchar', 'uuid', 'regclass', 'name', 'citext'].includes(e.ty)) return String(v)
      if (['int', 'integer', 'int4', 'int2', 'smallint', 'bigint'].includes(e.ty)) return Number(v)
      if (e.ty === 'boolean' || e.ty === 'bool') return v === true || v === 'true' || v === 't'
      throw new NonSimule(`conversion ::${e.ty} non simulée`)
    }
    case 'tableau': return e.elems.map((x) => evaluer(x, env))
    case 'appel': {
      const args = e.args.map((x) => evaluer(x, env))
      const s = (v) => (v === null ? null : String(v))
      switch (e.nom) {
        case 'lower': return args[0] === null ? null : s(args[0]).toLowerCase()
        case 'upper': return args[0] === null ? null : s(args[0]).toUpperCase()
        case 'btrim': case 'trim': return args[0] === null ? null : s(args[0]).trim()
        case 'coalesce': return args.find((x) => x !== null) ?? null
        case 'length': case 'char_length': return args[0] === null ? null : s(args[0]).length
        // 25/09 (0095) : les fonctions d'auth de Supabase lisent le jeton de la requête (request.jwt.claims, relu en production :
        // auth.email() = claims ->> 'email', nulle sans jeton). env.jwt = { email } | undefined ; auth.uid() = env.uid.
        case 'auth.email': if (args.length) throw new NonSimule('auth.email() sans argument'); return env.jwt ? (env.jwt.email ?? null) : null
        case 'auth.uid': if (args.length) throw new NonSimule('auth.uid() sans argument'); return env.uid ?? null
        default: break
      }
      const f = env.fonctions && env.fonctions.get(e.nom)
      if (!f) throw new NonSimule(`fonction ${e.nom}() non simulée`)
      if (!PRIVILEGIES.has(env.role) && !f.executables.has(env.role)) throw new Refus(`permission denied for function ${e.nom}`, '42501')
      if (f.params.length !== args.length) throw new NonSimule(`${e.nom} : ${args.length} argument(s) pour ${f.params.length} paramètre(s)`)
      const params = Object.fromEntries(f.params.map((p, k) => [p, args[k]]))
      const envF = { ...env, params, ligne: null, alias: null, nouvelle: null, role: f.definer ? 'postgres' : env.role }
      const r = evaluerSelect(f.select, envF)
      return r
    }
    case 'exists': return lignesDe(e.s, env).length > 0
    case 'sousRequete': return evaluerSelect(e.s, env)
    case 'bin': {
      const a = evaluer(e.a, env), b = evaluer(e.b, env)
      if (a === null || b === null) return null
      switch (e.op) {
        case '=': return a === b
        case '<>': case '!=': return a !== b
        case '<': return a < b
        case '>': return a > b
        case '<=': return a <= b
        case '>=': return a >= b
        case '||': return Array.isArray(a) || Array.isArray(b) ? [...(enTableau(a) ?? []), ...(enTableau(b) ?? [])] : `${a}${b}`
        case '@>': { const x = enTableau(a), y = enTableau(b); return y.every((v) => v !== null && x.includes(v)) }
        case '<@': { const x = enTableau(a), y = enTableau(b); return x.every((v) => v !== null && y.includes(v)) }
        case '&&': { const x = enTableau(a), y = enTableau(b); return x.some((v) => v !== null && y.includes(v)) }
        default: throw new NonSimule(`opérateur ${e.op} non simulé`)
      }
    }
    case 'quantifie': {
      const a = evaluer(e.a, env), b = enTableau(evaluer(e.b, env))
      if (b === null) return null
      if (e.q === 'all') { if (!['<>', '!='].includes(e.op)) throw new NonSimule(`${e.op} all non simulé`); if (a === null) return b.length ? null : true; if (b.includes(a)) return false; return b.includes(null) ? null : true }
      if (!['=', '<>', '!='].includes(e.op)) throw new NonSimule(`${e.op} any non simulé`)
      if (a === null) return b.length ? null : false
      const res = e.op === '=' ? b.includes(a) : b.some((v) => v !== null && v !== a)
      return res ? true : b.includes(null) ? null : false
    }
    case 'dans': {
      const a = evaluer(e.a, env)
      const l = e.l.map((x) => evaluer(x, env))
      if (a === null) return null
      const res = l.includes(a) ? true : l.includes(null) ? null : false
      return e.neg ? (res === null ? null : !res) : res
    }
    case 'like': {
      const a = evaluer(e.a, env), b = evaluer(e.b, env)
      if (a === null || b === null) return null
      const r = likeVersRegex(String(b), e.sorte === 'ilike').test(String(a))
      return e.neg ? !r : r
    }
    case 'regex': {
      const a = evaluer(e.a, env), b = evaluer(e.b, env)
      if (a === null || b === null) return null
      const neg = e.op.startsWith('!')
      const r = areVersRegex(String(b), e.op.endsWith('*')).test(String(a))
      return neg ? !r : r
    }
    case 'est': { const a = evaluer(e.a, env); const r = e.v === 'null' ? a === null : a === (e.v === 'true'); return e.neg ? !r : r }
    case 'distinct': { const a = evaluer(e.a, env), b = evaluer(e.b, env); const pareil = JSON.stringify(a) === JSON.stringify(b); return e.neg ? pareil : !pareil }
    case 'non': { const v = evaluer(e.e, env); return v === null ? null : !v }
    case 'et': return et3(evaluer(e.a, env), evaluer(e.b, env))
    case 'ou': return ou3(evaluer(e.a, env), evaluer(e.b, env))
    default: throw new NonSimule(`expression ${e.k} non simulée`)
  }
}
function lignesDe(s, env) {
  if (!s.from) return [{}]
  const table = s.from.table.replace(/^public\./, '')
  if (table !== 'artisans') throw new NonSimule(`requête sur ${s.from.table} non simulée (seule public.artisans l'est)`)
  const alias = s.from.alias || 'artisans'
  return visibles(env).filter((ligne) => !s.where || evaluer(s.where, { ...env, ligne, alias }) === true)
}
function evaluerSelect(s, env) {
  const lignes = lignesDe(s, env)
  if (!lignes.length) return null
  if (s.cols.length !== 1) throw new NonSimule('select de plusieurs colonnes non simulé')
  return evaluer(s.cols[0], s.from ? { ...env, ligne: lignes[0], alias: s.from.alias || 'artisans' } : env)
}

// ── L'interprète : un corps de déclencheur ─────────────────────────────────────────────────────────────────────────────────
/**
 * Exécute un corps analysé (analyserPlpgsql) pour une insertion. env = { role, uid, nouvelle, lignes, fonctions }.
 * → { refus: null | { message, code }, forcees: Map(colonne → texte de la valeur), chemin: [...] }. Lève NonSimule.
 */
export function executerCorps(arbre, env) {
  const forcees = new Map()
  const conds = new Map()
  const cond = (ts) => { const k = texteJetons(ts); if (!conds.has(k)) conds.set(k, analyserExpression(ts)); return conds.get(k) }
  const liste = (l) => {
    for (const st of l) {
      if (st.type === 'si') {
        let pris = false
        for (const b of st.branches) {
          if (b.cond === null || evaluer(cond(b.cond), env) === true) { pris = true; if (liste(b.corps) === 'fin') return 'fin'; break }
        }
        if (!pris) continue
        continue
      }
      if (st.type === 'affectation') {
        if (!st.cible.startsWith('new.')) throw new NonSimule(`affectation à ${st.cible} non simulée`)
        forcees.set(st.cible.slice(4), texteJetons(st.expr))
        continue
      }
      if (st.type === 'raise') {
        if (st.niveau !== 'exception') continue
        const lit = st.jetons.find((x) => x.t === 'lit')
        if (!lit) throw new Refus('raise sans message', null)
        const k = st.jetons.findIndex((x) => estMot(x, 'errcode'))
        throw new Refus(lit.v, k >= 0 && st.jetons[k + 2]?.t === 'lit' ? st.jetons[k + 2].v : null)
      }
      if (st.type === 'return') return 'fin'
      throw new NonSimule(`instruction non simulée : « ${court(texteJetons(st.jetons), 60)} »`)
    }
    return null
  }
  try { liste(arbre.instructions) } catch (e) { if (e.refus) return { refus: { message: e.message, code: e.code }, forcees }; throw e }
  return { refus: null, forcees }
}
