// .orchestre/preuves/026-029/outils/sait-echouer.mjs — les quatre juges du lot C savent être VERTS sur une implémentation témoin
// réelle, et ROUGES sur un sabotage par critère (fiche 026-029, Claude Code, 27/09). La preuve de 026-018
// (juges-026-lt-preuve --lot=C) prouve « rouge sur la référence, vert en --temoin, refus d'une preuve vide » ; cet outil prouve le
// reste : qu'aucun juge ne sort toujours en 0 ni toujours en 1, critère par critère.
//
//   node .orchestre/preuves/026-029/outils/sait-echouer.mjs [--seulement=EX,RV]
//
// 1. Construit la maquette (./maquette.mjs) : un dépôt git à part sous .orchestre/travail/026-029-maquette/, fiches amont en
//    témoin committées, les quatre fiches jugées en témoin dans l'arbre de travail.
// 2. Témoins : chaque juge, lancé DEPUIS la maquette (son dépôt, son HEAD, ses verdicts), en mode complet → code 0, aucun
//    critère rouge ; en --temoin → code 0.
// 3. Sabotages : pour chaque critère, une faute posée dans un fichier témoin de la maquette (remplacement exact, trouvé une et
//    une seule fois), le juge relancé sur ce critère (--seulement=<id>, ou --temoin pour la part NR), la ligne rouge relevée
//    telle quelle, puis l'original remis et vérifié octet pour octet.
// Écrit .orchestre/preuves/026-029/sait-echouer-juges.md et .json. Code 0 si tout est tenu, 1 sinon.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { construireMaquette, MAQUETTE, R } from './maquette.mjs'

const SEUL = (process.argv.find((a) => a.startsWith('--seulement=')) ?? '').slice(12).split(',').filter(Boolean)
const JUGES = { EX: 'commande-exporter-qa', RV: 'redacteur-v2-qa', CH: 'livrer-site-qa', GA: 'generation-actions-qa' }
const P = Object.keys(JUGES).filter((p) => !SEUL.length || SEUL.includes(p))
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const ligne = (t) => String(t ?? '').replace(/\s+/g, ' ').trim()

