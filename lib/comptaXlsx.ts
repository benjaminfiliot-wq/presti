// Écriture d'un vrai classeur Excel .xlsx, dans le navigateur, sans dépendance.
//
// Le classeur est un ZIP « stocké » (sans compression, méthode 0) : quelques dizaines de Ko pour des
// milliers de lignes, lisible par Excel, LibreOffice, Numbers et Google Sheets, et par notre propre
// lecteur (lib/comptaClasseur.ts) — un export peut donc être réimporté tel quel.
//
// Sûreté : tout texte est écrit en chaîne inline échappée (`t="inlineStr"`), jamais en formule. Un
// libellé « =HYPERLINK(…) » reste donc un texte inerte dans Excel. Les seules formules du classeur sont
// les SOMME des lignes de total, écrites par ce module avec leur résultat déjà calculé (`<v>`).
import type { Ligne } from './comptaImport.ts'
import { libelleSens, libelleStatut, moisFr, recapCategories, recapClients, recapMensuel } from './comptaTableur.ts'

/** Montants en centimes entiers ; dates « AAAA-MM-JJ ». */
export type Cellule =
  | { t: 'texte'; v: string; gras?: boolean }
  | { t: 'euros'; v: number; gras?: boolean }
  | { t: 'nombre'; v: number; gras?: boolean }
  | { t: 'date'; v: string }
  | { t: 'somme'; de: number; a: number; v: number; euros: boolean }
  | null
export type Feuille = { nom: string; largeurs: number[]; lignes: Cellule[][]; filtre?: boolean }

// Styles (index de cellXfs) : 0 normal · 1 en-tête · 2 date · 3 euros · 4 euros gras · 5 texte gras · 6 nombre gras
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top style="thin"><color auto="1"/></top><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

