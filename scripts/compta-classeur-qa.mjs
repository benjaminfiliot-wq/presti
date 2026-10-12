import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { zipSync, strToU8 } from 'fflate'
import { chromium } from 'playwright'

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sources = await Promise.all(['comptaImport', 'comptaArtisan', 'comptaClasseur', 'comptaTableur', 'comptaXlsx', 'comptaAssistant'].map(async (nom) => {
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

  // Le parcours dans l'interface (dépôt rangé seul, aperçu, validation d'un clic, question de colonne ambiguë, Arrêter,
  // isolation des comptes, chemin IA sans chiffre en clair, quota du navigateur) est jugé depuis la refonte du 12/10/2026
  // par scripts/compta-tableau-qa.mjs, partie C : le composant n'affiche plus de tableau de bord à lui, ni de données
  // d'exemple, il alimente celui de /chiffres. Ce script garde le moteur Excel / CSV.
} finally { await navigateur.close() }