const EXP = 'scripts/commande-exporter.mjs', RED = 'scripts/commande-rediger.mjs', LIB = 'lib/siteRedacteur.ts', LIV = 'scripts/livrer-site.mjs'
const FLUX = '.github/workflows/generer-site.yml', DIST = 'lib/siteGenerationDistante.ts', TOUR = 'lib/siteLivraison.ts'
// [préfixe, critère, mode, fichier, [[de, vers], …] | { ajout }, ce que la faute casse]
const SABOTAGES = [
  ['EX', 'EX-1', 'complet', EXP, [["const sharp = exiger('sharp')", "process.exit(1)\nconst sharp = exiger('sharp')"]], 'l\'exporteur sort en 1 d\'entrée'],
  ['EX', 'EX-2', 'complet', EXP, [['const telephone = artisan?.tel_public || artisan?.tel || null', 'const telephone = artisan?.tel || artisan?.tel_public || null']], 'le téléphone privé au lieu du public'],
  ['EX', 'EX-3', 'complet', EXP, [['.rotate().resize({ width: l, withoutEnlargement: true })', '.rotate().resize({ width: l, withoutEnlargement: true }).withMetadata()']], 'les métadonnées (GPS) gardées'],
  ['EX', 'EX-4', 'complet', EXP, [["licence: 'propriétaire'", "licence: 'Tous droits réservés'"]], 'une licence non permise'],
  ['EX', 'EX-5', 'complet', EXP, [["if (dans(path.join(RACINE, 'public'), SORTIE)) usage('la sortie est sous public/ : refusé')\nif (dans(RACINE, SORTIE) && !dans(path.join(RACINE, '.orchestre', 'travail'), SORTIE)) usage('dans le dépôt, la sortie va sous .orchestre/travail/ seulement')\n", '']], 'les deux refus de destination retirés'],
  ['EX', 'EX-6', 'complet', EXP, [['if (erreurs.length) {', 'if (false && erreurs.length) {']], 'un dossier incomplet exporté quand même'],
  ['EX', 'EX-7', 'complet', EXP, [['const prefixe = projet ? `${projet}/storage/v1/object/public/artisan-media/${commande.artisan_id}/` : null', 'const prefixe = projet ? `${projet}/storage/v1/object/public/artisan-media/` : null'], ["if (!nom || nom.includes('/') || nom.includes('\\\\') || nom.includes('..') || !/^[\\w .-]+$/.test(nom))", 'if (!nom)']], 'le dossier d\'un autre artisan accepté'],
  ['EX', 'EX-8', 'complet', EXP, [['for (const r of refusees) console.log(`  refusée — ${r}`)', 'console.log(`entreprise : ${artisan?.nom}`)\nfor (const r of refusees) console.log(`  refusée — ${r}`)']], 'le nom de l\'entreprise écrit dans la sortie'],
  ['EX', 'EX-9', 'complet', EXP, [["fs.writeFileSync(path.join(SORTIE, 'photos', 'attributions.json')", "fs.writeFileSync(path.join(SORTIE, 'photos', 'attribution.json')"]], 'attributions.json mal nommé : le générateur ne le trouve pas'],
  ['EX', 'EX-4', 'temoin', 'scripts/site-qa.mjs', [['const attributionCredible = (a) => !!a.auteur', 'const attributionCredible = (a) => true || !!a.auteur']], 'site-qa affaibli : toute attribution passe (part NR)'],
  ['RV', 'RV-1', 'complet', RED, [["if (!brut) { console.error('usage : commande-rediger.mjs <dossier-source> [--sans-ia]'); process.exit(2) }", 'if (!brut) process.exit(0)']], 'le script sans argument sort en 0'],
  ['RV', 'RV-2', 'complet', LIB, [['h1: marques(accueilModele.h1, entreprise, ville), h1Ligne', 'h1: String(accueilModele.h1), h1Ligne']], 'la marque {ville} laissée dans le h1'],
  ['RV', 'RV-3', 'complet', LIB, [['chapeau: marques(accueilModele.chapeau, entreprise, ville),\n', "chapeau: marques(accueilModele.chapeau, entreprise, ville) + ' Certifié RGE depuis 15 ans.',\n"]], 'une invention dans le chapeau d\'accueil'],
  ['RV', 'RV-4', 'complet', LIB, [["{ type: 'p', texte: `SIREN : ${m.siren ?? ''}` }", "{ type: 'p', texte: `SIREN : ${m.siren ?? ''}` }, { type: 'p', texte: String((commande.matiere as { artisan?: { parcours?: string } }).artisan?.parcours ?? '') }"]], 'le parcours de l\'artisan recopié'],
  ['RV', 'RV-5', 'complet', LIB, [["if (b.type === 'h3') garder = cles.includes(sansAccents(b.texte))", "if (b.type === 'h3') garder = true"]], 'toutes les prestations du modèle gardées'],
  ['RV', 'RV-6', 'complet', LIB, [['for (let essai = 0; essai < 2 && !retenu; essai++)', 'for (let essai = 0; essai < 1 && !retenu; essai++)']], 'aucun second appel après un rejet'],
  ['RV', 'RV-7', 'complet', LIB, [['const faits = { entreprise, metier, commune, communes, prestations: declarees }', 'const faits = { entreprise, metier, commune, communes, prestations: declarees, contact: (commande as { email?: string }).email }']], 'l\'e-mail envoyé au modèle'],
  ['RV', 'RV-8', 'complet', LIB, [["const rapport: RapportRedaction = { rediges: [], rejets: [], degradations: [], ia: appel ? 'utilisee' : 'absente' }", "const trace = process.env.TRACE_REDACTEUR\n  const rapport: RapportRedaction = { rediges: [], rejets: [], degradations: [], ia: appel ? 'utilisee' : 'absente', ...(trace ? {} : {}) }"]], 'process.env lu'],
  ['RV', 'RV-9', 'complet', LIB, [['accueil.jsonld = [{', 'accueil.jsonld = undefined && [{']], 'plus de JSON-LD : site-qa rouge'],
  ['RV', 'RV-10', 'complet', LIB, [['type Bloc = { type: string; texte: string }', "export const erreurDeType: number = 'texte'\ntype Bloc = { type: string; texte: string }"]], 'une erreur de type'],
  ['RV', 'RV-3', 'temoin', 'lib/ai.ts', [['export function findFabrications(output: string, input: string): string[] {', 'export function findFabrications(output: string, input: string): string[] {\n  if (output) return []']], 'findFabrications désarmé (part NR)'],
  ['CH', 'CH-1', 'complet', LIV, [["usage('identifiant de commande absent ou invalide')", 'process.exit(0)']], 'sans argument, code 0'],
  ['CH', 'CH-2', 'complet', LIV, [["} else if (SANS_DEPOT) { code = 0; issue = 'pret' }", "} else if (false) { code = 0; issue = 'pret' }"]], '--sans-depot ignoré'],
  ['CH', 'CH-3', 'complet', LIV, [['  if (USINE) {\n    fs.rmSync(SORTIE, { recursive: true, force: true })', "  fs.cpSync(SITE, path.join(RACINE, 'public', 'sites-demo', 'livraison-essai'), { recursive: true })\n  if (USINE) {\n    fs.rmSync(SORTIE, { recursive: true, force: true })"]], 'le site copié sous public/'],
  ['CH', 'CH-4', 'complet', LIV, [['try { poser() } catch (e) {', 'try { fs.rmSync(VERROU, { force: true }); poser() } catch (e) {']], 'le verrou écrasé'],
  ['CH', 'CH-5', 'complet', LIV, [['if (regenerations >= 2 || consigne) {', 'if (consigne) {']], 'le plafond de régénérations ignoré'],
  ['CH', 'CH-6', 'complet', LIV, [['code = ex.status === 3 ? 3 : 1;', 'code = 1;']], 'le code 3 de l\'exporteur perdu'],
  ['CH', 'CH-7', 'complet', LIV, [['JSON.stringify({ commande: id, debut: debut.toISOString()', "JSON.stringify({ entreprise: opt('depuis') ? JSON.parse(fs.readFileSync(path.resolve(opt('depuis')), 'utf8')).artisan?.nom : null, commande: id, debut: debut.toISOString()"]], 'le nom de l\'entreprise dans le journal'],
  ['CH', 'CH-8', 'complet', LIV, [['if (rd.status !== 0) {', 'if (false && rd.status !== 0) {']], 'la chaîne continue après une rédaction en échec'],
  ['CH', 'CH-10', 'complet', LIV, [['{ cwd: RACINE, env: env ?? process.env })', '{ cwd: RACINE, env: env ?? process.env, shell: true })']], 'shell: true'],
  ['CH', 'CH-11', 'complet', LIV, [["fichiers.push({ nom: 'rapport-qa.json', type: 'application/json' })", '']], 'rapport-qa.json absent du manifeste'],
  ['CH', 'CH-12', 'complet', LIV, [["if (etat !== 'payee') {", "if (false && etat !== 'payee') {"]], 'l\'état n\'est plus relu avant le dépôt'],
  ['CH', 'CH-3', 'temoin', 'public/sites-demo/plombier/index.html', { ajout: '\n<!-- sabotage 026-029 : une démo gelée touchée -->\n' }, 'une démo gelée modifiée (part NR)'],
  ['GA', 'GA-1', 'complet', FLUX, [['  workflow_dispatch:\n', '  push:\n    branches: [main]\n  workflow_dispatch:\n']], 'un déclencheur push'],
  ['GA', 'GA-2', 'complet', FLUX, [['timeout-minutes: 20', 'timeout-minutes: 45']], 'timeout-minutes: 45'],
  ['GA', 'GA-3', 'complet', FLUX, [["        run: printf '%s\\n' \"$LIVRAISON_ENV\" | grep", "        run: |\n          echo \"$LIVRAISON_ENV\"\n          printf '%s\\n' \"$LIVRAISON_ENV\" | grep"]], 'le secret affiché par echo'],
  ['GA', 'GA-4', 'complet', FLUX, [['          if [[ ! "$COMMANDE" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then\n            echo "identifiant de commande refusé (UUID attendu)"\n            exit 1\n          fi\n', '']], 'la comparaison UUID retirée'],
  ['GA', 'GA-5', 'complet', DIST, [['if (tentatives >= 3) return', 'if (tentatives >= 30) return']], 'le plafond de trois tentatives ignoré'],
  ['GA', 'GA-6', 'complet', TOUR, [['if (process.env.GITHUB_DISPATCH_TOKEN && !(await enPause(base))) {', 'if (process.env.GITHUB_DISPATCH_TOKEN) {']], 'la pause ignorée'],
  ['GA', 'GA-10', 'complet', DIST, [["if (!prendre) return { demande: false, raison: 'l’usine a la commande en main' }", '']], 'l\'usine ignorée : deux livreurs'],
  ['GA', 'GA-7', 'complet', '.github/workflows/audit.yml', { ajout: '\n# sabotage 026-029 : un autre flux touché\n' }, 'audit.yml modifié'],
  ['GA', 'GA-8', 'complet', DIST, [['const BAIL_MS = 45 * 60_000', 'const BAIL_MS: string = 45 * 60_000']], 'une erreur de type'],
  ['GA', 'GA-7', 'temoin', '.github/workflows/audit.yml', { ajout: '\n# sabotage 026-029 : un autre flux touché\n' }, 'audit.yml modifié (part NR)'],
].filter((x) => P.includes(x[0]))