/** 0 → « A », 25 → « Z », 26 → « AA ». */
export function lettre(colonne: number): string {
  let s = ''
  for (let n = colonne + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

/** Caractères interdits en XML 1.0 retirés, puis échappement. */
const echapper = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** « 2026-03-15 » → numéro de série Excel (calendrier 1900). */
export function serieExcel(iso: string): number {
  const [a, m, j] = iso.split('-').map(Number)
  return Math.round((Date.UTC(a, m - 1, j) - Date.UTC(1899, 11, 30)) / 86400000)
}

const euros = (centimes: number) => String(centimes / 100)

function cellule(c: Cellule, ref: string, colonne: number): string {
  if (!c) return ''
  const lettreCol = lettre(colonne)
  switch (c.t) {
    case 'texte': return `<c r="${ref}" t="inlineStr"${c.gras ? ' s="5"' : ''}><is><t xml:space="preserve">${echapper(c.v)}</t></is></c>`
    case 'euros': return `<c r="${ref}" s="${c.gras ? 4 : 3}"><v>${euros(c.v)}</v></c>`
    case 'nombre': return `<c r="${ref}"${c.gras ? ' s="6"' : ''}><v>${c.v}</v></c>`
    case 'date': return `<c r="${ref}" s="2"><v>${serieExcel(c.v)}</v></c>`
    case 'somme': return `<c r="${ref}" s="${c.euros ? 4 : 6}"><f>SUM(${lettreCol}${c.de}:${lettreCol}${c.a})</f><v>${c.euros ? euros(c.v) : c.v}</v></c>`
  }
}

function feuilleXml(f: Feuille, enTete: boolean): string {
  const lignes = f.lignes.map((cellules, i) => {
    const n = i + 1
    const contenu = cellules.map((c, j) => {
      if (enTete && i === 0 && c?.t === 'texte') return `<c r="${lettre(j)}${n}" t="inlineStr" s="1"><is><t xml:space="preserve">${echapper(c.v)}</t></is></c>`
      return cellule(c, `${lettre(j)}${n}`, j)
    }).join('')
    return `<row r="${n}">${contenu}</row>`
  }).join('')
  const nbCol = Math.max(1, f.largeurs.length, ...f.lignes.map((l) => l.length))
  const derniere = Math.max(1, f.lignes.length)
  const vues = enTete ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : ''
  const cols = f.largeurs.length ? `<cols>${f.largeurs.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''
  const filtre = f.filtre && f.lignes.length > 1 ? `<autoFilter ref="A1:${lettre(nbCol - 1)}${derniere}"/>` : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${lettre(nbCol - 1)}${derniere}"/>${vues}${cols}<sheetData>${lignes}</sheetData>${filtre}</worksheet>`
}

// — ZIP stocké —

const TABLE_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(octets: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < octets.length; i++) c = TABLE_CRC[(c ^ octets[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function zipStocke(fichiers: { nom: string; contenu: string }[]): Uint8Array {
  const encodeur = new TextEncoder()
  const locaux: Uint8Array[] = []
  const centraux: Uint8Array[] = []
  let decalage = 0
  for (const f of fichiers) {
    const nom = encodeur.encode(f.nom)
    const data = encodeur.encode(f.contenu)
    const crc = crc32(data)
    const local = new Uint8Array(30 + nom.length + data.length)
    const vl = new DataView(local.buffer)
    vl.setUint32(0, 0x04034b50, true); vl.setUint16(4, 20, true); vl.setUint16(6, 0x0800, true); vl.setUint16(8, 0, true)
    vl.setUint16(10, 0, true); vl.setUint16(12, 0x21, true); vl.setUint32(14, crc, true)
    vl.setUint32(18, data.length, true); vl.setUint32(22, data.length, true); vl.setUint16(26, nom.length, true); vl.setUint16(28, 0, true)
    local.set(nom, 30); local.set(data, 30 + nom.length)
    const central = new Uint8Array(46 + nom.length)
    const vc = new DataView(central.buffer)
    vc.setUint32(0, 0x02014b50, true); vc.setUint16(4, 20, true); vc.setUint16(6, 20, true); vc.setUint16(8, 0x0800, true)
    vc.setUint16(10, 0, true); vc.setUint16(12, 0, true); vc.setUint16(14, 0x21, true); vc.setUint32(16, crc, true)
    vc.setUint32(20, data.length, true); vc.setUint32(24, data.length, true); vc.setUint16(28, nom.length, true)
    vc.setUint32(42, decalage, true)
    central.set(nom, 46)
    locaux.push(local); centraux.push(central)
    decalage += local.length
  }
  const tailleCentrale = centraux.reduce((n, c) => n + c.length, 0)
  const fin = new Uint8Array(22)
  const vf = new DataView(fin.buffer)
  vf.setUint32(0, 0x06054b50, true); vf.setUint16(8, fichiers.length, true); vf.setUint16(10, fichiers.length, true)
  vf.setUint32(12, tailleCentrale, true); vf.setUint32(16, decalage, true)
  const sortie = new Uint8Array(decalage + tailleCentrale + 22)
  let p = 0
  for (const b of [...locaux, ...centraux, fin]) { sortie.set(b, p); p += b.length }
  return sortie
}

/** Le classeur complet. La première ligne de chaque feuille est son en-tête (gras, figée). */
export function ecrireClasseur(feuilles: Feuille[]): Uint8Array {
  const n = feuilles.length
  const sheets = feuilles.map((f, i) => `<sheet name="${echapper(f.nom.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
  const rels = feuilles.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
  const types = feuilles.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
  const filtres = feuilles.map((f, i) => f.filtre && f.lignes.length > 1
    ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${echapper(f.nom.slice(0, 31)).replace(/'/g, "''")}'!$A$1:$${lettre(Math.max(1, f.largeurs.length, ...f.lignes.map((l) => l.length)) - 1)}$${f.lignes.length}</definedName>`
    : '').join('')
  return zipStocke([
    { nom: '[Content_Types].xml', contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${types}</Types>` },
    { nom: '_rels/.rels', contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nom: 'xl/workbook.xml', contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr date1904="0"/><sheets>${sheets}</sheets>${filtres ? `<definedNames>${filtres}</definedNames>` : ''}</workbook>` },
    { nom: 'xl/_rels/workbook.xml.rels', contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { nom: 'xl/styles.xml', contenu: STYLES },
    ...feuilles.map((f, i) => ({ nom: `xl/worksheets/sheet${i + 1}.xml`, contenu: feuilleXml(f, true) })),
  ])
}

const enTexte = (v: string, gras?: boolean): Cellule => ({ t: 'texte', v, gras })
const eur = (v: number, gras?: boolean): Cellule => ({ t: 'euros', v, gras })

/**
 * Les quatre feuilles de la comptabilité de l'artisan. « Journal » garde les noms de colonnes que
 * l'import reconnaît : réimporté seul, il redonne exactement les mêmes lignes (un statut « non renseigné »
 * est donc écrit vide : le mot « non » serait relu comme un impayé). Les feuilles de
 * synthèse portent leurs lignes TOTAL (formules SOMME) : à retirer si on réimporte le classeur.
 */
export function classeurCompta(lignes: readonly Ligne[]): Feuille[] {
  const journal = [...lignes].sort((a, b) => a.date.localeCompare(b.date) || a.ligne - b.ligne)
  const mois = recapMensuel(lignes)
  const categories = recapCategories(lignes)
  const clients = recapClients(lignes)
  const somme = (colonne: Cellule[][], de: number, v: number, enEuros = true): Cellule => ({ t: 'somme', de, a: de + colonne.length - 1, v, euros: enEuros })
  const corpsMois: Cellule[][] = mois.map((m) => [enTexte(moisFr(m.mois)), { t: 'nombre', v: m.nombre }, eur(m.recettes), eur(m.depenses), eur(m.benefice), eur(m.cumul), eur(m.impayes)])
  const corpsCat: Cellule[][] = categories.map((c) => [enTexte(c.categorie), { t: 'nombre', v: c.nombre }, eur(c.montant), c.part === null ? null : { t: 'nombre', v: c.part }])
  const corpsCli: Cellule[][] = clients.map((c) => [enTexte(c.tiers), { t: 'nombre', v: c.nombre }, eur(c.recettes), eur(c.impayes)])
  const total = <T>(xs: T[], f: (x: T) => number) => xs.reduce((n, x) => n + f(x), 0)
  return [
    {
      nom: 'Journal', filtre: true, largeurs: [12, 34, 28, 11, 20, 15, 14, 16],
      lignes: [
        ['Date', 'Libellé', 'Client ou fournisseur', 'Type', 'Catégorie', 'Statut', 'Montant', 'Source'].map((v) => enTexte(v)),
        ...journal.map((l): Cellule[] => [{ t: 'date', v: l.date }, enTexte(l.libelle), enTexte(l.tiers), enTexte(libelleSens(l.sens)), enTexte(l.categorie), enTexte(l.statut === 'non_renseigne' ? '' : libelleStatut(l.statut)), eur(l.montant), enTexte(l.source)]),
      ],
    },
    {
      nom: 'Par mois', largeurs: [18, 9, 14, 14, 14, 16, 14],
      lignes: [
        ['Mois', 'Lignes', 'Recettes', 'Dépenses', 'Bénéfice', 'Bénéfice cumulé', 'Dont impayés'].map((v) => enTexte(v)),
        ...corpsMois,
        ...(mois.length ? [[enTexte('TOTAL', true), somme(corpsMois, 2, total(mois, (m) => m.nombre), false), somme(corpsMois, 2, total(mois, (m) => m.recettes)), somme(corpsMois, 2, total(mois, (m) => m.depenses)), somme(corpsMois, 2, total(mois, (m) => m.benefice)), null, somme(corpsMois, 2, total(mois, (m) => m.impayes))]] : []),
      ],
    },
    {
      nom: 'Dépenses par catégorie', largeurs: [26, 9, 14, 10],
      lignes: [
        ['Catégorie', 'Lignes', 'Montant', 'Part (%)'].map((v) => enTexte(v)),
        ...corpsCat,
        ...(categories.length ? [[enTexte('TOTAL', true), somme(corpsCat, 2, total(categories, (c) => c.nombre), false), somme(corpsCat, 2, total(categories, (c) => c.montant)), null]] : []),
      ],
    },
    {
      nom: 'Clients', largeurs: [28, 9, 14, 14],
      lignes: [
        ['Client', 'Lignes', 'Recettes', 'Dont impayés'].map((v) => enTexte(v)),
        ...corpsCli,
        ...(clients.length ? [[enTexte('TOTAL', true), somme(corpsCli, 2, total(clients, (c) => c.nombre), false), somme(corpsCli, 2, total(clients, (c) => c.recettes)), somme(corpsCli, 2, total(clients, (c) => c.impayes))]] : []),
      ],
    },
  ]
}
