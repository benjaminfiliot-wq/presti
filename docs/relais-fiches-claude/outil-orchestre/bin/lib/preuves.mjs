// scripts/lib/preuves.mjs — une preuve doit avoir une substance. Le 13/09, un agent a livré quatre captures de 0 octet
// à un vérificateur qui ne testait que l'existence des fichiers : PASS, et rien à regarder. Le même jour, un autre a
// livré un « PNG » de 15 000 octets — la signature, puis des zéros — et un troisième un motif de bruit copié quatre
// fois. Ici, on regarde : la signature, l'en-tête IHDR (des dimensions d'écran), la fin IEND (un fichier entier), et
// l'empreinte (deux écrans ne peuvent pas être le même fichier). Ce que ça ne voit pas — une image quelconque à la
// bonne taille — seul un juge qui capture lui-même le voit : scripts/lib/capture.mjs.
import fs from 'node:fs'
import crypto from 'node:crypto'

const SIGNATURE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const FIN_PNG = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]) // le chunk IEND, toujours les 8 derniers octets

/** Largeur et hauteur d'un PNG (IHDR), ou null si ce n'en est pas un. */
export function dimensionsPng(fichier) {
  try {
    const st = fs.statSync(fichier)
    if (!st.isFile() || st.size < 33) return null
    const fd = fs.openSync(fichier, 'r')
    const tete = Buffer.alloc(24)
    fs.readSync(fd, tete, 0, 24, 0)
    fs.closeSync(fd)
    if (!tete.subarray(0, 8).equals(SIGNATURE_PNG) || tete.toString('ascii', 12, 16) !== 'IHDR') return null
    return { largeur: tete.readUInt32BE(16), hauteur: tete.readUInt32BE(20) }
  } catch { return null }
}

/** Un vrai PNG entier : signature, IHDR avec des dimensions d'écran (≥ 200 px), IEND en queue, et au moins `minOctets`. */
export function pngValide(fichier, minOctets = 10_000) {
  try {
    const st = fs.statSync(fichier)
    if (!st.isFile() || st.size < minOctets) return false
    const dim = dimensionsPng(fichier)
    if (!dim || dim.largeur < 200 || dim.hauteur < 200) return false
    const fd = fs.openSync(fichier, 'r')
    const fin = Buffer.alloc(8)
    fs.readSync(fd, fin, 0, 8, st.size - 8)
    fs.closeSync(fd)
    return fin.equals(FIN_PNG)
  } catch { return false }
}

/** L'empreinte d'un fichier (md5) — deux « écrans » à la même empreinte sont un seul fichier. */
export const empreinte = (fichier) => { try { return crypto.createHash('md5').update(fs.readFileSync(fichier)).digest('hex') } catch { return null } }

/** Vrai si tous les fichiers existent et diffèrent deux à deux. */
export const fichiersDistincts = (fichiers) => { const e = fichiers.map(empreinte); return e.every(Boolean) && new Set(e).size === e.length }

/** Les fichiers vides d'un dossier de preuves (récursif) : chacun est un mensonge, pas une preuve. */
export function fichiersVides(dossier) {
  const vides = []
  const rec = (d) => {
    if (!fs.existsSync(d)) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`
      if (e.isDirectory()) rec(p)
      else if (fs.statSync(p).size === 0) vides.push(p)
    }
  }
  rec(dossier)
  return vides
}
