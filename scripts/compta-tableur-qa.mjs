// Juge du tableur de comptabilité (app/chiffres/Tableur.tsx, lib/comptaTableur.ts, lib/comptaXlsx.ts).
//
// Chromium isolé, sans Next ni API ni base : les vrais modules sont transpilés et le vrai composant
// React est monté sur une page vide. Données exclusivement fictives. Ce qui est prouvé :
//  1. les totaux, le récapitulatif mensuel (cumul), les catégories et les clients, au centime, contre des
//     valeurs écrites à la main ;
//  2. filtres, tri stable, modification sans mutation de l'entrée, saisie refusée si date ou montant illisible ;
//  3. le .xlsx écrit : ZIP valide (CRC comparé à zlib), chaque XML bien formé, formules SOMME avec le bon
//     résultat enregistré, aucun texte transformé en formule ; RÉIMPORTÉ par notre propre lecteur, la
//     feuille Journal redonne exactement les mêmes lignes ;
//  4. dans l'écran réel : tri, filtre, ligne de totaux, statut corrigé dans une cellule → impayés et
//     stockage mis à jour, ligne ajoutée, téléchargement du .xlsx ;
//  5. sabotages : chaque contrôle doit refuser une sortie faussée.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { unzipSync, zipSync, strFromU8 } from 'fflate'
import { chromium } from 'playwright'

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const transpiler = (source, jsx = false) => ts.transpileModule(source.replace(/^import .*$/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, ...(jsx ? { jsx: ts.JsxEmit.React } : {}) } }).outputText
const sources = await Promise.all(['comptaImport', 'comptaArtisan', 'comptaClasseur', 'comptaTableur', 'comptaXlsx'].map(async (nom) => transpiler(await fs.readFile(path.join(racine, 'lib', `${nom}.ts`), 'utf8')).replace(/^export /gm, '')))

// Jeu fictif : 6 lignes sur 3 mois. Valeurs attendues calculées à la main ci-dessous.
const CSV = [
  'Date;Libellé;Client;Montant;Type;Statut;Catégorie',
  '05/01/2026;Pose carrelage;Client Alpha;1 200,00;Vente;;',
  '12/01/2026;Colle et joints;Fournisseur Beta;180,40;Achat;Payé;Matériel',
  '03/02/2026;Salle de bain;Client Gamma;2 450,50;Vente;Impayé;',
  '20/02/2026;Gasoil;Station Delta;95,10;Achat;Payé;Carburant',
  '02/03/2026;Faïence;Client Alpha;640,00;Vente;Non payé;',
  '15/03/2026;"=HYPERLINK(""https://fictif.invalid"")";Fournisseur Beta;60,00;Achat;Payé;Matériel',
].join('\n')
// Recettes 1 200,00 + 2 450,50 + 640,00 = 4 290,50 € ; dépenses 180,40 + 95,10 + 60,00 = 335,50 €.
// Janvier : 120000 − 18040 = 101960 ; février : 245050 − 9510 = 235540 (cumul 337500) ; mars : 64000 − 6000 = 58000 (cumul 395500).
const ATTENDU = {
  totaux: { nombre: 6, recettes: 429050, depenses: 33550, solde: 395500 },
  mois: [
    { mois: '2026-01', nombre: 2, recettes: 120000, depenses: 18040, benefice: 101960, cumul: 101960, impayes: 0 },
    { mois: '2026-02', nombre: 2, recettes: 245050, depenses: 9510, benefice: 235540, cumul: 337500, impayes: 245050 },
    { mois: '2026-03', nombre: 2, recettes: 64000, depenses: 6000, benefice: 58000, cumul: 395500, impayes: 64000 },
  ],
  categories: [{ categorie: 'Matériel', nombre: 2, montant: 24040, part: 71.7 }, { categorie: 'Carburant', nombre: 1, montant: 9510, part: 28.3 }],
  clients: [{ tiers: 'Client Gamma', nombre: 1, recettes: 245050, impayes: 245050 }, { tiers: 'Client Alpha', nombre: 2, recettes: 184000, impayes: 64000 }],
}

