// lib/ai/cerveaux/urgence/evaluer.mjs — rejoue les cas de référence contre la détection d'urgence TELLE QU'ELLE EST
// (prompt v15 §8.1). Le cerveau est déterministe (lib/ai.ts : qualifyLead → isUrgent, mots-clés) : zéro appel modèle,
// zéro coût, quelques millisecondes — il peut tourner à chaque commit.
//
// Ce qu'il fait : lit cas.jsonl (une ligne = une demande client, un métier, la sortie attendue, l'origine, un statut
// « reference » ou « ouvert » pour un défaut connu pas encore corrigé), appelle qualifyLead, compte, et compare le
// score au dernier score ACCEPTÉ (score.json). Un score qui baisse fait échouer (code 1) : ça ne se fusionne pas.
// Un score qui monte ne s'enregistre que si on le demande (--accepter), pour que le journal reste une décision.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs lib/ai/cerveaux/urgence/evaluer.mjs
//         … --accepter      enregistre le score courant dans score.json (après avoir amélioré le cerveau)
//         … --json          rapport machine
// Sortie : une ligne par cas, puis « N réussis, M échoués » (format lu par scripts/tout-verifier.mjs).
// Codes : 0 = pas de régression ; 1 = régression (score < score accepté) ou cas illisible ; 2 = usage.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// lib/ai.ts lit la clé au chargement : une valeur factice suffit, aucun appel n'est fait (même contournement que
// scripts/ia-unit-e2e.mjs:18).
process.env.ANTHROPIC_API_KEY ||= 'test-sans-appel'
const { qualifyLead } = await import('../../../ai.ts')

const ICI = path.dirname(fileURLToPath(import.meta.url))
const args = new Set(process.argv.slice(2))
const json = args.has('--json'), accepter = args.has('--accepter')
const V = '\x1b[32m', R = '\x1b[31m', G = '\x1b[90m', Z = '\x1b[0m'

const lignes = fs.readFileSync(path.join(ICI, 'cas.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean)
const cas = []
for (const [i, l] of lignes.entries()) {
  try { cas.push(JSON.parse(l)) } catch { console.error(`cas.jsonl ligne ${i + 1} illisible`); process.exit(1) }
}
for (const c of cas) {
  if (!c.id || typeof c.message !== 'string' || !['urgent', 'normal'].includes(c.attendu)) { console.error(`cas ${c.id ?? '?'} : id, message et attendu (urgent|normal) obligatoires`); process.exit(1) }
}

const resultats = cas.map((c) => {
  const obtenu = qualifyLead(c.message, c.metier ?? null).urgence
  return { id: c.id, statut: c.statut ?? 'reference', attendu: c.attendu, obtenu, passe: obtenu === c.attendu, message: c.message }
})
const reussis = resultats.filter((r) => r.passe).length
const total = resultats.length
const score = Math.round((reussis / total) * 1000) / 10
const fScore = path.join(ICI, 'score.json')
const precedent = fs.existsSync(fScore) ? JSON.parse(fs.readFileSync(fScore, 'utf8')) : null
const regression = precedent ? score < precedent.score : false

if (!json) {
  console.log(`Cerveau « urgence » — ${total} cas (${cas.filter((c) => (c.statut ?? 'reference') === 'ouvert').length} ouvert(s))`)
  for (const r of resultats) console.log(`  ${r.passe ? V + ' OK  ' : R + 'ÉCHEC'}${Z} ${r.id.padEnd(16)} ${G}attendu ${r.attendu.padEnd(6)} obtenu ${r.obtenu.padEnd(6)}${r.statut === 'ouvert' ? ' [ouvert]' : ''} · ${r.message.slice(0, 70)}${Z}`)
  console.log(`\n  score : ${score} %${precedent ? ` · dernier accepté : ${precedent.score} % (${precedent.date})` : ' · aucun score accepté encore'}`)
  if (regression) console.log(`${R}  ✗ RÉGRESSION : le score a baissé — ça ne se fusionne pas.${Z}`)
  console.log(`${reussis} réussis, ${total - reussis} échoués`)
}
if (accepter && !regression) {
  fs.writeFileSync(fScore, JSON.stringify({ score, reussis, total, date: new Date().toISOString().slice(0, 10) }, null, 2) + '\n')
  if (!json) console.log(`  ✓ score accepté et enregistré dans score.json`)
}
if (json) console.log(JSON.stringify({ cerveau: 'urgence', score, reussis, total, precedent, regression, resultats }, null, 2))
process.exit(regression ? 1 : 0)
