// scripts/usine-repartition.mjs — qui rédige quelle fiche (décision de Benj du 28/09/2026, « juges croisés ») : aucune IA ne
// juge son propre travail. Module SANS effet au chargement : lu par presti-ops/usine/moteur.mjs (la répartition de chaque tour)
// et par `scripts/usine.mjs lancer --croise` (l'admission d'une rédaction croisée), import dynamique dans les deux cas —
// usine.mjs est copié seul sur l'usine (le tourneur) et ne doit rien importer au chargement.
//
// La règle, lue dans l'INDEX d'une série (.orchestre/brouillons-ecosysteme/<série>/INDEX.md, colonnes
// | Id | Objet | Exécutant | Juge | Dépend de | …) :
//   - PRODUCTION « codex… »       → Codex sur l'usine (voie « codex ») ; voie libre (freellmapi / Ollama Cloud) quand Codex est
//                                    plein, jamais pour une fiche de prospects (le refus est dans usine.mjs, motifProspects) ;
//   - PRODUCTION « antigravity »  → Gemini, Antigravity sur le PC (voie « antigravity ») ;
//   - JUGE (claude-code, colonne Juge « (elle-même… » ou --preuve-echecs) : les fiches qu'il juge sont les lignes dont la colonne
//     Juge cite « (<son id>) ». Toutes produites par codex → rédaction croisée par Gemini ; toutes par antigravity → rédaction
//     croisée par Codex sur l'usine ; sinon (mêlées, claude-code, aucune) → personne : Claude la fera ;
//   - MIGRATION (claude-code, objet commençant par « Migration ») → rédaction croisée par Codex sur l'usine, qui n'applique rien ;
//   - toute autre fiche claude-code (mise en service, recette, épreuve…) → jamais lancée par le moteur.
// Une rédaction croisée n'est JAMAIS commitée par le moteur : elle attend Claude dans .orchestre/a-relire/<id>.md.
//
// Usage : node scripts/usine-repartition.mjs [--index=<INDEX.md>]   → la répartition de toutes les lignes (lecture seule)
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// La phrase ajoutée à la consigne de toute rédaction croisée (usine.mjs --croise, et le message du moteur à Gemini).
export const CONSIGNE_CROISEE = 'Rédaction croisée (décision de Benj du 28/09) : tu rédiges ; Claude Code relira, attaquera par sabotages et commitera ; pour une migration, rien n\'est appliqué'

const ID = /\d{3}-\d{2,3}/g
export const cheminIndex = (racine, id) => path.join(racine, '.orchestre', 'brouillons-ecosysteme', String(id).slice(0, 3), 'INDEX.md')