const lancerJuge = (juge, args) => {
  const t0 = Date.now()
  const r = spawnSync(process.execPath, ['--import', './scripts/ts-loader.mjs', `scripts/${juge}.mjs`, ...args], { cwd: MAQUETTE, encoding: 'utf8', maxBuffer: 256 << 20, timeout: 900_000, windowsHide: true, env: { ...process.env, NODE_OPTIONS: '' } })
  const sortie = `${r.stdout ?? ''}${r.stderr ?? ''}`
  return { code: r.status, sortie, lignes: sortie.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^(✅|❌) /.test(l)), duree: (Date.now() - t0) / 1000 }
}

const debut = new Date()
console.log(`— maquette`)
construireMaquette()
// Les juges et les jeux d'essai de la maquette sont ceux de l'arbre courant (copiés à la construction) : on le vérifie.
for (const f of [...Object.values(JUGES).map((j) => `scripts/${j}.mjs`), 'scripts/fixtures/026-livraison-tresor/c/commun-c.mjs']) if (sha(fs.readFileSync(path.join(R, f))) !== sha(fs.readFileSync(path.join(MAQUETTE, f)))) throw new Error(`${f} de la maquette diffère de l'arbre courant`)

const temoins = []
for (const p of P) {
  const complet = lancerJuge(JUGES[p], [])
  const rougesC = complet.lignes.filter((l) => l.startsWith('❌'))
  const tem = lancerJuge(JUGES[p], ['--temoin'])
  const rougesT = tem.lignes.filter((l) => l.startsWith('❌'))
  temoins.push({ p, juge: JUGES[p], complet: { code: complet.code, verts: complet.lignes.length - rougesC.length, rouges: rougesC, duree: complet.duree }, temoin: { code: tem.code, rouges: rougesT, lignes: tem.lignes } })
  console.log(`${p} : maquette, complet → code ${complet.code} (${complet.lignes.length - rougesC.length} verts, ${rougesC.length} rouges) en ${complet.duree.toFixed(0)} s ; --temoin → code ${tem.code}`)
  for (const l of rougesC) console.log(`   ${l.slice(0, 200)}`)
}

