import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { zipSync, strToU8 } from 'fflate'
import { chromium } from 'playwright'

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sources = await Promise.all(['comptaImport', 'comptaArtisan', 'comptaClasseur'].map(async (nom) => {
  const source = await fs.readFile(path.join(racine, 'lib', `${nom}.ts`), 'utf8')
  return ts.transpileModule(source.replace(/^import .*$/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText.replace(/^export /gm, '')
}))
const entete = (ref, valeur) => `<c r="${ref}" t="inlineStr"><is><t>${valeur}</t></is></c>`
const classeur = ({ calendrier = false, sansCache = false, macro = false } = {}) => zipSync({
  '[Content_Types].xml': strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
  'xl/workbook.xml': strToU8(`<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr date1904="${calendrier ? 1 : 0}"/><sheets><sheet name="Ventes" r:id="r1"/><sheet name="Achats" r:id="r2"/></sheets></workbook>`),
  'xl/_rels/workbook.xml.rels': strToU8('<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/><Relationship Id="r2" Target="worksheets/sheet2.xml"/></Relationships>'),
  'xl/sharedStrings.xml': strToU8('<sst><si><t>Client A</t></si></sst>'),
  'xl/worksheets/sheet1.xml': strToU8(`<worksheet><sheetData><row r="1">${entete('A1', 'Date')}${entete('B1', 'Client')}${entete('C1', 'Montant')}${entete('D1', 'Statut')}</row><row r="2"><c r="A2"><v>${calendrier ? 44634 : 46096}</v></c><c r="B2" t="s"><v>0</v></c><c r="C2"><f>100+20.5</f>${sansCache ? '' : '<v>120.5</v>'}</c>${entete('D2', 'Impayé')}</row></sheetData></worksheet>`),
  'xl/worksheets/sheet2.xml': strToU8(`<worksheet><sheetData><row r="1">${entete('A1', 'Quand')}${entete('C1', 'Combien')}${entete('E1', 'Entreprise')}</row><row r="2">${entete('A2', '16/03/2026')}${entete('C2', '20,25 €')}${entete('E2', 'Fournisseur')}</row></sheetData></worksheet>`),
  ...(macro ? { 'xl/vbaProject.bin': new Uint8Array([1]) } : {}),
})
const navigateur = await chromium.launch({ headless: true })
try {
  const page = await navigateur.newPage()
  await page.goto('about:blank')
  await page.addScriptTag({ type: 'module', content: sources.join('\n') + '\nglobalThis.compta = { lireClasseur, rangerFichiers, calculerVue, exporterJournal, lireCsv };' })
  await page.waitForFunction(() => !!globalThis.compta)
  const resultat = await page.evaluate(async ({ octets, ancien, manque, macros }) => {
    const { lireClasseur, rangerFichiers, calculerVue, exporterJournal, lireCsv } = globalThis.compta
    const lire = (data) => lireClasseur(new Uint8Array(data).buffer, 'fictif.xlsx')
    const fichiers = await lire(octets)
    fichiers[1].colonnes = { 0: 'date', 2: 'montant', 4: 'tiers' }
    fichiers[1].sensParDefaut = 'depense'
    const csvDouble = { nom: 'double.csv', texte: 'Client;Montant;Date;Statut\nClient A;120,50;15/03/2026;Impayé', sensParDefaut: 'recette' }
    const rangement = rangerFichiers([...fichiers, csvDouble])
    const vue = calculerVue(rangement.lignes)
    const lignes1904 = rangerFichiers((await lire(ancien)).slice(0, 1)).lignes
    const formuleManquante = rangerFichiers((await lire(manque)).slice(0, 1)).rejets
    let macroRefusee = false
    try { await lire(macros) } catch { macroRefusee = true }
    let fauxRefuse = false
    try { await lireClasseur(new TextEncoder().encode('Date;Montant').buffer, 'faux.xlsx') } catch { fauxRefuse = true }
    const doublonMapping = rangerFichiers([{ ...fichiers[0], colonnes: { 0: 'date', 1: 'montant', 2: 'montant' } }]).rejets
    const exportLignes = lireCsv(exporterJournal(rangement.lignes))
    const injection = exporterJournal([{ ...rangement.lignes[0], tiers: '=HYPERLINK("https://fictif.invalid")', libelle: '-1+2', categorie: ' =1+2' }])
    return { nombreFeuilles: fichiers.length, rangement, vue, lignes1904, formuleManquante, macroRefusee, fauxRefuse, doublonMapping, exportLignes, injection }
  }, { octets: Array.from(classeur()), ancien: Array.from(classeur({ calendrier: true })), manque: Array.from(classeur({ sansCache: true })), macros: Array.from(classeur({ macro: true })) })
  assert.equal(resultat.nombreFeuilles, 2)
  assert.equal(resultat.rangement.rejets.length, 0)
  assert.equal(resultat.rangement.doublons, 1)
  assert.equal(resultat.rangement.lignes.length, 2)
  assert.equal(resultat.rangement.lignes[0].date, '2026-03-15')
  assert.equal(resultat.vue.tableaux.recettes, 12050)
  assert.equal(resultat.vue.tableaux.depenses, 2025)
  assert.equal(resultat.vue.tableaux.impayes.montant, 12050)
  assert.equal(resultat.lignes1904[0].date, '2026-03-15')
  assert.match(resultat.formuleManquante[0].raison, /formule sans résultat/)
  assert.ok(resultat.macroRefusee && resultat.fauxRefuse)
  assert.match(resultat.doublonMapping[0].raison, /plusieurs colonnes/)
  assert.equal(resultat.exportLignes.length, 3)
  assert.equal(resultat.exportLignes[1][3], '120,50')
  assert.match(resultat.injection, /'=HYPERLINK/)
  assert.match(resultat.injection, /'-1\+2/)
  assert.match(resultat.injection, /' =1\+2/)
  console.log('PASS Excel réel compressé, 2 feuilles, mapping hétérogène, dates 1900/1904, centimes, doublon CSV/Excel, impayés, formules cache, refus macro/faux xlsx, export journal protégé — 15 assertions Chromium isolé.')

  // Monte LE composant React réel dans un navigateur isolé, sans Next ni backend.
  const modules = {}
  for (const [nom, fichier] of Object.entries({ react: 'react/cjs/react.development.js', 'react-dom': 'react-dom/cjs/react-dom.development.js', scheduler: 'scheduler/cjs/scheduler.development.js', client: 'react-dom/cjs/react-dom-client.development.js' })) {
    modules[nom] = await fs.readFile(path.join(racine, 'node_modules', fichier), 'utf8')
  }
  await page.route('http://compta.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="root"></div>' }))
  await page.goto('http://compta.test/')
  await page.evaluate((codes) => {
    const cache = {}
    const require = (nom) => {
      if (!cache[nom]) {
        const module = { exports: {} }
        cache[nom] = module
        new Function('module', 'exports', 'require', 'process', codes[nom])(module, module.exports, require, { env: { NODE_ENV: 'development' } })
      }
      return cache[nom].exports
    }
    globalThis.React = require('react')
    globalThis.ReactClient = require('client')
  }, modules)
  const composant = ts.transpileModule((await fs.readFile(path.join(racine, 'app/chiffres/ComptaArtisan.tsx'), 'utf8')).replace(/^import .*$/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.React } }).outputText.replace(/^export default /gm, '')
  await page.addScriptTag({ type: 'module', content: 'const React=globalThis.React; const {useEffect,useMemo,useRef,useState}=React;\n' + sources.join('\n') + '\n' + composant + '\nglobalThis.rendusAvantEffet=[];function ObserverCompte({id}){React.useLayoutEffect(()=>{globalThis.rendusAvantEffet.push({id,recettes:document.querySelector("[data-compta-recettes]")?.textContent})},[id]);return React.createElement(ComptaArtisan,{artisanId:id})}globalThis.monter=(id)=>{globalThis.racineReact??=globalThis.ReactClient.createRoot(document.getElementById("root"));globalThis.racineReact.render(React.createElement(ObserverCompte,{id}))};globalThis.monter("fictif-a");' })
  await page.locator('[data-compta-fichier]').waitFor()
  const importer = () => page.locator('[data-compta-fichier]').setInputFiles([
    { name: 'test.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(classeur()) },
    { name: 'double.csv', mimeType: 'text/csv', buffer: Buffer.from('Client;Montant;Date;Statut\nClient A;120,50;15/03/2026;Impayé') },
  ])
  await importer()
  await page.getByRole('heading', { name: 'test.xlsx · Achats', exact: true }).waitFor()
  assert.equal(await page.locator('[data-compta-valider]').isDisabled(), true)
  await page.getByLabel('test.xlsx · Achats : Quand', { exact: true }).selectOption('date')
  await page.getByLabel('test.xlsx · Achats : Combien', { exact: true }).selectOption('montant')
  await page.getByLabel('test.xlsx · Achats : Entreprise', { exact: true }).selectOption('tiers')
  await page.locator('.ca-fichier').nth(1).locator('select').first().selectOption('depense')
  assert.equal(await page.evaluate(() => localStorage.length), 0, 'pas d’écriture avant accord')
  assert.equal(await page.locator('[data-compta-doublons]').textContent(), '1')
  await page.locator('[data-compta-valider]').click()
  await page.getByRole('status').filter({ hasText: 'Rangement validé' }).waitFor()
  assert.match(await page.locator('[data-compta-recettes]').textContent(), /120,50/)
  assert.match(await page.locator('[data-compta-depenses]').textContent(), /20,25/)
  const stockageA = await page.evaluate(() => localStorage.getItem('presti-compta-artisan:fictif-a'))
  assert.equal(JSON.parse(stockageA).length, 2)
  const telechargement = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter les lignes pour le comptable', exact: true }).click()
  const journal = await telechargement
  assert.equal(journal.suggestedFilename(), 'comptabilite-journal-detaille.csv')
  await page.evaluate(() => globalThis.monter('fictif-b'))
  await page.getByText('Aperçu avec données fictives', { exact: true }).waitFor()
  assert.equal(await page.locator('[data-compta-rangement]').count(), 0)
  await page.locator('[data-compta-fichier]').setInputFiles({ name: 'quota.csv', mimeType: 'text/csv', buffer: Buffer.from('Date;Montant\n15/03/2026;15,50') })
  await page.evaluate(() => { globalThis.setItemInitial = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('Quota', 'QuotaExceededError') } })
  await page.locator('[data-compta-valider]').click()
  await page.getByRole('status').filter({ hasText: 'Enregistrement impossible' }).waitFor()
  assert.equal(await page.evaluate(() => localStorage.getItem('presti-compta-artisan:fictif-b')), null)
  assert.equal(await page.evaluate(() => localStorage.getItem('presti-compta-artisan:fictif-a')), stockageA)
  await page.evaluate(() => { Storage.prototype.setItem = globalThis.setItemInitial; globalThis.monter('fictif-a') })
  await page.getByText('Vos chiffres importés', { exact: true }).waitFor()
  assert.match(await page.locator('[data-compta-recettes]').textContent(), /120,50/)
  assert.equal(await page.locator('[data-compta-rangement]').count(), 0, 'brouillon autre compte effacé')
  await page.evaluate(() => {
    localStorage.setItem('presti-compta-artisan:fictif-b', JSON.stringify([{ date: 'illisible', montant: 120, sens: 'invalide' }]))
    globalThis.monter('fictif-b')
  })
  await page.waitForTimeout(200)
  assert.equal(await page.getByText('Aperçu avec données fictives', { exact: true }).count(), 1, 'stockage invalide compteB ne conserve jamais chiffres compteA')
  assert.match(await page.getByRole('status').textContent(), /illisibles/)
  await page.evaluate(() => globalThis.monter('fictif-a'))
  await page.getByText('Vos chiffres importés', { exact: true }).waitFor()
  await page.evaluate(() => {
    globalThis.textOriginal = File.prototype.text
    File.prototype.text = function () {
      if (this.name === 'differe.csv') return new Promise((resolve) => { globalThis.terminerFichier = resolve })
      return globalThis.textOriginal.call(this)
    }
  })
  await page.locator('[data-compta-fichier]').setInputFiles({ name: 'differe.csv', mimeType: 'text/csv', buffer: Buffer.from('Date;Montant\n15/03/2026;999,99') })
  await page.waitForFunction(() => typeof globalThis.terminerFichier === 'function')
  await page.evaluate(() => globalThis.monter('fictif-c'))
  await page.getByText('Aperçu avec données fictives', { exact: true }).waitFor()
  await page.evaluate(() => { globalThis.terminerFichier('Date;Montant\n15/03/2026;999,99'); File.prototype.text = globalThis.textOriginal })
  await page.waitForTimeout(200)
  assert.equal(await page.locator('[data-compta-rangement]').count(), 0, 'import lancé par A abandonné lors du passage à C')
  assert.equal(await page.evaluate(() => localStorage.getItem('presti-compta-artisan:fictif-c')), null)
  assert.equal(await page.evaluate(() => globalThis.rendusAvantEffet.some((r) => (r.id === 'fictif-b' || r.id === 'fictif-c') && r.recettes?.includes('120,50'))), false, 'layout du nouveau compte ne montre jamais chiffres A avant useEffect')
  console.log('PASS isolation compte : stockage corrompu refusé, chiffres A invisibles dès layout B/C avant effet, lecture File différée A annulée sans rangement ni stockage dans C.')
  console.log('PASS UI React réelle isolée : import Excel+CSV, mapping bloquant/modifiable, dédup, aucun stockage avant validation, sommes, export téléchargement, compteA/B séparés, quota navigateur explicite et retourcompteA conservé. Aucunbackend.')
} finally { await navigateur.close() }