// — Contrôles réutilisés par les sabotages : chacun lève une erreur sur une sortie fausse. —
function controlerCalculs(r) {
  assert.deepEqual(r.totaux, ATTENDU.totaux, 'totaux au centime')
  assert.deepEqual(r.mois, ATTENDU.mois, 'récapitulatif mensuel et cumul')
  assert.deepEqual(r.categories, ATTENDU.categories, 'dépenses par catégorie')
  assert.deepEqual(r.clients, ATTENDU.clients, 'recettes par client')
}
// L'export des totaux ne déduit aucun régime de TVA : ni « TVA collectée » chiffrée, ni franchise affirmée.
function controlerCsv(csv) {
  assert.match(csv, /^Recettes \(€\);4290,50$/m, 'recettes au centime dans l’export')
  assert.match(csv, /^TVA;Non calculée/m, 'TVA déclarée non calculée')
  assert.doesNotMatch(csv, /TVA collectée|293 B|franchise/i, 'aucun régime de TVA affirmé dans l’export')
}
function controlerClasseur(octets) {
  const parties = unzipSync(octets)
  // CRC : relu dans le répertoire central et comparé à zlib.
  const vue = Buffer.from(octets)
  const fin = vue.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  assert.ok(fin > 0, 'fin de répertoire ZIP')
  let p = vue.readUInt32LE(fin + 16)
  for (let i = 0; i < vue.readUInt16LE(fin + 10); i++) {
    const longueur = vue.readUInt16LE(p + 28)
    const nom = vue.subarray(p + 46, p + 46 + longueur).toString()
    assert.equal(vue.readUInt32LE(p + 16), zlib.crc32(parties[nom]), `CRC de ${nom}`)
    p += 46 + longueur
  }
  const xml = Object.fromEntries(Object.entries(parties).map(([n, b]) => [n, strFromU8(b)]))
  for (const nom of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml', 'xl/worksheets/sheet4.xml']) assert.ok(xml[nom], `partie ${nom}`)
  assert.ok(!/<f>/.test(xml['xl/worksheets/sheet1.xml']), 'aucune formule dans le Journal')
  assert.ok(xml['xl/worksheets/sheet1.xml'].includes('=HYPERLINK(&quot;https://fictif.invalid&quot;)'), 'texte dangereux conservé en chaîne inerte')
  const sommes = [...xml['xl/worksheets/sheet2.xml'].matchAll(/<c r="([A-Z]+)(\d+)"[^>]*><f>SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)<\/f><v>([^<]+)<\/v><\/c>/g)]
  assert.deepEqual(sommes.map((m) => [m[1], m[7]]), [['B', '6'], ['C', '4290.5'], ['D', '335.5'], ['E', '3955'], ['G', '3090.5']], 'SOMME de la feuille Par mois et leur résultat')
  assert.ok(sommes.every((m) => m[3] === m[1] && m[4] === '2' && m[6] === '4'), 'plages SOMME B2:B4…')
  return xml
}

