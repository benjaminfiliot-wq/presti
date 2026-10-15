// Le comparatif avec les concurrents (lib/comparatifConcurrents.ts) tient la règle de la publicité comparative (art. L122-1 du
// Code de la consommation) : faits vérifiables et DATÉS, mêmes critères pour tous, sources, aucun dénigrement, pas d'absence affirmée.
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/comparatif-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RACINE = process.cwd()
const C = await import(pathToFileURL(path.join(RACINE, 'lib/comparatifConcurrents.ts')).href)
const echecs = []; let n = 0
const ok = (c, m) => { n++; if (!c) echecs.push(m) }

ok(/^\d{2}\/\d{2}\/\d{4}$/.test(C.COMPARATIF_DATE), 'COMPARATIF_DATE doit être JJ/MM/AAAA')
const [j, m, a] = C.COMPARATIF_DATE.split('/').map(Number)
const age = (Date.now() - new Date(a, m - 1, j).getTime()) / 864e5
ok(age >= 0 && age <= 183, `comparatif vieux de ${Math.round(age)} jours : relire les sites des éditeurs et mettre COMPARATIF_DATE à jour`)
ok(C.COMPARATIF_DATE_ISO === `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`, 'COMPARATIF_DATE_ISO ≠ COMPARATIF_DATE')
ok(C.COMPARATIF_MENTION.includes(C.COMPARATIF_DATE) && /d’après les sites des éditeurs/.test(C.COMPARATIF_MENTION), 'la mention « Comparatif établi le … d’après les sites des éditeurs » est absente')
ok(C.CONCURRENTS.length >= 3, 'au moins 3 concurrents')
ok(C.CONCURRENTS.some((c) => c.id === 'henrri'), 'Henrri doit figurer (demande de Benj)')

const MOTS_DENIGRANT = /\b(nul|nulle|mauvais|mauvaise|arnaque|médiocre|pire|catastroph|inutile|dépassé|obsolète|lent|bâclé|honteux)\b/i
for (const cr of C.CRITERES) ok(typeof C.PRESTI[cr.id] === 'string' && C.PRESTI[cr.id].length > 1, `colonne Presti vide pour « ${cr.id} »`)
for (const c of C.CONCURRENTS) {
  const urls = new Set(c.sources.map((s) => s.url))
  ok(c.sources.length >= 2, `${c.nom} : au moins 2 pages sources`)
  for (const s of c.sources) ok(/^https:\/\/[^ ]+$/.test(s.url), `${c.nom} : source illisible ${s.url}`)
  for (const cr of C.CRITERES) {
    const cell = c.cellules[cr.id]
    ok(!!cell && cell.t.length > 1, `${c.nom} : critère « ${cr.id} » absent (mêmes critères pour tous)`)
    if (!cell) continue
    ok(urls.has(cell.url), `${c.nom} / ${cr.id} : l'URL ${cell.url} n'est pas dans les sources listées`)
    ok(!/^non\.?$/i.test(cell.t.trim()), `${c.nom} / ${cr.id} : « Non » affirme une absence ; écrire « Non indiqué »`)
    ok(!MOTS_DENIGRANT.test(cell.t), `${c.nom} / ${cr.id} : terme dénigrant`)
  }
}
ok(!MOTS_DENIGRANT.test(Object.values(C.PRESTI).join(' ')), 'terme dénigrant dans la colonne Presti')
// Les composants affichent la mention, la précaution, les sources.
const comp = fs.readFileSync(path.join(RACINE, 'app/ComparatifConcurrents.tsx'), 'utf8')
for (const k of ['COMPARATIF_MENTION', 'COMPARATIF_PRECAUTION', 'Sources du comparatif', 'c.sources']) ok(comp.includes(k), `app/ComparatifConcurrents.tsx n'affiche pas ${k}`)
ok(/<ComparatifConcurrents\b/.test(fs.readFileSync(path.join(RACINE, 'app/page.tsx'), 'utf8')), 'la landing ne rend pas le comparatif')
// Presti honnête : la colonne dit ce qu'elle ne fait pas.
ok(/pas de plateforme agréée/.test(C.PRESTI.facture_electronique), 'Presti doit dire qu\'il n\'a pas de plateforme agréée intégrée')
ok(/pas de relance automatique des impayés/.test(C.PRESTI.relances), 'Presti doit dire qu\'il ne relance pas les impayés tout seul')

if (echecs.length) { console.log(`❌ comparatif-qa : ${echecs.length} échec(s) sur ${n}`); for (const e of echecs) console.log('  - ' + e); process.exit(1) }
console.log(`✅ comparatif-qa : ${n}/${n} contrôles — ${C.CONCURRENTS.length} éditeurs, ${C.CRITERES_VISIBLES.length} critères, daté du ${C.COMPARATIF_DATE}`)
