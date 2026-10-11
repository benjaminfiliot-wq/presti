// Lecture OOXML locale : aucune formule, macro ou référence externe exécutée.
import type { FichierCompta } from './comptaArtisan.ts'

const MAX_DECOMPRESSE = 30 * 1024 * 1024
const MAX_LIGNES = 20000
const MAX_COLONNES = 200
const xml = (texte: string) => {
  if (/<!DOCTYPE|<!ENTITY/i.test(texte)) throw new Error('XML avec entités refusé.')
  const document = new DOMParser().parseFromString(texte, 'application/xml')
  if (document.getElementsByTagName('parsererror').length) throw new Error('Classeur Excel illisible.')
  return document
}
const elements = (parent: Document | Element, nom: string) => Array.from(parent.getElementsByTagNameNS('*', nom))
const texte = (parent: Element, nom: string) => elements(parent, nom)[0]?.textContent ?? ''
const csv = (lignes: string[][]) => lignes.map((ligne) => ligne.map((valeur) => `"${valeur.replace(/"/g, '""')}"`).join(';')).join('\n')

/** ZIP central directory : tailles bornées AVANT toute décompression. */
async function ouvrirZip(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const vue = new DataView(buffer)
  const octets = new Uint8Array(buffer)
  let fin = -1
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (vue.getUint32(i, true) === 0x06054b50) { fin = i; break }
  }
  if (fin < 0 || vue.getUint16(fin + 4, true) || vue.getUint16(fin + 6, true)) throw new Error('Classeur Excel ZIP invalide.')
  const nombre = vue.getUint16(fin + 10, true)
  let position = vue.getUint32(fin + 16, true)
  if (nombre > 2000) throw new Error('Classeur trop complexe (2 000 composants maximum).')
  const fichiers = new Map<string, string>()
  let total = 0
  for (let i = 0; i < nombre; i++) {
    if (position + 46 > buffer.byteLength || vue.getUint32(position, true) !== 0x02014b50) throw new Error('Répertoire du classeur invalide.')
    const flags = vue.getUint16(position + 8, true)
    const methode = vue.getUint16(position + 10, true)
    const taille = vue.getUint32(position + 20, true)
    const attendu = vue.getUint32(position + 24, true)
    const longueur = vue.getUint16(position + 28, true)
    const nom = new TextDecoder().decode(octets.subarray(position + 46, position + 46 + longueur))
    const offset = vue.getUint32(position + 42, true)
    position += 46 + longueur + vue.getUint16(position + 30, true) + vue.getUint16(position + 32, true)
    total += attendu
    if (total > MAX_DECOMPRESSE || attendu > MAX_DECOMPRESSE) throw new Error('Classeur trop volumineux après décompression (30 Mo maximum).')
    if (flags & 1) throw new Error('Classeur chiffré : enregistrez une copie sans mot de passe.')
    if (/vbaProject\.bin$/i.test(nom)) throw new Error('Classeur contenant des macros refusé.')
    if (!/^xl\/.*\.xml$/.test(nom) && nom !== 'xl/_rels/workbook.xml.rels') continue
    if (offset + 30 > buffer.byteLength || vue.getUint32(offset, true) !== 0x04034b50) throw new Error('Composant Excel invalide.')
    const debut = offset + 30 + vue.getUint16(offset + 26, true) + vue.getUint16(offset + 28, true)
    if (debut + taille > buffer.byteLength) throw new Error('Classeur tronqué.')
    let sortie: Uint8Array<ArrayBufferLike>
    if (methode === 0) sortie = octets.subarray(debut, debut + taille)
    else if (methode === 8) {
      if (typeof DecompressionStream === 'undefined') throw new Error('Ce navigateur ne lit pas Excel. Utilisez un navigateur récent ou un export CSV.')
      const flux = new Blob([octets.slice(debut, debut + taille)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      const lecteur = flux.getReader()
      const morceaux: Uint8Array[] = []
      let longueurSortie = 0
      while (true) {
        const prochain = await lecteur.read()
        if (prochain.done) break
        longueurSortie += prochain.value.length
        if (longueurSortie > attendu || longueurSortie > MAX_DECOMPRESSE) { await lecteur.cancel(); throw new Error('Taille décompressée du classeur invalide.') }
        morceaux.push(prochain.value)
      }
      sortie = new Uint8Array(longueurSortie)
      let curseur = 0
      for (const morceau of morceaux) { sortie.set(morceau, curseur); curseur += morceau.length }
    } else throw new Error('Compression du classeur non prise en charge.')
    if (sortie.length !== attendu) throw new Error('Taille du composant Excel invalide.')
    fichiers.set(nom, new TextDecoder().decode(sortie))
  }
  return fichiers
}

export async function lireClasseur(buffer: ArrayBuffer, nom: string): Promise<FichierCompta[]> {
  if (buffer.byteLength > 5 * 1024 * 1024) throw new Error('5 Mo maximum par fichier.')
  const composants = await ouvrirZip(buffer)
  const contenu = composants.get('xl/workbook.xml')
  const liens = composants.get('xl/_rels/workbook.xml.rels')
  if (!contenu || !liens) throw new Error('Ce fichier n’est pas un classeur Excel .xlsx.')
  const classeur = xml(contenu)
  const relations = elements(xml(liens), 'Relationship')
  const chaines = composants.get('xl/sharedStrings.xml')
  const partagees = chaines ? elements(xml(chaines), 'si').map((si) => elements(si, 't').map((t) => t.textContent ?? '').join('')) : []
  const calendrier1904 = elements(classeur, 'workbookPr')[0]?.getAttribute('date1904') === '1'
  const sorties: FichierCompta[] = []
  for (const feuille of elements(classeur, 'sheet')) {
    const identifiant = feuille.getAttribute('r:id') ?? feuille.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
    const relation = relations.find((r) => r.getAttribute('Id') === identifiant)
    if (!relation || relation.getAttribute('TargetMode') === 'External') throw new Error('Feuille externe refusée.')
    const cible = relation.getAttribute('Target') ?? ''
    const chemin = cible.startsWith('/') ? cible.slice(1) : `xl/${cible.replace(/^\.\//, '')}`
    if (!/^xl\/worksheets\/[^/]+\.xml$/.test(chemin)) throw new Error('Chemin de feuille Excel non pris en charge.')
    const source = composants.get(chemin)
    if (!source) throw new Error('Feuille Excel absente.')
    const lignes: string[][] = []
    const erreurs: string[] = []
    const rows = elements(xml(source), 'row')
    if (rows.length > MAX_LIGNES) throw new Error('20 000 lignes maximum par feuille.')
    for (const row of rows) {
      const cellules: string[] = []
      for (const cellule of elements(row, 'c')) {
        const lettres = (cellule.getAttribute('r') ?? '').match(/^([A-Z]+)\d+$/)?.[1]
        if (!lettres) throw new Error('Adresse de cellule Excel invalide.')
        const colonne = Array.from(lettres).reduce((n, lettre) => n * 26 + lettre.charCodeAt(0) - 64, 0) - 1
        if (colonne >= MAX_COLONNES) throw new Error('200 colonnes maximum par feuille.')
        const type = cellule.getAttribute('t')
        let valeur = texte(cellule, 'v')
        if (elements(cellule, 'f').length && !elements(cellule, 'v').length) erreurs.push(`${cellule.getAttribute('r')} : formule sans résultat enregistré`)
        if (type === 'e') erreurs.push(`${cellule.getAttribute('r')} : erreur Excel ${valeur}`)
        if (type === 's') valeur = partagees[Number(valeur)] ?? ''
        if (type === 'inlineStr') valeur = elements(cellule, 't').map((t) => t.textContent ?? '').join('')
        cellules[colonne] = valeur
      }
      const remplie = Array.from({ length: cellules.length }, (_, i) => cellules[i] ?? '')
      if (remplie.some((v) => v.trim())) lignes.push(remplie)
    }
    if (!lignes.length) continue
    sorties.push({ nom: `${nom} · ${feuille.getAttribute('name') ?? 'Feuille'}`, texte: csv(lignes), sensParDefaut: 'recette', calendrier1904, erreursLecture: erreurs })
  }
  if (!sorties.length) throw new Error('Le classeur ne contient aucune feuille remplie.')
  return sorties
}