const navigateur = await chromium.launch({ headless: true })
try {
  const page = await navigateur.newPage()
  await page.route('http://compta.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="root"></div>' }))
  await page.goto('http://compta.test/')
  await page.addScriptTag({ type: 'module', content: sources.join('\n') + '\nglobalThis.compta = { rangerFichiers, totaux, recapMensuel, recapCategories, recapClients, filtrer, trier, modifier, ajouter, lignesStockeesValides, classeurCompta, ecrireClasseur, lireClasseur, tableauxDeBord, exporterCsv };' })
  await page.waitForFunction(() => !!globalThis.compta)

  const r = await page.evaluate(async (csv) => {
    const c = globalThis.compta
    const lignes = c.rangerFichiers([{ nom: 'fictif.csv', texte: csv, sensParDefaut: 'recette' }]).lignes
    const copie = JSON.stringify(lignes)
    const modifiees = c.modifier(lignes, 0, { champ: 'statut', valeur: 'impaye' })
    const filtreTexte = c.filtrer(lignes, { texte: 'faience' }).map((l) => l.libelle)
    const filtreMois = c.filtrer(lignes, { mois: '2026-02', sens: 'depense' }).map((l) => l.tiers)
    const triMontant = c.trier(lignes, { colonne: 'recette', ordre: 'desc' }).slice(0, 3).map((l) => l.tiers)
    const triTiers = c.trier(lignes, { colonne: 'tiers', ordre: 'asc' }).map((l) => l.libelle)
    const refusDate = c.ajouter(lignes, { date: '31/02/2026', libelle: '', tiers: 'X', sens: 'depense', montant: '10', categorie: '', statut: 'paye' }).erreur
    const refusMontant = c.ajouter(lignes, { date: '01/04/2026', libelle: '', tiers: 'X', sens: 'depense', montant: '-10', categorie: '', statut: 'paye' }).erreur
    const ajout = c.ajouter(lignes, { date: '01/04/2026', libelle: 'Péage', tiers: 'Autoroute Epsilon', sens: 'depense', montant: '12,30', categorie: '', statut: 'paye' })
    const octets = c.ecrireClasseur(c.classeurCompta(lignes))
    const feuilles = await c.lireClasseur(octets.buffer, 'export.xlsx')
    const relu = c.rangerFichiers([feuilles[0]])
    return {
      lignes, intacte: JSON.stringify(lignes) === copie, modifiee: modifiees[0].statut, autres: modifiees.slice(1).every((l, i) => l === lignes[i + 1]),
      totaux: c.totaux(lignes), mois: c.recapMensuel(lignes), categories: c.recapCategories(lignes), clients: c.recapClients(lignes),
      filtreTexte, filtreMois, triMontant, triTiers, refusDate, refusMontant, ajout: ajout.lignes.at(-1), ajoutValide: c.lignesStockeesValides(ajout.lignes),
      octets: Array.from(octets), nomsFeuilles: feuilles.map((f) => f.nom), relu, csvTotaux: c.exporterCsv(c.tableauxDeBord(lignes)),
    }
  }, CSV)

  assert.equal(r.lignes.length, 6)
  controlerCalculs(r)
  assert.ok(r.intacte && r.modifiee === 'impaye' && r.autres, 'modification sans mutation, seule la ligne visée change')
  assert.deepEqual(r.filtreTexte, ['Faïence'], 'recherche sans accents')
  assert.deepEqual(r.filtreMois, ['Station Delta'], 'filtre mois + type')
  assert.deepEqual(r.triMontant, ['Client Gamma', 'Client Alpha', 'Client Alpha'], 'tri par recette décroissante')
  assert.deepEqual(r.triTiers.slice(0, 2), ['Pose carrelage', 'Faïence'], 'tri stable à égalité')
  assert.match(r.refusDate, /Date illisible/)
  assert.match(r.refusMontant, /Montant illisible/)
  assert.deepEqual({ ...r.ajout }, { ligne: 8, date: '2026-04-01', libelle: 'Péage', tiers: 'Autoroute Epsilon', sens: 'depense', montant: 1230, categorie: 'Sans catégorie', statut: 'paye', source: 'Saisie' })
  assert.ok(r.ajoutValide, 'une ligne saisie passe le contrôle du stockage')
  controlerClasseur(Uint8Array.from(r.octets))
  assert.deepEqual(r.nomsFeuilles, ['export.xlsx · Journal', 'export.xlsx · Par mois', 'export.xlsx · Dépenses par catégorie', 'export.xlsx · Clients'])
  assert.equal(r.relu.rejets.length, 0, 'Journal réimporté sans rejet')
  const sansNumero = (ls) => ls.map(({ ligne, source, ...reste }) => reste).sort((a, b) => a.date.localeCompare(b.date))
  assert.deepEqual(sansNumero(r.relu.lignes), sansNumero(r.lignes), 'aller-retour Excel : mêmes lignes au centime')
  controlerCsv(r.csvTotaux)
  console.log('PASS calculs au centime (totaux, mois + cumul, catégories, clients), filtres, tri stable, modification pure, saisie contrôlée, .xlsx valide (CRC zlib, SOMME + résultats, texte inerte) et réimporté à l’identique.')

  // — Sabotages : chaque contrôle doit refuser une sortie faussée. —
  const sabotages = [
    ['un total décalé d’un centime', () => controlerCalculs({ ...r, totaux: { ...r.totaux, recettes: r.totaux.recettes + 1 } })],
    ['un cumul mensuel faux', () => controlerCalculs({ ...r, mois: r.mois.map((m, i) => i === 2 ? { ...m, cumul: m.benefice } : m) })],
    ['un impayé oublié', () => controlerCalculs({ ...r, clients: r.clients.map((c) => ({ ...c, impayes: 0 })) })],
    ['un résultat de SOMME faux', () => { const z = unzipSync(Uint8Array.from(r.octets)); const s = strFromU8(z['xl/worksheets/sheet2.xml']).replace('<v>4290.5</v>', '<v>4290.6</v>'); controlerClasseur(rezipper({ ...z, 'xl/worksheets/sheet2.xml': new TextEncoder().encode(s) })) }],
    ['un texte devenu formule', () => { const z = unzipSync(Uint8Array.from(r.octets)); const s = strFromU8(z['xl/worksheets/sheet1.xml']).replace('<is><t xml:space="preserve">=HYPERLINK', '<f>HYPERLINK</f><is><t xml:space="preserve">=HYPERLINK'); controlerClasseur(rezipper({ ...z, 'xl/worksheets/sheet1.xml': new TextEncoder().encode(s) })) }],
    ['une TVA collectée chiffrée à 0', () => controlerCsv(r.csvTotaux.replace(/^TVA;.*$/m, 'TVA collectée (€);0,00'))],
    ['une franchise affirmée', () => controlerCsv(r.csvTotaux.replace(/^TVA;(.*)$/m, 'TVA;Non calculée (franchise en base, art. 293 B)'))],
    ['un CRC corrompu', () => { const o = Uint8Array.from(r.octets); const v = Buffer.from(o.buffer); const fin = v.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); const p = v.readUInt32LE(fin + 16); v.writeUInt32LE((v.readUInt32LE(p + 16) ^ 1) >>> 0, p + 16); controlerClasseur(o) }],
  ]
  for (const [nom, essai] of sabotages) assert.throws(essai, undefined, `sabotage non détecté : ${nom}`)
  console.log(`PASS ${sabotages.length} sabotages refusés.`)

  // — L'écran réel : ComptaArtisan + Tableur montés avec React, sans Next. —
  const modules = {}
  for (const [nom, fichier] of Object.entries({ react: 'react/cjs/react.development.js', 'react-dom': 'react-dom/cjs/react-dom.development.js', scheduler: 'scheduler/cjs/scheduler.development.js', client: 'react-dom/cjs/react-dom-client.development.js' })) {
    modules[nom] = await fs.readFile(path.join(racine, 'node_modules', fichier), 'utf8')
  }
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
  const composants = [transpiler(await fs.readFile(path.join(racine, 'app/chiffres/Tableur.tsx'), 'utf8'), true), transpiler(await fs.readFile(path.join(racine, 'app/chiffres/ComptaArtisan.tsx'), 'utf8'), true)].map((c) => c.replace(/^export default /gm, ''))
  await page.addScriptTag({ type: 'module', content: 'const React=globalThis.React; const {useEffect,useMemo,useRef,useState}=React;\n' + sources.join('\n') + '\n' + composants.join('\n') + '\nglobalThis.ReactClient.createRoot(document.getElementById("root")).render(React.createElement(ComptaArtisan,{artisanId:"fictif-tableur"}));' })
  await page.locator('[data-compta-tableur]').waitFor()
  assert.equal(await page.locator('[data-compta-tableur] [data-compta-statut]').count(), 0, 'exemple en lecture seule')
  await page.locator('[data-compta-fichier]').setInputFiles({ name: 'fictif.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) })
  await page.locator('[data-compta-valider]').click()
  await page.getByText('Vos chiffres importés', { exact: true }).waitFor()
  const lignesJournal = page.locator('[data-compta-journal] [data-compta-ligne]')
  assert.equal(await lignesJournal.count(), 6)
  assert.match(await page.locator('[data-compta-total-recettes]').textContent(), /4\s290,50/)
  assert.match(await page.locator('[data-compta-total-depenses]').textContent(), /335,50/)
  assert.match(await page.locator('[data-compta-total-solde]').textContent(), /3\s955,00/)
  // Tri par date croissante : la première ligne est celle du 05/01.
  await page.locator('[data-compta-trier="date"]').click()
  assert.equal(await lignesJournal.first().locator('td').first().textContent(), '05/01/2026')
  // Filtre : dépenses seulement → 3 lignes, total recettes à 0.
  await page.locator('[data-compta-filtre-type]').selectOption('depense')
  assert.equal(await lignesJournal.count(), 3)
  assert.match(await page.locator('[data-compta-total-recettes]').textContent(), /^0,00/)
  await page.getByRole('button', { name: 'Effacer les filtres', exact: true }).click()
  // Statut corrigé dans la cellule : Client Gamma payé → impayés 640,00 € et stockage à jour.
  assert.match(await page.locator('[data-compta-impayes]').textContent(), /3\s090,50/)
  await page.locator('[data-compta-chercher]').fill('gamma')
  await lignesJournal.first().locator('[data-compta-statut]').selectOption('paye')
  assert.match(await page.locator('[data-compta-impayes]').textContent(), /640,00/)
  const stock = JSON.parse(await page.evaluate(() => localStorage.getItem('presti-compta-artisan:fictif-tableur')))
  assert.equal(stock.find((l) => l.tiers === 'Client Gamma').statut, 'paye')
  await page.locator('[data-compta-chercher]').fill('')
  // Ajout d'une ligne : refusée puis acceptée.
  await page.locator('[data-compta-ajouter]').click()
  const saisie = page.locator('[data-compta-saisie]')
  await saisie.getByLabel('Date').fill('31/02/2026')
  await saisie.getByLabel('Fournisseur').fill('Autoroute Epsilon')
  await saisie.getByLabel('Montant (€)').fill('12,30')
  await page.locator('[data-compta-saisie-ok]').click()
  await saisie.getByRole('alert').filter({ hasText: 'Date illisible' }).waitFor()
  await saisie.getByLabel('Date').fill('01/04/2026')
  await page.locator('[data-compta-saisie-ok]').click()
  await page.locator('[data-compta-saisie]').waitFor({ state: 'detached' })
  assert.equal(await lignesJournal.count(), 7)
  assert.match(await page.locator('[data-compta-depenses]').textContent(), /347,80/)
  // Feuille Par mois : avril apparaît, avec son cumul.
  await page.locator('[data-compta-onglet="mois"]').click()
  assert.equal(await page.locator('[data-compta-feuille-mois] tbody tr').count(), 4)
  assert.match(await page.locator('[data-compta-feuille-mois] tbody tr').nth(3).textContent(), /avril 2026.*3\s942,70/)
  // Téléchargement du classeur : il contient la ligne ajoutée et le statut corrigé.
  const attente = page.waitForEvent('download')
  await page.locator('[data-compta-xlsx]').click()
  const fichier = await attente
  assert.match(fichier.suggestedFilename(), /^comptabilite-\d{4}-\d{2}-\d{2}\.xlsx$/)
  const journal = strFromU8(unzipSync(new Uint8Array(await fs.readFile(await fichier.path())))['xl/worksheets/sheet1.xml'])
  assert.ok(journal.includes('Autoroute Epsilon') && (journal.match(/<row /g) ?? []).length === 8, 'classeur téléchargé à jour (en-tête + 7 lignes)')
  console.log('PASS écran réel : exemple en lecture seule, totaux du journal, tri, filtre, statut corrigé en cellule (impayés et stockage suivent), saisie refusée puis acceptée, feuille Par mois, .xlsx téléchargé à jour.')
} finally {
  await navigateur.close()
}

function rezipper(parties) {
  // fflate recalcule des CRC justes : seul le contenu saboté peut alors faire rougir le contrôle.
  return zipSync(parties, { level: 0 })
}
