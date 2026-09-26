// La partie « diff » de TA-5 (et de TL-8) ne peut pas être jugée en entier sur la maquette : la base git de
// lib/siteLivraison.ts (la version d'avant la veille) n'existera qu'après 026-024. On éprouve donc directement l'outil que
// TA-5 appelle, ajoutTryCatch de scripts/fixtures/026-livraison-tresor/commun.mjs, sur la base reconstruite de la maquette.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const R = 'C:/Users/benja/Documents/presti'
const { ajoutTryCatch, cronsAttendus } = await import(pathToFileURL(path.join(R, 'scripts/fixtures/026-livraison-tresor/commun.mjs')).href)
const cur = fs.readFileSync(path.join(R, '.orchestre/travail/026-018-maquette/lib/siteLivraison.ts'), 'utf8').replace(/\r\n/g, '\n')
const IMPORT = "import { veilleTresorerie } from '@/lib/direction/veilleTresorerie'\n"
const APPEL = "  try { await veilleTresorerie() } catch (e) { r.erreurs.push((e as Error).message) }\n"
if (!cur.includes(IMPORT) || !cur.includes(APPEL)) throw new Error('maquette inattendue')
const base = cur.replace(IMPORT, '').replace(APPEL, '')
const opts = { nom: 'veilleTresorerie', exact: true, dansFonction: 'tourLivraison' }
const cas = [
  ['intacte : un import et un try/catch dans tourLivraison', cur, true],
  ['appel hors try/catch', cur.replace(APPEL, '  await veilleTresorerie()\n'), false],
  ['une autre ligne changée', cur.replace('return { subject: \'Presti — votre site est en ligne\'', 'return { subject: \'Presti — site en ligne\''), false],
  ['try/catch placé dans commandesEnRetard', cur.replace(APPEL, '').replace('  if (alertes.length) await envoyerAlertes(alertes)\n', '  if (alertes.length) await envoyerAlertes(alertes)\n  try { await veilleTresorerie() } catch { /* rien */ }\n'), false],
  ['deux try/catch', cur.replace(APPEL, APPEL + '  const x = 1\n' + APPEL), false],
  ['le catch relance', cur.replace(APPEL, '  try { await veilleTresorerie() } catch (e) { throw e }\n'), false],
  ['un import de plus', cur.replace(IMPORT, IMPORT + "import { stripe } from '@/lib/stripe'\n"), false],
  ['aucun appel (témoin : exact exigé)', base, false],
]
const lignes = []
let ok = 0
for (const [nom, texte, vert] of cas) {
  const r = ajoutTryCatch(base, texte, opts)
  const juste = vert ? r.echecs.length === 0 : r.echecs.length > 0
  if (juste) ok++
  lignes.push(`| ${nom} | ${vert ? 'vert' : 'rouge'} | ${r.echecs.length ? 'rouge' : 'vert'} | ${juste ? 'oui' : 'NON'} | ${(r.echecs[0] ?? '—').replace(/\|/g, '\\|').slice(0, 160)} |`)
}
// La part de non-régression (exact: false) accepte l'absence d'ajout, refuse le reste.
const nr = [['NR : aucun ajout', base, true], ['NR : un try/catch', cur, true], ['NR : une ligne changée', cur.replace('return { subject: \'Presti — votre site est en ligne\'', 'return { subject: \'X\''), false]]
for (const [nom, texte, vert] of nr) {
  const r = ajoutTryCatch(base, texte, { ...opts, exact: false })
  const juste = vert ? r.echecs.length === 0 : r.echecs.length > 0
  if (juste) ok++
  lignes.push(`| ${nom} | ${vert ? 'vert' : 'rouge'} | ${r.echecs.length ? 'rouge' : 'vert'} | ${juste ? 'oui' : 'NON'} | ${(r.echecs[0] ?? '—').replace(/\|/g, '\\|').slice(0, 160)} |`)
}
// CRONS_ATTENDUS (TL-8) : lecture des entrées.
const a = fs.readFileSync(path.join(R, 'lib/alertes.ts'), 'utf8')
const c = cronsAttendus(a)
const cOk = c && c.lisibles && c.entrees.length === 4
if (cOk) ok++
lignes.push(`| cronsAttendus sur lib/alertes.ts | 4 entrées lisibles | ${c ? `${c.entrees.length} entrée(s), lisibles : ${c.lisibles}` : 'illisible'} | ${cOk ? 'oui' : 'NON'} | ${c ? c.entrees.map((x) => `${x.nom}:${x.maxHeures}`).join(', ') : '—'} |`)
const total = cas.length + nr.length + 1
const md = [
  '# La partie « diff » de TA-5 et TL-8 sait échouer',
  '',
  `Produit par un script de Claude Code le ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}. La base git de \`lib/siteLivraison.ts\` d'avant la veille n'existera qu'après 026-024 : on éprouve directement \`ajoutTryCatch\` (\`scripts/fixtures/026-livraison-tresor/commun.mjs\`, l'outil que TA-5 et TL-8 appellent), avec pour base la maquette sans son import ni son appel de \`veilleTresorerie\`, et \`dansFonction: 'tourLivraison'\`.`,
  '',
  '| Cas | Attendu | Obtenu | Juste | Premier défaut relevé |',
  '|---|---|---|---|---|',
  ...lignes,
  '',
  `Bilan : ${ok}/${total} justes.`,
  '',
]
fs.writeFileSync(path.join(R, '.orchestre/preuves/026-018/sait-echouer-diffs.md'), md.join('\n'))
console.log(md.join('\n'))
process.exit(ok === total ? 0 : 1)
