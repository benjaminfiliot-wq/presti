// scripts/fixtures/026-transverse/usine-source.mjs — lecture statique d'un source JS pour le juge du pont (fiche 026-194, Claude Code).

/** Le source SANS ses commentaires (// et /* *​/), en gardant les chaînes, les gabarits et les expressions régulières intacts. */
export function sansCommentaires(src) {
  const t = String(src)
  let out = '', i = 0
  const n = t.length
  const pile = []                      // gabarits imbriqués : nombre d'accolades ouvertes dans chaque ${…}
  let dernier = ''                     // dernier caractère significatif du code (pour distinguer division et expression régulière)
  let mot = ''
  const regexPossible = () => dernier === '' || '(,=:[!&|?{};+-*%<>~^'.includes(dernier) || ['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new'].includes(mot)
  const gabarit = () => { // i est juste après la ` ou après la } qui referme un ${…}
    while (i < n) {
      const c = t[i]
      if (c === '\\') { out += t.slice(i, i + 2); i += 2; continue }
      if (c === '`') { out += c; i++; return }
      if (c === '$' && t[i + 1] === '{') { out += '${'; i += 2; pile.push(0); return }
      out += c; i++
    }
  }
  while (i < n) {
    const c = t[i], d = t[i + 1]
    if (c === '/' && d === '/') { while (i < n && t[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') { const k = t.indexOf('*/', i + 2); const bloc = k < 0 ? t.slice(i) : t.slice(i, k + 2); out += bloc.replace(/[^\n]/g, ' '); i += bloc.length; continue }
    if (c === '"' || c === "'") { let j = i + 1; while (j < n && t[j] !== c && t[j] !== '\n') j += t[j] === '\\' ? 2 : 1; out += t.slice(i, j + 1); i = j + 1; dernier = c; mot = ''; continue }
    if (c === '`') { out += c; i++; gabarit(); dernier = '`'; mot = ''; continue }
    if (c === '/' && regexPossible()) {
      let j = i + 1, classe = false
      while (j < n && t[j] !== '\n') { if (t[j] === '\\') { j += 2; continue } if (t[j] === '[') classe = true; else if (t[j] === ']') classe = false; else if (t[j] === '/' && !classe) break; j++ }
      j++
      while (j < n && /[a-z]/.test(t[j])) j++
      out += t.slice(i, j); i = j; dernier = '/'; mot = ''; continue
    }
    if (pile.length) {
      if (c === '{') pile[pile.length - 1]++
      else if (c === '}') { if (pile[pile.length - 1] === 0) { pile.pop(); out += c; i++; gabarit(); dernier = '`'; continue } pile[pile.length - 1]-- }
    }
    out += c; i++
    if (/[A-Za-z0-9_$]/.test(c)) mot += c
    else { if (!/\s/.test(c)) { dernier = c; mot = '' } }
    if (/\s/.test(c)) { /* le mot courant reste candidat (return /re/) */ }
  }
  return out
}