// Les lignes de fiche de l'INDEX (celles qui commencent par « | NNN-NNN | » : la table de correspondance, « | 026-010 (0094) | »,
// n'en est pas). jugesCites : les ids cités entre parenthèses dans la colonne Juge (« (026-018) », « (026-052, 026-062) »).
export function lireIndex(texte) {
  return String(texte).split(/\r?\n/).filter((l) => /^\| \d{3}-\d{2,3} \|/.test(l)).map((l) => l.split('|').map((s) => s.trim())).filter((r) => r[3])
    .map((r) => {
      const juge = r[4] || ''
      return {
        id: r[1], titre: r[2], executant: r[3], juge, deps: (r[5] || '').match(ID) || [],
        jugesCites: [...juge.matchAll(/\(([^()]*)\)/g)].flatMap((m) => m[1].match(ID) || []),
        elleMeme: /\(elle-même/i.test(juge),
      }
    })
}

export const producteur = (executant) => (/^codex/.test(executant) ? 'codex' : /^antigravity/.test(executant) ? 'antigravity' : /^claude-code/.test(executant) ? 'claude-code' : null)
export const estMigration = (l) => producteur(l.executant) === 'claude-code' && /^Migration/.test(l.titre)
export const estJuge = (l) => producteur(l.executant) === 'claude-code' && (l.elleMeme || /--preuve-echecs/.test(l.juge))
export const jugees = (juge, lignes) => lignes.filter((x) => x.id !== juge.id && x.jugesCites.includes(juge.id))

// { voie: 'codex' | 'antigravity' | null, type: 'production' | 'juge' | 'migration' | 'autre', croise, raison }
export function classer(l, lignes) {
  const p = producteur(l.executant)
  if (p === 'codex') return { voie: 'codex', type: 'production', croise: false, raison: 'production de Codex' }
  if (p === 'antigravity') return { voie: 'antigravity', type: 'production', croise: false, raison: 'production de Gemini (Antigravity sur le PC)' }
  if (p !== 'claude-code') return { voie: null, type: 'autre', croise: false, raison: `exécutant inconnu « ${l.executant} »` }
  if (estMigration(l)) return { voie: 'codex', type: 'migration', croise: true, raison: 'migration : rédigée par Codex sur l\'usine, jamais appliquée' }
  if (estJuge(l)) {
    const j = jugees(l, lignes)
    const par = [...new Set(j.map((x) => producteur(x.executant) || '?'))]
    const qui = j.map((x) => `${x.id} ${producteur(x.executant) || '?'}`).join(', ')
    if (!j.length) return { voie: null, type: 'juge', croise: false, raison: 'juge qui ne juge aucune fiche de l\'INDEX : Claude la fera' }
    if (par.length === 1 && par[0] === 'codex') return { voie: 'antigravity', type: 'juge', croise: true, raison: `juge de fiches de Codex (${qui}) : rédigé par Gemini` }
    if (par.length === 1 && par[0] === 'antigravity') return { voie: 'codex', type: 'juge', croise: true, raison: `juge de fiches de Gemini (${qui}) : rédigé par Codex sur l'usine` }
    return { voie: null, type: 'juge', croise: false, raison: `juge de fiches mêlées (${qui}) : Claude la fera` }
  }
  return { voie: null, type: 'autre', croise: false, raison: 'fiche claude-code d\'un autre type (mise en service, recette, épreuve…) : jamais lancée par le moteur' }
}

// L'admission de `usine.mjs lancer <id> --croise` : une fiche claude-code, rédigée par Codex sur l'usine, dans deux cas seulement
// (migration, ou juge de fiches toutes produites par antigravity).
export function admettreCroise(id, texteIndex) {
  const lignes = lireIndex(texteIndex)
  const l = lignes.find((x) => x.id === id)
  if (!l) return { ok: false, raison: `${id} absente de l'INDEX de sa série : type inconnu` }
  if (producteur(l.executant) !== 'claude-code') return { ok: false, raison: `${id} n'est pas une fiche claude-code (exécutant ${l.executant}) : --croise n'a pas lieu d'être` }
  const c = classer(l, lignes)
  if (c.croise && c.voie === 'codex') return { ok: true, type: c.type, raison: c.raison }
  if (c.croise) return { ok: false, raison: `${c.raison} — pas par Codex sur l'usine` }
  return { ok: false, raison: c.raison }
}

// Le périmètre d'une fiche (ligne `perimetre: [...]` de l'en-tête), en préfixes (ce qui précède le premier caractère de glob).
export function prefixesPerimetre(texteFiche) {
  const m = String(texteFiche).match(/^perimetre:\s*\[(.*)\]/m)
  return (m ? m[1].split(',') : []).map((x) => x.trim().replace(/^["']|["']$/g, '').split(/[*?{]/)[0]).filter(Boolean)
}
export const chevauchent = (a, b) => a.some((p) => b.some((q) => p.startsWith(q) || q.startsWith(p)))
// Le périmètre d'une fiche peut-il écrire ce fichier ? Chemin exact, dossier parent, ou glob (** = tout, * = sans « / »).
function globVersRegex(motif) {
  let re = ''
  for (let i = 0; i < motif.length; i++) {
    const c = motif[i]
    if (c === '*') { if (motif[i + 1] === '*') { if (motif[i + 2] === '/') { re += '(?:.*/)?'; i += 2 } else { re += '.*'; i += 1 } } else re += '[^/]*' }
    else if (c === '?') re += '[^/]'
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}
export function perimetreTouche(texteFiche, fichier) {
  const m = String(texteFiche).match(/^perimetre:\s*\[(.*)\]/m)
  const entrees = (m ? m[1].split(',') : []).map((x) => x.trim().replace(/^["']|["']$/g, '').replace(/\\/g, '/').replace(/^\.\//, '')).filter(Boolean)
  return entrees.some((p) => p === fichier || (/[*?]/.test(p) ? globVersRegex(p).test(fichier) : fichier.startsWith(p.replace(/\/?$/, '/'))))
}

// La prise d'une fiche claude-code pour une rédaction croisée. L'orchestre (scripts/orchestre.mjs, qu'on ne modifie pas) réserve
// ces fiches à l'agent « claude-code » : la prise se fait sous ce nom, puis le verrou nomme le vrai rédacteur (ag-<id>,
// usine-codex-N), pour que verdicts.jsonl et le digest disent qui a écrit.
export function prendreCroisee(racine, id, redacteur) {
  const r = spawnSync(process.execPath, [path.join(racine, 'scripts', 'orchestre.mjs'), 'prochaine', '--agent=claude-code', `--tache=${id}`], { cwd: racine, encoding: 'utf8', windowsHide: true, timeout: 120_000 })
  const sortie = `${r.stdout || ''}${r.stderr || ''}`
  const lock = path.join(racine, '.orchestre', 'en-cours', `${id}.lock`)
  if (r.status !== 0 || !fs.existsSync(path.join(racine, '.orchestre', 'en-cours', `${id}.md`))) return { ok: false, sortie }
  let texte = ''
  try { texte = fs.readFileSync(lock, 'utf8').replace(/^agent:.*$/m, `agent: ${redacteur}`); fs.writeFileSync(lock, texte) } catch { /* verrou absent : la prise reste valable */ }
  return { ok: true, sortie, lock: texte }
}

const estPrincipal = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estPrincipal) {
  const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const a = process.argv.find((x) => x.startsWith('--index='))
  const fichier = a ? path.resolve(a.slice(8)) : cheminIndex(racine, '026')
  const lignes = lireIndex(fs.readFileSync(fichier, 'utf8'))
  const compte = {}
  for (const l of lignes) {
    const c = classer(l, lignes)
    const cle = c.voie ? `${c.voie}${c.croise ? ' (croisée)' : ''}` : 'Claude / jamais'
    compte[cle] = (compte[cle] || 0) + 1
    console.log(`${l.id}  ${(c.voie || '—').padEnd(11)} ${c.type.padEnd(10)} ${c.croise ? 'croisée ' : '        '} ${c.raison}`)
  }
  console.log(`\n${Object.entries(compte).map(([k, n]) => `${k} : ${n}`).join(' · ')}`)
  process.exitCode = 0
}
