// scripts/lib/preuves.mjs — une preuve doit avoir une substance. Le 13/09, un agent a livré quatre captures de 0 octet
// à un vérificateur qui ne testait que l'existence des fichiers : PASS, et rien à regarder. Ici, on regarde.
import fs from 'node:fs'

const SIGNATURE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Un vrai PNG : la signature en tête et au moins `minOctets` (une capture d'écran réelle pèse des dizaines de Ko). */
export function pngValide(fichier, minOctets = 10_000) {
  try {
    const st = fs.statSync(fichier)
    if (!st.isFile() || st.size < minOctets) return false
    const fd = fs.openSync(fichier, 'r')
    const tete = Buffer.alloc(8)
    fs.readSync(fd, tete, 0, 8, 0)
    fs.closeSync(fd)
    return tete.equals(SIGNATURE_PNG)
  } catch { return false }
}

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