const mutations = []
for (const [p, critere, mode, fichier, subs, quoi] of SABOTAGES) {
  const f = path.join(MAQUETTE, fichier)
  const original = fs.readFileSync(f)
  let texte = original.toString('utf8')
  const m = { p, critere, mode, fichier, quoi, code: null, pris: false, restaure: false, ligne: null, erreur: null }
  try {
    if (Array.isArray(subs)) for (const [de, vers] of subs) {
      const n = texte.split(de).length - 1
      if (n !== 1) throw new Error(`« ${de.slice(0, 70)} » trouvé ${n} fois dans ${fichier}`)
      texte = texte.replace(de, () => vers)
    } else texte += subs.ajout
    fs.writeFileSync(f, texte)
    const r = lancerJuge(JUGES[p], mode === 'temoin' ? ['--temoin'] : [`--seulement=${critere}`])
    m.code = r.code
    m.ligne = r.lignes.find((l) => l.startsWith(`❌ ${critere} `) || l.startsWith(`❌ ${critere}(`) || l === `❌ ${critere}`) ?? null
    m.pris = r.code !== 0 && r.code !== null && !!m.ligne
    if (!m.pris) m.erreur = `code ${r.code}, lignes : ${r.lignes.join(' | ').slice(0, 300)}`
  } catch (e) { m.erreur = String(e?.message ?? e) } finally {
    fs.writeFileSync(f, original)
    m.restaure = sha(fs.readFileSync(f)) === sha(original)
    // Ce que la faute a pu laisser (un dossier sous public/ du banc ou de la maquette) est retiré avec elle.
    fs.rmSync(path.join(MAQUETTE, 'public', 'sites-demo', 'livraison-essai'), { recursive: true, force: true })
  }
  mutations.push(m)
  console.log(`${m.pris ? '✓' : '✗'} ${critere}${mode === 'temoin' ? ' (NR, --temoin)' : ''} — ${quoi} → code ${m.code}${m.ligne ? ` : ${m.ligne.slice(0, 150)}` : ''}${m.erreur ? ` [${m.erreur.slice(0, 200)}]` : ''}${m.restaure ? '' : ' — ORIGINAL NON RESTAURÉ'}`)
}

// Après les sabotages, les témoins sont toujours verts (rien n'a été laissé cassé).
const apres = P.map((p) => ({ p, ...lancerJuge(JUGES[p], []) }))
const fin = new Date()
const okTemoins = temoins.every((t) => t.complet.code === 0 && !t.complet.rouges.length && t.temoin.code === 0 && !t.temoin.rouges.length) && apres.every((a) => a.code === 0)
const couverts = new Set(mutations.filter((m) => m.pris && m.mode === 'complet').map((m) => m.critere))
const attendus = { EX: ['EX-1', 'EX-2', 'EX-3', 'EX-4', 'EX-5', 'EX-6', 'EX-7', 'EX-8', 'EX-9'], RV: ['RV-1', 'RV-2', 'RV-3', 'RV-4', 'RV-5', 'RV-6', 'RV-7', 'RV-8', 'RV-9', 'RV-10'], CH: ['CH-1', 'CH-2', 'CH-3', 'CH-4', 'CH-5', 'CH-6', 'CH-7', 'CH-8', 'CH-10', 'CH-11', 'CH-12'], GA: ['GA-1', 'GA-2', 'GA-3', 'GA-4', 'GA-5', 'GA-6', 'GA-7', 'GA-8', 'GA-10'] }
const manquants = P.flatMap((p) => attendus[p].filter((c) => !couverts.has(c)))
const ok = okTemoins && mutations.every((m) => m.pris && m.restaure) && !manquants.length

const rel = (p) => path.relative(R, p).split(path.sep).join('/')
const esc = (t) => ligne(t).replace(/\|/g, '\\|')
const md = [
  '# Les quatre juges du lot C savent être verts, et savent échouer',
  '',
  `Produit par \`node .orchestre/preuves/026-029/outils/sait-echouer.mjs\` du ${debut.toISOString()} au ${fin.toISOString()}. Maquette : \`${rel(MAQUETTE)}/\` — un dépôt git à part : l'arbre courant, les fiches amont en témoin committées (erreursFabrication de 026-030, lib/siteLivraison.ts de 026-024, un modèle de métier complet, 025-02/03/09/11, 026-024 et 026-030 déclarées PASS), puis les quatre fiches jugées en témoin dans l'arbre de travail (\`scripts/fixtures/026-livraison-tresor/c/temoin/\`). Chaque juge est lancé DEPUIS la maquette. Pour chaque ligne : une faute posée dans un fichier témoin, le juge relancé sur ce critère (\`--seulement=<id>\`, ou \`--temoin\` pour la part de non-régression), la ligne rouge relevée telle quelle, puis l'original remis et vérifié octet pour octet.`,
  '',
  '## Témoins (avant les sabotages)',
  '',
  ...temoins.map((t) => `- **${t.p}** (\`${t.juge}\`) : complet → code ${t.complet.code}, ${t.complet.verts} critère(s) vert(s)${t.complet.rouges.length ? `, ROUGES : ${t.complet.rouges.map(esc).join(' ; ')}` : ', aucun rouge'} (${t.complet.duree.toFixed(0)} s) ; --temoin → code ${t.temoin.code} (${t.temoin.lignes.map((l) => esc(l).slice(0, 90)).join(' ; ')})`),
  '',
  '## Sabotages',
  '',
  '| Juge | Critère | Mode | Fichier saboté | Faute | Code | Pris | Restauré | Ligne rouge (extrait réel) |',
  '|---|---|---|---|---|---|---|---|---|',
  ...mutations.map((m) => `| ${m.p} | ${m.critere} | ${m.mode === 'temoin' ? '--temoin (NR)' : '--seulement'} | ${m.fichier} | ${esc(m.quoi)} | ${m.code} | ${m.pris ? 'oui' : 'NON'} | ${m.restaure ? 'oui' : 'NON'} | ${m.ligne ? esc(m.ligne).slice(0, 400) : esc(m.erreur ?? '—')} |`),
  '',
  '## Après les sabotages',
  '',
  ...apres.map((a) => `- **${a.p}** : complet → code ${a.code} (${a.lignes.filter((l) => l.startsWith('✅')).length} verts, ${a.lignes.filter((l) => l.startsWith('❌')).length} rouges)`),
  '',
  `**Bilan : ${ok ? 'TENU' : 'NON TENU'}** — ${mutations.filter((m) => m.pris).length}/${mutations.length} sabotages pris, ${mutations.filter((m) => m.restaure).length}/${mutations.length} originaux restaurés, critères du mode complet couverts : ${[...couverts].sort().join(', ')}${manquants.length ? ` ; SANS sabotage pris : ${manquants.join(', ')}` : ''}. Les critères <P>-PV (preuve de 0 octet) sont prouvés par JL-4 de \`juges-026-lt-preuve.mjs --lot=C\` ; les critères --reel (EX-10, CH-9, GA-9) ne sont pas écrits et sortent en code 2.`,
  '',
]
const D = path.join(R, '.orchestre', 'preuves', '026-029')
fs.writeFileSync(path.join(D, 'sait-echouer-juges.md'), md.join('\n'))
fs.writeFileSync(path.join(D, 'sait-echouer-juges.json'), JSON.stringify({ debut, fin, maquette: rel(MAQUETTE), temoins, mutations, apres: apres.map((a) => ({ p: a.p, code: a.code, lignes: a.lignes })), ok, manquants }, null, 1))
console.log(`${ok ? '✓' : '✗'} ${mutations.filter((m) => m.pris).length}/${mutations.length} sabotages pris ; témoins ${okTemoins ? 'verts' : 'PAS VERTS'} ; ${rel(path.join(D, 'sait-echouer-juges.md'))}`)
process.exit(ok ? 0 : 1)
